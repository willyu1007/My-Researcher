import { useTitleCardList } from '../../modules/topic-workbench/hooks/useTitleCardList';

type SidebarTitleCardSelectorProps = {
  enabled: boolean;
  titleCardId: string | null;
  onTitleCardIdChange: (id: string | null) => void;
  refreshToken: number;
};

/**
 * Title-card selector mounted in the Sidebar when the user is in 选题管理.
 *
 * D5: active title-card lives in App.tsx (parity with paper_id); this
 * component is a thin presentation layer that hydrates the dropdown options
 * via `useTitleCardList(refreshToken, enabled)` and surfaces selection.
 */
export function SidebarTitleCardSelector({
  enabled,
  titleCardId,
  onTitleCardIdChange,
  refreshToken,
}: SidebarTitleCardSelectorProps) {
  const { items, loading, error, reload } = useTitleCardList(refreshToken, enabled);

  if (!enabled) {
    return null;
  }

  return (
    <section data-ui="section" data-padding="sm" aria-label="当前题目卡">
      <div data-ui="stack" data-direction="col" data-gap="1">
        <div data-ui="toolbar" data-align="between">
          <p data-ui="text" data-variant="label" data-tone="muted">当前题目卡</p>
          <button
            type="button"
            data-ui="icon-button"
            data-variant="ghost"
            data-size="sm"
            aria-label="刷新题目卡列表"
            title="刷新"
            onClick={() => void reload()}
          >
            ↻
          </button>
        </div>
        <select
          data-ui="select"
          data-size="sm"
          value={titleCardId ?? ''}
          onChange={(event) => {
            const next = event.target.value;
            onTitleCardIdChange(next.length === 0 ? null : next);
          }}
          disabled={loading && items.length === 0}
        >
          <option value="">{loading ? '加载中…' : '选择题目卡'}</option>
          {items.map((item) => (
            <option key={item.title_card_id} value={item.title_card_id}>
              {item.working_title || item.title_card_id}
              {item.research_rejection ? '（研究已拒绝）' : ''}
            </option>
          ))}
        </select>
        {error ? <p data-ui="text" data-variant="caption" data-tone="danger">{error}</p> : null}
        {!loading && items.length === 0 && !error ? (
          <p data-ui="text" data-variant="caption" data-tone="muted">暂无题目卡，请创建一张。</p>
        ) : null}
      </div>
    </section>
  );
}
