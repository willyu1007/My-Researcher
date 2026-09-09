import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { PrismaTopicSelectionControlPlaneRepository } from '../repositories/prisma/prisma-topic-selection-control-plane-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { executeClaimedCodexAttempt } from './topic-selection-codex-attempt-service.js';
import type { TopicSelectionCodexCliRunOutcome } from './topic-selection-codex-cli-runner-service.js';

const enabled = process.env.TOPIC_SELECTION_CODEX_ATTEMPT_PRISMA === '1' && Boolean(process.env.DATABASE_URL);

test('relational stable-key claims exclude concurrent Codex execution and survive service reconstruction', { skip: !enabled }, async () => {
  const prisma = new PrismaClient();
  const workflowId = `test_codex_attempt_${randomUUID()}`;
  const identity = {
    workspace_id: null, title_card_id: null, workflow_run_id: workflowId, node_id: 'n6',
    invocation_attempt_id: 'explorer-1', request_hash: 'frozen-input',
  };
  const outcome: TopicSelectionCodexCliRunOutcome = {
    status: 'succeeded', final_message: '{"finding":"insufficient evidence"}', runner_version: 'test-cli',
    transport: 'app_server', codex_home: null, thread_id: 'test-thread', usage: null, tool_calls: [], trace_events: [],
  };
  const consumer = () => new TopicSelectionControlPlaneService(new PrismaTopicSelectionControlPlaneRepository(prisma));
  let calls = 0;
  try {
    const results = await Promise.allSettled(Array.from({ length: 4 }, () => executeClaimedCodexAttempt(
      consumer(), identity, async () => { calls += 1; return outcome; },
    )));
    assert.equal(calls, 1);
    assert.ok(results.some(result => result.status === 'fulfilled'));
    for (const result of results) {
      if (result.status === 'fulfilled') assert.deepEqual(result.value, outcome);
      else assert.match(String(result.reason), /claimed|in progress/);
    }
    assert.deepEqual(await executeClaimedCodexAttempt(consumer(), identity, async () => {
      calls += 1; return outcome;
    }), outcome);
    assert.equal(calls, 1);
    await assert.rejects(executeClaimedCodexAttempt(consumer(), {
      ...identity, invocation_attempt_id: 'interrupted',
    }, async () => { throw new Error('lost outcome'); }), /lost outcome/);
    await assert.rejects(executeClaimedCodexAttempt(consumer(), {
      ...identity, invocation_attempt_id: 'interrupted',
    }, async () => { calls += 1; return outcome; }), /interrupted/);
    assert.equal(calls, 1);
  } finally {
    await prisma.topicSelectionArtifactRef.deleteMany({ where: { workflowRunId: workflowId } });
    await prisma.$disconnect();
  }
});
