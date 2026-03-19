import {
  type CSSProperties,
  useEffect,
  useMemo,
} from 'react';
import { generateTopicIdByName } from '../../shared/normalizers';
import {
  formatRunDuration,
  formatTimestamp,
  resolveRunSortTimeMs,
} from '../../shared/formatters';
import { topicYearMaxBound, topicYearMinBound } from '../../shared/constants';
import type {
  AutoImportControllerInput,
  AutoImportControllerOutput,
} from '../types';

type AutoImportViewModelOutput = Pick<
  AutoImportControllerOutput,
  | 'topicScopedRules'
  | 'topicSettingsSummaryStats'
  | 'autoPullRuleById'
  | 'latestRunByRuleId'
  | 'runsTotalPages'
  | 'runsPageItems'
  | 'selectedRunTopicLabel'
  | 'selectedRunPulledAtLabel'
  | 'selectedRunDurationLabel'
  | 'topicVenueOptions'
  | 'topicAutoIdPreview'
  | 'topicYearLowerBound'
  | 'topicYearUpperBound'
  | 'topicYearRangeTrackStyle'
  | 'topicVenueSelectionLabel'
  | 'autoPullStatusDigest'
>;

export function useAutoImportViewModel(input: AutoImportControllerInput): AutoImportViewModelOutput {
  const {
    autoPullRules,
    autoPullRuns,
    runsPageIndex,
    setRunsPageIndex,
    selectedRunDetail,
    topicFormName,
    topicEditingId,
    topicProfiles,
    topicFormVenueSelections,
    topicFormYearStart,
    topicFormYearEnd,
    topicFormRuleIds,
    topicProfilesStatus,
    rulesStatus,
    runsStatus,
    topicPresetVenueOptions,
  } = input;

  const topicScopedRules = useMemo(
    () => autoPullRules.filter((rule) => rule.scope === 'TOPIC'),
    [autoPullRules],
  );

  const topicSettingsSummaryStats = useMemo(() => {
    const totalCount = topicProfiles.length;
    const activeCount = topicProfiles.filter((profile) => profile.is_active).length;
    return {
      totalCount,
      activeCount,
    };
  }, [topicProfiles]);

  const autoPullRuleById = useMemo(
    () => new Map<string, typeof autoPullRules[number]>(autoPullRules.map((rule) => [rule.rule_id, rule])),
    [autoPullRules],
  );

  const topicProfileNameById = useMemo(
    () => new Map<string, string>(topicProfiles.map((profile) => [profile.topic_id, profile.name])),
    [topicProfiles],
  );

  const latestRunByRuleId = useMemo(() => {
    const latestRuns = new Map<string, typeof autoPullRuns[number]>();
    autoPullRuns.forEach((run) => {
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
  }, [autoPullRuns, runsPageIndex]);

  const selectedRunTopicLabel = useMemo(() => {
    if (!selectedRunDetail) {
      return '--';
    }
    const rule = autoPullRuleById.get(selectedRunDetail.rule_id);
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
    () => (
      selectedRunDetail
        ? formatRunDuration(selectedRunDetail.started_at, selectedRunDetail.finished_at)
        : '--'
    ),
    [selectedRunDetail],
  );

  const topicVenueOptions = useMemo(
    () => [...new Set([
      ...topicPresetVenueOptions,
      ...topicProfiles.flatMap((profile) => profile.venue_filters),
      ...topicFormVenueSelections,
    ])],
    [topicFormVenueSelections, topicProfiles, topicPresetVenueOptions],
  );

  const topicAutoIdPreview = useMemo(() => {
    const name = topicFormName.trim();
    if (!name || topicEditingId) {
      return '';
    }
    return generateTopicIdByName(name, topicProfiles.map((profile) => profile.topic_id));
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
    setRunsPageIndex((current) => {
      if (current < 1) {
        return 1;
      }
      if (current > runsTotalPages) {
        return runsTotalPages;
      }
      return current;
    });
  }, [runsTotalPages, setRunsPageIndex]);

  useEffect(() => {
    if (topicFormRuleIds.length === 0) {
      return;
    }
    const validRuleIdSet = new Set(topicScopedRules.map((rule) => rule.rule_id));
    const nextRuleIds = topicFormRuleIds.filter((ruleId) => validRuleIdSet.has(ruleId));
    if (nextRuleIds.length === topicFormRuleIds.length) {
      return;
    }
    input.setTopicFormRuleIds(nextRuleIds.slice(0, 1));
  }, [input, topicFormRuleIds, topicScopedRules]);

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
  };
}
