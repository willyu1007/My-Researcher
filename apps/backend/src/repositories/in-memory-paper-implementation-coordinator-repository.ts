import type {
  PaperImplementationCoordinatorLease,
  PaperImplementationCoordinatorRun,
  PaperImplementationCoordinatorStep,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-coordinator-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  PaperImplementationCoordinatorRepository,
} from './paper-implementation-coordinator.repository.js';

export class InMemoryPaperImplementationCoordinatorRepository
implements PaperImplementationCoordinatorRepository {
  private readonly runs = new Map<string, PaperImplementationCoordinatorRun>();
  private readonly steps = new Map<string, PaperImplementationCoordinatorStep>();
  private readonly stepIdsByRun = new Map<string, string[]>();

  async createCoordinatorRun(
    run: PaperImplementationCoordinatorRun,
  ): Promise<PaperImplementationCoordinatorRun> {
    if (this.runs.has(run.coordinator_run_id)) {
      throw new AppError(409, 'VERSION_CONFLICT', `CoordinatorRun ${run.coordinator_run_id} already exists.`);
    }
    const stored = structuredClone(run);
    this.runs.set(stored.coordinator_run_id, stored);
    return structuredClone(stored);
  }

  async findCoordinatorRunById(
    implementationProjectId: string,
    coordinatorRunId: string,
  ): Promise<PaperImplementationCoordinatorRun | null> {
    const run = this.runs.get(coordinatorRunId);
    if (!run || run.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(run);
  }

  async updateCoordinatorRun(
    run: PaperImplementationCoordinatorRun,
    options?: { expectedLeaseHolderId?: string | null },
  ): Promise<PaperImplementationCoordinatorRun> {
    const existing = this.runs.get(run.coordinator_run_id);
    if (!existing || existing.implementation_project_id !== run.implementation_project_id) {
      throw new AppError(404, 'NOT_FOUND', `CoordinatorRun ${run.coordinator_run_id} not found.`);
    }
    const expectedHolder = options?.expectedLeaseHolderId ?? null;
    if (expectedHolder !== null && existing.lease?.holder_id !== expectedHolder) {
      // F3 lease fence: the lease has been taken over by another holder; the
      // stale holder must not overwrite the new holder's state.
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `CoordinatorRun ${run.coordinator_run_id} lease is no longer held by ${expectedHolder}.`,
      );
    }
    const stored = structuredClone(run);
    this.runs.set(stored.coordinator_run_id, stored);
    return structuredClone(stored);
  }

  // Intentionally free of awaits between the lease check and the write so the
  // compare-and-set is atomic within one Node.js event-loop turn.
  async acquireCoordinatorRunLease(
    implementationProjectId: string,
    coordinatorRunId: string,
    lease: PaperImplementationCoordinatorLease,
    now: string,
  ): Promise<PaperImplementationCoordinatorRun | null> {
    const run = this.runs.get(coordinatorRunId);
    if (!run || run.implementation_project_id !== implementationProjectId) {
      throw new AppError(404, 'NOT_FOUND', `CoordinatorRun ${coordinatorRunId} not found.`);
    }
    // F8 terminal guard at the CAS layer: completed/failed runs can never be
    // re-leased (budget_exhausted stays acquirable for post-raise resumes).
    if (run.run_status === 'completed' || run.run_status === 'failed') {
      return null;
    }
    const current = run.lease;
    const heldByOther = current !== null
      && current.holder_id !== lease.holder_id
      && current.expires_at > now;
    if (heldByOther) {
      return null;
    }
    run.lease = structuredClone(lease);
    run.run_status = 'advancing';
    run.updated_at = now;
    return structuredClone(run);
  }

  async createCoordinatorStep(
    step: PaperImplementationCoordinatorStep,
  ): Promise<PaperImplementationCoordinatorStep> {
    if (this.steps.has(step.coordinator_step_id)) {
      throw new AppError(409, 'VERSION_CONFLICT', `CoordinatorStep ${step.coordinator_step_id} already exists.`);
    }
    const duplicateAttempt = (this.stepIdsByRun.get(step.coordinator_run_id) ?? [])
      .map((id) => this.steps.get(id))
      .some((item) => item?.node_attempt_id === step.node_attempt_id);
    if (duplicateAttempt) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `CoordinatorStep attempt ${step.node_attempt_id} already exists for run ${step.coordinator_run_id}.`,
      );
    }
    const stored = structuredClone(step);
    this.steps.set(stored.coordinator_step_id, stored);
    const ids = this.stepIdsByRun.get(stored.coordinator_run_id) ?? [];
    ids.push(stored.coordinator_step_id);
    this.stepIdsByRun.set(stored.coordinator_run_id, ids);
    return structuredClone(stored);
  }

  async listCoordinatorSteps(
    implementationProjectId: string,
    coordinatorRunId: string,
  ): Promise<PaperImplementationCoordinatorStep[]> {
    return (this.stepIdsByRun.get(coordinatorRunId) ?? [])
      .map((id) => this.steps.get(id))
      .filter((step): step is PaperImplementationCoordinatorStep => Boolean(step))
      .filter((step) => step.implementation_project_id === implementationProjectId)
      .sort((left, right) => left.step_index - right.step_index
        || left.node_attempt_id.localeCompare(right.node_attempt_id))
      .map((step) => structuredClone(step));
  }
}
