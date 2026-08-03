'use server';

import { signOut } from '@/lib/auth';

/**
 * Ends the session and returns to the public site.
 *
 * A server action rather than a link, so signing out is a POST: a GET
 * sign-out can be triggered by any page that embeds the URL as an image.
 */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/' });
}
