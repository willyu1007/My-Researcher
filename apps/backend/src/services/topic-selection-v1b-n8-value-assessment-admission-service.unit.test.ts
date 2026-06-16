// T-127 Phase 1 / W-05 — co-located unit coverage for the v1b N8 value-assessment
// (model_draft_for_gate) admission byte-match. The admission service is fed a CONTROLLED
// expected-identity object plus a hand-built artifact that matches it by construction
// (happy path), then exactly one field is tampered per negative case to prove each
// drift / provenance / structural blocker actually fires. Mirrors the v1b N7 support
// admission negatives, adapted to the single model_draft_for_gate artifact contract.

import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import {
  TopicSelectionV1bN8ValueAssessmentAdmissionService,
  type TopicSelectionV1bN8ValueAssessmentAdmissionExpectedIdentity,
} from './topic-selection-v1b-n8-value-assessment-admission-service.js';

const hashProfile = '1'.repeat(64);
const hashRic = '2'.repeat(64);
const hashFrozen = '3'.repeat(64);
const hashHandoff = '4'.repeat(64);
const hashPrompt = '5'.repeat(64);
const hashAudit = '6'.repeat(64);
const payloadHash = '7'.repeat(64);
const placeholderHash = 'c'.repeat(64); // member of PLACEHOLDER_HASHES

function ref(refType: string, refId: string) {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: null,
  };
}

function expected(
  overrides: Partial<TopicSelectionV1bN8ValueAssessmentAdmissionExpectedIdentity> = {},
): TopicSelectionV1bN8ValueAssessmentAdmissionExpectedIdentity {
  return {
    slot_id: 'n8_value_assessment_draft',
    output_contract: 'TopicValueAssessmentDraft@v1',
    context_policy_profile_id: 'topic-selection.v1b.n8.value-assessment.context-runtime@v1',
    context_policy_profile_version: 'v1',
    context_policy_profile_hash: hashProfile,
    prompt_variant_key: 'n8_value_assessment_draft',
    prompt_packet_hash: hashPrompt,
    runtime_invocation_context_hash: hashRic,
    run_mode: 'acceptance',
    redaction_policy: 'topic-selection-redacted-ref-backed-v1',
    source_hashes: {
      frozen_input_hash: hashFrozen,
      n7_handoff_hash: hashHandoff,
    },
    normalized_payload_hash: payloadHash,
    ...overrides,
  };
}

function artifact(
  overrides: Partial<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> = {},
): TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef {
  return {
    slot_id: 'n8_value_assessment_draft',
    node_id: 'topic-selection.v1b.assess-topic-value.v1',
    execution_mode: 'codex_assisted',
    run_mode: 'acceptance',
    allowed_effect: 'model_draft_for_gate',
    support_artifact_ref: ref('artifact_ref', 'support_001'),
    support_artifact_hash: payloadHash,
    normalized_output_ref: ref('artifact_ref', 'normalized_001'),
    normalized_output_hash: payloadHash,
    output_contract: 'TopicValueAssessmentDraft@v1',
    profile_id: 'topic-selection.v1b.value-assessment-draft.codex.v1',
    model_option_id: null,
    input_hash: hashFrozen,
    prompt_packet_hash: hashPrompt,
    structured_output_hash: payloadHash,
    adapter_policy_version: 'topic-selection-v1b-node-policy-v1',
    slot_spec_hash: hashAudit,
    provenance_ref: ref('artifact_ref', 'runtime_audit_001'),
    runtime_provenance_class: 'runtime_verified',
    context_policy_profile_id: 'topic-selection.v1b.n8.value-assessment.context-runtime@v1',
    context_policy_profile_version: 'v1',
    context_policy_profile_hash: hashProfile,
    prompt_variant_key: 'n8_value_assessment_draft',
    runtime_invocation_context_hash: hashRic,
    redaction_policy: 'topic-selection-redacted-ref-backed-v1',
    source_hashes: {
      frozen_input_hash: hashFrozen,
      n7_handoff_hash: hashHandoff,
    },
    runtime_audit_ref: ref('artifact_ref', 'runtime_audit_001'),
    runtime_audit_hash: hashAudit,
    compression_report_ref: null,
    compression_report_hash: null,
    compressed_context_hash: null,
    ...overrides,
  } as TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
}

// HAPPY PATH — runtime_verified artifact whose identity matches the expected runtime slot by
// construction is admitted with the runtime_verified provenance class and no warnings.
test('v1b N8 value admission admits a runtime_verified, byte-matching draft artifact', () => {
  const service = new TopicSelectionV1bN8ValueAssessmentAdmissionService();
  const result = service.admit({
    artifact: artifact(),
    expected: expected(),
    allow_fixture_replay: false,
  });
  if (!result.admitted) {
    throw new Error(`Expected runtime value admission to pass, got blocker: ${result.blocker.code}`);
  }
  assert.equal(result.runtime_provenance_class, 'runtime_verified');
  assert.deepEqual(result.warnings, []);
  assert.equal(result.artifact.slot_id, 'n8_value_assessment_draft');
});

// NEGATIVE (provenance) — a legacy_unverified value draft cannot enter promoted admission.
test('v1b N8 value admission blocks legacy_unverified draft artifacts', () => {
  const service = new TopicSelectionV1bN8ValueAssessmentAdmissionService();
  const result = service.admit({
    artifact: artifact({ runtime_provenance_class: 'legacy_unverified' }),
    expected: expected(),
    allow_fixture_replay: true,
  });
  if (result.admitted) {
    throw new Error('Expected legacy_unverified draft to block.');
  }
  assert.equal(result.blocker.code, 'N8_DRAFT_ARTIFACT_LEGACY_UNVERIFIED');
});

// NEGATIVE (fixture provenance class) — fixture_replay is rejected outside fixture mode and
// admitted (with the fixture warning) inside it.
test('v1b N8 value admission gates fixture_replay drafts on allow_fixture_replay', () => {
  const service = new TopicSelectionV1bN8ValueAssessmentAdmissionService();

  const blocked = service.admit({
    artifact: artifact({ runtime_provenance_class: 'fixture_replay' }),
    expected: expected(),
    allow_fixture_replay: false,
  });
  if (blocked.admitted) {
    throw new Error('Expected fixture_replay draft to block outside fixture mode.');
  }
  assert.equal(blocked.blocker.code, 'N8_DRAFT_ARTIFACT_PROVENANCE_CLASS_INVALID');

  const allowed = service.admit({
    artifact: artifact({ runtime_provenance_class: 'fixture_replay' }),
    expected: expected(),
    allow_fixture_replay: true,
  });
  if (!allowed.admitted) {
    throw new Error(`Expected fixture_replay draft to pass in fixture mode: ${allowed.blocker.code}`);
  }
  assert.equal(allowed.runtime_provenance_class, 'fixture_replay');
  assert.deepEqual(allowed.warnings, ['fixture_replay_n8_value_draft_admitted']);
});

// NEGATIVE (drift matrix) — each single-field tamper proves a distinct blocker fires.
test('v1b N8 value admission blocks profile, payload, prompt, runtime, and source drift', () => {
  const service = new TopicSelectionV1bN8ValueAssessmentAdmissionService();
  const cases: Array<{
    name: string;
    artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    code: string;
  }> = [
    {
      name: 'wrong slot -> PROFILE_DRIFT',
      artifact: artifact({ slot_id: 'n8_debate_assessor_draft' }),
      code: 'N8_DRAFT_ARTIFACT_PROFILE_DRIFT',
    },
    {
      name: 'wrong allowed_effect -> PROFILE_DRIFT',
      artifact: artifact({ allowed_effect: 'support_only' }),
      code: 'N8_DRAFT_ARTIFACT_PROFILE_DRIFT',
    },
    {
      name: 'payload hash mismatch -> PAYLOAD_HASH_MISMATCH',
      artifact: artifact({ normalized_output_hash: '8'.repeat(64) }),
      code: 'N8_DRAFT_ARTIFACT_PAYLOAD_HASH_MISMATCH',
    },
    {
      name: 'wrong execution_mode -> PROVENANCE_CLASS_INVALID',
      artifact: artifact({ execution_mode: 'human_delegated' }),
      code: 'N8_DRAFT_ARTIFACT_PROVENANCE_CLASS_INVALID',
    },
    {
      name: 'run_mode drift -> RUNTIME_CONTEXT_DRIFT',
      artifact: artifact({ run_mode: 'product' }),
      code: 'N8_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
    },
    {
      name: 'profile hash drift -> PROFILE_DRIFT',
      artifact: artifact({ context_policy_profile_hash: '8'.repeat(64) }),
      code: 'N8_DRAFT_ARTIFACT_PROFILE_DRIFT',
    },
    {
      name: 'redaction policy drift -> PROFILE_DRIFT',
      artifact: artifact({ redaction_policy: 'wrong-policy' }),
      code: 'N8_DRAFT_ARTIFACT_PROFILE_DRIFT',
    },
    {
      name: 'prompt variant drift -> PROMPT_IDENTITY_DRIFT',
      artifact: artifact({ prompt_variant_key: 'wrong_variant' }),
      code: 'N8_DRAFT_ARTIFACT_PROMPT_IDENTITY_DRIFT',
    },
    {
      name: 'prompt packet drift -> PROMPT_IDENTITY_DRIFT',
      artifact: artifact({ prompt_packet_hash: '8'.repeat(64) }),
      code: 'N8_DRAFT_ARTIFACT_PROMPT_IDENTITY_DRIFT',
    },
    {
      name: 'placeholder prompt packet -> PROMPT_IDENTITY_DRIFT',
      artifact: artifact({ prompt_packet_hash: placeholderHash }),
      code: 'N8_DRAFT_ARTIFACT_PROMPT_IDENTITY_DRIFT',
    },
    {
      name: 'runtime invocation drift -> RUNTIME_CONTEXT_DRIFT',
      artifact: artifact({ runtime_invocation_context_hash: '8'.repeat(64) }),
      code: 'N8_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
    },
    {
      name: 'runtime audit ref type -> RUNTIME_CONTEXT_DRIFT',
      artifact: artifact({
        provenance_ref: ref('runtime_audit', 'runtime_audit_001'),
        runtime_audit_ref: ref('runtime_audit', 'runtime_audit_001'),
      }),
      code: 'N8_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
    },
    {
      name: 'provenance ref not pointing at audit -> RUNTIME_CONTEXT_DRIFT',
      artifact: artifact({ provenance_ref: ref('artifact_ref', 'other_runtime_audit') }),
      code: 'N8_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
    },
    {
      name: 'source hash drift -> SOURCE_HASH_DRIFT',
      artifact: artifact({ source_hashes: { frozen_input_hash: hashFrozen } }),
      code: 'N8_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT',
    },
    {
      name: 'extra source hash -> SOURCE_HASH_DRIFT',
      artifact: artifact({
        source_hashes: { frozen_input_hash: hashFrozen, n7_handoff_hash: hashHandoff, extra: hashPrompt },
      }),
      code: 'N8_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT',
    },
    {
      name: 'incoherent compression identity -> PROMPT_IDENTITY_DRIFT',
      artifact: artifact({ compressed_context_hash: hashPrompt }),
      code: 'N8_DRAFT_ARTIFACT_PROMPT_IDENTITY_DRIFT',
    },
  ];

  for (const item of cases) {
    const result = service.admit({
      artifact: item.artifact,
      expected: expected(),
      allow_fixture_replay: false,
    });
    if (result.admitted) {
      throw new Error(`Expected ${item.name} to block.`);
    }
    assert.equal(result.blocker.code, item.code, item.name);
  }
});

// NEGATIVE (missing prompt identity on the expected side) — when the expected runtime prompt
// packet hash is null, the prompt-identity guard rejects rather than admitting on a null match.
test('v1b N8 value admission blocks when expected prompt_packet_hash is missing', () => {
  const service = new TopicSelectionV1bN8ValueAssessmentAdmissionService();
  const result = service.admit({
    artifact: artifact(),
    expected: expected({ prompt_packet_hash: null }),
    allow_fixture_replay: false,
  });
  if (result.admitted) {
    throw new Error('Expected missing expected prompt packet hash to block.');
  }
  assert.equal(result.blocker.code, 'N8_DRAFT_ARTIFACT_PROMPT_IDENTITY_DRIFT');
});
