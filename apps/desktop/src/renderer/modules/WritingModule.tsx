import type { PaperLiteratureItem } from '../literature/shared/types';

type WritingModuleProps = {
  paperLiteratureItems: PaperLiteratureItem[];
};

export function WritingModule({ paperLiteratureItems }: WritingModuleProps) {
  return (
    <section className="module-dashboard writing-literature-workspace">
      <p data-ui="text" data-variant="h3" data-tone="primary">写作中心引用视图（只读）</p>
      <p data-ui="text" data-variant="caption" data-tone="muted">
        当前为 M0 单向联动：引用状态由论文管理维护，写作中心仅消费展示。
      </p>
      <div className="writing-citation-list">
        {paperLiteratureItems.length === 0 ? (
          <p data-ui="text" data-variant="caption" data-tone="muted">暂无可用引用。</p>
        ) : (
          paperLiteratureItems.map((item) => (
            <div key={item.link_id} className="writing-citation-item">
              <p data-ui="text" data-variant="body" data-tone="primary">{item.title}</p>
              <p data-ui="text" data-variant="caption" data-tone="muted">
                status: {item.citation_status} · doi: {item.doi ?? '--'} · arxiv: {item.arxiv_id ?? '--'}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
