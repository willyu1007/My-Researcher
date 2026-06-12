import type {
  TopicSelectionAssessTopicValueRunRecord,
  TopicSelectionTopicValueAssessmentInputSnapshotRecord,
  TopicSelectionTopicValueAssessmentRecord,
  TopicSelectionTopicValueEvidenceRefRecord,
  TopicSelectionValueDispositionDecisionRecord,
  TopicSelectionValueReasoningMemoRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';
import type {
  TopicSelectionTopicValueAssessmentPersistence,
  TopicSelectionValueDispositionDecisionPersistence,
  TopicSelectionV1bValueAssessmentRepository,
} from './topic-selection-v1b-value-assessment.repository.js';

export class InMemoryTopicSelectionV1bValueAssessmentRepository
implements TopicSelectionV1bValueAssessmentRepository {
  private readonly runs = new Map<string, TopicSelectionAssessTopicValueRunRecord>();
  private readonly snapshots = new Map<string, TopicSelectionTopicValueAssessmentInputSnapshotRecord>();
  private readonly assessments = new Map<string, TopicSelectionTopicValueAssessmentRecord>();
  private readonly memos = new Map<string, TopicSelectionValueReasoningMemoRecord>();
  private readonly evidenceRefs = new Map<string, TopicSelectionTopicValueEvidenceRefRecord>();
  private readonly decisions = new Map<string, TopicSelectionValueDispositionDecisionRecord>();

  async createAssessmentRun(
    record: TopicSelectionAssessTopicValueRunRecord,
  ): Promise<TopicSelectionAssessTopicValueRunRecord> {
    this.runs.set(record.assess_topic_value_run_id, record);
    return record;
  }

  async findAssessmentRunById(runId: string): Promise<TopicSelectionAssessTopicValueRunRecord | null> {
    return this.runs.get(runId) ?? null;
  }

  async createAssessmentWithMemo(
    persistence: TopicSelectionTopicValueAssessmentPersistence,
  ): Promise<{
    assess_topic_value_run: TopicSelectionAssessTopicValueRunRecord;
    topic_value_input_snapshot: TopicSelectionTopicValueAssessmentInputSnapshotRecord;
    topic_value_assessment: TopicSelectionTopicValueAssessmentRecord;
    value_reasoning_memo: TopicSelectionValueReasoningMemoRecord;
    evidence_refs: TopicSelectionTopicValueEvidenceRefRecord[];
  }> {
    const snapshot = this.snapshot();
    try {
      this.runs.set(
        persistence.assess_topic_value_run.assess_topic_value_run_id,
        persistence.assess_topic_value_run,
      );
      this.snapshots.set(
        persistence.topic_value_input_snapshot.topic_value_input_snapshot_id,
        persistence.topic_value_input_snapshot,
      );
      this.assessments.set(
        persistence.topic_value_assessment.topic_value_assessment_id,
        persistence.topic_value_assessment,
      );
      this.memos.set(
        persistence.value_reasoning_memo.value_reasoning_memo_id,
        persistence.value_reasoning_memo,
      );
      for (const evidenceRef of persistence.evidence_refs) {
        this.evidenceRefs.set(evidenceRef.topic_value_evidence_ref_id, evidenceRef);
      }
    } catch (error) {
      this.restore(snapshot);
      throw error;
    }
    return persistence;
  }

  async findAssessmentById(
    assessmentId: string,
  ): Promise<TopicSelectionTopicValueAssessmentRecord | null> {
    return this.assessments.get(assessmentId) ?? null;
  }

  async listAssessmentsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionTopicValueAssessmentRecord[]> {
    return [...this.assessments.values()]
      .filter((record) => record.title_card_id === titleCardId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async findInputSnapshotById(
    inputSnapshotId: string,
  ): Promise<TopicSelectionTopicValueAssessmentInputSnapshotRecord | null> {
    return this.snapshots.get(inputSnapshotId) ?? null;
  }

  async findReasoningMemoById(memoId: string): Promise<TopicSelectionValueReasoningMemoRecord | null> {
    return this.memos.get(memoId) ?? null;
  }

  async listEvidenceRefsByAssessmentId(
    assessmentId: string,
  ): Promise<TopicSelectionTopicValueEvidenceRefRecord[]> {
    return [...this.evidenceRefs.values()]
      .filter((record) => record.topic_value_assessment_id === assessmentId)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
  }

  async createDispositionDecision(
    persistence: TopicSelectionValueDispositionDecisionPersistence,
  ): Promise<TopicSelectionValueDispositionDecisionRecord> {
    const snapshot = this.snapshot();
    try {
      for (const decision of this.decisions.values()) {
        if (
          decision.topic_value_assessment_id === persistence.decision.topic_value_assessment_id
          && decision.is_current
        ) {
          this.decisions.set(decision.value_disposition_decision_id, {
            ...decision,
            status: 'superseded',
            is_current: false,
          });
        }
      }
      this.decisions.set(
        persistence.decision.value_disposition_decision_id,
        persistence.decision,
      );
      const assessment = this.require(
        this.assessments,
        persistence.decision.topic_value_assessment_id,
        'TopicValueAssessment',
      );
      this.assessments.set(assessment.topic_value_assessment_id, {
        ...assessment,
        active_disposition_decision_id:
          persistence.topic_value_assessment_patch.active_disposition_decision_id,
        updated_at: persistence.topic_value_assessment_patch.updated_at,
      });
    } catch (error) {
      this.restore(snapshot);
      throw error;
    }
    return persistence.decision;
  }

  async findDispositionDecisionById(
    decisionId: string,
  ): Promise<TopicSelectionValueDispositionDecisionRecord | null> {
    return this.decisions.get(decisionId) ?? null;
  }

  async listDispositionDecisionsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionValueDispositionDecisionRecord[]> {
    return [...this.decisions.values()]
      .filter((record) => record.title_card_id === titleCardId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async patchDispositionDecisionOutputTopicPackage(
    decisionId: string,
    outputTopicPackageId: string,
  ): Promise<TopicSelectionValueDispositionDecisionRecord> {
    const decision = this.require(
      this.decisions,
      decisionId,
      'ValueDispositionDecision',
    );
    const next = {
      ...decision,
      output_topic_package_id: outputTopicPackageId,
    };
    this.decisions.set(decisionId, next);
    return next;
  }

  private require<T>(records: Map<string, T>, id: string, label: string): T {
    const record = records.get(id);
    if (!record) {
      throw new Error(`${label} ${id} not found.`);
    }
    return record;
  }

  private snapshot() {
    return {
      runs: new Map(this.runs),
      snapshots: new Map(this.snapshots),
      assessments: new Map(this.assessments),
      memos: new Map(this.memos),
      evidenceRefs: new Map(this.evidenceRefs),
      decisions: new Map(this.decisions),
    };
  }

  private restore(snapshot: ReturnType<InMemoryTopicSelectionV1bValueAssessmentRepository['snapshot']>): void {
    this.runs.clear();
    this.snapshots.clear();
    this.assessments.clear();
    this.memos.clear();
    this.evidenceRefs.clear();
    this.decisions.clear();
    for (const [id, record] of snapshot.runs) this.runs.set(id, record);
    for (const [id, record] of snapshot.snapshots) this.snapshots.set(id, record);
    for (const [id, record] of snapshot.assessments) this.assessments.set(id, record);
    for (const [id, record] of snapshot.memos) this.memos.set(id, record);
    for (const [id, record] of snapshot.evidenceRefs) this.evidenceRefs.set(id, record);
    for (const [id, record] of snapshot.decisions) this.decisions.set(id, record);
  }
}
