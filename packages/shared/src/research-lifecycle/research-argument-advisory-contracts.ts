import type {
  DimensionName,
  IssueFindingSeverity,
  ObjectPointer,
  SourceTraceRef,
} from './research-argument-domain-contracts.js';

export const PLANNER_ACTION_FAMILIES = [
  'problem_theory_claim_design',
  'evaluation_protocol_design',
  'method_implementation_execution',
  'evidence_analysis_boundary_update',
  'search_control_governance',
] as const;
export type PlannerActionFamily =
  (typeof PLANNER_ACTION_FAMILIES)[number];

export const PLANNER_PRECONDITION_TYPES = [
  'object_exists',
  'state_threshold',
  'no_critical_blocker',
  'human_approval',
] as const;
export type PlannerPreconditionType =
  (typeof PLANNER_PRECONDITION_TYPES)[number];

export const PLANNER_EFFECT_TYPES = [
  'score_up',
  'confidence_up',
  'blocker_release',
  'reopen',
  'uncertainty_reduce',
] as const;
export type PlannerEffectType = (typeof PLANNER_EFFECT_TYPES)[number];

export const CRITIC_FINDING_SEVERITIES = [
  'low',
  'medium',
  'high',
  'critical',
] as const;
export type CriticFindingSeverity =
  (typeof CRITIC_FINDING_SEVERITIES)[number];

export const SUBMISSION_RISK_FINDING_GROUPS = [
  'value_novelty',
  'feasibility',
  'claim_evidence',
  'evaluation_fairness',
  'boundary_risk',
  'reproducibility',
] as const;
export type SubmissionRiskFindingGroup =
  (typeof SUBMISSION_RISK_FINDING_GROUPS)[number];

export const ASYNC_TASK_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
  'retrying',
] as const;
export type AsyncTaskStatus = (typeof ASYNC_TASK_STATUSES)[number];

export interface PlannerActionPrecondition {
  precondition_type: PlannerPreconditionType;
  ref?: string;
  rule?: string;
}

export interface PlannerExpectedEffect {
  target_dimensions: DimensionName[];
  effect_type: PlannerEffectType;
  magnitude_hint?: number;
  note?: string;
}

export interface PlannerAction {
  planner_action_id: string;
  family: PlannerActionFamily;
  operator: string;
  title: string;
  description: string;
  input_object_ids: string[];
  preconditions: PlannerActionPrecondition[];
  expected_effects: PlannerExpectedEffect[];
  estimated_cost: {
    wall_clock_hours: number;
    compute_units: number;
    human_attention_hours: number;
  };
  estimated_risk: {
    invalidity: number;
    failure: number;
    branch_destabilization: number;
  };
  parallelizable: boolean;
  requires_human_approval: boolean;
  output_types: string[];
}

export interface PlannerCandidate {
  planner_candidate_id: string;
  workspace_id: string;
  branch_id: string;
  action: PlannerAction;
  expected_impact_summary: string;
  expected_value: number;
  expected_information_gain: number;
  expected_blocker_release: number;
  required_inputs: string[];
  source_trace_refs: SourceTraceRef[];
  object_pointers: ObjectPointer[];
}

export interface PlannerBundle {
  planner_bundle_id: string;
  workspace_id: string;
  branch_id: string;
  ranked_candidates: PlannerCandidate[];
  bundle_rationale: string;
  preconditions: string[];
  stop_conditions: string[];
  estimated_critical_path: number;
  estimated_peak_resource: number;
  risk_score: number;
  created_at: string;
}

export interface CriticFinding {
  critic_name: string;
  severity: CriticFindingSeverity;
  detail: string;
  support_refs: SourceTraceRef[];
  pointers: ObjectPointer[];
  non_authoritative: true;
}

export interface RuleFinding {
  rule_id: string;
  severity: IssueFindingSeverity;
  detail: string;
  pointers: ObjectPointer[];
  dimension_names?: DimensionName[];
}

export interface SubmissionRiskFinding {
  finding_id: string;
  finding_group: SubmissionRiskFindingGroup;
  severity: IssueFindingSeverity;
  detail: string;
  pointers: ObjectPointer[];
  affected_dimensions?: DimensionName[];
  suggested_fix?: string;
}

export interface AsyncTaskRecord {
  async_task_id: string;
  task_type: string;
  status: AsyncTaskStatus;
  idempotency_key: string;
  attempt_count: number;
  retry_policy: {
    max_attempts: number;
    backoff_strategy: string;
  };
  cost_refs?: string[];
  telemetry_refs?: string[];
  created_at: string;
  updated_at: string;
}
