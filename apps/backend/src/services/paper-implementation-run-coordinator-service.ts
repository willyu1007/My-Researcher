import crypto from 'node:crypto';
import {
  PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_POLICY_ID,
  PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_POLICY_VERSION,
  PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_GAIN_LEVELS,
  PAPER_IMPLEMENTATION_COORDINATOR_LANE_IDS,
  PAPER_IMPLEMENTATION_COORDINATOR_RUN_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_COORDINATOR_STEP_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_COORDINATOR_TERMINAL_RUN_STATUSES,
  type AdvancePaperImplementationCoordinatorRunRequest,
  type CreatePaperImplementationCoordinatorRunRequest,
  type PaperImplementationCandidateSelectionCandidateProjection,
  type PaperImplementationCandidateSelectionDecisionRecord,
  type PaperImplementationCandidateSelectionGainLevel,
  type PaperImplementationCandidateSelectionRationaleCode,
  type PaperImplementationCoordinatorLaneId,
  type PaperImplementationCoordinatorRun,
  type PaperImplementationCoordinatorRunWithSteps,
  type PaperImplementationCoordinatorReviewAcceptanceRequest,
  type PaperImplementationCoordinatorStep,
  type PaperImplementationCoordinatorStepOutcome,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-coordinator-contracts';
import {
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
  type PaperImplementationRuntimeAdmissionRecord,
  type PaperImplementationRuntimeArtifactEnvelope,
  type RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
  type RunPaperImplementationEvidenceBoardCurationRuntimeRequest,
  type RunPaperImplementationFeasibilityPlanningRuntimeRequest,
  type RunPaperImplementationMotiveDecompositionRuntimeRequest,
  type RunPaperImplementationMotiveEvolutionRuntimeRequest,
  type RunPaperImplementationRoutePlanningRuntimeRequest,
  type RunPaperImplementationValidationCyclePlanningRuntimeRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  DecisionWorkQueueItem,
  PaperImplementationDecisionQueueType,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-ai-workflow-harness-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import type { PaperImplementationRepository } from '../repositories/paper-implementation.repository.js';
import type {
  PaperImplementationDecisionQueueWriter,
} from '../repositories/paper-implementation-ai-workflow-harness.repository.js';
import type {
  PaperImplementationCoordinatorRepository,
} from '../repositories/paper-implementation-coordinator.repository.js';
import type {
  PaperImplementationRuntimeRepository,
} from '../repositories/paper-implementation-runtime.repository.js';
import type {
  PaperImplementationMotiveRepository,
} from '../repositories/paper-implementation-motive.repository.js';
import type {
  PaperImplementationHumanConfirmationRepository,
} from '../repositories/paper-implementation-human-confirmation.repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { requireActiveImplementationProject } from './paper-implementation-runtime-preflight.js';
import { normalizedPaperImplementationRefType } from './paper-implementation-runtime-utils.js';
import type { PaperImplementationRoutePlanningRuntimeService } from './paper-implementation-route-planning-runtime-service.js';
import type {
  PaperImplementationValidationCyclePlanningRuntimeService,
} from './paper-implementation-validation-cycle-planning-runtime-service.js';
import type {
  PaperImplementationFeasibilityPlanningRuntimeService,
} from './paper-implementation-feasibility-planning-runtime-service.js';
import type {
  PaperImplementationMotiveDecompositionRuntimeService,
} from './paper-implementation-motive-decomposition-runtime-service.js';
import type {
  PaperImplementationMotiveEvolutionRuntimeService,
} from './paper-implementation-motive-evolution-runtime-service.js';
import type {
  PaperImplementationEvidenceBoardCurationRuntimeService,
} from './paper-implementation-evidence-board-curation-runtime-service.js';
import type {
  PaperImplementationCrossBoardSynthesisRuntimeService,
} from './paper-implementation-cross-board-synthesis-runtime-service.js';

/**
 * Code-level lane registry (D1: no user-configurable pipelines, no branch
 * DSL). Lane A couples steps through admitted final artifact lineage (the
 * W2-hardened consumption path); lane B couples steps through the same
 * frozen source refs/hashes bundle with no artifact chain; the two board
 * slots run as single-step pipelines under the same state machine.
 */
export const PAPER_IMPLEMENTATION_COORDINATOR_LANE_REGISTRY: Record<
  PaperImplementationCoordinatorLaneId,
  readonly string[]
> = {
  'validation-planning': [
    PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
    PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
    PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
    PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
  ],
  motive: [
    PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID,
    PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
  ],
  'evidence-board-curation': [PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID],
  'cross-board-synthesis': [PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID],
};

/**
 * Request fields owned by the coordinator; payloads must not carry them.
 * `provider_call_budget` is owned pre-emptively: the debate-tier budget gate
 * turns an insufficient budget into a `TIER_BUDGET_INSUFFICIENT` park, so a
 * payload-set budget would be a DoS-park lever. The trace slot is not yet
 * mounted on a coordinator lane (forward-looking guard, no current lane effect).
 */
const COORDINATOR_OWNED_REQUEST_FIELDS = [
  'run_id',
  'resume_from_run_id',
  'run_mode',
  'execution_mode',
  'provider_call_budget',
] as const;

/** Chain-consumption fields the coordinator injects per lane-A slot. */
const COORDINATOR_INJECTED_CHAIN_FIELDS: Record<string, readonly string[]> = {
  [PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID]: [
    'admitted_route_proposal_artifact_ref',
    'admitted_route_proposal_artifact_hash',
    'reviewed_candidate_keys',
  ],
  [PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID]: [
    'admitted_route_proposal_artifact_ref',
    'admitted_route_proposal_artifact_hash',
    'admitted_route_skeptic_artifact_ref',
    'admitted_route_skeptic_artifact_hash',
    'reviewed_candidate_keys',
  ],
  [PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID]: [
    'admitted_validation_cycle_artifact_ref',
    'admitted_validation_cycle_artifact_hash',
    'admitted_route_proposal_artifact_ref',
    'admitted_route_proposal_artifact_hash',
    'admitted_route_skeptic_artifact_ref',
    'admitted_route_skeptic_artifact_hash',
    'reviewed_cycle_candidate_keys',
    'reviewed_route_candidate_keys',
  ],
};

/**
 * S2-B B3: lane-A in-chain proposal-body pass-through. The consuming slots
 * (skeptic/cycle/feasibility) previously received only the admitted upstream
 * ref+hash pair — under provider_llm the skeptic honestly rejected with
 * `BLOCK_PRIMARY_ROUTE_ARTIFACT_BODY_UNAVAILABLE`-class blockers because the
 * proposal body was not inspectable (gs001-lora-live-001/003). The
 * coordinator now transcribes the content-bearing fields of each admitted
 * upstream final artifact payload into the slot's existing
 * `source_context_packets` request field (deterministic deep copy — no
 * semantic content is created). Identity/hash/W2 consumption discipline is
 * untouched: the packets ride the request and are covered by each slot's
 * source_hash_bundle_hash exactly like caller-supplied packets.
 */
const LANE_A_UPSTREAM_CONTENT_FIELDS: Record<string, readonly string[]> = {
  [PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID]: ['route_candidate_proposals', 'role_summary'],
  [PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID]: [
    'risk_findings',
    'checked_dimensions',
    'recommended_disposition',
    'role_summary',
  ],
  [PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID]: ['cycle_candidate_proposals', 'role_summary'],
};
const LANE_A_UPSTREAM_PACKET_EVIDENCE_KIND = 'admitted_upstream_runtime_artifact';

const FIXTURE_OUTPUT_FIELDS = ['mocked_role_outputs', 'codex_role_outputs'] as const;
/**
 * F2: only `completed` and `failed` are terminal. `budget_exhausted` is a
 * parked state that a raise-carrying advance can resume (D1: raise the
 * envelope, then re-advance). R10: the literal set lives in the coordinator
 * contract — this is a Set view of that single source.
 */
const TERMINAL_RUN_STATUSES = new Set<string>(PAPER_IMPLEMENTATION_COORDINATOR_TERMINAL_RUN_STATUSES);
const DEFAULT_LEASE_TTL_MS = 600_000;
/**
 * R4/D2: D2 has landed, so the trace-integrity slot now emits this code from a
 * REAL path — its deterministic zero-provider-call budget gate produces a
 * blocked final when `provider_call_budget` cannot reserve the decided tier's
 * upgrade-safe completion count. It reaches the coordinator through the same
 * zero-provider-call blocked-final channel (LLM-free), so its blocker codes are
 * merged into the trusted set (see the R4 trust rule in `advanceLoop`) and
 * classified to `loop_budget_review`.
 */
const TIER_BUDGET_BLOCKER_CODE = 'TIER_BUDGET_INSUFFICIENT';
const NO_ELIGIBLE_CANDIDATE_BLOCKER_CODE = 'COORDINATOR_NO_ELIGIBLE_CANDIDATE';
const SLOT_INVOCATION_FAILED_BLOCKER_CODE = 'SLOT_INVOCATION_FAILED';
/**
 * S4-D: a slot invocation that escapes with an `INTERNAL_ERROR` AppError
 * (e.g. a runtime retry loop that exhausts "unexpectedly", or a materialized
 * final artifact missing its hash) is an internal slot fault — morally
 * identical to a non-AppError throw (`SLOT_INVOCATION_FAILED`), which already
 * routes to `failed_workflow`. It is a coordinator-TRUSTED code reachable
 * ONLY through the coordinator's own invocation-boundary catch:
 *   - it is deliberately absent from the slot whitelist, so a
 *     provider-call-carrying slot result can never steer `failed_workflow`
 *     (F5); AND
 *   - (S4-D leak fix) it is in the R4 zero-call promotion exclusion set
 *     (`R4_ZERO_CALL_PROMOTION_EXCLUDED_BLOCKER_CODES`), so a
 *     zero-provider-call blocked result can't smuggle it into the trusted set
 *     through the PAYLOAD-AUTHOR-CONTROLLABLE `preflight_blocker_codes` echo
 *     channel either.
 * So the terminal `failed_workflow` bucket is reachable for this code on
 * exactly one path — the boundary catch — never from any slot output.
 */
const SLOT_INTERNAL_ERROR_BLOCKER_CODE = 'INTERNAL_ERROR';

/**
 * W4 v1 default retry budget for coordinator-materialized queue items: two
 * automatic reflows per (run, slot, primary blocker) before the resolve
 * route demands an explicit human raise (`retry_budget_override`). Fixed
 * constant, not a policy object.
 */
const COORDINATOR_DECISION_QUEUE_RETRY_BUDGET = 2;

/**
 * R10: shared base table for the runtime failure + gate AppError codes that
 * are classifiable regardless of source. Both classification tables derive
 * from it — never re-list these ten entries.
 */
const SHARED_RUNTIME_AND_GATE_QUEUE_TYPE_BY_BLOCKER_CODE: Readonly<
  Record<string, PaperImplementationDecisionQueueType>
> = {
  AGENT_EXECUTION_FAILED: 'failed_run_review',
  SCHEMA_VALIDATION_FAILED: 'failed_run_review',
  TimeoutError: 'failed_run_review',
  TransientError: 'failed_run_review',
  RateLimitError: 'failed_run_review',
  UpstreamError: 'failed_run_review',
  GATE_CONSTRAINT_FAILED: 'gate_blocker',
  INVALID_PAYLOAD: 'gate_blocker',
  NOT_FOUND: 'gate_blocker',
  VERSION_CONFLICT: 'gate_blocker',
};

/**
 * W4 queue classification (enum mapping tables — deliberately not string
 * `includes` heuristics). Exact blocker codes the coordinator can encounter:
 * its own codes, AppError codes surfaced by slot invocation failures, and
 * the shared runtime failure codes emitted by slot services.
 */
export const PAPER_IMPLEMENTATION_COORDINATOR_QUEUE_TYPE_BY_BLOCKER_CODE: Readonly<
  Record<string, PaperImplementationDecisionQueueType>
> = {
  [TIER_BUDGET_BLOCKER_CODE]: 'loop_budget_review',
  [NO_ELIGIBLE_CANDIDATE_BLOCKER_CODE]: 'human_review',
  [SLOT_INVOCATION_FAILED_BLOCKER_CODE]: 'failed_workflow',
  [SLOT_INTERNAL_ERROR_BLOCKER_CODE]: 'failed_workflow',
  ...SHARED_RUNTIME_AND_GATE_QUEUE_TYPE_BY_BLOCKER_CODE,
};

/**
 * S4-D leak fix — R4 zero-call promotion exclusion set. The R4 trust rule
 * promotes a zero-provider-call blocked result's blocker codes into the
 * coordinator-TRUSTED set, but those codes ride the
 * PAYLOAD-AUTHOR-CONTROLLABLE `preflight_blocker_codes` echo channel
 * (`request.preflight_blocker_codes` is echoed verbatim into the blocker
 * codes of a deterministic preflight-blocked final). The infra-semantic
 * codes that classify to the TERMINAL `failed_workflow` bucket must be
 * reachable as trusted only through the coordinator's own invocation-boundary
 * observation — never a payload echo — otherwise a hostile/buggy payload
 * could forge a `failed_workflow` classification the S4-D contract calls
 * boundary-only. Those codes are therefore excluded from zero-call promotion
 * and stay in the untrusted slot lane (whose whitelist cannot classify them
 * to `failed_workflow`; they land the generic `human_review` fallback). The
 * set is DERIVED from the exact table (every code routing to `failed_workflow`)
 * so any future terminal-bucket code is protected automatically.
 */
const R4_ZERO_CALL_PROMOTION_EXCLUDED_BLOCKER_CODES: ReadonlySet<string> = new Set(
  Object.entries(PAPER_IMPLEMENTATION_COORDINATOR_QUEUE_TYPE_BY_BLOCKER_CODE)
    .filter(([, queueType]) => queueType === 'failed_workflow')
    .map(([code]) => code),
);

/** Prefix classes for whole blocker-code families the coordinator owns. */
export const PAPER_IMPLEMENTATION_COORDINATOR_QUEUE_TYPE_BY_BLOCKER_PREFIX: ReadonlyArray<
  readonly [string, PaperImplementationDecisionQueueType]
> = [
  ['TIER_BUDGET_', 'loop_budget_review'],
  ['COORDINATOR_', 'human_review'],
  ['TRACE_', 'trace_repair'],
];

/**
 * F5: exact whitelist for slot-result blocker codes (which may carry
 * LLM-influenced strings). R10: derived from the shared base table — only
 * the shared runtime failure codes and the gate AppError codes are
 * classifiable from slot output; the coordinator-owned codes
 * (`TIER_BUDGET_INSUFFICIENT`, `COORDINATOR_*`, `SLOT_INVOCATION_FAILED`)
 * and the prefix families are deliberately absent so slot output can never
 * steer terminal-state or trace-repair routing.
 */
export const PAPER_IMPLEMENTATION_COORDINATOR_QUEUE_TYPE_BY_SLOT_BLOCKER_CODE: Readonly<
  Record<string, PaperImplementationDecisionQueueType>
> = {
  ...SHARED_RUNTIME_AND_GATE_QUEUE_TYPE_BY_BLOCKER_CODE,
};

/**
 * Deterministic queue classification for a run-blocking coordinator step.
 *
 * F5 blocker-source split: `trustedBlockerCodes` are coordinator-observed
 * codes (its own codes, AppError codes it caught from slot invocation, and
 * — per the R4 trust rule — blocker codes of zero-provider-call blocked
 * results EXCEPT the infra-semantic terminal codes excluded from zero-call
 * promotion, `R4_ZERO_CALL_PROMOTION_EXCLUDED_BLOCKER_CODES`) and classify
 * through the full exact + prefix tables;
 * `slotBlockerCodes` come from the slot result payload (potentially
 * LLM-influenced) and only classify through the exact slot whitelist —
 * never the coordinator-owned prefix families.
 *
 * S4-D unclassified retirement: with no table hit the step outcome enum
 * (never a string heuristic) drives a DETERMINISTIC fallback that reaches
 * `unclassified` on exactly one path — an unregistered *trusted* code on a
 * `blocked` step (a genuinely unknown coordinator/preflight code that missed
 * table registration). Every other blocked-lane combination is bucketed:
 *   - `failed_runtime`, any codes → `failed_run_review` (a runtime failure);
 *   - `blocked` with no trusted code (a semantic block surfaced purely from
 *     slot/LLM output, or a bare blocked) → `human_review`, the generic
 *     blocked-lane review bucket — never `unclassified`.
 * So slot-sourced (untrusted) codes and every registered trusted code always
 * land a real queue type; `unclassified` is reserved for the last-resort
 * unknown-trusted-code path, pinned by the exhaustive tests.
 *
 * R3 dedup poisoning fence: `dedup_blocker` (the dedup_key primary segment)
 * only ever carries a trusted code; when no trusted code classified, it is
 * the fixed sentinel `outcome:<step outcome enum>` — NEVER a slot-sourced
 * free string, so slot output can neither fragment nor collide the
 * (run, slot, primary blocker) dedup space. `primary_blocker` stays
 * informational (display) and may keep the slot-sourced value.
 */
export function classifyPaperImplementationCoordinatorBlockedStep(
  outcome: PaperImplementationCoordinatorStepOutcome,
  trustedBlockerCodes: string[],
  slotBlockerCodes: string[],
): {
  queue_type: PaperImplementationDecisionQueueType;
  primary_blocker: string;
  dedup_blocker: string;
} {
  const outcomeSentinel = `outcome:${outcome}`;
  for (const code of trustedBlockerCodes) {
    const exact = PAPER_IMPLEMENTATION_COORDINATOR_QUEUE_TYPE_BY_BLOCKER_CODE[code];
    if (exact) {
      return { queue_type: exact, primary_blocker: code, dedup_blocker: code };
    }
    const prefixHit = PAPER_IMPLEMENTATION_COORDINATOR_QUEUE_TYPE_BY_BLOCKER_PREFIX
      .find(([prefix]) => code.startsWith(prefix));
    if (prefixHit) {
      return { queue_type: prefixHit[1], primary_blocker: code, dedup_blocker: code };
    }
  }
  for (const code of slotBlockerCodes) {
    const exact = PAPER_IMPLEMENTATION_COORDINATOR_QUEUE_TYPE_BY_SLOT_BLOCKER_CODE[code];
    if (exact) {
      return { queue_type: exact, primary_blocker: code, dedup_blocker: outcomeSentinel };
    }
  }
  const fallbackPrimary = trustedBlockerCodes[0] ?? slotBlockerCodes[0];
  if (outcome === 'failed_runtime') {
    return {
      queue_type: 'failed_run_review',
      primary_blocker: fallbackPrimary ?? 'failed_runtime',
      dedup_blocker: trustedBlockerCodes[0] ?? outcomeSentinel,
    };
  }
  // outcome === 'blocked' with no exact/prefix/whitelist hit.
  if (trustedBlockerCodes.length === 0) {
    // A semantic block surfaced purely from slot (LLM-influenced) output, or a
    // bare blocked with no codes at all: there is no coordinator-trusted code
    // to be "unknown" about, so route deterministically to `human_review` —
    // the generic blocked-lane review bucket — never `unclassified`. R3: the
    // dedup segment stays the outcome sentinel; a slot string never enters it.
    return {
      queue_type: 'human_review',
      primary_blocker: fallbackPrimary ?? 'blocked',
      dedup_blocker: outcomeSentinel,
    };
  }
  // A coordinator-trusted code that no exact/prefix table classifies — a
  // genuinely unknown code (e.g. a future coordinator/preflight code that
  // missed table registration). This is the SOLE reachable path to
  // `unclassified`; the exhaustive tests forge exactly this to pin it.
  return {
    queue_type: 'unclassified',
    primary_blocker: fallbackPrimary ?? 'unclassified',
    dedup_blocker: trustedBlockerCodes[0] ?? outcomeSentinel,
  };
}

const GAIN_RANKS: Record<PaperImplementationCandidateSelectionGainLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

/**
 * CandidateSelectionPolicy@v1 — pure function over the stable candidate
 * projection: among candidates without blockers, pick the highest
 * expected_information_gain; ties resolve to the first candidate in stable
 * input order. Same input always yields the same decision record.
 */
export function selectPaperImplementationCandidateV1(
  candidates: PaperImplementationCandidateSelectionCandidateProjection[],
): PaperImplementationCandidateSelectionDecisionRecord {
  const projections = candidates.map((candidate) => ({
    candidate_key: candidate.candidate_key,
    expected_information_gain: candidate.expected_information_gain,
    blocker_codes: [...candidate.blocker_codes],
  }));
  const inputsHash = sha256Text(stableStringify(projections));
  const rationaleCodes: PaperImplementationCandidateSelectionRationaleCode[] = [];
  const eligible = projections.filter((candidate) => candidate.blocker_codes.length === 0);
  if (eligible.length < projections.length) {
    rationaleCodes.push('blocked_candidates_excluded');
  }
  if (eligible.length === 0) {
    return {
      policy_id: PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_POLICY_ID,
      policy_version: PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_POLICY_VERSION,
      inputs_hash: inputsHash,
      candidate_projections: projections,
      selected_candidate_key: null,
      rationale_codes: [...rationaleCodes, 'no_eligible_candidate'],
    };
  }
  const rank = (gain: PaperImplementationCandidateSelectionGainLevel | null): number =>
    gain === null ? 0 : GAIN_RANKS[gain];
  const maxRank = Math.max(...eligible.map((candidate) => rank(candidate.expected_information_gain)));
  const top = eligible.filter((candidate) => rank(candidate.expected_information_gain) === maxRank);
  if (eligible.length === 1) {
    rationaleCodes.push('single_eligible_candidate');
  } else {
    rationaleCodes.push('max_expected_information_gain');
    if (top.length > 1) {
      rationaleCodes.push('stable_order_tiebreak');
    }
  }
  return {
    policy_id: PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_POLICY_ID,
    policy_version: PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_POLICY_VERSION,
    inputs_hash: inputsHash,
    candidate_projections: projections,
    selected_candidate_key: top[0]?.candidate_key ?? null,
    rationale_codes: rationaleCodes,
  };
}

export type PaperImplementationCoordinatorRoutePlanningRuntime = Pick<
  PaperImplementationRoutePlanningRuntimeService,
  'runRouteArchitecture' | 'runRouteSkepticReview'
>;
export type PaperImplementationCoordinatorValidationCyclePlanningRuntime = Pick<
  PaperImplementationValidationCyclePlanningRuntimeService,
  'runCycleCandidates'
>;
export type PaperImplementationCoordinatorFeasibilityPlanningRuntime = Pick<
  PaperImplementationFeasibilityPlanningRuntimeService,
  'runProbePlanCandidates'
>;
export type PaperImplementationCoordinatorMotiveDecompositionRuntime = Pick<
  PaperImplementationMotiveDecompositionRuntimeService,
  'runDraftAssertionCandidates'
>;
export type PaperImplementationCoordinatorMotiveEvolutionRuntime = Pick<
  PaperImplementationMotiveEvolutionRuntimeService,
  'runEvolutionDecisionSupport'
>;
export type PaperImplementationCoordinatorEvidenceBoardCurationRuntime = Pick<
  PaperImplementationEvidenceBoardCurationRuntimeService,
  'runBindingGapCandidates'
>;
export type PaperImplementationCoordinatorCrossBoardSynthesisRuntime = Pick<
  PaperImplementationCrossBoardSynthesisRuntimeService,
  'runMergeSplitReuseScenarios'
>;

/**
 * Read-only lookback surface for the lane-A in-chain proposal-body
 * pass-through (S2-B B3): the coordinator only ever reads admitted final
 * artifacts it persisted lineage for — never writes runtime artifacts.
 */
export type PaperImplementationCoordinatorRuntimeArtifactReader = Pick<
  PaperImplementationRuntimeRepository,
  'findRuntimeArtifactById'
>;

/**
 * Structural zero-authority-write dependency surface: the coordinator only
 * receives runtime slot services, its own repository, the project repository
 * (active-project preflight reuse), the narrow decision-queue writer (W4:
 * the queue is a governance surface, not domain authority — the writer's
 * type surface is enqueue-only), the read-only runtime artifact lookback
 * (B3: in-chain proposal-body transcription), and id/clock injection — no
 * domain authority repositories.
 */
export interface PaperImplementationRunCoordinatorServiceOptions {
  coordinatorRepository: PaperImplementationCoordinatorRepository;
  projectRepository: PaperImplementationRepository;
  decisionQueueWriter: PaperImplementationDecisionQueueWriter;
  runtimeArtifactReader: PaperImplementationCoordinatorRuntimeArtifactReader;
  routePlanningRuntime: PaperImplementationCoordinatorRoutePlanningRuntime;
  validationCyclePlanningRuntime: PaperImplementationCoordinatorValidationCyclePlanningRuntime;
  feasibilityPlanningRuntime: PaperImplementationCoordinatorFeasibilityPlanningRuntime;
  motiveDecompositionRuntime: PaperImplementationCoordinatorMotiveDecompositionRuntime;
  motiveEvolutionRuntime: PaperImplementationCoordinatorMotiveEvolutionRuntime;
  evidenceBoardCurationRuntime: PaperImplementationCoordinatorEvidenceBoardCurationRuntime;
  crossBoardSynthesisRuntime: PaperImplementationCoordinatorCrossBoardSynthesisRuntime;
  /**
   * T-133 confirm-and-continue read-only validators: the coordinator never
   * writes decisions or confirmations — it only rechecks the referenced
   * MotiveEvolutionDecision (status / target coverage) and its consumed human
   * confirmation before synthesizing the accepted step. Both are narrow
   * read-only Picks, preserving the zero-authority-write dependency surface.
   */
  motiveDecisionReader: Pick<PaperImplementationMotiveRepository, 'findMotiveEvolutionDecisionById'>;
  confirmationReader: Pick<PaperImplementationHumanConfirmationRepository, 'findHumanConfirmationRecordById'>;
  idFactory?: (prefix: string) => string;
  now?: () => string;
  leaseTtlMs?: number;
}

interface CoordinatorSlotRunResult {
  status: 'passed' | 'blocked' | 'failed_runtime';
  provider_call_count: number;
  blocker_codes: string[];
  final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
  final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
}

interface LaneChainAdmittedArtifact {
  ref: TopicSelectionFunctionalRef;
  hash: string;
  /** F4/R9 lineage id of the admitted final artifact (B3 lookback key). */
  artifactId: string | null;
}

interface LaneChainContext {
  admittedRefByIndex: Map<number, LaneChainAdmittedArtifact>;
  selectedKeyByIndex: Map<number, string>;
}

/**
 * Wrapper distinguishing coordinator persistence failures (crash-equivalent:
 * the run must stay `advancing` with its lease intact so lease expiry +
 * re-advance recovers from the breakpoint) from coordinator logic faults
 * (which mark the run `failed`).
 */
class CoordinatorPersistenceFailure extends Error {
  constructor(public readonly original: unknown) {
    super('Coordinator persistence failure.');
    this.name = 'CoordinatorPersistenceFailure';
  }
}

/**
 * T-133 P3 review fix (adversarial C1): wrapper distinguishing CLIENT-RECOVERABLE
 * advance rejections (verb lock, review-acceptance validation 409/400) from
 * coordinator logic faults. Before this wrapper existed, these expected
 * rejections fell into the generic catch and `tryMarkFailed` TERMINALIZED the
 * run — a single wrong advance (or a typo'd decision_ref) permanently
 * destroyed a parked human-decision stop. A rejection restores the pre-advance
 * run status (releasing the lease) and rethrows the original error; the run
 * stays advanceable.
 */
class CoordinatorAdvanceRejection extends Error {
  constructor(public readonly original: AppError) {
    super('Coordinator advance rejected.');
    this.name = 'CoordinatorAdvanceRejection';
  }
}

/**
 * S4 list projection: the read-only project-level coordinator-run list omits
 * the heavy `slot_request_payloads` map (a per-slot full request-body blob the
 * list view never needs — the single-run GET still returns it in full).
 * Everything else on the run row is lightweight and stays.
 */
export type PaperImplementationCoordinatorRunListItem =
  Omit<PaperImplementationCoordinatorRun, 'slot_request_payloads'>;

export class PaperImplementationRunCoordinatorService {
  private readonly coordinatorRepository: PaperImplementationCoordinatorRepository;
  private readonly projectRepository: PaperImplementationRepository;
  private readonly decisionQueueWriter: PaperImplementationDecisionQueueWriter;
  private readonly runtimeArtifactReader: PaperImplementationCoordinatorRuntimeArtifactReader;
  private readonly routePlanningRuntime: PaperImplementationCoordinatorRoutePlanningRuntime;
  private readonly validationCyclePlanningRuntime: PaperImplementationCoordinatorValidationCyclePlanningRuntime;
  private readonly feasibilityPlanningRuntime: PaperImplementationCoordinatorFeasibilityPlanningRuntime;
  private readonly motiveDecompositionRuntime: PaperImplementationCoordinatorMotiveDecompositionRuntime;
  private readonly motiveEvolutionRuntime: PaperImplementationCoordinatorMotiveEvolutionRuntime;
  private readonly evidenceBoardCurationRuntime: PaperImplementationCoordinatorEvidenceBoardCurationRuntime;
  private readonly crossBoardSynthesisRuntime: PaperImplementationCoordinatorCrossBoardSynthesisRuntime;
  private readonly motiveDecisionReader: Pick<PaperImplementationMotiveRepository, 'findMotiveEvolutionDecisionById'>;
  private readonly confirmationReader: Pick<PaperImplementationHumanConfirmationRepository, 'findHumanConfirmationRecordById'>;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: () => string;
  private readonly leaseTtlMs: number;

  constructor(options: PaperImplementationRunCoordinatorServiceOptions) {
    this.coordinatorRepository = options.coordinatorRepository;
    this.projectRepository = options.projectRepository;
    this.decisionQueueWriter = options.decisionQueueWriter;
    this.runtimeArtifactReader = options.runtimeArtifactReader;
    this.routePlanningRuntime = options.routePlanningRuntime;
    this.validationCyclePlanningRuntime = options.validationCyclePlanningRuntime;
    this.feasibilityPlanningRuntime = options.feasibilityPlanningRuntime;
    this.motiveDecompositionRuntime = options.motiveDecompositionRuntime;
    this.motiveEvolutionRuntime = options.motiveEvolutionRuntime;
    this.evidenceBoardCurationRuntime = options.evidenceBoardCurationRuntime;
    this.crossBoardSynthesisRuntime = options.crossBoardSynthesisRuntime;
    this.motiveDecisionReader = options.motiveDecisionReader;
    this.confirmationReader = options.confirmationReader;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
    this.leaseTtlMs = options.leaseTtlMs ?? DEFAULT_LEASE_TTL_MS;
  }

  async createCoordinatorRun(
    implementationProjectId: string,
    request: CreatePaperImplementationCoordinatorRunRequest,
  ): Promise<PaperImplementationCoordinatorRun> {
    await requireActiveImplementationProject(this.projectRepository, implementationProjectId);
    if (!PAPER_IMPLEMENTATION_COORDINATOR_LANE_IDS.includes(request.lane_id)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `Unknown coordinator lane ${String(request.lane_id)}.`);
    }
    if (
      !request.budget_envelope
      || !Number.isInteger(request.budget_envelope.max_steps)
      || request.budget_envelope.max_steps < 1
      || !Number.isInteger(request.budget_envelope.max_provider_calls)
      || request.budget_envelope.max_provider_calls < 1
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'budget_envelope with positive max_steps and max_provider_calls is required.');
    }
    if (request.run_mode === 'product' && request.execution_mode !== 'provider_llm') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'product run_mode requires execution_mode=provider_llm.');
    }
    const laneSlots = PAPER_IMPLEMENTATION_COORDINATOR_LANE_REGISTRY[request.lane_id];
    this.assertSlotRequestPayloads(request.lane_id, laneSlots, request.slot_request_payloads, request.run_mode);
    if (request.lane_id === 'motive') {
      this.assertMotiveLaneFrozenSourceBundle(request.slot_request_payloads);
    }
    const createdAt = this.now();
    const run: PaperImplementationCoordinatorRun = {
      schema_version: PAPER_IMPLEMENTATION_COORDINATOR_RUN_SCHEMA_VERSION,
      coordinator_run_id: request.coordinator_run_id?.trim() || this.idFactory('pi_coordinator_run'),
      implementation_project_id: implementationProjectId,
      lane_id: request.lane_id,
      run_status: 'created',
      run_mode: request.run_mode,
      execution_mode: request.execution_mode,
      model_profile_id: request.model_profile_id?.trim() || null,
      model_option_id: request.model_option_id?.trim() || null,
      budget_envelope: {
        max_steps: request.budget_envelope.max_steps,
        max_provider_calls: request.budget_envelope.max_provider_calls,
      },
      consumed: { steps: 0, provider_calls: 0 },
      lease: null,
      slot_request_payloads: structuredClone(request.slot_request_payloads),
      created_at: createdAt,
      updated_at: createdAt,
    };
    return this.coordinatorRepository.createCoordinatorRun(run);
  }

  async getCoordinatorRun(
    implementationProjectId: string,
    coordinatorRunId: string,
  ): Promise<PaperImplementationCoordinatorRunWithSteps> {
    const run = await this.coordinatorRepository.findCoordinatorRunById(
      implementationProjectId,
      coordinatorRunId,
    );
    if (!run) {
      throw new AppError(404, 'NOT_FOUND', `CoordinatorRun ${coordinatorRunId} not found.`);
    }
    const steps = await this.coordinatorRepository.listCoordinatorSteps(
      implementationProjectId,
      coordinatorRunId,
    );
    return { run, steps };
  }

  /**
   * Read-only project-level coordinator-run list. Routes through the service
   * (never a controller-held repository) so the coordinator's zero-authority
   * structural fence covers this read path too. Returns the slimmed list
   * projection — `slot_request_payloads` stripped (see
   * {@link PaperImplementationCoordinatorRunListItem}); the single-run GET
   * still carries the full payload map. No active-project guard: an
   * empty/unknown project yields an empty list, matching the pure-read
   * semantics of the single-run GET (a 200 empty projection, never a 404).
   */
  async listCoordinatorRunsByProject(
    implementationProjectId: string,
  ): Promise<PaperImplementationCoordinatorRunListItem[]> {
    const runs = await this.coordinatorRepository.listCoordinatorRunsByProject(
      implementationProjectId,
    );
    return runs.map(({ slot_request_payloads: _slotRequestPayloads, ...rest }) => rest);
  }

  async advance(
    implementationProjectId: string,
    coordinatorRunId: string,
    request: AdvancePaperImplementationCoordinatorRunRequest = {},
  ): Promise<PaperImplementationCoordinatorRunWithSteps> {
    await requireActiveImplementationProject(this.projectRepository, implementationProjectId);
    const existing = await this.coordinatorRepository.findCoordinatorRunById(
      implementationProjectId,
      coordinatorRunId,
    );
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', `CoordinatorRun ${coordinatorRunId} not found.`);
    }
    if (TERMINAL_RUN_STATUSES.has(existing.run_status)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `CoordinatorRun ${coordinatorRunId} is terminal (${existing.run_status}) and cannot be advanced.`,
      );
    }
    const raise = request.raise_budget_envelope ?? null;
    if (raise) {
      this.assertBudgetEnvelopeRaise(existing, raise);
    }
    const overrides = request.slot_request_payload_overrides ?? null;
    const reviewAcceptance = request.review_acceptance ?? null;
    // T-133 D-133-3: the confirm and revise verbs never mix — a single advance
    // either accepts the parked human decision or rebuilds a slot payload.
    if (reviewAcceptance && overrides) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'review_acceptance cannot be combined with slot_request_payload_overrides — the confirm-and-continue and revise-and-retry verbs never mix.',
      );
    }
    if (existing.run_status === 'budget_exhausted' && !raise) {
      // R1: overrides on a raise-less advance of a budget-exhausted run must
      // never be silently dropped by the idempotent no-op — reject loudly.
      if (overrides) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `CoordinatorRun ${coordinatorRunId} is budget_exhausted: slot_request_payload_overrides `
          + 'require raise_budget_envelope, otherwise the advance is a no-op and would silently drop them.',
        );
      }
      // T-133 P3 review fix (state-machine C4, same R1 discipline): a
      // review_acceptance on a raise-less advance of a budget-exhausted run
      // must never be silently swallowed either — the operator would believe
      // the human decision was accepted while nothing happened. The correct
      // exit is raise + review_acceptance in ONE request.
      if (reviewAcceptance) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `CoordinatorRun ${coordinatorRunId} is budget_exhausted: review_acceptance `
          + 'requires raise_budget_envelope in the same request, otherwise the advance is a no-op and would silently drop it.',
        );
      }
      // F2: without a raise, re-advancing a budget-exhausted run is an
      // idempotent no-op returning the current projection — never a 409 and
      // never an execution.
      return this.getCoordinatorRun(implementationProjectId, coordinatorRunId);
    }
    const laneSlots = PAPER_IMPLEMENTATION_COORDINATOR_LANE_REGISTRY[existing.lane_id];
    if (overrides) {
      const unknownSlots = Object.keys(overrides).filter((slotId) => !laneSlots.includes(slotId));
      if (unknownSlots.length > 0) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `slot_request_payload_overrides contains slots outside lane ${existing.lane_id}: ${unknownSlots.join(', ')}.`,
        );
      }
      for (const [slotId, payload] of Object.entries(overrides)) {
        this.assertSlotPayload(slotId, payload, existing.run_mode);
      }
    }

    const acquiredAt = this.now();
    const holderId = request.holder_id?.trim() || this.idFactory('pi_coordinator_advance_holder');
    const acquired = await this.coordinatorRepository.acquireCoordinatorRunLease(
      implementationProjectId,
      coordinatorRunId,
      {
        holder_id: holderId,
        heartbeat_at: acquiredAt,
        expires_at: new Date(new Date(acquiredAt).getTime() + this.leaseTtlMs).toISOString(),
      },
      acquiredAt,
    );
    if (!acquired) {
      // R7: a null CAS is ambiguous — it also fires when the run went
      // terminal between the entry pre-check and the CAS (the repository
      // refuses terminal runs at the CAS layer). Re-read and surface the
      // same terminal 409 as the entry gate instead of a misleading
      // CONCURRENT_ADVANCE.
      const afterCas = await this.coordinatorRepository.findCoordinatorRunById(
        implementationProjectId,
        coordinatorRunId,
      );
      if (afterCas && TERMINAL_RUN_STATUSES.has(afterCas.run_status)) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          `CoordinatorRun ${coordinatorRunId} is terminal (${afterCas.run_status}) and cannot be advanced.`,
        );
      }
      throw new AppError(
        409,
        'CONCURRENT_ADVANCE',
        `CoordinatorRun ${coordinatorRunId} is being advanced by another holder.`,
      );
    }

    let run = acquired;
    try {
      if (overrides || raise) {
        run = {
          ...run,
          ...(overrides
            ? {
              slot_request_payloads: {
                ...run.slot_request_payloads,
                ...structuredClone(overrides),
              },
            }
            : {}),
        };
        if (raise) {
          // R2: raises are applied monotonically against the POST-LOCK run —
          // max(current, raise) per dimension — so any interleaving of
          // concurrently validated raises can only grow the envelope, never
          // shrink it back to a stale snapshot. Every application is audited
          // in budget_raise_events (from === to records a superseded raise).
          const from = { ...run.budget_envelope };
          const to = {
            max_steps: Math.max(from.max_steps, raise.max_steps ?? from.max_steps),
            max_provider_calls: Math.max(
              from.max_provider_calls,
              raise.max_provider_calls ?? from.max_provider_calls,
            ),
          };
          run = {
            ...run,
            budget_envelope: to,
            budget_raise_events: [
              ...(run.budget_raise_events ?? []),
              { raised_at: this.now(), from, to, holder_id: holderId },
            ],
          };
        }
        run = await this.persistRun(run, holderId);
      }
      return await this.advanceLoop(
        implementationProjectId,
        run,
        laneSlots,
        holderId,
        reviewAcceptance,
        existing.run_status,
      );
    } catch (error) {
      if (error instanceof CoordinatorAdvanceRejection) {
        // T-133 P3 review fix (adversarial C1): a client-recoverable rejection
        // already restored the pre-advance run status and released the lease
        // inside the loop — surface the original 4xx untouched, and above all
        // never tryMarkFailed (which would terminalize a parked human-decision
        // stop on a mere wrong-verb or typo'd-ref advance).
        throw error.original;
      }
      if (error instanceof CoordinatorPersistenceFailure) {
        // Crash-equivalent path: the run stays `advancing` and recovery is an
        // explicit re-advance from the breakpoint. R5: best-effort release of
        // OUR OWN lease (holder-fenced null write) so the loser never traps
        // the run under its live lease until TTL expiry — if the failure was
        // a takeover fence, the fenced release no-ops and the successor's
        // lease is untouched. Failures are ignored (lease expiry remains the
        // fallback recovery path).
        await this.tryReleaseOwnLease(implementationProjectId, coordinatorRunId, holderId);
        throw error.original instanceof Error || error.original instanceof AppError
          ? error.original
          : error;
      }
      await this.tryMarkFailed(run, holderId);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'INTERNAL_ERROR', 'Coordinator advance failed.', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async advanceLoop(
    implementationProjectId: string,
    initialRun: PaperImplementationCoordinatorRun,
    laneSlots: readonly string[],
    leaseHolderId: string,
    reviewAcceptance: PaperImplementationCoordinatorReviewAcceptanceRequest | null = null,
    entryRunStatus: PaperImplementationCoordinatorRun['run_status'] = initialRun.run_status,
  ): Promise<PaperImplementationCoordinatorRunWithSteps> {
    let run = initialRun;
    const steps = await this.coordinatorRepository.listCoordinatorSteps(
      implementationProjectId,
      run.coordinator_run_id,
    );

    // T-133 P3 review fix (adversarial C1): expected client rejections restore
    // the pre-advance run status (waiting_review for a parked stop) and release
    // the lease instead of falling into the terminalizing generic catch.
    const rejectAdvance = async (error: AppError): Promise<never> => {
      await this.finish(run, steps, entryRunStatus, leaseHolderId);
      throw new CoordinatorAdvanceRejection(error);
    };

    // T-133 confirm-and-continue: an accepted human decision synthesizes a
    // passed step (zero provider calls, nothing re-runs) BEFORE the normal
    // loop, which then continues past the formerly parked index. Validation
    // failures are client-recoverable rejections — the park must survive them.
    if (reviewAcceptance) {
      let acceptedStep: PaperImplementationCoordinatorStep;
      try {
        acceptedStep = this.buildReviewAcceptanceStep(
          implementationProjectId,
          run,
          steps,
          reviewAcceptance,
          leaseHolderId,
          await this.validateReviewAcceptance(implementationProjectId, run, laneSlots, steps, reviewAcceptance),
        );
      } catch (error) {
        if (error instanceof AppError) {
          return rejectAdvance(error);
        }
        throw error;
      }
      // Holder-fenced heartbeat before the synthesized step lands (R5-equivalent
      // fence; the validation above is read-only), then persist and re-sync the
      // consumed projection exactly like an executed step.
      run = await this.persistRun(this.withBumpedLease(run, this.now()), leaseHolderId);
      const persistedStep = await this.persistStep(acceptedStep);
      steps.push(persistedStep);
      run = await this.persistRun({
        ...this.withBumpedLease(run, this.now()),
        consumed: this.consumedFromSteps(steps),
      }, leaseHolderId);
    }

    // F6/R10: the persisted steps are the SOLE source of truth for consumed
    // budget — every budget decision below reads the steps-derived value, and
    // the run-row counters are a pure projection cache written alongside.
    // A crash between step persistence and the cache write therefore cannot
    // leak spend; re-sync the cache before the first budget decision.
    const rebuiltConsumed = this.consumedFromSteps(steps);
    if (
      run.consumed.steps !== rebuiltConsumed.steps
      || run.consumed.provider_calls !== rebuiltConsumed.provider_calls
    ) {
      run = await this.persistRun({
        ...run,
        consumed: rebuiltConsumed,
        updated_at: this.now(),
      }, leaseHolderId);
    }

    for (;;) {
      const passedByIndex = this.passedStepsByIndex(steps);
      const nextIndex = laneSlots.findIndex((_, index) => !passedByIndex.has(index));
      if (nextIndex === -1) {
        return this.finish(run, steps, 'completed', leaseHolderId);
      }
      const slotId = laneSlots[nextIndex]!;
      // T-133 D-133-3 verb lock: an evolution human-decision waiting_review
      // stop has exactly ONE exit — confirm-and-continue. A plain (or
      // payload-override) re-advance would re-run decision support the human
      // has already decided on, so it fails closed (as a recoverable rejection
      // that keeps the park intact). Deliberately BEFORE the budget check so a
      // parked stop is never silently re-labelled budget_exhausted (P3 review
      // P1), and existence-based rather than "latest row" — the persisted step
      // ordering is lexicographic on node_attempt_id, so `attempt-10` sorts
      // before `attempt-2` and a latest-row read is unreliable (P3 review C2);
      // once an evolution index parked, no other verb can add rows to it, so
      // EXISTS is exact.
      if (
        slotId === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID
        && steps.some((step) => step.step_index === nextIndex && step.outcome === 'waiting_review')
      ) {
        return rejectAdvance(new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          `CoordinatorRun ${run.coordinator_run_id} is parked at the motive-evolution human-decision stop; `
          + 'advancing it requires review_acceptance referencing an approved MotiveEvolutionDecision '
          + '(confirm-and-continue), never a slot re-run.',
        ));
      }
      // R10: budget decisions read the steps-derived consumption, never the
      // cached run-row counters.
      const consumed = this.consumedFromSteps(steps);
      if (
        consumed.steps + 1 > run.budget_envelope.max_steps
        || consumed.provider_calls >= run.budget_envelope.max_provider_calls
      ) {
        return this.finish(run, steps, 'budget_exhausted', leaseHolderId);
      }

      const attemptSequence = steps.filter((step) => step.step_index === nextIndex).length;
      // S2-C C2: the attempt id doubles as the slot run_id and therefore pins
      // the runtime identity of every artifact the slot records. The persisted
      // step count alone undercounts executions when a fenced-out holder
      // already ran the slot (its artifacts persist, its step row does not),
      // so an execution-unique suffix keeps a successor's fresh attempt from
      // colliding with the orphaned artifacts on the runtimeIdentityHash
      // unique constraint.
      const nodeAttemptId = this.idFactory(
        `${run.coordinator_run_id}.step-${nextIndex}.attempt-${attemptSequence}`,
      );
      const chainContext = this.chainContext(passedByIndex);
      const slotRequest = await this.buildSlotRequest(run, laneSlots, slotId, nextIndex, nodeAttemptId, chainContext);

      // F3: heartbeat + lease-fence BEFORE the slot runs. If the lease has
      // been taken over, this guarded write fails (crash-equivalent) and the
      // stale holder never double-executes the slot.
      run = await this.persistRun(this.withBumpedLease(run, this.now()), leaseHolderId);

      let result: CoordinatorSlotRunResult | null = null;
      let invocationBlockerCodes: string[] = [];
      try {
        result = await this.runSlot(slotId, implementationProjectId, slotRequest);
      } catch (error) {
        // Slot semantic/preflight/provider failures are re-advanceable
        // blockers, never coordinator `failed`.
        invocationBlockerCodes = error instanceof AppError
          ? [error.errorCode]
          : ['SLOT_INVOCATION_FAILED'];
      }

      let outcome = this.stepOutcome(slotId, result);
      const decisionRecord = outcome === 'passed' && result
        ? this.selectionDecisionForSlot(slotId, result)
        : null;
      // F5: slot-result blocker codes (potentially LLM-influenced) and
      // coordinator-observed codes are tracked separately; the persisted
      // step keeps the full union, but classification and terminal-state
      // decisions only trust the coordinator-observed set.
      const slotBlockerCodes = result ? this.uniqueStrings([...result.blocker_codes]) : [];
      const trustedBlockerCodes = [...invocationBlockerCodes];
      // R4 trust rule: a blocked slot result with zero provider calls is a
      // deterministic preflight product — the LLM never ran, so its blocker
      // codes are coordinator-trustworthy (this is how the D2 tier budget
      // code reaches terminal-state routing through the preflight echo
      // channel). Any provider-call-carrying blocked result stays untrusted.
      //
      // S4-D leak fix: the zero-call channel echoes the
      // PAYLOAD-AUTHOR-CONTROLLABLE `request.preflight_blocker_codes` verbatim,
      // so the infra-semantic codes that classify to the terminal
      // `failed_workflow` bucket are excluded from promotion — they must earn
      // trusted status only from the coordinator's own invocation-boundary
      // catch above, never from a payload echo. Excluded codes stay in the
      // untrusted `slotBlockerCodes` lane (still recorded in the step's blocker
      // union; classified through the slot whitelist, which they miss → the
      // generic `human_review` fallback), so a payload cannot forge a
      // `failed_workflow` classification through this channel.
      if (result && result.status === 'blocked' && result.provider_call_count === 0) {
        trustedBlockerCodes.push(
          ...slotBlockerCodes.filter(
            (code) => !R4_ZERO_CALL_PROMOTION_EXCLUDED_BLOCKER_CODES.has(code),
          ),
        );
      }
      const noEligibleCandidate = decisionRecord !== null && decisionRecord.selected_candidate_key === null;
      if (noEligibleCandidate) {
        // F1: an empty selection is a run-blocking outcome, not a pass — the
        // decision record is kept (it documents the empty selection) and the
        // step lands `blocked` so the same slot re-runs after an override.
        outcome = 'blocked';
        trustedBlockerCodes.push(NO_ELIGIBLE_CANDIDATE_BLOCKER_CODE);
      }

      // R9: the acceptance-bridge lineage pair (id + hash) is gated as one —
      // both only materialize from an ADMITTED final admission record.
      const admittedFinal = result?.final_admission_record?.admission_status === 'admitted'
        ? result.final_admission_record
        : null;
      const step: PaperImplementationCoordinatorStep = {
        schema_version: PAPER_IMPLEMENTATION_COORDINATOR_STEP_SCHEMA_VERSION,
        coordinator_step_id: this.idFactory('pi_coordinator_step'),
        coordinator_run_id: run.coordinator_run_id,
        implementation_project_id: implementationProjectId,
        step_index: nextIndex,
        slot_id: slotId,
        node_attempt_id: nodeAttemptId,
        runtime_artifact_ref: result?.final_admission_record?.admitted_artifact_ref ?? null,
        runtime_artifact_hash: result?.final_admission_record?.admitted_artifact_hash ?? null,
        // F4/R9: the admitted final artifact id — together with
        // runtime_artifact_hash this is exactly the acceptance-bridge
        // lineage pair (source_proposal_artifact_ref.ref_id + hash), and it
        // shares the hash's admitted-only gate.
        runtime_artifact_id: admittedFinal?.runtime_artifact_id ?? null,
        admission_ref: result?.final_admission_record
          ? {
            ref_type: 'paper_implementation_runtime_admission_record',
            ref_id: result.final_admission_record.admission_record_id,
            title_card_id: null,
            version_id: null,
          }
          : null,
        decision_record: decisionRecord,
        outcome,
        provider_call_count: result?.provider_call_count ?? 0,
        blocker_codes: this.uniqueStrings([...slotBlockerCodes, ...trustedBlockerCodes]),
        // T-133 minimal audit: the advance holder that produced this attempt
        // (override / re-advance actors were previously lease-only and lost).
        advance_holder_id: leaseHolderId,
        created_at: this.now(),
      };
      // R5: a second holder-fenced heartbeat immediately before the step is
      // persisted closes the residual double-execution window — a stale
      // holder whose lease was taken over DURING the slot run is fenced out
      // here (crash-equivalent throw) and its slot result never lands as a
      // step row.
      run = await this.persistRun(this.withBumpedLease(run, this.now()), leaseHolderId);
      const persistedStep = await this.persistStep(step);
      steps.push(persistedStep);

      run = await this.persistRun({
        ...this.withBumpedLease(run, this.now()),
        // R10: projection cache only — rebuilt from the persisted steps.
        consumed: this.consumedFromSteps(steps),
      }, leaseHolderId);

      // W4 queue reflow: a run-blocking step (blocked / failed_runtime,
      // including a selection step whose empty selection parked it as
      // blocked) materializes a DecisionWorkQueueItem before the run is
      // parked. waiting_review is a semantic stop, not a blocker — it stays
      // out of the queue.
      if (outcome === 'blocked' || outcome === 'failed_runtime') {
        await this.enqueueRunBlockingStep(run, persistedStep, trustedBlockerCodes, slotBlockerCodes);
      }

      // F5: only coordinator-observed codes can park the run as
      // budget-exhausted — slot output never steers terminal state.
      if (trustedBlockerCodes.includes(TIER_BUDGET_BLOCKER_CODE)) {
        return this.finish(run, steps, 'budget_exhausted', leaseHolderId);
      }
      // R10: read the steps-derived value, not the cached run-row counters.
      if (this.consumedFromSteps(steps).provider_calls > run.budget_envelope.max_provider_calls) {
        return this.finish(run, steps, 'budget_exhausted', leaseHolderId);
      }
      if (outcome === 'waiting_review') {
        return this.finish(run, steps, 'waiting_review', leaseHolderId);
      }
      if (outcome !== 'passed') {
        return this.finish(run, steps, 'blocked', leaseHolderId);
      }
    }
  }

  /**
   * Materializes the queue item for a run-blocking step through the narrow
   * decision-queue writer. Dedup key is (coordinator run, slot, trusted
   * dedup blocker — R3: a trusted code or the outcome sentinel, never a
   * slot-sourced free string), so repeated advances of the same breakpoint
   * reuse the open item and reopens after a resolve accumulate retry_count
   * in the repository. Enqueue failures are crash-equivalent persistence
   * failures: the run stays advancing and re-advance retries the
   * (idempotent) enqueue.
   */
  private async enqueueRunBlockingStep(
    run: PaperImplementationCoordinatorRun,
    step: PaperImplementationCoordinatorStep,
    trustedBlockerCodes: string[],
    slotBlockerCodes: string[],
  ): Promise<void> {
    const classification = classifyPaperImplementationCoordinatorBlockedStep(
      step.outcome,
      trustedBlockerCodes,
      slotBlockerCodes,
    );
    const runRef: TopicSelectionFunctionalRef = {
      ref_type: 'paper_implementation_coordinator_run',
      ref_id: run.coordinator_run_id,
      title_card_id: null,
      version_id: null,
    };
    const stepRef: TopicSelectionFunctionalRef = {
      ref_type: 'paper_implementation_coordinator_step',
      ref_id: step.coordinator_step_id,
      title_card_id: null,
      version_id: null,
    };
    const now = this.now();
    const item: DecisionWorkQueueItem = {
      queue_item_id: this.idFactory('pi_decision_queue_item'),
      implementation_project_id: run.implementation_project_id,
      queue_type: classification.queue_type,
      stage: 'coordinator_step_execution',
      target_ref: stepRef,
      priority: 'high',
      status: 'open',
      blocking_transition_keys: [`coordinator.${run.lane_id}.${step.slot_id}`],
      // R3: the dedup primary segment is trusted-or-sentinel only
      // (classification.dedup_blocker) — a slot-sourced free string can
      // never fragment the (run, slot, blocker) dedup space.
      dedup_key: [
        'coordinator',
        run.coordinator_run_id,
        step.slot_id,
        classification.dedup_blocker,
      ].join(':'),
      allowed_handlers: ['human', 'system'],
      recommended_actions: ['inspect_coordinator_step', 'resolve_then_re_advance'],
      created_from_refs: [runRef, stepRef],
      policy_version_id: null,
      retry_count: 0,
      retry_budget: COORDINATOR_DECISION_QUEUE_RETRY_BUDGET,
      cooldown_until: null,
      source_coordinator_run_ref: runRef,
      source_step_index: step.step_index,
      resolved_at: null,
      created_at: now,
      updated_at: now,
    };
    try {
      await this.decisionQueueWriter.enqueueDecisionWorkQueueItem(item);
    } catch (error) {
      throw new CoordinatorPersistenceFailure(error);
    }
  }

  private async finish(
    run: PaperImplementationCoordinatorRun,
    steps: PaperImplementationCoordinatorStep[],
    runStatus: PaperImplementationCoordinatorRun['run_status'],
    leaseHolderId: string,
  ): Promise<PaperImplementationCoordinatorRunWithSteps> {
    // F3: the lease release is fenced on the finishing holder so a stale
    // holder can never release (or overwrite) a successor's lease.
    const updated = await this.persistRun({
      ...run,
      run_status: runStatus,
      lease: null,
      updated_at: this.now(),
    }, leaseHolderId);
    return { run: updated, steps };
  }

  /**
   * R10: single clock discipline for every lease heartbeat write — one `now`
   * per bump feeds heartbeat_at, expires_at, and updated_at together.
   */
  private withBumpedLease(
    run: PaperImplementationCoordinatorRun,
    nowIso: string,
  ): PaperImplementationCoordinatorRun {
    return {
      ...run,
      lease: run.lease
        ? {
          ...run.lease,
          heartbeat_at: nowIso,
          expires_at: new Date(new Date(nowIso).getTime() + this.leaseTtlMs).toISOString(),
        }
        : run.lease,
      updated_at: nowIso,
    };
  }

  /**
   * F6/R10: the persisted steps are the single source of truth for consumed
   * budget; the run-row counters are a projection cache of this value.
   */
  private consumedFromSteps(
    steps: PaperImplementationCoordinatorStep[],
  ): PaperImplementationCoordinatorRun['consumed'] {
    return {
      steps: steps.length,
      provider_calls: steps.reduce((sum, step) => sum + step.provider_call_count, 0),
    };
  }

  /**
   * R5: best-effort holder-fenced lease release on the crash-equivalent
   * persistence-failure path. Reads the freshest run state (so the write
   * never clobbers newer counters) and only writes when the lease is still
   * ours; a takeover means the fenced write no-ops or 409s — both ignored.
   */
  private async tryReleaseOwnLease(
    implementationProjectId: string,
    coordinatorRunId: string,
    holderId: string,
  ): Promise<void> {
    try {
      const fresh = await this.coordinatorRepository.findCoordinatorRunById(
        implementationProjectId,
        coordinatorRunId,
      );
      if (!fresh || fresh.lease?.holder_id !== holderId) {
        return;
      }
      await this.coordinatorRepository.updateCoordinatorRun(
        { ...fresh, lease: null, updated_at: this.now() },
        { expectedLeaseHolderId: holderId },
      );
    } catch {
      // Best effort only — lease expiry remains the fallback recovery path.
    }
  }

  private async persistRun(
    run: PaperImplementationCoordinatorRun,
    expectedLeaseHolderId?: string,
  ): Promise<PaperImplementationCoordinatorRun> {
    try {
      return await this.coordinatorRepository.updateCoordinatorRun(
        run,
        expectedLeaseHolderId !== undefined ? { expectedLeaseHolderId } : undefined,
      );
    } catch (error) {
      throw new CoordinatorPersistenceFailure(error);
    }
  }

  private async persistStep(
    step: PaperImplementationCoordinatorStep,
  ): Promise<PaperImplementationCoordinatorStep> {
    try {
      return await this.coordinatorRepository.createCoordinatorStep(step);
    } catch (error) {
      throw new CoordinatorPersistenceFailure(error);
    }
  }

  private async tryMarkFailed(
    run: PaperImplementationCoordinatorRun,
    expectedLeaseHolderId?: string,
  ): Promise<void> {
    try {
      await this.coordinatorRepository.updateCoordinatorRun(
        {
          ...run,
          run_status: 'failed',
          lease: null,
          updated_at: this.now(),
        },
        expectedLeaseHolderId !== undefined ? { expectedLeaseHolderId } : undefined,
      );
    } catch {
      // Best effort only — the original coordinator fault is what propagates.
    }
  }

  /**
   * F2: budget raises are increase-only. Any provided dimension must be a
   * positive integer at or above the run's current envelope; a reduction is
   * a 400, never a silent clamp.
   */
  private assertBudgetEnvelopeRaise(
    run: PaperImplementationCoordinatorRun,
    raise: NonNullable<AdvancePaperImplementationCoordinatorRunRequest['raise_budget_envelope']>,
  ): void {
    const checks: ReadonlyArray<readonly ['max_steps' | 'max_provider_calls', number | undefined]> = [
      ['max_steps', raise.max_steps],
      ['max_provider_calls', raise.max_provider_calls],
    ];
    for (const [field, value] of checks) {
      if (value === undefined) {
        continue;
      }
      if (!Number.isInteger(value) || value < 1) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `raise_budget_envelope.${field} must be a positive integer.`,
        );
      }
      if (value < run.budget_envelope[field]) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `raise_budget_envelope.${field} (${value}) must not reduce the current envelope (${run.budget_envelope[field]}).`,
        );
      }
    }
  }

  private passedStepsByIndex(
    steps: PaperImplementationCoordinatorStep[],
  ): Map<number, PaperImplementationCoordinatorStep> {
    const byIndex = new Map<number, PaperImplementationCoordinatorStep>();
    for (const step of steps) {
      if (step.outcome === 'passed') {
        byIndex.set(step.step_index, step);
      }
    }
    return byIndex;
  }

  private chainContext(
    passedByIndex: Map<number, PaperImplementationCoordinatorStep>,
  ): LaneChainContext {
    const admittedRefByIndex = new Map<number, LaneChainAdmittedArtifact>();
    const selectedKeyByIndex = new Map<number, string>();
    for (const [index, step] of passedByIndex.entries()) {
      if (step.runtime_artifact_ref && step.runtime_artifact_hash) {
        admittedRefByIndex.set(index, {
          ref: step.runtime_artifact_ref,
          hash: step.runtime_artifact_hash,
          artifactId: step.runtime_artifact_id ?? null,
        });
      }
      if (step.decision_record?.selected_candidate_key) {
        selectedKeyByIndex.set(index, step.decision_record.selected_candidate_key);
      }
    }
    return { admittedRefByIndex, selectedKeyByIndex };
  }

  private async buildSlotRequest(
    run: PaperImplementationCoordinatorRun,
    laneSlots: readonly string[],
    slotId: string,
    stepIndex: number,
    nodeAttemptId: string,
    chainContext: LaneChainContext,
  ): Promise<Record<string, unknown>> {
    const basePayload = run.slot_request_payloads[slotId];
    if (!basePayload) {
      throw new AppError(
        500,
        'INTERNAL_ERROR',
        `Coordinator run ${run.coordinator_run_id} is missing the slot payload for ${slotId}.`,
      );
    }
    const payload = structuredClone(basePayload);
    const request: Record<string, unknown> = {
      ...payload,
      run_id: nodeAttemptId,
      run_mode: run.run_mode,
      execution_mode: run.execution_mode,
      model_profile_id: this.stringOrNull(payload.model_profile_id) ?? run.model_profile_id,
      model_option_id: this.stringOrNull(payload.model_option_id) ?? run.model_option_id,
    };
    if (run.lane_id === 'validation-planning') {
      await this.injectLaneAChainFields(request, run, laneSlots, slotId, stepIndex, chainContext);
      // S2-C C4: fixture echo alignment moved into the slot services (mocked
      // semantics are owned by each slot): missing/placeholder echo fields are
      // synthesized slot-side from the injected admitted upstream values, while
      // a present-but-drifted fixture echo stays intact and is still caught by
      // the slot's semantic drift gates.
    }
    return request;
  }

  private async injectLaneAChainFields(
    request: Record<string, unknown>,
    run: PaperImplementationCoordinatorRun,
    laneSlots: readonly string[],
    slotId: string,
    stepIndex: number,
    chainContext: LaneChainContext,
  ): Promise<void> {
    const requireAdmitted = (index: number): LaneChainAdmittedArtifact => {
      const admitted = chainContext.admittedRefByIndex.get(index);
      if (!admitted) {
        throw new AppError(
          500,
          'INTERNAL_ERROR',
          `Coordinator chain context is missing the admitted final artifact of step ${index} (${laneSlots[index]}).`,
        );
      }
      return admitted;
    };
    const requireSelectedKey = (index: number): string => {
      const key = chainContext.selectedKeyByIndex.get(index);
      if (!key) {
        throw new AppError(
          500,
          'INTERNAL_ERROR',
          `Coordinator chain context is missing the selected candidate key of step ${index} (${laneSlots[index]}).`,
        );
      }
      return key;
    };

    if (slotId === PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID && stepIndex === 1) {
      const routeProposal = requireAdmitted(0);
      request.admitted_route_proposal_artifact_ref = routeProposal.ref;
      request.admitted_route_proposal_artifact_hash = routeProposal.hash;
      request.reviewed_candidate_keys = [requireSelectedKey(0)];
      await this.appendUpstreamProposalPackets(request, run, laneSlots, [0], chainContext);
      return;
    }
    if (slotId === PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID && stepIndex === 2) {
      const routeProposal = requireAdmitted(0);
      const routeSkeptic = requireAdmitted(1);
      request.admitted_route_proposal_artifact_ref = routeProposal.ref;
      request.admitted_route_proposal_artifact_hash = routeProposal.hash;
      request.admitted_route_skeptic_artifact_ref = routeSkeptic.ref;
      request.admitted_route_skeptic_artifact_hash = routeSkeptic.hash;
      request.reviewed_candidate_keys = [requireSelectedKey(0)];
      await this.appendUpstreamProposalPackets(request, run, laneSlots, [0, 1], chainContext);
      return;
    }
    if (slotId === PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID && stepIndex === 3) {
      const routeProposal = requireAdmitted(0);
      const routeSkeptic = requireAdmitted(1);
      const validationCycle = requireAdmitted(2);
      request.admitted_validation_cycle_artifact_ref = validationCycle.ref;
      request.admitted_validation_cycle_artifact_hash = validationCycle.hash;
      request.admitted_route_proposal_artifact_ref = routeProposal.ref;
      request.admitted_route_proposal_artifact_hash = routeProposal.hash;
      request.admitted_route_skeptic_artifact_ref = routeSkeptic.ref;
      request.admitted_route_skeptic_artifact_hash = routeSkeptic.hash;
      request.reviewed_cycle_candidate_keys = [requireSelectedKey(2)];
      request.reviewed_route_candidate_keys = [requireSelectedKey(0)];
      await this.appendUpstreamProposalPackets(request, run, laneSlots, [0, 1, 2], chainContext);
    }
  }

  /**
   * B3: appends one `source_context_packets` entry per consumed upstream step
   * carrying a deterministic deep copy of the admitted final artifact's
   * content-bearing proposal fields, so the consuming role can actually
   * inspect the proposal body instead of only its ref+hash. The lookback is
   * fenced on the persisted lineage pair: a missing artifact or a
   * final_artifact_hash that no longer matches the step's admitted hash is a
   * coordinator-internal fault, never silently skipped. Caller-supplied
   * packets in the base payload are preserved (coordinator packets append).
   */
  private async appendUpstreamProposalPackets(
    request: Record<string, unknown>,
    run: PaperImplementationCoordinatorRun,
    laneSlots: readonly string[],
    upstreamIndexes: readonly number[],
    chainContext: LaneChainContext,
  ): Promise<void> {
    const packets: Record<string, unknown>[] = [];
    for (const index of upstreamIndexes) {
      const admitted = chainContext.admittedRefByIndex.get(index);
      const upstreamSlotId = laneSlots[index];
      if (!admitted || !upstreamSlotId) {
        throw new AppError(
          500,
          'INTERNAL_ERROR',
          `Coordinator chain context is missing the admitted final artifact of step ${index} (${laneSlots[index]}).`,
        );
      }
      if (!admitted.artifactId) {
        throw new AppError(
          500,
          'INTERNAL_ERROR',
          `Coordinator step ${index} (${upstreamSlotId}) has an admitted ref/hash but no runtime_artifact_id for the in-chain lookback.`,
        );
      }
      const artifact = await this.runtimeArtifactReader.findRuntimeArtifactById(
        run.implementation_project_id,
        admitted.artifactId,
      );
      if (!artifact) {
        throw new AppError(
          500,
          'INTERNAL_ERROR',
          `Coordinator in-chain lookback cannot find the admitted final artifact ${admitted.artifactId} of step ${index} (${upstreamSlotId}).`,
        );
      }
      // Same derivation as the admission record's admitted_artifact_hash
      // (final scope: final_artifact_hash, payload-hash fallback).
      if ((artifact.final_artifact_hash ?? artifact.artifact_payload_hash) !== admitted.hash) {
        throw new AppError(
          500,
          'INTERNAL_ERROR',
          `Coordinator in-chain lookback hash mismatch for step ${index} (${upstreamSlotId}): artifact ${admitted.artifactId} no longer matches the admitted hash.`,
        );
      }
      const contentFields = LANE_A_UPSTREAM_CONTENT_FIELDS[upstreamSlotId] ?? [];
      const proposalBody: Record<string, unknown> = {};
      for (const field of contentFields) {
        if (field in artifact.artifact_payload) {
          proposalBody[field] = artifact.artifact_payload[field];
        }
      }
      packets.push({
        source_ref: structuredClone(admitted.ref),
        evidence_kind: LANE_A_UPSTREAM_PACKET_EVIDENCE_KIND,
        content_summary: `Verbatim proposal content of the admitted ${upstreamSlotId} final artifact `
          + `${admitted.artifactId} (deterministic in-chain transcription; admitted hash ${admitted.hash}).`,
        key_facts: [JSON.stringify(structuredClone(proposalBody))],
      });
    }
    const existing = Array.isArray(request.source_context_packets)
      ? request.source_context_packets as unknown[]
      : [];
    request.source_context_packets = [...existing, ...packets];
  }

  private async runSlot(
    slotId: string,
    implementationProjectId: string,
    request: Record<string, unknown>,
  ): Promise<CoordinatorSlotRunResult> {
    switch (slotId) {
      case PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID:
        return this.routePlanningRuntime.runRouteArchitecture(
          implementationProjectId,
          request as unknown as RunPaperImplementationRoutePlanningRuntimeRequest,
        );
      case PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID:
        return this.routePlanningRuntime.runRouteSkepticReview(
          implementationProjectId,
          request as unknown as RunPaperImplementationRoutePlanningRuntimeRequest,
        );
      case PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID:
        return this.validationCyclePlanningRuntime.runCycleCandidates(
          implementationProjectId,
          request as unknown as RunPaperImplementationValidationCyclePlanningRuntimeRequest,
        );
      case PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID:
        return this.feasibilityPlanningRuntime.runProbePlanCandidates(
          implementationProjectId,
          request as unknown as RunPaperImplementationFeasibilityPlanningRuntimeRequest,
        );
      case PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID:
        return this.motiveDecompositionRuntime.runDraftAssertionCandidates(
          implementationProjectId,
          request as unknown as RunPaperImplementationMotiveDecompositionRuntimeRequest,
        );
      case PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID:
        return this.motiveEvolutionRuntime.runEvolutionDecisionSupport(
          implementationProjectId,
          request as unknown as RunPaperImplementationMotiveEvolutionRuntimeRequest,
        );
      case PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID:
        return this.evidenceBoardCurationRuntime.runBindingGapCandidates(
          implementationProjectId,
          request as unknown as RunPaperImplementationEvidenceBoardCurationRuntimeRequest,
        );
      case PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID:
        return this.crossBoardSynthesisRuntime.runMergeSplitReuseScenarios(
          implementationProjectId,
          request as unknown as RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
        );
      default:
        throw new AppError(500, 'INTERNAL_ERROR', `Coordinator has no executor for slot ${slotId}.`);
    }
  }

  private stepOutcome(
    slotId: string,
    result: CoordinatorSlotRunResult | null,
  ): PaperImplementationCoordinatorStepOutcome {
    if (!result) {
      return 'blocked';
    }
    if (result.status === 'failed_runtime') {
      return 'failed_runtime';
    }
    // T-124 D2-pre2: a curation final admitted with disposition=revise is a
    // semantically-valid gaps critique (the deterministic blocker-vs-disposition
    // split) — it parks the run as waiting_review (override / re-advance
    // resumes), aligned with the lane A skeptic non-proceed stop, rather than
    // the terminal blocked its admitted-blocked status would otherwise land.
    // disposition=blocked keeps the existing terminal block. This branch
    // precedes the generic blocked check because a revise final still carries
    // status='blocked', and it is server-derived — the coordinator only reads it.
    //
    // D2 复审 (A#3): the waiting_review park ALSO requires an ADMITTED final
    // admission record. Under R9 the step's acceptance-bridge ref/hash (and
    // runtime_artifact_id) materialize ONLY from an admitted final admission; a
    // revise final whose final admission was rejected would park as
    // waiting_review with null artifact ref/hash — nothing for a human to
    // review. Such a final falls back to the terminal blocked semantics below.
    if (
      slotId === PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID
      && result.final_runtime_artifact?.artifact_payload.recommended_disposition === 'revise'
      && result.final_admission_record?.admission_status === 'admitted'
    ) {
      return 'waiting_review';
    }
    if (result.status === 'blocked') {
      return 'blocked';
    }
    if (slotId === PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID) {
      const disposition = result.final_runtime_artifact?.artifact_payload.recommended_disposition;
      if (disposition !== 'proceed') {
        // T-133 P3 review fix (defensive parity with the curation A#3 gate and
        // the evolution branch below): the waiting_review park must carry an
        // ADMITTED final for a human to review — a rejected-admission final
        // would park with a null lineage pair ("nothing to review"), so it
        // falls to the terminal blocked semantics instead (safe direction).
        return result.final_admission_record?.admission_status === 'admitted'
          ? 'waiting_review'
          : 'blocked';
      }
    }
    // T-133 D-133-2 (P2): a PASSED evolution final whose SERVER-DERIVED
    // human-decision keys are non-empty means "decision support is ready and a
    // lineage-changing option awaits a human" — a semantic stop, not a defect.
    // Deliberately placed AFTER the generic blocked check: a mixed-defect
    // final (other blocked axes kept its codes aggregating) stays a terminal
    // blocked (red line — no blocked→waiting_review routing was opened).
    if (slotId === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID) {
      const keys = result.final_runtime_artifact?.artifact_payload.human_decision_required_option_keys;
      if (Array.isArray(keys) && keys.length > 0) {
        // P3 review fix: keys on a NON-admitted passed final must not silently
        // pass the human-decision stop — fail closed to blocked (the curation
        // A#3 direction), never fall through to 'passed'.
        return result.final_admission_record?.admission_status === 'admitted'
          ? 'waiting_review'
          : 'blocked';
      }
    }
    return 'passed';
  }

  /**
   * T-133 confirm-and-continue (D-133-3): deterministically validates the
   * referenced MotiveEvolutionDecision against the parked evolution final.
   * The coordinator never writes decisions or confirmations — the authority
   * chain (consume-before-write, human actor, target coverage at creation)
   * already ran; this is a READ-ONLY recheck:
   *   1. the current step must be an evolution waiting_review park (verb↔stop
   *      family mapping — revise-family stops reject this verb); the parked
   *      row is located by existence, never by "latest row" (P3 review C2),
   *   2. accepting consumes one step of the envelope, so the budget must
   *      admit it (P3 review C3 — a raise-less accept at the ceiling is a
   *      loud recoverable 409, never a silent ledger overrun),
   *   3. the parked final artifact is re-read by id and hash-rechecked (B3
   *      lookback discipline) and must carry non-empty human-decision keys,
   *   4. the decision must exist with application_status approved/applied,
   *      must cover the final's target_motive_refs (normalized ref types, the
   *      governance refCovered discipline), and must NOT predate the park —
   *      a stale decision cannot be replayed onto a newer stop (adversarial
   *      C3),
   *   5. a consumed human confirmation with scope motive_evolution_decision
   *      pointing back at the decision is required UNCONDITIONALLY — the park
   *      semantic is "a human decides", so a decision minted without a
   *      confirmation (whatever its own flags claim) can never accept the
   *      stop (adversarial C2).
   * All failures are client-recoverable rejections; the park survives them.
   */
  private async validateReviewAcceptance(
    implementationProjectId: string,
    run: PaperImplementationCoordinatorRun,
    laneSlots: readonly string[],
    steps: PaperImplementationCoordinatorStep[],
    acceptance: PaperImplementationCoordinatorReviewAcceptanceRequest,
  ): Promise<{ parked: PaperImplementationCoordinatorStep; humanConfirmationRef: string }> {
    const passedByIndex = this.passedStepsByIndex(steps);
    const nextIndex = laneSlots.findIndex((_, index) => !passedByIndex.has(index));
    const parked = nextIndex === -1
      ? null
      : steps.find((step) => step.step_index === nextIndex && step.outcome === 'waiting_review') ?? null;
    if (nextIndex === -1 || !parked) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `CoordinatorRun ${run.coordinator_run_id} has no waiting_review stop at its current step; review_acceptance has nothing to accept.`,
      );
    }
    const slotId = laneSlots[nextIndex]!;
    if (slotId !== PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `review_acceptance is the confirm-and-continue verb for the motive-evolution human-decision stop; `
        + `slot ${slotId} parks under the revise verb (payload override + re-advance) and never accepts a decision ref.`,
      );
    }
    if (acceptance.slot_id !== slotId) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `review_acceptance.slot_id ${acceptance.slot_id} does not match the parked slot ${slotId}.`,
      );
    }
    const consumed = this.consumedFromSteps(steps);
    if (consumed.steps + 1 > run.budget_envelope.max_steps) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `CoordinatorRun ${run.coordinator_run_id} has no step budget left for the accepted continuation; `
        + 'raise_budget_envelope in the same request and retry.',
      );
    }
    // R9 pairing: an evolution waiting_review park only exists over an
    // ADMITTED final, so the lineage pair must be present on the parked step.
    if (!parked.runtime_artifact_id || !parked.runtime_artifact_hash) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `Parked step ${parked.coordinator_step_id} carries no admitted final artifact lineage; review_acceptance cannot proceed.`,
      );
    }
    const artifact = await this.runtimeArtifactReader.findRuntimeArtifactById(
      implementationProjectId,
      parked.runtime_artifact_id,
    );
    if (!artifact || artifact.final_artifact_hash !== parked.runtime_artifact_hash) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `Parked evolution final artifact ${parked.runtime_artifact_id} was not found or drifted from the step lineage hash.`,
      );
    }
    const payload = artifact.artifact_payload as {
      target_motive_refs?: TopicSelectionFunctionalRef[];
      human_decision_required_option_keys?: unknown;
    };
    const decisionKeys = payload.human_decision_required_option_keys;
    if (!Array.isArray(decisionKeys) || decisionKeys.length === 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `Parked evolution final ${parked.runtime_artifact_id} carries no human-decision options; review_acceptance does not apply.`,
      );
    }
    const decision = await this.motiveDecisionReader.findMotiveEvolutionDecisionById(
      implementationProjectId,
      acceptance.decision_ref,
    );
    if (!decision) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `MotiveEvolutionDecision ${acceptance.decision_ref} was not found; review_acceptance requires an existing decision.`,
      );
    }
    if (decision.application_status !== 'approved' && decision.application_status !== 'applied') {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `MotiveEvolutionDecision ${acceptance.decision_ref} has application_status=${decision.application_status}; only approved or applied decisions accept the stop.`,
      );
    }
    // Adversarial C3: a decision minted BEFORE the park cannot have decided
    // about it — reject stale replays deterministically (ISO-8601 strings
    // compare lexicographically).
    if (decision.created_at < parked.created_at) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `MotiveEvolutionDecision ${acceptance.decision_ref} predates the parked stop; a decision created after the stop is required.`,
      );
    }
    const targetRefs = payload.target_motive_refs ?? [];
    const uncovered = targetRefs.filter((target) => !decision.source_motive_refs.some(
      (source) =>
        normalizedPaperImplementationRefType(source.ref_type) === normalizedPaperImplementationRefType(target.ref_type)
        && source.ref_id === target.ref_id,
    ));
    if (uncovered.length > 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `MotiveEvolutionDecision ${acceptance.decision_ref} does not cover the parked final's target motives: `
        + `${uncovered.map((ref) => `${ref.ref_type}:${ref.ref_id}`).join(', ')}.`,
      );
    }
    // Adversarial C2: the confirmation is required UNCONDITIONALLY — never
    // trust the decision's own human_confirmation_required flag (a decision
    // creator can mint a state_evolution/approved decision without any
    // confirmation; that must never clear a human-decision park).
    const confirmationRefId = decision.confirmation_ref?.ref_id ?? null;
    if (!confirmationRefId) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `MotiveEvolutionDecision ${acceptance.decision_ref} carries no confirmation_ref; the human-decision stop only accepts a decision backed by a consumed human confirmation.`,
      );
    }
    const confirmation = await this.confirmationReader.findHumanConfirmationRecordById(
      implementationProjectId,
      confirmationRefId,
    );
    if (
      !confirmation
      || confirmation.confirmation_scope !== 'motive_evolution_decision'
      || confirmation.consumed_by_ref?.ref_id !== decision.motive_evolution_decision_id
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `HumanConfirmationRecord ${confirmationRefId} is missing, has the wrong scope, or was not consumed by decision ${acceptance.decision_ref}.`,
      );
    }
    return { parked, humanConfirmationRef: confirmationRefId };
  }

  /**
   * Pure build of the accepted continuation step: passed with zero provider
   * calls, the parked artifact lineage copied verbatim (nothing is forged —
   * the waiting_review row stays in history), and the acceptance audit record
   * stamped. Persistence and lease fencing happen in the advance loop.
   */
  private buildReviewAcceptanceStep(
    implementationProjectId: string,
    run: PaperImplementationCoordinatorRun,
    steps: PaperImplementationCoordinatorStep[],
    acceptance: PaperImplementationCoordinatorReviewAcceptanceRequest,
    leaseHolderId: string,
    validated: { parked: PaperImplementationCoordinatorStep; humanConfirmationRef: string },
  ): PaperImplementationCoordinatorStep {
    const { parked, humanConfirmationRef } = validated;
    const attemptSequence = steps.filter((step) => step.step_index === parked.step_index).length;
    return {
      schema_version: PAPER_IMPLEMENTATION_COORDINATOR_STEP_SCHEMA_VERSION,
      coordinator_step_id: this.idFactory('pi_coordinator_step'),
      coordinator_run_id: run.coordinator_run_id,
      implementation_project_id: implementationProjectId,
      step_index: parked.step_index,
      slot_id: parked.slot_id,
      node_attempt_id: this.idFactory(
        `${run.coordinator_run_id}.step-${parked.step_index}.acceptance-${attemptSequence}`,
      ),
      runtime_artifact_ref: parked.runtime_artifact_ref,
      runtime_artifact_hash: parked.runtime_artifact_hash,
      runtime_artifact_id: parked.runtime_artifact_id,
      admission_ref: parked.admission_ref,
      decision_record: parked.decision_record,
      outcome: 'passed',
      provider_call_count: 0,
      blocker_codes: [],
      advance_holder_id: leaseHolderId,
      review_acceptance: {
        decision_ref: acceptance.decision_ref,
        human_confirmation_ref: humanConfirmationRef,
        acceptance_actor_id: acceptance.acceptance_actor_id,
      },
      created_at: this.now(),
    };
  }


  private selectionDecisionForSlot(
    slotId: string,
    result: CoordinatorSlotRunResult,
  ): PaperImplementationCandidateSelectionDecisionRecord | null {
    const payload = result.final_runtime_artifact?.artifact_payload;
    if (!payload) {
      return null;
    }
    if (slotId === PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID) {
      return selectPaperImplementationCandidateV1(
        this.candidateProjections(payload.route_candidate_proposals),
      );
    }
    if (slotId === PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID) {
      return selectPaperImplementationCandidateV1(
        this.candidateProjections(payload.cycle_candidate_proposals),
      );
    }
    return null;
  }

  private candidateProjections(
    proposals: unknown,
  ): PaperImplementationCandidateSelectionCandidateProjection[] {
    if (!Array.isArray(proposals)) {
      return [];
    }
    return proposals
      .filter((proposal): proposal is Record<string, unknown> =>
        Boolean(proposal) && typeof proposal === 'object' && !Array.isArray(proposal))
      .map((proposal) => ({
        candidate_key: typeof proposal.candidate_key === 'string' ? proposal.candidate_key : '',
        expected_information_gain: this.normalizeGain(proposal.expected_information_gain),
        blocker_codes: Array.isArray(proposal.blocker_codes)
          ? proposal.blocker_codes.filter((code): code is string => typeof code === 'string')
          : [],
      }))
      .filter((projection) => projection.candidate_key.length > 0);
  }

  private normalizeGain(value: unknown): PaperImplementationCandidateSelectionGainLevel | null {
    return typeof value === 'string'
      && (PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_GAIN_LEVELS as readonly string[]).includes(value)
      ? value as PaperImplementationCandidateSelectionGainLevel
      : null;
  }

  private assertSlotRequestPayloads(
    laneId: PaperImplementationCoordinatorLaneId,
    laneSlots: readonly string[],
    payloads: Record<string, Record<string, unknown>>,
    runMode: PaperImplementationCoordinatorRun['run_mode'],
  ): void {
    const payloadSlots = Object.keys(payloads ?? {});
    const missing = laneSlots.filter((slotId) => !payloadSlots.includes(slotId));
    if (missing.length > 0) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `slot_request_payloads is missing lane ${laneId} slots: ${missing.join(', ')}.`,
      );
    }
    const unknown = payloadSlots.filter((slotId) => !laneSlots.includes(slotId));
    if (unknown.length > 0) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `slot_request_payloads contains slots outside lane ${laneId}: ${unknown.join(', ')}.`,
      );
    }
    for (const slotId of laneSlots) {
      this.assertSlotPayload(slotId, payloads[slotId] ?? {}, runMode);
    }
  }

  private assertSlotPayload(
    slotId: string,
    payload: Record<string, unknown>,
    runMode: PaperImplementationCoordinatorRun['run_mode'],
  ): void {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `slot_request_payloads.${slotId} must be an object.`);
    }
    const coordinatorOwned = [
      ...COORDINATOR_OWNED_REQUEST_FIELDS,
      ...(COORDINATOR_INJECTED_CHAIN_FIELDS[slotId] ?? []),
    ];
    const conflicts = coordinatorOwned.filter((field) => field in payload);
    if (conflicts.length > 0) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `slot_request_payloads.${slotId} must not carry coordinator-owned fields: ${conflicts.join(', ')}.`,
      );
    }
    if (runMode === 'product') {
      const fixtureFields = FIXTURE_OUTPUT_FIELDS.filter((field) => {
        const value = payload[field];
        return Boolean(value) && typeof value === 'object' && Object.keys(value as object).length > 0;
      });
      if (fixtureFields.length > 0) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `product run_mode rejects fixture payloads in slot_request_payloads.${slotId}: ${fixtureFields.join(', ')}.`,
        );
      }
    }
  }

  /**
   * Lane B domain-anchor coupling: motive_decomposition and motive_evolution
   * must review the same frozen source refs/hashes bundle; there is no
   * artifact chain between the two steps.
   */
  private assertMotiveLaneFrozenSourceBundle(
    payloads: Record<string, Record<string, unknown>>,
  ): void {
    const decomposition = payloads[PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID] ?? {};
    const evolution = payloads[PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID] ?? {};
    const sameRefs = stableStringify(decomposition.source_refs ?? null)
      === stableStringify(evolution.source_refs ?? null);
    const sameHashes = stableStringify(decomposition.source_hashes ?? null)
      === stableStringify(evolution.source_hashes ?? null);
    if (!sameRefs || !sameHashes) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'motive lane requires motive_decomposition and motive_evolution to share the same frozen source refs/hashes bundle.',
      );
    }
  }

  private stringOrNull(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.filter((value) => value.trim().length > 0))];
  }
}
