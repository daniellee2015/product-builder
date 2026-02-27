/**
 * LLM CLI Provider Registry
 * Simple configuration helper for LLM CLIs
 */

import * as path from 'path';
import * as os from 'os';

/**
 * Provider preset (third-party services)
 */
export interface ProviderPreset {
  id: string;
  name: string;
  baseUrl: string;
  description?: string;
}

/**
 * LLM CLI configuration
 */
export interface CLIConfig {
  id: string;
  name: string;
  configPath: string;  // Config file path (e.g., ~/.claude/settings.json)
  format: 'json' | 'toml' | 'env';
  presets: ProviderPreset[];  // Available presets for this CLI
}

/**
 * Resolve path with ~ to absolute path
 */
export function resolvePath(filePath: string): string {
  if (filePath.startsWith('~')) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

/**
 * Common presets (third-party services)
 */
export const COMMON_PRESETS: ProviderPreset[] = [
  {
    id: 'packyapi',
    name: 'PackyAPI',
    baseUrl: 'https://www.packyapi.com',
    description: 'PackyAPI relay service'
  },
  {
    id: '302ai',
    name: '302.AI',
    baseUrl: 'https://api.302.ai',
    description: '302.AI service'
  },
  {
    id: 'custom',
    name: 'Custom',
    baseUrl: '',
    description: 'Custom endpoint (self-hosted)'
  }
];

/**
 * LLM CLI configurations
 */
export const CLI_CONFIGS: CLIConfig[] = [
  {
    id: 'claude',
    name: 'Claude',
    configPath: '~/.claude/settings.json',
    format: 'json',
    presets: COMMON_PRESETS
  },
  {
    id: 'gemini',
    name: 'Gemini',
    configPath: '~/.gemini/.env',
    format: 'env',
    presets: COMMON_PRESETS
  },
  {
    id: 'codex',
    name: 'Codex',
    configPath: '~/.codex/config.toml',
    format: 'toml',
    presets: COMMON_PRESETS
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    configPath: '~/.config/opencode/opencode.json',
    format: 'json',
    presets: COMMON_PRESETS
  }
];
