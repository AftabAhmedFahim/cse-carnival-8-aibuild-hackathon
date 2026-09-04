// DELETE /api/registrations/[id] — cancel a registration and free the seat.
// Decrements Event.registered in the same transaction so the count stays honest.

import { prisma } from "@/lib/db";

import { guard, notFound, ok } from "../../_lib/http";

export const dynamic = "force-dynamic";

interface Context {
  params: { id: string };
}

export async function GET(_request: Request, { params }: Context) {
  return guard(async () => {
    const registration = await prisma.registration.findUnique({
      where: { id: params.id },
      include: { event: { select: { id: true, name: true } } },
    });

    if (!registration) {
      return notFound(`No registration found with id '${params.id}'.`);
    }

    return ok(registration);
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return guard(async () => {
    const existing = await prisma.registration.findUnique({
      where: { id: params.id },
      include: { event: { select: { id: true, name: true } } },
    });

    if (!existing) {
      return notFound(`No registration found with id '${params.id}'.`);
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.registration.delete({ where: { id: params.id } });

      const event = await tx.event.findUnique({ where: { id: existing.eventId } });
      if (!event) return { event: null };

      // Never drop below zero: the seed count includes anonymous registrations,
      // so it is not derived from the row count.
      const nextCount = Math.max(0, event.registered - 1);

      const updated = await tx.event.update({
        where: { id: event.id },
        data: {
          registered: nextCount,
          // Reopen an event that was only full because of this registration.
          ...(nextCount < event.capacity && event.status === "full"
            ? { status: "upcoming" }
            : {}),
        },
      });

      return { event: updated };
    });

    return ok({
      deleted: true,
      id: params.id,
      registration: existing,
      event: result.event
        ? {
            id: result.event.id,
            name: result.event.name,
            capacity: result.event.capacity,
            registered: result.event.registered,
            status: result.event.status,
          }
        : null,
      message: `Cancelled ${existing.studentName}'s registration for "${existing.event.name}".`,
    });
  });
}
