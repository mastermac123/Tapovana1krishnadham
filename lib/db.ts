import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/lib/generated/prisma/client';

/**
 * One Prisma client for the process, constructed on first use.
 *
 * Lazy on purpose: `next build` imports every route module to collect page
 * data, so a client built at module scope would demand DATABASE_URL at build
 * time — failing the build on any machine that has not yet been given the
 * credentials. Deferring to first query means only code that actually talks to
 * the database needs them.
 *
 * The instance is stashed on globalThis because Next's dev server re-evaluates
 * modules on every hot reload, and a fresh pool per reload would exhaust the
 * database's connection limit.
 *
 * Prisma 7 requires a driver adapter. `@prisma/adapter-pg` speaks plain
 * Postgres over TCP, so this works against Neon's pooled URL today and against
 * any other Postgres if the society ever moves host.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env.local and fill in the Neon connection string.'
    );
  }

  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }
  return client;
}

function client(): PrismaClient {
  return globalForPrisma.prisma ?? createClient();
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const value = Reflect.get(client(), prop, receiver);
    return typeof value === 'function' ? value.bind(client()) : value;
  },
});
