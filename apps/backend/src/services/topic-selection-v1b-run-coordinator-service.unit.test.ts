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
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';

import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import { TopicSelectionV1bRunCoordinatorService } from './topic-selection-v1b-run-coordinator-service.js';

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
  private readonly hangWaiters = new Map<string, Array<() => void>>();

  constructor(private readonly controlPlane: StubControlPlane) {}

  on(nodeId: string, result: ScriptedResult): void {
    const queue = this.script.get(nodeId) ?? [];
    queue.push(result);
    this.script.set(nodeId, queue);
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
    if (this.hangNodes.has(request.node_id)) {
      await new Promise<void>((resolve) => {
        const waiters = this.hangWaiters.get(request.node_id) ?? [];
        waiters.push(resolve);
        this.hangWaiters.set(request.node_id, waiters);
      });
    }
    this.invocations.push(request);
    const queue = this.script.get(request.node_id) ?? [];
    const scripted = queue.length > 1 ? queue.shift()! : queue[0];
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

function makeSubject() {
  const controlPlane = new StubControlPlane();
  const harness = new StubHarness(controlPlane);
  const coordinator = new TopicSelectionV1bRunCoordinatorService({
    harness,
    controlPlane: controlPlane as never,
  });
  return { controlPlane, harness, coordinator };
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
    /not both/,
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
  feedbackRef: TopicSelectionFunctionalRef;
  feedbackPayloadHash: string;
  feedbackRecordHash: string;
}> {
  const { harness, coordinator, controlPlane } = makeSubject();
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

  return { harness, coordinator, controlPlane, feedbackRef, feedbackPayloadHash, feedbackRecordHash };
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
