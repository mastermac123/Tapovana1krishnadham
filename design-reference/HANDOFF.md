# Tapovan A-1 Krishnadham — Claude Code build handoff

Source of truth for design: `Design System.dc.html` (spec) and `Krishnadham.dc.html`
(working prototype: markup, motion, page flow). Build the production site to match
these exactly. Do not redesign.

---

## 0. How to use this with Claude Code

1. Download this project (Design System.dc.html, Krishnadham.dc.html, HANDOFF.md,
   uploads/) and put the folder next to where the Next.js app will live.
2. `cd` into that folder and run `claude`.
3. First prompt to Claude Code:

   > Read HANDOFF.md, then Krishnadham.dc.html and Design System.dc.html.
   > Scaffold the Next.js 15 app described in HANDOFF.md section 2.
   > Build ONLY the shell + tokens + Nav + Footer first; stop and show me.

4. Then work section by section, in this order:
   Shell/tokens → Nav + dropdown → Loader → Home → Notice board → About →
   Committee → Contact → Login → Secretary desk → Prisma/upload → hardening.

   One prompt per step. Never ask for the whole site in one go.

5. Useful standing instruction to give Claude Code:

   > Every visual value (colour, size, spacing, easing, duration) must come from
   > Krishnadham.dc.html. If a value is not in that file, ask me — do not invent it.

Put that same rule in `CLAUDE.md` at the repo root so it persists across sessions.

---

## 1. Stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · GSAP · Lenis ·
Prisma + PostgreSQL · NextAuth (credentials) · Cloudinary (PDF storage) · argon2

Tailwind is for layout utilities only. All colour/type/spacing come from the tokens
in section 3 — no default Tailwind palette, no default font stack, no shadcn styling.

---

## 2. Route map

```
app/
  layout.tsx              root: fonts, tokens, Lenis, cursor, curtain, nav, footer
  page.tsx                Home
  about/page.tsx          About us
  committee/page.tsx      Committee members
  notices/page.tsx        Notice board (?type=all|circular|quotation|minutes)
  contact/page.tsx        Contact
  login/page.tsx          Secretary login (no nav, no footer)
  desk/
    layout.tsx            sidebar shell, auth-guarded
    [type]/page.tsx       circulars | quotations | minutes
  api/
    documents/route.ts        GET list, POST create (auth)
    documents/[id]/route.ts   PATCH, DELETE (auth)
    auth/[...nextauth]/route.ts
components/
  chrome/Nav.tsx NoticeMenu.tsx Footer.tsx Loader.tsx Curtain.tsx Cursor.tsx
  ui/ButtonSolid.tsx ButtonGhost.tsx LinkRule.tsx CommitteeCard.tsx
     DocumentRow.tsx Field.tsx ImageBand.tsx
  motion/Reveal.tsx useParallax.ts useMagnetic.ts
lib/
  motion.ts   eases + durations
  db.ts auth.ts cloudinary.ts
```

Prototype → route mapping (search these strings in `Krishnadham.dc.html`):

| Prototype block | Production file |
|---|---|
| `sc-if value="{{ isHome }}"` | `app/page.tsx` |
| `sc-if value="{{ isAbout }}"` | `app/about/page.tsx` |
| `sc-if value="{{ isCommittee }}"` | `app/committee/page.tsx` |
| `sc-if value="{{ isDocs }}"` | `app/notices/page.tsx` |
| `sc-if value="{{ isContact }}"` | `app/contact/page.tsx` |
| `sc-if value="{{ isLogin }}"` | `app/login/page.tsx` |
| `sc-if value="{{ isDesk }}"` | `app/desk/[type]/page.tsx` |
| `data-nav` block | `components/chrome/Nav.tsx` |
| `menuItems` dropdown | `components/chrome/NoticeMenu.tsx` |
| `data-loader` block | `components/chrome/Loader.tsx` |
| `data-curtain` | `components/chrome/Curtain.tsx` |
| `data-cursor-ring/dot` | `components/chrome/Cursor.tsx` |

---

## 3. Tokens

```css
/* app/globals.css */
@theme {
  --color-ivory:    #F8F6F1;
  --color-forest:   #17342C;
  --color-forest-deep: #0F211C;
  --color-champagne:#B08D57;
  --color-charcoal: #242424;
  --color-white:    #FFFFFF;
  --color-muted:    #5C5A55;   /* secondary text */
  --color-rule:     #E2DDD2;   /* hairlines on ivory */
  --color-card-rule:#E9E4D9;   /* card borders */

  --font-display: 'Playfair Display', serif;   /* 300 / 400 */
  --font-body:    'Inter', sans-serif;         /* 300 / 400 / 500 */
}
```

Type scale (all display weights 300 unless noted):

| Role | Size | Line | Tracking |
|---|---|---|---|
| Display XL (hero h1) | `clamp(46px, 7.2vw, 104px)` | 0.96 | −0.02em |
| Display L (page h1) | `clamp(42px, 6.4vw, 92px)` | 0.98 | −0.02em |
| Display M (section h2) | `clamp(34px, 4.45vw, 64px)` | 1.06 | −0.015em |
| Display S (row/card title) | 30–32px, weight 400 | 1.2 | 0 |
| Body L | 19px, weight 300 | 1.8 | 0 |
| Body | 16.5px, weight 300 | 1.85 | 0 |
| Small | 14px, weight 300 | 1.75 | 0 |
| Label | 11–11.5px, weight 500, uppercase | 1 | 0.24–0.30em |

Spacing: base unit 8. Section padding
`clamp(96px, 12.5vw, 180px) clamp(24px, 7.2vw, 104px)`. Gutter 32. Grid 12 columns.
Text columns never exceed 6 of 12 (~68ch).

Rules: gold is accent only (<3% of a screen), never body text. Never pure black.
No blue. No gradient beyond a single-value shade.

---

## 4. Motion

```ts
// lib/motion.ts
export const EASE = {
  reveal:     'expo.out',      // 1.2–1.4s  content entrances
  transition: 'expo.inOut',    // 0.6–1.3s  curtain, loader lift, menu clip
  hover:      'power3.out',    // 0.45–0.7s interruptible
  scrub:      'none',          // scroll-linked
} as const;
```

Only `transform`, `clip-path`, `opacity` animate. No `back`/`elastic`, no bounce.
Honour `prefers-reduced-motion`: skip loader, land every element composed.

The six movements (all implemented in `Krishnadham.dc.html` — port them, don't
reinvent):

1. **Curtain reveal** — block enters `clip-path: inset(0 0 100% 0)` + `y:20` →
   `inset(0 0 -14% 0)`, `y:0`, 1.25s expo.out, children staggered 0.07s.
2. **Word rise** — headings are pre-split in markup into
   `<span overflow:hidden><span data-w>word</span></span>`; animate `yPercent 118→0`,
   stagger 0.055. **Split in JSX at build time, never by mutating the DOM** — that was
   a real bug in the prototype.
3. **Image drift** — layer `yPercent -amp → +amp`, `scale 1.12 → 1.02`, scroll-scrubbed.
4. **Fill slide** — button ground `yPercent 101 → 0` on hover; arrow `x: 0 → 8`.
5. **Rule draw** — underline `scaleX 0 → 1`, origin left, 0.6s.
6. **Settle** — cards lift `y: -6` + soft shadow, 0.7s power3.out.

Loader (5.3s total, then unmount): mark fades in from `scale 1.08` over 3.4s →
wordmark lines rise (stagger 0.16) → 240px gold line `scaleX 0→1` over 2.3s →
all fade → overlay lifts `clip-path inset(0 0 100% 0)` expo.inOut.
**Drive unmount from an independent timer, not the timeline callback.**

Page transition: forest curtain `scaleY 0→1` (origin bottom, 0.62s) → swap route →
`scaleY 1→0` (origin top, 0.72s). No white flash.

Cursor: 5px dot follows at 0.1s, 38px ring trails at 0.55s; ring `scale 1.9` +
gold border over interactive elements; both invert over forest panels. Desktop only —
disable under `(hover: none)`.

Nav: transparent over hero; frosts (`rgba(248,246,241,0.82)` + `blur(18px)`, ink to
charcoal) past 80px scroll, on any non-home route, or while the dropdown is open.

Notice-board dropdown: full-width frosted panel, `clip-path inset(100% 0 0 0) → inset(0)`
0.7s expo.inOut, four cards (All papers / Circulars / Redevelopment quotations /
Meeting minutes) with live counts. Closes on outside click, Escape, or navigation;
selection routes to `/notices?type=…`.

---

## 5. Data

```prisma
enum DocType { CIRCULAR QUOTATION MINUTES }

model Document {
  id          String   @id @default(cuid())
  type        DocType
  title       String
  description String
  fileUrl     String   // Cloudinary
  fileName    String
  fileSize    Int
  uploadedAt  DateTime @default(now())   // date + time shown on the row
  updatedAt   DateTime @updatedAt
  @@index([type, uploadedAt])
}

model CommitteeMember {
  id          String @id @default(cuid())
  name        String
  designation String
  flatNumber  String
  order       Int
}

model Secretary {
  id           String  @id @default(cuid())
  email        String  @unique
  passwordHash String            // argon2id
  otpSecret    String?
}

model LoginAttempt {
  id        String   @id @default(cuid())
  ip        String
  email     String?
  success   Boolean
  createdAt DateTime @default(now())
  @@index([ip, createdAt])
}
```

Documents are permanent: no expiry, no archive. Only the secretary deletes.
Notice board sorts all three types together, newest first, each row tagged with its
category; `?type=` filters.

---

## 6. Security (login page + desk)

argon2id hashing · NextAuth JWT in httpOnly + secure + sameSite=lax cookie ·
OTP step after password · CSRF tokens on every mutation · Zod validation on all
input · rate limit 5/min per IP on `/api/auth` · **3 consecutive failures from an IP
= 30 minute block** · every attempt and every password reset written to `LoginAttempt` ·
uploads restricted to `application/pdf`, max 25 MB, magic-byte checked, stored on
Cloudinary (never the app filesystem) · desk routes guarded in middleware.

---

## 7. Still needed from the client

Registration number · registered address · secretary phone · watchman phone ·
society email · real committee names/designations/flats · architectural photographs
(hero, courtyard, entrance detail — the prototype marks each placeholder position).

---

## 8. Definition of done per page

- Matches the prototype at 1440, 1280 and 375 (prototype is already fluid via `clamp`).
- All six movements present, 60fps, nothing stutters.
- No console errors; `prefers-reduced-motion` lands composed.
- Lighthouse a11y ≥ 95; every interactive element keyboard-reachable with a visible
  focus state (the custom cursor must not be the only affordance).
