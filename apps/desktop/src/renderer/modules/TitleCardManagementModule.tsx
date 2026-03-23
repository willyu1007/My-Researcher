import { useEffect, useState } from 'react';
import { requestGovernance } from '../literature/shared/api';
import type { TitleCardPrimaryTabKey } from '../literature/shared/types';

type TitleCardSummary = {
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

type TitleCardListPayload = {
  items: TitleCardSummary[];
  summary: {
    total_title_cards: number;
    active_title_cards: number;
    promoted_title_cards: number;
    total_evidence_items: number;
    pending_promotion_cards: number;
  };
};

type EvidenceBasketItem = {
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

type EvidenceBasketPayload = {
  title_card_id: string;
  items: EvidenceBasketItem[];
  updated_at: string;
};

type EvidenceCandidate = {
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

type EvidenceCandidatePayload = {
  title_card_id: string;
  items: EvidenceCandidate[];
  total: number;
};

type NeedReview = {
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

type ResearchQuestion = {
  research_question_id: string;
  title_card_id: string;
  main_question: string;
  sub_questions: string[];
  research_slice: string;
  contribution_hypothesis: string;
  source_need_ids: string[];
  source_evidence_review_ids: string[];
  judgement_summary: string;
  confidence: number;
  record_status: string;
};

type ValueAssessment = {
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

type PackageItem = {
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

type PromotionDecision = {
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

function parseList(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function joinList(items: string[]): string {
  return items.join('\n');
}

function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function safeParseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function defaultValueForm(researchQuestionId = '') {
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

type TitleCardManagementModuleProps = {
  activePrimaryTab: TitleCardPrimaryTabKey;
  activeSecondaryTab: string | null;
  onSelectPrimaryTab: (tab: TitleCardPrimaryTabKey) => void;
  onSelectSecondaryTab: (tab: Exclude<TitleCardPrimaryTabKey, 'overview'>, subTab: string) => void;
};

export function TitleCardManagementModule({
  activePrimaryTab,
  activeSecondaryTab,
  onSelectPrimaryTab,
  onSelectSecondaryTab,
}: TitleCardManagementModuleProps) {
  const [titleCards, setTitleCards] = useState<TitleCardSummary[]>([]);
  const [listSummary, setListSummary] = useState<TitleCardListPayload['summary'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTitleCardId, setActiveTitleCardId] = useState<string | null>(null);
  const [titleCardDetail, setTitleCardDetail] = useState<TitleCardSummary | null>(null);

  const [createTitle, setCreateTitle] = useState('');
  const [createBrief, setCreateBrief] = useState('');

  const [basket, setBasket] = useState<EvidenceBasketPayload | null>(null);
  const [evidenceCandidates, setEvidenceCandidates] = useState<EvidenceCandidate[]>([]);
  const [evidenceKeyword, setEvidenceKeyword] = useState('');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);

  const [needs, setNeeds] = useState<NeedReview[]>([]);
  const [selectedNeedId, setSelectedNeedId] = useState<string | null>(null);
  const [needForm, setNeedForm] = useState({
    needStatement: '',
    whoNeedsIt: '',
    scenario: '',
    boundary: '',
    literatureIdsText: '',
    unmetNeedCategory: 'robustness',
    falsificationVerdict: 'validated',
    significanceScore: '4',
    measurabilityScore: '4',
    feasibilitySignal: 'medium',
    validatedNeed: true,
    judgementSummary: '',
    confidence: '0.8',
  });

  const [questions, setQuestions] = useState<ResearchQuestion[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [questionForm, setQuestionForm] = useState({
    mainQuestion: '',
    subQuestionsText: '',
    researchSlice: '',
    contributionHypothesis: 'method',
    sourceNeedIdsText: '',
    sourceEvidenceIdsText: '',
    judgementSummary: '',
    confidence: '0.8',
  });

  const [values, setValues] = useState<ValueAssessment[]>([]);
  const [selectedValueId, setSelectedValueId] = useState<string | null>(null);
  const [valueForm, setValueForm] = useState(defaultValueForm());

  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [packageForm, setPackageForm] = useState({
    researchQuestionId: '',
    valueAssessmentId: '',
    titleCandidatesText: '',
    researchBackground: '',
    contributionSummary: '',
    candidateMethodsText: '',
    evaluationPlan: '',
    keyRisksText: '',
    selectedLiteratureIdsText: '',
  });

  const [decisions, setDecisions] = useState<PromotionDecision[]>([]);
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  const [decisionForm, setDecisionForm] = useState({
    researchQuestionId: '',
    valueAssessmentId: '',
    packageId: '',
    decision: 'hold',
    reasonSummary: '',
    targetPaperTitle: '',
    loopbackTarget: '',
    createdBy: 'human',
  });
  const [promotionTitle, setPromotionTitle] = useState('');

  async function loadTitleCards(preferredId?: string | null) {
    setLoading(true);
    setError(null);
    try {
      const payload = await requestGovernance<TitleCardListPayload>({
        method: 'GET',
        path: '/title-cards',
      });
      setTitleCards(payload.items);
      setListSummary(payload.summary);
      const nextActiveId = preferredId ?? activeTitleCardId ?? payload.items[0]?.title_card_id ?? null;
      setActiveTitleCardId(nextActiveId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '加载选题题目列表失败。');
    } finally {
      setLoading(false);
    }
  }

  async function loadActiveTitleCard(titleCardId: string) {
    try {
      const [detail, basketPayload, candidatePayload, needPayload, questionPayload, valuePayload, packagePayload, decisionPayload] = await Promise.all([
        requestGovernance<TitleCardSummary>({ method: 'GET', path: `/title-cards/${encodeURIComponent(titleCardId)}` }),
        requestGovernance<EvidenceBasketPayload>({
          method: 'GET',
          path: `/title-cards/${encodeURIComponent(titleCardId)}/evidence-basket`,
        }),
        requestGovernance<EvidenceCandidatePayload>({
          method: 'GET',
          path: `/title-cards/${encodeURIComponent(titleCardId)}/evidence-candidates?selection_state=all`,
        }),
        requestGovernance<{ items: NeedReview[] }>({
          method: 'GET',
          path: `/title-cards/${encodeURIComponent(titleCardId)}/needs`,
        }),
        requestGovernance<{ items: ResearchQuestion[] }>({
          method: 'GET',
          path: `/title-cards/${encodeURIComponent(titleCardId)}/research-questions`,
        }),
        requestGovernance<{ items: ValueAssessment[] }>({
          method: 'GET',
          path: `/title-cards/${encodeURIComponent(titleCardId)}/value-assessments`,
        }),
        requestGovernance<{ items: PackageItem[] }>({
          method: 'GET',
          path: `/title-cards/${encodeURIComponent(titleCardId)}/packages`,
        }),
        requestGovernance<{ items: PromotionDecision[] }>({
          method: 'GET',
          path: `/title-cards/${encodeURIComponent(titleCardId)}/promotion-decisions`,
        }),
      ]);
      setTitleCardDetail(detail);
      setBasket(basketPayload);
      setEvidenceCandidates(candidatePayload.items);
      setNeeds(needPayload.items);
      setQuestions(questionPayload.items);
      setValues(valuePayload.items);
      setPackages(packagePayload.items);
      setDecisions(decisionPayload.items);
      setSelectedEvidenceId(candidatePayload.items[0]?.literature_id ?? null);
      setSelectedNeedId((current) => current && needPayload.items.some((item) => item.need_id === current) ? current : needPayload.items[0]?.need_id ?? null);
      setSelectedQuestionId((current) => current && questionPayload.items.some((item) => item.research_question_id === current) ? current : questionPayload.items[0]?.research_question_id ?? null);
      setSelectedValueId((current) => current && valuePayload.items.some((item) => item.value_assessment_id === current) ? current : valuePayload.items[0]?.value_assessment_id ?? null);
      setSelectedPackageId((current) => current && packagePayload.items.some((item) => item.package_id === current) ? current : packagePayload.items[0]?.package_id ?? null);
      setSelectedDecisionId((current) => current && decisionPayload.items.some((item) => item.decision_id === current) ? current : decisionPayload.items[0]?.decision_id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '加载题目卡详情失败。');
    }
  }

  async function reloadWorkbench(titleCardId?: string | null) {
    const targetId = titleCardId ?? activeTitleCardId;
    await loadTitleCards(targetId);
    if (targetId) {
      await loadActiveTitleCard(targetId);
    }
  }

  useEffect(() => {
    void loadTitleCards();
  }, []);

  useEffect(() => {
    if (!activeTitleCardId) {
      setTitleCardDetail(null);
      return;
    }
    void loadActiveTitleCard(activeTitleCardId);
  }, [activeTitleCardId]);

  const selectedNeed = needs.find((item) => item.need_id === selectedNeedId) ?? null;
  const selectedQuestion = questions.find((item) => item.research_question_id === selectedQuestionId) ?? null;
  const selectedValue = values.find((item) => item.value_assessment_id === selectedValueId) ?? null;
  const selectedPackage = packages.find((item) => item.package_id === selectedPackageId) ?? null;
  const selectedDecision = decisions.find((item) => item.decision_id === selectedDecisionId) ?? null;
  const selectedEvidence = evidenceCandidates.find((item) => item.literature_id === selectedEvidenceId)
    ?? basket?.items.find((item) => item.literature_id === selectedEvidenceId)
    ?? null;

  useEffect(() => {
    if (!selectedNeed) {
      setNeedForm({
        needStatement: '',
        whoNeedsIt: '',
        scenario: '',
        boundary: '',
        literatureIdsText: joinList(basket?.items.map((item) => item.literature_id) ?? []),
        unmetNeedCategory: 'robustness',
        falsificationVerdict: 'validated',
        significanceScore: '4',
        measurabilityScore: '4',
        feasibilitySignal: 'medium',
        validatedNeed: true,
        judgementSummary: '',
        confidence: '0.8',
      });
      return;
    }
    setNeedForm({
      needStatement: selectedNeed.need_statement,
      whoNeedsIt: selectedNeed.who_needs_it,
      scenario: selectedNeed.scenario,
      boundary: selectedNeed.boundary ?? '',
      literatureIdsText: joinList(selectedNeed.literature_ids),
      unmetNeedCategory: selectedNeed.unmet_need_category,
      falsificationVerdict: selectedNeed.falsification_verdict,
      significanceScore: String(selectedNeed.significance_score),
      measurabilityScore: String(selectedNeed.measurability_score),
      feasibilitySignal: selectedNeed.feasibility_signal,
      validatedNeed: selectedNeed.validated_need,
      judgementSummary: selectedNeed.judgement_summary,
      confidence: String(selectedNeed.confidence),
    });
  }, [selectedNeed, basket]);

  useEffect(() => {
    if (!selectedQuestion) {
      setQuestionForm({
        mainQuestion: '',
        subQuestionsText: '',
        researchSlice: '',
        contributionHypothesis: 'method',
        sourceNeedIdsText: selectedNeed ? selectedNeed.need_id : '',
        sourceEvidenceIdsText: joinList(basket?.items.map((item) => item.literature_id) ?? []),
        judgementSummary: '',
        confidence: '0.8',
      });
      return;
    }
    setQuestionForm({
      mainQuestion: selectedQuestion.main_question,
      subQuestionsText: joinList(selectedQuestion.sub_questions),
      researchSlice: selectedQuestion.research_slice,
      contributionHypothesis: selectedQuestion.contribution_hypothesis,
      sourceNeedIdsText: joinList(selectedQuestion.source_need_ids),
      sourceEvidenceIdsText: joinList(selectedQuestion.source_evidence_review_ids),
      judgementSummary: selectedQuestion.judgement_summary,
      confidence: String(selectedQuestion.confidence),
    });
  }, [selectedQuestion, selectedNeed, basket]);

  useEffect(() => {
    if (!selectedValue) {
      setValueForm(defaultValueForm(selectedQuestion?.research_question_id ?? ''));
      return;
    }
    setValueForm({
      researchQuestionId: selectedValue.research_question_id,
      strongestClaimIfSuccess: selectedValue.strongest_claim_if_success,
      fallbackClaimIfSuccess: selectedValue.fallback_claim_if_success ?? '',
      verdict: selectedValue.verdict,
      judgementSummary: selectedValue.judgement_summary,
      confidence: String(selectedValue.confidence),
      totalScore: String(selectedValue.total_score),
      ceilingCase: selectedValue.ceiling_case,
      baseCase: selectedValue.base_case,
      floorCase: selectedValue.floor_case,
      hardGatesJson: toJson(selectedValue.hard_gates),
      scoredDimensionsJson: toJson(selectedValue.scored_dimensions),
      riskPenaltyJson: toJson(selectedValue.risk_penalty),
      reviewerObjectionsText: joinList(selectedValue.reviewer_objections),
      requiredRefinementsText: joinList(selectedValue.required_refinements),
      nextActionsText: joinList(selectedValue.next_actions),
    });
  }, [selectedValue, selectedQuestion]);

  useEffect(() => {
    if (!selectedPackage) {
      setPackageForm({
        researchQuestionId: selectedQuestion?.research_question_id ?? '',
        valueAssessmentId: selectedValue?.value_assessment_id ?? '',
        titleCandidatesText: '',
        researchBackground: '',
        contributionSummary: '',
        candidateMethodsText: '',
        evaluationPlan: '',
        keyRisksText: '',
        selectedLiteratureIdsText: joinList(basket?.items.map((item) => item.literature_id) ?? []),
      });
      return;
    }
    setPackageForm({
      researchQuestionId: selectedPackage.research_question_id,
      valueAssessmentId: selectedPackage.value_assessment_id,
      titleCandidatesText: joinList(selectedPackage.title_candidates),
      researchBackground: selectedPackage.research_background,
      contributionSummary: selectedPackage.contribution_summary,
      candidateMethodsText: joinList(selectedPackage.candidate_methods),
      evaluationPlan: selectedPackage.evaluation_plan,
      keyRisksText: joinList(selectedPackage.key_risks),
      selectedLiteratureIdsText: joinList(selectedPackage.selected_literature_evidence_ids),
    });
  }, [selectedPackage, selectedQuestion, selectedValue, basket]);

  useEffect(() => {
    if (!selectedDecision) {
      setDecisionForm({
        researchQuestionId: selectedQuestion?.research_question_id ?? '',
        valueAssessmentId: selectedValue?.value_assessment_id ?? '',
        packageId: selectedPackage?.package_id ?? '',
        decision: 'hold',
        reasonSummary: '',
        targetPaperTitle: '',
        loopbackTarget: '',
        createdBy: 'human',
      });
      setPromotionTitle(selectedPackage?.title_candidates[0] ?? titleCardDetail?.working_title ?? '');
      return;
    }
    setDecisionForm({
      researchQuestionId: selectedDecision.research_question_id,
      valueAssessmentId: selectedDecision.value_assessment_id,
      packageId: selectedDecision.package_id ?? '',
      decision: selectedDecision.decision,
      reasonSummary: selectedDecision.reason_summary,
      targetPaperTitle: selectedDecision.target_paper_title ?? '',
      loopbackTarget: selectedDecision.loopback_target ?? '',
      createdBy: selectedDecision.created_by,
    });
    setPromotionTitle(selectedDecision.target_paper_title ?? selectedPackage?.title_candidates[0] ?? '');
  }, [selectedDecision, selectedQuestion, selectedValue, selectedPackage, titleCardDetail]);

  async function createTitleCard() {
    if (!createTitle.trim() || !createBrief.trim()) {
      setError('工作题目和简述都不能为空。');
      return;
    }
    try {
      const created = await requestGovernance<TitleCardSummary>({
        method: 'POST',
        path: '/title-cards',
        body: {
          working_title: createTitle.trim(),
          brief: createBrief.trim(),
        },
      });
      setCreateTitle('');
      setCreateBrief('');
      setMessage('已创建选题题目。');
      await reloadWorkbench(created.title_card_id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '创建题目卡失败。');
    }
  }

  async function refreshEvidenceCandidates() {
    if (!activeTitleCardId) {
      return;
    }
    const search = new URLSearchParams();
    search.set('selection_state', 'all');
    if (evidenceKeyword.trim()) {
      search.set('keyword', evidenceKeyword.trim());
    }
    try {
      const payload = await requestGovernance<EvidenceCandidatePayload>({
        method: 'GET',
        path: `/title-cards/${encodeURIComponent(activeTitleCardId)}/evidence-candidates?${search.toString()}`,
      });
      setEvidenceCandidates(payload.items);
      setSelectedEvidenceId(payload.items[0]?.literature_id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '加载证据候选失败。');
    }
  }

  async function toggleEvidenceSelection(literatureId: string, isSelected: boolean) {
    if (!activeTitleCardId) {
      return;
    }
    try {
      await requestGovernance({
        method: 'PATCH',
        path: `/title-cards/${encodeURIComponent(activeTitleCardId)}/evidence-basket`,
        body: isSelected
          ? { remove_literature_ids: [literatureId] }
          : { add_literature_ids: [literatureId] },
      });
      setMessage(isSelected ? '已从证据篮子移除。' : '已加入证据篮子。');
      await reloadWorkbench(activeTitleCardId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '更新证据篮子失败。');
    }
  }

  async function submitNeed() {
    if (!activeTitleCardId) {
      return;
    }
    const payload = {
      need_statement: needForm.needStatement,
      who_needs_it: needForm.whoNeedsIt,
      scenario: needForm.scenario,
      boundary: needForm.boundary || undefined,
      literature_ids: parseList(needForm.literatureIdsText),
      unmet_need_category: needForm.unmetNeedCategory,
      falsification_verdict: needForm.falsificationVerdict,
      significance_score: Number(needForm.significanceScore),
      measurability_score: Number(needForm.measurabilityScore),
      feasibility_signal: needForm.feasibilitySignal,
      validated_need: needForm.validatedNeed,
      judgement_summary: needForm.judgementSummary,
      confidence: Number(needForm.confidence),
      evidence_refs: parseList(needForm.literatureIdsText).map((literatureId) => ({
        literature_id: literatureId,
        source_type: 'abstract',
      })),
    };
    try {
      if (selectedNeed) {
        await requestGovernance({
          method: 'PATCH',
          path: `/title-cards/${encodeURIComponent(activeTitleCardId)}/needs/${encodeURIComponent(selectedNeed.need_id)}`,
          body: payload,
        });
      } else {
        await requestGovernance({
          method: 'POST',
          path: `/title-cards/${encodeURIComponent(activeTitleCardId)}/needs`,
          body: payload,
        });
      }
      setMessage('Need 已保存。');
      await reloadWorkbench(activeTitleCardId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存 Need 失败。');
    }
  }

  async function submitQuestion() {
    if (!activeTitleCardId) {
      return;
    }
    const payload = {
      main_question: questionForm.mainQuestion,
      sub_questions: parseList(questionForm.subQuestionsText),
      research_slice: questionForm.researchSlice,
      contribution_hypothesis: questionForm.contributionHypothesis,
      source_need_ids: parseList(questionForm.sourceNeedIdsText),
      source_evidence_review_ids: parseList(questionForm.sourceEvidenceIdsText),
      judgement_summary: questionForm.judgementSummary,
      confidence: Number(questionForm.confidence),
    };
    try {
      if (selectedQuestion) {
        await requestGovernance({
          method: 'PATCH',
          path: `/title-cards/${encodeURIComponent(activeTitleCardId)}/research-questions/${encodeURIComponent(selectedQuestion.research_question_id)}`,
          body: payload,
        });
      } else {
        await requestGovernance({
          method: 'POST',
          path: `/title-cards/${encodeURIComponent(activeTitleCardId)}/research-questions`,
          body: payload,
        });
      }
      setMessage('Research Question 已保存。');
      await reloadWorkbench(activeTitleCardId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存 Research Question 失败。');
    }
  }

  async function submitValue() {
    if (!activeTitleCardId) {
      return;
    }
    const payload = {
      research_question_id: valueForm.researchQuestionId,
      strongest_claim_if_success: valueForm.strongestClaimIfSuccess,
      fallback_claim_if_success: valueForm.fallbackClaimIfSuccess || undefined,
      verdict: valueForm.verdict,
      judgement_summary: valueForm.judgementSummary,
      confidence: Number(valueForm.confidence),
      total_score: Number(valueForm.totalScore),
      ceiling_case: valueForm.ceilingCase,
      base_case: valueForm.baseCase,
      floor_case: valueForm.floorCase,
      hard_gates: safeParseJson(valueForm.hardGatesJson, {}),
      scored_dimensions: safeParseJson(valueForm.scoredDimensionsJson, {}),
      risk_penalty: safeParseJson(valueForm.riskPenaltyJson, {}),
      reviewer_objections: parseList(valueForm.reviewerObjectionsText),
      required_refinements: parseList(valueForm.requiredRefinementsText),
      next_actions: parseList(valueForm.nextActionsText),
      evidence_refs: (basket?.items ?? []).map((item) => ({
        literature_id: item.literature_id,
        source_type: 'abstract',
      })),
    };
    try {
      if (selectedValue) {
        await requestGovernance({
          method: 'PATCH',
          path: `/title-cards/${encodeURIComponent(activeTitleCardId)}/value-assessments/${encodeURIComponent(selectedValue.value_assessment_id)}`,
          body: payload,
        });
      } else {
        await requestGovernance({
          method: 'POST',
          path: `/title-cards/${encodeURIComponent(activeTitleCardId)}/value-assessments`,
          body: payload,
        });
      }
      setMessage('Value 已保存。');
      await reloadWorkbench(activeTitleCardId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存 Value 失败。');
    }
  }

  async function submitPackage() {
    if (!activeTitleCardId) {
      return;
    }
    const payload = {
      research_question_id: packageForm.researchQuestionId,
      value_assessment_id: packageForm.valueAssessmentId,
      title_candidates: parseList(packageForm.titleCandidatesText),
      research_background: packageForm.researchBackground,
      contribution_summary: packageForm.contributionSummary,
      candidate_methods: parseList(packageForm.candidateMethodsText),
      evaluation_plan: packageForm.evaluationPlan,
      key_risks: parseList(packageForm.keyRisksText),
      selected_literature_evidence_ids: parseList(packageForm.selectedLiteratureIdsText),
    };
    try {
      if (selectedPackage) {
        await requestGovernance({
          method: 'PATCH',
          path: `/title-cards/${encodeURIComponent(activeTitleCardId)}/packages/${encodeURIComponent(selectedPackage.package_id)}`,
          body: payload,
        });
      } else {
        await requestGovernance({
          method: 'POST',
          path: `/title-cards/${encodeURIComponent(activeTitleCardId)}/packages`,
          body: payload,
        });
      }
      setMessage('Package 已保存。');
      await reloadWorkbench(activeTitleCardId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存 Package 失败。');
    }
  }

  async function submitDecision() {
    if (!activeTitleCardId) {
      return;
    }
    const payload = {
      research_question_id: decisionForm.researchQuestionId,
      value_assessment_id: decisionForm.valueAssessmentId,
      package_id: decisionForm.packageId || undefined,
      decision: decisionForm.decision,
      reason_summary: decisionForm.reasonSummary,
      target_paper_title: decisionForm.targetPaperTitle || undefined,
      loopback_target: decisionForm.loopbackTarget || undefined,
      created_by: decisionForm.createdBy,
    };
    try {
      if (selectedDecision) {
        await requestGovernance({
          method: 'PATCH',
          path: `/title-cards/${encodeURIComponent(activeTitleCardId)}/promotion-decisions/${encodeURIComponent(selectedDecision.decision_id)}`,
          body: payload,
        });
      } else {
        await requestGovernance({
          method: 'POST',
          path: `/title-cards/${encodeURIComponent(activeTitleCardId)}/promotion-decisions`,
          body: payload,
        });
      }
      setMessage('Promotion decision 已保存。');
      await reloadWorkbench(activeTitleCardId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存 Promotion decision 失败。');
    }
  }

  async function promoteToPaper() {
    if (!activeTitleCardId) {
      return;
    }
    try {
      const result = await requestGovernance<{ paper_id: string; decision_id: string }>({
        method: 'POST',
        path: `/title-cards/${encodeURIComponent(activeTitleCardId)}/promote-to-paper-project`,
        body: {
          research_question_id: decisionForm.researchQuestionId,
          value_assessment_id: decisionForm.valueAssessmentId,
          package_id: decisionForm.packageId,
          title: promotionTitle,
          created_by: 'hybrid',
        },
      });
      setMessage(`已晋升为 paper-project：${result.paper_id}`);
      await reloadWorkbench(activeTitleCardId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '晋升 paper-project 失败。');
    }
  }

  const workflowQuickLinks: Array<{ label: string; tab: TitleCardPrimaryTabKey; subTab: string }> = [
    { label: 'Evidence', tab: 'evidence', subTab: 'candidates' },
    { label: 'Need', tab: 'need', subTab: 'list' },
    { label: 'Research Question', tab: 'research-question', subTab: 'list' },
    { label: 'Value', tab: 'value', subTab: 'list' },
    { label: 'Package', tab: 'package', subTab: 'list' },
    { label: 'Promotion', tab: 'promotion', subTab: 'decision' },
  ];

  return (
    <section className="module-dashboard">
      <div data-ui="stack" data-direction="col" data-gap="3">
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <div data-ui="stack" data-direction="col" data-gap="1">
            <p data-ui="text" data-variant="h3" data-tone="primary">选题题目工作台</p>
            <p data-ui="text" data-variant="caption" data-tone="muted">
              语义已切到：检索主题仅做上游拉取，题目卡才是选题流程根对象。
            </p>
          </div>
          <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={() => void reloadWorkbench()}>
            刷新
          </button>
        </div>

        {error ? <p data-ui="text" data-variant="caption" data-tone="danger">{error}</p> : null}
        {message ? <p data-ui="text" data-variant="caption" data-tone="muted">{message}</p> : null}
        {loading ? <p data-ui="text" data-variant="caption" data-tone="muted">正在加载题目卡列表...</p> : null}

        {activePrimaryTab === 'overview' ? (
          <div data-ui="stack" data-direction="col" data-gap="3">
            <div data-ui="grid" data-cols="4" data-gap="3">
              <article data-ui="card">
                <p data-ui="text" data-variant="label" data-tone="muted">题目卡总数</p>
                <p data-ui="text" data-variant="h3" data-tone="primary">{listSummary?.total_title_cards ?? 0}</p>
              </article>
              <article data-ui="card">
                <p data-ui="text" data-variant="label" data-tone="muted">活跃题目卡</p>
                <p data-ui="text" data-variant="h3" data-tone="primary">{listSummary?.active_title_cards ?? 0}</p>
              </article>
              <article data-ui="card">
                <p data-ui="text" data-variant="label" data-tone="muted">待晋升题目</p>
                <p data-ui="text" data-variant="h3" data-tone="primary">{listSummary?.pending_promotion_cards ?? 0}</p>
              </article>
              <article data-ui="card">
                <p data-ui="text" data-variant="label" data-tone="muted">证据篮子总量</p>
                <p data-ui="text" data-variant="h3" data-tone="primary">{listSummary?.total_evidence_items ?? 0}</p>
              </article>
            </div>

            <div data-ui="grid" data-cols="2" data-gap="3">
              <article data-ui="card">
                <div data-ui="stack" data-direction="col" data-gap="2">
                  <p data-ui="text" data-variant="label" data-tone="primary">新建题目卡</p>
                  <input
                    data-ui="input"
                    value={createTitle}
                    onChange={(event) => setCreateTitle(event.target.value)}
                    placeholder="工作题目"
                  />
                  <textarea
                    data-ui="textarea"
                    value={createBrief}
                    onChange={(event) => setCreateBrief(event.target.value)}
                    placeholder="简述"
                    rows={4}
                  />
                  <button data-ui="button" data-variant="primary" type="button" onClick={() => void createTitleCard()}>
                    创建题目卡
                  </button>
                </div>
              </article>

              <article data-ui="card">
                <div data-ui="stack" data-direction="col" data-gap="2">
                  <p data-ui="text" data-variant="label" data-tone="primary">题目卡列表</p>
                  {titleCards.length === 0 ? (
                    <p data-ui="text" data-variant="caption" data-tone="muted">当前还没有题目卡。</p>
                  ) : (
                    titleCards.map((card) => (
                      <button
                        key={card.title_card_id}
                        data-ui="button"
                        data-variant={activeTitleCardId === card.title_card_id ? 'primary' : 'secondary'}
                        type="button"
                        onClick={() => setActiveTitleCardId(card.title_card_id)}
                      >
                        {card.working_title}
                      </button>
                    ))
                  )}
                </div>
              </article>
            </div>

            {titleCardDetail ? (
              <article data-ui="card">
                <div data-ui="stack" data-direction="col" data-gap="3">
                  <div data-ui="toolbar" data-align="between" data-wrap="wrap">
                    <div data-ui="stack" data-direction="col" data-gap="1">
                      <p data-ui="text" data-variant="h3" data-tone="primary">{titleCardDetail.working_title}</p>
                      <p data-ui="text" data-variant="body" data-tone="muted">{titleCardDetail.brief}</p>
                    </div>
                    <div data-ui="stack" data-direction="row" data-gap="2" data-wrap="wrap" data-align="center">
                      <span data-ui="badge" data-variant="subtle" data-tone="neutral">状态：{titleCardDetail.status}</span>
                      {titleCardDetail.latest_paper_id ? (
                        <span data-ui="badge" data-variant="subtle" data-tone="neutral">Paper: {titleCardDetail.latest_paper_id}</span>
                      ) : null}
                    </div>
                  </div>
                  <div data-ui="grid" data-cols="3" data-gap="2">
                    <article data-ui="card">
                      <p data-ui="text" data-variant="label" data-tone="muted">Evidence</p>
                      <p data-ui="text" data-variant="h3" data-tone="primary">{titleCardDetail.evidence_count}</p>
                    </article>
                    <article data-ui="card">
                      <p data-ui="text" data-variant="label" data-tone="muted">Need</p>
                      <p data-ui="text" data-variant="h3" data-tone="primary">{titleCardDetail.need_count}</p>
                    </article>
                    <article data-ui="card">
                      <p data-ui="text" data-variant="label" data-tone="muted">Research Question</p>
                      <p data-ui="text" data-variant="h3" data-tone="primary">{titleCardDetail.research_question_count}</p>
                    </article>
                    <article data-ui="card">
                      <p data-ui="text" data-variant="label" data-tone="muted">Value</p>
                      <p data-ui="text" data-variant="h3" data-tone="primary">{titleCardDetail.value_assessment_count}</p>
                    </article>
                    <article data-ui="card">
                      <p data-ui="text" data-variant="label" data-tone="muted">Package</p>
                      <p data-ui="text" data-variant="h3" data-tone="primary">{titleCardDetail.package_count}</p>
                    </article>
                    <article data-ui="card">
                      <p data-ui="text" data-variant="label" data-tone="muted">Promotion</p>
                      <p data-ui="text" data-variant="h3" data-tone="primary">{titleCardDetail.promotion_decision_count}</p>
                    </article>
                  </div>
                  <div data-ui="toolbar" data-wrap="wrap">
                    {workflowQuickLinks.map((item) => (
                      <button
                        key={item.label}
                        data-ui="button"
                        data-variant="secondary"
                        type="button"
                        onClick={() => onSelectSecondaryTab(item.tab as Exclude<TitleCardPrimaryTabKey, 'overview'>, item.subTab)}
                      >
                        进入 {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ) : null}
          </div>
        ) : titleCardDetail ? (
          <div data-ui="stack" data-direction="col" data-gap="3">
            <article data-ui="card">
              <div data-ui="toolbar" data-align="between" data-wrap="wrap">
                <div data-ui="stack" data-direction="col" data-gap="1">
                  <p data-ui="text" data-variant="h3" data-tone="primary">{titleCardDetail.working_title}</p>
                  <p data-ui="text" data-variant="body" data-tone="muted">{titleCardDetail.brief}</p>
                </div>
                <div data-ui="stack" data-direction="row" data-gap="2" data-wrap="wrap" data-align="center">
                  <span data-ui="badge" data-variant="subtle" data-tone="neutral">状态：{titleCardDetail.status}</span>
                  {titleCardDetail.latest_paper_id ? (
                    <span data-ui="badge" data-variant="subtle" data-tone="neutral">Paper: {titleCardDetail.latest_paper_id}</span>
                  ) : null}
                </div>
              </div>
            </article>

            {activePrimaryTab === 'evidence' && activeSecondaryTab === 'candidates' ? (
              <div data-ui="grid" data-cols="2" data-gap="3">
                <article data-ui="card">
                  <div data-ui="stack" data-direction="col" data-gap="2">
                    <div data-ui="toolbar" data-wrap="wrap">
                      <input
                        data-ui="input"
                        value={evidenceKeyword}
                        onChange={(event) => setEvidenceKeyword(event.target.value)}
                        placeholder="关键词过滤"
                      />
                      <button data-ui="button" data-variant="secondary" type="button" onClick={() => void refreshEvidenceCandidates()}>
                        搜索候选
                      </button>
                      <button data-ui="button" data-variant="secondary" type="button" onClick={() => onSelectSecondaryTab('evidence', 'inspector')}>
                        打开检查器
                      </button>
                    </div>
                    <p data-ui="text" data-variant="label" data-tone="muted">Evidence Candidates</p>
                    {evidenceCandidates.map((item) => (
                      <div key={item.literature_id} data-ui="stack" data-direction="col" data-gap="1">
                        <button
                          data-ui="button"
                          data-variant={selectedEvidenceId === item.literature_id ? 'primary' : 'secondary'}
                          type="button"
                          onClick={() => setSelectedEvidenceId(item.literature_id)}
                        >
                          {item.title}
                        </button>
                        <button
                          data-ui="button"
                          data-variant="secondary"
                          type="button"
                          onClick={() => void toggleEvidenceSelection(item.literature_id, item.selection_state === 'selected')}
                        >
                          {item.selection_state === 'selected' ? '移出篮子' : '加入篮子'}
                        </button>
                      </div>
                    ))}
                  </div>
                </article>
                <article data-ui="card">
                  <div data-ui="stack" data-direction="col" data-gap="2">
                    <p data-ui="text" data-variant="label" data-tone="primary">当前选中候选</p>
                    {selectedEvidence ? <pre>{toJson(selectedEvidence)}</pre> : (
                      <p data-ui="text" data-variant="caption" data-tone="muted">选择一条候选证据后，可切到检查器查看详情。</p>
                    )}
                  </div>
                </article>
              </div>
            ) : null}

            {activePrimaryTab === 'evidence' && activeSecondaryTab === 'basket' ? (
              <article data-ui="card">
                <div data-ui="stack" data-direction="col" data-gap="2">
                  <p data-ui="text" data-variant="label" data-tone="primary">证据篮</p>
                  {basket?.items.length ? basket.items.map((item) => (
                    <div key={item.literature_id} data-ui="stack" data-direction="col" data-gap="1">
                      <button
                        data-ui="button"
                        data-variant={selectedEvidenceId === item.literature_id ? 'primary' : 'secondary'}
                        type="button"
                        onClick={() => setSelectedEvidenceId(item.literature_id)}
                      >
                        {item.title}
                      </button>
                      <div data-ui="toolbar" data-wrap="wrap">
                        <button data-ui="button" data-variant="secondary" type="button" onClick={() => onSelectSecondaryTab('evidence', 'inspector')}>
                          查看检查器
                        </button>
                        <button data-ui="button" data-variant="secondary" type="button" onClick={() => void toggleEvidenceSelection(item.literature_id, true)}>
                          移出篮子
                        </button>
                      </div>
                    </div>
                  )) : (
                    <p data-ui="text" data-variant="caption" data-tone="muted">当前题目卡还没有加入证据。</p>
                  )}
                </div>
              </article>
            ) : null}

            {activePrimaryTab === 'evidence' && activeSecondaryTab === 'inspector' ? (
              <article data-ui="card">
                <div data-ui="stack" data-direction="col" data-gap="2">
                  <p data-ui="text" data-variant="label" data-tone="primary">证据检查器</p>
                  {selectedEvidence ? (
                    <>
                      <p data-ui="text" data-variant="body" data-tone="primary">{selectedEvidence.title}</p>
                      <p data-ui="text" data-variant="caption" data-tone="muted">
                        {selectedEvidence.authors.join(', ') || '--'} · {selectedEvidence.year ?? '--'} · {selectedEvidence.provider ?? '--'}
                      </p>
                      <p data-ui="text" data-variant="caption" data-tone="muted">
                        rights={selectedEvidence.rights_class} · pipeline={selectedEvidence.pipeline_ready ? 'ready' : 'not_ready'}
                      </p>
                      <pre>{toJson(selectedEvidence)}</pre>
                    </>
                  ) : (
                    <p data-ui="text" data-variant="caption" data-tone="muted">请先在候选证据或证据篮中选择一条证据。</p>
                  )}
                </div>
              </article>
            ) : null}

            {activePrimaryTab === 'need' && activeSecondaryTab === 'list' ? (
              <article data-ui="card">
                <div data-ui="stack" data-direction="col" data-gap="2">
                  <p data-ui="text" data-variant="label" data-tone="primary">Need 列表</p>
                  {needs.map((item) => (
                    <button
                      key={item.need_id}
                      data-ui="button"
                      data-variant={selectedNeedId === item.need_id ? 'primary' : 'secondary'}
                      type="button"
                      onClick={() => {
                        setSelectedNeedId(item.need_id);
                        onSelectSecondaryTab('need', 'editor');
                      }}
                    >
                      {item.need_statement}
                    </button>
                  ))}
                  <button data-ui="button" data-variant="secondary" type="button" onClick={() => {
                    setSelectedNeedId(null);
                    onSelectSecondaryTab('need', 'editor');
                  }}>
                    新建 Need
                  </button>
                </div>
              </article>
            ) : null}

            {activePrimaryTab === 'need' && activeSecondaryTab === 'editor' ? (
              <div data-ui="grid" data-cols="2" data-gap="3">
                <article data-ui="card">
                  <div data-ui="stack" data-direction="col" data-gap="2">
                    <p data-ui="text" data-variant="label" data-tone="primary">Need 表单 / 检查器</p>
                    <textarea data-ui="textarea" rows={3} value={needForm.needStatement} onChange={(event) => setNeedForm((current) => ({ ...current, needStatement: event.target.value }))} placeholder="Need statement" />
                    <input data-ui="input" value={needForm.whoNeedsIt} onChange={(event) => setNeedForm((current) => ({ ...current, whoNeedsIt: event.target.value }))} placeholder="Who needs it" />
                    <textarea data-ui="textarea" rows={2} value={needForm.scenario} onChange={(event) => setNeedForm((current) => ({ ...current, scenario: event.target.value }))} placeholder="Scenario" />
                    <textarea data-ui="textarea" rows={3} value={needForm.literatureIdsText} onChange={(event) => setNeedForm((current) => ({ ...current, literatureIdsText: event.target.value }))} placeholder="每行一个 literature_id" />
                    <textarea data-ui="textarea" rows={2} value={needForm.judgementSummary} onChange={(event) => setNeedForm((current) => ({ ...current, judgementSummary: event.target.value }))} placeholder="Judgement summary" />
                    <div data-ui="toolbar" data-wrap="wrap">
                      <button data-ui="button" data-variant="primary" type="button" onClick={() => void submitNeed()}>
                        {selectedNeed ? 'PATCH 当前 Need' : '创建 Need'}
                      </button>
                      <button data-ui="button" data-variant="secondary" type="button" onClick={() => onSelectSecondaryTab('need', 'list')}>
                        返回列表
                      </button>
                    </div>
                  </div>
                </article>
                <article data-ui="card">
                  <div data-ui="stack" data-direction="col" data-gap="2">
                    <p data-ui="text" data-variant="label" data-tone="muted">当前记录</p>
                    <pre>{toJson(selectedNeed)}</pre>
                  </div>
                </article>
              </div>
            ) : null}

            {activePrimaryTab === 'research-question' && activeSecondaryTab === 'list' ? (
              <article data-ui="card">
                <div data-ui="stack" data-direction="col" data-gap="2">
                  <p data-ui="text" data-variant="label" data-tone="primary">Research Question 列表</p>
                  {questions.map((item) => (
                    <button
                      key={item.research_question_id}
                      data-ui="button"
                      data-variant={selectedQuestionId === item.research_question_id ? 'primary' : 'secondary'}
                      type="button"
                      onClick={() => {
                        setSelectedQuestionId(item.research_question_id);
                        onSelectSecondaryTab('research-question', 'editor');
                      }}
                    >
                      {item.main_question}
                    </button>
                  ))}
                  <button data-ui="button" data-variant="secondary" type="button" onClick={() => {
                    setSelectedQuestionId(null);
                    onSelectSecondaryTab('research-question', 'editor');
                  }}>
                    新建 Research Question
                  </button>
                </div>
              </article>
            ) : null}

            {activePrimaryTab === 'research-question' && activeSecondaryTab === 'editor' ? (
              <div data-ui="grid" data-cols="2" data-gap="3">
                <article data-ui="card">
                  <div data-ui="stack" data-direction="col" data-gap="2">
                    <p data-ui="text" data-variant="label" data-tone="primary">Research Question 表单 / 检查器</p>
                    <textarea data-ui="textarea" rows={3} value={questionForm.mainQuestion} onChange={(event) => setQuestionForm((current) => ({ ...current, mainQuestion: event.target.value }))} placeholder="Main question" />
                    <input data-ui="input" value={questionForm.researchSlice} onChange={(event) => setQuestionForm((current) => ({ ...current, researchSlice: event.target.value }))} placeholder="Research slice" />
                    <textarea data-ui="textarea" rows={2} value={questionForm.sourceNeedIdsText} onChange={(event) => setQuestionForm((current) => ({ ...current, sourceNeedIdsText: event.target.value }))} placeholder="每行一个 source_need_id" />
                    <textarea data-ui="textarea" rows={2} value={questionForm.sourceEvidenceIdsText} onChange={(event) => setQuestionForm((current) => ({ ...current, sourceEvidenceIdsText: event.target.value }))} placeholder="每行一个 source_evidence_review_id（当前用已选 literature_id）" />
                    <textarea data-ui="textarea" rows={2} value={questionForm.judgementSummary} onChange={(event) => setQuestionForm((current) => ({ ...current, judgementSummary: event.target.value }))} placeholder="Judgement summary" />
                    <div data-ui="toolbar" data-wrap="wrap">
                      <button data-ui="button" data-variant="primary" type="button" onClick={() => void submitQuestion()}>
                        {selectedQuestion ? 'PATCH 当前 Research Question' : '创建 Research Question'}
                      </button>
                      <button data-ui="button" data-variant="secondary" type="button" onClick={() => onSelectSecondaryTab('research-question', 'list')}>
                        返回列表
                      </button>
                    </div>
                  </div>
                </article>
                <article data-ui="card">
                  <div data-ui="stack" data-direction="col" data-gap="2">
                    <p data-ui="text" data-variant="label" data-tone="muted">当前记录</p>
                    <pre>{toJson(selectedQuestion)}</pre>
                  </div>
                </article>
              </div>
            ) : null}

            {activePrimaryTab === 'value' && activeSecondaryTab === 'list' ? (
              <article data-ui="card">
                <div data-ui="stack" data-direction="col" data-gap="2">
                  <p data-ui="text" data-variant="label" data-tone="primary">Value 列表</p>
                  {values.map((item) => (
                    <button
                      key={item.value_assessment_id}
                      data-ui="button"
                      data-variant={selectedValueId === item.value_assessment_id ? 'primary' : 'secondary'}
                      type="button"
                      onClick={() => {
                        setSelectedValueId(item.value_assessment_id);
                        onSelectSecondaryTab('value', 'editor');
                      }}
                    >
                      {item.strongest_claim_if_success}
                    </button>
                  ))}
                  <button data-ui="button" data-variant="secondary" type="button" onClick={() => {
                    setSelectedValueId(null);
                    onSelectSecondaryTab('value', 'editor');
                  }}>
                    新建 Value
                  </button>
                </div>
              </article>
            ) : null}

            {activePrimaryTab === 'value' && activeSecondaryTab === 'editor' ? (
              <div data-ui="grid" data-cols="2" data-gap="3">
                <article data-ui="card">
                  <div data-ui="stack" data-direction="col" data-gap="2">
                    <p data-ui="text" data-variant="label" data-tone="primary">Value 表单 / 检查器</p>
                    <input data-ui="input" value={valueForm.researchQuestionId} onChange={(event) => setValueForm((current) => ({ ...current, researchQuestionId: event.target.value }))} placeholder="research_question_id" />
                    <textarea data-ui="textarea" rows={3} value={valueForm.strongestClaimIfSuccess} onChange={(event) => setValueForm((current) => ({ ...current, strongestClaimIfSuccess: event.target.value }))} placeholder="Strongest claim if success" />
                    <textarea data-ui="textarea" rows={2} value={valueForm.judgementSummary} onChange={(event) => setValueForm((current) => ({ ...current, judgementSummary: event.target.value }))} placeholder="Judgement summary" />
                    <textarea data-ui="textarea" rows={6} value={valueForm.hardGatesJson} onChange={(event) => setValueForm((current) => ({ ...current, hardGatesJson: event.target.value }))} placeholder="hard_gates JSON" />
                    <textarea data-ui="textarea" rows={6} value={valueForm.scoredDimensionsJson} onChange={(event) => setValueForm((current) => ({ ...current, scoredDimensionsJson: event.target.value }))} placeholder="scored_dimensions JSON" />
                    <textarea data-ui="textarea" rows={5} value={valueForm.riskPenaltyJson} onChange={(event) => setValueForm((current) => ({ ...current, riskPenaltyJson: event.target.value }))} placeholder="risk_penalty JSON" />
                    <div data-ui="toolbar" data-wrap="wrap">
                      <button data-ui="button" data-variant="primary" type="button" onClick={() => void submitValue()}>
                        {selectedValue ? 'PATCH 当前 Value' : '创建 Value'}
                      </button>
                      <button data-ui="button" data-variant="secondary" type="button" onClick={() => onSelectSecondaryTab('value', 'list')}>
                        返回列表
                      </button>
                    </div>
                  </div>
                </article>
                <article data-ui="card">
                  <div data-ui="stack" data-direction="col" data-gap="2">
                    <p data-ui="text" data-variant="label" data-tone="muted">当前记录</p>
                    <pre>{toJson(selectedValue)}</pre>
                  </div>
                </article>
              </div>
            ) : null}

            {activePrimaryTab === 'package' && activeSecondaryTab === 'list' ? (
              <article data-ui="card">
                <div data-ui="stack" data-direction="col" data-gap="2">
                  <p data-ui="text" data-variant="label" data-tone="primary">Package 列表</p>
                  {packages.map((item) => (
                    <button
                      key={item.package_id}
                      data-ui="button"
                      data-variant={selectedPackageId === item.package_id ? 'primary' : 'secondary'}
                      type="button"
                      onClick={() => {
                        setSelectedPackageId(item.package_id);
                        onSelectSecondaryTab('package', 'editor');
                      }}
                    >
                      {item.title_candidates[0] ?? item.package_id}
                    </button>
                  ))}
                  <button data-ui="button" data-variant="secondary" type="button" onClick={() => {
                    setSelectedPackageId(null);
                    onSelectSecondaryTab('package', 'editor');
                  }}>
                    新建 Package
                  </button>
                </div>
              </article>
            ) : null}

            {activePrimaryTab === 'package' && activeSecondaryTab === 'editor' ? (
              <div data-ui="grid" data-cols="2" data-gap="3">
                <article data-ui="card">
                  <div data-ui="stack" data-direction="col" data-gap="2">
                    <p data-ui="text" data-variant="label" data-tone="primary">Package 表单 / 检查器</p>
                    <input data-ui="input" value={packageForm.researchQuestionId} onChange={(event) => setPackageForm((current) => ({ ...current, researchQuestionId: event.target.value }))} placeholder="research_question_id" />
                    <input data-ui="input" value={packageForm.valueAssessmentId} onChange={(event) => setPackageForm((current) => ({ ...current, valueAssessmentId: event.target.value }))} placeholder="value_assessment_id" />
                    <textarea data-ui="textarea" rows={3} value={packageForm.titleCandidatesText} onChange={(event) => setPackageForm((current) => ({ ...current, titleCandidatesText: event.target.value }))} placeholder="每行一个 title candidate" />
                    <textarea data-ui="textarea" rows={3} value={packageForm.researchBackground} onChange={(event) => setPackageForm((current) => ({ ...current, researchBackground: event.target.value }))} placeholder="Research background" />
                    <textarea data-ui="textarea" rows={2} value={packageForm.contributionSummary} onChange={(event) => setPackageForm((current) => ({ ...current, contributionSummary: event.target.value }))} placeholder="Contribution summary" />
                    <textarea data-ui="textarea" rows={3} value={packageForm.selectedLiteratureIdsText} onChange={(event) => setPackageForm((current) => ({ ...current, selectedLiteratureIdsText: event.target.value }))} placeholder="每行一个 selected_literature_evidence_id" />
                    <div data-ui="toolbar" data-wrap="wrap">
                      <button data-ui="button" data-variant="primary" type="button" onClick={() => void submitPackage()}>
                        {selectedPackage ? 'PATCH 当前 Package' : '创建 Package'}
                      </button>
                      <button data-ui="button" data-variant="secondary" type="button" onClick={() => onSelectSecondaryTab('package', 'list')}>
                        返回列表
                      </button>
                    </div>
                  </div>
                </article>
                <article data-ui="card">
                  <div data-ui="stack" data-direction="col" data-gap="2">
                    <p data-ui="text" data-variant="label" data-tone="muted">当前记录</p>
                    <pre>{toJson(selectedPackage)}</pre>
                  </div>
                </article>
              </div>
            ) : null}

            {activePrimaryTab === 'promotion' && activeSecondaryTab === 'decision' ? (
              <div data-ui="grid" data-cols="2" data-gap="3">
                <article data-ui="card">
                  <div data-ui="stack" data-direction="col" data-gap="2">
                    <p data-ui="text" data-variant="label" data-tone="primary">Promotion 决策列表</p>
                    {decisions.map((item) => (
                      <button
                        key={item.decision_id}
                        data-ui="button"
                        data-variant={selectedDecisionId === item.decision_id ? 'primary' : 'secondary'}
                        type="button"
                        onClick={() => setSelectedDecisionId(item.decision_id)}
                      >
                        {item.decision} · {item.target_paper_title ?? item.reason_summary}
                      </button>
                    ))}
                    <button data-ui="button" data-variant="secondary" type="button" onClick={() => setSelectedDecisionId(null)}>
                      新建 Decision
                    </button>
                  </div>
                </article>
                <article data-ui="card">
                  <div data-ui="stack" data-direction="col" data-gap="2">
                    <p data-ui="text" data-variant="label" data-tone="primary">Promotion 表单 / 检查器</p>
                    <input data-ui="input" value={decisionForm.researchQuestionId} onChange={(event) => setDecisionForm((current) => ({ ...current, researchQuestionId: event.target.value }))} placeholder="research_question_id" />
                    <input data-ui="input" value={decisionForm.valueAssessmentId} onChange={(event) => setDecisionForm((current) => ({ ...current, valueAssessmentId: event.target.value }))} placeholder="value_assessment_id" />
                    <input data-ui="input" value={decisionForm.packageId} onChange={(event) => setDecisionForm((current) => ({ ...current, packageId: event.target.value }))} placeholder="package_id" />
                    <textarea data-ui="textarea" rows={3} value={decisionForm.reasonSummary} onChange={(event) => setDecisionForm((current) => ({ ...current, reasonSummary: event.target.value }))} placeholder="Reason summary" />
                    <input data-ui="input" value={decisionForm.targetPaperTitle} onChange={(event) => setDecisionForm((current) => ({ ...current, targetPaperTitle: event.target.value }))} placeholder="Target paper title" />
                    <div data-ui="toolbar" data-wrap="wrap">
                      <button data-ui="button" data-variant="primary" type="button" onClick={() => void submitDecision()}>
                        {selectedDecision ? 'PATCH 当前 Decision' : '创建 Decision'}
                      </button>
                      <button data-ui="button" data-variant="secondary" type="button" onClick={() => onSelectSecondaryTab('promotion', 'promotion')}>
                        进入晋升
                      </button>
                    </div>
                    <pre>{toJson(selectedDecision)}</pre>
                  </div>
                </article>
              </div>
            ) : null}

            {activePrimaryTab === 'promotion' && activeSecondaryTab === 'promotion' ? (
              <div data-ui="grid" data-cols="2" data-gap="3">
                <article data-ui="card">
                  <div data-ui="stack" data-direction="col" data-gap="2">
                    <p data-ui="text" data-variant="label" data-tone="primary">直接晋升为 paper-project</p>
                    <input data-ui="input" value={promotionTitle} onChange={(event) => setPromotionTitle(event.target.value)} placeholder="晋升后的 paper title" />
                    <button data-ui="button" data-variant="primary" type="button" onClick={() => void promoteToPaper()}>
                      直接晋升为 paper-project
                    </button>
                    <button data-ui="button" data-variant="secondary" type="button" onClick={() => onSelectSecondaryTab('promotion', 'decision')}>
                      返回决策
                    </button>
                  </div>
                </article>
                <article data-ui="card">
                  <div data-ui="stack" data-direction="col" data-gap="2">
                    <p data-ui="text" data-variant="label" data-tone="muted">当前决策</p>
                    <pre>{toJson(selectedDecision)}</pre>
                  </div>
                </article>
              </div>
            ) : null}
          </div>
        ) : (
          <article data-ui="card">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <p data-ui="text" data-variant="label" data-tone="primary">请先选择题目卡</p>
              <p data-ui="text" data-variant="caption" data-tone="muted">
                当前 workflow 节点需要一个活动题目卡。请先回到“总揽”创建或选择题目卡。
              </p>
              <button data-ui="button" data-variant="secondary" type="button" onClick={() => onSelectPrimaryTab('overview')}>
                回到总揽
              </button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
