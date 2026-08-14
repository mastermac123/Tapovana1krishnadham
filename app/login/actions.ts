'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';

import { signIn } from '@/lib/auth';
import { credentialsSchema } from '@/lib/auth';
import {
  clientIp,
  emailLockState,
  lockState,
  minutesRemaining,
  overRateLimit,
  recordAttempt,
} from '@/lib/rate-limit';

export type LoginState = { error?: string };

/**
 * Sign-in — HANDOFF.md section 6.
 *
 * The throttle checks live here rather than inside `authorize` so the reason
 * for a refusal can be shown to the user. `authorize` still records every
 * attempt, which is what the lock counts.
 *
 * The failure message is deliberately identical for an unknown address and a
 * wrong password: telling them apart would confirm which addresses exist.
 */
export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  const ip = clientIp(await headers());

  if (!parsed.success) {
    /**
     * Recorded, not waved through.
     *
     * This used to return without counting, which meant anything that failed
     * the schema — a malformed address, an empty password — was a free attempt.
     * Someone hammering the form with junk never approached the lock, and a
     * person mistyping their address genuinely wondered why three wrong tries
     * produced no lockout at all. A refused attempt is an attempt.
     */
    const attempted = formData.get('email');
    await recordAttempt(
      ip,
      typeof attempted === 'string' && attempted.length <= 200
        ? attempted.trim().toLowerCase()
        : null,
      false
    );
    return { error: 'Enter a registered email address and your password.' };
  }

  if (await overRateLimit(ip)) {
    return { error: 'Too many attempts. Wait a minute and try again.' };
  }

  const lock = await lockState(ip);
  if (lock.locked && lock.until) {
    return {
      error: `This address is locked for another ${minutesRemaining(lock.until)} minutes.`,
    };
  }

  /**
   * The account-level lock. The IP rules above can be sidestepped by anyone who
   * can change address — a mobile network, a proxy, a forged header on a host
   * that does not overwrite it. This one cannot: it counts failures against the
   * account itself, so rotating addresses buys nothing.
   */
  const accountLock = await emailLockState(parsed.data.email.trim().toLowerCase());
  if (accountLock.locked && accountLock.until) {
    return {
      error: `Too many failed attempts on this account. Try again in ${minutesRemaining(accountLock.until)} minutes, or reset the password.`,
    };
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // A refusal inside authorize has already been recorded; anything else
      // failed before it ran, so record it here to keep the lock honest.
      if (error.type !== 'CredentialsSignin') {
        await recordAttempt(ip, parsed.data.email, false);
      }
      return { error: 'That email and password do not match.' };
    }
    throw error;
  }

  redirect('/desk/circular');
}
