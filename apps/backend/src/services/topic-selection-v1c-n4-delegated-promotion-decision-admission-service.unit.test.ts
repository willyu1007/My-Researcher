import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_CANDIDATE_SCHEMA_VERSION,
  type TopicSelectionPromotionCondition,
  type TopicSelectionV1cDelegatedPromotionDecisionCandidate,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import type {
  TopicSelectionPromotionGateHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-gate-contracts';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import {
  TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
  topicSelectionV1cAcceptanceRef,
} from './topic-selection-v1c-acceptance-scenario-fixtures.js';
import {
  TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionService,
  type TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionExpectedIdentity,
  type TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionExpectedIdentityBuilder,
  type TopicSelectionV1cN4DelegatedPromotionDecisionCandidateArtifact,
} from './topic-selection-v1c-n4-delegated-promotion-decision-admission-service.js';

const NOW = TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP;

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return topicSelectionV1cAcceptanceRef(refType, refId, versionId);
}

function hash(value: unknown): string {
  return sha256Text(stableStringify(value));
}

function makeCondition(): TopicSelectionPromotionCondition {
  const sourceRef = ref('topic_package', 'topic_package_001', 'v1');
  return {
    condition_id: 'promotion_condition_001',
    condition_code: 'clarify_contribution_claim',
    owner: {
      actor_type: 'human',
      actor_id: 'reviewer_001',
    },
    required_action: {
      action_code: 'clarify_contribution_claim_before_outline_lock',
      severity: 'warning',
      loopback_target: 'package',
      refs: [sourceRef],
      reason: 'Clarify the contribution claim before outline lock.',
    },
    refs: [sourceRef],
    early_check_obligations: ['Re-check contribution claim before outline lock.'],
    verification_note: 'Condition is reviewer-visible.',
  };
}

function makeGateHandoff(): TopicSelectionPromotionGateHandoff {
  const gateRef = ref('promotion_gate_check', 'promotion_gate_check_001');
  const supportRef = ref('promotion_decision_support', 'promotion_decision_support_001');
  const dossierRef = ref('promotion_dossier', 'promotion_dossier_001');
  const readinessRef = ref('argument_readiness_mini_check', 'argument_readiness_mini_check_001');
  const inputRef = ref('promotion_input_snapshot', 'promotion_input_snapshot_001');
  const topicPackageRef = ref('topic_package', 'topic_package_001', 'v1');
  const acceptedRiskRef = ref('accepted_risk', 'accepted_risk_001');
  const artifactRef = ref('artifact_ref', 'artifact_ref_001');
  return {
    promotion_gate_check_id: 'promotion_gate_check_001',
    promotion_gate_check_ref: gateRef,
    promotion_decision_support_ref: supportRef,
    promotion_dossier_ref: dossierRef,
    argument_readiness_mini_check_ref: readinessRef,
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    promotion_input_snapshot_ref: inputRef,
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    topic_package_id: 'topic_package_001',
    package_version: 'v1',
    disposition: 'ready_for_human_decision',
    promote_allowed: true,
    required_actions: [],
    loopback_hints: [],
    accepted_risk_refs: [acceptedRiskRef],
    blocker_refs: [],
    recheck_request_refs: [],
    memory_suggestion_refs: [],
    snapshot_hashes: {
      bundle_hash: 'bundle_hash_001',
      package_snapshot_hash: 'package_snapshot_hash_001',
      package_draft_input_snapshot_hash: 'package_draft_input_snapshot_hash_001',
      promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    },
    support: {
      promotion_decision_support_id: 'promotion_decision_support_001',
      support_run_key: 'support_run_key_001',
      workspace_id: 'workspace_001',
      title_card_id: 'title_card_001',
      promotion_input_snapshot_id: 'promotion_input_snapshot_001',
      promotion_input_snapshot_ref: inputRef,
      promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
      topic_package_id: 'topic_package_001',
      package_version: 'v1',
      support_generation_mode: 'llm_draft',
      support_status: 'succeeded',
      summary: 'Ready for human promotion decision.',
      reviewer_questions: [],
      risk_notes: [],
      recheck_notes: [],
      source_refs: [inputRef, topicPackageRef],
      accepted_risk_refs: [acceptedRiskRef],
      blocker_refs: [],
      recheck_request_refs: [],
      memory_suggestion_refs: [],
      warnings: [],
      llm_draft_payload: {
        summary: 'Ready for human promotion decision.',
      },
      input_snapshot_id: 'input_snapshot_support_001',
      workflow_run_id: 'workflow_run_support_001',
      artifact_refs: [supportRef, artifactRef],
      created_by: 'llm',
      created_at: NOW,
    },
    dossier: {
      promotion_dossier_id: 'promotion_dossier_001',
      support_run_key: 'support_run_key_001',
      workspace_id: 'workspace_001',
      title_card_id: 'title_card_001',
      promotion_decision_support_id: 'promotion_decision_support_001',
      promotion_input_snapshot_id: 'promotion_input_snapshot_001',
      topic_package_id: 'topic_package_001',
      package_version: 'v1',
      summary: 'Reviewer packet is ready.',
      reviewer_packet_artifact_ref: artifactRef,
      dossier_payload: {
        source_snapshot_excerpt: {
          contribution_summary: 'A bounded workflow contribution.',
          evaluation_plan: 'A bounded evaluation plan.',
          claim_ceiling: 'Correlation and mechanism claims only.',
          prohibited_claims: ['Do not claim causal proof.'],
          selected_literature_evidence_ids: ['evidence_unit_001'],
          selected_evidence_refs: [ref('evidence_unit', 'evidence_unit_001')],
        },
      },
      source_refs: [inputRef, topicPackageRef],
      artifact_refs: [dossierRef, artifactRef],
      created_by: 'system',
      created_at: NOW,
    },
    argument_readiness_mini_check: {
      argument_readiness_mini_check_id: 'argument_readiness_mini_check_001',
      support_run_key: 'support_run_key_001',
      workspace_id: 'workspace_001',
      title_card_id: 'title_card_001',
      promotion_decision_support_id: 'promotion_decision_support_001',
      promotion_input_snapshot_id: 'promotion_input_snapshot_001',
      check_status: 'passed',
      check_items: [],
      blockers: [],
      warnings: [],
      required_actions: [],
      early_check_obligations: ['Re-check contribution claim before outline lock.'],
      source_refs: [inputRef, topicPackageRef],
      artifact_refs: [readinessRef, artifactRef],
      created_by: 'system',
      created_at: NOW,
    },
    gate_check: {
      promotion_gate_check_id: 'promotion_gate_check_001',
      support_run_key: 'support_run_key_001',
      workspace_id: 'workspace_001',
      title_card_id: 'title_card_001',
      promotion_decision_support_id: 'promotion_decision_support_001',
      promotion_dossier_id: 'promotion_dossier_001',
      argument_readiness_mini_check_id: 'argument_readiness_mini_check_001',
      promotion_input_snapshot_id: 'promotion_input_snapshot_001',
      promotion_input_snapshot_ref: inputRef,
      promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
      disposition: 'ready_for_human_decision',
      promote_allowed: true,
      blockers: [],
      warnings: [],
      required_actions: [],
      loopback_hints: [],
      accepted_risk_refs: [acceptedRiskRef],
      blocker_refs: [],
      recheck_request_refs: [],
      memory_suggestion_refs: [],
      source_refs: [inputRef, topicPackageRef],
      snapshot_hashes: {
        bundle_hash: 'bundle_hash_001',
        package_snapshot_hash: 'package_snapshot_hash_001',
        package_draft_input_snapshot_hash: 'package_draft_input_snapshot_hash_001',
        promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
      },
      input_snapshot_id: 'input_snapshot_gate_001',
      workflow_run_id: 'workflow_run_gate_001',
      gate_result_id: 'gate_result_001',
      transition_attempt_id: 'transition_attempt_001',
      trace_snapshot_id: 'trace_snapshot_001',
      artifact_refs: [gateRef, artifactRef],
      created_by: 'system',
      created_at: NOW,
    },
  };
}

function candidateOutput(
  handoff: TopicSelectionPromotionGateHandoff,
  overrides: Partial<TopicSelectionV1cDelegatedPromotionDecisionCandidate> = {},
): TopicSelectionV1cDelegatedPromotionDecisionCandidate {
  const condition = makeCondition();
  return {
    schema_version: TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_CANDIDATE_SCHEMA_VERSION,
    promotion_gate_check_id: handoff.promotion_gate_check_id,
    promotion_input_snapshot_id: handoff.promotion_input_snapshot_id,
    promotion_input_snapshot_hash: handoff.promotion_input_snapshot_hash,
    workspace_id: 'workspace_001',
    title_card_id: handoff.gate_check.title_card_id,
    decision: 'promote_with_conditions',
    rationale: 'Ready for bridge authorization with one explicit condition.',
    confirmed_snapshot_hash: handoff.promotion_input_snapshot_hash,
    conditions: [condition],
    required_actions: [],
    loopback_target: null,
    allowed_refinements: [],
    stop_conditions: [],
    reopen_conditions: [],
    cited_refs: [
      handoff.promotion_gate_check_ref,
      handoff.promotion_input_snapshot_ref,
      ...condition.refs,
    ],
    decision_support_refs: [
      handoff.promotion_gate_check_ref,
      handoff.promotion_input_snapshot_ref,
      handoff.promotion_decision_support_ref,
    ],
    no_authority_write_confirmed: true,
    no_bridge_creation_confirmed: true,
    human_review_required: true,
    ...overrides,
  };
}

const SOURCE_HASHES: Record<string, string> = {
  promotion_gate_check: 'source_hash_gate_001',
  promotion_input_snapshot: 'source_hash_input_001',
};

const CONTEXT_PROFILE = {
  context_policy_profile_id: 'ctx_profile_n4_delegated',
  context_policy_profile_version: 'v1',
  context_policy_profile_hash: 'ctx_profile_hash_n4_delegated_001',
};

const PROMPT_PACKET_HASH = 'prompt_packet_hash_n4_delegated_001';
const PROMPT_VARIANT_KEY = 'topic-selection.v1c.n4.delegated-promotion-decision.slot.v1';
const RUNTIME_INVOCATION_CONTEXT_HASH = 'runtime_invocation_context_hash_n4_001';
const REDACTION_POLICY = 'topic-selection-default-redaction-v1';

/**
 * Stub builder: returns a fixed expected identity that the candidate artifact is
 * constructed to match exactly. This is the admission service's only constructor
 * dependency, so stubbing it keeps the unit test isolated from the runtime,
 * control-plane, and any LLM/DB/network.
 */
function makeExpectedIdentityBuilder(
  candidate: TopicSelectionV1cDelegatedPromotionDecisionCandidate,
): TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionExpectedIdentityBuilder {
  const normalizedPayloadHash = hash(candidate);
  const expected: TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionExpectedIdentity = {
    slot_id: 'n4_delegated_promotion_decision_candidate',
    output_contract: 'TopicSelectionV1cDelegatedPromotionDecisionCandidate@v1',
    context_policy_profile_id: CONTEXT_PROFILE.context_policy_profile_id,
    context_policy_profile_version: CONTEXT_PROFILE.context_policy_profile_version,
    context_policy_profile_hash: CONTEXT_PROFILE.context_policy_profile_hash,
    prompt_variant_key: PROMPT_VARIANT_KEY,
    prompt_packet_hash: PROMPT_PACKET_HASH,
    runtime_invocation_context_hash: RUNTIME_INVOCATION_CONTEXT_HASH,
    redaction_policy: REDACTION_POLICY,
    source_hashes: { ...SOURCE_HASHES },
    normalized_payload_hash: normalizedPayloadHash,
  };
  return {
    buildAdmissionExpectedIdentity(input) {
      // Honour the caller-supplied normalized payload hash so the builder reflects
      // whatever candidate is actually passed to admit().
      return { ...expected, normalized_payload_hash: input.normalized_payload_hash };
    },
  };
}

function makeCandidateArtifact(
  candidate: TopicSelectionV1cDelegatedPromotionDecisionCandidate,
  overrides: Partial<TopicSelectionV1cN4DelegatedPromotionDecisionCandidateArtifact> = {},
): TopicSelectionV1cN4DelegatedPromotionDecisionCandidateArtifact {
  const normalizedPayloadHash = hash(candidate);
  const candidateRef = ref('structured_output', 'n4_delegated_candidate_artifact_001');
  const auditRef = ref('runtime_audit', 'n4_delegated_runtime_audit_001');
  return {
    slot_id: 'n4_delegated_promotion_decision_candidate',
    node_id: 'topic-selection.v1c.record-human-promotion-decision.v1',
    workflow_run_id: 'workflow_run_n4_delegated_001',
    node_attempt_id: 'node_attempt_n4_delegated_001',
    policy_version: 'policy_v1',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    allowed_effect: 'delegated_promotion_decision_candidate_only',
    candidate_artifact_ref: candidateRef,
    candidate_artifact_hash: normalizedPayloadHash,
    normalized_output_ref: candidateRef,
    normalized_output_hash: normalizedPayloadHash,
    output_contract: 'TopicSelectionV1cDelegatedPromotionDecisionCandidate@v1',
    profile_id: CONTEXT_PROFILE.context_policy_profile_id,
    model_option_id: null,
    prompt_packet_hash: PROMPT_PACKET_HASH,
    structured_output_hash: normalizedPayloadHash,
    context_policy_profile_id: CONTEXT_PROFILE.context_policy_profile_id,
    context_policy_profile_version: CONTEXT_PROFILE.context_policy_profile_version,
    context_policy_profile_hash: CONTEXT_PROFILE.context_policy_profile_hash,
    prompt_variant_key: PROMPT_VARIANT_KEY,
    runtime_invocation_context_hash: RUNTIME_INVOCATION_CONTEXT_HASH,
    redaction_policy: REDACTION_POLICY,
    source_hashes: { ...SOURCE_HASHES },
    runtime_audit_ref: auditRef,
    runtime_audit_hash: 'runtime_audit_hash_001',
    provenance_ref: auditRef,
    runtime_provenance_class: 'runtime_verified',
    compression_report_ref: null,
    compression_report_hash: null,
    compressed_context_hash: null,
    ...overrides,
  };
}

test('v1c N4 admission admits a runtime-verified candidate and prepares the human decision input without authority write', () => {
  const handoff = makeGateHandoff();
  const candidate = candidateOutput(handoff);
  const service = new TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionService(
    makeExpectedIdentityBuilder(candidate),
  );

  const result = service.admit({
    gate_handoff: handoff,
    candidate_artifact: makeCandidateArtifact(candidate),
    candidate,
    human_actor: { actor_type: 'human', actor_id: 'reviewer_001' },
    policy_version_id: 'policy_v1',
  });

  assert.equal(result.admitted, true);
  if (!result.admitted) {
    throw new Error('Expected runtime-verified N4 delegated decision candidate to be admitted.');
  }
  // Admission only prepares a human-review input candidate — it never writes authority.
  assert.equal(result.admission_identity.allowed_effect, 'human_review_input_candidate_only');
  assert.equal(
    result.admission_identity.admission_policy_id,
    'topic-selection.v1c.n4.delegated-promotion-decision.admission.v1',
  );
  assert.equal(result.admission_identity.decision, 'promote_with_conditions');
  assert.equal(
    result.admission_identity.promotion_gate_check_id,
    handoff.promotion_gate_check_id,
  );
  // The prepared create_input is what a human service would later consume.
  assert.equal(result.create_input.decision, 'promote_with_conditions');
  assert.equal(result.create_input.promotion_gate_check_id, handoff.promotion_gate_check_id);
  assert.equal(result.create_input.confirmed_snapshot_hash, handoff.promotion_input_snapshot_hash);
  assert.equal(result.create_input.human_actor.actor_id, 'reviewer_001');
  assert.equal(result.create_input.policy_version_id, 'policy_v1');
  assert.deepEqual(result.create_input.conditions, candidate.conditions);
  // No N6 dedup warnings / N8 thresholds in this service: warnings is always empty.
  assert.deepEqual(result.warnings, []);
  assert.equal(result.admission_identity_hash, hash(result.admission_identity));
});

test('v1c N4 admission rejects a candidate artifact that is not runtime_verified provenance class', () => {
  const handoff = makeGateHandoff();
  const candidate = candidateOutput(handoff);
  const service = new TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionService(
    makeExpectedIdentityBuilder(candidate),
  );

  const result = service.admit({
    gate_handoff: handoff,
    candidate_artifact: makeCandidateArtifact(candidate, {
      // Forge the provenance class to something other than runtime_verified.
      runtime_provenance_class: 'legacy_unverified' as never,
    }),
    candidate,
    human_actor: { actor_type: 'human', actor_id: 'reviewer_001' },
  });

  assert.equal(result.admitted, false);
  if (result.admitted) {
    throw new Error('Expected a non-runtime_verified candidate artifact to be rejected.');
  }
  assert.equal(result.blocker.code, 'N4_DELEGATED_DECISION_ARTIFACT_RUNTIME_CONTEXT_DRIFT');
});

test('v1c N4 admission rejects a candidate artifact whose payload hash drifts from the normalized output', () => {
  const handoff = makeGateHandoff();
  const candidate = candidateOutput(handoff);
  const service = new TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionService(
    makeExpectedIdentityBuilder(candidate),
  );

  const result = service.admit({
    gate_handoff: handoff,
    candidate_artifact: makeCandidateArtifact(candidate, {
      candidate_artifact_hash: '0'.repeat(64),
    }),
    candidate,
    human_actor: { actor_type: 'human', actor_id: 'reviewer_001' },
  });

  assert.equal(result.admitted, false);
  if (result.admitted) {
    throw new Error('Expected a payload-hash mismatch to be rejected.');
  }
  assert.equal(result.blocker.code, 'N4_DELEGATED_DECISION_ARTIFACT_PAYLOAD_HASH_MISMATCH');
});

test('v1c N4 admission rejects a candidate that smuggles a forbidden authority/bridge field', () => {
  const handoff = makeGateHandoff();
  const candidate = candidateOutput(handoff, {
    // A delegated candidate must never carry authority/bridge/automation fields.
    paper_project_bridge_id: 'paper_project_bridge_unauthorized_001',
  } as unknown as Partial<TopicSelectionV1cDelegatedPromotionDecisionCandidate>);
  const service = new TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionService(
    makeExpectedIdentityBuilder(candidate),
  );

  const result = service.admit({
    gate_handoff: handoff,
    candidate_artifact: makeCandidateArtifact(candidate),
    candidate,
    human_actor: { actor_type: 'human', actor_id: 'reviewer_001' },
  });

  assert.equal(result.admitted, false);
  if (result.admitted) {
    throw new Error('Expected a forbidden authority field to be rejected.');
  }
  assert.equal(result.blocker.code, 'N4_DELEGATED_DECISION_FORBIDDEN_AUTHORITY_FIELD');
  assert.equal(result.blocker.details?.forbidden_key, 'paper_project_bridge_id');
});

test('v1c N4 admission rejects a non-human actor supplied outside the candidate', () => {
  const handoff = makeGateHandoff();
  const candidate = candidateOutput(handoff);
  const service = new TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionService(
    makeExpectedIdentityBuilder(candidate),
  );

  const result = service.admit({
    gate_handoff: handoff,
    candidate_artifact: makeCandidateArtifact(candidate),
    candidate,
    human_actor: { actor_type: 'system' as never, actor_id: 'automation_001' },
  });

  assert.equal(result.admitted, false);
  if (result.admitted) {
    throw new Error('Expected a non-human actor to be rejected.');
  }
  assert.equal(result.blocker.code, 'N4_DELEGATED_DECISION_HUMAN_BOUNDARY_MISSING');
});
