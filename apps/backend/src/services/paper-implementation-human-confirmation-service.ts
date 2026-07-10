import type {
  CreateHumanConfirmationRecordRequest,
  HumanConfirmationRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-human-confirmation-contracts';

import { AppError } from '../errors/app-error.js';
import type { PaperImplementationRepository } from '../repositories/paper-implementation.repository.js';
import type {
  PaperImplementationHumanConfirmationRepository,
} from '../repositories/paper-implementation-human-confirmation.repository.js';

function cryptoId(): string {
  return globalThis.crypto.randomUUID().replaceAll('-', '');
}

interface PaperImplementationHumanConfirmationServiceOptions {
  projectRepository: PaperImplementationRepository;
  confirmationRepository: PaperImplementationHumanConfirmationRepository;
  idFactory?: (prefix: string) => string;
  now?: () => string;
}

export class PaperImplementationHumanConfirmationService {
  private readonly projectRepository: PaperImplementationRepository;
  private readonly confirmationRepository: PaperImplementationHumanConfirmationRepository;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: () => string;

  constructor(options: PaperImplementationHumanConfirmationServiceOptions) {
    this.projectRepository = options.projectRepository;
    this.confirmationRepository = options.confirmationRepository;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${cryptoId()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async createHumanConfirmationRecord(
    implementationProjectId: string,
    request: CreateHumanConfirmationRecordRequest,
  ): Promise<HumanConfirmationRecord> {
    await this.requireActiveProject(implementationProjectId);
    if (!request.rationale.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'rationale is required.');
    }
    if (request.confirmed_by_actor_type !== 'human') {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'HumanConfirmationRecord must be confirmed by a human actor.',
      );
    }
    const record: HumanConfirmationRecord = {
      confirmation_record_id: request.confirmation_record_id ?? this.idFactory('pi_human_confirmation'),
      implementation_project_id: implementationProjectId,
      confirmation_scope: request.confirmation_scope,
      target_refs: request.target_refs,
      reviewed_sources: request.reviewed_sources ?? [],
      transition_attempt_ref: request.transition_attempt_ref ?? null,
      gate_result_refs: request.gate_result_refs ?? [],
      rationale: request.rationale.trim(),
      confirmed_by_actor_type: request.confirmed_by_actor_type,
      confirmed_by_actor_id: request.confirmed_by_actor_id ?? null,
      policy_version_id: request.policy_version_id ?? null,
      status: 'active',
      status_reason: null,
      created_at: this.now(),
      updated_at: null,
    };
    return this.confirmationRepository.createHumanConfirmationRecord(record);
  }

  async listHumanConfirmationRecords(
    implementationProjectId: string,
  ): Promise<HumanConfirmationRecord[]> {
    await this.requireActiveProject(implementationProjectId);
    return this.confirmationRepository.listHumanConfirmationRecords(implementationProjectId);
  }

  private async requireActiveProject(implementationProjectId: string): Promise<void> {
    if (!implementationProjectId.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'implementation_project_id is required.');
    }
    const project = await this.projectRepository.findProjectById(implementationProjectId);
    if (!project) {
      throw new AppError(404, 'NOT_FOUND', `ImplementationProject ${implementationProjectId} not found.`);
    }
    if (project.lifecycle_status !== 'active') {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Human confirmation capture requires an active ImplementationProject.',
      );
    }
  }
}
