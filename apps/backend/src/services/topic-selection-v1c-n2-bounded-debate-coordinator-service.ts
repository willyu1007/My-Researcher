/**
 * T-128 W-13 — v1c-N2 bounded micro-debate PRODUCTION caller.
 *
 * The node audit (wf_034f15eb) confirmed the v1c-N2 bounded-debate runtime + admission classes had NO production
 * caller: only the provider canary self-proved them, and it did so by calling the orchestrator INLINE, bypassing
 * the admission class entirely — exactly where the per-role schema_version pin + forbidden-authority / ref-bounds /
 * critic-resolution / final-semantic-layer checks live.
 *
 * This coordinator is the real caller. It sits ABOVE the gate service (it does NOT add a control-plane/runtime
 * dependency to the gate), mirroring the wired N8 bounded-debate caller shape:
 *   handoff -> for each role slot (in order): runtime.generateRoleArtifact (execution_mode 'codex_assisted',
 *   operator-supplied output, prior artifacts threaded append-only) -> collect candidate -> admission.admit
 *   (the load-bearing verification — NEVER short-circuited) -> on admit, feed the EXISTING verified-runtime-draft
 *   gate entry createPromotionDecisionSupportFromVerifiedRuntimeDraft, which persists exactly like the single-agent
 *   support path. It stops at support persistence (the existing POST /promotion-gate-checks runs the gate check).
 *
 * codex_assisted is the honest non-provider path: the operator hands each role's structured output in the request
 * body and the orchestrator returns it verbatim (no LLM call) — so callers/tests need no provider. The 4 role
 * outputs must satisfy admission's deep checks; a bad output yields an admit blocker (surfaced as an AppError),
 * never silent persistence.
 */
import { AppError } from '../errors/app-error.js';
import {
  TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER,
  type TopicSelectionV1cN2BoundedDebateAdmissionService,
  type TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate,
  type TopicSelectionV1cN2BoundedDebateRoleArtifact,
  type TopicSelectionV1cN2BoundedDebateRoleOutput,
  type TopicSelectionV1cN2BoundedDebateRoleSlotId,
} from './topic-selection-v1c-n2-bounded-debate-admission-service.js';
import type {
  TopicSelectionV1cN2BoundedDebateRoleGenerationResult,
  TopicSelectionV1cN2BoundedDebateRuntimeService,
} from './topic-selection-v1c-n2-bounded-debate-runtime-service.js';
import type {
  TopicSelectionPromotionInputHandoffProvider,
  TopicSelectionV1cPromotionDecisionSupportCreationResult,
  TopicSelectionV1cPromotionGateService,
} from './topic-selection-v1c-promotion-gate-service.js';
import type { TopicSelectionActorType } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

type SucceededRoleGeneration = Extract<TopicSelectionV1cN2BoundedDebateRoleGenerationResult, { status: 'succeeded' }>;

export interface CreatePromotionDecisionSupportFromBoundedDebateInput {
  promotion_input_snapshot_id: string;
  workspace_id?: string | null;
  created_by?: TopicSelectionActorType;
  policy_version_id?: string | null;
  workflow_run_id: string;
  node_attempt_id: string;
  /** Operator-supplied (codex_assisted) structured output per role slot, keyed by the 4 slot ids. */
  debate_role_outputs: Record<TopicSelectionV1cN2BoundedDebateRoleSlotId, TopicSelectionV1cN2BoundedDebateRoleOutput>;
  operator_label?: string;
}

export interface TopicSelectionV1cN2BoundedDebateCoordinatorDeps {
  runtime: TopicSelectionV1cN2BoundedDebateRuntimeService;
  admission: TopicSelectionV1cN2BoundedDebateAdmissionService;
  gateService: TopicSelectionV1cPromotionGateService;
  /** Same handoff provider the gate service uses, so the coordinator can pre-fetch the ready-for-gate handoff. */
  promotionInputService: TopicSelectionPromotionInputHandoffProvider;
}

const FINAL_SLOT =
  TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER[TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER.length - 1];

// Make the coupling explicit (review nit): the coordinator selects the final turn by role-order position, while
// admission + the gate key off the literal synthesizer_final slot. They agree only because ROLE_ORDER ends with it;
// a reorder without updating this would otherwise diverge (it fails closed at the gate, but pin it loudly here).
if (FINAL_SLOT !== 'n2_bounded_micro_debate.synthesizer_final') {
  throw new Error(`N2 bounded-debate ROLE_ORDER must end with synthesizer_final; got ${FINAL_SLOT}.`);
}

export class TopicSelectionV1cN2BoundedDebateCoordinatorService {
  constructor(private readonly deps: TopicSelectionV1cN2BoundedDebateCoordinatorDeps) {}

  async createPromotionDecisionSupportFromBoundedDebate(
    input: CreatePromotionDecisionSupportFromBoundedDebateInput,
  ): Promise<TopicSelectionV1cPromotionDecisionSupportCreationResult> {
    const handoff = await this.deps.promotionInputService.getPromotionInputHandoff(input.promotion_input_snapshot_id);
    const operatorLabel = input.operator_label ?? 'operator-supplied-bounded-debate';

    const priorArtifacts: TopicSelectionV1cN2BoundedDebateRoleArtifact[] = [];
    const candidates: TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate[] = [];
    let finalGeneration: SucceededRoleGeneration | null = null;

    for (const slot of TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER) {
      const output = input.debate_role_outputs[slot];
      if (!output) {
        throw new AppError(400, 'INVALID_PAYLOAD', `Missing debate role output for slot ${slot}.`, { slot });
      }
      const generated = await this.deps.runtime.generateRoleArtifact({
        handoff,
        slot_id: slot,
        prior_role_artifacts: priorArtifacts,
        workflow_run_id: input.workflow_run_id,
        node_attempt_id: input.node_attempt_id,
        execution_mode: 'codex_assisted',
        run_mode: 'acceptance',
        model_option_id: null,
        codex_response: { output, operator_label: operatorLabel },
        created_by: 'system',
      });
      if (generated.status !== 'succeeded') {
        throw new AppError(422, 'INVALID_PAYLOAD', `N2 bounded-debate role generation did not succeed for slot ${slot}.`, {
          slot,
          blocker_codes: generated.invocation_result.blocker_codes,
          error_code: generated.invocation_result.error_code ?? null,
        });
      }
      candidates.push({ artifact: generated.role_artifact, structured_output: generated.structured_output });
      priorArtifacts.push(generated.role_artifact);
      if (slot === FINAL_SLOT) {
        finalGeneration = generated;
      }
    }

    // LOAD-BEARING: every role MUST pass through admit (the canary skipped this; the schema_version pin + the
    // forbidden-authority / ref-bounds / critic-resolution / final-semantic-layer checks live ONLY here).
    const admitted = this.deps.admission.admit({ handoff, role_results: candidates });
    if (!admitted.admitted) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', admitted.blocker.message, {
        blocker_code: admitted.blocker.code,
        ...(admitted.blocker.details ?? {}),
      });
    }
    if (!finalGeneration) {
      throw new AppError(422, 'INVALID_PAYLOAD', 'N2 bounded-debate produced no synthesizer_final turn.');
    }

    // Feed the EXISTING verified-runtime-draft gate entry — the final artifact's provenance/audit_snapshot match
    // the admission_identity by construction, so assertVerifiedRuntimeDraft holds; persistence is identical to the
    // wired single-agent support path.
    return this.deps.gateService.createPromotionDecisionSupportFromVerifiedRuntimeDraft({
      promotion_input_snapshot_id: input.promotion_input_snapshot_id,
      workspace_id: input.workspace_id ?? null,
      ...(input.created_by ? { created_by: input.created_by } : {}),
      policy_version_id: input.policy_version_id ?? null,
      verified_runtime_draft: {
        draft: admitted.promotion_support_draft,
        provenance: finalGeneration.invocation_result.provenance,
        audit_snapshot: finalGeneration.invocation_result.audit_snapshot,
        admission_identity: admitted.admission_identity,
        admission_identity_hash: admitted.admission_identity_hash,
      },
    });
  }
}
