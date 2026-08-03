import 'server-only';

import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import type { ZodType } from 'zod';

import { auth } from '@/lib/auth';

/**
 * Shared plumbing for the desk's API routes.
 *
 * Every route here is secretary-only. The middleware guard covers `/desk`
 * pages, but an API route is reachable directly — so each one re-checks the
 * session itself rather than assuming a page guard ran first.
 */

export function unauthorized() {
  return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = 'Not found.') {
  return NextResponse.json({ error: message }, { status: 404 });
}

/** Returns the session, or null when the caller is not the secretary. */
export async function requireSecretary(): Promise<Session | null> {
  const session = await auth();
  return session?.user ? session : null;
}

/**
 * Parses a JSON body against a schema.
 *
 * Zod's own messages can echo the submitted value, which would put unvalidated
 * input into a response, so failures return a fixed message and the detail is
 * logged server-side instead.
 */
export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>
): Promise<{ data: T } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: badRequest('Expected a JSON body.') };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    console.warn('rejected request body', result.error.issues);
    return { error: badRequest('Some fields are missing or invalid.') };
  }

  return { data: result.data };
}
