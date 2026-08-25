import type {
  CreateNeedReviewRequest,
  CreatePackageRequest,
  CreatePromotionDecisionRequest,
  CreateResearchQuestionRequest,
  CreateTitleCardRequest,
  CreateValueAssessmentRequest,
  EvidenceCandidateListResponse,
  EvidenceCandidateQuery,
  NeedReviewDTO,
  PackageDTO,
  PromoteTitleCardToPaperProjectRequest,
  PromoteTitleCardToPaperProjectResponse,
  PromotionDecisionDTO,
  ResearchQuestionDTO,
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
  ValueAssessmentDTO,
} from '@paper-engineering-assistant/shared/research-lifecycle/title-card-management-contracts';
import { AppError } from '../errors/app-error.js';
import type { TitleCardManagementRepository } from '../repositories/title-card-management.repository.js';
import { createTitleCardManagementGuardrails } from './title-card-management/guardrails.js';
import { createTitleCardManagementReadModels } from './title-card-management/read-models.js';
import {
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
    _paperProjects: PaperProjectGateway,
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

  async createNeedReview(_titleCardId: string, _input: CreateNeedReviewRequest): Promise<NeedReviewDTO> {
    this.rejectLegacySemanticWrite('need');
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

  async updateNeedReview(
    _titleCardId: string,
    _needId: string,
    _input: UpdateNeedReviewRequest,
  ): Promise<NeedReviewDTO> {
    this.rejectLegacySemanticWrite('need');
  }

  async createResearchQuestion(
    _titleCardId: string,
    _input: CreateResearchQuestionRequest,
  ): Promise<ResearchQuestionDTO> {
    this.rejectLegacySemanticWrite('question');
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
    _titleCardId: string,
    _researchQuestionId: string,
    _input: UpdateResearchQuestionRequest,
  ): Promise<ResearchQuestionDTO> {
    this.rejectLegacySemanticWrite('question');
  }

  async createValueAssessment(
    _titleCardId: string,
    _input: CreateValueAssessmentRequest,
  ): Promise<ValueAssessmentDTO> {
    this.rejectLegacySemanticWrite('value');
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
    _titleCardId: string,
    _valueAssessmentId: string,
    _input: UpdateValueAssessmentRequest,
  ): Promise<ValueAssessmentDTO> {
    this.rejectLegacySemanticWrite('value');
  }

  async createPackage(_titleCardId: string, _input: CreatePackageRequest): Promise<PackageDTO> {
    this.rejectLegacySemanticWrite('package');
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

  async updatePackage(
    _titleCardId: string,
    _packageId: string,
    _input: UpdatePackageRequest,
  ): Promise<PackageDTO> {
    this.rejectLegacySemanticWrite('package');
  }

  async createPromotionDecision(
    _titleCardId: string,
    _input: CreatePromotionDecisionRequest,
  ): Promise<PromotionDecisionDTO> {
    this.rejectLegacySemanticWrite('promotion');
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
    _titleCardId: string,
    _decisionId: string,
    _input: UpdatePromotionDecisionRequest,
  ): Promise<PromotionDecisionDTO> {
    this.rejectLegacySemanticWrite('promotion');
  }

  async promoteTitleCardToPaperProject(
    _titleCardId: string,
    _input: PromoteTitleCardToPaperProjectRequest,
  ): Promise<PromoteTitleCardToPaperProjectResponse> {
    this.rejectLegacySemanticWrite('promotion');
  }

  private rejectLegacySemanticWrite(
    capability: 'need' | 'question' | 'value' | 'package' | 'promotion',
  ): never {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `Legacy title-card ${capability} writes are disabled; resume through the canonical topic-selection checkpoint APIs.`,
      {
        canonical_recovery: '/topic-selection/title-cards/{titleCardId}/research-status',
        disabled_capability: capability,
      },
    );
  }

}
