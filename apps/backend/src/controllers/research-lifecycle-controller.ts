import type {
  CreatePaperProjectRequest,
  ReleaseReviewPayload,
  StageGateVerifyRequest,
  VersionSpineCommitRequest,
  WritingPackageBuildRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-project-contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';
import { ResearchLifecycleService } from '../services/research-lifecycle-service.js';

type IdParams = {
  id: string;
};

type GateParams = {
  id: string;
  gate: string;
};

export class ResearchLifecycleController {
  constructor(private readonly service: ResearchLifecycleService) {}

  async createPaperProject(
    request: FastifyRequest<{ Body: CreatePaperProjectRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.createPaperProject(request.body);
      reply.status(201).send(result);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async commitVersionSpine(
    request: FastifyRequest<{ Params: IdParams; Body: VersionSpineCommitRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      if (request.params.id !== request.body.lineage_meta.paper_id) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          'Path paper id does not match lineage_meta.paper_id.',
        );
      }

      const result = await this.service.commitVersionSpine(request.body);
      reply.status(200).send(result);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async verifyStageGate(
    request: FastifyRequest<{ Params: GateParams; Body: StageGateVerifyRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.verifyStageGate(request.params.id, request.body);
      reply.status(200).send(result);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async buildWritingPackage(
    request: FastifyRequest<{ Params: IdParams; Body: WritingPackageBuildRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.buildWritingPackage(request.params.id, request.body);
      reply.status(200).send(result);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async getTimeline(
    request: FastifyRequest<{ Params: IdParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.getTimeline(request.params.id);
      reply.status(200).send(result);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async getResourceMetrics(
    request: FastifyRequest<{ Params: IdParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.getResourceMetrics(request.params.id);
      reply.status(200).send(result);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async getArtifactBundle(
    request: FastifyRequest<{ Params: IdParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.getArtifactBundle(request.params.id);
      reply.status(200).send(result);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async reviewReleaseGate(
    request: FastifyRequest<{ Params: IdParams; Body: ReleaseReviewPayload }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.reviewReleaseGate(request.params.id, request.body);
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
