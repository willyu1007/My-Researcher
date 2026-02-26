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

test('governance read endpoints and release review endpoint work together', async () => {
  const app = buildApp();

  const createRes = await app.inject({
    method: 'POST',
    url: '/paper-projects',
    payload: {
      topic_id: 'TOPIC-INT-4',
      title: 'Governance Integration Paper',
      created_by: 'human',
      initial_context: {
        literature_evidence_ids: ['LIT-INT-4'],
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
        run_id: 'RUN-INT-2',
        lane_id: 'LANE-INT-2',
        attempt_id: 'ATT-INT-2',
        created_by: 'llm',
        created_at: new Date().toISOString(),
      },
      payload_ref: 'experiment_plan_v:EXP-INT-2',
      node_status: 'candidate',
      value_judgement_payload: {
        judgement_id: 'J-INT-2',
        decision: 'hold',
        core_score_vector: { technical_soundness: 0.7 },
        extension_score_vector: { protocol_fairness: 0.7 },
        confidence: 0.8,
        reason_summary: 'hold for now',
        reviewer: 'llm',
        timestamp: new Date().toISOString(),
      },
    },
  });

  assert.equal(commitRes.statusCode, 200);

  const timelineRes = await app.inject({
    method: 'GET',
    url: '/paper-projects/' + paperId + '/timeline',
  });
  assert.equal(timelineRes.statusCode, 200);
  const timelineBody = timelineRes.json();
  assert.equal(timelineBody.paper_id, paperId);
  assert.equal(Array.isArray(timelineBody.events), true);
  assert.equal(timelineBody.events.length > 0, true);

  const metricsRes = await app.inject({
    method: 'GET',
    url: '/paper-projects/' + paperId + '/resource-metrics',
  });
  assert.equal(metricsRes.statusCode, 200);
  const metricsBody = metricsRes.json();
  assert.equal(metricsBody.paper_id, paperId);
  assert.equal(typeof metricsBody.paper_runtime_metric.tokens, 'number');

  const artifactRes = await app.inject({
    method: 'GET',
    url: '/paper-projects/' + paperId + '/artifact-bundle',
  });
  assert.equal(artifactRes.statusCode, 200);
  const artifactBody = artifactRes.json();
  assert.equal(artifactBody.paper_id, paperId);
  assert.equal(typeof artifactBody.artifact_bundle.proposal_url, 'string');

  const reviewRes = await app.inject({
    method: 'POST',
    url: '/paper-projects/' + paperId + '/release-gate/review',
    payload: {
      reviewers: ['reviewer-1'],
      decision: 'approve',
      risk_flags: ['policy-check'],
      label_policy: 'ai-generated-required',
      comment: 'Looks good to release.',
    },
  });
  assert.equal(reviewRes.statusCode, 200);
  const reviewBody = reviewRes.json();
  assert.equal(reviewBody.gate_result.accepted, true);
  assert.equal(reviewBody.gate_result.review_id, 'RV-0001');

  const artifactAfterReviewRes = await app.inject({
    method: 'GET',
    url: '/paper-projects/' + paperId + '/artifact-bundle',
  });
  assert.equal(artifactAfterReviewRes.statusCode, 200);
  const artifactAfterReviewBody = artifactAfterReviewRes.json();
  assert.equal(typeof artifactAfterReviewBody.artifact_bundle.review_url, 'string');

  await app.close();
});

test('release review endpoint rejects invalid payload', async () => {
  const app = buildApp();

  const createRes = await app.inject({
    method: 'POST',
    url: '/paper-projects',
    payload: {
      topic_id: 'TOPIC-INT-5',
      title: 'Review Validation Paper',
      created_by: 'human',
      initial_context: {
        literature_evidence_ids: ['LIT-INT-5'],
      },
    },
  });

  const { paper_id: paperId } = createRes.json();

  const reviewRes = await app.inject({
    method: 'POST',
    url: '/paper-projects/' + paperId + '/release-gate/review',
    payload: {
      reviewers: [],
      decision: 'approve',
      risk_flags: [],
      label_policy: 'ai-generated-required',
    },
  });

  assert.equal(reviewRes.statusCode, 400);
  const body = reviewRes.json();
  assert.equal(body.error.code, 'INVALID_PAYLOAD');

  await app.close();
});

test('literature workflow routes support import, topic scope, paper link sync and citation update', async () => {
  const app = buildApp();

  const createRes = await app.inject({
    method: 'POST',
    url: '/paper-projects',
    payload: {
      topic_id: 'TOPIC-INT-LIT-1',
      title: 'Literature Workflow Paper',
      created_by: 'human',
      initial_context: {
        literature_evidence_ids: ['LIT-INT-WF-1'],
      },
    },
  });

  assert.equal(createRes.statusCode, 201);
  const { paper_id: paperId } = createRes.json();

  const importRes = await app.inject({
    method: 'POST',
    url: '/literature/import',
    payload: {
      items: [
        {
          provider: 'crossref',
          external_id: '10.2000/workflow-a',
          title: 'Workflow Paper A',
          authors: ['Alice', 'Bob'],
          year: 2024,
          doi: '10.2000/workflow-a',
          source_url: 'https://doi.org/10.2000/workflow-a',
        },
      ],
    },
  });

  assert.equal(importRes.statusCode, 200);
  const importBody = importRes.json();
  const literatureId = importBody.results[0]?.literature_id;
  assert.equal(typeof literatureId, 'string');

  const scopeRes = await app.inject({
    method: 'POST',
    url: '/topics/TOPIC-INT-LIT-1/literature-scope',
    payload: {
      actions: [
        {
          literature_id: literatureId,
          scope_status: 'in_scope',
        },
      ],
    },
  });
  assert.equal(scopeRes.statusCode, 200);
  const scopeBody = scopeRes.json();
  assert.equal(scopeBody.items.length, 1);
  assert.equal(scopeBody.items[0]?.scope_status, 'in_scope');

  const syncRes = await app.inject({
    method: 'POST',
    url: '/paper-projects/' + paperId + '/literature-links/from-topic',
    payload: {
      topic_id: 'TOPIC-INT-LIT-1',
    },
  });
  assert.equal(syncRes.statusCode, 200);
  const syncBody = syncRes.json();
  assert.equal(syncBody.linked_count, 1);

  const paperLiteratureRes = await app.inject({
    method: 'GET',
    url: '/paper-projects/' + paperId + '/literature',
  });
  assert.equal(paperLiteratureRes.statusCode, 200);
  const paperLiteratureBody = paperLiteratureRes.json();
  assert.equal(paperLiteratureBody.items.length, 1);
  const linkId = paperLiteratureBody.items[0]?.link_id;

  const patchRes = await app.inject({
    method: 'PATCH',
    url: '/paper-projects/' + paperId + '/literature-links/' + linkId,
    payload: {
      citation_status: 'cited',
      note: 'used in final draft',
    },
  });
  assert.equal(patchRes.statusCode, 200);
  const patchBody = patchRes.json();
  assert.equal(patchBody.item.citation_status, 'cited');
  assert.equal(patchBody.item.note, 'used in final draft');

  const scopeQueryRes = await app.inject({
    method: 'GET',
    url: '/topics/TOPIC-INT-LIT-1/literature-scope',
  });
  assert.equal(scopeQueryRes.statusCode, 200);
  const scopeQueryBody = scopeQueryRes.json();
  assert.equal(scopeQueryBody.items.length, 1);

  const overviewRes = await app.inject({
    method: 'GET',
    url: '/literature/overview?topic_id=TOPIC-INT-LIT-1&paper_id=' + paperId,
  });
  assert.equal(overviewRes.statusCode, 200);
  const overviewBody = overviewRes.json();
  assert.equal(overviewBody.summary.total_literatures, 1);
  assert.equal(overviewBody.summary.cited_count, 1);

  const metadataPatchRes = await app.inject({
    method: 'PATCH',
    url: '/literature/' + literatureId + '/metadata',
    payload: {
      rights_class: 'OA',
      tags: ['survey', 'baseline'],
    },
  });
  assert.equal(metadataPatchRes.statusCode, 200);
  const metadataPatchBody = metadataPatchRes.json();
  assert.equal(metadataPatchBody.literature_id, literatureId);
  assert.deepEqual(metadataPatchBody.tags, ['survey', 'baseline']);
  assert.equal(metadataPatchBody.rights_class, 'OA');

  const invalidWebImportRes = await app.inject({
    method: 'POST',
    url: '/literature/web-import',
    payload: {
      urls: [],
    },
  });
  assert.equal(invalidWebImportRes.statusCode, 400);

  const invalidZoteroImportRes = await app.inject({
    method: 'POST',
    url: '/literature/zotero-import',
    payload: {
      library_type: 'users',
    },
  });
  assert.equal(invalidZoteroImportRes.statusCode, 400);

  await app.close();
});
