import type {
  TopicSelectionPlanResearchSliceRunRecord,
  TopicSelectionResearchSliceAssumptionRecord,
  TopicSelectionResearchSliceBoundaryRecord,
  TopicSelectionResearchSliceEvidenceRefRecord,
  TopicSelectionResearchSliceOptionRecord,
  TopicSelectionResearchSliceOptionSetRecord,
  TopicSelectionResearchSliceRecord,
  TopicSelectionSliceSelectionDecisionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';

export type TopicSelectionResearchSliceCreation = {
  decision: TopicSelectionSliceSelectionDecisionRecord;
  research_slice: TopicSelectionResearchSliceRecord;
  evidence_refs: TopicSelectionResearchSliceEvidenceRefRecord[];
  boundaries: TopicSelectionResearchSliceBoundaryRecord[];
  assumptions: TopicSelectionResearchSliceAssumptionRecord[];
  option_set_patch: {
    status: TopicSelectionResearchSliceOptionSetRecord['status'];
    selected_option_id?: string | null;
    updated_at: string;
  };
};

export type TopicSelectionResearchSlicePlanningPersistence = {
  plan_run: TopicSelectionPlanResearchSliceRunRecord;
  option_set: TopicSelectionResearchSliceOptionSetRecord;
  options: TopicSelectionResearchSliceOptionRecord[];
};

export interface TopicSelectionV1bResearchSliceRepository {
  createPlanRun(
    record: TopicSelectionPlanResearchSliceRunRecord,
  ): Promise<TopicSelectionPlanResearchSliceRunRecord>;
  updatePlanRun(
    planRunId: string,
    patch: Partial<Pick<
      TopicSelectionPlanResearchSliceRunRecord,
      'status' | 'workflow_run_id' | 'option_set_id' | 'artifact_refs' | 'quality_flags' | 'failure_reason' | 'updated_at'
    >>,
  ): Promise<TopicSelectionPlanResearchSliceRunRecord>;
  findPlanRunById(planRunId: string): Promise<TopicSelectionPlanResearchSliceRunRecord | null>;

  createPlanRunWithOptionSet(
    persistence: TopicSelectionResearchSlicePlanningPersistence,
  ): Promise<{
    plan_run: TopicSelectionPlanResearchSliceRunRecord;
    option_set: TopicSelectionResearchSliceOptionSetRecord;
    options: TopicSelectionResearchSliceOptionRecord[];
  }>;
  findOptionSetById(optionSetId: string): Promise<TopicSelectionResearchSliceOptionSetRecord | null>;
  /**
   * T-087 Phase 3.1 read-only projection — list ResearchSliceOptionSets under
   * a title-card so the reviewer workbench v1b Slice surface can list them
   * without changing decision-chain semantics.
   */
  listOptionSetsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionResearchSliceOptionSetRecord[]>;
  updateOptionSet(
    optionSetId: string,
    patch: Partial<Pick<
      TopicSelectionResearchSliceOptionSetRecord,
      'status' | 'selected_option_id' | 'updated_at'
    >>,
  ): Promise<TopicSelectionResearchSliceOptionSetRecord>;
  /**
   * T-127 W-11: persist a fully-merged comparison_payload back onto an option-set. The standard
   * updateOptionSet patch is locked to status/selected_option_id/updated_at and cannot touch
   * comparison_payload; the n4_handoff_hash backfill needs this narrow write. The CALLER owns the merge
   * (passes the full payload), so the repo just writes it — no repo-side read-merge race.
   */
  updateOptionSetComparisonPayload(
    optionSetId: string,
    comparisonPayload: Record<string, unknown>,
    updatedAt: string,
  ): Promise<TopicSelectionResearchSliceOptionSetRecord>;
  /**
   * T-127 W-11: option-sets whose comparison_payload lacks a non-empty n4_handoff_hash (the backfill
   * candidates — old records created before T-115 Phase 2 began persisting it). Coarse enumerator; the
   * backfill service re-applies the authoritative skip rule per record.
   */
  listOptionSetsMissingN4HandoffHash(): Promise<TopicSelectionResearchSliceOptionSetRecord[]>;
  listOptionsByOptionSetId(optionSetId: string): Promise<TopicSelectionResearchSliceOptionRecord[]>;
  findOptionById(optionId: string): Promise<TopicSelectionResearchSliceOptionRecord | null>;

  createSelectionDecision(
    record: TopicSelectionSliceSelectionDecisionRecord,
  ): Promise<TopicSelectionSliceSelectionDecisionRecord>;
  createSelectionDecisionWithSlice(
    creation: TopicSelectionResearchSliceCreation,
  ): Promise<{
    decision: TopicSelectionSliceSelectionDecisionRecord;
    research_slice: TopicSelectionResearchSliceRecord;
    evidence_refs: TopicSelectionResearchSliceEvidenceRefRecord[];
    boundaries: TopicSelectionResearchSliceBoundaryRecord[];
    assumptions: TopicSelectionResearchSliceAssumptionRecord[];
  }>;
  findSelectionDecisionById(
    decisionId: string,
  ): Promise<TopicSelectionSliceSelectionDecisionRecord | null>;

  findResearchSliceById(researchSliceId: string): Promise<TopicSelectionResearchSliceRecord | null>;
  listEvidenceRefsByResearchSliceId(
    researchSliceId: string,
  ): Promise<TopicSelectionResearchSliceEvidenceRefRecord[]>;
  listBoundariesByResearchSliceId(
    researchSliceId: string,
  ): Promise<TopicSelectionResearchSliceBoundaryRecord[]>;
  listAssumptionsByResearchSliceId(
    researchSliceId: string,
  ): Promise<TopicSelectionResearchSliceAssumptionRecord[]>;
}

/**
 * T-127 W-11: single-source predicate — true when an option-set's comparison_payload carries no usable
 * n4_handoff_hash (absent / null / empty string). Used by both repo enumerators and the backfill service's
 * skip rule so they agree on what "needs backfill" means.
 */
export function optionSetLacksN4HandoffHash(
  record: TopicSelectionResearchSliceOptionSetRecord,
): boolean {
  const hash = record.comparison_payload.n4_handoff_hash;
  return typeof hash !== 'string' || hash.length === 0;
}
