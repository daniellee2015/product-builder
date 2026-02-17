/**
 * i18n Loader
 */

import * as fs from 'fs';
import * as path from 'path';
import { Locale, TranslationKeys } from './types';

const translations: Map<Locale, TranslationKeys> = new Map();

/**
 * Load translation file for a locale
 */
export function loadLocale(locale: Locale): TranslationKeys {
  if (translations.has(locale)) {
    return translations.get(locale)!;
  }

  const localeFile = path.join(__dirname, 'locales', `${locale}.json`);

  try {
    const content = fs.readFileSync(localeFile, 'utf-8');
    const data = JSON.parse(content);
    translations.set(locale, data);
    return data;
  } catch (error) {
    console.error(`Failed to load locale ${locale}:`, error);
    return {};
  }
}

/**
 * Get nested value from object using dot notation
 */
export function getNestedValue(obj: any, path: string): string | undefined {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * Replace template variables in string
 * Example: "Hello {{name}}" with {name: "World"} => "Hello World"
 */
export function replaceVariables(
  template: string,
  params: Record<string, string | number>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return key in params ? String(params[key]) : match;
  });
}
