import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  applyTheme,
  readSystemPrefersDark,
  resolveTheme,
  SYSTEM_DARK_MEDIA_QUERY,
  THEME_MODE_STORAGE_KEY,
  type ThemeMode,
} from './theme';
import {
  type ManualImportSession,
} from './literature/manual-import-types';
import {
  APP_MODE_STORAGE_KEY,
  autoPullHourOptions,
  autoPullLimitHint,
  autoPullLookbackHint,
  autoPullParseHint,
  autoPullQualityHint,
  autoPullQualityPresetOptions,
  autoPullRunStatusLabels,
  autoPullSortHint,
  autoPullWeekdayOptions,
  citationStatusOptions,
  coreNavItems,
  emptyArtifactBundle,
  emptyLiteratureOverviewData,
  emptyMetric,
  emptyZoteroLinkResult,
  initialModule,
  literatureSubTabsByTab,
  literatureTabs,
  manualUploadFormatHint,
  overviewYearDefaultEnd,
  overviewYearDefaultStart,
  querySortPresetOptions,
  themeModeOptions,
  topicPresetVenueOptions,
  topicYearMaxBound,
  topicYearMinBound,
  updateHelpTooltipAlignment,
  writingNavItems,
} from './literature/shared/constants';
import {
  asRecord,
  detectMacDesktopFromNavigator,
  formatManualUploadFileStatusLabel,
  getManualFieldErrorText,
  isManualUploadLlmSupported,
  isOverviewAutomationReady,
  isOverviewCitable,
  isOverviewExcluded,
  isPaperNotFoundMessage,
  mapManualValidationErrors,
  normalizeArtifactPayload,
  normalizeLiteratureOverviewPayload,
  normalizeMetricPayload,
  normalizeReleasePayload,
  normalizeScheduleHourValue,
  normalizeTimelinePayload,
  normalizeTopicScopePayload,
  normalizePaperLiteraturePayload,
  projectOverviewItems,
  readStoredAppMode,
  isFlagEnabled,
  toText,
} from './literature/shared/normalizers';
import {
  formatCurrency,
  formatNumber,
  formatTimestamp,
  resolveRunSortTimestamp,
  tryGetSnapshotId,
} from './literature/shared/formatters';
import { defaultApiBaseUrl, requestGovernance } from './literature/shared/api';
import { Topbar } from './shell/components/Topbar';
import { Sidebar } from './shell/components/Sidebar';
import { GovernancePanel } from './shell/components/GovernancePanel';
import { useDashboardMetrics } from './shell/useDashboardMetrics';
import { useShellHandlers } from './shell/useShellHandlers';
import { PaperModule } from './modules/PaperModule';
import { WritingModule } from './modules/WritingModule';
import { OverviewTab } from './literature/overview/OverviewTab';
import { AutoImportTab } from './literature/auto-import/AutoImportTab';
import { ManualImportTab } from './literature/manual-import/ManualImportTab';
import { useOverviewController } from './literature/overview/useOverviewController';
import { useOverviewActionsController } from './literature/overview/useOverviewActionsController';
import { useAutoImportController } from './literature/auto-import/useAutoImportController';
import { useManualImportController } from './literature/manual-import/useManualImportController';
import type {
  AppMode,
  AutoImportSubTabKey,
  AutoPullFrequency,
  AutoPullRule,
  AutoPullRun,
  AutoPullRunStatus,
  AutoPullSortMode,
  AutoPullTopicProfile,
  AutoPullWeekday,
  InlineFeedbackModel,
  LiteratureOverviewData,
  LiteratureOverviewItem,
  LiteratureTabKey,
  ManualImportSubTabKey,
  ManualUploadFileItem,
  OverviewScopeFilterInput,
  PanelState,
  PaperLiteratureItem,
  QuerySort,
  QuerySortPreset,
  ReviewDecision,
  RuntimeMetric,
  SortDirection,
  TimelineEvent,
  TopicScopeItem,
  UiOperationStatus,
  ZoteroAction,
  ZoteroLinkResult,
  ArtifactBundle,
} from './literature/shared/types';
type AppProps = {
  initialThemeMode: ThemeMode;
};

export function App({ initialThemeMode }: AppProps) {
  const [activeModule, setActiveModule] = useState<string>(initialModule);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMacDesktop, setIsMacDesktop] = useState<boolean>(() => detectMacDesktopFromNavigator());
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialThemeMode);
  const [appMode, setAppMode] = useState<AppMode>(() => readStoredAppMode());
  const [settingsPanelOpen, setSettingsPanelOpen] = useState<boolean>(false);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => readSystemPrefersDark());
  const [toolbarSearchInput, setToolbarSearchInput] = useState<string>('');
  const [, setActionHint] = useState<string>('请选择一个模块开始浏览。');
  const [governanceEnabled, setGovernanceEnabled] = useState<boolean>(
    isFlagEnabled(import.meta.env.VITE_ENABLE_GOVERNANCE_PANELS),
  );
  const [paperIdInput, setPaperIdInput] = useState<string>('');
  const [paperId, setPaperId] = useState<string>('');
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
  const [topicScopeItems, setTopicScopeItems] = useState<TopicScopeItem[]>([]);
  const [topicScopeLoading, setTopicScopeLoading] = useState<boolean>(false);
  const [topicScopeError, setTopicScopeError] = useState<string | null>(null);
  const [paperLiteratureItems, setPaperLiteratureItems] = useState<PaperLiteratureItem[]>([]);
  const [paperLiteratureLoading, setPaperLiteratureLoading] = useState<boolean>(false);
  const [paperLiteratureError, setPaperLiteratureError] = useState<string | null>(null);
  const [activeLiteratureTab, setActiveLiteratureTab] = useState<LiteratureTabKey>('auto-import');
  const [autoImportSubTab, setAutoImportSubTab] = useState<AutoImportSubTabKey>('topic-settings');
  const [topicProfiles, setTopicProfiles] = useState<AutoPullTopicProfile[]>([]);
  const [topicProfilesStatus, setTopicProfilesStatus] = useState<UiOperationStatus>('idle');
  const [topicProfilesError, setTopicProfilesError] = useState<string | null>(null);
  const [topicFormTopicId, setTopicFormTopicId] = useState<string>('');
  const [topicFormName, setTopicFormName] = useState<string>('');
  const [topicFormIsActive, setTopicFormIsActive] = useState<boolean>(true);
  const [topicFormIncludeKeywords, setTopicFormIncludeKeywords] = useState<string[]>([]);
  const [topicFormIncludeDraft, setTopicFormIncludeDraft] = useState<string>('');
  const [topicFormExcludeKeywords, setTopicFormExcludeKeywords] = useState<string[]>([]);
  const [topicFormExcludeDraft, setTopicFormExcludeDraft] = useState<string>('');
  const [topicFormVenueSelections, setTopicFormVenueSelections] = useState<string[]>([]);
  const [topicVenuePickerOpen, setTopicVenuePickerOpen] = useState<boolean>(false);
  const [topicFormLookbackInput, setTopicFormLookbackInput] = useState<string>('30');
  const [topicFormYearStart, setTopicFormYearStart] = useState<number>(topicYearMinBound);
  const [topicFormYearEnd, setTopicFormYearEnd] = useState<number>(topicYearMaxBound);
  const [topicFormRuleIds, setTopicFormRuleIds] = useState<string[]>([]);
  const [topicFormModalOpen, setTopicFormModalOpen] = useState<boolean>(false);
  const [topicEditingId, setTopicEditingId] = useState<string | null>(null);

  const [autoPullRules, setAutoPullRules] = useState<AutoPullRule[]>([]);
  const [rulesStatus, setRulesStatus] = useState<UiOperationStatus>('idle');
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [ruleEditingId, setRuleEditingId] = useState<string | null>(null);
  const [ruleFormName, setRuleFormName] = useState<string>('');
  const [ruleFormMaxResultsInput, setRuleFormMaxResultsInput] = useState<string>('20');
  const [ruleFormLookbackInput, setRuleFormLookbackInput] = useState<string>('30');
  const [ruleFormMinCompletenessInput, setRuleFormMinCompletenessInput] = useState<string>('70');
  const [ruleFormFrequency, setRuleFormFrequency] = useState<AutoPullFrequency>('DAILY');
  const [ruleFormWeekday, setRuleFormWeekday] = useState<AutoPullWeekday>('MON');
  const [ruleFormHourInput, setRuleFormHourInput] = useState<string>('9');
  const [ruleFormMinuteInput, setRuleFormMinuteInput] = useState<string>('0');
  const [ruleFormSortMode, setRuleFormSortMode] = useState<AutoPullSortMode>('llm_score');
  const [ruleFormParseAndIngest, setRuleFormParseAndIngest] = useState<boolean>(false);
  const [ruleSourceCrossref, setRuleSourceCrossref] = useState<boolean>(true);
  const [ruleSourceArxiv, setRuleSourceArxiv] = useState<boolean>(true);
  const scheduleHourValue = normalizeScheduleHourValue(ruleFormHourInput);

  const [autoPullRuns, setAutoPullRuns] = useState<AutoPullRun[]>([]);
  const [runsStatus, setRunsStatus] = useState<UiOperationStatus>('idle');
  const [runsError, setRunsError] = useState<string | null>(null);
  const [runsFilterStatus, setRunsFilterStatus] = useState<'' | AutoPullRunStatus | 'EXCEPTION'>('');
  const [runsPageIndex, setRunsPageIndex] = useState<number>(1);
  const [selectedRunDetail, setSelectedRunDetail] = useState<AutoPullRun | null>(null);
  const [runDetailLoading, setRunDetailLoading] = useState<boolean>(false);
  const [runDetailError, setRunDetailError] = useState<string | null>(null);
  const [topFeedback, setTopFeedback] = useState<InlineFeedbackModel | null>(null);
  const [literatureActionMessage, setLiteratureActionMessage] = useState<string>('');
  const [scopeReasonInput] = useState<string>('初筛保留');
  const [manualUploadLoading, setManualUploadLoading] = useState<boolean>(false);
  const [manualUploadStatus, setManualUploadStatus] = useState<UiOperationStatus>('idle');
  const [manualUploadError, setManualUploadError] = useState<string | null>(null);
  const [literatureAutoParseDocuments, setLiteratureAutoParseDocuments] = useState<boolean>(false);
  const [literatureAutoExtractAbstracts, setLiteratureAutoExtractAbstracts] = useState<boolean>(false);
  const [manualUploadFiles, setManualUploadFiles] = useState<ManualUploadFileItem[]>([]);
  const [manualImportSession, setManualImportSession] = useState<ManualImportSession | null>(null);
  const [manualImportSubTab, setManualImportSubTab] = useState<ManualImportSubTabKey>('file-review');
  const [manualShowImportableOnly, setManualShowImportableOnly] = useState<boolean>(false);
  const [manualShowErrorOnly, setManualShowErrorOnly] = useState<boolean>(false);
  const [manualOpenRowId, setManualOpenRowId] = useState<string | null>(null);
  const [manualOpenRowPanel, setManualOpenRowPanel] = useState<'expand' | 'summary' | null>(null);
  const [manualDropActive, setManualDropActive] = useState<boolean>(false);
  const [zoteroLibraryType, setZoteroLibraryType] = useState<'users' | 'groups'>('users');
  const [zoteroLibraryId, setZoteroLibraryId] = useState<string>('');
  const [zoteroApiKey, setZoteroApiKey] = useState<string>('');
  const [zoteroLoading, setZoteroLoading] = useState<boolean>(false);
  const [zoteroAction, setZoteroAction] = useState<ZoteroAction>('idle');
  const [zoteroStatus, setZoteroStatus] = useState<UiOperationStatus>('idle');
  const [zoteroError, setZoteroError] = useState<string | null>(null);
  const [zoteroLinkResult, setZoteroLinkResult] = useState<ZoteroLinkResult>(emptyZoteroLinkResult);
  const [overviewPanel, setOverviewPanel] = useState<PanelState<LiteratureOverviewData>>({
    status: 'idle',
    data: emptyLiteratureOverviewData,
    error: null,
  });
  const [querySort, setQuerySort] = useState<QuerySort>('importance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [overviewKeyword, setOverviewKeyword] = useState<string>('');
  const [overviewYearStart, setOverviewYearStart] = useState<number | null>(overviewYearDefaultStart);
  const [overviewYearEnd, setOverviewYearEnd] = useState<number | null>(overviewYearDefaultEnd);
  const [overviewTagKeywords, setOverviewTagKeywords] = useState<string[]>([]);
  const [overviewStatusFilter, setOverviewStatusFilter] = useState<OverviewScopeFilterInput>('all');
  const [overviewKeywordInput, setOverviewKeywordInput] = useState<string>('');
  const [overviewYearStartInput, setOverviewYearStartInput] = useState<string>('');
  const [overviewYearEndInput, setOverviewYearEndInput] = useState<string>('');
  const [overviewTagKeywordsInput, setOverviewTagKeywordsInput] = useState<string[]>([]);
  const [overviewTagPickerOpen, setOverviewTagPickerOpen] = useState<boolean>(false);
  const [overviewScopeFilterInput, setOverviewScopeFilterInput] = useState<OverviewScopeFilterInput>('all');
  const [querySortPresetInput, setQuerySortPresetInput] = useState<QuerySortPreset>('importance|desc');
  const [overviewResultItems, setOverviewResultItems] = useState<LiteratureOverviewItem[]>([]);
  const [overviewPageIndex, setOverviewPageIndex] = useState<number>(1);
  const overviewTagPickerRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(APP_MODE_STORAGE_KEY, appMode);
    } catch {
      // Ignore storage write failures and keep runtime state.
    }
  }, [appMode]);

  useEffect(() => {
    if (isSidebarCollapsed) {
      setSettingsPanelOpen(false);
    }
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (!settingsPanelOpen || typeof window === 'undefined') {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!settingsPanelRef.current || settingsPanelRef.current.contains(target)) {
        return;
      }
      setSettingsPanelOpen(false);
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, [settingsPanelOpen]);

  const pushLiteratureFeedback = useCallback((feedback: InlineFeedbackModel) => {
    setTopFeedback(feedback);
    setLiteratureActionMessage(feedback.message);
  }, []);

  useEffect(() => {
    if (!topFeedback) {
      return;
    }
    if (topFeedback.level === 'warning' || topFeedback.level === 'error') {
      return;
    }

    const timer = window.setTimeout(() => {
      setTopFeedback(null);
    }, 3_000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [topFeedback]);

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

  const loadLiteratureOverview = useCallback(async (targetTopicId: string, targetPaperId: string) => {
    const normalizedTopicId = targetTopicId.trim();
    const normalizedPaperId = targetPaperId.trim();
    if (!normalizedTopicId && !normalizedPaperId) {
      setOverviewPanel({
        status: 'error',
        data: emptyLiteratureOverviewData,
        error: 'Topic ID 与 Paper ID 至少填写一个。',
      });
      return;
    }

    setOverviewPanel((current) => ({ ...current, status: 'loading', error: null }));
    try {
      const query = new URLSearchParams();
      if (normalizedTopicId) {
        query.set('topic_id', normalizedTopicId);
      }
      if (normalizedPaperId) {
        query.set('paper_id', normalizedPaperId);
      }
      const payload = await requestGovernance({
        method: 'GET',
        path: `/literature/overview?${query.toString()}`,
      });
      const normalized = normalizeLiteratureOverviewPayload(payload);
      if (!normalized) {
        setOverviewPanel({
          status: 'empty',
          data: emptyLiteratureOverviewData,
          error: null,
        });
        setOverviewResultItems([]);
        return;
      }

      const sortedItems = projectOverviewItems(normalized.items, {
        sort: querySort,
        direction: sortDirection,
        keyword: overviewKeyword,
        yearStart: overviewYearStart,
        yearEnd: overviewYearEnd,
        tagKeywords: overviewTagKeywords,
        statusFilter: overviewStatusFilter,
      });

      setOverviewPanel({
        status: normalized.items.length > 0 ? 'ready' : 'empty',
        data: normalized,
        error: null,
      });
      setOverviewResultItems(sortedItems);
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载文献综览失败。';
      if (isPaperNotFoundMessage(message)) {
        if (normalizedTopicId) {
          try {
            const topicOnlyPayload = await requestGovernance({
              method: 'GET',
              path: `/literature/overview?topic_id=${encodeURIComponent(normalizedTopicId)}`,
            });
            const topicOnlyNormalized = normalizeLiteratureOverviewPayload(topicOnlyPayload);
            if (!topicOnlyNormalized) {
              setOverviewPanel({
                status: 'empty',
                data: emptyLiteratureOverviewData,
                error: null,
              });
              setOverviewResultItems([]);
              return;
            }
            const topicOnlySortedItems = projectOverviewItems(topicOnlyNormalized.items, {
              sort: querySort,
              direction: sortDirection,
              keyword: overviewKeyword,
              yearStart: overviewYearStart,
              yearEnd: overviewYearEnd,
              tagKeywords: overviewTagKeywords,
              statusFilter: overviewStatusFilter,
            });
            setOverviewPanel({
              status: topicOnlyNormalized.items.length > 0 ? 'ready' : 'empty',
              data: topicOnlyNormalized,
              error: null,
            });
            setOverviewResultItems(topicOnlySortedItems);
            return;
          } catch {
            // fall through to empty state when topic-only fallback also fails
          }
        }
        setOverviewPanel({
          status: 'empty',
          data: emptyLiteratureOverviewData,
          error: null,
        });
        setOverviewResultItems([]);
        return;
      }
      setOverviewPanel({
        status: 'error',
        data: emptyLiteratureOverviewData,
        error: message,
      });
      setOverviewResultItems([]);
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'error',
        message: `综览加载失败：${message}`,
        recoveryAction: 'reload-overview',
      });
    }
  }, [
    overviewKeyword,
    overviewStatusFilter,
    overviewTagKeywords,
    overviewYearEnd,
    overviewYearStart,
    pushLiteratureFeedback,
    querySort,
    sortDirection,
  ]);

  useEffect(() => {
    if (overviewPanel.status === 'loading' || overviewPanel.status === 'error') {
      return;
    }
    const sourceItems = overviewPanel.data.items;
    const sortedItems = projectOverviewItems(sourceItems, {
      sort: querySort,
      direction: sortDirection,
      keyword: overviewKeyword,
      yearStart: overviewYearStart,
      yearEnd: overviewYearEnd,
      tagKeywords: overviewTagKeywords,
      statusFilter: overviewStatusFilter,
    });
    setOverviewResultItems(sortedItems);
  }, [
    overviewKeyword,
    overviewStatusFilter,
    overviewPanel.data.items,
    overviewPanel.status,
    overviewTagKeywords,
    overviewYearEnd,
    overviewYearStart,
    querySort,
    sortDirection,
  ]);

  const overviewSummaryStats = useMemo(() => {
    let latestUpdatedAt: string | null = null;
    let latestUpdatedAtMs = 0;
    let automationReadyCount = 0;
    let citableCount = 0;
    let excludedCount = 0;

    overviewResultItems.forEach((item) => {
      if (isOverviewAutomationReady(item)) {
        automationReadyCount += 1;
      }
      if (isOverviewCitable(item)) {
        citableCount += 1;
      }
      if (isOverviewExcluded(item)) {
        excludedCount += 1;
      }

      if (!item.source_updated_at) {
        return;
      }
      const parsedMs = new Date(item.source_updated_at).getTime();
      if (Number.isNaN(parsedMs) || parsedMs <= latestUpdatedAtMs) {
        return;
      }
      latestUpdatedAtMs = parsedMs;
      latestUpdatedAt = item.source_updated_at;
    });

    return {
      totalCount: overviewResultItems.length,
      latestUpdatedLabel: latestUpdatedAt ? formatTimestamp(latestUpdatedAt) : '--',
      automationReadyCount,
      citableCount,
      excludedCount,
    };
  }, [overviewResultItems]);
  const overviewPageSize = 10;
  const overviewTotalPages = Math.max(1, Math.ceil(overviewResultItems.length / overviewPageSize));
  const overviewPageItems = useMemo(() => {
    const start = (overviewPageIndex - 1) * overviewPageSize;
    return overviewResultItems.slice(start, start + overviewPageSize);
  }, [overviewPageIndex, overviewPageSize, overviewResultItems]);

  useEffect(() => {
    setOverviewPageIndex((current) => {
      if (current < 1) {
        return 1;
      }
      if (current > overviewTotalPages) {
        return overviewTotalPages;
      }
      return current;
    });
  }, [overviewTotalPages]);

  const overviewTagOptions = useMemo(() => {
    const tagSet = new Set<string>();
    overviewPanel.data.items.forEach((item) => {
      item.tags.forEach((tag) => {
        const normalized = tag.trim();
        if (normalized.length > 0) {
          tagSet.add(normalized);
        }
      });
    });
    return [...tagSet].sort((left, right) => left.localeCompare(right, 'zh-CN'));
  }, [overviewPanel.data.items]);
  const overviewTagSelectionLabel = useMemo(() => {
    if (overviewTagKeywordsInput.length === 0) {
      return '全部标签';
    }
    if (overviewTagKeywordsInput.length <= 2) {
      return overviewTagKeywordsInput.join('、');
    }
    return `已选 ${overviewTagKeywordsInput.length} 个标签`;
  }, [overviewTagKeywordsInput]);

  useEffect(() => {
    if (!overviewTagPickerOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (overviewTagPickerRef.current?.contains(target)) {
        return;
      }
      setOverviewTagPickerOpen(false);
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, [overviewTagPickerOpen]);

  const {
    topicScopedRules,
    topicSettingsSummaryStats,
    autoPullRuleById,
    latestRunByRuleId,
    runsTotalPages,
    runsPageItems,
    selectedRunTopicLabel,
    selectedRunPulledAtLabel,
    selectedRunDurationLabel,
    topicVenueOptions,
    topicAutoIdPreview,
    topicYearLowerBound,
    topicYearUpperBound,
    topicYearRangeTrackStyle,
    topicVenueSelectionLabel,
    autoPullStatusDigest,
    loadTopicProfiles,
    loadAutoPullRules,
    loadAutoPullRuns,
    loadAutoPullRunDetail,
    handleOpenCreateTopicProfile,
    handleCloseTopicModal,
    handleEditTopicProfile,
    handleToggleTopicRuleSelection,
    handleAddTopicIncludeKeyword,
    handleRemoveTopicIncludeKeyword,
    handleAddTopicExcludeKeyword,
    handleRemoveTopicExcludeKeyword,
    handleToggleTopicVenueSelection,
    applyTopicYearPreset,
    handleSubmitTopicProfile,
    handleToggleTopicProfileActive,
    handleResetTopicRuleComposer,
    handleEditRule,
    handleSubmitRule,
    handleRunRuleFullRefresh,
    handleRetryRun,
  } = useAutoImportController({
    runsFilterStatus,
    pushLiteratureFeedback,
    setTopicProfilesStatus,
    setTopicProfilesError,
    setTopicProfiles,
    setRulesStatus,
    setRulesError,
    setAutoPullRules,
    setRunsStatus,
    setRunsError,
    setAutoPullRuns,
    setSelectedRunDetail,
    setRunDetailError,
    setRunDetailLoading,
    setTopicEditingId,
    setTopicFormTopicId,
    setTopicFormName,
    setTopicFormIsActive,
    setTopicFormIncludeKeywords,
    setTopicFormIncludeDraft,
    setTopicFormExcludeKeywords,
    setTopicFormExcludeDraft,
    setTopicFormVenueSelections,
    setTopicVenuePickerOpen,
    setTopicFormLookbackInput,
    setTopicFormYearStart,
    setTopicFormYearEnd,
    setTopicFormRuleIds,
    setTopicFormModalOpen,
    setAutoImportSubTab,
    setRuleEditingId,
    setRuleFormName,
    setRuleFormMaxResultsInput,
    setRuleFormLookbackInput,
    setRuleFormMinCompletenessInput,
    setRuleFormFrequency,
    setRuleFormWeekday,
    setRuleFormHourInput,
    setRuleFormMinuteInput,
    setRuleFormSortMode,
    setRuleFormParseAndIngest,
    setRuleSourceCrossref,
    setRuleSourceArxiv,
    autoPullRules,
    autoPullRuns,
    runsPageIndex,
    setRunsPageIndex,
    selectedRunDetail,
    topicFormIncludeDraft,
    topicFormExcludeDraft,
    topicFormYearStart,
    topicFormYearEnd,
    topicFormName,
    topicFormTopicId,
    topicFormRuleIds,
    topicFormIsActive,
    topicFormIncludeKeywords,
    topicFormExcludeKeywords,
    topicFormVenueSelections,
    topicFormLookbackInput,
    topicEditingId,
    topicProfiles,
    topicProfilesStatus,
    rulesStatus,
    runsStatus,
    ruleFormName,
    ruleFormHourInput,
    ruleFormMinuteInput,
    ruleFormMaxResultsInput,
    ruleFormLookbackInput,
    ruleFormMinCompletenessInput,
    ruleFormFrequency,
    ruleFormWeekday,
    ruleFormSortMode,
    ruleFormParseAndIngest,
    ruleSourceCrossref,
    ruleSourceArxiv,
    ruleEditingId,
    topicPresetVenueOptions,
    asRecord,
    toText,
  });

  const {
    manualValidationByRowId,
    manualVisibleRows,
    manualRowStats,
    hasManualSession,
    handleManualUploadFileLlmAction,
    handleManualUpload,
    handleManualUploadDrop,
    handleInjectManualImportTestData,
    handleClearInjectedManualImportData,
    handleRemoveManualUploadFile,
    handleManualDraftFieldChange,
    handleToggleManualRowInclude,
    handleRemoveManualRow,
    handleToggleManualRowPanel,
    handleCopyManualCellValue,
    handleSubmitManualReviewedRows,
    handleTestZoteroConnection,
    handleLoadZoteroToReview,
    handleImportFromZotero,
  } = useManualImportController({
    manualImportSession,
    setManualImportSession,
    manualUploadFiles,
    setManualUploadFiles,
    manualShowImportableOnly,
    manualShowErrorOnly,
    setManualShowImportableOnly,
    setManualShowErrorOnly,
    setManualOpenRowId,
    setManualOpenRowPanel,
    setManualUploadStatus,
    setManualUploadError,
    setManualUploadLoading,
    setManualDropActive,
    literatureAutoParseDocuments,
    literatureAutoExtractAbstracts,
    pushLiteratureFeedback,
    topicIdInput,
    topicId,
    paperId,
    setTopicId,
    setTopicIdInput,
    setPaperId,
    setPaperIdInput,
    loadTopicScope,
    loadLiteratureOverview,
    loadTopicProfiles,
    loadAutoPullRules,
    loadAutoPullRuns,
    zoteroLibraryId,
    zoteroLibraryType,
    zoteroApiKey,
    manualOpenRowId,
    manualOpenRowPanel,
    setZoteroStatus,
    setZoteroError,
    setZoteroLoading,
    setZoteroAction,
    setZoteroLinkResult,
  });

  const {
    handleScopeStatusChange,
    handleSyncPaperFromTopic,
    handleUpdateCitationStatus,
    handleTopFeedbackRecovery,
    handleApplyLiteratureFilters,
    handleResetLightweightFilters,
    handleToggleOverviewTagKeyword,
    handleSelectAllOverviewTags,
    handleClearOverviewTagSelection,
    handleRunOverviewContentAction,
  } = useOverviewActionsController({
    topicId,
    paperId,
    scopeReasonInput,
    pushLiteratureFeedback,
    loadTopicScope,
    loadLiteratureOverview,
    loadPaperLiterature,
    setOverviewKeyword,
    overviewKeywordInput,
    setOverviewYearStart,
    overviewYearStartInput,
    setOverviewYearEnd,
    overviewYearEndInput,
    setOverviewTagKeywords,
    overviewTagKeywordsInput,
    setOverviewStatusFilter,
    overviewScopeFilterInput,
    setQuerySort,
    setSortDirection,
    querySortPresetInput,
    setOverviewTagPickerOpen,
    setOverviewPageIndex,
    setOverviewKeywordInput,
    setOverviewYearStartInput,
    setOverviewYearEndInput,
    setOverviewTagKeywordsInput,
    setOverviewScopeFilterInput,
    setQuerySortPresetInput,
    overviewTagOptions,
    topFeedback,
    handleImportFromZotero,
  });

  useEffect(() => {
    if (activeModule === '文献管理') {
      if (topicId.trim()) {
        void loadTopicScope(topicId);
      } else {
        setTopicScopeItems([]);
        setTopicScopeError(null);
      }
      void loadLiteratureOverview(topicId, paperId);
    }
    if (activeModule === '论文管理' || activeModule === '写作中心') {
      if (paperId.trim()) {
        void loadPaperLiterature(paperId);
      } else {
        setPaperLiteratureItems([]);
        setPaperLiteratureError(null);
      }
    }
  }, [activeModule, loadLiteratureOverview, loadPaperLiterature, loadTopicScope, paperId, topicId]);

  useEffect(() => {
    if (activeModule !== '文献管理' || activeLiteratureTab !== 'auto-import') {
      return;
    }
    void loadTopicProfiles();
    void loadAutoPullRules();
    void loadAutoPullRuns();
  }, [
    activeLiteratureTab,
    activeModule,
    loadAutoPullRules,
    loadAutoPullRuns,
    loadTopicProfiles,
  ]);

  useEffect(() => {
    if (activeModule !== '文献管理' || activeLiteratureTab !== 'auto-import' || autoImportSubTab !== 'runs-alerts') {
      return;
    }
    if (autoPullRuns.length === 0) {
      return;
    }
    if (selectedRunDetail && autoPullRuns.some((run) => run.run_id === selectedRunDetail.run_id)) {
      return;
    }
    void loadAutoPullRunDetail(autoPullRuns[0].run_id);
  }, [
    activeLiteratureTab,
    activeModule,
    autoImportSubTab,
    autoPullRuns,
    loadAutoPullRunDetail,
    selectedRunDetail,
  ]);

  useEffect(() => {
    if (activeLiteratureTab !== 'auto-import' || autoImportSubTab !== 'topic-settings') {
      setTopicFormModalOpen(false);
    }
  }, [activeLiteratureTab, autoImportSubTab]);

  const isDevMode = appMode === 'dev';
  const { metricCards, releaseQueue } = useDashboardMetrics({
    activeModule,
    autoPullRules,
    autoPullRuns,
    overviewTotalLiteratures: overviewPanel.data.summary.total_literatures,
    paperLiteratureItems,
    paperId,
    topicId,
    topicScopeItems,
    timelineEvents: timelinePanel.data,
  });
  const {
    handleModuleSelect,
    handleToggleSidebar,
    handleSelectLiteratureSubTab,
    handleToggleGovernance,
    handleApplyPaperId,
    handleRefreshPanels,
    handleEvidenceTrace,
  } = useShellHandlers({
    setActiveModule,
    setActionHint,
    setIsSidebarCollapsed,
    setActiveLiteratureTab,
    setAutoImportSubTab,
    setManualImportSubTab,
    setGovernanceEnabled,
    paperIdInput,
    setPaperId,
    setReviewSubmitState,
    setReviewSubmitMessage,
    loadPaperLiterature,
    loadLiteratureOverview,
    topicId,
    setRefreshTick,
    tryGetSnapshotId,
  });

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

  const overviewController = useOverviewController({
    activeLiteratureTab,
    overviewKeywordInput,
    onOverviewKeywordInputChange: setOverviewKeywordInput,
    overviewYearStartInput,
    onOverviewYearStartInputChange: setOverviewYearStartInput,
    overviewYearEndInput,
    onOverviewYearEndInputChange: setOverviewYearEndInput,
    overviewTagPickerOpen,
    onOverviewTagPickerOpenChange: setOverviewTagPickerOpen,
    overviewTagPickerRef,
    overviewTagSelectionLabel,
    onSelectAllOverviewTags: handleSelectAllOverviewTags,
    onClearOverviewTagSelection: handleClearOverviewTagSelection,
    overviewTagOptions,
    overviewTagKeywordsInput,
    onToggleOverviewTagKeyword: handleToggleOverviewTagKeyword,
    overviewScopeFilterInput,
    onOverviewScopeFilterInputChange: setOverviewScopeFilterInput,
    querySortPresetInput,
    onQuerySortPresetInputChange: setQuerySortPresetInput,
    querySortPresetOptions,
    onResetLightweightFilters: handleResetLightweightFilters,
    onApplyLiteratureFilters: handleApplyLiteratureFilters,
    topicScopeLoading,
    topicScopeError,
    overviewPanel,
    overviewResultItems,
    overviewPageItems,
    onScopeStatusChange: handleScopeStatusChange,
    onRunOverviewContentAction: handleRunOverviewContentAction,
    overviewSummaryStats,
    overviewPageIndex,
    overviewTotalPages,
    onOverviewPageIndexChange: setOverviewPageIndex,
  });

  const shellClassName = [
    'desktop-shell',
    isMacDesktop ? ' is-macos-chrome' : '',
    isSidebarCollapsed ? ' is-sidebar-collapsed' : ' is-sidebar-expanded',
  ].join('');

  return (
    <div data-ui="page" className={shellClassName}>
      <Topbar
        activeModule={activeModule}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
        activeLiteratureTab={activeLiteratureTab}
        autoImportSubTab={autoImportSubTab}
        manualImportSubTab={manualImportSubTab}
        literatureTabs={literatureTabs}
        literatureSubTabsByTab={literatureSubTabsByTab}
        onSelectLiteratureTab={setActiveLiteratureTab}
        onSelectLiteratureSubTab={handleSelectLiteratureSubTab}
        toolbarSearchInput={toolbarSearchInput}
        onToolbarSearchInputChange={setToolbarSearchInput}
        themeModeOptions={themeModeOptions}
        themeMode={themeMode}
        onThemeModeChange={setThemeMode}
      />

      <div className={`shell-main${isSidebarCollapsed ? ' is-sidebar-collapsed' : ''}`}>
        <Sidebar
          isSidebarCollapsed={isSidebarCollapsed}
          coreNavItems={coreNavItems}
          writingNavItems={writingNavItems}
          activeModule={activeModule}
          onModuleSelect={handleModuleSelect}
          settingsPanelOpen={settingsPanelOpen}
          settingsPanelRef={settingsPanelRef}
          isDevMode={isDevMode}
          onToggleAppMode={() => setAppMode((current) => (current === 'dev' ? 'standard' : 'dev'))}
          literatureAutoParseDocuments={literatureAutoParseDocuments}
          onLiteratureAutoParseDocumentsChange={setLiteratureAutoParseDocuments}
          literatureAutoExtractAbstracts={literatureAutoExtractAbstracts}
          onLiteratureAutoExtractAbstractsChange={setLiteratureAutoExtractAbstracts}
          onInjectManualImportTestData={handleInjectManualImportTestData}
          onClearInjectedManualImportData={handleClearInjectedManualImportData}
          onToggleSettingsPanel={() => setSettingsPanelOpen((current) => !current)}
        />

        <main className="workspace-pane">
          {activeModule === '文献管理' ? null : (
            <section data-ui="grid" data-cols="4" data-gap="3" className="metrics-grid">
              {metricCards.map((card) => (
                <article key={`${activeModule}-${card.label}`} className="dashboard-metric">
                  <p data-ui="text" data-variant="label" data-tone="muted">{card.label}</p>
                  <p data-ui="text" data-variant="h3" data-tone="primary">{card.value}</p>
                </article>
              ))}
            </section>
          )}

          {activeModule === '文献管理' ? (
            <section className="module-dashboard literature-workspace">
              <div data-ui="stack" data-direction="col" data-gap="3">
                <AutoImportTab
                  active={activeLiteratureTab === 'auto-import'}
                  autoPullStatusDigest={autoPullStatusDigest}
                  applyTopicYearPreset={applyTopicYearPreset}
                  asRecord={asRecord}
                  autoImportSubTab={autoImportSubTab}
                  autoPullHourOptions={autoPullHourOptions}
                  autoPullLimitHint={autoPullLimitHint}
                  autoPullLookbackHint={autoPullLookbackHint}
                  autoPullParseHint={autoPullParseHint}
                  autoPullQualityHint={autoPullQualityHint}
                  autoPullQualityPresetOptions={autoPullQualityPresetOptions}
                  autoPullRuleById={autoPullRuleById}
                  autoPullRunStatusLabels={autoPullRunStatusLabels}
                  autoPullRuns={autoPullRuns}
                  autoPullSortHint={autoPullSortHint}
                  autoPullWeekdayOptions={autoPullWeekdayOptions}
                  formatTimestamp={formatTimestamp}
                  handleAddTopicExcludeKeyword={handleAddTopicExcludeKeyword}
                  handleAddTopicIncludeKeyword={handleAddTopicIncludeKeyword}
                  handleCloseTopicModal={handleCloseTopicModal}
                  handleEditRule={handleEditRule}
                  handleEditTopicProfile={handleEditTopicProfile}
                  handleOpenCreateTopicProfile={handleOpenCreateTopicProfile}
                  handleRemoveTopicExcludeKeyword={handleRemoveTopicExcludeKeyword}
                  handleRemoveTopicIncludeKeyword={handleRemoveTopicIncludeKeyword}
                  handleResetTopicRuleComposer={handleResetTopicRuleComposer}
                  handleRetryRun={handleRetryRun}
                  handleRunRuleFullRefresh={handleRunRuleFullRefresh}
                  handleSubmitRule={handleSubmitRule}
                  handleSubmitTopicProfile={handleSubmitTopicProfile}
                  handleToggleTopicProfileActive={handleToggleTopicProfileActive}
                  handleToggleTopicRuleSelection={handleToggleTopicRuleSelection}
                  handleToggleTopicVenueSelection={handleToggleTopicVenueSelection}
                  latestRunByRuleId={latestRunByRuleId}
                  loadAutoPullRunDetail={loadAutoPullRunDetail}
                  resolveRunSortTimestamp={resolveRunSortTimestamp}
                  ruleFormFrequency={ruleFormFrequency}
                  ruleFormLookbackInput={ruleFormLookbackInput}
                  ruleFormMaxResultsInput={ruleFormMaxResultsInput}
                  ruleFormMinCompletenessInput={ruleFormMinCompletenessInput}
                  ruleFormName={ruleFormName}
                  ruleFormParseAndIngest={ruleFormParseAndIngest}
                  ruleFormSortMode={ruleFormSortMode}
                  ruleFormWeekday={ruleFormWeekday}
                  ruleSourceArxiv={ruleSourceArxiv}
                  ruleSourceCrossref={ruleSourceCrossref}
                  rulesError={rulesError}
                  runDetailError={runDetailError}
                  runDetailLoading={runDetailLoading}
                  runsError={runsError}
                  runsFilterStatus={runsFilterStatus}
                  runsPageIndex={runsPageIndex}
                  runsPageItems={runsPageItems}
                  runsTotalPages={runsTotalPages}
                  scheduleHourValue={scheduleHourValue}
                  selectedRunDetail={selectedRunDetail}
                  selectedRunDurationLabel={selectedRunDurationLabel}
                  selectedRunPulledAtLabel={selectedRunPulledAtLabel}
                  selectedRunTopicLabel={selectedRunTopicLabel}
                  setRuleFormFrequency={setRuleFormFrequency}
                  setRuleFormHourInput={setRuleFormHourInput}
                  setRuleFormLookbackInput={setRuleFormLookbackInput}
                  setRuleFormMaxResultsInput={setRuleFormMaxResultsInput}
                  setRuleFormMinCompletenessInput={setRuleFormMinCompletenessInput}
                  setRuleFormMinuteInput={setRuleFormMinuteInput}
                  setRuleFormName={setRuleFormName}
                  setRuleFormParseAndIngest={setRuleFormParseAndIngest}
                  setRuleFormSortMode={setRuleFormSortMode}
                  setRuleFormWeekday={setRuleFormWeekday}
                  setRuleSourceArxiv={setRuleSourceArxiv}
                  setRuleSourceCrossref={setRuleSourceCrossref}
                  setRunsFilterStatus={setRunsFilterStatus}
                  setRunsPageIndex={setRunsPageIndex}
                  setTopicFormExcludeDraft={setTopicFormExcludeDraft}
                  setTopicFormIncludeDraft={setTopicFormIncludeDraft}
                  setTopicFormName={setTopicFormName}
                  setTopicFormVenueSelections={setTopicFormVenueSelections}
                  setTopicFormYearEnd={setTopicFormYearEnd}
                  setTopicFormYearStart={setTopicFormYearStart}
                  setTopicVenuePickerOpen={setTopicVenuePickerOpen}
                  topicAutoIdPreview={topicAutoIdPreview}
                  topicEditingId={topicEditingId}
                  topicFormExcludeDraft={topicFormExcludeDraft}
                  topicFormExcludeKeywords={topicFormExcludeKeywords}
                  topicFormIncludeDraft={topicFormIncludeDraft}
                  topicFormIncludeKeywords={topicFormIncludeKeywords}
                  topicFormModalOpen={topicFormModalOpen}
                  topicFormName={topicFormName}
                  topicFormRuleIds={topicFormRuleIds}
                  topicFormTopicId={topicFormTopicId}
                  topicFormVenueSelections={topicFormVenueSelections}
                  topicFormYearEnd={topicFormYearEnd}
                  topicFormYearStart={topicFormYearStart}
                  topicProfiles={topicProfiles}
                  topicProfilesError={topicProfilesError}
                  topicScopedRules={topicScopedRules}
                  topicSettingsSummaryStats={topicSettingsSummaryStats}
                  topicVenueOptions={topicVenueOptions}
                  topicVenuePickerOpen={topicVenuePickerOpen}
                  topicVenueSelectionLabel={topicVenueSelectionLabel}
                  topicYearLowerBound={topicYearLowerBound}
                  topicYearMaxBound={topicYearMaxBound}
                  topicYearMinBound={topicYearMinBound}
                  topicYearRangeTrackStyle={topicYearRangeTrackStyle}
                  topicYearUpperBound={topicYearUpperBound}
                  updateHelpTooltipAlignment={updateHelpTooltipAlignment}
                />

                <ManualImportTab
                  active={activeLiteratureTab === 'manual-import'}
                  manualImportSubTab={manualImportSubTab}
                  manualUploadStatus={manualUploadStatus}
                  manualDropActive={manualDropActive}
                  setManualDropActive={setManualDropActive}
                  handleManualUploadDrop={handleManualUploadDrop}
                  handleManualUpload={handleManualUpload}
                  manualUploadLoading={manualUploadLoading}
                  manualUploadFormatHint={manualUploadFormatHint}
                  updateHelpTooltipAlignment={updateHelpTooltipAlignment}
                  manualUploadFiles={manualUploadFiles}
                  isManualUploadLlmSupported={isManualUploadLlmSupported}
                  formatManualUploadFileStatusLabel={formatManualUploadFileStatusLabel}
                  handleManualUploadFileLlmAction={handleManualUploadFileLlmAction}
                  handleRemoveManualUploadFile={handleRemoveManualUploadFile}
                  manualUploadError={manualUploadError}
                  zoteroLibraryType={zoteroLibraryType}
                  setZoteroLibraryType={setZoteroLibraryType}
                  zoteroLibraryId={zoteroLibraryId}
                  setZoteroLibraryId={setZoteroLibraryId}
                  zoteroApiKey={zoteroApiKey}
                  setZoteroApiKey={setZoteroApiKey}
                  zoteroStatus={zoteroStatus}
                  handleTestZoteroConnection={handleTestZoteroConnection}
                  zoteroLoading={zoteroLoading}
                  zoteroAction={zoteroAction}
                  zoteroLinkResult={zoteroLinkResult}
                  zoteroError={zoteroError}
                  handleLoadZoteroToReview={handleLoadZoteroToReview}
                  handleImportFromZotero={handleImportFromZotero}
                  manualShowImportableOnly={manualShowImportableOnly}
                  setManualShowImportableOnly={setManualShowImportableOnly}
                  setManualShowErrorOnly={setManualShowErrorOnly}
                  hasManualSession={hasManualSession}
                  manualShowErrorOnly={manualShowErrorOnly}
                  manualRowStats={manualRowStats}
                  handleSubmitManualReviewedRows={handleSubmitManualReviewedRows}
                  manualVisibleRows={manualVisibleRows}
                  manualValidationByRowId={manualValidationByRowId}
                  manualOpenRowId={manualOpenRowId}
                  manualOpenRowPanel={manualOpenRowPanel}
                  mapManualValidationErrors={mapManualValidationErrors}
                  getManualFieldErrorText={getManualFieldErrorText}
                  handleToggleManualRowInclude={handleToggleManualRowInclude}
                  handleManualDraftFieldChange={handleManualDraftFieldChange}
                  handleCopyManualCellValue={handleCopyManualCellValue}
                  handleToggleManualRowPanel={handleToggleManualRowPanel}
                  handleRemoveManualRow={handleRemoveManualRow}
                />

                <OverviewTab {...overviewController} />
              </div>
            </section>
          ) : null}

          {activeModule === '论文管理' ? (
            <PaperModule
              paperId={paperId}
              topicId={topicId}
              onSyncPaperFromTopic={handleSyncPaperFromTopic}
              onReloadPaperLiterature={loadPaperLiterature}
              paperLiteratureError={paperLiteratureError}
              literatureActionMessage={literatureActionMessage}
              paperLiteratureLoading={paperLiteratureLoading}
              paperLiteratureItems={paperLiteratureItems}
              citationStatusOptions={citationStatusOptions}
              onUpdateCitationStatus={handleUpdateCitationStatus}
            />
          ) : null}

          {activeModule === '写作中心' ? (
            <WritingModule paperLiteratureItems={paperLiteratureItems} />
          ) : null}

          <GovernancePanel
            visible={governanceEnabled}
            paperId={paperId}
            paperIdInput={paperIdInput}
            onPaperIdInputChange={setPaperIdInput}
            onApplyPaperId={handleApplyPaperId}
            onRefreshPanels={handleRefreshPanels}
            apiBaseUrl={defaultApiBaseUrl}
            onToggleGovernance={handleToggleGovernance}
            timelinePanel={timelinePanel}
            metricsPanel={metricsPanel}
            artifactPanel={artifactPanel}
            onEvidenceTrace={handleEvidenceTrace}
            formatTimestamp={formatTimestamp}
            tryGetSnapshotId={tryGetSnapshotId}
            formatNumber={formatNumber}
            formatCurrency={formatCurrency}
            releaseQueue={releaseQueue}
            reviewersInput={reviewersInput}
            onReviewersInputChange={setReviewersInput}
            decision={decision}
            onDecisionChange={setDecision}
            labelPolicy={labelPolicy}
            onLabelPolicyChange={setLabelPolicy}
            riskFlagsInput={riskFlagsInput}
            onRiskFlagsInputChange={setRiskFlagsInput}
            reviewComment={reviewComment}
            onReviewCommentChange={setReviewComment}
            reviewSubmitState={reviewSubmitState}
            reviewSubmitMessage={reviewSubmitMessage}
            onSubmitReleaseReview={handleSubmitReleaseReview}
          />

          {topFeedback ? (
            <section className={`literature-bottom-alert is-${topFeedback.level}`} role="status" aria-live="polite">
              <p
                data-ui="text"
                data-variant="caption"
                data-tone={topFeedback.level === 'error' ? 'danger' : 'primary'}
                title={topFeedback.message}
              >
                {topFeedback.message}
              </p>
              {topFeedback.recoveryAction ? (
                <button
                  className="literature-bottom-alert-link"
                  type="button"
                  onClick={handleTopFeedbackRecovery}
                >
                  恢复
                </button>
              ) : null}
              <button
                className="literature-bottom-alert-close"
                type="button"
                aria-label="关闭提示"
                onClick={() => setTopFeedback(null)}
              >
                ×
              </button>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
