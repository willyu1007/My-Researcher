import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertExperimentFoundationNamedLocalScientificPersistenceReady,
} from './experiment-foundation-named-local-evidence.js';

const MIGRATION = '20260808090000_add_scientific_source_and_packet_closure_binding';
const CONSTRAINTS = [
  'ef_experiment_result_source_contract_check',
  'ef_provisional_output_contract_check',
  'pirip_scientific_v2_contract_check',
];

test('P5 paid readiness requires the exact scientific persistence migration and constraints', async () => {
  const ready = await assertExperimentFoundationNamedLocalScientificPersistenceReady(
    readinessClient([MIGRATION], CONSTRAINTS),
    'SCHEMA_NOT_READY',
  );
  assert.deepEqual(ready, {
    migration: MIGRATION,
    constraints: CONSTRAINTS,
  });

  await assert.rejects(
    assertExperimentFoundationNamedLocalScientificPersistenceReady(
      readinessClient([], CONSTRAINTS),
      'SCHEMA_NOT_READY',
    ),
    /SCHEMA_NOT_READY/u,
  );
  await assert.rejects(
    assertExperimentFoundationNamedLocalScientificPersistenceReady(
      readinessClient([MIGRATION], [
        ...CONSTRAINTS,
        'ef_provisional_output_class_check',
      ]),
      'SCHEMA_NOT_READY',
    ),
    /SCHEMA_NOT_READY/u,
  );
});

function readinessClient(migrations: string[], constraints: string[]) {
  return {
    $queryRawUnsafe: async (query: string) => (
      query.includes('_prisma_migrations')
        ? migrations.map((migration_name) => ({ migration_name }))
        : constraints.map((constraint_name) => ({ constraint_name }))
    ),
  } as unknown as Parameters<
    typeof assertExperimentFoundationNamedLocalScientificPersistenceReady
  >[0];
}
