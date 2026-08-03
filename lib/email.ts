import 'server-only';

/**
 * Outgoing mail, over Resend's HTTP API.
 *
 * Plain fetch, no SDK: the API is one POST, and an unused SDK is one more
 * dependency to keep patched. To move provider later, only `send` changes.
 *
 * SENDER, AND THE LIMIT THAT COMES WITH IT
 * Resend will only send *from* a domain you have verified by DNS. Until the
 * society owns one, the fallback is Resend's shared `onboarding@resend.dev`,
 * which may only deliver *to* the address the Resend account was opened with.
 * That is enough here — there is exactly one secretary account — but it stops
 * working the day the sign-in address changes to a new secretary's. At that
 * point the society needs a domain. See EMAIL_FROM in .env.local.
 */

const ENDPOINT = 'https://api.resend.com/emails';

export type Mail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

async function send(mail: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!key || !from) {
    throw new Error(
      'RESEND_API_KEY and EMAIL_FROM are not set. Run scripts/set-env.mjs.'
    );
  }

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: `Tapovan A-1 Krishnadham <${from}>`,
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    }),
  });

  if (!response.ok) {
    // Resend's body names the reason — an unverified domain, or a recipient
    // the shared sender is not allowed to reach.
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend refused the message (${response.status}): ${detail}`);
  }
}

/**
 * The reset code.
 *
 * Deliberately plain: no logo, no link, nothing to click. A reset mail that
 * looks like marketing trains people to trust mail that looks like marketing,
 * and a code cannot be phished by a lookalike link the way a button can.
 */
export async function sendResetCode(to: string, code: string): Promise<void> {
  const minutes = 15;

  await send({
    to,
    subject: `${code} is your Krishnadham password reset code`,
    text: [
      `Your password reset code is ${code}`,
      '',
      `It expires in ${minutes} minutes and can be used once.`,
      '',
      'If you did not ask to reset the secretary password, ignore this message',
      'and tell the committee — someone else tried to.',
    ].join('\n'),
    html: `
      <div style="font-family:Georgia,serif;color:#242424;line-height:1.7">
        <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#B08D57;margin:0 0 24px">
          Tapovan A&#8209;1 Krishnadham
        </p>
        <p style="margin:0 0 8px">Your password reset code is</p>
        <p style="font-size:34px;letter-spacing:0.3em;margin:0 0 24px;color:#17342C">
          ${code}
        </p>
        <p style="margin:0 0 24px;font-size:14px;color:#5C5A55">
          It expires in ${minutes} minutes and can be used once.
        </p>
        <p style="margin:0;font-size:13px;color:#5C5A55">
          If you did not ask to reset the secretary password, ignore this
          message and tell the committee — someone else tried to.
        </p>
      </div>
    `,
  });
}
