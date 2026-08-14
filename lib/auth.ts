import { createHash } from 'node:crypto';

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { hash, verify } from '@node-rs/argon2';
import { z } from 'zod';

import { authConfig } from '@/lib/auth.config';
import { db } from '@/lib/db';
import {
  clientIp,
  emailLockState,
  lockState,
  overRateLimit,
  recordAttempt,
} from '@/lib/rate-limit';

/**
 * Credential verification — HANDOFF.md section 6.
 *
 * Node runtime only: argon2 and Prisma both need it. The middleware guard uses
 * lib/auth.config.ts instead, which carries no such imports.
 */

/** OWASP argon2id parameters. Must match prisma/seed.ts. */
export const ARGON2 = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const credentialsSchema = z.object({
  email: z.email().max(200),
  password: z.string().min(1).max(400),
});

/**
 * A short, non-reversible marker for "the password as it was at sign-in".
 *
 * Sessions are JWTs, so nothing about them is stored server-side and there is
 * no list of live sessions to revoke. Without this, changing the password does
 * not evict anyone already signed in — a stolen laptop or a borrowed session
 * keeps working until the eight hours run out, which is exactly when the
 * secretary believes they have just shut it down.
 *
 * Hashing the stored hash means the token never carries anything that could be
 * attacked offline, while still changing whenever the password does.
 */
export function passwordFingerprint(passwordHash: string): string {
  return createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
}

/**
 * A valid hash to check against when the email does not exist.
 *
 * Without this, a miss returns in microseconds and a hit takes ~50ms, and that
 * difference tells an attacker which addresses are real. Verifying against a
 * throwaway hash makes both paths cost the same.
 */
let decoyHash: string | undefined;
async function getDecoyHash(): Promise<string> {
  decoyHash ??= await hash(crypto.randomUUID(), ARGON2);
  return decoyHash;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Registered email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) {
          // Counted for the same reason as in the login action: input that
          // fails the schema is still someone trying the door.
          await recordAttempt(clientIp(request.headers), null, false);
          return null;
        }

        const email = parsed.data.email.trim().toLowerCase();
        const ip = clientIp(request.headers);

        /**
         * The throttle lives here, not in the login form's action.
         *
         * /api/auth/callback/credentials is a public endpoint: anything that
         * guards only the form is walked straight past by posting to it
         * directly. This is the one place a password is actually checked, so
         * this is the one place a lock is worth anything.
         *
         * A refusal is recorded, so hammering a locked account extends the
         * lock rather than waiting it out.
         */
        const [tooFast, byAddress, byAccount] = await Promise.all([
          overRateLimit(ip),
          lockState(ip),
          emailLockState(email),
        ]);

        if (tooFast || byAddress.locked || byAccount.locked) {
          await recordAttempt(ip, email, false);
          return null;
        }

        const secretary = await db.secretary.findUnique({ where: { email } });

        // Always run a verify, whether or not the account exists.
        const ok = await verify(
          secretary?.passwordHash ?? (await getDecoyHash()),
          parsed.data.password,
          ARGON2
        ).catch(() => false);

        const success = Boolean(secretary) && ok;
        await recordAttempt(ip, email, success);

        if (!success || !secretary) return null;
        return {
          id: secretary.id,
          email: secretary.email,
          pv: passwordFingerprint(secretary.passwordHash),
        };
      },
    }),
  ],
});
