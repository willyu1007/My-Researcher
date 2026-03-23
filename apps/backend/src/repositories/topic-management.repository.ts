import type {
  CreateNeedReviewRequest,
  CreatePackageRequest,
  CreatePromotionDecisionRequest,
  CreateResearchQuestionRequest,
  CreateTitleCardRequest,
  CreateValueAssessmentRequest,
  NeedReviewDTO,
  PackageDTO,
  PromotionDecisionDTO,
  ResearchQuestionDTO,
  TitleCardDTO,
  TitleCardEvidenceBasketItemDTO,
  TitleCardStatus,
  UpdateNeedReviewRequest,
  UpdatePackageRequest,
  UpdatePromotionDecisionRequest,
  UpdateResearchQuestionRequest,
  UpdateTitleCardEvidenceBasketRequest,
  UpdateTitleCardRequest,
  UpdateValueAssessmentRequest,
  ValueAssessmentDTO,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-management-contracts';

export type StoredTitleCard = Pick<
  TitleCardDTO,
  'title_card_id' | 'working_title' | 'brief' | 'status' | 'created_at' | 'updated_at'
>;

export type StoredEvidenceBasketItem = Pick<TitleCardEvidenceBasketItemDTO, 'literature_id' | 'selected_at'>;

export type StoredEvidenceBasket = {
  title_card_id: string;
  items: StoredEvidenceBasketItem[];
  updated_at: string;
};

export interface TopicManagementRepository {
  listTitleCards(): Promise<StoredTitleCard[]>;
  createTitleCard(input: CreateTitleCardRequest): Promise<StoredTitleCard>;
  getTitleCard(titleCardId: string): Promise<StoredTitleCard | null>;
  updateTitleCard(titleCardId: string, input: UpdateTitleCardRequest): Promise<StoredTitleCard | null>;

  getEvidenceBasket(titleCardId: string): Promise<StoredEvidenceBasket>;
  updateEvidenceBasket(
    titleCardId: string,
    input: UpdateTitleCardEvidenceBasketRequest,
  ): Promise<StoredEvidenceBasket>;

  createNeedReview(titleCardId: string, input: CreateNeedReviewRequest): Promise<NeedReviewDTO>;
  getNeedReview(titleCardId: string, needId: string): Promise<NeedReviewDTO | null>;
  listNeedReviews(titleCardId: string): Promise<NeedReviewDTO[]>;
  updateNeedReview(titleCardId: string, needId: string, input: UpdateNeedReviewRequest): Promise<NeedReviewDTO | null>;

  createResearchQuestion(titleCardId: string, input: CreateResearchQuestionRequest): Promise<ResearchQuestionDTO>;
  getResearchQuestion(titleCardId: string, researchQuestionId: string): Promise<ResearchQuestionDTO | null>;
  listResearchQuestions(titleCardId: string): Promise<ResearchQuestionDTO[]>;
  updateResearchQuestion(
    titleCardId: string,
    researchQuestionId: string,
    input: UpdateResearchQuestionRequest,
  ): Promise<ResearchQuestionDTO | null>;

  createValueAssessment(titleCardId: string, input: CreateValueAssessmentRequest & { research_question_id: string }): Promise<ValueAssessmentDTO>;
  getValueAssessment(titleCardId: string, valueAssessmentId: string): Promise<ValueAssessmentDTO | null>;
  listValueAssessments(titleCardId: string): Promise<ValueAssessmentDTO[]>;
  updateValueAssessment(
    titleCardId: string,
    valueAssessmentId: string,
    input: UpdateValueAssessmentRequest,
  ): Promise<ValueAssessmentDTO | null>;

  createPackage(titleCardId: string, input: CreatePackageRequest): Promise<PackageDTO>;
  getPackage(titleCardId: string, packageId: string): Promise<PackageDTO | null>;
  listPackages(titleCardId: string): Promise<PackageDTO[]>;
  updatePackage(titleCardId: string, packageId: string, input: UpdatePackageRequest): Promise<PackageDTO | null>;

  createPromotionDecision(
    titleCardId: string,
    input: CreatePromotionDecisionRequest & { promoted_paper_id?: string },
  ): Promise<PromotionDecisionDTO>;
  getPromotionDecision(titleCardId: string, decisionId: string): Promise<PromotionDecisionDTO | null>;
  listPromotionDecisions(titleCardId: string): Promise<PromotionDecisionDTO[]>;
  updatePromotionDecision(
    titleCardId: string,
    decisionId: string,
    input: UpdatePromotionDecisionRequest,
  ): Promise<PromotionDecisionDTO | null>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function mergeStringArray(current: string[], add: string[] = [], remove: string[] = []): string[] {
  const next = new Set(current);
  add.forEach((value) => next.add(value));
  remove.forEach((value) => next.delete(value));
  return [...next];
}

export class InMemoryTopicManagementRepository implements TopicManagementRepository {
  private readonly titleCards = new Map<string, StoredTitleCard>();
  private readonly evidenceBaskets = new Map<string, StoredEvidenceBasket>();
  private readonly needReviews = new Map<string, NeedReviewDTO>();
  private readonly researchQuestions = new Map<string, ResearchQuestionDTO>();
  private readonly valueAssessments = new Map<string, ValueAssessmentDTO>();
  private readonly packages = new Map<string, PackageDTO>();
  private readonly promotionDecisions = new Map<string, PromotionDecisionDTO>();

  async listTitleCards(): Promise<StoredTitleCard[]> {
    return [...this.titleCards.values()].sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  }

  async createTitleCard(input: CreateTitleCardRequest): Promise<StoredTitleCard> {
    const timestamp = nowIso();
    const dto: StoredTitleCard = {
      title_card_id: makeId('title_card'),
      working_title: input.working_title,
      brief: input.brief,
      status: input.status ?? 'draft',
      created_at: timestamp,
      updated_at: timestamp,
    };
    this.titleCards.set(dto.title_card_id, dto);
    this.evidenceBaskets.set(dto.title_card_id, {
      title_card_id: dto.title_card_id,
      items: [],
      updated_at: timestamp,
    });
    return dto;
  }

  async getTitleCard(titleCardId: string): Promise<StoredTitleCard | null> {
    return this.titleCards.get(titleCardId) ?? null;
  }

  async updateTitleCard(titleCardId: string, input: UpdateTitleCardRequest): Promise<StoredTitleCard | null> {
    const current = this.titleCards.get(titleCardId);
    if (!current) {
      return null;
    }
    const next: StoredTitleCard = {
      ...current,
      working_title: input.working_title ?? current.working_title,
      brief: input.brief ?? current.brief,
      status: (input.status ?? current.status) as TitleCardStatus,
      updated_at: nowIso(),
    };
    this.titleCards.set(titleCardId, next);
    return next;
  }

  async getEvidenceBasket(titleCardId: string): Promise<StoredEvidenceBasket> {
    const current = this.evidenceBaskets.get(titleCardId);
    if (current) {
      return current;
    }
    const empty: StoredEvidenceBasket = {
      title_card_id: titleCardId,
      items: [],
      updated_at: nowIso(),
    };
    this.evidenceBaskets.set(titleCardId, empty);
    return empty;
  }

  async updateEvidenceBasket(
    titleCardId: string,
    input: UpdateTitleCardEvidenceBasketRequest,
  ): Promise<StoredEvidenceBasket> {
    const current = await this.getEvidenceBasket(titleCardId);
    const currentLiteratureIds = current.items.map((item) => item.literature_id);
    const nextLiteratureIds = mergeStringArray(
      currentLiteratureIds,
      input.add_literature_ids,
      input.remove_literature_ids,
    );
    const selectedAtByLiteratureId = new Map(current.items.map((item) => [item.literature_id, item.selected_at]));
    const timestamp = nowIso();
    const next: StoredEvidenceBasket = {
      title_card_id: titleCardId,
      items: nextLiteratureIds.map((literatureId) => ({
        literature_id: literatureId,
        selected_at: selectedAtByLiteratureId.get(literatureId) ?? timestamp,
      })),
      updated_at: timestamp,
    };
    this.evidenceBaskets.set(titleCardId, next);
    return next;
  }

  async createNeedReview(titleCardId: string, input: CreateNeedReviewRequest): Promise<NeedReviewDTO> {
    const timestamp = nowIso();
    const dto: NeedReviewDTO = {
      need_id: makeId('need'),
      title_card_id: titleCardId,
      record_status: input.record_status ?? 'completed',
      need_statement: input.need_statement,
      who_needs_it: input.who_needs_it,
      scenario: input.scenario,
      boundary: input.boundary,
      evidence_review_refs: input.evidence_review_refs ?? [],
      literature_ids: input.literature_ids,
      unmet_need_category: input.unmet_need_category,
      falsification_verdict: input.falsification_verdict,
      significance_score: input.significance_score,
      measurability_score: input.measurability_score,
      feasibility_signal: input.feasibility_signal,
      validated_need: input.validated_need,
      judgement_summary: input.judgement_summary,
      confidence: input.confidence,
      next_actions: input.next_actions ?? [],
      evidence_refs: input.evidence_refs,
      missing_information: input.missing_information ?? [],
      blocking_issues: input.blocking_issues ?? [],
      created_at: timestamp,
      updated_at: timestamp,
    };
    this.needReviews.set(dto.need_id, dto);
    return dto;
  }

  async getNeedReview(titleCardId: string, needId: string): Promise<NeedReviewDTO | null> {
    const dto = this.needReviews.get(needId) ?? null;
    return dto?.title_card_id === titleCardId ? dto : null;
  }

  async listNeedReviews(titleCardId: string): Promise<NeedReviewDTO[]> {
    return [...this.needReviews.values()]
      .filter((row) => row.title_card_id === titleCardId)
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  }

  async updateNeedReview(
    titleCardId: string,
    needId: string,
    input: UpdateNeedReviewRequest,
  ): Promise<NeedReviewDTO | null> {
    const current = await this.getNeedReview(titleCardId, needId);
    if (!current) {
      return null;
    }
    const next: NeedReviewDTO = {
      ...current,
      ...input,
      evidence_review_refs: input.evidence_review_refs ?? current.evidence_review_refs,
      literature_ids: input.literature_ids ?? current.literature_ids,
      next_actions: input.next_actions ?? current.next_actions,
      evidence_refs: input.evidence_refs ?? current.evidence_refs,
      missing_information: input.missing_information ?? current.missing_information,
      blocking_issues: input.blocking_issues ?? current.blocking_issues,
      updated_at: nowIso(),
    };
    this.needReviews.set(needId, next);
    return next;
  }

  async createResearchQuestion(titleCardId: string, input: CreateResearchQuestionRequest): Promise<ResearchQuestionDTO> {
    const timestamp = nowIso();
    const dto: ResearchQuestionDTO = {
      research_question_id: makeId('research_question'),
      title_card_id: titleCardId,
      record_status: input.record_status ?? 'completed',
      main_question: input.main_question,
      sub_questions: input.sub_questions ?? [],
      research_slice: input.research_slice,
      contribution_hypothesis: input.contribution_hypothesis,
      source_need_ids: input.source_need_ids ?? [],
      source_evidence_review_ids: input.source_evidence_review_ids ?? [],
      judgement_summary: input.judgement_summary,
      confidence: input.confidence,
      created_at: timestamp,
      updated_at: timestamp,
    };
    this.researchQuestions.set(dto.research_question_id, dto);
    return dto;
  }

  async getResearchQuestion(titleCardId: string, researchQuestionId: string): Promise<ResearchQuestionDTO | null> {
    const dto = this.researchQuestions.get(researchQuestionId) ?? null;
    return dto?.title_card_id === titleCardId ? dto : null;
  }

  async listResearchQuestions(titleCardId: string): Promise<ResearchQuestionDTO[]> {
    return [...this.researchQuestions.values()]
      .filter((row) => row.title_card_id === titleCardId)
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  }

  async updateResearchQuestion(
    titleCardId: string,
    researchQuestionId: string,
    input: UpdateResearchQuestionRequest,
  ): Promise<ResearchQuestionDTO | null> {
    const current = await this.getResearchQuestion(titleCardId, researchQuestionId);
    if (!current) {
      return null;
    }
    const next: ResearchQuestionDTO = {
      ...current,
      ...input,
      sub_questions: input.sub_questions ?? current.sub_questions,
      source_need_ids: input.source_need_ids ?? current.source_need_ids,
      source_evidence_review_ids: input.source_evidence_review_ids ?? current.source_evidence_review_ids,
      updated_at: nowIso(),
    };
    this.researchQuestions.set(researchQuestionId, next);
    return next;
  }

  async createValueAssessment(
    titleCardId: string,
    input: CreateValueAssessmentRequest & { research_question_id: string },
  ): Promise<ValueAssessmentDTO> {
    const timestamp = nowIso();
    const dto: ValueAssessmentDTO = {
      value_assessment_id: makeId('value_assessment'),
      title_card_id: titleCardId,
      research_question_id: input.research_question_id,
      record_status: input.record_status ?? 'completed',
      strongest_claim_if_success: input.strongest_claim_if_success,
      fallback_claim_if_success: input.fallback_claim_if_success,
      hard_gates: input.hard_gates,
      scored_dimensions: input.scored_dimensions,
      risk_penalty: input.risk_penalty,
      reviewer_objections: input.reviewer_objections ?? [],
      ceiling_case: input.ceiling_case,
      base_case: input.base_case,
      floor_case: input.floor_case,
      verdict: input.verdict,
      total_score: input.total_score,
      judgement_summary: input.judgement_summary,
      confidence: input.confidence,
      required_refinements: input.required_refinements ?? [],
      next_actions: input.next_actions ?? [],
      evidence_refs: input.evidence_refs,
      created_at: timestamp,
      updated_at: timestamp,
    };
    this.valueAssessments.set(dto.value_assessment_id, dto);
    return dto;
  }

  async getValueAssessment(titleCardId: string, valueAssessmentId: string): Promise<ValueAssessmentDTO | null> {
    const dto = this.valueAssessments.get(valueAssessmentId) ?? null;
    return dto?.title_card_id === titleCardId ? dto : null;
  }

  async listValueAssessments(titleCardId: string): Promise<ValueAssessmentDTO[]> {
    return [...this.valueAssessments.values()]
      .filter((row) => row.title_card_id === titleCardId)
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  }

  async updateValueAssessment(
    titleCardId: string,
    valueAssessmentId: string,
    input: UpdateValueAssessmentRequest,
  ): Promise<ValueAssessmentDTO | null> {
    const current = await this.getValueAssessment(titleCardId, valueAssessmentId);
    if (!current) {
      return null;
    }
    const next: ValueAssessmentDTO = {
      ...current,
      ...input,
      hard_gates: input.hard_gates ?? current.hard_gates,
      scored_dimensions: input.scored_dimensions ?? current.scored_dimensions,
      risk_penalty: input.risk_penalty ?? current.risk_penalty,
      reviewer_objections: input.reviewer_objections ?? current.reviewer_objections,
      required_refinements: input.required_refinements ?? current.required_refinements,
      next_actions: input.next_actions ?? current.next_actions,
      evidence_refs: input.evidence_refs ?? current.evidence_refs,
      updated_at: nowIso(),
    };
    this.valueAssessments.set(valueAssessmentId, next);
    return next;
  }

  async createPackage(titleCardId: string, input: CreatePackageRequest): Promise<PackageDTO> {
    const timestamp = nowIso();
    const dto: PackageDTO = {
      package_id: makeId('package'),
      title_card_id: titleCardId,
      research_question_id: input.research_question_id,
      value_assessment_id: input.value_assessment_id,
      record_status: input.record_status ?? 'completed',
      title_candidates: input.title_candidates,
      research_background: input.research_background,
      contribution_summary: input.contribution_summary,
      candidate_methods: input.candidate_methods,
      evaluation_plan: input.evaluation_plan,
      key_risks: input.key_risks ?? [],
      selected_literature_evidence_ids: input.selected_literature_evidence_ids,
      created_at: timestamp,
      updated_at: timestamp,
    };
    this.packages.set(dto.package_id, dto);
    return dto;
  }

  async getPackage(titleCardId: string, packageId: string): Promise<PackageDTO | null> {
    const dto = this.packages.get(packageId) ?? null;
    return dto?.title_card_id === titleCardId ? dto : null;
  }

  async listPackages(titleCardId: string): Promise<PackageDTO[]> {
    return [...this.packages.values()]
      .filter((row) => row.title_card_id === titleCardId)
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  }

  async updatePackage(titleCardId: string, packageId: string, input: UpdatePackageRequest): Promise<PackageDTO | null> {
    const current = await this.getPackage(titleCardId, packageId);
    if (!current) {
      return null;
    }
    const next: PackageDTO = {
      ...current,
      ...input,
      research_question_id: input.research_question_id ?? current.research_question_id,
      value_assessment_id: input.value_assessment_id ?? current.value_assessment_id,
      title_candidates: input.title_candidates ?? current.title_candidates,
      candidate_methods: input.candidate_methods ?? current.candidate_methods,
      key_risks: input.key_risks ?? current.key_risks,
      selected_literature_evidence_ids: input.selected_literature_evidence_ids ?? current.selected_literature_evidence_ids,
      updated_at: nowIso(),
    };
    this.packages.set(packageId, next);
    return next;
  }

  async createPromotionDecision(
    titleCardId: string,
    input: CreatePromotionDecisionRequest & { promoted_paper_id?: string },
  ): Promise<PromotionDecisionDTO> {
    const timestamp = nowIso();
    const dto: PromotionDecisionDTO = {
      decision_id: makeId('decision'),
      title_card_id: titleCardId,
      research_question_id: input.research_question_id,
      value_assessment_id: input.value_assessment_id,
      package_id: input.package_id,
      decision: input.decision,
      reason_summary: input.reason_summary,
      target_paper_title: input.target_paper_title,
      promoted_paper_id: input.promoted_paper_id,
      loopback_target: input.loopback_target,
      created_by: input.created_by,
      created_at: timestamp,
      updated_at: timestamp,
    };
    this.promotionDecisions.set(dto.decision_id, dto);
    return dto;
  }

  async getPromotionDecision(titleCardId: string, decisionId: string): Promise<PromotionDecisionDTO | null> {
    const dto = this.promotionDecisions.get(decisionId) ?? null;
    return dto?.title_card_id === titleCardId ? dto : null;
  }

  async listPromotionDecisions(titleCardId: string): Promise<PromotionDecisionDTO[]> {
    return [...this.promotionDecisions.values()]
      .filter((row) => row.title_card_id === titleCardId)
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  }

  async updatePromotionDecision(
    titleCardId: string,
    decisionId: string,
    input: UpdatePromotionDecisionRequest,
  ): Promise<PromotionDecisionDTO | null> {
    const current = await this.getPromotionDecision(titleCardId, decisionId);
    if (!current) {
      return null;
    }
    const next: PromotionDecisionDTO = {
      ...current,
      ...input,
      research_question_id: input.research_question_id ?? current.research_question_id,
      value_assessment_id: input.value_assessment_id ?? current.value_assessment_id,
      created_by: input.created_by ?? current.created_by,
      updated_at: nowIso(),
    };
    this.promotionDecisions.set(decisionId, next);
    return next;
  }
}
