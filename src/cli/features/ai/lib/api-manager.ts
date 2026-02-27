import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * LLM API Configuration
 */
export interface LLMAPIConfig {
  name: string;
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  enabled: boolean;
  priority?: number;
}

/**
 * API Hub Configuration
 * Uses claude-code-hub for routing management
 */
export interface APIHubConfig {
  llms: {
    claude?: LLMAPIConfig;
    gemini?: LLMAPIConfig;
    codex?: LLMAPIConfig;
    opencode?: LLMAPIConfig;
  };
  openclaw?: {
    enabled: boolean;
    port?: number;
    apiUrl?: string;
  };
  routing?: {
    defaultLLM?: string;
    fallbackOrder?: string[];
    hubEnabled?: boolean; // Use claude-code-hub for routing
    hubConfig?: any; // claude-code-hub specific configuration
  };
}

/**
 * Get API configuration file path
 */
function getAPIConfigPath(): string {
  const configDir = join(process.cwd(), '.product-builder');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  return join(configDir, 'api-config.json');
}

/**
 * Load API configuration
 */
export function loadAPIConfig(): APIHubConfig {
  const configPath = getAPIConfigPath();

  if (!existsSync(configPath)) {
    return {
      llms: {},
      routing: {}
    };
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading API config:', error);
    return {
      llms: {},
      routing: {}
    };
  }
}

/**
 * Save API configuration
 */
export function saveAPIConfig(config: APIHubConfig): void {
  const configPath = getAPIConfigPath();

  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving API config:', error);
    throw error;
  }
}

/**
 * Get LLM API configuration
 */
export function getLLMConfig(llmName: string): LLMAPIConfig | undefined {
  const config = loadAPIConfig();
  return config.llms[llmName as keyof typeof config.llms];
}

/**
 * Set LLM API configuration
 */
export function setLLMConfig(llmName: string, llmConfig: LLMAPIConfig): void {
  const config = loadAPIConfig();

  if (!config.llms) {
    config.llms = {};
  }

  config.llms[llmName as keyof typeof config.llms] = llmConfig;
  saveAPIConfig(config);
}

/**
 * Get OpenClaw configuration
 */
export function getOpenClawConfig(): APIHubConfig['openclaw'] {
  const config = loadAPIConfig();
  return config.openclaw;
}

/**
 * Set OpenClaw configuration
 */
export function setOpenClawConfig(openclawConfig: APIHubConfig['openclaw']): void {
  const config = loadAPIConfig();
  config.openclaw = openclawConfig;
  saveAPIConfig(config);
}

/**
 * Get routing configuration
 */
export function getRoutingConfig(): APIHubConfig['routing'] {
  const config = loadAPIConfig();
  return config.routing || {};
}

/**
 * Set routing configuration
 */
export function setRoutingConfig(routingConfig: APIHubConfig['routing']): void {
  const config = loadAPIConfig();
  config.routing = routingConfig;
  saveAPIConfig(config);
}

/**
 * Detect LLM CLI configurations from their config files
 */
export function detectLLMConfigs(): Partial<APIHubConfig['llms']> {
  const detected: Partial<APIHubConfig['llms']> = {};

  // Try to detect Claude Code config
  const claudeConfigPath = join(homedir(), '.claude', 'config.json');
  if (existsSync(claudeConfigPath)) {
    try {
      const claudeConfig = JSON.parse(readFileSync(claudeConfigPath, 'utf-8'));
      detected.claude = {
        name: 'claude',
        enabled: true,
        apiKey: claudeConfig.apiKey,
        model: claudeConfig.model
      };
    } catch (error) {
      // Ignore errors
    }
  }

  // Try to detect Gemini config
  const geminiConfigPath = join(homedir(), '.gemini', 'config.json');
  if (existsSync(geminiConfigPath)) {
    try {
      const geminiConfig = JSON.parse(readFileSync(geminiConfigPath, 'utf-8'));
      detected.gemini = {
        name: 'gemini',
        enabled: true,
        apiKey: geminiConfig.apiKey,
        model: geminiConfig.model
      };
    } catch (error) {
      // Ignore errors
    }
  }

  // Try to detect Codex config
  const codexConfigPath = join(homedir(), '.codex', 'config.json');
  if (existsSync(codexConfigPath)) {
    try {
      const codexConfig = JSON.parse(readFileSync(codexConfigPath, 'utf-8'));
      detected.codex = {
        name: 'codex',
        enabled: true,
        apiKey: codexConfig.apiKey,
        model: codexConfig.model
      };
    } catch (error) {
      // Ignore errors
    }
  }

  // Try to detect OpenCode config
  const opencodeConfigPath = join(homedir(), '.opencode', 'config.json');
  if (existsSync(opencodeConfigPath)) {
    try {
      const opencodeConfig = JSON.parse(readFileSync(opencodeConfigPath, 'utf-8'));
      detected.opencode = {
        name: 'opencode',
        enabled: true,
        apiKey: opencodeConfig.apiKey,
        model: opencodeConfig.model
      };
    } catch (error) {
      // Ignore errors
    }
  }

  return detected;
}

/**
 * Sync detected LLM configs with current configuration
 */
export function syncLLMConfigs(): void {
  const currentConfig = loadAPIConfig();
  const detectedConfigs = detectLLMConfigs();

  // Merge detected configs with current config
  for (const [llmName, detectedConfig] of Object.entries(detectedConfigs)) {
    const currentLLMConfig = currentConfig.llms[llmName as keyof typeof currentConfig.llms];

    if (!currentLLMConfig) {
      // Add new detected config
      currentConfig.llms[llmName as keyof typeof currentConfig.llms] = detectedConfig;
    } else {
      // Update existing config with detected values (but keep user settings)
      currentConfig.llms[llmName as keyof typeof currentConfig.llms] = {
        ...detectedConfig,
        ...currentLLMConfig,
        // Always update API key and model from detected config
        apiKey: detectedConfig.apiKey || currentLLMConfig.apiKey,
        model: detectedConfig.model || currentLLMConfig.model
      };
    }
  }

  saveAPIConfig(currentConfig);
}

/**
 * Initialize claude-code-hub routing
 * This integrates with the claude-code-hub package for advanced routing
 */
export function initializeClaudeCodeHub(): void {
  const config = loadAPIConfig();

  // Enable claude-code-hub routing by default
  if (!config.routing) {
    config.routing = {};
  }

  config.routing.hubEnabled = true;

  // Initialize hub config with LLM endpoints
  const hubConfig: any = {
    endpoints: []
  };

  // Add enabled LLMs to hub config
  for (const [llmName, llmConfig] of Object.entries(config.llms)) {
    if (llmConfig?.enabled) {
      hubConfig.endpoints.push({
        name: llmName,
        apiKey: llmConfig.apiKey,
        apiUrl: llmConfig.apiUrl,
        model: llmConfig.model,
        priority: llmConfig.priority || 5
      });
    }
  }

  config.routing.hubConfig = hubConfig;
  saveAPIConfig(config);
}

/**
 * Check if claude-code-hub is enabled
 */
export function isClaudeCodeHubEnabled(): boolean {
  const config = loadAPIConfig();
  return config.routing?.hubEnabled ?? false;
}
