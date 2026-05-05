import { requestGovernance } from '../../shared/api';
import type {
  LiteratureIdMap,
} from './titleCardDemoFixtures';
import {
  titleCardDemoLiteratures,
} from './titleCardDemoFixtures';

export type TitleCardSummary = {
  title_card_id: string;
  working_title: string;
  brief: string;
  status: string;
  latest_paper_id?: string;
};

export type EvidenceBasketPayload = {
  items: Array<{ literature_id: string }>;
};

export type NeedReview = {
  need_id: string;
  need_statement: string;
};

export type ResearchQuestion = {
  research_question_id: string;
  main_question: string;
  research_slice: string;
};

export type ValueAssessment = {
  value_assessment_id: string;
  research_question_id: string;
  strongest_claim_if_success: string;
  judgement_summary: string;
};

export type PackageItem = {
  package_id: string;
  research_question_id: string;
  value_assessment_id: string;
  title_candidates: string[];
};

export type PromotionDecision = {
  decision_id: string;
  decision: string;
  reason_summary: string;
};

type LiteratureCollectionImportResult = {
  literature_id: string;
  is_new: boolean;
};

export async function importDemoLiteratures(): Promise<{
  literatureIdByKey: LiteratureIdMap;
  created: number;
  reused: number;
  failed: number;
}> {
  const payload = await requestGovernance<{ results: LiteratureCollectionImportResult[] }>({
    method: 'POST',
    path: '/literature/collections/import',
    body: {
      items: titleCardDemoLiteratures.map(({ seed_key: _seedKey, ...item }) => item),
    },
  });
  const results = payload.results ?? [];
  const literatureIdByKey = new Map<string, string>();
  let created = 0;
  let reused = 0;

  titleCardDemoLiteratures.forEach((seed, index) => {
    const literatureId = results[index]?.literature_id;
    if (!literatureId) {
      return;
    }
    literatureIdByKey.set(seed.seed_key, literatureId);
    if (results[index]?.is_new) {
      created += 1;
    } else {
      reused += 1;
    }
  });

  const failed = titleCardDemoLiteratures.length - literatureIdByKey.size;
  if (failed > 0) {
    const missingSeeds = titleCardDemoLiteratures
      .filter((seed) => !literatureIdByKey.has(seed.seed_key))
      .map((seed) => seed.external_id);
    throw new Error(`Demo literature import returned incomplete results: ${missingSeeds.join(', ')}`);
  }

  return {
    literatureIdByKey,
    created,
    reused,
    failed,
  };
}

export async function listTitleCards(): Promise<TitleCardSummary[]> {
  const payload = await requestGovernance<{ items: TitleCardSummary[] }>({
    method: 'GET',
    path: '/title-cards',
  });
  return payload.items ?? [];
}

export async function getTitleCard(titleCardId: string): Promise<TitleCardSummary> {
  return requestGovernance<TitleCardSummary>({
    method: 'GET',
    path: `/title-cards/${encodeURIComponent(titleCardId)}`,
  });
}

export async function getEvidenceBasket(titleCardId: string): Promise<EvidenceBasketPayload> {
  return requestGovernance<EvidenceBasketPayload>({
    method: 'GET',
    path: `/title-cards/${encodeURIComponent(titleCardId)}/evidence-basket`,
  });
}

export async function listNeedReviews(titleCardId: string): Promise<NeedReview[]> {
  const payload = await requestGovernance<{ items: NeedReview[] }>({
    method: 'GET',
    path: `/title-cards/${encodeURIComponent(titleCardId)}/needs`,
  });
  return payload.items ?? [];
}

export async function listResearchQuestions(titleCardId: string): Promise<ResearchQuestion[]> {
  const payload = await requestGovernance<{ items: ResearchQuestion[] }>({
    method: 'GET',
    path: `/title-cards/${encodeURIComponent(titleCardId)}/research-questions`,
  });
  return payload.items ?? [];
}

export async function listValueAssessments(titleCardId: string): Promise<ValueAssessment[]> {
  const payload = await requestGovernance<{ items: ValueAssessment[] }>({
    method: 'GET',
    path: `/title-cards/${encodeURIComponent(titleCardId)}/value-assessments`,
  });
  return payload.items ?? [];
}

export async function listPackages(titleCardId: string): Promise<PackageItem[]> {
  const payload = await requestGovernance<{ items: PackageItem[] }>({
    method: 'GET',
    path: `/title-cards/${encodeURIComponent(titleCardId)}/packages`,
  });
  return payload.items ?? [];
}

export async function listPromotionDecisions(titleCardId: string): Promise<PromotionDecision[]> {
  const payload = await requestGovernance<{ items: PromotionDecision[] }>({
    method: 'GET',
    path: `/title-cards/${encodeURIComponent(titleCardId)}/promotion-decisions`,
  });
  return payload.items ?? [];
}
