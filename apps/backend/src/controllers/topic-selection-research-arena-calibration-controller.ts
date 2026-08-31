import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  TopicSelectionResearchArenaCalibrationCaseCreateRequest,
  TopicSelectionResearchArenaCalibrationDatasetCreateRequest,
  TopicSelectionResearchArenaCalibrationRunCreateRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-calibration-contracts';
import { AppError } from '../errors/app-error.js';
import type { TopicSelectionResearchArenaCalibrationService } from '../services/topic-selection-research-arena-calibration-service.js';

type CalibrationService = Pick<
  TopicSelectionResearchArenaCalibrationService,
  'createDataset' | 'addCase' | 'startRun' | 'evaluateRun' | 'getReport'
>;

export class TopicSelectionResearchArenaCalibrationController {
  constructor(private readonly service: CalibrationService) {}

  createDataset = async (
    request: FastifyRequest<{ Body: TopicSelectionResearchArenaCalibrationDatasetCreateRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.status(201).send(await this.service.createDataset(request.body));
    } catch (error) {
      return this.sendError(error, reply, 'research Arena calibration dataset creation');
    }
  };

  addCase = async (
    request: FastifyRequest<{ Body: TopicSelectionResearchArenaCalibrationCaseCreateRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.status(201).send(await this.service.addCase(request.body));
    } catch (error) {
      return this.sendError(error, reply, 'research Arena calibration case creation');
    }
  };

  startRun = async (
    request: FastifyRequest<{ Body: TopicSelectionResearchArenaCalibrationRunCreateRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.status(201).send(await this.service.startRun(request.body));
    } catch (error) {
      return this.sendError(error, reply, 'research Arena calibration run creation');
    }
  };

  evaluateRun = async (
    request: FastifyRequest<{ Params: { runId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.send(await this.service.evaluateRun(request.params.runId));
    } catch (error) {
      return this.sendError(error, reply, 'research Arena calibration evaluation');
    }
  };

  getReport = async (
    request: FastifyRequest<{ Params: { runId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      return reply.send(await this.service.getReport(request.params.runId));
    } catch (error) {
      return this.sendError(error, reply, 'research Arena calibration report read');
    }
  };

  private sendError(error: unknown, reply: FastifyReply, operation: string) {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: { code: error.errorCode, message: error.message, details: error.details },
      });
    }
    reply.request.log.error(error, `${operation} error`);
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: `Unexpected ${operation} failure.` },
    });
  }
}
