import type {
  CreateNeedReviewRequest,
  CreatePackageRequest,
  CreatePromotionDecisionRequest,
  CreateResearchQuestionRequest,
  CreateTitleCardRequest,
  CreateValueAssessmentRequest,
  EvidenceCandidateListResponse,
  EvidenceCandidateQuery,
  PromoteTitleCardToPaperProjectRequest,
  PromoteTitleCardToPaperProjectResponse,
  PromotionDecisionDTO,
  TitleCardDTO,
  TitleCardEvidenceBasketDTO,
  TitleCardListResponse,
  UpdateNeedReviewRequest,
  UpdatePackageRequest,
  UpdatePromotionDecisionRequest,
  UpdateResearchQuestionRequest,
  UpdateTitleCardEvidenceBasketRequest,
  UpdateTitleCardRequest,
  UpdateValueAssessmentRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/title-card-management-contracts';
import { AppError } from '../errors/app-error.js';
import type { TitleCardManagementRepository } from '../repositories/title-card-management.repository.js';
import { createTitleCardManagementGuardrails } from './title-card-management/guardrails.js';
import { createTitleCardManagementReadModels } from './title-card-management/read-models.js';
import {
  allHardGatesPass,
  type PaperProjectGateway,
  type TitleCardManagementReferenceGateway,
} from './title-card-management/support.js';
export type {
  PaperProjectGateway,
  TitleCardManagementReferenceGateway,
} from './title-card-management/support.js';

export class TitleCardManagementService {
  private readonly guardrails: ReturnType<typeof createTitleCardManagementGuardrails>;
  private readonly readModels: ReturnType<typeof createTitleCardManagementReadModels>;

  constructor(
    private readonly repository: TitleCardManagementRepository,
    private readonly paperProjects: PaperProjectGateway,
    references: TitleCardManagementReferenceGateway,
  ) {
    this.guardrails = createTitleCardManagementGuardrails({ repository, references });
    this.readModels = createTitleCardManagementReadModels({ repository, references });
  }

  async listTitleCards(): Promise<TitleCardListResponse> {
    const cards = await this.repository.listTitleCards();
    const hydrated = await Promise.all(cards.map((card) => this.readModels.hydrateTitleCard(card)));
    const summary = {
      total_title_cards: hydrated.length,
      active_title_cards: hydrated.filter((card) => card.status === 'active').length,
      promoted_title_cards: hydrated.filter((card) => card.status === 'promoted').length,
      total_evidence_items: hydrated.reduce((sum, card) => sum + card.evidence_count, 0),
      pending_promotion_cards: hydrated.filter(
        (card) => card.package_count > 0 && !card.latest_paper_id,
      ).length,
    };

    return { items: hydrated, summary };
  }

  async createTitleCard(input: CreateTitleCardRequest): Promise<TitleCardDTO> {
    const created = await this.repository.createTitleCard(input);
    return this.readModels.hydrateTitleCard(created);
  }

  async getTitleCard(titleCardId: string): Promise<TitleCardDTO> {
    const titleCard = await this.guardrails.assertTitleCardExists(titleCardId);
    return this.readModels.hydrateTitleCard(titleCard);
  }

  async updateTitleCard(titleCardId: string, input: UpdateTitleCardRequest): Promise<TitleCardDTO> {
    await this.guardrails.assertTitleCardExists(titleCardId);
    const updated = await this.repository.updateTitleCard(titleCardId, input);
    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', `TitleCard ${titleCardId} not found.`);
    }
    return this.readModels.hydrateTitleCard(updated);
  }

  async getEvidenceBasket(titleCardId: string): Promise<TitleCardEvidenceBasketDTO> {
    await this.guardrails.assertTitleCardExists(titleCardId);
    const basket = await this.repository.getEvidenceBasket(titleCardId);
    const items = await this.readModels.hydrateEvidenceBasketItems(basket.items);
    return {
      title_card_id: titleCardId,
      items,
      updated_at: basket.updated_at,
    };
  }

  async updateEvidenceBasket(
    titleCardId: string,
    input: UpdateTitleCardEvidenceBasketRequest,
  ): Promise<TitleCardEvidenceBasketDTO> {
    await this.guardrails.assertTitleCardExists(titleCardId);
    const addIds = input.add_literature_ids ?? [];
    if (addIds.length > 0) {
      await this.guardrails.assertLiteraturesExist(addIds);
    }
    await this.repository.updateEvidenceBasket(titleCardId, input);
    return this.getEvidenceBasket(titleCardId);
  }

  async listEvidenceCandidates(
    titleCardId: string,
    query: EvidenceCandidateQuery,
  ): Promise<EvidenceCandidateListResponse> {
    await this.guardrails.assertTitleCardExists(titleCardId);
    return this.readModels.listEvidenceCandidates(titleCardId, query);
  }

  async createNeedReview(titleCardId: string, input: CreateNeedReviewRequest) {
    await this.guardrails.assertTitleCardExists(titleCardId);
    if (input.literature_ids.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'NeedReview must reference at least one literature record.');
    }
    await this.guardrails.assertLiteraturesExist(input.literature_ids);
    await this.guardrails.assertEvidenceSelectedInBasket(titleCardId, input.literature_ids);
    return this.repository.createNeedReview(titleCardId, input);
  }

  async listNeedReviews(titleCardId: string) {
    await this.guardrails.assertTitleCardExists(titleCardId);
    return this.repository.listNeedReviews(titleCardId);
  }

  async getNeedReview(titleCardId: string, needId: string) {
    await this.guardrails.assertTitleCardExists(titleCardId);
    const review = await this.repository.getNeedReview(titleCardId, needId);
    if (!review) {
      throw new AppError(404, 'NOT_FOUND', `NeedReview ${needId} not found for title card ${titleCardId}.`);
    }
    return review;
  }

  async updateNeedReview(titleCardId: string, needId: string, input: UpdateNeedReviewRequest) {
    const current = await this.guardrails.assertNeedReviewUsable(titleCardId, needId);
    const next = {
      ...current,
      ...input,
      literature_ids: input.literature_ids ?? current.literature_ids,
    };
    await this.guardrails.assertLiteraturesExist(next.literature_ids);
    await this.guardrails.assertEvidenceSelectedInBasket(titleCardId, next.literature_ids);
    const updated = await this.repository.updateNeedReview(titleCardId, needId, input);
    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', `NeedReview ${needId} not found for title card ${titleCardId}.`);
    }
    return updated;
  }

  async createResearchQuestion(titleCardId: string, input: CreateResearchQuestionRequest) {
    await this.guardrails.assertTitleCardExists(titleCardId);
    const needIds = input.source_need_ids ?? [];
    const literatureEvidenceIds = input.source_literature_evidence_ids ?? [];
    if (needIds.length + literatureEvidenceIds.length === 0) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'ResearchQuestion must reference at least one upstream need review or literature evidence.',
      );
    }
    await Promise.all(needIds.map((needId) => this.guardrails.assertNeedReviewUsable(titleCardId, needId)));
    if (literatureEvidenceIds.length > 0) {
      await this.guardrails.assertEvidenceSelectedInBasket(titleCardId, literatureEvidenceIds);
    }
    return this.repository.createResearchQuestion(titleCardId, input);
  }

  async listResearchQuestions(titleCardId: string) {
    await this.guardrails.assertTitleCardExists(titleCardId);
    return this.repository.listResearchQuestions(titleCardId);
  }

  async getResearchQuestion(titleCardId: string, researchQuestionId: string) {
    await this.guardrails.assertTitleCardExists(titleCardId);
    const question = await this.repository.getResearchQuestion(titleCardId, researchQuestionId);
    if (!question) {
      throw new AppError(404, 'NOT_FOUND', `ResearchQuestion ${researchQuestionId} not found for title card ${titleCardId}.`);
    }
    return question;
  }

  async updateResearchQuestion(
    titleCardId: string,
    researchQuestionId: string,
    input: UpdateResearchQuestionRequest,
  ) {
    const current = await this.guardrails.assertResearchQuestionUsable(titleCardId, researchQuestionId);
    const nextNeedIds = input.source_need_ids ?? current.source_need_ids;
    const nextLiteratureEvidenceIds =
      input.source_literature_evidence_ids ?? current.source_literature_evidence_ids;
    if (nextNeedIds.length + nextLiteratureEvidenceIds.length === 0) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'ResearchQuestion must reference at least one upstream need review or literature evidence.',
      );
    }
    await Promise.all(nextNeedIds.map((needId) => this.guardrails.assertNeedReviewUsable(titleCardId, needId)));
    if (nextLiteratureEvidenceIds.length > 0) {
      await this.guardrails.assertEvidenceSelectedInBasket(titleCardId, nextLiteratureEvidenceIds);
    }
    const updated = await this.repository.updateResearchQuestion(titleCardId, researchQuestionId, input);
    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', `ResearchQuestion ${researchQuestionId} not found for title card ${titleCardId}.`);
    }
    return updated;
  }

  async createValueAssessment(titleCardId: string, input: CreateValueAssessmentRequest) {
    await this.guardrails.assertTitleCardExists(titleCardId);
    await this.guardrails.assertResearchQuestionUsable(titleCardId, input.research_question_id);
    if (!Object.values(input.hard_gates).every((gate) => gate.pass) && input.verdict === 'promote') {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'ValueAssessment verdict cannot be promote when any hard gate fails.',
      );
    }
    return this.repository.createValueAssessment(titleCardId, input);
  }

  async listValueAssessments(titleCardId: string) {
    await this.guardrails.assertTitleCardExists(titleCardId);
    return this.repository.listValueAssessments(titleCardId);
  }

  async getValueAssessment(titleCardId: string, valueAssessmentId: string) {
    await this.guardrails.assertTitleCardExists(titleCardId);
    const value = await this.repository.getValueAssessment(titleCardId, valueAssessmentId);
    if (!value) {
      throw new AppError(404, 'NOT_FOUND', `ValueAssessment ${valueAssessmentId} not found for title card ${titleCardId}.`);
    }
    return value;
  }

  async updateValueAssessment(
    titleCardId: string,
    valueAssessmentId: string,
    input: UpdateValueAssessmentRequest,
  ) {
    const current = await this.guardrails.assertValueAssessmentUsable(titleCardId, valueAssessmentId);
    const next = {
      ...current,
      ...input,
      hard_gates: input.hard_gates ?? current.hard_gates,
      verdict: input.verdict ?? current.verdict,
    };
    if (!Object.values(next.hard_gates).every((gate) => gate.pass) && next.verdict === 'promote') {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'ValueAssessment verdict cannot be promote when any hard gate fails.',
      );
    }
    const updated = await this.repository.updateValueAssessment(titleCardId, valueAssessmentId, input);
    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', `ValueAssessment ${valueAssessmentId} not found for title card ${titleCardId}.`);
    }
    return updated;
  }

  async createPackage(titleCardId: string, input: CreatePackageRequest) {
    await this.guardrails.assertTitleCardExists(titleCardId);
    const question = await this.guardrails.assertResearchQuestionUsable(titleCardId, input.research_question_id);
    const assessment = await this.guardrails.assertValueAssessmentUsable(titleCardId, input.value_assessment_id);
    if (assessment.research_question_id !== question.research_question_id) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Package must reference an existing ValueAssessment for the same research question.',
      );
    }
    await this.guardrails.assertLiteraturesExist(input.selected_literature_evidence_ids);
    await this.guardrails.assertEvidenceSelectedInBasket(titleCardId, input.selected_literature_evidence_ids);
    return this.repository.createPackage(titleCardId, input);
  }

  async listPackages(titleCardId: string) {
    await this.guardrails.assertTitleCardExists(titleCardId);
    return this.repository.listPackages(titleCardId);
  }

  async getPackage(titleCardId: string, packageId: string) {
    await this.guardrails.assertTitleCardExists(titleCardId);
    const pkg = await this.repository.getPackage(titleCardId, packageId);
    if (!pkg) {
      throw new AppError(404, 'NOT_FOUND', `Package ${packageId} not found for title card ${titleCardId}.`);
    }
    return pkg;
  }

  async updatePackage(titleCardId: string, packageId: string, input: UpdatePackageRequest) {
    const current = await this.guardrails.assertPackageUsable(titleCardId, packageId);
    const nextQuestionId = input.research_question_id ?? current.research_question_id;
    const nextValueId = input.value_assessment_id ?? current.value_assessment_id;
    const nextEvidenceIds = input.selected_literature_evidence_ids ?? current.selected_literature_evidence_ids;
    const question = await this.guardrails.assertResearchQuestionUsable(titleCardId, nextQuestionId);
    const assessment = await this.guardrails.assertValueAssessmentUsable(titleCardId, nextValueId);
    if (assessment.research_question_id !== question.research_question_id) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Package must reference a ValueAssessment aligned with the target research question.',
      );
    }
    await this.guardrails.assertLiteraturesExist(nextEvidenceIds);
    await this.guardrails.assertEvidenceSelectedInBasket(titleCardId, nextEvidenceIds);
    const updated = await this.repository.updatePackage(titleCardId, packageId, input);
    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', `Package ${packageId} not found for title card ${titleCardId}.`);
    }
    return updated;
  }

  async createPromotionDecision(titleCardId: string, input: CreatePromotionDecisionRequest) {
    await this.guardrails.assertTitleCardExists(titleCardId);
    return this.createValidatedPromotionDecision(titleCardId, input);
  }

  async listPromotionDecisions(titleCardId: string) {
    await this.guardrails.assertTitleCardExists(titleCardId);
    return this.repository.listPromotionDecisions(titleCardId);
  }

  async getPromotionDecision(titleCardId: string, decisionId: string) {
    await this.guardrails.assertTitleCardExists(titleCardId);
    const decision = await this.repository.getPromotionDecision(titleCardId, decisionId);
    if (!decision) {
      throw new AppError(404, 'NOT_FOUND', `PromotionDecision ${decisionId} not found for title card ${titleCardId}.`);
    }
    return decision;
  }

  async updatePromotionDecision(
    titleCardId: string,
    decisionId: string,
    input: UpdatePromotionDecisionRequest,
  ) {
    const current = await this.getPromotionDecision(titleCardId, decisionId);
    const next = {
      ...current,
      ...input,
    };
    await this.validatePromotionDecision(titleCardId, next);
    const updated = await this.repository.updatePromotionDecision(titleCardId, decisionId, input);
    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', `PromotionDecision ${decisionId} not found for title card ${titleCardId}.`);
    }
    return updated;
  }

  async promoteTitleCardToPaperProject(
    titleCardId: string,
    input: PromoteTitleCardToPaperProjectRequest,
  ): Promise<PromoteTitleCardToPaperProjectResponse> {
    const titleCard = await this.guardrails.assertTitleCardExists(titleCardId);
    const question = await this.guardrails.assertResearchQuestionUsable(titleCardId, input.research_question_id);
    const assessment = await this.guardrails.assertValueAssessmentUsable(titleCardId, input.value_assessment_id);
    if (assessment.research_question_id !== question.research_question_id) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Promotion requires a ValueAssessment attached to the target research question.',
      );
    }
    if (!allHardGatesPass(assessment)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Promotion requires all ValueAssessment hard gates to pass.');
    }

    const pkg = await this.guardrails.assertPackageUsable(titleCardId, input.package_id);
    if (
      pkg.research_question_id !== question.research_question_id
      || pkg.value_assessment_id !== assessment.value_assessment_id
    ) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Promotion requires a Package aligned with the target research question and value assessment.',
      );
    }
    if (pkg.selected_literature_evidence_ids.length === 0) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'Promotion requires at least one selected literature evidence id.',
      );
    }
    await this.guardrails.assertLiteraturesExist(pkg.selected_literature_evidence_ids);

    let createdPaperId: string | null = null;
    try {
      const created = await this.paperProjects.createPaperProject({
        topic_id: titleCardId,
        title: input.title,
        research_direction: input.research_direction,
        created_by: input.created_by,
        initial_context: {
          literature_evidence_ids: pkg.selected_literature_evidence_ids,
        },
      });
      createdPaperId = created.paper_id;

      const decision = await this.repository.createPromotionDecision(titleCardId, {
        research_question_id: input.research_question_id,
        value_assessment_id: input.value_assessment_id,
        package_id: input.package_id,
        decision: 'promote',
        reason_summary: `Promoted title card ${titleCard.working_title} to paper project ${created.paper_id}.`,
        target_paper_title: input.title,
        created_by: input.created_by,
        promoted_paper_id: created.paper_id,
      });

      await this.repository.updateTitleCard(titleCardId, { status: 'promoted' });

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

  private async createValidatedPromotionDecision(
    titleCardId: string,
    input: CreatePromotionDecisionRequest,
  ): Promise<PromotionDecisionDTO> {
    await this.validatePromotionDecision(titleCardId, input);
    return this.repository.createPromotionDecision(titleCardId, input);
  }

  private async validatePromotionDecision(
    titleCardId: string,
    input: CreatePromotionDecisionRequest | PromotionDecisionDTO,
  ): Promise<void> {
    const question = await this.guardrails.assertResearchQuestionUsable(titleCardId, input.research_question_id);
    const valueAssessment = await this.guardrails.assertValueAssessmentUsable(titleCardId, input.value_assessment_id);
    if (valueAssessment.research_question_id !== question.research_question_id) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'PromotionDecision must reference a ValueAssessment belonging to the same research question.',
      );
    }

    const pkg = input.package_id ? await this.guardrails.assertPackageUsable(titleCardId, input.package_id) : null;
    if (
      pkg
      && (
        pkg.research_question_id !== question.research_question_id
        || pkg.value_assessment_id !== valueAssessment.value_assessment_id
      )
    ) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'PromotionDecision package_id must align with the target research question and value assessment.',
      );
    }

    if (input.decision === 'promote') {
      if (!allHardGatesPass(valueAssessment)) {
        throw new AppError(
          422,
          'GATE_CONSTRAINT_FAILED',
          'Cannot promote title card when value assessment hard gates are not all passing.',
        );
      }
      if (!input.package_id || !input.target_paper_title) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Promote decision requires package_id and target_paper_title.');
      }
    }

    if (input.decision === 'loopback' && !input.loopback_target) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Loopback decision requires loopback_target.');
    }
  }

}
