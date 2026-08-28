import type { FastifyInstance } from 'fastify';
import {
  topicSelectionResearchEvidencePacketRequestSchema,
  topicSelectionResearchEvidencePacketSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import type {
  TopicSelectionResearchEvidencePacketController,
} from '../controllers/topic-selection-research-evidence-packet-controller.js';

export async function registerTopicSelectionResearchEvidencePacketRoutes(
  fastify: FastifyInstance,
  controller: TopicSelectionResearchEvidencePacketController,
): Promise<void> {
  fastify.post(
    '/topic-selection/research/evidence-packets/resolve',
    {
      schema: {
        body: topicSelectionResearchEvidencePacketRequestSchema,
        response: { 200: topicSelectionResearchEvidencePacketSchema },
      },
    },
    controller.resolve,
  );
}
