// Full-suite runner for the backend tests (`pnpm test`).
//
// Discovers every src/**/*.test.ts and hands the whole list to a single
// `node --test --loader ts-node/esm` invocation (default node:test
// concurrency: ~cores-1 child processes, each type-checking the backend
// import graph via ts-node — a heavy fleet).
//
// Cross-process suite mutex: two such fleets on one machine exhaust CPU/RAM
// and children crash at load time (~11-13s in, TSError-style
// `[Object: null prototype]` dumps), yielding file-level `not ok` false reds
// and dropped test totals (confirmed 2026-07-03; see dev-docs/active/
// paper-implementation-productization-hardening/04-verification.md). So the
// runner takes an exclusive lockfile in os.tmpdir() before spawning; if
// another run holds it, it prints the holder pid and polls until the lock
// frees, then proceeds.
//
// Staleness: the holder touches the lock's mtime every 15s, so a lock is taken
// over when its holder pid is gone OR its mtime is older than 5 minutes — the
// age cap bounds the wait even when the recorded pid was recycled by an
// unrelated long-lived process (a SIGSTOPped holder is likewise treated as
// dead once it stops heartbeating). Takeover is serialized through an O_EXCL
// claim file so concurrent waiters can never unlink a lock a rival just
// re-created, and release only unlinks the lock if it still holds this run's
// own payload. Set BACKEND_TEST_SUITE_LOCK=0 to skip the lock — only for
// deliberately reproducing the contention failure.

import { fileURLToPath } from 'node:url';
import { readFile, readdir } from 'node:fs/promises';
import { closeSync, openSync, readFileSync, statSync, unlinkSync, utimesSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { spawn } from 'node:child_process';

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
const PROVIDER_SECRET_ENV_KEYS = [
  'OPENAI_API_KEY',
  'DASHSCOPE_API_KEY',
  'DASHSCOPE_API_KEY_CODING',
  'DEEPSEEK_API_KEY',
];

const SUITE_LOCK_FLAG = 'BACKEND_TEST_SUITE_LOCK';
// Machine-scoped (per-user tmpdir), not repo-scoped: the contended resource is
// machine CPU/RAM, so runs from different worktrees/clones must serialize too.
const SUITE_LOCK_PATH = join(tmpdir(), 'paper-engineering-assistant-backend-suite.lock');
const SUITE_LOCK_CLAIM_PATH = `${SUITE_LOCK_PATH}.takeover-claim`;
const SUITE_LOCK_POLL_MS = 2_000;
const SUITE_LOCK_WAIT_LOG_MS = 15_000;
const SUITE_LOCK_TOUCH_MS = 15_000;
const SUITE_LOCK_STALE_MS = 300_000;
const SUITE_LOCK_UNREADABLE_STALE_MS = 60_000;
const SUITE_LOCK_CLAIM_STALE_MS = 60_000;

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

const releaseSuiteLock = await acquireSuiteLock();

// detached: the fleet gets its own process group so a termination signal can
// reach every worker directly — signalling only the coordinator is not enough
// (it dies instantly on SIGTERM, orphaning compute-bound ts-node workers).
const args = ['--test', '--loader', 'ts-node/esm', ...testFiles];
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

// Acquires the cross-process suite lock, waiting (with status output) while
// another run holds it. Returns an idempotent release function; release is
// also wired to the 'exit' event so every exit path (including process.exit
// and uncaught exceptions) frees the lock. Waiting installs no signal
// handlers, so Ctrl-C while queued dies immediately without owning anything.
async function acquireSuiteLock() {
  if (process.env[SUITE_LOCK_FLAG] === '0') {
    return () => {};
  }

  let waitingSinceMs = null;
  let lastWaitLogMs = 0;
  let ownedLockPayload = null;

  for (;;) {
    const takenPayload = tryTakeSuiteLock();
    if (takenPayload !== null) {
      ownedLockPayload = takenPayload;
      break;
    }

    const holder = readSuiteLockHolder();
    if (holder === null) {
      // Lock vanished between the failed take and the read — retry at once.
      continue;
    }
    if (holder.stale) {
      if (!tryTakeoverStaleSuiteLock(holder)) {
        // Another waiter holds the takeover claim — let it finish.
        await sleep(SUITE_LOCK_POLL_MS);
      }
      continue;
    }

    const nowMs = Date.now();
    if (waitingSinceMs === null) {
      waitingSinceMs = nowMs;
      lastWaitLogMs = nowMs;
      const holderDetails = [
        `pid ${holder.pid ?? 'unknown'}`,
        holder.startedAt ? `started ${holder.startedAt}` : null,
        holder.cwd ? `cwd ${holder.cwd}` : null,
      ].filter(Boolean).join(', ');
      console.log(
        `Another backend suite run is in progress (${holderDetails}) — waiting for it to finish before starting this one...`,
      );
      console.log(`  inspect the holder with: ps -p ${holder.pid ?? '<pid>'}`);
      console.log(
        `  lock: ${SUITE_LOCK_PATH} (delete it if this wait is clearly wrong, or set ${SUITE_LOCK_FLAG}=0 to bypass)`,
      );
    } else if (nowMs - lastWaitLogMs >= SUITE_LOCK_WAIT_LOG_MS) {
      lastWaitLogMs = nowMs;
      const waitedSeconds = Math.round((nowMs - waitingSinceMs) / 1000);
      console.log(`Still waiting on the backend suite lock (pid ${holder.pid ?? 'unknown'}, ${waitedSeconds}s elapsed)...`);
    }

    await sleep(SUITE_LOCK_POLL_MS);
  }

  if (waitingSinceMs !== null) {
    const waitedSeconds = Math.round((Date.now() - waitingSinceMs) / 1000);
    console.log(`Backend suite lock acquired after ${waitedSeconds}s — starting this run.`);
  }

  // Heartbeat: keep the lock's mtime fresh so waiters can treat any lock older
  // than SUITE_LOCK_STALE_MS as abandoned regardless of recorded-pid liveness.
  const heartbeatTimer = setInterval(() => {
    try {
      const now = new Date();
      utimesSync(SUITE_LOCK_PATH, now, now);
    } catch {
      // Lock file missing or unreachable — release() handles ownership.
    }
  }, SUITE_LOCK_TOUCH_MS);
  heartbeatTimer.unref();

  let released = false;
  const release = () => {
    if (released) {
      return;
    }
    released = true;
    clearInterval(heartbeatTimer);
    try {
      // Only unlink a lock that still carries this run's payload — after a
      // manual delete + re-acquire by another run, the file is not ours.
      if (readFileSync(SUITE_LOCK_PATH, 'utf8') !== ownedLockPayload) {
        return;
      }
      unlinkSync(SUITE_LOCK_PATH);
    } catch (error) {
      if (!error || typeof error !== 'object' || error.code !== 'ENOENT') {
        // Never throw from an exit path; the next run recovers via staleness.
        console.error(`Warning: failed to remove the backend suite lock ${SUITE_LOCK_PATH}: ${error?.message ?? error}`);
      }
    }
  };
  process.on('exit', release);

  return release;
}

// Returns the exact payload written into the lock on success (used by release
// for the ownership check), or null when the lock is already held.
function tryTakeSuiteLock() {
  let fd;
  try {
    fd = openSync(SUITE_LOCK_PATH, 'wx');
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'EEXIST') {
      return null;
    }
    throw error;
  }

  const payload = `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString(), cwd: process.cwd() })}\n`;
  try {
    writeSync(fd, payload);
  } finally {
    closeSync(fd);
  }
  return payload;
}

// Returns null when the lock no longer exists, otherwise
// { pid, raw, stale } — stale means safe to take over.
function readSuiteLockHolder() {
  let raw;
  try {
    raw = readFileSync(SUITE_LOCK_PATH, 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  let pid = null;
  let startedAt = null;
  let holderCwd = null;
  try {
    const parsed = JSON.parse(raw);
    if (Number.isInteger(parsed?.pid) && parsed.pid > 0) {
      pid = parsed.pid;
    }
    if (typeof parsed?.startedAt === 'string') {
      startedAt = parsed.startedAt;
    }
    if (typeof parsed?.cwd === 'string') {
      holderCwd = parsed.cwd;
    }
  } catch {
    // Unreadable content can be a holder mid-write; only the age check below
    // may declare it stale.
  }

  if (pid !== null) {
    // A live holder heartbeats the mtime, so an over-age lock is abandoned even
    // when its recorded pid is technically alive (pid recycled by an unrelated
    // process, or a holder stopped/hung past the cap).
    return {
      pid,
      raw,
      startedAt,
      cwd: holderCwd,
      stale: !isPidAlive(pid) || isSuiteLockOlderThan(SUITE_LOCK_STALE_MS),
    };
  }
  return { pid: null, raw, startedAt: null, cwd: null, stale: isSuiteLockOlderThan(SUITE_LOCK_UNREADABLE_STALE_MS) };
}

// Serialized stale-lock takeover. Whoever creates the claim file (O_EXCL) is
// the only process allowed to unlink the stale lock, so concurrent waiters can
// never unlink a lock that a rival already replaced — plain read-compare-unlink
// is a cross-process TOCTOU. Returns false when a rival holds the claim.
function tryTakeoverStaleSuiteLock(holder) {
  clearAbandonedSuiteLockClaim();

  let claimFd;
  try {
    claimFd = openSync(SUITE_LOCK_CLAIM_PATH, 'wx');
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'EEXIST') {
      return false;
    }
    throw error;
  }
  closeSync(claimFd);

  try {
    // Under the claim, re-check the lock is still the stale content we judged;
    // a fresh holder's payload (different pid/startedAt) never matches.
    if (readFileSync(SUITE_LOCK_PATH, 'utf8') === holder.raw) {
      unlinkSync(SUITE_LOCK_PATH);
      console.log(`Removed a stale backend suite lock (holder pid ${holder.pid ?? 'unknown'} is gone): ${SUITE_LOCK_PATH}`);
    }
  } catch (error) {
    if (!error || typeof error !== 'object' || error.code !== 'ENOENT') {
      removeSuiteLockClaim();
      throw error;
    }
  }
  removeSuiteLockClaim();
  return true;
}

// A claim lives for milliseconds; one older than SUITE_LOCK_CLAIM_STALE_MS
// means its creator died mid-takeover — remove it so takeover can proceed.
function clearAbandonedSuiteLockClaim() {
  let claimAgeMs;
  try {
    claimAgeMs = Date.now() - statSync(SUITE_LOCK_CLAIM_PATH).mtimeMs;
  } catch {
    return;
  }
  if (claimAgeMs > SUITE_LOCK_CLAIM_STALE_MS) {
    removeSuiteLockClaim();
  }
}

function removeSuiteLockClaim() {
  try {
    unlinkSync(SUITE_LOCK_CLAIM_PATH);
  } catch (error) {
    if (!error || typeof error !== 'object' || error.code !== 'ENOENT') {
      throw error;
    }
  }
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM means the pid exists but belongs to another user — still alive.
    return !(error && typeof error === 'object' && error.code === 'ESRCH');
  }
}

function isSuiteLockOlderThan(ageMs) {
  try {
    return Date.now() - statSync(SUITE_LOCK_PATH).mtimeMs > ageMs;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

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
  for (const key of PROVIDER_SECRET_ENV_KEYS) {
    delete env[key];
  }

  env.AUTO_PULL_SCHEDULER_ENABLED = 'false';
  env.NODE_ENV = env.NODE_ENV || 'test';

  return env;
}
