import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  ExperimentFoundationPromotionV2Request,
  ExperimentFoundationPromotionV2Response,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-promotion-v2-contracts';
import type { ExperimentFoundationV2AssetType } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';

import { AppError } from '../errors/app-error.js';
import type { ExperimentFoundationPromotionV2Target } from '../services/experiment-foundation-promotion-v2-service.js';

export interface ExperimentFoundationPromotionV2UseCase {
  decide(
    target: ExperimentFoundationPromotionV2Target,
    request: ExperimentFoundationPromotionV2Request,
  ): Promise<ExperimentFoundationPromotionV2Response>;
}

export interface ExperimentFoundationPromotionV2Params {
  asset_type: ExperimentFoundationV2AssetType;
  logical_id: string;
  candidate_revision: number;
}

export class ExperimentFoundationPromotionV2Controller {
  constructor(private readonly service: ExperimentFoundationPromotionV2UseCase) {}

  decide = async (
    request: FastifyRequest<{
      Params: ExperimentFoundationPromotionV2Params;
      Body: ExperimentFoundationPromotionV2Request;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.decide(request.params, request.body);
      return reply.status(result.replayed ? 200 : 201).send(result);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          error: {
            code: error.errorCode,
            message: error.message,
            details: error.details,
          },
        });
      }
      request.log.error({ err: error }, 'experiment-foundation promotion v2 failed');
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unexpected experiment-foundation promotion failure.',
        },
      });
    }
  };
}
