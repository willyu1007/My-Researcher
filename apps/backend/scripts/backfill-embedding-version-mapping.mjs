import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

function parseArgs(argv) {
  const args = {
    apply: false,
    batchSize: 100,
    concurrency: 4,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--apply') {
      args.apply = true;
      continue;
    }
    if (token === '--batch-size') {
      const raw = Number.parseInt(argv[index + 1] ?? '', 10);
      if (Number.isFinite(raw) && raw > 0) {
        args.batchSize = Math.trunc(raw);
      }
      index += 1;
      continue;
    }
    if (token === '--concurrency') {
      const raw = Number.parseInt(argv[index + 1] ?? '', 10);
      if (Number.isFinite(raw) && raw > 0) {
        args.concurrency = Math.trunc(raw);
      }
      index += 1;
    }
  }

  args.batchSize = Math.max(1, args.batchSize);
  args.concurrency = Math.max(1, args.concurrency);
  return args;
}

function chunk(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function toRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value;
}

function readChunksFromArtifact(artifactPayload) {
  const root = toRecord(artifactPayload);
  const payloadChunks = root?.chunks;
  if (!Array.isArray(payloadChunks)) {
    return [];
  }

  return payloadChunks
    .map((item, index) => {
      const row = toRecord(item);
      if (!row) {
        return null;
      }
      const text = typeof row.text === 'string' ? row.text : '';
      if (!text) {
        return null;
      }
      const chunkId = typeof row.chunk_id === 'string' && row.chunk_id.length > 0
        ? row.chunk_id
        : `chunk-${String(index + 1).padStart(4, '0')}`;
      const chunkIndex = typeof row.index === 'number' ? Math.trunc(row.index) : index;
      const startOffset = typeof row.start_offset === 'number' ? Math.max(0, Math.trunc(row.start_offset)) : 0;
      const endOffset = typeof row.end_offset === 'number'
        ? Math.max(startOffset, Math.trunc(row.end_offset))
        : startOffset + text.length;
      return {
        chunkId,
        chunkIndex,
        text,
        startOffset,
        endOffset,
      };
    })
    .filter((row) => row !== null);
}

function normalizeVector(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry));
}

function readVectorsFromArtifact(artifactPayload) {
  const root = toRecord(artifactPayload);
  const payloadVectors = root?.vectors;
  if (!Array.isArray(payloadVectors)) {
    return new Map();
  }

  const vectorByChunkId = new Map();
  payloadVectors.forEach((item, index) => {
    const row = toRecord(item);
    if (!row) {
      return;
    }
    const chunkId = typeof row.chunk_id === 'string' && row.chunk_id.length > 0
      ? row.chunk_id
      : `chunk-${String(index + 1).padStart(4, '0')}`;
    vectorByChunkId.set(chunkId, normalizeVector(row.vector));
  });

  return vectorByChunkId;
}

function readTokenToChunkIds(indexArtifactPayload, validChunkIds) {
  const root = toRecord(indexArtifactPayload);
  const tokenMap = toRecord(root?.token_to_chunk_ids);
  if (!tokenMap) {
    return [];
  }

  return Object.entries(tokenMap)
    .map(([token, rawChunkIds]) => {
      if (!Array.isArray(rawChunkIds)) {
        return null;
      }
      const chunkIds = [...new Set(
        rawChunkIds
          .map((entry) => (typeof entry === 'string' ? entry : null))
          .filter((entry) => entry !== null && validChunkIds.has(entry)),
      )];
      if (!token || chunkIds.length === 0) {
        return null;
      }
      return {
        token,
        chunkIds,
      };
    })
    .filter((row) => row !== null);
}

function profileFromEmbeddingPayload(payload, vectors) {
  const root = toRecord(payload);
  const provider = typeof root?.provider === 'string' && root.provider.length > 0 ? root.provider : 'local';
  const model = typeof root?.model === 'string' && root.model.length > 0 ? root.model : 'local-hash-embedding-v1';
  const payloadDimension = typeof root?.dimension === 'number' ? Math.trunc(root.dimension) : 0;
  const fallbackDimension = vectors.find((row) => row.length > 0)?.length ?? 0;
  const dimension = Math.max(payloadDimension, fallbackDimension);
  return {
    provider,
    model,
    dimension,
  };
}

async function inspectCandidate(prisma, literatureId) {
  const [existingVersion, chunkArtifact, embeddingArtifact, indexArtifact] = await Promise.all([
    prisma.literatureEmbeddingVersion.findFirst({
      where: { literatureId },
      select: { id: true },
    }),
    prisma.literaturePipelineArtifact.findUnique({
      where: {
        literatureId_stageCode_artifactType: {
          literatureId,
          stageCode: 'CHUNKED',
          artifactType: 'CHUNKS',
        },
      },
      select: { id: true, payload: true, updatedAt: true },
    }),
    prisma.literaturePipelineArtifact.findUnique({
      where: {
        literatureId_stageCode_artifactType: {
          literatureId,
          stageCode: 'EMBEDDED',
          artifactType: 'EMBEDDINGS',
        },
      },
      select: { id: true, payload: true, updatedAt: true },
    }),
    prisma.literaturePipelineArtifact.findUnique({
      where: {
        literatureId_stageCode_artifactType: {
          literatureId,
          stageCode: 'INDEXED',
          artifactType: 'LOCAL_INDEX',
        },
      },
      select: { id: true, payload: true },
    }),
  ]);

  if (existingVersion) {
    return { status: 'skip-existing' };
  }

  if (!chunkArtifact || !embeddingArtifact) {
    return { status: 'skip-missing-artifact' };
  }

  const chunks = readChunksFromArtifact(chunkArtifact.payload);
  if (chunks.length === 0) {
    return { status: 'skip-invalid-payload', reason: 'EMPTY_CHUNKS' };
  }

  const vectorByChunkId = readVectorsFromArtifact(embeddingArtifact.payload);
  if (vectorByChunkId.size === 0) {
    return { status: 'skip-invalid-payload', reason: 'EMPTY_EMBEDDINGS' };
  }

  const validChunkIds = new Set(chunks.map((item) => item.chunkId));
  const tokenRows = indexArtifact
    ? readTokenToChunkIds(indexArtifact.payload, validChunkIds)
    : [];
  const profile = profileFromEmbeddingPayload(
    embeddingArtifact.payload,
    [...vectorByChunkId.values()],
  );

  return {
    status: 'candidate',
    chunkArtifactUpdatedAt: chunkArtifact.updatedAt,
    embeddingArtifactUpdatedAt: embeddingArtifact.updatedAt,
    chunks,
    vectorByChunkId,
    tokenRows,
    profile,
  };
}

async function applyBackfill(prisma, literatureId, candidate) {
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const latestVersion = await tx.literatureEmbeddingVersion.findFirst({
      where: { literatureId },
      select: { versionNo: true },
      orderBy: { versionNo: 'desc' },
    });

    const versionNo = (latestVersion?.versionNo ?? 0) + 1;
    const versionId = crypto.randomUUID();
    const createdAt = candidate.embeddingArtifactUpdatedAt > candidate.chunkArtifactUpdatedAt
      ? candidate.embeddingArtifactUpdatedAt
      : candidate.chunkArtifactUpdatedAt;

    await tx.literatureEmbeddingVersion.create({
      data: {
        id: versionId,
        literatureId,
        versionNo,
        provider: candidate.profile.provider,
        model: candidate.profile.model,
        dimension: candidate.profile.dimension,
        chunkCount: candidate.chunks.length,
        vectorCount: candidate.vectorByChunkId.size,
        tokenCount: candidate.tokenRows.length,
        createdAt,
        updatedAt: now,
      },
    });

    await tx.literatureEmbeddingChunk.createMany({
      data: candidate.chunks.map((chunk) => ({
        id: crypto.randomUUID(),
        embeddingVersionId: versionId,
        literatureId,
        chunkId: chunk.chunkId,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        vector: candidate.vectorByChunkId.get(chunk.chunkId) ?? [],
        createdAt,
        updatedAt: now,
      })),
    });

    if (candidate.tokenRows.length > 0) {
      await tx.literatureEmbeddingTokenIndex.createMany({
        data: candidate.tokenRows.map((tokenRow) => ({
          id: crypto.randomUUID(),
          embeddingVersionId: versionId,
          literatureId,
          token: tokenRow.token,
          chunkIds: tokenRow.chunkIds,
          createdAt,
          updatedAt: now,
        })),
      });
    }

    await tx.literatureRecord.update({
      where: { id: literatureId },
      data: {
        activeEmbeddingVersionId: versionId,
        updatedAt: now,
      },
    });

    return {
      versionId,
      versionNo,
    };
  });

  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  const summary = {
    started_at: new Date().toISOString(),
    mode: args.apply ? 'apply' : 'dry-run',
    total_literatures: 0,
    skipped_existing_versions: 0,
    skipped_missing_artifacts: 0,
    skipped_invalid_payload: 0,
    planned_backfill_count: 0,
    applied_count: 0,
    failed_count: 0,
    failure_reasons: {},
    options: {
      batch_size: args.batchSize,
      concurrency: args.concurrency,
    },
  };

  try {
    const literatures = await prisma.literatureRecord.findMany({
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    summary.total_literatures = literatures.length;

    const tasks = [];
    const failedReasons = summary.failure_reasons;

    for (const literature of literatures) {
      try {
        const inspected = await inspectCandidate(prisma, literature.id);
        if (inspected.status === 'skip-existing') {
          summary.skipped_existing_versions += 1;
          continue;
        }
        if (inspected.status === 'skip-missing-artifact') {
          summary.skipped_missing_artifacts += 1;
          continue;
        }
        if (inspected.status === 'skip-invalid-payload') {
          summary.skipped_invalid_payload += 1;
          const reason = inspected.reason ?? 'INVALID_PAYLOAD';
          failedReasons[reason] = (failedReasons[reason] ?? 0) + 1;
          continue;
        }

        summary.planned_backfill_count += 1;
        tasks.push({
          literatureId: literature.id,
          candidate: inspected,
        });
      } catch (error) {
        summary.failed_count += 1;
        const reason = error instanceof Error ? error.message : 'INSPECT_FAILED';
        failedReasons[reason] = (failedReasons[reason] ?? 0) + 1;
      }
    }

    if (!args.apply) {
      summary.finished_at = new Date().toISOString();
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    const taskChunks = chunk(tasks, args.batchSize);

    for (const taskChunk of taskChunks) {
      let cursor = 0;
      const workers = Array.from({ length: args.concurrency }, async () => {
        while (cursor < taskChunk.length) {
          const task = taskChunk[cursor];
          cursor += 1;
          if (!task) {
            continue;
          }

          try {
            await applyBackfill(prisma, task.literatureId, task.candidate);
            summary.applied_count += 1;
          } catch (error) {
            summary.failed_count += 1;
            const reason = error instanceof Error ? error.message : 'APPLY_FAILED';
            failedReasons[reason] = (failedReasons[reason] ?? 0) + 1;
          }
        }
      });
      await Promise.all(workers);
    }

    summary.finished_at = new Date().toISOString();
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
