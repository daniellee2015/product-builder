/**
 * i18n System
 */

import { Locale, I18nConfig, I18nInstance, TranslationKeys } from './types';
import { loadLocale, getNestedValue, replaceVariables } from './loader';

const defaultConfig: I18nConfig = {
  defaultLocale: 'en',
  fallbackLocale: 'en',
  locales: ['en', 'zh']
};

class I18n implements I18nInstance {
  private currentLocale: Locale;
  private config: I18nConfig;
  private translations: TranslationKeys = {};

  constructor(config: Partial<I18nConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.currentLocale = this.config.defaultLocale;
    this.loadTranslations();
  }

  private loadTranslations(): void {
    this.translations = loadLocale(this.currentLocale);
  }

  get locale(): Locale {
    return this.currentLocale;
  }

  setLocale(locale: Locale): void {
    if (!this.config.locales.includes(locale)) {
      console.warn(`Locale ${locale} is not supported. Using ${this.config.defaultLocale}`);
      return;
    }

    this.currentLocale = locale;
    this.loadTranslations();
  }

  t(key: string, params?: Record<string, string | number>): string {
    let value = getNestedValue(this.translations, key);

    // Fallback to fallback locale if key not found
    if (!value && this.currentLocale !== this.config.fallbackLocale) {
      const fallbackTranslations = loadLocale(this.config.fallbackLocale);
      value = getNestedValue(fallbackTranslations, key);
    }

    // Return key if translation not found
    if (!value) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }

    // Replace variables if params provided
    if (params) {
      return replaceVariables(value, params);
    }

    return value;
  }
}

// Create singleton instance
const i18n = new I18n();

// Export singleton instance and factory
export default i18n;
export { I18n };
export * from './types';
