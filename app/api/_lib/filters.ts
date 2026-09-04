// Turns GET query params into a Prisma `where` clause for the generic list route.
//
// Supported shapes, where <field> is any field in the system's config:
//   ?<field>=value            exact match            ?day=Sunday
//   ?<field>_contains=value   substring match        ?title_contains=lab
//   ?<field>_gte=value        >=  (also _lte _gt _lt) ?capacity_gte=30
//   ?search=text              contains, across the system's searchFields
//   ?equipment=a,b            rooms only, every item must be present
//   ?sort=field&order=asc|desc
//   ?limit=n
//
// Anything else is rejected by name so a typo fails loudly instead of silently
// returning the whole table.

import type { SystemConfig } from "./systems";
import { normalizeDate, normalizeTime } from "./systems";

const RESERVED = new Set(["search", "limit", "sort", "order"]);

const OPERATORS: Record<string, string> = {
  _contains: "contains",
  _gte: "gte",
  _lte: "lte",
  _gt: "gt",
  _lt: "lt",
};

export interface ParsedQuery {
  ok: boolean;
  error?: string;
  where: Record<string, unknown>;
  orderBy?: Record<string, "asc" | "desc">[];
  take?: number;
  /** Rooms only: equipment names that must all be present (post-filtered). */
  equipmentFilter: string[];
}

function coerce(
  config: SystemConfig,
  field: string,
  raw: string,
): { ok: true; value: string | number } | { ok: false; error: string } {
  const spec = config.fields[field];

  if (spec.type === "int") {
    const num = Number(raw);
    if (!Number.isFinite(num)) {
      return {
        ok: false,
        error: `Filter '${field}' must be a number, received "${raw}".`,
      };
    }
    return { ok: true, value: num };
  }

  if (spec.format === "time") {
    const normalized = normalizeTime(raw);
    if (!normalized) {
      return {
        ok: false,
        error: `Filter '${field}' must be a 24-hour time like "14:30", received "${raw}".`,
      };
    }
    return { ok: true, value: normalized };
  }

  if (spec.format === "date") {
    const normalized = normalizeDate(raw);
    if (!normalized) {
      return {
        ok: false,
        error: `Filter '${field}' must be a date like "2026-09-07", received "${raw}".`,
      };
    }
    return { ok: true, value: normalized };
  }

  return { ok: true, value: raw };
}

export function parseQuery(
  config: SystemConfig,
  systemName: string,
  params: URLSearchParams,
): ParsedQuery {
  const where: Record<string, unknown> = {};
  const result: ParsedQuery = { ok: true, where, equipmentFilter: [] };
  const allowed = Object.keys(config.fields);

  for (const [key, rawValue] of params.entries()) {
    if (RESERVED.has(key)) continue;

    // Rooms store equipment as a JSON string, so it cannot be filtered in SQL.
    // Collect the requested items and let the route post-filter them.
    if (key === "equipment" && systemName === "rooms") {
      result.equipmentFilter = rawValue
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      continue;
    }

    // Operator suffix, e.g. capacity_gte
    const suffix = Object.keys(OPERATORS).find((op) => key.endsWith(op));
    if (suffix) {
      const field = key.slice(0, -suffix.length);
      if (!config.fields[field]) {
        return {
          ...result,
          ok: false,
          error: `Unknown filter field '${field}' for system '${systemName}'. Allowed fields: ${allowed.join(", ")}.`,
        };
      }
      if (config.fields[field].type === "equipment") {
        return {
          ...result,
          ok: false,
          error: `Field 'equipment' does not support the '${suffix.slice(1)}' operator. Use ?equipment=projector,AC instead.`,
        };
      }

      const coerced = coerce(config, field, rawValue);
      if (!coerced.ok) return { ...result, ok: false, error: coerced.error };

      const existing = (where[field] as Record<string, unknown>) ?? {};
      where[field] = { ...existing, [OPERATORS[suffix]]: coerced.value };
      continue;
    }

    // Plain exact match
    if (!config.fields[key]) {
      return {
        ...result,
        ok: false,
        error: `Unknown filter '${key}' for system '${systemName}'. Allowed fields: ${allowed.join(", ")}. Reserved params: search, sort, order, limit.`,
      };
    }
    if (config.fields[key].type === "equipment") {
      return {
        ...result,
        ok: false,
        error: `Field 'equipment' is only filterable on rooms via ?equipment=projector,AC.`,
      };
    }

    const coerced = coerce(config, key, rawValue);
    if (!coerced.ok) return { ...result, ok: false, error: coerced.error };
    where[key] = coerced.value;
  }

  // ?search= — contains across the configured text fields.
  // SQLite's LIKE is already case-insensitive for ASCII, which is why there is
  // no `mode: "insensitive"` here (Prisma does not support it on SQLite).
  const search = params.get("search")?.trim();
  if (search) {
    where.OR = config.searchFields.map((field) => ({
      [field]: { contains: search },
    }));
  }

  // ?sort= / ?order=
  const sort = params.get("sort")?.trim();
  if (sort) {
    if (!config.fields[sort] && sort !== "id") {
      return {
        ...result,
        ok: false,
        error: `Cannot sort by '${sort}'. Allowed fields: ${allowed.join(", ")}.`,
      };
    }
    const order = (params.get("order") ?? "asc").toLowerCase();
    if (order !== "asc" && order !== "desc") {
      return {
        ...result,
        ok: false,
        error: `Query param 'order' must be 'asc' or 'desc', received '${order}'.`,
      };
    }
    result.orderBy = [{ [sort]: order as "asc" | "desc" }];
  } else if (config.orderBy) {
    result.orderBy = config.orderBy;
  }

  // ?limit=
  const limitRaw = params.get("limit");
  if (limitRaw !== null) {
    const limit = Number(limitRaw);
    if (!Number.isInteger(limit) || limit < 1) {
      return {
        ...result,
        ok: false,
        error: `Query param 'limit' must be a positive integer, received '${limitRaw}'.`,
      };
    }
    result.take = limit;
  }

  return result;
}
