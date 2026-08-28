import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  TopicSelectionResearchArenaRoleEvidencePreparationRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import { AppError } from '../errors/app-error.js';
import type {
  TopicSelectionResearchArenaRetrievalService,
} from '../services/topic-selection-research-arena-retrieval-service.js';

export class TopicSelectionResearchArenaRetrievalController {
  constructor(private readonly service: TopicSelectionResearchArenaRetrievalService) {}

  prepareRoleEvidence = async (
    request: FastifyRequest<{ Body: TopicSelectionResearchArenaRoleEvidencePreparationRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.send(await this.service.prepare(request.body));
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          error: { code: error.errorCode, message: error.message, details: error.details },
        });
      }
      reply.request.log.error(error, 'topic-selection arena role-evidence preparation error');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Unexpected arena role-evidence preparation failure.' },
      });
    }
  };
}
