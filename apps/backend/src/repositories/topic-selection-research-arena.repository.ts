import type {
  TopicSelectionResearchArenaCandidateProjection,
  TopicSelectionResearchArenaKind,
  TopicSelectionResearchArenaRoleExecutionRecord,
  TopicSelectionResearchArenaSessionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';

export class TopicSelectionResearchArenaConflictError extends Error {}

export interface TopicSelectionResearchArenaRepository {
  replaceCurrentSession(
    record: TopicSelectionResearchArenaSessionRecord,
  ): Promise<TopicSelectionResearchArenaSessionRecord>;
  findSessionById(sessionId: string): Promise<TopicSelectionResearchArenaSessionRecord | null>;
  findSessionByKey(sessionKey: string): Promise<TopicSelectionResearchArenaSessionRecord | null>;
  findCurrentSession(
    titleCardId: string,
    arenaKind: TopicSelectionResearchArenaKind,
  ): Promise<TopicSelectionResearchArenaSessionRecord | null>;
  updateSession(record: TopicSelectionResearchArenaSessionRecord): Promise<TopicSelectionResearchArenaSessionRecord>;
  claimSessionExecution(
    sessionId: string,
  ): Promise<TopicSelectionResearchArenaSessionRecord | null>;
  completeClaimedSession(
    record: TopicSelectionResearchArenaSessionRecord,
  ): Promise<TopicSelectionResearchArenaSessionRecord>;
  synthesizeSessionWithCandidateProjections(
    record: TopicSelectionResearchArenaSessionRecord,
    candidateProjections: TopicSelectionResearchArenaCandidateProjection[],
  ): Promise<TopicSelectionResearchArenaSessionRecord>;
  createRoleExecution(
    record: TopicSelectionResearchArenaRoleExecutionRecord,
  ): Promise<TopicSelectionResearchArenaRoleExecutionRecord>;
  findRoleExecutionByRuntimeIdentityHash(
    runtimeIdentityHash: string,
  ): Promise<TopicSelectionResearchArenaRoleExecutionRecord | null>;
  findRoleExecutionBySlot(
    sessionId: string,
    roleSlotId: string,
    instanceIndex: number,
  ): Promise<TopicSelectionResearchArenaRoleExecutionRecord | null>;
  listRoleExecutionsBySessionId(
    sessionId: string,
  ): Promise<TopicSelectionResearchArenaRoleExecutionRecord[]>;
}
