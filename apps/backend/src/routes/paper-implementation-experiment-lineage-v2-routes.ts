import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import {
  projectValidationCyclesLineageV2ResponseSchema,
  validationCycleExperimentLineageV2ResponseSchema,
  workOrderBranchRevisionHistoryV2ResponseSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-lineage-v2-contracts';
import {
  experimentV2ErrorEnvelopeSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

import type {
  PaperImplementationExperimentLineageV2Controller,
} from '../controllers/paper-implementation-experiment-lineage-v2-controller.js';

const pathIdSchema = {
  type: 'string',
  minLength: 1,
  maxLength: 512,
  pattern: '\\S',
} as const;

const projectParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['implementation_project_id'],
  properties: {
    implementation_project_id: pathIdSchema,
  },
} as const;

const cycleParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['implementation_project_id', 'validation_cycle_id'],
  properties: {
    implementation_project_id: pathIdSchema,
    validation_cycle_id: pathIdSchema,
  },
} as const;

const branchParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['implementation_project_id', 'branch_id'],
  properties: {
    implementation_project_id: pathIdSchema,
    branch_id: pathIdSchema,
  },
} as const;

const standardErrorResponses = {
  400: experimentV2ErrorEnvelopeSchema,
  404: experimentV2ErrorEnvelopeSchema,
  409: experimentV2ErrorEnvelopeSchema,
  422: experimentV2ErrorEnvelopeSchema,
  500: experimentV2ErrorEnvelopeSchema,
} as const;

export async function registerPaperImplementationExperimentLineageV2Routes(
  fastify: FastifyInstance,
  controller: PaperImplementationExperimentLineageV2Controller,
): Promise<void> {
  fastify.get<{
    Params: { implementation_project_id: string };
  }>(
    '/paper-implementation/projects/:implementation_project_id/experiment-lineage/validation-cycles',
    {
      schema: {
        params: projectParamsSchema,
        response: {
          200: projectValidationCyclesLineageV2ResponseSchema,
          ...standardErrorResponses,
        },
      },
      errorHandler: handleRouteError,
    },
    controller.listProjectValidationCycles,
  );

  fastify.get<{
    Params: {
      implementation_project_id: string;
      validation_cycle_id: string;
    };
  }>(
    '/paper-implementation/projects/:implementation_project_id/validation-cycles/:validation_cycle_id/experiment-lineage',
    {
      schema: {
        params: cycleParamsSchema,
        response: {
          200: validationCycleExperimentLineageV2ResponseSchema,
          ...standardErrorResponses,
        },
      },
      errorHandler: handleRouteError,
    },
    controller.getValidationCycleExperimentLineage,
  );

  fastify.get<{
    Params: {
      implementation_project_id: string;
      branch_id: string;
    };
  }>(
    '/paper-implementation/projects/:implementation_project_id/workorder-branches/:branch_id/revision-history',
    {
      schema: {
        params: branchParamsSchema,
        response: {
          200: workOrderBranchRevisionHistoryV2ResponseSchema,
          ...standardErrorResponses,
        },
      },
      errorHandler: handleRouteError,
    },
    controller.getWorkOrderBranchRevisionHistory,
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
    'paper-implementation experiment lineage v2 route failed outside controller boundary',
  );
  await reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected paper-implementation experiment lineage v2 failure.',
    },
  });
}
