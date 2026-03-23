import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../app.js';

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function valuePayload(researchQuestionId: string, literatureId: string) {
  const gate = { pass: true, reason: 'Passes current threshold.' };
  const dim = { score: 4, reason: 'Competitive and defensible.', confidence: 0.8 };
  return {
    research_question_id: researchQuestionId,
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
    evidence_refs: [{ literature_id: literatureId, source_type: 'abstract' }],
  };
}

async function createLiterature(app: ReturnType<typeof buildApp>, suffix: string) {
  const importRes = await app.inject({
    method: 'POST',
    url: '/literature/import',
    payload: {
      items: [
        {
          provider: 'manual',
          external_id: `manual-${suffix}`,
          title: `Seed Literature ${suffix}`,
          abstract: 'Seed abstract for title-card integration testing.',
          authors: ['Integration Author'],
          year: 2025,
          doi: `10.1000/${suffix.toLowerCase()}`,
          source_url: `https://example.com/${suffix.toLowerCase()}`,
        },
      ],
    },
  });
  assert.equal(importRes.statusCode, 200);
  const importBody = importRes.json() as { results: Array<{ literature_id: string }> };
  const literatureId = importBody.results[0]?.literature_id;
  assert.ok(literatureId);
  return literatureId;
}

async function createTitleCard(app: ReturnType<typeof buildApp>, suffix: string) {
  const titleCardRes = await app.inject({
    method: 'POST',
    url: '/title-cards',
    payload: {
      working_title: `Integration Title Card ${suffix}`,
      brief: 'Integration title card for full route wiring.',
    },
  });
  assert.equal(titleCardRes.statusCode, 201);
  return titleCardRes.json() as { title_card_id: string };
}

test('title-card management full flow succeeds through buildApp wiring', async () => {
  const app = buildApp();
  try {
    const suffix = uniqueId('title-flow');
    const literatureId = await createLiterature(app, suffix);
    const titleCard = await createTitleCard(app, suffix);

    const basketRes = await app.inject({
      method: 'PATCH',
      url: `/title-cards/${encodeURIComponent(titleCard.title_card_id)}/evidence-basket`,
      payload: {
        add_literature_ids: [literatureId],
      },
    });
    assert.equal(basketRes.statusCode, 200);

    const needRes = await app.inject({
      method: 'POST',
      url: `/title-cards/${encodeURIComponent(titleCard.title_card_id)}/needs`,
      payload: {
        need_statement: 'Existing methods degrade sharply under long-context retrieval settings.',
        who_needs_it: 'RAG researchers',
        scenario: 'Long-context retrieval and answer synthesis for CS literature tasks.',
        literature_ids: [literatureId],
        unmet_need_category: 'robustness',
        falsification_verdict: 'validated',
        significance_score: 4,
        measurability_score: 4,
        feasibility_signal: 'medium',
        validated_need: true,
        judgement_summary: 'The need is measurable and not already fully solved.',
        confidence: 0.82,
        evidence_refs: [{ literature_id: literatureId, source_type: 'abstract' }],
      },
    });
    assert.equal(needRes.statusCode, 201);
    const need = needRes.json() as { need_id: string };

    const questionRes = await app.inject({
      method: 'POST',
      url: `/title-cards/${encodeURIComponent(titleCard.title_card_id)}/research-questions`,
      payload: {
        main_question: 'How can retrieval remain stable under long-context literature reasoning?',
        research_slice: 'robust long-context retrieval',
        contribution_hypothesis: 'method',
        source_need_ids: [need.need_id],
        judgement_summary: 'Question derived from validated robustness need.',
        confidence: 0.81,
      },
    });
    assert.equal(questionRes.statusCode, 201);
    const question = questionRes.json() as { research_question_id: string };

    const valueRes = await app.inject({
      method: 'POST',
      url: `/title-cards/${encodeURIComponent(titleCard.title_card_id)}/value-assessments`,
      payload: valuePayload(question.research_question_id, literatureId),
    });
    assert.equal(valueRes.statusCode, 201);
    const value = valueRes.json() as { value_assessment_id: string };

    const packageRes = await app.inject({
      method: 'POST',
      url: `/title-cards/${encodeURIComponent(titleCard.title_card_id)}/packages`,
      payload: {
        research_question_id: question.research_question_id,
        value_assessment_id: value.value_assessment_id,
        title_candidates: ['Robust Long-Context Retrieval for Literature Reasoning'],
        research_background: 'Prior work does not adequately stabilize retrieval under long-context reasoning workflows.',
        contribution_summary: 'A robust retrieval approach plus targeted evaluation.',
        candidate_methods: ['adaptive retrieval', 'context compression'],
        evaluation_plan: 'Compare against strong retrieval baselines on long-context literature QA.',
        selected_literature_evidence_ids: [literatureId],
      },
    });
    assert.equal(packageRes.statusCode, 201);
    const pkg = packageRes.json() as { package_id: string };

    const promoteRes = await app.inject({
      method: 'POST',
      url: `/title-cards/${encodeURIComponent(titleCard.title_card_id)}/promote-to-paper-project`,
      payload: {
        research_question_id: question.research_question_id,
        value_assessment_id: value.value_assessment_id,
        package_id: pkg.package_id,
        title: `Integration Paper ${suffix}`,
        created_by: 'hybrid',
      },
    });
    assert.equal(promoteRes.statusCode, 201);
    const promoteBody = promoteRes.json() as { paper_id: string; decision_id: string };
    assert.ok(promoteBody.paper_id);
    assert.ok(promoteBody.decision_id);
  } finally {
    await app.close();
  }
});

if ((process.env.TOPIC_REPOSITORY ?? process.env.RESEARCH_LIFECYCLE_REPOSITORY) === 'prisma') {
  test('title-card root, basket, and child records persist across app rebuilds with Prisma', async () => {
    const suffix = uniqueId('title-prisma');
    const firstApp = buildApp();
    let titleCardId = '';
    let literatureId = '';

    try {
      literatureId = await createLiterature(firstApp, suffix);
      const titleCard = await createTitleCard(firstApp, suffix);
      titleCardId = titleCard.title_card_id;

      const basketRes = await firstApp.inject({
        method: 'PATCH',
        url: `/title-cards/${encodeURIComponent(titleCardId)}/evidence-basket`,
        payload: {
          add_literature_ids: [literatureId],
        },
      });
      assert.equal(basketRes.statusCode, 200);

      const needRes = await firstApp.inject({
        method: 'POST',
        url: `/title-cards/${encodeURIComponent(titleCardId)}/needs`,
        payload: {
          need_statement: 'Prisma persistence regression check.',
          who_needs_it: 'Persistence test',
          scenario: 'Ensure rebuilds do not drop title-card workbench state.',
          literature_ids: [literatureId],
          unmet_need_category: 'evaluation_gap',
          falsification_verdict: 'validated',
          significance_score: 4,
          measurability_score: 4,
          feasibility_signal: 'medium',
          validated_need: true,
          judgement_summary: 'Need should persist across app instances.',
          confidence: 0.77,
          evidence_refs: [{ literature_id: literatureId, source_type: 'abstract' }],
        },
      });
      assert.equal(needRes.statusCode, 201);
    } finally {
      await firstApp.close();
    }

    const secondApp = buildApp();
    try {
      const cardRes = await secondApp.inject({
        method: 'GET',
        url: `/title-cards/${encodeURIComponent(titleCardId)}`,
      });
      assert.equal(cardRes.statusCode, 200);
      const card = cardRes.json() as { title_card_id: string; evidence_count: number; need_count: number };
      assert.equal(card.title_card_id, titleCardId);
      assert.equal(card.evidence_count, 1);
      assert.equal(card.need_count, 1);

      const basketRes = await secondApp.inject({
        method: 'GET',
        url: `/title-cards/${encodeURIComponent(titleCardId)}/evidence-basket`,
      });
      assert.equal(basketRes.statusCode, 200);
      const basket = basketRes.json() as { items: Array<{ literature_id: string }> };
      assert.deepEqual(basket.items.map((item) => item.literature_id), [literatureId]);

      const needsRes = await secondApp.inject({
        method: 'GET',
        url: `/title-cards/${encodeURIComponent(titleCardId)}/needs`,
      });
      assert.equal(needsRes.statusCode, 200);
      const needs = needsRes.json() as { items: Array<{ title_card_id: string }> };
      assert.equal(needs.items.length, 1);
      assert.equal(needs.items[0]?.title_card_id, titleCardId);
    } finally {
      await secondApp.close();
    }
  });
}
