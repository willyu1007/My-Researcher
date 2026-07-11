import type {
  AgentWorkflowHarnessRun,
  CreateAgentWorkflowHarnessRunResponse,
  DecisionWorkQueueItem,
  ImplementationGateResult,
  ImplementationHarness,
  ImplementationInputSnapshot,
  ImplementationProposalArtifact,
  ImplementationQualitySignal,
  ImplementationTransitionAttempt,
  ResolveDecisionWorkQueueItemRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-ai-workflow-harness-contracts';

import { AppError } from '../errors/app-error.js';
import {
  PAPER_IMPLEMENTATION_DECISION_QUEUE_RAISE_RETRY_BUDGET_ACTION,
  PAPER_IMPLEMENTATION_DECISION_QUEUE_REOPEN_COOLDOWN_MS,
  type AgentWorkflowHarnessRunPersistence,
  type PaperImplementationAiWorkflowHarnessRepository,
} from './paper-implementation-ai-workflow-harness.repository.js';

const TERMINAL_DECISION_QUEUE_STATUSES = new Set<DecisionWorkQueueItem['status']>([
  'resolved',
  'dismissed',
  'superseded',
]);

export class InMemoryPaperImplementationAiWorkflowHarnessRepository
implements PaperImplementationAiWorkflowHarnessRepository {
  private readonly reopenCooldownMs: number;
  private readonly harnesses = new Map<string, ImplementationHarness>();
  private readonly harnessIdsByProject = new Map<string, string[]>();
  private readonly snapshots = new Map<string, ImplementationInputSnapshot>();
  private readonly snapshotIdsByProject = new Map<string, string[]>();
  private readonly runs = new Map<string, AgentWorkflowHarnessRun>();
  private readonly runIdsByProject = new Map<string, string[]>();
  private readonly proposals = new Map<string, ImplementationProposalArtifact>();
  private readonly proposalIdsByProject = new Map<string, string[]>();
  private readonly qualitySignals = new Map<string, ImplementationQualitySignal>();
  private readonly gateResults = new Map<string, ImplementationGateResult>();
  private readonly transitionAttempts = new Map<string, ImplementationTransitionAttempt>();
  private readonly queueItems = new Map<string, DecisionWorkQueueItem>();
  private readonly queueItemIdsByProject = new Map<string, string[]>();
  private readonly queueItemIdByProjectDedupKey = new Map<string, string>();

  constructor(options: { reopenCooldownMs?: number } = {}) {
    this.reopenCooldownMs = options.reopenCooldownMs
      ?? PAPER_IMPLEMENTATION_DECISION_QUEUE_REOPEN_COOLDOWN_MS;
  }

  async createHarness(harness: ImplementationHarness): Promise<ImplementationHarness> {
    this.assertNewId(this.harnesses, harness.harness_id, 'ImplementationHarness');
    const stored = structuredClone(harness);
    this.harnesses.set(stored.harness_id, stored);
    this.pushId(this.harnessIdsByProject, stored.implementation_project_id, stored.harness_id);
    return structuredClone(stored);
  }

  async findHarnessById(
    implementationProjectId: string,
    harnessId: string,
  ): Promise<ImplementationHarness | null> {
    const harness = this.harnesses.get(harnessId);
    if (!harness || harness.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(harness);
  }

  async listHarnesses(implementationProjectId: string): Promise<ImplementationHarness[]> {
    return (this.harnessIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.harnesses.get(id))
      .filter((harness): harness is ImplementationHarness => Boolean(harness))
      .map((harness) => structuredClone(harness));
  }

  async createInputSnapshot(
    snapshot: ImplementationInputSnapshot,
  ): Promise<ImplementationInputSnapshot> {
    this.assertNewId(this.snapshots, snapshot.input_snapshot_id, 'ImplementationInputSnapshot');
    const stored = structuredClone(snapshot);
    this.snapshots.set(stored.input_snapshot_id, stored);
    this.pushId(this.snapshotIdsByProject, stored.implementation_project_id, stored.input_snapshot_id);
    return structuredClone(stored);
  }

  async findInputSnapshotById(
    implementationProjectId: string,
    inputSnapshotId: string,
  ): Promise<ImplementationInputSnapshot | null> {
    const snapshot = this.snapshots.get(inputSnapshotId);
    if (!snapshot || snapshot.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(snapshot);
  }

  async listInputSnapshots(implementationProjectId: string): Promise<ImplementationInputSnapshot[]> {
    return (this.snapshotIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.snapshots.get(id))
      .filter((snapshot): snapshot is ImplementationInputSnapshot => Boolean(snapshot))
      .map((snapshot) => structuredClone(snapshot));
  }

  async createAgentWorkflowHarnessRun(
    persistence: AgentWorkflowHarnessRunPersistence,
  ): Promise<CreateAgentWorkflowHarnessRunResponse> {
    const run = persistence.harness_run;
    this.assertNewId(this.runs, run.harness_run_id, 'AgentWorkflowHarnessRun');
    for (const proposal of persistence.proposal_artifacts) {
      this.assertNewId(this.proposals, proposal.proposal_artifact_id, 'ImplementationProposalArtifact');
    }
    for (const signal of persistence.quality_signals) {
      this.assertNewId(this.qualitySignals, signal.quality_signal_id, 'ImplementationQualitySignal');
    }
    this.assertNewId(this.gateResults, persistence.gate_result.gate_result_id, 'ImplementationGateResult');
    this.assertNewId(
      this.transitionAttempts,
      persistence.transition_attempt.transition_id,
      'ImplementationTransitionAttempt',
    );
    for (const item of persistence.queue_items) {
      this.assertQueueItemCanUpsert(item);
    }

    const storedRun = structuredClone(run);
    this.runs.set(storedRun.harness_run_id, storedRun);
    this.pushId(this.runIdsByProject, storedRun.implementation_project_id, storedRun.harness_run_id);

    for (const proposal of persistence.proposal_artifacts) {
      const storedProposal = structuredClone(proposal);
      this.proposals.set(storedProposal.proposal_artifact_id, storedProposal);
      this.pushId(
        this.proposalIdsByProject,
        storedProposal.implementation_project_id,
        storedProposal.proposal_artifact_id,
      );
    }
    for (const signal of persistence.quality_signals) {
      this.qualitySignals.set(signal.quality_signal_id, structuredClone(signal));
    }
    this.gateResults.set(
      persistence.gate_result.gate_result_id,
      structuredClone(persistence.gate_result),
    );
    this.transitionAttempts.set(
      persistence.transition_attempt.transition_id,
      structuredClone(persistence.transition_attempt),
    );

    const queueItems = persistence.queue_items.map((item) => this.createOrReuseQueueItem(item));
    return {
      harness_run: structuredClone(persistence.harness_run),
      proposal_artifacts: structuredClone(persistence.proposal_artifacts),
      quality_signals: structuredClone(persistence.quality_signals),
      gate_result: structuredClone(persistence.gate_result),
      transition_attempt: structuredClone(persistence.transition_attempt),
      queue_items: queueItems,
    };
  }

  async listAgentWorkflowHarnessRuns(
    implementationProjectId: string,
  ): Promise<AgentWorkflowHarnessRun[]> {
    return (this.runIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.runs.get(id))
      .filter((run): run is AgentWorkflowHarnessRun => Boolean(run))
      .map((run) => structuredClone(run));
  }

  async listProposalArtifacts(
    implementationProjectId: string,
  ): Promise<ImplementationProposalArtifact[]> {
    return (this.proposalIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.proposals.get(id))
      .filter((proposal): proposal is ImplementationProposalArtifact => Boolean(proposal))
      .map((proposal) => structuredClone(proposal));
  }

  async listDecisionWorkQueueItems(
    implementationProjectId: string,
  ): Promise<DecisionWorkQueueItem[]> {
    return (this.queueItemIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.queueItems.get(id))
      .filter((item): item is DecisionWorkQueueItem => Boolean(item))
      .map((item) => structuredClone(item));
  }

  async findDecisionWorkQueueItemById(
    implementationProjectId: string,
    queueItemId: string,
  ): Promise<DecisionWorkQueueItem | null> {
    const item = this.queueItems.get(queueItemId);
    if (!item || item.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(item);
  }

  async enqueueDecisionWorkQueueItem(item: DecisionWorkQueueItem): Promise<DecisionWorkQueueItem> {
    return this.createOrReuseQueueItem(item);
  }

  async resolveDecisionWorkQueueItem(
    implementationProjectId: string,
    queueItemId: string,
    resolution: ResolveDecisionWorkQueueItemRequest & { resolved_at: string },
  ): Promise<DecisionWorkQueueItem> {
    const existing = this.queueItems.get(queueItemId);
    if (!existing || existing.implementation_project_id !== implementationProjectId) {
      throw new AppError(404, 'NOT_FOUND', `DecisionWorkQueueItem ${queueItemId} not found.`);
    }
    if (TERMINAL_DECISION_QUEUE_STATUSES.has(existing.status)) {
      if (existing.status === resolution.status) {
        return structuredClone(existing);
      }
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `DecisionWorkQueueItem ${queueItemId} is already ${existing.status}.`,
      );
    }
    // Explicit raise only — an override can never lower the budget.
    const retryBudget = resolution.retry_budget_override
      ? Math.max(existing.retry_budget, resolution.retry_budget_override)
      : existing.retry_budget;
    const recommendedActions = retryBudget > existing.retry_count
      ? existing.recommended_actions.filter(
        (action) => action !== PAPER_IMPLEMENTATION_DECISION_QUEUE_RAISE_RETRY_BUDGET_ACTION,
      )
      : existing.recommended_actions;
    const updated: DecisionWorkQueueItem = {
      ...existing,
      status: resolution.status,
      retry_budget: retryBudget,
      recommended_actions: recommendedActions,
      resolved_at: resolution.resolved_at,
      updated_at: resolution.resolved_at,
    };
    this.queueItems.set(queueItemId, structuredClone(updated));
    return structuredClone(updated);
  }

  private createOrReuseQueueItem(item: DecisionWorkQueueItem): DecisionWorkQueueItem {
    const dedupKey = this.queueDedupKey(item.implementation_project_id, item.dedup_key);
    const existingId = this.queueItemIdByProjectDedupKey.get(dedupKey);
    const existing = existingId ? this.queueItems.get(existingId) : null;
    if (existing) {
      if (TERMINAL_DECISION_QUEUE_STATUSES.has(existing.status)) {
        // W4 real retry/cooldown semantics: a reopen is one consumed retry —
        // accumulate on the stored item instead of taking the fresh item's
        // zeroed counters — and start a fixed reopen cooldown window.
        const retryCount = existing.retry_count + 1;
        const retryBudget = Math.max(existing.retry_budget, item.retry_budget);
        const recommendedActions = retryCount >= retryBudget
          ? this.uniqueStrings([
            ...item.recommended_actions,
            PAPER_IMPLEMENTATION_DECISION_QUEUE_RAISE_RETRY_BUDGET_ACTION,
          ])
          : item.recommended_actions;
        const reopened: DecisionWorkQueueItem = {
          ...existing,
          queue_type: item.queue_type,
          stage: item.stage,
          target_ref: item.target_ref,
          priority: item.priority,
          status: 'open',
          blocking_transition_keys: this.uniqueStrings([
            ...existing.blocking_transition_keys,
            ...item.blocking_transition_keys,
          ]),
          allowed_handlers: item.allowed_handlers,
          recommended_actions: recommendedActions,
          created_from_refs: this.mergeCreatedFromRefs(existing, item),
          policy_version_id: item.policy_version_id,
          retry_count: retryCount,
          retry_budget: retryBudget,
          cooldown_until: new Date(
            Date.parse(item.updated_at) + this.reopenCooldownMs,
          ).toISOString(),
          source_coordinator_run_ref:
            item.source_coordinator_run_ref ?? existing.source_coordinator_run_ref ?? null,
          source_step_index: item.source_step_index ?? existing.source_step_index ?? null,
          resolved_at: null,
          updated_at: item.updated_at,
        };
        this.queueItems.set(existing.queue_item_id, structuredClone(reopened));
        return structuredClone(reopened);
      }
      return structuredClone(existing);
    }
    this.assertNewId(this.queueItems, item.queue_item_id, 'DecisionWorkQueueItem');
    const stored = structuredClone(item);
    this.queueItems.set(stored.queue_item_id, stored);
    this.queueItemIdByProjectDedupKey.set(dedupKey, stored.queue_item_id);
    this.pushId(this.queueItemIdsByProject, stored.implementation_project_id, stored.queue_item_id);
    return structuredClone(stored);
  }

  private assertQueueItemCanUpsert(item: DecisionWorkQueueItem): void {
    const dedupKey = this.queueDedupKey(item.implementation_project_id, item.dedup_key);
    const existingId = this.queueItemIdByProjectDedupKey.get(dedupKey);
    if (existingId) {
      return;
    }
    this.assertNewId(this.queueItems, item.queue_item_id, 'DecisionWorkQueueItem');
  }

  private assertNewId<T>(map: Map<string, T>, id: string, label: string): void {
    if (map.has(id)) {
      throw new AppError(409, 'VERSION_CONFLICT', `${label} ${id} already exists.`);
    }
  }

  private pushId(map: Map<string, string[]>, key: string, id: string): void {
    const ids = map.get(key) ?? [];
    ids.push(id);
    map.set(key, ids);
  }

  private queueDedupKey(implementationProjectId: string, dedupKey: string): string {
    return `${implementationProjectId}:${dedupKey}`;
  }

  private mergeCreatedFromRefs(
    existing: DecisionWorkQueueItem,
    item: DecisionWorkQueueItem,
  ): DecisionWorkQueueItem['created_from_refs'] {
    const refs = new Map<string, DecisionWorkQueueItem['created_from_refs'][number]>();
    for (const ref of [...existing.created_from_refs, ...item.created_from_refs]) {
      refs.set(this.refKey(ref), ref);
    }
    return [...refs.values()];
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values)];
  }

  private refKey(ref: DecisionWorkQueueItem['created_from_refs'][number]): string {
    return [ref.ref_type, ref.ref_id, ref.version_id ?? ''].join(':');
  }
}
