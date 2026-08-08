import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  GenerateExperimentResultV2Request,
  GenerateExperimentResultV2Response,
  ValidateScientificBatchV2Request,
  ValidateScientificBatchV2Response,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts';

import { AppError } from '../errors/app-error.js';

interface ExperimentFoundationScientificValidationV2UseCase {
  generateExperimentResult(
    request: GenerateExperimentResultV2Request,
  ): Promise<GenerateExperimentResultV2Response>;
  validateScientificBatch(
    request: ValidateScientificBatchV2Request,
  ): Promise<ValidateScientificBatchV2Response>;
  getScientificValidation(runId: string): Promise<ValidateScientificBatchV2Response | null>;
}

type RunParams = { run_id: string };

export class ExperimentFoundationScientificValidationV2Controller {
  constructor(private readonly service: ExperimentFoundationScientificValidationV2UseCase) {}

  generateResult = async (
    request: FastifyRequest<{ Body: GenerateExperimentResultV2Request }>,
    reply: FastifyReply,
  ) => this.handle(reply, () => this.service.generateExperimentResult(request.body));

  validateBatch = async (
    request: FastifyRequest<{ Body: ValidateScientificBatchV2Request }>,
    reply: FastifyReply,
  ) => this.handle(reply, () => this.service.validateScientificBatch(request.body));

  getValidation = async (
    request: FastifyRequest<{ Params: RunParams }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.getScientificValidation(request.params.run_id);
      if (!result) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Scientific validation report was not found.',
            details: { reason_code: 'VALIDATION_SUBJECT_INCOMPLETE' },
          },
        });
      }
      return reply.status(200).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  private async handle<T>(reply: FastifyReply, operation: () => Promise<T>) {
    try {
      return reply.status(200).send(await operation());
    } catch (error) {
      return handleError(reply, error);
    }
  }
}

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
  const request = (reply as {
    request?: { log?: { error: (details: unknown, message?: string) => void } };
  }).request;
  request?.log?.error({ err: error }, 'experiment-foundation scientific command failed');
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected experiment-foundation scientific command failure.',
    },
  });
}
