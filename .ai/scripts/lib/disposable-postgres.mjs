import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import net from 'node:net';

import { buildSafeChildEnv } from './hermetic-child-env.mjs';

export async function runCommand(argv, options = {}) {
  const startedAt = Date.now();
  return await new Promise((resolve) => {
    const hasPosixProcessGroup = process.platform !== 'win32';
    const child = spawn(argv[0], argv.slice(1), {
      cwd: options.cwd,
      detached: hasPosixProcessGroup,
      env: buildSafeChildEnv(options.env),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout = [];
    const stderr = [];
    let settled = false;
    let timeout = null;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      resolve(result);
    };
    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    const timeoutMs = options.timeoutMs ?? 120_000;
    timeout = setTimeout(() => {
      let processGroupKilled = false;
      if (hasPosixProcessGroup && Number.isInteger(child.pid) && child.pid > 0) {
        try {
          process.kill(-child.pid, 'SIGKILL');
          processGroupKilled = true;
        } catch {
          // The group may have exited between the timeout and the signal.
        }
      }
      if (!processGroupKilled) {
        try {
          child.kill('SIGKILL');
        } catch {
          // Preserve the timeout result if the child already exited.
        }
      }
      if (options.destroyOutputOnTimeout) {
        child.stdout.destroy();
        child.stderr.destroy();
      }
      const timeoutMessage = typeof options.timeoutMessage === 'function'
        ? options.timeoutMessage(timeoutMs)
        : options.timeoutMessage ?? 'Timed out.';
      finish({
        exit_code: null,
        signal: 'SIGKILL',
        duration_ms: Date.now() - startedAt,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: `${Buffer.concat(stderr).toString('utf8')}\n${timeoutMessage}`,
      });
    }, timeoutMs);
    child.once('error', (error) => {
      finish({
        exit_code: null,
        signal: null,
        duration_ms: Date.now() - startedAt,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: `${Buffer.concat(stderr).toString('utf8')}\n${error.message}`,
      });
    });
    child.on('close', (code, signal) => {
      finish({
        exit_code: code,
        signal,
        duration_ms: Date.now() - startedAt,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
      });
    });
  });
}

export function safeCommandTail(value, maxCharacters) {
  return value
    .replaceAll(/postgres(?:ql)?:\/\/[^\s]+/gi, '[redacted-database-url]')
    .replaceAll(/password=[^\s]+/gi, 'password=[redacted]')
    .slice(-maxCharacters);
}

async function waitForPort(port, options = {}) {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const reachable = await new Promise((resolve) => {
      const socket = net.createConnection({ host: '127.0.0.1', port });
      socket.setTimeout(1_000);
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      const finish = () => {
        socket.destroy();
        resolve(false);
      };
      socket.once('error', finish);
      socket.once('timeout', finish);
    });
    if (reachable) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    options.errorMessage ?? 'Disposable PostgreSQL port did not become reachable',
  );
}

async function waitForPostgres(options) {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await options.runCommand([
      'docker', 'exec', options.containerName,
      ...options.pgIsReadyArguments(options.databaseName),
    ], { timeoutMs: 5_000 });
    if (ready.exit_code === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(options.errorMessage ?? 'Disposable PostgreSQL did not become ready');
}

export async function startDisposablePostgres(options) {
  const dockerCheck = await options.runCommand(
    ['docker', 'version', '--format', '{{.Server.Version}}'],
    { timeoutMs: 10_000 },
  );
  if (dockerCheck.exit_code !== 0) {
    const error = new Error('Docker daemon is unavailable for disposable PostgreSQL');
    error.code = 'DISPOSABLE_POSTGRES_UNAVAILABLE';
    throw error;
  }

  const randomBytes = options.randomBytes ?? crypto.randomBytes;
  const password = randomBytes(24).toString('hex');
  const nonce = randomBytes(32).toString('hex');
  const databaseNames = Object.fromEntries(options.databasePrefixes.map((prefix) => [
    prefix,
    `${prefix}_${nonce.slice(0, 12)}`,
  ]));
  const initialDatabaseName = databaseNames[options.databasePrefixes[0]];
  const containerName = [
    options.containerNamePrefix,
    options.runId.toLowerCase(),
    randomBytes(4).toString('hex'),
  ].join('-');
  const started = await options.runCommand([
    'docker', 'run', '--detach', '--rm',
    '--name', containerName,
    '--tmpfs', '/var/lib/postgresql/data:rw,noexec,nosuid,size=1g',
    '-e', `POSTGRES_PASSWORD=${password}`,
    '-e', `POSTGRES_DB=${initialDatabaseName}`,
    '-p', '127.0.0.1::5432',
    options.postgresImage,
  ], { timeoutMs: 180_000 });
  if (started.exit_code !== 0) {
    const error = new Error(
      `Unable to start ${options.postgresImage}: ${options.safeTail(started.stderr)}`,
    );
    error.code = 'DISPOSABLE_POSTGRES_UNAVAILABLE';
    throw error;
  }

  try {
    const portResult = await options.runCommand(
      ['docker', 'port', containerName, '5432/tcp'],
      { timeoutMs: 10_000 },
    );
    const portMatch = portResult.stdout.trim().match(/:(\d+)$/);
    if (portResult.exit_code !== 0 || !portMatch) {
      throw new Error(options.portResolutionErrorMessage);
    }
    const port = Number.parseInt(portMatch[1], 10);
    await (options.waitForPort ?? waitForPort)(port, {
      errorMessage: options.portWaitErrorMessage,
    });
    await (options.waitForPostgres ?? waitForPostgres)({
      runCommand: options.runCommand,
      containerName,
      databaseName: initialDatabaseName,
      pgIsReadyArguments: options.pgIsReadyArguments,
      errorMessage: options.postgresWaitErrorMessage,
    });
    return {
      containerName,
      image: options.postgresImage,
      nonce,
      databaseNames,
      databaseUrls: Object.fromEntries(Object.entries(databaseNames).map(
        ([prefix, databaseName]) => [
          prefix,
          `postgresql://postgres:${password}@127.0.0.1:${port}/${databaseName}?schema=public`,
        ],
      )),
    };
  } catch (cause) {
    await stopDisposablePostgres(containerName, { runCommand: options.runCommand });
    const error = new Error(
      cause instanceof Error ? cause.message : options.startupFailureMessage,
    );
    error.code = 'DISPOSABLE_POSTGRES_UNAVAILABLE';
    throw error;
  }
}

export async function markDisposableDatabase(options) {
  assertDisposableDatabaseIdentifier(options.databaseName);
  assertDisposableDatabaseMarker(options.marker);
  const quotedDatabaseName = `"${options.databaseName}"`;
  const quotedMarker = `'${options.marker}'`;
  const result = await options.runCommand([
    'docker', 'exec', options.containerName,
    'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', options.databaseName,
    '-c', `COMMENT ON DATABASE ${quotedDatabaseName} IS ${quotedMarker}`,
  ], { timeoutMs: 30_000 });
  if (result.exit_code !== 0) {
    throw new Error(`${options.failureMessage}: ${options.safeTail(result.stderr)}`);
  }
  return {
    database_name: options.databaseName,
    marker_sha256: crypto.createHash('sha256').update(options.marker).digest('hex'),
    marker_written: true,
  };
}

export async function verifyDisposableDatabaseMarker(options) {
  assertDisposableDatabaseIdentifier(options.databaseName);
  assertDisposableDatabaseMarker(options.marker);
  const result = await options.runCommand([
    'docker', 'exec', options.containerName,
    'psql', '-v', 'ON_ERROR_STOP=1', '-At', '-U', 'postgres',
    '-d', options.databaseName,
    '-c', `SELECT current_database() || E'\\t' || COALESCE(shobj_description(oid, 'pg_database'), '') FROM pg_catalog.pg_database WHERE datname = current_database()`,
  ], { timeoutMs: 30_000 });
  const expected = `${options.databaseName}\t${options.marker}`;
  if (result.exit_code !== 0 || result.stdout.trim() !== expected) {
    throw new Error(
      `${options.failureMessage}: ${options.safeTail(`${result.stdout}\n${result.stderr}`)}`,
    );
  }
  return {
    database_name: options.databaseName,
    marker_sha256: crypto.createHash('sha256').update(options.marker).digest('hex'),
    marker_verified: true,
  };
}

export async function resetDisposablePostgresPublicSchema(options) {
  const before = await verifyDisposableDatabaseMarker(options);
  const result = await options.runCommand([
    'docker', 'exec', options.containerName,
    'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', options.databaseName,
    '-c', 'DROP SCHEMA public CASCADE; CREATE SCHEMA public AUTHORIZATION postgres',
  ], { timeoutMs: 60_000 });
  if (result.exit_code !== 0) {
    throw new Error(
      `${options.resetFailureMessage}: ${options.safeTail(`${result.stdout}\n${result.stderr}`)}`,
    );
  }
  const after = await verifyDisposableDatabaseMarker(options);
  return {
    status: 'passed',
    database_name: options.databaseName,
    marker_verified_before: before.marker_verified,
    marker_verified_after: after.marker_verified,
    marker_sha256: after.marker_sha256,
    reset_output_tail: options.safeTail(`${result.stdout}\n${result.stderr}`),
  };
}

export async function stopDisposablePostgres(containerName, options) {
  return await options.runCommand(
    ['docker', 'rm', '--force', containerName],
    { timeoutMs: 30_000 },
  );
}

function assertDisposableDatabaseIdentifier(value) {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9_]{0,62}$/.test(value)) {
    throw new Error('Disposable PostgreSQL database name is invalid');
  }
}

function assertDisposableDatabaseMarker(value) {
  if (typeof value !== 'string' || !/^[a-z0-9:-]{1,200}$/.test(value)) {
    throw new Error('Disposable PostgreSQL database marker is invalid');
  }
}
