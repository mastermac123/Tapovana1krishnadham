import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import DeskSidebar from '@/components/desk/DeskSidebar';
import { auth, passwordFingerprint } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Prototype `sc-if value="{{ isDesk }}"` — the sidebar shell.
 * The public nav stays (the prototype's desk sits under it, hence the 130px
 * top padding on the sidebar); the footer does not.
 *
 * Middleware already turns anonymous visitors away. What it cannot do is
 * notice that a *valid* session belongs to a password that has since been
 * changed: the guard runs on the edge, where there is no database.
 *
 * So the second half of the check lives here. Without it, "change the
 * password" does not do the one thing anyone changes a password for — a
 * session taken from a shared committee laptop keeps working for the rest of
 * its eight hours, while the secretary believes they have just closed the door.
 * One indexed read per desk page is a fair price for that.
 */

export const metadata: Metadata = {
  title: 'Secretary’s desk — Tapovan A-1 Krishnadham',
  robots: { index: false, follow: false },
};

export default async function DeskLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const secretary = await db.secretary.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  // Account gone, or the password has moved on since this token was issued.
  if (!secretary || passwordFingerprint(secretary.passwordHash) !== session.user.pv) {
    redirect('/login?stale=1');
  }

  return (
    <div className="desk">
      <DeskSidebar />
      <div className="desk__main">{children}</div>
    </div>
  );
}
