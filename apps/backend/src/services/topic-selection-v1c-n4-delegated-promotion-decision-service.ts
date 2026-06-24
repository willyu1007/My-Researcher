/**
 * T-128 W-13 — v1c-N4 delegated promotion-decision PRODUCTION caller.
 *
 * The node audit (wf_034f15eb) confirmed the v1c-N4 delegated runtime + admission classes had NO production caller
 * (only the provider canary, via an inline orchestrator call that bypassed admission). This is the real caller.
 *
 * Delegated-promotion lets an agent DRAFT the promotion-decision content (kind/rationale/conditions/loopback/...)
 * via codex_assisted; a HUMAN still authorizes it. The authority boundary is enforced by construction:
 *   - human_actor comes from the authenticated REQUEST, never from the agent's codex_response;
 *   - admission re-asserts human_actor.actor_type === 'human' and forbids authority-write keys on the candidate;
 *   - the resulting decision carries a delegated_decision_provenance marker so it is auditable + distinguishable
 *     from a fully-human decision (non-impersonation);
 *   - a PROMOTE-class delegated draft (which can drive a real PaperProjectBridge once authorized) requires an
 *     explicit human re-confirmation flag (promote_reconfirmed: true).
 *
 * Flow: gate handoff -> runtime.generateCandidate (codex_assisted, operator-supplied) -> [promote re-confirm gate]
 *   -> admission.admit (human_actor from request; NEVER bypassed) -> humanPromotionDecisionService
 *   .recordHumanPromotionDecision(create_input + provenance marker).
 */
import { AppError } from '../errors/app-error.js';
import {
  TOPIC_SELECTION_PROMOTE_CLASS_DECISIONS,
  type TopicSelectionHumanPromotionDecisionKind,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import type {
  TopicSelectionActorRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionCodexAssistedAgentOutput,
} from './topic-selection-agent-orchestrator-service.js';
import type {
  TopicSelectionV1cDelegatedPromotionDecisionCandidate,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import type { TopicSelectionV1cN4DelegatedPromotionDecisionRuntimeService } from './topic-selection-v1c-n4-delegated-promotion-decision-runtime-service.js';
import type { TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionService } from './topic-selection-v1c-n4-delegated-promotion-decision-admission-service.js';
import type { TopicSelectionV1cPromotionGateService } from './topic-selection-v1c-promotion-gate-service.js';
import type { TopicSelectionV1cHumanPromotionDecisionService } from './topic-selection-v1c-human-promotion-decision-service.js';

const PROMOTE_CLASS_DECISIONS = new Set<TopicSelectionHumanPromotionDecisionKind>(TOPIC_SELECTION_PROMOTE_CLASS_DECISIONS);

export interface RecordDelegatedPromotionDecisionInput {
  promotion_gate_check_id: string;
  workflow_run_id: string;
  node_attempt_id: string;
  /** The authorizing human — MUST come from the authenticated request, never from the agent. */
  human_actor: TopicSelectionActorRef;
  /** The operator-supplied (codex_assisted) delegated decision candidate. */
  codex_response: TopicSelectionCodexAssistedAgentOutput<TopicSelectionV1cDelegatedPromotionDecisionCandidate>;
  workspace_id?: string | null;
  policy_version_id?: string | null;
  /** Required true when the delegated candidate is promote-class — explicit human re-confirmation. */
  promote_reconfirmed?: boolean;
}

export interface TopicSelectionV1cN4DelegatedPromotionDecisionServiceDeps {
  runtime: TopicSelectionV1cN4DelegatedPromotionDecisionRuntimeService;
  admission: TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionService;
  gateService: TopicSelectionV1cPromotionGateService;
  humanPromotionDecisionService: TopicSelectionV1cHumanPromotionDecisionService;
}

type RecordHumanPromotionDecisionResult =
  Awaited<ReturnType<TopicSelectionV1cHumanPromotionDecisionService['recordHumanPromotionDecision']>>;

export class TopicSelectionV1cN4DelegatedPromotionDecisionService {
  constructor(private readonly deps: TopicSelectionV1cN4DelegatedPromotionDecisionServiceDeps) {}

  async recordDelegatedPromotionDecision(
    input: RecordDelegatedPromotionDecisionInput,
  ): Promise<RecordHumanPromotionDecisionResult> {
    // Authority boundary, fail fast: a delegated decision is still HUMAN-authorized. The agent never supplies the
    // actor. (Admission re-asserts this; surfacing it early gives a clear error.)
    if (input.human_actor.actor_type !== 'human') {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'A delegated promotion decision still requires a human authorizer (human_actor.actor_type must be "human").',
        { actor_type: input.human_actor.actor_type },
      );
    }

    const gateHandoff = await this.deps.gateService.getPromotionGateHandoff(input.promotion_gate_check_id);

    const generated = await this.deps.runtime.generateCandidate({
      gate_handoff: gateHandoff,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      model_option_id: null,
      codex_response: input.codex_response,
      created_by: 'system',
    });
    if (generated.status !== 'succeeded') {
      throw new AppError(422, 'INVALID_PAYLOAD', 'Delegated promotion-decision candidate generation did not succeed.', {
        blocker_codes: generated.invocation_result.blocker_codes,
        error_code: generated.invocation_result.error_code ?? null,
      });
    }

    // A PROMOTE-class delegated draft can set bridge_eligible + drive a real PaperProjectBridge once authorized,
    // so it requires explicit human re-confirmation (the user-locked safety gate).
    if (PROMOTE_CLASS_DECISIONS.has(generated.structured_output.decision) && input.promote_reconfirmed !== true) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'A promote-class delegated decision requires explicit human re-confirmation (promote_reconfirmed: true).',
        { decision: generated.structured_output.decision },
      );
    }

    // LOAD-BEARING: admit (the canary skipped it). human_actor comes from the request; admission re-asserts the
    // human boundary + forbids authority-write keys + verifies the runtime candidate identity.
    const admitted = this.deps.admission.admit({
      gate_handoff: gateHandoff,
      candidate_artifact: generated.candidate_artifact,
      candidate: generated.structured_output,
      human_actor: input.human_actor,
      workspace_id: input.workspace_id ?? null,
      policy_version_id: input.policy_version_id ?? null,
    });
    if (!admitted.admitted) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', admitted.blocker.message, {
        blocker_code: admitted.blocker.code,
        ...(admitted.blocker.details ?? {}),
      });
    }

    // Record via the existing human authority writer, stamping the delegated-provenance marker so the decision is
    // auditable + never indistinguishable from a fully-human one. The marker travels on the writer's INTERNAL-ONLY
    // second argument (not on create_input) — that channel is the only way to set it, so a pure-human caller hitting
    // POST /promotion-decisions cannot smuggle a fabricated provenance through the (additionalProperties:true) body.
    return this.deps.humanPromotionDecisionService.recordHumanPromotionDecision(
      admitted.create_input,
      {
        delegatedDecisionProvenance: {
          source: 'codex_delegated',
          admission_identity_hash: admitted.admission_identity_hash,
        },
      },
    );
  }
}
