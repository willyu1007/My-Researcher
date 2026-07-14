import type { FastifyInstance } from 'fastify';
import {
  EXPERIMENT_FOUNDATION_EXTERNAL_TRAINING_JOB_STATUSES,
  EXPERIMENT_FOUNDATION_TRAINING_ADAPTER_KINDS,
  cancelExternalTrainingJobRequestSchema,
  collectExternalTrainingJobRequestSchema,
  submitExternalTrainingJobRequestSchema,
  syncExternalTrainingJobRequestSchema,
  type CancelExternalTrainingJobRequest,
  type CollectExternalTrainingJobRequest,
  type SubmitExternalTrainingJobRequest,
  type SyncExternalTrainingJobRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-contracts';
import { ExperimentFoundationExecutionController } from '../controllers/experiment-foundation-execution-controller.js';
import {
  legacyExperimentMutationOnRequest,
  type LegacyExperimentMutationRouteOptions,
} from './experiment-v2-cutover-guard.js';

type JobParams = {
  external_job_id: string;
};

const jobParamsSchema = {
  params: {
    type: 'object',
    additionalProperties: false,
    required: ['external_job_id'],
    properties: {
      external_job_id: { type: 'string', minLength: 1 },
    },
  },
} as const;

const listJobsQuerySchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      adapter_kind: { enum: [...EXPERIMENT_FOUNDATION_TRAINING_ADAPTER_KINDS] },
      status: { enum: [...EXPERIMENT_FOUNDATION_EXTERNAL_TRAINING_JOB_STATUSES] },
      training_task_spec_id: { type: 'string', minLength: 1 },
      materialization_result_id: { type: 'string', minLength: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
      cursor: { type: 'string', minLength: 1 },
    },
  },
} as const;

function withJobParams<T extends { body?: unknown }>(schema: T) {
  return { ...schema, params: jobParamsSchema.params };
}

export async function registerExperimentFoundationExecutionRoutes(
  fastify: FastifyInstance,
  controller: ExperimentFoundationExecutionController,
  options: LegacyExperimentMutationRouteOptions = {},
): Promise<void> {
  const legacyMutationOnRequest = legacyExperimentMutationOnRequest(options);

  fastify.post<{ Body: SubmitExternalTrainingJobRequest }>(
    '/experiment-foundation/execution/jobs/submit',
    {
      schema: submitExternalTrainingJobRequestSchema,
      onRequest: legacyMutationOnRequest,
    },
    controller.submitJob,
  );
  fastify.get(
    '/experiment-foundation/execution/jobs/:external_job_id',
    { schema: jobParamsSchema },
    controller.getJob,
  );
  fastify.get(
    '/experiment-foundation/execution/jobs',
    { schema: listJobsQuerySchema },
    controller.listJobs,
  );
  fastify.post<{ Params: JobParams; Body: SyncExternalTrainingJobRequest }>(
    '/experiment-foundation/execution/jobs/:external_job_id/sync',
    {
      schema: withJobParams(syncExternalTrainingJobRequestSchema),
      onRequest: legacyMutationOnRequest,
    },
    controller.syncJob,
  );
  fastify.post<{ Params: JobParams; Body: CancelExternalTrainingJobRequest }>(
    '/experiment-foundation/execution/jobs/:external_job_id/cancel',
    {
      schema: withJobParams(cancelExternalTrainingJobRequestSchema),
      onRequest: legacyMutationOnRequest,
    },
    controller.cancelJob,
  );
  fastify.post<{ Params: JobParams; Body: CollectExternalTrainingJobRequest }>(
    '/experiment-foundation/execution/jobs/:external_job_id/collect',
    {
      schema: withJobParams(collectExternalTrainingJobRequestSchema),
      onRequest: legacyMutationOnRequest,
    },
    controller.collectJob,
  );
}
