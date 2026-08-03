import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

/**
 * Next reads `.env.local`; the Prisma CLI defaults to `.env`. Loading both,
 * local first, means one file holds the credentials and the CLI and the app
 * can never disagree about which database they are pointed at.
 */
config({ path: ['.env.local', '.env'], quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Node 24 strips TypeScript natively, so the seed needs no loader.
    seed: 'node prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
