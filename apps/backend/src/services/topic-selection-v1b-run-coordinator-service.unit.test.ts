import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
  type TopicSelectionV1bWorkflowHarnessRunResult,
  type TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';

import { AppError } from '../errors/app-error.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import { TopicSelectionV1bRunCoordinatorService } from './topic-selection-v1b-run-coordinator-service.js';
import type {
  GenerateTopicSelectionV1bN6DivergentDebateInput,
  TopicSelectionV1bN6DivergentDebateRunResult,
} from './topic-selection-v1b-n6-divergent-debate-runtime-service.js';
import type {
  GenerateTopicSelectionV1bN8DebateInput,
  TopicSelectionV1bN8DebateRunResult,
} from './topic-selection-v1b-n8-bounded-debate-runtime-service.js';
import { selectN6DebateExecutionPlan } from './topic-selection-debate-execution-plan-registry-service.js';

const RUN = 'workflow_run_coord_test';
const CARD = 'title_card_coord_test';

const N1 = 'topic-selection.v1b.create-intake-snapshot.v1';
const N2 = 'topic-selection.v1b.record-research-constraint-profile.v1';
const N3 = 'topic-selection.v1b.assess-intake-readiness.v1';
const N4 = 'topic-selection.v1b.generate-research-slice-options.v1';
const N5 = 'topic-selection.v1b.select-research-slice.v1';
const N6 = 'topic-selection.v1b.generate-topic-question-candidates.v1';
const N7 = 'topic-selection.v1b.materialize-topic-question-contract.v1';
const N8 = 'topic-selection.v1b.assess-topic-value.v1';
const N9 = 'topic-selection.v1b.decide-value-disposition.v1';
const N10 = 'topic-selection.v1b.create-draft-topic-package.v1';
const N11 = 'topic-selection.v1b.publish-v1c-input-bundle.v1';

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return { ref_type: refType, ref_id: refId, title_card_id: CARD };
}

class StubControlPlane {
  readonly artifacts = new Map<string, TopicSelectionArtifactRefRecord>();
  private counter = 0;

  async listArtifactRefsByWorkflowRunId(workflowRunId: string): Promise<TopicSelectionArtifactRefRecord[]> {
    return [...this.artifacts.values()].filter((artifact) => artifact.workflow_run_id === workflowRunId);
  }

  async getArtifactRef(artifactRefId: string): Promise<TopicSelectionArtifactRefRecord | null> {
    return this.artifacts.get(artifactRefId) ?? null;
  }

  async recordArtifactRef(input: {
    artifact_kind: string;
    workflow_run_id?: string | null;
    payload?: Record<string, unknown> | null;
    title_card_id?: string | null;
  } & Record<string, unknown>): Promise<TopicSelectionArtifactRefRecord> {
    this.counter += 1;
    const record = {
      artifact_ref_id: `artifact_${this.counter}`,
      artifact_kind: input.artifact_kind,
      storage_kind: 'inline',
      workflow_run_id: input.workflow_run_id ?? null,
      title_card_id: input.title_card_id ?? CARD,
      payload: input.payload ?? null,
      checksum: input.payload ? sha256Text(stableStringify(input.payload)) : null,
      created_at: `2026-06-12T00:00:${String(this.counter).padStart(2, '0')}.000Z`,
      created_by: 'system',
    } as unknown as TopicSelectionArtifactRefRecord;
    this.artifacts.set(record.artifact_ref_id, record);
    return record;
  }
}

type ScriptedResult = Partial<TopicSelectionV1bWorkflowHarnessRunResult> & {
  gate_status: string;
  route_decision: string;
  handoff_kind_for_test?: string;
};

class StubHarness {
  readonly invocations: TopicSelectionV1bWorkflowHarnessRunRequest[] = [];
  readonly script = new Map<string, ScriptedResult[]>();
  hangNodes = new Set<string>();
  /** Nodes whose NEXT invocation rejects without landing a trace (simulates a harness rejection
   *  after a caller-side debate already recorded its rows — the idempotency re-advance window). */
  readonly failNextNodes = new Set<string>();
  /** Request-aware routers: when set for a node, the function picks the ScriptedResult from the
   *  actual request (e.g. route n6_debate_escalation only when the request carries the
   *  n6_loopback_triage support slot — mirrors the real harness's loopback-plan resolution).
   *  Takes precedence over the on()/script queue when it returns non-null. */
  readonly routers = new Map<string, (request: TopicSelectionV1bWorkflowHarnessRunRequest) => ScriptedResult | null>();
  private readonly hangWaiters = new Map<string, Array<() => void>>();

  constructor(private readonly controlPlane: StubControlPlane) {}

  on(nodeId: string, result: ScriptedResult): void {
    const queue = this.script.get(nodeId) ?? [];
    queue.push(result);
    this.script.set(nodeId, queue);
  }

  /** Install a request-aware router for a node (see `routers`). */
  route(nodeId: string, fn: (request: TopicSelectionV1bWorkflowHarnessRunRequest) => ScriptedResult | null): void {
    this.routers.set(nodeId, fn);
  }

  /** Let a hanging invocation continue into its scripted result (orphan settles). */
  releaseHangs(nodeId: string): void {
    const waiters = this.hangWaiters.get(nodeId) ?? [];
    this.hangWaiters.set(nodeId, []);
    this.hangNodes.delete(nodeId);
    for (const release of waiters) {
      release();
    }
  }

  async invokeNode(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    if (this.failNextNodes.has(request.node_id)) {
      this.failNextNodes.delete(request.node_id);
      throw new Error(`stub harness rejected ${request.node_id} (no trace landed)`);
    }
    if (this.hangNodes.has(request.node_id)) {
      await new Promise<void>((resolve) => {
        const waiters = this.hangWaiters.get(request.node_id) ?? [];
        waiters.push(resolve);
        this.hangWaiters.set(request.node_id, waiters);
      });
    }
    this.invocations.push(request);
    const routed = this.routers.get(request.node_id)?.(request) ?? null;
    const queue = this.script.get(request.node_id) ?? [];
    const scripted = routed ?? (queue.length > 1 ? queue.shift()! : queue[0]);
    if (!scripted) {
      throw new Error(`no scripted result for ${request.node_id}`);
    }
    const result = {
      schema_version: 'TopicSelectionV1bWorkflowHarnessRunResult@v1',
      node_id: request.node_id,
      workflow_run_id: request.workflow_run_id,
      node_attempt_id: request.node_attempt_id,
      failure_class: null,
      replay_identity: {
        workflow_run_id: request.workflow_run_id,
        node_attempt_id: request.node_attempt_id,
        attempt_family_key: request.node_attempt_id,
        node_replay_key: `replay_${request.node_attempt_id}`,
      },
      hashes: {
        frozen_input_hash: request.frozen_input.frozen_input_hash ?? 'fih',
        execution_spec_hash: 'esh',
        semantic_artifact_hash: null,
        runtime_admission_hash: null,
        gate_result_hash: 'grh',
        authority_hash: `auth_hash_${request.node_id}`,
        handoff_hash: `handoff_hash_${request.node_id}`,
        route_hash: 'rh',
      },
      blockers: [],
      warnings: [],
      authority_ref: ref('authority', `auth_${request.node_id}_${this.invocations.length}`),
      handoff_ref: null as TopicSelectionFunctionalRef | null,
      gate_result_ref: null,
      transition_attempt_ref: null,
      trace_snapshot_ref: null,
      harness_trace_artifact_ref: null,
      replay_provenance: null,
      error_code: null,
      error_message: null,
      ...scripted,
    } as TopicSelectionV1bWorkflowHarnessRunResult;

    // mimic the harness: persist a handoff artifact + the trace artifact
    if (result.route_decision === 'invoke_next' || result.route_decision === 'stop_v1b_complete') {
      const handoffKind = scripted.handoff_kind_for_test as string | undefined;
      if (handoffKind) {
        const handoffArtifact = await this.controlPlane.recordArtifactRef({
          artifact_kind: 'structured_output',
          workflow_run_id: request.workflow_run_id,
          payload: {
            envelope: { handoff_kind: handoffKind },
            payload: { from_node: request.node_id },
            required_refs: [ref('upstream_required', `req_${request.node_id}`)],
          },
        });
        result.handoff_ref = ref('artifact_ref', handoffArtifact.artifact_ref_id);
      }
    }
    await this.controlPlane.recordArtifactRef({
      artifact_kind: 'trace',
      workflow_run_id: request.workflow_run_id,
      payload: {
        payload_schema: 'TopicSelectionV1bWorkflowHarnessTracePayload@v1',
        node_id: request.node_id,
        workflow_run_id: request.workflow_run_id,
        node_attempt_id: request.node_attempt_id,
        node_replay_key: `replay_${request.node_attempt_id}`,
        request,
        result,
        created_at: `2026-06-12T01:00:${String(this.invocations.length).padStart(2, '0')}.000Z`,
      },
    });
    return result;
  }
}

/** Minimal gate-draft semantic-artifact descriptor the debate stubs return — the coordinator only
 *  ATTACHES it to the node request (the stub harness does not validate its content). */
function stubGateDraft(slotId: string): TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef {
  return {
    slot_id: slotId,
    allowed_effect: 'model_draft_for_gate',
    runtime_provenance_class: 'runtime_verified',
    support_artifact_ref: ref('artifact_ref', `gate_draft_${slotId}`),
  } as unknown as TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
}

/** Stub N6 divergent-debate runtime: records calls + returns a scriptable result (default completed). */
class StubN6DebateRuntime {
  readonly calls: GenerateTopicSelectionV1bN6DivergentDebateInput[] = [];
  next: TopicSelectionV1bN6DivergentDebateRunResult | null = null;
  throwError: Error | null = null;

  async runDivergentDebate(
    input: GenerateTopicSelectionV1bN6DivergentDebateInput,
  ): Promise<TopicSelectionV1bN6DivergentDebateRunResult> {
    this.calls.push(input);
    if (this.throwError) {
      throw this.throwError;
    }
    return this.next ?? ({
      status: 'completed',
      admission: { admitted: true },
      gate_draft: { status: 'succeeded', semantic_artifact: stubGateDraft('n6_question_candidate_draft') },
      loop_transcript_hash: 'n6_divergent_loop_hash',
    } as unknown as TopicSelectionV1bN6DivergentDebateRunResult);
  }
}

/** Stub N8 bounded-debate runtime: records calls + returns a scriptable result (default completed). */
class StubN8DebateRuntime {
  readonly calls: GenerateTopicSelectionV1bN8DebateInput[] = [];
  next: TopicSelectionV1bN8DebateRunResult | null = null;
  throwError: Error | null = null;

  async runDebate(
    input: GenerateTopicSelectionV1bN8DebateInput,
  ): Promise<TopicSelectionV1bN8DebateRunResult> {
    this.calls.push(input);
    if (this.throwError) {
      throw this.throwError;
    }
    return this.next ?? ({
      status: 'completed',
      admission: { admitted: true },
      gate_draft: { status: 'succeeded', semantic_artifact: stubGateDraft('n8_value_assessment_draft') },
      loop_transcript_hash: 'n8_bounded_loop_hash',
    } as unknown as TopicSelectionV1bN8DebateRunResult);
  }
}

function makeSubject() {
  const controlPlane = new StubControlPlane();
  const harness = new StubHarness(controlPlane);
  const n6DivergentDebateRuntime = new StubN6DebateRuntime();
  const n8BoundedDebateRuntime = new StubN8DebateRuntime();
  const coordinator = new TopicSelectionV1bRunCoordinatorService({
    harness,
    controlPlane: controlPlane as never,
    n6DivergentDebateRuntime: n6DivergentDebateRuntime as never,
    n8BoundedDebateRuntime: n8BoundedDebateRuntime as never,
  });
  return { controlPlane, harness, coordinator, n6DivergentDebateRuntime, n8BoundedDebateRuntime };
}

function bootstrapRequest(): TopicSelectionV1bWorkflowHarnessRunRequest {
  const frozen = {
    input_contract: 'V1aToV1bInputBundleFrozenRef@v1',
    snapshot_kind: 'v1a_valid_need_bundle',
    source_refs: [ref('v1a_valid_need_bundle', 'bundle_1')],
    payload: { v1b_input_bundle_id: 'bundle_1' },
  };
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    title_card_id: CARD,
    workflow_run_id: RUN,
    node_attempt_id: 'node_attempt_n1_1',
    node_id: N1,
    policy_version: 'topic-selection-v1b-node-policy-v1',
    frozen_input: { ...frozen, frozen_input_hash: sha256Text(stableStringify(frozen)) },
    created_by: 'system',
  };
}

test('advance bootstraps N1 then halts at the N2 human node', async () => {
  const { harness, coordinator } = makeSubject();
  harness.on(N1, {
    gate_status: 'admitted',
    route_decision: 'invoke_next',
    handoff_kind_for_test: 'N1ToN2Handoff',
  });

  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    bootstrap_request: bootstrapRequest(),
  });

  assert.equal(report.steps.length, 1);
  assert.equal(report.steps[0]!.node_id, N1);
  assert.equal(report.halt.reason, 'human_node');
  assert.equal(report.halt.node_id, N2);
  assert.equal(report.run_state.last_completed_node_id, N1);
  assert.equal(report.run_state.next_node_id, N2);
});

test('advance resumes after human N2, builds N3 from the N2 handoff, and halts at model-like N4', async () => {
  const { harness, coordinator } = makeSubject();
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  harness.on(N2, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N2ToN3Handoff' });
  harness.on(N3, { gate_status: 'admitted_with_warnings', route_decision: 'invoke_next', handoff_kind_for_test: 'N3ToN4Handoff' });

  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });
  // human acts through the human route — simulated by invoking N2 via the harness directly:
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N2, node_attempt_id: 'node_attempt_n2_human' });

  const report = await coordinator.advanceUntilBlocked({ workflow_run_id: RUN });
  assert.deepEqual(report.steps.map((step) => step.node_id), [N3]);
  assert.equal(report.halt.reason, 'model_input_required');
  assert.equal(report.halt.node_id, N4);

  const n3Request = harness.invocations.find((request) => request.node_id === N3)!;
  assert.equal(n3Request.frozen_input.input_contract, 'N2ToN3Handoff@v1');
  assert.equal(n3Request.frozen_input.snapshot_kind, 'research_constraint_profile');
  assert.equal((n3Request.frozen_input.payload as Record<string, unknown>).n2_handoff_hash, `handoff_hash_${N2}`);
  assert.ok(n3Request.frozen_input.frozen_input_hash);
  const refKeys = n3Request.frozen_input.source_refs.map((item) => `${item.ref_type}:${item.ref_id}`);
  assert.ok(refKeys.some((key) => key.startsWith('artifact_ref:')), 'handoff ref must be in source_refs');
  assert.ok(refKeys.includes('upstream_required:req_' + N2), 'handoff required_refs must be propagated');
});

test('caller-supplied draft_payload is recorded as a semantic artifact for N4', async () => {
  const { harness, coordinator, controlPlane } = makeSubject();
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  harness.on(N2, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N2ToN3Handoff' });
  harness.on(N3, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N3ToN4Handoff' });
  harness.on(N4, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N4ToN5Handoff' });

  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N2, node_attempt_id: 'node_attempt_n2_human' });
  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    node_inputs: { [N4]: { draft_payload: { candidates: ['draft'] } } },
  });

  assert.deepEqual(report.steps.map((step) => step.node_id), [N3, N4]);
  assert.equal(report.halt.reason, 'human_node'); // N5
  const n4Request = harness.invocations.find((request) => request.node_id === N4)!;
  assert.equal(n4Request.semantic_artifacts?.length, 1);
  const artifactRef = n4Request.semantic_artifacts![0]!;
  assert.equal(artifactRef.slot_id, 'n4_research_slice_option_draft');
  assert.equal(artifactRef.input_hash, n4Request.frozen_input.frozen_input_hash);
  assert.equal(artifactRef.run_mode, 'acceptance');
  // one artifact backs both refs — the caller draft IS the normalized output
  assert.equal(artifactRef.normalized_output_ref?.ref_id, artifactRef.support_artifact_ref.ref_id);
  assert.equal(artifactRef.normalized_output_hash, artifactRef.support_artifact_hash);
  const supportArtifact = await controlPlane.getArtifactRef(artifactRef.support_artifact_ref.ref_id);
  assert.deepEqual(supportArtifact?.payload, { candidates: ['draft'] });
});

test('draft_payload and execution_spec together are rejected before any harness call', async () => {
  const { harness, coordinator } = makeSubject();
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  harness.on(N2, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N2ToN3Handoff' });
  harness.on(N3, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N3ToN4Handoff' });

  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N2, node_attempt_id: 'node_attempt_n2_human' });

  await assert.rejects(
    coordinator.advanceUntilBlocked({
      workflow_run_id: RUN,
      node_inputs: {
        [N4]: {
          draft_payload: { candidates: ['draft'] },
          execution_spec: { execution_mode: 'provider_llm', model_option_id: 'm1' },
        },
      },
    }),
    /at most one of draft_payload, execution_spec, or debate/,
  );
  assert.equal(harness.invocations.filter((request) => request.node_id === N4).length, 0);
});

// T-128 W-14: a STANDALONE execution_spec is reserved — nothing consumes it (the harness demands a
// pre-recorded runtime draft regardless; the W-15 S4 probe died on N4_FROZEN_DRAFT_ARTIFACT_REQUIRED
// deep in the gate). The coordinator rejects it up front with the honest contract instead.
test('a standalone execution_spec is reserved-rejected before any harness call (W-14)', async () => {
  const { harness, coordinator } = makeSubject();
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  harness.on(N2, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N2ToN3Handoff' });
  harness.on(N3, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N3ToN4Handoff' });

  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N2, node_attempt_id: 'node_attempt_n2_human' });

  await assert.rejects(
    coordinator.advanceUntilBlocked({
      workflow_run_id: RUN,
      node_inputs: { [N4]: { execution_spec: { execution_mode: 'provider_llm', model_option_id: 'm1' } } },
    }),
    /execution_spec is reserved \(T-128 W-14\)/,
  );
  assert.equal(harness.invocations.filter((request) => request.node_id === N4).length, 0);
});

test('loopback halts, retry_node_id resumes, and the per-node budget exhausts', async () => {
  const { harness, coordinator } = makeSubject();
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  harness.on(N2, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N2ToN3Handoff' });
  harness.on(N3, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N3ToN4Handoff' });
  // N4 keeps looping back (e.g. gate failure)
  harness.on(N4, { gate_status: 'blocked', route_decision: 'loopback' });

  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N2, node_attempt_id: 'node_attempt_n2_human' });

  const first = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    node_inputs: { [N4]: { draft_payload: { try: 1 } } },
  });
  assert.equal(first.halt.reason, 'harness_loopback');
  assert.equal(first.halt.node_id, N4);

  const retry = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N4,
    node_inputs: { [N4]: { draft_payload: { try: 2 } } },
    loopback_budget_per_node: 2,
  });
  assert.equal(retry.halt.reason, 'harness_loopback');

  const exhausted = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N4,
    node_inputs: { [N4]: { draft_payload: { try: 3 } } },
    loopback_budget_per_node: 2,
  });
  assert.equal(exhausted.halt.reason, 'loopback_budget_exhausted');
  assert.equal(exhausted.halt.node_id, N4);
  assert.equal(harness.invocations.filter((request) => request.node_id === N4).length, 2);
});

// T-123 DP-3.6: an N8 debate-trigger loopback re-enters N7 in feedback_from_n8 mode. The
// coordinator must assemble that frozen input from the N8 loopback's N8ToN7Feedback artifact
// (input_mode override + n8_feedback_ref / record hash / payload hash + the ref in source_refs).
async function driveToN8DebateLoopback(): Promise<{
  harness: StubHarness;
  coordinator: ReturnType<typeof makeSubject>['coordinator'];
  controlPlane: StubControlPlane;
  n8BoundedDebateRuntime: ReturnType<typeof makeSubject>['n8BoundedDebateRuntime'];
  feedbackRef: TopicSelectionFunctionalRef;
  feedbackPayloadHash: string;
  feedbackRecordHash: string;
}> {
  const { harness, coordinator, controlPlane, n8BoundedDebateRuntime } = makeSubject();
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  harness.on(N2, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N2ToN3Handoff' });
  harness.on(N3, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N3ToN4Handoff' });
  harness.on(N4, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N4ToN5Handoff' });
  harness.on(N5, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N5ToN6Handoff' });
  harness.on(N6, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N6ToN7Handoff' });
  // N7 first trial (initial_from_n6) -> N7ToN8 handoff; the second trial is the feedback re-entry.
  harness.on(N7, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N7ToN8Handoff' });

  // Pre-record the N8ToN7Feedback artifact the way persistN8DebateLoopback would, then point the
  // scripted N8 loopback's authority at it (ref = n8_feedback_ref, authority_hash = payload hash).
  const feedbackPayload = {
    feedback_class: 'gate_rejected',
    failure_reason_code: 'N8_VALUE_BORDERLINE_DEBATE_TRIGGER',
    feedback_summary: 'Borderline total_score requires bounded value debate.',
  };
  const feedbackArtifact = await controlPlane.recordArtifactRef({
    artifact_kind: 'structured_output',
    workflow_run_id: RUN,
    payload: feedbackPayload,
  });
  const feedbackRef = ref('artifact_ref', feedbackArtifact.artifact_ref_id);
  // Payload hash is a DISTINCT sentinel (deliberately NOT hash(feedbackPayload)) so the re-entry
  // assertion proves the coordinator threads the loopback's authority_hash verbatim into
  // n8_feedback_payload_hash, rather than coincidentally matching a value the test pinned twice.
  const feedbackPayloadHash = 'sentinel_authority_hash_distinct_from_payload_hash';
  // Record hash is reproduced via canonicalHash — the SAME single source the coordinator (and the
  // harness validator) use — over the persisted record, so the test binds to the canonical formula.
  const feedbackRecordHash = canonicalHash(feedbackArtifact);
  // The N8 recipe requires N7's N7->N8 context projection artifact (required_projection_kind);
  // the real N7 runner records it — simulate that so the N8 request can be assembled.
  await controlPlane.recordArtifactRef({
    artifact_kind: 'diagnostic',
    workflow_run_id: RUN,
    payload: { projection_kind: 'v1b_n7_to_n8_topic_question_contract_context' },
  });
  harness.on(N8, {
    gate_status: 'blocked',
    route_decision: 'loopback',
    authority_ref: feedbackRef,
    hashes: {
      frozen_input_hash: 'fih',
      execution_spec_hash: 'esh',
      semantic_artifact_hash: null,
      runtime_admission_hash: null,
      gate_result_hash: 'grh',
      authority_hash: feedbackPayloadHash,
      handoff_hash: null,
      route_hash: 'rh',
    },
  });

  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N2, node_attempt_id: 'node_attempt_n2_human' });
  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, node_inputs: { [N4]: { draft_payload: { slice: 'opt' } } } });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N5, node_attempt_id: 'node_attempt_n5_human' });
  const loopbackReport = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    node_inputs: { [N6]: { draft_payload: { candidates: ['c'] } }, [N8]: { draft_payload: { total_score: 66 } } },
  });
  assert.equal(loopbackReport.halt.reason, 'harness_loopback');
  assert.equal(loopbackReport.halt.node_id, N8);
  assert.match(loopbackReport.halt.message, /retry_node_id=topic-selection\.v1b\.materialize-topic-question-contract\.v1 to re-enter/);

  return { harness, coordinator, controlPlane, n8BoundedDebateRuntime, feedbackRef, feedbackPayloadHash, feedbackRecordHash };
}

const DEBATE_ADMISSION_SUPPORT = {
  debate_level: 'compact_assessment_debate',
  recommended_profile_id: 'topic-selection.v1b.harness.n7_n8_debate_admission_support',
  high_value_signal_codes: [],
  risk_signal_codes: ['N8_VALUE_BORDERLINE_DEBATE_TRIGGER'],
  rationale: 'Borderline total_score warrants a compact value debate.',
};

test('N8 debate loopback re-enters N7 in feedback_from_n8 mode with the feedback artifact + debate-admission support', async () => {
  const { harness, coordinator, feedbackRef, feedbackPayloadHash, feedbackRecordHash } = await driveToN8DebateLoopback();

  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N7,
    // The feedback re-entry requires the caller-supplied debate-admission review support.
    node_inputs: { [N7]: { draft_payload: { ...DEBATE_ADMISSION_SUPPORT } } },
  });
  // After the feedback re-entry admits, N8 (model-like) becomes the frontier again and needs a draft.
  assert.deepEqual(report.steps.map((step) => step.node_id), [N7]);
  assert.equal(report.halt.reason, 'model_input_required');
  assert.equal(report.halt.node_id, N8);

  const n7Requests = harness.invocations.filter((request) => request.node_id === N7);
  assert.equal(n7Requests.length, 2, 'N7 ran twice: initial then feedback re-entry');
  const initialPayload = n7Requests[0]!.frozen_input.payload as Record<string, unknown>;
  assert.equal(initialPayload.input_mode, 'initial_from_n6');
  assert.equal(initialPayload.n8_feedback_ref, undefined, 'initial N7 carries no feedback refs');

  const feedbackRequest = n7Requests[1]!;
  const feedbackPayload = feedbackRequest.frozen_input.payload as Record<string, unknown>;
  assert.equal(feedbackPayload.input_mode, 'feedback_from_n8');
  assert.deepEqual(feedbackPayload.n8_feedback_ref, feedbackRef);
  assert.equal(feedbackPayload.n8_feedback_hash, feedbackRecordHash);
  assert.equal(feedbackPayload.n8_feedback_payload_hash, feedbackPayloadHash);
  const refKeys = feedbackRequest.frozen_input.source_refs.map((item) => `${item.ref_type}:${item.ref_id}`);
  assert.ok(refKeys.includes(`artifact_ref:${feedbackRef.ref_id}`), 'feedback artifact ref must be in source_refs');

  // The coordinator recorded the debate-admission support under the right support_only slot and
  // attached it to the feedback re-entry request (so the real harness readmission can resolve it).
  const support = feedbackRequest.semantic_artifacts?.[0];
  assert.equal(support?.slot_id, 'n7_n8_debate_admission_review');
  assert.equal(support?.allowed_effect, 'support_only');
  assert.equal(support?.output_contract, 'N8DebateAdmissionReviewSupport@v1');
});

test('N8 debate loopback re-entry of N7 halts for the debate-admission support when the caller omits it', async () => {
  const { coordinator } = await driveToN8DebateLoopback();
  const report = await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, retry_node_id: N7 });
  // N7 is normally auto-driven, but the feedback re-entry needs the support — so it halts asking for it.
  assert.equal(report.steps.length, 0);
  assert.equal(report.halt.reason, 'model_input_required');
  assert.equal(report.halt.node_id, N7);
  assert.match(report.halt.message, /n7_n8_debate_admission_review support/);
});

test('N8 debate loopback can still re-invoke the source (N8) with a fresh draft instead of re-entering N7', async () => {
  const { harness, coordinator } = await driveToN8DebateLoopback();
  // Retry the SOURCE (N8) — the existing resume path must still work alongside the new N7 re-entry.
  // Replace N8's scripted loopback with an admit so the source re-invocation converges.
  harness.script.set(N8, [{ gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N8ToN9Handoff' }]);
  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N8,
    node_inputs: { [N8]: { draft_payload: { total_score: 88 } } },
    max_steps: 1, // stop after the N8 re-invocation (don't run on into N9)
  });
  assert.equal(report.steps[0]!.node_id, N8);
  // The source was re-invoked; no second N7 feedback trial was assembled.
  assert.equal(harness.invocations.filter((request) => request.node_id === N7).length, 1);
  assert.equal(harness.invocations.filter((request) => request.node_id === N8).length, 2);
});

test('concurrent advance calls are serialized per run (no duplicate node execution)', async () => {
  const { harness, coordinator } = makeSubject();
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });

  const [first, second] = await Promise.all([
    coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() }),
    coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() }),
  ]);

  assert.equal(harness.invocations.filter((request) => request.node_id === N1).length, 1);
  const reasons = [first.halt.reason, second.halt.reason].sort();
  assert.deepEqual(reasons, ['human_node', 'human_node']);
  assert.equal(first.steps.length + second.steps.length, 1);
});

test('node timeout halts the advance with a convergence hint', async () => {
  const { harness, coordinator } = makeSubject();
  harness.hangNodes.add(N1);

  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    bootstrap_request: bootstrapRequest(),
    node_timeout_ms: 50,
  });
  assert.equal(report.halt.reason, 'node_timeout');
  assert.equal(report.halt.node_id, N1);
  assert.match(report.halt.message, /replay-idempotent/);
});

test('a thrown advance neither crashes the process nor poisons or leaks the run lock', async () => {
  const { harness, coordinator } = makeSubject();
  // mismatched bootstrap run id → AppError before any harness call (with the old
  // void-finally lock chain this raised an unhandledRejection and killed the runner)
  await assert.rejects(
    coordinator.advanceUntilBlocked({
      workflow_run_id: RUN,
      bootstrap_request: { ...bootstrapRequest(), workflow_run_id: 'workflow_run_other' },
    }),
    /does not match the run/,
  );
  // give the lock-cleanup microtasks a tick, then the same run must advance normally
  await new Promise((resolve) => setTimeout(resolve, 0));
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  const report = await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });
  assert.equal(report.halt.reason, 'human_node');
});

test('a timed-out invocation still in flight blocks re-advance until it settles (no duplicate attempt)', async () => {
  const { harness, coordinator } = makeSubject();
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  harness.hangNodes.add(N1);

  const first = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    bootstrap_request: bootstrapRequest(),
    node_timeout_ms: 30,
  });
  assert.equal(first.halt.reason, 'node_timeout');

  // the orphaned invocation has not landed its trace — re-advancing must NOT re-invoke
  const second = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    bootstrap_request: bootstrapRequest(),
    node_timeout_ms: 30,
  });
  assert.equal(second.halt.reason, 'node_in_flight');
  assert.equal(second.halt.node_id, N1);
  assert.equal(harness.invocations.filter((request) => request.node_id === N1).length, 0);

  // let the orphan settle (trace lands), then advance converges from the projection
  harness.releaseHangs(N1);
  await new Promise((resolve) => setTimeout(resolve, 10));
  const third = await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });
  assert.equal(third.halt.reason, 'human_node');
  assert.equal(harness.invocations.filter((request) => request.node_id === N1).length, 1);
});

test('same-millisecond traces resolve by event order, not created_at ties', async () => {
  const { controlPlane, coordinator } = makeSubject();
  const tracePayload = (attemptId: string, result: Record<string, unknown>) => ({
    payload_schema: 'TopicSelectionV1bWorkflowHarnessTracePayload@v1',
    node_id: N6,
    workflow_run_id: RUN,
    node_attempt_id: attemptId,
    node_replay_key: `replay_${attemptId}`,
    request: {},
    result,
    created_at: '2026-06-12T02:00:00.000Z', // identical ms timestamp on both traces
  });
  await controlPlane.recordArtifactRef({
    artifact_kind: 'trace',
    workflow_run_id: RUN,
    payload: tracePayload('node_attempt_n6_first', { gate_status: 'blocked', route_decision: 'loopback' }),
  });
  await controlPlane.recordArtifactRef({
    artifact_kind: 'trace',
    workflow_run_id: RUN,
    payload: tracePayload('node_attempt_n6_second', { gate_status: 'admitted', route_decision: 'invoke_next' }),
  });

  const state = await coordinator.getRunState(RUN);
  const n6 = state.nodes.find((node) => node.node_id === N6)!;
  assert.equal(n6.latest?.node_attempt_id, 'node_attempt_n6_second');
  assert.equal(n6.latest?.route_decision, 'invoke_next');
  assert.equal(n6.latest_admitted?.node_attempt_id, 'node_attempt_n6_second');
});

test('a later blocked re-attempt does not erase admitted lineage (latest_admitted survives)', async () => {
  const { harness, coordinator } = makeSubject();
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });

  // someone re-invokes N1 outside the coordinator and the attempt blocks (e.g. replay drift)
  harness.script.set(N1, [{ gate_status: 'blocked', route_decision: 'blocked' }]);
  await harness.invokeNode({ ...bootstrapRequest(), node_attempt_id: 'node_attempt_n1_drift' });

  const state = await coordinator.getRunState(RUN);
  const n1 = state.nodes.find((node) => node.node_id === N1)!;
  assert.equal(n1.latest?.gate_status, 'blocked');
  assert.equal(n1.latest_admitted?.gate_status, 'admitted');
  // completion/lineage still derive from the admitted attempt
  assert.equal(state.last_completed_node_id, N1);
  assert.equal(state.next_node_id, N2);
});

test('projection counts attempts and loopbacks and surfaces run completion', async () => {
  const { harness, coordinator } = makeSubject();
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });
  // synthetic N6 loopbacks recorded directly through the stub harness
  harness.on(N6, { gate_status: 'blocked', route_decision: 'loopback' });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N6, node_attempt_id: 'node_attempt_n6_a' });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N6, node_attempt_id: 'node_attempt_n6_b' });

  const state = await coordinator.getRunState(RUN);
  const n6 = state.nodes.find((node) => node.node_id === N6)!;
  assert.equal(n6.attempt_count, 2);
  assert.equal(n6.loopback_count, 2);
  assert.equal(state.run_complete, false);
  const n1 = state.nodes.find((node) => node.node_id === N1)!;
  assert.equal(n1.latest?.route_decision, 'invoke_next');
});

// W-02: the terminal-node coverage the existing suite lacked. The N11 recipe entry
// (publish-v1c-input-bundle -> n10_handoff_hash) is present in HANDOFF_BUILDER_TABLE and
// passes the module-load coverage assertion, but nothing drove the chain THROUGH N11 to
// stop_v1b_complete. This drives the full clean (no-debate) N1->N11 happy path and asserts
// the deterministic tail (N9/N10/N11) auto-advances off the recipe and the run completes.
test('drives the full N1..N11 chain to stop_v1b_complete and reports run completion', async () => {
  const { harness, coordinator, controlPlane } = makeSubject();
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  harness.on(N2, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N2ToN3Handoff' });
  harness.on(N3, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N3ToN4Handoff' });
  harness.on(N4, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N4ToN5Handoff' });
  harness.on(N5, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N5ToN6Handoff' });
  harness.on(N6, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N6ToN7Handoff' });
  harness.on(N7, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N7ToN8Handoff' });
  harness.on(N8, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N8ToN9Handoff' });
  harness.on(N9, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N9ToN10Handoff' });
  harness.on(N10, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N10ToN11Handoff' });
  // N11 publishes the v1c input bundle and is terminal: it routes stop_v1b_complete.
  harness.on(N11, { gate_status: 'admitted', route_decision: 'stop_v1b_complete' });

  // N1 bootstrap -> human halt at N2
  const n1Report = await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });
  assert.equal(n1Report.halt.node_id, N2);
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N2, node_attempt_id: 'node_attempt_n2_human' });

  // N3 (auto) -> N4 (model draft) -> human halt at N5
  const n4Report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    node_inputs: { [N4]: { draft_payload: { slice: 'opt' } } },
  });
  assert.equal(n4Report.halt.node_id, N5);
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N5, node_attempt_id: 'node_attempt_n5_human' });

  // The N8 recipe requires N7's N7->N8 context projection artifact (required_projection_kind);
  // the real N7 runner records it — simulate that so the N8 request can be assembled.
  await controlPlane.recordArtifactRef({
    artifact_kind: 'diagnostic',
    workflow_run_id: RUN,
    payload: { projection_kind: 'v1b_n7_to_n8_topic_question_contract_context' },
  });

  // N6 (model draft) -> N7 (auto) -> N8 (model draft) -> N9/N10/N11 (deterministic auto) -> complete
  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    node_inputs: {
      [N6]: { draft_payload: { candidates: ['c'] } },
      [N8]: { draft_payload: { total_score: 80 } },
    },
  });

  assert.deepEqual(report.steps.map((step) => step.node_id), [N6, N7, N8, N9, N10, N11]);
  assert.equal(report.halt.reason, 'run_complete');
  assert.equal(report.halt.node_id, N11);
  assert.match(report.halt.message, /stop_v1b_complete/);
  assert.equal(report.run_state.run_complete, true);
  assert.equal(report.run_state.last_completed_node_id, N11);
  assert.equal(report.run_state.next_node_id, null);

  // N11 was auto-driven exactly once and assembled its frozen input from the N10 handoff hash —
  // exercising the W-02 recipe entry (handoff_hash_key: 'n10_handoff_hash').
  const n11Requests = harness.invocations.filter((request) => request.node_id === N11);
  assert.equal(n11Requests.length, 1);
  const n11Payload = n11Requests[0]!.frozen_input.payload as Record<string, unknown>;
  assert.equal(n11Payload.n10_handoff_hash, `handoff_hash_${N10}`);
});

// W-04 fault-recovery: a recipe whose required upstream lineage is not ready must surface as a
// structured upstream_blocked halt (named artifact) rather than a raw 500 from request assembly.
test('W-04: a missing required upstream projection halts with upstream_blocked, not a 500', async () => {
  const { harness, coordinator } = makeSubject();
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  harness.on(N2, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N2ToN3Handoff' });
  harness.on(N3, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N3ToN4Handoff' });
  harness.on(N4, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N4ToN5Handoff' });
  harness.on(N5, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N5ToN6Handoff' });
  harness.on(N6, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N6ToN7Handoff' });
  harness.on(N7, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N7ToN8Handoff' });
  harness.on(N8, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N8ToN9Handoff' });

  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N2, node_attempt_id: 'node_attempt_n2_human' });
  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, node_inputs: { [N4]: { draft_payload: { slice: 'opt' } } } });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N5, node_attempt_id: 'node_attempt_n5_human' });
  // Deliberately DO NOT record the N7->N8 runtime projection the N8 recipe requires.
  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    node_inputs: { [N6]: { draft_payload: { candidates: ['c'] } }, [N8]: { draft_payload: { total_score: 80 } } },
  });

  assert.equal(report.halt.reason, 'upstream_blocked');
  assert.equal(report.halt.node_id, N8);
  assert.match(report.halt.message, /runtime projection/);
  // N6 and N7 advanced; N8 was never invoked (assembly failed before the harness call).
  assert.deepEqual(report.steps.map((step) => step.node_id), [N6, N7]);
  assert.equal(harness.invocations.filter((request) => request.node_id === N8).length, 0);
});

// W-04 fault-recovery: an N8->N7 feedback re-entry whose feedback artifact is gone halts with a
// named feedback_artifact_missing instead of a raw 500.
test('W-04: an N8 feedback re-entry whose feedback artifact is gone halts with feedback_artifact_missing', async () => {
  const { coordinator, controlPlane, feedbackRef } = await driveToN8DebateLoopback();
  // The feedback artifact the N7 re-entry must thread is no longer resolvable.
  controlPlane.artifacts.delete(feedbackRef.ref_id);

  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N7,
    node_inputs: { [N7]: { draft_payload: { ...DEBATE_ADMISSION_SUPPORT } } },
  });

  assert.equal(report.halt.reason, 'feedback_artifact_missing');
  assert.equal(report.halt.node_id, N7);
  assert.match(report.halt.message, /not found/);
});

// W-04 fault-recovery: the opt-in human-submission nonce guard.
test('W-04: human-submission nonce guard rejects a duplicate (run, nonce), allows retry after failure, ignores null', async () => {
  const { coordinator } = makeSubject();
  let calls = 0;

  const first = await coordinator.runHumanSubmissionExclusive(RUN, 'nonce-1', async () => { calls += 1; return 'ok'; });
  assert.equal(first, 'ok');

  // Same (run, nonce) → 409, and the submission body is NOT re-run.
  await assert.rejects(
    coordinator.runHumanSubmissionExclusive(RUN, 'nonce-1', async () => { calls += 1; return 'dup'; }),
    /already accepted/,
  );
  assert.equal(calls, 1);

  // A different nonce runs normally.
  assert.equal(await coordinator.runHumanSubmissionExclusive(RUN, 'nonce-2', async () => 'two'), 'two');

  // A FAILED attempt does not consume the nonce — the same nonce can be retried.
  await assert.rejects(
    coordinator.runHumanSubmissionExclusive(RUN, 'nonce-3', async () => { throw new Error('boom'); }),
    /boom/,
  );
  assert.equal(await coordinator.runHumanSubmissionExclusive(RUN, 'nonce-3', async () => 'recovered'), 'recovered');

  // A null nonce never guards (the route stays exactly as before).
  assert.equal(await coordinator.runHumanSubmissionExclusive(RUN, null, async () => 'a'), 'a');
  assert.equal(await coordinator.runHumanSubmissionExclusive(RUN, null, async () => 'b'), 'b');
});

// W-04: the race the nonce guard actually defends — two CONCURRENT same-(run, nonce) submissions
// fired without an intervening await. The per-run mutex must serialize them so exactly one is
// accepted (this is the regression a future withRunLock refactor could silently break).
test('W-04: concurrent same-(run, nonce) submissions accept exactly one (race-safe)', async () => {
  const { coordinator } = makeSubject();
  let ran = 0;
  const submit = () => coordinator.runHumanSubmissionExclusive(RUN, 'nonce-race', async () => { ran += 1; return 'ok'; });
  // Both promises are created before either is awaited — they contend for the same run lock.
  const [a, b] = await Promise.allSettled([submit(), submit()]);
  assert.deepEqual([a.status, b.status].sort(), ['fulfilled', 'rejected']);
  const rejected = (a.status === 'rejected' ? a : b) as PromiseRejectedResult;
  assert.match(String((rejected.reason as Error)?.message ?? rejected.reason), /already accepted/);
  assert.equal(ran, 1, 'only one submission body ran');
});

// ===========================================================================================
// T-127 W-07 item (a): caller-side debate orchestration. The harness DETECTS + ROUTES the N6
// n6_debate_escalation loopback (warning N6_DEBATE_ESCALATION_RECOMMENDED) and the N8 n8_feedback_to_n7
// debate loopback; the coordinator now DRIVES the debate runtime caller-side and feeds its
// runtime_verified gate-draft back into the node so the existing gate admits it.
// ===========================================================================================

const N6_DEBATE_INPUT = {
  kind: 'n6_divergent' as const,
  execution_mode: 'mocked_llm' as const,
  generation_mode: 'regeneration_after_n6_gate_failure' as const,
  role_outputs: {},
};

const N8_DEBATE_INPUT = {
  kind: 'n8_bounded' as const,
  execution_mode: 'mocked_llm' as const,
  role_outputs: {},
};

/** A STRUCTURALLY valid N6LoopbackTriageSupport@v1 payload routing `n6_debate_escalation` (passes
 *  isN6LoopbackTriageSupportPayload field-by-field). It is NOT lineage-valid: affected_refs points at a
 *  synthetic slice ref, so n6LoopbackTriageAffectedRefsBlocker would reject it in a REAL run (a real
 *  caller must use the frozen research_slice_ref). This suite asserts the coordinator's record+attach
 *  contract against a slot-presence stub; the real-harness round-trip (lineage-correct triage +
 *  loopback-inducing draft -> routed escalation) is covered by
 *  topic-selection-v1b-workflow-harness-service.unit.test.ts ('N6 divergent-debate escalation runs
 *  end-to-end'), whose fixture_replay artifact shape is identical to the coordinator's recorder. */
const N6_TRIAGE_ESCALATION_SUPPORT = {
  loopback_target_code: 'n6_debate_escalation',
  failure_scope: 'candidate_level',
  dominant_reason_codes: ['N6_NO_ADMISSIBLE_CANDIDATES'],
  affected_refs: [ref('research_slice', 'slice_1')],
  regeneration_hints: [],
  debate_escalation: {
    debate_level: 'mixed_cost_control',
    recommended_profile_id: 'topic-selection.v1b.n6-divergent-debate-support',
    sticky: true,
    rationale: 'No admissible candidates; escalate to a divergent debate before regenerating.',
  },
  upstream_rollback: null,
  rationale: 'N6 gate found no admissible candidates; triage recommends divergent-debate escalation.',
};

/** Stub N6 routing that models ONLY the coordinator-observable signal: it emits the escalation warning
 *  iff the request carries an n6_loopback_triage slot, else admits. It deliberately does NOT reproduce
 *  the real resolveN6LoopbackTriage gauntlet (payload validity, loopback_target_code, affected-refs
 *  lineage, fixture_replay admission) — that is the harness suite's job (see the E2E test above). The
 *  point here is to drive the coordinator's record+attach + debate-orchestration plumbing, not to
 *  re-prove harness routing. */
function routeN6OnTriage(harness: StubHarness): void {
  harness.route(N6, (request) => {
    const hasTriage = (request.semantic_artifacts ?? []).some((artifact) => artifact.slot_id === 'n6_loopback_triage');
    return hasTriage
      ? {
        gate_status: 'blocked',
        route_decision: 'loopback',
        warnings: [{ code: 'N6_DEBATE_ESCALATION_RECOMMENDED', message: 'debate escalation recommended', severity: 'warning' }],
      }
      // No triage attached (the debate-driven re-invocation, or a single-agent regeneration) → admit.
      // NB: the real harness admits a re-invocation because the fresh draft VALIDATES, not because a
      // triage slot is absent; the stub conflates the two, which is sufficient for the coordinator plumbing.
      : { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N6ToN7Handoff' };
  });
}

/** Drive N1..N5, then an N6 gate-failure whose attached triage routes `n6_debate_escalation` — so N6's
 *  latest attempt is a loopback-to-self carrying the escalation warning. The coordinator reaches that
 *  frontier by recording + attaching the caller's n6_loopback_triage support (the production path), not
 *  by a hard-coded harness script. Mirrors driveToN8DebateLoopback's N1..N5 driving. */
async function driveToN6Escalation(): Promise<ReturnType<typeof makeSubject>> {
  const subject = makeSubject();
  const { harness, coordinator, controlPlane } = subject;
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  harness.on(N2, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N2ToN3Handoff' });
  harness.on(N3, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N3ToN4Handoff' });
  harness.on(N4, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N4ToN5Handoff' });
  harness.on(N5, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N5ToN6Handoff' });
  // N6 routes the escalation iff the attempt carries the n6_loopback_triage support; otherwise admits.
  routeN6OnTriage(harness);

  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N2, node_attempt_id: 'node_attempt_n2_human' });
  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, node_inputs: { [N4]: { draft_payload: { slice: 'opt' } } } });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N5, node_attempt_id: 'node_attempt_n5_human' });
  // NB: { candidates: [] } is a placeholder draft — the stub harness does not validate it. In a REAL
  // run the draft must be a TopicQuestionCandidateSetDraft@v1 that the deterministic N6 gate routes
  // specifically into a candidate-level loopback (>=1 candidate, all semantically blocked); a zero/empty
  // draft would route 'blocked', never reaching the triage. The harness E2E test exercises that real draft.
  const blocked = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    node_inputs: { [N6]: { draft_payload: { candidates: [] }, support_payloads: { n6_loopback_triage: N6_TRIAGE_ESCALATION_SUPPORT } } },
  });
  assert.equal(blocked.halt.reason, 'harness_loopback');
  assert.equal(blocked.halt.node_id, N6);
  // The real harness records the gate-failure retry projection on the n6_debate_escalation loopback
  // (the N6 runtime — single-agent OR divergent debate — requires it for the
  // regeneration_after_n6_gate_failure mode). The stub harness does not, so record it here so the
  // coordinator can thread its ref into the debate re-invocation's frozen_input.source_refs.
  await controlPlane.recordArtifactRef({
    artifact_kind: 'diagnostic',
    workflow_run_id: RUN,
    payload: { projection_kind: 'v1b_n6_gate_failure_retry_context', loopback_target_code: 'n6_debate_escalation' },
  });
  return subject;
}

// The core T-127 W-07 (a) follow-up: the coordinator gives a run a way to attach an n6_loopback_triage
// support to the failing N6 attempt — the channel the harness needs to route n6_debate_escalation in a
// real run (without it the gate-failure defaults to n6_regenerate_candidates). This test pins the
// COORDINATOR's responsibility: record the caller payload as a fixture_replay support_only artifact and
// attach it (+ the model draft) to the N6 request. The real-harness routing of that artifact is proven
// in topic-selection-v1b-workflow-harness-service.unit.test.ts ('N6 divergent-debate escalation
// runs end-to-end'), which drives the same fixture_replay shape through the real resolveN6LoopbackTriage.
test('coordinator records + attaches the n6_loopback_triage support (the channel the harness routes escalation on)', async () => {
  const { harness, controlPlane } = await driveToN6Escalation();

  // The failing N6 attempt carried BOTH the model draft and the triage support (the harness resolves
  // each independently by slot_id), so a real harness could route the escalation off the triage.
  const n6Requests = harness.invocations.filter((request) => request.node_id === N6);
  assert.equal(n6Requests.length, 1, 'only the escalation-triggering trial ran so far');
  const slots = (n6Requests[0]!.semantic_artifacts ?? []).map((artifact) => artifact.slot_id).sort();
  assert.deepEqual(slots, ['n6_loopback_triage', 'n6_question_candidate_draft']);

  // The triage rides the same fixture_replay / support_only recording as the feedback-admission support.
  const triage = n6Requests[0]!.semantic_artifacts!.find((artifact) => artifact.slot_id === 'n6_loopback_triage')!;
  assert.equal(triage.allowed_effect, 'support_only');
  assert.equal(triage.output_contract, 'N6LoopbackTriageSupport@v1');
  assert.equal(triage.runtime_provenance_class, 'fixture_replay');
  assert.equal(triage.run_mode, 'acceptance');
  assert.equal(triage.input_hash, n6Requests[0]!.frozen_input.frozen_input_hash);
  // One artifact backs both refs; the recorded payload is the caller's triage verbatim.
  assert.equal(triage.normalized_output_ref?.ref_id, triage.support_artifact_ref.ref_id);
  assert.equal(triage.normalized_output_hash, triage.support_artifact_hash);
  const recorded = await controlPlane.getArtifactRef(triage.support_artifact_ref.ref_id);
  assert.deepEqual(recorded?.payload, N6_TRIAGE_ESCALATION_SUPPORT);
  // All three hash fields carry the recorded artifact checksum (= canonicalHash of the payload), NOT a
  // placeholder — the shape the real resolver requires (payloadHash === normalized/structured/support hash).
  // This asserts copy-fidelity + non-placeholder; the real round-trip equality is exercised in the harness E2E.
  const triageHash = canonicalHash(N6_TRIAGE_ESCALATION_SUPPORT);
  assert.equal(triage.normalized_output_hash, triageHash);
  assert.equal(triage.structured_output_hash, triageHash);
  assert.equal(triage.support_artifact_hash, triageHash);
});

test('coordinator propagates run_mode=product onto the recorded triage (so the harness rejects fixture_replay under product)', async () => {
  // The coordinator cannot itself reject product (the harness does), but it must STAMP the run_mode so
  // the real harness admission can — fixture_replay is admitted only when run_mode !== 'product'.
  const { harness, coordinator } = makeSubject();
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  harness.on(N2, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N2ToN3Handoff' });
  harness.on(N3, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N3ToN4Handoff' });
  harness.on(N4, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N4ToN5Handoff' });
  harness.on(N5, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N5ToN6Handoff' });
  routeN6OnTriage(harness);
  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N2, node_attempt_id: 'node_attempt_n2_human' });
  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, node_inputs: { [N4]: { draft_payload: { slice: 'opt' } } } });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N5, node_attempt_id: 'node_attempt_n5_human' });

  await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    run_mode: 'product',
    node_inputs: { [N6]: { draft_payload: { candidates: [] }, support_payloads: { n6_loopback_triage: N6_TRIAGE_ESCALATION_SUPPORT } } },
  });

  const n6Request = harness.invocations.find((request) => request.node_id === N6)!;
  assert.equal(n6Request.run_mode, 'product');
  const triage = n6Request.semantic_artifacts!.find((artifact) => artifact.slot_id === 'n6_loopback_triage')!;
  assert.equal(triage.run_mode, 'product', 'the recorded triage carries the request run_mode, so the real harness rejects the fixture_replay');
});

test('support_payloads rejects a model_draft_for_gate slot — those belong on draft_payload', async () => {
  const { coordinator } = await driveToN6Escalation();
  // Routing a model-draft slot through support_payloads would shadow the real gate draft — rejected.
  await assert.rejects(
    coordinator.advanceUntilBlocked({
      workflow_run_id: RUN,
      retry_node_id: N6,
      node_inputs: {
        [N6]: {
          draft_payload: { candidates: ['regenerated'] },
          support_payloads: { n6_question_candidate_draft: { candidates: ['shadow'] } },
        },
      },
    }),
    /not support_only/,
  );
});

test('support_payloads supplied with debate is rejected before any harness call', async () => {
  const { harness, coordinator } = await driveToN6Escalation();
  const n6Before = harness.invocations.filter((request) => request.node_id === N6).length;
  await assert.rejects(
    coordinator.advanceUntilBlocked({
      workflow_run_id: RUN,
      retry_node_id: N6,
      node_inputs: { [N6]: { debate: N6_DEBATE_INPUT, support_payloads: { n6_loopback_triage: N6_TRIAGE_ESCALATION_SUPPORT } } },
    }),
    /support_payloads can only accompany draft_payload, not debate/,
  );
  assert.equal(harness.invocations.filter((request) => request.node_id === N6).length, n6Before, 'no harness call on the rejected advance');
});

test('support_payloads supplied with execution_spec is rejected (the support is fixture_replay/codex_assisted)', async () => {
  const { harness, coordinator } = await driveToN6Escalation();
  const n6Before = harness.invocations.filter((request) => request.node_id === N6).length;
  await assert.rejects(
    coordinator.advanceUntilBlocked({
      workflow_run_id: RUN,
      retry_node_id: N6,
      node_inputs: {
        [N6]: {
          execution_spec: { execution_mode: 'provider_llm', model_option_id: 'm1' },
          support_payloads: { n6_loopback_triage: N6_TRIAGE_ESCALATION_SUPPORT },
        },
      },
    }),
    /support_payloads can only accompany draft_payload, not execution_spec/,
  );
  assert.equal(harness.invocations.filter((request) => request.node_id === N6).length, n6Before, 'no harness call on the rejected advance');
});

test('support_payloads cannot re-target a slot already populated by draft_payload (feedback re-entry support)', async () => {
  // The N7 feedback re-entry records draft_payload UNDER the n7_n8_debate_admission_review support slot;
  // also passing that slot via support_payloads would double-record it (harness keeps only the first).
  const { coordinator } = await driveToN8DebateLoopback();
  await assert.rejects(
    coordinator.advanceUntilBlocked({
      workflow_run_id: RUN,
      retry_node_id: N7,
      node_inputs: {
        [N7]: {
          draft_payload: { ...DEBATE_ADMISSION_SUPPORT },
          support_payloads: { n7_n8_debate_admission_review: { ...DEBATE_ADMISSION_SUPPORT } },
        },
      },
    }),
    /already populated/,
  );
});

test('N6 debate escalation: coordinator runs runDivergentDebate and feeds the gate-draft back into N6', async () => {
  const { harness, coordinator, n6DivergentDebateRuntime } = await driveToN6Escalation();

  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N6,
    node_inputs: { [N6]: { debate: N6_DEBATE_INPUT } },
    max_steps: 1, // stop right after the debate-driven N6 re-invocation
  });

  // The divergent debate ran exactly once, with the caller's fixtures + re-entry generation_mode.
  assert.equal(n6DivergentDebateRuntime.calls.length, 1);
  assert.equal(n6DivergentDebateRuntime.calls[0]!.generation_mode, 'regeneration_after_n6_gate_failure');
  assert.equal(n6DivergentDebateRuntime.calls[0]!.execution_mode, 'mocked_llm');
  // W-09 S4: no execution_plan supplied -> the coordinator forwards undefined -> the runtime resolves null
  // -> byte-identical to pre-W09. (Positive forwarding is proven in the next test.)
  assert.equal(n6DivergentDebateRuntime.calls[0]!.execution_plan, undefined);
  // N6 was re-invoked, and the debate's runtime_verified gate-draft was ATTACHED (not re-recorded).
  assert.equal(report.steps[0]!.node_id, N6);
  const n6Requests = harness.invocations.filter((request) => request.node_id === N6);
  assert.equal(n6Requests.length, 2, 'N6 ran twice: blocking trial then debate-driven re-invocation');
  const attached = n6Requests[1]!.semantic_artifacts?.[0];
  assert.equal(attached?.slot_id, 'n6_question_candidate_draft');
  assert.equal(attached?.runtime_provenance_class, 'runtime_verified');
});

test('N6 debate escalation (W-09 S4): the coordinator forwards a caller-supplied provider-diverse execution_plan verbatim into the runtime', async () => {
  // The one production-reachable selection seam: a caller injects a named plan on the debate node input
  // and the coordinator passes it through to runDivergentDebate unchanged (the debate_level->plan
  // auto-decision stays a deferred harness seam). The plan is identity-bearing, NOT live-provider.
  const { coordinator, n6DivergentDebateRuntime } = await driveToN6Escalation();
  const plan = selectN6DebateExecutionPlan('provider_diverse');

  await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N6,
    node_inputs: { [N6]: { debate: { ...N6_DEBATE_INPUT, execution_plan: plan } } },
    max_steps: 1,
  });

  assert.equal(n6DivergentDebateRuntime.calls.length, 1);
  // The plan reached the runtime byte-for-byte (per-role provider-diverse model_option_ids intact).
  assert.deepEqual(n6DivergentDebateRuntime.calls[0]!.execution_plan, plan);
  assert.equal(n6DivergentDebateRuntime.calls[0]!.execution_plan?.name, 'provider_diverse');
  assert.equal(
    n6DivergentDebateRuntime.calls[0]!.execution_plan?.roles?.n6_debate_arbiter?.model_option_id,
    `${'topic-selection.v1b.n6-debate.arbiter.v1'}.openai-quality`,
  );
});

test('N6 debate escalation (W-09 pre-provider_llm hardening): the coordinator rejects a structurally invalid execution_plan before running the debate', async () => {
  // The forwarding seam must not pass an over-permissive plan through: a `name` outside the three named
  // plans fails the shared named-plan schema, so the coordinator rejects it (INVALID_PAYLOAD) before
  // forwarding it to runDivergentDebate. (The plan is INERT for codex|mocked debates today, so this is
  // contract-tightness only — the harness W-09 review's gap — but it must hold before any provider_llm path.)
  const { coordinator, n6DivergentDebateRuntime } = await driveToN6Escalation();
  await assert.rejects(
    coordinator.advanceUntilBlocked({
      workflow_run_id: RUN,
      retry_node_id: N6,
      node_inputs: { [N6]: { debate: { ...N6_DEBATE_INPUT, execution_plan: { name: 'not_a_named_plan' } as never } } },
    }),
    /execution_plan is not a valid n6_divergent named execution plan/,
  );
  assert.equal(n6DivergentDebateRuntime.calls.length, 0, 'no debate ran on the rejected plan');
});

test('N6 debate escalation (W-09 pre-provider_llm hardening): the coordinator rejects an execution_plan carrying a foreign role key', async () => {
  // The plan is validated against THIS debate kind's OWN role slot ids: roles.additionalProperties is false,
  // so an N8 role key on an N6 plan (any non-N6 slot) is rejected rather than silently forwarded.
  const { coordinator, n6DivergentDebateRuntime } = await driveToN6Escalation();
  await assert.rejects(
    coordinator.advanceUntilBlocked({
      workflow_run_id: RUN,
      retry_node_id: N6,
      node_inputs: {
        [N6]: {
          debate: {
            ...N6_DEBATE_INPUT,
            execution_plan: { name: 'codex_assisted', roles: { n8_debate_value_critic: { execution_mode: 'provider_llm', model_option_id: 'x' } } } as never,
          },
        },
      },
    }),
    /execution_plan is not a valid n6_divergent named execution plan/,
  );
  assert.equal(n6DivergentDebateRuntime.calls.length, 0, 'no debate ran on the rejected plan');
});

test('N8 bounded debate (W-09 pre-provider_llm hardening): the coordinator rejects an execution_plan carrying a foreign (N6) role key', async () => {
  // Exercises the n8_bounded validator branch (the N6 tests above only hit n6_divergent): each kind is
  // validated against its OWN role slot ids, so an N6 role key on an N8 plan is rejected, not forwarded.
  const { coordinator, n8BoundedDebateRuntime } = await driveToN8DebateLoopback();
  await assert.rejects(
    coordinator.advanceUntilBlocked({
      workflow_run_id: RUN,
      retry_node_id: N7,
      node_inputs: {
        [N7]: { draft_payload: { ...DEBATE_ADMISSION_SUPPORT } }, // feedback re-entry support (reaches the N8 frontier)
        [N8]: {
          debate: {
            ...N8_DEBATE_INPUT,
            execution_plan: { name: 'codex_assisted', roles: { n6_debate_arbiter: { execution_mode: 'provider_llm', model_option_id: 'x' } } } as never,
          },
        },
      },
      max_steps: 2,
    }),
    /execution_plan is not a valid n8_bounded named execution plan/,
  );
  assert.equal(n8BoundedDebateRuntime.calls.length, 0, 'no debate ran on the rejected plan');
});

test('N6 debate request threads the gate-failure retry projection into frozen_input.source_refs', async () => {
  const { controlPlane, coordinator, n6DivergentDebateRuntime } = await driveToN6Escalation();
  // The recorded gate-failure projection (driveToN6Escalation simulates the harness recording it).
  const projection = (await controlPlane.listArtifactRefsByWorkflowRunId(RUN))
    .find((artifact) => (artifact.payload as { projection_kind?: string } | null)?.projection_kind === 'v1b_n6_gate_failure_retry_context');
  assert.ok(projection, 'the escalation must have recorded a gate-failure retry projection');

  await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N6,
    node_inputs: { [N6]: { debate: N6_DEBATE_INPUT } },
    max_steps: 1,
  });

  // The request the coordinator handed the debate runtime (== the request it re-invokes the harness
  // with) carries the gate-failure projection ref, so both the runtime resolve and the harness gate
  // (regeneration_after_n6_gate_failure) can find it.
  const debateRequest = n6DivergentDebateRuntime.calls[0]!.request;
  const refIds = debateRequest.frozen_input.source_refs.map((sourceRef) => sourceRef.ref_id);
  assert.ok(refIds.includes(projection!.artifact_ref_id), 'the N6 debate request must thread the gate-failure projection ref');
});

test('N6 debate request threads the escalation projection even when a LATER regenerate projection shares the kind', async () => {
  const { controlPlane, coordinator, n6DivergentDebateRuntime } = await driveToN6Escalation();
  // Match the gate-failure PROJECTION specifically (projection_kind) — the n6_loopback_triage support
  // artifact also carries loopback_target_code='n6_debate_escalation', so filtering on the code alone collides.
  const byCode = async (code: string) => (await controlPlane.listArtifactRefsByWorkflowRunId(RUN))
    .find((artifact) => {
      const payload = artifact.payload as { projection_kind?: string; loopback_target_code?: string } | null;
      return payload?.projection_kind === 'v1b_n6_gate_failure_retry_context' && payload?.loopback_target_code === code;
    });
  const escalation = await byCode('n6_debate_escalation');
  // A single-agent regenerate projection shares the gate-failure projection_kind and is recorded LATER
  // (higher created_at). Selecting by created_at recency alone would mis-pick it; the discriminator on
  // loopback_target_code must keep the coordinator threading the escalation-coded projection.
  await controlPlane.recordArtifactRef({
    artifact_kind: 'diagnostic',
    workflow_run_id: RUN,
    payload: { projection_kind: 'v1b_n6_gate_failure_retry_context', loopback_target_code: 'n6_regenerate_candidates' },
  });
  const regenerate = await byCode('n6_regenerate_candidates');

  await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N6,
    node_inputs: { [N6]: { debate: N6_DEBATE_INPUT } },
    max_steps: 1,
  });

  const refIds = n6DivergentDebateRuntime.calls[0]!.request.frozen_input.source_refs.map((sourceRef) => sourceRef.ref_id);
  assert.ok(refIds.includes(escalation!.artifact_ref_id), 'must thread the escalation-coded projection');
  assert.ok(!refIds.includes(regenerate!.artifact_ref_id), 'must NOT thread the later regenerate-coded projection');
});

test('N6 debate escalation halts upstream_blocked when the gate-failure projection is missing', async () => {
  const { controlPlane, coordinator, n6DivergentDebateRuntime } = await driveToN6Escalation();
  // Remove the projection driveToN6Escalation recorded — simulate an escalation routed by an older
  // harness that did not yet record the gate-failure projection. The coordinator must fail closed.
  const projection = (await controlPlane.listArtifactRefsByWorkflowRunId(RUN))
    .find((artifact) => (artifact.payload as { projection_kind?: string } | null)?.projection_kind === 'v1b_n6_gate_failure_retry_context');
  controlPlane.artifacts.delete(projection!.artifact_ref_id);

  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N6,
    node_inputs: { [N6]: { debate: N6_DEBATE_INPUT } },
  });
  assert.equal(report.halt.reason, 'upstream_blocked');
  assert.match(report.halt.message, /v1b_n6_gate_failure_retry_context/);
  assert.equal(n6DivergentDebateRuntime.calls.length, 0, 'the debate must not run without the projection');
});

test('N6 debate escalation is opt-in: with no debate fixtures it halts model_input_required and surfaces the debate option', async () => {
  const { coordinator, n6DivergentDebateRuntime } = await driveToN6Escalation();
  const report = await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, retry_node_id: N6 });
  assert.equal(report.steps.length, 0);
  // Debate is opt-in — omitting it falls through to the existing model-like path, but the message
  // surfaces both the debate (runDivergentDebate) and the single-agent draft option.
  assert.equal(report.halt.reason, 'model_input_required');
  assert.equal(report.halt.node_id, N6);
  assert.match(report.halt.message, /runDivergentDebate/);
  assert.match(report.halt.message, /single-agent pass/);
  assert.equal(n6DivergentDebateRuntime.calls.length, 0, 'no debate ran without fixtures');
});

test('N6 debate escalation still permits a single-agent draft re-invocation (debate is opt-in)', async () => {
  const { harness, coordinator, n6DivergentDebateRuntime } = await driveToN6Escalation();
  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N6,
    node_inputs: { [N6]: { draft_payload: { candidates: ['regenerated'] } } },
    max_steps: 1,
  });
  // The generic loopback resume (re-invoke N6 with a fresh single-agent draft) still works.
  assert.equal(report.steps[0]!.node_id, N6);
  assert.equal(n6DivergentDebateRuntime.calls.length, 0, 'no debate ran — the caller chose a single-agent draft');
  const n6Requests = harness.invocations.filter((request) => request.node_id === N6);
  assert.equal(n6Requests[1]!.semantic_artifacts?.[0]?.slot_id, 'n6_question_candidate_draft');
});

test('N6 debate that does not complete halts with debate_blocked, surfaces the role-turn codes, and does not re-invoke N6', async () => {
  const { harness, coordinator, n6DivergentDebateRuntime } = await driveToN6Escalation();
  // The REAL role_blocked shape: the failing-role codes live in loop.turn.invocation_result.blocker_codes
  // (string[]), one level deeper than a {code,message} admission blocker — extractDebateBlockers must reach it.
  n6DivergentDebateRuntime.next = {
    status: 'role_blocked',
    loop: {
      status: 'blocked',
      failed_slot: 'n6_debate_explorer',
      turn: {
        status: 'blocked',
        invocation_result: {
          status: 'blocked',
          blocker_codes: ['N6_DEBATE_ROLE_TURN_BLOCKED'],
          error_code: 'N6_DEBATE_ROLE_TURN_BLOCKED',
          error_message: 'explorer turn blocked',
        },
      },
      ordered_role_artifacts: [],
    },
  } as unknown as TopicSelectionV1bN6DivergentDebateRunResult;

  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N6,
    node_inputs: { [N6]: { debate: N6_DEBATE_INPUT } },
  });
  assert.equal(report.halt.reason, 'debate_blocked');
  assert.equal(report.halt.node_id, N6);
  // The role-turn blocker code is surfaced on the halt (not an empty array).
  assert.ok(
    report.halt.blockers.some((blocker) => blocker.code === 'N6_DEBATE_ROLE_TURN_BLOCKED' && blocker.message === 'explorer turn blocked'),
    'debate_blocked halt must carry the role-turn blocker code',
  );
  // The blocked debate must not reach the harness — N6 stays at the single blocking trial.
  assert.equal(harness.invocations.filter((request) => request.node_id === N6).length, 1);
});

test('N6 debate runtime throw surfaces as a structured debate_blocked halt (not a raw error)', async () => {
  const { harness, coordinator, n6DivergentDebateRuntime } = await driveToN6Escalation();
  // The real N6 runtime throws AppError(400) for regeneration_after_n6_gate_failure without the
  // gate-failure retry projection; the coordinator must convert that throw into a debate_blocked halt.
  n6DivergentDebateRuntime.throwError = new AppError(400, 'INVALID_PAYLOAD', 'N6 regeneration_after_n6_gate_failure runtime draft requires exactly one N6 gate-failure retry projection');
  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N6,
    node_inputs: { [N6]: { debate: N6_DEBATE_INPUT } },
  });
  assert.equal(report.halt.reason, 'debate_blocked');
  assert.equal(report.halt.node_id, N6);
  assert.match(report.halt.message, /caller-side debate could not run/);
  assert.ok(report.halt.blockers.some((blocker) => blocker.code === 'INVALID_PAYLOAD'));
  assert.equal(harness.invocations.filter((request) => request.node_id === N6).length, 1);
});

test('debate.kind that mismatches the detected frontier is rejected with a 400', async () => {
  const { coordinator, n6DivergentDebateRuntime, n8BoundedDebateRuntime } = await driveToN6Escalation();
  await assert.rejects(
    coordinator.advanceUntilBlocked({
      workflow_run_id: RUN,
      retry_node_id: N6,
      node_inputs: { [N6]: { debate: N8_DEBATE_INPUT } }, // n8_bounded at the N6 divergent frontier
    }),
    /does not match this node's debate kind/,
  );
  assert.equal(n6DivergentDebateRuntime.calls.length, 0);
  assert.equal(n8BoundedDebateRuntime.calls.length, 0);
});

test('an N6 escalation stranded at the loopback budget halts with an escalation-aware message', async () => {
  const { coordinator, n6DivergentDebateRuntime } = await driveToN6Escalation();
  // N6 is at one escalation loopback (loopback_count=1). With budget 1, the retry hits the exhausted
  // branch before the debate runs, and the message must name the stranded escalation.
  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N6,
    node_inputs: { [N6]: { debate: N6_DEBATE_INPUT } },
    loopback_budget_per_node: 1,
  });
  assert.equal(report.halt.reason, 'loopback_budget_exhausted');
  assert.equal(report.halt.node_id, N6);
  assert.match(report.halt.message, /the pending n6_debate_escalation cannot run/);
  assert.equal(n6DivergentDebateRuntime.calls.length, 0, 'the debate must not run once the budget is exhausted');
});

test('debate and draft_payload supplied together are rejected before any harness call', async () => {
  const { coordinator } = await driveToN6Escalation();
  await assert.rejects(
    coordinator.advanceUntilBlocked({
      workflow_run_id: RUN,
      retry_node_id: N6,
      node_inputs: { [N6]: { debate: N6_DEBATE_INPUT, draft_payload: { candidates: ['c'] } } },
    }),
    /at most one of draft_payload, execution_spec, or debate/,
  );
});

test('debate supplied at a node that is not a debate frontier halts debate_not_applicable', async () => {
  // N4 is model-like but never a debate frontier; supplying `debate` there is a misuse.
  const { harness, coordinator } = makeSubject();
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  harness.on(N2, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N2ToN3Handoff' });
  harness.on(N3, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N3ToN4Handoff' });
  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N2, node_attempt_id: 'node_attempt_n2_human' });
  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    node_inputs: { [N4]: { debate: N6_DEBATE_INPUT } },
  });
  assert.equal(report.halt.reason, 'debate_not_applicable');
  assert.equal(report.halt.node_id, N4);
  assert.match(report.halt.message, /not at a debate frontier/);
});

test('N6 debate is idempotent: a re-advance after a harness rejection reuses the gate-draft, not a re-run', async () => {
  const { harness, coordinator, n6DivergentDebateRuntime } = await driveToN6Escalation();
  // First attempt: the debate runs + records its marker, then the harness rejects (no trace lands).
  harness.failNextNodes.add(N6);
  await assert.rejects(
    coordinator.advanceUntilBlocked({
      workflow_run_id: RUN,
      retry_node_id: N6,
      node_inputs: { [N6]: { debate: N6_DEBATE_INPUT } },
    }),
    /stub harness rejected/,
  );
  assert.equal(n6DivergentDebateRuntime.calls.length, 1, 'debate ran once before the rejection');

  // Re-advance on the SAME attempt id (no trace landed ⇒ attempt_count unchanged): the recorded
  // gate-draft marker is reused, so the debate is NOT re-run (no duplicate role/context/audit rows).
  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N6,
    node_inputs: { [N6]: { debate: N6_DEBATE_INPUT } },
    max_steps: 1,
  });
  assert.equal(report.steps[0]!.node_id, N6);
  assert.equal(n6DivergentDebateRuntime.calls.length, 1, 'debate was reused, not re-run');
});

test('N8 bounded debate: after the N8->N7 round-trip, the coordinator runs runDebate on the N8 re-entry', async () => {
  const { harness, coordinator, n8BoundedDebateRuntime } = await driveToN8DebateLoopback();
  // N8 re-entry (pass 2) admits once the debate's gate-draft is attached.
  harness.script.set(N8, [{ gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N8ToN9Handoff' }]);

  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N7,
    node_inputs: {
      [N7]: { draft_payload: { ...DEBATE_ADMISSION_SUPPORT } }, // feedback re-entry support (pass-2 admission level)
      [N8]: { debate: N8_DEBATE_INPUT }, // bounded debate drives the pass-2 draft
    },
    max_steps: 2, // N7 feedback re-entry, then the debate-driven N8 re-invocation
  });

  // N7 feedback re-entry ran, then the bounded debate produced the N8 pass-2 draft.
  assert.deepEqual(report.steps.map((step) => step.node_id), [N7, N8]);
  assert.equal(n8BoundedDebateRuntime.calls.length, 1, 'the bounded debate ran exactly once on the N8 re-entry');
  assert.equal(n8BoundedDebateRuntime.calls[0]!.execution_mode, 'mocked_llm');
  const n8Requests = harness.invocations.filter((request) => request.node_id === N8);
  const attached = n8Requests[n8Requests.length - 1]!.semantic_artifacts?.[0];
  assert.equal(attached?.slot_id, 'n8_value_assessment_draft');
  assert.equal(attached?.runtime_provenance_class, 'runtime_verified');
});

test('N8 first pass never runs the bounded debate (it runs only after the N7 round-trip)', async () => {
  // On the N8 FIRST pass the harness re-arms the N8->N7 loopback regardless, so the coordinator must
  // not waste a debate there: supplying `debate` on the first pass is a misuse, not a frontier.
  const { coordinator, n8BoundedDebateRuntime } = await driveToN8DebateLoopback();
  // driveToN8DebateLoopback already left N8 at its first-pass loopback (not a post-N7 re-entry).
  // Re-invoking the SOURCE N8 with `debate` is not a bounded-debate frontier — it halts for input.
  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N8,
    node_inputs: { [N8]: { debate: N8_DEBATE_INPUT } },
  });
  assert.equal(report.halt.reason, 'debate_not_applicable');
  assert.match(report.halt.message, /not at a debate frontier/);
  assert.equal(n8BoundedDebateRuntime.calls.length, 0);
});

/** Drive N1..N5, then an N6 gate-failure WITHOUT triage — the real harness defaults this loopback to
 *  `n6_regenerate_candidates` and records the gate-failure retry projection for it (harness :3114-3126).
 *  The stub does not, so the projection is recorded manually (mirrors driveToN6Escalation). */
async function driveToN6RegenerateFailure(): Promise<ReturnType<typeof makeSubject>> {
  const subject = makeSubject();
  const { harness, coordinator, controlPlane } = subject;
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  harness.on(N2, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N2ToN3Handoff' });
  harness.on(N3, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N3ToN4Handoff' });
  harness.on(N4, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N4ToN5Handoff' });
  harness.on(N5, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N5ToN6Handoff' });
  let n6Calls = 0;
  harness.route(N6, () => {
    n6Calls += 1;
    return n6Calls === 1
      ? { gate_status: 'blocked', route_decision: 'loopback' }
      : { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N6ToN7Handoff' };
  });

  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N2, node_attempt_id: 'node_attempt_n2_human' });
  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, node_inputs: { [N4]: { draft_payload: { slice: 'opt' } } } });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N5, node_attempt_id: 'node_attempt_n5_human' });
  const blocked = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    node_inputs: { [N6]: { draft_payload: { candidates: [] } } },
  });
  assert.equal(blocked.halt.reason, 'harness_loopback');
  assert.equal(blocked.halt.node_id, N6);
  await controlPlane.recordArtifactRef({
    artifact_kind: 'diagnostic',
    workflow_run_id: RUN,
    payload: { projection_kind: 'v1b_n6_gate_failure_retry_context', loopback_target_code: 'n6_regenerate_candidates' },
  });
  return subject;
}

// D-T128-01 (A): the single-agent regeneration re-entry threads the regenerate-route projection
// presence-based (the debate route already threads its own explicitly). Without this the runtime's
// regeneration_after_n6_gate_failure mode structurally blocks — the residual "soft dead end".
test('single-agent N6 regeneration re-entry threads the regenerate-route gate-failure projection', async () => {
  const { harness, coordinator, controlPlane } = await driveToN6RegenerateFailure();

  await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N6,
    node_inputs: { [N6]: { draft_payload: { candidates: ['regenerated'] } } },
    max_steps: 1,
  });

  const n6Requests = harness.invocations.filter((request) => request.node_id === N6);
  assert.equal(n6Requests.length, 2, 'gate-failure attempt + regeneration re-entry');
  const artifacts = await controlPlane.listArtifactRefsByWorkflowRunId(RUN);
  const projection = artifacts.find((artifact) =>
    (artifact.payload as Record<string, unknown> | null)?.projection_kind === 'v1b_n6_gate_failure_retry_context');
  assert.ok(projection, 'the regenerate-route projection is recorded');
  const retryRefs = n6Requests[1]!.frozen_input.source_refs;
  assert.ok(
    retryRefs.some((item) => item.ref_type === 'artifact_ref' && item.ref_id === projection!.artifact_ref_id),
    'the re-entry frozen_input.source_refs carries the projection artifact ref',
  );
  // The FIRST N6 entry predates the projection — presence-based threading attached nothing then.
  assert.ok(
    !n6Requests[0]!.frozen_input.source_refs.some((item) => item.ref_id === projection!.artifact_ref_id),
    'the first entry is untouched (byte-identical no-op)',
  );
});

// D-T128-01 (B) blocked-then-retry: with BOTH routes' projections present plus an older regenerate one,
// the single-agent re-entry picks the discriminated (regenerate) MOST-RECENT projection — never the
// escalation-route one, never a stale one. Twin of the escalation-side discriminator test above.
test('single-agent N6 re-entry pins the most-recent regenerate-route projection (never the escalation one)', async () => {
  const { harness, coordinator, controlPlane } = await driveToN6RegenerateFailure();
  await controlPlane.recordArtifactRef({
    artifact_kind: 'diagnostic',
    workflow_run_id: RUN,
    payload: { projection_kind: 'v1b_n6_gate_failure_retry_context', loopback_target_code: 'n6_debate_escalation' },
  });
  const newest = await controlPlane.recordArtifactRef({
    artifact_kind: 'diagnostic',
    workflow_run_id: RUN,
    payload: {
      projection_kind: 'v1b_n6_gate_failure_retry_context',
      loopback_target_code: 'n6_regenerate_candidates',
      retry_round: 2,
    },
  });

  await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N6,
    node_inputs: { [N6]: { draft_payload: { candidates: ['regenerated'] } } },
    max_steps: 1,
  });

  const retry = harness.invocations.filter((request) => request.node_id === N6).at(-1)!;
  const artifacts = await controlPlane.listArtifactRefsByWorkflowRunId(RUN);
  const escalation = artifacts.find((artifact) => {
    const payload = artifact.payload as Record<string, unknown> | null;
    return payload?.projection_kind === 'v1b_n6_gate_failure_retry_context'
      && payload?.loopback_target_code === 'n6_debate_escalation';
  });
  assert.ok(
    retry.frozen_input.source_refs.some((item) => item.ref_id === newest.artifact_ref_id),
    'threads the most-recent regenerate-route projection',
  );
  assert.ok(
    !retry.frozen_input.source_refs.some((item) => item.ref_id === escalation!.artifact_ref_id),
    'the escalation-route projection is never mis-attached to the single-agent re-entry',
  );
});

// D-T128-01 (B) crash-mid-debate: the debate runtime dies BEFORE completing (no gate-draft marker
// recorded), so the re-advance must re-run the debate cleanly — nothing stale is admitted, and exactly
// one marker exists afterwards. Complements the existing 'reuses the gate-draft' test, which covers the
// completed-debate -> harness-rejection window.
test('N6 debate crash mid-debate re-runs cleanly on re-advance (no marker, no stale admit)', async () => {
  const { harness, coordinator, controlPlane, n6DivergentDebateRuntime } = await driveToN6Escalation();

  n6DivergentDebateRuntime.throwError = new Error('synthetic mid-debate crash');
  await assert.rejects(
    coordinator.advanceUntilBlocked({
      workflow_run_id: RUN,
      retry_node_id: N6,
      node_inputs: { [N6]: { debate: N6_DEBATE_INPUT } },
    }),
    /synthetic mid-debate crash/,
  );
  assert.equal(n6DivergentDebateRuntime.calls.length, 1, 'debate attempted once before the crash');
  const markersAfterCrash = (await controlPlane.listArtifactRefsByWorkflowRunId(RUN)).filter((artifact) =>
    (artifact.payload as Record<string, unknown> | null)?.marker === 'v1b_run_coordinator_debate_gate_draft@v1');
  assert.equal(markersAfterCrash.length, 0, 'no gate-draft marker lands for an incomplete debate');

  n6DivergentDebateRuntime.throwError = null;
  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N6,
    node_inputs: { [N6]: { debate: N6_DEBATE_INPUT } },
    max_steps: 1,
  });
  assert.equal(report.steps[0]!.node_id, N6);
  assert.equal(n6DivergentDebateRuntime.calls.length, 2, 'the re-advance re-runs the debate from scratch');
  const markers = (await controlPlane.listArtifactRefsByWorkflowRunId(RUN)).filter((artifact) =>
    (artifact.payload as Record<string, unknown> | null)?.marker === 'v1b_run_coordinator_debate_gate_draft@v1');
  assert.equal(markers.length, 1, 'exactly one marker after the clean re-run');
  const lastN6 = harness.invocations.filter((request) => request.node_id === N6).at(-1)!;
  const attached = lastN6.semantic_artifacts?.[0];
  const markerDraft = (markers[0]!.payload as Record<string, unknown>).gate_draft_semantic_artifact as {
    support_artifact_ref: { ref_id: string };
  };
  assert.equal(
    attached?.support_artifact_ref.ref_id,
    markerDraft.support_artifact_ref.ref_id,
    'the fresh debate draft (not anything stale) is what got attached and admitted',
  );
});

// Review fix (2026-07-03 adversarial pass): the regenerate threading must be PENDING-aware. After an
// N5 slice-rollback re-drive, the next N6 entry is a FRESH forward pass — auto-attaching the stale
// regenerate projection would dead-end both draft variants (prompt-identity / lineage-hash drift).
test('a fresh N6 entry after an N5 re-drive does NOT attach the stale regenerate projection', async () => {
  const { harness, coordinator, controlPlane } = await driveToN6RegenerateFailure();

  // Operator re-drives N5 (the slice-rollback path): N5 re-admits AFTER the N6 loopback.
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N5, node_attempt_id: 'node_attempt_n5_redrive' });

  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    node_inputs: { [N6]: { draft_payload: { candidates: ['fresh-after-rollback'] } } },
    max_steps: 1,
  });
  assert.equal(report.steps[0]!.node_id, N6);

  const artifacts = await controlPlane.listArtifactRefsByWorkflowRunId(RUN);
  const projection = artifacts.find((artifact) =>
    (artifact.payload as Record<string, unknown> | null)?.projection_kind === 'v1b_n6_gate_failure_retry_context');
  assert.ok(projection, 'the stale projection still exists on the run');
  const freshN6 = harness.invocations.filter((request) => request.node_id === N6).at(-1)!;
  assert.ok(
    !freshN6.frozen_input.source_refs.some((item) => item.ref_id === projection!.artifact_ref_id),
    'the fresh forward N6 entry must not carry the stale regenerate projection',
  );
});

// --- T-128 W-15: provisional sign-off gate (O-1 / D1c) + loopback budget raise (O-2) -----------

function runOverrideSignOffPayload(nodeId: string, attemptId: string, warningCode: string): Record<string, unknown> {
  return {
    schema_version: 'TopicSelectionStakeholderSignOff@v1',
    sign_off_id: `sign_off_${attemptId}`,
    sign_off_scope: 'provisional_threshold_run_override',
    gate_warning_code: warningCode,
    signed_by: { actor_type: 'human', actor_id: 'operator_alice' },
    signed_at: '2026-07-03T12:00:00.000Z',
    rationale: 'Acknowledged: proceeding under provisional thresholds.',
    workflow_run_id: RUN,
    node_id: nodeId,
    node_attempt_id: attemptId,
  };
}

/** Drive N1..N8 where N8 ADMITS carrying the provisional-thresholds tripwire warning. */
async function driveToWarnedN8(warned = true): Promise<ReturnType<typeof makeSubject>> {
  const subject = makeSubject();
  const { harness, coordinator, controlPlane } = subject;
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  harness.on(N2, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N2ToN3Handoff' });
  harness.on(N3, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N3ToN4Handoff' });
  harness.on(N4, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N4ToN5Handoff' });
  harness.on(N5, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N5ToN6Handoff' });
  harness.on(N6, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N6ToN7Handoff' });
  harness.on(N7, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N7ToN8Handoff' });
  harness.on(N8, {
    gate_status: 'admitted',
    route_decision: 'invoke_next',
    handoff_kind_for_test: 'N8ToN9Handoff',
    ...(warned
      ? { warnings: [{ code: 'N8_DEBATE_THRESHOLDS_PROVISIONAL', message: 'provisional thresholds', severity: 'warning' }] }
      : {}),
  });
  harness.on(N9, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N9ToN10Handoff' });
  // The N8 recipe requires N7's n7->n8 context projection (required_projection_kind) — the real
  // N7 runner records it; simulate that so the N8 request can be assembled.
  await controlPlane.recordArtifactRef({
    artifact_kind: 'diagnostic',
    workflow_run_id: RUN,
    payload: { projection_kind: 'v1b_n7_to_n8_topic_question_contract_context' },
  });

  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N2, node_attempt_id: 'node_attempt_n2_human' });
  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, node_inputs: { [N4]: { draft_payload: { slice: 'opt' } } } });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N5, node_attempt_id: 'node_attempt_n5_human' });
  const toN8 = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    max_steps: 3,
    node_inputs: { [N6]: { draft_payload: { candidates: ['c'] } }, [N8]: { draft_payload: { total_score: 82 } } },
  });
  assert.deepEqual(toN8.steps.map((step) => step.node_id), [N6, N7, N8]);
  return subject;
}

test('D-30: a provisional-warned N8 no longer halts the product advance (W-15 D1(c) retired)', async () => {
  // The warning here models a HISTORICAL run recorded before D-30 (the harness no longer emits
  // it). Advisory thresholds require no sign-off, so the product advance proceeds straight to N9.
  const { coordinator } = await driveToWarnedN8();
  const report = await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, run_mode: 'product', max_steps: 1 });
  assert.notEqual(report.halt.reason, 'sign_off_required');
  assert.deepEqual(report.steps.map((step) => step.node_id), [N9], 'the warned run proceeds into N9 unimpeded');
});

test('W-15 D1(c): a recorded sign-off unlocks the product advance (and is idempotent)', async () => {
  const { coordinator } = await driveToWarnedN8();
  const state = await coordinator.getRunState(RUN);
  const attemptId = state.nodes.find((node) => node.node_id === N8)!.latest_admitted!.node_attempt_id;

  const first = await coordinator.recordProvisionalRunOverrideSignOff({
    workflow_run_id: RUN,
    payload: runOverrideSignOffPayload(N8, attemptId, 'N8_DEBATE_THRESHOLDS_PROVISIONAL'),
  });
  assert.equal(first.already_recorded, false);
  const second = await coordinator.recordProvisionalRunOverrideSignOff({
    workflow_run_id: RUN,
    payload: runOverrideSignOffPayload(N8, attemptId, 'N8_DEBATE_THRESHOLDS_PROVISIONAL'),
  });
  assert.equal(second.already_recorded, true);
  assert.equal(second.artifact_ref_id, first.artifact_ref_id, 'idempotent re-record returns the same artifact');

  const report = await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, run_mode: 'product', max_steps: 1 });
  assert.notEqual(report.halt.reason, 'sign_off_required');
  assert.deepEqual(report.steps.map((step) => step.node_id), [N9], 'the signed run proceeds into N9');
});

test('D-30: no advance shape (warned/unwarned, modeless/product) ever halts sign_off_required', async () => {
  const warned = await driveToWarnedN8();
  const modeless = await warned.coordinator.advanceUntilBlocked({ workflow_run_id: RUN, max_steps: 1 });
  assert.notEqual(modeless.halt.reason, 'sign_off_required');
  assert.deepEqual(modeless.steps.map((step) => step.node_id), [N9]);

  const unwarned = await driveToWarnedN8(false);
  const product = await unwarned.coordinator.advanceUntilBlocked({ workflow_run_id: RUN, run_mode: 'product', max_steps: 1 });
  assert.notEqual(product.halt.reason, 'sign_off_required');
  assert.deepEqual(product.steps.map((step) => step.node_id), [N9]);
});

test('W-15 O-1: sign-off recording validates strictly and pins the latest admitted attempt', async () => {
  const { coordinator } = await driveToWarnedN8();
  const state = await coordinator.getRunState(RUN);
  const attemptId = state.nodes.find((node) => node.node_id === N8)!.latest_admitted!.node_attempt_id;

  // Unknown extra key -> strict Ajv reject (route-level stripping never reaches here).
  await assert.rejects(
    coordinator.recordProvisionalRunOverrideSignOff({
      workflow_run_id: RUN,
      payload: { ...runOverrideSignOffPayload(N8, attemptId, 'N8_DEBATE_THRESHOLDS_PROVISIONAL'), flips_provisional: true },
    }),
    /does not match/,
  );
  // Run mismatch.
  await assert.rejects(
    coordinator.recordProvisionalRunOverrideSignOff({
      workflow_run_id: 'workflow_run_other',
      payload: runOverrideSignOffPayload(N8, attemptId, 'N8_DEBATE_THRESHOLDS_PROVISIONAL'),
    }),
    /does not match the route run/,
  );
  // Non-gate node.
  await assert.rejects(
    coordinator.recordProvisionalRunOverrideSignOff({
      workflow_run_id: RUN,
      payload: runOverrideSignOffPayload(N7, attemptId, 'N8_DEBATE_THRESHOLDS_PROVISIONAL'),
    }),
    /not a provisional product gate/,
  );
  // Stale/foreign attempt id.
  await assert.rejects(
    coordinator.recordProvisionalRunOverrideSignOff({
      workflow_run_id: RUN,
      payload: runOverrideSignOffPayload(N8, 'node_attempt_stale', 'N8_DEBATE_THRESHOLDS_PROVISIONAL'),
    }),
    /not the run's provisional-tripwire attempt/,
  );
});

test('W-15 O-1: signing a run whose node never tripwired is rejected', async () => {
  const { coordinator } = await driveToWarnedN8(false);
  const state = await coordinator.getRunState(RUN);
  const attemptId = state.nodes.find((node) => node.node_id === N8)!.latest_admitted!.node_attempt_id;
  await assert.rejects(
    coordinator.recordProvisionalRunOverrideSignOff({
      workflow_run_id: RUN,
      payload: runOverrideSignOffPayload(N8, attemptId, 'N8_DEBATE_THRESHOLDS_PROVISIONAL'),
    }),
    /no provisional-tripwire attempt/,
  );
});

test('W-15 O-2: an audited budget raise lifts the exhausted halt (and the halt names the raise route)', async () => {
  const { harness, coordinator } = makeSubject();
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  harness.on(N2, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N2ToN3Handoff' });
  harness.on(N3, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N3ToN4Handoff' });
  harness.on(N4, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N4ToN5Handoff' });
  harness.on(N5, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N5ToN6Handoff' });
  harness.route(N6, () => ({ gate_status: 'blocked', route_decision: 'loopback' }));

  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N2, node_attempt_id: 'node_attempt_n2_human' });
  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, node_inputs: { [N4]: { draft_payload: { slice: 'opt' } } } });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N5, node_attempt_id: 'node_attempt_n5_human' });
  // Two blocked loopback attempts consume the default budget of 2.
  const first = await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, node_inputs: { [N6]: { draft_payload: { candidates: [] } } } });
  assert.equal(first.halt.reason, 'harness_loopback');
  const second = await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, retry_node_id: N6, node_inputs: { [N6]: { draft_payload: { candidates: [] } } } });
  assert.equal(second.halt.reason, 'harness_loopback');

  const exhausted = await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, retry_node_id: N6, node_inputs: { [N6]: { draft_payload: { candidates: [] } } } });
  assert.equal(exhausted.halt.reason, 'loopback_budget_exhausted');
  assert.match(exhausted.halt.message, /loopback-budget-raises/);

  await coordinator.recordLoopbackBudgetRaise({
    workflow_run_id: RUN,
    payload: {
      schema_version: 'TopicSelectionLoopbackBudgetRaise@v1',
      raise_id: 'raise_n6_1',
      workflow_run_id: RUN,
      node_id: N6,
      raised_to: 3,
      rationale: 'One more regeneration round is warranted.',
      raised_by: { actor_type: 'human', actor_id: 'operator_alice' },
      raised_at: '2026-07-03T12:30:00.000Z',
    },
  });
  const afterRaise = await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, retry_node_id: N6, node_inputs: { [N6]: { draft_payload: { candidates: [] } } } });
  assert.equal(afterRaise.halt.reason, 'harness_loopback', 'the raised budget admits a third loopback attempt');
});

test('W-15 O-2: budget-raise recording rejects over-cap, foreign-node, and mismatched-run payloads', async () => {
  const { coordinator } = await driveToN6RegenerateFailure();
  const base = {
    schema_version: 'TopicSelectionLoopbackBudgetRaise@v1',
    raise_id: 'raise_x',
    workflow_run_id: RUN,
    node_id: N6,
    raised_to: 3,
    rationale: 'r',
    raised_by: { actor_type: 'human', actor_id: 'op' },
    raised_at: '2026-07-03T12:30:00.000Z',
  };
  await assert.rejects(
    coordinator.recordLoopbackBudgetRaise({ workflow_run_id: RUN, payload: { ...base, raised_to: 6 } }),
    /does not match/,
  );
  await assert.rejects(
    coordinator.recordLoopbackBudgetRaise({ workflow_run_id: RUN, payload: { ...base, node_id: 'not.a.v1b.node' } }),
    /not a v1b node/,
  );
  await assert.rejects(
    coordinator.recordLoopbackBudgetRaise({ workflow_run_id: 'workflow_run_other', payload: base }),
    /does not match the route run/,
  );
});

// Review-fix regression (the A-DEFECT): the N6 tripwire rides the escalation-LOOPBACK attempt —
// the post-debate ADMITTED N6 attempt is clean. The gate must anchor to the loopback attempt and
// the sign-off must be recordable against it (previously: gate never fired, sign-off 409'd).
test('D-30 N6 arm: the escalation-loopback tripwire no longer gates; sign-off recording stays loopback-anchored', async () => {
  const { harness, coordinator } = makeSubject();
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  harness.on(N2, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N2ToN3Handoff' });
  harness.on(N3, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N3ToN4Handoff' });
  harness.on(N4, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N4ToN5Handoff' });
  harness.on(N5, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N5ToN6Handoff' });
  let n6Calls = 0;
  harness.route(N6, () => {
    n6Calls += 1;
    return n6Calls === 1
      // The real harness attaches the tripwire (product-gated) to the escalation loopback attempt.
      ? {
        gate_status: 'blocked',
        route_decision: 'loopback',
        warnings: [
          { code: 'N6_DEBATE_THRESHOLDS_PROVISIONAL', message: 'provisional escalation thresholds', severity: 'warning' },
          { code: 'N6_DEBATE_ESCALATION_RECOMMENDED', message: 'debate escalation recommended', severity: 'warning' },
        ],
      }
      // Post-debate re-entry admits CLEAN — no tripwire on the admitted attempt.
      : { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N6ToN7Handoff' };
  });
  harness.on(N7, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N7ToN8Handoff' });

  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N2, node_attempt_id: 'node_attempt_n2_human' });
  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, node_inputs: { [N4]: { draft_payload: { slice: 'opt' } } } });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N5, node_attempt_id: 'node_attempt_n5_human' });
  const loopback = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    run_mode: 'product',
    node_inputs: { [N6]: { draft_payload: { candidates: [] } } },
  });
  assert.equal(loopback.halt.reason, 'harness_loopback');
  const tripwireAttemptId = (await coordinator.getRunState(RUN))
    .nodes.find((node) => node.node_id === N6)!.latest_provisional_tripwire!.node_attempt_id;

  // D-30: the loopback-anchored tripwire (historical shape) no longer gates the post-debate
  // advance — the clean re-admit proceeds straight into N7 with no sign-off.
  const admitted = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    retry_node_id: N6,
    run_mode: 'product',
    node_inputs: { [N6]: { draft_payload: { candidates: ['post-debate'] } } },
    max_steps: 2,
  });
  assert.deepEqual(admitted.steps.map((step) => step.node_id), [N6, N7]);
  assert.notEqual(admitted.halt.reason, 'sign_off_required');

  // Recording a sign-off remains legal and stays anchored to the tripwire (loopback) attempt —
  // the admitted attempt is still rejected (recording-path validation preserved).
  const admittedAttemptId = (await coordinator.getRunState(RUN))
    .nodes.find((node) => node.node_id === N6)!.latest_admitted!.node_attempt_id;
  assert.notEqual(admittedAttemptId, tripwireAttemptId);
  await assert.rejects(
    coordinator.recordProvisionalRunOverrideSignOff({
      workflow_run_id: RUN,
      payload: runOverrideSignOffPayload(N6, admittedAttemptId, 'N6_DEBATE_THRESHOLDS_PROVISIONAL'),
    }),
    /not the run's provisional-tripwire attempt/,
  );
  const recorded = await coordinator.recordProvisionalRunOverrideSignOff({
    workflow_run_id: RUN,
    payload: runOverrideSignOffPayload(N6, tripwireAttemptId, 'N6_DEBATE_THRESHOLDS_PROVISIONAL'),
  });
  assert.equal(recorded.already_recorded, false);
});

// D-30 regression: the same product advance that admits a warned N8 keeps going — no mid-advance
// sign-off halt interrupts it any more.
test('D-30: a warned N8 admit no longer interrupts the same advance', async () => {
  const subject = makeSubject();
  const { harness, coordinator, controlPlane } = subject;
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  harness.on(N2, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N2ToN3Handoff' });
  harness.on(N3, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N3ToN4Handoff' });
  harness.on(N4, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N4ToN5Handoff' });
  harness.on(N5, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N5ToN6Handoff' });
  harness.on(N6, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N6ToN7Handoff' });
  harness.on(N7, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N7ToN8Handoff' });
  harness.on(N8, {
    gate_status: 'admitted',
    route_decision: 'invoke_next',
    handoff_kind_for_test: 'N8ToN9Handoff',
    warnings: [{ code: 'N8_DEBATE_THRESHOLDS_PROVISIONAL', message: 'provisional thresholds', severity: 'warning' }],
  });
  await controlPlane.recordArtifactRef({
    artifact_kind: 'diagnostic',
    workflow_run_id: RUN,
    payload: { projection_kind: 'v1b_n7_to_n8_topic_question_contract_context' },
  });

  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N2, node_attempt_id: 'node_attempt_n2_human' });
  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, node_inputs: { [N4]: { draft_payload: { slice: 'opt' } } } });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N5, node_attempt_id: 'node_attempt_n5_human' });
  const report = await coordinator.advanceUntilBlocked({
    workflow_run_id: RUN,
    run_mode: 'product',
    max_steps: 3,
    node_inputs: { [N6]: { draft_payload: { candidates: ['c'] } }, [N8]: { draft_payload: { total_score: 82 } } },
  });
  assert.deepEqual(report.steps.map((step) => step.node_id), [N6, N7, N8], 'the warned N8 step itself completes');
  assert.notEqual(report.halt.reason, 'sign_off_required', 'no mid-advance sign-off halt survives D-30');
});

test('W-15 O-2: multiple raises take the max (not the most recent)', async () => {
  const { harness, coordinator } = makeSubject();
  harness.on(N1, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N1ToN2Handoff' });
  harness.on(N2, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N2ToN3Handoff' });
  harness.on(N3, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N3ToN4Handoff' });
  harness.on(N4, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N4ToN5Handoff' });
  harness.on(N5, { gate_status: 'admitted', route_decision: 'invoke_next', handoff_kind_for_test: 'N5ToN6Handoff' });
  harness.route(N6, () => ({ gate_status: 'blocked', route_decision: 'loopback' }));

  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, bootstrap_request: bootstrapRequest() });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N2, node_attempt_id: 'node_attempt_n2_human' });
  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, node_inputs: { [N4]: { draft_payload: { slice: 'opt' } } } });
  await harness.invokeNode({ ...bootstrapRequest(), node_id: N5, node_attempt_id: 'node_attempt_n5_human' });
  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, node_inputs: { [N6]: { draft_payload: { candidates: [] } } } });
  await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, retry_node_id: N6, node_inputs: { [N6]: { draft_payload: { candidates: [] } } } });

  const raise = (id: string, to: number) => coordinator.recordLoopbackBudgetRaise({
    workflow_run_id: RUN,
    payload: {
      schema_version: 'TopicSelectionLoopbackBudgetRaise@v1',
      raise_id: id,
      workflow_run_id: RUN,
      node_id: N6,
      raised_to: to,
      rationale: 'r',
      raised_by: { actor_type: 'human', actor_id: 'op' },
      raised_at: '2026-07-03T12:30:00.000Z',
    },
  });
  // A higher raise followed by a LOWER one: max-of-all wins (a later record cannot lower).
  await raise('raise_hi', 4);
  await raise('raise_lo', 3);

  // Budget 4 admits loopbacks #3 and #4, then exhausts at 4.
  const third = await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, retry_node_id: N6, node_inputs: { [N6]: { draft_payload: { candidates: [] } } } });
  assert.equal(third.halt.reason, 'harness_loopback');
  const fourth = await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, retry_node_id: N6, node_inputs: { [N6]: { draft_payload: { candidates: [] } } } });
  assert.equal(fourth.halt.reason, 'harness_loopback');
  const exhausted = await coordinator.advanceUntilBlocked({ workflow_run_id: RUN, retry_node_id: N6, node_inputs: { [N6]: { draft_payload: { candidates: [] } } } });
  assert.equal(exhausted.halt.reason, 'loopback_budget_exhausted');
  assert.match(exhausted.halt.message, /budget \(4\)/);
});
