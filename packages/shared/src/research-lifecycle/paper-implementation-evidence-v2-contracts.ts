import {
  EXPERIMENT_V2_HASH_PATTERN,
  EXPERIMENT_V2_INT32_MAX,
} from './experiment-v2-contract-limits.js';

export const PAPER_IMPLEMENTATION_EVIDENCE_EVENT_V2 = 'ValidationCycleClosed@v1' as const;

export const PAPER_IMPLEMENTATION_EVIDENCE_V2_REASON_CODES = [
  'EVIDENCE_CANDIDATE_NOT_ELIGIBLE',
  'EVIDENCE_PROVENANCE_REJECTED',
  'BRANCH_HEAD_NOT_FROZEN',
  'CYCLE_ACTIVE_REAL_ATTEMPT',
  'CYCLE_CLOSURE_SCOPE_DRIFT',
  'CYCLE_ALREADY_CLOSED',
  'CLOSURE_PROPOSAL_STALE',
] as const;
export type PaperImplementationEvidenceV2ReasonCode =
  (typeof PAPER_IMPLEMENTATION_EVIDENCE_V2_REASON_CODES)[number];

export const VALIDATION_CYCLE_CLOSURE_KINDS_V2 = [
  'control_flow_validated_no_paper_evidence',
  'scientific_evidence_assessed',
] as const;
export type ValidationCycleClosureKindV2 = (typeof VALIDATION_CYCLE_CLOSURE_KINDS_V2)[number];

export const SCIENTIFIC_DISPOSITIONS_V2 = ['positive', 'negative', 'inconclusive'] as const;
export type ScientificDispositionV2 = (typeof SCIENTIFIC_DISPOSITIONS_V2)[number];

export const EVIDENCE_TRACE_REF_KINDS_V2 = [
  'evidence_candidate',
  'scientific_validation_report',
  'run',
  'run_cell',
  'work_order_revision',
  'evaluation_protocol_revision',
] as const;
export type EvidenceTraceRefKindV2 = (typeof EVIDENCE_TRACE_REF_KINDS_V2)[number];

/**
 * D-16: a RunEvidenceUnit is trusted evidence identity/lineage only. It never
 * carries run_status, scientific disposition, trust flags or failure summaries;
 * those axes live on EF execution facts and the Cycle closure respectively.
 */
export interface PaperImplementationRunEvidenceUnitV2 {
  run_evidence_unit_id: string;
  schema_version: 'v1';
  implementation_project_id: string;
  validation_cycle_id: string;
  branch_id: string;
  work_order_revision_id: string;
  work_order_revision_hash: string;
  branch_revision_sequence: number;
  run_id: string;
  run_manifest_hash: string;
  evidence_candidate_id: string;
  evidence_candidate_content_hash: string;
  validation_report_id: string;
  validation_hash: string;
  evaluation_protocol_revision_id: string;
  evaluation_protocol_content_hash: string;
  content_hash: string;
}

export interface PaperImplementationEvidenceTraceRefV2 {
  ordinal: number;
  ref_kind: EvidenceTraceRefKindV2;
  ref_id: string;
  ref_hash: string;
}

export interface PaperImplementationEvidenceTraceManifestV2 {
  trace_manifest_id: string;
  schema_version: 'v1';
  run_evidence_unit_id: string;
  ordered_trace_refs: PaperImplementationEvidenceTraceRefV2[];
  content_hash: string;
}

export interface RunEvidenceUnitRegisteredV1 {
  run_evidence_unit_id: string;
  content_hash: string;
  validation_cycle_id: string;
  run_id: string;
  run_manifest_hash: string;
  evidence_candidate_id: string;
}

/** Identity-only gateway ingress; server re-resolves every fact from EF. */
export interface IngestQualifiedEvidenceCandidateV2Request {
  evidence_candidate_id: string;
  expected_candidate_content_hash: string;
  idempotency_key: string;
}

export interface IngestQualifiedEvidenceCandidateV2Response {
  run_evidence_unit: PaperImplementationRunEvidenceUnitV2;
  trace_manifest: PaperImplementationEvidenceTraceManifestV2;
}

export interface ClosureAttemptAccountingV2 {
  ordinal: number;
  execution_attempt_id: string;
  lifecycle_state: string;
  execution_mode: string;
  provenance: string;
}

export interface ClosureCellAccountingV2 {
  ordinal: number;
  run_cell_id: string;
  cell_key: string;
  ordered_attempts: ClosureAttemptAccountingV2[];
  complete_result_ref: { result_id: string; result_content_hash: string } | null;
  eligibility_code: string | null;
}

export interface ValidationCycleClosureBranchEntryV2 {
  ordinal: number;
  branch_id: string;
  branch_key: string;
  current_admitted_revision_id: string;
  current_admitted_revision_hash: string;
  branch_revision_sequence: number;
  effective_head_run_id: string | null;
  effective_head_run_manifest_hash: string | null;
  head_blocker: 'BRANCH_HEAD_NOT_FROZEN' | null;
  ordered_cells: ClosureCellAccountingV2[];
  eligible_run_evidence_unit_refs: Array<{
    run_evidence_unit_id: string;
    content_hash: string;
  }>;
}

/**
 * D-18: the closure authority is the complete current effective decision scope
 * at one CAS watermark — admitted branches with current revisions and matching
 * effective heads only. Non-head history is excluded by construction.
 */
export interface ValidationCycleClosureWatermarkV2 {
  schema_version: 'v1';
  validation_cycle_id: string;
  expected_cycle_version: number;
  ordered_branches: ValidationCycleClosureBranchEntryV2[];
  active_real_attempt_count: number;
  closure_input_hash: string;
}

export const VALIDATION_CYCLE_READINESS_STATUSES_V2 = [
  'ready_no_evidence',
  'ready_with_evidence',
  'blocked',
] as const;
export type ValidationCycleReadinessStatusV2 =
  (typeof VALIDATION_CYCLE_READINESS_STATUSES_V2)[number];

export interface ValidationCycleReadinessBlockerV2 {
  ordinal: number;
  code: Extract<
    PaperImplementationEvidenceV2ReasonCode,
    'BRANCH_HEAD_NOT_FROZEN' | 'CYCLE_ACTIVE_REAL_ATTEMPT' | 'CYCLE_ALREADY_CLOSED'
  >;
  branch_id: string | null;
}

/**
 * Server-derived, rebuildable readiness evaluation (PC20): never persisted as
 * caller-writable state and never a second human-decision authority.
 */
export interface ValidationCycleReadinessEvaluationV2 {
  schema_version: 'v1';
  validation_cycle_id: string;
  status: ValidationCycleReadinessStatusV2;
  ordered_blockers: ValidationCycleReadinessBlockerV2[];
  watermark: ValidationCycleClosureWatermarkV2;
  eligible_run_evidence_unit_count: number;
}

/**
 * The one closure AuthorityAction input. Callers carry identity, CAS
 * expectations and the human accept/correct decision only; `cycle_assessment`,
 * `decision_exit` and free-form outputs are not representable.
 */
export interface CloseValidationCycleV2Request {
  validation_cycle_id?: string;
  expected_cycle_version: number;
  expected_closure_input_hash: string;
  closure_kind: ValidationCycleClosureKindV2;
  accepted_proposal_id: string | null;
  expected_proposal_hash: string | null;
  corrected_scientific_disposition: ScientificDispositionV2 | null;
  idempotency_key: string;
}

export interface ValidationCycleClosureV2 {
  closure_id: string;
  schema_version: 'v1';
  validation_cycle_id: string;
  cycle_version_at_closure: number;
  closure_kind: ValidationCycleClosureKindV2;
  scientific_disposition: ScientificDispositionV2 | null;
  selected_exit_key: string | null;
  accepted_proposal_id: string | null;
  accepted_proposal_hash: string | null;
  closure_watermark: ValidationCycleClosureWatermarkV2;
  closure_snapshot_hash: string;
}

export interface CloseValidationCycleV2Response {
  closure: ValidationCycleClosureV2;
}

export interface ValidationCycleClosedV1 {
  event_schema: typeof PAPER_IMPLEMENTATION_EVIDENCE_EVENT_V2;
  validation_cycle_id: string;
  closure_id: string;
  closure_snapshot_hash: string;
  closure_kind: ValidationCycleClosureKindV2;
  scientific_disposition: ScientificDispositionV2 | null;
  closure_input_hash: string;
}

const stringId = { type: 'string', minLength: 1 } as const;
const hashSchema = { type: 'string', pattern: EXPERIMENT_V2_HASH_PATTERN } as const;
const nullableStringId = { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] } as const;
const nullableHash = {
  anyOf: [{ type: 'string', pattern: EXPERIMENT_V2_HASH_PATTERN }, { type: 'null' }],
} as const;
const positiveInteger = {
  type: 'integer',
  minimum: 1,
  maximum: EXPERIMENT_V2_INT32_MAX,
} as const;
const nonNegativeInteger = {
  type: 'integer',
  minimum: 0,
  maximum: EXPERIMENT_V2_INT32_MAX,
} as const;

export const paperImplementationRunEvidenceUnitV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'run_evidence_unit_id',
    'schema_version',
    'implementation_project_id',
    'validation_cycle_id',
    'branch_id',
    'work_order_revision_id',
    'work_order_revision_hash',
    'branch_revision_sequence',
    'run_id',
    'run_manifest_hash',
    'evidence_candidate_id',
    'evidence_candidate_content_hash',
    'validation_report_id',
    'validation_hash',
    'evaluation_protocol_revision_id',
    'evaluation_protocol_content_hash',
    'content_hash',
  ],
  properties: {
    run_evidence_unit_id: stringId,
    schema_version: { type: 'string', const: 'v1' },
    implementation_project_id: stringId,
    validation_cycle_id: stringId,
    branch_id: stringId,
    work_order_revision_id: stringId,
    work_order_revision_hash: hashSchema,
    branch_revision_sequence: positiveInteger,
    run_id: stringId,
    run_manifest_hash: hashSchema,
    evidence_candidate_id: stringId,
    evidence_candidate_content_hash: hashSchema,
    validation_report_id: stringId,
    validation_hash: hashSchema,
    evaluation_protocol_revision_id: stringId,
    evaluation_protocol_content_hash: hashSchema,
    content_hash: hashSchema,
  },
} as const;

export const paperImplementationEvidenceTraceManifestV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'trace_manifest_id',
    'schema_version',
    'run_evidence_unit_id',
    'ordered_trace_refs',
    'content_hash',
  ],
  properties: {
    trace_manifest_id: stringId,
    schema_version: { type: 'string', const: 'v1' },
    run_evidence_unit_id: stringId,
    ordered_trace_refs: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['ordinal', 'ref_kind', 'ref_id', 'ref_hash'],
        properties: {
          ordinal: positiveInteger,
          ref_kind: { type: 'string', enum: EVIDENCE_TRACE_REF_KINDS_V2 },
          ref_id: stringId,
          ref_hash: hashSchema,
        },
      },
    },
    content_hash: hashSchema,
  },
} as const;

export const runEvidenceUnitRegisteredV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'run_evidence_unit_id',
    'content_hash',
    'validation_cycle_id',
    'run_id',
    'run_manifest_hash',
    'evidence_candidate_id',
  ],
  properties: {
    run_evidence_unit_id: stringId,
    content_hash: hashSchema,
    validation_cycle_id: stringId,
    run_id: stringId,
    run_manifest_hash: hashSchema,
    evidence_candidate_id: stringId,
  },
} as const;

export const ingestQualifiedEvidenceCandidateV2RequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['evidence_candidate_id', 'expected_candidate_content_hash', 'idempotency_key'],
  properties: {
    evidence_candidate_id: stringId,
    expected_candidate_content_hash: hashSchema,
    idempotency_key: stringId,
  },
} as const;

const closureAttemptAccountingV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['ordinal', 'execution_attempt_id', 'lifecycle_state', 'execution_mode', 'provenance'],
  properties: {
    ordinal: positiveInteger,
    execution_attempt_id: stringId,
    lifecycle_state: stringId,
    execution_mode: stringId,
    provenance: stringId,
  },
} as const;

const closureCellAccountingV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'ordinal',
    'run_cell_id',
    'cell_key',
    'ordered_attempts',
    'complete_result_ref',
    'eligibility_code',
  ],
  properties: {
    ordinal: positiveInteger,
    run_cell_id: stringId,
    cell_key: stringId,
    ordered_attempts: { type: 'array', items: closureAttemptAccountingV2Schema },
    complete_result_ref: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['result_id', 'result_content_hash'],
          properties: { result_id: stringId, result_content_hash: hashSchema },
        },
        { type: 'null' },
      ],
    },
    eligibility_code: nullableStringId,
  },
} as const;

const validationCycleClosureBranchEntryV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'ordinal',
    'branch_id',
    'branch_key',
    'current_admitted_revision_id',
    'current_admitted_revision_hash',
    'branch_revision_sequence',
    'effective_head_run_id',
    'effective_head_run_manifest_hash',
    'head_blocker',
    'ordered_cells',
    'eligible_run_evidence_unit_refs',
  ],
  properties: {
    ordinal: positiveInteger,
    branch_id: stringId,
    branch_key: stringId,
    current_admitted_revision_id: stringId,
    current_admitted_revision_hash: hashSchema,
    branch_revision_sequence: positiveInteger,
    effective_head_run_id: nullableStringId,
    effective_head_run_manifest_hash: nullableHash,
    head_blocker: {
      anyOf: [{ type: 'string', const: 'BRANCH_HEAD_NOT_FROZEN' }, { type: 'null' }],
    },
    ordered_cells: { type: 'array', items: closureCellAccountingV2Schema },
    eligible_run_evidence_unit_refs: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['run_evidence_unit_id', 'content_hash'],
        properties: { run_evidence_unit_id: stringId, content_hash: hashSchema },
      },
    },
  },
} as const;

export const validationCycleClosureWatermarkV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'validation_cycle_id',
    'expected_cycle_version',
    'ordered_branches',
    'active_real_attempt_count',
    'closure_input_hash',
  ],
  properties: {
    schema_version: { type: 'string', const: 'v1' },
    validation_cycle_id: stringId,
    expected_cycle_version: nonNegativeInteger,
    ordered_branches: { type: 'array', minItems: 1, items: validationCycleClosureBranchEntryV2Schema },
    active_real_attempt_count: nonNegativeInteger,
    closure_input_hash: hashSchema,
  },
} as const;

export const validationCycleReadinessEvaluationV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'validation_cycle_id',
    'status',
    'ordered_blockers',
    'watermark',
    'eligible_run_evidence_unit_count',
  ],
  properties: {
    schema_version: { type: 'string', const: 'v1' },
    validation_cycle_id: stringId,
    status: { type: 'string', enum: VALIDATION_CYCLE_READINESS_STATUSES_V2 },
    ordered_blockers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['ordinal', 'code', 'branch_id'],
        properties: {
          ordinal: positiveInteger,
          code: {
            type: 'string',
            enum: ['BRANCH_HEAD_NOT_FROZEN', 'CYCLE_ACTIVE_REAL_ATTEMPT', 'CYCLE_ALREADY_CLOSED'],
          },
          branch_id: nullableStringId,
        },
      },
    },
    watermark: validationCycleClosureWatermarkV2Schema,
    eligible_run_evidence_unit_count: nonNegativeInteger,
  },
} as const;

export const closeValidationCycleV2RequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'expected_cycle_version',
    'expected_closure_input_hash',
    'closure_kind',
    'accepted_proposal_id',
    'expected_proposal_hash',
    'corrected_scientific_disposition',
    'idempotency_key',
  ],
  properties: {
    validation_cycle_id: stringId,
    expected_cycle_version: nonNegativeInteger,
    expected_closure_input_hash: hashSchema,
    closure_kind: { type: 'string', enum: VALIDATION_CYCLE_CLOSURE_KINDS_V2 },
    accepted_proposal_id: nullableStringId,
    expected_proposal_hash: nullableHash,
    corrected_scientific_disposition: {
      anyOf: [{ type: 'string', enum: SCIENTIFIC_DISPOSITIONS_V2 }, { type: 'null' }],
    },
    idempotency_key: stringId,
  },
} as const;

export const validationCycleClosureV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'closure_id',
    'schema_version',
    'validation_cycle_id',
    'cycle_version_at_closure',
    'closure_kind',
    'scientific_disposition',
    'selected_exit_key',
    'accepted_proposal_id',
    'accepted_proposal_hash',
    'closure_watermark',
    'closure_snapshot_hash',
  ],
  properties: {
    closure_id: stringId,
    schema_version: { type: 'string', const: 'v1' },
    validation_cycle_id: stringId,
    cycle_version_at_closure: nonNegativeInteger,
    closure_kind: { type: 'string', enum: VALIDATION_CYCLE_CLOSURE_KINDS_V2 },
    scientific_disposition: {
      anyOf: [{ type: 'string', enum: SCIENTIFIC_DISPOSITIONS_V2 }, { type: 'null' }],
    },
    selected_exit_key: nullableStringId,
    accepted_proposal_id: nullableStringId,
    accepted_proposal_hash: nullableHash,
    closure_watermark: validationCycleClosureWatermarkV2Schema,
    closure_snapshot_hash: hashSchema,
  },
} as const;

export const closeValidationCycleV2ResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['closure'],
  properties: {
    closure: validationCycleClosureV2Schema,
  },
} as const;

export const validationCycleClosedV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'event_schema',
    'validation_cycle_id',
    'closure_id',
    'closure_snapshot_hash',
    'closure_kind',
    'scientific_disposition',
    'closure_input_hash',
  ],
  properties: {
    event_schema: { type: 'string', const: PAPER_IMPLEMENTATION_EVIDENCE_EVENT_V2 },
    validation_cycle_id: stringId,
    closure_id: stringId,
    closure_snapshot_hash: hashSchema,
    closure_kind: { type: 'string', enum: VALIDATION_CYCLE_CLOSURE_KINDS_V2 },
    scientific_disposition: {
      anyOf: [{ type: 'string', enum: SCIENTIFIC_DISPOSITIONS_V2 }, { type: 'null' }],
    },
    closure_input_hash: hashSchema,
  },
} as const;
