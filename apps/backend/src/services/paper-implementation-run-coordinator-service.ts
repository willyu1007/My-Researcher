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
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { requireActiveImplementationProject } from './paper-implementation-runtime-preflight.js';
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

/** Request fields owned by the coordinator; payloads must not carry them. */
const COORDINATOR_OWNED_REQUEST_FIELDS = ['run_id', 'run_mode', 'execution_mode'] as const;

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
 * R4/D2: until the tier levels are wired up (D2), this code reaches the
 * coordinator through the deterministic preflight echo channel
 * (`preflight_blocker_codes` → zero-provider-call blocked final). Such
 * zero-call blocked results are LLM-free, so their blocker codes are merged
 * into the trusted set (see the R4 trust rule in `advanceLoop`).
 */
const TIER_BUDGET_BLOCKER_CODE = 'TIER_BUDGET_INSUFFICIENT';
const NO_ELIGIBLE_CANDIDATE_BLOCKER_CODE = 'COORDINATOR_NO_ELIGIBLE_CANDIDATE';
const SLOT_INVOCATION_FAILED_BLOCKER_CODE = 'SLOT_INVOCATION_FAILED';

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
  ...SHARED_RUNTIME_AND_GATE_QUEUE_TYPE_BY_BLOCKER_CODE,
};

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
 * results) and classify through the full exact + prefix tables;
 * `slotBlockerCodes` come from the slot result payload (potentially
 * LLM-influenced) and only classify through the exact slot whitelist —
 * never the coordinator-owned prefix families. With no table hit the step
 * outcome enum (never a string heuristic) picks between the failed-run
 * bucket and the explicit `unclassified` bucket.
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
      return await this.advanceLoop(implementationProjectId, run, laneSlots, holderId);
    } catch (error) {
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
  ): Promise<PaperImplementationCoordinatorRunWithSteps> {
    let run = initialRun;
    const steps = await this.coordinatorRepository.listCoordinatorSteps(
      implementationProjectId,
      run.coordinator_run_id,
    );

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
      // R10: budget decisions read the steps-derived consumption, never the
      // cached run-row counters.
      const consumed = this.consumedFromSteps(steps);
      if (
        consumed.steps + 1 > run.budget_envelope.max_steps
        || consumed.provider_calls >= run.budget_envelope.max_provider_calls
      ) {
        return this.finish(run, steps, 'budget_exhausted', leaseHolderId);
      }

      const slotId = laneSlots[nextIndex]!;
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
      if (result && result.status === 'blocked' && result.provider_call_count === 0) {
        trustedBlockerCodes.push(...slotBlockerCodes);
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
    if (result.status === 'blocked') {
      return 'blocked';
    }
    if (slotId === PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID) {
      const disposition = result.final_runtime_artifact?.artifact_payload.recommended_disposition;
      if (disposition !== 'proceed') {
        return 'waiting_review';
      }
    }
    return 'passed';
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
