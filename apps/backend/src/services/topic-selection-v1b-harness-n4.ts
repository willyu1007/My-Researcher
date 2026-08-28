/**
 * W-12 / D-T127-01: v1b harness N4 (generate-research-slice-options) pure helpers, relocated
 * VERBATIM from the harness. `this`-free draft predicate/extraction, upstream-lineage + planning-input
 * builders, the per-option draft gate, and the normalize-based string leaves (aligns /
 * nonGoalsRemainExcluded / explicitClaimCeilingViolations); aligns + explicitClaimCeilingViolations
 * also serve the staying N6 structural/semantic gates, while nonGoalsRemainExcluded is N4-internal.
 * The N4 methods touching N4ValidatedOptionSet / n4ResearchSliceRuntime / control-plane I/O stay.
 */
import type {
  TopicSelectionV1bN4HarnessFrozenInputPayload,
  TopicSelectionV1bResearchSliceOptionSetDraftPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import type {
  TopicSelectionResearchConstraintProfileRecord,
  TopicSelectionV1bIntakeReadinessAssessmentRecord,
  TopicSelectionV1bIntakeSnapshotRecord,
  TopicSelectionV1bResearchSlicePlanningInput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-intake-contracts';
import type { TopicSelectionResearchSliceOptionDraft } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
import { hasOnlyKeys, isRecord } from './topic-selection-v1b-harness-pure-utils.js';
import {
  isCandidatePortfolioDisposition,
  isN4DraftOption,
  isNullableString,
  isStringArray,
} from './topic-selection-v1b-harness-predicates.js';
import { normalize, refsEqual } from './topic-selection-v1b-harness-gate-utils.js';
import {
  draftEvidenceRefs,
  profileRef as buildProfileRef,
  readinessRef as buildReadinessRef,
  snapshotRef as buildSnapshotRef,
} from './topic-selection-v1b-harness-ref-builders.js';

export function n4RuntimeAuditDrift(message: string): { ok: false; code: string; message: string } {
  return {
    ok: false,
    code: 'N4_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
    message,
  };
}

export function extractN4DraftPayload(
  payload: Record<string, unknown> | null | undefined,
): TopicSelectionV1bResearchSliceOptionSetDraftPayload | null {
  if (!isRecord(payload)) {
    return null;
  }
  const candidate = isRecord(payload.normalized_output)
    ? payload.normalized_output
    : payload;
  return isN4DraftPayload(candidate)
    ? candidate as unknown as TopicSelectionV1bResearchSliceOptionSetDraftPayload
    : null;
}

export function isN4DraftPayload(value: Record<string, unknown>): boolean {
  return hasOnlyKeys(value, [
    'comparison_axes',
    'comparison_summary',
    'human_review_triggers',
    'missing_option_types',
    'options',
    'portfolio_disposition',
    'recommended_option_key',
    'unresolved_disagreements',
  ])
    && isNullableString(value.recommended_option_key)
    && isStringArray(value.comparison_axes)
    && typeof value.comparison_summary === 'string'
    && value.comparison_summary.trim().length > 0
    && isStringArray(value.missing_option_types)
    && isStringArray(value.unresolved_disagreements)
    && isStringArray(value.human_review_triggers)
    && (
      value.portfolio_disposition === undefined
      || value.portfolio_disposition === null
      || isCandidatePortfolioDisposition(value.portfolio_disposition)
    )
    && Array.isArray(value.options)
    && (value.options.length > 0 || isCandidatePortfolioDisposition(value.portfolio_disposition))
    && value.options.every((option) => isN4DraftOption(option));
}

export function n4NonSelectedPortfolioBlocker(
  draft: TopicSelectionV1bResearchSliceOptionSetDraftPayload,
  knownEvidenceIds: Set<string>,
): { code: string; message: string } | null {
  const portfolio = draft.portfolio_disposition;
  if (!portfolio || portfolio.outcome === 'selected') {
    return null;
  }
  const dispositionEvidenceRefs = [
    ...portfolio.evidence_refs,
    ...portfolio.rejection_reasons.flatMap((reason) => reason.evidence_refs),
    ...portfolio.candidate_dispositions.flatMap((candidate) => candidate.evidence_refs),
  ];
  const optionKeys = new Set(draft.options.map((option) => option.option_key));
  const dispositionKeys = portfolio.candidate_dispositions.map((candidate) => candidate.candidate_key);
  const valid = !draft.recommended_option_key
    && portfolio.confidence >= 0
    && portfolio.confidence <= 1
    && portfolio.evidence_refs.length > 0
    && portfolio.rejection_reasons.length > 0
    && portfolio.reopening_conditions.length > 0
    && portfolio.rejection_reasons.every((reason) => reason.evidence_refs.length > 0)
    && dispositionEvidenceRefs.every((ref) => knownEvidenceIds.has(ref.ref_id))
    && optionKeys.size === draft.options.length
    && dispositionKeys.length === optionKeys.size
    && new Set(dispositionKeys).size === dispositionKeys.length
    && dispositionKeys.every((candidateKey) => optionKeys.has(candidateKey))
    && portfolio.candidate_dispositions.every((candidate) =>
      candidate.disposition !== 'selected'
      && candidate.evidence_refs.length > 0
      && (candidate.disposition === 'dropped') === Boolean(candidate.drop_reason_code)
      && (candidate.disposition !== 'parked' || candidate.reopening_conditions.length > 0)
    )
    && (portfolio.outcome !== 'none_viable' || draft.options.length === 0);
  return valid
    ? null
    : {
        code: 'N4_NON_SELECTED_PORTFOLIO_INVALID',
        message: 'N4 non-selected portfolios require frozen evidence-backed rejection reasons, bounded confidence, reopening conditions, and no recommended downstream option.',
      };
}

export function n4SelectedPortfolioBlocker(
  draft: TopicSelectionV1bResearchSliceOptionSetDraftPayload,
  knownEvidenceIds: Set<string>,
): { code: string; message: string } | null {
  const portfolio = draft.portfolio_disposition;
  if (portfolio?.outcome !== 'selected') {
    return null;
  }
  const optionKeys = new Set(draft.options.map((option) => option.option_key));
  const dispositionKeys = portfolio.candidate_dispositions.map((candidate) => candidate.candidate_key);
  const selected = portfolio.candidate_dispositions.filter((candidate) => candidate.disposition === 'selected');
  const citedRefs = [
    ...portfolio.evidence_refs,
    ...portfolio.rejection_reasons.flatMap((reason) => reason.evidence_refs),
    ...portfolio.candidate_dispositions.flatMap((candidate) => candidate.evidence_refs),
  ];
  const valid = portfolio.confidence >= 0
    && portfolio.confidence <= 1
    && portfolio.evidence_refs.length > 0
    && draft.options.length > 0
    && selected.length === 1
    && draft.recommended_option_key === selected[0]?.candidate_key
    && dispositionKeys.length === optionKeys.size
    && new Set(dispositionKeys).size === dispositionKeys.length
    && dispositionKeys.every((candidateKey) => optionKeys.has(candidateKey))
    && citedRefs.every((ref) => knownEvidenceIds.has(ref.ref_id))
    && portfolio.rejection_reasons.every((reason) => reason.evidence_refs.length > 0)
    && portfolio.candidate_dispositions.every((candidate) =>
      candidate.evidence_refs.length > 0
      && (candidate.disposition === 'dropped') === Boolean(candidate.drop_reason_code)
      && (candidate.disposition !== 'parked' || candidate.reopening_conditions.length > 0)
    );
  return valid
    ? null
    : {
        code: 'N4_SELECTED_PORTFOLIO_INVALID',
        message: 'N4 selected portfolios require exactly one recommended selected option, complete grounded dispositions, drop reasons, and parked reopening conditions.',
      };
}

export function n4LineageBlocker(
  payload: TopicSelectionV1bN4HarnessFrozenInputPayload,
  snapshot: TopicSelectionV1bIntakeSnapshotRecord,
  profile: TopicSelectionResearchConstraintProfileRecord,
  readiness: TopicSelectionV1bIntakeReadinessAssessmentRecord,
  hashes: {
    profileHash: string;
    readinessHash: string;
    snapshotHash: string;
  },
): { code: string; message: string } | null {
  if (!refsEqual(payload.intake_snapshot_ref, buildSnapshotRef(snapshot))
    || payload.intake_snapshot_hash !== hashes.snapshotHash) {
    return {
      code: 'N4_INTAKE_SNAPSHOT_HASH_MISMATCH',
      message: 'N4 frozen intake snapshot ref/hash does not match persisted N1 authority.',
    };
  }
  if (!refsEqual(payload.constraint_profile_ref, buildProfileRef(profile))
    || payload.constraint_profile_hash !== hashes.profileHash) {
    return {
      code: 'N4_CONSTRAINT_PROFILE_HASH_MISMATCH',
      message: 'N4 frozen constraint profile ref/hash does not match persisted N2 authority.',
    };
  }
  if (!refsEqual(payload.intake_readiness_ref, buildReadinessRef(readiness))
    || payload.intake_readiness_hash !== hashes.readinessHash) {
    return {
      code: 'N4_INTAKE_READINESS_HASH_MISMATCH',
      message: 'N4 frozen readiness ref/hash does not match persisted N3 authority.',
    };
  }
  if (
    profile.v1b_intake_snapshot_id !== snapshot.v1b_intake_snapshot_id
    || readiness.v1b_intake_snapshot_id !== snapshot.v1b_intake_snapshot_id
    || readiness.research_constraint_profile_id !== profile.research_constraint_profile_id
  ) {
    return {
      code: 'N4_UPSTREAM_AUTHORITY_LINEAGE_MISMATCH',
      message: 'N4 upstream snapshot, profile, and readiness authorities do not share lineage.',
    };
  }
  return null;
}

export function buildN4PlanningInput(
  snapshot: TopicSelectionV1bIntakeSnapshotRecord,
  profile: TopicSelectionResearchConstraintProfileRecord,
  readiness: TopicSelectionV1bIntakeReadinessAssessmentRecord,
): TopicSelectionV1bResearchSlicePlanningInput {
  return {
    v1b_input_bundle_ref: snapshot.v1b_input_bundle_ref,
    v1b_intake_snapshot_ref: buildSnapshotRef(snapshot),
    research_constraint_profile_ref: buildProfileRef(profile),
    readiness_assessment_ref: buildReadinessRef(readiness),
    validated_need_ref: snapshot.validated_need_ref,
    evidence_map_ref: snapshot.evidence_map_ref,
    search_run_ref: snapshot.search_run_ref,
    search_plan_ref: snapshot.search_plan_ref,
    literature_snapshot_ref: snapshot.literature_snapshot_ref,
    evidence_role_bundle: snapshot.evidence_role_bundle,
    target_community: profile.target_community,
    target_venue_class: profile.target_venue_class ?? null,
    intended_contribution_style: profile.intended_contribution_style ?? null,
    method_constraints: profile.method_constraints,
    resource_constraints: profile.resource_constraints,
    available_assets: profile.available_assets,
    feasibility_budget: profile.feasibility_budget,
    non_goals: profile.non_goals,
    claim_ceiling: profile.claim_ceiling,
    accepted_risk_refs: readiness.accepted_risk_refs,
    gap_codes: snapshot.gap_codes,
    memory_suggestion_refs: snapshot.memory_suggestion_refs,
    recheck_request_refs: snapshot.recheck_request_refs,
    handoff_payload: snapshot.handoff_payload,
  };
}

export function n4DraftGateBlocker(
  draft: TopicSelectionResearchSliceOptionDraft,
  planningInput: TopicSelectionV1bResearchSlicePlanningInput,
  knownEvidenceIds: Set<string>,
  index: number,
): { ok: false; code: string; message: string } | null {
  const ordinal = index + 1;
  if (draft.source_validated_need_refs.every((ref) => !refsEqual(ref, planningInput.validated_need_ref))) {
    return {
      ok: false,
      code: 'N4_VALIDATED_NEED_REF_MISSING',
      message: `N4 ResearchSlice option ${ordinal} must reference the inherited ValidatedNeed.`,
    };
  }
  if (draft.included_boundaries.length === 0 || draft.excluded_boundaries.length === 0) {
    return {
      ok: false,
      code: 'N4_SCOPE_BOUNDARY_MISSING',
      message: `N4 ResearchSlice option ${ordinal} must include both included and excluded boundaries.`,
    };
  }
  if (!aligns(draft.target_community, planningInput.target_community)) {
    return {
      ok: false,
      code: 'N4_TARGET_COMMUNITY_DRIFT',
      message: `N4 ResearchSlice option ${ordinal} target community drifts from ResearchConstraintProfile.`,
    };
  }
  if (!nonGoalsRemainExcluded(draft, planningInput.non_goals)) {
    return {
      ok: false,
      code: 'N4_NON_GOAL_NOT_EXCLUDED',
      message: `N4 ResearchSlice option ${ordinal} does not preserve ResearchConstraintProfile non-goals.`,
    };
  }
  const optionEvidenceRefs = draftEvidenceRefs(draft);
  if (optionEvidenceRefs.length === 0) {
    return {
      ok: false,
      code: 'N4_EVIDENCE_REF_MISSING',
      message: `N4 ResearchSlice option ${ordinal} must cite inherited evidence refs.`,
    };
  }
  const unknownEvidence = optionEvidenceRefs.find((ref) => !knownEvidenceIds.has(ref.ref_id));
  if (unknownEvidence) {
    return {
      ok: false,
      code: 'N4_UNKNOWN_EVIDENCE_REF',
      message: `N4 ResearchSlice option ${ordinal} cites unknown evidence ref ${unknownEvidence.ref_id}.`,
    };
  }
  const explicitClaimViolations = explicitClaimCeilingViolations(
    planningInput.claim_ceiling,
    [draft.expected_claim, draft.fallback_claim],
  );
  if (draft.claim_ceiling_alignment.status === 'exceeds' || explicitClaimViolations.length > 0) {
    return {
      ok: false,
      code: 'N4_CLAIM_CEILING_EXCEEDED',
      message: `N4 ResearchSlice option ${ordinal} exceeds the ResearchConstraintProfile claim ceiling.`,
    };
  }
  return null;
}

export function nonGoalsRemainExcluded(
  draft: TopicSelectionResearchSliceOptionDraft,
  nonGoals: string[],
): boolean {
  const excludedText = draft.excluded_boundaries.map((value) => normalize(value)).join(' ');
  return nonGoals.every((nonGoal) => excludedText.includes(normalize(nonGoal)));
}

export function explicitClaimCeilingViolations(claimCeiling: string, claims: string[]): string[] {
  const claimText = claims.map((claim) => normalize(claim)).join(' ');
  const ceilingText = normalize(claimCeiling);
  const blockedPhrases = [
    ...ceilingText.matchAll(/\b(?:not|cannot|can't|do not|should not)\s+([^.;,]+)/g),
  ]
    .map((match) => match[1]?.trim() ?? '')
    .filter((phrase) => phrase.length >= 4);
  return blockedPhrases.filter((phrase) => claimText.includes(phrase));
}

export function aligns(left: string, right: string): boolean {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  return normalizedLeft === normalizedRight
    || normalizedLeft.includes(normalizedRight)
    || normalizedRight.includes(normalizedLeft);
}
