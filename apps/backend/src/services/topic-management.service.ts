import type {
  CreateNeedReviewRequest,
  CreateTopicPackageRequest,
  CreateTopicPromotionDecisionRequest,
  CreateTopicQuestionRequest,
  CreateTopicValueAssessmentRequest,
  PromoteTopicToPaperProjectRequest,
  PromoteTopicToPaperProjectResponse,
  TopicValueAssessmentDTO,
} from '@paper-engineering-assistant/shared';
import type { TopicManagementRepository } from '../repositories/topic-management.repository.js';

export interface PaperProjectGateway {
  createPaperProject(input: {
    topic_id: string;
    title: string;
    research_direction?: string;
    created_by: 'human' | 'hybrid';
    initial_context: { literature_evidence_ids: string[] };
  }): Promise<{ paper_id: string }>;
}

export class TopicManagementInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TopicManagementInvariantError';
  }
}

function allHardGatesPass(value: TopicValueAssessmentDTO): boolean {
  return Object.values(value.hard_gates).every((gate) => gate.pass);
}

function assertQuestionHasSources(input: CreateTopicQuestionRequest): void {
  const needCount = input.source_need_review_ids?.length ?? 0;
  const evidenceCount = input.source_evidence_review_ids?.length ?? 0;
  if (needCount + evidenceCount === 0) {
    throw new TopicManagementInvariantError('TopicQuestion must reference at least one upstream need review or evidence review.');
  }
}

function assertVerdictMatchesHardGates(input: CreateTopicValueAssessmentRequest): void {
  const pass = Object.values(input.hard_gates).every((gate) => gate.pass);
  if (!pass && input.verdict === 'promote') {
    throw new TopicManagementInvariantError('ValueAssessment verdict cannot be promote when any hard gate fails.');
  }
}

export class TopicManagementService {
  constructor(
    private readonly repository: TopicManagementRepository,
    private readonly paperProjects: PaperProjectGateway,
  ) {}

  async createNeedReview(topicId: string, input: CreateNeedReviewRequest) {
    if (input.literature_ids.length === 0) {
      throw new TopicManagementInvariantError('NeedReview must reference at least one literature record.');
    }
    return this.repository.createNeedReview(topicId, input);
  }

  async listNeedReviews(topicId: string) {
    return this.repository.listNeedReviews(topicId);
  }

  async createQuestion(topicId: string, input: CreateTopicQuestionRequest) {
    assertQuestionHasSources(input);
    return this.repository.createQuestion(topicId, input);
  }

  async listQuestions(topicId: string) {
    return this.repository.listQuestions(topicId);
  }

  async listValueAssessments(topicId: string, questionId: string) {
    return this.repository.listValueAssessments(topicId, questionId);
  }

  async createValueAssessment(topicId: string, questionId: string, input: CreateTopicValueAssessmentRequest) {
    assertVerdictMatchesHardGates(input);
    return this.repository.createValueAssessment(topicId, questionId, input);
  }

  async createTopicPackage(topicId: string, questionId: string, valueAssessmentId: string, input: CreateTopicPackageRequest) {
    const assessment = await this.repository.getValueAssessment(topicId, valueAssessmentId);
    if (!assessment || assessment.question_id !== questionId) {
      throw new TopicManagementInvariantError('TopicPackage must reference an existing ValueAssessment for the same question.');
    }
    return this.repository.createTopicPackage(topicId, questionId, valueAssessmentId, input);
  }

  async listTopicPackages(topicId: string, valueAssessmentId: string) {
    return this.repository.listTopicPackages(topicId, valueAssessmentId);
  }

  async createPromotionDecision(topicId: string, input: CreateTopicPromotionDecisionRequest) {
    const valueAssessment = await this.repository.getValueAssessment(topicId, input.value_assessment_id);
    if (!valueAssessment || valueAssessment.question_id !== input.question_id) {
      throw new TopicManagementInvariantError('PromotionDecision must reference a ValueAssessment belonging to the same question.');
    }

    if (input.decision === 'promote') {
      if (!allHardGatesPass(valueAssessment)) {
        throw new TopicManagementInvariantError('Cannot promote topic when value assessment hard gates are not all passing.');
      }
      if (!input.package_id || !input.target_paper_title) {
        throw new TopicManagementInvariantError('Promote decision requires package_id and target_paper_title.');
      }
    }

    if (input.decision === 'loopback' && !input.loopback_target) {
      throw new TopicManagementInvariantError('Loopback decision requires loopback_target.');
    }

    return this.repository.createPromotionDecision(topicId, input);
  }

  async promoteTopicToPaperProject(topicId: string, input: PromoteTopicToPaperProjectRequest): Promise<PromoteTopicToPaperProjectResponse> {
    const assessment = await this.repository.getValueAssessment(topicId, input.value_assessment_id);
    if (!assessment || assessment.question_id !== input.question_id) {
      throw new TopicManagementInvariantError('Promotion requires a ValueAssessment attached to the target question.');
    }
    if (!allHardGatesPass(assessment)) {
      throw new TopicManagementInvariantError('Promotion requires all ValueAssessment hard gates to pass.');
    }

    const pkg = await this.repository.getTopicPackage(topicId, input.package_id);
    if (!pkg || pkg.question_id !== input.question_id || pkg.value_assessment_id !== input.value_assessment_id) {
      throw new TopicManagementInvariantError('Promotion requires a TopicPackage aligned with the target question and value assessment.');
    }
    if (pkg.selected_literature_evidence_ids.length === 0) {
      throw new TopicManagementInvariantError('Promotion requires at least one selected literature evidence id.');
    }

    const created = await this.paperProjects.createPaperProject({
      topic_id: topicId,
      title: input.title,
      research_direction: input.research_direction,
      created_by: input.created_by,
      initial_context: {
        literature_evidence_ids: pkg.selected_literature_evidence_ids,
      },
    });

    const decision = await this.repository.createPromotionDecision(topicId, {
      question_id: input.question_id,
      value_assessment_id: input.value_assessment_id,
      package_id: input.package_id,
      decision: 'promote',
      reason_summary: `Promoted to paper project ${created.paper_id} after passing all topic value hard gates.`,
      target_paper_title: input.title,
      created_by: input.created_by,
      promotedPaperId: created.paper_id,
    });

    return {
      paper_id: created.paper_id,
      decision_id: decision.decision_id,
    };
  }
}
