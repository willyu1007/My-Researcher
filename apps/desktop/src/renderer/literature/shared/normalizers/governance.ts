import type {
  ArtifactBundle,
  ReleaseGateResponse,
  RuntimeMetric,
  TimelineEvent,
} from '../types';
import {
  asRecord,
  toOptionalNumber,
  toText,
} from './common';

export function normalizeTimelinePayload(payload: unknown): TimelineEvent[] {
  const root = asRecord(payload);
  if (!root) {
    return [];
  }

  const eventsRaw = root.events;
  if (!Array.isArray(eventsRaw)) {
    return [];
  }

  return eventsRaw
    .map((item): TimelineEvent | null => {
      const row = asRecord(item);
      if (!row) {
        return null;
      }

      const eventId = toText(row.event_id);
      const eventType = toText(row.event_type);
      const timestamp = toText(row.timestamp);
      const summary = toText(row.summary);
      if (!eventId || !eventType || !timestamp || !summary) {
        return null;
      }

      const severity = toText(row.severity);
      const normalizedSeverity: TimelineEvent['severity'] =
        severity === 'warning' || severity === 'error' || severity === 'info' ? severity : undefined;

      return {
        event_id: eventId,
        event_type: eventType,
        module_id: toText(row.module_id),
        timestamp,
        node_id: toText(row.node_id),
        summary,
        severity: normalizedSeverity,
      };
    })
    .filter((item): item is TimelineEvent => item !== null);
}

export function normalizeMetricPayload(payload: unknown): RuntimeMetric | null {
  const root = asRecord(payload);
  const metric = root ? asRecord(root.paper_runtime_metric) : null;
  if (!metric) {
    return null;
  }

  const updatedAt = toText(metric.updated_at);
  if (!updatedAt) {
    return null;
  }

  return {
    tokens: toOptionalNumber(metric.tokens),
    cost_usd: toOptionalNumber(metric.cost_usd),
    gpu_requested: toOptionalNumber(metric.gpu_requested),
    gpu_total: toOptionalNumber(metric.gpu_total),
    updated_at: updatedAt,
  };
}

export function normalizeArtifactPayload(payload: unknown): ArtifactBundle | null {
  const root = asRecord(payload);
  const bundle = root ? asRecord(root.artifact_bundle) : null;
  if (!bundle) {
    return null;
  }

  return {
    proposal_url: toText(bundle.proposal_url) ?? null,
    paper_url: toText(bundle.paper_url) ?? null,
    repo_url: toText(bundle.repo_url) ?? null,
    review_url: toText(bundle.review_url) ?? null,
  };
}

export function normalizeReleasePayload(payload: unknown): ReleaseGateResponse | null {
  const root = asRecord(payload);
  const gateResult = root ? asRecord(root.gate_result) : null;
  if (!gateResult) {
    return null;
  }

  const reviewId = toText(gateResult.review_id);
  const auditRef = toText(gateResult.audit_ref);
  const accepted = gateResult.accepted;
  if (!reviewId || !auditRef || typeof accepted !== 'boolean') {
    return null;
  }

  return {
    gate_result: {
      accepted,
      review_id: reviewId,
      approved_by: toText(gateResult.approved_by),
      approved_at: toText(gateResult.approved_at),
      audit_ref: auditRef,
    },
  };
}
