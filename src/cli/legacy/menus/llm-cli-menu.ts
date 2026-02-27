/**
 * LLM CLI Configuration Menu
 */

import { menu, input, renderSectionHeader } from 'cli-menu-kit';
import chalk from 'chalk';
import { promptContinue } from '../../shared/utils/menu-utils';
import {
  loadAPIConfig,
  syncLLMConfigs,
  setLLMConfig,
  setRoutingConfig,
  initializeClaudeCodeHub,
  isClaudeCodeHubEnabled,
  type LLMAPIConfig
} from '../../features/ai/lib/api-manager';
import { MENUS, buildMenuOptions, findSelectedItem } from '../../core/menu-registry';

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

/**
 * View API configuration
 */
async function viewAPIConfig(): Promise<void> {
  console.log(chalk.cyan.bold('\nAPI Configuration\n'));

  const config = loadAPIConfig();

  // Display LLM configs
  console.log(chalk.bold('LLM APIs:'));
  const llmNames = ['claude', 'gemini', 'codex', 'opencode'];
  for (const llmName of llmNames) {
    const llmConfig = config.llms[llmName as keyof typeof config.llms];
    if (llmConfig) {
      const status = llmConfig.enabled ? chalk.green('✓ Enabled') : chalk.gray('✗ Disabled');
      console.log(`  ${llmName}: ${status}`);
      if (llmConfig.apiKey) {
        const maskedKey = llmConfig.apiKey.substring(0, 8) + '...' + llmConfig.apiKey.substring(llmConfig.apiKey.length - 4);
        console.log(chalk.gray(`    API Key: ${maskedKey}`));
      }
      if (llmConfig.model) {
        console.log(chalk.gray(`    Model: ${llmConfig.model}`));
      }
      if (llmConfig.apiUrl) {
        console.log(chalk.gray(`    API URL: ${llmConfig.apiUrl}`));
      }
      if (llmConfig.priority) {
        console.log(chalk.gray(`    Priority: ${llmConfig.priority}`));
      }
    } else {
      console.log(`  ${llmName}: ${chalk.gray('Not configured')}`);
    }
  }

  console.log('');

  // Display routing config
  if (config.routing) {
    console.log(chalk.bold('Routing Configuration:'));

    // Show claude-code-hub status
    const hubStatus = config.routing.hubEnabled ? chalk.green('✓ Enabled') : chalk.gray('✗ Disabled');
    console.log(`  claude-code-hub: ${hubStatus}`);

    if (config.routing.defaultLLM) {
      console.log(`  Default LLM: ${chalk.green(config.routing.defaultLLM)}`);
    }
    if (config.routing.fallbackOrder && config.routing.fallbackOrder.length > 0) {
      console.log(`  Fallback Order: ${config.routing.fallbackOrder.join(' → ')}`);
    }
    console.log('');
  }

  // Display OpenClaw config
  if (config.openclaw) {
    console.log(chalk.bold('OpenClaw Configuration:'));
    const status = config.openclaw.enabled ? chalk.green('✓ Enabled') : chalk.gray('✗ Disabled');
    console.log(`  Status: ${status}`);
    if (config.openclaw.port) {
      console.log(`  Port: ${config.openclaw.port}`);
    }
    if (config.openclaw.apiUrl) {
      console.log(`  API URL: ${config.openclaw.apiUrl}`);
    }
    console.log('');
  }
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
    .map(([name, _]) => name);

  if (enabledLLMs.length === 0) {
    console.log(chalk.yellow('No LLMs are currently enabled. Please configure at least one LLM first.'));
    return;
  }

  const result = await menu.radio({
    options: enabledLLMs
  });

  const defaultLLM = result.value;

  setRoutingConfig({
    ...config.routing,
    defaultLLM
  });

  console.log(chalk.green(`\n✓ Default LLM set to ${defaultLLM}!`));
  console.log('');
}

/**
 * Configure routing
 */
async function configureRouting(): Promise<void> {
  console.log(chalk.cyan.bold('\nConfigure LLM Routing\n'));

  const config = loadAPIConfig();
  const enabledLLMs = Object.entries(config.llms)
    .filter(([_, llmConfig]) => llmConfig?.enabled)
    .map(([name, _]) => name);

  if (enabledLLMs.length === 0) {
    console.log(chalk.yellow('No LLMs are currently enabled. Please configure at least one LLM first.'));
    return;
  }

  // Map fallback order to indices
  const defaultSelected = (config.routing?.fallbackOrder || [])
    .map(llm => enabledLLMs.indexOf(llm))
    .filter(idx => idx !== -1);

  const result = await menu.checkbox({
    options: enabledLLMs,
    defaultSelected
  });

  const fallbackOrder = result.values;

  setRoutingConfig({
    ...config.routing,
    fallbackOrder
  });

  console.log(chalk.green('\n✓ Routing configuration updated!'));
  console.log('');
}

/**
 * Enable claude-code-hub routing
 */
async function enableClaudeCodeHub(): Promise<void> {
  console.log(chalk.cyan.bold('\nEnable claude-code-hub Routing\n'));

  const isEnabled = isClaudeCodeHubEnabled();

  if (isEnabled) {
    console.log(chalk.green('✓ claude-code-hub routing is already enabled!'));
    console.log('');

    const result = await menu.radio({
      options: [
        'Reinitialize hub configuration',
        'Disable hub routing',
        'Back'
      ]
    });

    const action = result.value;

    if (action.includes('Back')) {
      return;
    }

    if (action.includes('Disable')) {
      const config = loadAPIConfig();
      setRoutingConfig({
        ...config.routing,
        hubEnabled: false
      });
      console.log(chalk.yellow('\n✓ claude-code-hub routing disabled!'));
      console.log('');
      return;
    }

    if (action.includes('Reinitialize')) {
      initializeClaudeCodeHub();
      console.log(chalk.green('\n✓ claude-code-hub configuration reinitialized!'));
      console.log('');
      return;
    }
  } else {
    const confirm = await menu.booleanH(
      'Enable claude-code-hub for advanced LLM routing?',
      true
    );

    if (confirm) {
      initializeClaudeCodeHub();
      console.log(chalk.green('\n✓ claude-code-hub routing enabled!'));
      console.log(chalk.gray('  Hub will manage API routing and load balancing'));
      console.log('');
    }
  }
}
