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
  type TopicSelectionResearchStageViewStage,
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

export const TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_TRANCHES = [
  'first',
  'second',
] as const;
export type TopicSelectionResearchArenaCalibrationTranche =
  (typeof TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_TRANCHES)[number];

export const TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_RELATION_KINDS = [
  'dominance',
  'causal_perturbation',
  'irrelevant_perturbation',
  'successful_non_advance',
  'advancing',
] as const;
export type TopicSelectionResearchArenaCalibrationRelationKind =
  (typeof TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_RELATION_KINDS)[number];

export const TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_DELTA_CLASSIFICATIONS = [
  'causal',
  'irrelevant',
] as const;
export type TopicSelectionResearchArenaCalibrationDeltaClassification =
  (typeof TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_DELTA_CLASSIFICATIONS)[number];

export const TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_OVERRIDE_CATEGORIES = [
  'explained_repair',
  'human_objective_difference',
  'possible_false_drop',
  'possible_false_continue',
] as const;
export type TopicSelectionResearchArenaCalibrationOverrideCategory =
  (typeof TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_OVERRIDE_CATEGORIES)[number];

export const TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_DOWNSTREAM_STAGE_KEYS = [
  'research_question',
  'value_feasibility',
  'topic_package',
  'promotion_review',
] as const satisfies readonly TopicSelectionResearchStageViewStage[];
export type TopicSelectionResearchArenaCalibrationDownstreamStageKey =
  (typeof TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_DOWNSTREAM_STAGE_KEYS)[number];

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
  'MISSING_PRE_REGISTERED_PROTOCOL',
  'MISSING_PRODUCT_V2_EXECUTION',
  'MISSING_EVIDENCE_GROUNDING',
  'MISSING_EXECUTION_INDEPENDENCE',
  'MISSING_REPLAY_INTEGRITY',
  'MISSING_ACCEPT_LABEL',
  'MISSING_OVERRIDE_LABEL',
  'MISSING_NON_ADVANCE_LABEL',
  'MISSING_MEMBER_LABEL_COVERAGE',
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

/** Historical persisted request shape retained for decoding fixtures; no write schema accepts it. */
export interface TopicSelectionResearchArenaCalibrationDatasetCreateRequestV1 {
  schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v1';
  workspace_id: string | null;
  dataset_key: string;
  dataset_version: string;
  description: string | null;
}

export interface TopicSelectionResearchArenaCalibrationLoopDeltaRecipe {
  delta_type: 'evidence';
  ref: TopicSelectionFunctionalRef;
  classification: TopicSelectionResearchArenaCalibrationDeltaClassification;
  rationale: string;
}

export interface TopicSelectionResearchArenaCalibrationMemberRecipe {
  member_role: TopicSelectionResearchArenaCalibrationMemberRole;
  session_key: string;
  title_card_id: string;
  input_snapshot_ref: TopicSelectionFunctionalRef;
  candidate_refs: TopicSelectionFunctionalRef[];
  evidence_refs: TopicSelectionFunctionalRef[];
  label_slot_key: string;
  label_actor: { actor_type: 'human'; actor_id: string };
  loop_delta: TopicSelectionResearchArenaCalibrationLoopDeltaRecipe | null;
}

export interface TopicSelectionResearchArenaCalibrationExpectedRelation {
  relation_kind: TopicSelectionResearchArenaCalibrationRelationKind;
  rationale: string;
  dominance_axes: string[];
  sole_delta_ref: TopicSelectionFunctionalRef | null;
}

export interface TopicSelectionResearchArenaCalibrationProtocolSlot {
  slot_key: string;
  case_type: Extract<
    TopicSelectionOfflineEvaluationCaseType,
    (typeof TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_CASE_TYPES)[number]
  >;
  tranche: TopicSelectionResearchArenaCalibrationTranche;
  members: TopicSelectionResearchArenaCalibrationMemberRecipe[];
  expected_relation: TopicSelectionResearchArenaCalibrationExpectedRelation;
  work_avoided_stage_keys: TopicSelectionResearchArenaCalibrationDownstreamStageKey[];
}

export interface TopicSelectionResearchArenaCalibrationProtocolV2 {
  schema_version: 'TopicSelectionResearchArenaCalibrationProtocol@v2';
  slots: TopicSelectionResearchArenaCalibrationProtocolSlot[];
  selection_rule: 'ordered_exact_member_recipes';
  measurement_window: {
    start_event: 'case_registration_before_role_output';
    end_event: 'calibration_run_evaluation';
  };
  accounting_sources: {
    runtime: 'arena_transcript';
    authorization_pause: 'designated_advisory_review_operation_group';
    work_avoided: 'research_stage_manifest';
  };
  decision_difference_rule: 'advisory_outcome_changed';
  override_categories: TopicSelectionResearchArenaCalibrationOverrideCategory[];
  stop_rules: {
    hard_blocker: 'stop_immediately';
    first_tranche_redundancy: 'stop_when_no_decision_difference_and_no_work_avoided';
  };
  budgets: {
    max_case_count: 6;
    max_session_count: 10;
    max_role_invocation_count: 20;
    max_review_points_per_tranche: 2;
  };
  support_only: true;
}

export interface TopicSelectionResearchArenaCalibrationDatasetCreateRequestV2 {
  schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v2';
  workspace_id: string | null;
  dataset_key: string;
  dataset_version: string;
  description: string | null;
  protocol_manifest: TopicSelectionResearchArenaCalibrationProtocolV2;
}

export type TopicSelectionResearchArenaCalibrationDatasetCreateRequest =
  TopicSelectionResearchArenaCalibrationDatasetCreateRequestV2;

export interface TopicSelectionResearchArenaCalibrationCaseMemberInput {
  member_role: TopicSelectionResearchArenaCalibrationMemberRole;
  arena_session_id: string;
  research_checkpoint_id: string | null;
}

/** Historical persisted request shape retained for decoding fixtures; no write schema accepts it. */
export interface TopicSelectionResearchArenaCalibrationCaseCreateRequestV1 {
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

export interface TopicSelectionResearchArenaCalibrationCaseCreateRequestV2 {
  schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v2';
  dataset_id: string;
  case_key: string;
  slot_key: string;
  tags: string[];
}

export type TopicSelectionResearchArenaCalibrationCaseCreateRequest =
  TopicSelectionResearchArenaCalibrationCaseCreateRequestV2;

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

export const topicSelectionResearchArenaCalibrationLoopDeltaRecipeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['delta_type', 'ref', 'classification', 'rationale'],
  properties: {
    delta_type: { const: 'evidence' },
    ref: topicSelectionFunctionalRefSchema,
    classification: {
      enum: [...TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_DELTA_CLASSIFICATIONS],
    },
    rationale: stringId,
  },
} as const;

export const topicSelectionResearchArenaCalibrationMemberRecipeSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'member_role',
    'session_key',
    'title_card_id',
    'input_snapshot_ref',
    'candidate_refs',
    'evidence_refs',
    'label_slot_key',
    'label_actor',
    'loop_delta',
  ],
  properties: {
    member_role: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_MEMBER_ROLES] },
    session_key: stringId,
    title_card_id: stringId,
    input_snapshot_ref: topicSelectionFunctionalRefSchema,
    candidate_refs: {
      type: 'array',
      minItems: 1,
      items: topicSelectionFunctionalRefSchema,
      uniqueItems: true,
    },
    evidence_refs: {
      type: 'array',
      minItems: 1,
      items: topicSelectionFunctionalRefSchema,
      uniqueItems: true,
    },
    label_slot_key: stringId,
    label_actor: {
      type: 'object',
      additionalProperties: false,
      required: ['actor_type', 'actor_id'],
      properties: {
        actor_type: { const: 'human' },
        actor_id: stringId,
      },
    },
    loop_delta: {
      anyOf: [topicSelectionResearchArenaCalibrationLoopDeltaRecipeSchema, { type: 'null' }],
    },
  },
} as const;

export const topicSelectionResearchArenaCalibrationExpectedRelationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['relation_kind', 'rationale', 'dominance_axes', 'sole_delta_ref'],
  properties: {
    relation_kind: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_RELATION_KINDS] },
    rationale: stringId,
    dominance_axes: { type: 'array', items: stringId, uniqueItems: true },
    sole_delta_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
  },
} as const;

export const topicSelectionResearchArenaCalibrationProtocolSlotSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'slot_key',
    'case_type',
    'tranche',
    'members',
    'expected_relation',
    'work_avoided_stage_keys',
  ],
  properties: {
    slot_key: stringId,
    case_type: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_CASE_TYPES] },
    tranche: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_TRANCHES] },
    members: {
      type: 'array',
      minItems: 1,
      maxItems: 2,
      items: topicSelectionResearchArenaCalibrationMemberRecipeSchema,
    },
    expected_relation: topicSelectionResearchArenaCalibrationExpectedRelationSchema,
    work_avoided_stage_keys: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_DOWNSTREAM_STAGE_KEYS] },
      uniqueItems: true,
    },
  },
} as const;

export const topicSelectionResearchArenaCalibrationProtocolV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'slots',
    'selection_rule',
    'measurement_window',
    'accounting_sources',
    'decision_difference_rule',
    'override_categories',
    'stop_rules',
    'budgets',
    'support_only',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionResearchArenaCalibrationProtocol@v2' },
    slots: {
      type: 'array',
      minItems: 6,
      maxItems: 6,
      items: topicSelectionResearchArenaCalibrationProtocolSlotSchema,
    },
    selection_rule: { const: 'ordered_exact_member_recipes' },
    measurement_window: {
      type: 'object',
      additionalProperties: false,
      required: ['start_event', 'end_event'],
      properties: {
        start_event: { const: 'case_registration_before_role_output' },
        end_event: { const: 'calibration_run_evaluation' },
      },
    },
    accounting_sources: {
      type: 'object',
      additionalProperties: false,
      required: ['runtime', 'authorization_pause', 'work_avoided'],
      properties: {
        runtime: { const: 'arena_transcript' },
        authorization_pause: { const: 'designated_advisory_review_operation_group' },
        work_avoided: { const: 'research_stage_manifest' },
      },
    },
    decision_difference_rule: { const: 'advisory_outcome_changed' },
    override_categories: {
      type: 'array',
      minItems: 4,
      maxItems: 4,
      items: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_OVERRIDE_CATEGORIES] },
      uniqueItems: true,
    },
    stop_rules: {
      type: 'object',
      additionalProperties: false,
      required: ['hard_blocker', 'first_tranche_redundancy'],
      properties: {
        hard_blocker: { const: 'stop_immediately' },
        first_tranche_redundancy: {
          const: 'stop_when_no_decision_difference_and_no_work_avoided',
        },
      },
    },
    budgets: {
      type: 'object',
      additionalProperties: false,
      required: [
        'max_case_count',
        'max_session_count',
        'max_role_invocation_count',
        'max_review_points_per_tranche',
      ],
      properties: {
        max_case_count: { const: 6 },
        max_session_count: { const: 10 },
        max_role_invocation_count: { const: 20 },
        max_review_points_per_tranche: { const: 2 },
      },
    },
    support_only: { const: true },
  },
} as const;

const topicSelectionResearchArenaCalibrationDatasetCreateRequestV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'workspace_id',
    'dataset_key',
    'dataset_version',
    'description',
    'protocol_manifest',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v2' },
    workspace_id: nullableStringId,
    dataset_key: stringId,
    dataset_version: stringId,
    description: nullableStringId,
    protocol_manifest: topicSelectionResearchArenaCalibrationProtocolV2Schema,
  },
} as const;

export const topicSelectionResearchArenaCalibrationDatasetCreateRequestSchema =
  topicSelectionResearchArenaCalibrationDatasetCreateRequestV2Schema;

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

const topicSelectionResearchArenaCalibrationCaseCreateRequestV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['schema_version', 'dataset_id', 'case_key', 'slot_key', 'tags'],
  properties: {
    schema_version: { const: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v2' },
    dataset_id: stringId,
    case_key: stringId,
    slot_key: stringId,
    tags: { type: 'array', items: stringId, uniqueItems: true },
  },
} as const;

export const topicSelectionResearchArenaCalibrationCaseCreateRequestSchema =
  topicSelectionResearchArenaCalibrationCaseCreateRequestV2Schema;

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
