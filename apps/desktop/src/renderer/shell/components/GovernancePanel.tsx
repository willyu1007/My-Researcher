import type { FormEvent } from 'react';
import type { ReviewDecision } from '../../literature/shared/types';

type GovernancePanelProps = {
  visible: boolean;
  paperId: string;
  paperIdInput: string;
  onPaperIdInputChange: (value: string) => void;
  onApplyPaperId: () => void;
  onRefreshPanels: () => void;
  apiBaseUrl: string;
  onToggleGovernance: () => void;
  timelinePanel: any;
  metricsPanel: any;
  artifactPanel: any;
  onEvidenceTrace: (event: any) => void;
  formatTimestamp: (value: string) => string;
  tryGetSnapshotId: (summary: string) => string | null;
  formatNumber: (value: number | null) => string;
  formatCurrency: (value: number | null) => string;
  releaseQueue: any[];
  reviewersInput: string;
  onReviewersInputChange: (value: string) => void;
  decision: ReviewDecision;
  onDecisionChange: (value: ReviewDecision) => void;
  labelPolicy: string;
  onLabelPolicyChange: (value: string) => void;
  riskFlagsInput: string;
  onRiskFlagsInputChange: (value: string) => void;
  reviewComment: string;
  onReviewCommentChange: (value: string) => void;
  reviewSubmitState: 'idle' | 'submitting' | 'success' | 'error';
  reviewSubmitMessage: string;
  onSubmitReleaseReview: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function GovernancePanel({
  visible,
  paperId,
  paperIdInput,
  onPaperIdInputChange,
  onApplyPaperId,
  onRefreshPanels,
  apiBaseUrl,
  onToggleGovernance,
  timelinePanel,
  metricsPanel,
  artifactPanel,
  onEvidenceTrace,
  formatTimestamp,
  tryGetSnapshotId,
  formatNumber,
  formatCurrency,
  releaseQueue,
  reviewersInput,
  onReviewersInputChange,
  decision,
  onDecisionChange,
  labelPolicy,
  onLabelPolicyChange,
  riskFlagsInput,
  onRiskFlagsInputChange,
  reviewComment,
  onReviewCommentChange,
  reviewSubmitState,
  reviewSubmitMessage,
  onSubmitReleaseReview,
}: GovernancePanelProps) {
  if (!visible) {
    return null;
  }

  return (
    <section data-ui="stack" data-direction="col" data-gap="4" className="governance-zone">
      <article className="dashboard-toolbar governance-controls">
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <div data-ui="stack" data-direction="row" data-gap="3" data-align="end" data-wrap="wrap" className="governance-controls-left">
            <label data-ui="field" className="paper-id-field">
              <span data-slot="label">Paper ID</span>
              <input
                data-ui="input"
                data-size="sm"
                value={paperIdInput}
                onChange={(event) => onPaperIdInputChange(event.target.value)}
                placeholder="例如 P001"
              />
            </label>
            <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={onApplyPaperId}>
              加载项目
            </button>
            <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={onRefreshPanels}>
              刷新
            </button>
          </div>
          <div data-ui="stack" data-direction="row" data-gap="2" data-align="center" data-wrap="wrap">
            <span data-ui="badge" data-variant="subtle" data-tone="neutral">project: {paperId}</span>
            <span data-ui="badge" data-variant="subtle" data-tone="neutral">api: {apiBaseUrl}</span>
            <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={onToggleGovernance}>
              关闭面板
            </button>
          </div>
        </div>
      </article>

      <section data-ui="grid" data-cols="2" data-gap="4" className="governance-panels">
        <article className="dashboard-subpanel governance-panel">
          <div data-ui="stack" data-direction="col" data-gap="3">
            <p data-ui="text" data-variant="h3" data-tone="primary">Timeline</p>
            {timelinePanel.status === 'loading' && (
              <p data-ui="text" data-variant="body" data-tone="muted">正在加载 timeline...</p>
            )}
            {timelinePanel.status === 'error' && (
              <p data-ui="text" data-variant="body" data-tone="danger">{timelinePanel.error ?? 'timeline 加载失败。'}</p>
            )}
            {timelinePanel.status === 'empty' && (
              <p data-ui="text" data-variant="body" data-tone="muted">暂无 timeline 事件。</p>
            )}
            {(timelinePanel.status === 'ready' || timelinePanel.status === 'idle') && timelinePanel.data.length > 0 && (
              <div data-ui="list" data-variant="rows" data-density="comfortable" className="timeline-list">
                {timelinePanel.data.map((event: any) => {
                  const snapshotId = tryGetSnapshotId(event.summary);
                  return (
                    <div key={event.event_id} className="timeline-item">
                      <div data-ui="toolbar" data-align="between" data-wrap="wrap">
                        <p data-ui="text" data-variant="label" data-tone="secondary">{event.event_type}</p>
                        <p data-ui="text" data-variant="caption" data-tone="muted">{formatTimestamp(event.timestamp)}</p>
                      </div>
                      <p data-ui="text" data-variant="body" data-tone="primary">{event.summary}</p>
                      <div data-ui="stack" data-direction="row" data-gap="2" data-wrap="wrap" data-align="center">
                        {event.node_id ? (
                          <span data-ui="badge" data-variant="subtle" data-tone="neutral">node:{event.node_id}</span>
                        ) : null}
                        {snapshotId ? (
                          <span data-ui="badge" data-variant="subtle" data-tone="neutral">snapshot:{snapshotId}</span>
                        ) : null}
                        {event.module_id ? (
                          <span data-ui="badge" data-variant="subtle" data-tone="neutral">module:{event.module_id}</span>
                        ) : null}
                        <button
                          data-ui="button"
                          data-variant="ghost"
                          data-size="sm"
                          type="button"
                          onClick={() => onEvidenceTrace(event)}
                        >
                          证据链
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </article>

        <article className="dashboard-subpanel governance-panel">
          <div data-ui="stack" data-direction="col" data-gap="3">
            <p data-ui="text" data-variant="h3" data-tone="primary">Runtime Metrics</p>
            {metricsPanel.status === 'loading' && (
              <p data-ui="text" data-variant="body" data-tone="muted">正在计算运行指标...</p>
            )}
            {metricsPanel.status === 'error' && (
              <p data-ui="text" data-variant="body" data-tone="danger">{metricsPanel.error ?? '指标加载失败。'}</p>
            )}
            {(metricsPanel.status === 'ready' || metricsPanel.status === 'empty' || metricsPanel.status === 'idle') && (
              <div data-ui="grid" data-cols="2" data-gap="3" className="runtime-metrics-grid">
                <article className="runtime-metric-item">
                  <p data-ui="text" data-variant="label" data-tone="muted">Tokens</p>
                  <p data-ui="text" data-variant="h3" data-tone="primary">{formatNumber(metricsPanel.data.tokens)}</p>
                </article>
                <article className="runtime-metric-item">
                  <p data-ui="text" data-variant="label" data-tone="muted">Cost (USD)</p>
                  <p data-ui="text" data-variant="h3" data-tone="primary">{formatCurrency(metricsPanel.data.cost_usd)}</p>
                </article>
                <article className="runtime-metric-item">
                  <p data-ui="text" data-variant="label" data-tone="muted">GPU Requested</p>
                  <p data-ui="text" data-variant="h3" data-tone="primary">{formatNumber(metricsPanel.data.gpu_requested)}</p>
                </article>
                <article className="runtime-metric-item">
                  <p data-ui="text" data-variant="label" data-tone="muted">GPU Total</p>
                  <p data-ui="text" data-variant="h3" data-tone="primary">{formatNumber(metricsPanel.data.gpu_total)}</p>
                </article>
              </div>
            )}
            <p data-ui="text" data-variant="caption" data-tone="muted">
              updated at: {formatTimestamp(metricsPanel.data.updated_at)}
            </p>
          </div>
        </article>

        <article className="dashboard-subpanel governance-panel">
          <div data-ui="stack" data-direction="col" data-gap="3">
            <p data-ui="text" data-variant="h3" data-tone="primary">Artifact Bundle</p>
            {artifactPanel.status === 'loading' && (
              <p data-ui="text" data-variant="body" data-tone="muted">正在加载 artifact bundle...</p>
            )}
            {artifactPanel.status === 'error' && (
              <p data-ui="text" data-variant="body" data-tone="danger">{artifactPanel.error ?? 'artifact 加载失败。'}</p>
            )}
            {(artifactPanel.status === 'ready' || artifactPanel.status === 'empty' || artifactPanel.status === 'idle') && (
              <div data-ui="list" data-variant="rows" data-density="comfortable">
                {[
                  ['proposal', artifactPanel.data.proposal_url],
                  ['paper', artifactPanel.data.paper_url],
                  ['repo', artifactPanel.data.repo_url],
                  ['review', artifactPanel.data.review_url],
                ].map(([key, url]) => (
                  <div key={key} className="artifact-row">
                    <p data-ui="text" data-variant="label" data-tone="secondary">{key}</p>
                    {url ? (
                      <a data-ui="link" href={url} target="_blank" rel="noreferrer">{url}</a>
                    ) : (
                      <span data-ui="badge" data-variant="subtle" data-tone="neutral">pending</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>

        <article className="dashboard-subpanel governance-panel">
          <div data-ui="stack" data-direction="col" data-gap="3">
            <p data-ui="text" data-variant="h3" data-tone="primary">Release Review Queue</p>
            {releaseQueue.length === 0 ? (
              <p data-ui="text" data-variant="body" data-tone="muted">暂无待展示的审查事件。</p>
            ) : (
              <div data-ui="list" data-variant="rows" data-density="comfortable" className="review-queue-list">
                {releaseQueue.map((event: any) => (
                  <div key={event.event_id}>
                    <p data-ui="text" data-variant="label" data-tone="secondary">{event.event_type}</p>
                    <p data-ui="text" data-variant="body" data-tone="primary">{event.summary}</p>
                    <p data-ui="text" data-variant="caption" data-tone="muted">{formatTimestamp(event.timestamp)}</p>
                  </div>
                ))}
              </div>
            )}

            <form data-ui="form" data-layout="vertical" onSubmit={onSubmitReleaseReview} className="release-review-form">
              <label data-ui="field">
                <span data-slot="label">Reviewers (comma-separated)</span>
                <input
                  data-ui="input"
                  data-size="sm"
                  value={reviewersInput}
                  onChange={(event) => onReviewersInputChange(event.target.value)}
                  placeholder="reviewer-1, reviewer-2"
                />
              </label>

              <div data-ui="grid" data-cols="2" data-gap="3">
                <label data-ui="field">
                  <span data-slot="label">Decision</span>
                  <select
                    data-ui="select"
                    data-size="sm"
                    value={decision}
                    onChange={(event) => onDecisionChange(event.target.value as ReviewDecision)}
                  >
                    <option value="approve">approve</option>
                    <option value="hold">hold</option>
                    <option value="reject">reject</option>
                  </select>
                </label>

                <label data-ui="field">
                  <span data-slot="label">Label policy</span>
                  <input
                    data-ui="input"
                    data-size="sm"
                    value={labelPolicy}
                    onChange={(event) => onLabelPolicyChange(event.target.value)}
                  />
                </label>
              </div>

              <label data-ui="field">
                <span data-slot="label">Risk flags (comma-separated)</span>
                <input
                  data-ui="input"
                  data-size="sm"
                  value={riskFlagsInput}
                  onChange={(event) => onRiskFlagsInputChange(event.target.value)}
                  placeholder="policy-check, low-evidence"
                />
              </label>

              <label data-ui="field">
                <span data-slot="label">Comment</span>
                <textarea
                  data-ui="textarea"
                  value={reviewComment}
                  onChange={(event) => onReviewCommentChange(event.target.value)}
                  placeholder="审查备注"
                />
              </label>

              <div data-ui="toolbar" data-align="between" data-wrap="wrap">
                <p data-ui="text" data-variant="caption" data-tone={reviewSubmitState === 'error' ? 'danger' : 'muted'}>
                  {reviewSubmitMessage || '提交后会返回 review_id 与 audit_ref。'}
                </p>
                <button
                  data-ui="button"
                  data-variant="primary"
                  data-size="sm"
                  type="submit"
                  disabled={reviewSubmitState === 'submitting'}
                >
                  {reviewSubmitState === 'submitting' ? '提交中...' : '提交审查'}
                </button>
              </div>
            </form>
          </div>
        </article>
      </section>
    </section>
  );
}
