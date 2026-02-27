/**
 * LLM CLI Configuration Menu
 * Menu navigation logic - display logic is in display.ts
 */

import { menu, input, renderSectionHeader } from 'cli-menu-kit';
import chalk from 'chalk';
import {
  loadAPIConfig,
  syncLLMConfigs,
  setLLMConfig,
  setRoutingConfig,
  initializeClaudeCodeHub,
  isClaudeCodeHubEnabled,
  type LLMAPIConfig
} from '../lib/api-manager';
import { MENUS, buildMenuOptions, findSelectedItem } from '../../../core/menu-registry';
import { displayAPIConfig } from '../lib/display';
import i18n from '../../../../libs/i18n';
import { CLI_CONFIGS, COMMON_PRESETS } from '../lib/providers';
import { writeConfig } from '../lib/config-writer';

/**
 * View API configuration
 */
async function viewAPIConfig(): Promise<void> {
  displayAPIConfig();
}

/**
 * Sync LLM configs interactively
 */
async function syncLLMConfigsInteractive(): Promise<void> {
  console.log(chalk.cyan.bold('\nSync LLM Configurations\n'));
  console.log('Detecting LLM CLI configurations...\n');

  syncLLMConfigs();

  console.log(chalk.green('✓ LLM configurations synced successfully!'));
  console.log('');
}

/**
 * Configure LLM API
 */
async function configureLLMAPI(llmName: string): Promise<void> {
  console.log(chalk.cyan.bold(`\nConfigure ${llmName.toUpperCase()} API\n`));

  const config = loadAPIConfig();
  const currentConfig = config.llms[llmName as keyof typeof config.llms];

  const enabled = await menu.booleanH(
    'Enable this LLM?',
    currentConfig?.enabled ?? true
  );

  let apiKey = currentConfig?.apiKey;
  let model = currentConfig?.model;
  let apiUrl = currentConfig?.apiUrl;
  let priority: number | undefined = currentConfig?.priority ?? 5;

  if (enabled) {
    apiKey = await input.text({
      prompt: 'API Key',
      defaultValue: currentConfig?.apiKey,
      allowEmpty: true
    });

    model = await input.text({
      prompt: 'Model (optional)',
      defaultValue: currentConfig?.model,
      allowEmpty: true
    });

    apiUrl = await input.text({
      prompt: 'API URL (optional)',
      defaultValue: currentConfig?.apiUrl,
      allowEmpty: true
    });

    priority = await input.number({
      prompt: 'Priority (1-10, higher = more preferred)',
      defaultValue: String(currentConfig?.priority ?? 5),
      min: 1,
      max: 10
    });
  }

  const llmConfig: LLMAPIConfig = {
    name: llmName,
    enabled,
    apiKey,
    model,
    apiUrl,
    priority
  };

  setLLMConfig(llmName, llmConfig);

  console.log(chalk.green(`\n✓ ${llmName.toUpperCase()} API configured successfully!`));
  console.log('');
}

/**
 * Set default LLM
 */
async function setDefaultLLM(): Promise<void> {
  console.log(chalk.cyan.bold('\nSet Default LLM\n'));

  const config = loadAPIConfig();
  const enabledLLMs = Object.entries(config.llms)
    .filter(([_, llmConfig]) => llmConfig?.enabled)
    .map(([name]) => name);

  if (enabledLLMs.length === 0) {
    console.log(chalk.yellow('No LLMs are currently enabled. Please enable at least one LLM first.'));
    console.log('');
    return;
  }

  const options = enabledLLMs.map(name => {
    const isCurrent = config.routing?.defaultLLM === name;
    return `${name}${isCurrent ? chalk.green(' (current)') : ''}`;
  });

  const result = await menu.radio({
    options,
    allowNumberKeys: true,
    preserveOnSelect: true
  });

  const selectedLLM = enabledLLMs[result.index];

  setRoutingConfig({
    ...config.routing,
    defaultLLM: selectedLLM
  });

  console.log(chalk.green(`\n✓ Default LLM set to ${selectedLLM}!`));
  console.log('');
}

/**
 * Configure routing
 */
async function configureRouting(): Promise<void> {
  console.log(chalk.cyan.bold('\nConfigure LLM Routing\n'));
  console.log('Routing configuration coming soon...');
  console.log('');
}

/**
 * Enable Claude Code Hub
 */
async function enableClaudeCodeHub(): Promise<void> {
  console.log(chalk.cyan.bold('\nClaude Code Hub\n'));

  const isEnabled = isClaudeCodeHubEnabled();

  if (isEnabled) {
    console.log(chalk.green('✓ Claude Code Hub is already enabled'));
    console.log('');
    return;
  }

  console.log('Initializing Claude Code Hub...\n');

  try {
    await initializeClaudeCodeHub();
    console.log(chalk.green('✓ Claude Code Hub enabled successfully!'));
  } catch (error) {
    console.log(chalk.red(`✗ Failed to enable Claude Code Hub: ${error}`));
  }

  console.log('');
}

/**
 * Show Official API menu
 */
async function showOfficialAPIMenu(): Promise<void> {
  console.log(chalk.cyan.bold('\nConfigure Official API\n'));
  console.log('Select CLI to configure:\n');

  const options = [
    '1. Claude (Anthropic)',
    '2. Gemini (Google)',
    '3. Codex (OpenAI)',
    '4. OpenCode',
    'b. Back'
  ];

  const result = await menu.radio({
    options,
    allowLetterKeys: true,
    allowNumberKeys: true,
    preserveOnSelect: true
  });

  if (result.value.includes('Back')) {
    return;
  }

  // Show message that CLI will handle login
  console.log(chalk.yellow('\nℹ This CLI will handle authentication itself.'));
  console.log(chalk.gray('Please use the CLI\'s login command to authenticate.\n'));
}

/**
 * Show Custom API menu
 */
async function showCustomAPIMenu(): Promise<void> {
  console.log(chalk.cyan.bold('\nConfigure Custom API\n'));
  console.log('Select CLI to configure:\n');

  const options = [
    '1. Claude',
    '2. Gemini',
    '3. Codex',
    '4. OpenCode',
    'b. Back'
  ];

  const result = await menu.radio({
    options,
    allowLetterKeys: true,
    allowNumberKeys: true,
    preserveOnSelect: true
  });

  if (result.value.includes('Back')) {
    return;
  }

  // Determine which CLI was selected
  let cliId = '';
  if (result.value.includes('Claude')) cliId = 'claude';
  else if (result.value.includes('Gemini')) cliId = 'gemini';
  else if (result.value.includes('Codex')) cliId = 'codex';
  else if (result.value.includes('OpenCode')) cliId = 'opencode';

  if (cliId) {
    await configureCustomAPI(cliId);
  }
}

/**
 * View API status
 */
async function viewAPIStatus(): Promise<void> {
  console.log(chalk.cyan.bold('\nAPI Status\n'));
  displayAPIConfig();
}

/**
 * Switch configuration
 */
async function switchConfiguration(): Promise<void> {
  console.log(chalk.cyan.bold('\nSwitch Configuration\n'));
  console.log('Coming soon...\n');
}

/**
 * Configure Custom API for a specific CLI
 */
async function configureCustomAPI(cliId: string): Promise<void> {
  const cliConfig = CLI_CONFIGS.find(c => c.id === cliId);
  if (!cliConfig) {
    console.log(chalk.red(`\n✗ Unknown CLI: ${cliId}\n`));
    return;
  }

  console.log(chalk.cyan.bold(`\nConfigure Custom API for ${cliConfig.name}\n`));
  console.log('Select provider preset:\n');

  // Build preset options
  const presetOptions = cliConfig.presets.map((preset, index) => {
    const desc = preset.description ? ` - ${preset.description}` : '';
    return `${index + 1}. ${preset.name}${desc}`;
  });
  presetOptions.push('b. Back');

  const result = await menu.radio({
    options: presetOptions,
    allowLetterKeys: true,
    allowNumberKeys: true,
    preserveOnSelect: true
  });

  if (result.value.includes('Back')) {
    return;
  }

  const selectedPreset = cliConfig.presets[result.index];
  if (!selectedPreset) {
    return;
  }

  // Get base URL
  let baseUrl = selectedPreset.baseUrl;
  if (selectedPreset.id === 'custom') {
    baseUrl = await input.text({
      prompt: 'Base URL',
      allowEmpty: false
    });
  } else {
    console.log(chalk.gray(`\nBase URL: ${baseUrl}`));
  }

  // Get API key
  const apiKey = await input.text({
    prompt: 'API Key',
    allowEmpty: false
  });

  // Write configuration based on CLI format
  try {
    if (cliConfig.format === 'json') {
      // For Claude and OpenCode
      writeConfig(cliConfig.configPath, 'json', {
        api_base_url: baseUrl,
        api_key: apiKey
      });
    } else if (cliConfig.format === 'env') {
      // For Gemini
      writeConfig(cliConfig.configPath, 'env', {
        GOOGLE_GEMINI_BASE_URL: baseUrl,
        GEMINI_API_KEY: apiKey
      });
    } else if (cliConfig.format === 'toml') {
      // For Codex
      writeConfig(cliConfig.configPath, 'toml', {
        base_url: baseUrl,
        api_key: apiKey
      });
    }

    console.log(chalk.green(`\n✓ ${cliConfig.name} custom API configured successfully!`));
    console.log(chalk.gray(`Config file: ${cliConfig.configPath}\n`));
  } catch (error) {
    console.log(chalk.red(`\n✗ Failed to write configuration: ${error}\n`));
  }
}

// Route map: menu item id → handler
const LLM_ROUTES: Record<string, () => Promise<void>> = {
  'official-api': showOfficialAPIMenu,
  'custom-api': showCustomAPIMenu,
  'view-status': viewAPIStatus,
  'switch-config': switchConfiguration,
  'enable-hub': enableClaudeCodeHub,
};

/**
 * Show LLM CLI configuration menu
 */
export async function showLLMCLIMenu(showMainMenu: () => Promise<void>): Promise<void> {
  const config = MENUS['llm-cli'];

  renderSectionHeader(config.title, config.headerWidth);
  if (config.desc) {
    console.log(chalk.gray(config.desc + '\n'));
  }

  const result = await menu.radio({
    options: buildMenuOptions(config),
    allowLetterKeys: true,
    allowNumberKeys: true,
    preserveOnSelect: true
  });

  const selected = findSelectedItem(config, result.value);
  if (!selected) return;

  // Handle back
  if (result.value.includes('Back')) {
    await showMainMenu();
    return;
  }

  const handler = LLM_ROUTES[selected.id];
  if (handler) {
    await handler();
  }

  // Directly show menu again without prompting
  await showLLMCLIMenu(showMainMenu);
}
