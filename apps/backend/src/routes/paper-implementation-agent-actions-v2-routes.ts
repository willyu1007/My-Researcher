import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import {
  validationCycleAvailableActionsV2ResponseSchema,
  validationCycleClosurePreparationV2ResponseSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-closure-preparation-v2-contracts';
import {
  experimentV2ErrorEnvelopeSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

import type {
  PaperImplementationAgentActionsV2Controller,
} from '../controllers/paper-implementation-agent-actions-v2-controller.js';

const pathIdSchema = {
  type: 'string',
  minLength: 1,
  maxLength: 512,
  pattern: '\\S',
} as const;

const preparationParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['validation_cycle_id'],
  properties: {
    validation_cycle_id: pathIdSchema,
  },
} as const;

const availableActionsParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['implementation_project_id', 'validation_cycle_id'],
  properties: {
    implementation_project_id: pathIdSchema,
    validation_cycle_id: pathIdSchema,
  },
} as const;

const standardErrorResponses = {
  400: experimentV2ErrorEnvelopeSchema,
  404: experimentV2ErrorEnvelopeSchema,
  409: experimentV2ErrorEnvelopeSchema,
  422: experimentV2ErrorEnvelopeSchema,
  500: experimentV2ErrorEnvelopeSchema,
} as const;

export async function registerPaperImplementationAgentActionsV2Routes(
  fastify: FastifyInstance,
  controller: PaperImplementationAgentActionsV2Controller,
): Promise<void> {
  fastify.get<{ Params: { validation_cycle_id: string } }>(
    '/paper-implementation/validation-cycles/:validation_cycle_id/closure/v2/preparation',
    {
      schema: {
        params: preparationParamsSchema,
        response: {
          200: validationCycleClosurePreparationV2ResponseSchema,
          ...standardErrorResponses,
        },
      },
      errorHandler: handleRouteError,
    },
    controller.prepareValidationCycleClosure,
  );

  fastify.get<{
    Params: {
      implementation_project_id: string;
      validation_cycle_id: string;
    };
  }>(
    '/paper-implementation/projects/:implementation_project_id/validation-cycles/:validation_cycle_id/available-actions',
    {
      schema: {
        params: availableActionsParamsSchema,
        response: {
          200: validationCycleAvailableActionsV2ResponseSchema,
          ...standardErrorResponses,
        },
      },
      errorHandler: handleRouteError,
    },
    controller.listValidationCycleAvailableActions,
  );
}

async function handleRouteError(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (error.validation) {
    await reply.status(400).send({
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'Request payload failed schema validation.',
        details: { reason_code: 'V2_TYPED_SNAPSHOT_INVALID' },
      },
    });
    return;
  }
  request.log.error(
    { err: error },
    'paper-implementation agent actions v2 route failed outside controller boundary',
  );
  await reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected paper-implementation agent actions v2 failure.',
    },
  });
}
