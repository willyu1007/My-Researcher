import type {
  TopicSelectionResearchArenaKind,
  TopicSelectionResearchArenaRoleExecutionRecord,
  TopicSelectionResearchArenaSessionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import {
  TopicSelectionResearchArenaConflictError,
  type TopicSelectionResearchArenaRepository,
} from './topic-selection-research-arena.repository.js';

export class InMemoryTopicSelectionResearchArenaRepository
implements TopicSelectionResearchArenaRepository {
  private readonly sessions = new Map<string, TopicSelectionResearchArenaSessionRecord>();
  private readonly sessionIdsByKey = new Map<string, string>();
  private readonly currentSessionIds = new Map<string, string>();
  private readonly executions = new Map<string, TopicSelectionResearchArenaRoleExecutionRecord>();
  private readonly executionIdsByRuntimeHash = new Map<string, string>();
  private readonly executionIdsBySlot = new Map<string, string>();
  private readonly executionIdsBySemanticPosition = new Map<string, string>();

  async replaceCurrentSession(
    record: TopicSelectionResearchArenaSessionRecord,
  ): Promise<TopicSelectionResearchArenaSessionRecord> {
    const replayId = this.sessionIdsByKey.get(record.session_key);
    if (replayId) return this.requireSession(replayId);
    const currentKey = record.current_arena_key;
    if (!currentKey) throw new TopicSelectionResearchArenaConflictError('A new arena requires a current key.');
    const previousId = this.currentSessionIds.get(currentKey);
    if (previousId) {
      const previous = this.requireSession(previousId);
      this.sessions.set(previousId, {
        ...previous,
        current_arena_key: null,
        status: 'superseded',
        superseded_by_arena_session_id: record.arena_session_id,
        updated_at: record.created_at,
        superseded_at: record.created_at,
      });
    }
    const persisted = { ...record, supersedes_arena_session_id: previousId ?? null };
    this.sessions.set(record.arena_session_id, persisted);
    this.sessionIdsByKey.set(record.session_key, record.arena_session_id);
    this.currentSessionIds.set(currentKey, record.arena_session_id);
    return persisted;
  }

  async findSessionById(sessionId: string): Promise<TopicSelectionResearchArenaSessionRecord | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async findSessionByKey(sessionKey: string): Promise<TopicSelectionResearchArenaSessionRecord | null> {
    const id = this.sessionIdsByKey.get(sessionKey);
    return id ? this.requireSession(id) : null;
  }

  async findCurrentSession(
    titleCardId: string,
    arenaKind: TopicSelectionResearchArenaKind,
  ): Promise<TopicSelectionResearchArenaSessionRecord | null> {
    const id = this.currentSessionIds.get(`${titleCardId}:${arenaKind}`);
    return id ? this.requireSession(id) : null;
  }

  async updateSession(record: TopicSelectionResearchArenaSessionRecord): Promise<TopicSelectionResearchArenaSessionRecord> {
    const current = this.requireSession(record.arena_session_id);
    if (current.current_arena_key !== record.current_arena_key || current.status !== 'open') {
      throw new TopicSelectionResearchArenaConflictError('Arena current key changed concurrently.');
    }
    this.sessions.set(record.arena_session_id, record);
    return record;
  }

  async createRoleExecution(
    record: TopicSelectionResearchArenaRoleExecutionRecord,
  ): Promise<TopicSelectionResearchArenaRoleExecutionRecord> {
    const session = this.requireSession(record.arena_session_id);
    if (session.status !== 'open' || !session.current_arena_key) {
      throw new TopicSelectionResearchArenaConflictError('Arena is not current and open.');
    }
    const slotKey = `${record.arena_session_id}:${record.role_slot_id}:${record.instance_index}`;
    const semanticKey = `${record.arena_session_id}:${record.semantic_position_hash}`;
    if (this.executions.has(record.arena_role_execution_id)
      || this.executionIdsByRuntimeHash.has(record.runtime_identity_hash)
      || this.executionIdsBySlot.has(slotKey)
      || this.executionIdsBySemanticPosition.has(semanticKey)) {
      throw new TopicSelectionResearchArenaConflictError('Arena role execution identity already exists.');
    }
    this.executions.set(record.arena_role_execution_id, record);
    this.executionIdsByRuntimeHash.set(record.runtime_identity_hash, record.arena_role_execution_id);
    this.executionIdsBySlot.set(slotKey, record.arena_role_execution_id);
    this.executionIdsBySemanticPosition.set(semanticKey, record.arena_role_execution_id);
    return record;
  }

  async findRoleExecutionByRuntimeIdentityHash(
    runtimeIdentityHash: string,
  ): Promise<TopicSelectionResearchArenaRoleExecutionRecord | null> {
    const id = this.executionIdsByRuntimeHash.get(runtimeIdentityHash);
    return id ? this.executions.get(id) ?? null : null;
  }

  async listRoleExecutionsBySessionId(
    sessionId: string,
  ): Promise<TopicSelectionResearchArenaRoleExecutionRecord[]> {
    return [...this.executions.values()]
      .filter((record) => record.arena_session_id === sessionId)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
  }

  private requireSession(sessionId: string): TopicSelectionResearchArenaSessionRecord {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`ResearchArenaSession ${sessionId} not found.`);
    return session;
  }
}
