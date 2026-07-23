import assert from 'node:assert/strict';
import test from 'node:test';

import { PrismaClient } from '@prisma/client';

import {
  ExperimentFoundationExecutionBundleV2ConstraintError,
} from '../experiment-foundation-execution-bundle-v2.repository.js';
import {
  openVerifiedDisposablePostgresTestDatabase,
} from '../../test-support/disposable-postgres-test-database.js';
import {
  ExperimentFoundationExecutionBundleV2Service,
} from '../../services/experiment-foundation-execution-bundle-v2-service.js';
import {
  createRealProviderV2TestFixture,
  REAL_PROVIDER_TEST_NOW,
} from '../../services/experiment-foundation-real-provider-v2-test-fixture.js';
import {
  PrismaExperimentFoundationExecutionBundleV2Repository,
} from './prisma-experiment-foundation-execution-bundle-v2-repository.js';

const RUN_REAL_POSTGRES = process.env.EXPERIMENT_FOUNDATION_EXECUTION_V2_RELATIONAL_PRISMA === '1';
const SKIP_REASON =
  'set EXPERIMENT_FOUNDATION_EXECUTION_V2_RELATIONAL_PRISMA=1 with explicit disposable database identity variables';

test(
  'M7 ExecutionBundle Prisma enforces draft CAS, immutable freeze replay, and exact readiness',
  {
    skip: RUN_REAL_POSTGRES ? false : SKIP_REASON,
    timeout: 90_000,
  },
  async () => {
    const { prisma } = await openVerifiedDisposablePostgresTestDatabase(process.env, 'packb');
    const fixture = createRealProviderV2TestFixture();
    const prefix = `m7-bundle-${process.env.EXPERIMENT_V2_TEST_DISPOSABLE_NONCE!.slice(0, 8)}`;
    const ids = new Map<string, number>();
    const service = new ExperimentFoundationExecutionBundleV2Service({
      repository: new PrismaExperimentFoundationExecutionBundleV2Repository(prisma),
      now: () => REAL_PROVIDER_TEST_NOW,
      idGenerator(kind) {
        const next = (ids.get(kind) ?? 0) + 1;
        ids.set(kind, next);
        return `${prefix}-${kind}-${next}`;
      },
    });

    try {
      const created = await service.putDraft({
        bundle_key: `${prefix}-key`,
        display_name: 'M7 exact executable bundle',
        expected_draft_version: null,
        draft_content: fixture.bundle.revision_content,
      });
      assert.equal(created.draft.draft_version, 1);
      assert.equal(created.replayed, false);

      const createReplay = await service.putDraft({
        bundle_key: `${prefix}-key`,
        display_name: 'M7 exact executable bundle',
        expected_draft_version: null,
        draft_content: structuredClone(fixture.bundle.revision_content),
      });
      assert.equal(createReplay.replayed, true);
      assert.equal(createReplay.identity.execution_bundle_id, created.identity.execution_bundle_id);

      await assert.rejects(
        service.putDraft({
          bundle_key: `${prefix}-key`,
          display_name: 'M7 exact executable bundle',
          expected_draft_version: 7,
          draft_content: fixture.bundle.revision_content,
        }),
        reason('EXECUTION_BUNDLE_CONFLICT'),
      );

      const first = await service.freezeActiveRevision({
        bundle_key: `${prefix}-key`,
        expected_draft_version: 1,
      });
      assert.equal(first.replayed, false);
      assert.equal(first.revision.revision_sequence, 1);
      assert.equal(first.lifecycle_projection.current_status, 'active');
      assert.equal(first.readiness.outcome, 'passed');

      const freezeReplay = await service.freezeActiveRevision({
        bundle_key: `${prefix}-key`,
        expected_draft_version: 1,
      });
      assert.equal(freezeReplay.replayed, true);
      assert.equal(
        freezeReplay.revision.execution_bundle_revision_id,
        first.revision.execution_bundle_revision_id,
      );

      const exact = await service.resolveActiveReadyExact({
        execution_bundle_revision_id: first.revision.execution_bundle_revision_id,
        content_hash: first.revision.content_hash,
      });
      assert.deepEqual(exact.revision.revision_content, fixture.bundle.revision_content);
      await assert.rejects(
        service.resolveActiveReadyExact({
          execution_bundle_revision_id: first.revision.execution_bundle_revision_id,
          content_hash: `sha256:${'f'.repeat(64)}`,
        }),
        reason('EXECUTION_BUNDLE_NOT_READY'),
      );

      const secondDraft = await service.putDraft({
        bundle_key: `${prefix}-key`,
        display_name: 'M7 exact executable bundle',
        expected_draft_version: 1,
        draft_content: {
          ...fixture.bundle.revision_content,
          arguments: [...fixture.bundle.revision_content.arguments, '--revision=2'],
        },
      });
      assert.equal(secondDraft.draft.draft_version, 2);
      const second = await service.freezeActiveRevision({
        bundle_key: `${prefix}-key`,
        expected_draft_version: 2,
      });
      assert.equal(second.revision.revision_sequence, 2);
      assert.notEqual(second.revision.content_hash, first.revision.content_hash);
      assert.ok(await prisma.experimentFoundationExecutionBundleRevisionV2.findUnique({
        where: { id: first.revision.execution_bundle_revision_id },
      }));
    } finally {
      await cleanup(prisma, prefix);
      await prisma.$disconnect();
    }
  },
);

function reason(expected: ExperimentFoundationExecutionBundleV2ConstraintError['reasonCode']) {
  return (error: unknown) => (
    error instanceof ExperimentFoundationExecutionBundleV2ConstraintError
    && error.reasonCode === expected
  );
}

async function cleanup(prisma: PrismaClient, prefix: string): Promise<void> {
  const identities = await prisma.experimentFoundationExecutionBundleIdentityV2.findMany({
    where: { bundleKey: { startsWith: prefix } },
    select: { id: true },
  });
  const identityIds = identities.map(({ id }) => id);
  const revisions = await prisma.experimentFoundationExecutionBundleRevisionV2.findMany({
    where: { executionBundleId: { in: identityIds } },
    select: { id: true },
  });
  const revisionIds = revisions.map(({ id }) => id);
  await prisma.$transaction([
    prisma.experimentFoundationExecutionBundleReadinessV2.deleteMany({
      where: { executionBundleRevisionId: { in: revisionIds } },
    }),
    prisma.experimentFoundationExecutionBundleLifecycleProjectionV2.deleteMany({
      where: { executionBundleRevisionId: { in: revisionIds } },
    }),
    prisma.experimentFoundationExecutionBundleLifecycleEventV2.deleteMany({
      where: { executionBundleRevisionId: { in: revisionIds } },
    }),
    prisma.experimentFoundationExecutionBundleRevisionV2.deleteMany({
      where: { executionBundleId: { in: identityIds } },
    }),
    prisma.experimentFoundationExecutionBundleDraftV2.deleteMany({
      where: { executionBundleId: { in: identityIds } },
    }),
    prisma.experimentFoundationExecutionBundleIdentityV2.deleteMany({
      where: { id: { in: identityIds } },
    }),
  ]);
}
