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
