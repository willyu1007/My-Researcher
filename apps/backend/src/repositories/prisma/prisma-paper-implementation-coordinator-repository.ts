import type {
  PaperImplementationCoordinatorRun as CoordinatorRunRow,
  PaperImplementationCoordinatorStep as CoordinatorStepRow,
  PrismaClient,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  PaperImplementationCoordinatorLease,
  PaperImplementationCoordinatorRun,
  PaperImplementationCoordinatorStep,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-coordinator-contracts';

import { AppError } from '../../errors/app-error.js';
import type {
  PaperImplementationCoordinatorRepository,
} from '../paper-implementation-coordinator.repository.js';

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toDate(value: string): Date {
  return new Date(value);
}

function toCoordinatorRun(row: CoordinatorRunRow): PaperImplementationCoordinatorRun {
  const payload = structuredClone(asRecord(row.runPayload)) as unknown as PaperImplementationCoordinatorRun;
  // Mutable projections live on columns (lease CAS writes them first); the
  // columns win over the JSON payload for those fields.
  payload.run_status = row.runStatus as PaperImplementationCoordinatorRun['run_status'];
  payload.consumed = {
    steps: row.consumedSteps,
    provider_calls: row.consumedProviderCalls,
  };
  payload.lease = row.leaseHolderId && row.leaseHeartbeatAt && row.leaseExpiresAt
    ? {
      holder_id: row.leaseHolderId,
      heartbeat_at: row.leaseHeartbeatAt.toISOString(),
      expires_at: row.leaseExpiresAt.toISOString(),
    }
    : null;
  payload.updated_at = row.updatedAt.toISOString();
  return payload;
}

function toCoordinatorStep(row: CoordinatorStepRow): PaperImplementationCoordinatorStep {
  return structuredClone(asRecord(row.stepPayload)) as unknown as PaperImplementationCoordinatorStep;
}

function mapDuplicate(error: unknown, label: string, id: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new AppError(409, 'VERSION_CONFLICT', `${label} ${id} already exists.`);
  }
  throw error;
}

export class PrismaPaperImplementationCoordinatorRepository
implements PaperImplementationCoordinatorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createCoordinatorRun(
    run: PaperImplementationCoordinatorRun,
  ): Promise<PaperImplementationCoordinatorRun> {
    try {
      const row = await this.prisma.paperImplementationCoordinatorRun.create({
        data: this.toRunCreateInput(run),
      });
      return toCoordinatorRun(row);
    } catch (error) {
      mapDuplicate(error, 'CoordinatorRun', run.coordinator_run_id);
    }
  }

  async findCoordinatorRunById(
    implementationProjectId: string,
    coordinatorRunId: string,
  ): Promise<PaperImplementationCoordinatorRun | null> {
    const row = await this.prisma.paperImplementationCoordinatorRun.findFirst({
      where: {
        id: coordinatorRunId,
        implementationProjectId,
      },
    });
    return row ? toCoordinatorRun(row) : null;
  }

  async updateCoordinatorRun(
    run: PaperImplementationCoordinatorRun,
  ): Promise<PaperImplementationCoordinatorRun> {
    const updated = await this.prisma.paperImplementationCoordinatorRun.updateMany({
      where: {
        id: run.coordinator_run_id,
        implementationProjectId: run.implementation_project_id,
      },
      data: this.toRunMutableData(run),
    });
    if (updated.count === 0) {
      throw new AppError(404, 'NOT_FOUND', `CoordinatorRun ${run.coordinator_run_id} not found.`);
    }
    return structuredClone(run);
  }

  async acquireCoordinatorRunLease(
    implementationProjectId: string,
    coordinatorRunId: string,
    lease: PaperImplementationCoordinatorLease,
    now: string,
  ): Promise<PaperImplementationCoordinatorRun | null> {
    const existing = await this.prisma.paperImplementationCoordinatorRun.findFirst({
      where: { id: coordinatorRunId, implementationProjectId },
    });
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', `CoordinatorRun ${coordinatorRunId} not found.`);
    }
    // Atomic compare-and-set: only a free, expired, or same-holder lease can
    // be replaced; a losing concurrent advance matches zero rows.
    const acquired = await this.prisma.paperImplementationCoordinatorRun.updateMany({
      where: {
        id: coordinatorRunId,
        implementationProjectId,
        OR: [
          { leaseHolderId: null },
          { leaseHolderId: lease.holder_id },
          { leaseExpiresAt: { lte: toDate(now) } },
        ],
      },
      data: {
        runStatus: 'advancing',
        leaseHolderId: lease.holder_id,
        leaseHeartbeatAt: toDate(lease.heartbeat_at),
        leaseExpiresAt: toDate(lease.expires_at),
        updatedAt: toDate(now),
      },
    });
    if (acquired.count === 0) {
      return null;
    }
    const row = await this.prisma.paperImplementationCoordinatorRun.findFirst({
      where: { id: coordinatorRunId, implementationProjectId },
    });
    if (!row) {
      throw new AppError(404, 'NOT_FOUND', `CoordinatorRun ${coordinatorRunId} not found.`);
    }
    const run = toCoordinatorRun(row);
    // Keep the JSON payload aligned now that we exclusively hold the lease.
    await this.prisma.paperImplementationCoordinatorRun.update({
      where: { id: coordinatorRunId },
      data: { runPayload: toJsonValue(run) },
    });
    return run;
  }

  async createCoordinatorStep(
    step: PaperImplementationCoordinatorStep,
  ): Promise<PaperImplementationCoordinatorStep> {
    try {
      const row = await this.prisma.paperImplementationCoordinatorStep.create({
        data: {
          id: step.coordinator_step_id,
          coordinatorRunId: step.coordinator_run_id,
          implementationProjectId: step.implementation_project_id,
          stepIndex: step.step_index,
          slotId: step.slot_id,
          nodeAttemptId: step.node_attempt_id,
          outcome: step.outcome,
          providerCallCount: step.provider_call_count,
          createdAt: toDate(step.created_at),
          stepPayload: toJsonValue(step),
        },
      });
      return toCoordinatorStep(row);
    } catch (error) {
      mapDuplicate(error, 'CoordinatorStep', step.coordinator_step_id);
    }
  }

  async listCoordinatorSteps(
    implementationProjectId: string,
    coordinatorRunId: string,
  ): Promise<PaperImplementationCoordinatorStep[]> {
    const rows = await this.prisma.paperImplementationCoordinatorStep.findMany({
      where: {
        coordinatorRunId,
        implementationProjectId,
      },
      orderBy: [{ stepIndex: 'asc' }, { nodeAttemptId: 'asc' }],
    });
    return rows.map(toCoordinatorStep);
  }

  private toRunCreateInput(
    run: PaperImplementationCoordinatorRun,
  ): Prisma.PaperImplementationCoordinatorRunCreateInput {
    return {
      id: run.coordinator_run_id,
      implementationProjectId: run.implementation_project_id,
      laneId: run.lane_id,
      createdAt: toDate(run.created_at),
      ...this.toRunMutableData(run),
    };
  }

  private toRunMutableData(run: PaperImplementationCoordinatorRun) {
    return {
      runStatus: run.run_status,
      runMode: run.run_mode,
      executionMode: run.execution_mode,
      modelProfileId: run.model_profile_id,
      modelOptionId: run.model_option_id,
      budgetMaxSteps: run.budget_envelope.max_steps,
      budgetMaxProviderCalls: run.budget_envelope.max_provider_calls,
      consumedSteps: run.consumed.steps,
      consumedProviderCalls: run.consumed.provider_calls,
      leaseHolderId: run.lease?.holder_id ?? null,
      leaseHeartbeatAt: run.lease ? toDate(run.lease.heartbeat_at) : null,
      leaseExpiresAt: run.lease ? toDate(run.lease.expires_at) : null,
      updatedAt: toDate(run.updated_at),
      runPayload: toJsonValue(run),
    };
  }
}
