import type {
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
  TopicSelectionPromotionDecisionSupportLlmDraft,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-gate-contracts';
import type {
  TopicSelectionPromotionInputSnapshotHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-input-contracts';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

export const TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER = [
  'n2_bounded_micro_debate.promotion_supporter_draft',
  'n2_bounded_micro_debate.reviewer_critic_review',
  'n2_bounded_micro_debate.promotion_supporter_repair',
  'n2_bounded_micro_debate.synthesizer_final',
] as const;

export type TopicSelectionV1cN2BoundedDebateRoleSlotId =
  (typeof TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER)[number];

/** Frozen role-output schema_version values for v1c N2 bounded-debate outputs. UNLIKE N6/N8 (where a
 *  single role-output schema_version equals the artifact output_contract), v1c-N2's `RoleOrFinal` union
 *  discriminates the per-turn role outputs (`…-role.v1`) from the synthesizer final (`…-final.v1`) via
 *  schema_version, while the artifact `output_contract` stays the union literal
 *  `TopicSelectionV1cBoundedMicroDebateRoleOrFinal@v1`. These are the values the production builder
 *  (`topic-selection-provider-canary-service`) and the runtime emit; admission pins PER ROLE CLASS so a
 *  role output carrying a wrong/missing schema_version (or a final/role version swap) cannot be admitted. */
export const TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION =
  'topic-selection-v1c-n2-bounded-micro-debate-role.v1' as const;
export const TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_FINAL_OUTPUT_SCHEMA_VERSION =
  'topic-selection-v1c-n2-bounded-micro-debate-final.v1' as const;
const N2_FINAL_SLOT_ID = 'n2_bounded_micro_debate.synthesizer_final' as const;

export type TopicSelectionV1cN2BoundedDebateRoleOutput =
  Record<string, unknown> & {
    schema_version: string;
    role_slot: TopicSelectionV1cN2BoundedDebateRoleSlotId;
  };

export interface TopicSelectionV1cN2BoundedDebateRoleArtifact {
  slot_id: TopicSelectionV1cN2BoundedDebateRoleSlotId;
  node_id: 'topic-selection.v1c.generate-promotion-support.v1';
  workflow_run_id: string;
  node_attempt_id: string;
  policy_version: string;
  execution_mode: TopicSelectionAgentExecutionMode;
  run_mode: TopicSelectionAgentRunMode;
  allowed_effect: 'support_only';
  role_artifact_ref: TopicSelectionFunctionalRef;
  role_artifact_hash: string;
  normalized_output_ref: TopicSelectionFunctionalRef;
  normalized_output_hash: string;
  output_contract: 'TopicSelectionV1cBoundedMicroDebateRoleOrFinal@v1';
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
  prior_role_artifact_hashes: Partial<Record<TopicSelectionV1cN2BoundedDebateRoleSlotId, string>>;
  runtime_audit_ref: TopicSelectionFunctionalRef | null;
  runtime_audit_hash: string | null;
  provenance_ref: TopicSelectionFunctionalRef;
  runtime_provenance_class: 'runtime_verified' | 'fixture_replay' | 'legacy_unverified';
  compression_report_ref: TopicSelectionFunctionalRef | null;
  compression_report_hash: string | null;
  compressed_context_hash: string | null;
}

export interface TopicSelectionV1cN2BoundedDebateAdmissionExpectedIdentity {
  slot_id: TopicSelectionV1cN2BoundedDebateRoleSlotId;
  output_contract: 'TopicSelectionV1cBoundedMicroDebateRoleOrFinal@v1';
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  prompt_variant_key: string;
  prompt_packet_hash: string | null;
  runtime_invocation_context_hash: string;
  redaction_policy: string;
  source_hashes: Record<string, string>;
  prior_role_artifact_hashes: Partial<Record<TopicSelectionV1cN2BoundedDebateRoleSlotId, string>>;
  normalized_payload_hash: string;
}

export type TopicSelectionV1cN2BoundedDebateAdmissionBlockerCode =
  | 'N2_BOUNDED_DEBATE_REQUIRED_ROLE_MISSING'
  | 'N2_BOUNDED_DEBATE_ROLE_ORDER_INVALID'
  | 'N2_BOUNDED_DEBATE_ROLE_OUTPUT_MISMATCH'
  | 'N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION'
  | 'N2_BOUNDED_DEBATE_FORBIDDEN_AUTHORITY_FIELD'
  | 'N2_BOUNDED_DEBATE_REF_OUT_OF_BOUNDS'
  | 'N2_BOUNDED_DEBATE_ARTIFACT_PROFILE_DRIFT'
  | 'N2_BOUNDED_DEBATE_ARTIFACT_PROMPT_DRIFT'
  | 'N2_BOUNDED_DEBATE_ARTIFACT_RUNTIME_CONTEXT_DRIFT'
  | 'N2_BOUNDED_DEBATE_SOURCE_HASH_DRIFT'
  | 'N2_BOUNDED_DEBATE_PRIOR_ROLE_HASH_DRIFT'
  | 'N2_BOUNDED_DEBATE_ARTIFACT_PAYLOAD_HASH_MISMATCH'
  | 'N2_BOUNDED_DEBATE_FINAL_SEMANTIC_LAYER_INCOMPLETE'
  | 'N2_BOUNDED_DEBATE_CRITIC_FINDING_UNRESOLVED'
  | 'N2_BOUNDED_DEBATE_REQUIRED_REF_DROPPED';

export interface TopicSelectionV1cN2BoundedDebateAdmissionIssue {
  code: TopicSelectionV1cN2BoundedDebateAdmissionBlockerCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate {
  artifact: TopicSelectionV1cN2BoundedDebateRoleArtifact;
  structured_output: TopicSelectionV1cN2BoundedDebateRoleOutput;
}

export interface TopicSelectionV1cN2BoundedDebateAdmissionInput {
  handoff: TopicSelectionPromotionInputSnapshotHandoff;
  role_results: TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate[];
}

export type TopicSelectionV1cN2BoundedDebateAdmissionExpectedIdentityBuilder = {
  buildAdmissionExpectedIdentity(input: {
    handoff: TopicSelectionPromotionInputSnapshotHandoff;
    slot_id: TopicSelectionV1cN2BoundedDebateRoleSlotId;
    prior_role_artifacts?: TopicSelectionV1cN2BoundedDebateRoleArtifact[];
    workflow_run_id: string;
    node_attempt_id: string;
    policy_version?: string | null;
    execution_mode: TopicSelectionAgentExecutionMode;
    run_mode: TopicSelectionAgentRunMode;
    model_option_id?: string | null;
    normalized_payload_hash: string;
  }): TopicSelectionV1cN2BoundedDebateAdmissionExpectedIdentity;
};

export interface TopicSelectionV1cN2BoundedDebateAdmissionIdentity {
  schema_version: 'topic-selection-v1c-n2-bounded-debate-admission-identity-v1';
  admission_policy_id: 'topic-selection.v1c.n2.bounded-micro-debate.admission.v1';
  node_id: 'topic-selection.v1c.generate-promotion-support.v1';
  allowed_effect: 'support_only';
  promotion_input_snapshot_id: string;
  promotion_input_snapshot_hash: string;
  final_slot_id: 'n2_bounded_micro_debate.synthesizer_final';
  final_role_artifact_ref: TopicSelectionFunctionalRef;
  final_role_artifact_hash: string;
  final_prompt_packet_hash: string;
  final_runtime_invocation_context_hash: string;
  final_runtime_audit_ref: TopicSelectionFunctionalRef;
  final_runtime_audit_hash: string;
  final_provenance_ref: TopicSelectionFunctionalRef;
  final_structured_output_hash: string;
  final_output_contract: 'TopicSelectionV1cBoundedMicroDebateRoleOrFinal@v1';
  final_context_policy_profile_id: string;
  final_context_policy_profile_version: string;
  final_context_policy_profile_hash: string;
  role_artifact_hashes: Record<TopicSelectionV1cN2BoundedDebateRoleSlotId, string>;
  role_prompt_packet_hashes: Record<TopicSelectionV1cN2BoundedDebateRoleSlotId, string>;
  source_hashes: Record<string, string>;
  prior_role_artifact_hashes: Partial<Record<TopicSelectionV1cN2BoundedDebateRoleSlotId, string>>;
}

export type TopicSelectionV1cN2BoundedDebateAdmissionResult =
  | {
    admitted: true;
    final_artifact: TopicSelectionV1cN2BoundedDebateRoleArtifact;
    final_output: TopicSelectionV1cN2BoundedDebateRoleOutput;
    promotion_support_draft: TopicSelectionPromotionDecisionSupportLlmDraft;
    admission_identity: TopicSelectionV1cN2BoundedDebateAdmissionIdentity;
    admission_identity_hash: string;
    warnings: string[];
  }
  | {
    admitted: false;
    blocker: TopicSelectionV1cN2BoundedDebateAdmissionIssue;
  };

const FORBIDDEN_AUTHORITY_KEYS = [
  'disposition',
  'gate_disposition',
  'promote_allowed',
  'promotion_decision_id',
  'promotion_decision',
  'human_promotion_decision_id',
  'paper_project_bridge_id',
  'paper_project_bridge',
  'paper_project_id',
  'work_order_id',
  'workorder',
  'downstream_feedback_id',
  'recheck_request_id',
] as const;

const FINAL_SEMANTIC_LAYER_KEYS = [
  'claim_ceiling_alignment',
  'contribution_summary',
  'evaluation_plan_summary',
  'evidence_support_map',
  'accepted_risk_acknowledgements',
  'recheck_obligation_summary',
  'critic_finding_resolution_map',
  'readiness_coverage_items',
] as const;

const ALLOWED_CRITIC_RESOLUTION_STATUSES = new Set([
  'accepted_and_repaired',
  'accepted_as_risk',
  'rebutted_with_refs',
]);

export class TopicSelectionV1cN2BoundedDebateAdmissionService {
  constructor(
    private readonly expectedIdentityBuilder:
      TopicSelectionV1cN2BoundedDebateAdmissionExpectedIdentityBuilder,
  ) {}

  admit(
    input: TopicSelectionV1cN2BoundedDebateAdmissionInput,
  ): TopicSelectionV1cN2BoundedDebateAdmissionResult {
    const bySlot = new Map<TopicSelectionV1cN2BoundedDebateRoleSlotId, TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate>();
    for (const result of input.role_results) {
      bySlot.set(result.artifact.slot_id, result);
    }

    for (const slot of TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER) {
      if (!bySlot.has(slot)) {
        return this.block(
          'N2_BOUNDED_DEBATE_REQUIRED_ROLE_MISSING',
          `Required N2 bounded debate role ${slot} is missing.`,
        );
      }
    }

    const actualOrder = input.role_results.map((result) => result.artifact.slot_id);
    if (!this.sameOrder(actualOrder, TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER)) {
      return this.block(
        'N2_BOUNDED_DEBATE_ROLE_ORDER_INVALID',
        'N2 bounded debate role artifacts must be admitted in the canonical four-role order.',
        { actual_order: actualOrder },
      );
    }

    const allowedRefKeys = new Set(this.allowedRefs(input.handoff).map((ref) => this.refKey(ref)));
    const priorRoleArtifacts: TopicSelectionV1cN2BoundedDebateRoleArtifact[] = [];
    for (const slot of TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER) {
      const candidate = bySlot.get(slot)!;
      const expected = this.expectedIdentityBuilder.buildAdmissionExpectedIdentity({
        handoff: input.handoff,
        slot_id: slot,
        prior_role_artifacts: priorRoleArtifacts,
        workflow_run_id: candidate.artifact.workflow_run_id,
        node_attempt_id: candidate.artifact.node_attempt_id,
        policy_version: candidate.artifact.policy_version,
        execution_mode: candidate.artifact.execution_mode,
        run_mode: candidate.artifact.run_mode,
        model_option_id: candidate.artifact.model_option_id,
        normalized_payload_hash: this.hash(candidate.structured_output),
      });
      const artifactCheck = this.validateArtifactIdentity(candidate, expected);
      if (artifactCheck) {
        return artifactCheck;
      }
      if (candidate.structured_output.role_slot !== slot) {
        return this.block(
          'N2_BOUNDED_DEBATE_ROLE_OUTPUT_MISMATCH',
          'N2 bounded debate role output role_slot does not match its runtime slot.',
          { slot, actual_role_slot: candidate.structured_output.role_slot },
        );
      }
      // v1c-N2's RoleOrFinal union discriminates per-turn role outputs from the synthesizer final via
      // schema_version, so admission pins PER ROLE CLASS (final slot -> final version, else role version).
      // The orchestrator schema only requires a non-empty schema_version (any value) and the artifact's
      // output_contract is set by the trusted strategy — so without this check the model output's OWN
      // schema_version is never pinned, and a wrong/missing version (or a final/role swap) is admitted.
      // (Mirrors the N6 divergent-debate admission guard; levels v1c-N2 up to the same enforcement.)
      const expectedSchemaVersion = slot === N2_FINAL_SLOT_ID
        ? TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_FINAL_OUTPUT_SCHEMA_VERSION
        : TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION;
      if (candidate.structured_output.schema_version !== expectedSchemaVersion) {
        return this.block(
          'N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION',
          'N2 bounded debate role output schema_version does not match the frozen per-role-class contract version.',
          {
            slot,
            actual_schema_version: candidate.structured_output.schema_version,
            expected_schema_version: expectedSchemaVersion,
          },
        );
      }
      const forbiddenKey = this.findForbiddenAuthorityKey(candidate.structured_output);
      if (forbiddenKey) {
        return this.block(
          'N2_BOUNDED_DEBATE_FORBIDDEN_AUTHORITY_FIELD',
          'N2 bounded debate output contains a forbidden authority or downstream mutation field.',
          { slot, forbidden_key: forbiddenKey },
        );
      }
      const outOfBoundsRef = this.findOutOfBoundsRef(candidate.structured_output, allowedRefKeys);
      if (outOfBoundsRef) {
        return this.block(
          'N2_BOUNDED_DEBATE_REF_OUT_OF_BOUNDS',
          'N2 bounded debate output references a ref outside the frozen N1 handoff allowed-ref set.',
          { slot, ref: outOfBoundsRef },
        );
      }
      priorRoleArtifacts.push(candidate.artifact);
    }

    const supporterDraft = bySlot.get('n2_bounded_micro_debate.promotion_supporter_draft')!;
    const critic = bySlot.get('n2_bounded_micro_debate.reviewer_critic_review')!;
    const repair = bySlot.get('n2_bounded_micro_debate.promotion_supporter_repair')!;
    const final = bySlot.get('n2_bounded_micro_debate.synthesizer_final')!;

    const priorCheck = this.validatePriorRoleHashes({ supporterDraft, critic, repair, final });
    if (priorCheck) {
      return priorCheck;
    }

    const finalLayerCheck = this.validateFinalSemanticLayer(input.handoff, critic.structured_output, final.structured_output);
    if (finalLayerCheck) {
      return finalLayerCheck;
    }

    const admissionIdentity = this.buildAdmissionIdentity(input, {
      supporterDraft,
      critic,
      repair,
      final,
    });
    return {
      admitted: true,
      final_artifact: final.artifact,
      final_output: final.structured_output,
      promotion_support_draft: this.toPromotionSupportDraft(final.structured_output),
      admission_identity: admissionIdentity,
      admission_identity_hash: this.hash(admissionIdentity),
      warnings: [],
    };
  }

  private validateArtifactIdentity(
    candidate: TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate,
    expected: TopicSelectionV1cN2BoundedDebateAdmissionExpectedIdentity,
  ): TopicSelectionV1cN2BoundedDebateAdmissionResult | null {
    const { artifact } = candidate;
    if (artifact.runtime_provenance_class !== 'runtime_verified') {
      return this.block(
        'N2_BOUNDED_DEBATE_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
        'N2 bounded debate admission requires runtime_verified role artifacts.',
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
        'N2_BOUNDED_DEBATE_ARTIFACT_PROFILE_DRIFT',
        'N2 bounded debate role artifact profile identity does not match expected runtime identity.',
      );
    }
    if (
      artifact.prompt_variant_key !== expected.prompt_variant_key
      || !expected.prompt_packet_hash
      || artifact.prompt_packet_hash !== expected.prompt_packet_hash
    ) {
      return this.block(
        'N2_BOUNDED_DEBATE_ARTIFACT_PROMPT_DRIFT',
        'N2 bounded debate role artifact prompt identity does not match expected prompt packet.',
      );
    }
    if (
      artifact.runtime_invocation_context_hash !== expected.runtime_invocation_context_hash
      || !artifact.runtime_audit_ref
      || !artifact.runtime_audit_hash
      || !this.refsEqual(artifact.provenance_ref, artifact.runtime_audit_ref)
    ) {
      return this.block(
        'N2_BOUNDED_DEBATE_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
        'N2 bounded debate role artifact runtime invocation or audit identity is incomplete.',
      );
    }
    if (
      artifact.normalized_output_hash !== expected.normalized_payload_hash
      || artifact.structured_output_hash !== expected.normalized_payload_hash
      || artifact.role_artifact_hash !== expected.normalized_payload_hash
    ) {
      return this.block(
        'N2_BOUNDED_DEBATE_ARTIFACT_PAYLOAD_HASH_MISMATCH',
        'N2 bounded debate role artifact payload hash does not match normalized output hash.',
      );
    }
    if (!this.recordEqual(artifact.source_hashes, expected.source_hashes)) {
      return this.block(
        'N2_BOUNDED_DEBATE_SOURCE_HASH_DRIFT',
        'N2 bounded debate role artifact source hashes do not match expected frozen input lineage.',
      );
    }
    if (!this.recordEqual(artifact.prior_role_artifact_hashes, expected.prior_role_artifact_hashes)) {
      return this.block(
        'N2_BOUNDED_DEBATE_PRIOR_ROLE_HASH_DRIFT',
        'N2 bounded debate role artifact prior-role hashes do not match expected dynamic material.',
      );
    }
    return null;
  }

  private buildAdmissionIdentity(
    input: TopicSelectionV1cN2BoundedDebateAdmissionInput,
    candidates: {
      supporterDraft: TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate;
      critic: TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate;
      repair: TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate;
      final: TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate;
    },
  ): TopicSelectionV1cN2BoundedDebateAdmissionIdentity {
    const bySlot = {
      'n2_bounded_micro_debate.promotion_supporter_draft': candidates.supporterDraft.artifact,
      'n2_bounded_micro_debate.reviewer_critic_review': candidates.critic.artifact,
      'n2_bounded_micro_debate.promotion_supporter_repair': candidates.repair.artifact,
      'n2_bounded_micro_debate.synthesizer_final': candidates.final.artifact,
    };
    const finalArtifact = candidates.final.artifact;
    return {
      schema_version: 'topic-selection-v1c-n2-bounded-debate-admission-identity-v1',
      admission_policy_id: 'topic-selection.v1c.n2.bounded-micro-debate.admission.v1',
      node_id: TOPIC_SELECTION_V1C_NODE_ID.n2_generate_promotion_support,
      allowed_effect: 'support_only',
      promotion_input_snapshot_id: input.handoff.promotion_input_snapshot_id,
      promotion_input_snapshot_hash: input.handoff.snapshot_hashes.promotion_input_snapshot_hash,
      final_slot_id: 'n2_bounded_micro_debate.synthesizer_final',
      final_role_artifact_ref: finalArtifact.role_artifact_ref,
      final_role_artifact_hash: finalArtifact.role_artifact_hash,
      final_prompt_packet_hash: finalArtifact.prompt_packet_hash,
      final_runtime_invocation_context_hash: finalArtifact.runtime_invocation_context_hash,
      final_runtime_audit_ref: finalArtifact.runtime_audit_ref!,
      final_runtime_audit_hash: finalArtifact.runtime_audit_hash!,
      final_provenance_ref: finalArtifact.provenance_ref,
      final_structured_output_hash: finalArtifact.structured_output_hash,
      final_output_contract: finalArtifact.output_contract,
      final_context_policy_profile_id: finalArtifact.context_policy_profile_id,
      final_context_policy_profile_version: finalArtifact.context_policy_profile_version,
      final_context_policy_profile_hash: finalArtifact.context_policy_profile_hash,
      role_artifact_hashes: {
        'n2_bounded_micro_debate.promotion_supporter_draft':
          bySlot['n2_bounded_micro_debate.promotion_supporter_draft'].role_artifact_hash,
        'n2_bounded_micro_debate.reviewer_critic_review':
          bySlot['n2_bounded_micro_debate.reviewer_critic_review'].role_artifact_hash,
        'n2_bounded_micro_debate.promotion_supporter_repair':
          bySlot['n2_bounded_micro_debate.promotion_supporter_repair'].role_artifact_hash,
        'n2_bounded_micro_debate.synthesizer_final':
          bySlot['n2_bounded_micro_debate.synthesizer_final'].role_artifact_hash,
      },
      role_prompt_packet_hashes: {
        'n2_bounded_micro_debate.promotion_supporter_draft':
          bySlot['n2_bounded_micro_debate.promotion_supporter_draft'].prompt_packet_hash,
        'n2_bounded_micro_debate.reviewer_critic_review':
          bySlot['n2_bounded_micro_debate.reviewer_critic_review'].prompt_packet_hash,
        'n2_bounded_micro_debate.promotion_supporter_repair':
          bySlot['n2_bounded_micro_debate.promotion_supporter_repair'].prompt_packet_hash,
        'n2_bounded_micro_debate.synthesizer_final':
          bySlot['n2_bounded_micro_debate.synthesizer_final'].prompt_packet_hash,
      },
      source_hashes: finalArtifact.source_hashes,
      prior_role_artifact_hashes: finalArtifact.prior_role_artifact_hashes,
    };
  }

  private validatePriorRoleHashes(input: {
    supporterDraft: TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate;
    critic: TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate;
    repair: TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate;
    final: TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate;
  }): TopicSelectionV1cN2BoundedDebateAdmissionResult | null {
    if (
      input.critic.artifact.prior_role_artifact_hashes[
        'n2_bounded_micro_debate.promotion_supporter_draft'
      ] !== input.supporterDraft.artifact.role_artifact_hash
    ) {
      return this.block(
        'N2_BOUNDED_DEBATE_PRIOR_ROLE_HASH_DRIFT',
        'N2 critic role must bind the supporter draft artifact hash.',
      );
    }
    if (
      input.repair.artifact.prior_role_artifact_hashes[
        'n2_bounded_micro_debate.reviewer_critic_review'
      ] !== input.critic.artifact.role_artifact_hash
    ) {
      return this.block(
        'N2_BOUNDED_DEBATE_PRIOR_ROLE_HASH_DRIFT',
        'N2 repair role must bind the critic review artifact hash.',
      );
    }
    for (const prior of [input.supporterDraft, input.critic, input.repair]) {
      if (input.final.artifact.prior_role_artifact_hashes[prior.artifact.slot_id] !== prior.artifact.role_artifact_hash) {
        return this.block(
          'N2_BOUNDED_DEBATE_PRIOR_ROLE_HASH_DRIFT',
          'N2 synthesizer final role must bind all prior role artifact hashes.',
        );
      }
    }
    return null;
  }

  private validateFinalSemanticLayer(
    handoff: TopicSelectionPromotionInputSnapshotHandoff,
    criticOutput: TopicSelectionV1cN2BoundedDebateRoleOutput,
    finalOutput: TopicSelectionV1cN2BoundedDebateRoleOutput,
  ): TopicSelectionV1cN2BoundedDebateAdmissionResult | null {
    const layer = this.asRecord(finalOutput.n3_semantic_layer);
    if (!layer) {
      return this.block(
        'N2_BOUNDED_DEBATE_FINAL_SEMANTIC_LAYER_INCOMPLETE',
        'N2 synthesizer final output must include an N3-readable semantic layer.',
      );
    }
    for (const key of FINAL_SEMANTIC_LAYER_KEYS) {
      if (!(key in layer)) {
        return this.block(
          'N2_BOUNDED_DEBATE_FINAL_SEMANTIC_LAYER_INCOMPLETE',
          `N2 synthesizer final semantic layer is missing ${key}.`,
        );
      }
    }
    if (!this.nonEmptyString(finalOutput.final_support_summary) && !this.nonEmptyString(finalOutput.support_summary)) {
      return this.block(
        'N2_BOUNDED_DEBATE_FINAL_SEMANTIC_LAYER_INCOMPLETE',
        'N2 synthesizer final output must include a support summary.',
      );
    }
    if (!this.nonEmptyString(finalOutput.dossier_markdown)) {
      return this.block(
        'N2_BOUNDED_DEBATE_FINAL_SEMANTIC_LAYER_INCOMPLETE',
        'N2 synthesizer final output must include dossier markdown.',
      );
    }

    const criticFindingIds = this.criticFindingIds(criticOutput);
    const resolutionMap = this.asArray(layer.critic_finding_resolution_map);
    const resolved = new Set<string>();
    for (const item of resolutionMap) {
      const record = this.asRecord(item);
      const findingId = this.stringValue(record?.finding_id);
      const status = this.stringValue(record?.resolution_status);
      if (!findingId || !status || !ALLOWED_CRITIC_RESOLUTION_STATUSES.has(status)) {
        return this.block(
          'N2_BOUNDED_DEBATE_CRITIC_FINDING_UNRESOLVED',
          'N2 synthesizer final critic resolution map has an invalid finding id or resolution status.',
        );
      }
      resolved.add(findingId);
    }
    const unresolved = criticFindingIds.filter((findingId) => !resolved.has(findingId));
    if (unresolved.length > 0) {
      return this.block(
        'N2_BOUNDED_DEBATE_CRITIC_FINDING_UNRESOLVED',
        'N2 synthesizer final did not resolve every critic finding.',
        { unresolved },
      );
    }

    const acceptedRiskLayer = this.asRecord(layer.accepted_risk_acknowledgements);
    const riskRefKeys = new Set(this.asArray(acceptedRiskLayer?.risk_refs).map((ref) => this.refKey(ref)));
    const missingRiskRefs = handoff.accepted_risk_refs.filter((ref) => !riskRefKeys.has(this.refKey(ref)));
    if (missingRiskRefs.length > 0) {
      return this.block(
        'N2_BOUNDED_DEBATE_REQUIRED_REF_DROPPED',
        'N2 synthesizer final dropped accepted risk refs.',
        { missing_risk_refs: missingRiskRefs },
      );
    }

    const recheckLayer = this.asRecord(layer.recheck_obligation_summary);
    const recheckRefKeys = new Set(this.asArray(recheckLayer?.recheck_refs).map((ref) => this.refKey(ref)));
    const missingRecheckRefs = handoff.recheck_request_refs.filter((ref) => !recheckRefKeys.has(this.refKey(ref)));
    if (missingRecheckRefs.length > 0) {
      return this.block(
        'N2_BOUNDED_DEBATE_REQUIRED_REF_DROPPED',
        'N2 synthesizer final dropped recheck refs.',
        { missing_recheck_refs: missingRecheckRefs },
      );
    }

    return null;
  }

  private criticFindingIds(output: TopicSelectionV1cN2BoundedDebateRoleOutput): string[] {
    return this.asArray(output.critic_findings)
      .map((item) => this.stringValue(this.asRecord(item)?.finding_id))
      .filter((value): value is string => Boolean(value));
  }

  private toPromotionSupportDraft(
    finalOutput: TopicSelectionV1cN2BoundedDebateRoleOutput,
  ): TopicSelectionPromotionDecisionSupportLlmDraft {
    return {
      summary: this.stringValue(finalOutput.final_support_summary)
        ?? this.stringValue(finalOutput.support_summary)
        ?? null,
      reviewer_questions: this.toTextArray(finalOutput.reviewer_questions),
      risk_notes: this.toTextArray(finalOutput.risk_notes),
      recheck_notes: this.toTextArray(finalOutput.recheck_notes),
      dossier_markdown: this.stringValue(finalOutput.dossier_markdown) ?? null,
      n3_semantic_layer: this.asRecord(finalOutput.n3_semantic_layer),
    };
  }

  private allowedRefs(handoff: TopicSelectionPromotionInputSnapshotHandoff): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      handoff.promotion_input_snapshot_ref,
      handoff.topic_package_ref,
      handoff.package_trace_boundary_check_ref,
      handoff.package_readiness_assessment_ref,
      handoff.topic_value_assessment_ref,
      handoff.value_reasoning_memo_ref,
      handoff.value_disposition_decision_ref,
      handoff.topic_question_ref,
      handoff.topic_question_contract_ref,
      handoff.answerability_plan_ref,
      handoff.research_slice_ref,
      ...handoff.validated_need_refs,
      ...handoff.evidence_refs.map((item) => item.evidence_ref),
      ...handoff.accepted_risk_refs,
      ...handoff.blocker_refs,
      ...handoff.memory_suggestion_refs,
      ...handoff.recheck_request_refs,
      ...handoff.readiness_check_refs,
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

  private toTextArray(value: unknown): string[] {
    return this.asArray(value)
      .map((item) => this.stringValue(item) ?? stableStringify(item))
      .filter((item) => item.trim().length > 0);
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

  private sameOrder(
    actual: readonly TopicSelectionV1cN2BoundedDebateRoleSlotId[],
    expected: readonly TopicSelectionV1cN2BoundedDebateRoleSlotId[],
  ): boolean {
    return actual.length === expected.length && expected.every((slot, index) => actual[index] === slot);
  }

  private recordEqual(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
    return stableStringify(left) === stableStringify(right);
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }

  private uniqueRefs(values: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const refs: TopicSelectionFunctionalRef[] = [];
    for (const ref of values) {
      const key = this.refKey(ref);
      if (!seen.has(key)) {
        seen.add(key);
        refs.push(ref);
      }
    }
    return refs;
  }

  private block(
    code: TopicSelectionV1cN2BoundedDebateAdmissionBlockerCode,
    message: string,
    details?: Record<string, unknown>,
  ): TopicSelectionV1cN2BoundedDebateAdmissionResult {
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

  private asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private nonEmptyString(value: unknown): boolean {
    return this.stringValue(value) !== null;
  }
}
