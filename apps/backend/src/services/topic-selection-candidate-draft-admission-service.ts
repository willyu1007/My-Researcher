import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionCandidateDraftAdmissionReport,
  TopicSelectionCandidateDraftAdmissionResult,
  TopicSelectionGenerateNeedCandidateNodeInput,
  TopicSelectionNeedCandidateDraft,
  TopicSelectionRankedCandidateDraftBatch,
  TopicSelectionRankedCandidateDraftBatchMinimumValidationReport,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import { AppError } from '../errors/app-error.js';
import { normalizeWhitespace } from './literature-content-processing-utils.js';

export type TopicSelectionCandidateDraftAdmissionPoolEntry = {
  normalized_candidate_key: string;
  candidate_ref: TopicSelectionFunctionalRef;
};

export type TopicSelectionCandidateDraftEvidenceRoleRefEntry = {
  evidence_ref: TopicSelectionFunctionalRef;
  role: 'support' | 'challenge' | 'baseline' | 'context' | string;
};

export type TopicSelectionCandidateDraftAdmissionInput = {
  node_input: TopicSelectionGenerateNeedCandidateNodeInput;
  ranked_candidate_draft_batch: TopicSelectionRankedCandidateDraftBatch;
  minimum_validation_report: TopicSelectionRankedCandidateDraftBatchMinimumValidationReport;
  resolvable_refs: TopicSelectionFunctionalRef[];
  evidence_role_ref_entries?: TopicSelectionCandidateDraftEvidenceRoleRefEntry[];
  method_family_counts?: Record<string, number>;
  method_family_targets?: string[];
  candidate_pool_entries?: TopicSelectionCandidateDraftAdmissionPoolEntry[];
  max_persisted_candidates?: number | null;
  remaining_round_budget?: number | null;
};

type DraftAdmissionDecisionInput = {
  draft: TopicSelectionNeedCandidateDraft;
  index: number;
  normalizedCandidateKey: string;
  duplicateRefs: TopicSelectionFunctionalRef[];
  unresolvedRefs: TopicSelectionFunctionalRef[];
  roleBundleViolations: string[];
  methodCoverageWarningCodes: string[];
  remainingRoundBudget: number;
};

const INVALID_BATCH_CODE = 'INVALID_RANKED_CANDIDATE_DRAFT_BATCH';
const ROLE_BUNDLE_NON_EVIDENCE_REF = 'ROLE_BUNDLE_NON_EVIDENCE_REF';
const ROLE_BUNDLE_EVIDENCE_ROLE_MISMATCH = 'ROLE_BUNDLE_EVIDENCE_ROLE_MISMATCH';
const METHOD_FAMILY_COVERAGE_GAP = 'METHOD_FAMILY_COVERAGE_GAP';

const ROLE_BUNDLE_FIELDS = [
  ['support', 'support_unit_refs'],
  ['challenge', 'challenge_unit_refs'],
  ['baseline', 'baseline_unit_refs'],
  ['context', 'context_unit_refs'],
] as const;

export class TopicSelectionCandidateDraftAdmissionService {
  createAdmissionReport(input: TopicSelectionCandidateDraftAdmissionInput): TopicSelectionCandidateDraftAdmissionReport {
    this.assertMinimumValidationPassed(input.minimum_validation_report);
    const allowedRefs = this.refKeySet([
      input.node_input.topic_scope_ref,
      input.node_input.evidence_map_ref,
      input.node_input.evidence_strength_ref,
      input.node_input.resource_sample_set_ref ?? null,
      input.node_input.candidate_pool_projection_ref ?? null,
      ...input.node_input.search_snapshot_refs,
      ...input.node_input.resource_snapshot_refs,
      ...input.resolvable_refs,
    ]);
    const roleByRefKey = this.evidenceRoleByRefKey(input.evidence_role_ref_entries ?? []);
    const candidatePool = new Map(
      (input.candidate_pool_entries ?? []).map((entry) => [entry.normalized_candidate_key, entry.candidate_ref]),
    );
    const firstDraftByKey = new Map<string, TopicSelectionFunctionalRef>();
    const draftResults = input.ranked_candidate_draft_batch.drafts.map((draft, index) => {
      const normalizedCandidateKey = this.normalizedCandidateKey(draft);
      const duplicateRefs = this.duplicateRefs(draft, normalizedCandidateKey, firstDraftByKey, candidatePool);
      const unresolvedRefs = this.unresolvedRefs(draft, allowedRefs);
      const roleBundleViolations = this.roleBundleViolations(draft, roleByRefKey);
      const methodCoverageWarningCodes = this.methodCoverageWarningCodes(
        draft,
        input.method_family_counts ?? {},
        input.method_family_targets ?? [],
      );
      const decision = this.decideDraft({
        draft,
        index,
        normalizedCandidateKey,
        duplicateRefs,
        unresolvedRefs,
        roleBundleViolations,
        methodCoverageWarningCodes,
        remainingRoundBudget: input.remaining_round_budget ?? 0,
      });
      if (!firstDraftByKey.has(normalizedCandidateKey)) {
        firstDraftByKey.set(normalizedCandidateKey, this.ref('candidate_draft', draft.draft_id));
      }
      return decision;
    });

    const admittedCount = draftResults.filter((result) => result.decision === 'admit').length;
    const rejectedCount = draftResults.filter((result) =>
      result.decision === 'reject_artifact_only'
      || result.decision === 'require_human_review'
      || result.decision === 'return_for_supplemental_round'
    ).length;
    const mergeHintCount = draftResults.filter((result) => result.decision === 'merge_hint_only').length;
    const batchBlockingReasonCodes = this.batchBlockingReasonCodes(draftResults, input.max_persisted_candidates);

    return {
      schema_version: 'v1',
      batch_id: input.ranked_candidate_draft_batch.draft_batch.batch_id,
      node_attempt_id: input.ranked_candidate_draft_batch.draft_batch.node_attempt_id,
      terminal_result: input.ranked_candidate_draft_batch.draft_batch.terminal_result,
      draft_results: draftResults,
      valid_draft_count: admittedCount,
      rejected_draft_count: rejectedCount,
      merge_hint_count: mergeHintCount,
      blocking_reason_codes: batchBlockingReasonCodes,
      portfolio_disposition: input.ranked_candidate_draft_batch.portfolio_disposition ?? null,
    };
  }

  private decideDraft(input: DraftAdmissionDecisionInput): TopicSelectionCandidateDraftAdmissionResult {
    const refCounts = this.resolvedRefCounts(input.draft);
    if (input.unresolvedRefs.length > 0) {
      return this.result(input, 'reject_artifact_only', ['UNRESOLVED_CANDIDATE_DRAFT_REFS'], {
        blockingReasonCodes: ['UNRESOLVED_CANDIDATE_DRAFT_REFS'],
        duplicateRefs: [],
        refCounts,
      });
    }
    if (input.roleBundleViolations.length > 0) {
      if (input.remainingRoundBudget > 0) {
        return this.result(input, 'return_for_supplemental_round', input.roleBundleViolations, {
          refCounts,
          supplementalQuestions: [this.roleBundleSupplementalQuestion(input.draft)],
        });
      }
      return this.result(input, 'reject_artifact_only', input.roleBundleViolations, {
        blockingReasonCodes: input.roleBundleViolations,
        refCounts,
      });
    }
    if (this.scopeDrifts(input.draft)) {
      return this.result(input, 'reject_artifact_only', ['SCOPE_DRIFT'], { refCounts });
    }
    if (refCounts.support + refCounts.challenge === 0) {
      return this.result(input, 'reject_artifact_only', ['INSUFFICIENT_SUPPORT_OR_CHALLENGE_EVIDENCE'], { refCounts });
    }
    if (this.mechanismIsInsufficient(input.draft)) {
      return this.result(input, 'reject_artifact_only', ['PSEUDO_GAP_ONLY'], { refCounts });
    }
    if (input.draft.prior_art_status === 'already_solved' || input.draft.prior_art_status === 'falsified') {
      return this.result(input, 'reject_artifact_only', [`PRIOR_ART_${input.draft.prior_art_status.toUpperCase()}`], {
        refCounts,
      });
    }
    if (input.duplicateRefs.length > 0) {
      return this.result(input, 'merge_hint_only', ['DUPLICATE_NEED_CANDIDATE'], {
        duplicateRefs: input.duplicateRefs,
        mergeTargetRef: input.duplicateRefs[0],
        refCounts,
      });
    }
    if (input.draft.speculative && !this.hasRiskBounds(input.draft)) {
      const supplementalQuestion = [
        'Clarify risk bounds for draft',
        input.draft.draft_id,
        'using challenge/conflict evidence or explicit scope limits.',
      ].join(' ');
      if (input.remainingRoundBudget > 0) {
        return this.result(input, 'return_for_supplemental_round', ['SPECULATIVE_DRAFT_NEEDS_RISK_BOUNDS'], {
          refCounts,
          supplementalQuestions: [supplementalQuestion],
        });
      }
      return this.result(input, 'require_human_review', ['SPECULATIVE_DRAFT_NEEDS_HUMAN_REVIEW'], {
        refCounts,
        requiredHumanReviewPoints: this.humanReviewPoints(input.draft),
      });
    }
    return this.result(input, 'admit', this.uniqueStrings(['grounded', ...input.methodCoverageWarningCodes]), {
      admittedDraftRef: this.ref('candidate_draft', input.draft.draft_id),
      refCounts,
    });
  }

  private result(
    input: DraftAdmissionDecisionInput,
    decision: TopicSelectionCandidateDraftAdmissionResult['decision'],
    reasonCodes: string[],
    options: {
      refCounts: TopicSelectionCandidateDraftAdmissionResult['resolved_ref_counts'];
      blockingReasonCodes?: string[];
      duplicateRefs?: TopicSelectionFunctionalRef[];
      requiredHumanReviewPoints?: TopicSelectionFunctionalRef[];
      supplementalQuestions?: string[];
      admittedDraftRef?: TopicSelectionFunctionalRef | null;
      mergeTargetRef?: TopicSelectionFunctionalRef | null;
    },
  ): TopicSelectionCandidateDraftAdmissionResult {
    return {
      draft_id: input.draft.draft_id,
      rank: input.draft.rank,
      decision,
      reason_codes: reasonCodes,
      blocking_reason_codes: options.blockingReasonCodes ?? [],
      resolved_ref_counts: options.refCounts,
      normalized_candidate_key: input.normalizedCandidateKey,
      duplicate_candidate_refs: options.duplicateRefs ?? [],
      required_human_review_points: options.requiredHumanReviewPoints ?? [],
      supplemental_questions: options.supplementalQuestions ?? [],
      admitted_draft_ref: options.admittedDraftRef ?? null,
      merge_target_ref: options.mergeTargetRef ?? null,
    };
  }

  private assertMinimumValidationPassed(report: TopicSelectionRankedCandidateDraftBatchMinimumValidationReport): void {
    if (!report.valid) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'CandidateDraftAdmissionReport requires a valid minimum schema validation report.',
        { blocking_reason_codes: [INVALID_BATCH_CODE, ...report.blocking_reason_codes] },
      );
    }
  }

  private duplicateRefs(
    draft: TopicSelectionNeedCandidateDraft,
    normalizedCandidateKey: string,
    firstDraftByKey: Map<string, TopicSelectionFunctionalRef>,
    candidatePool: Map<string, TopicSelectionFunctionalRef>,
  ): TopicSelectionFunctionalRef[] {
    return [
      candidatePool.get(normalizedCandidateKey) ?? null,
      firstDraftByKey.get(normalizedCandidateKey) ?? null,
    ].filter((ref): ref is TopicSelectionFunctionalRef => Boolean(ref && ref.ref_id !== draft.draft_id));
  }

  private unresolvedRefs(
    draft: TopicSelectionNeedCandidateDraft,
    allowedRefs: Set<string>,
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      ...this.evidenceRefs(draft),
      ...draft.conflict_refs,
      ...draft.strength_assessment_refs,
    ]).filter((ref) => !allowedRefs.has(this.refKey(ref)));
  }

  private resolvedRefCounts(draft: TopicSelectionNeedCandidateDraft): TopicSelectionCandidateDraftAdmissionResult['resolved_ref_counts'] {
    return {
      support: draft.evidence_role_bundle.support_unit_refs.length,
      challenge: draft.evidence_role_bundle.challenge_unit_refs.length,
      baseline: draft.evidence_role_bundle.baseline_unit_refs.length,
      context: draft.evidence_role_bundle.context_unit_refs.length,
    };
  }

  private batchBlockingReasonCodes(
    draftResults: TopicSelectionCandidateDraftAdmissionResult[],
    maxPersistedCandidates?: number | null,
  ): string[] {
    const admittedCount = draftResults.filter((result) => result.decision === 'admit').length;
    if (maxPersistedCandidates && admittedCount > maxPersistedCandidates) {
      return ['TOO_MANY_NEED_CANDIDATES'];
    }
    if (
      admittedCount === 0
      && draftResults.every((result) =>
        result.decision !== 'return_for_supplemental_round'
        && result.decision !== 'require_human_review'
      )
    ) {
      return ['NO_ADMISSIBLE_NEED_CANDIDATE'];
    }
    return [];
  }

  private evidenceRoleByRefKey(
    entries: TopicSelectionCandidateDraftEvidenceRoleRefEntry[],
  ): Map<string, string> {
    const map = new Map<string, string>();
    for (const entry of entries) {
      if (entry.evidence_ref.ref_type === 'evidence_unit' && entry.role.trim()) {
        map.set(this.refKey(entry.evidence_ref), entry.role);
      }
    }
    return map;
  }

  private roleBundleViolations(
    draft: TopicSelectionNeedCandidateDraft,
    roleByRefKey: Map<string, string>,
  ): string[] {
    const violations: string[] = [];
    for (const [expectedRole, fieldName] of ROLE_BUNDLE_FIELDS) {
      for (const ref of draft.evidence_role_bundle[fieldName]) {
        if (ref.ref_type !== 'evidence_unit') {
          violations.push(ROLE_BUNDLE_NON_EVIDENCE_REF);
          continue;
        }
        const actualRole = roleByRefKey.get(this.refKey(ref));
        if (actualRole && actualRole !== expectedRole) {
          violations.push(ROLE_BUNDLE_EVIDENCE_ROLE_MISMATCH);
        }
      }
    }
    return this.uniqueStrings(violations);
  }

  private roleBundleSupplementalQuestion(draft: TopicSelectionNeedCandidateDraft): string {
    return [
      'Rebuild role bundle for draft',
      draft.draft_id,
      'so support/challenge/baseline/context refs cite evidence_unit refs from matching EvidenceMap roles.',
      'Keep evidence_conflict/evidence_conflict_set refs in conflict_refs and evidence_strength_assessment refs in strength_assessment_refs only.',
    ].join(' ');
  }

  private methodCoverageWarningCodes(
    draft: TopicSelectionNeedCandidateDraft,
    methodFamilyCounts: Record<string, number>,
    methodFamilyTargets: string[],
  ): string[] {
    if (Object.keys(methodFamilyCounts).length === 0 && methodFamilyTargets.length === 0) {
      return [];
    }
    const targetSet = new Set(methodFamilyTargets);
    const mentionedFamilies = this.mentionedMethodFamilies(draft)
      .filter((family) => targetSet.size === 0 || targetSet.has(family));
    const missing = mentionedFamilies.filter((family) => (methodFamilyCounts[family] ?? 0) <= 0);
    return missing.length > 0 ? [METHOD_FAMILY_COVERAGE_GAP] : [];
  }

  private mentionedMethodFamilies(draft: TopicSelectionNeedCandidateDraft): string[] {
    const text = normalizeWhitespace([
      draft.candidate_need,
      draft.unmet_need_statement,
      draft.mechanism_summary ?? '',
      draft.scope_notes ?? '',
      draft.non_goal_notes ?? '',
      JSON.stringify(draft.mechanism_payload ?? {}),
    ].join(' ')).toLowerCase();
    const families: string[] = [];
    if (/\brag\b|retrieval[- ]?augmented|retrieval augmentation/.test(text)) {
      families.push('retrieval_augmented_generation');
    }
    if (/fine[- ]?tuning|finetun|lora|adapter/.test(text)) {
      families.push('fine_tuning');
    }
    if (/\bhybrid\b|combined retrieval|retrieval[- ]?plus/.test(text)) {
      families.push('hybrid_adaptation');
    }
    return this.uniqueStrings(families);
  }

  private mechanismIsInsufficient(draft: TopicSelectionNeedCandidateDraft): boolean {
    const text = normalizeWhitespace([
      draft.candidate_need,
      draft.unmet_need_statement,
      draft.mechanism_summary ?? '',
    ].join(' ')).toLowerCase();
    const broadOnly = /\b(interesting topic|more research|study ai|explore llms|investigate models|better approach)\b/.test(text);
    return (
      broadOnly
      || (
        draft.mechanism_type === 'other'
        && !draft.mechanism_summary?.trim()
        && Object.keys(draft.mechanism_payload).length === 0
      )
    );
  }

  private scopeDrifts(draft: TopicSelectionNeedCandidateDraft): boolean {
    const text = normalizeWhitespace([
      draft.candidate_need,
      draft.unmet_need_statement,
      draft.scope_notes ?? '',
      draft.non_goal_notes ?? '',
    ].join(' ')).toLowerCase();
    return /\b(out of scope|unrelated|excluded|non-goal violation)\b/.test(text);
  }

  private hasRiskBounds(draft: TopicSelectionNeedCandidateDraft): boolean {
    return (
      draft.evidence_role_bundle.challenge_unit_refs.length > 0
      || draft.conflict_refs.length > 0
      || Boolean(draft.scope_notes?.trim())
      || Boolean(draft.non_goal_notes?.trim())
    );
  }

  private humanReviewPoints(draft: TopicSelectionNeedCandidateDraft): TopicSelectionFunctionalRef[] {
    const reviewPoints = this.uniqueRefs([
      ...draft.conflict_refs,
      ...draft.accepted_risk_refs,
    ]);
    return reviewPoints.length > 0 ? reviewPoints : [this.ref('candidate_draft', draft.draft_id)];
  }

  private normalizedCandidateKey(draft: TopicSelectionNeedCandidateDraft): string {
    const normalized = normalizeWhitespace(`${draft.candidate_need} ${draft.unmet_need_statement}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 160);
    return normalized || draft.draft_id;
  }

  private evidenceRefs(draft: TopicSelectionNeedCandidateDraft): TopicSelectionFunctionalRef[] {
    return [
      ...draft.evidence_role_bundle.support_unit_refs,
      ...draft.evidence_role_bundle.challenge_unit_refs,
      ...draft.evidence_role_bundle.baseline_unit_refs,
      ...draft.evidence_role_bundle.context_unit_refs,
    ];
  }

  private ref(refType: string, refId: string): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
    };
  }

  private refKeySet(refs: Array<TopicSelectionFunctionalRef | null | undefined>): Set<string> {
    return new Set(refs.filter((ref): ref is TopicSelectionFunctionalRef => Boolean(ref)).map((ref) => this.refKey(ref)));
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return `${ref.ref_type}:${ref.ref_id}`;
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const unique: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
      const key = this.refKey(ref);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      unique.push(ref);
    }
    return unique;
  }

  private uniqueStrings(values: string[]): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const value of values) {
      const normalized = value.trim();
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      unique.push(normalized);
    }
    return unique;
  }
}
