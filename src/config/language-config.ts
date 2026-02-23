/**
 * Language Configuration
 * Centralized language mapping and configuration
 */

export interface LanguageConfig {
  code: string;              // User config code (e.g., 'en', 'zh-CN', 'ja-JP')
  cliCode: string;           // cli-menu-kit code (e.g., 'en', 'zh')
  i18nCode: string;          // i18n system code (e.g., 'en', 'zh')
  label: string;             // Display label
  nativeLabel: string;       // Native language label
}

/**
 * Supported languages configuration
 */
export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'en',
    cliCode: 'en',
    i18nCode: 'en',
    label: 'English',
    nativeLabel: 'English'
  },
  {
    code: 'zh-CN',
    cliCode: 'zh',
    i18nCode: 'zh',
    label: 'Chinese (Simplified)',
    nativeLabel: '简体中文'
  }
  // Add more languages here:
  // {
  //   code: 'ja-JP',
  //   cliCode: 'ja',
  //   i18nCode: 'ja',
  //   label: 'Japanese',
  //   nativeLabel: '日本語'
  // }
];

/**
 * Default language code
 */
export const DEFAULT_LANGUAGE = 'en';

/**
 * Get language config by code
 */
export function getLanguageConfig(code: string): LanguageConfig | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
}

/**
 * Get all supported language codes
 */
export function getSupportedLanguageCodes(): string[] {
  return SUPPORTED_LANGUAGES.map(lang => lang.code);
}

/**
 * Get CLI language code from user config code
 */
export function getCLILanguageCode(userCode: string): string {
  const config = getLanguageConfig(userCode);
  return config?.cliCode || DEFAULT_LANGUAGE;
}

/**
 * Get i18n language code from user config code
 */
export function getI18nLanguageCode(userCode: string): string {
  const config = getLanguageConfig(userCode);
  return config?.i18nCode || DEFAULT_LANGUAGE;
}

/**
 * Validate language code
 */
export function isValidLanguageCode(code: string): boolean {
  return SUPPORTED_LANGUAGES.some(lang => lang.code === code);
}
