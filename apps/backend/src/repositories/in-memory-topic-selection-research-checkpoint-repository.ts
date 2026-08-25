import type {
  TopicSelectionResearchCheckpointDecisionRecord,
  TopicSelectionResearchCheckpointRecord,
  TopicSelectionResearchObjectionRecord,
  TopicSelectionResearchObjectionResolutionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-checkpoint-contracts';
import {
  TopicSelectionResearchCheckpointCurrentConflictError,
  type TopicSelectionResearchCheckpointDecisionPersistence,
  type TopicSelectionResearchCheckpointRepository,
} from './topic-selection-research-checkpoint.repository.js';

export class InMemoryTopicSelectionResearchCheckpointRepository
implements TopicSelectionResearchCheckpointRepository {
  private readonly checkpoints = new Map<string, TopicSelectionResearchCheckpointRecord>();
  private readonly checkpointIdsByKey = new Map<string, string>();
  private readonly currentCheckpointIds = new Map<string, string>();
  private readonly decisions = new Map<string, TopicSelectionResearchCheckpointDecisionRecord>();
  private readonly decisionIdsByKey = new Map<string, string>();
  private readonly decisionIdsByCheckpoint = new Map<string, string>();
  private readonly objections = new Map<string, TopicSelectionResearchObjectionRecord>();
  private readonly objectionIdsByKey = new Map<string, string>();
  private readonly resolutions = new Map<string, TopicSelectionResearchObjectionResolutionRecord>();
  private readonly resolutionIdsByKey = new Map<string, string>();
  private readonly resolutionIdsByObjection = new Map<string, string>();

  async replaceCurrentCheckpoint(
    record: TopicSelectionResearchCheckpointRecord,
  ): Promise<TopicSelectionResearchCheckpointRecord> {
    const existingId = this.checkpointIdsByKey.get(record.checkpoint_key);
    if (existingId) {
      return this.requireCheckpoint(existingId);
    }
    const currentKey = record.current_checkpoint_key;
    if (!currentKey) {
      throw new Error('A new ResearchCheckpoint requires current_checkpoint_key.');
    }
    const previousId = this.currentCheckpointIds.get(currentKey);
    const now = record.created_at;
    if (previousId) {
      const previous = this.requireCheckpoint(previousId);
      this.checkpoints.set(previousId, {
        ...previous,
        current_checkpoint_key: null,
        status: 'superseded',
        superseded_by_checkpoint_id: record.research_checkpoint_id,
        superseded_at: now,
        updated_at: now,
      });
    }
    const persisted = {
      ...record,
      supersedes_checkpoint_id: previousId ?? null,
    };
    this.checkpoints.set(record.research_checkpoint_id, persisted);
    this.checkpointIdsByKey.set(record.checkpoint_key, record.research_checkpoint_id);
    this.currentCheckpointIds.set(currentKey, record.research_checkpoint_id);
    return persisted;
  }

  async findCheckpointById(checkpointId: string): Promise<TopicSelectionResearchCheckpointRecord | null> {
    return this.checkpoints.get(checkpointId) ?? null;
  }

  async findCheckpointByKey(checkpointKey: string): Promise<TopicSelectionResearchCheckpointRecord | null> {
    const id = this.checkpointIdsByKey.get(checkpointKey);
    return id ? this.requireCheckpoint(id) : null;
  }

  async findCurrentCheckpoint(
    titleCardId: string,
    checkpointKind: TopicSelectionResearchCheckpointRecord['checkpoint_kind'],
  ): Promise<TopicSelectionResearchCheckpointRecord | null> {
    const id = this.currentCheckpointIds.get(`${titleCardId}:${checkpointKind}`);
    return id ? this.requireCheckpoint(id) : null;
  }

  async listCheckpointsByTitleCardId(titleCardId: string): Promise<TopicSelectionResearchCheckpointRecord[]> {
    return [...this.checkpoints.values()]
      .filter((record) => record.title_card_id === titleCardId)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
  }

  async createDecision(
    persistence: TopicSelectionResearchCheckpointDecisionPersistence,
  ): Promise<TopicSelectionResearchCheckpointDecisionRecord> {
    const { checkpoint, decision } = persistence;
    const current = this.requireCheckpoint(checkpoint.research_checkpoint_id);
    if (current.current_checkpoint_key !== checkpoint.current_checkpoint_key || current.status !== 'pending') {
      throw new TopicSelectionResearchCheckpointCurrentConflictError(
        checkpoint.current_checkpoint_key ?? `${checkpoint.title_card_id}:${checkpoint.checkpoint_kind}`,
      );
    }
    if (this.decisionIdsByKey.has(decision.decision_key)
      || this.decisionIdsByCheckpoint.has(decision.research_checkpoint_id)) {
      throw new Error('ResearchCheckpointDecision already exists.');
    }
    this.decisions.set(decision.research_checkpoint_decision_id, decision);
    this.decisionIdsByKey.set(decision.decision_key, decision.research_checkpoint_decision_id);
    this.decisionIdsByCheckpoint.set(decision.research_checkpoint_id, decision.research_checkpoint_decision_id);
    this.checkpoints.set(current.research_checkpoint_id, checkpoint);
    return decision;
  }

  async advanceWithExistingAuthority(
    checkpoint: TopicSelectionResearchCheckpointRecord,
  ): Promise<TopicSelectionResearchCheckpointRecord> {
    const current = this.requireCheckpoint(checkpoint.research_checkpoint_id);
    if (current.current_checkpoint_key !== checkpoint.current_checkpoint_key || current.status !== 'pending') {
      throw new TopicSelectionResearchCheckpointCurrentConflictError(
        checkpoint.current_checkpoint_key ?? `${checkpoint.title_card_id}:${checkpoint.checkpoint_kind}`,
      );
    }
    this.checkpoints.set(current.research_checkpoint_id, checkpoint);
    return checkpoint;
  }

  async findDecisionById(decisionId: string): Promise<TopicSelectionResearchCheckpointDecisionRecord | null> {
    return this.decisions.get(decisionId) ?? null;
  }

  async findDecisionByKey(decisionKey: string): Promise<TopicSelectionResearchCheckpointDecisionRecord | null> {
    const id = this.decisionIdsByKey.get(decisionKey);
    return id ? this.decisions.get(id) ?? null : null;
  }

  async findDecisionByCheckpointId(
    checkpointId: string,
  ): Promise<TopicSelectionResearchCheckpointDecisionRecord | null> {
    const id = this.decisionIdsByCheckpoint.get(checkpointId);
    return id ? this.decisions.get(id) ?? null : null;
  }

  async createObjection(record: TopicSelectionResearchObjectionRecord): Promise<TopicSelectionResearchObjectionRecord> {
    if (this.objectionIdsByKey.has(record.objection_key)) {
      throw new Error('ResearchObjection already exists.');
    }
    this.objections.set(record.research_objection_id, record);
    this.objectionIdsByKey.set(record.objection_key, record.research_objection_id);
    return record;
  }

  async findObjectionById(objectionId: string): Promise<TopicSelectionResearchObjectionRecord | null> {
    return this.objections.get(objectionId) ?? null;
  }

  async findObjectionByKey(objectionKey: string): Promise<TopicSelectionResearchObjectionRecord | null> {
    const id = this.objectionIdsByKey.get(objectionKey);
    return id ? this.objections.get(id) ?? null : null;
  }

  async listObjectionsByCheckpointId(checkpointId: string): Promise<TopicSelectionResearchObjectionRecord[]> {
    return [...this.objections.values()]
      .filter((record) => record.research_checkpoint_id === checkpointId)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
  }

  async createObjectionResolution(
    record: TopicSelectionResearchObjectionResolutionRecord,
  ): Promise<TopicSelectionResearchObjectionResolutionRecord> {
    if (this.resolutionIdsByKey.has(record.resolution_key)
      || this.resolutionIdsByObjection.has(record.research_objection_id)) {
      throw new Error('ResearchObjectionResolution already exists.');
    }
    this.resolutions.set(record.research_objection_resolution_id, record);
    this.resolutionIdsByKey.set(record.resolution_key, record.research_objection_resolution_id);
    this.resolutionIdsByObjection.set(record.research_objection_id, record.research_objection_resolution_id);
    return record;
  }

  async findObjectionResolutionByKey(
    resolutionKey: string,
  ): Promise<TopicSelectionResearchObjectionResolutionRecord | null> {
    const id = this.resolutionIdsByKey.get(resolutionKey);
    return id ? this.resolutions.get(id) ?? null : null;
  }

  async findObjectionResolutionByObjectionId(
    objectionId: string,
  ): Promise<TopicSelectionResearchObjectionResolutionRecord | null> {
    const id = this.resolutionIdsByObjection.get(objectionId);
    return id ? this.resolutions.get(id) ?? null : null;
  }

  private requireCheckpoint(checkpointId: string): TopicSelectionResearchCheckpointRecord {
    const record = this.checkpoints.get(checkpointId);
    if (!record) {
      throw new Error(`ResearchCheckpoint ${checkpointId} not found.`);
    }
    return record;
  }
}
