// GET /api/rooms/free — availability search. Every query param is optional.
//
//   ?startTime=14:00&endTime=16:00   the window to be free in
//   ?date=2026-09-07                 which day (bookings are per-day)
//   ?minCapacity=5                   seats at least this many
//   ?equipment=projector,AC          must have all of these, case-insensitive
//   ?includeUnavailable=true         also return rooms marked unavailable
//
// Answers "I need a room for 5 people with a projector, tomorrow between 2 and 4".

import { findFreeRooms, toDate, toTime } from "@/lib/rooms";

import { badRequest, guard, ok } from "../../_lib/http";

export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "startTime",
  "endTime",
  "date",
  "minCapacity",
  "equipment",
  "includeUnavailable",
]);

export async function GET(request: Request) {
  return guard(async () => {
    const params = new URL(request.url).searchParams;

    for (const key of params.keys()) {
      if (!ALLOWED.has(key)) {
        return badRequest(
          `Unknown query param '${key}'. Allowed: ${[...ALLOWED].join(", ")}.`,
        );
      }
    }

    const rawStart = params.get("startTime");
    const rawEnd = params.get("endTime");
    const rawDate = params.get("date");
    const rawCapacity = params.get("minCapacity");

    // A half-open window is almost always a mistake, so say so rather than
    // silently ignoring the one value that was supplied.
    if ((rawStart && !rawEnd) || (!rawStart && rawEnd)) {
      return badRequest(
        "Provide both 'startTime' and 'endTime', or neither.",
      );
    }

    let startTime: string | undefined;
    let endTime: string | undefined;

    if (rawStart && rawEnd) {
      const start = toTime(rawStart);
      const end = toTime(rawEnd);

      if (!start) {
        return badRequest(
          `Query param 'startTime' must be a 24-hour time like "14:00", received "${rawStart}".`,
        );
      }
      if (!end) {
        return badRequest(
          `Query param 'endTime' must be a 24-hour time like "16:00", received "${rawEnd}".`,
        );
      }
      if (start >= end) {
        return badRequest(
          `'startTime' (${start}) must be earlier than 'endTime' (${end}).`,
        );
      }

      startTime = start;
      endTime = end;
    }

    let date: string | undefined;
    if (rawDate) {
      const parsed = toDate(rawDate);
      if (!parsed) {
        return badRequest(
          `Query param 'date' must look like "2026-09-07", received "${rawDate}".`,
        );
      }
      date = parsed;
    }

    let minCapacity: number | undefined;
    if (rawCapacity !== null) {
      const parsed = Number(rawCapacity);
      if (!Number.isInteger(parsed) || parsed < 0) {
        return badRequest(
          `Query param 'minCapacity' must be a non-negative integer, received "${rawCapacity}".`,
        );
      }
      minCapacity = parsed;
    }

    const equipment = (params.get("equipment") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const rooms = await findFreeRooms({
      startTime,
      endTime,
      date,
      minCapacity,
      equipment,
      includeUnavailable: params.get("includeUnavailable") === "true",
    });

    return ok({
      count: rooms.length,
      criteria: {
        startTime: startTime ?? null,
        endTime: endTime ?? null,
        date: date ?? null,
        minCapacity: minCapacity ?? null,
        equipment,
      },
      rooms,
    });
  });
}
