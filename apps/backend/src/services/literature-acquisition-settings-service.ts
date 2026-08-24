import type {
  LiteratureAcquisitionSettingsDTO,
  UpdateLiteratureAcquisitionSettingsRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import { AppError } from '../errors/app-error.js';
import type { ApplicationSettingsRepository } from '../repositories/application-settings-repository.js';
import {
  defaultLlmConfig,
  type LlmConfigReader,
} from './llm-config-loader.js';

const SETTINGS_NAMESPACE = 'literature_acquisition';
const SETTINGS_KEY = 'settings';

type LiteratureAcquisitionThrottleSource = keyof LiteratureAcquisitionSettingsDTO['source_throttle'];

const DEFAULT_NON_LLM_SETTINGS = {
  unpaywall: {
    enabled: false,
    email: null,
  },
  downloader: {
    max_byte_size: 100 * 1024 * 1024,
    timeout_ms: 60_000,
    max_redirects: 5,
    require_pdf_signature: true,
  },
  source_throttle: {
    arxiv: {
      min_interval_ms: 3_000,
      concurrency: 1,
    },
    crossref: {
      min_interval_ms: 350,
      concurrency: 3,
    },
    zotero: {
      min_interval_ms: 1_000,
      concurrency: 1,
    },
    unpaywall: {
      min_interval_ms: 250,
      concurrency: 2,
    },
    download: {
      min_interval_ms: 500,
      concurrency: 2,
    },
  },
} as const;

export class LiteratureAcquisitionSettingsService {
  private readonly defaultSettings: Omit<LiteratureAcquisitionSettingsDTO, 'updated_at'>;

  constructor(
    private readonly repository: ApplicationSettingsRepository,
    llmConfig: LlmConfigReader = defaultLlmConfig(),
  ) {
    const qualityScorer = llmConfig.getCall('literature-processing', 'auto-pull-quality');
    if (qualityScorer.provider.id !== 'openai') {
      throw new Error('literature-processing/auto-pull-quality must use the supported openai provider.');
    }
    this.defaultSettings = {
      ...DEFAULT_NON_LLM_SETTINGS,
      quality_scorer: {
        enabled: true,
        provider: 'openai',
        model: qualityScorer.model,
        prompt_version: qualityScorer.version,
        external_endpoint_configured: false,
      },
    };
  }

  async getSettings(): Promise<LiteratureAcquisitionSettingsDTO> {
    const setting = await this.repository.findSetting(SETTINGS_NAMESPACE, SETTINGS_KEY);
    const externalEndpointConfigured = Boolean((process.env.AUTO_PULL_LLM_SCORER_URL ?? '').trim());
    const persisted = this.readSettings(setting?.value);
    return {
      ...persisted,
      quality_scorer: {
        ...persisted.quality_scorer,
        external_endpoint_configured: externalEndpointConfigured,
      },
      updated_at: setting?.updatedAt ?? new Date(0).toISOString(),
    };
  }

  async updateSettings(patch: UpdateLiteratureAcquisitionSettingsRequest): Promise<LiteratureAcquisitionSettingsDTO> {
    const current = await this.getSettings();
    const now = new Date().toISOString();
    const next: LiteratureAcquisitionSettingsDTO = {
      unpaywall: {
        enabled: patch.unpaywall?.enabled ?? current.unpaywall.enabled,
        email: patch.unpaywall?.email === undefined
          ? current.unpaywall.email
          : this.normalizeOptionalEmail(patch.unpaywall.email),
      },
      downloader: {
        max_byte_size: this.clampInteger(
          patch.downloader?.max_byte_size,
          current.downloader.max_byte_size,
          1,
          500 * 1024 * 1024,
        ),
        timeout_ms: this.clampInteger(patch.downloader?.timeout_ms, current.downloader.timeout_ms, 1_000, 300_000),
        max_redirects: this.clampInteger(patch.downloader?.max_redirects, current.downloader.max_redirects, 0, 10),
        require_pdf_signature: patch.downloader?.require_pdf_signature ?? current.downloader.require_pdf_signature,
      },
      source_throttle: {
        arxiv: this.mergeThrottle(current.source_throttle.arxiv, patch.source_throttle?.arxiv),
        crossref: this.mergeThrottle(current.source_throttle.crossref, patch.source_throttle?.crossref),
        zotero: this.mergeThrottle(current.source_throttle.zotero, patch.source_throttle?.zotero),
        unpaywall: this.mergeThrottle(current.source_throttle.unpaywall, patch.source_throttle?.unpaywall),
        download: this.mergeThrottle(current.source_throttle.download, patch.source_throttle?.download),
      },
      quality_scorer: {
        enabled: patch.quality_scorer?.enabled ?? current.quality_scorer.enabled,
        provider: 'openai',
        model: patch.quality_scorer?.model?.trim() || current.quality_scorer.model,
        prompt_version: patch.quality_scorer?.prompt_version?.trim() || current.quality_scorer.prompt_version,
        external_endpoint_configured: Boolean((process.env.AUTO_PULL_LLM_SCORER_URL ?? '').trim()),
      },
      updated_at: now,
    };

    await this.repository.upsertSetting({
      id: `${SETTINGS_NAMESPACE}:${SETTINGS_KEY}`,
      namespace: SETTINGS_NAMESPACE,
      key: SETTINGS_KEY,
      value: {
        unpaywall: next.unpaywall,
        downloader: next.downloader,
        source_throttle: next.source_throttle,
        quality_scorer: {
          enabled: next.quality_scorer.enabled,
          provider: next.quality_scorer.provider,
          model: next.quality_scorer.model,
          prompt_version: next.quality_scorer.prompt_version,
        },
      },
      secretValue: null,
      createdAt: now,
      updatedAt: now,
    });

    return next;
  }

  async resolveUnpaywallEmail(): Promise<string | null> {
    const envEmail = (process.env.UNPAYWALL_EMAIL ?? '').trim();
    if (envEmail) {
      return this.normalizeOptionalEmail(envEmail);
    }
    return (await this.getSettings()).unpaywall.email;
  }

  async isUnpaywallEnabled(): Promise<boolean> {
    if ((process.env.UNPAYWALL_EMAIL ?? '').trim()) {
      return true;
    }
    return (await this.getSettings()).unpaywall.enabled;
  }

  async resolveDownloaderOptions(): Promise<LiteratureAcquisitionSettingsDTO['downloader']> {
    return (await this.getSettings()).downloader;
  }

  async resolveSourceThrottle(
    source: LiteratureAcquisitionThrottleSource,
  ): Promise<LiteratureAcquisitionSettingsDTO['source_throttle'][LiteratureAcquisitionThrottleSource]> {
    return (await this.getSettings()).source_throttle[source];
  }

  async resolveQualityScorerProfile(): Promise<LiteratureAcquisitionSettingsDTO['quality_scorer']> {
    return (await this.getSettings()).quality_scorer;
  }

  private readSettings(value: Record<string, unknown> | undefined): Omit<LiteratureAcquisitionSettingsDTO, 'updated_at'> {
    const root: Record<string, unknown> = value && typeof value === 'object' ? value : {};
    const unpaywall = this.readRecord(root.unpaywall);
    const downloader = this.readRecord(root.downloader);
    const sourceThrottle = this.readRecord(root.source_throttle);
    const qualityScorer = this.readRecord(root.quality_scorer);
    return {
      unpaywall: {
        enabled: typeof unpaywall.enabled === 'boolean' ? unpaywall.enabled : this.defaultSettings.unpaywall.enabled,
        email: this.readString(unpaywall.email) ?? this.defaultSettings.unpaywall.email,
      },
      downloader: {
        max_byte_size: this.readNumber(downloader.max_byte_size, this.defaultSettings.downloader.max_byte_size),
        timeout_ms: this.readNumber(downloader.timeout_ms, this.defaultSettings.downloader.timeout_ms),
        max_redirects: this.readNumber(downloader.max_redirects, this.defaultSettings.downloader.max_redirects),
        require_pdf_signature: typeof downloader.require_pdf_signature === 'boolean'
          ? downloader.require_pdf_signature
          : this.defaultSettings.downloader.require_pdf_signature,
      },
      source_throttle: {
        arxiv: this.readThrottle(sourceThrottle.arxiv, this.defaultSettings.source_throttle.arxiv),
        crossref: this.readThrottle(sourceThrottle.crossref, this.defaultSettings.source_throttle.crossref),
        zotero: this.readThrottle(sourceThrottle.zotero, this.defaultSettings.source_throttle.zotero),
        unpaywall: this.readThrottle(sourceThrottle.unpaywall, this.defaultSettings.source_throttle.unpaywall),
        download: this.readThrottle(sourceThrottle.download, this.defaultSettings.source_throttle.download),
      },
      quality_scorer: {
        enabled: typeof qualityScorer.enabled === 'boolean'
          ? qualityScorer.enabled
          : this.defaultSettings.quality_scorer.enabled,
        provider: 'openai',
        model: this.readString(qualityScorer.model) ?? this.defaultSettings.quality_scorer.model,
        prompt_version: this.readString(qualityScorer.prompt_version) ?? this.defaultSettings.quality_scorer.prompt_version,
        external_endpoint_configured: Boolean((process.env.AUTO_PULL_LLM_SCORER_URL ?? '').trim()),
      },
    };
  }

  private mergeThrottle(
    current: { min_interval_ms: number; concurrency: number },
    patch: { min_interval_ms?: number; concurrency?: number } | undefined,
  ): { min_interval_ms: number; concurrency: number } {
    return {
      min_interval_ms: this.clampInteger(patch?.min_interval_ms, current.min_interval_ms, 0, 3_600_000),
      concurrency: this.clampInteger(patch?.concurrency, current.concurrency, 1, 10),
    };
  }

  private readThrottle(
    value: unknown,
    fallback: { min_interval_ms: number; concurrency: number },
  ): { min_interval_ms: number; concurrency: number } {
    const record = this.readRecord(value);
    return {
      min_interval_ms: this.readNumber(record.min_interval_ms, fallback.min_interval_ms),
      concurrency: this.readNumber(record.concurrency, fallback.concurrency),
    };
  }

  private normalizeOptionalEmail(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'unpaywall.email must be a valid email address.');
    }
    return trimmed;
  }

  private clampInteger(value: number | undefined, fallback: number, minimum: number, maximum: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback;
    }
    return Math.max(minimum, Math.min(maximum, Math.trunc(value)));
  }

  private readNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback;
  }

  private readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private readRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }
}
