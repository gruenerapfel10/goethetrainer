import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { NextIntlClientProvider } from 'next-intl';
import { DM_Serif_Display } from "next/font/google"
import { cn } from "@/lib/utils"

import { ThemeProvider } from '@/components/theme-provider';

import './globals.css';
import { getLocale, getMessages } from 'next-intl/server';
import { SessionProvider } from 'next-auth/react';
import { themes } from '../types/constants';
import { LogoProvider } from '../context/logo-context';
import {cleanupStaleOperations} from "@/lib/db/queries";
import { NotificationInitializer } from '@/components/notification-initializer';

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-dm-serif",
  weight: ["400"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL('https://chat.moterra.co.uk'),
  title: 'Moterra Chat',
  description: 'Moterra Chat - AI-powered assistant for your business',
  openGraph: {
    title: 'Moterra Chat',
    description: 'AI-powered assistant for your business',
    url: 'https://chat.moterra.co.uk',
    siteName: 'Moterra Chat',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Moterra Chat',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Moterra Chat',
    description: 'AI-powered assistant for your business',
    images: ['/twitter-image.png'],
  },
};

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

const LIGHT_THEME_COLOR = 'hsl(0 0% 100%)';
const DARK_THEME_COLOR = 'hsl(240deg 10% 3.92%)';
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

let hasRunCleanup = false;

export default async function RootLayout({
                                           children,
                                         }: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  if (!hasRunCleanup) {
    await cleanupStaleOperations();
    hasRunCleanup = true;
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();
  return (
    <html
      lang={locale}
      // `next-themes` injects an extra classname to the body element to avoid
      // visual flicker before hydration. Hence the `suppressHydrationWarning`
      // prop is necessary to avoid the React hydration mismatch warning.
      // https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
      suppressHydrationWarning
    >
    <head>
      <script
        dangerouslySetInnerHTML={{
          __html: THEME_COLOR_SCRIPT,
        }}
      />
    </head>
    <body className={cn(
      "min-h-screen bg-background font-sans antialiased",
      dmSerif.variable
    )}>
    <NextIntlClientProvider messages={messages}>
      <SessionProvider>
        <ThemeProvider
          themes={themes}
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster position="top-center" />
          <NotificationInitializer />
          <LogoProvider>{children}</LogoProvider>
        </ThemeProvider>
      </SessionProvider>
    </NextIntlClientProvider>
    </body>
    </html>
  );
}