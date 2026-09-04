// GET /api/events/[id]/registrations — the named registrations for one event.
//
// `registered` is the authoritative headcount and is usually larger than
// `registrations.length`, because the seed includes anonymous registrations.
// Both numbers are returned so the UI can show "3 named of 47 registered".

import { prisma } from "@/lib/db";

import { guard, notFound, ok } from "../../../_lib/http";

export const dynamic = "force-dynamic";

interface Context {
  params: { id: string };
}

export async function GET(_request: Request, { params }: Context) {
  return guard(async () => {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: { registrations: { orderBy: { createdAt: "asc" } } },
    });

    if (!event) {
      return notFound(`No event found with id '${params.id}'.`);
    }

    return ok({
      event: {
        id: event.id,
        name: event.name,
        capacity: event.capacity,
        registered: event.registered,
        status: event.status,
      },
      namedCount: event.registrations.length,
      registeredCount: event.registered,
      seatsRemaining: Math.max(0, event.capacity - event.registered),
      registrations: event.registrations,
    });
  });
}
