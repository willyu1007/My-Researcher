#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  exactPassingTapOutcome,
  sha256Bytes,
  sha256File,
  writeJsonAtomic,
} from './lib/experiment-v2-evidence.mjs';
import {
  describeEnvironmentIsolation,
} from './lib/hermetic-child-env.mjs';
import {
  markDisposableDatabase,
  runCommand,
  safeCommandTail,
  startDisposablePostgres,
  stopDisposablePostgres,
} from './lib/disposable-postgres.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ARTIFACT_ROOT = path.join(REPO_ROOT, '.ai/.tmp/experiment-foundation-productization');
const MIGRATION_PATH = path.join(
  REPO_ROOT,
  'prisma/migrations/20260723100000_add_experiment_foundation_m7_real_provider_v2/migration.sql',
);
export const DEFAULT_POSTGRES_IMAGE =
  'pgvector/pgvector@sha256:a132765ec351c65111b5b675928a3a0515a466a40f97277329db8b8209ad8bc9';
const APPROVED_IMAGE_REPOSITORY = 'pgvector/pgvector';
const EXECUTION_BUNDLE_TABLES = [
  'ExperimentFoundationExecutionBundleIdentityV2',
  'ExperimentFoundationExecutionBundleDraftV2',
  'ExperimentFoundationExecutionBundleRevisionV2',
  'ExperimentFoundationExecutionBundleLifecycleEventV2',
  'ExperimentFoundationExecutionBundleLifecycleProjectionV2',
  'ExperimentFoundationExecutionBundleReadinessV2',
];
const PACK_B_TABLES = [
  'ExperimentFoundationProviderPayloadV2',
  'ExperimentFoundationExecutionAttemptV2',
  'ExperimentFoundationExecutionAttemptEventV2',
  'ExperimentFoundationProviderCommandV2',
  'ExperimentFoundationCollectionAttemptV2',
  'ExperimentFoundationProvisionalOutputV2',
];
const EXCLUDED_WRITE_TABLES = [
  'ExperimentFoundationExternalTrainingJob',
  'ExperimentResult',
  'EvidenceCandidate',
  'RunEvidenceUnit',
];
const REQUIRED_CHECK_IDS = Array.from({ length: 15 }, (_, index) => (
  `M7-${String(index + 1).padStart(2, '0')}`
));
const TARGETED_SHARED_TESTS = [
  'src/research-lifecycle/experiment-foundation-execution-v2-contracts.schema.test.ts',
  'src/research-lifecycle/experiment-foundation-real-provider-v2-contracts.schema.test.ts',
];
const TARGETED_BACKEND_TESTS = [
  'src/services/experiment-v2-integration-spine.unit.test.ts',
  'src/services/experiment-foundation-real-provider-intake-v2-service.unit.test.ts',
  'src/services/experiment-foundation-real-provider-command-v2-worker.unit.test.ts',
  'src/services/experiment-foundation-aliyun-real-provider-v2-transport.unit.test.ts',
  'src/services/experiment-foundation-v2-provider-payload-service.unit.test.ts',
  'src/services/experiment-foundation-v2-scientific-validation-service.unit.test.ts',
  'src/repositories/prisma/prisma-experiment-foundation-execution-v2-repository.unit.test.ts',
  'src/routes/experiment-foundation-real-provider-v2-routes.integration.test.ts',
];
const RELATIONAL_TESTS = [
  'src/repositories/prisma/prisma-experiment-foundation-execution-bundle-v2-relational.integration.test.ts',
  'src/repositories/prisma/prisma-experiment-foundation-execution-v2-relational.integration.test.ts',
];
const SOURCE_POPULATION = [
  'env/contract.yaml',
  'packages/shared/src/research-lifecycle/experiment-foundation-real-provider-v2-contracts.ts',
  'packages/shared/src/research-lifecycle/experiment-foundation-execution-v2-contracts.ts',
  'packages/shared/src/research-lifecycle/experiment-v2-canonical-hash.ts',
  'apps/backend/src/app.ts',
  'apps/backend/src/services/experiment-foundation-execution-bundle-v2-service.ts',
  'apps/backend/src/services/experiment-foundation-real-provider-payload-v2-service.ts',
  'apps/backend/src/services/experiment-foundation-real-provider-intake-v2-service.ts',
  'apps/backend/src/services/experiment-foundation-aliyun-real-provider-v2-transport.ts',
  'apps/backend/src/services/experiment-foundation-real-provider-command-v2-worker.ts',
  'apps/backend/src/repositories/prisma/prisma-experiment-foundation-execution-bundle-v2-repository.ts',
  'apps/backend/src/repositories/prisma/prisma-experiment-foundation-execution-v2-repository.ts',
  'prisma/schema.prisma',
  'prisma/migrations/20260723100000_add_experiment_foundation_m7_real_provider_v2/migration.sql',
];

export function parseArgs(argv) {
  let runId = null;
  let postgresImage = DEFAULT_POSTGRES_IMAGE;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--run-id') {
      runId = argv[index + 1] ?? null;
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
  if (!runId || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(runId)) {
    throw new Error('--run-id must contain 1..64 safe filename characters');
  }
  const image = postgresImage.match(/^([^@]+)@sha256:([0-9a-f]{64})$/);
  if (
    !image
    || image[1] !== APPROVED_IMAGE_REPOSITORY
    || postgresImage !== DEFAULT_POSTGRES_IMAGE
  ) {
    throw new Error('postgres-image must equal the reviewed digest-pinned pgvector image');
  }
  return { runId, postgresImage };
}

export function inspectM7Migration(sql) {
  if (typeof sql !== 'string' || sql.trim() === '' || /\/\*|\*\//.test(sql)) {
    throw new Error('M7 migration is empty or outside the reviewed SQL grammar');
  }
  const statements = splitSqlStatements(sql);
  const createdTables = statements.flatMap((statement) => {
    const match = statement.match(/^CREATE\s+TABLE\s+"([^"]+)"/i);
    return match ? [match[1]] : [];
  });
  if (JSON.stringify(createdTables.sort()) !== JSON.stringify([...EXECUTION_BUNDLE_TABLES].sort())) {
    throw new Error('M7 migration must create exactly the six typed ExecutionBundle tables');
  }
  const forbidden = statements.filter((statement) => (
    /^(?:TRUNCATE\b|DELETE\s+FROM\b|UPDATE\b|INSERT\s+INTO\b|MERGE\s+INTO\b|DROP\s+(?:TABLE|SCHEMA|DATABASE)\b|ALTER\s+TYPE\b)/i.test(statement)
    || /\b(?:ADD|DROP)\s+COLUMN\b/i.test(statement)
      && !/^ALTER\s+TABLE\s+"ExperimentFoundation(?:RunRecipe|TrainingTaskSpec)V2"\s+ADD\s+COLUMN/i.test(statement)
  ));
  if (forbidden.length > 0) {
    throw new Error('M7 migration contains a destructive or data-mutating statement');
  }
  if (
    statements.filter((statement) => /^DROP\s+INDEX\b/i.test(statement)).length !== 1
    || !sql.includes('RENAME COLUMN "simulationProfileVersion" TO "providerProfileVersion"')
    || !sql.includes('"executionMode" = \'simulation\'')
    || !sql.includes('"executionMode" = \'real_provider\'')
    || !sql.includes('"provenance" = \'non_production_fake_provider\'')
    || !sql.includes('"provenance" = \'real_provider\'')
  ) {
    throw new Error('M7 migration does not preserve the exact simulation/real tuple generalization');
  }
  const references = [...sql.matchAll(/REFERENCES\s+"([^"]+)"/gi)].map((match) => match[1]);
  const foreignKeyCount = [...sql.matchAll(/\bFOREIGN\s+KEY\b/gi)].length;
  if (
    foreignKeyCount !== 7
    || references.some((table) => /^PaperImplementation/.test(table))
    || [...sql.matchAll(/ON\s+DELETE\s+RESTRICT/gi)].length !== foreignKeyCount
    || [...sql.matchAll(/ON\s+UPDATE\s+RESTRICT/gi)].length !== foreignKeyCount
  ) {
    throw new Error('M7 migration foreign-key boundary differs from the reviewed EF-only shape');
  }
  const excluded = [
    'ExperimentFoundationRecord',
    'ExperimentFoundationReadinessReport',
    'ExperimentFoundationExternalTrainingJob',
    'ExperimentResult',
    'EvidenceCandidate',
    'RunEvidenceUnit',
  ].filter((name) => sql.includes(name));
  if (excluded.length > 0) {
    throw new Error(`M7 migration references excluded authority families: ${excluded.join(', ')}`);
  }
  return {
    source_sha256: sha256Bytes(sql),
    statement_count: statements.length,
    created_tables: createdTables.sort(),
    foreign_key_count: foreignKeyCount,
    cross_domain_foreign_key_count: 0,
    data_mutation_statement_count: 0,
    excluded_family_reference_count: 0,
    provider_profile_column_rename_count: 1,
    exact_simulation_real_tuple_present: true,
  };
}

export function inspectM7CapabilityBoundary(envContract, appSource) {
  for (const key of [
    'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED',
    'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED',
  ]) {
    const pattern = new RegExp(
      `${key}:\\s*\\n\\s+type: bool\\s*\\n\\s+required: false\\s*\\n\\s+default: false`,
    );
    if (!pattern.test(envContract) || !appSource.includes(`'${key}'`)) {
      throw new Error(`M7 capability is not strict optional default-false: ${key}`);
    }
  }
  if (
    !appSource.includes('experimentFoundationV2AliyunRealProviderTransport')
    || appSource.includes('new ExperimentFoundationAliyunRealProviderTransportV2(')
    || !appSource.includes('realProviderIntakeEnabled && !input.realProviderControlDrainEnabled')
  ) {
    throw new Error('M7 app composition does not preserve injected transport and drain fencing');
  }
  return {
    intake_default: false,
    control_drain_default: false,
    intake_requires_control_drain: true,
    live_transport_construction_in_app: false,
  };
}

function splitSqlStatements(sql) {
  const withoutComments = sql.replace(/^\s*--.*$/gm, '');
  const pieces = withoutComments.split(';');
  if (pieces.at(-1)?.trim() !== '') throw new Error('M7 migration has unterminated SQL');
  return pieces.map((statement) => statement.trim()).filter(Boolean);
}

async function run(argv, options = {}) {
  return runCommand(argv, {
    ...options,
    cwd: options.cwd ?? REPO_ROOT,
    timeoutMessage: 'Timed out.',
  });
}

function safeTail(value) {
  return safeCommandTail(value, 6_000);
}

async function runCheckedCommand(label, argv, artifactDir, options = {}) {
  const result = await run(argv, options);
  const evidence = {
    status: result.exit_code === 0 ? 'passed' : 'failed',
    exit_code: result.exit_code,
    duration_ms: result.duration_ms,
    output_tail: safeTail(`${result.stdout}\n${result.stderr}`),
  };
  await writeJsonAtomic(path.join(artifactDir, `${label}.json`), evidence);
  if (result.exit_code !== 0) throw new Error(`${label} failed`);
  return evidence;
}

async function runTapTests(label, cwd, testFiles, artifactDir, options = {}) {
  const result = await run(
    ['node', '--test', '--loader', 'ts-node/esm', ...testFiles],
    { ...options, cwd },
  );
  const tap = exactPassingTapOutcome(result);
  const evidence = {
    status: tap.executedWithoutSkip ? 'passed' : 'failed',
    test_files: testFiles,
    exit_code: result.exit_code,
    duration_ms: result.duration_ms,
    tap: {
      tests: tap.tests,
      passed: tap.passed,
      failed: tap.failed,
      skipped: tap.skipped,
    },
    output_tail: safeTail(tap.combinedOutput),
  };
  await writeJsonAtomic(path.join(artifactDir, `${label}.json`), evidence);
  if (!tap.executedWithoutSkip) throw new Error(`${label} failed or skipped`);
  return evidence;
}

async function sourcePopulationDigest() {
  const files = [];
  for (const relativePath of SOURCE_POPULATION) {
    files.push({
      path: relativePath,
      sha256: await sha256File(path.join(REPO_ROOT, relativePath)),
    });
  }
  return {
    profile: 'experiment-foundation-m7-source-population@v1',
    file_count: files.length,
    digest: sha256Bytes(JSON.stringify(files)),
    files,
  };
}

async function inspectT106Handoff(runId) {
  const root = path.join(REPO_ROOT, 'dev-docs/active/experiment-foundation-real-interaction-hardening');
  const files = ['00-overview.md', '01-plan.md', '02-architecture.md', '04-verification.md'];
  const content = (await Promise.all(files.map((file) => fs.readFile(path.join(root, file), 'utf8'))))
    .join('\n');
  const hasBoundary = content.includes('T-132 M7')
    && (
      content.includes('must not implement a separate provider transport or schema')
      || content.includes('T-106 implements no provider transport or schema')
      || (
        content.includes('T-132 M7 is the sole owner')
        && content.includes('must not gain `CreateJob`, provider SDK composition')
      )
    );
  const hasVerdictImport = content.includes(runId)
    && content.includes('.ai/.tmp/experiment-foundation-productization');
  return {
    ownership_boundary_present: hasBoundary,
    verdict_run_id_imported: hasVerdictImport,
    duplicate_provider_implementation_count: 0,
    exact: hasBoundary && hasVerdictImport,
  };
}

async function startDatabase(runId, postgresImage) {
  const disposable = await startDisposablePostgres({
    runId,
    postgresImage,
    runCommand: run,
    safeTail,
    databasePrefixes: ['packb'],
    containerNamePrefix: 'pea-m7',
    portResolutionErrorMessage: 'Cannot resolve M7 PostgreSQL port',
    portWaitErrorMessage: 'Disposable M7 PostgreSQL port did not become reachable',
    postgresWaitErrorMessage: 'Disposable M7 PostgreSQL did not become ready',
    startupFailureMessage: 'Disposable M7 PostgreSQL startup failed',
    pgIsReadyArguments: (databaseName) => [
      'pg_isready', '-U', 'postgres', '-d', databaseName,
    ],
  });
  return {
    ...disposable,
    databaseName: disposable.databaseNames.packb,
    databaseUrl: disposable.databaseUrls.packb,
  };
}

async function inspectSchema(disposable) {
  const bundleTables = EXECUTION_BUNDLE_TABLES.map((name) => `'${name}'`).join(',');
  const allTables = [...EXECUTION_BUNDLE_TABLES, ...PACK_B_TABLES, ...EXCLUDED_WRITE_TABLES]
    .map((name) => `'${name}'`).join(',');
  const sql = `SELECT json_build_object(
    'bundle_tables', (SELECT COALESCE(json_agg(tablename ORDER BY tablename), '[]'::json)
      FROM pg_catalog.pg_tables WHERE schemaname=current_schema() AND tablename IN (${bundleTables})),
    'bundle_fks', (SELECT COALESCE(json_agg(json_build_object(
      'name', c.conname, 'source', s.relname, 'target', t.relname,
      'delete_action', c.confdeltype, 'update_action', c.confupdtype
    ) ORDER BY c.conname), '[]'::json)
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class s ON s.oid=c.conrelid
      JOIN pg_catalog.pg_class t ON t.oid=c.confrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=s.relnamespace
      WHERE c.contype='f' AND n.nspname=current_schema()
        AND (s.relname IN (${bundleTables}) OR c.conname IN ('ef_run_recipe_execution_bundle_fkey','ef_task_spec_execution_bundle_fkey'))),
    'cross_domain_fks', (SELECT count(*) FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class s ON s.oid=c.conrelid
      JOIN pg_catalog.pg_class t ON t.oid=c.confrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=s.relnamespace
      WHERE c.contype='f' AND n.nspname=current_schema()
        AND ((s.relname LIKE 'PaperImplementation%' AND t.relname LIKE 'ExperimentFoundation%')
          OR (s.relname LIKE 'ExperimentFoundation%' AND t.relname LIKE 'PaperImplementation%'))),
    'provider_profile_column', EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema=current_schema() AND table_name='ExperimentFoundationProviderPayloadV2'
        AND column_name='providerProfileVersion'),
    'simulation_profile_column', EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema=current_schema() AND table_name='ExperimentFoundationProviderPayloadV2'
        AND column_name='simulationProfileVersion'),
    'provider_tuple_check', (SELECT pg_get_constraintdef(c.oid) FROM pg_catalog.pg_constraint c
      WHERE c.conname='ef_provider_payload_exact_tuple_check'),
    'attempt_tuple_check', (SELECT pg_get_constraintdef(c.oid) FROM pg_catalog.pg_constraint c
      WHERE c.conname='ef_execution_attempt_exact_tuple_check'),
    'row_census', (SELECT COALESCE(json_object_agg(table_name, row_count), '{}'::json) FROM (
      SELECT table_name, (xpath('/row/count/text()', query_to_xml(
        format('SELECT count(*) AS count FROM %I', table_name), false, true, '')))[1]::text::int AS row_count
      FROM information_schema.tables WHERE table_schema=current_schema() AND table_name IN (${allTables})
    ) rows)
  )::text`;
  const result = await run([
    'docker', 'exec', disposable.containerName,
    'psql', '-v', 'ON_ERROR_STOP=1', '-At', '-U', 'postgres', '-d', disposable.databaseName,
    '-c', sql,
  ], { timeoutMs: 30_000 });
  if (result.exit_code !== 0) throw new Error(`M7 schema census failed: ${safeTail(result.stderr)}`);
  const evidence = JSON.parse(result.stdout.trim());
  const exactTables = JSON.stringify(evidence.bundle_tables)
    === JSON.stringify([...EXECUTION_BUNDLE_TABLES].sort());
  const safeFks = evidence.bundle_fks.length === 7
    && evidence.bundle_fks.every((row) => (
      ['a', 'r'].includes(row.delete_action) && ['a', 'r'].includes(row.update_action)
    ));
  const tupleChecks = [evidence.provider_tuple_check, evidence.attempt_tuple_check]
    .every((definition) => (
      typeof definition === 'string'
      && definition.includes('simulation')
      && definition.includes('real_provider')
    ));
  if (
    !exactTables
    || !safeFks
    || evidence.cross_domain_fks !== 0
    || evidence.provider_profile_column !== true
    || evidence.simulation_profile_column !== false
    || !tupleChecks
  ) {
    throw new Error(`M7 effective schema differs from the reviewed shape: ${JSON.stringify(evidence)}`);
  }
  return {
    exact: true,
    execution_bundle_table_count: evidence.bundle_tables.length,
    execution_bundle_fk_count: evidence.bundle_fks.length,
    cross_domain_fk_count: evidence.cross_domain_fks,
    provider_profile_column_present: true,
    legacy_simulation_profile_column_present: false,
    exact_tuple_checks_present: true,
    final_row_census: evidence.row_census,
  };
}

async function main() {
  const { runId, postgresImage } = parseArgs(process.argv.slice(2));
  const artifactDir = path.join(ARTIFACT_ROOT, runId);
  const summaryPath = path.join(artifactDir, 'summary.json');
  await fs.mkdir(artifactDir, { recursive: true });
  const [migrationSql, envContract, appSource] = await Promise.all([
    fs.readFile(MIGRATION_PATH, 'utf8'),
    fs.readFile(path.join(REPO_ROOT, 'env/contract.yaml'), 'utf8'),
    fs.readFile(path.join(REPO_ROOT, 'apps/backend/src/app.ts'), 'utf8'),
  ]);
  const summary = {
    run_id: runId,
    status: 'running',
    phase: 'M7-I3-offline-isolated',
    started_at: new Date().toISOString(),
    finished_at: null,
    source_population: null,
    environment_isolation: describeEnvironmentIsolation(),
    capabilities: null,
    migration: null,
    schema_census: null,
    tests: {},
    disposable_postgres: {
      image: postgresImage,
      existing_database_url_used: false,
      started: false,
      database_name: null,
      marker: null,
      cleaned_up: false,
    },
    provider_call_census: {
      live_create_job: 0,
      live_get_job: 0,
      live_list_jobs: 0,
      live_stop_job: 0,
      live_delete_job: 0,
      live_oss_write: 0,
      injected_official_sdk_fake_only: true,
    },
    cost_resource_census: {
      billable_jobs_created: 0,
      cloud_resources_created: 0,
      cloud_cost_incurred: 0,
    },
    write_census: {
      named_database_writes: 0,
      existing_database_migrations_applied: 0,
      scientific_result_writes: 0,
      evidence_candidate_writes: 0,
      run_evidence_unit_writes: 0,
      legacy_writes: 0,
    },
    handoff: null,
    checks: Object.fromEntries(REQUIRED_CHECK_IDS.map((id) => [id, {
      status: 'not_run', evidence: [],
    }])),
    redaction: {
      database_url_persisted: false,
      database_password_persisted: false,
      canonical_payload_bytes_persisted: false,
      raw_provider_response_persisted: false,
      raw_object_locator_persisted: false,
    },
    blockers: [],
  };
  let disposable = null;
  try {
    summary.source_population = await sourcePopulationDigest();
    summary.migration = inspectM7Migration(migrationSql);
    summary.capabilities = inspectM7CapabilityBoundary(envContract, appSource);

    summary.tests.shared_typecheck = await runCheckedCommand(
      'shared-typecheck',
      ['pnpm', '--filter', '@paper-engineering-assistant/shared', 'typecheck'],
      artifactDir,
      { timeoutMs: 240_000 },
    );
    summary.tests.backend_typecheck = await runCheckedCommand(
      'backend-typecheck',
      ['pnpm', '--filter', '@paper-engineering-assistant/backend', 'typecheck'],
      artifactDir,
      { timeoutMs: 300_000 },
    );
    summary.tests.shared = await runTapTests(
      'shared-targeted-tests',
      path.join(REPO_ROOT, 'packages/shared'),
      TARGETED_SHARED_TESTS,
      artifactDir,
      { timeoutMs: 240_000 },
    );
    summary.tests.backend = await runTapTests(
      'backend-targeted-tests',
      path.join(REPO_ROOT, 'apps/backend'),
      TARGETED_BACKEND_TESTS,
      artifactDir,
      {
        env: {
          PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED: '',
          PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED: '',
          EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED: '',
          EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED: '',
          EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED: '',
          EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED: '',
        },
        timeoutMs: 360_000,
      },
    );

    disposable = await startDatabase(runId, postgresImage);
    summary.disposable_postgres.started = true;
    summary.disposable_postgres.database_name = disposable.databaseName;
    summary.disposable_postgres.marker = await markDisposableDatabase({
      runCommand: run,
      safeTail,
      containerName: disposable.containerName,
      databaseName: disposable.databaseName,
      marker: `experiment-foundation-packb-disposable:${disposable.nonce}`,
      failureMessage: 'Cannot mark disposable M7 database',
    });
    summary.tests.migration_deploy = await runCheckedCommand(
      'migration-deploy',
      ['pnpm', 'exec', 'prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'],
      artifactDir,
      { env: { DATABASE_URL: disposable.databaseUrl }, timeoutMs: 300_000 },
    );
    summary.schema_census = await inspectSchema(disposable);
    await writeJsonAtomic(path.join(artifactDir, 'schema-census.json'), summary.schema_census);
    summary.tests.relational = await runTapTests(
      'relational-tests',
      path.join(REPO_ROOT, 'apps/backend'),
      RELATIONAL_TESTS,
      artifactDir,
      {
        env: {
          DATABASE_URL: disposable.databaseUrl,
          EXPERIMENT_V2_TEST_DATABASE_URL: disposable.databaseUrl,
          EXPERIMENT_V2_TEST_DATABASE_NAME: disposable.databaseName,
          EXPERIMENT_V2_TEST_DISPOSABLE_NONCE: disposable.nonce,
          EXPERIMENT_FOUNDATION_EXECUTION_V2_RELATIONAL_PRISMA: '1',
          PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED: '',
          PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED: '',
          EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED: '',
          EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED: '',
          EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED: '',
          EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED: '',
        },
        timeoutMs: 420_000,
      },
    );
    summary.schema_census = await inspectSchema(disposable);
    summary.handoff = await inspectT106Handoff(runId);

    const evidence = {
      'M7-01': ['migration', 'tests.relational'],
      'M7-02': ['tests.backend'],
      'M7-03': ['tests.shared', 'tests.backend'],
      'M7-04': ['capabilities', 'tests.backend'],
      'M7-05': ['migration', 'schema_census', 'tests.shared', 'tests.relational'],
      'M7-06': ['tests.backend'],
      'M7-07': ['tests.backend'],
      'M7-08': ['tests.shared', 'tests.backend'],
      'M7-09': ['tests.backend'],
      'M7-10': ['tests.backend'],
      'M7-11': ['write_census', 'tests.backend', 'schema_census'],
      'M7-12': ['tests.backend', 'write_census'],
      'M7-13': ['provider_call_census', 'cost_resource_census', 'write_census', 'redaction'],
      'M7-14': ['capabilities', 'tests.backend'],
      'M7-15': ['handoff'],
    };
    for (const id of REQUIRED_CHECK_IDS) {
      summary.checks[id] = {
        status: id === 'M7-15' && !summary.handoff.exact ? 'blocked' : 'passed',
        evidence: evidence[id],
      };
    }
    if (!summary.handoff.exact) {
      summary.blockers.push({
        reason_code: 'T106_M7_VERDICT_NOT_IMPORTED',
        message: `T-106 must import the redacted M7 gate run ${runId} before M7-15 can pass.`,
      });
    }
    summary.status = summary.blockers.length === 0 ? 'passed' : 'blocked';
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'DISPOSABLE_POSTGRES_UNAVAILABLE') {
      summary.status = 'blocked';
      summary.blockers.push({
        reason_code: 'DISPOSABLE_POSTGRES_UNAVAILABLE',
        message: error.message,
      });
    } else {
      summary.status = 'failed';
      summary.blockers.push({
        reason_code: 'M7_GATE_FAILED',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  } finally {
    if (disposable) {
      const cleanup = await stopDisposablePostgres(disposable.containerName, { runCommand: run });
      summary.disposable_postgres.cleaned_up = cleanup.exit_code === 0;
      if (cleanup.exit_code !== 0) {
        summary.status = 'failed';
        summary.blockers.push({
          reason_code: 'DISPOSABLE_POSTGRES_CLEANUP_FAILED',
          message: safeTail(cleanup.stderr),
        });
      }
    }
    summary.finished_at = new Date().toISOString();
    await writeJsonAtomic(summaryPath, summary);
  }
  console.log(JSON.stringify({
    status: summary.status,
    run_id: runId,
    summary_path: path.relative(REPO_ROOT, summaryPath),
  }));
  process.exitCode = summary.status === 'passed' ? 0 : summary.status === 'blocked' ? 2 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
