import 'server-only';

import { db } from '@/lib/db';

/**
 * Sign-in throttling — HANDOFF.md section 6.
 *
 *   - 5 attempts per minute per IP
 *   - 3 consecutive failures from an IP locks it for 30 minutes
 *   - every attempt, successful or not, is written to LoginAttempt
 *
 * State lives in the database rather than in memory because the app may run as
 * more than one instance: an in-process counter would let an attacker spread
 * guesses across instances and never trip the limit.
 */

export const MAX_PER_MINUTE = 5;
export const CONSECUTIVE_FAILURES = 3;
export const LOCK_MINUTES = 30;

/**
 * The caller's address.
 *
 * `cf-connecting-ip` is set by Cloudflare's edge and cannot be forged by the
 * client. `x-forwarded-for` can be, so it is the last resort and only its
 * left-most entry is read. If the app is ever deployed without a proxy in
 * front, this degrades to 'unknown' and the limits become global rather than
 * per-address — which fails closed, not open.
 */
export function clientIp(headers: Headers): string {
  const cf = headers.get('cf-connecting-ip');
  if (cf) return cf.trim();

  const real = headers.get('x-real-ip');
  if (real) return real.trim();

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  return 'unknown';
}

export type LockState = { locked: boolean; until?: Date };

/**
 * Whether this address is currently locked out.
 *
 * "Consecutive" is read strictly: the most recent attempts must be failures.
 * A single success in the window clears the streak, so a legitimate user who
 * mistypes twice and then succeeds is never punished for it later.
 */
export async function lockState(ip: string): Promise<LockState> {
  const recent = await db.loginAttempt.findMany({
    where: { ip },
    orderBy: { createdAt: 'desc' },
    take: CONSECUTIVE_FAILURES,
    select: { success: true, createdAt: true },
  });

  if (recent.length < CONSECUTIVE_FAILURES) return { locked: false };
  if (recent.some((a) => a.success)) return { locked: false };

  // recent[0] is the newest failure; the lock runs from there.
  const until = new Date(recent[0].createdAt.getTime() + LOCK_MINUTES * 60_000);
  return until > new Date() ? { locked: true, until } : { locked: false };
}

/** Whether this address has burned its per-minute budget. */
export async function overRateLimit(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - 60_000);
  const count = await db.loginAttempt.count({
    where: { ip, createdAt: { gte: since } },
  });
  return count >= MAX_PER_MINUTE;
}

/** Records the attempt. Never throws — auth must not fail because logging did. */
export async function recordAttempt(
  ip: string,
  email: string | null,
  success: boolean
): Promise<void> {
  try {
    await db.loginAttempt.create({ data: { ip, email, success } });
  } catch (e) {
    console.error('login attempt not recorded', e);
  }
}

/** Minutes remaining on a lock, for the message shown to the user. */
export function minutesRemaining(until: Date): number {
  return Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60_000));
}
