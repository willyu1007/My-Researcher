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
import type {
  TopicSelectionAcceptedRiskStatusPatch,
  TopicSelectionDecisionWorkQueueItemPatch,
  TopicSelectionRecheckEventMergePatch,
  TopicSelectionRecheckImpactPatch,
  TopicSelectionRecheckRiskMemoryRepository,
} from './topic-selection-recheck-risk-memory.repository.js';

export class InMemoryTopicSelectionRecheckRiskMemoryRepository implements TopicSelectionRecheckRiskMemoryRepository {
  private readonly recheckEvents = new Map<string, TopicSelectionRecheckEventRecord>();
  private readonly recheckImpacts = new Map<string, TopicSelectionRecheckImpactRecord>();
  private readonly recheckResolutions = new Map<string, TopicSelectionRecheckResolutionRecord>();
  private readonly acceptedRisks = new Map<string, TopicSelectionAcceptedRiskRecord>();
  private readonly humanOverrides = new Map<string, TopicSelectionHumanOverrideRecord>();
  private readonly blockerPolicies = new Map<string, TopicSelectionBlockerPolicyRecord>();
  private readonly memoryEntries = new Map<string, TopicSelectionDecisionMemoryEntryRecord>();
  private readonly candidateMemories = new Map<string, TopicSelectionCandidateDecisionMemoryRecord>();
  private readonly queueItems = new Map<string, TopicSelectionDecisionWorkQueueItemRecord>();

  async createRecheckEvent(record: TopicSelectionRecheckEventRecord): Promise<TopicSelectionRecheckEventRecord> {
    this.recheckEvents.set(record.recheck_event_id, record);
    return record;
  }

  async findOpenRecheckEventByFingerprint(
    eventFingerprint: string,
  ): Promise<TopicSelectionRecheckEventRecord | null> {
    return [...this.recheckEvents.values()].find((record) =>
      record.event_fingerprint === eventFingerprint && record.status === 'open') ?? null;
  }

  async mergeRecheckEvent(
    recheckEventId: string,
    patch: TopicSelectionRecheckEventMergePatch,
  ): Promise<TopicSelectionRecheckEventRecord> {
    const current = this.require(this.recheckEvents, recheckEventId, 'RecheckEvent');
    const next: TopicSelectionRecheckEventRecord = {
      ...current,
      severity: patch.severity,
      reason_codes: patch.reason_codes,
      state_signal_refs: patch.state_signal_refs,
      evidence_refs: patch.evidence_refs,
      artifact_refs: patch.artifact_refs,
      observation_count: current.observation_count + 1,
      last_seen_at: patch.last_seen_at,
      cooldown_until: patch.cooldown_until ?? null,
      payload: patch.payload,
    };
    this.recheckEvents.set(recheckEventId, next);
    return next;
  }

  async createRecheckImpact(record: TopicSelectionRecheckImpactRecord): Promise<TopicSelectionRecheckImpactRecord> {
    this.recheckImpacts.set(record.recheck_impact_id, record);
    return record;
  }

  async findOpenRecheckImpactByDedupKey(impactDedupKey: string): Promise<TopicSelectionRecheckImpactRecord | null> {
    return [...this.recheckImpacts.values()].find((record) =>
      record.impact_dedup_key === impactDedupKey && ['open', 'queued', 'in_progress'].includes(record.status)) ?? null;
  }

  async findRecheckImpactById(recheckImpactId: string): Promise<TopicSelectionRecheckImpactRecord | null> {
    return this.recheckImpacts.get(recheckImpactId) ?? null;
  }

  async updateRecheckImpact(
    recheckImpactId: string,
    patch: TopicSelectionRecheckImpactPatch,
  ): Promise<TopicSelectionRecheckImpactRecord> {
    const current = this.require(this.recheckImpacts, recheckImpactId, 'RecheckImpact');
    const next = { ...current, ...patch };
    this.recheckImpacts.set(recheckImpactId, next);
    return next;
  }

  async createRecheckResolution(
    record: TopicSelectionRecheckResolutionRecord,
  ): Promise<TopicSelectionRecheckResolutionRecord> {
    this.recheckResolutions.set(record.recheck_resolution_id, record);
    return record;
  }

  async createAcceptedRisk(record: TopicSelectionAcceptedRiskRecord): Promise<TopicSelectionAcceptedRiskRecord> {
    this.acceptedRisks.set(record.accepted_risk_id, record);
    return record;
  }

  async findAcceptedRiskById(acceptedRiskId: string): Promise<TopicSelectionAcceptedRiskRecord | null> {
    return this.acceptedRisks.get(acceptedRiskId) ?? null;
  }

  async updateAcceptedRiskStatus(
    acceptedRiskId: string,
    patch: TopicSelectionAcceptedRiskStatusPatch,
  ): Promise<TopicSelectionAcceptedRiskRecord> {
    const current = this.require(this.acceptedRisks, acceptedRiskId, 'AcceptedRisk');
    const next: TopicSelectionAcceptedRiskRecord = {
      ...current,
      status: patch.status,
      updated_at: patch.updated_at,
      resolved_at: patch.resolved_at ?? current.resolved_at ?? null,
    };
    this.acceptedRisks.set(acceptedRiskId, next);
    return next;
  }

  async listActiveAcceptedRisksDueForRecheck(asOf: string): Promise<TopicSelectionAcceptedRiskRecord[]> {
    return [...this.acceptedRisks.values()]
      .filter((record) => record.status === 'active')
      .filter((record) => record.expires_at !== null && record.expires_at !== undefined && record.expires_at <= asOf)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
  }

  async listAcceptedRisksByTitleCardId(titleCardId: string): Promise<TopicSelectionAcceptedRiskRecord[]> {
    return [...this.acceptedRisks.values()]
      .filter((record) => record.title_card_id === titleCardId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async createHumanOverride(record: TopicSelectionHumanOverrideRecord): Promise<TopicSelectionHumanOverrideRecord> {
    this.humanOverrides.set(record.human_override_id, record);
    return record;
  }

  async createBlockerPolicy(record: TopicSelectionBlockerPolicyRecord): Promise<TopicSelectionBlockerPolicyRecord> {
    this.blockerPolicies.set(record.blocker_policy_id, record);
    return record;
  }

  async findActiveBlockerPolicyByCode(
    blockerCode: string,
    policyVersionId?: string | null,
  ): Promise<TopicSelectionBlockerPolicyRecord | null> {
    return [...this.blockerPolicies.values()].find((record) =>
      record.blocker_code === blockerCode
      && record.status === 'active'
      && (policyVersionId === undefined || (record.policy_version_id ?? null) === (policyVersionId ?? null))) ?? null;
  }

  async createDecisionMemoryEntry(
    record: TopicSelectionDecisionMemoryEntryRecord,
  ): Promise<TopicSelectionDecisionMemoryEntryRecord> {
    this.memoryEntries.set(record.decision_memory_entry_id, record);
    return record;
  }

  async findDecisionMemoryEntryById(
    decisionMemoryEntryId: string,
  ): Promise<TopicSelectionDecisionMemoryEntryRecord | null> {
    return this.memoryEntries.get(decisionMemoryEntryId) ?? null;
  }

  async createCandidateDecisionMemory(
    record: TopicSelectionCandidateDecisionMemoryRecord,
  ): Promise<TopicSelectionCandidateDecisionMemoryRecord> {
    this.candidateMemories.set(record.candidate_decision_memory_id, record);
    return record;
  }

  async findCandidateDecisionMemoryBySuggestionId(
    sourceSuggestionId: string,
  ): Promise<TopicSelectionCandidateDecisionMemoryRecord | null> {
    return [...this.candidateMemories.values()].find((record) =>
      record.source_suggestion_ref?.ref_id === sourceSuggestionId) ?? null;
  }

  async createDecisionWorkQueueItem(
    record: TopicSelectionDecisionWorkQueueItemRecord,
  ): Promise<TopicSelectionDecisionWorkQueueItemRecord> {
    this.queueItems.set(record.decision_work_queue_item_id, record);
    return record;
  }

  async findOpenDecisionWorkQueueItemByDedupKey(
    queueDedupKey: string,
  ): Promise<TopicSelectionDecisionWorkQueueItemRecord | null> {
    return [...this.queueItems.values()].find((record) =>
      record.queue_dedup_key === queueDedupKey && ['open', 'in_progress'].includes(record.status)) ?? null;
  }

  async updateDecisionWorkQueueItem(
    decisionWorkQueueItemId: string,
    patch: TopicSelectionDecisionWorkQueueItemPatch,
  ): Promise<TopicSelectionDecisionWorkQueueItemRecord> {
    const current = this.require(this.queueItems, decisionWorkQueueItemId, 'DecisionWorkQueueItem');
    const next = { ...current, ...patch };
    this.queueItems.set(decisionWorkQueueItemId, next);
    return next;
  }

  async listDecisionWorkQueueItemsByStatuses(
    statuses: TopicSelectionDecisionWorkQueueItemRecord['status'][],
  ): Promise<TopicSelectionDecisionWorkQueueItemRecord[]> {
    return [...this.queueItems.values()]
      .filter((record) => statuses.includes(record.status))
      .sort((left, right) => {
        const priority = right.priority - left.priority;
        return priority === 0 ? left.created_at.localeCompare(right.created_at) : priority;
      });
  }

  private require<T>(records: Map<string, T>, id: string, label: string): T {
    const record = records.get(id);
    if (!record) {
      throw new Error(`${label} ${id} not found.`);
    }
    return record;
  }
}
