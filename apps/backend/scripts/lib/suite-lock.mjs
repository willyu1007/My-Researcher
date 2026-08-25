// Machine-wide mutex for heavy multi-file `node --test` fleets.
//
// Two such fleets on one machine exhaust CPU/RAM and children crash at load
// time (~11-13s in, TSError-style `[Object: null prototype]` dumps), yielding
// file-level `not ok` false reds and dropped test totals. This was confirmed
// by the T-124 concurrency investigation on 2026-07-03. Every entrypoint that
// spawns a multi-file fleet must take this lock before spawning: the backend full-suite runner
// (run-node-tests.mjs) and backend validation runners such as
// paper-implementation-runtime-stress.mjs. One shared module = one lock path — two copies of
// the constant could drift and silently stop excluding each other.
//
// Lock lifecycle:
// - Acquire: O_EXCL create of a pid/startedAt/cwd JSON file in os.tmpdir()
//   (machine-scoped per user, not repo-scoped: the contended resource is
//   machine CPU/RAM, so runs from different worktrees/clones serialize too).
// - Staleness: the holder touches the lock's mtime every 15s; a lock is stale
//   when its holder pid is gone OR its mtime is older than 5 minutes. The age
//   cap bounds the wait even when the recorded pid was recycled by an
//   unrelated long-lived process (a SIGSTOPped holder is likewise treated as
//   dead once it stops heartbeating).
// - Takeover: serialized through an O_EXCL claim file so concurrent waiters
//   can never unlink a lock a rival just re-created (plain read-compare-
//   unlink — and rename-based takeover alike — is a cross-process TOCTOU).
// - Release: only unlinks the lock if it still holds this process's own
//   payload, and is also wired to the 'exit' event. Death by signal without a
//   handler skips 'exit'; the next run recovers via staleness.
//
// Set BACKEND_TEST_SUITE_LOCK=0 to skip the lock — only for deliberately
// reproducing the contention failure.

import { closeSync, openSync, readFileSync, statSync, unlinkSync, utimesSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SUITE_LOCK_FLAG = 'BACKEND_TEST_SUITE_LOCK';
const SUITE_LOCK_PATH = join(tmpdir(), 'paper-engineering-assistant-backend-suite.lock');
const SUITE_LOCK_CLAIM_PATH = `${SUITE_LOCK_PATH}.takeover-claim`;
const SUITE_LOCK_POLL_MS = 2_000;
const SUITE_LOCK_WAIT_LOG_MS = 15_000;
const SUITE_LOCK_TOUCH_MS = 15_000;
const SUITE_LOCK_STALE_MS = 300_000;
const SUITE_LOCK_UNREADABLE_STALE_MS = 60_000;
const SUITE_LOCK_CLAIM_STALE_MS = 60_000;

// Acquires the cross-process suite lock, waiting (with status output) while
// another run holds it. Returns an idempotent release function; release is
// also wired to the 'exit' event so every exit path (including process.exit
// and uncaught exceptions) frees the lock. Waiting installs no signal
// handlers, so Ctrl-C while queued dies immediately without owning anything.
export async function acquireSuiteLock() {
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
// { pid, raw, startedAt, cwd, stale } — stale means safe to take over.
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
