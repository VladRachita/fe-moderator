/* eslint-disable @next/next/no-page-custom-font */
'use client';

import { usePathname } from 'next/navigation';
import { Spline_Sans } from 'next/font/google';
import './globals.css';
import Header from '@/components/ui/Header';

const HEADER_VISIBLE_ROUTES = ['/dashboard', '/analytics'];

const splineSans = Spline_Sans({ subsets: ['latin'], display: 'optional' });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const showHeader = HEADER_VISIBLE_ROUTES.some((route) => pathname.startsWith(route));

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
        {showHeader && <Header />}
        <main>{children}</main>
      </body>
    </html>
  );
}
