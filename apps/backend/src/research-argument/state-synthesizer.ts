import type {
  AbstractState,
  BlockerRef,
  DimensionName,
  DimensionState,
  IssueFinding,
  ReadinessLevel,
  SourceTraceRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/research-argument-contracts';
import type { AbstractStateSnapshot } from '@paper-engineering-assistant/shared/research-lifecycle/research-argument-contracts';
import type { ResearchArgumentBranchGraph } from './branch-graph.js';
import {
  clamp,
  dedupeBlockers,
  dedupeSourceTraceRefs,
  pickLatestByUpdatedAt,
  roundNumber,
} from './support.js';

const DIMENSION_THRESHOLD = 70;
const STAGE1_DIMENSIONS: DimensionName[] = [
  'ProblemImportance',
  'ContributionValue',
  'NoveltyDelta',
  'OutcomeFeasibility',
];
const STAGE2_DIMENSIONS: DimensionName[] = [
  'ClaimSharpness',
  'EvidenceCompleteness',
  'EvaluationSoundness',
  'BoundaryRiskCoverage',
  'ReproducibilityReadiness',
];

type DimensionComputation = {
  score: number;
  confidence: number;
  blockers: BlockerRef[];
  evidence_refs: SourceTraceRef[];
  rationale: string;
};

type SynthesisInput = {
  workspace_id: string;
  branch_id: string;
  graph: ResearchArgumentBranchGraph;
  previous_snapshot: AbstractStateSnapshot | null;
  snapshot_id: string;
  now: string;
};

export function synthesizeAbstractStateSnapshot(
  input: SynthesisInput,
): AbstractStateSnapshot {
  const computations: Record<DimensionName, DimensionComputation> = {
    ProblemImportance: computeProblemImportance(input.graph),
    ContributionValue: computeContributionValue(input.graph),
    NoveltyDelta: computeNoveltyDelta(input.graph),
    OutcomeFeasibility: computeOutcomeFeasibility(input.graph),
    ClaimSharpness: computeClaimSharpness(input.graph),
    EvidenceCompleteness: computeEvidenceCompleteness(input.graph),
    EvaluationSoundness: computeEvaluationSoundness(input.graph),
    BoundaryRiskCoverage: computeBoundaryRiskCoverage(input.graph),
    ReproducibilityReadiness: computeReproducibilityReadiness(input.graph),
  };

  const stage1Satisfied = stageSatisfied(computations, STAGE1_DIMENSIONS);
  const stage2Satisfied = stageSatisfied(computations, STAGE2_DIMENSIONS);
  const currentStage: AbstractState['stage'] = stage1Satisfied
    ? 'Stage2_ReadyForWritingEntry'
    : 'Stage1_WorthContinuing';
  const currentStageDimensions =
    currentStage === 'Stage1_WorthContinuing' ? STAGE1_DIMENSIONS : STAGE2_DIMENSIONS;

  const dimensions = Object.fromEntries(
    (Object.keys(computations) as DimensionName[]).map((dimensionName) => [
      dimensionName,
      buildDimensionState(
        dimensionName,
        computations[dimensionName],
        currentStageDimensions.includes(dimensionName),
        input.previous_snapshot,
        input.now,
      ),
    ]),
  ) as Record<DimensionName, DimensionState>;

  const currentGoalSatisfied =
    currentStage === 'Stage1_WorthContinuing'
      ? stage1Satisfied
      : stage1Satisfied && stage2Satisfied;
  const nextBestTargets = [...currentStageDimensions]
    .filter(
      (dimensionName) =>
        dimensions[dimensionName].gap > 0
        || dimensions[dimensionName].level === 'Blocked',
    )
    .sort((left, right) => {
      const gapCompare = dimensions[right].gap - dimensions[left].gap;
      if (gapCompare !== 0) {
        return gapCompare;
      }
      return dimensions[left].score - dimensions[right].score;
    })
    .slice(0, 3);
  const averageVelocity =
    currentStageDimensions.reduce(
      (sum, dimensionName) => sum + Math.abs(dimensions[dimensionName].velocity),
      0,
    ) / currentStageDimensions.length;

  return {
    snapshot_id: input.snapshot_id,
    workspace_id: input.workspace_id,
    branch_id: input.branch_id,
    stage: currentStage,
    dimensions,
    global_flags: {
      has_critical_blocker: (Object.keys(dimensions) as DimensionName[]).some((dimensionName) =>
        dimensions[dimensionName].blockers.some((blocker) => blocker.severity === 'critical'),
      ),
      is_plateauing:
        Boolean(input.previous_snapshot) && !currentGoalSatisfied && averageVelocity < 1,
      is_oscillating: false,
      has_dominated_branch: false,
    },
    derived: {
      current_goal_satisfied: currentGoalSatisfied,
      next_best_targets: nextBestTargets,
    },
    version: (input.previous_snapshot?.version ?? 0) + 1,
    created_at: input.now,
    updated_at: input.now,
  };
}

function stageSatisfied(
  computations: Record<DimensionName, DimensionComputation>,
  dimensions: DimensionName[],
): boolean {
  return dimensions.every(
    (dimensionName) =>
      computations[dimensionName].score >= DIMENSION_THRESHOLD
      && !computations[dimensionName].blockers.some(
        (blocker) => blocker.severity === 'critical',
      ),
  );
}

function buildDimensionState(
  dimensionName: DimensionName,
  computation: DimensionComputation,
  relevantToCurrentStage: boolean,
  previousSnapshot: AbstractStateSnapshot | null,
  now: string,
): DimensionState {
  const previousScore = previousSnapshot?.dimensions[dimensionName]?.score ?? computation.score;
  const blockers = dedupeBlockers(computation.blockers);
  return {
    dimension_name: dimensionName,
    level: resolveReadinessLevel(computation.score, blockers),
    score: roundNumber(computation.score),
    confidence: roundNumber(computation.confidence),
    gap: relevantToCurrentStage
      ? roundNumber(Math.max(0, DIMENSION_THRESHOLD - computation.score))
      : 0,
    velocity: roundNumber(computation.score - previousScore),
    blockers,
    evidence_refs: dedupeSourceTraceRefs(computation.evidence_refs),
    updated_at: now,
    rationale: computation.rationale,
  };
}

function resolveReadinessLevel(
  score: number,
  blockers: BlockerRef[],
): ReadinessLevel {
  if (blockers.some((blocker) => blocker.severity === 'critical')) {
    return 'Blocked';
  }
  if (score >= 85) {
    return 'Strong';
  }
  if (score >= DIMENSION_THRESHOLD) {
    return 'Sufficient';
  }
  if (score > 0) {
    return 'Partial';
  }
  return 'Unknown';
}

function computeProblemImportance(graph: ResearchArgumentBranchGraph): DimensionComputation {
  const problem = pickLatestByUpdatedAt(graph.problems);
  if (!problem) {
    return missingDimension(
      'problem-importance-missing-problem',
      'critical',
      'No problem statement has been recorded.',
    );
  }

  const completeness = [
    1,
    problem.importance_rationale ? 1 : 0,
    problem.target_domain || problem.audience ? 1 : 0,
    problem.pain_point ? 1 : 0,
    problem.scope || (problem.non_goals?.length ?? 0) > 0 ? 1 : 0,
    (problem.source_trace_refs?.length ?? 0) > 0 ? 1 : 0,
  ];
  return {
    score: (sum(completeness) / completeness.length) * 100,
    confidence: confidenceFromEvidence(
      sum(completeness) / completeness.length * 100,
      completeness.length,
      problem.source_trace_refs ?? [],
    ),
    blockers: [
      ...missingTextBlocker(
        'problem-importance-rationale',
        problem.importance_rationale,
        'high',
        'Problem importance rationale is missing.',
        problem.problem_id,
      ),
    ],
    evidence_refs: problem.source_trace_refs ?? [],
    rationale: 'Problem importance depends on a grounded problem statement, rationale, scope, and upstream traceability.',
  };
}

function computeContributionValue(graph: ResearchArgumentBranchGraph): DimensionComputation {
  if (graph.value_hypotheses.length === 0) {
    return missingDimension(
      'contribution-value-missing-value-hypothesis',
      'high',
      'No value hypothesis has been recorded.',
    );
  }
  if (graph.contribution_deltas.length === 0) {
    return missingDimension(
      'contribution-value-missing-delta',
      'high',
      'No contribution delta has been recorded.',
    );
  }

  const activeClaims = graph.claims.filter((claim) => claim.claim_status === 'active');
  const valueCompleteness =
    average(
      graph.value_hypotheses.map((valueHypothesis) => {
        const fields = [
          valueHypothesis.expected_impact ? 1 : 0,
          valueHypothesis.target_users_or_community ? 1 : 0,
          valueHypothesis.success_condition ? 1 : 0,
          valueHypothesis.failure_condition ? 1 : 0,
          (valueHypothesis.source_trace_refs?.length ?? 0) > 0 ? 1 : 0,
        ];
        return sum(fields) / fields.length;
      }),
    ) * 100;
  const score = clamp(
    valueCompleteness * 0.55
      + Math.min(activeClaims.length, 3) / 3 * 25
      + Math.min(graph.contribution_deltas.length, 3) / 3 * 20,
    0,
    100,
  );

  return {
    score,
    confidence: confidenceFromEvidence(
      score,
      graph.value_hypotheses.length + graph.contribution_deltas.length + activeClaims.length,
      collectTracesFromObjects([
        ...graph.value_hypotheses,
        ...graph.contribution_deltas,
        ...activeClaims,
      ]),
    ),
    blockers: activeClaims.length === 0
      ? [
          {
            blocker_id: 'contribution-value-no-active-claims',
            severity: 'high',
            summary: 'Contribution value is not grounded in active claims yet.',
          },
        ]
      : [],
    evidence_refs: collectTracesFromObjects([
      ...graph.value_hypotheses,
      ...graph.contribution_deltas,
      ...activeClaims,
    ]),
    rationale: 'Contribution value depends on explicit value hypotheses, deltas against prior work, and active claims.',
  };
}

function computeNoveltyDelta(graph: ResearchArgumentBranchGraph): DimensionComputation {
  if (graph.contribution_deltas.length === 0) {
    return missingDimension(
      'novelty-delta-missing-contribution-delta',
      'critical',
      'Novelty delta requires at least one contribution delta.',
    );
  }

  const score = average(
    graph.contribution_deltas.map((delta) => {
      const fields = [
        delta.anchor_work_ids.length > 0 ? 1 : 0,
        (delta.closest_competitors?.length ?? 0) > 0 ? 1 : 0,
        delta.delta_summary ? 1 : 0,
        (delta.novelty_risk_notes?.length ?? 0) > 0 ? 1 : 0,
        (delta.source_trace_refs?.length ?? 0) > 0 ? 1 : 0,
      ];
      return sum(fields) / fields.length;
    }),
  ) * 100;

  return {
    score,
    confidence: confidenceFromEvidence(
      score,
      graph.contribution_deltas.length,
      collectTracesFromObjects(graph.contribution_deltas),
    ),
    blockers: graph.contribution_deltas.some(
      (delta) =>
        delta.anchor_work_ids.length === 0 || (delta.closest_competitors?.length ?? 0) === 0,
    )
      ? [
          {
            blocker_id: 'novelty-delta-weak-competitor-grounding',
            severity: 'high',
            summary: 'Novelty delta is missing anchor works or closest competitors for comparison.',
          },
        ]
      : [],
    evidence_refs: collectTracesFromObjects(graph.contribution_deltas),
    rationale: 'Novelty delta depends on explicit comparison anchors, competitors, and traceable differentiation notes.',
  };
}

function computeOutcomeFeasibility(graph: ResearchArgumentBranchGraph): DimensionComputation {
  const runs = graph.runs.length;
  const succeededRuns = graph.runs.filter((run) => run.status === 'succeeded').length;
  const failedRuns = graph.runs.filter((run) => run.status === 'failed').length;
  const issueBlockers = blockersFromIssueFindings(graph.issue_findings, 'OutcomeFeasibility');
  return {
    score: clamp(
      (graph.protocols.length > 0 ? 30 : 0)
        + (runs > 0 ? 20 : 0)
        + (runs > 0 ? (succeededRuns / runs) * 30 : 0)
        + (failedRuns === 0 ? 20 : Math.max(0, 20 - failedRuns * 10)),
      0,
      100,
    ),
    confidence: confidenceFromEvidence(
      graph.protocols.length * 15 + succeededRuns * 10,
      graph.protocols.length + graph.runs.length,
      collectTracesFromObjects([...graph.protocols, ...graph.analysis_findings]),
    ),
    blockers: [
      ...(graph.protocols.length === 0
        ? [{
            blocker_id: 'outcome-feasibility-missing-protocol',
            severity: 'high' as const,
            summary: 'Outcome feasibility requires at least one protocol.',
          }]
        : []),
      ...(runs === 0
        ? [{
            blocker_id: 'outcome-feasibility-missing-run',
            severity: 'high' as const,
            summary: 'Outcome feasibility requires at least one run or probe.',
          }]
        : []),
      ...issueBlockers,
    ],
    evidence_refs: collectTracesFromObjects([...graph.protocols, ...graph.analysis_findings]),
    rationale: 'Outcome feasibility depends on executable protocols, run outcomes, and unresolved feasibility issues.',
  };
}

function computeClaimSharpness(graph: ResearchArgumentBranchGraph): DimensionComputation {
  const activeClaims = graph.claims.filter((claim) => claim.claim_status === 'active');
  if (activeClaims.length === 0) {
    return missingDimension(
      'claim-sharpness-no-active-claim',
      'critical',
      'Claim sharpness requires at least one active claim.',
    );
  }

  const score = average(
    activeClaims.map((claim) => {
      const values = [
        claim.linked_evidence_requirement_ids.length > 0 ? 1 : 0,
        claim.scope ? 1 : 0,
        claim.claim_strength !== 'tentative' ? 1 : 0.5,
        (claim.linked_boundary_ids?.length ?? 0) > 0 ? 1 : 0,
      ];
      return sum(values) / values.length;
    }),
  ) * 100;

  return {
    score,
    confidence: confidenceFromEvidence(
      score,
      activeClaims.length,
      collectTracesFromObjects(activeClaims),
    ),
    blockers: activeClaims.flatMap((claim) => {
      const blockers: BlockerRef[] = [];
      if (!claim.scope) {
        blockers.push({
          blocker_id: `claim-sharpness-scope-${claim.claim_id}`,
          severity: 'medium',
          summary: 'An active claim is missing an explicit scope.',
          linked_object_ids: [claim.claim_id],
        });
      }
      if (claim.linked_evidence_requirement_ids.length === 0) {
        blockers.push({
          blocker_id: `claim-sharpness-requirements-${claim.claim_id}`,
          severity: 'high',
          summary: 'An active claim is missing linked evidence requirements.',
          linked_object_ids: [claim.claim_id],
        });
      }
      return blockers;
    }),
    evidence_refs: collectTracesFromObjects(activeClaims),
    rationale: 'Claim sharpness depends on scoped active claims with linked requirements and boundary context.',
  };
}

function computeEvidenceCompleteness(graph: ResearchArgumentBranchGraph): DimensionComputation {
  if (graph.evidence_requirements.length === 0) {
    return missingDimension(
      'evidence-completeness-no-requirements',
      'critical',
      'Evidence completeness requires at least one evidence requirement.',
    );
  }

  const mandatoryRequirements = graph.evidence_requirements.filter((requirement) => requirement.is_mandatory);
  const satisfiedRequirements = graph.evidence_requirements.filter((requirement) => requirement.status === 'satisfied');
  const satisfiedMandatory = mandatoryRequirements.filter((requirement) => requirement.status === 'satisfied');
  const mandatoryRatio =
    mandatoryRequirements.length === 0 ? 1 : satisfiedMandatory.length / mandatoryRequirements.length;
  const allRatio = satisfiedRequirements.length / graph.evidence_requirements.length;
  const evidenceCoverage = graph.evidence_items.length / graph.evidence_requirements.length;

  return {
    score: clamp(
      mandatoryRatio * 60 + allRatio * 25 + Math.min(1, evidenceCoverage) * 15,
      0,
      100,
    ),
    confidence: confidenceFromEvidence(
      allRatio * 100,
      graph.evidence_items.length + graph.evidence_requirements.length,
      collectTracesFromObjects([...graph.claims, ...graph.evidence_items]),
    ),
    blockers: mandatoryRatio < 1
      ? [
          {
            blocker_id: 'evidence-completeness-mandatory-gap',
            severity: 'critical',
            summary: 'Mandatory evidence requirements are still missing.',
            linked_object_ids: mandatoryRequirements
              .filter((requirement) => requirement.status !== 'satisfied')
              .map((requirement) => requirement.evidence_requirement_id),
          },
        ]
      : [],
    evidence_refs: collectTracesFromObjects([...graph.claims, ...graph.evidence_items]),
    rationale: 'Evidence completeness depends on satisfying mandatory requirements and grounding them in collected evidence.',
  };
}

function computeEvaluationSoundness(graph: ResearchArgumentBranchGraph): DimensionComputation {
  const successfulRuns = graph.runs.filter((run) => run.status === 'succeeded').length;
  const reusableArtifacts = graph.artifacts.filter((artifact) => artifact.is_reusable).length;
  const fairnessRiskCount = graph.baseline_sets.reduce(
    (count, baselineSet) => count + (baselineSet.fairness_risks?.length ?? 0),
    0,
  );
  const issueBlockers = blockersFromIssueFindings(graph.issue_findings, 'EvaluationSoundness');

  return {
    score: clamp(
      (graph.baseline_sets.length > 0 ? 22 : 0)
        + (graph.protocols.length > 0 ? 22 : 0)
        + (successfulRuns > 0 ? 22 : 0)
        + (reusableArtifacts > 0 ? 14 : 0)
        + (graph.analysis_findings.length > 0 ? 20 : 0)
        - fairnessRiskCount * 5,
      0,
      100,
    ),
    confidence: confidenceFromEvidence(
      successfulRuns * 20 + graph.analysis_findings.length * 10,
      graph.baseline_sets.length + graph.protocols.length + successfulRuns + graph.analysis_findings.length,
      collectTracesFromObjects([
        ...graph.baseline_sets,
        ...graph.protocols,
        ...graph.analysis_findings,
      ]),
    ),
    blockers: [
      ...(graph.baseline_sets.length === 0
        ? [{
            blocker_id: 'evaluation-soundness-no-baseline',
            severity: 'high' as const,
            summary: 'Evaluation soundness requires at least one baseline set.',
          }]
        : []),
      ...(graph.protocols.length === 0
        ? [{
            blocker_id: 'evaluation-soundness-no-protocol',
            severity: 'high' as const,
            summary: 'Evaluation soundness requires at least one protocol.',
          }]
        : []),
      ...(successfulRuns === 0
        ? [{
            blocker_id: 'evaluation-soundness-no-successful-run',
            severity: 'high' as const,
            summary: 'Evaluation soundness requires at least one successful run.',
          }]
        : []),
      ...issueBlockers,
    ],
    evidence_refs: collectTracesFromObjects([
      ...graph.baseline_sets,
      ...graph.protocols,
      ...graph.analysis_findings,
    ]),
    rationale: 'Evaluation soundness must remain explainable through baselines, protocols, runs, artifacts, and analysis findings.',
  };
}

function computeBoundaryRiskCoverage(graph: ResearchArgumentBranchGraph): DimensionComputation {
  const limitationFindings = graph.analysis_findings.filter(
    (finding) => finding.finding_type === 'limitation' || finding.finding_type === 'failure_case',
  );
  const linkedClaimCoverage =
    graph.claims.length === 0
      ? 0
      : graph.boundaries.filter((boundary) => boundary.linked_claim_ids.length > 0).length / graph.claims.length;
  const issueBlockers = blockersFromIssueFindings(graph.issue_findings, 'BoundaryRiskCoverage');

  return {
    score: clamp(
      (graph.boundaries.length > 0 ? 45 : 0)
        + Math.min(1, linkedClaimCoverage) * 25
        + (limitationFindings.length > 0 ? 20 : 0)
        + (issueBlockers.length === 0 ? 10 : 0),
      0,
      100,
    ),
    confidence: confidenceFromEvidence(
      graph.boundaries.length * 20 + limitationFindings.length * 10,
      graph.boundaries.length + limitationFindings.length,
      collectTracesFromObjects([...graph.boundaries, ...limitationFindings]),
    ),
    blockers: [
      ...(graph.boundaries.length === 0
        ? [{
            blocker_id: 'boundary-risk-no-boundary',
            severity: 'high' as const,
            summary: 'Boundary risk coverage requires explicit boundary records.',
          }]
        : []),
      ...issueBlockers,
    ],
    evidence_refs: collectTracesFromObjects([...graph.boundaries, ...limitationFindings]),
    rationale: 'Boundary risk coverage depends on explicit limitations, failure modes, and threat-to-validity records linked to claims.',
  };
}

function computeReproducibilityReadiness(graph: ResearchArgumentBranchGraph): DimensionComputation {
  const readyReproItems = graph.repro_items.filter(
    (item) => item.status === 'ready' || item.status === 'verified',
  ).length;
  const reusableArtifacts = graph.artifacts.filter((artifact) => artifact.is_reusable).length;
  const successfulRuns = graph.runs.filter((run) => run.status === 'succeeded').length;
  const protocolsWithRepro = graph.protocols.filter(
    (protocol) => (protocol.repro_requirements?.length ?? 0) > 0,
  ).length;

  return {
    score: clamp(
      (graph.repro_items.length > 0 ? (readyReproItems / graph.repro_items.length) * 45 : 0)
        + (successfulRuns > 0 ? 20 : 0)
        + (reusableArtifacts > 0 ? 20 : 0)
        + (protocolsWithRepro > 0 ? 15 : 0),
      0,
      100,
    ),
    confidence: confidenceFromEvidence(
      readyReproItems * 15 + successfulRuns * 10,
      graph.repro_items.length + successfulRuns + reusableArtifacts,
      collectTracesFromObjects([...graph.protocols, ...graph.artifacts]),
    ),
    blockers: [
      ...(graph.repro_items.length === 0
        ? [{
            blocker_id: 'reproducibility-no-repro-item',
            severity: 'high' as const,
            summary: 'Reproducibility readiness requires repro items.',
          }]
        : []),
      ...(readyReproItems < graph.repro_items.length
        ? [{
            blocker_id: 'reproducibility-incomplete-items',
            severity: 'high' as const,
            summary: 'Some repro items are still missing or partial.',
            linked_object_ids: graph.repro_items
              .filter((item) => item.status === 'missing' || item.status === 'partial')
              .map((item) => item.repro_item_id),
          }]
        : []),
    ],
    evidence_refs: collectTracesFromObjects([...graph.protocols, ...graph.artifacts]),
    rationale: 'Reproducibility readiness must remain explainable through protocols, repro items, runs, and reusable artifacts.',
  };
}

function blockersFromIssueFindings(
  issueFindings: IssueFinding[],
  dimensionName: DimensionName,
): BlockerRef[] {
  return issueFindings
    .filter((finding) => (finding.dimension_names ?? []).includes(dimensionName))
    .map((finding) => ({
      blocker_id: finding.issue_finding_id,
      severity: finding.severity,
      summary: finding.detail,
      linked_object_ids: finding.pointers.map((pointer) => pointer.object_id),
    }));
}

function missingDimension(
  blockerId: string,
  severity: BlockerRef['severity'],
  summary: string,
): DimensionComputation {
  return {
    score: 0,
    confidence: 0.15,
    blockers: [{ blocker_id: blockerId, severity, summary }],
    evidence_refs: [],
    rationale: summary,
  };
}

function missingTextBlocker(
  blockerId: string,
  value: string | undefined,
  severity: BlockerRef['severity'],
  summary: string,
  objectId: string,
): BlockerRef[] {
  if (value) {
    return [];
  }
  return [{ blocker_id: blockerId, severity, summary, linked_object_ids: [objectId] }];
}

function confidenceFromEvidence(
  score: number,
  supportObjectCount: number,
  traces: SourceTraceRef[],
): number {
  return clamp(
    roundNumber(
      0.2
      + score / 100 * 0.5
      + Math.min(1, (supportObjectCount + traces.length) / 8) * 0.3,
    ),
    0,
    1,
  );
}

function collectTracesFromObjects(
  objects: unknown[],
): SourceTraceRef[] {
  return dedupeSourceTraceRefs(
    objects.flatMap((object) => {
      if (!object || typeof object !== 'object') {
        return [];
      }
      const maybeObject = object as {
        source_trace_refs?: SourceTraceRef[];
        provenance?: SourceTraceRef[];
      };
      return [
        ...(maybeObject.source_trace_refs ?? []),
        ...(maybeObject.provenance ?? []),
      ];
    }),
  );
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return sum(values) / values.length;
}
