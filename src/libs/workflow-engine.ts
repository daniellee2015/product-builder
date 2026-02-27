/**
 * Workflow Engine Integration
 *
 * TypeScript wrapper for Python Workflow Engine
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export interface WorkflowEngineConfig {
  pythonPath?: string;
  cliPath?: string;
  databasePath?: string;
}

export interface JobResult {
  success: boolean;
  data?: {
    job_id?: string;
    status?: string;
    current_step?: string;
    progress?: number;
    message?: string;
    [key: string]: any;
  };
  error?: string;
}

export class WorkflowEngine {
  private pythonPath: string;
  private cliPath: string;
  private databasePath: string;

  constructor(config: WorkflowEngineConfig = {}) {
    this.pythonPath = config.pythonPath || 'python3';
    this.cliPath = config.cliPath || path.join(__dirname, '../../scripts/python/product_builder_cli.py');
    this.databasePath = config.databasePath || '.product-builder/workflow.db';
  }

  /**
   * Check if Python workflow engine is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if Python is available
      await execAsync(`${this.pythonPath} --version`);

      // Check if CLI script exists
      if (!fs.existsSync(this.cliPath)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Start a new workflow
   */
  async runWorkflow(
    workflowFile: string,
    options: {
      stepId?: string;
      context?: any;
    } = {}
  ): Promise<JobResult> {
    const args = [
      'run',
      '--workflow-file', workflowFile,
      '--json'
    ];

    if (options.stepId) {
      args.push('--step-id', options.stepId);
    }

    if (options.context) {
      args.push('--context', JSON.stringify(options.context));
    }

    return this.executeCommand(args);
  }

  /**
   * Resume a workflow
   */
  async resumeWorkflow(jobId: string): Promise<JobResult> {
    return this.executeCommand(['resume', jobId, '--json']);
  }

  /**
   * Get workflow status
   */
  async getStatus(jobId?: string): Promise<JobResult> {
    const args = ['status', '--json'];
    if (jobId) {
      args.push('--job-id', jobId);
    }
    return this.executeCommand(args);
  }

  /**
   * Cancel a workflow
   */
  async cancelWorkflow(jobId: string): Promise<JobResult> {
    return this.executeCommand(['cancel', jobId, '--json']);
  }

  /**
   * Get workflow logs
   */
  async getLogs(jobId: string, options: { tail?: number } = {}): Promise<JobResult> {
    const args = ['logs', jobId, '--json'];
    if (options.tail) {
      args.push('--tail', options.tail.toString());
    }
    return this.executeCommand(args);
  }

  /**
   * Execute a Python CLI command
   */
  private async executeCommand(args: string[]): Promise<JobResult> {
    try {
      const command = `${this.pythonPath} ${this.cliPath} ${args.join(' ')}`;
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      // Parse JSON output
      try {
        const result = JSON.parse(stdout);
        return result;
      } catch (parseError) {
        // If JSON parsing fails, return raw output
        return {
          success: false,
          error: `Failed to parse JSON output: ${stdout}`,
          data: { raw_output: stdout, raw_error: stderr }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
        data: {
          stderr: error.stderr,
          stdout: error.stdout
        }
      };
    }
  }

  /**
   * Initialize workflow database
   */
  async initDatabase(): Promise<boolean> {
    try {
      const initScript = path.join(path.dirname(this.cliPath), 'init_database.py');
      if (!fs.existsSync(initScript)) {
        return false;
      }

      await execAsync(`${this.pythonPath} ${initScript}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get database path
   */
  getDatabasePath(): string {
    return this.databasePath;
  }
}

/**
 * Create a workflow engine instance
 */
export function createWorkflowEngine(config?: WorkflowEngineConfig): WorkflowEngine {
  return new WorkflowEngine(config);
}
