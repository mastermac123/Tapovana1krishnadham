import type { Metadata } from 'next';
import Reveal from '@/components/motion/Reveal';
import CommitteeCard from '@/components/ui/CommitteeCard';
import PageHeader from '@/components/ui/PageHeader';
import { committeeMembers } from '@/lib/committee';

/** Prototype `sc-if value="{{ isCommittee }}"`. */

/**
 * Prerendered, and rebuilt when the committee tag is invalidated — which
 * saving from the desk does. The list changes a couple of times a year; it
 * does not warrant a server render per visit.
 */

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
