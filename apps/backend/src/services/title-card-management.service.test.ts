import test from 'node:test';
import assert from 'node:assert/strict';

import { InMemoryTitleCardManagementRepository } from '../repositories/title-card-management.repository.js';
import { AppError } from '../errors/app-error.js';
import { TitleCardManagementService } from './title-card-management.service.js';
import type {
  CreateNeedReviewRequest,
  CreatePackageRequest,
  CreateResearchQuestionRequest,
  CreateTitleCardRequest,
  CreateValueAssessmentRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/title-card-management-contracts';

function makeEvidenceRef() {
  return [{ literature_id: 'lit_001', source_type: 'abstract' as const, note: 'seed evidence' }];
}

function makeTitleCardInput(overrides: Partial<CreateTitleCardRequest> = {}): CreateTitleCardRequest {
  return {
    working_title: 'Robust Retrieval for Literature Reasoning',
    brief: 'A working title card for robust retrieval direction.',
    ...overrides,
  };
}

function makeNeedInput(overrides: Partial<CreateNeedReviewRequest> = {}): CreateNeedReviewRequest {
  return {
    need_statement: 'Existing methods degrade sharply under long-context retrieval settings.',
    who_needs_it: 'RAG researchers',
    scenario: 'Long-context retrieval and answer synthesis for CS literature tasks.',
    literature_ids: ['lit_001'],
    unmet_need_category: 'robustness',
    falsification_verdict: 'validated',
    significance_score: 4,
    measurability_score: 4,
    feasibility_signal: 'medium',
    validated_need: true,
    judgement_summary: 'The need is measurable and not already fully solved.',
    confidence: 0.82,
    evidence_refs: makeEvidenceRef(),
    ...overrides,
  };
}

function makeQuestionInput(overrides: Partial<CreateResearchQuestionRequest> = {}): CreateResearchQuestionRequest {
  return {
    main_question: 'How can retrieval remain stable under long-context literature reasoning?',
    research_slice: 'robust long-context retrieval',
    contribution_hypothesis: 'method',
    source_need_ids: ['need_001'],
    judgement_summary: 'Question derived from validated robustness need.',
    confidence: 0.81,
    ...overrides,
  };
}

function makeValueInput(overrides: Partial<CreateValueAssessmentRequest> = {}): CreateValueAssessmentRequest {
  const gate = { pass: true, reason: 'Passes current threshold.' };
  const dim = { score: 4, reason: 'Competitive and defensible.', confidence: 0.8 };
  return {
    research_question_id: 'research_question_001',
    strongest_claim_if_success: 'The method improves long-context retrieval robustness under realistic baselines.',
    hard_gates: {
      significance: gate,
      originality: gate,
      answerability: gate,
      feasibility: gate,
      venue_fit: gate,
    },
    scored_dimensions: {
      significance: dim,
      originality: dim,
      claim_strength: dim,
      answerability: dim,
      venue_fit: dim,
      strategic_leverage: dim,
    },
    risk_penalty: {
      data_risk: 1,
      compute_risk: 1,
      baseline_risk: 2,
      execution_risk: 2,
      ethics_risk: 0,
      penalty_summary: 'Manageable implementation risk.',
    },
    ceiling_case: 'Strong workshop or findings paper.',
    base_case: 'Useful empirical paper.',
    floor_case: 'Internal benchmark asset.',
    verdict: 'promote',
    total_score: 82,
    judgement_summary: 'Value is sufficient for promotion if package aligns.',
    confidence: 0.78,
    evidence_refs: makeEvidenceRef(),
    ...overrides,
  };
}

function makePackageInput(overrides: Partial<CreatePackageRequest> = {}): CreatePackageRequest {
  return {
    research_question_id: 'research_question_001',
    value_assessment_id: 'value_001',
    title_candidates: ['Robust Long-Context Retrieval for Literature Reasoning'],
    research_background: 'Prior work does not adequately stabilize retrieval under long-context reasoning workflows.',
    contribution_summary: 'A robust retrieval approach plus targeted evaluation.',
    candidate_methods: ['adaptive retrieval', 'context compression'],
    evaluation_plan: 'Compare against strong retrieval baselines on long-context literature QA.',
    selected_literature_evidence_ids: ['lit_001'],
    ...overrides,
  };
}

function createService(options?: {
  findLiteratureById?: (literatureId: string) => Promise<{
    id: string;
    title: string;
    abstractText: string | null;
    keyContentDigest: string | null;
    authors: string[];
    year: number | null;
    tags: string[];
    rightsClass: string;
  } | null>;
  createPaperProject?: (input: {
    title_card_id: string;
    title: string;
    research_direction?: string;
    created_by: 'human' | 'hybrid';
    initial_context: { literature_evidence_ids: string[] };
  }) => Promise<{ paper_id: string }>;
  deletePaperProject?: (paperId: string) => Promise<void>;
}) {
  const repository = new InMemoryTitleCardManagementRepository();
  const calls: Array<{ title_card_id: string; title: string; initial_context: { literature_evidence_ids: string[] } }> = [];
  const deletions: string[] = [];
  const paperProjects = {
    async createPaperProject(input: {
      title_card_id: string;
      title: string;
      research_direction?: string;
      created_by: 'human' | 'hybrid';
      initial_context: { literature_evidence_ids: string[] };
    }) {
      if (options?.createPaperProject) {
        return options.createPaperProject(input);
      }
      calls.push({
        title_card_id: input.title_card_id,
        title: input.title,
        initial_context: input.initial_context,
      });
      return { paper_id: 'paper_001' };
    },
    async deletePaperProject(paperId: string) {
      deletions.push(paperId);
      await options?.deletePaperProject?.(paperId);
    },
  };

  return {
    service: new TitleCardManagementService(repository, paperProjects, {
      findLiteratureById: options?.findLiteratureById
        ?? (async (literatureId) => (literatureId.startsWith('lit_')
          ? {
              id: literatureId,
              title: `Literature ${literatureId}`,
              abstractText: 'Seed abstract',
              keyContentDigest: null,
              authors: ['Author A'],
              year: 2025,
              tags: ['rag'],
              rightsClass: 'OA',
            }
          : null)),
      listLiteratures: async () => [{
        id: 'lit_001',
        title: 'Literature lit_001',
        abstractText: 'Seed abstract',
        keyContentDigest: null,
        authors: ['Author A'],
        year: 2025,
        tags: ['rag'],
        rightsClass: 'OA',
      }],
      listSourcesByLiteratureId: async () => [{ provider: 'manual', sourceUrl: 'https://example.com' }],
      listPipelineStatesByLiteratureIds: async (literatureIds) => literatureIds.map((literatureId) => ({
        literatureId,
        citationComplete: true,
        abstractReady: true,
        keyContentReady: false,
      })),
    }),
    repository,
    calls,
    deletions,
  };
}

async function createTitleCardWithEvidence(service: TitleCardManagementService) {
  const titleCard = await service.createTitleCard(makeTitleCardInput());
  await service.updateEvidenceBasket(titleCard.title_card_id, { add_literature_ids: ['lit_001'] });
  return titleCard;
}

test('legacy semantic writers are uniformly closed while title and evidence intake remain writable', async () => {
  const { service, repository, calls } = createService();
  const titleCard = await createTitleCardWithEvidence(service);
  const semanticWrites = [
    ['need', () => service.createNeedReview(titleCard.title_card_id, makeNeedInput())],
    ['question', () => service.createResearchQuestion(titleCard.title_card_id, makeQuestionInput())],
    ['value', () => service.createValueAssessment(titleCard.title_card_id, makeValueInput())],
    ['package', () => service.createPackage(titleCard.title_card_id, makePackageInput())],
    ['promotion', () => service.createPromotionDecision(titleCard.title_card_id, {
      research_question_id: 'question_001',
      value_assessment_id: 'value_001',
      decision: 'hold',
      reason_summary: 'Legacy write must be closed.',
      created_by: 'human',
    })],
    ['promotion', () => service.promoteTitleCardToPaperProject(titleCard.title_card_id, {
      research_question_id: 'question_001',
      value_assessment_id: 'value_001',
      package_id: 'package_001',
      title: 'Legacy promotion must be closed',
      created_by: 'hybrid',
    })],
  ] as const;

  for (const [capability, write] of semanticWrites) {
    await assert.rejects(
      write,
      (error: unknown) => error instanceof AppError
        && error.statusCode === 409
        && error.errorCode === 'GATE_CONSTRAINT_FAILED'
        && error.details?.disabled_capability === capability
        && error.details?.canonical_recovery === '/topic-selection/title-cards/{titleCardId}/research-status',
    );
  }
  assert.equal((await repository.listNeedReviews(titleCard.title_card_id)).length, 0);
  assert.equal(calls.length, 0);
  assert.deepEqual((await service.getEvidenceBasket(titleCard.title_card_id)).items.map((item) => item.literature_id), ['lit_001']);
});
