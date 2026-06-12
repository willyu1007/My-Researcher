import type {
  TopicSelectionResearchSliceOptionRecord,
  TopicSelectionResearchSliceOptionSetRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';

import type {
  TopicSelectionV1bResearchSliceRepository,
} from '../repositories/topic-selection-v1b-research-slice.repository.js';

// T-123 Phase 1 (user directive 2026-06-12, DMP-10 single-path): the legacy pre-harness
// direct-call paths (planResearchSliceOptions / selectResearchSlice /
// buildTopicQuestionFormationInput) were REMOVED from this service. The product runtime
// for v1b N4/N5 is the WorkflowHarness (TopicSelectionV1bN4ResearchSliceRuntimeService +
// AgentOrchestrator + model-profile registry; human N5 via
// TopicSelectionV1bSliceHumanSelectionService). This service is a read-only projection
// surface for the reviewer workbench (T-087) and the human N5 selection path (T-115).

export type TopicSelectionV1bResearchSliceServiceOptions = {
  repository: TopicSelectionV1bResearchSliceRepository;
};

export class TopicSelectionV1bResearchSliceService {
  private readonly repository: TopicSelectionV1bResearchSliceRepository;

  constructor(options: TopicSelectionV1bResearchSliceServiceOptions) {
    this.repository = options.repository;
  }

  /**
   * T-087 Phase 3.1 read-only projection — list ResearchSliceOptionSets under
   * a title-card. Pure repository delegation; no decision-chain semantics
   * changed.
   */
  async listOptionSetsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionResearchSliceOptionSetRecord[]> {
    return this.repository.listOptionSetsByTitleCardId(titleCardId);
  }

  /**
   * T-115 — single ResearchSliceOptionSet by id. Lets the human N5 selection
   * service read back the persisted N4 authority + handoff hashes from
   * `comparison_payload` to assemble a valid harness frozen_input.
   */
  async findOptionSetById(
    optionSetId: string,
  ): Promise<TopicSelectionResearchSliceOptionSetRecord | null> {
    return this.repository.findOptionSetById(optionSetId);
  }

  /**
   * T-087 Phase 3.2 read-only projection — list ResearchSliceOptions for an
   * OptionSet so the reviewer workbench's selection form can render a
   * proper picker instead of a free-text id field.
   */
  async listOptionsByOptionSetId(
    optionSetId: string,
  ): Promise<TopicSelectionResearchSliceOptionRecord[]> {
    return this.repository.listOptionsByOptionSetId(optionSetId);
  }
}
