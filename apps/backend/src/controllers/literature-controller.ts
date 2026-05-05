import type {
  CreateLiteratureContentProcessingRunRequest,
  CreateLiteratureContentProcessingRunResponse,
  GetLiteratureContentProcessingResponse,
  GetLiteratureMetadataResponse,
  GetPaperLiteratureResponse,
  LiteratureCollectionImportRequest,
  LiteratureCollectionImportResponse,
  LiteratureOverviewQuery,
  LiteratureOverviewResponse,
  LiteratureRetrieveRequest,
  LiteratureRetrieveResponse,
  ListLiteratureContentProcessingRunsQuery,
  ListLiteratureContentProcessingRunsResponse,
  SyncPaperLiteratureFromTopicRequest,
  SyncPaperLiteratureFromTopicResponse,
  TopicLiteratureScopeResponse,
  UpdateLiteratureMetadataRequest,
  UpdateLiteratureMetadataResponse,
  UpdatePaperLiteratureLinkRequest,
  UpdatePaperLiteratureLinkResponse,
  UpsertTopicLiteratureScopeRequest,
  ZoteroImportRequest,
  ZoteroImportResponse,
  ZoteroPreviewRequest,
  ZoteroPreviewResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
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

type LiteratureParams = {
  literatureId: string;
};

export class LiteratureController {
  constructor(private readonly service: LiteratureService) {}

  async collectionImport(
    request: FastifyRequest<{ Body: LiteratureCollectionImportRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.collectionImport(request.body);
      reply.status(200).send(result satisfies LiteratureCollectionImportResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async zoteroCollectionImport(
    request: FastifyRequest<{ Body: ZoteroImportRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.zoteroCollectionImport(request.body);
      reply.status(200).send(result satisfies ZoteroImportResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async zoteroCollectionPreview(
    request: FastifyRequest<{ Body: ZoteroPreviewRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.zoteroCollectionPreview(request.body);
      reply.status(200).send(result satisfies ZoteroPreviewResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async getOverview(
    request: FastifyRequest<{ Querystring: LiteratureOverviewQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.getOverview(request.query);
      reply.status(200).send(result satisfies LiteratureOverviewResponse);
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

  async updateLiteratureMetadata(
    request: FastifyRequest<{ Params: LiteratureParams; Body: UpdateLiteratureMetadataRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.updateLiteratureMetadata(
        request.params.literatureId,
        request.body,
      );
      reply.status(200).send(result satisfies UpdateLiteratureMetadataResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async getLiteratureMetadata(
    request: FastifyRequest<{ Params: LiteratureParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.getLiteratureMetadata(request.params.literatureId);
      reply.status(200).send(result satisfies GetLiteratureMetadataResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async retrieve(
    request: FastifyRequest<{ Body: LiteratureRetrieveRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.retrieveLiterature(request.body);
      reply.status(200).send(result satisfies LiteratureRetrieveResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async getContentProcessing(
    request: FastifyRequest<{ Params: LiteratureParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.getContentProcessing(request.params.literatureId);
      reply.status(200).send(result satisfies GetLiteratureContentProcessingResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async createContentProcessingRun(
    request: FastifyRequest<{ Params: LiteratureParams; Body: CreateLiteratureContentProcessingRunRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.createContentProcessingRun(request.params.literatureId, request.body);
      reply.status(200).send(result satisfies CreateLiteratureContentProcessingRunResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async listContentProcessingRuns(
    request: FastifyRequest<{ Params: LiteratureParams; Querystring: ListLiteratureContentProcessingRunsQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.listContentProcessingRuns(request.params.literatureId, request.query);
      reply.status(200).send(result satisfies ListLiteratureContentProcessingRunsResponse);
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
