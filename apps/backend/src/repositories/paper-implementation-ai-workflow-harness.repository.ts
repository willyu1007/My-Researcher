import type {
  AgentWorkflowHarnessRun,
  AgentWorkflowHarnessSpec,
  CreateAgentWorkflowHarnessRunResponse,
  DecisionWorkQueueItem,
  ImplementationHarness,
  ImplementationInputSnapshot,
  ImplementationProposalArtifact,
  ResolveDecisionWorkQueueItemRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-ai-workflow-harness-contracts';

export type AgentWorkflowHarnessRunPersistence = CreateAgentWorkflowHarnessRunResponse & {
  spec: AgentWorkflowHarnessSpec;
};

/**
 * W4 v1 reopen-cooldown policy: a fixed constant, not a per-item policy
 * object. When a terminal queue item is reopened by a recurring blocker,
 * `cooldown_until = reopen time + this value`; automatic re-advance reflow
 * is rejected until the cooldown elapses (manual coordinator advance stays
 * available). Tests may inject a different value through the repository
 * constructor; product wiring uses this default.
 */
export const PAPER_IMPLEMENTATION_DECISION_QUEUE_REOPEN_COOLDOWN_MS = 15 * 60_000;

/**
 * W4 marker action appended on reopen once `retry_count >= retry_budget`.
 * Deliberate trade-off: no new queue-status enum value — the item stays
 * `open` (visible, manually workable) and this recommended action plus the
 * resolve-route 409 carry the "needs a human budget raise" semantics.
 */
export const PAPER_IMPLEMENTATION_DECISION_QUEUE_RAISE_RETRY_BUDGET_ACTION = 'raise_retry_budget';

/**
 * Narrow enqueue surface for the run coordinator (W4). The queue is a
 * governance surface, not domain authority, so the coordinator may hold this
 * writer — but only this writer: a single dedup/reopen-aware enqueue method,
 * satisfied by the harness repository. Do not widen without a boundary
 * decision.
 */
export interface PaperImplementationDecisionQueueWriter {
  enqueueDecisionWorkQueueItem(item: DecisionWorkQueueItem): Promise<DecisionWorkQueueItem>;
}

export interface PaperImplementationAiWorkflowHarnessRepository
  extends PaperImplementationDecisionQueueWriter {
  createHarness(
    harness: ImplementationHarness,
  ): Promise<ImplementationHarness>;

  findHarnessById(
    implementationProjectId: string,
    harnessId: string,
  ): Promise<ImplementationHarness | null>;

  listHarnesses(
    implementationProjectId: string,
  ): Promise<ImplementationHarness[]>;

  createInputSnapshot(
    snapshot: ImplementationInputSnapshot,
  ): Promise<ImplementationInputSnapshot>;

  findInputSnapshotById(
    implementationProjectId: string,
    inputSnapshotId: string,
  ): Promise<ImplementationInputSnapshot | null>;

  listInputSnapshots(
    implementationProjectId: string,
  ): Promise<ImplementationInputSnapshot[]>;

  createAgentWorkflowHarnessRun(
    persistence: AgentWorkflowHarnessRunPersistence,
  ): Promise<CreateAgentWorkflowHarnessRunResponse>;

  listAgentWorkflowHarnessRuns(
    implementationProjectId: string,
  ): Promise<AgentWorkflowHarnessRun[]>;

  listProposalArtifacts(
    implementationProjectId: string,
  ): Promise<ImplementationProposalArtifact[]>;

  listDecisionWorkQueueItems(
    implementationProjectId: string,
  ): Promise<DecisionWorkQueueItem[]>;

  findDecisionWorkQueueItemById(
    implementationProjectId: string,
    queueItemId: string,
  ): Promise<DecisionWorkQueueItem | null>;

  resolveDecisionWorkQueueItem(
    implementationProjectId: string,
    queueItemId: string,
    resolution: ResolveDecisionWorkQueueItemRequest & { resolved_at: string },
  ): Promise<DecisionWorkQueueItem>;
}
