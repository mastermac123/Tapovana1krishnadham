import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import DeskSidebar from '@/components/desk/DeskSidebar';

/**
 * Prototype `sc-if value="{{ isDesk }}"` — the sidebar shell.
 * The public nav stays (the prototype's desk sits under it, hence the 130px
 * top padding on the sidebar); the footer does not.
 *
 * TODO(phase 2): guard this segment in middleware — HANDOFF.md section 6.
 */

export const metadata: Metadata = {
  title: 'Secretary’s desk — Tapovan A-1 Krishnadham',
  robots: { index: false, follow: false },
};

export default function DeskLayout({ children }: { children: ReactNode }) {
  return (
    <div className="desk">
      <DeskSidebar />
      <div className="desk__main">{children}</div>
    </div>
  );
}
