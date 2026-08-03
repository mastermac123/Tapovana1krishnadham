'use client';

import { useActionState } from 'react';
import Reveal from '@/components/motion/Reveal';
import ButtonSolid from '@/components/ui/ButtonSolid';
import Field from '@/components/ui/Field';
import LinkRule from '@/components/ui/LinkRule';
import { login, type LoginState } from '@/app/login/actions';

/**
 * The sign-in form. Markup is the prototype's; only the form wrapper, the
 * pending state and the error line are added.
 *
 * A plain <form action={...}> means the fields still submit without
 * JavaScript — the custom cursor and the reveals are decoration, not the
 * mechanism.
 */
export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {}
  );

  return (
    <form action={formAction} noValidate>
      <Reveal style={{ display: 'flex', flexDirection: 'column', gap: 38 }}>
        <Field
          label="Registered email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="secretary@krishnadham.in"
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••"
          inputStyle={{ letterSpacing: '0.2em' }}
        />

        {state.error ? (
          <p
            role="alert"
            style={{
              margin: 0,
              maxWidth: 420,
              fontSize: 12.5,
              fontWeight: 400,
              lineHeight: 1.7,
              color: '#8C4A3A',
            }}
          >
            {state.error}
          </p>
        ) : null}

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
            disabled={pending}
            label={pending ? 'Signing in' : 'Continue'}
            background="#17342C"
            color="#F8F6F1"
            padding="21px 30px"
          />
          <LinkRule
            href="/reset"
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#5C5A55',
            }}
          >
            Forgot password
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
          One&#8209;time password verification follows. Three failed attempts from
          an address lock it for thirty minutes; every attempt is recorded.
        </p>
      </Reveal>
    </form>
  );
}
