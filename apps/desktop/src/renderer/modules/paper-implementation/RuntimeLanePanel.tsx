import type {
  PaperImplementationCoordinatorRun,
  PaperImplementationCoordinatorStep,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-coordinator-contracts';
import type {
  PaperImplementationRuntimeTelemetryRunSummary,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-telemetry-contracts';
import type { usePaperImplementationWorkbenchController } from './usePaperImplementationWorkbenchController';
import { JsonViewer, MetricTile, StatusBadge, StatusLine } from './presentational';
import {
  formatRef,
  formatRatePercent,
  formatTimestamp,
  formatUsd,
  truncateHash,
} from './utils';

type Controller = ReturnType<typeof usePaperImplementationWorkbenchController>;

const TERMINAL_RUN_STATUSES = ['completed', 'failed'];

function CoordinatorRunLocator({ controller }: { controller: Controller }) {
  return (
    <section data-ui="section" data-padding="none">
      <div data-ui="stack" data-direction="col" data-gap="3">
        <div data-ui="stack" data-direction="col" data-gap="1">
          <p data-ui="text" data-variant="label" data-tone="primary">Coordinator run</p>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            从下方项目级 coordinator run 列表选择一个 run（GET /coordinator-runs），或按
            coordinator_run_id 直达读取（GET /coordinator-runs/:id）——两者都拉取 run 概览与 step 时间线。
          </p>
        </div>
        <div data-ui="toolbar" data-wrap="wrap">
          <label data-ui="field">
            <span data-slot="label">coordinator_run_id（直达）</span>
            <input
              data-ui="input"
              data-size="sm"
              value={controller.coordinatorRunIdInput}
              onChange={(event) => controller.setCoordinatorRunIdInput(event.target.value)}
            />
          </label>
          <button
            data-ui="button"
            data-variant="primary"
            data-size="sm"
            type="button"
            onClick={() => void controller.loadCoordinatorRun()}
          >
            加载 run
          </button>
          <StatusBadge value={controller.coordinatorRunStatus} />
        </div>
        <StatusLine status="error" message={controller.coordinatorRunError} />
      </div>
    </section>
  );
}

function CoordinatorRunList({ controller }: { controller: Controller }) {
  const runs: PaperImplementationCoordinatorRun[] = controller.coordinatorRuns;
  const selectedRunId = controller.coordinatorRun?.run.coordinator_run_id ?? null;
  return (
    <section data-ui="section" data-padding="none">
      <div data-ui="stack" data-direction="col" data-gap="2">
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <p data-ui="text" data-variant="label" data-tone="primary">项目级 coordinator run 列表</p>
          <div data-ui="stack" data-direction="row" data-gap="2" data-align="center">
            <span data-ui="badge" data-variant="subtle" data-tone="neutral">{runs.length}</span>
            <StatusBadge value={controller.coordinatorRunsStatus} />
          </div>
        </div>
        <StatusLine status="error" message={controller.coordinatorRunsError} />
        {runs.length === 0 ? (
          <p data-ui="text" data-variant="caption" data-tone="muted">当前项目暂无 coordinator run。</p>
        ) : (
          <div data-ui="list" data-variant="rows" data-density="compact">
            {runs.map((run) => (
              <button
                key={run.coordinator_run_id}
                data-ui="button"
                data-variant={selectedRunId === run.coordinator_run_id ? 'secondary' : 'ghost'}
                data-size="sm"
                type="button"
                onClick={() => void controller.selectCoordinatorRun(run.coordinator_run_id)}
              >
                <span data-ui="stack" data-direction="col" data-gap="1" data-align="stretch">
                  <span data-ui="stack" data-direction="row" data-gap="2" data-wrap="wrap" data-align="center">
                    <StatusBadge value={run.run_status} />
                    <span data-ui="text" data-variant="label" data-tone="primary">{run.coordinator_run_id}</span>
                  </span>
                  <span data-ui="text" data-variant="caption" data-tone="muted">
                    lane {run.lane_id} · steps {run.consumed.steps}/{run.budget_envelope.max_steps} · calls{' '}
                    {run.consumed.provider_calls}/{run.budget_envelope.max_provider_calls} · created{' '}
                    {formatTimestamp(run.created_at)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CoordinatorRunOverview({ controller }: { controller: Controller }) {
  const projection = controller.coordinatorRun;
  if (!projection) {
    return (
      <section data-ui="empty-state" data-variant="compact" data-tone="neutral">
        <p data-ui="text" data-variant="label" data-tone="primary" data-slot="title">未加载 coordinator run</p>
        <p data-ui="text" data-variant="caption" data-tone="muted" data-slot="body">
          输入一个 coordinator_run_id 后加载 run 概览与 step 时间线。
        </p>
      </section>
    );
  }

  const { run, steps } = projection;
  const isTerminal = TERMINAL_RUN_STATUSES.includes(run.run_status);
  return (
    <section data-ui="section" data-padding="none">
      <div data-ui="stack" data-direction="col" data-gap="3">
        <div data-ui="grid" data-cols="4" data-gap="2">
          <MetricTile label="run_status" value={run.run_status} status={run.run_status} />
          <MetricTile label="lane_id" value={run.lane_id} />
          <MetricTile label="steps" value={steps.length} />
          <MetricTile
            label="execution_mode"
            value={run.execution_mode}
          />
        </div>
        <div data-ui="grid" data-cols="3" data-gap="2">
          <MetricTile
            label="steps 预算 (consumed/max)"
            value={`${run.consumed.steps} / ${run.budget_envelope.max_steps}`}
            status={run.consumed.steps >= run.budget_envelope.max_steps ? 'budget_exhausted' : undefined}
          />
          <MetricTile
            label="provider_calls (consumed/max)"
            value={`${run.consumed.provider_calls} / ${run.budget_envelope.max_provider_calls}`}
            status={
              run.consumed.provider_calls >= run.budget_envelope.max_provider_calls
                ? 'budget_exhausted'
                : undefined
            }
          />
          <MetricTile label="run_mode" value={run.run_mode} />
        </div>
        <div data-ui="stack" data-direction="col" data-gap="1">
          <p data-ui="text" data-variant="caption" data-tone="muted">
            coordinator_run_id: {run.coordinator_run_id}
          </p>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            created_at: {formatTimestamp(run.created_at)} · updated_at: {formatTimestamp(run.updated_at)}
          </p>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            lease: {run.lease ? `${run.lease.holder_id} (expires ${run.lease.expires_at})` : '无（未租约）'}
          </p>
          {isTerminal ? (
            <p data-ui="text" data-variant="caption" data-tone="secondary">
              终态 run（{run.run_status}）：不可继续 advance。
            </p>
          ) : run.run_status === 'waiting_review' ? (
            <p data-ui="text" data-variant="caption" data-tone="muted">
              停驻于 waiting_review：等待人工评审后再 advance。
            </p>
          ) : run.run_status === 'budget_exhausted' ? (
            <p data-ui="text" data-variant="caption" data-tone="muted">
              预算耗尽停驻：需携带 budget raise 的 advance 才能恢复。
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function StepTimeline({ controller }: { controller: Controller }) {
  const projection = controller.coordinatorRun;
  if (!projection || projection.steps.length === 0) {
    return null;
  }
  const steps = [...projection.steps].sort((left, right) => left.step_index - right.step_index);
  return (
    <section data-ui="section" data-padding="none">
      <div data-ui="stack" data-direction="col" data-gap="2">
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <p data-ui="text" data-variant="label" data-tone="primary">Step 时间线</p>
          <span data-ui="badge" data-variant="subtle" data-tone="neutral">{steps.length}</span>
        </div>
        <div data-ui="list" data-variant="rows" data-density="compact">
          {steps.map((step) => (
            <StepRow key={step.coordinator_step_id} step={step} controller={controller} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepRow({
  step,
  controller,
}: {
  step: PaperImplementationCoordinatorStep;
  controller: Controller;
}) {
  const noisy = step.outcome === 'blocked' || step.outcome === 'failed_runtime';
  return (
    <article data-ui="card" data-padding="sm" data-variant={noisy ? 'outlined' : 'default'}>
      <div data-ui="stack" data-direction="col" data-gap="1">
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <div data-ui="stack" data-direction="row" data-gap="2" data-wrap="wrap" data-align="center">
            <span data-ui="badge" data-variant="subtle" data-tone="neutral">#{step.step_index}</span>
            <span data-ui="text" data-variant="label" data-tone="primary">{step.slot_id}</span>
            <StatusBadge value={step.outcome} />
          </div>
          <span data-ui="text" data-variant="caption" data-tone="muted">
            provider_calls: {step.provider_call_count}
          </span>
        </div>
        {step.outcome === 'waiting_review' ? (
          <p data-ui="text" data-variant="caption" data-tone="muted">停驻 waiting_review。</p>
        ) : null}
        {step.blocker_codes.length > 0 ? (
          <p data-ui="text" data-variant="caption" data-tone="danger">
            blocker_codes: {step.blocker_codes.join(', ')}
          </p>
        ) : null}
        <p data-ui="text" data-variant="caption" data-tone="muted">
          admission: {step.admission_ref ? formatRef(step.admission_ref) : '--'}
        </p>
        <p data-ui="text" data-variant="caption" data-tone="muted">
          runtime_artifact: {step.runtime_artifact_ref ? formatRef(step.runtime_artifact_ref) : '--'}
          {step.runtime_artifact_hash ? ` · hash ${truncateHash(step.runtime_artifact_hash)}` : ''}
        </p>
        <div data-ui="toolbar" data-wrap="wrap">
          <span data-ui="text" data-variant="caption" data-tone="muted">
            node_attempt_id: {step.node_attempt_id}
          </span>
          <button
            data-ui="button"
            data-variant="ghost"
            data-size="sm"
            type="button"
            onClick={() => void controller.selectTelemetryRun(step.node_attempt_id)}
          >
            查看该 step 遥测
          </button>
        </div>
      </div>
    </article>
  );
}

function ProjectRepaidRateCard({ controller }: { controller: Controller }) {
  const aggregate = controller.projectRepaidRate;
  return (
    <section data-ui="section" data-padding="none">
      <div data-ui="stack" data-direction="col" data-gap="2">
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <p data-ui="text" data-variant="label" data-tone="primary">项目级遥测聚合</p>
          <StatusBadge value={controller.telemetryStatus} />
        </div>
        <StatusLine status="error" message={controller.telemetryError} />
        <div data-ui="grid" data-cols="4" data-gap="2">
          <MetricTile label="runs" value={aggregate?.run_count ?? '--'} />
          <MetricTile label="provider 调用" value={aggregate?.provider_call_count ?? '--'} />
          <MetricTile label="总成本" value={formatUsd(aggregate?.total_cost_usd)} />
          <MetricTile
            label="重付率"
            value={formatRatePercent(aggregate?.repaid_cost_rate)}
            status={aggregate && aggregate.repaid_cost_rate > 0 ? 'warning' : undefined}
          />
        </div>
      </div>
    </section>
  );
}

function TelemetryRunList({
  controller,
}: {
  controller: Controller;
}) {
  const runs: PaperImplementationRuntimeTelemetryRunSummary[] = controller.telemetryRuns;
  return (
    <section data-ui="section" data-padding="none">
      <div data-ui="stack" data-direction="col" data-gap="2">
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <p data-ui="text" data-variant="label" data-tone="primary">遥测 run（按 node_attempt 粒度）</p>
          <span data-ui="badge" data-variant="subtle" data-tone="neutral">{runs.length}</span>
        </div>
        {runs.length === 0 ? (
          <p data-ui="text" data-variant="caption" data-tone="muted">当前项目暂无遥测 run。</p>
        ) : (
          <div data-ui="list" data-variant="rows" data-density="compact">
            {runs.map((run) => (
              <button
                key={run.run_id}
                data-ui="button"
                data-variant={controller.selectedTelemetryRunId === run.run_id ? 'secondary' : 'ghost'}
                data-size="sm"
                type="button"
                onClick={() => void controller.selectTelemetryRun(run.run_id)}
              >
                <span data-ui="stack" data-direction="col" data-gap="1" data-align="stretch">
                  <span data-ui="text" data-variant="label" data-tone="primary">{run.run_id}</span>
                  <span data-ui="text" data-variant="caption" data-tone="muted">
                    调用 {run.provider_call_count} · 成本 {formatUsd(run.total_cost_usd)} · 重付率{' '}
                    {formatRatePercent(run.repaid_cost_rate)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TelemetryRunDetailCard({ controller }: { controller: Controller }) {
  const detail = controller.telemetryRunDetail;
  if (!detail) {
    return (
      <section data-ui="empty-state" data-variant="compact" data-tone="neutral">
        <p data-ui="text" data-variant="label" data-tone="primary" data-slot="title">未选择遥测 run</p>
        <p data-ui="text" data-variant="caption" data-tone="muted" data-slot="body">
          从遥测 run 列表或 step 时间线选择一个 run 查看成本分解。
        </p>
      </section>
    );
  }

  const shadowTiers = Array.from(
    new Set(
      detail.records
        .map((entry) => entry.shadow_tier)
        .filter((tier): tier is NonNullable<typeof tier> => tier !== null),
    ),
  );

  return (
    <section data-ui="section" data-padding="none">
      <div data-ui="stack" data-direction="col" data-gap="3">
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <p data-ui="text" data-variant="label" data-tone="primary">遥测摘要：{detail.run_id}</p>
          <StatusBadge value={controller.telemetryDetailStatus} />
        </div>
        <div data-ui="grid" data-cols="4" data-gap="2">
          <MetricTile label="provider 调用" value={detail.provider_call_count} />
          <MetricTile label="总成本" value={formatUsd(detail.total_cost_usd)} />
          <MetricTile label="重付成本" value={formatUsd(detail.repaid_cost_usd)} />
          <MetricTile
            label="重付率"
            value={formatRatePercent(detail.repaid_cost_rate)}
            status={detail.repaid_cost_rate > 0 ? 'warning' : undefined}
          />
        </div>
        <div data-ui="stack" data-direction="col" data-gap="1">
          <p data-ui="text" data-variant="label" data-tone="primary">shadow 档位（未生效）</p>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            {shadowTiers.length > 0 ? shadowTiers.join(', ') : '无 shadow 判定'}
            {shadowTiers.length > 0 ? '（record-only，不影响执行路径）' : ''}
          </p>
        </div>
        <div data-ui="stack" data-direction="col" data-gap="2">
          <p data-ui="text" data-variant="label" data-tone="primary">per-slot 成本分解</p>
          {detail.per_slot.length === 0 ? (
            <p data-ui="text" data-variant="caption" data-tone="muted">--</p>
          ) : (
            <table data-ui="table" data-density="compact" data-variant="default">
              <thead>
                <tr>
                  <th>slot_id</th>
                  <th>调用</th>
                  <th>成本</th>
                  <th>重付</th>
                </tr>
              </thead>
              <tbody>
                {detail.per_slot.map((slot) => (
                  <tr key={slot.slot_id}>
                    <td>{slot.slot_id}</td>
                    <td>{slot.provider_call_count}</td>
                    <td>{formatUsd(slot.total_cost_usd)}</td>
                    <td>{formatUsd(slot.repaid_cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <JsonViewer label="telemetry records" value={detail.records} rows={12} />
      </div>
    </section>
  );
}

export function RuntimeLanePanel({ controller }: { controller: Controller }) {
  return (
    <section data-ui="section" data-padding="none">
      <div data-ui="stack" data-direction="col" data-gap="4">
        <div data-ui="stack" data-direction="col" data-gap="1">
          <p data-ui="text" data-variant="h3" data-tone="primary">Runtime lane 去盲</p>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            coordinator run 概览、step 时间线与运行时遥测（S4-A/S4-B，只读观测）。
          </p>
        </div>
        <CoordinatorRunLocator controller={controller} />
        <CoordinatorRunList controller={controller} />
        <CoordinatorRunOverview controller={controller} />
        <StepTimeline controller={controller} />
        <ProjectRepaidRateCard controller={controller} />
        <div data-ui="grid" data-cols="2" data-gap="4">
          <TelemetryRunList controller={controller} />
          <TelemetryRunDetailCard controller={controller} />
        </div>
      </div>
    </section>
  );
}
