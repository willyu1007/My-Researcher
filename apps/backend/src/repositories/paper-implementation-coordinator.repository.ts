import type {
  PaperImplementationCoordinatorLease,
  PaperImplementationCoordinatorRun,
  PaperImplementationCoordinatorStep,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-coordinator-contracts';

/**
 * Upper bound on the project-level coordinator-run list projection. The read
 * model returns the most recent runs (createdAt desc); older runs beyond this
 * cap are omitted from the additive list route.
 */
export const PAPER_IMPLEMENTATION_COORDINATOR_RUN_LIST_LIMIT = 100;

export interface PaperImplementationCoordinatorRepository {
  createCoordinatorRun(
    run: PaperImplementationCoordinatorRun,
  ): Promise<PaperImplementationCoordinatorRun>;

  findCoordinatorRunById(
    implementationProjectId: string,
    coordinatorRunId: string,
  ): Promise<PaperImplementationCoordinatorRun | null>;

  /**
   * Read-only project-level run projection list (no steps), ordered by
   * `created_at` desc (id desc tiebreak) and capped at
   * {@link PAPER_IMPLEMENTATION_COORDINATOR_RUN_LIST_LIMIT}.
   */
  listCoordinatorRunsByProject(
    implementationProjectId: string,
  ): Promise<PaperImplementationCoordinatorRun[]>;

  /**
   * F3: when `options.expectedLeaseHolderId` is provided the update is
   * fenced on the run still being leased by that holder — a mismatch (lease
   * taken over by another advance) throws instead of overwriting the new
   * holder's state. The coordinator service treats that failure as
   * crash-equivalent persistence loss.
   */
  updateCoordinatorRun(
    run: PaperImplementationCoordinatorRun,
    options?: { expectedLeaseHolderId?: string | null },
  ): Promise<PaperImplementationCoordinatorRun>;

  /**
   * Atomic compare-and-set lease acquisition. Succeeds (returns the updated
   * run with `run_status='advancing'` and the new lease) only when the run
   * currently has no lease, an expired lease (`expires_at <= now`), or a
   * lease held by the same holder — and (F8) never when the run is already
   * terminal (`completed`/`failed`); `budget_exhausted` stays acquirable so
   * a budget raise can resume it. Returns null when another live holder
   * owns the lease or the run is terminal — the caller maps that to 409.
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
