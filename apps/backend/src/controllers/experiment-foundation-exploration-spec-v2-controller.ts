import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  ExperimentFoundationExplorationSpecV2CreateRevisionRequest,
  ExperimentFoundationExplorationSpecV2CreateRevisionResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-exploration-spec-v2-contracts';

import { AppError } from '../errors/app-error.js';

export interface ExperimentFoundationExplorationSpecV2UseCase {
  createRevision(
    logicalId: string,
    request: ExperimentFoundationExplorationSpecV2CreateRevisionRequest,
  ): Promise<ExperimentFoundationExplorationSpecV2CreateRevisionResponse>;
}

export interface ExperimentFoundationExplorationSpecV2Params {
  logical_id: string;
}

export class ExperimentFoundationExplorationSpecV2Controller {
  constructor(private readonly service: ExperimentFoundationExplorationSpecV2UseCase) {}

  createRevision = async (
    request: FastifyRequest<{
      Params: ExperimentFoundationExplorationSpecV2Params;
      Body: ExperimentFoundationExplorationSpecV2CreateRevisionRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.createRevision(
        request.params.logical_id,
        request.body,
      );
      return reply.status(result.replayed ? 200 : 201).send(result);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          error: {
            code: error.errorCode,
            message: error.message,
            details: error.details,
          },
        });
      }
      request.log.error({ err: error }, 'experiment-foundation exploration spec v2 failed');
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unexpected experiment-foundation exploration spec failure.',
        },
      });
    }
  };
}
