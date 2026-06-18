/**
 * W-12 / D-T127-01: v1b harness cross-node pure leaves, relocated VERBATIM from the harness.
 * `this`-free helpers spanning N1/N2 lineage + codex-delegation guards, the N10 draft-package
 * narrative/carry-forward/warning builders, the legacy value-verdict map, the registry
 * execution-mode guard, the early runtime-audit-drift factory, and the ref-mismatch issue pusher.
 */
import type {
  TopicSelectionV1bN1HarnessFrozenInputPayload,
  TopicSelectionV1bN2HarnessFrozenInputPayload,
  TopicSelectionV1bWorkflowHarnessRunRequest,
  TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import type {
  TopicSelectionTopicValueAssessmentRecord,
  TopicSelectionV1bPackageDraftInput,
  TopicSelectionValueDisposition,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';
import type { TopicSelectionTopicPackageRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-package-contracts';
import type {
  TopicSelectionActorType,
  TopicSelectionFunctionalRef,
  TopicSelectionGateIssue,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type { TopicSelectionAgentExecutionMode } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import { uniqueStrings } from './topic-selection-v1b-harness-dedup-utils.js';
import { blocker, refsEqual, warning } from './topic-selection-v1b-harness-gate-utils.js';

export function isRegistryExecutionMode(
  executionMode: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef['execution_mode'],
): executionMode is TopicSelectionAgentExecutionMode {
  return executionMode === 'mocked_llm'
    || executionMode === 'codex_assisted'
    || executionMode === 'provider_llm';
}

export function earlyRuntimeAuditDrift(message: string): { ok: false; code: string; message: string } {
  return {
    ok: false,
    code: 'V1B_EARLY_SUPPORT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
    message,
  };
}

export function n10Narrative(input: TopicSelectionV1bPackageDraftInput): {
  candidateMethods: string[];
  contributionSummary: string;
  evaluationPlan: string;
  keyRisks: string[];
  nonGoals: string[];
  researchBackground: string;
  titleCandidates: string[];
} {
  return {
    titleCandidates: uniqueStrings([
      input.question_contract.main_question.replace(/\?$/u, ''),
      `${input.question_contract.contribution_hypothesis}: ${input.question_contract.expected_claim}`,
    ]).slice(0, 3),
    researchBackground: [
      `Target setting: ${input.question_contract.target_setting}.`,
      `Target community: ${input.question_contract.target_community}.`,
      input.value_reasoning_memo.significance,
      input.value_reasoning_memo.originality,
    ].join(' '),
    contributionSummary: [
      input.value_reasoning_memo.value_thesis,
      `Strongest claim: ${input.topic_value_assessment.strongest_claim_if_success}.`,
      input.topic_value_assessment.fallback_claim_if_success
        ? `Fallback claim: ${input.topic_value_assessment.fallback_claim_if_success}.`
        : '',
    ].filter(Boolean).join(' '),
    candidateMethods: uniqueStrings([
      ...input.answerability_plan.datasets_or_resources.map((item) => `Resource: ${item}`),
      ...input.answerability_plan.metrics.map((item) => `Metric: ${item}`),
      ...input.answerability_plan.baselines.map((item) => `Baseline: ${item}`),
      ...input.answerability_plan.ablations_or_comparisons.map((item) => `Comparison: ${item}`),
      input.answerability_plan.evaluation_setting,
    ].filter(Boolean)),
    evaluationPlan: [
      input.answerability_plan.evaluation_setting,
      input.answerability_plan.datasets_or_resources.length > 0
        ? `Datasets/resources: ${input.answerability_plan.datasets_or_resources.join('; ')}.`
        : '',
      input.answerability_plan.metrics.length > 0
        ? `Metrics: ${input.answerability_plan.metrics.join('; ')}.`
        : '',
      input.answerability_plan.baselines.length > 0
        ? `Baselines: ${input.answerability_plan.baselines.join('; ')}.`
        : '',
    ].filter(Boolean).join(' '),
    keyRisks: uniqueStrings([
      ...input.topic_value_assessment.risk_notes,
      ...input.value_reasoning_memo.reviewer_risks,
      ...input.value_reasoning_memo.top_objections,
      ...input.answerability_plan.dependency_risks,
      ...input.answerability_plan.open_dependencies,
      ...input.answerability_plan.known_gaps,
      ...input.falsification_conditions.map((condition) => `${condition.condition_type}: ${condition.statement}`),
    ]),
    nonGoals: uniqueStrings(input.question_contract.prohibited_claims),
  };
}

export function n10CarryForwardCodes(pkg: TopicSelectionTopicPackageRecord): string[] {
  return [
    pkg.accepted_risk_refs.length > 0 ? 'accepted_risks_carried_forward' : '',
    pkg.blocker_refs.length > 0 ? 'blockers_carried_forward' : '',
    pkg.recheck_request_refs.length > 0 ? 'recheck_requests_carried_forward' : '',
  ].filter(Boolean);
}

export function n10Warnings(pkg: TopicSelectionTopicPackageRecord): TopicSelectionGateIssue[] {
  const warnings: TopicSelectionGateIssue[] = [];
  if (pkg.accepted_risk_refs.length > 0) {
    warnings.push(warning('N10_ACCEPTED_RISK_CARRIED_FORWARD', 'N10 package carries accepted risk refs forward.', pkg.accepted_risk_refs));
  }
  if (pkg.recheck_request_refs.length > 0) {
    warnings.push(warning('N10_RECHECK_REFS_CARRIED_FORWARD', 'N10 package carries recheck request refs forward.', pkg.recheck_request_refs));
  }
  if (pkg.key_risks.length > 0) {
    warnings.push(warning('N10_PACKAGE_RISKS_CARRIED_FORWARD', 'N10 package carries key risks forward.', pkg.topic_value_assessment_ref ? [pkg.topic_value_assessment_ref] : []));
  }
  return warnings;
}

export function legacyValueVerdict(disposition: TopicSelectionValueDisposition): TopicSelectionTopicValueAssessmentRecord['legacy_verdict'] {
  switch (disposition) {
    case 'advance_to_package':
      return 'promote';
    case 'refine_question':
    case 'refine_slice':
    case 'recheck_evidence_or_search':
      return 'refine';
    case 'park':
      return 'park';
    case 'drop':
      return 'drop';
  }
}

export function n1MetadataBlocker(
  payload: TopicSelectionV1bN1HarnessFrozenInputPayload,
  bundleRef: TopicSelectionFunctionalRef,
  expectedBundleHash: string,
  expectedSourceRefsHash: string,
): { code: string; message: string } | null {
  if (!refsEqual(payload.v1a_bundle_ref, bundleRef)) {
    return {
      code: 'N1_V1A_BUNDLE_REF_MISMATCH',
      message: 'N1 v1a_bundle_ref does not match the explicit persisted v1a bundle.',
    };
  }
  if (payload.v1a_bundle_hash !== expectedBundleHash) {
    return {
      code: 'N1_V1A_BUNDLE_HASH_MISMATCH',
      message: 'N1 v1a_bundle_hash does not match the persisted v1a bundle.',
    };
  }
  if (payload.source_refs_hash !== expectedSourceRefsHash) {
    return {
      code: 'N1_SOURCE_REFS_HASH_MISMATCH',
      message: 'N1 source_refs_hash does not match the persisted v1a bundle lineage refs.',
    };
  }
  return null;
}

export function n2CodexDelegationBlocker(
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  payload: TopicSelectionV1bN2HarnessFrozenInputPayload,
  acceptedPayloadHash: string,
): { code: string; message: string } | null {
  if (payload.authority_input_provider !== 'codex_delegated') {
    return null;
  }
  if (payload.delegation_artifact_hash !== acceptedPayloadHash) {
    return {
      code: 'N2_CODEX_DELEGATION_ARTIFACT_MISMATCH',
      message: 'N2 codex_delegated payload must bind delegation_artifact_hash to accepted profile payload hash.',
    };
  }
  const artifact = (input.semantic_artifacts ?? []).find((item) =>
    item.slot_id === 'n2_constraint_profile_semantic_support'
    && item.allowed_effect === 'delegated_payload_candidate'
  );
  if (!artifact) {
    return {
      code: 'N2_CODEX_DELEGATION_ARTIFACT_REQUIRED',
      message: 'N2 codex_delegated payload requires matching frozen semantic support artifact provenance.',
    };
  }
  if (
    artifact.normalized_output_hash !== payload.delegation_artifact_hash
    && artifact.structured_output_hash !== payload.delegation_artifact_hash
  ) {
    return {
      code: 'N2_CODEX_DELEGATION_ARTIFACT_MISMATCH',
      message: 'N2 Codex semantic artifact hash does not match the accepted authority payload hash.',
    };
  }
  return null;
}

export function n2CreatedBy(
  requested: TopicSelectionActorType | undefined,
  provider: TopicSelectionV1bN2HarnessFrozenInputPayload['authority_input_provider'],
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

export function pushRefMismatchIssue(
  issues: TopicSelectionGateIssue[],
  code: string,
  actual: TopicSelectionFunctionalRef,
  expected: TopicSelectionFunctionalRef,
): void {
  if (!refsEqual(actual, expected)) {
    issues.push(blocker(code, `${code} blocks v1b intake readiness.`, [actual, expected]));
  }
}
