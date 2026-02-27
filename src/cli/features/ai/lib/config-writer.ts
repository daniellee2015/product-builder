/**
 * Configuration Writer
 * Simple helper to write LLM CLI configurations
 */

import * as fs from 'fs';
import * as path from 'path';
import { resolvePath } from './providers';

/**
 * Ensure directory exists
 */
function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Write JSON configuration
 */
export function writeJsonConfig(
  filePath: string,
  config: Record<string, any>
): void {
  const absolutePath = resolvePath(filePath);
  ensureDir(absolutePath);

  // Read existing config if exists
  let existingConfig = {};
  if (fs.existsSync(absolutePath)) {
    try {
      const content = fs.readFileSync(absolutePath, 'utf8');
      existingConfig = JSON.parse(content);
    } catch (error) {
      // Ignore parse errors, will overwrite
    }
  }

  // Merge with existing config
  const mergedConfig = { ...existingConfig, ...config };

  fs.writeFileSync(
    absolutePath,
    JSON.stringify(mergedConfig, null, 2),
    'utf8'
  );
}

/**
 * Write ENV configuration
 */
export function writeEnvConfig(
  filePath: string,
  config: Record<string, string>
): void {
  const absolutePath = resolvePath(filePath);
  ensureDir(absolutePath);

  // Read existing config if exists
  const existingLines: string[] = [];
  if (fs.existsSync(absolutePath)) {
    const content = fs.readFileSync(absolutePath, 'utf8');
    existingLines.push(...content.split('\n'));
  }

  // Update or add new values
  const keys = Object.keys(config);
  const updatedLines = existingLines.filter(line => {
    const key = line.split('=')[0];
    return !keys.includes(key);
  });

  // Add new values
  for (const [key, value] of Object.entries(config)) {
    updatedLines.push(`${key}=${value}`);
  }

  fs.writeFileSync(absolutePath, updatedLines.join('\n'), 'utf8');
}

/**
 * Write TOML configuration
 * Note: This is a simplified version, may need a proper TOML library
 */
export function writeTomlConfig(
  filePath: string,
  config: Record<string, any>
): void {
  const absolutePath = resolvePath(filePath);
  ensureDir(absolutePath);

  // For now, just write as simple key=value pairs
  // TODO: Use a proper TOML library if needed
  const lines: string[] = [];
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string') {
      lines.push(`${key} = "${value}"`);
    } else {
      lines.push(`${key} = ${value}`);
    }
  }

  fs.writeFileSync(absolutePath, lines.join('\n'), 'utf8');
}

/**
 * Write configuration based on format
 */
export function writeConfig(
  filePath: string,
  format: 'json' | 'toml' | 'env',
  config: Record<string, any>
): void {
  switch (format) {
    case 'json':
      writeJsonConfig(filePath, config);
      break;
    case 'env':
      writeEnvConfig(filePath, config);
      break;
    case 'toml':
      writeTomlConfig(filePath, config);
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}
