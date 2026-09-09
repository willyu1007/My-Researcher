import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { qualificationRunner, QualificationPreviewComplete } from './topic-selection-codex-qualification-runner.js';

test('qualification preview preserves live evidence and never needs a working CLI', async t => {
  const root = mkdtempSync(join(tmpdir(), 'qualification-preview-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const names = ['budget.json', 'staging_ordinary-manifest.json', 'staging_ordinary-results.json'];
  for (const name of names) writeFileSync(join(root, name), 'retained live evidence');
  const { runner, directory, budget } = qualificationRunner({ codex_home: root, model: 'diagnostic',
    reasoning_effort: 'high', transport: 'app_server', binary: '/nonexistent/qualification-preview-codex' }, root, null);
  t.after(() => runner.shutdown());
  assert.equal(budget, null);
  assert.notEqual(directory, root);
  const input = { invocation_attempt_id: 'preview', prompt: 'bounded diagnostic', output_schema: {} };
  await assert.rejects(runner.run(input), QualificationPreviewComplete);
  writeFileSync(join(directory, 'staging_ordinary-results.json'), 'preview results');
  assert.deepEqual(JSON.parse(readFileSync(join(directory, 'preview-input.json'), 'utf8')), input);
  for (const name of names) assert.equal(readFileSync(join(root, name), 'utf8'), 'retained live evidence');
});

test('qualification refuses an unmetered transport before creating output', () => {
  assert.throws(() => qualificationRunner({ codex_home: '/unused', model: 'diagnostic',
    reasoning_effort: 'high', transport: 'exec' }, '/unused', null), /requires App Server/);
});
