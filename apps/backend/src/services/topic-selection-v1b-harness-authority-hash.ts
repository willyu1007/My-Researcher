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
