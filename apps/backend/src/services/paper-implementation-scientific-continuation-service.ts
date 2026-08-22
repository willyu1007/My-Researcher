import type {
  CreatePaperImplementationScientificContinuationRequest,
  PaperImplementationScientificContinuationEffect,
  PaperImplementationScientificContinuationResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type { AdvancePaperImplementationCoordinatorRunRequest } from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-coordinator-contracts';

import { AppError } from '../errors/app-error.js';
import {
  resolvePaperImplementationScientificContinuationStage,
  type PaperImplementationScientificContinuationOwnerState,
} from './paper-implementation-scientific-continuation-stage-resolver.js';

export interface PaperImplementationScientificContinuationStateReader {
  read(
    implementationProjectId: string,
  ): Promise<PaperImplementationScientificContinuationOwnerState>;
}

export interface PaperImplementationScientificContinuationCoordinator {
  advance(
    implementationProjectId: string,
    coordinatorRunId: string,
    request?: AdvancePaperImplementationCoordinatorRunRequest,
  ): Promise<unknown>;
}

export interface PaperImplementationScientificContinuationServiceOptions {
  ownerStateReader: PaperImplementationScientificContinuationStateReader;
  coordinator: PaperImplementationScientificContinuationCoordinator;
}

function uniqueEffects(
  effects: PaperImplementationScientificContinuationEffect[],
): PaperImplementationScientificContinuationEffect[] {
  return [...new Set(effects)];
}

/**
 * Owner-root continuation command for the agreed thin v1 boundary. It may
 * resume one already-persisted coordinator lane, then always rereads domain
 * owners. It never creates a coordinator run, provider Attempt or scientific
 * authority and persists no continuation state of its own.
 */
export class PaperImplementationScientificContinuationService {
  constructor(
    private readonly options: PaperImplementationScientificContinuationServiceOptions,
  ) {}

  async continue(
    request: CreatePaperImplementationScientificContinuationRequest,
  ): Promise<PaperImplementationScientificContinuationResponse> {
    const implementationProjectId = request.implementation_project_id?.trim();
    if (!implementationProjectId) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'implementation_project_id is required.',
      );
    }

    const initialState = await this.options.ownerStateReader.read(implementationProjectId);
    const initial = resolvePaperImplementationScientificContinuationStage(initialState);
    const action = initial.automatic_action;
    if (!action) return initial.response;

    await this.options.coordinator.advance(
      implementationProjectId,
      action.coordinator_run_id,
      {},
    );

    const resumedState = await this.options.ownerStateReader.read(implementationProjectId);
    const resumed = resolvePaperImplementationScientificContinuationStage(resumedState).response;
    return {
      ...resumed,
      effects: {
        performed: uniqueEffects([...resumed.effects.performed, 'coordinator_run']),
        reused: resumed.effects.reused,
        llm_lane_id: action.lane_id,
      },
    };
  }
}
