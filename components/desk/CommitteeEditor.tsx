'use client';

import { useId, useState } from 'react';
import Reveal from '@/components/motion/Reveal';
import ButtonGhost from '@/components/ui/ButtonGhost';
import ButtonSolid from '@/components/ui/ButtonSolid';
import Field from '@/components/ui/Field';
import LinkRule from '@/components/ui/LinkRule';
import type { CommitteeMember } from '@/lib/committee';

/**
 * The secretary edits the managing committee here; whatever is saved is what
 * /committee shows.
 *
 * Every part is an existing piece of the system — the desk's own Field, its
 * two buttons, its danger-coloured Delete link and its hairline rows. No new
 * colour, size or spacing is introduced.
 *
 * TODO(phase 2): PUT /api/committee, revalidate /committee. Nothing is
 * persisted yet — edits live in component state for the duration of the page.
 */

type Draft = {
  key: string;
  name: string;
  designation: string;
  flatNumber: string;
};

const BLANK = { name: '', designation: '', flatNumber: '' };

export default function CommitteeEditor({
  initial,
}: {
  initial: CommitteeMember[];
}) {
  const idBase = useId();
  const [members, setMembers] = useState<Draft[]>(() =>
    initial.map((m, i) => ({ ...m, key: `${idBase}-${i}` }))
  );
  const [seq, setSeq] = useState(initial.length);

  function addMember() {
    setMembers((prev) => [...prev, { ...BLANK, key: `${idBase}-${seq}` }]);
    setSeq((n) => n + 1);
  }

  function removeMember(key: string) {
    setMembers((prev) => prev.filter((m) => m.key !== key));
  }

  return (
    <>
      <Reveal className="desk__form">
        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            padding: '34px 30px',
            background: '#FFFFFF',
            border: '1px solid #E9E4D9',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: '#B08D57',
            }}
          >
            Shown on the public page
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 300,
              lineHeight: 1.85,
              color: '#5C5A55',
            }}
          >
            Designation, name and flat number appear on the committee page in
            the order listed here. Removing a member takes them off the public
            page immediately.
          </span>
        </aside>
      </Reveal>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {members.map((member, i) => (
          <Reveal key={member.key}>
            <div
              style={{
                padding: '34px 0',
                borderTop: '1px solid #E2DDD2',
              }}
            >
              <div className="committee-editor__row">
                <Field
                  label="Designation"
                  name={`role-${i}`}
                  gap={12}
                  placeholder="Chairman"
                  defaultValue={member.designation}
                  inputStyle={{ fontSize: 17 }}
                />
                <Field
                  label="Name"
                  name={`name-${i}`}
                  gap={12}
                  placeholder="Name Surname"
                  defaultValue={member.name}
                  inputStyle={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 26,
                    fontWeight: 300,
                  }}
                />
                <Field
                  label="Flat number"
                  name={`flat-${i}`}
                  gap={12}
                  placeholder="Flat A-1 / 704"
                  defaultValue={member.flatNumber}
                  inputStyle={{ fontSize: 17 }}
                />
                <div className="committee-editor__actions">
                  <LinkRule
                    style={{ color: '#8C4A3A' }}
                    onClick={() => removeMember(member.key)}
                  >
                    Remove
                  </LinkRule>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
        <div style={{ height: 1, background: '#E2DDD2' }} />
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '20px 30px',
        }}
      >
        <ButtonGhost
          label="Add member"
          borderColor="#C9C2B2"
          color="#17342C"
          fill="#17342C"
          gap={40}
          arrow={false}
          swapFrom="#17342C"
          swapTo="#F8F6F1"
          onClick={addMember}
          style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}
        />
        <ButtonSolid
          label="Save changes"
          background="#17342C"
          color="#F8F6F1"
          padding="21px 30px"
          style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}
        />
      </div>
    </>
  );
}
