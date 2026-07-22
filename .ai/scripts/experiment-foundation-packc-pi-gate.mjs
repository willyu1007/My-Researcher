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

export const PACKC_PI_CHECK_REGISTRY = Object.freeze([
  { id: 'PC08', evidence_refs: ['gateway_unit', 'contracts_schema'] },
  { id: 'PC09', evidence_refs: ['gateway_unit', 'relational'] },
  { id: 'PC10', evidence_refs: ['evaluator_unit', 'closure_unit', 'relational'] },
  { id: 'PC11', evidence_refs: ['evaluator_unit', 'closure_unit', 'relational'] },
  { id: 'PC12', evidence_refs: ['evaluator_unit', 'closure_unit', 'relational'] },
  { id: 'PC13', evidence_refs: ['evaluator_unit', 'closure_unit', 'relational'] },
  { id: 'PC14', evidence_refs: ['closure_unit', 'contracts_schema'] },
  { id: 'PC15', evidence_refs: ['closure_unit', 'relational'] },
  { id: 'PC16', evidence_refs: ['seal_unit', 'relational', 'static_census'] },
  { id: 'PC17', evidence_refs: ['static_census'] },
  { id: 'PC19-PI', evidence_refs: ['sidecar_unit', 'static_census'] },
  { id: 'PC20', evidence_refs: ['evaluator_unit', 'static_census'] },
]);

export const PACKC_PI_REQUIRED_SUBTEST_REGISTRY = Object.freeze({
  closure_unit: Object.freeze([
    'production default derivation reconstructs identical closure, snapshot, event, and outbox ids',
  ]),
  relational: Object.freeze([
    'Pack C-PI two-client Serializable races preserve closure-vs-writer final-state invariants',
  ]),
});
export const PACKC_PI_RELATIONAL_TEST_FILES = Object.freeze([
  'src/repositories/prisma/prisma-paper-implementation-evidence-closure-v2-relational.integration.test.ts',
]);

const MIGRATIONS = Object.freeze([
  '20260720135725_add_paper_implementation_pack_c_evidence_closure_v2',
  '20260720141000_harden_paper_implementation_pack_c_closure_v2',
]);
const EVIDENCE_KEYS = Object.freeze([
  'gateway_unit',
  'contracts_schema',
  'evaluator_unit',
  'closure_unit',
  'seal_unit',
  'sidecar_unit',
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
const MIGRATION_KEYS = Object.freeze([
  'source_present', 'source_sha256', 'applied_to_disposable_postgres',
  'named_local_status',
]);

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
  if (!gateId || !/^packc-pi-\d{8}-r[1-9]\d*$/.test(gateId)) {
    throw new Error('--run-id must match packc-pi-<YYYYMMDD>-r<N>');
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
    check_registry: Object.fromEntries(PACKC_PI_CHECK_REGISTRY.map((check) => [
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
      named_local_status: id.startsWith('20260720141000_')
        ? 'UNAPPLIED_TO_NAMED_LOCAL_INFORMATIONAL'
        : 'NOT_ASSERTED_BY_DISPOSABLE_GATE',
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
      evaluator_mutation_calls: 0,
      v2_packet_writer_files: 0,
      closure_event_other_producers: 0,
      missing_closure_lookup_wirings: 0,
      sidecar_generic_write_paths: 0,
      legacy_complete_v2_rewrites: 0,
      existing_database_connections: 0,
      real_provider_requests: 0,
      external_network_requests: 0,
      pi_evidence_closure_product_writes: 0,
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
  assertExactKeys(summary.check_registry, PACKC_PI_CHECK_REGISTRY.map((row) => row.id),
    'summary.check_registry');
  for (const [id, check] of Object.entries(summary.check_registry)) {
    assertExactKeys(check, CHECK_KEYS, `summary.check_registry.${id}`);
  }
  assertExactKeys(summary.migrations, MIGRATIONS, 'summary.migrations');
  for (const [id, migration] of Object.entries(summary.migrations)) {
    assertExactKeys(migration, MIGRATION_KEYS, `summary.migrations.${id}`);
  }
  assertExactKeys(summary.zero_census, [
    'evaluator_mutation_calls', 'v2_packet_writer_files',
    'closure_event_other_producers', 'missing_closure_lookup_wirings',
    'sidecar_generic_write_paths', 'legacy_complete_v2_rewrites',
    'existing_database_connections', 'real_provider_requests',
    'external_network_requests', 'pi_evidence_closure_product_writes',
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
  const [app, evaluatorService, evaluatorRepository, closureService, genericService,
    legacyRoutes, legacyController] = await Promise.all([
    readFile(path.join(REPO_ROOT, 'apps/backend/src/app.ts'), 'utf8'),
    readFile(path.join(REPO_ROOT,
      'apps/backend/src/services/paper-implementation-cycle-readiness-v2-service.ts'), 'utf8'),
    readFile(path.join(REPO_ROOT,
      'apps/backend/src/repositories/prisma/prisma-paper-implementation-cycle-readiness-v2-repository.ts'), 'utf8'),
    readFile(path.join(REPO_ROOT,
      'apps/backend/src/services/paper-implementation-validation-cycle-closure-v2-service.ts'), 'utf8'),
    readFile(path.join(REPO_ROOT,
      'apps/backend/src/services/experiment-foundation-service.ts'), 'utf8'),
    readFile(path.join(REPO_ROOT, 'apps/backend/src/routes/paper-implementation-routes.ts'), 'utf8'),
    readFile(path.join(REPO_ROOT,
      'apps/backend/src/controllers/paper-implementation-controller.ts'), 'utf8'),
  ]);
  const expectedSealedServices = [
    'ExperimentFoundationExecutionV2Service',
    'PaperImplementationExperimentV2AdmissionService',
    'ExperimentFoundationV2MaterializationService',
    'PaperImplementationExperimentV2HeadService',
  ];
  const compositionWiredServices = expectedSealedServices.filter((name) => (
    constructorWindow(app, name).includes(
      'cycleClosureLookup: paperImplementationValidationCycleClosureV2Repository',
    )
  ));
  const evaluatorMutationCalls = (
    `${evaluatorService}\n${evaluatorRepository}`
      .match(/\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/g) ?? []
  ).length;
  const packetWriterCensus = await execute([
    'rg', '-l', 'ResultInterpretationPacketV2|resultInterpretationPacketV2',
    'apps/backend/src',
    '--glob', '!*.test.ts',
    '--glob', '!*.unit.test.ts',
    '--glob', '!*.integration.test.ts',
  ], { cwd: REPO_ROOT, timeoutMs: 30_000 });
  const packetWriterFiles = packetWriterCensus.exit_code === 0
    ? packetWriterCensus.stdout.trim().split('\n').filter(Boolean).sort()
    : [];
  const closureProducerCount = (
    closureService.match(/event_type:\s*PAPER_IMPLEMENTATION_VALIDATION_CYCLE_CLOSED_EVENT_TYPE/g)
      ?? []
  ).length;
  const closedKinds = extractStringArray(genericService, 'CLOSED_LEGACY_SCIENTIFIC_RECORD_KINDS');
  const expectedClosedKinds = [
    'experiment_result',
    'result_validation_report',
    'evidence_candidate',
    'paper_experiment_sidecar',
  ];
  const guardCalls = (genericService.match(/assertLegacyScientificWriterOpen\(/g) ?? []).length;
  const legacyCompleteRouteCount = (
    legacyRoutes.match(/validation-cycles\/:validation_cycle_id\/complete/g) ?? []
  ).length;
  const legacyCompleteDelegateCount = (
    legacyController.match(/validationCyclePlanning\.completeValidationCycle\(/g) ?? []
  ).length;
  const legacyCompleteV2References = (
    `${legacyRoutes}\n${legacyController}`
      .match(/ValidationCycleClosureV2|validationCycleClosureV2/g) ?? []
  ).length;
  const passed = compositionWiredServices.length === expectedSealedServices.length
    && evaluatorMutationCalls === 0
    && packetWriterFiles.length === 0
    && closureProducerCount === 1
    && JSON.stringify(closedKinds) === JSON.stringify(expectedClosedKinds)
    && guardCalls >= 4
    && legacyCompleteRouteCount === 1
    && legacyCompleteDelegateCount === 1
    && legacyCompleteV2References === 0;
  return {
    status: passed ? 'passed' : 'failed',
    composition_wired_services: compositionWiredServices,
    missing_closure_lookup_wirings:
      expectedSealedServices.length - compositionWiredServices.length,
    evaluator_mutation_call_count: evaluatorMutationCalls,
    v2_packet_writer_files: packetWriterFiles,
    validation_cycle_closed_producer_count: closureProducerCount,
    validation_cycle_closed_other_producer_count: Math.max(0, closureProducerCount - 1),
    closed_legacy_record_kinds: closedKinds,
    legacy_guard_call_count: guardCalls,
    sidecar_generic_write_path_count:
      closedKinds.includes('paper_experiment_sidecar') && guardCalls >= 4 ? 0 : 1,
    legacy_complete_route_count: legacyCompleteRouteCount,
    legacy_complete_delegate_count: legacyCompleteDelegateCount,
    legacy_complete_v2_reference_count: legacyCompleteV2References,
    pc17_cutover_claim: 'deferred_to_cutover',
  };
}

function constructorWindow(source, constructorName) {
  const start = source.indexOf(`new ${constructorName}({`);
  return start < 0 ? '' : source.slice(start, start + 1_500);
}

function extractStringArray(source, constantName) {
  const match = source.match(new RegExp(`${constantName}\\s*=\\s*new Set<string>\\(\\[([\\s\\S]*?)\\]\\)`));
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((row) => row[1]);
}

async function runTapSuite(
  name,
  cwd,
  files,
  artifactDir,
  environment = {},
  requiredSubtests = [],
) {
  const result = await runCommand([
    'pnpm', 'exec', 'node', '--test', '--loader', 'ts-node/esm', ...files,
  ], { cwd, env: environment, timeoutMs: 300_000 });
  const outcome = exactPassingTapOutcome(result);
  const missingRequiredSubtests = requiredSubtests.filter(
    (subtest) => !outcome.combinedOutput.includes(`# Subtest: ${subtest}`),
  );
  const evidence = {
    status: outcome.executedWithoutSkip && missingRequiredSubtests.length === 0
      ? 'passed'
      : 'failed',
    command_id: name,
    exit_code: result.exit_code,
    duration_ms: result.duration_ms,
    tests: outcome.tests,
    passed: outcome.passed,
    failed: outcome.failed,
    skipped: outcome.skipped,
    required_subtests: [...requiredSubtests],
    missing_required_subtests: missingRequiredSubtests,
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
  for (const registry of PACKC_PI_CHECK_REGISTRY) {
    const evidence = registry.evidence_refs.map((ref) => summary.evidence[ref]);
    const failed = evidence.some((item) => item?.status === 'failed');
    const blocked = evidence.some((item) => item === null || item?.status === 'blocked');
    const deferred = registry.id === 'PC17' && !failed && !blocked;
    summary.check_registry[registry.id] = {
      status: failed ? 'failed' : blocked ? 'blocked'
        : deferred ? 'deferred_to_cutover' : 'passed',
      evidence_refs: [...registry.evidence_refs],
      details: failed ? 'required evidence failed'
        : blocked ? 'required PostgreSQL evidence unavailable'
          : deferred
            ? 'v2 negative space passed; legacy Packet/dossier removal is deferred to C-cutover'
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
    throw new Error('Required Pack C-PI migration source is missing');
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
    const suites = [
      ['gateway_unit', 'gateway-unit', BACKEND_ROOT,
        ['src/services/paper-implementation-evidence-trust-gateway-service.unit.test.ts']],
      ['contracts_schema', 'contracts-schema', SHARED_ROOT, [
        'src/research-lifecycle/paper-implementation-evidence-v2-contracts.schema.test.ts',
        'src/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts.schema.test.ts',
      ]],
      ['evaluator_unit', 'evaluator-unit', BACKEND_ROOT,
        ['src/services/paper-implementation-cycle-readiness-v2-service.unit.test.ts']],
      ['closure_unit', 'closure-unit', BACKEND_ROOT,
        ['src/services/paper-implementation-validation-cycle-closure-v2-service.unit.test.ts']],
      ['seal_unit', 'seal-unit', BACKEND_ROOT, [
        'src/services/experiment-v2-integration-spine.unit.test.ts',
        'src/services/experiment-foundation-execution-v2-service.unit.test.ts',
      ]],
      ['sidecar_unit', 'sidecar-unit', BACKEND_ROOT,
        ['src/services/experiment-foundation-service.unit.test.ts']],
    ];
    for (const [key, name, cwd, files] of suites) {
      summary.evidence[key] = await runTapSuite(
        name,
        cwd,
        files,
        artifactDir,
        {},
        PACKC_PI_REQUIRED_SUBTEST_REGISTRY[key] ?? [],
      );
      accumulateSuite(summary, summary.evidence[key]);
    }
    summary.evidence.static_census = await inspectStaticCensus();
    await writeJsonAtomic(path.join(artifactDir, 'static-census.json'),
      assertSanitizedJson(summary.evidence.static_census));
    summary.zero_census.evaluator_mutation_calls =
      summary.evidence.static_census.evaluator_mutation_call_count;
    summary.zero_census.v2_packet_writer_files =
      summary.evidence.static_census.v2_packet_writer_files.length;
    summary.zero_census.closure_event_other_producers =
      summary.evidence.static_census.validation_cycle_closed_other_producer_count;
    summary.zero_census.missing_closure_lookup_wirings =
      summary.evidence.static_census.missing_closure_lookup_wirings;
    summary.zero_census.sidecar_generic_write_paths =
      summary.evidence.static_census.sidecar_generic_write_path_count;
    summary.zero_census.legacy_complete_v2_rewrites =
      summary.evidence.static_census.legacy_complete_v2_reference_count;

    disposable = await startDisposablePostgres({
      runId: gateId,
      postgresImage,
      runCommand,
      safeTail: (value) => safeCommandTail(value, 4_000),
      databasePrefixes: ['packc_pi'],
      containerNamePrefix: 'pea-packc-pi',
      portResolutionErrorMessage: 'Cannot resolve disposable Pack C-PI PostgreSQL port',
      portWaitErrorMessage: 'Disposable Pack C-PI PostgreSQL port was unavailable',
      postgresWaitErrorMessage: 'Disposable Pack C-PI PostgreSQL was not ready',
      startupFailureMessage: 'Disposable Pack C-PI PostgreSQL startup failed',
      pgIsReadyArguments: (databaseName) => ['pg_isready', '-U', 'postgres', '-d', databaseName],
    });
    const databaseName = disposable.databaseNames['packc_pi'];
    const databaseUrl = disposable.databaseUrls['packc_pi'];
    summary.disposable_postgres.started = true;
    summary.disposable_postgres.database_name = databaseName;
    const marker = `experiment-foundation-packc-pi-disposable:${disposable.nonce}`;
    const markerEvidence = await markDisposableDatabase({
      containerName: disposable.containerName,
      databaseName,
      marker,
      runCommand,
      safeTail: (value) => safeCommandTail(value, 4_000),
      failureMessage: 'Cannot mark disposable Pack C-PI database',
    });
    summary.disposable_postgres.identity_marker_verified = markerEvidence.marker_written;
    await deployMigrations(databaseUrl, artifactDir);
    for (const id of MIGRATIONS) summary.migrations[id].applied_to_disposable_postgres = true;
    summary.evidence.relational = await runTapSuite(
      'relational', BACKEND_ROOT,
      PACKC_PI_RELATIONAL_TEST_FILES,
      artifactDir,
      {
        DATABASE_URL: databaseUrl,
        EXPERIMENT_V2_TEST_DATABASE_URL: databaseUrl,
        EXPERIMENT_V2_TEST_DATABASE_NAME: databaseName,
        EXPERIMENT_V2_TEST_DISPOSABLE_NONCE: disposable.nonce,
        PAPER_IMPLEMENTATION_PACKC_PI_DATABASE_URL: databaseUrl,
        PAPER_IMPLEMENTATION_PACKC_PI_DISPOSABLE_NONCE: disposable.nonce,
        PAPER_IMPLEMENTATION_EVIDENCE_CLOSURE_V2_RELATIONAL_PRISMA: '1',
      },
      PACKC_PI_REQUIRED_SUBTEST_REGISTRY.relational,
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
      reason_code: unavailable
        ? 'DISPOSABLE_POSTGRES_UNAVAILABLE'
        : 'PACKC_PI_GATE_EXECUTION_FAILED',
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
    if (summary.blockers.some((item) => item.reason_code === 'PACKC_PI_GATE_EXECUTION_FAILED')) {
      summary.status = 'failed';
    }
    summary.finished_at = new Date().toISOString();
    assertExactSummaryKeysets(summary);
    summary.canonical_summary_sha256 = canonicalSummarySha256(summary);
    assertSanitizedJson(summary, 'Pack C PI summary');
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
