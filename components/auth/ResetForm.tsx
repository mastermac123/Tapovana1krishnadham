'use client';

import { useActionState } from 'react';
import ButtonSolid from '@/components/ui/ButtonSolid';
import Field from '@/components/ui/Field';
import LinkRule from '@/components/ui/LinkRule';
import {
  requestCode,
  resetPassword,
  type RequestState,
  type ResetState,
} from '@/app/reset/actions';

/**
 * Two panels in one component: ask for a code, then spend it.
 *
 * They share a screen rather than a redirect so the address typed in step one
 * carries into step two without a query string — a reset code in a URL ends up
 * in browser history and server logs.
 */

function Note({ children, tone }: { children: React.ReactNode; tone: 'bad' | 'good' }) {
  return (
    <p
      role="alert"
      style={{
        margin: 0,
        maxWidth: 440,
        fontSize: 12.5,
        lineHeight: 1.75,
        color: tone === 'bad' ? '#8C4A3A' : '#17342C',
      }}
    >
      {children}
    </p>
  );
}

export default function ResetForm() {
  const [request, requestAction, requesting] = useActionState<
    RequestState,
    FormData
  >(requestCode, {});
  const [reset, resetAction, resetting] = useActionState<ResetState, FormData>(
    resetPassword,
    {}
  );

  if (!request.sent) {
    return (
      <form action={requestAction} style={{ display: 'flex', flexDirection: 'column', gap: 38 }}>
        <Field
          label="Registered email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="secretary@krishnadham.in"
        />

        {request.error ? <Note tone="bad">{request.error}</Note> : null}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 30,
          }}
        >
          <ButtonSolid
            type="submit"
            disabled={requesting}
            label={requesting ? 'Sending' : 'Send code'}
            background="#17342C"
            color="#F8F6F1"
            padding="21px 30px"
          />
          <LinkRule
            href="/login"
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#5C5A55',
            }}
          >
            Back to sign in
          </LinkRule>
        </div>

        <p
          style={{
            margin: 0,
            maxWidth: 420,
            fontSize: 12.5,
            fontWeight: 300,
            lineHeight: 1.85,
            color: '#5C5A55',
          }}
        >
          A six&#8209;digit code is sent to the registered address. It expires in
          fifteen minutes and can be used once.
        </p>
      </form>
    );
  }

  return (
    <form action={resetAction} style={{ display: 'flex', flexDirection: 'column', gap: 38 }}>
      <input type="hidden" name="email" value={request.email ?? ''} />

      <Note tone="good">
        If that address is registered, a code is on its way to it. Check the
        inbox, and the spam folder.
      </Note>

      <Field
        label="Six-digit code"
        name="code"
        gap={12}
        placeholder="000000"
        inputStyle={{ fontSize: 26, letterSpacing: '0.4em' }}
      />
      <Field
        label="New password"
        name="password"
        type="password"
        gap={12}
        autoComplete="new-password"
        placeholder="At least 12 characters"
        inputStyle={{ letterSpacing: '0.2em' }}
      />
      <Field
        label="New password again"
        name="confirm"
        type="password"
        gap={12}
        autoComplete="new-password"
        placeholder="••••••••••"
        inputStyle={{ letterSpacing: '0.2em' }}
      />

      {reset.error ? <Note tone="bad">{reset.error}</Note> : null}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 30,
        }}
      >
        <ButtonSolid
          type="submit"
          disabled={resetting}
          label={resetting ? 'Saving' : 'Set new password'}
          background="#17342C"
          color="#F8F6F1"
          padding="21px 30px"
        />
        <LinkRule
          href="/login"
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#5C5A55',
          }}
        >
          Back to sign in
        </LinkRule>
      </div>
    </form>
  );
}
