import type { TitleCardPrimaryTabKey } from '../../literature/shared/types';
import type { TitleCardManagementController } from './types';

type TitleCardOverviewViewProps = {
  controller: TitleCardManagementController;
  onSelectSecondaryTab: (tab: Exclude<TitleCardPrimaryTabKey, 'overview'>, subTab: string) => void;
};

export function TitleCardOverviewView({
  controller,
  onSelectSecondaryTab,
}: TitleCardOverviewViewProps) {
  const {
    listSummary,
    createTitle,
    createBrief,
    titleCards,
    activeTitleCardId,
    titleCardDetail,
    workflowQuickLinks,
    setCreateTitle,
    setCreateBrief,
    setActiveTitleCardId,
    createTitleCard,
  } = controller;

  return (
    <div data-ui="stack" data-direction="col" data-gap="3">
      <div data-ui="grid" data-cols="4" data-gap="3">
        <article data-ui="card">
          <p data-ui="text" data-variant="label" data-tone="muted">题目卡总数</p>
          <p data-ui="text" data-variant="h3" data-tone="primary">{listSummary?.total_title_cards ?? 0}</p>
        </article>
        <article data-ui="card">
          <p data-ui="text" data-variant="label" data-tone="muted">活跃题目卡</p>
          <p data-ui="text" data-variant="h3" data-tone="primary">{listSummary?.active_title_cards ?? 0}</p>
        </article>
        <article data-ui="card">
          <p data-ui="text" data-variant="label" data-tone="muted">待晋升题目</p>
          <p data-ui="text" data-variant="h3" data-tone="primary">{listSummary?.pending_promotion_cards ?? 0}</p>
        </article>
        <article data-ui="card">
          <p data-ui="text" data-variant="label" data-tone="muted">证据篮子总量</p>
          <p data-ui="text" data-variant="h3" data-tone="primary">{listSummary?.total_evidence_items ?? 0}</p>
        </article>
      </div>

      <div data-ui="grid" data-cols="2" data-gap="3">
        <article data-ui="card">
          <div data-ui="stack" data-direction="col" data-gap="2">
            <p data-ui="text" data-variant="label" data-tone="primary">新建题目卡</p>
            <input
              data-ui="input"
              value={createTitle}
              onChange={(event) => setCreateTitle(event.target.value)}
              placeholder="工作题目"
            />
            <textarea
              data-ui="textarea"
              value={createBrief}
              onChange={(event) => setCreateBrief(event.target.value)}
              placeholder="简述"
              rows={4}
            />
            <button data-ui="button" data-variant="primary" type="button" onClick={() => void createTitleCard()}>
              创建题目卡
            </button>
          </div>
        </article>

        <article data-ui="card">
          <div data-ui="stack" data-direction="col" data-gap="2">
            <p data-ui="text" data-variant="label" data-tone="primary">题目卡列表</p>
            {titleCards.length === 0 ? (
              <p data-ui="text" data-variant="caption" data-tone="muted">当前还没有题目卡。</p>
            ) : (
              titleCards.map((card) => (
                <button
                  key={card.title_card_id}
                  data-ui="button"
                  data-variant={activeTitleCardId === card.title_card_id ? 'primary' : 'secondary'}
                  type="button"
                  onClick={() => setActiveTitleCardId(card.title_card_id)}
                >
                  {card.working_title}
                </button>
              ))
            )}
          </div>
        </article>
      </div>

      {titleCardDetail ? (
        <article data-ui="card">
          <div data-ui="stack" data-direction="col" data-gap="3">
            <div data-ui="toolbar" data-align="between" data-wrap="wrap">
              <div data-ui="stack" data-direction="col" data-gap="1">
                <p data-ui="text" data-variant="h3" data-tone="primary">{titleCardDetail.working_title}</p>
                <p data-ui="text" data-variant="body" data-tone="muted">{titleCardDetail.brief}</p>
              </div>
              <div data-ui="stack" data-direction="row" data-gap="2" data-wrap="wrap" data-align="center">
                <span data-ui="badge" data-variant="subtle" data-tone="neutral">状态：{titleCardDetail.status}</span>
                {titleCardDetail.latest_paper_id ? (
                  <span data-ui="badge" data-variant="subtle" data-tone="neutral">Paper: {titleCardDetail.latest_paper_id}</span>
                ) : null}
              </div>
            </div>
            <div data-ui="grid" data-cols="3" data-gap="2">
              <article data-ui="card">
                <p data-ui="text" data-variant="label" data-tone="muted">Evidence</p>
                <p data-ui="text" data-variant="h3" data-tone="primary">{titleCardDetail.evidence_count}</p>
              </article>
              <article data-ui="card">
                <p data-ui="text" data-variant="label" data-tone="muted">Need</p>
                <p data-ui="text" data-variant="h3" data-tone="primary">{titleCardDetail.need_count}</p>
              </article>
              <article data-ui="card">
                <p data-ui="text" data-variant="label" data-tone="muted">Research Question</p>
                <p data-ui="text" data-variant="h3" data-tone="primary">{titleCardDetail.research_question_count}</p>
              </article>
              <article data-ui="card">
                <p data-ui="text" data-variant="label" data-tone="muted">Value</p>
                <p data-ui="text" data-variant="h3" data-tone="primary">{titleCardDetail.value_assessment_count}</p>
              </article>
              <article data-ui="card">
                <p data-ui="text" data-variant="label" data-tone="muted">Package</p>
                <p data-ui="text" data-variant="h3" data-tone="primary">{titleCardDetail.package_count}</p>
              </article>
              <article data-ui="card">
                <p data-ui="text" data-variant="label" data-tone="muted">Promotion</p>
                <p data-ui="text" data-variant="h3" data-tone="primary">{titleCardDetail.promotion_decision_count}</p>
              </article>
            </div>
            <div data-ui="toolbar" data-wrap="wrap">
              {workflowQuickLinks.map((item) => (
                <button
                  key={item.label}
                  data-ui="button"
                  data-variant="secondary"
                  type="button"
                  onClick={() => onSelectSecondaryTab(item.tab as Exclude<TitleCardPrimaryTabKey, 'overview'>, item.subTab)}
                >
                  进入 {item.label}
                </button>
              ))}
            </div>
          </div>
        </article>
      ) : null}
    </div>
  );
}
