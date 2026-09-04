// Room booking endpoint with overlap conflict detection and 409 responses.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const roomId = params.id;
    const body = await request.json();
    const { startTime, endTime, bookedBy, date, purpose } = body;

    if (!startTime || !endTime || !bookedBy) {
      return NextResponse.json(
        { error: "startTime, endTime, and bookedBy are required" },
        { status: 400 },
      );
    }

    const bookingDate = date || new Date().toISOString().split("T")[0];

    // Find the room
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { bookings: true },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Check for overlapping bookings on the same date
    // Overlap condition: start < existingEnd AND end > existingStart
    const conflict = await prisma.booking.findFirst({
      where: {
        roomId,
        date: bookingDate,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (conflict) {
      return NextResponse.json(
        {
          error: "Conflicting booking exists for this time range.",
          conflictingBooking: conflict,
        },
        { status: 409 },
      );
    }

    const newBooking = await prisma.booking.create({
      data: {
        roomId,
        bookedBy,
        date: bookingDate,
        startTime,
        endTime,
        purpose: purpose || null,
      },
    });

    return NextResponse.json(newBooking, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create booking" },
      { status: 500 },
    );
  }
}
