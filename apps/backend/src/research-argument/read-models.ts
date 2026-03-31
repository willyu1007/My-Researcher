import type {
  ClaimEvidenceCoverageRow,
  DecisionTimelineEntry,
  ProtocolBaselineReproReadiness,
  WorkspaceSummary,
} from '@paper-engineering-assistant/shared/research-lifecycle/research-argument-contracts';
import type {
  DecisionRecord,
  PointerKind,
  ReportProjection,
  ResearchArgumentWorkspace,
} from '@paper-engineering-assistant/shared/research-lifecycle/research-argument-contracts';
import type { AbstractStateSnapshot } from '@paper-engineering-assistant/shared/research-lifecycle/research-argument-contracts';
import type { ResearchArgumentBranchGraph } from './branch-graph.js';
import { dedupeObjectPointers, dedupeSourceTraceRefs, dedupeStrings } from './support.js';

export function buildWorkspaceSummary(params: {
  workspace: ResearchArgumentWorkspace;
  graph: ResearchArgumentBranchGraph;
  snapshot: AbstractStateSnapshot | null;
  reportProjections: ReportProjection[];
}): WorkspaceSummary {
  const criticalBlockerCount = params.snapshot
    ? Object.values(params.snapshot.dimensions).reduce(
        (count, dimension) =>
          count
          + dimension.blockers.filter((blocker) => blocker.severity === 'critical').length,
        0,
      )
    : 0;

  return {
    workspace_id: params.workspace.workspace_id,
    title_card_id: params.workspace.title_card_id,
    workspace_status: params.workspace.workspace_status,
    active_branch_id: params.workspace.active_branch_id,
    current_stage: params.workspace.current_stage,
    current_readiness_decision: undefined,
    critical_blocker_count: criticalBlockerCount,
    open_issue_count: params.graph.issue_findings.length,
    claim_count: params.graph.claims.length,
    evidence_requirement_count: params.graph.evidence_requirements.length,
    evidence_item_count: params.graph.evidence_items.length,
    report_pointers: params.workspace.report_pointers,
    updated_at: latestTimestamp([
      params.workspace.updated_at,
      params.snapshot?.updated_at,
      ...params.reportProjections.map((projection) => projection.updated_at),
    ]),
  };
}

export function buildClaimEvidenceCoverageRows(
  graph: ResearchArgumentBranchGraph,
): ClaimEvidenceCoverageRow[] {
  return graph.claims
    .map((claim) => {
      const requirements = graph.evidence_requirements.filter(
        (requirement) => requirement.claim_id === claim.claim_id,
      );
      return {
        claim_id: claim.claim_id,
        claim_text: claim.text,
        claim_status: claim.claim_status,
        claim_strength: claim.claim_strength,
        required_evidence_types: requirements.map(
          (requirement) => requirement.required_evidence_type,
        ),
        satisfied_requirement_count: requirements.filter(
          (requirement) => requirement.status === 'satisfied',
        ).length,
        missing_requirement_count: requirements.filter(
          (requirement) => requirement.status !== 'satisfied',
        ).length,
        support_state: claim.support_state,
        evidence_pointers: dedupeObjectPointers(
          graph.evidence_items
            .filter(
              (evidenceItem) =>
                evidenceItem.linked_claim_ids.includes(claim.claim_id)
                || evidenceItem.linked_requirement_ids.some((requirementId) =>
                  requirements.some(
                    (requirement) =>
                      requirement.evidence_requirement_id === requirementId,
                  ),
                ),
            )
            .map((evidenceItem) => ({
              pointer_kind: 'evidence_item' as const,
              object_id: evidenceItem.evidence_item_id,
            })),
        ),
        source_trace_refs: dedupeSourceTraceRefs([
          ...(claim.source_trace_refs ?? []),
          ...graph.evidence_items.flatMap((evidenceItem) =>
            evidenceItem.linked_claim_ids.includes(claim.claim_id)
              ? evidenceItem.provenance ?? []
              : [],
          ),
        ]),
      };
    })
    .sort((left, right) => left.claim_id.localeCompare(right.claim_id));
}

export function buildProtocolBaselineReproReadiness(params: {
  workspace_id: string;
  branch_id: string;
  graph: ResearchArgumentBranchGraph;
  snapshot: AbstractStateSnapshot;
}): ProtocolBaselineReproReadiness {
  return {
    workspace_id: params.workspace_id,
    branch_id: params.branch_id,
    evaluation_soundness: params.snapshot.dimensions.EvaluationSoundness,
    reproducibility_readiness:
      params.snapshot.dimensions.ReproducibilityReadiness,
    baseline_set_ids: params.graph.baseline_sets.map(
      (baselineSet) => baselineSet.baseline_set_id,
    ),
    protocol_ids: params.graph.protocols.map((protocol) => protocol.protocol_id),
    repro_item_ids: params.graph.repro_items.map((item) => item.repro_item_id),
    run_ids: params.graph.runs.map((run) => run.run_id),
    artifact_ids: params.graph.artifacts.map((artifact) => artifact.artifact_id),
    blockers: dedupeStrings([
      ...params.snapshot.dimensions.EvaluationSoundness.blockers.map(
        (blocker) => blocker.summary,
      ),
      ...params.snapshot.dimensions.ReproducibilityReadiness.blockers.map(
        (blocker) => blocker.summary,
      ),
    ]),
    missing_items: dedupeStrings([
      ...params.graph.evidence_requirements
        .filter((requirement) => requirement.status !== 'satisfied')
        .map(
          (requirement) =>
            `Unsatisfied evidence requirement ${requirement.evidence_requirement_id}`,
        ),
      ...params.graph.repro_items
        .filter((item) => item.status === 'missing' || item.status === 'partial')
        .map((item) => `Incomplete repro item ${item.repro_item_id}`),
    ]),
    updated_at: params.snapshot.updated_at,
  };
}

export function buildDecisionTimelineEntries(
  decisions: DecisionRecord[],
  graph?: ResearchArgumentBranchGraph,
): DecisionTimelineEntry[] {
  const objectKindIndex = graph ? buildObjectKindIndex(graph) : new Map<string, PointerKind>();
  return decisions.map((decision) => ({
    decision_id: decision.decision_id,
    workspace_id: decision.workspace_id,
    branch_id: decision.branch_id,
    action: decision.action,
    summary: decision.reason,
    actor: decision.actor,
    human_confirmed: decision.human_confirmed,
    audit_ref: decision.audit_ref,
    linked_object_pointers: dedupeObjectPointers(
      (decision.linked_object_ids ?? []).map((objectId) => ({
        pointer_kind: objectKindIndex.get(objectId) ?? 'external_document',
        object_id: objectId,
      })),
    ),
    created_at: decision.created_at,
  }));
}

function latestTimestamp(values: Array<string | undefined>): string {
  const existing = values.filter((value): value is string => Boolean(value));
  existing.sort((left, right) => right.localeCompare(left));
  return existing[0] ?? new Date(0).toISOString();
}

function buildObjectKindIndex(
  graph: ResearchArgumentBranchGraph,
): Map<string, PointerKind> {
  const index = new Map<string, PointerKind>();
  const register = (pointerKind: PointerKind, objectIds: string[]) => {
    for (const objectId of objectIds) {
      if (!index.has(objectId)) {
        index.set(objectId, pointerKind);
      }
    }
  };

  register('problem', graph.problems.map((item) => item.problem_id));
  register(
    'value_hypothesis',
    graph.value_hypotheses.map((item) => item.value_hypothesis_id),
  );
  register(
    'contribution_delta',
    graph.contribution_deltas.map((item) => item.contribution_delta_id),
  );
  register('claim', graph.claims.map((item) => item.claim_id));
  register(
    'evidence_requirement',
    graph.evidence_requirements.map((item) => item.evidence_requirement_id),
  );
  register('evidence_item', graph.evidence_items.map((item) => item.evidence_item_id));
  register('baseline_set', graph.baseline_sets.map((item) => item.baseline_set_id));
  register('protocol', graph.protocols.map((item) => item.protocol_id));
  register('repro_item', graph.repro_items.map((item) => item.repro_item_id));
  register('run', graph.runs.map((item) => item.run_id));
  register('artifact', graph.artifacts.map((item) => item.artifact_id));
  register('boundary', graph.boundaries.map((item) => item.boundary_id));
  register(
    'analysis_finding',
    graph.analysis_findings.map((item) => item.analysis_finding_id),
  );
  register('issue_finding', graph.issue_findings.map((item) => item.issue_finding_id));

  return index;
}
