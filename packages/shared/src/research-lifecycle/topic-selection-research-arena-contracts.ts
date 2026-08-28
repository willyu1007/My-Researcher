import {
  topicSelectionFunctionalRefSchema,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';
import {
  TOPIC_SELECTION_EVIDENCE_LOCATOR_TYPES,
  type TopicSelectionEvidenceLocatorType,
} from './topic-selection-evidence-map-contracts.js';
import {
  TOPIC_SELECTION_COVERAGE_INTENT_TYPES,
  TOPIC_SELECTION_EVIDENCE_ROLES,
  type TopicSelectionCoverageIntentType,
  type TopicSelectionEvidenceRole,
} from './topic-selection-search-resource-contracts.js';
import {
  TOPIC_SELECTION_CANDIDATE_DROP_REASON_CODES,
  TOPIC_SELECTION_CANDIDATE_PORTFOLIO_DISPOSITIONS,
  TOPIC_SELECTION_CANDIDATE_PORTFOLIO_OUTCOMES,
  type TopicSelectionCandidateDropReasonCode,
  type TopicSelectionCandidatePortfolioDispositionKind,
  type TopicSelectionCandidatePortfolioOutcome,
} from './topic-selection-need-validation-contracts.js';

export const TOPIC_SELECTION_RESEARCH_ARENA_PARTICIPANT_ROLES = [
  'opportunity_scout',
  'prior_art_topic_killer',
  'empirical_skeptic',
  'synthesis_arbiter',
] as const;
export type TopicSelectionResearchArenaParticipantRole =
  (typeof TOPIC_SELECTION_RESEARCH_ARENA_PARTICIPANT_ROLES)[number];

export const TOPIC_SELECTION_RESEARCH_EVIDENCE_RELATIONS = [
  'supports',
  'challenges',
  'baselines',
  'contextualizes',
] as const;
export type TopicSelectionResearchEvidenceRelation =
  (typeof TOPIC_SELECTION_RESEARCH_EVIDENCE_RELATIONS)[number];

export const TOPIC_SELECTION_RESEARCH_QUOTE_INTEGRITY_STATUSES = [
  'exact_match',
  'normalized_match',
  'mismatch',
] as const;
export type TopicSelectionResearchQuoteIntegrityStatus =
  (typeof TOPIC_SELECTION_RESEARCH_QUOTE_INTEGRITY_STATUSES)[number];

export interface TopicSelectionResearchEvidenceQueryIntent {
  intent_type: TopicSelectionCoverageIntentType;
  query: string;
  rationale: string;
  target_claim: string;
}

export interface TopicSelectionResearchEvidencePacketRequest {
  schema_version: 'TopicSelectionResearchEvidencePacketRequest@v1';
  title_card_id: string;
  participant_role: TopicSelectionResearchArenaParticipantRole;
  query_intent: TopicSelectionResearchEvidenceQueryIntent;
  evidence_unit_refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionResearchResolvedEvidenceLocator {
  locator_type: TopicSelectionEvidenceLocatorType;
  literature_id: string;
  document_id: string | null;
  content_row_id: string;
  parser_ref_id: string;
  checksum: string | null;
}

export interface TopicSelectionResearchEvidencePacketItem {
  evidence_unit_ref: TopicSelectionFunctionalRef;
  evidence_map_ref: TopicSelectionFunctionalRef;
  literature_ref: TopicSelectionFunctionalRef;
  evidence_role: Exclude<TopicSelectionEvidenceRole, 'unknown'>;
  relation_to_target_claim: TopicSelectionResearchEvidenceRelation;
  source_statement: string;
  resolved_excerpt: string;
  excerpt_hash: string;
  resolved_locator: TopicSelectionResearchResolvedEvidenceLocator;
  freshness: {
    status: 'current';
    retrieval_readiness_reason: string;
  };
  quote_integrity: Exclude<TopicSelectionResearchQuoteIntegrityStatus, 'mismatch'>;
  issue_codes: string[];
}

export interface TopicSelectionResearchEvidencePacket {
  schema_version: 'TopicSelectionResearchEvidencePacket@v1';
  title_card_id: string;
  participant_role: TopicSelectionResearchArenaParticipantRole;
  query_intent: TopicSelectionResearchEvidenceQueryIntent;
  items: TopicSelectionResearchEvidencePacketItem[];
  source_refs: TopicSelectionFunctionalRef[];
  total_excerpt_chars: number;
  packet_hash: string;
}

export const TOPIC_SELECTION_RESEARCH_ARENA_KINDS = [
  'evidence_landscape',
  'gap_portfolio',
  'question_design',
  'comparative_value',
] as const;
export type TopicSelectionResearchArenaKind =
  (typeof TOPIC_SELECTION_RESEARCH_ARENA_KINDS)[number];

export const TOPIC_SELECTION_RESEARCH_ARENA_STATUSES = [
  'open',
  'synthesized',
  'superseded',
] as const;
export type TopicSelectionResearchArenaStatus =
  (typeof TOPIC_SELECTION_RESEARCH_ARENA_STATUSES)[number];

export const TOPIC_SELECTION_RESEARCH_ARENA_TERMINATION_REASONS = [
  'recommendation_ready',
  'none_viable',
  'evidence_expansion_required',
  'reframe_required',
  'human_hold',
  'policy_blocked',
] as const;
export type TopicSelectionResearchArenaTerminationReason =
  (typeof TOPIC_SELECTION_RESEARCH_ARENA_TERMINATION_REASONS)[number];

export const TOPIC_SELECTION_RESEARCH_ARENA_DELTA_TYPES = [
  'evidence',
  'candidate',
  'constraint',
  'human_objective',
] as const;
export type TopicSelectionResearchArenaDeltaType =
  (typeof TOPIC_SELECTION_RESEARCH_ARENA_DELTA_TYPES)[number];

export const TOPIC_SELECTION_RESEARCH_ARENA_PASS_KINDS = [
  'first_pass',
  'supplemental',
  'synthesis',
] as const;
export type TopicSelectionResearchArenaPassKind =
  (typeof TOPIC_SELECTION_RESEARCH_ARENA_PASS_KINDS)[number];

export interface TopicSelectionResearchArenaLoopDeltaRef {
  delta_type: TopicSelectionResearchArenaDeltaType;
  ref: TopicSelectionFunctionalRef;
  rationale: string;
}

export interface TopicSelectionResearchArenaSessionRecord {
  schema_version: 'TopicSelectionResearchArenaSession@v1';
  arena_session_id: string;
  session_key: string;
  current_arena_key: string | null;
  workspace_id: string | null;
  title_card_id: string;
  arena_kind: TopicSelectionResearchArenaKind;
  target_ref: TopicSelectionFunctionalRef;
  input_snapshot_id: string;
  input_snapshot_hash: string;
  participant_plan_hash: string;
  participant_roles: TopicSelectionResearchArenaParticipantRole[];
  execution_plan_ref: TopicSelectionFunctionalRef;
  status: TopicSelectionResearchArenaStatus;
  termination_reason: TopicSelectionResearchArenaTerminationReason | null;
  loop_transcript_ref: TopicSelectionFunctionalRef | null;
  loop_transcript_hash: string | null;
  loop_delta_refs: TopicSelectionResearchArenaLoopDeltaRef[];
  support_only: true;
  supersedes_arena_session_id: string | null;
  superseded_by_arena_session_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  synthesized_at: string | null;
  superseded_at: string | null;
}

export interface TopicSelectionResearchRetrievalHitProvenance {
  literature_ref: TopicSelectionFunctionalRef;
  embedding_version_id: string;
  chunk_id: string;
  chunk_hash: string;
  rank: number;
  hybrid_score: number;
  vector_score: number;
  lexical_score: number;
  is_stale: boolean;
}

export interface TopicSelectionResearchRetrievalProvenance {
  participant_role: TopicSelectionResearchArenaParticipantRole;
  query_intent: TopicSelectionResearchEvidenceQueryIntent;
  search_run_ref: TopicSelectionFunctionalRef;
  hits: TopicSelectionResearchRetrievalHitProvenance[];
  provenance_hash: string;
}

export const TOPIC_SELECTION_RESEARCH_ARENA_ROLE_EVIDENCE_PREPARATION_STATUSES = [
  'ready',
  'no_retrieval_hits',
  'requires_evidence_materialization',
] as const;
export type TopicSelectionResearchArenaRoleEvidencePreparationStatus =
  (typeof TOPIC_SELECTION_RESEARCH_ARENA_ROLE_EVIDENCE_PREPARATION_STATUSES)[number];

export interface TopicSelectionResearchArenaRoleEvidencePreparationRequest {
  schema_version: 'TopicSelectionResearchArenaRoleEvidencePreparationRequest@v1';
  workspace_id?: string | null;
  title_card_id: string;
  arena_input_snapshot_id: string;
  participant_role: TopicSelectionResearchArenaParticipantRole;
  query_intent: TopicSelectionResearchEvidenceQueryIntent;
  search_plan_id: string;
  literature_snapshot_id: string;
  coverage_row_intent_id: string;
  top_k?: number;
  evidence_per_literature?: number;
}

export interface TopicSelectionResearchArenaRoleEvidencePreparation {
  schema_version: 'TopicSelectionResearchArenaRoleEvidencePreparation@v1';
  status: TopicSelectionResearchArenaRoleEvidencePreparationStatus;
  title_card_id: string;
  participant_role: TopicSelectionResearchArenaParticipantRole;
  query_intent: TopicSelectionResearchEvidenceQueryIntent;
  evidence_map_ref: TopicSelectionFunctionalRef;
  search_run_ref: TopicSelectionFunctionalRef;
  retrieval_provenance: TopicSelectionResearchRetrievalProvenance | null;
  selected_evidence_unit_refs: TopicSelectionFunctionalRef[];
  unresolved_literature_refs: TopicSelectionFunctionalRef[];
  evidence_packet_artifact_ref: TopicSelectionFunctionalRef | null;
  evidence_packet_hash: string | null;
}

export const TOPIC_SELECTION_RESEARCH_ARENA_SHADOW_ROLES = [
  'opportunity_scout',
  'prior_art_topic_killer',
] as const;
export type TopicSelectionResearchArenaShadowRole =
  (typeof TOPIC_SELECTION_RESEARCH_ARENA_SHADOW_ROLES)[number];

export const TOPIC_SELECTION_RESEARCH_ARENA_FINDING_SEVERITIES = [
  'informational',
  'material',
  'critical',
] as const;
export type TopicSelectionResearchArenaFindingSeverity =
  (typeof TOPIC_SELECTION_RESEARCH_ARENA_FINDING_SEVERITIES)[number];

export interface TopicSelectionResearchArenaCandidateReview {
  candidate_ref: TopicSelectionFunctionalRef;
  recommended_disposition: TopicSelectionCandidatePortfolioDispositionKind;
  rationale: string;
  evidence_unit_refs: TopicSelectionFunctionalRef[];
  drop_reason_code: TopicSelectionCandidateDropReasonCode | null;
  reopening_conditions: string[];
}

export interface TopicSelectionResearchArenaFinding {
  finding_id: string;
  kind: string;
  severity: TopicSelectionResearchArenaFindingSeverity;
  statement: string;
  evidence_unit_refs: TopicSelectionFunctionalRef[];
  literature_refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionResearchArenaCandidateProposal {
  proposal_key: string;
  semantic_group_key: string;
  title: string;
  research_object: string;
  mechanism: string;
  expected_contribution: string;
  falsification_condition: string;
  evidence_unit_refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionResearchArenaMinorityReport {
  statement: string;
  evidence_unit_refs: TopicSelectionFunctionalRef[];
  literature_refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionResearchArenaRoleOutput {
  schema_version: 'TopicSelectionResearchArenaRoleOutput@v1';
  participant_role: TopicSelectionResearchArenaShadowRole;
  semantic_position: {
    recommended_set_outcome: TopicSelectionCandidatePortfolioOutcome;
    summary: string;
    confidence: number;
  };
  candidate_reviews: TopicSelectionResearchArenaCandidateReview[];
  findings: TopicSelectionResearchArenaFinding[];
  new_candidate_proposals: TopicSelectionResearchArenaCandidateProposal[];
  concessions: string[];
  unresolved_minority_report: TopicSelectionResearchArenaMinorityReport | null;
}

export interface TopicSelectionResearchArenaShadowRoleInput {
  role_slot_id: string;
  participant_role: TopicSelectionResearchArenaShadowRole;
  evidence_preparation: TopicSelectionResearchArenaRoleEvidencePreparation;
  structured_output: TopicSelectionResearchArenaRoleOutput;
  fixture_id: string | null;
  operator_label: string | null;
}

export interface TopicSelectionResearchArenaShadowRunRequest {
  schema_version: 'TopicSelectionResearchArenaShadowRunRequest@v1';
  arena_session_id: string;
  workflow_run_id: string;
  node_attempt_id: string;
  execution_mode: 'mocked_llm' | 'codex_assisted';
  candidate_refs: TopicSelectionFunctionalRef[];
  role_inputs: TopicSelectionResearchArenaShadowRoleInput[];
}

export interface TopicSelectionResearchArenaAdvisoryCandidateDisposition {
  candidate_ref: TopicSelectionFunctionalRef;
  disposition: TopicSelectionCandidatePortfolioDispositionKind;
  rationale: string;
  drop_reason_code: TopicSelectionCandidateDropReasonCode | null;
  reopening_conditions: string[];
  role_positions: Array<{
    participant_role: TopicSelectionResearchArenaShadowRole;
    recommended_disposition: TopicSelectionCandidatePortfolioDispositionKind;
  }>;
}

export interface TopicSelectionResearchArenaAdvisorySynthesis {
  schema_version: 'TopicSelectionResearchArenaAdvisorySynthesis@v1';
  outcome: TopicSelectionCandidatePortfolioOutcome;
  summary: string;
  candidate_dispositions: TopicSelectionResearchArenaAdvisoryCandidateDisposition[];
  preserved_finding_ids: string[];
  unresolved_dissent: string[];
  required_next_delta: TopicSelectionResearchArenaDeltaType | null;
  support_only: true;
}

export interface TopicSelectionResearchArenaExecutionAccounting {
  non_provider_role_invocation_count: number;
  provider_call_count: 0;
  retrieval_run_count: number;
  retrieval_hit_count: number;
  evidence_excerpt_chars: number;
  duration_ms: number;
}

export interface TopicSelectionResearchArenaShadowRunResponse {
  schema_version: 'TopicSelectionResearchArenaShadowRunResponse@v1';
  arena_session: TopicSelectionResearchArenaSessionRecord;
  role_executions: TopicSelectionResearchArenaRoleExecutionRecord[];
  synthesis_artifact_ref: TopicSelectionFunctionalRef;
  synthesis_artifact_hash: string;
  advisory_synthesis: TopicSelectionResearchArenaAdvisorySynthesis;
  execution_accounting: TopicSelectionResearchArenaExecutionAccounting;
  support_only: true;
}

export interface TopicSelectionResearchArenaRoleExecutionRecord {
  schema_version: 'TopicSelectionResearchArenaRoleExecution@v1';
  arena_role_execution_id: string;
  arena_session_id: string;
  title_card_id: string;
  role_slot_id: string;
  instance_index: number;
  participant_role: TopicSelectionResearchArenaParticipantRole;
  pass_kind: TopicSelectionResearchArenaPassKind;
  input_snapshot_id: string;
  input_snapshot_hash: string;
  query_intent: TopicSelectionResearchEvidenceQueryIntent;
  evidence_packet_artifact_ref: TopicSelectionFunctionalRef;
  evidence_packet_hash: string;
  evidence_partition_refs: TopicSelectionFunctionalRef[];
  retrieval_provenance: TopicSelectionResearchRetrievalProvenance;
  exposure_artifact_refs: TopicSelectionFunctionalRef[];
  exposure_set_hash: string;
  output_artifact_ref: TopicSelectionFunctionalRef;
  output_artifact_hash: string;
  semantic_position_hash: string;
  prior_role_hashes: string[];
  runtime_identity_hash: string;
  created_at: string;
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const hashString = { type: 'string', pattern: '^[a-f0-9]{64}$' } as const;
const stringArray = { type: 'array', items: stringId } as const;

export const topicSelectionResearchEvidenceQueryIntentSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['intent_type', 'query', 'rationale', 'target_claim'],
  properties: {
    intent_type: { enum: [...TOPIC_SELECTION_COVERAGE_INTENT_TYPES] },
    query: stringId,
    rationale: stringId,
    target_claim: stringId,
  },
} as const;

export const topicSelectionResearchEvidencePacketRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'title_card_id',
    'participant_role',
    'query_intent',
    'evidence_unit_refs',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionResearchEvidencePacketRequest@v1' },
    title_card_id: stringId,
    participant_role: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_PARTICIPANT_ROLES] },
    query_intent: topicSelectionResearchEvidenceQueryIntentSchema,
    evidence_unit_refs: {
      type: 'array',
      items: topicSelectionFunctionalRefSchema,
      minItems: 1,
      maxItems: 12,
      uniqueItems: true,
    },
  },
} as const;

export const topicSelectionResearchResolvedEvidenceLocatorSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'locator_type',
    'literature_id',
    'document_id',
    'content_row_id',
    'parser_ref_id',
    'checksum',
  ],
  properties: {
    locator_type: { enum: [...TOPIC_SELECTION_EVIDENCE_LOCATOR_TYPES] },
    literature_id: stringId,
    document_id: nullableStringId,
    content_row_id: stringId,
    parser_ref_id: stringId,
    checksum: nullableStringId,
  },
} as const;

export const topicSelectionResearchEvidencePacketItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'evidence_unit_ref',
    'evidence_map_ref',
    'literature_ref',
    'evidence_role',
    'relation_to_target_claim',
    'source_statement',
    'resolved_excerpt',
    'excerpt_hash',
    'resolved_locator',
    'freshness',
    'quote_integrity',
    'issue_codes',
  ],
  properties: {
    evidence_unit_ref: topicSelectionFunctionalRefSchema,
    evidence_map_ref: topicSelectionFunctionalRefSchema,
    literature_ref: topicSelectionFunctionalRefSchema,
    evidence_role: { enum: TOPIC_SELECTION_EVIDENCE_ROLES.filter((role) => role !== 'unknown') },
    relation_to_target_claim: { enum: [...TOPIC_SELECTION_RESEARCH_EVIDENCE_RELATIONS] },
    source_statement: stringId,
    resolved_excerpt: stringId,
    excerpt_hash: hashString,
    resolved_locator: topicSelectionResearchResolvedEvidenceLocatorSchema,
    freshness: {
      type: 'object',
      additionalProperties: false,
      required: ['status', 'retrieval_readiness_reason'],
      properties: {
        status: { const: 'current' },
        retrieval_readiness_reason: stringId,
      },
    },
    quote_integrity: { enum: ['exact_match', 'normalized_match'] },
    issue_codes: stringArray,
  },
} as const;

export const topicSelectionResearchEvidencePacketSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'title_card_id',
    'participant_role',
    'query_intent',
    'items',
    'source_refs',
    'total_excerpt_chars',
    'packet_hash',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionResearchEvidencePacket@v1' },
    title_card_id: stringId,
    participant_role: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_PARTICIPANT_ROLES] },
    query_intent: topicSelectionResearchEvidenceQueryIntentSchema,
    items: {
      type: 'array',
      items: topicSelectionResearchEvidencePacketItemSchema,
      minItems: 1,
      maxItems: 12,
    },
    source_refs: { type: 'array', items: topicSelectionFunctionalRefSchema, minItems: 1 },
    total_excerpt_chars: { type: 'integer', minimum: 1, maximum: 96000 },
    packet_hash: hashString,
  },
} as const;

const timestamp = { type: 'string', format: 'date-time' } as const;
const nullableHash = { anyOf: [hashString, { type: 'null' }] } as const;

export const topicSelectionResearchArenaLoopDeltaRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['delta_type', 'ref', 'rationale'],
  properties: {
    delta_type: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_DELTA_TYPES] },
    ref: topicSelectionFunctionalRefSchema,
    rationale: stringId,
  },
} as const;

export const topicSelectionResearchArenaSessionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version', 'arena_session_id', 'session_key', 'current_arena_key', 'workspace_id',
    'title_card_id', 'arena_kind', 'target_ref', 'input_snapshot_id', 'input_snapshot_hash',
    'participant_plan_hash', 'participant_roles', 'execution_plan_ref', 'status',
    'termination_reason', 'loop_transcript_ref', 'loop_transcript_hash', 'loop_delta_refs', 'support_only',
    'supersedes_arena_session_id', 'superseded_by_arena_session_id', 'created_by',
    'created_at', 'updated_at', 'synthesized_at', 'superseded_at',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionResearchArenaSession@v1' },
    arena_session_id: stringId,
    session_key: stringId,
    current_arena_key: nullableStringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    arena_kind: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_KINDS] },
    target_ref: topicSelectionFunctionalRefSchema,
    input_snapshot_id: stringId,
    input_snapshot_hash: hashString,
    participant_plan_hash: hashString,
    participant_roles: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_PARTICIPANT_ROLES] },
      minItems: 2,
      maxItems: 4,
      uniqueItems: true,
    },
    execution_plan_ref: topicSelectionFunctionalRefSchema,
    status: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_STATUSES] },
    termination_reason: {
      anyOf: [{ enum: [...TOPIC_SELECTION_RESEARCH_ARENA_TERMINATION_REASONS] }, { type: 'null' }],
    },
    loop_transcript_ref: {
      anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }],
    },
    loop_transcript_hash: nullableHash,
    loop_delta_refs: { type: 'array', items: topicSelectionResearchArenaLoopDeltaRefSchema },
    support_only: { const: true },
    supersedes_arena_session_id: nullableStringId,
    superseded_by_arena_session_id: nullableStringId,
    created_by: stringId,
    created_at: timestamp,
    updated_at: timestamp,
    synthesized_at: { anyOf: [timestamp, { type: 'null' }] },
    superseded_at: { anyOf: [timestamp, { type: 'null' }] },
  },
} as const;

export const topicSelectionResearchRetrievalHitProvenanceSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'literature_ref', 'embedding_version_id', 'chunk_id', 'chunk_hash', 'rank',
    'hybrid_score', 'vector_score', 'lexical_score', 'is_stale',
  ],
  properties: {
    literature_ref: topicSelectionFunctionalRefSchema,
    embedding_version_id: stringId,
    chunk_id: stringId,
    chunk_hash: hashString,
    rank: { type: 'integer', minimum: 1 },
    hybrid_score: { type: 'number', minimum: 0, maximum: 1 },
    vector_score: { type: 'number', minimum: 0, maximum: 1 },
    lexical_score: { type: 'number', minimum: 0, maximum: 1 },
    is_stale: { type: 'boolean' },
  },
} as const;

export const topicSelectionResearchRetrievalProvenanceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['participant_role', 'query_intent', 'search_run_ref', 'hits', 'provenance_hash'],
  properties: {
    participant_role: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_PARTICIPANT_ROLES] },
    query_intent: topicSelectionResearchEvidenceQueryIntentSchema,
    search_run_ref: topicSelectionFunctionalRefSchema,
    hits: {
      type: 'array',
      items: topicSelectionResearchRetrievalHitProvenanceSchema,
      minItems: 1,
      maxItems: 60,
    },
    provenance_hash: hashString,
  },
} as const;

export const topicSelectionResearchArenaRoleEvidencePreparationRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version', 'title_card_id', 'arena_input_snapshot_id', 'participant_role',
    'query_intent', 'search_plan_id', 'literature_snapshot_id', 'coverage_row_intent_id',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionResearchArenaRoleEvidencePreparationRequest@v1' },
    workspace_id: nullableStringId,
    title_card_id: stringId,
    arena_input_snapshot_id: stringId,
    participant_role: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_PARTICIPANT_ROLES] },
    query_intent: topicSelectionResearchEvidenceQueryIntentSchema,
    search_plan_id: stringId,
    literature_snapshot_id: stringId,
    coverage_row_intent_id: stringId,
    top_k: { type: 'integer', minimum: 1, maximum: 12 },
    evidence_per_literature: { type: 'integer', minimum: 1, maximum: 5 },
  },
} as const;

export const topicSelectionResearchArenaRoleEvidencePreparationSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version', 'status', 'title_card_id', 'participant_role', 'query_intent',
    'evidence_map_ref', 'search_run_ref', 'retrieval_provenance',
    'selected_evidence_unit_refs', 'unresolved_literature_refs',
    'evidence_packet_artifact_ref', 'evidence_packet_hash',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionResearchArenaRoleEvidencePreparation@v1' },
    status: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_ROLE_EVIDENCE_PREPARATION_STATUSES] },
    title_card_id: stringId,
    participant_role: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_PARTICIPANT_ROLES] },
    query_intent: topicSelectionResearchEvidenceQueryIntentSchema,
    evidence_map_ref: topicSelectionFunctionalRefSchema,
    search_run_ref: topicSelectionFunctionalRefSchema,
    retrieval_provenance: {
      anyOf: [topicSelectionResearchRetrievalProvenanceSchema, { type: 'null' }],
    },
    selected_evidence_unit_refs: {
      type: 'array',
      items: topicSelectionFunctionalRefSchema,
      maxItems: 12,
      uniqueItems: true,
    },
    unresolved_literature_refs: {
      type: 'array',
      items: topicSelectionFunctionalRefSchema,
      maxItems: 12,
      uniqueItems: true,
    },
    evidence_packet_artifact_ref: {
      anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }],
    },
    evidence_packet_hash: nullableHash,
  },
} as const;

const topicSelectionResearchArenaSemanticPositionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['recommended_set_outcome', 'summary', 'confidence'],
  properties: {
    recommended_set_outcome: { enum: [...TOPIC_SELECTION_CANDIDATE_PORTFOLIO_OUTCOMES] },
    summary: stringId,
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
} as const;

const topicSelectionResearchArenaCandidateReviewSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'candidate_ref', 'recommended_disposition', 'rationale', 'evidence_unit_refs',
    'drop_reason_code', 'reopening_conditions',
  ],
  properties: {
    candidate_ref: topicSelectionFunctionalRefSchema,
    recommended_disposition: { enum: [...TOPIC_SELECTION_CANDIDATE_PORTFOLIO_DISPOSITIONS] },
    rationale: stringId,
    evidence_unit_refs: {
      type: 'array',
      items: topicSelectionFunctionalRefSchema,
      minItems: 1,
      maxItems: 12,
      uniqueItems: true,
    },
    drop_reason_code: {
      anyOf: [{ enum: [...TOPIC_SELECTION_CANDIDATE_DROP_REASON_CODES] }, { type: 'null' }],
    },
    reopening_conditions: { type: 'array', items: stringId, maxItems: 12 },
  },
} as const;

const topicSelectionResearchArenaFindingSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'finding_id', 'kind', 'severity', 'statement', 'evidence_unit_refs', 'literature_refs',
  ],
  properties: {
    finding_id: stringId,
    kind: stringId,
    severity: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_FINDING_SEVERITIES] },
    statement: stringId,
    evidence_unit_refs: {
      type: 'array', items: topicSelectionFunctionalRefSchema, minItems: 1, maxItems: 12, uniqueItems: true,
    },
    literature_refs: {
      type: 'array', items: topicSelectionFunctionalRefSchema, minItems: 1, maxItems: 12, uniqueItems: true,
    },
  },
} as const;

const topicSelectionResearchArenaCandidateProposalSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'proposal_key', 'semantic_group_key', 'title', 'research_object', 'mechanism',
    'expected_contribution', 'falsification_condition', 'evidence_unit_refs',
  ],
  properties: {
    proposal_key: stringId,
    semantic_group_key: stringId,
    title: stringId,
    research_object: stringId,
    mechanism: stringId,
    expected_contribution: stringId,
    falsification_condition: stringId,
    evidence_unit_refs: {
      type: 'array', items: topicSelectionFunctionalRefSchema, minItems: 1, maxItems: 12, uniqueItems: true,
    },
  },
} as const;

const topicSelectionResearchArenaMinorityReportSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['statement', 'evidence_unit_refs', 'literature_refs'],
  properties: {
    statement: stringId,
    evidence_unit_refs: {
      type: 'array', items: topicSelectionFunctionalRefSchema, minItems: 1, maxItems: 12, uniqueItems: true,
    },
    literature_refs: {
      type: 'array', items: topicSelectionFunctionalRefSchema, minItems: 1, maxItems: 12, uniqueItems: true,
    },
  },
} as const;

export const topicSelectionResearchArenaRoleOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version', 'participant_role', 'semantic_position', 'candidate_reviews',
    'findings', 'new_candidate_proposals', 'concessions', 'unresolved_minority_report',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionResearchArenaRoleOutput@v1' },
    participant_role: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_SHADOW_ROLES] },
    semantic_position: topicSelectionResearchArenaSemanticPositionSchema,
    candidate_reviews: {
      type: 'array', items: topicSelectionResearchArenaCandidateReviewSchema, minItems: 1, maxItems: 12,
    },
    findings: {
      type: 'array', items: topicSelectionResearchArenaFindingSchema, maxItems: 24,
    },
    new_candidate_proposals: {
      type: 'array', items: topicSelectionResearchArenaCandidateProposalSchema, maxItems: 6,
    },
    concessions: { type: 'array', items: stringId, maxItems: 12 },
    unresolved_minority_report: {
      anyOf: [topicSelectionResearchArenaMinorityReportSchema, { type: 'null' }],
    },
  },
} as const;

const topicSelectionResearchArenaShadowRoleInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'role_slot_id', 'participant_role', 'evidence_preparation', 'structured_output',
    'fixture_id', 'operator_label',
  ],
  properties: {
    role_slot_id: stringId,
    participant_role: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_SHADOW_ROLES] },
    evidence_preparation: topicSelectionResearchArenaRoleEvidencePreparationSchema,
    structured_output: topicSelectionResearchArenaRoleOutputSchema,
    fixture_id: nullableStringId,
    operator_label: nullableStringId,
  },
} as const;

export const topicSelectionResearchArenaShadowRunRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version', 'arena_session_id', 'workflow_run_id', 'node_attempt_id',
    'execution_mode', 'candidate_refs', 'role_inputs',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionResearchArenaShadowRunRequest@v1' },
    arena_session_id: stringId,
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    execution_mode: { enum: ['mocked_llm', 'codex_assisted'] },
    candidate_refs: {
      type: 'array', items: topicSelectionFunctionalRefSchema, minItems: 1, maxItems: 12, uniqueItems: true,
    },
    role_inputs: {
      type: 'array', items: topicSelectionResearchArenaShadowRoleInputSchema, minItems: 2, maxItems: 2,
    },
  },
} as const;

const topicSelectionResearchArenaAdvisorySynthesisSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version', 'outcome', 'summary', 'candidate_dispositions',
    'preserved_finding_ids', 'unresolved_dissent', 'required_next_delta', 'support_only',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionResearchArenaAdvisorySynthesis@v1' },
    outcome: { enum: [...TOPIC_SELECTION_CANDIDATE_PORTFOLIO_OUTCOMES] },
    summary: stringId,
    candidate_dispositions: {
      type: 'array',
      minItems: 1,
      maxItems: 12,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'candidate_ref', 'disposition', 'rationale', 'drop_reason_code',
          'reopening_conditions', 'role_positions',
        ],
        properties: {
          candidate_ref: topicSelectionFunctionalRefSchema,
          disposition: { enum: [...TOPIC_SELECTION_CANDIDATE_PORTFOLIO_DISPOSITIONS] },
          rationale: stringId,
          drop_reason_code: {
            anyOf: [{ enum: [...TOPIC_SELECTION_CANDIDATE_DROP_REASON_CODES] }, { type: 'null' }],
          },
          reopening_conditions: { type: 'array', items: stringId, maxItems: 12 },
          role_positions: {
            type: 'array',
            minItems: 2,
            maxItems: 2,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['participant_role', 'recommended_disposition'],
              properties: {
                participant_role: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_SHADOW_ROLES] },
                recommended_disposition: { enum: [...TOPIC_SELECTION_CANDIDATE_PORTFOLIO_DISPOSITIONS] },
              },
            },
          },
        },
      },
    },
    preserved_finding_ids: { type: 'array', items: stringId, maxItems: 48, uniqueItems: true },
    unresolved_dissent: { type: 'array', items: stringId, maxItems: 24 },
    required_next_delta: {
      anyOf: [{ enum: [...TOPIC_SELECTION_RESEARCH_ARENA_DELTA_TYPES] }, { type: 'null' }],
    },
    support_only: { const: true },
  },
} as const;

const topicSelectionResearchArenaExecutionAccountingSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'non_provider_role_invocation_count', 'provider_call_count', 'retrieval_run_count',
    'retrieval_hit_count', 'evidence_excerpt_chars', 'duration_ms',
  ],
  properties: {
    non_provider_role_invocation_count: { type: 'integer', minimum: 0 },
    provider_call_count: { const: 0 },
    retrieval_run_count: { type: 'integer', minimum: 0 },
    retrieval_hit_count: { type: 'integer', minimum: 0 },
    evidence_excerpt_chars: { type: 'integer', minimum: 0 },
    duration_ms: { type: 'integer', minimum: 0 },
  },
} as const;

export const topicSelectionResearchArenaRoleExecutionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version', 'arena_role_execution_id', 'arena_session_id', 'title_card_id',
    'role_slot_id', 'instance_index', 'participant_role', 'pass_kind', 'input_snapshot_id',
    'input_snapshot_hash', 'query_intent', 'evidence_packet_artifact_ref',
    'evidence_packet_hash', 'evidence_partition_refs', 'retrieval_provenance',
    'exposure_artifact_refs', 'exposure_set_hash', 'output_artifact_ref',
    'output_artifact_hash', 'semantic_position_hash', 'prior_role_hashes',
    'runtime_identity_hash', 'created_at',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionResearchArenaRoleExecution@v1' },
    arena_role_execution_id: stringId,
    arena_session_id: stringId,
    title_card_id: stringId,
    role_slot_id: stringId,
    instance_index: { type: 'integer', minimum: 0 },
    participant_role: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_PARTICIPANT_ROLES] },
    pass_kind: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_PASS_KINDS] },
    input_snapshot_id: stringId,
    input_snapshot_hash: hashString,
    query_intent: topicSelectionResearchEvidenceQueryIntentSchema,
    evidence_packet_artifact_ref: topicSelectionFunctionalRefSchema,
    evidence_packet_hash: hashString,
    evidence_partition_refs: { type: 'array', items: topicSelectionFunctionalRefSchema, minItems: 1 },
    retrieval_provenance: topicSelectionResearchRetrievalProvenanceSchema,
    exposure_artifact_refs: { type: 'array', items: topicSelectionFunctionalRefSchema, minItems: 1 },
    exposure_set_hash: hashString,
    output_artifact_ref: topicSelectionFunctionalRefSchema,
    output_artifact_hash: hashString,
    semantic_position_hash: hashString,
    prior_role_hashes: { type: 'array', items: hashString },
    runtime_identity_hash: hashString,
    created_at: timestamp,
  },
} as const;

export const topicSelectionResearchArenaShadowRunResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version', 'arena_session', 'role_executions', 'synthesis_artifact_ref',
    'synthesis_artifact_hash', 'advisory_synthesis', 'execution_accounting', 'support_only',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionResearchArenaShadowRunResponse@v1' },
    arena_session: topicSelectionResearchArenaSessionSchema,
    role_executions: {
      type: 'array', items: topicSelectionResearchArenaRoleExecutionSchema, minItems: 2, maxItems: 2,
    },
    synthesis_artifact_ref: topicSelectionFunctionalRefSchema,
    synthesis_artifact_hash: hashString,
    advisory_synthesis: topicSelectionResearchArenaAdvisorySynthesisSchema,
    execution_accounting: topicSelectionResearchArenaExecutionAccountingSchema,
    support_only: { const: true },
  },
} as const;
