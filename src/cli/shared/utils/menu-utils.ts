/**
 * Utility functions for CLI menus
 */

import { input } from 'cli-menu-kit';

/**
 * Prompt user to continue
 */
export async function promptContinue(): Promise<void> {
  await input.text({
    prompt: 'Press Enter to continue',
    allowEmpty: true
  });
}
