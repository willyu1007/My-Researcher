import type { TitleCardPrimaryTabKey } from '../../../literature/shared/types';
import type {
  TitleCardWorkbenchListPayload,
  TitleCardWorkbenchSummary,
} from '../types';

type OverviewViewProps = {
  items: TitleCardWorkbenchSummary[];
  summary: TitleCardWorkbenchListPayload['summary'] | null;
  loading: boolean;
  error: string | null;
  activeTitleCardId: string | null;
  onSelectTitleCard: (id: string) => void;
  onEnterStage: (stage: Exclude<TitleCardPrimaryTabKey, 'overview'>) => void;
  onReload: () => void;
};

/**
 * Overview view — the place to switch / inspect title-cards. Creation is not
 * available here yet (backend / dev tool only; see the empty-state copy).
 *
 * D3: this is the "总揽" stage of the new workbench. Stage 进入 via the three
 * stepper-style entry cards (v1a / v1b / v1c) at the bottom.
 */
export function OverviewView({
  items,
  summary,
  loading,
  error,
  activeTitleCardId,
  onSelectTitleCard,
  onEnterStage,
  onReload,
}: OverviewViewProps) {
  const activeCard = items.find((item) => item.title_card_id === activeTitleCardId) ?? null;

  return (
    <div data-ui="stack" data-direction="col" data-gap="3">
      <div data-ui="grid" data-cols="4" data-gap="3">
        <article data-ui="card">
          <p data-ui="text" data-variant="label" data-tone="muted">题目卡总数</p>
          <p data-ui="text" data-variant="h3" data-tone="primary">{summary?.total_title_cards ?? '--'}</p>
        </article>
        <article data-ui="card">
          <p data-ui="text" data-variant="label" data-tone="muted">活跃题目卡</p>
          <p data-ui="text" data-variant="h3" data-tone="primary">{summary?.active_title_cards ?? '--'}</p>
        </article>
        <article data-ui="card">
          <p data-ui="text" data-variant="label" data-tone="muted">待晋升</p>
          <p data-ui="text" data-variant="h3" data-tone="primary">{summary?.pending_promotion_cards ?? '--'}</p>
        </article>
        <article data-ui="card">
          <p data-ui="text" data-variant="label" data-tone="muted">证据篮子总量</p>
          <p data-ui="text" data-variant="h3" data-tone="primary">{summary?.total_evidence_items ?? '--'}</p>
        </article>
      </div>

      <div data-ui="grid" data-cols="2" data-gap="3">
        <article data-ui="card">
          <div data-ui="stack" data-direction="col" data-gap="2">
            <div data-ui="toolbar" data-align="between">
              <p data-ui="text" data-variant="label" data-tone="primary">题目卡列表</p>
              <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={() => onReload()}>
                刷新
              </button>
            </div>
            {error ? <p data-ui="text" data-variant="caption" data-tone="danger">{error}</p> : null}
            {loading && items.length === 0 ? (
              <p data-ui="text" data-variant="caption" data-tone="muted">加载题目卡列表中…</p>
            ) : null}
            {!loading && items.length === 0 ? (
              <p data-ui="text" data-variant="caption" data-tone="muted">当前还没有题目卡。请联系后端创建或使用 dev tool。</p>
            ) : null}
            <div data-ui="list" data-variant="rows" data-density="compact">
              {items.map((item) => {
                const isActive = activeTitleCardId === item.title_card_id;
                return (
                  <button
                    key={item.title_card_id}
                    type="button"
                    data-ui="button"
                    data-variant={isActive ? 'primary' : 'secondary'}
                    data-size="sm"
                    onClick={() => onSelectTitleCard(item.title_card_id)}
                  >
                    <span data-ui="stack" data-direction="col" data-gap="0" data-align="start">
                      <span data-ui="text" data-variant="body" data-tone="primary">{item.working_title || item.title_card_id}</span>
                      <span data-ui="text" data-variant="caption" data-tone="muted">{item.title_card_id}</span>
                      {item.research_rejection ? (
                        <span data-ui="text" data-variant="caption" data-tone="warning">研究已拒绝</span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </article>

        <article data-ui="card">
          <div data-ui="stack" data-direction="col" data-gap="2">
            <p data-ui="text" data-variant="label" data-tone="primary">当前选中</p>
            {activeCard ? (
              <>
                <p data-ui="text" data-variant="h3" data-tone="primary">{activeCard.working_title}</p>
                <p data-ui="text" data-variant="body" data-tone="muted">{activeCard.brief}</p>
                <div data-ui="stack" data-direction="row" data-gap="2" data-wrap="wrap">
                  <span data-ui="badge" data-variant="subtle" data-tone="neutral">管理状态：{activeCard.status}</span>
                  {activeCard.research_rejection ? (
                    <span data-ui="badge" data-variant="subtle" data-tone="warning">研究已拒绝</span>
                  ) : null}
                  {activeCard.latest_paper_id ? (
                    <span data-ui="badge" data-variant="subtle" data-tone="info">Paper: {activeCard.latest_paper_id}</span>
                  ) : null}
                </div>
                {activeCard.research_rejection ? (
                  <p data-ui="text" data-variant="body" data-tone="muted">拒绝理由：{activeCard.research_rejection.rationale}</p>
                ) : null}
                <div data-ui="grid" data-cols="3" data-gap="2">
                  <article data-ui="card" data-padding="sm">
                    <p data-ui="text" data-variant="caption" data-tone="muted">Evidence</p>
                    <p data-ui="text" data-variant="h3" data-tone="primary">{activeCard.evidence_count}</p>
                  </article>
                  <article data-ui="card" data-padding="sm">
                    <p data-ui="text" data-variant="caption" data-tone="muted">Need</p>
                    <p data-ui="text" data-variant="h3" data-tone="primary">{activeCard.need_count}</p>
                  </article>
                  <article data-ui="card" data-padding="sm">
                    <p data-ui="text" data-variant="caption" data-tone="muted">Question</p>
                    <p data-ui="text" data-variant="h3" data-tone="primary">{activeCard.research_question_count}</p>
                  </article>
                  <article data-ui="card" data-padding="sm">
                    <p data-ui="text" data-variant="caption" data-tone="muted">Value</p>
                    <p data-ui="text" data-variant="h3" data-tone="primary">{activeCard.value_assessment_count}</p>
                  </article>
                  <article data-ui="card" data-padding="sm">
                    <p data-ui="text" data-variant="caption" data-tone="muted">Package</p>
                    <p data-ui="text" data-variant="h3" data-tone="primary">{activeCard.package_count}</p>
                  </article>
                  <article data-ui="card" data-padding="sm">
                    <p data-ui="text" data-variant="caption" data-tone="muted">Promotion</p>
                    <p data-ui="text" data-variant="h3" data-tone="primary">{activeCard.promotion_decision_count}</p>
                  </article>
                </div>
              </>
            ) : (
              <p data-ui="text" data-variant="caption" data-tone="muted">请在左侧选择一个题目卡。</p>
            )}
          </div>
        </article>
      </div>

      <article data-ui="card">
        <div data-ui="stack" data-direction="col" data-gap="2">
          <p data-ui="text" data-variant="label" data-tone="primary">进入研究阶段</p>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            文献与证据收敛 → 研究缺口选择 → 研究问题收敛 → 研究价值评估 → 晋升审阅。请先选择题目卡。
          </p>
          <div data-ui="grid" data-cols="3" data-gap="2">
            {([
              {
                stage: 'v1a',
                badge: '1',
                title: '文献与证据收敛',
                surfaces: '审阅检索计划与证据，选择并确认研究缺口',
              },
              {
                stage: 'v1b',
                badge: '2',
                title: '研究问题与价值',
                surfaces: '选择研究切片，收敛问题，评估价值并整理方案',
              },
              {
                stage: 'v1c',
                badge: '3',
                title: '晋升审阅',
                surfaces: '审阅风险与晋升条件，确认承诺并衔接论文项目',
              },
            ] as const).map((step) => (
              <article key={step.stage} data-ui="card" data-padding="md" data-elevation="sm">
                <div data-ui="stack" data-direction="col" data-gap="2" data-align="start">
                  <span data-ui="badge" data-variant="solid" data-tone="info">{step.badge}</span>
                  <p data-ui="text" data-variant="body" data-tone="primary">{step.title}</p>
                  <p data-ui="text" data-variant="caption" data-tone="muted">{step.surfaces}</p>
                  <button
                    type="button"
                    data-ui="button"
                    data-variant="secondary"
                    data-size="sm"
                    disabled={!activeTitleCardId}
                    onClick={() => onEnterStage(step.stage)}
                  >
                    进入 {step.title}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
