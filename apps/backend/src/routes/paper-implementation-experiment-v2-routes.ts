import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import {
  experimentV2ErrorEnvelopeSchema,
  paperImplementationExperimentV2AdmissionResponseSchema,
  paperImplementationExperimentV2AdmissionRequestSchema,
  type PaperImplementationExperimentV2AdmissionRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';
import {
  closeValidationCycleV2RequestSchema,
  closeValidationCycleV2ResponseSchema,
  validationCycleReadinessEvaluationV2Schema,
  type CloseValidationCycleV2Request,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-evidence-v2-contracts';

import type {
  PaperImplementationExperimentV2Controller,
} from '../controllers/paper-implementation-experiment-v2-controller.js';
import { AppError } from '../errors/app-error.js';
import { findForbiddenNestedField } from './experiment-v2-route-validation.js';

// Exact readiness and asset-reference hashes are assertions that EF revalidates.
// These names are different: they are canonical values that only this spine may
// derive and persist, so Fastify must reject them before its AJV configuration
// can silently remove unknown properties.
const callerAuthoredAuthorityFields = new Set([
  'approved_plan_hash',
  'attestation_hash',
  'branch_frame_hash',
  'canonical_hash',
  'cell_hash',
  'cell_plan_hash',
  'dependency_manifest_hash',
  'draft_hash',
  'hash_profile',
  'lock_hash',
  'payload_hash',
  'recipe_hash',
  'run_manifest_hash',
  'run_recipe_hash',
  'task_spec_hash',
  'training_task_spec_hash',
  'version_lock_hash',
  'work_order_revision_hash',
]);

const callerAuthoredClosureAuthorityFields = new Set([
  'closure_snapshot_hash',
  'closure_watermark',
  'cycle_assessment',
  'decision_exit',
  'outputs',
  'scientific_disposition',
  'selected_exit_key',
]);

const admissionParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['implementation_project_id', 'validation_cycle_id'],
  properties: {
    implementation_project_id: { type: 'string', minLength: 1 },
    validation_cycle_id: { type: 'string', minLength: 1 },
  },
} as const;

const closureParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['validation_cycle_id'],
  properties: {
    validation_cycle_id: { type: 'string', minLength: 1 },
  },
} as const;

const standardErrorResponses = {
  400: experimentV2ErrorEnvelopeSchema,
  404: experimentV2ErrorEnvelopeSchema,
  409: experimentV2ErrorEnvelopeSchema,
  422: experimentV2ErrorEnvelopeSchema,
  500: experimentV2ErrorEnvelopeSchema,
} as const;

async function handleRouteError(
  error: FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (error instanceof AppError) {
    await reply.status(error.statusCode).send({
      error: {
        code: error.errorCode,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }
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
    'paper-implementation experiment v2 route failed outside controller boundary',
  );
  await reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected paper-implementation experiment v2 failure.',
    },
  });
}

export async function registerPaperImplementationExperimentV2Routes(
  fastify: FastifyInstance,
  controller: PaperImplementationExperimentV2Controller,
): Promise<void> {
  fastify.post<{
    Params: {
      implementation_project_id: string;
      validation_cycle_id: string;
    };
    Body: PaperImplementationExperimentV2AdmissionRequest;
  }>(
    '/paper-implementation/projects/:implementation_project_id/validation-cycles/:validation_cycle_id/experiment-work-orders/v2/admissions',
    {
      schema: {
        params: admissionParamsSchema,
        body: paperImplementationExperimentV2AdmissionRequestSchema,
        response: {
          201: paperImplementationExperimentV2AdmissionResponseSchema,
          ...standardErrorResponses,
        },
      },
      preValidation: async (request, reply) => {
        const callerAuthoredField = findForbiddenNestedField(
          request.body,
          callerAuthoredAuthorityFields,
        );
        if (!callerAuthoredField) {
          return;
        }
        return reply.status(400).send({
          error: {
            code: 'INVALID_PAYLOAD',
            message: `Caller-authored authority field is not allowed: ${callerAuthoredField}`,
            details: {
              reason_code: 'V2_TYPED_SNAPSHOT_INVALID',
            },
          },
        });
      },
      errorHandler: handleRouteError,
    },
    controller.admitWorkOrderRevision,
  );

  fastify.post<{
    Params: { validation_cycle_id: string };
    Body: CloseValidationCycleV2Request;
  }>(
    '/paper-implementation/validation-cycles/:validation_cycle_id/closure/v2',
    {
      schema: {
        params: closureParamsSchema,
        body: closeValidationCycleV2RequestSchema,
        response: {
          201: closeValidationCycleV2ResponseSchema,
          ...standardErrorResponses,
        },
      },
      preValidation: async (request, _reply) => {
        if (
          request.body.validation_cycle_id !== undefined
          && request.params.validation_cycle_id !== request.body.validation_cycle_id
        ) {
          throw new AppError(
            400,
            'INVALID_PAYLOAD',
            'Path and body validation_cycle_id must match.',
            { reason_code: 'V2_TYPED_SNAPSHOT_INVALID' },
          );
        }
        const forbiddenField = findForbiddenNestedField(
          request.body,
          callerAuthoredClosureAuthorityFields,
        );
        if (!forbiddenField) {
          return;
        }
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `Caller-authored closure authority field is not allowed: ${forbiddenField}`,
          { reason_code: 'V2_TYPED_SNAPSHOT_INVALID' },
        );
      },
      errorHandler: handleRouteError,
    },
    controller.closeValidationCycle,
  );

  fastify.get<{ Params: { validation_cycle_id: string } }>(
    '/paper-implementation/validation-cycles/:validation_cycle_id/closure/v2/readiness',
    {
      schema: {
        params: closureParamsSchema,
        response: {
          200: validationCycleReadinessEvaluationV2Schema,
          ...standardErrorResponses,
        },
      },
      errorHandler: handleRouteError,
    },
    controller.getValidationCycleReadiness,
  );
}
