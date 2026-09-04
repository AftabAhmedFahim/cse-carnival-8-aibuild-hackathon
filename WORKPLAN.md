# CampusOS — Team Workplan

**Deadline: 8:30 PM today.** Repo is public already (fork visibility can't be changed — that's fine).

Each person owns one section below. The prompts are paste-ready for Claude Code or Antigravity. Run them in order inside your own section, and verify each step before moving to the next.

---

## Shared Contract — read this first, all three of you

**Stack (non-negotiable, don't re-litigate):**
- Next.js 14 App Router + TypeScript + Tailwind
- Prisma + SQLite (file DB, no Docker, no external services)
- Any LLM with tool calling — whoever has a working key decides

**The run command judges will use:**
```bash
npm install && npx prisma migrate dev --name init && npm run seed && npm run dev
```
If this ever breaks, everything stops until it works again.

**Git rules:**
- Everyone pushes to `main`. No branches, no PRs.
- `git pull --rebase` before you start and before every push.
- Commit every 15–20 minutes. Small commits.
- Only touch files inside your own directories.

**Directory ownership:**

| Person | Owns |
|---|---|
| A | `prisma/`, `scripts/seed.ts`, `app/api/**`, `lib/db.ts` |
| B | `app/page.tsx`, `app/(dashboard)/**`, `components/**` (except chat) |
| C | `lib/agent/**`, `app/api/chat/**`, `components/chat/**` |

**Scoring reality — memorize this:**
Data Management 20 + CRUD 20 + UI/UX 20 = **60 marks are the dashboard.** Agent = 40.
If we're behind, we cut agent scope, never CRUD scope.

---

## STEP 0 — All three together, 10 minutes, no splitting yet

Person A runs this while B and C watch the output. Nobody starts their own section until the schema is pushed.

```
Read schema/schema.md, README.md, PROBLEM_STATEMENT.md, sample_queries/sample_queries.md,
and all five JSON files in data/.

Then set up a Next.js 14 App Router + TypeScript + Tailwind project in this repo (keep the
existing markdown files and data/ folder intact). Add Prisma with SQLite.

Create prisma/schema.prisma with models: Schedule, Room, Event, Announcement, Assignment,
plus Booking (roomId, startTime, endTime, bookedBy) and Registration (eventId, studentName).

CRITICAL: field names and types must match schema/schema.md exactly. Where the JSON seed
data and schema.md disagree, follow schema.md and tell me about the mismatch.

Do NOT write API routes, UI, or the agent yet. Output the schema, run the migration, and
show me the model list so my team can code against it.
```

Once this is committed and pushed, B and C pull and start. From here everyone works in parallel.

---

## PERSON A — Data layer and API

You are the unblocker. B and C are stuck until your API exists, so ship endpoints before you polish anything.

### A1 — Seed script

```
Write scripts/seed.ts that loads all five JSON files from data/ into SQLite via Prisma,
and wire it as "npm run seed". It must be idempotent: clear the tables first, then insert,
so it can be run repeatedly without duplicating records.

If any JSON record doesn't match the Prisma schema, fix the mapping in the seed script —
do not change the schema.

Verify by running it and printing the row count for each table.
```

### A2 — Generic CRUD API

```
Build ONE generic CRUD API that serves all five systems. Do not write five copies of the
same route handler.

- app/api/[system]/route.ts        -> GET (list, with optional filter query params), POST (create)
- app/api/[system]/[id]/route.ts   -> GET (one), PATCH (update), DELETE

[system] is one of: schedules, rooms, events, announcements, assignments.
Use a single config map from system name -> Prisma model + allowed fields, and validate the
incoming body against it. Return 400 with a clear message on unknown system or bad field.

Then add the action endpoints:
- POST   /api/rooms/[id]/book          { startTime, endTime, bookedBy }
- DELETE /api/bookings/[id]
- POST   /api/events/[id]/register     { studentName }
- DELETE /api/registrations/[id]

Booking rules: reject if the room already has an overlapping booking (return 409 with the
conflicting booking). Registration rules: reject if the event is at capacity (409).

Also expose lib/db.ts exporting a singleton PrismaClient.

Write a short comment at the top of each file explaining what it does — we may be asked to
walk through any of this.
```

### A3 — The room-search query (do this before helping anyone else)

```
Add lib/rooms.ts exporting findFreeRooms({ startTime, endTime, minCapacity, equipment }).
It returns rooms that have no overlapping booking in that window, meet the capacity minimum,
and contain every item in the equipment array. Equipment matching must be case-insensitive.

Expose it at GET /api/rooms/free with those as query params.

This one function answers the hardest judged query, so test it directly with a few ranges
and show me the results.
```

### A4 — When your section is done
Help whoever is furthest behind. Do not start new features.

---

## PERSON B — Dashboard and UI (20 marks, plus half the "Data Management" 20)

The five systems are the same CRUD shape. Build the machinery once and configure it five times. If you find yourself writing a second table component, stop.

### B1 — Shell and generic table

```
Build the dashboard shell and a generic data table.

- app/layout.tsx: sidebar with five links (Schedules, Rooms, Events, Announcements,
  Assignments) plus a Chat link. Dark, clean, Tailwind. One accent color, generous spacing.
- components/DataTable.tsx: a generic table driven by a field config object
  ({ key, label, type }[]), with Edit and Delete buttons per row and an "Add new" button.
- components/EmptyState.tsx and a loading skeleton. Every list must handle empty and
  loading states.
- lib/configs.ts: the five per-system field configs (labels, input types, which fields are
  editable).

Then build app/(dashboard)/schedules/page.tsx using it, fetching from /api/schedules.
Show me that one working before we replicate.
```

### B2 — Generic form + the other four sections

```
Add components/RecordForm.tsx: a modal form generated from the same field config, used for
both create and edit. Support text, number, date, datetime, select, and textarea inputs.

Wire up the remaining four pages (rooms, events, announcements, assignments) from the configs.
Each page should be under 30 lines — all the work lives in the shared components.

All mutations must update the visible list immediately without a manual refresh (optimistic
update, then revalidate). Show a toast on success and on error.
```

### B3 — Room and event actions

```
On the rooms page: a "Book" button opening a form (start time, end time, booked by), showing
that room's existing bookings, and a cancel button on each. Handle the 409 conflict response
by showing the clash, not a generic error.

On the events page: a "Register" button with a name field, a visible registered/capacity
count, and the ability to cancel a registration. Handle the at-capacity 409 the same way.
```

### B4 — Polish pass (only after everything above works)

```
Polish pass, no new features: consistent spacing and typography, priority badges on
announcements (color-coded), overdue assignment deadlines in red, relative dates where
useful ("in 2 days"), and make sure it looks correct at 1280px and on mobile width.
```

---

## PERSON C — The AI agent (40 marks)

Tool calling is mandatory — the problem statement says prompt chaining doesn't count. Build the loop first, tools second, chat UI last.

### C1 — Tools and loop

```
Read sample_queries/sample_queries.md first — every tool must exist because a query in that
file needs it.

Build the agent in lib/agent/:

- tools.ts — tool definitions with JSON schemas, each one calling our own API or Prisma
  directly. At minimum:
    list_records(system, filters)      -- read any of the five systems
    create_record / update_record / delete_record(system, ...)
    find_free_rooms(startTime, endTime, minCapacity, equipment)   -- use lib/rooms.ts
    book_room(roomId, startTime, endTime, bookedBy)
    cancel_booking(bookingId)
    register_event(eventId, studentName)
  Every tool queries live data at call time. No caching, no snapshot of the seed JSON.

- loop.ts — real tool-calling loop: model call -> if tool_use, execute -> append result ->
  call again. Max 6 iterations. Persist every step (tool name, input, output) to an
  AgentStep table so we can display the trace.
  If a tool throws, feed the error back to the model, allow one retry, then report failure
  honestly. Never let it claim success it didn't achieve.

- app/api/chat/route.ts — POST { messages } -> runs the loop, returns the reply plus steps.

Show me it answering "when is my next class?" from the terminal before we build any UI.
```

### C2 — System prompt (10 marks live here)

```
Write lib/agent/prompt.ts with the system prompt. It must enforce:

1. ALWAYS call a tool to read data. Never answer a factual campus question from memory or
   from the conversation history.
2. If a booking or registration request is missing the room, the date, or the time range,
   ASK a clarifying question instead of calling a tool. Specifically: "book me any room
   tomorrow afternoon" must produce a question, not a booking.
3. REFUSE destructive or administrative actions from chat: deleting announcements, editing
   or cancelling other people's bookings, changing another student's registration, editing
   the schedule. Explain that these are dashboard-only admin actions.
4. State today's date and the current time in the prompt, computed at request time, so
   "tomorrow" and "this week" resolve correctly.
5. When reporting a completed action, state exactly what changed (room, time, id).

Then run every query in sample_queries.md against it and show me the output for each.
```

### C3 — Chat UI with visible trace

```
Build components/chat/ChatPanel.tsx at /chat: message list, input, streaming or
progressive display, and an expandable "agent steps" trace under each reply showing which
tools ran with what arguments and what came back.

That visible trace is what makes it read as an agent rather than a chatbot — make it clear
and compact, not a raw JSON dump.
```

---

## INTEGRATION CHECKPOINT — all three, 15 minutes

Stop coding. One person drives, everyone watches:

1. Fresh clone into a new folder. Run the four commands from the README. Anything that fails gets fixed now.
2. Edit an announcement in the dashboard. Then ask the agent about it. The agent must reflect the change.
3. Ask the agent to book a room. Confirm the booking appears in the dashboard.
4. Run every query in `sample_queries.md`. Note failures, fix the top three, ignore the rest.

---

## FINAL 75 MINUTES — feature freeze

**No new features after this point. Whoever adds one is the reason we lose marks.**

- [ ] Person A: `.env.example` lists every variable actually read in the code. No real keys committed. `git log -p | grep -i "sk-"` to be sure.
- [ ] Person B: every page handles empty and loading states; no console errors; no broken layout.
- [ ] Person C: all sample queries re-tested after the final merge.
- [ ] Person A writes README.md to the exact SUBMISSION.md spec:
  1. Project overview (one paragraph)
  2. Tech stack (languages, frameworks, LLM, database)
  3. Setup instructions (exact commands)
  4. Environment variables (reference `.env.example`)
  5. How to use the agent (example questions to ask)
- [ ] Test the README on a fresh clone one final time.
- [ ] Repo is public.
- [ ] **Submit the Google Form 20 minutes before 8:30.** Improve afterward only if the link is already in.

---

## Cut list — drop in this order if behind

1. Chat step-trace UI (keep the loop, drop the visualization)
2. Polish pass
3. Event registration cancel
4. `find_free_rooms` equipment filtering (keep time + capacity)
5. Agent create/update/delete tools (keep read + book + register)

**Never cut:** the five dashboard sections, add/edit/delete on all five, persistence after reload, README accuracy.
