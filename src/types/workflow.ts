/**
 * Workflow type definitions
 */

export type WorkflowMode = 'lite' | 'standard' | 'full' | 'custom';

export interface WorkflowStep {
  id: string;
  display_id?: string;
  name: string;
  description: string;
  min_mode: WorkflowMode;
  input: string[];
  output: string[];
  output_format?: string;
  condition?: string;
  enabled_in_modes?: WorkflowMode[];
  required_tools?: string[];
  optional_tools?: string[];
  requires_human_approval?: boolean;
  approval?: {
    type: string;
    approvers?: string[];
    timeout?: number;
  };
  review_config?: {
    models: string[];
    pass_threshold: number;
    max_critical: number;
    max_medium: number;
    auto_repair?: {
      enabled: boolean;
      max_attempts: number;
      ask_user_on_exhausted: boolean;
      user_options?: string[];
    };
  };
}

export interface StepGroup {
  id: string;
  name: string;
  description: string;
  step_ids: string[];
}

export interface WorkflowPhase {
  id: string;
  name: string;
  description: string;
  execution: {
    mode: string;
    entry_step?: string;
    exit_condition?: string;
  };
  steps: WorkflowStep[];
  groups?: StepGroup[];
}

export interface ModeConfig {
  label: string;
  description: string;
  steps: number;
  review_gates: number;
  features?: {
    openspec_enabled: boolean;
    multi_model_review: boolean;
    auto_loop: boolean;
    directory_scaffolding: string;
  };
  orchestrator?: string;
  execution_mode?: string;
  loop_policy?: string;
  step_trigger_policy?: string;
  requires_user_iteration?: boolean;
  required_tools: string[];
  tool_profile?: string;
  scaffold_profile?: string;
  enabled_steps?: string[];
  pipeline?: string[];
  overrides?: Record<string, any>;
  is_custom?: boolean;
  base_mode?: WorkflowMode;
}

export interface CustomWorkflowConfig {
  name: string;
  description?: string;
  base_mode: WorkflowMode;
  enabled_steps: string[];
  created_at: string;
  modified_at: string;
}

export interface WorkflowTransition {
  from: string;
  to: string;
  condition?: string;
  enabled_in_modes?: string[];
}

export interface ReviewPolicyDefaults {
  models: string[];
  pass_threshold: number;
  max_critical: number;
  max_medium: number;
  auto_repair: {
    enabled: boolean;
    max_attempts: number;
    ask_user_on_exhausted: boolean;
    user_options: string[];
  };
}

export interface WorkflowData {
  $schema: string;
  schema_version: string;
  version: string;
  workflow_id: string;
  name: string;
  description: string;
  mode: WorkflowMode;
  available_modes: Record<string, ModeConfig>;
  phase_registry: Record<string, {
    steps: WorkflowStep[];
    groups?: any[];
  }>;
  phases: WorkflowPhase[];
  transitions: WorkflowTransition[];
}
