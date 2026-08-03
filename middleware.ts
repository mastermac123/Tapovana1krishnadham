import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

/**
 * Guards `/desk` — HANDOFF.md section 6.
 *
 * Uses the edge-safe half of the config only. An unauthenticated request is
 * redirected to /login by the `authorized` callback, so a desk page is never
 * rendered, not even briefly, without a session.
 */
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  /**
   * Everything except Next internals, the auth endpoints themselves and static
   * files. Matching narrowly keeps the middleware off the public pages, which
   * are prerendered and have nothing to protect.
   */
  matcher: ['/desk/:path*'],
};
