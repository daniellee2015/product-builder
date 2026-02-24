/**
 * User Configuration Management
 * Handles persistent user preferences and settings
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface UserConfig {
  // Workflow settings
  workflow_mode?: 'lite' | 'standard' | 'full' | string;

  // UI settings
  language?: string;  // Language code (e.g., 'en', 'zh-CN', 'ja-JP')

  // LLM settings
  default_llm?: string;

  // Project settings
  job_root?: string;

  // Behavior settings
  auto_save?: boolean;

  // Last updated timestamp
  updated_at?: string;
}

const DEFAULT_CONFIG: UserConfig = {
  workflow_mode: 'full',
  language: 'en',
  auto_save: true
};

/**
 * Get user config directory path
 */
export function getUserConfigDir(): string {
  const homeDir = os.homedir();
  const configDir = path.join(homeDir, '.product-builder');

  // Ensure directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  return configDir;
}

/**
 * Get user config file path
 */
export function getUserConfigPath(): string {
  return path.join(getUserConfigDir(), 'config.json');
}

/**
 * Load user configuration
 */
export function loadUserConfig(): UserConfig {
  const configPath = getUserConfigPath();

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(content);
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    console.error('Failed to load user config:', error);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save user configuration
 */
export function saveUserConfig(config: Partial<UserConfig>): void {
  const configPath = getUserConfigPath();
  const currentConfig = loadUserConfig();

  const newConfig: UserConfig = {
    ...currentConfig,
    ...config,
    updated_at: new Date().toISOString()
  };

  try {
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save user config:', error);
    throw error;
  }
}

/**
 * Get a specific config value
 */
export function getConfigValue<K extends keyof UserConfig>(
  key: K
): UserConfig[K] {
  const config = loadUserConfig();
  return config[key];
}

/**
 * Set a specific config value
 */
export function setConfigValue<K extends keyof UserConfig>(
  key: K,
  value: UserConfig[K]
): void {
  saveUserConfig({ [key]: value });
}

/**
 * Reset user configuration to defaults
 */
export function resetUserConfig(): void {
  const configPath = getUserConfigPath();
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
}
