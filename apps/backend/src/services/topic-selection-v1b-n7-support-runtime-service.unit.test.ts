// T-127 Phase 1 / W-05 — runtime verification for the v1b N7 semantic-support runtime service.
//
// Scope: the NEW N7 support runtime — building the non-authority context packet, recording it on
// the REAL in-memory control plane, driving the REAL agent orchestrator (constructed internally by
// the service) with a deterministic mocked_llm fixture, and folding the verified structured output
// into a runtime_verified semantic-support artifact ref. The happy path asserts the produced
// artifact's support-only lineage and the byte-stable structured output; negatives exercise the
// service's own frozen-payload guards (assertN7FrozenPayload) which throw before any orchestrator
// call, keeping the negative cases fully isolated and deterministic.

import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
  type TopicSelectionV1bCandidateGroupingSupportPayload,
  type TopicSelectionV1bN7HarnessFrozenInputPayload,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { AppError } from '../errors/app-error.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TopicSelectionV1bN7SupportRuntimeService,
} from './topic-selection-v1b-n7-support-runtime-service.js';

const N7_NODE_ID = 'topic-selection.v1b.materialize-topic-question-contract.v1' as const;
const CANDIDATE_GROUPING_OUTPUT_CONTRACT = 'CandidateGroupingSupport@v1';

const hashA = 'a'.repeat(64);
const hashB = 'b'.repeat(64);
const hashC = 'c'.repeat(64);
const hashD = 'd'.repeat(64);
const hashE = 'e'.repeat(64);
const hashF = 'f'.repeat(64);
const hash1 = '1'.repeat(64);
const hash2 = '2'.repeat(64);

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
  const runtime = new TopicSelectionV1bN7SupportRuntimeService(controlPlane);
  return { runtime, controlPlane };
}

function frozenPayload(): TopicSelectionV1bN7HarnessFrozenInputPayload {
  return {
    input_mode: 'initial_from_n6',
    n6_handoff_hash: hashA,
    topic_question_candidate_set_ref: ref('topic_question_candidate_set', 'candidate_set_001'),
    topic_question_candidate_set_hash: hashB,
    admissible_candidate_refs: [
      ref('topic_question_candidate', 'candidate_001'),
      ref('topic_question_candidate', 'candidate_002'),
    ],
    admissible_candidate_hashes: [hashC, hashD],
    selected_research_slice_ref: ref('selected_research_slice', 'research_slice_001'),
    selected_research_slice_hash: hashE,
    generation_artifact_ref: ref('generation_artifact', 'generation_artifact_001'),
    generation_artifact_hash: hashF,
    candidate_gate_hash: hash1,
    candidate_grouping_ref: ref('candidate_grouping', 'candidate_grouping_001'),
    candidate_grouping_hash: hash2,
  };
}

function makeRequest(
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
  payload: TopicSelectionV1bN7HarnessFrozenInputPayload = frozenPayload(),
): TopicSelectionV1bWorkflowHarnessRunRequest {
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    workflow_run_id: 'workflow_run_n7_support_001',
    node_attempt_id: 'node_attempt_n7_support_001',
    node_id: N7_NODE_ID,
    policy_version: 'topic-selection-v1b-node-policy-v1',
    run_mode: 'test',
    created_by: 'system',
    frozen_input: {
      input_contract: 'TopicSelectionV1bN6ToN7Handoff@v1',
      snapshot_kind: 'n7_frozen_input',
      source_refs: [ref('frozen_input_source', 'frozen_input_source_001')],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  };
}

function candidateGroupingOutput(
  overrides: Partial<TopicSelectionV1bCandidateGroupingSupportPayload> = {},
): TopicSelectionV1bCandidateGroupingSupportPayload {
  return {
    selected_candidate_ref: ref('topic_question_candidate', 'candidate_001'),
    selected_candidate_hash: hashC,
    priority_order: [
      ref('topic_question_candidate', 'candidate_001'),
      ref('topic_question_candidate', 'candidate_002'),
    ],
    duplicate_or_overlap_groups: [
      {
        group_key: 'group_a',
        candidate_refs: [ref('topic_question_candidate', 'candidate_002')],
        canonical_candidate_ref: ref('topic_question_candidate', 'candidate_001'),
        rationale: 'Candidate 002 restates candidate 001 with a narrower scope.',
      },
    ],
    candidate_relationships: { candidate_001: { dominates: ['candidate_002'] } },
    grouping_summary: 'Prioritized candidate 001 and folded the overlapping candidate 002 underneath it.',
    ...overrides,
  };
}

test('v1b N7 support runtime records a runtime_verified support artifact from a mocked candidate-grouping fixture', async () => {
  const { runtime, controlPlane } = makeSubject();
  const request = makeRequest();
  const output = candidateGroupingOutput();

  const result = await runtime.generateSupportArtifact<TopicSelectionV1bCandidateGroupingSupportPayload>({
    request,
    slot_id: 'n7_candidate_grouping',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    mocked_output: {
      fixture_id: 'fixture_n7_candidate_grouping_001',
      output,
    },
  });

  // assert.equal (node:assert/strict) is an `asserts` overload, so this narrows `result` to the
  // succeeded branch and surfaces the orchestrator's blocker codes in the message on failure.
  assert.equal(
    result.status,
    'succeeded',
    result.status !== 'succeeded'
      ? `Expected success: ${result.invocation_result.error_code ?? 'unknown'} ${JSON.stringify(result.invocation_result.blocker_codes)}`
      : undefined,
  );

  // The runtime invocation actually ran through the orchestrator and validated against the contract.
  assert.equal(result.invocation_result.status, 'succeeded');

  // The produced semantic-support artifact is non-authority, runtime-verified, and slot-bound.
  const artifact = result.semantic_artifact;
  assert.equal(artifact.slot_id, 'n7_candidate_grouping');
  assert.equal(artifact.node_id, N7_NODE_ID);
  assert.equal(artifact.allowed_effect, 'support_only');
  assert.equal(artifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(artifact.output_contract, CANDIDATE_GROUPING_OUTPUT_CONTRACT);
  assert.equal(artifact.execution_mode, 'mocked_llm');
  assert.equal(artifact.run_mode, 'test');

  // The admitted structured output is byte-for-byte the fixture, and its hash is threaded everywhere.
  assert.deepEqual(result.structured_output, output);
  assert.match(artifact.structured_output_hash, /^[a-f0-9]{64}$/);
  assert.equal(artifact.support_artifact_hash, artifact.structured_output_hash);
  assert.equal(artifact.normalized_output_hash, artifact.structured_output_hash);
  assert.match(result.context_packet_hash, /^[a-f0-9]{64}$/);

  // The context packet and structured output were actually persisted on the control plane and are
  // retrievable by the functional ref the runtime returned (the support lineage is materialized).
  const contextRecord = await controlPlane.getArtifactRef(result.context_packet_ref.ref_id);
  assert.ok(contextRecord, 'Expected the context packet to be recorded on the control plane.');
  assert.equal(contextRecord?.checksum, result.context_packet_hash);
  const outputRecord = await controlPlane.getArtifactRef(artifact.support_artifact_ref.ref_id);
  assert.ok(outputRecord, 'Expected the support output to be recorded on the control plane.');
  assert.equal(outputRecord?.checksum, artifact.structured_output_hash);
});

test('v1b N7 support runtime is byte-stable across runs with identical fixed ids', async () => {
  const output = candidateGroupingOutput();
  const first = await makeSubject().runtime.generateSupportArtifact<TopicSelectionV1bCandidateGroupingSupportPayload>({
    request: makeRequest(),
    slot_id: 'n7_candidate_grouping',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    mocked_output: { fixture_id: 'fixture_n7_candidate_grouping_stable', output },
  });
  const second = await makeSubject().runtime.generateSupportArtifact<TopicSelectionV1bCandidateGroupingSupportPayload>({
    request: makeRequest(),
    slot_id: 'n7_candidate_grouping',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    mocked_output: { fixture_id: 'fixture_n7_candidate_grouping_stable', output },
  });

  // Both asserts narrow to the succeeded branch (node:assert/strict `asserts` overload).
  assert.equal(first.status, 'succeeded');
  assert.equal(second.status, 'succeeded');
  // The structured-output hash and context-packet hash are independent of the incrementing
  // control-plane ref ids, so a fresh control plane reproduces them byte-for-byte.
  assert.equal(first.context_packet_hash, second.context_packet_hash);
  assert.equal(first.semantic_artifact.structured_output_hash, second.semantic_artifact.structured_output_hash);
  assert.equal(
    first.semantic_artifact.runtime_invocation_context_hash,
    second.semantic_artifact.runtime_invocation_context_hash,
  );
});

test('v1b N7 support runtime rejects a request that is not the v1b N7 node', async () => {
  const { runtime } = makeSubject();
  const request = makeRequest({
    node_id: 'topic-selection.v1b.assess-topic-value.v1' as TopicSelectionV1bWorkflowHarnessRunRequest['node_id'],
  });

  await assert.rejects(
    () => runtime.generateSupportArtifact<TopicSelectionV1bCandidateGroupingSupportPayload>({
      request,
      slot_id: 'n7_candidate_grouping',
      execution_mode: 'mocked_llm',
      run_mode: 'test',
      mocked_output: { fixture_id: 'fixture_wrong_node', output: candidateGroupingOutput() },
    }),
    (error: unknown) => {
      assert.ok(error instanceof AppError, 'Expected an AppError for the wrong node id.');
      assert.equal(error.statusCode, 400);
      assert.equal(error.errorCode, 'INVALID_PAYLOAD');
      assert.match(error.message, /v1b N7 node id/);
      return true;
    },
  );
});

test('v1b N7 support runtime rejects an incomplete frozen payload (missing required candidate-set lineage)', async () => {
  const { runtime } = makeSubject();
  const incomplete = frozenPayload();
  // Strip a required source-lineage field the runtime guards on before any orchestrator work.
  delete (incomplete as Partial<TopicSelectionV1bN7HarnessFrozenInputPayload>).topic_question_candidate_set_hash;
  const request = makeRequest({}, incomplete as TopicSelectionV1bN7HarnessFrozenInputPayload);

  await assert.rejects(
    () => runtime.generateSupportArtifact<TopicSelectionV1bCandidateGroupingSupportPayload>({
      request,
      slot_id: 'n7_candidate_grouping',
      execution_mode: 'mocked_llm',
      run_mode: 'test',
      mocked_output: { fixture_id: 'fixture_incomplete_payload', output: candidateGroupingOutput() },
    }),
    (error: unknown) => {
      assert.ok(error instanceof AppError, 'Expected an AppError for the incomplete payload.');
      assert.equal(error.statusCode, 400);
      assert.equal(error.errorCode, 'INVALID_PAYLOAD');
      assert.match(error.message, /complete N7 frozen payload/);
      return true;
    },
  );
});

test('v1b N7 support runtime blocks (does not record) when the mocked output fails contract validation', async () => {
  const { runtime } = makeSubject();
  const request = makeRequest();
  // Drop a required field from the support contract so the orchestrator's schema gate rejects it.
  const invalid = candidateGroupingOutput();
  delete (invalid as Partial<TopicSelectionV1bCandidateGroupingSupportPayload>).grouping_summary;

  const result = await runtime.generateSupportArtifact<TopicSelectionV1bCandidateGroupingSupportPayload>({
    request,
    slot_id: 'n7_candidate_grouping',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    mocked_output: {
      fixture_id: 'fixture_invalid_contract',
      output: invalid as TopicSelectionV1bCandidateGroupingSupportPayload,
    },
  });

  // Narrows to the blocked branch — no artifact is produced, only a blocked invocation result.
  assert.equal(result.status, 'blocked');
  assert.equal(result.invocation_result.status, 'blocked');
  assert.equal(result.invocation_result.error_code, 'SCHEMA_VALIDATION_FAILED');
  assert.ok(result.invocation_result.blocker_codes.includes('SCHEMA_VALIDATION_FAILED'));
  assert.equal(result.invocation_result.structured_output, null);
});
