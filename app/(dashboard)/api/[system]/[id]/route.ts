// Generic CRUD API route handler for read, update, and delete single records.

import { NextRequest, NextResponse } from "next/server";
import prisma, { serializeEquipment } from "@/lib/db";

const ALLOWED_SYSTEMS = ["schedules", "rooms", "events", "announcements", "assignments"] as const;
type SystemName = (typeof ALLOWED_SYSTEMS)[number];

function getModelDelegate(system: SystemName) {
  switch (system) {
    case "schedules":
      return prisma.schedule;
    case "rooms":
      return prisma.room;
    case "events":
      return prisma.event;
    case "announcements":
      return prisma.announcement;
    case "assignments":
      return prisma.assignment;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { system: string; id: string } },
) {
  const system = params.system as SystemName;
  if (!ALLOWED_SYSTEMS.includes(system)) {
    return NextResponse.json({ error: `Unknown system: ${params.system}` }, { status: 400 });
  }

  try {
    const delegate = getModelDelegate(system);
    const record = await (delegate as any).findUnique({
      where: { id: params.id },
      ...(system === "rooms" ? { include: { bookings: true } } : {}),
      ...(system === "events" ? { include: { registrations: true } } : {}),
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch record" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { system: string; id: string } },
) {
  const system = params.system as SystemName;
  if (!ALLOWED_SYSTEMS.includes(system)) {
    return NextResponse.json({ error: `Unknown system: ${params.system}` }, { status: 400 });
  }

  try {
    const body = await request.json();
    const data = { ...body };
    delete data.id; // Never overwrite id

    if (system === "rooms") {
      if ("capacity" in data) data.capacity = Number(data.capacity);
      if ("floor" in data) data.floor = Number(data.floor);
      if ("equipment" in data) data.equipment = serializeEquipment(data.equipment);
      delete data.bookings;
    } else if (system === "events") {
      if ("capacity" in data) data.capacity = Number(data.capacity);
      if ("registered" in data) data.registered = Number(data.registered);
      delete data.registrations;
    } else if (system === "assignments") {
      if ("marks" in data) data.marks = Number(data.marks);
    }

    const delegate = getModelDelegate(system);
    const updated = await (delegate as any).update({
      where: { id: params.id },
      data,
      ...(system === "rooms" ? { include: { bookings: true } } : {}),
      ...(system === "events" ? { include: { registrations: true } } : {}),
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update record" }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { system: string; id: string } },
) {
  const system = params.system as SystemName;
  if (!ALLOWED_SYSTEMS.includes(system)) {
    return NextResponse.json({ error: `Unknown system: ${params.system}` }, { status: 400 });
  }

  try {
    const delegate = getModelDelegate(system);
    await (delegate as any).delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete record" }, { status: 400 });
  }
}
