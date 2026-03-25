import { useEffect, useState } from 'react';
import { requestGovernance } from '../../literature/shared/api';
import type { TitleCardManagementController } from './types';
import type {
  DecisionFormState,
  EvidenceCandidatePayload,
  NeedFormState,
  PackageFormState,
  QuestionFormState,
  TitleCardListPayload,
  TitleCardSummary,
  ValueFormState,
} from './types';
import {
  decisionFormFromDecision,
  defaultDecisionForm,
  defaultNeedForm,
  defaultPackageForm,
  defaultQuestionForm,
  defaultValueForm,
  needFormFromReview,
  packageFormFromPackage,
  parseList,
  questionFormFromQuestion,
  safeParseJson,
  valueFormFromAssessment,
  workflowQuickLinks,
} from './utils';

export function useTitleCardManagementController(): TitleCardManagementController {
  const [titleCards, setTitleCards] = useState<TitleCardSummary[]>([]);
  const [listSummary, setListSummary] = useState<TitleCardListPayload['summary'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTitleCardId, setActiveTitleCardId] = useState<string | null>(null);
  const [titleCardDetail, setTitleCardDetail] = useState<TitleCardSummary | null>(null);

  const [createTitle, setCreateTitle] = useState('');
  const [createBrief, setCreateBrief] = useState('');

  const [basket, setBasket] = useState<TitleCardManagementController['basket']>(null);
  const [evidenceCandidates, setEvidenceCandidates] = useState<TitleCardManagementController['evidenceCandidates']>([]);
  const [evidenceKeyword, setEvidenceKeyword] = useState('');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);

  const [needs, setNeeds] = useState<TitleCardManagementController['needs']>([]);
  const [selectedNeedId, setSelectedNeedId] = useState<string | null>(null);
  const [needForm, setNeedForm] = useState<NeedFormState>(defaultNeedForm());

  const [questions, setQuestions] = useState<TitleCardManagementController['questions']>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(defaultQuestionForm(null));

  const [values, setValues] = useState<TitleCardManagementController['values']>([]);
  const [selectedValueId, setSelectedValueId] = useState<string | null>(null);
  const [valueForm, setValueForm] = useState<ValueFormState>(defaultValueForm());

  const [packages, setPackages] = useState<TitleCardManagementController['packages']>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [packageForm, setPackageForm] = useState<PackageFormState>(defaultPackageForm(null, null));

  const [decisions, setDecisions] = useState<TitleCardManagementController['decisions']>([]);
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  const [decisionForm, setDecisionForm] = useState<DecisionFormState>(defaultDecisionForm(null, null, null));
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
      const [
        detail,
        basketPayload,
        candidatePayload,
        needPayload,
        questionPayload,
        valuePayload,
        packagePayload,
        decisionPayload,
      ] = await Promise.all([
        requestGovernance<TitleCardSummary>({
          method: 'GET',
          path: `/title-cards/${encodeURIComponent(titleCardId)}`,
        }),
        requestGovernance<NonNullable<TitleCardManagementController['basket']>>({
          method: 'GET',
          path: `/title-cards/${encodeURIComponent(titleCardId)}/evidence-basket`,
        }),
        requestGovernance<EvidenceCandidatePayload>({
          method: 'GET',
          path: `/title-cards/${encodeURIComponent(titleCardId)}/evidence-candidates?selection_state=all`,
        }),
        requestGovernance<{ items: TitleCardManagementController['needs'] }>({
          method: 'GET',
          path: `/title-cards/${encodeURIComponent(titleCardId)}/needs`,
        }),
        requestGovernance<{ items: TitleCardManagementController['questions'] }>({
          method: 'GET',
          path: `/title-cards/${encodeURIComponent(titleCardId)}/research-questions`,
        }),
        requestGovernance<{ items: TitleCardManagementController['values'] }>({
          method: 'GET',
          path: `/title-cards/${encodeURIComponent(titleCardId)}/value-assessments`,
        }),
        requestGovernance<{ items: TitleCardManagementController['packages'] }>({
          method: 'GET',
          path: `/title-cards/${encodeURIComponent(titleCardId)}/packages`,
        }),
        requestGovernance<{ items: TitleCardManagementController['decisions'] }>({
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
      setSelectedNeedId((current) =>
        current && needPayload.items.some((item) => item.need_id === current)
          ? current
          : needPayload.items[0]?.need_id ?? null,
      );
      setSelectedQuestionId((current) =>
        current && questionPayload.items.some((item) => item.research_question_id === current)
          ? current
          : questionPayload.items[0]?.research_question_id ?? null,
      );
      setSelectedValueId((current) =>
        current && valuePayload.items.some((item) => item.value_assessment_id === current)
          ? current
          : valuePayload.items[0]?.value_assessment_id ?? null,
      );
      setSelectedPackageId((current) =>
        current && packagePayload.items.some((item) => item.package_id === current)
          ? current
          : packagePayload.items[0]?.package_id ?? null,
      );
      setSelectedDecisionId((current) =>
        current && decisionPayload.items.some((item) => item.decision_id === current)
          ? current
          : decisionPayload.items[0]?.decision_id ?? null,
      );
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
  const selectedEvidence =
    evidenceCandidates.find((item) => item.literature_id === selectedEvidenceId)
    ?? basket?.items.find((item) => item.literature_id === selectedEvidenceId)
    ?? null;

  useEffect(() => {
    if (!selectedNeed) {
      setNeedForm(defaultNeedForm(basket?.items ?? []));
      return;
    }
    setNeedForm(needFormFromReview(selectedNeed));
  }, [selectedNeed, basket]);

  useEffect(() => {
    if (!selectedQuestion) {
      setQuestionForm(defaultQuestionForm(selectedNeed?.need_id ?? null, basket?.items ?? []));
      return;
    }
    setQuestionForm(questionFormFromQuestion(selectedQuestion));
  }, [selectedQuestion, selectedNeed, basket]);

  useEffect(() => {
    if (!selectedValue) {
      setValueForm(defaultValueForm(selectedQuestion?.research_question_id ?? ''));
      return;
    }
    setValueForm(valueFormFromAssessment(selectedValue));
  }, [selectedValue, selectedQuestion]);

  useEffect(() => {
    if (!selectedPackage) {
      setPackageForm(
        defaultPackageForm(
          selectedQuestion?.research_question_id ?? null,
          selectedValue?.value_assessment_id ?? null,
          basket?.items ?? [],
        ),
      );
      return;
    }
    setPackageForm(packageFormFromPackage(selectedPackage));
  }, [selectedPackage, selectedQuestion, selectedValue, basket]);

  useEffect(() => {
    if (!selectedDecision) {
      setDecisionForm(
        defaultDecisionForm(
          selectedQuestion?.research_question_id ?? null,
          selectedValue?.value_assessment_id ?? null,
          selectedPackage?.package_id ?? null,
        ),
      );
      setPromotionTitle(selectedPackage?.title_candidates[0] ?? titleCardDetail?.working_title ?? '');
      return;
    }
    setDecisionForm(decisionFormFromDecision(selectedDecision));
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
    const literatureIds = parseList(needForm.literatureIdsText);
    const payload = {
      need_statement: needForm.needStatement,
      who_needs_it: needForm.whoNeedsIt,
      scenario: needForm.scenario,
      boundary: needForm.boundary || undefined,
      literature_ids: literatureIds,
      unmet_need_category: needForm.unmetNeedCategory,
      falsification_verdict: needForm.falsificationVerdict,
      significance_score: Number(needForm.significanceScore),
      measurability_score: Number(needForm.measurabilityScore),
      feasibility_signal: needForm.feasibilitySignal,
      validated_need: needForm.validatedNeed,
      judgement_summary: needForm.judgementSummary,
      confidence: Number(needForm.confidence),
      evidence_refs: literatureIds.map((literatureId) => ({
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
      source_literature_evidence_ids: parseList(questionForm.sourceLiteratureEvidenceIdsText),
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

  return {
    titleCards,
    listSummary,
    loading,
    error,
    message,
    activeTitleCardId,
    titleCardDetail,
    createTitle,
    createBrief,
    basket,
    evidenceCandidates,
    evidenceKeyword,
    selectedEvidenceId,
    needs,
    selectedNeedId,
    needForm,
    questions,
    selectedQuestionId,
    questionForm,
    values,
    selectedValueId,
    valueForm,
    packages,
    selectedPackageId,
    packageForm,
    decisions,
    selectedDecisionId,
    decisionForm,
    promotionTitle,
    selectedNeed,
    selectedQuestion,
    selectedValue,
    selectedPackage,
    selectedDecision,
    selectedEvidence,
    workflowQuickLinks,
    setCreateTitle,
    setCreateBrief,
    setActiveTitleCardId,
    setEvidenceKeyword,
    setSelectedEvidenceId,
    setSelectedNeedId,
    setNeedForm,
    setSelectedQuestionId,
    setQuestionForm,
    setSelectedValueId,
    setValueForm,
    setSelectedPackageId,
    setPackageForm,
    setSelectedDecisionId,
    setDecisionForm,
    setPromotionTitle,
    reloadWorkbench,
    createTitleCard,
    refreshEvidenceCandidates,
    toggleEvidenceSelection,
    submitNeed,
    submitQuestion,
    submitValue,
    submitPackage,
    submitDecision,
    promoteToPaper,
  };
}
