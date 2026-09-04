// GET /api/rooms/[id]/bookings — every booking on one room, for the rooms page.
// [id] accepts a room id ("room-006") or a room number ("7A06").
// Optional ?date=2026-09-07 narrows it to a single day.

import { prisma } from "@/lib/db";
import { resolveRoom, toDate } from "@/lib/rooms";

import { badRequest, guard, notFound, ok } from "../../../_lib/http";

export const dynamic = "force-dynamic";

interface Context {
  params: { id: string };
}

export async function GET(request: Request, { params }: Context) {
  return guard(async () => {
    const room = await resolveRoom(params.id);
    if (!room) {
      return notFound(`No room found with id or room number '${params.id}'.`);
    }

    const rawDate = new URL(request.url).searchParams.get("date");
    let date: string | undefined;

    if (rawDate) {
      const parsed = toDate(rawDate);
      if (!parsed) {
        return badRequest(
          `Query param 'date' must look like "2026-09-07", received "${rawDate}".`,
        );
      }
      date = parsed;
    }

    const bookings = await prisma.booking.findMany({
      where: { roomId: room.id, ...(date ? { date } : {}) },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return ok({
      room: { id: room.id, roomNumber: room.roomNumber, capacity: room.capacity },
      count: bookings.length,
      bookings,
    });
  });
}
