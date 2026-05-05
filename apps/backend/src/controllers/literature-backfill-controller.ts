import type {
  CreateLiteratureContentProcessingBackfillJobResponse,
  LiteratureContentProcessingBackfillCreateJobRequest,
  LiteratureContentProcessingBackfillDryRunRequest,
  LiteratureContentProcessingBackfillDryRunResponse,
  LiteratureContentProcessingBackfillJobResponse,
  LiteratureContentProcessingCleanupDryRunRequest,
  LiteratureContentProcessingCleanupDryRunResponse,
  ListLiteratureContentProcessingBackfillJobsQuery,
  ListLiteratureContentProcessingBackfillJobsResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';
import { LiteratureBackfillService } from '../services/literature-backfill-service.js';

type JobParams = {
  jobId: string;
};

export class LiteratureBackfillController {
  constructor(private readonly service: LiteratureBackfillService) {}

  async dryRunBackfill(
    request: FastifyRequest<{ Body: LiteratureContentProcessingBackfillDryRunRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.dryRun(request.body ?? {});
      reply.status(200).send(result satisfies LiteratureContentProcessingBackfillDryRunResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async createBackfillJob(
    request: FastifyRequest<{ Body: LiteratureContentProcessingBackfillCreateJobRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.createJob(request.body ?? {});
      reply.status(201).send(result satisfies CreateLiteratureContentProcessingBackfillJobResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async listBackfillJobs(
    request: FastifyRequest<{ Querystring: ListLiteratureContentProcessingBackfillJobsQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.listJobs(request.query);
      reply.status(200).send(result satisfies ListLiteratureContentProcessingBackfillJobsResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async getBackfillJob(
    request: FastifyRequest<{ Params: JobParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.getJob(request.params.jobId);
      reply.status(200).send(result satisfies LiteratureContentProcessingBackfillJobResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async pauseBackfillJob(
    request: FastifyRequest<{ Params: JobParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.pauseJob(request.params.jobId);
      reply.status(200).send(result satisfies LiteratureContentProcessingBackfillJobResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async resumeBackfillJob(
    request: FastifyRequest<{ Params: JobParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.resumeJob(request.params.jobId);
      reply.status(200).send(result satisfies LiteratureContentProcessingBackfillJobResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async cancelBackfillJob(
    request: FastifyRequest<{ Params: JobParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.cancelJob(request.params.jobId);
      reply.status(200).send(result satisfies LiteratureContentProcessingBackfillJobResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async retryBackfillJob(
    request: FastifyRequest<{ Params: JobParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.retryFailed(request.params.jobId);
      reply.status(200).send(result satisfies LiteratureContentProcessingBackfillJobResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async deleteBackfillJob(
    request: FastifyRequest<{ Params: JobParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      await this.service.deleteJob(request.params.jobId);
      reply.status(204).send();
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async cleanupDryRun(
    request: FastifyRequest<{ Body: LiteratureContentProcessingCleanupDryRunRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.cleanupDryRun(request.body ?? {});
      reply.status(200).send(result satisfies LiteratureContentProcessingCleanupDryRunResponse);
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
