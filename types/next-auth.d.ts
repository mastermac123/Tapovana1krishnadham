import 'next-auth';
import 'next-auth/jwt';

/**
 * The session carries a fingerprint of the password it was issued against.
 *
 * Sessions here are JWTs, which means the server keeps no list of live sessions
 * and therefore has nothing to revoke. Carrying a fingerprint gives the desk a
 * way to notice that the password has changed since a token was minted, and to
 * refuse it — which is what makes "change the password" actually evict someone.
 *
 * It is a hash of the stored hash, never the hash itself.
 */
declare module 'next-auth' {
  interface User {
    pv?: string;
  }
  interface Session {
    user: {
      id: string;
      email?: string | null;
      pv?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    pv?: string;
  }
}
