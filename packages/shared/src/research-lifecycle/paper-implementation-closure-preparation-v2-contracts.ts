import {
  PAPER_IMPLEMENTATION_HUMAN_CONFIRMATION_SCOPES,
  type PaperImplementationHumanConfirmationScope,
} from './paper-implementation-human-confirmation-contracts.js';
import {
  paperImplementationExperimentLineageClosureStateV2Schema,
  type PaperImplementationExperimentLineageClosureStateV2,
} from './paper-implementation-experiment-lineage-v2-contracts.js';
import type {
  ValidationCycleReadinessBlockerV2,
} from './paper-implementation-evidence-v2-contracts.js';
import { EXPERIMENT_V2_HASH_PATTERN } from './experiment-v2-contract-limits.js';

export const PAPER_IMPLEMENTATION_AVAILABLE_ACTION_KINDS_V2 = [
  'admit_work_order_revision',
  'start_workflow_simulation',
  'start_real_provider_execution',
  'cancel_execution_attempt',
  'reconcile_execution_attempt',
  'close_validation_cycle',
] as const;
export type PaperImplementationAvailableActionKindV2 =
  (typeof PAPER_IMPLEMENTATION_AVAILABLE_ACTION_KINDS_V2)[number];

export interface ValidationCycleClosurePreparationReadinessV2 {
  outcome: 'ready' | 'blocked';
  blockers: ValidationCycleReadinessBlockerV2[];
}

export interface ScientificClosureBlockedV2 {
  marker: 'scientific_closure_blocked';
  available: false;
  gate: 'M7-L2';
}

export type ValidationCycleDerivedClosureKindV2 =
  | 'control_flow_validated_no_paper_evidence'
  | ScientificClosureBlockedV2
  | null;

/**
 * This is the exact closure POST body shape. The sole caller-owned value is
 * intentionally null in the template and must be filled before submission.
 */
export interface PreparedCloseValidationCycleV2Body {
  validation_cycle_id: string;
  expected_cycle_version: number;
  expected_closure_input_hash: string;
  closure_kind: 'control_flow_validated_no_paper_evidence';
  accepted_proposal_id: null;
  expected_proposal_hash: null;
  corrected_scientific_disposition: null;
  idempotency_key: null;
}

export interface PreparedCloseValidationCycleV2TemplateField {
  field: 'idempotency_key';
  semantic: 'business_idempotency_key';
  required: true;
}

export interface PreparedCloseValidationCycleV2Request {
  body: PreparedCloseValidationCycleV2Body;
  required_template_fields: PreparedCloseValidationCycleV2TemplateField[];
}

export interface ValidationCycleClosurePreparationV2Response {
  readiness: ValidationCycleClosurePreparationReadinessV2;
  derived_closure_kind: ValidationCycleDerivedClosureKindV2;
  prepared_request: PreparedCloseValidationCycleV2Request | null;
}

export interface PaperImplementationAvailableActionSubjectV2 {
  branch_id?: string;
  run_id?: string;
  execution_attempt_id?: string;
}

export interface PaperImplementationAvailableActionV2 {
  action_kind: PaperImplementationAvailableActionKindV2;
  method: 'POST';
  path: string;
  capability_gated: boolean;
  required_human_confirmation_scope: PaperImplementationHumanConfirmationScope | null;
  subject: PaperImplementationAvailableActionSubjectV2;
}

export interface ValidationCycleAvailableActionsV2Response {
  implementation_project_id: string;
  validation_cycle_id: string;
  actions: PaperImplementationAvailableActionV2[];
  closure: PaperImplementationExperimentLineageClosureStateV2;
}

const nonEmptyString = {
  type: 'string',
  minLength: 1,
} as const;
const nonNegativeInteger = {
  type: 'integer',
  minimum: 0,
  maximum: 2_147_483_647,
} as const;
const hashSchema = {
  type: 'string',
  pattern: EXPERIMENT_V2_HASH_PATTERN,
} as const;
const readinessBlockerSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ordinal', 'code', 'branch_id'],
  properties: {
    ordinal: {
      type: 'integer',
      minimum: 1,
      maximum: 2_147_483_647,
    },
    code: {
      type: 'string',
      enum: [
        'BRANCH_HEAD_NOT_FROZEN',
        'CYCLE_ACTIVE_REAL_ATTEMPT',
        'CYCLE_ALREADY_CLOSED',
      ],
    },
    branch_id: {
      anyOf: [nonEmptyString, { type: 'null' }],
    },
  },
} as const;

const preparationReadinessV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['outcome', 'blockers'],
  properties: {
    outcome: {
      type: 'string',
      enum: ['ready', 'blocked'],
    },
    blockers: {
      type: 'array',
      items: readinessBlockerSchema,
    },
  },
} as const;

const scientificClosureBlockedV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['marker', 'available', 'gate'],
  properties: {
    marker: {
      type: 'string',
      const: 'scientific_closure_blocked',
    },
    available: {
      type: 'boolean',
      const: false,
    },
    gate: {
      type: 'string',
      const: 'M7-L2',
    },
  },
} as const;

const preparedCloseValidationCycleV2BodySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'validation_cycle_id',
    'expected_cycle_version',
    'expected_closure_input_hash',
    'closure_kind',
    'accepted_proposal_id',
    'expected_proposal_hash',
    'corrected_scientific_disposition',
    'idempotency_key',
  ],
  properties: {
    validation_cycle_id: nonEmptyString,
    expected_cycle_version: nonNegativeInteger,
    expected_closure_input_hash: hashSchema,
    closure_kind: {
      type: 'string',
      const: 'control_flow_validated_no_paper_evidence',
    },
    accepted_proposal_id: { type: 'null' },
    expected_proposal_hash: { type: 'null' },
    corrected_scientific_disposition: { type: 'null' },
    idempotency_key: { type: 'null' },
  },
} as const;

const preparedCloseValidationCycleV2RequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['body', 'required_template_fields'],
  properties: {
    body: preparedCloseValidationCycleV2BodySchema,
    required_template_fields: {
      type: 'array',
      minItems: 1,
      maxItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['field', 'semantic', 'required'],
        properties: {
          field: { type: 'string', const: 'idempotency_key' },
          semantic: { type: 'string', const: 'business_idempotency_key' },
          required: { type: 'boolean', const: true },
        },
      },
    },
  },
} as const;

export const validationCycleClosurePreparationV2ResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['readiness', 'derived_closure_kind', 'prepared_request'],
  properties: {
    readiness: preparationReadinessV2Schema,
    derived_closure_kind: {
      anyOf: [
        {
          type: 'string',
          const: 'control_flow_validated_no_paper_evidence',
        },
        scientificClosureBlockedV2Schema,
        { type: 'null' },
      ],
    },
    prepared_request: {
      anyOf: [
        preparedCloseValidationCycleV2RequestSchema,
        { type: 'null' },
      ],
    },
  },
} as const;

const availableActionSubjectV2Schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    branch_id: nonEmptyString,
    run_id: nonEmptyString,
    execution_attempt_id: nonEmptyString,
  },
} as const;

const availableActionV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'action_kind',
    'method',
    'path',
    'capability_gated',
    'required_human_confirmation_scope',
    'subject',
  ],
  properties: {
    action_kind: {
      type: 'string',
      enum: [...PAPER_IMPLEMENTATION_AVAILABLE_ACTION_KINDS_V2],
    },
    method: {
      type: 'string',
      const: 'POST',
    },
    path: nonEmptyString,
    capability_gated: { type: 'boolean' },
    required_human_confirmation_scope: {
      anyOf: [
        {
          type: 'string',
          enum: [...PAPER_IMPLEMENTATION_HUMAN_CONFIRMATION_SCOPES],
        },
        { type: 'null' },
      ],
    },
    subject: availableActionSubjectV2Schema,
  },
} as const;

export const validationCycleAvailableActionsV2ResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'implementation_project_id',
    'validation_cycle_id',
    'actions',
    'closure',
  ],
  properties: {
    implementation_project_id: nonEmptyString,
    validation_cycle_id: nonEmptyString,
    actions: {
      type: 'array',
      items: availableActionV2Schema,
    },
    closure: paperImplementationExperimentLineageClosureStateV2Schema,
  },
} as const;
