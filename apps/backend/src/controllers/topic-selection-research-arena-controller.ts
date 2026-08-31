import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  TopicSelectionResearchArenaOpenSessionRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import { AppError } from '../errors/app-error.js';
import type { TopicSelectionResearchArenaService } from '../services/topic-selection-research-arena-service.js';
import type {
  TopicSelectionResearchGapProjectionService,
} from '../services/topic-selection-research-gap-projection-service.js';

export class TopicSelectionResearchArenaController {
  constructor(
    private readonly service: TopicSelectionResearchArenaService,
    private readonly gapProjectionService: Pick<
      TopicSelectionResearchGapProjectionService,
      'recoverSynthesizedSession'
    >,
  ) {}

  openSession = async (
    request: FastifyRequest<{ Body: TopicSelectionResearchArenaOpenSessionRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      const body = request.body;
      const session = await this.service.openSession({
        session_key: body.session_key,
        workspace_id: body.workspace_id,
        title_card_id: body.title_card_id,
        arena_kind: body.arena_kind,
        target_ref: body.target_ref,
        input_snapshot_id: body.input_snapshot_id,
        participant_roles: body.participant_roles,
        execution_plan_ref: body.execution_plan_ref,
        loop_delta_refs: body.loop_delta_refs,
        created_by: 'system',
      });
      return reply.status(201).send(session);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          error: { code: error.errorCode, message: error.message, details: error.details },
        });
      }
      reply.request.log.error(error, 'topic-selection research arena session-open error');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Unexpected research arena session-open failure.' },
      });
    }
  };

  getSession = async (
    request: FastifyRequest<{ Params: { arenaSessionId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.send(await this.service.getSession(request.params.arenaSessionId));
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          error: { code: error.errorCode, message: error.message, details: error.details },
        });
      }
      reply.request.log.error(error, 'topic-selection research arena session-read error');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Unexpected research arena session-read failure.' },
      });
    }
  };

  recoverGapProjection = async (
    request: FastifyRequest<{ Params: { arenaSessionId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.send(
        await this.gapProjectionService.recoverSynthesizedSession(request.params.arenaSessionId),
      );
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          error: { code: error.errorCode, message: error.message, details: error.details },
        });
      }
      reply.request.log.error(error, 'topic-selection research arena gap-projection recovery error');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Unexpected gap-projection recovery failure.' },
      });
    }
  };
}
