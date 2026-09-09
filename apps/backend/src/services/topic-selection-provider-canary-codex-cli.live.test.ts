// T-151 Phase 3 live check: the codex_cli line running inside the product's own orchestrator path.
//
// The Phase 1 and Phase 2 live checks proved the runner and the tool surface. This proves the part
// neither of them touched: an invocation going through the orchestrator, producing a provenance
// that satisfies the audit schema and a trace artifact that actually lands in the control plane.
//
// It uses the real N6 question-candidate contract but does not route the N6 debate to the line.
// That debate's provider path is dormant because its prompts are pre-calibration skeletons, and
// that reason applies here too, so the canary grants admission to itself and the line stays
// inadmissible everywhere else.

import assert from 'node:assert/strict';
import test, { after } from 'node:test';

import Fastify from 'fastify';

import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { registerTopicSelectionMcpRoutes, TOPIC_SELECTION_MCP_ENDPOINT_PATH } from '../routes/topic-selection-mcp-routes.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { TopicSelectionMcpProtocolService } from './topic-selection-mcp-protocol-service.js';
import {
  TopicSelectionMcpScopeStore,
  TopicSelectionMcpToolSurfaceService,
  createTopicSelectionResearchRoleTools,
} from './topic-selection-mcp-tool-surface-service.js';
import { TopicSelectionProviderCanaryService } from './topic-selection-provider-canary-service.js';
import { createTopicSelectionCodexCliRunnerFromEnv } from './topic-selection-codex-cli-runner-service.js';
import type { TopicSelectionAgentOrchestratorLlmGateway } from './topic-selection-agent-orchestrator-service.js';

const live = createTopicSelectionCodexCliRunnerFromEnv();
// Live checks call a paid model, so presence of the deployment config is not enough to run
// them: the default suite must stay fast, free and deterministic. Opt in explicitly.
const liveOptIn = process.env.TOPIC_SELECTION_CODEX_LIVE === '1';
// On the App Server transport the runner holds a child; release it so the test process can exit.
after(async () => { await live?.runner.shutdown(); });
const skip = live && liveOptIn
  ? false
  : 'set TOPIC_SELECTION_CODEX_LIVE=1 (with TOPIC_SELECTION_CODEX_HOME and TOPIC_SELECTION_CODEX_MODEL) to run this live check';

const EVIDENCE = [
  { id: 'EVIDENCE-001', index_fields: { followup_months: 24 }, body: 'A durable effect at 24-month follow-up.' },
  { id: 'EVIDENCE-002', index_fields: { followup_months: 3 }, body: 'A short-horizon effect at 3-month follow-up.' },
];

/** The codex_cli line never reaches the gateway; a stub keeps the canary from constructing a real
 *  one and makes any accidental provider call fail loudly instead of silently working. */
const unusedGateway: TopicSelectionAgentOrchestratorLlmGateway = {
  createStructuredOutput: async () => {
    throw new Error('the codex_cli canary must not reach the LLM gateway');
  },
};

void test('the codex_cli line runs through the product orchestrator and lands a trace', { skip }, async (t) => {
  const repository = new InMemoryTopicSelectionControlPlaneRepository();
  let sequence = 0;
  const controlPlane = new TopicSelectionControlPlaneService(repository, {
    idFactory: (prefix) => `${prefix}_${++sequence}`,
  });

  const scopes = new TopicSelectionMcpScopeStore();
  const surface = new TopicSelectionMcpToolSurfaceService(createTopicSelectionResearchRoleTools(), scopes);
  const app = Fastify();
  app.get('/health', async () => ({ ok: true }));
  await registerTopicSelectionMcpRoutes(app, new TopicSelectionMcpProtocolService(surface));
  await app.listen({ port: 0, host: '127.0.0.1' });
  t.after(async () => { await app.close(); });
  const address = app.server.address();
  assert.ok(address && typeof address === 'object');

  const canary = new TopicSelectionProviderCanaryService({ controlPlane, llmGateway: unusedGateway });
  const evidence = await canary.runV1bN6CodexCliCanary({
    codexCliRunner: live!.runner,
    codexCliModelId: live!.model_id,
    mcpScopeStore: scopes,
    mcpEndpointUrl: `http://127.0.0.1:${address.port}${TOPIC_SELECTION_MCP_ENDPOINT_PATH}`,
    mcpEvidence: EVIDENCE,
    mcpReadBudget: 2,
  });

  assert.equal(evidence.status, 'succeeded', `canary failed: ${JSON.stringify(evidence)}`);
  assert.equal(evidence.source_kind, 'codex_cli_response');
  // An authoritative runner identity, which is what the whole line was built to carry.
  assert.equal(evidence.provider_id, 'codex');
  assert.equal(evidence.model_id, live!.model_id);
  assert.match(evidence.runner_version ?? '', /\d+\.\d+/);
  assert.ok((evidence.thread_id ?? '').length > 0);
  assert.match(evidence.structured_output_hash ?? '', /^[a-f0-9]{64}$/);

  // The trace is the line's provenance of record, so it has to be in the control plane, not just
  // referenced by it.
  const ref = evidence.trace_artifact_ref;
  assert.ok(ref, 'no trace artifact ref on the provenance');
  const stored = await repository.findArtifactRefById(ref.ref_id);
  assert.ok(stored, 'the trace artifact ref points at nothing');
  const payload = stored.payload as { schema_version: string; usage: { input_tokens: number } | null; events: unknown[] };
  assert.equal(payload.schema_version, 'topic-selection-codex-cli-trace-v1');
  assert.ok(payload.events.length > 0);
  // Cost is recorded, which is what makes a run on this line comparable with the bundle-fed path.
  assert.ok((payload.usage?.input_tokens ?? 0) > 0);
  t.diagnostic(`thread=${evidence.thread_id} usage_in=${String(payload.usage?.input_tokens)} events=${payload.events.length}`);
});
