import type {
  PaperImplementationClaimCandidateProposal,
  PaperImplementationClaimCandidateProposalScope,
  PaperImplementationDossierReadinessProposal,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';

/**
 * T-124 G5 FIX-A item 13: single-source builders for the P1 adjudicator's typed
 * semantic proposal blocks. Seven test files previously each carried a full
 * hand-written copy of the claim / dossier proposal shape; they now delegate to
 * these builders and pass only the fields that distinguish their scenario
 * (claim_statement, claim_strength, support_refs, boundary_rationale, …). Follows
 * the acceptance-bridge-test-fixtures convention: a plain `.ts` fixtures module
 * with option-shaped builders. The scope block is merged so a partial `scope`
 * override keeps the other scope defaults.
 */
export function buildClaimCandidateProposal(
  overrides: Partial<PaperImplementationClaimCandidateProposal> = {},
): PaperImplementationClaimCandidateProposal {
  const { scope: scopeOverride, ...rest } = overrides;
  const scope: PaperImplementationClaimCandidateProposalScope = {
    population_scope: 'Transformer language model under downstream adaptation.',
    method_scope: 'Parameter-efficient adaptation vs reproduced full fine-tuning.',
    dataset_scope: 'Committed benchmark subset.',
    metric_scope: 'Per-task primary metric, trainable parameter count, inference latency.',
    negative_scope_notes: [],
    excluded_scope_notes: [],
    ...(scopeOverride ?? {}),
  };
  return {
    claim_type: 'empirical_finding',
    claim_statement: 'Bounded parity claim within the probed scale and committed task set.',
    claim_strength: 'strong',
    support_refs: [],
    challenge_refs: [],
    scope,
    boundary_rationale: 'Parity claimed only within the probed scale and committed task set.',
    forbidden_overclaims: ['universal superiority over all methods on all tasks'],
    hidden_counter_evidence_refs: [],
    required_followup_refs: [],
    ...rest,
  };
}

export function buildDossierReadinessProposal(
  overrides: Partial<PaperImplementationDossierReadinessProposal> = {},
): PaperImplementationDossierReadinessProposal {
  return {
    dossier_status: 'ready_for_writing',
    experiment_limitations: ['Results at the probed scale on the committed tasks only.'],
    failed_run_refs: [],
    inconclusive_run_refs: [],
    negative_result_refs: [],
    excluded_stale_or_invalidated_evidence_refs: [],
    admitted_claim_refs: [],
    rejected_claim_refs: [],
    forbidden_overclaims: ['universal superiority over all methods on all tasks'],
    claim_ceiling: 'strong',
    readiness_blocker_refs: [],
    readiness_warning_refs: [],
    readiness_notes: ['Single confirmatory run set; nothing outstanding for N7.'],
    ...overrides,
  };
}
