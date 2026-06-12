import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  TopicSelectionActorRef,
  TopicSelectionFunctionalRef,
  TopicSelectionGateIssue,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type { TopicSelectionEvidenceRoleBundle } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionCandidateDecisionMemorySuggestionRecord,
  TopicSelectionNeedCandidateReadinessAssessmentRecord,
  TopicSelectionNeedCandidateRecord,
  TopicSelectionV1aToV1bInputBundleRecord,
  TopicSelectionValidateNeedAdjudicationResultRecord,
  TopicSelectionValidatedNeedRecord,
  TopicSelectionValidationDecisionSupportPacketRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionNeedCandidateStatusPatch,
  TopicSelectionNeedValidationAdjudicationWriteInput,
  TopicSelectionNeedValidationAdjudicationWriteResult,
  TopicSelectionNeedValidationHumanConfirmationWriteInput,
  TopicSelectionNeedValidationHumanConfirmationWriteResult,
  TopicSelectionNeedValidationRepository,
} from '../topic-selection-need-validation.repository.js';

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
  return value === null || value === undefined ? null : asFunctionalRef(value);
}

function jsonOrNull(value: unknown | null | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null || value === undefined ? Prisma.JsonNull : toJsonValue(value);
}

type NeedCandidateRow = {
  id: string;
  workspaceId: string | null;
  titleCardId: string;
  evidenceMapId: string;
  candidateVersion: string;
  lifecycleStatus: string;
  decisionStatus: string;
  reviewStatus: string;
  freshnessStatus: string;
  candidateNeed: string;
  unmetNeedStatement: string;
  mechanismType: string;
  mechanismSummary: string | null;
  mechanismPayload: Prisma.JsonValue;
  scopeNotes: string | null;
  nonGoalNotes: string | null;
  priorArtStatus: string;
  evidenceMapRef: Prisma.JsonValue;
  searchRunRef: Prisma.JsonValue;
  searchPlanRef: Prisma.JsonValue;
  literatureSnapshotRef: Prisma.JsonValue;
  evidenceRoleBundle: Prisma.JsonValue;
  conflictRefs: Prisma.JsonValue;
  strengthAssessmentRefs: Prisma.JsonValue;
  openRecheckRequestRefs: Prisma.JsonValue;
  unresolvedChallengeRefs: Prisma.JsonValue;
  acceptedRiskRefs: Prisma.JsonValue;
  gapCodes: string[];
  speculative: boolean;
  confidence: number | null;
  inputSnapshotId: string | null;
  workflowRunId: string | null;
  gateResultId: string | null;
  transitionAttemptId: string | null;
  traceSnapshotId: string | null;
  artifactRefs: Prisma.JsonValue;
  resultAdjudicationId: string | null;
  resultValidatedNeedId: string | null;
  mergedIntoNeedCandidateRef: Prisma.JsonValue | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

type ReadinessRow = {
  id: string;
  workspaceId: string | null;
  titleCardId: string;
  needCandidateId: string;
  evidenceMapId: string;
  recommendation: string;
  blockers: Prisma.JsonValue;
  warnings: Prisma.JsonValue;
  requiredActions: string[];
  strengthAssessmentRef: Prisma.JsonValue | null;
  evidenceMapRef: Prisma.JsonValue;
  searchRunRef: Prisma.JsonValue;
  searchPlanRef: Prisma.JsonValue;
  literatureSnapshotRef: Prisma.JsonValue;
  supportUnitRefs: Prisma.JsonValue;
  challengeUnitRefs: Prisma.JsonValue;
  baselineUnitRefs: Prisma.JsonValue;
  contextUnitRefs: Prisma.JsonValue;
  conflictRefs: Prisma.JsonValue;
  openRecheckRequestRefs: Prisma.JsonValue;
  acceptedRiskRefs: Prisma.JsonValue;
  gapCodes: string[];
  supportCount: number;
  challengeCount: number;
  abstractOnlySupportCount: number;
  strongUnresolvedChallengeCount: number;
  inputSnapshotId: string | null;
  workflowRunId: string | null;
  gateResultId: string | null;
  transitionAttemptId: string | null;
  policyVersionId: string | null;
  assessedBy: string;
  createdAt: Date;
};

type SupportPacketRow = {
  id: string;
  workspaceId: string | null;
  titleCardId: string;
  needCandidateId: string;
  evidenceMapId: string;
  readinessAssessmentId: string | null;
  packetStatus: string;
  evidenceMapRef: Prisma.JsonValue;
  searchRunRef: Prisma.JsonValue;
  searchPlanRef: Prisma.JsonValue;
  literatureSnapshotRef: Prisma.JsonValue;
  needCandidateRef: Prisma.JsonValue;
  readinessAssessmentRef: Prisma.JsonValue | null;
  evidenceRoleBundle: Prisma.JsonValue;
  conflictRefs: Prisma.JsonValue;
  strengthAssessmentRefs: Prisma.JsonValue;
  coverageRefs: Prisma.JsonValue;
  residualRiskRefs: Prisma.JsonValue;
  openGapCodes: string[];
  requiredHumanChecks: string[];
  priorArtStatus: string;
  alreadySolvedReview: Prisma.JsonValue;
  packetPayload: Prisma.JsonValue;
  inputSnapshotId: string | null;
  workflowRunId: string | null;
  gateResultId: string | null;
  transitionAttemptId: string | null;
  traceSnapshotId: string | null;
  artifactRefs: Prisma.JsonValue;
  createdBy: string;
  createdAt: Date;
};

type AdjudicationRow = {
  id: string;
  workspaceId: string | null;
  titleCardId: string;
  needCandidateId: string;
  supportPacketId: string;
  finalDecision: string;
  outputValidatedNeedId: string | null;
  humanDecisionId: string | null;
  loopbackTarget: string;
  rejectedReason: string | null;
  mergeTargetNeedCandidateRef: Prisma.JsonValue | null;
  outputSearchplanRecheckRequestRef: Prisma.JsonValue | null;
  outputMemorySuggestionRef: Prisma.JsonValue | null;
  rationale: string;
  requiredActions: string[];
  acceptedRiskRefs: Prisma.JsonValue;
  residualRiskRefs: Prisma.JsonValue;
  gapCodes: string[];
  decisionPayload: Prisma.JsonValue;
  inputSnapshotId: string | null;
  workflowRunId: string | null;
  gateResultId: string | null;
  transitionAttemptId: string | null;
  traceSnapshotId: string | null;
  artifactRefs: Prisma.JsonValue;
  adjudicatedBy: Prisma.JsonValue;
  createdAt: Date;
};

type ValidatedNeedRow = {
  id: string;
  workspaceId: string | null;
  titleCardId: string;
  sourceNeedCandidateId: string;
  adjudicationResultId: string;
  supportPacketId: string;
  humanDecisionId: string;
  validatedNeedStatement: string;
  mechanismType: string;
  mechanismSummary: string | null;
  mechanismPayload: Prisma.JsonValue;
  scopeNotes: string | null;
  nonGoalNotes: string | null;
  priorArtStatus: string;
  evidenceMapRef: Prisma.JsonValue;
  searchRunRef: Prisma.JsonValue;
  searchPlanRef: Prisma.JsonValue;
  literatureSnapshotRef: Prisma.JsonValue;
  supportPacketRef: Prisma.JsonValue;
  adjudicationResultRef: Prisma.JsonValue;
  humanDecisionRef: Prisma.JsonValue;
  evidenceRoleBundle: Prisma.JsonValue;
  strengthAssessmentRefs: Prisma.JsonValue;
  conflictRefs: Prisma.JsonValue;
  residualRiskRefs: Prisma.JsonValue;
  acceptedRiskRefs: Prisma.JsonValue;
  traceRefs: Prisma.JsonValue;
  createdBy: string;
  createdAt: Date;
};

type MemorySuggestionRow = {
  id: string;
  workspaceId: string | null;
  titleCardId: string;
  sourceNeedCandidateId: string;
  adjudicationResultId: string | null;
  suggestionType: string;
  status: string;
  targetRef: Prisma.JsonValue;
  suggestionPayload: Prisma.JsonValue;
  rationale: string;
  policyVersionId: string | null;
  createdBy: string;
  createdAt: Date;
};

type V1bBundleRow = {
  id: string;
  workspaceId: string | null;
  titleCardId: string;
  validatedNeedId: string;
  sourceNeedCandidateId: string;
  adjudicationResultId: string;
  supportPacketId: string;
  bundleVersion: string;
  validatedNeedRef: Prisma.JsonValue;
  sourceNeedCandidateRef: Prisma.JsonValue;
  adjudicationResultRef: Prisma.JsonValue;
  supportPacketRef: Prisma.JsonValue;
  humanDecisionRef: Prisma.JsonValue;
  evidenceMapRef: Prisma.JsonValue;
  searchRunRef: Prisma.JsonValue;
  searchPlanRef: Prisma.JsonValue;
  literatureSnapshotRef: Prisma.JsonValue;
  evidenceRoleBundle: Prisma.JsonValue;
  traceRefs: Prisma.JsonValue;
  riskRefs: Prisma.JsonValue;
  gapCodes: string[];
  memorySuggestionRefs: Prisma.JsonValue;
  recheckRequestRefs: Prisma.JsonValue;
  handoffPayload: Prisma.JsonValue;
  createdBy: string;
  createdAt: Date;
};

function toNeedCandidateRecord(row: NeedCandidateRow): TopicSelectionNeedCandidateRecord {
  return {
    need_candidate_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    evidence_map_id: row.evidenceMapId,
    candidate_version: row.candidateVersion,
    lifecycle_status: row.lifecycleStatus as TopicSelectionNeedCandidateRecord['lifecycle_status'],
    decision_status: row.decisionStatus as TopicSelectionNeedCandidateRecord['decision_status'],
    review_status: row.reviewStatus as TopicSelectionNeedCandidateRecord['review_status'],
    freshness_status: row.freshnessStatus as TopicSelectionNeedCandidateRecord['freshness_status'],
    candidate_need: row.candidateNeed,
    unmet_need_statement: row.unmetNeedStatement,
    mechanism_type: row.mechanismType as TopicSelectionNeedCandidateRecord['mechanism_type'],
    mechanism_summary: row.mechanismSummary,
    mechanism_payload: asRecord(row.mechanismPayload),
    scope_notes: row.scopeNotes,
    non_goal_notes: row.nonGoalNotes,
    prior_art_status: row.priorArtStatus as TopicSelectionNeedCandidateRecord['prior_art_status'],
    evidence_map_ref: asFunctionalRef(row.evidenceMapRef),
    search_run_ref: asFunctionalRef(row.searchRunRef),
    search_plan_ref: asFunctionalRef(row.searchPlanRef),
    literature_snapshot_ref: asFunctionalRef(row.literatureSnapshotRef),
    evidence_role_bundle: asRecord(row.evidenceRoleBundle) as unknown as TopicSelectionEvidenceRoleBundle,
    conflict_refs: asArray<TopicSelectionFunctionalRef>(row.conflictRefs),
    strength_assessment_refs: asArray<TopicSelectionFunctionalRef>(row.strengthAssessmentRefs),
    open_recheck_request_refs: asArray<TopicSelectionFunctionalRef>(row.openRecheckRequestRefs),
    unresolved_challenge_refs: asArray<TopicSelectionFunctionalRef>(row.unresolvedChallengeRefs),
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    gap_codes: row.gapCodes,
    speculative: row.speculative,
    confidence: row.confidence,
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    trace_snapshot_id: row.traceSnapshotId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    result_adjudication_id: row.resultAdjudicationId,
    result_validated_need_id: row.resultValidatedNeedId,
    merged_into_need_candidate_ref: asNullableFunctionalRef(row.mergedIntoNeedCandidateRef),
    created_by: row.createdBy as TopicSelectionNeedCandidateRecord['created_by'],
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toReadinessRecord(row: ReadinessRow): TopicSelectionNeedCandidateReadinessAssessmentRecord {
  return {
    readiness_assessment_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    need_candidate_id: row.needCandidateId,
    evidence_map_id: row.evidenceMapId,
    recommendation: row.recommendation as TopicSelectionNeedCandidateReadinessAssessmentRecord['recommendation'],
    blockers: asArray<TopicSelectionGateIssue>(row.blockers),
    warnings: asArray<TopicSelectionGateIssue>(row.warnings),
    required_actions: row.requiredActions,
    strength_assessment_ref: asNullableFunctionalRef(row.strengthAssessmentRef),
    evidence_map_ref: asFunctionalRef(row.evidenceMapRef),
    search_run_ref: asFunctionalRef(row.searchRunRef),
    search_plan_ref: asFunctionalRef(row.searchPlanRef),
    literature_snapshot_ref: asFunctionalRef(row.literatureSnapshotRef),
    support_unit_refs: asArray<TopicSelectionFunctionalRef>(row.supportUnitRefs),
    challenge_unit_refs: asArray<TopicSelectionFunctionalRef>(row.challengeUnitRefs),
    baseline_unit_refs: asArray<TopicSelectionFunctionalRef>(row.baselineUnitRefs),
    context_unit_refs: asArray<TopicSelectionFunctionalRef>(row.contextUnitRefs),
    conflict_refs: asArray<TopicSelectionFunctionalRef>(row.conflictRefs),
    open_recheck_request_refs: asArray<TopicSelectionFunctionalRef>(row.openRecheckRequestRefs),
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    gap_codes: row.gapCodes,
    support_count: row.supportCount,
    challenge_count: row.challengeCount,
    abstract_only_support_count: row.abstractOnlySupportCount,
    strong_unresolved_challenge_count: row.strongUnresolvedChallengeCount,
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    policy_version_id: row.policyVersionId,
    assessed_by: row.assessedBy as TopicSelectionNeedCandidateReadinessAssessmentRecord['assessed_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toSupportPacketRecord(row: SupportPacketRow): TopicSelectionValidationDecisionSupportPacketRecord {
  return {
    validation_support_packet_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    need_candidate_id: row.needCandidateId,
    evidence_map_id: row.evidenceMapId,
    readiness_assessment_id: row.readinessAssessmentId,
    packet_status: row.packetStatus as TopicSelectionValidationDecisionSupportPacketRecord['packet_status'],
    evidence_map_ref: asFunctionalRef(row.evidenceMapRef),
    search_run_ref: asFunctionalRef(row.searchRunRef),
    search_plan_ref: asFunctionalRef(row.searchPlanRef),
    literature_snapshot_ref: asFunctionalRef(row.literatureSnapshotRef),
    need_candidate_ref: asFunctionalRef(row.needCandidateRef),
    readiness_assessment_ref: asNullableFunctionalRef(row.readinessAssessmentRef),
    evidence_role_bundle: asRecord(row.evidenceRoleBundle) as unknown as TopicSelectionEvidenceRoleBundle,
    conflict_refs: asArray<TopicSelectionFunctionalRef>(row.conflictRefs),
    strength_assessment_refs: asArray<TopicSelectionFunctionalRef>(row.strengthAssessmentRefs),
    coverage_refs: asArray<TopicSelectionFunctionalRef>(row.coverageRefs),
    residual_risk_refs: asArray<TopicSelectionFunctionalRef>(row.residualRiskRefs),
    open_gap_codes: row.openGapCodes,
    required_human_checks: row.requiredHumanChecks,
    prior_art_status: row.priorArtStatus as TopicSelectionValidationDecisionSupportPacketRecord['prior_art_status'],
    already_solved_review: asRecord(row.alreadySolvedReview),
    packet_payload: asRecord(row.packetPayload),
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    trace_snapshot_id: row.traceSnapshotId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    created_by: row.createdBy as TopicSelectionValidationDecisionSupportPacketRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toAdjudicationRecord(row: AdjudicationRow): TopicSelectionValidateNeedAdjudicationResultRecord {
  return {
    adjudication_result_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    need_candidate_id: row.needCandidateId,
    support_packet_id: row.supportPacketId,
    final_decision: row.finalDecision as TopicSelectionValidateNeedAdjudicationResultRecord['final_decision'],
    output_validated_need_id: row.outputValidatedNeedId,
    human_decision_id: row.humanDecisionId,
    loopback_target: row.loopbackTarget as TopicSelectionValidateNeedAdjudicationResultRecord['loopback_target'],
    rejected_reason: row.rejectedReason as TopicSelectionValidateNeedAdjudicationResultRecord['rejected_reason'],
    merge_target_need_candidate_ref: asNullableFunctionalRef(row.mergeTargetNeedCandidateRef),
    output_searchplan_recheck_request_ref: asNullableFunctionalRef(row.outputSearchplanRecheckRequestRef),
    output_memory_suggestion_ref: asNullableFunctionalRef(row.outputMemorySuggestionRef),
    rationale: row.rationale,
    required_actions: row.requiredActions,
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    residual_risk_refs: asArray<TopicSelectionFunctionalRef>(row.residualRiskRefs),
    gap_codes: row.gapCodes,
    decision_payload: asRecord(row.decisionPayload),
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    trace_snapshot_id: row.traceSnapshotId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    adjudicated_by: asRecord(row.adjudicatedBy) as unknown as TopicSelectionActorRef,
    created_at: row.createdAt.toISOString(),
  };
}

function toValidatedNeedRecord(row: ValidatedNeedRow): TopicSelectionValidatedNeedRecord {
  return {
    validated_need_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    source_need_candidate_id: row.sourceNeedCandidateId,
    adjudication_result_id: row.adjudicationResultId,
    support_packet_id: row.supportPacketId,
    human_decision_id: row.humanDecisionId,
    validated_need_statement: row.validatedNeedStatement,
    mechanism_type: row.mechanismType as TopicSelectionValidatedNeedRecord['mechanism_type'],
    mechanism_summary: row.mechanismSummary,
    mechanism_payload: asRecord(row.mechanismPayload),
    scope_notes: row.scopeNotes,
    non_goal_notes: row.nonGoalNotes,
    prior_art_status: row.priorArtStatus as TopicSelectionValidatedNeedRecord['prior_art_status'],
    evidence_map_ref: asFunctionalRef(row.evidenceMapRef),
    search_run_ref: asFunctionalRef(row.searchRunRef),
    search_plan_ref: asFunctionalRef(row.searchPlanRef),
    literature_snapshot_ref: asFunctionalRef(row.literatureSnapshotRef),
    support_packet_ref: asFunctionalRef(row.supportPacketRef),
    adjudication_result_ref: asFunctionalRef(row.adjudicationResultRef),
    human_decision_ref: asFunctionalRef(row.humanDecisionRef),
    evidence_role_bundle: asRecord(row.evidenceRoleBundle) as unknown as TopicSelectionEvidenceRoleBundle,
    strength_assessment_refs: asArray<TopicSelectionFunctionalRef>(row.strengthAssessmentRefs),
    conflict_refs: asArray<TopicSelectionFunctionalRef>(row.conflictRefs),
    residual_risk_refs: asArray<TopicSelectionFunctionalRef>(row.residualRiskRefs),
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    trace_refs: asArray<TopicSelectionFunctionalRef>(row.traceRefs),
    created_by: row.createdBy as TopicSelectionValidatedNeedRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toMemorySuggestionRecord(row: MemorySuggestionRow): TopicSelectionCandidateDecisionMemorySuggestionRecord {
  return {
    memory_suggestion_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    source_need_candidate_id: row.sourceNeedCandidateId,
    adjudication_result_id: row.adjudicationResultId,
    suggestion_type: row.suggestionType as TopicSelectionCandidateDecisionMemorySuggestionRecord['suggestion_type'],
    status: row.status as TopicSelectionCandidateDecisionMemorySuggestionRecord['status'],
    target_ref: asFunctionalRef(row.targetRef),
    suggestion_payload: asRecord(row.suggestionPayload),
    rationale: row.rationale,
    policy_version_id: row.policyVersionId,
    created_by: row.createdBy as TopicSelectionCandidateDecisionMemorySuggestionRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toV1bBundleRecord(row: V1bBundleRow): TopicSelectionV1aToV1bInputBundleRecord {
  return {
    v1b_input_bundle_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    validated_need_id: row.validatedNeedId,
    source_need_candidate_id: row.sourceNeedCandidateId,
    adjudication_result_id: row.adjudicationResultId,
    support_packet_id: row.supportPacketId,
    bundle_version: row.bundleVersion,
    validated_need_ref: asFunctionalRef(row.validatedNeedRef),
    source_need_candidate_ref: asFunctionalRef(row.sourceNeedCandidateRef),
    adjudication_result_ref: asFunctionalRef(row.adjudicationResultRef),
    support_packet_ref: asFunctionalRef(row.supportPacketRef),
    human_decision_ref: asFunctionalRef(row.humanDecisionRef),
    evidence_map_ref: asFunctionalRef(row.evidenceMapRef),
    search_run_ref: asFunctionalRef(row.searchRunRef),
    search_plan_ref: asFunctionalRef(row.searchPlanRef),
    literature_snapshot_ref: asFunctionalRef(row.literatureSnapshotRef),
    evidence_role_bundle: asRecord(row.evidenceRoleBundle) as unknown as TopicSelectionEvidenceRoleBundle,
    trace_refs: asArray<TopicSelectionFunctionalRef>(row.traceRefs),
    risk_refs: asArray<TopicSelectionFunctionalRef>(row.riskRefs),
    gap_codes: row.gapCodes,
    memory_suggestion_refs: asArray<TopicSelectionFunctionalRef>(row.memorySuggestionRefs),
    recheck_request_refs: asArray<TopicSelectionFunctionalRef>(row.recheckRequestRefs),
    handoff_payload: asRecord(row.handoffPayload),
    created_by: row.createdBy as TopicSelectionV1aToV1bInputBundleRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

export class PrismaTopicSelectionNeedValidationRepository implements TopicSelectionNeedValidationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createNeedCandidate(record: TopicSelectionNeedCandidateRecord): Promise<TopicSelectionNeedCandidateRecord> {
    const row = await this.prisma.topicSelectionNeedCandidate.create({
      data: this.toNeedCandidateCreateInput(record),
    });
    return toNeedCandidateRecord(row);
  }

  async createNeedCandidatesBatch(
    records: TopicSelectionNeedCandidateRecord[],
  ): Promise<TopicSelectionNeedCandidateRecord[]> {
    if (records.length === 0) {
      return [];
    }
    const rows = await this.prisma.$transaction((tx) =>
      Promise.all(records.map((record) =>
        tx.topicSelectionNeedCandidate.create({
          data: this.toNeedCandidateCreateInput(record),
        }),
      )),
    );
    return rows.map(toNeedCandidateRecord);
  }

  async findNeedCandidateById(needCandidateId: string): Promise<TopicSelectionNeedCandidateRecord | null> {
    const row = await this.prisma.topicSelectionNeedCandidate.findUnique({ where: { id: needCandidateId } });
    return row ? toNeedCandidateRecord(row) : null;
  }

  async listNeedCandidatesByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionNeedCandidateRecord[]> {
    const rows = await this.prisma.topicSelectionNeedCandidate.findMany({
      where: { titleCardId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toNeedCandidateRecord);
  }

  async updateNeedCandidateStatus(
    needCandidateId: string,
    patch: TopicSelectionNeedCandidateStatusPatch,
  ): Promise<TopicSelectionNeedCandidateRecord> {
    const row = await this.prisma.topicSelectionNeedCandidate.update({
      where: { id: needCandidateId },
      data: this.toCandidatePatchInput(patch),
    });
    return toNeedCandidateRecord(row);
  }

  async createReadinessAssessment(
    record: TopicSelectionNeedCandidateReadinessAssessmentRecord,
  ): Promise<TopicSelectionNeedCandidateReadinessAssessmentRecord> {
    const row = await this.prisma.topicSelectionNeedCandidateReadinessAssessment.create({
      data: this.toReadinessCreateInput(record),
    });
    return toReadinessRecord(row);
  }

  async findReadinessAssessmentById(
    readinessAssessmentId: string,
  ): Promise<TopicSelectionNeedCandidateReadinessAssessmentRecord | null> {
    const row = await this.prisma.topicSelectionNeedCandidateReadinessAssessment.findUnique({
      where: { id: readinessAssessmentId },
    });
    return row ? toReadinessRecord(row) : null;
  }

  async listReadinessAssessmentsByNeedCandidateId(
    needCandidateId: string,
  ): Promise<TopicSelectionNeedCandidateReadinessAssessmentRecord[]> {
    const rows = await this.prisma.topicSelectionNeedCandidateReadinessAssessment.findMany({
      where: { needCandidateId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toReadinessRecord);
  }

  async createValidationDecisionSupportPacket(
    record: TopicSelectionValidationDecisionSupportPacketRecord,
  ): Promise<TopicSelectionValidationDecisionSupportPacketRecord> {
    const row = await this.prisma.topicSelectionValidationDecisionSupportPacket.create({
      data: this.toSupportPacketCreateInput(record),
    });
    return toSupportPacketRecord(row);
  }

  async findValidationDecisionSupportPacketById(
    supportPacketId: string,
  ): Promise<TopicSelectionValidationDecisionSupportPacketRecord | null> {
    const row = await this.prisma.topicSelectionValidationDecisionSupportPacket.findUnique({
      where: { id: supportPacketId },
    });
    return row ? toSupportPacketRecord(row) : null;
  }

  async listValidationDecisionSupportPacketsByNeedCandidateId(
    needCandidateId: string,
  ): Promise<TopicSelectionValidationDecisionSupportPacketRecord[]> {
    const rows = await this.prisma.topicSelectionValidationDecisionSupportPacket.findMany({
      where: { needCandidateId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toSupportPacketRecord);
  }

  async adjudicateWithSideEffects(
    input: TopicSelectionNeedValidationAdjudicationWriteInput,
  ): Promise<TopicSelectionNeedValidationAdjudicationWriteResult> {
    return this.prisma.$transaction(async (tx) => {
      const adjudication = await tx.topicSelectionValidateNeedAdjudicationResult.create({
        data: this.toAdjudicationCreateInput(input.adjudication_result),
      });
      const candidate = await tx.topicSelectionNeedCandidate.update({
        where: { id: input.adjudication_result.need_candidate_id },
        data: this.toCandidatePatchInput(input.candidate_patch),
      });
      const validatedNeed = input.validated_need
        ? await tx.topicSelectionValidatedNeed.create({
            data: this.toValidatedNeedCreateInput(input.validated_need),
          })
        : null;
      const memorySuggestion = input.memory_suggestion
        ? await tx.topicSelectionCandidateDecisionMemorySuggestion.create({
            data: this.toMemorySuggestionCreateInput(input.memory_suggestion),
          })
        : null;
      const v1bInputBundle = input.v1b_input_bundle
        ? await tx.topicSelectionV1aToV1bInputBundle.create({
            data: this.toV1bBundleCreateInput(input.v1b_input_bundle),
          })
        : null;
      return {
        adjudication_result: toAdjudicationRecord(adjudication),
        need_candidate: toNeedCandidateRecord(candidate),
        validated_need: validatedNeed ? toValidatedNeedRecord(validatedNeed) : null,
        memory_suggestion: memorySuggestion ? toMemorySuggestionRecord(memorySuggestion) : null,
        v1b_input_bundle: v1bInputBundle ? toV1bBundleRecord(v1bInputBundle) : null,
      };
    });
  }

  async findAdjudicationResultById(
    adjudicationResultId: string,
  ): Promise<TopicSelectionValidateNeedAdjudicationResultRecord | null> {
    const row = await this.prisma.topicSelectionValidateNeedAdjudicationResult.findUnique({
      where: { id: adjudicationResultId },
    });
    return row ? toAdjudicationRecord(row) : null;
  }

  async listAdjudicationResultsByNeedCandidateId(
    needCandidateId: string,
  ): Promise<TopicSelectionValidateNeedAdjudicationResultRecord[]> {
    const rows = await this.prisma.topicSelectionValidateNeedAdjudicationResult.findMany({
      where: { needCandidateId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toAdjudicationRecord);
  }

  async listAdjudicationResultsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionValidateNeedAdjudicationResultRecord[]> {
    const rows = await this.prisma.topicSelectionValidateNeedAdjudicationResult.findMany({
      where: { titleCardId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toAdjudicationRecord);
  }

  async findValidatedNeedById(validatedNeedId: string): Promise<TopicSelectionValidatedNeedRecord | null> {
    const row = await this.prisma.topicSelectionValidatedNeed.findUnique({ where: { id: validatedNeedId } });
    return row ? toValidatedNeedRecord(row) : null;
  }

  async confirmValidatedNeed(
    input: TopicSelectionNeedValidationHumanConfirmationWriteInput,
  ): Promise<TopicSelectionNeedValidationHumanConfirmationWriteResult> {
    return this.prisma.$transaction(async (tx) => {
      const validatedNeed = await tx.topicSelectionValidatedNeed.create({
        data: this.toValidatedNeedCreateInput(input.validated_need),
      });
      const candidate = await tx.topicSelectionNeedCandidate.update({
        where: { id: input.validated_need.source_need_candidate_id },
        data: this.toCandidatePatchInput(input.candidate_patch),
      });
      return {
        validated_need: toValidatedNeedRecord(validatedNeed),
        need_candidate: toNeedCandidateRecord(candidate),
      };
    });
  }

  async listValidatedNeedsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionValidatedNeedRecord[]> {
    const rows = await this.prisma.topicSelectionValidatedNeed.findMany({
      where: { titleCardId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toValidatedNeedRecord);
  }

  async createV1aToV1bInputBundle(
    record: TopicSelectionV1aToV1bInputBundleRecord,
  ): Promise<TopicSelectionV1aToV1bInputBundleRecord> {
    const row = await this.prisma.topicSelectionV1aToV1bInputBundle.create({
      data: this.toV1bBundleCreateInput(record),
    });
    return toV1bBundleRecord(row);
  }

  async findV1aToV1bInputBundleById(
    bundleId: string,
  ): Promise<TopicSelectionV1aToV1bInputBundleRecord | null> {
    const row = await this.prisma.topicSelectionV1aToV1bInputBundle.findUnique({ where: { id: bundleId } });
    return row ? toV1bBundleRecord(row) : null;
  }

  async listV1aToV1bInputBundlesByValidatedNeedId(
    validatedNeedId: string,
  ): Promise<TopicSelectionV1aToV1bInputBundleRecord[]> {
    const rows = await this.prisma.topicSelectionV1aToV1bInputBundle.findMany({
      where: { validatedNeedId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toV1bBundleRecord);
  }

  async createCandidateDecisionMemorySuggestion(
    record: TopicSelectionCandidateDecisionMemorySuggestionRecord,
  ): Promise<TopicSelectionCandidateDecisionMemorySuggestionRecord> {
    const row = await this.prisma.topicSelectionCandidateDecisionMemorySuggestion.create({
      data: this.toMemorySuggestionCreateInput(record),
    });
    return toMemorySuggestionRecord(row);
  }

  async findCandidateDecisionMemorySuggestionById(
    memorySuggestionId: string,
  ): Promise<TopicSelectionCandidateDecisionMemorySuggestionRecord | null> {
    const row = await this.prisma.topicSelectionCandidateDecisionMemorySuggestion.findUnique({
      where: { id: memorySuggestionId },
    });
    return row ? toMemorySuggestionRecord(row) : null;
  }

  async listCandidateDecisionMemorySuggestionsByNeedCandidateId(
    needCandidateId: string,
  ): Promise<TopicSelectionCandidateDecisionMemorySuggestionRecord[]> {
    const rows = await this.prisma.topicSelectionCandidateDecisionMemorySuggestion.findMany({
      where: { sourceNeedCandidateId: needCandidateId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toMemorySuggestionRecord);
  }

  private toNeedCandidateCreateInput(record: TopicSelectionNeedCandidateRecord): Prisma.TopicSelectionNeedCandidateCreateInput {
    return {
      id: record.need_candidate_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      evidenceMapId: record.evidence_map_id,
      candidateVersion: record.candidate_version,
      lifecycleStatus: record.lifecycle_status,
      decisionStatus: record.decision_status,
      reviewStatus: record.review_status,
      freshnessStatus: record.freshness_status,
      candidateNeed: record.candidate_need,
      unmetNeedStatement: record.unmet_need_statement,
      mechanismType: record.mechanism_type,
      mechanismSummary: record.mechanism_summary ?? null,
      mechanismPayload: toJsonValue(record.mechanism_payload),
      scopeNotes: record.scope_notes ?? null,
      nonGoalNotes: record.non_goal_notes ?? null,
      priorArtStatus: record.prior_art_status,
      evidenceMapRef: toJsonValue(record.evidence_map_ref),
      searchRunId: record.search_run_ref.ref_id,
      searchPlanId: record.search_plan_ref.ref_id,
      literatureSnapshotId: record.literature_snapshot_ref.ref_id,
      searchRunRef: toJsonValue(record.search_run_ref),
      searchPlanRef: toJsonValue(record.search_plan_ref),
      literatureSnapshotRef: toJsonValue(record.literature_snapshot_ref),
      evidenceRoleBundle: toJsonValue(record.evidence_role_bundle),
      conflictRefs: toJsonValue(record.conflict_refs),
      strengthAssessmentRefs: toJsonValue(record.strength_assessment_refs),
      openRecheckRequestRefs: toJsonValue(record.open_recheck_request_refs),
      unresolvedChallengeRefs: toJsonValue(record.unresolved_challenge_refs),
      acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
      gapCodes: record.gap_codes,
      speculative: record.speculative,
      confidence: record.confidence ?? null,
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      gateResultId: record.gate_result_id ?? null,
      transitionAttemptId: record.transition_attempt_id ?? null,
      traceSnapshotId: record.trace_snapshot_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      resultAdjudicationId: record.result_adjudication_id ?? null,
      resultValidatedNeedId: record.result_validated_need_id ?? null,
      mergedIntoNeedCandidateId: record.merged_into_need_candidate_ref?.ref_id ?? null,
      mergedIntoNeedCandidateRef: record.merged_into_need_candidate_ref
        ? toJsonValue(record.merged_into_need_candidate_ref)
        : Prisma.JsonNull,
      createdBy: record.created_by,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }

  private toCandidatePatchInput(
    patch: TopicSelectionNeedCandidateStatusPatch,
  ): Prisma.TopicSelectionNeedCandidateUpdateInput {
    return {
      lifecycleStatus: patch.lifecycle_status,
      decisionStatus: patch.decision_status,
      reviewStatus: patch.review_status,
      freshnessStatus: patch.freshness_status,
      resultAdjudicationId: patch.result_adjudication_id,
      resultValidatedNeedId: patch.result_validated_need_id,
      mergedIntoNeedCandidateId: patch.merged_into_need_candidate_ref === undefined
        ? undefined
        : patch.merged_into_need_candidate_ref?.ref_id ?? null,
      mergedIntoNeedCandidateRef: patch.merged_into_need_candidate_ref === undefined
        ? undefined
        : jsonOrNull(patch.merged_into_need_candidate_ref),
      openRecheckRequestRefs: patch.open_recheck_request_refs === undefined
        ? undefined
        : toJsonValue(patch.open_recheck_request_refs),
      gapCodes: patch.gap_codes,
      updatedAt: new Date(patch.updated_at),
    };
  }

  private toReadinessCreateInput(
    record: TopicSelectionNeedCandidateReadinessAssessmentRecord,
  ): Prisma.TopicSelectionNeedCandidateReadinessAssessmentCreateInput {
    return {
      id: record.readiness_assessment_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      needCandidateId: record.need_candidate_id,
      evidenceMapId: record.evidence_map_id,
      recommendation: record.recommendation,
      blockers: toJsonValue(record.blockers),
      warnings: toJsonValue(record.warnings),
      requiredActions: record.required_actions,
      strengthAssessmentId: record.strength_assessment_ref?.ref_id ?? null,
      strengthAssessmentRef: jsonOrNull(record.strength_assessment_ref ?? null),
      evidenceMapRef: toJsonValue(record.evidence_map_ref),
      searchRunId: record.search_run_ref.ref_id,
      searchPlanId: record.search_plan_ref.ref_id,
      literatureSnapshotId: record.literature_snapshot_ref.ref_id,
      searchRunRef: toJsonValue(record.search_run_ref),
      searchPlanRef: toJsonValue(record.search_plan_ref),
      literatureSnapshotRef: toJsonValue(record.literature_snapshot_ref),
      supportUnitRefs: toJsonValue(record.support_unit_refs),
      challengeUnitRefs: toJsonValue(record.challenge_unit_refs),
      baselineUnitRefs: toJsonValue(record.baseline_unit_refs),
      contextUnitRefs: toJsonValue(record.context_unit_refs),
      conflictRefs: toJsonValue(record.conflict_refs),
      openRecheckRequestRefs: toJsonValue(record.open_recheck_request_refs),
      acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
      gapCodes: record.gap_codes,
      supportCount: record.support_count,
      challengeCount: record.challenge_count,
      abstractOnlySupportCount: record.abstract_only_support_count,
      strongUnresolvedChallengeCount: record.strong_unresolved_challenge_count,
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      gateResultId: record.gate_result_id ?? null,
      transitionAttemptId: record.transition_attempt_id ?? null,
      policyVersionId: record.policy_version_id ?? null,
      assessedBy: record.assessed_by,
      createdAt: new Date(record.created_at),
    };
  }

  private toSupportPacketCreateInput(
    record: TopicSelectionValidationDecisionSupportPacketRecord,
  ): Prisma.TopicSelectionValidationDecisionSupportPacketCreateInput {
    return {
      id: record.validation_support_packet_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      needCandidateId: record.need_candidate_id,
      evidenceMapId: record.evidence_map_id,
      readinessAssessmentId: record.readiness_assessment_id ?? null,
      packetStatus: record.packet_status,
      evidenceMapRef: toJsonValue(record.evidence_map_ref),
      searchRunId: record.search_run_ref.ref_id,
      searchPlanId: record.search_plan_ref.ref_id,
      literatureSnapshotId: record.literature_snapshot_ref.ref_id,
      searchRunRef: toJsonValue(record.search_run_ref),
      searchPlanRef: toJsonValue(record.search_plan_ref),
      literatureSnapshotRef: toJsonValue(record.literature_snapshot_ref),
      needCandidateRef: toJsonValue(record.need_candidate_ref),
      readinessAssessmentRef: jsonOrNull(record.readiness_assessment_ref ?? null),
      evidenceRoleBundle: toJsonValue(record.evidence_role_bundle),
      conflictRefs: toJsonValue(record.conflict_refs),
      strengthAssessmentRefs: toJsonValue(record.strength_assessment_refs),
      coverageRefs: toJsonValue(record.coverage_refs),
      residualRiskRefs: toJsonValue(record.residual_risk_refs),
      openGapCodes: record.open_gap_codes,
      requiredHumanChecks: record.required_human_checks,
      priorArtStatus: record.prior_art_status,
      alreadySolvedReview: toJsonValue(record.already_solved_review),
      packetPayload: toJsonValue(record.packet_payload),
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      gateResultId: record.gate_result_id ?? null,
      transitionAttemptId: record.transition_attempt_id ?? null,
      traceSnapshotId: record.trace_snapshot_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      createdBy: record.created_by,
      createdAt: new Date(record.created_at),
    };
  }

  private toAdjudicationCreateInput(
    record: TopicSelectionValidateNeedAdjudicationResultRecord,
  ): Prisma.TopicSelectionValidateNeedAdjudicationResultCreateInput {
    return {
      id: record.adjudication_result_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      needCandidateId: record.need_candidate_id,
      supportPacketId: record.support_packet_id,
      finalDecision: record.final_decision,
      outputValidatedNeedId: record.output_validated_need_id ?? null,
      humanDecisionId: record.human_decision_id ?? null,
      loopbackTarget: record.loopback_target,
      rejectedReason: record.rejected_reason ?? null,
      mergeTargetNeedCandidateId: record.merge_target_need_candidate_ref?.ref_id ?? null,
      mergeTargetNeedCandidateRef: jsonOrNull(record.merge_target_need_candidate_ref ?? null),
      outputSearchplanRecheckRequestId: record.output_searchplan_recheck_request_ref?.ref_id ?? null,
      outputSearchplanRecheckRequestRef: jsonOrNull(record.output_searchplan_recheck_request_ref ?? null),
      outputMemorySuggestionId: record.output_memory_suggestion_ref?.ref_id ?? null,
      outputMemorySuggestionRef: jsonOrNull(record.output_memory_suggestion_ref ?? null),
      rationale: record.rationale,
      requiredActions: record.required_actions,
      acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
      residualRiskRefs: toJsonValue(record.residual_risk_refs),
      gapCodes: record.gap_codes,
      decisionPayload: toJsonValue(record.decision_payload),
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      gateResultId: record.gate_result_id ?? null,
      transitionAttemptId: record.transition_attempt_id ?? null,
      traceSnapshotId: record.trace_snapshot_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      adjudicatedBy: toJsonValue(record.adjudicated_by),
      adjudicatedByType: record.adjudicated_by.actor_type,
      adjudicatedById: record.adjudicated_by.actor_id ?? null,
      createdAt: new Date(record.created_at),
    };
  }

  private toValidatedNeedCreateInput(record: TopicSelectionValidatedNeedRecord): Prisma.TopicSelectionValidatedNeedCreateInput {
    return {
      id: record.validated_need_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      sourceNeedCandidateId: record.source_need_candidate_id,
      adjudicationResultId: record.adjudication_result_id,
      supportPacketId: record.support_packet_id,
      humanDecisionId: record.human_decision_id,
      validatedNeedStatement: record.validated_need_statement,
      mechanismType: record.mechanism_type,
      mechanismSummary: record.mechanism_summary ?? null,
      mechanismPayload: toJsonValue(record.mechanism_payload),
      scopeNotes: record.scope_notes ?? null,
      nonGoalNotes: record.non_goal_notes ?? null,
      priorArtStatus: record.prior_art_status,
      evidenceMapId: record.evidence_map_ref.ref_id,
      searchRunId: record.search_run_ref.ref_id,
      searchPlanId: record.search_plan_ref.ref_id,
      literatureSnapshotId: record.literature_snapshot_ref.ref_id,
      evidenceMapRef: toJsonValue(record.evidence_map_ref),
      searchRunRef: toJsonValue(record.search_run_ref),
      searchPlanRef: toJsonValue(record.search_plan_ref),
      literatureSnapshotRef: toJsonValue(record.literature_snapshot_ref),
      supportPacketRef: toJsonValue(record.support_packet_ref),
      adjudicationResultRef: toJsonValue(record.adjudication_result_ref),
      humanDecisionRef: toJsonValue(record.human_decision_ref),
      evidenceRoleBundle: toJsonValue(record.evidence_role_bundle),
      strengthAssessmentRefs: toJsonValue(record.strength_assessment_refs),
      conflictRefs: toJsonValue(record.conflict_refs),
      residualRiskRefs: toJsonValue(record.residual_risk_refs),
      acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
      traceRefs: toJsonValue(record.trace_refs),
      createdBy: record.created_by,
      createdAt: new Date(record.created_at),
    };
  }

  private toMemorySuggestionCreateInput(
    record: TopicSelectionCandidateDecisionMemorySuggestionRecord,
  ): Prisma.TopicSelectionCandidateDecisionMemorySuggestionCreateInput {
    return {
      id: record.memory_suggestion_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      sourceNeedCandidateId: record.source_need_candidate_id,
      adjudicationResultId: record.adjudication_result_id ?? null,
      suggestionType: record.suggestion_type,
      status: record.status,
      targetRefType: record.target_ref.ref_type,
      targetRefId: record.target_ref.ref_id,
      targetRef: toJsonValue(record.target_ref),
      suggestionPayload: toJsonValue(record.suggestion_payload),
      rationale: record.rationale,
      policyVersionId: record.policy_version_id ?? null,
      createdBy: record.created_by,
      createdAt: new Date(record.created_at),
    };
  }

  private toV1bBundleCreateInput(record: TopicSelectionV1aToV1bInputBundleRecord): Prisma.TopicSelectionV1aToV1bInputBundleCreateInput {
    return {
      id: record.v1b_input_bundle_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      validatedNeedId: record.validated_need_id,
      sourceNeedCandidateId: record.source_need_candidate_id,
      adjudicationResultId: record.adjudication_result_id,
      supportPacketId: record.support_packet_id,
      bundleVersion: record.bundle_version,
      validatedNeedRef: toJsonValue(record.validated_need_ref),
      sourceNeedCandidateRef: toJsonValue(record.source_need_candidate_ref),
      adjudicationResultRef: toJsonValue(record.adjudication_result_ref),
      supportPacketRef: toJsonValue(record.support_packet_ref),
      humanDecisionRef: toJsonValue(record.human_decision_ref),
      evidenceMapId: record.evidence_map_ref.ref_id,
      searchRunId: record.search_run_ref.ref_id,
      searchPlanId: record.search_plan_ref.ref_id,
      literatureSnapshotId: record.literature_snapshot_ref.ref_id,
      evidenceMapRef: toJsonValue(record.evidence_map_ref),
      searchRunRef: toJsonValue(record.search_run_ref),
      searchPlanRef: toJsonValue(record.search_plan_ref),
      literatureSnapshotRef: toJsonValue(record.literature_snapshot_ref),
      evidenceRoleBundle: toJsonValue(record.evidence_role_bundle),
      traceRefs: toJsonValue(record.trace_refs),
      riskRefs: toJsonValue(record.risk_refs),
      gapCodes: record.gap_codes,
      memorySuggestionRefs: toJsonValue(record.memory_suggestion_refs),
      recheckRequestRefs: toJsonValue(record.recheck_request_refs),
      handoffPayload: toJsonValue(record.handoff_payload),
      createdBy: record.created_by,
      createdAt: new Date(record.created_at),
    };
  }
}
