import type {
  PaperImplementationResearchWorkOrder as ResearchWorkOrderRow,
  PaperImplementationRunEvidenceUnit as RunEvidenceUnitRow,
  PaperImplementationRunMonitorIntake as RunMonitorIntakeRow,
  PaperImplementationWorkOrderHarnessRun as HarnessRunRow,
  PrismaClient,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  ExperimentFoundationBridgeRefs,
  ResearchWorkOrder,
  ResearchWorkOrderHarnessRun,
  ResearchWorkOrderPolicy,
  RunEvidenceUnit,
  RunMonitorIntakeRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-workorder-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import type {
  PaperImplementationWorkOrderRepository,
  RunMonitorIngestionPersistence,
} from '../paper-implementation-workorder.repository.js';

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asFunctionalRef(value: unknown): TopicSelectionFunctionalRef {
  return asRecord(value) as unknown as TopicSelectionFunctionalRef;
}

function asNullableFunctionalRef(value: unknown): TopicSelectionFunctionalRef | null {
  return value === null || value === undefined
    ? null
    : asFunctionalRef(value);
}

function refKey(ref: TopicSelectionFunctionalRef): string {
  return [
    ref.ref_type,
    ref.ref_id,
    ref.version_id ?? '',
  ].join(':');
}

function refKeys(refs: TopicSelectionFunctionalRef[]): string[] {
  return refs.map((ref) => refKey(ref));
}

function toWorkOrder(row: ResearchWorkOrderRow): ResearchWorkOrder {
  return {
    work_order_id: row.id,
    implementation_project_id: row.implementationProjectId,
    validation_cycle_id: row.validationCycleId,
    experiment_plan_light_id: row.experimentPlanLightId,
    run_type: row.runType as ResearchWorkOrder['run_type'],
    work_order_status: row.workOrderStatus as ResearchWorkOrder['work_order_status'],
    run_policy: {
      run_policy_id: row.runPolicyId,
      retry_budget: row.retryBudget,
      compute_limit_ref: asNullableFunctionalRef(row.computeLimitRef),
      stop_condition_refs: asArray<TopicSelectionFunctionalRef>(row.stopConditionRefPayloads),
      allowed_mutation_refs: asArray<TopicSelectionFunctionalRef>(row.allowedMutationRefPayloads),
      autotune_policy: row.autotunePolicy as ResearchWorkOrderPolicy['autotune_policy'],
    },
    experiment_bridge: asRecord(row.experimentBridge) as unknown as ExperimentFoundationBridgeRefs,
    motive_refs: asArray<TopicSelectionFunctionalRef>(row.motiveRefPayloads),
    assertion_refs: asArray<TopicSelectionFunctionalRef>(row.assertionRefPayloads),
    dataset_version_refs: asArray<TopicSelectionFunctionalRef>(row.datasetVersionRefPayloads),
    baseline_version_refs: asArray<TopicSelectionFunctionalRef>(row.baselineVersionRefPayloads),
    code_version_refs: asArray<TopicSelectionFunctionalRef>(row.codeVersionRefPayloads),
    config_refs: asArray<TopicSelectionFunctionalRef>(row.configRefPayloads),
    trace_manifest_ref: asFunctionalRef(row.traceManifestRef),
    trace_manifest_id: row.traceManifestId,
    admission_gate_result_id: row.admissionGateResultId,
    policy_version_id: row.policyVersionId,
    source_proposal_artifact_ref: asNullableFunctionalRef(row.sourceProposalArtifactRef),
    source_proposal_artifact_hash: row.sourceProposalArtifactHash,
    created_by: row.createdBy as ResearchWorkOrder['created_by'],
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    admitted_at: row.admittedAt?.toISOString() ?? null,
  };
}

function toHarnessRun(row: HarnessRunRow): ResearchWorkOrderHarnessRun {
  return {
    harness_run_id: row.id,
    implementation_project_id: row.implementationProjectId,
    work_order_id: row.workOrderId,
    run_status: row.runStatus as ResearchWorkOrderHarnessRun['run_status'],
    run_attempt: row.runAttempt,
    idempotency_key: row.idempotencyKey,
    external_job_ref: asFunctionalRef(row.externalJobRef),
    external_job_hash: row.externalJobHash,
    submitted_at: row.submittedAt.toISOString(),
    completed_at: row.completedAt?.toISOString() ?? null,
    created_by: row.createdBy as ResearchWorkOrderHarnessRun['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toMonitorIntake(row: RunMonitorIntakeRow): RunMonitorIntakeRecord {
  return {
    monitor_intake_id: row.id,
    implementation_project_id: row.implementationProjectId,
    work_order_id: row.workOrderId,
    external_job_ref: asNullableFunctionalRef(row.externalJobRef),
    external_job_hash: row.externalJobHash,
    monitor_event_kind: row.monitorEventKind as RunMonitorIntakeRecord['monitor_event_kind'],
    run_status: row.runStatus as RunMonitorIntakeRecord['run_status'],
    trust_status: row.trustStatus as RunMonitorIntakeRecord['trust_status'],
    result_ref: asNullableFunctionalRef(row.resultRef),
    result_hash: row.resultHash,
    result_validation_report_ref: asNullableFunctionalRef(row.resultValidationReportRef),
    result_validation_report_hash: row.resultValidationReportHash,
    evidence_candidate_refs: asArray<TopicSelectionFunctionalRef>(row.evidenceCandidateRefPayloads),
    evidence_candidate_hashes: row.evidenceCandidateHashes,
    failure_summary: row.failureSummary,
    raw_payload: asRecord(row.rawPayload),
    received_at: row.receivedAt.toISOString(),
    created_by: row.createdBy as RunMonitorIntakeRecord['created_by'],
  };
}

function toRunEvidenceUnit(row: RunEvidenceUnitRow): RunEvidenceUnit {
  return {
    run_evidence_unit_id: row.id,
    implementation_project_id: row.implementationProjectId,
    work_order_id: row.workOrderId,
    validation_cycle_id: row.validationCycleId,
    experiment_plan_light_id: row.experimentPlanLightId,
    monitor_intake_id: row.monitorIntakeId,
    external_job_ref: asNullableFunctionalRef(row.externalJobRef),
    external_job_hash: row.externalJobHash,
    run_type: row.runType as RunEvidenceUnit['run_type'],
    run_status: row.runStatus as RunEvidenceUnit['run_status'],
    trusted_status: row.trustedStatus as RunEvidenceUnit['trusted_status'],
    dataset_version_refs: asArray<TopicSelectionFunctionalRef>(row.datasetVersionRefPayloads),
    baseline_version_refs: asArray<TopicSelectionFunctionalRef>(row.baselineVersionRefPayloads),
    code_version_refs: asArray<TopicSelectionFunctionalRef>(row.codeVersionRefPayloads),
    config_refs: asArray<TopicSelectionFunctionalRef>(row.configRefPayloads),
    result_ref: asNullableFunctionalRef(row.resultRef),
    result_hash: row.resultHash,
    result_validation_report_ref: asNullableFunctionalRef(row.resultValidationReportRef),
    result_validation_report_hash: row.resultValidationReportHash,
    evidence_candidate_refs: asArray<TopicSelectionFunctionalRef>(row.evidenceCandidateRefPayloads),
    evidence_candidate_hashes: row.evidenceCandidateHashes,
    failure_summary_id: row.failureSummaryId,
    failure_summary: row.failureSummary,
    trace_manifest_ref: asFunctionalRef(row.traceManifestRef),
    trace_manifest_id: row.traceManifestId,
    created_by: row.createdBy as RunEvidenceUnit['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

export class PrismaPaperImplementationWorkOrderRepository
implements PaperImplementationWorkOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createWorkOrder(workOrder: ResearchWorkOrder): Promise<ResearchWorkOrder> {
    const row = await this.prisma.paperImplementationResearchWorkOrder.create({
      data: this.toWorkOrderCreateInput(workOrder),
    });
    return toWorkOrder(row);
  }

  async findWorkOrderById(
    implementationProjectId: string,
    workOrderId: string,
  ): Promise<ResearchWorkOrder | null> {
    const row = await this.prisma.paperImplementationResearchWorkOrder.findFirst({
      where: { id: workOrderId, implementationProjectId },
    });
    return row ? toWorkOrder(row) : null;
  }

  async listWorkOrders(
    implementationProjectId: string,
  ): Promise<ResearchWorkOrder[]> {
    const rows = await this.prisma.paperImplementationResearchWorkOrder.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => toWorkOrder(row));
  }

  async updateWorkOrder(workOrder: ResearchWorkOrder): Promise<ResearchWorkOrder> {
    const row = await this.prisma.paperImplementationResearchWorkOrder.update({
      where: { id: workOrder.work_order_id },
      data: this.toWorkOrderUpdateInput(workOrder),
    });
    return toWorkOrder(row);
  }

  async createHarnessRun(
    harnessRun: ResearchWorkOrderHarnessRun,
    workOrder: ResearchWorkOrder,
  ): Promise<ResearchWorkOrderHarnessRun> {
    const [runRow] = await this.prisma.$transaction([
      this.prisma.paperImplementationWorkOrderHarnessRun.create({
        data: this.toHarnessRunCreateInput(harnessRun),
      }),
      this.prisma.paperImplementationResearchWorkOrder.update({
        where: { id: workOrder.work_order_id },
        data: this.toWorkOrderUpdateInput(workOrder),
      }),
    ]);
    return toHarnessRun(runRow);
  }

  async findHarnessRunByIdempotencyKey(
    implementationProjectId: string,
    workOrderId: string,
    idempotencyKey: string,
  ): Promise<ResearchWorkOrderHarnessRun | null> {
    const row = await this.prisma.paperImplementationWorkOrderHarnessRun.findFirst({
      where: { implementationProjectId, workOrderId, idempotencyKey },
      orderBy: { createdAt: 'desc' },
    });
    return row ? toHarnessRun(row) : null;
  }

  async listHarnessRuns(
    implementationProjectId: string,
    workOrderId: string,
  ): Promise<ResearchWorkOrderHarnessRun[]> {
    const rows = await this.prisma.paperImplementationWorkOrderHarnessRun.findMany({
      where: { implementationProjectId, workOrderId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => toHarnessRun(row));
  }

  async recordMonitorIngestion(
    persistence: RunMonitorIngestionPersistence,
  ): Promise<RunMonitorIngestionPersistence> {
    const operations: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.paperImplementationRunMonitorIntake.create({
        data: this.toMonitorIntakeCreateInput(persistence.monitor_intake),
      }),
    ];
    if (persistence.work_order) {
      operations.push(
        this.prisma.paperImplementationResearchWorkOrder.update({
          where: { id: persistence.work_order.work_order_id },
          data: this.toWorkOrderUpdateInput(persistence.work_order),
        }),
      );
    }
    const rows = await this.prisma.$transaction(operations);
    return {
      monitor_intake: toMonitorIntake(rows[0] as RunMonitorIntakeRow),
      work_order: persistence.work_order,
    };
  }

  async listRunEvidenceUnits(
    implementationProjectId: string,
  ): Promise<RunEvidenceUnit[]> {
    const rows = await this.prisma.paperImplementationRunEvidenceUnit.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => toRunEvidenceUnit(row));
  }

  async findRunEvidenceUnitById(
    implementationProjectId: string,
    runEvidenceUnitId: string,
  ): Promise<RunEvidenceUnit | null> {
    const row = await this.prisma.paperImplementationRunEvidenceUnit.findFirst({
      where: { id: runEvidenceUnitId, implementationProjectId },
    });
    return row ? toRunEvidenceUnit(row) : null;
  }

  private toWorkOrderCreateInput(
    workOrder: ResearchWorkOrder,
  ): Prisma.PaperImplementationResearchWorkOrderCreateInput {
    const bridge = workOrder.experiment_bridge;
    return {
      id: workOrder.work_order_id,
      implementationProjectId: workOrder.implementation_project_id,
      validationCycleId: workOrder.validation_cycle_id,
      experimentPlanLightId: workOrder.experiment_plan_light_id ?? null,
      runType: workOrder.run_type,
      workOrderStatus: workOrder.work_order_status,
      runPolicyId: workOrder.run_policy.run_policy_id,
      retryBudget: workOrder.run_policy.retry_budget,
      computeLimitRef: workOrder.run_policy.compute_limit_ref
        ? toJsonValue(workOrder.run_policy.compute_limit_ref)
        : Prisma.JsonNull,
      computeLimitRefType: workOrder.run_policy.compute_limit_ref?.ref_type ?? null,
      computeLimitRefId: workOrder.run_policy.compute_limit_ref?.ref_id ?? null,
      computeLimitVersionId: workOrder.run_policy.compute_limit_ref?.version_id ?? null,
      stopConditionRefs: refKeys(workOrder.run_policy.stop_condition_refs),
      stopConditionRefPayloads: toJsonValue(workOrder.run_policy.stop_condition_refs),
      allowedMutationRefPayloads: toJsonValue(workOrder.run_policy.allowed_mutation_refs),
      autotunePolicy: workOrder.run_policy.autotune_policy,
      experimentBridge: toJsonValue(bridge),
      runRecipeRef: toJsonValue(bridge.run_recipe_ref),
      runRecipeRefType: bridge.run_recipe_ref.ref_type,
      runRecipeRefId: bridge.run_recipe_ref.ref_id,
      runRecipeVersionId: bridge.run_recipe_ref.version_id ?? null,
      runRecipeHash: bridge.run_recipe_hash,
      versionLockHash: bridge.version_lock_hash ?? null,
      configSnapshotHash: bridge.config_snapshot_hash ?? null,
      trainingTaskSpecRef: bridge.training_task_spec_ref
        ? toJsonValue(bridge.training_task_spec_ref)
        : Prisma.JsonNull,
      trainingTaskSpecRefType: bridge.training_task_spec_ref?.ref_type ?? null,
      trainingTaskSpecRefId: bridge.training_task_spec_ref?.ref_id ?? null,
      trainingTaskSpecVersionId: bridge.training_task_spec_ref?.version_id ?? null,
      trainingTaskSpecHash: bridge.training_task_spec_hash ?? null,
      externalJobRef: bridge.external_job_ref
        ? toJsonValue(bridge.external_job_ref)
        : Prisma.JsonNull,
      externalJobRefType: bridge.external_job_ref?.ref_type ?? null,
      externalJobRefId: bridge.external_job_ref?.ref_id ?? null,
      externalJobVersionId: bridge.external_job_ref?.version_id ?? null,
      externalJobHash: bridge.external_job_hash ?? null,
      motiveRefs: refKeys(workOrder.motive_refs),
      motiveRefPayloads: toJsonValue(workOrder.motive_refs),
      assertionRefs: refKeys(workOrder.assertion_refs),
      assertionRefPayloads: toJsonValue(workOrder.assertion_refs),
      datasetVersionRefs: refKeys(workOrder.dataset_version_refs),
      datasetVersionRefPayloads: toJsonValue(workOrder.dataset_version_refs),
      baselineVersionRefs: refKeys(workOrder.baseline_version_refs),
      baselineVersionRefPayloads: toJsonValue(workOrder.baseline_version_refs),
      codeVersionRefs: refKeys(workOrder.code_version_refs),
      codeVersionRefPayloads: toJsonValue(workOrder.code_version_refs),
      configRefs: refKeys(workOrder.config_refs),
      configRefPayloads: toJsonValue(workOrder.config_refs),
      traceManifestId: workOrder.trace_manifest_id,
      traceManifestRef: toJsonValue(workOrder.trace_manifest_ref),
      admissionGateResultId: workOrder.admission_gate_result_id ?? null,
      policyVersionId: workOrder.policy_version_id ?? null,
      sourceProposalArtifactRef: workOrder.source_proposal_artifact_ref
        ? toJsonValue(workOrder.source_proposal_artifact_ref)
        : Prisma.JsonNull,
      sourceProposalArtifactHash: workOrder.source_proposal_artifact_hash ?? null,
      createdBy: workOrder.created_by,
      createdAt: workOrder.created_at,
      updatedAt: workOrder.updated_at,
      admittedAt: workOrder.admitted_at ?? null,
    };
  }

  private toWorkOrderUpdateInput(
    workOrder: ResearchWorkOrder,
  ): Prisma.PaperImplementationResearchWorkOrderUpdateInput {
    const bridge = workOrder.experiment_bridge;
    return {
      workOrderStatus: workOrder.work_order_status,
      experimentBridge: toJsonValue(bridge),
      externalJobRef: bridge.external_job_ref
        ? toJsonValue(bridge.external_job_ref)
        : Prisma.JsonNull,
      externalJobRefType: bridge.external_job_ref?.ref_type ?? null,
      externalJobRefId: bridge.external_job_ref?.ref_id ?? null,
      externalJobVersionId: bridge.external_job_ref?.version_id ?? null,
      externalJobHash: bridge.external_job_hash ?? null,
      admissionGateResultId: workOrder.admission_gate_result_id ?? null,
      updatedAt: workOrder.updated_at,
      admittedAt: workOrder.admitted_at ?? null,
    };
  }

  private toHarnessRunCreateInput(
    harnessRun: ResearchWorkOrderHarnessRun,
  ): Prisma.PaperImplementationWorkOrderHarnessRunCreateInput {
    return {
      id: harnessRun.harness_run_id,
      implementationProjectId: harnessRun.implementation_project_id,
      workOrderId: harnessRun.work_order_id,
      runStatus: harnessRun.run_status,
      runAttempt: harnessRun.run_attempt,
      idempotencyKey: harnessRun.idempotency_key,
      externalJobRef: toJsonValue(harnessRun.external_job_ref),
      externalJobRefType: harnessRun.external_job_ref.ref_type,
      externalJobRefId: harnessRun.external_job_ref.ref_id,
      externalJobVersionId: harnessRun.external_job_ref.version_id ?? null,
      externalJobHash: harnessRun.external_job_hash,
      submittedAt: harnessRun.submitted_at,
      completedAt: harnessRun.completed_at ?? null,
      createdBy: harnessRun.created_by,
      createdAt: harnessRun.created_at,
    };
  }

  private toMonitorIntakeCreateInput(
    intake: RunMonitorIntakeRecord,
  ): Prisma.PaperImplementationRunMonitorIntakeCreateInput {
    return {
      id: intake.monitor_intake_id,
      implementationProjectId: intake.implementation_project_id,
      workOrderId: intake.work_order_id ?? null,
      externalJobRef: intake.external_job_ref
        ? toJsonValue(intake.external_job_ref)
        : Prisma.JsonNull,
      externalJobRefType: intake.external_job_ref?.ref_type ?? null,
      externalJobRefId: intake.external_job_ref?.ref_id ?? null,
      externalJobVersionId: intake.external_job_ref?.version_id ?? null,
      externalJobHash: intake.external_job_hash ?? null,
      monitorEventKind: intake.monitor_event_kind,
      runStatus: intake.run_status,
      trustStatus: intake.trust_status,
      resultRef: intake.result_ref ? toJsonValue(intake.result_ref) : Prisma.JsonNull,
      resultRefType: intake.result_ref?.ref_type ?? null,
      resultRefId: intake.result_ref?.ref_id ?? null,
      resultVersionId: intake.result_ref?.version_id ?? null,
      resultHash: intake.result_hash ?? null,
      resultValidationReportRef: intake.result_validation_report_ref
        ? toJsonValue(intake.result_validation_report_ref)
        : Prisma.JsonNull,
      resultValidationReportRefType: intake.result_validation_report_ref?.ref_type ?? null,
      resultValidationReportRefId: intake.result_validation_report_ref?.ref_id ?? null,
      resultValidationReportVersionId: intake.result_validation_report_ref?.version_id ?? null,
      resultValidationReportHash: intake.result_validation_report_hash ?? null,
      evidenceCandidateRefs: refKeys(intake.evidence_candidate_refs),
      evidenceCandidateRefPayloads: toJsonValue(intake.evidence_candidate_refs),
      evidenceCandidateHashes: intake.evidence_candidate_hashes,
      failureSummary: intake.failure_summary ?? null,
      rawPayload: toJsonValue(intake.raw_payload),
      receivedAt: intake.received_at,
      createdBy: intake.created_by,
    };
  }

}
