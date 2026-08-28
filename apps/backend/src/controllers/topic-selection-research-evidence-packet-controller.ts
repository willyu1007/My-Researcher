import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  TopicSelectionResearchEvidencePacketRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import { AppError } from '../errors/app-error.js';
import type {
  TopicSelectionResearchEvidencePacketService,
} from '../services/topic-selection-research-evidence-packet-service.js';

export class TopicSelectionResearchEvidencePacketController {
  constructor(private readonly service: TopicSelectionResearchEvidencePacketService) {}

  resolve = async (
    request: FastifyRequest<{ Body: TopicSelectionResearchEvidencePacketRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.send(await this.service.resolve(request.body));
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          error: { code: error.errorCode, message: error.message, details: error.details },
        });
      }
      reply.request.log.error(error, 'topic-selection EvidencePacket resolution error');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Unexpected EvidencePacket resolution failure.' },
      });
    }
  };
}
