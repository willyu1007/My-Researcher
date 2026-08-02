import { EXPERIMENT_V2_HASH_PATTERN, EXPERIMENT_V2_INT32_MAX } from './experiment-v2-contract-limits.js';
import type {
  ExperimentFoundationV2AssetType,
  ExperimentFoundationV2ExactAssetRevisionRef,
} from './experiment-foundation-v2-contracts.js';

export const EXPERIMENT_FOUNDATION_PROMOTION_V2_DECISIONS = ['promote', 'reject'] as const;
export type ExperimentFoundationPromotionV2Decision =
  (typeof EXPERIMENT_FOUNDATION_PROMOTION_V2_DECISIONS)[number];

export const EXPERIMENT_FOUNDATION_PREPARATION_CANDIDATE_V2_STATUSES = [
  'promoted',
  'rejected',
] as const;
export type ExperimentFoundationPreparationCandidateV2Status =
  (typeof EXPERIMENT_FOUNDATION_PREPARATION_CANDIDATE_V2_STATUSES)[number];

export type ExperimentFoundationPromotionV2CanonicalizationOutcome = 'created' | 'reused';

export interface ExperimentFoundationPromotionV2Request {
  decision: ExperimentFoundationPromotionV2Decision;
  business_idempotency_key: string;
}

export interface ExperimentFoundationPreparationCandidateV2 {
  candidate_id: string;
  candidate_revision: number;
  asset_type: ExperimentFoundationV2AssetType;
  logical_id: string;
  content_hash: string;
  status: ExperimentFoundationPreparationCandidateV2Status;
  canonical_revision: ExperimentFoundationV2ExactAssetRevisionRef | null;
  created_at: string;
  updated_at: string;
}

export interface ExperimentFoundationPromotionDecisionV2 {
  promotion_decision_id: string;
  candidate_id: string;
  candidate_revision: number;
  decision: ExperimentFoundationPromotionV2Decision;
  canonicalization_outcome: ExperimentFoundationPromotionV2CanonicalizationOutcome | null;
  canonical_revision: ExperimentFoundationV2ExactAssetRevisionRef | null;
  decided_at: string;
}

export interface ExperimentFoundationPromotionV2Response {
  candidate: ExperimentFoundationPreparationCandidateV2;
  promotion_decision: ExperimentFoundationPromotionDecisionV2;
  event_id: string;
  replayed: boolean;
}

export interface ExperimentFoundationPromotionV2EventPayload {
  candidate_id: string;
  candidate_revision: number;
  asset_type: ExperimentFoundationV2AssetType;
  logical_id: string;
  content_hash: string;
  decision: ExperimentFoundationPromotionV2Decision;
  canonicalization_outcome: ExperimentFoundationPromotionV2CanonicalizationOutcome | null;
  canonical_revision: ExperimentFoundationV2ExactAssetRevisionRef | null;
}

export interface ExperimentFoundationPromotionV2Event {
  event_id: string;
  event_type: 'ExperimentFoundationPreparationCandidatePromotionDecidedV2';
  schema_version: 'v1';
  producer_domain: 'experiment-foundation';
  occurred_at: string;
  correlation_id: string;
  causation_id: string;
  business_idempotency_key: string;
  payload_hash: string;
  payload: ExperimentFoundationPromotionV2EventPayload;
}

const nonEmptyString = { type: 'string', minLength: 1 } as const;
const hash = { type: 'string', pattern: EXPERIMENT_V2_HASH_PATTERN } as const;
const positiveInt32 = { type: 'integer', minimum: 1, maximum: EXPERIMENT_V2_INT32_MAX } as const;
const assetType = {
  type: 'string',
  enum: ['Dataset', 'DataPolicy', 'MetricDefinition', 'Benchmark', 'EvaluationProtocol'],
} as const;

export const experimentFoundationPromotionV2ParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['asset_type', 'logical_id', 'candidate_revision'],
  properties: {
    asset_type: assetType,
    logical_id: nonEmptyString,
    candidate_revision: positiveInt32,
  },
} as const;

export const experimentFoundationPromotionV2RequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['decision', 'business_idempotency_key'],
  properties: {
    decision: { type: 'string', enum: [...EXPERIMENT_FOUNDATION_PROMOTION_V2_DECISIONS] },
    business_idempotency_key: nonEmptyString,
  },
} as const;

const exactAssetRevisionRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['asset_type', 'logical_id', 'revision_id', 'revision_sequence', 'content_hash'],
  properties: {
    asset_type: assetType,
    logical_id: nonEmptyString,
    revision_id: nonEmptyString,
    revision_sequence: positiveInt32,
    content_hash: hash,
  },
} as const;

const nullableExactAssetRevisionRefSchema = {
  anyOf: [exactAssetRevisionRefSchema, { type: 'null' }],
} as const;

export const experimentFoundationPromotionV2ResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['candidate', 'promotion_decision', 'event_id', 'replayed'],
  properties: {
    candidate: {
      type: 'object',
      additionalProperties: false,
      required: [
        'candidate_id',
        'candidate_revision',
        'asset_type',
        'logical_id',
        'content_hash',
        'status',
        'canonical_revision',
        'created_at',
        'updated_at',
      ],
      properties: {
        candidate_id: nonEmptyString,
        candidate_revision: positiveInt32,
        asset_type: assetType,
        logical_id: nonEmptyString,
        content_hash: hash,
        status: {
          type: 'string',
          enum: [...EXPERIMENT_FOUNDATION_PREPARATION_CANDIDATE_V2_STATUSES],
        },
        canonical_revision: nullableExactAssetRevisionRefSchema,
        created_at: nonEmptyString,
        updated_at: nonEmptyString,
      },
    },
    promotion_decision: {
      type: 'object',
      additionalProperties: false,
      required: [
        'promotion_decision_id',
        'candidate_id',
        'candidate_revision',
        'decision',
        'canonicalization_outcome',
        'canonical_revision',
        'decided_at',
      ],
      properties: {
        promotion_decision_id: nonEmptyString,
        candidate_id: nonEmptyString,
        candidate_revision: positiveInt32,
        decision: {
          type: 'string',
          enum: [...EXPERIMENT_FOUNDATION_PROMOTION_V2_DECISIONS],
        },
        canonicalization_outcome: {
          anyOf: [
            { type: 'string', enum: ['created', 'reused'] },
            { type: 'null' },
          ],
        },
        canonical_revision: nullableExactAssetRevisionRefSchema,
        decided_at: nonEmptyString,
      },
    },
    event_id: nonEmptyString,
    replayed: { type: 'boolean' },
  },
} as const;

export const experimentFoundationPromotionV2ErrorResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      additionalProperties: false,
      required: ['code', 'message'],
      properties: {
        code: nonEmptyString,
        message: nonEmptyString,
        details: { type: 'object', additionalProperties: true },
      },
    },
  },
} as const;
