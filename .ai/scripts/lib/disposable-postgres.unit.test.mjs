import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  markDisposableDatabase,
  resetDisposablePostgresPublicSchema,
  runCommand,
  safeCommandTail,
  startDisposablePostgres,
  stopDisposablePostgres,
  verifyDisposableDatabaseMarker,
} from './disposable-postgres.mjs';

const POSTGRES_IMAGE = `pgvector/pgvector@sha256:${'a'.repeat(64)}`;

function commandResult(overrides = {}) {
  return {
    exit_code: 0,
    signal: null,
    duration_ms: 1,
    stdout: '',
    stderr: '',
    ...overrides,
  };
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') return false;
    throw error;
  }
}

async function waitForProcessExit(pid, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return !isProcessAlive(pid);
}

test('shared command runner preserves output shape and caller timeout wording', async () => {
  const success = await runCommand([
    process.execPath,
    '-e',
    'process.stdout.write(process.env.DATABASE_URL ?? "missing")',
  ], {
    env: { DATABASE_URL: 'disposable-database' },
    timeoutMs: 5_000,
  });
  assert.equal(success.exit_code, 0);
  assert.equal(success.signal, null);
  assert.equal(success.stdout, 'disposable-database');
  assert.equal(success.stderr, '');
  assert.equal(Number.isInteger(success.duration_ms), true);

  const timedOut = await runCommand([
    process.execPath,
    '-e',
    'setInterval(() => {}, 1_000)',
  ], {
    timeoutMs: 20,
    destroyOutputOnTimeout: true,
    timeoutMessage: (timeoutMs) => `Process timed out after ${timeoutMs}ms.`,
  });
  assert.equal(timedOut.exit_code, null);
  assert.equal(timedOut.signal, 'SIGKILL');
  assert.match(timedOut.stderr, /Process timed out after 20ms\./);
});

test('shared command runner kills the POSIX process group on timeout', {
  skip: process.platform === 'win32',
}, async () => {
  let grandchildPid = null;
  try {
    const timedOut = await runCommand([
      process.execPath,
      '-e',
      [
        "const { spawn } = require('node:child_process');",
        "const grandchild = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });",
        "process.stdout.write(`${grandchild.pid}\\n`);",
        'setInterval(() => {}, 1000);',
      ].join('\n'),
    ], {
      timeoutMs: 1_000,
      destroyOutputOnTimeout: true,
      timeoutMessage: (timeoutMs) => `Process timed out after ${timeoutMs}ms.`,
    });

    const pidText = timedOut.stdout.trim();
    assert.match(pidText, /^\d+$/);
    grandchildPid = Number.parseInt(pidText, 10);
    assert.equal(timedOut.exit_code, null);
    assert.equal(timedOut.signal, 'SIGKILL');
    assert.match(timedOut.stderr, /Process timed out after 1000ms\./);
    assert.equal(
      await waitForProcessExit(grandchildPid),
      true,
      `grandchild process ${grandchildPid} survived the command timeout`,
    );
  } finally {
    if (Number.isInteger(grandchildPid) && isProcessAlive(grandchildPid)) {
      try {
        process.kill(grandchildPid, 'SIGKILL');
      } catch (error) {
        if (error?.code !== 'ESRCH') throw error;
      }
    }
  }
});

test('shared safe tail redacts database URLs and password assignments before truncation', () => {
  const value = [
    'prefix',
    'postgresql://postgres:secret@127.0.0.1:5432/db?schema=public',
    'password=secret-value',
    'suffix',
  ].join(' ');
  const redacted = safeCommandTail(value, 200);
  assert.equal(redacted.includes('secret'), false);
  assert.match(redacted, /\[redacted-database-url\]/);
  assert.match(redacted, /password=\[redacted\]/);
  assert.equal(safeCommandTail('0123456789', 4), '6789');
});

test('shared disposable PostgreSQL startup parameterizes names without changing Docker shape', async () => {
  const calls = [];
  const portWaits = [];
  const postgresWaits = [];
  const fakeRun = async (argv, options) => {
    calls.push({ argv, options });
    if (argv[1] === 'version') return commandResult({ stdout: '27.0.0\n' });
    if (argv[1] === 'run') return commandResult({ stdout: 'container-id\n' });
    if (argv[1] === 'port') return commandResult({ stdout: '127.0.0.1:55432\n' });
    throw new Error(`Unexpected command: ${argv.join(' ')}`);
  };
  const randomBytes = (size) => Buffer.alloc(size, size);
  const disposable = await startDisposablePostgres({
    runId: 'Run-One',
    postgresImage: POSTGRES_IMAGE,
    runCommand: fakeRun,
    safeTail: (value) => safeCommandTail(value, 4_000),
    databasePrefixes: ['d19', 'packb'],
    containerNamePrefix: 'pea-test',
    portResolutionErrorMessage: 'Cannot resolve PostgreSQL port',
    portWaitErrorMessage: 'port timeout',
    postgresWaitErrorMessage: 'postgres timeout',
    startupFailureMessage: 'PostgreSQL startup failed',
    pgIsReadyArguments: (databaseName) => ['pg_isready', '-d', databaseName],
    randomBytes,
    waitForPort: async (port, options) => portWaits.push({ port, options }),
    waitForPostgres: async (options) => postgresWaits.push(options),
  });

  assert.deepEqual(disposable.databaseNames, {
    d19: 'd19_202020202020',
    packb: 'packb_202020202020',
  });
  assert.equal(disposable.containerName, 'pea-test-run-one-04040404');
  assert.match(disposable.databaseUrls.d19, /\/d19_202020202020\?schema=public$/);
  assert.match(disposable.databaseUrls.packb, /\/packb_202020202020\?schema=public$/);
  assert.deepEqual(portWaits, [{
    port: 55432,
    options: { errorMessage: 'port timeout' },
  }]);
  assert.equal(postgresWaits[0].databaseName, 'd19_202020202020');
  assert.deepEqual(postgresWaits[0].pgIsReadyArguments('db'), ['pg_isready', '-d', 'db']);
  assert.deepEqual(calls.map((call) => call.argv.slice(0, 2)), [
    ['docker', 'version'],
    ['docker', 'run'],
    ['docker', 'port'],
  ]);
  assert.deepEqual(calls[1].argv.slice(-3), [
    '-p',
    '127.0.0.1::5432',
    POSTGRES_IMAGE,
  ]);
});

test('shared disposable PostgreSQL startup keeps blocked error code and cleanup-on-failure', async () => {
  const unavailable = new Error('not set');
  try {
    await startDisposablePostgres({
      runId: 'run',
      postgresImage: POSTGRES_IMAGE,
      runCommand: async () => commandResult({ exit_code: 1 }),
      safeTail: String,
      databasePrefixes: ['d19'],
      containerNamePrefix: 'pea-test',
    });
  } catch (error) {
    unavailable.message = error.message;
    unavailable.code = error.code;
  }
  assert.equal(unavailable.code, 'DISPOSABLE_POSTGRES_UNAVAILABLE');
  assert.equal(unavailable.message, 'Docker daemon is unavailable for disposable PostgreSQL');

  await assert.rejects(
    () => startDisposablePostgres({
      runId: 'run',
      postgresImage: POSTGRES_IMAGE,
      runCommand: async (argv) => (
        argv[1] === 'version'
          ? commandResult()
          : commandResult({
            exit_code: 1,
            stderr: 'postgresql://postgres:secret@127.0.0.1/db password=secret',
          })
      ),
      safeTail: (value) => safeCommandTail(value, 4_000),
      databasePrefixes: ['d19'],
      containerNamePrefix: 'pea-test',
      randomBytes: (size) => Buffer.alloc(size, size),
    }),
    (error) => (
      error.code === 'DISPOSABLE_POSTGRES_UNAVAILABLE'
      && error.message.includes('[redacted-database-url]')
      && error.message.includes('password=[redacted]')
      && !error.message.includes('secret')
    ),
  );

  const calls = [];
  const fakeRun = async (argv) => {
    calls.push(argv);
    if (argv[1] === 'version' || argv[1] === 'run' || argv[1] === 'rm') {
      return commandResult();
    }
    if (argv[1] === 'port') return commandResult({ stdout: 'invalid-port\n' });
    throw new Error(`Unexpected command: ${argv.join(' ')}`);
  };
  await assert.rejects(
    () => startDisposablePostgres({
      runId: 'run',
      postgresImage: POSTGRES_IMAGE,
      runCommand: fakeRun,
      safeTail: String,
      databasePrefixes: ['d19'],
      containerNamePrefix: 'pea-test',
      portResolutionErrorMessage: 'Cannot resolve PostgreSQL port',
      startupFailureMessage: 'PostgreSQL startup failed',
      randomBytes: (size) => Buffer.alloc(size, size),
    }),
    (error) => (
      error.code === 'DISPOSABLE_POSTGRES_UNAVAILABLE'
      && error.message === 'Cannot resolve PostgreSQL port'
    ),
  );
  assert.deepEqual(calls.at(-1).slice(0, 3), ['docker', 'rm', '--force']);
});

test('shared marker and cleanup helpers preserve durable evidence and Docker commands', async () => {
  const calls = [];
  const fakeRun = async (argv, options) => {
    calls.push({ argv, options });
    return commandResult();
  };
  const marker = 'experiment-foundation-d19-disposable:nonce';
  assert.deepEqual(await markDisposableDatabase({
    runCommand: fakeRun,
    safeTail: String,
    containerName: 'container',
    databaseName: 'd19_0123456789ab',
    marker,
    failureMessage: 'Cannot mark disposable D-19 database',
  }), {
    database_name: 'd19_0123456789ab',
    marker_sha256: crypto.createHash('sha256').update(marker).digest('hex'),
    marker_written: true,
  });
  await stopDisposablePostgres('container', { runCommand: fakeRun });
  assert.deepEqual(calls[0].argv, [
    'docker', 'exec', 'container',
    'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'd19_0123456789ab',
    '-c', `COMMENT ON DATABASE "d19_0123456789ab" IS '${marker}'`,
  ]);
  assert.deepEqual(calls[1], {
    argv: ['docker', 'rm', '--force', 'container'],
    options: { timeoutMs: 30_000 },
  });

  await assert.rejects(
    () => markDisposableDatabase({
      runCommand: async () => commandResult({
        exit_code: 1,
        stderr: 'postgresql://postgres:secret@127.0.0.1/db password=secret',
      }),
      safeTail: (value) => safeCommandTail(value, 4_000),
      containerName: 'container',
      databaseName: 'd19_0123456789ab',
      marker,
      failureMessage: 'Cannot mark disposable D-19 database',
    }),
    (error) => (
      error.message.startsWith('Cannot mark disposable D-19 database:')
      && error.message.includes('[redacted-database-url]')
      && error.message.includes('password=[redacted]')
      && !error.message.includes('secret')
    ),
  );
});

test('shared marker helper rejects SQL metacharacters before invoking psql', async () => {
  let commandCalls = 0;
  const options = {
    runCommand: async () => {
      commandCalls += 1;
      return commandResult();
    },
    safeTail: String,
    containerName: 'container',
    databaseName: 'd19_0123456789ab',
    marker: 'experiment-foundation-d19-disposable:0123456789abcdef',
    failureMessage: 'Cannot mark disposable D-19 database',
  };

  await assert.rejects(
    () => markDisposableDatabase({
      ...options,
      databaseName: 'd19_bad";drop_database',
    }),
    /database name is invalid/,
  );
  await assert.rejects(
    () => markDisposableDatabase({
      ...options,
      marker: "experiment-foundation-d19-disposable:x';drop_database",
    }),
    /database marker is invalid/,
  );
  assert.equal(commandCalls, 0);
});

test('shared marker verification and schema reset stay bound to the disposable database identity', async () => {
  const calls = [];
  const databaseName = 'd19_0123456789ab';
  const marker = 'experiment-foundation-d19-disposable:0123456789abcdef';
  const fakeRun = async (argv, options) => {
    calls.push({ argv, options });
    if (argv.some((argument) => argument.includes("SELECT current_database() || E'\\t'"))) {
      return commandResult({ stdout: `${databaseName}\t${marker}\n` });
    }
    return commandResult({ stdout: 'schema reset\n' });
  };
  const options = {
    runCommand: fakeRun,
    safeTail: (value) => safeCommandTail(value, 4_000),
    containerName: 'container',
    databaseName,
    marker,
    failureMessage: 'Disposable database marker mismatch',
    resetFailureMessage: 'Cannot reset disposable schema',
  };

  const verified = await verifyDisposableDatabaseMarker(options);
  assert.deepEqual(verified, {
    database_name: databaseName,
    marker_sha256: crypto.createHash('sha256').update(marker).digest('hex'),
    marker_verified: true,
  });
  const reset = await resetDisposablePostgresPublicSchema(options);
  assert.equal(reset.status, 'passed');
  assert.equal(reset.marker_verified_before, true);
  assert.equal(reset.marker_verified_after, true);
  assert.equal(calls.filter((call) => call.argv.includes(
    'DROP SCHEMA public CASCADE; CREATE SCHEMA public AUTHORIZATION postgres',
  )).length, 1);

  await assert.rejects(
    () => verifyDisposableDatabaseMarker({
      ...options,
      runCommand: async () => commandResult({ stdout: `${databaseName}\twrong-marker\n` }),
    }),
    /Disposable database marker mismatch/,
  );
  await assert.rejects(
    () => verifyDisposableDatabaseMarker({ ...options, databaseName: 'unsafe-name;drop' }),
    /database name is invalid/,
  );
});
