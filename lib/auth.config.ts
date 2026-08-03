import type { NextAuthConfig } from 'next-auth';

/**
 * The half of the auth config that must run on the edge.
 *
 * Middleware is evaluated in the edge runtime, which has no Node APIs — so it
 * cannot import Prisma or argon2. Keeping the route guard here and the
 * credential check in lib/auth.ts is what lets `/desk` be protected by
 * middleware at all. Providers are deliberately empty; lib/auth.ts adds them.
 */

/** Eight hours: a committee sitting, not a permanent session. */
const SESSION_MAX_AGE = 60 * 60 * 8;

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE,
  },
  // httpOnly and sameSite=lax are Auth.js defaults; `secure` is forced on in
  // production so the session cookie can never travel over plain HTTP.
  useSecureCookies: process.env.NODE_ENV === 'production',
  callbacks: {
    authorized({ auth, request }) {
      const onDesk = request.nextUrl.pathname.startsWith('/desk');
      if (!onDesk) return true;
      return Boolean(auth?.user);
    },
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
