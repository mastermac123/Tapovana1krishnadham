'use server';

import { revalidatePath } from 'next/cache';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { committeeSchema } from '@/lib/validation';

export type CommitteeState = {
  error?: string;
  ok?: string;
  /**
   * What was actually stored. The form's inputs are uncontrolled, so without
   * this the boxes keep showing pre-save text and a successful save looks like
   * a failed one.
   */
  members?: { name: string; designation: string; flatNumber: string }[];
};

/**
 * Replaces the committee with what the form holds.
 *
 * Wholesale replacement rather than a diff: the list is a dozen rows at most,
 * order matters, and reconciling additions, removals and re-ordering
 * separately would be more code and more ways to be wrong. Done in one
 * transaction, so a failure halfway cannot leave the public page showing half
 * a committee.
 */
export async function saveCommittee(
  _prev: CommitteeState,
  formData: FormData
): Promise<CommitteeState> {
  const session = await auth();
  if (!session?.user) return { error: 'You are no longer signed in.' };

  // Fields arrive as name-0, designation-0, flat-0, name-1, … Collect the row
  // indices actually present rather than assuming a contiguous range.
  const indices = new Set<number>();
  for (const key of formData.keys()) {
    const match = key.match(/^name-(\d+)$/);
    if (match) indices.add(Number(match[1]));
  }

  const rows = [...indices]
    .sort((a, b) => a - b)
    .map((i) => ({
      name: String(formData.get(`name-${i}`) ?? '').trim(),
      designation: String(formData.get(`designation-${i}`) ?? '').trim(),
      flatNumber: String(formData.get(`flat-${i}`) ?? '').trim(),
    }))
    // A row the secretary added but never filled in is not an error; it is
    // just an empty row, and gets dropped.
    .filter((m) => m.name || m.designation || m.flatNumber);

  const parsed = committeeSchema.safeParse({ members: rows });
  if (!parsed.success) {
    return {
      error:
        'Every member needs a name, a designation and a flat number. Remove any row you do not want.',
    };
  }

  try {
    await db.$transaction([
      db.committeeMember.deleteMany({}),
      db.committeeMember.createMany({
        data: parsed.data.members.map((m, order) => ({ ...m, order })),
      }),
    ]);
  } catch (e) {
    console.error('committee not saved', e);
    return { error: 'That could not be saved. Try again.' };
  }

  revalidatePath('/committee');
  revalidatePath('/desk/committee');

  const n = parsed.data.members.length;
  return {
    ok: `Saved. ${n} member${n === 1 ? '' : 's'} shown on the committee page.`,
    members: parsed.data.members,
  };
}
