import type {
  PaperImplementationExperimentLineageV2BranchHistoryReadModel,
  PaperImplementationExperimentLineageV2CycleReadModel,
  PaperImplementationExperimentLineageV2ProjectCyclesReadModel,
  PaperImplementationExperimentLineageV2Repository,
} from './paper-implementation-experiment-lineage-v2.repository.js';

export interface InMemoryPaperImplementationExperimentLineageV2RepositoryOptions {
  projects?: readonly string[];
  project_cycles?: readonly PaperImplementationExperimentLineageV2ProjectCyclesReadModel[];
  cycle_lineages?: readonly PaperImplementationExperimentLineageV2CycleReadModel[];
  branch_histories?: readonly PaperImplementationExperimentLineageV2BranchHistoryReadModel[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryPaperImplementationExperimentLineageV2Repository
implements PaperImplementationExperimentLineageV2Repository {
  private readonly projects: ReadonlySet<string>;
  private readonly projectCycles: readonly PaperImplementationExperimentLineageV2ProjectCyclesReadModel[];
  private readonly cycleLineages: readonly PaperImplementationExperimentLineageV2CycleReadModel[];
  private readonly branchHistories:
    readonly PaperImplementationExperimentLineageV2BranchHistoryReadModel[];

  constructor(options: InMemoryPaperImplementationExperimentLineageV2RepositoryOptions = {}) {
    this.projectCycles = clone(options.project_cycles ?? []);
    this.cycleLineages = clone(options.cycle_lineages ?? []);
    this.branchHistories = clone(options.branch_histories ?? []);
    this.projects = new Set([
      ...(options.projects ?? []),
      ...this.projectCycles.map((record) => record.implementation_project_id),
      ...this.cycleLineages.map((record) => record.implementation_project_id),
      ...this.branchHistories.map((record) => record.implementation_project_id),
    ]);
  }

  async listProjectValidationCycles(implementationProjectId: string) {
    if (!this.projects.has(implementationProjectId)) return null;
    const record = this.projectCycles.find((candidate) => (
      candidate.implementation_project_id === implementationProjectId
    ));
    return clone(record ?? {
      implementation_project_id: implementationProjectId,
      cycles: [],
    });
  }

  async findValidationCycleExperimentLineage(
    implementationProjectId: string,
    validationCycleId: string,
  ) {
    return clone(this.cycleLineages.find((record) => (
      record.implementation_project_id === implementationProjectId
      && record.validation_cycle_id === validationCycleId
    )) ?? null);
  }

  async findWorkOrderBranchRevisionHistory(
    implementationProjectId: string,
    branchId: string,
  ) {
    return clone(this.branchHistories.find((record) => (
      record.implementation_project_id === implementationProjectId
      && record.branch_id === branchId
    )) ?? null);
  }
}
