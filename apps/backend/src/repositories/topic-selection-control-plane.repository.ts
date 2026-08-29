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

export type TopicSelectionWorkflowRunWithArtifactRefsResult = {
  workflow_run: TopicSelectionLlmWorkflowRunRecord;
  artifact_refs: TopicSelectionArtifactRefRecord[];
};

export interface TopicSelectionControlPlaneRepository {
  createContextPolicyVersion(
    record: TopicSelectionContextPolicyVersionRecord,
  ): Promise<TopicSelectionContextPolicyVersionRecord>;
  findContextPolicyVersionById(
    contextPolicyVersionId: string,
  ): Promise<TopicSelectionContextPolicyVersionRecord | null>;

  createWorkflowProfilePolicy(
    record: TopicSelectionWorkflowProfilePolicyRecord,
  ): Promise<TopicSelectionWorkflowProfilePolicyRecord>;
  findWorkflowProfilePolicyById(
    workflowProfilePolicyId: string,
  ): Promise<TopicSelectionWorkflowProfilePolicyRecord | null>;

  createTransitionPolicyVersion(
    record: TopicSelectionTransitionPolicyVersionRecord,
  ): Promise<TopicSelectionTransitionPolicyVersionRecord>;
  findTransitionPolicyVersionById(
    transitionPolicyVersionId: string,
  ): Promise<TopicSelectionTransitionPolicyVersionRecord | null>;

  createInputSnapshot(record: TopicSelectionInputSnapshotRecord): Promise<TopicSelectionInputSnapshotRecord>;
  findInputSnapshotById(inputSnapshotId: string): Promise<TopicSelectionInputSnapshotRecord | null>;

  createArtifactRef(record: TopicSelectionArtifactRefRecord): Promise<TopicSelectionArtifactRefRecord>;
  findArtifactRefById(artifactRefId: string): Promise<TopicSelectionArtifactRefRecord | null>;
  findArtifactRefByStableKey(stableKey: string): Promise<TopicSelectionArtifactRefRecord | null>;
  listArtifactRefsByWorkflowRunId(workflowRunId: string): Promise<TopicSelectionArtifactRefRecord[]>;
  listArtifactRefsByInputSnapshotId(inputSnapshotId: string): Promise<TopicSelectionArtifactRefRecord[]>;

  createWorkflowRun(record: TopicSelectionLlmWorkflowRunRecord): Promise<TopicSelectionLlmWorkflowRunRecord>;
  createWorkflowRunWithArtifactRefs(
    workflowRun: TopicSelectionLlmWorkflowRunRecord,
    artifactRefs: TopicSelectionArtifactRefRecord[],
  ): Promise<TopicSelectionWorkflowRunWithArtifactRefsResult>;
  findWorkflowRunById(workflowRunId: string): Promise<TopicSelectionLlmWorkflowRunRecord | null>;
  updateWorkflowRun(
    workflowRunId: string,
    patch: Partial<Omit<TopicSelectionLlmWorkflowRunRecord, 'workflow_run_id' | 'started_at' | 'created_by'>>,
  ): Promise<TopicSelectionLlmWorkflowRunRecord>;

  createReadinessGateResult(
    record: TopicSelectionReadinessGateResultRecord,
  ): Promise<TopicSelectionReadinessGateResultRecord>;
  findReadinessGateResultById(
    readinessGateResultId: string,
  ): Promise<TopicSelectionReadinessGateResultRecord | null>;

  createQualitySignal(record: TopicSelectionQualitySignalRecord): Promise<TopicSelectionQualitySignalRecord>;
  findQualitySignalById(qualitySignalId: string): Promise<TopicSelectionQualitySignalRecord | null>;

  createChainTransitionAttempt(
    record: TopicSelectionChainTransitionAttemptRecord,
  ): Promise<TopicSelectionChainTransitionAttemptRecord>;
  findChainTransitionAttemptById(
    chainTransitionAttemptId: string,
  ): Promise<TopicSelectionChainTransitionAttemptRecord | null>;

  createFunctionalLineageLink(
    record: TopicSelectionFunctionalLineageLinkRecord,
  ): Promise<TopicSelectionFunctionalLineageLinkRecord>;
  findFunctionalLineageLinkById(
    functionalLineageLinkId: string,
  ): Promise<TopicSelectionFunctionalLineageLinkRecord | null>;

  createTraceSnapshot(record: TopicSelectionTraceSnapshotRecord): Promise<TopicSelectionTraceSnapshotRecord>;
  findTraceSnapshotById(traceSnapshotId: string): Promise<TopicSelectionTraceSnapshotRecord | null>;

  createHumanConfirmedDecision(
    record: TopicSelectionHumanConfirmedDecisionRecord,
  ): Promise<TopicSelectionHumanConfirmedDecisionRecord>;
  findHumanConfirmedDecisionById(
    humanConfirmedDecisionId: string,
  ): Promise<TopicSelectionHumanConfirmedDecisionRecord | null>;
  listHumanConfirmedDecisionsByTargetRef(
    targetRef: { ref_type: string; ref_id: string },
  ): Promise<TopicSelectionHumanConfirmedDecisionRecord[]>;
}
