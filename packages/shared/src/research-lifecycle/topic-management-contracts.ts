export const TOPIC_RESEARCH_RECORD_TYPES = [
  'evidence_review',
  'need_review',
  'question',
  'value_assessment',
  'topic_package',
  'promotion_decision',
] as const;

export type TopicResearchRecordType = (typeof TOPIC_RESEARCH_RECORD_TYPES)[number];

export const TOPIC_RESEARCH_RECORD_STATUSES = ['draft', 'completed', 'superseded', 'archived'] as const;
export type TopicResearchRecordStatus = (typeof TOPIC_RESEARCH_RECORD_STATUSES)[number];

export const TOPIC_VALUE_VERDICTS = ['promote', 'refine', 'park', 'drop'] as const;
export type TopicValueVerdict = (typeof TOPIC_VALUE_VERDICTS)[number];

export const TOPIC_PROMOTION_DECISIONS = ['promote', 'hold', 'reject', 'loopback'] as const;
export type TopicPromotionDecisionType = (typeof TOPIC_PROMOTION_DECISIONS)[number];

export const CONTRIBUTION_HYPOTHESES = ['method', 'benchmark', 'analysis', 'resource', 'system'] as const;
export type ContributionHypothesis = (typeof CONTRIBUTION_HYPOTHESES)[number];

export interface EvidenceRef {
  literature_id: string;
  source_type: 'abstract' | 'key_content' | 'fulltext_chunk' | 'metadata' | 'artifact';
  span_ref?: string;
  note?: string;
}

export interface ReviewRef {
  record_id: string;
  record_type: TopicResearchRecordType;
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

export interface NeedReviewDTO {
  record_id: string;
  topic_id: string;
  record_status: TopicResearchRecordStatus;
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
  record_status?: TopicResearchRecordStatus;
  need_statement: string;
  who_needs_it: string;
  scenario: string;
  boundary?: string;
  evidence_review_refs: ReviewRef[];
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

export interface TopicQuestionDTO {
  record_id: string;
  topic_id: string;
  record_status: TopicResearchRecordStatus;
  main_question: string;
  sub_questions: string[];
  research_slice: string;
  contribution_hypothesis: ContributionHypothesis;
  source_need_review_ids: string[];
  source_evidence_review_ids: string[];
  judgement_summary: string;
  confidence: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTopicQuestionRequest {
  record_status?: TopicResearchRecordStatus;
  main_question: string;
  sub_questions?: string[];
  research_slice: string;
  contribution_hypothesis: ContributionHypothesis;
  source_need_review_ids?: string[];
  source_evidence_review_ids?: string[];
  judgement_summary: string;
  confidence: number;
}

export interface TopicValueAssessmentDTO {
  record_id: string;
  topic_id: string;
  question_id: string;
  record_status: TopicResearchRecordStatus;
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
  verdict: TopicValueVerdict;
  total_score: number;
  judgement_summary: string;
  confidence: number;
  required_refinements: string[];
  next_actions: string[];
  evidence_refs: EvidenceRef[];
  created_at: string;
  updated_at: string;
}

export interface CreateTopicValueAssessmentRequest {
  record_status?: TopicResearchRecordStatus;
  strongest_claim_if_success: string;
  fallback_claim_if_success?: string;
  hard_gates: TopicValueAssessmentDTO['hard_gates'];
  scored_dimensions: TopicValueAssessmentDTO['scored_dimensions'];
  risk_penalty: TopicValueAssessmentDTO['risk_penalty'];
  reviewer_objections?: string[];
  ceiling_case: string;
  base_case: string;
  floor_case: string;
  verdict: TopicValueVerdict;
  total_score: number;
  judgement_summary: string;
  confidence: number;
  required_refinements?: string[];
  next_actions?: string[];
  evidence_refs: EvidenceRef[];
}

export interface TopicPackageDTO {
  record_id: string;
  topic_id: string;
  question_id: string;
  value_assessment_id: string;
  record_status: TopicResearchRecordStatus;
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

export interface CreateTopicPackageRequest {
  record_status?: TopicResearchRecordStatus;
  title_candidates: string[];
  research_background: string;
  contribution_summary: string;
  candidate_methods: string[];
  evaluation_plan: string;
  key_risks?: string[];
  selected_literature_evidence_ids: string[];
}

export interface TopicPromotionDecisionDTO {
  decision_id: string;
  topic_id: string;
  question_id: string;
  value_assessment_id: string;
  package_id?: string;
  decision: TopicPromotionDecisionType;
  reason_summary: string;
  target_paper_title?: string;
  promoted_paper_id?: string;
  loopback_target?: 'need_review' | 'question' | 'value_assessment' | 'topic_package';
  created_by: 'llm' | 'human' | 'hybrid';
  created_at: string;
}

export interface CreateTopicPromotionDecisionRequest {
  question_id: string;
  value_assessment_id: string;
  package_id?: string;
  decision: TopicPromotionDecisionType;
  reason_summary: string;
  target_paper_title?: string;
  loopback_target?: TopicPromotionDecisionDTO['loopback_target'];
  created_by: TopicPromotionDecisionDTO['created_by'];
}

export interface PromoteTopicToPaperProjectRequest {
  question_id: string;
  value_assessment_id: string;
  package_id: string;
  title: string;
  research_direction?: string;
  created_by: 'human' | 'hybrid';
}

export interface PromoteTopicToPaperProjectResponse {
  paper_id: string;
  decision_id: string;
}

const stringId = { type: 'string', minLength: 4 };
const boundedConfidence = { type: 'number', minimum: 0, maximum: 1 };
const boundedScore = { type: 'number', minimum: 1, maximum: 5 };
const nonEmptyStringArray = { type: 'array', items: { type: 'string', minLength: 1 } };

export const evidenceRefSchema = {
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

export const reviewRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['record_id', 'record_type'],
  properties: {
    record_id: stringId,
    record_type: { enum: [...TOPIC_RESEARCH_RECORD_TYPES] },
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
      'evidence_review_refs',
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
    properties: {
      record_status: { enum: [...TOPIC_RESEARCH_RECORD_STATUSES] },
      need_statement: { type: 'string', minLength: 10 },
      who_needs_it: { type: 'string', minLength: 2 },
      scenario: { type: 'string', minLength: 5 },
      boundary: { type: 'string' },
      evidence_review_refs: { type: 'array', minItems: 1, items: reviewRefSchema },
      literature_ids: { type: 'array', minItems: 1, items: stringId },
      unmet_need_category: {
        enum: ['performance', 'cost', 'robustness', 'interpretability', 'usability', 'scalability', 'data_efficiency', 'evaluation_gap', 'resource_gap'],
      },
      falsification_verdict: { enum: ['validated', 'weak', 'pseudo_gap', 'unclear'] },
      significance_score: boundedScore,
      measurability_score: boundedScore,
      feasibility_signal: { enum: ['high', 'medium', 'low', 'unknown'] },
      validated_need: { type: 'boolean' },
      judgement_summary: { type: 'string', minLength: 10 },
      confidence: boundedConfidence,
      next_actions: nonEmptyStringArray,
      evidence_refs: { type: 'array', minItems: 1, items: evidenceRefSchema },
      missing_information: nonEmptyStringArray,
      blocking_issues: nonEmptyStringArray,
    },
  },
} as const;

export const createTopicQuestionRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['main_question', 'research_slice', 'contribution_hypothesis', 'judgement_summary', 'confidence'],
    properties: {
      record_status: { enum: [...TOPIC_RESEARCH_RECORD_STATUSES] },
      main_question: { type: 'string', minLength: 10 },
      sub_questions: nonEmptyStringArray,
      research_slice: { type: 'string', minLength: 5 },
      contribution_hypothesis: { enum: [...CONTRIBUTION_HYPOTHESES] },
      source_need_review_ids: nonEmptyStringArray,
      source_evidence_review_ids: nonEmptyStringArray,
      judgement_summary: { type: 'string', minLength: 10 },
      confidence: boundedConfidence,
    },
    allOf: [
      {
        anyOf: [
          { required: ['source_need_review_ids'] },
          { required: ['source_evidence_review_ids'] },
        ],
      },
    ],
  },
} as const;

const hardGateCheckSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['pass', 'reason'],
  properties: {
    pass: { type: 'boolean' },
    reason: { type: 'string', minLength: 5 },
    evidence_refs: { type: 'array', items: evidenceRefSchema },
  },
} as const;

const scoredDimensionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['score', 'reason', 'confidence'],
  properties: {
    score: boundedScore,
    reason: { type: 'string', minLength: 5 },
    confidence: boundedConfidence,
    evidence_refs: { type: 'array', items: evidenceRefSchema },
  },
} as const;

export const createTopicValueAssessmentRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: [
      'strongest_claim_if_success',
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
    properties: {
      record_status: { enum: [...TOPIC_RESEARCH_RECORD_STATUSES] },
      strongest_claim_if_success: { type: 'string', minLength: 10 },
      fallback_claim_if_success: { type: 'string' },
      hard_gates: {
        type: 'object',
        additionalProperties: false,
        required: ['significance', 'originality', 'answerability', 'feasibility', 'venue_fit'],
        properties: {
          significance: hardGateCheckSchema,
          originality: hardGateCheckSchema,
          answerability: hardGateCheckSchema,
          feasibility: hardGateCheckSchema,
          venue_fit: hardGateCheckSchema,
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
          data_risk: { type: 'number', minimum: 0, maximum: 5 },
          compute_risk: { type: 'number', minimum: 0, maximum: 5 },
          baseline_risk: { type: 'number', minimum: 0, maximum: 5 },
          execution_risk: { type: 'number', minimum: 0, maximum: 5 },
          ethics_risk: { type: 'number', minimum: 0, maximum: 5 },
          penalty_summary: { type: 'string', minLength: 5 },
        },
      },
      reviewer_objections: nonEmptyStringArray,
      ceiling_case: { type: 'string', minLength: 5 },
      base_case: { type: 'string', minLength: 5 },
      floor_case: { type: 'string', minLength: 5 },
      verdict: { enum: [...TOPIC_VALUE_VERDICTS] },
      total_score: { type: 'number', minimum: 0, maximum: 100 },
      judgement_summary: { type: 'string', minLength: 10 },
      confidence: boundedConfidence,
      required_refinements: nonEmptyStringArray,
      next_actions: nonEmptyStringArray,
      evidence_refs: { type: 'array', minItems: 1, items: evidenceRefSchema },
    },
  },
} as const;

export const createTopicPackageRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: [
      'title_candidates',
      'research_background',
      'contribution_summary',
      'candidate_methods',
      'evaluation_plan',
      'selected_literature_evidence_ids',
    ],
    properties: {
      record_status: { enum: [...TOPIC_RESEARCH_RECORD_STATUSES] },
      title_candidates: { type: 'array', minItems: 1, items: { type: 'string', minLength: 5 } },
      research_background: { type: 'string', minLength: 20 },
      contribution_summary: { type: 'string', minLength: 10 },
      candidate_methods: { type: 'array', minItems: 1, items: { type: 'string', minLength: 3 } },
      evaluation_plan: { type: 'string', minLength: 10 },
      key_risks: nonEmptyStringArray,
      selected_literature_evidence_ids: { type: 'array', minItems: 1, items: stringId },
    },
  },
} as const;

export const createTopicPromotionDecisionRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['question_id', 'value_assessment_id', 'decision', 'reason_summary', 'created_by'],
    properties: {
      question_id: stringId,
      value_assessment_id: stringId,
      package_id: stringId,
      decision: { enum: [...TOPIC_PROMOTION_DECISIONS] },
      reason_summary: { type: 'string', minLength: 10 },
      target_paper_title: { type: 'string', minLength: 5 },
      loopback_target: { enum: ['need_review', 'question', 'value_assessment', 'topic_package'] },
      created_by: { enum: ['llm', 'human', 'hybrid'] },
    },
    allOf: [
      {
        if: { properties: { decision: { const: 'promote' } } },
        then: { required: ['package_id', 'target_paper_title'] },
      },
      {
        if: { properties: { decision: { const: 'loopback' } } },
        then: { required: ['loopback_target'] },
      },
    ],
  },
} as const;

export const promoteTopicToPaperProjectRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['question_id', 'value_assessment_id', 'package_id', 'title', 'created_by'],
    properties: {
      question_id: stringId,
      value_assessment_id: stringId,
      package_id: stringId,
      title: { type: 'string', minLength: 5 },
      research_direction: { type: 'string' },
      created_by: { enum: ['human', 'hybrid'] },
    },
  },
} as const;
