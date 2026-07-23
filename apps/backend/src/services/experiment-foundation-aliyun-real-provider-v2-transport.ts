import { timingSafeEqual } from 'node:crypto';
import { createRequire } from 'node:module';

import {
  GetJobRequest,
  ListJobsRequest,
} from '@alicloud/pai-dlc20201203';

import {
  EXPERIMENT_FOUNDATION_ALIYUN_JOB_STATUSES_V2,
  EXPERIMENT_FOUNDATION_REAL_PROVIDER_ADAPTER_IDENTITY_V2,
  EXPERIMENT_FOUNDATION_REAL_PROVIDER_CONTROL_HASH_PROFILE_V2,
  EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_HASH_PROFILE_V2,
  experimentFoundationProviderResultEnvelopeV1Schema,
  type ExperimentFoundationAliyunJobStatusV2,
  type ExperimentFoundationAliyunNormalizedProviderOutcomeV1,
  type ExperimentFoundationAliyunRealExternalJobRefV1,
  type ExperimentFoundationExecutableTrainingTaskSpecV2,
  type ExperimentFoundationProviderResultEnvelopeV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';
import {
  canonicalizeExperimentV2Json,
  serverHashExperimentV2SemanticContent,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import { Ajv, type ValidateFunction } from 'ajv';

import type {
  ExperimentFoundationMaterializedRealProviderPayloadV2,
} from './experiment-foundation-real-provider-payload-v2-service.js';
import {
  EXPERIMENT_FOUNDATION_REAL_PROVIDER_IDEMPOTENCY_TAG_KEY_V2,
} from './experiment-foundation-real-provider-payload-v2-service.js';

const require = createRequire(import.meta.url);
const PaiDlcClientConstructor = require('@alicloud/pai-dlc20201203').default as
  typeof import('@alicloud/pai-dlc20201203').default;
type PaiDlcClientInstance = InstanceType<typeof PaiDlcClientConstructor>;

export type ExperimentFoundationAliyunPaiDlcSdkClientV2 = Pick<
  PaiDlcClientInstance,
  | 'createJobWithOptions'
  | 'getJobWithOptions'
  | 'listJobsWithOptions'
  | 'stopJobWithOptions'
>;

interface ExperimentFoundationAliyunExactResultReaderV2 {
  readExactResult(input: {
    job_id: string;
    result_object_name: string;
  }): Promise<{
    object_locator: string;
    canonical_result_bytes: string;
  }>;
}

export interface ExperimentFoundationAliyunRealProviderTransportInputV2 {
  materialized: ExperimentFoundationMaterializedRealProviderPayloadV2;
  task_spec: ExperimentFoundationExecutableTrainingTaskSpecV2;
  provider_idempotency_key: string;
  /**
   * True only for the first durably fenced submit dispatch. A retry after an
   * uncertain response must set this to false and may perform discovery only.
   */
  create_permitted: boolean;
  external_job_ref: ExperimentFoundationAliyunRealExternalJobRefV1 | null;
}

interface ExperimentFoundationAliyunRealProviderTransportOptionsV2 {
  client: ExperimentFoundationAliyunPaiDlcSdkClientV2;
  resultReader?: ExperimentFoundationAliyunExactResultReaderV2;
  maximumRecoveryPolls?: number;
}

type ExperimentFoundationAliyunRealProviderTransportReasonCodeV2 =
  | 'REAL_PROVIDER_PAYLOAD_CONFLICT'
  | 'REAL_PROVIDER_RESPONSE_INVALID'
  | 'REAL_PROVIDER_STATUS_UNKNOWN'
  | 'REAL_PROVIDER_ACCEPTANCE_AMBIGUOUS'
  | 'REAL_PROVIDER_RECOVERY_NOT_FOUND'
  | 'REAL_PROVIDER_RECOVERY_DUPLICATE'
  | 'REAL_PROVIDER_CLEANUP_UNVERIFIED'
  | 'REAL_PROVIDER_RESULT_INVALID';

export class ExperimentFoundationAliyunRealProviderTransportErrorV2 extends Error {
  constructor(
    public readonly reasonCode: ExperimentFoundationAliyunRealProviderTransportReasonCodeV2,
    public readonly retryable: boolean,
    message: string,
  ) {
    super(message);
    this.name = 'ExperimentFoundationAliyunRealProviderTransportErrorV2';
  }
}

type CreateRuntime = Parameters<PaiDlcClientInstance['createJobWithOptions']>[2];
type GetJobBody = NonNullable<Awaited<ReturnType<
  PaiDlcClientInstance['getJobWithOptions']
>>['body']>;

const NO_AUTORETRY_RUNTIME = Object.freeze({
  autoretry: false,
  maxAttempts: 1,
}) as CreateRuntime;
const EMPTY_HEADERS = Object.freeze({}) as Record<string, string>;
const MAX_RESULT_BYTES = 4 * 1024 * 1024;
const KNOWN_STATUS = new Set<string>(EXPERIMENT_FOUNDATION_ALIYUN_JOB_STATUSES_V2);
const resultAjv = new Ajv({ allErrors: true, strict: false, removeAdditional: false });
const resultEnvelopeValidator: ValidateFunction<ExperimentFoundationProviderResultEnvelopeV1> =
  resultAjv.compile<ExperimentFoundationProviderResultEnvelopeV1>(
    experimentFoundationProviderResultEnvelopeV1Schema,
  );

/**
 * Injected official-SDK boundary. App composition deliberately does not create
 * a live client in M7-I0..I3; tests inject a no-network structural fake.
 */
export class ExperimentFoundationAliyunRealProviderTransportV2 {
  private readonly client: ExperimentFoundationAliyunPaiDlcSdkClientV2;
  private readonly resultReader: ExperimentFoundationAliyunExactResultReaderV2 | undefined;
  private readonly maximumRecoveryPolls: number;

  constructor(options: ExperimentFoundationAliyunRealProviderTransportOptionsV2) {
    this.client = options.client;
    this.resultReader = options.resultReader;
    this.maximumRecoveryPolls = Math.max(
      1,
      Math.min(5, Math.floor(options.maximumRecoveryPolls ?? 3)),
    );
  }

  async submit(
    input: ExperimentFoundationAliyunRealProviderTransportInputV2,
  ): Promise<ExperimentFoundationAliyunNormalizedProviderOutcomeV1> {
    assertInput(input);
    const discovered = await this.discover(input, 1);
    if (discovered) return this.outcome('submit', input, discovered, null);
    if (!input.create_permitted) {
      throw transportError(
        'REAL_PROVIDER_RECOVERY_NOT_FOUND',
        true,
        'Recovery-only submit did not find an accepted job; CreateJob remains fenced.',
      );
    }

    let jobId: string | undefined;
    try {
      const response = await this.client.createJobWithOptions(
        input.materialized.create_job_request,
        EMPTY_HEADERS,
        NO_AUTORETRY_RUNTIME,
      );
      jobId = response.body?.jobId;
    } catch {
      // The request may have been accepted before the response was lost. Never
      // issue another CreateJob from this dispatch; discovery is the only path.
    }
    if (jobId) {
      const externalJobRef = externalRef(input, jobId);
      return this.outcome('submit', input, {
        external_job_ref: externalJobRef,
        provider_status: null,
      }, null);
    }
    const recovered = await this.discover(input, this.maximumRecoveryPolls);
    if (!recovered) {
      throw transportError(
        'REAL_PROVIDER_RECOVERY_NOT_FOUND',
        true,
        'CreateJob outcome is uncertain and bounded discovery found no exact job.',
      );
    }
    return this.outcome('submit', input, recovered, null);
  }

  async sync(
    input: ExperimentFoundationAliyunRealProviderTransportInputV2,
  ): Promise<ExperimentFoundationAliyunNormalizedProviderOutcomeV1> {
    assertInput(input);
    const exact = await this.getExact(input);
    return this.outcome('sync', input, exact, null);
  }

  async reconcile(
    input: ExperimentFoundationAliyunRealProviderTransportInputV2,
  ): Promise<ExperimentFoundationAliyunNormalizedProviderOutcomeV1> {
    assertInput(input);
    const exact = input.external_job_ref
      ? await this.getExact(input)
      : await this.discover(input, this.maximumRecoveryPolls);
    if (!exact) {
      throw transportError(
        'REAL_PROVIDER_RECOVERY_NOT_FOUND',
        true,
        'Bounded reconciliation found no exact provider job.',
      );
    }
    return this.outcome('reconcile', input, exact, null);
  }

  async cancel(
    input: ExperimentFoundationAliyunRealProviderTransportInputV2,
  ): Promise<ExperimentFoundationAliyunNormalizedProviderOutcomeV1> {
    assertInput(input);
    const before = await this.getExact(input);
    const normalizedBefore = normalizeStatus(before.provider_status);
    if (normalizedBefore === 'succeeded' || normalizedBefore === 'failed' || normalizedBefore === 'cancelled') {
      return this.outcome('cancel', input, before, null);
    }
    await this.client.stopJobWithOptions(
      before.external_job_ref.job_id,
      EMPTY_HEADERS,
      NO_AUTORETRY_RUNTIME,
    );
    const after = await this.getExact(input);
    if (normalizeStatus(after.provider_status) !== 'cancelled') {
      throw transportError(
        'REAL_PROVIDER_CLEANUP_UNVERIFIED',
        true,
        'StopJob returned but exact GetJob did not verify a Stopped terminal state.',
      );
    }
    return this.outcome('cancel', input, after, null);
  }

  async collect(
    input: ExperimentFoundationAliyunRealProviderTransportInputV2,
  ): Promise<ExperimentFoundationAliyunNormalizedProviderOutcomeV1> {
    assertInput(input);
    if (!this.resultReader) {
      throw transportError(
        'REAL_PROVIDER_RESULT_INVALID',
        false,
        'No exact result reader is configured.',
      );
    }
    const exact = await this.getExact(input);
    if (normalizeStatus(exact.provider_status) !== 'succeeded') {
      throw transportError(
        'REAL_PROVIDER_RESULT_INVALID',
        false,
        'Result collection requires an exact Succeeded provider job.',
      );
    }
    const collected = await this.resultReader.readExactResult({
      job_id: exact.external_job_ref.job_id,
      result_object_name: input.task_spec.io_snapshot.result_object_name,
    });
    const byteSize = Buffer.byteLength(collected.canonical_result_bytes, 'utf8');
    if (
      byteSize < 1
      || byteSize > MAX_RESULT_BYTES
      || !locatorHasExactObjectName(
        collected.object_locator,
        input.task_spec.io_snapshot.result_object_name,
      )
    ) {
      throw resultInvalid('Collected result locator or byte size is invalid.');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(collected.canonical_result_bytes);
    } catch {
      throw resultInvalid('Collected result is not JSON.');
    }
    if (
      !resultEnvelopeValidator(parsed)
      || !safeEqual(
        canonicalizeExperimentV2Json(parsed),
        collected.canonical_result_bytes,
      )
    ) {
      throw resultInvalid('Collected result does not match the canonical envelope schema.');
    }
    assertExactResultBinding(parsed, input);
    const contentHash = controlHash('AliyunPaiDlcCollectedResultEnvelope', parsed);
    const resultManifestHash = controlHash('AliyunPaiDlcCollectedResultManifest', {
      object_locator_hash: controlHash('AliyunPaiDlcResultObjectLocator', {
        object_locator: collected.object_locator,
      }),
      content_hash: contentHash,
      byte_size: byteSize,
      parser_profile_version: input.task_spec.io_snapshot.parser_profile_version,
      parser_profile_hash: input.task_spec.io_snapshot.parser_profile_hash,
      source_binding: input.materialized.record.redacted_manifest.source_binding,
    });
    return this.outcome('collect', input, exact, resultManifestHash);
  }

  private async discover(
    input: ExperimentFoundationAliyunRealProviderTransportInputV2,
    maximumPolls: number,
  ): Promise<ExactProviderJob | null> {
    for (let poll = 0; poll < maximumPolls; poll += 1) {
      const response = await this.client.listJobsWithOptions(
        new ListJobsRequest({
          workspaceId: requestWorkspaceId(input),
          displayName: input.materialized.deterministic_display_name,
          tags: {
            [EXPERIMENT_FOUNDATION_REAL_PROVIDER_IDEMPOTENCY_TAG_KEY_V2]:
              input.materialized.deterministic_tag_value,
          },
          pageNumber: 1,
          pageSize: 3,
        }),
        EMPTY_HEADERS,
        NO_AUTORETRY_RUNTIME,
      );
      const ids = [...new Set((response.body?.jobs ?? [])
        .filter((job) => job.displayName === input.materialized.deterministic_display_name)
        .map((job) => job.jobId)
        .filter((jobId): jobId is string => typeof jobId === 'string' && jobId.length > 0))];
      const matches: ExactProviderJob[] = [];
      for (const jobId of ids) {
        const detail = await this.readJob(jobId);
        if (jobDetailMatches(input, detail)) {
          matches.push({
            external_job_ref: externalRef(input, jobId),
            provider_status: requireKnownStatus(detail.status),
          });
        }
      }
      if (matches.length > 1) {
        throw transportError(
          'REAL_PROVIDER_RECOVERY_DUPLICATE',
          false,
          'More than one exact provider job matched the durable idempotency fence.',
        );
      }
      if (matches.length === 1) return matches[0]!;
    }
    return null;
  }

  private async getExact(
    input: ExperimentFoundationAliyunRealProviderTransportInputV2,
  ): Promise<ExactProviderJob> {
    const ref = input.external_job_ref;
    if (!ref || ref.region_id_hash !== expectedRegionHash(input)) {
      throw transportError(
        'REAL_PROVIDER_PAYLOAD_CONFLICT',
        false,
        'External job reference is absent or belongs to a different region binding.',
      );
    }
    const detail = await this.readJob(ref.job_id);
    if (!jobDetailMatches(input, detail) || detail.jobId !== ref.job_id) {
      throw transportError(
        'REAL_PROVIDER_PAYLOAD_CONFLICT',
        false,
        'GetJob detail does not match the exact payload/idempotency binding.',
      );
    }
    return {
      external_job_ref: ref,
      provider_status: requireKnownStatus(detail.status),
    };
  }

  private async readJob(jobId: string): Promise<GetJobBody> {
    const response = await this.client.getJobWithOptions(
      jobId,
      new GetJobRequest({ needDetail: true }),
      EMPTY_HEADERS,
      NO_AUTORETRY_RUNTIME,
    );
    if (!response.body) {
      throw transportError(
        'REAL_PROVIDER_RESPONSE_INVALID',
        true,
        'GetJob returned no response body.',
      );
    }
    return response.body;
  }

  private outcome(
    operation: ExperimentFoundationAliyunNormalizedProviderOutcomeV1['operation'],
    input: ExperimentFoundationAliyunRealProviderTransportInputV2,
    exact: ExactProviderJob,
    resultManifestHash: string | null,
  ): ExperimentFoundationAliyunNormalizedProviderOutcomeV1 {
    const normalizedState = normalizeStatus(exact.provider_status);
    const responseContent = {
      operation,
      provider_idempotency_key_hash: controlHash('AliyunPaiDlcProviderIdempotencyKey', {
        provider_idempotency_key: input.provider_idempotency_key,
      }),
      payload_hash: input.materialized.record.payload_hash,
      external_job_ref: exact.external_job_ref,
      provider_status: exact.provider_status,
      normalized_state: normalizedState,
      result_manifest_hash: resultManifestHash,
    };
    return {
      outcome_schema_version: 'AliyunPaiDlcNormalizedOutcome@v1',
      adapter_identity: EXPERIMENT_FOUNDATION_REAL_PROVIDER_ADAPTER_IDENTITY_V2,
      operation,
      provider_idempotency_key: input.provider_idempotency_key,
      payload_hash: input.materialized.record.payload_hash,
      external_job_ref: exact.external_job_ref,
      provider_status: exact.provider_status,
      normalized_state: normalizedState,
      result_manifest_hash: resultManifestHash,
      response_hash: controlHash('AliyunPaiDlcNormalizedProviderOutcome', responseContent),
    };
  }
}

interface ExactProviderJob {
  external_job_ref: ExperimentFoundationAliyunRealExternalJobRefV1;
  provider_status: ExperimentFoundationAliyunJobStatusV2 | null;
}

function assertInput(input: ExperimentFoundationAliyunRealProviderTransportInputV2): void {
  if (
    input.provider_idempotency_key.trim().length === 0
    || input.materialized.deterministic_tag_value
      !== expectedTagValue(input.provider_idempotency_key)
    || input.materialized.record.training_task_spec_id
      !== input.task_spec.training_task_spec_id
    || input.materialized.record.training_task_spec_hash !== input.task_spec.task_spec_hash
  ) {
    throw transportError(
      'REAL_PROVIDER_PAYLOAD_CONFLICT',
      false,
      'Transport input does not match the exact materialized TaskSpec binding.',
    );
  }
}

function expectedTagValue(providerIdempotencyKey: string): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'AliyunPaiDlcProviderIdempotencyTag',
    schema_version: 'v1',
    hash_profile: EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_HASH_PROFILE_V2,
    content: { provider_idempotency_key: providerIdempotencyKey },
  }).slice('sha256:'.length);
}

function requestWorkspaceId(
  input: ExperimentFoundationAliyunRealProviderTransportInputV2,
): string {
  const workspaceId = input.materialized.create_job_request.workspaceId;
  if (!workspaceId) {
    throw transportError(
      'REAL_PROVIDER_PAYLOAD_CONFLICT',
      false,
      'CreateJob request has no workspace binding.',
    );
  }
  return workspaceId;
}

function expectedRegionHash(
  input: ExperimentFoundationAliyunRealProviderTransportInputV2,
): string {
  return input.materialized.record.redacted_manifest.provider_binding_hashes.region_id_hash;
}

function externalRef(
  input: ExperimentFoundationAliyunRealProviderTransportInputV2,
  jobId: string,
): ExperimentFoundationAliyunRealExternalJobRefV1 {
  return {
    ref_type: 'aliyun_pai_dlc_job',
    job_id: jobId,
    region_id_hash: expectedRegionHash(input),
  };
}

function jobDetailMatches(
  input: ExperimentFoundationAliyunRealProviderTransportInputV2,
  detail: GetJobBody,
): boolean {
  const expected = input.materialized.create_job_request;
  const expectedSpec = expected.jobSpecs?.[0];
  const actualSpec = detail.jobSpecs?.[0];
  return detail.jobId !== undefined
    && detail.workspaceId === expected.workspaceId
    && detail.displayName === input.materialized.deterministic_display_name
    && detail.jobType === expected.jobType
    && detail.userCommand === expected.userCommand
    && detail.jobSpecs?.length === 1
    && actualSpec?.type === expectedSpec?.type
    && actualSpec?.image === expectedSpec?.image
    && actualSpec?.podCount === expectedSpec?.podCount
    && detail.settings?.tags?.[EXPERIMENT_FOUNDATION_REAL_PROVIDER_IDEMPOTENCY_TAG_KEY_V2]
      === input.materialized.deterministic_tag_value;
}

function requireKnownStatus(value: string | undefined): ExperimentFoundationAliyunJobStatusV2 {
  if (!value || !KNOWN_STATUS.has(value)) {
    throw transportError(
      'REAL_PROVIDER_STATUS_UNKNOWN',
      false,
      'Provider returned a status outside the frozen Aliyun vocabulary.',
    );
  }
  return value as ExperimentFoundationAliyunJobStatusV2;
}

function normalizeStatus(
  status: ExperimentFoundationAliyunJobStatusV2 | null,
): ExperimentFoundationAliyunNormalizedProviderOutcomeV1['normalized_state'] {
  switch (status) {
    case null:
    case 'Creating':
    case 'Queuing':
    case 'Bidding':
    case 'EnvPreparing':
    case 'SanityChecking':
    case 'SucceededReserving':
      return 'submitted';
    case 'Running':
    case 'Restarting':
    case 'Stopping':
      return 'running';
    case 'Succeeded':
      return 'succeeded';
    case 'Failed':
    case 'FailedReserving':
      return 'failed';
    case 'Stopped':
      return 'cancelled';
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function assertExactResultBinding(
  result: ExperimentFoundationProviderResultEnvelopeV1,
  input: ExperimentFoundationAliyunRealProviderTransportInputV2,
): void {
  const source = input.materialized.record.redacted_manifest.source_binding;
  if (
    result.execution_bundle_revision_id !== source.execution_bundle_revision_id
    || result.execution_bundle_revision_hash !== source.execution_bundle_revision_hash
    || result.run_id !== source.run_id
    || result.run_manifest_hash !== source.run_manifest_hash
    || result.run_cell_id !== source.run_cell_id
    || result.cell_key !== source.cell_key
    || result.training_task_spec_id !== source.training_task_spec_id
    || result.training_task_spec_hash !== source.training_task_spec_hash
    || result.parser_profile_version !== input.task_spec.io_snapshot.parser_profile_version
    || result.parser_profile_hash !== input.task_spec.io_snapshot.parser_profile_hash
  ) {
    throw resultInvalid('Collected result exact lineage or parser binding drifted.');
  }
}

function locatorHasExactObjectName(locator: string, objectName: string): boolean {
  const withoutQuery = locator.split(/[?#]/u, 1)[0] ?? '';
  return withoutQuery.length > objectName.length
    && withoutQuery.endsWith(`/${objectName}`)
    && !objectName.includes('/')
    && objectName !== '.'
    && objectName !== '..';
}

function controlHash(recordKind: string, content: unknown): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: recordKind,
    schema_version: 'v1',
    hash_profile: EXPERIMENT_FOUNDATION_REAL_PROVIDER_CONTROL_HASH_PROFILE_V2,
    content,
  });
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length
    && timingSafeEqual(leftBuffer, rightBuffer);
}

function resultInvalid(message: string): ExperimentFoundationAliyunRealProviderTransportErrorV2 {
  return transportError('REAL_PROVIDER_RESULT_INVALID', false, message);
}

function transportError(
  reasonCode: ExperimentFoundationAliyunRealProviderTransportReasonCodeV2,
  retryable: boolean,
  message: string,
): ExperimentFoundationAliyunRealProviderTransportErrorV2 {
  return new ExperimentFoundationAliyunRealProviderTransportErrorV2(
    reasonCode,
    retryable,
    message,
  );
}
