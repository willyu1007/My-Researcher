import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// T-123 Phase 0 (DP-0.8): the workflow matrix at docs/context/process/topic-selection-workflow-matrix.md
// is the SSOT for node classification. This wrapper runs the consistency script inside the default
// backend suite so matrix-vs-contracts drift fails CI, and exercises its drift-injection negatives.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const scriptPath = path.join(repoRoot, 'apps', 'backend', 'scripts', 'topic-selection-workflow-matrix-consistency.mjs');

test('topic-selection workflow matrix matches code authority sources', () => {
  const result = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, `script failed:\n${result.stdout}\n${result.stderr}`);
});

test('topic-selection workflow matrix self-test detects injected drift', () => {
  const result = spawnSync(process.execPath, [scriptPath, '--self-test'], { encoding: 'utf8' });
  assert.equal(result.status, 0, `self-test failed:\n${result.stdout}\n${result.stderr}`);
});
