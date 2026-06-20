// T-127 W-07 (step f3) — deterministic admission for the v1b N6 DIVERGENT topic-question candidate
// debate (explorer -> critic -> arbiter, fan-out). Validates the fan-out instance chain (stage order,
// per-stage arity vs the frozen scenario, per-instance runtime-identity drift, prior-role hash chain,
// support-only / forbidden-authority boundary, the [slot,arity] loop transcript) and surfaces the
// arbiter's synthesized_candidate_set for the gate bridge. It does NOT re-validate candidate SEMANTICS
// — that stays with the existing deterministic N6 candidate-set gate (validateAndBuildN6Candidates),
// which the unwrapped arbiter draft is funnelled through (single-agent identity) by the runtime (f5).
//
// Mirrors the N8 bounded-debate admission (topic-selection-v1b-n8-bounded-debate-admission-service.ts)
// but is DIVERGENT: role_results is a FLAT list of instances in invocation order (e.g. explorer_0,
// explorer_1, critic_0, arbiter_0), and the transcript re-fold is over the [slot,arity] stage structure
// (NOT a flat role list) so it byte-matches core.runDivergentLoop's fold. The expected per-instance
// identity is re-derived through the SAME strategy hooks via an injected builder callback (f4), so
// re-verification is exact by construction; this is the replay backstop designed-for step h.

import { AppError } from '../errors/app-error.js';
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
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_LOOP_ID,
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER,
  type TopicSelectionV1bN6DivergentDebateBlockerCode,
  type TopicSelectionV1bN6DivergentDebateRolePayload,
  type TopicSelectionV1bN6DivergentDebateRoleSlotId,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { createTopicSelectionV1bN6DivergentDebateScenarioContract } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-debate-scenario-contracts';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import { stableStringify } from './literature-content-processing-utils.js';
import { isN6DraftPayload } from './topic-selection-v1b-harness-predicates.js';

const N6_NODE_ID = 'topic-selection.v1b.generate-topic-question-candidates.v1' as const;
const N6_DEBATE_OUTPUT_CONTRACT = 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1' as const;
const ARBITER_SLOT = 'n6_debate_arbiter' as const;

interface N6DivergentDebateInstancePolicy { min: number; max: number; default: number; }

/** Per-stage fan-out instance policy [min, max, default], single-sourced from the scenario contract's
 *  instance_policy — the SAME source the strategy's instanceCountFor reads (f4 imports the default below).
 *  CRITICAL: admission does NOT pin arity to `default`. The core folds whatever `instanceCountFor` returns
 *  into the [slot,arity] transcript (core-service.ts:296-336), and that arity is a genuine per-run VARIABLE
 *  within [min,max] (explorer is min1/max3/default2 with allow_duplicate_model_options + a diversity policy).
 *  So admission accepts any per-stage count within [min,max] and re-folds the ACTUAL arity it observes in
 *  role_results — a legitimate non-default run is admitted, never falsely rejected. */
const N6_DIVERGENT_DEBATE_INSTANCE_POLICY: Record<
  TopicSelectionV1bN6DivergentDebateRoleSlotId,
  N6DivergentDebateInstancePolicy
> = (() => {
  const scenario = createTopicSelectionV1bN6DivergentDebateScenarioContract();
  const policy = {} as Record<TopicSelectionV1bN6DivergentDebateRoleSlotId, N6DivergentDebateInstancePolicy>;
  for (const slot of TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER) {
    const stageSlot = scenario.role_stage_slots.find((item) => item.slot_id === slot);
    if (!stageSlot) {
      throw new AppError(500, 'INTERNAL_ERROR', `N6 divergent debate scenario is missing role stage slot ${slot}.`);
    }
    policy[slot] = {
      min: stageSlot.instance_policy.min_instances,
      max: stageSlot.instance_policy.max_instances,
      default: stageSlot.instance_policy.default_instances,
    };
  }
  return policy;
})();

/** Default per-stage fan-out arity (instance_policy.default_instances) — the arity the strategy's
 *  instanceCountFor returns absent a frozen per-run override. f4 imports this for its default; admission
 *  validates against [min,max] (above), NOT against this default. */
export const TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_DEFAULT_INSTANCE_COUNTS: Record<
  TopicSelectionV1bN6DivergentDebateRoleSlotId,
  number
> = Object.fromEntries(
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER.map((slot) => [slot, N6_DIVERGENT_DEBATE_INSTANCE_POLICY[slot].default]),
) as Record<TopicSelectionV1bN6DivergentDebateRoleSlotId, number>;

/** The core's TOut for v1b N6 divergent debate roles (index-signature form so it satisfies the generic). */
export type TopicSelectionV1bN6DivergentDebateRoleOutput =
  Record<string, unknown> & {
    schema_version: string;
    role_slot: TopicSelectionV1bN6DivergentDebateRoleSlotId;
  };

export interface TopicSelectionV1bN6DivergentDebateRoleArtifact {
  slot_id: TopicSelectionV1bN6DivergentDebateRoleSlotId;
  node_id: typeof N6_NODE_ID;
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
  output_contract: typeof N6_DEBATE_OUTPUT_CONTRACT;
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
  prior_role_artifact_hashes: Partial<Record<TopicSelectionV1bN6DivergentDebateRoleSlotId, string>>;
  runtime_audit_ref: TopicSelectionFunctionalRef | null;
  runtime_audit_hash: string | null;
  provenance_ref: TopicSelectionFunctionalRef;
  runtime_provenance_class: 'runtime_verified' | 'fixture_replay' | 'legacy_unverified';
  compression_report_ref: TopicSelectionFunctionalRef | null;
  compression_report_hash: string | null;
  compressed_context_hash: string | null;
}

export interface TopicSelectionV1bN6DivergentDebateAdmissionExpectedIdentity {
  slot_id: TopicSelectionV1bN6DivergentDebateRoleSlotId;
  output_contract: typeof N6_DEBATE_OUTPUT_CONTRACT;
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  prompt_variant_key: string;
  prompt_packet_hash: string | null;
  runtime_invocation_context_hash: string;
  redaction_policy: string;
  source_hashes: Record<string, string>;
  prior_role_artifact_hashes: Partial<Record<TopicSelectionV1bN6DivergentDebateRoleSlotId, string>>;
  normalized_payload_hash: string;
}

/** Re-derives a single fan-out instance's expected identity through the SAME strategy hooks the runtime
 *  used. instance_index disambiguates fan-out workers (explorer_0 vs explorer_1) — it is folded into the
 *  invocation_attempt_id + the runtime_invocation_context so two same-slot workers are addressable. */
export type TopicSelectionV1bN6DivergentDebateAdmissionExpectedIdentityBuilder = {
  buildAdmissionExpectedIdentity(input: {
    slot_id: TopicSelectionV1bN6DivergentDebateRoleSlotId;
    instance_index: number;
    prior_role_artifacts: TopicSelectionV1bN6DivergentDebateRoleArtifact[];
    workflow_run_id: string;
    node_attempt_id: string;
    policy_version: string;
    execution_mode: TopicSelectionAgentExecutionMode;
    run_mode: TopicSelectionAgentRunMode;
    model_option_id: string | null;
    normalized_payload_hash: string;
  }): Promise<TopicSelectionV1bN6DivergentDebateAdmissionExpectedIdentity>;
};

export interface TopicSelectionV1bN6DivergentDebateRoleAdmissionCandidate {
  artifact: TopicSelectionV1bN6DivergentDebateRoleArtifact;
  structured_output: TopicSelectionV1bN6DivergentDebateRoleOutput;
}

export interface TopicSelectionV1bN6DivergentDebateAdmissionInput {
  /** Every fan-out instance in INVOCATION order (explorer_0, explorer_1, critic_0, arbiter_0, ...). */
  role_results: TopicSelectionV1bN6DivergentDebateRoleAdmissionCandidate[];
  /** The whole-loop identity the runtime folded: hash([debate_loop_id, [[slot,arity]...], ordered hashes]). */
  loop_transcript_hash: string;
}

export interface TopicSelectionV1bN6DivergentDebateAdmissionIdentity {
  schema_version: 'topic-selection-v1b-n6-divergent-debate-admission-identity-v1';
  admission_policy_id: 'topic-selection.v1b.n6-divergent-candidate-debate.admission.v1';
  node_id: typeof N6_NODE_ID;
  allowed_effect: 'support_only';
  final_slot_id: typeof ARBITER_SLOT;
  final_role_artifact_ref: TopicSelectionFunctionalRef;
  final_role_artifact_hash: string;
  final_prompt_packet_hash: string;
  final_runtime_invocation_context_hash: string;
  final_runtime_audit_ref: TopicSelectionFunctionalRef;
  final_runtime_audit_hash: string;
  final_provenance_ref: TopicSelectionFunctionalRef;
  final_structured_output_hash: string;
  final_output_contract: typeof N6_DEBATE_OUTPUT_CONTRACT;
  /** [slot, arity] stage structure folded into the transcript (the fan-out topology). */
  stage_arities: Array<[TopicSelectionV1bN6DivergentDebateRoleSlotId, number]>;
  /** All role-artifact hashes in invocation order (the transcript chain). */
  ordered_role_artifact_hashes: string[];
  loop_transcript_hash: string;
  source_hashes: Record<string, string>;
  prior_role_artifact_hashes: Partial<Record<TopicSelectionV1bN6DivergentDebateRoleSlotId, string>>;
}

export type TopicSelectionV1bN6DivergentDebateAdmissionIssue = {
  code: TopicSelectionV1bN6DivergentDebateBlockerCode;
  message: string;
  details?: Record<string, unknown>;
};

export type TopicSelectionV1bN6DivergentDebateAdmissionResult =
  | {
    admitted: true;
    final_artifact: TopicSelectionV1bN6DivergentDebateRoleArtifact;
    final_output: TopicSelectionV1bN6DivergentDebateRoleOutput;
    /** The arbiter's synthesized_candidate_set — a TopicQuestionCandidateSet DRAFT the runtime (f5)
     *  unwraps to the bare 5-key payload and funnels through the existing N6 gate. */
    synthesized_candidate_set: Record<string, unknown>;
    admission_identity: TopicSelectionV1bN6DivergentDebateAdmissionIdentity;
    admission_identity_hash: string;
    warnings: string[];
  }
  | {
    admitted: false;
    blocker: TopicSelectionV1bN6DivergentDebateAdmissionIssue;
  };

// Debate role outputs are non-authority support; they must never carry N6 authority refs/ids or
// downstream mutation fields (the deterministic N6 candidate-set gate + the harness own those). These
// are authority IDENTIFIERS / handoffs / mutations — disjoint from the legitimate candidate-set draft
// content keys (candidates / generation_notes / human_review_triggers / question_frame /
// recommended_candidate_keys), so the recursive scan never false-positives a valid arbiter draft.
const FORBIDDEN_AUTHORITY_KEYS = [
  'topic_question_candidate_set_id',
  'topic_question_candidate_set_ref',
  'topic_question_candidate_id',
  'topic_question_candidate_ref',
  'topic_question_contract_id',
  'topic_question_contract_ref',
  'research_slice_id',
  'selected_research_slice_ref',
  'n6_to_n7_handoff',
  'route_decision',
  'gate_status',
  'created_authority_refs',
  'candidate_grouping_id',
  'candidate_grouping_ref',
  'trial_ledger_update',
] as const;

export class TopicSelectionV1bN6DivergentDebateAdmissionService {
  constructor(
    private readonly expectedIdentityBuilder:
      TopicSelectionV1bN6DivergentDebateAdmissionExpectedIdentityBuilder,
  ) {}

  async admit(
    input: TopicSelectionV1bN6DivergentDebateAdmissionInput,
  ): Promise<TopicSelectionV1bN6DivergentDebateAdmissionResult> {
    // 1. Structural: every stage slot present, per-stage arity matches the frozen scenario, terminal
    //    arbiter is a singleton, and the flat instance order is the canonical fan-out order.
    const countBySlot = new Map<TopicSelectionV1bN6DivergentDebateRoleSlotId, number>();
    for (const result of input.role_results) {
      countBySlot.set(result.artifact.slot_id, (countBySlot.get(result.artifact.slot_id) ?? 0) + 1);
    }
    for (const slot of TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER) {
      if (!countBySlot.get(slot)) {
        return this.block('N6_DIVERGENT_DEBATE_REQUIRED_ROLE_MISSING', `Required N6 divergent debate stage ${slot} produced no instances.`, { slot });
      }
    }
    if ((countBySlot.get(ARBITER_SLOT) ?? 0) !== 1) {
      return this.block('N6_DIVERGENT_DEBATE_TERMINAL_NOT_SINGLETON', 'N6 divergent debate terminal arbiter stage must be a singleton.', { actual: countBySlot.get(ARBITER_SLOT) ?? 0 });
    }
    // Per-stage arity must be within the frozen scenario's [min,max] — NOT pinned to default. The core
    // folds the ACTUAL instanceCountFor arity into the transcript, so admission re-folds the actual
    // observed count; a legitimate non-default run (e.g. 3 explorers, within max) admits.
    const actualCounts = {} as Record<TopicSelectionV1bN6DivergentDebateRoleSlotId, number>;
    for (const slot of TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER) {
      const actual = countBySlot.get(slot) ?? 0;
      const policy = N6_DIVERGENT_DEBATE_INSTANCE_POLICY[slot];
      if (actual < policy.min || actual > policy.max) {
        return this.block('N6_DIVERGENT_DEBATE_STAGE_ARITY_DRIFT', `N6 divergent debate stage ${slot} instance count is outside the frozen scenario [min,max] fan-out range.`, { slot, min: policy.min, max: policy.max, actual });
      }
      actualCounts[slot] = actual;
    }
    const expectedOrder = this.instanceOrder(actualCounts);
    const actualOrder = input.role_results.map((result) => result.artifact.slot_id);
    if (!this.sameOrder(actualOrder, expectedOrder)) {
      return this.block('N6_DIVERGENT_DEBATE_ROLE_ORDER_INVALID', 'N6 divergent debate instances must be admitted in canonical fan-out order (each stage\'s instances contiguous, in role order).', { actual_order: actualOrder, expected_order: expectedOrder });
    }

    // 2. Per-instance: re-derive expected identity through the same strategy hooks, check drift,
    //    role_slot match, forbidden-authority boundary. priorRoleArtifacts accumulate in order; the
    //    per-slot instance index disambiguates fan-out workers.
    const priorRoleArtifacts: TopicSelectionV1bN6DivergentDebateRoleArtifact[] = [];
    const slotSeen = new Map<TopicSelectionV1bN6DivergentDebateRoleSlotId, number>();
    for (const candidate of input.role_results) {
      const slot = candidate.artifact.slot_id;
      const instanceIndex = slotSeen.get(slot) ?? 0;
      slotSeen.set(slot, instanceIndex + 1);
      const expected = await this.expectedIdentityBuilder.buildAdmissionExpectedIdentity({
        slot_id: slot,
        instance_index: instanceIndex,
        prior_role_artifacts: [...priorRoleArtifacts],
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
        return this.block('N6_DIVERGENT_DEBATE_ROLE_OUTPUT_MISMATCH', 'N6 divergent debate role output role_slot does not match its runtime slot.', { slot, actual_role_slot: candidate.structured_output.role_slot });
      }
      const forbiddenKey = this.findForbiddenAuthorityKey(candidate.structured_output);
      if (forbiddenKey) {
        return this.block('N6_DIVERGENT_DEBATE_FORBIDDEN_AUTHORITY_FIELD', 'N6 divergent debate output contains a forbidden authority or downstream mutation field.', { slot, forbidden_key: forbiddenKey });
      }
      priorRoleArtifacts.push(candidate.artifact);
    }

    // 3. Arbiter output carries a synthesized_candidate_set DRAFT (the gate bridge unwraps + validates
    //    it fully in f5; here we only require it to be present and object-shaped).
    const finalCandidate = input.role_results[input.role_results.length - 1]!;
    const synthesized = this.asRecord(
      (finalCandidate.structured_output as TopicSelectionV1bN6DivergentDebateRolePayload).synthesized_candidate_set,
    );
    // The arbiter draft must be a BARE 5-key TopicQuestionCandidateSet draft — the exact shape the f5
    // gate bridge funnels through the existing N6 single-agent draft path (isN6DraftPayload's hasOnlyKeys
    // rejects the role-output wrapper keys), so the downstream N6 gate consumes it verbatim.
    if (!synthesized || !isN6DraftPayload(synthesized)) {
      return this.block('N6_DIVERGENT_DEBATE_ARBITER_OUTPUT_NOT_N6_DRAFT', 'N6 divergent debate arbiter synthesized_candidate_set must be a bare TopicQuestionCandidateSet draft (5-key isN6DraftPayload) for the gate bridge.');
    }

    // 4. Whole-loop transcript: re-fold over [debate_loop_id, [[slot,arity]...], ordered hashes] and
    //    compare to the runtime's fold. The loop id + arity + role order are all single-sourced, so a
    //    mismatch is a genuine drift, never a stale-literal disagreement.
    const stageArities = this.stageArities(actualCounts);
    const orderedHashes = input.role_results.map((result) => result.artifact.role_artifact_hash);
    const expectedTranscript = this.hash([
      TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_LOOP_ID,
      stageArities,
      orderedHashes,
    ]);
    if (expectedTranscript !== input.loop_transcript_hash) {
      return this.block('N6_DIVERGENT_DEBATE_TRANSCRIPT_DRIFT', 'N6 divergent debate loop transcript hash does not match the [slot,arity] ordered role-artifact chain.');
    }

    const admissionIdentity = this.buildAdmissionIdentity(input, finalCandidate.artifact, stageArities, orderedHashes);
    return {
      admitted: true,
      final_artifact: finalCandidate.artifact,
      final_output: finalCandidate.structured_output,
      synthesized_candidate_set: synthesized,
      admission_identity: admissionIdentity,
      admission_identity_hash: this.hash(admissionIdentity),
      warnings: [],
    };
  }

  private validateArtifactIdentity(
    candidate: TopicSelectionV1bN6DivergentDebateRoleAdmissionCandidate,
    expected: TopicSelectionV1bN6DivergentDebateAdmissionExpectedIdentity,
  ): TopicSelectionV1bN6DivergentDebateAdmissionResult | null {
    const { artifact } = candidate;
    if (artifact.runtime_provenance_class !== 'runtime_verified') {
      return this.block('N6_DIVERGENT_DEBATE_ARTIFACT_RUNTIME_CONTEXT_DRIFT', 'N6 divergent debate admission requires runtime_verified role artifacts.');
    }
    if (
      artifact.output_contract !== expected.output_contract
      || artifact.context_policy_profile_id !== expected.context_policy_profile_id
      || artifact.context_policy_profile_version !== expected.context_policy_profile_version
      || artifact.context_policy_profile_hash !== expected.context_policy_profile_hash
      || artifact.redaction_policy !== expected.redaction_policy
    ) {
      return this.block('N6_DIVERGENT_DEBATE_ARTIFACT_PROFILE_DRIFT', 'N6 divergent debate role artifact profile identity does not match expected runtime identity.');
    }
    if (
      artifact.prompt_variant_key !== expected.prompt_variant_key
      || !expected.prompt_packet_hash
      || artifact.prompt_packet_hash !== expected.prompt_packet_hash
    ) {
      return this.block('N6_DIVERGENT_DEBATE_ARTIFACT_PROMPT_DRIFT', 'N6 divergent debate role artifact prompt identity does not match expected prompt packet.');
    }
    if (
      artifact.runtime_invocation_context_hash !== expected.runtime_invocation_context_hash
      || !artifact.runtime_audit_ref
      || !artifact.runtime_audit_hash
      || !this.refsEqual(artifact.provenance_ref, artifact.runtime_audit_ref)
    ) {
      return this.block('N6_DIVERGENT_DEBATE_ARTIFACT_RUNTIME_CONTEXT_DRIFT', 'N6 divergent debate role artifact runtime invocation or audit identity is incomplete.');
    }
    if (
      artifact.normalized_output_hash !== expected.normalized_payload_hash
      || artifact.structured_output_hash !== expected.normalized_payload_hash
      || artifact.role_artifact_hash !== expected.normalized_payload_hash
    ) {
      return this.block('N6_DIVERGENT_DEBATE_ARTIFACT_PAYLOAD_HASH_MISMATCH', 'N6 divergent debate role artifact payload hash does not match normalized output hash.');
    }
    if (!this.recordEqual(artifact.source_hashes, expected.source_hashes)) {
      return this.block('N6_DIVERGENT_DEBATE_SOURCE_HASH_DRIFT', 'N6 divergent debate role artifact source hashes do not match expected frozen input lineage.');
    }
    if (!this.recordEqual(artifact.prior_role_artifact_hashes, expected.prior_role_artifact_hashes)) {
      return this.block('N6_DIVERGENT_DEBATE_PRIOR_ROLE_HASH_DRIFT', 'N6 divergent debate role artifact prior-role hashes do not match expected dynamic material.');
    }
    return null;
  }

  /** The canonical flat instance order for the OBSERVED arities: each stage's instances contiguous,
   *  stages in role order. */
  private instanceOrder(
    counts: Record<TopicSelectionV1bN6DivergentDebateRoleSlotId, number>,
  ): TopicSelectionV1bN6DivergentDebateRoleSlotId[] {
    const order: TopicSelectionV1bN6DivergentDebateRoleSlotId[] = [];
    for (const slot of TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER) {
      for (let i = 0; i < counts[slot]; i += 1) {
        order.push(slot);
      }
    }
    return order;
  }

  private stageArities(
    counts: Record<TopicSelectionV1bN6DivergentDebateRoleSlotId, number>,
  ): Array<[TopicSelectionV1bN6DivergentDebateRoleSlotId, number]> {
    return TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER.map(
      (slot) => [slot, counts[slot]] as [TopicSelectionV1bN6DivergentDebateRoleSlotId, number],
    );
  }

  private buildAdmissionIdentity(
    input: TopicSelectionV1bN6DivergentDebateAdmissionInput,
    finalArtifact: TopicSelectionV1bN6DivergentDebateRoleArtifact,
    stageArities: Array<[TopicSelectionV1bN6DivergentDebateRoleSlotId, number]>,
    orderedHashes: string[],
  ): TopicSelectionV1bN6DivergentDebateAdmissionIdentity {
    return {
      schema_version: 'topic-selection-v1b-n6-divergent-debate-admission-identity-v1',
      admission_policy_id: 'topic-selection.v1b.n6-divergent-candidate-debate.admission.v1',
      node_id: N6_NODE_ID,
      allowed_effect: 'support_only',
      final_slot_id: ARBITER_SLOT,
      final_role_artifact_ref: finalArtifact.role_artifact_ref,
      final_role_artifact_hash: finalArtifact.role_artifact_hash,
      final_prompt_packet_hash: finalArtifact.prompt_packet_hash,
      final_runtime_invocation_context_hash: finalArtifact.runtime_invocation_context_hash,
      final_runtime_audit_ref: finalArtifact.runtime_audit_ref!,
      final_runtime_audit_hash: finalArtifact.runtime_audit_hash!,
      final_provenance_ref: finalArtifact.provenance_ref,
      final_structured_output_hash: finalArtifact.structured_output_hash,
      final_output_contract: finalArtifact.output_contract,
      stage_arities: stageArities,
      ordered_role_artifact_hashes: orderedHashes,
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
    code: TopicSelectionV1bN6DivergentDebateBlockerCode,
    message: string,
    details?: Record<string, unknown>,
  ): TopicSelectionV1bN6DivergentDebateAdmissionResult {
    return { admitted: false, blocker: { code, message, ...(details ? { details } : {}) } };
  }

  private sameOrder(actual: readonly string[], expected: readonly string[]): boolean {
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

  private hash(value: unknown): string {
    return canonicalHash(value);
  }
}
