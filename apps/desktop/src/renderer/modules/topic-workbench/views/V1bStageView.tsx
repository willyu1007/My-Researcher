import type { TitleCardPrimaryTabKey } from '../../../literature/shared/types';
import { useV1bStageData } from '../hooks/useV1bStageData';
import { ResearchConstraintProfileCard } from '../cards/ResearchConstraintProfileCard';
import { SliceOptionSetCard } from '../cards/SliceOptionSetCard';
import { QuestionCandidateSetCard } from '../cards/QuestionCandidateSetCard';
import { ValueAssessmentCard } from '../cards/ValueAssessmentCard';
import { TopicPackageCard } from '../cards/TopicPackageCard';

type V1bStageViewProps = {
  titleCardId: string | null;
  subTab: string | null;
  refreshToken: number;
  onSelectSecondaryTab: (
    tab: Exclude<TitleCardPrimaryTabKey, 'overview'>,
    subTab: string,
  ) => void;
};

const SUB_TABS = ['constraint', 'slice', 'question', 'value', 'package'] as const;

/**
 * v1b stage view — composes 5 reviewer surfaces.
 *
 * Question / Value / Package remain read-only (harness/agent-owned). The two
 * human-authority nodes are actionable (T-115) and both run THROUGH the harness
 * in `human_delegated` mode, never via a legacy direct-write path:
 *  - N2 constraint profile (constraint tab) — the researcher AUTHORS the profile.
 *  - N5 slice selection (slice tab) — the researcher PICKS an option.
 */
export function V1bStageView({
  titleCardId,
  subTab,
  refreshToken,
  onSelectSecondaryTab,
}: V1bStageViewProps) {
  const { data, loading, error, reload } = useV1bStageData(titleCardId, refreshToken);
  const activeSubTab = (SUB_TABS as readonly string[]).includes(subTab ?? '')
    ? (subTab as (typeof SUB_TABS)[number])
    : 'slice';

  if (!titleCardId) {
    return (
      <article data-ui="card">
        <div data-ui="stack" data-direction="col" data-gap="2">
          <p data-ui="text" data-variant="label" data-tone="primary">v1b 切片-题目-价值-方案</p>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            请先在侧边栏选择一个题目卡。v1b 决策链消费 v1a 出口 ValidatedNeed + V1bInputBundle。
          </p>
        </div>
      </article>
    );
  }

  return (
    <div data-ui="stack" data-direction="col" data-gap="3">
      <div data-ui="toolbar" data-align="between" data-wrap="wrap">
        <div data-ui="stack" data-direction="row" data-gap="2" data-align="center" data-wrap="wrap">
          <span data-ui="badge" data-variant="solid" data-tone="info">v1b 切片-题目-价值-方案</span>
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
          刷新 v1b 数据
        </button>
      </div>

      <article data-ui="card" data-padding="sm">
        <div data-ui="stack" data-direction="row" data-gap="2" data-wrap="wrap" data-align="center">
          <span data-ui="badge" data-variant="subtle" data-tone="warning">验收口径</span>
          <span data-ui="text" data-variant="caption" data-tone="muted">
            当前页展示 v1b authority：N2 约束档案（constraint 标签，人审撰写）与 N5 选片（slice 标签，人审选择）均经 harness human_delegated 写入，其余 harness/agent 写入。快速本地 smoke 默认 1 轮；provider live 验收使用 N4/N6/N8 slot canary；近生产深测由 runtime stress 与 provider slot canary 组合完成。
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
