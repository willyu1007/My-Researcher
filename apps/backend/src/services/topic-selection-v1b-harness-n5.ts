/**
 * W-12 / D-T127-01: v1b harness N5 (select-research-slice) pure helpers, relocated VERBATIM from
 * the harness. `this`-free option-set lineage/selection guards + decision-record leaf builders
 * (rejected reasons, value-assessment inputs, loopback/status defaults, created-by resolution).
 * The N5 builders that touch N5LoadedOptionSet/PreparedAdmittedControlPlane/idFactory/now stay.
 */
import type {
  TopicSelectionV1bAcceptedSliceSelectionPayload,
  TopicSelectionV1bN5HarnessFrozenInputPayload,
  TopicSelectionV1bWorkflowHarnessRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import type {
  TopicSelectionRejectedSliceOptionReason,
  TopicSelectionResearchSliceOptionRecord,
  TopicSelectionResearchSliceOptionSetRecord,
  TopicSelectionSliceLoopbackTarget,
  TopicSelectionSliceSelectionDecision,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
import type { TopicSelectionActorType } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { isHash } from './topic-selection-v1b-harness-pure-utils.js';
import { uniqueStrings } from './topic-selection-v1b-harness-dedup-utils.js';

export function n5CodexDelegationBlocker(
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  payload: TopicSelectionV1bN5HarnessFrozenInputPayload,
  acceptedPayloadHash: string,
): { code: string; message: string } | null {
  if (payload.authority_input_provider !== 'codex_delegated') {
    return null;
  }
  if (payload.delegation_artifact_hash !== acceptedPayloadHash) {
    return {
      code: 'N5_CODEX_DELEGATION_ARTIFACT_MISMATCH',
      message: 'N5 codex_delegated payload must bind delegation_artifact_hash to accepted selection payload hash.',
    };
  }
  const artifact = (input.semantic_artifacts ?? []).find((item) =>
    item.slot_id === 'n5_slice_selection_review'
    && item.allowed_effect === 'delegated_payload_candidate'
  );
  if (!artifact) {
    return {
      code: 'N5_CODEX_DELEGATION_ARTIFACT_REQUIRED',
      message: 'N5 codex_delegated payload requires matching frozen semantic support artifact provenance.',
    };
  }
  if (
    artifact.normalized_output_hash !== payload.delegation_artifact_hash
    && artifact.structured_output_hash !== payload.delegation_artifact_hash
  ) {
    return {
      code: 'N5_CODEX_DELEGATION_ARTIFACT_MISMATCH',
      message: 'N5 Codex semantic artifact hash does not match the accepted authority payload hash.',
    };
  }
  return null;
}

export function n5OptionSetLineageHashes(
  optionSet: TopicSelectionResearchSliceOptionSetRecord,
): { ok: true; value: { constraintProfileHash: string; readinessHash: string } } | { ok: false; code: string; message: string } {
  const constraintProfileHash = optionSet.comparison_payload.constraint_profile_hash;
  const readinessHash = optionSet.comparison_payload.intake_readiness_hash;
  if (!isHash(constraintProfileHash) || !isHash(readinessHash)) {
    return {
      ok: false,
      code: 'N5_OPTION_SET_LINEAGE_HASH_MISSING',
      message: 'N5 requires N4 option set lineage hashes for constraint profile and readiness authorities.',
    };
  }
  return {
    ok: true,
    value: {
      constraintProfileHash,
      readinessHash,
    },
  };
}

export function n5SelectedOption(
  accepted: TopicSelectionV1bAcceptedSliceSelectionPayload,
  options: TopicSelectionResearchSliceOptionRecord[],
): TopicSelectionResearchSliceOptionRecord | null {
  if (!accepted.selected_option_ref) {
    return null;
  }
  return options.find((option) =>
    option.research_slice_option_id === accepted.selected_option_ref?.ref_id
  ) ?? null;
}

export function n5NonSelectGateBlocker(
  accepted: TopicSelectionV1bAcceptedSliceSelectionPayload,
): { code: string; message: string } | null {
  if (accepted.selected_option_ref !== null || accepted.selected_option_hash !== null) {
    return {
      code: 'N5_NON_SELECT_SELECTED_OPTION_FORBIDDEN',
      message: 'N5 non-select decisions must not carry selected option refs or hashes.',
    };
  }
  if (accepted.decision === 'request_more_options' && (!accepted.loopback_target || !accepted.loopback_reason_code)) {
    return {
      code: 'N5_REQUEST_MORE_OPTIONS_LOOPBACK_REQUIRED',
      message: 'N5 request_more_options requires explicit loopback target and reason code.',
    };
  }
  return null;
}

export function defaultRejectedReasons(
  options: TopicSelectionResearchSliceOptionRecord[],
  selectedOption: TopicSelectionResearchSliceOptionRecord,
): TopicSelectionRejectedSliceOptionReason[] {
  return options
    .filter((option) => option.research_slice_option_id !== selectedOption.research_slice_option_id)
    .map((option) => ({
      option_id: option.research_slice_option_id,
      reason: option.status === 'blocked'
        ? 'Option carried hard blockers.'
        : 'Option was not selected in this decision.',
      reason_code: option.status === 'blocked' ? 'hard_blocker' : 'weaker_fit',
    }));
}

export function valueAssessmentInputs(option: TopicSelectionResearchSliceOptionRecord): string[] {
  return uniqueStrings([
    option.expected_claim,
    option.fallback_claim,
    option.evaluation_path,
    ...option.observable_success_criteria,
  ]);
}

export function humanReviewReason(option: TopicSelectionResearchSliceOptionRecord): string | null {
  if (!option.requires_human_review) {
    return null;
  }
  return uniqueStrings(option.human_review_triggers).join('; ') || 'ResearchSlice option requires human review.';
}

export function defaultN5Loopback(
  decision: Exclude<TopicSelectionSliceSelectionDecision, 'select'>,
): TopicSelectionSliceLoopbackTarget {
  if (decision === 'request_more_options') {
    return 'plan_research_slice_run';
  }
  if (decision === 'park') {
    return 'research_constraint_profile';
  }
  return 'validated_need';
}

export function n5OptionSetStatusForNonSelectDecision(
  decision: Exclude<TopicSelectionSliceSelectionDecision, 'select'>,
): TopicSelectionResearchSliceOptionSetRecord['status'] {
  if (decision === 'request_more_options') {
    return 'needs_more_options';
  }
  if (decision === 'park') {
    return 'parked';
  }
  return 'rejected';
}

export function n5CreatedBy(
  requested: TopicSelectionActorType | undefined,
  provider: TopicSelectionV1bN5HarnessFrozenInputPayload['authority_input_provider'],
): TopicSelectionActorType {
  if (requested) {
    return requested;
  }
  switch (provider) {
    case 'codex_delegated':
      return 'hybrid';
    case 'fixture':
      return 'system';
    case 'human_delegated':
      return 'human';
  }
}
