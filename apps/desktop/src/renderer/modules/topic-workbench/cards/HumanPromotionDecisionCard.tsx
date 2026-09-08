import { useCallback, useEffect, useMemo, useState } from 'react';
import { ReviewerCard, ReviewerCardEmpty } from './ReviewerCard';
import type {
  TopicSelectionPromotionGateCheckRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-gate-contracts';
import type {
  TopicSelectionHumanPromotionDecisionKind,
  TopicSelectionPromotionDecisionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import { recordHumanPromotionDecision } from '../api/v1c';

type HumanPromotionDecisionCardProps = {
  gateChecks: TopicSelectionPromotionGateCheckRecord[];
  promotionDecisions: TopicSelectionPromotionDecisionRecord[];
  onMutated?: () => void;
};

const PROMOTION_DECISIONS: Array<{
  value: TopicSelectionHumanPromotionDecisionKind;
  label: string;
  promoteClass: boolean;
}> = [
  { value: 'promote_to_paper_project', label: 'promote_to_paper_project · 创建 PaperProjectBridge', promoteClass: true },
  { value: 'promote_with_conditions', label: 'promote_with_conditions · 带条件晋升', promoteClass: true },
  { value: 'merge_packages', label: 'merge_packages · 合并到另一 package', promoteClass: false },
  { value: 'refine_package', label: 'refine_package · 修订选题方案', promoteClass: false },
  { value: 'reassess_value', label: 'reassess_value · 重新评估研究价值', promoteClass: false },
  { value: 'revise_question', label: 'revise_question · 修订研究问题', promoteClass: false },
  { value: 'revise_slice', label: 'revise_slice · 修订研究切片', promoteClass: false },
  { value: 'recheck_evidence_or_search', label: 'recheck_evidence_or_search · 复查文献与证据', promoteClass: false },
  { value: 'park', label: 'park · 暂搁', promoteClass: false },
  { value: 'drop', label: 'drop · 放弃', promoteClass: false },
];

function decisionTone(decision: string): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (decision.startsWith('promote_')) return 'success';
  if (decision === 'drop') return 'danger';
  if (decision === 'park') return 'warning';
  return 'info';
}

/**
 * v1c HumanPromotionDecision surface — design-spec §357 mandates
 * `human-confirmed promote/promote_with_conditions` is the only path that
 * creates a PaperProjectBridge. The inline form enforces:
 *   - rationale 必填（design-spec §4039 红线）
 *   - promote-class 路径必须提供 conditions（至少 1 条 commitment-bearing condition）
 *   - 其它 9 条路径只需 rationale
 *
 * `confirmed_snapshot_hash` 取自 GateCheck.promotion_input_snapshot_hash，
 * reviewer 选 gate-check 即自动绑定。
 */
export function HumanPromotionDecisionCard({
  gateChecks,
  promotionDecisions,
  onMutated,
}: HumanPromotionDecisionCardProps) {
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(
    promotionDecisions[0]?.promotion_decision_id ?? null,
  );
  const active = promotionDecisions.find((item) => item.promotion_decision_id === selectedDecisionId)
    ?? promotionDecisions[0]
    ?? null;

  return (
    <div data-ui="stack" data-direction="col" data-gap="2">
      {promotionDecisions.length > 1 ? (
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <span data-ui="text" data-variant="caption" data-tone="muted">
            PromotionDecisions（{promotionDecisions.length}）
          </span>
          <select
            data-ui="select"
            data-size="sm"
            value={active?.promotion_decision_id ?? ''}
            onChange={(event) => setSelectedDecisionId(event.target.value)}
          >
            {promotionDecisions.map((item) => (
              <option key={item.promotion_decision_id} value={item.promotion_decision_id}>
                {item.promotion_decision_id} · {item.decision}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {active ? (
        <ReviewerCard
          kind="PromotionDecision"
          subjectId={active.promotion_decision_id}
          status={{ label: active.decision, tone: decisionTone(active.decision) }}
          chips={[
            { label: `class ${active.decision_class}`, tone: 'info' },
            { label: `gate ${active.gate_disposition}`, tone: 'neutral' },
            ...(active.bridge_eligible ? [{ label: 'bridge eligible', tone: 'success' as const }] : []),
          ]}
          verdict={
            <div data-ui="stack" data-direction="col" data-gap="1">
              <p data-ui="text" data-variant="body" data-tone="primary">
                decision = {active.decision}（status={active.promotion_decision_status}）
              </p>
              <p data-ui="text" data-variant="caption" data-tone="muted">
                gate_check={active.promotion_gate_check_id} · snapshot={active.promotion_input_snapshot_hash.slice(0, 16)}…
              </p>
            </div>
          }
          support={
            <p data-ui="text" data-variant="caption" data-tone="muted">
              human_promotion_decision_id={active.human_promotion_decision_id} · commitment_profile_id={active.promotion_commitment_profile_id ?? '—'}
            </p>
          }
          challenge={
            active.conditions.length === 0 ? (
              <ReviewerCardEmpty label="无声明的 conditions（非 promote-class 决策正常）。" />
            ) : (
              <div data-ui="stack" data-direction="col" data-gap="1">
                <p data-ui="text" data-variant="caption" data-tone="primary">
                  conditions（{active.conditions.length}）
                </p>
                <ul data-ui="stack" data-direction="col" data-gap="0">
                  {active.conditions.slice(0, 4).map((cond, idx) => (
                    <li key={idx}>
                      <p data-ui="text" data-variant="caption" data-tone="muted">
                        · {cond.condition_code}{cond.required_action?.reason ? `：${cond.required_action.reason}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )
          }
          blockers={
            active.required_actions.length === 0 && active.accepted_risk_refs.length === 0 ? (
              <ReviewerCardEmpty label="无 required_actions / accepted_risk_refs。" />
            ) : (
              <div data-ui="stack" data-direction="col" data-gap="1">
                {active.required_actions.length > 0 ? (
                  <p data-ui="text" data-variant="caption" data-tone="muted">required_actions：{active.required_actions.length}</p>
                ) : null}
                {active.accepted_risk_refs.length > 0 ? (
                  <p data-ui="text" data-variant="caption" data-tone="muted">accepted_risk_refs：{active.accepted_risk_refs.length}</p>
                ) : null}
              </div>
            )
          }
          nextActions={
            <p data-ui="text" data-variant="caption" data-tone="primary">
              {active.bridge_eligible
                ? '→ promote-class 决策已存在，可进入 Bridge 标签创建 PaperProjectBridge。'
                : '→ 非 promote-class 决策；按 decision 字段对应的回流路径处理上游。'}
            </p>
          }
          footer={`created_at=${active.created_at}`}
        />
      ) : null}

      <RecordDecisionForm gateChecks={gateChecks} onSubmitted={onMutated} />
    </div>
  );
}

type RecordDecisionFormProps = {
  gateChecks: TopicSelectionPromotionGateCheckRecord[];
  onSubmitted?: () => void;
};

/**
 * Phase 4 inline form — submit a HumanPromotionDecision.
 *
 * Picker auto-binds `promotion_gate_check_id` and `confirmed_snapshot_hash`.
 * promote-class paths require at least one `condition_code + description`
 * pair (design-spec §380 commitment profile must freeze conditions).
 */
function RecordDecisionForm({ gateChecks, onSubmitted }: RecordDecisionFormProps) {
  const [gateCheckId, setGateCheckId] = useState<string>(
    gateChecks[0]?.promotion_gate_check_id ?? '',
  );
  const activeGate = useMemo(
    () => gateChecks.find((g) => g.promotion_gate_check_id === gateCheckId) ?? gateChecks[0] ?? null,
    [gateChecks, gateCheckId],
  );

  const [decision, setDecision] = useState<TopicSelectionHumanPromotionDecisionKind>(
    activeGate?.promote_allowed ? 'promote_to_paper_project' : 'refine_package',
  );
  const [rationale, setRationale] = useState('');
  const [actorId, setActorId] = useState('reviewer');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  useEffect(() => {
    if (!gateCheckId && gateChecks[0]) {
      setGateCheckId(gateChecks[0].promotion_gate_check_id);
    }
  }, [gateChecks, gateCheckId]);

  const activeOption = PROMOTION_DECISIONS.find((opt) => opt.value === decision) ?? PROMOTION_DECISIONS[0];
  const canSubmit = !submitting
    && !!activeGate
    && rationale.trim().length > 0
    && actorId.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !activeGate) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await recordHumanPromotionDecision({
        promotion_gate_check_id: activeGate.promotion_gate_check_id,
        decision,
        human_actor: { actor_type: 'human', actor_id: actorId.trim() },
        rationale: rationale.trim(),
        confirmed_snapshot_hash: activeGate.promotion_input_snapshot_hash,
      });
      setSubmittedId(result.promotion_decision.promotion_decision_id);
      onSubmitted?.();
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : '提交 HumanPromotionDecision 失败。');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, activeGate, decision, actorId, rationale, onSubmitted]);

  return (
    <article data-ui="card" data-padding="md">
      <div data-ui="stack" data-direction="col" data-gap="2">
        <p data-ui="text" data-variant="label" data-tone="primary">记录 HumanPromotionDecision · human confirm</p>
        {!activeGate ? (
          <p data-ui="text" data-variant="caption" data-tone="muted">
            没有可用的 GateCheck；请先在 GateCheck 标签确认 agent 层已生成。
          </p>
        ) : (
          <>
            <section data-ui="section" data-padding="sm">
              <div data-ui="stack" data-direction="col" data-gap="1">
                <p data-ui="text" data-variant="label" data-tone="muted">来源 GateCheck</p>
                <select
                  data-ui="select"
                  data-size="md"
                  value={gateCheckId}
                  onChange={(event) => setGateCheckId(event.target.value)}
                >
                  {gateChecks.map((item) => (
                    <option key={item.promotion_gate_check_id} value={item.promotion_gate_check_id}>
                      {item.promotion_gate_check_id} · {item.disposition}（promote_allowed={String(item.promote_allowed)}）
                    </option>
                  ))}
                </select>
                <p data-ui="text" data-variant="caption" data-tone="muted">
                  自动带入 snapshot_hash={activeGate.promotion_input_snapshot_hash.slice(0, 16)}…
                </p>
              </div>
            </section>

            <section data-ui="section" data-padding="sm">
              <div data-ui="stack" data-direction="col" data-gap="1">
                <p data-ui="text" data-variant="label" data-tone="muted">Decision（10 选 1）</p>
                <select
                  data-ui="select"
                  data-size="md"
                  value={decision}
                  onChange={(event) => setDecision(event.target.value as TopicSelectionHumanPromotionDecisionKind)}
                >
                  {PROMOTION_DECISIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {activeOption.promoteClass ? (
                  <p data-ui="text" data-variant="caption" data-tone="muted">
                    promote-class：commitment 字段（conditions / allowed_refinements / stop_conditions） 由 agent 层从 gate-check + package 自动派生；reviewer 在此处只确认 decision 与 rationale，backend 若发现 commitment 不完整会拒收并提示。
                  </p>
                ) : null}
              </div>
            </section>

            <section data-ui="section" data-padding="sm">
              <div data-ui="stack" data-direction="col" data-gap="1">
                <p data-ui="text" data-variant="label" data-tone="muted">Reviewer actor_id（必填）</p>
                <input
                  data-ui="input"
                  data-size="md"
                  placeholder="reviewer-id"
                  value={actorId}
                  onChange={(event) => setActorId(event.target.value)}
                />
                <p data-ui="text" data-variant="label" data-tone="muted">Rationale（必填）</p>
                <textarea
                  data-ui="textarea"
                  data-size="md"
                  rows={3}
                  placeholder="human-reviewable rationale summarising why this decision is correct"
                  value={rationale}
                  onChange={(event) => setRationale(event.target.value)}
                />
              </div>
            </section>

            <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap" data-align="center">
              {canSubmit ? (
                <button
                  type="button"
                  data-ui="button"
                  data-variant="primary"
                  data-size="md"
                  disabled={submitting}
                  onClick={() => void handleSubmit()}
                >
                  {submitting ? '提交中…' : `提交 ${activeOption.label.split(' · ')[0]}`}
                </button>
              ) : (
                <button
                  type="button"
                  data-ui="button"
                  data-variant="secondary"
                  data-size="md"
                  disabled
                >
                  提交 {activeOption.label.split(' · ')[0]}
                </button>
              )}
              {submittedId ? (
                <span data-ui="badge" data-variant="subtle" data-tone="success">已记录：{submittedId}</span>
              ) : null}
            </div>
            {submitError ? (
              <p data-ui="text" data-variant="caption" data-tone="danger">{submitError}</p>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}
