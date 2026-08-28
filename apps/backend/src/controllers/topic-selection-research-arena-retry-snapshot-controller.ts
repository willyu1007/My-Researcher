import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  TopicSelectionResearchArenaRetrySnapshotRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import { AppError } from '../errors/app-error.js';
import type {
  TopicSelectionResearchArenaRetrySnapshotService,
} from '../services/topic-selection-research-arena-retry-snapshot-service.js';

export class TopicSelectionResearchArenaRetrySnapshotController {
  constructor(private readonly service: TopicSelectionResearchArenaRetrySnapshotService) {}

  prepare = async (
    request: FastifyRequest<{ Body: TopicSelectionResearchArenaRetrySnapshotRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      const body = request.body;
      return reply.status(201).send(await this.service.prepare({
        arena_session_id: body.arena_session_id,
        title_card_id: body.title_card_id,
        evidence_map_id: body.evidence_map_id,
        candidate_refs: body.candidate_refs,
      }));
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          error: { code: error.errorCode, message: error.message, details: error.details },
        });
      }
      reply.request.log.error(error, 'topic-selection research arena retry-snapshot error');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Unexpected arena retry-snapshot failure.' },
      });
    }
  };
}
