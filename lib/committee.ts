import 'server-only';

import { unstable_cache } from 'next/cache';

import { db } from '@/lib/db';

/**
 * The managing committee, as maintained by the secretary at /desk/committee.
 *
 * Cached against COMMITTEE_TAG: the list changes a couple of times a year, but
 * the query runs on every visit to /committee and costs a round trip to
 * Singapore. Saving from the desk invalidates it, so an edit still shows at
 * once.
 *
 * TODO(client): the seeded names are still the prototype's placeholders —
 * HANDOFF.md section 7. They are replaced from the desk, not from code.
 */

export const COMMITTEE_TAG = 'committee';

export type CommitteeMember = {
  id: string;
  name: string;
  designation: string;
  flatNumber: string;
};

export const committeeMembers = unstable_cache(
  async (): Promise<CommitteeMember[]> =>
    db.committeeMember.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, name: true, designation: true, flatNumber: true },
    }),
  ['committee-members'],
  { tags: [COMMITTEE_TAG] }
);
