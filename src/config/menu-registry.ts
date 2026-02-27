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
    items: [
      { key: '1', id: 'setup', label: 'Setup', desc: 'Initialize and configure system' },
      { key: '2', id: 'project-mgmt', label: 'Project Management', desc: 'Configure scheduling layer' },
      { key: '3', id: 'workflow', label: 'Workflow', desc: 'Configure workflows' },
      { key: '4', id: 'job-mgmt', label: 'Job Management', desc: 'Manage jobs and tasks' },
      { key: '5', id: 'agents', label: 'Agents', desc: 'Configure agents' },
      { key: '6', id: 'ai-gateway', label: 'AI Gateway', desc: 'Configure LLM API and routing' },
      { key: '7', id: 'tools', label: 'Tools', desc: 'Configure tools and services' },
      { key: '8', id: 'settings', label: 'Settings', desc: 'System settings and help' },
      { key: 'Q', id: 'exit', label: 'Exit', desc: '' }
    ]
  },

  setup: {
    title: 'Setup',
    desc: 'Initialize and configure system',
    headerLevel: 'section',
    headerWidth: 50,
    backLabel: 'Back to main menu',
    items: [
      { key: '1', id: 'init', label: 'Initialize configuration', desc: 'Set up Product Builder' },
      { key: '2', id: 'status', label: 'Check status', desc: 'View system dependencies' },
      { key: '3', id: 'reset', label: 'Reset configuration', desc: 'Clear and reconfigure' }
    ]
  },

  'project-mgmt': {
    title: 'Project Management',
    desc: 'Configure scheduling layer',
    headerLevel: 'section',
    headerWidth: 50,
    backLabel: 'Back to main menu',
    items: [
      { key: '1', id: 'scheduler-impl', label: 'Scheduler implementation', desc: 'Choose OpenClaw or CodeAct' },
      { key: '2', id: 'scheduling-policies', label: 'Scheduling policies', desc: 'Configure scheduling rules' },
      { key: '3', id: 'project-config', label: 'Project configuration', desc: 'Project-level settings' }
    ]
  },

  workflow: {
    title: 'Workflow Configuration',
    desc: 'Configure workflows',
    headerLevel: 'section',
    headerWidth: 50,
    backLabel: 'Back to main menu',
    items: [
      { key: '1', id: 'scheduling-workflow', label: 'Scheduling workflow', desc: 'Manage scheduling workflow' },
      { key: '2', id: 'development-workflow', label: 'Development workflow', desc: 'Manage development workflow' },
      { key: '3', id: 'coordination', label: 'Coordination', desc: 'Manage workflow coordination' }
    ]
  },

  'job-mgmt': {
    title: 'Job Management',
    desc: 'Manage jobs and tasks',
    headerLevel: 'section',
    headerWidth: 50,
    backLabel: 'Back to main menu',
    items: [
      { key: '1', id: 'job-operations', label: 'Job operations', desc: 'Start/Pause/Resume/Cancel jobs' },
      { key: '2', id: 'job-viewing', label: 'Job viewing', desc: 'View jobs and logs' },
      { key: '3', id: 'task-management', label: 'Task management', desc: 'Manage tasks' },
      { key: '4', id: 'roadmap', label: 'View roadmap', desc: 'Show overall project roadmap' }
    ]
  },

  agents: {
    title: 'Agents Configuration',
    desc: 'Configure agents and related plugins',
    headerLevel: 'section',
    headerWidth: 50,
    backLabel: 'Back to main menu',
    items: [
      { key: '1', id: 'scheduling-agents', label: 'Scheduling agents', desc: 'Configure PM/Traffic agents' },
      { key: '2', id: 'workflow-agents', label: 'Workflow agents', desc: 'Configure workflow agents' },
      { key: '3', id: 'mcp', label: 'MCP Servers', desc: 'Model Context Protocol' },
      { key: '4', id: 'skills', label: 'Skills', desc: 'Reusable workflows' },
      { key: '5', id: 'hooks', label: 'Hooks', desc: 'Lifecycle hooks' },
      { key: '6', id: 'prompts', label: 'Prompts', desc: 'Prompt templates' },
      { key: '7', id: 'agent-interfaces', label: 'Agent interfaces', desc: 'Agent communication (future)' }
    ]
  },

  'ai-gateway': {
    title: 'AI Gateway Configuration',
    desc: 'Configure LLM API and routing',
    headerLevel: 'section',
    headerWidth: 50,
    backLabel: 'Back to main menu',
    items: [
      { key: '1', id: 'official-api', label: 'Official API', desc: 'Configure official API endpoints' },
      { key: '2', id: 'custom-api', label: 'Custom API', desc: 'Configure custom endpoints' },
      { key: '3', id: 'view-status', label: 'View Status', desc: 'Show current configuration' },
      { key: '4', id: 'switch-config', label: 'Switch Configuration', desc: 'Manage multiple configs' },
      { key: '5', id: 'enable-hub', label: 'Enable Code Hub', desc: 'Use cchub for routing' }
    ]
  },

  tools: {
    title: 'Tools Configuration',
    desc: 'Configure development tools and services',
    headerLevel: 'section',
    headerWidth: 50,
    backLabel: 'Back to main menu',
    items: [
      { key: '1', id: 'arch-tools', label: 'Architecture tools', desc: 'CCB, CCA, CCH, Ralph, OpenClaw' },
      { key: '2', id: 'docs', label: 'Documentation', desc: 'OpenSpec, Mint, MD' },
      { key: '3', id: 'deps', label: 'Dependencies', desc: 'Install requirements' }
    ]
  },

  settings: {
    title: 'Settings',
    desc: 'System settings and help',
    headerLevel: 'section',
    headerWidth: 50,
    backLabel: 'Back to main menu',
    items: [
      { key: '1', id: 'user-settings', label: 'Settings', desc: 'User preferences' },
      { key: '2', id: 'view-config', label: 'View configuration', desc: 'Show current settings' },
      { key: '3', id: 'help', label: 'Help', desc: 'Show documentation' }
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
