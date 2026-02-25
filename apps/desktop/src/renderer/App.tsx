import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyTheme,
  readSystemPrefersDark,
  resolveTheme,
  SYSTEM_DARK_MEDIA_QUERY,
  THEME_MODE_STORAGE_KEY,
  type ThemeMode,
} from './theme';

type PanelStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

type PanelState<T> = {
  status: PanelStatus;
  data: T;
  error: string | null;
};

type TimelineEvent = {
  event_id: string;
  event_type: string;
  module_id?: string;
  timestamp: string;
  node_id?: string;
  summary: string;
  severity?: 'info' | 'warning' | 'error';
};

type RuntimeMetric = {
  tokens: number | null;
  cost_usd: number | null;
  gpu_requested: number | null;
  gpu_total: number | null;
  updated_at: string;
};

type ArtifactBundle = {
  proposal_url: string | null;
  paper_url: string | null;
  repo_url: string | null;
  review_url: string | null;
};

type ReviewDecision = 'approve' | 'reject' | 'hold';

type ReleaseGateResponse = {
  gate_result: {
    accepted: boolean;
    review_id: string;
    approved_by?: string;
    approved_at?: string;
    audit_ref: string;
  };
};

type DedupMatchType = 'none' | 'doi' | 'arxiv_id' | 'title_authors_year';
type CitationStatus = 'seeded' | 'selected' | 'used' | 'cited' | 'dropped';
type ScopeStatus = 'in_scope' | 'excluded';

type LiteratureImportPayload = {
  provider: 'crossref' | 'arxiv';
  external_id: string;
  title: string;
  abstract?: string;
  authors?: string[];
  year?: number;
  doi?: string;
  arxiv_id?: string;
  source_url: string;
  rights_class?: 'OA' | 'USER_AUTH' | 'RESTRICTED' | 'UNKNOWN';
  tags?: string[];
};

type LiteratureSearchItem = {
  import_payload: LiteratureImportPayload;
  dedup: {
    is_existing: boolean;
    literature_id?: string;
    matched_by: DedupMatchType;
  };
};

type TopicScopeItem = {
  scope_id: string;
  topic_id: string;
  literature_id: string;
  scope_status: ScopeStatus;
  reason?: string;
  updated_at: string;
  title: string;
  authors: string[];
  year: number | null;
  doi: string | null;
  arxiv_id: string | null;
};

type PaperLiteratureItem = {
  link_id: string;
  paper_id: string;
  topic_id: string | null;
  literature_id: string;
  citation_status: CitationStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  title: string;
  authors: string[];
  year: number | null;
  doi: string | null;
  arxiv_id: string | null;
  source_provider: string | null;
  source_url: string | null;
  tags: string[];
};

type GovernanceRequest = {
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  body?: unknown;
};

const coreNavItems = ['文献管理', '选题管理', '论文管理'];
const writingNavItems = ['写作中心', '投稿检查'];
const themeModeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
];

const initialModule = coreNavItems[0] ?? '';
const citationStatusOptions: CitationStatus[] = ['seeded', 'selected', 'used', 'cited', 'dropped'];

const emptyMetric: RuntimeMetric = {
  tokens: null,
  cost_usd: null,
  gpu_requested: null,
  gpu_total: null,
  updated_at: '',
};

const emptyArtifactBundle: ArtifactBundle = {
  proposal_url: null,
  paper_url: null,
  repo_url: null,
  review_url: null,
};

const defaultApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000').trim();

function detectMacDesktopFromNavigator(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const navWithUaData = navigator as Navigator & {
    userAgentData?: {
      platform?: string;
    };
  };
  const platform = navWithUaData.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent ?? '';
  return platform.toLowerCase().includes('mac');
}

function isFlagEnabled(value?: string): boolean {
  if (!value) {
    return false;
  }

  return value === '1' || value.toLowerCase() === 'true';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toText(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function toOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeTimelinePayload(payload: unknown): TimelineEvent[] {
  const root = asRecord(payload);
  if (!root) {
    return [];
  }

  const eventsRaw = root.events;
  if (!Array.isArray(eventsRaw)) {
    return [];
  }

  const events = eventsRaw
    .map((item): TimelineEvent | null => {
      const row = asRecord(item);
      if (!row) {
        return null;
      }

      const eventId = toText(row.event_id);
      const eventType = toText(row.event_type);
      const timestamp = toText(row.timestamp);
      const summary = toText(row.summary);
      if (!eventId || !eventType || !timestamp || !summary) {
        return null;
      }

      const severity = toText(row.severity);
      const normalizedSeverity: TimelineEvent['severity'] =
        severity === 'warning' || severity === 'error' || severity === 'info' ? severity : undefined;

      return {
        event_id: eventId,
        event_type: eventType,
        module_id: toText(row.module_id),
        timestamp,
        node_id: toText(row.node_id),
        summary,
        severity: normalizedSeverity,
      };
    })
    .filter((item): item is TimelineEvent => item !== null);

  return events;
}

function normalizeMetricPayload(payload: unknown): RuntimeMetric | null {
  const root = asRecord(payload);
  const metric = root ? asRecord(root.paper_runtime_metric) : null;
  if (!metric) {
    return null;
  }

  const updatedAt = toText(metric.updated_at);
  if (!updatedAt) {
    return null;
  }

  return {
    tokens: toOptionalNumber(metric.tokens),
    cost_usd: toOptionalNumber(metric.cost_usd),
    gpu_requested: toOptionalNumber(metric.gpu_requested),
    gpu_total: toOptionalNumber(metric.gpu_total),
    updated_at: updatedAt,
  };
}

function normalizeArtifactPayload(payload: unknown): ArtifactBundle | null {
  const root = asRecord(payload);
  const bundle = root ? asRecord(root.artifact_bundle) : null;
  if (!bundle) {
    return null;
  }

  return {
    proposal_url: toText(bundle.proposal_url) ?? null,
    paper_url: toText(bundle.paper_url) ?? null,
    repo_url: toText(bundle.repo_url) ?? null,
    review_url: toText(bundle.review_url) ?? null,
  };
}

function normalizeReleasePayload(payload: unknown): ReleaseGateResponse | null {
  const root = asRecord(payload);
  const gateResult = root ? asRecord(root.gate_result) : null;
  if (!gateResult) {
    return null;
  }

  const reviewId = toText(gateResult.review_id);
  const auditRef = toText(gateResult.audit_ref);
  const accepted = gateResult.accepted;
  if (!reviewId || !auditRef || typeof accepted !== 'boolean') {
    return null;
  }

  return {
    gate_result: {
      accepted,
      review_id: reviewId,
      approved_by: toText(gateResult.approved_by),
      approved_at: toText(gateResult.approved_at),
      audit_ref: auditRef,
    },
  };
}

function normalizeLiteratureSearchPayload(payload: unknown): LiteratureSearchItem[] {
  const root = asRecord(payload);
  const itemsRaw = root?.items;
  if (!Array.isArray(itemsRaw)) {
    return [];
  }

  return itemsRaw
    .map((item): LiteratureSearchItem | null => {
      const row = asRecord(item);
      const importPayload = row ? asRecord(row.import_payload) : null;
      const dedup = row ? asRecord(row.dedup) : null;
      if (!importPayload || !dedup) {
        return null;
      }

      const provider = toText(importPayload.provider);
      const externalId = toText(importPayload.external_id);
      const title = toText(importPayload.title);
      const sourceUrl = toText(importPayload.source_url);
      if (!provider || !externalId || !title || !sourceUrl) {
        return null;
      }

      const dedupMatchedBy = toText(dedup.matched_by);
      const isExisting = dedup.is_existing;
      if (typeof isExisting !== 'boolean' || !dedupMatchedBy) {
        return null;
      }

      return {
        import_payload: {
          provider: provider === 'arxiv' ? 'arxiv' : 'crossref',
          external_id: externalId,
          title,
          abstract: toText(importPayload.abstract),
          authors: Array.isArray(importPayload.authors)
            ? importPayload.authors.filter((author): author is string => typeof author === 'string')
            : [],
          year: typeof importPayload.year === 'number' ? importPayload.year : undefined,
          doi: toText(importPayload.doi),
          arxiv_id: toText(importPayload.arxiv_id),
          source_url: sourceUrl,
          rights_class:
            toText(importPayload.rights_class) === 'OA' ||
            toText(importPayload.rights_class) === 'USER_AUTH' ||
            toText(importPayload.rights_class) === 'RESTRICTED'
              ? (toText(importPayload.rights_class) as LiteratureImportPayload['rights_class'])
              : 'UNKNOWN',
          tags: Array.isArray(importPayload.tags)
            ? importPayload.tags.filter((tag): tag is string => typeof tag === 'string')
            : [],
        },
        dedup: {
          is_existing: isExisting,
          literature_id: toText(dedup.literature_id),
          matched_by:
            dedupMatchedBy === 'doi' ||
            dedupMatchedBy === 'arxiv_id' ||
            dedupMatchedBy === 'title_authors_year'
              ? dedupMatchedBy
              : 'none',
        },
      };
    })
    .filter((row): row is LiteratureSearchItem => row !== null);
}

function normalizeTopicScopePayload(payload: unknown): TopicScopeItem[] {
  const root = asRecord(payload);
  const itemsRaw = root?.items;
  if (!Array.isArray(itemsRaw)) {
    return [];
  }

  return itemsRaw
    .map((item): TopicScopeItem | null => {
      const row = asRecord(item);
      if (!row) {
        return null;
      }

      const scopeId = toText(row.scope_id);
      const topicId = toText(row.topic_id);
      const literatureId = toText(row.literature_id);
      const scopeStatus = toText(row.scope_status);
      const updatedAt = toText(row.updated_at);
      const title = toText(row.title);
      if (!scopeId || !topicId || !literatureId || !scopeStatus || !updatedAt || !title) {
        return null;
      }

      return {
        scope_id: scopeId,
        topic_id: topicId,
        literature_id: literatureId,
        scope_status: scopeStatus === 'excluded' ? 'excluded' : 'in_scope',
        reason: toText(row.reason),
        updated_at: updatedAt,
        title,
        authors: Array.isArray(row.authors)
          ? row.authors.filter((author): author is string => typeof author === 'string')
          : [],
        year: typeof row.year === 'number' ? row.year : null,
        doi: toText(row.doi) ?? null,
        arxiv_id: toText(row.arxiv_id) ?? null,
      };
    })
    .filter((row): row is TopicScopeItem => row !== null);
}

function normalizePaperLiteraturePayload(payload: unknown): PaperLiteratureItem[] {
  const root = asRecord(payload);
  const itemsRaw = root?.items;
  if (!Array.isArray(itemsRaw)) {
    return [];
  }

  return itemsRaw
    .map((item): PaperLiteratureItem | null => {
      const row = asRecord(item);
      if (!row) {
        return null;
      }

      const linkId = toText(row.link_id);
      const paperId = toText(row.paper_id);
      const literatureId = toText(row.literature_id);
      const citationStatus = toText(row.citation_status);
      const createdAt = toText(row.created_at);
      const updatedAt = toText(row.updated_at);
      const title = toText(row.title);
      if (
        !linkId ||
        !paperId ||
        !literatureId ||
        !citationStatus ||
        !createdAt ||
        !updatedAt ||
        !title
      ) {
        return null;
      }

      const normalizedCitationStatus = citationStatusOptions.includes(citationStatus as CitationStatus)
        ? (citationStatus as CitationStatus)
        : 'seeded';

      return {
        link_id: linkId,
        paper_id: paperId,
        topic_id: toText(row.topic_id) ?? null,
        literature_id: literatureId,
        citation_status: normalizedCitationStatus,
        note: toText(row.note) ?? null,
        created_at: createdAt,
        updated_at: updatedAt,
        title,
        authors: Array.isArray(row.authors)
          ? row.authors.filter((author): author is string => typeof author === 'string')
          : [],
        year: typeof row.year === 'number' ? row.year : null,
        doi: toText(row.doi) ?? null,
        arxiv_id: toText(row.arxiv_id) ?? null,
        source_provider: toText(row.source_provider) ?? null,
        source_url: toText(row.source_url) ?? null,
        tags: Array.isArray(row.tags)
          ? row.tags.filter((tag): tag is string => typeof tag === 'string')
          : [],
      };
    })
    .filter((row): row is PaperLiteratureItem => row !== null);
}

function readErrorMessage(payload: unknown, status: number): string {
  const root = asRecord(payload);
  const error = root ? asRecord(root.error) : null;
  if (error) {
    const code = toText(error.code);
    const message = toText(error.message);
    if (code && message) {
      return `${code}: ${message}`;
    }
    if (message) {
      return message;
    }
  }

  const message = root ? toText(root.message) : undefined;
  if (message) {
    return message;
  }

  return `Request failed with status ${status}.`;
}

function formatNumber(value: number | null): string {
  if (value === null) {
    return '--';
  }

  return value.toLocaleString('en-US');
}

function formatCurrency(value: number | null): string {
  if (value === null) {
    return '--';
  }

  return `$${value.toFixed(4)}`;
}

function formatTimestamp(value: string): string {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function tryGetSnapshotId(summary: string): string | null {
  const matched = summary.match(/SP-\d{4}/);
  return matched ? matched[0] : null;
}

async function requestGovernance<T>(request: GovernanceRequest): Promise<T> {
  const desktopBridge = window.desktopApi?.requestGovernance;

  if (desktopBridge) {
    const bridgeResponse = await desktopBridge(request);
    if (!bridgeResponse.ok) {
      throw new Error(readErrorMessage(bridgeResponse.payload, bridgeResponse.status));
    }
    return bridgeResponse.payload as T;
  }

  const init: RequestInit = {
    method: request.method,
    headers: {
      Accept: 'application/json',
    },
  };

  if (request.body !== undefined) {
    init.headers = {
      ...init.headers,
      'Content-Type': 'application/json',
    };
    init.body = JSON.stringify(request.body);
  }

  const response = await fetch(new URL(request.path, defaultApiBaseUrl), init);
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    throw new Error(readErrorMessage(payload, response.status));
  }

  return payload as T;
}

type AppProps = {
  initialThemeMode: ThemeMode;
};

export function App({ initialThemeMode }: AppProps) {
  const [activeModule, setActiveModule] = useState<string>(initialModule);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMacDesktop, setIsMacDesktop] = useState<boolean>(() => detectMacDesktopFromNavigator());
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialThemeMode);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => readSystemPrefersDark());
  const [toolbarSearchInput, setToolbarSearchInput] = useState<string>('');
  const [, setActionHint] = useState<string>('请选择一个模块开始浏览。');
  const [governanceEnabled, setGovernanceEnabled] = useState<boolean>(
    isFlagEnabled(import.meta.env.VITE_ENABLE_GOVERNANCE_PANELS),
  );
  const [paperIdInput, setPaperIdInput] = useState<string>('P001');
  const [paperId, setPaperId] = useState<string>('P001');
  const [refreshTick, setRefreshTick] = useState<number>(0);

  const [timelinePanel, setTimelinePanel] = useState<PanelState<TimelineEvent[]>>({
    status: 'idle',
    data: [],
    error: null,
  });
  const [metricsPanel, setMetricsPanel] = useState<PanelState<RuntimeMetric>>({
    status: 'idle',
    data: emptyMetric,
    error: null,
  });
  const [artifactPanel, setArtifactPanel] = useState<PanelState<ArtifactBundle>>({
    status: 'idle',
    data: emptyArtifactBundle,
    error: null,
  });
  const [topicIdInput, setTopicIdInput] = useState<string>('TOPIC-001');
  const [topicId, setTopicId] = useState<string>('TOPIC-001');
  const [literatureQuery, setLiteratureQuery] = useState<string>('large language model evaluation');
  const [searchItems, setSearchItems] = useState<LiteratureSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, boolean>>({});
  const [topicScopeItems, setTopicScopeItems] = useState<TopicScopeItem[]>([]);
  const [topicScopeLoading, setTopicScopeLoading] = useState<boolean>(false);
  const [topicScopeError, setTopicScopeError] = useState<string | null>(null);
  const [paperLiteratureItems, setPaperLiteratureItems] = useState<PaperLiteratureItem[]>([]);
  const [paperLiteratureLoading, setPaperLiteratureLoading] = useState<boolean>(false);
  const [paperLiteratureError, setPaperLiteratureError] = useState<string | null>(null);
  const [literatureActionMessage, setLiteratureActionMessage] = useState<string>('');
  const [scopeReasonInput, setScopeReasonInput] = useState<string>('初筛保留');

  const [reviewersInput, setReviewersInput] = useState<string>('reviewer-1');
  const [decision, setDecision] = useState<ReviewDecision>('hold');
  const [riskFlagsInput, setRiskFlagsInput] = useState<string>('policy-check');
  const [labelPolicy, setLabelPolicy] = useState<string>('ai-generated-required');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSubmitState, setReviewSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [reviewSubmitMessage, setReviewSubmitMessage] = useState<string>('');

  useEffect(() => {
    let unmounted = false;
    const getAppMeta = window.desktopApi?.getAppMeta;

    if (!getAppMeta) {
      return () => {
        unmounted = true;
      };
    }

    void getAppMeta()
      .then((meta) => {
        if (!unmounted) {
          setIsMacDesktop(meta.platform === 'darwin');
        }
      })
      .catch(() => {
        // Keep navigator-based fallback if desktop bridge meta is unavailable.
      });

    return () => {
      unmounted = true;
    };
  }, []);

  useEffect(() => {
    if (themeMode !== 'system' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(SYSTEM_DARK_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    setSystemPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [themeMode]);

  useEffect(() => {
    applyTheme(resolveTheme(themeMode, systemPrefersDark));

    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
    } catch {
      // Ignore storage write failures and keep runtime state.
    }
  }, [themeMode, systemPrefersDark]);

  const loadGovernancePanels = useCallback(async (targetPaperId: string) => {
    const normalizedPaperId = targetPaperId.trim();

    if (!normalizedPaperId) {
      setTimelinePanel({ status: 'error', data: [], error: 'Paper ID 不能为空。' });
      setMetricsPanel({ status: 'error', data: emptyMetric, error: 'Paper ID 不能为空。' });
      setArtifactPanel({ status: 'error', data: emptyArtifactBundle, error: 'Paper ID 不能为空。' });
      return;
    }

    const encodedId = encodeURIComponent(normalizedPaperId);

    setTimelinePanel({ status: 'loading', data: [], error: null });
    setMetricsPanel({ status: 'loading', data: emptyMetric, error: null });
    setArtifactPanel({ status: 'loading', data: emptyArtifactBundle, error: null });

    const [timelineResult, metricsResult, artifactResult] = await Promise.allSettled([
      requestGovernance({ method: 'GET', path: `/paper-projects/${encodedId}/timeline` }),
      requestGovernance({ method: 'GET', path: `/paper-projects/${encodedId}/resource-metrics` }),
      requestGovernance({ method: 'GET', path: `/paper-projects/${encodedId}/artifact-bundle` }),
    ]);

    if (timelineResult.status === 'fulfilled') {
      const normalized = normalizeTimelinePayload(timelineResult.value);
      setTimelinePanel({
        status: normalized.length > 0 ? 'ready' : 'empty',
        data: normalized,
        error: null,
      });
    } else {
      setTimelinePanel({ status: 'error', data: [], error: timelineResult.reason instanceof Error ? timelineResult.reason.message : String(timelineResult.reason) });
    }

    if (metricsResult.status === 'fulfilled') {
      const normalized = normalizeMetricPayload(metricsResult.value);
      if (normalized) {
        setMetricsPanel({ status: 'ready', data: normalized, error: null });
      } else {
        setMetricsPanel({ status: 'empty', data: emptyMetric, error: null });
      }
    } else {
      setMetricsPanel({ status: 'error', data: emptyMetric, error: metricsResult.reason instanceof Error ? metricsResult.reason.message : String(metricsResult.reason) });
    }

    if (artifactResult.status === 'fulfilled') {
      const normalized = normalizeArtifactPayload(artifactResult.value);
      if (normalized) {
        setArtifactPanel({ status: 'ready', data: normalized, error: null });
      } else {
        setArtifactPanel({ status: 'empty', data: emptyArtifactBundle, error: null });
      }
    } else {
      setArtifactPanel({ status: 'error', data: emptyArtifactBundle, error: artifactResult.reason instanceof Error ? artifactResult.reason.message : String(artifactResult.reason) });
    }
  }, []);

  useEffect(() => {
    if (!governanceEnabled) {
      setTimelinePanel({ status: 'idle', data: [], error: null });
      setMetricsPanel({ status: 'idle', data: emptyMetric, error: null });
      setArtifactPanel({ status: 'idle', data: emptyArtifactBundle, error: null });
      return;
    }

    void loadGovernancePanels(paperId);
  }, [governanceEnabled, loadGovernancePanels, paperId, refreshTick]);

  const loadTopicScope = useCallback(async (targetTopicId: string) => {
    const normalizedTopicId = targetTopicId.trim();
    if (!normalizedTopicId) {
      setTopicScopeItems([]);
      setTopicScopeError('Topic ID 不能为空。');
      return;
    }

    setTopicScopeLoading(true);
    setTopicScopeError(null);
    try {
      const payload = await requestGovernance({
        method: 'GET',
        path: `/topics/${encodeURIComponent(normalizedTopicId)}/literature-scope`,
      });
      setTopicScopeItems(normalizeTopicScopePayload(payload));
    } catch (error) {
      setTopicScopeItems([]);
      setTopicScopeError(error instanceof Error ? error.message : '加载选题文献范围失败。');
    } finally {
      setTopicScopeLoading(false);
    }
  }, []);

  const loadPaperLiterature = useCallback(async (targetPaperId: string) => {
    const normalizedPaperId = targetPaperId.trim();
    if (!normalizedPaperId) {
      setPaperLiteratureItems([]);
      setPaperLiteratureError('Paper ID 不能为空。');
      return;
    }

    setPaperLiteratureLoading(true);
    setPaperLiteratureError(null);
    try {
      const payload = await requestGovernance({
        method: 'GET',
        path: `/paper-projects/${encodeURIComponent(normalizedPaperId)}/literature`,
      });
      setPaperLiteratureItems(normalizePaperLiteraturePayload(payload));
    } catch (error) {
      setPaperLiteratureItems([]);
      setPaperLiteratureError(error instanceof Error ? error.message : '加载论文文献列表失败。');
    } finally {
      setPaperLiteratureLoading(false);
    }
  }, []);

  const handleSearchLiterature = async () => {
    const query = literatureQuery.trim();
    if (!query) {
      setSearchError('请输入检索关键词。');
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setLiteratureActionMessage('');
    try {
      const payload = await requestGovernance({
        method: 'POST',
        path: '/literature/search',
        body: {
          query,
          providers: ['crossref', 'arxiv'],
          limit: 8,
        },
      });
      const items = normalizeLiteratureSearchPayload(payload);
      setSearchItems(items);
      setSelectedCandidates({});
      setActionHint(`文献检索完成，共 ${items.length} 条候选。`);
      if (items.length === 0) {
        setLiteratureActionMessage('未检索到候选文献，可尝试更换关键词。');
      }
    } catch (error) {
      setSearchItems([]);
      setSearchError(error instanceof Error ? error.message : '检索失败。');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleToggleCandidate = (key: string) => {
    setSelectedCandidates((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleImportSelectedCandidates = async () => {
    const selectedItems = searchItems.filter((item) =>
      selectedCandidates[item.import_payload.external_id],
    );
    if (selectedItems.length === 0) {
      setLiteratureActionMessage('请至少选择一条候选文献。');
      return;
    }

    try {
      const payload = await requestGovernance({
        method: 'POST',
        path: '/literature/import',
        body: {
          items: selectedItems.map((item) => item.import_payload),
        },
      });
      const root = asRecord(payload);
      const results = root?.results;
      const importedIds = Array.isArray(results)
        ? results
            .map((row) => asRecord(row))
            .map((row) => (row ? toText(row.literature_id) : undefined))
            .filter((id): id is string => Boolean(id))
        : [];

      if (importedIds.length > 0) {
        await requestGovernance({
          method: 'POST',
          path: `/topics/${encodeURIComponent(topicId.trim())}/literature-scope`,
          body: {
            actions: importedIds.map((literatureId) => ({
              literature_id: literatureId,
              scope_status: 'in_scope',
              reason: scopeReasonInput.trim() || undefined,
            })),
          },
        });
      }

      setLiteratureActionMessage(`已导入 ${selectedItems.length} 条文献，并加入当前选题范围。`);
      setActionHint(`文献导入完成：${selectedItems.length} 条。`);
      await loadTopicScope(topicId);
    } catch (error) {
      setLiteratureActionMessage(error instanceof Error ? error.message : '导入失败。');
    }
  };

  const handleScopeStatusChange = async (literatureId: string, scopeStatus: ScopeStatus) => {
    try {
      await requestGovernance({
        method: 'POST',
        path: `/topics/${encodeURIComponent(topicId.trim())}/literature-scope`,
        body: {
          actions: [
            {
              literature_id: literatureId,
              scope_status: scopeStatus,
              reason: scopeReasonInput.trim() || undefined,
            },
          ],
        },
      });
      await loadTopicScope(topicId);
      setLiteratureActionMessage(
        scopeStatus === 'in_scope' ? '文献已加入选题范围。' : '文献已从选题范围排除。',
      );
    } catch (error) {
      setLiteratureActionMessage(error instanceof Error ? error.message : '更新选题范围失败。');
    }
  };

  const handleSyncPaperFromTopic = async () => {
    const normalizedPaperId = paperId.trim();
    const normalizedTopicId = topicId.trim();
    if (!normalizedPaperId || !normalizedTopicId) {
      setLiteratureActionMessage('请先填写 Paper ID 与 Topic ID。');
      return;
    }

    try {
      const payload = await requestGovernance({
        method: 'POST',
        path: `/paper-projects/${encodeURIComponent(normalizedPaperId)}/literature-links/from-topic`,
        body: {
          topic_id: normalizedTopicId,
        },
      });
      const root = asRecord(payload);
      const linkedCount = typeof root?.linked_count === 'number' ? root.linked_count : 0;
      const skippedCount = typeof root?.skipped_count === 'number' ? root.skipped_count : 0;
      setLiteratureActionMessage(
        `已同步到论文管理：新增 ${linkedCount} 条，跳过 ${skippedCount} 条。`,
      );
      await loadPaperLiterature(normalizedPaperId);
    } catch (error) {
      setLiteratureActionMessage(error instanceof Error ? error.message : '同步论文文献失败。');
    }
  };

  const handleUpdateCitationStatus = async (linkId: string, status: CitationStatus) => {
    try {
      await requestGovernance({
        method: 'PATCH',
        path: `/paper-projects/${encodeURIComponent(paperId.trim())}/literature-links/${encodeURIComponent(linkId)}`,
        body: {
          citation_status: status,
        },
      });
      await loadPaperLiterature(paperId);
      setLiteratureActionMessage(`引用状态已更新为 ${status}。`);
    } catch (error) {
      setLiteratureActionMessage(error instanceof Error ? error.message : '更新引用状态失败。');
    }
  };

  const handleApplyTopicId = () => {
    const normalized = topicIdInput.trim();
    if (!normalized) {
      setLiteratureActionMessage('Topic ID 不能为空。');
      return;
    }
    setTopicId(normalized);
    void loadTopicScope(normalized);
  };

  useEffect(() => {
    if (activeModule === '文献管理') {
      void loadTopicScope(topicId);
    }
    if (activeModule === '论文管理' || activeModule === '写作中心') {
      void loadPaperLiterature(paperId);
    }
  }, [activeModule, loadPaperLiterature, loadTopicScope, paperId, topicId]);

  const releaseQueue = useMemo(() => {
    return timelinePanel.data
      .filter(
        (event) =>
          event.event_type === 'research.node.status.changed' ||
          event.event_type === 'research.release.reviewed',
      )
      .slice(-6)
      .reverse();
  }, [timelinePanel.data]);

  const inScopeCount = topicScopeItems.filter((item) => item.scope_status === 'in_scope').length;
  const excludedScopeCount = topicScopeItems.filter((item) => item.scope_status === 'excluded').length;
  const citedCount = paperLiteratureItems.filter((item) => item.citation_status === 'cited').length;
  const usedCount = paperLiteratureItems.filter((item) => item.citation_status === 'used').length;

  const metricCards = useMemo(() => {
    if (activeModule === '文献管理' || activeModule === '选题管理') {
      return [
        { label: '检索候选', value: String(searchItems.length) },
        { label: '选题范围（保留）', value: String(inScopeCount) },
        { label: '选题范围（排除）', value: String(excludedScopeCount) },
        { label: '已勾选待导入', value: String(Object.values(selectedCandidates).filter(Boolean).length) },
      ];
    }

    if (activeModule === '论文管理') {
      return [
        { label: '论文文献总数', value: String(paperLiteratureItems.length) },
        { label: '状态：cited', value: String(citedCount) },
        { label: '状态：used', value: String(usedCount) },
        { label: '当前 Paper', value: paperId },
      ];
    }

    if (activeModule === '写作中心') {
      return [
        { label: '可用引用条目', value: String(paperLiteratureItems.length) },
        { label: '高置信引用（cited）', value: String(citedCount) },
        { label: '进行中引用（used）', value: String(usedCount) },
        { label: '引用来源', value: '论文管理（只读）' },
      ];
    }

    return [
      { label: '当前 Topic', value: topicId },
      { label: '当前 Paper', value: paperId },
      { label: '选题范围（保留）', value: String(inScopeCount) },
      { label: '论文文献总数', value: String(paperLiteratureItems.length) },
    ];
  }, [
    activeModule,
    citedCount,
    excludedScopeCount,
    inScopeCount,
    paperId,
    paperLiteratureItems.length,
    searchItems.length,
    selectedCandidates,
    topicId,
    usedCount,
  ]);

  const handleModuleSelect = (moduleName: string) => {
    setActiveModule(moduleName);
    setActionHint(`已切换到「${moduleName}」模块。`);
  };

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((current) => !current);
  };

  const handleToggleGovernance = () => {
    setGovernanceEnabled((current) => {
      const next = !current;
      setActionHint(next ? '治理面板已启用（当前会话）。' : '治理面板已关闭，主流程不受影响。');
      return next;
    });
  };

  const handleApplyPaperId = () => {
    const normalized = paperIdInput.trim();
    if (!normalized) {
      setActionHint('Paper ID 不能为空。');
      return;
    }

    setPaperId(normalized);
    setReviewSubmitState('idle');
    setReviewSubmitMessage('');
    setActionHint(`已加载治理项目 ${normalized}。`);
    void loadPaperLiterature(normalized);
  };

  const handleRefreshPanels = () => {
    setRefreshTick((value) => value + 1);
    setActionHint('治理面板已刷新。');
  };

  const handleEvidenceTrace = (event: TimelineEvent) => {
    const snapshotId = tryGetSnapshotId(event.summary);
    const evidence = [
      event.node_id ? `node:${event.node_id}` : 'node:none',
      snapshotId ? `snapshot:${snapshotId}` : 'snapshot:none',
      event.module_id ? `module:${event.module_id}` : 'module:none',
    ].join(' · ');
    setActionHint(`证据链定位：${evidence}`);
  };

  const handleSubmitReleaseReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedPaperId = paperId.trim();
    if (!normalizedPaperId) {
      setReviewSubmitState('error');
      setReviewSubmitMessage('Paper ID 不能为空。');
      return;
    }

    const reviewers = reviewersInput
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (reviewers.length === 0) {
      setReviewSubmitState('error');
      setReviewSubmitMessage('至少提供一个 reviewer。');
      return;
    }

    const riskFlags = riskFlagsInput
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    setReviewSubmitState('submitting');
    setReviewSubmitMessage('正在提交 release review...');

    try {
      const response = await requestGovernance({
        method: 'POST',
        path: `/paper-projects/${encodeURIComponent(normalizedPaperId)}/release-gate/review`,
        body: {
          reviewers,
          decision,
          risk_flags: riskFlags,
          label_policy: labelPolicy,
          comment: reviewComment.trim() || undefined,
        },
      });

      const normalized = normalizeReleasePayload(response);
      if (!normalized) {
        throw new Error('release-review response invalid.');
      }

      setReviewSubmitState('success');
      setReviewSubmitMessage(
        `已提交 ${normalized.gate_result.review_id}（audit: ${normalized.gate_result.audit_ref}）。`,
      );
      setActionHint(
        `release-review ${normalized.gate_result.review_id} 提交完成，decision=${decision}。`,
      );
      setRefreshTick((value) => value + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'release-review 提交失败。';
      setReviewSubmitState('error');
      setReviewSubmitMessage(message);
      setActionHint(`release-review 提交失败：${message}`);
    }
  };

  const shellClassName = [
    'desktop-shell',
    isMacDesktop ? ' is-macos-chrome' : '',
    isSidebarCollapsed ? ' is-sidebar-collapsed' : ' is-sidebar-expanded',
  ].join('');

  return (
    <div data-ui="page" className={shellClassName}>
      <header className="topbar">
        <span className="topbar-region topbar-region-left" aria-hidden="true" />
        <span className="topbar-region topbar-region-right" aria-hidden="true" />
        <div className="topbar-inner">
          <div className="topbar-left">
            <button
              type="button"
              className="topbar-sidebar-toggle"
              onClick={handleToggleSidebar}
              aria-label={isSidebarCollapsed ? '展开导航栏' : '折叠导航栏'}
              title={isSidebarCollapsed ? '展开导航栏' : '折叠导航栏'}
            >
              <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
                <rect x="2.5" y="3.5" width="15" height="13" rx="3.4" />
                {isSidebarCollapsed ? (
                  <line x1="12.4" y1="7" x2="12.4" y2="13" />
                ) : (
                  <line x1="7.6" y1="7" x2="7.6" y2="13" />
                )}
              </svg>
            </button>
          </div>
          <div className="topbar-center" aria-hidden="true" />
          <div className="topbar-right">
            <label
              className={`topbar-search${toolbarSearchInput.trim().length > 0 ? ' has-value' : ''}`}
              aria-label="搜索（占位）"
            >
              <span className="topbar-search-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" focusable="false">
                  <circle cx="8.25" cy="8.25" r="5.25" />
                  <line x1="12.3" y1="12.3" x2="17" y2="17" />
                </svg>
              </span>
              <input
                type="text"
                value={toolbarSearchInput}
                onChange={(event) => setToolbarSearchInput(event.target.value)}
                placeholder="搜索（占位）"
              />
            </label>
            <span className="topbar-divider" aria-hidden="true" />
            <div className="topbar-theme-switch" role="group" aria-label="配色方案">
              {themeModeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`topbar-theme-switch-item${themeMode === option.value ? ' is-active' : ''}`}
                  onClick={() => setThemeMode(option.value)}
                  aria-pressed={themeMode === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className={`shell-main${isSidebarCollapsed ? ' is-sidebar-collapsed' : ''}`}>
        <aside className="sidebar-pane">
          {!isSidebarCollapsed ? (
            <nav className="sidebar-nav-zones" aria-label="模块导航">
              <section className="sidebar-nav-zone sidebar-nav-zone-core">
                <div className="module-nav-list">
                  {coreNavItems.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`module-nav-item${activeModule === item ? ' is-active' : ''}`}
                      onClick={() => handleModuleSelect(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </section>
              <section className="sidebar-nav-zone sidebar-nav-zone-writing">
                <div className="module-nav-list">
                  {writingNavItems.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`module-nav-item${activeModule === item ? ' is-active' : ''}`}
                      onClick={() => handleModuleSelect(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </section>
            </nav>
          ) : null}
        </aside>

        <main className="workspace-pane">
          <section data-ui="grid" data-cols="4" data-gap="3" className="metrics-grid">
            {metricCards.map((card) => (
              <article key={`${activeModule}-${card.label}`} className="dashboard-metric">
                <p data-ui="text" data-variant="label" data-tone="muted">{card.label}</p>
                <p data-ui="text" data-variant="h3" data-tone="primary">{card.value}</p>
              </article>
            ))}
          </section>

          {activeModule === '文献管理' ? (
            <section className="module-dashboard literature-workspace">
              <div data-ui="stack" data-direction="col" data-gap="3">
                <div data-ui="toolbar" data-align="between" data-wrap="wrap">
                  <p data-ui="text" data-variant="h3" data-tone="primary">文献管理流程（M0）</p>
                  <span data-ui="badge" data-variant="subtle" data-tone="neutral">
                    Topic: {topicId}
                  </span>
                </div>
                <div data-ui="grid" data-cols="2" data-gap="3" className="literature-controls-grid">
                  <label data-ui="field">
                    <span data-slot="label">Topic ID</span>
                    <div data-ui="toolbar" data-wrap="nowrap" className="literature-input-group">
                      <input
                        data-ui="input"
                        data-size="sm"
                        value={topicIdInput}
                        onChange={(event) => setTopicIdInput(event.target.value)}
                        placeholder="例如 TOPIC-001"
                      />
                      <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={handleApplyTopicId}>
                        应用
                      </button>
                    </div>
                  </label>
                  <label data-ui="field">
                    <span data-slot="label">检索关键词（Crossref + arXiv）</span>
                    <div data-ui="toolbar" data-wrap="nowrap" className="literature-input-group">
                      <input
                        data-ui="input"
                        data-size="sm"
                        value={literatureQuery}
                        onChange={(event) => setLiteratureQuery(event.target.value)}
                        placeholder="输入关键词"
                      />
                      <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={handleSearchLiterature}>
                        {searchLoading ? '检索中...' : '检索'}
                      </button>
                    </div>
                  </label>
                </div>

                <div data-ui="toolbar" data-align="between" data-wrap="wrap">
                  <label data-ui="field" className="scope-reason-field">
                    <span data-slot="label">范围变更原因（可选）</span>
                    <input
                      data-ui="input"
                      data-size="sm"
                      value={scopeReasonInput}
                      onChange={(event) => setScopeReasonInput(event.target.value)}
                      placeholder="例如：选题核心相关"
                    />
                  </label>
                  <button
                    data-ui="button"
                    data-variant="primary"
                    data-size="sm"
                    type="button"
                    onClick={handleImportSelectedCandidates}
                  >
                    导入并加入选题范围
                  </button>
                </div>

                {searchError ? <p data-ui="text" data-variant="caption" data-tone="danger">{searchError}</p> : null}
                {topicScopeError ? <p data-ui="text" data-variant="caption" data-tone="danger">{topicScopeError}</p> : null}
                {literatureActionMessage ? (
                  <p data-ui="text" data-variant="caption" data-tone="muted">{literatureActionMessage}</p>
                ) : null}

                <section data-ui="grid" data-cols="2" data-gap="3" className="literature-panels">
                  <article className="dashboard-subpanel literature-panel">
                    <p data-ui="text" data-variant="label" data-tone="secondary">检索候选</p>
                    <div className="literature-list">
                      {searchItems.length === 0 ? (
                        <p data-ui="text" data-variant="caption" data-tone="muted">暂无候选，先执行检索。</p>
                      ) : (
                        searchItems.map((item) => {
                          const key = item.import_payload.external_id;
                          return (
                            <label key={key} className="literature-list-item selectable">
                              <input
                                type="checkbox"
                                checked={Boolean(selectedCandidates[key])}
                                onChange={() => handleToggleCandidate(key)}
                              />
                              <div>
                                <p data-ui="text" data-variant="body" data-tone="primary">{item.import_payload.title}</p>
                                <p data-ui="text" data-variant="caption" data-tone="muted">
                                  {item.import_payload.provider} · {item.import_payload.year ?? '--'} · dedup:{' '}
                                  {item.dedup.matched_by}
                                </p>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </article>

                  <article className="dashboard-subpanel literature-panel">
                    <p data-ui="text" data-variant="label" data-tone="secondary">选题文献范围</p>
                    {topicScopeLoading ? (
                      <p data-ui="text" data-variant="caption" data-tone="muted">正在加载选题范围...</p>
                    ) : (
                      <div className="literature-list">
                        {topicScopeItems.length === 0 ? (
                          <p data-ui="text" data-variant="caption" data-tone="muted">当前选题暂无文献范围。</p>
                        ) : (
                          topicScopeItems.map((item) => (
                            <div key={item.scope_id} className="literature-list-item">
                              <div>
                                <p data-ui="text" data-variant="body" data-tone="primary">{item.title}</p>
                                <p data-ui="text" data-variant="caption" data-tone="muted">
                                  {item.scope_status} · {formatTimestamp(item.updated_at)}
                                </p>
                              </div>
                              <div data-ui="toolbar" data-wrap="nowrap" className="scope-actions">
                                <button
                                  data-ui="button"
                                  data-variant="ghost"
                                  data-size="sm"
                                  type="button"
                                  onClick={() => handleScopeStatusChange(item.literature_id, 'in_scope')}
                                >
                                  保留
                                </button>
                                <button
                                  data-ui="button"
                                  data-variant="ghost"
                                  data-size="sm"
                                  type="button"
                                  onClick={() => handleScopeStatusChange(item.literature_id, 'excluded')}
                                >
                                  排除
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </article>
                </section>
              </div>
            </section>
          ) : null}

          {activeModule === '论文管理' ? (
            <section className="module-dashboard paper-literature-workspace">
              <div data-ui="stack" data-direction="col" data-gap="3">
                <div data-ui="toolbar" data-align="between" data-wrap="wrap">
                  <p data-ui="text" data-variant="h3" data-tone="primary">论文管理文献集合</p>
                  <div data-ui="toolbar" data-gap="2" data-wrap="wrap">
                    <span data-ui="badge" data-variant="subtle" data-tone="neutral">Paper: {paperId}</span>
                    <span data-ui="badge" data-variant="subtle" data-tone="neutral">Topic: {topicId}</span>
                  </div>
                </div>
                <div data-ui="toolbar" data-wrap="wrap">
                  <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={handleSyncPaperFromTopic}>
                    从选题范围带入论文
                  </button>
                  <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={() => loadPaperLiterature(paperId)}>
                    刷新论文文献
                  </button>
                </div>
                {paperLiteratureError ? (
                  <p data-ui="text" data-variant="caption" data-tone="danger">{paperLiteratureError}</p>
                ) : null}
                {literatureActionMessage ? (
                  <p data-ui="text" data-variant="caption" data-tone="muted">{literatureActionMessage}</p>
                ) : null}
                {paperLiteratureLoading ? (
                  <p data-ui="text" data-variant="caption" data-tone="muted">正在加载论文文献...</p>
                ) : (
                  <div className="paper-literature-table">
                    {paperLiteratureItems.length === 0 ? (
                      <p data-ui="text" data-variant="caption" data-tone="muted">当前论文暂无文献。</p>
                    ) : (
                      paperLiteratureItems.map((item) => (
                        <div key={item.link_id} className="paper-literature-row">
                          <div>
                            <p data-ui="text" data-variant="body" data-tone="primary">{item.title}</p>
                            <p data-ui="text" data-variant="caption" data-tone="muted">
                              {item.source_provider ?? '--'} · {item.source_url ?? '--'}
                            </p>
                          </div>
                          <select
                            data-ui="select"
                            data-size="sm"
                            value={item.citation_status}
                            onChange={(event) =>
                              handleUpdateCitationStatus(item.link_id, event.target.value as CitationStatus)
                            }
                          >
                            {citationStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {activeModule === '写作中心' ? (
            <section className="module-dashboard writing-literature-workspace">
              <p data-ui="text" data-variant="h3" data-tone="primary">写作中心引用视图（只读）</p>
              <p data-ui="text" data-variant="caption" data-tone="muted">
                当前为 M0 单向联动：引用状态由论文管理维护，写作中心仅消费展示。
              </p>
              <div className="writing-citation-list">
                {paperLiteratureItems.length === 0 ? (
                  <p data-ui="text" data-variant="caption" data-tone="muted">暂无可用引用。</p>
                ) : (
                  paperLiteratureItems.map((item) => (
                    <div key={item.link_id} className="writing-citation-item">
                      <p data-ui="text" data-variant="body" data-tone="primary">{item.title}</p>
                      <p data-ui="text" data-variant="caption" data-tone="muted">
                        status: {item.citation_status} · doi: {item.doi ?? '--'} · arxiv: {item.arxiv_id ?? '--'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          ) : null}

          {governanceEnabled ? (
            <section data-ui="stack" data-direction="col" data-gap="4" className="governance-zone">
              <article className="dashboard-toolbar governance-controls">
                <div data-ui="toolbar" data-align="between" data-wrap="wrap">
                  <div data-ui="stack" data-direction="row" data-gap="3" data-align="end" data-wrap="wrap" className="governance-controls-left">
                    <label data-ui="field" className="paper-id-field">
                      <span data-slot="label">Paper ID</span>
                      <input
                        data-ui="input"
                        data-size="sm"
                        value={paperIdInput}
                        onChange={(event) => setPaperIdInput(event.target.value)}
                        placeholder="例如 P001"
                      />
                    </label>
                    <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={handleApplyPaperId}>
                      加载项目
                    </button>
                    <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={handleRefreshPanels}>
                      刷新
                    </button>
                  </div>
                  <div data-ui="stack" data-direction="row" data-gap="2" data-align="center" data-wrap="wrap">
                    <span data-ui="badge" data-variant="subtle" data-tone="neutral">project: {paperId}</span>
                    <span data-ui="badge" data-variant="subtle" data-tone="neutral">api: {defaultApiBaseUrl}</span>
                    <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={handleToggleGovernance}>
                      关闭面板
                    </button>
                  </div>
                </div>
              </article>

              <section data-ui="grid" data-cols="2" data-gap="4" className="governance-panels">
                <article className="dashboard-subpanel governance-panel">
                  <div data-ui="stack" data-direction="col" data-gap="3">
                    <p data-ui="text" data-variant="h3" data-tone="primary">Timeline</p>
                    {timelinePanel.status === 'loading' && (
                      <p data-ui="text" data-variant="body" data-tone="muted">正在加载 timeline...</p>
                    )}
                    {timelinePanel.status === 'error' && (
                      <p data-ui="text" data-variant="body" data-tone="danger">{timelinePanel.error ?? 'timeline 加载失败。'}</p>
                    )}
                    {timelinePanel.status === 'empty' && (
                      <p data-ui="text" data-variant="body" data-tone="muted">暂无 timeline 事件。</p>
                    )}
                    {(timelinePanel.status === 'ready' || timelinePanel.status === 'idle') && timelinePanel.data.length > 0 && (
                      <div data-ui="list" data-variant="rows" data-density="comfortable" className="timeline-list">
                        {timelinePanel.data.map((event) => {
                          const snapshotId = tryGetSnapshotId(event.summary);
                          return (
                            <div key={event.event_id} className="timeline-item">
                              <div data-ui="toolbar" data-align="between" data-wrap="wrap">
                                <p data-ui="text" data-variant="label" data-tone="secondary">{event.event_type}</p>
                                <p data-ui="text" data-variant="caption" data-tone="muted">{formatTimestamp(event.timestamp)}</p>
                              </div>
                              <p data-ui="text" data-variant="body" data-tone="primary">{event.summary}</p>
                              <div data-ui="stack" data-direction="row" data-gap="2" data-wrap="wrap" data-align="center">
                                {event.node_id ? (
                                  <span data-ui="badge" data-variant="subtle" data-tone="neutral">node:{event.node_id}</span>
                                ) : null}
                                {snapshotId ? (
                                  <span data-ui="badge" data-variant="subtle" data-tone="neutral">snapshot:{snapshotId}</span>
                                ) : null}
                                {event.module_id ? (
                                  <span data-ui="badge" data-variant="subtle" data-tone="neutral">module:{event.module_id}</span>
                                ) : null}
                                <button
                                  data-ui="button"
                                  data-variant="ghost"
                                  data-size="sm"
                                  type="button"
                                  onClick={() => handleEvidenceTrace(event)}
                                >
                                  证据链
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </article>

                <article className="dashboard-subpanel governance-panel">
                  <div data-ui="stack" data-direction="col" data-gap="3">
                    <p data-ui="text" data-variant="h3" data-tone="primary">Runtime Metrics</p>
                    {metricsPanel.status === 'loading' && (
                      <p data-ui="text" data-variant="body" data-tone="muted">正在计算运行指标...</p>
                    )}
                    {metricsPanel.status === 'error' && (
                      <p data-ui="text" data-variant="body" data-tone="danger">{metricsPanel.error ?? '指标加载失败。'}</p>
                    )}
                    {(metricsPanel.status === 'ready' || metricsPanel.status === 'empty' || metricsPanel.status === 'idle') && (
                      <div data-ui="grid" data-cols="2" data-gap="3" className="runtime-metrics-grid">
                        <article className="runtime-metric-item">
                          <p data-ui="text" data-variant="label" data-tone="muted">Tokens</p>
                          <p data-ui="text" data-variant="h3" data-tone="primary">{formatNumber(metricsPanel.data.tokens)}</p>
                        </article>
                        <article className="runtime-metric-item">
                          <p data-ui="text" data-variant="label" data-tone="muted">Cost (USD)</p>
                          <p data-ui="text" data-variant="h3" data-tone="primary">{formatCurrency(metricsPanel.data.cost_usd)}</p>
                        </article>
                        <article className="runtime-metric-item">
                          <p data-ui="text" data-variant="label" data-tone="muted">GPU Requested</p>
                          <p data-ui="text" data-variant="h3" data-tone="primary">{formatNumber(metricsPanel.data.gpu_requested)}</p>
                        </article>
                        <article className="runtime-metric-item">
                          <p data-ui="text" data-variant="label" data-tone="muted">GPU Total</p>
                          <p data-ui="text" data-variant="h3" data-tone="primary">{formatNumber(metricsPanel.data.gpu_total)}</p>
                        </article>
                      </div>
                    )}
                    <p data-ui="text" data-variant="caption" data-tone="muted">
                      updated at: {formatTimestamp(metricsPanel.data.updated_at)}
                    </p>
                  </div>
                </article>

                <article className="dashboard-subpanel governance-panel">
                  <div data-ui="stack" data-direction="col" data-gap="3">
                    <p data-ui="text" data-variant="h3" data-tone="primary">Artifact Bundle</p>
                    {artifactPanel.status === 'loading' && (
                      <p data-ui="text" data-variant="body" data-tone="muted">正在加载 artifact bundle...</p>
                    )}
                    {artifactPanel.status === 'error' && (
                      <p data-ui="text" data-variant="body" data-tone="danger">{artifactPanel.error ?? 'artifact 加载失败。'}</p>
                    )}
                    {(artifactPanel.status === 'ready' || artifactPanel.status === 'empty' || artifactPanel.status === 'idle') && (
                      <div data-ui="list" data-variant="rows" data-density="comfortable">
                        {[
                          ['proposal', artifactPanel.data.proposal_url],
                          ['paper', artifactPanel.data.paper_url],
                          ['repo', artifactPanel.data.repo_url],
                          ['review', artifactPanel.data.review_url],
                        ].map(([key, url]) => (
                          <div key={key} className="artifact-row">
                            <p data-ui="text" data-variant="label" data-tone="secondary">{key}</p>
                            {url ? (
                              <a data-ui="link" href={url} target="_blank" rel="noreferrer">{url}</a>
                            ) : (
                              <span data-ui="badge" data-variant="subtle" data-tone="neutral">pending</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>

                <article className="dashboard-subpanel governance-panel">
                  <div data-ui="stack" data-direction="col" data-gap="3">
                    <p data-ui="text" data-variant="h3" data-tone="primary">Release Review Queue</p>
                    {releaseQueue.length === 0 ? (
                      <p data-ui="text" data-variant="body" data-tone="muted">暂无待展示的审查事件。</p>
                    ) : (
                      <div data-ui="list" data-variant="rows" data-density="comfortable" className="review-queue-list">
                        {releaseQueue.map((event) => (
                          <div key={event.event_id}>
                            <p data-ui="text" data-variant="label" data-tone="secondary">{event.event_type}</p>
                            <p data-ui="text" data-variant="body" data-tone="primary">{event.summary}</p>
                            <p data-ui="text" data-variant="caption" data-tone="muted">{formatTimestamp(event.timestamp)}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <form data-ui="form" data-layout="vertical" onSubmit={handleSubmitReleaseReview} className="release-review-form">
                      <label data-ui="field">
                        <span data-slot="label">Reviewers (comma-separated)</span>
                        <input
                          data-ui="input"
                          data-size="sm"
                          value={reviewersInput}
                          onChange={(event) => setReviewersInput(event.target.value)}
                          placeholder="reviewer-1, reviewer-2"
                        />
                      </label>

                      <div data-ui="grid" data-cols="2" data-gap="3">
                        <label data-ui="field">
                          <span data-slot="label">Decision</span>
                          <select
                            data-ui="select"
                            data-size="sm"
                            value={decision}
                            onChange={(event) => setDecision(event.target.value as ReviewDecision)}
                          >
                            <option value="approve">approve</option>
                            <option value="hold">hold</option>
                            <option value="reject">reject</option>
                          </select>
                        </label>

                        <label data-ui="field">
                          <span data-slot="label">Label policy</span>
                          <input
                            data-ui="input"
                            data-size="sm"
                            value={labelPolicy}
                            onChange={(event) => setLabelPolicy(event.target.value)}
                          />
                        </label>
                      </div>

                      <label data-ui="field">
                        <span data-slot="label">Risk flags (comma-separated)</span>
                        <input
                          data-ui="input"
                          data-size="sm"
                          value={riskFlagsInput}
                          onChange={(event) => setRiskFlagsInput(event.target.value)}
                          placeholder="policy-check, low-evidence"
                        />
                      </label>

                      <label data-ui="field">
                        <span data-slot="label">Comment</span>
                        <textarea
                          data-ui="textarea"
                          value={reviewComment}
                          onChange={(event) => setReviewComment(event.target.value)}
                          placeholder="审查备注"
                        />
                      </label>

                      <div data-ui="toolbar" data-align="between" data-wrap="wrap">
                        <p data-ui="text" data-variant="caption" data-tone={reviewSubmitState === 'error' ? 'danger' : 'muted'}>
                          {reviewSubmitMessage || '提交后会返回 review_id 与 audit_ref。'}
                        </p>
                        <button
                          data-ui="button"
                          data-variant="primary"
                          data-size="sm"
                          type="submit"
                          disabled={reviewSubmitState === 'submitting'}
                        >
                          {reviewSubmitState === 'submitting' ? '提交中...' : '提交审查'}
                        </button>
                      </div>
                    </form>
                  </div>
                </article>
              </section>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
