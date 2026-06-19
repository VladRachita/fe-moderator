import type { Metadata } from 'next';
import { Inter, Geist } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import HeaderWrapper from '@/components/ui/HeaderWrapper';
import { validateEnv } from '@/lib/env-check';

validateEnv();

export const metadata: Metadata = {
  title: 'Moderator Dashboard',
  description: 'Internal moderation panel',
  // src/app/favicon.ico auto-covers legacy /favicon.ico; these add the sized
  // PNGs, the iOS home-screen icon, and the PWA manifest from public/favicon_io.
  icons: {
    icon: [
      { url: '/favicon_io/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon_io/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon_io/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon_io/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: { url: '/favicon_io/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  },
  manifest: '/favicon_io/site.webmanifest',
};

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // V2.5: read the per-request CSP nonce that proxy.ts middleware attaches
  // as `x-nonce`. The act of awaiting headers() opts this layout (and every
  // child route) into dynamic rendering — necessary because static-prerender
  // emits framework <script> tags whose nonce was unknown at build time and
  // would not match the per-request `Content-Security-Policy` header. Next.js
  // automatically injects the nonce into its framework script tags when the
  // CSP header is set on the request (see proxy.ts:79). The nonce is also
  // surfaced as a `data-nonce` attribute so a future Server Component that
  // renders a `<Script>` tag has an obvious place to read it from.
  const nonce = (await headers()).get('x-nonce') ?? '';
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
      <body className={`${inter.variable} ${geist.variable} bg-background text-on-background antialiased min-h-screen flex flex-col font-body-md`} data-nonce={nonce}>
        <HeaderWrapper />
        <main className="flex flex-col flex-grow">{children}</main>
      </body>
    </html>
  );
}
