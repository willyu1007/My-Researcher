import {
  TOPIC_SELECTION_ACTOR_TYPES,
  topicSelectionFunctionalRefSchema,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';
import {
  PAPER_IMPLEMENTATION_AGENT_EXECUTION_MODES,
  PAPER_IMPLEMENTATION_AGENT_RUN_MODES,
  PAPER_IMPLEMENTATION_AGENT_WORKFLOW_TYPES,
  type PaperImplementationAgentExecutionMode,
  type PaperImplementationAgentRunMode,
  type PaperImplementationAgentWorkflowType,
} from './paper-implementation-agent-common-contracts.js';

export const PAPER_IMPLEMENTATION_PROVIDER_VARIANCE_PROFILE_MODES = [
  'deterministic_fake',
  'live_provider_preflight',
] as const;
export type PaperImplementationProviderVarianceProfileMode =
  (typeof PAPER_IMPLEMENTATION_PROVIDER_VARIANCE_PROFILE_MODES)[number];

export const PAPER_IMPLEMENTATION_PROVIDER_VARIANCE_CASE_KINDS = [
  'happy_path',
  'invalid_contract',
  'missing_trace',
  'direct_authority_mutation',
  'overclaim_drift',
  'handoff_gap',
] as const;
export type PaperImplementationProviderVarianceCaseKind =
  (typeof PAPER_IMPLEMENTATION_PROVIDER_VARIANCE_CASE_KINDS)[number];

export const PAPER_IMPLEMENTATION_PROVIDER_PREFLIGHT_STATUSES = [
  'passed',
  'skipped',
  'blocked',
] as const;
export type PaperImplementationProviderPreflightStatus =
  (typeof PAPER_IMPLEMENTATION_PROVIDER_PREFLIGHT_STATUSES)[number];

export const PAPER_IMPLEMENTATION_PROVIDER_VARIANCE_METRICS = [
  'contract_validity_rate',
  'handoff_readiness_rate',
  'authority_violation_rate',
  'traceability_violation_rate',
  'claim_safety_violation_rate',
  'workflow_stability_rate',
  'human_review_burden_rate',
  'provider_operability_rate',
] as const;
export type PaperImplementationProviderVarianceMetric =
  (typeof PAPER_IMPLEMENTATION_PROVIDER_VARIANCE_METRICS)[number];

export interface ProviderVarianceProfile {
  profile_id: string;
  profile_mode: PaperImplementationProviderVarianceProfileMode;
  model_profile_id: string;
  execution_mode: PaperImplementationAgentExecutionMode;
  run_mode: PaperImplementationAgentRunMode;
  live_provider_enabled?: boolean;
}

export interface ProviderVarianceCaseInput {
  case_id: string;
  case_kind: PaperImplementationProviderVarianceCaseKind;
  target_ref: TopicSelectionFunctionalRef;
  source_refs: TopicSelectionFunctionalRef[];
  trace_manifest_refs: TopicSelectionFunctionalRef[];
  artifact_ref?: TopicSelectionFunctionalRef | null;
  expected_handoff_ready?: boolean;
}

export interface RunProviderVarianceEvaluationRequest {
  evaluation_run_id?: string | null;
  harness_id: string;
  input_snapshot_id: string;
  workflow_type: PaperImplementationAgentWorkflowType;
  workflow_version: string;
  prompt_template_version_id: string;
  output_schema_version_id: string;
  repeat_count: number;
  profiles: ProviderVarianceProfile[];
  cases: ProviderVarianceCaseInput[];
  created_by?: TopicSelectionActorType;
}

export interface ProviderVariancePreflightResult {
  profile_id: string;
  status: PaperImplementationProviderPreflightStatus;
  reason: string;
}

export interface ProviderVarianceCaseResult {
  case_id: string;
  case_kind: PaperImplementationProviderVarianceCaseKind;
  profile_id: string;
  repeat_index: number;
  run_status: 'completed' | 'blocked' | 'skipped';
  harness_run_ref?: TopicSelectionFunctionalRef | null;
  proposal_artifact_refs: TopicSelectionFunctionalRef[];
  quality_signal_refs: TopicSelectionFunctionalRef[];
  queue_item_refs: TopicSelectionFunctionalRef[];
  contract_valid: boolean;
  handoff_ready: boolean;
  authority_violation: boolean;
  traceability_violation: boolean;
  claim_safety_violation: boolean;
  provider_operable: boolean;
  blocked_reasons: string[];
  output_signature: string;
}

export interface ProviderVarianceMetricResult {
  metric: PaperImplementationProviderVarianceMetric;
  value: number;
  numerator: number;
  denominator: number;
  consumer: string;
  decision: string;
}

export interface ProviderVarianceRecommendation {
  profile_id: string;
  recommendation: 'enable' | 'pause' | 'demote_to_human_review' | 'tune_before_use';
  reasons: string[];
}

export interface RunProviderVarianceEvaluationResponse {
  evaluation_run_id: string;
  implementation_project_id: string;
  input_snapshot_id: string;
  workflow_type: PaperImplementationAgentWorkflowType;
  profiles: ProviderVarianceProfile[];
  preflight_results: ProviderVariancePreflightResult[];
  case_results: ProviderVarianceCaseResult[];
  metrics: ProviderVarianceMetricResult[];
  recommendations: ProviderVarianceRecommendation[];
  created_by: TopicSelectionActorType;
  created_at: string;
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const actorTypeSchema = { enum: [...TOPIC_SELECTION_ACTOR_TYPES] } as const;
const functionalRefArray = {
  type: 'array',
  items: topicSelectionFunctionalRefSchema,
} as const;
export const providerVarianceProfileSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['profile_id', 'profile_mode', 'model_profile_id', 'execution_mode', 'run_mode'],
  properties: {
    profile_id: stringId,
    profile_mode: { enum: [...PAPER_IMPLEMENTATION_PROVIDER_VARIANCE_PROFILE_MODES] },
    model_profile_id: stringId,
    execution_mode: { enum: [...PAPER_IMPLEMENTATION_AGENT_EXECUTION_MODES] },
    run_mode: { enum: [...PAPER_IMPLEMENTATION_AGENT_RUN_MODES] },
    live_provider_enabled: { type: 'boolean' },
  },
} as const;

export const providerVarianceCaseInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['case_id', 'case_kind', 'target_ref', 'source_refs', 'trace_manifest_refs'],
  properties: {
    case_id: stringId,
    case_kind: { enum: [...PAPER_IMPLEMENTATION_PROVIDER_VARIANCE_CASE_KINDS] },
    target_ref: topicSelectionFunctionalRefSchema,
    source_refs: functionalRefArray,
    trace_manifest_refs: functionalRefArray,
    artifact_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    expected_handoff_ready: { type: 'boolean' },
  },
} as const;

export const runProviderVarianceEvaluationRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'harness_id',
    'input_snapshot_id',
    'workflow_type',
    'workflow_version',
    'prompt_template_version_id',
    'output_schema_version_id',
    'repeat_count',
    'profiles',
    'cases',
  ],
  properties: {
    evaluation_run_id: nullableStringId,
    harness_id: stringId,
    input_snapshot_id: stringId,
    workflow_type: { enum: [...PAPER_IMPLEMENTATION_AGENT_WORKFLOW_TYPES] },
    workflow_version: stringId,
    prompt_template_version_id: stringId,
    output_schema_version_id: stringId,
    repeat_count: { type: 'integer', minimum: 1, maximum: 10 },
    profiles: { type: 'array', minItems: 1, items: providerVarianceProfileSchema },
    cases: { type: 'array', minItems: 1, items: providerVarianceCaseInputSchema },
    created_by: actorTypeSchema,
  },
} as const;

export const providerVariancePreflightResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['profile_id', 'status', 'reason'],
  properties: {
    profile_id: stringId,
    status: { enum: [...PAPER_IMPLEMENTATION_PROVIDER_PREFLIGHT_STATUSES] },
    reason: stringId,
  },
} as const;

export const providerVarianceCaseResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'case_id',
    'case_kind',
    'profile_id',
    'repeat_index',
    'run_status',
    'proposal_artifact_refs',
    'quality_signal_refs',
    'queue_item_refs',
    'contract_valid',
    'handoff_ready',
    'authority_violation',
    'traceability_violation',
    'claim_safety_violation',
    'provider_operable',
    'blocked_reasons',
    'output_signature',
  ],
  properties: {
    case_id: stringId,
    case_kind: { enum: [...PAPER_IMPLEMENTATION_PROVIDER_VARIANCE_CASE_KINDS] },
    profile_id: stringId,
    repeat_index: { type: 'integer', minimum: 1 },
    run_status: { enum: ['completed', 'blocked', 'skipped'] },
    harness_run_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    proposal_artifact_refs: functionalRefArray,
    quality_signal_refs: functionalRefArray,
    queue_item_refs: functionalRefArray,
    contract_valid: { type: 'boolean' },
    handoff_ready: { type: 'boolean' },
    authority_violation: { type: 'boolean' },
    traceability_violation: { type: 'boolean' },
    claim_safety_violation: { type: 'boolean' },
    provider_operable: { type: 'boolean' },
    blocked_reasons: { type: 'array', items: stringId },
    output_signature: stringId,
  },
} as const;

export const providerVarianceMetricResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['metric', 'value', 'numerator', 'denominator', 'consumer', 'decision'],
  properties: {
    metric: { enum: [...PAPER_IMPLEMENTATION_PROVIDER_VARIANCE_METRICS] },
    value: { type: 'number', minimum: 0, maximum: 1 },
    numerator: { type: 'integer', minimum: 0 },
    denominator: { type: 'integer', minimum: 0 },
    consumer: stringId,
    decision: stringId,
  },
} as const;

export const providerVarianceRecommendationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['profile_id', 'recommendation', 'reasons'],
  properties: {
    profile_id: stringId,
    recommendation: { enum: ['enable', 'pause', 'demote_to_human_review', 'tune_before_use'] },
    reasons: { type: 'array', items: stringId },
  },
} as const;

export const runProviderVarianceEvaluationResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'evaluation_run_id',
    'implementation_project_id',
    'input_snapshot_id',
    'workflow_type',
    'profiles',
    'preflight_results',
    'case_results',
    'metrics',
    'recommendations',
    'created_by',
    'created_at',
  ],
  properties: {
    evaluation_run_id: stringId,
    implementation_project_id: stringId,
    input_snapshot_id: stringId,
    workflow_type: { enum: [...PAPER_IMPLEMENTATION_AGENT_WORKFLOW_TYPES] },
    profiles: { type: 'array', items: providerVarianceProfileSchema },
    preflight_results: { type: 'array', items: providerVariancePreflightResultSchema },
    case_results: { type: 'array', items: providerVarianceCaseResultSchema },
    metrics: { type: 'array', items: providerVarianceMetricResultSchema },
    recommendations: { type: 'array', items: providerVarianceRecommendationSchema },
    created_by: actorTypeSchema,
    created_at: stringId,
  },
} as const;
