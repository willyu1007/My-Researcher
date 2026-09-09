import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { CodexQualificationBudget } from './topic-selection-codex-qualification-budget.js';
import type { TopicSelectionCodexCliRunOutcome } from '../topic-selection-codex-cli-runner-service.js';

test('qualification counts failed calls, avoids double-counting cached/reasoning tokens, and enforces persisted limits', t => {
  const dir = mkdtempSync(join(tmpdir(), 'qualification-budget-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  let now = 0;
  const limits = { attempts: 2, tokens: 100, duration_ms: 1000, attempt_ms: 100 };
  const budget = new CodexQualificationBudget(dir, limits, () => now);
  assert.throws(() => new CodexQualificationBudget(dir, limits), /EEXIST/);
  const input = { invocation_attempt_id: 'one', prompt: 'bounded diagnostic', output_schema: {} };
  budget.begin(input);
  assert.throws(() => new CodexQualificationBudget(dir, limits), /EEXIST/);
  assert.throws(() => budget.begin({ ...input, invocation_attempt_id: 'parallel' }), /serially/);
  const outcome: TopicSelectionCodexCliRunOutcome = { status: 'failed', error_code: 'CODEX_CLI_TIMEOUT', message: 'Timeout',
    runner_version: 'test', transport: 'app_server', codex_home: null, thread_id: 'one',
    usage: { input_tokens: 40, output_tokens: 10, cached_input_tokens: 30, reasoning_output_tokens: 8, cache_write_input_tokens: 0 },
    tool_calls: [], trace_events: [], stderr_tail: '' };
  now = 100;
  assert.equal(budget.remainingAttemptMs, 0, 'Setup time is included in the attempt deadline.');
  budget.finish(outcome);
  assert.equal(budget.remainingTokens, 50);
  assert.equal(budget.remainingMs, 900);
  budget.close();
  const resumed = new CodexQualificationBudget(dir, limits, () => now);
  assert.throws(() => resumed.begin(input), /already recorded/);
  resumed.begin({ ...input, invocation_attempt_id: 'two' });
  resumed.finish({ ...outcome, usage: null });
  assert.equal(resumed.remainingTokens, 0, 'Unknown usage reserves the entire remainder rather than zero.');
  assert.throws(() => resumed.begin({ ...input, invocation_attempt_id: 'three' }), /exhausted/);
  resumed.close();
  assert.throws(() => new CodexQualificationBudget(dir, { ...limits, tokens: 101 }), /limits differ/);
  const reopened = new CodexQualificationBudget(dir, limits);
  reopened.close();
});

test('qualification refuses interrupted restarts and releases the inspection lock on rejection', t => {
  const dir = mkdtempSync(join(tmpdir(), 'qualification-interrupted-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const limits = { attempts: 2, tokens: 100, duration_ms: 1000, attempt_ms: 100 };
  const budget = new CodexQualificationBudget(dir, limits);
  budget.begin({ invocation_attempt_id: 'one', prompt: 'diagnostic', output_schema: {} });
  budget.close();
  assert.throws(() => new CodexQualificationBudget(dir, limits), /interrupted/);
  assert.throws(() => new CodexQualificationBudget(dir, limits), /interrupted/);
});

test('qualification stops launching calls at the overall deadline', t => {
  const dir = mkdtempSync(join(tmpdir(), 'qualification-deadline-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  let now = 0;
  const budget = new CodexQualificationBudget(dir, { attempts: 10, tokens: 1000, duration_ms: 100, attempt_ms: 50 }, () => now);
  budget.begin({ invocation_attempt_id: 'one', prompt: 'diagnostic', output_schema: {} });
  now = 100;
  budget.finish({ status: 'succeeded', runner_version: 'test', transport: 'app_server', codex_home: null,
    thread_id: 'one', final_message: '{}', usage: { input_tokens: 1, output_tokens: 1, cached_input_tokens: 0,
      reasoning_output_tokens: 0, cache_write_input_tokens: 0 }, tool_calls: [], trace_events: [] });
  assert.throws(() => budget.begin({ invocation_attempt_id: 'two', prompt: 'diagnostic', output_schema: {} }), /exhausted/);
  budget.close();
});

test('operator can remove aggregate ceilings without erasing unknown usage or prior attempts', t => {
  const dir = mkdtempSync(join(tmpdir(), 'qualification-uncapped-'));
  let now = 0;
  const limits = { attempts: 1, tokens: 100, duration_ms: 100, attempt_ms: 50 };
  const original = new CodexQualificationBudget(dir, limits, () => now);
  original.begin({ invocation_attempt_id: 'failed', prompt: 'diagnostic', output_schema: {} });
  original.finish({ status: 'failed', error_code: 'CODEX_CLI_TIMEOUT', message: 'Timeout',
    runner_version: 'test', transport: 'app_server', codex_home: null, thread_id: 'failed',
    usage: null, tool_calls: [], trace_events: [], stderr_tail: '' });
  original.close();
  now = 200;
  const uncapped = new CodexQualificationBudget(dir, { attempts: null, tokens: null, duration_ms: null, attempt_ms: 100 }, () => now);
  t.after(() => { uncapped.close(); rmSync(dir, { recursive: true, force: true }); });
  assert.equal(uncapped.remainingTokens, Infinity);
  assert.equal(uncapped.remainingMs, Infinity);
  assert.equal(uncapped.snapshot().attempts[0]?.tokens, null);
  assert.equal(uncapped.snapshot().attempts[0]?.charged_tokens, 100);
  assert.deepEqual(uncapped.snapshot().policy_changes?.[0]?.previous_limits, limits);
  uncapped.begin({ invocation_attempt_id: 'next', prompt: 'diagnostic', output_schema: {} });
  assert.equal(uncapped.remainingAttemptMs, 100);
  assert.equal(uncapped.snapshot().attempts.length, 2);
});
