import type {
  CollectExternalTrainingJobRequest,
  ExperimentFoundationRef,
  ExternalTrainingJob,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-contracts';
import type {
  CancelLiveExperimentRunRequest,
  CollectLiveExperimentRunRequest,
  PaperImplementationLiveExperimentRunResponse,
  SubmitLiveExperimentRunRequest,
  SyncLiveExperimentRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-live-experiment-adapter-contracts';
import type {
  ResearchWorkOrder,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-workorder-contracts';
import { LEGACY_SCIENTIFIC_WRITER_CLOSED_REASON_CODE } from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import type { PaperImplementationWorkOrderRepository } from '../repositories/paper-implementation-workorder.repository.js';
import type { ExperimentFoundationExecutionService } from './experiment-foundation-execution-service.js';
import { PaperImplementationWorkOrderExperimentBridgeService } from './paper-implementation-workorder-experiment-bridge-service.js';

type ExperimentExecutionPort = Pick<
  ExperimentFoundationExecutionService,
  'submitJob' | 'getJob' | 'getJobByIdempotencyKey' | 'syncJob' | 'collectJob' | 'cancelJob'
>;

export type PaperImplementationLiveExperimentAdapterServiceOptions = {
  experimentExecution: ExperimentExecutionPort;
  workOrderService: PaperImplementationWorkOrderExperimentBridgeService;
  workOrderRepository: PaperImplementationWorkOrderRepository;
};

type MonitorMapping = {
  monitorEventKind: 'submitted' | 'status_update' | 'result_available' | 'failed' | 'cancelled';
  runStatus: 'submitted' | 'running' | 'succeeded' | 'failed' | 'cancelled';
};

export class PaperImplementationLiveExperimentAdapterService {
  constructor(private readonly options: PaperImplementationLiveExperimentAdapterServiceOptions) {}

  async submitLiveExperimentRun(
    implementationProjectId: string,
    workOrderId: string,
    request: SubmitLiveExperimentRunRequest,
  ): Promise<PaperImplementationLiveExperimentRunResponse> {
    const workOrder = await this.options.workOrderService.getResearchWorkOrder(
      implementationProjectId,
      workOrderId,
    );
    const submitInput = {
      training_task_spec_ref: this.requireExperimentRef(
        workOrder.experiment_bridge.training_task_spec_ref,
        'ResearchWorkOrder experiment_bridge.training_task_spec_ref',
      ),
      training_task_spec_hash: this.requireText(
        workOrder.experiment_bridge.training_task_spec_hash,
        'ResearchWorkOrder experiment_bridge.training_task_spec_hash',
      ),
      materialization_result_ref: this.requireExperimentRef(
        workOrder.experiment_bridge.materialization_result_ref,
        'ResearchWorkOrder experiment_bridge.materialization_result_ref',
      ),
      materialization_result_hash: this.requireText(
        workOrder.experiment_bridge.materialization_result_hash,
        'ResearchWorkOrder experiment_bridge.materialization_result_hash',
      ),
      idempotency_key: request.idempotency_key,
      requested_by_ref: request.requested_by_ref ?? this.workOrderExperimentRef(workOrder),
      source_refs: this.defaultSourceRefs(workOrder, request.source_refs),
    };
    const existing = await this.options.workOrderRepository.findHarnessRunByIdempotencyKey(
      implementationProjectId,
      workOrderId,
      request.idempotency_key,
    );
    if (existing) {
      const { external_job: externalJob } = await this.options.experimentExecution.getJobByIdempotencyKey(
        request.idempotency_key,
      );
      this.assertHarnessMatchesExternalJob(existing.external_job_ref, existing.external_job_hash, externalJob);
      return this.response('submit', 'submitted', externalJob, {
        harness_run: existing,
        handoffRefs: [this.externalTrainingJobRef(externalJob)],
        notes: ['Existing WorkOrder harness run returned for matching idempotency key.'],
      });
    }
    this.assertWorkOrderCanSubmit(workOrder);
    const { external_job: externalJob } = await this.options.experimentExecution.submitJob(submitInput);
    const harnessRun = await this.options.workOrderService.submitHarnessRun(
      implementationProjectId,
      workOrderId,
      {
        harness_run_id: request.harness_run_id ?? undefined,
        run_attempt: request.run_attempt ?? undefined,
        idempotency_key: request.idempotency_key,
        external_job_ref: this.toFunctionalRef(externalJob.external_job_ref),
        external_job_hash: externalJob.external_job_hash,
        submitted_at: request.submitted_at ?? externalJob.submitted_at,
        created_by: request.created_by,
      },
    );
    return this.response('submit', 'submitted', externalJob, {
      harness_run: harnessRun,
      handoffRefs: [this.externalTrainingJobRef(externalJob)],
      notes: ['External training job submitted and linked to ResearchWorkOrder harness run.'],
    });
  }

  async syncLiveExperimentRun(
    implementationProjectId: string,
    workOrderId: string,
    externalJobId: string,
    request: SyncLiveExperimentRunRequest,
  ): Promise<PaperImplementationLiveExperimentRunResponse> {
    const workOrder = await this.options.workOrderService.getResearchWorkOrder(
      implementationProjectId,
      workOrderId,
    );
    await this.requireOwnedExternalJob(workOrder, externalJobId);
    const { external_job: externalJob } = await this.options.experimentExecution.syncJob(externalJobId, {
      source_refs: this.defaultSourceRefs(workOrder, request.source_refs, externalJobId),
    });
    this.assertExternalJobBelongsToWorkOrder(workOrder, externalJob, externalJobId);
    const mapping = this.mapSyncMonitorStatus(externalJob.job_status);
    const terminalObserved = this.isTerminalExternalJobStatus(externalJob.job_status);
    const monitor = await this.options.workOrderService.recordRunMonitorIntake(
      implementationProjectId,
      {
        monitor_intake_id: request.monitor_intake_id ?? undefined,
        work_order_id: workOrderId,
        external_job_ref: this.toFunctionalRef(externalJob.external_job_ref),
        external_job_hash: externalJob.external_job_hash,
        monitor_event_kind: mapping.monitorEventKind,
        run_status: mapping.runStatus,
        raw_payload: this.rawPayload(externalJob),
        received_at: request.received_at ?? undefined,
        created_by: request.created_by,
      },
    );
    return this.response('sync', 'synced', externalJob, {
      monitor_intake: monitor.monitor_intake,
      handoffRefs: [this.externalTrainingJobRef(externalJob)],
      recommendedNextActions: terminalObserved
        ? this.finalizationActionsForExternalJob(externalJob)
        : undefined,
      notes: terminalObserved
        ? ['Terminal external job status observed during sync; collect or cancel records lifecycle facts only. Scientific evidence is admitted only by the v2 Evidence Trust Gateway.']
        : ['External job status synced as a monitor fact.'],
    });
  }

  async collectLiveExperimentRun(
    implementationProjectId: string,
    workOrderId: string,
    externalJobId: string,
    request: CollectLiveExperimentRunRequest,
  ): Promise<PaperImplementationLiveExperimentRunResponse> {
    this.assertLegacyRunEvidenceParametersClosed(
      request.run_evidence_unit_id,
      request.run_evidence_trace_manifest_id,
    );
    const workOrder = await this.options.workOrderService.getResearchWorkOrder(
      implementationProjectId,
      workOrderId,
    );
    await this.requireOwnedExternalJob(workOrder, externalJobId);
    const collectInput: CollectExternalTrainingJobRequest = {
      source_refs: this.defaultSourceRefs(workOrder, request.source_refs, externalJobId),
    };
    const { external_job: externalJob } = await this.options.experimentExecution.collectJob(
      externalJobId,
      collectInput,
    );
    this.assertExternalJobBelongsToWorkOrder(workOrder, externalJob, externalJobId);
    return this.recordFinalOrStatusUpdate(
      implementationProjectId,
      workOrder,
      externalJob,
      {
        action: 'collect',
        monitorIntakeId: request.monitor_intake_id ?? undefined,
        receivedAt: request.received_at ?? undefined,
        failureSummary: request.failure_summary ?? undefined,
        createdBy: request.created_by,
      },
    );
  }

  async cancelLiveExperimentRun(
    implementationProjectId: string,
    workOrderId: string,
    externalJobId: string,
    request: CancelLiveExperimentRunRequest,
  ): Promise<PaperImplementationLiveExperimentRunResponse> {
    this.assertLegacyRunEvidenceParametersClosed(
      request.run_evidence_unit_id,
      request.run_evidence_trace_manifest_id,
    );
    const workOrder = await this.options.workOrderService.getResearchWorkOrder(
      implementationProjectId,
      workOrderId,
    );
    await this.requireOwnedExternalJob(workOrder, externalJobId);
    const { external_job: externalJob } = await this.options.experimentExecution.cancelJob(externalJobId, {
      requested_by_ref: request.requested_by_ref ?? this.workOrderExperimentRef(workOrder),
      reason: request.reason,
      idempotency_key: request.idempotency_key,
      source_refs: this.defaultSourceRefs(workOrder, request.source_refs, externalJobId),
    });
    this.assertExternalJobBelongsToWorkOrder(workOrder, externalJob, externalJobId);
    return this.recordFinalOrStatusUpdate(
      implementationProjectId,
      workOrder,
      externalJob,
      {
        action: 'cancel',
        monitorIntakeId: request.monitor_intake_id ?? undefined,
        receivedAt: request.received_at ?? undefined,
        failureSummary: request.reason,
        createdBy: request.created_by,
      },
    );
  }

  private async recordFinalOrStatusUpdate(
    implementationProjectId: string,
    workOrder: ResearchWorkOrder,
    externalJob: ExternalTrainingJob,
    input: {
      action: 'collect' | 'cancel';
      monitorIntakeId?: string;
      receivedAt?: string;
      failureSummary?: string;
      createdBy?: 'human' | 'llm' | 'system' | 'hybrid';
    },
  ): Promise<PaperImplementationLiveExperimentRunResponse> {
    const mapping = this.mapMonitorStatus(externalJob.job_status);
    const terminal = ['succeeded', 'failed', 'cancelled'].includes(mapping.runStatus);
    if (!terminal) {
      const monitor = await this.options.workOrderService.recordRunMonitorIntake(
        implementationProjectId,
        {
          monitor_intake_id: input.monitorIntakeId,
          work_order_id: workOrder.work_order_id,
          external_job_ref: this.toFunctionalRef(externalJob.external_job_ref),
          external_job_hash: externalJob.external_job_hash,
          monitor_event_kind: mapping.monitorEventKind,
          run_status: mapping.runStatus,
          raw_payload: this.rawPayload(externalJob),
          received_at: input.receivedAt,
          created_by: input.createdBy,
        },
      );
      return this.response(input.action, input.action === 'cancel' ? 'cancel_requested' : 'synced', externalJob, {
        monitor_intake: monitor.monitor_intake,
        terminalEvidenceRecorded: false,
        handoffRefs: [this.externalTrainingJobRef(externalJob)],
        notes: ['External job is not terminal; no trusted RunEvidenceUnit was created.'],
      });
    }

    const monitor = await this.options.workOrderService.recordRunMonitorIntake(
      implementationProjectId,
      {
        monitor_intake_id: input.monitorIntakeId,
        work_order_id: workOrder.work_order_id,
        external_job_ref: this.toFunctionalRef(externalJob.external_job_ref),
        external_job_hash: externalJob.external_job_hash,
        monitor_event_kind: mapping.monitorEventKind,
        run_status: mapping.runStatus,
        failure_summary: mapping.runStatus === 'succeeded'
          ? null
          : input.failureSummary ?? `External job ${externalJob.external_job_id} ended with ${externalJob.job_status}.`,
        raw_payload: this.rawPayload(externalJob),
        received_at: input.receivedAt,
        created_by: input.createdBy,
      },
    );
    return this.response(input.action, input.action === 'cancel' ? 'cancel_requested' : 'collected', externalJob, {
      monitor_intake: monitor.monitor_intake,
      terminalEvidenceRecorded: false,
      handoffRefs: [this.externalTrainingJobRef(externalJob)],
      recommendedNextActions: mapping.runStatus === 'succeeded'
        ? ['await_evidence_trust_gateway_v2']
        : [],
      notes: [mapping.runStatus === 'succeeded'
        ? 'Terminal success recorded as a monitor fact. Only an EF-qualified EvidenceCandidate can enter the v2 Evidence Trust Gateway.'
        : 'Terminal failed or cancelled execution recorded as a lifecycle fact; it is not scientific evidence and creates no RunEvidenceUnit.'],
    });
  }

  private mapMonitorStatus(status: ExternalTrainingJob['job_status']): MonitorMapping {
    if (status === 'submitted' || status === 'queued') {
      return { monitorEventKind: 'submitted', runStatus: 'submitted' };
    }
    if (status === 'succeeded') {
      return { monitorEventKind: 'result_available', runStatus: 'succeeded' };
    }
    if (status === 'failed') {
      return { monitorEventKind: 'failed', runStatus: 'failed' };
    }
    if (status === 'cancelled') {
      return { monitorEventKind: 'cancelled', runStatus: 'cancelled' };
    }
    return { monitorEventKind: 'status_update', runStatus: 'running' };
  }

  private mapSyncMonitorStatus(status: ExternalTrainingJob['job_status']): MonitorMapping {
    if (status === 'submitted' || status === 'queued') {
      return { monitorEventKind: 'submitted', runStatus: 'submitted' };
    }
    return { monitorEventKind: 'status_update', runStatus: 'running' };
  }


  private defaultSourceRefs(
    workOrder: ResearchWorkOrder,
    sourceRefs: ExperimentFoundationRef[] | undefined,
    externalJobId?: string,
  ): ExperimentFoundationRef[] {
    if (sourceRefs && sourceRefs.length > 0) {
      return sourceRefs;
    }
    return [
      this.workOrderExperimentRef(workOrder),
      ...(externalJobId ? [{ ref_type: 'external_training_job', ref_id: externalJobId }] : []),
    ];
  }

  private response(
    action: PaperImplementationLiveExperimentRunResponse['action'],
    outcome: PaperImplementationLiveExperimentRunResponse['outcome'],
    externalJob: ExternalTrainingJob,
    input: {
      harness_run?: PaperImplementationLiveExperimentRunResponse['harness_run'];
      monitor_intake?: PaperImplementationLiveExperimentRunResponse['monitor_intake'];
      terminalEvidenceRecorded?: boolean;
      handoffRefs: TopicSelectionFunctionalRef[];
      recommendedNextActions?: string[];
      notes: string[];
    },
  ): PaperImplementationLiveExperimentRunResponse {
    const terminalEvidenceRecorded = input.terminalEvidenceRecorded ?? false;
    return {
      action,
      outcome,
      external_job: externalJob,
      harness_run: input.harness_run ?? null,
      monitor_intake: input.monitor_intake ?? null,
      terminal_evidence_recorded: terminalEvidenceRecorded,
      handoff: {
        next_action_refs: input.handoffRefs,
        recommended_next_actions: input.recommendedNextActions ?? ['sync_live_experiment_run'],
        notes: input.notes,
      },
    };
  }

  private assertHarnessMatchesExternalJob(
    harnessRef: TopicSelectionFunctionalRef,
    harnessHash: string,
    externalJob: ExternalTrainingJob,
  ): void {
    if (
      harnessRef.ref_type !== externalJob.external_job_ref.ref_type
      || harnessRef.ref_id !== externalJob.external_job_ref.ref_id
      || (harnessRef.version_id ?? null) !== (externalJob.external_job_ref.version_id ?? null)
      || harnessHash !== externalJob.external_job_hash
    ) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Existing harness run idempotency key points to a different external job.',
      );
    }
  }

  private assertWorkOrderCanSubmit(workOrder: ResearchWorkOrder): void {
    if (!['admitted', 'running'].includes(workOrder.work_order_status)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Live experiment submit requires an admitted or already running ResearchWorkOrder.',
      );
    }
  }

  private async requireOwnedExternalJob(
    workOrder: ResearchWorkOrder,
    externalJobId: string,
  ): Promise<ExternalTrainingJob> {
    const { external_job: externalJob } = await this.options.experimentExecution.getJob(externalJobId);
    this.assertExternalJobBelongsToWorkOrder(workOrder, externalJob, externalJobId);
    return externalJob;
  }

  private assertExternalJobBelongsToWorkOrder(
    workOrder: ResearchWorkOrder,
    externalJob: ExternalTrainingJob,
    externalJobId: string,
  ): void {
    const expectedExternalJobRef = workOrder.experiment_bridge.external_job_ref ?? null;
    const expectedExternalJobHash = workOrder.experiment_bridge.external_job_hash ?? null;
    if (externalJob.external_job_id !== externalJobId) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'External job lookup returned a different external_job_id than requested.',
      );
    }
    if (!expectedExternalJobRef || !this.hasText(expectedExternalJobHash)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Live experiment operation requires a ResearchWorkOrder linked to an external job.',
      );
    }
    if (
      expectedExternalJobRef.ref_type !== externalJob.external_job_ref.ref_type
      || expectedExternalJobRef.ref_id !== externalJob.external_job_ref.ref_id
      || (expectedExternalJobRef.version_id ?? null) !== (externalJob.external_job_ref.version_id ?? null)
      || expectedExternalJobHash !== externalJob.external_job_hash
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'External job does not belong to the ResearchWorkOrder harness run.',
      );
    }
  }

  private isTerminalExternalJobStatus(status: ExternalTrainingJob['job_status']): boolean {
    return status === 'succeeded' || status === 'failed' || status === 'cancelled';
  }

  private finalizationActionsForExternalJob(externalJob: ExternalTrainingJob): string[] {
    if (externalJob.job_status === 'cancelled') {
      return ['cancel_live_experiment_run'];
    }
    if (externalJob.job_status === 'succeeded' || externalJob.job_status === 'failed') {
      return ['collect_live_experiment_run'];
    }
    return ['sync_live_experiment_run'];
  }

  private hasText(value: string | null | undefined): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private rawPayload(externalJob: ExternalTrainingJob): Record<string, unknown> {
    return {
      source: 'paper_implementation_live_experiment_adapter',
      external_job_id: externalJob.external_job_id,
      job_status: externalJob.job_status,
      last_synced_at: externalJob.last_synced_at ?? null,
      completed_at: externalJob.completed_at ?? null,
    };
  }

  private assertLegacyRunEvidenceParametersClosed(
    runEvidenceUnitId: string | null | undefined,
    traceManifestId: string | null | undefined,
  ): void {
    if (!this.hasText(runEvidenceUnitId) && !this.hasText(traceManifestId)) {
      return;
    }
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      'Legacy live-experiment RunEvidenceUnit and TraceManifest minting is permanently closed.',
      {
        reason_code: LEGACY_SCIENTIFIC_WRITER_CLOSED_REASON_CODE,
        replacement_authority: 'paper_implementation_evidence_trust_gateway_v2',
        required_input: 'ef_qualified_evidence_candidate',
      },
    );
  }

  private externalTrainingJobRef(externalJob: ExternalTrainingJob): TopicSelectionFunctionalRef {
    return this.ref('external_training_job', externalJob.external_job_id);
  }

  private workOrderExperimentRef(workOrder: ResearchWorkOrder): ExperimentFoundationRef {
    return {
      ref_type: 'paper_implementation_research_work_order',
      ref_id: workOrder.work_order_id,
      version_id: null,
    };
  }

  private requireExperimentRef(
    ref: TopicSelectionFunctionalRef | null | undefined,
    fieldName: string,
  ): ExperimentFoundationRef {
    if (!ref) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', `${fieldName} is required for live experiment submit.`);
    }
    return this.toExperimentRef(ref);
  }

  private toExperimentRef(ref: TopicSelectionFunctionalRef): ExperimentFoundationRef {
    return {
      ref_type: ref.ref_type,
      ref_id: ref.ref_id,
      version_id: ref.version_id ?? null,
    };
  }

  private toFunctionalRef(ref: ExperimentFoundationRef): TopicSelectionFunctionalRef {
    return {
      ref_type: ref.ref_type,
      ref_id: ref.ref_id,
      version_id: ref.version_id ?? null,
    };
  }

  private ref(refType: string, refId: string): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      version_id: null,
    };
  }

  private requireText(value: string | null | undefined, fieldName: string): string {
    if (!value || value.trim().length === 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', `${fieldName} is required.`);
    }
    return value;
  }
}
