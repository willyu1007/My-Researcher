import { requestGovernance } from '../../shared/api';
import {
  getEvidenceBasket,
  getTitleCard,
  importDemoLiteratures,
  listNeedReviews,
  listPackages,
  listPromotionDecisions,
  listResearchQuestions,
  listTitleCards,
  listValueAssessments,
  type NeedReview,
  type PackageItem,
  type PromotionDecision,
  type ResearchQuestion,
  type TitleCardSummary,
  type ValueAssessment,
} from './titleCardDemoApi';
import {
  resolveEvidenceRefs,
  resolveHardGate,
  resolveLiteratureIds,
  resolveScoredDimension,
  titleCardDemoScenarios,
  type DemoDecisionSeed,
  type DemoNeedSeed,
  type DemoPackageSeed,
  type DemoPromotionSeed,
  type DemoQuestionSeed,
  type DemoTitleCardScenario,
  type DemoValueSeed,
  type LiteratureIdMap,
} from './titleCardDemoFixtures';

export type TitleCardDemoInjectionResult = {
  literatureCreated: number;
  literatureReused: number;
  literatureFailed: number;
  titleCardsCreated: number;
  titleCardsReused: number;
  titleCardsFailed: number;
  evidenceLinksAdded: number;
  workflowRecordsCreated: number;
  promotionsTriggered: number;
  promotionsSkipped: number;
  errors: string[];
};

async function ensureTitleCardRoot(
  scenario: DemoTitleCardScenario,
  existingCard: TitleCardSummary | null,
): Promise<{ card: TitleCardSummary; created: boolean }> {
  if (!existingCard) {
    const created = await requestGovernance<TitleCardSummary>({
      method: 'POST',
      path: '/title-cards',
      body: {
        working_title: scenario.working_title,
        brief: scenario.brief,
        status: scenario.status,
      },
    });
    return { card: created, created: true };
  }

  const patch: Record<string, unknown> = {};
  if (existingCard.brief !== scenario.brief) {
    patch.brief = scenario.brief;
  }
  if (!scenario.promotion && existingCard.status !== scenario.status) {
    patch.status = scenario.status;
  }
  if (Object.keys(patch).length > 0) {
    await requestGovernance<TitleCardSummary>({
      method: 'PATCH',
      path: `/title-cards/${encodeURIComponent(existingCard.title_card_id)}`,
      body: patch,
    });
  }

  return {
    card: await getTitleCard(existingCard.title_card_id),
    created: false,
  };
}

async function ensureEvidenceBasket(
  titleCardId: string,
  literatureIds: string[],
): Promise<number> {
  const basket = await getEvidenceBasket(titleCardId);
  const existingIds = new Set(basket.items.map((item) => item.literature_id));
  const missingIds = literatureIds.filter((literatureId) => !existingIds.has(literatureId));
  if (missingIds.length === 0) {
    return 0;
  }
  await requestGovernance({
    method: 'PATCH',
    path: `/title-cards/${encodeURIComponent(titleCardId)}/evidence-basket`,
    body: {
      add_literature_ids: missingIds,
    },
  });
  return missingIds.length;
}

async function ensureNeedReview(
  titleCardId: string,
  literatureIdByKey: LiteratureIdMap,
  seed: DemoNeedSeed,
): Promise<{ need: NeedReview; created: boolean }> {
  const existing = (await listNeedReviews(titleCardId)).find((item) => item.need_statement === seed.need_statement);
  if (existing) {
    return { need: existing, created: false };
  }

  const created = await requestGovernance<NeedReview>({
    method: 'POST',
    path: `/title-cards/${encodeURIComponent(titleCardId)}/needs`,
    body: {
      record_status: seed.record_status,
      need_statement: seed.need_statement,
      who_needs_it: seed.who_needs_it,
      scenario: seed.scenario,
      boundary: seed.boundary,
      literature_ids: resolveLiteratureIds(literatureIdByKey, seed.literature_keys),
      unmet_need_category: seed.unmet_need_category,
      falsification_verdict: seed.falsification_verdict,
      significance_score: seed.significance_score,
      measurability_score: seed.measurability_score,
      feasibility_signal: seed.feasibility_signal,
      validated_need: seed.validated_need,
      judgement_summary: seed.judgement_summary,
      confidence: seed.confidence,
      next_actions: seed.next_actions,
      evidence_refs: resolveEvidenceRefs(literatureIdByKey, seed.evidence_refs),
      missing_information: seed.missing_information,
      blocking_issues: seed.blocking_issues,
    },
  });
  return { need: created, created: true };
}

async function ensureResearchQuestion(
  titleCardId: string,
  literatureIdByKey: LiteratureIdMap,
  seed: DemoQuestionSeed,
  needId: string | null,
): Promise<{ question: ResearchQuestion; created: boolean }> {
  const existing = (await listResearchQuestions(titleCardId)).find((item) => item.main_question === seed.main_question);
  if (existing) {
    return { question: existing, created: false };
  }

  const created = await requestGovernance<ResearchQuestion>({
    method: 'POST',
    path: `/title-cards/${encodeURIComponent(titleCardId)}/research-questions`,
    body: {
      record_status: seed.record_status,
      main_question: seed.main_question,
      sub_questions: seed.sub_questions,
      research_slice: seed.research_slice,
      contribution_hypothesis: seed.contribution_hypothesis,
      source_need_ids: needId ? [needId] : [],
      source_literature_evidence_ids: resolveLiteratureIds(
        literatureIdByKey,
        seed.source_literature_evidence_keys ?? [],
      ),
      judgement_summary: seed.judgement_summary,
      confidence: seed.confidence,
    },
  });
  return { question: created, created: true };
}

async function ensureValueAssessment(
  titleCardId: string,
  researchQuestionId: string,
  literatureIdByKey: LiteratureIdMap,
  seed: DemoValueSeed,
): Promise<{ value: ValueAssessment; created: boolean }> {
  const existing = (await listValueAssessments(titleCardId)).find(
    (item) =>
      item.research_question_id === researchQuestionId
      && item.judgement_summary === seed.judgement_summary,
  );
  if (existing) {
    return { value: existing, created: false };
  }

  const created = await requestGovernance<ValueAssessment>({
    method: 'POST',
    path: `/title-cards/${encodeURIComponent(titleCardId)}/value-assessments`,
    body: {
      research_question_id: researchQuestionId,
      record_status: seed.record_status,
      strongest_claim_if_success: seed.strongest_claim_if_success,
      fallback_claim_if_success: seed.fallback_claim_if_success,
      hard_gates: {
        significance: resolveHardGate(literatureIdByKey, seed.hard_gates.significance),
        originality: resolveHardGate(literatureIdByKey, seed.hard_gates.originality),
        answerability: resolveHardGate(literatureIdByKey, seed.hard_gates.answerability),
        feasibility: resolveHardGate(literatureIdByKey, seed.hard_gates.feasibility),
        venue_fit: resolveHardGate(literatureIdByKey, seed.hard_gates.venue_fit),
      },
      scored_dimensions: {
        significance: resolveScoredDimension(literatureIdByKey, seed.scored_dimensions.significance),
        originality: resolveScoredDimension(literatureIdByKey, seed.scored_dimensions.originality),
        claim_strength: resolveScoredDimension(literatureIdByKey, seed.scored_dimensions.claim_strength),
        answerability: resolveScoredDimension(literatureIdByKey, seed.scored_dimensions.answerability),
        venue_fit: resolveScoredDimension(literatureIdByKey, seed.scored_dimensions.venue_fit),
        strategic_leverage: resolveScoredDimension(literatureIdByKey, seed.scored_dimensions.strategic_leverage),
      },
      risk_penalty: seed.risk_penalty,
      reviewer_objections: seed.reviewer_objections,
      ceiling_case: seed.ceiling_case,
      base_case: seed.base_case,
      floor_case: seed.floor_case,
      verdict: seed.verdict,
      total_score: seed.total_score,
      judgement_summary: seed.judgement_summary,
      confidence: seed.confidence,
      required_refinements: seed.required_refinements,
      next_actions: seed.next_actions,
      evidence_refs: resolveEvidenceRefs(literatureIdByKey, seed.evidence_refs),
    },
  });
  return { value: created, created: true };
}

async function ensurePackage(
  titleCardId: string,
  researchQuestionId: string,
  valueAssessmentId: string,
  literatureIdByKey: LiteratureIdMap,
  seed: DemoPackageSeed,
): Promise<{ pkg: PackageItem; created: boolean }> {
  const primaryTitle = seed.title_candidates[0] ?? '';
  const existing = (await listPackages(titleCardId)).find(
    (item) =>
      item.research_question_id === researchQuestionId
      && item.value_assessment_id === valueAssessmentId
      && (item.title_candidates[0] ?? '') === primaryTitle,
  );
  if (existing) {
    return { pkg: existing, created: false };
  }

  const created = await requestGovernance<PackageItem>({
    method: 'POST',
    path: `/title-cards/${encodeURIComponent(titleCardId)}/packages`,
    body: {
      record_status: seed.record_status,
      research_question_id: researchQuestionId,
      value_assessment_id: valueAssessmentId,
      title_candidates: seed.title_candidates,
      research_background: seed.research_background,
      contribution_summary: seed.contribution_summary,
      candidate_methods: seed.candidate_methods,
      evaluation_plan: seed.evaluation_plan,
      key_risks: seed.key_risks,
      selected_literature_evidence_ids: resolveLiteratureIds(
        literatureIdByKey,
        seed.selected_literature_evidence_keys,
      ),
    },
  });
  return { pkg: created, created: true };
}

async function ensurePromotionDecision(
  titleCardId: string,
  researchQuestionId: string,
  valueAssessmentId: string,
  packageId: string | null,
  seed: DemoDecisionSeed,
): Promise<{ decision: PromotionDecision; created: boolean }> {
  const existing = (await listPromotionDecisions(titleCardId)).find(
    (item) => item.decision === seed.decision && item.reason_summary === seed.reason_summary,
  );
  if (existing) {
    return { decision: existing, created: false };
  }

  const created = await requestGovernance<PromotionDecision>({
    method: 'POST',
    path: `/title-cards/${encodeURIComponent(titleCardId)}/promotion-decisions`,
    body: {
      research_question_id: researchQuestionId,
      value_assessment_id: valueAssessmentId,
      package_id: packageId ?? undefined,
      decision: seed.decision,
      reason_summary: seed.reason_summary,
      target_paper_title: seed.target_paper_title,
      loopback_target: seed.loopback_target,
      created_by: seed.created_by,
    },
  });
  return { decision: created, created: true };
}

async function ensurePromotion(
  titleCardId: string,
  researchQuestionId: string,
  valueAssessmentId: string,
  packageId: string,
  seed: DemoPromotionSeed,
): Promise<boolean> {
  const current = await getTitleCard(titleCardId);
  if (current.latest_paper_id) {
    return false;
  }

  await requestGovernance({
    method: 'POST',
    path: `/title-cards/${encodeURIComponent(titleCardId)}/promote-to-paper-project`,
    body: {
      research_question_id: researchQuestionId,
      value_assessment_id: valueAssessmentId,
      package_id: packageId,
      title: seed.title,
      research_direction: seed.research_direction,
      created_by: seed.created_by,
    },
  });
  return true;
}

export async function injectTitleCardDemoData(): Promise<TitleCardDemoInjectionResult> {
  const result: TitleCardDemoInjectionResult = {
    literatureCreated: 0,
    literatureReused: 0,
    literatureFailed: 0,
    titleCardsCreated: 0,
    titleCardsReused: 0,
    titleCardsFailed: 0,
    evidenceLinksAdded: 0,
    workflowRecordsCreated: 0,
    promotionsTriggered: 0,
    promotionsSkipped: 0,
    errors: [],
  };

  const imported = await importDemoLiteratures();
  result.literatureCreated = imported.created;
  result.literatureReused = imported.reused;
  result.literatureFailed = imported.failed;

  let titleCards = await listTitleCards();

  for (const scenario of titleCardDemoScenarios) {
    try {
      const existingCard = titleCards.find((item) => item.working_title === scenario.working_title) ?? null;
      const ensuredCard = await ensureTitleCardRoot(scenario, existingCard);
      if (ensuredCard.created) {
        result.titleCardsCreated += 1;
      } else {
        result.titleCardsReused += 1;
      }

      result.evidenceLinksAdded += await ensureEvidenceBasket(
        ensuredCard.card.title_card_id,
        resolveLiteratureIds(imported.literatureIdByKey, scenario.evidence_keys),
      );

      let needId: string | null = null;
      if (scenario.need) {
        const ensuredNeed = await ensureNeedReview(ensuredCard.card.title_card_id, imported.literatureIdByKey, scenario.need);
        needId = ensuredNeed.need.need_id;
        if (ensuredNeed.created) {
          result.workflowRecordsCreated += 1;
        }
      }

      let researchQuestionId: string | null = null;
      if (scenario.question) {
        const ensuredQuestion = await ensureResearchQuestion(
          ensuredCard.card.title_card_id,
          imported.literatureIdByKey,
          scenario.question,
          needId,
        );
        researchQuestionId = ensuredQuestion.question.research_question_id;
        if (ensuredQuestion.created) {
          result.workflowRecordsCreated += 1;
        }
      }

      let valueAssessmentId: string | null = null;
      if (scenario.value && researchQuestionId) {
        const ensuredValue = await ensureValueAssessment(
          ensuredCard.card.title_card_id,
          researchQuestionId,
          imported.literatureIdByKey,
          scenario.value,
        );
        valueAssessmentId = ensuredValue.value.value_assessment_id;
        if (ensuredValue.created) {
          result.workflowRecordsCreated += 1;
        }
      }

      let packageId: string | null = null;
      if (scenario.package && researchQuestionId && valueAssessmentId) {
        const ensuredPackage = await ensurePackage(
          ensuredCard.card.title_card_id,
          researchQuestionId,
          valueAssessmentId,
          imported.literatureIdByKey,
          scenario.package,
        );
        packageId = ensuredPackage.pkg.package_id;
        if (ensuredPackage.created) {
          result.workflowRecordsCreated += 1;
        }
      }

      if (scenario.decision && researchQuestionId && valueAssessmentId) {
        const ensuredDecision = await ensurePromotionDecision(
          ensuredCard.card.title_card_id,
          researchQuestionId,
          valueAssessmentId,
          packageId,
          scenario.decision,
        );
        if (ensuredDecision.created) {
          result.workflowRecordsCreated += 1;
        }
      }

      if (scenario.promotion && researchQuestionId && valueAssessmentId && packageId) {
        const promoted = await ensurePromotion(
          ensuredCard.card.title_card_id,
          researchQuestionId,
          valueAssessmentId,
          packageId,
          scenario.promotion,
        );
        if (promoted) {
          result.promotionsTriggered += 1;
        } else {
          result.promotionsSkipped += 1;
        }
      }
    } catch (error) {
      result.titleCardsFailed += 1;
      result.errors.push(
        `${scenario.working_title}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }

    titleCards = await listTitleCards();
  }

  return result;
}
