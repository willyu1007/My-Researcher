const STAGE_CODES = [
  'CITATION_NORMALIZED',
  'ABSTRACT_READY',
  'FULLTEXT_PREPROCESSED',
  'KEY_CONTENT_READY',
  'CHUNKED',
  'EMBEDDED',
  'INDEXED',
];

const RIGHTS_CLASSES = ['OA', 'USER_AUTH', 'RESTRICTED', 'UNKNOWN'];

function parseArgs(argv) {
  const args = {
    apply: false,
    baseUrl: process.env.BACKFILL_BASE_URL ?? 'http://127.0.0.1:3000',
    targetStage: 'INDEXED',
    topicId: null,
    paperId: null,
    literatureIds: [],
    rightsClasses: [],
    updatedAtFrom: null,
    updatedAtTo: null,
    maxParallelLiteratureRuns: 1,
    extractionConcurrency: 1,
    embeddingConcurrency: 1,
    providerCallBudget: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--apply') {
      args.apply = true;
      continue;
    }
    if (token === '--base-url') {
      args.baseUrl = String(argv[index + 1] ?? args.baseUrl);
      index += 1;
      continue;
    }
    if (token === '--target-stage') {
      args.targetStage = String(argv[index + 1] ?? args.targetStage);
      index += 1;
      continue;
    }
    if (token === '--topic-id') {
      args.topicId = String(argv[index + 1] ?? '').trim() || null;
      index += 1;
      continue;
    }
    if (token === '--paper-id') {
      args.paperId = String(argv[index + 1] ?? '').trim() || null;
      index += 1;
      continue;
    }
    if (token === '--literature-ids') {
      args.literatureIds = splitList(argv[index + 1] ?? '');
      index += 1;
      continue;
    }
    if (token === '--rights-classes') {
      args.rightsClasses = splitList(argv[index + 1] ?? '');
      index += 1;
      continue;
    }
    if (token === '--updated-at-from') {
      args.updatedAtFrom = parseDateTimeArg(argv[index + 1], '--updated-at-from');
      index += 1;
      continue;
    }
    if (token === '--updated-at-to') {
      args.updatedAtTo = parseDateTimeArg(argv[index + 1], '--updated-at-to');
      index += 1;
      continue;
    }
    if (token === '--max-parallel-literature-runs') {
      args.maxParallelLiteratureRuns = parsePositiveInt(argv[index + 1], args.maxParallelLiteratureRuns);
      index += 1;
      continue;
    }
    if (token === '--extraction-concurrency') {
      args.extractionConcurrency = parsePositiveInt(argv[index + 1], args.extractionConcurrency);
      index += 1;
      continue;
    }
    if (token === '--embedding-concurrency') {
      args.embeddingConcurrency = parsePositiveInt(argv[index + 1], args.embeddingConcurrency);
      index += 1;
      continue;
    }
    if (token === '--provider-call-budget') {
      args.providerCallBudget = parsePositiveInt(argv[index + 1], null);
      index += 1;
    }
  }

  if (!STAGE_CODES.includes(args.targetStage)) {
    throw new Error(`Unsupported --target-stage ${args.targetStage}.`);
  }
  const invalidRightsClass = args.rightsClasses.find((value) => !RIGHTS_CLASSES.includes(value));
  if (invalidRightsClass) {
    throw new Error(`Unsupported --rights-classes value ${invalidRightsClass}.`);
  }

  args.baseUrl = args.baseUrl.replace(/\/+$/, '');
  return args;
}

function splitList(value) {
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseDateTimeArg(value, flagName) {
  const input = String(value ?? '').trim();
  if (!input) {
    throw new Error(`${flagName} requires a date-time value.`);
  }
  const timestamp = Date.parse(input);
  if (Number.isNaN(timestamp)) {
    throw new Error(`${flagName} must be a valid date-time value.`);
  }
  return new Date(timestamp).toISOString();
}

function buildRequest(args) {
  return {
    target_stage: args.targetStage,
    workset: {
      ...(args.topicId ? { topic_id: args.topicId } : {}),
      ...(args.paperId ? { paper_id: args.paperId } : {}),
      ...(args.literatureIds.length > 0 ? { literature_ids: args.literatureIds } : {}),
      ...(args.rightsClasses.length > 0 ? { rights_classes: args.rightsClasses } : {}),
      ...(args.updatedAtFrom ? { updated_at_from: args.updatedAtFrom } : {}),
      ...(args.updatedAtTo ? { updated_at_to: args.updatedAtTo } : {}),
      stage_filters: {
        missing: true,
        stale: true,
        failed: true,
      },
    },
    options: {
      max_parallel_literature_runs: args.maxParallelLiteratureRuns,
      extraction_concurrency: args.extractionConcurrency,
      embedding_concurrency: args.embeddingConcurrency,
      ...(args.providerCallBudget ? { provider_call_budget: args.providerCallBudget } : {}),
    },
  };
}

async function requestJson(baseUrl, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(async () => ({ message: await response.text() }));
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 1000)}`);
  }
  return payload;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const body = buildRequest(args);
  const path = args.apply
    ? '/literature/content-processing/backfill/jobs'
    : '/literature/content-processing/backfill/dry-runs';
  const payload = await requestJson(args.baseUrl, path, body);
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
