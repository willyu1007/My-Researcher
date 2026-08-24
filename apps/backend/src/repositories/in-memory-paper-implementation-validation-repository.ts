import type {
  ExperimentPlanLight,
  FeasibilityProbe,
  TechnicalRouteCandidate,
  ValidationCycle,
  ValidationPlanningReviewItem,
  ValidationUpstreamFeedbackCandidate,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  PaperImplementationValidationRepository,
  ValidationCycleDraftPersistence,
  ValidationCycleOwnerScopeQuery,
} from './paper-implementation-validation.repository.js';

export class InMemoryPaperImplementationValidationRepository
implements PaperImplementationValidationRepository {
  private readonly inputSnapshots = new Map<string, ValidationCycleDraftPersistence['input_snapshot']>();
  private readonly validationCycles = new Map<string, ValidationCycle>();
  private readonly validationCycleIdsByProject = new Map<string, string[]>();
  private readonly routeCandidates = new Map<string, TechnicalRouteCandidate>();
  private readonly feasibilityProbes = new Map<string, FeasibilityProbe>();
  private readonly experimentPlans = new Map<string, ExperimentPlanLight>();
  private readonly reviewItems = new Map<string, ValidationPlanningReviewItem>();
  private readonly reviewItemIdsByProject = new Map<string, string[]>();
  private readonly feedbackCandidates = new Map<string, ValidationUpstreamFeedbackCandidate>();

  async createValidationCycleDraft(
    persistence: ValidationCycleDraftPersistence,
  ): Promise<ValidationCycleDraftPersistence> {
    this.assertNewId(this.inputSnapshots, persistence.input_snapshot.input_snapshot_id, 'ValidationCycleInputSnapshot');
    this.assertNewId(this.validationCycles, persistence.validation_cycle.validation_cycle_id, 'ValidationCycle');
    this.inputSnapshots.set(
      persistence.input_snapshot.input_snapshot_id,
      structuredClone(persistence.input_snapshot),
    );
    this.validationCycles.set(
      persistence.validation_cycle.validation_cycle_id,
      structuredClone(persistence.validation_cycle),
    );
    this.pushId(
      this.validationCycleIdsByProject,
      persistence.validation_cycle.implementation_project_id,
      persistence.validation_cycle.validation_cycle_id,
    );
    return structuredClone(persistence);
  }

  async findValidationCycleById(
    implementationProjectId: string,
    validationCycleId: string,
  ): Promise<ValidationCycle | null> {
    const cycle = this.validationCycles.get(validationCycleId);
    if (!cycle || cycle.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(cycle);
  }

  async listValidationCycles(
    implementationProjectId: string,
  ): Promise<ValidationCycle[]> {
    return (this.validationCycleIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.validationCycles.get(id))
      .filter((cycle): cycle is ValidationCycle => Boolean(cycle))
      .map((cycle) => structuredClone(cycle));
  }

  async listValidationCyclesByOwnerScope(
    implementationProjectId: string,
    query: ValidationCycleOwnerScopeQuery,
  ): Promise<ValidationCycle[]> {
    const assertionIds = new Set(query.assertion_ids);
    const lifecycleStatuses = new Set(query.lifecycle_statuses);
    return (this.validationCycleIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.validationCycles.get(id))
      .filter((cycle): cycle is ValidationCycle => Boolean(cycle))
      .filter((cycle) => lifecycleStatuses.has(cycle.lifecycle_status))
      .filter((cycle) => (
        (cycle.target.target_type === 'motive_evidence_board'
          && cycle.target.target_id === query.board_version_id)
        || (cycle.target.target_type === 'core_motive_version'
          && cycle.target.target_id === query.core_motive_version_id)
        || (cycle.target.target_type === 'motive_assertion'
          && cycle.target.target_version_id === query.core_motive_version_id
          && assertionIds.has(cycle.target.target_id))
        || cycle.target.target_version_id === query.core_motive_version_id
      ))
      .sort((left, right) => (
        right.updated_at.localeCompare(left.updated_at)
        || right.created_at.localeCompare(left.created_at)
        || left.validation_cycle_id.localeCompare(right.validation_cycle_id)
      ))
      .slice(0, query.limit)
      .map((cycle) => structuredClone(cycle));
  }

  async updateValidationCycle(
    cycle: ValidationCycle,
  ): Promise<ValidationCycle> {
    const existing = this.validationCycles.get(cycle.validation_cycle_id);
    if (!existing || existing.implementation_project_id !== cycle.implementation_project_id) {
      throw new AppError(404, 'NOT_FOUND', `ValidationCycle ${cycle.validation_cycle_id} not found.`);
    }
    this.validationCycles.set(cycle.validation_cycle_id, structuredClone(cycle));
    return structuredClone(cycle);
  }

  async listRecentCompletedCyclesByTarget(
    implementationProjectId: string,
    targetRefType: string,
    targetRefId: string,
    limit: number,
  ): Promise<ValidationCycle[]> {
    return (this.validationCycleIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.validationCycles.get(id))
      .filter((cycle): cycle is ValidationCycle => Boolean(cycle))
      .filter((cycle) => (
        cycle.target.target_type === targetRefType
        && cycle.target.target_id === targetRefId
        && cycle.lifecycle_status === 'completed'
      ))
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
      .slice(0, limit)
      .map((cycle) => structuredClone(cycle));
  }

  async createTechnicalRouteCandidate(
    route: TechnicalRouteCandidate,
  ): Promise<TechnicalRouteCandidate> {
    this.assertNewId(this.routeCandidates, route.route_candidate_id, 'TechnicalRouteCandidate');
    this.routeCandidates.set(route.route_candidate_id, structuredClone(route));
    return structuredClone(route);
  }

  async findTechnicalRouteCandidateById(
    implementationProjectId: string,
    routeCandidateId: string,
  ): Promise<TechnicalRouteCandidate | null> {
    const route = this.routeCandidates.get(routeCandidateId);
    if (!route || route.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(route);
  }

  async createFeasibilityProbe(
    probe: FeasibilityProbe,
  ): Promise<FeasibilityProbe> {
    this.assertNewId(this.feasibilityProbes, probe.probe_id, 'FeasibilityProbe');
    this.feasibilityProbes.set(probe.probe_id, structuredClone(probe));
    return structuredClone(probe);
  }

  async findFeasibilityProbeById(
    implementationProjectId: string,
    probeId: string,
  ): Promise<FeasibilityProbe | null> {
    const probe = this.feasibilityProbes.get(probeId);
    if (!probe || probe.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(probe);
  }

  async createExperimentPlanLight(
    plan: ExperimentPlanLight,
  ): Promise<ExperimentPlanLight> {
    this.assertNewId(this.experimentPlans, plan.experiment_plan_light_id, 'ExperimentPlanLight');
    this.experimentPlans.set(plan.experiment_plan_light_id, structuredClone(plan));
    return structuredClone(plan);
  }

  async findExperimentPlanLightById(
    implementationProjectId: string,
    experimentPlanLightId: string,
  ): Promise<ExperimentPlanLight | null> {
    const plan = this.experimentPlans.get(experimentPlanLightId);
    if (!plan || plan.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(plan);
  }

  async createReviewItem(
    item: ValidationPlanningReviewItem,
  ): Promise<ValidationPlanningReviewItem> {
    this.assertNewId(this.reviewItems, item.review_item_id, 'ValidationPlanningReviewItem');
    this.reviewItems.set(item.review_item_id, structuredClone(item));
    this.pushId(this.reviewItemIdsByProject, item.implementation_project_id, item.review_item_id);
    return structuredClone(item);
  }

  async listReviewItems(
    implementationProjectId: string,
  ): Promise<ValidationPlanningReviewItem[]> {
    return (this.reviewItemIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.reviewItems.get(id))
      .filter((item): item is ValidationPlanningReviewItem => Boolean(item))
      .map((item) => structuredClone(item));
  }

  async createFeedbackCandidate(
    candidate: ValidationUpstreamFeedbackCandidate,
  ): Promise<ValidationUpstreamFeedbackCandidate> {
    this.assertNewId(this.feedbackCandidates, candidate.candidate_id, 'ValidationUpstreamFeedbackCandidate');
    this.feedbackCandidates.set(candidate.candidate_id, structuredClone(candidate));
    return structuredClone(candidate);
  }

  async findFeedbackCandidateById(
    implementationProjectId: string,
    candidateId: string,
  ): Promise<ValidationUpstreamFeedbackCandidate | null> {
    const candidate = this.feedbackCandidates.get(candidateId);
    if (!candidate || candidate.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(candidate);
  }

  async updateFeedbackCandidate(
    candidate: ValidationUpstreamFeedbackCandidate,
  ): Promise<ValidationUpstreamFeedbackCandidate> {
    const existing = this.feedbackCandidates.get(candidate.candidate_id);
    if (!existing || existing.implementation_project_id !== candidate.implementation_project_id) {
      throw new AppError(404, 'NOT_FOUND', `ValidationUpstreamFeedbackCandidate ${candidate.candidate_id} not found.`);
    }
    this.feedbackCandidates.set(candidate.candidate_id, structuredClone(candidate));
    return structuredClone(candidate);
  }

  private assertNewId<T>(map: Map<string, T>, id: string, label: string): void {
    if (map.has(id)) {
      throw new AppError(409, 'VERSION_CONFLICT', `${label} ${id} already exists.`);
    }
  }

  private pushId(map: Map<string, string[]>, key: string, id: string): void {
    const ids = map.get(key) ?? [];
    ids.push(id);
    map.set(key, ids);
  }
}
