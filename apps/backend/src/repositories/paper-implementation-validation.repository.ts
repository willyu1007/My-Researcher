import type {
  ExperimentPlanLight,
  FeasibilityProbe,
  TechnicalRouteCandidate,
  ValidationCycle,
  ValidationCycleInputSnapshot,
  ValidationPlanningReviewItem,
  ValidationUpstreamFeedbackCandidate,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';

export type ValidationCycleDraftPersistence = {
  input_snapshot: ValidationCycleInputSnapshot;
  validation_cycle: ValidationCycle;
};

export interface ValidationCycleOwnerScopeQuery {
  board_version_id: string;
  core_motive_version_id: string;
  assertion_ids: string[];
  lifecycle_statuses: ValidationCycle['lifecycle_status'][];
  limit: number;
}

export interface PaperImplementationValidationRepository {
  createValidationCycleDraft(
    persistence: ValidationCycleDraftPersistence,
  ): Promise<ValidationCycleDraftPersistence>;

  findValidationCycleById(
    implementationProjectId: string,
    validationCycleId: string,
  ): Promise<ValidationCycle | null>;

  listValidationCycles(
    implementationProjectId: string,
  ): Promise<ValidationCycle[]>;

  listValidationCyclesByOwnerScope(
    implementationProjectId: string,
    query: ValidationCycleOwnerScopeQuery,
  ): Promise<ValidationCycle[]>;

  updateValidationCycle(
    cycle: ValidationCycle,
  ): Promise<ValidationCycle>;

  listRecentCompletedCyclesByTarget(
    implementationProjectId: string,
    targetRefType: string,
    targetRefId: string,
    limit: number,
  ): Promise<ValidationCycle[]>;

  createTechnicalRouteCandidate(
    route: TechnicalRouteCandidate,
  ): Promise<TechnicalRouteCandidate>;

  findTechnicalRouteCandidateById(
    implementationProjectId: string,
    routeCandidateId: string,
  ): Promise<TechnicalRouteCandidate | null>;

  createFeasibilityProbe(
    probe: FeasibilityProbe,
  ): Promise<FeasibilityProbe>;

  findFeasibilityProbeById(
    implementationProjectId: string,
    probeId: string,
  ): Promise<FeasibilityProbe | null>;

  createExperimentPlanLight(
    plan: ExperimentPlanLight,
  ): Promise<ExperimentPlanLight>;

  findExperimentPlanLightById(
    implementationProjectId: string,
    experimentPlanLightId: string,
  ): Promise<ExperimentPlanLight | null>;

  createReviewItem(
    item: ValidationPlanningReviewItem,
  ): Promise<ValidationPlanningReviewItem>;

  listReviewItems(
    implementationProjectId: string,
  ): Promise<ValidationPlanningReviewItem[]>;

  createFeedbackCandidate(
    candidate: ValidationUpstreamFeedbackCandidate,
  ): Promise<ValidationUpstreamFeedbackCandidate>;

  findFeedbackCandidateById(
    implementationProjectId: string,
    candidateId: string,
  ): Promise<ValidationUpstreamFeedbackCandidate | null>;

  updateFeedbackCandidate(
    candidate: ValidationUpstreamFeedbackCandidate,
  ): Promise<ValidationUpstreamFeedbackCandidate>;
}
