import type {
  EvidenceCandidateDTO,
  EvidenceCandidateListResponse,
  EvidenceCandidateQuery,
  TitleCardDTO,
  TitleCardEvidenceBasketItemDTO,
} from '@paper-engineering-assistant/shared/research-lifecycle/title-card-management-contracts';
import type {
  StoredTitleCard,
  TitleCardManagementRepository,
} from '../../repositories/title-card-management.repository.js';
import type { TitleCardManagementReferenceGateway } from './support.js';
import { isPipelineReady } from './support.js';

type ReadModelDeps = {
  repository: TitleCardManagementRepository;
  references: TitleCardManagementReferenceGateway;
};

export function createTitleCardManagementReadModels({
  repository,
  references,
}: ReadModelDeps) {
  async function hydrateTitleCard(card: StoredTitleCard): Promise<TitleCardDTO> {
    const [basket, needs, questions, values, packages, decisions] = await Promise.all([
      repository.getEvidenceBasket(card.title_card_id),
      repository.listNeedReviews(card.title_card_id),
      repository.listResearchQuestions(card.title_card_id),
      repository.listValueAssessments(card.title_card_id),
      repository.listPackages(card.title_card_id),
      repository.listPromotionDecisions(card.title_card_id),
    ]);
    return {
      ...card,
      evidence_count: basket.items.length,
      need_count: needs.length,
      research_question_count: questions.length,
      value_assessment_count: values.length,
      package_count: packages.length,
      promotion_decision_count: decisions.length,
      latest_paper_id: decisions.find((decision) => decision.promoted_paper_id)?.promoted_paper_id,
    };
  }

  async function hydrateEvidenceBasketItems(
    basketItems: Array<{ literature_id: string; selected_at: string }>,
  ): Promise<TitleCardEvidenceBasketItemDTO[]> {
    const items = await Promise.all(
      basketItems.map(async (basketItem) => {
        const literatureId = basketItem.literature_id;
        const literature = await references.findLiteratureById(literatureId);
        if (!literature) {
          return undefined;
        }
        const sources = await references.listSourcesByLiteratureId(literatureId);
        const pipelineStates = await references.listPipelineStatesByLiteratureIds([literatureId]);
        const item: TitleCardEvidenceBasketItemDTO = {
          literature_id: literatureId,
          title: literature.title,
          authors: literature.authors,
          year: literature.year,
          tags: literature.tags,
          provider: sources[0]?.provider ?? null,
          rights_class: literature.rightsClass,
          pipeline_ready: isPipelineReady(pipelineStates[0]),
          selected_at: basketItem.selected_at,
        };
        return item;
      }),
    );

    return items.flatMap((item) => (item ? [item] : []));
  }

  async function listEvidenceCandidates(
    titleCardId: string,
    query: EvidenceCandidateQuery,
  ): Promise<EvidenceCandidateListResponse> {
    const [basket, literatures] = await Promise.all([
      repository.getEvidenceBasket(titleCardId),
      references.listLiteratures(),
    ]);
    const selected = new Set(basket.items.map((item) => item.literature_id));
    const pipelineStates = await references.listPipelineStatesByLiteratureIds(literatures.map((row) => row.id));
    const pipelineStateByLiteratureId = new Map(pipelineStates.map((row) => [row.literatureId, row]));
    const items: EvidenceCandidateDTO[] = [];

    for (const literature of literatures) {
      const sources = await references.listSourcesByLiteratureId(literature.id);
      const provider = sources[0]?.provider ?? null;
      const selectionState = selected.has(literature.id) ? 'selected' : 'unselected';
      const pipelineReady = isPipelineReady(pipelineStateByLiteratureId.get(literature.id));

      if (query.selection_state && query.selection_state !== 'all' && query.selection_state !== selectionState) {
        continue;
      }
      if (query.pipeline_readiness === 'ready' && !pipelineReady) {
        continue;
      }
      if (query.pipeline_readiness === 'not_ready' && pipelineReady) {
        continue;
      }
      if (query.year_from !== undefined && literature.year !== null && literature.year < query.year_from) {
        continue;
      }
      if (query.year_to !== undefined && literature.year !== null && literature.year > query.year_to) {
        continue;
      }
      if (query.rights_classes?.length && !query.rights_classes.includes(literature.rightsClass)) {
        continue;
      }
      if (query.providers?.length && (!provider || !query.providers.includes(provider))) {
        continue;
      }
      if (query.tags?.length) {
        const tagSet = new Set(literature.tags.map((tag) => tag.toLowerCase()));
        const matchesTag = query.tags.some((tag) => tagSet.has(tag.toLowerCase()));
        if (!matchesTag) {
          continue;
        }
      }
      if (query.keyword?.trim()) {
        const keyword = query.keyword.trim().toLowerCase();
        const haystack = [
          literature.title,
          literature.abstractText ?? '',
          literature.keyContentDigest ?? '',
          ...literature.tags,
          ...literature.authors,
        ].join(' ').toLowerCase();
        if (!haystack.includes(keyword)) {
          continue;
        }
      }

      items.push({
        literature_id: literature.id,
        title: literature.title,
        authors: literature.authors,
        year: literature.year,
        abstract_text: literature.abstractText,
        key_content_digest: literature.keyContentDigest,
        tags: literature.tags,
        provider,
        rights_class: literature.rightsClass,
        pipeline_ready: pipelineReady,
        selection_state: selectionState,
      });
    }

    return {
      title_card_id: titleCardId,
      items,
      total: items.length,
    };
  }

  return {
    hydrateTitleCard,
    hydrateEvidenceBasketItems,
    listEvidenceCandidates,
  };
}
