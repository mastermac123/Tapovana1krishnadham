import { redirect } from 'next/navigation';

import Reveal from '@/components/motion/Reveal';
import WordRise from '@/components/motion/WordRise';
import { EmailForm, PasswordForm } from '@/components/desk/AccountForm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * The handover page.
 *
 * A society's secretary changes every year or two. Without this, every
 * handover would need someone with database access — which would make the site
 * a liability the moment nobody technical is around.
 */
export default async function AccountPage() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect('/login');

  const secretary = await db.secretary.findUnique({
    where: { id },
    select: { email: true, updatedAt: true },
  });
  if (!secretary) redirect('/login');

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
            Account
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
            <WordRise text="Sign-in details" />
          </h1>
        </div>
        <span style={{ fontSize: 13, fontWeight: 300, color: '#5C5A55' }}>
          Last changed{' '}
          {secretary.updatedAt.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
      </Reveal>

      <Reveal className="desk__form">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: '#B08D57',
            }}
          >
            Change email
          </span>
          <EmailForm current={secretary.email} />
        </div>

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
            Handing over
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 300,
              lineHeight: 1.85,
              color: '#5C5A55',
            }}
          >
            When the committee elects a new secretary, change the email to
            theirs and set a new password here. There is one account, and
            whoever holds it publishes everything on the site — so the outgoing
            secretary should make both changes in the incoming one&rsquo;s
            presence, and not share the old password afterwards.
          </span>
        </aside>
      </Reveal>

      <Reveal className="desk__form">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: '#B08D57',
            }}
          >
            Change password
          </span>
          <PasswordForm />
        </div>
      </Reveal>
    </>
  );
}
