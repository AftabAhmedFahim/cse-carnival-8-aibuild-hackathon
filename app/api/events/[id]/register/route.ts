// POST /api/events/[id]/register — register a student, rejecting a full event with 409.
//
// Body: { studentName, studentId? }
//
// Capacity is judged on Event.registered, NOT registrations.length: the seed
// carries anonymous registrations (evt-001 is 47/60 with only 3 named rows), so
// counting rows would let people into an event that is genuinely full.
// A successful registration increments `registered` in the same transaction.

import { prisma } from "@/lib/db";

import {
  badRequest,
  conflict,
  created,
  guard,
  notFound,
  readJsonBody,
} from "../../../_lib/http";

export const dynamic = "force-dynamic";

interface Context {
  params: { id: string };
}

export async function POST(request: Request, { params }: Context) {
  return guard(async () => {
    const event = await prisma.event.findUnique({ where: { id: params.id } });
    if (!event) {
      return notFound(`No event found with id '${params.id}'.`);
    }

    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body;

    if (typeof body.studentName !== "string" || body.studentName.trim() === "") {
      return badRequest(
        "Field 'studentName' is required and must be a non-empty string.",
      );
    }
    const studentName = body.studentName.trim();

    let studentId: string | null = null;
    if (body.studentId !== undefined && body.studentId !== null) {
      if (typeof body.studentId !== "string") {
        return badRequest("Field 'studentId' must be a string when provided.");
      }
      studentId = body.studentId.trim() || null;
    }

    if (event.status === "cancelled" || event.status === "completed") {
      return conflict(
        `"${event.name}" is ${event.status} and is not accepting registrations.`,
        { event: { id: event.id, name: event.name, status: event.status } },
      );
    }

    // Check capacity and insert together, so two simultaneous requests cannot
    // both see the last seat.
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.event.findUnique({ where: { id: params.id } });
      if (!current) return { gone: true as const };

      if (current.registered >= current.capacity) {
        return { full: true as const, event: current };
      }

      const duplicate = await tx.registration.findFirst({
        where: { eventId: params.id, studentName },
      });
      if (duplicate) {
        return { duplicate, event: current };
      }

      const registration = await tx.registration.create({
        data: { eventId: params.id, studentName, studentId },
      });

      const nextCount = current.registered + 1;

      const updated = await tx.event.update({
        where: { id: params.id },
        data: {
          registered: nextCount,
          // Keep the displayed status honest, without clobbering a status
          // someone set deliberately (cancelled, completed, ongoing).
          ...(nextCount >= current.capacity && current.status === "upcoming"
            ? { status: "full" }
            : {}),
        },
      });

      return { registration, event: updated };
    });

    if ("gone" in result) {
      return notFound(`No event found with id '${params.id}'.`);
    }

    if ("full" in result) {
      return conflict(
        `"${result.event.name}" is at capacity (${result.event.registered}/${result.event.capacity}).`,
        {
          event: {
            id: result.event.id,
            name: result.event.name,
            capacity: result.event.capacity,
            registered: result.event.registered,
            status: result.event.status,
          },
        },
      );
    }

    if ("duplicate" in result) {
      return conflict(
        `${studentName} is already registered for "${result.event.name}".`,
        { registration: result.duplicate },
      );
    }

    return created({
      registration: result.registration,
      event: {
        id: result.event.id,
        name: result.event.name,
        capacity: result.event.capacity,
        registered: result.event.registered,
        status: result.event.status,
      },
    });
  });
}
