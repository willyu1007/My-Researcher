import crypto from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  CreateNeedReviewRequest,
  CreateTopicPackageRequest,
  CreateTopicPromotionDecisionRequest,
  CreateTopicQuestionRequest,
  CreateTopicValueAssessmentRequest,
  EvidenceRef,
  NeedReviewDTO,
  ReviewRef,
  TopicPackageDTO,
  TopicPromotionDecisionDTO,
  TopicQuestionDTO,
  TopicValueAssessmentDTO,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-management-contracts';
import type { TopicManagementRepository } from '../topic-management.repository.js';

type ResearchRecordRow = {
  recordStatus: string;
  summary: string;
  confidence: Prisma.Decimal;
  nextActions: Prisma.JsonValue;
  evidenceRefs: Prisma.JsonValue;
  missingInformation: Prisma.JsonValue;
  blockingIssues: Prisma.JsonValue;
  payload: Prisma.JsonValue;
};

type NeedReviewRow = {
  id: string;
  topicId: string;
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
  const objects = value.filter((item) => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
  return objects.map((item) => item as unknown as T);
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

function createResearchRecordInput(input: {
  id: string;
  topicId: string;
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
    topicId: input.topicId,
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

function toNeedReviewDTO(row: NeedReviewRow): NeedReviewDTO {
  return {
    record_id: row.id,
    topic_id: row.topicId,
    record_status: row.researchRecord.recordStatus as NeedReviewDTO['record_status'],
    need_statement: row.needStatement,
    who_needs_it: row.whoNeedsIt,
    scenario: row.scenario,
    boundary: row.boundary ?? undefined,
    evidence_review_refs: asObjectArray<ReviewRef>(row.evidenceReviewRefs),
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

function toQuestionDTO(row: QuestionRow): TopicQuestionDTO {
  return {
    record_id: row.id,
    topic_id: row.topicId,
    record_status: row.researchRecord.recordStatus as TopicQuestionDTO['record_status'],
    main_question: row.mainQuestion,
    sub_questions: asStringArray(row.subQuestions),
    research_slice: row.researchSlice,
    contribution_hypothesis: row.contributionHypothesis as TopicQuestionDTO['contribution_hypothesis'],
    source_need_review_ids: asStringArray(row.sourceNeedReviewIds),
    source_evidence_review_ids: asStringArray(row.sourceEvidenceReviewIds),
    judgement_summary: row.researchRecord.summary,
    confidence: numberFromDecimal(row.researchRecord.confidence),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toValueAssessmentDTO(row: ValueAssessmentRow): TopicValueAssessmentDTO {
  const payload = asRecord(row.researchRecord.payload);
  return {
    record_id: row.id,
    topic_id: row.topicId,
    question_id: row.questionId,
    record_status: row.researchRecord.recordStatus as TopicValueAssessmentDTO['record_status'],
    strongest_claim_if_success: row.strongestClaimIfSuccess,
    fallback_claim_if_success: row.fallbackClaimIfSuccess ?? undefined,
    hard_gates: asRecord(row.hardGates) as TopicValueAssessmentDTO['hard_gates'],
    scored_dimensions: asRecord(row.scoredDimensions) as TopicValueAssessmentDTO['scored_dimensions'],
    risk_penalty: asRecord(row.riskPenalty) as TopicValueAssessmentDTO['risk_penalty'],
    reviewer_objections: asStringArray(row.reviewerObjections),
    ceiling_case: row.ceilingCase,
    base_case: row.baseCase,
    floor_case: row.floorCase,
    verdict: row.verdict as TopicValueAssessmentDTO['verdict'],
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

function toTopicPackageDTO(row: PackageRow): TopicPackageDTO {
  return {
    record_id: row.id,
    topic_id: row.topicId,
    question_id: row.questionId,
    value_assessment_id: row.valueAssessmentId,
    record_status: row.researchRecord.recordStatus as TopicPackageDTO['record_status'],
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

function toPromotionDecisionDTO(row: {
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
}): TopicPromotionDecisionDTO {
  return {
    decision_id: row.id,
    topic_id: row.topicId,
    question_id: row.questionId,
    value_assessment_id: row.valueAssessmentId,
    package_id: row.packageId ?? undefined,
    decision: row.decision as TopicPromotionDecisionDTO['decision'],
    reason_summary: row.reasonSummary,
    target_paper_title: row.targetPaperTitle ?? undefined,
    promoted_paper_id: row.promotedPaperId ?? undefined,
    loopback_target: row.loopbackTarget as TopicPromotionDecisionDTO['loopback_target'],
    created_by: row.createdBy as TopicPromotionDecisionDTO['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

export class PrismaTopicManagementRepository implements TopicManagementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createNeedReview(topicId: string, input: CreateNeedReviewRequest): Promise<NeedReviewDTO> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const researchRecordId = makeId('topic_record');
      await tx.topicResearchRecord.create({
        data: createResearchRecordInput({
          id: researchRecordId,
          topicId,
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
            ...input,
            evidence_review_refs: input.evidence_review_refs ?? [],
            next_actions: input.next_actions ?? [],
            missing_information: input.missing_information ?? [],
            blocking_issues: input.blocking_issues ?? [],
          },
          createdAt: now,
          updatedAt: now,
        }),
      });

      const created = await tx.topicNeedReview.create({
        data: {
          id: makeId('need'),
          topicId,
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
        include: {
          researchRecord: true,
        },
      });

      return toNeedReviewDTO(created);
    });
  }

  async getNeedReview(topicId: string, recordId: string): Promise<NeedReviewDTO | null> {
    const row = await this.prisma.topicNeedReview.findFirst({
      where: {
        id: recordId,
        topicId,
      },
      include: {
        researchRecord: true,
      },
    });
    return row ? toNeedReviewDTO(row) : null;
  }

  async listNeedReviews(topicId: string): Promise<NeedReviewDTO[]> {
    const rows = await this.prisma.topicNeedReview.findMany({
      where: { topicId },
      orderBy: { updatedAt: 'desc' },
      include: { researchRecord: true },
    });
    return rows.map((row) => toNeedReviewDTO(row));
  }

  async createQuestion(topicId: string, input: CreateTopicQuestionRequest): Promise<TopicQuestionDTO> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const researchRecordId = makeId('topic_record');
      await tx.topicResearchRecord.create({
        data: createResearchRecordInput({
          id: researchRecordId,
          topicId,
          recordType: 'question',
          recordStatus: input.record_status ?? 'completed',
          sourceRecordIds: [
            ...(input.source_need_review_ids ?? []),
            ...(input.source_evidence_review_ids ?? []),
          ],
          summary: input.judgement_summary,
          confidence: input.confidence,
          payload: {
            ...input,
            sub_questions: input.sub_questions ?? [],
            source_need_review_ids: input.source_need_review_ids ?? [],
            source_evidence_review_ids: input.source_evidence_review_ids ?? [],
          },
          createdAt: now,
          updatedAt: now,
        }),
      });

      const created = await tx.topicQuestion.create({
        data: {
          id: makeId('question'),
          topicId,
          researchRecordId,
          mainQuestion: input.main_question,
          subQuestions: toJsonValue(input.sub_questions ?? []),
          researchSlice: input.research_slice,
          contributionHypothesis: input.contribution_hypothesis,
          sourceNeedReviewIds: toJsonValue(input.source_need_review_ids ?? []),
          sourceEvidenceReviewIds: toJsonValue(input.source_evidence_review_ids ?? []),
          createdAt: now,
          updatedAt: now,
        },
        include: {
          researchRecord: true,
        },
      });

      return toQuestionDTO(created);
    });
  }

  async getQuestion(topicId: string, recordId: string): Promise<TopicQuestionDTO | null> {
    const row = await this.prisma.topicQuestion.findFirst({
      where: {
        id: recordId,
        topicId,
      },
      include: {
        researchRecord: true,
      },
    });
    return row ? toQuestionDTO(row) : null;
  }

  async listQuestions(topicId: string): Promise<TopicQuestionDTO[]> {
    const rows = await this.prisma.topicQuestion.findMany({
      where: { topicId },
      orderBy: { updatedAt: 'desc' },
      include: { researchRecord: true },
    });
    return rows.map((row) => toQuestionDTO(row));
  }

  async createValueAssessment(
    topicId: string,
    questionId: string,
    input: CreateTopicValueAssessmentRequest,
  ): Promise<TopicValueAssessmentDTO> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const researchRecordId = makeId('topic_record');
      await tx.topicResearchRecord.create({
        data: createResearchRecordInput({
          id: researchRecordId,
          topicId,
          recordType: 'value_assessment',
          recordStatus: input.record_status ?? 'completed',
          sourceRecordIds: [questionId],
          summary: input.judgement_summary,
          confidence: input.confidence,
          nextActions: input.next_actions,
          evidenceRefs: input.evidence_refs,
          payload: {
            ...input,
            reviewer_objections: input.reviewer_objections ?? [],
            required_refinements: input.required_refinements ?? [],
            next_actions: input.next_actions ?? [],
          },
          createdAt: now,
          updatedAt: now,
        }),
      });

      const created = await tx.topicValueAssessment.create({
        data: {
          id: makeId('value'),
          topicId,
          questionId,
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
        include: {
          researchRecord: true,
        },
      });

      return toValueAssessmentDTO(created);
    });
  }

  async getValueAssessment(topicId: string, recordId: string): Promise<TopicValueAssessmentDTO | null> {
    const row = await this.prisma.topicValueAssessment.findFirst({
      where: {
        id: recordId,
        topicId,
      },
      include: {
        researchRecord: true,
      },
    });
    return row ? toValueAssessmentDTO(row) : null;
  }

  async getLatestValueAssessmentByQuestion(topicId: string, questionId: string): Promise<TopicValueAssessmentDTO | null> {
    const row = await this.prisma.topicValueAssessment.findFirst({
      where: {
        topicId,
        questionId,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        researchRecord: true,
      },
    });
    return row ? toValueAssessmentDTO(row) : null;
  }

  async listValueAssessments(topicId: string, questionId: string): Promise<TopicValueAssessmentDTO[]> {
    const rows = await this.prisma.topicValueAssessment.findMany({
      where: {
        topicId,
        questionId,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        researchRecord: true,
      },
    });
    return rows.map((row) => toValueAssessmentDTO(row));
  }

  async createTopicPackage(
    topicId: string,
    questionId: string,
    valueAssessmentId: string,
    input: CreateTopicPackageRequest,
  ): Promise<TopicPackageDTO> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const researchRecordId = makeId('topic_record');
      await tx.topicResearchRecord.create({
        data: createResearchRecordInput({
          id: researchRecordId,
          topicId,
          recordType: 'topic_package',
          recordStatus: input.record_status ?? 'completed',
          sourceRecordIds: [questionId, valueAssessmentId],
          summary: input.contribution_summary,
          confidence: 1,
          payload: {
            ...input,
            key_risks: input.key_risks ?? [],
          },
          createdAt: now,
          updatedAt: now,
        }),
      });

      const created = await tx.topicPackage.create({
        data: {
          id: makeId('package'),
          topicId,
          questionId,
          valueAssessmentId,
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
        include: {
          researchRecord: true,
        },
      });

      return toTopicPackageDTO(created);
    });
  }

  async getTopicPackage(topicId: string, recordId: string): Promise<TopicPackageDTO | null> {
    const row = await this.prisma.topicPackage.findFirst({
      where: {
        id: recordId,
        topicId,
      },
      include: {
        researchRecord: true,
      },
    });
    return row ? toTopicPackageDTO(row) : null;
  }

  async listTopicPackages(topicId: string, questionId: string, valueAssessmentId: string): Promise<TopicPackageDTO[]> {
    const rows = await this.prisma.topicPackage.findMany({
      where: {
        topicId,
        questionId,
        valueAssessmentId,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        researchRecord: true,
      },
    });
    return rows.map((row) => toTopicPackageDTO(row));
  }

  async createPromotionDecision(
    topicId: string,
    input: CreateTopicPromotionDecisionRequest & { promotedPaperId?: string },
  ): Promise<TopicPromotionDecisionDTO> {
    const created = await this.prisma.topicPromotionDecision.create({
      data: {
        id: makeId('decision'),
        topicId,
        questionId: input.question_id,
        valueAssessmentId: input.value_assessment_id,
        packageId: input.package_id ?? null,
        decision: input.decision,
        reasonSummary: input.reason_summary,
        targetPaperTitle: input.target_paper_title ?? null,
        promotedPaperId: input.promotedPaperId ?? null,
        loopbackTarget: input.loopback_target ?? null,
        createdBy: input.created_by,
        createdAt: new Date(),
      },
    });
    return toPromotionDecisionDTO(created);
  }
}
