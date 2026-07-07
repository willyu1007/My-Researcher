#!/usr/bin/env node
// T-130 W-03 (D6): pgvector retrieval latency benchmark — exact scan vs halfvec-hnsw ANN,
// plus top-K overlap (ANN recall vs exact ground truth) on the REAL dev corpus.
//
// The SQL shape mirrors prisma-literature-embedding-store.listEmbeddingVectorCandidates
// (knn window -> per-literature cap -> candidate limit). Duplication is deliberate evidence
// tooling; keep in sync when the store query changes.
//
// Usage:
//   node .ai/scripts/literature-pgvector-benchmark.mjs --mode exact|ann|compare \
//     [--queries 8] [--limit 200] [--cap 8] [--overlap-k 50] [--run-id <id>]
// Requires DATABASE_URL (dev schema). Evidence JSON: .ai/.tmp/literature-pgvector-bench/<run-id>.json

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  return fallback;
}

const MODE = arg('mode', 'compare');
const QUERY_COUNT = Number(arg('queries', '8'));
const CANDIDATE_LIMIT = Number(arg('limit', '200'));
const PER_LIT_CAP = Number(arg('cap', '8'));
const OVERLAP_K = Number(arg('overlap-k', '50'));
const RUN_ID = arg('run-id', `bench-${new Date().toISOString().replaceAll(/[:.]/g, '').slice(0, 15)}`);
const EF_SEARCH = Number(arg('ef-search', String(Math.max(100, CANDIDATE_LIMIT))));

function candidateSql(vectorLiteral, useHalfvec, knnWindow) {
  const distanceExpr = useHalfvec
    ? `(c."retrievalVector"::halfvec(3072)) <#> '${vectorLiteral}'::halfvec(3072)`
    : `c."retrievalVector" <#> '${vectorLiteral}'::vector`;
  return `
    WITH knn AS (
      SELECT c."id", c."literatureId", ${distanceExpr} AS nip
      FROM "LiteratureEmbeddingChunk" c
      WHERE c."retrievalVector" IS NOT NULL
      ORDER BY ${distanceExpr} ASC, c."id" ASC
      LIMIT ${knnWindow}
    ),
    ranked AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY "literatureId" ORDER BY nip ASC, "id" ASC) AS lit_rank
      FROM knn
    )
    SELECT "id", "literatureId", nip
    FROM ranked
    WHERE lit_rank <= ${PER_LIT_CAP}
    ORDER BY nip ASC, "id" ASC
    LIMIT ${CANDIDATE_LIMIT}
  `;
}

async function runQuery(prisma, vectorLiteral, variant) {
  const knnWindow = Math.min(CANDIDATE_LIMIT * 4, 5000);
  const sql = candidateSql(vectorLiteral, variant === 'ann', knnWindow);
  const startedAt = process.hrtime.bigint();
  const rows = await prisma.$transaction(async (tx) => {
    if (variant === 'ann') {
      await tx.$executeRawUnsafe(`SET LOCAL hnsw.ef_search = ${EF_SEARCH}`);
      await tx.$executeRawUnsafe(`SET LOCAL hnsw.iterative_scan = 'relaxed_order'`);
    } else {
      await tx.$executeRawUnsafe('SET LOCAL enable_indexscan = off');
      await tx.$executeRawUnsafe('SET LOCAL enable_bitmapscan = off');
    }
    return tx.$queryRawUnsafe(sql);
  }, { timeout: 120_000 });
  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  return { rows, elapsedMs };
}

async function explainPlan(prisma, vectorLiteral, variant) {
  const knnWindow = Math.min(CANDIDATE_LIMIT * 4, 5000);
  const sql = `EXPLAIN ${candidateSql(vectorLiteral, variant === 'ann', knnWindow)}`;
  const rows = await prisma.$transaction(async (tx) => {
    if (variant === 'ann') {
      await tx.$executeRawUnsafe(`SET LOCAL hnsw.ef_search = ${EF_SEARCH}`);
    } else {
      await tx.$executeRawUnsafe('SET LOCAL enable_indexscan = off');
      await tx.$executeRawUnsafe('SET LOCAL enable_bitmapscan = off');
    }
    return tx.$queryRawUnsafe(sql);
  }, { timeout: 120_000 });
  return rows.map((row) => row['QUERY PLAN']).slice(0, 8);
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Math.round(sorted[index] * 10) / 10;
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is required.');
  }
  const prisma = new PrismaClient();
  try {
    const counts = await prisma.$queryRawUnsafe(
      'SELECT count(*)::int AS total, count("retrievalVector")::int AS with_vector FROM "LiteratureEmbeddingChunk"',
    );
    const indexes = await prisma.$queryRawUnsafe(
      "SELECT indexname FROM pg_indexes WHERE tablename = 'LiteratureEmbeddingChunk' AND indexdef ILIKE '%hnsw%'",
    );
    const pgvector = await prisma.$queryRawUnsafe(
      "SELECT extversion FROM pg_extension WHERE extname = 'vector'",
    );

    // Sample query vectors from real chunks (spread across the table).
    const samples = await prisma.$queryRawUnsafe(`
      SELECT "retrievalVector"::text AS vec
      FROM "LiteratureEmbeddingChunk"
      WHERE "retrievalVector" IS NOT NULL
      ORDER BY md5("id")
      LIMIT ${QUERY_COUNT}
    `);
    const vectors = samples.map((row) => row.vec);

    const report = {
      run_id: RUN_ID,
      mode: MODE,
      corpus: counts[0],
      pgvector_version: pgvector[0]?.extversion ?? null,
      hnsw_indexes: indexes.map((row) => row.indexname),
      params: {
        query_count: vectors.length,
        candidate_limit: CANDIDATE_LIMIT,
        per_literature_cap: PER_LIT_CAP,
        knn_window: Math.min(CANDIDATE_LIMIT * 4, 5000),
        ef_search: EF_SEARCH,
        overlap_k: OVERLAP_K,
      },
      variants: {},
      overlap: null,
      created_at: new Date().toISOString(),
    };

    const variants = MODE === 'compare' ? ['exact', 'ann'] : [MODE];
    const resultsByVariant = {};
    for (const variant of variants) {
      const latencies = [];
      const resultSets = [];
      for (const vec of vectors) {
        const { rows, elapsedMs } = await runQuery(prisma, vec, variant);
        latencies.push(elapsedMs);
        resultSets.push(rows.map((row) => row.id));
      }
      resultsByVariant[variant] = resultSets;
      report.variants[variant] = {
        latency_ms: { p50: percentile(latencies, 50), p95: percentile(latencies, 95), max: percentile(latencies, 100) },
        raw_latencies_ms: latencies.map((value) => Math.round(value * 10) / 10),
        explain_head: await explainPlan(prisma, vectors[0], variant),
      };
    }

    if (MODE === 'compare') {
      const overlaps = vectors.map((_, index) => {
        const exactTop = new Set(resultsByVariant.exact[index].slice(0, OVERLAP_K));
        const annTop = resultsByVariant.ann[index].slice(0, OVERLAP_K);
        const hit = annTop.filter((id) => exactTop.has(id)).length;
        return hit / Math.min(OVERLAP_K, exactTop.size || 1);
      });
      report.overlap = {
        top_k: OVERLAP_K,
        per_query: overlaps.map((value) => Math.round(value * 1000) / 1000),
        mean: Math.round((overlaps.reduce((sum, value) => sum + value, 0) / overlaps.length) * 1000) / 1000,
      };
    }

    const outDir = path.join(REPO_ROOT, '.ai/.tmp/literature-pgvector-bench');
    await fs.mkdir(outDir, { recursive: true });
    const outPath = path.join(outDir, `${RUN_ID}.json`);
    await fs.writeFile(outPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(JSON.stringify({
      run_id: RUN_ID,
      corpus: report.corpus,
      hnsw_indexes: report.hnsw_indexes,
      variants: Object.fromEntries(Object.entries(report.variants).map(([key, value]) => [key, value.latency_ms])),
      overlap_mean: report.overlap?.mean ?? null,
      evidence: outPath,
    }, null, 1));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
