// Singleton PrismaClient.
//
// Next.js dev mode hot-reloads modules on every edit. Without this guard each
// reload would construct a fresh PrismaClient, and after a dozen saves SQLite
// starts refusing connections. Stash the instance on globalThis so reloads
// reuse it. In production the module is evaluated once, so the guard is a no-op.
//
// Import this everywhere. Never call `new PrismaClient()` anywhere else.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

// ---------------------------------------------------------------------------
// Room.equipment helpers
// ---------------------------------------------------------------------------
// schema.md types Room.equipment as string[], but SQLite has no array column,
// so the column holds a JSON string like ["whiteboard","projector","AC"].
//
// Every read of Room.equipment must go through parseEquipment, and every write
// through serializeEquipment. Do not JSON.parse it inline — parseEquipment also
// survives legacy/hand-edited rows that hold a bare comma-separated string.

export function parseEquipment(value: string | null | undefined): string[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    // Not valid JSON — fall through to the comma-separated fallback below.
  }

  // Fallback: someone typed "projector, AC" straight into the DB or a form.
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function serializeEquipment(value: string[] | string | null | undefined): string {
  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => String(item).trim()).filter(Boolean));
  }
  // Accept a raw form value ("projector, AC") and normalise it to JSON.
  return JSON.stringify(parseEquipment(value));
}

/**
 * Case-insensitive "does this room have all of these?" check.
 * Used by room search — the seed mixes casing ("AC" vs "projector").
 */
export function hasAllEquipment(stored: string, required: string[]): boolean {
  if (required.length === 0) return true;
  const have = parseEquipment(stored).map((item) => item.toLowerCase());
  return required.every((item) => have.includes(item.trim().toLowerCase()));
}
