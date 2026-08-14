'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { hash } from '@node-rs/argon2';
import { z } from 'zod';

import { ARGON2 } from '@/lib/auth';
import { db } from '@/lib/db';
import { emailConfigured, sendResetCode } from '@/lib/email';
import { checkCode, consumeCode, issueCode, tooManyRequests } from '@/lib/reset';
import { clientIp, recordAttempt } from '@/lib/rate-limit';

/**
 * Forgotten password, in two steps.
 *
 * Step one never reveals whether an address exists: the same message comes
 * back either way. Otherwise this page becomes a way to discover the
 * secretary's address, which is half of what an attacker needs.
 */

export type RequestState = { error?: string; sent?: boolean; email?: string };
export type ResetState = { error?: string };

const SENT_MESSAGE = true;

export async function requestCode(
  _prev: RequestState,
  formData: FormData
): Promise<RequestState> {
  const parsed = z.email().max(200).safeParse(formData.get('email'));
  if (!parsed.success) {
    return { error: 'Enter the registered email address.' };
  }

  const email = parsed.data.trim().toLowerCase();
  const ip = clientIp(await headers());

  if (!emailConfigured()) {
    return {
      error:
        'Email is not configured yet, so a code cannot be sent. Ask whoever set up the site.',
    };
  }

  /**
   * The rate limit must not become an account-existence oracle.
   *
   * A non-existent address never creates a passwordReset row, so
   * tooManyRequests can only ever be true for a real account. Surfacing that
   * as a distinct "too many" message told an attacker which addresses exist —
   * the precise thing the identical-response design below is meant to stop.
   *
   * So a rate-limited request returns the *same* success shape and simply does
   * not send. A legitimate user who asks more than three times in an hour is
   * told a code is on its way and does not receive one; the alternative leaks
   * more than that edge case is worth.
   */
  const secretary = await db.secretary.findUnique({ where: { email } });

  if (secretary && !(await tooManyRequests(email))) {
    try {
      const code = await issueCode(email, ip);
      await sendResetCode(email, code);
    } catch (e) {
      console.error('reset code not sent', e);
      // Still identical to the caller — the failure is ours, not theirs.
    }
  }

  // Identical response whether or not the account exists, or was throttled.
  return { sent: SENT_MESSAGE, email };
}

const resetSchema = z
  .object({
    email: z.email().max(200),
    code: z.string().trim().regex(/^\d{6}$/, 'The code is six digits.'),
    password: z.string().min(12).max(400),
    confirm: z.string().min(1).max(400),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'The two passwords do not match.',
  });

export async function resetPassword(
  _prev: ResetState,
  formData: FormData
): Promise<ResetState> {
  const parsed = resetSchema.safeParse({
    email: formData.get('email'),
    code: formData.get('code'),
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      error:
        first?.message?.startsWith('Invalid') || !first?.message
          ? 'Check the code, and use a password of at least 12 characters.'
          : first.message,
    };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const ip = clientIp(await headers());

  const check = await checkCode(email, parsed.data.code);

  if (!check.ok) {
    await recordAttempt(ip, email, false);
    return {
      error:
        check.reason === 'wrong'
          ? 'That code is not correct.'
          : 'That code has expired. Request a new one.',
    };
  }

  const secretary = await db.secretary.findUnique({ where: { email } });
  if (!secretary) return { error: 'That code has expired. Request a new one.' };

  await db.secretary.update({
    where: { id: secretary.id },
    data: { passwordHash: await hash(parsed.data.password, ARGON2) },
  });

  await consumeCode(check.id);
  await recordAttempt(ip, email, true);

  redirect('/login?reset=1');
}
