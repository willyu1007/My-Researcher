import { canonicalizeExperimentV2Json } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import { EXPERIMENT_V2_HASH_PATTERN } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-contract-limits';
import {
  EXPERIMENT_FOUNDATION_V2_TRAINING_TASK_OUTPUT_KEYS,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';

import {
  DETERMINISTIC_FAKE_ALIYUN_PAI_DLC_ADAPTER_IDENTITY,
  EXPERIMENT_FOUNDATION_V2_PROVIDER_PAYLOAD_MAX_BYTES,
  FAKE_ALIYUN_PAI_DLC_SUBMIT_PAYLOAD_SCHEMA_VERSION,
  getCodeOwnedSimulationProfile,
  hashCanonicalPayloadBytes,
  hashProviderPayloadSemantic,
  type FakeAliyunPaiDlcSubmitPayloadV1,
} from './experiment-foundation-v2-provider-payload-service.js';

export const DETERMINISTIC_FAKE_PROVIDER_RESPONSE_SCHEMA_VERSION =
  'DeterministicFakeAliyunPaiDlcResponse@v1' as const;

const HASH_PATTERN = new RegExp(EXPERIMENT_V2_HASH_PATTERN);

export type ExperimentFoundationV2FakeProviderOperation =
  | 'submit'
  | 'sync'
  | 'reconcile'
  | 'cancel'
  | 'collect';

export interface ExperimentFoundationV2FakeProviderRequest {
  canonical_payload_bytes: string;
  payload_hash: string;
  provider_idempotency_key: string;
  external_job_ref?: string | null;
  cancel_reason_code?: string | null;
}

export interface ExperimentFoundationV2DiagnosticProvisionalOutput {
  output_id: string;
  ordinal: number;
  output_key_hash: string;
  output_hash: string;
  diagnostic_manifest: {
    schema_version: 'FakeAliyunPaiDlcDiagnosticOutput@v1';
    classification: 'diagnostic_only';
    payload_hash: string;
    external_job_ref: string;
    byte_size: number;
  };
}

export interface ExperimentFoundationV2FakeProviderResponse {
  schema_version: typeof DETERMINISTIC_FAKE_PROVIDER_RESPONSE_SCHEMA_VERSION;
  adapter_identity: typeof DETERMINISTIC_FAKE_ALIYUN_PAI_DLC_ADAPTER_IDENTITY;
  execution_mode: 'simulation';
  provenance: 'non_production_fake_provider';
  operation: ExperimentFoundationV2FakeProviderOperation;
  provider_idempotency_key: string;
  payload_hash: string;
  external_job_ref: string;
  provider_status: 'submitted' | 'running' | 'succeeded' | 'cancelled';
  provisional_outputs: ExperimentFoundationV2DiagnosticProvisionalOutput[];
  response_hash: string;
}

export interface ExperimentFoundationV2ProviderTransport {
  submit(input: ExperimentFoundationV2FakeProviderRequest): Promise<unknown>;
  sync(input: ExperimentFoundationV2FakeProviderRequest): Promise<unknown>;
  reconcile(input: ExperimentFoundationV2FakeProviderRequest): Promise<unknown>;
  cancel(input: ExperimentFoundationV2FakeProviderRequest): Promise<unknown>;
  collect(input: ExperimentFoundationV2FakeProviderRequest): Promise<unknown>;
}

export type DeterministicFakeProviderFaultKind =
  | 'retryable_before_response'
  | 'retryable_after_acceptance'
  | 'malformed_response';

export interface DeterministicFakeProviderFaultRule {
  operation: ExperimentFoundationV2FakeProviderOperation;
  invocation: number;
  kind: DeterministicFakeProviderFaultKind;
  error_code?: string;
}

export interface DeterministicFakeProviderOperationLedgerEntry {
  sequence: number;
  operation: ExperimentFoundationV2FakeProviderOperation;
  operation_invocation: number;
  provider_idempotency_key: string;
  payload_hash: string;
  payload_byte_size: number;
  external_job_ref: string;
  outcome:
    | 'responded'
    | 'fault_before_response'
    | 'fault_after_acceptance'
    | 'malformed_response';
  real_network_request_count: 0;
  create_job_call_count: 0;
}

export interface DeterministicFakeProviderOptions {
  maxLedgerEntries?: number;
}

export class DeterministicFakeProviderFault extends Error {
  constructor(
    public readonly errorCode: string,
    public readonly retryable: boolean,
    public readonly accepted: boolean,
    public readonly externalJobRef: string,
  ) {
    super(errorCode);
    this.name = 'DeterministicFakeProviderFault';
  }
}

/**
 * A no-network Pack B transport. Provider job identity and all responses are
 * pure functions of canonical payload bytes plus the provider idempotency key.
 * The only mutable evidence is a bounded redacted operation ledger plus O(1)
 * invocation counters; neither is provider state or lifecycle authority.
 */
export class DeterministicFakeAliyunPaiDlcTransport
implements ExperimentFoundationV2ProviderTransport {
  private readonly ledger: DeterministicFakeProviderOperationLedgerEntry[] = [];
  private readonly operationInvocationCounts: Record<ExperimentFoundationV2FakeProviderOperation, number> = {
    submit: 0,
    sync: 0,
    reconcile: 0,
    cancel: 0,
    collect: 0,
  };
  private readonly maxLedgerEntries: number;
  private nextLedgerWriteIndex = 0;
  private totalInvocationCount = 0;

  constructor(
    private readonly faultRules: readonly DeterministicFakeProviderFaultRule[] = [],
    options: DeterministicFakeProviderOptions = {},
  ) {
    this.maxLedgerEntries = options.maxLedgerEntries ?? 4_096;
    if (!Number.isInteger(this.maxLedgerEntries) || this.maxLedgerEntries < 0) {
      throw new TypeError('Fake provider maxLedgerEntries must be a non-negative integer.');
    }
    for (const rule of faultRules) {
      if (!Number.isInteger(rule.invocation) || rule.invocation < 1) {
        throw new TypeError('Fake provider fault invocation must be a positive integer.');
      }
    }
  }

  submit(input: ExperimentFoundationV2FakeProviderRequest): Promise<unknown> {
    return this.execute('submit', input);
  }

  sync(input: ExperimentFoundationV2FakeProviderRequest): Promise<unknown> {
    return this.execute('sync', input);
  }

  reconcile(input: ExperimentFoundationV2FakeProviderRequest): Promise<unknown> {
    return this.execute('reconcile', input);
  }

  cancel(input: ExperimentFoundationV2FakeProviderRequest): Promise<unknown> {
    return this.execute('cancel', input);
  }

  collect(input: ExperimentFoundationV2FakeProviderRequest): Promise<unknown> {
    return this.execute('collect', input);
  }

  getOperationLedger(): DeterministicFakeProviderOperationLedgerEntry[] {
    return structuredClone(
      [...this.ledger].sort((left, right) => left.sequence - right.sequence),
    );
  }

  getNetworkCensus(): { real_network_request_count: 0; create_job_call_count: 0 } {
    return {
      real_network_request_count: 0,
      create_job_call_count: 0,
    };
  }

  private async execute(
    operation: ExperimentFoundationV2FakeProviderOperation,
    input: ExperimentFoundationV2FakeProviderRequest,
  ): Promise<unknown> {
    const payload = validateTransportInput(operation, input);
    const externalJobRef = deterministicExternalJobRef(input);
    if (operation !== 'submit' && input.external_job_ref !== externalJobRef) {
      throw new DeterministicFakeProviderFault(
        'PROVIDER_RESPONSE_INVALID',
        false,
        false,
        externalJobRef,
      );
    }
    if (
      operation === 'submit'
      && input.external_job_ref !== undefined
      && input.external_job_ref !== null
      && input.external_job_ref !== externalJobRef
    ) {
      throw new DeterministicFakeProviderFault(
        'PROVIDER_RESPONSE_INVALID',
        false,
        false,
        externalJobRef,
      );
    }

    const operationInvocation = this.operationInvocationCounts[operation] + 1;
    this.operationInvocationCounts[operation] = operationInvocation;
    this.totalInvocationCount += 1;
    const fault = this.faultRules.find(
      (rule) => rule.operation === operation && rule.invocation === operationInvocation,
    );
    const ledgerBase = {
      sequence: this.totalInvocationCount,
      operation,
      operation_invocation: operationInvocation,
      provider_idempotency_key: input.provider_idempotency_key,
      payload_hash: input.payload_hash,
      payload_byte_size: Buffer.byteLength(input.canonical_payload_bytes, 'utf8'),
      external_job_ref: externalJobRef,
      real_network_request_count: 0 as const,
      create_job_call_count: 0 as const,
    };

    if (fault?.kind === 'retryable_before_response') {
      this.recordLedgerEntry({ ...ledgerBase, outcome: 'fault_before_response' });
      throw new DeterministicFakeProviderFault(
        fault.error_code ?? 'FAKE_PROVIDER_RETRYABLE_BEFORE_RESPONSE',
        true,
        false,
        externalJobRef,
      );
    }
    if (fault?.kind === 'retryable_after_acceptance') {
      this.recordLedgerEntry({ ...ledgerBase, outcome: 'fault_after_acceptance' });
      throw new DeterministicFakeProviderFault(
        fault.error_code ?? 'FAKE_PROVIDER_RESPONSE_LOST',
        true,
        true,
        externalJobRef,
      );
    }
    if (fault?.kind === 'malformed_response') {
      this.recordLedgerEntry({ ...ledgerBase, outcome: 'malformed_response' });
      return {
        malformed: true,
        operation,
        payload_hash: input.payload_hash,
      };
    }

    const response = buildResponse(operation, input, payload, externalJobRef);
    this.recordLedgerEntry({ ...ledgerBase, outcome: 'responded' });
    return response;
  }

  private recordLedgerEntry(entry: DeterministicFakeProviderOperationLedgerEntry): void {
    if (this.maxLedgerEntries === 0) {
      return;
    }
    if (this.ledger.length < this.maxLedgerEntries) {
      this.ledger.push(entry);
      return;
    }
    this.ledger[this.nextLedgerWriteIndex] = entry;
    this.nextLedgerWriteIndex = (this.nextLedgerWriteIndex + 1) % this.maxLedgerEntries;
  }
}

function validateTransportInput(
  operation: ExperimentFoundationV2FakeProviderOperation,
  input: ExperimentFoundationV2FakeProviderRequest,
): FakeAliyunPaiDlcSubmitPayloadV1 {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw invalidResponseFault('Provider transport input must be an object.');
  }
  const allowedKeys = [
    'canonical_payload_bytes',
    'payload_hash',
    'provider_idempotency_key',
    'external_job_ref',
    'cancel_reason_code',
  ];
  if (Object.keys(input).some((key) => !allowedKeys.includes(key))) {
    throw invalidResponseFault('Provider transport input contains unsupported fields.');
  }
  if (
    typeof input.canonical_payload_bytes !== 'string'
    || input.canonical_payload_bytes.length === 0
    || Buffer.byteLength(input.canonical_payload_bytes, 'utf8')
      > EXPERIMENT_FOUNDATION_V2_PROVIDER_PAYLOAD_MAX_BYTES
  ) {
    throw invalidResponseFault('Canonical provider payload bytes are invalid.');
  }
  if (
    typeof input.provider_idempotency_key !== 'string'
    || input.provider_idempotency_key.length === 0
    || input.provider_idempotency_key.length > 255
  ) {
    throw invalidResponseFault('Provider idempotency key is invalid.');
  }
  let computedPayloadHash: string;
  try {
    computedPayloadHash = hashCanonicalPayloadBytes(input.canonical_payload_bytes);
  } catch {
    throw invalidResponseFault('Canonical provider payload bytes are not canonical JSON.');
  }
  if (computedPayloadHash !== input.payload_hash) {
    throw invalidResponseFault('Canonical provider payload hash does not match its bytes.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input.canonical_payload_bytes);
  } catch {
    throw invalidResponseFault('Canonical provider payload bytes are not JSON.');
  }
  if (canonicalizeExperimentV2Json(parsed) !== input.canonical_payload_bytes) {
    throw invalidResponseFault('Provider payload bytes are not canonical JSON.');
  }
  assertFakeSubmitPayload(parsed);
  if (operation === 'cancel') {
    if (typeof input.cancel_reason_code !== 'string' || input.cancel_reason_code.length === 0) {
      throw invalidResponseFault('Cancel requires a non-empty reason code.');
    }
  } else if (input.cancel_reason_code !== undefined && input.cancel_reason_code !== null) {
    throw invalidResponseFault('Cancel reason is accepted only by cancel.');
  }
  return parsed as FakeAliyunPaiDlcSubmitPayloadV1;
}

function assertFakeSubmitPayload(value: unknown): asserts value is FakeAliyunPaiDlcSubmitPayloadV1 {
  const root = exactObject(value, [
    'schema_version',
    'adapter_identity',
    'execution_mode',
    'provenance',
    'profile',
    'exact_scope',
    'simulated_job',
  ], 'provider payload');
  if (
    root.schema_version !== FAKE_ALIYUN_PAI_DLC_SUBMIT_PAYLOAD_SCHEMA_VERSION
    || root.adapter_identity !== DETERMINISTIC_FAKE_ALIYUN_PAI_DLC_ADAPTER_IDENTITY
    || root.execution_mode !== 'simulation'
    || root.provenance !== 'non_production_fake_provider'
  ) {
    throw invalidResponseFault('Provider payload identity or provenance is invalid.');
  }

  const expectedProfile = getCodeOwnedSimulationProfile();
  const profile = exactObject(root.profile, [
    ...Object.keys(expectedProfile),
    'profile_hash',
  ], 'provider payload profile');
  const expectedProfileHash = hashProviderPayloadSemantic(
    'FakeAliyunPaiDlcSimulationProfile',
    expectedProfile.profile_version,
    expectedProfile,
  );
  for (const [key, expected] of Object.entries(expectedProfile)) {
    if (profile[key] !== expected) {
      throw invalidResponseFault('Provider payload simulation profile is not code-owned.');
    }
  }
  if (profile.profile_hash !== expectedProfileHash) {
    throw invalidResponseFault('Provider payload simulation profile hash is invalid.');
  }

  const scope = exactObject(root.exact_scope, [
    'run_id',
    'run_manifest_hash',
    'run_cell_id',
    'run_cell_ordinal',
    'cell_key',
    'training_task_spec_id',
    'training_task_spec_hash',
    'external_pi_work_order_revision_id',
    'external_pi_work_order_revision_hash',
    'head_acknowledgement_inbox_id',
    'head_acknowledgement_payload_hash',
  ], 'provider payload exact scope');
  for (const key of [
    'run_id',
    'run_cell_id',
    'cell_key',
    'training_task_spec_id',
    'external_pi_work_order_revision_id',
    'head_acknowledgement_inbox_id',
  ]) {
    if (typeof scope[key] !== 'string' || scope[key].length === 0) {
      throw invalidResponseFault('Provider payload exact scope is invalid.');
    }
  }
  for (const key of [
    'run_manifest_hash',
    'training_task_spec_hash',
    'external_pi_work_order_revision_hash',
    'head_acknowledgement_payload_hash',
  ]) {
    if (typeof scope[key] !== 'string' || !HASH_PATTERN.test(scope[key])) {
      throw invalidResponseFault('Provider payload exact scope hash is invalid.');
    }
  }
  if (!Number.isInteger(scope.run_cell_ordinal) || (scope.run_cell_ordinal as number) < 1) {
    throw invalidResponseFault('Provider payload RunCell ordinal is invalid.');
  }

  const job = exactObject(root.simulated_job, [
    'job_name',
    'command',
    'arguments',
    'input_keys',
    'output_keys',
    'resource',
    'retry_ceiling',
  ], 'provider payload simulated job');
  if (
    typeof job.job_name !== 'string'
    || job.job_name.length === 0
    || typeof job.command !== 'string'
    || job.command.length === 0
    || !isStringArray(job.arguments, false)
    || !isStringArray(job.input_keys, true)
    || !isExactTrainingTaskOutputKeys(job.output_keys)
    || !Number.isInteger(job.retry_ceiling)
    || (job.retry_ceiling as number) < 1
  ) {
    throw invalidResponseFault('Provider payload simulated job is invalid.');
  }
  const resource = exactObject(
    job.resource,
    ['cpu_cores', 'memory_mb'],
    'provider payload simulated resource',
  );
  if (
    !Number.isInteger(resource.cpu_cores)
    || (resource.cpu_cores as number) < 1
    || !Number.isInteger(resource.memory_mb)
    || (resource.memory_mb as number) < 1
  ) {
    throw invalidResponseFault('Provider payload simulated resource is invalid.');
  }
}

function exactObject(
  value: unknown,
  keys: readonly string[],
  label: string,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidResponseFault(`${label} must be an object.`);
  }
  const actual = Object.keys(value);
  if (
    actual.length !== keys.length
    || actual.some((key) => !keys.includes(key))
    || keys.some((key) => !Object.hasOwn(value, key))
  ) {
    throw invalidResponseFault(`${label} must match its closed schema.`);
  }
  return value as Record<string, unknown>;
}

function isStringArray(value: unknown, requireEntries: boolean): value is string[] {
  return Array.isArray(value)
    && (!requireEntries || value.length > 0)
    && value.every((entry) => typeof entry === 'string' && entry.length > 0);
}

function isExactTrainingTaskOutputKeys(value: unknown): boolean {
  if (!isStringArray(value, true)) return false;
  const allowed = new Set<string>(EXPERIMENT_FOUNDATION_V2_TRAINING_TASK_OUTPUT_KEYS);
  return value.length <= EXPERIMENT_FOUNDATION_V2_TRAINING_TASK_OUTPUT_KEYS.length
    && new Set(value).size === value.length
    && value.every((entry) => allowed.has(entry));
}

function deterministicExternalJobRef(input: ExperimentFoundationV2FakeProviderRequest): string {
  const identityHash = hashProviderPayloadSemantic(
    'DeterministicFakeAliyunPaiDlcExternalJobRef',
    'v1',
    {
      adapter_identity: DETERMINISTIC_FAKE_ALIYUN_PAI_DLC_ADAPTER_IDENTITY,
      payload_hash: input.payload_hash,
      provider_idempotency_key: input.provider_idempotency_key,
    },
  );
  const digest = identityHash.slice('sha256:'.length, 'sha256:'.length + 32);
  return `fake_aliyun_pai_dlc_job_${digest}`;
}

function buildResponse(
  operation: ExperimentFoundationV2FakeProviderOperation,
  input: ExperimentFoundationV2FakeProviderRequest,
  payload: FakeAliyunPaiDlcSubmitPayloadV1,
  externalJobRef: string,
): ExperimentFoundationV2FakeProviderResponse {
  const providerStatus: ExperimentFoundationV2FakeProviderResponse['provider_status'] = operation === 'submit'
    ? 'submitted'
    : operation === 'sync'
      ? 'running'
      : operation === 'cancel'
        ? 'cancelled'
        : 'succeeded';
  const provisionalOutputs = operation === 'collect'
    ? diagnosticOutputs(payload, input.payload_hash, externalJobRef)
    : [];
  const responseWithoutHash = {
    schema_version: DETERMINISTIC_FAKE_PROVIDER_RESPONSE_SCHEMA_VERSION,
    adapter_identity: DETERMINISTIC_FAKE_ALIYUN_PAI_DLC_ADAPTER_IDENTITY,
    execution_mode: 'simulation' as const,
    provenance: 'non_production_fake_provider' as const,
    operation,
    provider_idempotency_key: input.provider_idempotency_key,
    payload_hash: input.payload_hash,
    external_job_ref: externalJobRef,
    provider_status: providerStatus,
    provisional_outputs: provisionalOutputs,
  };
  return {
    ...responseWithoutHash,
    response_hash: hashProviderPayloadSemantic(
      'DeterministicFakeAliyunPaiDlcResponse',
      DETERMINISTIC_FAKE_PROVIDER_RESPONSE_SCHEMA_VERSION,
      responseWithoutHash,
    ),
  };
}

function diagnosticOutputs(
  payload: FakeAliyunPaiDlcSubmitPayloadV1,
  payloadHash: string,
  externalJobRef: string,
): ExperimentFoundationV2DiagnosticProvisionalOutput[] {
  return payload.simulated_job.output_keys.map((outputKey, index) => {
    const ordinal = index + 1;
    const outputKeyHash = hashProviderPayloadSemantic(
      'FakeAliyunPaiDlcDiagnosticOutputKey',
      'v1',
      outputKey,
    );
    const outputHash = hashProviderPayloadSemantic(
      'FakeAliyunPaiDlcDiagnosticOutput',
      'v1',
      {
        classification: 'diagnostic_only',
        external_job_ref: externalJobRef,
        ordinal,
        output_key_hash: outputKeyHash,
        payload_hash: payloadHash,
      },
    );
    return {
      output_id: `fake_diagnostic_output_${outputHash.slice('sha256:'.length, 'sha256:'.length + 32)}`,
      ordinal,
      output_key_hash: outputKeyHash,
      output_hash: outputHash,
      diagnostic_manifest: {
        schema_version: 'FakeAliyunPaiDlcDiagnosticOutput@v1',
        classification: 'diagnostic_only',
        payload_hash: payloadHash,
        external_job_ref: externalJobRef,
        byte_size: 0,
      },
    };
  });
}

function invalidResponseFault(message: string): DeterministicFakeProviderFault {
  const error = new DeterministicFakeProviderFault(
    'PROVIDER_RESPONSE_INVALID',
    false,
    false,
    '',
  );
  error.message = message;
  return error;
}
