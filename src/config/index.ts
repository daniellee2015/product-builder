/**
 * Configuration Management Module
 *
 * Handles loading, saving, and validating configuration files
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

export interface ProjectConfig {
  projectName: string;
  projectRoot: string;
  outputDir: string;
  workflowConfig: WorkflowConfig;
  paths: PathsConfig;
}

export interface WorkflowConfig {
  phases: PhaseConfig[];
  enableAutoRetry: boolean;
  maxRetries: number;
  requirementLocking: boolean;
}

export interface PhaseConfig {
  id: string;
  name: string;
  subPhases: SubPhaseConfig[];
}

export interface SubPhaseConfig {
  id: string;
  name: string;
  steps: StepConfig[];
}

export interface StepConfig {
  id: string;
  name: string;
  type: 'manual' | 'auto' | 'review';
  agent?: string;
  model?: string;
}

export interface PathsConfig {
  specs: string;
  capabilities: string;
  exports: string;
  docs: string;
  config: string;
}

const DEFAULT_CONFIG: ProjectConfig = {
  projectName: 'my-product',
  projectRoot: process.cwd(),
  outputDir: './exports',
  workflowConfig: {
    phases: [],
    enableAutoRetry: true,
    maxRetries: 3,
    requirementLocking: true
  },
  paths: {
    specs: './specs',
    capabilities: './capabilities',
    exports: './exports',
    docs: './docs',
    config: './.product-builder'
  }
};

/**
 * Load configuration from file
 */
export async function loadConfig(configPath?: string): Promise<ProjectConfig> {
  const configFile = configPath || path.join(process.cwd(), '.product-builder', 'config.json');

  try {
    const content = await fs.readFile(configFile, 'utf-8');
    const config = JSON.parse(content);
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    console.log(chalk.yellow('⚠️  No configuration file found, using defaults'));
    return DEFAULT_CONFIG;
  }
}

/**
 * Save configuration to file
 */
export async function saveConfig(config: ProjectConfig, configPath?: string): Promise<void> {
  const configFile = configPath || path.join(process.cwd(), '.product-builder', 'config.json');
  const configDir = path.dirname(configFile);

  // Ensure config directory exists
  await fs.mkdir(configDir, { recursive: true });

  // Write config file
  await fs.writeFile(configFile, JSON.stringify(config, null, 2), 'utf-8');

  console.log(chalk.green(`✅ Configuration saved to ${configFile}`));
}

/**
 * Validate configuration
 */
export function validateConfig(config: ProjectConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate project name
  if (!config.projectName || config.projectName.trim().length === 0) {
    errors.push('Project name is required');
  }

  // Validate project root
  if (!config.projectRoot || config.projectRoot.trim().length === 0) {
    errors.push('Project root is required');
  }

  // Validate output directory
  if (!config.outputDir || config.outputDir.trim().length === 0) {
    errors.push('Output directory is required');
  }

  // Validate workflow config
  if (!config.workflowConfig) {
    errors.push('Workflow configuration is required');
  } else {
    if (config.workflowConfig.maxRetries < 0) {
      errors.push('Max retries must be >= 0');
    }
  }

  // Validate paths
  if (!config.paths) {
    errors.push('Paths configuration is required');
  } else {
    const requiredPaths = ['specs', 'capabilities', 'exports', 'docs', 'config'];
    for (const pathKey of requiredPaths) {
      if (!config.paths[pathKey as keyof PathsConfig]) {
        errors.push(`Path '${pathKey}' is required`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Print configuration
 */
export function printConfig(config: ProjectConfig): void {
  console.log(chalk.cyan.bold('\n⚙️  Current Configuration\n'));

  console.log(chalk.bold('Project:'));
  console.log(`  Name:        ${config.projectName}`);
  console.log(`  Root:        ${config.projectRoot}`);
  console.log(`  Output Dir:  ${config.outputDir}`);

  console.log(chalk.bold('\nWorkflow:'));
  console.log(`  Auto Retry:  ${config.workflowConfig.enableAutoRetry ? 'Enabled' : 'Disabled'}`);
  console.log(`  Max Retries: ${config.workflowConfig.maxRetries}`);
  console.log(`  Req Locking: ${config.workflowConfig.requirementLocking ? 'Enabled' : 'Disabled'}`);
  console.log(`  Phases:      ${config.workflowConfig.phases.length}`);

  console.log(chalk.bold('\nPaths:'));
  console.log(`  Specs:       ${config.paths.specs}`);
  console.log(`  Capabilities:${config.paths.capabilities}`);
  console.log(`  Exports:     ${config.paths.exports}`);
  console.log(`  Docs:        ${config.paths.docs}`);
  console.log(`  Config:      ${config.paths.config}`);

  console.log();
}

/**
 * Initialize default configuration
 */
export async function initConfig(projectName?: string): Promise<ProjectConfig> {
  const config: ProjectConfig = {
    ...DEFAULT_CONFIG,
    projectName: projectName || 'my-product',
    projectRoot: process.cwd()
  };

  await saveConfig(config);
  return config;
}
