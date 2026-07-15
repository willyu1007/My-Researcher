import {
  PAPER_IMPLEMENTATION_HUMAN_CONFIRMATION_SCOPES,
  type HumanConfirmationRecord,
  type PaperImplementationHumanConfirmationScope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-human-confirmation-contracts';
import {
  TOPIC_SELECTION_ACTOR_TYPES,
  type TopicSelectionActorType,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type { usePaperImplementationWorkbenchController } from './usePaperImplementationWorkbenchController';
import { StatusBadge, StatusLine } from './presentational';
import { compactList, formatRef, formatTimestamp } from './utils';

type Controller = ReturnType<typeof usePaperImplementationWorkbenchController>;

function ConfirmationRow({ record }: { record: HumanConfirmationRecord }) {
  const consumed = Boolean(record.consumed_at);
  return (
    <article data-ui="card" data-padding="sm">
      <div data-ui="stack" data-direction="col" data-gap="1">
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <div data-ui="stack" data-direction="row" data-gap="2" data-wrap="wrap" data-align="center">
            <span data-ui="badge" data-variant="subtle" data-tone="info">{record.confirmation_scope}</span>
            <StatusBadge value={record.status} />
            <span data-ui="badge" data-variant="subtle" data-tone={consumed ? 'neutral' : 'success'}>
              {consumed ? 'consumed' : 'active（未消费）'}
            </span>
          </div>
          <span data-ui="text" data-variant="caption" data-tone="muted">{record.confirmation_record_id}</span>
        </div>
        <p data-ui="text" data-variant="caption" data-tone="muted">
          target: {compactList(record.target_refs.map(formatRef))}
        </p>
        <p data-ui="text" data-variant="caption" data-tone="muted">
          confirmed_by: {record.confirmed_by_actor_type}
          {record.confirmed_by_actor_id ? ` (${record.confirmed_by_actor_id})` : ''} · created_at{' '}
          {formatTimestamp(record.created_at)}
        </p>
        <p data-ui="text" data-variant="caption" data-tone="muted">rationale: {record.rationale}</p>
        {consumed ? (
          <p data-ui="text" data-variant="caption" data-tone="secondary">
            consumed_at: {formatTimestamp(record.consumed_at)} · consumed_by:{' '}
            {record.consumed_by_ref ? formatRef(record.consumed_by_ref) : '--'}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function ConfirmationList({ controller }: { controller: Controller }) {
  const records = controller.confirmationRecords;
  return (
    <section data-ui="section" data-padding="none">
      <div data-ui="stack" data-direction="col" data-gap="2">
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <p data-ui="text" data-variant="label" data-tone="primary">HumanConfirmationRecord</p>
          <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap" data-align="center">
            <span data-ui="badge" data-variant="subtle" data-tone="neutral">{records.length}</span>
            <StatusBadge value={controller.confirmationStatus} />
          </div>
        </div>
        <StatusLine status="error" message={controller.confirmationError} />
        {records.length === 0 ? (
          <p data-ui="text" data-variant="caption" data-tone="muted">当前项目暂无确认记录。</p>
        ) : (
          <div data-ui="list" data-variant="rows" data-density="compact">
            {records.map((record) => (
              <ConfirmationRow key={record.confirmation_record_id} record={record} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ConfirmationCreateForm({ controller }: { controller: Controller }) {
  return (
    <section data-ui="section" data-padding="none">
      <div data-ui="stack" data-direction="col" data-gap="3">
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <p data-ui="text" data-variant="label" data-tone="primary">创建确认记录</p>
          <StatusBadge value={controller.confirmationActionStatus} />
        </div>
        <StatusLine status={controller.confirmationActionStatus} message={controller.confirmationActionMessage} />

        <div data-ui="grid" data-cols="2" data-gap="3">
          <label data-ui="field">
            <span data-slot="label">confirmation_scope</span>
            <select
              data-ui="select"
              data-size="sm"
              value={controller.confirmationScope}
              onChange={(event) =>
                controller.setConfirmationScope(
                  event.target.value as PaperImplementationHumanConfirmationScope,
                )
              }
            >
              {PAPER_IMPLEMENTATION_HUMAN_CONFIRMATION_SCOPES.map((scope) => (
                <option key={scope} value={scope}>{scope}</option>
              ))}
            </select>
          </label>
          <label data-ui="field">
            <span data-slot="label">confirmed_by_actor_type</span>
            <select
              data-ui="select"
              data-size="sm"
              value={controller.confirmationActorType}
              onChange={(event) =>
                controller.setConfirmationActorType(event.target.value as TopicSelectionActorType)
              }
            >
              {TOPIC_SELECTION_ACTOR_TYPES.map((actor) => (
                <option key={actor} value={actor}>{actor}</option>
              ))}
            </select>
          </label>
        </div>

        <label data-ui="field">
          <span data-slot="label">confirmed_by_actor_id（可选）</span>
          <input
            data-ui="input"
            data-size="sm"
            value={controller.confirmationActorId}
            onChange={(event) => controller.setConfirmationActorId(event.target.value)}
          />
        </label>

        <label data-ui="field">
          <span data-slot="label">rationale</span>
          <textarea
            data-ui="textarea"
            data-size="sm"
            rows={2}
            value={controller.confirmationRationale}
            onChange={(event) => controller.setConfirmationRationale(event.target.value)}
          />
        </label>

        <label data-ui="field">
          <span data-slot="label">target_refs（JSON，功能引用数组）</span>
          <textarea
            data-ui="textarea"
            data-size="sm"
            rows={4}
            spellCheck={false}
            value={controller.confirmationTargetRefsPayload}
            onChange={(event) => controller.setConfirmationTargetRefsPayload(event.target.value)}
          />
        </label>

        <label data-ui="field">
          <span data-slot="label">高级字段（JSON：reviewed_sources / gate_result_refs / transition_attempt_ref / policy_version_id）</span>
          <textarea
            data-ui="textarea"
            data-size="sm"
            rows={6}
            spellCheck={false}
            value={controller.confirmationAdvancedPayload}
            onChange={(event) => controller.setConfirmationAdvancedPayload(event.target.value)}
          />
        </label>

        <div data-ui="toolbar" data-wrap="wrap">
          <button
            data-ui="button"
            data-variant="primary"
            data-size="sm"
            type="button"
            onClick={() => void controller.createConfirmation()}
          >
            创建确认记录
          </button>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            消费状态（consumed_at/consumed_by_ref）由后端在被引用时写入，此处只读。
          </p>
        </div>
      </div>
    </section>
  );
}

export function ConfirmationPanel({ controller }: { controller: Controller }) {
  return (
    <section data-ui="section" data-padding="none">
      <div data-ui="stack" data-direction="col" data-gap="4">
        <div data-ui="stack" data-direction="col" data-gap="1">
          <p data-ui="text" data-variant="h3" data-tone="primary">确认入口</p>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            HumanConfirmationRecord 列表与创建（S0 移交，走既有确认路由）。
          </p>
        </div>
        <div data-ui="grid" data-cols="2" data-gap="4">
          <ConfirmationList controller={controller} />
          <ConfirmationCreateForm controller={controller} />
        </div>
      </div>
    </section>
  );
}
