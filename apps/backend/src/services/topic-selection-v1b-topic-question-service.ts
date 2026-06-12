import type {
  TopicSelectionTopicQuestionCandidateRecord,
  TopicSelectionTopicQuestionCandidateSetRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-question-contracts';

import type {
  TopicSelectionV1bTopicQuestionRepository,
} from '../repositories/topic-selection-v1b-topic-question.repository.js';

// T-123 Phase 1 (user directive 2026-06-12, DMP-10 single-path): the legacy pre-harness
// direct-call paths (formTopicQuestionCandidates / selectTopicQuestion /
// buildValueAssessmentInput) were REMOVED from this service. The product runtime for
// v1b N6/N7 is the WorkflowHarness (TopicSelectionV1bN6DraftRuntimeService + N7 runner +
// AgentOrchestrator + model-profile registry). This service is a read-only projection
// surface for the reviewer workbench (T-087).

export type TopicSelectionV1bTopicQuestionServiceOptions = {
  repository: TopicSelectionV1bTopicQuestionRepository;
};

export class TopicSelectionV1bTopicQuestionService {
  private readonly repository: TopicSelectionV1bTopicQuestionRepository;

  constructor(options: TopicSelectionV1bTopicQuestionServiceOptions) {
    this.repository = options.repository;
  }

  /**
   * T-087 Phase 3.1 read-only projection — list TopicQuestionCandidateSets
   * under a title-card. Pure repository delegation.
   */
  async listCandidateSetsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionTopicQuestionCandidateSetRecord[]> {
    return this.repository.listCandidateSetsByTitleCardId(titleCardId);
  }

  /**
   * T-087 Phase 3.3 read-only projection — list TopicQuestionCandidates for a
   * CandidateSet so the reviewer workbench's selection form can render a
   * proper picker instead of a free-text id field.
   */
  async listCandidatesByCandidateSetId(
    candidateSetId: string,
  ): Promise<TopicSelectionTopicQuestionCandidateRecord[]> {
    return this.repository.listCandidatesByCandidateSetId(candidateSetId);
  }
}
