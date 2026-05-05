import { PrismaClient } from '@prisma/client';

const CONTENT_PROCESSING_STAGE_CODES = [
  'CITATION_NORMALIZED',
  'ABSTRACT_READY',
  'FULLTEXT_PREPROCESSED',
  'KEY_CONTENT_READY',
  'CHUNKED',
  'EMBEDDED',
  'INDEXED',
];

function parseArgs(argv) {
  const args = {
    apply: false,
    batchSize: 200,
    concurrency: 4,
    baseUrl: process.env.BACKFILL_BASE_URL ?? 'http://127.0.0.1:3000',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--apply') {
      args.apply = true;
      continue;
    }
    if (token === '--batch-size') {
      args.batchSize = Number.parseInt(argv[i + 1] ?? '', 10) || args.batchSize;
      i += 1;
      continue;
    }
    if (token === '--concurrency') {
      args.concurrency = Number.parseInt(argv[i + 1] ?? '', 10) || args.concurrency;
      i += 1;
      continue;
    }
    if (token === '--base-url') {
      args.baseUrl = String(argv[i + 1] ?? args.baseUrl);
      i += 1;
      continue;
    }
  }

  args.batchSize = Math.max(1, args.batchSize);
  args.concurrency = Math.max(1, args.concurrency);
  args.baseUrl = args.baseUrl.replace(/\/+$/, '');
  return args;
}

function chunk(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function buildMissingStages(stageStatusMap) {
  return CONTENT_PROCESSING_STAGE_CODES.filter((stageCode) => stageStatusMap.get(stageCode) !== 'SUCCEEDED');
}

async function enqueueRun(baseUrl, literatureId, requestedStages) {
  const response = await fetch(`${baseUrl}/literature/${encodeURIComponent(literatureId)}/content-processing/runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ requested_stages: requestedStages }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body.slice(0, 500)}`);
  }

  const payload = await response.json();
  return payload?.run ?? null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  const startedAt = new Date().toISOString();
  const summary = {
    started_at: startedAt,
    mode: args.apply ? 'apply' : 'dry-run',
    total_literatures: 0,
    skipped_no_missing_stage: 0,
    planned_trigger_count: 0,
    triggered_count: 0,
    skipped_run_count: 0,
    failed_count: 0,
    failure_reasons: {},
    options: {
      batch_size: args.batchSize,
      concurrency: args.concurrency,
      base_url: args.baseUrl,
    },
  };

  try {
    const literatures = await prisma.literatureRecord.findMany({
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    summary.total_literatures = literatures.length;

    const stageRows = await prisma.literaturePipelineStageState.findMany({
      select: {
        literatureId: true,
        stageCode: true,
        status: true,
      },
    });

    const stageStatusByLiterature = new Map();
    for (const row of stageRows) {
      const stageMap = stageStatusByLiterature.get(row.literatureId) ?? new Map();
      stageMap.set(row.stageCode, row.status);
      stageStatusByLiterature.set(row.literatureId, stageMap);
    }

    const tasks = [];
    for (const literature of literatures) {
      const stageStatusMap = stageStatusByLiterature.get(literature.id) ?? new Map();
      const missingStages = buildMissingStages(stageStatusMap);
      if (missingStages.length === 0) {
        summary.skipped_no_missing_stage += 1;
        continue;
      }
      summary.planned_trigger_count += 1;
      tasks.push({
        literatureId: literature.id,
        missingStages,
      });
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
          const current = taskChunk[cursor];
          cursor += 1;
          if (!current) {
            continue;
          }

          try {
            const run = await enqueueRun(args.baseUrl, current.literatureId, current.missingStages);
            const runStatus = typeof run?.status === 'string' ? run.status : null;
            if (runStatus === 'SKIPPED') {
              summary.skipped_run_count += 1;
            } else {
              summary.triggered_count += 1;
            }
          } catch (error) {
            summary.failed_count += 1;
            const reason = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
            summary.failure_reasons[reason] = (summary.failure_reasons[reason] ?? 0) + 1;
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
