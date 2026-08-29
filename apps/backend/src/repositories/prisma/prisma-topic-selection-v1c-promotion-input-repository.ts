import type {
  PrismaClient,
  TopicSelectionPromotionInputSnapshot,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import {
  topicSelectionRiskFindingRefs,
  type TopicSelectionFunctionalRef,
  type TopicSelectionGateIssue,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionPromotionInputSnapshotCheckDetail,
  TopicSelectionPromotionInputSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-input-contracts';
import type {
  TopicSelectionV1cPromotionInputControlPlanePersistence,
  TopicSelectionV1cPromotionInputPersistence,
  TopicSelectionV1cPromotionInputRepository,
} from '../topic-selection-v1c-promotion-input.repository.js';

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function nullableJson(value: unknown): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
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

function toSnapshotRecord(
  row: TopicSelectionPromotionInputSnapshot,
): TopicSelectionPromotionInputSnapshotRecord {
  const sourceBundleSnapshot = asRecord(row.sourceBundleSnapshot) as unknown as TopicSelectionPromotionInputSnapshotRecord['source_bundle_snapshot'];
  const artifactRefs = asArray<TopicSelectionFunctionalRef>(row.artifactRefs);
  const riskFindingRefs = topicSelectionRiskFindingRefs([
    ...(sourceBundleSnapshot.risk_finding_refs ?? []),
    ...(sourceBundleSnapshot.artifact_refs ?? []),
    ...artifactRefs,
  ]);
  return {
    promotion_input_snapshot_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    v1b_to_v1c_input_bundle_id: row.v1bToV1cInputBundleId,
    topic_package_id: row.topicPackageId,
    package_version: row.packageVersion,
    closure_status: row.closureStatus as TopicSelectionPromotionInputSnapshotRecord['closure_status'],
    stop_condition_code: row.stopConditionCode,
    required_actions: row.requiredActions,
    blockers: asArray<TopicSelectionGateIssue>(row.blockers),
    warnings: asArray<TopicSelectionGateIssue>(row.warnings),
    check_details: asArray<TopicSelectionPromotionInputSnapshotCheckDetail>(row.checkDetails),
    bundle_hash: row.bundleHash,
    package_snapshot_hash: row.packageSnapshotHash,
    package_draft_input_snapshot_hash: row.packageDraftInputSnapshotHash,
    promotion_input_snapshot_hash: row.promotionInputSnapshotHash,
    source_bundle_ref: asFunctionalRef(row.sourceBundleRef),
    promotion_input_snapshot_ref: asFunctionalRef(row.promotionInputSnapshotRef),
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
    risk_finding_refs: riskFindingRefs,
    blocker_refs: asArray<TopicSelectionFunctionalRef>(row.blockerRefs),
    memory_suggestion_refs: asArray<TopicSelectionFunctionalRef>(row.memorySuggestionRefs),
    recheck_request_refs: asArray<TopicSelectionFunctionalRef>(row.recheckRequestRefs),
    readiness_check_refs: asArray<TopicSelectionFunctionalRef>(row.readinessCheckRefs),
    replacement_bundle_ref: asNullableFunctionalRef(row.replacementBundleRef),
    source_bundle_snapshot: sourceBundleSnapshot,
    package_snapshot: asRecord(row.packageSnapshot) as unknown as TopicSelectionPromotionInputSnapshotRecord['package_snapshot'],
    package_draft_input_snapshot: asRecord(row.packageDraftInputSnapshot) as unknown as TopicSelectionPromotionInputSnapshotRecord['package_draft_input_snapshot'],
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    trace_snapshot_id: row.traceSnapshotId,
    artifact_refs: artifactRefs,
    created_by: row.createdBy as TopicSelectionPromotionInputSnapshotRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

export class PrismaTopicSelectionV1cPromotionInputRepository
implements TopicSelectionV1cPromotionInputRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createSnapshot(
    persistence: TopicSelectionV1cPromotionInputPersistence,
  ): Promise<TopicSelectionPromotionInputSnapshotRecord> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.createControlPlaneRecords(tx, persistence.control_plane);
        await tx.topicSelectionPromotionInputSnapshot.create({
          data: this.toSnapshotCreateInput(persistence.promotion_input_snapshot),
        });
      });
    } catch (error) {
      if (this.isBundleUniqueConflict(error)) {
        const existing = await this.findSnapshotByBundleId(
          persistence.promotion_input_snapshot.v1b_to_v1c_input_bundle_id,
        );
        if (existing?.bundle_hash === persistence.promotion_input_snapshot.bundle_hash) {
          return existing;
        }
      }
      throw error;
    }
    return persistence.promotion_input_snapshot;
  }

  async findSnapshotById(
    promotionInputSnapshotId: string,
  ): Promise<TopicSelectionPromotionInputSnapshotRecord | null> {
    const row = await this.prisma.topicSelectionPromotionInputSnapshot.findUnique({
      where: { id: promotionInputSnapshotId },
    });
    return row ? toSnapshotRecord(row) : null;
  }

  async findSnapshotByBundleId(
    v1bToV1cInputBundleId: string,
  ): Promise<TopicSelectionPromotionInputSnapshotRecord | null> {
    const row = await this.prisma.topicSelectionPromotionInputSnapshot.findUnique({
      where: { v1bToV1cInputBundleId },
    });
    return row ? toSnapshotRecord(row) : null;
  }

  async findReadySnapshotById(
    promotionInputSnapshotId: string,
  ): Promise<TopicSelectionPromotionInputSnapshotRecord | null> {
    const row = await this.prisma.topicSelectionPromotionInputSnapshot.findFirst({
      where: {
        id: promotionInputSnapshotId,
        closureStatus: 'ready_for_gate',
      },
    });
    return row ? toSnapshotRecord(row) : null;
  }

  private async createControlPlaneRecords(
    tx: Prisma.TransactionClient,
    controlPlane: TopicSelectionV1cPromotionInputControlPlanePersistence,
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

  private toSnapshotCreateInput(
    record: TopicSelectionPromotionInputSnapshotRecord,
  ): Prisma.TopicSelectionPromotionInputSnapshotCreateInput {
    return {
      id: record.promotion_input_snapshot_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      v1bToV1cInputBundleId: record.v1b_to_v1c_input_bundle_id,
      topicPackageId: record.topic_package_id,
      packageVersion: record.package_version,
      closureStatus: record.closure_status,
      stopConditionCode: record.stop_condition_code ?? null,
      requiredActions: record.required_actions,
      blockers: toJsonValue(record.blockers),
      warnings: toJsonValue(record.warnings),
      checkDetails: toJsonValue(record.check_details),
      bundleHash: record.bundle_hash,
      packageSnapshotHash: record.package_snapshot_hash,
      packageDraftInputSnapshotHash: record.package_draft_input_snapshot_hash,
      promotionInputSnapshotHash: record.promotion_input_snapshot_hash,
      sourceBundleRef: toJsonValue(record.source_bundle_ref),
      promotionInputSnapshotRef: toJsonValue(record.promotion_input_snapshot_ref),
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
      replacementBundleRef: nullableJson(record.replacement_bundle_ref ?? null),
      sourceBundleSnapshot: toJsonValue(record.source_bundle_snapshot),
      packageSnapshot: toJsonValue(record.package_snapshot),
      packageDraftInputSnapshot: toJsonValue(record.package_draft_input_snapshot),
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

  private isBundleUniqueConflict(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      return false;
    }
    const target = error.meta?.target;
    return Array.isArray(target)
      ? target.includes('v1bToV1cInputBundleId')
      : target === 'v1bToV1cInputBundleId';
  }
}
