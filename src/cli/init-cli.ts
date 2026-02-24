/**
 * CLI Initialization Module
 * Unified initialization for cli-menu-kit and project-specific configurations
 */

import {
  initConfig,
  loadLanguagesFromFile,
  setLanguage,
  getCLILanguageCode,
  loadConfig
} from 'cli-menu-kit';
import * as path from 'path';
import i18n from '../libs/i18n';

export interface InitOptions {
  appName: string;
  languagesPath?: string;
  defaults?: {
    language?: string;
    workflow_mode?: string;
    [key: string]: any;
  };
}

/**
 * Initialize CLI application with unified configuration
 */
export function initCLI(options: InitOptions): void {
  // 1. Initialize cli-menu-kit config system
  initConfig({
    appName: options.appName,
    defaults: {
      language: 'en',
      ...options.defaults
    }
  });

  // 2. Load language configuration
  const languagesPath = options.languagesPath || path.join(process.cwd(), 'languages.json');
  try {
    loadLanguagesFromFile(languagesPath);
  } catch (error) {
    console.warn('Failed to load languages config, using defaults');
  }

  // 3. Load user config and set language
  const userConfig = loadConfig();
  const userLanguage = userConfig.language || 'en';

  // 4. Set CLI language (cli-menu-kit)
  const cliLanguage = getCLILanguageCode(userLanguage);
  setLanguage(cliLanguage as any);

  // 5. Set i18n locale (project-specific)
  const i18nLocale = userLanguage === 'zh-CN' ? 'zh' : 'en';
  i18n.setLocale(i18nLocale as any);
}

/**
 * Get current configuration
 */
export function getCurrentConfig() {
  return loadConfig();
}
