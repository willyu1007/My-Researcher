import { useEffect, useState } from 'react';
import { ReviewerCardEmpty } from './ReviewerCard';
import type {
  TopicSelectionAcceptedRiskRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-recheck-risk-memory-contracts';
import { createAcceptedRisk, listAcceptedRisksByTitleCard } from '../api/v1a';

/** A selectable target object for an accepted-risk, built by V1aStageView from the v1a objects it already loads. */
export type AcceptedRiskTargetOption = {
  ref_type: string;
  ref_id: string;
  version_id?: string | null;
  label: string;
};

type AcceptedRiskCardProps = {
  titleCardId: string | null;
  targetOptions: AcceptedRiskTargetOption[];
  refreshToken: number;
  onMutated?: () => void;
};

const SEVERITIES = ['info', 'warning', 'blocking', 'critical'] as const;
const PREVIEW_LIMIT = 8;

function SeverityBadge({ severity }: { severity: TopicSelectionAcceptedRiskRecord['severity'] }) {
  if (severity === 'critical' || severity === 'blocking') {
    return <span data-ui="badge" data-variant="subtle" data-tone="danger">{severity}</span>;
  }
  if (severity === 'warning') {
    return <span data-ui="badge" data-variant="subtle" data-tone="warning">warning</span>;
  }
  return <span data-ui="badge" data-variant="subtle" data-tone="info">{severity}</span>;
}

function RiskStatusBadge({ status }: { status: TopicSelectionAcceptedRiskRecord['status'] }) {
  if (status === 'active') {
    return <span data-ui="badge" data-variant="solid" data-tone="success">active</span>;
  }
  if (status === 'resolved') {
    return <span data-ui="badge" data-variant="subtle" data-tone="info">resolved</span>;
  }
  return <span data-ui="badge" data-variant="subtle" data-tone="neutral">{status}</span>;
}

/**
 * Phase 5 — AcceptedRisk reviewer surface (v1a). Lists accepted risks for the
 * title-card and lets a human RECORD a new one via the guardedDirectWrite route
 * `POST /topic-selection/v1a/accepted-risks` (human-authority; the runtime then
 * consumes `accepted_risk_refs` on gates/transitions — compatible with the
 * harness, not a bypass). Minimal form: pick a target object from the v1a
 * objects, risk_type + severity + rationale + an expiry/recheck condition.
 */
export function AcceptedRiskCard({ titleCardId, targetOptions, refreshToken, onMutated }: AcceptedRiskCardProps) {
  const [risks, setRisks] = useState<TopicSelectionAcceptedRiskRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [targetKey, setTargetKey] = useState('');
  const [riskType, setRiskType] = useState('');
  const [severity, setSeverity] = useState<TopicSelectionAcceptedRiskRecord['severity']>('warning');
  const [rationale, setRationale] = useState('');
  const [recheckCondition, setRecheckCondition] = useState('');
  const [expiresAtLocal, setExpiresAtLocal] = useState('');
  const [reviewerActorId, setReviewerActorId] = useState('reviewer');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recordedId, setRecordedId] = useState<string | null>(null);
  const [localRefresh, setLocalRefresh] = useState(0);

  useEffect(() => {
    if (!titleCardId) {
      setRisks([]);
      return;
    }
    let mounted = true;
    setLoading(true);
    setLoadError(null);
    void listAcceptedRisksByTitleCard(titleCardId)
      .then((items) => {
        if (mounted) setRisks(items);
      })
      .catch((caught) => {
        if (mounted) setLoadError(caught instanceof Error ? caught.message : '加载 accepted risks 失败。');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [titleCardId, refreshToken, localRefresh]);

  if (!titleCardId) {
    return (
      <article data-ui="card">
        <p data-ui="text" data-variant="caption" data-tone="muted">请先选择一个题目卡。</p>
      </article>
    );
  }

  const selectedTarget = targetOptions.find((option) => `${option.ref_type}|${option.ref_id}` === targetKey) ?? null;
  const canSubmit = selectedTarget !== null
    && riskType.trim() !== ''
    && rationale.trim() !== ''
    && reviewerActorId.trim() !== ''
    && (recheckCondition.trim() !== '' || expiresAtLocal.trim() !== '')
    && !submitting;

  const handleSubmit = async () => {
    if (!selectedTarget) return;
    setSubmitting(true);
    setSubmitError(null);
    setRecordedId(null);
    const targetRef = {
      ref_type: selectedTarget.ref_type,
      ref_id: selectedTarget.ref_id,
      version_id: selectedTarget.version_id ?? null,
      title_card_id: titleCardId,
    };
    let expiresAtIso: string | null = null;
    if (expiresAtLocal.trim() !== '') {
      const parsed = new Date(expiresAtLocal);
      expiresAtIso = Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }
    try {
      const created = await createAcceptedRisk({
        title_card_id: titleCardId,
        risk_type: riskType.trim(),
        target_ref: targetRef,
        scope_refs: [targetRef],
        severity,
        rationale: rationale.trim(),
        accepted_by: { actor_type: 'human', actor_id: reviewerActorId.trim() },
        recheck_condition: recheckCondition.trim() || null,
        expires_at: expiresAtIso,
      });
      setRecordedId(created.accepted_risk_id);
      setRiskType('');
      setRationale('');
      setRecheckCondition('');
      setExpiresAtLocal('');
      setLocalRefresh((token) => token + 1);
      onMutated?.();
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : '记录 accepted risk 失败。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article data-ui="card" data-padding="md">
      <div data-ui="stack" data-direction="col" data-gap="3">
        <div data-ui="stack" data-direction="col" data-gap="1">
          <p data-ui="text" data-variant="label" data-tone="primary">AcceptedRisk（人审接受风险）</p>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            为某个 v1a 对象正式接受一项有界风险，经 guardedDirectWrite 人审路径写入；runtime 的 gate/transition 会消费 accepted_risk_refs。
          </p>
        </div>

        <div data-ui="stack" data-direction="col" data-gap="1">
          <p data-ui="text" data-variant="caption" data-tone="primary">已记录（{risks.length}）</p>
          {loading ? (
            <p data-ui="text" data-variant="caption" data-tone="muted">加载中…</p>
          ) : loadError ? (
            <p data-ui="text" data-variant="caption" data-tone="danger">{loadError}</p>
          ) : risks.length === 0 ? (
            <ReviewerCardEmpty label="该题目卡还没有 accepted risk。" />
          ) : (
            <>
              <ul data-ui="stack" data-direction="col" data-gap="2">
                {risks.slice(0, PREVIEW_LIMIT).map((risk) => (
                  <li key={risk.accepted_risk_id}>
                    <div data-ui="stack" data-direction="col" data-gap="0">
                      <div data-ui="stack" data-direction="row" data-gap="1" data-align="center" data-wrap="wrap">
                        <SeverityBadge severity={risk.severity} />
                        <RiskStatusBadge status={risk.status} />
                        <span data-ui="text" data-variant="caption" data-tone="primary">{risk.risk_type}</span>
                        <span data-ui="text" data-variant="caption" data-tone="muted">
                          → {risk.target_ref.ref_type}:{risk.target_ref.ref_id.slice(0, 12)}…
                        </span>
                      </div>
                      <p data-ui="text" data-variant="caption" data-tone="muted">{risk.rationale}</p>
                      <p data-ui="text" data-variant="caption" data-tone="muted">
                        {risk.expires_at ? `expires_at=${risk.expires_at}` : null}
                        {risk.recheck_condition ? ` · recheck：${risk.recheck_condition}` : null}
                        {risk.expiry_condition ? ` · expiry：${risk.expiry_condition}` : null}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {risks.length > PREVIEW_LIMIT ? (
                <p data-ui="text" data-variant="caption" data-tone="muted">
                  +{risks.length - PREVIEW_LIMIT} 更多（仅显示最近 {PREVIEW_LIMIT} 条）
                </p>
              ) : null}
            </>
          )}
        </div>

        <div data-ui="stack" data-direction="col" data-gap="2">
          <p data-ui="text" data-variant="caption" data-tone="primary">记录新的 accepted risk</p>
          {targetOptions.length === 0 ? (
            <ReviewerCardEmpty label="没有可选的 v1a 目标对象（先生成 NeedCandidate / ValidatedNeed / EvidenceMap / SearchPlan）。" />
          ) : (
            <>
              <div data-ui="stack" data-direction="col" data-gap="1">
                <p data-ui="text" data-variant="caption" data-tone="muted">目标对象（target_ref，必填）</p>
                <select
                  data-ui="select"
                  data-size="md"
                  value={targetKey}
                  onChange={(event) => {
                    setTargetKey(event.target.value);
                    setRecordedId(null);
                  }}
                >
                  <option value="">— 选择目标对象 —</option>
                  {targetOptions.map((option) => (
                    <option key={`${option.ref_type}|${option.ref_id}`} value={`${option.ref_type}|${option.ref_id}`}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div data-ui="stack" data-direction="col" data-gap="1">
                <p data-ui="text" data-variant="caption" data-tone="muted">risk_type（必填）</p>
                <input
                  data-ui="input"
                  data-size="md"
                  value={riskType}
                  onChange={(event) => setRiskType(event.target.value)}
                  placeholder="如：residual_coverage_gap"
                />
              </div>
              <div data-ui="stack" data-direction="col" data-gap="1">
                <p data-ui="text" data-variant="caption" data-tone="muted">severity</p>
                <select
                  data-ui="select"
                  data-size="sm"
                  value={severity}
                  onChange={(event) => setSeverity(event.target.value as TopicSelectionAcceptedRiskRecord['severity'])}
                >
                  {SEVERITIES.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
              <div data-ui="stack" data-direction="col" data-gap="1">
                <p data-ui="text" data-variant="caption" data-tone="muted">rationale（必填）</p>
                <textarea
                  data-ui="textarea"
                  data-size="md"
                  rows={2}
                  value={rationale}
                  onChange={(event) => setRationale(event.target.value)}
                  placeholder="为什么这项风险是有界、可接受的"
                />
              </div>
              <div data-ui="stack" data-direction="col" data-gap="1">
                <p data-ui="text" data-variant="caption" data-tone="muted">recheck_condition（与 expires_at 至少填一项）</p>
                <input
                  data-ui="input"
                  data-size="md"
                  value={recheckCondition}
                  onChange={(event) => setRecheckCondition(event.target.value)}
                  placeholder="如：new counter-evidence appears"
                />
              </div>
              <div data-ui="stack" data-direction="col" data-gap="1">
                <p data-ui="text" data-variant="caption" data-tone="muted">expires_at（可选）</p>
                <input
                  data-ui="input"
                  data-size="sm"
                  type="datetime-local"
                  value={expiresAtLocal}
                  onChange={(event) => setExpiresAtLocal(event.target.value)}
                />
              </div>
              <div data-ui="stack" data-direction="col" data-gap="1">
                <p data-ui="text" data-variant="caption" data-tone="muted">accepted_by actor_id（必填）</p>
                <input
                  data-ui="input"
                  data-size="sm"
                  value={reviewerActorId}
                  onChange={(event) => setReviewerActorId(event.target.value)}
                  placeholder="reviewer-id"
                />
              </div>
              {recordedId ? (
                <div data-ui="alert" data-tone="success">
                  <p data-ui="text" data-variant="caption" data-tone="primary">
                    已记录 accepted risk（{recordedId.slice(0, 16)}…，status=active）。
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
                  {submitting ? '提交中…' : '记录 accepted risk'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
