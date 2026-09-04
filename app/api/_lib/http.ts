// Shared JSON response helpers so every CampusOS endpoint returns the same shapes.
//
// Success: the record or array itself, unwrapped.
// Failure: { error: "<message naming the problem>", ...extra }
//
// The `_lib` folder name starts with an underscore, so Next.js treats it as
// private and never turns these files into routes.

import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

export function badRequest(
  message: string,
  extra: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status: 400 });
}

export function notFound(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(
  message: string,
  extra: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status: 409 });
}

export function serverError(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Parse a JSON request body, returning a 400 response instead of throwing when
 * the body is missing, malformed, or not a JSON object.
 */
export async function readJsonBody(
  request: Request,
): Promise<
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; response: NextResponse }
> {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: badRequest("Request body must be valid JSON."),
    };
  }

  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      response: badRequest("Request body must be a JSON object."),
    };
  }

  return { ok: true, body: raw as Record<string, unknown> };
}

/**
 * Wrap a handler so an unexpected throw becomes a 500 with a readable message
 * rather than an opaque Next.js error page.
 */
export async function guard(
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[api] unhandled error:", error);
    return serverError(message);
  }
}
