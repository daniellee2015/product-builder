/**
 * Simple Menu Component for New Architecture
 * Returns string arrays and uses raw mode for interaction
 */

import readline from 'readline';
import { Component, Rect, hintManager, screenManager, computeLayout } from 'cli-menu-kit';

export interface SimpleMenuOption {
  label: string;
  value: string;
  shortcut?: string; // Letter shortcut (e.g., 'i' for Init)
}

export interface SimpleMenuConfig {
  title: string;
  description?: string;
  options: SimpleMenuOption[];
  allowNumberKeys?: boolean;
  allowLetterKeys?: boolean;
  onSelect: (value: string) => Promise<void>;
}

/**
 * Create a simple menu component using new architecture
 */
export function createSimpleMenuComponent(config: SimpleMenuConfig): Component {
  let selectedIndex = 0;

  // Build shortcut map
  const shortcutMap = new Map<string, number>();
  config.options.forEach((option, index) => {
    if (option.shortcut) {
      shortcutMap.set(option.shortcut.toLowerCase(), index);
    }
  });

  return {
    type: 'menu',
    regionId: 'main',
    render: (rect: Rect) => {
      const lines: string[] = [];

      // Title
      if (config.title) {
        lines.push(`\x1b[36m${config.title}\x1b[0m`);
        lines.push('─'.repeat(Math.min(rect.width, 50)));
        lines.push('');
      }

      // Description
      if (config.description) {
        lines.push(config.description);
        lines.push('');
      }

      // Options
      config.options.forEach((option, index) => {
        const isSelected = index === selectedIndex;
        const prefix = isSelected ? '\x1b[32m>\x1b[0m' : ' ';

        // Add number prefix if enabled
        let displayLabel = option.label;
        if (config.allowNumberKeys) {
          displayLabel = `${index + 1}. ${displayLabel}`;
        }

        // Highlight shortcut letter if present
        if (option.shortcut && config.allowLetterKeys) {
          const shortcut = option.shortcut.toLowerCase();
          const regex = new RegExp(`(${shortcut})`, 'i');
          displayLabel = displayLabel.replace(regex, '\x1b[4m$1\x1b[24m');
        }

        const text = isSelected ? `\x1b[32m\x1b[1m${displayLabel}\x1b[0m` : displayLabel;
        lines.push(`${prefix} ${text}`);
      });

      // Fill remaining lines
      while (lines.length < rect.height) {
        lines.push('');
      }

      return lines;
    },
    interact: async () => {
      return new Promise<void>((resolve) => {
        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY) process.stdin.setRawMode(true);

        const onKey = async (str: string, key: readline.Key) => {
          if (key.ctrl && key.name === 'c') {
            cleanup();
            process.exit(0);
          }

          let needsUpdate = false;

          // Arrow key navigation
          if (key.name === 'up') {
            selectedIndex = (selectedIndex - 1 + config.options.length) % config.options.length;
            needsUpdate = true;
          } else if (key.name === 'down') {
            selectedIndex = (selectedIndex + 1) % config.options.length;
            needsUpdate = true;
          }
          // Number key selection
          else if (config.allowNumberKeys && str && /^[0-9]$/.test(str)) {
            const num = parseInt(str, 10);
            if (num > 0 && num <= config.options.length) {
              selectedIndex = num - 1;
              needsUpdate = true;
            }
          }
          // Letter key selection
          else if (config.allowLetterKeys && str && /^[a-zA-Z]$/.test(str)) {
            const index = shortcutMap.get(str.toLowerCase());
            if (index !== undefined) {
              selectedIndex = index;
              needsUpdate = true;
            }
          }
          // Enter to confirm
          else if (key.name === 'return') {
            cleanup();
            const selectedValue = config.options[selectedIndex].value;
            await config.onSelect(selectedValue);
            resolve();
            return;
          }

          // Update display if selection changed
          if (needsUpdate) {
            const layout = computeLayout();
            const lines = (this as any).render(layout.main);
            screenManager.renderRegion('main', lines);

            // Update hint
            hintManager.set('menu', `Selected: ${config.options[selectedIndex].label}`, 10);
          }
        };

        function cleanup() {
          process.stdin.off('keypress', onKey);
          if (process.stdin.isTTY) process.stdin.setRawMode(false);
          hintManager.clear('menu');
        }

        process.stdin.on('keypress', onKey);

        // Set initial hint
        hintManager.set('menu', `Selected: ${config.options[selectedIndex].label}`, 10);
      });
    },
    config
  };
}
