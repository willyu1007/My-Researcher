import { AppError } from '../../errors/app-error.js';
import { AUTOPULL_ALERT_CODES } from './auto-pull-alert-codes.js';
import type {
  AutoPullRankingMode,
  FetchedCandidate,
  PublicationStatusSignal,
  RankedCandidate,
} from './auto-pull-types.js';

type QualityScorerConfig = {
  endpoint: string;
  apiKey: string | null;
  model: string;
};

export async function scoreAutoPullRankedCandidates(
  candidates: FetchedCandidate[],
  rankingMode: AutoPullRankingMode,
): Promise<RankedCandidate[]> {
  if (candidates.length === 0) {
    return [];
  }
  const scorerConfig = resolveQualityScorerConfig();
  const scored: RankedCandidate[] = [];
  for (const candidate of candidates) {
    const qualityScore = await scoreQualityCandidate(candidate, scorerConfig);
    const rankingScore = computeRankingScore(candidate, qualityScore, rankingMode);
    scored.push({
      candidate,
      qualityScore,
      rankingScore,
      rankingMode,
    });
  }
  return scored;
}

export function readAutoPullRankingMode(config: Record<string, unknown>): AutoPullRankingMode {
  const mode = readString(config.sort_mode);
  return mode === 'hybrid_score' ? 'hybrid_score' : 'llm_score';
}

function computeRankingScore(
  candidate: FetchedCandidate,
  qualityScore: number,
  rankingMode: AutoPullRankingMode,
): number {
  if (rankingMode === 'llm_score') {
    return qualityScore;
  }
  const freshness = computeFreshnessScore(candidate.rankingSignals.publicationYear);
  const publicationStatus = computePublicationStatusScore(candidate.rankingSignals.publicationStatus);
  const citation = computeCitationScore(candidate.rankingSignals.citationCount);
  const weighted = (qualityScore * 0.70) + (freshness * 0.15) + (publicationStatus * 0.10) + (citation * 0.05);
  return Math.round(Math.max(0, Math.min(100, weighted)));
}

function computeFreshnessScore(publicationYear: number | null): number {
  if (!publicationYear || !Number.isFinite(publicationYear)) {
    return 0;
  }
  const age = Math.max(0, new Date().getUTCFullYear() - publicationYear);
  return Math.max(0, Math.round(100 - (age * 5)));
}

function computePublicationStatusScore(status: PublicationStatusSignal): number {
  if (status === 'published') {
    return 100;
  }
  if (status === 'accepted') {
    return 80;
  }
  if (status === 'preprint') {
    return 50;
  }
  return 0;
}

function computeCitationScore(citationCount: number | null): number {
  if (!citationCount || citationCount <= 0) {
    return 0;
  }
  const normalized = Math.log10(citationCount + 1) / Math.log10(501);
  return Math.round(Math.max(0, Math.min(1, normalized)) * 100);
}

function resolveQualityScorerConfig(): QualityScorerConfig {
  const endpoint = (process.env.AUTO_PULL_LLM_SCORER_URL ?? '').trim();
  if (!endpoint) {
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      `${AUTOPULL_ALERT_CODES.QUALITY_SCORE_UNAVAILABLE}: scorer endpoint is not configured.`,
    );
  }
  const apiKey = (process.env.AUTO_PULL_LLM_SCORER_API_KEY ?? '').trim() || null;
  const model = (process.env.AUTO_PULL_LLM_SCORER_MODEL ?? 'quality-score-v1').trim() || 'quality-score-v1';
  return { endpoint, apiKey, model };
}

async function scoreQualityCandidate(
  candidate: FetchedCandidate,
  config: QualityScorerConfig,
): Promise<number> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      input: {
        title: candidate.item.title,
        abstract: candidate.item.abstract ?? null,
        authors: candidate.item.authors ?? [],
        year: candidate.item.year ?? null,
        doi: candidate.item.doi ?? null,
        arxiv_id: candidate.item.arxiv_id ?? null,
        source_url: candidate.item.source_url,
        provider: candidate.item.provider,
      },
    }),
  });
  if (!response.ok) {
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      `${AUTOPULL_ALERT_CODES.QUALITY_SCORE_UNAVAILABLE}: scorer request failed with status ${response.status}.`,
    );
  }
  const payload = (await response.json()) as Record<string, unknown>;
  const score = readQualityScore(payload);
  if (score === null) {
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      `${AUTOPULL_ALERT_CODES.QUALITY_SCORE_UNAVAILABLE}: scorer response missing score.`,
    );
  }
  return score;
}

function readQualityScore(payload: Record<string, unknown>): number | null {
  const directScore = readNonNegativeNumber(payload.quality_score);
  if (directScore !== null) {
    return Math.round(Math.max(0, Math.min(100, directScore)));
  }
  const fallbackScore = readNonNegativeNumber(payload.score);
  if (fallbackScore !== null) {
    return Math.round(Math.max(0, Math.min(100, fallbackScore)));
  }
  return null;
}

function readNonNegativeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
