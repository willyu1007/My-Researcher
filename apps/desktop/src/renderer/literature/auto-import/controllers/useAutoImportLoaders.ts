import { useCallback } from 'react';
import { requestGovernance } from '../../shared/api';
import {
  normalizeAutoPullRulePayload,
  normalizeAutoPullRun,
  normalizeAutoPullRunsPayload,
  normalizeTopicProfilePayload,
} from '../../shared/normalizers';
import { resolveRunSortTimeMs } from '../../shared/formatters';
import type {
  AutoImportControllerInput,
  AutoImportControllerOutput,
} from '../types';

type AutoImportLoaderOutput = Pick<
  AutoImportControllerOutput,
  'loadTopicProfiles' | 'loadAutoPullRules' | 'loadAutoPullRuns' | 'loadAutoPullRunDetail'
>;

export function useAutoImportLoaders(input: AutoImportControllerInput): AutoImportLoaderOutput {
  const {
    pushLiteratureFeedback,
    runsFilterStatus,
    setTopicProfiles,
    setTopicProfilesError,
    setTopicProfilesStatus,
    setAutoPullRules,
    setRulesError,
    setRulesStatus,
    setAutoPullRuns,
    setRunsError,
    setRunsStatus,
    setSelectedRunDetail,
    setRunDetailError,
    setRunDetailLoading,
  } = input;

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
  }, [
    pushLiteratureFeedback,
    setTopicProfiles,
    setTopicProfilesError,
    setTopicProfilesStatus,
  ]);

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
  }, [
    pushLiteratureFeedback,
    setAutoPullRules,
    setRulesError,
    setRulesStatus,
  ]);

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

  return {
    loadTopicProfiles,
    loadAutoPullRules,
    loadAutoPullRuns,
    loadAutoPullRunDetail,
  };
}
