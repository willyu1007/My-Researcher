import type { FastifyInstance } from 'fastify';
import {
  topicSelectionOfflineEvaluationCaseRecordSchema,
  topicSelectionOfflineEvaluationDatasetRecordSchema,
  topicSelectionOfflineEvaluationRunRecordSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-offline-evaluation-replay-contracts';
import {
  topicSelectionResearchArenaCalibrationCaseCreateRequestSchema,
  topicSelectionResearchArenaCalibrationDatasetCreateRequestSchema,
  topicSelectionResearchArenaCalibrationReportSchema,
  topicSelectionResearchArenaCalibrationRunCreateRequestSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-calibration-contracts';
import type { TopicSelectionResearchArenaCalibrationController } from '../controllers/topic-selection-research-arena-calibration-controller.js';

const runParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['runId'],
  properties: { runId: { type: 'string', minLength: 1 } },
} as const;

export async function registerTopicSelectionResearchArenaCalibrationRoutes(
  fastify: FastifyInstance,
  controller: TopicSelectionResearchArenaCalibrationController,
): Promise<void> {
  fastify.post('/topic-selection/research/arena/calibration/datasets', {
    schema: {
      body: topicSelectionResearchArenaCalibrationDatasetCreateRequestSchema,
      response: { 201: topicSelectionOfflineEvaluationDatasetRecordSchema },
    },
  }, controller.createDataset);
  fastify.post('/topic-selection/research/arena/calibration/cases', {
    schema: {
      body: topicSelectionResearchArenaCalibrationCaseCreateRequestSchema,
      response: { 201: topicSelectionOfflineEvaluationCaseRecordSchema },
    },
  }, controller.addCase);
  fastify.post('/topic-selection/research/arena/calibration/runs', {
    schema: {
      body: topicSelectionResearchArenaCalibrationRunCreateRequestSchema,
      response: { 201: topicSelectionOfflineEvaluationRunRecordSchema },
    },
  }, controller.startRun);
  fastify.post('/topic-selection/research/arena/calibration/runs/:runId/evaluate', {
    schema: {
      params: runParamsSchema,
      response: { 200: topicSelectionResearchArenaCalibrationReportSchema },
    },
  }, controller.evaluateRun);
  fastify.get('/topic-selection/research/arena/calibration/runs/:runId/report', {
    schema: {
      params: runParamsSchema,
      response: { 200: topicSelectionResearchArenaCalibrationReportSchema },
    },
  }, controller.getReport);
}
