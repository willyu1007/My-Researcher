import crypto from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  CreateNeedReviewRequest,
  CreatePackageRequest,
  CreatePromotionDecisionRequest,
  CreateResearchQuestionRequest,
  CreateTitleCardRequest,
  CreateValueAssessmentRequest,
  EvidenceRef,
  NeedReviewDTO,
  PackageDTO,
  PromotionDecisionDTO,
  ResearchQuestionDTO,
  TitleCardStatus,
  UpdateNeedReviewRequest,
  UpdatePackageRequest,
  UpdatePromotionDecisionRequest,
  UpdateResearchQuestionRequest,
  UpdateTitleCardEvidenceBasketRequest,
  UpdateTitleCardRequest,
  UpdateValueAssessmentRequest,
  ValueAssessmentDTO,
} from '@paper-engineering-assistant/shared/research-lifecycle/title-card-management-contracts';
import type {
  StoredEvidenceBasket,
  StoredEvidenceBasketItem,
  StoredTitleCard,
  TitleCardManagementRepository,
} from '../title-card-management.repository.js';
import {
  normalizePromotionDecisionLoopbackTarget,
  normalizeReviewRefs,
} from './title-card-management-normalizers.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

type ResearchRecordRow = {
  id: string;
  recordStatus: string;
  summary: string;
  confidence: Prisma.Decimal;
  nextActions: Prisma.JsonValue;
  evidenceRefs: Prisma.JsonValue;
  missingInformation: Prisma.JsonValue;
  blockingIssues: Prisma.JsonValue;
  payload: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
};

type NeedReviewRow = {
  id: string;
  topicId: string;
  researchRecordId: string;
  needStatement: string;
  whoNeedsIt: string;
  scenario: string;
  boundary: string | null;
  evidenceReviewRefs: Prisma.JsonValue;
  literatureIds: Prisma.JsonValue;
  unmetNeedCategory: string;
  falsificationVerdict: string;
  significanceScore: number;
  measurabilityScore: number;
  feasibilitySignal: string;
  validatedNeed: boolean;
  createdAt: Date;
  updatedAt: Date;
  researchRecord: ResearchRecordRow;
};

type QuestionRow = {
  id: string;
  topicId: string;
  researchRecordId: string;
  mainQuestion: string;
  subQuestions: Prisma.JsonValue;
  researchSlice: string;
  contributionHypothesis: string;
  sourceNeedReviewIds: Prisma.JsonValue;
  sourceEvidenceReviewIds: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  researchRecord: ResearchRecordRow;
};

type ValueAssessmentRow = {
  id: string;
  topicId: string;
  questionId: string;
  researchRecordId: string;
  strongestClaimIfSuccess: string;
  fallbackClaimIfSuccess: string | null;
  hardGates: Prisma.JsonValue;
  scoredDimensions: Prisma.JsonValue;
  riskPenalty: Prisma.JsonValue;
  reviewerObjections: Prisma.JsonValue;
  ceilingCase: string;
  baseCase: string;
  floorCase: string;
  verdict: string;
  totalScore: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
  researchRecord: ResearchRecordRow;
};

type PackageRow = {
  id: string;
  topicId: string;
  questionId: string;
  valueAssessmentId: string;
  researchRecordId: string;
  titleCandidates: Prisma.JsonValue;
  researchBackground: string;
  contributionSummary: string;
  candidateMethods: Prisma.JsonValue;
  evaluationPlan: string;
  keyRisks: Prisma.JsonValue;
  selectedLiteratureEvidenceIds: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  researchRecord: ResearchRecordRow;
};

type PromotionDecisionRow = {
  id: string;
  topicId: string;
  questionId: string;
  valueAssessmentId: string;
  packageId: string | null;
  decision: string;
  reasonSummary: string;
  targetPaperTitle: string | null;
  promotedPaperId: string | null;
  loopbackTarget: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function asStringArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asObjectArray<T>(value: Prisma.JsonValue): T[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item) => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .map((item) => item as unknown as T);
}

function asRecord(value: Prisma.JsonValue): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function numberFromDecimal(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : Number(value.toString());
}

function toStoredTitleCard(row: {
  id: string;
  workingTitle: string;
  brief: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): StoredTitleCard {
  return {
    title_card_id: row.id,
    working_title: row.workingTitle,
    brief: row.brief,
    status: row.status as TitleCardStatus,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toStoredEvidenceBasket(row: {
  id: string;
  basketUpdatedAt: Date;
  evidenceBasket: Array<{ literatureId: string; selectedAt: Date }>;
}): StoredEvidenceBasket {
  return {
    title_card_id: row.id,
    items: row.evidenceBasket.map<StoredEvidenceBasketItem>((item) => ({
      literature_id: item.literatureId,
      selected_at: item.selectedAt.toISOString(),
    })),
    updated_at: row.basketUpdatedAt.toISOString(),
  };
}

function toNeedReviewDTO(row: NeedReviewRow): NeedReviewDTO {
  return {
    need_id: row.id,
    title_card_id: row.topicId,
    record_status: row.researchRecord.recordStatus as NeedReviewDTO['record_status'],
    need_statement: row.needStatement,
    who_needs_it: row.whoNeedsIt,
    scenario: row.scenario,
    boundary: row.boundary ?? undefined,
    evidence_review_refs: normalizeReviewRefs(row.evidenceReviewRefs),
    literature_ids: asStringArray(row.literatureIds),
    unmet_need_category: row.unmetNeedCategory as NeedReviewDTO['unmet_need_category'],
    falsification_verdict: row.falsificationVerdict as NeedReviewDTO['falsification_verdict'],
    significance_score: row.significanceScore,
    measurability_score: row.measurabilityScore,
    feasibility_signal: row.feasibilitySignal as NeedReviewDTO['feasibility_signal'],
    validated_need: row.validatedNeed,
    judgement_summary: row.researchRecord.summary,
    confidence: numberFromDecimal(row.researchRecord.confidence),
    next_actions: asStringArray(row.researchRecord.nextActions),
    evidence_refs: asObjectArray<EvidenceRef>(row.researchRecord.evidenceRefs),
    missing_information: asStringArray(row.researchRecord.missingInformation),
    blocking_issues: asStringArray(row.researchRecord.blockingIssues),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toQuestionDTO(row: QuestionRow): ResearchQuestionDTO {
  return {
    research_question_id: row.id,
    title_card_id: row.topicId,
    record_status: row.researchRecord.recordStatus as ResearchQuestionDTO['record_status'],
    main_question: row.mainQuestion,
    sub_questions: asStringArray(row.subQuestions),
    research_slice: row.researchSlice,
    contribution_hypothesis: row.contributionHypothesis as ResearchQuestionDTO['contribution_hypothesis'],
    source_need_ids: asStringArray(row.sourceNeedReviewIds),
    source_literature_evidence_ids: asStringArray(row.sourceEvidenceReviewIds),
    judgement_summary: row.researchRecord.summary,
    confidence: numberFromDecimal(row.researchRecord.confidence),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toValueAssessmentDTO(row: ValueAssessmentRow): ValueAssessmentDTO {
  const payload = asRecord(row.researchRecord.payload);
  return {
    value_assessment_id: row.id,
    title_card_id: row.topicId,
    research_question_id: row.questionId,
    record_status: row.researchRecord.recordStatus as ValueAssessmentDTO['record_status'],
    strongest_claim_if_success: row.strongestClaimIfSuccess,
    fallback_claim_if_success: row.fallbackClaimIfSuccess ?? undefined,
    hard_gates: asRecord(row.hardGates) as ValueAssessmentDTO['hard_gates'],
    scored_dimensions: asRecord(row.scoredDimensions) as ValueAssessmentDTO['scored_dimensions'],
    risk_penalty: asRecord(row.riskPenalty) as ValueAssessmentDTO['risk_penalty'],
    reviewer_objections: asStringArray(row.reviewerObjections),
    ceiling_case: row.ceilingCase,
    base_case: row.baseCase,
    floor_case: row.floorCase,
    verdict: row.verdict as ValueAssessmentDTO['verdict'],
    total_score: numberFromDecimal(row.totalScore),
    judgement_summary: row.researchRecord.summary,
    confidence: numberFromDecimal(row.researchRecord.confidence),
    required_refinements: Array.isArray(payload.required_refinements)
      ? payload.required_refinements.filter((item): item is string => typeof item === 'string')
      : [],
    next_actions: asStringArray(row.researchRecord.nextActions),
    evidence_refs: asObjectArray<EvidenceRef>(row.researchRecord.evidenceRefs),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toPackageDTO(row: PackageRow): PackageDTO {
  return {
    package_id: row.id,
    title_card_id: row.topicId,
    research_question_id: row.questionId,
    value_assessment_id: row.valueAssessmentId,
    record_status: row.researchRecord.recordStatus as PackageDTO['record_status'],
    title_candidates: asStringArray(row.titleCandidates),
    research_background: row.researchBackground,
    contribution_summary: row.contributionSummary,
    candidate_methods: asStringArray(row.candidateMethods),
    evaluation_plan: row.evaluationPlan,
    key_risks: asStringArray(row.keyRisks),
    selected_literature_evidence_ids: asStringArray(row.selectedLiteratureEvidenceIds),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toPromotionDecisionDTO(row: PromotionDecisionRow): PromotionDecisionDTO {
  return {
    decision_id: row.id,
    title_card_id: row.topicId,
    research_question_id: row.questionId,
    value_assessment_id: row.valueAssessmentId,
    package_id: row.packageId ?? undefined,
    decision: row.decision as PromotionDecisionDTO['decision'],
    reason_summary: row.reasonSummary,
    target_paper_title: row.targetPaperTitle ?? undefined,
    promoted_paper_id: row.promotedPaperId ?? undefined,
    loopback_target: normalizePromotionDecisionLoopbackTarget(row.loopbackTarget),
    created_by: row.createdBy as PromotionDecisionDTO['created_by'],
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function createResearchRecordInput(input: {
  id: string;
  titleCardId: string;
  recordType: 'need_review' | 'question' | 'value_assessment' | 'topic_package';
  recordStatus: NeedReviewDTO['record_status'];
  sourceRecordIds?: string[];
  summary: string;
  confidence: number;
  nextActions?: string[];
  evidenceRefs?: EvidenceRef[];
  missingInformation?: string[];
  blockingIssues?: string[];
  payload: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}): Prisma.TopicResearchRecordUncheckedCreateInput {
  return {
    id: input.id,
    topicId: input.titleCardId,
    recordType: input.recordType,
    recordStatus: input.recordStatus,
    versionNo: 1,
    parentRecordId: null,
    supersededByRecordId: null,
    sourceRecordIds: toJsonValue(input.sourceRecordIds ?? []),
    lineage: toJsonValue({}),
    summary: input.summary,
    confidence: new Prisma.Decimal(input.confidence),
    blockingIssues: toJsonValue(input.blockingIssues ?? []),
    missingInformation: toJsonValue(input.missingInformation ?? []),
    nextActions: toJsonValue(input.nextActions ?? []),
    evidenceRefs: toJsonValue(input.evidenceRefs ?? []),
    payload: toJsonValue(input.payload),
    createdBy: 'hybrid',
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    deletedAt: null,
  };
}

function buildResearchRecordUpdate(input: {
  recordStatus: NeedReviewDTO['record_status'];
  sourceRecordIds?: string[];
  summary: string;
  confidence: number;
  nextActions?: string[];
  evidenceRefs?: EvidenceRef[];
  missingInformation?: string[];
  blockingIssues?: string[];
  payload: Record<string, unknown>;
  updatedAt: Date;
}): Prisma.TopicResearchRecordUncheckedUpdateInput {
  return {
    recordStatus: input.recordStatus,
    sourceRecordIds: toJsonValue(input.sourceRecordIds ?? []),
    summary: input.summary,
    confidence: new Prisma.Decimal(input.confidence),
    nextActions: toJsonValue(input.nextActions ?? []),
    evidenceRefs: toJsonValue(input.evidenceRefs ?? []),
    missingInformation: toJsonValue(input.missingInformation ?? []),
    blockingIssues: toJsonValue(input.blockingIssues ?? []),
    payload: toJsonValue(input.payload),
    updatedAt: input.updatedAt,
  };
}

function needPayloadFromDTO(dto: NeedReviewDTO): Record<string, unknown> {
  return {
    record_status: dto.record_status,
    need_statement: dto.need_statement,
    who_needs_it: dto.who_needs_it,
    scenario: dto.scenario,
    boundary: dto.boundary ?? null,
    evidence_review_refs: dto.evidence_review_refs,
    literature_ids: dto.literature_ids,
    unmet_need_category: dto.unmet_need_category,
    falsification_verdict: dto.falsification_verdict,
    significance_score: dto.significance_score,
    measurability_score: dto.measurability_score,
    feasibility_signal: dto.feasibility_signal,
    validated_need: dto.validated_need,
    judgement_summary: dto.judgement_summary,
    confidence: dto.confidence,
    next_actions: dto.next_actions,
    evidence_refs: dto.evidence_refs,
    missing_information: dto.missing_information ?? [],
    blocking_issues: dto.blocking_issues ?? [],
  };
}

function questionPayloadFromDTO(dto: ResearchQuestionDTO): Record<string, unknown> {
  return {
    record_status: dto.record_status,
    main_question: dto.main_question,
    sub_questions: dto.sub_questions,
    research_slice: dto.research_slice,
    contribution_hypothesis: dto.contribution_hypothesis,
    source_need_ids: dto.source_need_ids,
    source_literature_evidence_ids: dto.source_literature_evidence_ids,
    judgement_summary: dto.judgement_summary,
    confidence: dto.confidence,
  };
}

function valuePayloadFromDTO(dto: ValueAssessmentDTO): Record<string, unknown> {
  return {
    research_question_id: dto.research_question_id,
    record_status: dto.record_status,
    strongest_claim_if_success: dto.strongest_claim_if_success,
    fallback_claim_if_success: dto.fallback_claim_if_success ?? null,
    hard_gates: dto.hard_gates,
    scored_dimensions: dto.scored_dimensions,
    risk_penalty: dto.risk_penalty,
    reviewer_objections: dto.reviewer_objections,
    ceiling_case: dto.ceiling_case,
    base_case: dto.base_case,
    floor_case: dto.floor_case,
    verdict: dto.verdict,
    total_score: dto.total_score,
    judgement_summary: dto.judgement_summary,
    confidence: dto.confidence,
    required_refinements: dto.required_refinements,
    next_actions: dto.next_actions,
    evidence_refs: dto.evidence_refs,
  };
}

function packagePayloadFromDTO(dto: PackageDTO): Record<string, unknown> {
  return {
    record_status: dto.record_status,
    research_question_id: dto.research_question_id,
    value_assessment_id: dto.value_assessment_id,
    title_candidates: dto.title_candidates,
    research_background: dto.research_background,
    contribution_summary: dto.contribution_summary,
    candidate_methods: dto.candidate_methods,
    evaluation_plan: dto.evaluation_plan,
    key_risks: dto.key_risks,
    selected_literature_evidence_ids: dto.selected_literature_evidence_ids,
  };
}

export class PrismaTitleCardManagementRepository implements TitleCardManagementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listTitleCards(): Promise<StoredTitleCard[]> {
    const rows = await this.prisma.titleCard.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => toStoredTitleCard(row));
  }

  async createTitleCard(input: CreateTitleCardRequest): Promise<StoredTitleCard> {
    const now = new Date();
    const created = await this.prisma.titleCard.create({
      data: {
        id: makeId('title_card'),
        workingTitle: input.working_title,
        brief: input.brief,
        status: input.status ?? 'draft',
        basketUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    });
    return toStoredTitleCard(created);
  }

  async getTitleCard(titleCardId: string): Promise<StoredTitleCard | null> {
    const row = await this.prisma.titleCard.findUnique({
      where: { id: titleCardId },
    });
    return row ? toStoredTitleCard(row) : null;
  }

  async updateTitleCard(titleCardId: string, input: UpdateTitleCardRequest): Promise<StoredTitleCard | null> {
    const current = await this.prisma.titleCard.findUnique({
      where: { id: titleCardId },
    });
    if (!current) {
      return null;
    }
    const updated = await this.prisma.titleCard.update({
      where: { id: titleCardId },
      data: {
        ...(input.working_title !== undefined ? { workingTitle: input.working_title } : {}),
        ...(input.brief !== undefined ? { brief: input.brief } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: new Date(),
      },
    });
    return toStoredTitleCard(updated);
  }

  async getEvidenceBasket(titleCardId: string): Promise<StoredEvidenceBasket> {
    const row = await this.prisma.titleCard.findUnique({
      where: { id: titleCardId },
      include: {
        evidenceBasket: {
          orderBy: { selectedAt: 'desc' },
          select: { literatureId: true, selectedAt: true },
        },
      },
    });
    if (!row) {
      return {
        title_card_id: titleCardId,
        items: [],
        updated_at: new Date().toISOString(),
      };
    }
    return toStoredEvidenceBasket(row);
  }

  async updateEvidenceBasket(
    titleCardId: string,
    input: UpdateTitleCardEvidenceBasketRequest,
  ): Promise<StoredEvidenceBasket> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const addIds = [...new Set(input.add_literature_ids ?? [])];
      const removeIds = [...new Set(input.remove_literature_ids ?? [])];

      if (removeIds.length > 0) {
        await tx.titleCardEvidenceSelection.deleteMany({
          where: {
            titleCardId,
            literatureId: { in: removeIds },
          },
        });
      }

      const insertIds = addIds.filter((literatureId) => !removeIds.includes(literatureId));
      if (insertIds.length > 0) {
        await tx.titleCardEvidenceSelection.createMany({
          data: insertIds.map((literatureId) => ({
            titleCardId,
            literatureId,
            selectedAt: now,
          })),
          skipDuplicates: true,
        });
      }

      const card = await tx.titleCard.update({
        where: { id: titleCardId },
        data: {
          basketUpdatedAt: now,
          updatedAt: now,
        },
        include: {
          evidenceBasket: {
            orderBy: { selectedAt: 'desc' },
            select: { literatureId: true, selectedAt: true },
          },
        },
      });

      return toStoredEvidenceBasket(card);
    });
  }

  async createNeedReview(titleCardId: string, input: CreateNeedReviewRequest): Promise<NeedReviewDTO> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const needId = makeId('need');
      const researchRecordId = makeId('topic_record');
      await tx.topicResearchRecord.create({
        data: createResearchRecordInput({
          id: researchRecordId,
          titleCardId,
          recordType: 'need_review',
          recordStatus: input.record_status ?? 'completed',
          sourceRecordIds: (input.evidence_review_refs ?? []).map((item) => item.record_id),
          summary: input.judgement_summary,
          confidence: input.confidence,
          nextActions: input.next_actions,
          evidenceRefs: input.evidence_refs,
          missingInformation: input.missing_information,
          blockingIssues: input.blocking_issues,
          payload: {
            ...needPayloadFromDTO({
              need_id: needId,
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
              created_at: now.toISOString(),
              updated_at: now.toISOString(),
            }),
          },
          createdAt: now,
          updatedAt: now,
        }),
      });

      const created = await tx.topicNeedReview.create({
        data: {
          id: needId,
          topicId: titleCardId,
          researchRecordId,
          needStatement: input.need_statement,
          whoNeedsIt: input.who_needs_it,
          scenario: input.scenario,
          boundary: input.boundary ?? null,
          unmetNeedCategory: input.unmet_need_category,
          falsificationVerdict: input.falsification_verdict,
          significanceScore: input.significance_score,
          measurabilityScore: input.measurability_score,
          feasibilitySignal: input.feasibility_signal,
          validatedNeed: input.validated_need,
          evidenceReviewRefs: toJsonValue(input.evidence_review_refs ?? []),
          literatureIds: toJsonValue(input.literature_ids),
          createdAt: now,
          updatedAt: now,
        },
        include: { researchRecord: true },
      });

      await this.touchTitleCard(tx, titleCardId, now);
      return toNeedReviewDTO(created);
    });
  }

  async getNeedReview(titleCardId: string, needId: string): Promise<NeedReviewDTO | null> {
    const row = await this.prisma.topicNeedReview.findFirst({
      where: {
        id: needId,
        topicId: titleCardId,
      },
      include: { researchRecord: true },
    });
    return row ? toNeedReviewDTO(row) : null;
  }

  async listNeedReviews(titleCardId: string): Promise<NeedReviewDTO[]> {
    const rows = await this.prisma.topicNeedReview.findMany({
      where: { topicId: titleCardId },
      orderBy: { updatedAt: 'desc' },
      include: { researchRecord: true },
    });
    return rows.map((row) => toNeedReviewDTO(row));
  }

  async updateNeedReview(
    titleCardId: string,
    needId: string,
    input: UpdateNeedReviewRequest,
  ): Promise<NeedReviewDTO | null> {
    const currentRow = await this.prisma.topicNeedReview.findFirst({
      where: {
        id: needId,
        topicId: titleCardId,
      },
      include: { researchRecord: true },
    });
    if (!currentRow) {
      return null;
    }

    const current = toNeedReviewDTO(currentRow);
    const next: NeedReviewDTO = {
      ...current,
      ...input,
      evidence_review_refs: input.evidence_review_refs ?? current.evidence_review_refs,
      literature_ids: input.literature_ids ?? current.literature_ids,
      next_actions: input.next_actions ?? current.next_actions,
      evidence_refs: input.evidence_refs ?? current.evidence_refs,
      missing_information: input.missing_information ?? current.missing_information,
      blocking_issues: input.blocking_issues ?? current.blocking_issues,
      updated_at: new Date().toISOString(),
    };

    const now = new Date(next.updated_at);
    return this.prisma.$transaction(async (tx) => {
      await tx.topicResearchRecord.update({
        where: { id: currentRow.researchRecordId },
        data: buildResearchRecordUpdate({
          recordStatus: next.record_status,
          sourceRecordIds: next.evidence_review_refs.map((item) => item.record_id),
          summary: next.judgement_summary,
          confidence: next.confidence,
          nextActions: next.next_actions,
          evidenceRefs: next.evidence_refs,
          missingInformation: next.missing_information,
          blockingIssues: next.blocking_issues,
          payload: needPayloadFromDTO(next),
          updatedAt: now,
        }),
      });

      const updated = await tx.topicNeedReview.update({
        where: { id: needId },
        data: {
          needStatement: next.need_statement,
          whoNeedsIt: next.who_needs_it,
          scenario: next.scenario,
          boundary: next.boundary ?? null,
          evidenceReviewRefs: toJsonValue(next.evidence_review_refs),
          literatureIds: toJsonValue(next.literature_ids),
          unmetNeedCategory: next.unmet_need_category,
          falsificationVerdict: next.falsification_verdict,
          significanceScore: next.significance_score,
          measurabilityScore: next.measurability_score,
          feasibilitySignal: next.feasibility_signal,
          validatedNeed: next.validated_need,
          updatedAt: now,
        },
        include: { researchRecord: true },
      });

      await this.touchTitleCard(tx, titleCardId, now);
      return toNeedReviewDTO(updated);
    });
  }

  async createResearchQuestion(titleCardId: string, input: CreateResearchQuestionRequest): Promise<ResearchQuestionDTO> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const researchQuestionId = makeId('research_question');
      const researchRecordId = makeId('topic_record');
      await tx.topicResearchRecord.create({
        data: createResearchRecordInput({
          id: researchRecordId,
          titleCardId,
          recordType: 'question',
          recordStatus: input.record_status ?? 'completed',
          sourceRecordIds: [
            ...(input.source_need_ids ?? []),
            ...(input.source_literature_evidence_ids ?? []),
          ],
          summary: input.judgement_summary,
          confidence: input.confidence,
          payload: questionPayloadFromDTO({
            research_question_id: researchQuestionId,
            title_card_id: titleCardId,
            record_status: input.record_status ?? 'completed',
            main_question: input.main_question,
            sub_questions: input.sub_questions ?? [],
            research_slice: input.research_slice,
            contribution_hypothesis: input.contribution_hypothesis,
            source_need_ids: input.source_need_ids ?? [],
            source_literature_evidence_ids: input.source_literature_evidence_ids ?? [],
            judgement_summary: input.judgement_summary,
            confidence: input.confidence,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          }),
          createdAt: now,
          updatedAt: now,
        }),
      });

      const created = await tx.topicQuestion.create({
        data: {
          id: researchQuestionId,
          topicId: titleCardId,
          researchRecordId,
          mainQuestion: input.main_question,
          subQuestions: toJsonValue(input.sub_questions ?? []),
          researchSlice: input.research_slice,
          contributionHypothesis: input.contribution_hypothesis,
          sourceNeedReviewIds: toJsonValue(input.source_need_ids ?? []),
          // Physical column keeps its legacy name until the Prisma naming migration wave.
          sourceEvidenceReviewIds: toJsonValue(input.source_literature_evidence_ids ?? []),
          createdAt: now,
          updatedAt: now,
        },
        include: { researchRecord: true },
      });

      await this.touchTitleCard(tx, titleCardId, now);
      return toQuestionDTO(created);
    });
  }

  async getResearchQuestion(titleCardId: string, researchQuestionId: string): Promise<ResearchQuestionDTO | null> {
    const row = await this.prisma.topicQuestion.findFirst({
      where: {
        id: researchQuestionId,
        topicId: titleCardId,
      },
      include: { researchRecord: true },
    });
    return row ? toQuestionDTO(row) : null;
  }

  async listResearchQuestions(titleCardId: string): Promise<ResearchQuestionDTO[]> {
    const rows = await this.prisma.topicQuestion.findMany({
      where: { topicId: titleCardId },
      orderBy: { updatedAt: 'desc' },
      include: { researchRecord: true },
    });
    return rows.map((row) => toQuestionDTO(row));
  }

  async updateResearchQuestion(
    titleCardId: string,
    researchQuestionId: string,
    input: UpdateResearchQuestionRequest,
  ): Promise<ResearchQuestionDTO | null> {
    const currentRow = await this.prisma.topicQuestion.findFirst({
      where: {
        id: researchQuestionId,
        topicId: titleCardId,
      },
      include: { researchRecord: true },
    });
    if (!currentRow) {
      return null;
    }

    const current = toQuestionDTO(currentRow);
    const next: ResearchQuestionDTO = {
      ...current,
      ...input,
      sub_questions: input.sub_questions ?? current.sub_questions,
      source_need_ids: input.source_need_ids ?? current.source_need_ids,
      source_literature_evidence_ids: input.source_literature_evidence_ids ?? current.source_literature_evidence_ids,
      updated_at: new Date().toISOString(),
    };

    const now = new Date(next.updated_at);
    return this.prisma.$transaction(async (tx) => {
      await tx.topicResearchRecord.update({
        where: { id: currentRow.researchRecordId },
        data: buildResearchRecordUpdate({
          recordStatus: next.record_status,
          sourceRecordIds: [...next.source_need_ids, ...next.source_literature_evidence_ids],
          summary: next.judgement_summary,
          confidence: next.confidence,
          payload: questionPayloadFromDTO(next),
          updatedAt: now,
        }),
      });

      const updated = await tx.topicQuestion.update({
        where: { id: researchQuestionId },
        data: {
          mainQuestion: next.main_question,
          subQuestions: toJsonValue(next.sub_questions),
          researchSlice: next.research_slice,
          contributionHypothesis: next.contribution_hypothesis,
          sourceNeedReviewIds: toJsonValue(next.source_need_ids),
          sourceEvidenceReviewIds: toJsonValue(next.source_literature_evidence_ids),
          updatedAt: now,
        },
        include: { researchRecord: true },
      });

      await this.touchTitleCard(tx, titleCardId, now);
      return toQuestionDTO(updated);
    });
  }

  async createValueAssessment(
    titleCardId: string,
    input: CreateValueAssessmentRequest & { research_question_id: string },
  ): Promise<ValueAssessmentDTO> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const valueAssessmentId = makeId('value_assessment');
      const researchRecordId = makeId('topic_record');
      await tx.topicResearchRecord.create({
        data: createResearchRecordInput({
          id: researchRecordId,
          titleCardId,
          recordType: 'value_assessment',
          recordStatus: input.record_status ?? 'completed',
          sourceRecordIds: [input.research_question_id],
          summary: input.judgement_summary,
          confidence: input.confidence,
          nextActions: input.next_actions,
          evidenceRefs: input.evidence_refs,
          payload: valuePayloadFromDTO({
            value_assessment_id: valueAssessmentId,
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
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          }),
          createdAt: now,
          updatedAt: now,
        }),
      });

      const created = await tx.topicValueAssessment.create({
        data: {
          id: valueAssessmentId,
          topicId: titleCardId,
          questionId: input.research_question_id,
          researchRecordId,
          strongestClaimIfSuccess: input.strongest_claim_if_success,
          fallbackClaimIfSuccess: input.fallback_claim_if_success ?? null,
          hardGates: toJsonValue(input.hard_gates),
          scoredDimensions: toJsonValue(input.scored_dimensions),
          riskPenalty: toJsonValue(input.risk_penalty),
          reviewerObjections: toJsonValue(input.reviewer_objections ?? []),
          ceilingCase: input.ceiling_case,
          baseCase: input.base_case,
          floorCase: input.floor_case,
          verdict: input.verdict,
          totalScore: new Prisma.Decimal(input.total_score),
          createdAt: now,
          updatedAt: now,
        },
        include: { researchRecord: true },
      });

      await this.touchTitleCard(tx, titleCardId, now);
      return toValueAssessmentDTO(created);
    });
  }

  async getValueAssessment(titleCardId: string, valueAssessmentId: string): Promise<ValueAssessmentDTO | null> {
    const row = await this.prisma.topicValueAssessment.findFirst({
      where: {
        id: valueAssessmentId,
        topicId: titleCardId,
      },
      include: { researchRecord: true },
    });
    return row ? toValueAssessmentDTO(row) : null;
  }

  async listValueAssessments(titleCardId: string): Promise<ValueAssessmentDTO[]> {
    const rows = await this.prisma.topicValueAssessment.findMany({
      where: { topicId: titleCardId },
      orderBy: { updatedAt: 'desc' },
      include: { researchRecord: true },
    });
    return rows.map((row) => toValueAssessmentDTO(row));
  }

  async updateValueAssessment(
    titleCardId: string,
    valueAssessmentId: string,
    input: UpdateValueAssessmentRequest,
  ): Promise<ValueAssessmentDTO | null> {
    const currentRow = await this.prisma.topicValueAssessment.findFirst({
      where: {
        id: valueAssessmentId,
        topicId: titleCardId,
      },
      include: { researchRecord: true },
    });
    if (!currentRow) {
      return null;
    }

    const current = toValueAssessmentDTO(currentRow);
    const next: ValueAssessmentDTO = {
      ...current,
      ...input,
      research_question_id: input.research_question_id ?? current.research_question_id,
      hard_gates: input.hard_gates ?? current.hard_gates,
      scored_dimensions: input.scored_dimensions ?? current.scored_dimensions,
      risk_penalty: input.risk_penalty ?? current.risk_penalty,
      reviewer_objections: input.reviewer_objections ?? current.reviewer_objections,
      required_refinements: input.required_refinements ?? current.required_refinements,
      next_actions: input.next_actions ?? current.next_actions,
      evidence_refs: input.evidence_refs ?? current.evidence_refs,
      updated_at: new Date().toISOString(),
    };

    const now = new Date(next.updated_at);
    return this.prisma.$transaction(async (tx) => {
      await tx.topicResearchRecord.update({
        where: { id: currentRow.researchRecordId },
        data: buildResearchRecordUpdate({
          recordStatus: next.record_status,
          sourceRecordIds: [next.research_question_id],
          summary: next.judgement_summary,
          confidence: next.confidence,
          nextActions: next.next_actions,
          evidenceRefs: next.evidence_refs,
          payload: valuePayloadFromDTO(next),
          updatedAt: now,
        }),
      });

      const updated = await tx.topicValueAssessment.update({
        where: { id: valueAssessmentId },
        data: {
          questionId: next.research_question_id,
          strongestClaimIfSuccess: next.strongest_claim_if_success,
          fallbackClaimIfSuccess: next.fallback_claim_if_success ?? null,
          hardGates: toJsonValue(next.hard_gates),
          scoredDimensions: toJsonValue(next.scored_dimensions),
          riskPenalty: toJsonValue(next.risk_penalty),
          reviewerObjections: toJsonValue(next.reviewer_objections),
          ceilingCase: next.ceiling_case,
          baseCase: next.base_case,
          floorCase: next.floor_case,
          verdict: next.verdict,
          totalScore: new Prisma.Decimal(next.total_score),
          updatedAt: now,
        },
        include: { researchRecord: true },
      });

      await this.touchTitleCard(tx, titleCardId, now);
      return toValueAssessmentDTO(updated);
    });
  }

  async createPackage(titleCardId: string, input: CreatePackageRequest): Promise<PackageDTO> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const packageId = makeId('package');
      const researchRecordId = makeId('topic_record');
      await tx.topicResearchRecord.create({
        data: createResearchRecordInput({
          id: researchRecordId,
          titleCardId,
          recordType: 'topic_package',
          recordStatus: input.record_status ?? 'completed',
          sourceRecordIds: [input.research_question_id, input.value_assessment_id],
          summary: input.contribution_summary,
          confidence: 1,
          payload: packagePayloadFromDTO({
            package_id: packageId,
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
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          }),
          createdAt: now,
          updatedAt: now,
        }),
      });

      const created = await tx.topicPackage.create({
        data: {
          id: packageId,
          topicId: titleCardId,
          questionId: input.research_question_id,
          valueAssessmentId: input.value_assessment_id,
          researchRecordId,
          titleCandidates: toJsonValue(input.title_candidates),
          researchBackground: input.research_background,
          contributionSummary: input.contribution_summary,
          candidateMethods: toJsonValue(input.candidate_methods),
          evaluationPlan: input.evaluation_plan,
          keyRisks: toJsonValue(input.key_risks ?? []),
          selectedLiteratureEvidenceIds: toJsonValue(input.selected_literature_evidence_ids),
          createdAt: now,
          updatedAt: now,
        },
        include: { researchRecord: true },
      });

      await this.touchTitleCard(tx, titleCardId, now);
      return toPackageDTO(created);
    });
  }

  async getPackage(titleCardId: string, packageId: string): Promise<PackageDTO | null> {
    const row = await this.prisma.topicPackage.findFirst({
      where: {
        id: packageId,
        topicId: titleCardId,
      },
      include: { researchRecord: true },
    });
    return row ? toPackageDTO(row) : null;
  }

  async listPackages(titleCardId: string): Promise<PackageDTO[]> {
    const rows = await this.prisma.topicPackage.findMany({
      where: { topicId: titleCardId },
      orderBy: { updatedAt: 'desc' },
      include: { researchRecord: true },
    });
    return rows.map((row) => toPackageDTO(row));
  }

  async updatePackage(titleCardId: string, packageId: string, input: UpdatePackageRequest): Promise<PackageDTO | null> {
    const currentRow = await this.prisma.topicPackage.findFirst({
      where: {
        id: packageId,
        topicId: titleCardId,
      },
      include: { researchRecord: true },
    });
    if (!currentRow) {
      return null;
    }

    const current = toPackageDTO(currentRow);
    const next: PackageDTO = {
      ...current,
      ...input,
      research_question_id: input.research_question_id ?? current.research_question_id,
      value_assessment_id: input.value_assessment_id ?? current.value_assessment_id,
      title_candidates: input.title_candidates ?? current.title_candidates,
      candidate_methods: input.candidate_methods ?? current.candidate_methods,
      key_risks: input.key_risks ?? current.key_risks,
      selected_literature_evidence_ids: input.selected_literature_evidence_ids ?? current.selected_literature_evidence_ids,
      updated_at: new Date().toISOString(),
    };

    const now = new Date(next.updated_at);
    return this.prisma.$transaction(async (tx) => {
      await tx.topicResearchRecord.update({
        where: { id: currentRow.researchRecordId },
        data: buildResearchRecordUpdate({
          recordStatus: next.record_status,
          sourceRecordIds: [next.research_question_id, next.value_assessment_id],
          summary: next.contribution_summary,
          confidence: 1,
          payload: packagePayloadFromDTO(next),
          updatedAt: now,
        }),
      });

      const updated = await tx.topicPackage.update({
        where: { id: packageId },
        data: {
          questionId: next.research_question_id,
          valueAssessmentId: next.value_assessment_id,
          titleCandidates: toJsonValue(next.title_candidates),
          researchBackground: next.research_background,
          contributionSummary: next.contribution_summary,
          candidateMethods: toJsonValue(next.candidate_methods),
          evaluationPlan: next.evaluation_plan,
          keyRisks: toJsonValue(next.key_risks),
          selectedLiteratureEvidenceIds: toJsonValue(next.selected_literature_evidence_ids),
          updatedAt: now,
        },
        include: { researchRecord: true },
      });

      await this.touchTitleCard(tx, titleCardId, now);
      return toPackageDTO(updated);
    });
  }

  async createPromotionDecision(
    titleCardId: string,
    input: CreatePromotionDecisionRequest & { promoted_paper_id?: string },
  ): Promise<PromotionDecisionDTO> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.topicPromotionDecision.create({
        data: {
          id: makeId('decision'),
          topicId: titleCardId,
          questionId: input.research_question_id,
          valueAssessmentId: input.value_assessment_id,
          packageId: input.package_id ?? null,
          decision: input.decision,
          reasonSummary: input.reason_summary,
          targetPaperTitle: input.target_paper_title ?? null,
          promotedPaperId: input.promoted_paper_id ?? null,
          loopbackTarget: input.loopback_target ?? null,
          createdBy: input.created_by,
          createdAt: now,
          updatedAt: now,
        },
      });
      await this.touchTitleCard(tx, titleCardId, now);
      return toPromotionDecisionDTO(created);
    });
  }

  async getPromotionDecision(titleCardId: string, decisionId: string): Promise<PromotionDecisionDTO | null> {
    const row = await this.prisma.topicPromotionDecision.findFirst({
      where: {
        id: decisionId,
        topicId: titleCardId,
      },
    });
    return row ? toPromotionDecisionDTO(row) : null;
  }

  async listPromotionDecisions(titleCardId: string): Promise<PromotionDecisionDTO[]> {
    const rows = await this.prisma.topicPromotionDecision.findMany({
      where: { topicId: titleCardId },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => toPromotionDecisionDTO(row));
  }

  async updatePromotionDecision(
    titleCardId: string,
    decisionId: string,
    input: UpdatePromotionDecisionRequest,
  ): Promise<PromotionDecisionDTO | null> {
    const currentRow = await this.prisma.topicPromotionDecision.findFirst({
      where: {
        id: decisionId,
        topicId: titleCardId,
      },
    });
    if (!currentRow) {
      return null;
    }

    const current = toPromotionDecisionDTO(currentRow);
    const next: PromotionDecisionDTO = {
      ...current,
      ...input,
      research_question_id: input.research_question_id ?? current.research_question_id,
      value_assessment_id: input.value_assessment_id ?? current.value_assessment_id,
      package_id: input.package_id ?? current.package_id,
      decision: input.decision ?? current.decision,
      reason_summary: input.reason_summary ?? current.reason_summary,
      target_paper_title: input.target_paper_title ?? current.target_paper_title,
      loopback_target: input.loopback_target ?? current.loopback_target,
      created_by: input.created_by ?? current.created_by,
      updated_at: new Date().toISOString(),
    };

    const now = new Date(next.updated_at);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.topicPromotionDecision.update({
        where: { id: decisionId },
        data: {
          questionId: next.research_question_id,
          valueAssessmentId: next.value_assessment_id,
          packageId: next.package_id ?? null,
          decision: next.decision,
          reasonSummary: next.reason_summary,
          targetPaperTitle: next.target_paper_title ?? null,
          loopbackTarget: next.loopback_target ?? null,
          createdBy: next.created_by,
          updatedAt: now,
        },
      });
      await this.touchTitleCard(tx, titleCardId, now);
      return toPromotionDecisionDTO(updated);
    });
  }

  private async touchTitleCard(client: DbClient, titleCardId: string, now: Date): Promise<void> {
    await client.titleCard.update({
      where: { id: titleCardId },
      data: { updatedAt: now },
    });
  }
}
