import Fastify, { type FastifyInstance } from 'fastify';
import { AutoPullController } from './controllers/auto-pull-controller.js';
import { LiteratureBackfillController } from './controllers/literature-backfill-controller.js';
import { LiteratureContentProcessingSettingsController } from './controllers/literature-content-processing-settings-controller.js';
import { LiteratureController } from './controllers/literature-controller.js';
import { TopicSettingsController } from './controllers/topic-settings-controller.js';
import { InMemoryApplicationSettingsRepository } from './repositories/in-memory-application-settings-repository.js';
import { InMemoryAutoPullRepository } from './repositories/in-memory-auto-pull-repository.js';
import { InMemoryLiteratureRepository } from './repositories/in-memory-literature-repository.js';
import { ResearchLifecycleController } from './controllers/research-lifecycle-controller.js';
import { InMemoryResearchLifecycleRepository } from './repositories/in-memory-research-lifecycle-repository.js';
import { getPrismaClient } from './repositories/prisma/prisma-client.js';
import { PrismaApplicationSettingsRepository } from './repositories/prisma/prisma-application-settings-repository.js';
import { PrismaAutoPullRepository } from './repositories/prisma/prisma-auto-pull-repository.js';
import { PrismaLiteratureRepository } from './repositories/prisma/prisma-literature-repository.js';
import { PrismaResearchLifecycleRepository } from './repositories/prisma/prisma-research-lifecycle-repository.js';
import { InMemoryTitleCardManagementRepository } from './repositories/title-card-management.repository.js';
import { PrismaTitleCardManagementRepository } from './repositories/prisma/prisma-title-card-management-repository.js';
import { registerAutoPullRoutes } from './routes/auto-pull-routes.js';
import { registerLiteratureBackfillRoutes } from './routes/literature-backfill-routes.js';
import { registerLiteratureContentProcessingSettingsRoutes } from './routes/literature-content-processing-settings-routes.js';
import { registerLiteratureRoutes } from './routes/literature-routes.js';
import { registerResearchLifecycleRoutes } from './routes/research-lifecycle-routes.js';
import { registerTitleCardManagementRoutes } from './routes/title-card-management.js';
import { registerTopicSettingsRoutes } from './routes/topic-settings-routes.js';
import type { ApplicationSettingsRepository } from './repositories/application-settings-repository.js';
import type { AutoPullRepository } from './repositories/auto-pull-repository.js';
import type { LiteratureRepository } from './repositories/literature-repository.js';
import type { ResearchLifecycleRepository } from './repositories/research-lifecycle-repository.js';
import type { TitleCardManagementRepository } from './repositories/title-card-management.repository.js';
import { AutoPullScheduler } from './services/auto-pull-scheduler.js';
import { AutoPullService } from './services/auto-pull-service.js';
import { LiteratureBackfillService } from './services/literature-backfill-service.js';
import { LiteratureFlowService } from './services/literature-flow-service.js';
import { LiteratureService } from './services/literature-service.js';
import { LiteratureContentProcessingSettingsService } from './services/literature-content-processing-settings-service.js';
import { ResearchLifecycleService } from './services/research-lifecycle-service.js';
import {
  TitleCardManagementService,
  type PaperProjectGateway,
} from './services/title-card-management.service.js';
import { TitleCardManagementController } from './controllers/title-card-management.controller.js';
import { FileGovernanceDeliveryAuditStore } from './services/event-delivery/governance-delivery-audit-store.js';
import { FileGovernanceDeliveryOutboxStore } from './services/event-delivery/governance-delivery-outbox-store.js';
import { InProcessGovernanceEventDeliveryAdapter } from './services/event-delivery/governance-event-delivery-adapter.js';
import { DurableOutboxGovernanceEventDeliveryAdapter } from './services/event-delivery/governance-event-delivery-outbox-adapter.js';

type RepositoryStrategy = 'memory' | 'prisma';

export function resolveTitleCardManagementStoreConfig(): {
  researchLifecycleStrategy: RepositoryStrategy;
  literatureStrategy: RepositoryStrategy;
  autoPullStrategy: RepositoryStrategy;
  titleCardStrategy: RepositoryStrategy;
  applicationSettingsStrategy: RepositoryStrategy;
} {
  const titleCardStrategy = resolveRepositoryStrategy(
    process.env.TITLE_CARD_REPOSITORY,
    process.env.RESEARCH_LIFECYCLE_REPOSITORY,
  );
  const researchLifecycleStrategy = resolveRepositoryStrategy(
    process.env.RESEARCH_LIFECYCLE_REPOSITORY,
    process.env.TITLE_CARD_REPOSITORY,
  );
  const literatureStrategy = resolveRepositoryStrategy(
    process.env.RESEARCH_LIFECYCLE_REPOSITORY,
    process.env.TITLE_CARD_REPOSITORY,
  );
  const autoPullStrategy = resolveRepositoryStrategy(
    process.env.AUTO_PULL_REPOSITORY,
    process.env.TITLE_CARD_REPOSITORY,
    process.env.RESEARCH_LIFECYCLE_REPOSITORY,
  );
  const applicationSettingsStrategy = resolveRepositoryStrategy(
    process.env.APPLICATION_SETTINGS_REPOSITORY,
    process.env.TITLE_CARD_REPOSITORY,
    process.env.RESEARCH_LIFECYCLE_REPOSITORY,
  );

  return {
    researchLifecycleStrategy,
    literatureStrategy,
    autoPullStrategy,
    titleCardStrategy,
    applicationSettingsStrategy,
  };
}

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  const storeConfig = resolveTitleCardManagementStoreConfig();
  assertTitleCardManagementStoreCompatibility(storeConfig);

  const repository = createRepository(storeConfig.researchLifecycleStrategy);
  const literatureRepository = createLiteratureRepository(storeConfig.literatureStrategy);
  const autoPullRepository = createAutoPullRepository(storeConfig.autoPullStrategy);
  const applicationSettingsRepository = createApplicationSettingsRepository(storeConfig.applicationSettingsStrategy);
  const titleCardManagementRepository = createTitleCardManagementRepository(storeConfig.titleCardStrategy);
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
  const titleCardManagementService = new TitleCardManagementService(titleCardManagementRepository, paperProjectGateway, {
    findLiteratureById: (literatureId) => literatureRepository.findLiteratureById(literatureId),
    listLiteratures: () => literatureRepository.listLiteratures(),
    listSourcesByLiteratureId: (literatureId) => literatureRepository.listSourcesByLiteratureId(literatureId),
    listPipelineStatesByLiteratureIds: (literatureIds) => literatureRepository.listPipelineStatesByLiteratureIds(literatureIds),
  });
  const titleCardManagementController = new TitleCardManagementController(titleCardManagementService);
  const literatureContentProcessingSettingsService = new LiteratureContentProcessingSettingsService(applicationSettingsRepository);
  const literatureContentProcessingSettingsController = new LiteratureContentProcessingSettingsController(
    literatureContentProcessingSettingsService,
  );
  const literatureFlowService = new LiteratureFlowService(
    literatureRepository,
    literatureContentProcessingSettingsService,
  );
  const literatureService = new LiteratureService(
    literatureRepository,
    repository,
    literatureContentProcessingSettingsService,
    literatureFlowService,
  );
  const literatureController = new LiteratureController(literatureService);
  const literatureBackfillService = new LiteratureBackfillService(literatureRepository, literatureFlowService);
  void literatureBackfillService.resumeRunnableJobs().catch((error) => {
    app.log.error({ err: error }, 'Failed to resume literature content-processing backfill jobs.');
  });
  const literatureBackfillController = new LiteratureBackfillController(literatureBackfillService);
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
    await registerTitleCardManagementRoutes(instance, titleCardManagementController);
    await registerLiteratureContentProcessingSettingsRoutes(instance, literatureContentProcessingSettingsController);
    await registerLiteratureBackfillRoutes(instance, literatureBackfillController);
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

function createApplicationSettingsRepository(strategy: RepositoryStrategy): ApplicationSettingsRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaApplicationSettingsRepository(prisma);
  }

  return new InMemoryApplicationSettingsRepository();
}

function createTitleCardManagementRepository(strategy: RepositoryStrategy): TitleCardManagementRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTitleCardManagementRepository(prisma);
  }

  return new InMemoryTitleCardManagementRepository();
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

function assertTitleCardManagementStoreCompatibility(config: {
  researchLifecycleStrategy: RepositoryStrategy;
  literatureStrategy: RepositoryStrategy;
  autoPullStrategy: RepositoryStrategy;
  titleCardStrategy: RepositoryStrategy;
  applicationSettingsStrategy: RepositoryStrategy;
}) {
  if (config.titleCardStrategy !== 'prisma') {
    return;
  }

  if (
    config.titleCardStrategy !== config.researchLifecycleStrategy
    || config.titleCardStrategy !== config.literatureStrategy
    || config.titleCardStrategy !== config.autoPullStrategy
    || config.titleCardStrategy !== config.applicationSettingsStrategy
  ) {
    throw new Error(
      'When title-card management uses Prisma, TITLE_CARD_REPOSITORY, RESEARCH_LIFECYCLE_REPOSITORY, AUTO_PULL_REPOSITORY, and APPLICATION_SETTINGS_REPOSITORY must resolve to the same strategy.',
    );
  }
}
