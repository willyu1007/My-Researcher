import type {
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import type {
  ValidationCycleAvailableActionsV2Response,
  ValidationCycleClosurePreparationV2Response,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-closure-preparation-v2-contracts';

import { AppError } from '../errors/app-error.js';
import {
  PaperImplementationCycleReadinessV2ServiceError,
} from '../services/paper-implementation-cycle-readiness-v2-service.js';
import {
  PaperImplementationExperimentLineageV2ServiceError,
} from '../services/paper-implementation-experiment-lineage-v2-service.js';

export interface PaperImplementationAgentActionsV2UseCase {
  prepareValidationCycleClosure(
    validationCycleId: string,
  ): Promise<ValidationCycleClosurePreparationV2Response>;

  listValidationCycleAvailableActions(
    implementationProjectId: string,
    validationCycleId: string,
  ): Promise<ValidationCycleAvailableActionsV2Response>;
}

type PreparationParams = {
  validation_cycle_id: string;
};

type AvailableActionsParams = PreparationParams & {
  implementation_project_id: string;
};

export class PaperImplementationAgentActionsV2Controller {
  constructor(private readonly service: PaperImplementationAgentActionsV2UseCase) {}

  prepareValidationCycleClosure = async (
    request: FastifyRequest<{ Params: PreparationParams }>,
    reply: FastifyReply,
  ) => {
    try {
      const response = await this.service.prepareValidationCycleClosure(
        request.params.validation_cycle_id,
      );
      return reply.status(200).send(response);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listValidationCycleAvailableActions = async (
    request: FastifyRequest<{ Params: AvailableActionsParams }>,
    reply: FastifyReply,
  ) => {
    try {
      const response = await this.service.listValidationCycleAvailableActions(
        request.params.implementation_project_id,
        request.params.validation_cycle_id,
      );
      return reply.status(200).send(response);
    } catch (error) {
      return handleError(reply, error);
    }
  };
}

function handleError(reply: FastifyReply, error: unknown) {
  const mapped = mapServiceError(error);
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
    'paper-implementation agent actions v2 read failed',
  );
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected paper-implementation agent actions v2 failure.',
    },
  });
}

function mapServiceError(error: unknown): unknown {
  if (error instanceof PaperImplementationExperimentLineageV2ServiceError) {
    return new AppError(
      404,
      'NOT_FOUND',
      error.message,
      { reason_code: error.reasonCode },
    );
  }
  if (error instanceof PaperImplementationCycleReadinessV2ServiceError) {
    const notFound = error.reasonCode === 'VALIDATION_CYCLE_NOT_FOUND';
    return new AppError(
      notFound ? 404 : 422,
      notFound ? 'NOT_FOUND' : 'GATE_CONSTRAINT_FAILED',
      error.message,
      { reason_code: 'CYCLE_CLOSURE_SCOPE_DRIFT' },
    );
  }
  return error;
}
