import type {
  TopicSelectionAcceptedRiskRecord,
  TopicSelectionAcceptedRiskStatus,
  TopicSelectionBlockerPolicyRecord,
  TopicSelectionCandidateDecisionMemoryRecord,
  TopicSelectionDecisionMemoryEntryRecord,
  TopicSelectionDecisionWorkQueueItemRecord,
  TopicSelectionHumanOverrideRecord,
  TopicSelectionQueueItemStatus,
  TopicSelectionRecheckEventRecord,
  TopicSelectionRecheckImpactRecord,
  TopicSelectionRecheckResolutionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-recheck-risk-memory-contracts';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

export type TopicSelectionRecheckEventMergePatch = {
  severity: TopicSelectionRecheckEventRecord['severity'];
  reason_codes: string[];
  state_signal_refs: TopicSelectionFunctionalRef[];
  evidence_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  last_seen_at: string;
  cooldown_until?: string | null;
  payload: Record<string, unknown>;
};

export type TopicSelectionRecheckImpactPatch = Partial<Omit<
  TopicSelectionRecheckImpactRecord,
  'recheck_impact_id' | 'workspace_id' | 'title_card_id' | 'recheck_event_ref' | 'affected_ref' | 'created_at'
>>;

export type TopicSelectionAcceptedRiskStatusPatch = {
  status: TopicSelectionAcceptedRiskStatus;
  updated_at: string;
  resolved_at?: string | null;
};

export type TopicSelectionDecisionWorkQueueItemPatch = Partial<Omit<
  TopicSelectionDecisionWorkQueueItemRecord,
  'decision_work_queue_item_id' | 'workspace_id' | 'title_card_id' | 'target_ref' | 'source_ref' | 'created_at'
>>;

export interface TopicSelectionRecheckRiskMemoryRepository {
  createRecheckEvent(record: TopicSelectionRecheckEventRecord): Promise<TopicSelectionRecheckEventRecord>;
  findOpenRecheckEventByFingerprint(
    eventFingerprint: string,
  ): Promise<TopicSelectionRecheckEventRecord | null>;
  mergeRecheckEvent(
    recheckEventId: string,
    patch: TopicSelectionRecheckEventMergePatch,
  ): Promise<TopicSelectionRecheckEventRecord>;

  createRecheckImpact(record: TopicSelectionRecheckImpactRecord): Promise<TopicSelectionRecheckImpactRecord>;
  findOpenRecheckImpactByDedupKey(impactDedupKey: string): Promise<TopicSelectionRecheckImpactRecord | null>;
  findRecheckImpactById(recheckImpactId: string): Promise<TopicSelectionRecheckImpactRecord | null>;
  updateRecheckImpact(
    recheckImpactId: string,
    patch: TopicSelectionRecheckImpactPatch,
  ): Promise<TopicSelectionRecheckImpactRecord>;

  createRecheckResolution(
    record: TopicSelectionRecheckResolutionRecord,
  ): Promise<TopicSelectionRecheckResolutionRecord>;

  createAcceptedRisk(record: TopicSelectionAcceptedRiskRecord): Promise<TopicSelectionAcceptedRiskRecord>;
  findAcceptedRiskById(acceptedRiskId: string): Promise<TopicSelectionAcceptedRiskRecord | null>;
  updateAcceptedRiskStatus(
    acceptedRiskId: string,
    patch: TopicSelectionAcceptedRiskStatusPatch,
  ): Promise<TopicSelectionAcceptedRiskRecord>;
  listActiveAcceptedRisksDueForRecheck(asOf: string): Promise<TopicSelectionAcceptedRiskRecord[]>;
  listAcceptedRisksByTitleCardId(titleCardId: string): Promise<TopicSelectionAcceptedRiskRecord[]>;

  createHumanOverride(record: TopicSelectionHumanOverrideRecord): Promise<TopicSelectionHumanOverrideRecord>;

  createBlockerPolicy(record: TopicSelectionBlockerPolicyRecord): Promise<TopicSelectionBlockerPolicyRecord>;
  findActiveBlockerPolicyByCode(
    blockerCode: string,
    policyVersionId?: string | null,
  ): Promise<TopicSelectionBlockerPolicyRecord | null>;

  createDecisionMemoryEntry(
    record: TopicSelectionDecisionMemoryEntryRecord,
  ): Promise<TopicSelectionDecisionMemoryEntryRecord>;
  findDecisionMemoryEntryById(
    decisionMemoryEntryId: string,
  ): Promise<TopicSelectionDecisionMemoryEntryRecord | null>;

  createCandidateDecisionMemory(
    record: TopicSelectionCandidateDecisionMemoryRecord,
  ): Promise<TopicSelectionCandidateDecisionMemoryRecord>;
  findCandidateDecisionMemoryBySuggestionId(
    sourceSuggestionId: string,
  ): Promise<TopicSelectionCandidateDecisionMemoryRecord | null>;

  createDecisionWorkQueueItem(
    record: TopicSelectionDecisionWorkQueueItemRecord,
  ): Promise<TopicSelectionDecisionWorkQueueItemRecord>;
  findOpenDecisionWorkQueueItemByDedupKey(
    queueDedupKey: string,
  ): Promise<TopicSelectionDecisionWorkQueueItemRecord | null>;
  updateDecisionWorkQueueItem(
    decisionWorkQueueItemId: string,
    patch: TopicSelectionDecisionWorkQueueItemPatch,
  ): Promise<TopicSelectionDecisionWorkQueueItemRecord>;
  listDecisionWorkQueueItemsByStatuses(
    statuses: TopicSelectionQueueItemStatus[],
  ): Promise<TopicSelectionDecisionWorkQueueItemRecord[]>;
}
