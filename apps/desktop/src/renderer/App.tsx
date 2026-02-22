import { useEffect, useState } from 'react';
import logoHorizontal from './assets/morethan-logo-horizontal.png';
import logoIcon from './assets/morethan-icon.png';

type DesktopMeta = {
  appName: string;
  appVersion: string;
  platform: string;
};

const moduleItems = ['文献管理', '选题管理', '论文管理', '理论框架与研究设计', '实验设计', '模型与训练', '数据分析与讨论', '写作与投稿'];

export function App() {
  const [meta, setMeta] = useState<DesktopMeta | null>(null);

  useEffect(() => {
    let mounted = true;
    void window.desktopApi.getAppMeta().then((next) => {
      if (mounted) setMeta(next);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div data-ui="page" data-density="comfortable" className="desktop-shell">
      <header data-ui="card" data-variant="default" data-elevation="sm" data-padding="md">
        <div data-ui="toolbar" data-align="between" data-wrap="nowrap">
          <div data-ui="stack" data-direction="row" data-align="center" data-gap="3" className="brand-block">
            <img src={logoIcon} alt="morethan icon" className="brand-icon" />
            <img src={logoHorizontal} alt="morethan" className="brand-wordmark" />
          </div>
          <div data-ui="stack" data-direction="row" data-gap="2" data-align="center">
            <span data-ui="badge" data-variant="subtle" data-tone="neutral">LLM Workflow</span>
            <button data-ui="button" data-variant="primary" data-size="sm" type="button">新建研究批次</button>
          </div>
        </div>
      </header>

      <div className="shell-main">
        <aside data-ui="card" data-variant="outlined" data-elevation="none" data-padding="md" className="sidebar-pane">
          <div data-ui="stack" data-direction="col" data-gap="3">
            <p data-ui="text" data-variant="label" data-tone="secondary">模块导航</p>
            <div data-ui="list" data-variant="rows" data-density="comfortable">
              {moduleItems.map((item, idx) => (
                <button key={item} data-ui="button" data-variant={idx === 0 ? 'primary' : 'secondary'} data-size="sm" type="button">
                  {item}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main data-ui="card" data-variant="default" data-elevation="sm" data-padding="lg" className="workspace-pane">
          <section data-ui="section" data-padding="none">
            <p data-ui="text" data-variant="h2" data-tone="primary">Research Control Center</p>
            <p data-ui="text" data-variant="body" data-tone="secondary">
              该桌面壳层用于串联文献、选题、版本治理与写作交付的全链路操作。
            </p>
          </section>

          <section data-ui="grid" data-cols="2" data-gap="4" className="metrics-grid">
            <article data-ui="card" data-variant="outlined" data-elevation="none" data-padding="md">
              <p data-ui="text" data-variant="label" data-tone="muted">活跃论文主线</p>
              <p data-ui="text" data-variant="h2" data-tone="primary">12</p>
            </article>
            <article data-ui="card" data-variant="outlined" data-elevation="none" data-padding="md">
              <p data-ui="text" data-variant="label" data-tone="muted">待评估候选节点</p>
              <p data-ui="text" data-variant="h2" data-tone="primary">37</p>
            </article>
          </section>

          <section data-ui="empty-state">
            <p data-slot="title" data-ui="text" data-variant="h3" data-tone="primary">工作区内容将按模块动态加载</p>
            <p data-slot="body" data-ui="text" data-variant="body" data-tone="muted">
              当前阶段先完成桌面框架与品牌主题接入，后续按任务包逐步填充具体模块页面。
            </p>
            <button data-ui="button" data-variant="secondary" data-size="md" type="button">查看任务包</button>
          </section>
        </main>
      </div>

      <footer data-ui="toolbar" data-align="between" data-wrap="nowrap" className="status-bar">
        <p data-ui="text" data-variant="caption" data-tone="muted">
          {meta ? `${meta.appName} v${meta.appVersion} · ${meta.platform}` : 'loading desktop metadata...'}
        </p>
        <p data-ui="text" data-variant="caption" data-tone="muted">theme: morethan.light</p>
      </footer>
    </div>
  );
}
