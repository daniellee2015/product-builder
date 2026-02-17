/**
 * Simple Header Component for New Architecture
 */

import { Component, Rect } from 'cli-menu-kit';

export interface SimpleHeaderConfig {
  title: string;
  subtitle?: string;
}

export function createSimpleHeaderComponent(config: SimpleHeaderConfig): Component {
  return {
    type: 'header',
    regionId: 'header',
    render: (rect: Rect) => {
      const lines: string[] = [];

      // Title
      lines.push(`\x1b[36m\x1b[1m${config.title}\x1b[0m`);

      // Subtitle
      if (config.subtitle) {
        lines.push(config.subtitle);
      } else {
        lines.push('');
      }

      // Separator
      lines.push('─'.repeat(Math.min(rect.width, 80)));

      return lines;
    }
  };
}

export function createSimpleHintsComponent(): Component {
  return {
    type: 'hints',
    regionId: 'footerHints',
    render: (rect: Rect) => {
      // This will be updated by HintManager
      return [''];
    }
  };
}

export function createSimplePromptComponent(text: string): Component {
  return {
    type: 'prompt',
    regionId: 'footerPrompt',
    render: (rect: Rect) => {
      return [text];
    }
  };
}
