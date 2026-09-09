import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { executeClaimedCodexAttempt } from './topic-selection-codex-attempt-service.js';
import type { TopicSelectionCodexCliRunOutcome } from './topic-selection-codex-cli-runner-service.js';

const identity = {
  workspace_id: null, title_card_id: null, workflow_run_id: 'workflow', node_id: 'n6',
  invocation_attempt_id: 'critic-1', request_hash: 'frozen-request',
};
const outcome: TopicSelectionCodexCliRunOutcome = {
  status: 'succeeded', final_message: '{"finding":"source does not support the claim"}',
  runner_version: 'test-cli', transport: 'app_server', codex_home: null, thread_id: 'thread-1',
  usage: null, tool_calls: [], trace_events: [],
};

test('concurrent attempt callers launch only once and replay the persisted outcome', async () => {
  const repository = new InMemoryTopicSelectionControlPlaneRepository();
  const controlPlane = new TopicSelectionControlPlaneService(repository);
  let finish!: (value: TopicSelectionCodexCliRunOutcome) => void;
  let started!: () => void;
  const entered = new Promise<void>(resolve => { started = resolve; });
  const pending = new Promise<TopicSelectionCodexCliRunOutcome>(resolve => { finish = resolve; });
  let calls = 0;
  const execute = () => { calls += 1; started(); return pending; };
  const first = executeClaimedCodexAttempt(controlPlane, identity, execute);
  await entered;
  await assert.rejects(executeClaimedCodexAttempt(
    new TopicSelectionControlPlaneService(repository), identity, execute,
  ), /in progress|claimed/i);
  assert.equal(calls, 1);
  finish(outcome);
  assert.deepEqual(await first, outcome);
  assert.deepEqual(await executeClaimedCodexAttempt(controlPlane, identity, execute), outcome);
  assert.equal(calls, 1);
});

test('an interrupted external call requires a new attempt, including after reconstruction', async () => {
  const repository = new InMemoryTopicSelectionControlPlaneRepository();
  const controlPlane = new TopicSelectionControlPlaneService(repository);
  await assert.rejects(executeClaimedCodexAttempt(controlPlane, identity, async () => {
    throw new Error('connection lost before recording outcome');
  }), /connection lost/);
  let calls = 0;
  const execute = async () => { calls += 1; return outcome; };
  await assert.rejects(executeClaimedCodexAttempt(
    new TopicSelectionControlPlaneService(repository), identity, execute,
  ), /interrupted/);
  assert.equal(calls, 0);
  assert.deepEqual(await executeClaimedCodexAttempt(controlPlane, {
    ...identity, invocation_attempt_id: 'critic-explicit-retry-2',
  }, execute), outcome);
  assert.equal(calls, 1);
});
