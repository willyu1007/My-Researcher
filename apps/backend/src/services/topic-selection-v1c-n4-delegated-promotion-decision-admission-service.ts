import type {
  TopicSelectionActorRef,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { TOPIC_SELECTION_V1C_NODE_ID } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-node-ids';
import type {
  TopicSelectionAgentExecutionMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionAgentRunMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import type {
  TopicSelectionHumanPromotionDecisionKind,
  TopicSelectionPromotionLoopbackTarget,
  TopicSelectionV1cDelegatedPromotionDecisionCandidate,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import {
  TOPIC_SELECTION_NON_PROMOTE_DECISIONS,
  TOPIC_SELECTION_PROMOTE_CLASS_DECISIONS,
  TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_CANDIDATE_SCHEMA_VERSION,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import type {
  TopicSelectionPromotionGateHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-gate-contracts';
import type {
  RecordHumanPromotionDecisionInput,
} from './topic-selection-v1c-human-promotion-decision-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

export interface TopicSelectionV1cN4DelegatedPromotionDecisionCandidateArtifact {
  slot_id: 'n4_delegated_promotion_decision_candidate';
  node_id: 'topic-selection.v1c.record-human-promotion-decision.v1';
  workflow_run_id: string;
  node_attempt_id: string;
  policy_version: string;
  execution_mode: TopicSelectionAgentExecutionMode;
  run_mode: TopicSelectionAgentRunMode;
  allowed_effect: 'delegated_promotion_decision_candidate_only';
  candidate_artifact_ref: TopicSelectionFunctionalRef;
  candidate_artifact_hash: string;
  normalized_output_ref: TopicSelectionFunctionalRef;
  normalized_output_hash: string;
  output_contract: 'TopicSelectionV1cDelegatedPromotionDecisionCandidate@v1';
  profile_id: string;
  model_option_id: string | null;
  prompt_packet_hash: string;
  structured_output_hash: string;
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  prompt_variant_key: string;
  runtime_invocation_context_hash: string;
  redaction_policy: string;
  source_hashes: Record<string, string>;
  runtime_audit_ref: TopicSelectionFunctionalRef | null;
  runtime_audit_hash: string | null;
  provenance_ref: TopicSelectionFunctionalRef;
  runtime_provenance_class: 'runtime_verified';
  compression_report_ref: TopicSelectionFunctionalRef | null;
  compression_report_hash: string | null;
  compressed_context_hash: string | null;
}

export interface TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionExpectedIdentity {
  slot_id: 'n4_delegated_promotion_decision_candidate';
  output_contract: 'TopicSelectionV1cDelegatedPromotionDecisionCandidate@v1';
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  prompt_variant_key: string;
  prompt_packet_hash: string | null;
  runtime_invocation_context_hash: string;
  redaction_policy: string;
  source_hashes: Record<string, string>;
  normalized_payload_hash: string;
}

export type TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionExpectedIdentityBuilder = {
  buildAdmissionExpectedIdentity(input: {
    gate_handoff: TopicSelectionPromotionGateHandoff;
    workflow_run_id: string;
    node_attempt_id: string;
    policy_version?: string | null;
    execution_mode: TopicSelectionAgentExecutionMode;
    run_mode: TopicSelectionAgentRunMode;
    model_option_id?: string | null;
    normalized_payload_hash: string;
    compression_report_ref?: TopicSelectionFunctionalRef | null;
    compression_report_hash?: string | null;
    compressed_context_hash?: string | null;
  }): TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionExpectedIdentity;
};

export type TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionBlockerCode =
  | 'N4_DELEGATED_DECISION_ARTIFACT_PROFILE_DRIFT'
  | 'N4_DELEGATED_DECISION_ARTIFACT_PROMPT_DRIFT'
  | 'N4_DELEGATED_DECISION_ARTIFACT_RUNTIME_CONTEXT_DRIFT'
  | 'N4_DELEGATED_DECISION_SOURCE_HASH_DRIFT'
  | 'N4_DELEGATED_DECISION_ARTIFACT_PAYLOAD_HASH_MISMATCH'
  | 'N4_DELEGATED_DECISION_SCHEMA_VERSION_INVALID'
  | 'N4_DELEGATED_DECISION_SOURCE_MISMATCH'
  | 'N4_DELEGATED_DECISION_FORBIDDEN_AUTHORITY_FIELD'
  | 'N4_DELEGATED_DECISION_REF_OUT_OF_BOUNDS'
  | 'N4_DELEGATED_DECISION_SUPPORT_REF_MISSING'
  | 'N4_DELEGATED_DECISION_PROMOTE_NOT_ALLOWED'
  | 'N4_DELEGATED_DECISION_CONDITION_MISMATCH'
  | 'N4_DELEGATED_DECISION_LOOPBACK_MISMATCH'
  | 'N4_DELEGATED_DECISION_HUMAN_BOUNDARY_MISSING';

export interface TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionIssue {
  code: TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionBlockerCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionIdentity {
  schema_version: 'topic-selection-v1c-n4-delegated-promotion-decision-admission-identity-v1';
  admission_policy_id: 'topic-selection.v1c.n4.delegated-promotion-decision.admission.v1';
  node_id: 'topic-selection.v1c.record-human-promotion-decision.v1';
  allowed_effect: 'human_review_input_candidate_only';
  promotion_gate_check_id: string;
  promotion_gate_check_ref: TopicSelectionFunctionalRef;
  promotion_input_snapshot_id: string;
  promotion_input_snapshot_ref: TopicSelectionFunctionalRef;
  promotion_input_snapshot_hash: string;
  decision: TopicSelectionHumanPromotionDecisionKind;
  candidate_artifact_ref: TopicSelectionFunctionalRef;
  candidate_artifact_hash: string;
  prompt_packet_hash: string;
  runtime_invocation_context_hash: string;
  runtime_audit_ref: TopicSelectionFunctionalRef;
  runtime_audit_hash: string;
  provenance_ref: TopicSelectionFunctionalRef;
  structured_output_hash: string;
  output_contract: 'TopicSelectionV1cDelegatedPromotionDecisionCandidate@v1';
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  source_hashes: Record<string, string>;
}

export type TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionResult =
  | {
    admitted: true;
    candidate_artifact: TopicSelectionV1cN4DelegatedPromotionDecisionCandidateArtifact;
    candidate: TopicSelectionV1cDelegatedPromotionDecisionCandidate;
    create_input: RecordHumanPromotionDecisionInput;
    admission_identity: TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionIdentity;
    admission_identity_hash: string;
    warnings: string[];
  }
  | {
    admitted: false;
    blocker: TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionIssue;
  };

export interface TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionInput {
  gate_handoff: TopicSelectionPromotionGateHandoff;
  candidate_artifact: TopicSelectionV1cN4DelegatedPromotionDecisionCandidateArtifact;
  candidate: TopicSelectionV1cDelegatedPromotionDecisionCandidate;
  human_actor: TopicSelectionActorRef;
  workspace_id?: string | null;
  policy_version_id?: string | null;
}

const PROMOTE_DECISIONS = new Set<TopicSelectionHumanPromotionDecisionKind>(
  TOPIC_SELECTION_PROMOTE_CLASS_DECISIONS,
);
const NON_PROMOTE_DECISIONS = new Set<TopicSelectionHumanPromotionDecisionKind>(
  TOPIC_SELECTION_NON_PROMOTE_DECISIONS,
);
const LOOPBACK_TARGET_BY_DECISION: Record<
  typeof TOPIC_SELECTION_NON_PROMOTE_DECISIONS[number],
  TopicSelectionPromotionLoopbackTarget
> = {
  merge_packages: 'package',
  refine_package: 'package',
  reassess_value: 'value',
  revise_question: 'question',
  revise_slice: 'slice',
  recheck_evidence_or_search: 'evidence_or_search',
  park: 'park',
  drop: 'none',
};

const FORBIDDEN_AUTHORITY_KEYS = [
  'human_promotion_decision_id',
  'human_confirmed_decision_id',
  'promotion_decision_id',
  'promotion_commitment_profile_id',
  'paper_project_bridge_id',
  'paper_project_bridge',
  'bridge_handoff',
  'created_bridge',
  'promotion_decision',
  'human_promotion_decision',
  'promotion_commitment_profile',
  'gate_patch',
  'promote_allowed_patch',
  'recordHumanPromotionDecision',
  'createPaperProjectBridge',
  'downstream_topic_feedback_id',
  'recheck_request',
  'downstream_recheck_request_id',
  'workflow_advance',
  'automation',
  'authority_write',
] as const;

export class TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionService {
  constructor(
    private readonly expectedIdentityBuilder:
      TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionExpectedIdentityBuilder,
  ) {}

  admit(
    input: TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionInput,
  ): TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionResult {
    const expected = this.expectedIdentityBuilder.buildAdmissionExpectedIdentity({
      gate_handoff: input.gate_handoff,
      workflow_run_id: input.candidate_artifact.workflow_run_id,
      node_attempt_id: input.candidate_artifact.node_attempt_id,
      policy_version: input.candidate_artifact.policy_version,
      execution_mode: input.candidate_artifact.execution_mode,
      run_mode: input.candidate_artifact.run_mode,
      model_option_id: input.candidate_artifact.model_option_id,
      normalized_payload_hash: this.hash(input.candidate),
      compression_report_ref: input.candidate_artifact.compression_report_ref,
      compression_report_hash: input.candidate_artifact.compression_report_hash,
      compressed_context_hash: input.candidate_artifact.compressed_context_hash,
    });
    const artifactCheck = this.validateArtifactIdentity(input.candidate_artifact, expected);
    if (artifactCheck) {
      return artifactCheck;
    }
    const candidateCheck = this.validateCandidate(input);
    if (candidateCheck) {
      return candidateCheck;
    }

    const admissionIdentity: TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionIdentity = {
      schema_version: 'topic-selection-v1c-n4-delegated-promotion-decision-admission-identity-v1',
      admission_policy_id: 'topic-selection.v1c.n4.delegated-promotion-decision.admission.v1',
      node_id: TOPIC_SELECTION_V1C_NODE_ID.n4_record_human_promotion_decision,
      allowed_effect: 'human_review_input_candidate_only',
      promotion_gate_check_id: input.gate_handoff.promotion_gate_check_id,
      promotion_gate_check_ref: input.gate_handoff.promotion_gate_check_ref,
      promotion_input_snapshot_id: input.gate_handoff.promotion_input_snapshot_id,
      promotion_input_snapshot_ref: input.gate_handoff.promotion_input_snapshot_ref,
      promotion_input_snapshot_hash: input.gate_handoff.promotion_input_snapshot_hash,
      decision: input.candidate.decision,
      candidate_artifact_ref: input.candidate_artifact.candidate_artifact_ref,
      candidate_artifact_hash: input.candidate_artifact.candidate_artifact_hash,
      prompt_packet_hash: input.candidate_artifact.prompt_packet_hash,
      runtime_invocation_context_hash: input.candidate_artifact.runtime_invocation_context_hash,
      runtime_audit_ref: input.candidate_artifact.runtime_audit_ref!,
      runtime_audit_hash: input.candidate_artifact.runtime_audit_hash!,
      provenance_ref: input.candidate_artifact.provenance_ref,
      structured_output_hash: input.candidate_artifact.structured_output_hash,
      output_contract: input.candidate_artifact.output_contract,
      context_policy_profile_id: input.candidate_artifact.context_policy_profile_id,
      context_policy_profile_version: input.candidate_artifact.context_policy_profile_version,
      context_policy_profile_hash: input.candidate_artifact.context_policy_profile_hash,
      source_hashes: input.candidate_artifact.source_hashes,
    };

    return {
      admitted: true,
      candidate_artifact: input.candidate_artifact,
      candidate: input.candidate,
      create_input: {
        promotion_gate_check_id: input.gate_handoff.promotion_gate_check_id,
        decision: input.candidate.decision,
        human_actor: input.human_actor,
        rationale: input.candidate.rationale,
        confirmed_snapshot_hash: input.gate_handoff.promotion_input_snapshot_hash,
        workspace_id: input.workspace_id ?? input.candidate.workspace_id ?? input.gate_handoff.gate_check.workspace_id ?? null,
        policy_version_id: input.policy_version_id ?? null,
        conditions: input.candidate.conditions,
        required_actions: input.candidate.required_actions,
        loopback_target: input.candidate.loopback_target,
        allowed_refinements: input.candidate.allowed_refinements,
        stop_conditions: input.candidate.stop_conditions,
        reopen_conditions: input.candidate.reopen_conditions,
      },
      admission_identity: admissionIdentity,
      admission_identity_hash: this.hash(admissionIdentity),
      warnings: [],
    };
  }

  private validateArtifactIdentity(
    artifact: TopicSelectionV1cN4DelegatedPromotionDecisionCandidateArtifact,
    expected: TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionExpectedIdentity,
  ): TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionResult | null {
    if (artifact.runtime_provenance_class !== 'runtime_verified') {
      return this.block(
        'N4_DELEGATED_DECISION_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
        'N4 delegated decision admission requires a runtime_verified candidate artifact.',
      );
    }
    if (
      artifact.output_contract !== expected.output_contract
      || artifact.context_policy_profile_id !== expected.context_policy_profile_id
      || artifact.context_policy_profile_version !== expected.context_policy_profile_version
      || artifact.context_policy_profile_hash !== expected.context_policy_profile_hash
      || artifact.redaction_policy !== expected.redaction_policy
    ) {
      return this.block(
        'N4_DELEGATED_DECISION_ARTIFACT_PROFILE_DRIFT',
        'N4 delegated decision candidate profile identity does not match expected runtime identity.',
      );
    }
    if (
      artifact.prompt_variant_key !== expected.prompt_variant_key
      || !expected.prompt_packet_hash
      || artifact.prompt_packet_hash !== expected.prompt_packet_hash
    ) {
      return this.block(
        'N4_DELEGATED_DECISION_ARTIFACT_PROMPT_DRIFT',
        'N4 delegated decision candidate prompt identity does not match expected prompt packet.',
      );
    }
    if (
      artifact.runtime_invocation_context_hash !== expected.runtime_invocation_context_hash
      || !artifact.runtime_audit_ref
      || !artifact.runtime_audit_hash
      || !this.refsEqual(artifact.provenance_ref, artifact.runtime_audit_ref)
    ) {
      return this.block(
        'N4_DELEGATED_DECISION_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
        'N4 delegated decision candidate runtime invocation or audit identity is incomplete.',
      );
    }
    if (
      artifact.normalized_output_hash !== expected.normalized_payload_hash
      || artifact.structured_output_hash !== expected.normalized_payload_hash
      || artifact.candidate_artifact_hash !== expected.normalized_payload_hash
    ) {
      return this.block(
        'N4_DELEGATED_DECISION_ARTIFACT_PAYLOAD_HASH_MISMATCH',
        'N4 delegated decision candidate payload hash does not match normalized output hash.',
      );
    }
    if (!this.recordEqual(artifact.source_hashes, expected.source_hashes)) {
      return this.block(
        'N4_DELEGATED_DECISION_SOURCE_HASH_DRIFT',
        'N4 delegated decision candidate source hashes do not match expected gate handoff lineage.',
      );
    }
    return null;
  }

  private validateCandidate(
    input: TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionInput,
  ): TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionResult | null {
    const candidate = input.candidate;
    const handoff = input.gate_handoff;
    if (candidate.schema_version !== TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_CANDIDATE_SCHEMA_VERSION) {
      return this.block(
        'N4_DELEGATED_DECISION_SCHEMA_VERSION_INVALID',
        'N4 delegated decision candidate schema_version is not supported.',
        { schema_version: candidate.schema_version },
      );
    }
    if (
      candidate.promotion_gate_check_id !== handoff.promotion_gate_check_id
      || candidate.promotion_input_snapshot_id !== handoff.promotion_input_snapshot_id
      || candidate.promotion_input_snapshot_hash !== handoff.promotion_input_snapshot_hash
      || candidate.confirmed_snapshot_hash !== handoff.promotion_input_snapshot_hash
      || candidate.title_card_id !== handoff.gate_check.title_card_id
    ) {
      return this.block(
        'N4_DELEGATED_DECISION_SOURCE_MISMATCH',
        'N4 delegated decision candidate source fields do not match the N3 promotion gate handoff.',
      );
    }
    const candidateWorkspaceId = candidate.workspace_id ?? null;
    const gateWorkspaceId = handoff.gate_check.workspace_id ?? null;
    if (candidateWorkspaceId && candidateWorkspaceId !== gateWorkspaceId) {
      return this.block(
        'N4_DELEGATED_DECISION_SOURCE_MISMATCH',
        'N4 delegated decision candidate workspace does not match the N3 promotion gate handoff.',
        { gate_workspace_id: gateWorkspaceId, candidate_workspace_id: candidateWorkspaceId },
      );
    }
    if (
      !candidate.no_authority_write_confirmed
      || !candidate.no_bridge_creation_confirmed
      || !candidate.human_review_required
    ) {
      return this.block(
        'N4_DELEGATED_DECISION_HUMAN_BOUNDARY_MISSING',
        'N4 delegated decision candidate must explicitly preserve human authority and no-bridge boundaries.',
      );
    }
    if (input.human_actor.actor_type !== 'human' || !this.nonEmptyString(input.human_actor.actor_id)) {
      return this.block(
        'N4_DELEGATED_DECISION_HUMAN_BOUNDARY_MISSING',
        'N4 delegated decision admission requires an explicit human actor supplied outside the LLM candidate.',
      );
    }
    const forbiddenKey = this.findForbiddenAuthorityKey(candidate);
    if (forbiddenKey) {
      return this.block(
        'N4_DELEGATED_DECISION_FORBIDDEN_AUTHORITY_FIELD',
        'N4 delegated decision candidate contains a forbidden authority, bridge, recheck, or automation field.',
        { forbidden_key: forbiddenKey },
      );
    }
    const allowedRefKeys = new Set(this.allowedRefs(handoff).map((ref) => this.refKey(ref)));
    const outOfBoundsRef = this.findOutOfBoundsRef(candidate, allowedRefKeys);
    if (outOfBoundsRef) {
      return this.block(
        'N4_DELEGATED_DECISION_REF_OUT_OF_BOUNDS',
        'N4 delegated decision candidate references a ref outside the N3 gate handoff allowed-ref set.',
        { ref: outOfBoundsRef },
      );
    }
    if (
      !candidate.decision_support_refs.some((ref) => this.refsEqual(ref, handoff.promotion_gate_check_ref))
      || !candidate.decision_support_refs.some((ref) => this.refsEqual(ref, handoff.promotion_input_snapshot_ref))
    ) {
      return this.block(
        'N4_DELEGATED_DECISION_SUPPORT_REF_MISSING',
        'N4 delegated decision candidate must cite the N3 gate check and promotion input snapshot refs.',
      );
    }
    return this.validateDecisionShape(candidate, handoff);
  }

  private validateDecisionShape(
    candidate: TopicSelectionV1cDelegatedPromotionDecisionCandidate,
    handoff: TopicSelectionPromotionGateHandoff,
  ): TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionResult | null {
    if (PROMOTE_DECISIONS.has(candidate.decision)) {
      if (handoff.disposition !== 'ready_for_human_decision' || !handoff.promote_allowed) {
        return this.block(
          'N4_DELEGATED_DECISION_PROMOTE_NOT_ALLOWED',
          'N4 delegated decision candidate recommends a promote-class decision when the N3 gate does not allow promotion.',
        );
      }
      if (candidate.loopback_target !== null || candidate.required_actions.length > 0) {
        return this.block(
          'N4_DELEGATED_DECISION_LOOPBACK_MISMATCH',
          'N4 promote-class candidate cannot carry loopback target or non-promote required actions.',
        );
      }
      if (candidate.decision === 'promote_to_paper_project' && candidate.conditions.length > 0) {
        return this.block(
          'N4_DELEGATED_DECISION_CONDITION_MISMATCH',
          'promote_to_paper_project delegated candidate cannot carry conditions.',
        );
      }
      if (candidate.decision === 'promote_with_conditions' && candidate.conditions.length === 0) {
        return this.block(
          'N4_DELEGATED_DECISION_CONDITION_MISMATCH',
          'promote_with_conditions delegated candidate requires at least one condition.',
        );
      }
      return null;
    }

    if (!NON_PROMOTE_DECISIONS.has(candidate.decision)) {
      return this.block(
        'N4_DELEGATED_DECISION_SCHEMA_VERSION_INVALID',
        'N4 delegated decision candidate carries an unsupported decision.',
        { decision: candidate.decision },
      );
    }
    const expectedTarget = LOOPBACK_TARGET_BY_DECISION[
      candidate.decision as typeof TOPIC_SELECTION_NON_PROMOTE_DECISIONS[number]
    ];
    if (candidate.loopback_target !== expectedTarget) {
      return this.block(
        'N4_DELEGATED_DECISION_LOOPBACK_MISMATCH',
        `${candidate.decision} delegated candidate requires loopback target ${expectedTarget}.`,
      );
    }
    if (
      candidate.required_actions.length === 0
      && handoff.required_actions.length === 0
      && candidate.decision !== 'park'
      && candidate.decision !== 'drop'
    ) {
      return this.block(
        'N4_DELEGATED_DECISION_LOOPBACK_MISMATCH',
        `${candidate.decision} delegated candidate requires required_actions from candidate or N3 gate handoff.`,
      );
    }
    if (candidate.conditions.length > 0) {
      return this.block(
        'N4_DELEGATED_DECISION_CONDITION_MISMATCH',
        'Non-promote delegated candidate cannot carry promotion conditions.',
      );
    }
    return null;
  }

  private allowedRefs(handoff: TopicSelectionPromotionGateHandoff): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      handoff.promotion_gate_check_ref,
      handoff.promotion_decision_support_ref,
      handoff.promotion_dossier_ref,
      handoff.argument_readiness_mini_check_ref,
      handoff.promotion_input_snapshot_ref,
      ...handoff.required_actions.flatMap((action) => action.refs),
      ...handoff.loopback_hints.flatMap((hint) => [
        ...hint.refs,
        ...hint.required_actions.flatMap((action) => action.refs),
      ]),
      ...handoff.accepted_risk_refs,
      ...handoff.blocker_refs,
      ...handoff.recheck_request_refs,
      ...handoff.memory_suggestion_refs,
      ...handoff.support.source_refs,
      ...handoff.support.artifact_refs,
      ...handoff.dossier.source_refs,
      ...handoff.dossier.artifact_refs,
      ...handoff.argument_readiness_mini_check.source_refs,
      ...handoff.argument_readiness_mini_check.artifact_refs,
      ...handoff.gate_check.source_refs,
      ...handoff.gate_check.artifact_refs,
    ]);
  }

  private findForbiddenAuthorityKey(value: unknown): string | null {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.findForbiddenAuthorityKey(item);
        if (found) {
          return found;
        }
      }
      return null;
    }
    const record = this.asRecord(value);
    if (!record) {
      return null;
    }
    for (const key of Object.keys(record)) {
      if (FORBIDDEN_AUTHORITY_KEYS.includes(key as never)) {
        return key;
      }
      const found = this.findForbiddenAuthorityKey(record[key]);
      if (found) {
        return found;
      }
    }
    return null;
  }

  private findOutOfBoundsRef(value: unknown, allowedRefKeys: Set<string>): unknown | null {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.findOutOfBoundsRef(item, allowedRefKeys);
        if (found) {
          return found;
        }
      }
      return null;
    }
    const record = this.asRecord(value);
    if (!record) {
      return null;
    }
    if (typeof record.ref_type === 'string' && typeof record.ref_id === 'string') {
      return allowedRefKeys.has(this.refKey(record)) ? null : record;
    }
    for (const item of Object.values(record)) {
      const found = this.findOutOfBoundsRef(item, allowedRefKeys);
      if (found) {
        return found;
      }
    }
    return null;
  }

  private refsEqual(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
    return this.refKey(left) === this.refKey(right);
  }

  private refKey(value: unknown): string {
    const ref = this.asRecord(value);
    return stableStringify({
      ref_type: this.stringValue(ref?.ref_type) ?? null,
      ref_id: this.stringValue(ref?.ref_id) ?? null,
      version_id: this.stringValue(ref?.version_id) ?? null,
      title_card_id: this.stringValue(ref?.title_card_id) ?? null,
    });
  }

  private uniqueRefs(values: Array<TopicSelectionFunctionalRef | null | undefined>): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const refs: TopicSelectionFunctionalRef[] = [];
    for (const ref of values) {
      if (!ref) {
        continue;
      }
      const key = this.refKey(ref);
      if (!seen.has(key)) {
        seen.add(key);
        refs.push(ref);
      }
    }
    return refs;
  }

  private recordEqual(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
    return stableStringify(left) === stableStringify(right);
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }

  private block(
    code: TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionBlockerCode,
    message: string,
    details?: Record<string, unknown>,
  ): TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionResult {
    return {
      admitted: false,
      blocker: { code, message, details },
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private nonEmptyString(value: unknown): boolean {
    return this.stringValue(value) !== null;
  }
}
