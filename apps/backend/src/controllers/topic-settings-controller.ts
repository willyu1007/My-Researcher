import type {
  CreateTopicProfileRequest,
  TopicProfileDTO,
  UpdateTopicProfileRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/auto-pull-contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';
import { AutoPullService } from '../services/auto-pull-service.js';

type TopicParams = {
  topicId: string;
};

export class TopicSettingsController {
  constructor(private readonly service: AutoPullService) {}

  async createTopicProfile(
    request: FastifyRequest<{ Body: CreateTopicProfileRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.createTopicProfile(request.body);
      reply.status(201).send(result satisfies TopicProfileDTO);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async listTopicProfiles(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const result = await this.service.listTopicProfiles();
      reply.status(200).send({ items: result });
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async updateTopicProfile(
    request: FastifyRequest<{ Params: TopicParams; Body: UpdateTopicProfileRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.updateTopicProfile(request.params.topicId, request.body);
      reply.status(200).send(result);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  private handleError(reply: FastifyReply, error: unknown): void {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: {
          code: error.errorCode,
          message: error.message,
          details: error.details,
        },
      });
      return;
    }

    reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
}
