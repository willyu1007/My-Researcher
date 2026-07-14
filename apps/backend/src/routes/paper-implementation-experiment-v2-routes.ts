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

import type {
  PaperImplementationExperimentV2Controller,
} from '../controllers/paper-implementation-experiment-v2-controller.js';
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

const admissionParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['implementation_project_id', 'validation_cycle_id'],
  properties: {
    implementation_project_id: { type: 'string', minLength: 1 },
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
        await reply.status(400).send({
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
}
