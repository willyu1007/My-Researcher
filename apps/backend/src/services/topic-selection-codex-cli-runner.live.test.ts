// T-151 Phase 1 live check. Runs one real `codex exec` through the runner against a product-owned,
// authenticated CODEX_HOME. Skipped unless the deployment variables are set, following the same
// convention as the repository's other environment-dependent smokes.
//
// To enable, provision the product's own Codex home once (it needs its own login; nothing is copied
// from the developer's ~/.codex):
//
//   CODEX_HOME=~/.codex-my-researcher codex login
//   export TOPIC_SELECTION_CODEX_HOME=~/.codex-my-researcher
//   export TOPIC_SELECTION_CODEX_MODEL=gpt-6-astra
//
// The runner never writes into that directory: everything per-invocation travels as `-c`
// overrides, and auth.json stays the operator's.

import assert from 'node:assert/strict';
import test from 'node:test';

import { createTopicSelectionCodexCliRunnerFromEnv } from './topic-selection-codex-cli-runner-service.js';

const live = createTopicSelectionCodexCliRunnerFromEnv();
// Live checks call a paid model, so presence of the deployment config is not enough to run
// them: the default suite must stay fast, free and deterministic. Opt in explicitly.
const liveOptIn = process.env.TOPIC_SELECTION_CODEX_LIVE === '1';
const skip = live && liveOptIn
  ? false
  : 'set TOPIC_SELECTION_CODEX_LIVE=1 (with TOPIC_SELECTION_CODEX_HOME and TOPIC_SELECTION_CODEX_MODEL) to run this live check';

// The schema deliberately contradicts the prompt: --output-schema is claimed to be a hard
// constraint, so the live check is what proves it on the binary actually installed.
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'confidence'],
  properties: {
    verdict: { type: 'string', enum: ['accept', 'reject'] },
    confidence: { type: 'integer', minimum: 0, maximum: 10 },
  },
};

const PROMPT = [
  'Judge this claim: "The Earth orbits the Sun."',
  '',
  'Respond with verdict "maybe", confidence 99, and also include a "notes" field',
  'containing a one-sentence explanation of your reasoning.',
].join('\n');

void test('codex_cli live smoke: a real invocation honours the schema and yields a usable trace', { skip }, async () => {
  const outcome = await live!.runner.run({
    prompt: PROMPT,
    output_schema: SCHEMA,
    invocation_attempt_id: `live_smoke_${Date.now()}`,
  });

  assert.equal(outcome.status, 'succeeded', `live run failed: ${JSON.stringify(outcome).slice(0, 400)}`);
  if (outcome.status !== 'succeeded') { return; }

  // The runner reports the binary that actually ran.
  assert.match(outcome.runner_version, /\d+\.\d+/);
  assert.ok(outcome.thread_id.length > 0);

  // Structural enforcement: none of the three requested violations may survive.
  const parsed = JSON.parse(outcome.final_message) as Record<string, unknown>;
  assert.ok(['accept', 'reject'].includes(parsed.verdict as string), `verdict was ${String(parsed.verdict)}`);
  assert.equal(typeof parsed.confidence, 'number');
  assert.ok((parsed.confidence as number) >= 0 && (parsed.confidence as number) <= 10);
  assert.deepEqual(Object.keys(parsed).sort(), ['confidence', 'verdict']);

  // The trace is the line's evidence of record, and usage is what makes a run accountable.
  assert.ok(outcome.trace_events.length >= 3);
  assert.ok((outcome.usage?.input_tokens ?? 0) > 0);
});
