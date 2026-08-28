import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  TopicSelectionResearchCheckpointDecisionInput,
  TopicSelectionResearchContinuationEnvelopeEvaluationInput,
  TopicSelectionResearchObjectionInput,
  TopicSelectionResearchObjectionResolutionInput,
  TopicSelectionResearchStageViewAudience,
  TopicSelectionResearchStageViewStage,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-checkpoint-contracts';
import { AppError } from '../errors/app-error.js';
import { TopicSelectionResearchCheckpointService } from '../services/topic-selection-research-checkpoint-service.js';

type ParamsRequest<T> = FastifyRequest<{ Params: T }>;
type BodyParamsRequest<TParams, TBody> = FastifyRequest<{ Params: TParams; Body: TBody }>;
type ParamsQueryRequest<TParams, TQuery> = FastifyRequest<{ Params: TParams; Querystring: TQuery }>;

function handleError(reply: FastifyReply, error: unknown) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: {
        code: error.errorCode,
        message: error.message,
        details: error.details,
      },
    });
  }
  reply.request.log.error(error, 'topic-selection research checkpoint error');
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected topic-selection research checkpoint failure.',
    },
  });
}

export class TopicSelectionResearchCheckpointController {
  constructor(private readonly service: TopicSelectionResearchCheckpointService) {}

  listCheckpoints = async (
    request: ParamsRequest<{ titleCardId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.send(await this.service.listCheckpoints(request.params.titleCardId));
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getCheckpoint = async (
    request: ParamsRequest<{ checkpointId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.send(await this.service.getCheckpoint(request.params.checkpointId));
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getPacket = async (
    request: ParamsRequest<{ checkpointId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.send(await this.service.getPacket(request.params.checkpointId));
    } catch (error) {
      return handleError(reply, error);
    }
  };

  recordDecision = async (
    request: BodyParamsRequest<{ checkpointId: string }, TopicSelectionResearchCheckpointDecisionInput>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.status(201).send(
        await this.service.recordDecision(request.params.checkpointId, request.body),
      );
    } catch (error) {
      return handleError(reply, error);
    }
  };

  recordObjection = async (
    request: BodyParamsRequest<{ checkpointId: string }, TopicSelectionResearchObjectionInput>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.status(201).send(
        await this.service.recordObjection(request.params.checkpointId, request.body),
      );
    } catch (error) {
      return handleError(reply, error);
    }
  };

  resolveObjection = async (
    request: BodyParamsRequest<{ objectionId: string }, TopicSelectionResearchObjectionResolutionInput>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.status(201).send(
        await this.service.resolveObjection(request.params.objectionId, request.body),
      );
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getResearchStatus = async (
    request: ParamsRequest<{ titleCardId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.send(await this.service.getResearchStatus(request.params.titleCardId));
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getStageManifest = async (
    request: ParamsRequest<{ titleCardId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.send(await this.service.getStageManifest(request.params.titleCardId));
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getContinuationEnvelope = async (
    request: ParamsRequest<{ titleCardId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.send(await this.service.getContinuationEnvelope(request.params.titleCardId));
    } catch (error) {
      return handleError(reply, error);
    }
  };

  evaluateContinuationEnvelope = async (
    request: BodyParamsRequest<
      { titleCardId: string },
      TopicSelectionResearchContinuationEnvelopeEvaluationInput
    >,
    reply: FastifyReply,
  ) => {
    try {
      return reply.send(await this.service.evaluateContinuationEnvelope(
        request.params.titleCardId,
        request.body,
      ));
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getStageView = async (
    request: ParamsQueryRequest<
      { titleCardId: string; stage: TopicSelectionResearchStageViewStage },
      { audience: TopicSelectionResearchStageViewAudience }
    >,
    reply: FastifyReply,
  ) => {
    try {
      return reply.send(await this.service.getStageView(
        request.params.titleCardId,
        request.params.stage,
        request.query.audience,
      ));
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getArtifact = async (
    request: ParamsRequest<{ artifactRefId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.send(await this.service.getArtifact(request.params.artifactRefId));
    } catch (error) {
      return handleError(reply, error);
    }
  };
}
