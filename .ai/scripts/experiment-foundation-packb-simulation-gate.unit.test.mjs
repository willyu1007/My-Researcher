import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  DEFAULT_POSTGRES_IMAGE,
  buildSafeChildEnv,
  describeEnvironmentIsolation,
  exactPassingTapOutcome,
  executePackBDatabasePhases,
  inspectCapabilityBoundary,
  inspectCheckedInFakeLane,
  inspectFakeLaneImports,
  inspectEffectivePackBSchema,
  inspectPB14ScenarioEvidence,
  inspectPackBCleanupMigration,
  inspectPackBMigration,
  isDirectRun,
  parseArgs,
} from './experiment-foundation-packb-simulation-gate.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('Pack B gate accepts only safe run ids and image references', () => {
  assert.deepEqual(parseArgs(['--run-id', 'packb-20260713']), {
    runId: 'packb-20260713',
    postgresImage: DEFAULT_POSTGRES_IMAGE,
  });
  assert.throws(() => parseArgs([]), /--run-id is required/);
  assert.throws(() => parseArgs(['--run-id', '../escape']), /safe filename/);
  assert.throws(
    () => parseArgs(['--run-id', 'safe', '--postgres-image', 'pgvector/pgvector:0.8.0-pg16']),
    /digest-pinned/,
  );
  assert.throws(
    () => parseArgs([
      '--run-id', 'safe', '--postgres-image',
      `other/postgres@sha256:${'a'.repeat(64)}`,
    ]),
    /pgvector\/pgvector/,
  );
  assert.throws(
    () => parseArgs([
      '--run-id', 'safe', '--postgres-image',
      `pgvector/pgvector@sha256:${'b'.repeat(64)}`,
    ]),
    /reviewed digest-pinned/,
  );
});

test('Pack B migration census is exactly six EF families with same-domain restrict FKs', async () => {
  const migration = await fs.readFile(path.join(
    REPO_ROOT,
    'prisma/migrations/20260713210000_add_experiment_foundation_pack_b_provider_control_v2/migration.sql',
  ), 'utf8');
  const census = inspectPackBMigration(migration);
  assert.deepEqual(census.created_tables, [
    'ExperimentFoundationCollectionAttemptV2',
    'ExperimentFoundationExecutionAttemptEventV2',
    'ExperimentFoundationExecutionAttemptV2',
    'ExperimentFoundationProviderCommandV2',
    'ExperimentFoundationProviderPayloadV2',
    'ExperimentFoundationProvisionalOutputV2',
  ]);
  assert.equal(census.created_table_count, 6);
  assert.equal(census.statement_count, 58);
  assert.equal(census.created_index_count, 40);
  assert.equal(census.created_unique_index_count, 30);
  assert.equal(census.alter_table_statement_count, 12);
  assert.equal(census.same_domain_fk_count, 15);
  assert.equal(census.cross_domain_fk_count, 0);
  assert.equal(census.legacy_alter_count, 0);
  assert.equal(census.excluded_family_count, 0);
  assert.equal(census.unsafe_delete_action_count, 0);
  assert.equal(census.historical_update_cascade_count, 15);
});

test('Pack B migration inspector fails closed for every unreviewed statement family', async () => {
  const reviewed = await fs.readFile(path.join(
    REPO_ROOT,
    'prisma/migrations/20260713210000_add_experiment_foundation_pack_b_provider_control_v2/migration.sql',
  ), 'utf8');
  assert.throws(
    () => inspectPackBMigration(`${reviewed}\nTRUNCATE "ExperimentFoundationProviderPayloadV2";`),
    /unapproved SQL statement|destructive/,
  );
  assert.throws(
    () => inspectPackBMigration(reviewed.replace(
      'REFERENCES "ExperimentFoundationRunV2"',
      'REFERENCES "paperimplementationProject"',
    )),
    /cross-domain PI foreign key/,
  );
  assert.throws(
    () => inspectPackBMigration(
      `${reviewed}\nCREATE INDEX "bad" ON "ExperimentFoundationRecord"("id");`,
    ),
    /index outside/,
  );
  assert.throws(
    () => inspectPackBMigration(`${reviewed}\nALTER TYPE "LegacyStatus" ADD VALUE 'x';`),
    /unapproved SQL statement|destructive/,
  );
  assert.throws(
    () => inspectPackBMigration(reviewed.replace('ON DELETE RESTRICT', 'ON DELETE CASCADE')),
    /unreviewed delete\/update referential action/,
  );
  assert.throws(
    () => inspectPackBMigration(reviewed.replace('ON UPDATE CASCADE', 'ON UPDATE SET NULL')),
    /unreviewed delete\/update referential action/,
  );
  assert.throws(
    () => inspectPackBMigration(`${reviewed}\n-- byte drift\n`),
    /digest differs/,
  );
});

test('Pack B cleanup migration preserves the PB14 Cycle fence index and rejects drift', async () => {
  const cleanup = await fs.readFile(path.join(
    REPO_ROOT,
    'prisma/migrations/20260714160000_harden_experiment_foundation_pack_b_v2/migration.sql',
  ), 'utf8');
  const census = inspectPackBCleanupMigration(cleanup);
  assert.equal(census.statement_count, 13);
  assert.equal(census.drop_index_count, 3);
  assert.equal(census.removed_index_names.includes('ef_execution_attempt_cycle_mode_state_idx'), false);
  assert.equal(census.alter_table_statement_count, 10);
  assert.equal(census.same_domain_fk_rewrite_count, 15);
  assert.equal(census.update_restrict_count, 15);
  assert.equal(census.cross_domain_fk_count, 0);
  assert.throws(
    () => inspectPackBCleanupMigration(cleanup.replace('ON UPDATE RESTRICT', 'ON UPDATE CASCADE')),
    /statement\/action census/,
  );
  assert.throws(
    () => inspectPackBCleanupMigration(`${cleanup}\nTRUNCATE "ExperimentFoundationProviderCommandV2";`),
    /unapproved statement/,
  );
  assert.throws(
    () => inspectPackBCleanupMigration(cleanup.replace(
      'ExperimentFoundationRunV2',
      'paperimplementationRunV2',
    )),
    /statement\/action census/,
  );
  assert.throws(
    () => inspectPackBCleanupMigration(`${cleanup}\n-- drift\n`),
    /digest differs/,
  );
  assert.throws(
    () => inspectPackBCleanupMigration(
      `DROP INDEX "ef_execution_attempt_cycle_mode_state_idx";\n${cleanup}`,
    ),
    /DROP INDEX population differs/,
  );
});

test('effective schema census requires 15 restrictive FKs, 38 indexes and the PB14 fence index', () => {
  const foreignKeys = [
    'ef_provider_payload_run_fkey',
    'ef_provider_payload_run_cell_fkey',
    'ef_provider_payload_task_spec_fkey',
    'ef_execution_attempt_run_fkey',
    'ef_execution_attempt_run_cell_fkey',
    'ef_execution_attempt_task_spec_fkey',
    'ef_execution_attempt_payload_fkey',
    'ef_execution_attempt_head_ack_fkey',
    'ef_collection_attempt_attempt_fkey',
    'ef_collection_attempt_payload_fkey',
    'ef_provider_command_attempt_fkey',
    'ef_provider_command_collection_fkey',
    'ef_attempt_event_attempt_fkey',
    'ef_attempt_event_command_fkey',
    'ef_provisional_output_collection_fkey',
  ].map((constraint_name) => ({
    constraint_name,
    definition: `FOREIGN KEY fixture ${constraint_name}`,
    delete_action: 'r',
    update_action: 'r',
  }));
  const removed = [
    'ef_collection_attempt_sequence_unique',
    'ef_collection_attempt_business_unique',
    'ef_collection_attempt_state_idx',
  ];
  const evidence = {
    foreign_keys: foreignKeys,
    indexes: [
      {
        index_name: 'ef_execution_attempt_cycle_mode_state_idx',
        definition: 'CREATE INDEX ef_execution_attempt_cycle_mode_state_idx ON public."Fixture" USING btree (cycle, mode, state)',
      },
      ...Array.from({ length: 37 }, (_, index) => ({
        index_name: `kept_${index}`,
        definition: `CREATE INDEX kept_${index} ON public."Fixture" USING btree (id)`,
      })),
    ],
    collection_sequence_column_present: false,
    checks: [
      { constraint_name: 'ef_collection_attempt_state_check', definition: "CHECK state IN ('prepared','collected','failed')" },
      { constraint_name: 'ef_attempt_event_type_check', definition: "CHECK type IN ('created','collection_failed')" },
      { constraint_name: 'ef_execution_attempt_terminal_reason_check', definition: "CHECK reason IN ('simulation_failed')" },
      ...Array.from({ length: 28 }, (_, index) => ({
        constraint_name: `reviewed_pack_b_check_${String(index).padStart(2, '0')}`,
        definition: `CHECK fixture_${index} IS NOT NULL`,
      })),
    ],
  };
  const expectedDigests = fixtureDefinitionDigests(evidence);
  assert.equal(inspectEffectivePackBSchema(evidence, removed, expectedDigests).exact, true);
  assert.throws(
    () => inspectEffectivePackBSchema({
      ...evidence,
      foreign_keys: foreignKeys.map((row, index) => (
        index === 0 ? { ...row, update_action: 'c' } : row
      )),
    }, removed, expectedDigests),
    /effective schema hardening census failed/,
  );
  assert.throws(
    () => inspectEffectivePackBSchema({
      ...evidence,
      indexes: evidence.indexes.map((row, index) => (
        index === 0
          ? { index_name: 'same_count_unreviewed_substitute', definition: row.definition }
          : row
      )),
    }, removed, expectedDigests),
    /effective schema hardening census failed/,
  );
  assert.throws(
    () => inspectEffectivePackBSchema({
      ...evidence,
      indexes: [
        ...evidence.indexes.slice(1),
        { index_name: removed[0], definition: 'CREATE INDEX drift' },
      ],
    }, removed, expectedDigests),
    /effective schema hardening census failed/,
  );
  assert.throws(
    () => inspectEffectivePackBSchema({
      ...evidence,
      checks: evidence.checks.map((row) => (
        row.constraint_name === 'ef_collection_attempt_state_check'
          ? { ...row, definition: `${row.definition} OR 'collecting'` }
          : row
      )),
    }, removed, expectedDigests),
    /effective schema hardening census failed/,
  );
  assert.throws(
    () => inspectEffectivePackBSchema({
      ...evidence,
      checks: evidence.checks.slice(1),
    }, removed, expectedDigests),
    /effective schema hardening census failed/,
  );
});

function fixtureDefinitionDigests(evidence) {
  const digest = (rows) => crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
  return {
    foreign_keys: digest(evidence.foreign_keys.map((row) => ({
      constraint_name: row.constraint_name,
      definition: row.definition,
    })).sort((left, right) => compare(left.constraint_name, right.constraint_name))),
    checks: digest(evidence.checks.map((row) => ({
      constraint_name: row.constraint_name,
      definition: row.definition,
    })).sort((left, right) => compare(left.constraint_name, right.constraint_name))),
    indexes: digest(evidence.indexes.map((row) => ({
      index_name: row.index_name,
      definition: row.definition.replace(/ ON (?:public|"[^"]+")\./, ' ON <schema>.'),
    })).sort((left, right) => compare(left.index_name, right.index_name))),
  };
}

test('PB14 meta-gate rejects a Run-scoped fence or any real-provider writer claim', () => {
  const evidence = {
    pack_a_prerequisite: {
      implementation_project_id: 'project-1',
      validation_cycle_id: 'cycle-1',
    },
    cycle_active_real_attempt_fence: {
      repository_query_invoked: true,
      query_scope: {
        implementation_project_id: 'project-1',
        validation_cycle_id: 'cycle-1',
        execution_mode: 'real_provider',
        lifecycle_states: ['prepared', 'submitted', 'running'],
        run_filter: null,
        head_filter: null,
      },
      active_real_attempt_count: 0,
      active_real_attempt_refs: [],
      pack_b_writer_execution_modes: ['simulation'],
      attempt_persistence_execution_mode: 'simulation',
      attempt_persistence_provenance: 'non_production_fake_provider',
    },
  };
  assert.equal(inspectPB14ScenarioEvidence(evidence).exact, true);
  for (const drift of [
    { query_scope: { ...evidence.cycle_active_real_attempt_fence.query_scope, run_filter: 'run-1' } },
    { active_real_attempt_count: 1, active_real_attempt_refs: [{ execution_attempt_id: 'x' }] },
    { pack_b_writer_execution_modes: ['simulation', 'real_provider'] },
    { attempt_persistence_execution_mode: 'real_provider' },
    { repository_query_invoked: false },
  ]) {
    assert.throws(() => inspectPB14ScenarioEvidence({
      ...evidence,
      cycle_active_real_attempt_fence: {
        ...evidence.cycle_active_real_attempt_fence,
        ...drift,
      },
    }), /PB14 Cycle-wide active-real fence evidence/);
  }
});

test('fake lane import boundary rejects network, child process, SDK and credential imports', () => {
  assert.equal(inspectFakeLaneImports({
    'fake.ts': "import { createHash } from 'node:crypto';",
  }).violation_count, 0);
  for (const source of [
    "import http from 'node:http';",
    "import { spawn } from 'node:child_process';",
    "import client from '@alicloud/pop-core';",
    "import axios from 'axios';",
    "import { request } from 'undici';",
    "const credentials = await import('./credentials.js');",
    "fetch('https://provider.invalid');",
  ]) {
    assert.throws(
      () => inspectFakeLaneImports({ 'fake.ts': source }),
      /import boundary violated|local import was not loaded/,
    );
  }
  assert.throws(() => inspectFakeLaneImports({
    'entry.ts': "import './nested.js';",
    'nested.ts': "import tls from 'node:tls';",
  }, { entryPaths: ['entry.ts'] }), /import boundary violated/);
  const closure = inspectFakeLaneImports({
    'entry.ts': "import './nested.js';",
    'nested.ts': "import { createHash } from 'node:crypto';",
    'unreachable.ts': "import http from 'node:http';",
  }, { entryPaths: ['entry.ts'] });
  assert.equal(closure.inspected_file_count, 2);
  assert.equal(closure.transitive_closure_complete, true);
});

test('checked-in fake lane transitive import closure has no network/provider/credential edge', async () => {
  const evidence = await inspectCheckedInFakeLane();
  assert.ok(evidence.inspected_file_count > 4);
  assert.equal(evidence.transitive_closure_complete, true);
  assert.equal(evidence.violation_count, 0);
});

test('child environment uses an explicit allowlist and strips DB/provider/cloud secrets', () => {
  const host = {
    PATH: '/safe/bin',
    HOME: '/safe/home',
    DATABASE_URL: 'postgresql://should-not-leak',
    EXPERIMENT_FOUNDATION_REPOSITORY: 'prisma',
    ALIYUN_ACCESS_KEY_SECRET: 'should-not-leak',
    CLOUD_TOKEN: 'should-not-leak',
  };
  assert.deepEqual(buildSafeChildEnv({}, host), {
    HOME: '/safe/home',
    PATH: '/safe/bin',
  });
  assert.deepEqual(buildSafeChildEnv({ DATABASE_URL: 'disposable' }, host), {
    HOME: '/safe/home',
    PATH: '/safe/bin',
    DATABASE_URL: 'disposable',
  });
  assert.deepEqual(describeEnvironmentIsolation(host), {
    policy: 'explicit_allowlist@v1',
    inherited_key_allowlist: [
      'CI', 'HOME', 'LANG', 'LC_ALL', 'PATH', 'PNPM_HOME', 'TEMP', 'TERM', 'TMP', 'TMPDIR',
    ],
    host_sensitive_key_count: 4,
    stripped_sensitive_key_count: 4,
    exposed_sensitive_keys: [],
    existing_database_url_present_but_ignored: true,
  });
});

test('Pack B capability is default-off and composed through a strict parser', async () => {
  const [envContract, appSource] = await Promise.all([
    fs.readFile(path.join(REPO_ROOT, 'env/contract.yaml'), 'utf8'),
    fs.readFile(path.join(REPO_ROOT, 'apps/backend/src/app.ts'), 'utf8'),
  ]);
  assert.deepEqual(inspectCapabilityBoundary(envContract, appSource), {
    key: 'EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED',
    type: 'bool',
    required: false,
    default: false,
    strict_true_false_parser: true,
    cutover_precondition: true,
  });
});

test('Pack B gate direct-run detection does not execute on import', () => {
  const gatePath = path.join(
    REPO_ROOT,
    '.ai/scripts/experiment-foundation-packb-simulation-gate.mjs',
  );
  assert.equal(isDirectRun(pathToFileURL(gatePath).href, gatePath), true);
  assert.equal(isDirectRun(pathToFileURL(gatePath).href, '/tmp/not-the-gate.mjs'), false);
});

test('Pack B gate delegates disposable PostgreSQL plumbing to the shared helper', async () => {
  const source = await fs.readFile(path.join(
    REPO_ROOT,
    '.ai/scripts/experiment-foundation-packb-simulation-gate.mjs',
  ), 'utf8');
  assert.match(source, /from '\.\/lib\/disposable-postgres\.mjs'/);
  assert.match(source, /startSharedDisposablePostgres/);
  assert.match(source, /markSharedDisposableDatabase/);
  assert.match(source, /resetDisposablePostgresPublicSchema/);
  assert.match(source, /stopDisposablePostgres/);
  assert.doesNotMatch(source, /from 'node:child_process'/);
  assert.doesNotMatch(source, /from 'node:net'/);
  assert.doesNotMatch(source, /DROP SCHEMA public CASCADE/);
});

test('Pack B database phases execute relational verification before scenario', async () => {
  const calls = [];
  const result = await executePackBDatabasePhases({
    createDatabase: async () => calls.push('create'),
    markDatabase: async () => {
      calls.push('mark');
      return { marker_written: true };
    },
    deployMigration: async () => calls.push('migrate'),
    inspectEffectiveSchema: async () => {
      calls.push('schema');
      return { exact: true };
    },
    runRelationalTests: async () => {
      calls.push('relational');
      return { status: 'passed' };
    },
    runScenario: async () => {
      calls.push('scenario');
      return { exit_code: 0 };
    },
  });
  assert.deepEqual(calls, ['create', 'mark', 'migrate', 'schema', 'relational', 'scenario']);
  assert.deepEqual(result, {
    marker: { marker_written: true },
    effectiveSchema: { exact: true },
    relationalTests: { status: 'passed' },
    scenario: { exit_code: 0 },
  });

  const failedCalls = [];
  await assert.rejects(() => executePackBDatabasePhases({
    createDatabase: async () => failedCalls.push('create'),
    markDatabase: async () => ({}),
    deployMigration: async () => failedCalls.push('migrate'),
    inspectEffectiveSchema: async () => failedCalls.push('schema'),
    runRelationalTests: async () => {
      failedCalls.push('relational');
      return { status: 'failed' };
    },
    runScenario: async () => failedCalls.push('scenario'),
  }), /failed or were skipped/);
  assert.deepEqual(failedCalls, ['create', 'migrate', 'schema', 'relational']);
});

test('real PostgreSQL gate evidence rejects every skipped or partially passed TAP run', () => {
  const exact = exactPassingTapOutcome({
    exit_code: 0,
    stdout: '# tests 6\n# pass 6\n# fail 0\n# skipped 0\n',
    stderr: '',
  });
  assert.equal(exact.executedWithoutSkip, true);
  assert.equal(exact.tests, 6);

  for (const stdout of [
    '# tests 6\n# pass 5\n# fail 0\n# skipped 1\n',
    '# tests 6\n# pass 5\n# fail 1\n# skipped 0\n',
    '# tests 0\n# pass 0\n# fail 0\n# skipped 0\n',
    '',
  ]) {
    assert.equal(exactPassingTapOutcome({
      exit_code: 0,
      stdout,
      stderr: '',
    }).executedWithoutSkip, false);
  }
  assert.equal(exactPassingTapOutcome({
    exit_code: 1,
    stdout: '# tests 6\n# pass 6\n# fail 0\n# skipped 0\n',
    stderr: '',
  }).executedWithoutSkip, false);
});

test('Pack B script typecheck covers only reviewed experiment producers before DB startup', async () => {
  const [config, backendPackage, rootPackage, gateSource] = await Promise.all([
    fs.readFile(path.join(
      REPO_ROOT,
      'apps/backend/tsconfig.experiment-foundation-scripts.json',
    ), 'utf8').then(JSON.parse),
    fs.readFile(path.join(REPO_ROOT, 'apps/backend/package.json'), 'utf8').then(JSON.parse),
    fs.readFile(path.join(REPO_ROOT, 'package.json'), 'utf8').then(JSON.parse),
    fs.readFile(path.join(
      REPO_ROOT,
      '.ai/scripts/experiment-foundation-packb-simulation-gate.mjs',
    ), 'utf8'),
  ]);
  assert.deepEqual(config.files, [
    'scripts/experiment-foundation-named-local-evidence.ts',
    'scripts/experiment-foundation-d19-disposable-database.ts',
    'scripts/import-experiment-foundation-d19-typed-fixture.ts',
    'scripts/run-experiment-foundation-d19-spine.ts',
    'scripts/run-experiment-foundation-cloud-preflight.ts',
    'scripts/run-experiment-foundation-packa-product-landing.ts',
    'scripts/run-experiment-foundation-packb-local-app-smoke.ts',
    'scripts/run-experiment-foundation-packb-product-landing.ts',
    'scripts/run-experiment-foundation-packb-simulation.ts',
  ]);
  assert.match(
    backendPackage.scripts['typecheck:experiment-foundation-scripts'],
    /tsconfig\.experiment-foundation-scripts\.json/,
  );
  assert.match(
    rootPackage.scripts['experiment-foundation:packb:gate:meta'],
    /^pnpm experiment-foundation:packb:scripts:typecheck/,
  );
  assert.match(
    rootPackage.scripts['experiment-foundation:packb:local-app-smoke'],
    /^pnpm experiment-foundation:packb:scripts:typecheck/,
  );
  assert.match(
    rootPackage.scripts['experiment-foundation:packb:local-app-smoke'],
    /exec -- node --env-file=\.\.\/\.\.\/\.env\.local/,
  );
  const typecheckIndex = gateSource.indexOf(
    'summary.script_typecheck = await runExperimentFoundationScriptTypecheck(artifactDir)',
  );
  const databaseStartIndex = gateSource.indexOf(
    'disposable = await startDisposablePostgres(runId, postgresImage)',
  );
  assert.ok(typecheckIndex >= 0);
  assert.ok(databaseStartIndex > typecheckIndex);
  assert.match(
    gateSource,
    /prisma-experiment-foundation-execution-v2-repository\.unit\.test\.ts/,
  );
});
