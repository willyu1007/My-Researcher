import type {
  GetPaperLiteratureResponse,
  LiteratureImportRequest,
  LiteratureImportResponse,
  LiteratureSearchRequest,
  LiteratureSearchResponse,
  SyncPaperLiteratureFromTopicRequest,
  SyncPaperLiteratureFromTopicResponse,
  TopicLiteratureScopeResponse,
  UpdatePaperLiteratureLinkRequest,
  UpdatePaperLiteratureLinkResponse,
  UpsertTopicLiteratureScopeRequest,
} from '@paper-engineering-assistant/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';
import { LiteratureService } from '../services/literature-service.js';

type TopicParams = {
  topicId: string;
};

type PaperParams = {
  id: string;
};

type PaperLinkParams = {
  id: string;
  linkId: string;
};

export class LiteratureController {
  constructor(private readonly service: LiteratureService) {}

  async search(
    request: FastifyRequest<{ Body: LiteratureSearchRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.search(request.body);
      reply.status(200).send(result satisfies LiteratureSearchResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async import(
    request: FastifyRequest<{ Body: LiteratureImportRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.import(request.body);
      reply.status(200).send(result satisfies LiteratureImportResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async getTopicScope(
    request: FastifyRequest<{ Params: TopicParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.getTopicScope(request.params.topicId);
      reply.status(200).send(result satisfies TopicLiteratureScopeResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async upsertTopicScope(
    request: FastifyRequest<{ Params: TopicParams; Body: UpsertTopicLiteratureScopeRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.upsertTopicScope(request.params.topicId, request.body);
      reply.status(200).send(result satisfies TopicLiteratureScopeResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async syncPaperFromTopic(
    request: FastifyRequest<{ Params: PaperParams; Body: SyncPaperLiteratureFromTopicRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.syncPaperLiteratureFromTopic(request.params.id, request.body);
      reply.status(200).send(result satisfies SyncPaperLiteratureFromTopicResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async getPaperLiterature(
    request: FastifyRequest<{ Params: PaperParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.getPaperLiterature(request.params.id);
      reply.status(200).send(result satisfies GetPaperLiteratureResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async updatePaperLiteratureLink(
    request: FastifyRequest<{ Params: PaperLinkParams; Body: UpdatePaperLiteratureLinkRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.updatePaperLiteratureLink(
        request.params.id,
        request.params.linkId,
        request.body,
      );
      reply.status(200).send(result satisfies UpdatePaperLiteratureLinkResponse);
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
