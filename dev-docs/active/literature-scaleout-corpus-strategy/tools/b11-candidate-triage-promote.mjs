import fs from 'node:fs/promises';
import path from 'node:path';

import { getPrismaClient } from '../../../../apps/backend/src/repositories/prisma/prisma-client.ts';
import { PrismaLiteratureRepository } from '../../../../apps/backend/src/repositories/prisma/prisma-literature-repository.ts';
import { PrismaResearchLifecycleRepository } from '../../../../apps/backend/src/repositories/prisma/prisma-research-lifecycle-repository.ts';
import { LiteratureService } from '../../../../apps/backend/src/services/literature-service.ts';
import {
  buildLiteratureTitleAuthorsYearHash,
} from '../../../../apps/backend/src/services/literature-work-identity.ts';

process.env.RESEARCH_LIFECYCLE_REPOSITORY ??= 'prisma';
process.env.TITLE_CARD_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.AUTO_PULL_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.APPLICATION_SETTINGS_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.EXPERIMENT_FOUNDATION_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.PAPER_IMPLEMENTATION_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;

const TASK_DIR = 'dev-docs/active/literature-scaleout-corpus-strategy';
const OUT_DIR = path.join(TASK_DIR, 'artifacts');
const TMP_DIR = '.ai/.tmp/literature-scaleout-corpus-strategy';

const APPLY = process.argv.includes('--apply');
const PROMOTE = process.argv.includes('--promote');
if (PROMOTE && !APPLY) {
  throw new Error('B11 --promote requires --apply so candidate status and promotion links stay in sync.');
}

const runId = readArg('--run-id', process.env.B11_TRIAGE_RUN_ID ?? new Date().toISOString().replace(/[:.]/g, '-'));
const batchIdFilter = readArg('--batch-id', process.env.B11_BATCH_ID ?? '');
const batchCodeFilter = readArg('--batch-code', process.env.B11_BATCH_CODE ?? '');
const candidateStatuses = readCsvArg('--status', process.env.B11_CANDIDATE_STATUS ?? 'DISCOVERED');
const maxCandidates = readInteger('B11_MAX_CANDIDATES', 120, { min: 1, max: 1000 });
const maxPromotions = readInteger('B11_MAX_PROMOTIONS', 20, { min: 0, max: 300 });
const readyThreshold = readNumber('B11_READY_THRESHOLD', 0.76, { min: 0, max: 1 });
const deferThreshold = readNumber('B11_DEFER_THRESHOLD', 0.56, { min: 0, max: 1 });

function readArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  return fallback;
}

function readCsvArg(name, fallback) {
  return readArg(name, fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function readInteger(name, fallback, options) {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : fallback;
  const value = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(options.min, Math.min(options.max, value));
}

function readNumber(name, fallback, options) {
  const raw = process.env[name];
  const parsed = raw ? Number.parseFloat(raw) : fallback;
  const value = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(options.min, Math.min(options.max, value));
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function lower(value) {
  return normalizeText(value).toLowerCase();
}

function unique(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim().length > 0))];
}

function clampScore(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

function scoreValue(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function hasRagSignal(text) {
  return /\brag\b/i.test(text)
    || hasAny(text, ['retrieval augmented generation', 'retrieval-augmented generation']);
}

function firstAuthorKey(authors) {
  return lower(Array.isArray(authors) ? authors[0] : '');
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function b10Payload(candidate) {
  return asRecord(asRecord(candidate.sourcePayload).b10);
}

function candidateDirection(candidate) {
  const b10 = b10Payload(candidate);
  if (typeof b10.direction === 'string' && b10.direction.length > 0) return b10.direction;
  const scores = asRecord(candidate.directionScores);
  return Object.entries(scores)
    .sort((left, right) => scoreValue(right[1]) - scoreValue(left[1]))[0]?.[0] ?? 'unknown';
}

function candidateCollectionRole(candidate) {
  const b10 = b10Payload(candidate);
  if (typeof b10.collection_role === 'string' && b10.collection_role.length > 0) return b10.collection_role;
  const scores = asRecord(candidate.roleScores);
  const bestRole = Object.entries(scores)
    .sort((left, right) => scoreValue(right[1]) - scoreValue(left[1]))[0]?.[0];
  return bestRole ? `collection:${bestRole.replace(/_/g, '-')}` : 'collection:strategy-support';
}

function sourceProviderForImport(candidate) {
  return candidate.sourceProvider === 'arxiv' && candidate.arxivId ? 'arxiv' : 'web';
}

function sourceItemIdForCandidate(candidate) {
  if (candidate.sourceProvider === 'arxiv' && candidate.arxivId) return candidate.arxivId;
  if (candidate.openalexId) return `openalex:${candidate.openalexId.replace(/^https?:\/\/openalex\.org\//i, '')}`;
  if (candidate.semanticScholarId) return `semantic_scholar:${candidate.semanticScholarId}`;
  if (candidate.arxivId) return `arxiv:${candidate.arxivId}`;
  if (candidate.doiNormalized) return `doi:${candidate.doiNormalized}`;
  if (candidate.sourceUrl) return `url:${candidate.sourceUrl}`;
  return `candidate:${candidate.id}`;
}

function sourceUrlForCandidate(candidate) {
  return candidate.sourceUrl
    || candidate.openalexId
    || (candidate.arxivId ? `https://arxiv.org/abs/${candidate.arxivId}` : null)
    || (candidate.doiNormalized ? `https://doi.org/${candidate.doiNormalized}` : null)
    || `https://local.invalid/literature-discovery-candidate/${candidate.id}`;
}

function directionTag(direction) {
  return direction.startsWith('direction:') ? direction : `direction:${direction}`;
}

function batchTag(batchCode) {
  return `batch:${batchCode}`;
}

function triageTags(candidate, decision) {
  return unique([
    'corpus:managed',
    directionTag(decision.direction),
    decision.collection_role,
    batchTag(candidate.batch.batchCode),
    `triage:${decision.triage_band}`,
    `candidate-batch:${candidate.batch.batchCode}`,
  ]);
}

function rolePriority(collectionRole) {
  if (collectionRole === 'collection:core') return 0.92;
  if (collectionRole === 'collection:system-support') return 0.88;
  if (collectionRole === 'collection:strategy-support') return 0.8;
  if (collectionRole === 'collection:theory-support') return 0.72;
  return 0.62;
}

function targetFit(candidate, direction, collectionRole) {
  const title = lower(candidate.title);
  const text = `${title} ${lower(candidate.abstractText)}`;
  const reasons = [];
  let bonus = 0;
  let penalty = 0;
  let reject = false;

  if (direction === 'rag-aware-allocation') {
    if (hasRagSignal(title)) {
      bonus += 0.04;
      reasons.push('title_rag_signal');
    }
    if (hasAny(text, ['adaptive', 'dynamic', 'control', 'budget', 'context', 'confidence', 'pipeline', 'selection', 'optimization'])) {
      bonus += 0.05;
      reasons.push('adaptive_or_allocation_signal');
    }
    if (hasAny(title, [
      'legal',
      'medical',
      'disease',
      'nutrition',
      'obesity',
      'tutor',
      'course',
      'text-to-sql',
      'event extraction',
      'code translation',
      'career guidance',
      'chatbot app',
    ])) {
      penalty += 0.25;
      reasons.push('domain_niche_rag');
    }
  } else if (direction === 'llm-serving-resource-allocation') {
    if (hasAny(title, ['serving', 'inference', 'kv', 'prefill', 'decode', 'batching', 'scheduling', 'gpu', 'throughput', 'latency', 'disaggregated'])) {
      bonus += 0.1;
      reasons.push('serving_system_signal');
    }
    if (hasAny(title, ['position:'])) {
      penalty += 0.15;
      reasons.push('position_paper');
    }
    if (!hasAny(text, ['llm', 'large language model', 'language model', 'generative inference'])) {
      penalty += 0.18;
      reasons.push('weak_llm_signal');
    }
  } else if (direction === 'test-time-compute-budgeting') {
    if (hasAny(title, ['test-time', 'test time', 'inference scaling', 'token-budget', 'budget-aware', 'compute-optimal'])) {
      bonus += 0.12;
      reasons.push('test_time_budget_title_signal');
    }
    if (hasAny(title, ['reasoning', 'scaling laws', 'budget'])) {
      bonus += 0.05;
      reasons.push('reasoning_budget_signal');
    }
    if (!hasAny(text, ['budget', 'compute', 'token', 'scaling', 'reasoning', 'inference'])) {
      penalty += 0.22;
      reasons.push('weak_compute_budget_signal');
    }
  }

  if (candidate.year && candidate.year >= 2024) {
    bonus += 0.015;
    reasons.push('recent');
  }
  if (candidate.abstractText && candidate.abstractText.length >= 500) {
    bonus += 0.01;
    reasons.push('metadata_rich');
  }
  if (!candidate.abstractText || candidate.abstractText.length < 120) {
    penalty += 0.14;
    reasons.push('abstract_sparse');
  }
  if (hasAny(title, ['survey', 'review', 'overview', 'tutorial', 'benchmarking'])) {
    penalty += 0.22;
    reasons.push('survey_or_benchmark_tail');
  }
  if (hasAny(title, ['how to build', 'conceptual framework', 'chatbot app'])) {
    reject = true;
    reasons.push('application_recipe_tail');
  }

  if (collectionRole === 'collection:theory-support' && hasAny(title, ['submodular', 'scaling laws', 'inference scaling', 'compute-optimal'])) {
    bonus += 0.04;
    reasons.push('theory_role_alignment');
  }

  return { bonus, penalty, reject, reasons };
}

function scoreCandidate(candidate) {
  const direction = candidateDirection(candidate);
  const collectionRole = candidateCollectionRole(candidate);
  const base = (
    (scoreValue(candidate.relevanceScore, 0.45) * 0.45)
    + (scoreValue(candidate.implementationScore, 0.4) * 0.22)
    + (scoreValue(candidate.theoryScore, 0.3) * 0.13)
    + (rolePriority(collectionRole) * 0.2)
  );
  const fit = targetFit(candidate, direction, collectionRole);
  const score = clampScore(base + fit.bonus - fit.penalty);
  const triageBand = score >= readyThreshold
    ? 'high'
    : score >= deferThreshold
      ? 'medium'
      : 'low';
  return {
    direction,
    collection_role: collectionRole,
    triage_score: score,
    triage_band: triageBand,
    reject_by_rule: fit.reject,
    reasons: fit.reasons,
  };
}

function titleHash(candidate) {
  return buildLiteratureTitleAuthorsYearHash(candidate.title, candidate.authors, candidate.year);
}

function literatureDuplicateMatch(candidate, matches) {
  const hash = titleHash(candidate);
  return matches.literatureRows.find((row) =>
    (candidate.doiNormalized && row.doiNormalized === candidate.doiNormalized)
    || (candidate.arxivId && row.arxivId === candidate.arxivId)
    || (hash && row.titleAuthorsYearHash === hash)
    || (
      candidate.normalizedTitle
      && candidate.year
      && row.normalizedTitle === candidate.normalizedTitle
      && row.year === candidate.year
      && firstAuthorKey(row.authors) === firstAuthorKey(candidate.authors)
    )
  ) ?? null;
}

function sourceDuplicateMatch(candidate, matches) {
  const provider = sourceProviderForImport(candidate);
  const sourceItemId = sourceItemIdForCandidate(candidate);
  return matches.sourceRows.find((row) => row.provider === provider && row.sourceItemId === sourceItemId) ?? null;
}

function candidateDuplicateMatch(candidate, rows) {
  return rows.find((row) =>
    row.id !== candidate.id
    && (
      (candidate.dedupKey && row.dedupKey === candidate.dedupKey)
      || (candidate.doiNormalized && row.doiNormalized === candidate.doiNormalized)
      || (candidate.arxivId && row.arxivId === candidate.arxivId)
      || (candidate.openalexId && row.openalexId === candidate.openalexId)
      || (candidate.semanticScholarId && row.semanticScholarId === candidate.semanticScholarId)
      || (
        candidate.normalizedTitle
        && candidate.year
        && row.normalizedTitle === candidate.normalizedTitle
        && row.year === candidate.year
        && firstAuthorKey(row.authors) === firstAuthorKey(candidate.authors)
      )
    )
  ) ?? null;
}

function sameTitleYearDuplicateMatch(candidate, acceptedRows) {
  if (!candidate.normalizedTitle || !candidate.year) return null;
  return acceptedRows.find((row) =>
    row.id !== candidate.id
    && row.normalizedTitle === candidate.normalizedTitle
    && row.year === candidate.year
  ) ?? null;
}

function decisionReason(decision) {
  return [
    `B11 triage run ${runId}`,
    `status=${decision.to_status}`,
    `score=${decision.triage_score.toFixed(3)}`,
    `band=${decision.triage_band}`,
    `direction=${decision.direction}`,
    `role=${decision.collection_role}`,
    `reasons=${decision.reasons.join('|') || 'none'}`,
  ].join('; ');
}

function decideCandidates(candidates, matches) {
  const decisions = [];
  const acceptedRows = [];
  const existingCandidateRows = matches.candidateRows;
  const sorted = [...candidates].sort((left, right) => {
    const leftScore = scoreCandidate(left).triage_score;
    const rightScore = scoreCandidate(right).triage_score;
    return rightScore - leftScore || (right.year ?? 0) - (left.year ?? 0) || left.title.localeCompare(right.title);
  });

  for (const candidate of sorted) {
    const score = scoreCandidate(candidate);
    const literatureMatch = literatureDuplicateMatch(candidate, matches);
    if (literatureMatch) {
      decisions.push({
        candidate,
        from_status: candidate.status,
        to_status: 'DUPLICATE',
        duplicate_reason: 'b11_matched_existing_literature',
        duplicate_confidence: 0.98,
        matched_literature_id: literatureMatch.id,
        matched_candidate_id: null,
        ...score,
        reasons: ['existing_literature_match', ...score.reasons],
      });
      continue;
    }
    const sourceMatch = sourceDuplicateMatch(candidate, matches);
    if (sourceMatch) {
      decisions.push({
        candidate,
        from_status: candidate.status,
        to_status: 'DUPLICATE',
        duplicate_reason: 'b11_matched_existing_literature_source',
        duplicate_confidence: 0.97,
        matched_literature_id: sourceMatch.literatureId,
        matched_candidate_id: null,
        ...score,
        reasons: ['existing_source_match', ...score.reasons],
      });
      continue;
    }
    const existingCandidateMatch = candidateDuplicateMatch(candidate, existingCandidateRows);
    if (existingCandidateMatch && existingCandidateMatch.status !== 'DISCOVERED') {
      decisions.push({
        candidate,
        from_status: candidate.status,
        to_status: 'DUPLICATE',
        duplicate_reason: 'b11_matched_existing_candidate',
        duplicate_confidence: 0.95,
        matched_literature_id: existingCandidateMatch.promotedLiteratureId ?? existingCandidateMatch.matchedLiteratureId ?? null,
        matched_candidate_id: existingCandidateMatch.id,
        ...score,
        reasons: ['existing_candidate_match', ...score.reasons],
      });
      continue;
    }
    const sameRunMatch = candidateDuplicateMatch(candidate, acceptedRows) ?? sameTitleYearDuplicateMatch(candidate, acceptedRows);
    if (sameRunMatch) {
      decisions.push({
        candidate,
        from_status: candidate.status,
        to_status: 'DUPLICATE',
        duplicate_reason: 'b11_matched_same_run_candidate',
        duplicate_confidence: 0.92,
        matched_literature_id: null,
        matched_candidate_id: sameRunMatch.id,
        ...score,
        reasons: ['same_run_candidate_match', ...score.reasons],
      });
      continue;
    }

    const softBlockReady = score.reasons.some((reason) =>
      ['domain_niche_rag', 'survey_or_benchmark_tail', 'position_paper'].includes(reason),
    );
    let status = 'DEFERRED';
    if (score.reject_by_rule || score.triage_score < deferThreshold) {
      status = 'REJECTED';
    } else if (score.triage_score >= readyThreshold && !softBlockReady) {
      status = 'READY_FOR_PROMOTION';
    }
    acceptedRows.push(candidate);
    decisions.push({
      candidate,
      from_status: candidate.status,
      to_status: status,
      duplicate_reason: null,
      duplicate_confidence: null,
      matched_literature_id: null,
      matched_candidate_id: null,
      ...score,
    });
  }

  return decisions.sort((left, right) =>
    statusRank(left.to_status) - statusRank(right.to_status)
    || right.triage_score - left.triage_score
    || left.candidate.title.localeCompare(right.candidate.title),
  );
}

function statusRank(status) {
  return {
    READY_FOR_PROMOTION: 0,
    PROMOTED: 1,
    DEFERRED: 2,
    DUPLICATE: 3,
    REJECTED: 4,
  }[status] ?? 9;
}

async function loadCandidates(prisma) {
  const where = {
    status: { in: candidateStatuses },
    ...(batchIdFilter ? { batchId: batchIdFilter } : {}),
    ...(batchCodeFilter ? { batch: { batchCode: batchCodeFilter } } : {}),
  };
  return prisma.literatureDiscoveryCandidate.findMany({
    where,
    include: {
      batch: {
        select: {
          id: true,
          batchCode: true,
          summaryStats: true,
        },
      },
    },
    orderBy: [
      { relevanceScore: 'desc' },
      { year: 'desc' },
      { createdAt: 'asc' },
    ],
    take: maxCandidates,
  });
}

async function loadExistingMatches(prisma, candidates) {
  const dois = unique(candidates.map((candidate) => candidate.doiNormalized).filter(Boolean));
  const arxivIds = unique(candidates.map((candidate) => candidate.arxivId).filter(Boolean));
  const titleHashes = unique(candidates.map(titleHash).filter(Boolean));
  const normalizedTitleYears = candidates
    .filter((candidate) => candidate.normalizedTitle && candidate.year)
    .map((candidate) => ({ normalizedTitle: candidate.normalizedTitle, year: candidate.year }));
  const sourceRefs = candidates.map((candidate) => ({
    provider: sourceProviderForImport(candidate),
    sourceItemId: sourceItemIdForCandidate(candidate),
  }));
  const literatureOr = [
    ...(dois.length ? [{ doiNormalized: { in: dois } }] : []),
    ...(arxivIds.length ? [{ arxivId: { in: arxivIds } }] : []),
    ...(titleHashes.length ? [{ titleAuthorsYearHash: { in: titleHashes } }] : []),
    ...normalizedTitleYears.map((item) => ({ normalizedTitle: item.normalizedTitle, year: item.year })),
  ];
  const candidateOr = candidates.map((candidate) => ({
    OR: [
      ...(candidate.dedupKey ? [{ dedupKey: candidate.dedupKey }] : []),
      ...(candidate.doiNormalized ? [{ doiNormalized: candidate.doiNormalized }] : []),
      ...(candidate.arxivId ? [{ arxivId: candidate.arxivId }] : []),
      ...(candidate.openalexId ? [{ openalexId: candidate.openalexId }] : []),
      ...(candidate.semanticScholarId ? [{ semanticScholarId: candidate.semanticScholarId }] : []),
      ...(candidate.normalizedTitle && candidate.year ? [{ normalizedTitle: candidate.normalizedTitle, year: candidate.year }] : []),
    ],
  })).filter((item) => item.OR.length > 0);

  const [literatureRows, candidateRows, sourceRows] = await Promise.all([
    literatureOr.length
      ? prisma.literatureRecord.findMany({
        where: { OR: literatureOr },
        select: {
          id: true,
          title: true,
          authors: true,
          year: true,
          doiNormalized: true,
          arxivId: true,
          normalizedTitle: true,
          titleAuthorsYearHash: true,
        },
      })
      : [],
    candidateOr.length
      ? prisma.literatureDiscoveryCandidate.findMany({
        where: {
          OR: candidateOr,
          id: { notIn: candidates.map((candidate) => candidate.id) },
        },
        select: {
          id: true,
          title: true,
          authors: true,
          year: true,
          dedupKey: true,
          doiNormalized: true,
          arxivId: true,
          openalexId: true,
          semanticScholarId: true,
          normalizedTitle: true,
          status: true,
          matchedLiteratureId: true,
          promotedLiteratureId: true,
        },
      })
      : [],
    sourceRefs.length
      ? prisma.literatureSource.findMany({
        where: { OR: sourceRefs },
        select: {
          id: true,
          literatureId: true,
          provider: true,
          sourceItemId: true,
        },
      })
      : [],
  ]);

  return { literatureRows, candidateRows, sourceRows };
}

async function applyTriageDecisions(prisma, decisions) {
  const now = new Date();
  await prisma.$transaction(decisions.map((decision) =>
    prisma.literatureDiscoveryCandidate.update({
      where: { id: decision.candidate.id },
      data: {
        status: decision.to_status,
        duplicateReason: decision.duplicate_reason,
        duplicateConfidence: decision.duplicate_confidence,
        matchedLiteratureId: decision.matched_literature_id,
        matchedCandidateId: decision.matched_candidate_id,
        decisionReason: decisionReason(decision),
        decisionAt: now,
        updatedAt: now,
      },
    }),
  ));
}

function toImportItem(decision) {
  const candidate = decision.candidate;
  return {
    provider: sourceProviderForImport(candidate),
    external_id: sourceItemIdForCandidate(candidate),
    title: candidate.title,
    abstract: candidate.abstractText ?? undefined,
    authors: Array.isArray(candidate.authors) ? candidate.authors : [],
    year: candidate.year ?? undefined,
    doi: candidate.doiNormalized ?? undefined,
    arxiv_id: candidate.arxivId ?? undefined,
    source_url: sourceUrlForCandidate(candidate),
    rights_class: 'UNKNOWN',
    tags: triageTags(candidate, decision),
  };
}

async function promoteReadyCandidates(prisma, decisions) {
  const literatureRepository = new PrismaLiteratureRepository(prisma);
  const researchRepository = new PrismaResearchLifecycleRepository(prisma);
  const literatureService = new LiteratureService(literatureRepository, researchRepository);
  const results = [];
  const ready = decisions
    .filter((decision) => decision.to_status === 'READY_FOR_PROMOTION')
    .slice(0, maxPromotions);

  for (const decision of ready) {
    try {
      const importResult = await literatureService.collectionImport({ items: [toImportItem(decision)] });
      const result = importResult.results[0];
      const now = new Date();
      if (result.matched_by && result.matched_by !== 'none' && !result.is_new) {
        await prisma.literatureDiscoveryCandidate.update({
          where: { id: decision.candidate.id },
          data: {
            status: 'DUPLICATE',
            duplicateReason: `b11_promotion_matched_${result.matched_by}`,
            duplicateConfidence: 0.98,
            matchedLiteratureId: result.literature_id,
            matchedCandidateId: null,
            decisionReason: `B11 promote run ${runId}: matched existing LiteratureRecord ${result.literature_id} by ${result.matched_by}.`,
            decisionAt: now,
            updatedAt: now,
          },
        });
        results.push({
          candidate_id: decision.candidate.id,
          title: decision.candidate.title,
          status: 'DUPLICATE',
          literature_id: result.literature_id,
          matched_by: result.matched_by,
          is_new: result.is_new,
        });
      } else {
        await prisma.literatureDiscoveryCandidate.update({
          where: { id: decision.candidate.id },
          data: {
            status: 'PROMOTED',
            promotedLiteratureId: result.literature_id,
            decisionReason: `B11 promote run ${runId}: promoted to LiteratureRecord ${result.literature_id}.`,
            decisionAt: now,
            updatedAt: now,
          },
        });
        results.push({
          candidate_id: decision.candidate.id,
          title: decision.candidate.title,
          status: 'PROMOTED',
          literature_id: result.literature_id,
          matched_by: result.matched_by,
          is_new: result.is_new,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await prisma.literatureDiscoveryCandidate.update({
        where: { id: decision.candidate.id },
        data: {
          decisionReason: `B11 promote run ${runId}: promote failed: ${message}`,
          decisionAt: new Date(),
          updatedAt: new Date(),
        },
      });
      results.push({
        candidate_id: decision.candidate.id,
        title: decision.candidate.title,
        status: 'PROMOTE_FAILED',
        error: message,
      });
    }
  }

  return results;
}

async function updateBatchSummaries(prisma, batchIds) {
  const uniqueBatchIds = unique(batchIds);
  for (const batchId of uniqueBatchIds) {
    const [batch, counts] = await Promise.all([
      prisma.literatureDiscoveryBatch.findUnique({
        where: { id: batchId },
        select: { summaryStats: true },
      }),
      prisma.literatureDiscoveryCandidate.groupBy({
        by: ['status'],
        where: { batchId },
        _count: { _all: true },
      }),
    ]);
    if (!batch) continue;
    const statusCounts = Object.fromEntries(counts.map((item) => [item.status, item._count._all]));
    await prisma.literatureDiscoveryBatch.update({
      where: { id: batchId },
      data: {
        summaryStats: {
          ...asRecord(batch.summaryStats),
          current_status_counts: statusCounts,
          last_b11_run: {
            run_id: runId,
            apply: APPLY,
            promote: PROMOTE,
            updated_at: new Date().toISOString(),
          },
        },
        updatedAt: new Date(),
      },
    });
  }
}

function compactDecision(decision) {
  return {
    candidate_id: decision.candidate.id,
    title: decision.candidate.title,
    year: decision.candidate.year,
    from_status: decision.from_status,
    to_status: decision.to_status,
    triage_score: decision.triage_score,
    triage_band: decision.triage_band,
    direction: decision.direction,
    collection_role: decision.collection_role,
    reasons: decision.reasons,
    duplicate_reason: decision.duplicate_reason,
    duplicate_confidence: decision.duplicate_confidence,
    matched_literature_id: decision.matched_literature_id,
    matched_candidate_id: decision.matched_candidate_id,
    source_provider: decision.candidate.sourceProvider,
    source_item_id: sourceItemIdForCandidate(decision.candidate),
    source_url: sourceUrlForCandidate(decision.candidate),
  };
}

function countBy(items, resolveKey) {
  const counts = new Map();
  for (const item of items) {
    const key = resolveKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort());
}

async function writeArtifacts(report) {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(TMP_DIR, { recursive: true });
  const reportPath = path.join(OUT_DIR, `${runId}-b11-candidate-triage-report.json`);
  const decisionsPath = path.join(OUT_DIR, `${runId}-b11-candidate-decisions.json`);
  const detailPath = path.join(TMP_DIR, `${runId}-b11-candidate-triage-detail.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report.report, null, 2)}\n`);
  await fs.writeFile(decisionsPath, `${JSON.stringify(report.decisions, null, 2)}\n`);
  await fs.writeFile(detailPath, `${JSON.stringify(report.detail, null, 2)}\n`);
  return { reportPath, decisionsPath, detailPath };
}

const prisma = getPrismaClient();
const before = {
  candidates: await prisma.literatureDiscoveryCandidate.count(),
  literature_records: await prisma.literatureRecord.count(),
  literature_sources: await prisma.literatureSource.count(),
};

const candidates = await loadCandidates(prisma);
const matches = await loadExistingMatches(prisma, candidates);
const decisions = decideCandidates(candidates, matches);

let promoteResults = [];
if (APPLY) {
  await applyTriageDecisions(prisma, decisions);
  if (PROMOTE) {
    promoteResults = await promoteReadyCandidates(prisma, decisions);
  }
  await updateBatchSummaries(prisma, candidates.map((candidate) => candidate.batchId));
}

const after = {
  candidates: await prisma.literatureDiscoveryCandidate.count(),
  literature_records: await prisma.literatureRecord.count(),
  literature_sources: await prisma.literatureSource.count(),
};

await prisma.$disconnect();

const compactDecisions = decisions.map(compactDecision);
const artifact = await writeArtifacts({
  report: {
    run_id: runId,
    apply: APPLY,
    promote: PROMOTE,
    generated_at: new Date().toISOString(),
    filters: {
      batch_id: batchIdFilter || null,
      batch_code: batchCodeFilter || null,
      candidate_statuses: candidateStatuses,
      max_candidates: maxCandidates,
      max_promotions: maxPromotions,
      ready_threshold: readyThreshold,
      defer_threshold: deferThreshold,
    },
    input_summary: {
      candidate_count: candidates.length,
      existing_literature_matches_loaded: matches.literatureRows.length,
      existing_candidate_matches_loaded: matches.candidateRows.length,
      existing_source_matches_loaded: matches.sourceRows.length,
    },
    decision_summary: {
      by_status: countBy(compactDecisions, (decision) => decision.to_status),
      by_direction: countBy(compactDecisions, (decision) => decision.direction),
      by_collection_role: countBy(compactDecisions, (decision) => decision.collection_role),
      by_triage_band: countBy(compactDecisions, (decision) => decision.triage_band),
    },
    promotion_summary: {
      attempted: promoteResults.length,
      by_status: countBy(promoteResults, (result) => result.status),
    },
    db_delta: {
      candidates: after.candidates - before.candidates,
      literature_records: after.literature_records - before.literature_records,
      literature_sources: after.literature_sources - before.literature_sources,
    },
  },
  decisions: compactDecisions,
  detail: {
    before,
    after,
    promote_results: promoteResults,
    decisions: compactDecisions,
  },
});

console.log(JSON.stringify({
  ...artifact,
  apply: APPLY,
  promote: PROMOTE,
  decision_summary: {
    by_status: countBy(compactDecisions, (decision) => decision.to_status),
    by_direction: countBy(compactDecisions, (decision) => decision.direction),
    by_collection_role: countBy(compactDecisions, (decision) => decision.collection_role),
    by_triage_band: countBy(compactDecisions, (decision) => decision.triage_band),
  },
  promotion_summary: {
    attempted: promoteResults.length,
    by_status: countBy(promoteResults, (result) => result.status),
  },
  db_delta: {
    candidates: after.candidates - before.candidates,
    literature_records: after.literature_records - before.literature_records,
    literature_sources: after.literature_sources - before.literature_sources,
  },
}, null, 2));
