import fs from 'node:fs/promises';
import path from 'node:path';

import { buildApp } from '../../../../apps/backend/src/app.ts';
import { getPrismaClient } from '../../../../apps/backend/src/repositories/prisma/prisma-client.ts';

const TASK_DIR = 'dev-docs/active/adaptive-llm-systems-readiness-followup';
const OUT_DIR = path.join(TASK_DIR, 'artifacts');
const REPORT_PATH = path.join(OUT_DIR, 'f1-classic-rag-import-report.json');
const ARXIV_ID = '2005.11401';
const ARXIV_API_URL = `https://export.arxiv.org/api/query?id_list=${ARXIV_ID}`;
const SOURCE_URL = `https://arxiv.org/abs/${ARXIV_ID}`;
const FETCH_MAX_ATTEMPTS = Number(process.env.F1_ARXIV_MAX_ATTEMPTS ?? '4');
const FETCH_DELAY_MS = Number(process.env.F1_ARXIV_DELAY_MS ?? '2000');

const TAGS = [
  'collection:core',
  'direction:rag-aware-allocation',
  'subcluster:rag-evaluation-quality',
  'metric:answer-quality',
  'priority:p1',
  'era:classic-pre-2023',
  'classification:seed',
  'classification:needs-judgment-card',
  'batch:f1-import-missing-core-classic',
  'query:f1-classic-rag-anchor',
];

function decodeXml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

function compactText(value) {
  return decodeXml(value).replace(/\s+/g, ' ').trim();
}

function matchOne(xml, pattern, fieldName) {
  const match = xml.match(pattern);
  if (!match?.[1]) {
    throw new Error(`arXiv response missing ${fieldName}`);
  }
  return compactText(match[1]);
}

function parseArxivEntry(xml) {
  const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/)?.[1];
  if (!entry) {
    throw new Error(`arXiv response did not contain an entry for ${ARXIV_ID}`);
  }
  const title = matchOne(entry, /<title>([\s\S]*?)<\/title>/, 'title');
  const abstract = matchOne(entry, /<summary>([\s\S]*?)<\/summary>/, 'summary');
  const published = matchOne(entry, /<published>([\s\S]*?)<\/published>/, 'published');
  const authors = [...entry.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/g)]
    .map((match) => compactText(match[1]))
    .filter(Boolean);
  if (authors.length === 0) {
    throw new Error(`arXiv response missing authors for ${ARXIV_ID}`);
  }
  return {
    provider: 'arxiv',
    external_id: ARXIV_ID,
    title,
    abstract,
    authors,
    year: Number(published.slice(0, 4)),
    arxiv_id: ARXIV_ID,
    source_url: SOURCE_URL,
    rights_class: 'UNKNOWN',
    tags: TAGS,
  };
}

async function fetchArxivImportItem() {
  let lastError = null;
  for (let attempt = 1; attempt <= FETCH_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(ARXIV_API_URL, {
        headers: {
          'User-Agent': 'paper-engineering-assistant/1.0 (local literature readiness followup)',
        },
      });
      if (!response.ok) {
        throw new Error(`arXiv metadata fetch failed: ${response.status} ${response.statusText}`);
      }
      return parseArxivEntry(await response.text());
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, FETCH_DELAY_MS));
      }
    }
  }
  throw lastError;
}

async function countSafety(prisma) {
  return {
    literature_count: await prisma.literatureRecord.count(),
    source_count: await prisma.literatureSource.count(),
    pipeline_run_count: await prisma.literaturePipelineRun.count(),
    content_asset_count: await prisma.literatureContentAsset.count(),
    content_processing_batch_job_count: await prisma.literatureContentProcessingBatchJob.count(),
    fulltext_acquisition_job_count: await prisma.literatureFulltextAcquisitionJob.count(),
  };
}

function deltas(before, after) {
  return Object.fromEntries(Object.keys(after).map((key) => [key, after[key] - before[key]]));
}

async function readAnchor(prisma) {
  return prisma.literatureRecord.findFirst({
    where: { arxivId: ARXIV_ID },
    select: {
      id: true,
      title: true,
      year: true,
      arxivId: true,
      tags: true,
      sources: {
        select: { provider: true, sourceUrl: true },
        orderBy: { id: 'asc' },
      },
    },
  });
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has('--apply') || process.env.F1_CLASSIC_RAG_APPLY === '1';
  const write = apply || args.has('--write') || process.env.F1_CLASSIC_RAG_WRITE === '1';
  const prisma = getPrismaClient();
  let app = null;
  try {
    const before = await countSafety(prisma);
    const existingBefore = await readAnchor(prisma);
    const importItem = await fetchArxivImportItem();
    let importResponse = null;

    if (apply) {
      app = buildApp();
      const response = await app.inject({
        method: 'POST',
        url: '/literature/collections/import',
        payload: { items: [importItem] },
      });
      importResponse = {
        status_code: response.statusCode,
        body: JSON.parse(response.body),
      };
      if (response.statusCode !== 200) {
        throw new Error(`collection import failed with status ${response.statusCode}: ${response.body}`);
      }
    }

    const existingAfter = await readAnchor(prisma);
    const after = await countSafety(prisma);
    const payload = {
      generated_at: new Date().toISOString(),
      apply,
      write,
      arxiv_api_url: ARXIV_API_URL,
      import_item: importItem,
      existing_before: existingBefore,
      existing_after: existingAfter,
      import_response: importResponse,
      counters: {
        before,
        after,
        deltas: deltas(before, after),
      },
      acceptance: {
        anchor_exists: Boolean(existingAfter),
        source_provenance_present: Boolean(existingAfter?.sources?.some((source) => source.sourceUrl === SOURCE_URL)),
        required_tags_present: TAGS.every((tag) => existingAfter?.tags?.includes(tag)),
        no_content_processing_side_effects: [
          'pipeline_run_count',
          'content_asset_count',
          'content_processing_batch_job_count',
          'fulltext_acquisition_job_count',
        ].every((key) => deltas(before, after)[key] === 0),
      },
    };

    if (write) {
      await fs.mkdir(OUT_DIR, { recursive: true });
      await fs.writeFile(REPORT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
    }

    console.log(JSON.stringify({
      apply,
      write,
      existing_before: existingBefore ? existingBefore.id : null,
      existing_after: existingAfter ? existingAfter.id : null,
      import_status_code: importResponse?.status_code ?? null,
      counters: payload.counters,
      acceptance: payload.acceptance,
      report_path: write ? REPORT_PATH : null,
    }, null, 2));
  } finally {
    if (app) {
      await app.close();
    }
    await prisma.$disconnect();
  }
}

await main();
