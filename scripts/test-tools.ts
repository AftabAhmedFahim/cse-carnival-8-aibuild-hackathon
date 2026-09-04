// Milestone 1 verification — call each tool directly and print results.
import { executeTool } from "../lib/agent/tools";

async function main() {
  console.log("=== MILESTONE 1 — Tool Verification ===\n");

  // 1. list_records — schedules
  console.log("--- list_records (schedules, day=Wednesday) ---");
  const schedules = await executeTool("list_records", {
    system: "schedules",
    filters: { day: "Wednesday" },
  });
  console.log(JSON.stringify(schedules, null, 2).slice(0, 500));

  // 2. list_records — announcements with priority filter
  console.log("\n--- list_records (announcements, priority=high) ---");
  const announcements = await executeTool("list_records", {
    system: "announcements",
    filters: { priority: "high" },
  });
  console.log(JSON.stringify(announcements, null, 2).slice(0, 500));

  // 3. list_records — rooms (check equipment parsing)
  console.log("\n--- list_records (rooms) ---");
  const rooms = await executeTool("list_records", {
    system: "rooms",
    filters: {},
  });
  const roomArr = rooms as Array<Record<string, unknown>>;
  console.log(`Total rooms: ${roomArr.length}`);
  console.log(`First room equipment: ${JSON.stringify(roomArr[0]?.equipment)}`);

  // 4. find_free_rooms
  console.log("\n--- find_free_rooms (tomorrow 14:00-16:00, minCapacity=5, equipment=['projector']) ---");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const freeRooms = await executeTool("find_free_rooms", {
    date: tomorrowStr,
    startTime: "14:00",
    endTime: "16:00",
    minCapacity: 5,
    equipment: ["projector"],
  });
  const freeArr = freeRooms as Array<Record<string, unknown>>;
  console.log(`Free rooms: ${freeArr.length}`);
  freeArr.slice(0, 3).forEach((r) =>
    console.log(`  ${r.roomNumber} (cap: ${r.capacity}, equip: ${JSON.stringify(r.equipment)})`),
  );

  // 5. book_room
  console.log("\n--- book_room (room-002, tomorrow 15:00-17:00) ---");
  try {
    const booking = await executeTool("book_room", {
      roomId: "room-002",
      date: tomorrowStr,
      startTime: "15:00",
      endTime: "17:00",
      bookedBy: "Test User",
    });
    console.log(JSON.stringify(booking, null, 2));
  } catch (e) {
    console.log(`Error (expected if overlap): ${e}`);
  }

  // 6. cancel_booking — cancel the booking we just made
  console.log("\n--- cancel_booking (the one we just made) ---");
  const bookings = await executeTool("list_records", {
    system: "rooms",
    filters: { roomNumber: "7A02" },
  });
  const room7a02 = (bookings as Array<Record<string, unknown>>)[0];
  const room7a02Bookings = room7a02?.bookings as Array<Record<string, unknown>>;
  if (room7a02Bookings && room7a02Bookings.length > 0) {
    const lastBooking = room7a02Bookings[room7a02Bookings.length - 1];
    const cancelResult = await executeTool("cancel_booking", {
      bookingId: lastBooking.id,
    });
    console.log(JSON.stringify(cancelResult, null, 2));
  } else {
    console.log("No bookings to cancel");
  }

  // 7. register_event
  console.log("\n--- register_event (evt-002, 'Test Student') ---");
  try {
    const reg = await executeTool("register_event", {
      eventId: "evt-002",
      studentName: "Test Student",
    });
    console.log(JSON.stringify(reg, null, 2));
  } catch (e) {
    console.log(`Error (expected if at capacity): ${e}`);
  }

  // 8. list_records — assignments
  console.log("\n--- list_records (assignments) ---");
  const assignments = await executeTool("list_records", {
    system: "assignments",
  });
  const assignArr = assignments as Array<Record<string, unknown>>;
  console.log(`Total assignments: ${assignArr.length}`);

  // 9. list_records — events
  console.log("\n--- list_records (events) ---");
  const events = await executeTool("list_records", { system: "events" });
  const eventArr = events as Array<Record<string, unknown>>;
  console.log(`Total events: ${eventArr.length}`);
  eventArr.forEach((e) =>
    console.log(`  ${e.name}: ${e.registered}/${e.capacity} (${e.status})`),
  );

  console.log("\n=== All tool calls completed ===");
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
