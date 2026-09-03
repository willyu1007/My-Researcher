import {
  topicSelectionFunctionalRefSchema,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';

export const TOPIC_SELECTION_EVIDENCE_CONVERGENCE_RETRIEVAL_REQUEST_SCHEMA_VERSION =
  'TopicSelectionEvidenceConvergenceRetrievalRequest@v1' as const;
export const TOPIC_SELECTION_EVIDENCE_DELTA_SCHEMA_VERSION = 'TopicSelectionEvidenceDelta@v1' as const;
export const TOPIC_SELECTION_RESOLUTION_ROUTE_SCHEMA_VERSION = 'TopicSelectionResolutionRoute@v1' as const;
export const TOPIC_SELECTION_EVIDENCE_CONVERGENCE_ROUND_LINK_SCHEMA_VERSION =
  'TopicSelectionEvidenceConvergenceRoundLink@v1' as const;
export const TOPIC_SELECTION_EVIDENCE_CONVERGENCE_CLAIM_ADMISSION_SCHEMA_VERSION =
  'TopicSelectionEvidenceConvergenceClaimAdmission@v1' as const;

export const TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY = Object.freeze({
  schema_version: 'TopicSelectionEvidenceConvergenceExecutionPolicy@v1' as const,
  policy_key: 'evidence-landscape-convergence.v1',
  max_orchestration_steps_per_issue: 8,
  max_linked_rounds_per_issue: 4,
  max_elapsed_ms_per_issue: 300_000,
  max_accumulated_cost_microusd_per_issue: 1_000_000,
});

export type TopicSelectionEvidenceConvergenceExecutionPolicy =
  typeof TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY;

export const TOPIC_SELECTION_EVIDENCE_CONVERGENCE_RETRIEVAL_PARAMETERS = Object.freeze({
  profile: 'topic_exploration' as const,
  top_k: 10,
  evidence_per_literature: 3,
  include_stale: false,
});

export type TopicSelectionEvidenceConvergenceRetrievalParameters =
  typeof TOPIC_SELECTION_EVIDENCE_CONVERGENCE_RETRIEVAL_PARAMETERS;

/** Role-authored intent. Coordinator-owned request and strategy keys are deliberately absent. */
export interface TopicSelectionEvidenceConvergenceRetrievalRequestIntent {
  issue_ref: TopicSelectionFunctionalRef;
  originating_arena_session_ref: TopicSelectionFunctionalRef;
  search_intent: string;
  candidate_queries: string[];
  expected_decision_effect: string;
  corpus_manifest_ref: TopicSelectionFunctionalRef;
  corpus_manifest_hash: string;
}

export interface TopicSelectionEvidenceConvergenceStrategyIdentityPayload {
  search_intent: string;
  candidate_queries: string[];
  corpus_manifest_ref: TopicSelectionFunctionalRef;
  corpus_manifest_hash: string;
  retrieval_parameters: TopicSelectionEvidenceConvergenceRetrievalParameters;
}

export interface TopicSelectionEvidenceConvergenceRequestIdentityPayload {
  issue_ref: TopicSelectionFunctionalRef;
  originating_arena_session_ref: TopicSelectionFunctionalRef;
  expected_decision_effect: string;
  strategy_identity_payload: TopicSelectionEvidenceConvergenceStrategyIdentityPayload;
}

export interface TopicSelectionEvidenceConvergenceCanonicalRequest {
  strategy_identity_payload: TopicSelectionEvidenceConvergenceStrategyIdentityPayload;
  request_identity_payload: TopicSelectionEvidenceConvergenceRequestIdentityPayload;
}

export interface TopicSelectionEvidenceConvergenceRetrievalRequestRecord
  extends TopicSelectionEvidenceConvergenceRetrievalRequestIntent {
  schema_version: typeof TOPIC_SELECTION_EVIDENCE_CONVERGENCE_RETRIEVAL_REQUEST_SCHEMA_VERSION;
  request_key: string;
  strategy_key: string;
  execution_policy: TopicSelectionEvidenceConvergenceExecutionPolicy;
  resulting_search_run_ref: TopicSelectionFunctionalRef | null;
  supporting_artifact_refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionEvidenceDeltaArtifact {
  schema_version: typeof TOPIC_SELECTION_EVIDENCE_DELTA_SCHEMA_VERSION;
  issue_refs: TopicSelectionFunctionalRef[];
  predecessor_evidence_map_ref: TopicSelectionFunctionalRef;
  admitted_evidence_unit_refs: TopicSelectionFunctionalRef[];
  changed_claim_refs: TopicSelectionFunctionalRef[];
  negative_coverage_changes: TopicSelectionFunctionalRef[];
  source_health_changes: TopicSelectionFunctionalRef[];
  conflict_changes: TopicSelectionFunctionalRef[];
  decision_relevance: string;
  material: boolean;
}

/** A claim admitted only from one exact, already-persisted retrieval hit. */
export interface TopicSelectionEvidenceConvergenceClaimAdmission {
  schema_version: typeof TOPIC_SELECTION_EVIDENCE_CONVERGENCE_CLAIM_ADMISSION_SCHEMA_VERSION;
  request_ref: TopicSelectionFunctionalRef;
  search_run_ref: TopicSelectionFunctionalRef;
  query: string;
  literature_ref: TopicSelectionFunctionalRef;
  chunk_ref: TopicSelectionFunctionalRef;
  chunk_hash: string;
  evidence_role: 'support' | 'challenge' | 'baseline' | 'context';
  source_statement: string;
  normalized_statement: string | null;
  interpretation_payload: Record<string, unknown>;
  extraction_confidence: number | null;
}

export const TOPIC_SELECTION_RESOLUTION_ROUTE_KINDS = ['retrieve_and_recheck'] as const;
export type TopicSelectionResolutionRouteKind = (typeof TOPIC_SELECTION_RESOLUTION_ROUTE_KINDS)[number];

export interface TopicSelectionResolutionRouteArtifact {
  schema_version: typeof TOPIC_SELECTION_RESOLUTION_ROUTE_SCHEMA_VERSION;
  issue_ref: TopicSelectionFunctionalRef;
  owning_stage: 'evidence_landscape';
  route_kind: TopicSelectionResolutionRouteKind;
  target_ref: TopicSelectionFunctionalRef;
  required_delta: string;
  recheck_gate_key: string;
  authority_boundary: 'deterministic_gate_then_strict_human';
}

export interface TopicSelectionEvidenceConvergenceRoundLink {
  schema_version: typeof TOPIC_SELECTION_EVIDENCE_CONVERGENCE_ROUND_LINK_SCHEMA_VERSION;
  arena_session_ref: TopicSelectionFunctionalRef;
  supersedes_arena_session_ref: TopicSelectionFunctionalRef;
  parent_transcript_hash: string;
  evidence_delta_ref: TopicSelectionFunctionalRef;
  evidence_delta_hash: string;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US');
}

function normalizeRef(ref: TopicSelectionFunctionalRef): TopicSelectionFunctionalRef {
  const versionId = ref.version_id?.trim();
  const titleCardId = ref.title_card_id?.trim();
  return {
    ref_type: ref.ref_type.trim(),
    ref_id: ref.ref_id.trim(),
    ...(versionId ? { version_id: versionId } : {}),
    ...(titleCardId ? { title_card_id: titleCardId } : {}),
  };
}

export function canonicalizeEvidenceConvergenceRequest(
  input: TopicSelectionEvidenceConvergenceRetrievalRequestIntent,
): TopicSelectionEvidenceConvergenceCanonicalRequest {
  const strategyIdentityPayload: TopicSelectionEvidenceConvergenceStrategyIdentityPayload = {
    search_intent: normalizeText(input.search_intent),
    candidate_queries: [...new Set(input.candidate_queries.map(normalizeText).filter(Boolean))].sort(),
    corpus_manifest_ref: normalizeRef(input.corpus_manifest_ref),
    corpus_manifest_hash: input.corpus_manifest_hash.trim(),
    retrieval_parameters: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_RETRIEVAL_PARAMETERS,
  };
  return {
    strategy_identity_payload: strategyIdentityPayload,
    request_identity_payload: {
      issue_ref: normalizeRef(input.issue_ref),
      originating_arena_session_ref: normalizeRef(input.originating_arena_session_ref),
      expected_decision_effect: normalizeText(input.expected_decision_effect),
      strategy_identity_payload: strategyIdentityPayload,
    },
  };
}

export type TopicSelectionEvidenceConvergenceBoundaryDisposition =
  | 'continue'
  | 'material_delta_ready'
  | 'saturated_unresolved'
  | 'boundary_exhausted_unresolved';

export interface TopicSelectionEvidenceConvergenceBoundaryInput {
  policy: TopicSelectionEvidenceConvergenceExecutionPolicy;
  orchestration_steps: number;
  linked_rounds: number;
  elapsed_ms: number;
  accumulated_cost_microusd: number;
  execution_completed: boolean;
  material_delta: boolean;
  strategy_changed: boolean;
}

export interface TopicSelectionEvidenceConvergenceBoundaryResult {
  disposition: TopicSelectionEvidenceConvergenceBoundaryDisposition;
  reason_codes: string[];
}

export function evaluateEvidenceConvergenceBoundary(
  input: TopicSelectionEvidenceConvergenceBoundaryInput,
): TopicSelectionEvidenceConvergenceBoundaryResult {
  const exhaustedReasons = [
    ...(input.orchestration_steps >= input.policy.max_orchestration_steps_per_issue
      ? ['MAX_ORCHESTRATION_STEPS_EXHAUSTED']
      : []),
    ...(input.linked_rounds >= input.policy.max_linked_rounds_per_issue
      ? ['MAX_LINKED_ROUNDS_EXHAUSTED']
      : []),
    ...(input.elapsed_ms >= input.policy.max_elapsed_ms_per_issue
      ? ['MAX_ELAPSED_TIME_EXHAUSTED']
      : []),
    ...(input.accumulated_cost_microusd >= input.policy.max_accumulated_cost_microusd_per_issue
      ? ['MAX_ACCUMULATED_COST_EXHAUSTED']
      : []),
  ];
  if (exhaustedReasons.length > 0) {
    return { disposition: 'boundary_exhausted_unresolved', reason_codes: exhaustedReasons };
  }
  if (!input.execution_completed) {
    return { disposition: 'continue', reason_codes: [] };
  }
  if (input.material_delta) {
    return { disposition: 'material_delta_ready', reason_codes: ['MATERIAL_EVIDENCE_DELTA'] };
  }
  if (input.strategy_changed) {
    return { disposition: 'continue', reason_codes: ['COORDINATOR_RECOGNIZED_STRATEGY_CHANGE'] };
  }
  return {
    disposition: 'saturated_unresolved',
    reason_codes: ['UNCHANGED_STRATEGY_NO_MATERIAL_DELTA'],
  };
}

const stringValue = { type: 'string', minLength: 1 } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const titleScopedFunctionalRefSchema = {
  ...topicSelectionFunctionalRefSchema,
  required: ['ref_type', 'ref_id', 'title_card_id'],
  properties: {
    ...topicSelectionFunctionalRefSchema.properties,
    title_card_id: stringValue,
  },
} as const;
const titleScopedTypedFunctionalRefSchema = (refType: string) => ({
  ...titleScopedFunctionalRefSchema,
  properties: {
    ...titleScopedFunctionalRefSchema.properties,
    ref_type: { const: refType },
  },
}) as const;
const researchArenaSessionRefSchema = titleScopedTypedFunctionalRefSchema('research_arena_session');
const searchPlanRecheckRequestRefSchema = titleScopedTypedFunctionalRefSchema(
  'search_plan_recheck_request',
);
const searchRunRefSchema = titleScopedTypedFunctionalRefSchema('search_run');
const literatureCorpusManifestRefSchema = titleScopedTypedFunctionalRefSchema(
  'literature_resource_pool_snapshot',
);

export const topicSelectionEvidenceConvergenceRetrievalRequestIntentSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'issue_ref', 'originating_arena_session_ref', 'search_intent', 'candidate_queries',
    'expected_decision_effect', 'corpus_manifest_ref', 'corpus_manifest_hash',
  ],
  properties: {
    issue_ref: titleScopedFunctionalRefSchema,
    originating_arena_session_ref: researchArenaSessionRefSchema,
    search_intent: stringValue,
    candidate_queries: { type: 'array', minItems: 1, items: stringValue },
    expected_decision_effect: stringValue,
    corpus_manifest_ref: literatureCorpusManifestRefSchema,
    corpus_manifest_hash: stringValue,
  },
} as const;

export const topicSelectionEvidenceConvergenceStrategyIdentityPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'search_intent', 'candidate_queries', 'corpus_manifest_ref', 'corpus_manifest_hash',
    'retrieval_parameters',
  ],
  properties: {
    search_intent: stringValue,
    candidate_queries: { type: 'array', minItems: 1, items: stringValue },
    corpus_manifest_ref: literatureCorpusManifestRefSchema,
    corpus_manifest_hash: stringValue,
    retrieval_parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['profile', 'top_k', 'evidence_per_literature', 'include_stale'],
      properties: {
        profile: { const: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_RETRIEVAL_PARAMETERS.profile },
        top_k: { const: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_RETRIEVAL_PARAMETERS.top_k },
        evidence_per_literature: {
          const: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_RETRIEVAL_PARAMETERS.evidence_per_literature,
        },
        include_stale: { const: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_RETRIEVAL_PARAMETERS.include_stale },
      },
    },
  },
} as const;

export const topicSelectionEvidenceConvergenceExecutionPolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version', 'policy_key', 'max_orchestration_steps_per_issue',
    'max_linked_rounds_per_issue', 'max_elapsed_ms_per_issue',
    'max_accumulated_cost_microusd_per_issue',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY.schema_version },
    policy_key: stringValue,
    max_orchestration_steps_per_issue: { type: 'integer', minimum: 1 },
    max_linked_rounds_per_issue: { type: 'integer', minimum: 1 },
    max_elapsed_ms_per_issue: { type: 'integer', minimum: 1 },
    max_accumulated_cost_microusd_per_issue: { type: 'integer', minimum: 1 },
  },
} as const;

export const topicSelectionEvidenceConvergenceRoundLinkSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version', 'arena_session_ref', 'supersedes_arena_session_ref', 'parent_transcript_hash',
    'evidence_delta_ref', 'evidence_delta_hash',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_ROUND_LINK_SCHEMA_VERSION },
    arena_session_ref: topicSelectionFunctionalRefSchema,
    supersedes_arena_session_ref: topicSelectionFunctionalRefSchema,
    parent_transcript_hash: stringValue,
    evidence_delta_ref: topicSelectionFunctionalRefSchema,
    evidence_delta_hash: stringValue,
  },
} as const;

export const topicSelectionEvidenceConvergenceClaimAdmissionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version', 'request_ref', 'search_run_ref', 'query', 'literature_ref', 'chunk_ref',
    'chunk_hash', 'evidence_role', 'source_statement', 'normalized_statement',
    'interpretation_payload', 'extraction_confidence',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_CLAIM_ADMISSION_SCHEMA_VERSION },
    request_ref: searchPlanRecheckRequestRefSchema,
    search_run_ref: searchRunRefSchema,
    query: stringValue,
    literature_ref: titleScopedTypedFunctionalRefSchema('literature_record'),
    chunk_ref: titleScopedFunctionalRefSchema,
    chunk_hash: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    evidence_role: { enum: ['support', 'challenge', 'baseline', 'context'] },
    source_statement: stringValue,
    normalized_statement: { anyOf: [stringValue, { type: 'null' }] },
    interpretation_payload: { type: 'object', additionalProperties: true },
    extraction_confidence: {
      anyOf: [{ type: 'number', minimum: 0, maximum: 1 }, { type: 'null' }],
    },
  },
} as const;

export const topicSelectionEvidenceDeltaArtifactSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version', 'issue_refs', 'predecessor_evidence_map_ref', 'admitted_evidence_unit_refs',
    'changed_claim_refs', 'negative_coverage_changes', 'source_health_changes', 'conflict_changes',
    'decision_relevance', 'material',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_EVIDENCE_DELTA_SCHEMA_VERSION },
    issue_refs: functionalRefArray,
    predecessor_evidence_map_ref: topicSelectionFunctionalRefSchema,
    admitted_evidence_unit_refs: functionalRefArray,
    changed_claim_refs: functionalRefArray,
    negative_coverage_changes: functionalRefArray,
    source_health_changes: functionalRefArray,
    conflict_changes: functionalRefArray,
    decision_relevance: stringValue,
    material: { type: 'boolean' },
  },
} as const;

export const topicSelectionResolutionRouteArtifactSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version', 'issue_ref', 'owning_stage', 'route_kind', 'target_ref', 'required_delta',
    'recheck_gate_key', 'authority_boundary',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_RESOLUTION_ROUTE_SCHEMA_VERSION },
    issue_ref: topicSelectionFunctionalRefSchema,
    owning_stage: { const: 'evidence_landscape' },
    route_kind: { enum: [...TOPIC_SELECTION_RESOLUTION_ROUTE_KINDS] },
    target_ref: topicSelectionFunctionalRefSchema,
    required_delta: stringValue,
    recheck_gate_key: stringValue,
    authority_boundary: { const: 'deterministic_gate_then_strict_human' },
  },
} as const;
