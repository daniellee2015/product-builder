import { menu, input } from 'cli-menu-kit';
import chalk from 'chalk';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  checkAllDependencies,
  checkProductBuilderConfig,
  checkTmuxSession
} from '../lib/dependency-checkers';

/**
 * Configuration Mode
 */
type ConfigMode = 'minimal' | 'standard' | 'full' | 'custom';

/**
 * User Configuration Choices
 */
interface UserConfig {
  mode: ConfigMode;
  llms: {
    claude: boolean;
    gemini: boolean;
    codex: boolean;
    opencode: boolean;
  };
  tools: {
    claudeCodeHub: boolean;
    ccb: boolean;
    cca: boolean;
    ralph: boolean;
    openclaw: boolean;
    ccbMulti: boolean;
  };
  documentation: {
    type: 'markdown' | 'openspec' | 'mint' | 'both';
  };
  orchestration: {
    agents: boolean;
    mcpServers: boolean;
    skills: boolean;
  };
}

/**
 * Initialize Project - Main Entry
 */
export async function initializeProject(showMainMenu: () => Promise<void>): Promise<void> {
  console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║                                                            ║'));
  console.log(chalk.cyan.bold('║              Product Builder Initialization               ║'));
  console.log(chalk.cyan.bold('║                                                            ║'));
  console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════╝\n'));

  // Check if already initialized
  if (checkProductBuilderConfig()) {
    console.log(chalk.yellow('⚠ Product Builder is already initialized in this directory.\n'));

    const result = await menu.radio({
      options: [
        'Reconfigure - Start fresh configuration',
        'Update - Modify existing configuration',
        'Cancel - Go back to main menu'
      ]
    });

    const action = result.value;

    if (action.includes('Cancel')) {
      await showMainMenu();
      return;
    }

    if (action.includes('Update')) {
      // TODO: Implement update flow
      console.log(chalk.yellow('\nUpdate configuration coming soon...'));
      await promptContinue();
      await showMainMenu();
      return;
    }

    // Continue with reconfigure
    const confirm = await menu.booleanH(
      'This will overwrite existing configuration. Continue?',
      false
    );

    if (!confirm) {
      await showMainMenu();
      return;
    }
  }

  // Step 1: Check environment
  console.log(chalk.bold('\nStep 1: Checking Environment\n'));
  await checkEnvironment();

  // Step 2: Choose configuration mode
  console.log(chalk.bold('\nStep 2: Choose Configuration Mode\n'));
  const mode = await chooseConfigMode();

  // Step 3: Configure based on mode
  let config: UserConfig;
  if (mode === 'custom') {
    config = await customConfiguration();
  } else {
    config = getPresetConfiguration(mode);
  }

  // Step 4: Confirm configuration
  console.log(chalk.bold('\nStep 4: Review Configuration\n'));
  displayConfiguration(config);

  const proceed = await menu.booleanH(
    'Proceed with this configuration?',
    true
  );

  if (!proceed) {
    console.log(chalk.yellow('\nInitialization cancelled.'));
    await promptContinue();
    await showMainMenu();
    return;
  }

  // Step 5: Create configuration files
  console.log(chalk.bold('\nStep 5: Creating Configuration Files\n'));
  await createConfigurationFiles(config);

  // Step 6: Complete
  console.log(chalk.green.bold('\n✓ Product Builder initialized successfully!\n'));
  displayNextSteps(config);

  await promptContinue();
  await showMainMenu();
}

/**
 * Check environment and display status
 */
async function checkEnvironment(): Promise<void> {
  console.log('Checking your environment...\n');

  const status = await checkAllDependencies();
  const tmuxStatus = checkTmuxSession();

  // Display environment status
  console.log(chalk.bold('Environment:'));
  if (tmuxStatus.inTmux) {
    console.log(chalk.green(`  ✓ tmux session: ${tmuxStatus.sessionName || 'unknown'}`));
  } else {
    console.log(chalk.yellow('  ⚠ Not in tmux session (recommended for multi-project support)'));
  }

  // Display LLM CLIs
  console.log(chalk.bold('\nLLM CLIs:'));
  for (const llm of status.llmCLIs) {
    if (llm.installed) {
      console.log(chalk.green(`  ✓ ${llm.name}${llm.version ? ` (${llm.version})` : ''}`));
    } else {
      console.log(chalk.gray(`  ✗ ${llm.name} - Not installed`));
    }
  }

  // Display Architecture Tools
  console.log(chalk.bold('\nArchitecture Tools:'));
  for (const tool of status.architectureTools) {
    if (tool.installed) {
      console.log(chalk.green(`  ✓ ${tool.name}${tool.version ? ` (${tool.version})` : ''}`));
    } else {
      console.log(chalk.gray(`  ✗ ${tool.name} - Not installed`));
    }
  }

  console.log('');
}

/**
 * Choose configuration mode
 */
async function chooseConfigMode(): Promise<ConfigMode> {
  const result = await menu.radio({
    options: [
      'Minimal    - Single LLM CLI, basic setup (recommended for beginners)',
      'Standard   - Some automation tools, good balance',
      'Full       - All features enabled, maximum automation',
      'Custom     - Choose each component individually'
    ]
  });

  const mode = result.value;

  if (mode.includes('Minimal')) return 'minimal';
  if (mode.includes('Standard')) return 'standard';
  if (mode.includes('Full')) return 'full';
  if (mode.includes('Custom')) return 'custom';

  return 'minimal'; // fallback
}

/**
 * Get preset configuration based on mode
 */
function getPresetConfiguration(mode: ConfigMode): UserConfig {
  if (mode === 'custom') {
    // This shouldn't happen, but return minimal as fallback
    mode = 'minimal';
  }

  const presets: Record<'minimal' | 'standard' | 'full', UserConfig> = {
    minimal: {
      mode: 'minimal',
      llms: { claude: true, gemini: false, codex: false, opencode: false },
      tools: {
        claudeCodeHub: false,
        ccb: false,
        cca: false,
        ralph: false,
        openclaw: false,
        ccbMulti: false
      },
      documentation: { type: 'markdown' },
      orchestration: { agents: false, mcpServers: false, skills: false }
    },
    standard: {
      mode: 'standard',
      llms: { claude: true, gemini: false, codex: false, opencode: false },
      tools: {
        claudeCodeHub: false,
        ccb: true,
        cca: false,
        ralph: false,
        openclaw: false,
        ccbMulti: true
      },
      documentation: { type: 'openspec' },
      orchestration: { agents: true, mcpServers: false, skills: false }
    },
    full: {
      mode: 'full',
      llms: { claude: true, gemini: true, codex: true, opencode: false },
      tools: {
        claudeCodeHub: true,
        ccb: true,
        cca: true,
        ralph: true,
        openclaw: true,
        ccbMulti: true
      },
      documentation: { type: 'both' },
      orchestration: { agents: true, mcpServers: true, skills: true }
    }
  };

  return presets[mode as 'minimal' | 'standard' | 'full'];
}

/**
 * Custom configuration flow
 */
async function customConfiguration(): Promise<UserConfig> {
  const config: UserConfig = {
    mode: 'custom',
    llms: { claude: false, gemini: false, codex: false, opencode: false },
    tools: {
      claudeCodeHub: false,
      ccb: false,
      cca: false,
      ralph: false,
      openclaw: false,
      ccbMulti: false
    },
    documentation: { type: 'markdown' },
    orchestration: { agents: false, mcpServers: false, skills: false }
  };

  // LLM CLIs
  console.log(chalk.cyan('\n=== LLM CLIs ===\n'));
  const llmsResult = await menu.checkbox({
    options: [
      'claude (recommended)',
      'gemini',
      'codex',
      'opencode'
    ],
    defaultSelected: [0], // claude is checked by default
    minSelections: 1
  });

  const llmMap: Record<string, keyof typeof config.llms> = {
    'claude (recommended)': 'claude',
    'gemini': 'gemini',
    'codex': 'codex',
    'opencode': 'opencode'
  };

  llmsResult.values.forEach((llm: string) => {
    const key = llmMap[llm];
    if (key) {
      config.llms[key] = true;
    }
  });

  // API Management
  console.log(chalk.cyan('\n=== API Management ===\n'));
  const claudeCodeHub = await menu.booleanH(
    'Enable claude-code-hub for API management?\n  (Requires: Docker, PostgreSQL, Redis)',
    false
  );
  config.tools.claudeCodeHub = claudeCodeHub;

  // Automation Tools
  console.log(chalk.cyan('\n=== Automation Tools ===\n'));
  const toolsResult = await menu.checkbox({
    options: [
      'CCB - Claude Code automation',
      'CCA - Cross-LLM routing',
      'Ralph - Retry logic',
      'OpenClaw - Scheduling & monitoring',
      'ccb-multi - Multi-session support'
    ]
  });

  const toolMap: Record<string, keyof typeof config.tools> = {
    'CCB - Claude Code automation': 'ccb',
    'CCA - Cross-LLM routing': 'cca',
    'Ralph - Retry logic': 'ralph',
    'OpenClaw - Scheduling & monitoring': 'openclaw',
    'ccb-multi - Multi-session support': 'ccbMulti'
  };

  toolsResult.values.forEach((tool: string) => {
    const key = toolMap[tool];
    if (key) {
      config.tools[key] = true;
    }
  });

  // Documentation
  console.log(chalk.cyan('\n=== Documentation ===\n'));
  const docResult = await menu.radio({
    options: [
      'Simple MD - Just markdown files (default)',
      'OpenSpec - API specifications',
      'Mint - Full documentation site',
      'Both - OpenSpec + Mint'
    ]
  });

  const documentation = docResult.value;
  if (documentation.includes('Simple MD')) config.documentation.type = 'markdown';
  else if (documentation.includes('OpenSpec') && !documentation.includes('Both')) config.documentation.type = 'openspec';
  else if (documentation.includes('Mint') && !documentation.includes('Both')) config.documentation.type = 'mint';
  else if (documentation.includes('Both')) config.documentation.type = 'both';

  // Orchestration
  console.log(chalk.cyan('\n=== Orchestration ===\n'));
  const agents = await menu.booleanH(
    'Enable Agent system (Subagents & Teams)?',
    false
  );
  const mcpServers = await menu.booleanH(
    'Configure MCP servers?',
    false
  );
  const skills = await menu.booleanH(
    'Enable Skills system?',
    false
  );

  config.orchestration.agents = agents;
  config.orchestration.mcpServers = mcpServers;
  config.orchestration.skills = skills;

  return config;
}

/**
 * Display configuration summary
 */
function displayConfiguration(config: UserConfig): void {
  console.log(chalk.bold('Your Configuration:\n'));

  console.log(chalk.cyan('Mode:'), config.mode);

  console.log(chalk.cyan('\nLLM CLIs:'));
  Object.entries(config.llms).forEach(([name, enabled]) => {
    if (enabled) {
      console.log(chalk.green(`  ✓ ${name}`));
    }
  });

  console.log(chalk.cyan('\nAPI Management:'));
  console.log(config.tools.claudeCodeHub ? chalk.green('  ✓ claude-code-hub') : chalk.gray('  ✗ Direct LLM CLI usage'));

  console.log(chalk.cyan('\nAutomation Tools:'));
  const enabledTools = Object.entries(config.tools)
    .filter(([key, enabled]) => key !== 'claudeCodeHub' && enabled)
    .map(([key]) => key);
  if (enabledTools.length > 0) {
    enabledTools.forEach(tool => console.log(chalk.green(`  ✓ ${tool}`)));
  } else {
    console.log(chalk.gray('  ✗ None (manual workflow)'));
  }

  console.log(chalk.cyan('\nDocumentation:'));
  console.log(chalk.green(`  ✓ ${config.documentation.type}`));

  console.log(chalk.cyan('\nOrchestration:'));
  console.log(config.orchestration.agents ? chalk.green('  ✓ Agents') : chalk.gray('  ✗ Agents'));
  console.log(config.orchestration.mcpServers ? chalk.green('  ✓ MCP Servers') : chalk.gray('  ✗ MCP Servers'));
  console.log(config.orchestration.skills ? chalk.green('  ✓ Skills') : chalk.gray('  ✗ Skills'));

  console.log('');
}

/**
 * Create configuration files
 */
async function createConfigurationFiles(config: UserConfig): Promise<void> {
  const configDir = join(process.cwd(), '.product-builder');

  // Create directory
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
    console.log(chalk.green('✓ Created .product-builder/ directory'));
  }

  // Create main config file
  const mainConfig = {
    version: '0.1.0',
    mode: config.mode,
    llms: config.llms,
    tools: config.tools,
    documentation: config.documentation,
    orchestration: config.orchestration
  };

  writeFileSync(
    join(configDir, 'config.json'),
    JSON.stringify(mainConfig, null, 2),
    'utf-8'
  );
  console.log(chalk.green('✓ Created config.json'));

  // Create api-config.json
  const apiConfig = {
    llms: {},
    routing: {},
    openclaw: {}
  };
  writeFileSync(
    join(configDir, 'api-config.json'),
    JSON.stringify(apiConfig, null, 2),
    'utf-8'
  );
  console.log(chalk.green('✓ Created api-config.json'));

  // Create workflow-config.json
  const workflowConfig = {
    phases: []
  };
  writeFileSync(
    join(configDir, 'workflow-config.json'),
    JSON.stringify(workflowConfig, null, 2),
    'utf-8'
  );
  console.log(chalk.green('✓ Created workflow-config.json'));

  // Create subdirectories based on configuration
  if (config.orchestration.agents) {
    const agentsDir = join(configDir, 'agents');
    mkdirSync(agentsDir, { recursive: true });
    mkdirSync(join(agentsDir, 'subagents'), { recursive: true });
    mkdirSync(join(agentsDir, 'teams'), { recursive: true });
    console.log(chalk.green('✓ Created agents/ directory structure'));
  }

  if (config.documentation.type === 'openspec' || config.documentation.type === 'both') {
    const openspecDir = join(configDir, 'openspec');
    mkdirSync(openspecDir, { recursive: true });
    mkdirSync(join(openspecDir, 'specs'), { recursive: true });
    console.log(chalk.green('✓ Created openspec/ directory structure'));
  }

  if (config.orchestration.skills) {
    const skillsDir = join(configDir, 'skills');
    mkdirSync(skillsDir, { recursive: true });
    console.log(chalk.green('✓ Created skills/ directory'));
  }
}

/**
 * Display next steps
 */
function displayNextSteps(config: UserConfig): void {
  console.log(chalk.bold('Next Steps:\n'));

  console.log('1. Check your setup:');
  console.log(chalk.gray('   pb status\n'));

  if (config.mode === 'minimal') {
    console.log('2. Start using your LLM CLI:');
    console.log(chalk.gray('   Just use claude (or your chosen LLM) as usual!\n'));
  } else {
    console.log('2. Configure your tools:');
    console.log(chalk.gray('   pb config\n'));

    console.log('3. Set up API keys:');
    console.log(chalk.gray('   Use the LLM CLI Configuration menu\n'));
  }

  console.log(chalk.cyan('For help: pb --help'));
}

/**
 * Prompt user to continue
 */
async function promptContinue(): Promise<void> {
  await input.text({
    prompt: 'Press Enter to continue',
    allowEmpty: true
  });
}
