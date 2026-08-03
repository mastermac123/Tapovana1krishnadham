import 'server-only';

import { randomInt } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

import { ARGON2 } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Forgotten-password codes.
 *
 * Rules, all enforced here rather than in the pages:
 *   - six digits, from a cryptographic source, never Math.random
 *   - stored argon2-hashed, so a database leak yields nothing usable
 *   - fifteen minutes, single use
 *   - five wrong guesses kills the code
 *   - requesting a new code invalidates any outstanding one
 *   - at most three requests per address per hour
 */

const TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const MAX_REQUESTS_PER_HOUR = 3;

/**
 * A six-digit code with no modulo bias.
 *
 * `randomInt` draws uniformly over the range; taking `randomBytes % 1000000`
 * would make low codes fractionally likelier, which is exactly the sort of
 * detail that turns a 1-in-a-million guess into a 1-in-900,000 one.
 */
function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export async function tooManyRequests(email: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const count = await db.passwordReset.count({
    where: { email, createdAt: { gte: since } },
  });
  return count >= MAX_REQUESTS_PER_HOUR;
}

/**
 * Issues a code and returns it for sending. Any outstanding code for this
 * address is retired first, so only the newest message ever works.
 */
export async function issueCode(email: string, ip: string): Promise<string> {
  await db.passwordReset.updateMany({
    where: { email, usedAt: null },
    data: { usedAt: new Date() },
  });

  const code = generateCode();
  await db.passwordReset.create({
    data: {
      email,
      ip,
      codeHash: await hash(code, ARGON2),
      expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000),
    },
  });

  return code;
}

export type CodeCheck =
  | { ok: true; id: string }
  | { ok: false; reason: 'none' | 'expired' | 'wrong' };

/** Checks a submitted code without consuming it. */
export async function checkCode(
  email: string,
  code: string
): Promise<CodeCheck> {
  const record = await db.passwordReset.findFirst({
    where: { email, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) return { ok: false, reason: 'none' };

  if (record.expiresAt < new Date() || record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: 'expired' };
  }

  const matches = await verify(record.codeHash, code, ARGON2).catch(() => false);

  if (!matches) {
    await db.passwordReset.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: 'wrong' };
  }

  return { ok: true, id: record.id };
}

/** Spends the code. Called only once the new password has been accepted. */
export async function consumeCode(id: string): Promise<void> {
  await db.passwordReset.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}
