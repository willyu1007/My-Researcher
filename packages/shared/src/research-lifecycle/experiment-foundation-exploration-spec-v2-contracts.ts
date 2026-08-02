import { EXPERIMENT_V2_HASH_PATTERN, EXPERIMENT_V2_INT32_MAX } from './experiment-v2-contract-limits.js';
import {
  paperImplementationExperimentV2BranchFrameSchema,
  paperImplementationExperimentV2ExactCellInputSchema,
  paperImplementationExperimentV2WorkOrderRevisionSnapshotSchema,
  type PaperImplementationExperimentV2BranchFrame,
  type PaperImplementationExperimentV2ExactCellInput,
  type PaperImplementationExperimentV2WorkOrderRevisionSnapshot,
} from './paper-implementation-experiment-v2-contracts.js';

export interface ExperimentFoundationExplorationSpecContentV1 {
  schema_version: 'v1';
  proposed_branch_frame: PaperImplementationExperimentV2BranchFrame;
  work_order_revision: PaperImplementationExperimentV2WorkOrderRevisionSnapshot;
  exact_cells: PaperImplementationExperimentV2ExactCellInput[];
}

export interface ExperimentFoundationExplorationSpecV2CreateRevisionRequest {
  expected_state_version: number;
  specification: ExperimentFoundationExplorationSpecContentV1;
  business_idempotency_key: string;
}

export interface ExperimentFoundationExplorationSpecIdentityV2 {
  spec_id: string;
  logical_id: string;
  latest_revision: number;
  state_version: number;
  created_at: string;
  updated_at: string;
}

export interface ExperimentFoundationExplorationSpecRevisionV2 {
  revision_id: string;
  spec_id: string;
  logical_id: string;
  spec_revision: number;
  content_hash: string;
  specification: ExperimentFoundationExplorationSpecContentV1;
  created_at: string;
}

export interface ExperimentFoundationExplorationSpecV2CreateRevisionResponse {
  identity: ExperimentFoundationExplorationSpecIdentityV2;
  revision: ExperimentFoundationExplorationSpecRevisionV2;
  replayed: boolean;
}

const nonEmptyString = { type: 'string', minLength: 1 } as const;
const hash = { type: 'string', pattern: EXPERIMENT_V2_HASH_PATTERN } as const;
const nonNegativeInt32 = {
  type: 'integer',
  minimum: 0,
  maximum: EXPERIMENT_V2_INT32_MAX,
} as const;
const positiveInt32 = {
  type: 'integer',
  minimum: 1,
  maximum: EXPERIMENT_V2_INT32_MAX,
} as const;

export const experimentFoundationExplorationSpecV2ParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['logical_id'],
  properties: { logical_id: nonEmptyString },
} as const;

export const experimentFoundationExplorationSpecContentV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'proposed_branch_frame',
    'work_order_revision',
    'exact_cells',
  ],
  properties: {
    schema_version: { type: 'string', const: 'v1' },
    proposed_branch_frame: paperImplementationExperimentV2BranchFrameSchema,
    work_order_revision: paperImplementationExperimentV2WorkOrderRevisionSnapshotSchema,
    exact_cells: {
      type: 'array',
      minItems: 1,
      items: paperImplementationExperimentV2ExactCellInputSchema,
    },
  },
} as const;

export const experimentFoundationExplorationSpecV2CreateRevisionRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['expected_state_version', 'specification', 'business_idempotency_key'],
  properties: {
    expected_state_version: nonNegativeInt32,
    specification: experimentFoundationExplorationSpecContentV1Schema,
    business_idempotency_key: nonEmptyString,
  },
} as const;

const identitySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'spec_id',
    'logical_id',
    'latest_revision',
    'state_version',
    'created_at',
    'updated_at',
  ],
  properties: {
    spec_id: nonEmptyString,
    logical_id: nonEmptyString,
    latest_revision: positiveInt32,
    state_version: positiveInt32,
    created_at: nonEmptyString,
    updated_at: nonEmptyString,
  },
} as const;

const revisionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'revision_id',
    'spec_id',
    'logical_id',
    'spec_revision',
    'content_hash',
    'specification',
    'created_at',
  ],
  properties: {
    revision_id: nonEmptyString,
    spec_id: nonEmptyString,
    logical_id: nonEmptyString,
    spec_revision: positiveInt32,
    content_hash: hash,
    specification: experimentFoundationExplorationSpecContentV1Schema,
    created_at: nonEmptyString,
  },
} as const;

export const experimentFoundationExplorationSpecV2CreateRevisionResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['identity', 'revision', 'replayed'],
  properties: {
    identity: identitySchema,
    revision: revisionSchema,
    replayed: { type: 'boolean' },
  },
} as const;

export const experimentFoundationExplorationSpecV2ErrorResponseSchema = {
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
