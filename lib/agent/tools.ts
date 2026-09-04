// Agent tool definitions — each function queries live campus data via Prisma.
// Tool schemas use the Google GenAI Type enum for schema definitions.
import { Type } from "@google/genai";
import { prisma, parseEquipment, hasAllEquipment, serializeEquipment } from "@/lib/db";

// ---------------------------------------------------------------------------
// Tool JSON schemas for the Gemini API (FunctionDeclaration format)
// ---------------------------------------------------------------------------

export const toolDeclarations = [
  {
    name: "list_records",
    description:
      "Read records from any of the five campus systems. Returns an array of matching records. " +
      "Use filters to narrow results (e.g. {day: 'Wednesday'} for schedules, {priority: 'high'} for announcements). " +
      "For rooms, equipment is returned as a parsed array. " +
      "For events, includes registration count and capacity.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        system: {
          type: Type.STRING,
          enum: ["schedules", "rooms", "events", "announcements", "assignments"],
          description: "Which system to query.",
        },
        filters: {
          type: Type.OBJECT,
          description:
            "Optional key-value filters. Keys must match the system's camelCase field names " +
            "(startTime, endTime, roomNumber, postedBy, courseTitle, assignedDate, submissionPlatform, etc.). " +
            "Values are matched with case-insensitive contains for strings, exact match for numbers.",
          properties: {},
        },
      },
      required: ["system"],
    },
  },
  {
    name: "create_record",
    description:
      "Create a new record in one of the five campus systems. " +
      "NOTE: The agent should REFUSE to create schedules or announcements — those are dashboard-only admin actions. " +
      "Provide all required fields for the system.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        system: {
          type: Type.STRING,
          enum: ["schedules", "rooms", "events", "announcements", "assignments"],
          description: "Which system to create a record in.",
        },
        data: {
          type: Type.OBJECT,
          description: "The record data. Field names must be camelCase matching the Prisma model.",
          properties: {},
        },
      },
      required: ["system", "data"],
    },
  },
  {
    name: "update_record",
    description:
      "Update an existing record by ID. " +
      "NOTE: The agent should REFUSE to update schedules, announcements, or other people's records — those are dashboard-only admin actions.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        system: {
          type: Type.STRING,
          enum: ["schedules", "rooms", "events", "announcements", "assignments"],
          description: "Which system the record belongs to.",
        },
        id: {
          type: Type.STRING,
          description: "The record's unique ID.",
        },
        data: {
          type: Type.OBJECT,
          description: "Fields to update. Only include fields that are changing.",
          properties: {},
        },
      },
      required: ["system", "id", "data"],
    },
  },
  {
    name: "delete_record",
    description:
      "Delete a record by ID. " +
      "NOTE: The agent should REFUSE to delete any records — deletion is a dashboard-only admin action.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        system: {
          type: Type.STRING,
          enum: ["schedules", "rooms", "events", "announcements", "assignments"],
          description: "Which system the record belongs to.",
        },
        id: {
          type: Type.STRING,
          description: "The record's unique ID.",
        },
      },
      required: ["system", "id"],
    },
  },
  {
    name: "find_free_rooms",
    description:
      "Find rooms that are free (no overlapping bookings) in a given time window, " +
      "optionally filtered by minimum capacity and required equipment. " +
      "Returns rooms with their details including equipment list.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: {
          type: Type.STRING,
          description: "The date to check, ISO format YYYY-MM-DD.",
        },
        startTime: {
          type: Type.STRING,
          description: "Start of the window, 24h format HH:MM.",
        },
        endTime: {
          type: Type.STRING,
          description: "End of the window, 24h format HH:MM.",
        },
        minCapacity: {
          type: Type.NUMBER,
          description: "Minimum number of seats required. Optional.",
        },
        equipment: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            "List of required equipment items (e.g. ['projector', 'AC']). Case-insensitive matching. Optional.",
        },
      },
      required: ["date", "startTime", "endTime"],
    },
  },
  {
    name: "book_room",
    description:
      "Book a room for a specific date and time range. Rejects if the room already has an overlapping booking. " +
      "The roomId must be the room's internal ID (e.g. 'room-002'), NOT the room number. " +
      "Use list_records or find_free_rooms first to get the correct roomId.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        roomId: {
          type: Type.STRING,
          description: "The room's internal ID (e.g. 'room-002'). Get this from list_records or find_free_rooms.",
        },
        date: {
          type: Type.STRING,
          description: "Booking date, ISO format YYYY-MM-DD.",
        },
        startTime: {
          type: Type.STRING,
          description: "Start time, 24h format HH:MM.",
        },
        endTime: {
          type: Type.STRING,
          description: "End time, 24h format HH:MM.",
        },
        bookedBy: {
          type: Type.STRING,
          description: "Name of the person booking the room.",
        },
      },
      required: ["roomId", "date", "startTime", "endTime", "bookedBy"],
    },
  },
  {
    name: "cancel_booking",
    description: "Cancel (delete) an existing room booking by its booking ID.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        bookingId: {
          type: Type.STRING,
          description: "The booking's unique ID.",
        },
      },
      required: ["bookingId"],
    },
  },
  {
    name: "register_event",
    description:
      "Register a student for an event. Rejects if the event is already at capacity. " +
      "The eventId must be the event's internal ID (e.g. 'evt-002'). " +
      "Use list_records first to find the event and confirm available capacity.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        eventId: {
          type: Type.STRING,
          description: "The event's internal ID (e.g. 'evt-002').",
        },
        studentName: {
          type: Type.STRING,
          description: "Full name of the student to register.",
        },
      },
      required: ["eventId", "studentName"],
    },
  },
];

// ---------------------------------------------------------------------------
// Prisma model mapping — system name -> Prisma delegate
// ---------------------------------------------------------------------------

type PrismaDelegate = {
  findMany: (args?: Record<string, unknown>) => Promise<unknown[]>;
  create: (args: Record<string, unknown>) => Promise<unknown>;
  update: (args: Record<string, unknown>) => Promise<unknown>;
  delete: (args: Record<string, unknown>) => Promise<unknown>;
};

function getDelegate(system: string): PrismaDelegate {
  const map: Record<string, PrismaDelegate> = {
    schedules: prisma.schedule as unknown as PrismaDelegate,
    rooms: prisma.room as unknown as PrismaDelegate,
    events: prisma.event as unknown as PrismaDelegate,
    announcements: prisma.announcement as unknown as PrismaDelegate,
    assignments: prisma.assignment as unknown as PrismaDelegate,
  };
  const delegate = map[system];
  if (!delegate) throw new Error(`Unknown system: ${system}. Must be one of: schedules, rooms, events, announcements, assignments.`);
  return delegate;
}

// ---------------------------------------------------------------------------
// Tool executor — dispatches a tool call to the right function
// ---------------------------------------------------------------------------

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "list_records":
      return listRecords(input);
    case "create_record":
      return createRecord(input);
    case "update_record":
      return updateRecord(input);
    case "delete_record":
      return deleteRecord(input);
    case "find_free_rooms":
      return findFreeRooms(input);
    case "book_room":
      return bookRoom(input);
    case "cancel_booking":
      return cancelBooking(input);
    case "register_event":
      return registerEvent(input);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

/** Build a Prisma `where` clause from the user-supplied filters object. */
function buildWhere(system: string, filters?: Record<string, unknown>): Record<string, unknown> {
  if (!filters || Object.keys(filters).length === 0) return {};

  const where: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string") {
      // SQLite's LIKE (which Prisma `contains` maps to) is case-insensitive by default
      where[key] = { contains: value };
    } else {
      // Exact match for numbers, booleans, etc.
      where[key] = value;
    }
  }
  return where;
}

async function listRecords(input: Record<string, unknown>): Promise<unknown> {
  const system = input.system as string;
  const filters = input.filters as Record<string, unknown> | undefined;
  const delegate = getDelegate(system);

  const where = buildWhere(system, filters);

  // Include related data for rooms and events
  const include: Record<string, unknown> = {};
  if (system === "rooms") include.bookings = true;
  if (system === "events") include.registrations = true;

  const records = await delegate.findMany({
    where,
    ...(Object.keys(include).length > 0 ? { include } : {}),
  });

  // Parse equipment for rooms so the model sees a clean array
  if (system === "rooms") {
    return (records as Record<string, unknown>[]).map((r) => ({
      ...r,
      equipment: parseEquipment(r.equipment as string),
    }));
  }

  return records;
}

async function createRecord(input: Record<string, unknown>): Promise<unknown> {
  const system = input.system as string;
  const data = { ...(input.data as Record<string, unknown>) };
  const delegate = getDelegate(system);

  // Serialize equipment for rooms
  if (system === "rooms" && data.equipment) {
    data.equipment = serializeEquipment(data.equipment as string[] | string);
  }

  const record = await delegate.create({ data });
  return record;
}

async function updateRecord(input: Record<string, unknown>): Promise<unknown> {
  const system = input.system as string;
  const id = input.id as string;
  const data = { ...(input.data as Record<string, unknown>) };
  const delegate = getDelegate(system);

  // Serialize equipment for rooms
  if (system === "rooms" && data.equipment) {
    data.equipment = serializeEquipment(data.equipment as string[] | string);
  }

  const record = await delegate.update({ where: { id }, data });
  return record;
}

async function deleteRecord(input: Record<string, unknown>): Promise<unknown> {
  const system = input.system as string;
  const id = input.id as string;
  const delegate = getDelegate(system);

  const record = await delegate.delete({ where: { id } });
  return record;
}

async function findFreeRooms(input: Record<string, unknown>): Promise<unknown> {
  const date = input.date as string;
  const startTime = input.startTime as string;
  const endTime = input.endTime as string;
  const minCapacity = (input.minCapacity as number) || 0;
  const requiredEquipment = (input.equipment as string[]) || [];

  // Get all available rooms that meet the capacity requirement
  const rooms = await prisma.room.findMany({
    where: {
      status: "available",
      capacity: { gte: minCapacity },
    },
    include: { bookings: true },
  });

  // Filter: no overlapping bookings on the given date
  const freeRooms = rooms.filter((room) => {
    // Check equipment requirement
    if (!hasAllEquipment(room.equipment, requiredEquipment)) return false;

    // Check for overlapping bookings on the same date
    const hasConflict = room.bookings.some((booking) => {
      if (booking.date !== date) return false;
      // Two intervals overlap if one starts before the other ends
      return booking.startTime < endTime && booking.endTime > startTime;
    });

    return !hasConflict;
  });

  // Return clean data with parsed equipment
  return freeRooms.map((room) => ({
    id: room.id,
    roomNumber: room.roomNumber,
    type: room.type,
    capacity: room.capacity,
    equipment: parseEquipment(room.equipment),
    floor: room.floor,
    status: room.status,
  }));
}

async function bookRoom(input: Record<string, unknown>): Promise<unknown> {
  const roomId = input.roomId as string;
  const date = input.date as string;
  const startTime = input.startTime as string;
  const endTime = input.endTime as string;
  const bookedBy = input.bookedBy as string;

  // Verify the room exists
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new Error(`Room not found with ID: ${roomId}`);

  // Check for overlapping bookings
  const conflicting = await prisma.booking.findFirst({
    where: {
      roomId,
      date,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });

  if (conflicting) {
    throw new Error(
      `Room ${room.roomNumber} already has a booking on ${date} from ${conflicting.startTime} to ${conflicting.endTime} ` +
        `by ${conflicting.bookedBy} (booking ID: ${conflicting.id}). Choose a different time or room.`,
    );
  }

  // Create the booking
  const booking = await prisma.booking.create({
    data: { roomId, date, startTime, endTime, bookedBy },
  });

  return {
    message: `Successfully booked room ${room.roomNumber} on ${date} from ${startTime} to ${endTime}.`,
    booking: {
      id: booking.id,
      roomId: booking.roomId,
      roomNumber: room.roomNumber,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      bookedBy: booking.bookedBy,
    },
  };
}

async function cancelBooking(input: Record<string, unknown>): Promise<unknown> {
  const bookingId = input.bookingId as string;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: true },
  });

  if (!booking) throw new Error(`Booking not found with ID: ${bookingId}`);

  await prisma.booking.delete({ where: { id: bookingId } });

  return {
    message: `Cancelled booking ${bookingId} for room ${booking.room.roomNumber} on ${booking.date} from ${booking.startTime} to ${booking.endTime}.`,
  };
}

async function registerEvent(input: Record<string, unknown>): Promise<unknown> {
  const eventId = input.eventId as string;
  const studentName = input.studentName as string;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { registrations: true },
  });

  if (!event) throw new Error(`Event not found with ID: ${eventId}`);

  // Check capacity using the authoritative registered count
  if (event.registered >= event.capacity) {
    throw new Error(
      `Event "${event.name}" is at capacity (${event.registered}/${event.capacity}). Registration is closed.`,
    );
  }

  // Create registration and increment the registered count atomically
  const [registration] = await prisma.$transaction([
    prisma.registration.create({
      data: { eventId, studentName },
    }),
    prisma.event.update({
      where: { id: eventId },
      data: { registered: { increment: 1 } },
    }),
  ]);

  return {
    message: `Successfully registered ${studentName} for "${event.name}" on ${event.date}.`,
    registration: {
      id: registration.id,
      eventId,
      eventName: event.name,
      studentName,
      currentRegistered: event.registered + 1,
      capacity: event.capacity,
    },
  };
}
