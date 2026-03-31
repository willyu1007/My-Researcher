import type {
  AnalysisFinding,
  Artifact,
  BaselineSet,
  Boundary,
  Claim,
  ContributionDelta,
  EvidenceItem,
  EvidenceRequirement,
  IssueFinding,
  Problem,
  Protocol,
  ReproItem,
  Run,
  ValueHypothesis,
} from '@paper-engineering-assistant/shared/research-lifecycle/research-argument-contracts';
import type {
  ResearchArgumentGraphObject,
  ResearchArgumentGraphObjectKind,
} from './graph-kinds.js';

export interface ResearchArgumentBranchGraph {
  problems: Problem[];
  value_hypotheses: ValueHypothesis[];
  contribution_deltas: ContributionDelta[];
  claims: Claim[];
  evidence_requirements: EvidenceRequirement[];
  evidence_items: EvidenceItem[];
  baseline_sets: BaselineSet[];
  protocols: Protocol[];
  repro_items: ReproItem[];
  runs: Run[];
  artifacts: Artifact[];
  boundaries: Boundary[];
  analysis_findings: AnalysisFinding[];
  issue_findings: IssueFinding[];
}

export function buildResearchArgumentBranchGraph(
  objects: ResearchArgumentGraphObject[],
): ResearchArgumentBranchGraph {
  const graph: ResearchArgumentBranchGraph = {
    problems: [],
    value_hypotheses: [],
    contribution_deltas: [],
    claims: [],
    evidence_requirements: [],
    evidence_items: [],
    baseline_sets: [],
    protocols: [],
    repro_items: [],
    runs: [],
    artifacts: [],
    boundaries: [],
    analysis_findings: [],
    issue_findings: [],
  };

  for (const object of objects) {
    const objectKind = detectGraphObjectKind(object);
    switch (objectKind) {
      case 'problem':
        graph.problems.push(object as Problem);
        break;
      case 'value_hypothesis':
        graph.value_hypotheses.push(object as ValueHypothesis);
        break;
      case 'contribution_delta':
        graph.contribution_deltas.push(object as ContributionDelta);
        break;
      case 'claim':
        graph.claims.push(object as Claim);
        break;
      case 'evidence_requirement':
        graph.evidence_requirements.push(object as EvidenceRequirement);
        break;
      case 'evidence_item':
        graph.evidence_items.push(object as EvidenceItem);
        break;
      case 'baseline_set':
        graph.baseline_sets.push(object as BaselineSet);
        break;
      case 'protocol':
        graph.protocols.push(object as Protocol);
        break;
      case 'repro_item':
        graph.repro_items.push(object as ReproItem);
        break;
      case 'run':
        graph.runs.push(object as Run);
        break;
      case 'artifact':
        graph.artifacts.push(object as Artifact);
        break;
      case 'boundary':
        graph.boundaries.push(object as Boundary);
        break;
      case 'analysis_finding':
        graph.analysis_findings.push(object as AnalysisFinding);
        break;
      case 'issue_finding':
        graph.issue_findings.push(object as IssueFinding);
        break;
    }
  }

  return graph;
}

function detectGraphObjectKind(
  object: ResearchArgumentGraphObject,
): ResearchArgumentGraphObjectKind {
  if ('problem_id' in object) {
    return 'problem';
  }
  if ('value_hypothesis_id' in object) {
    return 'value_hypothesis';
  }
  if ('contribution_delta_id' in object) {
    return 'contribution_delta';
  }
  if ('evidence_requirement_id' in object) {
    return 'evidence_requirement';
  }
  if ('claim_id' in object) {
    return 'claim';
  }
  if ('evidence_item_id' in object) {
    return 'evidence_item';
  }
  if ('baseline_set_id' in object) {
    return 'baseline_set';
  }
  if ('protocol_id' in object) {
    return 'protocol';
  }
  if ('repro_item_id' in object) {
    return 'repro_item';
  }
  if ('run_id' in object) {
    return 'run';
  }
  if ('artifact_id' in object) {
    return 'artifact';
  }
  if ('boundary_id' in object) {
    return 'boundary';
  }
  if ('analysis_finding_id' in object) {
    return 'analysis_finding';
  }
  return 'issue_finding';
}
