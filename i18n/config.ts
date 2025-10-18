export type Locale = (typeof locales)[number];

export const locales = ['en', 'lt', 'de'] as const;
export const defaultLocale: Locale = 'en';
