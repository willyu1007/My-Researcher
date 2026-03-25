import type { Dispatch, SetStateAction } from 'react';
import type { TitleCardPrimaryTabKey } from '../../literature/shared/types';

export type TitleCardSummary = {
  title_card_id: string;
  working_title: string;
  brief: string;
  status: string;
  evidence_count: number;
  need_count: number;
  research_question_count: number;
  value_assessment_count: number;
  package_count: number;
  promotion_decision_count: number;
  latest_paper_id?: string;
  created_at: string;
  updated_at: string;
};

export type TitleCardListPayload = {
  items: TitleCardSummary[];
  summary: {
    total_title_cards: number;
    active_title_cards: number;
    promoted_title_cards: number;
    total_evidence_items: number;
    pending_promotion_cards: number;
  };
};

export type EvidenceBasketItem = {
  literature_id: string;
  title: string;
  authors: string[];
  year: number | null;
  tags: string[];
  provider: string | null;
  rights_class: string;
  pipeline_ready: boolean;
  selected_at: string;
};

export type EvidenceBasketPayload = {
  title_card_id: string;
  items: EvidenceBasketItem[];
  updated_at: string;
};

export type EvidenceCandidate = {
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
  selection_state: 'selected' | 'unselected';
};

export type EvidenceCandidatePayload = {
  title_card_id: string;
  items: EvidenceCandidate[];
  total: number;
};

export type NeedReview = {
  need_id: string;
  title_card_id: string;
  need_statement: string;
  who_needs_it: string;
  scenario: string;
  boundary?: string;
  literature_ids: string[];
  judgement_summary: string;
  confidence: number;
  record_status: string;
  unmet_need_category: string;
  falsification_verdict: string;
  significance_score: number;
  measurability_score: number;
  feasibility_signal: string;
  validated_need: boolean;
  next_actions: string[];
  evidence_refs: Array<{ literature_id: string; source_type: string; note?: string }>;
  missing_information?: string[];
  blocking_issues?: string[];
};

export type ResearchQuestion = {
  research_question_id: string;
  title_card_id: string;
  main_question: string;
  sub_questions: string[];
  research_slice: string;
  contribution_hypothesis: string;
  source_need_ids: string[];
  source_literature_evidence_ids: string[];
  judgement_summary: string;
  confidence: number;
  record_status: string;
};

export type ValueAssessment = {
  value_assessment_id: string;
  title_card_id: string;
  research_question_id: string;
  strongest_claim_if_success: string;
  fallback_claim_if_success?: string;
  verdict: string;
  judgement_summary: string;
  confidence: number;
  total_score: number;
  record_status: string;
  hard_gates: Record<string, { pass: boolean; reason: string }>;
  scored_dimensions: Record<string, { score: number; reason: string; confidence: number }>;
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
  required_refinements: string[];
  next_actions: string[];
  evidence_refs: Array<{ literature_id: string; source_type: string; note?: string }>;
};

export type PackageItem = {
  package_id: string;
  title_card_id: string;
  research_question_id: string;
  value_assessment_id: string;
  title_candidates: string[];
  research_background: string;
  contribution_summary: string;
  candidate_methods: string[];
  evaluation_plan: string;
  key_risks: string[];
  selected_literature_evidence_ids: string[];
  record_status: string;
};

export type PromotionDecision = {
  decision_id: string;
  title_card_id: string;
  research_question_id: string;
  value_assessment_id: string;
  package_id?: string;
  decision: string;
  reason_summary: string;
  target_paper_title?: string;
  promoted_paper_id?: string;
  loopback_target?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type NeedFormState = {
  needStatement: string;
  whoNeedsIt: string;
  scenario: string;
  boundary: string;
  literatureIdsText: string;
  unmetNeedCategory: string;
  falsificationVerdict: string;
  significanceScore: string;
  measurabilityScore: string;
  feasibilitySignal: string;
  validatedNeed: boolean;
  judgementSummary: string;
  confidence: string;
};

export type QuestionFormState = {
  mainQuestion: string;
  subQuestionsText: string;
  researchSlice: string;
  contributionHypothesis: string;
  sourceNeedIdsText: string;
  sourceLiteratureEvidenceIdsText: string;
  judgementSummary: string;
  confidence: string;
};

export type ValueFormState = {
  researchQuestionId: string;
  strongestClaimIfSuccess: string;
  fallbackClaimIfSuccess: string;
  verdict: string;
  judgementSummary: string;
  confidence: string;
  totalScore: string;
  ceilingCase: string;
  baseCase: string;
  floorCase: string;
  hardGatesJson: string;
  scoredDimensionsJson: string;
  riskPenaltyJson: string;
  reviewerObjectionsText: string;
  requiredRefinementsText: string;
  nextActionsText: string;
};

export type PackageFormState = {
  researchQuestionId: string;
  valueAssessmentId: string;
  titleCandidatesText: string;
  researchBackground: string;
  contributionSummary: string;
  candidateMethodsText: string;
  evaluationPlan: string;
  keyRisksText: string;
  selectedLiteratureIdsText: string;
};

export type DecisionFormState = {
  researchQuestionId: string;
  valueAssessmentId: string;
  packageId: string;
  decision: string;
  reasonSummary: string;
  targetPaperTitle: string;
  loopbackTarget: string;
  createdBy: string;
};

export type WorkflowQuickLink = {
  label: string;
  tab: TitleCardPrimaryTabKey;
  subTab: string;
};

export type TitleCardManagementModuleProps = {
  refreshToken: number;
  activePrimaryTab: TitleCardPrimaryTabKey;
  activeSecondaryTab: string | null;
  onSelectPrimaryTab: (tab: TitleCardPrimaryTabKey) => void;
  onSelectSecondaryTab: (tab: Exclude<TitleCardPrimaryTabKey, 'overview'>, subTab: string) => void;
};

export type TitleCardManagementController = {
  titleCards: TitleCardSummary[];
  listSummary: TitleCardListPayload['summary'] | null;
  loading: boolean;
  error: string | null;
  message: string | null;
  activeTitleCardId: string | null;
  titleCardDetail: TitleCardSummary | null;
  createTitle: string;
  createBrief: string;
  basket: EvidenceBasketPayload | null;
  evidenceCandidates: EvidenceCandidate[];
  evidenceKeyword: string;
  selectedEvidenceId: string | null;
  needs: NeedReview[];
  selectedNeedId: string | null;
  needForm: NeedFormState;
  questions: ResearchQuestion[];
  selectedQuestionId: string | null;
  questionForm: QuestionFormState;
  values: ValueAssessment[];
  selectedValueId: string | null;
  valueForm: ValueFormState;
  packages: PackageItem[];
  selectedPackageId: string | null;
  packageForm: PackageFormState;
  decisions: PromotionDecision[];
  selectedDecisionId: string | null;
  decisionForm: DecisionFormState;
  promotionTitle: string;
  selectedNeed: NeedReview | null;
  selectedQuestion: ResearchQuestion | null;
  selectedValue: ValueAssessment | null;
  selectedPackage: PackageItem | null;
  selectedDecision: PromotionDecision | null;
  selectedEvidence: EvidenceCandidate | EvidenceBasketItem | null;
  workflowQuickLinks: WorkflowQuickLink[];
  setCreateTitle: (value: string) => void;
  setCreateBrief: (value: string) => void;
  setActiveTitleCardId: (value: string | null) => void;
  setEvidenceKeyword: (value: string) => void;
  setSelectedEvidenceId: (value: string | null) => void;
  setSelectedNeedId: (value: string | null) => void;
  setNeedForm: Dispatch<SetStateAction<NeedFormState>>;
  setSelectedQuestionId: (value: string | null) => void;
  setQuestionForm: Dispatch<SetStateAction<QuestionFormState>>;
  setSelectedValueId: (value: string | null) => void;
  setValueForm: Dispatch<SetStateAction<ValueFormState>>;
  setSelectedPackageId: (value: string | null) => void;
  setPackageForm: Dispatch<SetStateAction<PackageFormState>>;
  setSelectedDecisionId: (value: string | null) => void;
  setDecisionForm: Dispatch<SetStateAction<DecisionFormState>>;
  setPromotionTitle: (value: string) => void;
  reloadWorkbench: (titleCardId?: string | null) => Promise<void>;
  createTitleCard: () => Promise<void>;
  refreshEvidenceCandidates: () => Promise<void>;
  toggleEvidenceSelection: (literatureId: string, isSelected: boolean) => Promise<void>;
  submitNeed: () => Promise<void>;
  submitQuestion: () => Promise<void>;
  submitValue: () => Promise<void>;
  submitPackage: () => Promise<void>;
  submitDecision: () => Promise<void>;
  promoteToPaper: () => Promise<void>;
};
