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
} from '../api-manager';
import { MENUS, buildMenuOptions, findSelectedItem } from '../../config/menu-registry';
import { displayAPIConfig } from './display';
import i18n from '../../libs/i18n';

/**
 * Prompt to continue
 */
async function promptContinue(): Promise<void> {
  await input.text({
    prompt: i18n.t('common.continue'),
    allowEmpty: true
  });
}

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

// Route map: menu item id → handler
const LLM_ROUTES: Record<string, () => Promise<void>> = {
  'view-api': viewAPIConfig,
  'sync': syncLLMConfigsInteractive,
  'claude': () => configureLLMAPI('claude'),
  'gemini': () => configureLLMAPI('gemini'),
  'codex': () => configureLLMAPI('codex'),
  'opencode': () => configureLLMAPI('opencode'),
  'default-llm': setDefaultLLM,
  'routing': configureRouting,
  'code-hub': enableClaudeCodeHub,
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

  await promptContinue();
  await showLLMCLIMenu(showMainMenu);
}
