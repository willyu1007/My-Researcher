import type {
  AbstractState,
  ClaimStrength,
  ClaimStatus,
  DecisionAction,
  DimensionState,
  ObjectPointer,
  ReadinessDecisionKind,
  ReportPointer,
  ResearchArgumentActor,
  ResearchArgumentWorkspaceStatus,
  SourceTraceRef,
} from './research-argument-domain-contracts.js';

export const ACTION_QUEUE_ITEM_SOURCES = [
  'manual',
  'readiness',
  'planner',
] as const;
export type ActionQueueItemSource =
  (typeof ACTION_QUEUE_ITEM_SOURCES)[number];

export const ACTION_QUEUE_ITEM_STATUSES = [
  'suggested',
  'ready',
  'blocked',
  'queued',
  'running',
  'completed',
  'dismissed',
] as const;
export type ActionQueueItemStatus =
  (typeof ACTION_QUEUE_ITEM_STATUSES)[number];

export interface WorkspaceSummary {
  workspace_id: string;
  title_card_id: string;
  workspace_status: ResearchArgumentWorkspaceStatus;
  active_branch_id?: string;
  current_stage: AbstractState['stage'];
  current_readiness_decision?: ReadinessDecisionKind;
  critical_blocker_count: number;
  open_issue_count: number;
  claim_count: number;
  evidence_requirement_count: number;
  evidence_item_count: number;
  report_pointers: ReportPointer[];
  updated_at: string;
}

export interface AbstractStateSnapshot extends AbstractState {
  snapshot_id: string;
  updated_at: string;
}

export interface ClaimEvidenceCoverageRow {
  claim_id: string;
  claim_text: string;
  claim_status: ClaimStatus;
  claim_strength: ClaimStrength;
  required_evidence_types: string[];
  satisfied_requirement_count: number;
  missing_requirement_count: number;
  support_state?: string;
  evidence_pointers: ObjectPointer[];
  source_trace_refs: SourceTraceRef[];
}

export interface ProtocolBaselineReproReadiness {
  workspace_id: string;
  branch_id: string;
  evaluation_soundness: DimensionState;
  reproducibility_readiness: DimensionState;
  baseline_set_ids: string[];
  protocol_ids: string[];
  repro_item_ids: string[];
  run_ids: string[];
  artifact_ids: string[];
  blockers: string[];
  missing_items: string[];
  updated_at: string;
}

export interface DecisionTimelineEntry {
  decision_id: string;
  workspace_id: string;
  branch_id: string;
  action: DecisionAction;
  summary: string;
  actor: ResearchArgumentActor;
  human_confirmed: boolean;
  audit_ref?: string;
  linked_object_pointers: ObjectPointer[];
  created_at: string;
}

export interface ActionQueueItemCostEstimate {
  wall_clock_hours?: number;
  compute_units?: number;
  human_attention_hours?: number;
}

export interface ActionQueueItemRiskEstimate {
  invalidity?: number;
  failure?: number;
  branch_destabilization?: number;
}

export interface ActionQueueItem {
  action_queue_item_id: string;
  workspace_id: string;
  branch_id: string;
  source_kind: ActionQueueItemSource;
  status: ActionQueueItemStatus;
  title: string;
  summary: string;
  impact_summary: string;
  requires_confirmation: boolean;
  confirmation_note_required: boolean;
  source_trace_refs: SourceTraceRef[];
  object_pointers: ObjectPointer[];
  planner_candidate_id?: string;
  expected_value?: number;
  expected_information_gain?: number;
  estimated_cost?: ActionQueueItemCostEstimate;
  estimated_risk?: ActionQueueItemRiskEstimate;
  created_at: string;
  updated_at: string;
}
