import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import type {
  Prisma,
  PrismaClient,
} from '@prisma/client';
import {
  PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-semantic-retrieval-v2-contracts';

import {
  openVerifiedDisposablePostgresTestDatabase,
} from '../../test-support/disposable-postgres-test-database.js';
import {
  PaperImplementationExperimentLineageV2Service,
} from '../../services/paper-implementation-experiment-lineage-v2-service.js';
import {
  PaperImplementationSemanticCandidateV2Service,
} from '../../services/paper-implementation-semantic-candidate-v2-service.js';
import {
  PaperImplementationSemanticIndexV2Service,
  type PaperImplementationSemanticEmbeddingV2Port,
} from '../../services/paper-implementation-semantic-index-v2-service.js';
import {
  PaperImplementationSemanticProjectionV2RepositoryError,
} from '../paper-implementation-semantic-projection-v2.repository.js';
import {
  PrismaPaperImplementationExperimentLineageV2Repository,
} from './prisma-paper-implementation-experiment-lineage-v2-repository.js';
import {
  PrismaPaperImplementationSemanticProjectionV2Repository,
} from './prisma-paper-implementation-semantic-projection-v2-repository.js';

const RUN_REAL_POSTGRES =
  process.env.PAPER_IMPLEMENTATION_SEMANTIC_PROJECTION_V2_RELATIONAL_PRISMA === '1';
const REAL_POSTGRES_SKIP_REASON =
  'set PAPER_IMPLEMENTATION_SEMANTIC_PROJECTION_V2_RELATIONAL_PRISMA=1 with the randomized disposable database identity variables';
const FIXED_NOW = '2026-08-03T07:30:00.000Z';
const PROFILE = {
  profile_id: 'pi-semantic-relational-v1',
  provider: 'deterministic-test',
  model: 'basis-vector-v1',
  dimension: PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2,
} as const;

test(
  'Prisma Phase 4B projection atomically rebuilds and isolates authorized projects',
  {
    skip: RUN_REAL_POSTGRES ? false : REAL_POSTGRES_SKIP_REASON,
    timeout: 180_000,
  },
  async () => {
    const { prisma } = await openVerifiedDisposablePostgresTestDatabase(
      process.env,
      'd19',
    );
    try {
      const namespace = `t134-p4b-${randomUUID()}`;
      const projectA = `${namespace}-project-a`;
      const projectB = `${namespace}-project-b`;
      const cycleA1 = `${namespace}-cycle-a1`;
      const cycleA2 = `${namespace}-cycle-a2`;
      const cycleB1 = `${namespace}-cycle-b1`;
      await seedProject(prisma, projectA, `${namespace}-a`);
      await seedProject(prisma, projectB, `${namespace}-b`);
      await seedCycle(prisma, projectA, cycleA1);
      await seedCycle(prisma, projectB, cycleB1);

      const candidateService = new PaperImplementationSemanticCandidateV2Service({
        structuredLineageReader: new PaperImplementationExperimentLineageV2Service({
          repository: new PrismaPaperImplementationExperimentLineageV2Repository(prisma),
        }),
      });
      const embeddingCalls: string[][] = [];
      const repository = new PrismaPaperImplementationSemanticProjectionV2Repository(prisma);
      const indexService = semanticIndexService(
        candidateService,
        repository,
        deterministicEmbeddingPort(embeddingCalls),
      );

      assert.deepEqual(await indexService.rebuildProjectProjection(projectA), {
        changed_count: 1,
        unchanged_count: 0,
        deleted_count: 0,
        total_count: 1,
      });
      const firstA = await repository.listProjectProjection(projectA);
      assert.equal(firstA.length, 1, 'first project A projection count');
      assert.equal(firstA[0]?.source.source_id, cycleA1);
      assert.equal(JSON.stringify(firstA).includes(projectB), false);
      assert.deepEqual(embeddingCalls[0], [firstA[0]!.document_id]);

      await indexService.rebuildProjectProjection(projectB);
      assert.equal(
        (await repository.listProjectProjection(projectB)).length,
        1,
        'first project B projection count',
      );
      assert.deepEqual(await indexService.rebuildProjectProjection(projectA), {
        changed_count: 0,
        unchanged_count: 1,
        deleted_count: 0,
        total_count: 1,
      });
      assert.deepEqual(await repository.listProjectProjection(projectA), firstA);

      await seedCycle(prisma, projectA, cycleA2);
      const crashingRepository = new PrismaPaperImplementationSemanticProjectionV2Repository(
        prisma,
        {
          failpoint() {
            throw new Error('injected semantic projection transaction crash');
          },
        },
      );
      await assert.rejects(
        semanticIndexService(
          candidateService,
          crashingRepository,
          deterministicEmbeddingPort(),
        ).rebuildProjectProjection(projectA),
        /injected semantic projection transaction crash/,
      );
      assert.deepEqual(await repository.listProjectProjection(projectA), firstA);
      assert.equal(
        (await repository.listProjectProjection(projectB)).length,
        1,
        'project B survives project A crash',
      );

      assert.deepEqual(await indexService.rebuildProjectProjection(projectA), {
        changed_count: 1,
        unchanged_count: 1,
        deleted_count: 0,
        total_count: 2,
      });
      assert.equal(
        (await repository.listProjectProjection(projectA)).length,
        2,
        'project A count after second Cycle',
      );

      await prisma.$executeRaw`
        UPDATE "PaperImplementationSemanticDocumentProjectionV2"
        SET "semanticText" = 'corrupt'
        WHERE "implementationProjectId" = ${projectA}
          AND "sourceId" = ${cycleA1}
      `;
      await assert.rejects(
        repository.listProjectProjection(projectA),
        (error) => (
          error instanceof PaperImplementationSemanticProjectionV2RepositoryError
          && error.reasonCode === 'PROJECTION_STORED_INTEGRITY_ERROR'
        ),
      );
      const repaired = await indexService.rebuildProjectProjection(projectA);
      assert.equal(repaired.changed_count, 1, 'corrupt row repair count');
      assert.equal(
        (await repository.listProjectProjection(projectA)).length,
        2,
        'project A count after repair',
      );

      await prisma.paperImplementationValidationCycle.delete({ where: { id: cycleA2 } });
      assert.deepEqual(await indexService.rebuildProjectProjection(projectA), {
        changed_count: 0,
        unchanged_count: 1,
        deleted_count: 1,
        total_count: 1,
      });
      assert.equal(
        (await repository.listProjectProjection(projectA)).length,
        1,
        'project A count after stale prune',
      );
      assert.equal(
        (await repository.listProjectProjection(projectB)).length,
        1,
        'project B survives project A prune',
      );

      const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'PaperImplementationSemanticDocumentProjectionV2'
        ORDER BY indexname ASC
      `;
      assert.equal(indexes.some((row) => (
        row.indexname === 'pi_semantic_projection_vector_hnsw_idx'
      )), true);
    } finally {
      await prisma.$disconnect();
    }
  },
);

function deterministicEmbeddingPort(calls: string[][] = []): PaperImplementationSemanticEmbeddingV2Port {
  return {
    async embedDocuments(input) {
      calls.push(input.documents.map((document) => document.document_id));
      return input.documents.map((document) => {
        const seed = [...document.document_id].reduce((sum, character) => (
          (sum + character.charCodeAt(0)) % PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2
        ), 0);
        return {
          document_id: document.document_id,
          vector: Array.from(
            { length: PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2 },
            (_, index) => ((index + seed) % 251) + 1 + ((index % 7) * 0.001_234_567),
          ),
        };
      });
    },
  };
}

function semanticIndexService(
  candidateService: PaperImplementationSemanticCandidateV2Service,
  repository: PrismaPaperImplementationSemanticProjectionV2Repository,
  embeddingPort: PaperImplementationSemanticEmbeddingV2Port,
) {
  return new PaperImplementationSemanticIndexV2Service({
    documentReader: candidateService,
    embeddingPort,
    repository,
    embeddingProfile: PROFILE,
    now: () => FIXED_NOW,
  });
}

async function seedProject(
  prisma: PrismaClient,
  implementationProjectId: string,
  namespace: string,
): Promise<void> {
  await prisma.paperImplementationProject.create({
    data: {
      id: implementationProjectId,
      intakeSnapshotId: `${namespace}-intake`,
      titleCardId: `${namespace}-title-card`,
      paperProjectBridgeId: `${namespace}-bridge`,
      bridgePayloadHash: hash('a'),
      lifecycleStatus: 'active',
      freshnessStatus: 'fresh',
      sourceStatus: 'active',
      versionNumber: 1,
      createdBy: 't134-phase4b-relational',
      createdAt: new Date(FIXED_NOW),
      updatedAt: new Date(FIXED_NOW),
    },
  });
}

async function seedCycle(
  prisma: PrismaClient,
  implementationProjectId: string,
  validationCycleId: string,
): Promise<void> {
  const data: Prisma.PaperImplementationValidationCycleUncheckedCreateInput = {
    id: validationCycleId,
    implementationProjectId,
    inputSnapshotId: `${validationCycleId}-input`,
    targetRefType: 'paper_project',
    targetRefId: `${implementationProjectId}-paper`,
    targetVersionId: 'v1',
    target: {},
    triggerType: 'integration_test',
    trigger: {},
    cycleType: 'experiment',
    validationQuestion: 'Does Phase 4B preserve project-isolated projection state?',
    validationFrame: {},
    context: {},
    criteria: {},
    budgetId: `${validationCycleId}-budget`,
    budget: {},
    expectedInformationGain: 'medium',
    cycleStatus: 'admitted',
    executionStatus: 'not_started',
    outputs: {},
    confirmationLevel: 'confirmed',
    createdBy: 't134-phase4b-relational',
    createdAt: new Date(FIXED_NOW),
    updatedAt: new Date(FIXED_NOW),
    admittedAt: new Date(FIXED_NOW),
  };
  await prisma.paperImplementationValidationCycle.create({ data });
}

function hash(character: string): string {
  return `sha256:${character.repeat(64)}`;
}
