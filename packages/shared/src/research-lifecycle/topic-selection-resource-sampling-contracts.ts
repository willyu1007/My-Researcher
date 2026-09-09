import {
  topicSelectionFunctionalRefSchema,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';

export const TOPIC_SELECTION_RESOURCE_SAMPLE_TARGET_ROLES = [
  'support',
  'challenge',
  'baseline',
  'context',
] as const;
export type TopicSelectionResourceSampleTargetRole =
  (typeof TOPIC_SELECTION_RESOURCE_SAMPLE_TARGET_ROLES)[number];

export const TOPIC_SELECTION_RESOURCE_SAMPLE_ROLES = [
  ...TOPIC_SELECTION_RESOURCE_SAMPLE_TARGET_ROLES,
  'review',
  'excluded',
] as const;
export type TopicSelectionResourceSampleRole =
  (typeof TOPIC_SELECTION_RESOURCE_SAMPLE_ROLES)[number];

export const TOPIC_SELECTION_RESOURCE_SAMPLE_SET_STATUSES = [
  'ready',
  'ready_with_warning',
  'blocked',
] as const;
export type TopicSelectionResourceSampleSetStatus =
  (typeof TOPIC_SELECTION_RESOURCE_SAMPLE_SET_STATUSES)[number];

export const TOPIC_SELECTION_RESOURCE_EVIDENCE_POLARITIES = [
  'positive_method',
  'risk_or_failure',
  'evaluation_baseline',
  'foundation_context',
  'topic_drift',
  'mixed',
  'unknown',
] as const;
export type TopicSelectionResourceEvidencePolarity =
  (typeof TOPIC_SELECTION_RESOURCE_EVIDENCE_POLARITIES)[number];

export type TopicSelectionResourceRoleTargets = Record<
  TopicSelectionResourceSampleTargetRole,
  number
>;

export type TopicSelectionResourceRoleCounts = Record<
  TopicSelectionResourceSampleRole,
  number
>;

export type TopicSelectionResourceRoleScores = Record<
  TopicSelectionResourceSampleRole,
  number
>;

export interface TopicSelectionResourceSamplingModelRef {
  provider_id: string;
  model_id: string;
  profile_id?: string | null;
}

export interface TopicSelectionResourceCandidateClassificationDraft {
  literature_ref: TopicSelectionFunctionalRef;
  primary_role: TopicSelectionResourceSampleRole;
  topic_relevance: number;
  evidence_polarity: TopicSelectionResourceEvidencePolarity;
  role_scores: TopicSelectionResourceRoleScores;
  confidence: number;
  classification_rationale: string;
  exclusion_reason?: string | null;
  review_reason?: string | null;
  method_families?: string[];
}

export interface TopicSelectionResourceSamplingLlmOutput {
  classifications: TopicSelectionResourceCandidateClassificationDraft[];
}

export interface TopicSelectionResourceSampleSetRecord {
  resource_sample_set_id: string;
  workspace_id?: string | null;
  title_card_id?: string | null;
  topic_id: string;
  sample_size: number;
  policy_version: string;
  status: TopicSelectionResourceSampleSetStatus;
  role_targets: TopicSelectionResourceRoleTargets;
  role_counts: TopicSelectionResourceRoleCounts;
  warnings: string[];
  sample_hash: string;
  model: TopicSelectionResourceSamplingModelRef;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  audit_ref?: TopicSelectionFunctionalRef | null;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionResourceSampleItemRecord {
  resource_sample_item_id: string;
  sample_set_id: string;
  workspace_id?: string | null;
  title_card_id?: string | null;
  topic_id: string;
  literature_ref: TopicSelectionFunctionalRef;
  selected_role: TopicSelectionResourceSampleRole;
  selected: boolean;
  rank: number;
  topic_relevance: number;
  evidence_polarity: TopicSelectionResourceEvidencePolarity;
  role_scores: TopicSelectionResourceRoleScores;
  confidence: number;
  classification_rationale: string;
  exclusion_reason?: string | null;
  review_reason?: string | null;
  guardrail_codes: string[];
  method_families: string[];
  created_at: string;
}

export interface TopicSelectionResourceSamplingAuditRecord {
  resource_sampling_audit_id: string;
  sample_set_id: string;
  workspace_id?: string | null;
  title_card_id?: string | null;
  topic_id: string;
  policy_version: string;
  prompt_template_id?: string | null;
  prompt_template_version?: string | null;
  model: TopicSelectionResourceSamplingModelRef;
  candidate_count: number;
  eligible_count: number;
  selected_count: number;
  excluded_count: number;
  warning_codes: string[];
  guardrail_summary: Record<string, unknown>;
  artifact_refs: TopicSelectionFunctionalRef[];
  llm_structured_output: Record<string, unknown>;
  created_at: string;
}

export interface CreateTopicSelectionResourceSampleRequest {
  workspace_id?: string | null;
  title_card_id?: string | null;
  topic_id: string;
  sample_size?: number;
  policy_version?: string;
  role_targets?: Partial<TopicSelectionResourceRoleTargets>;
  seed?: string | null;
  model?: TopicSelectionResourceSamplingModelRef;
  execution_spec?: { execution_mode: 'codex_cli'; model_option_id?: null } | null;
  created_by?: TopicSelectionActorType;
}

export interface TopicSelectionResourceSampleResult {
  sample_set: TopicSelectionResourceSampleSetRecord;
  selected_items: TopicSelectionResourceSampleItemRecord[];
  candidate_items: TopicSelectionResourceSampleItemRecord[];
  audit: TopicSelectionResourceSamplingAuditRecord;
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const numberValue = { type: 'number' } as const;
const stringArray = { type: 'array', items: stringId } as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;

export const topicSelectionResourceRoleTargetsSchema = {
  type: 'object',
  additionalProperties: false,
  required: [...TOPIC_SELECTION_RESOURCE_SAMPLE_TARGET_ROLES],
  properties: {
    support: numberValue,
    challenge: numberValue,
    baseline: numberValue,
    context: numberValue,
  },
} as const;

export const topicSelectionResourceRoleCountsSchema = {
  type: 'object',
  additionalProperties: false,
  required: [...TOPIC_SELECTION_RESOURCE_SAMPLE_ROLES],
  properties: {
    support: numberValue,
    challenge: numberValue,
    baseline: numberValue,
    context: numberValue,
    review: numberValue,
    excluded: numberValue,
  },
} as const;

export const topicSelectionResourceRoleScoresSchema = topicSelectionResourceRoleCountsSchema;

export const topicSelectionResourceSamplingModelRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['provider_id', 'model_id'],
  properties: {
    provider_id: stringId,
    model_id: stringId,
    profile_id: nullableStringId,
  },
} as const;

export const topicSelectionResourceCandidateClassificationDraftSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'literature_ref',
    'primary_role',
    'topic_relevance',
    'evidence_polarity',
    'role_scores',
    'confidence',
    'classification_rationale',
  ],
  properties: {
    literature_ref: topicSelectionFunctionalRefSchema,
    primary_role: { enum: [...TOPIC_SELECTION_RESOURCE_SAMPLE_ROLES] },
    topic_relevance: numberValue,
    evidence_polarity: { enum: [...TOPIC_SELECTION_RESOURCE_EVIDENCE_POLARITIES] },
    role_scores: topicSelectionResourceRoleScoresSchema,
    confidence: numberValue,
    classification_rationale: stringId,
    exclusion_reason: nullableStringId,
    review_reason: nullableStringId,
    method_families: stringArray,
  },
} as const;

export const topicSelectionResourceSamplingLlmOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['classifications'],
  properties: {
    classifications: {
      type: 'array',
      items: topicSelectionResourceCandidateClassificationDraftSchema,
    },
  },
} as const;

export const topicSelectionResourceSampleSetRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'resource_sample_set_id',
    'topic_id',
    'sample_size',
    'policy_version',
    'status',
    'role_targets',
    'role_counts',
    'warnings',
    'sample_hash',
    'model',
    'created_by',
    'created_at',
  ],
  properties: {
    resource_sample_set_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: nullableStringId,
    topic_id: stringId,
    sample_size: numberValue,
    policy_version: stringId,
    status: { enum: [...TOPIC_SELECTION_RESOURCE_SAMPLE_SET_STATUSES] },
    role_targets: topicSelectionResourceRoleTargetsSchema,
    role_counts: topicSelectionResourceRoleCountsSchema,
    warnings: stringArray,
    sample_hash: stringId,
    model: topicSelectionResourceSamplingModelRefSchema,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    audit_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    created_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    created_at: stringId,
  },
} as const;

export const topicSelectionResourceSampleItemRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'resource_sample_item_id',
    'sample_set_id',
    'topic_id',
    'literature_ref',
    'selected_role',
    'selected',
    'rank',
    'topic_relevance',
    'evidence_polarity',
    'role_scores',
    'confidence',
    'classification_rationale',
    'guardrail_codes',
    'method_families',
    'created_at',
  ],
  properties: {
    resource_sample_item_id: stringId,
    sample_set_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: nullableStringId,
    topic_id: stringId,
    literature_ref: topicSelectionFunctionalRefSchema,
    selected_role: { enum: [...TOPIC_SELECTION_RESOURCE_SAMPLE_ROLES] },
    selected: { type: 'boolean' },
    rank: numberValue,
    topic_relevance: numberValue,
    evidence_polarity: { enum: [...TOPIC_SELECTION_RESOURCE_EVIDENCE_POLARITIES] },
    role_scores: topicSelectionResourceRoleScoresSchema,
    confidence: numberValue,
    classification_rationale: stringId,
    exclusion_reason: nullableStringId,
    review_reason: nullableStringId,
    guardrail_codes: stringArray,
    method_families: stringArray,
    created_at: stringId,
  },
} as const;

export const topicSelectionResourceSamplingAuditRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'resource_sampling_audit_id',
    'sample_set_id',
    'topic_id',
    'policy_version',
    'model',
    'candidate_count',
    'eligible_count',
    'selected_count',
    'excluded_count',
    'warning_codes',
    'guardrail_summary',
    'artifact_refs',
    'llm_structured_output',
    'created_at',
  ],
  properties: {
    resource_sampling_audit_id: stringId,
    sample_set_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: nullableStringId,
    topic_id: stringId,
    policy_version: stringId,
    prompt_template_id: nullableStringId,
    prompt_template_version: nullableStringId,
    model: topicSelectionResourceSamplingModelRefSchema,
    candidate_count: numberValue,
    eligible_count: numberValue,
    selected_count: numberValue,
    excluded_count: numberValue,
    warning_codes: stringArray,
    guardrail_summary: objectPayload,
    artifact_refs: functionalRefArray,
    llm_structured_output: objectPayload,
    created_at: stringId,
  },
} as const;

export const createTopicSelectionResourceSampleRequestSchema = {
  type: 'object',
  additionalProperties: true,
  required: ['topic_id'],
  properties: {
    workspace_id: nullableStringId,
    title_card_id: nullableStringId,
    topic_id: stringId,
    sample_size: numberValue,
    policy_version: stringId,
    role_targets: {
      type: 'object',
      additionalProperties: false,
      properties: {
        support: numberValue,
        challenge: numberValue,
        baseline: numberValue,
        context: numberValue,
      },
    },
    seed: nullableStringId,
    model: topicSelectionResourceSamplingModelRefSchema,
    created_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    execution_spec: { anyOf: [{ type: 'null' }, {
      type: 'object', additionalProperties: false, required: ['execution_mode'],
      properties: { execution_mode: { const: 'codex_cli' }, model_option_id: { type: 'null' } },
    }] },
  },
} as const;

export const topicSelectionResourceSampleResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['sample_set', 'selected_items', 'candidate_items', 'audit'],
  properties: {
    sample_set: topicSelectionResourceSampleSetRecordSchema,
    selected_items: {
      type: 'array',
      items: topicSelectionResourceSampleItemRecordSchema,
    },
    candidate_items: {
      type: 'array',
      items: topicSelectionResourceSampleItemRecordSchema,
    },
    audit: topicSelectionResourceSamplingAuditRecordSchema,
  },
} as const;
