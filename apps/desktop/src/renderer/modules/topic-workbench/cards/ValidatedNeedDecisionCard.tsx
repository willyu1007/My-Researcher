import { useState } from 'react';
import { ReviewerCard, ReviewerCardEmpty } from './ReviewerCard';
import type {
  TopicSelectionNeedCandidateRecord,
  TopicSelectionV1aToV1bInputBundleRecord,
  TopicSelectionValidatedNeedRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import { publishV1bInputBundle } from '../api/v1a';

type ValidatedNeedDecisionCardProps = {
  validatedNeeds: TopicSelectionValidatedNeedRecord[];
  needCandidates: TopicSelectionNeedCandidateRecord[];
  /** Phase 2.5 — request a fresh v1a reload after publishing a bundle. */
  onPublished?: (bundle: TopicSelectionV1aToV1bInputBundleRecord) => void;
};

/**
 * v1a ValidatedNeed Decision surface — the v1a success outlet. Every record
 * shown here is by definition human-confirmed (per design-spec §147 ＂only
 * one v1a exit: ValidatedNeed(human_confirmed)＂), so this card surfaces
 * the human decision context plus a pending-confirm queue derived from
 * NeedCandidates still in `pending_review`.
 *
 * Phase 2.1 ships read-only ReviewerCard.
 * Phase 2.5 will add:
 *  - inline adjudicate UI (POST /need-candidates/:id/adjudications) gated by
 *    the canonical "确认范围 / 证据 / 反证 / blocker / accepted risk /
 *    downstream effect" 6-section confirmation surface;
 *  - publish V1bInputBundle action.
 */
export function ValidatedNeedDecisionCard({
  validatedNeeds,
  needCandidates,
  onPublished,
}: ValidatedNeedDecisionCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    validatedNeeds[0]?.validated_need_id ?? null,
  );
  const active = validatedNeeds.find(
    (item) => item.validated_need_id === selectedId,
  ) ?? validatedNeeds[0] ?? null;

  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedBundleId, setPublishedBundleId] = useState<string | null>(null);

  const pendingConfirms = needCandidates.filter(
    (item) => item.decision_status === 'ready_for_validation' && !item.result_validated_need_id,
  );

  const handlePublish = async (validatedNeedId: string) => {
    setPublishing(true);
    setPublishError(null);
    try {
      const bundle = await publishV1bInputBundle({ validated_need_id: validatedNeedId });
      setPublishedBundleId(bundle.v1b_input_bundle_id);
      onPublished?.(bundle);
    } catch (caught) {
      setPublishError(caught instanceof Error ? caught.message : '发布 V1bInputBundle 失败。');
    } finally {
      setPublishing(false);
    }
  };

  if (!active) {
    return (
      <article data-ui="card">
        <div data-ui="stack" data-direction="col" data-gap="2">
          <p data-ui="text" data-variant="label" data-tone="primary">ValidatedNeed</p>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            该题目卡还没有 human-confirmed ValidatedNeed。
            {pendingConfirms.length > 0
              ? ` 有 ${pendingConfirms.length} 个 NeedCandidate 处在 pending_review，等待 reviewer 确认。`
              : ' 先到 NeedCandidate 标签生成候选并完成 readiness/support packet。'}
          </p>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            人审入口在 NeedCandidate surface 的"打开 adjudication confirm"，6 段必填（确认范围 / 证据 / 反证 / blocker / accepted risk / downstream effect）。
          </p>
        </div>
      </article>
    );
  }

  return (
    <div data-ui="stack" data-direction="col" data-gap="2">
      {validatedNeeds.length > 1 ? (
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <span data-ui="text" data-variant="caption" data-tone="muted">
            已 human-confirmed ValidatedNeed（{validatedNeeds.length}）
          </span>
          <select
            data-ui="select"
            data-size="sm"
            value={active.validated_need_id}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {validatedNeeds.map((item) => (
              <option key={item.validated_need_id} value={item.validated_need_id}>
                {item.validated_need_statement.slice(0, 60) || item.validated_need_id}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <ReviewerCard
        kind="ValidatedNeed"
        subjectId={active.validated_need_id}
        status={{ label: 'human-confirmed', tone: 'success' }}
        chips={[
          { label: `mechanism ${active.mechanism_type}`, tone: 'info' },
          { label: `prior_art ${active.prior_art_status}`, tone: 'neutral' },
          { label: `created_by ${active.created_by}`, tone: 'neutral' },
        ]}
        verdict={
          <div data-ui="stack" data-direction="col" data-gap="1">
            <p data-ui="text" data-variant="body" data-tone="primary">{active.validated_need_statement}</p>
            {active.scope_notes ? (
              <p data-ui="text" data-variant="caption" data-tone="muted">scope: {active.scope_notes}</p>
            ) : null}
            {active.non_goal_notes ? (
              <p data-ui="text" data-variant="caption" data-tone="muted">non-goal: {active.non_goal_notes}</p>
            ) : null}
            <p data-ui="text" data-variant="caption" data-tone="muted">
              source_need_candidate_id={active.source_need_candidate_id} · adjudication_result_id={active.adjudication_result_id}
            </p>
          </div>
        }
        support={
          active.evidence_role_bundle.support_unit_refs.length === 0 ? (
            <ReviewerCardEmpty label="无支持类 EvidenceUnit 引用（异常情况，应回查 adjudication）。" />
          ) : (
            <div data-ui="stack" data-direction="col" data-gap="1">
              <p data-ui="text" data-variant="caption" data-tone="primary">
                support_unit_refs：{active.evidence_role_bundle.support_unit_refs.length}
              </p>
              <p data-ui="text" data-variant="caption" data-tone="muted">
                baseline {active.evidence_role_bundle.baseline_unit_refs.length} · context {active.evidence_role_bundle.context_unit_refs.length} · 强度评估 {active.strength_assessment_refs.length} · trace refs {active.trace_refs.length}
              </p>
            </div>
          )
        }
        challenge={
          active.evidence_role_bundle.challenge_unit_refs.length === 0
            && active.conflict_refs.length === 0
            && active.residual_risk_refs.length === 0 ? (
            <ReviewerCardEmpty label="confirm 时未保留 challenge / conflict / residual risk。" />
          ) : (
            <div data-ui="stack" data-direction="col" data-gap="1">
              {active.evidence_role_bundle.challenge_unit_refs.length > 0 ? (
                <p data-ui="text" data-variant="caption" data-tone="muted">
                  保留的 challenge_unit_refs：{active.evidence_role_bundle.challenge_unit_refs.length}
                </p>
              ) : null}
              {active.residual_risk_refs.length > 0 ? (
                <p data-ui="text" data-variant="caption" data-tone="muted">
                  residual_risk_refs：{active.residual_risk_refs.length}
                </p>
              ) : null}
              {active.conflict_refs.length > 0 ? (
                <p data-ui="text" data-variant="caption" data-tone="muted">
                  conflict_refs：{active.conflict_refs.length}
                </p>
              ) : null}
            </div>
          )
        }
        blockers={
          active.accepted_risk_refs.length === 0 ? (
            <ReviewerCardEmpty label="confirm 时未挂 accepted risk。" />
          ) : (
            <p data-ui="text" data-variant="caption" data-tone="muted">
              human-confirm 时挂载的 accepted_risk_refs：{active.accepted_risk_refs.length}
            </p>
          )
        }
        nextActions={
          <div data-ui="stack" data-direction="col" data-gap="2">
            <p data-ui="text" data-variant="caption" data-tone="primary">
              → 发布后，此研究需求将作为研究切片规划的输入。
            </p>
            <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap" data-align="center">
              <button
                type="button"
                data-ui="button"
                data-variant="primary"
                data-size="sm"
                onClick={() => void handlePublish(active.validated_need_id)}
                disabled={publishing}
              >
                {publishing ? '发布中…' : '发布 V1bInputBundle'}
              </button>
              {publishedBundleId ? (
                <span data-ui="badge" data-variant="subtle" data-tone="success">
                  已发布：{publishedBundleId}
                </span>
              ) : null}
            </div>
            {publishError ? (
              <p data-ui="text" data-variant="caption" data-tone="danger">{publishError}</p>
            ) : null}
            {pendingConfirms.length > 0 ? (
              <p data-ui="text" data-variant="caption" data-tone="muted">
                Pending: 还有 {pendingConfirms.length} 个 NeedCandidate 等待 adjudication confirm。
              </p>
            ) : null}
          </div>
        }
        footer={`created_at=${active.created_at} · human_decision_id=${active.human_decision_id}`}
      />
    </div>
  );
}
