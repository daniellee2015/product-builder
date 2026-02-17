#!/usr/bin/env node

/**
 * Test entry point for new architecture main menu
 */

import { showMainMenuNew } from './menu-new.js';

showMainMenuNew().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
