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

/**
 * Reading a property must never be what fails.
 *
 * `next build` inspects route modules to collect page data, and that
 * inspection reads properties off whatever they export — `.tags`, `.then`,
 * assorted symbols. Every one of those reads lands in this trap, and a trap
 * that builds a client to answer them turns "DATABASE_URL is absent" into a
 * failed build on pages that never touch the database. That is what broke the
 * first deploy: the error surfaced while prerendering /_not-found.
 *
 * So construction is deferred one step further. Probing is answered without a
 * client; only actually calling something demands one, and then the error
 * arrives at the query that needed it, naming the variable that is missing.
 */
function configured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Stands in for any depth of `db.model.method`, and names the real problem. */
function unconfiguredStub(path: string): unknown {
  const fail = () => {
    throw new Error(
      `DATABASE_URL is not set, so ${path}() cannot run.\n` +
        '  Locally:  copy .env.example to .env.local and fill in the Neon ' +
        'connection string.\n' +
        '  On Vercel: Settings → Environment Variables → add DATABASE_URL, ' +
        'then redeploy.'
    );
  };

  return new Proxy(fail, {
    get(_t, next) {
      if (typeof next === 'symbol') return undefined;
      return unconfiguredStub(`${path}.${String(next)}`);
    },
    apply: fail,
  });
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (!configured() && !globalForPrisma.prisma) {
      // Symbols and `then` are how the runtime asks "are you a thenable, an
      // iterator, a primitive?". Answering undefined keeps `await`, spread and
      // console.log honest instead of throwing during a build.
      if (typeof prop === 'symbol') return undefined;

      // Anything else may be a real call, and calls are nested:
      // db.document.groupBy(). Returning a plain function makes the second
      // step a bare "not a function" TypeError that says nothing about the
      // real cause, so hand back something that survives any depth of
      // property access and explains itself the moment it is invoked.
      return unconfiguredStub(String(prop));
    }

    const value = Reflect.get(client(), prop, receiver);
    return typeof value === 'function' ? value.bind(client()) : value;
  },
});
