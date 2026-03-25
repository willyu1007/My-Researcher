import { TitleCardOverviewView } from './title-card-management/TitleCardOverviewView';
import { TitleCardWorkflowView } from './title-card-management/TitleCardWorkflowView';
import type { TitleCardManagementModuleProps } from './title-card-management/types';
import { useTitleCardManagementController } from './title-card-management/useTitleCardManagementController';

export function TitleCardManagementModule({
  activePrimaryTab,
  activeSecondaryTab,
  onSelectPrimaryTab,
  onSelectSecondaryTab,
}: TitleCardManagementModuleProps) {
  const controller = useTitleCardManagementController();

  return (
    <section className="module-dashboard">
      <div data-ui="stack" data-direction="col" data-gap="3">
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <div data-ui="stack" data-direction="col" data-gap="1">
            <p data-ui="text" data-variant="h3" data-tone="primary">选题题目工作台</p>
            <p data-ui="text" data-variant="caption" data-tone="muted">
              语义已切到：检索主题仅做上游拉取，题目卡才是选题流程根对象。
            </p>
          </div>
          <button
            data-ui="button"
            data-variant="secondary"
            data-size="sm"
            type="button"
            onClick={() => void controller.reloadWorkbench()}
          >
            刷新
          </button>
        </div>

        {controller.error ? <p data-ui="text" data-variant="caption" data-tone="danger">{controller.error}</p> : null}
        {controller.message ? <p data-ui="text" data-variant="caption" data-tone="muted">{controller.message}</p> : null}
        {controller.loading ? (
          <p data-ui="text" data-variant="caption" data-tone="muted">正在加载题目卡列表...</p>
        ) : null}

        {activePrimaryTab === 'overview' ? (
          <TitleCardOverviewView
            controller={controller}
            onSelectSecondaryTab={onSelectSecondaryTab}
          />
        ) : controller.titleCardDetail ? (
          <TitleCardWorkflowView
            controller={controller}
            activePrimaryTab={activePrimaryTab}
            activeSecondaryTab={activeSecondaryTab}
            onSelectSecondaryTab={onSelectSecondaryTab}
          />
        ) : (
          <article data-ui="card">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <p data-ui="text" data-variant="label" data-tone="primary">请先选择题目卡</p>
              <p data-ui="text" data-variant="caption" data-tone="muted">
                当前 workflow 节点需要一个活动题目卡。请先回到“总揽”创建或选择题目卡。
              </p>
              <button data-ui="button" data-variant="secondary" type="button" onClick={() => onSelectPrimaryTab('overview')}>
                回到总揽
              </button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
