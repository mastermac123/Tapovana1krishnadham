# Deploying

The site is a Next.js app with three services behind it: Neon for the database,
Cloudflare R2 for documents, Resend for password-reset email. All three are
already live and working — deployment only moves the *app* off the developer's
machine.

---

## 1. GitHub

Create an **empty private repo** at <https://github.com/new> named
`krishnadham`. Do not tick any "initialise with" boxes — this project already
has its history.

Then, in `C:\Users\ashut\krishnadham`:

```bash
git remote add origin https://github.com/YOUR-USERNAME/krishnadham.git
git push -u origin main
```

`.gitignore` already excludes `.env.local`, so **no credential is pushed**.
Verify with `git ls-files | findstr .env` — only `.env.example` should appear.

---

## 2. Vercel

<https://vercel.com/new> → sign in with GitHub → import `krishnadham`.
It detects Next.js; leave the build settings alone.

**Before clicking Deploy**, add these under Environment Variables. Copy each
value from your local `.env.local`:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | the pooled Neon string |
| `R2_ACCOUNT_ID` | |
| `R2_BUCKET` | |
| `R2_ACCESS_KEY_ID` | |
| `R2_SECRET_ACCESS_KEY` | |
| `AUTH_SECRET` | |
| `RESEND_API_KEY` | |
| `EMAIL_FROM` | `onboarding@resend.dev` |

Do **not** set `SEED_SECRETARY_EMAIL` or `SEED_SECRETARY_PASSWORD` — seeding is
already done, and they would only go stale.

Do **not** set `TRUST_CLOUDFLARE_IP` on Vercel. Vercel supplies its own
unspoofable client-IP header; trusting Cloudflare's there would let a caller
forge their address and walk past the sign-in lockout.

---

## Why vercel.json pins the region

`vercel.json` holds one setting, `"regions": ["sin1"]`, and it matters more than
its size suggests.

Vercel defaults to Washington (`iad1`). Neon sits in Singapore
(`ap-southeast-1`). Left alone, every database query crossed the Pacific twice
at roughly 250ms a time — measured on the live site, the notice board took 2.1
seconds and a sign-in attempt 3.8, while the static pages, which touch no data,
answered in 50ms. The response header said it plainly: `bom1::iad1` — entering
at the Mumbai edge, executing in Washington.

`sin1` is Singapore, the same city as the database. Mumbai (`bom1`) would sit
closer to the residents, but a page makes many database calls and only one trip
back to the reader, so proximity to the data wins.

Keep the file free of `"//"` comment keys. JSON has no comments, Vercel
validates this file against a schema, and a rejected `vercel.json` can fail a
deployment without a clear error.

Check it took effect by reading the header of a *dynamic* page — a static one is
served from the edge cache and only shows the edge:

```bash
curl -sI https://YOUR-PROJECT.vercel.app/notices | grep x-vercel-id
```

The second segment is where the code ran. It should say `sin1`.

---

## 3. Tell R2 about the new origin — easy to forget

Uploads go **browser → R2 directly**, so Cloudflare must be told the new domain
is allowed to PUT. Until this is done, publishing fails with "Failed to fetch"
and nothing in the server log explains why.

Cloudflare → R2 → `krishnadham-documents` → Settings → CORS Policy:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://YOUR-PROJECT.vercel.app"
    ],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Add the custom domain too, if one is set up later.

---

## 4. Check it, from outside

```bash
node scripts/probe-security.mjs https://YOUR-PROJECT.vercel.app
node scripts/probe-deep.mjs     https://YOUR-PROJECT.vercel.app
```

Both should come back clean. `probe-deep` trips the account lock on purpose and
removes its own attempts afterwards.

Then sign in and publish one document, to prove the R2 CORS rule took.

---

## Afterwards

Any change deploys itself:

```bash
git add -A
git commit -m "what changed"
git push
```

Vercel rebuilds in about a minute.

### Migrations

`npm run db:migrate` is for development. Against the live database use:

```bash
npm run db:deploy
```

The app and the local machine share one Neon database, so a schema change
applied locally is already live. That is fine for one society; if it ever stops
being fine, create a second Neon branch for development.

### Before residents see it

- Put the real committee names in at `/desk/committee` — they still read
  "Name Surname".
- Change the secretary password at `/desk/account`. The current one was set
  during development and is not private.
- Rotate `RESEND_API_KEY`, then update it in Vercel **and** `.env.local`.

### Known gaps, accepted by the client

- **No virus scanning on uploads.** An infected PDF will be stored and served
  as published. The likeliest real incident is a compromised attachment
  forwarded by a committee member, not an attacker.
- **No OTP step.** The login page no longer claims one.
- Resend's shared sender only delivers to the address the Resend account was
  opened with. When the sign-in address changes hands, password reset stops
  working until the society owns a domain Resend can verify.
