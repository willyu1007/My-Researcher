import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionChainTransitionAttemptRecord,
  TopicSelectionContextPolicyVersionRecord,
  TopicSelectionFunctionalLineageLinkRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionHumanConfirmedDecisionRecord,
  TopicSelectionInputSnapshotRecord,
  TopicSelectionLlmWorkflowRunRecord,
  TopicSelectionQualitySignalRecord,
  TopicSelectionReadinessGateResultRecord,
  TopicSelectionTraceSnapshotRecord,
  TopicSelectionTransitionPolicyVersionRecord,
  TopicSelectionWorkflowProfilePolicyRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionControlPlaneRepository,
  TopicSelectionWorkflowRunWithArtifactRefsResult,
} from '../topic-selection-control-plane.repository.js';

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

function refFromColumns(row: {
  refType: string;
  refId: string;
  versionId?: string | null;
  titleCardId?: string | null;
}): TopicSelectionFunctionalRef {
  return {
    ref_type: row.refType,
    ref_id: row.refId,
    version_id: row.versionId ?? null,
    title_card_id: row.titleCardId ?? null,
  };
}

function toContextPolicyRecord(row: {
  id: string;
  policyKey: string;
  version: string;
  status: string;
  config: Prisma.JsonValue;
  createdBy: string;
  createdAt: Date;
  retiredAt: Date | null;
}): TopicSelectionContextPolicyVersionRecord {
  return {
    context_policy_version_id: row.id,
    policy_key: row.policyKey,
    version: row.version,
    status: row.status as TopicSelectionContextPolicyVersionRecord['status'],
    config: asRecord(row.config),
    created_by: row.createdBy as TopicSelectionContextPolicyVersionRecord['created_by'],
    created_at: row.createdAt.toISOString(),
    retired_at: row.retiredAt?.toISOString() ?? null,
  };
}

function toWorkflowProfilePolicyRecord(row: {
  id: string;
  profileKey: string;
  workflowKey: string;
  policyVersionId: string | null;
  status: string;
  config: Prisma.JsonValue;
  createdBy: string;
  createdAt: Date;
  retiredAt: Date | null;
}): TopicSelectionWorkflowProfilePolicyRecord {
  return {
    workflow_profile_policy_id: row.id,
    profile_key: row.profileKey,
    workflow_key: row.workflowKey,
    policy_version_id: row.policyVersionId,
    status: row.status as TopicSelectionWorkflowProfilePolicyRecord['status'],
    config: asRecord(row.config),
    created_by: row.createdBy as TopicSelectionWorkflowProfilePolicyRecord['created_by'],
    created_at: row.createdAt.toISOString(),
    retired_at: row.retiredAt?.toISOString() ?? null,
  };
}

function toTransitionPolicyRecord(row: {
  id: string;
  transitionKey: string;
  version: string;
  status: string;
  config: Prisma.JsonValue;
  createdBy: string;
  createdAt: Date;
  retiredAt: Date | null;
}): TopicSelectionTransitionPolicyVersionRecord {
  return {
    transition_policy_version_id: row.id,
    transition_key: row.transitionKey,
    version: row.version,
    status: row.status as TopicSelectionTransitionPolicyVersionRecord['status'],
    config: asRecord(row.config),
    created_by: row.createdBy as TopicSelectionTransitionPolicyVersionRecord['created_by'],
    created_at: row.createdAt.toISOString(),
    retired_at: row.retiredAt?.toISOString() ?? null,
  };
}

function toInputSnapshotRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string | null;
  targetRefType: string;
  targetRefId: string;
  targetVersionId: string | null;
  contextPolicyVersionId: string | null;
  policyVersion: string | null;
  snapshotHash: string;
  sourceRefs: Prisma.JsonValue;
  permissionRefs: Prisma.JsonValue;
  payload: Prisma.JsonValue;
  createdBy: string;
  createdAt: Date;
}): TopicSelectionInputSnapshotRecord {
  return {
    input_snapshot_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    target_ref: refFromColumns({
      refType: row.targetRefType,
      refId: row.targetRefId,
      versionId: row.targetVersionId,
      titleCardId: row.titleCardId,
    }),
    context_policy_version_id: row.contextPolicyVersionId,
    policy_version: row.policyVersion,
    snapshot_hash: row.snapshotHash,
    source_refs: asArray<TopicSelectionFunctionalRef>(row.sourceRefs),
    permission_refs: asArray<TopicSelectionFunctionalRef>(row.permissionRefs),
    payload: asRecord(row.payload),
    created_by: row.createdBy as TopicSelectionInputSnapshotRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toArtifactRefRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string | null;
  artifactKind: string;
  storageKind: string;
  uri: string | null;
  payload: Prisma.JsonValue | null;
  checksum: string | null;
  byteSize: number | null;
  mimeType: string | null;
  workflowRunId: string | null;
  inputSnapshotId: string | null;
  createdBy: string;
  createdAt: Date;
}): TopicSelectionArtifactRefRecord {
  return {
    artifact_ref_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    artifact_kind: row.artifactKind as TopicSelectionArtifactRefRecord['artifact_kind'],
    storage_kind: row.storageKind as TopicSelectionArtifactRefRecord['storage_kind'],
    uri: row.uri,
    payload: row.payload === null ? null : asRecord(row.payload),
    checksum: row.checksum,
    byte_size: row.byteSize,
    mime_type: row.mimeType,
    workflow_run_id: row.workflowRunId,
    input_snapshot_id: row.inputSnapshotId,
    created_by: row.createdBy as TopicSelectionArtifactRefRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toWorkflowRunRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string | null;
  workflowKey: string;
  workflowProfileKey: string;
  workflowProfileVersion: string | null;
  inputSnapshotId: string | null;
  status: string;
  providerId: string | null;
  modelId: string | null;
  promptTemplateId: string | null;
  promptTemplateVersion: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  telemetry: Prisma.JsonValue;
  outputSummary: Prisma.JsonValue;
  errorCode: string | null;
  errorMessage: string | null;
  createdBy: string;
}): TopicSelectionLlmWorkflowRunRecord {
  return {
    workflow_run_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    workflow_key: row.workflowKey,
    workflow_profile_key: row.workflowProfileKey,
    workflow_profile_version: row.workflowProfileVersion,
    input_snapshot_id: row.inputSnapshotId,
    status: row.status as TopicSelectionLlmWorkflowRunRecord['status'],
    provider_id: row.providerId,
    model_id: row.modelId,
    prompt_template_id: row.promptTemplateId,
    prompt_template_version: row.promptTemplateVersion,
    started_at: row.startedAt.toISOString(),
    finished_at: row.finishedAt?.toISOString() ?? null,
    telemetry: asRecord(row.telemetry),
    output_summary: asRecord(row.outputSummary),
    error_code: row.errorCode,
    error_message: row.errorMessage,
    created_by: row.createdBy as TopicSelectionLlmWorkflowRunRecord['created_by'],
  };
}

function toQualitySignalRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string | null;
  targetRefType: string;
  targetRefId: string;
  targetVersionId: string | null;
  stage: string;
  checkType: string;
  verdict: string;
  issueCodes: string[];
  recommendedAction: string | null;
  blockingTransitionKeys: string[];
  refs: Prisma.JsonValue;
  confidence: number | null;
  workflowRunId: string | null;
  artifactRefs: Prisma.JsonValue;
  emittedBy: string;
  createdAt: Date;
}): TopicSelectionQualitySignalRecord {
  return {
    quality_signal_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    target_ref: refFromColumns({
      refType: row.targetRefType,
      refId: row.targetRefId,
      versionId: row.targetVersionId,
      titleCardId: row.titleCardId,
    }),
    stage: row.stage,
    check_type: row.checkType,
    verdict: row.verdict as TopicSelectionQualitySignalRecord['verdict'],
    issue_codes: row.issueCodes,
    recommended_action: row.recommendedAction,
    blocking_transition_keys: row.blockingTransitionKeys,
    refs: asArray<TopicSelectionFunctionalRef>(row.refs),
    confidence: row.confidence,
    workflow_run_id: row.workflowRunId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    emitted_by: row.emittedBy as TopicSelectionQualitySignalRecord['emitted_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toGateResultRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string | null;
  gateKey: string;
  targetRefType: string;
  targetRefId: string;
  targetVersionId: string | null;
  inputSnapshotId: string | null;
  workflowRunId: string | null;
  policyVersionId: string | null;
  verdict: string;
  blockers: Prisma.JsonValue;
  warnings: Prisma.JsonValue;
  requiredActions: Prisma.JsonValue;
  loopbackTarget: Prisma.JsonValue | null;
  acceptedRiskRefs: Prisma.JsonValue;
  qualitySignalRefs: Prisma.JsonValue;
  createdBy: string;
  createdAt: Date;
}): TopicSelectionReadinessGateResultRecord {
  return {
    readiness_gate_result_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    gate_key: row.gateKey,
    target_ref: refFromColumns({
      refType: row.targetRefType,
      refId: row.targetRefId,
      versionId: row.targetVersionId,
      titleCardId: row.titleCardId,
    }),
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    policy_version_id: row.policyVersionId,
    verdict: row.verdict as TopicSelectionReadinessGateResultRecord['verdict'],
    blockers: asArray<TopicSelectionReadinessGateResultRecord['blockers'][number]>(row.blockers),
    warnings: asArray<TopicSelectionReadinessGateResultRecord['warnings'][number]>(row.warnings),
    required_actions: asArray<string>(row.requiredActions),
    loopback_target: row.loopbackTarget === null ? null : (row.loopbackTarget as unknown as TopicSelectionFunctionalRef),
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    quality_signal_refs: asArray<TopicSelectionFunctionalRef>(row.qualitySignalRefs),
    created_by: row.createdBy as TopicSelectionReadinessGateResultRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toTransitionAttemptRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string | null;
  transitionKey: string;
  sourceRefType: string;
  sourceRefId: string;
  sourceVersionId: string | null;
  targetRefType: string | null;
  targetRefId: string | null;
  targetVersionId: string | null;
  gateResultId: string | null;
  workflowRunId: string | null;
  inputSnapshotId: string | null;
  policyVersionId: string | null;
  actorType: string;
  actorId: string | null;
  result: string;
  reason: string;
  requiredActions: Prisma.JsonValue;
  blockers: Prisma.JsonValue;
  acceptedRiskRefs: Prisma.JsonValue;
  stateWriteIntents: Prisma.JsonValue;
  createdAuthorityRefs: Prisma.JsonValue;
  createdAt: Date;
}): TopicSelectionChainTransitionAttemptRecord {
  const targetRef = row.targetRefType && row.targetRefId
    ? refFromColumns({
        refType: row.targetRefType,
        refId: row.targetRefId,
        versionId: row.targetVersionId,
        titleCardId: row.titleCardId,
      })
    : null;
  return {
    chain_transition_attempt_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    transition_key: row.transitionKey,
    source_ref: refFromColumns({
      refType: row.sourceRefType,
      refId: row.sourceRefId,
      versionId: row.sourceVersionId,
      titleCardId: row.titleCardId,
    }),
    target_ref: targetRef,
    gate_result_id: row.gateResultId,
    workflow_run_id: row.workflowRunId,
    input_snapshot_id: row.inputSnapshotId,
    policy_version_id: row.policyVersionId,
    actor: {
      actor_type: row.actorType as TopicSelectionChainTransitionAttemptRecord['actor']['actor_type'],
      actor_id: row.actorId,
    },
    result: row.result as TopicSelectionChainTransitionAttemptRecord['result'],
    reason: row.reason,
    required_actions: asArray<string>(row.requiredActions),
    blockers: asArray<TopicSelectionChainTransitionAttemptRecord['blockers'][number]>(row.blockers),
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    state_write_intents: asArray<TopicSelectionChainTransitionAttemptRecord['state_write_intents'][number]>(row.stateWriteIntents),
    created_authority_refs: asArray<TopicSelectionFunctionalRef>(row.createdAuthorityRefs),
    created_at: row.createdAt.toISOString(),
  };
}

function toLineageLinkRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string | null;
  sourceRefType: string;
  sourceRefId: string;
  sourceVersionId: string | null;
  targetRefType: string;
  targetRefId: string;
  targetVersionId: string | null;
  relationType: string;
  artifactRefs: Prisma.JsonValue;
  createdBy: string;
  createdAt: Date;
}): TopicSelectionFunctionalLineageLinkRecord {
  return {
    functional_lineage_link_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    source_ref: refFromColumns({
      refType: row.sourceRefType,
      refId: row.sourceRefId,
      versionId: row.sourceVersionId,
      titleCardId: row.titleCardId,
    }),
    target_ref: refFromColumns({
      refType: row.targetRefType,
      refId: row.targetRefId,
      versionId: row.targetVersionId,
      titleCardId: row.titleCardId,
    }),
    relation_type: row.relationType as TopicSelectionFunctionalLineageLinkRecord['relation_type'],
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    created_by: row.createdBy as TopicSelectionFunctionalLineageLinkRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toTraceSnapshotRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string | null;
  targetRefType: string;
  targetRefId: string;
  targetVersionId: string | null;
  snapshotHash: string;
  objectRefs: Prisma.JsonValue;
  lineageLinkRefs: Prisma.JsonValue;
  artifactRefs: Prisma.JsonValue;
  qualitySignalRefs: Prisma.JsonValue;
  transitionAttemptRefs: Prisma.JsonValue;
  payload: Prisma.JsonValue;
  createdBy: string;
  createdAt: Date;
}): TopicSelectionTraceSnapshotRecord {
  return {
    trace_snapshot_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    target_ref: refFromColumns({
      refType: row.targetRefType,
      refId: row.targetRefId,
      versionId: row.targetVersionId,
      titleCardId: row.titleCardId,
    }),
    snapshot_hash: row.snapshotHash,
    object_refs: asArray<TopicSelectionFunctionalRef>(row.objectRefs),
    lineage_link_refs: asArray<TopicSelectionFunctionalRef>(row.lineageLinkRefs),
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    quality_signal_refs: asArray<TopicSelectionFunctionalRef>(row.qualitySignalRefs),
    transition_attempt_refs: asArray<TopicSelectionFunctionalRef>(row.transitionAttemptRefs),
    payload: asRecord(row.payload),
    created_by: row.createdBy as TopicSelectionTraceSnapshotRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toHumanDecisionRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string | null;
  targetRefType: string;
  targetRefId: string;
  targetVersionId: string | null;
  decisionType: string;
  actorType: string;
  actorId: string | null;
  rationale: string | null;
  artifactRefs: Prisma.JsonValue;
  policyVersionId: string | null;
  resultingAuthorityRefs: Prisma.JsonValue;
  createdAt: Date;
}): TopicSelectionHumanConfirmedDecisionRecord {
  return {
    human_confirmed_decision_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    target_ref: refFromColumns({
      refType: row.targetRefType,
      refId: row.targetRefId,
      versionId: row.targetVersionId,
      titleCardId: row.titleCardId,
    }),
    decision_type: row.decisionType as TopicSelectionHumanConfirmedDecisionRecord['decision_type'],
    actor: {
      actor_type: row.actorType as TopicSelectionHumanConfirmedDecisionRecord['actor']['actor_type'],
      actor_id: row.actorId,
    },
    rationale: row.rationale,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    policy_version_id: row.policyVersionId,
    resulting_authority_refs: asArray<TopicSelectionFunctionalRef>(row.resultingAuthorityRefs),
    created_at: row.createdAt.toISOString(),
  };
}

export class PrismaTopicSelectionControlPlaneRepository implements TopicSelectionControlPlaneRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createContextPolicyVersion(
    record: TopicSelectionContextPolicyVersionRecord,
  ): Promise<TopicSelectionContextPolicyVersionRecord> {
    const row = await this.prisma.topicSelectionContextPolicyVersion.create({
      data: {
        id: record.context_policy_version_id,
        policyKey: record.policy_key,
        version: record.version,
        status: record.status,
        config: toJsonValue(record.config),
        createdBy: record.created_by,
        createdAt: new Date(record.created_at),
        retiredAt: record.retired_at ? new Date(record.retired_at) : null,
      },
    });
    return toContextPolicyRecord(row);
  }

  async findContextPolicyVersionById(
    contextPolicyVersionId: string,
  ): Promise<TopicSelectionContextPolicyVersionRecord | null> {
    const row = await this.prisma.topicSelectionContextPolicyVersion.findUnique({
      where: { id: contextPolicyVersionId },
    });
    return row ? toContextPolicyRecord(row) : null;
  }

  async createWorkflowProfilePolicy(
    record: TopicSelectionWorkflowProfilePolicyRecord,
  ): Promise<TopicSelectionWorkflowProfilePolicyRecord> {
    const row = await this.prisma.topicSelectionWorkflowProfilePolicy.create({
      data: {
        id: record.workflow_profile_policy_id,
        profileKey: record.profile_key,
        workflowKey: record.workflow_key,
        policyVersionId: record.policy_version_id ?? null,
        status: record.status,
        config: toJsonValue(record.config),
        createdBy: record.created_by,
        createdAt: new Date(record.created_at),
        retiredAt: record.retired_at ? new Date(record.retired_at) : null,
      },
    });
    return toWorkflowProfilePolicyRecord(row);
  }

  async findWorkflowProfilePolicyById(
    workflowProfilePolicyId: string,
  ): Promise<TopicSelectionWorkflowProfilePolicyRecord | null> {
    const row = await this.prisma.topicSelectionWorkflowProfilePolicy.findUnique({
      where: { id: workflowProfilePolicyId },
    });
    return row ? toWorkflowProfilePolicyRecord(row) : null;
  }

  async createTransitionPolicyVersion(
    record: TopicSelectionTransitionPolicyVersionRecord,
  ): Promise<TopicSelectionTransitionPolicyVersionRecord> {
    const row = await this.prisma.topicSelectionTransitionPolicyVersion.create({
      data: {
        id: record.transition_policy_version_id,
        transitionKey: record.transition_key,
        version: record.version,
        status: record.status,
        config: toJsonValue(record.config),
        createdBy: record.created_by,
        createdAt: new Date(record.created_at),
        retiredAt: record.retired_at ? new Date(record.retired_at) : null,
      },
    });
    return toTransitionPolicyRecord(row);
  }

  async findTransitionPolicyVersionById(
    transitionPolicyVersionId: string,
  ): Promise<TopicSelectionTransitionPolicyVersionRecord | null> {
    const row = await this.prisma.topicSelectionTransitionPolicyVersion.findUnique({
      where: { id: transitionPolicyVersionId },
    });
    return row ? toTransitionPolicyRecord(row) : null;
  }

  async createInputSnapshot(record: TopicSelectionInputSnapshotRecord): Promise<TopicSelectionInputSnapshotRecord> {
    const row = await this.prisma.topicSelectionInputSnapshot.upsert({
      where: { id: record.input_snapshot_id },
      update: {},
      create: {
        id: record.input_snapshot_id,
        workspaceId: record.workspace_id ?? null,
        titleCardId: record.title_card_id ?? null,
        targetRefType: record.target_ref.ref_type,
        targetRefId: record.target_ref.ref_id,
        targetVersionId: record.target_ref.version_id ?? null,
        contextPolicyVersionId: record.context_policy_version_id ?? null,
        policyVersion: record.policy_version ?? null,
        snapshotHash: record.snapshot_hash,
        sourceRefs: toJsonValue(record.source_refs),
        permissionRefs: toJsonValue(record.permission_refs),
        payload: toJsonValue(record.payload),
        createdBy: record.created_by,
        createdAt: new Date(record.created_at),
      },
    });
    return toInputSnapshotRecord(row);
  }

  async findInputSnapshotById(inputSnapshotId: string): Promise<TopicSelectionInputSnapshotRecord | null> {
    const row = await this.prisma.topicSelectionInputSnapshot.findUnique({
      where: { id: inputSnapshotId },
    });
    return row ? toInputSnapshotRecord(row) : null;
  }

  async createArtifactRef(record: TopicSelectionArtifactRefRecord): Promise<TopicSelectionArtifactRefRecord> {
    const row = await this.prisma.topicSelectionArtifactRef.create({
      data: {
        id: record.artifact_ref_id,
        workspaceId: record.workspace_id ?? null,
        titleCardId: record.title_card_id ?? null,
        artifactKind: record.artifact_kind,
        storageKind: record.storage_kind,
        uri: record.uri ?? null,
        payload: record.payload === null || record.payload === undefined ? undefined : toJsonValue(record.payload),
        checksum: record.checksum ?? null,
        byteSize: record.byte_size ?? null,
        mimeType: record.mime_type ?? null,
        workflowRunId: record.workflow_run_id ?? null,
        inputSnapshotId: record.input_snapshot_id ?? null,
        createdBy: record.created_by,
        createdAt: new Date(record.created_at),
      },
    });
    return toArtifactRefRecord(row);
  }

  async findArtifactRefById(artifactRefId: string): Promise<TopicSelectionArtifactRefRecord | null> {
    const row = await this.prisma.topicSelectionArtifactRef.findUnique({
      where: { id: artifactRefId },
    });
    return row ? toArtifactRefRecord(row) : null;
  }

  async listArtifactRefsByWorkflowRunId(workflowRunId: string): Promise<TopicSelectionArtifactRefRecord[]> {
    const rows = await this.prisma.topicSelectionArtifactRef.findMany({
      where: { workflowRunId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => toArtifactRefRecord(row));
  }

  async listArtifactRefsByInputSnapshotId(inputSnapshotId: string): Promise<TopicSelectionArtifactRefRecord[]> {
    const rows = await this.prisma.topicSelectionArtifactRef.findMany({
      where: { inputSnapshotId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => toArtifactRefRecord(row));
  }

  async createWorkflowRun(record: TopicSelectionLlmWorkflowRunRecord): Promise<TopicSelectionLlmWorkflowRunRecord> {
    const row = await this.prisma.topicSelectionLlmWorkflowRun.create({
      data: {
        id: record.workflow_run_id,
        workspaceId: record.workspace_id ?? null,
        titleCardId: record.title_card_id ?? null,
        workflowKey: record.workflow_key,
        workflowProfileKey: record.workflow_profile_key,
        workflowProfileVersion: record.workflow_profile_version ?? null,
        inputSnapshotId: record.input_snapshot_id ?? null,
        status: record.status,
        providerId: record.provider_id ?? null,
        modelId: record.model_id ?? null,
        promptTemplateId: record.prompt_template_id ?? null,
        promptTemplateVersion: record.prompt_template_version ?? null,
        startedAt: new Date(record.started_at),
        finishedAt: record.finished_at ? new Date(record.finished_at) : null,
        telemetry: toJsonValue(record.telemetry),
        outputSummary: toJsonValue(record.output_summary),
        errorCode: record.error_code ?? null,
        errorMessage: record.error_message ?? null,
        createdBy: record.created_by,
      },
    });
    return toWorkflowRunRecord(row);
  }

  async createWorkflowRunWithArtifactRefs(
    workflowRun: TopicSelectionLlmWorkflowRunRecord,
    artifactRefs: TopicSelectionArtifactRefRecord[],
  ): Promise<TopicSelectionWorkflowRunWithArtifactRefsResult> {
    return this.prisma.$transaction(async (tx) => {
      const workflowRunRow = await tx.topicSelectionLlmWorkflowRun.create({
        data: {
          id: workflowRun.workflow_run_id,
          workspaceId: workflowRun.workspace_id ?? null,
          titleCardId: workflowRun.title_card_id ?? null,
          workflowKey: workflowRun.workflow_key,
          workflowProfileKey: workflowRun.workflow_profile_key,
          workflowProfileVersion: workflowRun.workflow_profile_version ?? null,
          inputSnapshotId: workflowRun.input_snapshot_id ?? null,
          status: workflowRun.status,
          providerId: workflowRun.provider_id ?? null,
          modelId: workflowRun.model_id ?? null,
          promptTemplateId: workflowRun.prompt_template_id ?? null,
          promptTemplateVersion: workflowRun.prompt_template_version ?? null,
          startedAt: new Date(workflowRun.started_at),
          finishedAt: workflowRun.finished_at ? new Date(workflowRun.finished_at) : null,
          telemetry: toJsonValue(workflowRun.telemetry),
          outputSummary: toJsonValue(workflowRun.output_summary),
          errorCode: workflowRun.error_code ?? null,
          errorMessage: workflowRun.error_message ?? null,
          createdBy: workflowRun.created_by,
        },
      });

      const artifactRows = [];
      for (const artifactRef of artifactRefs) {
        artifactRows.push(await tx.topicSelectionArtifactRef.create({
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
        }));
      }

      return {
        workflow_run: toWorkflowRunRecord(workflowRunRow),
        artifact_refs: artifactRows.map((row) => toArtifactRefRecord(row)),
      };
    });
  }

  async findWorkflowRunById(workflowRunId: string): Promise<TopicSelectionLlmWorkflowRunRecord | null> {
    const row = await this.prisma.topicSelectionLlmWorkflowRun.findUnique({
      where: { id: workflowRunId },
    });
    return row ? toWorkflowRunRecord(row) : null;
  }

  async updateWorkflowRun(
    workflowRunId: string,
    patch: Partial<Omit<TopicSelectionLlmWorkflowRunRecord, 'workflow_run_id' | 'started_at' | 'created_by'>>,
  ): Promise<TopicSelectionLlmWorkflowRunRecord> {
    const row = await this.prisma.topicSelectionLlmWorkflowRun.update({
      where: { id: workflowRunId },
      data: {
        workspaceId: patch.workspace_id,
        titleCardId: patch.title_card_id,
        workflowKey: patch.workflow_key,
        workflowProfileKey: patch.workflow_profile_key,
        workflowProfileVersion: patch.workflow_profile_version,
        inputSnapshotId: patch.input_snapshot_id,
        status: patch.status,
        providerId: patch.provider_id,
        modelId: patch.model_id,
        promptTemplateId: patch.prompt_template_id,
        promptTemplateVersion: patch.prompt_template_version,
        finishedAt: patch.finished_at ? new Date(patch.finished_at) : patch.finished_at,
        telemetry: patch.telemetry === undefined ? undefined : toJsonValue(patch.telemetry),
        outputSummary: patch.output_summary === undefined ? undefined : toJsonValue(patch.output_summary),
        errorCode: patch.error_code,
        errorMessage: patch.error_message,
      },
    });
    return toWorkflowRunRecord(row);
  }

  async createReadinessGateResult(
    record: TopicSelectionReadinessGateResultRecord,
  ): Promise<TopicSelectionReadinessGateResultRecord> {
    const row = await this.prisma.topicSelectionReadinessGateResult.create({
      data: {
        id: record.readiness_gate_result_id,
        workspaceId: record.workspace_id ?? null,
        titleCardId: record.title_card_id ?? null,
        gateKey: record.gate_key,
        targetRefType: record.target_ref.ref_type,
        targetRefId: record.target_ref.ref_id,
        targetVersionId: record.target_ref.version_id ?? null,
        inputSnapshotId: record.input_snapshot_id ?? null,
        workflowRunId: record.workflow_run_id ?? null,
        policyVersionId: record.policy_version_id ?? null,
        verdict: record.verdict,
        blockers: toJsonValue(record.blockers),
        warnings: toJsonValue(record.warnings),
        requiredActions: toJsonValue(record.required_actions),
        loopbackTarget: record.loopback_target ? toJsonValue(record.loopback_target) : undefined,
        acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
        qualitySignalRefs: toJsonValue(record.quality_signal_refs),
        createdBy: record.created_by,
        createdAt: new Date(record.created_at),
      },
    });
    return toGateResultRecord(row);
  }

  async findReadinessGateResultById(
    readinessGateResultId: string,
  ): Promise<TopicSelectionReadinessGateResultRecord | null> {
    const row = await this.prisma.topicSelectionReadinessGateResult.findUnique({
      where: { id: readinessGateResultId },
    });
    return row ? toGateResultRecord(row) : null;
  }

  async createQualitySignal(record: TopicSelectionQualitySignalRecord): Promise<TopicSelectionQualitySignalRecord> {
    const row = await this.prisma.topicSelectionQualitySignal.create({
      data: {
        id: record.quality_signal_id,
        workspaceId: record.workspace_id ?? null,
        titleCardId: record.title_card_id ?? null,
        targetRefType: record.target_ref.ref_type,
        targetRefId: record.target_ref.ref_id,
        targetVersionId: record.target_ref.version_id ?? null,
        stage: record.stage,
        checkType: record.check_type,
        verdict: record.verdict,
        issueCodes: record.issue_codes,
        recommendedAction: record.recommended_action ?? null,
        blockingTransitionKeys: record.blocking_transition_keys,
        refs: toJsonValue(record.refs),
        confidence: record.confidence ?? null,
        workflowRunId: record.workflow_run_id ?? null,
        artifactRefs: toJsonValue(record.artifact_refs),
        emittedBy: record.emitted_by,
        createdAt: new Date(record.created_at),
      },
    });
    return toQualitySignalRecord(row);
  }

  async findQualitySignalById(qualitySignalId: string): Promise<TopicSelectionQualitySignalRecord | null> {
    const row = await this.prisma.topicSelectionQualitySignal.findUnique({
      where: { id: qualitySignalId },
    });
    return row ? toQualitySignalRecord(row) : null;
  }

  async createChainTransitionAttempt(
    record: TopicSelectionChainTransitionAttemptRecord,
  ): Promise<TopicSelectionChainTransitionAttemptRecord> {
    const row = await this.prisma.topicSelectionChainTransitionAttempt.create({
      data: {
        id: record.chain_transition_attempt_id,
        workspaceId: record.workspace_id ?? null,
        titleCardId: record.title_card_id ?? null,
        transitionKey: record.transition_key,
        sourceRefType: record.source_ref.ref_type,
        sourceRefId: record.source_ref.ref_id,
        sourceVersionId: record.source_ref.version_id ?? null,
        targetRefType: record.target_ref?.ref_type ?? null,
        targetRefId: record.target_ref?.ref_id ?? null,
        targetVersionId: record.target_ref?.version_id ?? null,
        gateResultId: record.gate_result_id ?? null,
        workflowRunId: record.workflow_run_id ?? null,
        inputSnapshotId: record.input_snapshot_id ?? null,
        policyVersionId: record.policy_version_id ?? null,
        actorType: record.actor.actor_type,
        actorId: record.actor.actor_id ?? null,
        result: record.result,
        reason: record.reason,
        requiredActions: toJsonValue(record.required_actions),
        blockers: toJsonValue(record.blockers),
        acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
        stateWriteIntents: toJsonValue(record.state_write_intents),
        createdAuthorityRefs: toJsonValue(record.created_authority_refs),
        createdAt: new Date(record.created_at),
      },
    });
    return toTransitionAttemptRecord(row);
  }

  async findChainTransitionAttemptById(
    chainTransitionAttemptId: string,
  ): Promise<TopicSelectionChainTransitionAttemptRecord | null> {
    const row = await this.prisma.topicSelectionChainTransitionAttempt.findUnique({
      where: { id: chainTransitionAttemptId },
    });
    return row ? toTransitionAttemptRecord(row) : null;
  }

  async createFunctionalLineageLink(
    record: TopicSelectionFunctionalLineageLinkRecord,
  ): Promise<TopicSelectionFunctionalLineageLinkRecord> {
    const row = await this.prisma.topicSelectionFunctionalLineageLink.create({
      data: {
        id: record.functional_lineage_link_id,
        workspaceId: record.workspace_id ?? null,
        titleCardId: record.title_card_id ?? null,
        sourceRefType: record.source_ref.ref_type,
        sourceRefId: record.source_ref.ref_id,
        sourceVersionId: record.source_ref.version_id ?? null,
        targetRefType: record.target_ref.ref_type,
        targetRefId: record.target_ref.ref_id,
        targetVersionId: record.target_ref.version_id ?? null,
        relationType: record.relation_type,
        artifactRefs: toJsonValue(record.artifact_refs),
        createdBy: record.created_by,
        createdAt: new Date(record.created_at),
      },
    });
    return toLineageLinkRecord(row);
  }

  async findFunctionalLineageLinkById(
    functionalLineageLinkId: string,
  ): Promise<TopicSelectionFunctionalLineageLinkRecord | null> {
    const row = await this.prisma.topicSelectionFunctionalLineageLink.findUnique({
      where: { id: functionalLineageLinkId },
    });
    return row ? toLineageLinkRecord(row) : null;
  }

  async createTraceSnapshot(record: TopicSelectionTraceSnapshotRecord): Promise<TopicSelectionTraceSnapshotRecord> {
    const row = await this.prisma.topicSelectionTraceSnapshot.create({
      data: {
        id: record.trace_snapshot_id,
        workspaceId: record.workspace_id ?? null,
        titleCardId: record.title_card_id ?? null,
        targetRefType: record.target_ref.ref_type,
        targetRefId: record.target_ref.ref_id,
        targetVersionId: record.target_ref.version_id ?? null,
        snapshotHash: record.snapshot_hash,
        objectRefs: toJsonValue(record.object_refs),
        lineageLinkRefs: toJsonValue(record.lineage_link_refs),
        artifactRefs: toJsonValue(record.artifact_refs),
        qualitySignalRefs: toJsonValue(record.quality_signal_refs),
        transitionAttemptRefs: toJsonValue(record.transition_attempt_refs),
        payload: toJsonValue(record.payload),
        createdBy: record.created_by,
        createdAt: new Date(record.created_at),
      },
    });
    return toTraceSnapshotRecord(row);
  }

  async findTraceSnapshotById(traceSnapshotId: string): Promise<TopicSelectionTraceSnapshotRecord | null> {
    const row = await this.prisma.topicSelectionTraceSnapshot.findUnique({
      where: { id: traceSnapshotId },
    });
    return row ? toTraceSnapshotRecord(row) : null;
  }

  async createHumanConfirmedDecision(
    record: TopicSelectionHumanConfirmedDecisionRecord,
  ): Promise<TopicSelectionHumanConfirmedDecisionRecord> {
    const row = await this.prisma.topicSelectionHumanConfirmedDecision.create({
      data: {
        id: record.human_confirmed_decision_id,
        workspaceId: record.workspace_id ?? null,
        titleCardId: record.title_card_id ?? null,
        targetRefType: record.target_ref.ref_type,
        targetRefId: record.target_ref.ref_id,
        targetVersionId: record.target_ref.version_id ?? null,
        decisionType: record.decision_type,
        actorType: record.actor.actor_type,
        actorId: record.actor.actor_id ?? null,
        rationale: record.rationale ?? null,
        artifactRefs: toJsonValue(record.artifact_refs),
        policyVersionId: record.policy_version_id ?? null,
        resultingAuthorityRefs: toJsonValue(record.resulting_authority_refs),
        createdAt: new Date(record.created_at),
      },
    });
    return toHumanDecisionRecord(row);
  }

  async findHumanConfirmedDecisionById(
    humanConfirmedDecisionId: string,
  ): Promise<TopicSelectionHumanConfirmedDecisionRecord | null> {
    const row = await this.prisma.topicSelectionHumanConfirmedDecision.findUnique({
      where: { id: humanConfirmedDecisionId },
    });
    return row ? toHumanDecisionRecord(row) : null;
  }

  async listHumanConfirmedDecisionsByTargetRef(
    targetRef: { ref_type: string; ref_id: string },
  ): Promise<TopicSelectionHumanConfirmedDecisionRecord[]> {
    const rows = await this.prisma.topicSelectionHumanConfirmedDecision.findMany({
      where: {
        targetRefType: targetRef.ref_type,
        targetRefId: targetRef.ref_id,
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toHumanDecisionRecord);
  }
}
