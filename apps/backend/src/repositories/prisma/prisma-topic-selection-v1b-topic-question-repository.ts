import type {
  PrismaClient,
  TitleCardResearchQuestion,
  TopicSelectionFormTopicQuestionRun,
  TopicSelectionQuestionFrame,
  TopicSelectionTopicQuestionAnswerabilityPlan,
  TopicSelectionTopicQuestionAssumptionRef,
  TopicSelectionTopicQuestionBoundaryRef,
  TopicSelectionTopicQuestionCandidate,
  TopicSelectionTopicQuestionCandidateSet,
  TopicSelectionTopicQuestionContract,
  TopicSelectionTopicQuestionEvidenceRef,
  TopicSelectionTopicQuestionFalsificationCondition,
  TopicSelectionTopicQuestionNeedRef,
  TopicSelectionTopicQuestionSelectionDecision,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionFormTopicQuestionRunRecord,
  TopicSelectionQuestionFrameRecord,
  TopicSelectionTopicQuestionAnswerabilityPlanRecord,
  TopicSelectionTopicQuestionAssumptionRefRecord,
  TopicSelectionTopicQuestionBoundaryRefRecord,
  TopicSelectionTopicQuestionCandidateRecord,
  TopicSelectionTopicQuestionCandidateSetRecord,
  TopicSelectionTopicQuestionContractRecord,
  TopicSelectionTopicQuestionEvidenceRefRecord,
  TopicSelectionTopicQuestionFalsificationConditionRecord,
  TopicSelectionTopicQuestionNeedRefRecord,
  TopicSelectionTopicQuestionRecord,
  TopicSelectionTopicQuestionSelectionDecisionRecord,
  TopicSelectionV1bTopicQuestionMaterialization,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-question-contracts';
import type {
  TopicSelectionTopicQuestionCandidatePersistence,
  TopicSelectionTopicQuestionSelectionPersistence,
  TopicSelectionV1bTopicQuestionRepository,
} from '../topic-selection-v1b-topic-question.repository.js';

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function jsonOrNull(value: unknown | null | undefined): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null || value === undefined ? Prisma.DbNull : toJsonValue(value);
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

function toRunRecord(row: TopicSelectionFormTopicQuestionRun): TopicSelectionFormTopicQuestionRunRecord {
  return {
    form_topic_question_run_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    research_slice_id: row.researchSliceId,
    research_slice_version: row.researchSliceVersion,
    status: row.status as TopicSelectionFormTopicQuestionRunRecord['status'],
    triggered_by: row.triggeredBy as TopicSelectionFormTopicQuestionRunRecord['triggered_by'],
    research_slice_ref: asFunctionalRef(row.researchSliceRef),
    slice_selection_decision_ref: asFunctionalRef(row.sliceSelectionDecisionRef),
    source_option_set_ref: asFunctionalRef(row.sourceOptionSetRef),
    source_option_ref: asFunctionalRef(row.sourceOptionRef),
    validated_need_ref: asFunctionalRef(row.validatedNeedRef),
    v1b_intake_snapshot_ref: asFunctionalRef(row.v1bIntakeSnapshotRef),
    research_constraint_profile_ref: asFunctionalRef(row.researchConstraintProfileRef),
    readiness_assessment_ref: asFunctionalRef(row.readinessAssessmentRef),
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
    question_frame_id: row.questionFrameId,
    candidate_set_id: row.candidateSetId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    quality_flags: row.qualityFlags,
    failure_reason: row.failureReason,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toFrameRecord(row: TopicSelectionQuestionFrame): TopicSelectionQuestionFrameRecord {
  return {
    question_frame_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    form_topic_question_run_id: row.formTopicQuestionRunId,
    research_slice_id: row.researchSliceId,
    research_slice_version: row.researchSliceVersion,
    source_validated_need_refs: asArray<TopicSelectionFunctionalRef>(row.sourceValidatedNeedRefs),
    target_setting: row.targetSetting,
    target_community: row.targetCommunity,
    object_scope: row.objectScope,
    task_scope: row.taskScope,
    intervention_or_approach: row.interventionOrApproach,
    comparison_baseline: row.comparisonBaseline,
    observable_outcome: row.observableOutcome,
    assumption_refs: asArray<TopicSelectionFunctionalRef>(row.assumptionRefs),
    evidence_refs: asArray<TopicSelectionFunctionalRef>(row.evidenceRefs),
    frame_payload: asRecord(row.framePayload),
    checksum: row.checksum,
    created_at: row.createdAt.toISOString(),
  };
}

function toCandidateSetRecord(row: TopicSelectionTopicQuestionCandidateSet): TopicSelectionTopicQuestionCandidateSetRecord {
  return {
    topic_question_candidate_set_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    form_topic_question_run_id: row.formTopicQuestionRunId,
    question_frame_id: row.questionFrameId,
    research_slice_id: row.researchSliceId,
    research_slice_version: row.researchSliceVersion,
    status: row.status as TopicSelectionTopicQuestionCandidateSetRecord['status'],
    candidate_count: row.candidateCount,
    recommended_candidate_ids: row.recommendedCandidateIds,
    admission_readiness: asRecord(row.admissionReadiness),
    hard_blockers: row.hardBlockers,
    human_review_triggers: row.humanReviewTriggers,
    generation_notes: row.generationNotes,
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toCandidateRecord(row: TopicSelectionTopicQuestionCandidate): TopicSelectionTopicQuestionCandidateRecord {
  return {
    topic_question_candidate_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    candidate_set_id: row.candidateSetId,
    question_frame_id: row.questionFrameId,
    research_slice_id: row.researchSliceId,
    research_slice_version: row.researchSliceVersion,
    candidate_ordinal: row.candidateOrdinal,
    candidate_key: row.candidateKey,
    status: row.status as TopicSelectionTopicQuestionCandidateRecord['status'],
    main_question: row.mainQuestion,
    sub_questions: row.subQuestions,
    question_type: row.questionType as TopicSelectionTopicQuestionCandidateRecord['question_type'],
    contribution_hypothesis: row.contributionHypothesis as TopicSelectionTopicQuestionCandidateRecord['contribution_hypothesis'],
    source_validated_need_refs: asArray<TopicSelectionFunctionalRef>(row.sourceValidatedNeedRefs),
    answerability_verdict: row.answerabilityVerdict as TopicSelectionTopicQuestionCandidateRecord['answerability_verdict'],
    answerability_plan_payload: asRecord(row.answerabilityPlanPayload) as unknown as TopicSelectionTopicQuestionCandidateRecord['answerability_plan_payload'],
    boundary_check_payload: asRecord(row.boundaryCheckPayload) as unknown as TopicSelectionTopicQuestionCandidateRecord['boundary_check_payload'],
    traceability_check_payload: asRecord(row.traceabilityCheckPayload) as unknown as TopicSelectionTopicQuestionCandidateRecord['traceability_check_payload'],
    expected_claim: row.expectedClaim,
    fallback_claim: row.fallbackClaim,
    max_claim_strength: row.maxClaimStrength,
    observable_success_criteria: row.observableSuccessCriteria,
    falsification_conditions_payload: asArray(row.falsificationConditionsPayload),
    risk_notes: row.riskNotes,
    blockers: row.blockers,
    objections: row.objections,
    human_review_triggers: row.humanReviewTriggers,
    confidence: row.confidence,
    created_at: row.createdAt.toISOString(),
  };
}

function toDecisionRecord(row: TopicSelectionTopicQuestionSelectionDecision): TopicSelectionTopicQuestionSelectionDecisionRecord {
  return {
    topic_question_selection_decision_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    candidate_set_id: row.candidateSetId,
    form_topic_question_run_id: row.formTopicQuestionRunId,
    research_slice_id: row.researchSliceId,
    research_slice_version: row.researchSliceVersion,
    input_snapshot_ref: asFunctionalRef(row.inputSnapshotRef),
    decision: row.decision as TopicSelectionTopicQuestionSelectionDecisionRecord['decision'],
    decided_by: row.decidedBy as TopicSelectionTopicQuestionSelectionDecisionRecord['decided_by'],
    selection_policy_version: row.selectionPolicyVersion,
    admitted_candidate_ids: row.admittedCandidateIds,
    created_topic_question_ids: row.createdTopicQuestionIds,
    merged_candidate_groups: asArray<Record<string, unknown>>(row.mergedCandidateGroups),
    hard_gate_results: asArray<Record<string, unknown>>(row.hardGateResults),
    admission_review: asRecord(row.admissionReview),
    candidate_relationships: asRecord(row.candidateRelationships),
    priority_order: row.priorityOrder,
    rejected_candidate_reasons: asArray<Record<string, unknown>>(row.rejectedCandidateReasons),
    blocking_contexts: asArray<Record<string, unknown>>(row.blockingContexts),
    decision_rationale: row.decisionRationale,
    requires_human_review: row.requiresHumanReview,
    human_review_triggers: row.humanReviewTriggers,
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    confidence: row.confidence,
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    created_at: row.createdAt.toISOString(),
  };
}

function toQuestionRecord(row: TitleCardResearchQuestion): TopicSelectionTopicQuestionRecord {
  return {
    topic_question_id: row.id,
    workspace_id: null,
    title_card_id: row.titleCardId,
    research_record_id: row.researchRecordId,
    research_slice_id: row.v1bResearchSliceId ?? '',
    research_slice_version: row.v1bResearchSliceVersion ?? '',
    source_validated_need_ids: asArray<string>(row.sourceNeedReviewIds),
    source_candidate_set_id: row.v1bSourceCandidateSetId ?? '',
    source_candidate_id: row.v1bSourceCandidateId ?? '',
    selection_decision_id: row.v1bSelectionDecisionId ?? '',
    active_question_contract_id: row.v1bActiveQuestionContractId ?? '',
    main_question: row.mainQuestion,
    sub_questions: asArray<string>(row.subQuestions),
    question_type: (row.v1bQuestionType ?? row.contributionHypothesis) as TopicSelectionTopicQuestionRecord['question_type'],
    contribution_hypothesis: row.contributionHypothesis as TopicSelectionTopicQuestionRecord['contribution_hypothesis'],
    status: (row.v1bQuestionStatus ?? 'active') as TopicSelectionTopicQuestionRecord['status'],
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toContractRecord(row: TopicSelectionTopicQuestionContract): TopicSelectionTopicQuestionContractRecord {
  return {
    topic_question_contract_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    topic_question_id: row.topicQuestionId,
    version: row.version,
    answerability_plan_id: row.answerabilityPlanId,
    source_research_slice_id: row.sourceResearchSliceId,
    source_research_slice_version: row.sourceResearchSliceVersion,
    source_candidate_id: row.sourceCandidateId,
    selection_decision_id: row.selectionDecisionId,
    input_snapshot_ref: asFunctionalRef(row.inputSnapshotRef),
    contract_hash: row.contractHash,
    main_question: row.mainQuestion,
    question_type: row.questionType as TopicSelectionTopicQuestionContractRecord['question_type'],
    contribution_hypothesis: row.contributionHypothesis as TopicSelectionTopicQuestionContractRecord['contribution_hypothesis'],
    target_setting: row.targetSetting,
    target_community: row.targetCommunity,
    expected_claim: row.expectedClaim,
    fallback_claim: row.fallbackClaim,
    max_claim_strength: row.maxClaimStrength,
    evaluation_route: row.evaluationRoute,
    claim_ceiling: row.claimCeiling,
    prohibited_claims: row.prohibitedClaims,
    required_evidence_categories: row.requiredEvidenceCategories,
    allowed_refinements: row.allowedRefinements,
    stop_reopen_conditions: row.stopReopenConditions,
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    risk_notes: row.riskNotes,
    status: row.status as TopicSelectionTopicQuestionContractRecord['status'],
    created_by_workflow_run_id: row.createdByWorkflowRunId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toAnswerabilityPlanRecord(
  row: TopicSelectionTopicQuestionAnswerabilityPlan,
): TopicSelectionTopicQuestionAnswerabilityPlanRecord {
  return {
    topic_question_answerability_plan_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    topic_question_id: row.topicQuestionId,
    topic_question_contract_id: row.topicQuestionContractId,
    answerability_verdict: row.answerabilityVerdict as TopicSelectionTopicQuestionAnswerabilityPlanRecord['answerability_verdict'],
    datasets_or_resources: row.datasetsOrResources,
    metrics: row.metrics,
    baselines: row.baselines,
    ablations_or_comparisons: row.ablationsOrComparisons,
    evaluation_setting: row.evaluationSetting,
    dependency_risks: row.dependencyRisks,
    open_dependencies: row.openDependencies,
    known_gaps: row.knownGaps,
    required_evidence_refs: asArray<TopicSelectionFunctionalRef>(row.requiredEvidenceRefs),
    created_at: row.createdAt.toISOString(),
  };
}

function toNeedRefRecord(row: TopicSelectionTopicQuestionNeedRef): TopicSelectionTopicQuestionNeedRefRecord {
  return {
    topic_question_need_ref_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    topic_question_id: row.topicQuestionId,
    topic_question_contract_id: row.topicQuestionContractId,
    validated_need_ref: asFunctionalRef(row.validatedNeedRef),
    source_need_candidate_ref: asNullableFunctionalRef(row.sourceNeedCandidateRef),
    role: row.role as TopicSelectionTopicQuestionNeedRefRecord['role'],
    inherited_from_research_slice_id: row.inheritedFromResearchSliceId,
    coverage_note: row.coverageNote,
    created_at: row.createdAt.toISOString(),
  };
}

function toEvidenceRefRecord(row: TopicSelectionTopicQuestionEvidenceRef): TopicSelectionTopicQuestionEvidenceRefRecord {
  return {
    topic_question_evidence_ref_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    topic_question_id: row.topicQuestionId,
    topic_question_contract_id: row.topicQuestionContractId,
    evidence_ref: asFunctionalRef(row.evidenceRef),
    evidence_role: row.evidenceRole as TopicSelectionTopicQuestionEvidenceRefRecord['evidence_role'],
    mapped_question_part: row.mappedQuestionPart,
    rationale: row.rationale,
    source_locator_snapshot: asRecord(row.sourceLocatorSnapshot),
    created_at: row.createdAt.toISOString(),
  };
}

function toBoundaryRefRecord(row: TopicSelectionTopicQuestionBoundaryRef): TopicSelectionTopicQuestionBoundaryRefRecord {
  return {
    topic_question_boundary_ref_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    topic_question_id: row.topicQuestionId,
    topic_question_contract_id: row.topicQuestionContractId,
    research_slice_boundary_id: row.researchSliceBoundaryId,
    boundary_kind: row.boundaryKind as TopicSelectionTopicQuestionBoundaryRefRecord['boundary_kind'],
    question_part: row.questionPart,
    note: row.note,
    created_at: row.createdAt.toISOString(),
  };
}

function toAssumptionRefRecord(row: TopicSelectionTopicQuestionAssumptionRef): TopicSelectionTopicQuestionAssumptionRefRecord {
  return {
    topic_question_assumption_ref_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    topic_question_id: row.topicQuestionId,
    topic_question_contract_id: row.topicQuestionContractId,
    assumption_type: row.assumptionType as TopicSelectionTopicQuestionAssumptionRefRecord['assumption_type'],
    statement: row.statement,
    source_assumption_id: row.sourceAssumptionId,
    evidence_refs: asArray<TopicSelectionFunctionalRef>(row.evidenceRefs),
    risk_level: row.riskLevel as TopicSelectionTopicQuestionAssumptionRefRecord['risk_level'],
    status: row.status,
    created_at: row.createdAt.toISOString(),
  };
}

function toFalsificationConditionRecord(
  row: TopicSelectionTopicQuestionFalsificationCondition,
): TopicSelectionTopicQuestionFalsificationConditionRecord {
  return {
    topic_question_falsification_condition_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    topic_question_contract_id: row.topicQuestionContractId,
    condition_type: row.conditionType as TopicSelectionTopicQuestionFalsificationConditionRecord['condition_type'],
    severity: row.severity as TopicSelectionTopicQuestionFalsificationConditionRecord['severity'],
    statement: row.statement,
    trigger_evidence_refs: asArray<TopicSelectionFunctionalRef>(row.triggerEvidenceRefs),
    trigger_source_refs: asArray<TopicSelectionFunctionalRef>(row.triggerSourceRefs),
    related_contract_fields: row.relatedContractFields,
    expected_action: row.expectedAction as TopicSelectionTopicQuestionFalsificationConditionRecord['expected_action'],
    check_timing: row.checkTiming as TopicSelectionTopicQuestionFalsificationConditionRecord['check_timing'],
    confidence: row.confidence as TopicSelectionTopicQuestionFalsificationConditionRecord['confidence'],
    status: row.status as TopicSelectionTopicQuestionFalsificationConditionRecord['status'],
    created_at: row.createdAt.toISOString(),
  };
}

export class PrismaTopicSelectionV1bTopicQuestionRepository
implements TopicSelectionV1bTopicQuestionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createFormationRun(
    record: TopicSelectionFormTopicQuestionRunRecord,
  ): Promise<TopicSelectionFormTopicQuestionRunRecord> {
    const row = await this.prisma.topicSelectionFormTopicQuestionRun.create({
      data: this.toRunCreateInput(record),
    });
    return toRunRecord(row);
  }

  async findFormationRunById(runId: string): Promise<TopicSelectionFormTopicQuestionRunRecord | null> {
    const row = await this.prisma.topicSelectionFormTopicQuestionRun.findUnique({
      where: { id: runId },
    });
    return row ? toRunRecord(row) : null;
  }

  async createFormationRunWithCandidates(
    persistence: TopicSelectionTopicQuestionCandidatePersistence,
  ): Promise<{
    form_topic_question_run: TopicSelectionFormTopicQuestionRunRecord;
    question_frame: TopicSelectionQuestionFrameRecord;
    candidate_set: TopicSelectionTopicQuestionCandidateSetRecord;
    candidates: TopicSelectionTopicQuestionCandidateRecord[];
  }> {
    const [runRow, frameRow, setRow, candidateRows] = await this.prisma.$transaction(async (tx) => {
      const createdRun = await tx.topicSelectionFormTopicQuestionRun.create({
        data: this.toRunCreateInput(persistence.form_topic_question_run),
      });
      const createdFrame = await tx.topicSelectionQuestionFrame.create({
        data: this.toFrameCreateInput(persistence.question_frame),
      });
      const createdSet = await tx.topicSelectionTopicQuestionCandidateSet.create({
        data: this.toCandidateSetCreateInput(persistence.candidate_set),
      });
      const createdCandidates: TopicSelectionTopicQuestionCandidate[] = [];
      for (const candidate of persistence.candidates) {
        createdCandidates.push(await tx.topicSelectionTopicQuestionCandidate.create({
          data: this.toCandidateCreateInput(candidate),
        }));
      }
      return [createdRun, createdFrame, createdSet, createdCandidates] as const;
    });
    return {
      form_topic_question_run: toRunRecord(runRow),
      question_frame: toFrameRecord(frameRow),
      candidate_set: toCandidateSetRecord(setRow),
      candidates: candidateRows.map(toCandidateRecord),
    };
  }

  async findCandidateSetById(
    candidateSetId: string,
  ): Promise<TopicSelectionTopicQuestionCandidateSetRecord | null> {
    const row = await this.prisma.topicSelectionTopicQuestionCandidateSet.findUnique({
      where: { id: candidateSetId },
    });
    return row ? toCandidateSetRecord(row) : null;
  }

  async listCandidateSetsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionTopicQuestionCandidateSetRecord[]> {
    const rows = await this.prisma.topicSelectionTopicQuestionCandidateSet.findMany({
      where: { titleCardId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toCandidateSetRecord);
  }

  async findQuestionFrameById(frameId: string): Promise<TopicSelectionQuestionFrameRecord | null> {
    const row = await this.prisma.topicSelectionQuestionFrame.findUnique({
      where: { id: frameId },
    });
    return row ? toFrameRecord(row) : null;
  }

  async listCandidatesByCandidateSetId(
    candidateSetId: string,
  ): Promise<TopicSelectionTopicQuestionCandidateRecord[]> {
    const rows = await this.prisma.topicSelectionTopicQuestionCandidate.findMany({
      where: { candidateSetId },
      orderBy: { candidateOrdinal: 'asc' },
    });
    return rows.map(toCandidateRecord);
  }

  async findCandidateById(candidateId: string): Promise<TopicSelectionTopicQuestionCandidateRecord | null> {
    const row = await this.prisma.topicSelectionTopicQuestionCandidate.findUnique({
      where: { id: candidateId },
    });
    return row ? toCandidateRecord(row) : null;
  }

  async createSelectionDecisionWithMaterializations(
    persistence: TopicSelectionTopicQuestionSelectionPersistence,
  ): Promise<{
    decision: TopicSelectionTopicQuestionSelectionDecisionRecord;
    materializations: TopicSelectionV1bTopicQuestionMaterialization[];
  }> {
    await this.prisma.$transaction(async (tx) => {
      await tx.topicSelectionTopicQuestionSelectionDecision.create({
        data: this.toDecisionCreateInput(persistence.decision),
      });
      await tx.topicSelectionTopicQuestionCandidateSet.update({
        where: { id: persistence.decision.candidate_set_id },
        data: {
          status: persistence.candidate_set_patch.status,
          updatedAt: new Date(persistence.candidate_set_patch.updated_at),
        },
      });
      for (const patch of persistence.candidate_status_patches) {
        await tx.topicSelectionTopicQuestionCandidate.update({
          where: { id: patch.candidate_id },
          data: { status: patch.status },
        });
      }
      for (const materialization of persistence.materializations) {
        await tx.titleCardResearchRecord.create({
          data: {
            id: materialization.topic_question.research_record_id,
            titleCardId: materialization.topic_question.title_card_id,
            recordType: 'research_question',
            recordStatus: 'completed',
            parentRecordId: null,
            supersededByRecordId: null,
            sourceRecordIds: toJsonValue([
              materialization.topic_question.research_slice_id,
              materialization.topic_question.source_candidate_id,
              materialization.topic_question.selection_decision_id,
            ]),
            lineage: toJsonValue({
              source: 'topic_selection_v1b_topic_question_contract',
              research_slice_id: materialization.topic_question.research_slice_id,
              contract_id: materialization.topic_question_contract.topic_question_contract_id,
            }),
            summary: materialization.topic_question.main_question,
            confidence: new Prisma.Decimal(0.8),
            blockingIssues: toJsonValue([]),
            missingInformation: toJsonValue(materialization.answerability_plan.known_gaps),
            nextActions: toJsonValue(materialization.answerability_plan.open_dependencies),
            evidenceRefs: toJsonValue(materialization.evidence_refs.map((ref) => ref.evidence_ref)),
            payload: toJsonValue(materialization.topic_question),
            createdBy: persistence.decision.decided_by,
            createdAt: new Date(materialization.topic_question.created_at),
            updatedAt: new Date(materialization.topic_question.updated_at),
            deletedAt: null,
          },
        });
        await tx.titleCardResearchQuestion.create({
          data: {
            id: materialization.topic_question.topic_question_id,
            titleCardId: materialization.topic_question.title_card_id,
            researchRecordId: materialization.topic_question.research_record_id,
            mainQuestion: materialization.topic_question.main_question,
            subQuestions: toJsonValue(materialization.topic_question.sub_questions),
            researchSlice: materialization.topic_question.research_slice_id,
            contributionHypothesis: materialization.topic_question.contribution_hypothesis,
            sourceNeedReviewIds: toJsonValue(materialization.topic_question.source_validated_need_ids),
            sourceLiteratureEvidenceIds: toJsonValue(
              materialization.evidence_refs.map((ref) => ref.evidence_ref.ref_id),
            ),
            v1bResearchSliceId: materialization.topic_question.research_slice_id,
            v1bResearchSliceVersion: materialization.topic_question.research_slice_version,
            v1bSourceCandidateSetId: materialization.topic_question.source_candidate_set_id,
            v1bSourceCandidateId: materialization.topic_question.source_candidate_id,
            v1bSelectionDecisionId: materialization.topic_question.selection_decision_id,
            v1bActiveQuestionContractId: materialization.topic_question.active_question_contract_id,
            v1bQuestionType: materialization.topic_question.question_type,
            v1bQuestionStatus: materialization.topic_question.status,
            createdAt: new Date(materialization.topic_question.created_at),
            updatedAt: new Date(materialization.topic_question.updated_at),
          },
        });
        await tx.topicSelectionTopicQuestionContract.create({
          data: this.toContractCreateInput(materialization.topic_question_contract),
        });
        await tx.topicSelectionTopicQuestionAnswerabilityPlan.create({
          data: this.toAnswerabilityPlanCreateInput(materialization.answerability_plan),
        });
        for (const ref of materialization.need_refs) {
          await tx.topicSelectionTopicQuestionNeedRef.create({ data: this.toNeedRefCreateInput(ref) });
        }
        for (const ref of materialization.evidence_refs) {
          await tx.topicSelectionTopicQuestionEvidenceRef.create({ data: this.toEvidenceRefCreateInput(ref) });
        }
        for (const ref of materialization.boundary_refs) {
          await tx.topicSelectionTopicQuestionBoundaryRef.create({ data: this.toBoundaryRefCreateInput(ref) });
        }
        for (const ref of materialization.assumption_refs) {
          await tx.topicSelectionTopicQuestionAssumptionRef.create({ data: this.toAssumptionRefCreateInput(ref) });
        }
        for (const condition of materialization.falsification_conditions) {
          await tx.topicSelectionTopicQuestionFalsificationCondition.create({
            data: this.toFalsificationConditionCreateInput(condition),
          });
        }
      }
      if (persistence.superseded_materialization) {
        const superseded = persistence.superseded_materialization;
        await tx.titleCardResearchRecord.update({
          where: { id: superseded.research_record_id },
          data: {
            recordStatus: 'superseded',
            supersededByRecordId: superseded.superseded_by_research_record_id,
            updatedAt: new Date(superseded.updated_at),
          },
        });
        await tx.titleCardResearchQuestion.update({
          where: { id: superseded.topic_question_id },
          data: {
            v1bQuestionStatus: 'superseded',
            updatedAt: new Date(superseded.updated_at),
          },
        });
        await tx.topicSelectionTopicQuestionContract.update({
          where: { id: superseded.topic_question_contract_id },
          data: {
            status: 'superseded',
            updatedAt: new Date(superseded.updated_at),
          },
        });
      }
    });
    return persistence;
  }

  async findSelectionDecisionById(
    decisionId: string,
  ): Promise<TopicSelectionTopicQuestionSelectionDecisionRecord | null> {
    const row = await this.prisma.topicSelectionTopicQuestionSelectionDecision.findUnique({
      where: { id: decisionId },
    });
    return row ? toDecisionRecord(row) : null;
  }

  async findTopicQuestionById(questionId: string): Promise<TopicSelectionTopicQuestionRecord | null> {
    const row = await this.prisma.titleCardResearchQuestion.findUnique({
      where: { id: questionId },
    });
    return row ? toQuestionRecord(row) : null;
  }

  async findTopicQuestionContractById(
    contractId: string,
  ): Promise<TopicSelectionTopicQuestionContractRecord | null> {
    const row = await this.prisma.topicSelectionTopicQuestionContract.findUnique({
      where: { id: contractId },
    });
    return row ? toContractRecord(row) : null;
  }

  async findAnswerabilityPlanByContractId(
    contractId: string,
  ): Promise<TopicSelectionTopicQuestionAnswerabilityPlanRecord | null> {
    const row = await this.prisma.topicSelectionTopicQuestionAnswerabilityPlan.findFirst({
      where: { topicQuestionContractId: contractId },
    });
    return row ? toAnswerabilityPlanRecord(row) : null;
  }

  async findAnswerabilityPlanById(
    planId: string,
  ): Promise<TopicSelectionTopicQuestionAnswerabilityPlanRecord | null> {
    const row = await this.prisma.topicSelectionTopicQuestionAnswerabilityPlan.findUnique({
      where: { id: planId },
    });
    return row ? toAnswerabilityPlanRecord(row) : null;
  }

  async listNeedRefsByContractId(contractId: string): Promise<TopicSelectionTopicQuestionNeedRefRecord[]> {
    const rows = await this.prisma.topicSelectionTopicQuestionNeedRef.findMany({
      where: { topicQuestionContractId: contractId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toNeedRefRecord);
  }

  async listEvidenceRefsByContractId(contractId: string): Promise<TopicSelectionTopicQuestionEvidenceRefRecord[]> {
    const rows = await this.prisma.topicSelectionTopicQuestionEvidenceRef.findMany({
      where: { topicQuestionContractId: contractId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toEvidenceRefRecord);
  }

  async listBoundaryRefsByContractId(contractId: string): Promise<TopicSelectionTopicQuestionBoundaryRefRecord[]> {
    const rows = await this.prisma.topicSelectionTopicQuestionBoundaryRef.findMany({
      where: { topicQuestionContractId: contractId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toBoundaryRefRecord);
  }

  async listAssumptionRefsByContractId(contractId: string): Promise<TopicSelectionTopicQuestionAssumptionRefRecord[]> {
    const rows = await this.prisma.topicSelectionTopicQuestionAssumptionRef.findMany({
      where: { topicQuestionContractId: contractId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toAssumptionRefRecord);
  }

  async listFalsificationConditionsByContractId(
    contractId: string,
  ): Promise<TopicSelectionTopicQuestionFalsificationConditionRecord[]> {
    const rows = await this.prisma.topicSelectionTopicQuestionFalsificationCondition.findMany({
      where: { topicQuestionContractId: contractId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toFalsificationConditionRecord);
  }

  private toRunCreateInput(record: TopicSelectionFormTopicQuestionRunRecord): Prisma.TopicSelectionFormTopicQuestionRunCreateInput {
    return {
      id: record.form_topic_question_run_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      researchSliceId: record.research_slice_id,
      researchSliceVersion: record.research_slice_version,
      status: record.status,
      triggeredBy: record.triggered_by,
      researchSliceRef: toJsonValue(record.research_slice_ref),
      sliceSelectionDecisionRef: toJsonValue(record.slice_selection_decision_ref),
      sourceOptionSetRef: toJsonValue(record.source_option_set_ref),
      sourceOptionRef: toJsonValue(record.source_option_ref),
      validatedNeedRef: toJsonValue(record.validated_need_ref),
      v1bIntakeSnapshotRef: toJsonValue(record.v1b_intake_snapshot_ref),
      researchConstraintProfileRef: toJsonValue(record.research_constraint_profile_ref),
      readinessAssessmentRef: toJsonValue(record.readiness_assessment_ref),
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
      questionFrameId: record.question_frame_id ?? null,
      candidateSetId: record.candidate_set_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      qualityFlags: record.quality_flags,
      failureReason: record.failure_reason ?? null,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }

  private toFrameCreateInput(record: TopicSelectionQuestionFrameRecord): Prisma.TopicSelectionQuestionFrameCreateInput {
    return {
      id: record.question_frame_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      formTopicQuestionRunId: record.form_topic_question_run_id,
      researchSliceId: record.research_slice_id,
      researchSliceVersion: record.research_slice_version,
      sourceValidatedNeedRefs: toJsonValue(record.source_validated_need_refs),
      targetSetting: record.target_setting,
      targetCommunity: record.target_community,
      objectScope: record.object_scope,
      taskScope: record.task_scope,
      interventionOrApproach: record.intervention_or_approach,
      comparisonBaseline: record.comparison_baseline,
      observableOutcome: record.observable_outcome,
      assumptionRefs: toJsonValue(record.assumption_refs),
      evidenceRefs: toJsonValue(record.evidence_refs),
      framePayload: toJsonValue(record.frame_payload),
      checksum: record.checksum,
      createdAt: new Date(record.created_at),
    };
  }

  private toCandidateSetCreateInput(
    record: TopicSelectionTopicQuestionCandidateSetRecord,
  ): Prisma.TopicSelectionTopicQuestionCandidateSetCreateInput {
    return {
      id: record.topic_question_candidate_set_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      formTopicQuestionRunId: record.form_topic_question_run_id,
      questionFrameId: record.question_frame_id,
      researchSliceId: record.research_slice_id,
      researchSliceVersion: record.research_slice_version,
      status: record.status,
      candidateCount: record.candidate_count,
      recommendedCandidateIds: record.recommended_candidate_ids,
      admissionReadiness: toJsonValue(record.admission_readiness),
      hardBlockers: record.hard_blockers,
      humanReviewTriggers: record.human_review_triggers,
      generationNotes: record.generation_notes,
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }

  private toCandidateCreateInput(
    record: TopicSelectionTopicQuestionCandidateRecord,
  ): Prisma.TopicSelectionTopicQuestionCandidateCreateInput {
    return {
      id: record.topic_question_candidate_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      candidateSetId: record.candidate_set_id,
      questionFrameId: record.question_frame_id,
      researchSliceId: record.research_slice_id,
      researchSliceVersion: record.research_slice_version,
      candidateOrdinal: record.candidate_ordinal,
      candidateKey: record.candidate_key,
      status: record.status,
      mainQuestion: record.main_question,
      subQuestions: record.sub_questions,
      questionType: record.question_type,
      contributionHypothesis: record.contribution_hypothesis,
      sourceValidatedNeedRefs: toJsonValue(record.source_validated_need_refs),
      answerabilityVerdict: record.answerability_verdict,
      answerabilityPlanPayload: toJsonValue(record.answerability_plan_payload),
      boundaryCheckPayload: toJsonValue(record.boundary_check_payload),
      traceabilityCheckPayload: toJsonValue(record.traceability_check_payload),
      expectedClaim: record.expected_claim,
      fallbackClaim: record.fallback_claim,
      maxClaimStrength: record.max_claim_strength,
      observableSuccessCriteria: record.observable_success_criteria,
      falsificationConditionsPayload: toJsonValue(record.falsification_conditions_payload),
      riskNotes: record.risk_notes,
      blockers: record.blockers,
      objections: record.objections,
      humanReviewTriggers: record.human_review_triggers,
      confidence: record.confidence ?? null,
      createdAt: new Date(record.created_at),
    };
  }

  private toDecisionCreateInput(
    record: TopicSelectionTopicQuestionSelectionDecisionRecord,
  ): Prisma.TopicSelectionTopicQuestionSelectionDecisionCreateInput {
    return {
      id: record.topic_question_selection_decision_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      candidateSetId: record.candidate_set_id,
      formTopicQuestionRunId: record.form_topic_question_run_id,
      researchSliceId: record.research_slice_id,
      researchSliceVersion: record.research_slice_version,
      inputSnapshotRef: toJsonValue(record.input_snapshot_ref),
      decision: record.decision,
      decidedBy: record.decided_by,
      selectionPolicyVersion: record.selection_policy_version,
      admittedCandidateIds: record.admitted_candidate_ids,
      createdTopicQuestionIds: record.created_topic_question_ids,
      mergedCandidateGroups: toJsonValue(record.merged_candidate_groups),
      hardGateResults: toJsonValue(record.hard_gate_results),
      admissionReview: toJsonValue(record.admission_review),
      candidateRelationships: toJsonValue(record.candidate_relationships),
      priorityOrder: record.priority_order,
      rejectedCandidateReasons: toJsonValue(record.rejected_candidate_reasons),
      blockingContexts: toJsonValue(record.blocking_contexts),
      decisionRationale: record.decision_rationale,
      requiresHumanReview: record.requires_human_review,
      humanReviewTriggers: record.human_review_triggers,
      acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
      confidence: record.confidence ?? null,
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      gateResultId: record.gate_result_id ?? null,
      transitionAttemptId: record.transition_attempt_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      createdAt: new Date(record.created_at),
    };
  }

  private toContractCreateInput(
    record: TopicSelectionTopicQuestionContractRecord,
  ): Prisma.TopicSelectionTopicQuestionContractCreateInput {
    return {
      id: record.topic_question_contract_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      topicQuestionId: record.topic_question_id,
      version: record.version,
      answerabilityPlanId: record.answerability_plan_id,
      sourceResearchSliceId: record.source_research_slice_id,
      sourceResearchSliceVersion: record.source_research_slice_version,
      sourceCandidateId: record.source_candidate_id,
      selectionDecisionId: record.selection_decision_id,
      inputSnapshotRef: toJsonValue(record.input_snapshot_ref),
      contractHash: record.contract_hash,
      mainQuestion: record.main_question,
      questionType: record.question_type,
      contributionHypothesis: record.contribution_hypothesis,
      targetSetting: record.target_setting,
      targetCommunity: record.target_community,
      expectedClaim: record.expected_claim,
      fallbackClaim: record.fallback_claim,
      maxClaimStrength: record.max_claim_strength,
      evaluationRoute: record.evaluation_route,
      claimCeiling: record.claim_ceiling,
      prohibitedClaims: record.prohibited_claims,
      requiredEvidenceCategories: record.required_evidence_categories,
      allowedRefinements: record.allowed_refinements,
      stopReopenConditions: record.stop_reopen_conditions,
      acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
      riskNotes: record.risk_notes,
      status: record.status,
      createdByWorkflowRunId: record.created_by_workflow_run_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }

  private toAnswerabilityPlanCreateInput(
    record: TopicSelectionTopicQuestionAnswerabilityPlanRecord,
  ): Prisma.TopicSelectionTopicQuestionAnswerabilityPlanCreateInput {
    return {
      id: record.topic_question_answerability_plan_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      topicQuestionId: record.topic_question_id,
      topicQuestionContractId: record.topic_question_contract_id,
      answerabilityVerdict: record.answerability_verdict,
      datasetsOrResources: record.datasets_or_resources,
      metrics: record.metrics,
      baselines: record.baselines,
      ablationsOrComparisons: record.ablations_or_comparisons,
      evaluationSetting: record.evaluation_setting,
      dependencyRisks: record.dependency_risks,
      openDependencies: record.open_dependencies,
      knownGaps: record.known_gaps,
      requiredEvidenceRefs: toJsonValue(record.required_evidence_refs),
      createdAt: new Date(record.created_at),
    };
  }

  private toNeedRefCreateInput(
    record: TopicSelectionTopicQuestionNeedRefRecord,
  ): Prisma.TopicSelectionTopicQuestionNeedRefCreateInput {
    return {
      id: record.topic_question_need_ref_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      topicQuestionId: record.topic_question_id,
      topicQuestionContractId: record.topic_question_contract_id,
      validatedNeedRef: toJsonValue(record.validated_need_ref),
      validatedNeedRefType: record.validated_need_ref.ref_type,
      validatedNeedRefId: record.validated_need_ref.ref_id,
      sourceNeedCandidateRef: jsonOrNull(record.source_need_candidate_ref),
      role: record.role,
      inheritedFromResearchSliceId: record.inherited_from_research_slice_id,
      coverageNote: record.coverage_note,
      createdAt: new Date(record.created_at),
    };
  }

  private toEvidenceRefCreateInput(
    record: TopicSelectionTopicQuestionEvidenceRefRecord,
  ): Prisma.TopicSelectionTopicQuestionEvidenceRefCreateInput {
    return {
      id: record.topic_question_evidence_ref_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      topicQuestionId: record.topic_question_id,
      topicQuestionContractId: record.topic_question_contract_id,
      evidenceRef: toJsonValue(record.evidence_ref),
      evidenceRefType: record.evidence_ref.ref_type,
      evidenceRefId: record.evidence_ref.ref_id,
      evidenceRole: record.evidence_role,
      mappedQuestionPart: record.mapped_question_part,
      rationale: record.rationale,
      sourceLocatorSnapshot: toJsonValue(record.source_locator_snapshot),
      createdAt: new Date(record.created_at),
    };
  }

  private toBoundaryRefCreateInput(
    record: TopicSelectionTopicQuestionBoundaryRefRecord,
  ): Prisma.TopicSelectionTopicQuestionBoundaryRefCreateInput {
    return {
      id: record.topic_question_boundary_ref_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      topicQuestionId: record.topic_question_id,
      topicQuestionContractId: record.topic_question_contract_id,
      researchSliceBoundaryId: record.research_slice_boundary_id,
      boundaryKind: record.boundary_kind,
      questionPart: record.question_part,
      note: record.note,
      createdAt: new Date(record.created_at),
    };
  }

  private toAssumptionRefCreateInput(
    record: TopicSelectionTopicQuestionAssumptionRefRecord,
  ): Prisma.TopicSelectionTopicQuestionAssumptionRefCreateInput {
    return {
      id: record.topic_question_assumption_ref_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      topicQuestionId: record.topic_question_id,
      topicQuestionContractId: record.topic_question_contract_id,
      assumptionType: record.assumption_type,
      statement: record.statement,
      sourceAssumptionId: record.source_assumption_id ?? null,
      evidenceRefs: toJsonValue(record.evidence_refs),
      riskLevel: record.risk_level,
      status: record.status,
      createdAt: new Date(record.created_at),
    };
  }

  private toFalsificationConditionCreateInput(
    record: TopicSelectionTopicQuestionFalsificationConditionRecord,
  ): Prisma.TopicSelectionTopicQuestionFalsificationConditionCreateInput {
    return {
      id: record.topic_question_falsification_condition_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      topicQuestionContractId: record.topic_question_contract_id,
      conditionType: record.condition_type,
      severity: record.severity,
      statement: record.statement,
      triggerEvidenceRefs: toJsonValue(record.trigger_evidence_refs),
      triggerSourceRefs: toJsonValue(record.trigger_source_refs),
      relatedContractFields: record.related_contract_fields,
      expectedAction: record.expected_action,
      checkTiming: record.check_timing,
      confidence: record.confidence,
      status: record.status,
      createdAt: new Date(record.created_at),
    };
  }
}
