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

export const RESEARCH_ARGUMENT_GRAPH_OBJECT_KINDS = [
  'problem',
  'value_hypothesis',
  'contribution_delta',
  'claim',
  'evidence_requirement',
  'evidence_item',
  'baseline_set',
  'protocol',
  'repro_item',
  'run',
  'artifact',
  'boundary',
  'analysis_finding',
  'issue_finding',
] as const;
export type ResearchArgumentGraphObjectKind =
  (typeof RESEARCH_ARGUMENT_GRAPH_OBJECT_KINDS)[number];

export interface ResearchArgumentGraphObjectKindMap {
  problem: Problem;
  value_hypothesis: ValueHypothesis;
  contribution_delta: ContributionDelta;
  claim: Claim;
  evidence_requirement: EvidenceRequirement;
  evidence_item: EvidenceItem;
  baseline_set: BaselineSet;
  protocol: Protocol;
  repro_item: ReproItem;
  run: Run;
  artifact: Artifact;
  boundary: Boundary;
  analysis_finding: AnalysisFinding;
  issue_finding: IssueFinding;
}

export type ResearchArgumentGraphObject =
  ResearchArgumentGraphObjectKindMap[ResearchArgumentGraphObjectKind];

export function getResearchArgumentGraphObjectId(
  objectKind: ResearchArgumentGraphObjectKind,
  object: ResearchArgumentGraphObject,
): string {
  switch (objectKind) {
    case 'problem':
      return (object as Problem).problem_id;
    case 'value_hypothesis':
      return (object as ValueHypothesis).value_hypothesis_id;
    case 'contribution_delta':
      return (object as ContributionDelta).contribution_delta_id;
    case 'claim':
      return (object as Claim).claim_id;
    case 'evidence_requirement':
      return (object as EvidenceRequirement).evidence_requirement_id;
    case 'evidence_item':
      return (object as EvidenceItem).evidence_item_id;
    case 'baseline_set':
      return (object as BaselineSet).baseline_set_id;
    case 'protocol':
      return (object as Protocol).protocol_id;
    case 'repro_item':
      return (object as ReproItem).repro_item_id;
    case 'run':
      return (object as Run).run_id;
    case 'artifact':
      return (object as Artifact).artifact_id;
    case 'boundary':
      return (object as Boundary).boundary_id;
    case 'analysis_finding':
      return (object as AnalysisFinding).analysis_finding_id;
    case 'issue_finding':
      return (object as IssueFinding).issue_finding_id;
  }
}

export function getResearchArgumentGraphObjectCreatedAt(
  objectKind: ResearchArgumentGraphObjectKind,
  object: ResearchArgumentGraphObject,
): string {
  switch (objectKind) {
    case 'problem':
      return (object as Problem).created_at;
    case 'value_hypothesis':
      return (object as ValueHypothesis).created_at;
    case 'contribution_delta':
      return (object as ContributionDelta).created_at;
    case 'claim':
      return (object as Claim).created_at;
    case 'evidence_requirement':
      return (object as EvidenceRequirement).created_at;
    case 'evidence_item':
      return (object as EvidenceItem).created_at;
    case 'baseline_set':
      return (object as BaselineSet).created_at;
    case 'protocol':
      return (object as Protocol).created_at;
    case 'repro_item':
      return (object as ReproItem).created_at;
    case 'run':
      return (object as Run).created_at;
    case 'artifact':
      return (object as Artifact).created_at;
    case 'boundary':
      return (object as Boundary).created_at;
    case 'analysis_finding':
      return (object as AnalysisFinding).created_at;
    case 'issue_finding':
      return (object as IssueFinding).created_at;
  }
}

export function getResearchArgumentGraphObjectUpdatedAt(
  objectKind: ResearchArgumentGraphObjectKind,
  object: ResearchArgumentGraphObject,
): string {
  switch (objectKind) {
    case 'problem':
      return (object as Problem).updated_at;
    case 'value_hypothesis':
      return (object as ValueHypothesis).updated_at;
    case 'contribution_delta':
      return (object as ContributionDelta).updated_at;
    case 'claim':
      return (object as Claim).updated_at;
    case 'evidence_requirement':
      return (object as EvidenceRequirement).updated_at;
    case 'evidence_item':
      return (object as EvidenceItem).updated_at;
    case 'baseline_set':
      return (object as BaselineSet).updated_at;
    case 'protocol':
      return (object as Protocol).updated_at;
    case 'repro_item':
      return (object as ReproItem).updated_at;
    case 'run':
      return (object as Run).updated_at;
    case 'artifact':
      return (object as Artifact).updated_at;
    case 'boundary':
      return (object as Boundary).updated_at;
    case 'analysis_finding':
      return (object as AnalysisFinding).updated_at;
    case 'issue_finding':
      return (object as IssueFinding).updated_at;
  }
}
