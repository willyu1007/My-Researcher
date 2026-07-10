import crypto from 'node:crypto';

import type {
  AdmitResearchWorkOrderRequest,
  CreateResearchWorkOrderDraftRequest,
  RecordRunMonitorIntakeRequest,
  RecordRunMonitorIntakeResponse,
  ResearchWorkOrder,
  ResearchWorkOrderHarnessRun,
  RunEvidenceUnit,
  RunMonitorIntakeRecord,
  SubmitResearchWorkOrderHarnessRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-workorder-contracts';
import type {
  ImplementationProject,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  ExperimentPlanLight,
  ValidationCycle,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';
import type {
  TraceManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import type { PaperImplementationRepository } from '../repositories/paper-implementation.repository.js';
import type { PaperImplementationTraceRepository } from '../repositories/paper-implementation-trace.repository.js';
import type { PaperImplementationValidationRepository } from '../repositories/paper-implementation-validation.repository.js';
import type { PaperImplementationWorkOrderRepository } from '../repositories/paper-implementation-workorder.repository.js';
import { findExperimentFoundationPayloadCopyKey } from './paper-implementation-experiment-foundation-boundary-guard.js';

type IdFactory = (prefix: string) => string;

export type PaperImplementationWorkOrderExperimentBridgeServiceOptions = {
  projectRepository: PaperImplementationRepository;
  traceRepository: PaperImplementationTraceRepository;
  validationRepository: PaperImplementationValidationRepository;
  workOrderRepository: PaperImplementationWorkOrderRepository;
  idFactory?: IdFactory;
  now?: () => string;
};

const FINAL_RUN_STATUSES = new Set(['succeeded', 'failed', 'cancelled', 'inconclusive', 'negative']);
const RESULT_REQUIRED_RUN_STATUSES = new Set(['succeeded']);
const FAILURE_SUMMARY_REQUIRED_RUN_STATUSES = new Set(['failed', 'cancelled', 'inconclusive', 'negative']);

export class PaperImplementationWorkOrderExperimentBridgeService {
  private readonly projectRepository: PaperImplementationRepository;
  private readonly traceRepository: PaperImplementationTraceRepository;
  private readonly validationRepository: PaperImplementationValidationRepository;
  private readonly workOrderRepository: PaperImplementationWorkOrderRepository;
  private readonly idFactory: IdFactory;
  private readonly now: () => string;

  constructor(options: PaperImplementationWorkOrderExperimentBridgeServiceOptions) {
    this.projectRepository = options.projectRepository;
    this.traceRepository = options.traceRepository;
    this.validationRepository = options.validationRepository;
    this.workOrderRepository = options.workOrderRepository;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async createResearchWorkOrderDraft(
    implementationProjectId: string,
    request: CreateResearchWorkOrderDraftRequest,
  ): Promise<ResearchWorkOrder> {
    const project = await this.requireActiveProject(implementationProjectId);
    const cycle = await this.requireAdmittedValidationCycle(
      project.implementation_project_id,
      request.validation_cycle_id,
    );
    const plan = request.experiment_plan_light_id
      ? await this.requireExperimentPlanLight(
        project.implementation_project_id,
        request.experiment_plan_light_id,
      )
      : null;
    if (plan?.validation_cycle_id && plan.validation_cycle_id !== cycle.validation_cycle_id) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ResearchWorkOrder ExperimentPlanLight must belong to the ValidationCycle.',
      );
    }
    this.assertRunPolicy(request);
    this.assertExperimentBridge(request);
    const workOrderId = request.work_order_id;
    const traceManifest = await this.requireCompleteTraceManifest(
      project.implementation_project_id,
      request.trace_manifest_id,
      'research_work_order',
      workOrderId,
    );
    const datasetRefs = this.requireRefs(
      request.dataset_version_refs ?? plan?.dataset_version_refs ?? [],
      'dataset_version_refs',
    );
    const codeRefs = this.requireRefs(
      request.code_version_refs ?? plan?.code_version_refs ?? [],
      'code_version_refs',
    );
    const configRefs = this.requireRefs(
      request.config_refs ?? plan?.config_refs ?? [],
      'config_refs',
    );
    const createdAt = this.now();
    const workOrder: ResearchWorkOrder = {
      work_order_id: workOrderId,
      implementation_project_id: project.implementation_project_id,
      validation_cycle_id: cycle.validation_cycle_id,
      experiment_plan_light_id: plan?.experiment_plan_light_id ?? request.experiment_plan_light_id ?? null,
      run_type: request.run_type,
      work_order_status: 'draft',
      run_policy: request.run_policy,
      experiment_bridge: request.experiment_bridge,
      motive_refs: this.dedupeRefs(request.motive_refs ?? cycle.context.included_refs.motive_version_refs),
      assertion_refs: this.dedupeRefs(request.assertion_refs ?? cycle.validation_frame.assertions_under_test),
      dataset_version_refs: datasetRefs,
      baseline_version_refs: this.dedupeRefs(request.baseline_version_refs ?? plan?.baseline_version_refs ?? []),
      code_version_refs: codeRefs,
      config_refs: configRefs,
      trace_manifest_ref: this.traceManifestRef(project, traceManifest),
      trace_manifest_id: traceManifest.trace_manifest_id,
      admission_gate_result_id: null,
      policy_version_id: request.policy_version_id ?? project.policy_version_id ?? null,
      created_by: request.created_by ?? 'system',
      created_at: createdAt,
      updated_at: createdAt,
      admitted_at: null,
    };
    return this.workOrderRepository.createWorkOrder(workOrder);
  }

  async admitResearchWorkOrder(
    implementationProjectId: string,
    workOrderId: string,
    request: AdmitResearchWorkOrderRequest,
  ): Promise<ResearchWorkOrder> {
    await this.requireActiveProject(implementationProjectId);
    if (!this.hasText(request.admission_gate_result_id)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'admission_gate_result_id is required.');
    }
    const workOrder = await this.requireWorkOrder(implementationProjectId, workOrderId);
    if (workOrder.work_order_status !== 'draft') {
      if (workOrder.admission_gate_result_id === request.admission_gate_result_id) {
        return workOrder;
      }
      if (this.hasText(workOrder.admission_gate_result_id)) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          'ResearchWorkOrder admission replay drifted from the admitted gate result.',
          {
            work_order_id: workOrder.work_order_id,
            admitted_gate_result_id: workOrder.admission_gate_result_id,
            requested_gate_result_id: request.admission_gate_result_id,
          },
        );
      }
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Only draft ResearchWorkOrder objects can be admitted.');
    }
    const gateResult = await this.traceRepository.findTraceGateResultById(
      implementationProjectId,
      request.admission_gate_result_id,
    );
    if (!gateResult) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ResearchWorkOrder admission_gate_result_id must resolve to a persisted TraceGateResult.',
        { admission_gate_result_id: request.admission_gate_result_id },
      );
    }
    if (gateResult.gate_status !== 'passed') {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ResearchWorkOrder admission requires a passed gate result.',
        { admission_gate_result_id: gateResult.gate_result_id, gate_status: gateResult.gate_status },
      );
    }
    if (gateResult.trace_manifest_id !== workOrder.trace_manifest_id) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ResearchWorkOrder admission gate result must target the work order trace manifest.',
        {
          admission_gate_result_id: gateResult.gate_result_id,
          gate_trace_manifest_id: gateResult.trace_manifest_id,
          work_order_trace_manifest_id: workOrder.trace_manifest_id,
        },
      );
    }
    const admittedAt = this.now();
    return this.workOrderRepository.updateWorkOrder({
      ...workOrder,
      work_order_status: 'admitted',
      admission_gate_result_id: request.admission_gate_result_id,
      updated_at: admittedAt,
      admitted_at: admittedAt,
    });
  }

  async listResearchWorkOrders(
    implementationProjectId: string,
  ): Promise<ResearchWorkOrder[]> {
    await this.requireActiveProject(implementationProjectId);
    return this.workOrderRepository.listWorkOrders(implementationProjectId);
  }

  async getResearchWorkOrder(
    implementationProjectId: string,
    workOrderId: string,
  ): Promise<ResearchWorkOrder> {
    await this.requireActiveProject(implementationProjectId);
    return this.requireWorkOrder(implementationProjectId, workOrderId);
  }

  async submitHarnessRun(
    implementationProjectId: string,
    workOrderId: string,
    request: SubmitResearchWorkOrderHarnessRunRequest,
  ): Promise<ResearchWorkOrderHarnessRun> {
    await this.requireActiveProject(implementationProjectId);
    const workOrder = await this.requireWorkOrder(implementationProjectId, workOrderId);
    if (!this.hasText(request.idempotency_key)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'idempotency_key is required.');
    }
    const existingRun = await this.workOrderRepository.findHarnessRunByIdempotencyKey(
      implementationProjectId,
      workOrderId,
      request.idempotency_key,
    );
    if (existingRun) {
      this.assertHarnessRunReplayMatches(existingRun, request);
      return existingRun;
    }
    if (!['admitted', 'running'].includes(workOrder.work_order_status)) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Harness runs require an admitted ResearchWorkOrder.');
    }
    const createdAt = this.now();
    const harnessRun: ResearchWorkOrderHarnessRun = {
      harness_run_id: request.harness_run_id ?? this.idFactory('work_order_harness_run'),
      implementation_project_id: implementationProjectId,
      work_order_id: workOrder.work_order_id,
      run_status: 'submitted',
      run_attempt: request.run_attempt ?? 1,
      idempotency_key: request.idempotency_key,
      external_job_ref: request.external_job_ref,
      external_job_hash: request.external_job_hash,
      submitted_at: request.submitted_at ?? createdAt,
      completed_at: null,
      created_by: request.created_by ?? 'system',
      created_at: createdAt,
    };
    const updatedWorkOrder: ResearchWorkOrder = {
      ...workOrder,
      work_order_status: 'running',
      experiment_bridge: {
        ...workOrder.experiment_bridge,
        external_job_ref: request.external_job_ref,
        external_job_hash: request.external_job_hash,
      },
      updated_at: createdAt,
    };
    return this.workOrderRepository.createHarnessRun(harnessRun, updatedWorkOrder);
  }

  async listHarnessRuns(
    implementationProjectId: string,
    workOrderId: string,
  ): Promise<ResearchWorkOrderHarnessRun[]> {
    await this.requireActiveProject(implementationProjectId);
    await this.requireWorkOrder(implementationProjectId, workOrderId);
    return this.workOrderRepository.listHarnessRuns(implementationProjectId, workOrderId);
  }

  async recordRunMonitorIntake(
    implementationProjectId: string,
    request: RecordRunMonitorIntakeRequest,
  ): Promise<RecordRunMonitorIntakeResponse> {
    const project = await this.requireActiveProject(implementationProjectId);
    const receivedAt = request.received_at ?? this.now();
    const workOrder = request.work_order_id
      ? await this.requireWorkOrder(implementationProjectId, request.work_order_id)
      : null;
    const trustStatus = workOrder ? 'trusted' : 'untrusted';
    this.assertNoExperimentFoundationPayloadCopy(request.raw_payload ?? {}, 'RunMonitorIntake raw_payload');
    const monitorIntake: RunMonitorIntakeRecord = {
      monitor_intake_id: request.monitor_intake_id ?? this.idFactory('run_monitor_intake'),
      implementation_project_id: implementationProjectId,
      work_order_id: workOrder?.work_order_id ?? request.work_order_id ?? null,
      external_job_ref: request.external_job_ref ?? workOrder?.experiment_bridge.external_job_ref ?? null,
      external_job_hash: request.external_job_hash ?? workOrder?.experiment_bridge.external_job_hash ?? null,
      monitor_event_kind: request.monitor_event_kind,
      run_status: request.run_status,
      trust_status: trustStatus,
      result_ref: request.result_ref ?? null,
      result_hash: request.result_hash ?? null,
      result_validation_report_ref: request.result_validation_report_ref ?? null,
      result_validation_report_hash: request.result_validation_report_hash ?? null,
      evidence_candidate_refs: request.evidence_candidate_refs ?? [],
      evidence_candidate_hashes: request.evidence_candidate_hashes ?? [],
      failure_summary: request.failure_summary ?? null,
      raw_payload: request.raw_payload ?? {},
      received_at: receivedAt,
      created_by: request.created_by ?? 'system',
    };
    let runEvidenceUnit: RunEvidenceUnit | null = null;
    let updatedWorkOrder: ResearchWorkOrder | null = null;
    if (workOrder) {
      this.assertMonitorMatchesWorkOrder(workOrder, monitorIntake);
      updatedWorkOrder = this.updateWorkOrderForRunStatus(workOrder, request.run_status, receivedAt);
      if (FINAL_RUN_STATUSES.has(request.run_status)) {
        this.assertFinalRunEvidenceInput(request);
        const runEvidenceUnitId = this.requireRunEvidenceUnitId(request.run_evidence_unit_id);
        const runEvidenceTraceManifest = await this.requireRunEvidenceTraceManifest(
          implementationProjectId,
          request.run_evidence_trace_manifest_id,
          runEvidenceUnitId,
        );
        runEvidenceUnit = {
          run_evidence_unit_id: runEvidenceUnitId,
          implementation_project_id: implementationProjectId,
          work_order_id: workOrder.work_order_id,
          validation_cycle_id: workOrder.validation_cycle_id,
          experiment_plan_light_id: workOrder.experiment_plan_light_id ?? null,
          monitor_intake_id: monitorIntake.monitor_intake_id,
          external_job_ref: monitorIntake.external_job_ref ?? null,
          external_job_hash: monitorIntake.external_job_hash ?? null,
          run_type: workOrder.run_type,
          run_status: request.run_status,
          trusted_status: 'trusted',
          dataset_version_refs: workOrder.dataset_version_refs,
          baseline_version_refs: workOrder.baseline_version_refs,
          code_version_refs: workOrder.code_version_refs,
          config_refs: workOrder.config_refs,
          result_ref: request.result_ref ?? null,
          result_hash: request.result_hash ?? null,
          result_validation_report_ref: request.result_validation_report_ref ?? null,
          result_validation_report_hash: request.result_validation_report_hash ?? null,
          evidence_candidate_refs: request.evidence_candidate_refs ?? [],
          evidence_candidate_hashes: request.evidence_candidate_hashes ?? [],
          failure_summary_id: request.failure_summary
            ? this.idFactory('run_failure_summary')
            : null,
          failure_summary: request.failure_summary ?? null,
          trace_manifest_ref: this.traceManifestRef(project, runEvidenceTraceManifest),
          trace_manifest_id: runEvidenceTraceManifest.trace_manifest_id,
          created_by: request.created_by ?? 'system',
          created_at: receivedAt,
        };
      }
    }
    const persisted = await this.workOrderRepository.recordMonitorIngestion({
      monitor_intake: monitorIntake,
      run_evidence_unit: runEvidenceUnit,
      work_order: updatedWorkOrder,
    });
    return {
      monitor_intake: persisted.monitor_intake,
      run_evidence_unit: persisted.run_evidence_unit,
    };
  }

  async listRunEvidenceUnits(
    implementationProjectId: string,
  ): Promise<RunEvidenceUnit[]> {
    await this.requireActiveProject(implementationProjectId);
    return this.workOrderRepository.listRunEvidenceUnits(implementationProjectId);
  }

  async getRunEvidenceUnit(
    implementationProjectId: string,
    runEvidenceUnitId: string,
  ): Promise<RunEvidenceUnit> {
    await this.requireActiveProject(implementationProjectId);
    const unit = await this.workOrderRepository.findRunEvidenceUnitById(
      implementationProjectId,
      runEvidenceUnitId,
    );
    if (!unit) {
      throw new AppError(404, 'NOT_FOUND', `RunEvidenceUnit ${runEvidenceUnitId} not found.`);
    }
    return unit;
  }

  private async requireActiveProject(implementationProjectId: string): Promise<ImplementationProject> {
    if (!this.hasText(implementationProjectId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'implementation_project_id is required.');
    }
    const project = await this.projectRepository.findProjectById(implementationProjectId);
    if (!project) {
      throw new AppError(404, 'NOT_FOUND', `ImplementationProject ${implementationProjectId} not found.`);
    }
    if (project.lifecycle_status !== 'active') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'WorkOrder bridge requires an active ImplementationProject.');
    }
    return project;
  }

  private async requireAdmittedValidationCycle(
    implementationProjectId: string,
    validationCycleId: string,
  ): Promise<ValidationCycle> {
    const cycle = await this.validationRepository.findValidationCycleById(
      implementationProjectId,
      validationCycleId,
    );
    if (!cycle) {
      throw new AppError(404, 'NOT_FOUND', `ValidationCycle ${validationCycleId} not found.`);
    }
    if (cycle.lifecycle_status !== 'admitted') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'ResearchWorkOrder requires an admitted ValidationCycle.');
    }
    return cycle;
  }

  private async requireExperimentPlanLight(
    implementationProjectId: string,
    experimentPlanLightId: string,
  ): Promise<ExperimentPlanLight> {
    const plan = await this.validationRepository.findExperimentPlanLightById(
      implementationProjectId,
      experimentPlanLightId,
    );
    if (!plan) {
      throw new AppError(404, 'NOT_FOUND', `ExperimentPlanLight ${experimentPlanLightId} not found.`);
    }
    return plan;
  }

  private async requireWorkOrder(
    implementationProjectId: string,
    workOrderId: string,
  ): Promise<ResearchWorkOrder> {
    const workOrder = await this.workOrderRepository.findWorkOrderById(implementationProjectId, workOrderId);
    if (!workOrder) {
      throw new AppError(404, 'NOT_FOUND', `ResearchWorkOrder ${workOrderId} not found.`);
    }
    return workOrder;
  }

  private async requireCompleteTraceManifest(
    implementationProjectId: string,
    traceManifestId: string,
    targetRefType: string,
    targetRefId: string,
  ): Promise<TraceManifest> {
    const manifest = await this.traceRepository.findTraceManifestById(implementationProjectId, traceManifestId);
    if (!manifest) {
      throw new AppError(404, 'NOT_FOUND', `TraceManifest ${traceManifestId} not found.`);
    }
    if (manifest.trace_status !== 'complete') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'ResearchWorkOrder requires a complete TraceManifest.');
    }
    if (
      this.normalizedRefType(manifest.target_ref.ref_type) !== this.normalizedRefType(targetRefType)
      || manifest.target_ref.ref_id !== targetRefId
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `TraceManifest ${traceManifestId} does not target ${targetRefType}:${targetRefId}.`,
      );
    }
    return manifest;
  }

  private assertRunPolicy(request: CreateResearchWorkOrderDraftRequest): void {
    if (!this.hasText(request.work_order_id)) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'ResearchWorkOrder requires explicit work_order_id so the trace manifest can target it before creation.',
      );
    }
    const policy = request.run_policy;
    if (
      !this.hasText(policy.run_policy_id)
      || policy.retry_budget < 0
      || policy.stop_condition_refs.length === 0
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ResearchWorkOrder requires run policy id, retry budget, and stop conditions.',
      );
    }
    if (
      ['confirmatory', 'reproduction'].includes(request.run_type)
      && policy.autotune_policy !== 'disabled'
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Confirmatory and reproduction work orders cannot use autotune as primary evidence path.',
      );
    }
  }

  private assertExperimentBridge(request: CreateResearchWorkOrderDraftRequest): void {
    const bridge = request.experiment_bridge;
    this.assertNoExperimentFoundationPayloadCopy(bridge, 'ResearchWorkOrder experiment_bridge');
    if (!this.hasText(bridge.run_recipe_hash)) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'ResearchWorkOrder requires run_recipe_hash.');
    }
    if (
      ['confirmatory', 'reproduction'].includes(request.run_type)
      && (!this.hasText(bridge.version_lock_hash) || !this.hasText(bridge.config_snapshot_hash))
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Confirmatory and reproduction work orders require version_lock_hash and config_snapshot_hash.',
      );
    }
  }

  private assertFinalRunEvidenceInput(request: RecordRunMonitorIntakeRequest): void {
    if (
      RESULT_REQUIRED_RUN_STATUSES.has(request.run_status)
      && (!request.result_ref || !this.hasText(request.result_hash))
    ) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Successful run evidence requires result_ref and result_hash.');
    }
    if (
      RESULT_REQUIRED_RUN_STATUSES.has(request.run_status)
      && (!request.result_validation_report_ref || !this.hasText(request.result_validation_report_hash))
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Successful run evidence requires result validation report ref and hash.',
      );
    }
    if (
      FAILURE_SUMMARY_REQUIRED_RUN_STATUSES.has(request.run_status)
      && !this.hasText(request.failure_summary)
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Failed, cancelled, inconclusive, and negative run evidence requires failure_summary.',
      );
    }
  }

  private requireRunEvidenceUnitId(runEvidenceUnitId: string | undefined): string {
    if (!this.hasText(runEvidenceUnitId)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Trusted final run evidence requires explicit run_evidence_unit_id so its TraceManifest can target it.',
      );
    }
    return runEvidenceUnitId;
  }

  private async requireRunEvidenceTraceManifest(
    implementationProjectId: string,
    traceManifestId: string | null | undefined,
    runEvidenceUnitId: string,
  ): Promise<TraceManifest> {
    if (!this.hasText(traceManifestId)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Trusted final run evidence requires run_evidence_trace_manifest_id targeting the RunEvidenceUnit.',
      );
    }
    return this.requireCompleteTraceManifest(
      implementationProjectId,
      traceManifestId,
      'run_evidence_unit',
      runEvidenceUnitId,
    );
  }

  private assertMonitorMatchesWorkOrder(
    workOrder: ResearchWorkOrder,
    intake: RunMonitorIntakeRecord,
  ): void {
    const expectedExternalJobRef = workOrder.experiment_bridge.external_job_ref ?? null;
    const expectedExternalJobHash = workOrder.experiment_bridge.external_job_hash ?? null;
    if (!['running', 'completed', 'failed', 'cancelled'].includes(workOrder.work_order_status)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Run monitor intake requires a ResearchWorkOrder with a submitted harness run.',
      );
    }
    if (!expectedExternalJobRef || !this.hasText(expectedExternalJobHash)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Run monitor intake requires external_job_ref and external_job_hash recorded by the harness.',
      );
    }
    if (
      expectedExternalJobRef
      && intake.external_job_ref
      && this.refKey(expectedExternalJobRef) !== this.refKey(intake.external_job_ref)
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Run monitor intake external_job_ref does not match the ResearchWorkOrder harness run.',
      );
    }
    if (
      this.hasText(expectedExternalJobHash)
      && this.hasText(intake.external_job_hash)
      && expectedExternalJobHash !== intake.external_job_hash
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Run monitor intake external_job_hash does not match the ResearchWorkOrder harness run.',
      );
    }
    if (
      FINAL_RUN_STATUSES.has(intake.run_status)
      && (!intake.external_job_ref || !this.hasText(intake.external_job_hash))
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Trusted final run evidence requires external_job_ref and external_job_hash.',
      );
    }
  }

  private assertHarnessRunReplayMatches(
    existingRun: ResearchWorkOrderHarnessRun,
    request: SubmitResearchWorkOrderHarnessRunRequest,
  ): void {
    const requestHarnessRunId = request.harness_run_id ?? existingRun.harness_run_id;
    const requestRunAttempt = request.run_attempt ?? existingRun.run_attempt;
    if (
      requestHarnessRunId !== existingRun.harness_run_id
      || requestRunAttempt !== existingRun.run_attempt
      || this.refKey(request.external_job_ref) !== this.refKey(existingRun.external_job_ref)
      || request.external_job_hash !== existingRun.external_job_hash
    ) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'ResearchWorkOrder harness run idempotency replay drifted from the submitted external job identity.',
        {
          work_order_id: existingRun.work_order_id,
          idempotency_key: existingRun.idempotency_key,
          harness_run_id: existingRun.harness_run_id,
        },
      );
    }
  }

  private updateWorkOrderForRunStatus(
    workOrder: ResearchWorkOrder,
    runStatus: RecordRunMonitorIntakeRequest['run_status'],
    updatedAt: string,
  ): ResearchWorkOrder {
    const status = runStatus === 'succeeded'
      ? 'completed'
      : runStatus === 'failed'
        ? 'failed'
        : runStatus === 'cancelled'
          ? 'cancelled'
          : FINAL_RUN_STATUSES.has(runStatus)
            ? 'completed'
            : 'running';
    return {
      ...workOrder,
      work_order_status: status,
      updated_at: updatedAt,
    };
  }

  private requireRefs(
    refs: TopicSelectionFunctionalRef[],
    fieldName: string,
  ): TopicSelectionFunctionalRef[] {
    if (refs.length === 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', `ResearchWorkOrder requires ${fieldName}.`);
    }
    return this.dedupeRefs(refs);
  }

  private traceManifestRef(
    project: ImplementationProject,
    manifest: TraceManifest,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: 'trace_manifest',
      ref_id: manifest.trace_manifest_id,
      title_card_id: project.title_card_id,
      version_id: null,
    };
  }

  private dedupeRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const deduped: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
      const key = this.refKey(ref);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      deduped.push(ref);
    }
    return deduped;
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return `${this.normalizedRefType(ref.ref_type)}:${ref.ref_id}:${ref.version_id ?? ''}`;
  }

  private normalizedRefType(refType: string): string {
    return refType.toLowerCase().replace(/[_-]/g, '');
  }

  private hasText(value: string | null | undefined): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private assertNoExperimentFoundationPayloadCopy(value: unknown, context: string): void {
    const blocked = findExperimentFoundationPayloadCopyKey(value);
    if (blocked) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `${context} must carry experiment-foundation refs/hashes only; forbidden field ${blocked} copies domain DTO or paper-claim state.`,
      );
    }
  }
}
