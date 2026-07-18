import { randomUUID } from 'node:crypto';
import type {
  CancelExternalTrainingJobRequest,
  CollectExternalTrainingJobRequest,
  DataPolicy,
  DatasetMirror,
  EvidenceCandidate,
  EvaluationFact,
  ExperimentFoundationAdapterMetadataRef,
  ExperimentFoundationRef,
  ExperimentFoundationResultValidationStatus,
  ExperimentFoundationTrainingAdapterKind,
  ExperimentResult,
  ExternalTrainingJob,
  ExternalTrainingJobResponse,
  FineTuningResult,
  ListExternalTrainingJobsResponse,
  MetricDefinition,
  MetricObservation,
  ResultArtifact,
  ResultValidationReport,
  RunRecipe,
  SubmitExternalTrainingJobRequest,
  SyncExternalTrainingJobRequest,
  TrainingTaskMaterializationResult,
  TrainingTaskPartialResultRef,
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
  type AdapterCollectResult,
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

type CollectContext = {
  taskSpec: TrainingTaskSpec;
  runRecipe: RunRecipe;
};

type ReadinessStatus = 'passed' | 'blocked' | 'stale' | 'unknown';

type ProtocolMetricContext = {
  definitions: MetricDefinition[];
  missingDefinitionRefs: ExperimentFoundationRef[];
  expectedMetricKeys: string[];
};

type ValidationAnalysis = {
  status: ExperimentFoundationResultValidationStatus;
  checkedMetricKeys: string[];
  missingMetricKeys: string[];
  missingArtifactKinds: string[];
  protocolViolations: string[];
  warnings: string[];
};

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

    const job = await this.requireJob(externalJobId);
    if (job.result_refs.length > 0) {
      return { external_job: job };
    }

    const context = await this.loadCollectContext(job);
    const adapter = this.getAdapter(job.adapter_kind);
    const collected = await adapter.collectResults(context.taskSpec, job.external_job_ref);
    const partialResults = await this.createPartialResults(job, context.taskSpec, collected, input.source_refs);
    const protocolMetrics = await this.loadProtocolMetricContext(context);
    const validationAnalysis = analyzeValidation(
      collected,
      context.taskSpec,
      job,
      protocolMetrics,
      Boolean(input.accept_partial),
    );
    const validationId = `result_validation_report_${randomUUID()}`;
    const experimentResultId = `experiment_result_${randomUUID()}`;
    const resultHash = hashPayload({
      experiment_result_id: experimentResultId,
      external_job_id: job.external_job_id,
      metrics: collected.metrics,
      artifacts: collected.artifacts,
      logs: collected.logs,
      config_snapshot_hash: collected.configSnapshotHash,
    });
    const validationHash = hashPayload({
      result_validation_report_id: validationId,
      source_result_hash: resultHash,
      validation_status: validationAnalysis.status,
      checked_metric_keys: validationAnalysis.checkedMetricKeys,
      missing_metric_keys: validationAnalysis.missingMetricKeys,
      protocol_violations: validationAnalysis.protocolViolations,
    });
    const experimentResult = await this.createExperimentResult(
      experimentResultId,
      resultHash,
      validationId,
      job,
      context,
      collected,
      partialResults,
      input.source_refs,
    );
    const metricObservations = await this.createMetricObservations(
      collected,
      context,
      experimentResult,
      validationId,
      validationHash,
      protocolMetrics,
      input.source_refs,
    );
    const evaluationFacts = await this.createEvaluationFacts(
      context,
      experimentResult,
      validationId,
      validationHash,
      metricObservations,
      collected,
      input.source_refs,
    );
    const validationReport = await this.createValidationReport(
      validationId,
      validationHash,
      validationAnalysis,
      context,
      experimentResult,
      evaluationFacts,
      input.source_refs,
    );
    const resultRefs = [
      refFor('experiment_result', experimentResult.experiment_result_id),
      refFor('result_validation_report', validationReport.result_validation_report_id),
    ];
    if (context.taskSpec.profile_kind === 'llm_fine_tuning') {
      const fineTuningResult = await this.createFineTuningResult(
        context.taskSpec,
        experimentResult,
        collected,
        validationAnalysis.status,
        input.source_refs,
      );
      resultRefs.push(refFor('fine_tuning_result', fineTuningResult.fine_tuning_result_id));
    }
    if (
      (validationAnalysis.status === 'valid' || validationAnalysis.status === 'accepted_partial')
      && metricObservations.length > 0
    ) {
      const evidence = await this.createEvidenceCandidate(
        context,
        experimentResult,
        validationReport,
        metricObservations,
        collected,
        input.source_refs,
      );
      resultRefs.push(refFor('evidence_candidate', evidence.evidence_candidate_id));
    }

    const metadata = await this.createAdapterMetadataRef(
      job.adapter_kind,
      job.adapter_version,
      collected.metadata,
      input.source_refs,
      'collect',
    );
    const event = await this.createStageEvent(
      'partial_result_registered',
      context.taskSpec,
      job.training_task_spec_hash,
      refFor('adapter_metadata_ref', metadata.adapter_metadata_ref_id),
      metadata.metadata_hash,
      input.source_refs,
      [refFor('external_training_job', job.external_job_id)],
    );
    const updated: ExternalTrainingJob = {
      ...job,
      job_status: collected.status,
      completed_at: collected.status === 'succeeded' || collected.status === 'failed'
        ? this.now()
        : job.completed_at,
      last_synced_at: this.now(),
      partial_result_refs: [
        ...job.partial_result_refs,
        ...partialResults.map((partial) => refFor('training_task_partial_result_ref', partial.partial_result_ref_id)),
      ],
      result_refs: resultRefs,
      stage_event_refs: [...job.stage_event_refs, refFor('training_task_stage_event', event.stage_event_id)],
      adapter_metadata_refs: [...job.adapter_metadata_refs, refFor('adapter_metadata_ref', metadata.adapter_metadata_ref_id)],
      adapter_metadata_hashes: [...job.adapter_metadata_hashes, metadata.metadata_hash],
      updated_at: this.now(),
    };
    return { external_job: await this.repository.updateExternalTrainingJob(updated) };
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

  private async loadCollectContext(job: ExternalTrainingJob): Promise<CollectContext> {
    const taskSpec = await this.loadTrainingTaskSpec(job.training_task_spec_ref.ref_id);
    const runRecipe = await this.loadRunRecipe(taskSpec.run_recipe_id);
    return { taskSpec, runRecipe };
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

  private async loadMetricDefinition(metricDefinitionId: string): Promise<MetricDefinition> {
    const record = await this.registryService.getRecord('metric_definition', metricDefinitionId);
    return record.payload as unknown as MetricDefinition;
  }

  private async loadProtocolMetricContext(context: CollectContext): Promise<ProtocolMetricContext> {
    const definitions: MetricDefinition[] = [];
    const missingDefinitionRefs: ExperimentFoundationRef[] = [];
    for (const metricDefinitionRef of context.runRecipe.version_lock.evaluation_protocol_lock.metric_definition_refs) {
      if (metricDefinitionRef.ref_type !== 'metric_definition') {
        missingDefinitionRefs.push(metricDefinitionRef);
        continue;
      }
      try {
        definitions.push(await this.loadMetricDefinition(metricDefinitionRef.ref_id));
      } catch (error) {
        if (error instanceof AppError && error.statusCode === 404) {
          missingDefinitionRefs.push(metricDefinitionRef);
          continue;
        }
        throw error;
      }
    }
    return {
      definitions,
      missingDefinitionRefs,
      expectedMetricKeys: definitions.map((definition) => definition.metric_key),
    };
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

  private async createPartialResults(
    job: ExternalTrainingJob,
    taskSpec: TrainingTaskSpec,
    collected: AdapterCollectResult,
    sourceRefs: ExperimentFoundationRef[],
  ): Promise<TrainingTaskPartialResultRef[]> {
    const producedAt = this.now();
    const partials: TrainingTaskPartialResultRef[] = [
      ...collected.artifacts.map((artifact) => ({
        partial_result_ref_id: `partial_result_ref_${randomUUID()}`,
        training_task_spec_ref: job.training_task_spec_ref,
        training_task_spec_hash: job.training_task_spec_hash,
        result_kind: mapArtifactToPartialKind(artifact.artifact_kind),
        artifact_ref: artifact.artifact_ref,
        artifact_hash: artifact.artifact_hash,
        produced_at: producedAt,
        source_refs: sourceRefs,
      })),
      ...collected.logs.map((log) => ({
        partial_result_ref_id: `partial_result_ref_${randomUUID()}`,
        training_task_spec_ref: refFor('training_task_spec', taskSpec.training_task_spec_id),
        training_task_spec_hash: job.training_task_spec_hash,
        result_kind: 'log' as const,
        artifact_ref: log.log_ref,
        artifact_hash: log.log_hash,
        produced_at: producedAt,
        source_refs: sourceRefs,
      })),
    ];
    for (const partial of partials) {
      await this.registryService.createRecord({
        record_kind: 'training_task_partial_result_ref',
        payload: asPayload(partial),
      });
    }
    return partials;
  }

  private async createExperimentResult(
    experimentResultId: string,
    resultHash: string,
    validationId: string,
    job: ExternalTrainingJob,
    context: CollectContext,
    collected: AdapterCollectResult,
    partialResults: TrainingTaskPartialResultRef[],
    sourceRefs: ExperimentFoundationRef[],
  ): Promise<ExperimentResult> {
    const experimentResult: ExperimentResult = {
      experiment_result_id: experimentResultId,
      training_task_spec_ref: job.training_task_spec_ref,
      training_task_spec_hash: job.training_task_spec_hash,
      materialization_result_ref: job.materialization_result_ref,
      materialization_result_hash: job.materialization_result_hash,
      run_recipe_id: context.taskSpec.run_recipe_id,
      run_recipe_hash: context.taskSpec.run_recipe_hash,
      version_lock_hash: context.taskSpec.version_lock_hash,
      profile_kind: context.taskSpec.profile_kind,
      external_job_ref: refFor('external_training_job', job.external_job_id),
      external_job_hash: job.external_job_hash,
      metrics: collected.metrics,
      artifacts: collected.artifacts,
      logs: collected.logs,
      config_snapshot_ref: collected.configSnapshotRef,
      config_snapshot_hash: collected.configSnapshotHash,
      partial_result_refs: partialResults,
      validation_report_refs: [refFor('result_validation_report', validationId)],
      provenance_refs: sourceRefs,
      result_hash: resultHash,
      created_at: this.now(),
    };
    await this.registryService.createRecord({
      record_kind: 'experiment_result',
      payload: asPayload(experimentResult),
    });
    return experimentResult;
  }

  private async createMetricObservations(
    collected: AdapterCollectResult,
    context: CollectContext,
    experimentResult: ExperimentResult,
    validationId: string,
    validationHash: string,
    protocolMetrics: ProtocolMetricContext,
    sourceRefs: ExperimentFoundationRef[],
  ): Promise<MetricObservation[]> {
    const protocolLock = context.runRecipe.version_lock.evaluation_protocol_lock;
    const datasetLock = context.runRecipe.version_lock.dataset_version_lock;
    const observations: MetricObservation[] = [];
    for (const metric of collected.metrics) {
      const metricDefinition = findMetricDefinition(protocolMetrics.definitions, metric);
      if (!metricDefinition) {
        continue;
      }
      const observationId = `metric_observation_${randomUUID()}`;
      const observationHash = hashPayload({
        observationId,
        result_hash: experimentResult.result_hash,
        metric_key: metric.metric_key,
        value: metric.value,
      });
      const observation: MetricObservation = {
        metric_observation_id: observationId,
        metric_definition_ref: refFor('metric_definition', metricDefinition.metric_definition_id),
        metric_key: metric.metric_key,
        value: metric.value,
        value_type: metric.value_type,
        direction: metricDefinition.direction,
        unit: metric.unit ?? metricDefinition.unit ?? null,
        split_name: metric.split_name ?? null,
        aggregation: metric.aggregation ?? null,
        run_recipe_id: context.taskSpec.run_recipe_id,
        run_recipe_hash: context.taskSpec.run_recipe_hash,
        result_ref: refFor('experiment_result', experimentResult.experiment_result_id),
        result_hash: experimentResult.result_hash,
        evaluation_protocol_id: protocolLock.evaluation_protocol_id,
        evaluation_protocol_hash: protocolLock.protocol_hash,
        benchmark_asset_ref: refFor('benchmark_asset', protocolLock.benchmark_asset_id),
        dataset_version_ref: refFor('dataset_version', datasetLock.dataset_version_id),
        validation_report_ref: refFor('result_validation_report', validationId),
        validation_report_hash: validationHash,
        observation_hash: observationHash,
        created_at: this.now(),
        source_refs: sourceRefs,
      };
      await this.registryService.createRecord({
        record_kind: 'metric_observation',
        payload: asPayload(observation),
      });
      observations.push(observation);
    }
    return observations;
  }

  private async createEvaluationFacts(
    context: CollectContext,
    experimentResult: ExperimentResult,
    validationId: string,
    validationHash: string,
    metricObservations: MetricObservation[],
    collected: AdapterCollectResult,
    sourceRefs: ExperimentFoundationRef[],
  ): Promise<EvaluationFact[]> {
    const protocolLock = context.runRecipe.version_lock.evaluation_protocol_lock;
    const datasetLock = context.runRecipe.version_lock.dataset_version_lock;
    const facts: EvaluationFact[] = [];
    for (const observation of metricObservations) {
      const factId = `evaluation_fact_${randomUUID()}`;
      const factPayload = {
        metric_key: observation.metric_key,
        value: observation.value,
        unit: observation.unit,
        split_name: observation.split_name,
        direction: observation.direction,
      };
      const fact: EvaluationFact = {
        evaluation_fact_id: factId,
        fact_kind: 'metric',
        run_recipe_id: context.taskSpec.run_recipe_id,
        run_recipe_hash: context.taskSpec.run_recipe_hash,
        result_ref: refFor('experiment_result', experimentResult.experiment_result_id),
        result_hash: experimentResult.result_hash,
        evaluation_protocol_id: protocolLock.evaluation_protocol_id,
        evaluation_protocol_hash: protocolLock.protocol_hash,
        benchmark_asset_ref: refFor('benchmark_asset', protocolLock.benchmark_asset_id),
        dataset_version_ref: refFor('dataset_version', datasetLock.dataset_version_id),
        validation_report_ref: refFor('result_validation_report', validationId),
        validation_report_hash: validationHash,
        metric_observation_refs: [refFor('metric_observation', observation.metric_observation_id)],
        comparison_observation_refs: [],
        artifact_refs: collected.artifacts.map((artifact) => artifact.artifact_ref),
        fact_payload: factPayload,
        fact_hash: hashPayload({
          factId,
          result_hash: experimentResult.result_hash,
          validation_hash: validationHash,
          observation_hash: observation.observation_hash,
          factPayload,
        }),
        created_at: this.now(),
        source_refs: sourceRefs,
        provenance_refs: [refFor('experiment_result', experimentResult.experiment_result_id)],
      };
      await this.registryService.createRecord({
        record_kind: 'evaluation_fact',
        payload: asPayload(fact),
      });
      facts.push(fact);
    }
    return facts;
  }

  private async createValidationReport(
    validationId: string,
    validationHash: string,
    validationAnalysis: ValidationAnalysis,
    context: CollectContext,
    experimentResult: ExperimentResult,
    evaluationFacts: EvaluationFact[],
    sourceRefs: ExperimentFoundationRef[],
  ): Promise<ResultValidationReport> {
    const validationReport: ResultValidationReport = {
      result_validation_report_id: validationId,
      source_result_ref: refFor('experiment_result', experimentResult.experiment_result_id),
      source_result_hash: experimentResult.result_hash,
      validation_status: validationAnalysis.status,
      evaluation_protocol_lock: context.runRecipe.version_lock.evaluation_protocol_lock,
      checked_metric_keys: validationAnalysis.checkedMetricKeys,
      missing_metric_keys: validationAnalysis.missingMetricKeys,
      missing_artifact_kinds: validationAnalysis.missingArtifactKinds,
      protocol_violations: validationAnalysis.protocolViolations,
      warnings: validationAnalysis.warnings,
      generated_fact_refs: evaluationFacts.map((fact) => refFor('evaluation_fact', fact.evaluation_fact_id)),
      partial_acceptance_ref: validationAnalysis.status === 'accepted_partial'
        ? refFor('partial_acceptance', `partial_acceptance_${validationId}`)
        : null,
      validation_hash: validationHash,
      validated_at: this.now(),
      source_refs: sourceRefs,
    };
    await this.registryService.createRecord({
      record_kind: 'result_validation_report',
      payload: asPayload(validationReport),
    });
    return validationReport;
  }

  private async createFineTuningResult(
    taskSpec: TrainingTaskSpec,
    experimentResult: ExperimentResult,
    collected: AdapterCollectResult,
    validationStatus: ExperimentFoundationResultValidationStatus,
    sourceRefs: ExperimentFoundationRef[],
  ): Promise<FineTuningResult> {
    if (!taskSpec.fine_tuning_profile) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'llm_fine_tuning result requires fine_tuning_profile.');
    }
    const adapterArtifact = collected.artifacts.find((artifact) => artifact.artifact_kind === 'adapter')
      ?? buildSyntheticArtifact('adapter', `${experimentResult.experiment_result_id}_adapter`, collected.metadata);
    const modelCardArtifact = collected.artifacts.find((artifact) => artifact.artifact_kind === 'model_card')
      ?? buildSyntheticArtifact('model_card', `${experimentResult.experiment_result_id}_model_card`, collected.metadata);
    const fineTuningResultId = `fine_tuning_result_${randomUUID()}`;
    const fineTuningResult: FineTuningResult = {
      fine_tuning_result_id: fineTuningResultId,
      experiment_result_ref: refFor('experiment_result', experimentResult.experiment_result_id),
      experiment_result_hash: experimentResult.result_hash,
      training_task_spec_ref: refFor('training_task_spec', taskSpec.training_task_spec_id),
      training_task_spec_hash: experimentResult.training_task_spec_hash,
      run_recipe_id: taskSpec.run_recipe_id,
      run_recipe_hash: taskSpec.run_recipe_hash,
      version_lock_hash: taskSpec.version_lock_hash,
      base_model_ref: taskSpec.fine_tuning_profile.base_model_ref,
      fine_tuning_dataset_refs: taskSpec.fine_tuning_profile.fine_tuning_dataset_refs,
      adapter_artifact_ref: adapterArtifact.artifact_ref,
      adapter_artifact_hash: adapterArtifact.artifact_hash,
      checkpoint_artifact_refs: collected.artifacts.filter((artifact) => artifact.artifact_kind === 'checkpoint'),
      merged_model_artifact_ref: null,
      merged_model_artifact_hash: null,
      train_metrics: collected.metrics,
      eval_metrics: collected.metrics,
      training_curve_refs: collected.artifacts.filter((artifact) => artifact.artifact_kind === 'training_curve'),
      model_card_ref: modelCardArtifact.artifact_ref,
      model_card_hash: modelCardArtifact.artifact_hash,
      validation_status: validationStatus,
      blockers: validationStatus === 'valid' || validationStatus === 'accepted_partial' ? [] : ['result validation did not pass'],
      traceability_refs: sourceRefs,
      result_hash: hashPayload({ fineTuningResultId, experimentResultHash: experimentResult.result_hash }),
      created_at: this.now(),
    };
    await this.registryService.createRecord({
      record_kind: 'fine_tuning_result',
      payload: asPayload(fineTuningResult),
    });
    return fineTuningResult;
  }

  private async createEvidenceCandidate(
    context: CollectContext,
    experimentResult: ExperimentResult,
    validationReport: ResultValidationReport,
    metricObservations: MetricObservation[],
    collected: AdapterCollectResult,
    sourceRefs: ExperimentFoundationRef[],
  ): Promise<EvidenceCandidate> {
    const protocolLock = context.runRecipe.version_lock.evaluation_protocol_lock;
    const evidenceCandidateId = `evidence_candidate_${randomUUID()}`;
    const evidenceCandidate: EvidenceCandidate = {
      evidence_candidate_id: evidenceCandidateId,
      evidence_status: 'candidate',
      validation_status: validationReport.validation_status as 'valid' | 'accepted_partial',
      source_result_refs: [refFor('experiment_result', experimentResult.experiment_result_id)],
      source_result_hashes: [experimentResult.result_hash],
      validation_report_refs: [refFor('result_validation_report', validationReport.result_validation_report_id)],
      validation_report_hashes: [validationReport.validation_hash],
      run_recipe_id: context.taskSpec.run_recipe_id,
      run_recipe_hash: context.taskSpec.run_recipe_hash,
      version_lock_hash: context.taskSpec.version_lock_hash,
      evaluation_protocol_id: protocolLock.evaluation_protocol_id,
      evaluation_protocol_hash: protocolLock.protocol_hash,
      metric_observation_refs: metricObservations.map((observation) => refFor('metric_observation', observation.metric_observation_id)),
      metric_observation_hashes: metricObservations.map((observation) => observation.observation_hash),
      artifact_refs: collected.artifacts.map((artifact) => artifact.artifact_ref),
      caveats: validationReport.warnings,
      blockers: [],
      provenance_refs: sourceRefs,
      review_refs: [],
      created_by_ref: refFor('system', 'experiment_foundation_execution_service'),
      created_at: this.now(),
      evidence_hash: hashPayload({
        evidenceCandidateId,
        result_hash: experimentResult.result_hash,
        validation_hash: validationReport.validation_hash,
        observation_hashes: metricObservations.map((observation) => observation.observation_hash),
      }),
    };
    await this.registryService.createRecord({
      record_kind: 'evidence_candidate',
      payload: asPayload(evidenceCandidate),
    });
    return evidenceCandidate;
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

function analyzeValidation(
  collected: AdapterCollectResult,
  taskSpec: TrainingTaskSpec,
  job: ExternalTrainingJob,
  protocolMetrics: ProtocolMetricContext,
  acceptPartial: boolean,
): ValidationAnalysis {
  const hasTraceHashes = Boolean(
    taskSpec.run_recipe_hash
      && taskSpec.version_lock_hash
      && job.training_task_spec_hash
      && job.materialization_result_hash
      && collected.configSnapshotHash,
  );
  const checkedMetricKeys = collected.metrics.map((metric) => metric.metric_key);
  const missingMetricKeys = protocolMetrics.expectedMetricKeys
    .filter((metricKey) => !checkedMetricKeys.includes(metricKey));
  const missingArtifactKinds = collected.artifacts.length > 0 ? [] : ['metric_bundle'];
  const protocolViolations = [
    ...protocolMetrics.missingDefinitionRefs.map((ref) => `missing metric_definition ${ref.ref_id}`),
    ...collected.metrics
      .filter((metric) => !findMetricDefinition(protocolMetrics.definitions, metric))
      .map((metric) => `metric ${metric.metric_key} is not part of the locked evaluation protocol`),
  ];
  if (collected.status !== 'succeeded') {
    protocolViolations.push(`external job status ${collected.status}`);
  }
  if (!hasTraceHashes) {
    protocolViolations.push('missing trace hash for run recipe, version lock, task spec, materialization, or config snapshot');
  }
  const hasObservableFacts = checkedMetricKeys.length > 0 && (collected.artifacts.length > 0 || collected.logs.length > 0);
  const isProtocolComplete = hasTraceHashes
    && hasObservableFacts
    && missingMetricKeys.length === 0
    && missingArtifactKinds.length === 0
    && protocolViolations.length === 0;
  const warnings = acceptPartial ? ['accepted partial adapter output'] : [];
  if (collected.status === 'succeeded' && isProtocolComplete) {
    return {
      status: 'valid',
      checkedMetricKeys,
      missingMetricKeys,
      missingArtifactKinds,
      protocolViolations,
      warnings: [],
    };
  }
  if (acceptPartial && hasTraceHashes && checkedMetricKeys.length > 0) {
    return {
      status: 'accepted_partial',
      checkedMetricKeys,
      missingMetricKeys,
      missingArtifactKinds,
      protocolViolations,
      warnings,
    };
  }
  return {
    status: checkedMetricKeys.length > 0 ? 'partial' : 'invalid',
    checkedMetricKeys,
    missingMetricKeys,
    missingArtifactKinds,
    protocolViolations,
    warnings: [],
  };
}

function findMetricDefinition(
  definitions: MetricDefinition[],
  metric: { metric_key: string; metric_definition_ref: ExperimentFoundationRef },
): MetricDefinition | undefined {
  return definitions.find((definition) => definition.metric_definition_id === metric.metric_definition_ref.ref_id)
    ?? definitions.find((definition) => definition.metric_key === metric.metric_key);
}

function mapArtifactToPartialKind(
  artifactKind: ResultArtifact['artifact_kind'],
): TrainingTaskPartialResultRef['result_kind'] {
  if (artifactKind === 'metric_bundle') {
    return 'metrics';
  }
  if (artifactKind === 'config_snapshot') {
    return 'config_snapshot';
  }
  if (artifactKind === 'checkpoint') {
    return 'checkpoint';
  }
  if (artifactKind === 'model_card') {
    return 'model_card';
  }
  return 'artifact';
}

function buildSyntheticArtifact(
  artifactKind: ResultArtifact['artifact_kind'],
  artifactId: string,
  payload: unknown,
): ResultArtifact {
  return {
    result_artifact_id: artifactId,
    artifact_kind: artifactKind,
    artifact_ref: refFor('result_artifact', artifactId),
    artifact_hash: hashPayload({ artifactKind, artifactId, payload }),
    checksum_hash: hashPayload({ checksum: artifactKind, artifactId }),
    byte_size: JSON.stringify(payload).length,
    retention_policy_ref: refFor('retention_policy', 'experiment_foundation_default'),
    created_at: new Date().toISOString(),
    source_refs: [],
  };
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
