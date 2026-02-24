/**
 * Settings Menu
 * User configuration and preferences
 */

import {
  renderPage,
  menu,
  showSuccess,
  showInfo,
  generateMenuHints,
  loadConfig,
  saveConfig,
  resetConfig,
  getSupportedLanguages,
  getLanguageConfig,
  type UserConfig
} from 'cli-menu-kit';
import chalk from 'chalk';
import i18n from '../../libs/i18n';

/**
 * Show settings menu
 */
export async function showSettingsMenu(back: () => Promise<void>): Promise<void> {
  const config = loadConfig();

  const result = await renderPage({
    header: {
      type: 'simple',
      text: 'Settings'
    },
    mainArea: {
      type: 'menu',
      menu: {
        options: [
          {
            key: '1',
            label: 'Language',
            value: 'language',
            description: `Current: ${config.language || 'en'}`
          },
          {
            key: '2',
            label: 'Workflow Mode',
            value: 'workflow_mode',
            description: `Current: ${config.workflow_mode || 'full'}`
          },
          {
            key: '3',
            label: 'Auto Save',
            value: 'auto_save',
            description: `Current: ${config.auto_save ? 'Enabled' : 'Disabled'}`
          },
          {
            key: '4',
            label: 'View All Settings',
            value: 'view_all'
          },
          {
            key: '5',
            label: 'Reset to Defaults',
            value: 'reset'
          },
          {
            key: 'b',
            label: 'Back',
            value: 'back'
          }
        ],
        allowLetterKeys: true,
        allowNumberKeys: true,
        preserveOnSelect: true
      }
    },
    footer: {
      hints: generateMenuHints({
        hasMultipleOptions: true,
        allowNumberKeys: true,
        allowLetterKeys: true
      })
    }
  });

  switch (result.value) {
    case 'language':
      await changeLanguage(back);
      break;
    case 'workflow_mode':
      await changeWorkflowMode(back);
      break;
    case 'auto_save':
      await toggleAutoSave(back);
      break;
    case 'view_all':
      await viewAllSettings(back);
      break;
    case 'reset':
      await resetSettings(back);
      break;
    case 'back':
      await back();
      break;
    default:
      await back();
  }
}

/**
 * Change language setting
 */
async function changeLanguage(back: () => Promise<void>): Promise<void> {
  const config = loadConfig();

  console.log('');
  console.log(chalk.bold('Select Language:'));
  console.log('');

  // Dynamically generate language options from cli-menu-kit config
  const languageOptions = getSupportedLanguages().map(lang => ({
    label: `${lang.label} (${lang.nativeLabel})`,
    value: lang.code
  }));

  // Add back option
  languageOptions.push({ label: 'Back', value: 'back' });

  const result = await menu.radio({
    options: languageOptions
  }, generateMenuHints({ hasMultipleOptions: true }));

  if (result.value === 'back') {
    await showSettingsMenu(back);
    return;
  }

  const selectedLang = getLanguageConfig(result.value);
  saveConfig({ language: result.value });
  console.log('');
  showSuccess(`Language changed to: ${selectedLang?.nativeLabel || result.value}`);
  console.log(chalk.gray('Note: Restart the application for changes to take effect.'));
  console.log('');

  await showSettingsMenu(back);
}

/**
 * Change workflow mode setting
 */
async function changeWorkflowMode(back: () => Promise<void>): Promise<void> {
  const config = loadConfig();

  console.log('');
  console.log(chalk.bold('Select Workflow Mode:'));
  console.log('');

  const result = await menu.radio({
    options: [
      { label: 'Lite (16 steps)', value: 'lite' },
      { label: 'Standard (44 steps)', value: 'standard' },
      { label: 'Full (56 steps)', value: 'full' },
      { label: 'Back', value: 'back' }
    ]
  }, generateMenuHints({ hasMultipleOptions: true }));

  if (result.value === 'back') {
    await showSettingsMenu(back);
    return;
  }

  saveConfig({ workflow_mode: result.value });
  console.log('');
  showSuccess(`Workflow mode changed to: ${result.value}`);
  console.log('');

  await showSettingsMenu(back);
}

/**
 * Toggle auto save setting
 */
async function toggleAutoSave(back: () => Promise<void>): Promise<void> {
  const config = loadConfig();
  const newValue = !config.auto_save;

  saveConfig({ auto_save: newValue });
  console.log('');
  showSuccess(`Auto save ${newValue ? 'enabled' : 'disabled'}`);
  console.log('');

  await showSettingsMenu(back);
}

/**
 * View all settings
 */
async function viewAllSettings(back: () => Promise<void>): Promise<void> {
  const config = loadConfig();

  console.log('');
  console.log(chalk.bold('Current Settings:'));
  console.log('');
  console.log(chalk.cyan('  Language:       ') + (config.language || 'en'));
  console.log(chalk.cyan('  Workflow Mode:  ') + (config.workflow_mode || 'full'));
  console.log(chalk.cyan('  Auto Save:      ') + (config.auto_save ? 'Enabled' : 'Disabled'));
  console.log(chalk.cyan('  Default LLM:    ') + (config.default_llm || 'Not set'));
  console.log(chalk.cyan('  Job Root:       ') + (config.job_root || 'Not set'));
  console.log(chalk.cyan('  Last Updated:   ') + (config.updated_at || 'Never'));
  console.log('');

  const result = await menu.booleanH('Press Enter to continue', true);
  await showSettingsMenu(back);
}

/**
 * Reset settings to defaults
 */
async function resetSettings(back: () => Promise<void>): Promise<void> {
  console.log('');
  const confirm = await menu.booleanH(
    'Are you sure you want to reset all settings to defaults?',
    false
  );

  if (confirm) {
    resetConfig();
    console.log('');
    showSuccess('Settings reset to defaults');
    console.log('');
  } else {
    console.log('');
    showInfo('Reset cancelled');
    console.log('');
  }

  await showSettingsMenu(back);
}
