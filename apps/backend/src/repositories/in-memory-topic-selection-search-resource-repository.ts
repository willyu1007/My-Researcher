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
import type {
  TopicSelectionSearchPlanWithCoverageIntentsResult,
  TopicSelectionSearchResourceRepository,
  TopicSelectionSearchRunCoverageRecords,
  TopicSelectionSearchRunWithCoverageRecordsResult,
} from './topic-selection-search-resource.repository.js';

export class InMemoryTopicSelectionSearchResourceRepository implements TopicSelectionSearchResourceRepository {
  private readonly topicSeeds = new Map<string, TopicSelectionTopicSeedRecord>();
  private readonly literatureSnapshots = new Map<string, TopicSelectionLiteratureResourcePoolSnapshotRecord>();
  private readonly searchPlans = new Map<string, TopicSelectionSearchPlanRecord>();
  private readonly coverageRowIntents = new Map<string, TopicSelectionCoverageRowIntentRecord>();
  private readonly coverageExecutionObservations = new Map<string, TopicSelectionCoverageExecutionObservationRecord>();
  private readonly coverageEvidenceBindings = new Map<string, TopicSelectionCoverageEvidenceBindingRecord>();
  private readonly coverageAssessments = new Map<string, TopicSelectionCoverageAssessmentRecord>();
  private readonly coverageRiskAcceptances = new Map<string, TopicSelectionCoverageRiskAcceptanceRecord>();
  private readonly searchRuns = new Map<string, TopicSelectionSearchRunRecord>();
  private readonly recheckRequests = new Map<string, TopicSelectionSearchPlanRecheckRequestRecord>();
  private readonly recheckRequestIdsByRequestKey = new Map<string, string>();

  async createTopicSeed(record: TopicSelectionTopicSeedRecord): Promise<TopicSelectionTopicSeedRecord> {
    this.topicSeeds.set(record.topic_seed_id, record);
    return record;
  }

  async findTopicSeedById(topicSeedId: string): Promise<TopicSelectionTopicSeedRecord | null> {
    return this.topicSeeds.get(topicSeedId) ?? null;
  }

  async createLiteratureResourcePoolSnapshot(
    record: TopicSelectionLiteratureResourcePoolSnapshotRecord,
  ): Promise<TopicSelectionLiteratureResourcePoolSnapshotRecord> {
    this.literatureSnapshots.set(record.literature_resource_pool_snapshot_id, record);
    return record;
  }

  async findLiteratureResourcePoolSnapshotById(
    snapshotId: string,
  ): Promise<TopicSelectionLiteratureResourcePoolSnapshotRecord | null> {
    return this.literatureSnapshots.get(snapshotId) ?? null;
  }

  async createSearchPlanWithCoverageIntents(
    searchPlan: TopicSelectionSearchPlanRecord,
    coverageRowIntents: TopicSelectionCoverageRowIntentRecord[],
  ): Promise<TopicSelectionSearchPlanWithCoverageIntentsResult> {
    this.searchPlans.set(searchPlan.search_plan_id, searchPlan);
    for (const intent of coverageRowIntents) {
      this.coverageRowIntents.set(intent.coverage_row_intent_id, intent);
    }
    return {
      search_plan: searchPlan,
      coverage_row_intents: coverageRowIntents,
    };
  }

  async findSearchPlanById(searchPlanId: string): Promise<TopicSelectionSearchPlanRecord | null> {
    return this.searchPlans.get(searchPlanId) ?? null;
  }

  async listSearchPlansByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionSearchPlanRecord[]> {
    return [...this.searchPlans.values()]
      .filter((record) => record.title_card_id === titleCardId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async createCoverageExecutionObservation(
    record: TopicSelectionCoverageExecutionObservationRecord,
  ): Promise<TopicSelectionCoverageExecutionObservationRecord> {
    this.coverageExecutionObservations.set(record.coverage_execution_observation_id, record);
    return record;
  }

  async createCoverageEvidenceBinding(
    record: TopicSelectionCoverageEvidenceBindingRecord,
  ): Promise<TopicSelectionCoverageEvidenceBindingRecord> {
    this.coverageEvidenceBindings.set(record.coverage_evidence_binding_id, record);
    return record;
  }

  async createCoverageAssessment(
    record: TopicSelectionCoverageAssessmentRecord,
  ): Promise<TopicSelectionCoverageAssessmentRecord> {
    this.coverageAssessments.set(record.coverage_assessment_id, record);
    return record;
  }

  async createCoverageRiskAcceptance(
    record: TopicSelectionCoverageRiskAcceptanceRecord,
  ): Promise<TopicSelectionCoverageRiskAcceptanceRecord> {
    this.coverageRiskAcceptances.set(record.coverage_risk_acceptance_id, record);
    return record;
  }

  async listCoverageRowIntentsBySearchPlanId(searchPlanId: string): Promise<TopicSelectionCoverageRowIntentRecord[]> {
    return this.bySearchPlan(this.coverageRowIntents, searchPlanId)
      .sort((left, right) => left.priority - right.priority || left.coverage_key.localeCompare(right.coverage_key));
  }

  async listCoverageExecutionObservationsBySearchPlanId(
    searchPlanId: string,
  ): Promise<TopicSelectionCoverageExecutionObservationRecord[]> {
    return this.bySearchPlan(this.coverageExecutionObservations, searchPlanId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async listCoverageEvidenceBindingsBySearchPlanId(
    searchPlanId: string,
  ): Promise<TopicSelectionCoverageEvidenceBindingRecord[]> {
    return this.bySearchPlan(this.coverageEvidenceBindings, searchPlanId)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
  }

  async listCoverageAssessmentsBySearchPlanId(searchPlanId: string): Promise<TopicSelectionCoverageAssessmentRecord[]> {
    return this.bySearchPlan(this.coverageAssessments, searchPlanId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async listCoverageRiskAcceptancesBySearchPlanId(
    searchPlanId: string,
  ): Promise<TopicSelectionCoverageRiskAcceptanceRecord[]> {
    return this.bySearchPlan(this.coverageRiskAcceptances, searchPlanId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async createSearchRunWithCoverageRecords(
    searchRun: TopicSelectionSearchRunRecord,
    coverageRecords: TopicSelectionSearchRunCoverageRecords,
  ): Promise<TopicSelectionSearchRunWithCoverageRecordsResult> {
    this.searchRuns.set(searchRun.search_run_id, searchRun);
    for (const observation of coverageRecords.observations) {
      this.coverageExecutionObservations.set(observation.coverage_execution_observation_id, observation);
    }
    for (const binding of coverageRecords.evidence_bindings) {
      this.coverageEvidenceBindings.set(binding.coverage_evidence_binding_id, binding);
    }
    for (const assessment of coverageRecords.assessments) {
      this.coverageAssessments.set(assessment.coverage_assessment_id, assessment);
    }
    for (const riskAcceptance of coverageRecords.risk_acceptances) {
      this.coverageRiskAcceptances.set(riskAcceptance.coverage_risk_acceptance_id, riskAcceptance);
    }
    return {
      search_run: searchRun,
      ...coverageRecords,
    };
  }

  async findSearchRunById(searchRunId: string): Promise<TopicSelectionSearchRunRecord | null> {
    return this.searchRuns.get(searchRunId) ?? null;
  }

  async createSearchPlanRecheckRequest(
    record: TopicSelectionSearchPlanRecheckRequestRecord,
  ): Promise<TopicSelectionSearchPlanRecheckRequestRecord> {
    if (record.request_key) {
      const replayId = this.recheckRequestIdsByRequestKey.get(record.request_key);
      const replay = replayId ? this.recheckRequests.get(replayId) : undefined;
      if (replay) return replay;
      this.recheckRequestIdsByRequestKey.set(record.request_key, record.search_plan_recheck_request_id);
    }
    this.recheckRequests.set(record.search_plan_recheck_request_id, record);
    return record;
  }

  async findSearchPlanRecheckRequestById(
    requestId: string,
  ): Promise<TopicSelectionSearchPlanRecheckRequestRecord | null> {
    return this.recheckRequests.get(requestId) ?? null;
  }

  async findSearchPlanRecheckRequestByRequestKey(
    requestKey: string,
  ): Promise<TopicSelectionSearchPlanRecheckRequestRecord | null> {
    const requestId = this.recheckRequestIdsByRequestKey.get(requestKey);
    return requestId ? this.recheckRequests.get(requestId) ?? null : null;
  }

  async listSearchPlanRecheckRequestsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionSearchPlanRecheckRequestRecord[]> {
    return [...this.recheckRequests.values()]
      .filter((record) => record.title_card_id === titleCardId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async updateSearchPlanRecheckRequest(
    requestId: string,
    patch: Partial<Omit<
      TopicSelectionSearchPlanRecheckRequestRecord,
      'search_plan_recheck_request_id' | 'workspace_id' | 'title_card_id' | 'source_ref' | 'target_search_plan_ref' | 'created_at'
    >>,
  ): Promise<TopicSelectionSearchPlanRecheckRequestRecord> {
    const current = this.recheckRequests.get(requestId);
    if (!current) {
      throw new Error(`SearchPlanRecheckRequest ${requestId} not found.`);
    }
    const next: TopicSelectionSearchPlanRecheckRequestRecord = {
      ...current,
      ...patch,
    };
    this.recheckRequests.set(requestId, next);
    return next;
  }

  private bySearchPlan<T extends { search_plan_id: string }>(records: Map<string, T>, searchPlanId: string): T[] {
    return [...records.values()].filter((record) => record.search_plan_id === searchPlanId);
  }
}
