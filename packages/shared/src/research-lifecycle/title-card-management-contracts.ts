export const RESEARCH_RECORD_STATUSES = ['draft', 'completed', 'superseded', 'archived'] as const;
export type ResearchRecordStatus = (typeof RESEARCH_RECORD_STATUSES)[number];

export const TITLE_CARD_STATUSES = ['draft', 'active', 'promoted', 'parked'] as const;
export type TitleCardStatus = (typeof TITLE_CARD_STATUSES)[number];

export const VALUE_VERDICTS = ['promote', 'refine', 'park', 'drop'] as const;
export type ValueVerdict = (typeof VALUE_VERDICTS)[number];

export const PROMOTION_DECISIONS = ['promote', 'hold', 'reject', 'loopback'] as const;
export type PromotionDecisionType = (typeof PROMOTION_DECISIONS)[number];

export const CONTRIBUTION_HYPOTHESES = ['method', 'benchmark', 'analysis', 'resource', 'system'] as const;
export type ContributionHypothesis = (typeof CONTRIBUTION_HYPOTHESES)[number];

export const EVIDENCE_SELECTION_STATES = ['all', 'selected', 'unselected'] as const;
export type EvidenceSelectionState = (typeof EVIDENCE_SELECTION_STATES)[number];

export const PIPELINE_READINESS_STATES = ['all', 'ready', 'not_ready'] as const;
export type PipelineReadinessState = (typeof PIPELINE_READINESS_STATES)[number];

export interface EvidenceRef {
  literature_id: string;
  source_type: 'abstract' | 'key_content' | 'fulltext_chunk' | 'metadata' | 'artifact';
  span_ref?: string;
  note?: string;
}

export interface ReviewRef {
  record_id: string;
  record_type: 'evidence_review' | 'need_review' | 'research_question' | 'value_assessment' | 'package' | 'promotion_decision';
}

export interface HardGateCheck {
  pass: boolean;
  reason: string;
  evidence_refs?: EvidenceRef[];
}

export interface ScoredDimension {
  score: number;
  reason: string;
  confidence: number;
  evidence_refs?: EvidenceRef[];
}

export interface TitleCardDTO {
  title_card_id: string;
  working_title: string;
  brief: string;
  status: TitleCardStatus;
  evidence_count: number;
  need_count: number;
  research_question_count: number;
  value_assessment_count: number;
  package_count: number;
  promotion_decision_count: number;
  latest_paper_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TitleCardListSummaryDTO {
  total_title_cards: number;
  active_title_cards: number;
  promoted_title_cards: number;
  total_evidence_items: number;
  pending_promotion_cards: number;
}

export interface TitleCardListResponse {
  items: TitleCardDTO[];
  summary: TitleCardListSummaryDTO;
}

export interface CreateTitleCardRequest {
  working_title: string;
  brief: string;
  status?: TitleCardStatus;
}

export interface UpdateTitleCardRequest {
  working_title?: string;
  brief?: string;
  status?: TitleCardStatus;
}

export interface TitleCardEvidenceBasketItemDTO {
  literature_id: string;
  title: string;
  authors: string[];
  year: number | null;
  tags: string[];
  provider: string | null;
  rights_class: string;
  pipeline_ready: boolean;
  selected_at: string;
}

export interface TitleCardEvidenceBasketDTO {
  title_card_id: string;
  items: TitleCardEvidenceBasketItemDTO[];
  updated_at: string;
}

export interface UpdateTitleCardEvidenceBasketRequest {
  add_literature_ids?: string[];
  remove_literature_ids?: string[];
}

export interface EvidenceCandidateQuery {
  keyword?: string;
  year_from?: number;
  year_to?: number;
  tags?: string[];
  pipeline_readiness?: PipelineReadinessState;
  rights_classes?: string[];
  providers?: string[];
  selection_state?: EvidenceSelectionState;
}

export interface EvidenceCandidateDTO {
  literature_id: string;
  title: string;
  authors: string[];
  year: number | null;
  abstract_text: string | null;
  key_content_digest: string | null;
  tags: string[];
  provider: string | null;
  rights_class: string;
  pipeline_ready: boolean;
  selection_state: Exclude<EvidenceSelectionState, 'all'>;
}

export interface EvidenceCandidateListResponse {
  title_card_id: string;
  items: EvidenceCandidateDTO[];
  total: number;
}

export interface NeedReviewDTO {
  need_id: string;
  title_card_id: string;
  record_status: ResearchRecordStatus;
  need_statement: string;
  who_needs_it: string;
  scenario: string;
  boundary?: string;
  evidence_review_refs: ReviewRef[];
  literature_ids: string[];
  unmet_need_category:
    | 'performance'
    | 'cost'
    | 'robustness'
    | 'interpretability'
    | 'usability'
    | 'scalability'
    | 'data_efficiency'
    | 'evaluation_gap'
    | 'resource_gap';
  falsification_verdict: 'validated' | 'weak' | 'pseudo_gap' | 'unclear';
  significance_score: number;
  measurability_score: number;
  feasibility_signal: 'high' | 'medium' | 'low' | 'unknown';
  validated_need: boolean;
  judgement_summary: string;
  confidence: number;
  next_actions: string[];
  evidence_refs: EvidenceRef[];
  missing_information?: string[];
  blocking_issues?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateNeedReviewRequest {
  record_status?: ResearchRecordStatus;
  need_statement: string;
  who_needs_it: string;
  scenario: string;
  boundary?: string;
  evidence_review_refs?: ReviewRef[];
  literature_ids: string[];
  unmet_need_category: NeedReviewDTO['unmet_need_category'];
  falsification_verdict: NeedReviewDTO['falsification_verdict'];
  significance_score: number;
  measurability_score: number;
  feasibility_signal: NeedReviewDTO['feasibility_signal'];
  validated_need: boolean;
  judgement_summary: string;
  confidence: number;
  next_actions?: string[];
  evidence_refs: EvidenceRef[];
  missing_information?: string[];
  blocking_issues?: string[];
}

export interface UpdateNeedReviewRequest extends Partial<CreateNeedReviewRequest> {}

export interface ResearchQuestionDTO {
  research_question_id: string;
  title_card_id: string;
  record_status: ResearchRecordStatus;
  main_question: string;
  sub_questions: string[];
  research_slice: string;
  contribution_hypothesis: ContributionHypothesis;
  source_need_ids: string[];
  source_literature_evidence_ids: string[];
  judgement_summary: string;
  confidence: number;
  created_at: string;
  updated_at: string;
}

export interface CreateResearchQuestionRequest {
  record_status?: ResearchRecordStatus;
  main_question: string;
  sub_questions?: string[];
  research_slice: string;
  contribution_hypothesis: ContributionHypothesis;
  source_need_ids?: string[];
  source_literature_evidence_ids?: string[];
  judgement_summary: string;
  confidence: number;
}

export interface UpdateResearchQuestionRequest extends Partial<CreateResearchQuestionRequest> {}

export interface ValueAssessmentDTO {
  value_assessment_id: string;
  title_card_id: string;
  research_question_id: string;
  record_status: ResearchRecordStatus;
  strongest_claim_if_success: string;
  fallback_claim_if_success?: string;
  hard_gates: {
    significance: HardGateCheck;
    originality: HardGateCheck;
    answerability: HardGateCheck;
    feasibility: HardGateCheck;
    venue_fit: HardGateCheck;
  };
  scored_dimensions: {
    significance: ScoredDimension;
    originality: ScoredDimension;
    claim_strength: ScoredDimension;
    answerability: ScoredDimension;
    venue_fit: ScoredDimension;
    strategic_leverage: ScoredDimension;
  };
  risk_penalty: {
    data_risk: number;
    compute_risk: number;
    baseline_risk: number;
    execution_risk: number;
    ethics_risk: number;
    penalty_summary: string;
  };
  reviewer_objections: string[];
  ceiling_case: string;
  base_case: string;
  floor_case: string;
  verdict: ValueVerdict;
  total_score: number;
  judgement_summary: string;
  confidence: number;
  required_refinements: string[];
  next_actions: string[];
  evidence_refs: EvidenceRef[];
  created_at: string;
  updated_at: string;
}

export interface CreateValueAssessmentRequest {
  research_question_id: string;
  record_status?: ResearchRecordStatus;
  strongest_claim_if_success: string;
  fallback_claim_if_success?: string;
  hard_gates: ValueAssessmentDTO['hard_gates'];
  scored_dimensions: ValueAssessmentDTO['scored_dimensions'];
  risk_penalty: ValueAssessmentDTO['risk_penalty'];
  reviewer_objections?: string[];
  ceiling_case: string;
  base_case: string;
  floor_case: string;
  verdict: ValueVerdict;
  total_score: number;
  judgement_summary: string;
  confidence: number;
  required_refinements?: string[];
  next_actions?: string[];
  evidence_refs: EvidenceRef[];
}

export interface UpdateValueAssessmentRequest extends Partial<CreateValueAssessmentRequest> {}

export interface PackageDTO {
  package_id: string;
  title_card_id: string;
  research_question_id: string;
  value_assessment_id: string;
  record_status: ResearchRecordStatus;
  title_candidates: string[];
  research_background: string;
  contribution_summary: string;
  candidate_methods: string[];
  evaluation_plan: string;
  key_risks: string[];
  selected_literature_evidence_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface CreatePackageRequest {
  record_status?: ResearchRecordStatus;
  research_question_id: string;
  value_assessment_id: string;
  title_candidates: string[];
  research_background: string;
  contribution_summary: string;
  candidate_methods: string[];
  evaluation_plan: string;
  key_risks?: string[];
  selected_literature_evidence_ids: string[];
}

export interface UpdatePackageRequest extends Partial<CreatePackageRequest> {}

export interface PromotionDecisionDTO {
  decision_id: string;
  title_card_id: string;
  research_question_id: string;
  value_assessment_id: string;
  package_id?: string;
  decision: PromotionDecisionType;
  reason_summary: string;
  target_paper_title?: string;
  promoted_paper_id?: string;
  loopback_target?: 'need_review' | 'research_question' | 'value_assessment' | 'package';
  created_by: 'llm' | 'human' | 'hybrid';
  created_at: string;
  updated_at: string;
}

export interface CreatePromotionDecisionRequest {
  research_question_id: string;
  value_assessment_id: string;
  package_id?: string;
  decision: PromotionDecisionType;
  reason_summary: string;
  target_paper_title?: string;
  loopback_target?: PromotionDecisionDTO['loopback_target'];
  created_by: PromotionDecisionDTO['created_by'];
}

export interface UpdatePromotionDecisionRequest extends Partial<CreatePromotionDecisionRequest> {}

export interface PromoteTitleCardToPaperProjectRequest {
  research_question_id: string;
  value_assessment_id: string;
  package_id: string;
  title: string;
  research_direction?: string;
  created_by: 'human' | 'hybrid';
}

export interface PromoteTitleCardToPaperProjectResponse {
  paper_id: string;
  decision_id: string;
}

const stringId = { type: 'string', minLength: 4 };
const boundedConfidence = { type: 'number', minimum: 0, maximum: 1 };
const boundedScore = { type: 'number', minimum: 1, maximum: 5 };
const nonEmptyStringArray = { type: 'array', items: { type: 'string', minLength: 1 } };

function withAtLeastOneOf(keys: string[], body: Record<string, unknown>) {
  return {
    ...body,
    anyOf: keys.map((key) => ({ required: [key] })),
  } as const;
}

function makePatchBody(properties: Record<string, unknown>) {
  return {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties,
  } as const;
}

const evidenceRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['literature_id', 'source_type'],
  properties: {
    literature_id: stringId,
    source_type: { enum: ['abstract', 'key_content', 'fulltext_chunk', 'metadata', 'artifact'] },
    span_ref: { type: 'string' },
    note: { type: 'string' },
  },
} as const;

const reviewRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['record_id', 'record_type'],
  properties: {
    record_id: stringId,
    record_type: { enum: ['evidence_review', 'need_review', 'research_question', 'value_assessment', 'package', 'promotion_decision'] },
  },
} as const;

const hardGateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['pass', 'reason'],
  properties: {
    pass: { type: 'boolean' },
    reason: { type: 'string', minLength: 1 },
    evidence_refs: { type: 'array', items: evidenceRefSchema },
  },
} as const;

const scoredDimensionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['score', 'reason', 'confidence'],
  properties: {
    score: boundedScore,
    reason: { type: 'string', minLength: 1 },
    confidence: boundedConfidence,
    evidence_refs: { type: 'array', items: evidenceRefSchema },
  },
} as const;

const titleCardMutableFields = {
  working_title: { type: 'string', minLength: 1 },
  brief: { type: 'string', minLength: 1 },
  status: { enum: [...TITLE_CARD_STATUSES] },
} as const;

const needMutableFields = {
  record_status: { enum: [...RESEARCH_RECORD_STATUSES] },
  need_statement: { type: 'string', minLength: 1 },
  who_needs_it: { type: 'string', minLength: 1 },
  scenario: { type: 'string', minLength: 1 },
  boundary: { type: 'string' },
  evidence_review_refs: { type: 'array', items: reviewRefSchema },
  literature_ids: nonEmptyStringArray,
  unmet_need_category: {
    enum: ['performance', 'cost', 'robustness', 'interpretability', 'usability', 'scalability', 'data_efficiency', 'evaluation_gap', 'resource_gap'],
  },
  falsification_verdict: { enum: ['validated', 'weak', 'pseudo_gap', 'unclear'] },
  significance_score: boundedScore,
  measurability_score: boundedScore,
  feasibility_signal: { enum: ['high', 'medium', 'low', 'unknown'] },
  validated_need: { type: 'boolean' },
  judgement_summary: { type: 'string', minLength: 1 },
  confidence: boundedConfidence,
  next_actions: nonEmptyStringArray,
  evidence_refs: { type: 'array', items: evidenceRefSchema },
  missing_information: nonEmptyStringArray,
  blocking_issues: nonEmptyStringArray,
} as const;

const researchQuestionMutableFields = {
  record_status: { enum: [...RESEARCH_RECORD_STATUSES] },
  main_question: { type: 'string', minLength: 1 },
  sub_questions: nonEmptyStringArray,
  research_slice: { type: 'string', minLength: 1 },
  contribution_hypothesis: { enum: [...CONTRIBUTION_HYPOTHESES] },
  source_need_ids: nonEmptyStringArray,
  source_literature_evidence_ids: nonEmptyStringArray,
  judgement_summary: { type: 'string', minLength: 1 },
  confidence: boundedConfidence,
} as const;

const valueAssessmentMutableFields = {
  research_question_id: stringId,
  record_status: { enum: [...RESEARCH_RECORD_STATUSES] },
  strongest_claim_if_success: { type: 'string', minLength: 1 },
  fallback_claim_if_success: { type: 'string' },
  hard_gates: {
    type: 'object',
    additionalProperties: false,
    required: ['significance', 'originality', 'answerability', 'feasibility', 'venue_fit'],
    properties: {
      significance: hardGateSchema,
      originality: hardGateSchema,
      answerability: hardGateSchema,
      feasibility: hardGateSchema,
      venue_fit: hardGateSchema,
    },
  },
  scored_dimensions: {
    type: 'object',
    additionalProperties: false,
    required: ['significance', 'originality', 'claim_strength', 'answerability', 'venue_fit', 'strategic_leverage'],
    properties: {
      significance: scoredDimensionSchema,
      originality: scoredDimensionSchema,
      claim_strength: scoredDimensionSchema,
      answerability: scoredDimensionSchema,
      venue_fit: scoredDimensionSchema,
      strategic_leverage: scoredDimensionSchema,
    },
  },
  risk_penalty: {
    type: 'object',
    additionalProperties: false,
    required: ['data_risk', 'compute_risk', 'baseline_risk', 'execution_risk', 'ethics_risk', 'penalty_summary'],
    properties: {
      data_risk: { type: 'number' },
      compute_risk: { type: 'number' },
      baseline_risk: { type: 'number' },
      execution_risk: { type: 'number' },
      ethics_risk: { type: 'number' },
      penalty_summary: { type: 'string', minLength: 1 },
    },
  },
  reviewer_objections: nonEmptyStringArray,
  ceiling_case: { type: 'string', minLength: 1 },
  base_case: { type: 'string', minLength: 1 },
  floor_case: { type: 'string', minLength: 1 },
  verdict: { enum: [...VALUE_VERDICTS] },
  total_score: { type: 'number' },
  judgement_summary: { type: 'string', minLength: 1 },
  confidence: boundedConfidence,
  required_refinements: nonEmptyStringArray,
  next_actions: nonEmptyStringArray,
  evidence_refs: { type: 'array', items: evidenceRefSchema },
} as const;

const packageMutableFields = {
  record_status: { enum: [...RESEARCH_RECORD_STATUSES] },
  research_question_id: stringId,
  value_assessment_id: stringId,
  title_candidates: nonEmptyStringArray,
  research_background: { type: 'string', minLength: 1 },
  contribution_summary: { type: 'string', minLength: 1 },
  candidate_methods: nonEmptyStringArray,
  evaluation_plan: { type: 'string', minLength: 1 },
  key_risks: nonEmptyStringArray,
  selected_literature_evidence_ids: nonEmptyStringArray,
} as const;

const promotionDecisionMutableFields = {
  research_question_id: stringId,
  value_assessment_id: stringId,
  package_id: stringId,
  decision: { enum: [...PROMOTION_DECISIONS] },
  reason_summary: { type: 'string', minLength: 1 },
  target_paper_title: { type: 'string', minLength: 1 },
  loopback_target: { enum: ['need_review', 'research_question', 'value_assessment', 'package'] },
  created_by: { enum: ['llm', 'human', 'hybrid'] },
} as const;

export const paramsTitleCardIdSchema = {
  params: {
    type: 'object',
    required: ['titleCardId'],
    additionalProperties: false,
    properties: {
      titleCardId: stringId,
    },
  },
} as const;

export const paramsTitleCardIdNeedIdSchema = {
  params: {
    type: 'object',
    required: ['titleCardId', 'needId'],
    additionalProperties: false,
    properties: {
      titleCardId: stringId,
      needId: stringId,
    },
  },
} as const;

export const paramsTitleCardIdResearchQuestionIdSchema = {
  params: {
    type: 'object',
    required: ['titleCardId', 'researchQuestionId'],
    additionalProperties: false,
    properties: {
      titleCardId: stringId,
      researchQuestionId: stringId,
    },
  },
} as const;

export const paramsTitleCardIdValueAssessmentIdSchema = {
  params: {
    type: 'object',
    required: ['titleCardId', 'valueAssessmentId'],
    additionalProperties: false,
    properties: {
      titleCardId: stringId,
      valueAssessmentId: stringId,
    },
  },
} as const;

export const paramsTitleCardIdPackageIdSchema = {
  params: {
    type: 'object',
    required: ['titleCardId', 'packageId'],
    additionalProperties: false,
    properties: {
      titleCardId: stringId,
      packageId: stringId,
    },
  },
} as const;

export const paramsTitleCardIdDecisionIdSchema = {
  params: {
    type: 'object',
    required: ['titleCardId', 'decisionId'],
    additionalProperties: false,
    properties: {
      titleCardId: stringId,
      decisionId: stringId,
    },
  },
} as const;

export const createTitleCardRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['working_title', 'brief'],
    properties: titleCardMutableFields,
  },
} as const;

export const updateTitleCardRequestSchema = {
  body: makePatchBody(titleCardMutableFields),
} as const;

export const updateTitleCardEvidenceBasketRequestSchema = {
  body: makePatchBody({
    add_literature_ids: nonEmptyStringArray,
    remove_literature_ids: nonEmptyStringArray,
  }),
} as const;

export const evidenceCandidateQuerySchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      keyword: { type: 'string' },
      year_from: { type: 'integer' },
      year_to: { type: 'integer' },
      tags: nonEmptyStringArray,
      pipeline_readiness: { enum: [...PIPELINE_READINESS_STATES] },
      rights_classes: nonEmptyStringArray,
      providers: nonEmptyStringArray,
      selection_state: { enum: [...EVIDENCE_SELECTION_STATES] },
    },
  },
} as const;

export const createNeedReviewRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: [
      'need_statement',
      'who_needs_it',
      'scenario',
      'literature_ids',
      'unmet_need_category',
      'falsification_verdict',
      'significance_score',
      'measurability_score',
      'feasibility_signal',
      'validated_need',
      'judgement_summary',
      'confidence',
      'evidence_refs',
    ],
    properties: needMutableFields,
  },
} as const;

export const updateNeedReviewRequestSchema = {
  body: makePatchBody(needMutableFields),
} as const;

export const createResearchQuestionRequestSchema = {
  body: withAtLeastOneOf(
    ['source_need_ids', 'source_literature_evidence_ids'],
    {
      type: 'object',
      additionalProperties: false,
      required: ['main_question', 'research_slice', 'contribution_hypothesis', 'judgement_summary', 'confidence'],
      properties: researchQuestionMutableFields,
    },
  ),
} as const;

export const updateResearchQuestionRequestSchema = {
  body: makePatchBody(researchQuestionMutableFields),
} as const;

export const createValueAssessmentRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: [
      'strongest_claim_if_success',
      'research_question_id',
      'hard_gates',
      'scored_dimensions',
      'risk_penalty',
      'ceiling_case',
      'base_case',
      'floor_case',
      'verdict',
      'total_score',
      'judgement_summary',
      'confidence',
      'evidence_refs',
    ],
    properties: valueAssessmentMutableFields,
  },
} as const;

export const updateValueAssessmentRequestSchema = {
  body: makePatchBody(valueAssessmentMutableFields),
} as const;

export const createPackageRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: [
      'research_question_id',
      'value_assessment_id',
      'title_candidates',
      'research_background',
      'contribution_summary',
      'candidate_methods',
      'evaluation_plan',
      'selected_literature_evidence_ids',
    ],
    properties: packageMutableFields,
  },
} as const;

export const updatePackageRequestSchema = {
  body: makePatchBody(packageMutableFields),
} as const;

export const createPromotionDecisionRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['research_question_id', 'value_assessment_id', 'decision', 'reason_summary', 'created_by'],
    properties: promotionDecisionMutableFields,
    allOf: [
      {
        if: {
          properties: {
            decision: { const: 'promote' },
          },
        },
        then: {
          required: ['package_id', 'target_paper_title'],
        },
      },
      {
        if: {
          properties: {
            decision: { const: 'loopback' },
          },
        },
        then: {
          required: ['loopback_target'],
        },
      },
    ],
  },
} as const;

export const updatePromotionDecisionRequestSchema = {
  body: makePatchBody(promotionDecisionMutableFields),
} as const;

export const promoteTitleCardToPaperProjectRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['research_question_id', 'value_assessment_id', 'package_id', 'title', 'created_by'],
    properties: {
      research_question_id: stringId,
      value_assessment_id: stringId,
      package_id: stringId,
      title: { type: 'string', minLength: 1 },
      research_direction: { type: 'string' },
      created_by: { enum: ['human', 'hybrid'] },
    },
  },
} as const;
