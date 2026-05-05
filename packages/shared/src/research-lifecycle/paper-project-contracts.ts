import {
  ANALYSIS_CONTRACTS,
  CREATED_BY_MODES,
  GATE_DECISIONS,
  type AnalysisContract,
  type CreatedByMode,
  type GateDecision,
  type ModuleId,
  type NodeStatus,
  type SpineSnapshotType,
  type ValueJudgementPayload,
} from './research-lifecycle-core-contracts.js';

export interface CreatePaperProjectRequest {
  title_card_id: string;
  title: string;
  research_direction?: string;
  created_by: Exclude<CreatedByMode, 'llm'>;
  initial_context: {
    literature_evidence_ids: string[];
  };
}

export interface CreatePaperProjectResponse {
  paper_id: string;
  status: 'active';
  paper_active_sp_full: string | null;
  paper_active_sp_partial: string | null;
  created_at: string;
}

export interface VersionSpineCommitRequest {
  lineage_meta: import('./research-lifecycle-core-contracts.js').LineageMeta;
  payload_ref: string;
  node_status: 'candidate' | 'draft';
  value_judgement_payload?: ValueJudgementPayload;
}

export interface VersionSpineCommitResponse {
  node_id: string;
  accepted: boolean;
  node_status: NodeStatus;
}

export interface StageGateVerifyRequest {
  candidate_node_ids: string[];
  config_version: string;
  reviewer_mode: CreatedByMode;
  analysis_contract: AnalysisContract;
  override_context?: {
    skip_m6_reason?: string;
    training_claim_allowed?: boolean;
  };
}

export interface StageGateVerifyResult {
  node_id: string;
  decision: GateDecision;
  reason_summary: string;
}

export interface StageGateVerifyResponse {
  gate_run_id: string;
  results: StageGateVerifyResult[];
  snapshot?: {
    snapshot_id: string;
    snapshot_type: SpineSnapshotType;
    spine_type?: AnalysisContract;
  };
  pointer_update?: {
    paper_active_sp_full?: string;
    paper_active_sp_partial?: string;
  };
}

export interface WritingPackageBuildRequest {
  source_snapshot_id: string;
  writing_mode: 'submission' | 'revision' | 'draft';
  target_release_tag: string;
  sections: string[];
}

export interface WritingPackageBuildResponse {
  writing_package_id: string;
  source_snapshot_id: string;
  release_tag: string;
  section_node_ids: string[];
  compliance_flags: {
    claim_evidence_coverage_ok: boolean;
    no_m6_wording_ok: boolean;
  };
}

export type TimelineSeverity = 'info' | 'warning' | 'error';

export interface PaperTimelineEvent {
  event_id: string;
  event_type: string;
  module_id?: ModuleId;
  timestamp: string;
  node_id?: string;
  summary: string;
  severity?: TimelineSeverity;
}

export interface GetPaperTimelineResponse {
  paper_id: string;
  events: PaperTimelineEvent[];
}

export interface ArtifactBundle {
  proposal_url: string | null;
  paper_url: string | null;
  repo_url: string | null;
  review_url: string | null;
}

export interface GetPaperArtifactBundleResponse {
  paper_id: string;
  artifact_bundle: ArtifactBundle;
}

export interface PaperRuntimeMetric {
  tokens: number | null;
  cost_usd: number | null;
  gpu_requested: number | null;
  gpu_total: number | null;
  updated_at: string;
}

export interface GetPaperResourceMetricsResponse {
  paper_id: string;
  paper_runtime_metric: PaperRuntimeMetric;
}

export const RELEASE_REVIEW_DECISIONS = ['approve', 'reject', 'hold'] as const;
export type ReleaseReviewDecision = (typeof RELEASE_REVIEW_DECISIONS)[number];

export interface ReleaseReviewPayload {
  reviewers: string[];
  decision: ReleaseReviewDecision;
  risk_flags: string[];
  label_policy: string;
  comment?: string;
}

export interface ReleaseGateReviewResponse {
  gate_result: {
    accepted: boolean;
    review_id: string;
    approved_by?: string;
    approved_at?: string;
    audit_ref: string;
  };
}

export interface LlmWorkflowPlanGeneratedEvent {
  event_id: string;
  paper_id: string;
  run_id: string;
  lane_id: string;
  attempt_id: string;
  planner_profile: string;
  created_at: string;
}

export interface StageGateCheckRequestedEvent {
  event_id: string;
  paper_id: string;
  gate_id: string;
  candidate_node_ids: string[];
  analysis_contract: AnalysisContract;
  requested_by: CreatedByMode;
  requested_at: string;
}

export interface StageGateCheckResultEvent {
  event_id: string;
  paper_id: string;
  gate_run_id: string;
  result_summary: string;
  snapshot_id?: string;
  emitted_at: string;
}

export interface VersionSpineCommittedEvent {
  event_id: string;
  paper_id: string;
  node_id: string;
  module_id: ModuleId;
  version_id: string;
  lane_id: string;
  attempt_id: string;
  committed_at: string;
}

export interface SnapshotPointerSwitchedEvent {
  event_id: string;
  paper_id: string;
  pointer_type: 'full' | 'partial';
  from_snapshot_id?: string;
  to_snapshot_id: string;
  reason: string;
  changed_by: CreatedByMode;
  changed_at: string;
}

export interface ResearchNodeStatusChangedEvent {
  event_id: string;
  paper_id: string;
  node_id: string;
  from_status?: NodeStatus;
  to_status: NodeStatus;
  changed_at: string;
  changed_by: CreatedByMode;
}

export interface ResearchTimelineEventAppendedEvent {
  event_id: string;
  paper_id: string;
  timeline_event: PaperTimelineEvent;
  appended_at: string;
}

export interface ResearchMetricsUpdatedEvent {
  event_id: string;
  paper_id: string;
  paper_runtime_metric: PaperRuntimeMetric;
  updated_at: string;
}

export interface ResearchReleaseReviewedEvent {
  event_id: string;
  paper_id: string;
  review_id: string;
  decision: ReleaseReviewDecision;
  reviewers: string[];
  label_policy: string;
  reviewed_at: string;
}

export type ResearchLifecycleEvent =
  | LlmWorkflowPlanGeneratedEvent
  | StageGateCheckRequestedEvent
  | StageGateCheckResultEvent
  | VersionSpineCommittedEvent
  | SnapshotPointerSwitchedEvent
  | ResearchNodeStatusChangedEvent
  | ResearchTimelineEventAppendedEvent
  | ResearchMetricsUpdatedEvent
  | ResearchReleaseReviewedEvent;

export const VERSION_ID_PATTERN = /^P\d+-M[1-8]-B\d+-N\d+$/;
export const SNAPSHOT_ID_PATTERN = /^SP-\d{4}$/;
export const RELEASE_TAG_PATTERN = /^R\d+\.\d+\.\d+$/;

export function isVersionId(value: string): boolean {
  return VERSION_ID_PATTERN.test(value);
}

export function isSnapshotId(value: string): boolean {
  return SNAPSHOT_ID_PATTERN.test(value);
}

export function isReleaseTag(value: string): boolean {
  return RELEASE_TAG_PATTERN.test(value);
}

export function needsNoM6OverrideContext(
  request: StageGateVerifyRequest,
): boolean {
  return request.analysis_contract === 'no_m6';
}

export function validateNoM6OverrideContext(
  request: StageGateVerifyRequest,
): { ok: true } | { ok: false; reason: string } {
  if (!needsNoM6OverrideContext(request)) {
    return { ok: true };
  }

  const context = request.override_context;
  if (!context?.skip_m6_reason || context.skip_m6_reason.trim().length === 0) {
    return { ok: false, reason: 'skip_m6_reason is required for no_m6 contract.' };
  }

  if (context.training_claim_allowed !== false) {
    return {
      ok: false,
      reason: 'training_claim_allowed must be false for no_m6 contract.',
    };
  }

  return { ok: true };
}

export const createPaperProjectRequestSchema = {
  type: 'object',
  required: ['title_card_id', 'title', 'created_by', 'initial_context'],
  properties: {
    title_card_id: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1 },
    research_direction: { type: 'string', default: 'LLM' },
    created_by: { type: 'string', enum: ['human', 'hybrid'] },
    initial_context: {
      type: 'object',
      required: ['literature_evidence_ids'],
      properties: {
        literature_evidence_ids: {
          type: 'array',
          minItems: 1,
          items: { type: 'string', minLength: 1 },
        },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

export const versionSpineCommitRequestSchema = {
  type: 'object',
  required: ['lineage_meta', 'payload_ref', 'node_status'],
  properties: {
    lineage_meta: {
      type: 'object',
      required: [
        'paper_id',
        'stage_id',
        'module_id',
        'version_id',
        'run_id',
        'lane_id',
        'attempt_id',
        'created_by',
        'created_at',
      ],
      properties: {
        paper_id: { type: 'string' },
        stage_id: { type: 'string' },
        module_id: { type: 'string', enum: ['M4', 'M5', 'M6', 'M7'] },
        version_id: { type: 'string', pattern: '^P\\d+-M[1-8]-B\\d+-N\\d+$' },
        parent_version_id: { type: 'string' },
        parent_node_ids: { type: 'array', items: { type: 'string' } },
        run_id: { type: 'string' },
        lane_id: { type: 'string' },
        attempt_id: { type: 'string' },
        created_by: { type: 'string', enum: CREATED_BY_MODES },
        created_at: { type: 'string', format: 'date-time' },
      },
      additionalProperties: false,
    },
    payload_ref: { type: 'string', minLength: 1 },
    node_status: { type: 'string', enum: ['draft', 'candidate'] },
    value_judgement_payload: {
      type: 'object',
      required: [
        'judgement_id',
        'decision',
        'core_score_vector',
        'extension_score_vector',
        'confidence',
        'reason_summary',
        'reviewer',
        'timestamp',
      ],
      properties: {
        judgement_id: { type: 'string' },
        decision: { type: 'string', enum: GATE_DECISIONS },
        core_score_vector: { type: 'object' },
        extension_score_vector: { type: 'object' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        reason_summary: { type: 'string', minLength: 1 },
        reviewer: { type: 'string', enum: CREATED_BY_MODES },
        timestamp: { type: 'string', format: 'date-time' },
      },
      additionalProperties: true,
    },
  },
  additionalProperties: false,
} as const;

export const stageGateVerifyRequestSchema = {
  type: 'object',
  required: ['candidate_node_ids', 'config_version', 'reviewer_mode', 'analysis_contract'],
  properties: {
    candidate_node_ids: {
      type: 'array',
      minItems: 1,
      items: { type: 'string', minLength: 1 },
    },
    config_version: { type: 'string', minLength: 1 },
    reviewer_mode: { type: 'string', enum: CREATED_BY_MODES },
    analysis_contract: { type: 'string', enum: ANALYSIS_CONTRACTS },
    override_context: {
      type: 'object',
      properties: {
        skip_m6_reason: { type: 'string' },
        training_claim_allowed: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

export const writingPackageBuildRequestSchema = {
  type: 'object',
  required: ['source_snapshot_id', 'writing_mode', 'target_release_tag', 'sections'],
  properties: {
    source_snapshot_id: { type: 'string', pattern: '^SP-\\d{4}$' },
    writing_mode: { type: 'string', enum: ['submission', 'revision', 'draft'] },
    target_release_tag: { type: 'string', pattern: '^R\\d+\\.\\d+\\.\\d+$' },
    sections: {
      type: 'array',
      minItems: 1,
      items: { type: 'string', minLength: 1 },
    },
  },
  additionalProperties: false,
} as const;

export const releaseReviewRequestSchema = {
  type: 'object',
  required: ['reviewers', 'decision', 'risk_flags', 'label_policy'],
  properties: {
    reviewers: {
      type: 'array',
      minItems: 1,
      items: { type: 'string', minLength: 1 },
    },
    decision: { type: 'string', enum: RELEASE_REVIEW_DECISIONS },
    risk_flags: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      default: [],
    },
    label_policy: { type: 'string', minLength: 1 },
    comment: { type: 'string' },
  },
  additionalProperties: false,
} as const;
