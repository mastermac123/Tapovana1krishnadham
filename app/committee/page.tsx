import type { Metadata } from 'next';
import Reveal from '@/components/motion/Reveal';
import CommitteeCard from '@/components/ui/CommitteeCard';
import PageHeader from '@/components/ui/PageHeader';
import { committeeMembers } from '@/lib/committee';

/** Prototype `sc-if value="{{ isCommittee }}"`. */

/** Read from the database — must not be prerendered with build-time members. */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Committee members — Tapovan A-1 Krishnadham',
  description: 'The managing committee, elected by the general body.',
};

export default async function CommitteePage() {
  const members = await committeeMembers();

  return (
    <>
      <PageHeader eyebrow="Managing committee" title="Elected by the general body." />

      <section style={{ padding: 'var(--section-y-inner) var(--section-x)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 32,
          }}
        >
          {members.map((member) => (
            <Reveal key={member.id}>
              <CommitteeCard
                role={member.designation}
                name={member.name}
                flat={member.flatNumber}
              />
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
