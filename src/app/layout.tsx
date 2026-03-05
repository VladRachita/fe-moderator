import type { Metadata } from 'next';
import { Spline_Sans } from 'next/font/google';
import './globals.css';
import HeaderWrapper from '@/components/ui/HeaderWrapper';
import { validateEnv } from '@/lib/env-check';

validateEnv();

export const metadata: Metadata = {
  title: 'Moderator Dashboard',
  description: 'Internal moderation panel',
};

const splineSans = Spline_Sans({ subsets: ['latin'], display: 'optional' });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&display=optional"
          rel="stylesheet"
        />
      </head>
      <body className={`${splineSans.className} bg-white text-black`}>
        <HeaderWrapper />
        <main>{children}</main>
      </body>
    </html>
  );
}
