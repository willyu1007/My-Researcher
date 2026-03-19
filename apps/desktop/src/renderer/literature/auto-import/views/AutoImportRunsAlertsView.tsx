import type {
  AutoImportControllerOutput,
  AutoImportRunsProps,
} from '../types';
import type { AutoImportRecordReader } from '../types';
import type { AutoPullRunStatus } from '../../shared/types';

type AutoImportRunsAlertsViewProps = {
  visible: boolean;
  controller: AutoImportControllerOutput;
  runs: AutoImportRunsProps;
  asRecord: AutoImportRecordReader;
};

export function AutoImportRunsAlertsView({
  asRecord,
  controller,
  runs,
  visible,
}: AutoImportRunsAlertsViewProps) {
  if (!visible) {
    return null;
  }

  const selectedRunDetail = runs.selectedRunDetail;

  return (
    <section className="literature-section-block">
      <div data-ui="toolbar" data-wrap="wrap" data-gap="2" className="literature-filter-toolbar">
        <label data-ui="field" className="literature-filter-year is-prefixed" aria-label="执行状态筛选">
          <select
            data-ui="select"
            data-size="sm"
            value={runs.runsFilterStatus}
            onChange={(event) => {
              runs.setRunsFilterStatus(event.target.value as '' | AutoPullRunStatus | 'EXCEPTION');
              runs.setRunsPageIndex(1);
            }}
          >
            <option value="">全部</option>
            <option value="EXCEPTION">异常（FAILED / PARTIAL）</option>
            <option value="PENDING">PENDING</option>
            <option value="RUNNING">RUNNING</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="SKIPPED">SKIPPED</option>
          </select>
        </label>
      </div>
      {runs.runsError ? <p data-ui="text" data-variant="caption" data-tone="danger">{runs.runsError}</p> : null}
      <div className="auto-pull-runs-layout">
        <section className="auto-pull-runs-pane auto-pull-runs-list-pane">
          <div className="literature-list auto-pull-runs-list">
            {runs.autoPullRuns.length === 0 ? (
              <p data-ui="text" data-variant="caption" data-tone="muted" className="auto-pull-runs-empty">
                暂无运行记录。
              </p>
            ) : (
              controller.runsPageItems.map((run) => (
                <div
                  key={run.run_id}
                  className={`literature-list-item auto-pull-run-item${selectedRunDetail?.run_id === run.run_id ? ' is-selected' : ''}`}
                >
                  <div>
                    <p data-ui="text" data-variant="body" data-tone="primary">
                      {run.run_id} · {run.status} · 录入：{String(run.summary.imported_count ?? 0)} · 失败：{String(run.summary.failed_count ?? 0)}
                    </p>
                  </div>
                  <div data-ui="toolbar" data-gap="2">
                    <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={() => void controller.loadAutoPullRunDetail(run.run_id)}>
                      详情
                    </button>
                    <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={() => void controller.handleRetryRun(run.run_id)}>
                      重试失败源
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {runs.autoPullRuns.length > 0 ? (
            <div className="auto-pull-runs-pagination">
              <button
                data-ui="button"
                data-variant="ghost"
                data-size="sm"
                type="button"
                onClick={() => runs.setRunsPageIndex((current) => Math.max(1, current - 1))}
                disabled={runs.runsPageIndex <= 1}
              >
                上一页
              </button>
              <span data-ui="text" data-variant="caption" data-tone="muted">
                第 <strong>{runs.runsPageIndex}</strong> / {controller.runsTotalPages} 页
              </span>
              <button
                data-ui="button"
                data-variant="ghost"
                data-size="sm"
                type="button"
                onClick={() => runs.setRunsPageIndex((current) => Math.min(controller.runsTotalPages, current + 1))}
                disabled={runs.runsPageIndex >= controller.runsTotalPages}
              >
                下一页
              </button>
            </div>
          ) : null}
        </section>

        <section className="auto-pull-runs-pane auto-pull-runs-detail-pane">
          {runs.runDetailLoading ? (
            <p data-ui="text" data-variant="caption" data-tone="muted">加载运行详情中...</p>
          ) : null}
          {runs.runDetailError ? (
            <p data-ui="text" data-variant="caption" data-tone="danger">{runs.runDetailError}</p>
          ) : null}
          {selectedRunDetail ? (
            <div className="auto-pull-run-detail">
              <p data-ui="text" data-variant="caption" data-tone="muted">
                运行详情：{selectedRunDetail.run_id} · {selectedRunDetail.status}
              </p>
              <div className="auto-pull-run-detail-meta">
                <p data-ui="text" data-variant="caption" data-tone="muted">
                  录入：{String(selectedRunDetail.summary.imported_count ?? 0)} · 失败：{String(selectedRunDetail.summary.failed_count ?? 0)}
                </p>
                <p data-ui="text" data-variant="caption" data-tone="muted">主题名称：{controller.selectedRunTopicLabel}</p>
                <p data-ui="text" data-variant="caption" data-tone="muted">拉取时间：{controller.selectedRunPulledAtLabel}</p>
                <p data-ui="text" data-variant="caption" data-tone="muted">持续时间：{controller.selectedRunDurationLabel}</p>
              </div>
              <div className="literature-list auto-pull-runs-detail-list">
                {(selectedRunDetail.source_attempts ?? []).map((attempt) => {
                  const meta = asRecord(attempt.meta) ?? {};
                  const incompleteRejectedCount =
                    typeof meta.incomplete_rejected_count === 'number' ? meta.incomplete_rejected_count : 0;
                  const duplicateSkippedCount =
                    typeof meta.duplicate_skipped_count === 'number' ? meta.duplicate_skipped_count : 0;
                  const belowThresholdCount =
                    typeof meta.below_threshold_count === 'number' ? meta.below_threshold_count : 0;
                  const eligibleCount =
                    typeof meta.eligible_count === 'number' ? meta.eligible_count : 0;
                  const importedNewCount =
                    typeof meta.imported_new_count === 'number' ? meta.imported_new_count : 0;
                  const importedExistingCount =
                    typeof meta.imported_existing_count === 'number' ? meta.imported_existing_count : 0;
                  const llmScoreAvg =
                    typeof meta.llm_score_avg === 'number' ? meta.llm_score_avg : null;

                  return (
                    <div key={`${selectedRunDetail.run_id}-${attempt.source}`} className="literature-list-item auto-pull-run-attempt-item">
                      <div>
                        <p data-ui="text" data-variant="body" data-tone="primary">
                          {attempt.source} · {attempt.status}
                        </p>
                        <p data-ui="text" data-variant="caption" data-tone="muted">
                          fetched:{attempt.fetched_count} / imported:{attempt.imported_count} / failed:{attempt.failed_count}
                        </p>
                        <p data-ui="text" data-variant="caption" data-tone="muted">
                          不完整:{incompleteRejectedCount} / 去重跳过:{duplicateSkippedCount} / 低于门槛:{belowThresholdCount} / 可导入:{eligibleCount}
                        </p>
                        <p data-ui="text" data-variant="caption" data-tone="muted">
                          新增:{importedNewCount} / 命中既有:{importedExistingCount}
                          {llmScoreAvg !== null ? ` / 平均质量分:${llmScoreAvg}` : ''}
                        </p>
                      </div>
                      {attempt.error_message ? (
                        <p data-ui="text" data-variant="caption" data-tone="danger">{attempt.error_message}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p data-ui="text" data-variant="caption" data-tone="muted" className="auto-pull-runs-empty">
              请选择一条 Run 查看详情。
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
