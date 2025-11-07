import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { NextIntlClientProvider } from 'next-intl';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/theme-provider';
import { NotificationInitializer } from '@/components/notification-initializer';
import { DeepResearchProvider } from '@/lib/deep-research-context';
import { GlobalContextMenuProvider } from '@/components/context/global-context-menu-provider';

import './globals.css';
import { getLocale, getMessages } from 'next-intl/server';
import { themes } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Moterra Chat',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head />
      <body className="min-h-screen overflow-hidden">
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <ThemeProvider themes={themes} attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
              <Toaster />
              <NotificationInitializer />
              <DeepResearchProvider>
                <GlobalContextMenuProvider>
                  {children}
                </GlobalContextMenuProvider>
              </DeepResearchProvider>
            </ThemeProvider>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
