import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  TopicSelectionAcceptedRiskRecord,
  TopicSelectionBlockerPolicyRecord,
  TopicSelectionCandidateDecisionMemoryRecord,
  TopicSelectionDecisionMemoryEntryRecord,
  TopicSelectionDecisionWorkQueueItemRecord,
  TopicSelectionHumanOverrideRecord,
  TopicSelectionRecheckEventRecord,
  TopicSelectionRecheckImpactRecord,
  TopicSelectionRecheckResolutionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-recheck-risk-memory-contracts';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionAcceptedRiskStatusPatch,
  TopicSelectionDecisionWorkQueueItemPatch,
  TopicSelectionRecheckEventMergePatch,
  TopicSelectionRecheckImpactPatch,
  TopicSelectionRecheckRiskMemoryRepository,
} from '../topic-selection-recheck-risk-memory.repository.js';

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

function dateOrNull(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

function jsonOrNull(value: unknown | null | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null || value === undefined ? Prisma.JsonNull : toJsonValue(value);
}

function toRecheckEventRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string | null;
  originStage: string;
  eventType: string;
  sourceRef: Prisma.JsonValue;
  affectedScopeRef: Prisma.JsonValue | null;
  eventFingerprint: string;
  severity: string;
  reasonCodes: string[];
  summary: string;
  stateSignalRefs: Prisma.JsonValue;
  evidenceRefs: Prisma.JsonValue;
  artifactRefs: Prisma.JsonValue;
  policyVersionId: string | null;
  status: string;
  observationCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  cooldownUntil: Date | null;
  payload: Prisma.JsonValue;
}): TopicSelectionRecheckEventRecord {
  return {
    recheck_event_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    origin_stage: row.originStage,
    event_type: row.eventType as TopicSelectionRecheckEventRecord['event_type'],
    source_ref: asFunctionalRef(row.sourceRef),
    affected_scope_ref: asNullableFunctionalRef(row.affectedScopeRef),
    event_fingerprint: row.eventFingerprint,
    severity: row.severity as TopicSelectionRecheckEventRecord['severity'],
    reason_codes: row.reasonCodes,
    summary: row.summary,
    state_signal_refs: asArray<TopicSelectionFunctionalRef>(row.stateSignalRefs),
    evidence_refs: asArray<TopicSelectionFunctionalRef>(row.evidenceRefs),
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    policy_version_id: row.policyVersionId,
    status: row.status as TopicSelectionRecheckEventRecord['status'],
    observation_count: row.observationCount,
    first_seen_at: row.firstSeenAt.toISOString(),
    last_seen_at: row.lastSeenAt.toISOString(),
    cooldown_until: row.cooldownUntil?.toISOString() ?? null,
    payload: asRecord(row.payload),
  };
}

function toRecheckImpactRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string | null;
  recheckEventRef: Prisma.JsonValue;
  affectedRef: Prisma.JsonValue;
  affectedStage: string;
  impactLevel: string;
  impactDedupKey: string;
  requiredActions: string[];
  status: string;
  retryCount: number;
  retryBudget: number;
  cooldownUntil: Date | null;
  acceptedRiskRefs: Prisma.JsonValue;
  queueItemRefs: Prisma.JsonValue;
  assessmentPayload: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): TopicSelectionRecheckImpactRecord {
  return {
    recheck_impact_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    recheck_event_ref: asFunctionalRef(row.recheckEventRef),
    affected_ref: asFunctionalRef(row.affectedRef),
    affected_stage: row.affectedStage,
    impact_level: row.impactLevel as TopicSelectionRecheckImpactRecord['impact_level'],
    impact_dedup_key: row.impactDedupKey,
    required_actions: row.requiredActions,
    status: row.status as TopicSelectionRecheckImpactRecord['status'],
    retry_count: row.retryCount,
    retry_budget: row.retryBudget,
    cooldown_until: row.cooldownUntil?.toISOString() ?? null,
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    queue_item_refs: asArray<TopicSelectionFunctionalRef>(row.queueItemRefs),
    assessment_payload: asRecord(row.assessmentPayload),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toAcceptedRiskRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string | null;
  riskType: string;
  sourceType: string;
  sourceRef: Prisma.JsonValue | null;
  targetRef: Prisma.JsonValue;
  scopeRefs: Prisma.JsonValue;
  affectedObjectRefs: Prisma.JsonValue;
  severity: string;
  status: string;
  rationale: string;
  acceptedBy: Prisma.JsonValue;
  policyVersionId: string | null;
  expiryCondition: string | null;
  recheckCondition: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}): TopicSelectionAcceptedRiskRecord {
  return {
    accepted_risk_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    risk_type: row.riskType,
    source_type: row.sourceType as TopicSelectionAcceptedRiskRecord['source_type'],
    source_ref: asNullableFunctionalRef(row.sourceRef),
    target_ref: asFunctionalRef(row.targetRef),
    scope_refs: asArray<TopicSelectionFunctionalRef>(row.scopeRefs),
    affected_object_refs: asArray<TopicSelectionFunctionalRef>(row.affectedObjectRefs),
    severity: row.severity as TopicSelectionAcceptedRiskRecord['severity'],
    status: row.status as TopicSelectionAcceptedRiskRecord['status'],
    rationale: row.rationale,
    accepted_by: asRecord(row.acceptedBy) as unknown as TopicSelectionAcceptedRiskRecord['accepted_by'],
    policy_version_id: row.policyVersionId,
    expiry_condition: row.expiryCondition,
    recheck_condition: row.recheckCondition,
    expires_at: row.expiresAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    resolved_at: row.resolvedAt?.toISOString() ?? null,
  };
}

function toQueueItemRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string | null;
  queueItemType: string;
  handlerKey: string;
  targetRef: Prisma.JsonValue;
  sourceRef: Prisma.JsonValue;
  queueDedupKey: string;
  priority: number;
  status: string;
  requiredActions: string[];
  reasonCodes: string[];
  blockedTransitionKeys: string[];
  retryCount: number;
  retryBudget: number;
  cooldownUntil: Date | null;
  policyVersionId: string | null;
  payload: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}): TopicSelectionDecisionWorkQueueItemRecord {
  return {
    decision_work_queue_item_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    queue_item_type: row.queueItemType as TopicSelectionDecisionWorkQueueItemRecord['queue_item_type'],
    handler_key: row.handlerKey as TopicSelectionDecisionWorkQueueItemRecord['handler_key'],
    target_ref: asFunctionalRef(row.targetRef),
    source_ref: asFunctionalRef(row.sourceRef),
    queue_dedup_key: row.queueDedupKey,
    priority: row.priority,
    status: row.status as TopicSelectionDecisionWorkQueueItemRecord['status'],
    required_actions: row.requiredActions,
    reason_codes: row.reasonCodes,
    blocked_transition_keys: row.blockedTransitionKeys,
    retry_count: row.retryCount,
    retry_budget: row.retryBudget,
    cooldown_until: row.cooldownUntil?.toISOString() ?? null,
    policy_version_id: row.policyVersionId,
    payload: asRecord(row.payload),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    resolved_at: row.resolvedAt?.toISOString() ?? null,
  };
}

export class PrismaTopicSelectionRecheckRiskMemoryRepository implements TopicSelectionRecheckRiskMemoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createRecheckEvent(record: TopicSelectionRecheckEventRecord): Promise<TopicSelectionRecheckEventRecord> {
    const row = await this.prisma.topicSelectionRecheckEvent.create({ data: this.toRecheckEventCreateInput(record) });
    return toRecheckEventRecord(row);
  }

  async findOpenRecheckEventByFingerprint(
    eventFingerprint: string,
  ): Promise<TopicSelectionRecheckEventRecord | null> {
    const row = await this.prisma.topicSelectionRecheckEvent.findFirst({
      where: { eventFingerprint, status: 'open' },
    });
    return row ? toRecheckEventRecord(row) : null;
  }

  async mergeRecheckEvent(
    recheckEventId: string,
    patch: TopicSelectionRecheckEventMergePatch,
  ): Promise<TopicSelectionRecheckEventRecord> {
    const row = await this.prisma.topicSelectionRecheckEvent.update({
      where: { id: recheckEventId },
      data: {
        severity: patch.severity,
        reasonCodes: patch.reason_codes,
        stateSignalRefs: toJsonValue(patch.state_signal_refs),
        evidenceRefs: toJsonValue(patch.evidence_refs),
        artifactRefs: toJsonValue(patch.artifact_refs),
        observationCount: { increment: 1 },
        lastSeenAt: new Date(patch.last_seen_at),
        cooldownUntil: dateOrNull(patch.cooldown_until),
        payload: toJsonValue(patch.payload),
      },
    });
    return toRecheckEventRecord(row);
  }

  async createRecheckImpact(record: TopicSelectionRecheckImpactRecord): Promise<TopicSelectionRecheckImpactRecord> {
    const row = await this.prisma.topicSelectionRecheckImpact.create({ data: this.toRecheckImpactCreateInput(record) });
    return toRecheckImpactRecord(row);
  }

  async findOpenRecheckImpactByDedupKey(impactDedupKey: string): Promise<TopicSelectionRecheckImpactRecord | null> {
    const row = await this.prisma.topicSelectionRecheckImpact.findFirst({
      where: { impactDedupKey, status: { in: ['open', 'queued', 'in_progress'] } },
    });
    return row ? toRecheckImpactRecord(row) : null;
  }

  async findRecheckImpactById(recheckImpactId: string): Promise<TopicSelectionRecheckImpactRecord | null> {
    const row = await this.prisma.topicSelectionRecheckImpact.findUnique({ where: { id: recheckImpactId } });
    return row ? toRecheckImpactRecord(row) : null;
  }

  async updateRecheckImpact(
    recheckImpactId: string,
    patch: TopicSelectionRecheckImpactPatch,
  ): Promise<TopicSelectionRecheckImpactRecord> {
    const row = await this.prisma.topicSelectionRecheckImpact.update({
      where: { id: recheckImpactId },
      data: {
        impactLevel: patch.impact_level,
        requiredActions: patch.required_actions,
        status: patch.status,
        retryCount: patch.retry_count,
        retryBudget: patch.retry_budget,
        cooldownUntil: patch.cooldown_until === undefined ? undefined : dateOrNull(patch.cooldown_until),
        acceptedRiskRefs: patch.accepted_risk_refs === undefined ? undefined : toJsonValue(patch.accepted_risk_refs),
        queueItemRefs: patch.queue_item_refs === undefined ? undefined : toJsonValue(patch.queue_item_refs),
        assessmentPayload: patch.assessment_payload === undefined ? undefined : toJsonValue(patch.assessment_payload),
        updatedAt: patch.updated_at ? new Date(patch.updated_at) : undefined,
      },
    });
    return toRecheckImpactRecord(row);
  }

  async createRecheckResolution(
    record: TopicSelectionRecheckResolutionRecord,
  ): Promise<TopicSelectionRecheckResolutionRecord> {
    const row = await this.prisma.topicSelectionRecheckResolution.create({
      data: {
        id: record.recheck_resolution_id,
        workspaceId: record.workspace_id ?? null,
        titleCardId: record.title_card_id ?? null,
        recheckImpactId: record.recheck_impact_ref.ref_id,
        recheckImpactRef: toJsonValue(record.recheck_impact_ref),
        resolutionType: record.resolution_type,
        resolvedBy: toJsonValue(record.resolved_by),
        rationale: record.rationale,
        outputRefs: toJsonValue(record.output_refs),
        acceptedRiskId: record.accepted_risk_ref?.ref_id ?? null,
        acceptedRiskRef: jsonOrNull(record.accepted_risk_ref ?? null),
        createdAt: new Date(record.created_at),
      },
    });
    return {
      recheck_resolution_id: row.id,
      workspace_id: row.workspaceId,
      title_card_id: row.titleCardId,
      recheck_impact_ref: asFunctionalRef(row.recheckImpactRef),
      resolution_type: row.resolutionType as TopicSelectionRecheckResolutionRecord['resolution_type'],
      resolved_by: asRecord(row.resolvedBy) as unknown as TopicSelectionRecheckResolutionRecord['resolved_by'],
      rationale: row.rationale,
      output_refs: asArray<TopicSelectionFunctionalRef>(row.outputRefs),
      accepted_risk_ref: asNullableFunctionalRef(row.acceptedRiskRef),
      created_at: row.createdAt.toISOString(),
    };
  }

  async createAcceptedRisk(record: TopicSelectionAcceptedRiskRecord): Promise<TopicSelectionAcceptedRiskRecord> {
    const row = await this.prisma.topicSelectionAcceptedRisk.create({ data: this.toAcceptedRiskCreateInput(record) });
    return toAcceptedRiskRecord(row);
  }

  async findAcceptedRiskById(acceptedRiskId: string): Promise<TopicSelectionAcceptedRiskRecord | null> {
    const row = await this.prisma.topicSelectionAcceptedRisk.findUnique({ where: { id: acceptedRiskId } });
    return row ? toAcceptedRiskRecord(row) : null;
  }

  async updateAcceptedRiskStatus(
    acceptedRiskId: string,
    patch: TopicSelectionAcceptedRiskStatusPatch,
  ): Promise<TopicSelectionAcceptedRiskRecord> {
    const row = await this.prisma.topicSelectionAcceptedRisk.update({
      where: { id: acceptedRiskId },
      data: {
        status: patch.status,
        updatedAt: new Date(patch.updated_at),
        resolvedAt: patch.resolved_at === undefined ? undefined : dateOrNull(patch.resolved_at),
      },
    });
    return toAcceptedRiskRecord(row);
  }

  async listActiveAcceptedRisksDueForRecheck(asOf: string): Promise<TopicSelectionAcceptedRiskRecord[]> {
    const rows = await this.prisma.topicSelectionAcceptedRisk.findMany({
      where: {
        status: 'active',
        expiresAt: { not: null, lte: new Date(asOf) },
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toAcceptedRiskRecord);
  }

  async listAcceptedRisksByTitleCardId(titleCardId: string): Promise<TopicSelectionAcceptedRiskRecord[]> {
    const rows = await this.prisma.topicSelectionAcceptedRisk.findMany({
      where: { titleCardId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toAcceptedRiskRecord);
  }

  async createHumanOverride(record: TopicSelectionHumanOverrideRecord): Promise<TopicSelectionHumanOverrideRecord> {
    const row = await this.prisma.topicSelectionHumanOverride.create({
      data: {
        id: record.human_override_id,
        workspaceId: record.workspace_id ?? null,
        titleCardId: record.title_card_id ?? record.target_ref.title_card_id ?? null,
        targetRefType: record.target_ref.ref_type,
        targetRefId: record.target_ref.ref_id,
        targetVersionId: record.target_ref.version_id ?? null,
        targetRef: toJsonValue(record.target_ref),
        overriddenRef: jsonOrNull(record.overridden_ref ?? null),
        blockerType: record.blocker_type,
        acceptedRiskId: record.accepted_risk_ref.ref_id,
        acceptedRiskRef: toJsonValue(record.accepted_risk_ref),
        actor: toJsonValue(record.actor),
        rationale: record.rationale,
        policyVersionId: record.policy_version_id ?? null,
        scope: toJsonValue(record.scope),
        status: record.status,
        createdAt: new Date(record.created_at),
      },
    });
    return {
      human_override_id: row.id,
      workspace_id: row.workspaceId,
      title_card_id: row.titleCardId,
      target_ref: asFunctionalRef(row.targetRef),
      overridden_ref: asNullableFunctionalRef(row.overriddenRef),
      blocker_type: row.blockerType,
      accepted_risk_ref: asFunctionalRef(row.acceptedRiskRef),
      actor: asRecord(row.actor) as unknown as TopicSelectionHumanOverrideRecord['actor'],
      rationale: row.rationale,
      policy_version_id: row.policyVersionId,
      scope: asRecord(row.scope),
      status: row.status as TopicSelectionHumanOverrideRecord['status'],
      created_at: row.createdAt.toISOString(),
    };
  }

  async createBlockerPolicy(record: TopicSelectionBlockerPolicyRecord): Promise<TopicSelectionBlockerPolicyRecord> {
    const row = await this.prisma.topicSelectionBlockerPolicy.create({
      data: {
        id: record.blocker_policy_id,
        blockerCode: record.blocker_code,
        category: record.category,
        defaultAction: record.default_action,
        allowedHandlerKeys: record.allowed_handler_keys,
        policyVersionId: record.policy_version_id ?? null,
        status: record.status,
        createdAt: new Date(record.created_at),
        retiredAt: dateOrNull(record.retired_at),
      },
    });
    return {
      blocker_policy_id: row.id,
      blocker_code: row.blockerCode,
      category: row.category as TopicSelectionBlockerPolicyRecord['category'],
      default_action: row.defaultAction,
      allowed_handler_keys: row.allowedHandlerKeys as TopicSelectionBlockerPolicyRecord['allowed_handler_keys'],
      policy_version_id: row.policyVersionId,
      status: row.status as TopicSelectionBlockerPolicyRecord['status'],
      created_at: row.createdAt.toISOString(),
      retired_at: row.retiredAt?.toISOString() ?? null,
    };
  }

  async findActiveBlockerPolicyByCode(
    blockerCode: string,
    policyVersionId?: string | null,
  ): Promise<TopicSelectionBlockerPolicyRecord | null> {
    const row = await this.prisma.topicSelectionBlockerPolicy.findFirst({
      where: {
        blockerCode,
        status: 'active',
        ...(policyVersionId !== undefined ? { policyVersionId: policyVersionId ?? null } : {}),
      },
    });
    return row
      ? {
          blocker_policy_id: row.id,
          blocker_code: row.blockerCode,
          category: row.category as TopicSelectionBlockerPolicyRecord['category'],
          default_action: row.defaultAction,
          allowed_handler_keys: row.allowedHandlerKeys as TopicSelectionBlockerPolicyRecord['allowed_handler_keys'],
          policy_version_id: row.policyVersionId,
          status: row.status as TopicSelectionBlockerPolicyRecord['status'],
          created_at: row.createdAt.toISOString(),
          retired_at: row.retiredAt?.toISOString() ?? null,
        }
      : null;
  }

  async createDecisionMemoryEntry(
    record: TopicSelectionDecisionMemoryEntryRecord,
  ): Promise<TopicSelectionDecisionMemoryEntryRecord> {
    const row = await this.prisma.topicSelectionDecisionMemoryEntry.create({
      data: {
        id: record.decision_memory_entry_id,
        workspaceId: record.workspace_id ?? null,
        titleCardId: record.title_card_id ?? record.source_ref.title_card_id ?? null,
        sourceStage: record.source_stage,
        sourceRefType: record.source_ref.ref_type,
        sourceRefId: record.source_ref.ref_id,
        sourceRef: toJsonValue(record.source_ref),
        targetScopeRefType: record.target_scope_ref?.ref_type ?? null,
        targetScopeRefId: record.target_scope_ref?.ref_id ?? null,
        targetScopeRef: jsonOrNull(record.target_scope_ref ?? null),
        memoryType: record.memory_type,
        effectPolicy: record.effect_policy,
        severity: record.severity,
        confidence: record.confidence ?? null,
        status: record.status,
        rationale: record.rationale,
        applicabilityScope: toJsonValue(record.applicability_scope),
        payload: toJsonValue(record.payload),
        evidencePolicy: record.evidence_policy,
        createdBy: record.created_by,
        createdAt: new Date(record.created_at),
        expiresAt: dateOrNull(record.expires_at),
        recheckCondition: record.recheck_condition ?? null,
      },
    });
    return this.toDecisionMemoryEntryRecord(row);
  }

  async findDecisionMemoryEntryById(
    decisionMemoryEntryId: string,
  ): Promise<TopicSelectionDecisionMemoryEntryRecord | null> {
    const row = await this.prisma.topicSelectionDecisionMemoryEntry.findUnique({
      where: { id: decisionMemoryEntryId },
    });
    return row ? this.toDecisionMemoryEntryRecord(row) : null;
  }

  async listDecisionMemoryEntriesByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionDecisionMemoryEntryRecord[]> {
    const rows = await this.prisma.topicSelectionDecisionMemoryEntry.findMany({
      where: { titleCardId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toDecisionMemoryEntryRecord(row));
  }

  async listCandidateDecisionMemoriesByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionCandidateDecisionMemoryRecord[]> {
    const rows = await this.prisma.topicSelectionCandidateDecisionMemory.findMany({
      where: { titleCardId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toCandidateDecisionMemoryRecord(row));
  }

  async createCandidateDecisionMemory(
    record: TopicSelectionCandidateDecisionMemoryRecord,
  ): Promise<TopicSelectionCandidateDecisionMemoryRecord> {
    const row = await this.prisma.topicSelectionCandidateDecisionMemory.create({
      data: {
        id: record.candidate_decision_memory_id,
        workspaceId: record.workspace_id ?? null,
        titleCardId: record.title_card_id,
        decisionMemoryEntryId: record.decision_memory_entry_ref.ref_id,
        decisionMemoryEntryRef: toJsonValue(record.decision_memory_entry_ref),
        sourceSuggestionId: record.source_suggestion_ref?.ref_id ?? null,
        sourceSuggestionRef: jsonOrNull(record.source_suggestion_ref ?? null),
        needCandidateId: record.need_candidate_ref.ref_id,
        needCandidateRef: toJsonValue(record.need_candidate_ref),
        status: record.status,
        reasonCodes: record.reason_codes,
        evidencePolicy: record.evidence_policy,
        createdAt: new Date(record.created_at),
      },
    });
    return this.toCandidateDecisionMemoryRecord(row);
  }

  async findCandidateDecisionMemoryBySuggestionId(
    sourceSuggestionId: string,
  ): Promise<TopicSelectionCandidateDecisionMemoryRecord | null> {
    const row = await this.prisma.topicSelectionCandidateDecisionMemory.findUnique({
      where: { sourceSuggestionId },
    });
    return row ? this.toCandidateDecisionMemoryRecord(row) : null;
  }

  async createDecisionWorkQueueItem(
    record: TopicSelectionDecisionWorkQueueItemRecord,
  ): Promise<TopicSelectionDecisionWorkQueueItemRecord> {
    const row = await this.prisma.topicSelectionDecisionWorkQueueItem.create({
      data: this.toQueueItemCreateInput(record),
    });
    return toQueueItemRecord(row);
  }

  async findOpenDecisionWorkQueueItemByDedupKey(
    queueDedupKey: string,
  ): Promise<TopicSelectionDecisionWorkQueueItemRecord | null> {
    const row = await this.prisma.topicSelectionDecisionWorkQueueItem.findFirst({
      where: { queueDedupKey, status: { in: ['open', 'in_progress'] } },
    });
    return row ? toQueueItemRecord(row) : null;
  }

  async updateDecisionWorkQueueItem(
    decisionWorkQueueItemId: string,
    patch: TopicSelectionDecisionWorkQueueItemPatch,
  ): Promise<TopicSelectionDecisionWorkQueueItemRecord> {
    const row = await this.prisma.topicSelectionDecisionWorkQueueItem.update({
      where: { id: decisionWorkQueueItemId },
      data: {
        queueItemType: patch.queue_item_type,
        handlerKey: patch.handler_key,
        priority: patch.priority,
        status: patch.status,
        requiredActions: patch.required_actions,
        reasonCodes: patch.reason_codes,
        blockedTransitionKeys: patch.blocked_transition_keys,
        retryCount: patch.retry_count,
        retryBudget: patch.retry_budget,
        cooldownUntil: patch.cooldown_until === undefined ? undefined : dateOrNull(patch.cooldown_until),
        policyVersionId: patch.policy_version_id,
        payload: patch.payload === undefined ? undefined : toJsonValue(patch.payload),
        updatedAt: patch.updated_at ? new Date(patch.updated_at) : undefined,
        resolvedAt: patch.resolved_at === undefined ? undefined : dateOrNull(patch.resolved_at),
      },
    });
    return toQueueItemRecord(row);
  }

  async listDecisionWorkQueueItemsByStatuses(
    statuses: TopicSelectionDecisionWorkQueueItemRecord['status'][],
  ): Promise<TopicSelectionDecisionWorkQueueItemRecord[]> {
    const rows = await this.prisma.topicSelectionDecisionWorkQueueItem.findMany({
      where: { status: { in: statuses } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map(toQueueItemRecord);
  }

  private toRecheckEventCreateInput(record: TopicSelectionRecheckEventRecord): Prisma.TopicSelectionRecheckEventCreateInput {
    return {
      id: record.recheck_event_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id ?? record.source_ref.title_card_id ?? null,
      originStage: record.origin_stage,
      eventType: record.event_type,
      sourceRefType: record.source_ref.ref_type,
      sourceRefId: record.source_ref.ref_id,
      sourceVersionId: record.source_ref.version_id ?? null,
      sourceRef: toJsonValue(record.source_ref),
      affectedScopeType: record.affected_scope_ref?.ref_type ?? null,
      affectedScopeId: record.affected_scope_ref?.ref_id ?? null,
      affectedScopeRef: jsonOrNull(record.affected_scope_ref ?? null),
      eventFingerprint: record.event_fingerprint,
      severity: record.severity,
      reasonCodes: record.reason_codes,
      summary: record.summary,
      stateSignalRefs: toJsonValue(record.state_signal_refs),
      evidenceRefs: toJsonValue(record.evidence_refs),
      artifactRefs: toJsonValue(record.artifact_refs),
      policyVersionId: record.policy_version_id ?? null,
      status: record.status,
      observationCount: record.observation_count,
      firstSeenAt: new Date(record.first_seen_at),
      lastSeenAt: new Date(record.last_seen_at),
      cooldownUntil: dateOrNull(record.cooldown_until),
      payload: toJsonValue(record.payload),
    };
  }

  private toRecheckImpactCreateInput(record: TopicSelectionRecheckImpactRecord): Prisma.TopicSelectionRecheckImpactCreateInput {
    return {
      id: record.recheck_impact_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id ?? record.affected_ref.title_card_id ?? null,
      recheckEventId: record.recheck_event_ref.ref_id,
      recheckEventRef: toJsonValue(record.recheck_event_ref),
      affectedRefType: record.affected_ref.ref_type,
      affectedRefId: record.affected_ref.ref_id,
      affectedVersionId: record.affected_ref.version_id ?? null,
      affectedRef: toJsonValue(record.affected_ref),
      affectedStage: record.affected_stage,
      impactLevel: record.impact_level,
      impactDedupKey: record.impact_dedup_key,
      requiredActions: record.required_actions,
      status: record.status,
      retryCount: record.retry_count,
      retryBudget: record.retry_budget,
      cooldownUntil: dateOrNull(record.cooldown_until),
      acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
      queueItemRefs: toJsonValue(record.queue_item_refs),
      assessmentPayload: toJsonValue(record.assessment_payload),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }

  private toAcceptedRiskCreateInput(record: TopicSelectionAcceptedRiskRecord): Prisma.TopicSelectionAcceptedRiskCreateInput {
    return {
      id: record.accepted_risk_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id ?? record.target_ref.title_card_id ?? null,
      riskType: record.risk_type,
      sourceType: record.source_type,
      sourceRefType: record.source_ref?.ref_type ?? null,
      sourceRefId: record.source_ref?.ref_id ?? null,
      sourceRef: jsonOrNull(record.source_ref ?? null),
      targetRefType: record.target_ref.ref_type,
      targetRefId: record.target_ref.ref_id,
      targetVersionId: record.target_ref.version_id ?? null,
      targetRef: toJsonValue(record.target_ref),
      scopeRefs: toJsonValue(record.scope_refs),
      affectedObjectRefs: toJsonValue(record.affected_object_refs),
      severity: record.severity,
      status: record.status,
      rationale: record.rationale,
      acceptedBy: toJsonValue(record.accepted_by),
      policyVersionId: record.policy_version_id ?? null,
      expiryCondition: record.expiry_condition ?? null,
      recheckCondition: record.recheck_condition ?? null,
      expiresAt: dateOrNull(record.expires_at),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      resolvedAt: dateOrNull(record.resolved_at),
    };
  }

  private toQueueItemCreateInput(record: TopicSelectionDecisionWorkQueueItemRecord): Prisma.TopicSelectionDecisionWorkQueueItemCreateInput {
    return {
      id: record.decision_work_queue_item_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id ?? record.target_ref.title_card_id ?? null,
      queueItemType: record.queue_item_type,
      handlerKey: record.handler_key,
      targetRefType: record.target_ref.ref_type,
      targetRefId: record.target_ref.ref_id,
      targetVersionId: record.target_ref.version_id ?? null,
      targetRef: toJsonValue(record.target_ref),
      sourceRefType: record.source_ref.ref_type,
      sourceRefId: record.source_ref.ref_id,
      sourceRef: toJsonValue(record.source_ref),
      queueDedupKey: record.queue_dedup_key,
      priority: record.priority,
      status: record.status,
      requiredActions: record.required_actions,
      reasonCodes: record.reason_codes,
      blockedTransitionKeys: record.blocked_transition_keys,
      retryCount: record.retry_count,
      retryBudget: record.retry_budget,
      cooldownUntil: dateOrNull(record.cooldown_until),
      policyVersionId: record.policy_version_id ?? null,
      payload: toJsonValue(record.payload),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      resolvedAt: dateOrNull(record.resolved_at),
    };
  }

  private toDecisionMemoryEntryRecord(row: {
    id: string;
    workspaceId: string | null;
    titleCardId: string | null;
    sourceStage: string;
    sourceRef: Prisma.JsonValue;
    targetScopeRef: Prisma.JsonValue | null;
    memoryType: string;
    effectPolicy: string;
    severity: string;
    confidence: number | null;
    status: string;
    rationale: string;
    applicabilityScope: Prisma.JsonValue;
    payload: Prisma.JsonValue;
    evidencePolicy: string;
    createdBy: string;
    createdAt: Date;
    expiresAt: Date | null;
    recheckCondition: string | null;
  }): TopicSelectionDecisionMemoryEntryRecord {
    return {
      decision_memory_entry_id: row.id,
      workspace_id: row.workspaceId,
      title_card_id: row.titleCardId,
      source_stage: row.sourceStage,
      source_ref: asFunctionalRef(row.sourceRef),
      target_scope_ref: asNullableFunctionalRef(row.targetScopeRef),
      memory_type: row.memoryType as TopicSelectionDecisionMemoryEntryRecord['memory_type'],
      effect_policy: row.effectPolicy as TopicSelectionDecisionMemoryEntryRecord['effect_policy'],
      severity: row.severity as TopicSelectionDecisionMemoryEntryRecord['severity'],
      confidence: row.confidence,
      status: row.status as TopicSelectionDecisionMemoryEntryRecord['status'],
      rationale: row.rationale,
      applicability_scope: asRecord(row.applicabilityScope),
      payload: asRecord(row.payload),
      evidence_policy: row.evidencePolicy as 'not_evidence',
      created_by: row.createdBy as TopicSelectionDecisionMemoryEntryRecord['created_by'],
      created_at: row.createdAt.toISOString(),
      expires_at: row.expiresAt?.toISOString() ?? null,
      recheck_condition: row.recheckCondition,
    };
  }

  private toCandidateDecisionMemoryRecord(row: {
    id: string;
    workspaceId: string | null;
    titleCardId: string;
    decisionMemoryEntryRef: Prisma.JsonValue;
    sourceSuggestionRef: Prisma.JsonValue | null;
    needCandidateRef: Prisma.JsonValue;
    status: string;
    reasonCodes: string[];
    evidencePolicy: string;
    createdAt: Date;
  }): TopicSelectionCandidateDecisionMemoryRecord {
    return {
      candidate_decision_memory_id: row.id,
      workspace_id: row.workspaceId,
      title_card_id: row.titleCardId,
      decision_memory_entry_ref: asFunctionalRef(row.decisionMemoryEntryRef),
      source_suggestion_ref: asNullableFunctionalRef(row.sourceSuggestionRef),
      need_candidate_ref: asFunctionalRef(row.needCandidateRef),
      status: row.status as TopicSelectionCandidateDecisionMemoryRecord['status'],
      reason_codes: row.reasonCodes,
      evidence_policy: row.evidencePolicy as 'not_evidence',
      created_at: row.createdAt.toISOString(),
    };
  }
}
