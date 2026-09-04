// Generic collection endpoint: GET (list, filterable) and POST (create) for all
// five systems. One handler, driven entirely by the config map in _lib/systems.ts.

import { hasAllEquipment } from "@/lib/db";

import { parseQuery } from "../_lib/filters";
import {
  applyCreateDefaults,
  delegateFor,
  getSystem,
  postSort,
  serializeRecord,
  serializeRecords,
  SYSTEM_NAMES,
  validateBody,
} from "../_lib/systems";
import {
  badRequest,
  conflict,
  created,
  guard,
  ok,
  readJsonBody,
} from "../_lib/http";

// Never cache: the dashboard must show edits instantly and the agent must
// always read live data.
export const dynamic = "force-dynamic";

interface Context {
  params: { system: string };
}

function unknownSystem(system: string) {
  return badRequest(
    `Unknown system '${system}'. Valid systems: ${SYSTEM_NAMES.join(", ")}.`,
  );
}

export async function GET(request: Request, { params }: Context) {
  return guard(async () => {
    const config = getSystem(params.system);
    if (!config) return unknownSystem(params.system);

    const url = new URL(request.url);
    const query = parseQuery(config, params.system, url.searchParams);
    if (!query.ok) return badRequest(query.error ?? "Invalid query parameters.");

    let rows = await delegateFor(config).findMany({
      where: query.where,
      orderBy: query.orderBy,
      take: query.take,
      include: config.include,
    });

    // Equipment lives in SQLite as a JSON string, so this filter cannot run in SQL.
    if (query.equipmentFilter.length > 0) {
      rows = rows.filter((row) =>
        hasAllEquipment(row.equipment as string, query.equipmentFilter),
      );
    }

    return ok(serializeRecords(params.system, postSort(params.system, rows)));
  });
}

export async function POST(request: Request, { params }: Context) {
  return guard(async () => {
    const config = getSystem(params.system);
    if (!config) return unknownSystem(params.system);

    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;

    const validation = validateBody(config, params.system, parsed.body, "create");
    if (!validation.ok) {
      return badRequest(validation.error ?? "Invalid request body.");
    }

    const data = applyCreateDefaults(params.system, validation.data);

    // Room numbers are unique; report the clash rather than a raw Prisma error.
    if (params.system === "rooms") {
      const existing = await delegateFor(config).findUnique({
        where: { roomNumber: data.roomNumber as string },
      });
      if (existing) {
        return conflict(
          `Room '${data.roomNumber}' already exists.`,
          { existing: serializeRecord(params.system, existing) },
        );
      }
    }

    const record = await delegateFor(config).create({
      data,
      include: config.include,
    });

    return created(serializeRecord(params.system, record));
  });
}
