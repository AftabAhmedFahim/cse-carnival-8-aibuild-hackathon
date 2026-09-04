// POST /api/rooms/[id]/book — book a room, rejecting overlaps with 409.
//
// Body: { date, startTime, endTime, bookedBy, purpose? }
// [id] accepts either a room id ("room-002") or a room number ("7A02").
//
// `date` is required. The workplan sketch listed only startTime/endTime/bookedBy,
// but a booking with no day cannot be conflict-checked, so it is enforced here.
// Passing an ISO datetime as startTime (e.g. "2026-09-05T15:00") supplies it too.

import { prisma } from "@/lib/db";
import { findConflictingBookings, resolveRoom, toDate, toTime } from "@/lib/rooms";

import { badRequest, conflict, created, guard, notFound } from "../../../_lib/http";
import { readJsonBody } from "../../../_lib/http";

export const dynamic = "force-dynamic";

interface Context {
  params: { id: string };
}

export async function POST(request: Request, { params }: Context) {
  return guard(async () => {
    const room = await resolveRoom(params.id);
    if (!room) {
      return notFound(
        `No room found with id or room number '${params.id}'.`,
      );
    }

    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body;

    // --- bookedBy --------------------------------------------------------
    if (typeof body.bookedBy !== "string" || body.bookedBy.trim() === "") {
      return badRequest("Field 'bookedBy' is required and must be a non-empty string.");
    }
    const bookedBy = body.bookedBy.trim();

    // --- times -----------------------------------------------------------
    if (typeof body.startTime !== "string" || typeof body.endTime !== "string") {
      return badRequest("Fields 'startTime' and 'endTime' are required.");
    }

    const startTime = toTime(body.startTime);
    const endTime = toTime(body.endTime);

    if (!startTime) {
      return badRequest(
        `Field 'startTime' must be a 24-hour time like "15:00", received ${JSON.stringify(body.startTime)}.`,
      );
    }
    if (!endTime) {
      return badRequest(
        `Field 'endTime' must be a 24-hour time like "17:00", received ${JSON.stringify(body.endTime)}.`,
      );
    }
    if (startTime >= endTime) {
      return badRequest(
        `'startTime' (${startTime}) must be earlier than 'endTime' (${endTime}).`,
      );
    }

    // --- date ------------------------------------------------------------
    // Explicit `date` wins; otherwise recover it from an ISO startTime.
    const date =
      (typeof body.date === "string" ? toDate(body.date) : null) ??
      toDate(body.startTime);

    if (!date) {
      return badRequest(
        "Field 'date' is required and must look like \"2026-09-05\". " +
          "A booking without a date cannot be checked for conflicts.",
      );
    }

    // --- purpose (optional) ----------------------------------------------
    let purpose: string | null = null;
    if (body.purpose !== undefined && body.purpose !== null) {
      if (typeof body.purpose !== "string") {
        return badRequest("Field 'purpose' must be a string when provided.");
      }
      purpose = body.purpose.trim() || null;
    }

    if (room.status === "unavailable") {
      return conflict(
        `Room ${room.roomNumber} is marked unavailable and cannot be booked.`,
        { room: { id: room.id, roomNumber: room.roomNumber, status: room.status } },
      );
    }

    // --- conflict check + insert, in one transaction ----------------------
    // Checking and inserting separately would let two simultaneous requests
    // both see a free room and both book it.
    const result = await prisma.$transaction(async (tx) => {
      // `tx`, not the global client: see findConflictingBookings in lib/rooms.ts.
      const conflicts = await findConflictingBookings(
        room.id,
        date,
        startTime,
        endTime,
        tx,
      );

      if (conflicts.length > 0) return { conflicts };

      const booking = await tx.booking.create({
        data: {
          roomId: room.id,
          date,
          startTime,
          endTime,
          bookedBy,
          purpose,
        },
      });

      return { booking };
    });

    if (result.conflicts) {
      const clash = result.conflicts[0];
      return conflict(
        `Room ${room.roomNumber} is already booked on ${date} from ${clash.startTime} to ${clash.endTime} by ${clash.bookedBy}.`,
        {
          room: { id: room.id, roomNumber: room.roomNumber },
          requested: { date, startTime, endTime },
          conflictingBooking: clash,
          conflictingBookings: result.conflicts,
        },
      );
    }

    return created({
      booking: result.booking,
      room: { id: room.id, roomNumber: room.roomNumber, capacity: room.capacity },
    });
  });
}
