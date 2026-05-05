import type {
  LiteratureFulltextParserHealthDTO,
  LiteratureContentProcessingSettingsDTO,
  UpdateLiteratureContentProcessingSettingsRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';
import { LiteratureContentProcessingSettingsService } from '../services/literature-content-processing-settings-service.js';

export class LiteratureContentProcessingSettingsController {
  constructor(private readonly service: LiteratureContentProcessingSettingsService) {}

  async getSettings(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const result = await this.service.getSettings();
      reply.status(200).send(result satisfies LiteratureContentProcessingSettingsDTO);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async getFulltextParserHealth(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const result = await this.service.checkFulltextParserHealth();
      reply.status(200).send(result satisfies LiteratureFulltextParserHealthDTO);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async updateSettings(
    request: FastifyRequest<{ Body: UpdateLiteratureContentProcessingSettingsRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.updateSettings(request.body);
      reply.status(200).send(result satisfies LiteratureContentProcessingSettingsDTO);
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
