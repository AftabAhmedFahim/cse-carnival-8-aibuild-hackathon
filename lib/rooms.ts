// Room availability search — the query behind "I need a room for 5 people with
// a projector, tomorrow between 2 and 4".
//
// Kept out of the route handlers on purpose: the agent's find_free_rooms tool
// calls this function directly rather than going back out over HTTP.

import { prisma, parseEquipment, hasAllEquipment } from "@/lib/db";

export interface FindFreeRoomsInput {
  /** 24h "HH:MM", or a full ISO datetime whose date part is used when `date` is omitted. */
  startTime?: string;
  /** 24h "HH:MM", or a full ISO datetime. */
  endTime?: string;
  /** Only rooms that seat at least this many people. */
  minCapacity?: number;
  /** Every item must be present on the room. Matched case-insensitively. */
  equipment?: string[];
  /**
   * ISO date "YYYY-MM-DD". Bookings are per-day, so without a date a room is
   * treated as busy if it has a clashing booking on ANY day -- deliberately
   * conservative. Always pass a date when you know it.
   */
  date?: string;
  /** Include rooms marked status = "unavailable". Defaults to false. */
  includeUnavailable?: boolean;
}

export interface FreeRoom {
  id: string;
  roomNumber: string;
  type: string;
  capacity: number;
  equipment: string[];
  floor: number;
  status: string;
  /** Bookings considered when deciding this room was free. */
  bookings: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    bookedBy: string;
    purpose: string | null;
  }[];
}

const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** "9:00" -> "09:00"; "2026-09-07T14:00" -> "14:00". Null when unparseable. */
export function toTime(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  const iso = trimmed.match(/^\d{4}-\d{2}-\d{2}[T ](\d{1,2}:\d{2})/);
  const candidate = iso ? iso[1] : trimmed;
  const match = candidate.match(TIME_PATTERN);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : null;
}

/** "2026-09-07T14:00" -> "2026-09-07". Null when unparseable. */
export function toDate(value: string | undefined | null): string | null {
  if (!value) return null;
  const datePart = String(value).trim().split(/[T ]/)[0];
  return DATE_PATTERN.test(datePart) ? datePart : null;
}

/**
 * Do two [start, end) windows on the same day overlap?
 *
 * Touching windows do not clash: a booking ending at 15:00 leaves the room free
 * for one starting at 15:00. Comparing zero-padded "HH:MM" strings with < and >
 * is correct because they sort lexicographically in time order.
 */
export function overlaps(
  existingStart: string,
  existingEnd: string,
  requestedStart: string,
  requestedEnd: string,
): boolean {
  return existingStart < requestedEnd && existingEnd > requestedStart;
}

/**
 * Rooms that are free in the given window, big enough, and carry every piece of
 * requested equipment. Every filter is optional; with no arguments it returns
 * every available room.
 */
export async function findFreeRooms(
  input: FindFreeRoomsInput = {},
): Promise<FreeRoom[]> {
  const startTime = toTime(input.startTime);
  const endTime = toTime(input.endTime);

  // A date given explicitly wins; otherwise try to recover one from an ISO
  // datetime passed as startTime.
  const date = toDate(input.date) ?? toDate(input.startTime);

  const equipment = (input.equipment ?? []).map((item) => item.trim()).filter(Boolean);

  const rooms = await prisma.room.findMany({
    where: {
      ...(input.minCapacity !== undefined
        ? { capacity: { gte: input.minCapacity } }
        : {}),
      ...(input.includeUnavailable ? {} : { status: { not: "unavailable" } }),
    },
    include: { bookings: true },
    orderBy: [{ capacity: "asc" }, { roomNumber: "asc" }],
  });

  const free = rooms.filter((room) => {
    if (!hasAllEquipment(room.equipment, equipment)) return false;

    // With no window there is nothing to clash against.
    if (!startTime || !endTime) return true;

    const clashing = room.bookings.filter((booking) => {
      if (date && booking.date !== date) return false;
      return overlaps(booking.startTime, booking.endTime, startTime, endTime);
    });

    return clashing.length === 0;
  });

  return free.map((room) => ({
    id: room.id,
    roomNumber: room.roomNumber,
    type: room.type,
    capacity: room.capacity,
    equipment: parseEquipment(room.equipment),
    floor: room.floor,
    status: room.status,
    bookings: room.bookings
      .filter((booking) => !date || booking.date === date)
      .map((booking) => ({
        id: booking.id,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        bookedBy: booking.bookedBy,
        purpose: booking.purpose,
      })),
  }));
}

/**
 * Bookings on a room that clash with a window. Empty means the room is free.
 * Used by the booking endpoint to build its 409 response.
 *
 * Pass the transaction client as `client` when calling this inside
 * prisma.$transaction. Using the global client there would issue the query on a
 * second connection, which deadlocks against the transaction's own SQLite lock
 * until the transaction times out.
 */
export async function findConflictingBookings(
  roomId: string,
  date: string,
  startTime: string,
  endTime: string,
  client: Pick<typeof prisma, "booking"> = prisma,
) {
  const sameDay = await client.booking.findMany({
    where: { roomId, date },
    orderBy: { startTime: "asc" },
  });

  return sameDay.filter((booking) =>
    overlaps(booking.startTime, booking.endTime, startTime, endTime),
  );
}

/**
 * Look a room up by primary key, falling back to its room number, so both
 * /api/rooms/room-002/book and /api/rooms/7A02/book work. The agent tends to
 * have the number ("Book Room 7A02") rather than the id.
 */
export async function resolveRoom(idOrNumber: string) {
  const byId = await prisma.room.findUnique({ where: { id: idOrNumber } });
  if (byId) return byId;

  return prisma.room.findUnique({ where: { roomNumber: idOrNumber } });
}
