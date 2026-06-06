import type {
  TopicSelectionResearchConstraintProfileRecord,
  TopicSelectionV1bIntakeReadinessAssessmentRecord,
  TopicSelectionV1bIntakeSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-intake-contracts';
import type { TopicSelectionV1bIntakeRepository } from './topic-selection-v1b-intake.repository.js';

export class InMemoryTopicSelectionV1bIntakeRepository implements TopicSelectionV1bIntakeRepository {
  private readonly snapshots = new Map<string, TopicSelectionV1bIntakeSnapshotRecord>();
  private readonly profiles = new Map<string, TopicSelectionResearchConstraintProfileRecord>();
  private readonly readinessAssessments = new Map<string, TopicSelectionV1bIntakeReadinessAssessmentRecord>();

  async createIntakeSnapshot(
    record: TopicSelectionV1bIntakeSnapshotRecord,
  ): Promise<TopicSelectionV1bIntakeSnapshotRecord> {
    this.snapshots.set(record.v1b_intake_snapshot_id, record);
    return record;
  }

  async findIntakeSnapshotById(
    intakeSnapshotId: string,
  ): Promise<TopicSelectionV1bIntakeSnapshotRecord | null> {
    return this.snapshots.get(intakeSnapshotId) ?? null;
  }

  async listIntakeSnapshotsByBundleId(
    v1bInputBundleId: string,
  ): Promise<TopicSelectionV1bIntakeSnapshotRecord[]> {
    return [...this.snapshots.values()]
      .filter((record) => record.v1b_input_bundle_id === v1bInputBundleId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async listIntakeSnapshotsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionV1bIntakeSnapshotRecord[]> {
    return [...this.snapshots.values()]
      .filter((record) => record.title_card_id === titleCardId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async createResearchConstraintProfile(
    record: TopicSelectionResearchConstraintProfileRecord,
  ): Promise<TopicSelectionResearchConstraintProfileRecord> {
    this.profiles.set(record.research_constraint_profile_id, record);
    return record;
  }

  async findResearchConstraintProfileById(
    profileId: string,
  ): Promise<TopicSelectionResearchConstraintProfileRecord | null> {
    return this.profiles.get(profileId) ?? null;
  }

  async listResearchConstraintProfilesByBundleId(
    v1bInputBundleId: string,
  ): Promise<TopicSelectionResearchConstraintProfileRecord[]> {
    return [...this.profiles.values()]
      .filter((record) => record.v1b_input_bundle_id === v1bInputBundleId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async createReadinessAssessment(
    record: TopicSelectionV1bIntakeReadinessAssessmentRecord,
  ): Promise<TopicSelectionV1bIntakeReadinessAssessmentRecord> {
    this.readinessAssessments.set(record.v1b_intake_readiness_assessment_id, record);
    return record;
  }

  async findReadinessAssessmentById(
    readinessAssessmentId: string,
  ): Promise<TopicSelectionV1bIntakeReadinessAssessmentRecord | null> {
    return this.readinessAssessments.get(readinessAssessmentId) ?? null;
  }

  async findReadinessAssessmentBySnapshotAndProfile(
    intakeSnapshotId: string,
    profileId: string,
    profileVersion: string,
  ): Promise<TopicSelectionV1bIntakeReadinessAssessmentRecord | null> {
    return [...this.readinessAssessments.values()].find((record) =>
      record.v1b_intake_snapshot_id === intakeSnapshotId
      && record.research_constraint_profile_id === profileId
      && record.profile_version === profileVersion
    ) ?? null;
  }
}
