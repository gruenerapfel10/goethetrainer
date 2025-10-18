import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { NextIntlClientProvider } from 'next-intl';
import { DM_Serif_Display } from "next/font/google"
import { cn } from "@/lib/utils"

import { ThemeProvider } from '@/components/theme-provider';

import './globals.css';
import { getLocale, getMessages } from 'next-intl/server';
import { SessionProvider } from 'next-auth/react';
import { themes } from '@/lib/constants';
import { NotificationInitializer } from '@/components/notification-initializer';
import { DeepResearchProvider } from '@/lib/deep-research-context';

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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Moterra Chat',
  },
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
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Disable auto-zoom on mobile Safari
  viewportFit: 'cover', // Enable safe area insets for notch/status bar
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

export default async function RootLayout({
                                           children,
                                         }: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

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
          <Toaster 
            position="top-center" 
            toastOptions={{
              classNames: {
                toast: 'rounded-[20px] text-primary border border-border/50 backdrop-blur-sm bg-background/95 shadow-xl',
                title: 'font-medium text-primary',
                description: 'text-primary',
                error: 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700',
                success: 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700',
                warning: 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700',
                info: 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700',
              }
            }}
          />
          <NotificationInitializer />
          <DeepResearchProvider>
            {children}
          </DeepResearchProvider>
        </ThemeProvider>
      </SessionProvider>
    </NextIntlClientProvider>
    </body>
    </html>
  );
}