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
  condition?: string;
  required_tools?: string[];
  optional_tools?: string[];
  requires_human_approval?: boolean;
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
  required_tools: string[];
  enabled_steps?: string[];
  description: string;
  steps: number;
  review_gates: number;
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
  version: string;
  workflow_id: string;
  name: string;
  description: string;
  mode: WorkflowMode;
  available_modes: Record<string, ModeConfig>;
  metadata: {
    owner: string;
    created_at: string;
    job_id_format: string;
    job_root: string;
    supported_input_modes: string[];
  };
  job_structure: {
    required_dirs: string[];
    required_files: string[];
  };
  review_policy_defaults: ReviewPolicyDefaults;
  cli_view: {
    default_group_by: string;
    show_step_fields: string[];
    show_transitions: boolean;
  };
  phase_registry: Record<string, {
    steps: WorkflowStep[];
    groups?: any[];
  }>;
  phases: WorkflowPhase[];
  transitions: WorkflowTransition[];
}
