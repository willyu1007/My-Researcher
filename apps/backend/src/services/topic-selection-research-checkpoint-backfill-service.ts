import {
  TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS,
  type TopicSelectionResearchCheckpointKind,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-checkpoint-contracts';
import type { TopicSelectionResearchCheckpointBackfillSourceRepository } from '../repositories/topic-selection-research-checkpoint-backfill-source.repository.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import { TopicSelectionResearchCheckpointService } from './topic-selection-research-checkpoint-service.js';

export type TopicSelectionResearchCheckpointBackfillReport = {
  contract_version: 'v1';
  mode: 'preview' | 'apply';
  anchors_seen: number;
  title_cards_seen: number;
  returned_by_kind: Record<TopicSelectionResearchCheckpointKind, number>;
  checkpoints_returned: number;
};

export class TopicSelectionResearchCheckpointBackfillService {
  constructor(
    private readonly source: TopicSelectionResearchCheckpointBackfillSourceRepository,
    private readonly checkpoints: TopicSelectionResearchCheckpointService,
  ) {}

  async backfill(): Promise<TopicSelectionResearchCheckpointBackfillReport> {
    const anchors = await this.source.listBackfillAnchors();
    const report = this.report('apply', anchors);
    for (const anchor of anchors) {
      await this.checkpoints.materializeCheckpoint({
        workspace_id: anchor.workspace_id ?? null,
        title_card_id: anchor.title_card_id,
        checkpoint_kind: anchor.checkpoint_kind,
        provenance_class: 'backfilled',
        policy_version_id: 'topic-selection-research-checkpoint@v1',
        target_ref: anchor.target_ref,
        target_snapshot_hash: anchor.target_snapshot_hash
          ?? sha256Text(stableStringify(anchor.target_snapshot_payload)),
        source_refs: anchor.source_refs,
        allowed_actions: anchor.allowed_actions,
        packet_payload: anchor.packet_payload,
      });
    }
    return report;
  }

  async preview(): Promise<TopicSelectionResearchCheckpointBackfillReport> {
    return this.report('preview', await this.source.listBackfillAnchors());
  }

  private report(
    mode: TopicSelectionResearchCheckpointBackfillReport['mode'],
    anchors: Awaited<ReturnType<TopicSelectionResearchCheckpointBackfillSourceRepository['listBackfillAnchors']>>,
  ): TopicSelectionResearchCheckpointBackfillReport {
    const returnedByKind = Object.fromEntries(
      TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS.map((kind) => [
        kind,
        anchors.filter((anchor) => anchor.checkpoint_kind === kind).length,
      ]),
    ) as Record<TopicSelectionResearchCheckpointKind, number>;
    return {
      contract_version: 'v1',
      mode,
      anchors_seen: anchors.length,
      title_cards_seen: new Set(anchors.map((anchor) => anchor.title_card_id)).size,
      returned_by_kind: returnedByKind,
      checkpoints_returned: mode === 'apply' ? anchors.length : 0,
    };
  }
}
