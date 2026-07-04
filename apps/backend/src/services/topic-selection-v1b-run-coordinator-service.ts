import { Ajv, type ValidateFunction } from 'ajv';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionAgentExecutionSpec,
  TopicSelectionAgentRunMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import { topicSelectionNamedDebateExecutionPlanSchema } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-debate-execution-plan-contracts';
import {
  TOPIC_SELECTION_V1B_NODE_POLICY_VERSION,
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER,
  TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER,
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
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import type { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import type {
  GenerateTopicSelectionV1bN6DivergentDebateInput,
  TopicSelectionV1bN6DivergentDebateRuntimeService,
} from './topic-selection-v1b-n6-divergent-debate-runtime-service.js';
import type {
  GenerateTopicSelectionV1bN8DebateInput,
  TopicSelectionV1bN8BoundedDebateRuntimeService,
} from './topic-selection-v1b-n8-bounded-debate-runtime-service.js';

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

const POLICY_VERSION = TOPIC_SELECTION_V1B_NODE_POLICY_VERSION;

type NodePolicy = (typeof TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES)[number];

const POLICY_BY_NODE_ID = new Map<string, NodePolicy>(
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES.map((policy) => [policy.node_id, policy]),
);

/** Nodes whose harness-routed debate escalation/re-entry the coordinator drives caller-side (T-127 W-07 item a). */
const N5_NODE_ID = 'topic-selection.v1b.select-research-slice.v1';
const N6_NODE_ID = 'topic-selection.v1b.generate-topic-question-candidates.v1';
const N7_NODE_ID = 'topic-selection.v1b.materialize-topic-question-contract.v1';
const N8_NODE_ID = 'topic-selection.v1b.assess-topic-value.v1';

/** The gate-failure retry projection the N6 runtime (single-agent OR divergent debate) requires for
 *  the regeneration_after_n6_gate_failure mode. The harness records it on the escalation loopback; the
 *  coordinator threads it into the N6 debate re-invocation's frozen_input.source_refs. */
const N6_GATE_FAILURE_PROJECTION_KIND = 'v1b_n6_gate_failure_retry_context';

/** The harness warning the N6 gate emits when an n6_loopback_triage routes `n6_debate_escalation`
 *  (harness n6LoopbackWarnings). It rides RunResult.warnings, so the coordinator can detect the
 *  escalation frontier from the projection — loopback_target_code is NOT on RunResult. */
const N6_DEBATE_ESCALATION_WARNING_CODE = 'N6_DEBATE_ESCALATION_RECOMMENDED';

/** Marker artifact recorded once per attempt AFTER a debate completes, carrying the gate-draft
 *  semantic-artifact descriptor. Lets a re-advance after a harness-rejection (same attempt id, no
 *  trace landed) reuse the descriptor instead of re-running a COMPLETED debate and duplicating its
 *  non-authority role/context/audit rows (the control plane has no uniqueness guard). Scope caveat:
 *  this covers only the completed→harness-rejection window; a debate that crashes mid-run or returns
 *  blocked records no marker, so a retry of that attempt re-runs it (and may duplicate the rows the
 *  partial/blocked run already wrote) — see the N6 reachability follow-up. */
const DEBATE_GATE_DRAFT_MARKER = 'v1b_run_coordinator_debate_gate_draft@v1';

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
    /**
     * The support_only semantic-support slot the node REQUIRES on the feedback re-entry (the N7
     * gate-rejected readmission needs a frozen n7_n8_debate_admission_review support deciding the
     * debate level). On a feedback re-entry the coordinator records node_inputs[node].draft_payload
     * under this slot and attaches it to the request — without it the harness blocks the readmission.
     */
    support_slot_id?: string;
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
      support_slot_id: 'n7_n8_debate_admission_review',
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
  // W-04: upstream lineage a recipe requires is not ready (predecessor handoff / authority /
  // required projection missing) — a structured fail-fast instead of a deep raw 500.
  | 'upstream_blocked'
  // W-04: a downstream loopback re-enters a node in feedback mode but its feedback artifact
  // ref/hash (or the artifact itself) is missing — named so the operator can locate it.
  | 'feedback_artifact_missing'
  // T-127 W-07 item (a): node_inputs[...].debate was supplied but this node is not at a debate
  // frontier (N6 needs an n6_debate_escalation loopback; N8 runs the bounded debate only on the
  // post-N7 re-entry). The debate is opt-in — a frontier ALLOWS it, a non-frontier rejects it.
  | 'debate_not_applicable'
  // T-127 W-07 item (a): the caller-side debate runtime did not reach `completed`
  // (a role turn or the deterministic admission blocked) — surfaced so the operator can fix fixtures.
  | 'debate_blocked'
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
  /** Gate warnings from the trace result. Carries the N6 debate-escalation signal
   *  (N6_DEBATE_ESCALATION_RECOMMENDED) the coordinator keys the divergent-debate frontier on. */
  warnings: Array<{ code: string; message: string }>;
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

/**
 * T-127 W-07 item (a): per-role debate fixtures the coordinator forwards to the caller-side debate
 * runtime when the harness routes a debate escalation/re-entry. The harness request has NO per-role
 * debate-fixture slot (the role outputs are non-authority support, resolved before the gate), so the
 * fixtures arrive here. A per-node discriminated union: N6 carries the fan-out role_outputs (arrays
 * per slot) + the re-entry generation_mode (caller contract — the escalation-source mode), N8 carries
 * the 4-role role_outputs. execution_mode/run_mode mirror the runtime inputs; there is no live path —
 * both runtimes require pre-supplied codex_response/mocked_output per role.
 */
export type TopicSelectionV1bRunCoordinatorDebateInput =
  | ({ kind: 'n6_divergent' } & Pick<
      GenerateTopicSelectionV1bN6DivergentDebateInput,
      // T-127 W-09 S4: execution_plan is the caller-injectable provider-diverse plan (absent -> null ->
      // byte-identical). This is the one production-reachable selection seam; the debate_level->plan
      // auto-decision inside the harness stays a documented deferred seam.
      'execution_mode' | 'run_mode' | 'generation_mode' | 'role_outputs' | 'execution_plan'
    >)
  | ({ kind: 'n8_bounded' } & Pick<
      GenerateTopicSelectionV1bN8DebateInput,
      'execution_mode' | 'run_mode' | 'role_outputs' | 'execution_plan'
    >);

/**
 * T-127 W-09 pre-provider_llm hardening: per-kind structural validators for a debate frontier's
 * caller-supplied execution_plan, keyed by each debate's OWN role slot ids (so an N8 plan cannot carry
 * an N6 role key, etc.). The named-plan schema is the SAME shared factory the runtimes' contracts use;
 * compiled once at module load. removeAdditional stays OFF so an over-permissive plan (foreign role key,
 * unknown field, bad enum) is REJECTED — not silently stripped — before it is forwarded to the runtimes.
 * This is the AUTHORITATIVE structural reject for DIRECT (non-HTTP) callers. NB: over the HTTP advance route,
 * Fastify's default Ajv (removeAdditional:true) already STRIPS additionalProperties violations before the
 * controller hands the body here, so on that path this validator only re-catches the surviving enum/type
 * violations; full foreign-key/unknown-key rejection is observable only off the HTTP path (e.g. direct
 * coordinator callers / the unit tests).
 */
const debateExecutionPlanAjv = new Ajv({ allErrors: true, strict: false });
const DEBATE_EXECUTION_PLAN_VALIDATORS: Record<TopicSelectionV1bRunCoordinatorDebateInput['kind'], ValidateFunction> = {
  n6_divergent: debateExecutionPlanAjv.compile(
    topicSelectionNamedDebateExecutionPlanSchema(TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER),
  ),
  n8_bounded: debateExecutionPlanAjv.compile(
    topicSelectionNamedDebateExecutionPlanSchema(TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER),
  ),
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
  /**
   * Per-role debate fixtures for an N6 divergent / N8 bounded debate frontier. Mutually exclusive
   * with draft_payload/execution_spec: on a debate frontier the coordinator runs the debate runtime
   * (which mints the gate-facing draft itself) instead of recording a caller draft.
   */
  debate?: TopicSelectionV1bRunCoordinatorDebateInput | null;
  /**
   * T-127 W-07 item (a) follow-up: caller-supplied support_only artifacts to record under named
   * semantic-support slots and ATTACH to the node's harness invocation ALONGSIDE the draft_payload
   * (additive — not mutually exclusive with it). Generalizes the feedback re-entry's single required
   * support: each entry is recorded exactly like recordDraftSemanticArtifact's targetSlotId path
   * (one structured_output artifact backing the support/normalized refs, runtime_provenance_class
   * fixture_replay, run_mode from the request). The slot's allowed_effect MUST be support_only — a
   * model_draft_for_gate slot belongs on draft_payload, not here.
   *
   * The motivating use is the N6 `n6_loopback_triage` support: without it the harness N6 gate-failure
   * defaults to `n6_regenerate_candidates` and the divergent-debate escalation frontier is never
   * reached in a coordinator-driven run. Supplying the triage payload (loopback_target_code
   * `n6_debate_escalation`) here lets the harness route the escalation (N6_DEBATE_ESCALATION_RECOMMENDED
   * warning) the coordinator's debate orchestration keys on.
   *
   * Caller contract (the coordinator records the payload VERBATIM — it does not derive or repair it,
   * so these are the caller's responsibility and are enforced only by the real harness, surfacing as
   * deep blocker codes if violated):
   *   - Each payload must be the BARE output-contract object (no `normalized_output`/envelope wrapper);
   *     a wrapper drifts the recorded hash and is rejected (N6_LOOPBACK_TRIAGE_ARTIFACT_INVALID / a
   *     draft HASH_MISMATCH).
   *   - For `n6_loopback_triage` the triage is a NO-OP unless the SAME attempt's draft_payload is one
   *     the deterministic N6 gate routes into a candidate-level loopback (>=1 candidate, all semantically
   *     blocked) — not a hard-blocked draft (zero/>5/duplicate/malformed) and not an admissible one.
   *   - `affected_refs` must stay within the frozen N6 lineage and include the selected research_slice
   *     ref (else N6_LOOPBACK_TRIAGE_AFFECTED_REFS_MISMATCH).
   *   - fixture_replay carries the same product-mode limitation as caller drafts (the harness allows it
   *     only when run_mode !== 'product').
   * The real-harness round-trip (loopback-inducing draft + lineage-correct triage -> routed escalation)
   * is covered by the harness E2E test; this channel's coordinator-side contract is to record + attach.
   *
   * N6 regeneration re-entry caller contract (D-T128-01 C): after an N6 gate-failure loopback the
   * harness records a `v1b_n6_gate_failure_retry_context` projection for BOTH loopback routes. The
   * runtime's `regeneration_after_n6_gate_failure` mode then requires EXACTLY ONE such projection in
   * frozen_input.source_refs (and no N7 loopback projection) — the harness derives the mode from the
   * draft's prompt_variant_key and blocks a projection-less regeneration. The coordinator threads the
   * projection automatically on re-entry, discriminated by loopback_target_code (`n6_debate_escalation`
   * on the debate route, `n6_regenerate_candidates` presence-based on the single-agent route), always
   * picking the most-recent match. Callers therefore only supply the regeneration draft (or debate
   * fixtures); supplying/duplicating the projection artifact itself is NOT a caller responsibility.
   */
  support_payloads?: Record<string, Record<string, unknown>> | null;
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

/**
 * T-127 W-07 item (a): the caller-side debate runtimes the coordinator drives. Narrow Pick ports
 * (like HarnessPort) so the unit test can stub them and the full heavy runtimes are only constructed
 * in app.ts. The harness only DETECTS + ROUTES the escalation; EXECUTION stays caller-side
 * (harness comment 4908-4913) — these ports are that caller.
 */
type DebateRuntimeN6Port = Pick<TopicSelectionV1bN6DivergentDebateRuntimeService, 'runDivergentDebate'>;
type DebateRuntimeN8Port = Pick<TopicSelectionV1bN8BoundedDebateRuntimeService, 'runDebate'>;

/** Outcome of driving a caller-side debate runtime: the gate-facing draft to attach, or a structured block. */
type DebateOutcome =
  | { kind: 'ok'; gateDraftArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef }
  | { kind: 'blocked'; message: string; blockers: Array<{ code: string; message: string }> };

/**
 * W-04: a coordinator-detected precondition failure during request assembly that should surface
 * as a structured advance halt (with the named upstream/feedback artifact) rather than a raw 500
 * bubbling out of buildNextRequest. advanceLocked catches it and converts it into a halt.
 */
class CoordinatorPreconditionHalt extends Error {
  constructor(
    readonly haltReason: TopicSelectionV1bRunCoordinatorHaltReason,
    message: string,
  ) {
    super(message);
    this.name = 'CoordinatorPreconditionHalt';
  }
}

export class TopicSelectionV1bRunCoordinatorService {
  private readonly runLocks = new Map<string, Promise<unknown>>();

  /** W-04 opt-in human-submission idempotency: accepted (run, nonce) pairs. In-process like the
   * run-lock / in-flight maps (the coordinator is a per-process singleton); committed only after a
   * submission succeeds so a failed attempt can be retried with the same nonce. */
  private readonly usedAttemptNonces = new Map<string, Set<string>>();

  /** Timed-out harness invocations still executing — re-invoking the same node before they
   * land would duplicate the attempt id (the harness has no uniqueness guard). */
  private readonly inFlight = new Map<string, { node_id: string; settled: Promise<void> }>();

  constructor(
    private readonly deps: {
      harness: HarnessPort;
      controlPlane: ControlPlanePort;
      n6DivergentDebateRuntime: DebateRuntimeN6Port;
      n8BoundedDebateRuntime: DebateRuntimeN8Port;
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

  /**
   * W-04: per-run-mutex human submission (N2/N5 routes) with opt-in attempt-nonce idempotency.
   * When the caller passes an X-Coordinator-Attempt-Nonce, replaying the same (run, nonce) — a
   * double-submit, or a client retry after the response was lost — is rejected with a 409 so it
   * cannot record a duplicate human attempt. The nonce is committed only after the submission
   * succeeds (a failed attempt can be retried with the same nonce), and the check + commit run
   * inside the per-run mutex, so it is race-safe against concurrent submissions on the same run.
   * A null/absent nonce never guards (the route stays exactly as before — zero behavior change).
   */
  runHumanSubmissionExclusive<T>(
    workflowRunId: string,
    attemptNonce: string | null | undefined,
    fn: () => Promise<T>,
  ): Promise<T> {
    return this.withRunLock(workflowRunId, async () => {
      if (attemptNonce && this.usedAttemptNonces.get(workflowRunId)?.has(attemptNonce)) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          `attempt nonce "${attemptNonce}" was already accepted for workflow run ${workflowRunId}; the prior submission is authoritative — fetch the run state instead of resubmitting.`,
        );
      }
      const result = await fn();
      if (attemptNonce) {
        const seen = this.usedAttemptNonces.get(workflowRunId) ?? new Set<string>();
        seen.add(attemptNonce);
        this.usedAttemptNonces.set(workflowRunId, seen);
      }
      return result;
    });
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
        // The N6 debate escalation is itself a loopback-to-self, so an already-exhausted N6 halts here
        // before the debate branch — name it so the operator knows the debate did not run.
        const escalationStranded = nextNodeId === N6_NODE_ID && this.pendingN6DebateEscalation(projection);
        return halt(
          'loopback_budget_exhausted',
          nextNodeId,
          `loopback budget (${loopbackBudget}) exhausted for ${nextNodeId} (LOOPBACK_BUDGET_EXHAUSTED)`
            + (escalationStranded ? '; the pending n6_debate_escalation cannot run — raise loopback_budget_per_node to drive the divergent debate.' : '.'),
          [],
          projection,
        );
      }

      const nodeInput = input.node_inputs?.[nextNodeId] ?? null;
      if ([nodeInput?.draft_payload, nodeInput?.execution_spec, nodeInput?.debate].filter(Boolean).length > 1) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `${nextNodeId}: provide at most one of draft_payload, execution_spec, or debate — a recorded draft pins execution_mode=codex_assisted (mismatches a provider execution_spec at admission), and a debate frontier mints its own gate draft.`,
        );
      }
      if (nodeInput?.support_payloads && (nodeInput.debate || nodeInput.execution_spec)) {
        // support_payloads is additive to draft_payload ONLY (the escalation-triggering attempt carries
        // the failing model draft + the triage). It cannot ride a debate frontier (which mints its own
        // gate draft and overwrites semantic_artifacts, silently dropping the supports), nor an
        // execution_spec (the support is recorded codex_assisted/fixture_replay, which the harness
        // runtime-admission gate rejects against a provider/mocked execution_spec —
        // RUNTIME_ADMISSION_ARTIFACT_MISMATCH; reject here for a clean 400 instead of that deep blocker).
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `${nextNodeId}: support_payloads can only accompany draft_payload, not ${nodeInput.debate ? 'debate' : 'execution_spec'} — supply the support alongside the model draft on the escalation-triggering attempt.`,
        );
      }

      // T-127 W-07 item (a): a harness-routed debate frontier (N6 n6_debate_escalation loopback / N8
      // post-N7 bounded-debate re-entry). The debate is OPT-IN: a frontier ALLOWS the caller to drive
      // the debate runtime caller-side; if they instead supply a draft_payload (or nothing) the
      // existing single-agent path runs unchanged (the harness admits either — it downgraded the
      // triggers to warnings). So the debate branch fires only when node_inputs.debate is present.
      const debateFrontier: TopicSelectionV1bRunCoordinatorDebateInput['kind'] | null =
        (nextNodeId === N6_NODE_ID && this.pendingN6DebateEscalation(projection)) ? 'n6_divergent'
          : (nextNodeId === N8_NODE_ID && this.pendingN8BoundedDebate(projection)) ? 'n8_bounded'
            : null;
      if (nodeInput?.debate) {
        if (!debateFrontier) {
          return halt(
            'debate_not_applicable',
            nextNodeId,
            `${nextNodeId}: node_inputs.debate was supplied but this node is not at a debate frontier (N6 needs an n6_debate_escalation loopback; N8 runs the bounded debate only on the post-N7 re-entry). Supply draft_payload/execution_spec for a normal pass.`,
            [],
            projection,
          );
        }
        if (nodeInput.debate.kind !== debateFrontier) {
          throw new AppError(
            400,
            'INVALID_PAYLOAD',
            `${nextNodeId}: node_inputs.debate.kind=${nodeInput.debate.kind} does not match this node's debate kind (${debateFrontier}).`,
          );
        }
        // T-127 W-09 pre-provider_llm hardening: structurally validate the (optional) execution_plan against
        // THIS debate kind's role slot ids before forwarding it to the runtime (gap closes the harness W-09
        // review's contract-tightness note). Absent plan -> no-op -> byte-identical to today.
        this.assertDebateExecutionPlanValid(nextNodeId, nodeInput.debate);
        let debateRequest: TopicSelectionV1bWorkflowHarnessRunRequest;
        try {
          // The N6 divergent debate re-runs in regeneration_after_n6_gate_failure mode, which (in the
          // runtime AND the harness gate) requires the gate-failure retry projection in source_refs.
          // The harness records it on the escalation loopback; thread it here. N8 needs no extra.
          debateRequest = await this.buildNextRequest(input, projection, nextNodeId,
            debateFrontier === 'n6_divergent'
              ? {
                extraProjectionKind: N6_GATE_FAILURE_PROJECTION_KIND,
                // Pin the escalation-route projection — the regenerate route shares its projection_kind.
                extraProjectionDiscriminator: { key: 'loopback_target_code', value: 'n6_debate_escalation' },
              }
              : {});
        } catch (error) {
          if (error instanceof CoordinatorPreconditionHalt) {
            return halt(error.haltReason, nextNodeId, error.message, [], projection);
          }
          throw error;
        }
        let debateOutcome: DebateOutcome;
        try {
          debateOutcome = await this.runDebateForFrontier(debateRequest, nodeInput.debate);
        } catch (error) {
          // A runtime context-resolution failure (e.g. the N6 regeneration_after_n6_gate_failure mode
          // requires an n6_gate_failure_retry_context projection that this escalation route does not yet
          // record/thread) throws an AppError. Surface it as a structured debate_blocked halt naming the
          // blocker, rather than a raw 4xx out of advance. Non-AppError infra errors still propagate.
          if (error instanceof AppError) {
            return halt(
              'debate_blocked',
              nextNodeId,
              `${nextNodeId} caller-side debate could not run: ${error.message}`,
              [{ code: error.errorCode, message: error.message }],
              projection,
            );
          }
          throw error;
        }
        if (debateOutcome.kind === 'blocked') {
          return halt('debate_blocked', nextNodeId, debateOutcome.message, debateOutcome.blockers, projection);
        }
        // Attach the debate's gate-facing draft (NOT re-recorded — it is already runtime_verified).
        debateRequest.semantic_artifacts = [debateOutcome.gateDraftArtifact];
        const debateResult = await this.invokeWithTimeout(debateRequest, nodeTimeoutMs);
        if (debateResult.kind === 'timeout') {
          return halt('node_timeout', nextNodeId, debateResult.message);
        }
        steps.push(this.step(debateResult.value));
        continue;
      }

      // A feedback re-entry (N7 <- N8 debate loopback) is otherwise auto-driven, but the harness
      // readmission requires a caller-supplied support_only artifact (the debate-admission review),
      // so it needs caller input exactly like a model-like node.
      const feedbackSupportSlotId = this.feedbackReentrySupportSlotId(projection, nextNodeId);
      const isModelLike = policy.execution_kind === 'model_like';
      if ((isModelLike || feedbackSupportSlotId != null) && !nodeInput?.draft_payload && !nodeInput?.execution_spec) {
        return halt(
          'model_input_required',
          nextNodeId,
          feedbackSupportSlotId != null
            ? `${nextNodeId} is re-entering in feedback mode; supply node_inputs[...].draft_payload carrying the ${feedbackSupportSlotId} support (the debate-admission review the readmission requires).`
            : debateFrontier != null
              // The harness recommends a debate here, but it is opt-in — surface both paths.
              ? `${nextNodeId} is at a ${debateFrontier === 'n6_divergent' ? 'divergent (N6)' : 'bounded (N8)'} debate frontier; supply node_inputs[...].debate (per-role fixtures) to drive ${debateFrontier === 'n6_divergent' ? 'runDivergentDebate' : 'runDebate'}, or draft_payload/execution_spec for a single-agent pass.`
              : `${nextNodeId} is model-like; supply node_inputs[...].draft_payload (caller-curated draft) or execution_spec (provider run) — auto-advance stays human-in-loop per D1.`,
          [],
          projection,
        );
      }

      let request: TopicSelectionV1bWorkflowHarnessRunRequest;
      try {
        // D-T128-01 (A): a single-agent N6 regeneration re-entry needs the gate-failure retry
        // projection in frozen_input.source_refs (the runtime's regeneration_after_n6_gate_failure
        // mode requires exactly one). Presence-based mirror of the debate route's threading above:
        // attach iff the regenerate-route projection is already recorded on this run — a first N6
        // entry has none, so its request assembly stays byte-identical.
        request = await this.buildNextRequest(input, projection, nextNodeId,
          await this.n6RegenerateProjectionOpts(input, projection, nextNodeId));
      } catch (error) {
        // W-04: a missing upstream/feedback precondition surfaces as a structured halt (named
        // artifact) the operator can resolve, instead of a raw 500 from deep in request assembly.
        if (error instanceof CoordinatorPreconditionHalt) {
          return halt(error.haltReason, nextNodeId, error.message, [], projection);
        }
        throw error;
      }
      if (nodeInput?.draft_payload || nodeInput?.execution_spec || nodeInput?.support_payloads) {
        // run_mode is only meaningful alongside a semantic artifact / execution spec —
        // the harness blocks it on bare deterministic invocations
        // (RUNTIME_FIELDS_REQUIRE_SEMANTIC_ARTIFACT). A support_payload is itself such an artifact,
        // and it must be set BEFORE recording so the recorded support carries the same run_mode.
        request.run_mode = input.run_mode ?? 'acceptance';
      }
      if (nodeInput?.draft_payload) {
        // On a feedback re-entry the draft_payload IS the required support_only artifact, recorded
        // under that slot; otherwise it is the node's model-draft-for-gate.
        request.semantic_artifacts = [
          await this.recordDraftSemanticArtifact(request, nextNodeId, nodeInput.draft_payload, input.created_by, feedbackSupportSlotId ?? undefined),
        ];
      }
      if (nodeInput?.support_payloads) {
        // Additive to the draft: record each caller support_only payload under its named slot and
        // append it (the harness resolves draft and triage independently, by slot_id). The N6
        // escalation attempt rides here — draft (model_draft_for_gate) + n6_loopback_triage (support).
        const supports = await this.recordSupportSemanticArtifacts(
          request,
          nextNodeId,
          nodeInput.support_payloads,
          input.created_by,
        );
        request.semantic_artifacts = [...(request.semantic_artifacts ?? []), ...supports];
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
        warnings: (trace.result.warnings ?? []).map((issue) => ({
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

  // ------------------------------------------------------ caller-side debate orchestration (W-07 item a)

  /**
   * The N6 divergent-debate escalation is the next frontier: N6's latest attempt looped back carrying
   * the harness `N6_DEBATE_ESCALATION_RECOMMENDED` warning (an n6_loopback_triage routed
   * `n6_debate_escalation`). Detected from the projection alone — loopback_target_code is NOT on
   * RunResult, but the warning is. The caller resumes a loopback with retry_node_id=N6, so this is
   * evaluated when N6 is the chosen frontier.
   */
  private pendingN6DebateEscalation(projection: TopicSelectionV1bRunStateProjection): boolean {
    const latest = projection.nodes.find((node) => node.node_id === N6_NODE_ID)?.latest;
    if (!latest || latest.route_decision !== 'loopback') {
      return false;
    }
    return latest.warnings.some((warning) => warning.code === N6_DEBATE_ESCALATION_WARNING_CODE);
  }

  /**
   * The N8 bounded-debate re-entry (pass 2) is the next frontier: N8 most-recently looped back
   * (n8_feedback_to_n7 — the only N8 loopback) and N7 has SINCE re-admitted via its feedback re-entry
   * (latest_admitted newer than the N8 loopback). On the N8 first pass there is no prior N8 loopback,
   * so this is false — the bounded debate runs only after the N8->N7->N8 round-trip, where the harness
   * downgrades the triggers to warnings (a first-pass debate would be wasted, the trigger re-arms the
   * loopback regardless). This mirrors the round-trip ordering pendingFeedbackLoopback checks, but is
   * the INVERSE comparison over the same two snapshots (here: N7 admitted AFTER the N8 loopback ⇒
   * round-trip done; there: N8 loopback newer than N7's admission ⇒ round-trip still pending). The
   * two are complementary, not shared code — keep them consistent if either changes.
   */
  private pendingN8BoundedDebate(projection: TopicSelectionV1bRunStateProjection): boolean {
    const n8Latest = projection.nodes.find((node) => node.node_id === N8_NODE_ID)?.latest;
    if (!n8Latest || n8Latest.route_decision !== 'loopback') {
      return false;
    }
    const n7Admitted = projection.nodes.find((node) => node.node_id === N7_NODE_ID)?.latest_admitted;
    return Boolean(n7Admitted && n7Admitted.route_decision === 'invoke_next' && n7Admitted.seq > n8Latest.seq);
  }

  /**
   * T-127 W-09 pre-provider_llm hardening: validate a debate frontier's caller-supplied execution_plan
   * STRUCTURE (against the debate kind's own role slot ids) before forwarding it to the runtime. Today the
   * runtimes thread the plan verbatim and the model-profile registry drops every per-role option to null for
   * codex|mocked debates, so a malformed plan is INERT — but rejecting it here keeps an over-permissive plan
   * from silently riding into a future live provider_llm debate path. Absent plan (null/undefined): no-op.
   */
  private assertDebateExecutionPlanValid(
    nodeId: string,
    debate: TopicSelectionV1bRunCoordinatorDebateInput,
  ): void {
    if (debate.execution_plan == null) {
      return;
    }
    const validator = DEBATE_EXECUTION_PLAN_VALIDATORS[debate.kind];
    if (!validator(debate.execution_plan)) {
      const detail = (validator.errors ?? [])
        .map((error) => `${error.instancePath || '(root)'} ${error.message ?? ''}`.trim())
        .join('; ');
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `${nodeId}: node_inputs.debate.execution_plan is not a valid ${debate.kind} named execution plan: ${detail || 'schema validation failed'}.`,
      );
    }
  }

  /**
   * Idempotency guard: a debate records its non-authority role/context/audit + gate-draft rows BEFORE
   * the harness invoke. If the harness then rejects (no trace lands), a re-advance reuses the same
   * attempt id (attempt_count unchanged); reusing the recorded gate-draft descriptor via the marker
   * artifact instead of re-running avoids duplicating those rows (the control plane has no uniqueness
   * guard — same root cause as the Scheme-B note up top). Returns the descriptor or null.
   */
  private async findRecordedGateDraftForAttempt(
    workflowRunId: string,
    nodeId: string,
    attemptId: string,
  ): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef | null> {
    const artifacts = await this.deps.controlPlane.listArtifactRefsByWorkflowRunId(workflowRunId);
    for (const artifact of artifacts) {
      const payload = artifact.payload as Record<string, unknown> | null | undefined;
      if (
        payload?.marker === DEBATE_GATE_DRAFT_MARKER
        && payload.node_attempt_id === attemptId
        && payload.node_id === nodeId
      ) {
        return payload.gate_draft_semantic_artifact as TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
      }
    }
    return null;
  }

  /**
   * Run the caller-side debate runtime for a detected frontier and return the gate-facing draft
   * (runtime_verified, recorded under the node's model_draft_for_gate slot) for the coordinator to
   * ATTACH to the node's harness invocation — never re-recorded (recordDraftSemanticArtifact mints
   * fixture_replay, which the gate's runtime_verified branch rejects). Sets request.run_mode the same
   * way the runtimes resolve it so the attached artifact's run_mode matches the request. Idempotent.
   */
  private async runDebateForFrontier(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    debate: TopicSelectionV1bRunCoordinatorDebateInput,
  ): Promise<DebateOutcome> {
    const runMode: TopicSelectionAgentRunMode = debate.run_mode
      ?? request.run_mode
      ?? (debate.execution_mode === 'mocked_llm' ? 'test' : 'acceptance');
    // The attached gate-draft artifact carries this run_mode; the harness invoke must agree.
    request.run_mode = runMode;

    const reused = await this.findRecordedGateDraftForAttempt(
      request.workflow_run_id,
      request.node_id,
      request.node_attempt_id,
    );
    if (reused) {
      return { kind: 'ok', gateDraftArtifact: reused };
    }

    let gateDraftArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    if (debate.kind === 'n6_divergent') {
      const result = await this.deps.n6DivergentDebateRuntime.runDivergentDebate({
        request,
        generation_mode: debate.generation_mode,
        execution_mode: debate.execution_mode,
        run_mode: runMode,
        role_outputs: debate.role_outputs,
        // W-09 S4: forward the (optional) provider-diverse plan verbatim; absent -> the runtime resolves null.
        execution_plan: debate.execution_plan,
        created_by: request.created_by,
      });
      if (result.status !== 'completed' || result.gate_draft.status !== 'succeeded') {
        return { kind: 'blocked', message: this.debateBlockedMessage(N6_NODE_ID, result.status), blockers: this.extractDebateBlockers(result) };
      }
      gateDraftArtifact = result.gate_draft.semantic_artifact;
    } else {
      const result = await this.deps.n8BoundedDebateRuntime.runDebate({
        request,
        execution_mode: debate.execution_mode,
        run_mode: runMode,
        role_outputs: debate.role_outputs,
        // W-09 S4: forward the (optional) provider-diverse plan verbatim; absent -> the runtime resolves null.
        execution_plan: debate.execution_plan,
        created_by: request.created_by,
      });
      if (result.status !== 'completed' || result.gate_draft.status !== 'succeeded') {
        return { kind: 'blocked', message: this.debateBlockedMessage(N8_NODE_ID, result.status), blockers: this.extractDebateBlockers(result) };
      }
      gateDraftArtifact = result.gate_draft.semantic_artifact;
    }

    // One inert diagnostic marker so a re-advance after a harness rejection reuses this descriptor.
    await this.deps.controlPlane.recordArtifactRef({
      workspace_id: request.workspace_id ?? null,
      title_card_id: request.title_card_id ?? null,
      artifact_kind: 'diagnostic',
      storage_kind: 'inline',
      workflow_run_id: request.workflow_run_id,
      payload: {
        marker: DEBATE_GATE_DRAFT_MARKER,
        node_id: request.node_id,
        node_attempt_id: request.node_attempt_id,
        gate_draft_semantic_artifact: gateDraftArtifact,
      },
      created_by: request.created_by ?? 'system',
    });
    return { kind: 'ok', gateDraftArtifact };
  }

  /** D-T128-01 (A): projection opts for the SINGLE-AGENT N6 regeneration re-entry. The debate
   *  escalation route threads the gate-failure retry projection explicitly (advance body); the
   *  regenerate route gets the same projection here, pinned by the loopback_target_code
   *  discriminator so an escalation-route projection is never mis-attached.
   *
   *  Review fix (2026-07-03 adversarial pass): the check must be PENDING-aware, not run-lifetime
   *  presence-based. A stale regenerate projection attached to a FRESH N6 entry (e.g. after an N5
   *  slice-rollback re-drive) dead-ends BOTH draft variants — the runtime fail-closes an
   *  initial-variant draft on prompt-identity drift and a regenerate-variant draft on lineage-hash
   *  drift. Pending ⇔ N6's latest attempt looped back without the escalation warning (the regenerate
   *  default, mirroring pendingN6DebateEscalation) AND N5 has not re-admitted since (the
   *  pendingN8BoundedDebate seq comparison — an N5 re-drive makes the next N6 entry a fresh forward
   *  pass). Not pending → `{}` → request assembly byte-identical to pre-W-12. */
  private async n6RegenerateProjectionOpts(
    input: AdvanceTopicSelectionV1bRunInput,
    projection: TopicSelectionV1bRunStateProjection,
    nextNodeId: string,
  ): Promise<{ extraProjectionKind?: string; extraProjectionDiscriminator?: { key: string; value: string } }> {
    if (nextNodeId !== N6_NODE_ID || !this.pendingN6RegenerateLoopback(projection)) {
      return {};
    }
    const artifacts = await this.deps.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
    const recorded = artifacts.some((artifact) => {
      const payload = artifact.payload as Record<string, unknown> | null | undefined;
      return payload?.projection_kind === N6_GATE_FAILURE_PROJECTION_KIND
        && payload?.loopback_target_code === 'n6_regenerate_candidates';
    });
    return recorded
      ? {
        extraProjectionKind: N6_GATE_FAILURE_PROJECTION_KIND,
        extraProjectionDiscriminator: { key: 'loopback_target_code', value: 'n6_regenerate_candidates' },
      }
      : {};
  }

  /** The single-agent twin of pendingN6DebateEscalation: N6 most-recently looped back WITHOUT the
   *  escalation warning (= the regenerate default route), and N5 has NOT re-admitted since — an N5
   *  re-admission (slice rollback re-drive) means the coming N6 entry is a fresh forward pass whose
   *  draft must NOT carry the stale gate-failure retry projection. */
  private pendingN6RegenerateLoopback(projection: TopicSelectionV1bRunStateProjection): boolean {
    const latest = projection.nodes.find((node) => node.node_id === N6_NODE_ID)?.latest;
    if (!latest || latest.route_decision !== 'loopback') {
      return false;
    }
    if (latest.warnings.some((warning) => warning.code === N6_DEBATE_ESCALATION_WARNING_CODE)) {
      return false;
    }
    const n5Admitted = projection.nodes.find((node) => node.node_id === N5_NODE_ID)?.latest_admitted;
    return !(n5Admitted && n5Admitted.seq > latest.seq);
  }

  private debateBlockedMessage(nodeId: string, status: string): string {
    return `${nodeId} caller-side debate did not complete (status=${status}); fix the per-role debate fixtures (codex_response/mocked_output) and advance again.`;
  }

  /** Defensive: surface the {code,message} issues a non-completed debate result exposes for the
   *  debate_blocked halt. Two real shapes: admission_blocked carries result.admission.blocker
   *  ({code,message}); role_blocked carries the failing role-turn codes one level deeper and in a
   *  DIFFERENT shape — result.loop.turn.invocation_result.blocker_codes (string[]) + error_code — so
   *  that path is pulled explicitly (the generic {code} scan alone misses it). Empty when none present. */
  private extractDebateBlockers(result: unknown): Array<{ code: string; message: string }> {
    const out: Array<{ code: string; message: string }> = [];
    const asRecord = (value: unknown): Record<string, unknown> | null =>
      value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
    const push = (code: string, message: string): void => {
      if (code && !out.some((existing) => existing.code === code)) {
        out.push({ code, message });
      }
    };
    const visit = (value: unknown): void => {
      const record = asRecord(value);
      if (record && typeof record.code === 'string') {
        push(record.code, typeof record.message === 'string' ? record.message : '');
      }
    };
    const scan = (value: unknown): void => {
      const record = asRecord(value);
      if (!record) {
        return;
      }
      visit(record.blocker);
      for (const key of ['blockers', 'issues'] as const) {
        const arr = record[key];
        if (Array.isArray(arr)) {
          arr.forEach(visit);
        }
      }
    };
    const root = asRecord(result);
    scan(root);
    scan(root?.admission);
    scan(root?.loop);
    // role_blocked: result.loop.turn.invocation_result.{blocker_codes[], error_code}.
    const invocation = asRecord(asRecord(root?.loop)?.turn)?.invocation_result;
    const inv = asRecord(invocation);
    if (inv) {
      const detail = typeof inv.error_message === 'string' ? inv.error_message : '';
      if (Array.isArray(inv.blocker_codes)) {
        for (const code of inv.blocker_codes) {
          if (typeof code === 'string') {
            push(code, detail);
          }
        }
      }
      if (typeof inv.error_code === 'string') {
        push(inv.error_code, detail);
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- request assembly

  /**
   * DP-3.6: resolve the upstream feedback re-entry for a node whose recipe declares one, when the
   * configured loopback source has an UNCONSUMED loopback (a loopback newer than this node's last
   * admission — a consumed one would have advanced this node past it). Returns the feedback artifact
   * ref + the record/payload hashes the node's feedback parser validates against, or null when no
   * such loopback is pending (the normal forward/initial recipe then applies).
   */
  /** An UNCONSUMED downstream loopback that re-enters targetNodeId in feedback mode (or null). Sync,
   *  artifact-free — the single detection shared by buildNextRequest's frozen-input assembly and the
   *  advance loop's support-input requirement, so the two can never disagree on whether N7 is a
   *  feedback re-entry. */
  private pendingFeedbackLoopback(
    projection: TopicSelectionV1bRunStateProjection,
    targetNodeId: string,
  ): { cfg: NonNullable<(typeof HANDOFF_BUILDER_TABLE)[string]['feedback_reentry']>; loopback: TopicSelectionV1bRunNodeAttemptSnapshot } | null {
    const cfg = HANDOFF_BUILDER_TABLE[targetNodeId]?.feedback_reentry;
    if (!cfg) {
      return null;
    }
    const loopback = projection.nodes.find((node) => node.node_id === cfg.loopback_source_node_id)?.latest;
    if (!loopback || loopback.route_decision !== 'loopback') {
      return null;
    }
    const lastAdmittedSeq = projection.nodes.find((node) => node.node_id === targetNodeId)?.latest_admitted?.seq ?? -1;
    if (loopback.seq <= lastAdmittedSeq) {
      return null;
    }
    return { cfg, loopback };
  }

  /** The support_only slot a feedback re-entry of targetNodeId requires from the caller (or null). */
  private feedbackReentrySupportSlotId(
    projection: TopicSelectionV1bRunStateProjection,
    targetNodeId: string,
  ): string | null {
    return this.pendingFeedbackLoopback(projection, targetNodeId)?.cfg.support_slot_id ?? null;
  }

  private async resolveFeedbackReentry(
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
    const pending = this.pendingFeedbackLoopback(projection, targetNodeId);
    if (!pending) {
      return null;
    }
    const { cfg, loopback } = pending;
    if (!loopback.authority_ref || !loopback.authority_hash) {
      // W-04 feedback pre-flight: the loopback carries no feedback artifact ref/hash — fail-fast
      // with a structured halt naming the source node, not a raw 500.
      throw new CoordinatorPreconditionHalt('feedback_artifact_missing', `feedback loopback from ${cfg.loopback_source_node_id} is missing its feedback artifact ref/hash for ${targetNodeId} re-entry; re-run ${cfg.loopback_source_node_id} so it records the feedback artifact, then advance again.`);
    }
    const artifact = await this.deps.controlPlane.getArtifactRef(loopback.authority_ref.ref_id);
    if (!artifact) {
      throw new CoordinatorPreconditionHalt('feedback_artifact_missing', `feedback artifact ${loopback.authority_ref.ref_id} for ${targetNodeId} re-entry was not found in the run; it must be persisted before the feedback re-entry can be assembled.`);
    }
    return {
      inputMode: cfg.input_mode,
      refKey: cfg.feedback_ref_key,
      recordHashKey: cfg.feedback_record_hash_key,
      payloadHashKey: cfg.feedback_payload_hash_key,
      feedbackRef: loopback.authority_ref,
      // The harness re-entry validates n8_feedback_hash === hash(artifact record) and
      // n8_feedback_payload_hash === hash(payload); reproduce the first via canonicalHash — the exact
      // single source the harness `hash()` delegates to — and reuse the loopback's authority_hash
      // (which IS hash(feedback payload)) for the second.
      recordHash: canonicalHash(artifact),
      payloadHash: loopback.authority_hash,
    };
  }

  private async buildNextRequest(
    input: AdvanceTopicSelectionV1bRunInput,
    projection: TopicSelectionV1bRunStateProjection,
    nextNodeId: string,
    // A debate frontier needs a projection the node's forward recipe does not declare (the N6
    // divergent debate re-entry requires the gate-failure retry projection that only exists on the
    // escalation loopback). Threaded here, request-specific, so the forward N6 pass stays unaffected.
    // extraProjectionDiscriminator pins a second field (the gate-failure projection's
    // loopback_target_code) because the single-agent regenerate projection shares its projection_kind:
    // it makes the pick intent-explicit + deterministic rather than relying on created_at recency
    // (which has no tiebreak), and fails closed if only a stale regenerate projection exists.
    opts: { extraProjectionKind?: string; extraProjectionDiscriminator?: { key: string; value: string } } = {},
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
      // W-04 upstream-blocked: the recipe needs the predecessor's admitted handoff lineage, but no
      // admitted upstream node carries it yet — structured halt instead of a raw 500.
      throw new CoordinatorPreconditionHalt('upstream_blocked', `cannot assemble ${nextNodeId}: its upstream predecessor has no admitted handoff lineage yet — re-admit the upstream node, then advance again.`);
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
    const feedbackReentry = await this.resolveFeedbackReentry(projection, nextNodeId);
    if (feedbackReentry) {
      payload.input_mode = feedbackReentry.inputMode;
      payload[feedbackReentry.refKey] = feedbackReentry.feedbackRef;
      payload[feedbackReentry.recordHashKey] = feedbackReentry.recordHash;
      payload[feedbackReentry.payloadHashKey] = feedbackReentry.payloadHash;
    }
    for (const extra of recipe.extra_payload_authorities ?? []) {
      const upstream = projection.nodes.find((node) => node.node_id === extra.node_id)?.latest_admitted;
      if (!upstream?.authority_ref || !upstream.authority_hash) {
        // W-04 upstream-blocked: the recipe needs an upstream authority that is not admitted yet.
        throw new CoordinatorPreconditionHalt('upstream_blocked', `cannot assemble ${nextNodeId}: required upstream authority ${extra.ref_key} from ${extra.node_id} is not admitted yet — drive ${extra.node_id}, then advance again.`);
      }
      payload[extra.ref_key] = upstream.authority_ref;
      payload[extra.hash_key] = upstream.authority_hash;
    }
    for (const extra of recipe.extra_handoff_hashes ?? []) {
      const upstream = projection.nodes.find((node) => node.node_id === extra.node_id)?.latest_admitted;
      if (!upstream?.handoff_hash) {
        // W-04 upstream-blocked: the recipe needs an upstream handoff hash that is not admitted yet.
        throw new CoordinatorPreconditionHalt('upstream_blocked', `cannot assemble ${nextNodeId}: required upstream handoff hash ${extra.key} from ${extra.node_id} is not admitted yet — drive ${extra.node_id}, then advance again.`);
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
    // The forward recipe's projection (e.g. N8's n7_to_n8 context) OR a request-specific extra
    // projection (the N6 debate re-entry's gate-failure retry context) — at most one applies per node.
    const projectionKind = recipe.required_projection_kind ?? opts.extraProjectionKind;
    if (projectionKind) {
      const discriminator = recipe.required_projection_kind ? undefined : opts.extraProjectionDiscriminator;
      const artifacts = await this.deps.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
      let projectionArtifact: (typeof artifacts)[number] | null = null;
      for (const artifact of artifacts) {
        const artifactPayload = artifact.payload as Record<string, unknown> | null | undefined;
        if (artifactPayload?.projection_kind !== projectionKind) {
          continue;
        }
        // Disambiguate projections that share a projection_kind (the N6 gate-failure retry context
        // backs both the single-agent regenerate and the divergent-debate escalation): require the
        // pinned discriminator so the wrong-route projection is never mis-selected on a created_at tie.
        if (discriminator && artifactPayload?.[discriminator.key] !== discriminator.value) {
          continue;
        }
        if (!projectionArtifact || String(artifact.created_at) >= String(projectionArtifact.created_at)) {
          projectionArtifact = artifact;
        }
      }
      if (!projectionArtifact) {
        // W-04 upstream-blocked: the required runtime-context projection has not been recorded yet —
        // structured halt naming the projection kind instead of a raw 500.
        throw new CoordinatorPreconditionHalt(
          'upstream_blocked',
          `cannot assemble ${nextNodeId}: required runtime projection ${projectionKind}${discriminator ? ` (${discriminator.key}=${discriminator.value})` : ''} has not been recorded yet — drive the upstream node, then advance again.`,
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
        frozen_input_hash: canonicalHash(frozenInput),
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
    targetSlotId?: string,
    // Diagnostic provenance label — 'caller_draft' for a model draft, 'caller_support' for a recorded
    // support_only artifact (so the inert provenance row reflects support vs draft; nothing reads it).
    sourceLabel: string = 'run_coordinator_caller_draft',
  ): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
    // Slot metadata comes from the node policy (SSOT). Default: the single model-draft-for-gate slot
    // (a node without one does not accept caller drafts). targetSlotId selects a specific support
    // slot instead — used for the feedback re-entry's required support_only artifact (the recorded
    // ref carries that slot's allowed_effect, so a support_only slot is recorded as support_only).
    const slots = POLICY_BY_NODE_ID.get(nodeId)?.semantic_support_slots;
    const slot = targetSlotId
      ? slots?.find((candidate) => candidate.slot_id === targetSlotId)
      : slots?.find((candidate) => candidate.allowed_effect === 'model_draft_for_gate');
    if (!slot) {
      throw new AppError(400, 'INVALID_PAYLOAD', targetSlotId
        ? `${nodeId} has no semantic support slot ${targetSlotId}.`
        : `${nodeId} does not accept caller-supplied drafts.`);
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
      record({ adapter_policy_version: POLICY_VERSION, source: sourceLabel }, 'diagnostic'),
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
      allowed_effect: slot.allowed_effect,
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

  /**
   * Record each caller-supplied support_only payload (node_inputs[...].support_payloads) under its
   * named slot and return the descriptors to ATTACH to the node request. Reuses
   * recordDraftSemanticArtifact's targetSlotId path (one fixture_replay structured_output artifact
   * backing the support/normalized refs), so the recorded run_mode/provenance match the existing
   * caller-draft + feedback-support recording exactly. Guards that the slot is support_only — a
   * model_draft_for_gate slot must travel on draft_payload, not here (else a second draft would
   * shadow the real one at the gate). The motivating slot is N6 `n6_loopback_triage`.
   */
  private async recordSupportSemanticArtifacts(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    nodeId: string,
    supportPayloads: Record<string, Record<string, unknown>>,
    createdBy: AdvanceTopicSelectionV1bRunInput['created_by'],
  ): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef[]> {
    const slots = POLICY_BY_NODE_ID.get(nodeId)?.semantic_support_slots;
    // Slots already on the request (the draft, incl. a feedback re-entry recorded under a support slot):
    // a support_payloads entry must not re-target one, or the harness keeps only the first per slot.
    const attachedSlotIds = new Set<string>((request.semantic_artifacts ?? []).map((artifact) => artifact.slot_id));
    const recorded: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef[] = [];
    for (const [slotId, payload] of Object.entries(supportPayloads)) {
      const slot = slots?.find((candidate) => candidate.slot_id === slotId);
      if (!slot) {
        throw new AppError(400, 'INVALID_PAYLOAD', `${nodeId} has no semantic support slot ${slotId}.`);
      }
      if (slot.allowed_effect !== 'support_only') {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `${nodeId} slot ${slotId} has allowed_effect=${slot.allowed_effect}, not support_only; a model-draft slot must be supplied via draft_payload, not support_payloads.`,
        );
      }
      if (attachedSlotIds.has(slotId)) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `${nodeId} slot ${slotId} is already populated (by draft_payload, e.g. a feedback re-entry support); do not also supply it via support_payloads — the harness keeps only the first artifact per slot.`,
        );
      }
      attachedSlotIds.add(slotId);
      recorded.push(await this.recordDraftSemanticArtifact(request, nodeId, payload, createdBy, slotId, 'run_coordinator_caller_support'));
    }
    return recorded;
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
