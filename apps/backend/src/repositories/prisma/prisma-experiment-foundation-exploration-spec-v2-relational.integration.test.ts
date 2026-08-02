import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { Prisma } from '@prisma/client';
import type {
  ExperimentFoundationExplorationSpecV2CreateRevisionRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-exploration-spec-v2-contracts';

import { AppError } from '../../errors/app-error.js';
import { ExperimentFoundationExplorationSpecV2Service } from '../../services/experiment-foundation-exploration-spec-v2-service.js';
import { openVerifiedDisposablePostgresTestDatabase } from '../../test-support/disposable-postgres-test-database.js';
import { PrismaExperimentFoundationExplorationSpecV2Repository } from './prisma-experiment-foundation-exploration-spec-v2-repository.js';

const RUN_REAL_POSTGRES =
  process.env.EXPERIMENT_FOUNDATION_EXPLORATION_SPEC_V2_RELATIONAL_PRISMA === '1';
const SKIP_REASON =
  'set EXPERIMENT_FOUNDATION_EXPLORATION_SPEC_V2_RELATIONAL_PRISMA=1 with explicit randomized disposable database identity variables';
const HASH_A = `sha256:${'a'.repeat(64)}`;

test(
  'Prisma exploration spec UoW rolls back crashes and converges exact revisions',
  { skip: RUN_REAL_POSTGRES ? false : SKIP_REASON, timeout: 120_000 },
  async () => {
    const { prisma } = await openVerifiedDisposablePostgresTestDatabase(process.env, 'd19');
    const repository = new PrismaExperimentFoundationExplorationSpecV2Repository(prisma);
    try {
      const crashLogicalId = `exploration-crash-${randomUUID()}`;
      const crashing = new ExperimentFoundationExplorationSpecV2Service(repository, {
        enabled: () => true,
        failpoint(point) {
          if (point === 'after-revision') throw new Error('exploration relational crash');
        },
      });
      await assert.rejects(
        crashing.createRevision(crashLogicalId, request(`${crashLogicalId}-key`)),
        /exploration relational crash/,
      );
      assert.deepEqual(await counts(prisma, crashLogicalId), {
        identities: 0,
        revisions: 0,
        receipts: 0,
      });

      const service = new ExperimentFoundationExplorationSpecV2Service(repository, {
        enabled: () => true,
      });
      const recovered = await service.createRevision(
        crashLogicalId,
        request(`${crashLogicalId}-key`),
      );
      assert.equal(recovered.replayed, false);
      assert.deepEqual(await counts(prisma, crashLogicalId), {
        identities: 1,
        revisions: 1,
        receipts: 1,
      });

      const raceLogicalId = `exploration-race-${randomUUID()}`;
      const [left, right] = await Promise.all([
        service.createRevision(raceLogicalId, request(`${raceLogicalId}-left`)),
        service.createRevision(raceLogicalId, request(`${raceLogicalId}-right`)),
      ]);
      assert.equal(left.revision.revision_id, right.revision.revision_id);
      assert.deepEqual(new Set([left.replayed, right.replayed]), new Set([false, true]));
      assert.deepEqual(await counts(prisma, raceLogicalId), {
        identities: 1,
        revisions: 1,
        receipts: 2,
      });

      const revisionTwo = await service.createRevision(raceLogicalId, {
        ...request(`${raceLogicalId}-revision-two`),
        expected_state_version: 1,
        specification: changedSpecification(),
      });
      assert.equal(revisionTwo.revision.spec_revision, 2);
      assert.deepEqual(await counts(prisma, raceLogicalId), {
        identities: 1,
        revisions: 2,
        receipts: 3,
      });
      await assert.rejects(
        service.createRevision(raceLogicalId, {
          ...request(`${raceLogicalId}-stale`),
          expected_state_version: 1,
          specification: {
            ...changedSpecification(),
            proposed_branch_frame: {
              ...changedSpecification().proposed_branch_frame,
              scientific_intent: 'stale changed content',
            },
          },
        }),
        reason('EXPLORATION_SPEC_STATE_CONFLICT'),
      );

      await prisma.experimentFoundationExplorationSpecRevisionV2.update({
        where: { id: revisionTwo.revision.revision_id },
        data: {
          specJson: {
            ...changedSpecification(),
            proposed_branch_frame: {
              ...changedSpecification().proposed_branch_frame,
              scientific_intent: 'tampered durable content',
            },
          } as unknown as Prisma.InputJsonValue,
        },
      });
      await assert.rejects(
        service.createRevision(raceLogicalId, {
          ...request(`${raceLogicalId}-revision-two`),
          expected_state_version: 1,
          specification: changedSpecification(),
        }),
        reason('EXPLORATION_SPEC_REVISION_CONFLICT'),
      );
      await prisma.experimentFoundationExplorationSpecRevisionV2.update({
        where: { id: revisionTwo.revision.revision_id },
        data: {
          specJson: { schema_version: 'v1' },
        },
      });
      await assert.rejects(
        service.createRevision(raceLogicalId, {
          ...request(`${raceLogicalId}-revision-two`),
          expected_state_version: 1,
          specification: changedSpecification(),
        }),
        reason('EXPLORATION_SPEC_REVISION_CONFLICT'),
      );
    } finally {
      await prisma.$disconnect();
    }
  },
);

function request(
  businessIdempotencyKey: string,
): ExperimentFoundationExplorationSpecV2CreateRevisionRequest {
  return {
    expected_state_version: 0,
    business_idempotency_key: businessIdempotencyKey,
    specification: {
      schema_version: 'v1',
      proposed_branch_frame: {
        frame_schema_version: 'v1',
        display_name: 'Relational exploration branch',
        scientific_intent: 'Verify durable exploration authoring.',
        comparison_role: 'primary',
        parent_branch_key: null,
      },
      work_order_revision: {
        work_order_schema_version: 'v1',
        title: 'Relational exploration',
        objective: 'Verify durable behavior.',
        readiness_attestation_id: 'readiness-relational',
        readiness_attestation_hash: HASH_A,
        asset_dependencies: [{
          asset_type: 'DataPolicy',
          logical_id: 'policy-relational',
          revision_id: 'policy-relational-revision',
          revision_sequence: 1,
          content_hash: HASH_A,
        }],
        run_policy: { max_attempts_per_cell: 2, timeout_seconds: 300 },
      },
      exact_cells: [{
        cell_key: 'cell-relational',
        seed: 7,
        repeat_index: 0,
        parameters: [],
        required_result_contract: { metrics: [], artifacts: [] },
      }],
    },
  };
}

function changedSpecification() {
  const specification = request('changed').specification;
  return {
    ...specification,
    proposed_branch_frame: {
      ...specification.proposed_branch_frame,
      scientific_intent: 'Verify a second durable revision.',
    },
  };
}

async function counts(
  prisma: Awaited<ReturnType<typeof openVerifiedDisposablePostgresTestDatabase>>['prisma'],
  logicalId: string,
) {
  const identity = await prisma.experimentFoundationExplorationSpecV2.findUnique({
    where: { logicalId },
    select: { id: true },
  });
  return {
    identities: identity ? 1 : 0,
    revisions: identity
      ? await prisma.experimentFoundationExplorationSpecRevisionV2.count({
        where: { specId: identity.id },
      })
      : 0,
    receipts: await prisma.experimentFoundationExplorationSpecCommandReceiptV2.count({
      where: { logicalId },
    }),
  };
}

function reason(expected: string) {
  return (error: unknown): boolean => (
    error instanceof AppError && error.details?.reason_code === expected
  );
}
