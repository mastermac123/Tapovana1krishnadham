import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import Reveal from '@/components/motion/Reveal';
import WordRise from '@/components/motion/WordRise';
import ImageBand from '@/components/ui/ImageBand';
import { auth } from '@/lib/auth';
import { LOGIN_WEAVE } from '@/lib/patterns';

/** Prototype `sc-if value="{{ isLogin }}"`. No nav, no footer. */

export const metadata: Metadata = {
  title: 'Secretary login — Tapovan A-1 Krishnadham',
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  // Already signed in? The desk, not a second sign-in form.
  const session = await auth();
  if (session?.user) redirect('/desk/circular');

  return (
    <div className="login" data-dark>
      <ImageBand
        ground="transparent"
        pattern={LOGIN_WEAVE}
        amount={0.08}
        inset="-10% 0"
        style={{ minHeight: '100%' }}
      >
        <div
          style={{
            position: 'absolute',
            left: 'var(--section-x)',
            bottom: 96,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 300,
              fontSize: 'clamp(32px, 3.6vw, 52px)',
              lineHeight: 1.05,
            }}
          >
            Secretary&rsquo;s desk
          </span>
          <span
            style={{
              maxWidth: 340,
              fontSize: 15,
              fontWeight: 300,
              lineHeight: 1.8,
              color: 'rgba(248, 246, 241, 0.6)',
            }}
          >
            A single account publishes every notice, quotation and set of minutes on
            this site.
          </span>
        </div>
      </ImageBand>

      <div className="login__form">
        <Reveal style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: '#B08D57',
            }}
          >
            Authorised access
          </span>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontWeight: 300,
              fontSize: 'clamp(34px, 3.75vw, 54px)',
              lineHeight: 1.02,
            }}
          >
            <WordRise text="Sign in" />
          </h1>
        </Reveal>

        <LoginForm />
      </div>
    </div>
  );
}
