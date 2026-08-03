import type { Metadata } from 'next';

import ResetForm from '@/components/auth/ResetForm';
import Reveal from '@/components/motion/Reveal';
import WordRise from '@/components/motion/WordRise';
import ImageBand from '@/components/ui/ImageBand';
import { LOGIN_WEAVE } from '@/lib/patterns';

/** Forgotten password. Same split as /login, and the same absence of chrome. */

export const metadata: Metadata = {
  title: 'Reset password — Tapovan A-1 Krishnadham',
  robots: { index: false, follow: false },
};

export default function ResetPage() {
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
            Only the registered address can reset this account. Every attempt is
            recorded.
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
            Forgotten password
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
            <WordRise text="Reset it" />
          </h1>
        </Reveal>

        <ResetForm />
      </div>
    </div>
  );
}
