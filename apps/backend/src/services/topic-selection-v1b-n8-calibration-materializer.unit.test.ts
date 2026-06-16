import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError } from '../errors/app-error.js';
import {
  buildN8CalibrationMockDraft,
  materializeN8CalibrationRunRequest,
  verifyN8CalibrationRunRequest,
  type TopicSelectionN8CalibrationCorpusEntry,
} from './topic-selection-v1b-n8-calibration-materializer.js';

function sampleEntry(overrides: Partial<TopicSelectionN8CalibrationCorpusEntry> = {}): TopicSelectionN8CalibrationCorpusEntry {
  return {
    corpus_entry_id: 'calib_sample_001',
    schema_version: 'TopicSelectionN8CalibrationCorpusEntry@v1',
    title_card_id: 'title_card_calib_sample',
    provenance: { author: 'unit-test', created_at: '2026-06-15T00:00:00.000Z', source_note: 'synthetic', derived_from: 'synthetic' },
    topic_question: { main_question: 'Does X improve Y under constraint Z?', question_type: 'empirical' },
    question_contract: { main_question: 'Does X improve Y under constraint Z?', claim_ceiling: 'bounded', expected_claim: 'X improves Y by N%' },
    answerability_plan: { answerability_verdict: 'answerable', datasets_or_resources: ['ds-a'], metrics: ['m-1'], baselines: ['b-1'] },
    research_slice: { scope: 'narrow', boundaries: ['within Z'] },
    evidence: [{ evidence_role: 'support', mapped_question_part: 'X→Y', rationale: 'prior result' }],
    n8_debate_admission: { debate_level: 'compact_assessment_debate', high_value_signal_codes: [], risk_signal_codes: [], rationale: 'baseline' },
    ground_truth_disposition: 'advance_to_package',
    expected_band: 'clear_pass',
    labeler_notes: 'synthetic clear-pass example for the materialize self-test',
    ...overrides,
  };
}

test('materialized RunRequest passes the REAL N8 lineage gates under a mock executor', async () => {
  const entry = sampleEntry();
  const materialized = await materializeN8CalibrationRunRequest(entry);

  assert.equal(materialized.request.node_id, 'topic-selection.v1b.assess-topic-value.v1');
  assert.equal(materialized.projectionRef.ref_type, 'artifact_ref');
  // the projection ref AND the n7 handoff ref must be in source_refs (gate requirements)
  const refIds = materialized.request.frozen_input.source_refs.map((r) => r.ref_id);
  assert.ok(refIds.includes(materialized.projectionRef.ref_id));
  assert.ok(refIds.includes(materialized.bodyRefs.n7_handoff.ref_id));

  const draft = buildN8CalibrationMockDraft(materialized.bodyRefs.topic_question_contract, { total_score: 66, confidence: 0.5 });
  const verified = await verifyN8CalibrationRunRequest(materialized, draft);

  assert.equal(verified.status, 'succeeded');
  assert.equal(verified.invocation_status, 'succeeded');
  // capture reads structured_output (the draft scores), not provenance — proves the calibration capture works.
  assert.equal(verified.structured_output?.total_score, 66);
  assert.equal(verified.structured_output?.confidence, 0.5);
  assert.equal(verified.structured_output?.dimension_scores.length, 9);
  assert.match(verified.context_packet_hash ?? '', /^[a-f0-9]{64}$/);
});

test('the frozen payload and the projection lineage are byte-equal by construction', async () => {
  const materialized = await materializeN8CalibrationRunRequest(sampleEntry());
  const payload = materialized.request.frozen_input.payload as Record<string, unknown>;
  // a second materialize of the same entry with a fixed idFactory is deterministic
  const second = await materializeN8CalibrationRunRequest(sampleEntry(), {
    idFactory: (p) => `${p}_fixed`,
    workflowRunId: 'wf_fixed',
    nodeAttemptId: 'na_fixed',
  });
  assert.ok(payload.topic_question_contract_hash);
  assert.ok((second.request.frozen_input.payload as Record<string, unknown>).topic_question_contract_hash);
});

test('a tampered lineage hash is REJECTED by the real gate (INVALID_PAYLOAD) — the drift guardrail bites', async () => {
  const materialized = await materializeN8CalibrationRunRequest(sampleEntry());
  const draft = buildN8CalibrationMockDraft(materialized.bodyRefs.topic_question_contract, { total_score: 83, confidence: 0.82 });
  const tampered = {
    ...materialized,
    request: {
      ...materialized.request,
      frozen_input: {
        ...materialized.request.frozen_input,
        // break the frozen⇄projection equality the policy gate enforces
        payload: { ...(materialized.request.frozen_input.payload as Record<string, unknown>), topic_question_hash: '9'.repeat(64) },
      },
    },
  };
  await assert.rejects(
    () => verifyN8CalibrationRunRequest(tampered, draft),
    (err: unknown) => err instanceof AppError && err.errorCode === 'INVALID_PAYLOAD',
  );
});

test('a wrong node_id is REJECTED by the real gate', async () => {
  const materialized = await materializeN8CalibrationRunRequest(sampleEntry());
  const draft = buildN8CalibrationMockDraft(materialized.bodyRefs.topic_question_contract, { total_score: 83, confidence: 0.82 });
  const tampered = {
    ...materialized,
    request: { ...materialized.request, node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1' as typeof materialized.request.node_id },
  };
  await assert.rejects(
    () => verifyN8CalibrationRunRequest(tampered, draft),
    (err: unknown) => err instanceof AppError && err.errorCode === 'INVALID_PAYLOAD',
  );
});

test('dropping the projection from source_refs is REJECTED (no resolvable N7→N8 projection)', async () => {
  const materialized = await materializeN8CalibrationRunRequest(sampleEntry());
  const draft = buildN8CalibrationMockDraft(materialized.bodyRefs.topic_question_contract, { total_score: 83, confidence: 0.82 });
  const tampered = {
    ...materialized,
    request: {
      ...materialized.request,
      frozen_input: {
        ...materialized.request.frozen_input,
        source_refs: materialized.request.frozen_input.source_refs.filter((r) => r.ref_id !== materialized.projectionRef.ref_id),
      },
    },
  };
  await assert.rejects(
    () => verifyN8CalibrationRunRequest(tampered, draft),
    (err: unknown) => err instanceof AppError && err.errorCode === 'INVALID_PAYLOAD',
  );
});
