import Reveal from '@/components/motion/Reveal';
import WordRise from '@/components/motion/WordRise';
import CommitteeEditor from '@/components/desk/CommitteeEditor';
import { committeeMembers } from '@/lib/committee';

/** The editor must always show what is actually stored, never a build-time copy. */
export const dynamic = 'force-dynamic';

/**
 * The secretary's committee list. A static segment, so it takes precedence
 * over /desk/[type].
 *
 * TODO(prisma): read CommitteeMember ordered by `order` instead of the seed.
 */
export default async function DeskCommitteePage() {
  const members = await committeeMembers();

  return (
    <>
      <Reveal
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 40,
          paddingBottom: 34,
          borderBottom: '1px solid #E2DDD2',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: '#B08D57',
            }}
          >
            Manage
          </span>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontWeight: 300,
              fontSize: 'clamp(32px, 3.6vw, 52px)',
              lineHeight: 1.02,
            }}
          >
            <WordRise text="Committee members" />
          </h1>
        </div>
        <span style={{ fontSize: 13, fontWeight: 300, color: '#5C5A55' }}>
          {members.length} listed &middot; elected by the general body
        </span>
      </Reveal>

      <CommitteeEditor initial={members} />
    </>
  );
}
