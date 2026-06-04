export const PAPER_IMPLEMENTATION_AGENT_WORKFLOW_TYPES = [
  'motive_decomposition',
  'evidence_board_curation',
  'validation_cycle_planning',
  'cross_board_synthesis',
  'route_architecture',
  'route_skeptic_review',
  'feasibility_planning',
  'experiment_design',
  'experiment_critique',
  'result_analysis',
  'claim_boundary_review',
  'motive_evolution',
  'trace_integrity_review',
  'dossier_readiness_prep',
] as const;
export type PaperImplementationAgentWorkflowType =
  (typeof PAPER_IMPLEMENTATION_AGENT_WORKFLOW_TYPES)[number];

export const PAPER_IMPLEMENTATION_AGENT_EXECUTION_MODES = [
  'mocked_llm',
  'codex_assisted',
  'provider_llm',
] as const;
export type PaperImplementationAgentExecutionMode =
  (typeof PAPER_IMPLEMENTATION_AGENT_EXECUTION_MODES)[number];

export const PAPER_IMPLEMENTATION_AGENT_RUN_MODES = [
  'mock',
  'dry_run',
  'product',
  'replay',
] as const;
export type PaperImplementationAgentRunMode =
  (typeof PAPER_IMPLEMENTATION_AGENT_RUN_MODES)[number];
