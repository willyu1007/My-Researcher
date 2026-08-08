import { timingSafeEqual } from 'node:crypto';

import { Ajv, type ValidateFunction } from 'ajv';
import {
  EXPERIMENT_FOUNDATION_REAL_PROVIDER_CONTROL_HASH_PROFILE_V2,
  experimentFoundationProviderResultEnvelopeV1Schema,
  type ExperimentFoundationExecutableTrainingTaskSpecV2,
  type ExperimentFoundationProviderResultEnvelopeV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';
import {
  EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_VERSION_V1,
  EXPERIMENT_FOUNDATION_SCIENTIFIC_SOURCE_MANIFEST_SCHEMA_V1,
  experimentFoundationScientificResultPayloadV1Schema,
  type ExperimentFoundationScientificResultPayloadV1,
  type ScientificArtifactRefV1,
  type ScientificObservationV1,
  type ScientificResultArtifactPayloadV1,
  type ScientificResultObservationPayloadV1,
  type ScientificSourceManifestV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-source-v1-contracts';
import type {
  ExperimentFoundationRunCellV2,
  ExperimentFoundationScientificObservationSlotV1,
  ExperimentFoundationScientificProtocolV1,
  ExperimentFoundationV2RequiredRuleV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  canonicalizeExperimentV2Json,
  serverHashExperimentV2SemanticContent,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import type {
  ExperimentFoundationScientificValidationV2Protocol,
} from '../repositories/experiment-foundation-scientific-validation-v2.repository.js';
import type {
  ExperimentFoundationRealProviderCollectSuccessV2,
} from './experiment-foundation-aliyun-real-provider-v2-transport.js';

export const EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_VERSION_V1 =
  'scientific_result_parser@v1' as const;

export const EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_HASH_V1 =
  serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationScientificResultSchema',
    schema_version: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_VERSION_V1,
    hash_profile: 'ef-scientific-result-schema-json@v1',
    content: experimentFoundationScientificResultPayloadV1Schema,
  });

export const EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_HASH_V1 =
  serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationScientificSourceParser',
    schema_version: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_VERSION_V1,
    hash_profile: 'ef-scientific-result-schema-json@v1',
    content: {
      accepted_schema_version: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_VERSION_V1,
      payload_property: 'scientific_result',
      semantics: 'structural_only_exact_keys_v1',
    },
  });

export type ExperimentFoundationScientificSourceNotScientificReasonV1 =
  | 'scientific_contract_absent'
  | 'scientific_binding_absent'
  | 'unsupported_parser_profile'
  | 'unsupported_result_schema'
  | 'scientific_payload_absent'
  | 'scientific_payload_invalid'
  | 'observation_slots_incomplete'
  | 'observation_slots_unexpected'
  | 'observation_slot_mismatch'
  | 'artifact_slots_incomplete'
  | 'artifact_slots_unexpected'
  | 'artifact_slot_mismatch'
  | 'artifact_rule_binding_invalid';

export type ExperimentFoundationScientificSourcePreparationV1 =
  | {
    status: 'not_scientific';
    reason: ExperimentFoundationScientificSourceNotScientificReasonV1;
  }
  | {
    status: 'sealed';
    source_output_id: string;
    source_output_hash: string;
    manifest: ScientificSourceManifestV1;
  };

export class ExperimentFoundationScientificSourcePreparationErrorV1 extends Error {
  constructor(
    public readonly reasonCode:
      | 'REAL_PROVIDER_RESULT_HANDOFF_CONFLICT'
      | 'SCIENTIFIC_SOURCE_AUTHORITY_READ_FAILED'
      | 'SCIENTIFIC_SOURCE_PREPARATION_FAILED'
      | 'SCIENTIFIC_SOURCE_COMMIT_FAILED'
      | 'SCIENTIFIC_SOURCE_COMMIT_CONFLICT',
    public readonly retryable: boolean,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ExperimentFoundationScientificSourcePreparationErrorV1';
  }
}

/** Repository adapters must opt in explicitly before an authority read may retry. */
export class ExperimentFoundationTransientScientificSourceAuthorityReadErrorV1
  extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ExperimentFoundationTransientScientificSourceAuthorityReadErrorV1';
  }
}

/** Repository adapters must opt in explicitly before a source commit may retry. */
export class ExperimentFoundationTransientScientificSourceCommitErrorV1 extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ExperimentFoundationTransientScientificSourceCommitErrorV1';
  }
}

export interface ExperimentFoundationScientificSourcePreparationInputV1 {
  collect_success: ExperimentFoundationRealProviderCollectSuccessV2;
  collection_attempt_id: string;
  execution_attempt_id: string;
  run_manifest_hash: string;
  run_cell: ExperimentFoundationRunCellV2;
  task_spec: ExperimentFoundationExecutableTrainingTaskSpecV2;
}

export interface ExperimentFoundationScientificSourcePreparationServiceV1Options {
  protocolResolver: (
    runId: string,
  ) => Promise<ExperimentFoundationScientificValidationV2Protocol | null>;
}

interface ParsedScientificSourceDraftV1 {
  observations: ScientificResultObservationPayloadV1[];
  artifacts: ScientificResultArtifactPayloadV1[];
}

const ajv = new Ajv({ allErrors: true, strict: false, removeAdditional: false });
const envelopeValidator: ValidateFunction<ExperimentFoundationProviderResultEnvelopeV1> =
  ajv.compile<ExperimentFoundationProviderResultEnvelopeV1>(
    experimentFoundationProviderResultEnvelopeV1Schema,
  );
const payloadValidator: ValidateFunction<ExperimentFoundationScientificResultPayloadV1> =
  ajv.compile<ExperimentFoundationScientificResultPayloadV1>(
    experimentFoundationScientificResultPayloadV1Schema,
  );

/** Orchestrates authority reads and pure preparation; it performs no persistence. */
export class ExperimentFoundationScientificSourcePreparationServiceV1 {
  private readonly protocolResolver:
    ExperimentFoundationScientificSourcePreparationServiceV1Options['protocolResolver'];

  constructor(options: ExperimentFoundationScientificSourcePreparationServiceV1Options) {
    this.protocolResolver = options.protocolResolver;
  }

  async prepare(
    input: ExperimentFoundationScientificSourcePreparationInputV1,
  ): Promise<ExperimentFoundationScientificSourcePreparationV1> {
    const envelope = verifyHandoff(input);
    let protocol: ExperimentFoundationScientificValidationV2Protocol | null;
    try {
      protocol = await this.protocolResolver(input.run_cell.run_id);
    } catch (error) {
      throw new ExperimentFoundationScientificSourcePreparationErrorV1(
        'SCIENTIFIC_SOURCE_AUTHORITY_READ_FAILED',
        error instanceof ExperimentFoundationTransientScientificSourceAuthorityReadErrorV1,
        'Exact EvaluationProtocol authority could not be loaded.',
        { cause: error },
      );
    }
    if (!protocol?.protocol_snapshot.scientific_contract) {
      return { status: 'not_scientific', reason: 'scientific_contract_absent' };
    }
    const binding = scientificBinding(input.task_spec);
    if (!binding) {
      return { status: 'not_scientific', reason: 'scientific_binding_absent' };
    }
    if (
      binding.parser_profile_version !== EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_VERSION_V1
      || binding.parser_profile_hash !== EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_HASH_V1
    ) {
      return { status: 'not_scientific', reason: 'unsupported_parser_profile' };
    }
    if (
      binding.scientific_result_schema_version
        !== EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_VERSION_V1
      || binding.scientific_result_schema_hash
        !== EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_HASH_V1
    ) {
      return { status: 'not_scientific', reason: 'unsupported_result_schema' };
    }
    const parsed = parseScientificDraft(envelope);
    if (parsed.status === 'not_scientific') return parsed;
    try {
      return sealScientificSource({
        input,
        protocol,
        binding,
        draft: parsed.draft,
      });
    } catch (error) {
      if (isNotScientific(error)) {
        return { status: 'not_scientific', reason: error.reason };
      }
      throw new ExperimentFoundationScientificSourcePreparationErrorV1(
        'SCIENTIFIC_SOURCE_PREPARATION_FAILED',
        false,
        'Scientific source preparation failed.',
        { cause: error },
      );
    }
  }
}

function verifyHandoff(
  input: ExperimentFoundationScientificSourcePreparationInputV1,
): ExperimentFoundationProviderResultEnvelopeV1 {
  const handoff = input.collect_success.validated_result;
  const bytes = Buffer.byteLength(handoff.canonical_envelope_json, 'utf8');
  let envelope: unknown;
  try {
    envelope = JSON.parse(handoff.canonical_envelope_json);
  } catch (error) {
    throw handoffConflict('Validated result handoff is no longer parseable.', error);
  }
  const contentHash = serverHashExperimentV2SemanticContent({
    record_kind: 'AliyunPaiDlcCollectedResultEnvelope',
    schema_version: 'v1',
    hash_profile: EXPERIMENT_FOUNDATION_REAL_PROVIDER_CONTROL_HASH_PROFILE_V2,
    content: envelope,
  });
  if (
    handoff.handoff_schema_version
      !== 'ExperimentFoundationValidatedProviderResultEnvelope@v1'
    || bytes !== handoff.envelope_byte_size
    || !safeEqual(contentHash, handoff.envelope_content_hash)
    || !envelopeValidator(envelope)
    || !safeEqual(
      canonicalizeExperimentV2Json(envelope),
      handoff.canonical_envelope_json,
    )
  ) {
    throw handoffConflict('Validated result handoff identity drifted.');
  }
  const task = input.task_spec;
  const cell = input.run_cell;
  if (
    envelope.execution_bundle_revision_id
      !== task.execution_bundle.execution_bundle_revision_id
    || envelope.execution_bundle_revision_hash !== task.execution_bundle.content_hash
    || envelope.run_id !== cell.run_id
    || envelope.run_manifest_hash !== input.run_manifest_hash
    || envelope.run_cell_id !== cell.run_cell_id
    || envelope.cell_key !== cell.cell_key
    || envelope.training_task_spec_id !== task.training_task_spec_id
    || envelope.training_task_spec_hash !== task.task_spec_hash
    || envelope.parser_profile_version !== task.io_snapshot.parser_profile_version
    || envelope.parser_profile_hash !== task.io_snapshot.parser_profile_hash
  ) {
    throw handoffConflict('Validated result handoff no longer matches frozen DB authority.');
  }
  return envelope;
}

function parseScientificDraft(
  envelope: ExperimentFoundationProviderResultEnvelopeV1,
): { status: 'parsed'; draft: ParsedScientificSourceDraftV1 } | {
  status: 'not_scientific'; reason: ExperimentFoundationScientificSourceNotScientificReasonV1;
} {
  const payload = envelope.outputs.scientific_result;
  if (payload === undefined) {
    return { status: 'not_scientific', reason: 'scientific_payload_absent' };
  }
  if (!payloadValidator(payload) || !hasValidClosedNumericSemantics(payload)) {
    return { status: 'not_scientific', reason: 'scientific_payload_invalid' };
  }
  return {
    status: 'parsed',
    draft: {
      observations: structuredClone(payload.observations),
      artifacts: structuredClone(payload.artifacts),
    },
  };
}

function sealScientificSource(input: {
  input: ExperimentFoundationScientificSourcePreparationInputV1;
  protocol: ExperimentFoundationScientificValidationV2Protocol;
  binding: Required<Pick<
    ExperimentFoundationExecutableTrainingTaskSpecV2['io_snapshot'],
    | 'parser_profile_version'
    | 'parser_profile_hash'
    | 'scientific_result_schema_version'
    | 'scientific_result_schema_hash'
  >>;
  draft: ParsedScientificSourceDraftV1;
}): Extract<ExperimentFoundationScientificSourcePreparationV1, { status: 'sealed' }> {
  const contract = input.protocol.protocol_snapshot.scientific_contract!;
  assertExactOrdinals(contract.observation_slots.map((slot) => slot.ordinal));
  assertExactOrdinals(contract.artifact_slots.map((slot) => slot.ordinal));
  assertArtifactRuleBindings(
    contract,
    input.protocol.protocol_snapshot.required_rules,
    input.binding.parser_profile_version,
  );
  const observationsByKey = uniqueByKey(
    input.draft.observations,
    (observation) => observation.observation_key,
    'observation_slots_unexpected',
  );
  const artifactsByKey = uniqueByKey(
    input.draft.artifacts,
    (artifact) => artifact.artifact_key,
    'artifact_slots_unexpected',
  );
  if (observationsByKey.size < contract.observation_slots.length) {
    throw notScientific('observation_slots_incomplete');
  }
  if (observationsByKey.size > contract.observation_slots.length) {
    throw notScientific('observation_slots_unexpected');
  }
  if (artifactsByKey.size < contract.artifact_slots.length) {
    throw notScientific('artifact_slots_incomplete');
  }
  if (artifactsByKey.size > contract.artifact_slots.length) {
    throw notScientific('artifact_slots_unexpected');
  }
  const orderedObservations = [...contract.observation_slots]
    .sort((left, right) => left.ordinal - right.ordinal)
    .map((slot): ScientificObservationV1 => {
      const observation = observationsByKey.get(slot.observation_key);
      if (!observation || !observationMatchesSlot(observation, slot)) {
        throw notScientific('observation_slot_mismatch');
      }
      return {
        observation_id: deterministicObservationId(
          input.input.run_cell.run_cell_id,
          input.protocol.evaluation_protocol.content_hash,
          slot.observation_key,
        ),
        ordinal: slot.ordinal,
        ...structuredClone(observation),
      };
    });
  const orderedArtifacts = [...contract.artifact_slots]
    .sort((left, right) => left.ordinal - right.ordinal)
    .map((slot): ScientificArtifactRefV1 => {
      const artifact = artifactsByKey.get(slot.artifact_key);
      if (!artifact || artifact.artifact_kind !== slot.artifact_kind) {
        throw notScientific('artifact_slot_mismatch');
      }
      return { ordinal: slot.ordinal, ...structuredClone(artifact) };
    });
  const task = input.input.task_spec;
  const cell = input.input.run_cell;
  const outcome = input.input.collect_success.outcome;
  const manifest: ScientificSourceManifestV1 = {
    manifest_schema_version: EXPERIMENT_FOUNDATION_SCIENTIFIC_SOURCE_MANIFEST_SCHEMA_V1,
    output_kind: 'scientific_result_manifest',
    output_class: 'scientific_source',
    authority: {
      collection_attempt_id: input.input.collection_attempt_id,
      execution_attempt_id: input.input.execution_attempt_id,
      provenance: 'real_provider',
    },
    execution_lineage: {
      execution_bundle_revision_id: task.execution_bundle.execution_bundle_revision_id,
      execution_bundle_revision_hash: task.execution_bundle.content_hash,
      run_id: cell.run_id,
      run_manifest_hash: input.input.run_manifest_hash,
      run_cell_id: cell.run_cell_id,
      cell_key: cell.cell_key,
      cell_ordinal: cell.ordinal,
      training_task_spec_id: task.training_task_spec_id,
      training_task_spec_hash: task.task_spec_hash,
    },
    evaluation_protocol: {
      evaluation_protocol_id: input.protocol.evaluation_protocol.logical_id,
      revision_id: input.protocol.evaluation_protocol.revision_id,
      revision_sequence: input.protocol.evaluation_protocol.revision_sequence,
      content_hash: input.protocol.evaluation_protocol.content_hash,
    },
    interpretation_binding: {
      provider_result_envelope_schema: task.io_snapshot.result_envelope_schema,
      ...input.binding,
    },
    upstream: { provider_result_manifest_hash: outcome.result_manifest_hash },
    ordered_observations: orderedObservations,
    ordered_artifacts: orderedArtifacts,
  };
  const sourceOutputHash = serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationScientificSourceManifest',
    schema_version: EXPERIMENT_FOUNDATION_SCIENTIFIC_SOURCE_MANIFEST_SCHEMA_V1,
    hash_profile: 'ef-scientific-source-json@v1',
    content: manifest,
  });
  return {
    status: 'sealed',
    source_output_id: `scientific_source_${input.input.collection_attempt_id}`,
    source_output_hash: sourceOutputHash,
    manifest,
  };
}

function assertArtifactRuleBindings(
  contract: ExperimentFoundationScientificProtocolV1,
  requiredRules: readonly ExperimentFoundationV2RequiredRuleV1[],
  parserProfileVersion: string,
): void {
  const artifactRules = new Map(
    requiredRules
      .filter((rule) => rule.rule_type === 'artifact_contract@v1')
      .map((rule) => [rule.rule_id, rule]),
  );
  const bindingCounts = new Map<string, number>();
  for (const slot of contract.artifact_slots) {
    if (!Object.hasOwn(slot, 'required_rule_id')) {
      throw notScientific('artifact_rule_binding_invalid');
    }
    if (slot.required_rule_id === null) continue;
    const rule = artifactRules.get(slot.required_rule_id ?? '');
    if (
      !rule
      || rule.rule_type !== 'artifact_contract@v1'
      || rule.artifact_kind !== slot.artifact_kind
      || rule.parser_binding !== parserProfileVersion
    ) {
      throw notScientific('artifact_rule_binding_invalid');
    }
    bindingCounts.set(rule.rule_id, (bindingCounts.get(rule.rule_id) ?? 0) + 1);
  }
  for (const rule of artifactRules.values()) {
    if (
      rule.rule_type !== 'artifact_contract@v1'
      || bindingCounts.get(rule.rule_id) !== rule.required_cardinality
    ) {
      throw notScientific('artifact_rule_binding_invalid');
    }
  }
}

function scientificBinding(
  task: ExperimentFoundationExecutableTrainingTaskSpecV2,
): Required<Pick<
  ExperimentFoundationExecutableTrainingTaskSpecV2['io_snapshot'],
  | 'parser_profile_version'
  | 'parser_profile_hash'
  | 'scientific_result_schema_version'
  | 'scientific_result_schema_hash'
>> | null {
  const version = task.io_snapshot.scientific_result_schema_version;
  const hash = task.io_snapshot.scientific_result_schema_hash;
  if (!version && !hash) return null;
  if (!version || !hash) throw handoffConflict('TaskSpec scientific schema binding is partial.');
  return {
    parser_profile_version: task.io_snapshot.parser_profile_version,
    parser_profile_hash: task.io_snapshot.parser_profile_hash,
    scientific_result_schema_version: version,
    scientific_result_schema_hash: hash,
  };
}

function observationMatchesSlot(
  observation: ScientificResultObservationPayloadV1,
  slot: ExperimentFoundationScientificObservationSlotV1,
): boolean {
  if (
    observation.metric_key !== slot.metric_key
    || observation.split_key !== slot.split_key
    || observation.value_type !== slot.value_type
    || observation.unit !== slot.unit
    || observation.statistic.kind !== slot.statistic.kind
    || observation.uncertainty.kind !== slot.uncertainty.kind
  ) return false;
  if (
    slot.statistic.kind === 'quantile'
    && (observation.statistic.kind !== 'quantile'
      || observation.statistic.probability !== slot.statistic.probability)
  ) return false;
  if (slot.uncertainty.kind === 'confidence_interval') {
    return observation.uncertainty.kind === 'confidence_interval'
      && observation.uncertainty.level === slot.uncertainty.level
      && slot.uncertainty.allowed_method_keys.includes(observation.uncertainty.method_key);
  }
  return true;
}

function hasValidClosedNumericSemantics(
  payload: ExperimentFoundationScientificResultPayloadV1,
): boolean {
  return payload.observations.every((observation) => {
    if (!Number.isFinite(observation.value)) return false;
    const uncertainty = observation.uncertainty;
    if (uncertainty.kind === 'standard_deviation' || uncertainty.kind === 'standard_error') {
      return Number.isFinite(uncertainty.value) && uncertainty.value >= 0;
    }
    if (uncertainty.kind === 'confidence_interval') {
      return Number.isFinite(uncertainty.lower)
        && Number.isFinite(uncertainty.upper)
        && uncertainty.lower <= uncertainty.upper;
    }
    return true;
  });
}

function uniqueByKey<T>(
  values: T[],
  keyOf: (value: T) => string,
  reason: ExperimentFoundationScientificSourceNotScientificReasonV1,
): Map<string, T> {
  const result = new Map<string, T>();
  for (const value of values) {
    const key = keyOf(value);
    if (result.has(key)) throw notScientific(reason);
    result.set(key, value);
  }
  return result;
}

function assertExactOrdinals(ordinals: number[]): void {
  const sorted = [...ordinals].sort((left, right) => left - right);
  if (sorted.some((ordinal, index) => ordinal !== index + 1)) {
    throw new Error('Scientific protocol slots are not ordered exactly 1..N.');
  }
}

function deterministicObservationId(
  runCellId: string,
  protocolHash: string,
  observationKey: string,
): string {
  const hash = serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationScientificObservationIdentity',
    schema_version: 'v1',
    hash_profile: 'ef-scientific-source-json@v1',
    content: {
      run_cell_id: runCellId,
      evaluation_protocol_content_hash: protocolHash,
      observation_key: observationKey,
    },
  });
  return `scientific_observation_${hash.slice('sha256:'.length, 'sha256:'.length + 32)}`;
}

class NotScientificError extends Error {
  constructor(public readonly reason: ExperimentFoundationScientificSourceNotScientificReasonV1) {
    super(reason);
  }
}

function notScientific(
  reason: ExperimentFoundationScientificSourceNotScientificReasonV1,
): NotScientificError {
  return new NotScientificError(reason);
}

function isNotScientific(error: unknown): error is NotScientificError {
  return error instanceof NotScientificError;
}

function handoffConflict(message: string, cause?: unknown) {
  return new ExperimentFoundationScientificSourcePreparationErrorV1(
    'REAL_PROVIDER_RESULT_HANDOFF_CONFLICT',
    false,
    message,
    cause === undefined ? undefined : { cause },
  );
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length
    && timingSafeEqual(leftBuffer, rightBuffer);
}
