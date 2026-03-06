import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { requestGovernance } from '../shared/api';
import {
  asRecord,
  generateTopicIdByName,
  normalizeAutoPullRulePayload,
  normalizeAutoPullRun,
  normalizeAutoPullRunsPayload,
  normalizeTopicProfilePayload,
  normalizeQualityPresetValue,
  normalizeWeekdayToken,
  resolveSystemTimezone,
  toText,
} from '../shared/normalizers';
import {
  formatRunDuration,
  formatTimestamp,
  resolveRunSortTimeMs,
} from '../shared/formatters';
import { topicYearMaxBound, topicYearMinBound } from '../shared/constants';

export type AutoImportControllerInput = Record<string, any>;
export type AutoImportControllerOutput = {
  topicScopedRules: any[];
  topicSettingsSummaryStats: { totalCount: number; activeCount: number };
  autoPullRuleById: Map<string, any>;
  latestRunByRuleId: Map<string, any>;
  runsTotalPages: number;
  runsPageItems: any[];
  selectedRunTopicLabel: string;
  selectedRunPulledAtLabel: string;
  selectedRunDurationLabel: string;
  topicVenueOptions: string[];
  topicAutoIdPreview: string;
  topicYearLowerBound: number;
  topicYearUpperBound: number;
  topicYearRangeTrackStyle: CSSProperties;
  topicVenueSelectionLabel: string;
  autoPullStatusDigest: string;
  loadTopicProfiles: () => Promise<void>;
  loadAutoPullRules: () => Promise<void>;
  loadAutoPullRuns: () => Promise<void>;
  loadAutoPullRunDetail: (runId: string) => Promise<void>;
  handleOpenCreateTopicProfile: () => void;
  handleCloseTopicModal: () => void;
  handleOpenRuleCenter: () => void;
  handleEditTopicProfile: (profile: any) => void;
  handleSetTopicRuleBinding: (ruleId: string) => void;
  handleAddTopicIncludeKeyword: () => void;
  handleRemoveTopicIncludeKeyword: (value: string) => void;
  handleAddTopicExcludeKeyword: () => void;
  handleRemoveTopicExcludeKeyword: (value: string) => void;
  handleToggleTopicVenueSelection: (venue: string) => void;
  applyTopicYearPreset: (preset: 'recent-5' | 'recent-10' | 'all') => void;
  handleSubmitTopicProfile: () => Promise<void>;
  handleToggleTopicProfileActive: (profile: any) => Promise<void>;
  handleResetRuleComposer: () => void;
  handleEditRule: (rule: any) => void;
  handleSubmitRule: () => Promise<void>;
  handleDeleteRule: (rule: any) => Promise<void>;
  handleRetryRun: (runId: string) => Promise<void>;
};

export function useAutoImportController(input: AutoImportControllerInput): AutoImportControllerOutput {
  const {
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
    asRecord: asRecordFromApp,
    toText: toTextFromApp,
  } = input;

  const topicScopedRules = useMemo(
    () => autoPullRules.filter((rule: any) => rule.scope === 'TOPIC'),
    [autoPullRules],
  );
  const topicSettingsSummaryStats = useMemo(() => {
    const totalCount = topicProfiles.length;
    const activeCount = topicProfiles.filter((profile: any) => profile.is_active).length;
    return {
      totalCount,
      activeCount,
    };
  }, [topicProfiles]);
  const autoPullRuleById = useMemo(
    () => new Map<string, any>(autoPullRules.map((rule: any) => [rule.rule_id, rule] as [string, any])),
    [autoPullRules],
  );
  const topicProfileNameById = useMemo(
    () => new Map<string, string>(topicProfiles.map((profile: any) => [profile.topic_id, profile.name] as [string, string])),
    [topicProfiles],
  );
  const latestRunByRuleId = useMemo(() => {
    const latestRuns = new Map<string, any>();
    autoPullRuns.forEach((run: any) => {
      const current = latestRuns.get(run.rule_id);
      if (!current || resolveRunSortTimeMs(run) > resolveRunSortTimeMs(current)) {
        latestRuns.set(run.rule_id, run);
      }
    });
    return latestRuns;
  }, [autoPullRuns]);
  const runsPageSize = 8;
  const runsTotalPages = Math.max(1, Math.ceil(autoPullRuns.length / runsPageSize));
  const runsPageItems = useMemo(() => {
    const start = (runsPageIndex - 1) * runsPageSize;
    return autoPullRuns.slice(start, start + runsPageSize);
  }, [autoPullRuns, runsPageIndex, runsPageSize]);
  const selectedRunTopicLabel = useMemo(() => {
    if (!selectedRunDetail) {
      return '--';
    }
    const rule: any = autoPullRuleById.get(selectedRunDetail.rule_id);
    if (!rule) {
      return '--';
    }
    const topicId = rule.topic_ids[0] ?? rule.topic_id;
    if (!topicId) {
      return '--';
    }
    return topicProfileNameById.get(topicId) ?? topicId;
  }, [autoPullRuleById, selectedRunDetail, topicProfileNameById]);
  const selectedRunPulledAtLabel = useMemo(() => {
    if (!selectedRunDetail) {
      return '--';
    }
    const value = selectedRunDetail.started_at ?? selectedRunDetail.created_at;
    return value ? formatTimestamp(value) : '--';
  }, [selectedRunDetail]);
  const selectedRunDurationLabel = useMemo(
    () =>
      selectedRunDetail
        ? formatRunDuration(selectedRunDetail.started_at, selectedRunDetail.finished_at)
        : '--',
    [selectedRunDetail],
  );
  const topicVenueOptions = useMemo(
    () => [...new Set([
      ...topicPresetVenueOptions,
      ...topicProfiles.flatMap((profile: any) => profile.venue_filters),
      ...topicFormVenueSelections,
    ])],
    [topicFormVenueSelections, topicProfiles, topicPresetVenueOptions],
  );
  const topicAutoIdPreview = useMemo(() => {
    const name = topicFormName.trim();
    if (!name || topicEditingId) {
      return '';
    }
    return generateTopicIdByName(name, topicProfiles.map((profile: any) => profile.topic_id));
  }, [topicEditingId, topicFormName, topicProfiles]);
  const topicYearLowerBound = Math.min(topicFormYearStart, topicFormYearEnd);
  const topicYearUpperBound = Math.max(topicFormYearStart, topicFormYearEnd);
  const topicYearRangeTrackStyle = useMemo<CSSProperties>(() => {
    const total = Math.max(1, topicYearMaxBound - topicYearMinBound);
    const startPercent = ((topicYearLowerBound - topicYearMinBound) / total) * 100;
    const endPercent = ((topicYearUpperBound - topicYearMinBound) / total) * 100;
    return {
      '--topic-range-start': `${startPercent}%`,
      '--topic-range-end': `${endPercent}%`,
    } as CSSProperties;
  }, [topicYearLowerBound, topicYearUpperBound]);
  const topicVenueSelectionLabel = useMemo(() => {
    if (topicFormVenueSelections.length === 0) {
      return '不限会议与期刊';
    }
    if (topicFormVenueSelections.length <= 2) {
      return topicFormVenueSelections.join('、');
    }
    return `${topicFormVenueSelections.slice(0, 2).join('、')} 等 ${topicFormVenueSelections.length} 项`;
  }, [topicFormVenueSelections]);
  const autoPullStatusDigest = `${topicProfilesStatus}|${rulesStatus}|${runsStatus}`;

  useEffect(() => {
    setRunsPageIndex((current: number) => {
      if (current < 1) {
        return 1;
      }
      if (current > runsTotalPages) {
        return runsTotalPages;
      }
      return current;
    });
  }, [runsTotalPages, setRunsPageIndex]);

  const resetRuleForm = useCallback(() => {
    setRuleEditingId(null);
    setRuleFormName('');
    setRuleFormMaxResultsInput('20');
    setRuleFormLookbackInput('30');
    setRuleFormMinCompletenessInput('70');
    setRuleFormFrequency('DAILY');
    setRuleFormWeekday('MON');
    setRuleFormHourInput('9');
    setRuleFormMinuteInput('0');
    setRuleFormSortMode('llm_score');
    setRuleFormParseAndIngest(false);
    setRuleSourceCrossref(true);
    setRuleSourceArxiv(true);
  }, [
    setRuleEditingId,
    setRuleFormFrequency,
    setRuleFormHourInput,
    setRuleFormLookbackInput,
    setRuleFormMaxResultsInput,
    setRuleFormMinCompletenessInput,
    setRuleFormMinuteInput,
    setRuleFormName,
    setRuleFormParseAndIngest,
    setRuleFormSortMode,
    setRuleFormWeekday,
    setRuleSourceArxiv,
    setRuleSourceCrossref,
  ]);

  const resetTopicForm = useCallback(() => {
    setTopicEditingId(null);
    setTopicFormTopicId('');
    setTopicFormName('');
    setTopicFormIsActive(true);
    setTopicFormIncludeKeywords([]);
    setTopicFormIncludeDraft('');
    setTopicFormExcludeKeywords([]);
    setTopicFormExcludeDraft('');
    setTopicFormVenueSelections([]);
    setTopicVenuePickerOpen(false);
    setTopicFormLookbackInput('30');
    setTopicFormYearStart(topicYearMinBound);
    setTopicFormYearEnd(topicYearMaxBound);
    setTopicFormRuleIds([]);
    resetRuleForm();
  }, [
    resetRuleForm,
    setTopicEditingId,
    setTopicFormExcludeDraft,
    setTopicFormExcludeKeywords,
    setTopicFormIncludeDraft,
    setTopicFormIncludeKeywords,
    setTopicFormIsActive,
    setTopicFormLookbackInput,
    setTopicFormName,
    setTopicFormRuleIds,
    setTopicFormTopicId,
    setTopicFormVenueSelections,
    setTopicFormYearEnd,
    setTopicFormYearStart,
    setTopicVenuePickerOpen,
  ]);

  const loadTopicProfiles = useCallback(async () => {
    setTopicProfilesStatus('loading');
    setTopicProfilesError(null);
    try {
      const payload = await requestGovernance({
        method: 'GET',
        path: '/topics/settings',
      });
      const items = normalizeTopicProfilePayload(payload);
      setTopicProfiles(items);
      setTopicProfilesStatus(items.length > 0 ? 'ready' : 'empty');
    } catch (error) {
      setTopicProfiles([]);
      const message = error instanceof Error ? error.message : '加载主题设置失败。';
      setTopicProfilesStatus('error');
      setTopicProfilesError(message);
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `加载主题设置失败：${message}`,
      });
    }
  }, [pushLiteratureFeedback, setTopicProfiles, setTopicProfilesError, setTopicProfilesStatus]);

  const loadAutoPullRules = useCallback(async () => {
    setRulesStatus('loading');
    setRulesError(null);
    try {
      const payload = await requestGovernance({
        method: 'GET',
        path: '/auto-pull/rules',
      });
      const items = normalizeAutoPullRulePayload(payload);
      setAutoPullRules(items);
      setRulesStatus(items.length > 0 ? 'ready' : 'empty');
    } catch (error) {
      setAutoPullRules([]);
      const message = error instanceof Error ? error.message : '加载规则失败。';
      setRulesStatus('error');
      setRulesError(message);
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `加载规则失败：${message}`,
      });
    }
  }, [pushLiteratureFeedback, setAutoPullRules, setRulesError, setRulesStatus]);

  const loadAutoPullRuns = useCallback(async () => {
    setRunsStatus('loading');
    setRunsError(null);
    try {
      const query = new URLSearchParams();
      if (runsFilterStatus && runsFilterStatus !== 'EXCEPTION') {
        query.set('status', runsFilterStatus);
      }
      query.set('limit', '50');
      const payload = await requestGovernance({
        method: 'GET',
        path: `/auto-pull/runs?${query.toString()}`,
      });
      const items = normalizeAutoPullRunsPayload(payload).sort(
        (left, right) => resolveRunSortTimeMs(right) - resolveRunSortTimeMs(left),
      );
      const filteredItems =
        runsFilterStatus === 'EXCEPTION'
          ? items.filter((item) => item.status === 'FAILED' || item.status === 'PARTIAL')
          : items;
      setAutoPullRuns(filteredItems);
      if (filteredItems.length === 0) {
        setSelectedRunDetail(null);
        setRunDetailError(null);
      }
      setRunsStatus(filteredItems.length > 0 ? 'ready' : 'empty');
    } catch (error) {
      setAutoPullRuns([]);
      const message = error instanceof Error ? error.message : '加载运行记录失败。';
      setRunsStatus('error');
      setRunsError(message);
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `加载运行记录失败：${message}`,
      });
    }
  }, [
    pushLiteratureFeedback,
    runsFilterStatus,
    setAutoPullRuns,
    setRunDetailError,
    setRunsError,
    setRunsStatus,
    setSelectedRunDetail,
  ]);

  const loadAutoPullRunDetail = useCallback(async (runId: string) => {
    const normalizedRunId = runId.trim();
    if (!normalizedRunId) {
      setSelectedRunDetail(null);
      setRunDetailError('run_id 不能为空。');
      return;
    }

    setRunDetailLoading(true);
    setRunDetailError(null);
    try {
      const payload = await requestGovernance({
        method: 'GET',
        path: `/auto-pull/runs/${encodeURIComponent(normalizedRunId)}`,
      });
      const run = normalizeAutoPullRun(payload);
      if (!run) {
        setSelectedRunDetail(null);
        setRunDetailError('运行详情格式无效。');
        return;
      }
      setSelectedRunDetail(run);
    } catch (error) {
      setSelectedRunDetail(null);
      setRunDetailError(error instanceof Error ? error.message : '加载运行详情失败。');
    } finally {
      setRunDetailLoading(false);
    }
  }, [setRunDetailError, setRunDetailLoading, setSelectedRunDetail]);

  const handleOpenCreateTopicProfile = useCallback(() => {
    resetTopicForm();
    setTopicFormModalOpen(true);
    setAutoImportSubTab('topic-settings');
  }, [resetTopicForm, setAutoImportSubTab, setTopicFormModalOpen]);

  const handleCloseTopicModal = useCallback(() => {
    setTopicFormModalOpen(false);
    setTopicVenuePickerOpen(false);
    resetTopicForm();
  }, [resetTopicForm, setTopicFormModalOpen, setTopicVenuePickerOpen]);

  const handleOpenRuleCenter = useCallback(() => {
    setTopicFormModalOpen(false);
    setTopicVenuePickerOpen(false);
    setAutoImportSubTab('rule-center');
  }, [setAutoImportSubTab, setTopicFormModalOpen, setTopicVenuePickerOpen]);

  const handleEditTopicProfile = useCallback((profile: any) => {
    setTopicEditingId(profile.topic_id);
    setTopicFormTopicId(profile.topic_id);
    setTopicFormName(profile.name);
    setTopicFormIsActive(profile.is_active);
    setTopicFormIncludeKeywords(profile.include_keywords);
    setTopicFormIncludeDraft('');
    setTopicFormExcludeKeywords(profile.exclude_keywords);
    setTopicFormExcludeDraft('');
    setTopicFormVenueSelections(profile.venue_filters);
    setTopicVenuePickerOpen(false);
    setTopicFormLookbackInput(String(profile.default_lookback_days));
    setTopicFormYearStart(profile.default_min_year ?? topicYearMinBound);
    setTopicFormYearEnd(profile.default_max_year ?? topicYearMaxBound);
    setTopicFormRuleIds(profile.rule_ids.slice(0, 1));
    resetRuleForm();
    setTopicFormModalOpen(true);
    setAutoImportSubTab('topic-settings');
  }, [
    resetRuleForm,
    setAutoImportSubTab,
    setTopicEditingId,
    setTopicFormExcludeDraft,
    setTopicFormExcludeKeywords,
    setTopicFormIncludeDraft,
    setTopicFormIncludeKeywords,
    setTopicFormIsActive,
    setTopicFormLookbackInput,
    setTopicFormModalOpen,
    setTopicFormName,
    setTopicFormRuleIds,
    setTopicFormTopicId,
    setTopicFormVenueSelections,
    setTopicFormYearEnd,
    setTopicFormYearStart,
    setTopicVenuePickerOpen,
  ]);

  const handleSetTopicRuleBinding = useCallback((ruleId: string) => {
    const normalizedRuleId = ruleId.trim();
    setTopicFormRuleIds(normalizedRuleId ? [normalizedRuleId] : []);
  }, [setTopicFormRuleIds]);

  const handleAddTopicIncludeKeyword = useCallback(() => {
    const nextValue = topicFormIncludeDraft.trim();
    if (!nextValue) {
      return;
    }
    setTopicFormIncludeKeywords((current: string[]) =>
      current.includes(nextValue) ? current : [...current, nextValue],
    );
    setTopicFormIncludeDraft('');
  }, [setTopicFormIncludeDraft, setTopicFormIncludeKeywords, topicFormIncludeDraft]);

  const handleRemoveTopicIncludeKeyword = useCallback((value: string) => {
    setTopicFormIncludeKeywords((current: string[]) => current.filter((item) => item !== value));
  }, [setTopicFormIncludeKeywords]);

  const handleAddTopicExcludeKeyword = useCallback(() => {
    const nextValue = topicFormExcludeDraft.trim();
    if (!nextValue) {
      return;
    }
    setTopicFormExcludeKeywords((current: string[]) =>
      current.includes(nextValue) ? current : [...current, nextValue],
    );
    setTopicFormExcludeDraft('');
  }, [setTopicFormExcludeDraft, setTopicFormExcludeKeywords, topicFormExcludeDraft]);

  const handleRemoveTopicExcludeKeyword = useCallback((value: string) => {
    setTopicFormExcludeKeywords((current: string[]) => current.filter((item) => item !== value));
  }, [setTopicFormExcludeKeywords]);

  const handleToggleTopicVenueSelection = useCallback((venue: string) => {
    setTopicFormVenueSelections((current: string[]) =>
      current.includes(venue)
        ? current.filter((item) => item !== venue)
        : [...current, venue],
    );
  }, [setTopicFormVenueSelections]);

  const applyTopicYearPreset = useCallback((preset: 'recent-5' | 'recent-10' | 'all') => {
    const currentYear = new Date().getFullYear();
    if (preset === 'all') {
      setTopicFormYearStart(topicYearMinBound);
      setTopicFormYearEnd(topicYearMaxBound);
      return;
    }
    if (preset === 'recent-5') {
      setTopicFormYearStart(Math.max(topicYearMinBound, currentYear - 4));
      setTopicFormYearEnd(Math.min(topicYearMaxBound, currentYear + 1));
      return;
    }
    setTopicFormYearStart(Math.max(topicYearMinBound, currentYear - 9));
    setTopicFormYearEnd(Math.min(topicYearMaxBound, currentYear + 1));
  }, [setTopicFormYearEnd, setTopicFormYearStart]);

  const handleSubmitTopicProfile = useCallback(async () => {
    const nameText = topicFormName.trim();
    if (!nameText) {
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'warning',
        message: '主题名称不能为空。',
      });
      return;
    }

    const lookbackValue = Number.parseInt(topicFormLookbackInput.trim(), 10);
    const normalizedStartYear = Math.min(topicFormYearStart, topicFormYearEnd);
    const normalizedEndYear = Math.max(topicFormYearStart, topicFormYearEnd);
    const topicAutoIdPreview =
      !topicFormName.trim() || topicEditingId
        ? ''
        : generateTopicIdByName(topicFormName.trim(), topicProfiles.map((profile: any) => profile.topic_id));
    const topicIdText = topicEditingId
      ? topicEditingId
      : (topicAutoIdPreview || topicFormTopicId.trim() || generateTopicIdByName(nameText, topicProfiles.map((profile: any) => profile.topic_id)));

    const body = {
      topic_id: topicIdText,
      name: nameText,
      is_active: topicFormIsActive,
      include_keywords: topicFormIncludeKeywords,
      exclude_keywords: topicFormExcludeKeywords,
      venue_filters: topicFormVenueSelections,
      default_lookback_days: Number.isFinite(lookbackValue) ? lookbackValue : 30,
      default_min_year: normalizedStartYear > topicYearMinBound ? normalizedStartYear : null,
      default_max_year: normalizedEndYear < topicYearMaxBound ? normalizedEndYear : null,
      rule_ids: topicFormRuleIds,
    };

    setTopicProfilesStatus('saving');
    try {
      if (topicEditingId) {
        await requestGovernance({
          method: 'PATCH',
          path: `/topics/settings/${encodeURIComponent(topicEditingId)}`,
          body: {
            name: body.name,
            is_active: body.is_active,
            include_keywords: body.include_keywords,
            exclude_keywords: body.exclude_keywords,
            venue_filters: body.venue_filters,
            default_lookback_days: body.default_lookback_days,
            default_min_year: body.default_min_year,
            default_max_year: body.default_max_year,
            rule_ids: body.rule_ids,
          },
        });
      } else {
        await requestGovernance({
          method: 'POST',
          path: '/topics/settings',
          body,
        });
      }
      resetTopicForm();
      setTopicFormModalOpen(false);
      setTopicVenuePickerOpen(false);
      await loadTopicProfiles();
      await loadAutoPullRules();
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'success',
        message: topicEditingId ? '主题设置已更新。' : '主题设置已创建。',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存主题设置失败。';
      setTopicProfilesStatus('error');
      setTopicProfilesError(message);
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `保存主题设置失败：${message}`,
      });
    }
  }, [
    loadAutoPullRules,
    loadTopicProfiles,
    pushLiteratureFeedback,
    resetTopicForm,
    setTopicFormModalOpen,
    setTopicProfilesError,
    setTopicProfilesStatus,
    setTopicVenuePickerOpen,
    topicEditingId,
    topicFormExcludeKeywords,
    topicFormIncludeKeywords,
    topicFormIsActive,
    topicFormLookbackInput,
    topicFormName,
    topicFormRuleIds,
    topicFormTopicId,
    topicFormVenueSelections,
    topicFormYearEnd,
    topicFormYearStart,
    topicProfiles,
  ]);

  const handleToggleTopicProfileActive = useCallback(async (profile: any) => {
    try {
      await requestGovernance({
        method: 'PATCH',
        path: `/topics/settings/${encodeURIComponent(profile.topic_id)}`,
        body: {
          is_active: !profile.is_active,
        },
      });
      await loadTopicProfiles();
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'success',
        message: `主题已${profile.is_active ? '关闭' : '启用'}：${profile.name}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新主题状态失败。';
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `更新主题状态失败：${message}`,
      });
    }
  }, [loadTopicProfiles, pushLiteratureFeedback]);

  const handleResetRuleComposer = useCallback(() => {
    resetRuleForm();
  }, [resetRuleForm]);

  const handleEditRule = useCallback((rule: any) => {
    const primarySchedule = rule.schedules[0] ?? null;
    const sourceConfig = (asRecordFromApp ?? asRecord)(rule.sources.find((source: any) => source.enabled)?.config) ?? {};
    const sortModeRaw = (toTextFromApp ?? toText)(sourceConfig.sort_mode);
    setRuleEditingId(rule.rule_id);
    setRuleFormName(rule.name);
    setRuleFormMaxResultsInput(String(rule.query_spec.max_results_per_source));
    setRuleFormLookbackInput(String(rule.time_spec.lookback_days));
    setRuleFormMinCompletenessInput(normalizeQualityPresetValue(rule.quality_spec.min_quality_score));
    setRuleFormFrequency(primarySchedule?.frequency ?? 'DAILY');
    setRuleFormWeekday(normalizeWeekdayToken(primarySchedule?.days_of_week[0]));
    setRuleFormHourInput(String(primarySchedule?.hour ?? 9));
    setRuleFormMinuteInput('0');
    setRuleFormSortMode(sortModeRaw === 'hybrid_score' ? 'hybrid_score' : 'llm_score');
    setRuleFormParseAndIngest(sourceConfig.parse_and_ingest === true);
    setRuleSourceCrossref(rule.sources.some((source: any) => source.source === 'CROSSREF' && source.enabled));
    setRuleSourceArxiv(rule.sources.some((source: any) => source.source === 'ARXIV' && source.enabled));
  }, [
    asRecordFromApp,
    setRuleEditingId,
    setRuleFormFrequency,
    setRuleFormHourInput,
    setRuleFormLookbackInput,
    setRuleFormMaxResultsInput,
    setRuleFormMinCompletenessInput,
    setRuleFormMinuteInput,
    setRuleFormName,
    setRuleFormParseAndIngest,
    setRuleFormSortMode,
    setRuleFormWeekday,
    setRuleSourceArxiv,
    setRuleSourceCrossref,
    toTextFromApp,
  ]);

  const handleSubmitRule = useCallback(async () => {
    const existingRuleName = ruleEditingId
      ? (((toTextFromApp ?? toText)(autoPullRuleById.get(ruleEditingId)?.name)?.trim()) ?? '')
      : '';
    const draftRuleName = ruleFormName.trim();
    const fallbackRuleName = (() => {
      const topicName = topicFormName.trim();
      if (topicName) {
        return `${topicName} 自动拉取规则`;
      }
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      return `自动拉取规则 ${year}-${month}-${day} ${hour}:${minute}`;
    })();
    const nameText = draftRuleName || existingRuleName || fallbackRuleName;

    const sources: Array<{
      source: 'CROSSREF' | 'ARXIV';
      enabled: boolean;
      priority: number;
      config?: Record<string, unknown>;
    }> = [];
    const ruleSourceConfig = {
      sort_mode: ruleFormSortMode,
      parse_and_ingest: ruleFormParseAndIngest,
    } satisfies Record<string, unknown>;
    if (ruleSourceCrossref) {
      sources.push({ source: 'CROSSREF', enabled: true, priority: 10, config: ruleSourceConfig });
    }
    if (ruleSourceArxiv) {
      sources.push({ source: 'ARXIV', enabled: true, priority: 20, config: ruleSourceConfig });
    }

    if (sources.length === 0) {
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'warning',
        message: '至少启用一个数据源。',
      });
      return;
    }

    const hour = Number.parseInt(ruleFormHourInput.trim(), 10);
    const minute = Number.parseInt(ruleFormMinuteInput.trim(), 10);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'warning',
        message: '调度时间无效。',
      });
      return;
    }

    const maxResults = Number.parseInt(ruleFormMaxResultsInput.trim(), 10);
    const lookbackDays = Number.parseInt(ruleFormLookbackInput.trim(), 10);
    const minCompleteness = Number.parseInt(ruleFormMinCompletenessInput.trim(), 10);
    const scheduleTimezone = resolveSystemTimezone();

    const payload = {
      scope: 'TOPIC' as const,
      name: nameText,
      query_spec: {
        include_keywords: [],
        exclude_keywords: [],
        authors: [],
        venues: [],
        max_results_per_source: Number.isFinite(maxResults) ? maxResults : 20,
      },
      time_spec: {
        lookback_days: Number.isFinite(lookbackDays) ? lookbackDays : 30,
        min_year: null,
        max_year: null,
      },
      quality_spec: {
        min_quality_score: Number.isFinite(minCompleteness) ? minCompleteness : 70,
      },
      sources,
      schedules: [
        {
          frequency: ruleFormFrequency,
          days_of_week: ruleFormFrequency === 'WEEKLY' ? [ruleFormWeekday] : [],
          hour,
          minute,
          timezone: scheduleTimezone,
          active: true,
        },
      ],
    };

    setRulesStatus('saving');
    try {
      if (ruleEditingId) {
        await requestGovernance({
          method: 'PATCH',
          path: `/auto-pull/rules/${encodeURIComponent(ruleEditingId)}`,
          body: payload,
        });
      } else {
        await requestGovernance({
          method: 'POST',
          path: '/auto-pull/rules',
          body: payload,
        });
      }

      resetRuleForm();
      await loadAutoPullRules();
      await loadAutoPullRuns();
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'success',
        message: ruleEditingId ? '规则已更新。' : '规则已创建。',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存规则失败。';
      setRulesStatus('error');
      setRulesError(message);
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `保存规则失败：${message}`,
      });
    }
  }, [
    autoPullRuleById,
    loadAutoPullRules,
    loadAutoPullRuns,
    pushLiteratureFeedback,
    resetRuleForm,
    ruleEditingId,
    ruleFormFrequency,
    ruleFormHourInput,
    ruleFormLookbackInput,
    ruleFormMaxResultsInput,
    ruleFormMinCompletenessInput,
    ruleFormMinuteInput,
    ruleFormName,
    ruleFormParseAndIngest,
    ruleFormSortMode,
    ruleFormWeekday,
    ruleSourceArxiv,
    ruleSourceCrossref,
    setRulesError,
    setRulesStatus,
    toTextFromApp,
    topicFormName,
  ]);

  const handleDeleteRule = useCallback(async (rule: any) => {
    const ruleId = typeof rule?.rule_id === 'string' ? rule.rule_id.trim() : '';
    if (!ruleId) {
      return;
    }

    try {
      await requestGovernance({
        method: 'DELETE',
        path: `/auto-pull/rules/${encodeURIComponent(ruleId)}`,
      });
      if (ruleEditingId === ruleId) {
        resetRuleForm();
      }
      await loadAutoPullRules();
      await loadAutoPullRuns();
      await loadTopicProfiles();
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'success',
        message: `已移除规则：${rule.name}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '移除规则失败。';
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `移除规则失败：${message}`,
      });
    }
  }, [
    loadAutoPullRules,
    loadAutoPullRuns,
    loadTopicProfiles,
    pushLiteratureFeedback,
    resetRuleForm,
    ruleEditingId,
  ]);

  const handleRetryRun = useCallback(async (runId: string) => {
    try {
      await requestGovernance({
        method: 'POST',
        path: `/auto-pull/runs/${encodeURIComponent(runId)}/retry-failed-sources`,
        body: {},
      });
      await loadAutoPullRuns();
      await loadAutoPullRunDetail(runId);
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'success',
        message: '已触发失败源重试。',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '重试失败源失败。';
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `重试失败源失败：${message}`,
      });
    }
  }, [loadAutoPullRunDetail, loadAutoPullRuns, pushLiteratureFeedback]);

  return {
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
    handleOpenRuleCenter,
    handleEditTopicProfile,
    handleSetTopicRuleBinding,
    handleAddTopicIncludeKeyword,
    handleRemoveTopicIncludeKeyword,
    handleAddTopicExcludeKeyword,
    handleRemoveTopicExcludeKeyword,
    handleToggleTopicVenueSelection,
    applyTopicYearPreset,
    handleSubmitTopicProfile,
    handleToggleTopicProfileActive,
    handleResetRuleComposer,
    handleEditRule,
    handleSubmitRule,
    handleDeleteRule,
    handleRetryRun,
  };
}
