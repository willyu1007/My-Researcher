import { randomUUID } from 'node:crypto';
import type {
  CancelExternalTrainingJobRequest,
  CollectExternalTrainingJobRequest,
  DataPolicy,
  DatasetMirror,
  ExperimentFoundationAdapterMetadataRef,
  ExperimentFoundationRef,
  ExperimentFoundationTrainingAdapterKind,
  ExternalTrainingJob,
  ExternalTrainingJobResponse,
  ListExternalTrainingJobsResponse,
  RunRecipe,
  SubmitExternalTrainingJobRequest,
  SyncExternalTrainingJobRequest,
  TrainingTaskMaterializationResult,
  TrainingTaskSpec,
  TrainingTaskStageEvent,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-contracts';
import { LEGACY_SCIENTIFIC_WRITER_CLOSED_REASON_CODE } from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';
import { AppError } from '../errors/app-error.js';
import type {
  ExperimentFoundationExecutionRepository,
  ExperimentFoundationExternalTrainingJobListFilter,
} from '../repositories/experiment-foundation-execution.repository.js';
import { ExperimentFoundationService } from './experiment-foundation-service.js';
import {
  AliyunPaiDlcAdapter,
  hashPayload,
  LocalScriptAdapter,
  type AdapterStatusResult,
  type TrainingPlatformAdapter,
} from './experiment-foundation-execution-adapters.js';

type ExecutionServiceOptions = {
  adapters?: Partial<Record<ExperimentFoundationTrainingAdapterKind, TrainingPlatformAdapter>>;
};

type SubmitGateContext = {
  taskSpec: TrainingTaskSpec;
  materializationResult: TrainingTaskMaterializationResult;
};

type ReadinessStatus = 'passed' | 'blocked' | 'stale' | 'unknown';

export class ExperimentFoundationExecutionService {
  private readonly adapters = new Map<ExperimentFoundationTrainingAdapterKind, TrainingPlatformAdapter>();

  constructor(
    private readonly repository: ExperimentFoundationExecutionRepository,
    private readonly registryService: ExperimentFoundationService,
    options: ExecutionServiceOptions = {},
  ) {
    this.adapters.set('local_script', options.adapters?.local_script ?? new LocalScriptAdapter());
    this.adapters.set('aliyun_pai_dlc', options.adapters?.aliyun_pai_dlc ?? new AliyunPaiDlcAdapter());
  }

  async submitJob(input: SubmitExternalTrainingJobRequest): Promise<ExternalTrainingJobResponse> {
    const existing = await this.repository.findExternalTrainingJobByIdempotencyKey(input.idempotency_key);
    if (existing) {
      this.assertIdempotencyMatches(existing, input);
      return { external_job: existing };
    }

    const context = await this.assertSubmitGate(input);
    if (context.taskSpec.selected_platform.adapter_kind === 'aliyun_pai_dlc') {
      await this.assertAliyunMirrorGate(context.taskSpec);
    }

    const adapter = this.getAdapter(context.taskSpec.selected_platform.adapter_kind);
    const submitResult = await adapter.submit(context.taskSpec);
    const requestedEvent = await this.createStageEvent(
      'submission_requested',
      context.taskSpec,
      input.training_task_spec_hash,
      null,
      null,
      input.source_refs,
      [],
    );
    const metadata = await this.createAdapterMetadataRef(
      context.taskSpec.selected_platform.adapter_kind,
      context.taskSpec.selected_platform.adapter_version,
      submitResult.metadata,
      input.source_refs,
      'submit',
    );
    const now = this.now();
    const job: ExternalTrainingJob = {
      external_job_id: `external_training_job_${hashPayload({
        idempotency_key: input.idempotency_key,
        training_task_spec_ref: input.training_task_spec_ref,
        materialization_result_ref: input.materialization_result_ref,
      }).slice(7, 31)}`,
      training_task_spec_ref: input.training_task_spec_ref,
      training_task_spec_hash: input.training_task_spec_hash,
      materialization_result_ref: input.materialization_result_ref,
      materialization_result_hash: input.materialization_result_hash,
      adapter_kind: context.taskSpec.selected_platform.adapter_kind,
      adapter_version: context.taskSpec.selected_platform.adapter_version,
      platform_ref: context.taskSpec.selected_platform,
      idempotency_key: input.idempotency_key,
      external_job_ref: submitResult.externalJobRef,
      external_job_hash: submitResult.externalJobHash,
      job_status: submitResult.status,
      submitted_at: submitResult.submittedAt,
      last_synced_at: null,
      completed_at: submitResult.completedAt,
      stage_event_refs: [refFor('training_task_stage_event', requestedEvent.stage_event_id)],
      partial_result_refs: [],
      result_refs: [],
      adapter_metadata_refs: [refFor('adapter_metadata_ref', metadata.adapter_metadata_ref_id)],
      adapter_metadata_hashes: [metadata.metadata_hash],
      traceability_refs: [
        input.training_task_spec_ref,
        input.materialization_result_ref,
      ],
      created_at: now,
      updated_at: now,
    };
    return { external_job: await this.repository.createExternalTrainingJob(job) };
  }

  async getJob(externalJobId: string): Promise<ExternalTrainingJobResponse> {
    return { external_job: await this.requireJob(externalJobId) };
  }

  async getJobByIdempotencyKey(idempotencyKey: string): Promise<ExternalTrainingJobResponse> {
    const job = await this.repository.findExternalTrainingJobByIdempotencyKey(idempotencyKey);
    if (!job) {
      throw new AppError(
        404,
        'NOT_FOUND',
        `ExternalTrainingJob idempotency key ${idempotencyKey} not found.`,
      );
    }
    return { external_job: job };
  }

  async listJobs(query: {
    adapter_kind?: string;
    status?: string;
    training_task_spec_id?: string;
    materialization_result_id?: string;
    limit?: string | number;
    cursor?: string;
  }): Promise<ListExternalTrainingJobsResponse> {
    const filter: ExperimentFoundationExternalTrainingJobListFilter = {
      adapterKind: this.normalizeAdapterKind(query.adapter_kind),
      status: this.normalizeJobStatus(query.status),
      trainingTaskSpecId: normalizeOptionalString(query.training_task_spec_id),
      materializationResultId: normalizeOptionalString(query.materialization_result_id),
      limit: normalizeLimit(query.limit),
      cursor: normalizeOptionalString(query.cursor),
    };
    const result = await this.repository.listExternalTrainingJobs(filter);
    return {
      jobs: result.jobs,
      next_cursor: result.nextCursor,
    };
  }

  async syncJob(
    externalJobId: string,
    input: SyncExternalTrainingJobRequest,
  ): Promise<ExternalTrainingJobResponse> {
    const job = await this.requireJob(externalJobId);
    const adapter = this.getAdapter(job.adapter_kind);
    const status = await adapter.reconcile(job.external_job_ref);
    const updated = await this.applyAdapterStatus(job, status, input.source_refs, 'sync');
    return { external_job: updated };
  }

  async cancelJob(
    externalJobId: string,
    input: CancelExternalTrainingJobRequest,
  ): Promise<ExternalTrainingJobResponse> {
    const job = await this.requireJob(externalJobId);
    const cancellationRequestId = this.cancellationRequestId(job.external_job_id, input.idempotency_key);
    const existingCancellation = await this.findCancellationRequest(cancellationRequestId);
    if (existingCancellation) {
      return { external_job: job };
    }
    const taskSpec = await this.loadTrainingTaskSpec(job.training_task_spec_ref.ref_id);
    const cancellation = await this.registryService.createRecord({
      record_kind: 'training_task_cancellation_request',
      payload: {
        cancellation_request_id: cancellationRequestId,
        training_task_spec_ref: job.training_task_spec_ref,
        training_task_spec_hash: job.training_task_spec_hash,
        requested_by_ref: input.requested_by_ref,
        reason: input.reason,
        idempotency_key: input.idempotency_key,
        cancellation_status: 'requested',
        requested_at: this.now(),
        source_refs: input.source_refs,
      },
    });
    const adapter = this.getAdapter(job.adapter_kind);
    const status = await adapter.cancel(job.external_job_ref, input.reason);
    const event = await this.createStageEvent(
      'cancellation_requested',
      taskSpec,
      job.training_task_spec_hash,
      refFor('training_task_cancellation_request', cancellation.record_id),
      cancellation.record_hash ?? null,
      input.source_refs,
      [refFor('external_training_job', job.external_job_id)],
    );
    const metadata = await this.createAdapterMetadataRef(
      job.adapter_kind,
      job.adapter_version,
      status.metadata,
      input.source_refs,
      'cancel',
    );
    const updated: ExternalTrainingJob = {
      ...job,
      job_status: status.status,
      last_synced_at: status.syncedAt,
      completed_at: status.completedAt ?? job.completed_at,
      stage_event_refs: [...job.stage_event_refs, refFor('training_task_stage_event', event.stage_event_id)],
      adapter_metadata_refs: [...job.adapter_metadata_refs, refFor('adapter_metadata_ref', metadata.adapter_metadata_ref_id)],
      adapter_metadata_hashes: [...job.adapter_metadata_hashes, metadata.metadata_hash],
      updated_at: this.now(),
    };
    return { external_job: await this.repository.updateExternalTrainingJob(updated) };
  }

  async collectJob(
    externalJobId: string,
    input: CollectExternalTrainingJobRequest,
  ): Promise<ExternalTrainingJobResponse> {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      'Legacy ExperimentFoundation scientific collection is permanently closed.',
      { reason_code: LEGACY_SCIENTIFIC_WRITER_CLOSED_REASON_CODE },
    );
    void externalJobId;
    void input;
  }

  private async assertSubmitGate(input: SubmitExternalTrainingJobRequest): Promise<SubmitGateContext> {
    if (input.training_task_spec_ref.ref_type !== 'training_task_spec') {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'training_task_spec_ref must target training_task_spec.');
    }
    if (input.materialization_result_ref.ref_type !== 'training_task_materialization_result') {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'materialization_result_ref must target training_task_materialization_result.');
    }

    const taskSpec = await this.loadTrainingTaskSpec(input.training_task_spec_ref.ref_id);
    const materializationResult = await this.loadMaterializationResult(input.materialization_result_ref.ref_id);
    if (taskSpec.training_task_spec_id !== input.training_task_spec_ref.ref_id) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'training_task_spec_ref does not match payload identity.');
    }
    if (materializationResult.materialization_result_id !== input.materialization_result_ref.ref_id) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'materialization_result_ref does not match payload identity.');
    }
    if (materializationResult.status !== 'materialized' && materializationResult.status !== 'partial') {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Materialization must be materialized or partial before submit.');
    }
    if (materializationResult.training_task_spec_ref?.ref_id !== taskSpec.training_task_spec_id) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Materialization does not reference the submitted training task spec.');
    }
    if (materializationResult.training_task_spec_hash !== input.training_task_spec_hash) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'training_task_spec_hash does not match materialization.');
    }
    if (materializationResult.materialization_hash !== input.materialization_result_hash) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'materialization_result_hash does not match materialization.');
    }
    await this.assertPassedReadiness('training_task_spec', taskSpec.training_task_spec_id);
    return { taskSpec, materializationResult };
  }

  private async assertPassedReadiness(targetKind: string, targetId: string): Promise<void> {
    let status: ReadinessStatus;
    try {
      const report = await this.registryService.getLatestReadinessReport(targetKind, targetId);
      status = report.readiness_status;
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `Readiness report for ${targetKind} ${targetId} is missing.`);
      }
      throw error;
    }
    if (status !== 'passed') {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `Readiness for ${targetKind} ${targetId} must be passed.`);
    }
  }

  private async assertAliyunMirrorGate(taskSpec: TrainingTaskSpec): Promise<void> {
    const mirrorRefs = taskSpec.input_refs.filter((ref) => ref.ref_type === 'dataset_mirror');
    if (mirrorRefs.length === 0) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Aliyun PAI-DLC submit requires at least one dataset_mirror input_ref.');
    }
    const runRecipe = await this.loadRunRecipe(taskSpec.run_recipe_id);
    const datasetLock = runRecipe.version_lock.dataset_version_lock;
    const policy = await this.loadDataPolicy(datasetLock.data_policy_id);
    if (policy.mirror_policy === 'forbidden') {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Aliyun PAI-DLC submit is blocked by data_policy.mirror_policy=forbidden.');
    }
    for (const mirrorRef of mirrorRefs) {
      const mirror = await this.loadDatasetMirror(mirrorRef.ref_id);
      if (mirror.dataset_version_id !== datasetLock.dataset_version_id) {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Aliyun PAI-DLC mirror dataset_version_id does not match dataset version lock.');
      }
      if (mirror.provider !== 'aliyun_oss' && mirror.provider !== 'pai_dataset') {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Aliyun PAI-DLC submit requires aliyun_oss or pai_dataset mirrors.');
      }
      if (mirror.mirror_status !== 'ready' || mirror.freshness_status !== 'fresh') {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Aliyun PAI-DLC mirror must be ready and fresh.');
      }
      if (mirror.source_checksum_manifest_hash !== datasetLock.checksum_manifest_hash) {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Aliyun PAI-DLC mirror checksum does not match dataset version lock.');
      }
      if (requiresMirrorApproval(policy) && !mirror.approval_ref && policy.approval_refs.length === 0) {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Aliyun PAI-DLC restricted/private mirror requires approval_ref.');
      }
    }
  }

  private async loadTrainingTaskSpec(trainingTaskSpecId: string): Promise<TrainingTaskSpec> {
    const record = await this.registryService.getRecord('training_task_spec', trainingTaskSpecId);
    return record.payload as unknown as TrainingTaskSpec;
  }

  private async loadMaterializationResult(materializationResultId: string): Promise<TrainingTaskMaterializationResult> {
    const record = await this.registryService.getRecord('training_task_materialization_result', materializationResultId);
    return record.payload as unknown as TrainingTaskMaterializationResult;
  }

  private async loadRunRecipe(runRecipeId: string): Promise<RunRecipe> {
    const record = await this.registryService.getRecord('run_recipe', runRecipeId);
    return record.payload as unknown as RunRecipe;
  }

  private async loadDatasetMirror(datasetMirrorId: string): Promise<DatasetMirror> {
    const record = await this.registryService.getRecord('dataset_mirror', datasetMirrorId);
    return record.payload as unknown as DatasetMirror;
  }

  private async loadDataPolicy(dataPolicyId: string): Promise<DataPolicy> {
    const record = await this.registryService.getRecord('data_policy', dataPolicyId);
    return record.payload as unknown as DataPolicy;
  }

  private async findCancellationRequest(cancellationRequestId: string): Promise<boolean> {
    try {
      await this.registryService.getRecord('training_task_cancellation_request', cancellationRequestId);
      return true;
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  private cancellationRequestId(externalJobId: string, idempotencyKey: string): string {
    return `cancellation_request_${hashPayload({ externalJobId, idempotencyKey }).slice(7, 31)}`;
  }

  private assertIdempotencyMatches(existing: ExternalTrainingJob, input: SubmitExternalTrainingJobRequest): void {
    const sameTask = existing.training_task_spec_ref.ref_id === input.training_task_spec_ref.ref_id
      && existing.training_task_spec_hash === input.training_task_spec_hash;
    const sameMaterialization = existing.materialization_result_ref.ref_id === input.materialization_result_ref.ref_id
      && existing.materialization_result_hash === input.materialization_result_hash;
    if (!sameTask || !sameMaterialization) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Idempotency key already belongs to a different training task/materialization.');
    }
  }

  private async applyAdapterStatus(
    job: ExternalTrainingJob,
    status: AdapterStatusResult,
    sourceRefs: ExperimentFoundationRef[],
    metadataPurpose: string,
  ): Promise<ExternalTrainingJob> {
    const taskSpec = await this.loadTrainingTaskSpec(job.training_task_spec_ref.ref_id);
    const metadata = await this.createAdapterMetadataRef(
      job.adapter_kind,
      job.adapter_version,
      status.metadata,
      sourceRefs,
      metadataPurpose,
    );
    const event = await this.createStageEvent(
      'status_synced',
      taskSpec,
      job.training_task_spec_hash,
      refFor('adapter_metadata_ref', metadata.adapter_metadata_ref_id),
      metadata.metadata_hash,
      sourceRefs,
      [refFor('external_training_job', job.external_job_id)],
    );
    const updated: ExternalTrainingJob = {
      ...job,
      job_status: status.status,
      last_synced_at: status.syncedAt,
      completed_at: status.completedAt ?? job.completed_at,
      stage_event_refs: [...job.stage_event_refs, refFor('training_task_stage_event', event.stage_event_id)],
      adapter_metadata_refs: [...job.adapter_metadata_refs, refFor('adapter_metadata_ref', metadata.adapter_metadata_ref_id)],
      adapter_metadata_hashes: [...job.adapter_metadata_hashes, metadata.metadata_hash],
      updated_at: this.now(),
    };
    return this.repository.updateExternalTrainingJob(updated);
  }

  private async createStageEvent(
    eventKind: TrainingTaskStageEvent['event_kind'],
    taskSpec: TrainingTaskSpec,
    trainingTaskSpecHash: string,
    eventPayloadRef: ExperimentFoundationRef | null,
    eventPayloadHash: string | null,
    sourceRefs: ExperimentFoundationRef[],
    traceabilityRefs: ExperimentFoundationRef[],
  ): Promise<TrainingTaskStageEvent> {
    const event: TrainingTaskStageEvent = {
      stage_event_id: `stage_event_${randomUUID()}`,
      event_kind: eventKind,
      training_task_spec_ref: refFor('training_task_spec', taskSpec.training_task_spec_id),
      training_task_spec_hash: trainingTaskSpecHash,
      event_payload_ref: eventPayloadRef,
      event_payload_hash: eventPayloadHash,
      occurred_at: this.now(),
      source_refs: sourceRefs,
      traceability_refs: traceabilityRefs,
    };
    await this.registryService.createRecord({
      record_kind: 'training_task_stage_event',
      payload: asPayload(event),
    });
    return event;
  }

  private async createAdapterMetadataRef(
    adapterKind: ExperimentFoundationTrainingAdapterKind,
    adapterVersion: string,
    metadata: Record<string, unknown>,
    sourceRefs: ExperimentFoundationRef[],
    purpose: string,
  ): Promise<ExperimentFoundationAdapterMetadataRef> {
    const metadataHash = hashPayload(metadata);
    const adapterMetadataRef: ExperimentFoundationAdapterMetadataRef = {
      adapter_metadata_ref_id: `adapter_metadata_ref_${randomUUID()}`,
      adapter_kind: adapterKind,
      adapter_version: adapterVersion,
      metadata_storage_ref: {
        ref_type: 'local_metadata_artifact',
        ref_id: `${adapterKind}_${purpose}_${metadataHash.slice(7, 31)}`,
      },
      metadata_hash: metadataHash,
      schema_version: 'experiment-foundation-adapter-metadata-v1',
      created_at: this.now(),
      source_refs: sourceRefs,
    };
    await this.registryService.createRecord({
      record_kind: 'adapter_metadata_ref',
      payload: asPayload(adapterMetadataRef),
    });
    return adapterMetadataRef;
  }

  private async requireJob(externalJobId: string): Promise<ExternalTrainingJob> {
    const job = await this.repository.findExternalTrainingJobById(externalJobId);
    if (!job) {
      throw new AppError(404, 'NOT_FOUND', `ExternalTrainingJob ${externalJobId} not found.`);
    }
    return job;
  }

  private getAdapter(adapterKind: ExperimentFoundationTrainingAdapterKind): TrainingPlatformAdapter {
    const adapter = this.adapters.get(adapterKind);
    if (!adapter) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `No adapter registered for ${adapterKind}.`);
    }
    return adapter;
  }

  private normalizeAdapterKind(value: unknown): ExperimentFoundationTrainingAdapterKind | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (value === 'local_script' || value === 'aliyun_pai_dlc') {
      return value;
    }
    throw new AppError(400, 'INVALID_PAYLOAD', 'adapter_kind must be local_script or aliyun_pai_dlc.');
  }

  private normalizeJobStatus(value: unknown): ExternalTrainingJob['job_status'] | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const allowed = ['submitted', 'queued', 'running', 'succeeded', 'failed', 'cancelling', 'cancelled', 'unknown'];
    if (typeof value === 'string' && allowed.includes(value)) {
      return value as ExternalTrainingJob['job_status'];
    }
    throw new AppError(400, 'INVALID_PAYLOAD', 'status is not a valid external training job status.');
  }

  private now(): string {
    return new Date().toISOString();
  }
}

function requiresMirrorApproval(policy: DataPolicy): boolean {
  return policy.access_level === 'restricted'
    || policy.access_level === 'private'
    || policy.privacy_level === 'sensitive'
    || policy.privacy_level === 'confidential'
    || policy.mirror_policy === 'approval_required';
}

function refFor(refType: string, refId: string): ExperimentFoundationRef {
  return { ref_type: refType, ref_id: refId };
}

function asPayload<T extends object>(payload: T): Record<string, unknown> {
  return payload as unknown as Record<string, unknown>;
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeLimit(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    throw new AppError(400, 'INVALID_PAYLOAD', 'limit must be a number.');
  }
  return Math.min(100, Math.max(1, Math.trunc(parsed)));
}
