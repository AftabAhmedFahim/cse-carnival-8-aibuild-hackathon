// Event registration endpoint with capacity checking and 409 response.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const eventId = params.id;
    const body = await request.json();
    const { studentName, studentId } = body;

    if (!studentName) {
      return NextResponse.json(
        { error: "studentName is required" },
        { status: 400 },
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.registered >= event.capacity || event.status === "full") {
      return NextResponse.json(
        {
          error: "Event is at maximum capacity.",
          capacity: event.capacity,
          registered: event.registered,
        },
        { status: 409 },
      );
    }

    // Create registration and increment registered count
    const [registration, updatedEvent] = await prisma.$transaction([
      prisma.registration.create({
        data: {
          eventId,
          studentName,
          studentId: studentId || null,
        },
      }),
      prisma.event.update({
        where: { id: eventId },
        data: {
          registered: { increment: 1 },
          ...(event.registered + 1 >= event.capacity ? { status: "full" } : {}),
        },
      }),
    ]);

    return NextResponse.json(
      { registration, event: updatedEvent },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to register for event" },
      { status: 500 },
    );
  }
}
