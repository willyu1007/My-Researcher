export const MODULE_IDS = [
  'M1',
  'M2',
  'M3',
  'M4',
  'M5',
  'M6',
  'M7',
  'M8',
] as const;

export type ModuleId = (typeof MODULE_IDS)[number];

export const NODE_STATUS = [
  'draft',
  'candidate',
  'promoted',
  'hold',
  'rejected',
  'superseded',
] as const;

export type NodeStatus = (typeof NODE_STATUS)[number];

export const GATE_DECISIONS = ['promote', 'hold', 'reject', 'loopback'] as const;
export type GateDecision = (typeof GATE_DECISIONS)[number];

export const SPINE_SNAPSHOT_TYPES = ['SP-partial', 'SP-full'] as const;
export type SpineSnapshotType = (typeof SPINE_SNAPSHOT_TYPES)[number];

export const ANALYSIS_CONTRACTS = ['with_m6', 'no_m6'] as const;
export type AnalysisContract = (typeof ANALYSIS_CONTRACTS)[number];

export const CREATED_BY_MODES = ['llm', 'human', 'hybrid'] as const;
export type CreatedByMode = (typeof CREATED_BY_MODES)[number];

export interface LineageMeta {
  paper_id: string;
  stage_id: string;
  module_id: ModuleId;
  version_id: string;
  parent_version_id?: string;
  parent_node_ids?: string[];
  run_id: string;
  lane_id: string;
  attempt_id: string;
  created_by: CreatedByMode;
  created_at: string;
}

export interface ScoreVector {
  [dimension: string]: number;
}

export interface ValueJudgementPayload {
  judgement_id: string;
  decision: GateDecision;
  core_score_vector: ScoreVector;
  extension_score_vector: ScoreVector;
  confidence: number;
  reason_summary: string;
  reviewer: CreatedByMode;
  timestamp: string;
}

export interface SnapshotManifestCompatibilityVector {
  claim_set_hash: string;
  problem_scope_hash: string;
  dataset_protocol_hash: string;
  evaluation_protocol_hash: string;
}

export interface SnapshotManifestPayload {
  snapshot_id: string;
  snapshot_type: SpineSnapshotType;
  spine_type?: AnalysisContract;
  paper_id: string;
  node_refs: string[];
  compatibility_vector: SnapshotManifestCompatibilityVector;
  created_at: string;
  created_by: CreatedByMode;
}

export interface SnapshotPointerPayload {
  paper_id: string;
  paper_active_sp_full?: string;
  paper_active_sp_partial?: string;
  changed_by: CreatedByMode;
  changed_at: string;
  change_reason: string;
}

export const ERROR_CODES = [
  'INVALID_PAYLOAD',
  'NOT_FOUND',
  'VERSION_CONFLICT',
  'SNAPSHOT_COMPATIBILITY_FAILED',
  'GATE_CONSTRAINT_FAILED',
  'NO_M6_POLICY_VIOLATION',
  'SNAPSHOT_LOCKED',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ErrorResponse {
  status_code: 400 | 404 | 409 | 422 | 423;
  error_code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}
