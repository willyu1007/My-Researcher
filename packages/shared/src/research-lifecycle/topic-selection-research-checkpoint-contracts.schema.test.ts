import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {
  topicSelectionResearchCheckpointDecisionInputSchema,
  topicSelectionResearchContinuationEnvelopeEvaluationInputSchema,
  topicSelectionResearchContinuationEnvelopeEvaluationSchema,
  topicSelectionResearchContinuationEnvelopeSchema,
  topicSelectionResearchObjectionInputSchema,
  topicSelectionResearchObjectionResolutionInputSchema,
  topicSelectionResearchStageManifestSchema,
  topicSelectionResearchStageViewSchema,
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

async function injectResponse(schema: object, payload: object) {
  const app = Fastify();
  app.get('/', { schema: { response: { 200: schema } } }, async () => payload);
  const response = await app.inject({ method: 'GET', url: '/' });
  await app.close();
  return response;
}

test('research stage manifest schema accepts the canonical seven-stage current-pointer projection', async () => {
  const stages = [
    'overview',
    'evidence_landscape',
    'research_gap',
    'research_question',
    'value_feasibility',
    'topic_package',
    'promotion_review',
  ].map((stage, index) => ({
    stage,
    state: index < 2 ? 'current' : 'unavailable',
    current_selection_rule: stage === 'overview'
      ? 'derived_from_current_manifest'
      : stage === 'value_feasibility'
        ? 'value_disposition_is_current'
        : stage === 'topic_package'
          ? 'latest_created_at_then_id'
          : 'checkpoint_unique_current_key',
    authority_ref: index === 1 ? ref : null,
    checkpoint_ref: index === 1
      ? { ref_type: 'research_checkpoint', ref_id: 'checkpoint_1', title_card_id: 'title_1' }
      : null,
    supersedes_ref: null,
    snapshot_hash: index < 2 ? HASH : null,
    status: index < 2 ? 'pending' : null,
    source_refs: index === 1 ? [ref] : [],
    artifact_refs: [],
    issue_codes: index < 2 ? [] : ['STAGE_NOT_MATERIALIZED'],
  }));
  const response = await injectResponse(topicSelectionResearchStageManifestSchema, {
    schema_version: 'TopicSelectionResearchStageManifest@v1',
    title_card_id: 'title_1',
    current_stage: 'evidence_landscape',
    next_human_decision_stage: 'evidence_landscape',
    stages,
    manifest_hash: HASH,
  });
  assert.equal(response.statusCode, 200, response.body);
});

test('research stage view schema separates concise human Markdown from the LLM working set', async () => {
  const base = {
    schema_version: 'TopicSelectionResearchStageView@v1',
    title_card_id: 'title_1',
    stage: 'evidence_landscape',
    state: 'current',
    manifest_hash: HASH,
    source_snapshot_hash: HASH,
    view_hash: HASH,
  };
  const humanResponse = await injectResponse(topicSelectionResearchStageViewSchema, {
    ...base,
    audience: 'human',
    markdown: '# 证据版图\n\n当前结论清晰。',
  });
  assert.equal(humanResponse.statusCode, 200, humanResponse.body);
  const llmResponse = await injectResponse(topicSelectionResearchStageViewSchema, {
    ...base,
    audience: 'llm',
    working_set: { manifest_entry: { stage: 'evidence_landscape' } },
  });
  assert.equal(llmResponse.statusCode, 200, llmResponse.body);
  const mixedResponse = await injectResponse(topicSelectionResearchStageViewSchema, {
    ...base,
    audience: 'human',
    markdown: '# 证据版图',
    working_set: { forbidden_duplicate_plane: true },
  });
  assert.equal(mixedResponse.statusCode, 500);
});

test('continuation envelope schemas classify routine and confirmation-required effects without node semantics', async () => {
  const envelope = {
    schema_version: 'TopicSelectionResearchContinuationEnvelope@v1',
    intent: 'advance_to_next_human_decision',
    title_card_id: 'title_1',
    manifest_hash: HASH,
    environment_scope: 'selected_local_backend',
    target_human_decision_stage: 'evidence_landscape',
    boundary_reached: false,
    routine_effect_classes: [
      'local_read',
      'deterministic_local_write',
      'bounded_non_provider_job',
      'verification',
      'recoverable_retry',
      'selected_local_backend_lifecycle',
    ],
    confirmation_required_effect_classes: [
      'research_meaning_change',
      'human_authority_write',
      'material_risk_acceptance',
      'provider_or_material_cost',
      'external_acquisition',
      'destructive_or_control_sensitive',
      'target_environment_change',
      'material_scope_expansion',
      'ambiguous_recovery',
    ],
    reason_codes: [],
    envelope_hash: HASH,
  };
  assert.equal(
    (await injectResponse(topicSelectionResearchContinuationEnvelopeSchema, envelope)).statusCode,
    200,
  );
  assert.equal((await inject(topicSelectionResearchContinuationEnvelopeEvaluationInputSchema, {
    schema_version: 'TopicSelectionResearchContinuationEnvelopeEvaluationInput@v1',
    envelope_hash: HASH,
    manifest_hash: HASH,
    proposed_effects: ['local_read', 'verification'],
  })).statusCode, 200);
  assert.equal((await injectResponse(topicSelectionResearchContinuationEnvelopeEvaluationSchema, {
    schema_version: 'TopicSelectionResearchContinuationEnvelopeEvaluation@v1',
    title_card_id: 'title_1',
    decision: 'continue',
    envelope_hash: HASH,
    manifest_hash: HASH,
    target_human_decision_stage: 'evidence_landscape',
    routine_effects: ['local_read', 'verification'],
    blocking_effects: [],
    reason_codes: ['WITHIN_ROUTINE_EFFECT_ENVELOPE'],
    evaluation_hash: HASH,
  })).statusCode, 200);
});

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
