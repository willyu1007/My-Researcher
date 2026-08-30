import type {
  PrismaClient,
  TitleCardPackage,
  TopicSelectionPackageTraceBoundaryCheck,
  TopicSelectionTopicPackageReadinessAssessment,
  TopicSelectionV1bToV1cInputBundle,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import {
  topicSelectionRiskFindingRefs,
  type TopicSelectionFunctionalRef,
  type TopicSelectionGateIssue,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionPackageTraceBoundaryCheckRecord,
  TopicSelectionTopicPackageReadinessAssessmentRecord,
  TopicSelectionTopicPackageRecord,
  TopicSelectionV1bToV1cInputBundleRecord,
  TopicSelectionV1bTopicPackageCreationResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-package-contracts';
import { AppError } from '../../errors/app-error.js';
import type {
  TopicSelectionV1bTopicPackageAuthorityPersistence,
  TopicSelectionV1bTopicPackageControlPlanePersistence,
  TopicSelectionV1bTopicPackagePersistence,
  TopicSelectionV1bTopicPackageRepository,
} from '../topic-selection-v1b-topic-package.repository.js';

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

function toPackageRecord(row: TitleCardPackage): TopicSelectionTopicPackageRecord {
  const payload = asRecord(row.v1bAuthorityPayload) as Partial<TopicSelectionTopicPackageRecord>;
  const artifactRefs = payload.artifact_refs ?? [];
  return {
    ...payload,
    topic_package_id: row.id,
    title_card_id: row.titleCardId,
    research_record_id: row.researchRecordId,
    topic_question_id: row.researchQuestionId,
    topic_value_assessment_id: row.valueAssessmentId,
    value_disposition_decision_id: row.v1bSourceValueDispositionDecisionId
      ?? payload.value_disposition_decision_id
      ?? '',
    topic_question_contract_id: row.v1bSourceQuestionContractId
      ?? payload.topic_question_contract_id
      ?? '',
    research_slice_id: row.v1bSourceResearchSliceId ?? payload.research_slice_id ?? '',
    research_slice_version: row.v1bSourceResearchSliceVersion ?? payload.research_slice_version ?? '',
    value_reasoning_memo_id: row.v1bValueReasoningMemoId ?? payload.value_reasoning_memo_id ?? '',
    package_version: row.v1bPackageVersion ?? payload.package_version ?? 'v1',
    package_readiness_status: (row.v1bReadinessStatus
      ?? payload.package_readiness_status
      ?? 'draft') as TopicSelectionTopicPackageRecord['package_readiness_status'],
    title_candidates: asArray<string>(row.titleCandidates),
    research_background: row.researchBackground,
    contribution_summary: row.contributionSummary,
    candidate_methods: asArray<string>(row.candidateMethods),
    evaluation_plan: row.evaluationPlan,
    key_risks: asArray<string>(row.keyRisks),
    selected_literature_evidence_ids: asArray<string>(row.selectedLiteratureEvidenceIds),
    trace_boundary_check_id: row.v1bTraceBoundaryCheckId ?? payload.trace_boundary_check_id ?? null,
    readiness_assessment_id: row.v1bReadinessAssessmentId ?? payload.readiness_assessment_id ?? null,
    v1c_input_bundle_id: row.v1bToV1cInputBundleId ?? payload.v1c_input_bundle_id ?? null,
    trace_snapshot_id: row.v1bTraceSnapshotId ?? payload.trace_snapshot_id ?? null,
    input_snapshot_id: row.v1bInputSnapshotId ?? payload.input_snapshot_id ?? null,
    workflow_run_id: row.v1bWorkflowRunId ?? payload.workflow_run_id ?? null,
    gate_result_id: row.v1bGateResultId ?? payload.gate_result_id ?? null,
    transition_attempt_id: row.v1bTransitionAttemptId ?? payload.transition_attempt_id ?? null,
    package_payload: asRecord(payload.package_payload),
    artifact_refs: artifactRefs,
    ...(Object.hasOwn(payload, 'risk_finding_refs')
      ? { risk_finding_refs: payload.risk_finding_refs }
      : {}),
    updated_at: row.updatedAt.toISOString(),
    created_at: row.createdAt.toISOString(),
  } as TopicSelectionTopicPackageRecord;
}

function toTraceBoundaryCheckRecord(
  row: TopicSelectionPackageTraceBoundaryCheck,
): TopicSelectionPackageTraceBoundaryCheckRecord {
  const artifactRefs = asArray<TopicSelectionFunctionalRef>(row.artifactRefs);
  return {
    package_trace_boundary_check_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    topic_package_id: row.topicPackageId,
    value_disposition_decision_id: row.valueDispositionDecisionId,
    topic_value_assessment_id: row.topicValueAssessmentId,
    topic_question_contract_id: row.topicQuestionContractId,
    research_slice_id: row.researchSliceId,
    check_status: row.checkStatus as TopicSelectionPackageTraceBoundaryCheckRecord['check_status'],
    package_ref: asFunctionalRef(row.packageRef),
    topic_value_assessment_ref: asFunctionalRef(row.topicValueAssessmentRef),
    value_reasoning_memo_ref: asFunctionalRef(row.valueReasoningMemoRef),
    value_disposition_decision_ref: asFunctionalRef(row.valueDispositionDecisionRef),
    topic_question_ref: asFunctionalRef(row.topicQuestionRef),
    topic_question_contract_ref: asFunctionalRef(row.topicQuestionContractRef),
    answerability_plan_ref: asFunctionalRef(row.answerabilityPlanRef),
    research_slice_ref: asFunctionalRef(row.researchSliceRef),
    validated_need_refs: asArray<TopicSelectionFunctionalRef>(row.validatedNeedRefs),
    evidence_refs: asArray<TopicSelectionFunctionalRef>(row.evidenceRefs),
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    blocker_refs: asArray<TopicSelectionFunctionalRef>(row.blockerRefs),
    recheck_request_refs: asArray<TopicSelectionFunctionalRef>(row.recheckRequestRefs),
    missing_ref_codes: row.missingRefCodes,
    new_ref_codes: row.newRefCodes,
    boundary_conflict_codes: row.boundaryConflictCodes,
    carry_forward_codes: row.carryForwardCodes,
    trace_issues: asArray<TopicSelectionGateIssue>(row.traceIssues),
    boundary_issues: asArray<TopicSelectionGateIssue>(row.boundaryIssues),
    narrative_consistency: asRecord(row.narrativeConsistency),
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    artifact_refs: artifactRefs,
    risk_finding_refs: topicSelectionRiskFindingRefs(artifactRefs),
    created_at: row.createdAt.toISOString(),
  };
}

function toReadinessAssessmentRecord(
  row: TopicSelectionTopicPackageReadinessAssessment,
): TopicSelectionTopicPackageReadinessAssessmentRecord {
  const artifactRefs = asArray<TopicSelectionFunctionalRef>(row.artifactRefs);
  return {
    package_readiness_assessment_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    topic_package_id: row.topicPackageId,
    value_disposition_decision_id: row.valueDispositionDecisionId,
    package_trace_boundary_check_id: row.packageTraceBoundaryCheckId,
    package_version: row.packageVersion,
    package_readiness_status: row.packageReadinessStatus as TopicSelectionTopicPackageReadinessAssessmentRecord['package_readiness_status'],
    blockers: asArray<TopicSelectionGateIssue>(row.blockers),
    warnings: asArray<TopicSelectionGateIssue>(row.warnings),
    required_actions: row.requiredActions,
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    blocker_refs: asArray<TopicSelectionFunctionalRef>(row.blockerRefs),
    recheck_request_refs: asArray<TopicSelectionFunctionalRef>(row.recheckRequestRefs),
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    artifact_refs: artifactRefs,
    risk_finding_refs: topicSelectionRiskFindingRefs(artifactRefs),
    assessed_by: row.assessedBy as TopicSelectionTopicPackageReadinessAssessmentRecord['assessed_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toV1cInputBundleRecord(
  row: TopicSelectionV1bToV1cInputBundle,
): TopicSelectionV1bToV1cInputBundleRecord {
  const artifactRefs = asArray<TopicSelectionFunctionalRef>(row.artifactRefs);
  return {
    v1b_to_v1c_input_bundle_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    topic_package_id: row.topicPackageId,
    package_version: row.packageVersion,
    package_readiness_status: row.packageReadinessStatus as 'ready_for_promotion_review',
    bundle_status: row.bundleStatus as TopicSelectionV1bToV1cInputBundleRecord['bundle_status'],
    topic_package_ref: asFunctionalRef(row.topicPackageRef),
    package_trace_boundary_check_ref: asFunctionalRef(row.packageTraceBoundaryCheckRef),
    package_readiness_assessment_ref: asFunctionalRef(row.packageReadinessAssessmentRef),
    topic_value_assessment_ref: asFunctionalRef(row.topicValueAssessmentRef),
    value_reasoning_memo_ref: asFunctionalRef(row.valueReasoningMemoRef),
    value_disposition_decision_ref: asFunctionalRef(row.valueDispositionDecisionRef),
    topic_question_ref: asFunctionalRef(row.topicQuestionRef),
    topic_question_contract_ref: asFunctionalRef(row.topicQuestionContractRef),
    answerability_plan_ref: asFunctionalRef(row.answerabilityPlanRef),
    research_slice_ref: asFunctionalRef(row.researchSliceRef),
    validated_need_refs: asArray<TopicSelectionFunctionalRef>(row.validatedNeedRefs),
    evidence_refs: asArray(row.evidenceRefs),
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    blocker_refs: asArray<TopicSelectionFunctionalRef>(row.blockerRefs),
    memory_suggestion_refs: asArray<TopicSelectionFunctionalRef>(row.memorySuggestionRefs),
    recheck_request_refs: asArray<TopicSelectionFunctionalRef>(row.recheckRequestRefs),
    readiness_check_refs: asArray<TopicSelectionFunctionalRef>(row.readinessCheckRefs),
    package_snapshot: asRecord(row.packageSnapshot) as unknown as TopicSelectionV1bToV1cInputBundleRecord['package_snapshot'],
    package_draft_input_snapshot: asRecord(row.packageDraftInputSnapshot) as unknown as TopicSelectionV1bToV1cInputBundleRecord['package_draft_input_snapshot'],
    bundle_hash: row.bundleHash,
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    artifact_refs: artifactRefs,
    risk_finding_refs: topicSelectionRiskFindingRefs(artifactRefs),
    created_at: row.createdAt.toISOString(),
  };
}

export class PrismaTopicSelectionV1bTopicPackageRepository
implements TopicSelectionV1bTopicPackageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createDraftPackage(
    persistence: TopicSelectionV1bTopicPackagePersistence,
  ): Promise<TopicSelectionV1bTopicPackageCreationResult> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.createControlPlaneRecords(tx, persistence.control_plane);
        await this.createAuthorityRecords(tx, persistence);
      });
    } catch (error) {
      if (this.isValueDispositionDecisionUniqueConflict(error)) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          'TopicPackage already exists for this ValueDispositionDecision.',
        );
      }
      throw error;
    }
    return persistence;
  }

  async createDraftPackageAuthority(
    persistence: TopicSelectionV1bTopicPackageAuthorityPersistence,
  ): Promise<TopicSelectionV1bTopicPackageCreationResult> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.createAuthorityRecords(tx, persistence);
      });
    } catch (error) {
      if (this.isValueDispositionDecisionUniqueConflict(error)) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          'TopicPackage already exists for this ValueDispositionDecision.',
        );
      }
      throw error;
    }
    return persistence;
  }

  private async createAuthorityRecords(
    tx: Prisma.TransactionClient,
    persistence: TopicSelectionV1bTopicPackageAuthorityPersistence,
  ): Promise<void> {
    await tx.titleCardResearchRecord.create({
      data: {
        id: persistence.topic_package.research_record_id,
        titleCardId: persistence.topic_package.title_card_id,
        recordType: 'package',
        recordStatus: persistence.topic_package.package_readiness_status === 'ready_for_promotion_review'
          ? 'completed'
          : 'draft',
        parentRecordId: null,
        supersededByRecordId: null,
        sourceRecordIds: toJsonValue([
          persistence.topic_package.topic_question_id,
          persistence.topic_package.topic_value_assessment_id,
          persistence.topic_package.value_disposition_decision_id,
        ]),
        lineage: toJsonValue({
          source: 'topic_selection_v1b_topic_package_draft',
          value_disposition_decision_id: persistence.topic_package.value_disposition_decision_id,
          topic_question_contract_id: persistence.topic_package.topic_question_contract_id,
          research_slice_id: persistence.topic_package.research_slice_id,
        }),
        summary: persistence.topic_package.contribution_summary,
        confidence: new Prisma.Decimal(1),
        blockingIssues: toJsonValue(persistence.topic_package.blocker_refs),
        missingInformation: toJsonValue(persistence.topic_package.key_risks),
        nextActions: toJsonValue(
          persistence.package_readiness_assessment.required_actions,
        ),
        evidenceRefs: toJsonValue(persistence.topic_package.selected_evidence_refs),
        payload: toJsonValue(persistence.topic_package),
        createdBy: persistence.topic_package.created_by,
        createdAt: new Date(persistence.topic_package.created_at),
        updatedAt: new Date(persistence.topic_package.updated_at),
        deletedAt: null,
      },
    });
    await tx.titleCardPackage.create({
      data: this.toPackageCreateInput(persistence.topic_package),
    });
    await tx.topicSelectionPackageTraceBoundaryCheck.create({
      data: this.toTraceBoundaryCheckCreateInput(persistence.package_trace_boundary_check),
    });
    await tx.topicSelectionTopicPackageReadinessAssessment.create({
      data: this.toReadinessAssessmentCreateInput(persistence.package_readiness_assessment),
    });
    if (persistence.v1c_input_bundle) {
      await tx.topicSelectionV1bToV1cInputBundle.create({
        data: this.toV1cInputBundleCreateInput(persistence.v1c_input_bundle),
      });
    }
    await tx.topicSelectionValueDispositionDecision.update({
      where: { id: persistence.topic_package.value_disposition_decision_id },
      data: { outputTopicPackageId: persistence.topic_package.topic_package_id },
    });
  }

  private isValueDispositionDecisionUniqueConflict(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      return false;
    }
    const target = error.meta?.target;
    return Array.isArray(target)
      ? target.includes('v1bSourceValueDispositionDecisionId')
      : target === 'v1bSourceValueDispositionDecisionId';
  }

  private async createControlPlaneRecords(
    tx: Prisma.TransactionClient,
    controlPlane: TopicSelectionV1bTopicPackageControlPlanePersistence,
  ): Promise<void> {
    await tx.topicSelectionInputSnapshot.create({
      data: {
        id: controlPlane.input_snapshot.input_snapshot_id,
        workspaceId: controlPlane.input_snapshot.workspace_id ?? null,
        titleCardId: controlPlane.input_snapshot.title_card_id ?? null,
        targetRefType: controlPlane.input_snapshot.target_ref.ref_type,
        targetRefId: controlPlane.input_snapshot.target_ref.ref_id,
        targetVersionId: controlPlane.input_snapshot.target_ref.version_id ?? null,
        contextPolicyVersionId: controlPlane.input_snapshot.context_policy_version_id ?? null,
        policyVersion: controlPlane.input_snapshot.policy_version ?? null,
        snapshotHash: controlPlane.input_snapshot.snapshot_hash,
        sourceRefs: toJsonValue(controlPlane.input_snapshot.source_refs),
        permissionRefs: toJsonValue(controlPlane.input_snapshot.permission_refs),
        payload: toJsonValue(controlPlane.input_snapshot.payload),
        createdBy: controlPlane.input_snapshot.created_by,
        createdAt: new Date(controlPlane.input_snapshot.created_at),
      },
    });
    await tx.topicSelectionLlmWorkflowRun.create({
      data: {
        id: controlPlane.workflow_run.workflow_run_id,
        workspaceId: controlPlane.workflow_run.workspace_id ?? null,
        titleCardId: controlPlane.workflow_run.title_card_id ?? null,
        workflowKey: controlPlane.workflow_run.workflow_key,
        workflowProfileKey: controlPlane.workflow_run.workflow_profile_key,
        workflowProfileVersion: controlPlane.workflow_run.workflow_profile_version ?? null,
        inputSnapshotId: controlPlane.workflow_run.input_snapshot_id ?? null,
        status: controlPlane.workflow_run.status,
        providerId: controlPlane.workflow_run.provider_id ?? null,
        modelId: controlPlane.workflow_run.model_id ?? null,
        promptTemplateId: controlPlane.workflow_run.prompt_template_id ?? null,
        promptTemplateVersion: controlPlane.workflow_run.prompt_template_version ?? null,
        startedAt: new Date(controlPlane.workflow_run.started_at),
        finishedAt: controlPlane.workflow_run.finished_at
          ? new Date(controlPlane.workflow_run.finished_at)
          : null,
        telemetry: toJsonValue(controlPlane.workflow_run.telemetry),
        outputSummary: toJsonValue(controlPlane.workflow_run.output_summary),
        errorCode: controlPlane.workflow_run.error_code ?? null,
        errorMessage: controlPlane.workflow_run.error_message ?? null,
        createdBy: controlPlane.workflow_run.created_by,
      },
    });
    for (const artifactRef of controlPlane.artifact_refs) {
      await tx.topicSelectionArtifactRef.create({
        data: {
          id: artifactRef.artifact_ref_id,
          workspaceId: artifactRef.workspace_id ?? null,
          titleCardId: artifactRef.title_card_id ?? null,
          artifactKind: artifactRef.artifact_kind,
          storageKind: artifactRef.storage_kind,
          uri: artifactRef.uri ?? null,
          payload: artifactRef.payload === null || artifactRef.payload === undefined
            ? undefined
            : toJsonValue(artifactRef.payload),
          checksum: artifactRef.checksum ?? null,
          byteSize: artifactRef.byte_size ?? null,
          mimeType: artifactRef.mime_type ?? null,
          workflowRunId: artifactRef.workflow_run_id ?? null,
          inputSnapshotId: artifactRef.input_snapshot_id ?? null,
          createdBy: artifactRef.created_by,
          createdAt: new Date(artifactRef.created_at),
        },
      });
    }
    await tx.topicSelectionReadinessGateResult.create({
      data: {
        id: controlPlane.readiness_gate_result.readiness_gate_result_id,
        workspaceId: controlPlane.readiness_gate_result.workspace_id ?? null,
        titleCardId: controlPlane.readiness_gate_result.title_card_id ?? null,
        gateKey: controlPlane.readiness_gate_result.gate_key,
        targetRefType: controlPlane.readiness_gate_result.target_ref.ref_type,
        targetRefId: controlPlane.readiness_gate_result.target_ref.ref_id,
        targetVersionId: controlPlane.readiness_gate_result.target_ref.version_id ?? null,
        inputSnapshotId: controlPlane.readiness_gate_result.input_snapshot_id ?? null,
        workflowRunId: controlPlane.readiness_gate_result.workflow_run_id ?? null,
        policyVersionId: controlPlane.readiness_gate_result.policy_version_id ?? null,
        verdict: controlPlane.readiness_gate_result.verdict,
        blockers: toJsonValue(controlPlane.readiness_gate_result.blockers),
        warnings: toJsonValue(controlPlane.readiness_gate_result.warnings),
        requiredActions: toJsonValue(controlPlane.readiness_gate_result.required_actions),
        loopbackTarget: controlPlane.readiness_gate_result.loopback_target
          ? toJsonValue(controlPlane.readiness_gate_result.loopback_target)
          : undefined,
        acceptedRiskRefs: toJsonValue(controlPlane.readiness_gate_result.accepted_risk_refs),
        qualitySignalRefs: toJsonValue(controlPlane.readiness_gate_result.quality_signal_refs),
        createdBy: controlPlane.readiness_gate_result.created_by,
        createdAt: new Date(controlPlane.readiness_gate_result.created_at),
      },
    });
    await tx.topicSelectionChainTransitionAttempt.create({
      data: {
        id: controlPlane.transition_attempt.chain_transition_attempt_id,
        workspaceId: controlPlane.transition_attempt.workspace_id ?? null,
        titleCardId: controlPlane.transition_attempt.title_card_id ?? null,
        transitionKey: controlPlane.transition_attempt.transition_key,
        sourceRefType: controlPlane.transition_attempt.source_ref.ref_type,
        sourceRefId: controlPlane.transition_attempt.source_ref.ref_id,
        sourceVersionId: controlPlane.transition_attempt.source_ref.version_id ?? null,
        targetRefType: controlPlane.transition_attempt.target_ref?.ref_type ?? null,
        targetRefId: controlPlane.transition_attempt.target_ref?.ref_id ?? null,
        targetVersionId: controlPlane.transition_attempt.target_ref?.version_id ?? null,
        gateResultId: controlPlane.transition_attempt.gate_result_id ?? null,
        workflowRunId: controlPlane.transition_attempt.workflow_run_id ?? null,
        inputSnapshotId: controlPlane.transition_attempt.input_snapshot_id ?? null,
        policyVersionId: controlPlane.transition_attempt.policy_version_id ?? null,
        actorType: controlPlane.transition_attempt.actor.actor_type,
        actorId: controlPlane.transition_attempt.actor.actor_id ?? null,
        result: controlPlane.transition_attempt.result,
        reason: controlPlane.transition_attempt.reason,
        requiredActions: toJsonValue(controlPlane.transition_attempt.required_actions),
        blockers: toJsonValue(controlPlane.transition_attempt.blockers),
        acceptedRiskRefs: toJsonValue(controlPlane.transition_attempt.accepted_risk_refs),
        stateWriteIntents: toJsonValue(controlPlane.transition_attempt.state_write_intents),
        createdAuthorityRefs: toJsonValue(controlPlane.transition_attempt.created_authority_refs),
        createdAt: new Date(controlPlane.transition_attempt.created_at),
      },
    });
    await tx.topicSelectionTraceSnapshot.create({
      data: {
        id: controlPlane.trace_snapshot.trace_snapshot_id,
        workspaceId: controlPlane.trace_snapshot.workspace_id ?? null,
        titleCardId: controlPlane.trace_snapshot.title_card_id ?? null,
        targetRefType: controlPlane.trace_snapshot.target_ref.ref_type,
        targetRefId: controlPlane.trace_snapshot.target_ref.ref_id,
        targetVersionId: controlPlane.trace_snapshot.target_ref.version_id ?? null,
        snapshotHash: controlPlane.trace_snapshot.snapshot_hash,
        objectRefs: toJsonValue(controlPlane.trace_snapshot.object_refs),
        lineageLinkRefs: toJsonValue(controlPlane.trace_snapshot.lineage_link_refs),
        artifactRefs: toJsonValue(controlPlane.trace_snapshot.artifact_refs),
        qualitySignalRefs: toJsonValue(controlPlane.trace_snapshot.quality_signal_refs),
        transitionAttemptRefs: toJsonValue(controlPlane.trace_snapshot.transition_attempt_refs),
        payload: toJsonValue(controlPlane.trace_snapshot.payload),
        createdBy: controlPlane.trace_snapshot.created_by,
        createdAt: new Date(controlPlane.trace_snapshot.created_at),
      },
    });
  }

  async findPackageById(
    topicPackageId: string,
  ): Promise<TopicSelectionTopicPackageRecord | null> {
    const row = await this.prisma.titleCardPackage.findUnique({
      where: { id: topicPackageId },
    });
    return row ? toPackageRecord(row) : null;
  }

  async listPackagesByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionTopicPackageRecord[]> {
    const rows = await this.prisma.titleCardPackage.findMany({
      where: { titleCardId },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(toPackageRecord);
  }

  async findPackageByValueDispositionDecisionId(
    valueDispositionDecisionId: string,
  ): Promise<TopicSelectionTopicPackageRecord | null> {
    const row = await this.prisma.titleCardPackage.findUnique({
      where: { v1bSourceValueDispositionDecisionId: valueDispositionDecisionId },
    });
    return row ? toPackageRecord(row) : null;
  }

  async findTraceBoundaryCheckById(
    traceBoundaryCheckId: string,
  ): Promise<TopicSelectionPackageTraceBoundaryCheckRecord | null> {
    const row = await this.prisma.topicSelectionPackageTraceBoundaryCheck.findUnique({
      where: { id: traceBoundaryCheckId },
    });
    return row ? toTraceBoundaryCheckRecord(row) : null;
  }

  async findReadinessAssessmentById(
    readinessAssessmentId: string,
  ): Promise<TopicSelectionTopicPackageReadinessAssessmentRecord | null> {
    const row = await this.prisma.topicSelectionTopicPackageReadinessAssessment.findUnique({
      where: { id: readinessAssessmentId },
    });
    return row ? toReadinessAssessmentRecord(row) : null;
  }

  async findV1cInputBundleById(
    v1bToV1cInputBundleId: string,
  ): Promise<TopicSelectionV1bToV1cInputBundleRecord | null> {
    const row = await this.prisma.topicSelectionV1bToV1cInputBundle.findUnique({
      where: { id: v1bToV1cInputBundleId },
    });
    return row ? toV1cInputBundleRecord(row) : null;
  }

  async findV1cInputBundleByPackageId(
    topicPackageId: string,
  ): Promise<TopicSelectionV1bToV1cInputBundleRecord | null> {
    const row = await this.prisma.topicSelectionV1bToV1cInputBundle.findFirst({
      where: { topicPackageId },
      orderBy: { createdAt: 'desc' },
    });
    return row ? toV1cInputBundleRecord(row) : null;
  }

  private toPackageCreateInput(
    record: TopicSelectionTopicPackageRecord,
  ): Prisma.TitleCardPackageUncheckedCreateInput {
    return {
      id: record.topic_package_id,
      titleCardId: record.title_card_id,
      researchQuestionId: record.topic_question_id,
      valueAssessmentId: record.topic_value_assessment_id,
      researchRecordId: record.research_record_id,
      titleCandidates: toJsonValue(record.title_candidates),
      researchBackground: record.research_background,
      contributionSummary: record.contribution_summary,
      candidateMethods: toJsonValue(record.candidate_methods),
      evaluationPlan: record.evaluation_plan,
      keyRisks: toJsonValue(record.key_risks),
      selectedLiteratureEvidenceIds: toJsonValue(record.selected_literature_evidence_ids),
      v1bPackageVersion: record.package_version,
      v1bReadinessStatus: record.package_readiness_status,
      v1bSourceValueDispositionDecisionId: record.value_disposition_decision_id,
      v1bSourceQuestionContractId: record.topic_question_contract_id,
      v1bSourceResearchSliceId: record.research_slice_id,
      v1bSourceResearchSliceVersion: record.research_slice_version,
      v1bValueReasoningMemoId: record.value_reasoning_memo_id,
      v1bTraceBoundaryCheckId: record.trace_boundary_check_id ?? null,
      v1bReadinessAssessmentId: record.readiness_assessment_id ?? null,
      v1bToV1cInputBundleId: record.v1c_input_bundle_id ?? null,
      v1bTraceSnapshotId: record.trace_snapshot_id ?? null,
      v1bInputSnapshotId: record.input_snapshot_id ?? null,
      v1bWorkflowRunId: record.workflow_run_id ?? null,
      v1bGateResultId: record.gate_result_id ?? null,
      v1bTransitionAttemptId: record.transition_attempt_id ?? null,
      v1bAuthorityRefs: toJsonValue([
        record.topic_value_assessment_ref,
        record.value_reasoning_memo_ref,
        record.value_disposition_decision_ref,
        record.topic_question_contract_ref,
        record.research_slice_ref,
        ...record.validated_need_refs,
        ...record.selected_evidence_refs,
      ]),
      v1bAuthorityPayload: toJsonValue(record),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }

  private toTraceBoundaryCheckCreateInput(
    record: TopicSelectionPackageTraceBoundaryCheckRecord,
  ): Prisma.TopicSelectionPackageTraceBoundaryCheckCreateInput {
    return {
      id: record.package_trace_boundary_check_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      topicPackageId: record.topic_package_id,
      valueDispositionDecisionId: record.value_disposition_decision_id,
      topicValueAssessmentId: record.topic_value_assessment_id,
      topicQuestionContractId: record.topic_question_contract_id,
      researchSliceId: record.research_slice_id,
      checkStatus: record.check_status,
      packageRef: toJsonValue(record.package_ref),
      topicValueAssessmentRef: toJsonValue(record.topic_value_assessment_ref),
      valueReasoningMemoRef: toJsonValue(record.value_reasoning_memo_ref),
      valueDispositionDecisionRef: toJsonValue(record.value_disposition_decision_ref),
      topicQuestionRef: toJsonValue(record.topic_question_ref),
      topicQuestionContractRef: toJsonValue(record.topic_question_contract_ref),
      answerabilityPlanRef: toJsonValue(record.answerability_plan_ref),
      researchSliceRef: toJsonValue(record.research_slice_ref),
      validatedNeedRefs: toJsonValue(record.validated_need_refs),
      evidenceRefs: toJsonValue(record.evidence_refs),
      acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
      blockerRefs: toJsonValue(record.blocker_refs),
      recheckRequestRefs: toJsonValue(record.recheck_request_refs),
      missingRefCodes: record.missing_ref_codes,
      newRefCodes: record.new_ref_codes,
      boundaryConflictCodes: record.boundary_conflict_codes,
      carryForwardCodes: record.carry_forward_codes,
      traceIssues: toJsonValue(record.trace_issues),
      boundaryIssues: toJsonValue(record.boundary_issues),
      narrativeConsistency: toJsonValue(record.narrative_consistency),
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      gateResultId: record.gate_result_id ?? null,
      transitionAttemptId: record.transition_attempt_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      createdAt: new Date(record.created_at),
    };
  }

  private toReadinessAssessmentCreateInput(
    record: TopicSelectionTopicPackageReadinessAssessmentRecord,
  ): Prisma.TopicSelectionTopicPackageReadinessAssessmentCreateInput {
    return {
      id: record.package_readiness_assessment_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      topicPackageId: record.topic_package_id,
      valueDispositionDecisionId: record.value_disposition_decision_id,
      packageTraceBoundaryCheckId: record.package_trace_boundary_check_id,
      packageVersion: record.package_version,
      packageReadinessStatus: record.package_readiness_status,
      blockers: toJsonValue(record.blockers),
      warnings: toJsonValue(record.warnings),
      requiredActions: record.required_actions,
      acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
      blockerRefs: toJsonValue(record.blocker_refs),
      recheckRequestRefs: toJsonValue(record.recheck_request_refs),
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      gateResultId: record.gate_result_id ?? null,
      transitionAttemptId: record.transition_attempt_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      assessedBy: record.assessed_by,
      createdAt: new Date(record.created_at),
    };
  }

  private toV1cInputBundleCreateInput(
    record: TopicSelectionV1bToV1cInputBundleRecord,
  ): Prisma.TopicSelectionV1bToV1cInputBundleCreateInput {
    return {
      id: record.v1b_to_v1c_input_bundle_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      topicPackageId: record.topic_package_id,
      packageVersion: record.package_version,
      packageReadinessStatus: record.package_readiness_status,
      bundleStatus: record.bundle_status,
      topicPackageRef: toJsonValue(record.topic_package_ref),
      packageTraceBoundaryCheckRef: toJsonValue(record.package_trace_boundary_check_ref),
      packageReadinessAssessmentRef: toJsonValue(record.package_readiness_assessment_ref),
      topicValueAssessmentRef: toJsonValue(record.topic_value_assessment_ref),
      valueReasoningMemoRef: toJsonValue(record.value_reasoning_memo_ref),
      valueDispositionDecisionRef: toJsonValue(record.value_disposition_decision_ref),
      topicQuestionRef: toJsonValue(record.topic_question_ref),
      topicQuestionContractRef: toJsonValue(record.topic_question_contract_ref),
      answerabilityPlanRef: toJsonValue(record.answerability_plan_ref),
      researchSliceRef: toJsonValue(record.research_slice_ref),
      validatedNeedRefs: toJsonValue(record.validated_need_refs),
      evidenceRefs: toJsonValue(record.evidence_refs),
      acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
      blockerRefs: toJsonValue(record.blocker_refs),
      memorySuggestionRefs: toJsonValue(record.memory_suggestion_refs),
      recheckRequestRefs: toJsonValue(record.recheck_request_refs),
      readinessCheckRefs: toJsonValue(record.readiness_check_refs),
      packageSnapshot: toJsonValue(record.package_snapshot),
      packageDraftInputSnapshot: toJsonValue(record.package_draft_input_snapshot),
      bundleHash: record.bundle_hash,
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      gateResultId: record.gate_result_id ?? null,
      transitionAttemptId: record.transition_attempt_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      createdAt: new Date(record.created_at),
    };
  }
}
