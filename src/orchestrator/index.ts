/**
 * Workflow Orchestrator Module
 *
 * Orchestrates the execution of workflow phases and steps
 */

import chalk from 'chalk';
import type { ProjectConfig, PhaseConfig, SubPhaseConfig, StepConfig } from '../config';

export interface WorkflowState {
  currentPhase?: string;
  currentSubPhase?: string;
  currentStep?: string;
  progress: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
}

export interface ExecutionContext {
  config: ProjectConfig;
  state: WorkflowState;
  input?: any;
  output?: any;
}

/**
 * Initialize workflow state
 */
export function initWorkflowState(): WorkflowState {
  return {
    progress: 0,
    status: 'idle'
  };
}

/**
 * Execute a workflow step
 */
async function executeStep(
  step: StepConfig,
  context: ExecutionContext
): Promise<void> {
  console.log(chalk.blue(`  ├─ ${step.name}`));

  // TODO: Implement actual step execution
  // This would involve:
  // 1. Calling appropriate agent/model
  // 2. Handling retries with requirement locking
  // 3. Multi-model review if needed
  // 4. Updating workflow state

  // Simulate execution
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log(chalk.green(`  │  ✓ ${step.name} completed`));
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
  input?: any
): Promise<WorkflowState> {
  const state = initWorkflowState();
  const context: ExecutionContext = {
    config,
    state,
    input
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
  } catch (error) {
    state.status = 'failed';
    state.endTime = new Date();

    console.log(chalk.red.bold(`\n❌ Workflow failed: ${error}\n`));
    throw error;
  }

  return state;
}

/**
 * Get workflow status
 */
export function getWorkflowStatus(state: WorkflowState): void {
  console.log(chalk.cyan.bold('\n📊 Workflow Status\n'));

  console.log(`  Status:        ${getStatusDisplay(state.status)}`);
  console.log(`  Progress:      ${state.progress}%`);

  if (state.currentPhase) {
    console.log(`  Current Phase: ${state.currentPhase}`);
  }

  if (state.currentSubPhase) {
    console.log(`  Current Sub:   ${state.currentSubPhase}`);
  }

  if (state.currentStep) {
    console.log(`  Current Step:  ${state.currentStep}`);
  }

  if (state.startTime) {
    console.log(`  Started:       ${state.startTime.toLocaleString()}`);
  }

  if (state.endTime) {
    console.log(`  Ended:         ${state.endTime.toLocaleString()}`);

    if (state.startTime) {
      const duration = state.endTime.getTime() - state.startTime.getTime();
      const seconds = Math.floor(duration / 1000);
      const minutes = Math.floor(seconds / 60);
      console.log(`  Duration:      ${minutes}m ${seconds % 60}s`);
    }
  }

  console.log();
}

/**
 * Get status display string
 */
function getStatusDisplay(status: WorkflowState['status']): string {
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
 * Pause workflow
 */
export function pauseWorkflow(state: WorkflowState): void {
  if (state.status === 'running') {
    state.status = 'paused';
    console.log(chalk.yellow('\n⏸️  Workflow paused\n'));
  }
}

/**
 * Resume workflow
 */
export function resumeWorkflow(state: WorkflowState): void {
  if (state.status === 'paused') {
    state.status = 'running';
    console.log(chalk.blue('\n▶️  Workflow resumed\n'));
  }
}

/**
 * Cancel workflow
 */
export function cancelWorkflow(state: WorkflowState): void {
  if (state.status === 'running' || state.status === 'paused') {
    state.status = 'failed';
    state.endTime = new Date();
    console.log(chalk.red('\n❌ Workflow cancelled\n'));
  }
}
