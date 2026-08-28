import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  TopicSelectionResearchArenaShadowRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import { AppError } from '../errors/app-error.js';
import type {
  TopicSelectionResearchArenaShadowRunnerService,
} from '../services/topic-selection-research-arena-shadow-runner-service.js';

export class TopicSelectionResearchArenaShadowController {
  constructor(private readonly service: TopicSelectionResearchArenaShadowRunnerService) {}

  run = async (
    request: FastifyRequest<{ Body: TopicSelectionResearchArenaShadowRunRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.send(await this.service.run(request.body));
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          error: { code: error.errorCode, message: error.message, details: error.details },
        });
      }
      reply.request.log.error(error, 'topic-selection research arena shadow-run error');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Unexpected research arena shadow-run failure.' },
      });
    }
  };
}
