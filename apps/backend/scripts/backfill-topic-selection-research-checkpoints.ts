import { PrismaClient } from '@prisma/client';
import { PrismaTopicSelectionControlPlaneRepository } from '../src/repositories/prisma/prisma-topic-selection-control-plane-repository.js';
import { PrismaTopicSelectionResearchCheckpointBackfillSourceRepository } from '../src/repositories/prisma/prisma-topic-selection-research-checkpoint-backfill-source-repository.js';
import { PrismaTopicSelectionResearchCheckpointRepository } from '../src/repositories/prisma/prisma-topic-selection-research-checkpoint-repository.js';
import { TopicSelectionControlPlaneService } from '../src/services/topic-selection-control-plane-service.js';
import { TopicSelectionResearchCheckpointBackfillService } from '../src/services/topic-selection-research-checkpoint-backfill-service.js';
import { TopicSelectionResearchCheckpointService } from '../src/services/topic-selection-research-checkpoint-service.js';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--dry-run')) {
  throw new Error('Usage: backfill-topic-selection-research-checkpoints.ts [--dry-run]');
}

try {
  const controlPlane = new TopicSelectionControlPlaneService(
    new PrismaTopicSelectionControlPlaneRepository(prisma),
  );
  const checkpoints = new TopicSelectionResearchCheckpointService(
    new PrismaTopicSelectionResearchCheckpointRepository(prisma),
    controlPlane,
  );
  const backfill = new TopicSelectionResearchCheckpointBackfillService(
    new PrismaTopicSelectionResearchCheckpointBackfillSourceRepository(prisma),
    checkpoints,
  );
  const report = args.includes('--dry-run')
    ? await backfill.preview()
    : await backfill.backfill();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await prisma.$disconnect();
}
