/**
 * Status Check Menu
 */

import { input } from 'cli-menu-kit';
import { displaySystemStatus } from './display';
import i18n from '../../libs/i18n';

async function promptContinue(): Promise<void> {
  await input.text({
    prompt: i18n.t('common.continue'),
    allowEmpty: true
  });
}

export async function showStatusCheck(showMainMenu: () => Promise<void>): Promise<void> {
  await displaySystemStatus();
  await promptContinue();
  await showMainMenu();
}
