import type {
  CreateNeedReviewRequest,
  CreateTopicPackageRequest,
  CreateTopicPromotionDecisionRequest,
  CreateTopicQuestionRequest,
  CreateTopicValueAssessmentRequest,
  NeedReviewDTO,
  TopicPackageDTO,
  TopicPromotionDecisionDTO,
  TopicQuestionDTO,
  TopicValueAssessmentDTO,
} from '@paper-engineering-assistant/shared';

export interface TopicManagementRepository {
  createNeedReview(topicId: string, input: CreateNeedReviewRequest): Promise<NeedReviewDTO>;
  getNeedReview(topicId: string, recordId: string): Promise<NeedReviewDTO | null>;
  listNeedReviews(topicId: string): Promise<NeedReviewDTO[]>;

  createQuestion(topicId: string, input: CreateTopicQuestionRequest): Promise<TopicQuestionDTO>;
  getQuestion(topicId: string, recordId: string): Promise<TopicQuestionDTO | null>;
  listQuestions(topicId: string): Promise<TopicQuestionDTO[]>;

  createValueAssessment(topicId: string, questionId: string, input: CreateTopicValueAssessmentRequest): Promise<TopicValueAssessmentDTO>;
  getValueAssessment(topicId: string, recordId: string): Promise<TopicValueAssessmentDTO | null>;
  getLatestValueAssessmentByQuestion(topicId: string, questionId: string): Promise<TopicValueAssessmentDTO | null>;

  createTopicPackage(topicId: string, questionId: string, valueAssessmentId: string, input: CreateTopicPackageRequest): Promise<TopicPackageDTO>;
  getTopicPackage(topicId: string, recordId: string): Promise<TopicPackageDTO | null>;

  createPromotionDecision(topicId: string, input: CreateTopicPromotionDecisionRequest & { promotedPaperId?: string }): Promise<TopicPromotionDecisionDTO>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export class InMemoryTopicManagementRepository implements TopicManagementRepository {
  private needReviews = new Map<string, NeedReviewDTO>();
  private questions = new Map<string, TopicQuestionDTO>();
  private valueAssessments = new Map<string, TopicValueAssessmentDTO>();
  private packages = new Map<string, TopicPackageDTO>();
  private decisions = new Map<string, TopicPromotionDecisionDTO>();

  async createNeedReview(topicId: string, input: CreateNeedReviewRequest): Promise<NeedReviewDTO> {
    const timestamp = nowIso();
    const dto: NeedReviewDTO = {
      record_id: makeId('need'),
      topic_id: topicId,
      record_status: input.record_status ?? 'completed',
      need_statement: input.need_statement,
      who_needs_it: input.who_needs_it,
      scenario: input.scenario,
      boundary: input.boundary,
      evidence_review_refs: input.evidence_review_refs,
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
    this.needReviews.set(dto.record_id, dto);
    return dto;
  }

  async getNeedReview(topicId: string, recordId: string): Promise<NeedReviewDTO | null> {
    const dto = this.needReviews.get(recordId) ?? null;
    return dto?.topic_id === topicId ? dto : null;
  }

  async listNeedReviews(topicId: string): Promise<NeedReviewDTO[]> {
    return [...this.needReviews.values()].filter((x) => x.topic_id === topicId);
  }

  async createQuestion(topicId: string, input: CreateTopicQuestionRequest): Promise<TopicQuestionDTO> {
    const timestamp = nowIso();
    const dto: TopicQuestionDTO = {
      record_id: makeId('question'),
      topic_id: topicId,
      record_status: input.record_status ?? 'completed',
      main_question: input.main_question,
      sub_questions: input.sub_questions ?? [],
      research_slice: input.research_slice,
      contribution_hypothesis: input.contribution_hypothesis,
      source_need_review_ids: input.source_need_review_ids ?? [],
      source_evidence_review_ids: input.source_evidence_review_ids ?? [],
      judgement_summary: input.judgement_summary,
      confidence: input.confidence,
      created_at: timestamp,
      updated_at: timestamp,
    };
    this.questions.set(dto.record_id, dto);
    return dto;
  }

  async getQuestion(topicId: string, recordId: string): Promise<TopicQuestionDTO | null> {
    const dto = this.questions.get(recordId) ?? null;
    return dto?.topic_id === topicId ? dto : null;
  }

  async listQuestions(topicId: string): Promise<TopicQuestionDTO[]> {
    return [...this.questions.values()].filter((x) => x.topic_id === topicId);
  }

  async createValueAssessment(topicId: string, questionId: string, input: CreateTopicValueAssessmentRequest): Promise<TopicValueAssessmentDTO> {
    const timestamp = nowIso();
    const dto: TopicValueAssessmentDTO = {
      record_id: makeId('value'),
      topic_id: topicId,
      question_id: questionId,
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
    this.valueAssessments.set(dto.record_id, dto);
    return dto;
  }

  async getValueAssessment(topicId: string, recordId: string): Promise<TopicValueAssessmentDTO | null> {
    const dto = this.valueAssessments.get(recordId) ?? null;
    return dto?.topic_id === topicId ? dto : null;
  }

  async getLatestValueAssessmentByQuestion(topicId: string, questionId: string): Promise<TopicValueAssessmentDTO | null> {
    const all = [...this.valueAssessments.values()]
      .filter((x) => x.topic_id === topicId && x.question_id === questionId)
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
    return all[0] ?? null;
  }

  async createTopicPackage(topicId: string, questionId: string, valueAssessmentId: string, input: CreateTopicPackageRequest): Promise<TopicPackageDTO> {
    const timestamp = nowIso();
    const dto: TopicPackageDTO = {
      record_id: makeId('package'),
      topic_id: topicId,
      question_id: questionId,
      value_assessment_id: valueAssessmentId,
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
    this.packages.set(dto.record_id, dto);
    return dto;
  }

  async getTopicPackage(topicId: string, recordId: string): Promise<TopicPackageDTO | null> {
    const dto = this.packages.get(recordId) ?? null;
    return dto?.topic_id === topicId ? dto : null;
  }

  async createPromotionDecision(topicId: string, input: CreateTopicPromotionDecisionRequest & { promotedPaperId?: string }): Promise<TopicPromotionDecisionDTO> {
    const dto: TopicPromotionDecisionDTO = {
      decision_id: makeId('decision'),
      topic_id: topicId,
      question_id: input.question_id,
      value_assessment_id: input.value_assessment_id,
      package_id: input.package_id,
      decision: input.decision,
      reason_summary: input.reason_summary,
      target_paper_title: input.target_paper_title,
      promoted_paper_id: input.promotedPaperId,
      loopback_target: input.loopback_target,
      created_by: input.created_by,
      created_at: nowIso(),
    };
    this.decisions.set(dto.decision_id, dto);
    return dto;
  }
}

export class PrismaTopicManagementRepository implements TopicManagementRepository {
  constructor(private readonly _prisma: { [key: string]: unknown }) {
    void this._prisma; // reserved for future Prisma implementation
  }

  async createNeedReview(_topicId: string, _input: CreateNeedReviewRequest): Promise<NeedReviewDTO> {
    throw new Error('TODO: implement Prisma persistence for createNeedReview');
  }
  async getNeedReview(_topicId: string, _recordId: string): Promise<NeedReviewDTO | null> {
    throw new Error('TODO: implement Prisma persistence for getNeedReview');
  }
  async listNeedReviews(_topicId: string): Promise<NeedReviewDTO[]> {
    throw new Error('TODO: implement Prisma persistence for listNeedReviews');
  }
  async createQuestion(_topicId: string, _input: CreateTopicQuestionRequest): Promise<TopicQuestionDTO> {
    throw new Error('TODO: implement Prisma persistence for createQuestion');
  }
  async getQuestion(_topicId: string, _recordId: string): Promise<TopicQuestionDTO | null> {
    throw new Error('TODO: implement Prisma persistence for getQuestion');
  }
  async listQuestions(_topicId: string): Promise<TopicQuestionDTO[]> {
    throw new Error('TODO: implement Prisma persistence for listQuestions');
  }
  async createValueAssessment(_topicId: string, _questionId: string, _input: CreateTopicValueAssessmentRequest): Promise<TopicValueAssessmentDTO> {
    throw new Error('TODO: implement Prisma persistence for createValueAssessment');
  }
  async getValueAssessment(_topicId: string, _recordId: string): Promise<TopicValueAssessmentDTO | null> {
    throw new Error('TODO: implement Prisma persistence for getValueAssessment');
  }
  async getLatestValueAssessmentByQuestion(_topicId: string, _questionId: string): Promise<TopicValueAssessmentDTO | null> {
    throw new Error('TODO: implement Prisma persistence for getLatestValueAssessmentByQuestion');
  }
  async createTopicPackage(_topicId: string, _questionId: string, _valueAssessmentId: string, _input: CreateTopicPackageRequest): Promise<TopicPackageDTO> {
    throw new Error('TODO: implement Prisma persistence for createTopicPackage');
  }
  async getTopicPackage(_topicId: string, _recordId: string): Promise<TopicPackageDTO | null> {
    throw new Error('TODO: implement Prisma persistence for getTopicPackage');
  }
  async createPromotionDecision(_topicId: string, _input: CreateTopicPromotionDecisionRequest & { promotedPaperId?: string }): Promise<TopicPromotionDecisionDTO> {
    throw new Error('TODO: implement Prisma persistence for createPromotionDecision');
  }
}
