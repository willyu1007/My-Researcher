import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  PaperImplementationExplorationAttachmentV2Params,
  PaperImplementationExplorationAttachmentV2Request,
  PaperImplementationExplorationAttachmentV2Response,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-exploration-attachment-v2-contracts';

import { AppError } from '../errors/app-error.js';

export interface PaperImplementationExplorationAttachmentV2UseCase {
  attach(
    params: PaperImplementationExplorationAttachmentV2Params,
    request: PaperImplementationExplorationAttachmentV2Request,
  ): Promise<PaperImplementationExplorationAttachmentV2Response>;
}

export class PaperImplementationExplorationAttachmentV2Controller {
  constructor(private readonly service: PaperImplementationExplorationAttachmentV2UseCase) {}

  attach = async (
    request: FastifyRequest<{
      Params: PaperImplementationExplorationAttachmentV2Params;
      Body: PaperImplementationExplorationAttachmentV2Request;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.attach(request.params, request.body);
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
      request.log.error({ err: error }, 'paper-implementation exploration attachment v2 failed');
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unexpected paper-implementation exploration attachment failure.',
        },
      });
    }
  };
}
