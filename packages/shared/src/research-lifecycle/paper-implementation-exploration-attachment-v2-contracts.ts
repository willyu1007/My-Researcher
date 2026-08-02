import { EXPERIMENT_V2_HASH_PATTERN, EXPERIMENT_V2_INT32_MAX } from './experiment-v2-contract-limits.js';
import {
  experimentV2ErrorEnvelopeSchema,
  paperImplementationExperimentWorkOrderAdmissionV2Schema,
  paperImplementationExperimentWorkOrderBranchV2Schema,
  paperImplementationExperimentWorkOrderRevisionCellV2Schema,
  paperImplementationExperimentWorkOrderRevisionV2Schema,
  type PaperImplementationExperimentWorkOrderAdmissionV2,
  type PaperImplementationExperimentWorkOrderBranchV2,
  type PaperImplementationExperimentWorkOrderRevisionCellV2,
  type PaperImplementationExperimentWorkOrderRevisionV2,
} from './paper-implementation-experiment-v2-contracts.js';

export interface PaperImplementationExplorationAttachmentV2Params {
  implementation_project_id: string;
  validation_cycle_id: string;
  spec_id: string;
  spec_revision: number;
}

export interface PaperImplementationExplorationAttachmentV2Request {
  branch_key: string;
  business_idempotency_key: string;
}

export interface PaperImplementationExplorationAttachmentV2 {
  attachment_id: string;
  spec_id: string;
  spec_revision: number;
  spec_revision_id: string;
  spec_content_hash: string;
  implementation_project_id: string;
  validation_cycle_id: string;
  branch_id: string;
  branch_key: string;
  work_order_revision_id: string;
  admission_id: string;
  approved_plan_hash: string;
  attached_at: string;
}

export interface PaperImplementationExplorationAttachmentV2Response {
  attachment: PaperImplementationExplorationAttachmentV2;
  branch: PaperImplementationExperimentWorkOrderBranchV2;
  revision: PaperImplementationExperimentWorkOrderRevisionV2;
  cells: PaperImplementationExperimentWorkOrderRevisionCellV2[];
  admission: PaperImplementationExperimentWorkOrderAdmissionV2;
  replayed: boolean;
}

const stringId = { type: 'string', minLength: 1 } as const;
const hash = { type: 'string', pattern: EXPERIMENT_V2_HASH_PATTERN } as const;
const positiveInt32 = {
  type: 'integer',
  minimum: 1,
  maximum: EXPERIMENT_V2_INT32_MAX,
} as const;

export const paperImplementationExplorationAttachmentV2ParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'implementation_project_id',
    'validation_cycle_id',
    'spec_id',
    'spec_revision',
  ],
  properties: {
    implementation_project_id: stringId,
    validation_cycle_id: stringId,
    spec_id: stringId,
    spec_revision: positiveInt32,
  },
} as const;

export const paperImplementationExplorationAttachmentV2RequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['branch_key', 'business_idempotency_key'],
  properties: {
    branch_key: stringId,
    business_idempotency_key: stringId,
  },
} as const;

export const paperImplementationExplorationAttachmentV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'attachment_id',
    'spec_id',
    'spec_revision',
    'spec_revision_id',
    'spec_content_hash',
    'implementation_project_id',
    'validation_cycle_id',
    'branch_id',
    'branch_key',
    'work_order_revision_id',
    'admission_id',
    'approved_plan_hash',
    'attached_at',
  ],
  properties: {
    attachment_id: stringId,
    spec_id: stringId,
    spec_revision: positiveInt32,
    spec_revision_id: stringId,
    spec_content_hash: hash,
    implementation_project_id: stringId,
    validation_cycle_id: stringId,
    branch_id: stringId,
    branch_key: stringId,
    work_order_revision_id: stringId,
    admission_id: stringId,
    approved_plan_hash: hash,
    attached_at: stringId,
  },
} as const;

export const paperImplementationExplorationAttachmentV2ResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['attachment', 'branch', 'revision', 'cells', 'admission', 'replayed'],
  properties: {
    attachment: paperImplementationExplorationAttachmentV2Schema,
    branch: paperImplementationExperimentWorkOrderBranchV2Schema,
    revision: paperImplementationExperimentWorkOrderRevisionV2Schema,
    cells: {
      type: 'array',
      minItems: 1,
      items: paperImplementationExperimentWorkOrderRevisionCellV2Schema,
    },
    admission: paperImplementationExperimentWorkOrderAdmissionV2Schema,
    replayed: { type: 'boolean' },
  },
} as const;

export const paperImplementationExplorationAttachmentV2ErrorResponseSchema =
  experimentV2ErrorEnvelopeSchema;
