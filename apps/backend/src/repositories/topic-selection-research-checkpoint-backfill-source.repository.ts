import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionResearchCheckpointAction,
  TopicSelectionResearchCheckpointKind,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-checkpoint-contracts';

export type TopicSelectionResearchCheckpointBackfillAnchor = {
  workspace_id?: string | null;
  title_card_id: string;
  checkpoint_kind: TopicSelectionResearchCheckpointKind;
  target_ref: TopicSelectionFunctionalRef;
  target_snapshot_hash?: string | null;
  target_snapshot_payload: Record<string, unknown>;
  source_refs: TopicSelectionFunctionalRef[];
  allowed_actions: TopicSelectionResearchCheckpointAction[];
  packet_payload: Record<string, unknown>;
};

export interface TopicSelectionResearchCheckpointBackfillSourceRepository {
  listBackfillAnchors(): Promise<TopicSelectionResearchCheckpointBackfillAnchor[]>;
}
