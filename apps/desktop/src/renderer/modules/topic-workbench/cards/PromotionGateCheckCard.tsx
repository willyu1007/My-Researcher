import { useEffect, useState } from 'react';
import { ReviewerCard, ReviewerCardEmpty } from './ReviewerCard';
import type {
  TopicSelectionArgumentReadinessMiniCheckRecord,
  TopicSelectionArgumentReadinessMiniCheckStatus,
  TopicSelectionPromotionDecisionSupportRecord,
  TopicSelectionPromotionGateCheckRecord,
  TopicSelectionPromotionGateDisposition,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-gate-contracts';
import {
  getArgumentReadinessMiniCheck,
  getPromotionDecisionSupport,
} from '../api/v1c';

type PromotionGateCheckCardProps = {
  gateChecks: TopicSelectionPromotionGateCheckRecord[];
};

function dispositionTone(
  disposition: TopicSelectionPromotionGateDisposition,
): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  switch (disposition) {
    case 'ready_for_human_decision':
      return 'success';
    case 'blocked':
      return 'danger';
    case 'needs_revision':
      return 'warning';
    case 'recheck_required':
      return 'warning';
    case 'park':
      return 'neutral';
    default:
      return 'info';
  }
}

/**
 * Per-check status badge. Uses conditional rendering with LITERAL `data-tone`
 * values per branch so the UI-governance static analyzer can resolve the tone
 * (a dynamic `data-tone={fn(status)}` trips the contract-dynamic rule).
 */
function CheckStatusBadge({ status }: { status: TopicSelectionArgumentReadinessMiniCheckStatus }) {
  if (status === 'passed') {
    return <span data-ui="badge" data-variant="subtle" data-tone="success">passed</span>;
  }
  if (status === 'blocking') {
    return <span data-ui="badge" data-variant="subtle" data-tone="danger">blocking</span>;
  }
  return <span data-ui="badge" data-variant="subtle" data-tone="warning">{status}</span>;
}

/**
 * v1c PromotionGateCheck surface — design-spec §379 mandates the 6-item
 * argument-readiness check rendered per-card (trace completeness / boundary
 * consistency / open blocker / accepted risk / recheck impact / narrative
 * consistency).
 *
 * The reviewer card surfaces the disposition / promote_allowed / blockers /
 * warnings / required_actions / loopback_hints, AND — fetched on demand by the
 * GateCheck's `argument_readiness_mini_check_id` / `promotion_decision_support_id`
 * (T-087 Phase 4 decision-support) — the 6 per-check verdicts (证据), the support
 * reviewer_questions (反证) and risk_notes (阻断). The detail fetch degrades
 * gracefully: if it fails, the aggregate gate verdict still renders. This is a
 * read-only surface; the human promotion decision (N4) is driven from the
 * Decision tab.
 */
export function PromotionGateCheckCard({ gateChecks }: PromotionGateCheckCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    gateChecks[0]?.promotion_gate_check_id ?? null,
  );
  const active = gateChecks.find((item) => item.promotion_gate_check_id === selectedId)
    ?? gateChecks[0]
    ?? null;

  const miniCheckId = active?.argument_readiness_mini_check_id ?? null;
  const supportId = active?.promotion_decision_support_id ?? null;

  const [miniCheck, setMiniCheck] = useState<TopicSelectionArgumentReadinessMiniCheckRecord | null>(null);
  const [support, setSupport] = useState<TopicSelectionPromotionDecisionSupportRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!miniCheckId && !supportId) {
      setMiniCheck(null);
      setSupport(null);
      return;
    }
    let mounted = true;
    setDetailLoading(true);
    setDetailError(null);
    // Clear the previous gate-check's detail so support-derived sections
    // (reviewer_questions / risk_notes / summary) never render against a
    // different gate-check's disposition during the switch fetch window.
    setMiniCheck(null);
    setSupport(null);
    void Promise.all([
      miniCheckId ? getArgumentReadinessMiniCheck(miniCheckId).catch(() => null) : Promise.resolve(null),
      supportId ? getPromotionDecisionSupport(supportId).catch(() => null) : Promise.resolve(null),
    ])
      .then(([mc, sup]) => {
        if (!mounted) return;
        setMiniCheck(mc);
        setSupport(sup);
        if (!mc && !sup) {
          setDetailError('加载 argument-readiness 逐项检查 / 决策支撑失败（聚合裁决仍可用）。');
        }
      })
      .finally(() => {
        if (mounted) setDetailLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [miniCheckId, supportId]);

  if (!active) {
    return (
      <article data-ui="card">
        <div data-ui="stack" data-direction="col" data-gap="2">
          <p data-ui="text" data-variant="label" data-tone="primary">PromotionGateCheck</p>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            该题目卡的 v1c 还没有 GateCheck。先在 v1b 发布 V1bToV1cInputBundle 触发 agent 层生成 PromotionDecisionSupport → GateCheck。
          </p>
        </div>
      </article>
    );
  }

  const setSelector = gateChecks.length > 1 ? (
    <select
      data-ui="select"
      data-size="sm"
      value={active.promotion_gate_check_id}
      onChange={(event) => setSelectedId(event.target.value)}
    >
      {gateChecks.map((item) => (
        <option key={item.promotion_gate_check_id} value={item.promotion_gate_check_id}>
          {item.promotion_gate_check_id} · {item.disposition}
        </option>
      ))}
    </select>
  ) : null;

  const argumentReadinessEvidence = detailLoading ? (
    <ReviewerCardEmpty label="加载 argument-readiness 6 项检查…" />
  ) : miniCheck && miniCheck.check_items.length > 0 ? (
    <div data-ui="stack" data-direction="col" data-gap="1">
      <p data-ui="text" data-variant="caption" data-tone="primary">
        argument-readiness（check_status={miniCheck.check_status}）· {miniCheck.check_items.length} 项
      </p>
      <ul data-ui="stack" data-direction="col" data-gap="1">
        {miniCheck.check_items.map((item) => (
          <li key={item.check_key}>
            <div data-ui="stack" data-direction="col" data-gap="0">
              <div data-ui="stack" data-direction="row" data-gap="1" data-align="center" data-wrap="wrap">
                <CheckStatusBadge status={item.status} />
                <span data-ui="text" data-variant="caption" data-tone="primary">{item.check_key}</span>
              </div>
              <p data-ui="text" data-variant="caption" data-tone="muted">{item.message}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  ) : detailError ? (
    <ReviewerCardEmpty label={detailError} />
  ) : (
    <ReviewerCardEmpty label="无 argument-readiness 逐项检查数据。" />
  );

  return (
    <ReviewerCard
      kind="PromotionGateCheck"
      subjectId={active.promotion_gate_check_id}
      status={{ label: active.disposition, tone: dispositionTone(active.disposition) }}
      chips={[
        ...(active.promote_allowed ? [{ label: 'promote allowed', tone: 'success' as const }] : [{ label: 'promote blocked', tone: 'danger' as const }]),
        { label: `blockers ${active.blockers.length}`, tone: active.blockers.length > 0 ? 'danger' : 'neutral' },
        { label: `warnings ${active.warnings.length}`, tone: active.warnings.length > 0 ? 'warning' : 'neutral' },
        ...(gateChecks.length > 1 ? [{ label: `history ${gateChecks.length}`, tone: 'neutral' as const }] : []),
      ]}
      verdict={
        <div data-ui="stack" data-direction="col" data-gap="1">
          <p data-ui="text" data-variant="body" data-tone="primary">
            disposition = {active.disposition}（promote_allowed={String(active.promote_allowed)}）
          </p>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            support_run_key={active.support_run_key} · snapshot_hash={active.promotion_input_snapshot_hash.slice(0, 16)}…
          </p>
          {support?.summary ? (
            <p data-ui="text" data-variant="caption" data-tone="muted">support：{support.summary}</p>
          ) : null}
          {setSelector ? (
            <div data-ui="stack" data-direction="row" data-gap="2" data-align="center">
              <span data-ui="text" data-variant="caption" data-tone="muted">切换 gate check</span>
              {setSelector}
            </div>
          ) : null}
        </div>
      }
      support={
        <div data-ui="stack" data-direction="col" data-gap="2">
          {argumentReadinessEvidence}
          {active.required_actions.length === 0 ? (
            <ReviewerCardEmpty label="无 required_actions。" />
          ) : (
            <div data-ui="stack" data-direction="col" data-gap="1">
              <p data-ui="text" data-variant="caption" data-tone="primary">
                required_actions（{active.required_actions.length}）
              </p>
              <ul data-ui="stack" data-direction="col" data-gap="0">
                {active.required_actions.slice(0, 5).map((action, idx) => (
                  <li key={idx}>
                    <p data-ui="text" data-variant="caption" data-tone="muted">
                      · [{action.severity}] {action.action_code}{action.reason ? `：${action.reason}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      }
      challenge={
        <div data-ui="stack" data-direction="col" data-gap="2">
          {active.blockers.length === 0 && active.warnings.length === 0 ? (
            <ReviewerCardEmpty label="未发现 blocker / warning。" />
          ) : (
            <div data-ui="stack" data-direction="col" data-gap="1">
              {active.blockers.length > 0 ? (
                <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap">
                  {active.blockers.slice(0, 6).map((issue, idx) => (
                    <span key={idx} data-ui="badge" data-variant="subtle" data-tone="danger">
                      {issue.code}
                    </span>
                  ))}
                </div>
              ) : null}
              {active.warnings.length > 0 ? (
                <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap">
                  {active.warnings.slice(0, 6).map((issue, idx) => (
                    <span key={idx} data-ui="badge" data-variant="subtle" data-tone="warning">
                      {issue.code}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          )}
          {support && support.reviewer_questions.length > 0 ? (
            <div data-ui="stack" data-direction="col" data-gap="1">
              <p data-ui="text" data-variant="caption" data-tone="primary">
                reviewer_questions（{support.reviewer_questions.length}）
              </p>
              <ul data-ui="stack" data-direction="col" data-gap="0">
                {support.reviewer_questions.slice(0, 6).map((question, idx) => (
                  <li key={idx}>
                    <p data-ui="text" data-variant="caption" data-tone="muted">· {question}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      }
      blockers={
        <div data-ui="stack" data-direction="col" data-gap="2">
          {active.blocker_refs.length === 0
            && active.accepted_risk_refs.length === 0
            && active.recheck_request_refs.length === 0 ? (
            <ReviewerCardEmpty label="无 blocker_refs / accepted_risk_refs / recheck_request_refs。" />
          ) : (
            <div data-ui="stack" data-direction="col" data-gap="1">
              {active.blocker_refs.length > 0 ? (
                <p data-ui="text" data-variant="caption" data-tone="muted">blocker_refs：{active.blocker_refs.length}</p>
              ) : null}
              {active.accepted_risk_refs.length > 0 ? (
                <p data-ui="text" data-variant="caption" data-tone="muted">accepted_risk_refs：{active.accepted_risk_refs.length}</p>
              ) : null}
              {active.recheck_request_refs.length > 0 ? (
                <p data-ui="text" data-variant="caption" data-tone="muted">recheck_request_refs：{active.recheck_request_refs.length}</p>
              ) : null}
            </div>
          )}
          {support && support.risk_notes.length > 0 ? (
            <div data-ui="stack" data-direction="col" data-gap="1">
              <p data-ui="text" data-variant="caption" data-tone="primary">risk_notes（{support.risk_notes.length}）</p>
              <ul data-ui="stack" data-direction="col" data-gap="0">
                {support.risk_notes.slice(0, 5).map((note, idx) => (
                  <li key={idx}>
                    <p data-ui="text" data-variant="caption" data-tone="muted">· {note}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      }
      nextActions={
        <div data-ui="stack" data-direction="col" data-gap="1">
          {active.promote_allowed ? (
            <p data-ui="text" data-variant="caption" data-tone="primary">
              → promote_allowed=true，可进入 Decision 标签发起 HumanPromotionDecision（promote_to_paper_project / promote_with_conditions）。
            </p>
          ) : (
            <p data-ui="text" data-variant="caption" data-tone="muted">
              → promote_allowed=false：必须先在 Decision 标签发起 non-promote 路径（refine_package / reassess_value / revise_question / 等）。
            </p>
          )}
          {active.loopback_hints.length > 0 ? (
            <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap">
              {active.loopback_hints.slice(0, 5).map((hint, idx) => (
                <span key={idx} data-ui="badge" data-variant="subtle" data-tone="info">
                  loopback={hint.loopback_target}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      }
      footer={`created_at=${active.created_at}`}
    />
  );
}
