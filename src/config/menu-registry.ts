/**
 * Centralized Menu Registry
 * All menu configurations in one place for easy management
 */

export interface MenuItem {
  key: string;
  id: string;
  label: string;
  desc: string;
}

export interface MenuGroup {
  label: string;
  items: MenuItem[];
}

export interface MenuConfig {
  title: string;
  desc?: string;
  headerLevel: 'full' | 'section' | 'simple' | 'none';
  headerWidth?: number;
  items?: MenuItem[];
  groups?: MenuGroup[];
  backLabel?: string;
}

export const MENUS: Record<string, MenuConfig> = {
  main: {
    title: 'Product Builder CLI',
    desc: 'AI-Driven Product Development Orchestrator',
    headerLevel: 'full',
    groups: [
      {
        label: 'Setup',
        items: [
          { key: '1', id: 'init', label: 'Initialize configuration', desc: 'Set up Product Builder' },
          { key: '2', id: 'status', label: 'Check status', desc: 'View system dependencies' },
          { key: '3', id: 'reset', label: 'Reset configuration', desc: 'Clear and reconfigure' }
        ]
      },
      {
        label: 'Workflow',
        items: [
          { key: '4', id: 'workflow', label: 'Workflow config', desc: 'Configure workflow definition' },
          { key: '5', id: 'jobs', label: 'Jobs & Tasks', desc: 'Manage jobs and tasks' }
        ]
      },
      {
        label: 'Tools Configuration',
        items: [
          { key: '6', id: 'llm-cli', label: 'LLM CLI', desc: 'Configure AI models' },
          { key: '7', id: 'arch-tools', label: 'Architecture tools', desc: 'CCB, CCA, CCH, Ralph' },
          { key: '8', id: 'docs', label: 'Documentation', desc: 'OpenSpec, Mint, MD' },
          { key: '9', id: 'mcp', label: 'MCP Servers', desc: 'Model Context Protocol' },
          { key: '0', id: 'skills', label: 'Skills', desc: 'Reusable workflows' },
          { key: 'A', id: 'agents', label: 'Agents', desc: 'Subagents and teams' }
        ]
      },
      {
        label: 'System',
        items: [
          { key: 'S', id: 'settings', label: 'Settings', desc: 'User preferences' },
          { key: 'V', id: 'view-config', label: 'View configuration', desc: 'Show current settings' },
          { key: 'D', id: 'deps', label: 'Dependencies', desc: 'Install requirements' },
          { key: 'H', id: 'help', label: 'Help', desc: 'Show documentation' },
          { key: 'Q', id: 'exit', label: 'Exit', desc: '' }
        ]
      }
    ]
  },

  workflow: {
    title: 'Workflow Configuration',
    desc: 'Configure workflow definition and structure',
    headerLevel: 'section',
    headerWidth: 50,
    backLabel: 'Back to main menu',
    items: [
      { key: '1', id: 'view', label: 'View workflow', desc: 'Show current workflow definition' },
      { key: '2', id: 'switch-mode', label: 'Switch mode', desc: 'Change to base mode (lite/standard/full)' },
      { key: '3', id: 'edit', label: 'Edit workflow', desc: 'Enable/disable steps (multi-select)' },
      { key: '4', id: 'import', label: 'Import workflow', desc: 'Load custom workflow configuration' },
      { key: '5', id: 'export', label: 'Export workflow', desc: 'Save current workflow configuration' },
      { key: '6', id: 'reset', label: 'Reset workflow', desc: 'Reset to base mode defaults' }
    ]
  },

  'jobs-tasks': {
    title: 'Jobs & Tasks Management',
    desc: 'Manage jobs, tasks, and roadmap',
    headerLevel: 'section',
    headerWidth: 50,
    backLabel: 'Back to main menu',
    items: [
      { key: '1', id: 'roadmap', label: 'View roadmap', desc: 'Show overall project roadmap' },
      { key: '2', id: 'list-jobs', label: 'List jobs', desc: 'Show all jobs' },
      { key: '3', id: 'job-details', label: 'View job details', desc: 'View specific job and its tasks' },
      { key: '4', id: 'list-tasks', label: 'List tasks', desc: 'Show all tasks across jobs' },
      { key: '5', id: 'task-details', label: 'View task details', desc: 'View specific task details' }
    ]
  },

  'llm-cli': {
    title: 'Configure API / Routing',
    desc: 'Configure AI model providers and routing',
    headerLevel: 'section',
    headerWidth: 50,
    backLabel: 'Back to main menu',
    items: [
      { key: '1', id: 'official-api', label: 'Official API', desc: 'Configure official API endpoints' },
      { key: '2', id: 'custom-api', label: 'Custom API', desc: 'Configure custom endpoints (PackyAPI, self-hosted, etc.)' },
      { key: '3', id: 'view-status', label: 'View Status', desc: 'Show current configuration' },
      { key: '4', id: 'switch-config', label: 'Switch Configuration', desc: 'Manage multiple configs' },
      { key: '5', id: 'enable-hub', label: 'Enable Code Hub', desc: 'Use cchub for routing' }
    ]
  },

  'arch-tools': {
    title: 'Architecture Tools',
    desc: 'Configure development architecture tools',
    headerLevel: 'section',
    headerWidth: 50,
    backLabel: 'Back to main menu',
    items: [
      { key: '1', id: 'ccb', label: 'CCB (Claude Code Bridge)', desc: 'Configure CCB settings' },
      { key: '2', id: 'cca', label: 'CCA (Cross-Claude Agent)', desc: 'Configure CCA routing' },
      { key: '3', id: 'cch', label: 'CCH (claude-code-hub)', desc: 'Configure API routing' },
      { key: '4', id: 'ralph', label: 'Ralph (Retry Loop)', desc: 'Configure retry settings' },
      { key: '5', id: 'openclaw', label: 'OpenClaw', desc: 'Configure OpenClaw settings' }
    ]
  }
};

/**
 * Build radio menu options from a MenuConfig
 */
export function buildMenuOptions(config: MenuConfig): any[] {
  const options: any[] = [];

  if (config.groups) {
    for (const group of config.groups) {
      options.push({ type: 'separator', label: group.label });
      for (const item of group.items) {
        const desc = item.desc ? ` - ${item.desc}` : '';
        options.push(`${item.key}. ${item.label}${desc}`);
      }
    }
  } else if (config.items) {
    for (const item of config.items) {
      const desc = item.desc ? ` - ${item.desc}` : '';
      options.push(`${item.key}. ${item.label}${desc}`);
    }
    if (config.backLabel) {
      options.push(`b. ${config.backLabel} - Return to main menu`);
    }
  }

  return options;
}

/**
 * Find which item was selected from a menu result value
 */
export function findSelectedItem(config: MenuConfig, value: string): MenuItem | null {
  const allItems = config.groups
    ? config.groups.flatMap(g => g.items)
    : config.items || [];

  return allItems.find(item => value.includes(item.label)) || null;
}
