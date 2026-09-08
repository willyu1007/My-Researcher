import { useState } from 'react';
import { titleCardTabs } from '../../../literature/shared/constants';
import type { TitleCardPrimaryTabKey } from '../../../literature/shared/types';
import { useWorkbenchQueues, type WorkbenchQueueItem } from '../hooks/useWorkbenchQueues';

type QueueKey = 'human-review' | 'recheck' | 'blocker' | 'accepted-risk';

type QueueDescriptor = {
  key: QueueKey;
  label: string;
  empty: string;
  items: (queues: ReturnType<typeof useWorkbenchQueues>['queues']) => WorkbenchQueueItem[];
};

const QUEUES: QueueDescriptor[] = [
  {
    key: 'human-review',
    label: '人审',
    empty: '当前没有等待 reviewer human-confirm 的项。',
    items: (queues) => queues.humanReview,
  },
  {
    key: 'recheck',
    label: 'Recheck',
    empty: '没有 open recheck 请求。',
    items: (queues) => queues.recheck,
  },
  {
    key: 'blocker',
    label: 'Blocker',
    empty: '当前没有 blocker / hard_blockers / 未解 challenge。',
    items: (queues) => queues.blocker,
  },
  {
    key: 'accepted-risk',
    label: 'AcceptedRisk',
    empty: '没有挂载 accepted risk。',
    items: (queues) => queues.acceptedRisk,
  },
];

type QueuePanelProps = {
  titleCardId: string | null;
  /** Bumped by sibling forms after a mutation so the queue reloads. */
  refreshToken: number;
  onSelectSecondaryTab: (
    tab: Exclude<TitleCardPrimaryTabKey, 'overview'>,
    subTab: string,
  ) => void;
};

const PREVIEW_LIMIT = 6;

/**
 * T-087 Phase 5 横切 — Reviewer queue panel (design-spec §4018).
 *
 * Aggregates 4 queue surfaces from v1a/v1b/v1c title-card-scoped data:
 *   - human-review · items waiting for a reviewer confirm action
 *   - recheck      · items with open recheck request refs
 *   - blocker      · items with blocker_refs / hard_blockers
 *   - accepted-risk· items carrying accepted_risk_refs
 *
 * Each item provides a single-click jump to the relevant stage sub-tab so
 * the reviewer can act without manual navigation.
 */
export function QueuePanel({
  titleCardId,
  refreshToken,
  onSelectSecondaryTab,
}: QueuePanelProps) {
  const { queues, loading, error, reload } = useWorkbenchQueues(titleCardId, refreshToken);
  const [activeQueue, setActiveQueue] = useState<QueueKey>('human-review');
  const active = QUEUES.find((queue) => queue.key === activeQueue) ?? QUEUES[0];
  const activeItems = active.items(queues);

  return (
    <article data-ui="card" data-padding="md">
      <div data-ui="stack" data-direction="col" data-gap="2">
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <p data-ui="text" data-variant="label" data-tone="primary">工作队列</p>
          <div data-ui="stack" data-direction="row" data-gap="1" data-align="center">
            {loading ? (
              <span data-ui="text" data-variant="caption" data-tone="muted">加载中…</span>
            ) : null}
            {error ? (
              <span data-ui="text" data-variant="caption" data-tone="danger">{error}</span>
            ) : null}
            <button
              type="button"
              data-ui="button"
              data-variant="ghost"
              data-size="sm"
              onClick={() => void reload()}
              disabled={loading}
            >
              刷新队列
            </button>
          </div>
        </div>

        <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap">
          {QUEUES.map((queue) => {
            const isActive = queue.key === active.key;
            const count = queue.items(queues).length;
            return isActive ? (
              <button
                key={queue.key}
                type="button"
                data-ui="button"
                data-variant="primary"
                data-size="sm"
                onClick={() => setActiveQueue(queue.key)}
              >
                <span data-ui="stack" data-direction="row" data-gap="1" data-align="center">
                  <span>{queue.label}</span>
                  <span data-ui="badge" data-variant="subtle" data-tone="neutral">{count}</span>
                </span>
              </button>
            ) : (
              <button
                key={queue.key}
                type="button"
                data-ui="button"
                data-variant="ghost"
                data-size="sm"
                onClick={() => setActiveQueue(queue.key)}
              >
                <span data-ui="stack" data-direction="row" data-gap="1" data-align="center">
                  <span>{queue.label}</span>
                  <span data-ui="badge" data-variant="subtle" data-tone="neutral">{count}</span>
                </span>
              </button>
            );
          })}
        </div>

        {!titleCardId ? (
          <p data-ui="text" data-variant="caption" data-tone="muted">
            选择题目卡后，可查看证据、研究问题与晋升审阅中待处理的事项。
          </p>
        ) : activeItems.length === 0 ? (
          <p data-ui="text" data-variant="caption" data-tone="muted">{active.empty}</p>
        ) : (
          <div data-ui="stack" data-direction="col" data-gap="1">
            {activeItems.slice(0, PREVIEW_LIMIT).map((item) => (
              <article key={item.id} data-ui="card" data-padding="sm" data-elevation="none">
                <div data-ui="toolbar" data-align="between" data-wrap="wrap">
                  <div data-ui="stack" data-direction="col" data-gap="0">
                    <p data-ui="text" data-variant="caption" data-tone="primary">{item.label}</p>
                    {item.caption ? (
                      <p data-ui="text" data-variant="caption" data-tone="muted">{item.caption}</p>
                    ) : null}
                  </div>
                  <div data-ui="stack" data-direction="row" data-gap="1" data-align="center">
                    <span data-ui="badge" data-variant="subtle" data-tone="info">{titleCardTabs.find((tab) => tab.key === item.stage)?.label}</span>
                    <button
                      type="button"
                      data-ui="button"
                      data-variant="secondary"
                      data-size="sm"
                      onClick={() => onSelectSecondaryTab(item.stage, item.subTab)}
                    >
                      跳转 {item.subTab}
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {activeItems.length > PREVIEW_LIMIT ? (
              <p data-ui="text" data-variant="caption" data-tone="muted">
                仅显示前 {PREVIEW_LIMIT}/{activeItems.length} 项；其余按 stage tab 内完整列表查看。
              </p>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}
