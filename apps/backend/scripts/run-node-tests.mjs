// Full-suite runner for the backend tests (`pnpm test`).
//
// Discovers every src/**/*.test.ts and hands the whole list to a single
// `node --test --import tsx` invocation (default node:test concurrency:
// ~cores-1 child processes, each loading the backend import graph).
//
// Cross-process suite mutex: two such fleets on one machine exhaust CPU/RAM
// and children crash at load time, yielding file-level `not ok` false reds
// (confirmed 2026-07-03). The runner takes the machine-wide suite lock before
// spawning; mechanics (staleness, heartbeat, serialized takeover, ownership
// release, BACKEND_TEST_SUITE_LOCK=0 escape hatch) live in ./lib/suite-lock.mjs,
// shared with backend validation runners.
// Set BACKEND_TEST_CONCURRENCY to a positive integer for a bounded node:test
// fleet; leaving it unset preserves Node's default concurrency.

import { fileURLToPath } from 'node:url';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { acquireSuiteLock } from './lib/suite-lock.mjs';

const rootDirUrl = new URL('../', import.meta.url);
const srcDirUrl = new URL('../src/', import.meta.url);
const rootDir = fileURLToPath(rootDirUrl);
const srcDir = fileURLToPath(srcDirUrl);
const repoRoot = resolve(rootDir, '../..');

const PRESERVE_REAL_ENV_FLAG = 'BACKEND_TEST_PRESERVE_REAL_ENV';
const REPOSITORY_STRATEGY_ENV_KEYS = [
  'TITLE_CARD_REPOSITORY',
  'RESEARCH_LIFECYCLE_REPOSITORY',
  'AUTO_PULL_REPOSITORY',
  'APPLICATION_SETTINGS_REPOSITORY',
  'EXPERIMENT_FOUNDATION_REPOSITORY',
];
const EXPERIMENT_V2_PRODUCT_ENV_KEYS = [
  'PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED',
  'PAPER_IMPLEMENTATION_EXPERIMENT_V2_EXPLORATION_ATTACHMENT_ENABLED',
  'PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED',
  'PAPER_IMPLEMENTATION_SEMANTIC_RETRIEVAL_V2_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_PROMOTION_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_EXPLORATION_SPEC_ENABLED',
];
const PROVIDER_SECRET_ENV_KEYS = [
  'OPENAI_API_KEY',
  'DASHSCOPE_API_KEY',
  'DASHSCOPE_API_KEY_CODING',
  'DEEPSEEK_API_KEY',
];

await loadLocalEnvFiles([
  join(repoRoot, '.env.local'),
  join(repoRoot, '.env'),
  join(rootDir, '.env.local'),
  join(rootDir, '.env'),
]);

const testFiles = await collectTestFiles(srcDir);
if (testFiles.length === 0) {
  console.error('No backend test files were found under src/.');
  process.exit(1);
}

const testConcurrency = resolveTestConcurrency(process.env.BACKEND_TEST_CONCURRENCY);
const releaseSuiteLock = await acquireSuiteLock();

// detached: the fleet gets its own process group so a termination signal can
// reach every worker directly — signalling only the coordinator is not enough
// (it dies instantly on SIGTERM, orphaning compute-bound test workers).
const args = [
  '--test',
  ...(testConcurrency === null ? [] : [`--test-concurrency=${testConcurrency}`]),
  '--import',
  'tsx',
  ...testFiles,
];
const child = spawn(process.execPath, args, {
  cwd: rootDir,
  stdio: 'inherit',
  env: buildTestEnv(),
  detached: true,
});

// On a targeted kill of this runner (or a TTY Ctrl-C, which no longer reaches
// the detached fleet group by itself), signal the whole fleet group and keep
// running until the coordinator exits — only the child 'exit' handler below
// releases the lock and re-raises, so a freed lock means no fleet is still
// running. A second signal kills this runner via the default handler and the
// lock left behind is recovered by the staleness rules.
for (const terminationSignal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.once(terminationSignal, () => {
    signalFleet(terminationSignal);
  });
}

function signalFleet(signal) {
  try {
    process.kill(-child.pid, signal);
  } catch {
    // Group already gone (or unavailable) — fall back to the coordinator pid.
    try {
      child.kill(signal);
    } catch {
      // Fleet fully exited already; the 'exit' handler takes it from here.
    }
  }
}

child.on('exit', (code, signal) => {
  if (signal) {
    releaseSuiteLock();
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

async function collectTestFiles(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        return collectTestFiles(entryPath);
      }
      if (!entry.name.endsWith('.test.ts')) {
        return [];
      }
      return [relative(rootDir, entryPath).replaceAll('\\', '/')];
    }),
  );

  return nested.flat().sort((left, right) => left.localeCompare(right));
}

async function loadLocalEnvFiles(filePaths) {
  for (const filePath of filePaths) {
    let content;
    try {
      content = await readFile(filePath, 'utf8');
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    for (const line of content.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed || process.env[parsed.key] !== undefined) {
        continue;
      }
      process.env[parsed.key] = parsed.value;
    }
  }
}

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const declaration = trimmed.startsWith('export ') ? trimmed.slice('export '.length).trim() : trimmed;
  const separatorIndex = declaration.indexOf('=');
  if (separatorIndex <= 0) {
    return null;
  }

  const key = declaration.slice(0, separatorIndex).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }

  return {
    key,
    value: parseEnvValue(declaration.slice(separatorIndex + 1).trim()),
  };
}

function parseEnvValue(value) {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value
      .slice(1, -1)
      .replaceAll('\\n', '\n')
      .replaceAll('\\"', '"')
      .replaceAll('\\\\', '\\');
  }

  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  return value;
}

function buildTestEnv() {
  const env = { ...process.env };

  if (env[PRESERVE_REAL_ENV_FLAG] === '1') {
    return env;
  }

  for (const key of REPOSITORY_STRATEGY_ENV_KEYS) {
    delete env[key];
  }
  for (const key of EXPERIMENT_V2_PRODUCT_ENV_KEYS) {
    delete env[key];
  }
  for (const key of PROVIDER_SECRET_ENV_KEYS) {
    delete env[key];
  }

  env.AUTO_PULL_SCHEDULER_ENABLED = 'false';
  env.NODE_ENV = env.NODE_ENV || 'test';

  return env;
}

function resolveTestConcurrency(value) {
  if (value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(parsed)) {
    throw new Error('BACKEND_TEST_CONCURRENCY must be a positive integer');
  }
  return parsed;
}
