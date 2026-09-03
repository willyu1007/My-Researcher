import {
  topicSelectionActorRefSchema,
  topicSelectionFunctionalRefSchema,
  type TopicSelectionActorRef,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';
import type {
  TopicSelectionEvidenceConvergenceExecutionPolicy,
  TopicSelectionEvidenceConvergenceStrategyIdentityPayload,
} from './topic-selection-evidence-convergence-contracts.js';

export const TOPIC_SELECTION_SEED_KINDS = ['title_card', 'manual', 'imported'] as const;
export type TopicSelectionSeedKind = (typeof TOPIC_SELECTION_SEED_KINDS)[number];

export const TOPIC_SELECTION_RESOURCE_POOL_SOURCES = [
  'title_card_evidence_basket',
  'managed_library',
  'manual_selection',
  'search_result',
] as const;
export type TopicSelectionResourcePoolSource = (typeof TOPIC_SELECTION_RESOURCE_POOL_SOURCES)[number];

export const TOPIC_SELECTION_SEARCH_PLAN_STATUSES = [
  'draft',
  'ready',
  'superseded',
  'rejected',
] as const;
export type TopicSelectionSearchPlanStatus = (typeof TOPIC_SELECTION_SEARCH_PLAN_STATUSES)[number];

export const TOPIC_SELECTION_SEARCH_PLAN_BLUEPRINT_ORIGINS = [
  'workflow_scenario_fixture',
  'human_authored',
  'codex_assisted',
  'upstream_node',
] as const;
export type TopicSelectionSearchPlanBlueprintOrigin =
  (typeof TOPIC_SELECTION_SEARCH_PLAN_BLUEPRINT_ORIGINS)[number];
export const TOPIC_SELECTION_SEARCH_PLAN_BLUEPRINT_SCHEMA_VERSION =
  'TopicSelectionSearchPlanBlueprint@v1' as const;
export const TOPIC_SELECTION_SEARCH_RUN_RECORD_BUNDLE_SCHEMA_VERSION =
  'TopicSelectionSearchRunRecordBundle@v1' as const;
export const TOPIC_SELECTION_SEARCH_RUN_HANDOFF_SCHEMA_VERSION =
  'TopicSelectionSearchRunHandoff@v1' as const;
export const TOPIC_SELECTION_SEARCH_RUN_LOOPBACK_SIGNAL_SCHEMA_VERSION =
  'TopicSelectionSearchRunLoopbackSignal@v1' as const;

export const TOPIC_SELECTION_SEARCH_RUN_LOOPBACK_TARGETS = [
  'topic-selection.v1a.create-search-plan.v1',
  'topic-selection.v1a.snapshot-literature-resource-pool.v1',
  'upstream_search_execution_or_input_preparation',
  'human_review_search_coverage_acceptance',
] as const;
export type TopicSelectionSearchRunLoopbackTarget =
  (typeof TOPIC_SELECTION_SEARCH_RUN_LOOPBACK_TARGETS)[number];

export const TOPIC_SELECTION_COVERAGE_INTENT_TYPES = [
  'support',
  'challenge',
  'baseline',
  'context',
  'exclusion',
] as const;
export type TopicSelectionCoverageIntentType = (typeof TOPIC_SELECTION_COVERAGE_INTENT_TYPES)[number];

export const TOPIC_SELECTION_EVIDENCE_ROLES = [
  'support',
  'challenge',
  'baseline',
  'context',
  'unknown',
] as const;
export type TopicSelectionEvidenceRole = (typeof TOPIC_SELECTION_EVIDENCE_ROLES)[number];

export const TOPIC_SELECTION_COVERAGE_EXECUTION_STATUSES = [
  'not_run',
  'succeeded',
  'partial',
  'failed',
  'blocked',
] as const;
export type TopicSelectionCoverageExecutionStatus =
  (typeof TOPIC_SELECTION_COVERAGE_EXECUTION_STATUSES)[number];

export const TOPIC_SELECTION_COVERAGE_BINDING_KINDS = [
  'retrieval_hit',
  'seeded_resource',
  'manual_source',
] as const;
export type TopicSelectionCoverageBindingKind = (typeof TOPIC_SELECTION_COVERAGE_BINDING_KINDS)[number];

export const TOPIC_SELECTION_COVERAGE_ASSESSMENT_VERDICTS = [
  'satisfied',
  'partial',
  'missing',
  'accepted_risk',
] as const;
export type TopicSelectionCoverageAssessmentVerdict =
  (typeof TOPIC_SELECTION_COVERAGE_ASSESSMENT_VERDICTS)[number];

export const TOPIC_SELECTION_SEARCH_RUN_KINDS = [
  'planned_search',
  'recheck_followup',
  'manual_import',
] as const;
export type TopicSelectionSearchRunKind = (typeof TOPIC_SELECTION_SEARCH_RUN_KINDS)[number];

export const TOPIC_SELECTION_SEARCH_RUN_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'partial',
  'failed',
  'blocked',
] as const;
export type TopicSelectionSearchRunStatus = (typeof TOPIC_SELECTION_SEARCH_RUN_STATUSES)[number];

export const TOPIC_SELECTION_RECHECK_REQUEST_STATUSES = [
  'open',
  'accepted',
  'rejected',
  'accepted_risk',
  'materialized',
] as const;
export type TopicSelectionSearchPlanRecheckRequestStatus =
  (typeof TOPIC_SELECTION_RECHECK_REQUEST_STATUSES)[number];

export interface TopicSelectionTopicSeedRecord {
  topic_seed_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  seed_version: string;
  seed_kind: TopicSelectionSeedKind;
  working_title: string;
  intent_summary: string;
  scope_notes?: string | null;
  source_title_card_ref: TopicSelectionFunctionalRef;
  source_refs: TopicSelectionFunctionalRef[];
  input_snapshot_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  trace_snapshot_id?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionSourceHealthSummary {
  total_literature_count: number;
  missing_literature_ids: string[];
  rights_class_counts: Record<string, number>;
  pipeline_ready_count: number;
  abstract_ready_count: number;
  key_content_ready_count: number;
  fulltext_ready_count: number;
  source_count: number;
  stale_count: number;
  blocked_count: number;
  warning_codes: string[];
}

export interface TopicSelectionCorpusManifestMember {
  literature_ref: TopicSelectionFunctionalRef;
  embedding_version_ref: TopicSelectionFunctionalRef;
  input_checksum: string | null;
  index_artifact_checksum: string | null;
}

export interface TopicSelectionRetrievalStackIdentity {
  index_kind: 'pgvector';
  embedding_profile_id: string;
  embedding_provider: string;
  embedding_model: string;
  embedding_dimension: number;
  freshness_policy: 'current_only';
  retrieval_policy_version: string;
  reranker_policy_version: string;
}

export interface TopicSelectionLiteratureResourcePoolSnapshotRecord {
  literature_resource_pool_snapshot_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  snapshot_version: string;
  source_scope: TopicSelectionResourcePoolSource;
  topic_seed_ref: TopicSelectionFunctionalRef;
  literature_refs: TopicSelectionFunctionalRef[];
  content_source_refs: TopicSelectionFunctionalRef[];
  source_health_summary: TopicSelectionSourceHealthSummary;
  corpus_manifest_members?: TopicSelectionCorpusManifestMember[];
  retrieval_stack_identity?: TopicSelectionRetrievalStackIdentity | null;
  snapshot_hash: string;
  input_snapshot_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionSearchPlanRecord {
  search_plan_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  plan_version: string;
  status: TopicSelectionSearchPlanStatus;
  topic_seed_ref: TopicSelectionFunctionalRef;
  literature_snapshot_ref: TopicSelectionFunctionalRef;
  parent_search_plan_ref?: TopicSelectionFunctionalRef | null;
  recheck_request_ref?: TopicSelectionFunctionalRef | null;
  query_intents: string[];
  must_check_constraints: string[];
  exclusion_rules: string[];
  coverage_strategy: Record<string, unknown>;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionCoverageRowIntentRecord {
  coverage_row_intent_id: string;
  search_plan_id: string;
  workspace_id?: string | null;
  title_card_id?: string | null;
  coverage_key: string;
  intent_type: TopicSelectionCoverageIntentType;
  query: string;
  rationale: string;
  required: boolean;
  priority: number;
  target_source_types: string[];
  expected_evidence_role: TopicSelectionEvidenceRole;
  refs: TopicSelectionFunctionalRef[];
  created_at: string;
}

export interface TopicSelectionSearchPlanBlueprintCoverageIntent {
  coverage_key: string;
  intent_type: TopicSelectionCoverageIntentType;
  query: string;
  rationale: string;
  required: boolean;
  priority: number;
  expected_evidence_role: TopicSelectionEvidenceRole;
  target_source_types: string[];
  refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionSearchPlanBlueprint {
  schema_version: string;
  blueprint_origin: TopicSelectionSearchPlanBlueprintOrigin;
  blueprint_provenance_refs: TopicSelectionFunctionalRef[];
  title_card_ref: TopicSelectionFunctionalRef;
  topic_seed_ref: TopicSelectionFunctionalRef;
  literature_resource_pool_snapshot_ref: TopicSelectionFunctionalRef;
  expected_snapshot_hash: string;
  plan_version: string | null;
  parent_search_plan_ref: TopicSelectionFunctionalRef | null;
  recheck_request_ref: TopicSelectionFunctionalRef | null;
  query_intents: string[];
  coverage_intents: TopicSelectionSearchPlanBlueprintCoverageIntent[];
  must_check_constraints: string[];
  exclusion_rules: string[];
  coverage_strategy: Record<string, unknown>;
  role_coverage_expectation: Record<string, unknown>;
  method_family_targets: string[];
  policy_version: string;
  output_schema_version: string;
}

export interface TopicSelectionCoverageExecutionObservationRecord {
  coverage_execution_observation_id: string;
  search_plan_id: string;
  coverage_row_intent_id: string;
  search_run_id?: string | null;
  status: TopicSelectionCoverageExecutionStatus;
  result_count: number;
  source_count: number;
  missing_reason_codes: string[];
  notes?: string | null;
  created_at: string;
}

export interface TopicSelectionCoverageEvidenceBindingRecord {
  coverage_evidence_binding_id: string;
  search_plan_id: string;
  coverage_row_intent_id: string;
  search_run_id: string;
  literature_ref: TopicSelectionFunctionalRef;
  source_refs: TopicSelectionFunctionalRef[];
  binding_kind: TopicSelectionCoverageBindingKind;
  result_rank?: number | null;
  created_at: string;
}

export interface TopicSelectionCoverageAssessmentRecord {
  coverage_assessment_id: string;
  search_plan_id: string;
  coverage_row_intent_id: string;
  verdict: TopicSelectionCoverageAssessmentVerdict;
  issue_codes: string[];
  confidence?: number | null;
  assessed_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionCoverageRiskAcceptanceRecord {
  coverage_risk_acceptance_id: string;
  search_plan_id: string;
  coverage_row_intent_id: string;
  accepted_risk_ref: TopicSelectionFunctionalRef;
  accepted_by: TopicSelectionActorRef;
  rationale: string;
  expires_at?: string | null;
  created_at: string;
}

export interface TopicSelectionSearchRunResultAccounting {
  total_result_count: number;
  unique_literature_count: number;
  duplicate_result_count: number;
  failed_source_count: number;
  skipped_source_count: number;
}

export interface TopicSelectionSearchRunRecord {
  search_run_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_snapshot_ref: TopicSelectionFunctionalRef;
  run_kind: TopicSelectionSearchRunKind;
  run_status: TopicSelectionSearchRunStatus;
  query_provenance: Array<Record<string, unknown>>;
  result_accounting: TopicSelectionSearchRunResultAccounting;
  source_health_summary: Record<string, unknown>;
  dedup_summary: Record<string, unknown>;
  evidence_map_input_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  started_at: string;
  finished_at?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionSearchRunRecordBundleCoverageObservation {
  coverage_row_intent_ref: TopicSelectionFunctionalRef;
  status: TopicSelectionCoverageExecutionStatus;
  result_count: number;
  source_count: number;
  missing_reason_codes: string[];
  notes?: string | null;
}

export interface TopicSelectionSearchRunRecordBundleEvidenceBinding {
  coverage_row_intent_ref: TopicSelectionFunctionalRef;
  literature_ref: TopicSelectionFunctionalRef;
  source_refs: TopicSelectionFunctionalRef[];
  binding_kind: TopicSelectionCoverageBindingKind;
  result_rank?: number | null;
}

export interface TopicSelectionSearchRunRecordBundleCoverageAssessment {
  coverage_row_intent_ref: TopicSelectionFunctionalRef;
  verdict: TopicSelectionCoverageAssessmentVerdict;
  issue_codes: string[];
  confidence?: number | null;
  assessed_by: TopicSelectionActorType;
}

export interface TopicSelectionSearchRunRecordBundleCoverageRiskAcceptance {
  coverage_row_intent_ref: TopicSelectionFunctionalRef;
  accepted_risk_ref: TopicSelectionFunctionalRef;
  accepted_by: TopicSelectionActorRef;
  rationale: string;
  expires_at?: string | null;
}

export interface TopicSelectionSearchRunRecordBundle {
  schema_version: typeof TOPIC_SELECTION_SEARCH_RUN_RECORD_BUNDLE_SCHEMA_VERSION;
  title_card_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_resource_pool_snapshot_ref: TopicSelectionFunctionalRef;
  expected_literature_snapshot_hash: string;
  run_kind: TopicSelectionSearchRunKind;
  run_status: TopicSelectionSearchRunStatus;
  query_provenance: Array<Record<string, unknown>>;
  result_accounting: TopicSelectionSearchRunResultAccounting;
  source_health_summary: Record<string, unknown>;
  dedup_summary: Record<string, unknown>;
  evidence_map_input_refs: TopicSelectionFunctionalRef[];
  coverage_observations: TopicSelectionSearchRunRecordBundleCoverageObservation[];
  evidence_bindings: TopicSelectionSearchRunRecordBundleEvidenceBinding[];
  coverage_assessments: TopicSelectionSearchRunRecordBundleCoverageAssessment[];
  coverage_risk_acceptances: TopicSelectionSearchRunRecordBundleCoverageRiskAcceptance[];
  raw_log_artifact_ref: TopicSelectionFunctionalRef | null;
  raw_log_artifact_payload: Record<string, unknown> | null;
  policy_version: string;
  output_schema_version: string;
}

export interface TopicSelectionSearchRunCoverageRoleExpectation {
  coverage_row_intent_ref: TopicSelectionFunctionalRef;
  expected_evidence_role: TopicSelectionEvidenceRole;
}

export interface TopicSelectionSearchRunHandoff {
  schema_version: typeof TOPIC_SELECTION_SEARCH_RUN_HANDOFF_SCHEMA_VERSION;
  search_run_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_resource_pool_snapshot_ref: TopicSelectionFunctionalRef;
  literature_snapshot_hash: string;
  coverage_row_intent_refs: TopicSelectionFunctionalRef[];
  coverage_role_expectations: TopicSelectionSearchRunCoverageRoleExpectation[];
  method_family_targets: string[];
  evidence_map_input_refs: TopicSelectionFunctionalRef[];
  coverage_binding_refs: TopicSelectionFunctionalRef[];
  coverage_assessment_refs: TopicSelectionFunctionalRef[];
  coverage_summary: Record<string, unknown>;
  source_health_summary: Record<string, unknown>;
  result_accounting: TopicSelectionSearchRunResultAccounting;
  raw_log_artifact_refs: TopicSelectionFunctionalRef[];
  policy_version: string;
  output_schema_version: string;
}

export interface TopicSelectionSearchRunLoopbackSignal {
  schema_version: typeof TOPIC_SELECTION_SEARCH_RUN_LOOPBACK_SIGNAL_SCHEMA_VERSION;
  search_run_ref: TopicSelectionFunctionalRef | null;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_resource_pool_snapshot_ref: TopicSelectionFunctionalRef;
  reason_codes: string[];
  target_actions: TopicSelectionSearchRunLoopbackTarget[];
  repair_summary: string;
  policy_version: string;
  output_schema_version: string;
}

export interface TopicSelectionSearchPlanRecheckRequestRecord {
  search_plan_recheck_request_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  source_ref: TopicSelectionFunctionalRef;
  target_search_plan_ref: TopicSelectionFunctionalRef;
  target_literature_snapshot_ref?: TopicSelectionFunctionalRef | null;
  request_key?: string | null;
  strategy_key?: string | null;
  issue_ref?: TopicSelectionFunctionalRef | null;
  originating_arena_session_ref?: TopicSelectionFunctionalRef | null;
  retrieval_intent?: TopicSelectionEvidenceConvergenceStrategyIdentityPayload | null;
  expected_decision_effect?: string | null;
  execution_policy?: TopicSelectionEvidenceConvergenceExecutionPolicy | null;
  corpus_manifest_ref?: TopicSelectionFunctionalRef | null;
  corpus_manifest_hash?: string | null;
  supporting_artifact_refs?: TopicSelectionFunctionalRef[];
  reason: string;
  gap_codes: string[];
  requested_by: TopicSelectionActorType;
  status: TopicSelectionSearchPlanRecheckRequestStatus;
  decision_summary?: string | null;
  policy_version_id?: string | null;
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  resulting_search_plan_ref?: TopicSelectionFunctionalRef | null;
  resulting_search_run_ref?: TopicSelectionFunctionalRef | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface TopicSelectionSearchPlanCoverageMatrixRow {
  coverage_row_intent: TopicSelectionCoverageRowIntentRecord;
  latest_observation?: TopicSelectionCoverageExecutionObservationRecord | null;
  latest_assessment?: TopicSelectionCoverageAssessmentRecord | null;
  evidence_bindings: TopicSelectionCoverageEvidenceBindingRecord[];
  risk_acceptances: TopicSelectionCoverageRiskAcceptanceRecord[];
}

export interface TopicSelectionSearchPlanCoverageMatrix {
  search_plan_ref: TopicSelectionFunctionalRef;
  generated_at: string;
  rows: TopicSelectionSearchPlanCoverageMatrixRow[];
  summary: {
    row_count: number;
    satisfied_count: number;
    partial_count: number;
    missing_count: number;
    accepted_risk_count: number;
    unassessed_count: number;
  };
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const numberValue = { type: 'number' } as const;
const nullableNumber = { anyOf: [numberValue, { type: 'null' }] } as const;
const booleanValue = { type: 'boolean' } as const;
const stringArray = { type: 'array', items: stringId } as const;
const nonEmptyStringArray = { type: 'array', minItems: 1, items: stringId } as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const recordArray = { type: 'array', items: objectPayload } as const;
const typedFunctionalRefSchema = (refType: string, options: { requireVersion?: boolean } = {}) => ({
  type: 'object',
  additionalProperties: false,
  required: options.requireVersion ? ['ref_type', 'ref_id', 'version_id'] : ['ref_type', 'ref_id'],
  properties: {
    ref_type: { const: refType },
    ref_id: stringId,
    version_id: options.requireVersion ? stringId : nullableStringId,
    title_card_id: nullableStringId,
    legacy_ref: { anyOf: [objectPayload, { type: 'null' }] },
  },
}) as const;
const titleCardRefSchema = typedFunctionalRefSchema('title_card');
const concreteSearchPlanRefSchema = typedFunctionalRefSchema('search_plan', { requireVersion: true });
const concreteLiteratureSnapshotRefSchema = typedFunctionalRefSchema('literature_resource_pool_snapshot', { requireVersion: true });
const coverageRowIntentRefSchema = typedFunctionalRefSchema('coverage_row_intent');
const searchRunLocatorProvenanceRefSchema = {
  anyOf: [
    typedFunctionalRefSchema('literature_abstract'),
    typedFunctionalRefSchema('fulltext_document'),
    typedFunctionalRefSchema('fulltext_section'),
    typedFunctionalRefSchema('fulltext_paragraph'),
    typedFunctionalRefSchema('fulltext_anchor'),
    typedFunctionalRefSchema('manual_locator'),
  ],
} as const;
const searchRunEvidenceMapInputRefSchema = {
  anyOf: [
    typedFunctionalRefSchema('literature_record'),
    typedFunctionalRefSchema('literature_source'),
    searchRunLocatorProvenanceRefSchema,
  ],
} as const;
const searchRunEvidenceMapInputRefArraySchema = {
  type: 'array',
  items: searchRunEvidenceMapInputRefSchema,
} as const;
const searchRunEvidenceBindingSourceRefSchema = {
  anyOf: [
    typedFunctionalRefSchema('literature_source'),
    searchRunLocatorProvenanceRefSchema,
  ],
} as const;
const searchRunEvidenceBindingSourceRefArraySchema = {
  type: 'array',
  items: searchRunEvidenceBindingSourceRefSchema,
} as const;
const nullableRawSearchLogArtifactRefSchema = {
  anyOf: [
    typedFunctionalRefSchema('artifact_ref'),
    typedFunctionalRefSchema('raw_search_log'),
    { type: 'null' },
  ],
} as const;
const searchCoverageRiskRefSchema = {
  anyOf: [
    typedFunctionalRefSchema('accepted_risk'),
    typedFunctionalRefSchema('search_coverage_risk'),
  ],
} as const;

export const topicSelectionSearchPlanBlueprintCoverageIntentSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'coverage_key',
    'intent_type',
    'query',
    'rationale',
    'required',
    'priority',
    'expected_evidence_role',
    'target_source_types',
    'refs',
  ],
  properties: {
    coverage_key: stringId,
    intent_type: { enum: [...TOPIC_SELECTION_COVERAGE_INTENT_TYPES] },
    query: stringId,
    rationale: stringId,
    required: booleanValue,
    priority: numberValue,
    expected_evidence_role: { enum: [...TOPIC_SELECTION_EVIDENCE_ROLES] },
    target_source_types: stringArray,
    refs: functionalRefArray,
  },
} as const;

export const topicSelectionSearchPlanBlueprintSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'blueprint_origin',
    'blueprint_provenance_refs',
    'title_card_ref',
    'topic_seed_ref',
    'literature_resource_pool_snapshot_ref',
    'expected_snapshot_hash',
    'plan_version',
    'parent_search_plan_ref',
    'recheck_request_ref',
    'query_intents',
    'coverage_intents',
    'must_check_constraints',
    'exclusion_rules',
    'coverage_strategy',
    'role_coverage_expectation',
    'method_family_targets',
    'policy_version',
    'output_schema_version',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_SEARCH_PLAN_BLUEPRINT_SCHEMA_VERSION },
    blueprint_origin: { enum: [...TOPIC_SELECTION_SEARCH_PLAN_BLUEPRINT_ORIGINS] },
    blueprint_provenance_refs: functionalRefArray,
    title_card_ref: topicSelectionFunctionalRefSchema,
    topic_seed_ref: topicSelectionFunctionalRefSchema,
    literature_resource_pool_snapshot_ref: topicSelectionFunctionalRefSchema,
    expected_snapshot_hash: stringId,
    plan_version: nullableStringId,
    parent_search_plan_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    recheck_request_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    query_intents: nonEmptyStringArray,
    coverage_intents: {
      type: 'array',
      minItems: 1,
      items: topicSelectionSearchPlanBlueprintCoverageIntentSchema,
    },
    must_check_constraints: stringArray,
    exclusion_rules: stringArray,
    coverage_strategy: objectPayload,
    role_coverage_expectation: objectPayload,
    method_family_targets: nonEmptyStringArray,
    policy_version: stringId,
    output_schema_version: stringId,
  },
} as const;

export const topicSelectionSourceHealthSummarySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'total_literature_count',
    'missing_literature_ids',
    'rights_class_counts',
    'pipeline_ready_count',
    'abstract_ready_count',
    'key_content_ready_count',
    'fulltext_ready_count',
    'source_count',
    'stale_count',
    'blocked_count',
    'warning_codes',
  ],
  properties: {
    total_literature_count: numberValue,
    missing_literature_ids: stringArray,
    rights_class_counts: { type: 'object', additionalProperties: { type: 'number' } },
    pipeline_ready_count: numberValue,
    abstract_ready_count: numberValue,
    key_content_ready_count: numberValue,
    fulltext_ready_count: numberValue,
    source_count: numberValue,
    stale_count: numberValue,
    blocked_count: numberValue,
    warning_codes: stringArray,
  },
} as const;

export const topicSelectionTopicSeedRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'topic_seed_id',
    'title_card_id',
    'seed_version',
    'seed_kind',
    'working_title',
    'intent_summary',
    'source_title_card_ref',
    'source_refs',
    'created_by',
    'created_at',
  ],
  properties: {
    topic_seed_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    seed_version: stringId,
    seed_kind: { enum: [...TOPIC_SELECTION_SEED_KINDS] },
    working_title: stringId,
    intent_summary: stringId,
    scope_notes: nullableStringId,
    source_title_card_ref: topicSelectionFunctionalRefSchema,
    source_refs: functionalRefArray,
    input_snapshot_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    trace_snapshot_id: nullableStringId,
    created_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    created_at: stringId,
  },
} as const;

export const topicSelectionLiteratureResourcePoolSnapshotRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'literature_resource_pool_snapshot_id',
    'title_card_id',
    'snapshot_version',
    'source_scope',
    'topic_seed_ref',
    'literature_refs',
    'content_source_refs',
    'source_health_summary',
    'snapshot_hash',
    'created_by',
    'created_at',
  ],
  properties: {
    literature_resource_pool_snapshot_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    snapshot_version: stringId,
    source_scope: { enum: [...TOPIC_SELECTION_RESOURCE_POOL_SOURCES] },
    topic_seed_ref: topicSelectionFunctionalRefSchema,
    literature_refs: functionalRefArray,
    content_source_refs: functionalRefArray,
    source_health_summary: topicSelectionSourceHealthSummarySchema,
    corpus_manifest_members: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['literature_ref', 'embedding_version_ref', 'input_checksum', 'index_artifact_checksum'],
        properties: {
          literature_ref: topicSelectionFunctionalRefSchema,
          embedding_version_ref: topicSelectionFunctionalRefSchema,
          input_checksum: nullableStringId,
          index_artifact_checksum: nullableStringId,
        },
      },
    },
    retrieval_stack_identity: {
      anyOf: [{
        type: 'object',
        additionalProperties: false,
        required: [
          'index_kind', 'embedding_profile_id', 'embedding_provider', 'embedding_model',
          'embedding_dimension', 'freshness_policy', 'retrieval_policy_version', 'reranker_policy_version',
        ],
        properties: {
          index_kind: { const: 'pgvector' },
          embedding_profile_id: stringId,
          embedding_provider: stringId,
          embedding_model: stringId,
          embedding_dimension: numberValue,
          freshness_policy: { const: 'current_only' },
          retrieval_policy_version: stringId,
          reranker_policy_version: stringId,
        },
      }, { type: 'null' }],
    },
    snapshot_hash: stringId,
    input_snapshot_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    created_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    created_at: stringId,
  },
} as const;

export const topicSelectionSearchPlanRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'search_plan_id',
    'title_card_id',
    'plan_version',
    'status',
    'topic_seed_ref',
    'literature_snapshot_ref',
    'query_intents',
    'must_check_constraints',
    'exclusion_rules',
    'coverage_strategy',
    'artifact_refs',
    'created_by',
    'created_at',
  ],
  properties: {
    search_plan_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    plan_version: stringId,
    status: { enum: [...TOPIC_SELECTION_SEARCH_PLAN_STATUSES] },
    topic_seed_ref: topicSelectionFunctionalRefSchema,
    literature_snapshot_ref: topicSelectionFunctionalRefSchema,
    parent_search_plan_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    recheck_request_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    query_intents: stringArray,
    must_check_constraints: stringArray,
    exclusion_rules: stringArray,
    coverage_strategy: objectPayload,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    artifact_refs: functionalRefArray,
    created_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    created_at: stringId,
  },
} as const;

export const topicSelectionCoverageRowIntentRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'coverage_row_intent_id',
    'search_plan_id',
    'coverage_key',
    'intent_type',
    'query',
    'rationale',
    'required',
    'priority',
    'target_source_types',
    'expected_evidence_role',
    'refs',
    'created_at',
  ],
  properties: {
    coverage_row_intent_id: stringId,
    search_plan_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: nullableStringId,
    coverage_key: stringId,
    intent_type: { enum: [...TOPIC_SELECTION_COVERAGE_INTENT_TYPES] },
    query: stringId,
    rationale: stringId,
    required: booleanValue,
    priority: numberValue,
    target_source_types: stringArray,
    expected_evidence_role: { enum: [...TOPIC_SELECTION_EVIDENCE_ROLES] },
    refs: functionalRefArray,
    created_at: stringId,
  },
} as const;

export const topicSelectionCoverageExecutionObservationRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'coverage_execution_observation_id',
    'search_plan_id',
    'coverage_row_intent_id',
    'status',
    'result_count',
    'source_count',
    'missing_reason_codes',
    'created_at',
  ],
  properties: {
    coverage_execution_observation_id: stringId,
    search_plan_id: stringId,
    coverage_row_intent_id: stringId,
    search_run_id: nullableStringId,
    status: { enum: [...TOPIC_SELECTION_COVERAGE_EXECUTION_STATUSES] },
    result_count: numberValue,
    source_count: numberValue,
    missing_reason_codes: stringArray,
    notes: nullableStringId,
    created_at: stringId,
  },
} as const;

export const topicSelectionCoverageEvidenceBindingRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'coverage_evidence_binding_id',
    'search_plan_id',
    'coverage_row_intent_id',
    'search_run_id',
    'literature_ref',
    'source_refs',
    'binding_kind',
    'created_at',
  ],
  properties: {
    coverage_evidence_binding_id: stringId,
    search_plan_id: stringId,
    coverage_row_intent_id: stringId,
    search_run_id: stringId,
    literature_ref: topicSelectionFunctionalRefSchema,
    source_refs: functionalRefArray,
    binding_kind: { enum: [...TOPIC_SELECTION_COVERAGE_BINDING_KINDS] },
    result_rank: nullableNumber,
    created_at: stringId,
  },
} as const;

export const topicSelectionCoverageAssessmentRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'coverage_assessment_id',
    'search_plan_id',
    'coverage_row_intent_id',
    'verdict',
    'issue_codes',
    'assessed_by',
    'created_at',
  ],
  properties: {
    coverage_assessment_id: stringId,
    search_plan_id: stringId,
    coverage_row_intent_id: stringId,
    verdict: { enum: [...TOPIC_SELECTION_COVERAGE_ASSESSMENT_VERDICTS] },
    issue_codes: stringArray,
    confidence: nullableNumber,
    assessed_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    created_at: stringId,
  },
} as const;

export const topicSelectionCoverageRiskAcceptanceRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'coverage_risk_acceptance_id',
    'search_plan_id',
    'coverage_row_intent_id',
    'accepted_risk_ref',
    'accepted_by',
    'rationale',
    'created_at',
  ],
  properties: {
    coverage_risk_acceptance_id: stringId,
    search_plan_id: stringId,
    coverage_row_intent_id: stringId,
    accepted_risk_ref: topicSelectionFunctionalRefSchema,
    accepted_by: topicSelectionActorRefSchema,
    rationale: stringId,
    expires_at: nullableStringId,
    created_at: stringId,
  },
} as const;

export const topicSelectionSearchRunResultAccountingSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'total_result_count',
    'unique_literature_count',
    'duplicate_result_count',
    'failed_source_count',
    'skipped_source_count',
  ],
  properties: {
    total_result_count: numberValue,
    unique_literature_count: numberValue,
    duplicate_result_count: numberValue,
    failed_source_count: numberValue,
    skipped_source_count: numberValue,
  },
} as const;

export const topicSelectionSearchRunRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'search_run_id',
    'title_card_id',
    'search_plan_ref',
    'literature_snapshot_ref',
    'run_kind',
    'run_status',
    'query_provenance',
    'result_accounting',
    'source_health_summary',
    'dedup_summary',
    'evidence_map_input_refs',
    'artifact_refs',
    'started_at',
    'created_by',
    'created_at',
  ],
  properties: {
    search_run_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    search_plan_ref: topicSelectionFunctionalRefSchema,
    literature_snapshot_ref: topicSelectionFunctionalRefSchema,
    run_kind: { enum: [...TOPIC_SELECTION_SEARCH_RUN_KINDS] },
    run_status: { enum: [...TOPIC_SELECTION_SEARCH_RUN_STATUSES] },
    query_provenance: recordArray,
    result_accounting: topicSelectionSearchRunResultAccountingSchema,
    source_health_summary: objectPayload,
    dedup_summary: objectPayload,
    evidence_map_input_refs: functionalRefArray,
    artifact_refs: functionalRefArray,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    started_at: stringId,
    finished_at: nullableStringId,
    created_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    created_at: stringId,
  },
} as const;

export const topicSelectionSearchRunRecordBundleCoverageObservationSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'coverage_row_intent_ref',
    'status',
    'result_count',
    'source_count',
    'missing_reason_codes',
  ],
  properties: {
    coverage_row_intent_ref: coverageRowIntentRefSchema,
    status: { enum: [...TOPIC_SELECTION_COVERAGE_EXECUTION_STATUSES] },
    result_count: numberValue,
    source_count: numberValue,
    missing_reason_codes: stringArray,
    notes: nullableStringId,
  },
} as const;

export const topicSelectionSearchRunRecordBundleEvidenceBindingSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'coverage_row_intent_ref',
    'literature_ref',
    'source_refs',
    'binding_kind',
  ],
  properties: {
    coverage_row_intent_ref: coverageRowIntentRefSchema,
    literature_ref: typedFunctionalRefSchema('literature_record'),
    source_refs: searchRunEvidenceBindingSourceRefArraySchema,
    binding_kind: { enum: [...TOPIC_SELECTION_COVERAGE_BINDING_KINDS] },
    result_rank: nullableNumber,
  },
} as const;

export const topicSelectionSearchRunRecordBundleCoverageAssessmentSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'coverage_row_intent_ref',
    'verdict',
    'issue_codes',
    'assessed_by',
  ],
  properties: {
    coverage_row_intent_ref: coverageRowIntentRefSchema,
    verdict: { enum: [...TOPIC_SELECTION_COVERAGE_ASSESSMENT_VERDICTS] },
    issue_codes: stringArray,
    confidence: nullableNumber,
    assessed_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
  },
} as const;

export const topicSelectionSearchRunRecordBundleCoverageRiskAcceptanceSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'coverage_row_intent_ref',
    'accepted_risk_ref',
    'accepted_by',
    'rationale',
  ],
  properties: {
    coverage_row_intent_ref: coverageRowIntentRefSchema,
    accepted_risk_ref: searchCoverageRiskRefSchema,
    accepted_by: topicSelectionActorRefSchema,
    rationale: stringId,
    expires_at: nullableStringId,
  },
} as const;

export const topicSelectionSearchRunRecordBundleSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'title_card_ref',
    'search_plan_ref',
    'literature_resource_pool_snapshot_ref',
    'expected_literature_snapshot_hash',
    'run_kind',
    'run_status',
    'query_provenance',
    'result_accounting',
    'source_health_summary',
    'dedup_summary',
    'evidence_map_input_refs',
    'coverage_observations',
    'evidence_bindings',
    'coverage_assessments',
    'coverage_risk_acceptances',
    'raw_log_artifact_ref',
    'raw_log_artifact_payload',
    'policy_version',
    'output_schema_version',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_SEARCH_RUN_RECORD_BUNDLE_SCHEMA_VERSION },
    title_card_ref: titleCardRefSchema,
    search_plan_ref: concreteSearchPlanRefSchema,
    literature_resource_pool_snapshot_ref: concreteLiteratureSnapshotRefSchema,
    expected_literature_snapshot_hash: stringId,
    run_kind: { enum: [...TOPIC_SELECTION_SEARCH_RUN_KINDS] },
    run_status: { enum: [...TOPIC_SELECTION_SEARCH_RUN_STATUSES] },
    query_provenance: recordArray,
    result_accounting: topicSelectionSearchRunResultAccountingSchema,
    source_health_summary: objectPayload,
    dedup_summary: objectPayload,
    evidence_map_input_refs: searchRunEvidenceMapInputRefArraySchema,
    coverage_observations: {
      type: 'array',
      items: topicSelectionSearchRunRecordBundleCoverageObservationSchema,
    },
    evidence_bindings: {
      type: 'array',
      items: topicSelectionSearchRunRecordBundleEvidenceBindingSchema,
    },
    coverage_assessments: {
      type: 'array',
      items: topicSelectionSearchRunRecordBundleCoverageAssessmentSchema,
    },
    coverage_risk_acceptances: {
      type: 'array',
      items: topicSelectionSearchRunRecordBundleCoverageRiskAcceptanceSchema,
    },
    raw_log_artifact_ref: nullableRawSearchLogArtifactRefSchema,
    raw_log_artifact_payload: { anyOf: [objectPayload, { type: 'null' }] },
    policy_version: stringId,
    output_schema_version: stringId,
  },
} as const;

export const topicSelectionSearchRunHandoffSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'search_run_ref',
    'search_plan_ref',
    'literature_resource_pool_snapshot_ref',
    'literature_snapshot_hash',
    'coverage_row_intent_refs',
    'coverage_role_expectations',
    'method_family_targets',
    'evidence_map_input_refs',
    'coverage_binding_refs',
    'coverage_assessment_refs',
    'coverage_summary',
    'source_health_summary',
    'result_accounting',
    'raw_log_artifact_refs',
    'policy_version',
    'output_schema_version',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_SEARCH_RUN_HANDOFF_SCHEMA_VERSION },
    search_run_ref: topicSelectionFunctionalRefSchema,
    search_plan_ref: topicSelectionFunctionalRefSchema,
    literature_resource_pool_snapshot_ref: topicSelectionFunctionalRefSchema,
    literature_snapshot_hash: stringId,
    coverage_row_intent_refs: functionalRefArray,
    coverage_role_expectations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['coverage_row_intent_ref', 'expected_evidence_role'],
        properties: {
          coverage_row_intent_ref: topicSelectionFunctionalRefSchema,
          expected_evidence_role: { enum: [...TOPIC_SELECTION_EVIDENCE_ROLES] },
        },
      },
    },
    method_family_targets: stringArray,
    evidence_map_input_refs: functionalRefArray,
    coverage_binding_refs: functionalRefArray,
    coverage_assessment_refs: functionalRefArray,
    coverage_summary: objectPayload,
    source_health_summary: objectPayload,
    result_accounting: topicSelectionSearchRunResultAccountingSchema,
    raw_log_artifact_refs: functionalRefArray,
    policy_version: stringId,
    output_schema_version: stringId,
  },
} as const;

export const topicSelectionSearchRunLoopbackSignalSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'search_run_ref',
    'search_plan_ref',
    'literature_resource_pool_snapshot_ref',
    'reason_codes',
    'target_actions',
    'repair_summary',
    'policy_version',
    'output_schema_version',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_SEARCH_RUN_LOOPBACK_SIGNAL_SCHEMA_VERSION },
    search_run_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    search_plan_ref: topicSelectionFunctionalRefSchema,
    literature_resource_pool_snapshot_ref: topicSelectionFunctionalRefSchema,
    reason_codes: stringArray,
    target_actions: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_SEARCH_RUN_LOOPBACK_TARGETS] },
    },
    repair_summary: stringId,
    policy_version: stringId,
    output_schema_version: stringId,
  },
} as const;

export const topicSelectionSearchPlanRecheckRequestRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'search_plan_recheck_request_id',
    'title_card_id',
    'source_ref',
    'target_search_plan_ref',
    'reason',
    'gap_codes',
    'requested_by',
    'status',
    'accepted_risk_refs',
    'created_at',
  ],
  properties: {
    search_plan_recheck_request_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    source_ref: topicSelectionFunctionalRefSchema,
    target_search_plan_ref: topicSelectionFunctionalRefSchema,
    target_literature_snapshot_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    request_key: nullableStringId,
    strategy_key: nullableStringId,
    issue_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    originating_arena_session_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    retrieval_intent: { anyOf: [objectPayload, { type: 'null' }] },
    expected_decision_effect: nullableStringId,
    execution_policy: { anyOf: [objectPayload, { type: 'null' }] },
    corpus_manifest_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    corpus_manifest_hash: nullableStringId,
    supporting_artifact_refs: functionalRefArray,
    reason: stringId,
    gap_codes: stringArray,
    requested_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    status: { enum: [...TOPIC_SELECTION_RECHECK_REQUEST_STATUSES] },
    decision_summary: nullableStringId,
    policy_version_id: nullableStringId,
    accepted_risk_refs: functionalRefArray,
    resulting_search_plan_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    resulting_search_run_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    created_at: stringId,
    resolved_at: nullableStringId,
  },
} as const;

export const topicSelectionSearchPlanCoverageMatrixSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['search_plan_ref', 'generated_at', 'rows', 'summary'],
  properties: {
    search_plan_ref: topicSelectionFunctionalRefSchema,
    generated_at: stringId,
    rows: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['coverage_row_intent', 'evidence_bindings', 'risk_acceptances'],
        properties: {
          coverage_row_intent: topicSelectionCoverageRowIntentRecordSchema,
          latest_observation: {
            anyOf: [topicSelectionCoverageExecutionObservationRecordSchema, { type: 'null' }],
          },
          latest_assessment: {
            anyOf: [topicSelectionCoverageAssessmentRecordSchema, { type: 'null' }],
          },
          evidence_bindings: {
            type: 'array',
            items: topicSelectionCoverageEvidenceBindingRecordSchema,
          },
          risk_acceptances: {
            type: 'array',
            items: topicSelectionCoverageRiskAcceptanceRecordSchema,
          },
        },
      },
    },
    summary: {
      type: 'object',
      additionalProperties: false,
      required: [
        'row_count',
        'satisfied_count',
        'partial_count',
        'missing_count',
        'accepted_risk_count',
        'unassessed_count',
      ],
      properties: {
        row_count: numberValue,
        satisfied_count: numberValue,
        partial_count: numberValue,
        missing_count: numberValue,
        accepted_risk_count: numberValue,
        unassessed_count: numberValue,
      },
    },
  },
} as const;
