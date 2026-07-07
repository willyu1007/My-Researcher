import assert from 'node:assert/strict';
import test from 'node:test';

import type { PrismaClient } from '@prisma/client';

import { PrismaLiteratureEmbeddingStore } from './prisma-literature-embedding-store.js';

const NOW = '2026-06-05T00:00:00.000Z';
const VECTOR_DIMENSION = 3072;

type QueryRow = {
  id: string;
  embeddingVersionId: string;
  literatureId: string;
  chunkId: string;
  chunkIndex: number;
  text: string;
  startOffset: number;
  endOffset: number;
  chunkType: string;
  sourceRefs: unknown;
  metadata: unknown;
  contentChecksum: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  negativeInnerProduct: unknown;
  vectorScore: unknown;
  filteredChunkCount: unknown;
};

function makeVector(activeIndex = 0): number[] {
  return Array.from({ length: VECTOR_DIMENSION }, (_, index) => (index === activeIndex ? 1 : 0));
}

function makeFakePrismaClient(options: {
  queryRows?: QueryRow[];
  onQuery?: (sql: string) => void;
  onExecute?: (sql: string) => number;
  embeddingChunkFindMany?: (args: unknown) => unknown[];
} = {}): PrismaClient {
  return {
    $queryRawUnsafe: async (sql: string) => {
      options.onQuery?.(sql);
      return options.queryRows ?? [];
    },
    // T-130 W-03: interactive transactions expose both raw methods; the candidate query now runs
    // SET LOCALs + two $queryRawUnsafe calls (candidates, then count) inside one transaction.
    $transaction: async (
      callback: (tx: {
        $executeRawUnsafe: (sql: string) => Promise<number>;
        $queryRawUnsafe: (sql: string) => Promise<unknown[]>;
      }) => Promise<unknown>,
    ) =>
      callback({
        $executeRawUnsafe: async (sql: string) => options.onExecute?.(sql) ?? 1,
        $queryRawUnsafe: async (sql: string) => {
          options.onQuery?.(sql);
          return options.queryRows ?? [];
        },
      }),
    literatureEmbeddingChunk: {
      findMany: async (args: unknown) => options.embeddingChunkFindMany?.(args) ?? [],
    },
  } as unknown as PrismaClient;
}

test('Prisma literature embedding store excludes unsupported retrievalVector from chunk reads', async () => {
  let capturedArgs: unknown = null;
  const store = new PrismaLiteratureEmbeddingStore(makeFakePrismaClient({
    embeddingChunkFindMany: (args) => {
      capturedArgs = args;
      return [{
        id: 'chunk-row-1',
        embeddingVersionId: 'EV-1',
        literatureId: 'LIT-1',
        chunkId: 'chunk-1',
        chunkIndex: 0,
        text: 'Chunk text',
        startOffset: 0,
        endOffset: 10,
        chunkType: 'fulltext_paragraph',
        sourceRefs: [],
        metadata: {},
        contentChecksum: null,
        createdAt: new Date(NOW),
        updatedAt: new Date(NOW),
      }];
    },
  }));

  const chunks = await store.listEmbeddingChunksByEmbeddingVersionIds(['EV-1']);

  assert.equal(chunks.length, 1);
  const select = (capturedArgs as { select?: Record<string, boolean> } | null)?.select;
  assert.equal(Object.prototype.hasOwnProperty.call(select ?? {}, 'vector'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(select ?? {}, 'retrievalVector'), false);
});

test('Prisma literature embedding store candidate query uses eligible pgvector versions without selecting JSONB vectors', async () => {
  let capturedSql = '';
  let countSql = '';
  const capturedSetLocals: string[] = [];
  const store = new PrismaLiteratureEmbeddingStore(makeFakePrismaClient({
    onQuery: (sql) => {
      if (!capturedSql) {
        capturedSql = sql;
      } else if (!countSql) {
        countSql = sql;
      }
    },
    onExecute: (sql) => {
      capturedSetLocals.push(sql);
      return 1;
    },
    queryRows: [{
      id: 'chunk-row-1',
      embeddingVersionId: 'EV-PARTIAL',
      literatureId: 'LIT-0252',
      chunkId: 'visual-001',
      chunkIndex: 0,
      text: 'Visual retrieval chunk',
      startOffset: 0,
      endOffset: 22,
      chunkType: 'visual',
      sourceRefs: [{ page: 3, kind: 'figure' }],
      metadata: { source: 'partial_visual_retrieval' },
      contentChecksum: 'checksum-1',
      createdAt: new Date(NOW),
      updatedAt: NOW,
      negativeInnerProduct: '-0.95',
      vectorScore: '0.975',
      filteredChunkCount: '42',
    }],
  }));

  const result = await store.listEmbeddingVectorCandidates({
    eligibleEmbeddingVersionIds: ['EV-PARTIAL'],
    normalizedQueryVector: makeVector(),
    candidateLimit: 25,
    perLiteratureCandidateCap: 7,
  });

  assert.match(capturedSql, /c\."embeddingVersionId" = ANY\(ARRAY\['EV-PARTIAL'\]::text\[\]\)/);
  assert.match(capturedSql, /c\."retrievalVector" IS NOT NULL/);
  // T-130 W-03: knn window scan casts BOTH sides to halfvec(3072) to match the hnsw
  // expression index; per-literature capping happens over the fetched window only.
  assert.match(capturedSql, /c\."retrievalVector"::halfvec\(3072\)\) <#> '/);
  assert.match(capturedSql, /::halfvec\(3072\)/);
  assert.match(capturedSql, /ROW_NUMBER\(\) OVER \(/);
  assert.match(capturedSql, /PARTITION BY "literatureId"/);
  assert.match(capturedSql, /"literatureRank" <= 7/);
  assert.match(capturedSql, /LIMIT 25/);
  assert.doesNotMatch(capturedSql, /c\."vector"/);
  assert.doesNotMatch(capturedSql, /"status"/i);
  assert.doesNotMatch(capturedSql, /EV-STALE/);
  assert.doesNotMatch(capturedSql, /COUNT\(\*\) OVER/);
  assert.match(countSql, /SELECT COUNT\(\*\)::int AS "filteredChunkCount"/);
  assert.equal(capturedSetLocals.some((sql) => sql.includes('hnsw.ef_search')), true);
  assert.equal(capturedSetLocals.some((sql) => sql.includes("hnsw.iterative_scan = 'relaxed_order'")), true);

  const first = result.candidates[0];
  assert.ok(first);
  assert.equal(first.id, 'chunk-row-1');
  assert.equal(first.embeddingVersionId, 'EV-PARTIAL');
  assert.equal(first.vectorScore, 0.975);
  assert.equal(first.negativeInnerProduct, -0.95);
  assert.equal(Object.prototype.hasOwnProperty.call(first, 'vector'), false);
  assert.equal(result.telemetry.filteredEmbeddingVersionCount, 1);
  assert.equal(result.telemetry.filteredChunkCount, 42);
  assert.equal(result.telemetry.candidateReturned, 1);
});

test('Prisma literature embedding store writes retrieval vectors to pgvector column with dimension validation', async () => {
  const capturedExecuteSqls: string[] = [];
  const store = new PrismaLiteratureEmbeddingStore(makeFakePrismaClient({
    onExecute: (sql) => {
      capturedExecuteSqls.push(sql);
      return 1;
    },
  }));

  await assert.rejects(
    () => store.writeEmbeddingRetrievalVectors([{
      embeddingChunkId: 'chunk-row-bad',
      normalizedVector: [1, 0],
      updatedAt: NOW,
    }]),
    /Expected 3072-dimensional vector/,
  );
  assert.equal(capturedExecuteSqls.length, 0);

  const written = await store.writeEmbeddingRetrievalVectors([{
    embeddingChunkId: 'chunk-row-1',
    normalizedVector: makeVector(),
    updatedAt: NOW,
  }]);

  assert.equal(written, 1);
  assert.equal(capturedExecuteSqls.length, 1);
  assert.match(capturedExecuteSqls[0] ?? '', /UPDATE "LiteratureEmbeddingChunk"/);
  assert.match(capturedExecuteSqls[0] ?? '', /"retrievalVector"\s*=/);
  assert.match(capturedExecuteSqls[0] ?? '', /::vector/);
  assert.match(capturedExecuteSqls[0] ?? '', /WHERE "id" = 'chunk-row-1'/);
  assert.equal((capturedExecuteSqls[0] ?? '').includes('"vector" ='), false);
});

test('Prisma literature embedding store summarizes retrieval vector coverage without reading vector payloads', async () => {
  let capturedSql = '';
  const store = new PrismaLiteratureEmbeddingStore(makeFakePrismaClient({
    onQuery: (sql) => {
      capturedSql = sql;
    },
    queryRows: [{
      embeddingVersionId: 'EV-1',
      literatureId: 'LIT-1',
      chunkCount: '4',
      nativeVectorCount: '3',
      missingNativeVectorCount: '1',
    } as unknown as QueryRow],
  }));

  const coverage = await store.summarizeEmbeddingRetrievalVectorCoverage({
    embeddingVersionIds: ['EV-1', 'EV-1'],
  });

  assert.match(capturedSql, /COUNT\(\*\)::int AS "chunkCount"/);
  assert.match(capturedSql, /COUNT\(c\."retrievalVector"\)::int AS "nativeVectorCount"/);
  assert.match(capturedSql, /c\."embeddingVersionId" = ANY\(ARRAY\['EV-1'\]::text\[\]\)/);
  assert.doesNotMatch(capturedSql, /SELECT[\s\S]*c\."vector"/);
  assert.equal(coverage.embeddingVersionCount, 1);
  assert.equal(coverage.literatureCount, 1);
  assert.equal(coverage.chunkCount, 4);
  assert.equal(coverage.nativeVectorCount, 3);
  assert.equal(coverage.missingNativeVectorCount, 1);
  assert.equal(coverage.coverageRatio, 0.75);
});
