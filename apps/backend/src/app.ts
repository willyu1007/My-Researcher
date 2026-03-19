import Fastify, { type FastifyInstance } from 'fastify';
import { AutoPullController } from './controllers/auto-pull-controller.js';
import { LiteratureController } from './controllers/literature-controller.js';
import { TopicSettingsController } from './controllers/topic-settings-controller.js';
import { InMemoryAutoPullRepository } from './repositories/in-memory-auto-pull-repository.js';
import { InMemoryLiteratureRepository } from './repositories/in-memory-literature-repository.js';
import { ResearchLifecycleController } from './controllers/research-lifecycle-controller.js';
import { InMemoryResearchLifecycleRepository } from './repositories/in-memory-research-lifecycle-repository.js';
import { getPrismaClient } from './repositories/prisma/prisma-client.js';
import { PrismaAutoPullRepository } from './repositories/prisma/prisma-auto-pull-repository.js';
import { PrismaLiteratureRepository } from './repositories/prisma/prisma-literature-repository.js';
import { PrismaResearchLifecycleRepository } from './repositories/prisma/prisma-research-lifecycle-repository.js';
import { InMemoryTopicManagementRepository } from './repositories/topic-management.repository.js';
import { PrismaTopicManagementRepository } from './repositories/prisma/prisma-topic-management-repository.js';
import { registerAutoPullRoutes } from './routes/auto-pull-routes.js';
import { registerLiteratureRoutes } from './routes/literature-routes.js';
import { registerResearchLifecycleRoutes } from './routes/research-lifecycle-routes.js';
import { registerTopicManagementRoutes } from './routes/topic-management.js';
import { registerTopicSettingsRoutes } from './routes/topic-settings-routes.js';
import type { AutoPullRepository } from './repositories/auto-pull-repository.js';
import type { LiteratureRepository } from './repositories/literature-repository.js';
import type { ResearchLifecycleRepository } from './repositories/research-lifecycle-repository.js';
import type { TopicManagementRepository } from './repositories/topic-management.repository.js';
import { AutoPullScheduler } from './services/auto-pull-scheduler.js';
import { AutoPullService } from './services/auto-pull-service.js';
import { LiteratureService } from './services/literature-service.js';
import { ResearchLifecycleService } from './services/research-lifecycle-service.js';
import {
  TopicManagementService,
  type PaperProjectGateway,
} from './services/topic-management.service.js';
import { TopicManagementController } from './controllers/topic-management.controller.js';
import { FileGovernanceDeliveryAuditStore } from './services/event-delivery/governance-delivery-audit-store.js';
import { FileGovernanceDeliveryOutboxStore } from './services/event-delivery/governance-delivery-outbox-store.js';
import { InProcessGovernanceEventDeliveryAdapter } from './services/event-delivery/governance-event-delivery-adapter.js';
import { DurableOutboxGovernanceEventDeliveryAdapter } from './services/event-delivery/governance-event-delivery-outbox-adapter.js';

type RepositoryStrategy = 'memory' | 'prisma';

export function resolveTopicManagementStoreConfig(): {
  researchLifecycleStrategy: RepositoryStrategy;
  literatureStrategy: RepositoryStrategy;
  autoPullStrategy: RepositoryStrategy;
  topicStrategy: RepositoryStrategy;
} {
  const topicStrategy = resolveRepositoryStrategy(
    process.env.TOPIC_REPOSITORY,
    process.env.RESEARCH_LIFECYCLE_REPOSITORY,
  );
  const researchLifecycleStrategy = resolveRepositoryStrategy(
    process.env.RESEARCH_LIFECYCLE_REPOSITORY,
    process.env.TOPIC_REPOSITORY,
  );
  const literatureStrategy = resolveRepositoryStrategy(
    process.env.RESEARCH_LIFECYCLE_REPOSITORY,
    process.env.TOPIC_REPOSITORY,
  );
  const autoPullStrategy = resolveRepositoryStrategy(
    process.env.AUTO_PULL_REPOSITORY,
    process.env.TOPIC_REPOSITORY,
    process.env.RESEARCH_LIFECYCLE_REPOSITORY,
  );

  return {
    researchLifecycleStrategy,
    literatureStrategy,
    autoPullStrategy,
    topicStrategy,
  };
}

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  const storeConfig = resolveTopicManagementStoreConfig();
  assertTopicManagementStoreCompatibility(storeConfig);

  const repository = createRepository(storeConfig.researchLifecycleStrategy);
  const literatureRepository = createLiteratureRepository(storeConfig.literatureStrategy);
  const autoPullRepository = createAutoPullRepository(storeConfig.autoPullStrategy);
  const topicManagementRepository = createTopicManagementRepository(storeConfig.topicStrategy);
  const auditStore = new FileGovernanceDeliveryAuditStore({
    filePath: process.env.GOVERNANCE_DELIVERY_AUDIT_LOG_PATH,
  });
  const deliveryAdapter = createDeliveryAdapter();
  const researchLifecycleService = new ResearchLifecycleService(repository, {
    deliveryAdapter,
    deliveryAuditStore: auditStore,
  });
  const researchLifecycleController = new ResearchLifecycleController(researchLifecycleService);
  const paperProjectGateway: PaperProjectGateway = {
    createPaperProject: (input) => researchLifecycleService.createPaperProject(input),
    deletePaperProject: (paperId) => researchLifecycleService.deletePaperProject(paperId),
  };
  const topicManagementService = new TopicManagementService(topicManagementRepository, paperProjectGateway, {
    findTopicProfileById: (topicId) => autoPullRepository.findTopicProfileById(topicId),
    findLiteratureById: (literatureId) => literatureRepository.findLiteratureById(literatureId),
  });
  const topicManagementController = new TopicManagementController(topicManagementService);
  const literatureService = new LiteratureService(literatureRepository, repository);
  const literatureController = new LiteratureController(literatureService);
  const autoPullService = new AutoPullService(autoPullRepository, literatureService);
  const autoPullController = new AutoPullController(autoPullService);
  const topicSettingsController = new TopicSettingsController(autoPullService);
  const autoPullScheduler = createAutoPullScheduler(autoPullService);

  app.setErrorHandler((error, _request, reply) => {
    if ('validation' in error) {
      reply.status(400).send({
        error: {
          code: 'INVALID_PAYLOAD',
          message: error.message,
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
  });

  app.get('/health', async () => ({ ok: true }));

  if (autoPullScheduler) {
    autoPullScheduler.start();
    app.addHook('onClose', async () => {
      await autoPullScheduler.stop();
    });
  }

  app.register(async (instance) => {
    await registerResearchLifecycleRoutes(instance, researchLifecycleController);
    await registerTopicManagementRoutes(instance, topicManagementController);
    await registerLiteratureRoutes(instance, literatureController);
    await registerTopicSettingsRoutes(instance, topicSettingsController);
    await registerAutoPullRoutes(instance, autoPullController);
  });

  return app;
}

function createRepository(strategy: RepositoryStrategy): ResearchLifecycleRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaResearchLifecycleRepository(prisma);
  }

  return new InMemoryResearchLifecycleRepository();
}

function createLiteratureRepository(strategy: RepositoryStrategy): LiteratureRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaLiteratureRepository(prisma);
  }

  return new InMemoryLiteratureRepository();
}

function createAutoPullRepository(strategy: RepositoryStrategy): AutoPullRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaAutoPullRepository(prisma);
  }

  return new InMemoryAutoPullRepository();
}

function createTopicManagementRepository(strategy: RepositoryStrategy): TopicManagementRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTopicManagementRepository(prisma);
  }

  return new InMemoryTopicManagementRepository();
}

function createAutoPullScheduler(service: AutoPullService): AutoPullScheduler | null {
  const enabled = process.env.AUTO_PULL_SCHEDULER_ENABLED ?? 'true';
  const normalized = enabled.trim().toLowerCase();
  if (normalized === 'false' || normalized === '0' || normalized === 'off') {
    return null;
  }

  const tickMsRaw = process.env.AUTO_PULL_SCHEDULER_TICK_MS;
  const tickMs = tickMsRaw ? Number.parseInt(tickMsRaw, 10) : undefined;
  return new AutoPullScheduler(service, { tickMs });
}

function createDeliveryAdapter():
  | InProcessGovernanceEventDeliveryAdapter
  | DurableOutboxGovernanceEventDeliveryAdapter {
  const mode = process.env.GOVERNANCE_DELIVERY_MODE ?? 'in-process';
  if (mode === 'durable-outbox') {
    const outboxStore = new FileGovernanceDeliveryOutboxStore({
      filePath: process.env.GOVERNANCE_OUTBOX_LOG_PATH,
    });
    return new DurableOutboxGovernanceEventDeliveryAdapter(outboxStore);
  }
  return new InProcessGovernanceEventDeliveryAdapter();
}

function resolveRepositoryStrategy(...candidates: Array<string | undefined>): RepositoryStrategy {
  const raw = candidates.find((candidate) => candidate !== undefined);
  if (!raw) {
    return 'memory';
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === 'memory' || normalized === 'prisma') {
    return normalized;
  }

  throw new Error(`Unsupported repository strategy "${raw}". Expected "memory" or "prisma".`);
}

function assertTopicManagementStoreCompatibility(config: {
  researchLifecycleStrategy: RepositoryStrategy;
  literatureStrategy: RepositoryStrategy;
  autoPullStrategy: RepositoryStrategy;
  topicStrategy: RepositoryStrategy;
}) {
  if (config.topicStrategy !== 'prisma') {
    return;
  }

  if (
    config.topicStrategy !== config.researchLifecycleStrategy
    || config.topicStrategy !== config.literatureStrategy
    || config.topicStrategy !== config.autoPullStrategy
  ) {
    throw new Error(
      'When topic management uses Prisma, TOPIC_REPOSITORY, RESEARCH_LIFECYCLE_REPOSITORY, and AUTO_PULL_REPOSITORY must resolve to the same strategy.',
    );
  }
}
