import {
  EXPERIMENT_FOUNDATION_V2_METRIC_VALUE_TYPES,
  EXPERIMENT_FOUNDATION_V2_REQUIRED_RULE_TYPES,
  type ExperimentFoundationV2ExactAssetRevisionRef,
  type ExperimentFoundationV2MetricValueType,
  type ExperimentFoundationV2RequiredRuleType,
  type ExperimentFoundationScientificComparisonUncertaintyPolicyV1,
} from './experiment-foundation-v2-contracts.js';
import type {
  ExperimentFoundationSourceBoundResultCellV2,
} from './experiment-foundation-scientific-source-v1-contracts.js';
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

export const SCIENTIFIC_COMPARISON_RELATIONS_V1 = [
  'supports_registered_expectation',
  'contradicts_registered_expectation',
  'indeterminate',
] as const;
export type ScientificComparisonRelationV1 =
  (typeof SCIENTIFIC_COMPARISON_RELATIONS_V1)[number];

export const SCIENTIFIC_COMPARISON_RELATION_REASONS_V1 = [
  'support_band_met',
  'contradiction_band_met',
  'decision_gap',
  'uncertainty_interval_not_decisive',
] as const;
export type ScientificComparisonRelationReasonV1 =
  (typeof SCIENTIFIC_COMPARISON_RELATION_REASONS_V1)[number];

export const SCIENTIFIC_COMPARISON_FAILURE_DETAIL_CODES_V1 = [
  'COMPARISON_OBSERVATION_MISSING_OR_DUPLICATED',
  'COMPARISON_OBSERVATION_UNIT_MISMATCH',
  'COMPARISON_OBSERVATION_NON_FINITE',
  'COMPARISON_REQUIRED_CI_MISSING_OR_MISMATCHED',
  'COMPARISON_REQUIRED_CI_INVALID',
] as const;
export type ScientificComparisonFailureDetailCodeV1 =
  (typeof SCIENTIFIC_COMPARISON_FAILURE_DETAIL_CODES_V1)[number];

export interface ScientificDirectionalDifferenceRuleProjectionV1 {
  effect_kind: 'absolute_difference';
  direction: 'higher_is_support' | 'lower_is_support';
  support_min: number;
  contradiction_max: number;
  uncertainty_policy: ExperimentFoundationScientificComparisonUncertaintyPolicyV1;
}

export interface ScientificObservationRefV1 {
  run_cell_id: string;
  result_id: string;
  result_content_hash: string;
  observation_id: string;
  observation_ordinal: number;
  observation_key: string;
  observation_hash: string;
}

export interface ScientificComparisonFactV1 {
  schema_version: 'ExperimentFoundationScientificComparisonFact@v1';
  comparison_fact_id: string;
  ordinal: number;
  comparison_key: string;
  evaluation_protocol_revision_hash: string;
  rule_hash: string;
  rule_projection: ScientificDirectionalDifferenceRuleProjectionV1;
  left_observation_ref: ScientificObservationRefV1;
  right_observation_ref: ScientificObservationRefV1;
  raw_effect: { kind: 'absolute_difference'; value: number; unit: string };
  raw_effect_interval: { lower: number; upper: number; unit: string } | null;
  registered_relation: ScientificComparisonRelationV1;
  relation_reason: ScientificComparisonRelationReasonV1;
  comparison_fact_hash: string;
}

export interface ScientificComparisonRuleResultV1 {
  ordinal: number;
  comparison_key: string;
  rule_hash: string;
  status: 'passed' | 'failed';
  detail_code: ScientificComparisonFailureDetailCodeV1 | null;
  fact: ScientificComparisonFactV1 | null;
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
  /** Absent only on reports committed before the P2 comparison contract. */
  ordered_comparison_results?: ScientificComparisonRuleResultV1[];
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

/** Identity-only product command. Scientific values come from committed source output. */
export interface GenerateExperimentResultV2Request {
  run_cell_id: string;
  scientific_source_output_id: string;
  idempotency_key: string;
}

export type GenerateExperimentResultV2Response =
  ExperimentFoundationSourceBoundResultCellV2;

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

const scientificComparisonUncertaintyPolicyV1Schema = {
  oneOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind'],
      properties: { kind: { type: 'string', const: 'not_required_by_protocol' } },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'confidence_level', 'method_key'],
      properties: {
        kind: { type: 'string', const: 'confidence_interval_guard' },
        confidence_level: { type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 1 },
        method_key: stringId,
      },
    },
  ],
} as const;

export const scientificDirectionalDifferenceRuleProjectionV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'effect_kind', 'direction', 'support_min', 'contradiction_max',
    'uncertainty_policy',
  ],
  properties: {
    effect_kind: { type: 'string', const: 'absolute_difference' },
    direction: { type: 'string', enum: ['higher_is_support', 'lower_is_support'] },
    support_min: { type: 'number' },
    contradiction_max: { type: 'number' },
    uncertainty_policy: scientificComparisonUncertaintyPolicyV1Schema,
  },
} as const;

export const scientificObservationRefV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'run_cell_id', 'result_id', 'result_content_hash', 'observation_id',
    'observation_ordinal', 'observation_key', 'observation_hash',
  ],
  properties: {
    run_cell_id: stringId,
    result_id: stringId,
    result_content_hash: hashSchema,
    observation_id: stringId,
    observation_ordinal: positiveInteger,
    observation_key: stringId,
    observation_hash: hashSchema,
  },
} as const;

export const scientificComparisonFactV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version', 'comparison_fact_id', 'ordinal', 'comparison_key',
    'evaluation_protocol_revision_hash', 'rule_hash', 'rule_projection',
    'left_observation_ref', 'right_observation_ref', 'raw_effect',
    'raw_effect_interval', 'registered_relation', 'relation_reason',
    'comparison_fact_hash',
  ],
  properties: {
    schema_version: {
      type: 'string', const: 'ExperimentFoundationScientificComparisonFact@v1',
    },
    comparison_fact_id: stringId,
    ordinal: positiveInteger,
    comparison_key: stringId,
    evaluation_protocol_revision_hash: hashSchema,
    rule_hash: hashSchema,
    rule_projection: scientificDirectionalDifferenceRuleProjectionV1Schema,
    left_observation_ref: scientificObservationRefV1Schema,
    right_observation_ref: scientificObservationRefV1Schema,
    raw_effect: {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'value', 'unit'],
      properties: {
        kind: { type: 'string', const: 'absolute_difference' },
        value: { type: 'number' },
        unit: stringId,
      },
    },
    raw_effect_interval: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['lower', 'upper', 'unit'],
          properties: {
            lower: { type: 'number' },
            upper: { type: 'number' },
            unit: stringId,
          },
        },
        { type: 'null' },
      ],
    },
    registered_relation: { type: 'string', enum: SCIENTIFIC_COMPARISON_RELATIONS_V1 },
    relation_reason: {
      type: 'string', enum: SCIENTIFIC_COMPARISON_RELATION_REASONS_V1,
    },
    comparison_fact_hash: hashSchema,
  },
  oneOf: [
    {
      properties: {
        registered_relation: {
          type: 'string', const: 'supports_registered_expectation',
        },
        relation_reason: { type: 'string', const: 'support_band_met' },
      },
    },
    {
      properties: {
        registered_relation: {
          type: 'string', const: 'contradicts_registered_expectation',
        },
        relation_reason: { type: 'string', const: 'contradiction_band_met' },
      },
    },
    {
      properties: {
        registered_relation: { type: 'string', const: 'indeterminate' },
        relation_reason: {
          type: 'string', enum: ['decision_gap', 'uncertainty_interval_not_decisive'],
        },
      },
    },
  ],
} as const;

export const scientificComparisonRuleResultV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['ordinal', 'comparison_key', 'rule_hash', 'status', 'detail_code', 'fact'],
  properties: {
    ordinal: positiveInteger,
    comparison_key: stringId,
    rule_hash: hashSchema,
    status: { type: 'string', enum: ['passed', 'failed'] },
    detail_code: {
      anyOf: [
        { type: 'string', enum: SCIENTIFIC_COMPARISON_FAILURE_DETAIL_CODES_V1 },
        { type: 'null' },
      ],
    },
    fact: { anyOf: [scientificComparisonFactV1Schema, { type: 'null' }] },
  },
  oneOf: [
    {
      properties: {
        status: { type: 'string', const: 'passed' },
        detail_code: { type: 'null' },
        fact: scientificComparisonFactV1Schema,
      },
    },
    {
      properties: {
        status: { type: 'string', const: 'failed' },
        detail_code: {
          type: 'string', enum: SCIENTIFIC_COMPARISON_FAILURE_DETAIL_CODES_V1,
        },
        fact: { type: 'null' },
      },
    },
  ],
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
    ordered_comparison_results: {
      type: 'array',
      minItems: 1,
      items: scientificComparisonRuleResultV1Schema,
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

export const generateExperimentResultV2RequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['run_cell_id', 'scientific_source_output_id', 'idempotency_key'],
  properties: {
    run_cell_id: stringId,
    scientific_source_output_id: stringId,
    idempotency_key: stringId,
  },
} as const;

export const validateScientificBatchV2ResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['report', 'evidence_candidate'],
  properties: {
    report: scientificValidationReportV2Schema,
    evidence_candidate: {
      anyOf: [evidenceCandidateV2Schema, { type: 'null' }],
    },
  },
} as const;

// Fastify's response serializer cannot compile the semantic `oneOf` constraints used by
// the canonical comparison schemas. Keep those constraints authoritative for validation
// and persistence, while exposing the same closed field projection to the serializer.
const scientificComparisonUncertaintyPolicyV1ResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind'],
  properties: {
    kind: {
      type: 'string',
      enum: ['not_required_by_protocol', 'confidence_interval_guard'],
    },
    confidence_level: { type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 1 },
    method_key: stringId,
  },
} as const;

const scientificComparisonFactV1ResponseSchema = {
  type: scientificComparisonFactV1Schema.type,
  additionalProperties: scientificComparisonFactV1Schema.additionalProperties,
  required: scientificComparisonFactV1Schema.required,
  properties: {
    ...scientificComparisonFactV1Schema.properties,
    rule_projection: {
      ...scientificDirectionalDifferenceRuleProjectionV1Schema,
      properties: {
        ...scientificDirectionalDifferenceRuleProjectionV1Schema.properties,
        uncertainty_policy: scientificComparisonUncertaintyPolicyV1ResponseSchema,
      },
    },
  },
} as const;

const scientificComparisonRuleResultV1ResponseSchema = {
  type: scientificComparisonRuleResultV1Schema.type,
  additionalProperties: scientificComparisonRuleResultV1Schema.additionalProperties,
  required: scientificComparisonRuleResultV1Schema.required,
  properties: {
    ...scientificComparisonRuleResultV1Schema.properties,
    fact: { anyOf: [scientificComparisonFactV1ResponseSchema, { type: 'null' }] },
  },
} as const;

const scientificValidationReportV2ResponseSchema = {
  ...scientificValidationReportV2Schema,
  properties: {
    ...scientificValidationReportV2Schema.properties,
    ordered_comparison_results: {
      type: 'array',
      minItems: 1,
      items: scientificComparisonRuleResultV1ResponseSchema,
    },
  },
} as const;

export const validateScientificBatchV2ResponseSerializationSchema = {
  ...validateScientificBatchV2ResponseSchema,
  properties: {
    ...validateScientificBatchV2ResponseSchema.properties,
    report: scientificValidationReportV2ResponseSchema,
  },
} as const;

export const scientificValidationV2ErrorResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      additionalProperties: false,
      required: ['code', 'message'],
      properties: {
        code: { type: 'string', minLength: 1 },
        message: { type: 'string', minLength: 1 },
        details: { type: 'object', additionalProperties: true },
      },
    },
  },
} as const;
