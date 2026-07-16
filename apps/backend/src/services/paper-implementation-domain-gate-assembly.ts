/**
 * T-124 G4.6: deterministic Domain Gate request assembly for the three back-half
 * runtime slots (result_analysis / claim_boundary_review / dossier_readiness_prep).
 *
 * Architecture: the runtime LLM proposes SEMANTIC content only (typed blocks on
 * the role output); this module assembles the Create*Request envelope with pure,
 * replayable functions. Structural fields (packet/cycle/claim/dossier ids,
 * trace manifest id, gate result id, human confirmation ref, source ref bundles)
 * come exclusively from the request context — the target ref and the declared,
 * hashed source refs — because they were never the LLM's to transcribe (the
 * run 009/010/011 envelope-echo signature). Semantic fields are mapped verbatim
 * from the role output; a missing semantic block means "cannot assemble", never
 * "the service writes content on the model's behalf".
 *
 * The Domain Gate's own validation (schema + existence + authority) is untouched
 * — defence in depth. The runtime services re-run the exact Create*Request ajv
 * schema on the assembled result (the retained G4.5 pre-check).
 */

import type {
  PaperImplementationClaimCandidateProposal,
  PaperImplementationDossierReadinessProposal,
  PaperImplementationResultAnalysisClaimImplications,
  PaperImplementationResultAnalysisInterpretationSummary,
  PaperImplementationResultAnalysisReliabilityAssessment,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  CreateClaimCandidateRequest,
  CreateImplementationDossierRequest,
  CreateResultInterpretationPacketRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import type {
  TopicSelectionActorType,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { normalizedPaperImplementationRefType } from './paper-implementation-runtime-utils.js';
import {
  CLAIM_SUPPORT_EVIDENCE_REF_TYPES,
} from './paper-implementation-result-claim-dossier-service.js';

/** Structural request context of the result-analysis slot (from target/source refs). */
export interface PaperImplementationResultAnalysisDomainGateContext {
  result_interpretation_packet_id: string;
  validation_cycle_id: string;
  experiment_plan_light_id: string | null;
  trace_manifest_id: string;
  run_evidence_refs: TopicSelectionFunctionalRef[];
  validation_report_refs: TopicSelectionFunctionalRef[];
  metric_refs: TopicSelectionFunctionalRef[];
}

/** Structural request context of the claim-boundary debate slot. */
export interface PaperImplementationClaimBoundaryDomainGateContext {
  claim_candidate_id: string;
  result_interpretation_packet_ids: string[];
  trace_manifest_id: string;
  claim_trace_packet_id: string | null;
  human_confirmation_ref: TopicSelectionFunctionalRef | null;
  /**
   * T-124 G4.6 run-012 fix: the declared run-evidence refs (REU level) — the
   * structural evidence floor for the claim's support position when the
   * adjudicator's semantic selection carries no admissible evidence-class ref
   * (e.g. it cited the interpretation packet, which the Domain Gate correctly
   * rejects as evidence).
   */
  run_evidence_refs: TopicSelectionFunctionalRef[];
}

/** Structural request context of the dossier-readiness audit slot. */
export interface PaperImplementationDossierReadinessDomainGateContext {
  dossier_id: string;
  result_interpretation_packet_ids: string[];
  claim_candidate_ids: string[];
  claim_trace_packet_ids: string[];
  trace_manifest_id: string;
  readiness_gate_result_id: string | null;
}

export type PaperImplementationDomainGateContextResult<TContext> =
  | { ok: true; context: TContext }
  | { ok: false; issues: string[] };

function refsOfType(
  sourceRefs: TopicSelectionFunctionalRef[],
  refType: string,
): TopicSelectionFunctionalRef[] {
  const normalized = normalizedPaperImplementationRefType(refType);
  return sourceRefs.filter(
    (ref) => normalizedPaperImplementationRefType(ref.ref_type) === normalized,
  );
}

function singleRefOfType(
  sourceRefs: TopicSelectionFunctionalRef[],
  refType: string,
  issues: string[],
): TopicSelectionFunctionalRef | null {
  const matches = refsOfType(sourceRefs, refType);
  if (matches.length === 0) {
    issues.push(`source_refs must contain exactly one ${refType} ref (found 0).`);
    return null;
  }
  if (matches.length > 1) {
    issues.push(`source_refs must contain exactly one ${refType} ref (found ${matches.length}).`);
    return null;
  }
  return matches[0]!;
}

function optionalRefOfType(
  sourceRefs: TopicSelectionFunctionalRef[],
  refType: string,
  issues: string[],
): TopicSelectionFunctionalRef | null {
  const matches = refsOfType(sourceRefs, refType);
  if (matches.length > 1) {
    issues.push(`source_refs may contain at most one ${refType} ref (found ${matches.length}).`);
    return null;
  }
  return matches[0] ?? null;
}

/** Deep-copy a functional ref down to its canonical four identity fields. */
function cloneRef(ref: TopicSelectionFunctionalRef): TopicSelectionFunctionalRef {
  return {
    ref_type: ref.ref_type,
    ref_id: ref.ref_id,
    title_card_id: ref.title_card_id ?? null,
    version_id: ref.version_id ?? null,
  };
}

function cloneRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
  return refs.map(cloneRef);
}

/**
 * Extract the result-analysis structural context. Statically decidable from the
 * request face alone (no role output involved), so the runtime service asserts
 * it BEFORE any provider call: a caller that cannot ever materialize is a 400,
 * never a provider spend.
 */
export function extractResultAnalysisDomainGateContext(
  targetRef: TopicSelectionFunctionalRef,
  sourceRefs: TopicSelectionFunctionalRef[],
): PaperImplementationDomainGateContextResult<PaperImplementationResultAnalysisDomainGateContext> {
  const issues: string[] = [];
  if (normalizedPaperImplementationRefType(targetRef.ref_type) !== 'validationcycle') {
    issues.push(`target_ref.ref_type must be validation_cycle (got ${targetRef.ref_type}).`);
  }
  const packetRef = singleRefOfType(sourceRefs, 'result_interpretation_packet', issues);
  const traceRef = singleRefOfType(sourceRefs, 'trace_manifest', issues);
  const planRef = optionalRefOfType(sourceRefs, 'experiment_plan_light', issues);
  const runEvidenceRefs = refsOfType(sourceRefs, 'run_evidence_unit');
  if (runEvidenceRefs.length === 0) {
    issues.push('source_refs must contain at least one run_evidence_unit ref.');
  }
  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return {
    ok: true,
    context: {
      result_interpretation_packet_id: packetRef!.ref_id,
      validation_cycle_id: targetRef.ref_id,
      experiment_plan_light_id: planRef?.ref_id ?? null,
      trace_manifest_id: traceRef!.ref_id,
      run_evidence_refs: cloneRefs(runEvidenceRefs),
      validation_report_refs: cloneRefs(refsOfType(sourceRefs, 'result_validation_report')),
      metric_refs: cloneRefs(refsOfType(sourceRefs, 'metric')),
    },
  };
}

/** Extract the claim-boundary structural context (statically decidable). */
export function extractClaimBoundaryDomainGateContext(
  sourceRefs: TopicSelectionFunctionalRef[],
): PaperImplementationDomainGateContextResult<PaperImplementationClaimBoundaryDomainGateContext> {
  const issues: string[] = [];
  const claimRef = singleRefOfType(sourceRefs, 'claim_candidate', issues);
  const traceRef = singleRefOfType(sourceRefs, 'trace_manifest', issues);
  const claimTraceRef = optionalRefOfType(sourceRefs, 'claim_trace_packet', issues);
  const confirmationRef = optionalRefOfType(sourceRefs, 'human_confirmation_record', issues);
  const packetRefs = refsOfType(sourceRefs, 'result_interpretation_packet');
  if (packetRefs.length === 0) {
    issues.push('source_refs must contain at least one result_interpretation_packet ref.');
  }
  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return {
    ok: true,
    context: {
      claim_candidate_id: claimRef!.ref_id,
      result_interpretation_packet_ids: packetRefs.map((ref) => ref.ref_id),
      trace_manifest_id: traceRef!.ref_id,
      claim_trace_packet_id: claimTraceRef?.ref_id ?? null,
      human_confirmation_ref: confirmationRef ? cloneRef(confirmationRef) : null,
      run_evidence_refs: cloneRefs(refsOfType(sourceRefs, 'run_evidence_unit')),
    },
  };
}

/**
 * T-124 G4.6 run-012 fix: the claim's support position accepts only
 * evidence-class refs (the Domain Gate's own `CLAIM_SUPPORT_EVIDENCE_REF_TYPES`
 * discipline, mirrored from the single exported source). Memo / summary /
 * interpretation refs — including the result_interpretation_packet, whose
 * linkage already rides the structural `result_interpretation_packet_ids` — are
 * dropped from the evidence position. If the adjudicator's selection carries no
 * admissible evidence ref at all, the assembly falls back to the DECLARED
 * run-evidence refs of the request context (deterministic linkage to verified
 * REU-level evidence, never invented content); an empty result then fails the
 * ajv pre-check (support_refs minItems 1) through the retry channel.
 */
function claimSupportEvidenceRefs(
  proposalSupportRefs: TopicSelectionFunctionalRef[],
  contextRunEvidenceRefs: TopicSelectionFunctionalRef[],
): TopicSelectionFunctionalRef[] {
  const evidenceClassRefs = proposalSupportRefs.filter((ref) =>
    CLAIM_SUPPORT_EVIDENCE_REF_TYPES.has(normalizedPaperImplementationRefType(ref.ref_type)));
  if (evidenceClassRefs.length > 0) {
    return cloneRefs(evidenceClassRefs);
  }
  return cloneRefs(contextRunEvidenceRefs);
}

/** Extract the dossier-readiness structural context (statically decidable). */
export function extractDossierReadinessDomainGateContext(
  targetRef: TopicSelectionFunctionalRef,
  sourceRefs: TopicSelectionFunctionalRef[],
): PaperImplementationDomainGateContextResult<PaperImplementationDossierReadinessDomainGateContext> {
  const issues: string[] = [];
  if (normalizedPaperImplementationRefType(targetRef.ref_type) !== 'implementationdossier') {
    issues.push(`target_ref.ref_type must be implementation_dossier (got ${targetRef.ref_type}).`);
  }
  const traceRef = singleRefOfType(sourceRefs, 'trace_manifest', issues);
  const gateRef = optionalRefOfType(sourceRefs, 'gate_result', issues);
  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return {
    ok: true,
    context: {
      dossier_id: targetRef.ref_id,
      result_interpretation_packet_ids: refsOfType(sourceRefs, 'result_interpretation_packet').map((ref) => ref.ref_id),
      claim_candidate_ids: refsOfType(sourceRefs, 'claim_candidate').map((ref) => ref.ref_id),
      claim_trace_packet_ids: refsOfType(sourceRefs, 'claim_trace_packet').map((ref) => ref.ref_id),
      trace_manifest_id: traceRef!.ref_id,
      readiness_gate_result_id: gateRef?.ref_id ?? null,
    },
  };
}

/**
 * Assemble the CreateResultInterpretationPacketRequest: structural envelope from
 * the extracted context, semantic fields verbatim from the role's typed blocks.
 * Pure and replayable — same inputs, same request.
 */
export function assembleCreateResultInterpretationPacketRequest(input: {
  context: PaperImplementationResultAnalysisDomainGateContext;
  interpretation: PaperImplementationResultAnalysisInterpretationSummary;
  reliability: PaperImplementationResultAnalysisReliabilityAssessment;
  claimImplications: PaperImplementationResultAnalysisClaimImplications;
  createdBy: TopicSelectionActorType;
}): CreateResultInterpretationPacketRequest {
  const { context, interpretation, reliability, claimImplications } = input;
  return {
    result_interpretation_packet_id: context.result_interpretation_packet_id,
    validation_cycle_id: context.validation_cycle_id,
    experiment_plan_light_id: context.experiment_plan_light_id,
    source: {
      run_evidence_refs: cloneRefs(context.run_evidence_refs),
      validation_report_refs: cloneRefs(context.validation_report_refs),
      metric_refs: cloneRefs(context.metric_refs),
      // Semantic accounting: which runs failed / are inconclusive / are stale is
      // the role's interpretive duty — mapped verbatim, never invented here.
      failed_run_refs: cloneRefs(interpretation.failed_run_refs),
      inconclusive_run_refs: cloneRefs(interpretation.inconclusive_run_refs),
      stale_or_invalidated_evidence_refs: cloneRefs(interpretation.stale_or_invalidated_evidence_refs),
    },
    result_summary: {
      result_summary: interpretation.result_summary,
      supports_assertion_refs: cloneRefs(interpretation.supports_assertion_refs),
      challenges_assertion_refs: cloneRefs(interpretation.challenges_assertion_refs),
      unexpected_findings: [...interpretation.unexpected_findings],
      failed_runs_accounted_for: interpretation.failed_runs_accounted_for,
      inconclusive_runs_accounted_for: interpretation.inconclusive_runs_accounted_for,
      exploratory_confirmatory_separated: interpretation.exploratory_confirmatory_separated,
    },
    reliability: {
      failed_runs_retained: reliability.failed_runs_retained,
      confound_refs: cloneRefs(reliability.confound_refs),
      limitation_refs: cloneRefs(reliability.limitation_refs),
      reliability_notes: [...reliability.reliability_notes],
    },
    claim_implications: {
      allowed_claim_ceiling: claimImplications.allowed_claim_ceiling,
      forbidden_overclaims: [...claimImplications.forbidden_overclaims],
      recommended_claim_refs: cloneRefs(claimImplications.recommended_claim_refs),
      required_followup_refs: cloneRefs(claimImplications.required_followup_refs),
    },
    trace_manifest_id: context.trace_manifest_id,
    created_by: input.createdBy,
  };
}

/** Assemble the CreateClaimCandidateRequest (structural context + semantic proposal). */
export function assembleCreateClaimCandidateRequest(input: {
  context: PaperImplementationClaimBoundaryDomainGateContext;
  proposal: PaperImplementationClaimCandidateProposal;
  createdBy: TopicSelectionActorType;
}): CreateClaimCandidateRequest {
  const { context, proposal } = input;
  return {
    claim_candidate_id: context.claim_candidate_id,
    claim_type: proposal.claim_type,
    claim_statement: proposal.claim_statement,
    claim_strength: proposal.claim_strength,
    result_interpretation_packet_ids: [...context.result_interpretation_packet_ids],
    // Run-012 fix: evidence position holds evidence-class refs only (REU floor
    // fallback); the interpretation packet stays in its structural field above.
    support_refs: claimSupportEvidenceRefs(proposal.support_refs, context.run_evidence_refs),
    challenge_refs: cloneRefs(proposal.challenge_refs),
    scope: {
      population_scope: proposal.scope.population_scope,
      method_scope: proposal.scope.method_scope,
      dataset_scope: proposal.scope.dataset_scope,
      metric_scope: proposal.scope.metric_scope,
      negative_scope_notes: [...proposal.scope.negative_scope_notes],
      excluded_scope_notes: [...proposal.scope.excluded_scope_notes],
    },
    boundary: {
      rationale: proposal.boundary_rationale,
      forbidden_overclaims: [...proposal.forbidden_overclaims],
      hidden_counter_evidence_refs: cloneRefs(proposal.hidden_counter_evidence_refs),
      required_followup_refs: cloneRefs(proposal.required_followup_refs),
      human_confirmation_ref: context.human_confirmation_ref
        ? cloneRef(context.human_confirmation_ref)
        : null,
    },
    trace_manifest_id: context.trace_manifest_id,
    claim_trace_packet_id: context.claim_trace_packet_id,
    created_by: input.createdBy,
  };
}

/** Assemble the CreateImplementationDossierRequest (structural context + semantic proposal). */
export function assembleCreateImplementationDossierRequest(input: {
  context: PaperImplementationDossierReadinessDomainGateContext;
  proposal: PaperImplementationDossierReadinessProposal;
  createdBy: TopicSelectionActorType;
}): CreateImplementationDossierRequest {
  const { context, proposal } = input;
  return {
    dossier_id: context.dossier_id,
    dossier_status: proposal.dossier_status,
    result_interpretation_packet_ids: [...context.result_interpretation_packet_ids],
    claim_candidate_ids: [...context.claim_candidate_ids],
    claim_trace_packet_ids: [...context.claim_trace_packet_ids],
    experiment_section: {
      failed_run_refs: cloneRefs(proposal.failed_run_refs),
      inconclusive_run_refs: cloneRefs(proposal.inconclusive_run_refs),
      negative_result_refs: cloneRefs(proposal.negative_result_refs),
      excluded_stale_or_invalidated_evidence_refs: cloneRefs(proposal.excluded_stale_or_invalidated_evidence_refs),
      experiment_limitations: [...proposal.experiment_limitations],
    },
    claim_section: {
      admitted_claim_refs: cloneRefs(proposal.admitted_claim_refs),
      rejected_claim_refs: cloneRefs(proposal.rejected_claim_refs),
      forbidden_overclaims: [...proposal.forbidden_overclaims],
      claim_ceiling: proposal.claim_ceiling,
    },
    readiness: {
      readiness_gate_result_id: context.readiness_gate_result_id,
      blocker_refs: cloneRefs(proposal.readiness_blocker_refs),
      warning_refs: cloneRefs(proposal.readiness_warning_refs),
      readiness_notes: [...proposal.readiness_notes],
    },
    trace_manifest_id: context.trace_manifest_id,
    created_by: input.createdBy,
  };
}
