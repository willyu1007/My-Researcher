import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import type { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type { TopicSelectionV1cN4DelegatedPromotionDecisionCandidateGenerationResult } from './topic-selection-v1c-n4-delegated-promotion-decision-runtime-service.js';
/** Codex drafts a persisted candidate; exact Human acceptance uses the existing authority writer. */
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
  /** The authorizing human — MUST come from the explicit acceptance request, never from the agent. */
  human_actor: TopicSelectionActorRef;
  /** The operator-supplied (codex_assisted) delegated decision candidate. */
  codex_response?: TopicSelectionCodexAssistedAgentOutput<TopicSelectionV1cDelegatedPromotionDecisionCandidate>;
  workspace_id?: string | null;
  policy_version_id?: string | null;
  /** Required true when the delegated candidate is promote-class — explicit human re-confirmation. */
  promote_reconfirmed?: boolean;
  candidate_receipt_ref?: TopicSelectionFunctionalRef;
  confirmed_candidate_hash?: string;
  condition_owners?: Array<{ condition_id: string; owner: TopicSelectionActorRef }>;
}

export interface TopicSelectionV1cN4DelegatedPromotionDecisionServiceDeps {
  controlPlane?: TopicSelectionControlPlaneService;
  runtime: TopicSelectionV1cN4DelegatedPromotionDecisionRuntimeService;
  admission: TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionService;
  gateService: Pick<TopicSelectionV1cPromotionGateService, 'getPromotionGateHandoff'>;
  humanPromotionDecisionService: TopicSelectionV1cHumanPromotionDecisionService;
}

type RecordHumanPromotionDecisionResult =
  Awaited<ReturnType<TopicSelectionV1cHumanPromotionDecisionService['recordHumanPromotionDecision']>>;

export interface GenerateDelegatedPromotionCandidateInput {
  promotion_gate_check_id: string;
  workflow_run_id: string;
  node_attempt_id: string;
  execution_spec: { execution_mode: 'codex_cli'; model_option_id?: null };
  policy_version_id?: string | null;
}

type SucceededCandidate = Extract<TopicSelectionV1cN4DelegatedPromotionDecisionCandidateGenerationResult, { status: 'succeeded' }>;
const CANDIDATE_RECEIPT = 'TopicSelectionV1cDelegatedCandidateReceipt@v1';
type CandidateReceipt = { schema_version: typeof CANDIDATE_RECEIPT; input: GenerateDelegatedPromotionCandidateInput;
  request_hash: string; handoff_hash: string; runtime_hash: string; generated: SucceededCandidate };

export class TopicSelectionV1cN4DelegatedPromotionDecisionService {
  constructor(private readonly deps: TopicSelectionV1cN4DelegatedPromotionDecisionServiceDeps) {}

  async generateDelegatedPromotionCandidate(input: GenerateDelegatedPromotionCandidateInput) {
    input = structuredClone(input);
    if (input.execution_spec?.execution_mode !== 'codex_cli' || input.execution_spec.model_option_id != null
      || !input.workflow_run_id?.trim() || !input.node_attempt_id?.trim()
      || Object.keys(input).some(key => !['promotion_gate_check_id', 'workflow_run_id', 'node_attempt_id', 'execution_spec', 'policy_version_id'].includes(key))) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'CLI candidate generation requires stable IDs and forbids external answers or Human decisions.');
    }
    const controlPlane = this.requireControlPlane();
    const handoff = await this.deps.gateService.getPromotionGateHandoff(input.promotion_gate_check_id);
    const handoffHash = canonicalHash(handoff);
    const runtimeHash = canonicalHash(this.deps.runtime.cliExecutionIdentity);
    const requestHash = canonicalHash({ input, handoffHash, runtimeHash });
    const key = this.candidateKey(input);
    let record = await controlPlane.getArtifactRefByStableKey(key);
    if (record && (record.checksum !== canonicalHash(record.payload) || record.payload?.request_hash !== requestHash)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'This candidate attempt has different input, gate or runtime.');
    }
    if (!record) {
      const generated = await this.deps.runtime.generateCandidate({ gate_handoff: handoff,
        workflow_run_id: input.workflow_run_id, node_attempt_id: input.node_attempt_id, policy_version: input.policy_version_id,
        execution_mode: 'codex_cli', run_mode: 'product', model_option_id: null, created_by: 'system' });
      if (generated.status !== 'succeeded') throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CLI delegated candidate generation did not succeed.', { blocker_codes: generated.invocation_result.blocker_codes });
      const review = this.deps.admission.validateCandidateForReview({ gate_handoff: handoff, candidate: generated.structured_output });
      if (review && !review.admitted) throw new AppError(422, 'GATE_CONSTRAINT_FAILED', review.blocker.message, { blocker_code: review.blocker.code });
      const payload: CandidateReceipt = { schema_version: CANDIDATE_RECEIPT, input, request_hash: requestHash,
        handoff_hash: handoffHash, runtime_hash: runtimeHash, generated };
      record = await controlPlane.recordArtifactRef({ stable_key: key, workflow_run_id: input.workflow_run_id,
        title_card_id: handoff.gate_check.title_card_id, workspace_id: handoff.gate_check.workspace_id ?? null,
        artifact_kind: 'diagnostic', storage_kind: 'inline', payload, checksum: canonicalHash(payload), created_by: 'system' });
      if (record.checksum !== canonicalHash(payload)) throw new AppError(409, 'VERSION_CONFLICT', 'Candidate receipt changed.');
    }
    const receipt = record.payload as unknown as CandidateReceipt;
    const review = this.deps.admission.validateCandidateForReview({ gate_handoff: handoff, candidate: receipt.generated.structured_output });
    if (review && !review.admitted) throw new AppError(422, 'GATE_CONSTRAINT_FAILED', review.blocker.message, { blocker_code: review.blocker.code });
    return { candidate_receipt_ref: { ref_type: 'artifact_ref', ref_id: record.artifact_ref_id,
      title_card_id: record.title_card_id ?? null, version_id: CANDIDATE_RECEIPT },
    candidate: receipt.generated.structured_output, candidate_hash: canonicalHash(receipt.generated.structured_output),
    candidate_artifact: receipt.generated.candidate_artifact, human_review_required: true as const };
  }

  private requireControlPlane() {
    if (!this.deps.controlPlane) throw new AppError(500, 'INTERNAL_ERROR', 'CLI candidate persistence is not configured.');
    return this.deps.controlPlane;
  }

  private candidateKey(input: Pick<GenerateDelegatedPromotionCandidateInput, 'workflow_run_id' | 'node_attempt_id'>) {
    return `v1c-cli-delegated:${canonicalHash([input.workflow_run_id, input.node_attempt_id])}`;
  }

  async recordDelegatedPromotionDecision(
    input: RecordDelegatedPromotionDecisionInput,
  ): Promise<RecordHumanPromotionDecisionResult> {
    // Authority boundary, fail fast: a delegated decision is still HUMAN-authorized. The agent never supplies the
    // actor. (Admission re-asserts this; surfacing it early gives a clear error.)
    if (input.human_actor?.actor_type !== 'human' || !input.human_actor.actor_id?.trim()) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'A delegated promotion decision still requires a human authorizer (human_actor.actor_type must be "human").',
        { actor_type: input.human_actor?.actor_type },
      );
    }

    const gateHandoff = await this.deps.gateService.getPromotionGateHandoff(input.promotion_gate_check_id);

    let generated: TopicSelectionV1cN4DelegatedPromotionDecisionCandidateGenerationResult;
    if (input.candidate_receipt_ref) {
      if (input.codex_response != null || !input.confirmed_candidate_hash) throw new AppError(400, 'INVALID_PAYLOAD', 'Reviewed CLI candidate requires exact confirmation without external outputs.');
      const record = await this.requireControlPlane().getArtifactRefByStableKey(this.candidateKey(input));
      const ref = input.candidate_receipt_ref;
      if (!record?.payload || record.checksum !== canonicalHash(record.payload) || record.artifact_ref_id !== ref.ref_id
        || record.workflow_run_id !== input.workflow_run_id || ref.legacy_ref != null
        || ref.ref_type !== 'artifact_ref' || ref.version_id !== CANDIDATE_RECEIPT
        || (ref.title_card_id ?? null) !== (record.title_card_id ?? null)) throw new AppError(409, 'VERSION_CONFLICT', 'Reviewed candidate receipt is invalid.');
      const receipt = record.payload as unknown as CandidateReceipt;
      if (receipt.schema_version !== CANDIDATE_RECEIPT || receipt.generated.status !== 'succeeded'
        || receipt.input.workflow_run_id !== input.workflow_run_id || receipt.input.node_attempt_id !== input.node_attempt_id
        || (receipt.input.policy_version_id ?? null) !== (input.policy_version_id ?? null)
        || receipt.input.promotion_gate_check_id !== input.promotion_gate_check_id
        || receipt.handoff_hash !== canonicalHash(gateHandoff) || receipt.runtime_hash !== canonicalHash(this.deps.runtime.cliExecutionIdentity)
        || canonicalHash(receipt.generated.structured_output) !== input.confirmed_candidate_hash) throw new AppError(409, 'VERSION_CONFLICT', 'Candidate confirmation, gate or runtime changed.');
      generated = receipt.generated;
    } else {
      if (!input.codex_response || input.confirmed_candidate_hash != null) throw new AppError(400, 'INVALID_PAYLOAD', 'Delegated decision requires either a reviewed CLI receipt or an assisted candidate.');
      generated = await this.deps.runtime.generateCandidate({
      gate_handoff: gateHandoff,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      model_option_id: null,
      codex_response: input.codex_response,
      created_by: 'system',
    });
    }
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

    // Recheck current source identity and the explicit Human boundary before the authority writer.
    const admitted = await this.deps.admission.admit({
      gate_handoff: gateHandoff,
      candidate_artifact: generated.candidate_artifact,
      candidate: generated.structured_output,
      human_actor: input.human_actor,
      condition_owners: input.condition_owners,
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
