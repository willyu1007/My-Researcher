import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';
import { buildApp } from '../app.js';

const tempDirs = new Set<string>();

after(async () => {
  await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function mockOpenAIContentProcessing(): () => void {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    if (url.endsWith('/v1/responses')) {
      return new Response(JSON.stringify({
        output_text: JSON.stringify(buildMockDossierPayload()),
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.endsWith('/v1/embeddings')) {
      const rawInput = body.input;
      const inputs = Array.isArray(rawInput) ? rawInput : [rawInput];
      return new Response(JSON.stringify({
        data: inputs.map((_item, index) => ({
          index,
          embedding: [0.1 + index / 100, 0.2, 0.3],
        })),
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('{}', { status: 404 });
  }) as typeof fetch;

  return () => {
    globalThis.fetch = previousFetch;
  };
}

function buildMockDossierPayload() {
  const item = (id: string, type: string, statement: string) => ({
    id,
    type,
    statement,
    details: `${statement} details.`,
    source_refs: [{ ref_type: 'paragraph', ref_id: 'para-0001' }],
    confidence: 0.9,
    evidence_strength: 'high',
    notes: null,
  });
  return {
    categories: {
      research_problem: [item('rp-1', 'problem', 'The paper studies workflow evidence.')],
      contributions: [item('contrib-1', 'contribution', 'The paper contributes route-level processing.')],
      method: [item('method-1', 'method', 'The method uses explicit content processing.')],
      datasets_and_benchmarks: [],
      experiments: [],
      key_findings: [item('finding-1', 'finding', 'The workflow preserves provenance.')],
      limitations: [],
      reproducibility: [],
      related_work_positioning: [],
      evidence_candidates: [item('evidence-1', 'evidence', 'Route-level fulltext evidence supports retrieval.')],
      figure_insights: [],
      table_insights: [],
      claim_evidence_map: [item('claim-map-1', 'claim_evidence', 'Claims map to paragraph evidence.')],
      automation_signals: [item('signal-1', 'automation', 'Useful for retrieval smoke tests.')],
    },
    quality_report: {
      extraction_diagnostics: [],
    },
    display_digest: 'Route-level source-grounded dossier.',
  };
}

test('GET /health returns ok', async () => {
  const app = buildApp();

  const res = await app.inject({ method: 'GET', url: '/health' });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { ok: true });

  await app.close();
});

test('literature content-processing settings routes redact provider API keys', async () => {
  const app = buildApp();

  const initialRes = await app.inject({
    method: 'GET',
    url: '/settings/literature-content-processing',
  });
  assert.equal(initialRes.statusCode, 200);
  const initialBody = initialRes.json();
  assert.equal(initialBody.providers[0]?.provider, 'openai');
  assert.equal(initialBody.providers[0]?.api_key_set, false);
  assert.equal(initialBody.embedding.profiles[0]?.model, 'text-embedding-3-large');
  assert.equal(initialBody.extraction.profiles[0]?.model, 'gpt-5-mini');

  const patchRes = await app.inject({
    method: 'PATCH',
    url: '/settings/literature-content-processing',
    payload: {
      providers: [{ provider: 'openai', api_key: 'sk-route-secret' }],
      embedding: {
        active_profile_id: 'economy',
      },
      extraction: {
        active_profile_id: 'high_accuracy',
      },
      storage_roots: {
        raw_files: '/tmp/literature/raw',
        normalized_text: '/tmp/literature/normalized',
        artifacts_cache: '/tmp/literature/artifacts',
        indexes: '/tmp/literature/indexes',
        exports: '/tmp/literature/exports',
      },
    },
  });
  assert.equal(patchRes.statusCode, 200);
  const patchBodyText = patchRes.body;
  assert.equal(patchBodyText.includes('sk-route-secret'), false);
  const patchBody = patchRes.json();
  assert.equal(patchBody.providers[0]?.api_key_set, true);
  assert.equal(patchBody.embedding.active_profile_id, 'economy');
  assert.equal(patchBody.extraction.active_profile_id, 'high_accuracy');
  assert.equal(patchBody.storage_roots.indexes, '/tmp/literature/indexes');

  const getRes = await app.inject({
    method: 'GET',
    url: '/settings/literature-content-processing',
  });
  assert.equal(getRes.statusCode, 200);
  assert.equal(getRes.body.includes('sk-route-secret'), false);
  assert.equal(getRes.json().providers[0]?.api_key_set, true);

  await app.close();
});

test('POST /paper-projects succeeds with valid payload', async () => {
  const app = buildApp();

  const res = await app.inject({
    method: 'POST',
    url: '/paper-projects',
    payload: {
      title_card_id: 'title_card_int_1',
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
      title_card_id: 'title_card_int_2',
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
      title_card_id: 'title_card_int_3',
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
      title_card_id: 'title_card_int_4',
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
      title_card_id: 'title_card_int_5',
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
  const restoreFetch = mockOpenAIContentProcessing();

  await app.inject({
    method: 'PATCH',
    url: '/settings/literature-content-processing',
    payload: {
      providers: [{ provider: 'openai', api_key: 'sk-route-content-processing' }],
    },
  });

  try {
    const createRes = await app.inject({
    method: 'POST',
    url: '/paper-projects',
    payload: {
      title_card_id: 'title_card_int_lit_1',
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
    url: '/literature/collections/import',
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

  const removedImportRes = await app.inject({
    method: 'POST',
    url: '/literature/import',
    payload: {
      items: [],
    },
  });
  assert.equal(removedImportRes.statusCode, 404);

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
  assert.equal(typeof overviewBody.items[0]?.overview_status, 'string');
  assert.equal(typeof overviewBody.items[0]?.content_processing_state?.citation_complete, 'boolean');
  assert.equal(typeof overviewBody.items[0]?.content_processing_state?.fulltext_preprocessed, 'boolean');
  assert.equal(typeof overviewBody.items[0]?.content_processing_stage_status?.ABSTRACT_READY, 'string');
  assert.equal(typeof overviewBody.items[0]?.content_processing_actions?.process_content?.enabled, 'boolean');

  const metadataPatchRes = await app.inject({
    method: 'PATCH',
    url: '/literature/' + literatureId + '/metadata',
    payload: {
      rights_class: 'OA',
      tags: ['survey', 'baseline'],
      abstract: 'Trusted route-test abstract for explicit content processing.',
      key_content_digest: 'Trusted route-test key content for explicit content processing.',
    },
  });
  assert.equal(metadataPatchRes.statusCode, 200);
  const metadataPatchBody = metadataPatchRes.json();
  assert.equal(metadataPatchBody.literature_id, literatureId);
  assert.deepEqual(metadataPatchBody.tags, ['survey', 'baseline']);
  assert.equal(metadataPatchBody.rights_class, 'OA');
  assert.equal(metadataPatchBody.key_content_digest, 'Trusted route-test key content for explicit content processing.');

  const metadataGetRes = await app.inject({
    method: 'GET',
    url: '/literature/' + literatureId + '/metadata',
  });
  assert.equal(metadataGetRes.statusCode, 200);
  const metadataGetBody = metadataGetRes.json();
  assert.equal(metadataGetBody.literature_id, literatureId);
  assert.equal(metadataGetBody.key_content_digest, 'Trusted route-test key content for explicit content processing.');

  const fulltextDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pea-route-fulltext-'));
  tempDirs.add(fulltextDir);
  const fulltextPath = path.join(fulltextDir, 'workflow-paper-a.md');
  await fs.writeFile(
    fulltextPath,
    '# Abstract\n\nTrusted route-test abstract for explicit content processing.\n\n# Evidence\n\nRoute-level fulltext evidence.',
    'utf8',
  );
  const registerAssetRes = await app.inject({
    method: 'POST',
    url: '/literature/' + literatureId + '/content-assets',
    payload: {
      local_path: fulltextPath,
      mime_type: 'text/markdown',
    },
  });
  assert.equal(registerAssetRes.statusCode, 200);
  const registerAssetBody = registerAssetRes.json();
  assert.equal(registerAssetBody.item.literature_id, literatureId);
  assert.equal(registerAssetBody.item.status, 'registered');

  const listAssetsRes = await app.inject({
    method: 'GET',
    url: '/literature/' + literatureId + '/content-assets',
  });
  assert.equal(listAssetsRes.statusCode, 200);
  assert.equal(listAssetsRes.json().items.length, 1);

  const removedPipelineRes = await app.inject({
    method: 'GET',
    url: '/literature/' + literatureId + '/pipeline',
  });
  assert.equal(removedPipelineRes.statusCode, 404);

  const contentProcessingRes = await app.inject({
    method: 'GET',
    url: '/literature/' + literatureId + '/content-processing',
  });
  assert.equal(contentProcessingRes.statusCode, 200);
  const contentProcessingBody = contentProcessingRes.json();
  assert.equal(contentProcessingBody.literature_id, literatureId);
  assert.equal(typeof contentProcessingBody.state.citation_complete, 'boolean');
  assert.equal(typeof contentProcessingBody.state.fulltext_preprocessed, 'boolean');
  assert.equal(Array.isArray(contentProcessingBody.stage_states), true);

  const initialContentProcessingRunsRes = await app.inject({
    method: 'GET',
    url: '/literature/' + literatureId + '/content-processing/runs?limit=5',
  });
  assert.equal(initialContentProcessingRunsRes.statusCode, 200);
  assert.equal(initialContentProcessingRunsRes.json().items.length, 0);

  const removedPipelineRunsRes = await app.inject({
    method: 'POST',
    url: '/literature/' + literatureId + '/pipeline/runs',
    payload: {
      requested_stages: ['ABSTRACT_READY'],
    },
  });
  assert.equal(removedPipelineRunsRes.statusCode, 404);

  const triggerContentProcessingRunRes = await app.inject({
    method: 'POST',
    url: '/literature/' + literatureId + '/content-processing/runs',
    payload: {
      requested_stages: ['CITATION_NORMALIZED', 'ABSTRACT_READY', 'FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED'],
    },
  });
  assert.equal(triggerContentProcessingRunRes.statusCode, 200);
  const triggerContentProcessingRunBody = triggerContentProcessingRunRes.json();
  assert.equal(triggerContentProcessingRunBody.run.literature_id, literatureId);

  let listContentProcessingRunsBody: { literature_id: string; items: Array<{ status: string }> } | null = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const listContentProcessingRunsRes = await app.inject({
      method: 'GET',
      url: '/literature/' + literatureId + '/content-processing/runs?limit=5',
    });
    assert.equal(listContentProcessingRunsRes.statusCode, 200);
    const parsedBody = listContentProcessingRunsRes.json() as { literature_id: string; items: Array<{ status: string }> };
    listContentProcessingRunsBody = parsedBody;
    if (parsedBody.items[0]?.status === 'SUCCESS') {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  if (!listContentProcessingRunsBody) {
    throw new Error('Timed out waiting for content-processing run list.');
  }
  assert.equal(listContentProcessingRunsBody.literature_id, literatureId);
  assert.equal(Array.isArray(listContentProcessingRunsBody.items), true);
  assert.equal(listContentProcessingRunsBody.items.length >= 1, true);
  assert.equal(listContentProcessingRunsBody.items[0]?.status, 'SUCCESS');

  const removedPipelineRunsListRes = await app.inject({
    method: 'GET',
    url: '/literature/' + literatureId + '/pipeline/runs?limit=5',
  });
  assert.equal(removedPipelineRunsListRes.statusCode, 404);

  const retrieveRes = await app.inject({
    method: 'POST',
    url: '/literature/retrieve',
    payload: {
      query: 'workflow paper',
      topic_id: 'TOPIC-INT-LIT-1',
      top_k: 5,
      evidence_per_literature: 2,
    },
  });
  assert.equal(retrieveRes.statusCode, 200);
  const retrieveBody = retrieveRes.json();
  assert.equal(Array.isArray(retrieveBody.items), true);
  assert.equal(retrieveBody.items.length >= 1, true);
  assert.equal(Array.isArray(retrieveBody.meta.query_tokens), true);

  const removedWebImportRes = await app.inject({
    method: 'POST',
    url: '/literature/web-import',
    payload: {
      urls: [],
    },
  });
  assert.equal(removedWebImportRes.statusCode, 404);

  const removedSearchRes = await app.inject({
    method: 'POST',
    url: '/literature/search',
    payload: {
      query: 'llm evaluation',
    },
  });
  assert.equal(removedSearchRes.statusCode, 404);

  const invalidZoteroImportRes = await app.inject({
    method: 'POST',
    url: '/literature/collections/zotero-import',
    payload: {
      library_type: 'users',
    },
  });
  assert.equal(invalidZoteroImportRes.statusCode, 400);

  const invalidZoteroPreviewRes = await app.inject({
    method: 'POST',
    url: '/literature/collections/zotero-preview',
    payload: {
      library_type: 'users',
    },
  });
  assert.equal(invalidZoteroPreviewRes.statusCode, 400);

  const removedZoteroImportRes = await app.inject({
    method: 'POST',
    url: '/literature/zotero-import',
    payload: {
      library_type: 'users',
    },
  });
  assert.equal(removedZoteroImportRes.statusCode, 404);

  const removedZoteroPreviewRes = await app.inject({
    method: 'POST',
    url: '/literature/zotero-preview',
    payload: {
      library_type: 'users',
    },
  });
  assert.equal(removedZoteroPreviewRes.statusCode, 404);

  } finally {
    restoreFetch();
    await app.close();
  }
});
