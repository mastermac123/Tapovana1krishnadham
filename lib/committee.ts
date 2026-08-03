import 'server-only';

import { db } from '@/lib/db';

/**
 * The managing committee, as maintained by the secretary at /desk/committee.
 *
 * TODO(client): the seeded names are still the prototype's placeholders —
 * HANDOFF.md section 7. They are replaced from the desk, not from code.
 */

export type CommitteeMember = {
  id: string;
  name: string;
  designation: string;
  flatNumber: string;
};

export async function committeeMembers(): Promise<CommitteeMember[]> {
  return db.committeeMember.findMany({
    orderBy: { order: 'asc' },
    select: { id: true, name: true, designation: true, flatNumber: true },
  });
}
