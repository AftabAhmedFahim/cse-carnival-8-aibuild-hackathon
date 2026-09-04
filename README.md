# CampusOS — AI Build Hackathon

An intelligent university platform powered by an AI agent that understands and acts on real-time campus data.

---

## Running CampusOS locally

Requires **Node.js 18.18 or newer** (developed on Node 24). Nothing else — no Docker, no database server, no `.env`.

```bash
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Then open **http://localhost:3000**.

That is the whole setup. `npm install` generates the Prisma client, `migrate` creates the SQLite database at `prisma/dev.db`, and `seed` loads the five `data/*.json` files into it.

`npm run seed` is idempotent — it clears every table before inserting, so you can re-run it at any time to reset the database to the shipped seed data. A correct run prints:

```
  Table            Rows   Expected
  ------------------------------------
  schedules         24         24
  rooms             20         20
  events             7          7
  announcements      8          8
  assignments        8          8
```

The JSON files in `data/` are **seed input only**. Once seeded, every read and write goes to SQLite — edits made in the dashboard persist across reloads and restarts, and the JSON files never change.

### Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| Database | SQLite via Prisma 5 (`prisma/dev.db`) |
| LLM | Any provider with native tool calling — see `.env.example` |

### Environment variables

**None are required to run the dashboard or the API.** A fresh clone runs the four commands above with no `.env` file at all, because `prisma/schema.prisma` hardcodes the SQLite path rather than reading `DATABASE_URL`.

To talk to the AI agent, copy `.env.example` to `.env` and set your LLM key:

```bash
cp .env.example .env
```

See [`.env.example`](./.env.example) for the full list and what reads each one. No real keys are committed to this repository.

### API reference

All five systems share one generic handler, so every endpoint below behaves identically across `schedules`, `rooms`, `events`, `announcements` and `assignments`.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/[system]` | List, with filters (below) |
| `POST` | `/api/[system]` | Create |
| `GET` | `/api/[system]/[id]` | Read one |
| `PATCH` | `/api/[system]/[id]` | Update (partial) |
| `DELETE` | `/api/[system]/[id]` | Delete |
| `GET` | `/api/rooms/free` | Rooms free in a window, by capacity and equipment |
| `POST` | `/api/rooms/[id]/book` | Book a room — `409` on an overlap |
| `GET` | `/api/rooms/[id]/bookings` | Bookings on one room |
| `DELETE` | `/api/bookings/[id]` | Cancel a booking |
| `POST` | `/api/events/[id]/register` | Register — `409` when at capacity |
| `GET` | `/api/events/[id]/registrations` | Registrations for one event |
| `DELETE` | `/api/registrations/[id]` | Cancel a registration |

List filters: `?field=value` exact match, `?field_gte=` / `_lte` / `_gt` / `_lt` / `_contains`, `?search=text` across the system's text fields, `?equipment=projector,AC` on rooms, plus `?sort=`, `?order=`, `?limit=`. An unrecognised system or field returns `400` naming the problem.

```bash
# a few worked examples
curl "http://localhost:3000/api/schedules?day=Sunday"
curl "http://localhost:3000/api/announcements?priority=high"
curl "http://localhost:3000/api/rooms?type=lab&capacity_gte=30&equipment=projector"
curl "http://localhost:3000/api/rooms/free?date=2026-09-05&startTime=14:00&endTime=16:00&minCapacity=5&equipment=projector"
```

Two things worth knowing when reading the data:

- **`Room.equipment`** is stored as a JSON string (SQLite has no array type) but the API always returns it as a real array. Matching is case-insensitive.
- **`Event.registered`** is the authoritative headcount and is deliberately larger than `registrations.length` — the seed includes anonymous registrations. Capacity checks use `registered`.

---

## The Challenge

Students struggle daily with scattered campus information — class changes buried in group chats, deadlines forgotten until the last minute, no easy way to know what's happening on campus right now.

Your job: build **CampusOS** — a two-part app with a data dashboard and an AI agent that always reads live data.

Read the full problem statement → [`PROBLEM_STATEMENT.md`](./PROBLEM_STATEMENT.md)

---

## Repository Structure

```
campusos-hackathon/
│
├── README.md                    ← You are here
├── PROBLEM_STATEMENT.md         ← Full problem statement + scoring
├── SUBMISSION.md                ← How and where to submit
│
├── data/                        ← Seed data (load these into your backend)
│   ├── schedules.json
│   ├── rooms.json
│   ├── events.json
│   ├── announcements.json
│   └── assignments.json
│
├── schema/
│   └── schema.md                ← Field names, types, and constraints for all 5 systems
│
└── sample_queries/
    └── sample_queries.md        ← Queries we will use when judging your agent
```

---

## How to Participate

### 1. Fork the repository

Click **Fork** in the top-right corner of this repo's GitHub page. This creates your own copy under your GitHub account, where you'll build your solution.

### 2. Clone your fork

```bash
git clone https://github.com/YOUR_USERNAME/campusos-hackathon.git
cd campusos-hackathon
```

### 3. Build your solution inside your fork

> Your solution lives in your fork — do not open a pull request to this repo.

### 4. Making your fork private

By default, a fork is public. If you want to keep your work hidden from other participants while you build:

1. Go to your fork on GitHub
2. Open **Settings** (top of the repo page)
3. Scroll to the **Danger Zone** at the bottom
4. Click **Change repository visibility** → **Make private**
5. Confirm by typing the repository name

> **You may keep your fork private during the hackathon period, but it must be switched back to public by 8:30 PM on the submission deadline.** Repositories still private after that time will not be judged. To make it public again, repeat the steps above and choose **Make public** instead.

### 5. Submit

Submit your fork's public URL via the instructions in [`SUBMISSION.md`](./SUBMISSION.md).

---

## Quick Links

| Resource | Link |
|----------|------|
| Full problem statement | [`PROBLEM_STATEMENT.md`](./PROBLEM_STATEMENT.md) |
| Data schema | [`schema/schema.md`](./schema/schema.md) |
| Sample agent queries | [`sample_queries/sample_queries.md`](./sample_queries/sample_queries.md) |
| Submission guide | [`SUBMISSION.md`](./SUBMISSION.md) |

---

## Seed Data Overview

| File | Records | What It Contains |
|------|---------|-----------------|
| `schedules.json` | 24 | Class timetable — course, day, time, room, instructor |
| `rooms.json` | 20 | Rooms 7A01–7A07, 7B01–7B08, 7C01–7C05 with equipment and bookings |
| `events.json` | 7 | Campus events with registration lists |
| `announcements.json` | 8 | Notices with priority levels and expiry dates |
| `assignments.json` | 8 | Course assignments with deadlines and submission status |

> **Important:** These JSON files are only the starting/seed data — not the database itself. Load them into a real backend (a database, or at minimum a backend service with persistent storage) on app startup. Your dashboard and AI agent must both read from and write to that backend, not the static JSON files directly. If you add, edit, or delete a record, the change must be saved in your backend and still be there after a reload — the JSON files in this repo will not update. The agent is also expected to always query the current backend state, not a cached or hardcoded copy of the seed data.

---

Good luck. Build something that actually works.
