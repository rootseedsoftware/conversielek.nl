import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import AuthBar from './components/AuthBar';
import AppFooter from './components/AppFooter';
import CookieBanner from './components/CookieBanner';
import ThemeScript from './components/ThemeScript';
import { company } from '@/lib/data/company';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const siteTitle = 'Conversielek — Nederlandse Webshop UX Audit';
const siteDescription =
  'Upload screenshots van je webshop en krijg binnen 30 seconden een AI-audit met Nederlandse microcopy-suggesties, iDEAL/Klarna checks, cookie-banner compliance en benchmarks tegen bol.com en Coolblue.';

export const metadata: Metadata = {
  metadataBase: new URL(company.url),
  title: {
    default: siteTitle,
    template: `%s — ${company.tradeName}`,
  },
  description: siteDescription,
  keywords: [
    'webshop UX audit',
    'conversie optimalisatie',
    'e-commerce audit Nederland',
    'iDEAL checkout',
    'AVG cookie banner check',
    'Nederlandse microcopy',
    'webshop optimalisatie',
    'CRO tool',
  ],
  authors: [{ name: company.legalName, url: company.url }],
  creator: company.legalName,
  publisher: company.legalName,
  applicationName: company.tradeName,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'nl_NL',
    url: company.url,
    siteName: company.tradeName,
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: `${company.tradeName} — Nederlandse Webshop UX Audit`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'technology',
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
