import { useMemo } from 'react';
import type { TitleCardPrimaryTabKey } from '../../../literature/shared/types';
import { useV1bStageData } from '../hooks/useV1bStageData';
import { ResearchConstraintProfileCard } from '../cards/ResearchConstraintProfileCard';
import { SliceOptionSetCard } from '../cards/SliceOptionSetCard';
import { QuestionCandidateSetCard } from '../cards/QuestionCandidateSetCard';
import { ValueAssessmentCard } from '../cards/ValueAssessmentCard';
import { TopicPackageCard } from '../cards/TopicPackageCard';
import { RunOperationsCard } from '../cards/RunOperationsCard';

type V1bStageViewProps = {
  titleCardId: string | null;
  subTab: string | null;
  refreshToken: number;
  onSelectSecondaryTab: (
    tab: Exclude<TitleCardPrimaryTabKey, 'overview'>,
    subTab: string,
  ) => void;
};

const SUB_TABS = ['constraint', 'slice', 'question', 'value', 'package', 'run'] as const;

/**
 * v1b stage view — composes 6 reviewer surfaces.
 *
 * Question / Value / Package remain read-only (harness/agent-owned). The two
 * human-authority nodes are actionable (T-115) and both run THROUGH the harness
 * in `human_delegated` mode, never via a legacy direct-write path:
 *  - N2 constraint profile (constraint tab) — the researcher AUTHORS the profile.
 *  - N5 slice selection (slice tab) — the researcher PICKS an option.
 * The run tab (T-128 W-15 S3) is the operator surface: provisional sign-offs,
 * audited loopback-budget raises, and the read-only per-attempt trace drawer.
 */
export function V1bStageView({
  titleCardId,
  subTab,
  refreshToken,
  onSelectSecondaryTab,
}: V1bStageViewProps) {
  const { data, loading, error, reload } = useV1bStageData(titleCardId, refreshToken);
  // Distinct run ids seen on this title-card's v1b records — quick-picks for the run tab.
  const candidateRunIds = useMemo(() => {
    const ids = new Set<string>();
    for (const record of [
      ...data.sliceOptionSets,
      ...data.questionCandidateSets,
      ...data.valueAssessments,
      ...data.topicPackages,
    ]) {
      if (record.workflow_run_id) ids.add(record.workflow_run_id);
    }
    return [...ids];
  }, [data]);
  const activeSubTab = (SUB_TABS as readonly string[]).includes(subTab ?? '')
    ? (subTab as (typeof SUB_TABS)[number])
    : 'slice';

  if (!titleCardId) {
    return (
      <article data-ui="card">
        <div data-ui="stack" data-direction="col" data-gap="2">
          <p data-ui="text" data-variant="label" data-tone="primary">研究问题与价值</p>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            请先在侧边栏选择一个题目卡。确认研究缺口并发布后，即可收敛研究问题、评估价值与整理方案。
          </p>
        </div>
      </article>
    );
  }

  return (
    <div data-ui="stack" data-direction="col" data-gap="3">
      <div data-ui="toolbar" data-align="between" data-wrap="wrap">
        <div data-ui="stack" data-direction="row" data-gap="2" data-align="center" data-wrap="wrap">
          <span data-ui="badge" data-variant="solid" data-tone="info">研究问题与价值</span>
          {loading ? (
            <span data-ui="text" data-variant="caption" data-tone="muted">加载中…</span>
          ) : null}
          {error ? (
            <span data-ui="text" data-variant="caption" data-tone="danger">{error}</span>
          ) : null}
        </div>
        <button
          type="button"
          data-ui="button"
          data-variant="secondary"
          data-size="sm"
          onClick={() => void reload()}
          disabled={loading}
        >
          刷新研究问题与价值
        </button>
      </div>

      <article data-ui="card" data-padding="sm">
        <div data-ui="stack" data-direction="row" data-gap="2" data-wrap="wrap" data-align="center">
          <span data-ui="badge" data-variant="subtle" data-tone="warning">研究流程</span>
          <span data-ui="text" data-variant="caption" data-tone="muted">
            先确认研究约束并选择研究切片，再收敛候选问题、评估研究价值与整理方案。约束与切片选择由你确认；研究问题须经人工检查点审阅后才能进入价值评估。
          </span>
        </div>
      </article>

      {activeSubTab === 'constraint' ? (
        <ResearchConstraintProfileCard
          titleCardId={titleCardId}
          refreshToken={refreshToken}
          onMutated={() => void reload()}
        />
      ) : null}
      {activeSubTab === 'slice' ? (
        <SliceOptionSetCard
          sliceOptionSets={data.sliceOptionSets}
          onMutated={() => void reload()}
        />
      ) : null}
      {activeSubTab === 'question' ? (
        <QuestionCandidateSetCard
          candidateSets={data.questionCandidateSets}
        />
      ) : null}
      {activeSubTab === 'value' ? (
        <ValueAssessmentCard
          valueAssessments={data.valueAssessments}
        />
      ) : null}
      {activeSubTab === 'package' ? (
        <TopicPackageCard
          topicPackages={data.topicPackages}
        />
      ) : null}
      {activeSubTab === 'run' ? (
        <RunOperationsCard
          candidateRunIds={candidateRunIds}
          refreshToken={refreshToken}
        />
      ) : null}

      <article data-ui="card" data-padding="sm">
        <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap" data-align="center">
          <span data-ui="text" data-variant="caption" data-tone="muted">快速跳转：</span>
          {SUB_TABS.map((key) => (
            <button
              key={key}
              type="button"
              data-ui="button"
              data-variant={activeSubTab === key ? 'primary' : 'ghost'}
              data-size="sm"
              onClick={() => onSelectSecondaryTab('v1b', key)}
            >
              {key}
            </button>
          ))}
        </div>
      </article>
    </div>
  );
}
