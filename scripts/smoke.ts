/**
 * CampusOS end-to-end smoke test  —  `npm run smoke`
 *
 * Drives the whole stack against a RUNNING dev server so an integration pass is
 * "run one command, read what is red" instead of clicking through the UI.
 *
 *   Terminal 1:  npm run dev
 *   Terminal 2:  npm run smoke
 *
 * Three outcomes per check:
 *   PASS     works
 *   FAIL     built, but broken  -> exits 1, this is what you fix
 *   PENDING  not built yet      -> does not fail the run
 *
 * PENDING exists so this is useful before the dashboard and agent land. Once
 * everything is merged, a clean run should show zero PENDING and zero FAIL.
 *
 * It cleans up every record it creates, so it is safe to re-run.
 */

const BASE = process.env.SMOKE_URL ?? "http://localhost:3000";

// Every record this script creates carries this marker so leftovers from an
// interrupted run can be spotted and swept.
const MARKER = "__smoke__";

let pass = 0;
let fail = 0;
let pending = 0;
const failures: string[] = [];

function record(status: "PASS" | "FAIL" | "PENDING", label: string, detail = "") {
  if (status === "PASS") pass++;
  else if (status === "FAIL") {
    fail++;
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  } else pending++;

  const tag = status.padEnd(7);
  console.log(`  ${tag} ${label}${detail ? `\n            ${detail}` : ""}`);
}

function section(title: string) {
  console.log(`\n${"=".repeat(78)}\n${title}\n${"=".repeat(78)}`);
}

interface ApiResult {
  status: number;
  body: any;
}

async function api(method: string, path: string, body?: unknown): Promise<ApiResult> {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let parsed: any;
  const text = await res.text();
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text.slice(0, 200);
  }

  return { status: res.status, body: parsed };
}

/** A page that returns 404 has not been built yet; anything else is a real result. */
async function page(path: string): Promise<number> {
  const res = await fetch(BASE + path, { redirect: "manual" });
  return res.status;
}

// ---------------------------------------------------------------------------

async function main() {
  console.log(`CampusOS smoke test against ${BASE}`);

  // Fail fast with a readable message if the server is not up.
  try {
    await fetch(BASE + "/api/schedules");
  } catch {
    console.error(
      `\nCannot reach ${BASE}. Start the server first:\n\n  npm run dev\n`,
    );
    process.exitCode = 1;
    return;
  }

  // -------------------------------------------------------------------------
  section("1. DATA — all five systems are loaded and readable");

  const SEEDED = {
    schedules: 24,
    rooms: 20,
    events: 7,
    announcements: 8,
    assignments: 8,
  };

  for (const [system, seedCount] of Object.entries(SEEDED)) {
    const res = await api("GET", `/api/${system}`);
    const rows = Array.isArray(res.body) ? res.body.length : -1;

    if (res.status !== 200 || rows < 0) {
      record("FAIL", `GET /api/${system}`, `status ${res.status}, expected a JSON array`);
    } else if (rows === 0) {
      record("FAIL", `GET /api/${system}`, "0 rows — did you run `npm run seed`?");
    } else {
      record(
        "PASS",
        `GET /api/${system}`,
        `${rows} rows${rows !== seedCount ? ` (seed ships ${seedCount}; differs because records were added or removed)` : ""}`,
      );
    }
  }

  // Room.equipment must reach the UI as a real array, not a JSON string.
  const roomsRes = await api("GET", "/api/rooms?limit=1");
  const firstRoom = Array.isArray(roomsRes.body) ? roomsRes.body[0] : null;
  if (firstRoom && Array.isArray(firstRoom.equipment)) {
    record("PASS", "Room.equipment is parsed into an array", JSON.stringify(firstRoom.equipment));
  } else {
    record(
      "FAIL",
      "Room.equipment is parsed into an array",
      `got ${JSON.stringify(firstRoom?.equipment)} — the UI cannot filter on this`,
    );
  }

  // -------------------------------------------------------------------------
  section("2. CRUD — create, read, update, delete round-trip");

  const createRes = await api("POST", "/api/announcements", {
    title: `${MARKER} smoke announcement`,
    body: "Created by npm run smoke. Deleted again at the end of this run.",
    date: "2026-09-04",
    priority: "low",
    postedBy: MARKER,
  });

  let annId: string | null = null;

  if (createRes.status === 201 && createRes.body?.id) {
    annId = createRes.body.id;
    record("PASS", "POST   /api/announcements", `created ${annId}`);
  } else {
    record("FAIL", "POST   /api/announcements", `status ${createRes.status}: ${JSON.stringify(createRes.body)}`);
  }

  if (annId) {
    const readRes = await api("GET", `/api/announcements/${annId}`);
    readRes.status === 200
      ? record("PASS", "GET    /api/announcements/[id]")
      : record("FAIL", "GET    /api/announcements/[id]", `status ${readRes.status}`);

    const patchRes = await api("PATCH", `/api/announcements/${annId}`, {
      priority: "high",
      title: `${MARKER} edited by smoke test`,
    });
    patchRes.status === 200 && patchRes.body?.priority === "high"
      ? record("PASS", "PATCH  /api/announcements/[id]", "priority low -> high")
      : record("FAIL", "PATCH  /api/announcements/[id]", `status ${patchRes.status}: ${JSON.stringify(patchRes.body)}`);

    // -----------------------------------------------------------------------
    section("3. FRESHNESS — an edit is immediately visible to the next reader");
    // This is the judged behaviour: edit in the dashboard, ask the agent, get
    // the new value. Here we prove the data layer half of it.

    const reread = await api("GET", `/api/announcements/${annId}`);
    if (reread.body?.priority === "high" && reread.body?.title?.includes("edited by smoke test")) {
      record("PASS", "Edit is visible on the very next read", "no cache, no restart");
    } else {
      record(
        "FAIL",
        "Edit is visible on the very next read",
        `read back ${JSON.stringify(reread.body)} — a cached route would do this`,
      );
    }

    const listAfterEdit = await api("GET", "/api/announcements?priority=high");
    Array.isArray(listAfterEdit.body) &&
    listAfterEdit.body.some((a: any) => a.id === annId)
      ? record("PASS", "Edited record appears in a filtered list")
      : record("FAIL", "Edited record appears in a filtered list", "filter did not pick up the edit");

    const delRes = await api("DELETE", `/api/announcements/${annId}`);
    delRes.status === 200
      ? record("PASS", "DELETE /api/announcements/[id]")
      : record("FAIL", "DELETE /api/announcements/[id]", `status ${delRes.status}`);

    const gone = await api("GET", `/api/announcements/${annId}`);
    gone.status === 404
      ? record("PASS", "Deleted record is really gone", "404 on re-read")
      : record("FAIL", "Deleted record is really gone", `status ${gone.status}, expected 404`);
  }

  // -------------------------------------------------------------------------
  section("4. ROOM SEARCH + BOOKING");

  const free = await api(
    "GET",
    "/api/rooms/free?date=2027-01-04&startTime=14:00&endTime=16:00&minCapacity=5&equipment=projector",
  );
  if (free.status === 200 && free.body?.count > 0) {
    record(
      "PASS",
      "GET    /api/rooms/free (5 people, projector, 14:00-16:00)",
      `${free.body.count} rooms, smallest is ${free.body.rooms[0]?.roomNumber} (${free.body.rooms[0]?.capacity})`,
    );
  } else {
    record("FAIL", "GET    /api/rooms/free", `status ${free.status}: ${JSON.stringify(free.body).slice(0, 160)}`);
  }

  // Book far in the future so we never collide with seeded bookings.
  const BOOK_DATE = "2027-01-04";
  const bookRes = await api("POST", "/api/rooms/7A02/book", {
    date: BOOK_DATE,
    startTime: "14:00",
    endTime: "16:00",
    bookedBy: MARKER,
    purpose: "smoke test",
  });

  let bookingId: string | null = null;

  if (bookRes.status === 201 && bookRes.body?.booking?.id) {
    bookingId = bookRes.body.booking.id;
    record("PASS", "POST   /api/rooms/7A02/book", `booking ${bookingId}`);
  } else {
    record("FAIL", "POST   /api/rooms/7A02/book", `status ${bookRes.status}: ${JSON.stringify(bookRes.body).slice(0, 200)}`);
  }

  if (bookingId) {
    const clash = await api("POST", "/api/rooms/7A02/book", {
      date: BOOK_DATE,
      startTime: "15:00",
      endTime: "17:00",
      bookedBy: `${MARKER} conflict`,
    });
    clash.status === 409 && clash.body?.conflictingBooking
      ? record("PASS", "Overlapping booking is rejected", "409 with the clashing booking attached")
      : record("FAIL", "Overlapping booking is rejected", `status ${clash.status}, expected 409`);

    const gap = await api("POST", "/api/rooms/7A02/book", {
      date: BOOK_DATE,
      startTime: "16:00",
      endTime: "17:00",
      bookedBy: `${MARKER} boundary`,
    });
    if (gap.status === 201) {
      record("PASS", "Back-to-back booking is allowed", "16:00 start against a 16:00 end");
      await api("DELETE", `/api/bookings/${gap.body.booking.id}`);
    } else {
      record("FAIL", "Back-to-back booking is allowed", `status ${gap.status}, expected 201`);
    }

    const cancel = await api("DELETE", `/api/bookings/${bookingId}`);
    cancel.status === 200
      ? record("PASS", "DELETE /api/bookings/[id]")
      : record("FAIL", "DELETE /api/bookings/[id]", `status ${cancel.status}`);
  }

  // -------------------------------------------------------------------------
  section("5. EVENT REGISTRATION");

  const events = await api("GET", "/api/events");
  const openEvent = Array.isArray(events.body)
    ? events.body.find((e: any) => e.registered < e.capacity)
    : null;

  if (!openEvent) {
    record("FAIL", "Find an event with a free seat", "every event is at capacity");
  } else {
    const before = openEvent.registered;
    const regRes = await api("POST", `/api/events/${openEvent.id}/register`, {
      studentName: `${MARKER} student`,
    });

    if (regRes.status === 201 && regRes.body?.event?.registered === before + 1) {
      record(
        "PASS",
        `POST   /api/events/[id]/register`,
        `"${openEvent.name}" ${before} -> ${regRes.body.event.registered} of ${openEvent.capacity}`,
      );

      const dupe = await api("POST", `/api/events/${openEvent.id}/register`, {
        studentName: `${MARKER} student`,
      });
      dupe.status === 409
        ? record("PASS", "Duplicate registration is rejected", "409")
        : record("FAIL", "Duplicate registration is rejected", `status ${dupe.status}, expected 409`);

      const unreg = await api("DELETE", `/api/registrations/${regRes.body.registration.id}`);
      unreg.status === 200 && unreg.body?.event?.registered === before
        ? record("PASS", "DELETE /api/registrations/[id]", `count restored to ${before}`)
        : record("FAIL", "DELETE /api/registrations/[id]", `status ${unreg.status}, count ${unreg.body?.event?.registered}`);
    } else {
      record("FAIL", "POST   /api/events/[id]/register", `status ${regRes.status}: ${JSON.stringify(regRes.body).slice(0, 200)}`);
    }
  }

  // -------------------------------------------------------------------------
  section("6. DASHBOARD PAGES (Person B)");

  const PAGES = [
    ["/", "landing"],
    ["/schedules", "schedules section"],
    ["/rooms", "rooms section"],
    ["/events", "events section"],
    ["/announcements", "announcements section"],
    ["/assignments", "assignments section"],
    ["/chat", "chat page"],
  ] as const;

  for (const [path, label] of PAGES) {
    const status = await page(path);
    if (status === 200) record("PASS", `GET ${path.padEnd(16)} ${label}`);
    else if (status === 404) record("PENDING", `GET ${path.padEnd(16)} ${label}`, "not built yet (404)");
    else record("FAIL", `GET ${path.padEnd(16)} ${label}`, `status ${status} — built but erroring`);
  }

  // -------------------------------------------------------------------------
  section("7. AGENT (Person C)");

  const chat = await api("POST", "/api/chat", {
    messages: [{ role: "user", content: "When is my next class?" }],
  });

  // Until app/api/chat/route.ts exists, /api/chat falls through to the generic
  // /api/[system] handler, which rejects "chat" as an unknown system. That is
  // "not built yet", not a break — the static route wins once C creates it.
  const chatNotBuiltYet =
    chat.status === 404 ||
    (chat.status === 400 &&
      typeof chat.body?.error === "string" &&
      chat.body.error.includes("Unknown system 'chat'"));

  if (chatNotBuiltYet) {
    record("PENDING", "POST   /api/chat", "not built yet");
  } else if (chat.status === 200) {
    const replied = typeof chat.body?.reply === "string" || typeof chat.body?.message === "string";
    replied
      ? record("PASS", "POST   /api/chat", "agent replied")
      : record("FAIL", "POST   /api/chat", `200 but no reply field: ${JSON.stringify(chat.body).slice(0, 160)}`);

    const steps = chat.body?.steps;
    if (Array.isArray(steps) && steps.length > 0) {
      record("PASS", "Agent used tools", `${steps.length} step(s): ${steps.map((s: any) => s.toolName ?? s.tool).join(", ")}`);
    } else {
      record(
        "FAIL",
        "Agent used tools",
        "no steps returned — a factual question must be answered through a tool call, not from memory",
      );
    }
  } else {
    record("FAIL", "POST   /api/chat", `status ${chat.status}: ${JSON.stringify(chat.body).slice(0, 200)}`);
  }

  // -------------------------------------------------------------------------
  section("SUMMARY");

  console.log(`  ${pass} passed   ${fail} failed   ${pending} not built yet\n`);

  if (failures.length > 0) {
    console.log("  Fix these:");
    failures.forEach((f) => console.log(`    - ${f}`));
    console.log("");
  }

  if (pending > 0) {
    console.log("  PENDING items are not failures — they are work that has not landed yet.");
    console.log("  A submission-ready run shows 0 failed and 0 not built yet.\n");
  }

  if (fail > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("\nSmoke test crashed:", error);
  process.exitCode = 1;
});
