import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  ExperimentFoundationExplorationSpecV2CreateRevisionRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-exploration-spec-v2-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryExperimentFoundationExplorationSpecV2Repository } from '../repositories/in-memory-experiment-foundation-exploration-spec-v2-repository.js';
import { ExperimentFoundationExplorationSpecV2Service } from './experiment-foundation-exploration-spec-v2-service.js';

const NOW = '2026-08-02T12:00:00.000Z';
const HASH_A = `sha256:${'a'.repeat(64)}`;

test('exploration spec service is default-off', async () => {
  const service = new ExperimentFoundationExplorationSpecV2Service(
    new InMemoryExperimentFoundationExplorationSpecV2Repository(),
    { enabled: () => false },
  );
  await assert.rejects(
    service.createRevision('spec-disabled', request()),
    reason('EF_V2_EXPLORATION_SPEC_DISABLED'),
  );
});

test('exploration spec revisions create, replay and advance through exact CAS', async () => {
  const repository = new InMemoryExperimentFoundationExplorationSpecV2Repository();
  const service = new ExperimentFoundationExplorationSpecV2Service(repository, {
    enabled: () => true,
    now: () => NOW,
  });

  const created = await service.createRevision('spec-main', request());
  const replay = await service.createRevision('spec-main', request());
  const differentKeyReplay = await service.createRevision('spec-main', {
    ...request(),
    business_idempotency_key: 'spec-key-exact-replay',
  });
  const advanced = await service.createRevision('spec-main', {
    ...request(),
    expected_state_version: 1,
    business_idempotency_key: 'spec-key-revision-two',
    specification: changedSpecification(),
  });

  assert.equal(created.replayed, false);
  assert.equal(created.revision.spec_revision, 1);
  assert.equal(replay.replayed, true);
  assert.equal(replay.revision.revision_id, created.revision.revision_id);
  assert.equal(differentKeyReplay.replayed, true);
  assert.equal(differentKeyReplay.revision.revision_id, created.revision.revision_id);
  assert.equal(advanced.replayed, false);
  assert.equal(advanced.identity.state_version, 2);
  assert.equal(advanced.revision.spec_revision, 2);
  assert.notEqual(advanced.revision.content_hash, created.revision.content_hash);
  assert.deepEqual(
    await repository.findExactRevision(created.identity.spec_id, 1),
    created.revision,
  );

  await assert.rejects(
    service.createRevision('spec-main', {
      ...request(),
      business_idempotency_key: 'spec-key-revision-two',
    }),
    reason('EXPLORATION_SPEC_IDEMPOTENCY_CONFLICT'),
  );
  await assert.rejects(
    service.createRevision('spec-main', {
      ...request(),
      business_idempotency_key: 'spec-key-stale-change',
      specification: {
        ...changedSpecification(),
        proposed_branch_frame: {
          ...changedSpecification().proposed_branch_frame,
          scientific_intent: 'A third content version.',
        },
      },
    }),
    reason('EXPLORATION_SPEC_STATE_CONFLICT'),
  );
});

test('exploration spec transaction rolls back an injected crash', async () => {
  const repository = new InMemoryExperimentFoundationExplorationSpecV2Repository();
  const crashing = new ExperimentFoundationExplorationSpecV2Service(repository, {
    enabled: () => true,
    now: () => NOW,
    failpoint(point) {
      if (point === 'after-revision') throw new Error('exploration spec crash');
    },
  });
  await assert.rejects(
    crashing.createRevision('spec-crash', request()),
    /exploration spec crash/,
  );

  const recovered = await new ExperimentFoundationExplorationSpecV2Service(repository, {
    enabled: () => true,
    now: () => NOW,
  }).createRevision('spec-crash', request());
  assert.equal(recovered.replayed, false);
  assert.equal(recovered.revision.spec_revision, 1);
});

test('exploration spec service rejects duplicate semantic inputs at its own boundary', async () => {
  const service = new ExperimentFoundationExplorationSpecV2Service(
    new InMemoryExperimentFoundationExplorationSpecV2Repository(),
    { enabled: () => true },
  );
  const duplicateCells = request();
  duplicateCells.specification.exact_cells.push(
    structuredClone(duplicateCells.specification.exact_cells[0]!),
  );
  await assert.rejects(
    service.createRevision('spec-duplicate-cells', duplicateCells),
    reason('EXPLORATION_SPEC_COMMAND_INVALID'),
  );

  const duplicateParameters = request();
  duplicateParameters.specification.exact_cells[0]!.parameters.push({
    name: 'learning_rate',
    value: 0.002,
  });
  await assert.rejects(
    service.createRevision('spec-duplicate-parameters', duplicateParameters),
    reason('EXPLORATION_SPEC_COMMAND_INVALID'),
  );

  const duplicateDependencies = request();
  duplicateDependencies.specification.work_order_revision.asset_dependencies.push(
    structuredClone(duplicateDependencies.specification.work_order_revision.asset_dependencies[0]!),
  );
  await assert.rejects(
    service.createRevision('spec-duplicate-dependencies', duplicateDependencies),
    reason('EXPLORATION_SPEC_COMMAND_INVALID'),
  );
});

function request(): ExperimentFoundationExplorationSpecV2CreateRevisionRequest {
  return {
    expected_state_version: 0,
    business_idempotency_key: 'spec-key-main',
    specification: {
      schema_version: 'v1',
      proposed_branch_frame: {
        frame_schema_version: 'v1',
        display_name: 'Exploration branch',
        scientific_intent: 'Test a typed exploration hypothesis.',
        comparison_role: 'primary',
        parent_branch_key: null,
      },
      work_order_revision: {
        work_order_schema_version: 'v1',
        title: 'Exploration work order',
        objective: 'Measure the proposed effect.',
        readiness_attestation_id: 'readiness-001',
        readiness_attestation_hash: HASH_A,
        asset_dependencies: [{
          asset_type: 'DataPolicy',
          logical_id: 'policy-001',
          revision_id: 'policy-revision-001',
          revision_sequence: 1,
          content_hash: HASH_A,
        }],
        run_policy: { max_attempts_per_cell: 2, timeout_seconds: 300 },
      },
      exact_cells: [{
        cell_key: 'cell-001',
        seed: 7,
        repeat_index: 0,
        parameters: [{ name: 'learning_rate', value: 0.001 }],
        required_result_contract: { metrics: [], artifacts: [] },
      }],
    },
  };
}

function changedSpecification() {
  const specification = request().specification;
  return {
    ...specification,
    proposed_branch_frame: {
      ...specification.proposed_branch_frame,
      scientific_intent: 'Test a revised typed exploration hypothesis.',
    },
  };
}

function reason(expected: string) {
  return (error: unknown): boolean => (
    error instanceof AppError && error.details?.reason_code === expected
  );
}
