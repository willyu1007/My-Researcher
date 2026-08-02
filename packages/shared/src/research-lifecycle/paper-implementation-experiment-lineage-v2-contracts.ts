import {
  SCIENTIFIC_DISPOSITIONS_V2,
  VALIDATION_CYCLE_CLOSURE_KINDS_V2,
  type PaperImplementationEvidenceV2ReasonCode,
  type ScientificDispositionV2,
  type ValidationCycleClosureKindV2,
} from './paper-implementation-evidence-v2-contracts.js';
import { EXPERIMENT_V2_HASH_PATTERN } from './experiment-v2-contract-limits.js';

export type PaperImplementationExperimentLineageHeadBlockerV2 = Extract<
  PaperImplementationEvidenceV2ReasonCode,
  'BRANCH_HEAD_NOT_FROZEN'
>;

export interface PaperImplementationExperimentLineageTargetRefV2 {
  type: string;
  id: string;
  version: string | null;
}

export type PaperImplementationExperimentLineageClosureStateV2 =
  | {
    closed: false;
    kind: null;
    disposition: null;
    closed_at: null;
  }
  | {
    closed: true;
    kind: ValidationCycleClosureKindV2;
    disposition: ScientificDispositionV2 | null;
    closed_at: string;
  };

export interface ProjectValidationCycleLineageSummaryV2 {
  validation_cycle_id: string;
  status: string;
  target_ref: PaperImplementationExperimentLineageTargetRefV2;
  created_at: string;
  closure: PaperImplementationExperimentLineageClosureStateV2;
  branch_count: number;
  admitted_branch_count: number;
  total_run_count: number;
  active_real_attempt_count: number;
}

export interface ProjectValidationCyclesLineageV2Response {
  implementation_project_id: string;
  validation_cycles: ProjectValidationCycleLineageSummaryV2[];
}

export interface ValidationCycleExperimentLineageHeaderV2 {
  validation_cycle_id: string;
  status: string;
  target_ref: PaperImplementationExperimentLineageTargetRefV2;
  created_at: string;
  closure: PaperImplementationExperimentLineageClosureStateV2;
}

export interface ValidationCycleExperimentLineageAdmittedRevisionV2 {
  work_order_revision_id: string;
  work_order_revision_hash: string;
  revision_sequence: number;
}

export interface ValidationCycleExperimentLineageRunCellV2 {
  ordinal: number;
  cell_key: string;
  training_task_spec_id: string;
  training_task_spec_hash: string;
}

export interface ValidationCycleExperimentLineageAttemptSummaryV2 {
  execution_attempt_id: string;
  attempt_sequence: number;
  execution_mode: string;
  lifecycle_state: string;
  terminal_reason_code: string | null;
  updated_at: string;
}

export interface ValidationCycleExperimentLineageCollectionSummaryV2 {
  execution_attempt_id: string;
  collection_state: string;
  output_kinds: string[];
}

export interface ValidationCycleExperimentLineageEffectiveHeadRunV2 {
  run_id: string;
  run_manifest_hash: string;
  ordered_cells: ValidationCycleExperimentLineageRunCellV2[];
  ordered_attempts: ValidationCycleExperimentLineageAttemptSummaryV2[];
  collection_summaries: ValidationCycleExperimentLineageCollectionSummaryV2[];
}

export type ValidationCycleExperimentLineageBranchV2 =
  | {
    ordinal: number;
    branch_id: string;
    branch_key: string;
    parent_branch_key: string | null;
    current_admitted_revision: ValidationCycleExperimentLineageAdmittedRevisionV2;
    effective_head_run: ValidationCycleExperimentLineageEffectiveHeadRunV2;
    head_blocker: null;
  }
  | {
    ordinal: number;
    branch_id: string;
    branch_key: string;
    parent_branch_key: string | null;
    current_admitted_revision: ValidationCycleExperimentLineageAdmittedRevisionV2;
    effective_head_run: null;
    head_blocker: PaperImplementationExperimentLineageHeadBlockerV2;
  };

export interface ValidationCycleExperimentLineageV2Response {
  implementation_project_id: string;
  validation_cycle: ValidationCycleExperimentLineageHeaderV2;
  branches: ValidationCycleExperimentLineageBranchV2[];
}

export interface WorkOrderBranchRevisionHistoryAdmissionV2 {
  admitted_at: string;
  business_idempotency_key: string;
}

export interface WorkOrderBranchRevisionHistoryRunRefV2 {
  run_id: string;
  run_manifest_hash: string;
}

export interface WorkOrderBranchRevisionHistoryEntryV2 {
  work_order_revision_id: string;
  revision_sequence: number;
  content_hash: string;
  parent_revision_id: string | null;
  admission: WorkOrderBranchRevisionHistoryAdmissionV2 | null;
  is_current_admitted: boolean;
  is_head_run_source: boolean;
  run_ref: WorkOrderBranchRevisionHistoryRunRefV2 | null;
  cell_count: number;
}

export interface WorkOrderBranchRevisionHistoryV2Response {
  implementation_project_id: string;
  validation_cycle_id: string;
  branch_id: string;
  branch_key: string;
  parent_branch_key: string | null;
  history_includes_superseded_revisions: true;
  revisions: WorkOrderBranchRevisionHistoryEntryV2[];
}

const nonEmptyString = { type: 'string', minLength: 1 } as const;
const nullableString = {
  anyOf: [nonEmptyString, { type: 'null' }],
} as const;
const hashSchema = {
  type: 'string',
  pattern: EXPERIMENT_V2_HASH_PATTERN,
} as const;
const positiveInteger = {
  type: 'integer',
  minimum: 1,
  maximum: 2_147_483_647,
} as const;
const nonNegativeInteger = {
  type: 'integer',
  minimum: 0,
  maximum: 2_147_483_647,
} as const;

export const paperImplementationExperimentLineageTargetRefV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'id', 'version'],
  properties: {
    type: nonEmptyString,
    id: nonEmptyString,
    version: nullableString,
  },
} as const;

export const paperImplementationExperimentLineageClosureStateV2Schema = {
  oneOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['closed', 'kind', 'disposition', 'closed_at'],
      properties: {
        closed: { type: 'boolean', const: false },
        kind: { type: 'null' },
        disposition: { type: 'null' },
        closed_at: { type: 'null' },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['closed', 'kind', 'disposition', 'closed_at'],
      properties: {
        closed: { type: 'boolean', const: true },
        kind: {
          type: 'string',
          enum: [...VALIDATION_CYCLE_CLOSURE_KINDS_V2],
        },
        disposition: {
          anyOf: [
            { type: 'string', enum: [...SCIENTIFIC_DISPOSITIONS_V2] },
            { type: 'null' },
          ],
        },
        closed_at: nonEmptyString,
      },
    },
  ],
} as const;

export const projectValidationCycleLineageSummaryV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'validation_cycle_id',
    'status',
    'target_ref',
    'created_at',
    'closure',
    'branch_count',
    'admitted_branch_count',
    'total_run_count',
    'active_real_attempt_count',
  ],
  properties: {
    validation_cycle_id: nonEmptyString,
    status: nonEmptyString,
    target_ref: paperImplementationExperimentLineageTargetRefV2Schema,
    created_at: nonEmptyString,
    closure: paperImplementationExperimentLineageClosureStateV2Schema,
    branch_count: nonNegativeInteger,
    admitted_branch_count: nonNegativeInteger,
    total_run_count: nonNegativeInteger,
    active_real_attempt_count: nonNegativeInteger,
  },
} as const;

export const projectValidationCyclesLineageV2ResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['implementation_project_id', 'validation_cycles'],
  properties: {
    implementation_project_id: nonEmptyString,
    validation_cycles: {
      type: 'array',
      items: projectValidationCycleLineageSummaryV2Schema,
    },
  },
} as const;

export const validationCycleExperimentLineageHeaderV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['validation_cycle_id', 'status', 'target_ref', 'created_at', 'closure'],
  properties: {
    validation_cycle_id: nonEmptyString,
    status: nonEmptyString,
    target_ref: paperImplementationExperimentLineageTargetRefV2Schema,
    created_at: nonEmptyString,
    closure: paperImplementationExperimentLineageClosureStateV2Schema,
  },
} as const;

export const validationCycleExperimentLineageAdmittedRevisionV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'work_order_revision_id',
    'work_order_revision_hash',
    'revision_sequence',
  ],
  properties: {
    work_order_revision_id: nonEmptyString,
    work_order_revision_hash: hashSchema,
    revision_sequence: positiveInteger,
  },
} as const;

const runCellV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'ordinal',
    'cell_key',
    'training_task_spec_id',
    'training_task_spec_hash',
  ],
  properties: {
    ordinal: positiveInteger,
    cell_key: nonEmptyString,
    training_task_spec_id: nonEmptyString,
    training_task_spec_hash: hashSchema,
  },
} as const;

const attemptSummaryV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'execution_attempt_id',
    'attempt_sequence',
    'execution_mode',
    'lifecycle_state',
    'terminal_reason_code',
    'updated_at',
  ],
  properties: {
    execution_attempt_id: nonEmptyString,
    attempt_sequence: positiveInteger,
    execution_mode: nonEmptyString,
    lifecycle_state: nonEmptyString,
    terminal_reason_code: nullableString,
    updated_at: nonEmptyString,
  },
} as const;

const collectionSummaryV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['execution_attempt_id', 'collection_state', 'output_kinds'],
  properties: {
    execution_attempt_id: nonEmptyString,
    collection_state: nonEmptyString,
    output_kinds: {
      type: 'array',
      uniqueItems: true,
      items: nonEmptyString,
    },
  },
} as const;

export const validationCycleExperimentLineageEffectiveHeadRunV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'run_id',
    'run_manifest_hash',
    'ordered_cells',
    'ordered_attempts',
    'collection_summaries',
  ],
  properties: {
    run_id: nonEmptyString,
    run_manifest_hash: hashSchema,
    ordered_cells: {
      type: 'array',
      minItems: 1,
      items: runCellV2Schema,
    },
    ordered_attempts: {
      type: 'array',
      items: attemptSummaryV2Schema,
    },
    collection_summaries: {
      type: 'array',
      items: collectionSummaryV2Schema,
    },
  },
} as const;

const branchBaseProperties = {
  ordinal: positiveInteger,
  branch_id: nonEmptyString,
  branch_key: nonEmptyString,
  parent_branch_key: nullableString,
  current_admitted_revision: validationCycleExperimentLineageAdmittedRevisionV2Schema,
} as const;

const branchRequired = [
  'ordinal',
  'branch_id',
  'branch_key',
  'parent_branch_key',
  'current_admitted_revision',
  'effective_head_run',
  'head_blocker',
] as const;

const validationCycleExperimentLineageBranchV2Schema = {
  oneOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: branchRequired,
      properties: {
        ...branchBaseProperties,
        effective_head_run: validationCycleExperimentLineageEffectiveHeadRunV2Schema,
        head_blocker: { type: 'null' },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: branchRequired,
      properties: {
        ...branchBaseProperties,
        effective_head_run: { type: 'null' },
        head_blocker: {
          type: 'string',
          const: 'BRANCH_HEAD_NOT_FROZEN',
        },
      },
    },
  ],
} as const;

export const validationCycleExperimentLineageV2ResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['implementation_project_id', 'validation_cycle', 'branches'],
  properties: {
    implementation_project_id: nonEmptyString,
    validation_cycle: validationCycleExperimentLineageHeaderV2Schema,
    branches: {
      type: 'array',
      items: validationCycleExperimentLineageBranchV2Schema,
    },
  },
} as const;

const historyAdmissionV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['admitted_at', 'business_idempotency_key'],
  properties: {
    admitted_at: nonEmptyString,
    business_idempotency_key: nonEmptyString,
  },
} as const;

const historyRunRefV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['run_id', 'run_manifest_hash'],
  properties: {
    run_id: nonEmptyString,
    run_manifest_hash: hashSchema,
  },
} as const;

const historyEntryV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'work_order_revision_id',
    'revision_sequence',
    'content_hash',
    'parent_revision_id',
    'admission',
    'is_current_admitted',
    'is_head_run_source',
    'run_ref',
    'cell_count',
  ],
  properties: {
    work_order_revision_id: nonEmptyString,
    revision_sequence: positiveInteger,
    content_hash: hashSchema,
    parent_revision_id: nullableString,
    admission: {
      anyOf: [historyAdmissionV2Schema, { type: 'null' }],
    },
    is_current_admitted: { type: 'boolean' },
    is_head_run_source: { type: 'boolean' },
    run_ref: {
      anyOf: [historyRunRefV2Schema, { type: 'null' }],
    },
    cell_count: nonNegativeInteger,
  },
} as const;

export const workOrderBranchRevisionHistoryV2ResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'implementation_project_id',
    'validation_cycle_id',
    'branch_id',
    'branch_key',
    'parent_branch_key',
    'history_includes_superseded_revisions',
    'revisions',
  ],
  properties: {
    implementation_project_id: nonEmptyString,
    validation_cycle_id: nonEmptyString,
    branch_id: nonEmptyString,
    branch_key: nonEmptyString,
    parent_branch_key: nullableString,
    history_includes_superseded_revisions: {
      type: 'boolean',
      const: true,
    },
    revisions: {
      type: 'array',
      items: historyEntryV2Schema,
    },
  },
} as const;
