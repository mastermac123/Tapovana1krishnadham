# Tapovan A-1 Krishnadham

Production site for the society. Source of truth for design lives in
`design-reference/`:

- `design-reference/HANDOFF.md` — the build brief (stack, routes, tokens, motion, data, security)
- `design-reference/Krishnadham.dc.html` — the working prototype: markup, motion, page flow
- `design-reference/Design System.dc.html` — the spec: palette, type, grid, motion, components

## Standing rule

> Every visual value (colour, size, spacing, easing, duration) must come from
> `design-reference/Krishnadham.dc.html`. If a value is not in that file, ask —
> do not invent it.

Do not redesign. Match the prototype at 1440, 1280 and 375.

## Conventions

- Tailwind v4 is for **layout utilities only**. All colour/type/spacing come from the
  tokens in `app/globals.css` (`@theme`). No default Tailwind palette, no default font
  stack, no shadcn styling.
- Headings are word-split **in JSX at build time** (`components/motion/WordRise.tsx`),
  never by mutating the DOM after render — that was a real bug in the prototype.
- Only `transform`, `clip-path` and `opacity` animate. Eases and durations come from
  `lib/motion.ts`. No `back`/`elastic`, no bounce.
- `prefers-reduced-motion` must land every page fully composed (no loader, no reveals).
- Typographic glyphs (non-breaking hyphen U+2011, em dash, curly quotes) are written as
  HTML entities (`&#8209;`, `&mdash;`) in **JSX text**. Entities are NOT decoded inside
  JSX string attributes — pass those as literals in a `{'...'}` expression instead.
- Source files are UTF-8. Never bulk-edit them with PowerShell `Get-Content`/`Set-Content`
  on this machine — it silently corrupts non-ASCII characters. Use an editor/Write tool.

## Responsive

The prototype was authored at 1440 only (`$preview: {width: 1440}`), so it has no
mobile or tablet chrome to copy. The breakpoints below re-flow the prototype's own
values — they introduce no new colour, size, tracking, easing or duration. Chrome
styles live in the CHROME block of `app/globals.css` so they can carry media queries.

| Range | Behaviour |
|---|---|
| >= 1024px | Exactly as the prototype draws it |
| 900-1023 | Full nav retained; notice menu drops to 2 columns; footer stacks |
| < 900px | Nav collapses to brand + Menu toggle, opening the stacked panel |
| < 768px | Notice cards go single-column inside the panel |

900 is the collapse point because the five nowrap links need 274px and a 768 portrait
tablet leaves 260px once the scrollbar is counted. `MOBILE_MAX` in
`components/chrome/Nav.tsx` must stay in step with that media query.

## Motion architecture

Three module-level registries keep the prototype's behaviour without its
global rAF loop:

- `components/motion/Reveal.tsx` — one `IntersectionObserver` for the whole
  page. Its `rootMargin: '60px 0px -10% 0px'` reproduces the prototype's
  `rect.top < vh*0.9 && rect.bottom > -60` test exactly. Blocks entering
  together keep the 0.08s queue stagger (capped at 0.4s).
- `components/motion/useParallax.ts` — one rAF loop for every drifting layer.
- `lib/intro.ts` — the loader/hero handoff. Whoever finishes first calls
  `introDone()`; every waiter runs once.

`Reveal` animates a block's **direct children**, staggered 0.07s: a child
`h1`/`h2` containing `<WordRise>` rises its words, anything else curtains in.
That mirrors `wire()` in the prototype — keep the markup nesting it expects.

Two independent timers exist on purpose and must not be folded into their
timelines: `Loader`'s 5.3s unmount and `Hero`'s 3.6s land. A timeline that
never completes must not be able to strand the page.

## Build order

Shell/tokens -> Nav + dropdown -> Loader -> Home -> Notice board -> About ->
Committee -> Contact -> Login -> Secretary desk -> Prisma/upload -> hardening.

Everything through Secretary desk is **built (frontend only)**. Phase 2
(Prisma, auth, upload) has not started — the places it plugs in are marked
`TODO(phase 2)` / `TODO(prisma)` / `TODO(client)` in the source.

## Client decisions that override HANDOFF.md

- **Storage is Cloudflare R2, not Cloudinary.** HANDOFF.md sections 1 and 6 say
  Cloudinary; the client chose R2. Private buckets, signed upload and download
  URLs, metadata only in Postgres.
- **No telephone numbers are published.** The prototype's secretary and
  watchman rows are gone; contact carries the registered address and the
  society email, and its heading reads "Two ways to reach us."
- **The secretary maintains the committee list** from `/desk/committee`.
- **Deletion is recoverable, not permanent.** HANDOFF.md §5 reads as a hard
  delete. These are the society's legal records, so a delete marks the row
  hidden and leaves the R2 object in place, with bucket versioning as a second
  net. Nothing is erased without a deliberate, separate purge.
- **Uploads cap at 200 MB** (HANDOFF.md §6 said 25 MB), PDF/DOCX/images,
  magic-byte checked rather than trusting the extension. Files go **browser →
  R2 directly** via a signed URL: routing them through the app server would cap
  uploads at the platform's request-body limit (4.5 MB on Vercel).
- Registration number `MUM/W-P/HSG/TC/11827/2002-03`; registered address
  Rani Sati Marg Extension, W.E. Highway, Malad (E).
- One photograph, `public/building.jpg`, serves the hero, courtyard and
  entrance positions. `lib/photos.ts` checks it exists server-side, so a
  missing file falls back to the prototype's weave rather than 404ing.

## Phase 2 progress

Written but **not yet run against real infrastructure** — no database or R2
credentials exist on this machine:

- `prisma/schema.prisma`, `lib/db.ts`, `prisma/seed.ts` — no migration applied
- `lib/r2.ts`, `lib/uploads.ts` — magic-byte sniffing unit-tested, R2 calls untested
- `lib/auth.ts`, `lib/auth.config.ts`, `lib/rate-limit.ts`, `middleware.ts`,
  `app/login/actions.ts` — sign-in untested

Still to build: the documents API (signed upload, verify, publish, delete),
committee persistence, public pages reading from the database, OTP, and
password reset.

`LoginAttempt` is the only table that grows without a ceiling — a bot hitting
the login page writes a row per try. Prune to the last 90 days: long enough to
investigate an incident, bounded forever. Document and CommitteeMember rows are
roughly 1 KB each, so they are not a capacity concern at any realistic rate.

`lib/db.ts` builds its client **lazily**. `next build` imports every route
module to collect page data, so a client constructed at module scope makes the
build demand DATABASE_URL. Do not "simplify" it back to a top-level `new
PrismaClient()`.

`next build` prints an edge-runtime warning about `DecompressionStream` from
`jose`, reached through next-auth in middleware. It is a known Auth.js v5
warning, not an error — that code path is only used for encrypted JWEs, which
this app does not issue.

## Verifying

`prefers-reduced-motion` and scroll reveals cannot be checked from a headless
or non-compositing browser: `IntersectionObserver` and rAF only run while the
page composites frames, so reveals stay clipped and only the fail-safe timers
fire. Check motion in a real visible browser window.
