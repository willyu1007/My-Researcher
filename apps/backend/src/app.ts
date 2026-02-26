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
import { registerAutoPullRoutes } from './routes/auto-pull-routes.js';
import { registerLiteratureRoutes } from './routes/literature-routes.js';
import { registerResearchLifecycleRoutes } from './routes/research-lifecycle-routes.js';
import { registerTopicSettingsRoutes } from './routes/topic-settings-routes.js';
import type { AutoPullRepository } from './repositories/auto-pull-repository.js';
import type { LiteratureRepository } from './repositories/literature-repository.js';
import type { ResearchLifecycleRepository } from './repositories/research-lifecycle-repository.js';
import { AutoPullScheduler } from './services/auto-pull-scheduler.js';
import { AutoPullService } from './services/auto-pull-service.js';
import { LiteratureService } from './services/literature-service.js';
import { ResearchLifecycleService } from './services/research-lifecycle-service.js';
import { FileGovernanceDeliveryAuditStore } from './services/event-delivery/governance-delivery-audit-store.js';
import { FileGovernanceDeliveryOutboxStore } from './services/event-delivery/governance-delivery-outbox-store.js';
import { InProcessGovernanceEventDeliveryAdapter } from './services/event-delivery/governance-event-delivery-adapter.js';
import { DurableOutboxGovernanceEventDeliveryAdapter } from './services/event-delivery/governance-event-delivery-outbox-adapter.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  const repository = createRepository();
  const literatureRepository = createLiteratureRepository();
  const autoPullRepository = createAutoPullRepository();
  const auditStore = new FileGovernanceDeliveryAuditStore({
    filePath: process.env.GOVERNANCE_DELIVERY_AUDIT_LOG_PATH,
  });
  const deliveryAdapter = createDeliveryAdapter();
  const researchLifecycleService = new ResearchLifecycleService(repository, {
    deliveryAdapter,
    deliveryAuditStore: auditStore,
  });
  const researchLifecycleController = new ResearchLifecycleController(researchLifecycleService);
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
    await registerLiteratureRoutes(instance, literatureController);
    await registerTopicSettingsRoutes(instance, topicSettingsController);
    await registerAutoPullRoutes(instance, autoPullController);
  });

  return app;
}

function createRepository(): ResearchLifecycleRepository {
  const strategy = process.env.RESEARCH_LIFECYCLE_REPOSITORY ?? 'memory';

  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaResearchLifecycleRepository(prisma);
  }

  return new InMemoryResearchLifecycleRepository();
}

function createLiteratureRepository(): LiteratureRepository {
  const strategy = process.env.RESEARCH_LIFECYCLE_REPOSITORY ?? 'memory';

  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaLiteratureRepository(prisma);
  }

  return new InMemoryLiteratureRepository();
}

function createAutoPullRepository(): AutoPullRepository {
  const strategy = process.env.AUTO_PULL_REPOSITORY
    ?? process.env.RESEARCH_LIFECYCLE_REPOSITORY
    ?? 'memory';

  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaAutoPullRepository(prisma);
  }

  return new InMemoryAutoPullRepository();
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
