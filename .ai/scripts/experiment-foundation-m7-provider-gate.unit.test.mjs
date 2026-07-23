import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_POSTGRES_IMAGE,
  inspectM7CapabilityBoundary,
  inspectM7Migration,
  parseArgs,
} from './experiment-foundation-m7-provider-gate.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('M7 gate accepts only a safe run id and the reviewed pinned image', () => {
  assert.deepEqual(parseArgs(['--run-id', 'm7-offline-1']), {
    runId: 'm7-offline-1',
    postgresImage: DEFAULT_POSTGRES_IMAGE,
  });
  assert.throws(() => parseArgs(['--run-id', '../escape']));
  assert.throws(() => parseArgs([
    '--run-id', 'm7', '--postgres-image', 'postgres:latest',
  ]));
});

test('M7 gate freezes the reviewed migration and default-off composition boundaries', async () => {
  const [migration, envContract, appSource] = await Promise.all([
    fs.readFile(path.join(
      REPO_ROOT,
      'prisma/migrations/20260723100000_add_experiment_foundation_m7_real_provider_v2/migration.sql',
    ), 'utf8'),
    fs.readFile(path.join(REPO_ROOT, 'env/contract.yaml'), 'utf8'),
    fs.readFile(path.join(REPO_ROOT, 'apps/backend/src/app.ts'), 'utf8'),
  ]);
  const census = inspectM7Migration(migration);
  assert.equal(census.created_tables.length, 6);
  assert.equal(census.foreign_key_count, 7);
  assert.equal(census.data_mutation_statement_count, 0);
  assert.deepEqual(inspectM7CapabilityBoundary(envContract, appSource), {
    intake_default: false,
    control_drain_default: false,
    intake_requires_control_drain: true,
    live_transport_construction_in_app: false,
  });
});

test('M7 gate rejects DML, cross-domain FKs, and live transport construction', async () => {
  const migration = await fs.readFile(path.join(
    REPO_ROOT,
    'prisma/migrations/20260723100000_add_experiment_foundation_m7_real_provider_v2/migration.sql',
  ), 'utf8');
  const envContract = await fs.readFile(path.join(REPO_ROOT, 'env/contract.yaml'), 'utf8');
  const appSource = await fs.readFile(path.join(REPO_ROOT, 'apps/backend/src/app.ts'), 'utf8');
  assert.throws(() => inspectM7Migration(`${migration}\nUPDATE "Legacy" SET "x"=1;`));
  assert.throws(() => inspectM7Migration(migration.replace(
    'REFERENCES "ExperimentFoundationExecutionBundleIdentityV2"("id")',
    'REFERENCES "PaperImplementationExperimentWorkOrderRevisionV2"("id")',
  )));
  assert.throws(() => inspectM7CapabilityBoundary(
    envContract,
    `${appSource}\nnew ExperimentFoundationAliyunRealProviderTransportV2({});`,
  ));
});
