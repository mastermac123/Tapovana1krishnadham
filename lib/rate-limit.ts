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
 * EVERY header here is client-supplied unless a proxy we trust overwrote it,
 * so which one is safe depends entirely on what sits in front of the app.
 * Reading the wrong one is not a small mistake: an attacker who can choose
 * their own "address" simply changes it each request and the lockout below
 * never trips.
 *
 *   x-vercel-forwarded-for  Vercel sets this and strips any client copy.
 *   cf-connecting-ip        Cloudflare sets this at its edge — but only if you
 *                           are actually behind Cloudflare. Anywhere else a
 *                           client can invent it, which is why it is opt-in
 *                           through TRUST_CLOUDFLARE_IP.
 *   x-forwarded-for         A list the client can prepend to. The entry we can
 *                           trust is the *last* one, appended by the nearest
 *                           proxy — never the first, which is whatever the
 *                           caller typed.
 *
 * With nothing in front, this returns 'unknown' and the limits apply globally
 * rather than per address: annoying under attack, but it fails closed.
 */
export function clientIp(headers: Headers): string {
  const vercel = headers.get('x-vercel-forwarded-for');
  if (vercel) return vercel.split(',')[0]!.trim();

  if (process.env.TRUST_CLOUDFLARE_IP === 'true') {
    const cf = headers.get('cf-connecting-ip');
    if (cf) return cf.trim();
  }

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const hops = forwarded.split(',').map((h) => h.trim()).filter(Boolean);
    const nearest = hops[hops.length - 1];
    if (nearest) return nearest;
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

/**
 * Whether this *account* is being guessed at, regardless of where from.
 *
 * The IP lock above is only as trustworthy as the header it reads, and behind
 * a home connection or a mobile network an attacker can often change address
 * at will. Locking the account itself removes that escape: rotate through a
 * thousand addresses and the fifth wrong password still stops you.
 *
 * Deliberately more forgiving than the IP rule — a legitimate secretary who
 * mistypes should not be locked out by someone else's attack on their account,
 * so this window is short and clears on the first success.
 */
export const EMAIL_FAILURE_LIMIT = 8;
export const EMAIL_WINDOW_MINUTES = 15;

export async function emailLockState(email: string): Promise<LockState> {
  const since = new Date(Date.now() - EMAIL_WINDOW_MINUTES * 60_000);

  const recent = await db.loginAttempt.findMany({
    where: { email, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    select: { success: true, createdAt: true },
  });

  // A success inside the window means the real owner got in; clear the streak.
  const sinceLastSuccess = [];
  for (const attempt of recent) {
    if (attempt.success) break;
    sinceLastSuccess.push(attempt);
  }

  if (sinceLastSuccess.length < EMAIL_FAILURE_LIMIT) return { locked: false };

  const newest = sinceLastSuccess[0]!.createdAt;
  const until = new Date(newest.getTime() + EMAIL_WINDOW_MINUTES * 60_000);
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
