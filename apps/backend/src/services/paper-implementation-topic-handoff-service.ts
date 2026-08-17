import {
  PAPER_IMPLEMENTATION_TOPIC_HANDOFF_RESUME_POLICY,
  PAPER_IMPLEMENTATION_TOPIC_HANDOFF_SCHEMA_VERSION,
  type BootstrapImplementationProjectRequest,
  type BootstrapImplementationProjectResponse,
  type CreatePaperImplementationTopicHandoffRequest,
  type PaperImplementationTopicHandoffResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  TopicSelectionPaperProjectBridgeHandoff,
  TopicSelectionPaperProjectBridgeIntakeInput,
  TopicSelectionPaperProjectBridgeIntakeResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-paper-project-bridge-contracts';

import { AppError } from '../errors/app-error.js';

export interface PaperImplementationTopicHandoffBridgeService {
  getPaperProjectBridgeHandoff(
    paperProjectBridgeId: string,
  ): Promise<TopicSelectionPaperProjectBridgeHandoff>;
  createPaperProjectIntakeFromBridge(
    input: TopicSelectionPaperProjectBridgeIntakeInput,
  ): Promise<TopicSelectionPaperProjectBridgeIntakeResult>;
}

export interface PaperImplementationTopicHandoffBootstrapService {
  bootstrapProject(
    request: BootstrapImplementationProjectRequest,
  ): Promise<BootstrapImplementationProjectResponse>;
}

export interface PaperImplementationTopicHandoffServiceOptions {
  bridgeService: PaperImplementationTopicHandoffBridgeService;
  bootstrapService: PaperImplementationTopicHandoffBootstrapService;
}

/**
 * Composes the two existing idempotent owner writers at the Topic-to-PI seam.
 * It creates no authority of its own and never asks the caller to carry hashes.
 */
export class PaperImplementationTopicHandoffService {
  constructor(private readonly options: PaperImplementationTopicHandoffServiceOptions) {}

  async continueFromTopic(
    request: CreatePaperImplementationTopicHandoffRequest,
  ): Promise<PaperImplementationTopicHandoffResponse> {
    const bridgeId = request.paper_project_bridge_id?.trim();
    if (!bridgeId) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'paper_project_bridge_id is required.');
    }

    const sourceHandoff = await this.options.bridgeService.getPaperProjectBridgeHandoff(bridgeId);
    const paperProjectIntake = await this.options.bridgeService.createPaperProjectIntakeFromBridge({
      paper_project_bridge_id: sourceHandoff.paper_project_bridge_id,
      bridge_payload_hash: sourceHandoff.bridge_payload_hash,
      workspace_id: sourceHandoff.bridge.workspace_id ?? null,
      created_by: 'hybrid',
    });
    const admittedHandoff = paperProjectIntake.handoff;
    const implementationBootstrap = await this.options.bootstrapService.bootstrapProject({
      paper_project_bridge_id: admittedHandoff.paper_project_bridge_id,
      bridge_payload_hash: admittedHandoff.bridge_payload_hash,
      workspace_id: admittedHandoff.bridge.workspace_id ?? null,
      created_by: 'hybrid',
    });

    const paperProjectCreated = paperProjectIntake.paper_project_created;
    const implementationProjectCreated = implementationBootstrap.project_created;
    return {
      schema_version: PAPER_IMPLEMENTATION_TOPIC_HANDOFF_SCHEMA_VERSION,
      status: paperProjectCreated || implementationProjectCreated ? 'created' : 'resumed',
      effects: {
        paper_project_created: paperProjectCreated,
        implementation_project_created: implementationProjectCreated,
      },
      semantic_context: structuredClone(admittedHandoff.working_copy_payload),
      lineage: {
        paper_project_bridge_ref: admittedHandoff.paper_project_bridge_ref,
        title_card_id: admittedHandoff.bridge.title_card_id,
        topic_package_id: admittedHandoff.topic_package_id,
        package_version: admittedHandoff.package_version,
        paper_project_intake_ref: paperProjectIntake.paper_project_intake_ref,
        paper_project_ref: paperProjectIntake.paper_project_ref,
        implementation_project_id:
          implementationBootstrap.implementation_project.implementation_project_id,
        implementation_intake_snapshot_id:
          implementationBootstrap.intake_snapshot.intake_snapshot_id,
      },
      resume_policy: PAPER_IMPLEMENTATION_TOPIC_HANDOFF_RESUME_POLICY,
    };
  }
}
