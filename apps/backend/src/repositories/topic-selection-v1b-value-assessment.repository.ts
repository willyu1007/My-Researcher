import type {
  TopicSelectionAssessTopicValueRunRecord,
  TopicSelectionTopicValueAssessmentInputSnapshotRecord,
  TopicSelectionTopicValueAssessmentRecord,
  TopicSelectionTopicValueEvidenceRefRecord,
  TopicSelectionValueDispositionDecisionRecord,
  TopicSelectionValueReasoningMemoRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';

export type TopicSelectionTopicValueAssessmentPersistence = {
  assess_topic_value_run: TopicSelectionAssessTopicValueRunRecord;
  topic_value_input_snapshot: TopicSelectionTopicValueAssessmentInputSnapshotRecord;
  topic_value_assessment: TopicSelectionTopicValueAssessmentRecord;
  value_reasoning_memo: TopicSelectionValueReasoningMemoRecord;
  evidence_refs: TopicSelectionTopicValueEvidenceRefRecord[];
};

export type TopicSelectionValueDispositionDecisionPersistence = {
  decision: TopicSelectionValueDispositionDecisionRecord;
  topic_value_assessment_patch: {
    active_disposition_decision_id: string;
    updated_at: string;
  };
};

export interface TopicSelectionV1bValueAssessmentRepository {
  createAssessmentRun(
    record: TopicSelectionAssessTopicValueRunRecord,
  ): Promise<TopicSelectionAssessTopicValueRunRecord>;
  findAssessmentRunById(runId: string): Promise<TopicSelectionAssessTopicValueRunRecord | null>;

  createAssessmentWithMemo(
    persistence: TopicSelectionTopicValueAssessmentPersistence,
  ): Promise<{
    assess_topic_value_run: TopicSelectionAssessTopicValueRunRecord;
    topic_value_input_snapshot: TopicSelectionTopicValueAssessmentInputSnapshotRecord;
    topic_value_assessment: TopicSelectionTopicValueAssessmentRecord;
    value_reasoning_memo: TopicSelectionValueReasoningMemoRecord;
    evidence_refs: TopicSelectionTopicValueEvidenceRefRecord[];
  }>;

  findAssessmentById(
    assessmentId: string,
  ): Promise<TopicSelectionTopicValueAssessmentRecord | null>;
  /**
   * T-087 Phase 3.1 read-only projection — list TopicValueAssessments under
   * a title-card.
   */
  listAssessmentsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionTopicValueAssessmentRecord[]>;
  findInputSnapshotById(
    inputSnapshotId: string,
  ): Promise<TopicSelectionTopicValueAssessmentInputSnapshotRecord | null>;
  findReasoningMemoById(memoId: string): Promise<TopicSelectionValueReasoningMemoRecord | null>;
  listEvidenceRefsByAssessmentId(
    assessmentId: string,
  ): Promise<TopicSelectionTopicValueEvidenceRefRecord[]>;

  createDispositionDecision(
    persistence: TopicSelectionValueDispositionDecisionPersistence,
  ): Promise<TopicSelectionValueDispositionDecisionRecord>;
  findDispositionDecisionById(
    decisionId: string,
  ): Promise<TopicSelectionValueDispositionDecisionRecord | null>;
  listDispositionDecisionsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionValueDispositionDecisionRecord[]>;
  patchDispositionDecisionOutputTopicPackage(
    decisionId: string,
    outputTopicPackageId: string,
  ): Promise<TopicSelectionValueDispositionDecisionRecord>;
}
