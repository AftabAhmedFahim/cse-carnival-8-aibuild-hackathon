// The single config map that drives the generic CRUD API for all five systems.
//
// Adding a field to a system means editing the table below and nothing else --
// list, create, read, update, delete and filtering all read from here.
// Field names and types mirror prisma/schema.prisma exactly (which in turn
// mirrors schema/schema.md).

import { prisma, parseEquipment, serializeEquipment } from "@/lib/db";

// ---------------------------------------------------------------------------
// Field specifications
// ---------------------------------------------------------------------------

export type FieldType = "string" | "int" | "equipment";

export interface FieldSpec {
  type: FieldType;
  /** Must be present in a POST (create) body. PATCH is always partial. */
  required: boolean;
  /** Closed set of allowed values, matched case-insensitively and normalised. */
  enumValues?: readonly string[];
  /** Format check applied to string fields. */
  format?: "time" | "date";
}

export interface SystemConfig {
  /** Key on the Prisma client, e.g. prisma.schedule */
  model: "schedule" | "room" | "event" | "announcement" | "assignment";
  /** Human label used in error messages. */
  singular: string;
  fields: Record<string, FieldSpec>;
  /** Fields that `?search=` looks through with a case-insensitive contains. */
  searchFields: readonly string[];
  /** Relations pulled into every response so the dashboard needs one request. */
  include?: Record<string, boolean>;
  /** Default database ordering. */
  orderBy?: Record<string, "asc" | "desc">[];
}

const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/; // "9:00" or "09:00" or "23:59"
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

// ---------------------------------------------------------------------------
// THE CONFIG MAP
// ---------------------------------------------------------------------------

export const SYSTEMS: Record<string, SystemConfig> = {
  schedules: {
    model: "schedule",
    singular: "schedule",
    fields: {
      course: { type: "string", required: true },
      title: { type: "string", required: true },
      day: { type: "string", required: true, enumValues: DAYS },
      startTime: { type: "string", required: true, format: "time" },
      endTime: { type: "string", required: true, format: "time" },
      room: { type: "string", required: true },
      instructor: { type: "string", required: true },
      section: { type: "string", required: true },
    },
    searchFields: ["course", "title", "instructor", "room", "section"],
    orderBy: [{ startTime: "asc" }],
  },

  rooms: {
    model: "room",
    singular: "room",
    fields: {
      roomNumber: { type: "string", required: true },
      type: {
        type: "string",
        required: true,
        enumValues: ["classroom", "lab", "seminar"],
      },
      capacity: { type: "int", required: true },
      equipment: { type: "equipment", required: false },
      floor: { type: "int", required: true },
      status: {
        type: "string",
        required: false,
        enumValues: ["available", "unavailable"],
      },
    },
    searchFields: ["roomNumber", "type"],
    include: { bookings: true },
    orderBy: [{ roomNumber: "asc" }],
  },

  events: {
    model: "event",
    singular: "event",
    fields: {
      name: { type: "string", required: true },
      description: { type: "string", required: true },
      date: { type: "string", required: true, format: "date" },
      startTime: { type: "string", required: true, format: "time" },
      endTime: { type: "string", required: true, format: "time" },
      endDate: { type: "string", required: false, format: "date" },
      venue: { type: "string", required: true },
      organizer: { type: "string", required: true },
      capacity: { type: "int", required: true },
      registered: { type: "int", required: false },
      status: {
        type: "string",
        required: false,
        enumValues: ["upcoming", "ongoing", "completed", "cancelled", "full"],
      },
    },
    searchFields: ["name", "description", "organizer", "venue"],
    include: { registrations: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  },

  announcements: {
    model: "announcement",
    singular: "announcement",
    fields: {
      title: { type: "string", required: true },
      body: { type: "string", required: true },
      date: { type: "string", required: true, format: "date" },
      priority: {
        type: "string",
        required: true,
        enumValues: ["high", "medium", "low"],
      },
      postedBy: { type: "string", required: true },
      expires: { type: "string", required: false, format: "date" },
    },
    searchFields: ["title", "body", "postedBy"],
    orderBy: [{ date: "desc" }],
  },

  assignments: {
    model: "assignment",
    singular: "assignment",
    fields: {
      course: { type: "string", required: true },
      courseTitle: { type: "string", required: true },
      title: { type: "string", required: true },
      description: { type: "string", required: true },
      assignedDate: { type: "string", required: true, format: "date" },
      deadline: { type: "string", required: true, format: "date" },
      submissionPlatform: { type: "string", required: true },
      status: {
        type: "string",
        required: false,
        enumValues: ["pending", "submitted", "graded", "late"],
      },
      marks: { type: "int", required: true },
    },
    searchFields: ["course", "courseTitle", "title", "description"],
    orderBy: [{ deadline: "asc" }],
  },
};

export const SYSTEM_NAMES = Object.keys(SYSTEMS);

export function getSystem(name: string): SystemConfig | undefined {
  return SYSTEMS[name];
}

/**
 * Prisma delegates are structurally identical for the operations we use, but
 * TypeScript cannot infer which one a runtime string selects. This is the one
 * place we widen the type, so the route handlers stay clean.
 */
export interface ModelDelegate {
  findMany(args?: unknown): Promise<Record<string, unknown>[]>;
  findUnique(args: unknown): Promise<Record<string, unknown> | null>;
  create(args: unknown): Promise<Record<string, unknown>>;
  update(args: unknown): Promise<Record<string, unknown>>;
  delete(args: unknown): Promise<Record<string, unknown>>;
  count(args?: unknown): Promise<number>;
}

export function delegateFor(config: SystemConfig): ModelDelegate {
  return (prisma as unknown as Record<string, ModelDelegate>)[config.model];
}

// ---------------------------------------------------------------------------
// Normalising input
// ---------------------------------------------------------------------------

/** "9:00" -> "09:00", "2026-09-07T15:00" -> "15:00". Returns null if unusable. */
export function normalizeTime(value: string): string | null {
  const trimmed = value.trim();

  // Accept a full ISO datetime and keep just the clock part.
  const isoMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}[T ](\d{1,2}:\d{2})/);
  const candidate = isoMatch ? isoMatch[1] : trimmed;

  const match = candidate.match(TIME_PATTERN);
  if (!match) return null;

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

/** "2026-09-07T15:00" -> "2026-09-07". Returns null if unusable. */
export function normalizeDate(value: string): string | null {
  const trimmed = value.trim();
  const datePart = trimmed.split(/[T ]/)[0];
  return DATE_PATTERN.test(datePart) ? datePart : null;
}

export interface ValidationResult {
  ok: boolean;
  /** Prisma-ready data, with equipment already serialised. */
  data: Record<string, unknown>;
  error?: string;
}

/**
 * Validate a create/update body against a system config.
 *
 * `mode: "create"` enforces required fields; `mode: "update"` accepts any
 * subset. Unknown fields are always rejected by name.
 */
export function validateBody(
  config: SystemConfig,
  systemName: string,
  body: Record<string, unknown>,
  mode: "create" | "update",
): ValidationResult {
  const allowed = Object.keys(config.fields);
  const data: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(body)) {
    // `id` is accepted on create so seed-style ids ("evt-008") can be supplied,
    // and ignored on update (primary key cannot change and is in the route URL).
    if (key === "id") {
      if (mode === "update") {
        continue;
      }
      if (typeof rawValue !== "string" || rawValue.trim() === "") {
        return { ok: false, data, error: "Field 'id' must be a non-empty string." };
      }
      data.id = rawValue.trim();
      continue;
    }

    // Ignore relation arrays or metadata fields during update
    if (mode === "update" && (key === "bookings" || key === "registrations" || key === "createdAt" || key === "created_at")) {
      continue;
    }

    const spec = config.fields[key];
    if (!spec) {
      return {
        ok: false,
        data,
        error: `Unknown field '${key}' for system '${systemName}'. Allowed fields: ${allowed.join(", ")}.`,
      };
    }

    if (rawValue === null || rawValue === undefined) {
      return {
        ok: false,
        data,
        error: `Field '${key}' cannot be null.`,
      };
    }

    // --- int -------------------------------------------------------------
    if (spec.type === "int") {
      const num =
        typeof rawValue === "number"
          ? rawValue
          : typeof rawValue === "string" && rawValue.trim() !== ""
            ? Number(rawValue)
            : NaN;

      if (!Number.isFinite(num) || !Number.isInteger(num)) {
        return {
          ok: false,
          data,
          error: `Field '${key}' must be an integer, received ${JSON.stringify(rawValue)}.`,
        };
      }
      if (num < 0) {
        return { ok: false, data, error: `Field '${key}' cannot be negative.` };
      }
      data[key] = num;
      continue;
    }

    // --- equipment (string[] stored as a JSON string) ---------------------
    if (spec.type === "equipment") {
      if (Array.isArray(rawValue)) {
        if (!rawValue.every((item) => typeof item === "string")) {
          return {
            ok: false,
            data,
            error: `Field '${key}' must be an array of strings.`,
          };
        }
        data[key] = serializeEquipment(rawValue as string[]);
      } else if (typeof rawValue === "string") {
        // Accept "projector, AC" straight from a text input.
        data[key] = serializeEquipment(rawValue);
      } else {
        return {
          ok: false,
          data,
          error: `Field '${key}' must be an array of strings or a comma-separated string.`,
        };
      }
      continue;
    }

    // --- string ----------------------------------------------------------
    if (typeof rawValue !== "string") {
      return {
        ok: false,
        data,
        error: `Field '${key}' must be a string, received ${typeof rawValue}.`,
      };
    }

    let value = rawValue.trim();

    if (value === "") {
      return { ok: false, data, error: `Field '${key}' cannot be empty.` };
    }

    if (spec.format === "time") {
      const normalized = normalizeTime(value);
      if (!normalized) {
        return {
          ok: false,
          data,
          error: `Field '${key}' must be a 24-hour time like "14:30", received ${JSON.stringify(rawValue)}.`,
        };
      }
      value = normalized;
    }

    if (spec.format === "date") {
      const normalized = normalizeDate(value);
      if (!normalized) {
        return {
          ok: false,
          data,
          error: `Field '${key}' must be a date like "2026-09-07", received ${JSON.stringify(rawValue)}.`,
        };
      }
      value = normalized;
    }

    if (spec.enumValues) {
      const match = spec.enumValues.find(
        (option) => option.toLowerCase() === value.toLowerCase(),
      );
      if (!match) {
        return {
          ok: false,
          data,
          error: `Field '${key}' must be one of: ${spec.enumValues.join(", ")}. Received ${JSON.stringify(rawValue)}.`,
        };
      }
      value = match; // normalise casing to the canonical form
    }

    data[key] = value;
  }

  if (mode === "create") {
    const missing = allowed.filter(
      (field) => config.fields[field].required && data[field] === undefined,
    );
    if (missing.length > 0) {
      return {
        ok: false,
        data,
        error: `Missing required field${missing.length > 1 ? "s" : ""} for ${config.singular}: ${missing.join(", ")}.`,
      };
    }
  }

  if (mode === "update" && Object.keys(data).length === 0) {
    return {
      ok: false,
      data,
      error: "Request body contained no updatable fields.",
    };
  }

  return { ok: true, data };
}

/** Fill in sensible defaults so optional columns that are NOT NULL still work. */
export function applyCreateDefaults(
  systemName: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const withDefaults = { ...data };

  if (systemName === "rooms") {
    if (withDefaults.equipment === undefined) withDefaults.equipment = "[]";
    if (withDefaults.status === undefined) withDefaults.status = "available";
  }

  if (systemName === "events") {
    // Single-day events repeat the start date, per schema.md.
    if (withDefaults.endDate === undefined) withDefaults.endDate = withDefaults.date;
    if (withDefaults.registered === undefined) withDefaults.registered = 0;
    if (withDefaults.status === undefined) withDefaults.status = "upcoming";
  }

  if (systemName === "announcements") {
    if (withDefaults.expires === undefined) withDefaults.expires = withDefaults.date;
  }

  if (systemName === "assignments") {
    if (withDefaults.status === undefined) withDefaults.status = "pending";
  }

  return withDefaults;
}

// ---------------------------------------------------------------------------
// Shaping output
// ---------------------------------------------------------------------------

/**
 * Convert a database row into the JSON the dashboard and agent consume.
 * The important part is Room.equipment: it lives in SQLite as a JSON string and
 * must always leave the API as a real array.
 */
export function serializeRecord(
  systemName: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  if (systemName !== "rooms") return row;

  return {
    ...row,
    equipment: parseEquipment(row.equipment as string),
  };
}

export function serializeRecords(
  systemName: string,
  rows: Record<string, unknown>[],
): Record<string, unknown>[] {
  return rows.map((row) => serializeRecord(systemName, row));
}

/**
 * Schedules sort Sunday -> Thursday, which is neither alphabetical nor
 * something SQLite can express, so it happens here after the query.
 */
export function postSort(
  systemName: string,
  rows: Record<string, unknown>[],
): Record<string, unknown>[] {
  if (systemName !== "schedules") return rows;

  const dayOrder = new Map<string, number>(
    DAYS.map((day, index) => [day as string, index]),
  );

  return [...rows].sort((a, b) => {
    const dayA = dayOrder.get(a.day as string) ?? 99;
    const dayB = dayOrder.get(b.day as string) ?? 99;
    if (dayA !== dayB) return dayA - dayB;
    return String(a.startTime).localeCompare(String(b.startTime));
  });
}
