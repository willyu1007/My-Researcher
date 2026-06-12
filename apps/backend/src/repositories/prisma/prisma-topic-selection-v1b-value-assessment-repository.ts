import type {
  PrismaClient,
  TitleCardValueAssessment,
  TopicSelectionAssessTopicValueRun,
  TopicSelectionTopicValueAssessmentInputSnapshot,
  TopicSelectionTopicValueEvidenceRef,
  TopicSelectionValueDispositionDecision,
  TopicSelectionValueReasoningMemo,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionAssessTopicValueRunRecord,
  TopicSelectionTopicValueDimensionScore,
  TopicSelectionTopicValueAssessmentInputSnapshotRecord,
  TopicSelectionTopicValueAssessmentRecord,
  TopicSelectionTopicValueEvidenceRefRecord,
  TopicSelectionTopicValueGateResult,
  TopicSelectionValueDispositionDecisionRecord,
  TopicSelectionValueReasoningMemoRecord,
  TopicSelectionV1bPackageDraftInput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';
import type {
  TopicSelectionTopicValueAssessmentPersistence,
  TopicSelectionValueDispositionDecisionPersistence,
  TopicSelectionV1bValueAssessmentRepository,
} from '../topic-selection-v1b-value-assessment.repository.js';

type ValueAssessmentRow = TitleCardValueAssessment & {
  researchRecord?: { payload: Prisma.JsonValue } | null;
};

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

function asNullablePackageInput<T>(value: unknown): T | null {
  return value === null || value === undefined ? null : (value as T);
}

function toRunRecord(row: TopicSelectionAssessTopicValueRun): TopicSelectionAssessTopicValueRunRecord {
  return {
    assess_topic_value_run_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    topic_question_contract_id: row.topicQuestionContractId,
    topic_question_id: row.topicQuestionId,
    research_slice_id: row.researchSliceId,
    research_slice_version: row.researchSliceVersion,
    topic_value_assessment_id: row.topicValueAssessmentId,
    value_reasoning_memo_id: row.valueReasoningMemoId,
    status: row.status as TopicSelectionAssessTopicValueRunRecord['status'],
    triggered_by: row.triggeredBy as TopicSelectionAssessTopicValueRunRecord['triggered_by'],
    topic_question_ref: asFunctionalRef(row.topicQuestionRef),
    topic_question_contract_ref: asFunctionalRef(row.topicQuestionContractRef),
    answerability_plan_ref: asFunctionalRef(row.answerabilityPlanRef),
    research_slice_ref: asFunctionalRef(row.researchSliceRef),
    selection_decision_ref: asFunctionalRef(row.selectionDecisionRef),
    validated_need_refs: asArray<TopicSelectionFunctionalRef>(row.validatedNeedRefs),
    evidence_refs: asArray<TopicSelectionFunctionalRef>(row.evidenceRefs),
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    memory_suggestion_refs: asArray<TopicSelectionFunctionalRef>(row.memorySuggestionRefs),
    recheck_request_refs: asArray<TopicSelectionFunctionalRef>(row.recheckRequestRefs),
    workflow_profile_key: row.workflowProfileKey,
    workflow_profile_version: row.workflowProfileVersion,
    provider_id: row.providerId,
    model_id: row.modelId,
    prompt_template_id: row.promptTemplateId,
    prompt_template_version: row.promptTemplateVersion,
    topic_value_input_snapshot_id: row.topicValueInputSnapshotId,
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    quality_flags: row.qualityFlags,
    failure_reason: row.failureReason,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toInputSnapshotRecord(
  row: TopicSelectionTopicValueAssessmentInputSnapshot,
): TopicSelectionTopicValueAssessmentInputSnapshotRecord {
  return {
    topic_value_input_snapshot_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    topic_question_contract_id: row.topicQuestionContractId,
    topic_question_id: row.topicQuestionId,
    research_slice_id: row.researchSliceId,
    research_slice_version: row.researchSliceVersion,
    topic_question_ref: asFunctionalRef(row.topicQuestionRef),
    topic_question_contract_ref: asFunctionalRef(row.topicQuestionContractRef),
    answerability_plan_ref: asFunctionalRef(row.answerabilityPlanRef),
    research_slice_ref: asFunctionalRef(row.researchSliceRef),
    validated_need_refs: asArray<TopicSelectionFunctionalRef>(row.validatedNeedRefs),
    evidence_refs: asArray(row.evidenceRefs),
    need_refs: asArray(row.needRefs),
    boundary_refs: asArray(row.boundaryRefs),
    assumption_refs: asArray(row.assumptionRefs),
    falsification_conditions: asArray(row.falsificationConditions),
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    memory_suggestion_refs: asArray<TopicSelectionFunctionalRef>(row.memorySuggestionRefs),
    recheck_request_refs: asArray<TopicSelectionFunctionalRef>(row.recheckRequestRefs),
    question_contract: asRecord(row.questionContract) as unknown as TopicSelectionTopicValueAssessmentInputSnapshotRecord['question_contract'],
    answerability_plan: asRecord(row.answerabilityPlan) as unknown as TopicSelectionTopicValueAssessmentInputSnapshotRecord['answerability_plan'],
    research_slice_snapshot: asRecord(row.researchSliceSnapshot),
    snapshot_hash: row.snapshotHash,
    control_plane_input_snapshot_id: row.controlPlaneInputSnapshotId,
    created_at: row.createdAt.toISOString(),
  };
}

function toAssessmentRecord(row: ValueAssessmentRow): TopicSelectionTopicValueAssessmentRecord {
  const payload = asRecord(row.researchRecord?.payload) as unknown as Partial<TopicSelectionTopicValueAssessmentRecord>;
  return {
    ...payload,
    topic_value_assessment_id: row.id,
    workspace_id: payload.workspace_id ?? null,
    title_card_id: row.titleCardId,
    topic_question_id: row.researchQuestionId,
    topic_question_contract_id: row.v1bSourceQuestionContractId ?? payload.topic_question_contract_id ?? '',
    research_record_id: row.researchRecordId,
    source_research_slice_id: row.v1bSourceResearchSliceId ?? payload.source_research_slice_id ?? '',
    source_research_slice_version: row.v1bSourceResearchSliceVersion ?? payload.source_research_slice_version ?? '',
    assess_topic_value_run_id: row.v1bAssessmentRunId ?? payload.assess_topic_value_run_id ?? '',
    topic_value_input_snapshot_id: row.v1bInputSnapshotId ?? payload.topic_value_input_snapshot_id ?? '',
    value_reasoning_memo_id: row.v1bReasoningMemoId ?? payload.value_reasoning_memo_id ?? '',
    active_disposition_decision_id: row.v1bActiveDispositionDecisionId ?? payload.active_disposition_decision_id ?? null,
    readiness_status: (row.v1bReadinessStatus ?? payload.readiness_status ?? 'blocked') as TopicSelectionTopicValueAssessmentRecord['readiness_status'],
    freshness_status: (row.v1bFreshnessStatus ?? payload.freshness_status ?? 'current') as TopicSelectionTopicValueAssessmentRecord['freshness_status'],
    strongest_claim_if_success: row.strongestClaimIfSuccess,
    fallback_claim_if_success: row.fallbackClaimIfSuccess,
    hard_gates: payload.hard_gates ?? asArray(row.hardGates),
    dimension_scores: payload.dimension_scores ?? asArray(row.scoredDimensions),
    risk_penalty: payload.risk_penalty ?? asRecord(row.riskPenalty),
    reviewer_objections: asArray<string>(row.reviewerObjections),
    ceiling_case: row.ceilingCase,
    base_case: row.baseCase,
    floor_case: row.floorCase,
    legacy_verdict: row.verdict,
    total_score: Number(row.totalScore),
    value_summary: payload.value_summary ?? row.baseCase,
    confidence: payload.confidence ?? 0,
    accepted_risk_refs: payload.accepted_risk_refs ?? [],
    blocker_refs: payload.blocker_refs ?? [],
    risk_notes: payload.risk_notes ?? [],
    trace_snapshot_id: payload.trace_snapshot_id ?? null,
    workflow_run_id: payload.workflow_run_id ?? null,
    gate_result_id: payload.gate_result_id ?? null,
    transition_attempt_id: payload.transition_attempt_id ?? null,
    artifact_refs: payload.artifact_refs ?? [],
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function legacyGate(
  gates: TopicSelectionTopicValueGateResult[],
  gateKey: TopicSelectionTopicValueGateResult['gate_key'],
) {
  const gate = gates.find((candidate) => candidate.gate_key === gateKey);
  return {
    pass: gate ? gate.verdict !== 'fail' : false,
    reason: gate?.rationale ?? `${gateKey} not evaluated by v1b projection.`,
  };
}

function toLegacyHardGates(gates: TopicSelectionTopicValueGateResult[]) {
  return {
    significance: legacyGate(gates, 'value_signal'),
    originality: legacyGate(gates, 'non_solved_sanity'),
    answerability: legacyGate(gates, 'answerability_sanity'),
    feasibility: legacyGate(gates, 'feasibility_sanity'),
    venue_fit: legacyGate(gates, 'claim_ceiling_fit'),
  };
}

function legacyDimension(
  scores: TopicSelectionTopicValueDimensionScore[],
  dimensionKey: TopicSelectionTopicValueDimensionScore['dimension_key'],
) {
  const score = scores.find((candidate) => candidate.dimension_key === dimensionKey);
  const normalizedScore = score ? Math.max(1, Math.min(5, Math.round(score.score / 20))) : 1;
  const confidence = score ? Math.max(0, Math.min(1, score.score / 100)) : 0;
  return {
    score: normalizedScore,
    reason: score?.rationale ?? `${dimensionKey} not evaluated by v1b projection.`,
    confidence,
  };
}

function toLegacyScoredDimensions(scores: TopicSelectionTopicValueDimensionScore[]) {
  return {
    significance: legacyDimension(scores, 'significance'),
    originality: legacyDimension(scores, 'originality'),
    claim_strength: legacyDimension(scores, 'claim_ceiling_fit'),
    answerability: legacyDimension(scores, 'answerability'),
    venue_fit: legacyDimension(scores, 'reviewer_risk'),
    strategic_leverage: legacyDimension(scores, 'strategic_fit'),
  };
}

function toLegacyRiskPenalty(record: TopicSelectionTopicValueAssessmentRecord) {
  return {
    data_risk: 0,
    compute_risk: 0,
    baseline_risk: 0,
    execution_risk: 0,
    ethics_risk: 0,
    penalty_summary: record.risk_notes.join(' ') || record.value_summary,
  };
}

function toMemoRecord(row: TopicSelectionValueReasoningMemo): TopicSelectionValueReasoningMemoRecord {
  return {
    value_reasoning_memo_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    topic_value_assessment_id: row.topicValueAssessmentId,
    topic_question_contract_id: row.topicQuestionContractId,
    recommendation: row.recommendation as TopicSelectionValueReasoningMemoRecord['recommendation'],
    value_thesis: row.valueThesis,
    significance: row.significance,
    originality: row.originality,
    claim_leverage: row.claimLeverage,
    reviewer_risks: row.reviewerRisks,
    effort_to_value: row.effortToValue,
    strategic_fit: row.strategicFit,
    negative_memory_check: row.negativeMemoryCheck,
    evidence_backed_rationale: row.evidenceBackedRationale,
    top_objections: row.topObjections,
    uncertainty: row.uncertainty,
    disposition_bridge: row.dispositionBridge,
    requires_critic_review: row.requiresCriticReview,
    critic_triggers: row.criticTriggers,
    cited_refs: asArray<TopicSelectionFunctionalRef>(row.citedRefs),
    created_by_workflow_run_id: row.createdByWorkflowRunId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    created_at: row.createdAt.toISOString(),
  };
}

function toEvidenceRefRecord(row: TopicSelectionTopicValueEvidenceRef): TopicSelectionTopicValueEvidenceRefRecord {
  return {
    topic_value_evidence_ref_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    topic_value_assessment_id: row.topicValueAssessmentId,
    topic_question_contract_id: row.topicQuestionContractId,
    evidence_ref: asFunctionalRef(row.evidenceRef),
    evidence_role: row.evidenceRole,
    value_use: row.valueUse,
    rationale: row.rationale,
    created_at: row.createdAt.toISOString(),
  };
}

function toDecisionRecord(row: TopicSelectionValueDispositionDecision): TopicSelectionValueDispositionDecisionRecord {
  return {
    value_disposition_decision_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    topic_value_assessment_id: row.topicValueAssessmentId,
    topic_question_contract_id: row.topicQuestionContractId,
    value_reasoning_memo_id: row.valueReasoningMemoId,
    decision: row.decision as TopicSelectionValueDispositionDecisionRecord['decision'],
    decided_by: row.decidedBy as TopicSelectionValueDispositionDecisionRecord['decided_by'],
    decision_rationale: row.decisionRationale,
    required_actions: row.requiredActions,
    loopback_target_ref: row.loopbackTargetRef ? asFunctionalRef(row.loopbackTargetRef) : null,
    blocking_contexts: asArray<Record<string, unknown>>(row.blockingContexts),
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    blocker_refs: asArray<TopicSelectionFunctionalRef>(row.blockerRefs),
    package_draft_input: asNullablePackageInput<TopicSelectionV1bPackageDraftInput>(row.packageDraftInput),
    output_topic_package_id: row.outputTopicPackageId,
    status: row.status as TopicSelectionValueDispositionDecisionRecord['status'],
    is_current: row.isCurrent,
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    created_at: row.createdAt.toISOString(),
  };
}

export class PrismaTopicSelectionV1bValueAssessmentRepository
implements TopicSelectionV1bValueAssessmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createAssessmentRun(
    record: TopicSelectionAssessTopicValueRunRecord,
  ): Promise<TopicSelectionAssessTopicValueRunRecord> {
    const row = await this.prisma.topicSelectionAssessTopicValueRun.create({
      data: this.toRunCreateInput(record),
    });
    return toRunRecord(row);
  }

  async findAssessmentRunById(runId: string): Promise<TopicSelectionAssessTopicValueRunRecord | null> {
    const row = await this.prisma.topicSelectionAssessTopicValueRun.findUnique({
      where: { id: runId },
    });
    return row ? toRunRecord(row) : null;
  }

  async createAssessmentWithMemo(
    persistence: TopicSelectionTopicValueAssessmentPersistence,
  ): Promise<{
    assess_topic_value_run: TopicSelectionAssessTopicValueRunRecord;
    topic_value_input_snapshot: TopicSelectionTopicValueAssessmentInputSnapshotRecord;
    topic_value_assessment: TopicSelectionTopicValueAssessmentRecord;
    value_reasoning_memo: TopicSelectionValueReasoningMemoRecord;
    evidence_refs: TopicSelectionTopicValueEvidenceRefRecord[];
  }> {
    await this.prisma.$transaction(async (tx) => {
      await tx.titleCardResearchRecord.create({
        data: {
          id: persistence.topic_value_assessment.research_record_id,
          titleCardId: persistence.topic_value_assessment.title_card_id,
          recordType: 'value_assessment',
          recordStatus: 'completed',
          parentRecordId: null,
          supersededByRecordId: null,
          sourceRecordIds: toJsonValue([
            persistence.topic_value_assessment.topic_question_id,
            persistence.topic_value_assessment.topic_question_contract_id,
            persistence.topic_value_assessment.source_research_slice_id,
          ]),
          lineage: toJsonValue({
            source: 'topic_selection_v1b_value_assessment',
            topic_question_contract_id: persistence.topic_value_assessment.topic_question_contract_id,
            research_slice_id: persistence.topic_value_assessment.source_research_slice_id,
            assessment_run_id: persistence.topic_value_assessment.assess_topic_value_run_id,
          }),
          summary: persistence.topic_value_assessment.value_summary,
          confidence: new Prisma.Decimal(persistence.topic_value_assessment.confidence),
          blockingIssues: toJsonValue(persistence.topic_value_assessment.blocker_refs),
          missingInformation: toJsonValue(persistence.topic_value_assessment.risk_notes),
          nextActions: toJsonValue([]),
          evidenceRefs: toJsonValue(
            persistence.evidence_refs.map((ref) => ref.evidence_ref),
          ),
          payload: toJsonValue(persistence.topic_value_assessment),
          createdBy: persistence.assess_topic_value_run.triggered_by,
          createdAt: new Date(persistence.topic_value_assessment.created_at),
          updatedAt: new Date(persistence.topic_value_assessment.updated_at),
          deletedAt: null,
        },
      });
      await tx.titleCardValueAssessment.create({
        data: {
          id: persistence.topic_value_assessment.topic_value_assessment_id,
          titleCardId: persistence.topic_value_assessment.title_card_id,
          researchQuestionId: persistence.topic_value_assessment.topic_question_id,
          researchRecordId: persistence.topic_value_assessment.research_record_id,
          strongestClaimIfSuccess: persistence.topic_value_assessment.strongest_claim_if_success,
          fallbackClaimIfSuccess: persistence.topic_value_assessment.fallback_claim_if_success ?? null,
          hardGates: toJsonValue(toLegacyHardGates(persistence.topic_value_assessment.hard_gates)),
          scoredDimensions: toJsonValue(toLegacyScoredDimensions(persistence.topic_value_assessment.dimension_scores)),
          riskPenalty: toJsonValue(toLegacyRiskPenalty(persistence.topic_value_assessment)),
          reviewerObjections: toJsonValue(persistence.topic_value_assessment.reviewer_objections),
          ceilingCase: persistence.topic_value_assessment.ceiling_case,
          baseCase: persistence.topic_value_assessment.base_case,
          floorCase: persistence.topic_value_assessment.floor_case,
          verdict: persistence.topic_value_assessment.legacy_verdict,
          totalScore: new Prisma.Decimal(persistence.topic_value_assessment.total_score),
          v1bSourceQuestionContractId: persistence.topic_value_assessment.topic_question_contract_id,
          v1bSourceResearchSliceId: persistence.topic_value_assessment.source_research_slice_id,
          v1bSourceResearchSliceVersion: persistence.topic_value_assessment.source_research_slice_version,
          v1bAssessmentRunId: persistence.topic_value_assessment.assess_topic_value_run_id,
          v1bInputSnapshotId: persistence.topic_value_assessment.topic_value_input_snapshot_id,
          v1bReasoningMemoId: persistence.topic_value_assessment.value_reasoning_memo_id,
          v1bActiveDispositionDecisionId: null,
          v1bReadinessStatus: persistence.topic_value_assessment.readiness_status,
          v1bFreshnessStatus: persistence.topic_value_assessment.freshness_status,
          createdAt: new Date(persistence.topic_value_assessment.created_at),
          updatedAt: new Date(persistence.topic_value_assessment.updated_at),
        },
      });
      await tx.topicSelectionAssessTopicValueRun.create({
        data: this.toRunCreateInput(persistence.assess_topic_value_run),
      });
      await tx.topicSelectionTopicValueAssessmentInputSnapshot.create({
        data: this.toInputSnapshotCreateInput(persistence.topic_value_input_snapshot),
      });
      await tx.topicSelectionValueReasoningMemo.create({
        data: this.toMemoCreateInput(persistence.value_reasoning_memo),
      });
      for (const ref of persistence.evidence_refs) {
        await tx.topicSelectionTopicValueEvidenceRef.create({
          data: this.toEvidenceRefCreateInput(ref),
        });
      }
    });
    return persistence;
  }

  async findAssessmentById(
    assessmentId: string,
  ): Promise<TopicSelectionTopicValueAssessmentRecord | null> {
    const row = await this.prisma.titleCardValueAssessment.findUnique({
      where: { id: assessmentId },
      include: { researchRecord: { select: { payload: true } } },
    });
    return row ? toAssessmentRecord(row) : null;
  }

  async listAssessmentsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionTopicValueAssessmentRecord[]> {
    const rows = await this.prisma.titleCardValueAssessment.findMany({
      where: { titleCardId },
      orderBy: { updatedAt: 'desc' },
      include: { researchRecord: { select: { payload: true } } },
    });
    return rows.map(toAssessmentRecord);
  }

  async findInputSnapshotById(
    inputSnapshotId: string,
  ): Promise<TopicSelectionTopicValueAssessmentInputSnapshotRecord | null> {
    const row = await this.prisma.topicSelectionTopicValueAssessmentInputSnapshot.findUnique({
      where: { id: inputSnapshotId },
    });
    return row ? toInputSnapshotRecord(row) : null;
  }

  async findReasoningMemoById(memoId: string): Promise<TopicSelectionValueReasoningMemoRecord | null> {
    const row = await this.prisma.topicSelectionValueReasoningMemo.findUnique({
      where: { id: memoId },
    });
    return row ? toMemoRecord(row) : null;
  }

  async listEvidenceRefsByAssessmentId(
    assessmentId: string,
  ): Promise<TopicSelectionTopicValueEvidenceRefRecord[]> {
    const rows = await this.prisma.topicSelectionTopicValueEvidenceRef.findMany({
      where: { topicValueAssessmentId: assessmentId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toEvidenceRefRecord);
  }

  async createDispositionDecision(
    persistence: TopicSelectionValueDispositionDecisionPersistence,
  ): Promise<TopicSelectionValueDispositionDecisionRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.topicSelectionValueDispositionDecision.updateMany({
        where: {
          topicValueAssessmentId: persistence.decision.topic_value_assessment_id,
          isCurrent: true,
        },
        data: {
          isCurrent: false,
          status: 'superseded',
        },
      });
      const created = await tx.topicSelectionValueDispositionDecision.create({
        data: this.toDecisionCreateInput(persistence.decision),
      });
      await tx.titleCardValueAssessment.update({
        where: { id: persistence.decision.topic_value_assessment_id },
        data: {
          v1bActiveDispositionDecisionId:
            persistence.topic_value_assessment_patch.active_disposition_decision_id,
          updatedAt: new Date(persistence.topic_value_assessment_patch.updated_at),
        },
      });
      return created;
    });
    return toDecisionRecord(row);
  }

  async findDispositionDecisionById(
    decisionId: string,
  ): Promise<TopicSelectionValueDispositionDecisionRecord | null> {
    const row = await this.prisma.topicSelectionValueDispositionDecision.findUnique({
      where: { id: decisionId },
    });
    return row ? toDecisionRecord(row) : null;
  }

  async listDispositionDecisionsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionValueDispositionDecisionRecord[]> {
    const rows = await this.prisma.topicSelectionValueDispositionDecision.findMany({
      where: { titleCardId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => toDecisionRecord(row));
  }

  async patchDispositionDecisionOutputTopicPackage(
    decisionId: string,
    outputTopicPackageId: string,
  ): Promise<TopicSelectionValueDispositionDecisionRecord> {
    const row = await this.prisma.topicSelectionValueDispositionDecision.update({
      where: { id: decisionId },
      data: { outputTopicPackageId },
    });
    return toDecisionRecord(row);
  }

  private toRunCreateInput(
    record: TopicSelectionAssessTopicValueRunRecord,
  ): Prisma.TopicSelectionAssessTopicValueRunCreateInput {
    return {
      id: record.assess_topic_value_run_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      topicQuestionContractId: record.topic_question_contract_id,
      topicQuestionId: record.topic_question_id,
      researchSliceId: record.research_slice_id,
      researchSliceVersion: record.research_slice_version,
      topicValueAssessmentId: record.topic_value_assessment_id ?? null,
      valueReasoningMemoId: record.value_reasoning_memo_id ?? null,
      status: record.status,
      triggeredBy: record.triggered_by,
      topicQuestionRef: toJsonValue(record.topic_question_ref),
      topicQuestionContractRef: toJsonValue(record.topic_question_contract_ref),
      answerabilityPlanRef: toJsonValue(record.answerability_plan_ref),
      researchSliceRef: toJsonValue(record.research_slice_ref),
      selectionDecisionRef: toJsonValue(record.selection_decision_ref),
      validatedNeedRefs: toJsonValue(record.validated_need_refs),
      evidenceRefs: toJsonValue(record.evidence_refs),
      acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
      memorySuggestionRefs: toJsonValue(record.memory_suggestion_refs),
      recheckRequestRefs: toJsonValue(record.recheck_request_refs),
      workflowProfileKey: record.workflow_profile_key,
      workflowProfileVersion: record.workflow_profile_version ?? null,
      providerId: record.provider_id ?? null,
      modelId: record.model_id ?? null,
      promptTemplateId: record.prompt_template_id ?? null,
      promptTemplateVersion: record.prompt_template_version ?? null,
      topicValueInputSnapshotId: record.topic_value_input_snapshot_id ?? null,
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      gateResultId: record.gate_result_id ?? null,
      transitionAttemptId: record.transition_attempt_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      qualityFlags: record.quality_flags,
      failureReason: record.failure_reason ?? null,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }

  private toInputSnapshotCreateInput(
    record: TopicSelectionTopicValueAssessmentInputSnapshotRecord,
  ): Prisma.TopicSelectionTopicValueAssessmentInputSnapshotCreateInput {
    return {
      id: record.topic_value_input_snapshot_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      topicQuestionContractId: record.topic_question_contract_id,
      topicQuestionId: record.topic_question_id,
      researchSliceId: record.research_slice_id,
      researchSliceVersion: record.research_slice_version,
      topicQuestionRef: toJsonValue(record.topic_question_ref),
      topicQuestionContractRef: toJsonValue(record.topic_question_contract_ref),
      answerabilityPlanRef: toJsonValue(record.answerability_plan_ref),
      researchSliceRef: toJsonValue(record.research_slice_ref),
      validatedNeedRefs: toJsonValue(record.validated_need_refs),
      evidenceRefs: toJsonValue(record.evidence_refs),
      needRefs: toJsonValue(record.need_refs),
      boundaryRefs: toJsonValue(record.boundary_refs),
      assumptionRefs: toJsonValue(record.assumption_refs),
      falsificationConditions: toJsonValue(record.falsification_conditions),
      acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
      memorySuggestionRefs: toJsonValue(record.memory_suggestion_refs),
      recheckRequestRefs: toJsonValue(record.recheck_request_refs),
      questionContract: toJsonValue(record.question_contract),
      answerabilityPlan: toJsonValue(record.answerability_plan),
      researchSliceSnapshot: toJsonValue(record.research_slice_snapshot),
      snapshotHash: record.snapshot_hash,
      controlPlaneInputSnapshotId: record.control_plane_input_snapshot_id ?? null,
      createdAt: new Date(record.created_at),
    };
  }

  private toMemoCreateInput(
    record: TopicSelectionValueReasoningMemoRecord,
  ): Prisma.TopicSelectionValueReasoningMemoCreateInput {
    return {
      id: record.value_reasoning_memo_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      topicValueAssessmentId: record.topic_value_assessment_id,
      topicQuestionContractId: record.topic_question_contract_id,
      recommendation: record.recommendation,
      valueThesis: record.value_thesis,
      significance: record.significance,
      originality: record.originality,
      claimLeverage: record.claim_leverage,
      reviewerRisks: record.reviewer_risks,
      effortToValue: record.effort_to_value,
      strategicFit: record.strategic_fit,
      negativeMemoryCheck: record.negative_memory_check,
      evidenceBackedRationale: record.evidence_backed_rationale,
      topObjections: record.top_objections,
      uncertainty: record.uncertainty,
      dispositionBridge: record.disposition_bridge,
      requiresCriticReview: record.requires_critic_review,
      criticTriggers: record.critic_triggers,
      citedRefs: toJsonValue(record.cited_refs),
      createdByWorkflowRunId: record.created_by_workflow_run_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      createdAt: new Date(record.created_at),
    };
  }

  private toEvidenceRefCreateInput(
    record: TopicSelectionTopicValueEvidenceRefRecord,
  ): Prisma.TopicSelectionTopicValueEvidenceRefCreateInput {
    return {
      id: record.topic_value_evidence_ref_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      topicValueAssessmentId: record.topic_value_assessment_id,
      topicQuestionContractId: record.topic_question_contract_id,
      evidenceRef: toJsonValue(record.evidence_ref),
      evidenceRefType: record.evidence_ref.ref_type,
      evidenceRefId: record.evidence_ref.ref_id,
      evidenceRole: record.evidence_role,
      valueUse: record.value_use,
      rationale: record.rationale,
      createdAt: new Date(record.created_at),
    };
  }

  private toDecisionCreateInput(
    record: TopicSelectionValueDispositionDecisionRecord,
  ): Prisma.TopicSelectionValueDispositionDecisionCreateInput {
    return {
      id: record.value_disposition_decision_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      topicValueAssessmentId: record.topic_value_assessment_id,
      topicQuestionContractId: record.topic_question_contract_id,
      valueReasoningMemoId: record.value_reasoning_memo_id,
      decision: record.decision,
      decidedBy: record.decided_by,
      decisionRationale: record.decision_rationale,
      requiredActions: record.required_actions,
      loopbackTargetRef: jsonOrNull(record.loopback_target_ref ?? null),
      blockingContexts: toJsonValue(record.blocking_contexts),
      acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
      blockerRefs: toJsonValue(record.blocker_refs),
      packageDraftInput: jsonOrNull(record.package_draft_input ?? null),
      outputTopicPackageId: record.output_topic_package_id ?? null,
      status: record.status,
      isCurrent: record.is_current,
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      gateResultId: record.gate_result_id ?? null,
      transitionAttemptId: record.transition_attempt_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      createdAt: new Date(record.created_at),
    };
  }
}
