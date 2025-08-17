export type Locale = (typeof locales)[number];

export const locales = ['en', 'lt', 'ru'] as const;
export const defaultLocale: Locale = 'en';
