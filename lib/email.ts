import 'server-only';

/**
 * Outgoing mail. Two providers, whichever is configured.
 *
 * Plain fetch, no SDK: each API is one POST, and an unused SDK is one more
 * dependency to keep patched.
 *
 * WHY THERE ARE TWO
 * Resend will only send *from* a domain verified by DNS. Without one the
 * fallback is its shared `onboarding@resend.dev`, which delivers only *to* the
 * address the Resend account was opened with. That held while the secretary
 * signed in with that same address — and broke the moment the sign-in address
 * changed, because reset codes were accepted by the API and then silently went
 * nowhere. A password reset that cannot reach the new secretary is not a
 * password reset.
 *
 * Brevo verifies a single sender *address* rather than a whole domain, and
 * will then deliver to anyone. That is what makes reset work for whatever
 * address the society elects next, without owning a domain.
 *
 * Brevo wins when both are set, since only it can reach an arbitrary
 * recipient. A domain is still the better answer eventually: mail sent from a
 * verified society domain lands in inboxes rather than spam folders, which
 * matters more as the committee writes to seventy-two people.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const SENDER_NAME = 'Tapovan A-1 Krishnadham';

export type Mail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

/** Which provider will be used, if any. */
export function emailProvider(): 'brevo' | 'resend' | null {
  if (!process.env.EMAIL_FROM) return null;
  if (process.env.BREVO_API_KEY) return 'brevo';
  if (process.env.RESEND_API_KEY) return 'resend';
  return null;
}

export function emailConfigured(): boolean {
  return emailProvider() !== null;
}

async function sendViaBrevo(mail: Mail, key: string, from: string) {
  const response = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: { 'api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: from },
      to: [{ email: mail.to }],
      subject: mail.subject,
      textContent: mail.text,
      htmlContent: mail.html,
    }),
  });

  if (!response.ok) {
    // Brevo names the reason — commonly an unverified sender address.
    const detail = await response.text().catch(() => '');
    throw new Error(`Brevo refused the message (${response.status}): ${detail}`);
  }
}

async function sendViaResend(mail: Mail, key: string, from: string) {
  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: `${SENDER_NAME} <${from}>`,
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend refused the message (${response.status}): ${detail}`);
  }
}

async function send(mail: Mail): Promise<void> {
  const from = process.env.EMAIL_FROM;
  const provider = emailProvider();

  if (!from || !provider) {
    throw new Error(
      'No mail provider is configured. Set EMAIL_FROM and either BREVO_API_KEY ' +
        'or RESEND_API_KEY — run scripts/set-env.mjs.'
    );
  }

  if (provider === 'brevo') {
    await sendViaBrevo(mail, process.env.BREVO_API_KEY!, from);
  } else {
    await sendViaResend(mail, process.env.RESEND_API_KEY!, from);
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
