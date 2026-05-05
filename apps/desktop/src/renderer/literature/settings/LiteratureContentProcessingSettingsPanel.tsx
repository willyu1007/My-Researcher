import { useEffect, useMemo, useState } from 'react';
import { requestGovernance } from '../shared/api';
import { asRecord, toText } from '../shared/normalizers';
import type {
  LiteratureContentProcessingSettings,
  LiteratureEmbeddingProfileId,
  LiteratureExtractionProfileId,
  LiteratureFulltextParserHealth,
  UiOperationStatus,
} from '../shared/types';
import './LiteratureContentProcessingSettingsPanel.css';

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

type EmbeddingChoice = {
  id: LiteratureEmbeddingProfileId;
  label: string;
  defaultModel: string;
};
type ExtractionChoice = {
  id: LiteratureExtractionProfileId;
  label: string;
  defaultModel: string;
};

const embeddingChoices: EmbeddingChoice[] = [
  {
    id: 'default',
    label: '高精度',
    defaultModel: 'text-embedding-3-large',
  },
  {
    id: 'economy',
    label: '经济',
    defaultModel: 'text-embedding-3-small',
  },
];

const extractionChoices: ExtractionChoice[] = [
  {
    id: 'default',
    label: '通用',
    defaultModel: 'gpt-5.4-mini',
  },
  {
    id: 'high_accuracy',
    label: '高精度',
    defaultModel: 'gpt-5.5',
  },
];

function emptyStorageRootForm(): StorageRootForm {
  return {
    raw_files: '',
    normalized_text: '',
    artifacts_cache: '',
    indexes: '',
    exports: '',
  };
}

function normalizeStorageRoots(value: unknown) {
  const roots = asRecord(value);
  if (!roots) {
    return null;
  }
  return {
    raw_files: toText(roots.raw_files) ?? null,
    normalized_text: toText(roots.normalized_text) ?? null,
    artifacts_cache: toText(roots.artifacts_cache) ?? null,
    indexes: toText(roots.indexes) ?? null,
    exports: toText(roots.exports) ?? null,
  };
}

function normalizeParserHealth(payload: unknown): LiteratureFulltextParserHealth | null {
  const root = asRecord(payload);
  if (!root || root.provider !== 'grobid') {
    return null;
  }
  return {
    provider: 'grobid',
    endpoint_url: toText(root.endpoint_url) ?? '',
    status: root.status === 'ready' ? 'ready' : 'unavailable',
    checked_at: toText(root.checked_at) ?? '',
    version: toText(root.version) ?? null,
    details: asRecord(root.details) ?? {},
  };
}

function normalizeSettings(payload: unknown): LiteratureContentProcessingSettings | null {
  const root = asRecord(payload);
  const embedding = asRecord(root?.embedding);
  const extraction = asRecord(root?.extraction);
  const storageRoots = normalizeStorageRoots(root?.storage_roots);
  const effectiveStorageRoots = normalizeStorageRoots(root?.effective_storage_roots);
  const fulltextParser = asRecord(root?.fulltext_parser);
  const grobidParser = asRecord(fulltextParser?.grobid);
  const providersRaw = Array.isArray(root?.providers) ? root.providers : [];
  const profilesRaw = Array.isArray(embedding?.profiles) ? embedding.profiles : [];
  const extractionProfilesRaw = Array.isArray(extraction?.profiles) ? extraction.profiles : [];
  const activeProfileId = toText(embedding?.active_profile_id);
  const activeExtractionProfileId = toText(extraction?.active_profile_id);

  if (!root || !embedding || !extraction || !storageRoots || !effectiveStorageRoots || !fulltextParser || !grobidParser) {
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
    storage_roots: storageRoots,
    effective_storage_roots: effectiveStorageRoots,
    fulltext_parser: {
      grobid: {
        endpoint_url: toText(grobidParser.endpoint_url) ?? 'http://localhost:8070',
      },
    },
    updated_at: toText(root.updated_at) ?? '',
  };
}

function StatusDot({ tone }: { tone: 'success' | 'danger' | 'muted' }) {
  if (tone === 'success') {
    return <span data-ui="text" data-variant="caption" data-tone="primary" aria-hidden="true">● </span>;
  }
  if (tone === 'danger') {
    return <span data-ui="text" data-variant="caption" data-tone="danger" aria-hidden="true">● </span>;
  }
  return <span data-ui="text" data-variant="caption" data-tone="muted" aria-hidden="true">● </span>;
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatModelName(value: string): string {
  if (value === 'gpt-5.4-mini') return 'GPT-5.4 mini';
  if (value === 'gpt-5.5') return 'GPT-5.5';
  return value;
}

export function LiteratureContentProcessingSettingsPanel() {
  const [settings, setSettings] = useState<LiteratureContentProcessingSettings | null>(null);
  const [status, setStatus] = useState<UiOperationStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'info' | 'success' | 'danger'>('info');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [apiKeyEditing, setApiKeyEditing] = useState<boolean>(false);
  const [activeProfileId, setActiveProfileId] = useState<LiteratureEmbeddingProfileId>('default');
  const [activeExtractionProfileId, setActiveExtractionProfileId] = useState<LiteratureExtractionProfileId>('default');
  const [storageRootForm, setStorageRootForm] = useState<StorageRootForm>(() => emptyStorageRootForm());
  const [grobidEndpointUrl, setGrobidEndpointUrl] = useState<string>('http://localhost:8070');
  const [parserHealth, setParserHealth] = useState<LiteratureFulltextParserHealth | null>(null);
  const [parserHealthStatus, setParserHealthStatus] = useState<UiOperationStatus>('idle');
  const [dirty, setDirty] = useState<boolean>(false);

  const loadSettings = async () => {
    setStatus('loading');
    setMessage(null);
    setParserHealth(null);
    setParserHealthStatus('idle');
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
      setGrobidEndpointUrl(normalized.fulltext_parser.grobid.endpoint_url);
      setApiKeyInput('');
      setApiKeyEditing(false);
      setStorageRootForm({
        raw_files: normalized.storage_roots.raw_files ?? '',
        normalized_text: normalized.storage_roots.normalized_text ?? '',
        artifacts_cache: normalized.storage_roots.artifacts_cache ?? '',
        indexes: normalized.storage_roots.indexes ?? '',
        exports: normalized.storage_roots.exports ?? '',
      });
      setStatus('ready');
      setDirty(false);
    } catch (error) {
      setStatus('error');
      setMessageTone('danger');
      setMessage(error instanceof Error ? error.message : '设置加载失败。');
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const checkParserHealth = async () => {
    setParserHealthStatus('loading');
    setMessage(null);
    try {
      const payload = await requestGovernance<unknown>({
        method: 'GET',
        path: '/settings/literature-content-processing/fulltext-parser/health',
      });
      const normalized = normalizeParserHealth(payload);
      if (!normalized) {
        throw new Error('Invalid parser health payload.');
      }
      setParserHealth(normalized);
      setParserHealthStatus(normalized.status === 'ready' ? 'ready' : 'error');
      setMessageTone(normalized.status === 'ready' ? 'success' : 'danger');
      setMessage(normalized.status === 'ready' ? 'GROBID 已就绪。' : 'GROBID 未就绪。');
    } catch (error) {
      setParserHealth(null);
      setParserHealthStatus('error');
      setMessageTone('danger');
      setMessage(error instanceof Error ? error.message : 'GROBID 健康检查失败。');
    }
  };

  const saveSettings = async (options?: { clearApiKey?: boolean }) => {
    setStatus('saving');
    setMessage(null);
    setParserHealth(null);
    setParserHealthStatus('idle');
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
          embedding: { active_profile_id: activeProfileId },
          extraction: { active_profile_id: activeExtractionProfileId },
          storage_roots: storageRoots,
          fulltext_parser: { grobid: { endpoint_url: grobidEndpointUrl.trim() } },
        },
      });
      const normalized = normalizeSettings(payload);
      if (!normalized) {
        throw new Error('Invalid settings payload.');
      }
      setSettings(normalized);
      setGrobidEndpointUrl(normalized.fulltext_parser.grobid.endpoint_url);
      setApiKeyInput('');
      setApiKeyEditing(false);
      setStatus('ready');
      setDirty(false);
      setMessageTone('success');
      setMessage(options?.clearApiKey ? 'API key 已清除。' : '设置已保存。');
    } catch (error) {
      setStatus('error');
      setMessageTone('danger');
      setMessage(error instanceof Error ? error.message : '设置保存失败。');
    }
  };

  const openAIProvider = settings?.providers.find((provider) => provider.provider === 'openai');
  const apiKeyConfigured = openAIProvider?.api_key_set === true;
  const apiKeyUpdatedAt = openAIProvider?.api_key_last_updated_at ?? null;

  const embeddingOptions = useMemo(
    () =>
      embeddingChoices.map((choice) => ({
        id: choice.id,
        label: choice.label,
        modelHint:
          formatModelName(
            settings?.embedding.profiles.find((profile) => profile.profile_id === choice.id)?.model
            ?? choice.defaultModel,
          ),
      })),
    [settings?.embedding.profiles],
  );

  const extractionOptions = useMemo(
    () =>
      extractionChoices.map((choice) => ({
        id: choice.id,
        label: choice.label,
        modelHint:
          formatModelName(
            settings?.extraction.profiles.find((profile) => profile.profile_id === choice.id)?.model
            ?? choice.defaultModel,
          ),
      })),
    [settings?.extraction.profiles],
  );

  const markDirty = () => {
    if (!dirty) setDirty(true);
  };

  const chooseStorageRootPath = async (key: StorageRootKey) => {
    const currentPath = storageRootForm[key].trim() || settings?.effective_storage_roots[key] || '';
    const selectDirectory = window.desktopApi?.selectDirectory;

    if (!selectDirectory) {
      setMessageTone('danger');
      setMessage('目录选择器未加载，请重启桌面应用后再试。');
      return;
    }

    try {
      const selectedPath = await selectDirectory({
        title: `更换${storageRootLabels[key]}路径`,
        defaultPath: currentPath,
      });

      if (!selectedPath) {
        return;
      }

      setStorageRootForm((current) => ({ ...current, [key]: selectedPath }));
      setMessage(null);
      markDirty();
    } catch (error) {
      setMessageTone('danger');
      setMessage(error instanceof Error ? `目录选择器打开失败：${error.message}` : '目录选择器打开失败。');
    }
  };

  const isSaving = status === 'saving';
  const isLoading = status === 'loading';
  const apiKeyDisplayValue = apiKeyConfigured && !apiKeyEditing ? '已配置 ********' : apiKeyInput;
  const apiKeyEditable = !apiKeyConfigured || apiKeyEditing;
  const parserHealthStatusText = parserHealth?.status === 'ready'
    ? `就绪${parserHealth.version ? ` · ${parserHealth.version}` : ''}`
    : parserHealth?.status === 'unavailable'
      ? '未就绪'
      : '未检查';

  return (
    <section className="literature-tab-panel" aria-label="内容处理设置">
      {/* —— 全文解析器 —— */}
      <section className="literature-section-block" aria-label="全文解析器">
        <div data-ui="stack" data-direction="row" data-justify="between" data-align="center">
          <span data-ui="text" data-variant="label" data-tone="primary">全文解析器 · GROBID</span>
          {parserHealth?.status === 'ready' ? (
            <span data-ui="text" data-variant="caption" data-tone="primary">
              <StatusDot tone="success" />
              {parserHealthStatusText}
              {parserHealth.checked_at ? ` · ${formatTimestamp(parserHealth.checked_at)}` : ''}
            </span>
          ) : (
            <span data-ui="text" data-variant="caption" data-tone="muted">
              <StatusDot tone={parserHealth?.status === 'unavailable' ? 'danger' : 'muted'} />
              {parserHealthStatusText}
              {parserHealth?.checked_at ? ` · ${formatTimestamp(parserHealth.checked_at)}` : ''}
            </span>
          )}
        </div>
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <span data-ui="text" data-variant="caption" data-tone="muted">Endpoint URL</span>
          <div data-slot="center">
            <input
              data-ui="input"
              data-size="sm"
              type="url"
              value={grobidEndpointUrl}
              placeholder="http://localhost:8070"
              aria-label="GROBID Endpoint URL"
              onChange={(event) => {
                setGrobidEndpointUrl(event.target.value);
                markDirty();
              }}
            />
          </div>
          <div data-slot="end">
            <button
              data-ui="button"
              data-variant="secondary"
              data-size="sm"
              type="button"
              onClick={() => void checkParserHealth()}
              disabled={parserHealthStatus === 'loading'}
            >
              {parserHealthStatus === 'loading' ? '检查中…' : '检查解析器'}
            </button>
          </div>
        </div>
      </section>

      {/* —— Provider —— */}
      <section className="literature-section-block" aria-label="Provider 设置">
        <div data-ui="stack" data-direction="row" data-justify="between" data-align="center">
          <span data-ui="text" data-variant="label" data-tone="primary">Provider · OpenAI</span>
          <span data-ui="text" data-variant="caption" data-tone={apiKeyConfigured ? 'primary' : 'muted'}>
            <StatusDot tone={apiKeyConfigured ? 'success' : 'muted'} />
            {apiKeyConfigured ? '已配置' : '未配置'}
            {apiKeyUpdatedAt ? ` · 上次更新 ${formatTimestamp(apiKeyUpdatedAt)}` : ''}
          </span>
        </div>
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <span data-ui="text" data-variant="caption" data-tone="muted">API Key</span>
          <div data-slot="center">
            <input
              data-ui="input"
              data-size="sm"
              aria-label="OpenAI API Key"
              type={apiKeyEditable ? 'password' : 'text'}
              value={apiKeyDisplayValue}
              readOnly={!apiKeyEditable}
              placeholder={apiKeyConfigured ? '已配置 ********' : '输入 OpenAI API key'}
              onChange={(event) => {
                setApiKeyInput(event.target.value);
                markDirty();
              }}
            />
          </div>
          <div data-slot="end">
            <button
              data-ui="button"
              data-variant="ghost"
              data-size="sm"
              type="button"
              onClick={() => void saveSettings({ clearApiKey: true })}
              disabled={isSaving || !apiKeyConfigured}
            >
              清除
            </button>
            <button
              data-ui="button"
              data-variant="secondary"
              data-size="sm"
              type="button"
              onClick={() => {
                setApiKeyInput('');
                setApiKeyEditing((current) => !current);
              }}
              disabled={isSaving || !apiKeyConfigured}
            >
              {apiKeyEditing ? '取消替换' : '替换'}
            </button>
          </div>
        </div>
      </section>

      <section className="literature-section-block" aria-label="模型方案">
        <div data-ui="grid" data-cols="2" data-gap="3">
          <label data-ui="field">
            <span data-ui="text" data-variant="caption" data-tone="secondary">Embedding 配置</span>
            <select
              data-ui="select"
              data-size="sm"
              className="literature-content-processing-profile-select"
              value={activeProfileId}
              onChange={(event) => {
                setActiveProfileId(event.target.value === 'economy' ? 'economy' : 'default');
                event.currentTarget.blur();
                markDirty();
              }}
            >
              {embeddingOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label} · {option.modelHint}</option>
              ))}
            </select>
          </label>
          <label data-ui="field">
            <span data-ui="text" data-variant="caption" data-tone="secondary">Extraction 配置</span>
            <select
              data-ui="select"
              data-size="sm"
              className="literature-content-processing-profile-select"
              value={activeExtractionProfileId}
              onChange={(event) => {
                setActiveExtractionProfileId(event.target.value === 'high_accuracy' ? 'high_accuracy' : 'default');
                event.currentTarget.blur();
                markDirty();
              }}
            >
              {extractionOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label} · {option.modelHint}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* —— 存储路径 —— */}
      <section className="literature-section-block" aria-label="存储路径">
        <span data-ui="text" data-variant="label" data-tone="primary">存储路径</span>
        <table data-ui="table" data-density="compact">
          <thead>
            <tr>
              <th>项</th>
              <th>路径</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {storageRootKeys.map((key) => {
              const effective = settings?.effective_storage_roots[key] ?? '';
              const customPath = storageRootForm[key].trim();
              const displayedPath = customPath || effective;
              return (
                <tr key={key}>
                  <td>
                    <span data-ui="text" data-variant="caption" data-tone="primary">{storageRootLabels[key]}</span>
                  </td>
                  <td>
                    <span data-ui="text" data-variant="caption" data-tone={customPath ? 'primary' : 'muted'} title={displayedPath}>
                      {displayedPath || '--'}
                    </span>
                  </td>
                  <td>
                    <div data-ui="stack" data-direction="row" data-gap="2">
                      <button
                        data-ui="button"
                        data-variant="secondary"
                        data-size="sm"
                        type="button"
                        disabled={isSaving || isLoading}
                        onClick={() => void chooseStorageRootPath(key)}
                      >
                        更换路径
                      </button>
                      <button
                        data-ui="button"
                        data-variant="ghost"
                        data-size="sm"
                        type="button"
                        disabled={isSaving || isLoading || !customPath}
                        onClick={() => {
                          setStorageRootForm((current) => ({ ...current, [key]: '' }));
                          markDirty();
                        }}
                      >
                        使用默认
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* —— Sticky footer —— */}
      <footer data-ui="toolbar" data-align="between" data-wrap="wrap">
        <span data-ui="text" data-variant="caption" data-tone={messageTone === 'danger' ? 'danger' : 'muted'}>
          {message
            ? message
            : dirty
              ? '存在未保存改动'
              : isSaving
                ? '保存中…'
                : isLoading
                  ? '加载中…'
                  : '已同步'}
        </span>
        <div data-ui="stack" data-direction="row" data-gap="2">
          <button
            data-ui="button"
            data-variant="ghost"
            data-size="sm"
            type="button"
            onClick={() => void loadSettings()}
            disabled={isLoading || isSaving}
          >
            重新加载
          </button>
          <button
            data-ui="button"
            data-variant="primary"
            data-size="sm"
            type="button"
            onClick={() => void saveSettings()}
            disabled={isSaving || isLoading}
          >
            {isSaving ? '保存中…' : '保存'}
          </button>
        </div>
      </footer>
    </section>
  );
}
