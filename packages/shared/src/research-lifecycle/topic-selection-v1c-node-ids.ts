export const TOPIC_SELECTION_V1C_NODE_ID = {
  n1_create_promotion_input_snapshot: 'topic-selection.v1c.create-promotion-input-snapshot.v1',
  n2_generate_promotion_support: 'topic-selection.v1c.generate-promotion-support.v1',
  n3_run_promotion_gate: 'topic-selection.v1c.run-promotion-gate.v1',
  n4_record_human_promotion_decision: 'topic-selection.v1c.record-human-promotion-decision.v1',
  n5_create_paper_project_bridge: 'topic-selection.v1c.create-paper-project-bridge.v1',
  n6_downstream_feedback_recheck: 'topic-selection.v1c.downstream-feedback-recheck.v1',
} as const;

export const TOPIC_SELECTION_V1C_NODE_IDS = [
  TOPIC_SELECTION_V1C_NODE_ID.n1_create_promotion_input_snapshot,
  TOPIC_SELECTION_V1C_NODE_ID.n2_generate_promotion_support,
  TOPIC_SELECTION_V1C_NODE_ID.n3_run_promotion_gate,
  TOPIC_SELECTION_V1C_NODE_ID.n4_record_human_promotion_decision,
  TOPIC_SELECTION_V1C_NODE_ID.n5_create_paper_project_bridge,
  TOPIC_SELECTION_V1C_NODE_ID.n6_downstream_feedback_recheck,
] as const;
export type TopicSelectionV1cNodeId = (typeof TOPIC_SELECTION_V1C_NODE_IDS)[number];

export const TOPIC_SELECTION_DOWNSTREAM_NODE_ID = {
  paper_project_intake: 'topic-selection.downstream.paper-project-intake.v1',
} as const;

export const TOPIC_SELECTION_DOWNSTREAM_NODE_IDS = [
  TOPIC_SELECTION_DOWNSTREAM_NODE_ID.paper_project_intake,
] as const;
export type TopicSelectionDownstreamNodeId = (typeof TOPIC_SELECTION_DOWNSTREAM_NODE_IDS)[number];
