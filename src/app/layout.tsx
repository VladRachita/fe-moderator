'use client';

import type { Metadata } from "next";
import { Spline_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/ui/Header";

const splineSans = Spline_Sans({ subsets: ["latin"] });

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
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
      </head>
      <body className={`${splineSans.className} bg-white text-black`}>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}