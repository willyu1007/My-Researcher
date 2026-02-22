import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../app.js';

test('GET /health returns ok', async () => {
  const app = buildApp();

  const res = await app.inject({ method: 'GET', url: '/health' });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { ok: true });

  await app.close();
});

test('POST /paper-projects succeeds with valid payload', async () => {
  const app = buildApp();

  const res = await app.inject({
    method: 'POST',
    url: '/paper-projects',
    payload: {
      topic_id: 'TOPIC-INT-1',
      title: 'Integration Paper',
      created_by: 'human',
      initial_context: {
        literature_evidence_ids: ['LIT-INT-1'],
      },
    },
  });

  assert.equal(res.statusCode, 201);
  const body = res.json();
  assert.equal(body.paper_id, 'P001');
  assert.equal(body.status, 'active');

  await app.close();
});

test('POST /paper-projects returns INVALID_PAYLOAD when literature list is empty', async () => {
  const app = buildApp();

  const res = await app.inject({
    method: 'POST',
    url: '/paper-projects',
    payload: {
      topic_id: 'TOPIC-INT-2',
      title: 'Invalid Integration Paper',
      created_by: 'human',
      initial_context: {
        literature_evidence_ids: [],
      },
    },
  });

  assert.equal(res.statusCode, 400);
  const body = res.json();
  assert.equal(body.error.code, 'INVALID_PAYLOAD');

  await app.close();
});

test('gate verify happy path and no_m6 policy failure path', async () => {
  const app = buildApp();

  const createRes = await app.inject({
    method: 'POST',
    url: '/paper-projects',
    payload: {
      topic_id: 'TOPIC-INT-3',
      title: 'Gate Integration Paper',
      created_by: 'human',
      initial_context: {
        literature_evidence_ids: ['LIT-INT-3'],
      },
    },
  });

  const { paper_id: paperId } = createRes.json();

  const commitRes = await app.inject({
    method: 'POST',
    url: '/paper-projects/' + paperId + '/version-spine/commit',
    payload: {
      lineage_meta: {
        paper_id: paperId,
        stage_id: 'S3',
        module_id: 'M5',
        version_id: 'P001-M5-B01-N0001',
        run_id: 'RUN-INT-1',
        lane_id: 'LANE-INT-1',
        attempt_id: 'ATT-INT-1',
        created_by: 'llm',
        created_at: new Date().toISOString(),
      },
      payload_ref: 'experiment_plan_v:EXP-INT-1',
      node_status: 'candidate',
      value_judgement_payload: {
        judgement_id: 'J-INT-1',
        decision: 'promote',
        core_score_vector: { technical_soundness: 0.8 },
        extension_score_vector: { protocol_fairness: 0.8 },
        confidence: 0.9,
        reason_summary: 'promote node',
        reviewer: 'llm',
        timestamp: new Date().toISOString(),
      },
    },
  });

  assert.equal(commitRes.statusCode, 200);
  const { node_id: nodeId } = commitRes.json();

  const verifyOkRes = await app.inject({
    method: 'POST',
    url: '/paper-projects/' + paperId + '/stage-gates/g1/verify',
    payload: {
      candidate_node_ids: [nodeId],
      config_version: 'llm-global-default-v1',
      reviewer_mode: 'hybrid',
      analysis_contract: 'no_m6',
      override_context: {
        skip_m6_reason: 'skip training in integration test',
        training_claim_allowed: false,
      },
    },
  });

  assert.equal(verifyOkRes.statusCode, 200);
  const okBody = verifyOkRes.json();
  assert.equal(okBody.results[0].decision, 'promote');

  const verifyFailRes = await app.inject({
    method: 'POST',
    url: '/paper-projects/' + paperId + '/stage-gates/g1/verify',
    payload: {
      candidate_node_ids: [nodeId],
      config_version: 'llm-global-default-v1',
      reviewer_mode: 'hybrid',
      analysis_contract: 'no_m6',
    },
  });

  assert.equal(verifyFailRes.statusCode, 422);
  const failBody = verifyFailRes.json();
  assert.equal(failBody.error.code, 'NO_M6_POLICY_VIOLATION');

  await app.close();
});
