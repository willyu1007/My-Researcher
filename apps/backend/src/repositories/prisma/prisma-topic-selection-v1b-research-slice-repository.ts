import type {
  PrismaClient,
  TopicSelectionPlanResearchSliceRun,
  TopicSelectionResearchSlice,
  TopicSelectionResearchSliceAssumption,
  TopicSelectionResearchSliceBoundary,
  TopicSelectionResearchSliceEvidenceRef,
  TopicSelectionResearchSliceOption,
  TopicSelectionResearchSliceOptionSet,
  TopicSelectionSliceSelectionDecision,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionPlanResearchSliceRunRecord,
  TopicSelectionRejectedSliceOptionReason,
  TopicSelectionResearchSliceAssumptionRecord,
  TopicSelectionResearchSliceBoundaryRecord,
  TopicSelectionResearchSliceEvidenceRefRecord,
  TopicSelectionResearchSliceOptionRecord,
  TopicSelectionResearchSliceOptionSetRecord,
  TopicSelectionResearchSliceRecord,
  TopicSelectionSliceSelectionDecisionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
import type {
  TopicSelectionResearchSlicePlanningPersistence,
  TopicSelectionResearchSliceCreation,
  TopicSelectionV1bResearchSliceRepository,
} from '../topic-selection-v1b-research-slice.repository.js';
import { optionSetLacksN4HandoffHash } from '../topic-selection-v1b-research-slice.repository.js';

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function jsonOrNull(value: unknown | null | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null || value === undefined ? Prisma.JsonNull : toJsonValue(value);
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
  return value === null || value === undefined ? null : asFunctionalRef(value);
}

function toPlanRunRecord(row: TopicSelectionPlanResearchSliceRun): TopicSelectionPlanResearchSliceRunRecord {
  return {
    plan_research_slice_run_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    v1b_intake_readiness_assessment_id: row.v1bIntakeReadinessAssessmentId,
    v1b_intake_snapshot_id: row.v1bIntakeSnapshotId,
    research_constraint_profile_id: row.researchConstraintProfileId,
    v1b_input_bundle_id: row.v1bInputBundleId,
    validated_need_id: row.validatedNeedId,
    status: row.status as TopicSelectionPlanResearchSliceRunRecord['status'],
    triggered_by: row.triggeredBy as TopicSelectionPlanResearchSliceRunRecord['triggered_by'],
    v1b_input_bundle_ref: asFunctionalRef(row.v1bInputBundleRef),
    v1b_intake_snapshot_ref: asFunctionalRef(row.v1bIntakeSnapshotRef),
    research_constraint_profile_ref: asFunctionalRef(row.researchConstraintProfileRef),
    readiness_assessment_ref: asFunctionalRef(row.readinessAssessmentRef),
    validated_need_ref: asFunctionalRef(row.validatedNeedRef),
    evidence_map_ref: asFunctionalRef(row.evidenceMapRef),
    search_run_ref: asFunctionalRef(row.searchRunRef),
    search_plan_ref: asFunctionalRef(row.searchPlanRef),
    literature_snapshot_ref: asFunctionalRef(row.literatureSnapshotRef),
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    memory_suggestion_refs: asArray<TopicSelectionFunctionalRef>(row.memorySuggestionRefs),
    recheck_request_refs: asArray<TopicSelectionFunctionalRef>(row.recheckRequestRefs),
    gap_codes: row.gapCodes,
    workflow_profile_key: row.workflowProfileKey,
    workflow_profile_version: row.workflowProfileVersion,
    provider_id: row.providerId,
    model_id: row.modelId,
    prompt_template_id: row.promptTemplateId,
    prompt_template_version: row.promptTemplateVersion,
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    option_set_id: row.optionSetId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    quality_flags: row.qualityFlags,
    failure_reason: row.failureReason,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toOptionSetRecord(row: TopicSelectionResearchSliceOptionSet): TopicSelectionResearchSliceOptionSetRecord {
  return {
    research_slice_option_set_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    plan_research_slice_run_id: row.planResearchSliceRunId,
    v1b_intake_readiness_assessment_id: row.v1bIntakeReadinessAssessmentId,
    v1b_intake_snapshot_id: row.v1bIntakeSnapshotId,
    research_constraint_profile_id: row.researchConstraintProfileId,
    v1b_input_bundle_id: row.v1bInputBundleId,
    validated_need_ids: row.validatedNeedIds,
    status: row.status as TopicSelectionResearchSliceOptionSetRecord['status'],
    recommended_option_id: row.recommendedOptionId,
    selected_option_id: row.selectedOptionId,
    option_count: row.optionCount,
    high_risk_option_count: row.highRiskOptionCount,
    requires_human_review: row.requiresHumanReview,
    comparison_axes: row.comparisonAxes,
    comparison_summary: row.comparisonSummary,
    missing_option_types: row.missingOptionTypes,
    unresolved_disagreements: row.unresolvedDisagreements,
    human_review_triggers: row.humanReviewTriggers,
    options_payload: asRecord(row.optionsPayload),
    comparison_payload: asRecord(row.comparisonPayload),
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toOptionRecord(row: TopicSelectionResearchSliceOption): TopicSelectionResearchSliceOptionRecord {
  return {
    research_slice_option_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    research_slice_option_set_id: row.researchSliceOptionSetId,
    option_ordinal: row.optionOrdinal,
    option_key: row.optionKey,
    status: row.status as TopicSelectionResearchSliceOptionRecord['status'],
    source_validated_need_refs: asArray<TopicSelectionFunctionalRef>(row.sourceValidatedNeedRefs),
    slice_statement: row.sliceStatement,
    problem_space: row.problemSpace,
    target_setting: row.targetSetting,
    target_community: row.targetCommunity,
    included_boundaries: row.includedBoundaries,
    excluded_boundaries: row.excludedBoundaries,
    contribution_type_candidate: row.contributionTypeCandidate,
    support_evidence_refs: asArray<TopicSelectionFunctionalRef>(row.supportEvidenceRefs),
    challenge_evidence_refs: asArray<TopicSelectionFunctionalRef>(row.challengeEvidenceRefs),
    baseline_evidence_refs: asArray<TopicSelectionFunctionalRef>(row.baselineEvidenceRefs),
    context_evidence_refs: asArray<TopicSelectionFunctionalRef>(row.contextEvidenceRefs),
    resource_assumptions: row.resourceAssumptions,
    data_assumptions: row.dataAssumptions,
    evaluation_path: row.evaluationPath,
    baseline_assumptions: row.baselineAssumptions,
    hard_blockers: row.hardBlockers,
    dependency_risks: row.dependencyRisks,
    slice_budget: asRecord(row.sliceBudget),
    expected_claim: row.expectedClaim,
    fallback_claim: row.fallbackClaim,
    observable_success_criteria: row.observableSuccessCriteria,
    main_risks: row.mainRisks,
    baseline_risk: row.baselineRisk as TopicSelectionResearchSliceOptionRecord['baseline_risk'],
    execution_risk: row.executionRisk as TopicSelectionResearchSliceOptionRecord['execution_risk'],
    scope_risk: row.scopeRisk as TopicSelectionResearchSliceOptionRecord['scope_risk'],
    claim_ceiling_alignment: asRecord(row.claimCeilingAlignment) as unknown as TopicSelectionResearchSliceOptionRecord['claim_ceiling_alignment'],
    confidence: row.confidence,
    requires_human_review: row.requiresHumanReview,
    human_review_triggers: row.humanReviewTriggers,
    details_payload: asRecord(row.detailsPayload),
    created_at: row.createdAt.toISOString(),
  };
}

function toDecisionRecord(row: TopicSelectionSliceSelectionDecision): TopicSelectionSliceSelectionDecisionRecord {
  return {
    slice_selection_decision_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    research_slice_option_set_id: row.researchSliceOptionSetId,
    selected_option_id: row.selectedOptionId,
    decision: row.decision as TopicSelectionSliceSelectionDecisionRecord['decision'],
    decided_by: row.decidedBy as TopicSelectionSliceSelectionDecisionRecord['decided_by'],
    selection_policy_version: row.selectionPolicyVersion,
    decision_basis: asRecord(row.decisionBasis),
    selection_rationale: row.selectionRationale,
    rejected_option_reasons: asArray<TopicSelectionRejectedSliceOptionReason>(row.rejectedOptionReasons),
    hard_blockers: row.hardBlockers,
    open_risks: row.openRisks,
    unresolved_disagreements: row.unresolvedDisagreements,
    loopback_target: row.loopbackTarget as TopicSelectionSliceSelectionDecisionRecord['loopback_target'],
    loopback_target_ref: asNullableFunctionalRef(row.loopbackTargetRef),
    required_actions: row.requiredActions,
    loopback_reason_code: row.loopbackReasonCode,
    source_downstream_object_ref: asNullableFunctionalRef(row.sourceDownstreamObjectRef),
    creates_new_run_or_version: row.createsNewRunOrVersion,
    confidence: row.confidence,
    requires_human_review: row.requiresHumanReview,
    human_review_reason: row.humanReviewReason,
    output_research_slice_ref: asNullableFunctionalRef(row.outputResearchSliceRef),
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    created_at: row.createdAt.toISOString(),
  };
}

function toResearchSliceRecord(row: TopicSelectionResearchSlice): TopicSelectionResearchSliceRecord {
  return {
    research_slice_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    v1b_intake_snapshot_id: row.v1bIntakeSnapshotId,
    research_constraint_profile_id: row.researchConstraintProfileId,
    v1b_input_bundle_id: row.v1bInputBundleId,
    validated_need_id: row.validatedNeedId,
    slice_version: row.sliceVersion,
    status: row.status as TopicSelectionResearchSliceRecord['status'],
    v1b_intake_snapshot_ref: asFunctionalRef(row.v1bIntakeSnapshotRef),
    research_constraint_profile_ref: asFunctionalRef(row.researchConstraintProfileRef),
    readiness_assessment_ref: asFunctionalRef(row.readinessAssessmentRef),
    v1b_input_bundle_ref: asFunctionalRef(row.v1bInputBundleRef),
    validated_need_ref: asFunctionalRef(row.validatedNeedRef),
    evidence_map_ref: asFunctionalRef(row.evidenceMapRef),
    search_run_ref: asFunctionalRef(row.searchRunRef),
    search_plan_ref: asFunctionalRef(row.searchPlanRef),
    literature_snapshot_ref: asFunctionalRef(row.literatureSnapshotRef),
    source_option_set_ref: asFunctionalRef(row.sourceOptionSetRef),
    source_option_ref: asFunctionalRef(row.sourceOptionRef),
    slice_selection_decision_ref: asFunctionalRef(row.sliceSelectionDecisionRef),
    problem_space: row.problemSpace,
    slice_statement: row.sliceStatement,
    target_setting: row.targetSetting,
    target_community: row.targetCommunity,
    included_boundaries: row.includedBoundaries,
    excluded_boundaries: row.excludedBoundaries,
    candidate_contribution_types: row.candidateContributionTypes,
    preferred_contribution_type: row.preferredContributionType,
    contribution_rationale: row.contributionRationale,
    expected_claim: row.expectedClaim,
    fallback_claim: row.fallbackClaim,
    observable_success_criteria: row.observableSuccessCriteria,
    resource_assumptions: row.resourceAssumptions,
    data_assumptions: row.dataAssumptions,
    evaluation_path: row.evaluationPath,
    baseline_assumptions: row.baselineAssumptions,
    dependency_risks: row.dependencyRisks,
    slice_budget: asRecord(row.sliceBudget),
    topic_question_guardrails: row.topicQuestionGuardrails,
    value_assessment_inputs: row.valueAssessmentInputs,
    must_preserve_boundaries: row.mustPreserveBoundaries,
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    memory_suggestion_refs: asArray<TopicSelectionFunctionalRef>(row.memorySuggestionRefs),
    recheck_request_refs: asArray<TopicSelectionFunctionalRef>(row.recheckRequestRefs),
    gap_codes: row.gapCodes,
    non_goals: row.nonGoals,
    claim_ceiling: row.claimCeiling,
    decision_reason: row.decisionReason,
    supersedes_research_slice_ref: asNullableFunctionalRef(row.supersedesResearchSliceRef),
    superseded_by_research_slice_ref: asNullableFunctionalRef(row.supersededByResearchSliceRef),
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    trace_snapshot_id: row.traceSnapshotId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    created_by: row.createdBy as TopicSelectionResearchSliceRecord['created_by'],
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toEvidenceRefRecord(
  row: TopicSelectionResearchSliceEvidenceRef,
): TopicSelectionResearchSliceEvidenceRefRecord {
  return {
    research_slice_evidence_ref_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    research_slice_id: row.researchSliceId,
    evidence_ref: asFunctionalRef(row.evidenceRef),
    evidence_role: row.evidenceRole as TopicSelectionResearchSliceEvidenceRefRecord['evidence_role'],
    rationale: row.rationale,
    evidence_strength_snapshot: asRecord(row.evidenceStrengthSnapshot),
    source_locator_snapshot: asRecord(row.sourceLocatorSnapshot),
    created_at: row.createdAt.toISOString(),
  };
}

function toBoundaryRecord(row: TopicSelectionResearchSliceBoundary): TopicSelectionResearchSliceBoundaryRecord {
  return {
    research_slice_boundary_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    research_slice_id: row.researchSliceId,
    boundary_kind: row.boundaryKind as TopicSelectionResearchSliceBoundaryRecord['boundary_kind'],
    boundary_type: row.boundaryType,
    statement: row.statement,
    reason: row.reason,
    evidence_refs: asArray<TopicSelectionFunctionalRef>(row.evidenceRefs),
    created_at: row.createdAt.toISOString(),
  };
}

function toAssumptionRecord(row: TopicSelectionResearchSliceAssumption): TopicSelectionResearchSliceAssumptionRecord {
  return {
    research_slice_assumption_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    research_slice_id: row.researchSliceId,
    assumption_type: row.assumptionType as TopicSelectionResearchSliceAssumptionRecord['assumption_type'],
    statement: row.statement,
    status: row.status,
    evidence_refs: asArray<TopicSelectionFunctionalRef>(row.evidenceRefs),
    risk_level: row.riskLevel as TopicSelectionResearchSliceAssumptionRecord['risk_level'],
    created_at: row.createdAt.toISOString(),
  };
}

export class PrismaTopicSelectionV1bResearchSliceRepository
implements TopicSelectionV1bResearchSliceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createPlanRun(
    record: TopicSelectionPlanResearchSliceRunRecord,
  ): Promise<TopicSelectionPlanResearchSliceRunRecord> {
    const row = await this.prisma.topicSelectionPlanResearchSliceRun.create({
      data: this.toPlanRunCreateInput(record),
    });
    return toPlanRunRecord(row);
  }

  async updatePlanRun(
    planRunId: string,
    patch: Partial<Pick<
      TopicSelectionPlanResearchSliceRunRecord,
      'status' | 'workflow_run_id' | 'option_set_id' | 'artifact_refs' | 'quality_flags' | 'failure_reason' | 'updated_at'
    >>,
  ): Promise<TopicSelectionPlanResearchSliceRunRecord> {
    const row = await this.prisma.topicSelectionPlanResearchSliceRun.update({
      where: { id: planRunId },
      data: {
        status: patch.status,
        workflowRunId: patch.workflow_run_id,
        optionSetId: patch.option_set_id,
        artifactRefs: patch.artifact_refs === undefined ? undefined : toJsonValue(patch.artifact_refs),
        qualityFlags: patch.quality_flags,
        failureReason: patch.failure_reason,
        updatedAt: patch.updated_at ? new Date(patch.updated_at) : undefined,
      },
    });
    return toPlanRunRecord(row);
  }

  async findPlanRunById(planRunId: string): Promise<TopicSelectionPlanResearchSliceRunRecord | null> {
    const row = await this.prisma.topicSelectionPlanResearchSliceRun.findUnique({
      where: { id: planRunId },
    });
    return row ? toPlanRunRecord(row) : null;
  }

  async createPlanRunWithOptionSet(
    persistence: TopicSelectionResearchSlicePlanningPersistence,
  ): Promise<{
    plan_run: TopicSelectionPlanResearchSliceRunRecord;
    option_set: TopicSelectionResearchSliceOptionSetRecord;
    options: TopicSelectionResearchSliceOptionRecord[];
  }> {
    const [planRunRow, optionSetRow, optionRows] = await this.prisma.$transaction(async (tx) => {
      const createdPlanRun = await tx.topicSelectionPlanResearchSliceRun.create({
        data: this.toPlanRunCreateInput(persistence.plan_run),
      });
      const createdOptionSet = await tx.topicSelectionResearchSliceOptionSet.create({
        data: this.toOptionSetCreateInput(persistence.option_set),
      });
      const createdOptions: TopicSelectionResearchSliceOption[] = [];
      for (const option of persistence.options) {
        createdOptions.push(await tx.topicSelectionResearchSliceOption.create({
          data: this.toOptionCreateInput(option),
        }));
      }
      return [createdPlanRun, createdOptionSet, createdOptions] as const;
    });
    return {
      plan_run: toPlanRunRecord(planRunRow),
      option_set: toOptionSetRecord(optionSetRow),
      options: optionRows.map(toOptionRecord),
    };
  }

  async findOptionSetById(optionSetId: string): Promise<TopicSelectionResearchSliceOptionSetRecord | null> {
    const row = await this.prisma.topicSelectionResearchSliceOptionSet.findUnique({
      where: { id: optionSetId },
    });
    return row ? toOptionSetRecord(row) : null;
  }

  async listOptionSetsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionResearchSliceOptionSetRecord[]> {
    const rows = await this.prisma.topicSelectionResearchSliceOptionSet.findMany({
      where: { titleCardId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toOptionSetRecord);
  }

  async updateOptionSet(
    optionSetId: string,
    patch: Partial<Pick<
      TopicSelectionResearchSliceOptionSetRecord,
      'status' | 'selected_option_id' | 'updated_at'
    >>,
  ): Promise<TopicSelectionResearchSliceOptionSetRecord> {
    const row = await this.prisma.topicSelectionResearchSliceOptionSet.update({
      where: { id: optionSetId },
      data: {
        status: patch.status,
        selectedOptionId: patch.selected_option_id,
        updatedAt: patch.updated_at ? new Date(patch.updated_at) : undefined,
      },
    });
    return toOptionSetRecord(row);
  }

  async updateOptionSetComparisonPayload(
    optionSetId: string,
    comparisonPayload: Record<string, unknown>,
    updatedAt: string,
  ): Promise<TopicSelectionResearchSliceOptionSetRecord> {
    const row = await this.prisma.topicSelectionResearchSliceOptionSet.update({
      where: { id: optionSetId },
      data: {
        comparisonPayload: toJsonValue(comparisonPayload),
        updatedAt: new Date(updatedAt),
      },
    });
    return toOptionSetRecord(row);
  }

  async listOptionSetsMissingN4HandoffHash(): Promise<TopicSelectionResearchSliceOptionSetRecord[]> {
    // One-time backfill enumerator: load all option-sets and filter in-app (robust to absent vs JSON-null vs
    // empty keys, which a Prisma JSON `where` handles inconsistently). Bounded, off the hot path.
    const rows = await this.prisma.topicSelectionResearchSliceOptionSet.findMany();
    return rows.map(toOptionSetRecord).filter(optionSetLacksN4HandoffHash);
  }

  async listOptionsByOptionSetId(optionSetId: string): Promise<TopicSelectionResearchSliceOptionRecord[]> {
    const rows = await this.prisma.topicSelectionResearchSliceOption.findMany({
      where: { researchSliceOptionSetId: optionSetId },
      orderBy: { optionOrdinal: 'asc' },
    });
    return rows.map(toOptionRecord);
  }

  async findOptionById(optionId: string): Promise<TopicSelectionResearchSliceOptionRecord | null> {
    const row = await this.prisma.topicSelectionResearchSliceOption.findUnique({
      where: { id: optionId },
    });
    return row ? toOptionRecord(row) : null;
  }

  async createSelectionDecision(
    record: TopicSelectionSliceSelectionDecisionRecord,
  ): Promise<TopicSelectionSliceSelectionDecisionRecord> {
    const row = await this.prisma.topicSelectionSliceSelectionDecision.create({
      data: this.toDecisionCreateInput(record),
    });
    return toDecisionRecord(row);
  }

  async createSelectionDecisionWithSlice(
    creation: TopicSelectionResearchSliceCreation,
  ): Promise<{
    decision: TopicSelectionSliceSelectionDecisionRecord;
    research_slice: TopicSelectionResearchSliceRecord;
    evidence_refs: TopicSelectionResearchSliceEvidenceRefRecord[];
    boundaries: TopicSelectionResearchSliceBoundaryRecord[];
    assumptions: TopicSelectionResearchSliceAssumptionRecord[];
  }> {
    const [decisionRow, sliceRow, evidenceRows, boundaryRows, assumptionRows] = await this.prisma.$transaction(
      async (tx) => {
        const createdDecision = await tx.topicSelectionSliceSelectionDecision.create({
          data: this.toDecisionCreateInput(creation.decision),
        });
        const createdSlice = await tx.topicSelectionResearchSlice.create({
          data: this.toResearchSliceCreateInput(creation.research_slice),
        });
        const createdEvidenceRefs: TopicSelectionResearchSliceEvidenceRef[] = [];
        for (const evidenceRef of creation.evidence_refs) {
          createdEvidenceRefs.push(await tx.topicSelectionResearchSliceEvidenceRef.create({
            data: this.toEvidenceRefCreateInput(evidenceRef),
          }));
        }
        const createdBoundaries: TopicSelectionResearchSliceBoundary[] = [];
        for (const boundary of creation.boundaries) {
          createdBoundaries.push(await tx.topicSelectionResearchSliceBoundary.create({
            data: this.toBoundaryCreateInput(boundary),
          }));
        }
        const createdAssumptions: TopicSelectionResearchSliceAssumption[] = [];
        for (const assumption of creation.assumptions) {
          createdAssumptions.push(await tx.topicSelectionResearchSliceAssumption.create({
            data: this.toAssumptionCreateInput(assumption),
          }));
        }
        await tx.topicSelectionResearchSliceOptionSet.update({
          where: { id: creation.research_slice.source_option_set_ref.ref_id },
          data: {
            status: creation.option_set_patch.status,
            selectedOptionId: creation.option_set_patch.selected_option_id,
            updatedAt: new Date(creation.option_set_patch.updated_at),
          },
        });
        await tx.topicSelectionResearchSliceOption.update({
          where: { id: creation.research_slice.source_option_ref.ref_id },
          data: { status: 'selected' },
        });
        return [createdDecision, createdSlice, createdEvidenceRefs, createdBoundaries, createdAssumptions] as const;
      },
    );

    return {
      decision: toDecisionRecord(decisionRow),
      research_slice: toResearchSliceRecord(sliceRow),
      evidence_refs: evidenceRows.map(toEvidenceRefRecord),
      boundaries: boundaryRows.map(toBoundaryRecord),
      assumptions: assumptionRows.map(toAssumptionRecord),
    };
  }

  async findSelectionDecisionById(
    decisionId: string,
  ): Promise<TopicSelectionSliceSelectionDecisionRecord | null> {
    const row = await this.prisma.topicSelectionSliceSelectionDecision.findUnique({
      where: { id: decisionId },
    });
    return row ? toDecisionRecord(row) : null;
  }

  async findResearchSliceById(researchSliceId: string): Promise<TopicSelectionResearchSliceRecord | null> {
    const row = await this.prisma.topicSelectionResearchSlice.findUnique({
      where: { id: researchSliceId },
    });
    return row ? toResearchSliceRecord(row) : null;
  }

  async listEvidenceRefsByResearchSliceId(
    researchSliceId: string,
  ): Promise<TopicSelectionResearchSliceEvidenceRefRecord[]> {
    const rows = await this.prisma.topicSelectionResearchSliceEvidenceRef.findMany({
      where: { researchSliceId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toEvidenceRefRecord);
  }

  async listBoundariesByResearchSliceId(
    researchSliceId: string,
  ): Promise<TopicSelectionResearchSliceBoundaryRecord[]> {
    const rows = await this.prisma.topicSelectionResearchSliceBoundary.findMany({
      where: { researchSliceId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toBoundaryRecord);
  }

  async listAssumptionsByResearchSliceId(
    researchSliceId: string,
  ): Promise<TopicSelectionResearchSliceAssumptionRecord[]> {
    const rows = await this.prisma.topicSelectionResearchSliceAssumption.findMany({
      where: { researchSliceId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toAssumptionRecord);
  }

  private toPlanRunCreateInput(
    record: TopicSelectionPlanResearchSliceRunRecord,
  ): Prisma.TopicSelectionPlanResearchSliceRunCreateInput {
    return {
      id: record.plan_research_slice_run_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      v1bIntakeReadinessAssessmentId: record.v1b_intake_readiness_assessment_id,
      v1bIntakeSnapshotId: record.v1b_intake_snapshot_id,
      researchConstraintProfileId: record.research_constraint_profile_id,
      v1bInputBundleId: record.v1b_input_bundle_id,
      validatedNeedId: record.validated_need_id,
      status: record.status,
      triggeredBy: record.triggered_by,
      v1bInputBundleRef: toJsonValue(record.v1b_input_bundle_ref),
      v1bIntakeSnapshotRef: toJsonValue(record.v1b_intake_snapshot_ref),
      researchConstraintProfileRef: toJsonValue(record.research_constraint_profile_ref),
      readinessAssessmentRef: toJsonValue(record.readiness_assessment_ref),
      validatedNeedRef: toJsonValue(record.validated_need_ref),
      evidenceMapRef: toJsonValue(record.evidence_map_ref),
      searchRunRef: toJsonValue(record.search_run_ref),
      searchPlanRef: toJsonValue(record.search_plan_ref),
      literatureSnapshotRef: toJsonValue(record.literature_snapshot_ref),
      acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
      memorySuggestionRefs: toJsonValue(record.memory_suggestion_refs),
      recheckRequestRefs: toJsonValue(record.recheck_request_refs),
      gapCodes: record.gap_codes,
      workflowProfileKey: record.workflow_profile_key,
      workflowProfileVersion: record.workflow_profile_version ?? null,
      providerId: record.provider_id ?? null,
      modelId: record.model_id ?? null,
      promptTemplateId: record.prompt_template_id ?? null,
      promptTemplateVersion: record.prompt_template_version ?? null,
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      optionSetId: record.option_set_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      qualityFlags: record.quality_flags,
      failureReason: record.failure_reason ?? null,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }

  private toOptionSetCreateInput(
    record: TopicSelectionResearchSliceOptionSetRecord,
  ): Prisma.TopicSelectionResearchSliceOptionSetCreateInput {
    return {
      id: record.research_slice_option_set_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      planResearchSliceRunId: record.plan_research_slice_run_id,
      v1bIntakeReadinessAssessmentId: record.v1b_intake_readiness_assessment_id,
      v1bIntakeSnapshotId: record.v1b_intake_snapshot_id,
      researchConstraintProfileId: record.research_constraint_profile_id,
      v1bInputBundleId: record.v1b_input_bundle_id,
      validatedNeedIds: record.validated_need_ids,
      status: record.status,
      recommendedOptionId: record.recommended_option_id ?? null,
      selectedOptionId: record.selected_option_id ?? null,
      optionCount: record.option_count,
      highRiskOptionCount: record.high_risk_option_count,
      requiresHumanReview: record.requires_human_review,
      comparisonAxes: record.comparison_axes,
      comparisonSummary: record.comparison_summary,
      missingOptionTypes: record.missing_option_types,
      unresolvedDisagreements: record.unresolved_disagreements,
      humanReviewTriggers: record.human_review_triggers,
      optionsPayload: toJsonValue(record.options_payload),
      comparisonPayload: toJsonValue(record.comparison_payload),
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }

  private toOptionCreateInput(
    record: TopicSelectionResearchSliceOptionRecord,
  ): Prisma.TopicSelectionResearchSliceOptionCreateInput {
    return {
      id: record.research_slice_option_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      researchSliceOptionSetId: record.research_slice_option_set_id,
      optionOrdinal: record.option_ordinal,
      optionKey: record.option_key,
      status: record.status,
      sourceValidatedNeedRefs: toJsonValue(record.source_validated_need_refs),
      sliceStatement: record.slice_statement,
      problemSpace: record.problem_space,
      targetSetting: record.target_setting,
      targetCommunity: record.target_community,
      includedBoundaries: record.included_boundaries,
      excludedBoundaries: record.excluded_boundaries,
      contributionTypeCandidate: record.contribution_type_candidate,
      supportEvidenceRefs: toJsonValue(record.support_evidence_refs),
      challengeEvidenceRefs: toJsonValue(record.challenge_evidence_refs),
      baselineEvidenceRefs: toJsonValue(record.baseline_evidence_refs),
      contextEvidenceRefs: toJsonValue(record.context_evidence_refs),
      resourceAssumptions: record.resource_assumptions,
      dataAssumptions: record.data_assumptions,
      evaluationPath: record.evaluation_path,
      baselineAssumptions: record.baseline_assumptions,
      hardBlockers: record.hard_blockers,
      dependencyRisks: record.dependency_risks,
      sliceBudget: toJsonValue(record.slice_budget),
      expectedClaim: record.expected_claim,
      fallbackClaim: record.fallback_claim,
      observableSuccessCriteria: record.observable_success_criteria,
      mainRisks: record.main_risks,
      baselineRisk: record.baseline_risk,
      executionRisk: record.execution_risk,
      scopeRisk: record.scope_risk,
      claimCeilingAlignment: toJsonValue(record.claim_ceiling_alignment),
      confidence: record.confidence ?? null,
      requiresHumanReview: record.requires_human_review,
      humanReviewTriggers: record.human_review_triggers,
      detailsPayload: toJsonValue(record.details_payload),
      createdAt: new Date(record.created_at),
    };
  }

  private toDecisionCreateInput(
    record: TopicSelectionSliceSelectionDecisionRecord,
  ): Prisma.TopicSelectionSliceSelectionDecisionCreateInput {
    return {
      id: record.slice_selection_decision_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      researchSliceOptionSetId: record.research_slice_option_set_id,
      selectedOptionId: record.selected_option_id ?? null,
      decision: record.decision,
      decidedBy: record.decided_by,
      selectionPolicyVersion: record.selection_policy_version,
      decisionBasis: toJsonValue(record.decision_basis),
      selectionRationale: record.selection_rationale,
      rejectedOptionReasons: toJsonValue(record.rejected_option_reasons),
      hardBlockers: record.hard_blockers,
      openRisks: record.open_risks,
      unresolvedDisagreements: record.unresolved_disagreements,
      loopbackTarget: record.loopback_target ?? null,
      loopbackTargetRef: jsonOrNull(record.loopback_target_ref ?? null),
      requiredActions: record.required_actions,
      loopbackReasonCode: record.loopback_reason_code ?? null,
      sourceDownstreamObjectRef: jsonOrNull(record.source_downstream_object_ref ?? null),
      createsNewRunOrVersion: record.creates_new_run_or_version,
      confidence: record.confidence ?? null,
      requiresHumanReview: record.requires_human_review,
      humanReviewReason: record.human_review_reason ?? null,
      outputResearchSliceId: record.output_research_slice_ref?.ref_id ?? null,
      outputResearchSliceRef: jsonOrNull(record.output_research_slice_ref ?? null),
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      gateResultId: record.gate_result_id ?? null,
      transitionAttemptId: record.transition_attempt_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      createdAt: new Date(record.created_at),
    };
  }

  private toResearchSliceCreateInput(
    record: TopicSelectionResearchSliceRecord,
  ): Prisma.TopicSelectionResearchSliceCreateInput {
    return {
      id: record.research_slice_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      v1bIntakeSnapshotId: record.v1b_intake_snapshot_id,
      researchConstraintProfileId: record.research_constraint_profile_id,
      v1bInputBundleId: record.v1b_input_bundle_id,
      validatedNeedId: record.validated_need_id,
      sourceOptionSetId: record.source_option_set_ref.ref_id,
      sourceOptionId: record.source_option_ref.ref_id,
      sliceSelectionDecisionId: record.slice_selection_decision_ref.ref_id,
      sliceVersion: record.slice_version,
      status: record.status,
      v1bIntakeSnapshotRef: toJsonValue(record.v1b_intake_snapshot_ref),
      researchConstraintProfileRef: toJsonValue(record.research_constraint_profile_ref),
      readinessAssessmentRef: toJsonValue(record.readiness_assessment_ref),
      v1bInputBundleRef: toJsonValue(record.v1b_input_bundle_ref),
      validatedNeedRef: toJsonValue(record.validated_need_ref),
      evidenceMapRef: toJsonValue(record.evidence_map_ref),
      searchRunRef: toJsonValue(record.search_run_ref),
      searchPlanRef: toJsonValue(record.search_plan_ref),
      literatureSnapshotRef: toJsonValue(record.literature_snapshot_ref),
      sourceOptionSetRef: toJsonValue(record.source_option_set_ref),
      sourceOptionRef: toJsonValue(record.source_option_ref),
      sliceSelectionDecisionRef: toJsonValue(record.slice_selection_decision_ref),
      problemSpace: record.problem_space,
      sliceStatement: record.slice_statement,
      targetSetting: record.target_setting,
      targetCommunity: record.target_community,
      includedBoundaries: record.included_boundaries,
      excludedBoundaries: record.excluded_boundaries,
      candidateContributionTypes: record.candidate_contribution_types,
      preferredContributionType: record.preferred_contribution_type ?? null,
      contributionRationale: record.contribution_rationale,
      expectedClaim: record.expected_claim,
      fallbackClaim: record.fallback_claim,
      observableSuccessCriteria: record.observable_success_criteria,
      resourceAssumptions: record.resource_assumptions,
      dataAssumptions: record.data_assumptions,
      evaluationPath: record.evaluation_path,
      baselineAssumptions: record.baseline_assumptions,
      dependencyRisks: record.dependency_risks,
      sliceBudget: toJsonValue(record.slice_budget),
      topicQuestionGuardrails: record.topic_question_guardrails,
      valueAssessmentInputs: record.value_assessment_inputs,
      mustPreserveBoundaries: record.must_preserve_boundaries,
      acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
      memorySuggestionRefs: toJsonValue(record.memory_suggestion_refs),
      recheckRequestRefs: toJsonValue(record.recheck_request_refs),
      gapCodes: record.gap_codes,
      nonGoals: record.non_goals,
      claimCeiling: record.claim_ceiling,
      decisionReason: record.decision_reason ?? null,
      supersedesResearchSliceId: record.supersedes_research_slice_ref?.ref_id ?? null,
      supersedesResearchSliceRef: jsonOrNull(record.supersedes_research_slice_ref ?? null),
      supersededByResearchSliceId: record.superseded_by_research_slice_ref?.ref_id ?? null,
      supersededByResearchSliceRef: jsonOrNull(record.superseded_by_research_slice_ref ?? null),
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      gateResultId: record.gate_result_id ?? null,
      transitionAttemptId: record.transition_attempt_id ?? null,
      traceSnapshotId: record.trace_snapshot_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      createdBy: record.created_by,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }

  private toEvidenceRefCreateInput(
    record: TopicSelectionResearchSliceEvidenceRefRecord,
  ): Prisma.TopicSelectionResearchSliceEvidenceRefUncheckedCreateInput {
    return {
      id: record.research_slice_evidence_ref_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      researchSliceId: record.research_slice_id,
      evidenceRef: toJsonValue(record.evidence_ref),
      evidenceRefType: record.evidence_ref.ref_type,
      evidenceRefId: record.evidence_ref.ref_id,
      evidenceRole: record.evidence_role,
      rationale: record.rationale,
      evidenceStrengthSnapshot: toJsonValue(record.evidence_strength_snapshot),
      sourceLocatorSnapshot: toJsonValue(record.source_locator_snapshot),
      createdAt: new Date(record.created_at),
    };
  }

  private toBoundaryCreateInput(
    record: TopicSelectionResearchSliceBoundaryRecord,
  ): Prisma.TopicSelectionResearchSliceBoundaryUncheckedCreateInput {
    return {
      id: record.research_slice_boundary_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      researchSliceId: record.research_slice_id,
      boundaryKind: record.boundary_kind,
      boundaryType: record.boundary_type,
      statement: record.statement,
      reason: record.reason,
      evidenceRefs: toJsonValue(record.evidence_refs),
      createdAt: new Date(record.created_at),
    };
  }

  private toAssumptionCreateInput(
    record: TopicSelectionResearchSliceAssumptionRecord,
  ): Prisma.TopicSelectionResearchSliceAssumptionUncheckedCreateInput {
    return {
      id: record.research_slice_assumption_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      researchSliceId: record.research_slice_id,
      assumptionType: record.assumption_type,
      statement: record.statement,
      status: record.status,
      evidenceRefs: toJsonValue(record.evidence_refs),
      riskLevel: record.risk_level,
      createdAt: new Date(record.created_at),
    };
  }
}
