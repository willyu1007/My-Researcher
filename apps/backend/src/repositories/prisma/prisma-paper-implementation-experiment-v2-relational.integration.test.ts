import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { Prisma } from '@prisma/client';

import {
  openVerifiedDisposablePostgresTestDatabase,
} from '../../test-support/disposable-postgres-test-database.js';

const RUN_REAL_POSTGRES = process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_RELATIONAL_PRISMA === '1';
const REAL_POSTGRES_SKIP_REASON =
  'set PAPER_IMPLEMENTATION_EXPERIMENT_V2_RELATIONAL_PRISMA=1 with the explicit randomized disposable database identity variables';

test(
  'Prisma PI v2 enforces exact branch revision, parent, and admission bindings',
  {
    skip: RUN_REAL_POSTGRES
      ? false
      : REAL_POSTGRES_SKIP_REASON,
    timeout: 60_000,
  },
  async () => {
    const { prisma } = await openVerifiedDisposablePostgresTestDatabase(process.env, 'd19');
    const fixtureId = randomUUID();
    const branchAId = `pi-rel-branch-a-${fixtureId}`;
    const branchBId = `pi-rel-branch-b-${fixtureId}`;
    const revisionA1Id = `pi-rel-revision-a1-${fixtureId}`;
    const revisionA2Id = `pi-rel-revision-a2-${fixtureId}`;
    const revisionB1Id = `pi-rel-revision-b1-${fixtureId}`;
    const planA1 = hash('1');
    const planA2 = hash('2');
    const planB1 = hash('3');

    try {
      await prisma.paperImplementationExperimentWorkOrderBranchV2.create({
        data: branchData(branchAId, `branch-a-${fixtureId}`),
      });
      await prisma.paperImplementationExperimentWorkOrderBranchV2.create({
        data: branchData(branchBId, `branch-b-${fixtureId}`),
      });
      await prisma.paperImplementationExperimentWorkOrderRevisionV2.create({
        data: revisionData(revisionA1Id, branchAId, 1, null, 'a', planA1),
      });
      await prisma.paperImplementationExperimentWorkOrderRevisionV2.create({
        data: revisionData(revisionA2Id, branchAId, 2, revisionA1Id, 'b', planA2),
      });
      await prisma.paperImplementationExperimentWorkOrderRevisionV2.create({
        data: revisionData(revisionB1Id, branchBId, 1, null, 'c', planB1),
      });

      await expectForeignKey(prisma.paperImplementationExperimentWorkOrderBranchV2.update({
        where: { id: branchAId },
        data: {
          currentRevisionId: revisionB1Id,
          currentRevisionSequence: 1,
        },
      }));
      await expectForeignKey(prisma.paperImplementationExperimentWorkOrderBranchV2.update({
        where: { id: branchAId },
        data: {
          currentRevisionId: revisionA1Id,
          currentRevisionSequence: 2,
        },
      }));

      await prisma.paperImplementationExperimentWorkOrderBranchV2.update({
        where: { id: branchAId },
        data: {
          currentRevisionId: revisionA2Id,
          currentRevisionSequence: 2,
        },
      });

      await expectForeignKey(prisma.paperImplementationExperimentWorkOrderBranchV2.update({
        where: { id: branchAId },
        data: headData(revisionB1Id, 1, 'wrong-branch'),
      }));
      await expectForeignKey(prisma.paperImplementationExperimentWorkOrderBranchV2.update({
        where: { id: branchAId },
        data: headData(revisionA1Id, 2, 'wrong-sequence'),
      }));

      await expectForeignKey(prisma.paperImplementationExperimentWorkOrderRevisionV2.create({
        data: revisionData(
          `pi-rel-cross-parent-${fixtureId}`,
          branchAId,
          3,
          revisionB1Id,
          'd',
          hash('4'),
        ),
      }));

      await expectForeignKey(prisma.paperImplementationExperimentWorkOrderAdmissionV2.create({
        data: admissionData(
          `pi-rel-cross-admission-${fixtureId}`,
          branchAId,
          revisionB1Id,
          planB1,
          `cross-branch-${fixtureId}`,
        ),
      }));
      await expectForeignKey(prisma.paperImplementationExperimentWorkOrderAdmissionV2.create({
        data: admissionData(
          `pi-rel-wrong-plan-${fixtureId}`,
          branchAId,
          revisionA2Id,
          hash('9'),
          `wrong-plan-${fixtureId}`,
        ),
      }));

      await prisma.paperImplementationExperimentWorkOrderBranchV2.update({
        where: { id: branchAId },
        data: headData(revisionA1Id, 1, 'valid'),
      });
      await prisma.paperImplementationExperimentWorkOrderAdmissionV2.create({
        data: admissionData(
          `pi-rel-valid-admission-${fixtureId}`,
          branchAId,
          revisionA2Id,
          planA2,
          `valid-${fixtureId}`,
        ),
      });

      const persisted = await prisma.paperImplementationExperimentWorkOrderBranchV2.findUniqueOrThrow({
        where: { id: branchAId },
      });
      assert.equal(persisted.currentRevisionId, revisionA2Id);
      assert.equal(persisted.currentRevisionSequence, 2);
      assert.equal(persisted.headRevisionId, revisionA1Id);
      assert.equal(persisted.headRevisionSequence, 1);
    } finally {
      await prisma.paperImplementationExperimentWorkOrderAdmissionV2.deleteMany({
        where: { branchId: { in: [branchAId, branchBId] } },
      });
      await prisma.paperImplementationExperimentWorkOrderBranchV2.updateMany({
        where: { id: { in: [branchAId, branchBId] } },
        data: {
          currentRevisionId: null,
          currentRevisionSequence: null,
          headRevisionId: null,
          headRevisionSequence: null,
          headRunId: null,
          headRunManifestHash: null,
          headEventId: null,
        },
      });
      await prisma.paperImplementationExperimentWorkOrderRevisionV2.deleteMany({
        where: { branchId: { in: [branchAId, branchBId] } },
      });
      await prisma.paperImplementationExperimentWorkOrderBranchV2.deleteMany({
        where: { id: { in: [branchAId, branchBId] } },
      });
      await prisma.$disconnect();
    }
  },
);

function branchData(
  id: string,
  branchKey: string,
): Prisma.PaperImplementationExperimentWorkOrderBranchV2UncheckedCreateInput {
  const now = new Date();
  return {
    id,
    implementationProjectId: `project-${id}`,
    validationCycleId: `cycle-${id}`,
    branchKey,
    branchFrameSchemaVersion: 'v1',
    branchFrameJson: { branch_key: branchKey },
    branchFrameHash: hash('e'),
    createdAt: now,
    updatedAt: now,
  };
}

function revisionData(
  id: string,
  branchId: string,
  revisionSequence: number,
  parentRevisionId: string | null,
  hashCharacter: string,
  approvedPlanHash: string,
): Prisma.PaperImplementationExperimentWorkOrderRevisionV2UncheckedCreateInput {
  return {
    id,
    branchId,
    revisionSequence,
    parentRevisionId,
    workOrderSnapshotSchemaVersion: 'v1',
    workOrderSnapshotJson: { revision_sequence: revisionSequence },
    contentHash: hash(hashCharacter),
    cellPlanHash: hash(hashCharacter.toUpperCase()),
    approvedPlanHash,
    createdByActorType: 'integration_test',
    createdAt: new Date(),
  };
}

function admissionData(
  id: string,
  branchId: string,
  revisionId: string,
  approvedPlanHash: string,
  businessIdempotencyKey: string,
): Prisma.PaperImplementationExperimentWorkOrderAdmissionV2UncheckedCreateInput {
  return {
    id,
    branchId,
    revisionId,
    approvedPlanHash,
    businessIdempotencyKey,
    admittedByActorType: 'integration_test',
    admittedAt: new Date(),
  };
}

function headData(
  revisionId: string,
  revisionSequence: number,
  suffix: string,
): Prisma.PaperImplementationExperimentWorkOrderBranchV2UncheckedUpdateInput {
  return {
    headRevisionId: revisionId,
    headRevisionSequence: revisionSequence,
    headRunId: `run-${suffix}`,
    headRunManifestHash: hash('7'),
    headEventId: `event-${suffix}`,
  };
}

function hash(character: string): string {
  return `sha256:${character.repeat(64)}`;
}

async function expectForeignKey(operation: Promise<unknown>): Promise<void> {
  await assert.rejects(operation, (error) => {
    const rendered = renderError(error).toLowerCase();
    return rendered.includes('foreign key') || rendered.includes('p2003');
  });
}

function renderError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const details = error as Error & { code?: string; meta?: unknown };
  return `${details.name} ${details.message} ${details.code ?? ''} ${JSON.stringify(details.meta)}`;
}
