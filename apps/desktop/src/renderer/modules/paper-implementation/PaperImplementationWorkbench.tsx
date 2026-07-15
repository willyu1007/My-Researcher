import type {
  DecisionWorkQueueItem,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-ai-workflow-harness-contracts';
import type {
  PaperImplementationQueueItem,
} from './types';
import { usePaperImplementationWorkbenchController } from './usePaperImplementationWorkbenchController';
import { RuntimeLanePanel } from './RuntimeLanePanel';
import { ConfirmationPanel } from './ConfirmationPanel';
import {
  JsonViewer,
  MetricTile,
  RefList,
  StatusBadge,
  StatusLine,
} from './presentational';
import {
  compactList,
  decisionQueueTypeLabel,
  formatRef,
  truncateHash,
} from './utils';

function QueueSourceLabel({ source }: { source: PaperImplementationQueueItem['source'] }) {
  const labels: Record<PaperImplementationQueueItem['source'], string> = {
    decision_work_queue: 'DecisionWorkQueue',
    trace_repair_queue: 'TraceRepair',
    validation_review: 'ValidationReview',
    upstream_feedback: 'UpstreamFeedback',
    portfolio_decision: 'Portfolio',
    failed_workflow: 'FailedWorkflow',
    failed_run: 'FailedRun',
    accepted_risk_expiry: 'RiskExpiry',
    claim_boundary: 'ClaimBoundary',
    dossier_readiness: 'Dossier',
  };
  return <span data-ui="badge" data-variant="subtle" data-tone="info">{labels[source]}</span>;
}

function QueueList({
  items,
  selectedItemId,
  onSelect,
}: {
  items: PaperImplementationQueueItem[];
  selectedItemId: string | null;
  onSelect: (itemId: string) => void;
}) {
  if (items.length === 0) {
    return (
      <section data-ui="empty-state" data-variant="compact" data-tone="neutral">
        <p data-ui="text" data-variant="label" data-tone="primary" data-slot="title">当前无待处理项</p>
        <p data-ui="text" data-variant="caption" data-tone="muted" data-slot="body">
          后端 read-model 未返回 open/blocking/review 项。
        </p>
      </section>
    );
  }

  return (
    <div data-ui="list" data-variant="rows" data-density="compact">
      {items.map((item) => (
        <button
          key={`${item.source}-${item.itemId}`}
          data-ui="button"
          data-variant={selectedItemId === item.itemId ? 'secondary' : 'ghost'}
          data-size="sm"
          type="button"
          onClick={() => onSelect(item.itemId)}
        >
          <span data-ui="stack" data-direction="col" data-gap="1" data-align="stretch">
            <span data-ui="toolbar" data-align="between" data-wrap="wrap">
              <span data-ui="text" data-variant="label" data-tone="primary">{item.type}</span>
              <span data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap" data-align="center">
                <QueueSourceLabel source={item.source} />
                <StatusBadge value={item.status} />
                <StatusBadge value={item.priority} />
              </span>
            </span>
            <span data-ui="text" data-variant="caption" data-tone="muted">{item.summary}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function DecisionQueueMeta({ raw }: { raw: DecisionWorkQueueItem }) {
  const inCooldown = raw.cooldown_until ? Date.parse(raw.cooldown_until) > Date.now() : false;
  return (
    <section data-ui="section" data-padding="none">
      <div data-ui="stack" data-direction="col" data-gap="2">
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <p data-ui="text" data-variant="label" data-tone="primary">DecisionWorkQueue 明细</p>
          <span data-ui="badge" data-variant="subtle" data-tone="info">{decisionQueueTypeLabel(raw.queue_type)}</span>
        </div>
        <div data-ui="grid" data-cols="3" data-gap="2">
          <MetricTile
            label="retry (count/budget)"
            value={`${raw.retry_count} / ${raw.retry_budget}`}
            status={raw.retry_count >= raw.retry_budget ? 'blocked' : undefined}
          />
          <MetricTile
            label="cooldown_until"
            value={raw.cooldown_until ? truncateHash(raw.cooldown_until, 19) : '--'}
            status={inCooldown ? 'warning' : undefined}
          />
          <MetricTile label="queue_type" value={raw.queue_type} />
        </div>
        <p data-ui="text" data-variant="caption" data-tone="muted">dedup_key: {raw.dedup_key}</p>
        <p data-ui="text" data-variant="caption" data-tone="muted">
          来源 coordinator run:{' '}
          {raw.source_coordinator_run_ref ? formatRef(raw.source_coordinator_run_ref) : '--'}
          {raw.source_step_index !== null && raw.source_step_index !== undefined
            ? ` · step #${raw.source_step_index}`
            : ''}
        </p>
        {inCooldown ? (
          <p data-ui="text" data-variant="caption" data-tone="danger">
            该项处于 cooldown，re_advance 会被冷却窗口拦截（后端 409）。
          </p>
        ) : null}
      </div>
    </section>
  );
}

function QueueDetail({
  item,
  projectSourceStatus,
  projectFreshnessStatus,
  bridgePayloadHash,
}: {
  item: PaperImplementationQueueItem | null;
  projectSourceStatus?: string;
  projectFreshnessStatus?: string;
  bridgePayloadHash?: string;
}) {
  if (!item) {
    return (
      <section data-ui="empty-state" data-variant="compact" data-tone="neutral">
        <p data-ui="text" data-variant="label" data-tone="primary" data-slot="title">未选择队列项</p>
        <p data-ui="text" data-variant="caption" data-tone="muted" data-slot="body">
          加载项目后选择一个后端队列或 review item。
        </p>
      </section>
    );
  }

  return (
    <section data-ui="section" data-padding="none">
      <div data-ui="stack" data-direction="col" data-gap="3">
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap" data-align="center">
            <QueueSourceLabel source={item.source} />
            <StatusBadge value={item.status} />
            <StatusBadge value={item.priority} />
          </div>
          <p data-ui="text" data-variant="caption" data-tone="muted">{item.itemId}</p>
        </div>

        <div data-ui="grid" data-cols="3" data-gap="2">
          <MetricTile label="source_status" value={projectSourceStatus ?? '--'} status={projectSourceStatus} />
          <MetricTile label="freshness_status" value={projectFreshnessStatus ?? '--'} status={projectFreshnessStatus} />
          <MetricTile label="bridge_payload_hash" value={bridgePayloadHash ? bridgePayloadHash.slice(0, 16) : '--'} />
        </div>

        <div data-ui="grid" data-cols="2" data-gap="3">
          <section data-ui="section" data-padding="none">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <p data-ui="text" data-variant="label" data-tone="primary">关键信息</p>
              <p data-ui="text" data-variant="caption" data-tone="muted">stage: {item.stage}</p>
              <p data-ui="text" data-variant="caption" data-tone="muted">target: {formatRef(item.targetRef)}</p>
              <p data-ui="text" data-variant="caption" data-tone="muted">trace_manifest_id: {item.traceManifestId ?? '--'}</p>
              <p data-ui="text" data-variant="caption" data-tone="muted">gate_result_id: {item.gateResultId ?? '--'}</p>
              <p data-ui="text" data-variant="caption" data-tone="muted">created_at: {item.createdAt ?? '--'}</p>
            </div>
          </section>

          <section data-ui="section" data-padding="none">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <p data-ui="text" data-variant="label" data-tone="primary">source refs</p>
              <RefList refs={item.sourceRefs} />
            </div>
          </section>
        </div>

        <div data-ui="grid" data-cols="3" data-gap="3">
          <section data-ui="section" data-padding="none">
            <div data-ui="stack" data-direction="col" data-gap="1">
              <p data-ui="text" data-variant="label" data-tone="primary">blockers</p>
              <p data-ui="text" data-variant="caption" data-tone="muted">{compactList(item.blockers)}</p>
            </div>
          </section>
          <section data-ui="section" data-padding="none">
            <div data-ui="stack" data-direction="col" data-gap="1">
              <p data-ui="text" data-variant="label" data-tone="primary">risks</p>
              <p data-ui="text" data-variant="caption" data-tone="muted">{compactList(item.risks)}</p>
            </div>
          </section>
          <section data-ui="section" data-padding="none">
            <div data-ui="stack" data-direction="col" data-gap="1">
              <p data-ui="text" data-variant="label" data-tone="primary">actions</p>
              <p data-ui="text" data-variant="caption" data-tone="muted">{compactList(item.recommendedActions)}</p>
            </div>
          </section>
        </div>

        {item.source === 'decision_work_queue' ? (
          <DecisionQueueMeta raw={item.raw as DecisionWorkQueueItem} />
        ) : null}

        <JsonViewer label="raw backend item" value={item.raw} rows={12} />
      </div>
    </section>
  );
}

function ProjectLocator({
  controller,
}: {
  controller: ReturnType<typeof usePaperImplementationWorkbenchController>;
}) {
  return (
    <section data-ui="section" data-padding="none">
      <div data-ui="stack" data-direction="col" data-gap="3">
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <div data-ui="stack" data-direction="col" data-gap="1">
            <p data-ui="text" data-variant="h3" data-tone="primary">论文实施工作台</p>
            <p data-ui="text" data-variant="caption" data-tone="muted">
              以 ImplementationProject 为根对象读取后端队列、trace、validation、work order、claim 和 dossier 状态。
            </p>
          </div>
          <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={() => void controller.reload()}>
            刷新 read-model
          </button>
        </div>

        <div data-ui="grid" data-cols="3" data-gap="3">
          <label data-ui="field">
            <span data-slot="label">ImplementationProject ID</span>
            <input
              data-ui="input"
              data-size="sm"
              value={controller.implementationProjectIdInput}
              onChange={(event) => controller.setImplementationProjectIdInput(event.target.value)}
            />
          </label>
          <label data-ui="field">
            <span data-slot="label">PaperProjectBridge ID</span>
            <input
              data-ui="input"
              data-size="sm"
              value={controller.paperProjectBridgeIdInput}
              onChange={(event) => controller.setPaperProjectBridgeIdInput(event.target.value)}
            />
          </label>
          <label data-ui="field">
            <span data-slot="label">bridge_payload_hash</span>
            <input
              data-ui="input"
              data-size="sm"
              value={controller.bridgePayloadHashInput}
              onChange={(event) => controller.setBridgePayloadHashInput(event.target.value)}
            />
          </label>
        </div>

        <div data-ui="toolbar" data-wrap="wrap">
          <button data-ui="button" data-variant="primary" data-size="sm" type="button" onClick={() => void controller.loadByProjectId()}>
            加载项目
          </button>
          <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={() => void controller.loadByBridgeId()}>
            通过 bridge 查找
          </button>
          <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={() => void controller.bootstrapFromBridge()}>
            bootstrap from bridge
          </button>
          <StatusBadge value={controller.projectStatus} />
          <StatusBadge value={controller.readModelStatus} />
        </div>

        <StatusLine status="error" message={controller.projectError} />
        <StatusLine status="error" message={controller.readModelError} />
      </div>
    </section>
  );
}

function ProjectSummary({
  controller,
}: {
  controller: ReturnType<typeof usePaperImplementationWorkbenchController>;
}) {
  const project = controller.projectResponse?.implementation_project;
  const intake = controller.projectResponse?.intake_snapshot;

  return (
    <section data-ui="section" data-padding="none">
      <div data-ui="grid" data-cols="4" data-gap="3">
        <MetricTile label="ImplementationProject" value={project?.implementation_project_id ?? '--'} status={project?.lifecycle_status} />
        <MetricTile label="IntakeSnapshot" value={project?.intake_snapshot_id ?? '--'} status={intake?.source_status} />
        <MetricTile label="TitleCard" value={project?.title_card_id ?? '--'} />
        <MetricTile label="Open Queue" value={controller.queueItems.filter((item) => !['resolved', 'dismissed', 'superseded', 'applied', 'dispatched'].includes(item.status)).length} />
      </div>
    </section>
  );
}

function CommandPanel({
  controller,
}: {
  controller: ReturnType<typeof usePaperImplementationWorkbenchController>;
}) {
  const selected = controller.selectedQueueItem;
  // re_advance / retry_budget_override only apply to a `resolved` resolution
  // (they trigger real coordinator advance = real LLM consumption); disable them
  // for dismiss / supersede so the controls can never mislead.
  const decisionReAdvanceEnabled = controller.decisionResolutionStatus === 'resolved';
  return (
    <section data-ui="section" data-padding="none">
      <div data-ui="stack" data-direction="col" data-gap="3">
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <p data-ui="text" data-variant="label" data-tone="primary">后端命令</p>
          <StatusBadge value={controller.actionStatus} />
        </div>
        <StatusLine status={controller.actionStatus} message={controller.actionMessage} />

        {selected?.source === 'decision_work_queue' ? (
          <section data-ui="section" data-padding="none">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <div data-ui="grid" data-cols="2" data-gap="2">
                <label data-ui="field">
                  <span data-slot="label">resolution status</span>
                  <select
                    data-ui="select"
                    data-size="sm"
                    value={controller.decisionResolutionStatus}
                    onChange={(event) =>
                      controller.setDecisionResolutionStatus(
                        event.target.value as 'resolved' | 'dismissed' | 'superseded',
                      )
                    }
                  >
                    <option value="resolved">resolved</option>
                    <option value="dismissed">dismissed</option>
                    <option value="superseded">superseded</option>
                  </select>
                </label>
                <label data-ui="field">
                  <span data-slot="label">retry_budget_override（可选，≥ 1）</span>
                  <input
                    data-ui="input"
                    data-size="sm"
                    inputMode="numeric"
                    disabled={!decisionReAdvanceEnabled}
                    value={decisionReAdvanceEnabled ? controller.decisionRetryBudgetOverride : ''}
                    onChange={(event) => controller.setDecisionRetryBudgetOverride(event.target.value)}
                  />
                </label>
              </div>
              <label data-ui="field">
                <span data-slot="label">DecisionWorkQueue resolution note</span>
                <textarea
                  data-ui="textarea"
                  data-size="sm"
                  rows={3}
                  value={controller.decisionResolutionNote}
                  onChange={(event) => controller.setDecisionResolutionNote(event.target.value)}
                />
              </label>
              <label data-ui="field">
                <span data-slot="label">
                  <input
                    type="checkbox"
                    disabled={!decisionReAdvanceEnabled}
                    checked={decisionReAdvanceEnabled && controller.decisionReAdvance}
                    onChange={(event) => controller.setDecisionReAdvance(event.target.checked)}
                  />
                  {' '}re_advance（resolve 后触发一次 coordinator advance）
                </span>
              </label>
              <p data-ui="text" data-variant="caption" data-tone="muted">
                {decisionReAdvanceEnabled
                  ? 're_advance 仅在该项带 source_coordinator_run_ref 时生效，并受 retry_budget/cooldown 门控（超限返回 409，错误信息如实展示）。'
                  : 'dismiss / supersede 不触发 coordinator advance——re_advance 与 retry_budget_override 已禁用，不会产生真实 LLM 消费。'}
              </p>
              <div data-ui="toolbar" data-wrap="wrap">
                <button
                  data-ui="button"
                  data-variant="primary"
                  data-size="sm"
                  type="button"
                  onClick={() =>
                    void controller.resolveSelectedDecisionQueueItem(controller.decisionResolutionStatus)
                  }
                >
                  提交 resolution（{controller.decisionResolutionStatus}）
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {selected?.source === 'trace_repair_queue' ? (
          <section data-ui="section" data-padding="none">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <label data-ui="field">
                <span data-slot="label">TraceRepair resolution note</span>
                <textarea
                  data-ui="textarea"
                  data-size="sm"
                  rows={3}
                  value={controller.traceResolutionNote}
                  onChange={(event) => controller.setTraceResolutionNote(event.target.value)}
                />
              </label>
              <button data-ui="button" data-variant="primary" data-size="sm" type="button" onClick={() => void controller.resolveSelectedTraceRepairItem()}>
                resolve trace item
              </button>
            </div>
          </section>
        ) : null}

        {selected?.source === 'upstream_feedback' ? (
          <section data-ui="section" data-padding="none">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <label data-ui="field">
                <span data-slot="label">Required upstream action note</span>
                <textarea
                  data-ui="textarea"
                  data-size="sm"
                  rows={3}
                  value={controller.upstreamRequiredAction}
                  onChange={(event) => controller.setUpstreamRequiredAction(event.target.value)}
                />
              </label>
              <button data-ui="button" data-variant="primary" data-size="sm" type="button" onClick={() => void controller.dispatchSelectedUpstreamFeedbackCandidate()}>
                dispatch feedback
              </button>
            </div>
          </section>
        ) : null}

        <section data-ui="section" data-padding="none">
          <div data-ui="stack" data-direction="col" data-gap="2">
            <p data-ui="text" data-variant="label" data-tone="primary">Portfolio decision command JSON</p>
            <label data-ui="field">
              <span data-slot="label">ApplyMotivePortfolioDecisionRequest</span>
              <textarea
                data-ui="textarea"
                data-size="sm"
                rows={12}
                spellCheck={false}
                value={controller.portfolioDecisionPayload}
                onChange={(event) => controller.setPortfolioDecisionPayload(event.target.value)}
              />
            </label>
            <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={() => void controller.submitPortfolioDecision()}>
              submit portfolio command
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

function ReadModelTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ id: string; status: string; summary: string; trace?: string | null }>;
}) {
  return (
    <section data-ui="section" data-padding="none">
      <div data-ui="stack" data-direction="col" data-gap="2">
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <p data-ui="text" data-variant="label" data-tone="primary">{title}</p>
          <span data-ui="badge" data-variant="subtle" data-tone="neutral">{rows.length}</span>
        </div>
        {rows.length === 0 ? (
          <p data-ui="text" data-variant="caption" data-tone="muted">--</p>
        ) : (
          <table data-ui="table" data-density="compact" data-variant="default">
            <thead>
              <tr>
                <th>id</th>
                <th>status</th>
                <th>trace</th>
                <th>summary</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${title}-${row.id}`}>
                  <td>{row.id}</td>
                  <td><StatusBadge value={row.status} /></td>
                  <td>{row.trace ?? '--'}</td>
                  <td>{row.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function ReadModelPanels({
  controller,
}: {
  controller: ReturnType<typeof usePaperImplementationWorkbenchController>;
}) {
  const { readModels } = controller;
  return (
    <section data-ui="section" data-padding="none">
      <div data-ui="grid" data-cols="2" data-gap="4">
        <ReadModelTable
          title="Trace"
          rows={readModels.traceManifests.map((item) => ({
            id: item.trace_manifest_id,
            status: item.trace_status,
            trace: item.trace_manifest_id,
            summary: `broken=${item.broken_ref_count}, stale=${item.stale_ref_count}, missing=${item.missing_ref_count}`,
          }))}
        />
        <ReadModelTable
          title="Motive / Board"
          rows={[
            ...readModels.coreMotives.map((item) => ({
              id: item.motive_id,
              status: item.lifecycle_status,
              trace: item.current_version_id ?? null,
              summary: item.portfolio_role.role,
            })),
            ...readModels.motiveEvidenceBoards.map((item) => ({
              id: item.board_version_id,
              status: item.board_state.readiness_status,
              trace: item.trace_manifest_id,
              summary: compactList(item.board_summary.next_evidence_needed),
            })),
          ]}
        />
        <ReadModelTable
          title="Validation / WorkOrder"
          rows={[
            ...readModels.validationCycles.map((item) => ({
              id: item.validation_cycle_id,
              status: item.lifecycle_status,
              trace: item.trace_manifest_id,
              summary: item.validation_frame.validation_question,
            })),
            ...readModels.researchWorkOrders.map((item) => ({
              id: item.work_order_id,
              status: item.work_order_status,
              trace: item.trace_manifest_id,
              summary: `${item.run_type} / ${item.validation_cycle_id}`,
            })),
            ...readModels.runEvidenceUnits.map((item) => ({
              id: item.run_evidence_unit_id,
              status: item.run_status,
              trace: item.trace_manifest_id,
              summary: item.failure_summary ?? item.trusted_status,
            })),
          ]}
        />
        <ReadModelTable
          title="Claim / Dossier / AI"
          rows={[
            ...readModels.resultInterpretationPackets.map((item) => ({
              id: item.result_interpretation_packet_id,
              status: item.interpretation_gate_status,
              trace: item.trace_manifest_id,
              summary: item.result_summary.result_summary,
            })),
            ...readModels.claimCandidates.map((item) => ({
              id: item.claim_candidate_id,
              status: item.boundary_gate_status,
              trace: item.trace_manifest_id,
              summary: item.claim_statement,
            })),
            ...readModels.implementationDossiers.map((item) => ({
              id: item.dossier_id,
              status: item.dossier_status,
              trace: item.trace_manifest_id,
              summary: `failed=${item.failed_run_count}, overclaim=${item.forbidden_overclaim_count}`,
            })),
            ...readModels.implementationProposalArtifacts.map((item) => ({
              id: item.proposal_artifact_id,
              status: item.proposal_status,
              trace: item.trace_manifest_refs[0]?.ref_id ?? null,
              summary: item.artifact_kind,
            })),
          ]}
        />
      </div>
    </section>
  );
}

export function PaperImplementationWorkbench() {
  const controller = usePaperImplementationWorkbenchController();
  const project = controller.projectResponse?.implementation_project;

  return (
    <div data-ui="stack" data-direction="col" data-gap="4">
      <ProjectLocator controller={controller} />
      <ProjectSummary controller={controller} />

      <RuntimeLanePanel controller={controller} />

      <div data-ui="grid" data-cols="2" data-gap="4">
        <section data-ui="section" data-padding="none">
          <div data-ui="stack" data-direction="col" data-gap="2">
            <div data-ui="toolbar" data-align="between" data-wrap="wrap">
              <p data-ui="text" data-variant="label" data-tone="primary">队列</p>
              <span data-ui="badge" data-variant="subtle" data-tone="neutral">{controller.queueItems.length}</span>
            </div>
            <QueueList
              items={controller.queueItems}
              selectedItemId={controller.selectedQueueItem?.itemId ?? null}
              onSelect={controller.setSelectedQueueItemId}
            />
          </div>
        </section>

        <section data-ui="section" data-padding="none">
          <div data-ui="stack" data-direction="col" data-gap="3">
            <p data-ui="text" data-variant="label" data-tone="primary">队列详情</p>
            <QueueDetail
              item={controller.selectedQueueItem}
              projectSourceStatus={project?.source_status}
              projectFreshnessStatus={project?.freshness_status}
              bridgePayloadHash={project?.bridge_payload_hash}
            />
          </div>
        </section>
      </div>

      <CommandPanel controller={controller} />
      <ConfirmationPanel controller={controller} />
      <ReadModelPanels controller={controller} />
      <JsonViewer label="project + intake snapshot" value={controller.snapshot.projectResponse} rows={16} />
    </div>
  );
}
