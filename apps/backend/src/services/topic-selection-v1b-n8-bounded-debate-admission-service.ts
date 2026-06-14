// T-123 Phase 3 (STEP 8) — deterministic admission for the v1b N8 bounded-debate role chain.
// Validates the 4-role sequence (order, per-role runtime identity drift, prior-role hash chain,
// support-only / forbidden-authority boundary, critic→repair resolution, loop transcript) and
// surfaces the synthesizer's assessment_draft for the gate bridge. It does NOT re-validate the
// value-assessment SEMANTICS — that stays with the existing deterministic N8 gate, which the
// synthesizer draft is funnelled through (single-agent identity) by the runtime's gate bridge.

import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionAgentExecutionMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionAgentRunMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import {
  TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER,
  type TopicSelectionV1bN8BoundedDebateRolePayload,
  type TopicSelectionV1bN8BoundedDebateRoleSlotId,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import { stableStringify } from './literature-content-processing-utils.js';

const N8_NODE_ID = 'topic-selection.v1b.assess-topic-value.v1' as const;
const N8_DEBATE_OUTPUT_CONTRACT = 'TopicSelectionV1bN8BoundedDebateRoleOutput@v1' as const;
const SYNTHESIZER_SLOT = 'n8_debate_synthesizer_final' as const;
const CRITIC_SLOT = 'n8_debate_value_critic' as const;
const REPAIR_SLOT = 'n8_debate_assessor_repair' as const;
const DRAFT_SLOT = 'n8_debate_assessor_draft' as const;

/** The core's TOut for v1b N8 debate roles (index-signature form so it satisfies the generic). */
export type TopicSelectionV1bN8BoundedDebateRoleOutput =
  Record<string, unknown> & {
    schema_version: string;
    role_slot: TopicSelectionV1bN8BoundedDebateRoleSlotId;
  };

export interface TopicSelectionV1bN8BoundedDebateRoleArtifact {
  slot_id: TopicSelectionV1bN8BoundedDebateRoleSlotId;
  node_id: typeof N8_NODE_ID;
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
  output_contract: typeof N8_DEBATE_OUTPUT_CONTRACT;
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
  prior_role_artifact_hashes: Partial<Record<TopicSelectionV1bN8BoundedDebateRoleSlotId, string>>;
  runtime_audit_ref: TopicSelectionFunctionalRef | null;
  runtime_audit_hash: string | null;
  provenance_ref: TopicSelectionFunctionalRef;
  runtime_provenance_class: 'runtime_verified' | 'fixture_replay' | 'legacy_unverified';
  compression_report_ref: TopicSelectionFunctionalRef | null;
  compression_report_hash: string | null;
  compressed_context_hash: string | null;
}

export interface TopicSelectionV1bN8BoundedDebateAdmissionExpectedIdentity {
  slot_id: TopicSelectionV1bN8BoundedDebateRoleSlotId;
  output_contract: typeof N8_DEBATE_OUTPUT_CONTRACT;
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  prompt_variant_key: string;
  prompt_packet_hash: string | null;
  runtime_invocation_context_hash: string;
  redaction_policy: string;
  source_hashes: Record<string, string>;
  prior_role_artifact_hashes: Partial<Record<TopicSelectionV1bN8BoundedDebateRoleSlotId, string>>;
  normalized_payload_hash: string;
}

export type TopicSelectionV1bN8BoundedDebateAdmissionBlockerCode =
  | 'N8_BOUNDED_DEBATE_REQUIRED_ROLE_MISSING'
  | 'N8_BOUNDED_DEBATE_ROLE_ORDER_INVALID'
  | 'N8_BOUNDED_DEBATE_ROLE_OUTPUT_MISMATCH'
  | 'N8_BOUNDED_DEBATE_FORBIDDEN_AUTHORITY_FIELD'
  | 'N8_BOUNDED_DEBATE_ARTIFACT_PROFILE_DRIFT'
  | 'N8_BOUNDED_DEBATE_ARTIFACT_PROMPT_DRIFT'
  | 'N8_BOUNDED_DEBATE_ARTIFACT_RUNTIME_CONTEXT_DRIFT'
  | 'N8_BOUNDED_DEBATE_SOURCE_HASH_DRIFT'
  | 'N8_BOUNDED_DEBATE_PRIOR_ROLE_HASH_DRIFT'
  | 'N8_BOUNDED_DEBATE_ARTIFACT_PAYLOAD_HASH_MISMATCH'
  | 'N8_BOUNDED_DEBATE_LOOP_TRANSCRIPT_DRIFT'
  | 'N8_BOUNDED_DEBATE_CRITIC_FINDING_UNRESOLVED'
  | 'N8_BOUNDED_DEBATE_FINAL_DRAFT_MISSING';

export interface TopicSelectionV1bN8BoundedDebateAdmissionIssue {
  code: TopicSelectionV1bN8BoundedDebateAdmissionBlockerCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate {
  artifact: TopicSelectionV1bN8BoundedDebateRoleArtifact;
  structured_output: TopicSelectionV1bN8BoundedDebateRoleOutput;
}

export type TopicSelectionV1bN8BoundedDebateAdmissionExpectedIdentityBuilder = {
  buildAdmissionExpectedIdentity(input: {
    slot_id: TopicSelectionV1bN8BoundedDebateRoleSlotId;
    prior_role_artifacts: TopicSelectionV1bN8BoundedDebateRoleArtifact[];
    workflow_run_id: string;
    node_attempt_id: string;
    policy_version: string;
    execution_mode: TopicSelectionAgentExecutionMode;
    run_mode: TopicSelectionAgentRunMode;
    model_option_id: string | null;
    normalized_payload_hash: string;
  }): Promise<TopicSelectionV1bN8BoundedDebateAdmissionExpectedIdentity>;
};

export interface TopicSelectionV1bN8BoundedDebateAdmissionInput {
  role_results: TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate[];
  /** The whole-loop identity the runtime folded (debate_loop_id, role_order, ordered role hashes). */
  loop_transcript_hash: string;
}

export interface TopicSelectionV1bN8BoundedDebateAdmissionIdentity {
  schema_version: 'topic-selection-v1b-n8-bounded-debate-admission-identity-v1';
  admission_policy_id: 'topic-selection.v1b.n8.bounded-micro-debate.admission.v1';
  node_id: typeof N8_NODE_ID;
  allowed_effect: 'support_only';
  final_slot_id: typeof SYNTHESIZER_SLOT;
  final_role_artifact_ref: TopicSelectionFunctionalRef;
  final_role_artifact_hash: string;
  final_prompt_packet_hash: string;
  final_runtime_invocation_context_hash: string;
  final_runtime_audit_ref: TopicSelectionFunctionalRef;
  final_runtime_audit_hash: string;
  final_provenance_ref: TopicSelectionFunctionalRef;
  final_structured_output_hash: string;
  final_output_contract: typeof N8_DEBATE_OUTPUT_CONTRACT;
  role_artifact_hashes: Record<TopicSelectionV1bN8BoundedDebateRoleSlotId, string>;
  role_prompt_packet_hashes: Record<TopicSelectionV1bN8BoundedDebateRoleSlotId, string>;
  loop_transcript_hash: string;
  source_hashes: Record<string, string>;
  prior_role_artifact_hashes: Partial<Record<TopicSelectionV1bN8BoundedDebateRoleSlotId, string>>;
}

export type TopicSelectionV1bN8BoundedDebateAdmissionResult =
  | {
    admitted: true;
    final_artifact: TopicSelectionV1bN8BoundedDebateRoleArtifact;
    final_output: TopicSelectionV1bN8BoundedDebateRoleOutput;
    /** The TopicValueAssessmentDraft@v1 payload the gate bridge funnels through the N8 gate. */
    assessment_draft: Record<string, unknown>;
    admission_identity: TopicSelectionV1bN8BoundedDebateAdmissionIdentity;
    admission_identity_hash: string;
    warnings: string[];
  }
  | {
    admitted: false;
    blocker: TopicSelectionV1bN8BoundedDebateAdmissionIssue;
  };

// Debate role outputs are non-authority support; they must never carry N8 authority / downstream
// mutation fields (the deterministic gate + the harness own those).
const FORBIDDEN_AUTHORITY_KEYS = [
  'topic_value_assessment_id',
  'topic_value_assessment_ref',
  'value_reasoning_memo_id',
  'value_reasoning_memo_ref',
  'n8_to_n9_handoff',
  'n8_to_n7_feedback',
  'value_disposition',
  'value_disposition_decision_id',
  'route_decision',
  'gate_status',
  'created_authority_refs',
  'trial_ledger_update',
  'candidate_mutation',
] as const;

export class TopicSelectionV1bN8BoundedDebateAdmissionService {
  constructor(
    private readonly expectedIdentityBuilder:
      TopicSelectionV1bN8BoundedDebateAdmissionExpectedIdentityBuilder,
  ) {}

  async admit(
    input: TopicSelectionV1bN8BoundedDebateAdmissionInput,
  ): Promise<TopicSelectionV1bN8BoundedDebateAdmissionResult> {
    const bySlot = new Map<TopicSelectionV1bN8BoundedDebateRoleSlotId, TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate>();
    for (const result of input.role_results) {
      bySlot.set(result.artifact.slot_id, result);
    }
    for (const slot of TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER) {
      if (!bySlot.has(slot)) {
        return this.block('N8_BOUNDED_DEBATE_REQUIRED_ROLE_MISSING', `Required N8 bounded debate role ${slot} is missing.`);
      }
    }
    const actualOrder = input.role_results.map((result) => result.artifact.slot_id);
    if (!this.sameOrder(actualOrder, TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER)) {
      return this.block('N8_BOUNDED_DEBATE_ROLE_ORDER_INVALID', 'N8 bounded debate roles must be admitted in the canonical four-role order.', { actual_order: actualOrder });
    }

    const priorRoleArtifacts: TopicSelectionV1bN8BoundedDebateRoleArtifact[] = [];
    for (const slot of TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER) {
      const candidate = bySlot.get(slot)!;
      const expected = await this.expectedIdentityBuilder.buildAdmissionExpectedIdentity({
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
      const identityCheck = this.validateArtifactIdentity(candidate, expected);
      if (identityCheck) {
        return identityCheck;
      }
      if (candidate.structured_output.role_slot !== slot) {
        return this.block('N8_BOUNDED_DEBATE_ROLE_OUTPUT_MISMATCH', 'N8 bounded debate role output role_slot does not match its runtime slot.', { slot, actual_role_slot: candidate.structured_output.role_slot });
      }
      const forbiddenKey = this.findForbiddenAuthorityKey(candidate.structured_output);
      if (forbiddenKey) {
        return this.block('N8_BOUNDED_DEBATE_FORBIDDEN_AUTHORITY_FIELD', 'N8 bounded debate output contains a forbidden authority or downstream mutation field.', { slot, forbidden_key: forbiddenKey });
      }
      priorRoleArtifacts.push(candidate.artifact);
    }

    const draft = bySlot.get(DRAFT_SLOT)!;
    const critic = bySlot.get(CRITIC_SLOT)!;
    const repair = bySlot.get(REPAIR_SLOT)!;
    const final = bySlot.get(SYNTHESIZER_SLOT)!;

    const priorCheck = this.validatePriorRoleHashes({ draft, critic, repair, final });
    if (priorCheck) {
      return priorCheck;
    }

    const criticCheck = this.validateCriticResolution(critic.structured_output, repair.structured_output);
    if (criticCheck) {
      return criticCheck;
    }

    const assessmentDraft = this.asRecord((final.structured_output as TopicSelectionV1bN8BoundedDebateRolePayload).assessment_draft);
    if (!assessmentDraft) {
      return this.block('N8_BOUNDED_DEBATE_FINAL_DRAFT_MISSING', 'N8 synthesizer final output must carry the assessment_draft (TopicValueAssessmentDraft@v1) for the gate bridge.');
    }

    // The runtime folds the loop transcript over the ordered role hashes; admission re-folds and compares.
    const expectedTranscript = this.hash([
      'v1b_n8_bounded_micro_debate',
      [...TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER],
      TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER.map((slot) => bySlot.get(slot)!.artifact.role_artifact_hash),
    ]);
    if (expectedTranscript !== input.loop_transcript_hash) {
      return this.block('N8_BOUNDED_DEBATE_LOOP_TRANSCRIPT_DRIFT', 'N8 bounded debate loop transcript hash does not match the ordered role-artifact chain.');
    }

    const admissionIdentity = this.buildAdmissionIdentity(input, { draft, critic, repair, final });
    return {
      admitted: true,
      final_artifact: final.artifact,
      final_output: final.structured_output,
      assessment_draft: assessmentDraft,
      admission_identity: admissionIdentity,
      admission_identity_hash: this.hash(admissionIdentity),
      warnings: [],
    };
  }

  private validateArtifactIdentity(
    candidate: TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate,
    expected: TopicSelectionV1bN8BoundedDebateAdmissionExpectedIdentity,
  ): TopicSelectionV1bN8BoundedDebateAdmissionResult | null {
    const { artifact } = candidate;
    if (artifact.runtime_provenance_class !== 'runtime_verified') {
      return this.block('N8_BOUNDED_DEBATE_ARTIFACT_RUNTIME_CONTEXT_DRIFT', 'N8 bounded debate admission requires runtime_verified role artifacts.');
    }
    if (
      artifact.output_contract !== expected.output_contract
      || artifact.context_policy_profile_id !== expected.context_policy_profile_id
      || artifact.context_policy_profile_version !== expected.context_policy_profile_version
      || artifact.context_policy_profile_hash !== expected.context_policy_profile_hash
      || artifact.redaction_policy !== expected.redaction_policy
    ) {
      return this.block('N8_BOUNDED_DEBATE_ARTIFACT_PROFILE_DRIFT', 'N8 bounded debate role artifact profile identity does not match expected runtime identity.');
    }
    if (
      artifact.prompt_variant_key !== expected.prompt_variant_key
      || !expected.prompt_packet_hash
      || artifact.prompt_packet_hash !== expected.prompt_packet_hash
    ) {
      return this.block('N8_BOUNDED_DEBATE_ARTIFACT_PROMPT_DRIFT', 'N8 bounded debate role artifact prompt identity does not match expected prompt packet.');
    }
    if (
      artifact.runtime_invocation_context_hash !== expected.runtime_invocation_context_hash
      || !artifact.runtime_audit_ref
      || !artifact.runtime_audit_hash
      || !this.refsEqual(artifact.provenance_ref, artifact.runtime_audit_ref)
    ) {
      return this.block('N8_BOUNDED_DEBATE_ARTIFACT_RUNTIME_CONTEXT_DRIFT', 'N8 bounded debate role artifact runtime invocation or audit identity is incomplete.');
    }
    if (
      artifact.normalized_output_hash !== expected.normalized_payload_hash
      || artifact.structured_output_hash !== expected.normalized_payload_hash
      || artifact.role_artifact_hash !== expected.normalized_payload_hash
    ) {
      return this.block('N8_BOUNDED_DEBATE_ARTIFACT_PAYLOAD_HASH_MISMATCH', 'N8 bounded debate role artifact payload hash does not match normalized output hash.');
    }
    if (!this.recordEqual(artifact.source_hashes, expected.source_hashes)) {
      return this.block('N8_BOUNDED_DEBATE_SOURCE_HASH_DRIFT', 'N8 bounded debate role artifact source hashes do not match expected frozen input lineage.');
    }
    if (!this.recordEqual(artifact.prior_role_artifact_hashes, expected.prior_role_artifact_hashes)) {
      return this.block('N8_BOUNDED_DEBATE_PRIOR_ROLE_HASH_DRIFT', 'N8 bounded debate role artifact prior-role hashes do not match expected dynamic material.');
    }
    return null;
  }

  private validatePriorRoleHashes(input: {
    draft: TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate;
    critic: TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate;
    repair: TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate;
    final: TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate;
  }): TopicSelectionV1bN8BoundedDebateAdmissionResult | null {
    if (input.critic.artifact.prior_role_artifact_hashes[DRAFT_SLOT] !== input.draft.artifact.role_artifact_hash) {
      return this.block('N8_BOUNDED_DEBATE_PRIOR_ROLE_HASH_DRIFT', 'N8 critic role must bind the assessor draft artifact hash.');
    }
    if (input.repair.artifact.prior_role_artifact_hashes[CRITIC_SLOT] !== input.critic.artifact.role_artifact_hash) {
      return this.block('N8_BOUNDED_DEBATE_PRIOR_ROLE_HASH_DRIFT', 'N8 repair role must bind the value critic artifact hash.');
    }
    for (const prior of [input.draft, input.critic, input.repair]) {
      if (input.final.artifact.prior_role_artifact_hashes[prior.artifact.slot_id] !== prior.artifact.role_artifact_hash) {
        return this.block('N8_BOUNDED_DEBATE_PRIOR_ROLE_HASH_DRIFT', 'N8 synthesizer final role must bind all prior role artifact hashes.');
      }
    }
    return null;
  }

  /** Every material/blocking critic finding must be addressed by a resolved repair action. */
  private validateCriticResolution(
    criticOutput: TopicSelectionV1bN8BoundedDebateRoleOutput,
    repairOutput: TopicSelectionV1bN8BoundedDebateRoleOutput,
  ): TopicSelectionV1bN8BoundedDebateAdmissionResult | null {
    const findings = this.asArray((criticOutput as TopicSelectionV1bN8BoundedDebateRolePayload).critic_findings)
      .map((item) => this.asRecord(item))
      .filter((record): record is Record<string, unknown> => Boolean(record));
    const repairs = this.asArray((repairOutput as TopicSelectionV1bN8BoundedDebateRolePayload).repair_actions)
      .map((item) => this.asRecord(item))
      .filter((record): record is Record<string, unknown> => Boolean(record));
    const resolved = new Set<string>();
    for (const repair of repairs) {
      const code = this.stringValue(repair.finding_code);
      if (code && repair.resolved === true) {
        resolved.add(code);
      }
    }
    const unresolved = findings
      .filter((finding) => {
        const severity = this.stringValue(finding.severity);
        return severity === 'material' || severity === 'blocking';
      })
      .map((finding) => this.stringValue(finding.finding_code))
      .filter((code): code is string => Boolean(code))
      .filter((code) => !resolved.has(code));
    if (unresolved.length > 0) {
      return this.block('N8_BOUNDED_DEBATE_CRITIC_FINDING_UNRESOLVED', 'N8 bounded debate repair did not resolve every material/blocking critic finding.', { unresolved });
    }
    return null;
  }

  private buildAdmissionIdentity(
    input: TopicSelectionV1bN8BoundedDebateAdmissionInput,
    candidates: {
      draft: TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate;
      critic: TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate;
      repair: TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate;
      final: TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate;
    },
  ): TopicSelectionV1bN8BoundedDebateAdmissionIdentity {
    const finalArtifact = candidates.final.artifact;
    const artifactBySlot: Record<TopicSelectionV1bN8BoundedDebateRoleSlotId, TopicSelectionV1bN8BoundedDebateRoleArtifact> = {
      n8_debate_assessor_draft: candidates.draft.artifact,
      n8_debate_value_critic: candidates.critic.artifact,
      n8_debate_assessor_repair: candidates.repair.artifact,
      n8_debate_synthesizer_final: candidates.final.artifact,
    };
    return {
      schema_version: 'topic-selection-v1b-n8-bounded-debate-admission-identity-v1',
      admission_policy_id: 'topic-selection.v1b.n8.bounded-micro-debate.admission.v1',
      node_id: N8_NODE_ID,
      allowed_effect: 'support_only',
      final_slot_id: SYNTHESIZER_SLOT,
      final_role_artifact_ref: finalArtifact.role_artifact_ref,
      final_role_artifact_hash: finalArtifact.role_artifact_hash,
      final_prompt_packet_hash: finalArtifact.prompt_packet_hash,
      final_runtime_invocation_context_hash: finalArtifact.runtime_invocation_context_hash,
      final_runtime_audit_ref: finalArtifact.runtime_audit_ref!,
      final_runtime_audit_hash: finalArtifact.runtime_audit_hash!,
      final_provenance_ref: finalArtifact.provenance_ref,
      final_structured_output_hash: finalArtifact.structured_output_hash,
      final_output_contract: finalArtifact.output_contract,
      role_artifact_hashes: {
        n8_debate_assessor_draft: artifactBySlot.n8_debate_assessor_draft.role_artifact_hash,
        n8_debate_value_critic: artifactBySlot.n8_debate_value_critic.role_artifact_hash,
        n8_debate_assessor_repair: artifactBySlot.n8_debate_assessor_repair.role_artifact_hash,
        n8_debate_synthesizer_final: artifactBySlot.n8_debate_synthesizer_final.role_artifact_hash,
      },
      role_prompt_packet_hashes: {
        n8_debate_assessor_draft: artifactBySlot.n8_debate_assessor_draft.prompt_packet_hash,
        n8_debate_value_critic: artifactBySlot.n8_debate_value_critic.prompt_packet_hash,
        n8_debate_assessor_repair: artifactBySlot.n8_debate_assessor_repair.prompt_packet_hash,
        n8_debate_synthesizer_final: artifactBySlot.n8_debate_synthesizer_final.prompt_packet_hash,
      },
      loop_transcript_hash: input.loop_transcript_hash,
      source_hashes: finalArtifact.source_hashes,
      prior_role_artifact_hashes: finalArtifact.prior_role_artifact_hashes,
    };
  }

  private findForbiddenAuthorityKey(value: unknown): string | null {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.findForbiddenAuthorityKey(item);
        if (found) return found;
      }
      return null;
    }
    const record = this.asRecord(value);
    if (!record) return null;
    for (const key of Object.keys(record)) {
      if (FORBIDDEN_AUTHORITY_KEYS.includes(key as never)) {
        return key;
      }
      const found = this.findForbiddenAuthorityKey(record[key]);
      if (found) return found;
    }
    return null;
  }

  private block(
    code: TopicSelectionV1bN8BoundedDebateAdmissionBlockerCode,
    message: string,
    details?: Record<string, unknown>,
  ): TopicSelectionV1bN8BoundedDebateAdmissionResult {
    return { admitted: false, blocker: { code, message, ...(details ? { details } : {}) } };
  }

  private sameOrder(
    actual: readonly string[],
    expected: readonly string[],
  ): boolean {
    return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
  }

  private refsEqual(left: TopicSelectionFunctionalRef | null, right: TopicSelectionFunctionalRef | null): boolean {
    return Boolean(left && right
      && left.ref_type === right.ref_type
      && left.ref_id === right.ref_id
      && (left.version_id ?? null) === (right.version_id ?? null)
      && (left.title_card_id ?? null) === (right.title_card_id ?? null));
  }

  private recordEqual(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
    return stableStringify(left) === stableStringify(right);
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  }

  private asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private hash(value: unknown): string {
    return canonicalHash(value);
  }
}
