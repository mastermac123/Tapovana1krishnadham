import { config } from 'dotenv';
import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
// Prisma 7 emits TypeScript, and Node 24 strips types natively — so this is
// a .ts import, not the .js one you would write against an older generator.
import { PrismaClient } from '../lib/generated/prisma/client.ts';

config({ path: ['.env.local', '.env'], quiet: true });

/**
 * Seeds the two things the site cannot start without: the managing committee
 * and the single secretary account.
 *
 * Documents are deliberately NOT seeded. Every Document row implies a real
 * object in the R2 bucket, and a row without one is a broken download on the
 * public notice board. The board starts empty and fills as the secretary
 * publishes.
 *
 * Safe to re-run: committee members are matched on designation + flat, and the
 * secretary on email.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env.local and fill in the Neon connection string.'
  );
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/**
 * OWASP Password Storage Cheat Sheet, argon2id: 19 MiB, t=2, p=1.
 * These must stay in step with the verify side in lib/auth.
 */
const ARGON2 = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** TODO(client): real names still owed — HANDOFF.md section 7. */
const COMMITTEE = [
  { designation: 'Chairman', name: 'Name Surname', flatNumber: 'Flat A-1 / 704' },
  { designation: 'Secretary', name: 'Name Surname', flatNumber: 'Flat A-1 / 502' },
  { designation: 'Treasurer', name: 'Name Surname', flatNumber: 'Flat A-1 / 301' },
  { designation: 'Member', name: 'Name Surname', flatNumber: 'Flat A-1 / 205' },
  { designation: 'Member', name: 'Name Surname', flatNumber: 'Flat A-1 / 903' },
  { designation: 'Member', name: 'Name Surname', flatNumber: 'Flat A-1 / 1102' },
];

async function seedCommittee() {
  let created = 0;
  for (const [i, member] of COMMITTEE.entries()) {
    const existing = await db.committeeMember.findFirst({
      where: { designation: member.designation, flatNumber: member.flatNumber },
    });
    if (existing) {
      await db.committeeMember.update({
        where: { id: existing.id },
        data: { ...member, order: i },
      });
    } else {
      await db.committeeMember.create({ data: { ...member, order: i } });
      created += 1;
    }
  }
  console.log(`committee: ${COMMITTEE.length} members (${created} new)`);
}

async function seedSecretary() {
  const email = process.env.SEED_SECRETARY_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_SECRETARY_PASSWORD;

  if (!email || !password) {
    console.log(
      'secretary: skipped — set SEED_SECRETARY_EMAIL and SEED_SECRETARY_PASSWORD in .env.local'
    );
    return;
  }

  if (password.length < 12) {
    throw new Error(
      'SEED_SECRETARY_PASSWORD must be at least 12 characters. This account can publish and delete every document on the site.'
    );
  }

  /**
   * There is one secretary, and this seeds it only when none exists.
   *
   * Matching on the seeded email is not enough: the secretary can change their
   * own address at /desk/account, which leaves SEED_SECRETARY_EMAIL stale — and
   * a re-seed would then quietly create a *second* account able to publish and
   * delete everything. Counting is the check that cannot go wrong.
   */
  const count = await db.secretary.count();
  if (count > 0) {
    const existing = await db.secretary.findFirst({ select: { email: true } });
    console.log(
      `secretary: ${existing?.email} already exists — leaving it alone.\n` +
        '           To change it: node scripts/set-secretary-email.mjs <address>'
    );
    return;
  }

  await db.secretary.create({
    data: { email, passwordHash: await hash(password, ARGON2) },
  });
  console.log(`secretary: created ${email}`);
}

async function main() {
  await seedCommittee();
  await seedSecretary();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
