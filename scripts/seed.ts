/**
 * CampusOS seed script  —  `npm run seed`
 *
 * Loads the five JSON files in data/ into SQLite through Prisma.
 *
 * IDEMPOTENT: every table is emptied before anything is inserted, so running
 * this repeatedly always produces the same row counts. It is safe to re-run at
 * any time to reset the database to the shipped seed state.
 *
 * MAPPING NOTES (why this file exists rather than a straight JSON.parse):
 *   - JSON is snake_case, Prisma Client is camelCase   (start_time -> startTime)
 *   - rooms[].bookings[]        -> Booking rows,      booking_id -> Booking.id
 *   - events[].registrations[]  -> Registration rows, name       -> studentName
 *   - rooms[].equipment string[] -> JSON string       (SQLite has no array type)
 *
 * See schema/schema.md for the field definitions this maps from.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { prisma, serializeEquipment } from "../lib/db";

// ---------------------------------------------------------------------------
// Shapes of the raw seed JSON, exactly as written in schema/schema.md.
// Typed so a rename in the data files fails at compile time, not silently.
// ---------------------------------------------------------------------------

interface RawSchedule {
  id: string;
  course: string;
  title: string;
  day: string;
  start_time: string;
  end_time: string;
  room: string;
  instructor: string;
  section: string;
}

interface RawBooking {
  booking_id: string;
  booked_by: string;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
}

interface RawRoom {
  id: string;
  room_number: string;
  type: string;
  capacity: number;
  equipment: string[];
  floor: number;
  status: string;
  bookings: RawBooking[];
}

interface RawRegistration {
  student_id: string;
  name: string;
}

interface RawEvent {
  id: string;
  name: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  end_date: string;
  venue: string;
  organizer: string;
  capacity: number;
  registered: number;
  registrations: RawRegistration[];
  status: string;
}

interface RawAnnouncement {
  id: string;
  title: string;
  body: string;
  date: string;
  priority: string;
  posted_by: string;
  expires: string;
}

interface RawAssignment {
  id: string;
  course: string;
  course_title: string;
  title: string;
  description: string;
  assigned_date: string;
  deadline: string;
  submission_platform: string;
  status: string;
  marks: number;
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");

function loadJson<T>(fileName: string): T[] {
  const filePath = path.join(DATA_DIR, fileName);

  if (!existsSync(filePath)) {
    throw new Error(
      `Seed file not found: ${filePath}\n` +
        `Run this from the repository root ("npm run seed"), not from inside scripts/.`,
    );
  }

  const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected ${fileName} to contain a JSON array.`);
  }

  return parsed as T[];
}

// Counts asserted at the end of the run. From README.md "Seed Data Overview".
const EXPECTED = {
  schedules: 24,
  rooms: 20,
  events: 7,
  announcements: 8,
  assignments: 8,
} as const;

async function main() {
  const schedules = loadJson<RawSchedule>("schedules.json");
  const rooms = loadJson<RawRoom>("rooms.json");
  const events = loadJson<RawEvent>("events.json");
  const announcements = loadJson<RawAnnouncement>("announcements.json");
  const assignments = loadJson<RawAssignment>("assignments.json");

  // -------------------------------------------------------------------------
  // 1. Clear everything. Children before parents so the foreign keys hold.
  //    AgentStep is wiped too: seeding resets the world, and a trace pointing
  //    at rows that no longer exist is worse than no trace.
  // -------------------------------------------------------------------------
  console.log("Clearing existing rows...");
  await prisma.booking.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.agentStep.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.room.deleteMany();
  await prisma.event.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.assignment.deleteMany();

  // -------------------------------------------------------------------------
  // 2. Insert, applying the snake_case -> camelCase mapping.
  // -------------------------------------------------------------------------

  console.log("Inserting schedules...");
  for (const item of schedules) {
    await prisma.schedule.create({
      data: {
        id: item.id,
        course: item.course,
        title: item.title,
        day: item.day,
        startTime: item.start_time, // start_time -> startTime
        endTime: item.end_time, // end_time   -> endTime
        room: item.room, // room number string, not a relation
        instructor: item.instructor,
        section: item.section,
      },
    });
  }

  console.log("Inserting rooms and their bookings...");
  for (const item of rooms) {
    await prisma.room.create({
      data: {
        id: item.id,
        roomNumber: item.room_number, // room_number -> roomNumber
        type: item.type,
        capacity: item.capacity,
        equipment: serializeEquipment(item.equipment), // string[] -> JSON string
        floor: item.floor,
        status: item.status,
        // rooms[].bookings[] is flattened into its own table.
        bookings: {
          create: item.bookings.map((booking) => ({
            id: booking.booking_id, // booking_id -> id
            bookedBy: booking.booked_by, // booked_by  -> bookedBy
            date: booking.date,
            startTime: booking.start_time,
            endTime: booking.end_time,
            purpose: booking.purpose,
          })),
        },
      },
    });
  }

  console.log("Inserting events and their registrations...");
  for (const item of events) {
    await prisma.event.create({
      data: {
        id: item.id,
        name: item.name,
        description: item.description,
        date: item.date,
        startTime: item.start_time,
        endTime: item.end_time,
        endDate: item.end_date, // end_date -> endDate
        venue: item.venue, // room number string, not a relation
        organizer: item.organizer,
        capacity: item.capacity,
        // Kept exactly as the JSON has it. This is the authoritative count and
        // is intentionally larger than registrations.length -- see schema.prisma.
        registered: item.registered,
        status: item.status,
        registrations: {
          create: item.registrations.map((registration) => ({
            studentName: registration.name, // name       -> studentName
            studentId: registration.student_id, // student_id -> studentId
          })),
        },
      },
    });
  }

  console.log("Inserting announcements...");
  for (const item of announcements) {
    await prisma.announcement.create({
      data: {
        id: item.id,
        title: item.title,
        body: item.body,
        date: item.date,
        priority: item.priority,
        postedBy: item.posted_by, // posted_by -> postedBy
        expires: item.expires,
      },
    });
  }

  console.log("Inserting assignments...");
  for (const item of assignments) {
    await prisma.assignment.create({
      data: {
        id: item.id,
        course: item.course,
        courseTitle: item.course_title, // course_title        -> courseTitle
        title: item.title,
        description: item.description,
        assignedDate: item.assigned_date, // assigned_date       -> assignedDate
        deadline: item.deadline,
        submissionPlatform: item.submission_platform, // submission_platform -> submissionPlatform
        status: item.status,
        marks: item.marks,
      },
    });
  }

  // -------------------------------------------------------------------------
  // 3. Count and verify.
  // -------------------------------------------------------------------------

  const counts = {
    schedules: await prisma.schedule.count(),
    rooms: await prisma.room.count(),
    events: await prisma.event.count(),
    announcements: await prisma.announcement.count(),
    assignments: await prisma.assignment.count(),
    bookings: await prisma.booking.count(),
    registrations: await prisma.registration.count(),
    agentSteps: await prisma.agentStep.count(),
  };

  console.log("\n  Table            Rows   Expected");
  console.log("  ------------------------------------");
  const failures: string[] = [];

  for (const [table, rows] of Object.entries(counts)) {
    const expected = EXPECTED[table as keyof typeof EXPECTED];
    const expectedLabel = expected === undefined ? "-" : String(expected);
    const ok = expected === undefined || rows === expected;
    if (!ok) failures.push(`${table}: got ${rows}, expected ${expected}`);
    console.log(
      `  ${table.padEnd(15)}${String(rows).padStart(5)}   ${expectedLabel.padStart(8)}  ${ok ? "" : "<-- MISMATCH"}`,
    );
  }

  if (failures.length > 0) {
    throw new Error(`Seed row counts are wrong:\n  ${failures.join("\n  ")}`);
  }

  console.log("\nSeed complete. All row counts match.");
}

main()
  .catch((error) => {
    console.error("\nSeed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
