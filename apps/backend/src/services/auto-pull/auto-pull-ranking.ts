import { AppError } from '../../errors/app-error.js';
import type { LiteratureAcquisitionSettingsService } from '../literature-acquisition-settings-service.js';
import type { LiteratureContentProcessingSettingsService } from '../literature-content-processing-settings-service.js';
import {
  defaultLlmConfig,
  type LlmConfigReader,
  type LlmFeatureCallConfig,
} from '../llm-config-loader.js';
import { BackendLlmGateway } from '../llm-gateway.js';
import { AUTOPULL_ALERT_CODES } from './auto-pull-alert-codes.js';
import type {
  AutoPullRankingMode,
  FetchedCandidate,
  PublicationStatusSignal,
  RankedCandidate,
} from './auto-pull-types.js';

type QualityScorerConfig = {
  endpoint: string | null;
  apiKey: string | null;
  model: string;
  promptVersion: string;
  enabled: boolean;
  call: LlmFeatureCallConfig | null;
  llmGateway?: BackendLlmGateway;
};

export async function scoreAutoPullRankedCandidates(
  candidates: FetchedCandidate[],
  rankingMode: AutoPullRankingMode,
  dependencies: {
    contentProcessingSettingsService?: LiteratureContentProcessingSettingsService;
    acquisitionSettingsService?: LiteratureAcquisitionSettingsService;
    llmConfig?: LlmConfigReader;
    llmGateway?: BackendLlmGateway;
  } = {},
): Promise<RankedCandidate[]> {
  if (candidates.length === 0) {
    return [];
  }
  const scorerConfig = await resolveQualityScorerConfig(dependencies);
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

async function resolveQualityScorerConfig(dependencies: {
  contentProcessingSettingsService?: LiteratureContentProcessingSettingsService;
  acquisitionSettingsService?: LiteratureAcquisitionSettingsService;
  llmConfig?: LlmConfigReader;
  llmGateway?: BackendLlmGateway;
}): Promise<QualityScorerConfig> {
  const endpoint = (process.env.AUTO_PULL_LLM_SCORER_URL ?? '').trim();
  if (endpoint) {
    const apiKey = (process.env.AUTO_PULL_LLM_SCORER_API_KEY ?? '').trim() || null;
    const model = (process.env.AUTO_PULL_LLM_SCORER_MODEL ?? 'quality-score-v1').trim() || 'quality-score-v1';
    return {
      endpoint,
      apiKey,
      model,
      promptVersion: 'external_endpoint',
      enabled: true,
      call: null,
    };
  }

  const profile = await dependencies.acquisitionSettingsService?.resolveQualityScorerProfile();
  if (profile && !profile.enabled) {
    return {
      endpoint: null,
      apiKey: null,
      model: profile.model,
      promptVersion: profile.prompt_version,
      enabled: false,
      call: null,
    };
  }

  const llmConfig = dependencies.llmConfig ?? defaultLlmConfig();
  const call = llmConfig.getCall('literature-processing', 'auto-pull-quality');
  if (call.provider.id !== 'openai') {
    throw new Error('literature-processing/auto-pull-quality must use the supported openai provider.');
  }
  return {
    endpoint: null,
    apiKey: null,
    model: profile?.model ?? call.model,
    promptVersion: profile?.prompt_version ?? call.version,
    enabled: true,
    call,
    llmGateway: dependencies.llmGateway ?? new BackendLlmGateway({
      settingsService: dependencies.contentProcessingSettingsService,
      llmConfig,
    }),
  };
}

async function scoreQualityCandidate(
  candidate: FetchedCandidate,
  config: QualityScorerConfig,
): Promise<number> {
  if (!config.enabled) {
    return computeRuleOnlyQualityScore(candidate);
  }
  if (!config.endpoint) {
    return scoreQualityCandidateViaOpenAI(candidate, config);
  }
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

async function scoreQualityCandidateViaOpenAI(
  candidate: FetchedCandidate,
  config: QualityScorerConfig,
): Promise<number> {
  if (!config.llmGateway) {
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      `${AUTOPULL_ALERT_CODES.QUALITY_SCORE_UNAVAILABLE}: LLM gateway is not configured.`,
    );
  }
  if (!config.call?.prompts.system) {
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      `${AUTOPULL_ALERT_CODES.QUALITY_SCORE_UNAVAILABLE}: auto-pull LLM prompt is not configured.`,
    );
  }
  try {
    const response = await config.llmGateway.createStructuredOutput<{ quality_score?: number }>({
      executionContext: {
        feature: 'literature_auto_pull',
        operation: 'quality_score',
        metadata: {
          provider: candidate.item.provider,
          source_url: candidate.item.source_url,
        },
      },
      model: {
        providerId: 'openai',
        modelId: config.model,
        profileId: 'literature-auto-pull-quality',
      },
      prompt: {
        promptTemplateId: 'literature-auto-pull-quality',
        version: config.promptVersion,
      },
      messages: [
        {
          role: 'system',
          content: config.call.prompts.system,
        },
        {
          role: 'user',
          content: JSON.stringify({
            prompt_version: config.promptVersion,
            title: candidate.item.title,
            abstract: candidate.item.abstract ?? null,
            authors: candidate.item.authors ?? [],
            year: candidate.item.year ?? null,
            doi: candidate.item.doi ?? null,
            arxiv_id: candidate.item.arxiv_id ?? null,
            source_url: candidate.item.source_url,
            provider: candidate.item.provider,
            ranking_signals: candidate.rankingSignals,
          }),
        },
      ],
      schemaName: 'auto_pull_quality_score',
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['quality_score'],
        properties: {
          quality_score: { type: 'number', minimum: 0, maximum: 100 },
        },
      },
      parameters: { ...config.call.parameters },
      tools: config.call.tools,
    });
    const parsed = readQualityScore(response.parsed);
    if (parsed === null) {
      throw new AppError(
        500,
        'INTERNAL_ERROR',
        `${AUTOPULL_ALERT_CODES.QUALITY_SCORE_UNAVAILABLE}: OpenAI scorer response missing score.`,
      );
    }
    return parsed;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      `${AUTOPULL_ALERT_CODES.QUALITY_SCORE_UNAVAILABLE}: OpenAI scorer request failed: ${error instanceof Error ? error.message : 'unknown error'}.`,
    );
  }
}

function computeRuleOnlyQualityScore(candidate: FetchedCandidate): number {
  const hasAbstract = candidate.item.abstract?.trim() ? 20 : 0;
  const hasIdentifier = candidate.item.doi || candidate.item.arxiv_id ? 20 : 0;
  const freshness = computeFreshnessScore(candidate.rankingSignals.publicationYear) * 0.25;
  const status = computePublicationStatusScore(candidate.rankingSignals.publicationStatus) * 0.2;
  const citations = computeCitationScore(candidate.rankingSignals.citationCount) * 0.15;
  return Math.round(Math.max(0, Math.min(100, hasAbstract + hasIdentifier + freshness + status + citations)));
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
