import {
  topicSelectionFunctionalRefSchema,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';
import type { TopicSelectionEvidenceRole } from './topic-selection-search-resource-contracts.js';

export const TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_DRAFT_SCHEMA_VERSION =
  'TopicSelectionEvidenceMapExtractionDraft@v1' as const;
export const TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_CONTEXT_PACKET_SCHEMA_VERSION =
  'TopicSelectionEvidenceMapExtractionContextPacket@v1' as const;
export const TOPIC_SELECTION_BUILD_EVIDENCE_MAP_NODE_INPUT_SCHEMA_VERSION =
  'TopicSelectionBuildEvidenceMapNodeInput@v1' as const;
export const TOPIC_SELECTION_EVIDENCE_MAP_MATERIALIZATION_REPORT_SCHEMA_VERSION =
  'EvidenceMapMaterializationReport@v1' as const;
export const TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_REVIEW_PACKAGE_SCHEMA_VERSION =
  'EvidenceMapExtractionReviewPackage@v1' as const;
export const TOPIC_SELECTION_EVIDENCE_MAP_HANDOFF_SCHEMA_VERSION =
  'TopicSelectionEvidenceMapHandoff@v1' as const;

export const TOPIC_SELECTION_EVIDENCE_LOCATOR_TYPES = [
  'abstract',
  'section',
  'paragraph',
  'anchor',
  'manual',
] as const;
export type TopicSelectionEvidenceLocatorType = (typeof TOPIC_SELECTION_EVIDENCE_LOCATOR_TYPES)[number];

export const TOPIC_SELECTION_EVIDENCE_REVIEW_STATUSES = [
  'draft',
  'machine_checked',
  'human_reviewed',
  'rejected',
] as const;
export type TopicSelectionEvidenceReviewStatus = (typeof TOPIC_SELECTION_EVIDENCE_REVIEW_STATUSES)[number];

export const TOPIC_SELECTION_EVIDENCE_FRESHNESS_STATUSES = [
  'current',
  'stale',
  'recheck_required',
  'superseded',
] as const;
export type TopicSelectionEvidenceFreshnessStatus = (typeof TOPIC_SELECTION_EVIDENCE_FRESHNESS_STATUSES)[number];

export const TOPIC_SELECTION_EVIDENCE_ATTRIBUTION_KINDS = [
  'source_claim',
  'counter_evidence',
  'human_judgment',
  'llm_inference',
] as const;
export type TopicSelectionEvidenceAttributionKind = (typeof TOPIC_SELECTION_EVIDENCE_ATTRIBUTION_KINDS)[number];

export const TOPIC_SELECTION_EVIDENCE_MAP_STATUSES = [
  'draft',
  'ready',
  'stale',
  'rejected',
] as const;
export type TopicSelectionEvidenceMapStatus = (typeof TOPIC_SELECTION_EVIDENCE_MAP_STATUSES)[number];

export const TOPIC_SELECTION_EVIDENCE_LINK_TYPES = [
  'supports',
  'challenges',
  'baselines',
  'contextualizes',
  'duplicates',
  'refines',
  'conflicts_with',
] as const;
export type TopicSelectionEvidenceLinkType = (typeof TOPIC_SELECTION_EVIDENCE_LINK_TYPES)[number];

export const TOPIC_SELECTION_EVIDENCE_CLUSTER_TYPES = [
  'same_claim',
  'same_source_family',
  'method_family',
  'limitation_family',
  'baseline_family',
] as const;
export type TopicSelectionEvidenceClusterType = (typeof TOPIC_SELECTION_EVIDENCE_CLUSTER_TYPES)[number];

export const TOPIC_SELECTION_EVIDENCE_PATTERN_TYPES = [
  'problem',
  'solution',
  'limitation',
  'unresolved',
  'baseline',
  'context',
] as const;
export type TopicSelectionEvidencePatternType = (typeof TOPIC_SELECTION_EVIDENCE_PATTERN_TYPES)[number];

export const TOPIC_SELECTION_EVIDENCE_CONFLICT_TYPES = [
  'claim_conflict',
  'baseline_conflict',
  'locator_conflict',
  'source_health_conflict',
] as const;
export type TopicSelectionEvidenceConflictType = (typeof TOPIC_SELECTION_EVIDENCE_CONFLICT_TYPES)[number];

export const TOPIC_SELECTION_EVIDENCE_CONFLICT_SEVERITIES = [
  'minor',
  'moderate',
  'material',
  'blocking',
] as const;
export type TopicSelectionEvidenceConflictSeverity =
  (typeof TOPIC_SELECTION_EVIDENCE_CONFLICT_SEVERITIES)[number];

export const TOPIC_SELECTION_EVIDENCE_ASSESSMENT_PURPOSES = [
  'need_validation',
  'readiness',
  'recheck',
  'audit',
] as const;
export type TopicSelectionEvidenceAssessmentPurpose =
  (typeof TOPIC_SELECTION_EVIDENCE_ASSESSMENT_PURPOSES)[number];

export const TOPIC_SELECTION_EVIDENCE_ASSESSMENT_GRANULARITIES = [
  'bundle',
  'role_bundle',
  'unit_drilldown',
] as const;
export type TopicSelectionEvidenceAssessmentGranularity =
  (typeof TOPIC_SELECTION_EVIDENCE_ASSESSMENT_GRANULARITIES)[number];

export const TOPIC_SELECTION_EVIDENCE_STRENGTH_VERDICTS = [
  'strong_support',
  'moderate_support',
  'weak_support',
  'mixed',
  'insufficient',
  'stale',
  'blocked',
] as const;
export type TopicSelectionEvidenceStrengthVerdict =
  (typeof TOPIC_SELECTION_EVIDENCE_STRENGTH_VERDICTS)[number];

export const TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_PRODUCER_KINDS = [
  'codex_cli',
  'codex_assisted',
  'provider_llm',
  'mocked_llm',
  'human',
  'fixture',
] as const;
export type TopicSelectionEvidenceMapExtractionProducerKind =
  (typeof TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_PRODUCER_KINDS)[number];

export const TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_EXECUTION_MODES = [
  'codex_cli',
  'none',
  'mocked_llm',
  'codex_assisted',
  'provider_llm',
] as const;
export type TopicSelectionEvidenceMapExtractionExecutionMode =
  (typeof TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_EXECUTION_MODES)[number];

export const TOPIC_SELECTION_EVIDENCE_MAP_MATERIALIZATION_STATUSES = [
  'ready',
  'ready_with_warning',
  'review_required',
  'blocked',
] as const;
export type TopicSelectionEvidenceMapMaterializationStatus =
  (typeof TOPIC_SELECTION_EVIDENCE_MAP_MATERIALIZATION_STATUSES)[number];

export const TOPIC_SELECTION_EVIDENCE_MAP_MATERIALIZATION_VALIDATION_LAYERS = [
  'schema',
  'lineage',
  'materialization',
] as const;
export type TopicSelectionEvidenceMapMaterializationValidationLayer =
  (typeof TOPIC_SELECTION_EVIDENCE_MAP_MATERIALIZATION_VALIDATION_LAYERS)[number];

export const TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_CONTEXT_FAMILIES = [
  'evidence_extraction_context',
] as const;
export type TopicSelectionEvidenceMapExtractionContextFamily =
  (typeof TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_CONTEXT_FAMILIES)[number];

export interface TopicSelectionEvidenceSourceLocator {
  locator_type: TopicSelectionEvidenceLocatorType;
  locator_ref: TopicSelectionFunctionalRef;
  literature_ref: TopicSelectionFunctionalRef;
  source_ref: TopicSelectionFunctionalRef;
  content_ref?: TopicSelectionFunctionalRef | null;
  document_ref?: TopicSelectionFunctionalRef | null;
  section_ref?: TopicSelectionFunctionalRef | null;
  paragraph_ref?: TopicSelectionFunctionalRef | null;
  anchor_ref?: TopicSelectionFunctionalRef | null;
  manual_label?: string | null;
  quote_hash?: string | null;
  start_offset?: number | null;
  end_offset?: number | null;
  page_number?: number | null;
}

export interface TopicSelectionEvidenceMapRecord {
  evidence_map_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  evidence_map_version: string;
  status: TopicSelectionEvidenceMapStatus;
  review_status: TopicSelectionEvidenceReviewStatus;
  freshness_status: TopicSelectionEvidenceFreshnessStatus;
  search_run_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_snapshot_ref: TopicSelectionFunctionalRef;
  unit_count: number;
  support_unit_count: number;
  challenge_unit_count: number;
  baseline_unit_count: number;
  context_unit_count: number;
  digest_payload: Record<string, unknown>;
  stale_reason_codes: string[];
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  trace_snapshot_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  predecessor_evidence_map_ref?: TopicSelectionFunctionalRef | null;
  successor_evidence_map_ref?: TopicSelectionFunctionalRef | null;
  material_evidence_delta_ref?: TopicSelectionFunctionalRef | null;
  lineage_revision?: number;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionEvidenceUnitRecord {
  evidence_unit_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  evidence_map_id: string;
  evidence_map_version: string;
  search_run_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_snapshot_ref: TopicSelectionFunctionalRef;
  coverage_row_intent_ref?: TopicSelectionFunctionalRef | null;
  literature_ref: TopicSelectionFunctionalRef;
  source_refs: TopicSelectionFunctionalRef[];
  locator: TopicSelectionEvidenceSourceLocator;
  evidence_role: Exclude<TopicSelectionEvidenceRole, 'unknown'>;
  source_attribution_kind: TopicSelectionEvidenceAttributionKind;
  source_statement: string;
  normalized_statement?: string | null;
  interpretation_payload: Record<string, unknown>;
  extraction_confidence?: number | null;
  abstract_only: boolean;
  review_status: TopicSelectionEvidenceReviewStatus;
  freshness_status: TopicSelectionEvidenceFreshnessStatus;
  issue_codes: string[];
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionEvidenceTypedLinkRecord {
  evidence_typed_link_id: string;
  workspace_id?: string | null;
  title_card_id?: string | null;
  evidence_map_id: string;
  evidence_map_version: string;
  link_type: TopicSelectionEvidenceLinkType;
  source_unit_ref: TopicSelectionFunctionalRef;
  target_unit_ref: TopicSelectionFunctionalRef;
  rationale?: string | null;
  confidence?: number | null;
  created_at: string;
}

export interface TopicSelectionEvidenceClusterRecord {
  evidence_cluster_id: string;
  workspace_id?: string | null;
  title_card_id?: string | null;
  evidence_map_id: string;
  evidence_map_version: string;
  cluster_type: TopicSelectionEvidenceClusterType;
  cluster_key: string;
  unit_refs: TopicSelectionFunctionalRef[];
  label: string;
  rationale?: string | null;
  confidence?: number | null;
  created_at: string;
}

export interface TopicSelectionEvidencePatternRecord {
  evidence_pattern_id: string;
  workspace_id?: string | null;
  title_card_id?: string | null;
  evidence_map_id: string;
  evidence_map_version: string;
  pattern_type: TopicSelectionEvidencePatternType;
  evidence_role: Exclude<TopicSelectionEvidenceRole, 'unknown'>;
  unit_refs: TopicSelectionFunctionalRef[];
  pattern_statement: string;
  confidence?: number | null;
  created_at: string;
}

export interface TopicSelectionEvidenceConflictSetRecord {
  evidence_conflict_set_id: string;
  workspace_id?: string | null;
  title_card_id?: string | null;
  evidence_map_id: string;
  evidence_map_version: string;
  conflict_type: TopicSelectionEvidenceConflictType;
  severity: TopicSelectionEvidenceConflictSeverity;
  support_unit_refs: TopicSelectionFunctionalRef[];
  challenge_unit_refs: TopicSelectionFunctionalRef[];
  baseline_unit_refs: TopicSelectionFunctionalRef[];
  context_unit_refs: TopicSelectionFunctionalRef[];
  issue_codes: string[];
  created_at: string;
}

export interface TopicSelectionEvidenceRoleBundle {
  support_unit_refs: TopicSelectionFunctionalRef[];
  challenge_unit_refs: TopicSelectionFunctionalRef[];
  baseline_unit_refs: TopicSelectionFunctionalRef[];
  context_unit_refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionEvidenceStrengthAssessmentRecord {
  evidence_strength_assessment_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  evidence_map_id: string;
  evidence_map_version: string;
  search_run_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_snapshot_ref: TopicSelectionFunctionalRef;
  target_ref: TopicSelectionFunctionalRef;
  purpose: TopicSelectionEvidenceAssessmentPurpose;
  granularity: TopicSelectionEvidenceAssessmentGranularity;
  role_bundle: TopicSelectionEvidenceRoleBundle;
  unit_refs: TopicSelectionFunctionalRef[];
  conflict_refs: TopicSelectionFunctionalRef[];
  cache_key: string;
  strength_verdict: TopicSelectionEvidenceStrengthVerdict;
  confidence?: number | null;
  gap_codes: string[];
  quality_signal_refs: TopicSelectionFunctionalRef[];
  stale_reason_codes: string[];
  freshness_status: TopicSelectionEvidenceFreshnessStatus;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  policy_version_id?: string | null;
  assessment_workflow_version: string;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionNeedValidationEvidenceBundle {
  evidence_map_ref: TopicSelectionFunctionalRef;
  search_run_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_snapshot_ref: TopicSelectionFunctionalRef;
  generated_at: string;
  freshness_status: TopicSelectionEvidenceFreshnessStatus;
  support_units: TopicSelectionEvidenceUnitRecord[];
  challenge_units: TopicSelectionEvidenceUnitRecord[];
  baseline_units: TopicSelectionEvidenceUnitRecord[];
  context_units: TopicSelectionEvidenceUnitRecord[];
  conflict_set_refs: TopicSelectionFunctionalRef[];
  strength_assessment_refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionEvidenceMapRoleCounts {
  support: number;
  challenge: number;
  baseline: number;
  context: number;
}

export interface TopicSelectionEvidenceMapExtractionDraftUnit {
  client_unit_key: string;
  coverage_row_intent_ref?: TopicSelectionFunctionalRef | null;
  evidence_role: Exclude<TopicSelectionEvidenceRole, 'unknown'>;
  literature_ref: TopicSelectionFunctionalRef;
  source_refs: TopicSelectionFunctionalRef[];
  locator: TopicSelectionEvidenceSourceLocator;
  source_statement: string;
  source_attribution_kind: TopicSelectionEvidenceAttributionKind;
  normalized_statement?: string | null;
  interpretation_payload: Record<string, unknown>;
  confidence: number | null;
  issue_codes: string[];
}

export interface TopicSelectionEvidenceMapExtractionDraftLink {
  link_type: TopicSelectionEvidenceLinkType;
  source_unit_key: string;
  target_unit_key: string;
  rationale?: string | null;
  confidence?: number | null;
}

export interface TopicSelectionEvidenceMapExtractionDraftCluster {
  cluster_type: TopicSelectionEvidenceClusterType;
  cluster_key: string;
  unit_keys: string[];
  label: string;
  rationale?: string | null;
  confidence?: number | null;
}

export interface TopicSelectionEvidenceMapExtractionDraftPattern {
  pattern_type: TopicSelectionEvidencePatternType;
  evidence_role: Exclude<TopicSelectionEvidenceRole, 'unknown'>;
  unit_keys: string[];
  pattern_statement: string;
  confidence?: number | null;
}

export interface TopicSelectionEvidenceMapExtractionDraftConflict {
  conflict_type: TopicSelectionEvidenceConflictType;
  severity: TopicSelectionEvidenceConflictSeverity;
  support_unit_keys: string[];
  challenge_unit_keys: string[];
  baseline_unit_keys: string[];
  context_unit_keys: string[];
  issue_codes: string[];
}

export interface TopicSelectionEvidenceMapExtractionDraft {
  schema_version: typeof TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_DRAFT_SCHEMA_VERSION;
  title_card_ref: TopicSelectionFunctionalRef;
  search_run_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_resource_pool_snapshot_ref: TopicSelectionFunctionalRef;
  literature_snapshot_hash: string;
  producer_kind: TopicSelectionEvidenceMapExtractionProducerKind;
  profile_id: string;
  input_refs_hash: string;
  draft_units: TopicSelectionEvidenceMapExtractionDraftUnit[];
  draft_links: TopicSelectionEvidenceMapExtractionDraftLink[];
  draft_clusters: TopicSelectionEvidenceMapExtractionDraftCluster[];
  draft_patterns: TopicSelectionEvidenceMapExtractionDraftPattern[];
  draft_conflicts: TopicSelectionEvidenceMapExtractionDraftConflict[];
  warning_codes: string[];
  policy_version: string;
  output_schema_version: string;
}

export interface TopicSelectionEvidenceMapExtractionContextPacket {
  schema_version: typeof TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_CONTEXT_PACKET_SCHEMA_VERSION;
  node_id: string;
  workflow_run_id: string;
  node_attempt_id: string;
  context_family: TopicSelectionEvidenceMapExtractionContextFamily;
  input_refs: TopicSelectionFunctionalRef[];
  input_refs_hash: string;
  search_run_handoff_hash: string;
  context_compiler_version: string;
  policy_version: string;
  output_schema_version: string;
  execution_mode: Exclude<TopicSelectionEvidenceMapExtractionExecutionMode, 'none'>;
  profile_id: string;
  cache_key: string;
  cache_hit: boolean;
  redaction_policy: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface TopicSelectionBuildEvidenceMapNodeInput {
  schema_version: typeof TOPIC_SELECTION_BUILD_EVIDENCE_MAP_NODE_INPUT_SCHEMA_VERSION;
  workflow_run_id: string;
  node_attempt_id: string;
  title_card_ref: TopicSelectionFunctionalRef;
  search_run_handoff: Record<string, unknown>;
  extraction_context_packet_ref?: TopicSelectionFunctionalRef | null;
  extraction_context_packet?: TopicSelectionEvidenceMapExtractionContextPacket | null;
  extraction_draft?: TopicSelectionEvidenceMapExtractionDraft | null;
  execution_mode: TopicSelectionEvidenceMapExtractionExecutionMode;
  profile_id: string;
  revision_of_attempt_ref?: TopicSelectionFunctionalRef | null;
  review_package_ref?: TopicSelectionFunctionalRef | null;
  operator_reuse_approval_ref?: TopicSelectionFunctionalRef | null;
  policy_version: string;
  output_schema_version: string;
}

export interface TopicSelectionEvidenceMapMaterializationReport {
  schema_version: typeof TOPIC_SELECTION_EVIDENCE_MAP_MATERIALIZATION_REPORT_SCHEMA_VERSION;
  workflow_run_id: string;
  node_attempt_id: string;
  status: TopicSelectionEvidenceMapMaterializationStatus;
  accepted_unit_count: number;
  rejected_unit_count: number;
  rejection_reasons_by_client_unit_key: Record<string, string[]>;
  warning_codes: string[];
  review_codes: string[];
  blocker_codes: string[];
  failed_validation_layer: TopicSelectionEvidenceMapMaterializationValidationLayer | null;
  repair_target: string | null;
  normalized_role_counts: TopicSelectionEvidenceMapRoleCounts;
  materialization_input_hash: string | null;
  draft_hash: string | null;
  input_refs_hash: string | null;
  mapped_input?: Record<string, unknown> | null;
  policy_version: string;
  output_schema_version: string;
}

export interface TopicSelectionEvidenceMapExtractionReviewPackage {
  schema_version: typeof TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_REVIEW_PACKAGE_SCHEMA_VERSION;
  workflow_run_id: string;
  node_attempt_id: string;
  review_package_ref: TopicSelectionFunctionalRef;
  materialization_report_ref: TopicSelectionFunctionalRef | null;
  materialization_report_hash: string;
  extraction_context_packet_ref: TopicSelectionFunctionalRef | null;
  extraction_context_packet_hash: string | null;
  draft_ref: TopicSelectionFunctionalRef | null;
  draft_hash: string;
  ambiguous_unit_keys: string[];
  review_codes: string[];
  accepted_draft_ref_summary: Record<string, unknown>;
  rejected_draft_ref_summary: Record<string, unknown>;
  required_revision_actions: string[];
  allowed_revision_producers: Array<'human' | 'codex_assisted' | 'provider_llm'>;
  policy_version: string;
  output_schema_version: string;
  execution_mode: TopicSelectionEvidenceMapExtractionExecutionMode;
  profile_id: string;
}

export interface TopicSelectionEvidenceMapHandoff {
  schema_version: typeof TOPIC_SELECTION_EVIDENCE_MAP_HANDOFF_SCHEMA_VERSION;
  workflow_run_id: string;
  node_attempt_id: string;
  handoff_ref: TopicSelectionFunctionalRef;
  title_card_ref: TopicSelectionFunctionalRef;
  evidence_map_ref: TopicSelectionFunctionalRef;
  search_run_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_resource_pool_snapshot_ref: TopicSelectionFunctionalRef;
  materialization_report_ref: TopicSelectionFunctionalRef | null;
  materialization_report_hash: string;
  need_validation_evidence_bundle_ref?: TopicSelectionFunctionalRef | null;
  evidence_unit_count: number;
  role_counts: TopicSelectionEvidenceMapRoleCounts;
  abstract_only_support_count: number;
  warning_summary: Record<string, unknown>;
  issue_summary: Record<string, unknown>;
  source_refs_hash: string;
  method_family_targets: string[];
  policy_version: string;
  output_schema_version: string;
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const numberValue = { type: 'number' } as const;
// A type union preserves explicit null when HTTP validation coerces scalar types.
const nullableNumber = { type: ['number', 'null'] } as const;
const booleanValue = { type: 'boolean' } as const;
const stringArray = { type: 'array', items: stringId } as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const nullableFunctionalRef = { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] } as const;
const evidenceRoleSchema = { enum: ['support', 'challenge', 'baseline', 'context'] } as const;

export const topicSelectionEvidenceSourceLocatorSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['locator_type', 'locator_ref', 'literature_ref', 'source_ref'],
  properties: {
    locator_type: { enum: [...TOPIC_SELECTION_EVIDENCE_LOCATOR_TYPES] },
    locator_ref: topicSelectionFunctionalRefSchema,
    literature_ref: topicSelectionFunctionalRefSchema,
    source_ref: topicSelectionFunctionalRefSchema,
    content_ref: nullableFunctionalRef,
    document_ref: nullableFunctionalRef,
    section_ref: nullableFunctionalRef,
    paragraph_ref: nullableFunctionalRef,
    anchor_ref: nullableFunctionalRef,
    manual_label: nullableStringId,
    quote_hash: nullableStringId,
    start_offset: nullableNumber,
    end_offset: nullableNumber,
    page_number: nullableNumber,
  },
} as const;

export const topicSelectionEvidenceMapRoleCountsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['support', 'challenge', 'baseline', 'context'],
  properties: {
    support: numberValue,
    challenge: numberValue,
    baseline: numberValue,
    context: numberValue,
  },
} as const;

export const topicSelectionEvidenceMapExtractionDraftUnitSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'client_unit_key',
    'evidence_role',
    'literature_ref',
    'source_refs',
    'locator',
    'source_statement',
    'source_attribution_kind',
    'interpretation_payload',
    'confidence',
    'issue_codes',
  ],
  properties: {
    client_unit_key: stringId,
    coverage_row_intent_ref: nullableFunctionalRef,
    evidence_role: evidenceRoleSchema,
    literature_ref: topicSelectionFunctionalRefSchema,
    source_refs: functionalRefArray,
    locator: topicSelectionEvidenceSourceLocatorSchema,
    source_statement: stringId,
    source_attribution_kind: { enum: [...TOPIC_SELECTION_EVIDENCE_ATTRIBUTION_KINDS] },
    normalized_statement: nullableStringId,
    interpretation_payload: objectPayload,
    confidence: nullableNumber,
    issue_codes: stringArray,
  },
} as const;

export const topicSelectionEvidenceMapExtractionDraftLinkSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['link_type', 'source_unit_key', 'target_unit_key'],
  properties: {
    link_type: { enum: [...TOPIC_SELECTION_EVIDENCE_LINK_TYPES] },
    source_unit_key: stringId,
    target_unit_key: stringId,
    rationale: nullableStringId,
    confidence: nullableNumber,
  },
} as const;

export const topicSelectionEvidenceMapExtractionDraftClusterSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['cluster_type', 'cluster_key', 'unit_keys', 'label'],
  properties: {
    cluster_type: { enum: [...TOPIC_SELECTION_EVIDENCE_CLUSTER_TYPES] },
    cluster_key: stringId,
    unit_keys: stringArray,
    label: stringId,
    rationale: nullableStringId,
    confidence: nullableNumber,
  },
} as const;

export const topicSelectionEvidenceMapExtractionDraftPatternSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['pattern_type', 'evidence_role', 'unit_keys', 'pattern_statement'],
  properties: {
    pattern_type: { enum: [...TOPIC_SELECTION_EVIDENCE_PATTERN_TYPES] },
    evidence_role: evidenceRoleSchema,
    unit_keys: stringArray,
    pattern_statement: stringId,
    confidence: nullableNumber,
  },
} as const;

export const topicSelectionEvidenceMapExtractionDraftConflictSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'conflict_type',
    'severity',
    'support_unit_keys',
    'challenge_unit_keys',
    'baseline_unit_keys',
    'context_unit_keys',
    'issue_codes',
  ],
  properties: {
    conflict_type: { enum: [...TOPIC_SELECTION_EVIDENCE_CONFLICT_TYPES] },
    severity: { enum: [...TOPIC_SELECTION_EVIDENCE_CONFLICT_SEVERITIES] },
    support_unit_keys: stringArray,
    challenge_unit_keys: stringArray,
    baseline_unit_keys: stringArray,
    context_unit_keys: stringArray,
    issue_codes: stringArray,
  },
} as const;

export const topicSelectionEvidenceMapExtractionDraftSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'title_card_ref',
    'search_run_ref',
    'search_plan_ref',
    'literature_resource_pool_snapshot_ref',
    'literature_snapshot_hash',
    'producer_kind',
    'profile_id',
    'input_refs_hash',
    'draft_units',
    'draft_links',
    'draft_clusters',
    'draft_patterns',
    'draft_conflicts',
    'warning_codes',
    'policy_version',
    'output_schema_version',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_DRAFT_SCHEMA_VERSION },
    title_card_ref: topicSelectionFunctionalRefSchema,
    search_run_ref: topicSelectionFunctionalRefSchema,
    search_plan_ref: topicSelectionFunctionalRefSchema,
    literature_resource_pool_snapshot_ref: topicSelectionFunctionalRefSchema,
    literature_snapshot_hash: stringId,
    producer_kind: { enum: [...TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_PRODUCER_KINDS] },
    profile_id: stringId,
    input_refs_hash: stringId,
    draft_units: { type: 'array', items: topicSelectionEvidenceMapExtractionDraftUnitSchema },
    draft_links: { type: 'array', items: topicSelectionEvidenceMapExtractionDraftLinkSchema },
    draft_clusters: { type: 'array', items: topicSelectionEvidenceMapExtractionDraftClusterSchema },
    draft_patterns: { type: 'array', items: topicSelectionEvidenceMapExtractionDraftPatternSchema },
    draft_conflicts: { type: 'array', items: topicSelectionEvidenceMapExtractionDraftConflictSchema },
    warning_codes: stringArray,
    policy_version: stringId,
    output_schema_version: stringId,
    evidence_map_id: false,
    evidence_unit_id: false,
    created_authority_refs: false,
    hidden_reasoning: false,
    raw_provider_response: false,
    raw_fulltext_dump: false,
    raw_search_log_authority_refs: false,
  },
} as const;

export const topicSelectionEvidenceMapExtractionContextPacketSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'node_id',
    'workflow_run_id',
    'node_attempt_id',
    'context_family',
    'input_refs',
    'input_refs_hash',
    'search_run_handoff_hash',
    'context_compiler_version',
    'policy_version',
    'output_schema_version',
    'execution_mode',
    'profile_id',
    'cache_key',
    'cache_hit',
    'redaction_policy',
    'payload',
    'created_at',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_CONTEXT_PACKET_SCHEMA_VERSION },
    node_id: stringId,
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    context_family: { enum: [...TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_CONTEXT_FAMILIES] },
    input_refs: functionalRefArray,
    input_refs_hash: stringId,
    search_run_handoff_hash: stringId,
    context_compiler_version: stringId,
    policy_version: stringId,
    output_schema_version: stringId,
    execution_mode: { enum: ['mocked_llm', 'codex_assisted', 'provider_llm', 'codex_cli'] },
    profile_id: stringId,
    cache_key: stringId,
    cache_hit: booleanValue,
    redaction_policy: stringId,
    payload: objectPayload,
    created_at: stringId,
  },
} as const;

export const topicSelectionBuildEvidenceMapNodeInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'workflow_run_id',
    'node_attempt_id',
    'title_card_ref',
    'search_run_handoff',
    'execution_mode',
    'profile_id',
    'policy_version',
    'output_schema_version',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_BUILD_EVIDENCE_MAP_NODE_INPUT_SCHEMA_VERSION },
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    title_card_ref: topicSelectionFunctionalRefSchema,
    search_run_handoff: objectPayload,
    extraction_context_packet_ref: nullableFunctionalRef,
    extraction_context_packet: { anyOf: [topicSelectionEvidenceMapExtractionContextPacketSchema, { type: 'null' }] },
    extraction_draft: { anyOf: [topicSelectionEvidenceMapExtractionDraftSchema, { type: 'null' }] },
    execution_mode: { enum: [...TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_EXECUTION_MODES] },
    profile_id: stringId,
    revision_of_attempt_ref: nullableFunctionalRef,
    review_package_ref: nullableFunctionalRef,
    operator_reuse_approval_ref: nullableFunctionalRef,
    policy_version: stringId,
    output_schema_version: stringId,
  },
} as const;

export const topicSelectionEvidenceMapMaterializationReportSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'workflow_run_id',
    'node_attempt_id',
    'status',
    'accepted_unit_count',
    'rejected_unit_count',
    'rejection_reasons_by_client_unit_key',
    'warning_codes',
    'review_codes',
    'blocker_codes',
    'failed_validation_layer',
    'repair_target',
    'normalized_role_counts',
    'materialization_input_hash',
    'draft_hash',
    'input_refs_hash',
    'policy_version',
    'output_schema_version',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_EVIDENCE_MAP_MATERIALIZATION_REPORT_SCHEMA_VERSION },
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    status: { enum: [...TOPIC_SELECTION_EVIDENCE_MAP_MATERIALIZATION_STATUSES] },
    accepted_unit_count: numberValue,
    rejected_unit_count: numberValue,
    rejection_reasons_by_client_unit_key: objectPayload,
    warning_codes: stringArray,
    review_codes: stringArray,
    blocker_codes: stringArray,
    failed_validation_layer: {
      anyOf: [
        { enum: [...TOPIC_SELECTION_EVIDENCE_MAP_MATERIALIZATION_VALIDATION_LAYERS] },
        { type: 'null' },
      ],
    },
    repair_target: nullableStringId,
    normalized_role_counts: topicSelectionEvidenceMapRoleCountsSchema,
    materialization_input_hash: nullableStringId,
    draft_hash: nullableStringId,
    input_refs_hash: nullableStringId,
    mapped_input: { anyOf: [objectPayload, { type: 'null' }] },
    policy_version: stringId,
    output_schema_version: stringId,
  },
} as const;

export const topicSelectionEvidenceMapExtractionReviewPackageSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'workflow_run_id',
    'node_attempt_id',
    'review_package_ref',
    'materialization_report_ref',
    'materialization_report_hash',
    'extraction_context_packet_ref',
    'extraction_context_packet_hash',
    'draft_ref',
    'draft_hash',
    'ambiguous_unit_keys',
    'review_codes',
    'accepted_draft_ref_summary',
    'rejected_draft_ref_summary',
    'required_revision_actions',
    'allowed_revision_producers',
    'policy_version',
    'output_schema_version',
    'execution_mode',
    'profile_id',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_REVIEW_PACKAGE_SCHEMA_VERSION },
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    review_package_ref: topicSelectionFunctionalRefSchema,
    materialization_report_ref: nullableFunctionalRef,
    materialization_report_hash: stringId,
    extraction_context_packet_ref: nullableFunctionalRef,
    extraction_context_packet_hash: nullableStringId,
    draft_ref: nullableFunctionalRef,
    draft_hash: stringId,
    ambiguous_unit_keys: stringArray,
    review_codes: stringArray,
    accepted_draft_ref_summary: objectPayload,
    rejected_draft_ref_summary: objectPayload,
    required_revision_actions: stringArray,
    allowed_revision_producers: {
      type: 'array',
      items: { enum: ['human', 'codex_assisted', 'provider_llm'] },
    },
    policy_version: stringId,
    output_schema_version: stringId,
    execution_mode: { enum: [...TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_EXECUTION_MODES] },
    profile_id: stringId,
  },
} as const;

export const topicSelectionEvidenceMapHandoffSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'workflow_run_id',
    'node_attempt_id',
    'handoff_ref',
    'title_card_ref',
    'evidence_map_ref',
    'search_run_ref',
    'search_plan_ref',
    'literature_resource_pool_snapshot_ref',
    'materialization_report_ref',
    'materialization_report_hash',
    'evidence_unit_count',
    'role_counts',
    'abstract_only_support_count',
    'warning_summary',
    'issue_summary',
    'source_refs_hash',
    'method_family_targets',
    'policy_version',
    'output_schema_version',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_EVIDENCE_MAP_HANDOFF_SCHEMA_VERSION },
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    handoff_ref: topicSelectionFunctionalRefSchema,
    title_card_ref: topicSelectionFunctionalRefSchema,
    evidence_map_ref: topicSelectionFunctionalRefSchema,
    search_run_ref: topicSelectionFunctionalRefSchema,
    search_plan_ref: topicSelectionFunctionalRefSchema,
    literature_resource_pool_snapshot_ref: topicSelectionFunctionalRefSchema,
    materialization_report_ref: nullableFunctionalRef,
    materialization_report_hash: stringId,
    need_validation_evidence_bundle_ref: nullableFunctionalRef,
    evidence_unit_count: numberValue,
    role_counts: topicSelectionEvidenceMapRoleCountsSchema,
    abstract_only_support_count: numberValue,
    warning_summary: objectPayload,
    issue_summary: objectPayload,
    source_refs_hash: stringId,
    method_family_targets: stringArray,
    policy_version: stringId,
    output_schema_version: stringId,
  },
} as const;

export const topicSelectionEvidenceMapRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'evidence_map_id',
    'title_card_id',
    'evidence_map_version',
    'status',
    'review_status',
    'freshness_status',
    'search_run_ref',
    'search_plan_ref',
    'literature_snapshot_ref',
    'unit_count',
    'support_unit_count',
    'challenge_unit_count',
    'baseline_unit_count',
    'context_unit_count',
    'digest_payload',
    'stale_reason_codes',
    'artifact_refs',
    'created_by',
    'created_at',
  ],
  properties: {
    evidence_map_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    evidence_map_version: stringId,
    status: { enum: [...TOPIC_SELECTION_EVIDENCE_MAP_STATUSES] },
    review_status: { enum: [...TOPIC_SELECTION_EVIDENCE_REVIEW_STATUSES] },
    freshness_status: { enum: [...TOPIC_SELECTION_EVIDENCE_FRESHNESS_STATUSES] },
    search_run_ref: topicSelectionFunctionalRefSchema,
    search_plan_ref: topicSelectionFunctionalRefSchema,
    literature_snapshot_ref: topicSelectionFunctionalRefSchema,
    unit_count: numberValue,
    support_unit_count: numberValue,
    challenge_unit_count: numberValue,
    baseline_unit_count: numberValue,
    context_unit_count: numberValue,
    digest_payload: objectPayload,
    stale_reason_codes: stringArray,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    trace_snapshot_id: nullableStringId,
    artifact_refs: functionalRefArray,
    predecessor_evidence_map_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    successor_evidence_map_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    material_evidence_delta_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    lineage_revision: numberValue,
    created_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    created_at: stringId,
  },
} as const;

export const topicSelectionEvidenceUnitRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'evidence_unit_id',
    'title_card_id',
    'evidence_map_id',
    'evidence_map_version',
    'search_run_ref',
    'search_plan_ref',
    'literature_snapshot_ref',
    'literature_ref',
    'source_refs',
    'locator',
    'evidence_role',
    'source_attribution_kind',
    'source_statement',
    'interpretation_payload',
    'abstract_only',
    'review_status',
    'freshness_status',
    'issue_codes',
    'created_by',
    'created_at',
  ],
  properties: {
    evidence_unit_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    evidence_map_id: stringId,
    evidence_map_version: stringId,
    search_run_ref: topicSelectionFunctionalRefSchema,
    search_plan_ref: topicSelectionFunctionalRefSchema,
    literature_snapshot_ref: topicSelectionFunctionalRefSchema,
    coverage_row_intent_ref: nullableFunctionalRef,
    literature_ref: topicSelectionFunctionalRefSchema,
    source_refs: functionalRefArray,
    locator: topicSelectionEvidenceSourceLocatorSchema,
    evidence_role: evidenceRoleSchema,
    source_attribution_kind: { enum: [...TOPIC_SELECTION_EVIDENCE_ATTRIBUTION_KINDS] },
    source_statement: stringId,
    normalized_statement: nullableStringId,
    interpretation_payload: objectPayload,
    extraction_confidence: nullableNumber,
    abstract_only: booleanValue,
    review_status: { enum: [...TOPIC_SELECTION_EVIDENCE_REVIEW_STATUSES] },
    freshness_status: { enum: [...TOPIC_SELECTION_EVIDENCE_FRESHNESS_STATUSES] },
    issue_codes: stringArray,
    created_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    created_at: stringId,
  },
} as const;

export const topicSelectionEvidenceTypedLinkRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'evidence_typed_link_id',
    'evidence_map_id',
    'evidence_map_version',
    'link_type',
    'source_unit_ref',
    'target_unit_ref',
    'created_at',
  ],
  properties: {
    evidence_typed_link_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: nullableStringId,
    evidence_map_id: stringId,
    evidence_map_version: stringId,
    link_type: { enum: [...TOPIC_SELECTION_EVIDENCE_LINK_TYPES] },
    source_unit_ref: topicSelectionFunctionalRefSchema,
    target_unit_ref: topicSelectionFunctionalRefSchema,
    rationale: nullableStringId,
    confidence: nullableNumber,
    created_at: stringId,
  },
} as const;

export const topicSelectionEvidenceClusterRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'evidence_cluster_id',
    'evidence_map_id',
    'evidence_map_version',
    'cluster_type',
    'cluster_key',
    'unit_refs',
    'label',
    'created_at',
  ],
  properties: {
    evidence_cluster_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: nullableStringId,
    evidence_map_id: stringId,
    evidence_map_version: stringId,
    cluster_type: { enum: [...TOPIC_SELECTION_EVIDENCE_CLUSTER_TYPES] },
    cluster_key: stringId,
    unit_refs: functionalRefArray,
    label: stringId,
    rationale: nullableStringId,
    confidence: nullableNumber,
    created_at: stringId,
  },
} as const;

export const topicSelectionEvidencePatternRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'evidence_pattern_id',
    'evidence_map_id',
    'evidence_map_version',
    'pattern_type',
    'evidence_role',
    'unit_refs',
    'pattern_statement',
    'created_at',
  ],
  properties: {
    evidence_pattern_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: nullableStringId,
    evidence_map_id: stringId,
    evidence_map_version: stringId,
    pattern_type: { enum: [...TOPIC_SELECTION_EVIDENCE_PATTERN_TYPES] },
    evidence_role: evidenceRoleSchema,
    unit_refs: functionalRefArray,
    pattern_statement: stringId,
    confidence: nullableNumber,
    created_at: stringId,
  },
} as const;

export const topicSelectionEvidenceConflictSetRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'evidence_conflict_set_id',
    'evidence_map_id',
    'evidence_map_version',
    'conflict_type',
    'severity',
    'support_unit_refs',
    'challenge_unit_refs',
    'baseline_unit_refs',
    'context_unit_refs',
    'issue_codes',
    'created_at',
  ],
  properties: {
    evidence_conflict_set_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: nullableStringId,
    evidence_map_id: stringId,
    evidence_map_version: stringId,
    conflict_type: { enum: [...TOPIC_SELECTION_EVIDENCE_CONFLICT_TYPES] },
    severity: { enum: [...TOPIC_SELECTION_EVIDENCE_CONFLICT_SEVERITIES] },
    support_unit_refs: functionalRefArray,
    challenge_unit_refs: functionalRefArray,
    baseline_unit_refs: functionalRefArray,
    context_unit_refs: functionalRefArray,
    issue_codes: stringArray,
    created_at: stringId,
  },
} as const;

export const topicSelectionEvidenceRoleBundleSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['support_unit_refs', 'challenge_unit_refs', 'baseline_unit_refs', 'context_unit_refs'],
  properties: {
    support_unit_refs: functionalRefArray,
    challenge_unit_refs: functionalRefArray,
    baseline_unit_refs: functionalRefArray,
    context_unit_refs: functionalRefArray,
  },
} as const;

export const topicSelectionEvidenceStrengthAssessmentRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'evidence_strength_assessment_id',
    'title_card_id',
    'evidence_map_id',
    'evidence_map_version',
    'search_run_ref',
    'search_plan_ref',
    'literature_snapshot_ref',
    'target_ref',
    'purpose',
    'granularity',
    'role_bundle',
    'unit_refs',
    'conflict_refs',
    'cache_key',
    'strength_verdict',
    'gap_codes',
    'quality_signal_refs',
    'stale_reason_codes',
    'freshness_status',
    'assessment_workflow_version',
    'created_by',
    'created_at',
  ],
  properties: {
    evidence_strength_assessment_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    evidence_map_id: stringId,
    evidence_map_version: stringId,
    search_run_ref: topicSelectionFunctionalRefSchema,
    search_plan_ref: topicSelectionFunctionalRefSchema,
    literature_snapshot_ref: topicSelectionFunctionalRefSchema,
    target_ref: topicSelectionFunctionalRefSchema,
    purpose: { enum: [...TOPIC_SELECTION_EVIDENCE_ASSESSMENT_PURPOSES] },
    granularity: { enum: [...TOPIC_SELECTION_EVIDENCE_ASSESSMENT_GRANULARITIES] },
    role_bundle: topicSelectionEvidenceRoleBundleSchema,
    unit_refs: functionalRefArray,
    conflict_refs: functionalRefArray,
    cache_key: stringId,
    strength_verdict: { enum: [...TOPIC_SELECTION_EVIDENCE_STRENGTH_VERDICTS] },
    confidence: nullableNumber,
    gap_codes: stringArray,
    quality_signal_refs: functionalRefArray,
    stale_reason_codes: stringArray,
    freshness_status: { enum: [...TOPIC_SELECTION_EVIDENCE_FRESHNESS_STATUSES] },
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    policy_version_id: nullableStringId,
    assessment_workflow_version: stringId,
    created_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    created_at: stringId,
  },
} as const;

export const topicSelectionNeedValidationEvidenceBundleSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'evidence_map_ref',
    'search_run_ref',
    'search_plan_ref',
    'literature_snapshot_ref',
    'generated_at',
    'freshness_status',
    'support_units',
    'challenge_units',
    'baseline_units',
    'context_units',
    'conflict_set_refs',
    'strength_assessment_refs',
  ],
  properties: {
    evidence_map_ref: topicSelectionFunctionalRefSchema,
    search_run_ref: topicSelectionFunctionalRefSchema,
    search_plan_ref: topicSelectionFunctionalRefSchema,
    literature_snapshot_ref: topicSelectionFunctionalRefSchema,
    generated_at: stringId,
    freshness_status: { enum: [...TOPIC_SELECTION_EVIDENCE_FRESHNESS_STATUSES] },
    support_units: { type: 'array', items: topicSelectionEvidenceUnitRecordSchema },
    challenge_units: { type: 'array', items: topicSelectionEvidenceUnitRecordSchema },
    baseline_units: { type: 'array', items: topicSelectionEvidenceUnitRecordSchema },
    context_units: { type: 'array', items: topicSelectionEvidenceUnitRecordSchema },
    conflict_set_refs: functionalRefArray,
    strength_assessment_refs: functionalRefArray,
  },
} as const;
