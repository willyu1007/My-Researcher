import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';
import type {
  TopicSelectionEvidenceConvergenceCoordinatorService,
  TopicSelectionExecuteEvidenceConvergenceRetrievalInput,
} from '../services/topic-selection-evidence-convergence-coordinator-service.js';
import type {
  TopicSelectionEvidenceMapService,
  TopicSelectionPublishEvidenceConvergenceSuccessorInput,
} from '../services/topic-selection-evidence-map-service.js';

export class TopicSelectionEvidenceConvergenceController {
  constructor(
    private readonly service: TopicSelectionEvidenceConvergenceCoordinatorService,
    private readonly evidenceMaps?: Pick<TopicSelectionEvidenceMapService, 'publishEvidenceConvergenceSuccessor'>,
  ) {}

  executeRoleRetrievalRequests = async (
    request: FastifyRequest<{ Body: TopicSelectionExecuteEvidenceConvergenceRetrievalInput }>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.send(await this.service.executeRoleRetrievalRequests(request.body));
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          error: { code: error.errorCode, message: error.message, details: error.details },
        });
      }
      reply.request.log.error(error, 'topic-selection evidence-convergence retrieval error');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Unexpected evidence-convergence retrieval failure.' },
      });
    }
  };

  publishEvidenceMapSuccessor = async (
    request: FastifyRequest<{ Body: TopicSelectionPublishEvidenceConvergenceSuccessorInput }>,
    reply: FastifyReply,
  ) => {
    try {
      if (!this.evidenceMaps) {
        throw new AppError(500, 'INTERNAL_ERROR', 'Evidence convergence admission is not configured.');
      }
      return reply.send(await this.evidenceMaps.publishEvidenceConvergenceSuccessor(request.body));
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          error: { code: error.errorCode, message: error.message, details: error.details },
        });
      }
      reply.request.log.error(error, 'topic-selection evidence-convergence admission error');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Unexpected evidence-convergence admission failure.' },
      });
    }
  };
}
