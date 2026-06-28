// T-127 Phase 1 / W-05 — co-located unit test for the v1b early-semantic-support RUNTIME service.
//
// Scope: the runtime's own logic — slot binding, frozen-payload validation, context-packet +
// source-hash derivation, and the post-invocation contract (structured-output-hash agreement,
// semantic-support artifact assembly as runtime_verified). The expensive, separately-tested agent
// orchestration (prompt-packet runtime, LLM gateway, validation, token-budget gate) is replaced by
// an injected stub: the runtime hands it a fully-built context packet and consumes a fixed,
// internally-consistent invocation result. The control plane is the REAL in-memory implementation so
// recordArtifactRef / getArtifactRef behave as in production (the audit artifact the success path
// reads back must carry a checksum).
//
// The N3 readiness slot is used as the happy-path driver: it has the smallest frozen payload and a
// fully self-describable support contract (IntakeReadinessClassificationSupport@v1).

import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionArtifactFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
  type TopicSelectionV1bN3HarnessFrozenInputPayload,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { AppError } from '../errors/app-error.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import type {
  TopicSelectionAgentInvocationResult,
} from './topic-selection-agent-orchestrator-service.js';
import {
  TopicSelectionV1bEarlySemanticSupportRuntimeService,
  buildV1bEarlySemanticSupportSystemContent,
  type GenerateTopicSelectionV1bEarlySemanticSupportInput,
  type TopicSelectionV1bIntakeReadinessClassificationSupportPayload,
} from './topic-selection-v1b-early-semantic-support-runtime-service.js';

const N3_NODE_ID = 'topic-selection.v1b.assess-intake-readiness.v1' as const;
const N3_SLOT_ID = 'n3_readiness_classification' as const;
const N3_OUTPUT_CONTRACT = 'IntakeReadinessClassificationSupport@v1' as const;

function ref(refType: string, refId: string) {
  return { ref_type: refType, ref_id: refId, title_card_id: 'title_card_001', version_id: null };
}

function hash(value: unknown): string {
  return sha256Text(stableStringify(value));
}

// A complete, valid N3 frozen payload (the runtime requires every field below to be present).
function n3FrozenPayload(
  overrides: Partial<TopicSelectionV1bN3HarnessFrozenInputPayload> = {},
): TopicSelectionV1bN3HarnessFrozenInputPayload {
  return {
    intake_snapshot_ref: ref('intake_snapshot', 'intake_snapshot_001'),
    intake_snapshot_hash: '1'.repeat(64),
    constraint_profile_ref: ref('research_constraint_profile', 'constraint_profile_001'),
    constraint_profile_hash: '2'.repeat(64),
    n2_handoff_hash: '3'.repeat(64),
    ...overrides,
  };
}

function makeRequest(
  payload: Record<string, unknown> | TopicSelectionV1bN3HarnessFrozenInputPayload,
  suffix = '001',
): TopicSelectionV1bWorkflowHarnessRunRequest {
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    workflow_run_id: `workflow_run_n3_${suffix}`,
    node_attempt_id: `node_attempt_n3_${suffix}`,
    node_id: N3_NODE_ID,
    policy_version: 'topic-selection-v1b-node-policy-v1',
    run_mode: 'test',
    created_by: 'system',
    frozen_input: {
      input_contract: 'TopicSelectionV1bN3HarnessFrozenInput@v1',
      snapshot_kind: 'n3_frozen_input',
      source_refs: [ref('frozen_input_source', 'frozen_input_source_001')],
      payload: payload as unknown as Record<string, unknown>,
      frozen_input_hash: '4'.repeat(64),
    },
  };
}

const READINESS_OUTPUT: TopicSelectionV1bIntakeReadinessClassificationSupportPayload = {
  schema_version: 'IntakeReadinessClassificationSupport@v1',
  readiness_recommendation: 'ready',
  blocker_codes: [],
  warning_codes: [],
  loopback_target_code: null,
  cited_refs: [{ ref_type: 'intake_snapshot', ref_id: 'intake_snapshot_001', title_card_id: 'title_card_001', version_id: null }],
  rationale: 'Intake snapshot and constraint profile are coherent; readiness classification recommends ready.',
  no_authority_write_confirmed: true,
};

// A stub orchestrator. invokeStructuredOutput records the prompt-facing inputs the runtime supplies,
// then returns a fixed, internally-consistent invocation result whose structured_output_hash agrees
// with sha256Text(stableStringify(output)) — the agreement the runtime re-derives and asserts. The
// audit_artifact_ref points at a control-plane artifact the test seeds so the success path can read
// back a checksum.
function makeStubOrchestrator(options: {
  output?: TopicSelectionV1bIntakeReadinessClassificationSupportPayload | null;
  status?: 'succeeded' | 'blocked';
  auditArtifactRef: TopicSelectionArtifactFunctionalRef | null;
}) {
  const calls: Array<Record<string, unknown>> = [];
  const output = options.output === undefined ? READINESS_OUTPUT : options.output;
  const status = options.status ?? 'succeeded';
  const orchestrator = {
    async invokeStructuredOutput<T>(
      input: Record<string, unknown>,
    ): Promise<TopicSelectionAgentInvocationResult<T>> {
      calls.push(input);
      const structuredOutput = (status === 'succeeded' ? output : null) as T | null;
      return {
        schema_version: 'v1',
        node_id: input.node_id as string,
        workflow_run_id: input.workflow_run_id as string,
        node_attempt_id: input.node_attempt_id as string,
        status,
        structured_output: structuredOutput,
        provenance: {
          workflow_run_id: input.workflow_run_id as string,
          node_id: input.node_id as string,
          node_attempt_id: input.node_attempt_id as string,
          invocation_attempt_id: input.invocation_attempt_id as string,
          execution_mode: 'mocked_llm',
          executor_kind: 'single_agent',
          source_kind: 'mocked_fixture',
          non_provider: true,
          run_mode: 'test',
          profile_id: input.profile_id as string,
          profile_version: 'v1',
          profile_hash: 'a'.repeat(64),
          model_option_id: null,
          normalized_params_hash: null,
          capability_degraded: false,
          capability_degrade_reason: null,
          output_contract: input.output_contract as string,
          prompt_template_id: 'topic-selection.v1b.n3.intake-readiness.runtime-support',
          prompt_template_version: 'v1',
          schema_name: input.schema_name as string,
          prompt_packet_hash: 'b'.repeat(64),
          response_hash: structuredOutput ? hash(structuredOutput) : null,
          structured_output_hash: structuredOutput ? hash(structuredOutput) : null,
          cache_status: 'not_applicable',
          response_reuse_ref: null,
          telemetry: null,
        } as unknown as TopicSelectionAgentInvocationResult<T>['provenance'],
        validation: { status: 'passed', error_count: 0, warning_count: 0, errors: [], warnings: [] } as unknown as TopicSelectionAgentInvocationResult<T>['validation'],
        token_budget_gate_result: null,
        warning_codes: [],
        blocker_codes: status === 'blocked' ? ['MOCKED_BLOCK'] : [],
        audit_snapshot: { schema_version: 'TopicSelectionAgentInvocationAudit@v1' } as unknown as TopicSelectionAgentInvocationResult<T>['audit_snapshot'],
        audit_artifact_ref: options.auditArtifactRef,
      };
    },
  };
  return { orchestrator, calls };
}

function makeControlPlane() {
  const repository = new InMemoryTopicSelectionControlPlaneRepository();
  return new TopicSelectionControlPlaneService(repository, {
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
}

// T-128 W-05 — early-semantic-support per-slot prompt-body byte-identity drift anchors (SPLIT-1:
// N2 constraint-profile / N3 intake-readiness / N5 slice-selection). Pin the rendered SYSTEM content
// per slot so any body change is a LOUD, intentional re-baseline. No harness/replay/e2e guard pins
// these v1b prompt bodies, so these are their only drift coverage; the cross-slot inequality proves
// the shared constructor actually diverged each sibling. Re-baseline ONLY for a deliberate change.
const EARLY_SEMANTIC_SUPPORT_SYSTEM_GOLDEN = {
  n2: '2ec0534c50086a3575404da5104e7c2e84eecd949c93cc6b02b2b41fd5caaa96',
  n3: '17183102e1be81d6dee4e75f8df22045efe7d40534e169d02aee925fa06c755d',
  n5: '556edf0c6c6e29376a17d576a81b599a1dafe75cc91853536f8ce9d22b42d115',
};
test('v1b early-semantic-support per-slot prompt bodies are byte-identity drift-anchored (T-128 W-05)', () => {
  const n2 = buildV1bEarlySemanticSupportSystemContent('n2_constraint_profile_semantic_support');
  const n3 = buildV1bEarlySemanticSupportSystemContent('n3_readiness_classification');
  const n5 = buildV1bEarlySemanticSupportSystemContent('n5_slice_selection_review');
  assert.equal(sha256Text(n2), EARLY_SEMANTIC_SUPPORT_SYSTEM_GOLDEN.n2);
  assert.equal(sha256Text(n3), EARLY_SEMANTIC_SUPPORT_SYSTEM_GOLDEN.n3);
  assert.equal(sha256Text(n5), EARLY_SEMANTIC_SUPPORT_SYSTEM_GOLDEN.n5);
  // The split must actually diverge each sibling's body.
  assert.notEqual(n2, n3);
  assert.notEqual(n2, n5);
  assert.notEqual(n3, n5);
});

test('v1b early-semantic-support runtime produces a runtime_verified N3 support artifact and threads identity', async () => {
  const controlPlane = makeControlPlane();
  // Seed the audit artifact the success path reads back (it must carry a checksum).
  const auditArtifact = await controlPlane.recordArtifactRef({
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: 'workflow_run_n3_001',
    payload: { kind: 'runtime_audit_snapshot' },
    checksum: 'c'.repeat(64),
    created_by: 'system',
  });
  const auditRef: TopicSelectionArtifactFunctionalRef = {
    ref_type: 'artifact_ref',
    ref_id: auditArtifact.artifact_ref_id,
    title_card_id: auditArtifact.title_card_id ?? null,
  };
  const stub = makeStubOrchestrator({ auditArtifactRef: auditRef });
  const runtime = new TopicSelectionV1bEarlySemanticSupportRuntimeService(controlPlane, {
    agentOrchestrator: stub.orchestrator as never,
  });

  const input: GenerateTopicSelectionV1bEarlySemanticSupportInput<TopicSelectionV1bIntakeReadinessClassificationSupportPayload> = {
    request: makeRequest(n3FrozenPayload()),
    slot_id: N3_SLOT_ID,
    execution_mode: 'mocked_llm',
    mocked_output: { fixture_id: 'n3_readiness_support', output: READINESS_OUTPUT },
  };
  const result = await runtime.generateSupportArtifact(input);

  assert.equal(result.status, 'succeeded');
  if (result.status !== 'succeeded') {
    throw new Error('Expected the early-semantic-support generation to succeed.');
  }

  // The emitted support artifact is runtime_verified and bound to the N3 slot/contract.
  const artifact = result.semantic_artifact;
  assert.equal(artifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(artifact.slot_id, N3_SLOT_ID);
  assert.equal(artifact.node_id, N3_NODE_ID);
  assert.equal(artifact.output_contract, N3_OUTPUT_CONTRACT);
  assert.equal(artifact.allowed_effect, 'support_only');
  assert.equal(artifact.execution_mode, 'mocked_llm');
  assert.equal(artifact.run_mode, 'test');

  // The structured-output / support / normalized hashes all agree and equal the canonical hash of the
  // returned payload — not a placeholder. This is the agreement the runtime re-derives & guards.
  const expectedOutputHash = hash(READINESS_OUTPUT);
  assert.equal(artifact.structured_output_hash, expectedOutputHash);
  assert.equal(artifact.support_artifact_hash, expectedOutputHash);
  assert.equal(artifact.normalized_output_hash, expectedOutputHash);
  assert.match(expectedOutputHash, /^[a-f0-9]{64}$/);

  // Provenance is wired to the seeded runtime audit artifact (ref + read-back checksum).
  assert.deepEqual(artifact.runtime_audit_ref, auditRef);
  assert.deepEqual(artifact.provenance_ref, auditRef);
  assert.equal(artifact.runtime_audit_hash, 'c'.repeat(64));

  // Source hashes carry the N3 frozen lineage the runtime derived (not the placeholder set).
  assert.equal(artifact.source_hashes.intake_snapshot_hash, '1'.repeat(64));
  assert.equal(artifact.source_hashes.constraint_profile_hash, '2'.repeat(64));
  assert.equal(artifact.source_hashes.n2_handoff_hash, '3'.repeat(64));
  assert.equal(artifact.source_hashes.frozen_input_hash, '4'.repeat(64));

  // The returned structured output is the readiness recommendation the orchestrator produced.
  assert.equal(result.structured_output.readiness_recommendation, 'ready');
  assert.match(result.context_packet_hash, /^[a-f0-9]{64}$/);

  // The orchestrator was driven exactly once with the N3 slot's output contract & schema name.
  assert.equal(stub.calls.length, 1);
  assert.equal(stub.calls[0]!.output_contract, N3_OUTPUT_CONTRACT);
  assert.equal(stub.calls[0]!.schema_name, N3_OUTPUT_CONTRACT);
  // Wiring: messages() renders the N3 slot's system body via the drift-anchored pure builder.
  assert.equal(
    (stub.calls[0]!.messages as Array<{ role: string; content: string }>)[0]!.content,
    buildV1bEarlySemanticSupportSystemContent('n3_readiness_classification'),
  );
});

test('v1b early-semantic-support runtime rejects an incomplete N3 frozen payload with INVALID_PAYLOAD', async () => {
  const controlPlane = makeControlPlane();
  const stub = makeStubOrchestrator({ auditArtifactRef: null });
  const runtime = new TopicSelectionV1bEarlySemanticSupportRuntimeService(controlPlane, {
    agentOrchestrator: stub.orchestrator as never,
  });

  // Drop the required n2_handoff_hash — the runtime's frozen-payload guard must reject before any
  // orchestration runs.
  const incomplete = n3FrozenPayload();
  delete (incomplete as Partial<TopicSelectionV1bN3HarnessFrozenInputPayload>).n2_handoff_hash;

  const input: GenerateTopicSelectionV1bEarlySemanticSupportInput<TopicSelectionV1bIntakeReadinessClassificationSupportPayload> = {
    request: makeRequest(incomplete as unknown as Record<string, unknown>),
    slot_id: N3_SLOT_ID,
    execution_mode: 'mocked_llm',
    mocked_output: { fixture_id: 'n3_readiness_support', output: READINESS_OUTPUT },
  };

  await assert.rejects(
    () => runtime.generateSupportArtifact(input),
    (error: unknown) => {
      assert.ok(error instanceof AppError, 'Expected an AppError.');
      assert.equal(error.statusCode, 400);
      assert.equal(error.errorCode, 'INVALID_PAYLOAD');
      assert.match(error.message, /N3 early semantic runtime requires a complete N3 frozen payload/);
      return true;
    },
  );
  // The guard short-circuits before the orchestrator is ever invoked.
  assert.equal(stub.calls.length, 0);
});

test('v1b early-semantic-support runtime rejects a node_id that does not match the slot binding', async () => {
  const controlPlane = makeControlPlane();
  const stub = makeStubOrchestrator({ auditArtifactRef: null });
  const runtime = new TopicSelectionV1bEarlySemanticSupportRuntimeService(controlPlane, {
    agentOrchestrator: stub.orchestrator as never,
  });

  const request = makeRequest(n3FrozenPayload());
  // Point the request at the wrong node while still asking for the N3 slot binding.
  (request as { node_id: string }).node_id = 'topic-selection.v1b.create-intake-snapshot.v1';

  await assert.rejects(
    () => runtime.generateSupportArtifact({
      request,
      slot_id: N3_SLOT_ID,
      execution_mode: 'mocked_llm',
      mocked_output: { fixture_id: 'n3_readiness_support', output: READINESS_OUTPUT },
    }),
    (error: unknown) => {
      assert.ok(error instanceof AppError, 'Expected an AppError.');
      assert.equal(error.errorCode, 'INVALID_PAYLOAD');
      assert.match(error.message, /node_id does not match slot binding/);
      return true;
    },
  );
  assert.equal(stub.calls.length, 0);
});

test('v1b early-semantic-support runtime surfaces a blocked invocation as a blocked result (no artifact)', async () => {
  const controlPlane = makeControlPlane();
  const stub = makeStubOrchestrator({ status: 'blocked', output: null, auditArtifactRef: null });
  const runtime = new TopicSelectionV1bEarlySemanticSupportRuntimeService(controlPlane, {
    agentOrchestrator: stub.orchestrator as never,
  });

  const result = await runtime.generateSupportArtifact({
    request: makeRequest(n3FrozenPayload()),
    slot_id: N3_SLOT_ID,
    execution_mode: 'mocked_llm',
    mocked_output: { fixture_id: 'n3_readiness_support', output: READINESS_OUTPUT },
  });

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') {
    throw new Error('Expected a blocked generation result.');
  }
  assert.equal(result.invocation_result.status, 'blocked');
  assert.deepEqual(result.invocation_result.blocker_codes, ['MOCKED_BLOCK']);
  // A blocked invocation still records the (non-authority) context packet for audit.
  assert.equal(result.context_packet_ref.ref_type, 'artifact_ref');
  assert.match(result.context_packet_hash, /^[a-f0-9]{64}$/);
  // The orchestrator ran once; no semantic artifact is produced on the blocked branch.
  assert.equal(stub.calls.length, 1);
  assert.ok(!('semantic_artifact' in result));
});
