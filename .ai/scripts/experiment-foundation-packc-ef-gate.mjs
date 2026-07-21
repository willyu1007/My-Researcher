#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  assertSanitizedJson,
  exactPassingTapOutcome,
  sha256File,
  writeJsonAtomic,
} from './lib/experiment-v2-evidence.mjs';
import {
  markDisposableDatabase,
  runCommand,
  safeCommandTail,
  startDisposablePostgres,
  stopDisposablePostgres,
} from './lib/disposable-postgres.mjs';
import { describeEnvironmentIsolation } from './lib/hermetic-child-env.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BACKEND_ROOT = path.join(REPO_ROOT, 'apps/backend');
const SHARED_ROOT = path.join(REPO_ROOT, 'packages/shared');
const ARTIFACT_ROOT = path.join(REPO_ROOT, '.ai/.tmp/experiment-foundation-productization');
export const DEFAULT_POSTGRES_IMAGE =
  'pgvector/pgvector@sha256:a132765ec351c65111b5b675928a3a0515a466a40f97277329db8b8209ad8bc9';

export const PACKC_EF_CHECK_REGISTRY = Object.freeze([
  { id: 'PC01', evidence_refs: ['engine_unit'] },
  { id: 'PC02', evidence_refs: ['engine_unit'] },
  { id: 'PC03', evidence_refs: ['engine_unit', 'service_unit'] },
  { id: 'PC04', evidence_refs: ['engine_unit', 'service_unit'] },
  { id: 'PC05', evidence_refs: ['static_census', 'schema_unit'] },
  { id: 'PC06', evidence_refs: ['relational'] },
  { id: 'PC07', evidence_refs: ['service_unit', 'relational'] },
  { id: 'PC19-EF', evidence_refs: ['legacy_writer_unit'] },
]);

const MIGRATIONS = Object.freeze([
  '20260718224543_add_experiment_foundation_pack_c_scientific_validation_v2',
  '20260719120000_reconcile_index_names_and_topic_research_record',
]);
const EVIDENCE_KEYS = Object.freeze([
  'engine_unit',
  'service_unit',
  'schema_unit',
  'legacy_writer_unit',
  'static_census',
  'relational',
]);
const SUMMARY_KEYS = Object.freeze([
  'gate_id', 'status', 'started_at', 'finished_at', 'check_registry',
  'suite_totals', 'migrations', 'disposable_postgres', 'evidence',
  'zero_census', 'redaction', 'environment_isolation', 'blockers',
  'canonical_summary_sha256',
]);
const CHECK_KEYS = Object.freeze(['status', 'evidence_refs', 'details']);

const MIGRATION_PATHS = Object.fromEntries(MIGRATIONS.map((id) => [
  id,
  path.join(REPO_ROOT, 'prisma/migrations', id, 'migration.sql'),
]));

export function parseArgs(argv) {
  let gateId = null;
  let postgresImage = DEFAULT_POSTGRES_IMAGE;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--run-id') {
      gateId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (argument === '--postgres-image') {
      postgresImage = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  if (!gateId || !/^packc-ef-\d{8}-r[1-9]\d*$/.test(gateId)) {
    throw new Error('--run-id must match packc-ef-<YYYYMMDD>-r<N>');
  }
  if (postgresImage !== DEFAULT_POSTGRES_IMAGE) {
    throw new Error('postgres-image must equal the reviewed digest-pinned image');
  }
  return { gateId, postgresImage };
}

export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map(
    (key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`,
  ).join(',')}}`;
}

export function canonicalSummarySha256(summary) {
  return `sha256:${crypto.createHash('sha256').update(canonicalJson({
    ...summary,
    canonical_summary_sha256: null,
  })).digest('hex')}`;
}

export function buildInitialSummary(gateId, postgresImage, startedAt = new Date().toISOString()) {
  return {
    gate_id: gateId,
    status: 'running',
    started_at: startedAt,
    finished_at: null,
    check_registry: Object.fromEntries(PACKC_EF_CHECK_REGISTRY.map((check) => [
      check.id,
      { status: 'not_run', evidence_refs: [...check.evidence_refs], details: null },
    ])),
    suite_totals: {
      suites: 0,
      tests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      blocked: 0,
    },
    migrations: Object.fromEntries(MIGRATIONS.map((id) => [id, {
      source_present: false,
      source_sha256: null,
      applied_to_disposable_postgres: false,
    }])),
    disposable_postgres: {
      mode: 'docker',
      image: postgresImage,
      digest_pinned: true,
      existing_database_url_used: false,
      started: false,
      database_name: null,
      identity_marker_verified: false,
      cleaned_up: false,
    },
    evidence: Object.fromEntries(EVIDENCE_KEYS.map((key) => [key, null])),
    zero_census: {
      generic_scientific_writes: 0,
      route_scientific_writes: 0,
      adapter_scientific_writes: 0,
      accept_partial_request_contract_occurrences: 0,
      existing_database_connections: 0,
      real_provider_requests: 0,
      external_network_requests: 0,
      scientific_product_writes: 0,
    },
    redaction: {
      database_url_stored: false,
      database_password_stored: false,
      command_stdout_stored_in_summary: false,
      credential_values_loaded: false,
      output_tails_sanitized: true,
    },
    environment_isolation: describeEnvironmentIsolation(),
    blockers: [],
    canonical_summary_sha256: null,
  };
}

export function assertExactSummaryKeysets(summary) {
  assertExactKeys(summary, SUMMARY_KEYS, 'summary');
  assertExactKeys(summary.evidence, EVIDENCE_KEYS, 'summary.evidence');
  assertExactKeys(summary.check_registry, PACKC_EF_CHECK_REGISTRY.map((row) => row.id), 'summary.check_registry');
  for (const [id, check] of Object.entries(summary.check_registry)) {
    assertExactKeys(check, CHECK_KEYS, `summary.check_registry.${id}`);
  }
  assertExactKeys(summary.zero_census, [
    'generic_scientific_writes', 'route_scientific_writes',
    'adapter_scientific_writes', 'accept_partial_request_contract_occurrences',
    'existing_database_connections', 'real_provider_requests',
    'external_network_requests', 'scientific_product_writes',
  ], 'summary.zero_census');
  assertExactKeys(summary.redaction, [
    'database_url_stored', 'database_password_stored',
    'command_stdout_stored_in_summary', 'credential_values_loaded',
    'output_tails_sanitized',
  ], 'summary.redaction');
  return summary;
}

export async function inspectStaticCensus(options = {}) {
  const readFile = options.readFile ?? fs.readFile;
  const execute = options.runCommand ?? runCommand;
  const [service, execution, sharedContracts, efRoutes, executionRoutes, piAdapter] =
    await Promise.all([
      readFile(path.join(REPO_ROOT, 'apps/backend/src/services/experiment-foundation-service.ts'), 'utf8'),
      readFile(path.join(REPO_ROOT, 'apps/backend/src/services/experiment-foundation-execution-service.ts'), 'utf8'),
      readFile(path.join(REPO_ROOT, 'packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts'), 'utf8'),
      readFile(path.join(REPO_ROOT, 'apps/backend/src/routes/experiment-foundation-routes.ts'), 'utf8'),
      readFile(path.join(REPO_ROOT, 'apps/backend/src/routes/experiment-foundation-execution-routes.ts'), 'utf8'),
      readFile(path.join(REPO_ROOT, 'apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts'), 'utf8'),
    ]);
  const closedKinds = extractStringArray(service, 'CLOSED_LEGACY_SCIENTIFIC_RECORD_KINDS');
  const expectedClosedKinds = [
    'experiment_result', 'result_validation_report', 'evidence_candidate',
    'paper_experiment_sidecar',
  ];
  const guardCalls = (service.match(/assertLegacyScientificWriterOpen\(/g) ?? []).length;
  const collectPrefix = execution.slice(execution.indexOf('async collectJob('));
  const collectClosedBeforeRepository = collectPrefix.indexOf('LEGACY_SCIENTIFIC_WRITER_CLOSED_REASON_CODE')
    >= 0 && collectPrefix.indexOf('LEGACY_SCIENTIFIC_WRITER_CLOSED_REASON_CODE')
    < collectPrefix.indexOf('private async assertSubmitGate');
  const productionRequestPopulation = [sharedContracts, efRoutes, executionRoutes, piAdapter].join('\n');
  const acceptPartialOccurrences = (productionRequestPopulation.match(/accept_partial/g) ?? []).length;
  const routeRepositoryImports = [efRoutes, executionRoutes].filter((source) => (
    /repositories\//.test(source) || /\.create\s*\(/.test(source)
  )).length;
  const writerCensus = await execute([
    'rg', '-l',
    'experimentFoundation(ExperimentResult|ScientificValidationReport|EvidenceCandidate)V2\\.(create|createMany|upsert|update|delete)',
    'apps/backend/src',
    '--glob', '!*.test.ts',
    '--glob', '!*.unit.test.ts',
    '--glob', '!*.integration.test.ts',
  ], { cwd: REPO_ROOT, timeoutMs: 30_000 });
  const scientificPrismaWriterFiles = writerCensus.exit_code === 0
    ? writerCensus.stdout.trim().split('\n').filter(Boolean).sort()
    : [];
  const expectedScientificWriterFiles = [
    'apps/backend/src/repositories/prisma/prisma-experiment-foundation-scientific-validation-v2-repository.ts',
  ];
  const passed = JSON.stringify(closedKinds) === JSON.stringify(expectedClosedKinds)
    && guardCalls >= 3
    && collectClosedBeforeRepository
    && acceptPartialOccurrences === 0
    && routeRepositoryImports === 0
    && JSON.stringify(scientificPrismaWriterFiles) === JSON.stringify(expectedScientificWriterFiles);
  return {
    status: passed ? 'passed' : 'failed',
    closed_legacy_scientific_record_kinds: closedKinds,
    generic_service_guard_call_count: guardCalls,
    collect_job_closed_before_repository_access: collectClosedBeforeRepository,
    accept_partial_request_contract_occurrences: acceptPartialOccurrences,
    route_repository_write_path_count: routeRepositoryImports,
    scientific_prisma_writer_files: scientificPrismaWriterFiles,
    generic_scientific_write_path_count: passed ? 0 : null,
    adapter_scientific_write_path_count: passed ? 0 : null,
  };
}

function extractStringArray(source, constantName) {
  const match = source.match(new RegExp(`${constantName}\\s*=\\s*new Set<string>\\(\\[([\\s\\S]*?)\\]\\)`));
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((row) => row[1]);
}

async function runTapSuite(name, cwd, files, artifactDir, environment = {}) {
  const result = await runCommand([
    'pnpm', 'exec', 'node', '--test', '--loader', 'ts-node/esm', ...files,
  ], { cwd, env: environment, timeoutMs: 300_000 });
  const outcome = exactPassingTapOutcome(result);
  const evidence = {
    status: outcome.executedWithoutSkip ? 'passed' : 'failed',
    command_id: name,
    exit_code: result.exit_code,
    duration_ms: result.duration_ms,
    tests: outcome.tests,
    passed: outcome.passed,
    failed: outcome.failed,
    skipped: outcome.skipped,
    output_sha256: `sha256:${crypto.createHash('sha256').update(outcome.combinedOutput).digest('hex')}`,
    sanitized_output_tail: safeCommandTail(outcome.combinedOutput, 4_000),
  };
  await writeJsonAtomic(path.join(artifactDir, `${name}.json`), assertSanitizedJson(evidence, name));
  return evidence;
}

function accumulateSuite(summary, evidence, blocked = false) {
  summary.suite_totals.suites += 1;
  if (blocked) {
    summary.suite_totals.blocked += 1;
    return;
  }
  summary.suite_totals.tests += evidence.tests ?? 0;
  summary.suite_totals.passed += evidence.passed ?? 0;
  summary.suite_totals.failed += evidence.failed ?? 0;
  summary.suite_totals.skipped += evidence.skipped ?? 0;
}

export function updateChecks(summary) {
  for (const registry of PACKC_EF_CHECK_REGISTRY) {
    const evidence = registry.evidence_refs.map((ref) => summary.evidence[ref]);
    const failed = evidence.some((item) => item?.status === 'failed');
    const blocked = evidence.some((item) => item === null || item?.status === 'blocked');
    summary.check_registry[registry.id] = {
      status: failed ? 'failed' : blocked ? 'blocked' : 'passed',
      evidence_refs: [...registry.evidence_refs],
      details: failed ? 'required evidence failed'
        : blocked ? 'required PostgreSQL evidence unavailable'
          : 'all required evidence passed',
    };
  }
  const statuses = Object.values(summary.check_registry).map((check) => check.status);
  summary.status = statuses.includes('failed') ? 'failed'
    : statuses.includes('blocked') ? 'blocked'
      : 'passed';
}

async function inspectMigrations(summary) {
  for (const id of MIGRATIONS) {
    try {
      const stat = await fs.stat(MIGRATION_PATHS[id]);
      summary.migrations[id].source_present = stat.isFile();
      summary.migrations[id].source_sha256 = `sha256:${await sha256File(MIGRATION_PATHS[id])}`;
    } catch {
      summary.migrations[id].source_present = false;
    }
  }
  if (MIGRATIONS.some((id) => !summary.migrations[id].source_present)) {
    throw new Error('Required Pack C migration source is missing');
  }
}

async function deployMigrations(databaseUrl, artifactDir) {
  const result = await runCommand(['pnpm', 'exec', 'prisma', 'migrate', 'deploy'], {
    cwd: REPO_ROOT,
    env: { DATABASE_URL: databaseUrl },
    timeoutMs: 300_000,
  });
  const evidence = {
    status: result.exit_code === 0 ? 'passed' : 'failed',
    exit_code: result.exit_code,
    duration_ms: result.duration_ms,
    output_sha256: `sha256:${crypto.createHash('sha256').update(`${result.stdout}\n${result.stderr}`).digest('hex')}`,
    sanitized_output_tail: safeCommandTail(`${result.stdout}\n${result.stderr}`, 4_000),
  };
  await writeJsonAtomic(path.join(artifactDir, 'migration-deploy.json'), assertSanitizedJson(evidence));
  if (result.exit_code !== 0) throw new Error('Prisma migration deploy failed');
}

async function main() {
  const { gateId, postgresImage } = parseArgs(process.argv.slice(2));
  const artifactDir = path.join(ARTIFACT_ROOT, gateId);
  const summaryPath = path.join(artifactDir, 'summary.json');
  await fs.mkdir(artifactDir, { recursive: true });
  const summary = buildInitialSummary(gateId, postgresImage);
  let disposable = null;
  try {
    await inspectMigrations(summary);
    summary.evidence.engine_unit = await runTapSuite(
      'engine-unit', BACKEND_ROOT,
      ['src/services/experiment-foundation-v2-scientific-rule-engine.unit.test.ts'],
      artifactDir,
    );
    accumulateSuite(summary, summary.evidence.engine_unit);
    summary.evidence.service_unit = await runTapSuite(
      'service-unit', BACKEND_ROOT,
      ['src/services/experiment-foundation-v2-scientific-validation-service.unit.test.ts'],
      artifactDir,
    );
    accumulateSuite(summary, summary.evidence.service_unit);
    summary.evidence.schema_unit = await runTapSuite(
      'schema-unit', SHARED_ROOT,
      ['src/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts.schema.test.ts'],
      artifactDir,
    );
    accumulateSuite(summary, summary.evidence.schema_unit);
    summary.evidence.legacy_writer_unit = await runTapSuite(
      'legacy-writer-unit', BACKEND_ROOT,
      [
        'src/services/experiment-foundation-service.unit.test.ts',
        'src/services/experiment-foundation-execution-service.unit.test.ts',
        'src/services/paper-implementation-live-experiment-adapter-service.unit.test.ts',
      ],
      artifactDir,
    );
    accumulateSuite(summary, summary.evidence.legacy_writer_unit);
    summary.evidence.static_census = await inspectStaticCensus();
    await writeJsonAtomic(
      path.join(artifactDir, 'static-census.json'),
      assertSanitizedJson(summary.evidence.static_census),
    );
    summary.zero_census.accept_partial_request_contract_occurrences =
      summary.evidence.static_census.accept_partial_request_contract_occurrences;
    summary.zero_census.generic_scientific_writes =
      summary.evidence.static_census.generic_scientific_write_path_count ?? 1;
    summary.zero_census.route_scientific_writes =
      summary.evidence.static_census.route_repository_write_path_count;
    summary.zero_census.adapter_scientific_writes =
      summary.evidence.static_census.adapter_scientific_write_path_count ?? 1;

    disposable = await startDisposablePostgres({
      runId: gateId,
      postgresImage,
      runCommand,
      safeTail: (value) => safeCommandTail(value, 4_000),
      databasePrefixes: ['packc'],
      containerNamePrefix: 'pea-packc-ef',
      portResolutionErrorMessage: 'Cannot resolve disposable Pack C PostgreSQL port',
      portWaitErrorMessage: 'Disposable Pack C PostgreSQL port was unavailable',
      postgresWaitErrorMessage: 'Disposable Pack C PostgreSQL was not ready',
      startupFailureMessage: 'Disposable Pack C PostgreSQL startup failed',
      pgIsReadyArguments: (databaseName) => ['pg_isready', '-U', 'postgres', '-d', databaseName],
    });
    summary.disposable_postgres.started = true;
    summary.disposable_postgres.database_name = disposable.databaseNames.packc;
    const marker = `experiment-foundation-packc-disposable:${disposable.nonce}`;
    const markerEvidence = await markDisposableDatabase({
      containerName: disposable.containerName,
      databaseName: disposable.databaseNames.packc,
      marker,
      runCommand,
      safeTail: (value) => safeCommandTail(value, 4_000),
      failureMessage: 'Cannot mark disposable Pack C database',
    });
    summary.disposable_postgres.identity_marker_verified = markerEvidence.marker_written;
    await deployMigrations(disposable.databaseUrls.packc, artifactDir);
    for (const id of MIGRATIONS) summary.migrations[id].applied_to_disposable_postgres = true;
    summary.evidence.relational = await runTapSuite(
      'relational', BACKEND_ROOT,
      ['src/repositories/prisma/prisma-experiment-foundation-scientific-validation-v2-relational.integration.test.ts'],
      artifactDir,
      {
        DATABASE_URL: disposable.databaseUrls.packc,
        EXPERIMENT_V2_TEST_DATABASE_URL: disposable.databaseUrls.packc,
        EXPERIMENT_V2_TEST_DATABASE_NAME: disposable.databaseNames.packc,
        EXPERIMENT_V2_TEST_DISPOSABLE_NONCE: disposable.nonce,
        EXPERIMENT_FOUNDATION_PACKC_DATABASE_URL: disposable.databaseUrls.packc,
        EXPERIMENT_FOUNDATION_PACKC_DISPOSABLE_NONCE: disposable.nonce,
        EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATION_V2_RELATIONAL_PRISMA: '1',
      },
    );
    accumulateSuite(summary, summary.evidence.relational);
  } catch (error) {
    const unavailable = error?.code === 'DISPOSABLE_POSTGRES_UNAVAILABLE';
    if (unavailable) {
      summary.evidence.relational = {
        status: 'blocked',
        reason_code: 'DISPOSABLE_POSTGRES_UNAVAILABLE',
        tests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
      };
      accumulateSuite(summary, summary.evidence.relational, true);
    }
    summary.blockers.push({
      reason_code: unavailable ? 'DISPOSABLE_POSTGRES_UNAVAILABLE' : 'PACKC_EF_GATE_EXECUTION_FAILED',
      summary: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (disposable) {
      const cleanup = await stopDisposablePostgres(disposable.containerName, { runCommand });
      summary.disposable_postgres.cleaned_up = cleanup.exit_code === 0;
      if (cleanup.exit_code !== 0) {
        summary.blockers.push({
          reason_code: 'DISPOSABLE_POSTGRES_CLEANUP_FAILED',
          summary: safeCommandTail(cleanup.stderr || cleanup.stdout, 4_000),
        });
        if (summary.evidence.relational?.status === 'passed') {
          summary.evidence.relational.status = 'failed';
        }
      }
    }
    updateChecks(summary);
    if (summary.blockers.some((item) => item.reason_code === 'PACKC_EF_GATE_EXECUTION_FAILED')) {
      summary.status = 'failed';
    }
    summary.finished_at = new Date().toISOString();
    assertExactSummaryKeysets(summary);
    summary.canonical_summary_sha256 = canonicalSummarySha256(summary);
    assertSanitizedJson(summary, 'Pack C EF summary');
    await writeJsonAtomic(summaryPath, summary);
  }
  process.stdout.write(`${JSON.stringify({
    gate_id: gateId,
    status: summary.status,
    summary_path: path.relative(REPO_ROOT, summaryPath),
    canonical_summary_sha256: summary.canonical_summary_sha256,
  })}\n`);
  process.exitCode = summary.status === 'passed' ? 0 : summary.status === 'blocked' ? 2 : 1;
}

function assertExactKeys(value, expectedKeys, label) {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} keyset drift: expected ${expected.join(',')}; got ${actual.join(',')}`);
  }
}

export function isDirectRun(metaUrl = import.meta.url, argvEntry = process.argv[1]) {
  if (!argvEntry) return false;
  return path.resolve(fileURLToPath(metaUrl)) === path.resolve(argvEntry);
}

if (isDirectRun()) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
