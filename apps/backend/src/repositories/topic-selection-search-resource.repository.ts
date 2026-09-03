import type {
  TopicSelectionCoverageAssessmentRecord,
  TopicSelectionCoverageEvidenceBindingRecord,
  TopicSelectionCoverageExecutionObservationRecord,
  TopicSelectionCoverageRiskAcceptanceRecord,
  TopicSelectionCoverageRowIntentRecord,
  TopicSelectionLiteratureResourcePoolSnapshotRecord,
  TopicSelectionSearchPlanRecord,
  TopicSelectionSearchPlanRecheckRequestRecord,
  TopicSelectionSearchRunRecord,
  TopicSelectionTopicSeedRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';

export type TopicSelectionSearchPlanWithCoverageIntentsResult = {
  search_plan: TopicSelectionSearchPlanRecord;
  coverage_row_intents: TopicSelectionCoverageRowIntentRecord[];
};

export type TopicSelectionSearchRunCoverageRecords = {
  observations: TopicSelectionCoverageExecutionObservationRecord[];
  evidence_bindings: TopicSelectionCoverageEvidenceBindingRecord[];
  assessments: TopicSelectionCoverageAssessmentRecord[];
  risk_acceptances: TopicSelectionCoverageRiskAcceptanceRecord[];
};

export type TopicSelectionSearchRunWithCoverageRecordsResult = {
  search_run: TopicSelectionSearchRunRecord;
} & TopicSelectionSearchRunCoverageRecords;

export interface TopicSelectionSearchResourceRepository {
  createTopicSeed(record: TopicSelectionTopicSeedRecord): Promise<TopicSelectionTopicSeedRecord>;
  findTopicSeedById(topicSeedId: string): Promise<TopicSelectionTopicSeedRecord | null>;

  createLiteratureResourcePoolSnapshot(
    record: TopicSelectionLiteratureResourcePoolSnapshotRecord,
  ): Promise<TopicSelectionLiteratureResourcePoolSnapshotRecord>;
  findLiteratureResourcePoolSnapshotById(
    snapshotId: string,
  ): Promise<TopicSelectionLiteratureResourcePoolSnapshotRecord | null>;

  createSearchPlanWithCoverageIntents(
    searchPlan: TopicSelectionSearchPlanRecord,
    coverageRowIntents: TopicSelectionCoverageRowIntentRecord[],
  ): Promise<TopicSelectionSearchPlanWithCoverageIntentsResult>;
  findSearchPlanById(searchPlanId: string): Promise<TopicSelectionSearchPlanRecord | null>;
  /**
   * T-087 D1 read-only projection — list SearchPlans under a title-card.
   * Reverse-chronological order; powers the reviewer workbench v1a
   * SearchPlan surface.
   */
  listSearchPlansByTitleCardId(titleCardId: string): Promise<TopicSelectionSearchPlanRecord[]>;

  createCoverageExecutionObservation(
    record: TopicSelectionCoverageExecutionObservationRecord,
  ): Promise<TopicSelectionCoverageExecutionObservationRecord>;
  createCoverageEvidenceBinding(
    record: TopicSelectionCoverageEvidenceBindingRecord,
  ): Promise<TopicSelectionCoverageEvidenceBindingRecord>;
  createCoverageAssessment(
    record: TopicSelectionCoverageAssessmentRecord,
  ): Promise<TopicSelectionCoverageAssessmentRecord>;
  createCoverageRiskAcceptance(
    record: TopicSelectionCoverageRiskAcceptanceRecord,
  ): Promise<TopicSelectionCoverageRiskAcceptanceRecord>;

  listCoverageRowIntentsBySearchPlanId(searchPlanId: string): Promise<TopicSelectionCoverageRowIntentRecord[]>;
  listCoverageExecutionObservationsBySearchPlanId(
    searchPlanId: string,
  ): Promise<TopicSelectionCoverageExecutionObservationRecord[]>;
  listCoverageEvidenceBindingsBySearchPlanId(searchPlanId: string): Promise<TopicSelectionCoverageEvidenceBindingRecord[]>;
  listCoverageAssessmentsBySearchPlanId(searchPlanId: string): Promise<TopicSelectionCoverageAssessmentRecord[]>;
  listCoverageRiskAcceptancesBySearchPlanId(searchPlanId: string): Promise<TopicSelectionCoverageRiskAcceptanceRecord[]>;

  createSearchRunWithCoverageRecords(
    searchRun: TopicSelectionSearchRunRecord,
    coverageRecords: TopicSelectionSearchRunCoverageRecords,
  ): Promise<TopicSelectionSearchRunWithCoverageRecordsResult>;
  findSearchRunById(searchRunId: string): Promise<TopicSelectionSearchRunRecord | null>;

  createSearchPlanRecheckRequest(
    record: TopicSelectionSearchPlanRecheckRequestRecord,
  ): Promise<TopicSelectionSearchPlanRecheckRequestRecord>;
  findSearchPlanRecheckRequestById(
    requestId: string,
  ): Promise<TopicSelectionSearchPlanRecheckRequestRecord | null>;
  findSearchPlanRecheckRequestByRequestKey(
    requestKey: string,
  ): Promise<TopicSelectionSearchPlanRecheckRequestRecord | null>;
  /**
   * T-087 Phase 2.2 read-only projection — list SearchPlanRecheckRequests
   * under a title-card so the reviewer workbench v1a SearchPlan surface can
   * show open/closed revision requests inline.
   */
  listSearchPlanRecheckRequestsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionSearchPlanRecheckRequestRecord[]>;
  updateSearchPlanRecheckRequest(
    requestId: string,
    patch: Partial<Omit<
      TopicSelectionSearchPlanRecheckRequestRecord,
      'search_plan_recheck_request_id' | 'workspace_id' | 'title_card_id' | 'source_ref' | 'target_search_plan_ref' | 'created_at'
    >>,
  ): Promise<TopicSelectionSearchPlanRecheckRequestRecord>;
}
