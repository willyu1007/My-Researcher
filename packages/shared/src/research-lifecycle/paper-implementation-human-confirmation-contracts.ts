import {
  TOPIC_SELECTION_ACTOR_TYPES,
  topicSelectionFunctionalRefSchema,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';

export const PAPER_IMPLEMENTATION_HUMAN_CONFIRMATION_SCOPES = [
  'strong_claim_acceptance',
  'motive_portfolio_decision',
  'motive_evolution_decision',
  'work_order_admission',
  'dossier_export',
  'expensive_run',
] as const;
export type PaperImplementationHumanConfirmationScope =
  (typeof PAPER_IMPLEMENTATION_HUMAN_CONFIRMATION_SCOPES)[number];

export const PAPER_IMPLEMENTATION_HUMAN_CONFIRMATION_STATUSES = [
  'active',
  'invalidated',
  'superseded',
] as const;
export type PaperImplementationHumanConfirmationStatus =
  (typeof PAPER_IMPLEMENTATION_HUMAN_CONFIRMATION_STATUSES)[number];

export interface HumanConfirmationReviewedSource {
  source_ref: TopicSelectionFunctionalRef;
  source_hash: string;
}

export interface HumanConfirmationRecord {
  confirmation_record_id: string;
  implementation_project_id: string;
  confirmation_scope: PaperImplementationHumanConfirmationScope;
  target_refs: TopicSelectionFunctionalRef[];
  reviewed_sources: HumanConfirmationReviewedSource[];
  transition_attempt_ref?: TopicSelectionFunctionalRef | null;
  gate_result_refs: TopicSelectionFunctionalRef[];
  rationale: string;
  confirmed_by_actor_type: TopicSelectionActorType;
  confirmed_by_actor_id?: string | null;
  policy_version_id?: string | null;
  status: PaperImplementationHumanConfirmationStatus;
  status_reason?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface CreateHumanConfirmationRecordRequest {
  confirmation_record_id?: string;
  confirmation_scope: PaperImplementationHumanConfirmationScope;
  target_refs: TopicSelectionFunctionalRef[];
  reviewed_sources?: HumanConfirmationReviewedSource[];
  transition_attempt_ref?: TopicSelectionFunctionalRef | null;
  gate_result_refs?: TopicSelectionFunctionalRef[];
  rationale: string;
  confirmed_by_actor_type: TopicSelectionActorType;
  confirmed_by_actor_id?: string | null;
  policy_version_id?: string | null;
}

export interface ListHumanConfirmationRecordsResponse {
  items: HumanConfirmationRecord[];
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const actorTypeSchema = { enum: [...TOPIC_SELECTION_ACTOR_TYPES] } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const nonEmptyFunctionalRefArray = {
  type: 'array',
  minItems: 1,
  items: topicSelectionFunctionalRefSchema,
} as const;
const nullableFunctionalRef = {
  anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }],
} as const;
const confirmationScopeSchema = {
  enum: [...PAPER_IMPLEMENTATION_HUMAN_CONFIRMATION_SCOPES],
} as const;
const confirmationStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_HUMAN_CONFIRMATION_STATUSES],
} as const;
const reviewedSourceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['source_ref', 'source_hash'],
  properties: {
    source_ref: topicSelectionFunctionalRefSchema,
    source_hash: stringId,
  },
} as const;
const reviewedSourceArray = { type: 'array', items: reviewedSourceSchema } as const;

export const humanConfirmationRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'confirmation_record_id',
    'implementation_project_id',
    'confirmation_scope',
    'target_refs',
    'reviewed_sources',
    'gate_result_refs',
    'rationale',
    'confirmed_by_actor_type',
    'status',
    'created_at',
  ],
  properties: {
    confirmation_record_id: stringId,
    implementation_project_id: stringId,
    confirmation_scope: confirmationScopeSchema,
    target_refs: nonEmptyFunctionalRefArray,
    reviewed_sources: reviewedSourceArray,
    transition_attempt_ref: nullableFunctionalRef,
    gate_result_refs: functionalRefArray,
    rationale: stringId,
    confirmed_by_actor_type: actorTypeSchema,
    confirmed_by_actor_id: nullableStringId,
    policy_version_id: nullableStringId,
    status: confirmationStatusSchema,
    status_reason: nullableStringId,
    created_at: stringId,
    updated_at: nullableStringId,
  },
} as const;

export const createHumanConfirmationRecordRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'confirmation_scope',
    'target_refs',
    'rationale',
    'confirmed_by_actor_type',
  ],
  properties: {
    confirmation_record_id: stringId,
    confirmation_scope: confirmationScopeSchema,
    target_refs: nonEmptyFunctionalRefArray,
    reviewed_sources: reviewedSourceArray,
    transition_attempt_ref: nullableFunctionalRef,
    gate_result_refs: functionalRefArray,
    rationale: stringId,
    confirmed_by_actor_type: actorTypeSchema,
    confirmed_by_actor_id: nullableStringId,
    policy_version_id: nullableStringId,
  },
} as const;
