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
import type {
  TopicSelectionResearchSlicePlanningPersistence,
  TopicSelectionResearchSliceCreation,
  TopicSelectionV1bResearchSliceRepository,
} from './topic-selection-v1b-research-slice.repository.js';
import { optionSetLacksN4HandoffHash } from './topic-selection-v1b-research-slice.repository.js';

export class InMemoryTopicSelectionV1bResearchSliceRepository
implements TopicSelectionV1bResearchSliceRepository {
  private readonly planRuns = new Map<string, TopicSelectionPlanResearchSliceRunRecord>();
  private readonly optionSets = new Map<string, TopicSelectionResearchSliceOptionSetRecord>();
  private readonly options = new Map<string, TopicSelectionResearchSliceOptionRecord>();
  private readonly decisions = new Map<string, TopicSelectionSliceSelectionDecisionRecord>();
  private readonly researchSlices = new Map<string, TopicSelectionResearchSliceRecord>();
  private readonly evidenceRefs = new Map<string, TopicSelectionResearchSliceEvidenceRefRecord>();
  private readonly boundaries = new Map<string, TopicSelectionResearchSliceBoundaryRecord>();
  private readonly assumptions = new Map<string, TopicSelectionResearchSliceAssumptionRecord>();

  async createPlanRun(
    record: TopicSelectionPlanResearchSliceRunRecord,
  ): Promise<TopicSelectionPlanResearchSliceRunRecord> {
    this.planRuns.set(record.plan_research_slice_run_id, record);
    return record;
  }

  async updatePlanRun(
    planRunId: string,
    patch: Partial<Pick<
      TopicSelectionPlanResearchSliceRunRecord,
      'status' | 'workflow_run_id' | 'option_set_id' | 'artifact_refs' | 'quality_flags' | 'failure_reason' | 'updated_at'
    >>,
  ): Promise<TopicSelectionPlanResearchSliceRunRecord> {
    const current = this.require(this.planRuns, planRunId, 'PlanResearchSliceRun');
    const next = { ...current, ...patch };
    this.planRuns.set(planRunId, next);
    return next;
  }

  async findPlanRunById(planRunId: string): Promise<TopicSelectionPlanResearchSliceRunRecord | null> {
    return this.planRuns.get(planRunId) ?? null;
  }

  async createPlanRunWithOptionSet(
    persistence: TopicSelectionResearchSlicePlanningPersistence,
  ): Promise<{
    plan_run: TopicSelectionPlanResearchSliceRunRecord;
    option_set: TopicSelectionResearchSliceOptionSetRecord;
    options: TopicSelectionResearchSliceOptionRecord[];
  }> {
    this.planRuns.set(persistence.plan_run.plan_research_slice_run_id, persistence.plan_run);
    this.optionSets.set(persistence.option_set.research_slice_option_set_id, persistence.option_set);
    for (const option of persistence.options) {
      this.options.set(option.research_slice_option_id, option);
    }
    return persistence;
  }

  async findOptionSetById(optionSetId: string): Promise<TopicSelectionResearchSliceOptionSetRecord | null> {
    return this.optionSets.get(optionSetId) ?? null;
  }

  async listOptionSetsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionResearchSliceOptionSetRecord[]> {
    return [...this.optionSets.values()]
      .filter((record) => record.title_card_id === titleCardId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async updateOptionSet(
    optionSetId: string,
    patch: Partial<Pick<
      TopicSelectionResearchSliceOptionSetRecord,
      'status' | 'selected_option_id' | 'updated_at'
    >>,
  ): Promise<TopicSelectionResearchSliceOptionSetRecord> {
    const current = this.require(this.optionSets, optionSetId, 'ResearchSliceOptionSet');
    const next = { ...current, ...patch };
    this.optionSets.set(optionSetId, next);
    return next;
  }

  async updateOptionSetComparisonPayload(
    optionSetId: string,
    comparisonPayload: Record<string, unknown>,
    updatedAt: string,
  ): Promise<TopicSelectionResearchSliceOptionSetRecord> {
    const current = this.require(this.optionSets, optionSetId, 'ResearchSliceOptionSet');
    const next = { ...current, comparison_payload: comparisonPayload, updated_at: updatedAt };
    this.optionSets.set(optionSetId, next);
    return next;
  }

  async listOptionSetsMissingN4HandoffHash(): Promise<TopicSelectionResearchSliceOptionSetRecord[]> {
    return [...this.optionSets.values()].filter(optionSetLacksN4HandoffHash);
  }

  async listOptionsByOptionSetId(optionSetId: string): Promise<TopicSelectionResearchSliceOptionRecord[]> {
    return [...this.options.values()]
      .filter((record) => record.research_slice_option_set_id === optionSetId)
      .sort((left, right) => left.option_ordinal - right.option_ordinal);
  }

  async findOptionById(optionId: string): Promise<TopicSelectionResearchSliceOptionRecord | null> {
    return this.options.get(optionId) ?? null;
  }

  async createSelectionDecision(
    record: TopicSelectionSliceSelectionDecisionRecord,
  ): Promise<TopicSelectionSliceSelectionDecisionRecord> {
    this.decisions.set(record.slice_selection_decision_id, record);
    return record;
  }

  async createSelectionDecisionWithSlice(
    creation: TopicSelectionResearchSliceCreation,
  ): Promise<{
    decision: TopicSelectionSliceSelectionDecisionRecord;
    research_slice: TopicSelectionResearchSliceRecord;
    evidence_refs: TopicSelectionResearchSliceEvidenceRefRecord[];
    boundaries: TopicSelectionResearchSliceBoundaryRecord[];
    assumptions: TopicSelectionResearchSliceAssumptionRecord[];
  }> {
    this.decisions.set(creation.decision.slice_selection_decision_id, creation.decision);
    this.researchSlices.set(creation.research_slice.research_slice_id, creation.research_slice);
    for (const evidenceRef of creation.evidence_refs) {
      this.evidenceRefs.set(evidenceRef.research_slice_evidence_ref_id, evidenceRef);
    }
    for (const boundary of creation.boundaries) {
      this.boundaries.set(boundary.research_slice_boundary_id, boundary);
    }
    for (const assumption of creation.assumptions) {
      this.assumptions.set(assumption.research_slice_assumption_id, assumption);
    }
    const selectedOption = this.options.get(creation.research_slice.source_option_ref.ref_id);
    if (selectedOption) {
      this.options.set(selectedOption.research_slice_option_id, {
        ...selectedOption,
        status: 'selected',
      });
    }
    await this.updateOptionSet(creation.research_slice.source_option_set_ref.ref_id, creation.option_set_patch);
    return {
      decision: creation.decision,
      research_slice: creation.research_slice,
      evidence_refs: creation.evidence_refs,
      boundaries: creation.boundaries,
      assumptions: creation.assumptions,
    };
  }

  async findSelectionDecisionById(
    decisionId: string,
  ): Promise<TopicSelectionSliceSelectionDecisionRecord | null> {
    return this.decisions.get(decisionId) ?? null;
  }

  async findResearchSliceById(researchSliceId: string): Promise<TopicSelectionResearchSliceRecord | null> {
    return this.researchSlices.get(researchSliceId) ?? null;
  }

  async listEvidenceRefsByResearchSliceId(
    researchSliceId: string,
  ): Promise<TopicSelectionResearchSliceEvidenceRefRecord[]> {
    return [...this.evidenceRefs.values()]
      .filter((record) => record.research_slice_id === researchSliceId)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
  }

  async listBoundariesByResearchSliceId(
    researchSliceId: string,
  ): Promise<TopicSelectionResearchSliceBoundaryRecord[]> {
    return [...this.boundaries.values()]
      .filter((record) => record.research_slice_id === researchSliceId)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
  }

  async listAssumptionsByResearchSliceId(
    researchSliceId: string,
  ): Promise<TopicSelectionResearchSliceAssumptionRecord[]> {
    return [...this.assumptions.values()]
      .filter((record) => record.research_slice_id === researchSliceId)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
  }

  private require<T>(records: Map<string, T>, id: string, label: string): T {
    const record = records.get(id);
    if (!record) {
      throw new Error(`${label} ${id} not found.`);
    }
    return record;
  }
}
