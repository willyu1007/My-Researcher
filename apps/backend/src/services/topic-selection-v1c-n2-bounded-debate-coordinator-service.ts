/** Four ordered non-provider roles produce admitted support; N3 and Human authority stay separate. */
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import type { TopicSelectionPromotionInputSnapshotHandoff } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-input-contracts';
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
  debate_role_outputs?: Record<TopicSelectionV1cN2BoundedDebateRoleSlotId, TopicSelectionV1cN2BoundedDebateRoleOutput>;
  operator_label?: string;
  execution_spec?: { execution_mode: 'codex_cli'; model_option_id?: null } | null;
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

type ActiveDebate = { requestHash: string; result: Promise<TopicSelectionV1cPromotionDecisionSupportCreationResult> };
const activeDebates = new WeakMap<TopicSelectionV1cPromotionGateService, Map<string, ActiveDebate>>();

export class TopicSelectionV1cN2BoundedDebateCoordinatorService {
  constructor(private readonly deps: TopicSelectionV1cN2BoundedDebateCoordinatorDeps) {}

  async createPromotionDecisionSupportFromBoundedDebate(
    input: CreatePromotionDecisionSupportFromBoundedDebateInput,
  ): Promise<TopicSelectionV1cPromotionDecisionSupportCreationResult> {
    input = structuredClone(input);
    const handoff = structuredClone(await this.deps.promotionInputService.getPromotionInputHandoff(input.promotion_input_snapshot_id));
    if (input.workspace_id && input.workspace_id !== handoff.snapshot.workspace_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Promotion Debate workspace does not match its input snapshot.');
    }
    const cli = input.execution_spec != null;
    if (cli && (input.execution_spec?.execution_mode !== 'codex_cli' || input.execution_spec.model_option_id != null
      || input.debate_role_outputs != null || input.operator_label != null)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'CLI Debate forbids external role outputs, operator labels and model overrides.');
    }
    if (!input.workflow_run_id?.trim() || !input.node_attempt_id?.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Promotion Debate requires stable workflow and attempt IDs.');
    }
    const slots = Object.keys(input.debate_role_outputs ?? {});
    if (!cli && (slots.length !== TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER.length
      || TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER.some((slot) => !input.debate_role_outputs?.[slot]))) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Promotion Debate requires exactly the four role outputs.');
    }
    const supportRunKey = canonicalHash(['v1c-n2-bounded-debate-v1', input.promotion_input_snapshot_id,
      input.workflow_run_id, input.node_attempt_id]);
    const requestHash = canonicalHash({
      ...input,
      workspace_id: input.workspace_id ?? null,
      policy_version_id: input.policy_version_id ?? null,
      created_by: input.created_by ?? 'system',
      operator_label: input.operator_label ?? 'operator-supplied-bounded-debate',
      handoff,
      ...(cli ? { cli_runtime: this.deps.runtime.cliExecutionIdentity } : {}),
    });
    let active = activeDebates.get(this.deps.gateService);
    if (!active) {
      active = new Map();
      activeDebates.set(this.deps.gateService, active);
    }
    const flight = active.get(supportRunKey);
    if (flight) {
      if (flight.requestHash !== requestHash) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Promotion Debate attempt is executing different input.');
      }
      return flight.result;
    }
    const result = this.deps.gateService.findBoundedDebateReplay(supportRunKey, requestHash)
      .then((existing) => existing ?? this.execute(input, handoff, supportRunKey, requestHash));
    active.set(supportRunKey, { requestHash, result });
    try {
      return await result;
    } finally {
      active.delete(supportRunKey);
    }
  }

  private async execute(
    input: CreatePromotionDecisionSupportFromBoundedDebateInput,
    handoff: TopicSelectionPromotionInputSnapshotHandoff,
    supportRunKey: string,
    requestHash: string,
  ): Promise<TopicSelectionV1cPromotionDecisionSupportCreationResult> {
    const operatorLabel = input.operator_label ?? 'operator-supplied-bounded-debate';

    const priorArtifacts: TopicSelectionV1cN2BoundedDebateRoleArtifact[] = [];
    const candidates: TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate[] = [];
    let finalGeneration: SucceededRoleGeneration | null = null;

    for (const slot of TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER) {
      const output = input.debate_role_outputs?.[slot];
      const generated = await this.deps.runtime.generateRoleArtifact({
        handoff,
        slot_id: slot,
        prior_role_artifacts: priorArtifacts,
        workflow_run_id: input.workflow_run_id,
        node_attempt_id: input.node_attempt_id,
        execution_mode: input.execution_spec ? 'codex_cli' : 'codex_assisted',
        run_mode: 'product',
        model_option_id: null,
        codex_response: output ? { output, operator_label: operatorLabel } : null,
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
    const admitted = await this.deps.admission.admit({ handoff, role_results: candidates });
    if (!admitted.admitted) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', admitted.blocker.message, {
        blocker_code: admitted.blocker.code,
        ...(admitted.blocker.details ?? {}),
      });
    }
    if (!finalGeneration) {
      throw new AppError(422, 'INVALID_PAYLOAD', 'N2 bounded-debate produced no synthesizer_final turn.');
    }

    if (input.execution_spec && canonicalHash(await this.deps.promotionInputService.getPromotionInputHandoff(input.promotion_input_snapshot_id)) !== canonicalHash(handoff)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Promotion Debate handoff changed before support commit.');
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
        execution: {
          support_run_key: supportRunKey,
          request_hash: requestHash,
          role_artifacts: priorArtifacts,
        },
      },
    });
  }
}
