import {
  TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_CASE_TYPES,
  topicSelectionOfflineEvaluationMetricResultRecordSchema,
  type TopicSelectionOfflineEvaluationCaseType,
  type TopicSelectionOfflineEvaluationMetricResultRecord,
} from './topic-selection-offline-evaluation-replay-contracts.js';
import {
  topicSelectionFunctionalRefSchema,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';
import {
  TOPIC_SELECTION_CANDIDATE_PORTFOLIO_OUTCOMES,
  type TopicSelectionCandidatePortfolioOutcome,
} from './topic-selection-need-validation-contracts.js';
import {
  TOPIC_SELECTION_RESEARCH_ARENA_ADVISORY_REVIEW_RESPONSES,
  type TopicSelectionResearchArenaAdvisoryReviewResponse,
} from './topic-selection-research-checkpoint-contracts.js';

export const TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_MEMBER_ROLES = [
  'baseline',
  'preferred',
  'control',
  'variant',
  'subject',
] as const;
export type TopicSelectionResearchArenaCalibrationMemberRole =
  (typeof TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_MEMBER_ROLES)[number];

export const TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_RECOMMENDATIONS = [
  'insufficient_evidence',
  'remain_advisory',
  'eligible_for_activation',
] as const;
export type TopicSelectionResearchArenaCalibrationRecommendation =
  (typeof TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_RECOMMENDATIONS)[number];

export const TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_COVERAGE_GAPS = [
  'MISSING_FIRST_DOMINANCE_PAIR',
  'MISSING_SECOND_DOMINANCE_PAIR',
  'MISSING_CAUSAL_PERTURBATION',
  'MISSING_IRRELEVANT_PERTURBATION',
  'MISSING_SUCCESSFUL_NON_ADVANCE',
  'MISSING_ADVANCING_CASE',
  'MISSING_PRODUCT_V2_EXECUTION',
  'MISSING_EVIDENCE_GROUNDING',
  'MISSING_EXECUTION_INDEPENDENCE',
  'MISSING_REPLAY_INTEGRITY',
  'MISSING_ACCEPT_LABEL',
  'MISSING_OVERRIDE_LABEL',
  'MISSING_NON_ADVANCE_LABEL',
  'MISSING_COST_LATENCY_ACCOUNTING',
  'MISSING_MEASURED_WORK_AVOIDED',
] as const;
export type TopicSelectionResearchArenaCalibrationCoverageGap =
  (typeof TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_COVERAGE_GAPS)[number];

export const TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_HARD_BLOCKER_CODES = [
  'CONFIRMED_FALSE_DROP',
  'CONFIRMED_FALSE_CONTINUE',
  'UNEXPLAINED_OVERRIDE',
  'REPLAY_DRIFT',
  'AUTHORITY_LEAK',
  'PEER_EXPOSURE',
  'MISSING_LOOP_DELTA',
  'PROVIDER_CALL',
  'EXTRA_HUMAN_STOP',
  'INVALID_DROP_JUSTIFICATION',
  'CALIBRATION_RELATION_MISS',
] as const;
export type TopicSelectionResearchArenaCalibrationHardBlockerCode =
  (typeof TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_HARD_BLOCKER_CODES)[number];

export interface TopicSelectionResearchArenaCalibrationDatasetCreateRequest {
  schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v1';
  workspace_id: string | null;
  dataset_key: string;
  dataset_version: string;
  description: string | null;
}

export interface TopicSelectionResearchArenaCalibrationCaseMemberInput {
  member_role: TopicSelectionResearchArenaCalibrationMemberRole;
  arena_session_id: string;
  research_checkpoint_id: string | null;
}

export interface TopicSelectionResearchArenaCalibrationCaseCreateRequest {
  schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v1';
  dataset_id: string;
  case_key: string;
  case_type: Extract<
    TopicSelectionOfflineEvaluationCaseType,
    (typeof TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_CASE_TYPES)[number]
  >;
  members: TopicSelectionResearchArenaCalibrationCaseMemberInput[];
  tags: string[];
}

export interface TopicSelectionResearchArenaCalibrationRunCreateRequest {
  schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1';
  dataset_id: string;
  run_key: string;
}

export interface TopicSelectionResearchArenaCalibrationHardBlocker {
  code: TopicSelectionResearchArenaCalibrationHardBlockerCode;
  message: string;
  case_ref: TopicSelectionFunctionalRef | null;
  member_role: TopicSelectionResearchArenaCalibrationMemberRole | null;
}

export interface TopicSelectionResearchArenaCalibrationHumanLabelCounts {
  accept: number;
  override: number;
  defer: number;
  non_advance: number;
}

export interface TopicSelectionResearchArenaCalibrationExecutionAccounting {
  non_provider_role_invocation_count: number | null;
  provider_call_count: number | null;
  retrieval_run_count: number | null;
  retrieval_hit_count: number | null;
  evidence_excerpt_chars: number | null;
  duration_ms: number | null;
  work_avoided_stage_count: number | null;
  authorization_pause_count: number | null;
}

export interface TopicSelectionResearchArenaCalibrationMemberResult {
  member_role: TopicSelectionResearchArenaCalibrationMemberRole;
  arena_session_ref: TopicSelectionFunctionalRef;
  input_snapshot_ref: TopicSelectionFunctionalRef;
  transcript_ref: TopicSelectionFunctionalRef;
  role_execution_refs: TopicSelectionFunctionalRef[];
  evidence_packet_refs: TopicSelectionFunctionalRef[];
  agent_invocation_audit_refs: TopicSelectionFunctionalRef[];
  human_review_refs: TopicSelectionFunctionalRef[];
  human_confirmed_decision_refs: TopicSelectionFunctionalRef[];
  advisory_outcome: TopicSelectionCandidatePortfolioOutcome;
  product_v2_verified: boolean;
  evidence_grounding_passed: boolean;
  execution_independence_passed: boolean;
  replay_integrity_passed: boolean;
  human_label_responses: TopicSelectionResearchArenaAdvisoryReviewResponse[];
  cost_latency_accounting_passed: boolean;
  work_avoided_stage_count: number;
  execution_accounting: TopicSelectionResearchArenaCalibrationExecutionAccounting;
  source_hash: string;
  issues: string[];
  hard_blockers: TopicSelectionResearchArenaCalibrationHardBlocker[];
}

export interface TopicSelectionResearchArenaCalibrationCaseResult {
  schema_version: 'TopicSelectionResearchArenaCalibrationCaseObservation@v1';
  case_ref: TopicSelectionFunctionalRef;
  case_type: Extract<
    TopicSelectionOfflineEvaluationCaseType,
    (typeof TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_CASE_TYPES)[number]
  >;
  relation_passed: boolean;
  members: TopicSelectionResearchArenaCalibrationMemberResult[];
  hard_blockers: TopicSelectionResearchArenaCalibrationHardBlocker[];
}

export interface TopicSelectionResearchArenaCalibrationReport {
  schema_version: 'TopicSelectionResearchArenaCalibrationReport@v1';
  dataset_ref: TopicSelectionFunctionalRef;
  run_ref: TopicSelectionFunctionalRef;
  recommendation: TopicSelectionResearchArenaCalibrationRecommendation;
  case_type_counts: Record<string, number>;
  product_v2_member_count: number;
  human_label_counts: TopicSelectionResearchArenaCalibrationHumanLabelCounts;
  coverage_gaps: TopicSelectionResearchArenaCalibrationCoverageGap[];
  hard_blockers: TopicSelectionResearchArenaCalibrationHardBlocker[];
  metric_results: TopicSelectionOfflineEvaluationMetricResultRecord[];
  case_results: TopicSelectionResearchArenaCalibrationCaseResult[];
  technical_trace_hash: string;
  human_markdown: string;
  llm_working_set: Record<string, unknown>;
  support_only: true;
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const nonNegativeInteger = { type: 'integer', minimum: 0 } as const;
const nullableNonNegativeNumber = {
  anyOf: [{ type: 'number', minimum: 0 }, { type: 'null' }],
} as const;

export const topicSelectionResearchArenaCalibrationDatasetCreateRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schema_version', 'workspace_id', 'dataset_key', 'dataset_version', 'description'],
  properties: {
    schema_version: { const: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v1' },
    workspace_id: nullableStringId,
    dataset_key: stringId,
    dataset_version: stringId,
    description: nullableStringId,
  },
} as const;

export const topicSelectionResearchArenaCalibrationCaseMemberInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['member_role', 'arena_session_id', 'research_checkpoint_id'],
  properties: {
    member_role: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_MEMBER_ROLES] },
    arena_session_id: stringId,
    research_checkpoint_id: nullableStringId,
  },
} as const;

export const topicSelectionResearchArenaCalibrationCaseCreateRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schema_version', 'dataset_id', 'case_key', 'case_type', 'members', 'tags'],
  properties: {
    schema_version: { const: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v1' },
    dataset_id: stringId,
    case_key: stringId,
    case_type: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_CASE_TYPES] },
    members: {
      type: 'array',
      items: topicSelectionResearchArenaCalibrationCaseMemberInputSchema,
      minItems: 1,
      maxItems: 2,
    },
    tags: { type: 'array', items: stringId, uniqueItems: true },
  },
} as const;

export const topicSelectionResearchArenaCalibrationRunCreateRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schema_version', 'dataset_id', 'run_key'],
  properties: {
    schema_version: { const: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1' },
    dataset_id: stringId,
    run_key: stringId,
  },
} as const;

export const topicSelectionResearchArenaCalibrationHardBlockerSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['code', 'message', 'case_ref', 'member_role'],
  properties: {
    code: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_HARD_BLOCKER_CODES] },
    message: stringId,
    case_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    member_role: {
      anyOf: [
        { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_MEMBER_ROLES] },
        { type: 'null' },
      ],
    },
  },
} as const;

export const topicSelectionResearchArenaCalibrationExecutionAccountingSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'non_provider_role_invocation_count',
    'provider_call_count',
    'retrieval_run_count',
    'retrieval_hit_count',
    'evidence_excerpt_chars',
    'duration_ms',
    'work_avoided_stage_count',
    'authorization_pause_count',
  ],
  properties: {
    non_provider_role_invocation_count: nullableNonNegativeNumber,
    provider_call_count: nullableNonNegativeNumber,
    retrieval_run_count: nullableNonNegativeNumber,
    retrieval_hit_count: nullableNonNegativeNumber,
    evidence_excerpt_chars: nullableNonNegativeNumber,
    duration_ms: nullableNonNegativeNumber,
    work_avoided_stage_count: nullableNonNegativeNumber,
    authorization_pause_count: nullableNonNegativeNumber,
  },
} as const;

export const topicSelectionResearchArenaCalibrationMemberResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'member_role',
    'arena_session_ref',
    'input_snapshot_ref',
    'transcript_ref',
    'role_execution_refs',
    'evidence_packet_refs',
    'agent_invocation_audit_refs',
    'human_review_refs',
    'human_confirmed_decision_refs',
    'advisory_outcome',
    'product_v2_verified',
    'evidence_grounding_passed',
    'execution_independence_passed',
    'replay_integrity_passed',
    'human_label_responses',
    'cost_latency_accounting_passed',
    'work_avoided_stage_count',
    'execution_accounting',
    'source_hash',
    'issues',
    'hard_blockers',
  ],
  properties: {
    member_role: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_MEMBER_ROLES] },
    arena_session_ref: topicSelectionFunctionalRefSchema,
    input_snapshot_ref: topicSelectionFunctionalRefSchema,
    transcript_ref: topicSelectionFunctionalRefSchema,
    role_execution_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    evidence_packet_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    agent_invocation_audit_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    human_review_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    human_confirmed_decision_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    advisory_outcome: { enum: [...TOPIC_SELECTION_CANDIDATE_PORTFOLIO_OUTCOMES] },
    product_v2_verified: { type: 'boolean' },
    evidence_grounding_passed: { type: 'boolean' },
    execution_independence_passed: { type: 'boolean' },
    replay_integrity_passed: { type: 'boolean' },
    human_label_responses: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_ADVISORY_REVIEW_RESPONSES] },
    },
    cost_latency_accounting_passed: { type: 'boolean' },
    work_avoided_stage_count: nonNegativeInteger,
    execution_accounting: topicSelectionResearchArenaCalibrationExecutionAccountingSchema,
    source_hash: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    issues: { type: 'array', items: stringId },
    hard_blockers: {
      type: 'array',
      items: topicSelectionResearchArenaCalibrationHardBlockerSchema,
    },
  },
} as const;

export const topicSelectionResearchArenaCalibrationCaseResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schema_version', 'case_ref', 'case_type', 'relation_passed', 'members', 'hard_blockers'],
  properties: {
    schema_version: { const: 'TopicSelectionResearchArenaCalibrationCaseObservation@v1' },
    case_ref: topicSelectionFunctionalRefSchema,
    case_type: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_CASE_TYPES] },
    relation_passed: { type: 'boolean' },
    members: {
      type: 'array',
      minItems: 1,
      maxItems: 2,
      items: topicSelectionResearchArenaCalibrationMemberResultSchema,
    },
    hard_blockers: {
      type: 'array',
      items: topicSelectionResearchArenaCalibrationHardBlockerSchema,
    },
  },
} as const;

export const topicSelectionResearchArenaCalibrationReportSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'dataset_ref',
    'run_ref',
    'recommendation',
    'case_type_counts',
    'product_v2_member_count',
    'human_label_counts',
    'coverage_gaps',
    'hard_blockers',
    'metric_results',
    'case_results',
    'technical_trace_hash',
    'human_markdown',
    'llm_working_set',
    'support_only',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionResearchArenaCalibrationReport@v1' },
    dataset_ref: topicSelectionFunctionalRefSchema,
    run_ref: topicSelectionFunctionalRefSchema,
    recommendation: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_RECOMMENDATIONS] },
    case_type_counts: {
      type: 'object',
      additionalProperties: nonNegativeInteger,
    },
    product_v2_member_count: nonNegativeInteger,
    human_label_counts: {
      type: 'object',
      additionalProperties: false,
      required: ['accept', 'override', 'defer', 'non_advance'],
      properties: {
        accept: nonNegativeInteger,
        override: nonNegativeInteger,
        defer: nonNegativeInteger,
        non_advance: nonNegativeInteger,
      },
    },
    coverage_gaps: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_COVERAGE_GAPS] },
      uniqueItems: true,
    },
    hard_blockers: {
      type: 'array',
      items: topicSelectionResearchArenaCalibrationHardBlockerSchema,
    },
    metric_results: {
      type: 'array',
      items: topicSelectionOfflineEvaluationMetricResultRecordSchema,
    },
    case_results: {
      type: 'array',
      items: topicSelectionResearchArenaCalibrationCaseResultSchema,
    },
    technical_trace_hash: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    human_markdown: stringId,
    llm_working_set: { type: 'object', additionalProperties: true },
    support_only: { const: true },
  },
} as const;
