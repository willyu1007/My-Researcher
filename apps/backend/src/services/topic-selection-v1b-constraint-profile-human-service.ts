import { randomUUID } from 'node:crypto';
import { AppError } from '../errors/app-error.js';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
  type TopicSelectionV1bAcceptedConstraintProfilePayload,
  type TopicSelectionV1bN2HarnessFrozenInputPayload,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
  type TopicSelectionV1bWorkflowHarnessRunResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import type {
  TopicSelectionActorRef,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionV1bIntakeSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-intake-contracts';
import type {
  TopicSelectionV1aToV1bInputBundleRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import { canonicalHash, hashV1bFrozenInput } from './topic-selection-v1b-harness-authority-hash.js';

const N2_NODE_ID = 'topic-selection.v1b.record-research-constraint-profile.v1' as const;
const N2_INPUT_CONTRACT = 'N1ToN2Handoff@v1' as const;
const N2_SNAPSHOT_KIND = 'v1b_intake_snapshot' as const;
const N2_POLICY_VERSION = 'topic-selection-v1b-node-policy-v1' as const;

/**
 * The harness surface this service reuses (decision B — reuse, don't replicate).
 * The real `TopicSelectionV1bWorkflowHarnessService` satisfies it; reusing
 * `computeIntakeSnapshotAuthority` avoids duplicating the uniqueRefs-nested
 * snapshot-authority hash shape.
 */
export interface V1bConstraintProfileHarnessPort {
  invokeNode(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult>;
  computeIntakeSnapshotAuthority(
    snapshot: TopicSelectionV1bIntakeSnapshotRecord,
  ): { ref: TopicSelectionFunctionalRef; hash: string };
  findIntakeSnapshotById(
    intakeSnapshotId: string,
  ): Promise<TopicSelectionV1bIntakeSnapshotRecord | null>;
  findV1aToV1bInputBundleById(
    bundleId: string,
  ): Promise<TopicSelectionV1aToV1bInputBundleRecord | null>;
}

/** Human-authored constraint-profile content (the minimal form maps here; the rest default). */
export interface V1bHumanConstraintProfileContent {
  target_community: string;
  claim_ceiling: string;
  target_venue_class?: string | null;
  intended_contribution_style?: string | null;
  method_constraints?: string[];
  resource_constraints?: string[];
  available_assets?: string[];
  feasibility_budget?: Record<string, unknown>;
  non_goals?: string[];
  human_constraint_notes?: string | null;
  constraint_payload?: Record<string, unknown>;
}

export interface V1bHumanConstraintProfileInput {
  intake_snapshot_id: string;
  profile: V1bHumanConstraintProfileContent;
  actor: TopicSelectionActorRef;
  workflow_run_id?: string;
  node_attempt_id?: string;
}

/**
 * T-115 — human-authority entry for v1b N2 (`record-research-constraint-profile`).
 *
 * The researcher AUTHORS the constraint profile; this service assembles a
 * `human_delegated` N2 run-request from persisted lineage (N1 intake snapshot +
 * v1a→v1b bundle, both read through the harness) and runs it THROUGH the harness.
 * No persistence gap: the snapshot/bundle hashes are re-derived from persisted
 * records (`computeIntakeSnapshotAuthority` + `canonicalHash(bundle)`), exactly
 * matching what the N2 handler re-derives.
 */
export class V1bConstraintProfileHumanService {
  private readonly idFactory: (prefix: string) => string;

  constructor(
    private readonly harness: V1bConstraintProfileHarnessPort,
    options: { idFactory?: (prefix: string) => string } = {},
  ) {
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${randomUUID()}`);
  }

  async recordConstraintProfile(
    input: V1bHumanConstraintProfileInput,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    if (input.actor.actor_type !== 'human' && input.actor.actor_type !== 'hybrid') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Human constraint profile requires a human or hybrid actor.');
    }
    if (!input.profile.target_community.trim() || !input.profile.claim_ceiling.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Constraint profile requires target_community and claim_ceiling.');
    }

    const snapshot = await this.harness.findIntakeSnapshotById(input.intake_snapshot_id);
    if (!snapshot) {
      throw new AppError(404, 'NOT_FOUND', `Intake snapshot ${input.intake_snapshot_id} not found.`);
    }
    const bundle = await this.harness.findV1aToV1bInputBundleById(snapshot.v1b_input_bundle_id);
    if (!bundle) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Intake snapshot lineage v1a→v1b bundle not found.');
    }
    const authority = this.harness.computeIntakeSnapshotAuthority(snapshot);

    const acceptedPayload: TopicSelectionV1bAcceptedConstraintProfilePayload = {
      target_community: input.profile.target_community.trim(),
      target_venue_class: input.profile.target_venue_class ?? null,
      intended_contribution_style: input.profile.intended_contribution_style ?? null,
      method_constraints: input.profile.method_constraints ?? [],
      resource_constraints: input.profile.resource_constraints ?? [],
      available_assets: input.profile.available_assets ?? [],
      feasibility_budget: input.profile.feasibility_budget ?? {},
      non_goals: input.profile.non_goals ?? [],
      claim_ceiling: input.profile.claim_ceiling.trim(),
      human_constraint_notes: input.profile.human_constraint_notes ?? null,
      constraint_payload: input.profile.constraint_payload ?? {},
    };

    const payload: TopicSelectionV1bN2HarnessFrozenInputPayload = {
      intake_snapshot_ref: authority.ref,
      intake_snapshot_hash: authority.hash,
      v1a_bundle_ref: snapshot.v1b_input_bundle_ref,
      v1a_bundle_hash: canonicalHash(bundle),
      authority_input_provider: 'human_delegated',
      accepted_constraint_profile_payload: acceptedPayload,
      accepted_constraint_profile_payload_hash: canonicalHash(acceptedPayload),
      delegation_artifact_hash: null,
      previous_profile_ref: null,
      previous_profile_hash: null,
    };

    const frozenInputEnvelope = {
      input_contract: N2_INPUT_CONTRACT,
      snapshot_kind: N2_SNAPSHOT_KIND,
      source_refs: [authority.ref],
      payload: payload as unknown as Record<string, unknown>,
    };

    const request: TopicSelectionV1bWorkflowHarnessRunRequest = {
      schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
      title_card_id: snapshot.title_card_id,
      workflow_run_id: input.workflow_run_id ?? this.idFactory('workflow_run_v1b_n2_human'),
      node_attempt_id: input.node_attempt_id ?? this.idFactory('node_attempt_v1b_n2_human'),
      node_id: N2_NODE_ID,
      policy_version: N2_POLICY_VERSION,
      frozen_input: {
        ...frozenInputEnvelope,
        frozen_input_hash: hashV1bFrozenInput(frozenInputEnvelope),
      },
      actor: input.actor,
      created_by: 'human',
    };

    return this.harness.invokeNode(request);
  }
}
