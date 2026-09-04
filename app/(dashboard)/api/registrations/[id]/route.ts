// Registration cancellation endpoint to unregister a student and decrement count.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const registration = await prisma.registration.findUnique({
      where: { id: params.id },
    });

    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.registration.delete({
        where: { id: params.id },
      }),
      prisma.event.update({
        where: { id: registration.eventId },
        data: {
          registered: { decrement: 1 },
          status: "upcoming",
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to cancel registration" },
      { status: 400 },
    );
  }
}
