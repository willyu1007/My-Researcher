import type { TopicSelectionHumanConfirmedDecisionRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionResearchCheckpointDecisionRecord,
  TopicSelectionResearchCheckpointRecord,
  TopicSelectionResearchObjectionRecord,
  TopicSelectionResearchObjectionResolutionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-checkpoint-contracts';

export type TopicSelectionResearchCheckpointDecisionPersistence = {
  checkpoint: TopicSelectionResearchCheckpointRecord;
  decision: TopicSelectionResearchCheckpointDecisionRecord;
  human_confirmed_decision: TopicSelectionHumanConfirmedDecisionRecord;
};

export class TopicSelectionResearchCheckpointCurrentConflictError extends Error {
  constructor(readonly currentCheckpointKey: string) {
    super(`ResearchCheckpoint current key ${currentCheckpointKey} changed concurrently.`);
  }
}

export interface TopicSelectionResearchCheckpointRepository {
  replaceCurrentCheckpoint(
    record: TopicSelectionResearchCheckpointRecord,
  ): Promise<TopicSelectionResearchCheckpointRecord>;
  findCheckpointById(checkpointId: string): Promise<TopicSelectionResearchCheckpointRecord | null>;
  findCheckpointByKey(checkpointKey: string): Promise<TopicSelectionResearchCheckpointRecord | null>;
  findCurrentCheckpoint(
    titleCardId: string,
    checkpointKind: TopicSelectionResearchCheckpointRecord['checkpoint_kind'],
  ): Promise<TopicSelectionResearchCheckpointRecord | null>;
  listCheckpointsByTitleCardId(titleCardId: string): Promise<TopicSelectionResearchCheckpointRecord[]>;

  createDecision(
    persistence: TopicSelectionResearchCheckpointDecisionPersistence,
  ): Promise<TopicSelectionResearchCheckpointDecisionRecord>;
  findDecisionById(decisionId: string): Promise<TopicSelectionResearchCheckpointDecisionRecord | null>;
  findDecisionByKey(decisionKey: string): Promise<TopicSelectionResearchCheckpointDecisionRecord | null>;
  findDecisionByCheckpointId(checkpointId: string): Promise<TopicSelectionResearchCheckpointDecisionRecord | null>;

  createObjection(record: TopicSelectionResearchObjectionRecord): Promise<TopicSelectionResearchObjectionRecord>;
  findObjectionById(objectionId: string): Promise<TopicSelectionResearchObjectionRecord | null>;
  findObjectionByKey(objectionKey: string): Promise<TopicSelectionResearchObjectionRecord | null>;
  listObjectionsByCheckpointId(checkpointId: string): Promise<TopicSelectionResearchObjectionRecord[]>;

  createObjectionResolution(
    record: TopicSelectionResearchObjectionResolutionRecord,
  ): Promise<TopicSelectionResearchObjectionResolutionRecord>;
  findObjectionResolutionByKey(
    resolutionKey: string,
  ): Promise<TopicSelectionResearchObjectionResolutionRecord | null>;
  findObjectionResolutionByObjectionId(
    objectionId: string,
  ): Promise<TopicSelectionResearchObjectionResolutionRecord | null>;
}
