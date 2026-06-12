import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { TOPIC_SELECTION_V1C_NODE_ID } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-node-ids';
import type {
  TopicSelectionAgentExecutionMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionAgentRunMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import type {
  TopicSelectionPaperProjectBridgeHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-paper-project-bridge-contracts';
import type {
  TopicSelectionDownstreamFeedbackSourceKind,
  TopicSelectionDownstreamLoopbackCause,
  TopicSelectionDownstreamLoopbackTarget,
  TopicSelectionDownstreamTopicFeedbackCreateInput,
  TopicSelectionV1cDownstreamFeedbackCandidate,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-downstream-feedback-recheck-contracts';
import {
  TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_CANDIDATE_SCHEMA_VERSION,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-downstream-feedback-recheck-contracts';
import { AppError } from '../errors/app-error.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import {
  resolveTopicSelectionV1cDownstreamFeedbackPolicy,
  type TopicSelectionV1cDownstreamFeedbackPolicy,
} from './topic-selection-v1c-downstream-feedback-policy.js';

export type TopicSelectionV1cN6FeedbackNormalizationSourceInput = {
  paper_project_bridge_id: string;
  workspace_id?: string | null;
  downstream_source_kind: TopicSelectionDownstreamFeedbackSourceKind;
  downstream_source_ref: TopicSelectionFunctionalRef;
  source_feedback_refs?: TopicSelectionFunctionalRef[];
  observed_blocker_refs?: TopicSelectionFunctionalRef[];
  artifact_refs?: TopicSelectionFunctionalRef[];
  raw_feedback_text: string;
  policy_version_id?: string | null;
  created_by?: 'human' | 'llm' | 'system' | 'hybrid';
};

export interface TopicSelectionV1cN6FeedbackNormalizationCandidateArtifact {
  slot_id: 'downstream_feedback_normalization';
  node_id: 'topic-selection.v1c.downstream-feedback-recheck.v1';
  workflow_run_id: string;
  node_attempt_id: string;
  policy_version: string;
  execution_mode: TopicSelectionAgentExecutionMode;
  run_mode: TopicSelectionAgentRunMode;
  allowed_effect: 'feedback_candidate_only';
  candidate_artifact_ref: TopicSelectionFunctionalRef;
  candidate_artifact_hash: string;
  normalized_output_ref: TopicSelectionFunctionalRef;
  normalized_output_hash: string;
  output_contract: 'TopicSelectionV1cDownstreamFeedbackCandidate@v1';
  profile_id: string;
  model_option_id: string | null;
  prompt_packet_hash: string;
  structured_output_hash: string;
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  prompt_variant_key: string;
  runtime_invocation_context_hash: string;
  redaction_policy: string;
  source_hashes: Record<string, string>;
  runtime_audit_ref: TopicSelectionFunctionalRef | null;
  runtime_audit_hash: string | null;
  provenance_ref: TopicSelectionFunctionalRef;
  runtime_provenance_class: 'runtime_verified';
  compression_report_ref: TopicSelectionFunctionalRef | null;
  compression_report_hash: string | null;
  compressed_context_hash: string | null;
}

export interface TopicSelectionV1cN6FeedbackNormalizationAdmissionExpectedIdentity {
  slot_id: 'downstream_feedback_normalization';
  output_contract: 'TopicSelectionV1cDownstreamFeedbackCandidate@v1';
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  prompt_variant_key: string;
  prompt_packet_hash: string | null;
  runtime_invocation_context_hash: string;
  redaction_policy: string;
  source_hashes: Record<string, string>;
  normalized_payload_hash: string;
}

export type TopicSelectionV1cN6FeedbackNormalizationAdmissionExpectedIdentityBuilder = {
  buildAdmissionExpectedIdentity(input: {
    bridge_handoff: TopicSelectionPaperProjectBridgeHandoff;
    source: TopicSelectionV1cN6FeedbackNormalizationSourceInput;
    workflow_run_id: string;
    node_attempt_id: string;
    policy_version?: string | null;
    execution_mode: TopicSelectionAgentExecutionMode;
    run_mode: TopicSelectionAgentRunMode;
    model_option_id?: string | null;
    normalized_payload_hash: string;
  }): TopicSelectionV1cN6FeedbackNormalizationAdmissionExpectedIdentity;
};

export type TopicSelectionV1cN6FeedbackNormalizationAdmissionBlockerCode =
  | 'N6_FEEDBACK_NORMALIZATION_ARTIFACT_PROFILE_DRIFT'
  | 'N6_FEEDBACK_NORMALIZATION_ARTIFACT_PROMPT_DRIFT'
  | 'N6_FEEDBACK_NORMALIZATION_ARTIFACT_RUNTIME_CONTEXT_DRIFT'
  | 'N6_FEEDBACK_NORMALIZATION_SOURCE_HASH_DRIFT'
  | 'N6_FEEDBACK_NORMALIZATION_ARTIFACT_PAYLOAD_HASH_MISMATCH'
  | 'N6_FEEDBACK_NORMALIZATION_SCHEMA_VERSION_INVALID'
  | 'N6_FEEDBACK_NORMALIZATION_SOURCE_MISMATCH'
  | 'N6_FEEDBACK_NORMALIZATION_FORBIDDEN_AUTHORITY_FIELD'
  | 'N6_FEEDBACK_NORMALIZATION_REF_OUT_OF_BOUNDS'
  | 'N6_FEEDBACK_NORMALIZATION_RECHECK_ACTION_MISSING'
  | 'N6_FEEDBACK_NORMALIZATION_RECHECK_HINT_MISMATCH'
  | 'N6_FEEDBACK_NORMALIZATION_AFFECTED_REF_UNRESOLVED'
  | 'N6_FEEDBACK_NORMALIZATION_UPSTREAM_MUTATION_BOUNDARY_MISSING';

export interface TopicSelectionV1cN6FeedbackNormalizationAdmissionIssue {
  code: TopicSelectionV1cN6FeedbackNormalizationAdmissionBlockerCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface TopicSelectionV1cN6FeedbackNormalizationAdmissionIdentity {
  schema_version: 'topic-selection-v1c-n6-feedback-normalization-admission-identity-v1';
  admission_policy_id: 'topic-selection.v1c.n6.feedback-normalization.admission.v1';
  node_id: 'topic-selection.v1c.downstream-feedback-recheck.v1';
  allowed_effect: 'record_only_feedback_candidate';
  paper_project_bridge_id: string;
  paper_project_bridge_ref: TopicSelectionFunctionalRef;
  bridge_payload_hash: string;
  downstream_source_kind: TopicSelectionDownstreamFeedbackSourceKind;
  downstream_source_ref: TopicSelectionFunctionalRef;
  feedback_signal: TopicSelectionDownstreamLoopbackCause;
  expected_loopback_target: TopicSelectionDownstreamLoopbackTarget;
  expected_affected_ref: TopicSelectionFunctionalRef;
  candidate_artifact_ref: TopicSelectionFunctionalRef;
  candidate_artifact_hash: string;
  prompt_packet_hash: string;
  runtime_invocation_context_hash: string;
  runtime_audit_ref: TopicSelectionFunctionalRef;
  runtime_audit_hash: string;
  provenance_ref: TopicSelectionFunctionalRef;
  structured_output_hash: string;
  output_contract: 'TopicSelectionV1cDownstreamFeedbackCandidate@v1';
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  source_hashes: Record<string, string>;
}

export type TopicSelectionV1cN6FeedbackNormalizationAdmissionResult =
  | {
    admitted: true;
    candidate_artifact: TopicSelectionV1cN6FeedbackNormalizationCandidateArtifact;
    candidate: TopicSelectionV1cDownstreamFeedbackCandidate;
    create_input: TopicSelectionDownstreamTopicFeedbackCreateInput;
    admission_identity: TopicSelectionV1cN6FeedbackNormalizationAdmissionIdentity;
    admission_identity_hash: string;
    warnings: string[];
  }
  | {
    admitted: false;
    blocker: TopicSelectionV1cN6FeedbackNormalizationAdmissionIssue;
  };

export interface TopicSelectionV1cN6FeedbackNormalizationAdmissionInput {
  bridge_handoff: TopicSelectionPaperProjectBridgeHandoff;
  source: TopicSelectionV1cN6FeedbackNormalizationSourceInput;
  candidate_artifact: TopicSelectionV1cN6FeedbackNormalizationCandidateArtifact;
  candidate: TopicSelectionV1cDownstreamFeedbackCandidate;
}

const FORBIDDEN_AUTHORITY_KEYS = [
  'downstream_topic_feedback_id',
  'feedback_fingerprint',
  'classification',
  'impact_summary',
  'recheck_request',
  'downstream_recheck_request_id',
  'recheck_event_ref',
  'recheck_impact_ref',
  'decision_work_queue_item_ref',
  'paper_project_bridge',
  'bridge_patch',
  'promotion_patch',
  'source_promotion_handoff',
  'paper_project_intake_ref',
  'target_paper_project_ref',
  'upstream_loopback_command',
  'automation',
  'advance',
] as const;

export class TopicSelectionV1cN6FeedbackNormalizationAdmissionService {
  constructor(
    private readonly expectedIdentityBuilder:
      TopicSelectionV1cN6FeedbackNormalizationAdmissionExpectedIdentityBuilder,
  ) {}

  admit(
    input: TopicSelectionV1cN6FeedbackNormalizationAdmissionInput,
  ): TopicSelectionV1cN6FeedbackNormalizationAdmissionResult {
    const expected = this.expectedIdentityBuilder.buildAdmissionExpectedIdentity({
      bridge_handoff: input.bridge_handoff,
      source: input.source,
      workflow_run_id: input.candidate_artifact.workflow_run_id,
      node_attempt_id: input.candidate_artifact.node_attempt_id,
      policy_version: input.candidate_artifact.policy_version,
      execution_mode: input.candidate_artifact.execution_mode,
      run_mode: input.candidate_artifact.run_mode,
      model_option_id: input.candidate_artifact.model_option_id,
      normalized_payload_hash: this.hash(input.candidate),
    });
    const artifactCheck = this.validateArtifactIdentity(input.candidate_artifact, expected);
    if (artifactCheck) {
      return artifactCheck;
    }
    const policyResolution = this.resolveFeedbackPolicy(input);
    if (!policyResolution.resolved) {
      return policyResolution.result;
    }
    const candidateCheck = this.validateCandidate(input, policyResolution.policy);
    if (candidateCheck) {
      return candidateCheck;
    }

    const feedbackSignal = input.candidate.feedback_signal;
    const expectedLoopbackTarget = policyResolution.policy.loopback_target;
    const expectedAffectedRef = policyResolution.policy.affected_ref;
    const admissionIdentity: TopicSelectionV1cN6FeedbackNormalizationAdmissionIdentity = {
      schema_version: 'topic-selection-v1c-n6-feedback-normalization-admission-identity-v1',
      admission_policy_id: 'topic-selection.v1c.n6.feedback-normalization.admission.v1',
      node_id: TOPIC_SELECTION_V1C_NODE_ID.n6_downstream_feedback_recheck,
      allowed_effect: 'record_only_feedback_candidate',
      paper_project_bridge_id: input.bridge_handoff.paper_project_bridge_id,
      paper_project_bridge_ref: input.bridge_handoff.paper_project_bridge_ref,
      bridge_payload_hash: input.bridge_handoff.bridge_payload_hash,
      downstream_source_kind: input.candidate.downstream_source_kind,
      downstream_source_ref: input.candidate.downstream_source_ref,
      feedback_signal: feedbackSignal,
      expected_loopback_target: expectedLoopbackTarget,
      expected_affected_ref: expectedAffectedRef,
      candidate_artifact_ref: input.candidate_artifact.candidate_artifact_ref,
      candidate_artifact_hash: input.candidate_artifact.candidate_artifact_hash,
      prompt_packet_hash: input.candidate_artifact.prompt_packet_hash,
      runtime_invocation_context_hash: input.candidate_artifact.runtime_invocation_context_hash,
      runtime_audit_ref: input.candidate_artifact.runtime_audit_ref!,
      runtime_audit_hash: input.candidate_artifact.runtime_audit_hash!,
      provenance_ref: input.candidate_artifact.provenance_ref,
      structured_output_hash: input.candidate_artifact.structured_output_hash,
      output_contract: input.candidate_artifact.output_contract,
      context_policy_profile_id: input.candidate_artifact.context_policy_profile_id,
      context_policy_profile_version: input.candidate_artifact.context_policy_profile_version,
      context_policy_profile_hash: input.candidate_artifact.context_policy_profile_hash,
      source_hashes: input.candidate_artifact.source_hashes,
    };
    return {
      admitted: true,
      candidate_artifact: input.candidate_artifact,
      candidate: input.candidate,
      create_input: {
        paper_project_bridge_id: input.bridge_handoff.paper_project_bridge_id,
        workspace_id: input.candidate.workspace_id ?? input.source.workspace_id ?? null,
        downstream_source_kind: input.candidate.downstream_source_kind,
        downstream_source_ref: input.candidate.downstream_source_ref,
        source_feedback_refs: input.candidate.source_feedback_refs,
        observed_blocker_refs: input.candidate.observed_blocker_refs,
        feedback_signal: input.candidate.feedback_signal,
        severity: input.candidate.severity,
        summary: input.candidate.summary,
        required_action: input.candidate.required_action,
        artifact_refs: input.candidate.artifact_refs,
        feedback_payload: input.candidate.feedback_payload,
        policy_version_id: input.source.policy_version_id ?? null,
        created_by: input.source.created_by ?? 'system',
      },
      admission_identity: admissionIdentity,
      admission_identity_hash: this.hash(admissionIdentity),
      warnings: [],
    };
  }

  private validateArtifactIdentity(
    artifact: TopicSelectionV1cN6FeedbackNormalizationCandidateArtifact,
    expected: TopicSelectionV1cN6FeedbackNormalizationAdmissionExpectedIdentity,
  ): TopicSelectionV1cN6FeedbackNormalizationAdmissionResult | null {
    if (artifact.runtime_provenance_class !== 'runtime_verified') {
      return this.block(
        'N6_FEEDBACK_NORMALIZATION_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
        'N6 feedback normalization admission requires a runtime_verified candidate artifact.',
      );
    }
    if (
      artifact.output_contract !== expected.output_contract
      || artifact.context_policy_profile_id !== expected.context_policy_profile_id
      || artifact.context_policy_profile_version !== expected.context_policy_profile_version
      || artifact.context_policy_profile_hash !== expected.context_policy_profile_hash
      || artifact.redaction_policy !== expected.redaction_policy
    ) {
      return this.block(
        'N6_FEEDBACK_NORMALIZATION_ARTIFACT_PROFILE_DRIFT',
        'N6 feedback normalization candidate profile identity does not match expected runtime identity.',
      );
    }
    if (
      artifact.prompt_variant_key !== expected.prompt_variant_key
      || !expected.prompt_packet_hash
      || artifact.prompt_packet_hash !== expected.prompt_packet_hash
    ) {
      return this.block(
        'N6_FEEDBACK_NORMALIZATION_ARTIFACT_PROMPT_DRIFT',
        'N6 feedback normalization candidate prompt identity does not match expected prompt packet.',
      );
    }
    if (
      artifact.runtime_invocation_context_hash !== expected.runtime_invocation_context_hash
      || !artifact.runtime_audit_ref
      || !artifact.runtime_audit_hash
      || !this.refsEqual(artifact.provenance_ref, artifact.runtime_audit_ref)
    ) {
      return this.block(
        'N6_FEEDBACK_NORMALIZATION_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
        'N6 feedback normalization candidate runtime invocation or audit identity is incomplete.',
      );
    }
    if (
      artifact.normalized_output_hash !== expected.normalized_payload_hash
      || artifact.structured_output_hash !== expected.normalized_payload_hash
      || artifact.candidate_artifact_hash !== expected.normalized_payload_hash
    ) {
      return this.block(
        'N6_FEEDBACK_NORMALIZATION_ARTIFACT_PAYLOAD_HASH_MISMATCH',
        'N6 feedback normalization candidate payload hash does not match normalized output hash.',
      );
    }
    if (!this.recordEqual(artifact.source_hashes, expected.source_hashes)) {
      return this.block(
        'N6_FEEDBACK_NORMALIZATION_SOURCE_HASH_DRIFT',
        'N6 feedback normalization candidate source hashes do not match expected bridge/source lineage.',
      );
    }
    return null;
  }

  private validateCandidate(
    input: TopicSelectionV1cN6FeedbackNormalizationAdmissionInput,
    policy: TopicSelectionV1cDownstreamFeedbackPolicy,
  ): TopicSelectionV1cN6FeedbackNormalizationAdmissionResult | null {
    const candidate = input.candidate;
    if (candidate.schema_version !== TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_CANDIDATE_SCHEMA_VERSION) {
      return this.block(
        'N6_FEEDBACK_NORMALIZATION_SCHEMA_VERSION_INVALID',
        'N6 feedback normalization candidate schema_version is not supported.',
        { schema_version: candidate.schema_version },
      );
    }
    if (
      candidate.paper_project_bridge_id !== input.bridge_handoff.paper_project_bridge_id
      || candidate.paper_project_bridge_id !== input.source.paper_project_bridge_id
      || candidate.downstream_source_kind !== input.source.downstream_source_kind
      || !this.refsEqual(candidate.downstream_source_ref, input.source.downstream_source_ref)
      || !this.refArraysEqual(candidate.source_feedback_refs, input.source.source_feedback_refs ?? [])
      || !this.refArraysEqual(candidate.observed_blocker_refs, input.source.observed_blocker_refs ?? [])
      || !this.refArraysEqual(candidate.artifact_refs, input.source.artifact_refs ?? [])
    ) {
      return this.block(
        'N6_FEEDBACK_NORMALIZATION_SOURCE_MISMATCH',
        'N6 feedback normalization candidate source fields do not match runtime source input.',
      );
    }
    const bridgeWorkspaceId = input.bridge_handoff.bridge.workspace_id ?? null;
    const candidateWorkspaceId = candidate.workspace_id ?? null;
    const sourceWorkspaceId = input.source.workspace_id ?? null;
    if (
      (candidateWorkspaceId && candidateWorkspaceId !== bridgeWorkspaceId)
      || (sourceWorkspaceId && sourceWorkspaceId !== bridgeWorkspaceId)
    ) {
      return this.block(
        'N6_FEEDBACK_NORMALIZATION_SOURCE_MISMATCH',
        'N6 feedback normalization candidate workspace does not match the active bridge.',
        { bridge_workspace_id: bridgeWorkspaceId, candidate_workspace_id: candidateWorkspaceId },
      );
    }
    if (!candidate.no_upstream_mutation_confirmed) {
      return this.block(
        'N6_FEEDBACK_NORMALIZATION_UPSTREAM_MUTATION_BOUNDARY_MISSING',
        'N6 feedback normalization candidate must explicitly confirm that it creates no upstream mutation.',
      );
    }
    const forbiddenKey = this.findForbiddenAuthorityKey(candidate);
    if (forbiddenKey) {
      return this.block(
        'N6_FEEDBACK_NORMALIZATION_FORBIDDEN_AUTHORITY_FIELD',
        'N6 feedback normalization candidate contains a forbidden authority or workflow automation field.',
        { forbidden_key: forbiddenKey },
      );
    }
    const allowedRefKeys = new Set(this.allowedRefs(input).map((ref) => this.refKey(ref)));
    const outOfBoundsRef = this.findOutOfBoundsRef(candidate, allowedRefKeys);
    if (outOfBoundsRef) {
      return this.block(
        'N6_FEEDBACK_NORMALIZATION_REF_OUT_OF_BOUNDS',
        'N6 feedback normalization candidate references a ref outside the active bridge/source allowed-ref set.',
        { ref: outOfBoundsRef },
      );
    }
    const requiresRecheck = policy.requires_recheck;
    if (requiresRecheck && !this.nonEmptyString(candidate.required_action)) {
      return this.block(
        'N6_FEEDBACK_NORMALIZATION_RECHECK_ACTION_MISSING',
        'N6 feedback normalization candidate requires a non-empty required_action for recheck-producing signals.',
      );
    }
    if (!requiresRecheck && this.nonEmptyString(candidate.required_action)) {
      return this.block(
        'N6_FEEDBACK_NORMALIZATION_RECHECK_HINT_MISMATCH',
        'N6 feedback normalization candidate cannot carry a required_action when feedback_signal is no_recheck_needed.',
      );
    }
    const hints = candidate.normalization_hints;
    if (
      hints.requires_recheck_hint !== requiresRecheck
      || (hints.loopback_target_hint !== null && hints.loopback_target_hint !== policy.loopback_target)
      || (hints.affected_ref_hint !== null && !this.refsEqual(hints.affected_ref_hint, policy.affected_ref))
    ) {
      return this.block(
        'N6_FEEDBACK_NORMALIZATION_RECHECK_HINT_MISMATCH',
        'N6 feedback normalization candidate recheck hints do not match deterministic feedback/recheck routing.',
        {
          expected_requires_recheck: requiresRecheck,
          expected_loopback_target: policy.loopback_target,
          expected_affected_ref: policy.affected_ref,
        },
      );
    }
    return null;
  }

  private resolveFeedbackPolicy(
    input: TopicSelectionV1cN6FeedbackNormalizationAdmissionInput,
  ): {
    resolved: true;
    policy: TopicSelectionV1cDownstreamFeedbackPolicy;
  } | {
    resolved: false;
    result: TopicSelectionV1cN6FeedbackNormalizationAdmissionResult;
  } {
    try {
      return {
        resolved: true,
        policy: resolveTopicSelectionV1cDownstreamFeedbackPolicy({
          feedback_signal: input.candidate.feedback_signal,
          bridge_handoff: input.bridge_handoff,
        }),
      };
    } catch (error) {
      if (error instanceof AppError) {
        return {
          resolved: false,
          result: this.block(
            'N6_FEEDBACK_NORMALIZATION_AFFECTED_REF_UNRESOLVED',
            error.message,
            {
              error_code: error.errorCode,
              status_code: error.statusCode,
            },
          ),
        };
      }
      throw error;
    }
  }

  private allowedRefs(input: TopicSelectionV1cN6FeedbackNormalizationAdmissionInput): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      input.bridge_handoff.paper_project_bridge_ref,
      input.bridge_handoff.source_promotion_decision_ref,
      input.bridge_handoff.promotion_commitment_profile_ref,
      input.bridge_handoff.promotion_input_snapshot_ref,
      input.bridge_handoff.paper_project_intake_ref ?? null,
      input.bridge_handoff.target_paper_project_ref ?? null,
      ...input.bridge_handoff.source_refs,
      ...input.bridge_handoff.accepted_risk_refs,
      input.source.downstream_source_ref,
      ...(input.source.source_feedback_refs ?? []),
      ...(input.source.observed_blocker_refs ?? []),
      ...(input.source.artifact_refs ?? []),
    ]);
  }

  private findForbiddenAuthorityKey(value: unknown): string | null {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.findForbiddenAuthorityKey(item);
        if (found) {
          return found;
        }
      }
      return null;
    }
    const record = this.asRecord(value);
    if (!record) {
      return null;
    }
    for (const key of Object.keys(record)) {
      if (FORBIDDEN_AUTHORITY_KEYS.includes(key as never)) {
        return key;
      }
      const found = this.findForbiddenAuthorityKey(record[key]);
      if (found) {
        return found;
      }
    }
    return null;
  }

  private findOutOfBoundsRef(value: unknown, allowedRefKeys: Set<string>): unknown | null {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.findOutOfBoundsRef(item, allowedRefKeys);
        if (found) {
          return found;
        }
      }
      return null;
    }
    const record = this.asRecord(value);
    if (!record) {
      return null;
    }
    if (typeof record.ref_type === 'string' && typeof record.ref_id === 'string') {
      return allowedRefKeys.has(this.refKey(record)) ? null : record;
    }
    for (const item of Object.values(record)) {
      const found = this.findOutOfBoundsRef(item, allowedRefKeys);
      if (found) {
        return found;
      }
    }
    return null;
  }

  private refArraysEqual(left: TopicSelectionFunctionalRef[], right: TopicSelectionFunctionalRef[]): boolean {
    return left.length === right.length && left.every((ref, index) => this.refsEqual(ref, right[index]!));
  }

  private refsEqual(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
    return this.refKey(left) === this.refKey(right);
  }

  private refKey(value: unknown): string {
    const ref = this.asRecord(value);
    return stableStringify({
      ref_type: this.stringValue(ref?.ref_type) ?? null,
      ref_id: this.stringValue(ref?.ref_id) ?? null,
      version_id: this.stringValue(ref?.version_id) ?? null,
      title_card_id: this.stringValue(ref?.title_card_id) ?? null,
    });
  }

  private uniqueRefs(values: Array<TopicSelectionFunctionalRef | null | undefined>): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const refs: TopicSelectionFunctionalRef[] = [];
    for (const ref of values) {
      if (!ref) {
        continue;
      }
      const key = this.refKey(ref);
      if (!seen.has(key)) {
        seen.add(key);
        refs.push(ref);
      }
    }
    return refs;
  }

  private recordEqual(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
    return stableStringify(left) === stableStringify(right);
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }

  private block(
    code: TopicSelectionV1cN6FeedbackNormalizationAdmissionBlockerCode,
    message: string,
    details?: Record<string, unknown>,
  ): TopicSelectionV1cN6FeedbackNormalizationAdmissionResult {
    return {
      admitted: false,
      blocker: { code, message, details },
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private nonEmptyString(value: unknown): boolean {
    return this.stringValue(value) !== null;
  }
}
