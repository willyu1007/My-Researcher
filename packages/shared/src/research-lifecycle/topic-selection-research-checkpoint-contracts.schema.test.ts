import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {
  topicSelectionResearchCheckpointDecisionInputSchema,
  topicSelectionResearchObjectionInputSchema,
  topicSelectionResearchObjectionResolutionInputSchema,
} from './topic-selection-research-checkpoint-contracts.js';

const HASH = 'a'.repeat(64);
const actor = { actor_type: 'human', actor_id: 'researcher_1' } as const;
const ref = { ref_type: 'evidence_map', ref_id: 'evidence_map_1', title_card_id: 'title_1' };

async function inject(schema: object, payload: object) {
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  app.post('/', { schema: { body: schema } }, async () => ({ ok: true }));
  const response = await app.inject({ method: 'POST', url: '/', payload });
  await app.close();
  return response;
}

test('research checkpoint decision schema accepts complete strict-human evidence review', async () => {
  const response = await inject(topicSelectionResearchCheckpointDecisionInputSchema, {
    decision_key: 'decision_1',
    decision: 'advance',
    actor,
    confirmed_snapshot_hash: HASH,
    rationale: 'The current evidence landscape is sufficiently reviewed.',
    review_payload: {
      review_kind: 'evidence_landscape',
      nearest_work_reviewed: true,
      disconfirming_evidence_reviewed: true,
      source_quality_reviewed: true,
      limitations: [],
    },
  });
  assert.equal(response.statusCode, 200, response.body);
});

test('research checkpoint decision schema rejects non-human authority and hidden fields', async () => {
  const base = {
    decision_key: 'decision_1',
    decision: 'advance',
    actor,
    confirmed_snapshot_hash: HASH,
    rationale: 'reviewed',
    review_payload: {
      review_kind: 'question_contract',
      mechanism_identifiable: true,
      proxy_operationalized: true,
      confounds_reviewed: true,
      falsification_reviewed: true,
      claim_ceiling_reviewed: true,
      objections_reviewed: true,
      review_notes: [],
    },
  };
  const nonHuman = await inject(topicSelectionResearchCheckpointDecisionInputSchema, {
    ...base,
    actor: { actor_type: 'agent', actor_id: 'agent_1' },
  });
  assert.equal(nonHuman.statusCode, 400);

  const hidden = await inject(topicSelectionResearchCheckpointDecisionInputSchema, {
    ...base,
    bypass_currentness: true,
  });
  assert.equal(hidden.statusCode, 400);

  const reviewWithoutObjectionConfirmation = Object.fromEntries(
    Object.entries(base.review_payload).filter(([key]) => key !== 'objections_reviewed'),
  );
  const missingObjectionReview = await inject(topicSelectionResearchCheckpointDecisionInputSchema, {
    ...base,
    review_payload: reviewWithoutObjectionConfirmation,
  });
  assert.equal(missingObjectionReview.statusCode, 400);
});

test('objection and resolution schemas require snapshot-bound human input', async () => {
  const objection = await inject(topicSelectionResearchObjectionInputSchema, {
    objection_key: 'objection_1',
    severity: 'blocking',
    summary: 'The research object is still a parameter tweak.',
    rationale: 'No distinct mechanism or intervention is represented.',
    source_refs: [ref],
    actor,
    confirmed_snapshot_hash: HASH,
  });
  assert.equal(objection.statusCode, 200, objection.body);

  const resolution = await inject(topicSelectionResearchObjectionResolutionInputSchema, {
    resolution_key: 'resolution_1',
    resolution_type: 'resolved_with_revision',
    actor,
    resolved_snapshot_hash: HASH,
    rationale: 'The revised authority changes the intervention and outcome.',
    output_refs: [ref],
  });
  assert.equal(resolution.statusCode, 200, resolution.body);

  const malformedHash = await inject(topicSelectionResearchObjectionInputSchema, {
    objection_key: 'objection_2',
    severity: 'warning',
    summary: 'Check this.',
    rationale: 'Needs review.',
    actor,
    confirmed_snapshot_hash: 'not-a-hash',
  });
  assert.equal(malformedHash.statusCode, 400);
});
