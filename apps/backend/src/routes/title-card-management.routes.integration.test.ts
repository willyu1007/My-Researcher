import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../app.js';

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function createLiterature(app: ReturnType<typeof buildApp>, suffix: string) {
  const importRes = await app.inject({
    method: 'POST',
    url: '/literature/collections/import',
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

test('legacy title-card semantic writes fail closed with canonical API recovery', async () => {
  const app = buildApp();
  try {
    const suffix = uniqueId('legacy-cutover');
    const literatureId = await createLiterature(app, suffix);
    const titleCard = await createTitleCard(app, suffix);
    const basketRes = await app.inject({
      method: 'PATCH',
      url: `/title-cards/${encodeURIComponent(titleCard.title_card_id)}/evidence-basket`,
      payload: { add_literature_ids: [literatureId] },
    });
    assert.equal(basketRes.statusCode, 200);

    const legacyWrite = await app.inject({
      method: 'POST',
      url: `/title-cards/${encodeURIComponent(titleCard.title_card_id)}/needs`,
      payload: {
        need_statement: 'This write must use the canonical checkpoint path.',
        who_needs_it: 'Researchers',
        scenario: 'Legacy semantic write cutover.',
        literature_ids: [literatureId],
        unmet_need_category: 'evaluation_gap',
        falsification_verdict: 'validated',
        significance_score: 4,
        measurability_score: 4,
        feasibility_signal: 'medium',
        validated_need: true,
        judgement_summary: 'Legacy path must not create authority.',
        confidence: 0.8,
        evidence_refs: [{ literature_id: literatureId, source_type: 'abstract' }],
      },
    });
    assert.equal(legacyWrite.statusCode, 409);
    assert.deepEqual(legacyWrite.json().error.details, {
      canonical_recovery: '/topic-selection/title-cards/{titleCardId}/research-status',
      disabled_capability: 'need',
    });
  } finally {
    await app.close();
  }
});

if ((process.env.TITLE_CARD_REPOSITORY ?? process.env.RESEARCH_LIFECYCLE_REPOSITORY) === 'prisma') {
  test('title-card root and evidence basket persist while legacy child reads remain available with Prisma', async () => {
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
      assert.equal(card.need_count, 0);

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
      assert.equal(needs.items.length, 0);
    } finally {
      await secondApp.close();
    }
  });
}
