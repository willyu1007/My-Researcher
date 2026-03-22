import type {
  CreateNeedReviewRequest,
  CreateTopicPackageRequest,
  CreateTopicPromotionDecisionRequest,
  CreateTopicQuestionRequest,
  CreateTopicValueAssessmentRequest,
  PromoteTopicToPaperProjectRequest,
  PromoteTopicToPaperProjectResponse,
  TopicPackageDTO,
  TopicQuestionDTO,
  TopicValueAssessmentDTO,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-management-contracts';
import { AppError } from '../errors/app-error.js';
import type { TopicManagementRepository } from '../repositories/topic-management.repository.js';

export interface PaperProjectGateway {
  createPaperProject(input: {
    topic_id: string;
    title: string;
    research_direction?: string;
    created_by: 'human' | 'hybrid';
    initial_context: { literature_evidence_ids: string[] };
  }): Promise<{ paper_id: string }>;
  deletePaperProject(paperId: string): Promise<void>;
}

export interface TopicManagementReferenceGateway {
  findTopicProfileById(topicId: string): Promise<{ id: string; isActive: boolean } | null>;
  findLiteratureById(literatureId: string): Promise<{ id: string } | null>;
}

function allHardGatesPass(value: TopicValueAssessmentDTO): boolean {
  return Object.values(value.hard_gates).every((gate) => gate.pass);
}

function isRecordUsable(recordStatus: string): boolean {
  return recordStatus !== 'archived' && recordStatus !== 'superseded';
}

export class TopicManagementService {
  constructor(
    private readonly repository: TopicManagementRepository,
    private readonly paperProjects: PaperProjectGateway,
    private readonly references: TopicManagementReferenceGateway,
  ) {}

  async createNeedReview(topicId: string, input: CreateNeedReviewRequest) {
    await this.assertTopicExists(topicId);
    if (input.literature_ids.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'NeedReview must reference at least one literature record.');
    }
    await this.assertLiteraturesExist(input.literature_ids);
    return this.repository.createNeedReview(topicId, input);
  }

  async listNeedReviews(topicId: string) {
    await this.assertTopicExists(topicId);
    return this.repository.listNeedReviews(topicId);
  }

  async createQuestion(topicId: string, input: CreateTopicQuestionRequest) {
    await this.assertTopicExists(topicId);

    const needIds = input.source_need_review_ids ?? [];
    const evidenceIds = input.source_evidence_review_ids ?? [];
    if (needIds.length + evidenceIds.length === 0) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'TopicQuestion must reference at least one upstream need review or evidence review.',
      );
    }
    if (evidenceIds.length > 0) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'source_evidence_review_ids are not yet supported until the literature evidence bridge is implemented.',
        { source_evidence_review_ids: evidenceIds },
      );
    }

    await Promise.all(needIds.map((recordId) => this.assertNeedReviewUsable(topicId, recordId)));
    return this.repository.createQuestion(topicId, input);
  }

  async listQuestions(topicId: string) {
    await this.assertTopicExists(topicId);
    return this.repository.listQuestions(topicId);
  }

  async listValueAssessments(topicId: string, questionId: string) {
    await this.assertTopicExists(topicId);
    await this.assertQuestionUsable(topicId, questionId);
    return this.repository.listValueAssessments(topicId, questionId);
  }

  async createValueAssessment(topicId: string, questionId: string, input: CreateTopicValueAssessmentRequest) {
    await this.assertTopicExists(topicId);
    await this.assertQuestionUsable(topicId, questionId);
    if (!Object.values(input.hard_gates).every((gate) => gate.pass) && input.verdict === 'promote') {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'ValueAssessment verdict cannot be promote when any hard gate fails.',
      );
    }
    return this.repository.createValueAssessment(topicId, questionId, input);
  }

  async createTopicPackage(
    topicId: string,
    questionId: string,
    valueAssessmentId: string,
    input: CreateTopicPackageRequest,
  ) {
    await this.assertTopicExists(topicId);
    const question = await this.assertQuestionUsable(topicId, questionId);
    const assessment = await this.assertValueAssessmentUsable(topicId, valueAssessmentId);
    if (assessment.question_id !== question.record_id) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'TopicPackage must reference an existing ValueAssessment for the same question.',
      );
    }
    await this.assertLiteraturesExist(input.selected_literature_evidence_ids);
    return this.repository.createTopicPackage(topicId, questionId, valueAssessmentId, input);
  }

  async listTopicPackages(topicId: string, questionId: string, valueAssessmentId: string) {
    await this.assertTopicExists(topicId);
    const question = await this.assertQuestionUsable(topicId, questionId);
    const assessment = await this.assertValueAssessmentUsable(topicId, valueAssessmentId);
    if (assessment.question_id !== question.record_id) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'TopicPackage listing requires a ValueAssessment aligned with the target question.',
      );
    }
    return this.repository.listTopicPackages(topicId, questionId, valueAssessmentId);
  }

  async createPromotionDecision(topicId: string, input: CreateTopicPromotionDecisionRequest) {
    await this.assertTopicExists(topicId);
    const question = await this.assertQuestionUsable(topicId, input.question_id);
    const valueAssessment = await this.assertValueAssessmentUsable(topicId, input.value_assessment_id);
    if (valueAssessment.question_id !== question.record_id) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'PromotionDecision must reference a ValueAssessment belonging to the same question.',
      );
    }

    const pkg = input.package_id
      ? await this.assertTopicPackageUsable(topicId, input.package_id)
      : null;
    if (pkg && (pkg.question_id !== question.record_id || pkg.value_assessment_id !== valueAssessment.record_id)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'PromotionDecision package_id must align with the target question and value assessment.',
      );
    }

    if (input.decision === 'promote') {
      if (!allHardGatesPass(valueAssessment)) {
        throw new AppError(
          422,
          'GATE_CONSTRAINT_FAILED',
          'Cannot promote topic when value assessment hard gates are not all passing.',
        );
      }
      if (!input.package_id || !input.target_paper_title) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Promote decision requires package_id and target_paper_title.');
      }
    }

    if (input.decision === 'loopback' && !input.loopback_target) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Loopback decision requires loopback_target.');
    }

    return this.repository.createPromotionDecision(topicId, input);
  }

  async promoteTopicToPaperProject(
    topicId: string,
    input: PromoteTopicToPaperProjectRequest,
  ): Promise<PromoteTopicToPaperProjectResponse> {
    await this.assertTopicExists(topicId);
    const question = await this.assertQuestionUsable(topicId, input.question_id);
    const assessment = await this.assertValueAssessmentUsable(topicId, input.value_assessment_id);
    if (assessment.question_id !== question.record_id) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Promotion requires a ValueAssessment attached to the target question.',
      );
    }
    if (!allHardGatesPass(assessment)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Promotion requires all ValueAssessment hard gates to pass.');
    }

    const pkg = await this.assertTopicPackageUsable(topicId, input.package_id);
    if (pkg.question_id !== question.record_id || pkg.value_assessment_id !== assessment.record_id) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Promotion requires a TopicPackage aligned with the target question and value assessment.',
      );
    }
    if (pkg.selected_literature_evidence_ids.length === 0) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'Promotion requires at least one selected literature evidence id.',
      );
    }
    await this.assertLiteraturesExist(pkg.selected_literature_evidence_ids);

    let createdPaperId: string | null = null;
    try {
      const created = await this.paperProjects.createPaperProject({
        topic_id: topicId,
        title: input.title,
        research_direction: input.research_direction,
        created_by: input.created_by,
        initial_context: {
          literature_evidence_ids: pkg.selected_literature_evidence_ids,
        },
      });
      createdPaperId = created.paper_id;

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
    } catch (error) {
      if (createdPaperId) {
        try {
          await this.paperProjects.deletePaperProject(createdPaperId);
        } catch (rollbackError) {
          throw new AppError(
            500,
            'INTERNAL_ERROR',
            'Promotion failed and rollback of the created paper project also failed.',
            {
              created_paper_id: createdPaperId,
              original_error: error instanceof Error ? error.message : 'unknown',
              rollback_error: rollbackError instanceof Error ? rollbackError.message : 'unknown',
            },
          );
        }
      }

      throw error;
    }
  }

  private async assertTopicExists(topicId: string) {
    const topic = await this.references.findTopicProfileById(topicId);
    if (!topic) {
      throw new AppError(404, 'NOT_FOUND', `Topic profile ${topicId} not found.`);
    }
    return topic;
  }

  private async assertLiteraturesExist(literatureIds: string[]) {
    const results = await Promise.all(
      literatureIds.map(async (literatureId) => ({
        literatureId,
        found: await this.references.findLiteratureById(literatureId),
      })),
    );
    const missing = results.filter((result) => !result.found).map((result) => result.literatureId);
    if (missing.length > 0) {
      throw new AppError(404, 'NOT_FOUND', `Literature records not found: ${missing.join(', ')}.`, {
        missing_literature_ids: missing,
      });
    }
  }

  private async assertNeedReviewUsable(topicId: string, recordId: string) {
    const review = await this.repository.getNeedReview(topicId, recordId);
    if (!review) {
      throw new AppError(404, 'NOT_FOUND', `NeedReview ${recordId} not found for topic ${topicId}.`);
    }
    if (!isRecordUsable(review.record_status)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `NeedReview ${recordId} is ${review.record_status} and cannot be used as an upstream source.`,
      );
    }
    return review;
  }

  private async assertQuestionUsable(topicId: string, recordId: string): Promise<TopicQuestionDTO> {
    const question = await this.repository.getQuestion(topicId, recordId);
    if (!question) {
      throw new AppError(404, 'NOT_FOUND', `TopicQuestion ${recordId} not found for topic ${topicId}.`);
    }
    if (!isRecordUsable(question.record_status)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `TopicQuestion ${recordId} is ${question.record_status} and cannot be used.`,
      );
    }
    return question;
  }

  private async assertValueAssessmentUsable(topicId: string, recordId: string): Promise<TopicValueAssessmentDTO> {
    const assessment = await this.repository.getValueAssessment(topicId, recordId);
    if (!assessment) {
      throw new AppError(404, 'NOT_FOUND', `TopicValueAssessment ${recordId} not found for topic ${topicId}.`);
    }
    if (!isRecordUsable(assessment.record_status)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `TopicValueAssessment ${recordId} is ${assessment.record_status} and cannot be used.`,
      );
    }
    return assessment;
  }

  private async assertTopicPackageUsable(topicId: string, recordId: string): Promise<TopicPackageDTO> {
    const pkg = await this.repository.getTopicPackage(topicId, recordId);
    if (!pkg) {
      throw new AppError(404, 'NOT_FOUND', `TopicPackage ${recordId} not found for topic ${topicId}.`);
    }
    if (!isRecordUsable(pkg.record_status)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `TopicPackage ${recordId} is ${pkg.record_status} and cannot be used.`,
      );
    }
    return pkg;
  }
}
