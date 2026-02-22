import Fastify, { type FastifyInstance } from 'fastify';
import { ResearchLifecycleController } from './controllers/research-lifecycle-controller.js';
import { InMemoryResearchLifecycleRepository } from './repositories/in-memory-research-lifecycle-repository.js';
import { getPrismaClient } from './repositories/prisma/prisma-client.js';
import { PrismaResearchLifecycleRepository } from './repositories/prisma/prisma-research-lifecycle-repository.js';
import { registerResearchLifecycleRoutes } from './routes/research-lifecycle-routes.js';
import type { ResearchLifecycleRepository } from './repositories/research-lifecycle-repository.js';
import { ResearchLifecycleService } from './services/research-lifecycle-service.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  const repository = createRepository();
  const service = new ResearchLifecycleService(repository);
  const controller = new ResearchLifecycleController(service);

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

  app.register(async (instance) => {
    await registerResearchLifecycleRoutes(instance, controller);
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
