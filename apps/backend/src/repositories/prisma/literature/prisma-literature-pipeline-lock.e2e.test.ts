import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import { PrismaClient } from '@prisma/client';

import type { LiteraturePipelineRunRecord } from '../../literature-repository.js';
import { PrismaLiteratureRepository } from '../prisma-literature-repository.js';

// T-130 W-07c (W-01 follow-up): real-DB verification that pg_advisory_xact_lock actually
// serializes concurrent pipeline-run admission — the in-memory repository proves the
// semantics with a synchronous body, but only Postgres proves the lock. Env-gated like
// the other real-DB e2e suites; run with:
//   RUN_LITERATURE_PIPELINE_LOCK_E2E=1 node --env-file=.env.local --test --loader ts-node/esm \
//     src/repositories/prisma/literature/prisma-literature-pipeline-lock.e2e.test.ts
const RUN_LOCK_E2E = process.env.RUN_LITERATURE_PIPELINE_LOCK_E2E === '1';

function makeRunRecord(literatureId: string, nowIso: string): LiteraturePipelineRunRecord {
  return {
    id: crypto.randomUUID(),
    literatureId,
    triggerSource: 'CONTENT_PROCESSING_ACTION',
    status: 'PENDING',
    requestedStages: ['CITATION_NORMALIZED'],
    errorCode: null,
    errorMessage: null,
    createdAt: nowIso,
    startedAt: null,
    finishedAt: null,
    updatedAt: nowIso,
  };
}

test('advisory xact lock admits exactly one concurrent pipeline run and recovers stale orphans', {
  skip: RUN_LOCK_E2E ? false : 'set RUN_LITERATURE_PIPELINE_LOCK_E2E=1 with DATABASE_URL to run',
}, async () => {
  const prisma = new PrismaClient();
  const repository = new PrismaLiteratureRepository(prisma);
  const runKey = crypto.randomUUID().slice(0, 8);
  const literatureId = `LIT-LOCK-E2E-${runKey}`;
  const nowIso = new Date().toISOString();

  try {
    await repository.createLiterature({
      id: literatureId,
      title: `Advisory Lock E2E ${runKey}`,
      abstractText: null,
      keyContentDigest: null,
      authors: ['E2E'],
      year: 2026,
      doiNormalized: null,
      arxivId: null,
      normalizedTitle: `advisory lock e2e ${runKey}`,
      titleAuthorsYearHash: `lock-e2e-${runKey}`,
      rightsClass: 'OA',
      tags: [],
      activeEmbeddingVersionId: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // 8 concurrent admissions race for the same literature.
    const staleBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const outcomes = await Promise.all(
      Array.from({ length: 8 }, () =>
        repository.createPipelineRunExclusive(makeRunRecord(literatureId, new Date().toISOString()), staleBefore)),
    );

    const created = outcomes.filter((outcome) => outcome.outcome === 'created');
    const inFlight = outcomes.filter((outcome) => outcome.outcome === 'in_flight');
    assert.equal(created.length, 1, `expected exactly one admission, got ${created.length}`);
    assert.equal(inFlight.length, 7);
    const winnerRunId = created[0]!.outcome === 'created' ? created[0]!.run.id : '';
    for (const outcome of inFlight) {
      assert.ok(outcome.outcome === 'in_flight');
      assert.deepEqual(outcome.inFlight.map((run) => run.id), [winnerRunId]);
    }

    // Age the winner past the stale window: the next admission closes it as orphaned and wins.
    const staleUpdatedAt = new Date(Date.now() - 20 * 60 * 1000);
    await prisma.literaturePipelineRun.update({
      where: { id: winnerRunId },
      data: { updatedAt: staleUpdatedAt },
    });
    const takeover = await repository.createPipelineRunExclusive(
      makeRunRecord(literatureId, new Date().toISOString()),
      new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    );
    assert.equal(takeover.outcome, 'created');
    const orphaned = await prisma.literaturePipelineRun.findUnique({ where: { id: winnerRunId } });
    assert.equal(orphaned?.status, 'FAILED');
    assert.equal(orphaned?.errorCode, 'PIPELINE_RUN_ORPHANED');
  } finally {
    await prisma.literaturePipelineRun.deleteMany({ where: { literatureId } });
    await prisma.literatureRecord.deleteMany({ where: { id: literatureId } });
    await prisma.$disconnect();
  }
});
