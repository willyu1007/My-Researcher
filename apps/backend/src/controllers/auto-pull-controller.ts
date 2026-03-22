import type {
  AcknowledgeAlertRequest,
  AutoPullAlertDTO,
  AutoPullRuleDTO,
  AutoPullRunDTO,
  AutoPullRunStatus,
  AutoPullScope,
  AutoPullRuleStatus,
  AutoPullAlertLevel,
  CreateAutoPullRuleRequest,
  CreateAutoPullRunRequest,
  RetryFailedSourcesRequest,
  UpdateAutoPullRuleRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/auto-pull-contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';
import { AutoPullService } from '../services/auto-pull-service.js';

type RuleParams = {
  ruleId: string;
};

type RunParams = {
  runId: string;
};

type AlertParams = {
  alertId: string;
};

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

export class AutoPullController {
  constructor(private readonly service: AutoPullService) {}

  async createRule(
    request: FastifyRequest<{ Body: CreateAutoPullRuleRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.createRule(request.body);
      reply.status(201).send(result satisfies AutoPullRuleDTO);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async listRules(
    request: FastifyRequest<{ Querystring: RuleQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.listRules({
        scope: request.query.scope,
        topicId: request.query.topic_id,
        status: request.query.status,
      });
      reply.status(200).send({ items: result });
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async updateRule(
    request: FastifyRequest<{ Params: RuleParams; Body: UpdateAutoPullRuleRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.updateRule(request.params.ruleId, request.body);
      reply.status(200).send(result);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async deleteRule(
    request: FastifyRequest<{ Params: RuleParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      await this.service.deleteRule(request.params.ruleId);
      reply.status(204).send();
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async triggerRuleRun(
    request: FastifyRequest<{ Params: RuleParams; Body: CreateAutoPullRunRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.triggerRuleRun(request.params.ruleId, request.body);
      reply.status(201).send(result satisfies AutoPullRunDTO);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async retryFailedSources(
    request: FastifyRequest<{ Params: RunParams; Body: RetryFailedSourcesRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.retryFailedSources(request.params.runId, request.body);
      reply.status(201).send(result);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async listRuns(
    request: FastifyRequest<{ Querystring: RunQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.listRuns({
        ruleId: request.query.rule_id,
        status: request.query.status,
        limit: request.query.limit,
      });
      reply.status(200).send({ items: result });
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async getRun(
    request: FastifyRequest<{ Params: RunParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.getRun(request.params.runId);
      reply.status(200).send(result);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async listAlerts(
    request: FastifyRequest<{ Querystring: AlertQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.listAlerts({
        ruleId: request.query.rule_id,
        level: request.query.level,
        acked: request.query.acked,
        limit: request.query.limit,
      });
      reply.status(200).send({ items: result satisfies AutoPullAlertDTO[] });
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async acknowledgeAlert(
    request: FastifyRequest<{ Params: AlertParams; Body: AcknowledgeAlertRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.acknowledgeAlert(request.params.alertId, request.body);
      reply.status(200).send(result);
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
