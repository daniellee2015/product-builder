/**
 * LLM CLI Display Logic
 */

import chalk from 'chalk';
import { loadAPIConfig } from './api-manager';
import i18n from '../../../../libs/i18n';

/**
 * Display API configuration
 */
export function displayAPIConfig(): void {
  console.log(chalk.cyan.bold(`\n${i18n.t('llm.display.apiConfig')}\n`));

  const config = loadAPIConfig();

  // Display LLM configs
  console.log(chalk.bold(`${i18n.t('llm.display.llmAPIs')}:`));
  const llmNames = ['claude', 'gemini', 'codex', 'opencode'];

  for (const llmName of llmNames) {
    const llmConfig = config.llms[llmName as keyof typeof config.llms];
    if (llmConfig) {
      const status = llmConfig.enabled
        ? chalk.green(i18n.t('llm.display.enabled'))
        : chalk.gray(i18n.t('llm.display.disabled'));
      console.log(`  ${llmName}: ${status}`);

      if (llmConfig.apiKey) {
        const maskedKey = llmConfig.apiKey.substring(0, 8) + '...' + llmConfig.apiKey.substring(llmConfig.apiKey.length - 4);
        console.log(chalk.gray(`    ${i18n.t('llm.display.apiKey')}: ${maskedKey}`));
      }
      if (llmConfig.model) {
        console.log(chalk.gray(`    ${i18n.t('llm.display.model')}: ${llmConfig.model}`));
      }
      if (llmConfig.apiUrl) {
        console.log(chalk.gray(`    ${i18n.t('llm.display.apiUrl')}: ${llmConfig.apiUrl}`));
      }
      if (llmConfig.priority) {
        console.log(chalk.gray(`    ${i18n.t('llm.display.priority')}: ${llmConfig.priority}`));
      }
    } else {
      console.log(`  ${llmName}: ${chalk.gray(i18n.t('llm.display.notConfigured'))}`);
    }
  }

  console.log('');

  // Display routing config
  if (config.routing) {
    console.log(chalk.bold(`${i18n.t('llm.display.routing')} Configuration:`));

    // Show claude-code-hub status
    const hubStatus = config.routing.hubEnabled
      ? chalk.green(i18n.t('llm.display.enabled'))
      : chalk.gray(i18n.t('llm.display.disabled'));
    console.log(`  ${i18n.t('llm.display.codeHub')}: ${hubStatus}`);

    if (config.routing.defaultLLM) {
      console.log(`  ${i18n.t('llm.display.defaultLLM')}: ${chalk.green(config.routing.defaultLLM)}`);
    }
    if (config.routing.fallbackOrder && config.routing.fallbackOrder.length > 0) {
      console.log(`  Fallback Order: ${config.routing.fallbackOrder.join(' → ')}`);
    }
    console.log('');
  }

  // Display OpenClaw config
  if (config.openclaw) {
    console.log(chalk.bold('OpenClaw Configuration:'));
    const status = config.openclaw.enabled
      ? chalk.green(i18n.t('llm.display.enabled'))
      : chalk.gray(i18n.t('llm.display.disabled'));
    console.log(`  Status: ${status}`);
    if (config.openclaw.port) {
      console.log(`  Port: ${config.openclaw.port}`);
    }
    if (config.openclaw.apiUrl) {
      console.log(`  ${i18n.t('llm.display.apiUrl')}: ${config.openclaw.apiUrl}`);
    }
    console.log('');
  }
}
