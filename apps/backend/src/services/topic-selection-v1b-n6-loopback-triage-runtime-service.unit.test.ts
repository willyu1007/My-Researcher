// T-127 Phase 1 / W-05 — runtime verification for the v1b N6 loopback-triage support runtime.
//
// Scope: the REAL service (TopicSelectionV1bN6LoopbackTriageRuntimeService) driven through the REAL
// agent orchestrator in `mocked_llm` mode against an in-memory control plane — no DB, no network, no
// real LLM. The mocked structured output is validated by the orchestrator against the N6 loopback
// triage support schema, hashed, recorded, and admitted, so the happy path asserts the real produced
// semantic_artifact shape (allowed_effect / runtime_provenance_class / output_contract / hashes) and
// the echoed structured output. Negative cases exercise the runtime's own guards: a wrong node_id
// fails the N5→N6 frozen-lineage assertion, and a malformed failed-draft artifact fails the
// failed-draft identity assertion — both as thrown INVALID_PAYLOAD AppErrors.

import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
  type TopicSelectionV1bN6HarnessFrozenInputPayload,
  type TopicSelectionV1bN6LoopbackTriageSupportPayload,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
  type TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { AppError } from '../errors/app-error.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TopicSelectionV1bN6LoopbackTriageRuntimeService,
  type GenerateTopicSelectionV1bN6LoopbackTriageRuntimeInput,
} from './topic-selection-v1b-n6-loopback-triage-runtime-service.js';

const N6_NODE_ID = 'topic-selection.v1b.generate-topic-question-candidates.v1' as const;
const FAILED_DRAFT_HASH = '7'.repeat(64);

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return { ref_type: refType, ref_id: refId, title_card_id: 'title_card_001', version_id: null };
}

function makeSubject() {
  const repository = new InMemoryTopicSelectionControlPlaneRepository();
  const controlPlane = new TopicSelectionControlPlaneService(repository, {
    idFactory: (() => {
      const counts = new Map<string, number>();
      return (prefix: string) => {
        const next = (counts.get(prefix) ?? 0) + 1;
        counts.set(prefix, next);
        return `${prefix}_${String(next).padStart(3, '0')}`;
      };
    })(),
    now: () => '2026-06-16T00:00:00.000Z',
  });
  const runtime = new TopicSelectionV1bN6LoopbackTriageRuntimeService(controlPlane);
  return { runtime, controlPlane };
}

function frozenPayload(): TopicSelectionV1bN6HarnessFrozenInputPayload {
  return {
    n5_handoff_hash: 'a'.repeat(64),
    constraint_profile_ref: ref('constraint_profile', 'constraint_profile_001'),
    constraint_profile_hash: 'b'.repeat(64),
    intake_readiness_ref: ref('intake_readiness', 'intake_readiness_001'),
    intake_readiness_hash: 'c'.repeat(64),
    research_slice_ref: ref('research_slice', 'research_slice_001'),
    research_slice_hash: 'd'.repeat(64),
    research_slice_selection_ref: ref('research_slice_selection', 'research_slice_selection_001'),
    research_slice_selection_hash: 'e'.repeat(64),
    research_slice_option_set_ref: ref('research_slice_option_set', 'research_slice_option_set_001'),
    research_slice_option_set_hash: 'f'.repeat(64),
    selected_slice_option_ref: ref('selected_slice_option', 'selected_slice_option_001'),
    selected_slice_option_hash: '1'.repeat(64),
  };
}

function makeRequest(
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): TopicSelectionV1bWorkflowHarnessRunRequest {
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    workflow_run_id: 'workflow_run_n6_loopback_001',
    node_attempt_id: 'node_attempt_n6_loopback_001',
    node_id: N6_NODE_ID,
    policy_version: 'topic-selection-v1b-node-policy-v1',
    run_mode: 'test',
    created_by: 'system',
    frozen_input: {
      input_contract: 'TopicSelectionV1bN5ToN6Handoff@v1',
      snapshot_kind: 'n6_frozen_input',
      source_refs: [ref('frozen_input_source', 'frozen_input_source_001')],
      payload: frozenPayload() as unknown as Record<string, unknown>,
    },
    ...overrides,
  };
}

// A valid failed N6 draft artifact: the loopback triage runtime requires the failed candidate draft
// to carry the N6 node id, the question-candidate-draft slot, the model_draft_for_gate effect, the
// TopicQuestionCandidateSetDraft@v1 contract, a normalized output ref, and all three payload hashes
// equal to the failed-draft hash.
function failedDraftArtifact(
  overrides: Partial<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> = {},
): TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef {
  return {
    slot_id: 'n6_question_candidate_draft',
    node_id: N6_NODE_ID,
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    allowed_effect: 'model_draft_for_gate',
    support_artifact_ref: ref('artifact_ref', 'failed_support_001'),
    support_artifact_hash: FAILED_DRAFT_HASH,
    normalized_output_ref: ref('artifact_ref', 'failed_normalized_001'),
    normalized_output_hash: FAILED_DRAFT_HASH,
    output_contract: 'TopicQuestionCandidateSetDraft@v1',
    profile_id: 'topic-selection.v1b.topic-question-candidates.single-agent.v1',
    model_option_id: null,
    input_hash: '2'.repeat(64),
    prompt_packet_hash: '3'.repeat(64),
    structured_output_hash: FAILED_DRAFT_HASH,
    adapter_policy_version: 'topic-selection-v1b-node-policy-v1',
    slot_spec_hash: '4'.repeat(64),
    provenance_ref: ref('artifact_ref', 'failed_runtime_audit_001'),
    runtime_provenance_class: 'runtime_verified',
    context_policy_profile_id: 'topic-selection.v1b.n6.question-candidate-draft.context-runtime@v1',
    context_policy_profile_version: 'v1',
    context_policy_profile_hash: '5'.repeat(64),
    prompt_variant_key: 'n6_question_candidate_draft',
    runtime_invocation_context_hash: '6'.repeat(64),
    redaction_policy: 'topic-selection-redacted-ref-backed-v1',
    source_hashes: { frozen_input_hash: '2'.repeat(64) },
    runtime_audit_ref: ref('artifact_ref', 'failed_runtime_audit_001'),
    runtime_audit_hash: '8'.repeat(64),
    compression_report_ref: null,
    compression_report_hash: null,
    compressed_context_hash: null,
    ...overrides,
  };
}

// A schema-valid N6 loopback triage support payload. `n6_regenerate_candidates` requires a
// candidate_level/question_frame_level failure scope and null debate_escalation + null
// upstream_rollback (the allOf branch in the support schema).
function supportOutput(
  overrides: Partial<TopicSelectionV1bN6LoopbackTriageSupportPayload> = {},
): TopicSelectionV1bN6LoopbackTriageSupportPayload {
  return {
    loopback_target_code: 'n6_regenerate_candidates',
    failure_scope: 'candidate_level',
    dominant_reason_codes: ['candidate_answerability_weak'],
    affected_refs: [ref('topic_question_candidate', 'failed_candidate_001')],
    regeneration_hints: ['Tighten the answerability framing for the active candidate.'],
    debate_escalation: null,
    upstream_rollback: null,
    rationale: 'Regenerate candidates: the failed draft is recoverable at the candidate level.',
    ...overrides,
  };
}

function generateInput(
  request: TopicSelectionV1bWorkflowHarnessRunRequest,
  options: {
    failedDraftArtifact?: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    output?: TopicSelectionV1bN6LoopbackTriageSupportPayload;
  } = {},
): GenerateTopicSelectionV1bN6LoopbackTriageRuntimeInput {
  return {
    request,
    failed_draft_artifact: options.failedDraftArtifact ?? failedDraftArtifact(),
    failed_draft_hash: FAILED_DRAFT_HASH,
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    mocked_output: {
      fixture_id: 'fixture_n6_loopback_triage_001',
      output: options.output ?? supportOutput(),
    },
    created_by: 'system',
  };
}

test('v1b N6 loopback triage runtime produces a runtime-verified support artifact from a mocked output', async () => {
  const { runtime } = makeSubject();
  const result = await runtime.generateSupportArtifact(generateInput(makeRequest()));

  assert.equal(result.status, 'succeeded');
  if (result.status !== 'succeeded') {
    throw new Error('Expected N6 loopback triage support generation to succeed.');
  }

  // The orchestrator validated, hashed, and admitted the mocked support payload; the runtime recorded
  // a non-authority support_only semantic artifact under the runtime_verified provenance class.
  const artifact = result.semantic_artifact;
  assert.equal(artifact.slot_id, 'n6_loopback_triage');
  assert.equal(artifact.node_id, N6_NODE_ID);
  assert.equal(artifact.allowed_effect, 'support_only');
  assert.equal(artifact.output_contract, 'N6LoopbackTriageSupport@v1');
  assert.equal(artifact.execution_mode, 'mocked_llm');
  assert.equal(artifact.run_mode, 'test');
  assert.equal(artifact.runtime_provenance_class, 'runtime_verified');
  assert.match(artifact.structured_output_hash, /^[a-f0-9]{64}$/);
  assert.equal(artifact.normalized_output_hash, artifact.structured_output_hash);
  assert.equal(artifact.support_artifact_hash, artifact.structured_output_hash);

  // The failed-draft lineage and the failed-draft hash flow into the support artifact source hashes.
  assert.equal(artifact.source_hashes.failed_draft_hash, FAILED_DRAFT_HASH);
  assert.equal(artifact.source_hashes.n5_handoff_hash, 'a'.repeat(64));

  // The structured output the runtime echoes is the admitted loopback decision.
  assert.equal(result.structured_output.loopback_target_code, 'n6_regenerate_candidates');
  assert.equal(result.structured_output.failure_scope, 'candidate_level');
  assert.equal(result.invocation_result.status, 'succeeded');
  assert.match(result.context_packet_hash, /^[a-f0-9]{64}$/);
});

test('v1b N6 loopback triage runtime is byte-stable across runs with identical fixed ids', async () => {
  const first = await makeSubject().runtime.generateSupportArtifact(generateInput(makeRequest()));
  const second = await makeSubject().runtime.generateSupportArtifact(generateInput(makeRequest()));
  assert.equal(first.status, 'succeeded');
  assert.equal(second.status, 'succeeded');
  if (first.status !== 'succeeded' || second.status !== 'succeeded') {
    throw new Error('Expected both runs to succeed.');
  }
  // The structured-output identity and context-packet identity are independent of the incrementing
  // control-plane ref ids, so a fresh control plane reproduces them byte-for-byte.
  assert.equal(
    first.semantic_artifact.structured_output_hash,
    second.semantic_artifact.structured_output_hash,
  );
  assert.equal(first.context_packet_hash, second.context_packet_hash);
});

test('v1b N6 loopback triage runtime rejects a request that is not the v1b N6 node', async () => {
  const { runtime } = makeSubject();
  const request = makeRequest({
    node_id: 'topic-selection.v1b.assess-topic-value.v1' as TopicSelectionV1bWorkflowHarnessRunRequest['node_id'],
  });

  await assert.rejects(
    () => runtime.generateSupportArtifact(generateInput(request)),
    (error: unknown) => {
      assert.ok(error instanceof AppError, 'Expected an AppError.');
      assert.equal(error.errorCode, 'INVALID_PAYLOAD');
      assert.match(error.message, /v1b N6 node id/);
      return true;
    },
  );
});

test('v1b N6 loopback triage runtime rejects frozen input missing the N5-to-N6 lineage', async () => {
  const { runtime } = makeSubject();
  const request = makeRequest();
  // Drop a required lineage field from the frozen N5→N6 payload.
  const payload = { ...frozenPayload() } as Record<string, unknown>;
  delete payload.selected_slice_option_hash;
  request.frozen_input.payload = payload;

  await assert.rejects(
    () => runtime.generateSupportArtifact(generateInput(request)),
    (error: unknown) => {
      assert.ok(error instanceof AppError, 'Expected an AppError.');
      assert.equal(error.errorCode, 'INVALID_PAYLOAD');
      assert.match(error.message, /frozen N5-to-N6 lineage/);
      return true;
    },
  );
});

test('v1b N6 loopback triage runtime rejects a failed-draft artifact that is not a failed N6 candidate draft', async () => {
  const { runtime } = makeSubject();
  // Wrong slot id: the failed draft must be the n6_question_candidate_draft model_draft_for_gate.
  const malformed = failedDraftArtifact({ slot_id: 'n6_loopback_triage' });

  await assert.rejects(
    () => runtime.generateSupportArtifact(generateInput(makeRequest(), { failedDraftArtifact: malformed })),
    (error: unknown) => {
      assert.ok(error instanceof AppError, 'Expected an AppError.');
      assert.equal(error.errorCode, 'INVALID_PAYLOAD');
      assert.match(error.message, /failed N6 draft artifact/);
      return true;
    },
  );
});

test('v1b N6 loopback triage runtime rejects a failed-draft artifact whose hash does not match the failed-draft payload hash', async () => {
  const { runtime } = makeSubject();
  // The artifact's payload hashes must equal the supplied failed_draft_hash.
  const mismatched = failedDraftArtifact({ structured_output_hash: '9'.repeat(64) });

  await assert.rejects(
    () => runtime.generateSupportArtifact(generateInput(makeRequest(), { failedDraftArtifact: mismatched })),
    (error: unknown) => {
      assert.ok(error instanceof AppError, 'Expected an AppError.');
      assert.equal(error.errorCode, 'INVALID_PAYLOAD');
      assert.match(error.message, /hash does not match failed draft payload hash/);
      return true;
    },
  );
});
