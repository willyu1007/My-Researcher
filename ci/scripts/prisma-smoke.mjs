#!/usr/bin/env node

import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_ARTIFACT_DIR = path.join('artifacts', 'prisma-smoke');
const DEFAULT_SCHEMA_PREFIX = 'smoke';
const PRISMA_SCHEMA_PATH = path.join('prisma', 'schema.prisma');

function usage(exitCode = 0) {
  console.log(`
Usage:
  node ci/scripts/prisma-smoke.mjs [options]

Options:
  --base-url <postgres-url>      Base DB URL (default: env PRISMA_SMOKE_BASE_DATABASE_URL or DATABASE_URL)
  --schema-prefix <prefix>       Schema prefix (default: ${DEFAULT_SCHEMA_PREFIX})
  --artifacts-dir <path>         Artifact directory root (default: ${DEFAULT_ARTIFACT_DIR})
  --run-id <id>                  Explicit run id (default: generated timestamp id)
  --keep-schema                  Skip cleanup drop schema (for debugging)
  -h, --help                     Show this message
`.trim());
  process.exit(exitCode);
}

function die(message) {
  console.error(`[error] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    baseUrl: process.env.PRISMA_SMOKE_BASE_DATABASE_URL || process.env.DATABASE_URL || '',
    schemaPrefix: DEFAULT_SCHEMA_PREFIX,
    artifactsDir: DEFAULT_ARTIFACT_DIR,
    runId: '',
    keepSchema: false,
  };

  while (args.length > 0) {
    const token = args.shift();
    if (token === '--') {
      continue;
    }
    switch (token) {
      case '--base-url':
        options.baseUrl = args.shift() || '';
        break;
      case '--schema-prefix':
        options.schemaPrefix = args.shift() || '';
        break;
      case '--artifacts-dir':
        options.artifactsDir = args.shift() || '';
        break;
      case '--run-id':
        options.runId = args.shift() || '';
        break;
      case '--keep-schema':
        options.keepSchema = true;
        break;
      case '-h':
      case '--help':
        usage(0);
        break;
      default:
        die(`Unknown option: ${token}`);
    }
  }

  if (!options.baseUrl) {
    die('Missing base URL. Use --base-url or set PRISMA_SMOKE_BASE_DATABASE_URL.');
  }
  if (!options.schemaPrefix) {
    die('schema-prefix cannot be empty.');
  }
  if (!options.artifactsDir) {
    die('artifacts-dir cannot be empty.');
  }

  return options;
}

function nowRunId() {
  const iso = new Date().toISOString(); // 2026-02-22T21:45:00.000Z
  return iso.replace(/[-:]/g, '').replace('T', '-').replace(/\..+$/, '').toLowerCase();
}

function sanitizeSchemaName(value) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || 'smoke';
}

function buildSchemaName(prefix, runId) {
  const token = `${prefix}_${runId}_${crypto.randomBytes(2).toString('hex')}`;
  let normalized = sanitizeSchemaName(token);
  if (!/^[a-z_]/.test(normalized)) {
    normalized = `s_${normalized}`;
  }
  if (normalized.length > 63) {
    normalized = normalized.slice(0, 63);
  }
  return normalized;
}

function withSchema(baseUrl, schema) {
  const url = new URL(baseUrl);
  url.searchParams.set('schema', schema);
  return url.toString();
}

function withoutSchema(baseUrl) {
  const url = new URL(baseUrl);
  url.searchParams.delete('schema');
  return url.toString();
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

// Streams child output live (tee to console + log file) instead of buffering:
// the backend test step runs for many minutes and a silent step gets killed by
// the job-level timeout with zero diagnostics (run 29679363684).
function runStep({ label, command, args, env, cwd, logPath, stdin }) {
  const commandText = [command, ...args].join(' ').trim();
  const start = new Date().toISOString();

  console.log(`[run] ${label}`);
  const logStream = fs.createWriteStream(logPath, { encoding: 'utf8' });
  logStream.write(`# ${label}\n$ ${commandText}\n[start] ${start}\n\n`);

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: [stdin === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    });

    if (stdin !== undefined) {
      child.stdin.end(stdin);
    }
    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      logStream.write(chunk);
    });
    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
      logStream.write(chunk);
    });

    const finish = (error, status) => {
      logStream.end(`\n[end] ${new Date().toISOString()}\n[exit] ${status ?? 1}\n`, () => {
        if (error) {
          rejectPromise(error);
        } else {
          resolvePromise(undefined);
        }
      });
    };

    child.on('error', (spawnError) => {
      finish(new Error(`Failed to execute "${command}": ${spawnError.message}`), 1);
    });
    child.on('close', (status) => {
      if (status !== 0) {
        finish(new Error(`Step "${label}" failed with exit code ${status ?? 1}.`), status);
        return;
      }
      finish(undefined, status);
    });
  });
}

async function main() {
  const options = parseArgs(process.argv);
  const runId = options.runId || nowRunId();
  const schema = buildSchemaName(options.schemaPrefix, runId);
  const smokeUrl = withSchema(options.baseUrl, schema);
  const adminUrl = withoutSchema(options.baseUrl);
  const artifactRoot = path.resolve(options.artifactsDir, runId);
  const repoRoot = process.cwd();

  ensureDir(artifactRoot);

  const contextPath = path.join(artifactRoot, '00-context.json');
  writeJson(contextPath, {
    run_id: runId,
    schema,
    base_url: options.baseUrl,
    smoke_database_url: smokeUrl,
    admin_database_url: adminUrl,
    keep_schema: options.keepSchema,
    created_at: new Date().toISOString(),
  });

  let failed = false;
  let cleanupFailed = false;

  const stepEnv = {
    ...process.env,
    DATABASE_URL: smokeUrl,
  };

  try {
    await runStep({
      label: 'Prisma generate',
      command: 'pnpm',
      args: ['exec', 'prisma', 'generate', '--schema', PRISMA_SCHEMA_PATH],
      env: stepEnv,
      cwd: repoRoot,
      logPath: path.join(artifactRoot, '01-prisma-generate.log'),
    });

    await runStep({
      label: 'Prisma migrate deploy',
      command: 'pnpm',
      args: ['exec', 'prisma', 'migrate', 'deploy', '--schema', PRISMA_SCHEMA_PATH],
      env: stepEnv,
      cwd: repoRoot,
      logPath: path.join(artifactRoot, '02-prisma-migrate-deploy.log'),
    });

    await runStep({
      label: 'Backend tests with isolated Prisma schema',
      command: 'pnpm',
      args: ['--filter', '@paper-engineering-assistant/backend', 'test'],
      env: stepEnv,
      cwd: repoRoot,
      logPath: path.join(artifactRoot, '03-backend-test-prisma.log'),
    });
  } catch (error) {
    failed = true;
    const message = error instanceof Error ? error.message : String(error);
    fs.writeFileSync(path.join(artifactRoot, '99-error.log'), `${message}\n`, 'utf8');
    console.error(`[error] ${message}`);
  } finally {
    if (!options.keepSchema) {
      try {
        const dropSql = `DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE;`;
        await runStep({
          label: 'Drop smoke schema',
          command: 'pnpm',
          args: ['exec', 'prisma', 'db', 'execute', '--stdin', '--url', adminUrl],
          env: process.env,
          cwd: repoRoot,
          stdin: dropSql,
          logPath: path.join(artifactRoot, '04-drop-schema.log'),
        });
      } catch (error) {
        cleanupFailed = true;
        const message = error instanceof Error ? error.message : String(error);
        fs.writeFileSync(path.join(artifactRoot, '98-cleanup-error.log'), `${message}\n`, 'utf8');
        console.error(`[error] Cleanup failed: ${message}`);
      }
    }

    writeJson(path.join(artifactRoot, '90-summary.json'), {
      run_id: runId,
      schema,
      success: !failed && !cleanupFailed,
      failed,
      cleanup_failed: cleanupFailed,
      keep_schema: options.keepSchema,
      finished_at: new Date().toISOString(),
    });

    console.log(`[info] Prisma smoke artifacts: ${path.relative(repoRoot, artifactRoot)}`);
  }

  if (failed || cleanupFailed) {
    process.exit(1);
  }
}

await main();
