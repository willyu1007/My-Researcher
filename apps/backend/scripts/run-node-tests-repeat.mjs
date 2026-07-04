// Diagnostic repeat-runner for the backend test suite.
//
// Why: the suite is overwhelmingly deterministic, but a rare, load-sensitive
// transient failure has been observed in full parallel runs (a single `not ok`
// that does not reproduce on an isolated rerun). This wrapper runs the REAL
// suite runner (run-node-tests.mjs) many times until it catches such a failure,
// then stops and prints a triage report: which iteration failed, the failing
// leaf subtest(s), and their TAP diagnostic block (error/expected/actual/stack).
//
// It deliberately shells out to scripts/run-node-tests.mjs rather than
// re-implementing test discovery or env handling, so each iteration is byte-for-
// byte the same run as `pnpm --filter @paper-engineering-assistant/backend test`.
// The only difference is that this wrapper PIPES (instead of inherits) the
// child's stdout/stderr so it can capture and parse the TAP output.
//
// Concurrency: each iteration inherits run-node-tests.mjs's cross-process
// suite lock (see its header), so a suite run from another session serializes
// against this hunt instead of corrupting it with resource-contention false
// reds. That other session may fairly grab the lock between two iterations;
// an iteration that had to wait just shows a longer elapsed time.
//
// Usage:
//   node scripts/run-node-tests-repeat.mjs [iterations]
//   TEST_REPEAT_N=50 node scripts/run-node-tests-repeat.mjs
//   pnpm --filter @paper-engineering-assistant/backend test:repeat 30
//
// Iterations resolve from (in priority order): the first CLI argument, the
// TEST_REPEAT_N env var, else a default of 10. Rare flakes (<=~5%) need more
// runs to surface — 30-50 is a reasonable hunt. Stops on the FIRST failure.
// Exit code: 0 if all runs were clean, 1 if a failure was caught (or a run
// crashed), so it composes in CI / `&&` chains.
//
// Advanced: set TEST_REPEAT_RUNNER to wrap a different runner than the default
// scripts/run-node-tests.mjs (any process whose stdout is node:test TAP and
// that exits nonzero on failure).

import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ITERATIONS = 10;
const MAX_DIAGNOSTIC_LINES = 200;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, '..');
const runnerPath = process.env.TEST_REPEAT_RUNNER
  ? resolve(process.env.TEST_REPEAT_RUNNER)
  : join(scriptDir, 'run-node-tests.mjs');

const iterations = resolveIterations();
const artifactDir = await mkdtemp(join(tmpdir(), 'backend-test-repeat-'));

let stopRequested = false;
process.on('SIGINT', () => {
  stopRequested = true;
  console.log('\nInterrupted — finishing the current run, then stopping.');
});

console.log(`Repeating the backend test suite up to ${iterations}x to capture a flaky failure.`);
console.log(`Runner: ${runnerPath}`);
console.log(`Failing TAP (if any) will be saved under: ${artifactDir}\n`);

let caught = null;
let completed = 0;

for (let attempt = 1; attempt <= iterations; attempt += 1) {
  const startedAt = process.hrtime.bigint();
  const { code, signal, output } = await runOnce();
  const elapsedSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
  completed = attempt;

  if ((signal === 'SIGINT' || signal === 'SIGTERM') && stopRequested) {
    console.log(`[${attempt}/${iterations}] aborted (${signal}) — ${attempt - 1} clean run(s) before stopping.`);
    process.exit(130);
  }

  const totals = parseTotals(output);
  const failed = isFailure(output, code);
  const label = failed ? 'FAIL' : 'ok  ';
  console.log(
    `[${attempt}/${iterations}] ${label} pass=${totals.pass} fail=${totals.fail} `
      + `skipped=${totals.skipped} (${elapsedSeconds.toFixed(1)}s, exit=${code ?? `signal:${signal}`})`,
  );

  if (failed) {
    const tapPath = join(artifactDir, `repeat-fail-attempt-${attempt}.tap`);
    await writeFile(tapPath, output, 'utf8');
    caught = { attempt, output, tapPath };
    break;
  }

  if (stopRequested) {
    break;
  }
}

if (!caught) {
  console.log(`\n${completed}/${iterations} run(s) clean — no failure reproduced.`);
  process.exit(0);
}

console.log(`\n=== Reproduced a failure on iteration ${caught.attempt} ===`);
console.log(`Full TAP saved to: ${caught.tapPath}\n`);

const blocks = extractFailureBlocks(caught.output);
if (blocks.length === 0) {
  console.log('(No `not ok` lines parsed — inspect the saved TAP directly.)');
} else {
  for (const block of blocks) {
    console.log(block);
    console.log('');
  }
}
process.exit(1);

function resolveIterations() {
  const fromArg = Number.parseInt(process.argv[2] ?? '', 10);
  if (Number.isInteger(fromArg) && fromArg > 0) {
    return fromArg;
  }
  const fromEnv = Number.parseInt(process.env.TEST_REPEAT_N ?? '', 10);
  if (Number.isInteger(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }
  return DEFAULT_ITERATIONS;
}

function runOnce() {
  return new Promise((resolveRun) => {
    const chunks = [];
    const child = spawn(process.execPath, [runnerPath], {
      cwd: backendRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stderr.on('data', (chunk) => chunks.push(chunk));
    child.on('error', (error) => {
      resolveRun({ code: 1, signal: null, output: `Failed to spawn runner: ${error?.stack ?? error}\n` });
    });
    child.on('exit', (code, signal) => {
      resolveRun({ code, signal, output: Buffer.concat(chunks).toString('utf8') });
    });
  });
}

function parseTotals(output) {
  return {
    pass: matchGroup(output, /^# pass (\d+)/m),
    fail: matchGroup(output, /^# fail (\d+)/m),
    skipped: matchGroup(output, /^# skipped (\d+)/m),
  };
}

function matchGroup(output, regex) {
  const match = output.match(regex);
  return match ? match[1] : '?';
}

function isFailure(output, code) {
  // Primary signal: any TAP `not ok` line (a failing test/subtest).
  if (/^\s*not ok \d+ /m.test(output)) {
    return true;
  }
  // Secondary signal: the run summary reports failures.
  const failTotal = output.match(/^# fail (\d+)/m);
  if (failTotal && Number(failTotal[1]) > 0) {
    return true;
  }
  // Fallback: a nonzero/crashed exit with no clean `# fail 0` summary
  // (e.g. the suite process crashed before printing its summary).
  if (code && code !== 0 && !/^# fail 0\b/m.test(output)) {
    return true;
  }
  return false;
}

// Extract each failing `not ok` line together with its indented TAP diagnostic
// block (`  ---` ... `  ...`). Leaf failures carry the real error
// (failureType: 'testCodeFailure'); aggregating parents are 'subtestsFailed'.
function extractFailureBlocks(output) {
  const lines = output.split('\n');
  const blocks = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const notOk = line.match(/^(\s*)not ok \d+ /);
    if (!notOk) {
      continue;
    }
    const indent = notOk[1];
    const block = [line];
    let cursor = index + 1;
    const opensYaml = lines[cursor]?.match(/^(\s*)---\s*$/);
    if (opensYaml) {
      block.push(lines[cursor]);
      cursor += 1;
      const closer = new RegExp(`^${indent}\\s*\\.\\.\\.\\s*$`);
      while (cursor < lines.length && !closer.test(lines[cursor])) {
        block.push(lines[cursor]);
        cursor += 1;
        if (block.length >= MAX_DIAGNOSTIC_LINES) {
          block.push('  # …diagnostic truncated; see saved TAP for the full block.');
          break;
        }
      }
      if (cursor < lines.length) {
        block.push(lines[cursor]);
      }
    }
    blocks.push(block.join('\n'));
  }
  const failSummary = output.match(/^# fail \d+.*$/m);
  if (failSummary) {
    blocks.push(failSummary[0]);
  }
  return blocks;
}
