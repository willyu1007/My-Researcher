/**
 * W-12 / D-T127-01: v1b harness functional-ref builders, relocated VERBATIM from the harness. Pure,
 * `this`-free helpers that construct/collect TopicSelectionFunctionalRef[] from authority records and
 * drafts (via the pure-utils `buildRef` + dedup-utils `uniqueRefs`). The N7/N8 support-ref builders
 * (n7SupportRefs/n7SupportHashes/n8KnownRefs) stay in the harness — they take runner-local context
 * types (N7SupportContext / N8LoadedContext).
 */
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type { TopicSelectionV1bWorkflowHarnessRunRequest } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import type {
  TopicSelectionV1bIntakeReadinessAssessmentRecord,
  TopicSelectionV1bIntakeSnapshotRecord,
  TopicSelectionResearchConstraintProfileRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-intake-contracts';
import type { TopicSelectionEvidenceRoleBundle } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionResearchSliceOptionDraft,
  TopicSelectionResearchSliceOptionRecord,
  TopicSelectionResearchSliceOptionSetRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
import type { TopicSelectionV1aToV1bInputBundleRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type { TopicSelectionTopicQuestionCandidateDraft } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-question-contracts';
import type { TopicSelectionAssessTopicValueLlmOutput } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';
import { buildRef } from './topic-selection-v1b-harness-pure-utils.js';
import { uniqueRefs } from './topic-selection-v1b-harness-dedup-utils.js';

export function snapshotRef(snapshot: TopicSelectionV1bIntakeSnapshotRecord): TopicSelectionFunctionalRef {
  return buildRef(
    'v1b_intake_snapshot',
    snapshot.v1b_intake_snapshot_id,
    snapshot.title_card_id,
    snapshot.snapshot_version,
  );
}

export function profileRef(profile: TopicSelectionResearchConstraintProfileRecord): TopicSelectionFunctionalRef {
  return buildRef(
    'research_constraint_profile',
    profile.research_constraint_profile_id,
    profile.title_card_id,
    profile.profile_version,
  );
}

export function readinessRef(readiness: TopicSelectionV1bIntakeReadinessAssessmentRecord): TopicSelectionFunctionalRef {
  return buildRef(
    'v1b_intake_readiness_assessment',
    readiness.v1b_intake_readiness_assessment_id,
    readiness.title_card_id,
  );
}

export function flattenEvidenceRoleBundle(
  roleBundle: TopicSelectionEvidenceRoleBundle,
): TopicSelectionFunctionalRef[] {
  return [
    ...roleBundle.support_unit_refs,
    ...roleBundle.challenge_unit_refs,
    ...roleBundle.baseline_unit_refs,
    ...roleBundle.context_unit_refs,
  ];
}

export function draftEvidenceRefs(draft: TopicSelectionResearchSliceOptionDraft): TopicSelectionFunctionalRef[] {
  return [
    ...draft.support_evidence_refs,
    ...draft.challenge_evidence_refs,
    ...draft.baseline_evidence_refs,
    ...draft.context_evidence_refs,
  ];
}

export function n5ArtifactRefs(input: TopicSelectionV1bWorkflowHarnessRunRequest): TopicSelectionFunctionalRef[] {
  return uniqueRefs((input.semantic_artifacts ?? []).flatMap((artifact) => [
    artifact.support_artifact_ref,
    artifact.normalized_output_ref,
    artifact.provenance_ref,
  ]));
}

export function optionSetRef(optionSet: TopicSelectionResearchSliceOptionSetRecord): TopicSelectionFunctionalRef {
  return buildRef('research_slice_option_set', optionSet.research_slice_option_set_id, optionSet.title_card_id);
}

export function optionRef(option: TopicSelectionResearchSliceOptionRecord): TopicSelectionFunctionalRef {
  return buildRef('research_slice_option', option.research_slice_option_id, option.title_card_id);
}

export function bundleRef(bundle: TopicSelectionV1aToV1bInputBundleRecord): TopicSelectionFunctionalRef {
  return buildRef('v1a_to_v1b_input_bundle', bundle.v1b_input_bundle_id, bundle.title_card_id, bundle.bundle_version);
}

export function v1aBundleSourceRefs(
  bundle: TopicSelectionV1aToV1bInputBundleRecord,
  bundleRef: TopicSelectionFunctionalRef,
): TopicSelectionFunctionalRef[] {
  return uniqueRefs([
    bundleRef,
    bundle.validated_need_ref,
    bundle.source_need_candidate_ref,
    bundle.adjudication_result_ref,
    bundle.support_packet_ref,
    bundle.human_decision_ref,
    bundle.evidence_map_ref,
    bundle.search_run_ref,
    bundle.search_plan_ref,
    bundle.literature_snapshot_ref,
    ...bundle.trace_refs,
    ...bundle.risk_refs,
    ...bundle.memory_suggestion_refs,
    ...bundle.recheck_request_refs,
  ]);
}

export function n6CandidateEvidenceRefs(candidate: TopicSelectionTopicQuestionCandidateDraft): TopicSelectionFunctionalRef[] {
  return [
    ...candidate.answerability_plan.required_evidence_refs,
    ...candidate.traceability_check.support_evidence_refs,
    ...candidate.traceability_check.challenge_evidence_refs,
    ...candidate.traceability_check.baseline_evidence_refs,
    ...candidate.traceability_check.context_evidence_refs,
    ...candidate.traceability_check.mapped_evidence_refs,
    ...candidate.falsification_conditions.flatMap((condition) => condition.trigger_evidence_refs),
  ];
}

export function n8DraftRefs(draft: TopicSelectionAssessTopicValueLlmOutput): TopicSelectionFunctionalRef[] {
  return uniqueRefs([
    ...draft.accepted_risk_refs,
    ...draft.blocker_refs,
    ...draft.hard_gates.flatMap((gate) => gate.refs),
    ...draft.dimension_scores.flatMap((score) => score.evidence_refs),
    ...draft.reasoning_memo.cited_refs,
  ]);
}
