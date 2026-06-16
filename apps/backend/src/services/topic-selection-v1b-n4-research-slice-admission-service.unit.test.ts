import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import {
  TopicSelectionV1bN4ResearchSliceAdmissionService,
  type TopicSelectionV1bN4ResearchSliceAdmissionExpectedIdentity,
} from './topic-selection-v1b-n4-research-slice-admission-service.js';

const hashA = 'a'.repeat(64);
const hashB = 'b'.repeat(64);
const hashC = '1'.repeat(64);
const hashD = '2'.repeat(64);
const hashE = '3'.repeat(64);
const hashF = '4'.repeat(64);
const payloadHash = '5'.repeat(64);

function ref(refType: string, refId: string) {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: null,
  };
}

function expected(
  overrides: Partial<TopicSelectionV1bN4ResearchSliceAdmissionExpectedIdentity> = {},
): TopicSelectionV1bN4ResearchSliceAdmissionExpectedIdentity {
  return {
    slot_id: 'n4_research_slice_option_draft',
    output_contract: 'ResearchSliceOptionSetDraft@v1',
    context_policy_profile_id: 'topic-selection.v1b.n4.research-slice.context-runtime@v1',
    context_policy_profile_version: 'v1',
    context_policy_profile_hash: hashA,
    prompt_variant_key: 'n4_research_slice_option_draft',
    prompt_packet_hash: hashE,
    runtime_invocation_context_hash: hashB,
    run_mode: 'acceptance',
    redaction_policy: 'topic-selection-redacted-ref-backed-v1',
    source_hashes: {
      frozen_input_hash: hashC,
      n3_handoff_hash: hashD,
    },
    normalized_payload_hash: payloadHash,
    ...overrides,
  };
}

function artifact(
  overrides: Partial<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> = {},
): TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef {
  return {
    slot_id: 'n4_research_slice_option_draft',
    node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
    execution_mode: 'codex_assisted',
    run_mode: 'acceptance',
    allowed_effect: 'model_draft_for_gate',
    support_artifact_ref: ref('artifact_ref', 'support_001'),
    support_artifact_hash: payloadHash,
    normalized_output_ref: ref('artifact_ref', 'normalized_001'),
    normalized_output_hash: payloadHash,
    output_contract: 'ResearchSliceOptionSetDraft@v1',
    profile_id: 'topic-selection.v1b.research-slice-options.single-agent.v1',
    model_option_id: null,
    input_hash: hashC,
    prompt_packet_hash: hashE,
    structured_output_hash: payloadHash,
    adapter_policy_version: 'topic-selection-v1b-node-policy-v1',
    slot_spec_hash: hashF,
    provenance_ref: ref('artifact_ref', 'runtime_audit_001'),
    runtime_provenance_class: 'runtime_verified',
    context_policy_profile_id: 'topic-selection.v1b.n4.research-slice.context-runtime@v1',
    context_policy_profile_version: 'v1',
    context_policy_profile_hash: hashA,
    prompt_variant_key: 'n4_research_slice_option_draft',
    runtime_invocation_context_hash: hashB,
    redaction_policy: 'topic-selection-redacted-ref-backed-v1',
    source_hashes: {
      frozen_input_hash: hashC,
      n3_handoff_hash: hashD,
    },
    runtime_audit_ref: ref('artifact_ref', 'runtime_audit_001'),
    runtime_audit_hash: hashF,
    compression_report_ref: null,
    compression_report_hash: null,
    compressed_context_hash: null,
    ...overrides,
  };
}

test('v1b N4 research-slice admission accepts runtime_verified drafts with exact runtime identity', () => {
  const service = new TopicSelectionV1bN4ResearchSliceAdmissionService();
  const result = service.admit({
    artifact: artifact(),
    expected: expected(),
    allow_fixture_replay: false,
  });
  if (!result.admitted) {
    throw new Error(`Expected runtime research-slice admission to pass: ${result.blocker.code}`);
  }
  assert.equal(result.runtime_provenance_class, 'runtime_verified');
  assert.deepEqual(result.warnings, []);
  assert.equal(result.artifact.slot_id, 'n4_research_slice_option_draft');
});

test('v1b N4 research-slice admission blocks legacy_unverified drafts even in fixture mode', () => {
  const service = new TopicSelectionV1bN4ResearchSliceAdmissionService();
  const legacy = service.admit({
    artifact: artifact({ runtime_provenance_class: 'legacy_unverified' }),
    expected: expected(),
    allow_fixture_replay: true,
  });
  if (legacy.admitted) {
    throw new Error('Expected legacy_unverified draft to block.');
  }
  assert.equal(legacy.blocker.code, 'N4_DRAFT_ARTIFACT_LEGACY_UNVERIFIED');
});

test('v1b N4 research-slice admission gates fixture_replay drafts on fixture mode', () => {
  const service = new TopicSelectionV1bN4ResearchSliceAdmissionService();
  const blocked = service.admit({
    artifact: artifact({ runtime_provenance_class: 'fixture_replay' }),
    expected: expected(),
    allow_fixture_replay: false,
  });
  if (blocked.admitted) {
    throw new Error('Expected fixture_replay draft to block outside fixture mode.');
  }
  assert.equal(blocked.blocker.code, 'N4_DRAFT_ARTIFACT_PROVENANCE_CLASS_INVALID');

  const allowed = service.admit({
    artifact: artifact({ runtime_provenance_class: 'fixture_replay' }),
    expected: expected(),
    allow_fixture_replay: true,
  });
  if (!allowed.admitted) {
    throw new Error(`Expected fixture_replay draft to pass in fixture mode: ${allowed.blocker.code}`);
  }
  assert.equal(allowed.runtime_provenance_class, 'fixture_replay');
  assert.deepEqual(allowed.warnings, ['fixture_replay_n4_research_slice_draft_admitted']);
});

test('v1b N4 research-slice admission blocks profile, payload, prompt, runtime, and source drift', () => {
  const service = new TopicSelectionV1bN4ResearchSliceAdmissionService();
  const cases: Array<{
    name: string;
    artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    code: string;
  }> = [
    {
      name: 'wrong allowed effect',
      artifact: artifact({ allowed_effect: 'support_only' }),
      code: 'N4_DRAFT_ARTIFACT_PROFILE_DRIFT',
    },
    {
      name: 'output contract drift',
      artifact: artifact({ output_contract: 'WrongContract@v1' }),
      code: 'N4_DRAFT_ARTIFACT_PROFILE_DRIFT',
    },
    {
      name: 'payload hash mismatch',
      artifact: artifact({ normalized_output_hash: '6'.repeat(64) }),
      code: 'N4_DRAFT_ARTIFACT_PAYLOAD_HASH_MISMATCH',
    },
    {
      name: 'context policy profile drift',
      artifact: artifact({ context_policy_profile_hash: '6'.repeat(64) }),
      code: 'N4_DRAFT_ARTIFACT_PROFILE_DRIFT',
    },
    {
      name: 'run_mode drift',
      artifact: artifact({ run_mode: 'product' }),
      code: 'N4_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
    },
    {
      name: 'prompt variant drift',
      artifact: artifact({ prompt_variant_key: 'wrong_variant' }),
      code: 'N4_DRAFT_ARTIFACT_PROMPT_IDENTITY_DRIFT',
    },
    {
      name: 'placeholder prompt packet',
      artifact: artifact({ prompt_packet_hash: 'c'.repeat(64) }),
      code: 'N4_DRAFT_ARTIFACT_PROMPT_IDENTITY_DRIFT',
    },
    {
      name: 'runtime invocation drift',
      artifact: artifact({ runtime_invocation_context_hash: '6'.repeat(64) }),
      code: 'N4_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
    },
    {
      name: 'runtime audit ref type drift',
      artifact: artifact({ runtime_audit_ref: ref('runtime_audit', 'runtime_audit_001') }),
      code: 'N4_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
    },
    {
      name: 'provenance ref / audit ref mismatch',
      artifact: artifact({ provenance_ref: ref('artifact_ref', 'other_runtime_audit') }),
      code: 'N4_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
    },
    {
      name: 'source hash drift',
      artifact: artifact({ source_hashes: { frozen_input_hash: hashC } }),
      code: 'N4_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT',
    },
    {
      name: 'incoherent compression identity',
      artifact: artifact({ compressed_context_hash: hashE }),
      code: 'N4_DRAFT_ARTIFACT_PROMPT_IDENTITY_DRIFT',
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
