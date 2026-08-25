import {
  TOPIC_SELECTION_RESEARCH_CHECKPOINT_CONTRACT_VERSION,
  type TopicSelectionResearchCheckpointPacket,
  type TopicSelectionResearchCheckpointRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-checkpoint-contracts';
import type {
  AssertCompleteResearchCheckpointChainInput,
  MaterializePromotionCheckpointInput,
  TopicSelectionResearchCheckpointService,
} from '../topic-selection-research-checkpoint-service.js';

type CheckpointControlFixture = Pick<
  TopicSelectionResearchCheckpointService,
  'adaptExistingStageDecision' | 'assertCompleteCheckpointChain' | 'getPacket' | 'materializePromotionCheckpoint'
>;

/** Isolated-service fixture representing a current, native, fully advancing checkpoint chain. */
export function createAdvancingTopicSelectionCheckpointControlFixture(): CheckpointControlFixture {
  let current: TopicSelectionResearchCheckpointRecord | null = null;

  const buildPromotionCheckpoint = (
    input: MaterializePromotionCheckpointInput,
  ): TopicSelectionResearchCheckpointRecord => ({
    research_checkpoint_id: 'research_checkpoint_promotion_fixture',
    checkpoint_key: `promotion:${input.title_card_id}:${input.promotion_input_snapshot_hash}`,
    current_checkpoint_key: `promotion:${input.title_card_id}`,
    workspace_id: input.workspace_id ?? null,
    title_card_id: input.title_card_id,
    checkpoint_kind: 'promotion',
    contract_version: TOPIC_SELECTION_RESEARCH_CHECKPOINT_CONTRACT_VERSION,
    provenance_class: 'native',
    policy_version_id: input.policy_version_id ?? 'topic-selection-promotion@v1',
    target_ref: input.promotion_input_snapshot_ref,
    target_snapshot_hash: input.promotion_input_snapshot_hash,
    packet_hash: input.promotion_input_snapshot_hash,
    input_snapshot_id: 'input_snapshot_promotion_fixture',
    source_refs: input.source_refs ?? [],
    allowed_actions: ['advance', 'loopback', 'reject', 'hold'],
    required_action_refs: [],
    decision_authority_ref: null,
    status: 'pending',
    supersedes_checkpoint_id: null,
    superseded_by_checkpoint_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    decided_at: null,
    superseded_at: null,
  });

  return {
    async materializePromotionCheckpoint(input) {
      current = buildPromotionCheckpoint(input);
      return current;
    },
    async getPacket(checkpointId): Promise<TopicSelectionResearchCheckpointPacket> {
      if (!current || current.research_checkpoint_id !== checkpointId) {
        throw new Error(`Unknown checkpoint fixture ${checkpointId}.`);
      }
      return {
        research_checkpoint_id: current.research_checkpoint_id,
        checkpoint_kind: current.checkpoint_kind,
        title_card_id: current.title_card_id,
        contract_version: current.contract_version,
        target_ref: current.target_ref,
        target_snapshot_hash: current.target_snapshot_hash,
        source_refs: current.source_refs,
        allowed_actions: current.allowed_actions,
        required_action_refs: current.required_action_refs,
        packet_payload: { policy_issue_codes: [] },
        open_objections: [],
        decision: null,
        packet_hash: current.packet_hash,
      };
    },
    async adaptExistingStageDecision(checkpointId, input) {
      if (!current || current.research_checkpoint_id !== checkpointId) {
        throw new Error(`Unknown checkpoint fixture ${checkpointId}.`);
      }
      current = {
        ...current,
        status: 'decided',
        decision_authority_ref: input.decision_authority_ref,
        decided_at: current.updated_at,
      };
      return current;
    },
    async assertCompleteCheckpointChain(_input: AssertCompleteResearchCheckpointChainInput) {
      return current ? [current] : [];
    },
  };
}
