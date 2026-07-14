import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import type {
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';

import {
  openVerifiedDisposablePostgresTestDatabase,
} from '../../test-support/disposable-postgres-test-database.js';
import { PrismaExperimentFoundationV2Repository } from './prisma-experiment-foundation-v2-repository.js';

const RUN_REAL_POSTGRES = process.env.EXPERIMENT_FOUNDATION_V2_LIFECYCLE_PRISMA === '1';
const REAL_POSTGRES_SKIP_REASON =
  'set EXPERIMENT_FOUNDATION_V2_LIFECYCLE_PRISMA=1 with the explicit randomized disposable database identity variables';

test(
  'Prisma EF v2 stores independent lifecycle projections for two exact revisions of one asset',
  {
    skip: RUN_REAL_POSTGRES
      ? false
      : REAL_POSTGRES_SKIP_REASON,
    timeout: 30_000,
  },
  async () => {
    const { prisma } = await openVerifiedDisposablePostgresTestDatabase(process.env, 'd19');
    const repository = new PrismaExperimentFoundationV2Repository(prisma);
    const logicalId = `lifecycle_exact_${randomUUID()}`;
    const first = exactRef(logicalId, `revision_1_${randomUUID()}`, 1, 'a');
    const second = exactRef(logicalId, `revision_2_${randomUUID()}`, 2, 'b');

    try {
      await repository.runInTransaction(async (unitOfWork) => {
        for (const [index, asset] of [first, second].entries()) {
          const lifecycleEventId = `lifecycle_event_${randomUUID()}`;
          await unitOfWork.appendLifecycleEvent({
            lifecycle_event_id: lifecycleEventId,
            asset,
            lifecycle_sequence: 1,
            event_type: 'activated',
            reason_code: 'exact_revision_integration_fixture',
            note: null,
            occurred_at: new Date(Date.UTC(2026, 6, 13, 0, index)).toISOString(),
          });
          assert.equal(await unitOfWork.compareAndSwapLifecycleProjection(asset, null, {
            asset,
            projection_state_version: 1,
            lifecycle_sequence: 1,
            lifecycle_status: 'active',
            location_available: true,
            source_event_id: lifecycleEventId,
            updated_at: new Date(Date.UTC(2026, 6, 13, 0, index)).toISOString(),
          }), true);
        }
      });

      await repository.runInTransaction(async (unitOfWork) => {
        assert.equal((await unitOfWork.findLifecycleProjection(first))?.asset.revision_id, first.revision_id);
        assert.equal((await unitOfWork.findLifecycleProjection(second))?.asset.revision_id, second.revision_id);
      });
      assert.equal(await prisma.experimentFoundationAssetLifecycleProjectionV2.count({
        where: { assetType: 'DataPolicy', assetId: logicalId },
      }), 2);
      assert.equal(await prisma.experimentFoundationAssetLifecycleEventV2.count({
        where: { assetType: 'DataPolicy', assetId: logicalId, eventSequence: 1 },
      }), 2);
    } finally {
      await prisma.experimentFoundationAssetLifecycleProjectionV2.deleteMany({
        where: { assetType: 'DataPolicy', assetId: logicalId },
      });
      await prisma.experimentFoundationAssetLifecycleEventV2.deleteMany({
        where: { assetType: 'DataPolicy', assetId: logicalId },
      });
      await prisma.$disconnect();
    }
  },
);

function exactRef(
  logicalId: string,
  revisionId: string,
  revisionSequence: number,
  hashCharacter: string,
): ExperimentFoundationV2ExactAssetRevisionRef {
  return {
    asset_type: 'DataPolicy',
    logical_id: logicalId,
    revision_id: revisionId,
    revision_sequence: revisionSequence,
    content_hash: `sha256:${hashCharacter.repeat(64)}`,
  };
}
