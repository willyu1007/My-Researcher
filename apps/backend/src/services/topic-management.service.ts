import type {
  CreateNeedReviewRequest,
  CreatePackageRequest,
  CreatePromotionDecisionRequest,
  CreateResearchQuestionRequest,
  CreateTitleCardRequest,
  CreateValueAssessmentRequest,
  EvidenceCandidateDTO,
  EvidenceCandidateListResponse,
  EvidenceCandidateQuery,
  PackageDTO,
  PromoteTitleCardToPaperProjectRequest,
  PromoteTitleCardToPaperProjectResponse,
  PromotionDecisionDTO,
  ResearchQuestionDTO,
  TitleCardDTO,
  TitleCardEvidenceBasketDTO,
  TitleCardEvidenceBasketItemDTO,
  TitleCardListResponse,
  UpdateNeedReviewRequest,
  UpdatePackageRequest,
  UpdatePromotionDecisionRequest,
  UpdateResearchQuestionRequest,
  UpdateTitleCardEvidenceBasketRequest,
  UpdateTitleCardRequest,
  UpdateValueAssessmentRequest,
  ValueAssessmentDTO,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-management-contracts';
import { AppError } from '../errors/app-error.js';
import type {
  StoredTitleCard,
  TopicManagementRepository,
} from '../repositories/topic-management.repository.js';

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
  findLiteratureById(literatureId: string): Promise<{
    id: string;
    title: string;
    abstractText: string | null;
    keyContentDigest: string | null;
    authors: string[];
    year: number | null;
    tags: string[];
    rightsClass: string;
  } | null>;
  listLiteratures(): Promise<Array<{
    id: string;
    title: string;
    abstractText: string | null;
    keyContentDigest: string | null;
    authors: string[];
    year: number | null;
    tags: string[];
    rightsClass: string;
  }>>;
  listSourcesByLiteratureId(literatureId: string): Promise<Array<{
    provider: string;
    sourceUrl: string;
  }>>;
  listPipelineStatesByLiteratureIds(literatureIds: string[]): Promise<Array<{
    literatureId: string;
    citationComplete: boolean;
    abstractReady: boolean;
    keyContentReady: boolean;
  }>>;
}

function allHardGatesPass(value: ValueAssessmentDTO): boolean {
  return Object.values(value.hard_gates).every((gate) => gate.pass);
}

function isRecordUsable(recordStatus: string): boolean {
  return recordStatus !== 'archived' && recordStatus !== 'superseded';
}

function isPipelineReady(state: {
  citationComplete: boolean;
  abstractReady: boolean;
  keyContentReady: boolean;
} | null | undefined): boolean {
  return Boolean(state?.citationComplete && (state.abstractReady || state.keyContentReady));
}

export class TopicManagementService {
  constructor(
    private readonly repository: TopicManagementRepository,
    private readonly paperProjects: PaperProjectGateway,
    private readonly references: TopicManagementReferenceGateway,
  ) {}

  async listTitleCards(): Promise<TitleCardListResponse> {
    const cards = await this.repository.listTitleCards();
    const hydrated = await Promise.all(cards.map((card) => this.hydrateTitleCard(card)));
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
    return this.hydrateTitleCard(created);
  }

  async getTitleCard(titleCardId: string): Promise<TitleCardDTO> {
    const titleCard = await this.assertTitleCardExists(titleCardId);
    return this.hydrateTitleCard(titleCard);
  }

  async updateTitleCard(titleCardId: string, input: UpdateTitleCardRequest): Promise<TitleCardDTO> {
    await this.assertTitleCardExists(titleCardId);
    const updated = await this.repository.updateTitleCard(titleCardId, input);
    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', `TitleCard ${titleCardId} not found.`);
    }
    return this.hydrateTitleCard(updated);
  }

  async getEvidenceBasket(titleCardId: string): Promise<TitleCardEvidenceBasketDTO> {
    await this.assertTitleCardExists(titleCardId);
    const basket = await this.repository.getEvidenceBasket(titleCardId);
    const items = await this.hydrateEvidenceBasketItems(basket.items);
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
    await this.assertTitleCardExists(titleCardId);
    const addIds = input.add_literature_ids ?? [];
    if (addIds.length > 0) {
      await this.assertLiteraturesExist(addIds);
    }
    await this.repository.updateEvidenceBasket(titleCardId, input);
    return this.getEvidenceBasket(titleCardId);
  }

  async listEvidenceCandidates(
    titleCardId: string,
    query: EvidenceCandidateQuery,
  ): Promise<EvidenceCandidateListResponse> {
    await this.assertTitleCardExists(titleCardId);
    const [basket, literatures] = await Promise.all([
      this.repository.getEvidenceBasket(titleCardId),
      this.references.listLiteratures(),
    ]);
    const selected = new Set(basket.items.map((item) => item.literature_id));
    const pipelineStates = await this.references.listPipelineStatesByLiteratureIds(literatures.map((row) => row.id));
    const pipelineStateByLiteratureId = new Map(pipelineStates.map((row) => [row.literatureId, row]));
    const items: EvidenceCandidateDTO[] = [];

    for (const literature of literatures) {
      const sources = await this.references.listSourcesByLiteratureId(literature.id);
      const provider = sources[0]?.provider ?? null;
      const selectionState = selected.has(literature.id) ? 'selected' : 'unselected';
      const pipelineReady = isPipelineReady(pipelineStateByLiteratureId.get(literature.id));

      if (query.selection_state && query.selection_state !== 'all' && query.selection_state !== selectionState) {
        continue;
      }
      if (query.pipeline_readiness === 'ready' && !pipelineReady) {
        continue;
      }
      if (query.pipeline_readiness === 'not_ready' && pipelineReady) {
        continue;
      }
      if (query.year_from !== undefined && literature.year !== null && literature.year < query.year_from) {
        continue;
      }
      if (query.year_to !== undefined && literature.year !== null && literature.year > query.year_to) {
        continue;
      }
      if (query.rights_classes?.length && !query.rights_classes.includes(literature.rightsClass)) {
        continue;
      }
      if (query.providers?.length && (!provider || !query.providers.includes(provider))) {
        continue;
      }
      if (query.tags?.length) {
        const tagSet = new Set(literature.tags.map((tag) => tag.toLowerCase()));
        const matchesTag = query.tags.some((tag) => tagSet.has(tag.toLowerCase()));
        if (!matchesTag) {
          continue;
        }
      }
      if (query.keyword?.trim()) {
        const keyword = query.keyword.trim().toLowerCase();
        const haystack = [
          literature.title,
          literature.abstractText ?? '',
          literature.keyContentDigest ?? '',
          ...literature.tags,
          ...literature.authors,
        ].join(' ').toLowerCase();
        if (!haystack.includes(keyword)) {
          continue;
        }
      }

      items.push({
        literature_id: literature.id,
        title: literature.title,
        authors: literature.authors,
        year: literature.year,
        abstract_text: literature.abstractText,
        key_content_digest: literature.keyContentDigest,
        tags: literature.tags,
        provider,
        rights_class: literature.rightsClass,
        pipeline_ready: pipelineReady,
        selection_state: selectionState,
      });
    }

    return {
      title_card_id: titleCardId,
      items,
      total: items.length,
    };
  }

  async createNeedReview(titleCardId: string, input: CreateNeedReviewRequest) {
    await this.assertTitleCardExists(titleCardId);
    if (input.literature_ids.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'NeedReview must reference at least one literature record.');
    }
    await this.assertLiteraturesExist(input.literature_ids);
    await this.assertEvidenceSelectedInBasket(titleCardId, input.literature_ids);
    return this.repository.createNeedReview(titleCardId, input);
  }

  async listNeedReviews(titleCardId: string) {
    await this.assertTitleCardExists(titleCardId);
    return this.repository.listNeedReviews(titleCardId);
  }

  async getNeedReview(titleCardId: string, needId: string) {
    await this.assertTitleCardExists(titleCardId);
    const review = await this.repository.getNeedReview(titleCardId, needId);
    if (!review) {
      throw new AppError(404, 'NOT_FOUND', `NeedReview ${needId} not found for title card ${titleCardId}.`);
    }
    return review;
  }

  async updateNeedReview(titleCardId: string, needId: string, input: UpdateNeedReviewRequest) {
    const current = await this.assertNeedReviewUsable(titleCardId, needId);
    const next = {
      ...current,
      ...input,
      literature_ids: input.literature_ids ?? current.literature_ids,
    };
    await this.assertLiteraturesExist(next.literature_ids);
    await this.assertEvidenceSelectedInBasket(titleCardId, next.literature_ids);
    const updated = await this.repository.updateNeedReview(titleCardId, needId, input);
    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', `NeedReview ${needId} not found for title card ${titleCardId}.`);
    }
    return updated;
  }

  async createResearchQuestion(titleCardId: string, input: CreateResearchQuestionRequest) {
    await this.assertTitleCardExists(titleCardId);
    const needIds = input.source_need_ids ?? [];
    const evidenceIds = input.source_evidence_review_ids ?? [];
    if (needIds.length + evidenceIds.length === 0) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'ResearchQuestion must reference at least one upstream need review or evidence review.',
      );
    }
    await Promise.all(needIds.map((needId) => this.assertNeedReviewUsable(titleCardId, needId)));
    if (evidenceIds.length > 0) {
      await this.assertEvidenceSelectedInBasket(titleCardId, evidenceIds);
    }
    return this.repository.createResearchQuestion(titleCardId, input);
  }

  async listResearchQuestions(titleCardId: string) {
    await this.assertTitleCardExists(titleCardId);
    return this.repository.listResearchQuestions(titleCardId);
  }

  async getResearchQuestion(titleCardId: string, researchQuestionId: string) {
    await this.assertTitleCardExists(titleCardId);
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
    const current = await this.assertResearchQuestionUsable(titleCardId, researchQuestionId);
    const nextNeedIds = input.source_need_ids ?? current.source_need_ids;
    const nextEvidenceIds = input.source_evidence_review_ids ?? current.source_evidence_review_ids;
    if (nextNeedIds.length + nextEvidenceIds.length === 0) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'ResearchQuestion must reference at least one upstream need review or evidence review.',
      );
    }
    await Promise.all(nextNeedIds.map((needId) => this.assertNeedReviewUsable(titleCardId, needId)));
    if (nextEvidenceIds.length > 0) {
      await this.assertEvidenceSelectedInBasket(titleCardId, nextEvidenceIds);
    }
    const updated = await this.repository.updateResearchQuestion(titleCardId, researchQuestionId, input);
    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', `ResearchQuestion ${researchQuestionId} not found for title card ${titleCardId}.`);
    }
    return updated;
  }

  async createValueAssessment(titleCardId: string, input: CreateValueAssessmentRequest) {
    await this.assertTitleCardExists(titleCardId);
    await this.assertResearchQuestionUsable(titleCardId, input.research_question_id);
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
    await this.assertTitleCardExists(titleCardId);
    return this.repository.listValueAssessments(titleCardId);
  }

  async getValueAssessment(titleCardId: string, valueAssessmentId: string) {
    await this.assertTitleCardExists(titleCardId);
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
    const current = await this.assertValueAssessmentUsable(titleCardId, valueAssessmentId);
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
    await this.assertTitleCardExists(titleCardId);
    const question = await this.assertResearchQuestionUsable(titleCardId, input.research_question_id);
    const assessment = await this.assertValueAssessmentUsable(titleCardId, input.value_assessment_id);
    if (assessment.research_question_id !== question.research_question_id) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Package must reference an existing ValueAssessment for the same research question.',
      );
    }
    await this.assertLiteraturesExist(input.selected_literature_evidence_ids);
    await this.assertEvidenceSelectedInBasket(titleCardId, input.selected_literature_evidence_ids);
    return this.repository.createPackage(titleCardId, input);
  }

  async listPackages(titleCardId: string) {
    await this.assertTitleCardExists(titleCardId);
    return this.repository.listPackages(titleCardId);
  }

  async getPackage(titleCardId: string, packageId: string) {
    await this.assertTitleCardExists(titleCardId);
    const pkg = await this.repository.getPackage(titleCardId, packageId);
    if (!pkg) {
      throw new AppError(404, 'NOT_FOUND', `Package ${packageId} not found for title card ${titleCardId}.`);
    }
    return pkg;
  }

  async updatePackage(titleCardId: string, packageId: string, input: UpdatePackageRequest) {
    const current = await this.assertPackageUsable(titleCardId, packageId);
    const nextQuestionId = input.research_question_id ?? current.research_question_id;
    const nextValueId = input.value_assessment_id ?? current.value_assessment_id;
    const nextEvidenceIds = input.selected_literature_evidence_ids ?? current.selected_literature_evidence_ids;
    const question = await this.assertResearchQuestionUsable(titleCardId, nextQuestionId);
    const assessment = await this.assertValueAssessmentUsable(titleCardId, nextValueId);
    if (assessment.research_question_id !== question.research_question_id) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Package must reference a ValueAssessment aligned with the target research question.',
      );
    }
    await this.assertLiteraturesExist(nextEvidenceIds);
    await this.assertEvidenceSelectedInBasket(titleCardId, nextEvidenceIds);
    const updated = await this.repository.updatePackage(titleCardId, packageId, input);
    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', `Package ${packageId} not found for title card ${titleCardId}.`);
    }
    return updated;
  }

  async createPromotionDecision(titleCardId: string, input: CreatePromotionDecisionRequest) {
    await this.assertTitleCardExists(titleCardId);
    return this.createValidatedPromotionDecision(titleCardId, input);
  }

  async listPromotionDecisions(titleCardId: string) {
    await this.assertTitleCardExists(titleCardId);
    return this.repository.listPromotionDecisions(titleCardId);
  }

  async getPromotionDecision(titleCardId: string, decisionId: string) {
    await this.assertTitleCardExists(titleCardId);
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
    const titleCard = await this.assertTitleCardExists(titleCardId);
    const question = await this.assertResearchQuestionUsable(titleCardId, input.research_question_id);
    const assessment = await this.assertValueAssessmentUsable(titleCardId, input.value_assessment_id);
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

    const pkg = await this.assertPackageUsable(titleCardId, input.package_id);
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
    await this.assertLiteraturesExist(pkg.selected_literature_evidence_ids);

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

  private async hydrateTitleCard(card: StoredTitleCard): Promise<TitleCardDTO> {
    const [basket, needs, questions, values, packages, decisions] = await Promise.all([
      this.repository.getEvidenceBasket(card.title_card_id),
      this.repository.listNeedReviews(card.title_card_id),
      this.repository.listResearchQuestions(card.title_card_id),
      this.repository.listValueAssessments(card.title_card_id),
      this.repository.listPackages(card.title_card_id),
      this.repository.listPromotionDecisions(card.title_card_id),
    ]);
    return {
      ...card,
      evidence_count: basket.items.length,
      need_count: needs.length,
      research_question_count: questions.length,
      value_assessment_count: values.length,
      package_count: packages.length,
      promotion_decision_count: decisions.length,
      latest_paper_id: decisions.find((decision) => decision.promoted_paper_id)?.promoted_paper_id,
    };
  }

  private async hydrateEvidenceBasketItems(
    basketItems: Array<{ literature_id: string; selected_at: string }>,
  ): Promise<TitleCardEvidenceBasketItemDTO[]> {
    const items = await Promise.all(
      basketItems.map(async (basketItem) => {
        const literatureId = basketItem.literature_id;
        const literature = await this.references.findLiteratureById(literatureId);
        if (!literature) {
          return undefined;
        }
        const sources = await this.references.listSourcesByLiteratureId(literatureId);
        const pipelineStates = await this.references.listPipelineStatesByLiteratureIds([literatureId]);
        const item: TitleCardEvidenceBasketItemDTO = {
          literature_id: literatureId,
          title: literature.title,
          authors: literature.authors,
          year: literature.year,
          tags: literature.tags,
          provider: sources[0]?.provider ?? null,
          rights_class: literature.rightsClass,
          pipeline_ready: isPipelineReady(pipelineStates[0]),
          selected_at: basketItem.selected_at,
        };
        return item;
      }),
    );

    return items.flatMap((item) => (item ? [item] : []));
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
    const question = await this.assertResearchQuestionUsable(titleCardId, input.research_question_id);
    const valueAssessment = await this.assertValueAssessmentUsable(titleCardId, input.value_assessment_id);
    if (valueAssessment.research_question_id !== question.research_question_id) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'PromotionDecision must reference a ValueAssessment belonging to the same research question.',
      );
    }

    const pkg = input.package_id ? await this.assertPackageUsable(titleCardId, input.package_id) : null;
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

  private async assertTitleCardExists(titleCardId: string): Promise<StoredTitleCard> {
    const titleCard = await this.repository.getTitleCard(titleCardId);
    if (!titleCard) {
      throw new AppError(404, 'NOT_FOUND', `TitleCard ${titleCardId} not found.`);
    }
    return titleCard;
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

  private async assertEvidenceSelectedInBasket(titleCardId: string, literatureIds: string[]) {
    const basket = await this.repository.getEvidenceBasket(titleCardId);
    const selected = new Set(basket.items.map((item) => item.literature_id));
    const missing = literatureIds.filter((literatureId) => !selected.has(literatureId));
    if (missing.length > 0) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'Referenced evidence must already be selected in the title-card evidence basket.',
        { missing_literature_ids: missing },
      );
    }
  }

  private async assertNeedReviewUsable(titleCardId: string, needId: string) {
    const review = await this.repository.getNeedReview(titleCardId, needId);
    if (!review) {
      throw new AppError(404, 'NOT_FOUND', `NeedReview ${needId} not found for title card ${titleCardId}.`);
    }
    if (!isRecordUsable(review.record_status)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `NeedReview ${needId} is ${review.record_status} and cannot be used as an upstream source.`,
      );
    }
    return review;
  }

  private async assertResearchQuestionUsable(titleCardId: string, researchQuestionId: string): Promise<ResearchQuestionDTO> {
    const question = await this.repository.getResearchQuestion(titleCardId, researchQuestionId);
    if (!question) {
      throw new AppError(404, 'NOT_FOUND', `ResearchQuestion ${researchQuestionId} not found for title card ${titleCardId}.`);
    }
    if (!isRecordUsable(question.record_status)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `ResearchQuestion ${researchQuestionId} is ${question.record_status} and cannot be used.`,
      );
    }
    return question;
  }

  private async assertValueAssessmentUsable(titleCardId: string, valueAssessmentId: string): Promise<ValueAssessmentDTO> {
    const assessment = await this.repository.getValueAssessment(titleCardId, valueAssessmentId);
    if (!assessment) {
      throw new AppError(404, 'NOT_FOUND', `ValueAssessment ${valueAssessmentId} not found for title card ${titleCardId}.`);
    }
    if (!isRecordUsable(assessment.record_status)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `ValueAssessment ${valueAssessmentId} is ${assessment.record_status} and cannot be used.`,
      );
    }
    return assessment;
  }

  private async assertPackageUsable(titleCardId: string, packageId: string): Promise<PackageDTO> {
    const pkg = await this.repository.getPackage(titleCardId, packageId);
    if (!pkg) {
      throw new AppError(404, 'NOT_FOUND', `Package ${packageId} not found for title card ${titleCardId}.`);
    }
    if (!isRecordUsable(pkg.record_status)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `Package ${packageId} is ${pkg.record_status} and cannot be used.`,
      );
    }
    return pkg;
  }
}
