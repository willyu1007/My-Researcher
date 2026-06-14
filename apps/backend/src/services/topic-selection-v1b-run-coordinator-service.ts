import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionAgentExecutionSpec,
  TopicSelectionAgentRunMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_TRACE_PAYLOAD_SCHEMA_VERSION,
  type TopicSelectionV1bWorkflowHarnessNodeId,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
  type TopicSelectionV1bWorkflowHarnessRunResult,
  type TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  type TopicSelectionV1bWorkflowHarnessTracePayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';

import { AppError } from '../errors/app-error.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import type { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';

// T-123 Phase 2 — thin Run Coordinator above the v1b WorkflowHarness (decision D1).
//
// The coordinator NEVER bypasses the harness: every node runs through
// harness.invokeNode, which keeps frozen-input validation, replay identity, gates,
// and authority boundaries exactly as they are. The coordinator only:
//   - rebuilds run-level state from persisted harness trace artifacts (read-side projection),
//   - assembles the next node's frozen_input from the previous node's handoff artifact
//     (contracts/snapshot kinds come from the node policies; the recipe table below only
//     carries per-node hash keys, lineage extras, and opt-ins the policies cannot express),
//   - enforces caller-facing budgets (max steps, per-node loopback budget, node/run timeouts),
//   - halts on human/delegated nodes (N2/N5) and on model-like nodes without caller input —
//     human steps continue through the existing human routes (which accept workflow_run_id,
//     so they join the same run timeline), then advance is called again.
//
// Concurrency (Phase 2.0 decision, recorded in 02-architecture):
// the harness has NO uniqueness guard on (workflow_run_id, node_id, node_attempt_id) —
// concurrent duplicate invocations would each execute and write duplicate authorities.
// Scheme B: the coordinator serializes advance() per workflow_run_id with an in-process
// mutex; same-run human-route writes share that mutex via runExclusive, and timed-out
// invocations still executing are tracked in inFlight so re-advancing cannot duplicate
// the attempt. Direct calls to the raw harness route remain the one unguarded path; a
// DB-level guard (scheme A) would touch the harness body and is deferred (D3).

const POLICY_VERSION = 'topic-selection-v1b-node-policy-v1';

type NodePolicy = (typeof TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES)[number];

const POLICY_BY_NODE_ID = new Map<string, NodePolicy>(
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES.map((policy) => [policy.node_id, policy]),
);

/** Nodes the coordinator must never drive automatically: humans own them (T-115 surfaces). */
const HUMAN_HALT_NODE_IDS = new Set<string>([
  'topic-selection.v1b.record-research-constraint-profile.v1',
  'topic-selection.v1b.select-research-slice.v1',
]);

/**
 * Per-node frozen-input assembly recipe for handoff-driven nodes (N3..N11).
 * input_contract / snapshot_kind / handoff kind come from the node policies (SSOT);
 * the table only carries what the policies cannot express: payload hash key names,
 * cross-level lineage extras, and per-node opt-ins.
 */
const HANDOFF_BUILDER_TABLE: Record<string, {
  handoff_hash_key: string;
  payload_extras?: Record<string, unknown>;
  /** Cross-level lineage hashes the node's frozen payload requires beyond the direct handoff. */
  extra_handoff_hashes?: Array<{ key: string; node_id: string }>;
  /** Upstream authorities to add to source_refs beyond the direct predecessor. */
  extra_authority_nodes?: string[];
  /** Upstream authority ref+hash pairs the frozen payload itself requires (hasOnlyKeys parsers). */
  extra_payload_authorities?: Array<{ ref_key: string; hash_key: string; node_id: string }>;
  /** Runtime-context projection artifact (recorded by the upstream node) to reference in source_refs. */
  required_projection_kind?: string;
  /**
   * Opt-in ONLY for nodes whose predecessor authority is documented to BE the required
   * snapshot persisted under a different ref_type (N6: N5's selection decision). The
   * harness snapshot-kind gate is a ref_type string match — a blanket retype would
   * silently nullify it for every node, masking real recipe wiring errors.
   */
  retype_authority_as_snapshot?: boolean;
  /**
   * Upstream feedback re-entry (T-123 DP-3.6). When this node is re-entered because a
   * downstream node looped back to it (the N8 -> N7 debate-trigger loopback), the
   * coordinator builds the SAME forward (initial) recipe but overrides input_mode and
   * threads the loopback's feedback artifact ref + record/payload hashes into the frozen
   * payload — matching the node's feedback_from_* parser — instead of the initial recipe.
   * The feedback ref + payload hash come from the loopback attempt's authority_ref /
   * authority_hash; the record hash is reproduced from the (immutable) feedback artifact
   * via the same canonicalHash the harness validates with.
   */
  feedback_reentry?: {
    loopback_source_node_id: string;
    input_mode: string;
    feedback_ref_key: string;
    feedback_record_hash_key: string;
    feedback_payload_hash_key: string;
  };
}> = {
  'topic-selection.v1b.assess-intake-readiness.v1': {
    handoff_hash_key: 'n2_handoff_hash',
  },
  'topic-selection.v1b.generate-research-slice-options.v1': {
    handoff_hash_key: 'n3_handoff_hash',
    extra_handoff_hashes: [
      { key: 'n2_handoff_hash', node_id: 'topic-selection.v1b.record-research-constraint-profile.v1' },
    ],
    extra_payload_authorities: [
      {
        ref_key: 'intake_snapshot_ref',
        hash_key: 'intake_snapshot_hash',
        node_id: 'topic-selection.v1b.create-intake-snapshot.v1',
      },
    ],
    extra_authority_nodes: [
      'topic-selection.v1b.create-intake-snapshot.v1',
      'topic-selection.v1b.record-research-constraint-profile.v1',
    ],
  },
  'topic-selection.v1b.generate-topic-question-candidates.v1': {
    handoff_hash_key: 'n5_handoff_hash',
    retype_authority_as_snapshot: true,
  },
  'topic-selection.v1b.materialize-topic-question-contract.v1': {
    handoff_hash_key: 'n6_handoff_hash',
    payload_extras: { input_mode: 'initial_from_n6' },
    feedback_reentry: {
      loopback_source_node_id: 'topic-selection.v1b.assess-topic-value.v1',
      input_mode: 'feedback_from_n8',
      feedback_ref_key: 'n8_feedback_ref',
      feedback_record_hash_key: 'n8_feedback_hash',
      feedback_payload_hash_key: 'n8_feedback_payload_hash',
    },
  },
  'topic-selection.v1b.assess-topic-value.v1': {
    handoff_hash_key: 'n7_handoff_hash',
    required_projection_kind: 'v1b_n7_to_n8_topic_question_contract_context',
  },
  'topic-selection.v1b.decide-value-disposition.v1': {
    handoff_hash_key: 'n8_handoff_hash',
  },
  'topic-selection.v1b.create-draft-topic-package.v1': {
    handoff_hash_key: 'n9_handoff_hash',
  },
  'topic-selection.v1b.publish-v1c-input-bundle.v1': {
    handoff_hash_key: 'n10_handoff_hash',
  },
};

// Coverage assertion: every policy node must be drivable — N1 via bootstrap_request,
// N2/N5 via human halt, the rest via recipe. N7 is contract-delegated but
// product-mechanical (T-115 / DP-0.5), so it is auto-driven here on purpose.
for (const policy of TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES) {
  if (policy.node_index === 1 || HUMAN_HALT_NODE_IDS.has(policy.node_id) || HANDOFF_BUILDER_TABLE[policy.node_id]) {
    continue;
  }
  throw new Error(`run coordinator does not cover node ${policy.node_id}; extend HANDOFF_BUILDER_TABLE or classify it.`);
}

export type TopicSelectionV1bRunCoordinatorHaltReason =
  | 'run_complete'
  | 'human_node'
  | 'model_input_required'
  | 'harness_blocked'
  | 'harness_wait'
  | 'harness_requires_human_review'
  | 'harness_retryable_failure'
  | 'harness_loopback'
  | 'loopback_budget_exhausted'
  | 'node_in_flight'
  | 'node_timeout'
  | 'run_timeout'
  | 'max_steps_reached'
  | 'no_frontier';

export type TopicSelectionV1bRunNodeAttemptSnapshot = {
  node_attempt_id: string;
  gate_status: string;
  route_decision: string;
  authority_ref: TopicSelectionFunctionalRef | null;
  handoff_ref: TopicSelectionFunctionalRef | null;
  trace_snapshot_ref: TopicSelectionFunctionalRef | null;
  authority_hash: string | null;
  handoff_hash: string | null;
  replayed: boolean;
  created_at: string;
  /** Trace ordinal within the run's artifact list — total event order (created_at can tie at ms precision). */
  seq: number;
  blockers: Array<{ code: string; message: string }>;
};

export type TopicSelectionV1bRunNodeState = {
  node_id: string;
  node_index: number;
  attempt_count: number;
  loopback_count: number;
  latest: TopicSelectionV1bRunNodeAttemptSnapshot | null;
  /**
   * Most recent admitted invoke_next/stop attempt — the lineage source for downstream
   * frozen-input assembly. Survives later blocked/drifted re-attempts on the same node
   * (latest alone would erase admitted lineage and poison prev-node selection).
   */
  latest_admitted: TopicSelectionV1bRunNodeAttemptSnapshot | null;
};

export type TopicSelectionV1bRunStateProjection = {
  workflow_run_id: string;
  nodes: TopicSelectionV1bRunNodeState[];
  last_completed_node_id: string | null;
  next_node_id: string | null;
  run_complete: boolean;
};

export type TopicSelectionV1bRunCoordinatorNodeInput = {
  execution_spec?: TopicSelectionAgentExecutionSpec | null;
  /**
   * Caller-supplied model draft for N4/N6/N8 (acceptance / codex-assisted operation).
   * The coordinator records the support/normalized/provenance artifacts and attaches the
   * semantic-artifact ref exactly like the acceptance suite does (fixture_replay class).
   * Mutually exclusive with execution_spec: the recorded artifact pins
   * execution_mode=codex_assisted, which would always mismatch a provider spec at admission.
   */
  draft_payload?: Record<string, unknown> | null;
};

export type AdvanceTopicSelectionV1bRunInput = {
  workflow_run_id: string;
  /**
   * Resume after a loopback/blocked halt: re-invoke this node (with fresh node_inputs).
   * The per-node loopback budget still applies — exceeding it halts with
   * loopback_budget_exhausted instead of invoking.
   */
  retry_node_id?: string | null;
  /** Required when the run has no traces yet; must target N1 (or the intended entry node). */
  bootstrap_request?: TopicSelectionV1bWorkflowHarnessRunRequest | null;
  node_inputs?: Record<string, TopicSelectionV1bRunCoordinatorNodeInput> | null;
  max_steps?: number;
  loopback_budget_per_node?: number;
  node_timeout_ms?: number;
  run_timeout_ms?: number;
  created_by?: 'llm' | 'human' | 'hybrid' | 'system';
  /**
   * Threaded into coordinator-built requests and recorded draft artifacts.
   * Defaults to 'acceptance'. Note: caller drafts are recorded as fixture_replay,
   * which the harness rejects under run_mode='product' — the product path requires a
   * dedicated human-curated provenance class (recorded decision, T-123 Phase 3/5).
   */
  run_mode?: TopicSelectionAgentRunMode | null;
};

export type TopicSelectionV1bRunAdvanceStep = {
  node_id: string;
  node_attempt_id: string;
  gate_status: string;
  route_decision: string;
  replayed: boolean;
};

export type TopicSelectionV1bRunAdvanceReport = {
  workflow_run_id: string;
  steps: TopicSelectionV1bRunAdvanceStep[];
  halt: {
    reason: TopicSelectionV1bRunCoordinatorHaltReason;
    node_id: string | null;
    message: string;
    blockers: Array<{ code: string; message: string }>;
  };
  run_state: TopicSelectionV1bRunStateProjection;
};

type TraceEntry = {
  node_id: string;
  node_attempt_id: string;
  created_at: string;
  /** Position in the run's artifact list — authoritative event order (created_at ties at ms). */
  seq: number;
  result: TopicSelectionV1bWorkflowHarnessRunResult;
};

type HarnessPort = {
  invokeNode(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult>;
};

type ControlPlanePort = Pick<
  TopicSelectionControlPlaneService,
  'listArtifactRefsByWorkflowRunId' | 'getArtifactRef' | 'recordArtifactRef'
>;

export class TopicSelectionV1bRunCoordinatorService {
  private readonly runLocks = new Map<string, Promise<unknown>>();

  /** Timed-out harness invocations still executing — re-invoking the same node before they
   * land would duplicate the attempt id (the harness has no uniqueness guard). */
  private readonly inFlight = new Map<string, { node_id: string; settled: Promise<void> }>();

  constructor(
    private readonly deps: {
      harness: HarnessPort;
      controlPlane: ControlPlanePort;
    },
  ) {}

  async getRunState(workflowRunId: string): Promise<TopicSelectionV1bRunStateProjection> {
    const traces = await this.loadTraces(workflowRunId);
    return this.project(workflowRunId, traces);
  }

  async advanceUntilBlocked(
    input: AdvanceTopicSelectionV1bRunInput,
  ): Promise<TopicSelectionV1bRunAdvanceReport> {
    return this.withRunLock(input.workflow_run_id, () => this.advanceLocked(input));
  }

  /**
   * Serialize any other same-run harness write (e.g. the N2/N5 human routes) with
   * advance — they share the per-run mutex, otherwise a human submission could
   * interleave with an in-progress advance on the same workflow run.
   */
  runExclusive<T>(workflowRunId: string, fn: () => Promise<T>): Promise<T> {
    return this.withRunLock(workflowRunId, fn);
  }

  // ---------------------------------------------------------------- advance core

  private async advanceLocked(
    input: AdvanceTopicSelectionV1bRunInput,
  ): Promise<TopicSelectionV1bRunAdvanceReport> {
    const maxSteps = input.max_steps ?? 12;
    const loopbackBudget = input.loopback_budget_per_node ?? 2;
    const nodeTimeoutMs = input.node_timeout_ms ?? 120_000;
    const runTimeoutMs = input.run_timeout_ms ?? 600_000;
    const startedAt = Date.now();
    const steps: TopicSelectionV1bRunAdvanceStep[] = [];

    // Halt sites that did not invoke anything since projecting pass the in-hand
    // projection; only post-invoke halts re-project (avoids a redundant full scan).
    const halt = async (
      reason: TopicSelectionV1bRunCoordinatorHaltReason,
      nodeId: string | null,
      message: string,
      blockers: Array<{ code: string; message: string }> = [],
      state?: TopicSelectionV1bRunStateProjection,
    ): Promise<TopicSelectionV1bRunAdvanceReport> => ({
      workflow_run_id: input.workflow_run_id,
      steps,
      halt: { reason, node_id: nodeId, message, blockers },
      run_state: state ?? await this.getRunState(input.workflow_run_id),
    });

    const inflight = this.inFlight.get(input.workflow_run_id);
    if (inflight) {
      return halt(
        'node_in_flight',
        inflight.node_id,
        `a previous invocation of ${inflight.node_id} timed out but is still executing; advance again after it settles (re-invoking now would duplicate the attempt).`,
      );
    }

    for (;;) {
      const projection = await this.getRunState(input.workflow_run_id);
      if (projection.run_complete) {
        return halt('run_complete', projection.last_completed_node_id, 'v1b chain is complete (stop_v1b_complete).', [], projection);
      }
      if (steps.length >= maxSteps) {
        return halt('max_steps_reached', null, `advance stopped after ${maxSteps} steps.`, [], projection);
      }
      if (Date.now() - startedAt > runTimeoutMs) {
        return halt('run_timeout', null, `advance exceeded run timeout of ${runTimeoutMs}ms.`, [], projection);
      }

      // Latest trace of the would-be frontier may be a non-advancing state — surface it,
      // unless the caller explicitly asked to retry that node (loopback resume).
      const pending = this.pendingHalt(projection);
      const retryRequested = input.retry_node_id ?? null;
      let retryNodeId: string | null = null;
      if (pending) {
        const retryable = pending.reason === 'harness_loopback'
          || pending.reason === 'harness_blocked'
          || pending.reason === 'harness_retryable_failure';
        // A loopback resumes two ways: re-invoke the SOURCE with a fresh draft, or — for an
        // upstream feedback loopback (N8 -> N7 debate trigger, DP-3.6) — RE-ENTER the loopback
        // target in its feedback input mode (buildNextRequest assembles that frozen input).
        const isRetryTarget = pending.node_id === retryRequested
          || (pending.loopback_target_node_id != null && pending.loopback_target_node_id === retryRequested);
        if (retryRequested && retryable && isRetryTarget && steps.length === 0) {
          retryNodeId = retryRequested;
        } else {
          return halt(pending.reason, pending.node_id, pending.message, pending.blockers, projection);
        }
      }

      const nextNodeId = retryNodeId ?? projection.next_node_id;
      if (!nextNodeId) {
        if (!input.bootstrap_request) {
          return halt('no_frontier', null, 'run has no traces and no bootstrap_request was provided.', [], projection);
        }
        if (input.bootstrap_request.workflow_run_id !== input.workflow_run_id) {
          throw new AppError(400, 'INVALID_PAYLOAD', 'bootstrap_request.workflow_run_id does not match the run.');
        }
        const result = await this.invokeWithTimeout(input.bootstrap_request, nodeTimeoutMs);
        if (result.kind === 'timeout') {
          return halt('node_timeout', input.bootstrap_request.node_id, result.message);
        }
        steps.push(this.step(result.value));
        continue;
      }

      const policy = POLICY_BY_NODE_ID.get(nextNodeId);
      if (!policy) {
        throw new AppError(500, 'INTERNAL_ERROR', `no node policy registered for ${nextNodeId}.`);
      }

      if (HUMAN_HALT_NODE_IDS.has(nextNodeId)) {
        return halt(
          'human_node',
          nextNodeId,
          `${nextNodeId} is a human/delegated decision point; continue via its human route (pass this workflow_run_id), then advance again.`,
          [],
          projection,
        );
      }

      const nodeState = projection.nodes.find((node) => node.node_id === nextNodeId);
      if ((nodeState?.loopback_count ?? 0) >= loopbackBudget) {
        return halt(
          'loopback_budget_exhausted',
          nextNodeId,
          `loopback budget (${loopbackBudget}) exhausted for ${nextNodeId} (LOOPBACK_BUDGET_EXHAUSTED).`,
          [],
          projection,
        );
      }

      const nodeInput = input.node_inputs?.[nextNodeId] ?? null;
      if (nodeInput?.draft_payload && nodeInput?.execution_spec) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `${nextNodeId}: provide either draft_payload or execution_spec, not both — the recorded draft pins execution_mode=codex_assisted, which always mismatches a provider execution_spec at admission.`,
        );
      }
      const isModelLike = policy.execution_kind === 'model_like';
      if (isModelLike && !nodeInput?.draft_payload && !nodeInput?.execution_spec) {
        return halt(
          'model_input_required',
          nextNodeId,
          `${nextNodeId} is model-like; supply node_inputs[...].draft_payload (caller-curated draft) or execution_spec (provider run) — auto-advance stays human-in-loop per D1.`,
          [],
          projection,
        );
      }

      const request = await this.buildNextRequest(input, projection, nextNodeId);
      if (nodeInput?.draft_payload || nodeInput?.execution_spec) {
        // run_mode is only meaningful alongside a semantic artifact / execution spec —
        // the harness blocks it on bare deterministic invocations
        // (RUNTIME_FIELDS_REQUIRE_SEMANTIC_ARTIFACT).
        request.run_mode = input.run_mode ?? 'acceptance';
      }
      if (nodeInput?.draft_payload) {
        request.semantic_artifacts = [
          await this.recordDraftSemanticArtifact(request, nextNodeId, nodeInput.draft_payload, input.created_by),
        ];
      }
      if (nodeInput?.execution_spec) {
        request.execution_spec = nodeInput.execution_spec;
      }

      const result = await this.invokeWithTimeout(request, nodeTimeoutMs);
      if (result.kind === 'timeout') {
        return halt('node_timeout', nextNodeId, result.message);
      }
      steps.push(this.step(result.value));
    }
  }

  private pendingHalt(projection: TopicSelectionV1bRunStateProjection): {
    reason: TopicSelectionV1bRunCoordinatorHaltReason;
    node_id: string;
    message: string;
    blockers: Array<{ code: string; message: string }>;
    /** For a loopback frontier: the upstream node the caller can re-enter (in feedback mode). */
    loopback_target_node_id?: string | null;
  } | null {
    // Inspect the latest trace across all nodes: a frontier in blocked/wait/loopback/review
    // is a halt the caller must resolve (often by supplying a new draft and advancing again).
    let latest: { node: TopicSelectionV1bRunNodeState; seq: number } | null = null;
    for (const node of projection.nodes) {
      if (!node.latest) {
        continue;
      }
      if (!latest || node.latest.seq > latest.seq) {
        latest = { node, seq: node.latest.seq };
      }
    }
    if (!latest?.node.latest) {
      return null;
    }
    const { node } = latest;
    const route = node.latest!.route_decision;
    const blockers = node.latest!.blockers;
    if (route === 'invoke_next' || route === 'stop_v1b_complete') {
      return null;
    }
    const map: Partial<Record<string, TopicSelectionV1bRunCoordinatorHaltReason>> = {
      blocked: 'harness_blocked',
      wait: 'harness_wait',
      retry: 'harness_retryable_failure',
      loopback: 'harness_loopback',
    };
    const reason = node.latest!.gate_status === 'requires_human_review'
      ? 'harness_requires_human_review'
      : map[route] ?? 'harness_blocked';
    let message = `latest attempt of ${node.node_id} ended with route_decision=${route}, gate_status=${node.latest!.gate_status}; resolve and advance again.`;
    let loopbackTargetNodeId: string | null = null;
    if (route === 'loopback') {
      const target = POLICY_BY_NODE_ID.get(node.node_id)
        ?.route_edges.find((edge) => edge.route_decision === 'loopback')?.next_node_id ?? null;
      // The loopback target re-enters in feedback mode only if its recipe declares how to
      // assemble that frozen input from this source's loopback (DP-3.6). Otherwise the only
      // resume is re-invoking the source itself with a fresh draft.
      const feedbackReentry = target != null
        && HANDOFF_BUILDER_TABLE[target]?.feedback_reentry?.loopback_source_node_id === node.node_id;
      loopbackTargetNodeId = feedbackReentry ? target : null;
      message = `latest attempt of ${node.node_id} ended with route_decision=loopback (harness loopback target: ${target ?? 'unknown'}). `
        + (feedbackReentry
          ? `advance again with retry_node_id=${target} to re-enter ${target} in feedback mode (the coordinator assembles its feedback_from_* frozen input), or retry_node_id=${node.node_id} to re-invoke the source with a fresh draft.`
          : `retry_node_id=${node.node_id} re-invokes the source with fresh node_inputs; this loopback target has no coordinator feedback recipe — drive upstream re-entry via the harness route.`);
    }
    return {
      reason,
      node_id: node.node_id,
      message,
      blockers,
      loopback_target_node_id: loopbackTargetNodeId,
    };
  }

  // ---------------------------------------------------------------- projection

  private async loadTraces(workflowRunId: string): Promise<TraceEntry[]> {
    const artifacts = await this.deps.controlPlane.listArtifactRefsByWorkflowRunId(workflowRunId);
    const traces: TraceEntry[] = [];
    for (const artifact of artifacts) {
      if (artifact.artifact_kind !== 'trace') {
        continue;
      }
      const payload = artifact.payload as Partial<TopicSelectionV1bWorkflowHarnessTracePayload> | null | undefined;
      if (!payload || payload.payload_schema !== TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_TRACE_PAYLOAD_SCHEMA_VERSION) {
        continue;
      }
      const result = payload.result as TopicSelectionV1bWorkflowHarnessRunResult | undefined;
      if (!result) {
        continue;
      }
      traces.push({
        node_id: String(payload.node_id),
        node_attempt_id: String(payload.node_attempt_id),
        created_at: String(payload.created_at ?? artifact.created_at),
        // List order is the closest thing to authoritative event order (created_at asc;
        // ms ties keep insertion order in-memory — prisma exact ties are unordered but
        // adjacent, which strict created_at comparison would mishandle either way).
        seq: traces.length,
        result,
      });
    }
    return traces;
  }

  private project(workflowRunId: string, traces: TraceEntry[]): TopicSelectionV1bRunStateProjection {
    const nodes: TopicSelectionV1bRunNodeState[] = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES.map(
      (policy) => ({
        node_id: policy.node_id,
        node_index: policy.node_index,
        attempt_count: 0,
        loopback_count: 0,
        latest: null,
        latest_admitted: null,
      }),
    );
    const byNode = new Map(nodes.map((node) => [node.node_id, node]));
    for (const trace of traces) {
      const node = byNode.get(trace.node_id);
      if (!node) {
        continue;
      }
      node.attempt_count += 1;
      if (trace.result.route_decision === 'loopback') {
        node.loopback_count += 1;
      }
      const snapshot: TopicSelectionV1bRunNodeAttemptSnapshot = {
        node_attempt_id: trace.node_attempt_id,
        gate_status: trace.result.gate_status,
        route_decision: trace.result.route_decision,
        authority_ref: trace.result.authority_ref ?? null,
        handoff_ref: trace.result.handoff_ref ?? null,
        trace_snapshot_ref: trace.result.trace_snapshot_ref ?? null,
        authority_hash: trace.result.hashes?.authority_hash ?? null,
        handoff_hash: trace.result.hashes?.handoff_hash ?? null,
        replayed: trace.result.replay_provenance?.replayed ?? false,
        created_at: trace.created_at,
        seq: trace.seq,
        blockers: (trace.result.blockers ?? []).map((issue) => ({
          code: String((issue as { code?: unknown }).code ?? 'UNKNOWN'),
          message: String((issue as { message?: unknown }).message ?? ''),
        })),
      };
      if (!node.latest || snapshot.seq > node.latest.seq) {
        node.latest = snapshot;
      }
      const admitted = snapshot.gate_status === 'admitted' || snapshot.gate_status === 'admitted_with_warnings';
      const advancing = snapshot.route_decision === 'invoke_next' || snapshot.route_decision === 'stop_v1b_complete';
      if (admitted && advancing && (!node.latest_admitted || snapshot.seq > node.latest_admitted.seq)) {
        node.latest_admitted = snapshot;
      }
    }

    // Completion/lineage scan reads latest_admitted: a later blocked/drifted re-attempt
    // on a completed node must not erase its admitted lineage.
    let lastCompleted: TopicSelectionV1bRunNodeState | null = null;
    let runComplete = false;
    for (const node of nodes) {
      const admitted = node.latest_admitted;
      if (!admitted) {
        continue;
      }
      if (admitted.route_decision === 'stop_v1b_complete') {
        lastCompleted = node;
        runComplete = true;
      } else if (admitted.route_decision === 'invoke_next') {
        if (!lastCompleted || node.node_index > lastCompleted.node_index) {
          lastCompleted = node;
        }
      }
    }

    let nextNodeId: string | null = null;
    if (!runComplete && lastCompleted) {
      const policy = POLICY_BY_NODE_ID.get(lastCompleted.node_id);
      const edge = policy?.route_edges.find((candidate) => candidate.route_decision === 'invoke_next');
      const target: string | null = edge?.next_node_id ?? null;
      nextNodeId = target && target !== 'v1c.entry' ? target : null;
    }

    return {
      workflow_run_id: workflowRunId,
      nodes,
      last_completed_node_id: lastCompleted?.node_id ?? null,
      next_node_id: nextNodeId,
      run_complete: runComplete,
    };
  }

  // ---------------------------------------------------------------- request assembly

  /**
   * DP-3.6: resolve the upstream feedback re-entry for a node whose recipe declares one, when the
   * configured loopback source has an UNCONSUMED loopback (a loopback newer than this node's last
   * admission — a consumed one would have advanced this node past it). Returns the feedback artifact
   * ref + the record/payload hashes the node's feedback parser validates against, or null when no
   * such loopback is pending (the normal forward/initial recipe then applies).
   */
  private async resolveFeedbackReentry(
    recipe: { feedback_reentry?: {
      loopback_source_node_id: string;
      input_mode: string;
      feedback_ref_key: string;
      feedback_record_hash_key: string;
      feedback_payload_hash_key: string;
    } },
    projection: TopicSelectionV1bRunStateProjection,
    targetNodeId: string,
  ): Promise<{
    inputMode: string;
    refKey: string;
    recordHashKey: string;
    payloadHashKey: string;
    feedbackRef: TopicSelectionFunctionalRef;
    recordHash: string;
    payloadHash: string;
  } | null> {
    const cfg = recipe.feedback_reentry;
    if (!cfg) {
      return null;
    }
    const source = projection.nodes.find((node) => node.node_id === cfg.loopback_source_node_id);
    const loopback = source?.latest;
    if (!loopback || loopback.route_decision !== 'loopback') {
      return null;
    }
    const lastAdmittedSeq = projection.nodes.find((node) => node.node_id === targetNodeId)?.latest_admitted?.seq ?? -1;
    if (loopback.seq <= lastAdmittedSeq) {
      return null;
    }
    if (!loopback.authority_ref || !loopback.authority_hash) {
      throw new AppError(500, 'INTERNAL_ERROR', `feedback loopback from ${cfg.loopback_source_node_id} is missing its feedback artifact ref/hash for ${targetNodeId} re-entry.`);
    }
    const artifact = await this.deps.controlPlane.getArtifactRef(loopback.authority_ref.ref_id);
    if (!artifact) {
      throw new AppError(500, 'INTERNAL_ERROR', `feedback artifact ${loopback.authority_ref.ref_id} for ${targetNodeId} re-entry not found.`);
    }
    return {
      inputMode: cfg.input_mode,
      refKey: cfg.feedback_ref_key,
      recordHashKey: cfg.feedback_record_hash_key,
      payloadHashKey: cfg.feedback_payload_hash_key,
      feedbackRef: loopback.authority_ref,
      // The harness re-entry validates n8_feedback_hash === hash(artifact record) and
      // n8_feedback_payload_hash === hash(payload); reproduce the first via the same canonicalHash,
      // and reuse the loopback's authority_hash (which IS hash(feedback payload)) for the second.
      recordHash: sha256Text(stableStringify(artifact)),
      payloadHash: loopback.authority_hash,
    };
  }

  private async buildNextRequest(
    input: AdvanceTopicSelectionV1bRunInput,
    projection: TopicSelectionV1bRunStateProjection,
    nextNodeId: string,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
    const recipe = HANDOFF_BUILDER_TABLE[nextNodeId];
    if (!recipe) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `coordinator cannot assemble frozen input for ${nextNodeId}; drive it via its dedicated route, then advance again.`,
      );
    }
    const targetPolicy = POLICY_BY_NODE_ID.get(nextNodeId);
    if (!targetPolicy) {
      throw new AppError(500, 'INTERNAL_ERROR', `no node policy registered for ${nextNodeId}.`);
    }
    const targetIndex = targetPolicy.node_index;
    // Lineage comes from latest_admitted: a later blocked re-attempt on the predecessor
    // must not push prev-selection back to an earlier node (whose handoff kind would mismatch).
    const prevNode = [...projection.nodes]
      .filter((node) => node.node_index < targetIndex
        && node.latest_admitted
        && node.latest_admitted.route_decision === 'invoke_next')
      .sort((left, right) => right.node_index - left.node_index)[0] ?? null;
    const prev = prevNode?.latest_admitted ?? null;
    if (!prevNode || !prev?.handoff_ref || !prev.handoff_hash) {
      throw new AppError(500, 'INTERNAL_ERROR', `previous node result for ${nextNodeId} is missing handoff lineage.`);
    }
    const expectedHandoffKind = POLICY_BY_NODE_ID.get(prevNode.node_id)?.output_handoff_kind ?? null;
    const handoffArtifact = await this.deps.controlPlane.getArtifactRef(prev.handoff_ref.ref_id);
    const handoff = handoffArtifact?.payload as {
      envelope?: { handoff_kind?: string };
      payload?: Record<string, unknown>;
      required_refs?: TopicSelectionFunctionalRef[];
    } | null | undefined;
    if (!handoff?.payload || !expectedHandoffKind || handoff.envelope?.handoff_kind !== expectedHandoffKind) {
      throw new AppError(
        500,
        'INTERNAL_ERROR',
        `handoff artifact for ${nextNodeId} is missing or has unexpected kind (${handoff?.envelope?.handoff_kind ?? 'none'}; expected ${expectedHandoffKind ?? 'unknown'}).`,
      );
    }

    const titleCardId = prev.authority_ref?.title_card_id ?? prev.handoff_ref.title_card_id ?? null;
    const payload: Record<string, unknown> = {
      ...handoff.payload,
      ...(recipe.payload_extras ?? {}),
      [recipe.handoff_hash_key]: prev.handoff_hash,
    };
    // DP-3.6 upstream feedback re-entry: when an unconsumed downstream loopback targets this node,
    // override input_mode and thread the loopback's feedback artifact refs/hashes into the payload
    // (the rest of the frozen input stays the forward N6 lineage the feedback parser also requires).
    const feedbackReentry = await this.resolveFeedbackReentry(recipe, projection, nextNodeId);
    if (feedbackReentry) {
      payload.input_mode = feedbackReentry.inputMode;
      payload[feedbackReentry.refKey] = feedbackReentry.feedbackRef;
      payload[feedbackReentry.recordHashKey] = feedbackReentry.recordHash;
      payload[feedbackReentry.payloadHashKey] = feedbackReentry.payloadHash;
    }
    for (const extra of recipe.extra_payload_authorities ?? []) {
      const upstream = projection.nodes.find((node) => node.node_id === extra.node_id)?.latest_admitted;
      if (!upstream?.authority_ref || !upstream.authority_hash) {
        throw new AppError(500, 'INTERNAL_ERROR', `missing upstream authority ${extra.ref_key} (from ${extra.node_id}) for ${nextNodeId}.`);
      }
      payload[extra.ref_key] = upstream.authority_ref;
      payload[extra.hash_key] = upstream.authority_hash;
    }
    for (const extra of recipe.extra_handoff_hashes ?? []) {
      const upstream = projection.nodes.find((node) => node.node_id === extra.node_id)?.latest_admitted;
      if (!upstream?.handoff_hash) {
        throw new AppError(500, 'INTERNAL_ERROR', `missing upstream handoff hash ${extra.key} (from ${extra.node_id}) for ${nextNodeId}.`);
      }
      payload[extra.key] = upstream.handoff_hash;
    }
    const extraAuthorityRefs = (recipe.extra_authority_nodes ?? [])
      .map((nodeId) => projection.nodes.find((node) => node.node_id === nodeId)?.latest_admitted?.authority_ref)
      .filter((value): value is TopicSelectionFunctionalRef => Boolean(value));
    const sourceRefs = this.uniqueRefs([
      ...(prev.authority_ref ? [prev.authority_ref] : []),
      prev.handoff_ref,
      ...extraAuthorityRefs,
      ...(handoff.required_refs ?? []),
      ...(feedbackReentry ? [feedbackReentry.feedbackRef] : []),
    ]);
    if (recipe.required_projection_kind) {
      const artifacts = await this.deps.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
      let projectionArtifact: (typeof artifacts)[number] | null = null;
      for (const artifact of artifacts) {
        const artifactPayload = artifact.payload as Record<string, unknown> | null | undefined;
        if (artifactPayload?.projection_kind !== recipe.required_projection_kind) {
          continue;
        }
        if (!projectionArtifact || String(artifact.created_at) >= String(projectionArtifact.created_at)) {
          projectionArtifact = artifact;
        }
      }
      if (!projectionArtifact) {
        throw new AppError(
          500,
          'INTERNAL_ERROR',
          `required runtime projection ${recipe.required_projection_kind} not found in workflow run for ${nextNodeId}.`,
        );
      }
      sourceRefs.push({
        ref_type: 'artifact_ref',
        ref_id: projectionArtifact.artifact_ref_id,
        title_card_id: projectionArtifact.title_card_id ?? titleCardId,
      });
    }
    const snapshotKind = targetPolicy.required_frozen_snapshot_kind;
    // Policy gate requires a source ref whose ref_type matches snapshot_kind. Strictly
    // per-node opt-in: only nodes whose predecessor authority is documented to BE the
    // snapshot under a different ref_type (N6 ← N5's selection decision). For every
    // other node a missing match must surface as a harness blocker, not be papered over.
    if (recipe.retype_authority_as_snapshot
      && !sourceRefs.some((item) => item.ref_type === snapshotKind)
      && prev.authority_ref) {
      sourceRefs.unshift({
        ref_type: snapshotKind,
        ref_id: prev.authority_ref.ref_id,
        title_card_id: prev.authority_ref.title_card_id ?? null,
        version_id: prev.authority_ref.version_id ?? null,
      });
    }
    const frozenInput = {
      input_contract: targetPolicy.input_contract,
      snapshot_kind: snapshotKind,
      source_refs: sourceRefs,
      payload,
    };
    return {
      schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
      title_card_id: titleCardId,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: this.nextAttemptId(projection, nextNodeId),
      node_id: nextNodeId as TopicSelectionV1bWorkflowHarnessNodeId,
      policy_version: POLICY_VERSION,
      frozen_input: {
        ...frozenInput,
        frozen_input_hash: sha256Text(stableStringify(frozenInput)),
      },
      created_by: input.created_by ?? 'system',
    };
  }

  private nextAttemptId(projection: TopicSelectionV1bRunStateProjection, nodeId: string): string {
    const node = projection.nodes.find((candidate) => candidate.node_id === nodeId);
    const ordinal = (node?.attempt_count ?? 0) + 1;
    const shortNode = nodeId.split('.').slice(-2).join('_').replaceAll('-', '_');
    return `node_attempt_${projection.workflow_run_id}_${shortNode}_${ordinal}`;
  }

  private async recordDraftSemanticArtifact(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    nodeId: string,
    draftPayload: Record<string, unknown>,
    createdBy: AdvanceTopicSelectionV1bRunInput['created_by'],
  ): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
    // Slot metadata comes from the node policy (SSOT) — exactly one model-draft slot per
    // model-like node; a node without one does not accept caller drafts.
    const slot = POLICY_BY_NODE_ID.get(nodeId)
      ?.semantic_support_slots.find((candidate) => candidate.allowed_effect === 'model_draft_for_gate');
    if (!slot) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${nodeId} does not accept caller-supplied drafts.`);
    }
    const record = async (payload: Record<string, unknown>, kind: 'structured_output' | 'diagnostic') =>
      this.deps.controlPlane.recordArtifactRef({
        workspace_id: request.workspace_id ?? null,
        title_card_id: request.title_card_id ?? null,
        artifact_kind: kind,
        storage_kind: 'inline',
        workflow_run_id: request.workflow_run_id,
        payload,
        created_by: createdBy ?? 'system',
      });
    // The caller draft IS the normalized output (no adapter step ran) — one artifact
    // backs both refs instead of persisting byte-identical payloads twice.
    const [support, provenance] = await Promise.all([
      record(draftPayload, 'structured_output'),
      record({ adapter_policy_version: POLICY_VERSION, source: 'run_coordinator_caller_draft' }, 'diagnostic'),
    ]);
    const supportChecksum = support.checksum;
    if (!supportChecksum) {
      throw new AppError(500, 'INTERNAL_ERROR', `draft artifact for ${nodeId} was recorded without a checksum.`);
    }
    const ref = (artifactId: string): TopicSelectionFunctionalRef => ({
      ref_type: 'artifact_ref',
      ref_id: artifactId,
      title_card_id: request.title_card_id ?? null,
    });
    return {
      node_id: request.node_id,
      run_mode: request.run_mode ?? 'acceptance',
      slot_id: slot.slot_id,
      allowed_effect: 'model_draft_for_gate',
      output_contract: slot.output_contract,
      execution_mode: 'codex_assisted',
      profile_id: slot.default_profile_id,
      model_option_id: null,
      input_hash: request.frozen_input.frozen_input_hash!,
      support_artifact_ref: ref(support.artifact_ref_id),
      support_artifact_hash: supportChecksum,
      normalized_output_ref: ref(support.artifact_ref_id),
      normalized_output_hash: supportChecksum,
      prompt_packet_hash: 'c'.repeat(64),
      structured_output_hash: supportChecksum,
      adapter_policy_version: POLICY_VERSION,
      slot_spec_hash: 'e'.repeat(64),
      provenance_ref: ref(provenance.artifact_ref_id),
      runtime_provenance_class: 'fixture_replay',
      context_policy_profile_id: null,
      context_policy_profile_version: null,
      context_policy_profile_hash: null,
      prompt_variant_key: null,
      runtime_invocation_context_hash: null,
      redaction_policy: null,
      source_hashes: {},
      runtime_audit_ref: null,
      runtime_audit_hash: null,
      compression_report_ref: null,
      compression_report_hash: null,
      compressed_context_hash: null,
    };
  }

  // ---------------------------------------------------------------- plumbing

  private step(result: TopicSelectionV1bWorkflowHarnessRunResult): TopicSelectionV1bRunAdvanceStep {
    return {
      node_id: result.node_id,
      node_attempt_id: result.node_attempt_id,
      gate_status: result.gate_status,
      route_decision: result.route_decision,
      replayed: result.replay_provenance?.replayed ?? false,
    };
  }

  private async invokeWithTimeout(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    timeoutMs: number,
  ): Promise<{ kind: 'ok'; value: TopicSelectionV1bWorkflowHarnessRunResult } | { kind: 'timeout'; message: string }> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<{ kind: 'timeout'; message: string }>((resolve) => {
      timer = setTimeout(
        () => resolve({
          kind: 'timeout',
          message: `node ${request.node_id} did not return within ${timeoutMs}ms; the invocation may still complete — the harness is replay-idempotent, advance again to converge.`,
        }),
        timeoutMs,
      );
    });
    const invocation = this.deps.harness.invokeNode(request).then(
      (result) => ({ kind: 'ok' as const, value: result }),
    );
    try {
      const value = await Promise.race([invocation, timeout]);
      if (value.kind === 'timeout') {
        // The harness call is still executing. Re-invoking the node before its trace
        // lands would regenerate the SAME node_attempt_id (attempt count unchanged) and
        // run it concurrently — track the orphan and refuse to advance until it settles.
        this.trackOrphan(request.workflow_run_id, request.node_id, invocation);
      }
      return value;
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  private trackOrphan(workflowRunId: string, nodeId: string, invocation: Promise<unknown>): void {
    const entry = {
      node_id: nodeId,
      settled: invocation.then(() => undefined, () => undefined),
    };
    this.inFlight.set(workflowRunId, entry);
    void entry.settled.then(() => {
      if (this.inFlight.get(workflowRunId) === entry) {
        this.inFlight.delete(workflowRunId);
      }
    });
  }

  private withRunLock<T>(workflowRunId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.runLocks.get(workflowRunId) ?? Promise.resolve();
    const next = previous.then(fn, fn);
    // `guarded` never rejects, so the cleanup chain cannot raise an unhandledRejection
    // (the caller is the only consumer of `next`'s rejection), and the identity check
    // compares the exact promise stored in the map.
    const guarded = next.catch(() => undefined);
    this.runLocks.set(workflowRunId, guarded);
    void guarded.finally(() => {
      if (this.runLocks.get(workflowRunId) === guarded) {
        this.runLocks.delete(workflowRunId);
      }
    });
    return next;
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const out: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
      const key = `${ref.ref_type}|${ref.ref_id}|${ref.title_card_id ?? ''}|${ref.version_id ?? ''}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push(ref);
    }
    return out;
  }
}
