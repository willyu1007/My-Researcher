import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// T-130 W-08 (L-12): the literature pipeline matrix at docs/context/process/literature-pipeline-matrix.md
// is the SSOT for stage sequence, status vocabulary, and invalidation chains. This wrapper runs the
// consistency script inside the default backend suite so matrix-vs-code drift fails CI, and exercises
// its drift-injection negatives.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const scriptPath = path.join(repoRoot, '.ai', 'scripts', 'literature-pipeline-matrix-consistency.mjs');

test('literature pipeline matrix matches code authority sources', () => {
  const result = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, `script failed:\n${result.stdout}\n${result.stderr}`);
});

test('literature pipeline matrix self-test detects injected drift', () => {
  const result = spawnSync(process.execPath, [scriptPath, '--self-test'], { encoding: 'utf8' });
  assert.equal(result.status, 0, `self-test failed:\n${result.stdout}\n${result.stderr}`);
});
