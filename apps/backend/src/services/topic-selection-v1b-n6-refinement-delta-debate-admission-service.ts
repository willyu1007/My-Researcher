import {
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ADMISSION_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_LOOP_ID,
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_ORDER,
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
  type TopicSelectionV1bN6RefinementDeltaDebateAdmissionPayload,
  type TopicSelectionV1bN6RefinementDeltaDebateContext,
  type TopicSelectionV1bN6RefinementDeltaDebateRolePayload,
  type TopicSelectionV1bN6RefinementDeltaDebateRoleSlotId,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';

export type TopicSelectionV1bN6RefinementDeltaDebateAdmissionBlockerCode =
  | 'N6_REFINEMENT_DELTA_DEBATE_REQUIRED_ROLE_MISSING'
  | 'N6_REFINEMENT_DELTA_DEBATE_ROLE_ORDER_INVALID'
  | 'N6_REFINEMENT_DELTA_DEBATE_ROLE_OUTPUT_MISMATCH'
  | 'N6_REFINEMENT_DELTA_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION'
  | 'N6_REFINEMENT_DELTA_DEBATE_ROLE_ARTIFACT_HASH_MISMATCH'
  | 'N6_REFINEMENT_DELTA_DEBATE_ROLE_STRUCTURE_INVALID'
  | 'N6_REFINEMENT_DELTA_DEBATE_FORBIDDEN_AUTHORITY_FIELD'
  | 'N6_REFINEMENT_DELTA_DEBATE_LOOP_TRANSCRIPT_DRIFT'
  | 'N6_REFINEMENT_DELTA_DEBATE_ARBITER_DECISION_MISSING'
  | 'N6_REFINEMENT_DELTA_DEBATE_ARBITER_FINDINGS_INVALID';

export interface TopicSelectionV1bN6RefinementDeltaDebateAdmissionIssue {
  code: TopicSelectionV1bN6RefinementDeltaDebateAdmissionBlockerCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface TopicSelectionV1bN6RefinementDeltaDebateRoleAdmissionCandidate {
  slot_id: TopicSelectionV1bN6RefinementDeltaDebateRoleSlotId;
  role_artifact_hash: string;
  structured_output: TopicSelectionV1bN6RefinementDeltaDebateRolePayload;
}

export type TopicSelectionV1bN6RefinementDeltaDebateAdmissionResult =
  | {
    admitted: true;
    payload: TopicSelectionV1bN6RefinementDeltaDebateAdmissionPayload;
    payload_hash: string;
  }
  | {
    admitted: false;
    blocker: TopicSelectionV1bN6RefinementDeltaDebateAdmissionIssue;
  };

const FORBIDDEN_AUTHORITY_KEYS = new Set([
  'main_question',
  'contribution_hypothesis',
  'expected_claim',
  'fallback_claim',
  'evaluation_setting',
  'metrics',
  'baselines',
  'ablations_or_comparisons',
  'dependency_risks',
  'open_dependencies',
  'known_gaps',
  'risk_notes',
  'updates',
  'refinement',
  'topic_question_id',
  'topic_question_ref',
  'topic_question_contract_id',
  'topic_question_contract_ref',
  'candidate_id',
  'candidate_ref',
  'selected_candidate_ref',
  'research_slice_id',
  'research_slice_ref',
  'selected_research_slice_ref',
  'evidence_ceiling_refs',
  'route_decision',
  'gate_status',
  'authority_ref',
  'authority_hash',
  'created_authority_refs',
]);

export class TopicSelectionV1bN6RefinementDeltaDebateAdmissionService {
  admit(input: {
    workflow_run_id: string;
    policy_version: string;
    context: TopicSelectionV1bN6RefinementDeltaDebateContext;
    role_results: TopicSelectionV1bN6RefinementDeltaDebateRoleAdmissionCandidate[];
    loop_transcript_hash: string;
  }): TopicSelectionV1bN6RefinementDeltaDebateAdmissionResult {
    const actualOrder = input.role_results.map((result) => result.slot_id);
    for (const slot of TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_ORDER) {
      if (!actualOrder.includes(slot)) {
        return this.block(
          'N6_REFINEMENT_DELTA_DEBATE_REQUIRED_ROLE_MISSING',
          `Required refinement delta Debate role ${slot} is missing.`,
        );
      }
    }
    if (!this.sameOrder(actualOrder, TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_ORDER)) {
      return this.block(
        'N6_REFINEMENT_DELTA_DEBATE_ROLE_ORDER_INVALID',
        'Refinement delta Debate roles must appear exactly once in canonical Explorer/Critic/Arbiter order.',
        { actual_order: actualOrder },
      );
    }

    for (const result of input.role_results) {
      if (result.structured_output.role_slot !== result.slot_id) {
        return this.block(
          'N6_REFINEMENT_DELTA_DEBATE_ROLE_OUTPUT_MISMATCH',
          'Refinement delta Debate role output does not match its runtime slot.',
          { slot: result.slot_id, actual_role_slot: result.structured_output.role_slot },
        );
      }
      if (result.structured_output.schema_version
        !== TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION) {
        return this.block(
          'N6_REFINEMENT_DELTA_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION',
          'Refinement delta Debate role output schema version does not match the frozen contract.',
          { slot: result.slot_id, actual_schema_version: result.structured_output.schema_version },
        );
      }
      if (canonicalHash(result.structured_output) !== result.role_artifact_hash) {
        return this.block(
          'N6_REFINEMENT_DELTA_DEBATE_ROLE_ARTIFACT_HASH_MISMATCH',
          'Refinement delta Debate role artifact hash does not match its structured output.',
          { slot: result.slot_id },
        );
      }
      const forbiddenKey = this.findForbiddenKey(result.structured_output);
      if (forbiddenKey) {
        return this.block(
          'N6_REFINEMENT_DELTA_DEBATE_FORBIDDEN_AUTHORITY_FIELD',
          'Refinement delta Debate output contains a Human field or authority mutation.',
          { slot: result.slot_id, forbidden_key: forbiddenKey },
        );
      }
    }

    const explorer = input.role_results[0]!.structured_output;
    const reviewPoints = explorer.review_points;
    const reviewedFields = reviewPoints?.map((point) => point.field) ?? [];
    if (!reviewPoints
      || reviewPoints.some((point) => !point.statement.trim())
      || !this.sameFieldSet(reviewedFields, input.context.changed_fields)) {
      return this.block(
        'N6_REFINEMENT_DELTA_DEBATE_ROLE_STRUCTURE_INVALID',
        'Explorer review_points must cover every changed Human field exactly once.',
        { changed_fields: input.context.changed_fields, reviewed_fields: reviewedFields },
      );
    }
    const critic = input.role_results[1]!.structured_output;
    if (!Array.isArray(critic.critic_findings)
      || !this.findingsAreScoped(critic.critic_findings, input.context.changed_fields)) {
      return this.block(
        'N6_REFINEMENT_DELTA_DEBATE_ROLE_STRUCTURE_INVALID',
        'Critic findings must be an array of non-empty observations scoped to changed fields.',
      );
    }

    const roleArtifactHashes = input.role_results.map((result) => result.role_artifact_hash);
    const expectedTranscriptHash = canonicalHash([
      TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_LOOP_ID,
      [...TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_ORDER],
      roleArtifactHashes,
    ]);
    if (input.loop_transcript_hash !== expectedTranscriptHash) {
      return this.block(
        'N6_REFINEMENT_DELTA_DEBATE_LOOP_TRANSCRIPT_DRIFT',
        'Refinement delta Debate transcript does not bind the canonical role-artifact chain.',
      );
    }

    const arbiter = input.role_results[2]!.structured_output;
    if (arbiter.decision !== 'admit_unchanged' && arbiter.decision !== 'block_with_findings') {
      return this.block(
        'N6_REFINEMENT_DELTA_DEBATE_ARBITER_DECISION_MISSING',
        'The terminal Arbiter must choose admit_unchanged or block_with_findings.',
      );
    }
    const findings = arbiter.findings ?? [];
    if (!this.findingsAreScoped(findings, input.context.changed_fields)) {
      return this.block(
        'N6_REFINEMENT_DELTA_DEBATE_ARBITER_FINDINGS_INVALID',
        'Arbiter findings must be non-empty observations scoped to changed fields.',
      );
    }
    const materialFindings = findings.filter((finding) =>
      finding.severity === 'material' || finding.severity === 'blocking');
    if ((arbiter.decision === 'admit_unchanged' && materialFindings.length > 0)
      || (arbiter.decision === 'block_with_findings' && materialFindings.length === 0)) {
      return this.block(
        'N6_REFINEMENT_DELTA_DEBATE_ARBITER_FINDINGS_INVALID',
        'Arbiter findings do not support the terminal refinement-delta decision.',
      );
    }
    const summary = arbiter.summary?.trim();
    if (!summary) {
      return this.block(
        'N6_REFINEMENT_DELTA_DEBATE_ARBITER_DECISION_MISSING',
        'The terminal Arbiter must provide a non-empty summary.',
      );
    }

    const context = input.context;
    const payload: TopicSelectionV1bN6RefinementDeltaDebateAdmissionPayload = {
      schema_version: TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ADMISSION_SCHEMA_VERSION,
      workflow_run_id: input.workflow_run_id,
      node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
      policy_version: input.policy_version,
      allowed_effect: 'support_only',
      source_kind: context.source_kind,
      source_decision_ref: context.source_decision_ref,
      checkpoint_ref: context.checkpoint_ref,
      previous_topic_question_contract_ref: context.previous_topic_question_contract_ref,
      previous_topic_question_contract_hash: context.previous_topic_question_contract_hash,
      current_topic_question_contract_ref: context.current_topic_question_contract_ref,
      current_topic_question_contract_hash: context.current_topic_question_contract_hash,
      proposed_contract_semantic_hash: context.proposed_contract_semantic_hash,
      refinement_id: context.refinement.refinement_id,
      refinement_hash: context.refinement_hash,
      delta_hash: context.delta_hash,
      changed_fields: context.changed_fields,
      selected_candidate_ref: context.selected_candidate_ref,
      selected_candidate_hash: context.selected_candidate_hash,
      selected_research_slice_ref: context.selected_research_slice_ref,
      selected_research_slice_hash: context.selected_research_slice_hash,
      evidence_ceiling_hash: context.evidence_ceiling_hash,
      verdict: arbiter.decision,
      role_artifact_hashes: roleArtifactHashes,
      loop_transcript_hash: input.loop_transcript_hash,
      findings,
      summary,
    };
    return { admitted: true, payload, payload_hash: canonicalHash(payload) };
  }

  private findForbiddenKey(value: unknown): string | null {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.findForbiddenKey(item);
        if (found) return found;
      }
      return null;
    }
    if (!value || typeof value !== 'object') return null;
    for (const [key, nested] of Object.entries(value)) {
      if (FORBIDDEN_AUTHORITY_KEYS.has(key)) return key;
      const found = this.findForbiddenKey(nested);
      if (found) return found;
    }
    return null;
  }

  private sameOrder(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  private sameFieldSet(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length
      && new Set(left).size === left.length
      && left.every((field) => right.includes(field as typeof right[number]));
  }

  private findingsAreScoped(
    findings: TopicSelectionV1bN6RefinementDeltaDebateRolePayload['critic_findings'],
    changedFields: TopicSelectionV1bN6RefinementDeltaDebateContext['changed_fields'],
  ): boolean {
    return Array.isArray(findings) && findings.every((finding) =>
      finding.finding_code.trim().length > 0
      && finding.statement.trim().length > 0
      && (finding.field == null || changedFields.includes(finding.field)));
  }

  private block(
    code: TopicSelectionV1bN6RefinementDeltaDebateAdmissionBlockerCode,
    message: string,
    details?: Record<string, unknown>,
  ): TopicSelectionV1bN6RefinementDeltaDebateAdmissionResult {
    return { admitted: false, blocker: { code, message, ...(details ? { details } : {}) } };
  }
}
