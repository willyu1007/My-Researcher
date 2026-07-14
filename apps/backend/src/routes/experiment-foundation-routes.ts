import type { FastifyInstance } from 'fastify';
import {
  EXPERIMENT_FOUNDATION_RECORD_KINDS,
  createExperimentFoundationRecordRequestSchema,
  experimentFoundationPromotionDecisionRequestSchema,
  experimentFoundationReadinessCheckRequestSchema,
  listExperimentFoundationReadinessReportsQuerySchema,
  type CreateExperimentFoundationRecordRequest,
  type ExperimentFoundationPromotionDecisionRequest,
  type ExperimentFoundationReadinessCheckRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-contracts';
import { ExperimentFoundationController } from '../controllers/experiment-foundation-controller.js';
import {
  legacyExperimentMutationOnRequest,
  type LegacyExperimentMutationRouteOptions,
} from './experiment-v2-cutover-guard.js';

type RecordParams = {
  record_kind: string;
  record_id: string;
};

type CandidateParams = {
  candidate_id: string;
};

const recordParamsSchema = {
  params: {
    type: 'object',
    additionalProperties: false,
    required: ['record_kind', 'record_id'],
    properties: {
      record_kind: { enum: [...EXPERIMENT_FOUNDATION_RECORD_KINDS] },
      record_id: { type: 'string', minLength: 1 },
    },
  },
} as const;

const listRecordsQuerySchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      record_kind: { enum: [...EXPERIMENT_FOUNDATION_RECORD_KINDS] },
      status: { type: 'string', minLength: 1 },
      family: { type: 'string', minLength: 1 },
      parent_record_id: { type: 'string', minLength: 1 },
      owner_ref_id: { type: 'string', minLength: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
      cursor: { type: 'string', minLength: 1 },
    },
  },
} as const;

const readinessParamsSchema = {
  params: {
    type: 'object',
    additionalProperties: false,
    required: ['target_kind', 'target_id'],
    properties: {
      target_kind: { enum: [...EXPERIMENT_FOUNDATION_RECORD_KINDS] },
      target_id: { type: 'string', minLength: 1 },
    },
  },
} as const;

const candidateParamsSchema = {
  params: {
    type: 'object',
    additionalProperties: false,
    required: ['candidate_id'],
    properties: {
      candidate_id: { type: 'string', minLength: 1 },
    },
  },
} as const;

function withRecordParams<T extends { body?: unknown }>(schema: T) {
  return { ...schema, params: recordParamsSchema.params };
}

function withCandidateParams<T extends { body?: unknown }>(schema: T) {
  return { ...schema, params: candidateParamsSchema.params };
}

export async function registerExperimentFoundationRoutes(
  fastify: FastifyInstance,
  controller: ExperimentFoundationController,
  options: LegacyExperimentMutationRouteOptions = {},
): Promise<void> {
  const legacyMutationOnRequest = legacyExperimentMutationOnRequest(options);

  fastify.post<{ Body: CreateExperimentFoundationRecordRequest }>(
    '/experiment-foundation/records',
    {
      schema: createExperimentFoundationRecordRequestSchema,
      onRequest: legacyMutationOnRequest,
    },
    controller.createRecord,
  );
  fastify.put<{
    Params: RecordParams;
    Body: CreateExperimentFoundationRecordRequest;
  }>(
    '/experiment-foundation/records/:record_kind/:record_id',
    {
      schema: withRecordParams(createExperimentFoundationRecordRequestSchema),
      onRequest: legacyMutationOnRequest,
    },
    controller.upsertRecord,
  );
  fastify.get(
    '/experiment-foundation/records/:record_kind/:record_id',
    { schema: recordParamsSchema },
    controller.getRecord,
  );
  fastify.get(
    '/experiment-foundation/records',
    { schema: listRecordsQuerySchema },
    controller.listRecords,
  );
  fastify.post<{ Body: ExperimentFoundationReadinessCheckRequest }>(
    '/experiment-foundation/readiness/check',
    {
      schema: experimentFoundationReadinessCheckRequestSchema,
      onRequest: legacyMutationOnRequest,
    },
    controller.checkReadiness,
  );
  fastify.get(
    '/experiment-foundation/readiness/:target_kind/:target_id/latest',
    { schema: readinessParamsSchema },
    controller.getLatestReadiness,
  );
  fastify.get(
    '/experiment-foundation/readiness',
    { schema: listExperimentFoundationReadinessReportsQuerySchema },
    controller.listReadinessReports,
  );
  fastify.post<{
    Params: CandidateParams;
    Body: ExperimentFoundationPromotionDecisionRequest;
  }>(
    '/experiment-foundation/candidates/:candidate_id/promotion',
    {
      schema: withCandidateParams(experimentFoundationPromotionDecisionRequestSchema),
      onRequest: legacyMutationOnRequest,
    },
    controller.decidePromotion,
  );
}
