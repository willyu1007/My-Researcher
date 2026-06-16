// T-127 P1 / W-05 — falsifiable unit coverage for the v1c N2 bounded-debate admission byte-match.
// The orchestrator-driven runtime test computes the expected identity as f(handoff) on both sides, so it
// cannot fail the drift/structural guards. This test feeds the admission service a CONTROLLED expected-
// identity builder (fixed canonical identities) plus hand-built candidates that match it, then tampers
// exactly one thing per case to prove each blocker.code actually fires. (Mirrors the v1b N8 admission
// negatives.)

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER,
  TopicSelectionV1cN2BoundedDebateAdmissionService,
  type TopicSelectionV1cN2BoundedDebateAdmissionExpectedIdentity,
  type TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate,
  type TopicSelectionV1cN2BoundedDebateRoleArtifact,
  type TopicSelectionV1cN2BoundedDebateRoleOutput,
  type TopicSelectionV1cN2BoundedDebateRoleSlotId,
} from './topic-selection-v1c-n2-bounded-debate-admission-service.js';
import type {
  TopicSelectionPromotionInputSnapshotHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-input-contracts';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';

const OUTPUT_CONTRACT = 'TopicSelectionV1cBoundedMicroDebateRoleOrFinal@v1' as const;
const [DRAFT, CRITIC, REPAIR, FINAL] = TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER;

function ref(refId: string) {
  return { ref_type: 'artifact_ref', ref_id: refId, title_card_id: 'title_card_001', version_id: null };
}

function hash(value: unknown): string {
  return sha256Text(stableStringify(value));
}

// A minimal handoff carrying just the fields admit() reads: the allowed-ref surface plus the
// accepted-risk / recheck refs the final semantic layer must echo back.
function makeHandoff(): TopicSelectionPromotionInputSnapshotHandoff {
  return {
    promotion_input_snapshot_id: 'pis_001',
    promotion_input_snapshot_ref: ref('pis_001'),
    v1b_to_v1c_input_bundle_id: 'bundle_001',
    topic_package_id: 'pkg_001',
    package_version: 'v1',
    closure_status: 'ready_for_gate',
    topic_package_ref: ref('topic_package'),
    package_trace_boundary_check_ref: ref('trace_boundary'),
    package_readiness_assessment_ref: ref('readiness_assessment'),
    topic_value_assessment_ref: ref('value_assessment'),
    value_reasoning_memo_ref: ref('value_memo'),
    value_disposition_decision_ref: ref('value_disposition'),
    topic_question_ref: ref('topic_question'),
    topic_question_contract_ref: ref('topic_question_contract'),
    answerability_plan_ref: ref('answerability_plan'),
    research_slice_ref: ref('research_slice'),
    validated_need_refs: [ref('need_1')],
    evidence_refs: [
      { evidence_ref: ref('evidence_1') } as never,
    ],
    accepted_risk_refs: [ref('risk_1')],
    blocker_refs: [],
    memory_suggestion_refs: [],
    recheck_request_refs: [ref('recheck_1')],
    readiness_check_refs: [ref('readiness_check_1')],
    snapshot_hashes: {
      bundle_hash: 'bundle_hash',
      package_snapshot_hash: 'pkg_hash',
      package_draft_input_snapshot_hash: 'draft_hash',
      promotion_input_snapshot_hash: 'p'.repeat(64),
    },
    snapshot: {} as never,
  } as unknown as TopicSelectionPromotionInputSnapshotHandoff;
}

// Fixed canonical per-role identity values shared by candidate artifacts and the stub expected-identity
// builder, so the happy path matches by construction and any single-field tamper genuinely diverges.
function canonFor(slot: TopicSelectionV1cN2BoundedDebateRoleSlotId) {
  return {
    output_contract: OUTPUT_CONTRACT,
    context_policy_profile_id: `cpp.${slot}`,
    context_policy_profile_version: 'v1',
    context_policy_profile_hash: `cpph_${slot}`,
    prompt_variant_key: `pvk.${slot}`,
    prompt_packet_hash: `pph_${slot}`.padEnd(64, '0'),
    runtime_invocation_context_hash: `ric_${slot}`.padEnd(64, '0'),
    redaction_policy: 'support_only_semantic',
    source_hashes: { frozen_input_hash: 'a'.repeat(64), slot_marker: slot },
  };
}

// The synthesizer-final N3 semantic layer: every required key present, every critic finding resolved
// with an allowed status, and the accepted-risk / recheck refs echoed back from the handoff.
function finalSemanticLayer() {
  return {
    claim_ceiling_alignment: { aligned: true },
    contribution_summary: 'Contributions are scoped.',
    evaluation_plan_summary: 'Evaluation plan is concrete.',
    evidence_support_map: [],
    accepted_risk_acknowledgements: { risk_refs: [ref('risk_1')] },
    recheck_obligation_summary: { recheck_refs: [ref('recheck_1')] },
    critic_finding_resolution_map: [
      { finding_id: 'CF1', resolution_status: 'accepted_and_repaired' },
    ],
    readiness_coverage_items: [],
  };
}

function structuredOutputFor(slot: TopicSelectionV1cN2BoundedDebateRoleSlotId): TopicSelectionV1cN2BoundedDebateRoleOutput {
  const base = { schema_version: OUTPUT_CONTRACT, role_slot: slot } as TopicSelectionV1cN2BoundedDebateRoleOutput;
  if (slot === CRITIC) {
    return { ...base, critic_findings: [{ finding_id: 'CF1', statement: 'Novelty needs evidence.' }] };
  }
  if (slot === FINAL) {
    return {
      ...base,
      final_support_summary: 'Synthesis resolves the critic finding.',
      dossier_markdown: '# Dossier\n\nReady for human review.',
      n3_semantic_layer: finalSemanticLayer(),
      reviewer_questions: ['Is the evaluation plan adequate?'],
      risk_notes: ['Residual scope risk accepted.'],
      recheck_notes: ['Re-check evidence after refresh.'],
    };
  }
  return base;
}

function priorHashes(
  prior: TopicSelectionV1cN2BoundedDebateRoleArtifact[],
): Partial<Record<TopicSelectionV1cN2BoundedDebateRoleSlotId, string>> {
  const out: Partial<Record<TopicSelectionV1cN2BoundedDebateRoleSlotId, string>> = {};
  for (const artifact of prior) out[artifact.slot_id] = artifact.role_artifact_hash;
  return out;
}

function makeCandidate(
  slot: TopicSelectionV1cN2BoundedDebateRoleSlotId,
  prior: TopicSelectionV1cN2BoundedDebateRoleArtifact[],
  override?: TopicSelectionV1cN2BoundedDebateRoleOutput,
): TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate {
  const structured_output = override ?? structuredOutputFor(slot);
  const payloadHash = hash(structured_output);
  const canon = canonFor(slot);
  const auditRef = ref(`audit_${slot}`);
  const artifact = {
    slot_id: slot,
    node_id: 'topic-selection.v1c.generate-promotion-support.v1',
    workflow_run_id: 'run_001',
    node_attempt_id: 'attempt_001',
    policy_version: 'topic-selection-v1c-node-policy-v1',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    allowed_effect: 'support_only',
    role_artifact_ref: ref(`role_${slot}`),
    role_artifact_hash: payloadHash,
    normalized_output_ref: ref(`role_${slot}`),
    normalized_output_hash: payloadHash,
    output_contract: canon.output_contract,
    profile_id: 'topic-selection.v1c.harness.n2_bounded_debate',
    model_option_id: null,
    prompt_packet_hash: canon.prompt_packet_hash,
    structured_output_hash: payloadHash,
    context_policy_profile_id: canon.context_policy_profile_id,
    context_policy_profile_version: canon.context_policy_profile_version,
    context_policy_profile_hash: canon.context_policy_profile_hash,
    prompt_variant_key: canon.prompt_variant_key,
    runtime_invocation_context_hash: canon.runtime_invocation_context_hash,
    redaction_policy: canon.redaction_policy,
    source_hashes: canon.source_hashes,
    prior_role_artifact_hashes: priorHashes(prior),
    runtime_audit_ref: auditRef,
    runtime_audit_hash: `audit_hash_${slot}`,
    provenance_ref: auditRef,
    runtime_provenance_class: 'runtime_verified',
    compression_report_ref: null,
    compression_report_hash: null,
    compressed_context_hash: null,
  } as unknown as TopicSelectionV1cN2BoundedDebateRoleArtifact;
  return { artifact, structured_output };
}

function makeCandidates(
  override: Partial<Record<TopicSelectionV1cN2BoundedDebateRoleSlotId, TopicSelectionV1cN2BoundedDebateRoleOutput>> = {},
): TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate[] {
  const out: TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate[] = [];
  for (const slot of TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER) {
    out.push(makeCandidate(slot, out.map((c) => c.artifact), override[slot]));
  }
  return out;
}

// Stub builder: returns the fixed canonical identity for the slot + the prior chain + the payload hash
// admit() passes in — i.e. exactly what a matching candidate carries. It is independent of the candidate
// object, so tampering a candidate field genuinely diverges from the expected identity.
function makeAdmission(): TopicSelectionV1cN2BoundedDebateAdmissionService {
  return new TopicSelectionV1cN2BoundedDebateAdmissionService({
    buildAdmissionExpectedIdentity(input): TopicSelectionV1cN2BoundedDebateAdmissionExpectedIdentity {
      const canon = canonFor(input.slot_id);
      return {
        slot_id: input.slot_id,
        ...canon,
        prior_role_artifact_hashes: priorHashes(input.prior_role_artifacts ?? []),
        normalized_payload_hash: input.normalized_payload_hash,
      } as unknown as TopicSelectionV1cN2BoundedDebateAdmissionExpectedIdentity;
    },
  });
}

function tamper(
  candidates: TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate[],
  slot: TopicSelectionV1cN2BoundedDebateRoleSlotId,
  patch: Partial<TopicSelectionV1cN2BoundedDebateRoleArtifact>,
): TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate[] {
  return candidates.map((c) => (c.artifact.slot_id === slot
    ? { ...c, artifact: { ...c.artifact, ...patch } }
    : c));
}

// --- HAPPY PATH ---------------------------------------------------------------------------------

test('v1c N2 admission admits a canonical, byte-matching 4-role chain and produces a support draft', () => {
  const handoff = makeHandoff();
  const candidates = makeCandidates();
  const result = makeAdmission().admit({ handoff, role_results: candidates });

  assert.equal(result.admitted, true);
  if (!result.admitted) throw new Error('expected admit');
  assert.equal(result.final_artifact.slot_id, FINAL);
  assert.equal(result.admission_identity.final_slot_id, 'n2_bounded_micro_debate.synthesizer_final');
  assert.equal(result.admission_identity.allowed_effect, 'support_only');
  assert.equal(
    result.admission_identity.node_id,
    'topic-selection.v1c.generate-promotion-support.v1',
  );
  // produced promotion-support draft derives its summary/dossier from the final output, not a tautology.
  assert.equal(result.promotion_support_draft.summary, 'Synthesis resolves the critic finding.');
  assert.equal(result.promotion_support_draft.dossier_markdown, '# Dossier\n\nReady for human review.');
  assert.deepEqual(result.promotion_support_draft.reviewer_questions, ['Is the evaluation plan adequate?']);
  assert.deepEqual(result.promotion_support_draft.risk_notes, ['Residual scope risk accepted.']);
  // admission identity hash is the canonical hash of the identity object.
  assert.equal(result.admission_identity_hash, hash(result.admission_identity));
  assert.deepEqual(result.warnings, []);
});

// --- ARTIFACT / STRUCTURAL NEGATIVES (single-field tamper proves each guard) ----------------------

const negatives: Array<{
  name: string;
  code: string;
  mutate: (
    c: TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate[],
  ) => TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate[];
}> = [
  {
    name: 'missing synthesizer final -> REQUIRED_ROLE_MISSING',
    code: 'N2_BOUNDED_DEBATE_REQUIRED_ROLE_MISSING',
    mutate: (c) => c.slice(0, 3),
  },
  {
    name: 'reordered roles -> ROLE_ORDER_INVALID',
    code: 'N2_BOUNDED_DEBATE_ROLE_ORDER_INVALID',
    mutate: (c) => [c[1]!, c[0]!, c[2]!, c[3]!],
  },
  {
    name: 'legacy_unverified provenance -> RUNTIME_CONTEXT_DRIFT',
    code: 'N2_BOUNDED_DEBATE_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
    mutate: (c) => tamper(c, DRAFT, { runtime_provenance_class: 'legacy_unverified' }),
  },
  {
    name: 'profile hash drift -> ARTIFACT_PROFILE_DRIFT',
    code: 'N2_BOUNDED_DEBATE_ARTIFACT_PROFILE_DRIFT',
    mutate: (c) => tamper(c, CRITIC, { context_policy_profile_hash: 'tampered' }),
  },
  {
    name: 'prompt packet drift -> ARTIFACT_PROMPT_DRIFT',
    code: 'N2_BOUNDED_DEBATE_ARTIFACT_PROMPT_DRIFT',
    mutate: (c) => tamper(c, DRAFT, { prompt_packet_hash: 'b'.repeat(64) }),
  },
  {
    name: 'runtime invocation context drift -> RUNTIME_CONTEXT_DRIFT',
    code: 'N2_BOUNDED_DEBATE_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
    mutate: (c) => tamper(c, REPAIR, { runtime_invocation_context_hash: 'd'.repeat(64) }),
  },
  {
    name: 'payload hash mismatch -> ARTIFACT_PAYLOAD_HASH_MISMATCH',
    code: 'N2_BOUNDED_DEBATE_ARTIFACT_PAYLOAD_HASH_MISMATCH',
    mutate: (c) => tamper(c, DRAFT, {
      role_artifact_hash: 'c'.repeat(64),
      normalized_output_hash: 'c'.repeat(64),
      structured_output_hash: 'c'.repeat(64),
    }),
  },
  {
    name: 'source hash drift -> SOURCE_HASH_DRIFT',
    code: 'N2_BOUNDED_DEBATE_SOURCE_HASH_DRIFT',
    mutate: (c) => tamper(c, CRITIC, { source_hashes: { frozen_input_hash: 'zzz' } }),
  },
  {
    name: 'broken prior-role chain on final -> PRIOR_ROLE_HASH_DRIFT',
    code: 'N2_BOUNDED_DEBATE_PRIOR_ROLE_HASH_DRIFT',
    mutate: (c) => tamper(c, FINAL, {
      prior_role_artifact_hashes: {
        [DRAFT!]: '0'.repeat(64),
        [CRITIC!]: c[1]!.artifact.role_artifact_hash,
        [REPAIR!]: c[2]!.artifact.role_artifact_hash,
      },
    }),
  },
];

for (const negative of negatives) {
  test(`v1c N2 admission blocks: ${negative.name}`, () => {
    const handoff = makeHandoff();
    const candidates = negative.mutate(makeCandidates());
    const result = makeAdmission().admit({ handoff, role_results: candidates });
    assert.equal(result.admitted, false);
    if (result.admitted) throw new Error('expected block');
    assert.equal(result.blocker.code, negative.code);
  });
}

// --- OUTPUT-LEVEL NEGATIVES (rebuild a consistent chain via per-role override so the per-role payload
// + prior-chain checks still pass and the targeted semantic/authority guard is what trips) ----------

const outputNegatives: Array<{
  name: string;
  code: string;
  override: Partial<Record<TopicSelectionV1cN2BoundedDebateRoleSlotId, TopicSelectionV1cN2BoundedDebateRoleOutput>>;
}> = [
  {
    name: 'forbidden authority field in draft output -> FORBIDDEN_AUTHORITY_FIELD',
    code: 'N2_BOUNDED_DEBATE_FORBIDDEN_AUTHORITY_FIELD',
    override: {
      [DRAFT!]: {
        schema_version: OUTPUT_CONTRACT,
        role_slot: DRAFT,
        disposition: 'promote',
      } as unknown as TopicSelectionV1cN2BoundedDebateRoleOutput,
    },
  },
  {
    name: 'out-of-bounds ref in draft output -> REF_OUT_OF_BOUNDS',
    code: 'N2_BOUNDED_DEBATE_REF_OUT_OF_BOUNDS',
    override: {
      [DRAFT!]: {
        schema_version: OUTPUT_CONTRACT,
        role_slot: DRAFT,
        cited: { ref_type: 'artifact_ref', ref_id: 'not_in_handoff' },
      } as unknown as TopicSelectionV1cN2BoundedDebateRoleOutput,
    },
  },
  {
    name: 'role_slot mismatch in output -> ROLE_OUTPUT_MISMATCH',
    code: 'N2_BOUNDED_DEBATE_ROLE_OUTPUT_MISMATCH',
    override: {
      [DRAFT!]: {
        schema_version: OUTPUT_CONTRACT,
        role_slot: CRITIC,
      } as unknown as TopicSelectionV1cN2BoundedDebateRoleOutput,
    },
  },
  {
    name: 'final missing the N3 semantic layer -> FINAL_SEMANTIC_LAYER_INCOMPLETE',
    code: 'N2_BOUNDED_DEBATE_FINAL_SEMANTIC_LAYER_INCOMPLETE',
    override: {
      [FINAL!]: {
        schema_version: OUTPUT_CONTRACT,
        role_slot: FINAL,
        final_support_summary: 'summary',
        dossier_markdown: '# Dossier',
      } as unknown as TopicSelectionV1cN2BoundedDebateRoleOutput,
    },
  },
  {
    name: 'final leaves a critic finding unresolved -> CRITIC_FINDING_UNRESOLVED',
    code: 'N2_BOUNDED_DEBATE_CRITIC_FINDING_UNRESOLVED',
    override: {
      [FINAL!]: {
        schema_version: OUTPUT_CONTRACT,
        role_slot: FINAL,
        final_support_summary: 'summary',
        dossier_markdown: '# Dossier',
        n3_semantic_layer: { ...finalSemanticLayer(), critic_finding_resolution_map: [] },
      } as unknown as TopicSelectionV1cN2BoundedDebateRoleOutput,
    },
  },
  {
    name: 'final drops an accepted-risk ref -> REQUIRED_REF_DROPPED',
    code: 'N2_BOUNDED_DEBATE_REQUIRED_REF_DROPPED',
    override: {
      [FINAL!]: {
        schema_version: OUTPUT_CONTRACT,
        role_slot: FINAL,
        final_support_summary: 'summary',
        dossier_markdown: '# Dossier',
        n3_semantic_layer: {
          ...finalSemanticLayer(),
          accepted_risk_acknowledgements: { risk_refs: [] },
        },
      } as unknown as TopicSelectionV1cN2BoundedDebateRoleOutput,
    },
  },
];

for (const negative of outputNegatives) {
  test(`v1c N2 admission blocks: ${negative.name}`, () => {
    const handoff = makeHandoff();
    const candidates = makeCandidates(negative.override);
    const result = makeAdmission().admit({ handoff, role_results: candidates });
    assert.equal(result.admitted, false);
    if (result.admitted) throw new Error('expected block');
    assert.equal(result.blocker.code, negative.code);
  });
}
