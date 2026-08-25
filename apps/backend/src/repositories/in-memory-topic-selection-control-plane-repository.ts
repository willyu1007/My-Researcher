import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionChainTransitionAttemptRecord,
  TopicSelectionContextPolicyVersionRecord,
  TopicSelectionFunctionalLineageLinkRecord,
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
} from './topic-selection-control-plane.repository.js';

export class InMemoryTopicSelectionControlPlaneRepository implements TopicSelectionControlPlaneRepository {
  private readonly contextPolicies = new Map<string, TopicSelectionContextPolicyVersionRecord>();
  private readonly workflowProfilePolicies = new Map<string, TopicSelectionWorkflowProfilePolicyRecord>();
  private readonly transitionPolicies = new Map<string, TopicSelectionTransitionPolicyVersionRecord>();
  private readonly inputSnapshots = new Map<string, TopicSelectionInputSnapshotRecord>();
  private readonly artifactRefs = new Map<string, TopicSelectionArtifactRefRecord>();
  private readonly workflowRuns = new Map<string, TopicSelectionLlmWorkflowRunRecord>();
  private readonly gateResults = new Map<string, TopicSelectionReadinessGateResultRecord>();
  private readonly qualitySignals = new Map<string, TopicSelectionQualitySignalRecord>();
  private readonly transitionAttempts = new Map<string, TopicSelectionChainTransitionAttemptRecord>();
  private readonly lineageLinks = new Map<string, TopicSelectionFunctionalLineageLinkRecord>();
  private readonly traceSnapshots = new Map<string, TopicSelectionTraceSnapshotRecord>();
  private readonly humanDecisions = new Map<string, TopicSelectionHumanConfirmedDecisionRecord>();

  async createContextPolicyVersion(
    record: TopicSelectionContextPolicyVersionRecord,
  ): Promise<TopicSelectionContextPolicyVersionRecord> {
    this.contextPolicies.set(record.context_policy_version_id, record);
    return record;
  }

  async findContextPolicyVersionById(
    contextPolicyVersionId: string,
  ): Promise<TopicSelectionContextPolicyVersionRecord | null> {
    return this.contextPolicies.get(contextPolicyVersionId) ?? null;
  }

  async createWorkflowProfilePolicy(
    record: TopicSelectionWorkflowProfilePolicyRecord,
  ): Promise<TopicSelectionWorkflowProfilePolicyRecord> {
    this.workflowProfilePolicies.set(record.workflow_profile_policy_id, record);
    return record;
  }

  async findWorkflowProfilePolicyById(
    workflowProfilePolicyId: string,
  ): Promise<TopicSelectionWorkflowProfilePolicyRecord | null> {
    return this.workflowProfilePolicies.get(workflowProfilePolicyId) ?? null;
  }

  async createTransitionPolicyVersion(
    record: TopicSelectionTransitionPolicyVersionRecord,
  ): Promise<TopicSelectionTransitionPolicyVersionRecord> {
    this.transitionPolicies.set(record.transition_policy_version_id, record);
    return record;
  }

  async findTransitionPolicyVersionById(
    transitionPolicyVersionId: string,
  ): Promise<TopicSelectionTransitionPolicyVersionRecord | null> {
    return this.transitionPolicies.get(transitionPolicyVersionId) ?? null;
  }

  async createInputSnapshot(record: TopicSelectionInputSnapshotRecord): Promise<TopicSelectionInputSnapshotRecord> {
    const existing = this.inputSnapshots.get(record.input_snapshot_id);
    if (existing) return existing;
    this.inputSnapshots.set(record.input_snapshot_id, record);
    return record;
  }

  async findInputSnapshotById(inputSnapshotId: string): Promise<TopicSelectionInputSnapshotRecord | null> {
    return this.inputSnapshots.get(inputSnapshotId) ?? null;
  }

  async createArtifactRef(record: TopicSelectionArtifactRefRecord): Promise<TopicSelectionArtifactRefRecord> {
    this.artifactRefs.set(record.artifact_ref_id, record);
    return record;
  }

  async findArtifactRefById(artifactRefId: string): Promise<TopicSelectionArtifactRefRecord | null> {
    return this.artifactRefs.get(artifactRefId) ?? null;
  }

  async listArtifactRefsByWorkflowRunId(workflowRunId: string): Promise<TopicSelectionArtifactRefRecord[]> {
    return [...this.artifactRefs.values()]
      .filter((record) => record.workflow_run_id === workflowRunId)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
  }

  async listArtifactRefsByInputSnapshotId(inputSnapshotId: string): Promise<TopicSelectionArtifactRefRecord[]> {
    return [...this.artifactRefs.values()]
      .filter((record) => record.input_snapshot_id === inputSnapshotId)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
  }

  async createWorkflowRun(record: TopicSelectionLlmWorkflowRunRecord): Promise<TopicSelectionLlmWorkflowRunRecord> {
    this.workflowRuns.set(record.workflow_run_id, record);
    return record;
  }

  async createWorkflowRunWithArtifactRefs(
    workflowRun: TopicSelectionLlmWorkflowRunRecord,
    artifactRefs: TopicSelectionArtifactRefRecord[],
  ): Promise<TopicSelectionWorkflowRunWithArtifactRefsResult> {
    this.workflowRuns.set(workflowRun.workflow_run_id, workflowRun);
    for (const artifactRef of artifactRefs) {
      this.artifactRefs.set(artifactRef.artifact_ref_id, artifactRef);
    }
    return {
      workflow_run: workflowRun,
      artifact_refs: artifactRefs,
    };
  }

  async findWorkflowRunById(workflowRunId: string): Promise<TopicSelectionLlmWorkflowRunRecord | null> {
    return this.workflowRuns.get(workflowRunId) ?? null;
  }

  async updateWorkflowRun(
    workflowRunId: string,
    patch: Partial<Omit<TopicSelectionLlmWorkflowRunRecord, 'workflow_run_id' | 'started_at' | 'created_by'>>,
  ): Promise<TopicSelectionLlmWorkflowRunRecord> {
    const current = this.workflowRuns.get(workflowRunId);
    if (!current) {
      throw new Error(`Workflow run ${workflowRunId} not found.`);
    }
    const next: TopicSelectionLlmWorkflowRunRecord = {
      ...current,
      ...patch,
    };
    this.workflowRuns.set(workflowRunId, next);
    return next;
  }

  async createReadinessGateResult(
    record: TopicSelectionReadinessGateResultRecord,
  ): Promise<TopicSelectionReadinessGateResultRecord> {
    this.gateResults.set(record.readiness_gate_result_id, record);
    return record;
  }

  async findReadinessGateResultById(
    readinessGateResultId: string,
  ): Promise<TopicSelectionReadinessGateResultRecord | null> {
    return this.gateResults.get(readinessGateResultId) ?? null;
  }

  async createQualitySignal(record: TopicSelectionQualitySignalRecord): Promise<TopicSelectionQualitySignalRecord> {
    this.qualitySignals.set(record.quality_signal_id, record);
    return record;
  }

  async findQualitySignalById(qualitySignalId: string): Promise<TopicSelectionQualitySignalRecord | null> {
    return this.qualitySignals.get(qualitySignalId) ?? null;
  }

  async createChainTransitionAttempt(
    record: TopicSelectionChainTransitionAttemptRecord,
  ): Promise<TopicSelectionChainTransitionAttemptRecord> {
    this.transitionAttempts.set(record.chain_transition_attempt_id, record);
    return record;
  }

  async findChainTransitionAttemptById(
    chainTransitionAttemptId: string,
  ): Promise<TopicSelectionChainTransitionAttemptRecord | null> {
    return this.transitionAttempts.get(chainTransitionAttemptId) ?? null;
  }

  async createFunctionalLineageLink(
    record: TopicSelectionFunctionalLineageLinkRecord,
  ): Promise<TopicSelectionFunctionalLineageLinkRecord> {
    this.lineageLinks.set(record.functional_lineage_link_id, record);
    return record;
  }

  async findFunctionalLineageLinkById(
    functionalLineageLinkId: string,
  ): Promise<TopicSelectionFunctionalLineageLinkRecord | null> {
    return this.lineageLinks.get(functionalLineageLinkId) ?? null;
  }

  async createTraceSnapshot(record: TopicSelectionTraceSnapshotRecord): Promise<TopicSelectionTraceSnapshotRecord> {
    this.traceSnapshots.set(record.trace_snapshot_id, record);
    return record;
  }

  async findTraceSnapshotById(traceSnapshotId: string): Promise<TopicSelectionTraceSnapshotRecord | null> {
    return this.traceSnapshots.get(traceSnapshotId) ?? null;
  }

  async createHumanConfirmedDecision(
    record: TopicSelectionHumanConfirmedDecisionRecord,
  ): Promise<TopicSelectionHumanConfirmedDecisionRecord> {
    this.humanDecisions.set(record.human_confirmed_decision_id, record);
    return record;
  }

  async findHumanConfirmedDecisionById(
    humanConfirmedDecisionId: string,
  ): Promise<TopicSelectionHumanConfirmedDecisionRecord | null> {
    return this.humanDecisions.get(humanConfirmedDecisionId) ?? null;
  }

  async listHumanConfirmedDecisionsByTargetRef(
    targetRef: { ref_type: string; ref_id: string },
  ): Promise<TopicSelectionHumanConfirmedDecisionRecord[]> {
    return [...this.humanDecisions.values()]
      .filter((record) =>
        record.target_ref.ref_type === targetRef.ref_type
        && record.target_ref.ref_id === targetRef.ref_id,
      )
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }
}
