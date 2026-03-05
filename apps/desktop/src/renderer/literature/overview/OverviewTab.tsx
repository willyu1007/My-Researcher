import type { RefObject } from 'react';
import type {
  LiteratureOverviewItem,
  MetadataIntakeOpenContext,
  MetadataIntakeTabKey,
  OverviewScopeFilterInput,
  PipelineStageCode,
  QuerySortPreset,
  ScopeStatus,
} from '../shared/types';
import {
  formatLiteratureOverviewStatus,
  formatOverviewContentStatus,
  getLiteratureImportanceScore,
  parseCitationCountFromTags,
  resolveLiteratureOverviewStatus,
  resolveOverviewContentStatus,
  resolveOverviewPublicationLabel,
} from './overviewStatus';

function resolveOverviewStatusClassName(status: LiteratureOverviewItem['overview_status']): string {
  return `literature-overview-status-text is-${status}`;
}

function resolveOverviewContentClassName(contentStatus: 'not_ready' | 'abstract_ready' | 'key_content_ready'): string {
  return `literature-overview-content-text is-${contentStatus}`;
}

type OverviewPanelState = {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error';
  error: string | null;
};

type OverviewSummaryStats = {
  totalCount: number;
  latestUpdatedLabel: string;
  automationReadyCount: number;
  citableCount: number;
  excludedCount: number;
};

type OverviewTabProps = {
  activeLiteratureTab: 'auto-import' | 'manual-import' | 'overview';
  overviewKeywordInput: string;
  onOverviewKeywordInputChange: (value: string) => void;
  overviewYearStartInput: string;
  onOverviewYearStartInputChange: (value: string) => void;
  overviewYearEndInput: string;
  onOverviewYearEndInputChange: (value: string) => void;
  overviewTagPickerOpen: boolean;
  onOverviewTagPickerOpenChange: (open: boolean | ((current: boolean) => boolean)) => void;
  overviewTagPickerRef: RefObject<HTMLDivElement>;
  overviewTagSelectionLabel: string;
  onSelectAllOverviewTags: () => void;
  onClearOverviewTagSelection: () => void;
  overviewTagOptions: string[];
  overviewTagKeywordsInput: string[];
  onToggleOverviewTagKeyword: (tag: string) => void;
  overviewScopeFilterInput: OverviewScopeFilterInput;
  onOverviewScopeFilterInputChange: (value: OverviewScopeFilterInput) => void;
  querySortPresetInput: QuerySortPreset;
  onQuerySortPresetInputChange: (value: QuerySortPreset) => void;
  querySortPresetOptions: Array<{ value: QuerySortPreset; label: string }>;
  onResetLightweightFilters: () => void;
  onApplyLiteratureFilters: () => void;
  topicScopeLoading: boolean;
  topicScopeError: string | null;
  overviewPanel: OverviewPanelState;
  overviewResultItems: LiteratureOverviewItem[];
  overviewPageItems: LiteratureOverviewItem[];
  onScopeStatusChange: (literatureId: string, scopeStatus: ScopeStatus) => Promise<void>;
  onRunOverviewContentAction: (
    literatureId: string,
    stages: PipelineStageCode[],
    actionLabel: string,
  ) => Promise<void>;
  onOpenMetadataIntake: (literatureId: string, tab?: MetadataIntakeTabKey, context?: MetadataIntakeOpenContext) => void;
  overviewSummaryStats: OverviewSummaryStats;
  overviewPageIndex: number;
  overviewTotalPages: number;
  onOverviewPageIndexChange: (updater: (current: number) => number) => void;
};

export function OverviewTab({
  activeLiteratureTab,
  overviewKeywordInput,
  onOverviewKeywordInputChange,
  overviewYearStartInput,
  onOverviewYearStartInputChange,
  overviewYearEndInput,
  onOverviewYearEndInputChange,
  overviewTagPickerOpen,
  onOverviewTagPickerOpenChange,
  overviewTagPickerRef,
  overviewTagSelectionLabel,
  onSelectAllOverviewTags,
  onClearOverviewTagSelection,
  overviewTagOptions,
  overviewTagKeywordsInput,
  onToggleOverviewTagKeyword,
  overviewScopeFilterInput,
  onOverviewScopeFilterInputChange,
  querySortPresetInput,
  onQuerySortPresetInputChange,
  querySortPresetOptions,
  onResetLightweightFilters,
  onApplyLiteratureFilters,
  topicScopeLoading,
  topicScopeError,
  overviewPanel,
  overviewResultItems,
  overviewPageItems,
  onScopeStatusChange,
  onRunOverviewContentAction,
  onOpenMetadataIntake,
  overviewSummaryStats,
  overviewPageIndex,
  overviewTotalPages,
  onOverviewPageIndexChange,
}: OverviewTabProps) {
  return activeLiteratureTab === 'overview' ? (
    <section className="literature-overview-panel">
      <section className="literature-query-builder">
        <div className="literature-quick-filters">
          <div className="literature-quick-row">
            <label data-ui="field" className="literature-filter-keyword">
              <input
                data-ui="input"
                data-size="sm"
                aria-label="关键词搜索"
                value={overviewKeywordInput}
                onChange={(event) => onOverviewKeywordInputChange(event.target.value)}
                placeholder="关键词搜索"
              />
            </label>
            <label data-ui="field" className="literature-filter-year">
              <div className="literature-year-range">
                <input
                  data-ui="input"
                  data-size="sm"
                  aria-label="发表年份起始"
                  value={overviewYearStartInput}
                  onChange={(event) => onOverviewYearStartInputChange(event.target.value)}
                  placeholder="1900"
                  inputMode="numeric"
                />
                <span data-ui="text" data-variant="caption" data-tone="muted">-</span>
                <input
                  data-ui="input"
                  data-size="sm"
                  aria-label="发表年份结束"
                  value={overviewYearEndInput}
                  onChange={(event) => onOverviewYearEndInputChange(event.target.value)}
                  placeholder="2100"
                  inputMode="numeric"
                />
              </div>
            </label>
            <div data-ui="field" className="literature-filter-tag">
              <div
                className={`literature-tag-picker${overviewTagPickerOpen ? ' is-open' : ''}`}
                ref={overviewTagPickerRef}
              >
                <button
                  type="button"
                  className="literature-tag-picker-trigger"
                  aria-label="标签多选筛选"
                  aria-expanded={overviewTagPickerOpen}
                  onClick={() => onOverviewTagPickerOpenChange((current) => !current)}
                >
                  <span>{overviewTagSelectionLabel}</span>
                  <span aria-hidden="true">▾</span>
                </button>
                {overviewTagPickerOpen ? (
                  <div className="literature-tag-picker-panel">
                    <div className="literature-tag-picker-actions">
                      <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={onSelectAllOverviewTags}>
                        全选
                      </button>
                      <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={onClearOverviewTagSelection}>
                        清空
                      </button>
                    </div>
                    <div className="literature-tag-picker-list">
                      {overviewTagOptions.length === 0 ? (
                        <span data-ui="text" data-variant="caption" data-tone="muted">暂无标签</span>
                      ) : (
                        overviewTagOptions.map((tag) => (
                          <label key={tag} className="literature-tag-picker-item">
                            <input
                              type="checkbox"
                              checked={overviewTagKeywordsInput.includes(tag)}
                              onChange={() => onToggleOverviewTagKeyword(tag)}
                            />
                            <span>{tag}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <label data-ui="field" className="literature-filter-scope">
              <select
                data-ui="select"
                data-size="sm"
                aria-label="状态筛选"
                value={overviewScopeFilterInput}
                onChange={(event) => onOverviewScopeFilterInputChange(event.target.value as OverviewScopeFilterInput)}
              >
                <option value="all">全部状态</option>
                <option value="automation_ready">自动化就绪</option>
                <option value="citable">可被引用</option>
                <option value="not_citable">不可引用</option>
                <option value="excluded">已排除</option>
              </select>
            </label>
            <label data-ui="field" className="literature-filter-sort">
              <div className="literature-sort-control">
                <select
                  data-ui="select"
                  data-size="sm"
                  aria-label="排序规则与方向"
                  value={querySortPresetInput}
                  onChange={(event) => onQuerySortPresetInputChange(event.target.value as QuerySortPreset)}
                >
                  {querySortPresetOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <div className="literature-filter-actions">
              <button data-ui="button" data-variant="ghost" data-size="sm" type="button" className="literature-filter-action" onClick={onResetLightweightFilters}>
                重置
              </button>
              <button data-ui="button" data-variant="primary" data-size="sm" type="button" className="literature-filter-action" onClick={onApplyLiteratureFilters}>
                应用
              </button>
            </div>
          </div>
        </div>
      </section>

      {topicScopeLoading ? <p data-ui="text" data-variant="caption" data-tone="muted">正在同步选题范围状态...</p> : null}
      {topicScopeError ? <p data-ui="text" data-variant="caption" data-tone="danger">{topicScopeError}</p> : null}
      {overviewPanel.status === 'loading' ? (
        <p data-ui="text" data-variant="caption" data-tone="muted">正在加载综览...</p>
      ) : null}
      {overviewPanel.status === 'error' ? (
        <p data-ui="text" data-variant="caption" data-tone="danger">{overviewPanel.error ?? '综览加载失败。'}</p>
      ) : null}

      <section className="literature-overview-table-wrap">
        <table className="literature-overview-table">
          <thead>
            <tr>
              <th className="overview-col-title">标题</th>
              <th className="overview-col-importance">重要程度 / 来源链接</th>
              <th className="overview-col-publication">发表 / 引用量</th>
              <th className="overview-col-authors">作者 / 年份</th>
              <th className="overview-col-status">状态 / 内容</th>
              <th className="overview-col-tags">标签</th>
              <th className="overview-col-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            {overviewResultItems.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <p data-ui="text" data-variant="caption" data-tone="muted" className="literature-overview-table-empty">
                    暂无可展示文献，请先导入或调整筛选。
                  </p>
                </td>
              </tr>
            ) : (
              overviewPageItems.map((item) => {
                const overviewStatus = resolveLiteratureOverviewStatus(item);
                const contentStatus = resolveOverviewContentStatus(item);
                const citationCount = parseCitationCountFromTags(item.tags);
                const importanceScore = Math.max(0, Math.round(getLiteratureImportanceScore(item)));
                const visibleTags = item.tags.slice(0, 4);
                const tagSlots = item.tags.length > 4
                  ? [...visibleTags.slice(0, 3), '...']
                  : visibleTags;
                const extractAbstractAction = item.pipeline_actions.extract_abstract;
                const preprocessAction = item.pipeline_actions.preprocess_fulltext;
                const vectorizeAction = item.pipeline_actions.vectorize;
                const isExcluded = overviewStatus === 'excluded';
                const scopeActionLabel = isExcluded ? '恢复' : '排除';
                const nextScopeStatus: ScopeStatus = isExcluded ? 'in_scope' : 'excluded';

                return (
                  <tr key={item.literature_id}>
                    <td>
                      <div className="literature-overview-main">
                        <p data-ui="text" data-variant="body" data-tone="primary">{item.title}</p>
                      </div>
                    </td>
                    <td>
                      <div className="literature-overview-main">
                        <p data-ui="text" data-variant="caption" data-tone="muted">
                          重要程度：{importanceScore}
                        </p>
                        {item.source_url ? (
                          <a className="literature-source-link" href={item.source_url} target="_blank" rel="noreferrer">
                            来源链接
                          </a>
                        ) : (
                          <p data-ui="text" data-variant="caption" data-tone="muted">来源链接：--</p>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="literature-overview-main">
                        <p data-ui="text" data-variant="caption" data-tone="muted">
                          发表情况：{resolveOverviewPublicationLabel(item)}
                        </p>
                        <p data-ui="text" data-variant="caption" data-tone="muted">
                          引用数量：{citationCount !== null ? citationCount : '--'}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div className="literature-overview-main">
                        <p data-ui="text" data-variant="caption" data-tone="muted">
                          {item.authors.join(', ') || '--'}
                        </p>
                        <p data-ui="text" data-variant="caption" data-tone="muted">
                          年份：{item.year ?? '--'}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div className="literature-overview-main">
                        <p
                          data-ui="text"
                          data-variant="caption"
                          data-tone="primary"
                          className={resolveOverviewStatusClassName(overviewStatus)}
                        >
                          {formatLiteratureOverviewStatus(overviewStatus)}
                        </p>
                        <p
                          data-ui="text"
                          data-variant="caption"
                          data-tone="muted"
                          className={resolveOverviewContentClassName(contentStatus)}
                        >
                          {formatOverviewContentStatus(contentStatus)}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div className="literature-overview-tag-list">
                        {item.tags.length === 0 ? (
                          <span data-ui="text" data-variant="caption" data-tone="muted">--</span>
                        ) : (
                          tagSlots.map((tag, index) => (
                            <span key={`${item.literature_id}-${tag}-${index}`} className="literature-overview-tag-text">
                              {tag}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="literature-overview-actions">
                        <div className="literature-overview-action-row">
                          <button
                            type="button"
                            className={`literature-overview-action-link ${isExcluded ? 'is-success' : 'is-danger'}`}
                            onClick={() => void onScopeStatusChange(item.literature_id, nextScopeStatus)}
                          >
                            {scopeActionLabel}
                          </button>
                          <button
                            type="button"
                            className="literature-overview-action-link"
                            onClick={() => onOpenMetadataIntake(item.literature_id, 'abstract', {
                              source_url: item.source_url,
                              doi: item.doi,
                              arxiv_id: item.arxiv_id,
                            })}
                          >
                            录入内容
                          </button>
                        </div>
                        <div className="literature-overview-action-row">
                          <button
                            type="button"
                            className="literature-overview-action-link"
                            disabled={!extractAbstractAction.enabled}
                            title={extractAbstractAction.reason_message ?? undefined}
                            onClick={() => {
                              onOpenMetadataIntake(item.literature_id, 'abstract', {
                                source_url: item.source_url,
                                doi: item.doi,
                                arxiv_id: item.arxiv_id,
                              });
                              void onRunOverviewContentAction(
                                item.literature_id,
                                extractAbstractAction.requested_stages,
                                '提取摘要',
                              );
                            }}
                          >
                            提取摘要
                          </button>
                          <button
                            type="button"
                            className="literature-overview-action-link"
                            disabled={!preprocessAction.enabled}
                            title={preprocessAction.reason_message ?? undefined}
                            onClick={() => {
                              onOpenMetadataIntake(item.literature_id, 'key-content', {
                                source_url: item.source_url,
                                doi: item.doi,
                                arxiv_id: item.arxiv_id,
                              });
                              void onRunOverviewContentAction(
                                item.literature_id,
                                preprocessAction.requested_stages,
                                '预处理全文',
                              );
                            }}
                          >
                            预处理
                          </button>
                          <button
                            type="button"
                            className="literature-overview-action-link"
                            disabled={!vectorizeAction.enabled}
                            title={vectorizeAction.reason_message ?? undefined}
                            onClick={() => {
                              onOpenMetadataIntake(item.literature_id, 'vectorize', {
                                source_url: item.source_url,
                                doi: item.doi,
                                arxiv_id: item.arxiv_id,
                              });
                              void onRunOverviewContentAction(
                                item.literature_id,
                                vectorizeAction.requested_stages,
                                '向量化',
                              );
                            }}
                          >
                            向量化
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="literature-overview-table-summary-row">
              <td colSpan={7}>
                <div className="literature-overview-table-summary-row-wrap">
                  <div className="literature-overview-table-summary">
                    <span data-ui="text" data-variant="caption" data-tone="muted">
                      总文献 <strong>{overviewSummaryStats.totalCount}</strong>
                    </span>
                    <span data-ui="text" data-variant="caption" data-tone="muted">
                      最近更新 <strong>{overviewSummaryStats.latestUpdatedLabel}</strong>
                    </span>
                    <span data-ui="text" data-variant="caption" data-tone="muted">
                      自动化就绪文献 <strong>{overviewSummaryStats.automationReadyCount}</strong>
                    </span>
                    <span data-ui="text" data-variant="caption" data-tone="muted">
                      可被引用文献 <strong>{overviewSummaryStats.citableCount}</strong>
                    </span>
                    <span data-ui="text" data-variant="caption" data-tone="muted">
                      已排除文献 <strong>{overviewSummaryStats.excludedCount}</strong>
                    </span>
                  </div>
                  <div className="literature-overview-pagination">
                    <button
                      data-ui="button"
                      data-variant="ghost"
                      data-size="sm"
                      type="button"
                      onClick={() => onOverviewPageIndexChange((current) => Math.max(1, current - 1))}
                      disabled={overviewPageIndex <= 1}
                    >
                      上一页
                    </button>
                    <span data-ui="text" data-variant="caption" data-tone="muted">
                      第 <strong>{overviewPageIndex}</strong> / {overviewTotalPages} 页
                    </span>
                    <button
                      data-ui="button"
                      data-variant="ghost"
                      data-size="sm"
                      type="button"
                      onClick={() => onOverviewPageIndexChange((current) => Math.min(overviewTotalPages, current + 1))}
                      disabled={overviewPageIndex >= overviewTotalPages}
                    >
                      下一页
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </section>
    </section>
  ) : null;
}
