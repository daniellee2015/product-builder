import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface ToolStatus {
  name: string;
  installed: boolean;
  version?: string;
  path?: string;
  notes?: string;
}

export interface DependencyStatus {
  environment: ToolStatus[];
  llmCLIs: ToolStatus[];
  architectureTools: ToolStatus[];
  documentationTools: ToolStatus[];
  npmPackages: ToolStatus[];
}

/**
 * Check if a command exists in PATH
 */
function commandExists(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get version of a command
 */
function getCommandVersion(command: string, versionFlag: string = '--version'): string | undefined {
  try {
    const output = execSync(`${command} ${versionFlag}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return output.trim().split('\n')[0];
  } catch {
    return undefined;
  }
}

/**
 * Get path of a command
 */
function getCommandPath(command: string): string | undefined {
  try {
    const output = execSync(`which ${command}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return output.trim();
  } catch {
    return undefined;
  }
}

/**
 * Check if npm package is installed globally
 */
function checkNpmPackage(packageName: string): ToolStatus {
  try {
    const output = execSync(`npm list -g ${packageName} --depth=0`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });

    const versionMatch = output.match(new RegExp(`${packageName.replace(/\//g, '\\/')}@([\\d.]+)`));
    const version = versionMatch ? versionMatch[1] : undefined;

    return {
      name: packageName,
      installed: true,
      version
    };
  } catch {
    return {
      name: packageName,
      installed: false
    };
  }
}

/**
 * Check if Docker service is running
 */
function checkDockerService(): ToolStatus {
  const installed = commandExists('docker');

  if (!installed) {
    return {
      name: 'Docker',
      installed: false,
      notes: 'Required for claude-code-hub'
    };
  }

  try {
    // Check if Docker daemon is running
    execSync('docker info', { stdio: 'ignore' });
    return {
      name: 'Docker',
      installed: true,
      version: getCommandVersion('docker', '--version'),
      path: getCommandPath('docker'),
      notes: 'Service running'
    };
  } catch {
    return {
      name: 'Docker',
      installed: true,
      version: getCommandVersion('docker', '--version'),
      path: getCommandPath('docker'),
      notes: 'Service not running'
    };
  }
}

/**
 * Check environment tools (Layer 0)
 */
export function checkEnvironment(): ToolStatus[] {
  const tools: ToolStatus[] = [];

  // Node.js
  const nodeInstalled = commandExists('node');
  tools.push({
    name: 'Node.js',
    installed: nodeInstalled,
    version: nodeInstalled ? getCommandVersion('node', '--version') : undefined,
    path: nodeInstalled ? getCommandPath('node') : undefined,
    notes: nodeInstalled ? undefined : 'Required'
  });

  // npm
  const npmInstalled = commandExists('npm');
  tools.push({
    name: 'npm',
    installed: npmInstalled,
    version: npmInstalled ? getCommandVersion('npm', '--version') : undefined,
    path: npmInstalled ? getCommandPath('npm') : undefined
  });

  // pnpm
  const pnpmInstalled = commandExists('pnpm');
  if (pnpmInstalled) {
    tools.push({
      name: 'pnpm',
      installed: true,
      version: getCommandVersion('pnpm', '--version'),
      path: getCommandPath('pnpm')
    });
  }

  // yarn
  const yarnInstalled = commandExists('yarn');
  if (yarnInstalled) {
    tools.push({
      name: 'yarn',
      installed: true,
      version: getCommandVersion('yarn', '--version'),
      path: getCommandPath('yarn')
    });
  }

  // bun
  const bunInstalled = commandExists('bun');
  if (bunInstalled) {
    tools.push({
      name: 'bun',
      installed: true,
      version: getCommandVersion('bun', '--version'),
      path: getCommandPath('bun')
    });
  }

  // tmux
  const tmuxInstalled = commandExists('tmux');
  tools.push({
    name: 'tmux',
    installed: tmuxInstalled,
    version: tmuxInstalled ? getCommandVersion('tmux', '-V') : undefined,
    path: tmuxInstalled ? getCommandPath('tmux') : undefined,
    notes: tmuxInstalled ? undefined : 'Required for multi-project support'
  });

  // Docker
  tools.push(checkDockerService());

  // Docker Compose
  const dockerComposeInstalled = commandExists('docker-compose') || commandExists('docker');
  if (dockerComposeInstalled) {
    tools.push({
      name: 'Docker Compose',
      installed: true,
      version: commandExists('docker-compose')
        ? getCommandVersion('docker-compose', '--version')
        : getCommandVersion('docker', 'compose version'),
      notes: 'Required for claude-code-hub'
    });
  } else {
    tools.push({
      name: 'Docker Compose',
      installed: false,
      notes: 'Required for claude-code-hub'
    });
  }

  // PostgreSQL
  const psqlInstalled = commandExists('psql');
  if (psqlInstalled) {
    tools.push({
      name: 'PostgreSQL',
      installed: true,
      version: getCommandVersion('psql', '--version'),
      path: getCommandPath('psql'),
      notes: 'Required for claude-code-hub'
    });
  }

  // Redis
  const redisInstalled = commandExists('redis-cli');
  if (redisInstalled) {
    tools.push({
      name: 'Redis',
      installed: true,
      version: getCommandVersion('redis-cli', '--version'),
      path: getCommandPath('redis-cli'),
      notes: 'Required for claude-code-hub'
    });
  }

  return tools;
}

/**
 * Check LLM CLI tools (Layer 1)
 */
export function checkLLMCLIs(): ToolStatus[] {
  const tools = [
    { name: 'claude', command: 'claude', versionFlag: '--version' },
    { name: 'gemini', command: 'gemini', versionFlag: '--version' },
    { name: 'codex', command: 'codex', versionFlag: '--version' },
    { name: 'opencode', command: 'opencode', versionFlag: '--version' }
  ];

  return tools.map(tool => {
    const installed = commandExists(tool.command);
    return {
      name: tool.name,
      installed,
      version: installed ? getCommandVersion(tool.command, tool.versionFlag) : undefined,
      path: installed ? getCommandPath(tool.command) : undefined,
      notes: installed ? undefined : 'Optional - At least 1 LLM CLI required'
    };
  });
}

/**
 * Check architecture tools (Layer 2)
 */
export function checkArchitectureTools(): ToolStatus[] {
  const tools = [
    { name: 'CCB', command: 'ccb', versionFlag: '--version', notes: 'Optional - Claude Code automation' },
    { name: 'CCA', command: 'cca', versionFlag: '--version', notes: 'Optional - Cross-LLM routing' },
    { name: 'Ralph', command: 'ralph', versionFlag: '--version', notes: 'Optional - Retry logic' },
    { name: 'OpenClaw', command: 'openclaw', versionFlag: '--version', notes: 'Optional - Scheduling & monitoring' }
  ];

  const results: ToolStatus[] = tools.map(tool => {
    const installed = commandExists(tool.command);
    return {
      name: tool.name,
      installed,
      version: installed ? getCommandVersion(tool.command, tool.versionFlag) : undefined,
      path: installed ? getCommandPath(tool.command) : undefined,
      notes: tool.notes
    };
  });

  // Check claude-code-hub (Docker-based)
  const hubStatus = checkClaudeCodeHub();
  results.unshift(hubStatus);

  return results;
}

/**
 * Check claude-code-hub status
 */
function checkClaudeCodeHub(): ToolStatus {
  try {
    // Check if Docker is available
    if (!commandExists('docker')) {
      return {
        name: 'claude-code-hub',
        installed: false,
        notes: 'Optional - Requires Docker'
      };
    }

    // Check if claude-code-hub container is running
    const output = execSync('docker ps --filter "name=claude-code-hub" --format "{{.Names}}"', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });

    if (output.trim()) {
      return {
        name: 'claude-code-hub',
        installed: true,
        notes: 'Running in Docker'
      };
    }

    // Check if container exists but not running
    const allOutput = execSync('docker ps -a --filter "name=claude-code-hub" --format "{{.Names}}"', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });

    if (allOutput.trim()) {
      return {
        name: 'claude-code-hub',
        installed: true,
        notes: 'Container exists but not running'
      };
    }

    return {
      name: 'claude-code-hub',
      installed: false,
      notes: 'Optional - API management & routing'
    };
  } catch {
    return {
      name: 'claude-code-hub',
      installed: false,
      notes: 'Optional - API management & routing'
    };
  }
}

/**
 * Check documentation tools (Layer 3)
 */
export function checkDocumentationTools(): ToolStatus[] {
  const tools: ToolStatus[] = [];

  // Check OpenSpec
  const openspecDir = join(process.cwd(), '.product-builder', 'openspec');
  tools.push({
    name: 'OpenSpec',
    installed: existsSync(openspecDir),
    notes: 'Optional - API specifications'
  });

  // Check Mint
  const mintConfig = join(process.cwd(), 'mint.json');
  const mintConfigInPB = join(process.cwd(), '.product-builder', 'mint.json');
  const mintInstalled = existsSync(mintConfig) || existsSync(mintConfigInPB);
  tools.push({
    name: 'Mint',
    installed: mintInstalled,
    notes: 'Optional - Documentation site'
  });

  return tools;
}

/**
 * Check npm packages
 */
export function checkNpmPackages(): ToolStatus[] {
  const packages = [
    { name: 'ccb-multi', notes: 'Optional - Multi-session support' },
    { name: '@waoooo/claude-skills-manager', notes: 'Optional - Skills management' },
    { name: '@waoooo/claude-skills', notes: 'Optional - Skills library' },
    { name: 'claude-code-hub', notes: 'Optional - API routing (npm package)' }
  ];

  return packages.map(pkg => {
    const status = checkNpmPackage(pkg.name);
    return {
      name: status.name,
      installed: status.installed,
      version: status.version,
      path: status.path,
      notes: pkg.notes
    };
  });
}

/**
 * Check all dependencies
 */
export async function checkAllDependencies(): Promise<DependencyStatus> {
  return {
    environment: checkEnvironment(),
    llmCLIs: checkLLMCLIs(),
    architectureTools: checkArchitectureTools(),
    documentationTools: checkDocumentationTools(),
    npmPackages: checkNpmPackages()
  };
}

/**
 * Check if Product Builder is properly configured in current directory
 */
export function checkProductBuilderConfig(): boolean {
  const configDir = join(process.cwd(), '.product-builder');
  return existsSync(configDir);
}

/**
 * Get Product Builder config directory
 */
export function getConfigDir(): string {
  return join(process.cwd(), '.product-builder');
}

/**
 * Check if running in tmux session
 */
export function checkTmuxSession(): { inTmux: boolean; sessionName?: string } {
  const tmuxVar = process.env.TMUX;

  if (!tmuxVar) {
    return { inTmux: false };
  }

  try {
    const sessionName = execSync('tmux display-message -p "#S"', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();

    return {
      inTmux: true,
      sessionName
    };
  } catch {
    return { inTmux: true };
  }
}
