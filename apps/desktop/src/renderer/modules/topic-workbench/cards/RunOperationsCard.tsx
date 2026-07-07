import { useEffect, useMemo, useState } from 'react';
import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionTraceSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  N6_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE,
  N8_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE,
  TOPIC_SELECTION_LOOPBACK_BUDGET_RAISE_SCHEMA_VERSION,
  TOPIC_SELECTION_STAKEHOLDER_SIGN_OFF_SCHEMA_VERSION,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import {
  getWorkflowRunState,
  getWorkflowTraceSnapshot,
  listWorkflowRunArtifacts,
  recordLoopbackBudgetRaise,
  recordProvisionalSignOff,
  type V1bRunNodeStateView,
  type V1bRunStateView,
} from '../api/v1b';

type RunOperationsCardProps = {
  /** Distinct workflow_run_ids discovered on the title-card's loaded v1b records (quick-pick). */
  candidateRunIds: string[];
  refreshToken: number;
};

/** W-15 D1(c) gate nodes — the two provisional-tripwire anchors (coordinator-enforced). */
const PROVISIONAL_GATE_NODES = [
  {
    node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
    warning_code: N6_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE.warning_code,
  },
  {
    node_id: 'topic-selection.v1b.assess-topic-value.v1',
    warning_code: N8_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE.warning_code,
  },
] as const;

type ProvisionalGateWarningCode = (typeof PROVISIONAL_GATE_NODES)[number]['warning_code'];

/** Short human label: "N6 · generate-topic-question-candidates". */
function nodeLabel(node: V1bRunNodeStateView): string {
  const tail = node.node_id.replace(/^topic-selection\.v1b\./, '').replace(/\.v\d+$/, '');
  return `N${node.node_index} · ${tail}`;
}

/** Literal-tone gate badge (contract-dynamic gate rule: no computed data-tone). */
function GateStatusBadge({ status }: { status: string }) {
  if (status === 'admitted') {
    return <span data-ui="badge" data-variant="subtle" data-tone="success">admitted</span>;
  }
  if (status === 'admitted_with_warnings') {
    return <span data-ui="badge" data-variant="subtle" data-tone="warning">admitted_with_warnings</span>;
  }
  if (status === 'blocked') {
    return <span data-ui="badge" data-variant="subtle" data-tone="danger">blocked</span>;
  }
  return <span data-ui="badge" data-variant="subtle" data-tone="neutral">{status}</span>;
}

function RouteDecisionBadge({ decision }: { decision: string }) {
  if (decision === 'invoke_next') {
    return <span data-ui="badge" data-variant="subtle" data-tone="info">invoke_next</span>;
  }
  if (decision === 'loopback') {
    return <span data-ui="badge" data-variant="subtle" data-tone="warning">loopback</span>;
  }
  if (decision === 'stop_v1b_complete') {
    return <span data-ui="badge" data-variant="subtle" data-tone="success">stop_v1b_complete</span>;
  }
  return <span data-ui="badge" data-variant="subtle" data-tone="neutral">{decision}</span>;
}

type SignOffTarget = {
  node: V1bRunNodeStateView;
  warning_code: ProvisionalGateWarningCode;
  node_attempt_id: string;
  /** The tripwire attempt's trace ref (may differ from the node's LATEST attempt — for N6
   *  the anchor is the earlier escalation-loopback attempt). */
  trace_snapshot_ref_id: string | null;
  /** Display heuristic only — the coordinator's gate stays the authority. */
  existing: TopicSelectionArtifactRefRecord | null;
};

function findRunOverrideSignOff(
  artifacts: TopicSelectionArtifactRefRecord[],
  workflowRunId: string,
  nodeId: string,
  nodeAttemptId: string,
  warningCode: string,
): TopicSelectionArtifactRefRecord | null {
  return artifacts.find((artifact) => {
    const payload = artifact.payload as Record<string, unknown> | null | undefined;
    return payload?.schema_version === TOPIC_SELECTION_STAKEHOLDER_SIGN_OFF_SCHEMA_VERSION
      && payload?.sign_off_scope === 'provisional_threshold_run_override'
      && payload?.workflow_run_id === workflowRunId
      && payload?.node_id === nodeId
      && payload?.node_attempt_id === nodeAttemptId
      && payload?.gate_warning_code === warningCode;
  }) ?? null;
}

/**
 * W-15 O-1 — per-tripwire sign-off form. The record POST is idempotent on the backend
 * (identical sign-off returns already_recorded) and the target is re-validated against
 * the run's CURRENT tripwire attempt, so a stale form cannot mis-anchor.
 */
function SignOffForm({
  workflowRunId,
  target,
  onRecorded,
}: {
  workflowRunId: string;
  target: SignOffTarget;
  onRecorded: () => void;
}) {
  const [actorId, setActorId] = useState('');
  const [rationale, setRationale] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = actorId.trim() !== '' && rationale.trim() !== '' && !submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await recordProvisionalSignOff(workflowRunId, {
        schema_version: TOPIC_SELECTION_STAKEHOLDER_SIGN_OFF_SCHEMA_VERSION,
        // Deterministic per anchor attempt → an accidental double-submit resolves to
        // the backend's idempotent already_recorded path instead of a second record.
        sign_off_id: `sign_off_${target.node_attempt_id}`,
        sign_off_scope: 'provisional_threshold_run_override',
        gate_warning_code: target.warning_code,
        signed_by: { actor_type: 'human', actor_id: actorId.trim() },
        signed_at: new Date().toISOString(),
        rationale: rationale.trim(),
        workflow_run_id: workflowRunId,
        node_id: target.node.node_id,
        node_attempt_id: target.node_attempt_id,
      });
      onRecorded();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '记录签核失败。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-ui="stack" data-direction="col" data-gap="1">
      <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap" data-align="center">
        <input
          data-ui="input"
          data-size="sm"
          value={actorId}
          onChange={(event) => setActorId(event.target.value)}
          placeholder="签核人 actor_id（必填）"
        />
      </div>
      <textarea
        data-ui="textarea"
        data-size="sm"
        rows={2}
        value={rationale}
        onChange={(event) => setRationale(event.target.value)}
        placeholder="Rationale（必填）：为何接受 provisional 阈值下的本次结果继续推进"
      />
      {error ? (
        <p data-ui="text" data-variant="caption" data-tone="danger">{error}</p>
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
          {submitting ? '记录中…' : '记录 run-override 签核'}
        </button>
      </div>
    </div>
  );
}

/**
 * W-15 O-2 — audited loopback-budget raise. Hard-capped at 5 by the shared schema;
 * the coordinator's effective budget is max(call parameter, highest recorded raise).
 */
function BudgetRaiseForm({
  workflowRunId,
  nodes,
  onRecorded,
}: {
  workflowRunId: string;
  nodes: V1bRunNodeStateView[];
  onRecorded: () => void;
}) {
  const defaultNode = nodes.find((node) => (node.latest?.route_decision ?? '') === 'loopback')
    ?? nodes.find((node) => node.loopback_count > 0)
    ?? nodes[0];
  const [nodeId, setNodeId] = useState(defaultNode?.node_id ?? '');
  const [raisedTo, setRaisedTo] = useState('3');
  const [actorId, setActorId] = useState('');
  const [rationale, setRationale] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordedNote, setRecordedNote] = useState<string | null>(null);
  const canSubmit = nodeId !== '' && actorId.trim() !== '' && rationale.trim() !== '' && !submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setRecordedNote(null);
    try {
      await recordLoopbackBudgetRaise(workflowRunId, {
        schema_version: TOPIC_SELECTION_LOOPBACK_BUDGET_RAISE_SCHEMA_VERSION,
        raise_id: `raise_${nodeId.split('.').slice(-2, -1)[0] ?? 'node'}_${Date.now()}`,
        workflow_run_id: workflowRunId,
        node_id: nodeId,
        raised_to: Number(raisedTo),
        rationale: rationale.trim(),
        raised_by: { actor_type: 'human', actor_id: actorId.trim() },
        raised_at: new Date().toISOString(),
      });
      setRationale('');
      setRecordedNote(`已记录提额：${nodeId} → ${raisedTo}`);
      onRecorded();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '记录提额失败。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-ui="stack" data-direction="col" data-gap="1">
      <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap" data-align="center">
        <select
          data-ui="select"
          data-size="sm"
          value={nodeId}
          onChange={(event) => setNodeId(event.target.value)}
        >
          {nodes.map((node) => (
            <option key={node.node_id} value={node.node_id}>
              {nodeLabel(node)}（loopback×{node.loopback_count}）
            </option>
          ))}
        </select>
        <select
          data-ui="select"
          data-size="sm"
          value={raisedTo}
          onChange={(event) => setRaisedTo(event.target.value)}
        >
          {['1', '2', '3', '4', '5'].map((value) => (
            <option key={value} value={value}>raised_to = {value}</option>
          ))}
        </select>
        <input
          data-ui="input"
          data-size="sm"
          value={actorId}
          onChange={(event) => setActorId(event.target.value)}
          placeholder="操作员 actor_id（必填）"
        />
      </div>
      <textarea
        data-ui="textarea"
        data-size="sm"
        rows={2}
        value={rationale}
        onChange={(event) => setRationale(event.target.value)}
        placeholder="Rationale（必填）：为何该节点需要更多 loopback 预算"
      />
      {recordedNote ? (
        <div data-ui="alert" data-tone="success">
          <p data-ui="text" data-variant="caption" data-tone="primary">{recordedNote}</p>
        </div>
      ) : null}
      {error ? (
        <p data-ui="text" data-variant="caption" data-tone="danger">{error}</p>
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
          {submitting ? '记录中…' : '记录预算提额'}
        </button>
        <span data-ui="text" data-variant="caption" data-tone="muted">
          生效预算 = max(默认/调用参数, 已记录提额)，硬上限 5（schema 强制）。
        </span>
      </div>
    </div>
  );
}

/**
 * W-15 Trace 只读抽屉 — resolves the attempt's trace_snapshot_ref. Metadata / hashes /
 * refs render directly; the snapshot payload (already the redaction pipeline's output —
 * unredacted originals never reach the trace store) expands only on a second click.
 * Read-only by construction: no write path exists on this surface.
 */
function TraceDrawer({ traceSnapshotId }: { traceSnapshotId: string }) {
  const [record, setRecord] = useState<TopicSelectionTraceSnapshotRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payloadOpen, setPayloadOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setRecord(null);
    setPayloadOpen(false);
    void getWorkflowTraceSnapshot(traceSnapshotId)
      .then((snapshot) => {
        if (mounted) setRecord(snapshot);
      })
      .catch((caught) => {
        if (mounted) setError(caught instanceof Error ? caught.message : '加载 trace snapshot 失败。');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [traceSnapshotId]);

  if (loading) {
    return <p data-ui="text" data-variant="caption" data-tone="muted">加载 trace snapshot…</p>;
  }
  if (error) {
    return <p data-ui="text" data-variant="caption" data-tone="danger">{error}</p>;
  }
  if (!record) {
    return null;
  }

  const refGroups: Array<{ label: string; refs: Array<{ ref_type: string; ref_id: string }> }> = [
    { label: 'object_refs', refs: record.object_refs },
    { label: 'lineage_link_refs', refs: record.lineage_link_refs },
    { label: 'artifact_refs', refs: record.artifact_refs },
    { label: 'quality_signal_refs', refs: record.quality_signal_refs },
    { label: 'transition_attempt_refs', refs: record.transition_attempt_refs },
  ];

  return (
    <div data-ui="stack" data-direction="col" data-gap="1">
      <div data-ui="stack" data-direction="row" data-gap="2" data-wrap="wrap" data-align="center">
        <span data-ui="badge" data-variant="subtle" data-tone="info">trace</span>
        <span data-ui="text" data-variant="caption" data-tone="primary">{record.trace_snapshot_id}</span>
        <span data-ui="text" data-variant="caption" data-tone="muted">
          target {record.target_ref.ref_type}:{record.target_ref.ref_id} · by {record.created_by} · {record.created_at}
        </span>
      </div>
      <p data-ui="text" data-variant="caption" data-tone="muted">snapshot_hash：{record.snapshot_hash}</p>
      {refGroups.filter((group) => group.refs.length > 0).map((group) => (
        <div key={group.label} data-ui="stack" data-direction="col" data-gap="0">
          <p data-ui="text" data-variant="caption" data-tone="muted">{group.label}（{group.refs.length}）</p>
          {group.refs.map((ref) => (
            <p key={`${group.label}-${ref.ref_id}`} data-ui="text" data-variant="caption" data-tone="primary">
              {ref.ref_type}:{ref.ref_id}
            </p>
          ))}
        </div>
      ))}
      <div data-ui="stack" data-direction="row" data-gap="1" data-align="center">
        <button
          type="button"
          data-ui="button"
          data-variant="ghost"
          data-size="sm"
          onClick={() => setPayloadOpen((open) => !open)}
        >
          {payloadOpen ? '收起 payload' : '展开 payload（redaction 管道产物，无未脱敏原文）'}
        </button>
      </div>
      {payloadOpen ? (
        <textarea
          data-ui="textarea"
          data-size="sm"
          rows={16}
          readOnly
          value={JSON.stringify(record.payload, null, 2)}
        />
      ) : null}
    </div>
  );
}

/**
 * T-128 W-15 S3 — v1b run-operations surface (运行操作台).
 *
 * One card, three read/write zones on a caller-supplied workflow_run_id:
 *  - O-1 签核卡: nodes whose latest_provisional_tripwire is set (N8 → admitted attempt,
 *    N6 → escalation-loopback attempt) get a run-override sign-off form; an existing
 *    matching artifact renders as signed. The coordinator's gate stays the authority —
 *    this surface only records/reads the W-16 contract artifacts.
 *  - O-2 提额卡: audited loopback-budget raises (hard cap 5) + the raises already on file.
 *  - Trace 抽屉: per-attempt read-only trace snapshot drilldown.
 *
 * No RBAC yet (D4, honest note): the human actor_id comes from the form and is recorded
 * verbatim into provenance; hard authentication is a known follow-up shared with v1c N4.
 */
export function RunOperationsCard({ candidateRunIds, refreshToken }: RunOperationsCardProps) {
  const [runIdInput, setRunIdInput] = useState('');
  const [state, setState] = useState<V1bRunStateView | null>(null);
  const [artifacts, setArtifacts] = useState<TopicSelectionArtifactRefRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openTraceId, setOpenTraceId] = useState<string | null>(null);

  const loadRun = async (workflowRunId: string) => {
    const target = workflowRunId.trim();
    if (!target) return;
    setLoading(true);
    setError(null);
    setOpenTraceId(null);
    try {
      const [runState, runArtifacts] = await Promise.all([
        getWorkflowRunState(target),
        listWorkflowRunArtifacts(target),
      ]);
      setState(runState);
      setArtifacts(runArtifacts);
    } catch (caught) {
      setState(null);
      setArtifacts([]);
      setError(caught instanceof Error ? caught.message : '加载 run 状态失败。');
    } finally {
      setLoading(false);
    }
  };

  const reloadArtifacts = async () => {
    if (!state) return;
    try {
      setArtifacts(await listWorkflowRunArtifacts(state.workflow_run_id));
    } catch {
      // keep the stale list; the next explicit reload surfaces errors
    }
  };

  useEffect(() => {
    // A workbench-level refresh re-pulls the currently loaded run (if any).
    if (state) void loadRun(state.workflow_run_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const signOffTargets: SignOffTarget[] = useMemo(() => {
    if (!state) return [];
    return PROVISIONAL_GATE_NODES.flatMap((gate) => {
      const node = state.nodes.find((candidate) => candidate.node_id === gate.node_id);
      const tripwire = node?.latest_provisional_tripwire;
      if (!node || !tripwire) return [];
      return [{
        node,
        warning_code: gate.warning_code,
        node_attempt_id: tripwire.node_attempt_id,
        trace_snapshot_ref_id: tripwire.trace_snapshot_ref?.ref_id ?? null,
        existing: findRunOverrideSignOff(
          artifacts, state.workflow_run_id, node.node_id, tripwire.node_attempt_id, gate.warning_code,
        ),
      }];
    });
  }, [state, artifacts]);

  const recordedRaises = useMemo(() => {
    if (!state) return [];
    const byNode = new Map<string, number>();
    for (const artifact of artifacts) {
      const payload = artifact.payload as Record<string, unknown> | null | undefined;
      if (
        payload?.schema_version === TOPIC_SELECTION_LOOPBACK_BUDGET_RAISE_SCHEMA_VERSION
        && payload?.workflow_run_id === state.workflow_run_id
        && typeof payload?.node_id === 'string'
        && typeof payload?.raised_to === 'number'
      ) {
        const current = byNode.get(payload.node_id) ?? 0;
        byNode.set(payload.node_id, Math.max(current, payload.raised_to));
      }
    }
    return [...byNode.entries()].map(([node_id, raised_to]) => ({ node_id, raised_to }));
  }, [state, artifacts]);

  const activeNodes = useMemo(
    () => (state ? state.nodes.filter((node) => node.attempt_count > 0) : []),
    [state],
  );

  return (
    <article data-ui="card" data-padding="md">
      <div data-ui="stack" data-direction="col" data-gap="2">
        <p data-ui="text" data-variant="label" data-tone="primary">运行操作台（W-15 HumanOverride + Trace）</p>
        <p data-ui="text" data-variant="caption" data-tone="muted">
          按 workflow_run_id 查看 run 投影；对带 provisional tripwire 的 attempt 记录 run-override 签核（O-1）；
          记录审计化 loopback 预算提额（O-2）；逐 attempt 查看只读 trace。签核/提额均走控制面工件通道，
          gate 结论与阈值不可从此处覆写；actor_id 随表单记录（暂无 RBAC，D4 如实声明）。
        </p>

        <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap" data-align="center">
          <input
            data-ui="input"
            data-size="sm"
            value={runIdInput}
            onChange={(event) => setRunIdInput(event.target.value)}
            placeholder="workflow_run_id"
          />
          <button
            type="button"
            data-ui="button"
            data-variant="primary"
            data-size="sm"
            disabled={loading || runIdInput.trim() === ''}
            onClick={() => void loadRun(runIdInput)}
          >
            {loading ? '加载中…' : '加载 run'}
          </button>
          {state ? (
            <button
              type="button"
              data-ui="button"
              data-variant="secondary"
              data-size="sm"
              disabled={loading}
              onClick={() => void loadRun(state.workflow_run_id)}
            >
              刷新
            </button>
          ) : null}
        </div>
        {candidateRunIds.length > 0 ? (
          <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap" data-align="center">
            <span data-ui="text" data-variant="caption" data-tone="muted">本题目卡记录上出现过的 run：</span>
            {candidateRunIds.map((candidate) => (
              <button
                key={candidate}
                type="button"
                data-ui="button"
                data-variant="ghost"
                data-size="sm"
                onClick={() => {
                  setRunIdInput(candidate);
                  void loadRun(candidate);
                }}
              >
                {candidate}
              </button>
            ))}
          </div>
        ) : null}
        {error ? (
          <p data-ui="text" data-variant="caption" data-tone="danger">{error}</p>
        ) : null}

        {state ? (
          <>
            <div data-ui="stack" data-direction="row" data-gap="2" data-wrap="wrap" data-align="center">
              <span data-ui="badge" data-variant="solid" data-tone="info">{state.workflow_run_id}</span>
              {state.run_complete ? (
                <span data-ui="badge" data-variant="subtle" data-tone="success">run_complete</span>
              ) : (
                <span data-ui="badge" data-variant="subtle" data-tone="neutral">
                  next：{state.next_node_id ?? '—'}
                </span>
              )}
              <span data-ui="text" data-variant="caption" data-tone="muted">
                last_completed：{state.last_completed_node_id ?? '—'}
              </span>
            </div>

            {signOffTargets.length > 0 ? (
              <div data-ui="stack" data-direction="col" data-gap="2">
                <p data-ui="text" data-variant="label" data-tone="primary">O-1 · Provisional 签核</p>
                {signOffTargets.map((target) => (
                  <div key={target.node.node_id} data-ui="stack" data-direction="col" data-gap="1">
                    <div data-ui="stack" data-direction="row" data-gap="2" data-wrap="wrap" data-align="center">
                      <span data-ui="badge" data-variant="subtle" data-tone="warning">{target.warning_code}</span>
                      <span data-ui="text" data-variant="caption" data-tone="primary">{nodeLabel(target.node)}</span>
                      <span data-ui="text" data-variant="caption" data-tone="muted">
                        锚定 attempt：{target.node_attempt_id}
                      </span>
                      {target.trace_snapshot_ref_id ? (
                        <button
                          type="button"
                          data-ui="button"
                          data-variant="ghost"
                          data-size="sm"
                          onClick={() => setOpenTraceId(
                            openTraceId === target.trace_snapshot_ref_id ? null : target.trace_snapshot_ref_id,
                          )}
                        >
                          {openTraceId === target.trace_snapshot_ref_id ? '收起 tripwire trace' : 'tripwire trace'}
                        </button>
                      ) : null}
                    </div>
                    {target.trace_snapshot_ref_id && openTraceId === target.trace_snapshot_ref_id ? (
                      <TraceDrawer traceSnapshotId={target.trace_snapshot_ref_id} />
                    ) : null}
                    <p data-ui="text" data-variant="caption" data-tone="muted">
                      该 attempt 带有历史 provisional tripwire（D-30 于 2026-07-07 将阈值重定性为 advisory
                      后，harness 不再发射此警告，coordinator 也不再要求签核）。此处签核为可选的留痕记录，
                      不影响 advance。
                    </p>
                    {target.existing ? (
                      <div data-ui="alert" data-tone="success">
                        <p data-ui="text" data-variant="caption" data-tone="primary">
                          已签核：{String((target.existing.payload as Record<string, unknown> | null)?.sign_off_id ?? target.existing.artifact_ref_id)}
                          （signed_by {String(((target.existing.payload as Record<string, unknown> | null)?.signed_by as Record<string, unknown> | null)?.actor_id ?? '—')}）。
                          coordinator 侧以严格校验为准。
                        </p>
                      </div>
                    ) : (
                      <SignOffForm
                        key={`${target.node.node_id}:${target.node_attempt_id}`}
                        workflowRunId={state.workflow_run_id}
                        target={target}
                        onRecorded={() => void reloadArtifacts()}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            <div data-ui="stack" data-direction="col" data-gap="2">
              <p data-ui="text" data-variant="label" data-tone="primary">O-2 · Loopback 预算提额</p>
              {recordedRaises.length > 0 ? (
                <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap" data-align="center">
                  <span data-ui="text" data-variant="caption" data-tone="muted">已记录（取 max 生效）：</span>
                  {recordedRaises.map((raise) => (
                    <span key={raise.node_id} data-ui="badge" data-variant="subtle" data-tone="info">
                      {raise.node_id.split('.').slice(-2, -1)[0]} → {raise.raised_to}
                    </span>
                  ))}
                </div>
              ) : null}
              {activeNodes.length > 0 ? (
                <BudgetRaiseForm
                  key={state.workflow_run_id}
                  workflowRunId={state.workflow_run_id}
                  nodes={activeNodes}
                  onRecorded={() => void reloadArtifacts()}
                />
              ) : null}
            </div>

            <div data-ui="stack" data-direction="col" data-gap="1">
              <p data-ui="text" data-variant="label" data-tone="primary">节点 attempts 与 Trace</p>
              {activeNodes.map((node) => {
                const latest = node.latest;
                if (!latest) return null;
                const traceRefId = latest.trace_snapshot_ref?.ref_id ?? null;
                const tripwire = node.latest_provisional_tripwire;
                return (
                  <div key={node.node_id} data-ui="stack" data-direction="col" data-gap="0">
                    <div data-ui="stack" data-direction="row" data-gap="2" data-wrap="wrap" data-align="center">
                      <span data-ui="text" data-variant="caption" data-tone="primary">{nodeLabel(node)}</span>
                      <GateStatusBadge status={latest.gate_status} />
                      <RouteDecisionBadge decision={latest.route_decision} />
                      <span data-ui="text" data-variant="caption" data-tone="muted">
                        attempts×{node.attempt_count} · loopbacks×{node.loopback_count}
                        {latest.warnings.length > 0 ? ` · warnings×${latest.warnings.length}` : ''}
                        {latest.replayed ? ' · replayed' : ''}
                      </span>
                      {tripwire ? (
                        <span data-ui="badge" data-variant="subtle" data-tone="warning">tripwire</span>
                      ) : null}
                      {traceRefId ? (
                        <button
                          type="button"
                          data-ui="button"
                          data-variant="ghost"
                          data-size="sm"
                          onClick={() => setOpenTraceId(openTraceId === traceRefId ? null : traceRefId)}
                        >
                          {openTraceId === traceRefId ? '收起 trace' : 'trace'}
                        </button>
                      ) : null}
                    </div>
                    {latest.warnings.length > 0 ? (
                      <p data-ui="text" data-variant="caption" data-tone="muted">
                        warnings：{latest.warnings.map((warning) => warning.code).join('、')}
                      </p>
                    ) : null}
                    {latest.blockers.length > 0 ? (
                      <p data-ui="text" data-variant="caption" data-tone="danger">
                        blockers：{latest.blockers.map((blocker) => blocker.code).join('、')}
                      </p>
                    ) : null}
                    {traceRefId && openTraceId === traceRefId ? (
                      <TraceDrawer traceSnapshotId={traceRefId} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </article>
  );
}
