import crypto from 'node:crypto';
import type {
  LiteratureContentProcessingProviderId,
  LiteratureContentProcessingSettingsDTO,
  LiteratureContentProcessingStorageRootsDTO,
  LiteratureEmbeddingProfileDTO,
  LiteratureEmbeddingProfileId,
  UpdateLiteratureContentProcessingSettingsRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import { AppError } from '../errors/app-error.js';
import type { ApplicationSettingsRepository } from '../repositories/application-settings-repository.js';

const SETTINGS_NAMESPACE = 'literature_content_processing';
const OPENAI_PROVIDER: LiteratureContentProcessingProviderId = 'openai';
const PROVIDER_OPENAI_KEY = 'provider.openai';
const EMBEDDING_KEY = 'embedding';
const STORAGE_ROOTS_KEY = 'storage_roots';

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

export type OpenAIEmbeddingConfig = {
  apiKey: string;
  model: string;
  dimensions: number | null;
};

export class LiteratureContentProcessingSettingsService {
  constructor(private readonly repository: ApplicationSettingsRepository) {}

  async getSettings(): Promise<LiteratureContentProcessingSettingsDTO> {
    const [providerOpenAI, embedding, storageRoots] = await Promise.all([
      this.repository.findSetting(SETTINGS_NAMESPACE, PROVIDER_OPENAI_KEY),
      this.repository.findSetting(SETTINGS_NAMESPACE, EMBEDDING_KEY),
      this.repository.findSetting(SETTINGS_NAMESPACE, STORAGE_ROOTS_KEY),
    ]);

    const embeddingSettings = this.readEmbeddingSettings(embedding?.value);
    const storageRootSettings = this.readStorageRoots(storageRoots?.value);
    const updatedAt = [providerOpenAI?.updatedAt, embedding?.updatedAt, storageRoots?.updatedAt]
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
      storage_roots: storageRootSettings,
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

    if (patch.storage_roots) {
      await this.updateStorageRoots(patch.storage_roots, now);
    }

    return this.getSettings();
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
      model: profile.model,
      dimensions: profile.dimensions,
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

  private readStorageRoots(value: Record<string, unknown> | undefined): LiteratureContentProcessingStorageRootsDTO {
    return {
      raw_files: this.readNullableString(value?.raw_files),
      normalized_text: this.readNullableString(value?.normalized_text),
      artifacts_cache: this.readNullableString(value?.artifacts_cache),
      indexes: this.readNullableString(value?.indexes),
      exports: this.readNullableString(value?.exports),
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

  private normalizePath(value: string, key: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new AppError(400, 'INVALID_PAYLOAD', `Storage root ${key} cannot be blank.`);
    }
    return trimmed;
  }

  private readEmbeddingProfileId(value: unknown): LiteratureEmbeddingProfileId | null {
    return value === 'default' || value === 'economy' ? value : null;
  }

  private readNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }
}
