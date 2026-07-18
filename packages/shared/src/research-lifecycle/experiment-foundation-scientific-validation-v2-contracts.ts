import {
  EXPERIMENT_FOUNDATION_V2_METRIC_VALUE_TYPES,
  EXPERIMENT_FOUNDATION_V2_REQUIRED_RULE_TYPES,
  type ExperimentFoundationV2ExactAssetRevisionRef,
  type ExperimentFoundationV2MetricValueType,
  type ExperimentFoundationV2RequiredRuleType,
} from './experiment-foundation-v2-contracts.js';
import {
  EXPERIMENT_V2_HASH_PATTERN,
  EXPERIMENT_V2_INT32_MAX,
} from './experiment-v2-contract-limits.js';

export const EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATOR_PROFILE_VERSION_V2 =
  'scientific_validator_profile@v1' as const;

export const EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_QUALIFIED_EVENT_V2 =
  'EvidenceCandidateQualified@v1' as const;

export const EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PROVENANCES_V2 = [
  'real_provider',
] as const;
export type ExperimentFoundationScientificResultProvenanceV2 =
  (typeof EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PROVENANCES_V2)[number];

export const EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATION_STATUSES_V2 = [
  'passed',
  'failed',
  'unsupported',
] as const;
export type ExperimentFoundationScientificValidationStatusV2 =
  (typeof EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATION_STATUSES_V2)[number];

export const EXPERIMENT_FOUNDATION_SCIENTIFIC_RULE_OUTCOME_STATUSES_V2 = [
  'passed',
  'failed',
  'unsupported',
] as const;
export type ExperimentFoundationScientificRuleOutcomeStatusV2 =
  (typeof EXPERIMENT_FOUNDATION_SCIENTIFIC_RULE_OUTCOME_STATUSES_V2)[number];

export const EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATION_REASON_CODES_V2 = [
  'EF_V2_SCIENTIFIC_VALIDATION_DISABLED',
  'UNSUPPORTED_RULE',
  'VALIDATION_SUBJECT_INCOMPLETE',
  'VALIDATION_SCOPE_DRIFT',
  'VALIDATION_RESULT_CONFLICT',
  'VALIDATION_IDEMPOTENCY_CONFLICT',
  'EVIDENCE_CANDIDATE_NOT_ELIGIBLE',
  'EVIDENCE_PROVENANCE_REJECTED',
] as const;
export type ExperimentFoundationScientificValidationReasonCodeV2 =
  (typeof EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATION_REASON_CODES_V2)[number];

export interface ScientificMetricObservationV2 {
  metric_key: string;
  split_key: string;
  value: number;
  value_type: ExperimentFoundationV2MetricValueType;
  unit: string;
}

export interface ScientificArtifactObservationV2 {
  artifact_kind: string;
  file_name: string;
  content_hash: string;
  byte_size: number;
  parser_binding: string;
}

export interface ExperimentResultCellV2 {
  result_id: string;
  schema_version: 'v1';
  run_id: string;
  run_manifest_hash: string;
  run_cell_id: string;
  cell_key: string;
  training_task_spec_id: string;
  training_task_spec_hash: string;
  execution_attempt_id: string;
  provenance: ExperimentFoundationScientificResultProvenanceV2;
  metric_observations: ScientificMetricObservationV2[];
  artifact_observations: ScientificArtifactObservationV2[];
  content_hash: string;
}

export interface ScientificValidationCellResultRefV2 {
  ordinal: number;
  run_cell_id: string;
  cell_key: string;
  result_id: string;
  result_content_hash: string;
}

export interface ScientificValidationRuleResultV2 {
  ordinal: number;
  rule_id: string;
  rule_type: ExperimentFoundationV2RequiredRuleType;
  status: ExperimentFoundationScientificRuleOutcomeStatusV2;
  detail_code: string | null;
}

export interface ScientificValidationReportV2 {
  report_id: string;
  schema_version: 'v1';
  run_id: string;
  run_manifest_hash: string;
  ordered_cell_results: ScientificValidationCellResultRefV2[];
  evaluation_protocol: ExperimentFoundationV2ExactAssetRevisionRef & {
    asset_type: 'EvaluationProtocol';
  };
  validator_profile_version: typeof EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATOR_PROFILE_VERSION_V2;
  validator_profile_hash: string;
  ordered_rule_results: ScientificValidationRuleResultV2[];
  status: ExperimentFoundationScientificValidationStatusV2;
  validation_hash: string;
}

export interface EvidenceCandidateV2 {
  candidate_id: string;
  schema_version: 'v1';
  run_id: string;
  run_manifest_hash: string;
  validation_report_id: string;
  validation_hash: string;
  content_hash: string;
}

export interface EvidenceCandidateQualifiedV1 {
  event_schema: typeof EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_QUALIFIED_EVENT_V2;
  candidate_id: string;
  candidate_content_hash: string;
  validation_report_id: string;
  validation_hash: string;
  run_id: string;
  run_manifest_hash: string;
  evaluation_protocol_revision_id: string;
  evaluation_protocol_content_hash: string;
}

export interface ValidateScientificBatchV2Request {
  run_id: string;
  expected_run_manifest_hash: string;
  idempotency_key: string;
}

export interface ValidateScientificBatchV2Response {
  report: ScientificValidationReportV2;
  evidence_candidate: EvidenceCandidateV2 | null;
}

const stringId = { type: 'string', minLength: 1 } as const;
const hashSchema = { type: 'string', pattern: EXPERIMENT_V2_HASH_PATTERN } as const;
const nonNegativeInteger = {
  type: 'integer',
  minimum: 0,
  maximum: EXPERIMENT_V2_INT32_MAX,
} as const;
const positiveInteger = {
  type: 'integer',
  minimum: 1,
  maximum: EXPERIMENT_V2_INT32_MAX,
} as const;

export const scientificMetricObservationV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['metric_key', 'split_key', 'value', 'value_type', 'unit'],
  properties: {
    metric_key: stringId,
    split_key: stringId,
    value: { type: 'number' },
    value_type: { type: 'string', enum: EXPERIMENT_FOUNDATION_V2_METRIC_VALUE_TYPES },
    unit: stringId,
  },
} as const;

export const scientificArtifactObservationV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['artifact_kind', 'file_name', 'content_hash', 'byte_size', 'parser_binding'],
  properties: {
    artifact_kind: stringId,
    file_name: stringId,
    content_hash: hashSchema,
    byte_size: nonNegativeInteger,
    parser_binding: stringId,
  },
} as const;

export const experimentResultCellV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'result_id',
    'schema_version',
    'run_id',
    'run_manifest_hash',
    'run_cell_id',
    'cell_key',
    'training_task_spec_id',
    'training_task_spec_hash',
    'execution_attempt_id',
    'provenance',
    'metric_observations',
    'artifact_observations',
    'content_hash',
  ],
  properties: {
    result_id: stringId,
    schema_version: { type: 'string', const: 'v1' },
    run_id: stringId,
    run_manifest_hash: hashSchema,
    run_cell_id: stringId,
    cell_key: stringId,
    training_task_spec_id: stringId,
    training_task_spec_hash: hashSchema,
    execution_attempt_id: stringId,
    provenance: {
      type: 'string',
      enum: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PROVENANCES_V2,
    },
    metric_observations: { type: 'array', items: scientificMetricObservationV2Schema },
    artifact_observations: { type: 'array', items: scientificArtifactObservationV2Schema },
    content_hash: hashSchema,
  },
} as const;

export const scientificValidationCellResultRefV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['ordinal', 'run_cell_id', 'cell_key', 'result_id', 'result_content_hash'],
  properties: {
    ordinal: positiveInteger,
    run_cell_id: stringId,
    cell_key: stringId,
    result_id: stringId,
    result_content_hash: hashSchema,
  },
} as const;

export const scientificValidationRuleResultV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['ordinal', 'rule_id', 'rule_type', 'status', 'detail_code'],
  properties: {
    ordinal: positiveInteger,
    rule_id: stringId,
    rule_type: { type: 'string', enum: EXPERIMENT_FOUNDATION_V2_REQUIRED_RULE_TYPES },
    status: {
      type: 'string',
      enum: EXPERIMENT_FOUNDATION_SCIENTIFIC_RULE_OUTCOME_STATUSES_V2,
    },
    detail_code: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
  },
} as const;

const exactEvaluationProtocolRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['asset_type', 'logical_id', 'revision_id', 'revision_sequence', 'content_hash'],
  properties: {
    asset_type: { type: 'string', const: 'EvaluationProtocol' },
    logical_id: stringId,
    revision_id: stringId,
    revision_sequence: positiveInteger,
    content_hash: hashSchema,
  },
} as const;

export const scientificValidationReportV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'report_id',
    'schema_version',
    'run_id',
    'run_manifest_hash',
    'ordered_cell_results',
    'evaluation_protocol',
    'validator_profile_version',
    'validator_profile_hash',
    'ordered_rule_results',
    'status',
    'validation_hash',
  ],
  properties: {
    report_id: stringId,
    schema_version: { type: 'string', const: 'v1' },
    run_id: stringId,
    run_manifest_hash: hashSchema,
    ordered_cell_results: {
      type: 'array',
      minItems: 1,
      items: scientificValidationCellResultRefV2Schema,
    },
    evaluation_protocol: exactEvaluationProtocolRefSchema,
    validator_profile_version: {
      type: 'string',
      const: EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATOR_PROFILE_VERSION_V2,
    },
    validator_profile_hash: hashSchema,
    ordered_rule_results: {
      type: 'array',
      minItems: 1,
      items: scientificValidationRuleResultV2Schema,
    },
    status: {
      type: 'string',
      enum: EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATION_STATUSES_V2,
    },
    validation_hash: hashSchema,
  },
} as const;

export const evidenceCandidateV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'candidate_id',
    'schema_version',
    'run_id',
    'run_manifest_hash',
    'validation_report_id',
    'validation_hash',
    'content_hash',
  ],
  properties: {
    candidate_id: stringId,
    schema_version: { type: 'string', const: 'v1' },
    run_id: stringId,
    run_manifest_hash: hashSchema,
    validation_report_id: stringId,
    validation_hash: hashSchema,
    content_hash: hashSchema,
  },
} as const;

export const evidenceCandidateQualifiedV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'event_schema',
    'candidate_id',
    'candidate_content_hash',
    'validation_report_id',
    'validation_hash',
    'run_id',
    'run_manifest_hash',
    'evaluation_protocol_revision_id',
    'evaluation_protocol_content_hash',
  ],
  properties: {
    event_schema: {
      type: 'string',
      const: EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_QUALIFIED_EVENT_V2,
    },
    candidate_id: stringId,
    candidate_content_hash: hashSchema,
    validation_report_id: stringId,
    validation_hash: hashSchema,
    run_id: stringId,
    run_manifest_hash: hashSchema,
    evaluation_protocol_revision_id: stringId,
    evaluation_protocol_content_hash: hashSchema,
  },
} as const;

export const validateScientificBatchV2RequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['run_id', 'expected_run_manifest_hash', 'idempotency_key'],
  properties: {
    run_id: stringId,
    expected_run_manifest_hash: hashSchema,
    idempotency_key: stringId,
  },
} as const;
