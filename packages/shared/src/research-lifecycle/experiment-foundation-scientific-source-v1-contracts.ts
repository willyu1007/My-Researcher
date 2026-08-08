import type {
  ExperimentFoundationV2ExactAssetRevisionRef,
  ExperimentFoundationV2MetricValueType,
} from './experiment-foundation-v2-contracts.js';
import {
  EXPERIMENT_FOUNDATION_V2_METRIC_VALUE_TYPES,
} from './experiment-foundation-v2-contracts.js';
import {
  EXPERIMENT_V2_HASH_PATTERN,
  EXPERIMENT_V2_INT32_MAX,
} from './experiment-v2-contract-limits.js';

export const EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_VERSION_V1 =
  'ExperimentFoundationScientificResultPayload@v1' as const;
export const EXPERIMENT_FOUNDATION_SCIENTIFIC_SOURCE_MANIFEST_SCHEMA_V1 =
  'ExperimentFoundationScientificSourceManifest@v1' as const;

export type ScientificStatisticV1 =
  | { kind: 'point'; sample_size: 1 }
  | {
    kind: 'mean' | 'median' | 'proportion' | 'minimum' | 'maximum' | 'sum';
    sample_size: number;
  }
  | { kind: 'quantile'; sample_size: number; probability: number };

export type ScientificUncertaintyV1 =
  | { kind: 'none'; reason: 'not_required_by_protocol' }
  | { kind: 'standard_deviation' | 'standard_error'; value: number }
  | {
    kind: 'confidence_interval';
    level: number;
    lower: number;
    upper: number;
    method_key: string;
  };

export interface ScientificResultObservationPayloadV1 {
  observation_key: string;
  metric_key: string;
  split_key: string;
  value: number;
  value_type: ExperimentFoundationV2MetricValueType;
  unit: string;
  statistic: ScientificStatisticV1;
  uncertainty: ScientificUncertaintyV1;
}

export interface ScientificResultArtifactPayloadV1 {
  artifact_key: string;
  artifact_kind: string;
  content_hash: string;
  byte_size: number;
  media_type: string;
}

/** Provider-independent structural payload nested under envelope.outputs.scientific_result. */
export interface ExperimentFoundationScientificResultPayloadV1 {
  schema_version: typeof EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_VERSION_V1;
  observations: ScientificResultObservationPayloadV1[];
  artifacts: ScientificResultArtifactPayloadV1[];
}

export interface ScientificObservationV1 extends ScientificResultObservationPayloadV1 {
  observation_id: string;
  ordinal: number;
}

export interface ScientificArtifactRefV1 extends ScientificResultArtifactPayloadV1 {
  ordinal: number;
}

export interface ScientificSourceManifestV1 extends Readonly<Record<string, unknown>> {
  manifest_schema_version:
    typeof EXPERIMENT_FOUNDATION_SCIENTIFIC_SOURCE_MANIFEST_SCHEMA_V1;
  output_kind: 'scientific_result_manifest';
  output_class: 'scientific_source';
  authority: {
    collection_attempt_id: string;
    execution_attempt_id: string;
    provenance: 'real_provider';
  };
  execution_lineage: {
    execution_bundle_revision_id: string;
    execution_bundle_revision_hash: string;
    run_id: string;
    run_manifest_hash: string;
    run_cell_id: string;
    cell_key: string;
    cell_ordinal: number;
    training_task_spec_id: string;
    training_task_spec_hash: string;
  };
  evaluation_protocol: {
    evaluation_protocol_id: string;
    revision_id: string;
    revision_sequence: number;
    content_hash: string;
  };
  interpretation_binding: {
    provider_result_envelope_schema: string;
    parser_profile_version: string;
    parser_profile_hash: string;
    scientific_result_schema_version: string;
    scientific_result_schema_hash: string;
  };
  upstream: { provider_result_manifest_hash: string };
  ordered_observations: ScientificObservationV1[];
  ordered_artifacts: ScientificArtifactRefV1[];
}

export interface ExperimentFoundationSourceBoundResultCellV2 {
  result_id: string;
  schema_version: 'v2';
  run_id: string;
  run_manifest_hash: string;
  run_cell_id: string;
  cell_key: string;
  training_task_spec_id: string;
  training_task_spec_hash: string;
  execution_attempt_id: string;
  collection_attempt_id: string;
  source_output_id: string;
  source_output_hash: string;
  source_output_kind: 'scientific_result_manifest';
  source_output_class: 'scientific_source';
  parser_profile_version: string;
  parser_profile_hash: string;
  evaluation_protocol: ExperimentFoundationV2ExactAssetRevisionRef & {
    asset_type: 'EvaluationProtocol';
  };
  provenance: 'real_provider';
  metric_observations: ScientificObservationV1[];
  artifact_observations: ScientificArtifactRefV1[];
  derivation_hash: string;
  content_hash: string;
}

const stringId = { type: 'string', minLength: 1 } as const;
const hashSchema = { type: 'string', pattern: EXPERIMENT_V2_HASH_PATTERN } as const;
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
const finiteNumber = { type: 'number' } as const;

export const scientificStatisticV1Schema = {
  oneOf: [
    {
      type: 'object', additionalProperties: false, required: ['kind', 'sample_size'],
      properties: {
        kind: { type: 'string', const: 'point' },
        sample_size: { type: 'integer', const: 1 },
      },
    },
    {
      type: 'object', additionalProperties: false, required: ['kind', 'sample_size'],
      properties: {
        kind: {
          type: 'string',
          enum: ['mean', 'median', 'proportion', 'minimum', 'maximum', 'sum'],
        },
        sample_size: positiveInteger,
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'sample_size', 'probability'],
      properties: {
        kind: { type: 'string', const: 'quantile' },
        sample_size: positiveInteger,
        probability: { type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 1 },
      },
    },
  ],
} as const;

export const scientificUncertaintyV1Schema = {
  oneOf: [
    {
      type: 'object', additionalProperties: false, required: ['kind', 'reason'],
      properties: {
        kind: { type: 'string', const: 'none' },
        reason: { type: 'string', const: 'not_required_by_protocol' },
      },
    },
    {
      type: 'object', additionalProperties: false, required: ['kind', 'value'],
      properties: {
        kind: { type: 'string', enum: ['standard_deviation', 'standard_error'] },
        value: { type: 'number', minimum: 0 },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'level', 'lower', 'upper', 'method_key'],
      properties: {
        kind: { type: 'string', const: 'confidence_interval' },
        level: { type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 1 },
        lower: finiteNumber,
        upper: finiteNumber,
        method_key: stringId,
      },
    },
  ],
} as const;

export const scientificResultObservationPayloadV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'observation_key', 'metric_key', 'split_key', 'value', 'value_type', 'unit',
    'statistic', 'uncertainty',
  ],
  properties: {
    observation_key: stringId,
    metric_key: stringId,
    split_key: stringId,
    value: finiteNumber,
    value_type: { type: 'string', enum: [...EXPERIMENT_FOUNDATION_V2_METRIC_VALUE_TYPES] },
    unit: stringId,
    statistic: scientificStatisticV1Schema,
    uncertainty: scientificUncertaintyV1Schema,
  },
} as const;

export const scientificResultArtifactPayloadV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['artifact_key', 'artifact_kind', 'content_hash', 'byte_size', 'media_type'],
  properties: {
    artifact_key: stringId,
    artifact_kind: stringId,
    content_hash: hashSchema,
    byte_size: nonNegativeInteger,
    media_type: stringId,
  },
} as const;

export const experimentFoundationScientificResultPayloadV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['schema_version', 'observations', 'artifacts'],
  properties: {
    schema_version: {
      type: 'string',
      const: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_VERSION_V1,
    },
    observations: {
      type: 'array', minItems: 1, items: scientificResultObservationPayloadV1Schema,
    },
    artifacts: { type: 'array', items: scientificResultArtifactPayloadV1Schema },
  },
} as const;

const scientificObservationV1Schema = {
  ...scientificResultObservationPayloadV1Schema,
  required: [
    'observation_id', 'ordinal',
    ...scientificResultObservationPayloadV1Schema.required,
  ],
  properties: {
    observation_id: stringId,
    ordinal: positiveInteger,
    ...scientificResultObservationPayloadV1Schema.properties,
  },
} as const;

const scientificArtifactRefV1Schema = {
  ...scientificResultArtifactPayloadV1Schema,
  required: ['ordinal', ...scientificResultArtifactPayloadV1Schema.required],
  properties: {
    ordinal: positiveInteger,
    ...scientificResultArtifactPayloadV1Schema.properties,
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

export const scientificSourceManifestV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'manifest_schema_version', 'output_kind', 'output_class', 'authority',
    'execution_lineage', 'evaluation_protocol', 'interpretation_binding', 'upstream',
    'ordered_observations', 'ordered_artifacts',
  ],
  properties: {
    manifest_schema_version: {
      type: 'string', const: EXPERIMENT_FOUNDATION_SCIENTIFIC_SOURCE_MANIFEST_SCHEMA_V1,
    },
    output_kind: { type: 'string', const: 'scientific_result_manifest' },
    output_class: { type: 'string', const: 'scientific_source' },
    authority: {
      type: 'object', additionalProperties: false,
      required: ['collection_attempt_id', 'execution_attempt_id', 'provenance'],
      properties: {
        collection_attempt_id: stringId,
        execution_attempt_id: stringId,
        provenance: { type: 'string', const: 'real_provider' },
      },
    },
    execution_lineage: {
      type: 'object', additionalProperties: false,
      required: [
        'execution_bundle_revision_id', 'execution_bundle_revision_hash', 'run_id',
        'run_manifest_hash', 'run_cell_id', 'cell_key', 'cell_ordinal',
        'training_task_spec_id', 'training_task_spec_hash',
      ],
      properties: {
        execution_bundle_revision_id: stringId,
        execution_bundle_revision_hash: hashSchema,
        run_id: stringId,
        run_manifest_hash: hashSchema,
        run_cell_id: stringId,
        cell_key: stringId,
        cell_ordinal: positiveInteger,
        training_task_spec_id: stringId,
        training_task_spec_hash: hashSchema,
      },
    },
    evaluation_protocol: {
      type: 'object', additionalProperties: false,
      required: ['evaluation_protocol_id', 'revision_id', 'revision_sequence', 'content_hash'],
      properties: {
        evaluation_protocol_id: stringId,
        revision_id: stringId,
        revision_sequence: positiveInteger,
        content_hash: hashSchema,
      },
    },
    interpretation_binding: {
      type: 'object', additionalProperties: false,
      required: [
        'provider_result_envelope_schema', 'parser_profile_version', 'parser_profile_hash',
        'scientific_result_schema_version', 'scientific_result_schema_hash',
      ],
      properties: {
        provider_result_envelope_schema: stringId,
        parser_profile_version: stringId,
        parser_profile_hash: hashSchema,
        scientific_result_schema_version: stringId,
        scientific_result_schema_hash: hashSchema,
      },
    },
    upstream: {
      type: 'object', additionalProperties: false,
      required: ['provider_result_manifest_hash'],
      properties: { provider_result_manifest_hash: hashSchema },
    },
    ordered_observations: {
      type: 'array', minItems: 1, items: scientificObservationV1Schema,
    },
    ordered_artifacts: { type: 'array', items: scientificArtifactRefV1Schema },
  },
} as const;

export const experimentFoundationSourceBoundResultCellV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'result_id', 'schema_version', 'run_id', 'run_manifest_hash', 'run_cell_id',
    'cell_key', 'training_task_spec_id', 'training_task_spec_hash',
    'execution_attempt_id', 'collection_attempt_id', 'source_output_id',
    'source_output_hash', 'source_output_kind', 'source_output_class',
    'parser_profile_version', 'parser_profile_hash', 'evaluation_protocol', 'provenance',
    'metric_observations', 'artifact_observations', 'derivation_hash', 'content_hash',
  ],
  properties: {
    result_id: stringId,
    schema_version: { type: 'string', const: 'v2' },
    run_id: stringId,
    run_manifest_hash: hashSchema,
    run_cell_id: stringId,
    cell_key: stringId,
    training_task_spec_id: stringId,
    training_task_spec_hash: hashSchema,
    execution_attempt_id: stringId,
    collection_attempt_id: stringId,
    source_output_id: stringId,
    source_output_hash: hashSchema,
    source_output_kind: { type: 'string', const: 'scientific_result_manifest' },
    source_output_class: { type: 'string', const: 'scientific_source' },
    parser_profile_version: stringId,
    parser_profile_hash: hashSchema,
    evaluation_protocol: exactEvaluationProtocolRefSchema,
    provenance: { type: 'string', const: 'real_provider' },
    metric_observations: { type: 'array', minItems: 1, items: scientificObservationV1Schema },
    artifact_observations: { type: 'array', items: scientificArtifactRefV1Schema },
    derivation_hash: hashSchema,
    content_hash: hashSchema,
  },
} as const;
