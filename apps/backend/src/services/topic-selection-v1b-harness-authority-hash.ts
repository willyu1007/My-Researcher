/**
 * T-115 Phase 1 — canonical authority / frozen-input hashing for v1b harness
 * `human_delegated` invocations.
 *
 * Single source of truth (decision D1) for the hashes that a human-driven N5
 * `select-research-slice` invocation must supply so the harness N5 handler's
 * re-derivation checks pass:
 *   - selected_option_hash            = hashResearchSliceOptionAuthority(option)
 *   - accepted_selection_payload_hash = canonicalHash(acceptedPayload)
 *   - frozen_input_hash               = hashV1bFrozenInput(frozenInput)
 *
 * `stableStringify` sorts object keys, so the resulting hash is
 * field-order-independent; only the key set + values (and nested ref shape) must
 * match.
 *
 * D1 consolidation COMPLETE: `TopicSelectionV1bWorkflowHarnessService` imports all
 * three helpers and its private `hash()` delegates to `canonicalHash`, so the
 * harness and the N2/N5 human-path services share one hashing source — no dual track.
 */
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type { TopicSelectionResearchSliceOptionRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
import type { TopicSelectionV1bWorkflowHarnessRunRequest } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import type {
  TopicSelectionTopicValueAssessmentRecord,
  TopicSelectionValueReasoningMemoRecord,
  TopicSelectionValueDispositionDecisionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';
import type {
  TopicSelectionTopicPackageRecord,
  TopicSelectionV1bToV1cInputBundleRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-package-contracts';

/** `sha256(stableStringify(value))` — matches the harness service's private `hash()`. */
export function canonicalHash(value: unknown): string {
  return sha256Text(stableStringify(value));
}

/** Functional ref for a research slice option, matching the harness `optionRef`/`ref`. */
export function researchSliceOptionRef(
  option: Pick<TopicSelectionResearchSliceOptionRecord, 'research_slice_option_id' | 'title_card_id'>,
): TopicSelectionFunctionalRef {
  return {
    ref_type: 'research_slice_option',
    ref_id: option.research_slice_option_id,
    version_id: null,
    title_card_id: option.title_card_id,
  };
}

/**
 * Authority hash of a research slice option. MUST equal the harness service's
 * `hashResearchSliceOptionAuthority` so the N5 `selected_option_hash`
 * re-derivation check passes.
 */
export function hashResearchSliceOptionAuthority(
  option: TopicSelectionResearchSliceOptionRecord,
): string {
  return canonicalHash({
    claim_ceiling_alignment: option.claim_ceiling_alignment,
    dependency_risks: option.dependency_risks,
    evaluation_path: option.evaluation_path,
    excluded_boundaries: option.excluded_boundaries,
    expected_claim: option.expected_claim,
    fallback_claim: option.fallback_claim,
    hard_blockers: option.hard_blockers,
    included_boundaries: option.included_boundaries,
    main_risks: option.main_risks,
    option_key: option.option_key,
    option_ref: researchSliceOptionRef(option),
    option_set_id: option.research_slice_option_set_id,
    problem_space: option.problem_space,
    risk_levels: {
      baseline: option.baseline_risk,
      execution: option.execution_risk,
      scope: option.scope_risk,
    },
    slice_statement: option.slice_statement,
    source_validated_need_refs: option.source_validated_need_refs,
    status: option.status,
    target_community: option.target_community,
    target_setting: option.target_setting,
  });
}

/**
 * Frozen-input envelope hash. Matches the harness run-request `frozen_input_hash`
 * (hashes the envelope minus the `frozen_input_hash` field itself). The harness
 * recomputes this when omitted, but supplying it keeps the request explicit.
 */
export function hashV1bFrozenInput(
  frozenInput: Pick<
    TopicSelectionV1bWorkflowHarnessRunRequest['frozen_input'],
    'input_contract' | 'payload' | 'snapshot_kind' | 'source_refs'
  >,
): string {
  return canonicalHash({
    input_contract: frozenInput.input_contract,
    payload: frozenInput.payload,
    snapshot_kind: frozenInput.snapshot_kind,
    source_refs: frozenInput.source_refs,
  });
}

// ---------------------------------------------------------------------------
// W-12 / D-T127-01: N8/N9/N10 authority-hash cluster, relocated VERBATIM from the
// harness (this.hash -> canonicalHash, the same single source). Byte-identical;
// the v1b full suite + replay-identity guards backstop these N8+ hashes.
// ---------------------------------------------------------------------------

export function hashN8ValueAssessmentAuthority(assessment: TopicSelectionTopicValueAssessmentRecord): string {
  return canonicalHash({
    accepted_risk_refs: assessment.accepted_risk_refs,
    blocker_refs: assessment.blocker_refs,
    confidence: assessment.confidence,
    dimension_scores: assessment.dimension_scores,
    freshness_status: assessment.freshness_status,
    hard_gates: assessment.hard_gates,
    readiness_status: assessment.readiness_status,
    source_research_slice_id: assessment.source_research_slice_id,
    source_research_slice_version: assessment.source_research_slice_version,
    strongest_claim_if_success: assessment.strongest_claim_if_success,
    topic_question_contract_id: assessment.topic_question_contract_id,
    topic_value_assessment_id: assessment.topic_value_assessment_id,
    total_score: assessment.total_score,
    value_reasoning_memo_id: assessment.value_reasoning_memo_id,
    value_summary: assessment.value_summary,
  });
}

export function hashN8ValueReasoningMemoAuthority(memo: TopicSelectionValueReasoningMemoRecord): string {
  return canonicalHash({
    cited_refs: memo.cited_refs,
    recommendation: memo.recommendation,
    requires_critic_review: memo.requires_critic_review,
    topic_question_contract_id: memo.topic_question_contract_id,
    topic_value_assessment_id: memo.topic_value_assessment_id,
    value_reasoning_memo_id: memo.value_reasoning_memo_id,
    value_thesis: memo.value_thesis,
  });
}

export function hashN9DispositionAuthority(decision: TopicSelectionValueDispositionDecisionRecord): string {
  return canonicalHash({
    accepted_risk_refs: decision.accepted_risk_refs,
    blocker_refs: decision.blocker_refs,
    decision: decision.decision,
    is_current: decision.is_current,
    package_draft_input_hash: decision.package_draft_input ? canonicalHash(decision.package_draft_input) : null,
    status: decision.status,
    topic_question_contract_id: decision.topic_question_contract_id,
    topic_value_assessment_id: decision.topic_value_assessment_id,
    value_disposition_decision_id: decision.value_disposition_decision_id,
    value_reasoning_memo_id: decision.value_reasoning_memo_id,
  });
}

export function hashN10PackageAuthority(pkg: TopicSelectionTopicPackageRecord): string {
  return canonicalHash({
    package_payload: pkg.package_payload,
    package_readiness_status: pkg.package_readiness_status,
    package_version: pkg.package_version,
    research_slice_id: pkg.research_slice_id,
    selected_evidence_refs: pkg.selected_evidence_refs,
    title_candidates: pkg.title_candidates,
    topic_package_id: pkg.topic_package_id,
    topic_question_contract_id: pkg.topic_question_contract_id,
    topic_value_assessment_id: pkg.topic_value_assessment_id,
    value_disposition_decision_id: pkg.value_disposition_decision_id,
    v1c_input_bundle_id: pkg.v1c_input_bundle_id,
  });
}

export function hashN10V1cInputBundleAuthority(bundle: TopicSelectionV1bToV1cInputBundleRecord): string {
  return canonicalHash({
    bundle_hash: bundle.bundle_hash,
    bundle_status: bundle.bundle_status,
    package_readiness_status: bundle.package_readiness_status,
    package_version: bundle.package_version,
    topic_package_id: bundle.topic_package_id,
    v1b_to_v1c_input_bundle_id: bundle.v1b_to_v1c_input_bundle_id,
  });
}
