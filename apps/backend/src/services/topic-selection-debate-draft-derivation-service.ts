import type { TopicSelectionArtifactRefRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_SUPPORT_SLOTS,
  TOPIC_SELECTION_V1B_N6_DEBATE_ARBITER_PROFILE_ID,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
  type TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import type { TopicSelectionV1bN6DivergentDebateRoleArtifact } from './topic-selection-v1b-n6-divergent-debate-admission-service.js';
import type { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { resolveDebatePriorOutputs } from './topic-selection-debate-role-context.js';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import { AppError } from '../errors/app-error.js';
import { extractN6DraftPayload } from './topic-selection-v1b-harness-n6.js';
import { extractN8DraftPayload } from './topic-selection-v1b-harness-n8.js';

type FinalRole = Omit<TopicSelectionV1bN6DivergentDebateRoleArtifact, 'slot_id' | 'node_id' | 'output_contract' | 'prior_role_artifact_hashes'> & {
  slot_id: string; node_id: string; output_contract: string;
};
type DraftArtifact = TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;

const projectionBySlot = {
  n6_question_candidate_draft: { parent: 'n6_debate_arbiter', key: 'synthesized_candidate_set', profile: TOPIC_SELECTION_V1B_N6_DEBATE_ARBITER_PROFILE_ID },
  n8_value_assessment_draft: { parent: 'n8_debate_synthesizer_final', key: 'assessment_draft', profile: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n8_bounded_debate },
} as const;

function derivationKey(request: TopicSelectionV1bWorkflowHarnessRunRequest) {
  return `debate-draft-derivation:${canonicalHash([request.workflow_run_id, request.node_id, request.node_attempt_id])}`;
}

function sourceRequestHash(request: TopicSelectionV1bWorkflowHarnessRunRequest) {
  return canonicalHash({
    workflow_run_id: request.workflow_run_id, node_id: request.node_id, node_attempt_id: request.node_attempt_id,
    workspace_id: request.workspace_id ?? null, title_card_id: request.title_card_id ?? null,
    policy_version: request.policy_version, frozen_input: request.frozen_input,
  });
}

/** Project the admitted final role's payload while retaining its actual audit and model identity. */
export async function recordDebateDerivedDraft(
  controlPlane: TopicSelectionControlPlaneService,
  input: {
    request: TopicSelectionV1bWorkflowHarnessRunRequest;
    slot_id: keyof typeof projectionBySlot;
    final_role: FinalRole;
    loop_transcript_hash: string;
  },
) {
  const { request, final_role: role } = input;
  const projection = projectionBySlot[input.slot_id];
  const slot = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_SUPPORT_SLOTS.find(slot => slot.slot_id === input.slot_id)!;
  if (role.execution_mode !== 'codex_cli' || role.slot_id !== projection.parent
    || role.node_id !== request.node_id || slot.node_id !== request.node_id
    || role.workflow_run_id !== request.workflow_run_id || role.node_attempt_id !== request.node_attempt_id) {
    throw new AppError(409, 'VERSION_CONFLICT', 'Debate draft requires the exact final Codex role for this attempt.');
  }
  const [parent] = await resolveDebatePriorOutputs(controlPlane, {
    workflow_run_id: request.workflow_run_id, title_card_id: request.title_card_id ?? null,
  }, [role]);
  const draft = parent!.output[projection.key];
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Final Debate role does not contain a draft object.');
  }
  const payload = draft as Record<string, unknown>;
  if (!(input.slot_id === 'n6_question_candidate_draft' ? extractN6DraftPayload(payload) : extractN8DraftPayload(payload))) {
    throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Final Debate role does not contain the required draft projection.');
  }
  const draftHash = canonicalHash(draft);
  const readPrevious = async (previous: TopicSelectionArtifactRefRecord) => {
    const artifact = previous.payload?.semantic_artifact as DraftArtifact | undefined;
    if (!artifact || artifact.normalized_output_hash !== draftHash
      || artifact.debate_derivation?.loop_transcript_hash !== input.loop_transcript_hash
      || artifact.debate_derivation.parent_output_hash !== role.normalized_output_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Debate draft replay differs from the recorded projection.');
    }
    await verifyDebateDerivedDraft(controlPlane, request, artifact);
    return { status: 'succeeded' as const, semantic_artifact: artifact, structured_output: payload };
  };
  const previous = await controlPlane.getArtifactRefByStableKey(derivationKey(request));
  if (previous) return readPrevious(previous);
  const output = await controlPlane.recordArtifactRef({
    stable_key: `debate-draft:${canonicalHash([request.workflow_run_id, request.node_attempt_id, input.slot_id, draftHash])}`,
    workspace_id: request.workspace_id ?? null, title_card_id: request.title_card_id ?? null,
    workflow_run_id: request.workflow_run_id, artifact_kind: 'structured_output', storage_kind: 'inline',
    payload, checksum: draftHash, created_by: 'system',
  });
  const outputRef = { ref_type: 'artifact_ref', ref_id: output.artifact_ref_id, title_card_id: output.title_card_id ?? null };
  const artifact: DraftArtifact = {
    slot_id: slot.slot_id, node_id: slot.node_id, execution_mode: 'codex_cli', run_mode: role.run_mode,
    allowed_effect: 'model_draft_for_gate', support_artifact_ref: outputRef, support_artifact_hash: draftHash,
    normalized_output_ref: outputRef, normalized_output_hash: draftHash, structured_output_hash: draftHash,
    output_contract: slot.output_contract, profile_id: slot.default_profile_id, model_option_id: null,
    input_hash: request.frozen_input.frozen_input_hash ?? canonicalHash(request.frozen_input),
    adapter_policy_version: request.policy_version, slot_spec_hash: canonicalHash(slot),
    provenance_ref: role.provenance_ref, runtime_audit_ref: role.runtime_audit_ref, runtime_audit_hash: role.runtime_audit_hash,
    runtime_provenance_class: 'debate_derived', prompt_packet_hash: role.prompt_packet_hash,
    context_policy_profile_id: role.context_policy_profile_id, context_policy_profile_version: role.context_policy_profile_version,
    context_policy_profile_hash: role.context_policy_profile_hash, prompt_variant_key: role.prompt_variant_key,
    runtime_invocation_context_hash: role.runtime_invocation_context_hash, redaction_policy: role.redaction_policy,
    source_hashes: role.source_hashes, compression_report_ref: role.compression_report_ref,
    compression_report_hash: role.compression_report_hash, compressed_context_hash: role.compressed_context_hash,
    debate_derivation: {
      parent_output_ref: role.normalized_output_ref, parent_output_hash: role.normalized_output_hash,
      parent_profile_id: role.profile_id, parent_slot_id: role.slot_id,
      projection_key: projection.key, loop_transcript_hash: input.loop_transcript_hash,
    },
  };
  await verifyProjection(controlPlane, request, artifact);
  const receipt = {
    schema_version: 'TopicSelectionDebateDraftDerivation@v1', source_request_hash: sourceRequestHash(request),
    semantic_artifact: artifact,
  };
  try {
    await controlPlane.recordArtifactRef({
      stable_key: derivationKey(request), workspace_id: request.workspace_id ?? null,
      title_card_id: request.title_card_id ?? null, workflow_run_id: request.workflow_run_id,
      artifact_kind: 'diagnostic', storage_kind: 'inline', created_by: 'system',
      payload: receipt, checksum: canonicalHash(receipt),
    });
  } catch (error) {
    const winner = await controlPlane.getArtifactRefByStableKey(derivationKey(request));
    if (!winner) throw error;
    return readPrevious(winner);
  }
  return { status: 'succeeded' as const, semantic_artifact: artifact, structured_output: payload };
}

/** Gate-time verification of the projection and its real final-role audit; never synthesizes an audit. */
export async function verifyDebateDerivedDraft(
  controlPlane: TopicSelectionControlPlaneService,
  request: TopicSelectionV1bWorkflowHarnessRunRequest,
  artifact: DraftArtifact,
): Promise<void> {
  const receipt = await controlPlane.getArtifactRefByStableKey(derivationKey(request));
  if (!receipt?.payload || receipt.checksum !== canonicalHash(receipt.payload)
    || receipt.payload.schema_version !== 'TopicSelectionDebateDraftDerivation@v1'
    || receipt.payload.source_request_hash !== sourceRequestHash(request)
    || canonicalHash(receipt.payload.semantic_artifact) !== canonicalHash(artifact)) {
    throw new AppError(409, 'VERSION_CONFLICT', 'Debate draft must match its recorded derivation; identity drifted.');
  }
  await verifyProjection(controlPlane, request, artifact);
}

async function verifyProjection(
  controlPlane: TopicSelectionControlPlaneService,
  request: TopicSelectionV1bWorkflowHarnessRunRequest,
  artifact: DraftArtifact,
): Promise<void> {
  const fail = () => new AppError(409, 'VERSION_CONFLICT', 'Debate-derived draft provenance or projection identity drifted.');
  const derivation = artifact.debate_derivation;
  const slot = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_SUPPORT_SLOTS.find(slot => slot.slot_id === artifact.slot_id);
  const projection = artifact.slot_id === 'n6_question_candidate_draft' || artifact.slot_id === 'n8_value_assessment_draft'
    ? projectionBySlot[artifact.slot_id] : null;
  const frozenHash = request.frozen_input.frozen_input_hash ?? canonicalHash(request.frozen_input);
  if (!slot || !projection || !derivation || artifact.runtime_provenance_class !== 'debate_derived'
    || artifact.execution_mode !== 'codex_cli' || artifact.node_id !== request.node_id
    || (request.run_mode != null && artifact.run_mode !== request.run_mode)
    || artifact.profile_id !== slot.default_profile_id || artifact.output_contract !== slot.output_contract
    || artifact.allowed_effect !== 'model_draft_for_gate' || artifact.slot_spec_hash !== canonicalHash(slot)
    || artifact.adapter_policy_version !== request.policy_version || artifact.input_hash !== frozenHash
    || artifact.source_hashes.frozen_input_hash !== frozenHash
    || derivation.parent_slot_id !== projection.parent || derivation.projection_key !== projection.key
    || derivation.parent_profile_id !== projection.profile
    || !/^[a-f0-9]{64}$/.test(derivation.loop_transcript_hash)
    || !artifact.runtime_audit_ref || !artifact.normalized_output_ref
    || canonicalHash(artifact.runtime_audit_ref) !== canonicalHash(artifact.provenance_ref)) throw fail();
  const [parent, audit, output] = await Promise.all([
    controlPlane.getArtifactRef(derivation.parent_output_ref.ref_id),
    controlPlane.getArtifactRef(artifact.runtime_audit_ref.ref_id),
    controlPlane.getArtifactRef(artifact.normalized_output_ref.ref_id),
  ]);
  for (const record of [parent, audit, output]) {
    if (!record?.payload || record.checksum !== canonicalHash(record.payload)
      || record.workflow_run_id !== request.workflow_run_id
      || (record.title_card_id ?? null) !== (request.title_card_id ?? null)) throw fail();
  }
  const provenance = audit!.payload!.provenance as Record<string, unknown> | undefined;
  if (!provenance || audit!.payload!.status !== 'succeeded' || audit!.checksum !== artifact.runtime_audit_hash
    || parent!.artifact_kind !== 'structured_output' || output!.artifact_kind !== 'structured_output' || audit!.artifact_kind !== 'diagnostic'
    || provenance.node_id !== request.node_id || provenance.node_attempt_id !== request.node_attempt_id
    || provenance.source_kind !== 'codex_cli_response' || provenance.execution_mode !== 'codex_cli'
    || provenance.profile_id !== derivation.parent_profile_id || provenance.run_mode !== artifact.run_mode
    || provenance.prompt_packet_hash !== artifact.prompt_packet_hash
    || provenance.structured_output_hash !== derivation.parent_output_hash
    || parent!.checksum !== derivation.parent_output_hash || parent!.payload!.role_slot !== projection.parent
    || canonicalHash(parent!.payload![projection.key]) !== output!.checksum
    || output!.checksum !== artifact.structured_output_hash || output!.checksum !== artifact.normalized_output_hash
    || output!.checksum !== artifact.support_artifact_hash
    || canonicalHash(artifact.support_artifact_ref) !== canonicalHash(artifact.normalized_output_ref)) throw fail();
  const traceRef = provenance.trace_artifact_ref as { ref_type?: string; ref_id?: string } | null;
  if (traceRef?.ref_type !== 'artifact_ref' || !traceRef.ref_id) throw fail();
  const trace = await controlPlane.getArtifactRef(traceRef.ref_id);
  if (!trace?.payload || trace.checksum !== canonicalHash(trace.payload)
    || trace.checksum !== provenance.trace_artifact_hash
    || trace.workflow_run_id !== request.workflow_run_id
    || (trace.title_card_id ?? null) !== (request.title_card_id ?? null)
    || trace.payload.status !== 'succeeded' || trace.payload.thread_id !== provenance.thread_id
    || trace.payload.invocation_attempt_id !== provenance.invocation_attempt_id) throw fail();
}
