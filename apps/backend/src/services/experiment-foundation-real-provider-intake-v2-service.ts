import type {
  ExperimentFoundationAliyunPaiDlcExecutionProfileV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-cloud-preflight-v2-contracts';
import type {
  ExecutionAttemptV2,
  StartRealProviderExecutionV2Request,
  StartRealProviderExecutionV2Response,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-execution-v2-contracts';
import {
  EXPERIMENT_FOUNDATION_REAL_PROVIDER_CONTROL_HASH_PROFILE_V2,
  EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_HASH_PROFILE_V2,
  type ExperimentFoundationExecutionBundleRevisionV2,
  type ExperimentFoundationRealProviderPayloadV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';
import {
  serverHashExperimentFoundationProviderControlV2Semantic,
  serverHashExperimentV2SemanticContent,
  type ExperimentV2HashProfile,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  ExperimentFoundationExecutionV2ConstraintError,
  type ExperimentFoundationExecutionAttemptEventV2Record,
  type ExperimentFoundationExecutionAttemptV2Record,
  type ExperimentFoundationExecutionV2Repository,
  type ExperimentFoundationExecutionV2StartOutcome,
  type ExperimentFoundationProviderCommandV2Record,
  type ExperimentFoundationProviderPayloadV2Record,
  type ExperimentFoundationRealProviderExecutionV2Prerequisite,
} from '../repositories/experiment-foundation-execution-v2.repository.js';
import type {
  PaperImplementationValidationCycleClosureV2Lookup,
} from '../repositories/paper-implementation-validation-cycle-closure-v2-lookup.js';
import {
  createExecutionAttemptEventV2Record,
  createProviderCommandV2Record,
} from './experiment-foundation-execution-v2-service.js';
import {
  ExperimentFoundationRealProviderPayloadV2Service,
} from './experiment-foundation-real-provider-payload-v2-service.js';

export interface ExperimentFoundationRealProviderExecutionBundleResolverV2 {
  resolveActiveReadyExact(input: {
    execution_bundle_revision_id: string;
    content_hash: string;
  }): Promise<{ revision: ExperimentFoundationExecutionBundleRevisionV2 }>;
}

export interface ExperimentFoundationRealProviderIntakeV2ServiceOptions {
  repository: ExperimentFoundationExecutionV2Repository;
  cycleClosureLookup: PaperImplementationValidationCycleClosureV2Lookup;
  executionBundleResolver: ExperimentFoundationRealProviderExecutionBundleResolverV2;
  profileResolver: (
    prerequisite: ExperimentFoundationRealProviderExecutionV2Prerequisite,
  ) => Promise<ExperimentFoundationAliyunPaiDlcExecutionProfileV2>;
  intakeEnabled: () => boolean;
  payloadService?: ExperimentFoundationRealProviderPayloadV2Service;
  now?: () => string;
  idGenerator?: (kind: 'payload' | 'attempt' | 'event' | 'command') => string;
}

type ExperimentFoundationRealProviderIntakeV2IdKind =
  'payload' | 'attempt' | 'event' | 'command';

type ExperimentFoundationRealProviderIntakeV2ReasonCode =
  | 'EF_V2_REAL_PROVIDER_INTAKE_DISABLED'
  | 'REAL_PROVIDER_TUPLE_INVALID'
  | 'EXECUTION_SCOPE_DRIFT'
  | 'EXECUTION_ATTEMPT_STATE_CONFLICT';

export class ExperimentFoundationRealProviderIntakeV2Error extends Error {
  constructor(
    public readonly reasonCode: ExperimentFoundationRealProviderIntakeV2ReasonCode,
    message: string,
  ) {
    super(message);
    this.name = 'ExperimentFoundationRealProviderIntakeV2Error';
  }
}

export class ExperimentFoundationRealProviderIntakeV2Service {
  private readonly repository: ExperimentFoundationExecutionV2Repository;
  private readonly cycleClosureLookup: PaperImplementationValidationCycleClosureV2Lookup;
  private readonly executionBundleResolver: ExperimentFoundationRealProviderExecutionBundleResolverV2;
  private readonly profileResolver: ExperimentFoundationRealProviderIntakeV2ServiceOptions['profileResolver'];
  private readonly intakeEnabled: () => boolean;
  private readonly payloadService: ExperimentFoundationRealProviderPayloadV2Service;
  private readonly now: () => string;
  private readonly idGenerator:
    ExperimentFoundationRealProviderIntakeV2ServiceOptions['idGenerator'];

  constructor(options: ExperimentFoundationRealProviderIntakeV2ServiceOptions) {
    this.repository = options.repository;
    this.cycleClosureLookup = options.cycleClosureLookup;
    this.executionBundleResolver = options.executionBundleResolver;
    this.profileResolver = options.profileResolver;
    this.intakeEnabled = options.intakeEnabled;
    this.payloadService = options.payloadService
      ?? new ExperimentFoundationRealProviderPayloadV2Service();
    this.now = options.now ?? (() => new Date().toISOString());
    this.idGenerator = options.idGenerator;
  }

  async startForApi(
    runId: string,
    request: StartRealProviderExecutionV2Request,
  ): Promise<StartRealProviderExecutionV2Response> {
    const outcome = await this.start(runId, request.business_idempotency_key);
    return {
      run_id: outcome.prerequisite.run.run_id,
      run_manifest_hash: outcome.prerequisite.run.run_manifest_hash,
      business_idempotency_key: request.business_idempotency_key,
      provider_payloads: outcome.payloads.map(toRealProviderPayload),
      execution_attempts: outcome.attempts.map(toRealProviderAttempt),
      replayed: outcome.replayed,
    };
  }

  async start(
    runId: string,
    businessIdempotencyKey: string,
  ): Promise<ExperimentFoundationExecutionV2StartOutcome<
    ExperimentFoundationRealProviderExecutionV2Prerequisite
  >> {
    assertId(runId, 'run_id');
    assertId(businessIdempotencyKey, 'business_idempotency_key');
    // This check is intentionally first: capability-off performs zero
    // repository writes, prerequisite reads, bundle reads, or provider calls.
    if (!this.intakeEnabled()) {
      throw intakeError(
        'EF_V2_REAL_PROVIDER_INTAKE_DISABLED',
        'M7 real-provider intake is disabled.',
      );
    }
    const replay = await this.repository.findRealProviderExecutionStart(
      runId,
      businessIdempotencyKey,
    );
    if (replay) return replay;

    const prerequisite = await this.repository.resolveRealProviderRunPrerequisite(runId);
    if (!prerequisite) {
      throw intakeError(
        'EXECUTION_SCOPE_DRIFT',
        'No exact executable Run prerequisite exists.',
      );
    }
    assertExactPrerequisite(prerequisite);
    if (await this.cycleClosureLookup.isCycleClosed(prerequisite.validation_cycle_id)) {
      throw intakeError(
        'EXECUTION_ATTEMPT_STATE_CONFLICT',
        'A closed ValidationCycle cannot start real-provider execution.',
      );
    }
    const profile = await this.profileResolver(prerequisite);
    const exactBundleRef = prerequisite.cells[0]!.task_spec.execution_bundle;
    const frozenBundle = await this.executionBundleResolver.resolveActiveReadyExact({
      execution_bundle_revision_id: exactBundleRef.execution_bundle_revision_id,
      content_hash: exactBundleRef.content_hash,
    });
    const requestHash = serverHashExperimentFoundationProviderControlV2Semantic(
      'ExperimentFoundationRealProviderStartRequestV2',
      {
        business_idempotency_key: businessIdempotencyKey,
        run_id: prerequisite.run.run_id,
        run_manifest_hash: prerequisite.run.run_manifest_hash,
        head_acknowledgement_inbox_id: prerequisite.head_acknowledgement.inbox_id,
        head_acknowledgement_payload_hash:
          prerequisite.head_acknowledgement.event_payload_hash,
        readiness_attestation_id: prerequisite.readiness.readiness_attestation_id,
        readiness_attestation_hash: prerequisite.readiness.readiness_attestation_hash,
        execution_bundle: exactBundleRef,
        provider_profile_schema: profile.schema_version,
      },
    );
    const existing = await this.repository.listRunAttempts(runId);
    const cells = selectAttemptCells(prerequisite, existing);
    const now = this.now();
    const payloads: ExperimentFoundationProviderPayloadV2Record[] = [];
    const attempts: ExperimentFoundationExecutionAttemptV2Record[] = [];
    const events: ExperimentFoundationExecutionAttemptEventV2Record[] = [];
    const commands: ExperimentFoundationProviderCommandV2Record[] = [];

    for (const cell of cells) {
      const priorAttempts = existing.filter(
        (attempt) => attempt.run_cell_id === cell.run_cell.run_cell_id,
      );
      const attemptSequence = priorAttempts.length === 0
        ? 1
        : Math.max(...priorAttempts.map((attempt) => attempt.attempt_sequence)) + 1;
      const attemptId = this.generateId('attempt', {
        run_id: prerequisite.run.run_id,
        run_cell_id: cell.run_cell.run_cell_id,
        attempt_sequence: attemptSequence,
        business_idempotency_key: businessIdempotencyKey,
      });
      const providerIdempotencyKey = `${attemptId}:submit:1`;
      const materialized = this.payloadService.materialize({
        run: prerequisite.run,
        run_cell: cell.run_cell,
        task_spec: cell.task_spec,
        execution_bundle_revision: frozenBundle.revision,
        provider_idempotency_key: providerIdempotencyKey,
      }, profile);
      const payload: ExperimentFoundationProviderPayloadV2Record = {
        id: this.generateId('payload', {
          run_cell: cell.run_cell,
          training_task_spec_hash: cell.task_spec.task_spec_hash,
          execution_bundle: cell.task_spec.execution_bundle,
          provider_profile_schema: profile.schema_version,
          provider_idempotency_key: providerIdempotencyKey,
        }),
        ...materialized.record,
        created_at: now,
      };
      const attempt: ExperimentFoundationExecutionAttemptV2Record = {
        id: attemptId,
        implementation_project_id: prerequisite.implementation_project_id,
        validation_cycle_id: prerequisite.validation_cycle_id,
        external_pi_branch_id: prerequisite.external_pi_branch_id,
        external_pi_work_order_revision_id:
          prerequisite.run.external_pi_work_order_revision_id,
        external_pi_work_order_revision_hash:
          prerequisite.run.external_pi_work_order_revision_hash,
        external_pi_revision_sequence:
          prerequisite.run.external_pi_branch_revision_sequence,
        run_id: prerequisite.run.run_id,
        run_manifest_hash: prerequisite.run.run_manifest_hash,
        run_cell_id: cell.run_cell.run_cell_id,
        cell_key: cell.run_cell.cell_key,
        training_task_spec_id: cell.task_spec.training_task_spec_id,
        training_task_spec_hash: cell.task_spec.task_spec_hash,
        provider_payload_id: payload.id,
        provider_payload_hash: payload.payload_hash,
        head_acknowledgement_inbox_id: prerequisite.head_acknowledgement.inbox_id,
        attempt_sequence: attemptSequence,
        workflow_business_key: businessIdempotencyKey,
        workflow_request_hash: requestHash,
        execution_mode: 'real_provider',
        provenance: 'real_provider',
        provider_idempotency_key: providerIdempotencyKey,
        lifecycle_state: 'prepared',
        state_version: 0,
        external_job_ref: null,
        external_job_ref_hash: null,
        external_job_ref_type: null,
        external_job_ref_region_hash: null,
        terminal_reason_code: null,
        created_at: now,
        updated_at: now,
        terminal_at: null,
      };
      const event = createExecutionAttemptEventV2Record({
        id: this.generateId('event', {
          execution_attempt_id: attemptId,
          event_sequence: 1,
        }),
        attempt,
        sequence: 1,
        eventType: 'created',
        priorState: null,
        nextState: 'prepared',
        commandId: null,
        reasonCode: null,
        observedProviderState: null,
        occurredAt: now,
      });
      const command = createProviderCommandV2Record({
        id: this.generateId('command', {
          execution_attempt_id: attemptId,
          operation: 'submit',
          command_sequence: 1,
        }),
        attempt,
        sequence: 1,
        operation: 'submit',
        providerIdempotencyKey,
        externalJobRef: null,
        collectionAttemptId: null,
        cancellationReason: null,
        now,
      });
      payloads.push(payload);
      attempts.push(attempt);
      events.push(event);
      commands.push(command);
    }

    try {
      return await this.repository.startRealProviderExecution({
        run_id: runId,
        business_idempotency_key: businessIdempotencyKey,
        request_hash: requestHash,
        expected_run_manifest_hash: prerequisite.run.run_manifest_hash,
        expected_head_acknowledgement_inbox_id: prerequisite.head_acknowledgement.inbox_id,
        expected_head_acknowledgement_payload_hash:
          prerequisite.head_acknowledgement.event_payload_hash,
        expected_readiness_attestation_id: prerequisite.readiness.readiness_attestation_id,
        expected_readiness_attestation_hash: prerequisite.readiness.readiness_attestation_hash,
        payloads,
        attempts,
        events,
        commands,
      });
    } catch (error) {
      if (error instanceof ExperimentFoundationExecutionV2ConstraintError) {
        throw intakeError(
          error.reasonCode === 'EXECUTION_ATTEMPT_STATE_CONFLICT'
            ? 'EXECUTION_ATTEMPT_STATE_CONFLICT'
            : 'EXECUTION_SCOPE_DRIFT',
          error.message,
        );
      }
      throw error;
    }
  }

  private generateId(
    kind: ExperimentFoundationRealProviderIntakeV2IdKind,
    seed: Readonly<Record<string, unknown>>,
  ): string {
    return this.idGenerator?.(kind) ?? deterministicRealProviderIntakeId(kind, seed);
  }
}

const REAL_PROVIDER_INTAKE_ID_DOMAINS = {
  payload: {
    prefix: 'ef_v2_real_payload_',
    recordKind: 'EfV2RealProviderPayloadId',
    hashProfile: EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_HASH_PROFILE_V2,
  },
  attempt: {
    prefix: 'ef_v2_real_attempt_',
    recordKind: 'EfV2RealProviderAttemptId',
    hashProfile: EXPERIMENT_FOUNDATION_REAL_PROVIDER_CONTROL_HASH_PROFILE_V2,
  },
  event: {
    prefix: 'ef_v2_real_event_',
    recordKind: 'EfV2RealProviderEventId',
    hashProfile: EXPERIMENT_FOUNDATION_REAL_PROVIDER_CONTROL_HASH_PROFILE_V2,
  },
  command: {
    prefix: 'ef_v2_real_command_',
    recordKind: 'EfV2RealProviderCommandId',
    hashProfile: EXPERIMENT_FOUNDATION_REAL_PROVIDER_CONTROL_HASH_PROFILE_V2,
  },
} as const satisfies Record<ExperimentFoundationRealProviderIntakeV2IdKind, {
  prefix: string;
  recordKind: string;
  hashProfile: ExperimentV2HashProfile;
}>;

function deterministicRealProviderIntakeId(
  kind: ExperimentFoundationRealProviderIntakeV2IdKind,
  seed: Readonly<Record<string, unknown>>,
): string {
  const domain = REAL_PROVIDER_INTAKE_ID_DOMAINS[kind];
  const digest = serverHashExperimentV2SemanticContent({
    record_kind: domain.recordKind,
    schema_version: 'v1',
    hash_profile: domain.hashProfile,
    content: seed,
  }).slice('sha256:'.length, 'sha256:'.length + 40);
  return `${domain.prefix}${digest}`;
}

function assertExactPrerequisite(
  prerequisite: ExperimentFoundationRealProviderExecutionV2Prerequisite,
): void {
  if (
    prerequisite.run.cell_count !== 2
    || prerequisite.cells.length !== 2
    || prerequisite.readiness.outcome !== 'passed'
    || prerequisite.latest_branch_head_acknowledgement.inbox_id
      !== prerequisite.head_acknowledgement.inbox_id
    || prerequisite.cells.some((cell, index) => (
      cell.run_cell.ordinal !== index + 1
      || cell.run_cell.run_id !== prerequisite.run.run_id
      || cell.run_cell.training_task_spec_id !== cell.task_spec.training_task_spec_id
      || cell.run_cell.training_task_spec_hash !== cell.task_spec.task_spec_hash
      || cell.task_spec.execution_bundle.execution_bundle_revision_id
        !== prerequisite.cells[0]!.task_spec.execution_bundle.execution_bundle_revision_id
      || cell.task_spec.execution_bundle.content_hash
        !== prerequisite.cells[0]!.task_spec.execution_bundle.content_hash
    ))
  ) {
    throw intakeError(
      'REAL_PROVIDER_TUPLE_INVALID',
      'Real-provider intake requires one exact acknowledged two-cell executable batch.',
    );
  }
}

function selectAttemptCells(
  prerequisite: ExperimentFoundationRealProviderExecutionV2Prerequisite,
  attempts: ExperimentFoundationExecutionAttemptV2Record[],
): ExperimentFoundationRealProviderExecutionV2Prerequisite['cells'] {
  const selected = prerequisite.cells.filter((cell) => {
    const cellAttempts = attempts
      .filter((attempt) => attempt.run_cell_id === cell.run_cell.run_cell_id)
      .sort((left, right) => right.attempt_sequence - left.attempt_sequence);
    const latest = cellAttempts[0];
    if (!latest) return true;
    if (latest.execution_mode !== 'real_provider' || latest.provenance !== 'real_provider') {
      throw intakeError(
        'REAL_PROVIDER_TUPLE_INVALID',
        'Executable Run contains a non-real Attempt tuple.',
      );
    }
    if (latest.lifecycle_state === 'succeeded') return false;
    if (latest.lifecycle_state !== 'failed' && latest.lifecycle_state !== 'cancelled') {
      throw intakeError(
        'EXECUTION_ATTEMPT_STATE_CONFLICT',
        'A nonterminal real-provider Attempt already owns this cell.',
      );
    }
    if (latest.attempt_sequence >= cell.retry_ceiling) {
      throw intakeError(
        'EXECUTION_ATTEMPT_STATE_CONFLICT',
        'Real-provider Attempt retry ceiling is exhausted.',
      );
    }
    return true;
  });
  if (selected.length === 0) {
    throw intakeError(
      'EXECUTION_ATTEMPT_STATE_CONFLICT',
      'Every required real-provider cell already succeeded.',
    );
  }
  return selected;
}

function assertId(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw intakeError('REAL_PROVIDER_TUPLE_INVALID', `${field} must be non-empty.`);
  }
}

function intakeError(
  reasonCode: ExperimentFoundationRealProviderIntakeV2ReasonCode,
  message: string,
): ExperimentFoundationRealProviderIntakeV2Error {
  return new ExperimentFoundationRealProviderIntakeV2Error(reasonCode, message);
}

function toRealProviderPayload(
  record: ExperimentFoundationProviderPayloadV2Record,
): ExperimentFoundationRealProviderPayloadV2 {
  if (
    record.payload_schema !== 'AliyunPaiDlcCreateJobPayload@v1'
    || record.adapter_identity !== 'aliyun_pai_dlc_official_sdk@v1'
    || record.execution_mode !== 'real_provider'
    || record.provenance !== 'real_provider'
  ) {
    throw intakeError('REAL_PROVIDER_TUPLE_INVALID', 'Real-provider payload response tuple drifted.');
  }
  return {
    provider_payload_id: record.id,
    materialization_key: record.materialization_key,
    run_id: record.run_id,
    run_manifest_hash: record.run_manifest_hash,
    run_cell_id: record.run_cell_id,
    cell_key: record.cell_key,
    training_task_spec_id: record.training_task_spec_id,
    training_task_spec_hash: record.training_task_spec_hash,
    payload_schema: record.payload_schema,
    adapter_identity: record.adapter_identity,
    execution_mode: 'real_provider',
    provenance: 'real_provider',
    provider_profile_version: record.provider_profile_version,
    redacted_manifest: record.redacted_manifest as ExperimentFoundationRealProviderPayloadV2['redacted_manifest'],
    payload_hash: record.payload_hash,
    payload_byte_size: record.payload_byte_size,
    created_at: record.created_at,
  };
}

function toRealProviderAttempt(
  record: ExperimentFoundationExecutionAttemptV2Record,
): ExecutionAttemptV2 {
  if (record.execution_mode !== 'real_provider' || record.provenance !== 'real_provider') {
    throw intakeError('REAL_PROVIDER_TUPLE_INVALID', 'Real-provider Attempt response tuple drifted.');
  }
  const externalJobRef = record.external_job_ref === null ? null : {
    ref_type: 'aliyun_pai_dlc_job' as const,
    job_id: record.external_job_ref,
    region_id_hash: record.external_job_ref_region_hash!,
  };
  if (
    (externalJobRef === null && record.external_job_ref_hash !== null)
    || (externalJobRef !== null && (
      record.external_job_ref_type !== 'aliyun_pai_dlc_job'
      || !record.external_job_ref_region_hash
    ))
  ) {
    throw intakeError('REAL_PROVIDER_TUPLE_INVALID', 'Real-provider external job ref is partial.');
  }
  return {
    execution_attempt_id: record.id,
    external_pi_implementation_project_id: record.implementation_project_id,
    external_pi_validation_cycle_id: record.validation_cycle_id,
    external_pi_branch_id: record.external_pi_branch_id,
    external_pi_work_order_revision_id: record.external_pi_work_order_revision_id,
    external_pi_work_order_revision_hash: record.external_pi_work_order_revision_hash,
    external_pi_revision_sequence: record.external_pi_revision_sequence,
    run_id: record.run_id,
    run_manifest_hash: record.run_manifest_hash,
    run_cell_id: record.run_cell_id,
    cell_key: record.cell_key,
    training_task_spec_id: record.training_task_spec_id,
    training_task_spec_hash: record.training_task_spec_hash,
    provider_payload_id: record.provider_payload_id,
    provider_payload_hash: record.provider_payload_hash,
    head_acknowledgement_inbox_id: record.head_acknowledgement_inbox_id,
    attempt_sequence: record.attempt_sequence,
    workflow_business_key: record.workflow_business_key,
    workflow_request_hash: record.workflow_request_hash,
    execution_mode: 'real_provider',
    provenance: 'real_provider',
    provider_idempotency_key: record.provider_idempotency_key,
    lifecycle_state: record.lifecycle_state,
    state_version: record.state_version,
    terminal_reason_code: record.terminal_reason_code,
    external_job_ref: externalJobRef,
    external_job_ref_hash: record.external_job_ref_hash,
    created_at: record.created_at,
    updated_at: record.updated_at,
    terminal_at: record.terminal_at,
  };
}
