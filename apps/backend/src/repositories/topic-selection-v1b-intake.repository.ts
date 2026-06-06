import type {
  TopicSelectionResearchConstraintProfileRecord,
  TopicSelectionV1bIntakeReadinessAssessmentRecord,
  TopicSelectionV1bIntakeSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-intake-contracts';

export interface TopicSelectionV1bIntakeRepository {
  createIntakeSnapshot(
    record: TopicSelectionV1bIntakeSnapshotRecord,
  ): Promise<TopicSelectionV1bIntakeSnapshotRecord>;
  findIntakeSnapshotById(
    intakeSnapshotId: string,
  ): Promise<TopicSelectionV1bIntakeSnapshotRecord | null>;
  listIntakeSnapshotsByBundleId(
    v1bInputBundleId: string,
  ): Promise<TopicSelectionV1bIntakeSnapshotRecord[]>;
  listIntakeSnapshotsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionV1bIntakeSnapshotRecord[]>;

  createResearchConstraintProfile(
    record: TopicSelectionResearchConstraintProfileRecord,
  ): Promise<TopicSelectionResearchConstraintProfileRecord>;
  findResearchConstraintProfileById(
    profileId: string,
  ): Promise<TopicSelectionResearchConstraintProfileRecord | null>;
  listResearchConstraintProfilesByBundleId(
    v1bInputBundleId: string,
  ): Promise<TopicSelectionResearchConstraintProfileRecord[]>;

  createReadinessAssessment(
    record: TopicSelectionV1bIntakeReadinessAssessmentRecord,
  ): Promise<TopicSelectionV1bIntakeReadinessAssessmentRecord>;
  findReadinessAssessmentById(
    readinessAssessmentId: string,
  ): Promise<TopicSelectionV1bIntakeReadinessAssessmentRecord | null>;
  findReadinessAssessmentBySnapshotAndProfile(
    intakeSnapshotId: string,
    profileId: string,
    profileVersion: string,
  ): Promise<TopicSelectionV1bIntakeReadinessAssessmentRecord | null>;
}
