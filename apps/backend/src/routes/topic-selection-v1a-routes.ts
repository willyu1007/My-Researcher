import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  TOPIC_SELECTION_ACTOR_TYPES,
  TOPIC_SELECTION_ARTIFACT_KINDS,
  TOPIC_SELECTION_ARTIFACT_STORAGE_KINDS,
  TOPIC_SELECTION_QUALITY_SIGNAL_VERDICTS,
  topicSelectionActorRefSchema,
  topicSelectionFunctionalRefSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_COVERAGE_ASSESSMENT_VERDICTS,
  TOPIC_SELECTION_COVERAGE_BINDING_KINDS,
  TOPIC_SELECTION_COVERAGE_EXECUTION_STATUSES,
  TOPIC_SELECTION_COVERAGE_INTENT_TYPES,
  TOPIC_SELECTION_EVIDENCE_ROLES,
  TOPIC_SELECTION_RECHECK_REQUEST_STATUSES,
  TOPIC_SELECTION_RESOURCE_POOL_SOURCES,
  TOPIC_SELECTION_SEARCH_RUN_KINDS,
  TOPIC_SELECTION_SEARCH_RUN_STATUSES,
  topicSelectionSearchRunResultAccountingSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import {
  TOPIC_SELECTION_EVIDENCE_ASSESSMENT_GRANULARITIES,
  TOPIC_SELECTION_EVIDENCE_ASSESSMENT_PURPOSES,
  TOPIC_SELECTION_EVIDENCE_ATTRIBUTION_KINDS,
  TOPIC_SELECTION_EVIDENCE_CLUSTER_TYPES,
  TOPIC_SELECTION_EVIDENCE_CONFLICT_SEVERITIES,
  TOPIC_SELECTION_EVIDENCE_CONFLICT_TYPES,
  TOPIC_SELECTION_EVIDENCE_LINK_TYPES,
  TOPIC_SELECTION_EVIDENCE_PATTERN_TYPES,
  TOPIC_SELECTION_EVIDENCE_REVIEW_STATUSES,
  topicSelectionEvidenceSourceLocatorSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import {
  TOPIC_SELECTION_CANDIDATE_MEMORY_SUGGESTION_TYPES,
  TOPIC_SELECTION_NEED_ADJUDICATION_DECISIONS,
  TOPIC_SELECTION_NEED_LOOPBACK_TARGETS,
  TOPIC_SELECTION_NEED_MECHANISM_TYPES,
  TOPIC_SELECTION_NEED_PRIOR_ART_STATUSES,
  TOPIC_SELECTION_NEED_REJECTED_REASONS,
  humanConfirmationInputSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import {
  TOPIC_SELECTION_ACCEPTED_RISK_SOURCE_TYPES,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-recheck-risk-memory-contracts';
import {
  TOPIC_SELECTION_OFFLINE_EVALUATION_CASE_TYPES,
  TOPIC_SELECTION_OFFLINE_EVALUATION_DATASET_SOURCES,
  TOPIC_SELECTION_OFFLINE_EVALUATION_DATASET_STATUSES,
  TOPIC_SELECTION_OFFLINE_EVALUATION_METRIC_KEYS,
  topicSelectionOfflineEvaluationGoldExpectationSchema,
  topicSelectionOfflineEvaluationObservedOutputSchema,
  topicSelectionOfflineFrozenInputBundleSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-offline-evaluation-replay-contracts';
import {
  createTopicSelectionResourceSampleRequestSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-resource-sampling-contracts';
import {
  TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_NODE_IDS,
  TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
  topicSelectionV1aWorkflowHarnessRunRequestSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1a-workflow-harness-contracts';
import {
  TopicSelectionV1aController,
  type AdjudicationBody,
  type AcceptedRiskBody,
  type ConfirmValidatedNeedBody,
  type EvidenceStrengthBody,
  type EvidenceMapBody,
  type LiteratureSnapshotBody,
  type MarkEvidenceMapStaleBody,
  type MaterializeMemoryBody,
  type NeedCandidateBody,
  type InterpretQualitySignalBody,
  type OfflineCaseBody,
  type OfflineCaseResultBody,
  type OfflineDatasetBody,
  type OfflineRunBody,
  type QualitySignalBody,
  type QueueSearchPlanRecheckBody,
  type ReadinessBody,
  type ResolveSearchPlanRecheckBody,
  type SearchPlanBody,
  type SearchPlanRecheckBody,
  type SearchRunBody,
  type SupportPacketBody,
  type TopicSeedBody,
  type V1bInputBundleBody,
  type WorkflowHarnessArtifactBody,
  type WorkflowHarnessRunBody,
} from '../controllers/topic-selection-v1a-controller.js';
import { TopicSelectionResourceSamplingController } from '../controllers/topic-selection-resource-sampling-controller.js';
import type { CreateTopicSelectionResourceSampleInput } from '../services/topic-selection-resource-sampling-service.js';

type JsonSchema = Record<string, unknown>;

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] } as const;
const stringArray = { type: 'array', items: stringId } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const recordPayload = { type: 'object', additionalProperties: true } as const;
const recordArray = { type: 'array', items: recordPayload } as const;
const severity = { enum: ['info', 'warning', 'blocking', 'critical'] } as const;

function bodySchema(required: string[], properties: JsonSchema): JsonSchema {
  const body: JsonSchema = {
    type: 'object',
    additionalProperties: true,
    properties,
  };
  if (required.length > 0) {
    body.required = required;
  }
  return { body };
}

function paramsSchema(properties: JsonSchema): JsonSchema {
  return {
    params: {
      type: 'object',
      additionalProperties: false,
      required: Object.keys(properties),
      properties,
    },
  };
}

function bodyAndParamsSchema(required: string[], properties: JsonSchema, params: JsonSchema): JsonSchema {
  return {
    ...bodySchema(required, properties),
    ...paramsSchema(params),
  };
}

async function normalizeOptionalBody(request: FastifyRequest): Promise<void> {
  if (request.body === undefined) {
    (request as FastifyRequest & { body: unknown }).body = {};
  }
}

async function blockWorkflowHarnessAutomationOnDirectWrite(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void | FastifyReply> {
  const body = request.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return;
  }
  const payload = body as Record<string, unknown>;
  const blockedMarkers = [
    payload.schema_version === TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION ? 'schema_version' : null,
    payload.scenario_input !== undefined ? 'scenario_input' : null,
    typeof payload.scenario_id === 'string' ? 'scenario_id' : null,
    typeof payload.scenario_case_id === 'string' ? 'scenario_case_id' : null,
    typeof payload.node_attempt_id === 'string' ? 'node_attempt_id' : null,
    typeof payload.node_id === 'string' && TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_NODE_IDS.includes(
      payload.node_id as (typeof TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_NODE_IDS)[number],
    )
      ? 'node_id'
      : null,
  ].filter((marker): marker is string => Boolean(marker));

  if (blockedMarkers.length === 0) {
    return;
  }

  return reply.status(409).send({
    error: {
      code: 'AUTOMATIC_HARNESS_PATH_REQUIRES_NATIVE_RUNNER',
      message: 'Automatic v1a workflow harness invocations must use /topic-selection/v1a/workflow-harness/nodes/:nodeId/invocations.',
      details: {
        blocked_markers: blockedMarkers,
      },
    },
  });
}

async function normalizeOptionalBodyAndBlockWorkflowHarnessAutomation(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void | FastifyReply> {
  await normalizeOptionalBody(request);
  return blockWorkflowHarnessAutomationOnDirectWrite(request, reply);
}

function guardedDirectWrite(schema: JsonSchema): {
  schema: JsonSchema;
  preValidation: typeof blockWorkflowHarnessAutomationOnDirectWrite;
} {
  return {
    schema,
    preValidation: blockWorkflowHarnessAutomationOnDirectWrite,
  };
}

const actorType = { enum: [...TOPIC_SELECTION_ACTOR_TYPES] } as const;
const nullableFunctionalRef = { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] } as const;
const typedFunctionalRef = (refType: string, options: { requireVersion?: boolean } = {}) => ({
  type: 'object',
  additionalProperties: false,
  required: options.requireVersion ? ['ref_type', 'ref_id', 'version_id'] : ['ref_type', 'ref_id'],
  properties: {
    ref_type: { const: refType },
    ref_id: stringId,
    version_id: options.requireVersion ? stringId : nullableStringId,
    title_card_id: nullableStringId,
    legacy_ref: { anyOf: [recordPayload, { type: 'null' }] },
  },
}) as const;
const concreteSearchPlanRef = typedFunctionalRef('search_plan', { requireVersion: true });
const concreteLiteratureSnapshotRef = typedFunctionalRef('literature_resource_pool_snapshot', { requireVersion: true });
const searchRunLocatorProvenanceRef = {
  anyOf: [
    typedFunctionalRef('literature_abstract'),
    typedFunctionalRef('fulltext_document'),
    typedFunctionalRef('fulltext_section'),
    typedFunctionalRef('fulltext_paragraph'),
    typedFunctionalRef('fulltext_anchor'),
    typedFunctionalRef('manual_locator'),
  ],
} as const;
const searchRunEvidenceMapInputRef = {
  anyOf: [
    typedFunctionalRef('literature_record'),
    typedFunctionalRef('literature_source'),
    searchRunLocatorProvenanceRef,
  ],
} as const;
const searchRunEvidenceMapInputRefs = { type: 'array', items: searchRunEvidenceMapInputRef } as const;
const searchRunEvidenceBindingSourceRef = {
  anyOf: [
    typedFunctionalRef('literature_source'),
    searchRunLocatorProvenanceRef,
  ],
} as const;
const searchRunEvidenceBindingSourceRefs = {
  type: 'array',
  items: searchRunEvidenceBindingSourceRef,
} as const;
const nullableRawLogArtifactRef = {
  anyOf: [
    typedFunctionalRef('artifact_ref'),
    typedFunctionalRef('raw_search_log'),
    { type: 'null' },
  ],
} as const;
const searchCoverageRiskRef = {
  anyOf: [
    typedFunctionalRef('accepted_risk'),
    typedFunctionalRef('search_coverage_risk'),
  ],
} as const;

const topicSeedBody = bodySchema(['title_card_id'], {
  workspace_id: nullableStringId,
  title_card_id: stringId,
  seed_version: stringId,
  intent_summary: stringId,
  scope_notes: nullableStringId,
  created_by: actorType,
  policy_version_id: nullableStringId,
});

const literatureSnapshotBody = bodySchema(['title_card_id', 'topic_seed_id'], {
  workspace_id: nullableStringId,
  title_card_id: stringId,
  topic_seed_id: stringId,
  snapshot_version: stringId,
  source_scope: { enum: [...TOPIC_SELECTION_RESOURCE_POOL_SOURCES] },
  created_by: actorType,
  policy_version_id: nullableStringId,
});

const resourceSampleBody = { body: createTopicSelectionResourceSampleRequestSchema } as const;
const resourceSampleParams = paramsSchema({ sampleSetId: stringId });

const coverageIntent = {
  type: 'object',
  additionalProperties: true,
  required: ['query'],
  properties: {
    coverage_key: stringId,
    intent_type: { enum: [...TOPIC_SELECTION_COVERAGE_INTENT_TYPES] },
    query: stringId,
    rationale: stringId,
    required: { type: 'boolean' },
    priority: { type: 'number' },
    target_source_types: stringArray,
    expected_evidence_role: { enum: [...TOPIC_SELECTION_EVIDENCE_ROLES] },
    refs: functionalRefArray,
  },
} as const;

const searchPlanBody = bodySchema([
  'title_card_id',
  'topic_seed_id',
  'literature_resource_pool_snapshot_id',
  'query_intents',
], {
  workspace_id: nullableStringId,
  title_card_id: stringId,
  topic_seed_id: stringId,
  literature_resource_pool_snapshot_id: stringId,
  plan_version: stringId,
  query_intents: stringArray,
  must_check_constraints: stringArray,
  exclusion_rules: stringArray,
  coverage_strategy: recordPayload,
  coverage_intents: { type: 'array', items: coverageIntent },
  parent_search_plan_ref: nullableFunctionalRef,
  recheck_request_ref: nullableFunctionalRef,
  created_by: actorType,
  policy_version_id: nullableStringId,
});

const coverageObservation = {
  type: 'object',
  additionalProperties: true,
  required: ['coverage_row_intent_id', 'status'],
  properties: {
    coverage_row_intent_id: stringId,
    status: { enum: [...TOPIC_SELECTION_COVERAGE_EXECUTION_STATUSES] },
    result_count: { type: 'number' },
    source_count: { type: 'number' },
    missing_reason_codes: stringArray,
    notes: nullableStringId,
  },
} as const;

const coverageBinding = {
  type: 'object',
  additionalProperties: true,
  required: ['coverage_row_intent_id', 'literature_ref'],
  properties: {
    coverage_row_intent_id: stringId,
    literature_ref: typedFunctionalRef('literature_record'),
    source_refs: searchRunEvidenceBindingSourceRefs,
    binding_kind: { enum: [...TOPIC_SELECTION_COVERAGE_BINDING_KINDS] },
    result_rank: nullableNumber,
  },
} as const;

const coverageAssessment = {
  type: 'object',
  additionalProperties: true,
  required: ['coverage_row_intent_id', 'verdict'],
  properties: {
    coverage_row_intent_id: stringId,
    verdict: { enum: [...TOPIC_SELECTION_COVERAGE_ASSESSMENT_VERDICTS] },
    issue_codes: stringArray,
    confidence: nullableNumber,
    assessed_by: actorType,
  },
} as const;

const coverageRiskAcceptance = {
  type: 'object',
  additionalProperties: true,
  required: ['coverage_row_intent_id', 'accepted_risk_ref', 'accepted_by', 'rationale'],
  properties: {
    coverage_row_intent_id: stringId,
    accepted_risk_ref: searchCoverageRiskRef,
    accepted_by: topicSelectionActorRefSchema,
    rationale: stringId,
    expires_at: nullableStringId,
  },
} as const;

const searchRunBody = bodySchema([
  'title_card_id',
  'search_plan_id',
  'result_accounting',
  'source_health_summary',
  'evidence_map_input_refs',
], {
  workspace_id: nullableStringId,
  title_card_id: stringId,
  search_plan_id: stringId,
  literature_resource_pool_snapshot_id: stringId,
  search_plan_ref: concreteSearchPlanRef,
  literature_resource_pool_snapshot_ref: concreteLiteratureSnapshotRef,
  expected_literature_snapshot_hash: stringId,
  run_kind: { enum: [...TOPIC_SELECTION_SEARCH_RUN_KINDS] },
  run_status: { enum: [...TOPIC_SELECTION_SEARCH_RUN_STATUSES] },
  query_provenance: recordArray,
  result_accounting: topicSelectionSearchRunResultAccountingSchema,
  source_health_summary: recordPayload,
  dedup_summary: recordPayload,
  evidence_map_input_refs: searchRunEvidenceMapInputRefs,
  raw_log_artifact_ref: nullableRawLogArtifactRef,
  raw_log_artifact: { anyOf: [recordPayload, { type: 'null' }] },
  coverage_observations: { type: 'array', items: coverageObservation },
  evidence_bindings: { type: 'array', items: coverageBinding },
  coverage_assessments: { type: 'array', items: coverageAssessment },
  coverage_risk_acceptances: { type: 'array', items: coverageRiskAcceptance },
  started_at: stringId,
  finished_at: nullableStringId,
  created_by: actorType,
  policy_version_id: nullableStringId,
});

const searchPlanParams = paramsSchema({ searchPlanId: stringId });

const searchPlanRecheckBody = bodySchema(['title_card_id', 'source_ref', 'target_search_plan_id', 'reason'], {
  workspace_id: nullableStringId,
  title_card_id: stringId,
  source_ref: topicSelectionFunctionalRefSchema,
  target_search_plan_id: stringId,
  reason: stringId,
  gap_codes: stringArray,
  requested_by: actorType,
  policy_version_id: nullableStringId,
});

const resolveSearchPlanRecheckBody = bodyAndParamsSchema(['outcome', 'decision_summary'], {
  outcome: { enum: [...TOPIC_SELECTION_RECHECK_REQUEST_STATUSES.filter((status) => status !== 'open')] },
  decision_summary: stringId,
  accepted_risk_refs: functionalRefArray,
  revised_search_plan: recordPayload,
  follow_up_search_run: recordPayload,
}, { requestId: stringId });

const evidenceUnit = {
  type: 'object',
  additionalProperties: true,
  required: ['evidence_role', 'literature_ref', 'locator', 'source_statement'],
  properties: {
    client_unit_key: stringId,
    coverage_row_intent_id: nullableStringId,
    evidence_role: { enum: ['support', 'challenge', 'baseline', 'context'] },
    literature_ref: topicSelectionFunctionalRefSchema,
    source_refs: functionalRefArray,
    locator: topicSelectionEvidenceSourceLocatorSchema,
    source_attribution_kind: { enum: [...TOPIC_SELECTION_EVIDENCE_ATTRIBUTION_KINDS] },
    source_statement: stringId,
    normalized_statement: nullableStringId,
    interpretation_payload: recordPayload,
    extraction_confidence: nullableNumber,
    review_status: { enum: [...TOPIC_SELECTION_EVIDENCE_REVIEW_STATUSES] },
  },
} as const;

const evidenceTypedLink = {
  type: 'object',
  additionalProperties: true,
  required: ['link_type', 'source_unit_key', 'target_unit_key'],
  properties: {
    link_type: { enum: [...TOPIC_SELECTION_EVIDENCE_LINK_TYPES] },
    source_unit_key: stringId,
    target_unit_key: stringId,
    rationale: nullableStringId,
    confidence: nullableNumber,
  },
} as const;

const evidenceCluster = {
  type: 'object',
  additionalProperties: true,
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

const evidencePattern = {
  type: 'object',
  additionalProperties: true,
  required: ['pattern_type', 'evidence_role', 'unit_keys', 'pattern_statement'],
  properties: {
    pattern_type: { enum: [...TOPIC_SELECTION_EVIDENCE_PATTERN_TYPES] },
    evidence_role: { enum: ['support', 'challenge', 'baseline', 'context'] },
    unit_keys: stringArray,
    pattern_statement: stringId,
    confidence: nullableNumber,
  },
} as const;

const evidenceConflictSet = {
  type: 'object',
  additionalProperties: true,
  required: ['conflict_type', 'severity'],
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

const evidenceMapBody = bodySchema(['title_card_id', 'search_run_id', 'evidence_units'], {
  workspace_id: nullableStringId,
  title_card_id: stringId,
  search_run_id: stringId,
  evidence_map_version: stringId,
  evidence_units: { type: 'array', minItems: 1, items: evidenceUnit },
  typed_links: { type: 'array', items: evidenceTypedLink },
  clusters: { type: 'array', items: evidenceCluster },
  patterns: { type: 'array', items: evidencePattern },
  conflict_sets: { type: 'array', items: evidenceConflictSet },
  digest_payload: recordPayload,
  created_by: actorType,
  policy_version_id: nullableStringId,
});

const evidenceMapParams = paramsSchema({ evidenceMapId: stringId });

const roleBundleBody = {
  type: 'object',
  additionalProperties: true,
  properties: {
    support_unit_ids: stringArray,
    challenge_unit_ids: stringArray,
    baseline_unit_ids: stringArray,
    context_unit_ids: stringArray,
  },
} as const;

const evidenceStrengthBody = bodySchema([
  'evidence_map_id',
  'target_ref',
  'purpose',
  'role_bundle',
  'assessment_workflow_version',
], {
  workspace_id: nullableStringId,
  evidence_map_id: stringId,
  target_ref: topicSelectionFunctionalRefSchema,
  purpose: { enum: [...TOPIC_SELECTION_EVIDENCE_ASSESSMENT_PURPOSES] },
  granularity: { enum: [...TOPIC_SELECTION_EVIDENCE_ASSESSMENT_GRANULARITIES] },
  role_bundle: roleBundleBody,
  assessment_workflow_version: stringId,
  policy_version_id: nullableStringId,
  created_by: actorType,
});

const markEvidenceMapStaleBody = bodyAndParamsSchema(['stale_reason_codes'], {
  stale_reason_codes: stringArray,
  freshness_status: { enum: ['stale', 'recheck_required', 'superseded'] },
}, { evidenceMapId: stringId });

const needCandidateBody = bodySchema(['title_card_id', 'evidence_map_id', 'candidate_need'], {
  workspace_id: nullableStringId,
  title_card_id: stringId,
  evidence_map_id: stringId,
  candidate_version: stringId,
  candidate_need: stringId,
  unmet_need_statement: stringId,
  mechanism_type: { enum: [...TOPIC_SELECTION_NEED_MECHANISM_TYPES] },
  mechanism_summary: nullableStringId,
  mechanism_payload: recordPayload,
  scope_notes: nullableStringId,
  non_goal_notes: nullableStringId,
  prior_art_status: { enum: [...TOPIC_SELECTION_NEED_PRIOR_ART_STATUSES] },
  support_unit_ids: stringArray,
  challenge_unit_ids: stringArray,
  baseline_unit_ids: stringArray,
  context_unit_ids: stringArray,
  conflict_refs: functionalRefArray,
  unresolved_challenge_refs: functionalRefArray,
  open_recheck_request_refs: functionalRefArray,
  accepted_risk_refs: functionalRefArray,
  gap_codes: stringArray,
  speculative: { type: 'boolean' },
  confidence: nullableNumber,
  created_by: actorType,
  policy_version_id: nullableStringId,
});

const readinessBody = bodyAndParamsSchema([], {
  workspace_id: nullableStringId,
  assessment_workflow_version: stringId,
  open_recheck_request_refs: functionalRefArray,
  strong_unresolved_challenge_refs: functionalRefArray,
  accepted_risk_refs: functionalRefArray,
  policy_version_id: nullableStringId,
  assessed_by: actorType,
}, { needCandidateId: stringId });

const supportPacketBody = bodySchema(['need_candidate_id'], {
  workspace_id: nullableStringId,
  need_candidate_id: stringId,
  readiness_assessment_id: nullableStringId,
  required_human_checks: stringArray,
  residual_risk_refs: functionalRefArray,
  coverage_refs: functionalRefArray,
  already_solved_review: recordPayload,
  packet_payload: recordPayload,
  created_by: actorType,
  policy_version_id: nullableStringId,
});

const memorySuggestionBody = {
  type: 'object',
  additionalProperties: true,
  required: ['suggestion_type', 'rationale'],
  properties: {
    suggestion_type: { enum: [...TOPIC_SELECTION_CANDIDATE_MEMORY_SUGGESTION_TYPES] },
    rationale: stringId,
    suggestion_payload: recordPayload,
  },
} as const;

const adjudicationBody = bodyAndParamsSchema(['support_packet_id', 'final_decision', 'rationale'], {
  workspace_id: nullableStringId,
  support_packet_id: stringId,
  final_decision: { enum: [...TOPIC_SELECTION_NEED_ADJUDICATION_DECISIONS] },
  rationale: stringId,
  adjudicated_by: topicSelectionActorRefSchema,
  rejected_reason: { anyOf: [{ enum: [...TOPIC_SELECTION_NEED_REJECTED_REASONS] }, { type: 'null' }] },
  loopback_target: { enum: [...TOPIC_SELECTION_NEED_LOOPBACK_TARGETS] },
  required_actions: stringArray,
  gap_codes: stringArray,
  residual_risk_refs: functionalRefArray,
  accepted_risk_refs: functionalRefArray,
  merge_target_need_candidate_ref: nullableFunctionalRef,
  searchplan_recheck_reason: stringId,
  searchplan_recheck_gap_codes: stringArray,
  memory_suggestion: { anyOf: [memorySuggestionBody, { type: 'null' }] },
  decision_payload: recordPayload,
  policy_version_id: nullableStringId,
}, { needCandidateId: stringId });

const humanConfirmationBody = {
  body: {
    type: 'object',
    additionalProperties: true,
    anyOf: [
      { required: ['human_actor', 'human_rationale'] },
      { required: ['confirmation_input'] },
    ],
    properties: {
      workspace_id: nullableStringId,
      human_actor: topicSelectionActorRefSchema,
      human_rationale: stringId,
      confirmation_input: humanConfirmationInputSchema,
      semantic_review_context_packet_ref: nullableFunctionalRef,
      semantic_review_ref: nullableFunctionalRef,
      artifact_refs: functionalRefArray,
      policy_version_id: nullableStringId,
    },
  },
  ...paramsSchema({ adjudicationResultId: stringId }),
} as const;

const v1bInputBundleBody = bodySchema(['validated_need_id'], {
  validated_need_id: stringId,
  bundle_version: stringId,
  created_by: actorType,
});

const qualitySignalBody = bodySchema(['target_ref', 'stage', 'check_type', 'verdict'], {
  workspace_id: nullableStringId,
  title_card_id: nullableStringId,
  target_ref: topicSelectionFunctionalRefSchema,
  stage: stringId,
  check_type: stringId,
  verdict: { enum: [...TOPIC_SELECTION_QUALITY_SIGNAL_VERDICTS] },
  issue_codes: stringArray,
  recommended_action: nullableStringId,
  blocking_transition_keys: stringArray,
  refs: functionalRefArray,
  confidence: nullableNumber,
  workflow_run_id: nullableStringId,
  artifact_refs: functionalRefArray,
  emitted_by: actorType,
});

const interpretQualitySignalBody = bodyAndParamsSchema([], {
  affected_ref: topicSelectionFunctionalRefSchema,
  cooldown_minutes: { type: 'number' },
}, { qualitySignalId: stringId });

const queueSearchPlanRecheckRequestBody = bodyAndParamsSchema([], {
  cooldown_minutes: { type: 'number' },
}, { requestId: stringId });

const materializeMemorySuggestionParams = paramsSchema({ memorySuggestionId: stringId });

const acceptedRiskBody = bodySchema(['risk_type', 'target_ref', 'scope_refs', 'rationale', 'accepted_by'], {
  workspace_id: nullableStringId,
  title_card_id: nullableStringId,
  risk_type: stringId,
  source_type: { enum: [...TOPIC_SELECTION_ACCEPTED_RISK_SOURCE_TYPES] },
  source_ref: nullableFunctionalRef,
  target_ref: topicSelectionFunctionalRefSchema,
  scope_refs: functionalRefArray,
  affected_object_refs: functionalRefArray,
  severity,
  rationale: stringId,
  accepted_by: topicSelectionActorRefSchema,
  policy_version_id: nullableStringId,
  expiry_condition: nullableStringId,
  recheck_condition: nullableStringId,
  expires_at: nullableStringId,
});

const offlineDatasetBody = bodySchema([], {
  workspace_id: nullableStringId,
  dataset_key: stringId,
  dataset_version: stringId,
  source: { enum: [...TOPIC_SELECTION_OFFLINE_EVALUATION_DATASET_SOURCES] },
  status: { enum: [...TOPIC_SELECTION_OFFLINE_EVALUATION_DATASET_STATUSES] },
  description: nullableStringId,
  payload: recordPayload,
  created_by: actorType,
});

const offlineCaseBody = bodySchema([
  'dataset_id',
  'case_key',
  'case_type',
  'frozen_input_bundle',
  'gold_expectation',
], {
  workspace_id: nullableStringId,
  dataset_id: stringId,
  title_card_id: nullableStringId,
  case_key: stringId,
  case_type: { enum: [...TOPIC_SELECTION_OFFLINE_EVALUATION_CASE_TYPES] },
  frozen_input_bundle: topicSelectionOfflineFrozenInputBundleSchema,
  gold_expectation: topicSelectionOfflineEvaluationGoldExpectationSchema,
  tags: stringArray,
});

const offlineRunBody = bodySchema(['dataset_id', 'workflow_profile_key'], {
  workspace_id: nullableStringId,
  dataset_id: stringId,
  run_key: stringId,
  workflow_profile_key: stringId,
  workflow_profile_version: nullableStringId,
  model_profile_key: nullableStringId,
  search_profile_key: nullableStringId,
  policy_version_id: nullableStringId,
  metric_keys: {
    type: 'array',
    items: { enum: [...TOPIC_SELECTION_OFFLINE_EVALUATION_METRIC_KEYS] },
  },
  run_payload: recordPayload,
  created_by: actorType,
});

const offlineCaseResultBody = bodySchema(['run_id', 'case_id', 'observed_output'], {
  workspace_id: nullableStringId,
  run_id: stringId,
  case_id: stringId,
  observed_output: topicSelectionOfflineEvaluationObservedOutputSchema,
});

const runParams = paramsSchema({ runId: stringId });
const workflowHarnessNodeParams = paramsSchema({
  nodeId: { enum: [...TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_NODE_IDS] },
});
const workflowHarnessRunBody = {
  ...workflowHarnessNodeParams,
  body: topicSelectionV1aWorkflowHarnessRunRequestSchema,
};
const workflowHarnessArtifactParams = paramsSchema({ artifactRefId: stringId });
const workflowHarnessArtifactBody = bodySchema(['artifact_kind'], {
  workspace_id: nullableStringId,
  title_card_id: nullableStringId,
  artifact_kind: { enum: [...TOPIC_SELECTION_ARTIFACT_KINDS] },
  storage_kind: { enum: [...TOPIC_SELECTION_ARTIFACT_STORAGE_KINDS] },
  uri: nullableStringId,
  payload: { anyOf: [recordPayload, { type: 'null' }] },
  checksum: nullableStringId,
  byte_size: nullableNumber,
  mime_type: nullableStringId,
  workflow_run_id: nullableStringId,
  input_snapshot_id: nullableStringId,
  created_by: actorType,
});

export async function registerTopicSelectionV1aRoutes(
  fastify: FastifyInstance,
  controller: TopicSelectionV1aController,
  resourceSamplingController: TopicSelectionResourceSamplingController,
): Promise<void> {
  fastify.post<{ Body: WorkflowHarnessRunBody; Params: { nodeId: string } }>(
    '/topic-selection/v1a/workflow-harness/nodes/:nodeId/invocations',
    { schema: workflowHarnessRunBody },
    controller.invokeWorkflowHarnessNode,
  );
  fastify.post<{ Body: WorkflowHarnessArtifactBody }>(
    '/topic-selection/v1a/workflow-harness/artifacts',
    { schema: workflowHarnessArtifactBody },
    controller.recordWorkflowHarnessArtifact,
  );
  fastify.get<{ Params: { artifactRefId: string } }>(
    '/topic-selection/v1a/workflow-harness/artifacts/:artifactRefId',
    { schema: workflowHarnessArtifactParams },
    controller.getWorkflowHarnessArtifact,
  );
  fastify.post<{ Body: TopicSeedBody }>(
    '/topic-selection/v1a/topic-seeds/from-title-card',
    guardedDirectWrite(topicSeedBody),
    controller.createTopicSeedFromTitleCard,
  );
  fastify.post<{ Body: LiteratureSnapshotBody }>(
    '/topic-selection/v1a/literature-resource-pool-snapshots',
    guardedDirectWrite(literatureSnapshotBody),
    controller.createLiteratureResourcePoolSnapshot,
  );
  fastify.post<{ Body: CreateTopicSelectionResourceSampleInput }>(
    '/topic-selection/v1a/resource-samples',
    guardedDirectWrite(resourceSampleBody),
    resourceSamplingController.createResourceSampleSet,
  );
  fastify.get(
    '/topic-selection/v1a/resource-samples/:sampleSetId',
    { schema: resourceSampleParams },
    resourceSamplingController.getResourceSampleSet,
  );
  fastify.post<{ Body: SearchPlanBody }>(
    '/topic-selection/v1a/search-plans',
    guardedDirectWrite(searchPlanBody),
    controller.createSearchPlan,
  );
  fastify.post<{ Body: SearchRunBody }>(
    '/topic-selection/v1a/search-runs',
    guardedDirectWrite(searchRunBody),
    controller.recordSearchRun,
  );
  fastify.get(
    '/topic-selection/v1a/search-plans/:searchPlanId/coverage-matrix',
    { schema: searchPlanParams },
    controller.getCoverageMatrix,
  );
  fastify.post<{ Body: SearchPlanRecheckBody }>(
    '/topic-selection/v1a/search-plan-recheck-requests',
    guardedDirectWrite(searchPlanRecheckBody),
    controller.createSearchPlanRecheckRequest,
  );
  fastify.post<{ Body: ResolveSearchPlanRecheckBody; Params: { requestId: string } }>(
    '/topic-selection/v1a/search-plan-recheck-requests/:requestId/resolve',
    guardedDirectWrite(resolveSearchPlanRecheckBody),
    controller.resolveSearchPlanRecheckRequest,
  );
  fastify.post<{ Body: EvidenceMapBody }>(
    '/topic-selection/v1a/evidence-maps',
    guardedDirectWrite(evidenceMapBody),
    controller.createEvidenceMapFromSearchRun,
  );
  fastify.get(
    '/topic-selection/v1a/evidence-maps/:evidenceMapId/need-validation-bundle',
    { schema: evidenceMapParams },
    controller.getNeedValidationEvidenceBundle,
  );
  fastify.post<{ Body: EvidenceStrengthBody }>(
    '/topic-selection/v1a/evidence-strength-assessments',
    guardedDirectWrite(evidenceStrengthBody),
    controller.assessEvidenceStrength,
  );
  fastify.post<{ Body: MarkEvidenceMapStaleBody; Params: { evidenceMapId: string } }>(
    '/topic-selection/v1a/evidence-maps/:evidenceMapId/stale',
    guardedDirectWrite(markEvidenceMapStaleBody),
    controller.markEvidenceMapStale,
  );
  fastify.post<{ Body: NeedCandidateBody }>(
    '/topic-selection/v1a/need-candidates',
    guardedDirectWrite(needCandidateBody),
    controller.createNeedCandidateFromEvidenceMap,
  );
  fastify.post<{ Body: ReadinessBody; Params: { needCandidateId: string } }>(
    '/topic-selection/v1a/need-candidates/:needCandidateId/readiness-assessments',
    { schema: readinessBody, preValidation: normalizeOptionalBodyAndBlockWorkflowHarnessAutomation },
    controller.assessCandidateReadiness,
  );
  fastify.post<{ Body: SupportPacketBody }>(
    '/topic-selection/v1a/validation-support-packets',
    guardedDirectWrite(supportPacketBody),
    controller.createValidationDecisionSupportPacket,
  );
  fastify.post<{ Body: AdjudicationBody; Params: { needCandidateId: string } }>(
    '/topic-selection/v1a/need-candidates/:needCandidateId/adjudications',
    guardedDirectWrite(adjudicationBody),
    controller.adjudicateNeed,
  );
  fastify.post<{ Body: ConfirmValidatedNeedBody; Params: { adjudicationResultId: string } }>(
    '/topic-selection/v1a/adjudications/:adjudicationResultId/human-confirmations',
    guardedDirectWrite(humanConfirmationBody),
    controller.confirmValidatedNeed,
  );
  fastify.post<{ Body: V1bInputBundleBody }>(
    '/topic-selection/v1a/v1b-input-bundles',
    guardedDirectWrite(v1bInputBundleBody),
    controller.publishV1bInputBundle,
  );
  fastify.post<{ Body: QualitySignalBody }>(
    '/topic-selection/v1a/quality-signals',
    guardedDirectWrite(qualitySignalBody),
    controller.emitQualitySignal,
  );
  fastify.post<{ Body: InterpretQualitySignalBody; Params: { qualitySignalId: string } }>(
    '/topic-selection/v1a/quality-signals/:qualitySignalId/interpret',
    { schema: interpretQualitySignalBody, preValidation: normalizeOptionalBodyAndBlockWorkflowHarnessAutomation },
    controller.interpretQualitySignal,
  );
  fastify.post<{ Body: QueueSearchPlanRecheckBody; Params: { requestId: string } }>(
    '/topic-selection/v1a/search-plan-recheck-requests/:requestId/queue',
    { schema: queueSearchPlanRecheckRequestBody, preValidation: normalizeOptionalBodyAndBlockWorkflowHarnessAutomation },
    controller.queueSearchPlanRecheckRequest,
  );
  fastify.post<{ Body: MaterializeMemoryBody; Params: { memorySuggestionId: string } }>(
    '/topic-selection/v1a/candidate-memory-suggestions/:memorySuggestionId/materialize',
    { schema: materializeMemorySuggestionParams, preValidation: blockWorkflowHarnessAutomationOnDirectWrite },
    controller.materializeCandidateMemorySuggestion,
  );
  fastify.post<{ Body: AcceptedRiskBody }>(
    '/topic-selection/v1a/accepted-risks',
    guardedDirectWrite(acceptedRiskBody),
    controller.acceptRisk,
  );
  fastify.get(
    '/topic-selection/v1a/title-cards/:titleCardId/accepted-risks',
    { schema: paramsSchema({ titleCardId: stringId }) },
    controller.listAcceptedRisksByTitleCard,
  );
  fastify.get('/topic-selection/v1a/work-queue/open', controller.listOpenWorkQueueItems);
  // T-087 D1 read-only projections: list v1a authority/workflow objects per title-card.
  fastify.get(
    '/topic-selection/v1a/title-cards/:titleCardId/search-plans',
    { schema: paramsSchema({ titleCardId: stringId }) },
    controller.listSearchPlansByTitleCard,
  );
  fastify.get(
    '/topic-selection/v1a/title-cards/:titleCardId/evidence-maps',
    { schema: paramsSchema({ titleCardId: stringId }) },
    controller.listEvidenceMapsByTitleCard,
  );
  fastify.get(
    '/topic-selection/v1a/title-cards/:titleCardId/need-candidates',
    { schema: paramsSchema({ titleCardId: stringId }) },
    controller.listNeedCandidatesByTitleCard,
  );
  fastify.get(
    '/topic-selection/v1a/title-cards/:titleCardId/validated-needs',
    { schema: paramsSchema({ titleCardId: stringId }) },
    controller.listValidatedNeedsByTitleCard,
  );
  // T-087 Phase 2.5 — adjudication support packet picker driver.
  fastify.get(
    '/topic-selection/v1a/need-candidates/:needCandidateId/validation-support-packets',
    { schema: paramsSchema({ needCandidateId: stringId }) },
    controller.listValidationSupportPacketsByNeedCandidate,
  );
  // T-087 Phase 2.4 — negative memory inline display driver.
  fastify.get(
    '/topic-selection/v1a/need-candidates/:needCandidateId/memory-suggestions',
    { schema: paramsSchema({ needCandidateId: stringId }) },
    controller.listCandidateMemorySuggestionsByNeedCandidate,
  );
  // T-087 Phase 2.2 — SearchPlan recheck-request inline list.
  fastify.get(
    '/topic-selection/v1a/title-cards/:titleCardId/search-plan-recheck-requests',
    { schema: paramsSchema({ titleCardId: stringId }) },
    controller.listSearchPlanRecheckRequestsByTitleCard,
  );
  // T-087 Phase 2.3 — EvidenceMap drilldown driver.
  fastify.get(
    '/topic-selection/v1a/evidence-maps/:evidenceMapId/units',
    { schema: paramsSchema({ evidenceMapId: stringId }) },
    controller.listEvidenceUnitsByEvidenceMap,
  );
  fastify.post<{ Body: OfflineDatasetBody }>(
    '/topic-selection/v1a/offline-evaluation/datasets',
    { schema: offlineDatasetBody, preValidation: normalizeOptionalBodyAndBlockWorkflowHarnessAutomation },
    controller.createOfflineEvaluationDataset,
  );
  fastify.post<{ Body: OfflineDatasetBody }>(
    '/topic-selection/v1a/offline-evaluation/datasets/synthetic-baseline',
    { schema: offlineDatasetBody, preValidation: normalizeOptionalBodyAndBlockWorkflowHarnessAutomation },
    controller.createSyntheticOfflineEvaluationDataset,
  );
  fastify.post<{ Body: OfflineCaseBody }>(
    '/topic-selection/v1a/offline-evaluation/cases',
    guardedDirectWrite(offlineCaseBody),
    controller.addOfflineEvaluationCase,
  );
  fastify.post<{ Body: OfflineRunBody }>(
    '/topic-selection/v1a/offline-evaluation/runs',
    guardedDirectWrite(offlineRunBody),
    controller.startOfflineEvaluationRun,
  );
  fastify.post<{ Body: OfflineCaseResultBody }>(
    '/topic-selection/v1a/offline-evaluation/case-results',
    guardedDirectWrite(offlineCaseResultBody),
    controller.recordOfflineEvaluationCaseResult,
  );
  fastify.post<{ Params: { runId: string } }>(
    '/topic-selection/v1a/offline-evaluation/runs/:runId/complete',
    { schema: runParams, preValidation: blockWorkflowHarnessAutomationOnDirectWrite },
    controller.completeOfflineEvaluationRun,
  );
  fastify.get(
    '/topic-selection/v1a/offline-evaluation/runs/:runId/metric-results',
    { schema: runParams },
    controller.listOfflineEvaluationMetricResults,
  );
  fastify.get(
    '/topic-selection/v1a/offline-evaluation/runs/:runId/replay-diffs',
    { schema: runParams },
    controller.listOfflineEvaluationReplayDiffs,
  );
}
