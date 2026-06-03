import { randomUUID } from 'node:crypto';
import { AppError } from '../errors/app-error.js';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
  type TopicSelectionV1bAcceptedSliceSelectionPayload,
  type TopicSelectionV1bN5HarnessFrozenInputPayload,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
  type TopicSelectionV1bWorkflowHarnessRunResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import type {
  TopicSelectionActorRef,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionResearchSliceOptionRecord,
  TopicSelectionResearchSliceOptionSetRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
import {
  canonicalHash,
  hashResearchSliceOptionAuthority,
  hashV1bFrozenInput,
  researchSliceOptionRef,
} from './topic-selection-v1b-harness-authority-hash.js';

const N5_NODE_ID = 'topic-selection.v1b.select-research-slice.v1' as const;
const N5_INPUT_CONTRACT = 'N4ToN5Handoff@v1' as const;
const N5_SNAPSHOT_KIND = 'research_slice_option_set' as const;
const N5_POLICY_VERSION = 'topic-selection-v1b-node-policy-v1' as const;

/** Minimal harness surface this service depends on; the real
 * `TopicSelectionV1bWorkflowHarnessService` satisfies it. */
export interface V1bWorkflowHarnessInvoker {
  invokeNode(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult>;
}

/** Read surface this service needs from the v1b research-slice repository. */
export interface V1bResearchSliceReadPort {
  findOptionSetById(
    optionSetId: string,
  ): Promise<TopicSelectionResearchSliceOptionSetRecord | null>;
  listOptionsByOptionSetId(
    optionSetId: string,
  ): Promise<TopicSelectionResearchSliceOptionRecord[]>;
}

export interface V1bHumanSliceSelectionInput {
  research_slice_option_set_id: string;
  selected_option_id: string;
  selection_rationale: string;
  actor: TopicSelectionActorRef;
  confidence?: number | null;
  decision_basis?: Record<string, unknown>;
  required_actions?: string[];
  accepted_risk_refs?: TopicSelectionFunctionalRef[];
  /** Optional deterministic ids for tests; generated when omitted. */
  workflow_run_id?: string;
  node_attempt_id?: string;
}

/**
 * T-115 — human-authority entry for v1b N5 (`select-research-slice`).
 *
 * Assembles a `human_delegated` workflow-harness run-request from PERSISTED
 * state (the option set + the chosen option) and invokes the SAME harness path
 * the native runner / codex authority use (`invokeNode`), so the produced
 * `ResearchSlice` + `SliceSelectionDecision` are identical regardless of who
 * selected. This is the "runtime ↔ human-review compatible" seam — through the
 * harness, never around it. Hashes come from the shared canonical module so
 * they match the harness N5 re-derivation checks.
 *
 * Phase 2 prerequisite (see dev-docs T-115): the N4 handoff hash is read from
 * `optionSet.comparison_payload.n4_handoff_hash`. The N4 runner must persist
 * that field (a 1-line addition, coordinated with T-088). Until then this
 * service throws a clear 409 when the field is absent.
 */
export class V1bSliceHumanSelectionService {
  private readonly idFactory: (prefix: string) => string;

  constructor(
    private readonly harness: V1bWorkflowHarnessInvoker,
    private readonly researchSlice: V1bResearchSliceReadPort,
    options: { idFactory?: (prefix: string) => string } = {},
  ) {
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${randomUUID()}`);
  }

  async selectSlice(
    input: V1bHumanSliceSelectionInput,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    if (!input.selection_rationale.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Human slice selection requires a non-empty selection_rationale.');
    }
    if (input.actor.actor_type !== 'human' && input.actor.actor_type !== 'hybrid') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Human slice selection requires a human or hybrid actor.');
    }

    const optionSet = await this.researchSlice.findOptionSetById(input.research_slice_option_set_id);
    if (!optionSet) {
      throw new AppError(404, 'NOT_FOUND', `ResearchSliceOptionSet ${input.research_slice_option_set_id} not found.`);
    }
    const optionSetHash = this.requirePersistedHash(
      optionSet.comparison_payload.authority_hash,
      'ResearchSliceOptionSet is missing comparison_payload.authority_hash (N4 authority not persisted).',
    );
    const n4HandoffHash = this.requirePersistedHash(
      optionSet.comparison_payload.n4_handoff_hash,
      'ResearchSliceOptionSet is missing comparison_payload.n4_handoff_hash; the N4 runner must persist it before human N5 selection (T-115 Phase 2).',
    );

    const options = await this.researchSlice.listOptionsByOptionSetId(input.research_slice_option_set_id);
    const selected = options.find(
      (option) => option.research_slice_option_id === input.selected_option_id,
    );
    if (!selected) {
      throw new AppError(
        404,
        'NOT_FOUND',
        `ResearchSliceOption ${input.selected_option_id} not found in option set ${input.research_slice_option_set_id}.`,
      );
    }

    const optionSetRef: TopicSelectionFunctionalRef = {
      ref_type: 'research_slice_option_set',
      ref_id: optionSet.research_slice_option_set_id,
      version_id: null,
      title_card_id: optionSet.title_card_id,
    };

    const acceptedPayload: TopicSelectionV1bAcceptedSliceSelectionPayload = {
      decision: 'select',
      selected_option_ref: researchSliceOptionRef(selected),
      selected_option_hash: hashResearchSliceOptionAuthority(selected),
      selection_rationale: input.selection_rationale.trim(),
      decision_basis: input.decision_basis ?? { selected_option_key: selected.option_key },
      rejected_option_reasons: [],
      required_actions: input.required_actions ?? [],
      accepted_risk_refs: input.accepted_risk_refs ?? [],
      confidence: input.confidence ?? null,
      requires_human_review: false,
      human_review_reason: null,
      loopback_target: null,
      loopback_target_ref: null,
      loopback_reason_code: null,
    };

    const payload: TopicSelectionV1bN5HarnessFrozenInputPayload = {
      research_slice_option_set_ref: optionSetRef,
      research_slice_option_set_hash: optionSetHash,
      n4_handoff_hash: n4HandoffHash,
      authority_input_provider: 'human_delegated',
      accepted_selection_payload: acceptedPayload,
      accepted_selection_payload_hash: canonicalHash(acceptedPayload),
      delegation_artifact_hash: null,
    };

    const frozenInputEnvelope = {
      input_contract: N5_INPUT_CONTRACT,
      snapshot_kind: N5_SNAPSHOT_KIND,
      source_refs: [optionSetRef],
      payload: payload as unknown as Record<string, unknown>,
    };

    const request: TopicSelectionV1bWorkflowHarnessRunRequest = {
      schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
      title_card_id: optionSet.title_card_id,
      workflow_run_id: input.workflow_run_id ?? this.idFactory('workflow_run_v1b_n5_human'),
      node_attempt_id: input.node_attempt_id ?? this.idFactory('node_attempt_v1b_n5_human'),
      node_id: N5_NODE_ID,
      policy_version: N5_POLICY_VERSION,
      frozen_input: {
        ...frozenInputEnvelope,
        frozen_input_hash: hashV1bFrozenInput(frozenInputEnvelope),
      },
      actor: input.actor,
      created_by: 'human',
    };

    return this.harness.invokeNode(request);
  }

  private requirePersistedHash(value: unknown, message: string): string {
    if (typeof value !== 'string' || value.length === 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', message);
    }
    return value;
  }
}
