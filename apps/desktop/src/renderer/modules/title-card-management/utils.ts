import type {
  DecisionFormState,
  EvidenceBasketItem,
  NeedFormState,
  NeedReview,
  PackageFormState,
  PackageItem,
  PromotionDecision,
  QuestionFormState,
  ResearchQuestion,
  ValueAssessment,
  ValueFormState,
  WorkflowQuickLink,
} from './types';

export function parseList(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function joinList(items: string[]): string {
  return items.join('\n');
}

export function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function safeParseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function defaultNeedForm(basketItems: EvidenceBasketItem[] = []): NeedFormState {
  return {
    needStatement: '',
    whoNeedsIt: '',
    scenario: '',
    boundary: '',
    literatureIdsText: joinList(basketItems.map((item) => item.literature_id)),
    unmetNeedCategory: 'robustness',
    falsificationVerdict: 'validated',
    significanceScore: '4',
    measurabilityScore: '4',
    feasibilitySignal: 'medium',
    validatedNeed: true,
    judgementSummary: '',
    confidence: '0.8',
  };
}

export function needFormFromReview(review: NeedReview): NeedFormState {
  return {
    needStatement: review.need_statement,
    whoNeedsIt: review.who_needs_it,
    scenario: review.scenario,
    boundary: review.boundary ?? '',
    literatureIdsText: joinList(review.literature_ids),
    unmetNeedCategory: review.unmet_need_category,
    falsificationVerdict: review.falsification_verdict,
    significanceScore: String(review.significance_score),
    measurabilityScore: String(review.measurability_score),
    feasibilitySignal: review.feasibility_signal,
    validatedNeed: review.validated_need,
    judgementSummary: review.judgement_summary,
    confidence: String(review.confidence),
  };
}

export function defaultQuestionForm(
  selectedNeedId: string | null,
  basketItems: EvidenceBasketItem[] = [],
): QuestionFormState {
  return {
    mainQuestion: '',
    subQuestionsText: '',
    researchSlice: '',
    contributionHypothesis: 'method',
    sourceNeedIdsText: selectedNeedId ?? '',
    sourceLiteratureEvidenceIdsText: joinList(basketItems.map((item) => item.literature_id)),
    judgementSummary: '',
    confidence: '0.8',
  };
}

export function questionFormFromQuestion(question: ResearchQuestion): QuestionFormState {
  return {
    mainQuestion: question.main_question,
    subQuestionsText: joinList(question.sub_questions),
    researchSlice: question.research_slice,
    contributionHypothesis: question.contribution_hypothesis,
    sourceNeedIdsText: joinList(question.source_need_ids),
    sourceLiteratureEvidenceIdsText: joinList(question.source_literature_evidence_ids),
    judgementSummary: question.judgement_summary,
    confidence: String(question.confidence),
  };
}

export function defaultValueForm(researchQuestionId = ''): ValueFormState {
  return {
    researchQuestionId,
    strongestClaimIfSuccess: '',
    fallbackClaimIfSuccess: '',
    verdict: 'refine',
    judgementSummary: '',
    confidence: '0.8',
    totalScore: '80',
    ceilingCase: '',
    baseCase: '',
    floorCase: '',
    hardGatesJson: toJson({
      significance: { pass: true, reason: 'TBD' },
      originality: { pass: true, reason: 'TBD' },
      answerability: { pass: true, reason: 'TBD' },
      feasibility: { pass: true, reason: 'TBD' },
      venue_fit: { pass: true, reason: 'TBD' },
    }),
    scoredDimensionsJson: toJson({
      significance: { score: 4, reason: 'TBD', confidence: 0.8 },
      originality: { score: 4, reason: 'TBD', confidence: 0.8 },
      claim_strength: { score: 4, reason: 'TBD', confidence: 0.8 },
      answerability: { score: 4, reason: 'TBD', confidence: 0.8 },
      venue_fit: { score: 4, reason: 'TBD', confidence: 0.8 },
      strategic_leverage: { score: 4, reason: 'TBD', confidence: 0.8 },
    }),
    riskPenaltyJson: toJson({
      data_risk: 1,
      compute_risk: 1,
      baseline_risk: 1,
      execution_risk: 1,
      ethics_risk: 0,
      penalty_summary: 'TBD',
    }),
    reviewerObjectionsText: '',
    requiredRefinementsText: '',
    nextActionsText: '',
  };
}

export function valueFormFromAssessment(value: ValueAssessment): ValueFormState {
  return {
    researchQuestionId: value.research_question_id,
    strongestClaimIfSuccess: value.strongest_claim_if_success,
    fallbackClaimIfSuccess: value.fallback_claim_if_success ?? '',
    verdict: value.verdict,
    judgementSummary: value.judgement_summary,
    confidence: String(value.confidence),
    totalScore: String(value.total_score),
    ceilingCase: value.ceiling_case,
    baseCase: value.base_case,
    floorCase: value.floor_case,
    hardGatesJson: toJson(value.hard_gates),
    scoredDimensionsJson: toJson(value.scored_dimensions),
    riskPenaltyJson: toJson(value.risk_penalty),
    reviewerObjectionsText: joinList(value.reviewer_objections),
    requiredRefinementsText: joinList(value.required_refinements),
    nextActionsText: joinList(value.next_actions),
  };
}

export function defaultPackageForm(
  researchQuestionId: string | null,
  valueAssessmentId: string | null,
  basketItems: EvidenceBasketItem[] = [],
): PackageFormState {
  return {
    researchQuestionId: researchQuestionId ?? '',
    valueAssessmentId: valueAssessmentId ?? '',
    titleCandidatesText: '',
    researchBackground: '',
    contributionSummary: '',
    candidateMethodsText: '',
    evaluationPlan: '',
    keyRisksText: '',
    selectedLiteratureIdsText: joinList(basketItems.map((item) => item.literature_id)),
  };
}

export function packageFormFromPackage(pkg: PackageItem): PackageFormState {
  return {
    researchQuestionId: pkg.research_question_id,
    valueAssessmentId: pkg.value_assessment_id,
    titleCandidatesText: joinList(pkg.title_candidates),
    researchBackground: pkg.research_background,
    contributionSummary: pkg.contribution_summary,
    candidateMethodsText: joinList(pkg.candidate_methods),
    evaluationPlan: pkg.evaluation_plan,
    keyRisksText: joinList(pkg.key_risks),
    selectedLiteratureIdsText: joinList(pkg.selected_literature_evidence_ids),
  };
}

export function defaultDecisionForm(
  researchQuestionId: string | null,
  valueAssessmentId: string | null,
  packageId: string | null,
): DecisionFormState {
  return {
    researchQuestionId: researchQuestionId ?? '',
    valueAssessmentId: valueAssessmentId ?? '',
    packageId: packageId ?? '',
    decision: 'hold',
    reasonSummary: '',
    targetPaperTitle: '',
    loopbackTarget: '',
    createdBy: 'human',
  };
}

export function decisionFormFromDecision(decision: PromotionDecision): DecisionFormState {
  return {
    researchQuestionId: decision.research_question_id,
    valueAssessmentId: decision.value_assessment_id,
    packageId: decision.package_id ?? '',
    decision: decision.decision,
    reasonSummary: decision.reason_summary,
    targetPaperTitle: decision.target_paper_title ?? '',
    loopbackTarget: decision.loopback_target ?? '',
    createdBy: decision.created_by,
  };
}

export const workflowQuickLinks: WorkflowQuickLink[] = [
  { label: 'Evidence', tab: 'evidence', subTab: 'candidates' },
  { label: 'Need', tab: 'need', subTab: 'list' },
  { label: 'Research Question', tab: 'research-question', subTab: 'list' },
  { label: 'Value', tab: 'value', subTab: 'list' },
  { label: 'Package', tab: 'package', subTab: 'list' },
  { label: 'Promotion', tab: 'promotion', subTab: 'decision' },
];
