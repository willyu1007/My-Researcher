import { useMemo } from 'react';

export type DashboardMetricCard = {
  label: string;
  value: string;
};

export type DashboardMetricsInput = {
  activeModule: string;
  autoPullRules: Array<{ rule_id: string }>;
  autoPullRuns: Array<{ status: string }>;
  overviewTotalLiteratures: number;
  paperLiteratureItems: Array<{ citation_status: string }>;
  paperId: string;
  topicId: string;
  topicScopeItems: Array<{ scope_status: string }>;
  timelineEvents: Array<{ event_type: string; [key: string]: unknown }>;
};

export function useDashboardMetrics(input: DashboardMetricsInput): {
  metricCards: DashboardMetricCard[];
  releaseQueue: Array<{ [key: string]: unknown }>;
} {
  const {
    activeModule,
    autoPullRules,
    autoPullRuns,
    overviewTotalLiteratures,
    paperLiteratureItems,
    paperId,
    topicId,
    topicScopeItems,
    timelineEvents,
  } = input;

  const citedCount = paperLiteratureItems.filter((item) => item.citation_status === 'cited').length;
  const usedCount = paperLiteratureItems.filter((item) => item.citation_status === 'used').length;
  const inScopeCount = topicScopeItems.filter((item) => item.scope_status === 'in_scope').length;

  const metricCards = useMemo<DashboardMetricCard[]>(() => {
    if (activeModule === '文献管理' || activeModule === '选题管理') {
      const exceptionalRunCount = autoPullRuns.filter((run) => run.status === 'FAILED' || run.status === 'PARTIAL').length;
      return [
        { label: '自动规则', value: String(autoPullRules.length) },
        { label: '运行记录', value: String(autoPullRuns.length) },
        { label: '异常运行', value: String(exceptionalRunCount) },
        { label: '综览总量', value: String(overviewTotalLiteratures) },
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
    autoPullRules.length,
    autoPullRuns,
    autoPullRuns.length,
    citedCount,
    inScopeCount,
    overviewTotalLiteratures,
    paperId,
    paperLiteratureItems.length,
    topicId,
    usedCount,
  ]);

  const releaseQueue = useMemo(
    () =>
      timelineEvents
        .filter(
          (event) =>
            event.event_type === 'research.node.status.changed' ||
            event.event_type === 'research.release.reviewed',
        )
        .slice(-6)
        .reverse(),
    [timelineEvents],
  );

  return {
    metricCards,
    releaseQueue,
  };
}
