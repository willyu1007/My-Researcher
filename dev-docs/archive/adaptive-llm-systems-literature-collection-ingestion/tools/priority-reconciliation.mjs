import fs from 'node:fs/promises';
import path from 'node:path';

import { getPrismaClient } from '../../../../apps/backend/src/repositories/prisma/prisma-client.ts';

const OUT_DIR = 'dev-docs/active/adaptive-llm-systems-literature-collection-ingestion/artifacts';
const REPORT_PATH = path.join(OUT_DIR, 'priority-reconciliation-report.json');
const MD_PATH = 'dev-docs/active/adaptive-llm-systems-literature-collection-ingestion/12-priority-reconciliation.md';

const DECISIONS = [
  {
    id: 'LIT-0177',
    final_priority: 'priority:p1',
    reason: 'Classic retrieval-depth baseline; seed catalog classifies it as important support rather than direct frontier problem definition.',
  },
  {
    id: 'LIT-0180',
    final_priority: 'priority:p1',
    reason: 'Corrective RAG is an important retrieval-gating baseline, but less direct than adaptive routing/control seeds.',
  },
  {
    id: 'LIT-0189',
    final_priority: 'priority:p1',
    reason: 'RAGPulse is primarily an experiment-foundation workload trace and serving substrate, not a direct policy contribution.',
  },
  {
    id: 'LIT-0196',
    final_priority: 'priority:p1',
    reason: 'Promoted from initial p2 because B2 uses it as an experiment-foundation benchmark/evaluation candidate.',
  },
  {
    id: 'LIT-0197',
    final_priority: 'priority:p1',
    reason: 'Promoted from initial p2 because B2 uses it as an experiment-foundation diagnostic/evaluation candidate.',
  },
  {
    id: 'LIT-0204',
    final_priority: 'priority:p1',
    reason: 'RAGPerf is a benchmark/framework candidate for experiment-foundation; not a direct core policy paper.',
  },
  {
    id: 'LIT-0226',
    final_priority: 'priority:p1',
    reason: 'Chain-of-thought is a classic reasoning baseline for test-time compute, not the focused adaptive budgeting contribution.',
  },
  {
    id: 'LIT-0227',
    final_priority: 'priority:p1',
    reason: 'Self-consistency is a classic sampling baseline and verifier-budget precursor, not the focused adaptive budgeting contribution.',
  },
  {
    id: 'LIT-0230',
    final_priority: 'priority:p1',
    reason: 'FrugalGPT is a model-routing/cascade baseline; important support but not the current central adaptive RAG allocation target.',
  },
  {
    id: 'LIT-0232',
    final_priority: 'priority:p1',
    reason: 'Verifier supervision seed for strategy support; important but not direct adaptive allocation system target.',
  },
  {
    id: 'LIT-0235',
    final_priority: 'priority:p0',
    reason: 'Repeated-sampling inference scaling directly informs test-time compute allocation.',
  },
  {
    id: 'LIT-0236',
    final_priority: 'priority:p0',
    reason: 'Core test-time compute scaling seed for adaptive compute allocation.',
  },
  {
    id: 'LIT-0237',
    final_priority: 'priority:p0',
    reason: 'Direct compute-optimal solve/verify allocation seed.',
  },
  {
    id: 'LIT-0239',
    final_priority: 'priority:p0',
    reason: 'Direct confidence/calibration seed for efficient test-time scaling.',
  },
  {
    id: 'LIT-0240',
    final_priority: 'priority:p2',
    reason: 'Survey seed; useful for query terms and synthesis, but not an experiment card by default.',
  },
  {
    id: 'LIT-0241',
    final_priority: 'priority:p1',
    reason: 'Broad comparative test-time scaling seed; important support after core allocation papers.',
  },
  {
    id: 'LIT-0243',
    final_priority: 'priority:p2',
    reason: 'Survey seed for routing/cascading; use for synthesis and query expansion rather than direct evidence activation.',
  },
  {
    id: 'LIT-0244',
    final_priority: 'priority:p1',
    reason: 'Overthinking limitation seed; useful contrast case but not direct allocation method.',
  },
];

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function nextTags(tags, finalPriority) {
  return uniqueSorted([...tags.filter((tag) => !tag.startsWith('priority:')), finalPriority]);
}

function renderMarkdown(payload) {
  const lines = [];
  lines.push('# 12 Priority Reconciliation');
  lines.push('');
  lines.push('## Status');
  lines.push(`- State: ${payload.apply ? 'applied' : 'check-only'}`);
  lines.push('- Date: 2026-06-04');
  lines.push('- Purpose: normalize current-round records to one effective `priority:*` tag and record seed/query reconciliation rationale.');
  lines.push(`- Report artifact: \`${REPORT_PATH}\``);
  lines.push('');
  lines.push('## Result');
  lines.push(`- Decisions: ${payload.decisions.length}.`);
  lines.push(`- Records requiring tag changes: ${payload.updates.length}.`);
  lines.push(`- Records updated: ${payload.apply ? payload.updates.length : 0}.`);
  lines.push('');
  lines.push('## Decisions');
  lines.push('| Literature ID | Final Priority | Previous Priority Tags | Reason |');
  lines.push('|---|---|---|---|');
  for (const update of payload.decisions) {
    lines.push(`| \`${update.id}\` | \`${update.final_priority}\` | ${update.previous_priority_tags.map((tag) => `\`${tag}\``).join(', ') || '`none`'} | ${update.reason.replaceAll('|', '\\|')} |`);
  }
  lines.push('');
  lines.push('## Guardrail');
  lines.push('- This reconciliation changes priority tags only.');
  lines.push('- It does not create literature records, sources, content assets, content-processing jobs, fulltext acquisition jobs, or pipeline runs.');
  lines.push('- Existing judgment cards are retained for records already marked `classification:judgment-card-ready`, including survey cards that are now normalized to `priority:p2`.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function countSideEffects(prisma) {
  return {
    literature_count: await prisma.literatureRecord.count(),
    source_count: await prisma.literatureSource.count(),
    pipeline_run_count: await prisma.literaturePipelineRun.count(),
    content_asset_count: await prisma.literatureContentAsset.count(),
    content_processing_batch_job_count: await prisma.literatureContentProcessingBatchJob.count(),
    fulltext_acquisition_job_count: await prisma.literatureFulltextAcquisitionJob.count(),
  };
}

function deltaCounts(before, after) {
  return Object.fromEntries(Object.keys(after).map((key) => [key, after[key] - before[key]]));
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has('--apply') || process.env.PRIORITY_RECONCILIATION_APPLY === '1';
  const prisma = getPrismaClient();
  try {
    const before = await countSideEffects(prisma);
    const records = await prisma.literatureRecord.findMany({
      where: { id: { in: DECISIONS.map((decision) => decision.id) } },
      select: { id: true, title: true, tags: true },
      orderBy: { id: 'asc' },
    });
    const missing = DECISIONS.filter((decision) => !records.some((record) => record.id === decision.id));
    if (missing.length > 0) {
      throw new Error(`Missing literature records: ${missing.map((decision) => decision.id).join(', ')}`);
    }
    const decisions = DECISIONS.map((decision) => {
      const record = records.find((candidate) => candidate.id === decision.id);
      const next = nextTags(record.tags, decision.final_priority);
      return {
        ...decision,
        title: record.title,
        previous_priority_tags: record.tags.filter((tag) => tag.startsWith('priority:')).sort(),
        next_priority_tags: [decision.final_priority],
        changed: JSON.stringify(next) !== JSON.stringify(uniqueSorted(record.tags)),
        next_tags: next,
      };
    });
    const updates = decisions.filter((decision) => decision.changed);
    if (apply) {
      for (const update of updates) {
        await prisma.literatureRecord.update({
          where: { id: update.id },
          data: { tags: update.next_tags },
        });
      }
    }
    const after = await countSideEffects(prisma);
    const payload = {
      generated_at: new Date().toISOString(),
      apply,
      decisions,
      updates,
      counters: {
        before,
        after,
        deltas: deltaCounts(before, after),
      },
    };
    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(REPORT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
    await fs.writeFile(MD_PATH, renderMarkdown(payload));
    console.log(JSON.stringify({
      apply,
      decisions: decisions.length,
      updates: updates.length,
      counters: payload.counters,
      artifact_paths: {
        markdown: MD_PATH,
        report: REPORT_PATH,
      },
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

await main();
