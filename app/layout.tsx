import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

import { CurtainProvider } from '@/components/chrome/Curtain';
import Cursor from '@/components/chrome/Cursor';
import Footer from '@/components/chrome/Footer';
import Loader from '@/components/chrome/Loader';
import Nav from '@/components/chrome/Nav';
import SmoothScroll from '@/components/chrome/SmoothScroll';
import { documentCounts } from '@/lib/documents';

/**
 * Playfair Display's weight axis is 400-900. The prototype asks for 300 and the
 * browser resolves it to 400, so display type that reads "weight 300" in the
 * spec renders at 400. Loading 400/500 reproduces the prototype exactly; the
 * `font-weight: 300` declarations are kept verbatim from it.
 */
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tapovan A-1 Krishnadham Co-op. Housing Society Ltd.',
  description:
    'Notices, minutes and redevelopment papers, published by the committee and kept in the open.',
};

export const viewport: Viewport = {
  themeColor: '#17342C',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const counts = await documentCounts();

  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body>
        <CurtainProvider>
          <Loader />
          <SmoothScroll />
          <Cursor />
          <Nav counts={counts} />
          <main data-page style={{ minHeight: '100vh' }}>
            {children}
          </main>
          <Footer />
        </CurtainProvider>
      </body>
    </html>
  );
}
