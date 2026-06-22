// T-123 P3 — falsifiable negative coverage for the v1b N8 bounded-debate admission byte-match.
// The runtime unit test exercises the happy admit through the real orchestrator, but its expected
// identity is f(handoff) on both sides, so it cannot fail the drift checks. This test feeds the
// admission service a CONTROLLED expected-identity builder (fixed canonical identities) + hand-built
// candidates that match it, then tampers exactly one field per case to prove each drift/structural
// blocker actually fires. (Mirrors the v1c N2 admission negatives.)

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_LOOP_ID,
  TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import {
  TopicSelectionV1bN8BoundedDebateAdmissionService,
  type TopicSelectionV1bN8BoundedDebateAdmissionExpectedIdentity,
  type TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate,
  type TopicSelectionV1bN8BoundedDebateRoleArtifact,
  type TopicSelectionV1bN8BoundedDebateRoleOutput,
} from './topic-selection-v1b-n8-bounded-debate-admission-service.js';

const N8_NODE_ID = 'topic-selection.v1b.assess-topic-value.v1' as const;
const OUTPUT_CONTRACT = 'TopicSelectionV1bN8BoundedDebateRoleOutput@v1' as const;
const [DRAFT, CRITIC, REPAIR, FINAL] = TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER;

const ASSESSMENT_DRAFT = { schema_version: 'TopicValueAssessmentDraft@v1', total_score: 70, confidence: 0.7 };

function ref(refId: string) {
  return { ref_type: 'artifact_ref', ref_id: refId, title_card_id: 'title_card_001', version_id: null };
}

function structuredOutputFor(slot: string): TopicSelectionV1bN8BoundedDebateRoleOutput {
  const base = { schema_version: OUTPUT_CONTRACT, role_slot: slot } as TopicSelectionV1bN8BoundedDebateRoleOutput;
  if (slot === DRAFT) return { ...base, assessment_draft: ASSESSMENT_DRAFT };
  if (slot === CRITIC) return { ...base, critic_findings: [{ finding_code: 'CF1', severity: 'material', statement: 'Novelty needs evidence.' }] };
  if (slot === REPAIR) return { ...base, repair_actions: [{ finding_code: 'CF1', action: 'Linked evidence.', resolved: true }] };
  return { ...base, assessment_draft: ASSESSMENT_DRAFT, debate_summary: 'Synthesis resolves the material finding.' };
}

// Fixed canonical per-role identity values (profile/prompt/ric/source) — both the candidate artifact
// and the stub expected-identity builder use these, so the happy path matches by construction.
function canonFor(slot: string) {
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

function priorHashes(prior: TopicSelectionV1bN8BoundedDebateRoleArtifact[]): Partial<Record<string, string>> {
  const out: Partial<Record<string, string>> = {};
  for (const artifact of prior) out[artifact.slot_id] = artifact.role_artifact_hash;
  return out;
}

function makeCandidate(
  slot: string,
  prior: TopicSelectionV1bN8BoundedDebateRoleArtifact[],
  override?: TopicSelectionV1bN8BoundedDebateRoleOutput,
): TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate {
  const structured_output = override ?? structuredOutputFor(slot);
  const hash = canonicalHash(structured_output);
  const canon = canonFor(slot);
  const auditRef = ref(`audit_${slot}`);
  const artifact = {
    slot_id: slot,
    node_id: N8_NODE_ID,
    workflow_run_id: 'run_001',
    node_attempt_id: 'attempt_001',
    policy_version: 'topic-selection-v1b-node-policy-v1',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    allowed_effect: 'support_only',
    role_artifact_ref: ref(`role_${slot}`),
    role_artifact_hash: hash,
    normalized_output_ref: ref(`role_${slot}`),
    normalized_output_hash: hash,
    output_contract: canon.output_contract,
    profile_id: 'topic-selection.v1b.harness.n8_bounded_debate',
    model_option_id: null,
    prompt_packet_hash: canon.prompt_packet_hash,
    structured_output_hash: hash,
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
  } as unknown as TopicSelectionV1bN8BoundedDebateRoleArtifact;
  return { artifact, structured_output };
}

function makeCandidates(
  override: Partial<Record<string, TopicSelectionV1bN8BoundedDebateRoleOutput>> = {},
): TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate[] {
  const out: TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate[] = [];
  for (const slot of TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER) {
    out.push(makeCandidate(slot, out.map((c) => c.artifact), override[slot]));
  }
  return out;
}

function loopTranscriptHash(candidates: TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate[]): string {
  return canonicalHash([
    TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_LOOP_ID,
    [...TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER],
    candidates.map((c) => c.artifact.role_artifact_hash),
  ]);
}

// Stub builder: returns the fixed canonical identity for the slot + the prior chain + the payload hash
// admit passes in — i.e. exactly what a matching candidate carries. Independent of the candidate object,
// so tampering a candidate field genuinely diverges from the expected identity.
function makeAdmission(): TopicSelectionV1bN8BoundedDebateAdmissionService {
  return new TopicSelectionV1bN8BoundedDebateAdmissionService({
    async buildAdmissionExpectedIdentity(input): Promise<TopicSelectionV1bN8BoundedDebateAdmissionExpectedIdentity> {
      const canon = canonFor(input.slot_id);
      return {
        slot_id: input.slot_id,
        ...canon,
        prior_role_artifact_hashes: priorHashes(input.prior_role_artifacts),
        normalized_payload_hash: input.normalized_payload_hash,
      } as unknown as TopicSelectionV1bN8BoundedDebateAdmissionExpectedIdentity;
    },
  });
}

function tamper(
  candidates: TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate[],
  slot: string,
  patch: Partial<TopicSelectionV1bN8BoundedDebateRoleArtifact>,
): TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate[] {
  return candidates.map((c) => (c.artifact.slot_id === slot
    ? { ...c, artifact: { ...c.artifact, ...patch } }
    : c));
}

// Mutate the DRAFT role output's self-declared schema_version (drift / missing / empty-string) and
// re-hash the three payload-hash fields so the candidate still passes validateArtifactIdentity and
// reaches the new schema_version guard. DRAFT is first in role order, so its guard fires before any
// later role is read.
function mutateSchemaVersion(
  candidates: TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate[],
  schemaVersion: string | undefined,
): { role_results: TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate[]; loop_transcript_hash: string } {
  const draft = candidates[0]!;
  const structured_output = { ...draft.structured_output } as TopicSelectionV1bN8BoundedDebateRoleOutput;
  if (schemaVersion === undefined) {
    delete (structured_output as Record<string, unknown>).schema_version;
  } else {
    (structured_output as Record<string, unknown>).schema_version = schemaVersion;
  }
  const hash = canonicalHash(structured_output);
  const artifact = { ...draft.artifact, role_artifact_hash: hash, normalized_output_hash: hash, structured_output_hash: hash };
  const tampered = [{ artifact, structured_output }, candidates[1]!, candidates[2]!, candidates[3]!];
  return { role_results: tampered, loop_transcript_hash: loopTranscriptHash(tampered) };
}

test('v1b N8 admission admits a canonical, byte-matching 4-role chain', async () => {
  const candidates = makeCandidates();
  const admitted = await makeAdmission().admit({ role_results: candidates, loop_transcript_hash: loopTranscriptHash(candidates) });
  assert.equal(admitted.admitted, true);
  if (!admitted.admitted) throw new Error('expected admit');
  assert.equal(admitted.final_artifact.slot_id, FINAL);
  assert.deepEqual(admitted.assessment_draft, ASSESSMENT_DRAFT);
});

const negatives: Array<{ name: string; mutate: (c: TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate[]) => { role_results: TopicSelectionV1bN8BoundedDebateRoleAdmissionCandidate[]; loop_transcript_hash: string }; code: string }> = [
  {
    name: 'reordered roles -> ROLE_ORDER_INVALID',
    code: 'N8_BOUNDED_DEBATE_ROLE_ORDER_INVALID',
    mutate: (c) => ({ role_results: [c[1]!, c[0]!, c[2]!, c[3]!], loop_transcript_hash: loopTranscriptHash(c) }),
  },
  {
    name: 'missing synthesizer -> REQUIRED_ROLE_MISSING',
    code: 'N8_BOUNDED_DEBATE_REQUIRED_ROLE_MISSING',
    mutate: (c) => ({ role_results: c.slice(0, 3), loop_transcript_hash: loopTranscriptHash(c) }),
  },
  {
    name: 'non-runtime_verified provenance -> RUNTIME_CONTEXT_DRIFT',
    code: 'N8_BOUNDED_DEBATE_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
    mutate: (c) => { const t = tamper(c, DRAFT, { runtime_provenance_class: 'legacy_unverified' }); return { role_results: t, loop_transcript_hash: loopTranscriptHash(t) }; },
  },
  {
    name: 'profile hash drift -> ARTIFACT_PROFILE_DRIFT',
    code: 'N8_BOUNDED_DEBATE_ARTIFACT_PROFILE_DRIFT',
    mutate: (c) => { const t = tamper(c, CRITIC, { context_policy_profile_hash: 'tampered' }); return { role_results: t, loop_transcript_hash: loopTranscriptHash(t) }; },
  },
  {
    name: 'prompt packet drift -> ARTIFACT_PROMPT_DRIFT',
    code: 'N8_BOUNDED_DEBATE_ARTIFACT_PROMPT_DRIFT',
    mutate: (c) => { const t = tamper(c, DRAFT, { prompt_packet_hash: 'b'.repeat(64) }); return { role_results: t, loop_transcript_hash: loopTranscriptHash(t) }; },
  },
  {
    name: 'payload hash mismatch -> ARTIFACT_PAYLOAD_HASH_MISMATCH',
    code: 'N8_BOUNDED_DEBATE_ARTIFACT_PAYLOAD_HASH_MISMATCH',
    mutate: (c) => {
      // tamper all three payload-hash fields together so the per-role check (not the prior-chain) trips
      const t = tamper(c, DRAFT, { role_artifact_hash: 'c'.repeat(64), normalized_output_hash: 'c'.repeat(64), structured_output_hash: 'c'.repeat(64) });
      return { role_results: t, loop_transcript_hash: loopTranscriptHash(t) };
    },
  },
  {
    name: 'source hash drift -> SOURCE_HASH_DRIFT',
    code: 'N8_BOUNDED_DEBATE_SOURCE_HASH_DRIFT',
    mutate: (c) => { const t = tamper(c, CRITIC, { source_hashes: { frozen_input_hash: 'zzz' } }); return { role_results: t, loop_transcript_hash: loopTranscriptHash(t) }; },
  },
  {
    name: 'broken prior-role chain -> PRIOR_ROLE_HASH_DRIFT',
    code: 'N8_BOUNDED_DEBATE_PRIOR_ROLE_HASH_DRIFT',
    mutate: (c) => { const t = tamper(c, FINAL, { prior_role_artifact_hashes: { [DRAFT!]: '0'.repeat(64), [CRITIC!]: c[1]!.artifact.role_artifact_hash, [REPAIR!]: c[2]!.artifact.role_artifact_hash } }); return { role_results: t, loop_transcript_hash: loopTranscriptHash(t) }; },
  },
  {
    name: 'corrupted loop transcript -> LOOP_TRANSCRIPT_DRIFT',
    code: 'N8_BOUNDED_DEBATE_LOOP_TRANSCRIPT_DRIFT',
    mutate: (c) => ({ role_results: c, loop_transcript_hash: '0'.repeat(64) }),
  },
  {
    name: 'forbidden authority field in a role output -> FORBIDDEN_AUTHORITY_FIELD',
    code: 'N8_BOUNDED_DEBATE_FORBIDDEN_AUTHORITY_FIELD',
    mutate: (c) => {
      // inject a forbidden key into the draft output, re-hash so the per-role payload check still passes
      const draft = c[0]!;
      const structured_output = { ...draft.structured_output, value_disposition: 'advance' } as TopicSelectionV1bN8BoundedDebateRoleOutput;
      const hash = canonicalHash(structured_output);
      const artifact = { ...draft.artifact, role_artifact_hash: hash, normalized_output_hash: hash, structured_output_hash: hash };
      const tampered = [{ artifact, structured_output }, c[1]!, c[2]!, c[3]!];
      return { role_results: tampered, loop_transcript_hash: loopTranscriptHash(tampered) };
    },
  },
  {
    name: 'drifted role-output schema_version -> ROLE_OUTPUT_SCHEMA_VERSION',
    code: 'N8_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION',
    mutate: (c) => mutateSchemaVersion(c, 'TopicSelectionV1bN8BoundedDebateRoleOutput@v0'),
  },
  {
    name: 'missing role-output schema_version -> ROLE_OUTPUT_SCHEMA_VERSION',
    code: 'N8_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION',
    mutate: (c) => mutateSchemaVersion(c, undefined),
  },
  {
    name: 'empty-string role-output schema_version -> ROLE_OUTPUT_SCHEMA_VERSION',
    code: 'N8_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION',
    mutate: (c) => mutateSchemaVersion(c, ''),
  },
];

// Critic-resolution negatives need a FULLY consistent chain (re-hashing a tampered role would trip the
// prior-role chain first), so they rebuild the candidates with a per-role output override.
const resolutionNegatives: Array<{ name: string; override: Partial<Record<string, TopicSelectionV1bN8BoundedDebateRoleOutput>>; code: string }> = [
  {
    name: 'unresolved material critic finding -> CRITIC_FINDING_UNRESOLVED',
    code: 'N8_BOUNDED_DEBATE_CRITIC_FINDING_UNRESOLVED',
    override: { [REPAIR!]: { schema_version: OUTPUT_CONTRACT, role_slot: REPAIR, repair_actions: [{ finding_code: 'CF1', action: 'noted', resolved: false }] } as TopicSelectionV1bN8BoundedDebateRoleOutput },
  },
  {
    name: 'material critic finding without finding_code -> CRITIC_FINDING_UNRESOLVED',
    code: 'N8_BOUNDED_DEBATE_CRITIC_FINDING_UNRESOLVED',
    override: { [CRITIC!]: { schema_version: OUTPUT_CONTRACT, role_slot: CRITIC, critic_findings: [{ severity: 'material', statement: 'no code' }] } as TopicSelectionV1bN8BoundedDebateRoleOutput },
  },
];

for (const negative of negatives) {
  test(`v1b N8 admission blocks: ${negative.name}`, async () => {
    const candidates = makeCandidates();
    const input = negative.mutate(candidates);
    const result = await makeAdmission().admit(input);
    assert.equal(result.admitted, false);
    if (result.admitted) throw new Error('expected block');
    assert.equal(result.blocker.code, negative.code);
  });
}

for (const negative of resolutionNegatives) {
  test(`v1b N8 admission blocks: ${negative.name}`, async () => {
    const candidates = makeCandidates(negative.override);
    const result = await makeAdmission().admit({ role_results: candidates, loop_transcript_hash: loopTranscriptHash(candidates) });
    assert.equal(result.admitted, false);
    if (result.admitted) throw new Error('expected block');
    assert.equal(result.blocker.code, negative.code);
  });
}
