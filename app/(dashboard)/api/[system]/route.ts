// Generic CRUD API route handler for list and create across all five CampusOS systems.

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
  request: NextRequest,
  { params }: { params: { system: string } },
) {
  const system = params.system as SystemName;
  if (!ALLOWED_SYSTEMS.includes(system)) {
    return NextResponse.json({ error: `Unknown system: ${params.system}` }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const filters: Record<string, any> = {};

  searchParams.forEach((val, key) => {
    if (val !== undefined && val !== "") {
      filters[key] = val;
    }
  });

  try {
    const delegate = getModelDelegate(system);
    let records;

    if (system === "rooms") {
      records = await prisma.room.findMany({
        where: filters,
        include: { bookings: true },
        orderBy: { roomNumber: "asc" },
      });
    } else if (system === "events") {
      records = await prisma.event.findMany({
        where: filters,
        include: { registrations: true },
        orderBy: { date: "asc" },
      });
    } else {
      records = await (delegate as any).findMany({
        where: filters,
      });
    }

    return NextResponse.json(records);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch records" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { system: string } },
) {
  const system = params.system as SystemName;
  if (!ALLOWED_SYSTEMS.includes(system)) {
    return NextResponse.json({ error: `Unknown system: ${params.system}` }, { status: 400 });
  }

  try {
    const body = await request.json();
    const data = { ...body };

    // Format fields appropriately
    if (system === "rooms") {
      if ("capacity" in data) data.capacity = Number(data.capacity);
      if ("floor" in data) data.floor = Number(data.floor);
      if ("equipment" in data) data.equipment = serializeEquipment(data.equipment);
    } else if (system === "events") {
      if ("capacity" in data) data.capacity = Number(data.capacity);
      if ("registered" in data) data.registered = Number(data.registered);
    } else if (system === "assignments") {
      if ("marks" in data) data.marks = Number(data.marks);
    }

    const delegate = getModelDelegate(system);
    const created = await (delegate as any).create({
      data,
      ...(system === "rooms" ? { include: { bookings: true } } : {}),
      ...(system === "events" ? { include: { registrations: true } } : {}),
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create record" }, { status: 400 });
  }
}
