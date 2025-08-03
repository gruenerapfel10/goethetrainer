import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { NextIntlClientProvider } from 'next-intl';
import { DM_Serif_Display } from "next/font/google"
import { cn } from "@/lib/utils"

import { ThemeProvider } from '@/components/theme-provider';

import './globals.css';
import { getLocale, getMessages } from 'next-intl/server';
import { themes } from '../types/constants';
import { LogoProvider } from '../context/logo-context';
import {cleanupStaleOperations} from "@/lib/db/queries";
import { NotificationInitializer } from '@/components/notification-initializer';
import { PageTransitionProvider } from '@/context/page-transition-context';
import { PageTransitionOverlay } from '@/components/page-transition-overlay';
import { FirebaseAuthProvider } from '@/context/firebase-auth-context';

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-dm-serif",
  weight: ["400"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL('https://mua.app'),
  title: 'MUA - Mass University Applications',
  description: 'MUA - Your smart assistant for university applications',
  openGraph: {
    title: 'MUA - Mass University Applications',
    description: 'Your smart assistant for university applications',
    url: 'https://mua.app',
    siteName: 'MUA',
    images: [
      {
        url: '/mua-logo-128x128-blue.png',
        width: 1200,
        height: 630,
        alt: 'MUA - Mass University Applications',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MUA - Mass University Applications',
    description: 'Your smart assistant for university applications',
    images: ['/mua-logo-128x128-blue.png'],
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
      <ThemeProvider
        themes={themes}
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <Toaster position="top-center" />
        <NotificationInitializer />
        <LogoProvider>
          <FirebaseAuthProvider>
            <PageTransitionProvider>
              <PageTransitionOverlay />
              {children}
            </PageTransitionProvider>
          </FirebaseAuthProvider>
        </LogoProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
    </body>
    </html>
  );
}