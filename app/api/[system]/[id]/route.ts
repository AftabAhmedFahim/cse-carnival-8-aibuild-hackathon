// Generic single-record endpoint: GET, PATCH and DELETE for all five systems.
// Same config map as the collection route -- no per-system code lives here.

import {
  delegateFor,
  getSystem,
  serializeRecord,
  SYSTEM_NAMES,
  validateBody,
} from "../../_lib/systems";
import {
  badRequest,
  conflict,
  guard,
  notFound,
  ok,
  readJsonBody,
} from "../../_lib/http";

export const dynamic = "force-dynamic";

interface Context {
  params: { system: string; id: string };
}

function unknownSystem(system: string) {
  return badRequest(
    `Unknown system '${system}'. Valid systems: ${SYSTEM_NAMES.join(", ")}.`,
  );
}

export async function GET(_request: Request, { params }: Context) {
  return guard(async () => {
    const config = getSystem(params.system);
    if (!config) return unknownSystem(params.system);

    const record = await delegateFor(config).findUnique({
      where: { id: params.id },
      include: config.include,
    });

    if (!record) {
      return notFound(`No ${config.singular} found with id '${params.id}'.`);
    }

    return ok(serializeRecord(params.system, record));
  });
}

export async function PATCH(request: Request, { params }: Context) {
  return guard(async () => {
    const config = getSystem(params.system);
    if (!config) return unknownSystem(params.system);

    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;

    const validation = validateBody(config, params.system, parsed.body, "update");
    if (!validation.ok) {
      return badRequest(validation.error ?? "Invalid request body.");
    }

    const existing = await delegateFor(config).findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return notFound(`No ${config.singular} found with id '${params.id}'.`);
    }

    // Renaming a room onto another room's number would violate the unique index.
    if (params.system === "rooms" && validation.data.roomNumber !== undefined) {
      const clash = await delegateFor(config).findUnique({
        where: { roomNumber: validation.data.roomNumber as string },
      });
      if (clash && clash.id !== params.id) {
        return conflict(`Room '${validation.data.roomNumber}' already exists.`, {
          existing: serializeRecord(params.system, clash),
        });
      }
    }

    const record = await delegateFor(config).update({
      where: { id: params.id },
      data: validation.data,
      include: config.include,
    });

    return ok(serializeRecord(params.system, record));
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return guard(async () => {
    const config = getSystem(params.system);
    if (!config) return unknownSystem(params.system);

    const existing = await delegateFor(config).findUnique({
      where: { id: params.id },
      include: config.include,
    });
    if (!existing) {
      return notFound(`No ${config.singular} found with id '${params.id}'.`);
    }

    // Bookings and registrations cascade automatically (see prisma/schema.prisma).
    await delegateFor(config).delete({ where: { id: params.id } });

    return ok({
      deleted: true,
      id: params.id,
      record: serializeRecord(params.system, existing),
    });
  });
}
