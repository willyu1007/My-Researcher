import type {
  TopicSelectionTopicValueAssessmentRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';

import type {
  TopicSelectionV1bValueAssessmentRepository,
} from '../repositories/topic-selection-v1b-value-assessment.repository.js';

// T-123 Phase 1 (user directive 2026-06-12, DMP-10 single-path): the legacy pre-harness
// direct-call paths (assessTopicValue / decideValueDisposition / buildPackageDraftInput)
// were REMOVED from this service. The product runtime for v1b N8/N9 is the WorkflowHarness
// (TopicSelectionV1bN8ValueAssessmentRuntimeService + N9 runner + AgentOrchestrator +
// model-profile registry). This service is a read-only projection surface for the
// reviewer workbench (T-087).

export type TopicSelectionV1bValueAssessmentServiceOptions = {
  repository: TopicSelectionV1bValueAssessmentRepository;
};

export class TopicSelectionV1bValueAssessmentService {
  private readonly repository: TopicSelectionV1bValueAssessmentRepository;

  constructor(options: TopicSelectionV1bValueAssessmentServiceOptions) {
    this.repository = options.repository;
  }

  /**
   * T-087 Phase 3.1 read-only projection — list TopicValueAssessments under
   * a title-card. Pure repository delegation.
   */
  async listAssessmentsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionTopicValueAssessmentRecord[]> {
    return this.repository.listAssessmentsByTitleCardId(titleCardId);
  }
}
