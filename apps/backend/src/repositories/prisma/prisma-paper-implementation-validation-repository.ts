import type {
  PaperImplementationExperimentPlanLight as ExperimentPlanLightRow,
  PaperImplementationFeasibilityProbe as FeasibilityProbeRow,
  PaperImplementationTechnicalRouteCandidate as TechnicalRouteCandidateRow,
  PaperImplementationValidationCycle as ValidationCycleRow,
  PaperImplementationValidationCycleInputSnapshot as ValidationCycleInputSnapshotRow,
  PaperImplementationValidationPlanningReviewItem as ValidationPlanningReviewItemRow,
  PaperImplementationValidationUpstreamFeedbackCandidate as ValidationUpstreamFeedbackCandidateRow,
  PrismaClient,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  ExperimentPlanLight,
  FeasibilityProbe,
  TechnicalRouteCandidate,
  ValidationCycle,
  ValidationCycleAssessment,
  ValidationCycleBudget,
  ValidationCycleCriteria,
  ValidationCycleFrame,
  ValidationCycleIncludedRefs,
  ValidationCycleInputSnapshot,
  ValidationCycleOutputs,
  ValidationCycleTarget,
  ValidationCycleTrigger,
  ValidationPlanningReviewItem,
  ValidationUpstreamFeedbackCandidate,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../../errors/app-error.js';
import type {
  PaperImplementationValidationRepository,
  ValidationCycleDraftPersistence,
} from '../paper-implementation-validation.repository.js';

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

function toInputSnapshot(row: ValidationCycleInputSnapshotRow): ValidationCycleInputSnapshot {
  return {
    input_snapshot_id: row.id,
    implementation_project_id: row.implementationProjectId,
    context_policy_version_id: row.contextPolicyVersionId,
    included_refs: asRecord(row.includedRefs) as unknown as ValidationCycleIncludedRefs,
    excluded_context_notes: row.excludedContextNotes,
    input_snapshot_hash: row.inputSnapshotHash,
    created_by: row.createdBy as ValidationCycleInputSnapshot['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toValidationCycle(row: ValidationCycleRow): ValidationCycle {
  return {
    validation_cycle_id: row.id,
    implementation_project_id: row.implementationProjectId,
    input_snapshot_id: row.inputSnapshotId,
    target: asRecord(row.target) as unknown as ValidationCycleTarget,
    trigger: asRecord(row.trigger) as unknown as ValidationCycleTrigger,
    cycle_type: row.cycleType as ValidationCycle['cycle_type'],
    validation_frame: asRecord(row.validationFrame) as unknown as ValidationCycleFrame,
    context: asRecord(row.context) as unknown as ValidationCycleInputSnapshot,
    criteria: asRecord(row.criteria) as unknown as ValidationCycleCriteria,
    budget: asRecord(row.budget) as unknown as ValidationCycleBudget,
    lifecycle_status: row.cycleStatus as ValidationCycle['lifecycle_status'],
    execution_status: row.executionStatus as ValidationCycle['execution_status'],
    outputs: asRecord(row.outputs) as unknown as ValidationCycleOutputs,
    cycle_assessment: row.cycleAssessment
      ? (asRecord(row.cycleAssessment) as unknown as ValidationCycleAssessment)
      : null,
    trace_manifest_ref: asNullableFunctionalRef(row.traceManifestRef),
    trace_manifest_id: row.traceManifestId,
    gate_result_id: row.gateResultId,
    decision_exit: row.decisionExit,
    confirmation_level: row.confirmationLevel as ValidationCycle['confirmation_level'],
    confirmed_by: row.confirmedBy as ValidationCycle['confirmed_by'],
    policy_version_id: row.policyVersionId,
    source_proposal_artifact_ref: asNullableFunctionalRef(row.sourceProposalArtifactRef),
    source_proposal_artifact_hash: row.sourceProposalArtifactHash,
    created_by: row.createdBy as ValidationCycle['created_by'],
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    admitted_at: row.admittedAt?.toISOString() ?? null,
    completed_at: row.completedAt?.toISOString() ?? null,
  };
}

function toTechnicalRouteCandidate(row: TechnicalRouteCandidateRow): TechnicalRouteCandidate {
  return {
    route_candidate_id: row.id,
    implementation_project_id: row.implementationProjectId,
    validation_cycle_id: row.validationCycleId,
    motive_id: row.motiveId,
    core_motive_version_id: row.coreMotiveVersionId,
    route_summary: row.routeSummary,
    route_status: row.routeStatus as TechnicalRouteCandidate['route_status'],
    expected_information_gain: row.expectedInformationGain as TechnicalRouteCandidate['expected_information_gain'],
    baseline_gap_status: row.baselineGapStatus as TechnicalRouteCandidate['baseline_gap_status'],
    scope_boundary_ref: asNullableFunctionalRef(row.scopeBoundaryRef),
    primary_metric_refs: asArray<TopicSelectionFunctionalRef>(row.primaryMetricRefPayloads),
    secondary_metric_refs: asArray<TopicSelectionFunctionalRef>(row.secondaryMetricRefPayloads),
    dataset_version_refs: asArray<TopicSelectionFunctionalRef>(row.datasetVersionRefPayloads),
    baseline_version_refs: asArray<TopicSelectionFunctionalRef>(row.baselineVersionRefPayloads),
    code_version_refs: asArray<TopicSelectionFunctionalRef>(row.codeVersionRefPayloads),
    config_refs: asArray<TopicSelectionFunctionalRef>(row.configRefPayloads),
    confirmatory_marker: row.confirmatoryMarker,
    trace_manifest_ref: asFunctionalRef(row.traceManifestRef),
    trace_manifest_id: row.traceManifestId,
    source_proposal_artifact_ref: asNullableFunctionalRef(row.sourceProposalArtifactRef),
    source_proposal_artifact_hash: row.sourceProposalArtifactHash,
    created_by: row.createdBy as TechnicalRouteCandidate['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toFeasibilityProbe(row: FeasibilityProbeRow): FeasibilityProbe {
  return {
    probe_id: row.id,
    implementation_project_id: row.implementationProjectId,
    validation_cycle_id: row.validationCycleId,
    probe_kind: row.probeKind as FeasibilityProbe['probe_kind'],
    probe_question: row.probeQuestion,
    probe_status: row.probeStatus as FeasibilityProbe['probe_status'],
    expected_information_gain: row.expectedInformationGain as FeasibilityProbe['expected_information_gain'],
    baseline_gap_status: row.baselineGapStatus as FeasibilityProbe['baseline_gap_status'],
    scope_boundary_ref: asNullableFunctionalRef(row.scopeBoundaryRef),
    primary_metric_refs: asArray<TopicSelectionFunctionalRef>(row.primaryMetricRefPayloads),
    secondary_metric_refs: asArray<TopicSelectionFunctionalRef>(row.secondaryMetricRefPayloads),
    dataset_version_refs: asArray<TopicSelectionFunctionalRef>(row.datasetVersionRefPayloads),
    baseline_version_refs: asArray<TopicSelectionFunctionalRef>(row.baselineVersionRefPayloads),
    code_version_refs: asArray<TopicSelectionFunctionalRef>(row.codeVersionRefPayloads),
    config_refs: asArray<TopicSelectionFunctionalRef>(row.configRefPayloads),
    confirmatory_marker: row.confirmatoryMarker,
    trace_manifest_ref: asFunctionalRef(row.traceManifestRef),
    trace_manifest_id: row.traceManifestId,
    source_proposal_artifact_ref: asNullableFunctionalRef(row.sourceProposalArtifactRef),
    source_proposal_artifact_hash: row.sourceProposalArtifactHash,
    created_by: row.createdBy as FeasibilityProbe['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toExperimentPlanLight(row: ExperimentPlanLightRow): ExperimentPlanLight {
  return {
    experiment_plan_light_id: row.id,
    implementation_project_id: row.implementationProjectId,
    validation_cycle_id: row.validationCycleId,
    route_candidate_id: row.routeCandidateId,
    run_mode: row.runMode as ExperimentPlanLight['run_mode'],
    plan_summary: row.planSummary,
    estimated_cost_class: row.estimatedCostClass as ExperimentPlanLight['estimated_cost_class'],
    baseline_gap_status: row.baselineGapStatus as ExperimentPlanLight['baseline_gap_status'],
    primary_metric_refs: asArray<TopicSelectionFunctionalRef>(row.primaryMetricRefPayloads),
    secondary_metric_refs: asArray<TopicSelectionFunctionalRef>(row.secondaryMetricRefPayloads),
    dataset_version_refs: asArray<TopicSelectionFunctionalRef>(row.datasetVersionRefPayloads),
    baseline_version_refs: asArray<TopicSelectionFunctionalRef>(row.baselineVersionRefPayloads),
    code_version_refs: asArray<TopicSelectionFunctionalRef>(row.codeVersionRefPayloads),
    config_refs: asArray<TopicSelectionFunctionalRef>(row.configRefPayloads),
    confirmatory_marker: row.confirmatoryMarker,
    scope_boundary_ref: asNullableFunctionalRef(row.scopeBoundaryRef),
    budget_id: row.budgetId,
    stop_condition_refs: asArray<TopicSelectionFunctionalRef>(row.stopConditionRefPayloads),
    trace_manifest_ref: asFunctionalRef(row.traceManifestRef),
    trace_manifest_id: row.traceManifestId,
    source_proposal_artifact_ref: asNullableFunctionalRef(row.sourceProposalArtifactRef),
    source_proposal_artifact_hash: row.sourceProposalArtifactHash,
    created_by: row.createdBy as ExperimentPlanLight['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toReviewItem(row: ValidationPlanningReviewItemRow): ValidationPlanningReviewItem {
  return {
    review_item_id: row.id,
    implementation_project_id: row.implementationProjectId,
    validation_cycle_id: row.validationCycleId,
    item_kind: row.itemKind as ValidationPlanningReviewItem['item_kind'],
    status: row.status as ValidationPlanningReviewItem['status'],
    severity: row.severity as ValidationPlanningReviewItem['severity'],
    blocker_code: row.blockerCode,
    summary: row.summary,
    source_refs: asArray<TopicSelectionFunctionalRef>(row.sourceRefs),
    created_at: row.createdAt.toISOString(),
    resolved_at: row.resolvedAt?.toISOString() ?? null,
  };
}

function toFeedbackCandidate(row: ValidationUpstreamFeedbackCandidateRow): ValidationUpstreamFeedbackCandidate {
  return {
    candidate_id: row.id,
    implementation_project_id: row.implementationProjectId,
    validation_cycle_id: row.validationCycleId,
    source_object_refs: asArray<TopicSelectionFunctionalRef>(row.sourceObjectRefs),
    evidence_refs: asArray<TopicSelectionFunctionalRef>(row.evidenceRefs),
    feedback_type: row.feedbackType as ValidationUpstreamFeedbackCandidate['feedback_type'],
    severity: row.severity as ValidationUpstreamFeedbackCandidate['severity'],
    summary: row.summary,
    recommended_upstream_action: row.recommendedUpstreamAction as ValidationUpstreamFeedbackCandidate['recommended_upstream_action'],
    candidate_status: row.candidateStatus as ValidationUpstreamFeedbackCandidate['candidate_status'],
    feedback_event_ref: asNullableFunctionalRef(row.feedbackEventRef),
    created_by: row.createdBy as ValidationUpstreamFeedbackCandidate['created_by'],
    created_at: row.createdAt.toISOString(),
    dispatched_at: row.dispatchedAt?.toISOString() ?? null,
  };
}

export class PrismaPaperImplementationValidationRepository
implements PaperImplementationValidationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createValidationCycleDraft(
    persistence: ValidationCycleDraftPersistence,
  ): Promise<ValidationCycleDraftPersistence> {
    let inputSnapshotRow: ValidationCycleInputSnapshotRow;
    let cycleRow: ValidationCycleRow;
    try {
      [inputSnapshotRow, cycleRow] = await this.prisma.$transaction([
        this.prisma.paperImplementationValidationCycleInputSnapshot.create({
          data: {
            id: persistence.input_snapshot.input_snapshot_id,
            implementationProjectId: persistence.input_snapshot.implementation_project_id,
            contextPolicyVersionId: persistence.input_snapshot.context_policy_version_id ?? null,
            includedRefs: toJsonValue(persistence.input_snapshot.included_refs),
            excludedContextNotes: persistence.input_snapshot.excluded_context_notes,
            inputSnapshotHash: persistence.input_snapshot.input_snapshot_hash ?? null,
            createdBy: persistence.input_snapshot.created_by,
            createdAt: persistence.input_snapshot.created_at,
          },
        }),
        this.prisma.paperImplementationValidationCycle.create({
          data: this.toCycleCreateInput(persistence.validation_cycle),
        }),
      ]);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          `ValidationCycle ${persistence.validation_cycle.validation_cycle_id} already exists.`,
        );
      }
      throw error;
    }
    return {
      input_snapshot: toInputSnapshot(inputSnapshotRow),
      validation_cycle: toValidationCycle(cycleRow),
    };
  }

  async findValidationCycleById(
    implementationProjectId: string,
    validationCycleId: string,
  ): Promise<ValidationCycle | null> {
    const row = await this.prisma.paperImplementationValidationCycle.findFirst({
      where: { id: validationCycleId, implementationProjectId },
    });
    return row ? toValidationCycle(row) : null;
  }

  async listValidationCycles(
    implementationProjectId: string,
  ): Promise<ValidationCycle[]> {
    const rows = await this.prisma.paperImplementationValidationCycle.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => toValidationCycle(row));
  }

  async updateValidationCycle(
    cycle: ValidationCycle,
  ): Promise<ValidationCycle> {
    const row = await this.prisma.paperImplementationValidationCycle.update({
      where: { id: cycle.validation_cycle_id },
      data: this.toCycleUpdateInput(cycle),
    });
    return toValidationCycle(row);
  }

  async listRecentCompletedCyclesByTarget(
    implementationProjectId: string,
    targetRefType: string,
    targetRefId: string,
    limit: number,
  ): Promise<ValidationCycle[]> {
    const rows = await this.prisma.paperImplementationValidationCycle.findMany({
      where: {
        implementationProjectId,
        targetRefType,
        targetRefId,
        cycleStatus: 'completed',
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => toValidationCycle(row));
  }

  async createTechnicalRouteCandidate(
    route: TechnicalRouteCandidate,
  ): Promise<TechnicalRouteCandidate> {
    const row = await this.prisma.paperImplementationTechnicalRouteCandidate.create({
      data: this.toRouteCreateInput(route),
    });
    return toTechnicalRouteCandidate(row);
  }

  async findTechnicalRouteCandidateById(
    implementationProjectId: string,
    routeCandidateId: string,
  ): Promise<TechnicalRouteCandidate | null> {
    const row = await this.prisma.paperImplementationTechnicalRouteCandidate.findFirst({
      where: { id: routeCandidateId, implementationProjectId },
    });
    return row ? toTechnicalRouteCandidate(row) : null;
  }

  async createFeasibilityProbe(
    probe: FeasibilityProbe,
  ): Promise<FeasibilityProbe> {
    const row = await this.prisma.paperImplementationFeasibilityProbe.create({
      data: this.toProbeCreateInput(probe),
    });
    return toFeasibilityProbe(row);
  }

  async findFeasibilityProbeById(
    implementationProjectId: string,
    probeId: string,
  ): Promise<FeasibilityProbe | null> {
    const row = await this.prisma.paperImplementationFeasibilityProbe.findFirst({
      where: { id: probeId, implementationProjectId },
    });
    return row ? toFeasibilityProbe(row) : null;
  }

  async createExperimentPlanLight(
    plan: ExperimentPlanLight,
  ): Promise<ExperimentPlanLight> {
    const row = await this.prisma.paperImplementationExperimentPlanLight.create({
      data: this.toPlanCreateInput(plan),
    });
    return toExperimentPlanLight(row);
  }

  async findExperimentPlanLightById(
    implementationProjectId: string,
    experimentPlanLightId: string,
  ): Promise<ExperimentPlanLight | null> {
    const row = await this.prisma.paperImplementationExperimentPlanLight.findFirst({
      where: { id: experimentPlanLightId, implementationProjectId },
    });
    return row ? toExperimentPlanLight(row) : null;
  }

  async createReviewItem(
    item: ValidationPlanningReviewItem,
  ): Promise<ValidationPlanningReviewItem> {
    const row = await this.prisma.paperImplementationValidationPlanningReviewItem.create({
      data: {
        id: item.review_item_id,
        implementationProjectId: item.implementation_project_id,
        validationCycleId: item.validation_cycle_id ?? null,
        itemKind: item.item_kind,
        status: item.status,
        severity: item.severity,
        blockerCode: item.blocker_code ?? null,
        summary: item.summary,
        sourceRefs: toJsonValue(item.source_refs),
        createdAt: item.created_at,
        resolvedAt: item.resolved_at ?? null,
      },
    });
    return toReviewItem(row);
  }

  async listReviewItems(
    implementationProjectId: string,
  ): Promise<ValidationPlanningReviewItem[]> {
    const rows = await this.prisma.paperImplementationValidationPlanningReviewItem.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => toReviewItem(row));
  }

  async createFeedbackCandidate(
    candidate: ValidationUpstreamFeedbackCandidate,
  ): Promise<ValidationUpstreamFeedbackCandidate> {
    const row = await this.prisma.paperImplementationValidationUpstreamFeedbackCandidate.create({
      data: this.toFeedbackCandidateCreateInput(candidate),
    });
    return toFeedbackCandidate(row);
  }

  async findFeedbackCandidateById(
    implementationProjectId: string,
    candidateId: string,
  ): Promise<ValidationUpstreamFeedbackCandidate | null> {
    const row = await this.prisma.paperImplementationValidationUpstreamFeedbackCandidate.findFirst({
      where: { id: candidateId, implementationProjectId },
    });
    return row ? toFeedbackCandidate(row) : null;
  }

  async updateFeedbackCandidate(
    candidate: ValidationUpstreamFeedbackCandidate,
  ): Promise<ValidationUpstreamFeedbackCandidate> {
    const row = await this.prisma.paperImplementationValidationUpstreamFeedbackCandidate.update({
      where: { id: candidate.candidate_id },
      data: {
        sourceObjectRefs: toJsonValue(candidate.source_object_refs),
        evidenceRefs: toJsonValue(candidate.evidence_refs),
        feedbackType: candidate.feedback_type,
        severity: candidate.severity,
        summary: candidate.summary,
        recommendedUpstreamAction: candidate.recommended_upstream_action,
        candidateStatus: candidate.candidate_status,
        feedbackEventRef: candidate.feedback_event_ref
          ? toJsonValue(candidate.feedback_event_ref)
          : Prisma.JsonNull,
        dispatchedAt: candidate.dispatched_at ?? null,
      },
    });
    return toFeedbackCandidate(row);
  }

  private toCycleCreateInput(
    cycle: ValidationCycle,
  ): Prisma.PaperImplementationValidationCycleCreateInput {
    return {
      id: cycle.validation_cycle_id,
      implementationProjectId: cycle.implementation_project_id,
      inputSnapshotId: cycle.input_snapshot_id,
      targetRefType: cycle.target.target_type,
      targetRefId: cycle.target.target_id,
      targetVersionId: cycle.target.target_version_id ?? null,
      target: toJsonValue(cycle.target),
      triggerType: cycle.trigger.trigger_type,
      trigger: toJsonValue(cycle.trigger),
      cycleType: cycle.cycle_type,
      validationQuestion: cycle.validation_frame.validation_question,
      validationFrame: toJsonValue(cycle.validation_frame),
      context: toJsonValue(cycle.context),
      criteria: toJsonValue(cycle.criteria),
      budgetId: cycle.budget.budget_id,
      budget: toJsonValue(cycle.budget),
      expectedInformationGain: cycle.validation_frame.expected_information_gain,
      cycleStatus: cycle.lifecycle_status,
      executionStatus: cycle.execution_status,
      outputs: toJsonValue(cycle.outputs),
      cycleAssessment: cycle.cycle_assessment
        ? toJsonValue(cycle.cycle_assessment)
        : Prisma.JsonNull,
      decisionExit: cycle.decision_exit ?? null,
      gateResultId: cycle.gate_result_id ?? null,
      traceManifestId: cycle.trace_manifest_id ?? null,
      traceManifestRef: cycle.trace_manifest_ref
        ? toJsonValue(cycle.trace_manifest_ref)
        : Prisma.JsonNull,
      confirmationLevel: cycle.confirmation_level,
      confirmedBy: cycle.confirmed_by ?? null,
      policyVersionId: cycle.policy_version_id ?? null,
      sourceProposalArtifactRef: cycle.source_proposal_artifact_ref
        ? toJsonValue(cycle.source_proposal_artifact_ref)
        : Prisma.JsonNull,
      sourceProposalArtifactHash: cycle.source_proposal_artifact_hash ?? null,
      createdBy: cycle.created_by,
      createdAt: cycle.created_at,
      updatedAt: cycle.updated_at,
      admittedAt: cycle.admitted_at ?? null,
      completedAt: cycle.completed_at ?? null,
    };
  }

  private toCycleUpdateInput(
    cycle: ValidationCycle,
  ): Prisma.PaperImplementationValidationCycleUpdateInput {
    return this.toCycleCreateInput(cycle);
  }

  private toRouteCreateInput(
    route: TechnicalRouteCandidate,
  ): Prisma.PaperImplementationTechnicalRouteCandidateCreateInput {
    return {
      id: route.route_candidate_id,
      implementationProjectId: route.implementation_project_id,
      validationCycleId: route.validation_cycle_id ?? null,
      motiveId: route.motive_id ?? null,
      coreMotiveVersionId: route.core_motive_version_id,
      routeSummary: route.route_summary,
      routeStatus: route.route_status,
      expectedInformationGain: route.expected_information_gain,
      baselineGapStatus: route.baseline_gap_status,
      scopeBoundaryRef: route.scope_boundary_ref
        ? toJsonValue(route.scope_boundary_ref)
        : Prisma.JsonNull,
      scopeBoundaryRefType: route.scope_boundary_ref?.ref_type ?? null,
      scopeBoundaryRefId: route.scope_boundary_ref?.ref_id ?? null,
      scopeBoundaryVersionId: route.scope_boundary_ref?.version_id ?? null,
      primaryMetricRefs: refKeys(route.primary_metric_refs),
      primaryMetricRefPayloads: toJsonValue(route.primary_metric_refs),
      secondaryMetricRefs: refKeys(route.secondary_metric_refs),
      secondaryMetricRefPayloads: toJsonValue(route.secondary_metric_refs),
      datasetVersionRefs: refKeys(route.dataset_version_refs),
      datasetVersionRefPayloads: toJsonValue(route.dataset_version_refs),
      baselineVersionRefs: refKeys(route.baseline_version_refs),
      baselineVersionRefPayloads: toJsonValue(route.baseline_version_refs),
      codeVersionRefs: refKeys(route.code_version_refs),
      codeVersionRefPayloads: toJsonValue(route.code_version_refs),
      configRefs: refKeys(route.config_refs),
      configRefPayloads: toJsonValue(route.config_refs),
      confirmatoryMarker: route.confirmatory_marker,
      traceManifestId: route.trace_manifest_id,
      traceManifestRef: toJsonValue(route.trace_manifest_ref),
      sourceProposalArtifactRef: route.source_proposal_artifact_ref
        ? toJsonValue(route.source_proposal_artifact_ref)
        : Prisma.JsonNull,
      sourceProposalArtifactHash: route.source_proposal_artifact_hash ?? null,
      createdBy: route.created_by,
      createdAt: route.created_at,
    };
  }

  private toProbeCreateInput(
    probe: FeasibilityProbe,
  ): Prisma.PaperImplementationFeasibilityProbeCreateInput {
    return {
      id: probe.probe_id,
      implementationProjectId: probe.implementation_project_id,
      validationCycleId: probe.validation_cycle_id ?? null,
      probeKind: probe.probe_kind,
      probeQuestion: probe.probe_question,
      probeStatus: probe.probe_status,
      expectedInformationGain: probe.expected_information_gain,
      baselineGapStatus: probe.baseline_gap_status,
      scopeBoundaryRef: probe.scope_boundary_ref
        ? toJsonValue(probe.scope_boundary_ref)
        : Prisma.JsonNull,
      scopeBoundaryRefType: probe.scope_boundary_ref?.ref_type ?? null,
      scopeBoundaryRefId: probe.scope_boundary_ref?.ref_id ?? null,
      scopeBoundaryVersionId: probe.scope_boundary_ref?.version_id ?? null,
      primaryMetricRefs: refKeys(probe.primary_metric_refs),
      primaryMetricRefPayloads: toJsonValue(probe.primary_metric_refs),
      secondaryMetricRefs: refKeys(probe.secondary_metric_refs),
      secondaryMetricRefPayloads: toJsonValue(probe.secondary_metric_refs),
      datasetVersionRefs: refKeys(probe.dataset_version_refs),
      datasetVersionRefPayloads: toJsonValue(probe.dataset_version_refs),
      baselineVersionRefs: refKeys(probe.baseline_version_refs),
      baselineVersionRefPayloads: toJsonValue(probe.baseline_version_refs),
      codeVersionRefs: refKeys(probe.code_version_refs),
      codeVersionRefPayloads: toJsonValue(probe.code_version_refs),
      configRefs: refKeys(probe.config_refs),
      configRefPayloads: toJsonValue(probe.config_refs),
      confirmatoryMarker: probe.confirmatory_marker,
      traceManifestId: probe.trace_manifest_id,
      traceManifestRef: toJsonValue(probe.trace_manifest_ref),
      sourceProposalArtifactRef: probe.source_proposal_artifact_ref
        ? toJsonValue(probe.source_proposal_artifact_ref)
        : Prisma.JsonNull,
      sourceProposalArtifactHash: probe.source_proposal_artifact_hash ?? null,
      createdBy: probe.created_by,
      createdAt: probe.created_at,
    };
  }

  private toPlanCreateInput(
    plan: ExperimentPlanLight,
  ): Prisma.PaperImplementationExperimentPlanLightCreateInput {
    return {
      id: plan.experiment_plan_light_id,
      implementationProjectId: plan.implementation_project_id,
      validationCycleId: plan.validation_cycle_id ?? null,
      routeCandidateId: plan.route_candidate_id ?? null,
      runMode: plan.run_mode,
      planSummary: plan.plan_summary,
      estimatedCostClass: plan.estimated_cost_class,
      baselineGapStatus: plan.baseline_gap_status,
      scopeBoundaryRef: plan.scope_boundary_ref
        ? toJsonValue(plan.scope_boundary_ref)
        : Prisma.JsonNull,
      scopeBoundaryRefType: plan.scope_boundary_ref?.ref_type ?? null,
      scopeBoundaryRefId: plan.scope_boundary_ref?.ref_id ?? null,
      scopeBoundaryVersionId: plan.scope_boundary_ref?.version_id ?? null,
      primaryMetricRefs: refKeys(plan.primary_metric_refs),
      primaryMetricRefPayloads: toJsonValue(plan.primary_metric_refs),
      secondaryMetricRefs: refKeys(plan.secondary_metric_refs),
      secondaryMetricRefPayloads: toJsonValue(plan.secondary_metric_refs),
      datasetVersionRefs: refKeys(plan.dataset_version_refs),
      datasetVersionRefPayloads: toJsonValue(plan.dataset_version_refs),
      baselineVersionRefs: refKeys(plan.baseline_version_refs),
      baselineVersionRefPayloads: toJsonValue(plan.baseline_version_refs),
      codeVersionRefs: refKeys(plan.code_version_refs),
      codeVersionRefPayloads: toJsonValue(plan.code_version_refs),
      configRefs: refKeys(plan.config_refs),
      configRefPayloads: toJsonValue(plan.config_refs),
      confirmatoryMarker: plan.confirmatory_marker,
      budgetId: plan.budget_id,
      stopConditionRefs: refKeys(plan.stop_condition_refs),
      stopConditionRefPayloads: toJsonValue(plan.stop_condition_refs),
      traceManifestId: plan.trace_manifest_id,
      traceManifestRef: toJsonValue(plan.trace_manifest_ref),
      sourceProposalArtifactRef: plan.source_proposal_artifact_ref
        ? toJsonValue(plan.source_proposal_artifact_ref)
        : Prisma.JsonNull,
      sourceProposalArtifactHash: plan.source_proposal_artifact_hash ?? null,
      createdBy: plan.created_by,
      createdAt: plan.created_at,
    };
  }

  private toFeedbackCandidateCreateInput(
    candidate: ValidationUpstreamFeedbackCandidate,
  ): Prisma.PaperImplementationValidationUpstreamFeedbackCandidateCreateInput {
    return {
      id: candidate.candidate_id,
      implementationProjectId: candidate.implementation_project_id,
      validationCycleId: candidate.validation_cycle_id ?? null,
      sourceObjectRefs: toJsonValue(candidate.source_object_refs),
      evidenceRefs: toJsonValue(candidate.evidence_refs),
      feedbackType: candidate.feedback_type,
      severity: candidate.severity,
      summary: candidate.summary,
      recommendedUpstreamAction: candidate.recommended_upstream_action,
      candidateStatus: candidate.candidate_status,
      feedbackEventRef: candidate.feedback_event_ref
        ? toJsonValue(candidate.feedback_event_ref)
        : Prisma.JsonNull,
      createdBy: candidate.created_by,
      createdAt: candidate.created_at,
      dispatchedAt: candidate.dispatched_at ?? null,
    };
  }
}
