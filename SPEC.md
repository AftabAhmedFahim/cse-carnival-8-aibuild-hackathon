# CampusOS — Project Spec

What we are building, in one place. Commit this to the repo root. Claude Code / Antigravity should read this file plus `PROBLEM_STATEMENT.md` and `schema/schema.md` before writing anything.

> **Field names:** every field listed here is indicative. `schema/schema.md` is the source of truth. Where the two disagree, follow `schema.md`.

---

## The product

CampusOS is a university platform with two halves that share one database.

**The dashboard** is where campus data lives and gets managed — five systems (schedules, rooms, events, announcements, assignments), each fully viewable and editable. Someone changes a class time here and that change is immediately the truth for the whole app.

**The agent** is a chat interface a student talks to like a well-informed senior. It reads the same database through tool calls, answers questions across systems, and performs actions — booking a room, registering for an event. It never answers from memory or from a cached copy of the seed files.

The connective idea, and the thing judges will test: an edit made in the dashboard at 6:04 PM is reflected in the agent's answer at 6:05 PM, with no restart and no reseed.

---

## Architecture

```
Browser
  ├── /schedules /rooms /events /announcements /assignments   (dashboard)
  └── /chat                                                    (agent)
        │
        ▼
Next.js App Router
  ├── /api/[system]              generic CRUD, all five systems
  ├── /api/[system]/[id]         read / update / delete one
  ├── /api/rooms/free            availability search
  ├── /api/rooms/[id]/book       booking action
  ├── /api/events/[id]/register  registration action
  └── /api/chat                  agent tool-calling loop
        │
        ▼
Prisma ──► SQLite (dev.db)
        ▲
        └── seeded once from data/*.json at setup
```

One process, one database file, no external services. `data/*.json` is seed input only — after the first `npm run seed` it is never read again.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Prisma · SQLite · an LLM with native tool calling.

---

## Data model

Seven tables. Five come from the seed data, two exist because rooms and events need actions.

| Model | Fields (indicative) | Notes |
|---|---|---|
| `Schedule` | course, day, startTime, endTime, room, instructor | 24 seed records |
| `Room` | roomNumber, capacity, equipment[] | 20 rooms: 7A01–7A07, 7B01–7B08, 7C01–7C05 |
| `Event` | name, date, time, capacity | 7 seed records |
| `Announcement` | title, body, date, priority | 8 seed records, priority drives display |
| `Assignment` | course, title, deadline, status | 8 seed records |
| `Booking` | roomId, startTime, endTime, bookedBy | ours — no overlaps allowed per room |
| `Registration` | eventId, studentName | ours — blocked when event is at capacity |

`equipment` is a list on SQLite, so it's stored as a JSON string or comma-separated and parsed in the data layer. Matching against it is case-insensitive.

---

## Part 1 — The dashboard

Five sections, one per system, plus a chat page. Every section supports view, add, edit, delete. Rooms additionally support book and cancel; events support register and cancel.

**Built generically.** All five systems are the same CRUD shape, so we build one table component, one form modal, and one API handler, then drive them from a per-system field config. Five sections, five configs, one implementation. A second copy of the CRUD stack is a bug, not a feature.

**Two behaviours that carry the marks:**

1. *Immediate reflection.* Any add, edit, or delete appears in the interface with no manual refresh.
2. *Real persistence.* The change is written to SQLite. Reload the page, restart the server — it's still there. The JSON files never change.

---

## Part 2 — The agent

A real tool-calling loop: model call → execute the requested tool → append the result → call again, up to 6 iterations. Prompt chaining does not satisfy the brief.

**Tools**

| Tool | Purpose |
|---|---|
| `list_records(system, filters)` | read any of the five systems |
| `create_record` / `update_record` / `delete_record` | write to any system |
| `find_free_rooms(startTime, endTime, minCapacity, equipment)` | availability search across time, size, equipment |
| `book_room(roomId, startTime, endTime, bookedBy)` | create a booking, rejecting overlaps |
| `cancel_booking(bookingId)` | remove a booking |
| `register_event(eventId, studentName)` | register, rejecting at capacity |

Every tool hits the live database at call time.

**Behaviour rules, enforced in the system prompt**

- Always read through a tool. Never answer a campus question from memory or from earlier in the conversation.
- Ask when the request is underspecified. *"Just book me any room tomorrow afternoon"* produces a clarifying question, not a booking.
- Refuse administrative and destructive actions from chat: deleting announcements, editing the schedule, touching someone else's booking or registration. Those are dashboard-only.
- Today's date and current time are injected at request time so "tomorrow" and "this week" resolve correctly.
- Report actions precisely — which room, which time, which id.

**Visible trace.** Each reply carries an expandable list of the steps taken: tool name, arguments, result. This is what makes it read as an agent doing work rather than a chatbot guessing.

---

## Definition of done, mapped to the scoring

| Marks | Done means |
|---|---|
| Data Management (20) | All five systems seeded from `data/`, each with its own clearly labelled section |
| CRUD (20) | Add, edit, delete work on all five; changes survive a reload |
| Agent — answers (10) | Correct answers across systems, including ones needing two sources read together |
| Agent — actions (10) | Booking and registration complete and appear in the dashboard |
| Agent — freshness (10) | A dashboard edit is reflected in the very next agent answer |
| Agent — judgement (10) | Asks when vague; refuses what it shouldn't do |
| UI/UX (20) | Clear, consistent, empty and loading states everywhere, no console errors |

**Bonus:** live deployment, clean and readable code.

---

## Non-goals

Deliberately out of scope so nobody builds them:

- Authentication, login, user accounts, roles
- Multi-user sessions or real-time sync between browsers
- Docker, Postgres, or any external service
- Tests, CI, or a component library beyond Tailwind
- Notifications, email, calendar export
- Mobile app

---

## Judge-readiness

The judges clone the repo and run it. A project that doesn't start isn't judged, so the setup path matters as much as the features:

```bash
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

`.env.example` lists every variable the code actually reads. No real keys in the repo. The README covers project overview, tech stack, setup commands, environment variables, and example questions to ask the agent.

Any of us can be asked to explain any file. If a piece of generated code isn't understood by its owner, it gets rewritten simpler.
