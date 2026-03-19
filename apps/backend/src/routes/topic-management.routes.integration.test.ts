import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../app.js';

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function valuePayload() {
  const gate = { pass: true, reason: 'Passes current threshold.' };
  const dim = { score: 4, reason: 'Competitive and defensible.', confidence: 0.8 };
  return {
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
    evidence_refs: [{ literature_id: 'placeholder', source_type: 'abstract' }],
  };
}

async function createTopicAndLiterature(app: ReturnType<typeof buildApp>, suffix: string) {
  const topicId = `TOPIC-${suffix}`;
  const topicRes = await app.inject({
    method: 'POST',
    url: '/topics/settings',
    payload: {
      topic_id: topicId,
      name: `Topic ${suffix}`,
    },
  });
  assert.equal(topicRes.statusCode, 201);

  const importRes = await app.inject({
    method: 'POST',
    url: '/literature/import',
    payload: {
      items: [
        {
          provider: 'manual',
          external_id: `manual-${suffix}`,
          title: `Seed Literature ${suffix}`,
          abstract: 'Seed abstract for topic management integration testing.',
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

  return { topicId, literatureId };
}

test('topic management full flow succeeds through buildApp wiring', async () => {
  const app = buildApp();
  try {
    const suffix = uniqueId('topic-flow');
    const { topicId, literatureId } = await createTopicAndLiterature(app, suffix);

    const needRes = await app.inject({
      method: 'POST',
      url: `/topics/${encodeURIComponent(topicId)}/need-reviews`,
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
    const need = needRes.json() as { record_id: string };

    const questionRes = await app.inject({
      method: 'POST',
      url: `/topics/${encodeURIComponent(topicId)}/questions`,
      payload: {
        main_question: 'How can retrieval remain stable under long-context literature reasoning?',
        research_slice: 'robust long-context retrieval',
        contribution_hypothesis: 'method',
        source_need_review_ids: [need.record_id],
        judgement_summary: 'Question derived from validated robustness need.',
        confidence: 0.81,
      },
    });
    assert.equal(questionRes.statusCode, 201);
    const question = questionRes.json() as { record_id: string };

    const valueRes = await app.inject({
      method: 'POST',
      url: `/topics/${encodeURIComponent(topicId)}/questions/${question.record_id}/value-assessments`,
      payload: {
        ...valuePayload(),
        evidence_refs: [{ literature_id: literatureId, source_type: 'abstract' }],
      },
    });
    assert.equal(valueRes.statusCode, 201);
    const value = valueRes.json() as { record_id: string };

    const packageRes = await app.inject({
      method: 'POST',
      url: `/topics/${encodeURIComponent(topicId)}/questions/${question.record_id}/value-assessments/${value.record_id}/topic-package`,
      payload: {
        title_candidates: ['Robust Long-Context Retrieval for Literature Reasoning'],
        research_background: 'Prior work does not adequately stabilize retrieval under long-context reasoning workflows.',
        contribution_summary: 'A robust retrieval approach plus targeted evaluation.',
        candidate_methods: ['adaptive retrieval', 'context compression'],
        evaluation_plan: 'Compare against strong retrieval baselines on long-context literature QA.',
        selected_literature_evidence_ids: [literatureId],
      },
    });
    assert.equal(packageRes.statusCode, 201);
    const pkg = packageRes.json() as { record_id: string };

    const promoteRes = await app.inject({
      method: 'POST',
      url: `/topics/${encodeURIComponent(topicId)}/promote-to-paper-project`,
      payload: {
        question_id: question.record_id,
        value_assessment_id: value.record_id,
        package_id: pkg.record_id,
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
  test('topic management records persist across app rebuilds in prisma mode', async () => {
    const suffix = uniqueId('topic-persist');
    const firstApp = buildApp();
    let firstAppClosed = false;
    try {
      const { topicId, literatureId } = await createTopicAndLiterature(firstApp, suffix);

      const createRes = await firstApp.inject({
        method: 'POST',
        url: `/topics/${encodeURIComponent(topicId)}/need-reviews`,
        payload: {
          need_statement: 'Persistence should keep need reviews after app restart.',
          who_needs_it: 'Persistence testers',
          scenario: 'Restarting the app should not drop topic management state.',
          literature_ids: [literatureId],
          unmet_need_category: 'robustness',
          falsification_verdict: 'validated',
          significance_score: 4,
          measurability_score: 4,
          feasibility_signal: 'medium',
          validated_need: true,
          judgement_summary: 'Persistence-backed review should survive rebuild.',
          confidence: 0.84,
          evidence_refs: [{ literature_id: literatureId, source_type: 'abstract' }],
        },
      });
      assert.equal(createRes.statusCode, 201);
      const created = createRes.json() as { record_id: string };
      await firstApp.close();
      firstAppClosed = true;

      const secondApp = buildApp();
      try {
        const listRes = await secondApp.inject({
          method: 'GET',
          url: `/topics/${encodeURIComponent(topicId)}/need-reviews`,
        });
        assert.equal(listRes.statusCode, 200);
        const listBody = listRes.json() as { items: Array<{ record_id: string }> };
        assert.ok(listBody.items.some((item) => item.record_id === created.record_id));
      } finally {
        await secondApp.close();
      }
    } finally {
      if (!firstAppClosed) {
        await firstApp.close();
      }
    }
  });
}
