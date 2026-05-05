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
  UpdateLiteratureContentProcessingSettingsRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import { AppError } from '../errors/app-error.js';
import type { ApplicationSettingsRepository } from '../repositories/application-settings-repository.js';

const SETTINGS_NAMESPACE = 'literature_content_processing';
const OPENAI_PROVIDER: LiteratureContentProcessingProviderId = 'openai';
const PROVIDER_OPENAI_KEY = 'provider.openai';
const EMBEDDING_KEY = 'embedding';
const EXTRACTION_KEY = 'extraction';
const STORAGE_ROOTS_KEY = 'storage_roots';
const FULLTEXT_PARSER_KEY = 'fulltext_parser';
const DEFAULT_GROBID_ENDPOINT_URL = 'http://localhost:8070';

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
    model: 'gpt-5.4-mini',
  },
  {
    profile_id: 'high_accuracy',
    provider: OPENAI_PROVIDER,
    model: 'gpt-5.5',
  },
];

const LEGACY_EXTRACTION_MODEL_BY_PROFILE: Partial<Record<LiteratureExtractionProfileId, string>> = {
  default: 'gpt-5-mini',
  high_accuracy: 'gpt-5.2',
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
  model: string;
  profileId: LiteratureExtractionProfileId;
};

export class LiteratureContentProcessingSettingsService {
  constructor(private readonly repository: ApplicationSettingsRepository) {}

  async getSettings(): Promise<LiteratureContentProcessingSettingsDTO> {
    const [providerOpenAI, embedding, extraction, storageRoots, fulltextParser] = await Promise.all([
      this.repository.findSetting(SETTINGS_NAMESPACE, PROVIDER_OPENAI_KEY),
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
          api_key_set: Boolean(providerOpenAI?.secretValue),
          api_key_last_updated_at: this.readString(providerOpenAI?.value.api_key_last_updated_at),
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
        if (providerPatch.provider !== OPENAI_PROVIDER) {
          throw new AppError(400, 'INVALID_PAYLOAD', `Unsupported provider ${providerPatch.provider}.`);
        }
        await this.updateOpenAIProvider(providerPatch.api_key, now);
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
    const apiKey = providerOpenAI?.secretValue?.trim();
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
    const [providerOpenAI, settings] = await Promise.all([
      this.repository.findSetting(SETTINGS_NAMESPACE, PROVIDER_OPENAI_KEY),
      this.getSettings(),
    ]);
    const apiKey = providerOpenAI?.secretValue?.trim();
    if (!apiKey) {
      return null;
    }

    const selectedProfileId = profileId ?? settings.extraction.active_profile_id;
    const profile = settings.extraction.profiles.find((item) => item.profile_id === selectedProfileId);
    if (!profile || profile.provider !== OPENAI_PROVIDER) {
      return null;
    }

    return {
      apiKey,
      model: profile.model,
      profileId: selectedProfileId,
    };
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

    await this.repository.upsertSetting({
      id: existing?.id ?? crypto.randomUUID(),
      namespace: SETTINGS_NAMESPACE,
      key: EXTRACTION_KEY,
      value: {
        active_profile_id: activeProfileId,
        profiles,
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
    if (input.provider !== OPENAI_PROVIDER) {
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
    const provider = row.provider === OPENAI_PROVIDER ? OPENAI_PROVIDER : null;
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
    const base = path.join(os.homedir(), '.paper-engineering-assistant', 'literature-content-processing');
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
}
