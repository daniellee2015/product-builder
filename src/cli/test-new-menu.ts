/**
 * Test menu using new architecture
 */

import {
  renderPageV2,
  screenManager,
  hintManager,
  computeLayout
} from 'cli-menu-kit';
import { createSimpleMenuComponent } from './components/simple-menu.js';
import {
  createSimpleHeaderComponent,
  createSimpleHintsComponent,
  createSimplePromptComponent
} from './components/simple-components.js';

async function testNewArchitecture() {
  // Enter alt screen
  screenManager.enter();

  // Compute layout
  const layout = computeLayout();

  // Register regions
  screenManager.registerRegion('header', layout.header);
  screenManager.registerRegion('main', layout.main);
  screenManager.registerRegion('footerHints', layout.footerHints);
  screenManager.registerRegion('footerPrompt', layout.footerPrompt);

  // Create components
  const headerComponent = createSimpleHeaderComponent({
    title: 'Product Builder - Test Menu',
    subtitle: 'Testing new architecture'
  });

  const menuComponent = createSimpleMenuComponent({
    title: 'Main Menu',
    description: 'Select an option:',
    options: [
      { label: 'Option 1', value: 'opt1' },
      { label: 'Option 2', value: 'opt2' },
      { label: 'Option 3', value: 'opt3' },
      { label: 'Exit', value: 'exit' }
    ],
    onSelect: async (value) => {
      if (value === 'exit') {
        screenManager.exit();
        console.log('Goodbye!');
        process.exit(0);
      } else {
        // For now, just exit after selection
        screenManager.exit();
        console.log(`You selected: ${value}`);
        process.exit(0);
      }
    }
  });

  const hintsComponent = createSimpleHintsComponent();
  const promptComponent = createSimplePromptComponent('↑/↓ Navigate • Enter Select • Ctrl+C Exit');

  // Phase 1: Initial render
  screenManager.renderRegion('header', headerComponent.render(layout.header));
  screenManager.renderRegion('main', menuComponent.render(layout.main));
  screenManager.renderRegion('footerHints', hintsComponent.render(layout.footerHints));
  screenManager.renderRegion('footerPrompt', promptComponent.render(layout.footerPrompt));

  // Setup hint manager listener
  hintManager.on('change', (text: string) => {
    screenManager.renderRegion('footerHints', [text]);
  });

  // Phase 2: Handle interaction
  if (menuComponent.interact) {
    await menuComponent.interact();
  }

  // Exit alt screen
  screenManager.exit();
}

testNewArchitecture().catch((err) => {
  screenManager.exit();
  console.error('Error:', err);
  process.exit(1);
});
