// DELETE /api/bookings/[id] — cancel a booking. GET returns one booking.

import { prisma } from "@/lib/db";

import { guard, notFound, ok } from "../../_lib/http";

export const dynamic = "force-dynamic";

interface Context {
  params: { id: string };
}

export async function GET(_request: Request, { params }: Context) {
  return guard(async () => {
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { room: { select: { id: true, roomNumber: true } } },
    });

    if (!booking) {
      return notFound(`No booking found with id '${params.id}'.`);
    }

    return ok(booking);
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return guard(async () => {
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { room: { select: { id: true, roomNumber: true } } },
    });

    if (!booking) {
      return notFound(`No booking found with id '${params.id}'.`);
    }

    await prisma.booking.delete({ where: { id: params.id } });

    return ok({
      deleted: true,
      id: params.id,
      booking,
      message: `Cancelled ${booking.bookedBy}'s booking of room ${booking.room.roomNumber} on ${booking.date} from ${booking.startTime} to ${booking.endTime}.`,
    });
  });
}
