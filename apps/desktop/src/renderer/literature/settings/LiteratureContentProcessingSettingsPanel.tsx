import { useEffect, useState } from 'react';
import { requestGovernance } from '../shared/api';
import { asRecord, toText } from '../shared/normalizers';
import type {
  LiteratureContentProcessingSettings,
  LiteratureEmbeddingProfileId,
  LiteratureExtractionProfileId,
  UiOperationStatus,
} from '../shared/types';

const storageRootKeys = [
  'raw_files',
  'normalized_text',
  'artifacts_cache',
  'indexes',
  'exports',
] as const;

const storageRootLabels: Record<(typeof storageRootKeys)[number], string> = {
  raw_files: '原始文件',
  normalized_text: '标准化文本',
  artifacts_cache: '处理产物',
  indexes: '本地索引',
  exports: '导出目录',
};

type StorageRootKey = (typeof storageRootKeys)[number];

type StorageRootForm = Record<StorageRootKey, string>;

function emptyStorageRootForm(): StorageRootForm {
  return {
    raw_files: '',
    normalized_text: '',
    artifacts_cache: '',
    indexes: '',
    exports: '',
  };
}

function normalizeSettings(payload: unknown): LiteratureContentProcessingSettings | null {
  const root = asRecord(payload);
  const embedding = asRecord(root?.embedding);
  const extraction = asRecord(root?.extraction);
  const storageRoots = asRecord(root?.storage_roots);
  const providersRaw = Array.isArray(root?.providers) ? root.providers : [];
  const profilesRaw = Array.isArray(embedding?.profiles) ? embedding.profiles : [];
  const extractionProfilesRaw = Array.isArray(extraction?.profiles) ? extraction.profiles : [];
  const activeProfileId = toText(embedding?.active_profile_id);
  const activeExtractionProfileId = toText(extraction?.active_profile_id);

  if (!root || !embedding || !extraction || !storageRoots) {
    return null;
  }

  return {
    providers: providersRaw
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => item !== null)
      .map((item) => ({
        provider: 'openai',
        api_key_set: item.api_key_set === true,
        api_key_last_updated_at: toText(item.api_key_last_updated_at) ?? null,
      })),
    embedding: {
      active_profile_id: activeProfileId === 'economy' ? 'economy' : 'default',
      profiles: profilesRaw
        .map((item) => asRecord(item))
        .filter((item): item is Record<string, unknown> => item !== null)
        .map((item) => ({
          profile_id: toText(item.profile_id) === 'economy' ? 'economy' : 'default',
          provider: 'openai',
          model: toText(item.model) ?? '',
          dimensions: typeof item.dimensions === 'number' ? item.dimensions : null,
        })),
    },
    extraction: {
      active_profile_id: activeExtractionProfileId === 'high_accuracy' ? 'high_accuracy' : 'default',
      profiles: extractionProfilesRaw
        .map((item) => asRecord(item))
        .filter((item): item is Record<string, unknown> => item !== null)
        .map((item) => ({
          profile_id: toText(item.profile_id) === 'high_accuracy' ? 'high_accuracy' : 'default',
          provider: 'openai',
          model: toText(item.model) ?? '',
        })),
    },
    storage_roots: {
      raw_files: toText(storageRoots.raw_files) ?? null,
      normalized_text: toText(storageRoots.normalized_text) ?? null,
      artifacts_cache: toText(storageRoots.artifacts_cache) ?? null,
      indexes: toText(storageRoots.indexes) ?? null,
      exports: toText(storageRoots.exports) ?? null,
    },
    updated_at: toText(root.updated_at) ?? '',
  };
}

export function LiteratureContentProcessingSettingsPanel() {
  const [settings, setSettings] = useState<LiteratureContentProcessingSettings | null>(null);
  const [status, setStatus] = useState<UiOperationStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [activeProfileId, setActiveProfileId] = useState<LiteratureEmbeddingProfileId>('default');
  const [activeExtractionProfileId, setActiveExtractionProfileId] = useState<LiteratureExtractionProfileId>('default');
  const [storageRootForm, setStorageRootForm] = useState<StorageRootForm>(() => emptyStorageRootForm());

  const loadSettings = async () => {
    setStatus('loading');
    setMessage(null);
    try {
      const payload = await requestGovernance<unknown>({
        method: 'GET',
        path: '/settings/literature-content-processing',
      });
      const normalized = normalizeSettings(payload);
      if (!normalized) {
        throw new Error('Invalid settings payload.');
      }
      setSettings(normalized);
      setActiveProfileId(normalized.embedding.active_profile_id);
      setActiveExtractionProfileId(normalized.extraction.active_profile_id);
      setStorageRootForm({
        raw_files: normalized.storage_roots.raw_files ?? '',
        normalized_text: normalized.storage_roots.normalized_text ?? '',
        artifacts_cache: normalized.storage_roots.artifacts_cache ?? '',
        indexes: normalized.storage_roots.indexes ?? '',
        exports: normalized.storage_roots.exports ?? '',
      });
      setStatus('ready');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '设置加载失败。');
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const saveSettings = async (options?: { clearApiKey?: boolean }) => {
    setStatus('saving');
    setMessage(null);
    const providerPatch = options?.clearApiKey
      ? [{ provider: 'openai', api_key: null }]
      : apiKeyInput.trim()
        ? [{ provider: 'openai', api_key: apiKeyInput.trim() }]
        : undefined;
    const storageRoots = Object.fromEntries(
      storageRootKeys.map((key) => {
        const value = storageRootForm[key].trim();
        return [key, value || null];
      }),
    );

    try {
      const payload = await requestGovernance<unknown>({
        method: 'PATCH',
        path: '/settings/literature-content-processing',
        body: {
          ...(providerPatch ? { providers: providerPatch } : {}),
          embedding: {
            active_profile_id: activeProfileId,
          },
          extraction: {
            active_profile_id: activeExtractionProfileId,
          },
          storage_roots: storageRoots,
        },
      });
      const normalized = normalizeSettings(payload);
      if (!normalized) {
        throw new Error('Invalid settings payload.');
      }
      setSettings(normalized);
      setApiKeyInput('');
      setStatus('ready');
      setMessage(options?.clearApiKey ? 'API key 已清除。' : '设置已保存。');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '设置保存失败。');
    }
  };

  const openAIProvider = settings?.providers.find((provider) => provider.provider === 'openai');

  return (
    <section data-ui="panel" data-density="compact" aria-label="内容处理设置">
      <div data-ui="stack" data-direction="col" data-gap="3">
        <div data-ui="cluster" data-justify="between" data-align="center">
          <div>
            <h3 data-ui="heading" data-size="sm">内容处理设置</h3>
            <p data-ui="text" data-variant="caption" data-tone="muted">
              OpenAI：{openAIProvider?.api_key_set ? '已配置' : '未配置'}
            </p>
          </div>
          <button
            data-ui="button"
            data-variant="ghost"
            data-size="sm"
            type="button"
            onClick={() => void loadSettings()}
            disabled={status === 'loading' || status === 'saving'}
          >
            刷新
          </button>
        </div>

        <div data-ui="grid" data-columns="4" data-gap="2">
          <label data-ui="field">
            <span data-ui="label">OpenAI API key</span>
            <input
              data-ui="input"
              type="password"
              value={apiKeyInput}
              placeholder={openAIProvider?.api_key_set ? '保留现有 key' : '输入 key'}
              onChange={(event) => setApiKeyInput(event.target.value)}
            />
          </label>
          <label data-ui="field">
            <span data-ui="label">Embedding profile</span>
            <select
              data-ui="select"
              value={activeProfileId}
              onChange={(event) => setActiveProfileId(event.target.value === 'economy' ? 'economy' : 'default')}
            >
              <option value="default">large</option>
              <option value="economy">small</option>
            </select>
          </label>
          <label data-ui="field">
            <span data-ui="label">Extraction profile</span>
            <select
              data-ui="select"
              value={activeExtractionProfileId}
              onChange={(event) => setActiveExtractionProfileId(event.target.value === 'high_accuracy' ? 'high_accuracy' : 'default')}
            >
              <option value="default">gpt-5-mini</option>
              <option value="high_accuracy">gpt-5.2</option>
            </select>
          </label>
          <div data-ui="cluster" data-align="end" data-gap="2">
            <button
              data-ui="button"
              data-variant="primary"
              data-size="sm"
              type="button"
              onClick={() => void saveSettings()}
              disabled={status === 'saving'}
            >
              保存
            </button>
            <button
              data-ui="button"
              data-variant="ghost"
              data-size="sm"
              type="button"
              onClick={() => void saveSettings({ clearApiKey: true })}
              disabled={status === 'saving' || !openAIProvider?.api_key_set}
            >
              清除 key
            </button>
          </div>
        </div>

        <div data-ui="grid" data-columns="5" data-gap="2">
          {storageRootKeys.map((key) => (
            <label data-ui="field" key={key}>
              <span data-ui="label">{storageRootLabels[key]}</span>
              <input
                data-ui="input"
                type="text"
                value={storageRootForm[key]}
                onChange={(event) =>
                  setStorageRootForm((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
              />
            </label>
          ))}
        </div>

        {message ? (
          <p
            data-ui="text"
            data-variant="caption"
            data-tone={status === 'error' ? 'danger' : 'muted'}
          >
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
