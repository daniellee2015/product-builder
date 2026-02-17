/**
 * Workflow data service
 * Handles loading, saving, and querying workflow configuration
 */

import fs from 'fs';
import path from 'path';
import { WorkflowData, WorkflowStep, WorkflowMode } from '../types/workflow';

const MODE_ORDER: WorkflowMode[] = ['lite', 'standard', 'full'];

function getWorkflowPath(): string {
  return path.join(__dirname, '../config/workflow.json');
}

export function loadWorkflow(): WorkflowData | null {
  try {
    return JSON.parse(fs.readFileSync(getWorkflowPath(), 'utf-8'));
  } catch {
    return null;
  }
}

export function saveWorkflow(data: WorkflowData): void {
  fs.writeFileSync(getWorkflowPath(), JSON.stringify(data, null, 2), 'utf-8');
}

export function isStepActive(step: WorkflowStep, currentMode: WorkflowMode): boolean {
  const modeLevel = MODE_ORDER.indexOf(currentMode);
  const stepLevel = MODE_ORDER.indexOf(step.min_mode);
  return stepLevel <= modeLevel;
}

export function countActiveSteps(data: WorkflowData): number {
  return data.phases.reduce((sum, p) =>
    sum + p.steps.filter(s => isStepActive(s, data.mode)).length, 0);
}

export function countReviewGates(data: WorkflowData): number {
  return data.phases.reduce((sum, p) =>
    sum + p.steps.filter(s => s.review_config && isStepActive(s, data.mode)).length, 0);
}

export function countTotalSteps(data: WorkflowData): number {
  return data.phases.reduce((sum, p) => sum + p.steps.length, 0);
}

export { MODE_ORDER };
