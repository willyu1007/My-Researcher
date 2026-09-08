import { useEffect, useState } from 'react';
import { ReviewerCard, ReviewerCardEmpty } from './ReviewerCard';
import type {
  TopicSelectionDownstreamTopicFeedbackRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-downstream-feedback-recheck-contracts';
import type {
  TopicSelectionPaperProjectBridgeRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-paper-project-bridge-contracts';
import { listDownstreamFeedbackByBridge } from '../api/v1c';

type DownstreamFeedbackCardProps = {
  bridges: TopicSelectionPaperProjectBridgeRecord[];
};

/**
 * v1c DownstreamFeedback surface — append-only feedback flowing back from
 * paper-project / writing / experiment runs to the upstream v1c bridge.
 *
 * Phase 4 ships read-only listing for a selected bridge. Recheck dispatch
 * actions (escalate feedback into a recheck request) land in Phase 5
 * horizontal panels (queue + trace).
 */
export function DownstreamFeedbackCard({ bridges }: DownstreamFeedbackCardProps) {
  const [bridgeId, setBridgeId] = useState<string>(bridges[0]?.paper_project_bridge_id ?? '');
  const [feedback, setFeedback] = useState<TopicSelectionDownstreamTopicFeedbackRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bridgeId && bridges[0]) {
      setBridgeId(bridges[0].paper_project_bridge_id);
    }
  }, [bridges, bridgeId]);

  useEffect(() => {
    if (!bridgeId) {
      setFeedback([]);
      setError(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    setError(null);
    void listDownstreamFeedbackByBridge(bridgeId)
      .then((records) => {
        if (mounted) setFeedback(records);
      })
      .catch((caught) => {
        if (mounted) setError(caught instanceof Error ? caught.message : '加载 downstream feedback 失败。');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [bridgeId]);

  if (bridges.length === 0) {
    return (
      <article data-ui="card">
        <div data-ui="stack" data-direction="col" data-gap="2">
          <p data-ui="text" data-variant="label" data-tone="primary">DownstreamFeedback</p>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            该题目卡还没有 PaperProjectBridge。downstream feedback 必须挂在 bridge 上。
          </p>
        </div>
      </article>
    );
  }

  return (
    <ReviewerCard
      kind="DownstreamFeedback"
      subjectId={bridgeId || '—'}
      status={{ label: `feedback ${feedback.length}`, tone: feedback.length > 0 ? 'info' : 'neutral' }}
      chips={[
        { label: `bridges ${bridges.length}`, tone: 'neutral' },
      ]}
      verdict={
        <div data-ui="stack" data-direction="col" data-gap="1">
          <p data-ui="text" data-variant="body" data-tone="primary">
            下游回传（append-only）
          </p>
          {bridges.length > 1 ? (
            <div data-ui="stack" data-direction="row" data-gap="2" data-align="center">
              <span data-ui="text" data-variant="caption" data-tone="muted">选择 bridge</span>
              <select
                data-ui="select"
                data-size="sm"
                value={bridgeId}
                onChange={(event) => setBridgeId(event.target.value)}
              >
                {bridges.map((bridge) => (
                  <option key={bridge.paper_project_bridge_id} value={bridge.paper_project_bridge_id}>
                    {bridge.paper_project_bridge_id} · {bridge.bridge_status}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      }
      support={
        loading ? (
          <p data-ui="text" data-variant="caption" data-tone="muted">加载 feedback…</p>
        ) : error ? (
          <p data-ui="text" data-variant="caption" data-tone="danger">{error}</p>
        ) : feedback.length === 0 ? (
          <ReviewerCardEmpty label="该 bridge 暂无 downstream feedback。" />
        ) : (
          <div data-ui="stack" data-direction="col" data-gap="1">
            {feedback.slice(0, 8).map((item) => (
              <div key={item.downstream_topic_feedback_id} data-ui="stack" data-direction="col" data-gap="0">
                <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap" data-align="center">
                  <span data-ui="badge" data-variant="subtle" data-tone="info">{item.downstream_source_kind}</span>
                  <span data-ui="text" data-variant="caption" data-tone="muted">
                    snapshot={item.promotion_input_snapshot_hash.slice(0, 16)}…
                  </span>
                </div>
                <p data-ui="text" data-variant="caption" data-tone="muted">
                  fingerprint={item.feedback_fingerprint.slice(0, 24)}…
                </p>
              </div>
            ))}
            {feedback.length > 8 ? (
              <p data-ui="text" data-variant="caption" data-tone="muted">
                仅显示前 8 条；共 {feedback.length} 条。
              </p>
            ) : null}
          </div>
        )
      }
      challenge={
        <ReviewerCardEmpty label="downstream feedback 由 paper-project / 写作 / 实验层 append；reviewer 不在此处直接修改。" />
      }
      blockers={
        <ReviewerCardEmpty label="需复查的事项请结合当前研究阶段的待处理队列与运行记录核对。" />
      }
      nextActions={
        <p data-ui="text" data-variant="caption" data-tone="muted">
          → 查看反馈引用的复查请求，并在相应研究阶段处理。
        </p>
      }
      footer={`bridge=${bridgeId || '—'}`}
    />
  );
}
