import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

import { getPrismaClient } from '../../../../apps/backend/src/repositories/prisma/prisma-client.ts';

const TASK_DIR = 'dev-docs/active/adaptive-llm-systems-readiness-followup';
const OUT_DIR = path.join(TASK_DIR, 'artifacts');
const TMP_DETAIL_DIR = '.ai/.tmp/adaptive-llm-systems-readiness-followup';
const LEGACY_TARGETS_PATH = path.join(OUT_DIR, 'f2-readiness-targets.json');
const LEGACY_READINESS_PATH = path.join(OUT_DIR, 'f2-fulltext-code-readiness.json');
const TARGETS_DETAIL_PATH = path.join(TMP_DETAIL_DIR, 'f2-readiness-targets.json');
const READINESS_DETAIL_PATH = path.join(TMP_DETAIL_DIR, 'f2-fulltext-code-readiness.json');
const TARGETS_MANIFEST_PATH = path.join(OUT_DIR, 'f2-readiness-targets-manifest.json');
const READINESS_MANIFEST_PATH = path.join(OUT_DIR, 'f2-fulltext-code-readiness-manifest.json');
const REPORT_PATH = path.join(OUT_DIR, 'f2-fulltext-code-readiness-report.json');
const MD_PATH = path.join(TASK_DIR, '06-f2-readiness-summary.md');
const ARTIFACT_BOUNDARY_VERSION = 'repo-lightweight-manifest:v1';

const CURRENT_ROUND_BATCH_TAGS = [
  'batch:b1-core-high-precision',
  'batch:b2-core-system-bridge',
  'batch:b3-system-substrate',
  'batch:b4-strategy-policy',
  'batch:b5-theory-mapping',
  'batch:b6-citation-expansion',
];

const FOLLOWUP_BATCH_TAGS = [
  'batch:f1-import-missing-core-classic',
];

const GITHUB_REPO_BY_ID = {
  'LIT-0181': { repo: 'starsuzi/Adaptive-RAG', license: 'Apache-2.0' },
  'LIT-0189': { repo: 'flashserve/RAGPulse', license: 'MIT' },
  'LIT-0195': { repo: 'RUC-NLPIR/FlashRAG', license: 'MIT' },
  'LIT-0196': { repo: 'rungalileo/ragbench', license: null },
  'LIT-0197': { repo: 'amazon-science/RAGChecker', license: 'Apache-2.0' },
  'LIT-0198': { repo: 'fate-ubw/RAGLAB', license: 'MIT' },
  'LIT-0204': { repo: 'platformxlab/RAGPerf', license: 'Apache-2.0' },
  'LIT-0215': { repo: 'HPMLL/BurstGPT', license: 'CC-BY-4.0' },
  'LIT-0218': { repo: 'microsoft/vidur', license: 'MIT' },
  'LIT-0234': { repo: 'lm-sys/RouteLLM', license: 'Apache-2.0' },
  'LIT-0273': { repo: 'LoongServe/LoongServe', license: 'Apache-2.0' },
};

function tagsWith(record, prefix) {
  return record.tags.filter((tag) => tag.startsWith(prefix)).sort();
}

function firstSourceUrl(record) {
  return record.sources[0]?.sourceUrl ?? (record.arxivId ? `https://arxiv.org/abs/${record.arxivId}` : null);
}

function isExperimentCandidate(record) {
  const title = record.title.toLowerCase();
  return record.tags.includes('fit:experiment-foundation')
    || /bench|benchmark|trace|workload|toolkit|framework|simulator|open-source/i.test(title);
}

function isCurrentRound(record) {
  return CURRENT_ROUND_BATCH_TAGS.some((tag) => record.tags.includes(tag));
}

function isF1Anchor(record) {
  return FOLLOWUP_BATCH_TAGS.some((tag) => record.tags.includes(tag));
}

function targetReasons(record) {
  const reasons = [];
  if (isExperimentCandidate(record)) reasons.push('experiment-foundation-candidate');
  if (isCurrentRound(record) && record.tags.includes('priority:p0')) reasons.push('p0-research-seed');
  if (isF1Anchor(record)) reasons.push('f1-classic-rag-anchor');
  return reasons;
}

function compactRecord(record) {
  return {
    id: record.id,
    title: record.title,
    year: record.year,
    arxiv_id: record.arxivId,
    source_url: firstSourceUrl(record),
    reasons: targetReasons(record),
    priority_tags: tagsWith(record, 'priority:'),
    collection_tags: tagsWith(record, 'collection:'),
    direction_tags: tagsWith(record, 'direction:'),
    fit_tags: tagsWith(record, 'fit:'),
    metric_tags: tagsWith(record, 'metric:'),
    resource_tags: tagsWith(record, 'resource:'),
    batch_tags: tagsWith(record, 'batch:'),
  };
}

async function fetchRepo(repoConfig) {
  const { repo, license: fallbackLicense } = repoConfig;
  const apiResponse = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      'User-Agent': 'paper-engineering-assistant-readiness',
    },
  });
  if (apiResponse.ok) {
    const data = await apiResponse.json();
    return {
      status: 'verified-api',
      repo,
      status_code: apiResponse.status,
      url: data.html_url,
      license: data.license?.spdx_id ?? fallbackLicense,
      description: data.description ?? null,
    };
  }

  const htmlUrl = `https://github.com/${repo}`;
  const htmlResponse = await fetch(htmlUrl, {
    headers: {
      'User-Agent': 'paper-engineering-assistant-readiness',
    },
  });
  if (htmlResponse.ok) {
    return {
      status: 'verified-url',
      repo,
      status_code: htmlResponse.status,
      api_status_code: apiResponse.status,
      url: htmlUrl,
      license: fallbackLicense,
      description: null,
    };
  }

  return {
    status: 'unverified',
    repo,
    status_code: htmlResponse.status,
    api_status_code: apiResponse.status,
    url: htmlUrl,
    license: fallbackLicense,
    description: null,
  };
}

function isVerifiedCode(codeEvidence) {
  return codeEvidence.status === 'verified-api' || codeEvidence.status === 'verified-url';
}

function protocolSignal(record, codeEvidence) {
  const title = record.title.toLowerCase();
  if (/bench|benchmark/.test(title)) return 'benchmark-protocol-candidate';
  if (/trace|workload/.test(title)) return 'workload-trace-protocol-candidate';
  if (/toolkit|framework|simulator/.test(title)) return 'toolkit-or-simulator-protocol-candidate';
  if (isVerifiedCode(codeEvidence)) return 'code-backed-method-protocol-candidate';
  return 'paper-method-protocol-only';
}

function needsCodeFollowup(record) {
  const title = record.title.toLowerCase();
  return record.reasons.includes('experiment-foundation-candidate')
    || record.fit_tags.includes('fit:experiment-foundation')
    || /serving|cache|routing|benchmark|workload|toolkit|framework|simulator/i.test(title);
}

function runnableFeasibility(record, codeEvidence, protocol) {
  if (isVerifiedCode(codeEvidence) && codeEvidence.license && protocol !== 'paper-method-protocol-only') {
    return 'high';
  }
  if (isVerifiedCode(codeEvidence)) {
    return 'medium';
  }
  if (record.reasons.includes('p0-research-seed') && !needsCodeFollowup(record)) {
    return 'medium-paper-only';
  }
  return 'needs-manual-followup';
}

function markdownEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function markdownTable(headers, rows) {
  const lines = [];
  lines.push(`| ${headers.map(markdownEscape).join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const row of rows) {
    lines.push(`| ${row.map(markdownEscape).join(' | ')} |`);
  }
  return lines;
}

function renderMarkdown(payload) {
  const lines = [];
  lines.push('# 06 F2 Fulltext And Code Readiness Summary');
  lines.push('');
  lines.push('## Status');
  lines.push('- State: completed');
  lines.push('- Date: 2026-06-04');
  lines.push('- Scope: T-116 experiment-foundation candidates, T-116 current-round P0 seeds, and the F1 classic RAG anchor.');
  lines.push('- This pass records readiness signals only; it does not create experiment-foundation assets or enqueue content processing.');
  lines.push('');
  lines.push('## Summary');
  lines.push(...markdownTable(['Metric', 'Value'], [
    ['Targets', String(payload.summary.target_count)],
    ['Experiment-foundation candidates', String(payload.summary.experiment_candidate_count)],
    ['P0 research seeds', String(payload.summary.p0_seed_count)],
    ['F1 classic anchor targets', String(payload.summary.f1_anchor_count)],
    ['Verified code repositories', String(payload.summary.verified_code_repo_count)],
    ['High runnable feasibility', String(payload.summary.high_runnable_count)],
    ['Needs manual follow-up', String(payload.summary.needs_manual_followup_count)],
  ]));
  lines.push('');
  lines.push('## Promotion-Ready Candidates');
  lines.push(...markdownTable(['Literature ID', 'Title', 'Repo', 'License', 'Protocol', 'Feasibility'], payload.ready_candidates.map((item) => [
    `\`${item.id}\``,
    item.title,
    item.code_evidence.url ?? 'none',
    item.code_evidence.license ?? 'unknown',
    item.protocol_signal,
    item.runnable_baseline_feasibility,
  ])));
  lines.push('');
  lines.push('## Full Target Matrix');
  lines.push(...markdownTable(['Literature ID', 'Reasons', 'Fulltext', 'Code', 'Protocol', 'Feasibility'], payload.readiness.map((item) => [
    `\`${item.id}\``,
    item.reasons.join(', '),
    item.fulltext.url,
    item.code_evidence.url ?? item.code_evidence.status,
    item.protocol_signal,
    item.runnable_baseline_feasibility,
  ])));
  lines.push('');
  lines.push('## Safety Counters');
  lines.push(...markdownTable(['Counter', 'Value'], Object.entries(payload.safety_counters).map(([key, value]) => [`\`${key}\``, String(value)])));
  lines.push('');
  lines.push('## Notes');
  lines.push('- `verified-api` code means GitHub API metadata was captured; `verified-url` means the repository URL was reachable but API metadata was rate-limited or unavailable.');
  lines.push(`- Detailed target/readiness manifests: \`${TARGETS_MANIFEST_PATH}\`, \`${READINESS_MANIFEST_PATH}\`; detailed local JSON is generated outside repo under \`${TMP_DETAIL_DIR}\`.`);
  lines.push('- `needs-manual-followup` items should be checked via project pages, author pages, supplemental material, or benchmark hosting before experiment-foundation promotion.');
  lines.push('- License is taken from GitHub API metadata where available, or from the static verified-repo mapping when API calls are rate-limited; `unknown` requires manual review.');
  lines.push('');
  return `${lines.join('\n').trimEnd()}\n`;
}

function lineCount(text) {
  if (text.length === 0) return 0;
  return text.endsWith('\n') ? text.split('\n').length - 1 : text.split('\n').length;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function readJsonOrNull(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function writeDetailedJsonAndManifest({
  payload,
  detailPath,
  manifestPath,
  legacyRepoPath,
  artifactClass,
  summary,
}) {
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  await fs.mkdir(TMP_DETAIL_DIR, { recursive: true });
  await fs.writeFile(detailPath, text);

  const previousManifest = await readJsonOrNull(manifestPath);
  const manifest = {
    generated_at: payload.generated_at,
    artifact_boundary_version: ARTIFACT_BOUNDARY_VERSION,
    artifact_class: artifactClass,
    repo_policy: {
      db_is_ssot: true,
      repo_keeps: 'human-readable summaries, execution reports, and lightweight manifests',
      repo_excludes: 'large detailed corpus/readiness snapshots',
      reason: 'Detailed readiness matrices are generated task evidence; LiteratureRecord and related DB tables remain the corpus SSOT.',
    },
    removed_from_repo: true,
    original_repo_artifact: previousManifest?.original_repo_artifact ?? {
      path: legacyRepoPath,
      status: 'legacy detailed artifact path no longer tracked',
    },
    detailed_local_copy: {
      path: detailPath,
      git_ignored: true,
      size_bytes: Buffer.byteLength(text, 'utf8'),
      line_count: lineCount(text),
      sha256: sha256(text),
    },
    summary,
  };
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
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

async function main() {
  const prisma = getPrismaClient();
  try {
    const safetyCounters = await countSafety(prisma);
    const records = await prisma.literatureRecord.findMany({
      where: {
        OR: [...CURRENT_ROUND_BATCH_TAGS, ...FOLLOWUP_BATCH_TAGS].map((tag) => ({ tags: { has: tag } })),
      },
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
      orderBy: { id: 'asc' },
    });
    const targets = records
      .filter((record) => targetReasons(record).length > 0)
      .map(compactRecord);

    const readiness = [];
    for (const target of targets) {
      const repo = GITHUB_REPO_BY_ID[target.id];
      const codeEvidence = repo
        ? await fetchRepo(repo)
        : {
            status: 'not_found_in_structured_pass',
            repo: null,
            status_code: null,
            url: null,
            license: null,
            description: null,
          };
      const protocol = protocolSignal(target, codeEvidence);
      readiness.push({
        ...target,
        fulltext: {
          status: target.arxiv_id ? 'arxiv-pdf-candidate' : 'source-url-candidate',
          url: target.arxiv_id ? `https://arxiv.org/pdf/${target.arxiv_id}` : target.source_url,
          source_url: target.source_url,
        },
        code_evidence: codeEvidence,
        protocol_signal: protocol,
        runnable_baseline_feasibility: runnableFeasibility(target, codeEvidence, protocol),
        manual_followup_required: runnableFeasibility(target, codeEvidence, protocol) === 'needs-manual-followup',
      });
    }

    const summary = {
      target_count: readiness.length,
      experiment_candidate_count: readiness.filter((item) => item.reasons.includes('experiment-foundation-candidate')).length,
      p0_seed_count: readiness.filter((item) => item.reasons.includes('p0-research-seed')).length,
      f1_anchor_count: readiness.filter((item) => item.reasons.includes('f1-classic-rag-anchor')).length,
      verified_code_repo_count: readiness.filter((item) => isVerifiedCode(item.code_evidence)).length,
      high_runnable_count: readiness.filter((item) => item.runnable_baseline_feasibility === 'high').length,
      needs_manual_followup_count: readiness.filter((item) => item.manual_followup_required).length,
    };

    const payload = {
      generated_at: new Date().toISOString(),
      summary,
      targets,
      readiness,
      ready_candidates: readiness.filter((item) => item.runnable_baseline_feasibility === 'high'),
      safety_counters: safetyCounters,
      artifact_paths: {
        targets_manifest: TARGETS_MANIFEST_PATH,
        readiness_manifest: READINESS_MANIFEST_PATH,
        targets_detailed_local_json: TARGETS_DETAIL_PATH,
        readiness_detailed_local_json: READINESS_DETAIL_PATH,
        report: REPORT_PATH,
        markdown: MD_PATH,
      },
    };

    await fs.mkdir(OUT_DIR, { recursive: true });
    const targetsManifest = await writeDetailedJsonAndManifest({
      payload: { generated_at: payload.generated_at, targets },
      detailPath: TARGETS_DETAIL_PATH,
      manifestPath: TARGETS_MANIFEST_PATH,
      legacyRepoPath: LEGACY_TARGETS_PATH,
      artifactClass: 'readiness-target-detail-snapshot',
      summary: { target_count: targets.length },
    });
    const readinessManifest = await writeDetailedJsonAndManifest({
      payload,
      detailPath: READINESS_DETAIL_PATH,
      manifestPath: READINESS_MANIFEST_PATH,
      legacyRepoPath: LEGACY_READINESS_PATH,
      artifactClass: 'fulltext-code-readiness-detail-snapshot',
      summary,
    });
    await fs.writeFile(REPORT_PATH, `${JSON.stringify({
      generated_at: payload.generated_at,
      summary,
      safety_counters: safetyCounters,
      artifact_paths: payload.artifact_paths,
      detailed_local_copies: {
        targets: targetsManifest.detailed_local_copy,
        readiness: readinessManifest.detailed_local_copy,
      },
    }, null, 2)}\n`);
    await fs.writeFile(MD_PATH, renderMarkdown(payload));

    console.log(JSON.stringify({
      summary,
      safety_counters: safetyCounters,
      artifact_paths: payload.artifact_paths,
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

await main();
