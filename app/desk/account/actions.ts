'use server';

import { revalidatePath } from 'next/cache';
import { hash, verify } from '@node-rs/argon2';
import { z } from 'zod';

import { ARGON2, auth } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * The secretary changes their own credentials.
 *
 * Both actions require the current password, even though the caller is already
 * signed in — an unattended session left open on the society computer must not
 * be enough to take the account over.
 */

export type AccountState = { error?: string; ok?: string };

const emailSchema = z.object({
  email: z.email().max(200),
  currentPassword: z.string().min(1).max(400),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1).max(400),
    newPassword: z.string().min(12).max(400),
    confirmPassword: z.string().min(1).max(400),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'The two new passwords do not match.',
  });

/** The signed-in secretary, with their hash, or null. */
async function currentSecretary() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return db.secretary.findUnique({ where: { id } });
}

export async function changeEmail(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const parsed = emailSchema.safeParse({
    email: formData.get('email'),
    currentPassword: formData.get('currentPassword'),
  });
  if (!parsed.success) {
    return { error: 'Enter a valid email address and your current password.' };
  }

  const secretary = await currentSecretary();
  if (!secretary) return { error: 'You are no longer signed in.' };

  const ok = await verify(
    secretary.passwordHash,
    parsed.data.currentPassword,
    ARGON2
  ).catch(() => false);
  if (!ok) return { error: 'That current password is not correct.' };

  const email = parsed.data.email.trim().toLowerCase();
  if (email === secretary.email) {
    return { ok: 'That is already the address on the account.' };
  }

  const taken = await db.secretary.findUnique({ where: { email } });
  if (taken) return { error: 'Another account already uses that address.' };

  await db.secretary.update({ where: { id: secretary.id }, data: { email } });
  revalidatePath('/desk/account');
  return { ok: `Sign-in address changed to ${email}.` };
}

export async function changePassword(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) {
    const mismatch = parsed.error.issues.find((i) => i.path.length === 0);
    return {
      error:
        mismatch?.message ?? 'The new password must be at least 12 characters.',
    };
  }

  const secretary = await currentSecretary();
  if (!secretary) return { error: 'You are no longer signed in.' };

  const ok = await verify(
    secretary.passwordHash,
    parsed.data.currentPassword,
    ARGON2
  ).catch(() => false);
  if (!ok) return { error: 'That current password is not correct.' };

  if (parsed.data.newPassword === parsed.data.currentPassword) {
    return { error: 'The new password must be different from the old one.' };
  }

  await db.secretary.update({
    where: { id: secretary.id },
    data: { passwordHash: await hash(parsed.data.newPassword, ARGON2) },
  });

  return { ok: 'Password changed. It applies the next time you sign in.' };
}
