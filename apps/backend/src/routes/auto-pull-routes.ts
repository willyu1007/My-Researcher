import {
  acknowledgeAlertRequestSchema,
  autoPullAlertsQuerySchema,
  autoPullRulesQuerySchema,
  autoPullRunsQuerySchema,
  createAutoPullRuleRequestSchema,
  createAutoPullRunRequestSchema,
  retryFailedSourcesRequestSchema,
  updateAutoPullRuleRequestSchema,
  type AutoPullAlertLevel,
  type AutoPullRuleStatus,
  type AutoPullRunStatus,
  type AutoPullScope,
  type AcknowledgeAlertRequest,
  type CreateAutoPullRuleRequest,
  type CreateAutoPullRunRequest,
  type RetryFailedSourcesRequest,
  type UpdateAutoPullRuleRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/auto-pull-contracts';
import type { FastifyInstance } from 'fastify';
import { AutoPullController } from '../controllers/auto-pull-controller.js';

const ruleParamsSchema = {
  type: 'object',
  required: ['ruleId'],
  properties: {
    ruleId: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

const runParamsSchema = {
  type: 'object',
  required: ['runId'],
  properties: {
    runId: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

const alertParamsSchema = {
  type: 'object',
  required: ['alertId'],
  properties: {
    alertId: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

type RuleQuery = {
  scope?: AutoPullScope;
  topic_id?: string;
  status?: AutoPullRuleStatus;
};

type RunQuery = {
  rule_id?: string;
  status?: AutoPullRunStatus;
  limit?: number;
};

type AlertQuery = {
  rule_id?: string;
  level?: AutoPullAlertLevel;
  acked?: boolean;
  limit?: number;
};

export async function registerAutoPullRoutes(
  app: FastifyInstance,
  controller: AutoPullController,
): Promise<void> {
  app.post<{ Body: CreateAutoPullRuleRequest }>(
    '/auto-pull/rules',
    {
      schema: {
        body: createAutoPullRuleRequestSchema,
      },
    },
    async (request, reply) => controller.createRule(request, reply),
  );

  app.get<{ Querystring: RuleQuery }>(
    '/auto-pull/rules',
    {
      schema: {
        querystring: autoPullRulesQuerySchema,
      },
    },
    async (request, reply) => controller.listRules(request, reply),
  );

  app.patch<{ Params: { ruleId: string }; Body: UpdateAutoPullRuleRequest }>(
    '/auto-pull/rules/:ruleId',
    {
      schema: {
        params: ruleParamsSchema,
        body: updateAutoPullRuleRequestSchema,
      },
    },
    async (request, reply) => controller.updateRule(request, reply),
  );

  app.delete<{ Params: { ruleId: string } }>(
    '/auto-pull/rules/:ruleId',
    {
      schema: {
        params: ruleParamsSchema,
      },
    },
    async (request, reply) => controller.deleteRule(request, reply),
  );

  app.post<{ Params: { ruleId: string }; Body: CreateAutoPullRunRequest }>(
    '/auto-pull/rules/:ruleId/runs',
    {
      schema: {
        params: ruleParamsSchema,
        body: createAutoPullRunRequestSchema,
      },
    },
    async (request, reply) => controller.triggerRuleRun(request, reply),
  );

  app.post<{ Params: { runId: string }; Body: RetryFailedSourcesRequest }>(
    '/auto-pull/runs/:runId/retry-failed-sources',
    {
      schema: {
        params: runParamsSchema,
        body: retryFailedSourcesRequestSchema,
      },
    },
    async (request, reply) => controller.retryFailedSources(request, reply),
  );

  app.get<{ Querystring: RunQuery }>(
    '/auto-pull/runs',
    {
      schema: {
        querystring: autoPullRunsQuerySchema,
      },
    },
    async (request, reply) => controller.listRuns(request, reply),
  );

  app.get<{ Params: { runId: string } }>(
    '/auto-pull/runs/:runId',
    {
      schema: {
        params: runParamsSchema,
      },
    },
    async (request, reply) => controller.getRun(request, reply),
  );

  app.get<{ Querystring: AlertQuery }>(
    '/auto-pull/alerts',
    {
      schema: {
        querystring: autoPullAlertsQuerySchema,
      },
    },
    async (request, reply) => controller.listAlerts(request, reply),
  );

  app.post<{ Params: { alertId: string }; Body: AcknowledgeAlertRequest }>(
    '/auto-pull/alerts/:alertId/ack',
    {
      schema: {
        params: alertParamsSchema,
        body: acknowledgeAlertRequestSchema,
      },
    },
    async (request, reply) => controller.acknowledgeAlert(request, reply),
  );
}
