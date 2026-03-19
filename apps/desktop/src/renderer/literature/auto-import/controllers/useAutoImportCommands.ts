import { useCallback } from 'react';
import { requestGovernance } from '../../shared/api';
import {
  asRecord,
  generateTopicIdByName,
  normalizeQualityPresetValue,
  normalizeWeekdayToken,
  resolveSystemTimezone,
  toText,
} from '../../shared/normalizers';
import {
  topicYearMaxBound,
  topicYearMinBound,
} from '../../shared/constants';
import type {
  AutoImportControllerInput,
  AutoImportControllerOutput,
  AutoImportRuleSubmitOptions,
} from '../types';

type AutoImportCommandDependencies = Pick<
  AutoImportControllerOutput,
  'autoPullRuleById' | 'loadTopicProfiles' | 'loadAutoPullRules' | 'loadAutoPullRuns' | 'loadAutoPullRunDetail'
>;

type AutoImportCommandOutput = Pick<
  AutoImportControllerOutput,
  | 'handleOpenCreateTopicProfile'
  | 'handleCloseTopicModal'
  | 'handleOpenRuleCenter'
  | 'handleEditTopicProfile'
  | 'handleSetTopicRuleBinding'
  | 'handleAddTopicIncludeKeyword'
  | 'handleRemoveTopicIncludeKeyword'
  | 'handleAddTopicExcludeKeyword'
  | 'handleRemoveTopicExcludeKeyword'
  | 'handleToggleTopicVenueSelection'
  | 'applyTopicYearPreset'
  | 'handleSubmitTopicProfile'
  | 'handleToggleTopicProfileActive'
  | 'handleResetRuleComposer'
  | 'handleEditRule'
  | 'handleSubmitRule'
  | 'handleDeleteRule'
  | 'handleRetryRun'
>;

export function useAutoImportCommands(
  input: AutoImportControllerInput,
  dependencies: AutoImportCommandDependencies,
): AutoImportCommandOutput {
  const {
    autoPullRules,
    pushLiteratureFeedback,
    ruleEditingId,
    ruleFormFrequency,
    ruleFormHourInput,
    ruleFormLookbackInput,
    ruleFormMaxResultsInput,
    ruleFormMinCompletenessInput,
    ruleFormParseAndIngest,
    ruleFormSortMode,
    ruleFormWeekday,
    ruleSourceArxiv,
    ruleSourceCrossref,
    setAutoImportSubTab,
    setRuleEditingId,
    setRuleFormFrequency,
    setRuleFormHourInput,
    setRuleFormLookbackInput,
    setRuleFormMaxResultsInput,
    setRuleFormMinCompletenessInput,
    setRuleFormParseAndIngest,
    setRuleFormSortMode,
    setRuleFormWeekday,
    setRuleSourceArxiv,
    setRuleSourceCrossref,
    setRulesError,
    setRulesStatus,
    setTopicEditingId,
    setTopicFormExcludeDraft,
    setTopicFormExcludeKeywords,
    setTopicFormIncludeDraft,
    setTopicFormIncludeKeywords,
    setTopicFormInitialPullPending,
    setTopicFormIsActive,
    setTopicFormLookbackInput,
    setTopicFormModalOpen,
    setTopicFormName,
    setTopicFormRuleIds,
    setTopicFormTopicId,
    setTopicFormVenueSelections,
    setTopicFormYearEnd,
    setTopicFormYearStart,
    setTopicProfilesError,
    setTopicProfilesStatus,
    setTopicVenuePickerOpen,
    topicEditingId,
    topicFormExcludeDraft,
    topicFormExcludeKeywords,
    topicFormIncludeDraft,
    topicFormIncludeKeywords,
    topicFormInitialPullPending,
    topicFormIsActive,
    topicFormLookbackInput,
    topicFormName,
    topicFormRuleIds,
    topicFormTopicId,
    topicFormVenueSelections,
    topicFormYearEnd,
    topicFormYearStart,
    topicProfiles,
    toText: toTextFromApp,
    asRecord: asRecordFromApp,
  } = input;
  const {
    autoPullRuleById,
    loadTopicProfiles,
    loadAutoPullRules,
    loadAutoPullRuns,
    loadAutoPullRunDetail,
  } = dependencies;

  const resetRuleForm = useCallback(() => {
    setRuleEditingId(null);
    setRuleFormMaxResultsInput('20');
    setRuleFormLookbackInput('30');
    setRuleFormMinCompletenessInput('70');
    setRuleFormFrequency('DAILY');
    setRuleFormWeekday('MON');
    setRuleFormHourInput('9');
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
    setTopicFormInitialPullPending(true);
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
    setTopicFormInitialPullPending,
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

  const handleEditTopicProfile = useCallback((profile: typeof topicProfiles[number]) => {
    setTopicEditingId(profile.topic_id);
    setTopicFormTopicId(profile.topic_id);
    setTopicFormName(profile.name);
    setTopicFormIsActive(profile.is_active);
    setTopicFormInitialPullPending(profile.initial_pull_pending === true);
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
    setTopicFormInitialPullPending,
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
    setTopicFormIncludeKeywords((current) =>
      current.includes(nextValue) ? current : [...current, nextValue],
    );
    setTopicFormIncludeDraft('');
  }, [setTopicFormIncludeDraft, setTopicFormIncludeKeywords, topicFormIncludeDraft]);

  const handleRemoveTopicIncludeKeyword = useCallback((value: string) => {
    setTopicFormIncludeKeywords((current) => current.filter((item) => item !== value));
  }, [setTopicFormIncludeKeywords]);

  const handleAddTopicExcludeKeyword = useCallback(() => {
    const nextValue = topicFormExcludeDraft.trim();
    if (!nextValue) {
      return;
    }
    setTopicFormExcludeKeywords((current) =>
      current.includes(nextValue) ? current : [...current, nextValue],
    );
    setTopicFormExcludeDraft('');
  }, [setTopicFormExcludeDraft, setTopicFormExcludeKeywords, topicFormExcludeDraft]);

  const handleRemoveTopicExcludeKeyword = useCallback((value: string) => {
    setTopicFormExcludeKeywords((current) => current.filter((item) => item !== value));
  }, [setTopicFormExcludeKeywords]);

  const handleToggleTopicVenueSelection = useCallback((venue: string) => {
    setTopicFormVenueSelections((current) =>
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
    const topicIdText = topicEditingId
      ? topicEditingId
      : (
        topicFormTopicId.trim()
        || generateTopicIdByName(nameText, topicProfiles.map((profile) => profile.topic_id))
      );

    const body = {
      topic_id: topicIdText,
      name: nameText,
      is_active: topicFormIsActive,
      initial_pull_pending: topicFormInitialPullPending,
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
            initial_pull_pending: body.initial_pull_pending,
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
    topicFormInitialPullPending,
    topicFormIsActive,
    topicFormLookbackInput,
    topicFormName,
    topicFormRuleIds,
    topicFormTopicId,
    topicFormVenueSelections,
    topicFormYearEnd,
    topicFormYearStart,
  ]);

  const handleToggleTopicProfileActive = useCallback(async (profile: typeof topicProfiles[number]) => {
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

  const handleEditRule = useCallback((rule: typeof autoPullRules[number]) => {
    const primarySchedule = rule.schedules[0] ?? null;
    const sourceConfig = (asRecordFromApp ?? asRecord)(rule.sources.find((source) => source.enabled)?.config) ?? {};
    const sortModeRaw = (toTextFromApp ?? toText)(sourceConfig.sort_mode);
    setRuleEditingId(rule.rule_id);
    setRuleFormMaxResultsInput(String(rule.query_spec.max_results_per_source));
    setRuleFormLookbackInput(String(rule.time_spec.lookback_days));
    setRuleFormMinCompletenessInput(normalizeQualityPresetValue(rule.quality_spec.min_quality_score));
    setRuleFormFrequency(primarySchedule?.frequency ?? 'DAILY');
    setRuleFormWeekday(normalizeWeekdayToken(primarySchedule?.days_of_week[0]));
    setRuleFormHourInput(String(primarySchedule?.hour ?? 9));
    setRuleFormSortMode(sortModeRaw === 'hybrid_score' ? 'hybrid_score' : 'llm_score');
    setRuleFormParseAndIngest(sourceConfig.parse_and_ingest === true);
    setRuleSourceCrossref(rule.sources.some((source) => source.source === 'CROSSREF' && source.enabled));
    setRuleSourceArxiv(rule.sources.some((source) => source.source === 'ARXIV' && source.enabled));
  }, [
    asRecordFromApp,
    setRuleEditingId,
    setRuleFormFrequency,
    setRuleFormHourInput,
    setRuleFormLookbackInput,
    setRuleFormMaxResultsInput,
    setRuleFormMinCompletenessInput,
    setRuleFormParseAndIngest,
    setRuleFormSortMode,
    setRuleFormWeekday,
    setRuleSourceArxiv,
    setRuleSourceCrossref,
    toTextFromApp,
  ]);

  const handleSubmitRule = useCallback(async (options?: AutoImportRuleSubmitOptions) => {
    const resetOnSuccess = options?.resetOnSuccess ?? true;
    const notifyOnSuccess = options?.notifyOnSuccess ?? true;
    const existingRuleName = ruleEditingId
      ? (((toTextFromApp ?? toText)(autoPullRuleById.get(ruleEditingId)?.name)?.trim()) ?? '')
      : '';
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
    const nameText = existingRuleName || fallbackRuleName;

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
      return false;
    }

    const hour = Number.parseInt(ruleFormHourInput.trim(), 10);
    if (!Number.isFinite(hour)) {
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'warning',
        message: '调度时间无效。',
      });
      return false;
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
          minute: 0,
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

      if (resetOnSuccess) {
        resetRuleForm();
      }
      await loadAutoPullRules();
      await loadAutoPullRuns();
      if (notifyOnSuccess) {
        pushLiteratureFeedback({
          slot: 'auto-import',
          level: 'success',
          message: ruleEditingId ? '规则已更新。' : '规则已创建。',
        });
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存规则失败。';
      setRulesStatus('error');
      setRulesError(message);
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `保存规则失败：${message}`,
      });
      return false;
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

  const handleDeleteRule = useCallback(async (rule: typeof autoPullRules[number]) => {
    const ruleId = typeof rule.rule_id === 'string' ? rule.rule_id.trim() : '';
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
