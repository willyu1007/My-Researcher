import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  TopicSelectionNeedAdjudicationDecision,
  TopicSelectionNeedCandidateRecord,
  TopicSelectionNeedLoopbackTarget,
  TopicSelectionNeedRejectedReason,
  TopicSelectionValidationDecisionSupportPacketRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import {
  adjudicateNeed,
  confirmValidatedNeed,
  listSupportPacketsByNeedCandidate,
  type AdjudicateNeedRequest,
  type AdjudicateNeedResponse,
} from '../api/v1a';

type AdjudicationConfirmFormProps = {
  /** When non-null, the form is rendered inline for this candidate. */
  candidate: TopicSelectionNeedCandidateRecord | null;
  /** Pre-select decision (used by NeedCandidate quick-action buttons). */
  initialDecision?: TopicSelectionNeedAdjudicationDecision;
  /** Cancel / close request from the form's cancel button. */
  onClose: () => void;
  /** Called after a successful adjudication so callers can refetch. */
  onSubmitted: (result: AdjudicateNeedResponse) => void;
};

type DecisionOption = {
  value: TopicSelectionNeedAdjudicationDecision;
  label: string;
  description: string;
  requiresValidatePath: boolean;
};

const DECISION_OPTIONS: DecisionOption[] = [
  {
    value: 'validate',
    label: 'validate · 创建 ValidatedNeed',
    description: 'v1a 唯一成功出口；必须填齐 6 段确认。',
    requiresValidatePath: true,
  },
  {
    value: 'return_to_candidate',
    label: 'return_to_candidate · 退回修订',
    description: '要求重新生成或修改 candidate。loopback_target=need_candidate。',
    requiresValidatePath: false,
  },
  {
    value: 'request_searchplan_recheck',
    label: 'request_searchplan_recheck · 触发 SearchPlan recheck',
    description: '需要补搜或修订搜索计划。需提供 reason + gap codes。',
    requiresValidatePath: false,
  },
  {
    value: 'reject',
    label: 'reject · 否决',
    description: 'pseudo_gap / already_solved / 等。需要 rejected_reason。',
    requiresValidatePath: false,
  },
  {
    value: 'park',
    label: 'park · 暂搁',
    description: '暂时搁置，待外部条件改善后再激活。',
    requiresValidatePath: false,
  },
  {
    value: 'merge',
    label: 'merge · 合并到另一候选',
    description: '合并到同义/重复候选。需要 merge_target_need_candidate_ref。',
    requiresValidatePath: false,
  },
];

const REJECTED_REASON_OPTIONS: TopicSelectionNeedRejectedReason[] = [
  'pseudo_gap',
  'already_solved',
  'too_narrow',
  'too_broad',
  'weak_value',
  'insufficient_evidence',
  'out_of_scope',
  'duplicate',
  'other',
];

const LOOPBACK_OPTIONS: TopicSelectionNeedLoopbackTarget[] = [
  'none',
  'need_candidate',
  'evidence_map',
  'search_plan',
  'human_review',
];

type ValidateConfirmFields = {
  scopeConfirmation: string; // 1. 确认范围
  supportSummary: string; // 2. 证据
  challengeSummary: string; // 3. 反证
  blockerSummary: string; // 4. blocker
  acceptedRiskSummary: string; // 5. accepted risk
  downstreamEffect: string; // 6. downstream effect
};

const EMPTY_VALIDATE_FIELDS: ValidateConfirmFields = {
  scopeConfirmation: '',
  supportSummary: '',
  challengeSummary: '',
  blockerSummary: '',
  acceptedRiskSummary: '',
  downstreamEffect: '',
};

/**
 * v1a Adjudication Confirm form — the canonical human-confirm surface
 * mandated by design-spec §4039. For final_decision = validate it forces
 * a 6-section confirmation surface so the human reviewer cannot collapse
 * the decision into a single confirm button:
 *
 *   1. 确认范围 (subject + scope being claimed)
 *   2. 证据 (what supports it)
 *   3. 反证 (counter-evidence / unresolved objections being accepted)
 *   4. blocker (open blockers that must be tolerated)
 *   5. accepted risk (explicitly accepted risk + scope/expiry/recheck cond.)
 *   6. downstream effect (what does v1b inherit?)
 *
 * Non-validate decisions render lighter inputs but still require rationale.
 *
 * Phase 2.5 ships this form + the support packet picker. Phase 2.4 will
 * separately add the readiness/support-packet creation workflow that
 * produces the inputs this form consumes.
 *
 * Layout: inline panel composed from contract primitives (card / stack /
 * section / select / textarea / button). The form replaces the candidate
 * detail card in V1aStageView while active. There is no fixed-position
 * drawer / overlay; that pattern requires a contract drawer role (RFC).
 */
export function AdjudicationConfirmForm({
  candidate,
  initialDecision,
  onClose,
  onSubmitted,
}: AdjudicationConfirmFormProps) {
  const [decision, setDecision] = useState<TopicSelectionNeedAdjudicationDecision>(
    initialDecision ?? 'validate',
  );
  const [rationale, setRationale] = useState('');
  const [packets, setPackets] = useState<TopicSelectionValidationDecisionSupportPacketRecord[]>([]);
  const [supportPacketId, setSupportPacketId] = useState<string>('');
  const [packetLoading, setPacketLoading] = useState(false);
  const [packetError, setPacketError] = useState<string | null>(null);
  const [validateFields, setValidateFields] = useState<ValidateConfirmFields>(EMPTY_VALIDATE_FIELDS);
  const [rejectedReason, setRejectedReason] = useState<TopicSelectionNeedRejectedReason>('insufficient_evidence');
  const [loopbackTarget, setLoopbackTarget] = useState<TopicSelectionNeedLoopbackTarget>('none');
  const [searchplanRecheckReason, setSearchplanRecheckReason] = useState('');
  const [mergeTargetCandidateId, setMergeTargetCandidateId] = useState('');
  const [requiredActionsText, setRequiredActionsText] = useState('');
  const [gapCodesText, setGapCodesText] = useState('');
  const [humanRationale, setHumanRationale] = useState('');
  const [reviewerActorId, setReviewerActorId] = useState('reviewer');
  // Set once N7 (adjudicate) commits but N8 (human-confirm) still needs to run,
  // so a retry only re-issues N8 instead of re-adjudicating a now-pending candidate.
  const [pendingConfirmAdjudicationId, setPendingConfirmAdjudicationId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const candidateId = candidate?.need_candidate_id ?? null;
  const candidateTitleCardId = candidate?.title_card_id ?? null;
  const open = candidate !== null;

  useEffect(() => {
    if (!open) {
      return;
    }
    setDecision(initialDecision ?? 'validate');
    setRationale('');
    setSupportPacketId('');
    setValidateFields(EMPTY_VALIDATE_FIELDS);
    setRejectedReason('insufficient_evidence');
    setLoopbackTarget('none');
    setSearchplanRecheckReason('');
    setMergeTargetCandidateId('');
    setRequiredActionsText('');
    setGapCodesText('');
    setHumanRationale('');
    setPendingConfirmAdjudicationId(null);
    setSubmitError(null);
  }, [open, candidateId, initialDecision]);

  useEffect(() => {
    if (!open || !candidateId) {
      setPackets([]);
      setPacketError(null);
      return;
    }
    setPacketLoading(true);
    setPacketError(null);
    void listSupportPacketsByNeedCandidate(candidateId)
      .then((items) => {
        setPackets(items);
        if (items.length > 0) {
          setSupportPacketId(items[0].validation_support_packet_id);
        }
      })
      .catch((caught) => {
        setPacketError(caught instanceof Error ? caught.message : '加载 support packet 失败。');
      })
      .finally(() => setPacketLoading(false));
  }, [open, candidateId]);

  const requiresValidatePath = decision === 'validate';

  const validateFieldErrors = useMemo(() => {
    if (!requiresValidatePath) {
      return {} as Record<keyof ValidateConfirmFields, string | null>;
    }
    const trimmed = (key: keyof ValidateConfirmFields) => validateFields[key].trim();
    return {
      scopeConfirmation: trimmed('scopeConfirmation') ? null : '必填：明确正在确认的对象与范围。',
      supportSummary: trimmed('supportSummary') ? null : '必填：用 1-3 行陈述主要 support。',
      challengeSummary: trimmed('challengeSummary') ? null : '必填：写明保留的 challenge / 已被接受的反证；如无可写"无未解 challenge"。',
      blockerSummary: trimmed('blockerSummary') ? null : '必填：列出 open blockers；如无写"无未解 blocker"。',
      acceptedRiskSummary: trimmed('acceptedRiskSummary') ? null : '必填：列出 accepted risks 的 scope / 原因 / expiry-recheck 条件；如无写"无 accepted risk"。',
      downstreamEffect: trimmed('downstreamEffect') ? null : '必填：写明此 ValidatedNeed 对 v1b 的影响（claim ceiling / 资源约束 / non-goal）。',
    };
  }, [requiresValidatePath, validateFields]);

  const decisionPathErrors = useMemo(() => {
    if (decision === 'reject') {
      return rationale.trim() ? null : 'rejected_reason 已选，但 rationale 必填。';
    }
    if (decision === 'request_searchplan_recheck') {
      return searchplanRecheckReason.trim() ? null : 'recheck reason 必填。';
    }
    if (decision === 'merge') {
      return mergeTargetCandidateId.trim() ? null : 'merge_target_need_candidate_id 必填。';
    }
    return null;
  }, [decision, rationale, searchplanRecheckReason, mergeTargetCandidateId]);

  const canSubmit = useMemo(() => {
    if (!supportPacketId.trim()) return false;
    if (!rationale.trim()) return false;
    if (requiresValidatePath) {
      if (!reviewerActorId.trim()) return false;
      return Object.values(validateFieldErrors).every((error) => error === null);
    }
    return decisionPathErrors === null;
  }, [requiresValidatePath, validateFieldErrors, decisionPathErrors, rationale, supportPacketId, reviewerActorId]);

  const parseLines = (text: string): string[] =>
    text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

  const handleSubmit = useCallback(async () => {
    if (!candidate || !canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Resume path: a previous attempt already committed N7 (adjudicate) but
      // N8 (human-confirm) failed; only re-issue N8 against the recorded result.
      let adjudicationResultId = pendingConfirmAdjudicationId;

      if (!adjudicationResultId) {
        const decisionPayload: Record<string, unknown> = {};
        if (requiresValidatePath) {
          decisionPayload.scope_confirmation = validateFields.scopeConfirmation.trim();
          decisionPayload.support_summary = validateFields.supportSummary.trim();
          decisionPayload.challenge_summary = validateFields.challengeSummary.trim();
          decisionPayload.blocker_summary = validateFields.blockerSummary.trim();
          decisionPayload.accepted_risk_summary = validateFields.acceptedRiskSummary.trim();
          decisionPayload.downstream_effect = validateFields.downstreamEffect.trim();
        }
        if (decision === 'merge' && mergeTargetCandidateId.trim() && candidateTitleCardId) {
          decisionPayload.merge_target_need_candidate_id = mergeTargetCandidateId.trim();
        }

        const body: AdjudicateNeedRequest = {
          support_packet_id: supportPacketId.trim(),
          final_decision: decision,
          rationale: rationale.trim(),
          loopback_target: loopbackTarget,
          required_actions: parseLines(requiredActionsText),
          gap_codes: parseLines(gapCodesText),
          decision_payload: decisionPayload,
        };
        if (humanRationale.trim()) {
          body.human_rationale = humanRationale.trim();
        }
        if (decision === 'reject') {
          body.rejected_reason = rejectedReason;
        }
        if (decision === 'request_searchplan_recheck') {
          body.searchplan_recheck_reason = searchplanRecheckReason.trim();
          body.searchplan_recheck_gap_codes = parseLines(gapCodesText);
        }
        if (decision === 'merge' && mergeTargetCandidateId.trim() && candidateTitleCardId) {
          body.merge_target_need_candidate_ref = {
            ref_type: 'need_candidate',
            ref_id: mergeTargetCandidateId.trim(),
            title_card_id: candidateTitleCardId,
          };
        }

        const result = await adjudicateNeed(candidate.need_candidate_id, body);

        // Non-validate decisions terminate at N7; a validate that already
        // carries a materialised ValidatedNeed is likewise complete.
        if (decision !== 'validate' || result.validated_need) {
          onSubmitted(result);
          onClose();
          return;
        }

        // Validate path: N7 only records the adjudication. The ValidatedNeed is
        // materialised by the N8 human-confirm below (same artifact the harness
        // produces in-process under human_delegated authority).
        adjudicationResultId = result.adjudication_result.adjudication_result_id;
        setPendingConfirmAdjudicationId(adjudicationResultId);
      }

      const confirmation = await confirmValidatedNeed(adjudicationResultId, {
        human_actor: { actor_type: 'human', actor_id: reviewerActorId.trim() },
        human_rationale: humanRationale.trim() || rationale.trim(),
      });
      setPendingConfirmAdjudicationId(null);
      onSubmitted({
        adjudication_result: confirmation.adjudication_result,
        need_candidate: confirmation.need_candidate,
        validated_need: confirmation.validated_need,
      });
      onClose();
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : '提交 adjudication 失败。');
    } finally {
      setSubmitting(false);
    }
  }, [
    candidate,
    canSubmit,
    decision,
    rationale,
    supportPacketId,
    requiresValidatePath,
    validateFields,
    loopbackTarget,
    requiredActionsText,
    gapCodesText,
    humanRationale,
    reviewerActorId,
    pendingConfirmAdjudicationId,
    rejectedReason,
    searchplanRecheckReason,
    mergeTargetCandidateId,
    candidateTitleCardId,
    onSubmitted,
    onClose,
  ]);

  if (!open || !candidate) {
    return null;
  }

  const activeOption = DECISION_OPTIONS.find((opt) => opt.value === decision) ?? DECISION_OPTIONS[0];
  // After N7 (adjudicate) commits a validate decision, only the N8 confirm retry
  // remains: lock the inputs that captured the N7 authority so the decision and
  // frozen evidence cannot drift while the materialisation is pending.
  const pendingConfirm = pendingConfirmAdjudicationId !== null;

  return (
    <article data-ui="card" data-padding="md" data-elevation="md">
      <div data-ui="stack" data-direction="col" data-gap="3">
        <header>
          <div data-ui="toolbar" data-align="between" data-wrap="wrap">
            <div data-ui="stack" data-direction="col" data-gap="1">
              <p data-ui="text" data-variant="h3" data-tone="primary">Adjudicate NeedCandidate</p>
              <p data-ui="text" data-variant="caption" data-tone="muted">
                {candidate.need_candidate_id}
              </p>
            </div>
            <button
              type="button"
              data-ui="icon-button"
              data-variant="ghost"
              data-size="sm"
              aria-label="关闭"
              onClick={onClose}
            >
              ×
            </button>
          </div>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            design-spec §4039 红线：validate 路径强制 6 段人审确认；其它路径需声明 rationale 与回流目标。
          </p>
        </header>

        <section data-ui="section" data-padding="sm">
          <div data-ui="stack" data-direction="col" data-gap="1">
            <p data-ui="text" data-variant="label" data-tone="primary">Subject</p>
            <p data-ui="text" data-variant="body" data-tone="primary">{candidate.candidate_need}</p>
            <p data-ui="text" data-variant="caption" data-tone="muted">
              unmet need：{candidate.unmet_need_statement}
            </p>
            <p data-ui="text" data-variant="caption" data-tone="muted">
              decision_status={candidate.decision_status} · lifecycle={candidate.lifecycle_status}
            </p>
          </div>
        </section>

        <section data-ui="section" data-padding="sm">
          <div data-ui="stack" data-direction="col" data-gap="1">
            <p data-ui="text" data-variant="label" data-tone="primary">Decision</p>
            <select
              data-ui="select"
              data-size="md"
              value={decision}
              disabled={pendingConfirm}
              onChange={(event) =>
                setDecision(event.target.value as TopicSelectionNeedAdjudicationDecision)
              }
            >
              {DECISION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p data-ui="text" data-variant="caption" data-tone="muted">
              {pendingConfirm
                ? 'N7 裁决已提交，decision 已锁定；请重试 N8 确认或取消。'
                : activeOption.description}
            </p>
          </div>
        </section>

        <section data-ui="section" data-padding="sm">
          <div data-ui="stack" data-direction="col" data-gap="1">
            <p data-ui="text" data-variant="label" data-tone="primary">Support packet</p>
            {packetLoading ? (
              <p data-ui="text" data-variant="caption" data-tone="muted">加载 support packet…</p>
            ) : packetError ? (
              <p data-ui="text" data-variant="caption" data-tone="danger">{packetError}</p>
            ) : packets.length === 0 ? (
              <div data-ui="stack" data-direction="col" data-gap="1">
                <div data-ui="stack" data-direction="row" data-gap="1" data-align="center" data-wrap="wrap">
                  <span data-ui="badge" data-variant="subtle" data-tone="warning">无 support packet</span>
                  <p data-ui="text" data-variant="caption" data-tone="muted">
                    先回到 NeedCandidate surface 创建 readiness + support packet；或在下方手填已有 packet ID。
                  </p>
                </div>
                <input
                  data-ui="input"
                  data-size="sm"
                  placeholder="validation_support_packet_id"
                  value={supportPacketId}
                  disabled={pendingConfirm}
                  onChange={(event) => setSupportPacketId(event.target.value)}
                />
              </div>
            ) : (
              <select
                data-ui="select"
                data-size="md"
                value={supportPacketId}
                disabled={pendingConfirm}
                onChange={(event) => setSupportPacketId(event.target.value)}
              >
                {packets.map((packet) => (
                  <option key={packet.validation_support_packet_id} value={packet.validation_support_packet_id}>
                    {packet.validation_support_packet_id}（{packet.packet_status}）
                  </option>
                ))}
              </select>
            )}
          </div>
        </section>

        {requiresValidatePath ? (
          <>
            <ValidateField
              label="① 确认范围（subject + scope being claimed）"
              value={validateFields.scopeConfirmation}
              error={validateFieldErrors.scopeConfirmation}
              onChange={(value) => setValidateFields((current) => ({ ...current, scopeConfirmation: value }))}
              placeholder="正在确认：在 [scope X] 内，[mechanism Y] 类的 unmet need 成立 …"
              rows={3}
              disabled={pendingConfirm}
            />
            <ValidateField
              label="② 证据（what supports it）"
              value={validateFields.supportSummary}
              error={validateFieldErrors.supportSummary}
              onChange={(value) => setValidateFields((current) => ({ ...current, supportSummary: value }))}
              placeholder="主要 support：[support unit a / b / c] … strength 评估 …"
              rows={3}
              disabled={pendingConfirm}
            />
            <ValidateField
              label="③ 反证（counter-evidence / unresolved objections）"
              value={validateFields.challengeSummary}
              error={validateFieldErrors.challengeSummary}
              onChange={(value) => setValidateFields((current) => ({ ...current, challengeSummary: value }))}
              placeholder="保留的 challenge：[challenge x] 已记录但接受；conflict_refs … 处理 …"
              rows={3}
              disabled={pendingConfirm}
            />
            <ValidateField
              label="④ Blocker（open blockers being tolerated）"
              value={validateFields.blockerSummary}
              error={validateFieldErrors.blockerSummary}
              onChange={(value) => setValidateFields((current) => ({ ...current, blockerSummary: value }))}
              placeholder="open recheck refs / 待解决 blocker；如无写「无未解 blocker」"
              rows={2}
              disabled={pendingConfirm}
            />
            <ValidateField
              label="⑤ Accepted risk（scope / 原因 / expiry / recheck condition）"
              value={validateFields.acceptedRiskSummary}
              error={validateFieldErrors.acceptedRiskSummary}
              onChange={(value) => setValidateFields((current) => ({ ...current, acceptedRiskSummary: value }))}
              placeholder="accepted risk 列表：scope=[…] reason=[…] expiry=[…] recheck=[…]"
              rows={3}
              disabled={pendingConfirm}
            />
            <ValidateField
              label="⑥ Downstream effect（v1b 继承什么）"
              value={validateFields.downstreamEffect}
              error={validateFieldErrors.downstreamEffect}
              onChange={(value) => setValidateFields((current) => ({ ...current, downstreamEffect: value }))}
              placeholder="对 v1b 的影响：claim ceiling=[…]，资源约束=[…]，non-goal=[…]"
              rows={3}
              disabled={pendingConfirm}
            />
            <section data-ui="section" data-padding="sm">
              <div data-ui="stack" data-direction="col" data-gap="1">
                <p data-ui="text" data-variant="label" data-tone="primary">Reviewer actor_id（必填，记入 human-confirm）</p>
                <input
                  data-ui="input"
                  data-size="md"
                  value={reviewerActorId}
                  onChange={(event) => setReviewerActorId(event.target.value)}
                  placeholder="reviewer-id"
                />
                <p data-ui="text" data-variant="caption" data-tone="muted">
                  validate 将连发 N7 裁决 + N8 人审确认，一步物化 ValidatedNeed（与 harness 的 human_delegated 路径产出同一对象）。
                </p>
              </div>
            </section>
          </>
        ) : (
          <DecisionPathFields
            decision={decision}
            rejectedReason={rejectedReason}
            onRejectedReasonChange={setRejectedReason}
            loopbackTarget={loopbackTarget}
            onLoopbackTargetChange={setLoopbackTarget}
            searchplanRecheckReason={searchplanRecheckReason}
            onSearchplanRecheckReasonChange={setSearchplanRecheckReason}
            mergeTargetCandidateId={mergeTargetCandidateId}
            onMergeTargetCandidateIdChange={setMergeTargetCandidateId}
            decisionPathError={decisionPathErrors}
          />
        )}

        <section data-ui="section" data-padding="sm">
          <div data-ui="stack" data-direction="col" data-gap="1">
            <p data-ui="text" data-variant="label" data-tone="primary">Rationale（必填）</p>
            <textarea
              data-ui="textarea"
              data-size="md"
              rows={3}
              placeholder="One-paragraph rationale that summarises why this decision is correct."
              value={rationale}
              onChange={(event) => setRationale(event.target.value)}
            />
          </div>
        </section>

        <section data-ui="section" data-padding="sm">
          <div data-ui="grid" data-cols="2" data-gap="2">
            <div data-ui="stack" data-direction="col" data-gap="1">
              <p data-ui="text" data-variant="label" data-tone="muted">Required actions（每行一条）</p>
              <textarea
                data-ui="textarea"
                data-size="sm"
                rows={3}
                value={requiredActionsText}
                onChange={(event) => setRequiredActionsText(event.target.value)}
              />
            </div>
            <div data-ui="stack" data-direction="col" data-gap="1">
              <p data-ui="text" data-variant="label" data-tone="muted">Gap codes（每行一条）</p>
              <textarea
                data-ui="textarea"
                data-size="sm"
                rows={3}
                value={gapCodesText}
                onChange={(event) => setGapCodesText(event.target.value)}
              />
            </div>
          </div>
          <div data-ui="stack" data-direction="col" data-gap="1">
            <p data-ui="text" data-variant="label" data-tone="muted">Human rationale（可选，记入 human_rationale）</p>
            <textarea
              data-ui="textarea"
              data-size="sm"
              rows={2}
              value={humanRationale}
              onChange={(event) => setHumanRationale(event.target.value)}
            />
          </div>
        </section>

        {pendingConfirmAdjudicationId ? (
          <div data-ui="alert" data-tone="warning">
            <p data-ui="text" data-variant="caption" data-tone="primary">
              N7 裁决已记录（{pendingConfirmAdjudicationId}）；再次提交只重试 N8 人审确认以物化 ValidatedNeed。
            </p>
          </div>
        ) : null}
        {submitError ? (
          <p data-ui="text" data-variant="caption" data-tone="danger">{submitError}</p>
        ) : null}

        <footer>
          <div data-ui="toolbar" data-align="between" data-wrap="wrap">
            <button
              type="button"
              data-ui="button"
              data-variant="ghost"
              data-size="md"
              onClick={onClose}
              disabled={submitting}
            >
              取消
            </button>
            {canSubmit ? (
              <button
                type="button"
                data-ui="button"
                data-variant="primary"
                data-size="md"
                onClick={() => void handleSubmit()}
                disabled={submitting}
              >
                {submitting ? '提交中…' : `提交 ${activeOption.label.split(' · ')[0]}`}
              </button>
            ) : (
              <button
                type="button"
                data-ui="button"
                data-variant="secondary"
                data-size="md"
                onClick={() => void handleSubmit()}
                disabled
              >
                提交 {activeOption.label.split(' · ')[0]}
              </button>
            )}
          </div>
        </footer>
      </div>
    </article>
  );
}

type ValidateFieldProps = {
  label: string;
  value: string;
  error: string | null;
  onChange: (value: string) => void;
  placeholder: string;
  rows: number;
  disabled?: boolean;
};

function ValidateField({ label, value, error, onChange, placeholder, rows, disabled }: ValidateFieldProps) {
  return (
    <section data-ui="section" data-padding="sm">
      <div data-ui="stack" data-direction="col" data-gap="1">
        <p data-ui="text" data-variant="label" data-tone="primary">{label}</p>
        <textarea
          data-ui="textarea"
          data-size="md"
          rows={rows}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
        {error ? (
          <p data-ui="text" data-variant="caption" data-tone="danger">{error}</p>
        ) : null}
      </div>
    </section>
  );
}

type DecisionPathFieldsProps = {
  decision: TopicSelectionNeedAdjudicationDecision;
  rejectedReason: TopicSelectionNeedRejectedReason;
  onRejectedReasonChange: (value: TopicSelectionNeedRejectedReason) => void;
  loopbackTarget: TopicSelectionNeedLoopbackTarget;
  onLoopbackTargetChange: (value: TopicSelectionNeedLoopbackTarget) => void;
  searchplanRecheckReason: string;
  onSearchplanRecheckReasonChange: (value: string) => void;
  mergeTargetCandidateId: string;
  onMergeTargetCandidateIdChange: (value: string) => void;
  decisionPathError: string | null;
};

function DecisionPathFields({
  decision,
  rejectedReason,
  onRejectedReasonChange,
  loopbackTarget,
  onLoopbackTargetChange,
  searchplanRecheckReason,
  onSearchplanRecheckReasonChange,
  mergeTargetCandidateId,
  onMergeTargetCandidateIdChange,
  decisionPathError,
}: DecisionPathFieldsProps) {
  return (
    <section data-ui="section" data-padding="sm">
      <div data-ui="stack" data-direction="col" data-gap="2">
        <div data-ui="stack" data-direction="col" data-gap="1">
          <p data-ui="text" data-variant="label" data-tone="primary">Loopback target</p>
          <select
            data-ui="select"
            data-size="md"
            value={loopbackTarget}
            onChange={(event) => onLoopbackTargetChange(event.target.value as TopicSelectionNeedLoopbackTarget)}
          >
            {LOOPBACK_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {decision === 'reject' ? (
          <div data-ui="stack" data-direction="col" data-gap="1">
            <p data-ui="text" data-variant="label" data-tone="primary">Rejected reason</p>
            <select
              data-ui="select"
              data-size="md"
              value={rejectedReason}
              onChange={(event) => onRejectedReasonChange(event.target.value as TopicSelectionNeedRejectedReason)}
            >
              {REJECTED_REASON_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        ) : null}

        {decision === 'request_searchplan_recheck' ? (
          <div data-ui="stack" data-direction="col" data-gap="1">
            <p data-ui="text" data-variant="label" data-tone="primary">Recheck reason（必填）</p>
            <input
              data-ui="input"
              data-size="md"
              value={searchplanRecheckReason}
              onChange={(event) => onSearchplanRecheckReasonChange(event.target.value)}
              placeholder="e.g. baseline 2022-2024 coverage 缺失"
            />
          </div>
        ) : null}

        {decision === 'merge' ? (
          <div data-ui="stack" data-direction="col" data-gap="1">
            <p data-ui="text" data-variant="label" data-tone="primary">Merge target need_candidate_id（必填）</p>
            <input
              data-ui="input"
              data-size="md"
              value={mergeTargetCandidateId}
              onChange={(event) => onMergeTargetCandidateIdChange(event.target.value)}
              placeholder="need_candidate_xxx"
            />
          </div>
        ) : null}

        {decisionPathError ? (
          <p data-ui="text" data-variant="caption" data-tone="danger">{decisionPathError}</p>
        ) : null}
      </div>
    </section>
  );
}
