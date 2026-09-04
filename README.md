# CampusOS

An intelligent university platform: a full campus data dashboard with an AI agent on top that reads and acts on live data.

Built for the AI Build Hackathon, AUST CSE Carnival 8.

---

## Project overview

CampusOS brings a student's scattered campus information — class schedules, rooms, events, announcements and assignment deadlines — into one place, and puts an AI agent on top of it that reads and acts on that data live. The five `data/*.json` files are loaded once into a SQLite database through Prisma; from that point the database is the single source of truth and the JSON files are never read again. Each of the five systems has its own dashboard section supporting add, edit and delete through one generic CRUD API, with rooms additionally bookable and events registerable, and every change written straight to SQLite so it survives a reload or a restart. The AI agent talks to that same database through real tool calls — looking records up, searching for a free room by time, size and equipment, booking it, registering a student — and because every tool queries at call time rather than from a cached copy, an edit made in the dashboard is reflected in the agent's very next answer.

---

## Setup

Requires **Node.js 18.18 or newer** (developed on Node 24). No Docker, no database server.

```bash
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Open **http://localhost:3000**.

`npm install` generates the Prisma client, `migrate` creates the SQLite database at `prisma/dev.db`, and `seed` loads the five `data/*.json` files into it.

The dashboard and the CRUD API work immediately with no configuration. **The AI agent needs a Gemini API key** — see Environment variables below.

A correct seed run prints:

```
  Table            Rows   Expected
  ------------------------------------
  schedules         24         24
  rooms             20         20
  events             7          7
  announcements      8          8
  assignments        8          8
```

`npm run seed` is idempotent — it clears every table before inserting, so it can be re-run at any time to reset the database to the shipped seed data.

---

## Environment variables

Copy the example file and add your key:

```bash
cp .env.example .env
```

| Key | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_API_KEY` | For the agent | — | Google AI Studio API key (`GEMINI_API_KEY` also accepted) |
| `GEMINI_MODEL` | No | `gemini-3.5-flash` | Primary model, with automatic fallback to `gemini-flash-latest`, `gemini-3.6-flash`, `gemini-3.7-flash` |

The dashboard, CRUD, booking and registration all work without a key. Only the chat agent requires one. No real keys are committed to this repository.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Database | SQLite via Prisma 5 (`prisma/dev.db`) |
| LLM | Google Gemini via the `@google/genai` SDK, with native function calling |
| Styling | Tailwind CSS — black theme, Inter, pill controls |

---

## How to use the agent

Go to **http://localhost:3000/chat**. The agent answers from live database state and performs real actions. Things to try:

**Lookups**
- "When is my next class?"
- "What classes do I have on Wednesday?"
- "What assignments are due this week?"
- "Show me all high priority announcements."

**Cross-system reasoning**
- "I'm free until 2 PM — is there anything on campus I could drop into?"

**Search and actions**
- "I need a room for 5 people with a projector, tomorrow between 2 and 4."
- "Book Room 7A02 tomorrow from 3 PM to 5 PM."
- "Register me for the Guest Lecture on Deep Learning."

**Judgement**
- "Just book me any room tomorrow afternoon." — underspecified, so the agent asks which room and time rather than booking something.
- "Delete the exam routine announcement." — an administrative action, so the agent refuses and points to the dashboard.

Every reply carries an expandable trace showing which tools ran, with what arguments, and what came back.

**To see live data flow:** edit an announcement in the dashboard, then ask the agent about it. The change appears in the very next answer, with no restart or reseed.

---

## What's in it

**Dashboard** — five sections (schedules, rooms, events, announcements, assignments), each with add, edit and delete. Changes appear immediately and persist to SQLite. Rooms can be booked and bookings cancelled, with overlapping bookings rejected. Events can be registered for and registrations cancelled, with at-capacity registration rejected.

**Agent** — a real tool-calling loop (model call → execute tool → feed result back → repeat, capped at six iterations). Tools cover reading any system, creating, updating and deleting records, searching free rooms by time/capacity/equipment, booking, cancelling and registering. Failed tool calls are reported honestly rather than papered over.

---

## API reference

All five systems share one generic handler, so every endpoint below behaves identically across `schedules`, `rooms`, `events`, `announcements` and `assignments`.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/[system]` | List, with filters |
| `POST` | `/api/[system]` | Create |
| `GET` | `/api/[system]/[id]` | Read one |
| `PATCH` | `/api/[system]/[id]` | Update (partial) |
| `DELETE` | `/api/[system]/[id]` | Delete |
| `GET` | `/api/rooms/free` | Rooms free in a window, by capacity and equipment |
| `POST` | `/api/rooms/[id]/book` | Book a room — `409` on overlap |
| `GET` | `/api/rooms/[id]/bookings` | Bookings on one room |
| `DELETE` | `/api/bookings/[id]` | Cancel a booking |
| `POST` | `/api/events/[id]/register` | Register — `409` when at capacity |
| `GET` | `/api/events/[id]/registrations` | Registrations for one event |
| `DELETE` | `/api/registrations/[id]` | Cancel a registration |

List filters: `?field=value` exact match, `?field_gte=` / `_lte` / `_gt` / `_lt` / `_contains`, `?search=text` across text fields, `?equipment=projector,AC` on rooms, plus `?sort=`, `?order=`, `?limit=`. An unrecognised system or field returns `400` naming the problem.

```bash
curl "http://localhost:3000/api/schedules?day=Sunday"
curl "http://localhost:3000/api/announcements?priority=high"
curl "http://localhost:3000/api/rooms?type=lab&capacity_gte=30&equipment=projector"
curl "http://localhost:3000/api/rooms/free?date=2026-09-05&startTime=14:00&endTime=16:00&minCapacity=5&equipment=projector"
```

Two notes on the data:

- **`Room.equipment`** is stored as a JSON string (SQLite has no array type) but the API always returns a real array. Matching is case-insensitive.
- **`Event.registered`** is the authoritative headcount and is deliberately larger than `registrations.length` — the seed includes anonymous registrations. Capacity checks use `registered`.

---

## Testing

With the dev server running in another terminal:

```bash
npm run smoke
```

This exercises data loading, a full CRUD round-trip, live-edit freshness, room search, booking conflicts and event registration, then cleans up everything it created. Safe to re-run.

---

## Project structure

```
app/
  (dashboard)/        five system pages + chat
  api/
    [system]/         generic CRUD for all five systems
    rooms/            availability search, booking
    events/           registration
    chat/             agent endpoint
components/           DataTable, RecordForm, modals, chat panel
lib/
  db.ts               Prisma singleton
  rooms.ts            availability logic
  agent/              tools, loop, system prompt
prisma/schema.prisma  seven models
scripts/
  seed.ts             loads data/*.json into SQLite
  smoke.ts            end-to-end checks
data/                 seed input, read once at seed time
```

---

## Scope notes

Authentication is deliberately out of scope — the app runs as a single logged-in student, which is what the brief's queries ("my next class", "what do I have due") assume. The problem statement's five systems, CRUD, and agent behaviour were the priorities.