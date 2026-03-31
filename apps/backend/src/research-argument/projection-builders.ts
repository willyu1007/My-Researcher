import type {
  ClaimEvidenceCoverageRow,
  DecisionTimelineEntry,
  ProtocolBaselineReproReadiness,
  ReportProjection,
} from '@paper-engineering-assistant/shared/research-lifecycle/research-argument-contracts';
import type { AbstractStateSnapshot } from '@paper-engineering-assistant/shared/research-lifecycle/research-argument-contracts';
import { dedupeObjectPointers, dedupeSourceTraceRefs } from './support.js';

export function buildCoverageProjection(params: {
  workspace_id: string;
  branch_id: string;
  rows: ClaimEvidenceCoverageRow[];
  now: string;
}): ReportProjection {
  const totalClaims = params.rows.length;
  const fullyCoveredClaims = params.rows.filter(
    (row) => row.missing_requirement_count === 0 && row.required_evidence_types.length > 0,
  ).length;

  return {
    report_projection_id: `${params.branch_id}:coverage`,
    workspace_id: params.workspace_id,
    branch_id: params.branch_id,
    report_kind: 'coverage',
    summary: `${fullyCoveredClaims}/${totalClaims} claims have full evidence coverage.`,
    object_pointers: dedupeObjectPointers(
      params.rows.map((row) => ({
        pointer_kind: 'claim',
        object_id: row.claim_id,
      })),
    ),
    source_trace_refs: dedupeSourceTraceRefs(
      params.rows.flatMap((row) => row.source_trace_refs),
    ),
    created_at: params.now,
    updated_at: params.now,
  };
}

export function buildReadinessProjection(params: {
  snapshot: AbstractStateSnapshot;
  readiness: ProtocolBaselineReproReadiness;
  analysis_finding_ids?: string[];
  now: string;
}): ReportProjection {
  const failingDimensions = Object.values(params.snapshot.dimensions)
    .filter(
      (dimension) =>
        dimension.level !== 'Strong' && dimension.level !== 'Sufficient',
    )
    .map((dimension) => dimension.dimension_name);

  return {
    report_projection_id: `${params.snapshot.branch_id}:readiness`,
    workspace_id: params.snapshot.workspace_id,
    branch_id: params.snapshot.branch_id,
    report_kind: 'readiness',
    summary: `Stage ${params.snapshot.stage} with ${failingDimensions.length} dimensions below threshold.`,
    object_pointers: dedupeObjectPointers([
      {
        pointer_kind: 'workspace',
        object_id: params.snapshot.workspace_id,
      },
      {
        pointer_kind: 'branch',
        object_id: params.snapshot.branch_id,
      },
      ...params.readiness.baseline_set_ids.map((baselineSetId) => ({
        pointer_kind: 'baseline_set' as const,
        object_id: baselineSetId,
      })),
      ...params.readiness.protocol_ids.map((protocolId) => ({
        pointer_kind: 'protocol' as const,
        object_id: protocolId,
      })),
      ...params.readiness.repro_item_ids.map((reproItemId) => ({
        pointer_kind: 'repro_item' as const,
        object_id: reproItemId,
      })),
      ...params.readiness.run_ids.map((runId) => ({
        pointer_kind: 'run' as const,
        object_id: runId,
      })),
      ...params.readiness.artifact_ids.map((artifactId) => ({
        pointer_kind: 'artifact' as const,
        object_id: artifactId,
      })),
      ...(params.analysis_finding_ids ?? []).map((analysisFindingId) => ({
        pointer_kind: 'analysis_finding' as const,
        object_id: analysisFindingId,
      })),
    ]),
    source_trace_refs: dedupeSourceTraceRefs(
      Object.values(params.snapshot.dimensions).flatMap(
        (dimension) => dimension.evidence_refs,
      ),
    ),
    created_at: params.now,
    updated_at: params.now,
  };
}

export function buildDecisionTimelineProjection(params: {
  workspace_id: string;
  branch_id: string;
  timeline: DecisionTimelineEntry[];
  now: string;
}): ReportProjection {
  const lastDecision = params.timeline[params.timeline.length - 1];
  return {
    report_projection_id: `${params.branch_id}:decision_timeline`,
    workspace_id: params.workspace_id,
    branch_id: params.branch_id,
    report_kind: 'decision_timeline',
    summary: lastDecision
      ? `Latest decision: ${lastDecision.action} at ${lastDecision.created_at}.`
      : 'No structural decisions have been recorded yet.',
    object_pointers: dedupeObjectPointers(
      params.timeline.flatMap((entry) => entry.linked_object_pointers),
    ),
    source_trace_refs: [],
    created_at: params.now,
    updated_at: params.now,
  };
}
