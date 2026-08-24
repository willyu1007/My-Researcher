import { useEffect } from 'react';
import { useTitleCardList } from './hooks/useTitleCardList';
import { OverviewView } from './views/OverviewView';
import { V1aStageView } from './views/V1aStageView';
import { V1bStageView } from './views/V1bStageView';
import { V1cStageView } from './views/V1cStageView';
import { QueuePanel } from './panels/QueuePanel';
import type { TopicWorkbenchModuleProps } from './types';

/**
 * T-087 Topic Workbench module — the sole "选题管理" surface after Phase 6
 * retired the legacy T-021 module.
 *
 * Composition:
 * - Overview view with stats + title-card list + 3-stage stepper
 * - V1aStageView / V1bStageView / V1cStageView for the v1a/v1b/v1c
 *   reviewer cards + inline interactive forms (Phases 2 – 4)
 * - QueuePanel (Phase 5) aggregating cross-stage human-review / recheck /
 *   blocker / accepted-risk queues for the active title-card
 *
 * See `docs/context/ui/topic-workbench.md` for the maintained interaction contract.
 */
export function TopicWorkbenchModule({
  titleCardId,
  onSetTitleCardId,
  refreshToken,
  activePrimaryTab,
  activeSecondaryTab,
  onSelectPrimaryTab,
  onSelectSecondaryTab,
}: TopicWorkbenchModuleProps) {
  const { items, summary, loading, error, reload } = useTitleCardList(refreshToken);

  // Auto-select first title-card once the list lands and there's no active card yet.
  useEffect(() => {
    if (titleCardId) {
      return;
    }
    const first = items[0]?.title_card_id;
    if (first) {
      onSetTitleCardId(first);
    }
  }, [items, titleCardId, onSetTitleCardId]);

  return (
    <section className="module-dashboard">
      <div data-ui="stack" data-direction="col" data-gap="3">
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <div data-ui="stack" data-direction="col" data-gap="1">
            <p data-ui="text" data-variant="h3" data-tone="primary">选题题目工作台 · v1a/b/c</p>
            <p data-ui="text" data-variant="caption" data-tone="muted">
              T-087 reviewer workbench：以题目卡为根对象，覆盖证据-需求 → 切片-题目-价值-方案 → 晋升桥三段决策链。
            </p>
          </div>
          <div data-ui="stack" data-direction="row" data-gap="2" data-align="center">
            {titleCardId ? (
              <span data-ui="badge" data-variant="subtle" data-tone="info">active: {titleCardId}</span>
            ) : (
              <span data-ui="badge" data-variant="subtle" data-tone="warning">未选题目卡</span>
            )}
            <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={() => void reload()}>
              刷新
            </button>
          </div>
        </div>

        {activePrimaryTab === 'overview' ? (
          <OverviewView
            items={items}
            summary={summary}
            loading={loading}
            error={error}
            activeTitleCardId={titleCardId}
            onSelectTitleCard={onSetTitleCardId}
            onEnterStage={(stage) => onSelectPrimaryTab(stage)}
            onReload={() => void reload()}
          />
        ) : activePrimaryTab === 'v1a' ? (
          <V1aStageView
            titleCard={items.find((item) => item.title_card_id === titleCardId) ?? null}
            titleCardId={titleCardId}
            subTab={activeSecondaryTab}
            refreshToken={refreshToken}
            onSelectSecondaryTab={onSelectSecondaryTab}
          />
        ) : activePrimaryTab === 'v1b' ? (
          <V1bStageView
            titleCardId={titleCardId}
            subTab={activeSecondaryTab}
            refreshToken={refreshToken}
            onSelectSecondaryTab={onSelectSecondaryTab}
          />
        ) : activePrimaryTab === 'v1c' ? (
          <V1cStageView
            titleCardId={titleCardId}
            subTab={activeSecondaryTab}
            refreshToken={refreshToken}
            onSelectSecondaryTab={onSelectSecondaryTab}
          />
        ) : (
          <article data-ui="card">
            <p data-ui="text" data-variant="caption" data-tone="muted">
              未识别的 tab key：{String(activePrimaryTab)}。请回到"总揽"。
            </p>
          </article>
        )}

        <QueuePanel
          titleCardId={titleCardId}
          refreshToken={refreshToken}
          onSelectSecondaryTab={onSelectSecondaryTab}
        />
      </div>
    </section>
  );
}
