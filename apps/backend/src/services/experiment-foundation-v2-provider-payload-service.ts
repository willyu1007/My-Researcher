import { timingSafeEqual } from 'node:crypto';

import { Ajv, type ValidateFunction } from 'ajv';

import {
  EXPERIMENT_FOUNDATION_V2_TRAINING_TASK_OUTPUT_KEYS,
  type ExperimentFoundationRunCellV2,
  type ExperimentFoundationRunV2,
  type ExperimentFoundationTrainingTaskSpecV2,
  type ExperimentFoundationV2TrainingTaskOutputKey,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  EXPERIMENT_FOUNDATION_PROVIDER_ADAPTER_IDENTITY_V2,
  EXPERIMENT_FOUNDATION_PROVIDER_PAYLOAD_SCHEMA_V2,
  fakeAliyunPaiDlcRedactedManifestV1Schema,
  type FakeAliyunPaiDlcRedactedManifestV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-execution-v2-contracts';
import {
  canonicalizeExperimentV2Json,
  serverHashExperimentV2SemanticContent,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import { EXPERIMENT_V2_HASH_PATTERN } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-contract-limits';

import type { AppError } from '../errors/app-error.js';
import type { ExperimentFoundationProviderPayloadV2Record } from '../repositories/experiment-foundation-execution-v2.repository.js';
import { createExperimentFoundationExecutionV2Error } from './experiment-foundation-execution-v2-errors.js';

export const FAKE_ALIYUN_PAI_DLC_SUBMIT_PAYLOAD_SCHEMA_VERSION =
  EXPERIMENT_FOUNDATION_PROVIDER_PAYLOAD_SCHEMA_V2;
export const DETERMINISTIC_FAKE_ALIYUN_PAI_DLC_ADAPTER_IDENTITY =
  EXPERIMENT_FOUNDATION_PROVIDER_ADAPTER_IDENTITY_V2;
export const EXPERIMENT_FOUNDATION_V2_PROVIDER_PAYLOAD_MAX_BYTES = 65_536;

const HASH_PATTERN = new RegExp(EXPERIMENT_V2_HASH_PATTERN);

const CODE_OWNED_SIMULATION_PROFILE = deepFreeze({
  profile_id: 'ef-v2-pack-b-fake-aliyun-pai-dlc',
  profile_version: 'v1',
  region_id: 'simulation-region',
  workspace_id: 'simulation-workspace',
  resource_type: 'cpu',
  job_type: 'simulation_only',
  network_access: false,
  credential_surface: false,
} as const);

export type ExperimentFoundationV2SimulationProfile =
  typeof CODE_OWNED_SIMULATION_PROFILE;

export interface ExperimentFoundationV2HeadAcknowledgementBinding {
  inbox_id: string;
  source_event_id: string;
  run_id: string;
  run_manifest_hash: string;
  payload_hash: string;
  processed_at: string;
}

export interface ExperimentFoundationV2ProviderPayloadPrerequisite {
  run: ExperimentFoundationRunV2;
  run_cell: ExperimentFoundationRunCellV2;
  task_spec: ExperimentFoundationTrainingTaskSpecV2;
  head_acknowledgement: ExperimentFoundationV2HeadAcknowledgementBinding;
}

export interface FakeAliyunPaiDlcSubmitPayloadV1 {
  schema_version: typeof FAKE_ALIYUN_PAI_DLC_SUBMIT_PAYLOAD_SCHEMA_VERSION;
  adapter_identity: typeof DETERMINISTIC_FAKE_ALIYUN_PAI_DLC_ADAPTER_IDENTITY;
  execution_mode: 'simulation';
  provenance: 'non_production_fake_provider';
  profile: ExperimentFoundationV2SimulationProfile & { profile_hash: string };
  exact_scope: {
    run_id: string;
    run_manifest_hash: string;
    run_cell_id: string;
    run_cell_ordinal: number;
    cell_key: string;
    training_task_spec_id: string;
    training_task_spec_hash: string;
    external_pi_work_order_revision_id: string;
    external_pi_work_order_revision_hash: string;
    head_acknowledgement_inbox_id: string;
    head_acknowledgement_payload_hash: string;
  };
  simulated_job: {
    job_name: string;
    command: string;
    arguments: string[];
    input_keys: string[];
    output_keys: ExperimentFoundationV2TrainingTaskOutputKey[];
    resource: {
      cpu_cores: number;
      memory_mb: number;
    };
    retry_ceiling: number;
  };
}

export type ExperimentFoundationV2ProviderPayloadRedactedManifest =
  FakeAliyunPaiDlcRedactedManifestV1;

/**
 * Persistence-safe Pack B provider payload record. Full canonical bytes are
 * intentionally absent and must be re-materialized from the exact bindings.
 */
export type ExperimentFoundationV2ProviderPayloadRecord = Omit<
  ExperimentFoundationProviderPayloadV2Record,
  'id' | 'created_at' | 'redacted_manifest'
> & {
  redacted_manifest: ExperimentFoundationV2ProviderPayloadRedactedManifest;
};

export interface ExperimentFoundationV2MaterializedProviderPayload {
  record: ExperimentFoundationV2ProviderPayloadRecord;
  /** Transient transport input. This value must never be persisted. */
  canonical_payload_bytes: string;
}

const providerPayloadAjv = new Ajv({
  allErrors: true,
  strict: false,
  removeAdditional: false,
});
const redactedManifestValidator: ValidateFunction<FakeAliyunPaiDlcRedactedManifestV1> =
  providerPayloadAjv.compile<FakeAliyunPaiDlcRedactedManifestV1>(
    fakeAliyunPaiDlcRedactedManifestV1Schema,
  );

export class ExperimentFoundationV2ProviderPayloadService {
  materialize(
    prerequisite: ExperimentFoundationV2ProviderPayloadPrerequisite,
  ): ExperimentFoundationV2MaterializedProviderPayload {
    assertExactPrerequisite(prerequisite);

    const profile = getCodeOwnedSimulationProfile();
    const profileHash = hashProviderPayloadSemantic(
      'FakeAliyunPaiDlcSimulationProfile',
      profile.profile_version,
      profile,
    );
    const payload: FakeAliyunPaiDlcSubmitPayloadV1 = {
      schema_version: FAKE_ALIYUN_PAI_DLC_SUBMIT_PAYLOAD_SCHEMA_VERSION,
      adapter_identity: DETERMINISTIC_FAKE_ALIYUN_PAI_DLC_ADAPTER_IDENTITY,
      execution_mode: 'simulation',
      provenance: 'non_production_fake_provider',
      profile: {
        ...profile,
        profile_hash: profileHash,
      },
      exact_scope: {
        run_id: prerequisite.run.run_id,
        run_manifest_hash: prerequisite.run.run_manifest_hash,
        run_cell_id: prerequisite.run_cell.run_cell_id,
        run_cell_ordinal: prerequisite.run_cell.ordinal,
        cell_key: prerequisite.run_cell.cell_key,
        training_task_spec_id: prerequisite.task_spec.training_task_spec_id,
        training_task_spec_hash: prerequisite.task_spec.task_spec_hash,
        external_pi_work_order_revision_id:
          prerequisite.run.external_pi_work_order_revision_id,
        external_pi_work_order_revision_hash:
          prerequisite.run.external_pi_work_order_revision_hash,
        head_acknowledgement_inbox_id: prerequisite.head_acknowledgement.inbox_id,
        head_acknowledgement_payload_hash: prerequisite.head_acknowledgement.payload_hash,
      },
      simulated_job: {
        job_name: deterministicJobName(prerequisite),
        command: prerequisite.task_spec.command_snapshot.command,
        arguments: [...prerequisite.task_spec.command_snapshot.arguments],
        input_keys: [...prerequisite.task_spec.io_snapshot.input_keys],
        output_keys: [...prerequisite.task_spec.io_snapshot.output_keys],
        resource: { ...prerequisite.task_spec.resource_snapshot },
        retry_ceiling: prerequisite.task_spec.retry_snapshot.max_attempts,
      },
    };
    const canonicalPayloadBytes = canonicalizeExperimentV2Json(payload);
    const payloadByteSize = Buffer.byteLength(canonicalPayloadBytes, 'utf8');
    if (payloadByteSize > EXPERIMENT_FOUNDATION_V2_PROVIDER_PAYLOAD_MAX_BYTES) {
      throw providerPayloadError(
        'Provider payload exceeds the Pack B byte-size ceiling.',
        'PROVIDER_PAYLOAD_INVALID',
        { payload_byte_size: payloadByteSize, maximum_byte_size: EXPERIMENT_FOUNDATION_V2_PROVIDER_PAYLOAD_MAX_BYTES },
      );
    }

    const payloadHash = hashCanonicalPayloadBytes(canonicalPayloadBytes);
    const redactedManifest: ExperimentFoundationV2ProviderPayloadRedactedManifest = {
      manifest_schema_version: 'v1',
      payload_schema: FAKE_ALIYUN_PAI_DLC_SUBMIT_PAYLOAD_SCHEMA_VERSION,
      adapter_identity: DETERMINISTIC_FAKE_ALIYUN_PAI_DLC_ADAPTER_IDENTITY,
      simulation_profile_version: profile.profile_version,
      job_name: payload.simulated_job.job_name,
      source_binding: {
        run_id: prerequisite.run.run_id,
        run_manifest_hash: prerequisite.run.run_manifest_hash,
        run_cell_id: prerequisite.run_cell.run_cell_id,
        cell_key: prerequisite.run_cell.cell_key,
        training_task_spec_id: prerequisite.task_spec.training_task_spec_id,
        training_task_spec_hash: prerequisite.task_spec.task_spec_hash,
      },
      command_summary: {
        command: payload.simulated_job.command,
        argument_count: payload.simulated_job.arguments.length,
      },
      resource_summary: { ...payload.simulated_job.resource },
      input_keys: [...payload.simulated_job.input_keys],
      output_keys: [...payload.simulated_job.output_keys],
      redacted_fields: [
        'canonical_payload_bytes',
        'profile.workspace_id',
        'simulated_job.arguments',
      ],
    };
    const redactedManifestHash = hashProviderPayloadSemantic(
      'FakeAliyunPaiDlcRedactedManifest',
      redactedManifest.manifest_schema_version,
      redactedManifest,
    );
    const record: ExperimentFoundationV2ProviderPayloadRecord = {
      materialization_key: providerPayloadMaterializationKey(
        prerequisite,
        profileHash,
        redactedManifestHash,
      ),
      payload_schema: FAKE_ALIYUN_PAI_DLC_SUBMIT_PAYLOAD_SCHEMA_VERSION,
      adapter_identity: DETERMINISTIC_FAKE_ALIYUN_PAI_DLC_ADAPTER_IDENTITY,
      execution_mode: 'simulation',
      provenance: 'non_production_fake_provider',
      simulation_profile_version: profile.profile_version,
      run_id: prerequisite.run.run_id,
      run_manifest_hash: prerequisite.run.run_manifest_hash,
      run_cell_id: prerequisite.run_cell.run_cell_id,
      cell_key: prerequisite.run_cell.cell_key,
      training_task_spec_id: prerequisite.task_spec.training_task_spec_id,
      training_task_spec_hash: prerequisite.task_spec.task_spec_hash,
      payload_hash: payloadHash,
      payload_byte_size: payloadByteSize,
      redacted_manifest: redactedManifest,
    };

    return {
      record,
      canonical_payload_bytes: canonicalPayloadBytes,
    };
  }

  rematerializeAndVerify(
    prerequisite: ExperimentFoundationV2ProviderPayloadPrerequisite,
    persisted: ExperimentFoundationV2ProviderPayloadRecord,
  ): ExperimentFoundationV2MaterializedProviderPayload {
    assertProviderPayloadRecord(persisted);
    const rematerialized = this.materialize(prerequisite);
    if (!safeTextEqual(
      canonicalizeExperimentV2Json(rematerialized.record),
      canonicalizeExperimentV2Json(persisted),
    )) {
      throw providerPayloadError(
        'Persisted provider payload binding does not match its exact source material.',
        'PROVIDER_PAYLOAD_CONFLICT',
      );
    }
    return rematerialized;
  }

  /**
   * Converts the repository trust-boundary record into the exact, validated
   * persistence shape used for deterministic replay. Nested JSON is validated
   * here instead of being asserted into a shared wire type by the caller.
   */
  toPersistenceRecord(
    persisted: ExperimentFoundationProviderPayloadV2Record,
  ): ExperimentFoundationV2ProviderPayloadRecord {
    const record: ExperimentFoundationV2ProviderPayloadRecord = {
      materialization_key: persisted.materialization_key,
      run_id: persisted.run_id,
      run_manifest_hash: persisted.run_manifest_hash,
      run_cell_id: persisted.run_cell_id,
      cell_key: persisted.cell_key,
      training_task_spec_id: persisted.training_task_spec_id,
      training_task_spec_hash: persisted.training_task_spec_hash,
      payload_schema: persisted.payload_schema,
      adapter_identity: persisted.adapter_identity,
      execution_mode: persisted.execution_mode,
      provenance: persisted.provenance,
      simulation_profile_version: persisted.simulation_profile_version,
      redacted_manifest: this.parseRedactedManifest(persisted.redacted_manifest),
      payload_hash: persisted.payload_hash,
      payload_byte_size: persisted.payload_byte_size,
    };
    assertProviderPayloadRecord(record);
    return record;
  }

  parseRedactedManifest(value: unknown): FakeAliyunPaiDlcRedactedManifestV1 {
    if (!redactedManifestValidator(value)) {
      throw providerPayloadError(
        'Persisted provider payload redacted manifest failed its exact v1 schema.',
        'PROVIDER_PAYLOAD_CONFLICT',
        {
          validation_errors: (redactedManifestValidator.errors ?? []).map((error) => ({
            instance_path: error.instancePath,
            keyword: error.keyword,
          })),
        },
      );
    }
    return structuredClone(value);
  }
}

export function getCodeOwnedSimulationProfile(): ExperimentFoundationV2SimulationProfile {
  return structuredClone(CODE_OWNED_SIMULATION_PROFILE);
}

export function hashCanonicalPayloadBytes(canonicalPayloadBytes: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(canonicalPayloadBytes);
  } catch {
    throw new TypeError('Provider payload bytes must be valid JSON.');
  }
  if (canonicalizeExperimentV2Json(parsed) !== canonicalPayloadBytes) {
    throw new TypeError('Provider payload bytes must be canonical JSON.');
  }
  return hashProviderPayloadSemantic(
    'FakeAliyunPaiDlcSubmitPayload',
    FAKE_ALIYUN_PAI_DLC_SUBMIT_PAYLOAD_SCHEMA_VERSION,
    parsed,
  );
}

export function hashProviderPayloadSemantic(
  recordKind: string,
  schemaVersion: string,
  content: unknown,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: recordKind,
    schema_version: schemaVersion,
    hash_profile: 'ef-provider-payload-json@v1',
    content,
  });
}

function deterministicJobName(
  prerequisite: ExperimentFoundationV2ProviderPayloadPrerequisite,
): string {
  const identityHash = hashProviderPayloadSemantic(
    'FakeAliyunPaiDlcJobName',
    'v1',
    {
      run_id: prerequisite.run.run_id,
      run_cell_id: prerequisite.run_cell.run_cell_id,
      task_spec_id: prerequisite.task_spec.training_task_spec_id,
    },
  );
  const suffix = identityHash.slice('sha256:'.length, 'sha256:'.length + 24);
  return `ef-v2-simulation-${suffix}`;
}

function providerPayloadMaterializationKey(
  prerequisite: ExperimentFoundationV2ProviderPayloadPrerequisite,
  profileHash: string,
  redactedManifestHash: string,
): string {
  return hashProviderPayloadSemantic(
    'ExperimentFoundationProviderPayloadV2MaterializationKey',
    'v1',
    {
      adapter_identity: DETERMINISTIC_FAKE_ALIYUN_PAI_DLC_ADAPTER_IDENTITY,
      profile_hash: profileHash,
      redacted_manifest_hash: redactedManifestHash,
      run_id: prerequisite.run.run_id,
      run_manifest_hash: prerequisite.run.run_manifest_hash,
      run_cell_id: prerequisite.run_cell.run_cell_id,
      cell_key: prerequisite.run_cell.cell_key,
      task_spec_id: prerequisite.task_spec.training_task_spec_id,
      task_spec_hash: prerequisite.task_spec.task_spec_hash,
    },
  );
}

function assertExactPrerequisite(
  value: ExperimentFoundationV2ProviderPayloadPrerequisite,
): void {
  const root = assertClosedObject(
    value,
    ['run', 'run_cell', 'task_spec', 'head_acknowledgement'],
    'provider payload prerequisite',
  );
  const run = assertClosedObject(root.run, [
    'run_id',
    'external_pi_work_order_revision_id',
    'external_pi_work_order_revision_hash',
    'external_pi_branch_revision_sequence',
    'run_manifest_hash',
    'cell_count',
    'frozen_at',
  ], 'run');
  const runCell = assertClosedObject(root.run_cell, [
    'run_cell_id',
    'run_id',
    'ordinal',
    'cell_key',
    'external_pi_cell_id',
    'external_pi_cell_hash',
    'training_task_spec_id',
    'training_task_spec_hash',
    'seed',
    'repeat_index',
  ], 'run_cell');
  const taskSpec = assertClosedObject(root.task_spec, [
    'training_task_spec_id',
    'materialization_key',
    'run_recipe_id',
    'external_pi_work_order_revision_id',
    'external_pi_work_order_revision_hash',
    'external_pi_cell_id',
    'external_pi_cell_hash',
    'command_snapshot',
    'io_snapshot',
    'resource_snapshot',
    'retry_snapshot',
    'task_spec_hash',
    'created_at',
  ], 'task_spec');
  const command = assertClosedObject(
    taskSpec.command_snapshot,
    ['command', 'arguments'],
    'task_spec.command_snapshot',
  );
  const io = assertClosedObject(
    taskSpec.io_snapshot,
    ['input_keys', 'output_keys'],
    'task_spec.io_snapshot',
  );
  const resource = assertClosedObject(
    taskSpec.resource_snapshot,
    ['cpu_cores', 'memory_mb'],
    'task_spec.resource_snapshot',
  );
  const retry = assertClosedObject(
    taskSpec.retry_snapshot,
    ['max_attempts'],
    'task_spec.retry_snapshot',
  );
  const acknowledgement = assertClosedObject(root.head_acknowledgement, [
    'inbox_id',
    'source_event_id',
    'run_id',
    'run_manifest_hash',
    'payload_hash',
    'processed_at',
  ], 'head_acknowledgement');

  for (const [label, candidate] of [
    ['run.run_id', run.run_id],
    ['run.external_pi_work_order_revision_id', run.external_pi_work_order_revision_id],
    ['run_cell.run_cell_id', runCell.run_cell_id],
    ['run_cell.cell_key', runCell.cell_key],
    ['run_cell.external_pi_cell_id', runCell.external_pi_cell_id],
    ['task_spec.training_task_spec_id', taskSpec.training_task_spec_id],
    ['task_spec.external_pi_cell_id', taskSpec.external_pi_cell_id],
    ['task_spec.command_snapshot.command', command.command],
    ['head_acknowledgement.inbox_id', acknowledgement.inbox_id],
    ['head_acknowledgement.source_event_id', acknowledgement.source_event_id],
  ] as const) {
    assertNonEmptyString(candidate, label);
  }
  for (const [label, candidate] of [
    ['run.external_pi_work_order_revision_hash', run.external_pi_work_order_revision_hash],
    ['run.run_manifest_hash', run.run_manifest_hash],
    ['run_cell.external_pi_cell_hash', runCell.external_pi_cell_hash],
    ['run_cell.training_task_spec_hash', runCell.training_task_spec_hash],
    ['task_spec.external_pi_work_order_revision_hash', taskSpec.external_pi_work_order_revision_hash],
    ['task_spec.external_pi_cell_hash', taskSpec.external_pi_cell_hash],
    ['task_spec.task_spec_hash', taskSpec.task_spec_hash],
    ['head_acknowledgement.run_manifest_hash', acknowledgement.run_manifest_hash],
    ['head_acknowledgement.payload_hash', acknowledgement.payload_hash],
  ] as const) {
    assertHash(candidate, label);
  }
  assertPositiveInteger(run.external_pi_branch_revision_sequence, 'run.external_pi_branch_revision_sequence');
  assertPositiveInteger(run.cell_count, 'run.cell_count');
  assertPositiveInteger(runCell.ordinal, 'run_cell.ordinal');
  assertNonNegativeInteger(runCell.repeat_index, 'run_cell.repeat_index');
  assertStringArray(command.arguments, 'task_spec.command_snapshot.arguments');
  assertNonEmptyStringArray(io.input_keys, 'task_spec.io_snapshot.input_keys');
  assertExactTrainingTaskOutputKeys(
    io.output_keys,
    'task_spec.io_snapshot.output_keys',
  );
  assertPositiveInteger(resource.cpu_cores, 'task_spec.resource_snapshot.cpu_cores');
  assertPositiveInteger(resource.memory_mb, 'task_spec.resource_snapshot.memory_mb');
  assertPositiveInteger(retry.max_attempts, 'task_spec.retry_snapshot.max_attempts');
  assertTimestamp(run.frozen_at, 'run.frozen_at');
  assertTimestamp(taskSpec.created_at, 'task_spec.created_at');
  assertTimestamp(acknowledgement.processed_at, 'head_acknowledgement.processed_at');

  if (
    runCell.run_id !== run.run_id
    || acknowledgement.run_id !== run.run_id
    || acknowledgement.run_manifest_hash !== run.run_manifest_hash
    || runCell.training_task_spec_id !== taskSpec.training_task_spec_id
    || runCell.training_task_spec_hash !== taskSpec.task_spec_hash
    || runCell.external_pi_cell_id !== taskSpec.external_pi_cell_id
    || runCell.external_pi_cell_hash !== taskSpec.external_pi_cell_hash
    || run.external_pi_work_order_revision_id !== taskSpec.external_pi_work_order_revision_id
    || run.external_pi_work_order_revision_hash !== taskSpec.external_pi_work_order_revision_hash
    || runCell.ordinal > run.cell_count
  ) {
    throw providerPayloadError(
      'Provider payload exact Run/RunCell/TaskSpec/head acknowledgement binding drifted.',
      'PROVIDER_PAYLOAD_INVALID',
    );
  }
}

function assertProviderPayloadRecord(
  value: ExperimentFoundationV2ProviderPayloadRecord,
): void {
  const record = assertClosedObject(value, [
    'materialization_key',
    'run_id',
    'run_manifest_hash',
    'run_cell_id',
    'cell_key',
    'training_task_spec_id',
    'training_task_spec_hash',
    'payload_schema',
    'adapter_identity',
    'execution_mode',
    'provenance',
    'simulation_profile_version',
    'redacted_manifest',
    'payload_hash',
    'payload_byte_size',
  ], 'persisted provider payload');
  assertHash(record.materialization_key, 'persisted provider payload.materialization_key');
  assertHash(record.run_manifest_hash, 'persisted provider payload.run_manifest_hash');
  assertHash(record.training_task_spec_hash, 'persisted provider payload.training_task_spec_hash');
  assertHash(record.payload_hash, 'persisted provider payload.payload_hash');
  assertPositiveInteger(record.payload_byte_size, 'persisted provider payload.payload_byte_size');
  if (!redactedManifestValidator(record.redacted_manifest)) {
    throw providerPayloadError(
      'Persisted provider payload redacted manifest failed its exact v1 schema.',
      'PROVIDER_PAYLOAD_CONFLICT',
    );
  }
}

function assertClosedObject(
  value: unknown,
  allowedKeys: readonly string[],
  label: string,
): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw providerPayloadError(`${label} must be an object.`, 'PROVIDER_PAYLOAD_INVALID');
  }
  const record = value as Record<string, unknown>;
  const extra = Object.keys(record).filter((key) => !allowedKeys.includes(key));
  const missing = allowedKeys.filter((key) => !Object.hasOwn(record, key));
  if (extra.length > 0 || missing.length > 0) {
    throw providerPayloadError(
      `${label} must contain exactly its closed schema fields.`,
      'PROVIDER_PAYLOAD_INVALID',
      { extra_fields: extra, missing_fields: missing },
    );
  }
  return record;
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw providerPayloadError(`${label} must be a non-empty string.`, 'PROVIDER_PAYLOAD_INVALID');
  }
}

function assertHash(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw providerPayloadError(`${label} must be a canonical SHA-256 ref.`, 'PROVIDER_PAYLOAD_INVALID');
  }
}

function assertPositiveInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 1) {
    throw providerPayloadError(`${label} must be a positive integer.`, 'PROVIDER_PAYLOAD_INVALID');
  }
}

function assertNonNegativeInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw providerPayloadError(`${label} must be a non-negative integer.`, 'PROVIDER_PAYLOAD_INVALID');
  }
}

function assertStringArray(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw providerPayloadError(`${label} must be a string array.`, 'PROVIDER_PAYLOAD_INVALID');
  }
}

function assertNonEmptyStringArray(value: unknown, label: string): asserts value is string[] {
  assertStringArray(value, label);
  if (value.length === 0 || value.some((entry) => entry.length === 0)) {
    throw providerPayloadError(`${label} must contain non-empty strings.`, 'PROVIDER_PAYLOAD_INVALID');
  }
}

function assertExactTrainingTaskOutputKeys(
  value: unknown,
  label: string,
): asserts value is ExperimentFoundationV2TrainingTaskOutputKey[] {
  assertNonEmptyStringArray(value, label);
  const allowed = new Set<string>(EXPERIMENT_FOUNDATION_V2_TRAINING_TASK_OUTPUT_KEYS);
  if (
    value.length > EXPERIMENT_FOUNDATION_V2_TRAINING_TASK_OUTPUT_KEYS.length
    || new Set(value).size !== value.length
    || value.some((entry) => !allowed.has(entry))
  ) {
    throw providerPayloadError(
      `${label} must be a unique subset of the Pack B diagnostic output keys.`,
      'PROVIDER_PAYLOAD_INVALID',
      {
        allowed_output_keys: [...EXPERIMENT_FOUNDATION_V2_TRAINING_TASK_OUTPUT_KEYS],
        maximum_output_count: EXPERIMENT_FOUNDATION_V2_TRAINING_TASK_OUTPUT_KEYS.length,
      },
    );
  }
}

function assertTimestamp(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw providerPayloadError(`${label} must be an ISO-compatible timestamp.`, 'PROVIDER_PAYLOAD_INVALID');
  }
}

function providerPayloadError(
  message: string,
  reasonCode: 'PROVIDER_PAYLOAD_INVALID' | 'PROVIDER_PAYLOAD_CONFLICT',
  details: Record<string, unknown> = {},
): AppError {
  return createExperimentFoundationExecutionV2Error(
    reasonCode,
    message,
    details,
  );
}

function safeTextEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}
