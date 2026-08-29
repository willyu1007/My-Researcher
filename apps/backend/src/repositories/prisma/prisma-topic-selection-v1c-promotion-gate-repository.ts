import type {
  PrismaClient,
  TopicSelectionArgumentReadinessMiniCheck,
  TopicSelectionPromotionDecisionSupport,
  TopicSelectionPromotionDossier,
  TopicSelectionPromotionGateCheck,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  TopicSelectionFunctionalRef,
  TopicSelectionGateIssue,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { topicSelectionRiskFindingRefs } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionArgumentReadinessMiniCheckRecord,
  TopicSelectionPromotionDecisionSupportLlmDraft,
  TopicSelectionPromotionDecisionSupportRecord,
  TopicSelectionPromotionDossierRecord,
  TopicSelectionPromotionGateCheckRecord,
  TopicSelectionPromotionGateLoopbackHint,
  TopicSelectionPromotionGateRequiredAction,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-gate-contracts';
import type {
  TopicSelectionV1cPromotionGateControlPlanePersistence,
  TopicSelectionV1cPromotionGatePersistenceBundle,
  TopicSelectionV1cPromotionGateCheckControlPlanePersistence,
  TopicSelectionV1cPromotionGateCheckPersistenceBundle,
  TopicSelectionV1cPromotionGateCheckRecordBundle,
  TopicSelectionV1cPromotionGateRecordBundle,
  TopicSelectionV1cPromotionGateRepository,
  TopicSelectionV1cPromotionSupportControlPlanePersistence,
  TopicSelectionV1cPromotionSupportPersistenceBundle,
  TopicSelectionV1cPromotionSupportRecordBundle,
} from '../topic-selection-v1c-promotion-gate.repository.js';

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

function toDecisionSupportRecord(
  row: TopicSelectionPromotionDecisionSupport,
): TopicSelectionPromotionDecisionSupportRecord {
  return {
    promotion_decision_support_id: row.id,
    support_run_key: row.supportRunKey,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    promotion_input_snapshot_id: row.promotionInputSnapshotId,
    promotion_input_snapshot_ref: asFunctionalRef(row.promotionInputSnapshotRef),
    promotion_input_snapshot_hash: row.promotionInputSnapshotHash,
    topic_package_id: row.topicPackageId,
    package_version: row.packageVersion,
    support_generation_mode: row.supportGenerationMode as TopicSelectionPromotionDecisionSupportRecord['support_generation_mode'],
    support_status: row.supportStatus as TopicSelectionPromotionDecisionSupportRecord['support_status'],
    summary: row.summary,
    reviewer_questions: row.reviewerQuestions,
    risk_notes: row.riskNotes,
    recheck_notes: row.recheckNotes,
    source_refs: asArray<TopicSelectionFunctionalRef>(row.sourceRefs),
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    risk_finding_refs: topicSelectionRiskFindingRefs(asArray<TopicSelectionFunctionalRef>(row.sourceRefs)),
    blocker_refs: asArray<TopicSelectionFunctionalRef>(row.blockerRefs),
    recheck_request_refs: asArray<TopicSelectionFunctionalRef>(row.recheckRequestRefs),
    memory_suggestion_refs: asArray<TopicSelectionFunctionalRef>(row.memorySuggestionRefs),
    warnings: asArray<TopicSelectionGateIssue>(row.warnings),
    llm_draft_payload: row.llmDraftPayload === null || row.llmDraftPayload === undefined
      ? null
      : asRecord(row.llmDraftPayload) as TopicSelectionPromotionDecisionSupportLlmDraft,
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    created_by: row.createdBy as TopicSelectionPromotionDecisionSupportRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toDossierRecord(
  row: TopicSelectionPromotionDossier,
): TopicSelectionPromotionDossierRecord {
  return {
    promotion_dossier_id: row.id,
    support_run_key: row.supportRunKey,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    promotion_decision_support_id: row.promotionDecisionSupportId,
    promotion_input_snapshot_id: row.promotionInputSnapshotId,
    topic_package_id: row.topicPackageId,
    package_version: row.packageVersion,
    summary: row.summary,
    reviewer_packet_artifact_ref: asFunctionalRef(row.reviewerPacketArtifactRef),
    dossier_payload: asRecord(row.dossierPayload),
    source_refs: asArray<TopicSelectionFunctionalRef>(row.sourceRefs),
    risk_finding_refs: topicSelectionRiskFindingRefs(asArray<TopicSelectionFunctionalRef>(row.sourceRefs)),
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    created_by: row.createdBy as TopicSelectionPromotionDossierRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toMiniCheckRecord(
  row: TopicSelectionArgumentReadinessMiniCheck,
): TopicSelectionArgumentReadinessMiniCheckRecord {
  return {
    argument_readiness_mini_check_id: row.id,
    support_run_key: row.supportRunKey,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    promotion_decision_support_id: row.promotionDecisionSupportId,
    promotion_input_snapshot_id: row.promotionInputSnapshotId,
    check_status: row.checkStatus as TopicSelectionArgumentReadinessMiniCheckRecord['check_status'],
    check_items: asArray<TopicSelectionArgumentReadinessMiniCheckRecord['check_items'][number]>(row.checkItems),
    blockers: asArray<TopicSelectionGateIssue>(row.blockers),
    warnings: asArray<TopicSelectionGateIssue>(row.warnings),
    required_actions: asArray<TopicSelectionPromotionGateRequiredAction>(row.requiredActions),
    early_check_obligations: row.earlyCheckObligations,
    source_refs: asArray<TopicSelectionFunctionalRef>(row.sourceRefs),
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    created_by: row.createdBy as TopicSelectionArgumentReadinessMiniCheckRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toGateCheckRecord(
  row: TopicSelectionPromotionGateCheck,
): TopicSelectionPromotionGateCheckRecord {
  return {
    promotion_gate_check_id: row.id,
    support_run_key: row.supportRunKey,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    promotion_decision_support_id: row.promotionDecisionSupportId,
    promotion_dossier_id: row.promotionDossierId,
    argument_readiness_mini_check_id: row.argumentReadinessMiniCheckId,
    promotion_input_snapshot_id: row.promotionInputSnapshotId,
    promotion_input_snapshot_ref: asFunctionalRef(row.promotionInputSnapshotRef),
    promotion_input_snapshot_hash: row.promotionInputSnapshotHash,
    disposition: row.disposition as TopicSelectionPromotionGateCheckRecord['disposition'],
    promote_allowed: row.promoteAllowed,
    blockers: asArray<TopicSelectionGateIssue>(row.blockers),
    warnings: asArray<TopicSelectionGateIssue>(row.warnings),
    required_actions: asArray<TopicSelectionPromotionGateRequiredAction>(row.requiredActions),
    loopback_hints: asArray<TopicSelectionPromotionGateLoopbackHint>(row.loopbackHints),
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    risk_finding_refs: topicSelectionRiskFindingRefs(asArray<TopicSelectionFunctionalRef>(row.sourceRefs)),
    blocker_refs: asArray<TopicSelectionFunctionalRef>(row.blockerRefs),
    recheck_request_refs: asArray<TopicSelectionFunctionalRef>(row.recheckRequestRefs),
    memory_suggestion_refs: asArray<TopicSelectionFunctionalRef>(row.memorySuggestionRefs),
    source_refs: asArray<TopicSelectionFunctionalRef>(row.sourceRefs),
    snapshot_hashes: asRecord(row.snapshotHashes) as TopicSelectionPromotionGateCheckRecord['snapshot_hashes'],
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    trace_snapshot_id: row.traceSnapshotId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    created_by: row.createdBy as TopicSelectionPromotionGateCheckRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

export class PrismaTopicSelectionV1cPromotionGateRepository
implements TopicSelectionV1cPromotionGateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createBundle(
    persistence: TopicSelectionV1cPromotionGatePersistenceBundle,
  ): Promise<TopicSelectionV1cPromotionGateRecordBundle> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.createControlPlaneRecords(tx, persistence.control_plane);
        await tx.topicSelectionPromotionDecisionSupport.create({
          data: this.toDecisionSupportCreateInput(persistence.promotion_decision_support),
        });
        await tx.topicSelectionPromotionDossier.create({
          data: this.toDossierCreateInput(persistence.promotion_dossier),
        });
        await tx.topicSelectionArgumentReadinessMiniCheck.create({
          data: this.toMiniCheckCreateInput(persistence.argument_readiness_mini_check),
        });
        await tx.topicSelectionPromotionGateCheck.create({
          data: this.toGateCheckCreateInput(persistence.promotion_gate_check),
        });
      });
    } catch (error) {
      if (this.isSupportRunUniqueConflict(error)) {
        const existing = await this.findBundleBySupportRunKey(
          persistence.promotion_decision_support.support_run_key,
        );
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
    return {
      promotion_decision_support: persistence.promotion_decision_support,
      promotion_dossier: persistence.promotion_dossier,
      argument_readiness_mini_check: persistence.argument_readiness_mini_check,
      promotion_gate_check: persistence.promotion_gate_check,
    };
  }

  async createSupportBundle(
    persistence: TopicSelectionV1cPromotionSupportPersistenceBundle,
  ): Promise<TopicSelectionV1cPromotionSupportRecordBundle> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.createSupportControlPlaneRecords(tx, persistence.control_plane);
        await tx.topicSelectionPromotionDecisionSupport.create({
          data: this.toDecisionSupportCreateInput(persistence.promotion_decision_support),
        });
        await tx.topicSelectionPromotionDossier.create({
          data: this.toDossierCreateInput(persistence.promotion_dossier),
        });
      });
    } catch (error) {
      if (this.isSupportRunUniqueConflict(error)) {
        const existing = await this.findSupportBundleBySupportRunKey(
          persistence.promotion_decision_support.support_run_key,
        );
        if (existing) return existing;
      }
      throw error;
    }
    return {
      promotion_decision_support: persistence.promotion_decision_support,
      promotion_dossier: persistence.promotion_dossier,
    };
  }

  async createGateCheckBundle(
    persistence: TopicSelectionV1cPromotionGateCheckPersistenceBundle,
  ): Promise<TopicSelectionV1cPromotionGateCheckRecordBundle> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.createGateCheckControlPlaneRecords(tx, persistence.control_plane);
        await tx.topicSelectionArgumentReadinessMiniCheck.create({
          data: this.toMiniCheckCreateInput(persistence.argument_readiness_mini_check),
        });
        await tx.topicSelectionPromotionGateCheck.create({
          data: this.toGateCheckCreateInput(persistence.promotion_gate_check),
        });
      });
    } catch (error) {
      if (this.isSupportRunUniqueConflict(error)) {
        const existing = await this.findGateCheckBundleBySupportRunKey(
          persistence.promotion_gate_check.support_run_key,
        );
        if (existing) return existing;
      }
      throw error;
    }
    return {
      argument_readiness_mini_check: persistence.argument_readiness_mini_check,
      promotion_gate_check: persistence.promotion_gate_check,
    };
  }

  async findBundleBySupportRunKey(
    supportRunKey: string,
  ): Promise<TopicSelectionV1cPromotionGateRecordBundle | null> {
    const support = await this.prisma.topicSelectionPromotionDecisionSupport.findUnique({
      where: { supportRunKey },
    });
    if (!support) {
      return null;
    }
    const [dossier, miniCheck, gateCheck] = await Promise.all([
      this.prisma.topicSelectionPromotionDossier.findUnique({ where: { supportRunKey } }),
      this.prisma.topicSelectionArgumentReadinessMiniCheck.findUnique({ where: { supportRunKey } }),
      this.prisma.topicSelectionPromotionGateCheck.findUnique({ where: { supportRunKey } }),
    ]);
    if (!dossier || !miniCheck || !gateCheck) {
      return null;
    }
    return {
      promotion_decision_support: toDecisionSupportRecord(support),
      promotion_dossier: toDossierRecord(dossier),
      argument_readiness_mini_check: toMiniCheckRecord(miniCheck),
      promotion_gate_check: toGateCheckRecord(gateCheck),
    };
  }

  async findSupportBundleBySupportRunKey(
    supportRunKey: string,
  ): Promise<TopicSelectionV1cPromotionSupportRecordBundle | null> {
    const support = await this.prisma.topicSelectionPromotionDecisionSupport.findUnique({
      where: { supportRunKey },
    });
    if (!support) return null;
    const dossier = await this.prisma.topicSelectionPromotionDossier.findUnique({
      where: { supportRunKey },
    });
    return dossier
      ? {
          promotion_decision_support: toDecisionSupportRecord(support),
          promotion_dossier: toDossierRecord(dossier),
        }
      : null;
  }

  async findSupportBundleByDecisionSupportId(
    promotionDecisionSupportId: string,
  ): Promise<TopicSelectionV1cPromotionSupportRecordBundle | null> {
    const support = await this.prisma.topicSelectionPromotionDecisionSupport.findUnique({
      where: { id: promotionDecisionSupportId },
    });
    return support ? this.findSupportBundleBySupportRunKey(support.supportRunKey) : null;
  }

  async findGateCheckBundleBySupportRunKey(
    supportRunKey: string,
  ): Promise<TopicSelectionV1cPromotionGateCheckRecordBundle | null> {
    const [miniCheck, gateCheck] = await Promise.all([
      this.prisma.topicSelectionArgumentReadinessMiniCheck.findUnique({ where: { supportRunKey } }),
      this.prisma.topicSelectionPromotionGateCheck.findUnique({ where: { supportRunKey } }),
    ]);
    return miniCheck && gateCheck
      ? {
          argument_readiness_mini_check: toMiniCheckRecord(miniCheck),
          promotion_gate_check: toGateCheckRecord(gateCheck),
        }
      : null;
  }

  async findLatestBundleByPromotionInputSnapshotId(
    promotionInputSnapshotId: string,
  ): Promise<TopicSelectionV1cPromotionGateRecordBundle | null> {
    const gateCheck = await this.prisma.topicSelectionPromotionGateCheck.findFirst({
      where: { promotionInputSnapshotId },
      orderBy: { createdAt: 'desc' },
    });
    return gateCheck ? this.findBundleBySupportRunKey(gateCheck.supportRunKey) : null;
  }

  async findDecisionSupportById(
    promotionDecisionSupportId: string,
  ): Promise<TopicSelectionPromotionDecisionSupportRecord | null> {
    const row = await this.prisma.topicSelectionPromotionDecisionSupport.findUnique({
      where: { id: promotionDecisionSupportId },
    });
    return row ? toDecisionSupportRecord(row) : null;
  }

  async findDossierById(
    promotionDossierId: string,
  ): Promise<TopicSelectionPromotionDossierRecord | null> {
    const row = await this.prisma.topicSelectionPromotionDossier.findUnique({
      where: { id: promotionDossierId },
    });
    return row ? toDossierRecord(row) : null;
  }

  async findArgumentReadinessMiniCheckById(
    argumentReadinessMiniCheckId: string,
  ): Promise<TopicSelectionArgumentReadinessMiniCheckRecord | null> {
    const row = await this.prisma.topicSelectionArgumentReadinessMiniCheck.findUnique({
      where: { id: argumentReadinessMiniCheckId },
    });
    return row ? toMiniCheckRecord(row) : null;
  }

  async findGateCheckById(
    promotionGateCheckId: string,
  ): Promise<TopicSelectionPromotionGateCheckRecord | null> {
    const row = await this.prisma.topicSelectionPromotionGateCheck.findUnique({
      where: { id: promotionGateCheckId },
    });
    return row ? toGateCheckRecord(row) : null;
  }

  async listGateChecksByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionPromotionGateCheckRecord[]> {
    const rows = await this.prisma.topicSelectionPromotionGateCheck.findMany({
      where: { titleCardId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toGateCheckRecord);
  }

  async findBundleByGateCheckId(
    promotionGateCheckId: string,
  ): Promise<TopicSelectionV1cPromotionGateRecordBundle | null> {
    const gateCheck = await this.prisma.topicSelectionPromotionGateCheck.findUnique({
      where: { id: promotionGateCheckId },
    });
    return gateCheck ? this.findBundleBySupportRunKey(gateCheck.supportRunKey) : null;
  }

  private async createControlPlaneRecords(
    tx: Prisma.TransactionClient,
    controlPlane: TopicSelectionV1cPromotionGateControlPlanePersistence,
  ): Promise<void> {
    await this.createSupportControlPlaneRecords(tx, controlPlane);
    await this.createGateCheckControlPlaneRecords(tx, controlPlane, {
      createInputSnapshotAndWorkflowRun: false,
    });
  }

  private async createSupportControlPlaneRecords(
    tx: Prisma.TransactionClient,
    controlPlane: TopicSelectionV1cPromotionSupportControlPlanePersistence,
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
  }

  private async createGateCheckControlPlaneRecords(
    tx: Prisma.TransactionClient,
    controlPlane: TopicSelectionV1cPromotionGateCheckControlPlanePersistence,
    options: { createInputSnapshotAndWorkflowRun?: boolean } = {},
  ): Promise<void> {
    if (options.createInputSnapshotAndWorkflowRun ?? true) {
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

  private toDecisionSupportCreateInput(
    record: TopicSelectionPromotionDecisionSupportRecord,
  ): Prisma.TopicSelectionPromotionDecisionSupportCreateInput {
    return {
      id: record.promotion_decision_support_id,
      supportRunKey: record.support_run_key,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      promotionInputSnapshotId: record.promotion_input_snapshot_id,
      promotionInputSnapshotRef: toJsonValue(record.promotion_input_snapshot_ref),
      promotionInputSnapshotHash: record.promotion_input_snapshot_hash,
      topicPackageId: record.topic_package_id,
      packageVersion: record.package_version,
      supportGenerationMode: record.support_generation_mode,
      supportStatus: record.support_status,
      summary: record.summary,
      reviewerQuestions: record.reviewer_questions,
      riskNotes: record.risk_notes,
      recheckNotes: record.recheck_notes,
      sourceRefs: toJsonValue(record.source_refs),
      acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
      blockerRefs: toJsonValue(record.blocker_refs),
      recheckRequestRefs: toJsonValue(record.recheck_request_refs),
      memorySuggestionRefs: toJsonValue(record.memory_suggestion_refs),
      warnings: toJsonValue(record.warnings),
      llmDraftPayload: nullableJson(record.llm_draft_payload ?? null),
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      createdBy: record.created_by,
      createdAt: new Date(record.created_at),
    };
  }

  private toDossierCreateInput(
    record: TopicSelectionPromotionDossierRecord,
  ): Prisma.TopicSelectionPromotionDossierCreateInput {
    return {
      id: record.promotion_dossier_id,
      supportRunKey: record.support_run_key,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      promotionDecisionSupportId: record.promotion_decision_support_id,
      promotionInputSnapshotId: record.promotion_input_snapshot_id,
      topicPackageId: record.topic_package_id,
      packageVersion: record.package_version,
      summary: record.summary,
      reviewerPacketArtifactRef: toJsonValue(record.reviewer_packet_artifact_ref),
      dossierPayload: toJsonValue(record.dossier_payload),
      sourceRefs: toJsonValue(record.source_refs),
      artifactRefs: toJsonValue(record.artifact_refs),
      createdBy: record.created_by,
      createdAt: new Date(record.created_at),
    };
  }

  private toMiniCheckCreateInput(
    record: TopicSelectionArgumentReadinessMiniCheckRecord,
  ): Prisma.TopicSelectionArgumentReadinessMiniCheckCreateInput {
    return {
      id: record.argument_readiness_mini_check_id,
      supportRunKey: record.support_run_key,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      promotionDecisionSupportId: record.promotion_decision_support_id,
      promotionInputSnapshotId: record.promotion_input_snapshot_id,
      checkStatus: record.check_status,
      checkItems: toJsonValue(record.check_items),
      blockers: toJsonValue(record.blockers),
      warnings: toJsonValue(record.warnings),
      requiredActions: toJsonValue(record.required_actions),
      earlyCheckObligations: record.early_check_obligations,
      sourceRefs: toJsonValue(record.source_refs),
      artifactRefs: toJsonValue(record.artifact_refs),
      createdBy: record.created_by,
      createdAt: new Date(record.created_at),
    };
  }

  private toGateCheckCreateInput(
    record: TopicSelectionPromotionGateCheckRecord,
  ): Prisma.TopicSelectionPromotionGateCheckCreateInput {
    return {
      id: record.promotion_gate_check_id,
      supportRunKey: record.support_run_key,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      promotionDecisionSupportId: record.promotion_decision_support_id,
      promotionDossierId: record.promotion_dossier_id,
      argumentReadinessMiniCheckId: record.argument_readiness_mini_check_id,
      promotionInputSnapshotId: record.promotion_input_snapshot_id,
      promotionInputSnapshotRef: toJsonValue(record.promotion_input_snapshot_ref),
      promotionInputSnapshotHash: record.promotion_input_snapshot_hash,
      disposition: record.disposition,
      promoteAllowed: record.promote_allowed,
      blockers: toJsonValue(record.blockers),
      warnings: toJsonValue(record.warnings),
      requiredActions: toJsonValue(record.required_actions),
      loopbackHints: toJsonValue(record.loopback_hints),
      acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
      blockerRefs: toJsonValue(record.blocker_refs),
      recheckRequestRefs: toJsonValue(record.recheck_request_refs),
      memorySuggestionRefs: toJsonValue(record.memory_suggestion_refs),
      sourceRefs: toJsonValue(record.source_refs),
      snapshotHashes: toJsonValue(record.snapshot_hashes),
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

  private isSupportRunUniqueConflict(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      return false;
    }
    const target = error.meta?.target;
    return Array.isArray(target)
      ? target.includes('supportRunKey')
      : target === 'supportRunKey';
  }
}
