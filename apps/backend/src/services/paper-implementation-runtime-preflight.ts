import type {
  ImplementationProject,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';

import { AppError } from '../errors/app-error.js';
import type { PaperImplementationRepository } from '../repositories/paper-implementation.repository.js';
import { hasText } from './paper-implementation-runtime-utils.js';

export async function requireActiveImplementationProject(
  projectRepository: PaperImplementationRepository,
  implementationProjectId: string,
): Promise<ImplementationProject> {
  if (!hasText(implementationProjectId)) {
    throw new AppError(400, 'INVALID_PAYLOAD', 'implementation_project_id is required.');
  }
  const project = await projectRepository.findProjectById(implementationProjectId);
  if (!project) {
    throw new AppError(404, 'NOT_FOUND', `ImplementationProject ${implementationProjectId} not found.`);
  }
  if (project.lifecycle_status !== 'active') {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      'Paper-implementation runtime slots require an active ImplementationProject.',
    );
  }
  return project;
}
