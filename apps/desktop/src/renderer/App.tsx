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

type GovernanceRequest = {
  method: 'GET' | 'POST';
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
          <section data-ui="section" data-padding="none">
            <p data-ui="text" data-variant="h2" data-tone="primary">Research Control Center</p>
            <p data-ui="text" data-variant="body" data-tone="secondary">
              该桌面壳层用于串联文献、选题、版本治理与写作交付的全链路操作。
            </p>
            <p data-ui="text" data-variant="caption" data-tone="muted">当前模块：{activeModule}</p>
          </section>

          <section data-ui="grid" data-cols="2" data-gap="4" className="metrics-grid">
            <article data-ui="card" data-variant="outlined" data-elevation="none" data-padding="md">
              <p data-ui="text" data-variant="label" data-tone="muted">活跃论文主线</p>
              <p data-ui="text" data-variant="h2" data-tone="primary">12</p>
            </article>
            <article data-ui="card" data-variant="outlined" data-elevation="none" data-padding="md">
              <p data-ui="text" data-variant="label" data-tone="muted">待评估候选节点</p>
              <p data-ui="text" data-variant="h2" data-tone="primary">37</p>
            </article>
          </section>

          {!governanceEnabled ? (
            <section data-ui="empty-state">
              <p data-slot="title" data-ui="text" data-variant="h3" data-tone="primary">
                治理面板默认关闭
              </p>
              <p data-slot="body" data-ui="text" data-variant="body" data-tone="muted">
                当前工作区保持 T-004 壳层行为不变。你可以在当前会话启用 T-006 面板进行联调。
              </p>
              <button
                data-ui="button"
                data-variant="secondary"
                data-size="md"
                type="button"
                onClick={handleToggleGovernance}
              >
                启用治理面板
              </button>
            </section>
          ) : (
            <section data-ui="stack" data-direction="col" data-gap="4" className="governance-zone">
              <article data-ui="card" data-variant="outlined" data-elevation="none" data-padding="md" className="governance-controls">
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
                <article data-ui="card" data-variant="outlined" data-elevation="none" data-padding="md" className="governance-panel">
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

                <article data-ui="card" data-variant="outlined" data-elevation="none" data-padding="md" className="governance-panel">
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
                        <article data-ui="card" data-variant="outlined" data-elevation="none" data-padding="sm">
                          <p data-ui="text" data-variant="label" data-tone="muted">Tokens</p>
                          <p data-ui="text" data-variant="h3" data-tone="primary">{formatNumber(metricsPanel.data.tokens)}</p>
                        </article>
                        <article data-ui="card" data-variant="outlined" data-elevation="none" data-padding="sm">
                          <p data-ui="text" data-variant="label" data-tone="muted">Cost (USD)</p>
                          <p data-ui="text" data-variant="h3" data-tone="primary">{formatCurrency(metricsPanel.data.cost_usd)}</p>
                        </article>
                        <article data-ui="card" data-variant="outlined" data-elevation="none" data-padding="sm">
                          <p data-ui="text" data-variant="label" data-tone="muted">GPU Requested</p>
                          <p data-ui="text" data-variant="h3" data-tone="primary">{formatNumber(metricsPanel.data.gpu_requested)}</p>
                        </article>
                        <article data-ui="card" data-variant="outlined" data-elevation="none" data-padding="sm">
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

                <article data-ui="card" data-variant="outlined" data-elevation="none" data-padding="md" className="governance-panel">
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

                <article data-ui="card" data-variant="outlined" data-elevation="none" data-padding="md" className="governance-panel">
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
          )}
        </main>
      </div>
    </div>
  );
}
