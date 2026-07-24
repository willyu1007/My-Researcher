import type {
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import type {
  ProjectValidationCyclesLineageV2Response,
  ValidationCycleExperimentLineageV2Response,
  WorkOrderBranchRevisionHistoryV2Response,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-lineage-v2-contracts';

import { AppError } from '../errors/app-error.js';
import {
  PaperImplementationExperimentLineageV2ServiceError,
} from '../services/paper-implementation-experiment-lineage-v2-service.js';

export interface PaperImplementationExperimentLineageV2UseCase {
  listProjectValidationCycles(
    implementationProjectId: string,
  ): Promise<ProjectValidationCyclesLineageV2Response>;

  getValidationCycleExperimentLineage(
    implementationProjectId: string,
    validationCycleId: string,
  ): Promise<ValidationCycleExperimentLineageV2Response>;

  getWorkOrderBranchRevisionHistory(
    implementationProjectId: string,
    branchId: string,
  ): Promise<WorkOrderBranchRevisionHistoryV2Response>;
}

type ProjectParams = {
  implementation_project_id: string;
};

type CycleParams = ProjectParams & {
  validation_cycle_id: string;
};

type BranchParams = ProjectParams & {
  branch_id: string;
};

export class PaperImplementationExperimentLineageV2Controller {
  constructor(private readonly service: PaperImplementationExperimentLineageV2UseCase) {}

  listProjectValidationCycles = async (
    request: FastifyRequest<{ Params: ProjectParams }>,
    reply: FastifyReply,
  ) => {
    try {
      const response = await this.service.listProjectValidationCycles(
        request.params.implementation_project_id,
      );
      return reply.status(200).send(response);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getValidationCycleExperimentLineage = async (
    request: FastifyRequest<{ Params: CycleParams }>,
    reply: FastifyReply,
  ) => {
    try {
      const response = await this.service.getValidationCycleExperimentLineage(
        request.params.implementation_project_id,
        request.params.validation_cycle_id,
      );
      return reply.status(200).send(response);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getWorkOrderBranchRevisionHistory = async (
    request: FastifyRequest<{ Params: BranchParams }>,
    reply: FastifyReply,
  ) => {
    try {
      const response = await this.service.getWorkOrderBranchRevisionHistory(
        request.params.implementation_project_id,
        request.params.branch_id,
      );
      return reply.status(200).send(response);
    } catch (error) {
      return handleError(reply, error);
    }
  };
}

function handleError(reply: FastifyReply, error: unknown) {
  const mapped = error instanceof PaperImplementationExperimentLineageV2ServiceError
    ? new AppError(
      404,
      'NOT_FOUND',
      error.message,
      { reason_code: error.reasonCode },
    )
    : error;
  if (mapped instanceof AppError) {
    return reply.status(mapped.statusCode).send({
      error: {
        code: mapped.errorCode,
        message: mapped.message,
        details: mapped.details,
      },
    });
  }
  const request = (reply as {
    request?: { log?: { error: (details: unknown, message?: string) => void } };
  }).request;
  request?.log?.error(
    { err: mapped },
    'paper-implementation experiment lineage v2 read failed',
  );
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected paper-implementation experiment lineage v2 failure.',
    },
  });
}
