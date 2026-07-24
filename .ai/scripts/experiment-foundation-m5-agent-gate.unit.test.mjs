import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_POSTGRES_IMAGE,
  assertDurableSummaryRedaction,
  deriveM5GateStatus,
  durableCommandEvidence,
  evaluateM5Checks,
  inspectDesktopChangeScan,
  inspectForbiddenModuleImportScan,
  inspectM5TypedRequests,
  inspectMigrationDirectoryCensus,
  inspectMutationCalls,
  normalizeSummaryPaths,
  parseArgs,
} from './experiment-foundation-m5-agent-gate.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TYPED_REQUEST_PATHS = {
  lineageRoutes:
    'apps/backend/src/routes/paper-implementation-experiment-lineage-v2-routes.ts',
  agentActionRoutes:
    'apps/backend/src/routes/paper-implementation-agent-actions-v2-routes.ts',
  experimentRoutes:
    'apps/backend/src/routes/paper-implementation-experiment-v2-routes.ts',
  lineageContracts:
    'packages/shared/src/research-lifecycle/paper-implementation-experiment-lineage-v2-contracts.ts',
  closurePreparationContracts:
    'packages/shared/src/research-lifecycle/paper-implementation-closure-preparation-v2-contracts.ts',
  evidenceContracts:
    'packages/shared/src/research-lifecycle/paper-implementation-evidence-v2-contracts.ts',
  experimentRouteTests:
    'apps/backend/src/routes/paper-implementation-experiment-v2-routes.integration.test.ts',
};
const ZERO_WRITE_PATHS = [
  'apps/backend/src/repositories/paper-implementation-experiment-lineage-v2.repository.ts',
  'apps/backend/src/repositories/in-memory-paper-implementation-experiment-lineage-v2-repository.ts',
  'apps/backend/src/repositories/prisma/prisma-paper-implementation-experiment-lineage-v2-repository.ts',
  'apps/backend/src/services/paper-implementation-experiment-lineage-v2-service.ts',
  'apps/backend/src/services/paper-implementation-agent-actions-v2-service.ts',
  'apps/backend/src/controllers/paper-implementation-experiment-lineage-v2-controller.ts',
  'apps/backend/src/controllers/paper-implementation-agent-actions-v2-controller.ts',
  'apps/backend/src/routes/paper-implementation-experiment-lineage-v2-routes.ts',
  'apps/backend/src/routes/paper-implementation-agent-actions-v2-routes.ts',
];
const BACKEND_TEST_FILES = [
  'src/services/experiment-foundation-provider-command-v2-worker.unit.test.ts',
  'src/services/experiment-foundation-real-provider-command-v2-worker.unit.test.ts',
  'src/services/experiment-v2-integration-spine.unit.test.ts',
  'src/services/paper-implementation-agent-actions-v2-service.unit.test.ts',
  'src/services/paper-implementation-experiment-lineage-v2-service.unit.test.ts',
  'src/routes/paper-implementation-experiment-lineage-v2-routes.integration.test.ts',
  'src/routes/paper-implementation-agent-actions-v2-routes.integration.test.ts',
  'src/routes/paper-implementation-experiment-v2-routes.integration.test.ts',
];
const SHARED_TEST_FILES = [
  'src/research-lifecycle/paper-implementation-experiment-lineage-v2-contracts.schema.test.ts',
  'src/research-lifecycle/paper-implementation-closure-preparation-v2-contracts.schema.test.ts',
  'src/research-lifecycle/paper-implementation-evidence-v2-contracts.schema.test.ts',
];
const LINEAGE_RELATIONAL_FILES = [
  'src/repositories/prisma/prisma-paper-implementation-experiment-lineage-v2-relational.integration.test.ts',
];
const CLOSURE_RELATIONAL_FILES = [
  'src/repositories/prisma/prisma-paper-implementation-evidence-closure-v2-relational.integration.test.ts',
];

async function readSources(paths) {
  return Object.fromEntries(await Promise.all(Object.entries(paths).map(
    async ([key, relativePath]) => [
      key,
      await fs.readFile(path.join(REPO_ROOT, relativePath), 'utf8'),
    ],
  )));
}

function passingCommandEvidence() {
  return {
    status: 'passed',
    exit_code: 0,
    duration_ms: 1,
    transcript_sha256: 'a'.repeat(64),
  };
}

function passingTapEvidence(testFiles) {
  return {
    ...passingCommandEvidence(),
    test_files: testFiles,
    tap: {
      tests: testFiles.length,
      passed: testFiles.length,
      failed: 0,
      skipped: 0,
    },
  };
}

async function passingPredicateSummary() {
  const typedRequestCensus = inspectM5TypedRequests(
    await readSources(TYPED_REQUEST_PATHS),
  );
  const zeroWriteReadCensus = inspectMutationCalls(
    Object.fromEntries(await Promise.all(ZERO_WRITE_PATHS.map(
      async (relativePath) => [
        relativePath,
        await fs.readFile(path.join(REPO_ROOT, relativePath), 'utf8'),
      ],
    ))),
  );
  return {
    source_population: {
      profile: 'experiment-foundation-m5-agent-source-population@v1',
      file_count: 16,
      digest_format_valid: true,
    },
    typed_request_census: typedRequestCensus,
    zero_write_read_census: zeroWriteReadCensus,
    d24_negative_space: {
      forbidden_module_imports: {
        match_count: 0,
        matched_file_count: 0,
        exact: true,
      },
      migrations: {
        expected_directory_count: 69,
        directory_count: 69,
        invalid_directory_name_count: 0,
        exact: true,
      },
      desktop: {
        status_entry_count: 0,
        diff_file_count: 0,
        exact: true,
      },
    },
    tests: {
      forbidden_module_import_scan: {
        ...passingCommandEvidence(),
        exit_code: 1,
      },
      desktop_status_scan: passingCommandEvidence(),
      desktop_diff_scan: passingCommandEvidence(),
      shared_typecheck: passingCommandEvidence(),
      backend_typecheck: passingCommandEvidence(),
      shared_contracts: passingTapEvidence(SHARED_TEST_FILES),
      backend_targeted: passingTapEvidence(BACKEND_TEST_FILES),
      packc_pi_database_create: passingCommandEvidence(),
      d19_migration_deploy: passingCommandEvidence(),
      packc_pi_migration_deploy: passingCommandEvidence(),
      lineage_relational: passingTapEvidence(LINEAGE_RELATIONAL_FILES),
      closure_relational: passingTapEvidence(CLOSURE_RELATIONAL_FILES),
    },
    disposable_postgres: {
      started: true,
      existing_database_url_used: false,
      container_database_count: 2,
      databases: {
        d19: {
          database_name_nonce_bound: true,
          marker: { marker_written: true },
          identity_environment_complete: true,
        },
        packc_pi: {
          database_name_nonce_bound: true,
          marker: { marker_written: true },
          identity_environment_complete: true,
        },
      },
      cleaned_up: true,
    },
    redaction: {
      summary_self_check_passed: true,
    },
  };
}

test('M5 gate accepts only a safe run id and the reviewed digest-pinned image', () => {
  assert.deepEqual(parseArgs(['--run-id', 'm5-agent-1']), {
    runId: 'm5-agent-1',
    postgresImage: DEFAULT_POSTGRES_IMAGE,
  });
  assert.deepEqual(parseArgs([
    '--postgres-image',
    DEFAULT_POSTGRES_IMAGE,
    '--run-id',
    'm5.agent_2',
  ]), {
    runId: 'm5.agent_2',
    postgresImage: DEFAULT_POSTGRES_IMAGE,
  });
  assert.throws(() => parseArgs(['--run-id', '../escape']));
  assert.throws(() => parseArgs(['--run-id', 'm5', '--postgres-image', 'postgres:latest']));
  assert.throws(() => parseArgs(['--run-id', 'm5', '--unknown']));
});

test('M5 typed-request inspection measures the five params-only GETs and closure compatibility', async () => {
  const census = inspectM5TypedRequests(await readSources(TYPED_REQUEST_PATHS));
  assert.equal(census.exact, true);
  assert.equal(census.discovered_get_route_count, 5);
  assert.equal(census.params_only_route_count, 5);
  assert.equal(census.forbidden_m5_get_request_property_count, 0);
  assert.deepEqual(census.m5_get_request_schema_property_names, [
    'branch_id',
    'implementation_project_id',
    'validation_cycle_id',
  ]);
  assert.equal(census.closure_post_optional_validation_cycle_id, true);
  assert.equal(census.closure_post_mismatch_400_test_covered, true);
});

test('M5 typed-request inspection rejects a body schema on a measured GET', async () => {
  const sources = await readSources(TYPED_REQUEST_PATHS);
  sources.lineageRoutes = sources.lineageRoutes.replace(
    'params: projectParamsSchema,',
    'params: projectParamsSchema,\n        body: { type: \'object\' },',
  );
  const census = inspectM5TypedRequests(sources);
  assert.equal(census.body_schema_route_count, 1);
  assert.equal(census.params_only_route_count, 4);
  assert.equal(census.exact, false);
});

test('M5 typed-request inspection rejects hash/ref/revision/manifest request properties', async () => {
  const sources = await readSources(TYPED_REQUEST_PATHS);
  sources.lineageRoutes = sources.lineageRoutes.replace(
    'implementation_project_id: pathIdSchema,',
    [
      'implementation_project_id: pathIdSchema,',
      '    work_order_revision_id: pathIdSchema,',
      '    caller_ref: pathIdSchema,',
      '    manifest: pathIdSchema,',
      '    request_hash: pathIdSchema,',
    ].join('\n'),
  );
  const census = inspectM5TypedRequests(sources);
  assert.deepEqual(census.forbidden_m5_get_request_property_names, [
    'caller_ref',
    'manifest',
    'request_hash',
    'work_order_revision_id',
  ]);
  assert.equal(census.forbidden_m5_get_request_property_count, 4);
  assert.equal(census.exact, false);
});

test('M5 typed-request inspection fails closed if closure validation_cycle_id becomes required', async () => {
  const sources = await readSources(TYPED_REQUEST_PATHS);
  sources.evidenceContracts = sources.evidenceContracts.replace(
    "required: [\n    'expected_cycle_version',",
    "required: [\n    'validation_cycle_id',\n    'expected_cycle_version',",
  );
  const census = inspectM5TypedRequests(sources);
  assert.equal(census.closure_post_validation_cycle_id_required, true);
  assert.equal(census.closure_post_optional_validation_cycle_id, false);
  assert.equal(census.exact, false);
});

test('M5 typed-request inspection requires the mismatch-400 route regression', async () => {
  const sources = await readSources(TYPED_REQUEST_PATHS);
  sources.experimentRouteTests = sources.experimentRouteTests.replace(
    'assert.equal(mismatch.statusCode, 400',
    'assert.equal(mismatch.statusCode, 409',
  );
  const census = inspectM5TypedRequests(sources);
  assert.equal(census.closure_post_mismatch_400_test_covered, false);
  assert.equal(census.exact, false);
});

test('M5 mutation inspection proves the real read population has zero call-site mutations', async () => {
  const entries = Object.fromEntries(await Promise.all(ZERO_WRITE_PATHS.map(
    async (relativePath) => [
      relativePath,
      await fs.readFile(path.join(REPO_ROOT, relativePath), 'utf8'),
    ],
  )));
  const census = inspectMutationCalls(entries);
  assert.equal(census.scanned_file_count, 9);
  assert.equal(census.mutation_pattern_count, 8);
  assert.equal(census.mutation_call_count, 0);
  assert.deepEqual(census.mutating_files, []);
  assert.equal(census.exact, true);
});

test('M5 mutation inspection counts only executable call syntax, including tagged executeRaw', () => {
  const census = inspectMutationCalls({
    'apps/backend/src/read.ts': `
      const createdAt = row.createdAt;
      // repository.create({ comment_only: true });
      const example = "repository.update({ string_only: true })";
      repository.create(input);
      repository.createMany(input);
      repository.update(input);
      repository.updateMany(input);
      repository.upsert(input);
      repository.delete(input);
      repository.deleteMany(input);
      prisma.$executeRaw\`SELECT 1\`;
    `,
  });
  assert.equal(census.mutation_call_count, 8);
  assert.deepEqual(census.mutation_call_counts, {
    create: 1,
    createMany: 1,
    update: 1,
    updateMany: 1,
    upsert: 1,
    delete: 1,
    deleteMany: 1,
    $executeRaw: 1,
  });
  assert.deepEqual(census.mutating_files, ['apps/backend/src/read.ts']);
  assert.equal(census.exact, false);
  assert.throws(() => inspectMutationCalls({ '/Volumes/work/read.ts': 'repo.create({})' }));
});

test('M5 forbidden-module import inspection is zero-exact and retains no source transcript', () => {
  const zero = inspectForbiddenModuleImportScan('');
  assert.equal(zero.match_count, 0);
  assert.equal(zero.matched_file_count, 0);
  assert.equal(zero.exact, true);
  assert.match(zero.transcript_sha256, /^[0-9a-f]{64}$/u);

  const found = inspectForbiddenModuleImportScan([
    'apps/backend/src/a.ts:1:import { x } from "./semantic-index.js";',
    'apps/backend/src/b.ts:2:import pgvector from "pgvector";',
  ].join('\n'));
  assert.equal(found.match_count, 2);
  assert.equal(found.matched_file_count, 2);
  assert.equal(found.exact, false);
  assert.throws(() => inspectForbiddenModuleImportScan(
    '/Volumes/work/a.ts:1:import "./embedding.js";',
  ));
});

test('M5 migration census freezes exactly 69 lexically valid migration directories', () => {
  const names = Array.from({ length: 69 }, (_, index) => (
    `20260724${String(index).padStart(6, '0')}_m${index}`
  ));
  const census = inspectMigrationDirectoryCensus(names);
  assert.equal(census.expected_directory_count, 69);
  assert.equal(census.directory_count, 69);
  assert.equal(census.invalid_directory_name_count, 0);
  assert.equal(census.exact, true);
  assert.equal(inspectMigrationDirectoryCensus(names.slice(1)).exact, false);
  assert.equal(inspectMigrationDirectoryCensus([...names.slice(1), 'invalid']).exact, false);
  assert.throws(() => inspectMigrationDirectoryCensus(['nested/migration']));
});

test('M5 desktop scan combines status and HEAD diff negative space', () => {
  assert.deepEqual(inspectDesktopChangeScan('', ''), {
    status_entry_count: 0,
    diff_file_count: 0,
    status_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    diff_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    exact: true,
  });
  const changed = inspectDesktopChangeScan(
    ' M apps/desktop/src/renderer.ts\n',
    'apps/desktop/src/renderer.ts\n',
  );
  assert.equal(changed.status_entry_count, 1);
  assert.equal(changed.diff_file_count, 1);
  assert.equal(changed.exact, false);
});

test('M5 durable command evidence persists only status, exit, duration, and transcript hash', () => {
  const evidence = durableCommandEvidence({
    exit_code: 0,
    duration_ms: 12,
    stdout: 'full stdout',
    stderr: 'full stderr',
  }, 'passed');
  assert.deepEqual(Object.keys(evidence), [
    'status',
    'exit_code',
    'duration_ms',
    'transcript_sha256',
  ]);
  assert.match(evidence.transcript_sha256, /^[0-9a-f]{64}$/u);
});

test('M5 summary normalization removes repository and other absolute machine paths', () => {
  const normalized = normalizeSummaryPaths({
    source: '/Volumes/DataDisk/Project/My-Researcher/apps/backend/src/app.ts',
    temporary: '/tmp/m5/raw.txt',
  }, '/Volumes/DataDisk/Project/My-Researcher');
  assert.deepEqual(normalized, {
    source: 'apps/backend/src/app.ts',
    temporary: '[machine-path]',
  });
  assert.deepEqual(assertDurableSummaryRedaction(normalized), {
    raw_command_output_absent: true,
    absolute_machine_paths_absent: true,
    database_urls_absent: true,
    credential_fields_absent: true,
  });
});

test('M5 durable summary redaction rejects raw output, paths, database URLs, and credentials', () => {
  assert.throws(() => assertDurableSummaryRedaction({ output_tail: 'raw' }));
  assert.throws(() => assertDurableSummaryRedaction({ stdout: 'raw' }));
  assert.throws(() => assertDurableSummaryRedaction({ path: '/Users/example/repo' }));
  assert.throws(() => assertDurableSummaryRedaction({
    database: 'postgresql://postgres:secret@127.0.0.1:5432/db',
  }));
  assert.throws(() => assertDurableSummaryRedaction({ password: 'secret' }));
});

test('M5 predicates evaluate all eight checks over named concrete fields', async () => {
  const checks = evaluateM5Checks(await passingPredicateSummary());
  assert.deepEqual(Object.keys(checks), Array.from({ length: 8 }, (_, index) => (
    `M5-${String(index + 1).padStart(2, '0')}`
  )));
  assert.equal(Object.values(checks).every((check) => check.status === 'passed'), true);
  assert.equal(
    checks['M5-01'].evidence.includes(
      'typed_request_census.forbidden_m5_get_request_property_count === 0',
    ),
    true,
  );
  assert.equal(
    checks['M5-04'].evidence.includes(
      'zero_write_read_census.mutation_call_count === 0',
    ),
    true,
  );
  assert.equal(
    checks['M5-08'].evidence.includes(
      'd24_negative_space.migrations.directory_count === 69',
    ),
    true,
  );
  assert.equal(deriveM5GateStatus(checks), 'passed');
});

test('M5 predicates fail closed on skips, mutation calls, and migration drift', async () => {
  const skipped = await passingPredicateSummary();
  skipped.tests.backend_targeted.tap.skipped = 1;
  assert.equal(evaluateM5Checks(skipped)['M5-05'].status, 'failed');

  const mutating = await passingPredicateSummary();
  mutating.zero_write_read_census.mutation_call_count = 1;
  mutating.zero_write_read_census.exact = false;
  assert.equal(evaluateM5Checks(mutating)['M5-04'].status, 'failed');

  const migrated = await passingPredicateSummary();
  migrated.d24_negative_space.migrations.directory_count = 70;
  migrated.d24_negative_space.migrations.exact = false;
  assert.equal(evaluateM5Checks(migrated)['M5-08'].status, 'failed');
});

test('M5 predicates preserve blocked-vs-failed precedence', async () => {
  const blocked = await passingPredicateSummary();
  blocked.tests.lineage_relational = {
    status: 'blocked',
    reason_code: 'DISPOSABLE_POSTGRES_UNAVAILABLE',
  };
  blocked.tests.closure_relational = {
    status: 'blocked',
    reason_code: 'DISPOSABLE_POSTGRES_UNAVAILABLE',
  };
  const blockedChecks = evaluateM5Checks(blocked);
  assert.equal(blockedChecks['M5-02'].status, 'blocked');
  assert.equal(blockedChecks['M5-03'].status, 'blocked');
  assert.equal(deriveM5GateStatus(blockedChecks), 'blocked');

  blocked.tests.backend_targeted.tap.failed = 1;
  assert.equal(deriveM5GateStatus(evaluateM5Checks(blocked)), 'failed');
  assert.equal(deriveM5GateStatus({}), 'failed');
});
