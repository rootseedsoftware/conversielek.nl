import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import AuthBar from './components/AuthBar';
import AppFooter from './components/AppFooter';
import CookieBanner from './components/CookieBanner';
import ThemeScript from './components/ThemeScript';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Conversielek — Nederlandse Webshop UX Audit',
  description:
    'Upload screenshots van je webshop en krijg een conversie-gerichte audit met Nederlandse microcopy, iDEAL/Klarna checks en NL-benchmarks.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        <AuthBar />
        {children}
        <AppFooter />
        <CookieBanner />
      </body>
    </html>
  );
}
