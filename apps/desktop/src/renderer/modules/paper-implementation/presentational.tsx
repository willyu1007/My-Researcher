import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { formatRef, prettyJson, statusTone } from './utils';

export function StatusBadge({ value }: { value: string | null | undefined }) {
  const label = value ?? '--';
  switch (statusTone(value)) {
    case 'success':
      return <span data-ui="badge" data-variant="subtle" data-tone="success">{label}</span>;
    case 'warning':
      return <span data-ui="badge" data-variant="subtle" data-tone="warning">{label}</span>;
    case 'danger':
      return <span data-ui="badge" data-variant="subtle" data-tone="danger">{label}</span>;
    case 'info':
      return <span data-ui="badge" data-variant="subtle" data-tone="info">{label}</span>;
    case 'neutral':
      return <span data-ui="badge" data-variant="subtle" data-tone="neutral">{label}</span>;
  }
}

export function StatusLine({
  status,
  message,
}: {
  status: string;
  message?: string | null;
}) {
  if (!message) {
    return null;
  }
  if (status === 'error') {
    return <p data-ui="text" data-variant="caption" data-tone="danger">{message}</p>;
  }
  if (status === 'success') {
    return <p data-ui="text" data-variant="caption" data-tone="secondary">{message}</p>;
  }
  return <p data-ui="text" data-variant="caption" data-tone="muted">{message}</p>;
}

export function MetricTile({
  label,
  value,
  status,
}: {
  label: string;
  value: number | string;
  status?: string;
}) {
  return (
    <article data-ui="card" data-padding="sm">
      <div data-ui="stack" data-direction="col" data-gap="1">
        <p data-ui="text" data-variant="label" data-tone="muted">{label}</p>
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <p data-ui="text" data-variant="h3" data-tone="primary">{value}</p>
          {status ? <StatusBadge value={status} /> : null}
        </div>
      </div>
    </article>
  );
}

export function RefList({ refs }: { refs: TopicSelectionFunctionalRef[] }) {
  if (refs.length === 0) {
    return <p data-ui="text" data-variant="caption" data-tone="muted">--</p>;
  }
  return (
    <div data-ui="stack" data-direction="col" data-gap="0">
      {refs.map((ref, index) => (
        <p key={`${ref.ref_type}-${ref.ref_id}-${ref.version_id ?? 'none'}-${index}`} data-ui="text" data-variant="caption" data-tone="muted">
          {formatRef(ref)}
        </p>
      ))}
    </div>
  );
}

export function JsonViewer({ label, value, rows = 10 }: { label: string; value: unknown; rows?: number }) {
  return (
    <label data-ui="field">
      <span data-slot="label">{label}</span>
      <textarea
        data-ui="textarea"
        data-size="sm"
        rows={rows}
        readOnly
        spellCheck={false}
        value={prettyJson(value)}
      />
    </label>
  );
}
