import type {
  PaperImplementationCoordinatorLease,
  PaperImplementationCoordinatorRun,
  PaperImplementationCoordinatorStep,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-coordinator-contracts';

export interface PaperImplementationCoordinatorRepository {
  createCoordinatorRun(
    run: PaperImplementationCoordinatorRun,
  ): Promise<PaperImplementationCoordinatorRun>;

  findCoordinatorRunById(
    implementationProjectId: string,
    coordinatorRunId: string,
  ): Promise<PaperImplementationCoordinatorRun | null>;

  updateCoordinatorRun(
    run: PaperImplementationCoordinatorRun,
  ): Promise<PaperImplementationCoordinatorRun>;

  /**
   * Atomic compare-and-set lease acquisition. Succeeds (returns the updated
   * run with `run_status='advancing'` and the new lease) only when the run
   * currently has no lease, an expired lease (`expires_at <= now`), or a
   * lease held by the same holder. Returns null when another live holder
   * owns the lease — the caller maps that to 409 CONCURRENT_ADVANCE.
   */
  acquireCoordinatorRunLease(
    implementationProjectId: string,
    coordinatorRunId: string,
    lease: PaperImplementationCoordinatorLease,
    now: string,
  ): Promise<PaperImplementationCoordinatorRun | null>;

  createCoordinatorStep(
    step: PaperImplementationCoordinatorStep,
  ): Promise<PaperImplementationCoordinatorStep>;

  listCoordinatorSteps(
    implementationProjectId: string,
    coordinatorRunId: string,
  ): Promise<PaperImplementationCoordinatorStep[]>;
}
