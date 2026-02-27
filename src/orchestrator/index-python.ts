/**
 * Workflow Orchestrator Module (Python Engine Integration)
 *
 * Orchestrates the execution of workflow phases and steps using Python Workflow Engine
 */

import chalk from 'chalk';
import type { ProjectConfig, PhaseConfig, SubPhaseConfig, StepConfig } from '../config';
import { createWorkflowEngine, WorkflowEngine, JobResult } from '../libs/workflow-engine';

export interface WorkflowState {
  jobId?: string;
  currentPhase?: string;
  currentSubPhase?: string;
  currentStep?: string;
  progress: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  usePythonEngine?: boolean;
}

export interface ExecutionContext {
  config: ProjectConfig;
  state: WorkflowState;
  input?: any;
  output?: any;
  engine?: WorkflowEngine;
}

/**
 * Initialize workflow state
 */
export function initWorkflowState(usePythonEngine: boolean = true): WorkflowState {
  return {
    progress: 0,
    status: 'idle',
    usePythonEngine
  };
}

/**
 * Execute a workflow step using Python engine
 */
async function executeStepWithPython(
  step: StepConfig,
  context: ExecutionContext
): Promise<void> {
  console.log(chalk.blue(`  ├─ ${step.name}`));

  if (!context.engine) {
    throw new Error('Python workflow engine not initialized');
  }

  try {
    // Execute step via Python CLI
    const result: JobResult = await context.engine.runWorkflow(
      'src/config/workflow.json',
      {
        stepId: step.id,
        context: {
          phase: context.state.currentPhase,
          subPhase: context.state.currentSubPhase,
          input: context.input
        }
      }
    );

    if (!result.success) {
      throw new Error(result.error || 'Step execution failed');
    }

    // Update job ID if returned
    if (result.data?.job_id) {
      context.state.jobId = result.data.job_id;
    }

    // Update output
    context.output = result.data;

    console.log(chalk.green(`  │  ✓ ${step.name} completed`));
  } catch (error: any) {
    console.log(chalk.red(`  │  ✗ ${step.name} failed: ${error.message}`));
    throw error;
  }
}

/**
 * Execute a workflow step (legacy simulation mode)
 */
async function executeStepLegacy(
  step: StepConfig,
  context: ExecutionContext
): Promise<void> {
  console.log(chalk.blue(`  ├─ ${step.name}`));

  // Simulate execution
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log(chalk.green(`  │  ✓ ${step.name} completed`));
}

/**
 * Execute a workflow step
 */
async function executeStep(
  step: StepConfig,
  context: ExecutionContext
): Promise<void> {
  if (context.state.usePythonEngine && context.engine) {
    await executeStepWithPython(step, context);
  } else {
    await executeStepLegacy(step, context);
  }
}

/**
 * Execute a sub-phase
 */
async function executeSubPhase(
  subPhase: SubPhaseConfig,
  context: ExecutionContext
): Promise<void> {
  console.log(chalk.cyan(`\n├─ ${subPhase.name}`));

  context.state.currentSubPhase = subPhase.id;

  for (const step of subPhase.steps) {
    context.state.currentStep = step.id;
    await executeStep(step, context);
  }
}

/**
 * Execute a phase
 */
async function executePhase(
  phase: PhaseConfig,
  context: ExecutionContext
): Promise<void> {
  console.log(chalk.cyan.bold(`\n┌─ Phase: ${phase.name}`));

  context.state.currentPhase = phase.id;

  for (const subPhase of phase.subPhases) {
    await executeSubPhase(subPhase, context);
  }

  console.log(chalk.cyan.bold(`└─ Phase ${phase.name} completed\n`));
}

/**
 * Execute workflow
 */
export async function executeWorkflow(
  config: ProjectConfig,
  input?: any,
  options: { usePythonEngine?: boolean } = {}
): Promise<WorkflowState> {
  const usePythonEngine = options.usePythonEngine !== false;
  const state = initWorkflowState(usePythonEngine);

  // Initialize Python engine if enabled
  let engine: WorkflowEngine | undefined;
  if (usePythonEngine) {
    engine = createWorkflowEngine();
    const available = await engine.isAvailable();

    if (!available) {
      console.log(chalk.yellow('⚠️  Python workflow engine not available, falling back to legacy mode\n'));
      state.usePythonEngine = false;
    } else {
      console.log(chalk.green('✓ Python workflow engine initialized\n'));
    }
  }

  const context: ExecutionContext = {
    config,
    state,
    input,
    engine
  };

  console.log(chalk.cyan.bold('\n🚀 Starting Workflow Execution\n'));

  state.status = 'running';
  state.startTime = new Date();

  try {
    const phases = config.workflowConfig.phases;

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      await executePhase(phase, context);

      // Update progress
      state.progress = Math.round(((i + 1) / phases.length) * 100);
    }

    state.status = 'completed';
    state.endTime = new Date();

    console.log(chalk.green.bold('\n✅ Workflow completed successfully!\n'));

    if (state.jobId) {
      console.log(chalk.cyan(`Job ID: ${state.jobId}\n`));
    }
  } catch (error) {
    state.status = 'failed';
    state.endTime = new Date();

    console.log(chalk.red.bold(`\n❌ Workflow failed: ${error}\n`));
    throw error;
  }

  return state;
}

/**
 * Resume workflow using Python engine
 */
export async function resumeWorkflow(jobId: string): Promise<WorkflowState> {
  const engine = createWorkflowEngine();
  const available = await engine.isAvailable();

  if (!available) {
    throw new Error('Python workflow engine not available');
  }

  console.log(chalk.cyan.bold(`\n▶️  Resuming Workflow: ${jobId}\n`));

  const result = await engine.resumeWorkflow(jobId);

  if (!result.success) {
    throw new Error(result.error || 'Failed to resume workflow');
  }

  const state: WorkflowState = {
    jobId,
    status: result.data?.status === 'completed' ? 'completed' : 'running',
    progress: result.data?.progress || 0,
    currentStep: result.data?.current_step,
    usePythonEngine: true
  };

  console.log(chalk.green.bold('\n✅ Workflow resumed successfully!\n'));

  return state;
}

/**
 * Get workflow status
 */
export async function getWorkflowStatus(jobId?: string): Promise<void> {
  const engine = createWorkflowEngine();
  const available = await engine.isAvailable();

  if (!available) {
    console.log(chalk.yellow('⚠️  Python workflow engine not available\n'));
    return;
  }

  console.log(chalk.cyan.bold('\n📊 Workflow Status\n'));

  const result = await engine.getStatus(jobId);

  if (!result.success) {
    console.log(chalk.red(`Error: ${result.error}\n`));
    return;
  }

  if (result.data) {
    console.log(`  Job ID:        ${result.data.job_id || 'N/A'}`);
    console.log(`  Status:        ${getStatusDisplay(result.data.status || 'unknown')}`);
    console.log(`  Progress:      ${result.data.progress || 0}%`);

    if (result.data.current_step) {
      console.log(`  Current Step:  ${result.data.current_step}`);
    }

    if (result.data.message) {
      console.log(`  Message:       ${result.data.message}`);
    }
  }

  console.log();
}

/**
 * Cancel workflow
 */
export async function cancelWorkflow(jobId: string): Promise<void> {
  const engine = createWorkflowEngine();
  const available = await engine.isAvailable();

  if (!available) {
    throw new Error('Python workflow engine not available');
  }

  console.log(chalk.yellow(`\n⏹️  Cancelling Workflow: ${jobId}\n`));

  const result = await engine.cancelWorkflow(jobId);

  if (!result.success) {
    throw new Error(result.error || 'Failed to cancel workflow');
  }

  console.log(chalk.green('✅ Workflow cancelled successfully!\n'));
}

/**
 * Get status display string
 */
function getStatusDisplay(status: string): string {
  switch (status) {
    case 'idle':
      return chalk.gray('Idle');
    case 'running':
      return chalk.blue('Running');
    case 'paused':
      return chalk.yellow('Paused');
    case 'completed':
      return chalk.green('Completed');
    case 'failed':
      return chalk.red('Failed');
    default:
      return chalk.gray('Unknown');
  }
}

/**
 * Pause workflow (legacy)
 */
export function pauseWorkflow(state: WorkflowState): void {
  if (state.status === 'running') {
    state.status = 'paused';
    console.log(chalk.yellow('\n⏸️  Workflow paused\n'));
  }
}
