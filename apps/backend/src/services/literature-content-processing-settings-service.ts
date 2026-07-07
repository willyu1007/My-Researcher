import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import type {
  LiteratureFulltextParserHealthDTO,
  LiteratureContentProcessingProviderId,
  LiteratureContentProcessingSettingsDTO,
  LiteratureContentProcessingStorageRootsDTO,
  LiteratureEmbeddingProfileDTO,
  LiteratureEmbeddingProfileId,
  LiteratureExtractionProfileDTO,
  LiteratureExtractionProfileId,
  LiteratureKeyContentReadyMethod,
  UpdateLiteratureContentProcessingSettingsRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import { AppError } from '../errors/app-error.js';
import type { ApplicationSettingsRepository } from '../repositories/application-settings-repository.js';

const SETTINGS_NAMESPACE = 'literature_content_processing';
const OPENAI_PROVIDER: LiteratureContentProcessingProviderId = 'openai';
const DASHSCOPE_PROVIDER: LiteratureContentProcessingProviderId = 'dashscope';
const PROVIDER_OPENAI_KEY = 'provider.openai';
const PROVIDER_DASHSCOPE_KEY = 'provider.dashscope';
const EMBEDDING_KEY = 'embedding';
const EXTRACTION_KEY = 'extraction';
const STORAGE_ROOTS_KEY = 'storage_roots';
const FULLTEXT_PARSER_KEY = 'fulltext_parser';
const AUTO_ADVANCE_KEY = 'auto_advance';
const DEFAULT_GROBID_ENDPOINT_URL = 'http://localhost:8070';
export const PAPER_ENGINEER_LOCAL_DATA_ROOT_ENV = 'PAPER_ENGINEER_LOCAL_DATA_ROOT';
export const LITERATURE_CONTENT_PROCESSING_ROOT_ENV = 'LITERATURE_CONTENT_PROCESSING_ROOT';
export const LITERATURE_KEY_CONTENT_READY_METHOD_ENV = 'LITERATURE_KEY_CONTENT_READY_METHOD';
export const DEFAULT_PAPER_ENGINEER_LOCAL_DATA_ROOT = '/Volumes/DataDisk/Data/PaperEngineer';

export function resolveDefaultPaperEngineerLocalDataRoot(): string {
  return resolveConfiguredFilesystemPath(process.env[PAPER_ENGINEER_LOCAL_DATA_ROOT_ENV])
    ?? DEFAULT_PAPER_ENGINEER_LOCAL_DATA_ROOT;
}

export function resolveDefaultLiteratureContentProcessingRoot(): string {
  return resolveConfiguredFilesystemPath(process.env[LITERATURE_CONTENT_PROCESSING_ROOT_ENV])
    ?? path.join(resolveDefaultPaperEngineerLocalDataRoot(), 'literature-content-processing');
}

function resolveConfiguredFilesystemPath(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed === '~') {
    return os.homedir();
  }
  if (trimmed.startsWith('~/')) {
    return path.join(os.homedir(), trimmed.slice(2));
  }
  return path.resolve(trimmed);
}

function readConfiguredKeyContentReadyMethod(value: string | undefined): LiteratureKeyContentReadyMethod | null {
  const trimmed = value?.trim();
  return trimmed === 'llm_gateway' || trimmed === 'codex_curated' || trimmed === 'manual_curated'
    ? trimmed
    : null;
}

const DEFAULT_EMBEDDING_PROFILES: LiteratureEmbeddingProfileDTO[] = [
  {
    profile_id: 'default',
    provider: OPENAI_PROVIDER,
    model: 'text-embedding-3-large',
    dimensions: null,
  },
  {
    profile_id: 'economy',
    provider: OPENAI_PROVIDER,
    model: 'text-embedding-3-small',
    dimensions: null,
  },
];

const DEFAULT_EXTRACTION_PROFILES: LiteratureExtractionProfileDTO[] = [
  {
    profile_id: 'default',
    provider: OPENAI_PROVIDER,
    model: 'gpt-5.5',
  },
  {
    profile_id: 'high_accuracy',
    provider: OPENAI_PROVIDER,
    model: 'gpt-5.5',
  },
];

const DEFAULT_EXTRACTION_RUNTIME: LiteratureContentProcessingSettingsDTO['extraction']['runtime'] = {
  preferred_key_content_method: 'codex_curated',
  section_concurrency: 3,
  request_timeout_ms: 120_000,
  max_retries: 1,
  prompt_profile_id: 'literature_key_content_v2',
  diagnostic_policy: 'actionable_v1',
};

const LEGACY_EXTRACTION_MODEL_BY_PROFILE: Partial<Record<LiteratureExtractionProfileId, string>> = {
  default: 'gpt-5.5',
  high_accuracy: 'gpt-5.5',
};

export type OpenAIEmbeddingConfig = {
  apiKey: string;
  profileId: LiteratureEmbeddingProfileId;
  model: string;
  dimensions: number | null;
};

export type ActiveEmbeddingProfileConfig = {
  profileId: LiteratureEmbeddingProfileId;
  provider: LiteratureContentProcessingProviderId;
  model: string;
  dimensions: number | null;
};

export type OpenAIExtractionConfig = {
  apiKey: string;
  provider: LiteratureContentProcessingProviderId;
  model: string;
  profileId: LiteratureExtractionProfileId;
  runtime: LiteratureContentProcessingSettingsDTO['extraction']['runtime'];
};

export class LiteratureContentProcessingSettingsService {
  constructor(private readonly repository: ApplicationSettingsRepository) {}

  async getSettings(): Promise<LiteratureContentProcessingSettingsDTO> {
    const [providerOpenAI, providerDashScope, embedding, extraction, storageRoots, fulltextParser] = await Promise.all([
      this.repository.findSetting(SETTINGS_NAMESPACE, PROVIDER_OPENAI_KEY),
      this.repository.findSetting(SETTINGS_NAMESPACE, PROVIDER_DASHSCOPE_KEY),
      this.repository.findSetting(SETTINGS_NAMESPACE, EMBEDDING_KEY),
      this.repository.findSetting(SETTINGS_NAMESPACE, EXTRACTION_KEY),
      this.repository.findSetting(SETTINGS_NAMESPACE, STORAGE_ROOTS_KEY),
      this.repository.findSetting(SETTINGS_NAMESPACE, FULLTEXT_PARSER_KEY),
    ]);

    const embeddingSettings = this.readEmbeddingSettings(embedding?.value);
    const extractionSettings = this.readExtractionSettings(extraction?.value);
    const storageRootSettings = this.readStorageRoots(storageRoots?.value);
    const fulltextParserSettings = this.readFulltextParserSettings(fulltextParser?.value);
    const updatedAt = [
      providerOpenAI?.updatedAt,
      providerDashScope?.updatedAt,
      embedding?.updatedAt,
      extraction?.updatedAt,
      storageRoots?.updatedAt,
      fulltextParser?.updatedAt,
    ]
      .filter((value): value is string => typeof value === 'string')
      .sort()
      .at(-1) ?? new Date().toISOString();

    return {
      providers: [
        {
          provider: OPENAI_PROVIDER,
          api_key_set: Boolean(providerOpenAI?.secretValue) || Boolean(process.env.OPENAI_API_KEY?.trim()),
          api_key_last_updated_at: this.readString(providerOpenAI?.value.api_key_last_updated_at),
        },
        {
          provider: DASHSCOPE_PROVIDER,
          api_key_set: Boolean(providerDashScope?.secretValue) || Boolean(process.env.DASHSCOPE_API_KEY?.trim()),
          api_key_last_updated_at: this.readString(providerDashScope?.value.api_key_last_updated_at),
        },
      ],
      embedding: embeddingSettings,
      extraction: extractionSettings,
      storage_roots: storageRootSettings,
      effective_storage_roots: this.resolveEffectiveStorageRoots(storageRootSettings),
      fulltext_parser: fulltextParserSettings,
      updated_at: updatedAt,
    };
  }

  async updateSettings(
    patch: UpdateLiteratureContentProcessingSettingsRequest,
  ): Promise<LiteratureContentProcessingSettingsDTO> {
    const now = new Date().toISOString();

    if (patch.providers) {
      for (const providerPatch of patch.providers) {
        if (providerPatch.provider !== OPENAI_PROVIDER && providerPatch.provider !== DASHSCOPE_PROVIDER) {
          throw new AppError(400, 'INVALID_PAYLOAD', `Unsupported provider ${providerPatch.provider}.`);
        }
        if (providerPatch.provider === OPENAI_PROVIDER) {
          await this.updateOpenAIProvider(providerPatch.api_key, now);
        } else {
          await this.updateDashScopeProvider(providerPatch.api_key, now);
        }
      }
    }

    if (patch.embedding) {
      await this.updateEmbeddingSettings(patch.embedding, now);
    }

    if (patch.extraction) {
      await this.updateExtractionSettings(patch.extraction, now);
    }

    if (patch.storage_roots) {
      await this.updateStorageRoots(patch.storage_roots, now);
    }

    if (patch.fulltext_parser) {
      await this.updateFulltextParserSettings(patch.fulltext_parser, now);
    }

    return this.getSettings();
  }

  async getEffectiveStorageRoots(): Promise<LiteratureContentProcessingStorageRootsDTO> {
    const settings = await this.getSettings();
    return settings.effective_storage_roots;
  }

  async resolveStorageRoot(key: keyof LiteratureContentProcessingStorageRootsDTO): Promise<string> {
    const roots = await this.getEffectiveStorageRoots();
    const root = roots[key];
    if (!root) {
      throw new AppError(500, 'INTERNAL_ERROR', `Storage root ${key} is not available.`);
    }
    return root;
  }

  async resolveGrobidEndpointUrl(): Promise<string> {
    const settings = await this.getSettings();
    return settings.fulltext_parser.grobid.endpoint_url;
  }

  // T-130 W-06 (D8): import auto-advance gate. Lightweight settings-row resolver for now — the
  // aggregated DTO / update-route face lands with the unified W-10 configuration pass. Toggling
  // is a settings-store write (no deploy), which satisfies D8's runtime kill-switch requirement.
  async resolveAutoAdvanceSettings(): Promise<LiteratureAutoAdvanceRuntimeSettings> {
    const record = await this.repository.findSetting(SETTINGS_NAMESPACE, AUTO_ADVANCE_KEY);
    const value = (record?.value ?? {}) as Record<string, unknown>;
    const readNumber = (key: string, fallback: number, min: number, max: number): number => {
      const raw = Number(value[key]);
      return Number.isFinite(raw) ? Math.min(max, Math.max(min, Math.trunc(raw))) : fallback;
    };
    const unscoredRaw = value.advance_unscored;
    const advanceUnscored = unscoredRaw === 'fulltext' || unscoredRaw === 'full' ? unscoredRaw : 'none';
    return {
      enabled: value.enabled === true,
      full_chain_min_score: readNumber('full_chain_min_score', 75, 0, 100),
      fulltext_only_min_score: readNumber('fulltext_only_min_score', 55, 0, 100),
      daily_literature_limit: readNumber('daily_literature_limit', 50, 1, 1_000),
      max_parallel_literature_runs: readNumber('max_parallel_literature_runs', 2, 1, 4),
      advance_unscored: advanceUnscored,
    };
  }

  async checkFulltextParserHealth(): Promise<LiteratureFulltextParserHealthDTO> {
    const endpointUrl = await this.resolveGrobidEndpointUrl();
    const checkedAt = new Date().toISOString();
    try {
      const health = await this.fetchGrobidHealth(endpointUrl);
      const details = await this.readResponseBody(health);
      const version = await this.tryReadGrobidVersion(endpointUrl);
      return {
        provider: 'grobid',
        endpoint_url: endpointUrl,
        status: health.ok ? 'ready' : 'unavailable',
        checked_at: checkedAt,
        version,
        details,
      };
    } catch (error) {
      return {
        provider: 'grobid',
        endpoint_url: endpointUrl,
        status: 'unavailable',
        checked_at: checkedAt,
        version: null,
        details: {
          error: error instanceof Error ? error.message : 'GROBID health check failed.',
        },
      };
    }
  }

  private async fetchGrobidHealth(endpointUrl: string): Promise<Response> {
    const health = await fetch(`${endpointUrl}/api/health`, {
      headers: { Accept: 'application/json' },
    });
    if (health.status !== 404) {
      return health;
    }
    return fetch(`${endpointUrl}/api/isalive`, {
      headers: { Accept: 'text/plain, application/json' },
    });
  }

  async resolveOpenAIEmbeddingConfig(
    profileId?: LiteratureEmbeddingProfileId,
  ): Promise<OpenAIEmbeddingConfig | null> {
    const [providerOpenAI, settings] = await Promise.all([
      this.repository.findSetting(SETTINGS_NAMESPACE, PROVIDER_OPENAI_KEY),
      this.getSettings(),
    ]);
    const apiKey = providerOpenAI?.secretValue?.trim() || process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return null;
    }

    const selectedProfileId = profileId ?? settings.embedding.active_profile_id;
    const profile = settings.embedding.profiles.find((item) => item.profile_id === selectedProfileId);
    if (!profile || profile.provider !== OPENAI_PROVIDER) {
      return null;
    }

    return {
      apiKey,
      profileId: selectedProfileId,
      model: profile.model,
      dimensions: profile.dimensions,
    };
  }

  async resolveOpenAIProviderApiKey(): Promise<string | null> {
    const providerOpenAI = await this.repository.findSetting(SETTINGS_NAMESPACE, PROVIDER_OPENAI_KEY);
    const apiKey = providerOpenAI?.secretValue?.trim() || process.env.OPENAI_API_KEY?.trim();
    return apiKey || null;
  }

  async resolveActiveEmbeddingProfile(): Promise<ActiveEmbeddingProfileConfig> {
    const settings = await this.getSettings();
    const profile = settings.embedding.profiles.find((item) => item.profile_id === settings.embedding.active_profile_id);
    if (!profile) {
      throw new AppError(500, 'INTERNAL_ERROR', `Active embedding profile ${settings.embedding.active_profile_id} is not configured.`);
    }
    return {
      profileId: profile.profile_id,
      provider: profile.provider,
      model: profile.model,
      dimensions: profile.dimensions,
    };
  }

  async resolveOpenAIExtractionConfig(
    profileId?: LiteratureExtractionProfileId,
  ): Promise<OpenAIExtractionConfig | null> {
    const config = await this.resolveExtractionConfig(profileId);
    return config?.provider === OPENAI_PROVIDER ? config : null;
  }

  async resolveExtractionConfig(
    profileId?: LiteratureExtractionProfileId,
  ): Promise<OpenAIExtractionConfig | null> {
    const [providerOpenAI, settings] = await Promise.all([
      this.repository.findSetting(SETTINGS_NAMESPACE, PROVIDER_OPENAI_KEY),
      this.getSettings(),
    ]);
    const selectedProfileId = profileId ?? settings.extraction.active_profile_id;
    const profile = settings.extraction.profiles.find((item) => item.profile_id === selectedProfileId);
    if (!profile) {
      return null;
    }
    const apiKey = profile.provider === DASHSCOPE_PROVIDER
      ? await this.resolveDashScopeProviderApiKey()
      : providerOpenAI?.secretValue?.trim() || process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return null;
    }

    return {
      apiKey,
      provider: profile.provider,
      model: profile.model,
      profileId: selectedProfileId,
      runtime: settings.extraction.runtime,
    };
  }

  async resolveDashScopeProviderApiKey(): Promise<string | null> {
    const providerDashScope = await this.repository.findSetting(SETTINGS_NAMESPACE, PROVIDER_DASHSCOPE_KEY);
    const apiKey = providerDashScope?.secretValue?.trim() || process.env.DASHSCOPE_API_KEY?.trim();
    return apiKey || null;
  }

  async resolvePreferredKeyContentMethod(): Promise<LiteratureKeyContentReadyMethod> {
    const settings = await this.getSettings();
    return settings.extraction.runtime.preferred_key_content_method;
  }

  private async updateOpenAIProvider(apiKeyPatch: string | null | undefined, now: string): Promise<void> {
    if (apiKeyPatch === undefined) {
      return;
    }

    const existing = await this.repository.findSetting(SETTINGS_NAMESPACE, PROVIDER_OPENAI_KEY);
    const apiKey = apiKeyPatch === null ? null : apiKeyPatch.trim();
    if (apiKeyPatch !== null && !apiKey) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'OpenAI API key cannot be blank.');
    }

    const value = {
      provider: OPENAI_PROVIDER,
      api_key_last_updated_at: apiKey ? now : null,
    };

    await this.repository.upsertSetting({
      id: existing?.id ?? crypto.randomUUID(),
      namespace: SETTINGS_NAMESPACE,
      key: PROVIDER_OPENAI_KEY,
      value,
      secretValue: apiKey,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }

  private async updateDashScopeProvider(apiKeyPatch: string | null | undefined, now: string): Promise<void> {
    if (apiKeyPatch === undefined) {
      return;
    }

    const existing = await this.repository.findSetting(SETTINGS_NAMESPACE, PROVIDER_DASHSCOPE_KEY);
    const apiKey = apiKeyPatch === null ? null : apiKeyPatch.trim();
    if (apiKeyPatch !== null && !apiKey) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'DashScope API key cannot be blank.');
    }

    const value = {
      provider: DASHSCOPE_PROVIDER,
      api_key_last_updated_at: apiKey ? now : null,
    };

    await this.repository.upsertSetting({
      id: existing?.id ?? crypto.randomUUID(),
      namespace: SETTINGS_NAMESPACE,
      key: PROVIDER_DASHSCOPE_KEY,
      value,
      secretValue: apiKey,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }

  private async updateEmbeddingSettings(
    patch: NonNullable<UpdateLiteratureContentProcessingSettingsRequest['embedding']>,
    now: string,
  ): Promise<void> {
    const existing = await this.repository.findSetting(SETTINGS_NAMESPACE, EMBEDDING_KEY);
    const current = this.readEmbeddingSettings(existing?.value);
    const profiles = [...current.profiles];

    for (const profilePatch of patch.profiles ?? []) {
      const nextProfile = this.normalizeEmbeddingProfile(profilePatch);
      const existingIndex = profiles.findIndex((item) => item.profile_id === nextProfile.profile_id);
      if (existingIndex >= 0) {
        profiles[existingIndex] = nextProfile;
      } else {
        profiles.push(nextProfile);
      }
    }

    const activeProfileId = patch.active_profile_id ?? current.active_profile_id;
    if (!profiles.some((item) => item.profile_id === activeProfileId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `Unknown embedding profile ${activeProfileId}.`);
    }

    await this.repository.upsertSetting({
      id: existing?.id ?? crypto.randomUUID(),
      namespace: SETTINGS_NAMESPACE,
      key: EMBEDDING_KEY,
      value: {
        active_profile_id: activeProfileId,
        profiles,
      },
      secretValue: existing?.secretValue ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }

  private async updateExtractionSettings(
    patch: NonNullable<UpdateLiteratureContentProcessingSettingsRequest['extraction']>,
    now: string,
  ): Promise<void> {
    const existing = await this.repository.findSetting(SETTINGS_NAMESPACE, EXTRACTION_KEY);
    const current = this.readExtractionSettings(existing?.value);
    const profiles = [...current.profiles];

    for (const profilePatch of patch.profiles ?? []) {
      const nextProfile = this.normalizeExtractionProfile(profilePatch);
      const existingIndex = profiles.findIndex((item) => item.profile_id === nextProfile.profile_id);
      if (existingIndex >= 0) {
        profiles[existingIndex] = nextProfile;
      } else {
        profiles.push(nextProfile);
      }
    }

    const activeProfileId = patch.active_profile_id ?? current.active_profile_id;
    if (!profiles.some((item) => item.profile_id === activeProfileId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `Unknown extraction profile ${activeProfileId}.`);
    }
    const runtime = this.mergeExtractionRuntime(current.runtime, patch.runtime);

    await this.repository.upsertSetting({
      id: existing?.id ?? crypto.randomUUID(),
      namespace: SETTINGS_NAMESPACE,
      key: EXTRACTION_KEY,
      value: {
        active_profile_id: activeProfileId,
        profiles,
        runtime,
      },
      secretValue: existing?.secretValue ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }

  private async updateStorageRoots(
    patch: NonNullable<UpdateLiteratureContentProcessingSettingsRequest['storage_roots']>,
    now: string,
  ): Promise<void> {
    const existing = await this.repository.findSetting(SETTINGS_NAMESPACE, STORAGE_ROOTS_KEY);
    const current = this.readStorageRoots(existing?.value);
    const next: LiteratureContentProcessingStorageRootsDTO = { ...current };
    const keys: Array<keyof LiteratureContentProcessingStorageRootsDTO> = [
      'raw_files',
      'normalized_text',
      'artifacts_cache',
      'indexes',
      'exports',
    ];

    for (const key of keys) {
      if (!(key in patch)) {
        continue;
      }
      const value = patch[key];
      next[key] = value === null || value === undefined ? null : this.normalizePath(value, key);
    }

    await this.repository.upsertSetting({
      id: existing?.id ?? crypto.randomUUID(),
      namespace: SETTINGS_NAMESPACE,
      key: STORAGE_ROOTS_KEY,
      value: { ...next },
      secretValue: existing?.secretValue ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }

  private async updateFulltextParserSettings(
    patch: NonNullable<UpdateLiteratureContentProcessingSettingsRequest['fulltext_parser']>,
    now: string,
  ): Promise<void> {
    const existing = await this.repository.findSetting(SETTINGS_NAMESPACE, FULLTEXT_PARSER_KEY);
    const current = this.readFulltextParserSettings(existing?.value);
    const next = {
      grobid: {
        endpoint_url: patch.grobid?.endpoint_url === undefined
          ? current.grobid.endpoint_url
          : this.normalizeEndpointUrl(patch.grobid.endpoint_url, 'fulltext_parser.grobid.endpoint_url'),
      },
    };

    await this.repository.upsertSetting({
      id: existing?.id ?? crypto.randomUUID(),
      namespace: SETTINGS_NAMESPACE,
      key: FULLTEXT_PARSER_KEY,
      value: next,
      secretValue: existing?.secretValue ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }

  private readEmbeddingSettings(value: Record<string, unknown> | undefined): LiteratureContentProcessingSettingsDTO['embedding'] {
    const rawProfiles = Array.isArray(value?.profiles) ? value.profiles : [];
    const profiles = rawProfiles
      .map((item) => this.readEmbeddingProfile(item))
      .filter((item): item is LiteratureEmbeddingProfileDTO => item !== null);
    const mergedProfiles = this.mergeDefaultProfiles(profiles);
    const activeProfileId = this.readEmbeddingProfileId(value?.active_profile_id) ?? 'default';

    return {
      active_profile_id: mergedProfiles.some((item) => item.profile_id === activeProfileId) ? activeProfileId : 'default',
      profiles: mergedProfiles,
    };
  }

  private readExtractionSettings(value: Record<string, unknown> | undefined): LiteratureContentProcessingSettingsDTO['extraction'] {
    const rawProfiles = Array.isArray(value?.profiles) ? value.profiles : [];
    const profiles = rawProfiles
      .map((item) => this.readExtractionProfile(item))
      .filter((item): item is LiteratureExtractionProfileDTO => item !== null);
    const mergedProfiles = this.mergeDefaultExtractionProfiles(profiles);
    const activeProfileId = this.readExtractionProfileId(value?.active_profile_id) ?? 'default';

    return {
      active_profile_id: mergedProfiles.some((item) => item.profile_id === activeProfileId) ? activeProfileId : 'default',
      profiles: mergedProfiles,
      runtime: this.readExtractionRuntime(value?.runtime),
    };
  }

  private readStorageRoots(value: Record<string, unknown> | undefined): LiteratureContentProcessingStorageRootsDTO {
    return {
      raw_files: this.readNullableString(value?.raw_files),
      normalized_text: this.readNullableString(value?.normalized_text),
      artifacts_cache: this.readNullableString(value?.artifacts_cache),
      indexes: this.readNullableString(value?.indexes),
      exports: this.readNullableString(value?.exports),
    };
  }

  private readFulltextParserSettings(value: Record<string, unknown> | undefined): LiteratureContentProcessingSettingsDTO['fulltext_parser'] {
    const grobid = value?.grobid && typeof value.grobid === 'object' && !Array.isArray(value.grobid)
      ? value.grobid as Record<string, unknown>
      : {};
    return {
      grobid: {
        endpoint_url: this.readString(grobid.endpoint_url) ?? DEFAULT_GROBID_ENDPOINT_URL,
      },
    };
  }

  private normalizeEmbeddingProfile(input: {
    profile_id: LiteratureEmbeddingProfileId;
    provider: LiteratureContentProcessingProviderId;
    model: string;
    dimensions?: number | null;
  }): LiteratureEmbeddingProfileDTO {
    const model = input.model.trim();
    if (!model) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Embedding profile model cannot be blank.');
    }
    if (input.provider !== OPENAI_PROVIDER) {
      throw new AppError(400, 'INVALID_PAYLOAD', `Unsupported embedding provider ${input.provider}.`);
    }
    if (input.dimensions !== undefined && input.dimensions !== null && input.dimensions < 1) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Embedding dimensions must be a positive integer or null.');
    }

    return {
      profile_id: input.profile_id,
      provider: input.provider,
      model,
      dimensions: input.dimensions ?? null,
    };
  }

  private normalizeExtractionProfile(input: {
    profile_id: LiteratureExtractionProfileId;
    provider: LiteratureContentProcessingProviderId;
    model: string;
  }): LiteratureExtractionProfileDTO {
    const model = input.model.trim();
    if (!model) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Extraction profile model cannot be blank.');
    }
    if (input.provider !== OPENAI_PROVIDER && input.provider !== DASHSCOPE_PROVIDER) {
      throw new AppError(400, 'INVALID_PAYLOAD', `Unsupported extraction provider ${input.provider}.`);
    }

    return {
      profile_id: input.profile_id,
      provider: input.provider,
      model,
    };
  }

  private readEmbeddingProfile(value: unknown): LiteratureEmbeddingProfileDTO | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    const row = value as Record<string, unknown>;
    const profileId = this.readEmbeddingProfileId(row.profile_id);
    const provider = row.provider === OPENAI_PROVIDER ? OPENAI_PROVIDER : null;
    const model = this.readString(row.model);
    const dimensions = typeof row.dimensions === 'number' && Number.isInteger(row.dimensions) && row.dimensions > 0
      ? row.dimensions
      : null;
    if (!profileId || !provider || !model) {
      return null;
    }
    return {
      profile_id: profileId,
      provider,
      model,
      dimensions,
    };
  }

  private readExtractionProfile(value: unknown): LiteratureExtractionProfileDTO | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    const row = value as Record<string, unknown>;
    const profileId = this.readExtractionProfileId(row.profile_id);
    const provider = row.provider === OPENAI_PROVIDER
      ? OPENAI_PROVIDER
      : row.provider === DASHSCOPE_PROVIDER
        ? DASHSCOPE_PROVIDER
        : null;
    const model = this.readString(row.model);
    if (!profileId || !provider || !model) {
      return null;
    }
    return {
      profile_id: profileId,
      provider,
      model,
    };
  }

  private readExtractionRuntime(value: unknown): LiteratureContentProcessingSettingsDTO['extraction']['runtime'] {
    const row = value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
    return {
      preferred_key_content_method: this.readKeyContentReadyMethod(row.preferred_key_content_method)
        ?? this.resolveDefaultKeyContentReadyMethod(),
      section_concurrency: this.clampInteger(
        this.readNumber(row.section_concurrency, DEFAULT_EXTRACTION_RUNTIME.section_concurrency),
        DEFAULT_EXTRACTION_RUNTIME.section_concurrency,
        1,
        8,
      ),
      request_timeout_ms: this.clampInteger(
        this.readNumber(row.request_timeout_ms, DEFAULT_EXTRACTION_RUNTIME.request_timeout_ms),
        DEFAULT_EXTRACTION_RUNTIME.request_timeout_ms,
        1_000,
        300_000,
      ),
      max_retries: this.clampInteger(
        this.readNumber(row.max_retries, DEFAULT_EXTRACTION_RUNTIME.max_retries),
        DEFAULT_EXTRACTION_RUNTIME.max_retries,
        0,
        3,
      ),
      prompt_profile_id: this.readString(row.prompt_profile_id) ?? DEFAULT_EXTRACTION_RUNTIME.prompt_profile_id,
      diagnostic_policy: this.readString(row.diagnostic_policy) ?? DEFAULT_EXTRACTION_RUNTIME.diagnostic_policy,
    };
  }

  private mergeExtractionRuntime(
    current: LiteratureContentProcessingSettingsDTO['extraction']['runtime'],
    patch: NonNullable<UpdateLiteratureContentProcessingSettingsRequest['extraction']>['runtime'],
  ): LiteratureContentProcessingSettingsDTO['extraction']['runtime'] {
    if (!patch) {
      return current;
    }
    return {
      preferred_key_content_method: patch.preferred_key_content_method === undefined
        ? current.preferred_key_content_method
        : this.normalizeKeyContentReadyMethod(patch.preferred_key_content_method),
      section_concurrency: this.clampInteger(
        patch.section_concurrency,
        current.section_concurrency,
        1,
        8,
      ),
      request_timeout_ms: this.clampInteger(
        patch.request_timeout_ms,
        current.request_timeout_ms,
        1_000,
        300_000,
      ),
      max_retries: this.clampInteger(
        patch.max_retries,
        current.max_retries,
        0,
        3,
      ),
      prompt_profile_id: patch.prompt_profile_id?.trim() || current.prompt_profile_id,
      diagnostic_policy: patch.diagnostic_policy?.trim() || current.diagnostic_policy,
    };
  }

  private readKeyContentReadyMethod(value: unknown): LiteratureKeyContentReadyMethod | null {
    return typeof value === 'string' ? readConfiguredKeyContentReadyMethod(value) : null;
  }

  private resolveDefaultKeyContentReadyMethod(): LiteratureKeyContentReadyMethod {
    return readConfiguredKeyContentReadyMethod(process.env[LITERATURE_KEY_CONTENT_READY_METHOD_ENV])
      ?? DEFAULT_EXTRACTION_RUNTIME.preferred_key_content_method;
  }

  private normalizeKeyContentReadyMethod(value: LiteratureKeyContentReadyMethod): LiteratureKeyContentReadyMethod {
    const method = this.readKeyContentReadyMethod(value);
    if (!method) {
      throw new AppError(400, 'INVALID_PAYLOAD', `Unsupported key-content ready method ${String(value)}.`);
    }
    return method;
  }

  private mergeDefaultProfiles(profiles: LiteratureEmbeddingProfileDTO[]): LiteratureEmbeddingProfileDTO[] {
    const byId = new Map<LiteratureEmbeddingProfileId, LiteratureEmbeddingProfileDTO>();
    for (const profile of DEFAULT_EMBEDDING_PROFILES) {
      byId.set(profile.profile_id, profile);
    }
    for (const profile of profiles) {
      byId.set(profile.profile_id, profile);
    }
    return [...byId.values()].sort((left, right) => {
      const order: Record<LiteratureEmbeddingProfileId, number> = { default: 0, economy: 1 };
      return order[left.profile_id] - order[right.profile_id];
    });
  }

  private mergeDefaultExtractionProfiles(profiles: LiteratureExtractionProfileDTO[]): LiteratureExtractionProfileDTO[] {
    const byId = new Map<LiteratureExtractionProfileId, LiteratureExtractionProfileDTO>();
    for (const profile of DEFAULT_EXTRACTION_PROFILES) {
      byId.set(profile.profile_id, profile);
    }
    for (const profile of profiles) {
      const defaultProfile = DEFAULT_EXTRACTION_PROFILES.find((item) => item.profile_id === profile.profile_id);
      const legacyModel = LEGACY_EXTRACTION_MODEL_BY_PROFILE[profile.profile_id];
      byId.set(profile.profile_id, defaultProfile && profile.model === legacyModel ? defaultProfile : profile);
    }
    return [...byId.values()].sort((left, right) => {
      const order: Record<LiteratureExtractionProfileId, number> = { default: 0, high_accuracy: 1 };
      return order[left.profile_id] - order[right.profile_id];
    });
  }

  private normalizePath(value: string, key: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new AppError(400, 'INVALID_PAYLOAD', `Storage root ${key} cannot be blank.`);
    }
    return trimmed;
  }

  private normalizeEndpointUrl(value: string, key: string): string {
    const trimmed = value.trim().replace(/\/+$/, '');
    if (!trimmed) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${key} cannot be blank.`);
    }
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new AppError(400, 'INVALID_PAYLOAD', `${key} must be a valid URL.`);
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new AppError(400, 'INVALID_PAYLOAD', `${key} must use http or https.`);
    }
    return trimmed;
  }

  private resolveEffectiveStorageRoots(
    configured: LiteratureContentProcessingStorageRootsDTO,
  ): LiteratureContentProcessingStorageRootsDTO {
    const base = resolveDefaultLiteratureContentProcessingRoot();
    return {
      raw_files: configured.raw_files ?? path.join(base, 'raw'),
      normalized_text: configured.normalized_text ?? path.join(base, 'normalized'),
      artifacts_cache: configured.artifacts_cache ?? path.join(base, 'artifacts'),
      indexes: configured.indexes ?? path.join(base, 'indexes'),
      exports: configured.exports ?? path.join(base, 'exports'),
    };
  }

  private async tryReadGrobidVersion(endpointUrl: string): Promise<string | null> {
    try {
      const response = await fetch(`${endpointUrl}/api/version`, { headers: { Accept: 'text/plain' } });
      if (!response.ok) {
        return null;
      }
      const text = (await response.text()).trim();
      return text.length > 0 ? text : null;
    } catch {
      return null;
    }
  }

  private async readResponseBody(response: Response): Promise<Record<string, unknown>> {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const payload = await response.json();
      return payload && typeof payload === 'object' && !Array.isArray(payload)
        ? payload as Record<string, unknown>
        : { value: payload };
    }
    const text = await response.text();
    return { body: text };
  }

  private readEmbeddingProfileId(value: unknown): LiteratureEmbeddingProfileId | null {
    return value === 'default' || value === 'economy' ? value : null;
  }

  private readExtractionProfileId(value: unknown): LiteratureExtractionProfileId | null {
    return value === 'default' || value === 'high_accuracy' ? value : null;
  }

  private readNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private readNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  private clampInteger(value: number | undefined, fallback: number, min: number, max: number): number {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, value));
  }
}

// T-130 W-06 (D8): runtime shape of the import auto-advance gate settings.
export type LiteratureAutoAdvanceRuntimeSettings = {
  enabled: boolean;
  full_chain_min_score: number;
  fulltext_only_min_score: number;
  daily_literature_limit: number;
  max_parallel_literature_runs: number;
  advance_unscored: 'none' | 'fulltext' | 'full';
};
