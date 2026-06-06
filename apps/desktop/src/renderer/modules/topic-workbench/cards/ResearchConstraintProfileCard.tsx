import { useEffect, useState } from 'react';
import { ReviewerCardEmpty } from './ReviewerCard';
import type {
  TopicSelectionV1bIntakeSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-intake-contracts';
import {
  listIntakeSnapshotsByTitleCard,
  recordConstraintProfileHuman,
} from '../api/v1b';

type ResearchConstraintProfileCardProps = {
  titleCardId: string | null;
  refreshToken: number;
  onMutated?: () => void;
};

function parseLines(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
}

/**
 * T-115 — v1b N2 record-research-constraint-profile (the one v1b node that is
 * genuine human INPUT). The researcher picks an N1 intake snapshot and authors
 * the constraint profile; posted as a `human_delegated` N2 invocation that runs
 * THROUGH the harness. Minimal v1 form (target_community + claim_ceiling
 * required; method_constraints / non_goals / notes optional).
 */
export function ResearchConstraintProfileCard({
  titleCardId,
  refreshToken,
  onMutated,
}: ResearchConstraintProfileCardProps) {
  const [snapshots, setSnapshots] = useState<TopicSelectionV1bIntakeSnapshotRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [snapshotId, setSnapshotId] = useState('');
  const [targetCommunity, setTargetCommunity] = useState('');
  const [claimCeiling, setClaimCeiling] = useState('');
  const [methodConstraints, setMethodConstraints] = useState('');
  const [nonGoals, setNonGoals] = useState('');
  const [notes, setNotes] = useState('');
  const [reviewerActorId, setReviewerActorId] = useState('reviewer');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [blockedStatus, setBlockedStatus] = useState<string | null>(null);
  const [recordedStatus, setRecordedStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!titleCardId) {
      setSnapshots([]);
      return;
    }
    let mounted = true;
    setLoading(true);
    setLoadError(null);
    void listIntakeSnapshotsByTitleCard(titleCardId)
      .then((items) => {
        if (!mounted) return;
        setSnapshots(items);
        setSnapshotId(items[0]?.v1b_intake_snapshot_id ?? '');
      })
      .catch((caught) => {
        if (mounted) setLoadError(caught instanceof Error ? caught.message : '加载 intake snapshot 失败。');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [titleCardId, refreshToken]);

  const canSubmit = snapshotId.trim() !== ''
    && targetCommunity.trim() !== ''
    && claimCeiling.trim() !== ''
    && reviewerActorId.trim() !== ''
    && !submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    setBlockedStatus(null);
    setRecordedStatus(null);
    try {
      const result = await recordConstraintProfileHuman(snapshotId, {
        actor: { actor_type: 'human', actor_id: reviewerActorId.trim() },
        profile: {
          target_community: targetCommunity.trim(),
          claim_ceiling: claimCeiling.trim(),
          method_constraints: parseLines(methodConstraints),
          non_goals: parseLines(nonGoals),
          human_constraint_notes: notes.trim() || null,
        },
      });
      if (result.gate_status === 'admitted' || result.gate_status === 'admitted_with_warnings') {
        // Clear the authored fields so an identical profile is not re-submitted by
        // accident (the required fields going blank also re-disables the button);
        // reviewer/snapshot persist for the next entry.
        setTargetCommunity('');
        setClaimCeiling('');
        setMethodConstraints('');
        setNonGoals('');
        setNotes('');
        setRecordedStatus(result.gate_status);
        onMutated?.();
      } else {
        setBlockedStatus(result.gate_status);
      }
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : '提交约束档案失败。');
    } finally {
      setSubmitting(false);
    }
  };

  if (!titleCardId) {
    return (
      <article data-ui="card">
        <p data-ui="text" data-variant="caption" data-tone="muted">请先选择一个题目卡。</p>
      </article>
    );
  }

  return (
    <article data-ui="card" data-padding="md">
      <div data-ui="stack" data-direction="col" data-gap="2">
        <p data-ui="text" data-variant="label" data-tone="primary">N2 研究约束档案（人审撰写）</p>
        <p data-ui="text" data-variant="caption" data-tone="muted">
          为某个 N1 intake snapshot 撰写研究约束（scope / claim ceiling / non-goals），经 harness 的 human_delegated 路径记录、约束整条 pipeline。
        </p>
        {loading ? (
          <p data-ui="text" data-variant="caption" data-tone="muted">加载 intake snapshot…</p>
        ) : loadError ? (
          <p data-ui="text" data-variant="caption" data-tone="danger">{loadError}</p>
        ) : snapshots.length === 0 ? (
          <ReviewerCardEmpty label="该题目卡还没有 intake snapshot（先由 v1b N1 从 V1bInputBundle 生成）。" />
        ) : (
          <>
            <div data-ui="stack" data-direction="col" data-gap="1">
              <p data-ui="text" data-variant="caption" data-tone="muted">Intake snapshot</p>
              <select
                data-ui="select"
                data-size="md"
                value={snapshotId}
                onChange={(event) => {
                  setSnapshotId(event.target.value);
                  setRecordedStatus(null);
                }}
              >
                {snapshots.map((snapshot) => (
                  <option key={snapshot.v1b_intake_snapshot_id} value={snapshot.v1b_intake_snapshot_id}>
                    {snapshot.v1b_intake_snapshot_id} · {snapshot.trace_status}
                  </option>
                ))}
              </select>
            </div>
            <div data-ui="stack" data-direction="col" data-gap="1">
              <p data-ui="text" data-variant="caption" data-tone="muted">Target community（必填）</p>
              <input
                data-ui="input"
                data-size="md"
                value={targetCommunity}
                onChange={(event) => setTargetCommunity(event.target.value)}
                placeholder="如：LLM systems researchers"
              />
            </div>
            <div data-ui="stack" data-direction="col" data-gap="1">
              <p data-ui="text" data-variant="caption" data-tone="muted">Claim ceiling（必填）</p>
              <textarea
                data-ui="textarea"
                data-size="md"
                rows={2}
                value={claimCeiling}
                onChange={(event) => setClaimCeiling(event.target.value)}
                placeholder="能宣称到什么程度（上限），不能宣称什么"
              />
            </div>
            <div data-ui="stack" data-direction="col" data-gap="1">
              <p data-ui="text" data-variant="caption" data-tone="muted">Method constraints（每行一条，可选）</p>
              <textarea
                data-ui="textarea"
                data-size="sm"
                rows={2}
                value={methodConstraints}
                onChange={(event) => setMethodConstraints(event.target.value)}
              />
            </div>
            <div data-ui="stack" data-direction="col" data-gap="1">
              <p data-ui="text" data-variant="caption" data-tone="muted">Non-goals（每行一条，可选）</p>
              <textarea
                data-ui="textarea"
                data-size="sm"
                rows={2}
                value={nonGoals}
                onChange={(event) => setNonGoals(event.target.value)}
              />
            </div>
            <div data-ui="stack" data-direction="col" data-gap="1">
              <p data-ui="text" data-variant="caption" data-tone="muted">Notes（可选）</p>
              <textarea
                data-ui="textarea"
                data-size="sm"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
            <div data-ui="stack" data-direction="col" data-gap="1">
              <p data-ui="text" data-variant="caption" data-tone="muted">Reviewer actor_id（必填）</p>
              <input
                data-ui="input"
                data-size="sm"
                value={reviewerActorId}
                onChange={(event) => setReviewerActorId(event.target.value)}
                placeholder="reviewer-id"
              />
            </div>
            {recordedStatus ? (
              <div data-ui="alert" data-tone="success">
                <p data-ui="text" data-variant="caption" data-tone="primary">
                  已记录约束档案（gate：{recordedStatus}），经 harness human_delegated 写入。可继续为其它 snapshot 撰写。
                </p>
              </div>
            ) : null}
            {blockedStatus ? (
              <div data-ui="alert" data-tone="warning">
                <p data-ui="text" data-variant="caption" data-tone="primary">
                  Gate 未放行（{blockedStatus}）。请检查 intake 就绪度 / 上游证据后重试。
                </p>
              </div>
            ) : null}
            {submitError ? (
              <p data-ui="text" data-variant="caption" data-tone="danger">{submitError}</p>
            ) : null}
            <div data-ui="stack" data-direction="row" data-gap="1" data-align="center">
              <button
                type="button"
                data-ui="button"
                data-variant="primary"
                data-size="sm"
                disabled={!canSubmit}
                onClick={() => void handleSubmit()}
              >
                {submitting ? '提交中…' : '记录约束档案'}
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
