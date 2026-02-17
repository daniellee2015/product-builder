/**
 * i18n Types
 */

export type Locale = 'en' | 'zh';

export interface I18nConfig {
  defaultLocale: Locale;
  fallbackLocale: Locale;
  locales: Locale[];
}

export interface TranslationKeys {
  [key: string]: string | TranslationKeys;
}

export interface I18nInstance {
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}
