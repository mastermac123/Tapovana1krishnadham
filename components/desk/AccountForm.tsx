'use client';

import { useActionState } from 'react';
import ButtonSolid from '@/components/ui/ButtonSolid';
import Field from '@/components/ui/Field';
import {
  changeEmail,
  changePassword,
  type AccountState,
} from '@/app/desk/account/actions';

/**
 * The two credential forms. Kept separate so a failed password change cannot
 * discard a half-typed email, and so each has its own message.
 */

function Message({ state }: { state: AccountState }) {
  if (!state.error && !state.ok) return null;
  return (
    <p
      role="alert"
      style={{
        margin: 0,
        maxWidth: 460,
        fontSize: 12.5,
        lineHeight: 1.7,
        color: state.error ? '#8C4A3A' : '#17342C',
      }}
    >
      {state.error ?? state.ok}
    </p>
  );
}

export function EmailForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(
    changeEmail,
    {}
  );

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
      <Field
        label="Sign-in email"
        name="email"
        type="email"
        gap={12}
        autoComplete="username"
        defaultValue={current}
        inputStyle={{ fontSize: 19 }}
      />
      <Field
        label="Your current password"
        name="currentPassword"
        type="password"
        gap={12}
        autoComplete="current-password"
        placeholder="••••••••••"
        inputStyle={{ letterSpacing: '0.2em' }}
      />
      <Message state={state} />
      <ButtonSolid
        type="submit"
        disabled={pending}
        label={pending ? 'Saving' : 'Change email'}
        background="#17342C"
        color="#F8F6F1"
        padding="21px 30px"
        style={{ alignSelf: 'flex-start' }}
      />
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(
    changePassword,
    {}
  );

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
      <Field
        label="Your current password"
        name="currentPassword"
        type="password"
        gap={12}
        autoComplete="current-password"
        placeholder="••••••••••"
        inputStyle={{ letterSpacing: '0.2em' }}
      />
      <Field
        label="New password"
        name="newPassword"
        type="password"
        gap={12}
        autoComplete="new-password"
        placeholder="At least 12 characters"
        inputStyle={{ letterSpacing: '0.2em' }}
      />
      <Field
        label="New password again"
        name="confirmPassword"
        type="password"
        gap={12}
        autoComplete="new-password"
        placeholder="••••••••••"
        inputStyle={{ letterSpacing: '0.2em' }}
      />
      <Message state={state} />
      <ButtonSolid
        type="submit"
        disabled={pending}
        label={pending ? 'Saving' : 'Change password'}
        background="#17342C"
        color="#F8F6F1"
        padding="21px 30px"
        style={{ alignSelf: 'flex-start' }}
      />
    </form>
  );
}
