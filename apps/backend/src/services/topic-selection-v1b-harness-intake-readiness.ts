/**
 * W-12 / D-T127-01: v1b harness intake/readiness gating helpers + intake authority hashers,
 * relocated VERBATIM from the harness. Pure, `this`-free: readiness blocker/recommendation logic
 * over the ResearchConstraintProfile + IntakeSnapshot, and the snapshot/profile/readiness
 * authority-hash shapes (single-sourced with the human N2/N3 paths via canonicalHash).
 */
import type { TopicSelectionAcceptedRiskRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-recheck-risk-memory-contracts';
import type { TopicSelectionSearchPlanRecheckRequestRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import type {
  TopicSelectionResearchConstraintProfileRecord,
  TopicSelectionV1bIntakeReadinessAssessmentRecord,
  TopicSelectionV1bIntakeReadinessRecommendation,
  TopicSelectionV1bIntakeSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-intake-contracts';
import type { TopicSelectionGateIssue } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import { buildRef } from './topic-selection-v1b-harness-pure-utils.js';
import { uniqueRefs } from './topic-selection-v1b-harness-dedup-utils.js';
import { blocker, refsEqual } from './topic-selection-v1b-harness-gate-utils.js';
import {
  profileRef as buildProfileRef,
  readinessRef as buildReadinessRef,
} from './topic-selection-v1b-harness-ref-builders.js';

export function riskCoversRecheck(
  risk: TopicSelectionAcceptedRiskRecord,
  recheck: TopicSelectionSearchPlanRecheckRequestRecord,
  snapshot: TopicSelectionV1bIntakeSnapshotRecord,
): boolean {
  const recheckRef = buildRef('search_plan_recheck_request', recheck.search_plan_recheck_request_id, recheck.title_card_id);
  const coverageRefs = uniqueRefs([
    risk.source_ref ?? null,
    risk.target_ref,
    ...risk.scope_refs,
    ...risk.affected_object_refs,
  ]);
  return coverageRefs.some((ref) =>
    refsEqual(ref, recheckRef)
    || refsEqual(ref, recheck.target_search_plan_ref)
    || refsEqual(ref, snapshot.search_plan_ref)
    || refsEqual(ref, snapshot.validated_need_ref)
  );
}

export function missingConstraintCodes(profile: TopicSelectionResearchConstraintProfileRecord): string[] {
  const missing: string[] = [];
  if (!profile.target_community.trim()) {
    missing.push('TARGET_COMMUNITY_REQUIRED');
  }
  if (!profile.claim_ceiling.trim()) {
    missing.push('CLAIM_CEILING_REQUIRED');
  }
  if (!profile.non_goals.some((item) => item.trim())) {
    missing.push('NON_GOALS_REQUIRED');
  }
  if (
    !profile.method_constraints.some((item) => item.trim())
    && !profile.resource_constraints.some((item) => item.trim())
  ) {
    missing.push('METHOD_OR_RESOURCE_CONSTRAINT_REQUIRED');
  }
  return missing;
}

export function readinessBlockers(
  snapshot: TopicSelectionV1bIntakeSnapshotRecord,
  staleRefCodes: string[],
  missingConstraintCodes: string[],
  uncoveredRechecks: TopicSelectionSearchPlanRecheckRequestRecord[],
  parkReason: string | null,
): TopicSelectionGateIssue[] {
  const blockers: TopicSelectionGateIssue[] = [];
  if (snapshot.trace_status !== 'passed' || staleRefCodes.length > 0) {
    blockers.push(blocker('STALE_OR_INVALID_V1A_TRACE', 'v1b intake has stale, missing, or mismatched upstream trace refs.', [
      snapshot.v1b_input_bundle_ref,
      snapshot.validated_need_ref,
    ]));
  }
  if (uncoveredRechecks.length > 0) {
    blockers.push(blocker(
      'OPEN_HIGH_PRIORITY_RECHECK',
      'Open SearchPlan recheck must be resolved or covered by active accepted risk before slice planning.',
      uncoveredRechecks.map((request) =>
        buildRef('search_plan_recheck_request', request.search_plan_recheck_request_id, request.title_card_id)
      ),
    ));
  }
  if (parkReason) {
    blockers.push(blocker('INTAKE_PARKED', 'v1b intake is explicitly parked before ResearchSlice planning.', [
      snapshot.v1b_input_bundle_ref,
    ]));
  }
  if (missingConstraintCodes.length > 0) {
    blockers.push(blocker(
      'RESEARCH_CONSTRAINT_PROFILE_INCOMPLETE',
      'ResearchConstraintProfile is missing fields required to bound ResearchSlice planning.',
      [snapshot.validated_need_ref],
    ));
  }
  return blockers;
}

export function readinessRecommendation(
  traceStatus: TopicSelectionV1bIntakeSnapshotRecord['trace_status'],
  staleRefCodes: string[],
  uncoveredRechecks: TopicSelectionSearchPlanRecheckRequestRecord[],
  missingConstraintCodes: string[],
  parkReason: string | null,
): TopicSelectionV1bIntakeReadinessRecommendation {
  if (traceStatus !== 'passed' || staleRefCodes.length > 0) {
    return 'blocked_by_stale_trace';
  }
  if (uncoveredRechecks.length > 0) {
    return 'blocked_by_recheck';
  }
  if (parkReason) {
    return 'park';
  }
  if (missingConstraintCodes.length > 0) {
    return 'needs_constraint_clarification';
  }
  return 'ready_for_slice';
}

export function profileParkReason(profile: TopicSelectionResearchConstraintProfileRecord): string | null {
  const disposition = profile.constraint_payload.v1b_intake_disposition;
  if (disposition === 'park') {
    return typeof profile.constraint_payload.park_reason === 'string'
      ? profile.constraint_payload.park_reason
      : 'ResearchConstraintProfile requested park.';
  }
  return null;
}

export function hashSnapshotAuthority(snapshot: TopicSelectionV1bIntakeSnapshotRecord): string {
  return canonicalHash({
    bundle_ref: snapshot.v1b_input_bundle_ref,
    evidence_map_freshness_status: snapshot.evidence_map_freshness_status ?? null,
    source_refs_hash: canonicalHash(uniqueRefs([
      snapshot.v1b_input_bundle_ref,
      snapshot.validated_need_ref,
      snapshot.source_need_candidate_ref,
      snapshot.adjudication_result_ref,
      snapshot.support_packet_ref,
      snapshot.human_decision_ref,
      snapshot.evidence_map_ref,
      snapshot.search_run_ref,
      snapshot.search_plan_ref,
      snapshot.literature_snapshot_ref,
      ...snapshot.trace_refs,
      ...snapshot.risk_refs,
      ...snapshot.memory_suggestion_refs,
      ...snapshot.recheck_request_refs,
    ])),
    trace_issue_codes: snapshot.trace_issues.map((issue) => issue.code),
    trace_status: snapshot.trace_status,
  });
}

export function hashProfileAuthority(profile: TopicSelectionResearchConstraintProfileRecord): string {
  return canonicalHash({
    accepted_profile_payload_hash: canonicalHash({
      available_assets: profile.available_assets,
      claim_ceiling: profile.claim_ceiling,
      constraint_payload: profile.constraint_payload,
      feasibility_budget: profile.feasibility_budget,
      human_constraint_notes: profile.human_constraint_notes ?? null,
      intended_contribution_style: profile.intended_contribution_style ?? null,
      method_constraints: profile.method_constraints,
      non_goals: profile.non_goals,
      resource_constraints: profile.resource_constraints,
      target_community: profile.target_community,
      target_venue_class: profile.target_venue_class ?? null,
    }),
    intake_snapshot_hash: canonicalHash({
      intake_snapshot_ref: profile.v1b_intake_snapshot_ref,
      v1b_input_bundle_ref: profile.v1b_input_bundle_ref,
    }),
    previous_profile_ref: profile.supersedes_profile_ref ?? null,
    profile_ref: buildProfileRef(profile),
  });
}

export function hashReadinessAuthority(
  readiness: TopicSelectionV1bIntakeReadinessAssessmentRecord,
  hashes: {
    constraintProfileHash: string;
    n2HandoffHash: string;
    snapshotHash: string;
  },
): string {
  return canonicalHash({
    accepted_risk_refs: readiness.accepted_risk_refs,
    blocker_codes: readiness.blockers.map((blocker) => blocker.code),
    constraint_profile_hash: hashes.constraintProfileHash,
    missing_constraint_codes: readiness.missing_constraint_codes,
    n2_handoff_hash: hashes.n2HandoffHash,
    recommendation: readiness.recommendation,
    readiness_ref: buildReadinessRef(readiness),
    snapshot_hash: hashes.snapshotHash,
    stale_ref_codes: readiness.stale_ref_codes,
    uncovered_recheck_refs: readiness.uncovered_recheck_request_refs.map((ref) => ref.ref_id),
    warning_codes: readiness.warnings.map((warning) => warning.code),
  });
}
