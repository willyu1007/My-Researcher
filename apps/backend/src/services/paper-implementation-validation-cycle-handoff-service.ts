import {
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_HANDOFF_RESUME_POLICY,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_HANDOFF_SCHEMA_VERSION,
  type CreatePaperImplementationValidationCycleHandoffRequest,
  type ImplementationIntakeSnapshot,
  type PaperImplementationValidationCycleHandoffBlocker,
  type PaperImplementationValidationCycleHandoffEffect,
  type PaperImplementationValidationCycleHandoffResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  CreatePaperImplementationCoordinatorRunRequest,
  PaperImplementationCoordinatorRun,
  PaperImplementationCoordinatorRunWithSteps,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-coordinator-contracts';
import type {
  CoreMotiveIdentity,
  CoreMotiveVersion,
  CoreMotiveVersionState,
  EvidenceBinding,
  MotiveAssertion,
  MotiveEvidenceBoardVersion,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';
import {
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_PROFILE_ID,
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_PROFILE_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
  type PaperImplementationRuntimeArtifactEnvelope,
  type PaperImplementationValidationCycleCandidateProposal,
  type PaperImplementationValidationCyclePlanningArtifact,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TraceLineageBundle,
  TraceManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  CreateValidationCycleDraftRequest,
  ValidationCycle,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import type { PaperImplementationMotiveRepository } from '../repositories/paper-implementation-motive.repository.js';
import type { PaperImplementationRepository } from '../repositories/paper-implementation.repository.js';
import type { PaperImplementationRuntimeRepository } from '../repositories/paper-implementation-runtime.repository.js';
import type {
  PaperImplementationValidationRepository,
  ValidationCycleOwnerScopeQuery,
} from '../repositories/paper-implementation-validation.repository.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import type { PaperImplementationRunCoordinatorService } from './paper-implementation-run-coordinator-service.js';
import type { PaperImplementationTraceKernelService } from './paper-implementation-trace-kernel-service.js';
import type { PaperImplementationValidationCyclePlanningService } from './paper-implementation-validation-cycle-planning-service.js';

type HandoffCoordinator = Pick<
  PaperImplementationRunCoordinatorService,
  'createCoordinatorRun' | 'getCoordinatorRun' | 'advance'
>;
type HandoffTraceKernel = Pick<
  PaperImplementationTraceKernelService,
  'ensureTraceManifest' | 'getTraceManifest'
>;
type HandoffCycleWriter = Pick<
  PaperImplementationValidationCyclePlanningService,
  'createValidationCycleDraft' | 'admitValidationCycle'
>;

export interface PaperImplementationValidationCycleHandoffServiceOptions {
  projectRepository: PaperImplementationRepository;
  motiveRepository: PaperImplementationMotiveRepository;
  validationRepository: PaperImplementationValidationRepository;
  runtimeRepository: Pick<PaperImplementationRuntimeRepository, 'findRuntimeArtifactById'>;
  traceKernel: HandoffTraceKernel;
  cycleWriter: HandoffCycleWriter;
  coordinator: HandoffCoordinator;
}

interface OwnerContext {
  snapshot: ImplementationIntakeSnapshot;
  motive: CoreMotiveIdentity;
  version: CoreMotiveVersion;
  state: CoreMotiveVersionState;
  assertions: MotiveAssertion[];
  requiredAssertions: MotiveAssertion[];
  board: MotiveEvidenceBoardVersion;
  bindings: EvidenceBinding[];
  boardTraces: TraceManifest[];
}

interface ResponseState {
  performed: PaperImplementationValidationCycleHandoffEffect[];
  reused: PaperImplementationValidationCycleHandoffEffect[];
  coordinatorRunId: string | null;
  validationArtifactId: string | null;
  selectedCandidateKey: string | null;
  cycle: ValidationCycle | null;
  traceManifestId: string | null;
}

const ACTIVE_CYCLE_STATUSES = new Set<ValidationCycle['lifecycle_status']>([
  'proposed', 'admitted', 'running', 'interpreting',
]);
const HANDOFF_POLICY_VERSION = 'paper-implementation-validation-cycle-handoff-v1';

/**
 * Owner-root composition seam from one current EvidenceBoard to one admitted
 * ValidationCycle. It owns no scientific planner or persistence logic: the
 * fixed coordinator lane selects a proposal and T-095 remains the sole writer.
 */
export class PaperImplementationValidationCycleHandoffService {
  private readonly inFlight = new Map<string, Promise<PaperImplementationValidationCycleHandoffResponse>>();

  constructor(private readonly options: PaperImplementationValidationCycleHandoffServiceOptions) {}

  async continue(
    request: CreatePaperImplementationValidationCycleHandoffRequest,
  ): Promise<PaperImplementationValidationCycleHandoffResponse> {
    if (!request.implementation_project_id?.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'implementation_project_id is required.');
    }
    const projectId = request.implementation_project_id.trim();
    const existing = this.inFlight.get(projectId);
    if (existing) return existing;
    const current = this.continueOnce(projectId).finally(() => {
      if (this.inFlight.get(projectId) === current) this.inFlight.delete(projectId);
    });
    this.inFlight.set(projectId, current);
    return current;
  }

  private async continueOnce(
    implementationProjectId: string,
  ): Promise<PaperImplementationValidationCycleHandoffResponse> {
    const state: ResponseState = {
      performed: [],
      reused: [],
      coordinatorRunId: null,
      validationArtifactId: null,
      selectedCandidateKey: null,
      cycle: null,
      traceManifestId: null,
    };
    let owner: OwnerContext;
    try {
      owner = await this.readOwner(implementationProjectId);
    } catch (error) {
      if (
        error instanceof AppError
        && (error.errorCode === 'NOT_FOUND' || error.errorCode === 'GATE_CONSTRAINT_FAILED')
      ) {
        return this.ownerBlocked(implementationProjectId, error);
      }
      throw error;
    }

    const existingCycle = await this.readExistingActiveCycle(owner);
    if (existingCycle) {
      state.cycle = existingCycle;
      this.effect(state, 'trace_manifest', false);
      this.effect(state, 'validation_cycle', false);
      return this.success(owner, state, false);
    }

    const planning = await this.ensurePlanning(owner);
    state.coordinatorRunId = planning.run.run.coordinator_run_id;
    this.effect(state, 'coordinator_run', planning.created);
    if (planning.blocker) {
      return this.blocked(owner, state, 'validation_planning', planning.status, planning.blocker);
    }
    this.effect(state, 'validation_planning_artifacts', planning.performed);

    const selected = await this.readSelectedCycleProposal(owner, planning.run);
    state.validationArtifactId = selected.artifact.runtime_artifact_id;
    state.selectedCandidateKey = selected.candidate.candidate_key;
    if (selected.candidate.confirmatory_marker) {
      return this.blocked(owner, state, 'cycle_write', 'waiting_for_human_confirmation', {
        code: 'VALIDATION_CYCLE_CONFIRMATORY_REVIEW_REQUIRED',
        message: 'The selected ValidationCycle proposal is confirmatory and requires explicit human review before authority is written.',
        source: 'domain',
        retryable: false,
      });
    }
    const cycle = await this.ensureCycle(owner, selected.artifact, selected.candidate);
    state.cycle = cycle.cycle;
    state.traceManifestId = cycle.traceManifestId;
    this.effect(state, 'trace_manifest', cycle.traceCreated);
    this.effect(state, 'validation_cycle', cycle.cycleCreated);
    if (cycle.blocker) {
      return this.blocked(owner, state, 'cycle_write', 'blocked', cycle.blocker);
    }
    return this.success(owner, state, cycle.cycleCreated);
  }

  private async readOwner(implementationProjectId: string): Promise<OwnerContext> {
    const project = await this.options.projectRepository.findProjectById(implementationProjectId);
    const snapshot = await this.options.projectRepository.findIntakeSnapshotByProjectId(implementationProjectId);
    if (!project) {
      throw new AppError(404, 'NOT_FOUND', `ImplementationProject ${implementationProjectId} not found.`);
    }
    if (
      !snapshot
      || snapshot.implementation_project_id !== project.implementation_project_id
      || snapshot.intake_snapshot_id !== project.intake_snapshot_id
      || snapshot.title_card_id !== project.title_card_id
      || (snapshot.workspace_id ?? null) !== (project.workspace_id ?? null)
      || project.lifecycle_status !== 'active'
      || project.freshness_status !== 'fresh'
      || project.source_status !== 'active'
      || snapshot.source_status !== 'active'
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ValidationCycle handoff requires an active, fresh project and intake snapshot.',
      );
    }
    const motiveSet = await this.options.motiveRepository.findMotiveSet(implementationProjectId);
    const motiveId = motiveSet?.primary_motive_ids[0] ?? null;
    if (
      !motiveId
      || motiveSet?.implementation_project_id !== implementationProjectId
      || motiveSet.primary_motive_ids.length !== 1
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ValidationCycle handoff requires exactly one admitted primary CoreMotive.',
      );
    }
    const motive = await this.options.motiveRepository.findMotiveIdentityById(implementationProjectId, motiveId);
    const version = motive?.current_version_id
      ? await this.options.motiveRepository.findCoreMotiveVersionById(
        implementationProjectId,
        motive.current_version_id,
      )
      : null;
    if (
      !motive
      || !version
      || motive.implementation_project_id !== implementationProjectId
      || version.implementation_project_id !== implementationProjectId
      || motive.portfolio_role.role !== 'primary'
      || motive.lifecycle_status !== 'active'
      || version.motive_id !== motive.motive_id
      || version.version_status !== 'admitted'
    ) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'The primary CoreMotive owner is not active and admitted.');
    }
    const state = await this.options.motiveRepository.findMotiveVersionStateByVersionId(
      implementationProjectId,
      version.core_motive_version_id,
    );
    const assertions = await this.options.motiveRepository.listAssertionsByVersion(
      implementationProjectId,
      version.core_motive_version_id,
    );
    const requiredAssertions = assertions.filter((assertion) =>
      assertion.importance.role === 'core' || assertion.importance.must_hold_for_motive_to_continue);
    if (
      !state
      || state.implementation_project_id !== implementationProjectId
      || state.motive_id !== motive.motive_id
      || state.core_motive_version_id !== version.core_motive_version_id
      || state.freshness_status !== 'fresh'
      || assertions.some((assertion) =>
        assertion.implementation_project_id !== implementationProjectId
        || assertion.motive_id !== motive.motive_id
        || assertion.core_motive_version_id !== version.core_motive_version_id)
      || requiredAssertions.length === 0
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ValidationCycle handoff requires fresh motive state and at least one required assertion.',
      );
    }
    if (!state.current_board_version_id) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'The admitted motive has no current EvidenceBoard.');
    }
    const board = await this.options.motiveRepository.findMotiveEvidenceBoardById(
      implementationProjectId,
      state.current_board_version_id,
    );
    if (
      !board
      || board.implementation_project_id !== implementationProjectId
      || board.motive_id !== motive.motive_id
      || board.core_motive_version_id !== version.core_motive_version_id
      || board.board_state.readiness_status !== 'evidence_ready'
      || board.board_state.freshness_status !== 'fresh'
      || board.board_state.blocker_status !== 'none'
      || board.assertion_refs.some((ref) =>
        !this.refTargets(
          ref,
          'motive_assertion',
          ref.ref_id,
          snapshot.title_card_id,
          false,
        )
        || !assertions.some((assertion) => assertion.assertion_id === ref.ref_id))
      || board.evidence_binding_refs.some((ref) => !this.refTargets(
        ref,
        'evidence_binding',
        ref.ref_id,
        snapshot.title_card_id,
        false,
      ))
      || !this.refTargets(
        board.trace_manifest_ref,
        'trace_manifest',
        board.trace_manifest_id,
        snapshot.title_card_id,
        false,
      )
    ) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'The current EvidenceBoard is not fresh and evidence-ready.');
    }
    const bindings = await Promise.all(board.evidence_binding_refs.map(async (bindingRef) => {
      const binding = await this.options.motiveRepository.findEvidenceBindingById(
        implementationProjectId,
        bindingRef.ref_id,
      );
      if (
        !binding
        || binding.implementation_project_id !== implementationProjectId
        || binding.board_version_id !== board.board_version_id
        || binding.motive_id !== motive.motive_id
        || binding.core_motive_version_id !== version.core_motive_version_id
        || !assertions.some((assertion) => assertion.assertion_id === binding.assertion_id)
        || binding.freshness_status !== 'fresh'
        || !this.refTargets(
          bindingRef,
          'evidence_binding',
          binding.binding_id,
          snapshot.title_card_id,
          false,
        )
        || !this.refTargets(
          binding.trace_manifest_ref,
          'trace_manifest',
          binding.trace_manifest_id,
          snapshot.title_card_id,
          false,
        )
        || binding.evidence_ref.title_card_id !== snapshot.title_card_id
      ) {
        throw new AppError(409, 'VERSION_CONFLICT', `EvidenceBinding ${bindingRef.ref_id} is missing or owner-drifted.`);
      }
      return binding;
    }));
    const traceTargets = [
      {
        traceManifestId: board.trace_manifest_id,
        targetType: 'motive_evidence_board_version',
        targetId: board.board_version_id,
        label: `EvidenceBoard ${board.board_version_id}`,
      },
      ...bindings.map((binding) => ({
        traceManifestId: binding.trace_manifest_id,
        targetType: 'evidence_binding',
        targetId: binding.binding_id,
        label: `EvidenceBinding ${binding.binding_id}`,
      })),
    ];
    let boardTraces: TraceManifest[];
    try {
      boardTraces = await Promise.all(traceTargets.map(async (target) => {
        const trace = await this.options.traceKernel.getTraceManifest(
          implementationProjectId,
          target.traceManifestId,
        );
        this.assertTraceTarget(trace, target.targetType, target.targetId, snapshot, target.label);
        return trace;
      }));
    } catch (error) {
      if (error instanceof AppError && error.errorCode === 'NOT_FOUND') {
        throw new AppError(409, 'VERSION_CONFLICT', 'The current EvidenceBoard references missing trace authority.');
      }
      throw error;
    }
    if (boardTraces.some((trace) => trace.trace_status !== 'complete')) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'The current EvidenceBoard contains incomplete trace authority.');
    }
    return { snapshot, motive, version, state, assertions, requiredAssertions, board, bindings, boardTraces };
  }

  private async readExistingActiveCycle(owner: OwnerContext): Promise<ValidationCycle | null> {
    const activeCycles = await this.options.validationRepository.listValidationCyclesByOwnerScope(
      owner.snapshot.implementation_project_id,
      this.ownerCycleQuery(owner, [...ACTIVE_CYCLE_STATUSES], 2),
    );
    if (activeCycles.length > 1) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'More than one active ValidationCycle targets the current motive owner; resolve the ambiguity first.',
      );
    }
    const completedCycles = activeCycles.length === 0
      ? await this.options.validationRepository.listValidationCyclesByOwnerScope(
        owner.snapshot.implementation_project_id,
        this.ownerCycleQuery(owner, ['completed'], 1),
      )
      : [];
    const cycle = activeCycles[0] ?? completedCycles[0] ?? null;
    if (!cycle) return null;
    if (cycle.policy_version_id === HANDOFF_POLICY_VERSION) return null;
    if (cycle.lifecycle_status === 'proposed') {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `Existing proposed ValidationCycle ${cycle.validation_cycle_id} requires explicit review before owner-root continuation.`,
      );
    }
    if (!cycle.trace_manifest_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'The existing active ValidationCycle has no admitted trace authority.');
    }
    const trace = await this.readTraceOrConflict(
      owner.snapshot.implementation_project_id,
      cycle.trace_manifest_id,
      `ValidationCycle ${cycle.validation_cycle_id}`,
    );
    if (trace.trace_status !== 'complete') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'The existing active ValidationCycle trace is incomplete.');
    }
    this.assertTraceTarget(
      trace,
      'validation_cycle',
      cycle.validation_cycle_id,
      owner.snapshot,
      `ValidationCycle ${cycle.validation_cycle_id}`,
    );
    return cycle;
  }

  private async ensurePlanning(owner: OwnerContext): Promise<{
    run: PaperImplementationCoordinatorRunWithSteps;
    created: boolean;
    performed: boolean;
    status: PaperImplementationValidationCycleHandoffResponse['status'];
    blocker: PaperImplementationValidationCycleHandoffBlocker | null;
  }> {
    const payloads = this.planningPayloads(owner);
    const coordinatorRunId = this.id('pi_coordinator_run', stableStringify({
      lane: 'validation-planning',
      project: owner.snapshot.implementation_project_id,
      motive_version: owner.version.core_motive_version_id,
      board: owner.board.board_version_id,
      payloads,
    }));
    const expectedRequest: CreatePaperImplementationCoordinatorRunRequest = {
      coordinator_run_id: coordinatorRunId,
      lane_id: 'validation-planning',
      run_mode: 'product',
      execution_mode: 'provider_llm',
      model_profile_id: null,
      model_option_id: null,
      budget_envelope: { max_steps: 4, max_provider_calls: 8 },
      slot_request_payloads: payloads,
    };
    let created = false;
    try {
      await this.options.coordinator.createCoordinatorRun(
        owner.snapshot.implementation_project_id,
        expectedRequest,
      );
      created = true;
    } catch (error) {
      if (!(error instanceof AppError) || error.errorCode !== 'VERSION_CONFLICT') throw error;
    }
    let run = await this.options.coordinator.getCoordinatorRun(
      owner.snapshot.implementation_project_id,
      coordinatorRunId,
    );
    this.assertExpectedCoordinatorRun(run.run, expectedRequest, owner.snapshot.implementation_project_id);
    let performed = false;
    const retryableRuntimeStop = run.run.run_status === 'blocked'
      && run.steps.at(-1)?.outcome === 'failed_runtime';
    if (
      run.run.run_status === 'created'
      || run.run.run_status === 'advancing'
      || retryableRuntimeStop
    ) {
      try {
        run = await this.options.coordinator.advance(
          owner.snapshot.implementation_project_id,
          coordinatorRunId,
        );
        performed = true;
      } catch (error) {
        if (!(error instanceof AppError) || error.errorCode !== 'CONCURRENT_ADVANCE') throw error;
        return {
          run,
          created,
          performed: false,
          status: 'waiting_for_llm',
          blocker: {
            code: 'VALIDATION_PLANNING_IN_PROGRESS',
            message: 'The persisted validation-planning run is advancing; repeat the same handoff.',
            source: 'provider',
            retryable: true,
          },
        };
      }
    }
    this.assertExpectedCoordinatorRun(run.run, expectedRequest, owner.snapshot.implementation_project_id);
    if (run.run.run_status === 'completed') {
      return { run, created, performed, status: created ? 'created' : 'resumed', blocker: null };
    }
    const waitingReview = run.run.run_status === 'waiting_review';
    const failedRuntime = run.steps.at(-1)?.outcome === 'failed_runtime';
    if (run.run.run_status === 'failed') {
      return {
        run,
        created,
        performed,
        status: 'blocked',
        blocker: {
          code: 'VALIDATION_PLANNING_TERMINAL_FAILED',
          message: 'The persisted validation-planning run is terminal failed and cannot be resumed by this handoff.',
          source: 'domain',
          retryable: false,
        },
      };
    }
    if (run.run.run_status === 'budget_exhausted') {
      return {
        run,
        created,
        performed,
        status: 'blocked',
        blocker: {
          code: 'VALIDATION_PLANNING_BUDGET_EXHAUSTED',
          message: 'The persisted validation-planning run exhausted its coordinator budget; raise that run budget explicitly before repeating this handoff.',
          source: 'domain',
          retryable: false,
        },
      };
    }
    return {
      run,
      created,
      performed,
      status: waitingReview ? 'waiting_for_human_confirmation' : failedRuntime ? 'waiting_for_llm' : 'blocked',
      blocker: {
        code: waitingReview
          ? 'VALIDATION_PLANNING_REVIEW_REQUIRED'
          : failedRuntime
            ? 'VALIDATION_PLANNING_LLM_FAILED'
            : 'VALIDATION_PLANNING_BLOCKED',
        message: `Validation-planning stopped in ${run.run.run_status}: ${run.steps.at(-1)?.blocker_codes[0] ?? 'no admitted continuation artifact'}.`,
        source: failedRuntime ? 'provider' : 'domain',
        retryable: failedRuntime,
      },
    };
  }

  private assertExpectedCoordinatorRun(
    run: PaperImplementationCoordinatorRun,
    request: CreatePaperImplementationCoordinatorRunRequest,
    implementationProjectId: string,
  ): void {
    const expected = {
      coordinator_run_id: request.coordinator_run_id,
      implementation_project_id: implementationProjectId,
      lane_id: request.lane_id,
      run_mode: request.run_mode,
      execution_mode: request.execution_mode,
      model_profile_id: request.model_profile_id ?? null,
      model_option_id: request.model_option_id ?? null,
      slot_request_payloads: request.slot_request_payloads,
    };
    const actual = {
      coordinator_run_id: run.coordinator_run_id,
      implementation_project_id: run.implementation_project_id,
      lane_id: run.lane_id,
      run_mode: run.run_mode,
      execution_mode: run.execution_mode,
      model_profile_id: run.model_profile_id,
      model_option_id: run.model_option_id,
      slot_request_payloads: run.slot_request_payloads,
    };
    if (
      stableStringify(actual) !== stableStringify(expected)
      || !this.coordinatorBudgetMatches(run, request.budget_envelope)
    ) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Deterministic validation-planning run is bound to different server-owned semantics.',
      );
    }
  }

  private coordinatorBudgetMatches(
    run: PaperImplementationCoordinatorRun,
    initialBudget: CreatePaperImplementationCoordinatorRunRequest['budget_envelope'],
  ): boolean {
    if (stableStringify(run.budget_envelope) === stableStringify(initialBudget)) return true;
    const events = run.budget_raise_events ?? [];
    let expectedFrom = initialBudget;
    for (const event of events) {
      if (stableStringify(event.from) !== stableStringify(expectedFrom)) return false;
      if (
        event.to.max_steps < event.from.max_steps
        || event.to.max_provider_calls < event.from.max_provider_calls
      ) {
        return false;
      }
      expectedFrom = event.to;
    }
    return events.length > 0
      && stableStringify(expectedFrom) === stableStringify(run.budget_envelope);
  }

  private planningPayloads(owner: OwnerContext): Record<string, Record<string, unknown>> {
    const targetRef = this.ref('motive_evidence_board', owner.board.board_version_id, owner);
    const inputSnapshotRef = this.ref('implementation_intake_snapshot', owner.snapshot.intake_snapshot_id, owner);
    const evidenceRefs = this.uniqueRefs(owner.bindings.map((binding) => binding.evidence_ref));
    const sourceRefs = evidenceRefs.length > 0 ? evidenceRefs : [targetRef];
    const sourceHashes = sourceRefs.map((ref) => sha256Text(stableStringify({
      ref,
      board: owner.board,
      binding: owner.bindings.find((item) => this.sameRef(item.evidence_ref, ref)) ?? null,
    })));
    const sourceContextPackets = sourceRefs.map((sourceRef, index) => {
      const binding = owner.bindings.find((item) => this.sameRef(item.evidence_ref, sourceRef));
      return {
        source_ref: sourceRef,
        evidence_kind: binding ? 'reviewed_evidence_binding' : 'risk_only_evidence_board',
        content_summary: binding?.interpretation.normalized_statement
          ?? owner.board.board_summary.current_support_summary,
        key_facts: this.uniqueStrings([
          `source_hash=${sourceHashes[index]}`,
          `board_support_state=${owner.board.board_state.support_state}`,
          `board_challenge_status=${owner.board.board_state.challenge_status}`,
          `motive=${owner.version.motive_contract.short_name}: ${owner.version.motive_contract.motivation_claim}`,
          `target_setting=${owner.version.motive_contract.target_setting}`,
          `maximum_allowed_claim=${owner.version.claim_boundary.maximum_allowed_claim}`,
          ...owner.version.claim_boundary.forbidden_overclaims.map((claim) => `forbidden_overclaim=${claim}`),
          ...owner.requiredAssertions.map((assertion) =>
            `required_assertion=${assertion.assertion_id}: ${assertion.assertion_text}`),
          ...owner.version.falsification_contract.invalidation_conditions.map((condition) =>
            `invalidation_condition=${condition}`),
          ...owner.snapshot.early_check_obligations.map((obligation) => `early_check_obligation=${obligation}`),
          ...(binding ? [
            `binding_role=${binding.role}`,
            `binding_support_state=${binding.support_state}`,
            `binding_strength=${binding.strength.directness}`,
            ...binding.interpretation.limitations,
          ] : owner.board.board_summary.next_evidence_needed),
        ]),
      };
    });
    const base = {
      target_ref: targetRef,
      target_version_id: owner.board.board_version_id,
      input_snapshot_ref: inputSnapshotRef,
      input_snapshot_hash: sha256Text(stableStringify({
        intake_snapshot_hash: owner.snapshot.intake_snapshot_hash,
        motive_version_id: owner.version.core_motive_version_id,
        board_version_id: owner.board.board_version_id,
      })),
      source_refs: sourceRefs,
      source_hashes: sourceHashes,
      source_context_packets: sourceContextPackets,
      secondary_route_candidate_refs: [],
      preflight_blocker_codes: [],
    };
    return {
      [PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID]: {
        ...base,
        model_profile_id: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_PROFILE_ID,
      },
      [PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID]: {
        ...base,
        model_profile_id: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_PROFILE_ID,
      },
      [PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID]: {
        ...base,
        model_profile_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID,
      },
      [PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID]: {
        ...base,
        model_profile_id: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID,
        secondary_validation_cycle_refs: [],
        secondary_feasibility_probe_refs: [],
        secondary_experiment_plan_light_refs: [],
      },
    };
  }

  private async readSelectedCycleProposal(
    owner: OwnerContext,
    run: PaperImplementationCoordinatorRunWithSteps,
  ): Promise<{
    artifact: PaperImplementationRuntimeArtifactEnvelope;
    candidate: PaperImplementationValidationCycleCandidateProposal;
  }> {
    const selectedSteps = run.steps.filter((item) =>
      item.slot_id === PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID && item.outcome === 'passed');
    if (selectedSteps.length !== 1) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `Completed planning run must contain exactly one passed ValidationCycle selection step; found ${selectedSteps.length}.`,
      );
    }
    const step = selectedSteps[0];
    const selectedCandidateKey = step?.decision_record?.selected_candidate_key ?? null;
    const selectedProjection = step?.decision_record?.candidate_projections.find(
      (projection) => projection.candidate_key === selectedCandidateKey,
    ) ?? null;
    if (
      !step?.runtime_artifact_id
      || !step.runtime_artifact_ref
      || !step.runtime_artifact_hash
      || !step.admission_ref
      || !selectedCandidateKey
      || !selectedProjection
      || selectedProjection.blocker_codes.length > 0
      || step.implementation_project_id !== owner.snapshot.implementation_project_id
      || step.coordinator_run_id !== run.run.coordinator_run_id
      || !this.refTargets(
        step.admission_ref,
        'paper_implementation_runtime_admission_record',
        step.admission_ref.ref_id,
        owner.snapshot.title_card_id,
        true,
      )
    ) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Completed planning run has no admitted selected ValidationCycle proposal.');
    }
    const artifact = await this.options.runtimeRepository.findRuntimeArtifactById(
      owner.snapshot.implementation_project_id,
      step.runtime_artifact_id,
    );
    if (
      !artifact
      || artifact.implementation_project_id !== owner.snapshot.implementation_project_id
      || artifact.runtime_artifact_id !== step.runtime_artifact_id
      || artifact.slot_id !== PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID
      || artifact.workflow_type !== 'validation_cycle_planning'
      || artifact.artifact_scope !== 'final'
      || artifact.runtime_status !== 'passed'
      || artifact.run_mode !== run.run.run_mode
      || artifact.execution_mode !== run.run.execution_mode
      || artifact.model_profile_id !== PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID
      || !this.sameRef(
        step.runtime_artifact_ref,
        artifact.final_artifact_ref ?? artifact.artifact_payload_ref,
      )
      || !this.sameRef(
        artifact.target_ref,
        this.ref('motive_evidence_board', owner.board.board_version_id, owner),
      )
      || artifact.target_version_id !== owner.board.board_version_id
      || sha256Text(stableStringify(artifact.artifact_payload)) !== artifact.artifact_payload_hash
      || (artifact.final_artifact_hash ?? artifact.artifact_payload_hash) !== step.runtime_artifact_hash
    ) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Selected validation-planning artifact is missing or hash-drifted.');
    }
    const payload = artifact.artifact_payload as unknown as PaperImplementationValidationCyclePlanningArtifact;
    const candidate = Array.isArray(payload.cycle_candidate_proposals)
      ? payload.cycle_candidate_proposals.find((item) => item.candidate_key === selectedCandidateKey) ?? null
      : null;
    if (
      payload.status !== 'passed'
      || payload.slot_id !== PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID
      || payload.workflow_type !== 'validation_cycle_planning'
      || payload.source_hash_bundle_hash !== artifact.source_hash_bundle_hash
      || !this.sameRef(payload.target_ref, this.ref('motive_evidence_board', owner.board.board_version_id, owner))
      || !candidate
      || candidate.blocker_codes.length > 0
      || !this.sameRef(candidate.target_ref, this.ref('motive_evidence_board', owner.board.board_version_id, owner))
      || candidate.assertion_refs_under_test.length === 0
      || candidate.assertion_refs_under_test.some((ref) =>
        !this.refTargets(
          ref,
          'motive_assertion',
          ref.ref_id,
          owner.snapshot.title_card_id,
          false,
        )
        || !owner.assertions.some((assertion) => assertion.assertion_id === ref.ref_id))
    ) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Selected ValidationCycle proposal is blocked or owner-drifted.');
    }
    return { artifact, candidate };
  }

  private async ensureCycle(
    owner: OwnerContext,
    artifact: PaperImplementationRuntimeArtifactEnvelope,
    candidate: PaperImplementationValidationCycleCandidateProposal,
  ): Promise<{
    cycle: ValidationCycle;
    cycleCreated: boolean;
    traceCreated: boolean;
    traceManifestId: string;
    blocker: PaperImplementationValidationCycleHandoffBlocker | null;
  }> {
    const identity = stableStringify({
      project: owner.snapshot.implementation_project_id,
      board: owner.board.board_version_id,
      artifact_hash: artifact.final_artifact_hash ?? artifact.artifact_payload_hash,
      candidate_key: candidate.candidate_key,
    });
    const cycleId = this.id('validation_cycle', identity);
    const inputSnapshotId = this.id('validation_input_snapshot', identity);
    const traceManifestId = this.id('trace_manifest', `validation-cycle:${identity}`);
    const gateResultId = this.id('validation_gate_result', identity);
    const artifactRef = this.ref(
      'paper_implementation_runtime_artifact',
      artifact.runtime_artifact_id,
      owner,
      artifact.final_artifact_hash ?? artifact.artifact_payload_hash,
    );
    const competingCycle = (await this.options.validationRepository.listValidationCyclesByOwnerScope(
      owner.snapshot.implementation_project_id,
      this.ownerCycleQuery(owner, [...ACTIVE_CYCLE_STATUSES], 2),
    )).find((item) => item.validation_cycle_id !== cycleId);
    if (competingCycle) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `ValidationCycle ${competingCycle.validation_cycle_id} already owns the current motive continuation.`,
      );
    }
    const request: CreateValidationCycleDraftRequest = {
      validation_cycle_id: cycleId,
      target: {
        target_type: 'motive_evidence_board',
        target_id: owner.board.board_version_id,
        target_version_id: owner.board.board_version_id,
      },
      trigger: {
        trigger_type: 'scheduled_review',
        trigger_refs: [this.ref('motive_evidence_board', owner.board.board_version_id, owner)],
      },
      cycle_type: candidate.cycle_type,
      validation_frame: {
        validation_question: candidate.validation_question,
        assumptions_under_test: candidate.assumptions_under_test,
        assertions_under_test: candidate.assertion_refs_under_test.map((assertionRef) =>
          this.ref('motive_assertion', assertionRef.ref_id, owner)),
        decision_if_pass: candidate.decision_if_pass,
        decision_if_fail: candidate.decision_if_fail,
        decision_if_inconclusive: candidate.decision_if_inconclusive,
        expected_information_gain: candidate.expected_information_gain,
        why_this_cycle_now: candidate.target_frame_summary,
      },
      context: {
        input_snapshot_id: inputSnapshotId,
        context_policy_version_id: HANDOFF_POLICY_VERSION,
        included_refs: {
          motive_version_refs: [this.ref('core_motive_version', owner.version.core_motive_version_id, owner, String(owner.version.version_number))],
          board_version_refs: [this.ref('motive_evidence_board_version', owner.board.board_version_id, owner)],
          evidence_refs: this.uniqueRefs(owner.bindings.map((binding) => binding.evidence_ref)),
          route_refs: [],
          work_order_refs: [],
          result_packet_refs: [],
          experiment_plan_light_refs: [],
        },
        excluded_context_notes: [
          'Feasibility planner output remains proposal-only; no WorkOrder or paid execution is authorized here.',
        ],
        input_snapshot_hash: sha256Text(stableStringify({
          owner: owner.board,
          candidate,
          source_artifact_hash: artifact.final_artifact_hash ?? artifact.artifact_payload_hash,
        })),
      },
      criteria: candidate.criteria,
      budget: {
        budget_id: this.id('validation_budget', identity),
        iteration_budget_id: null,
        retry_budget: candidate.budget_envelope.retry_budget,
        max_runtime: candidate.budget_envelope.max_runtime ?? null,
        max_compute: candidate.budget_envelope.max_compute ?? null,
        max_human_review_count: candidate.budget_envelope.max_human_review_count ?? null,
      },
      confirmation_level: 'not_required',
      source_proposal_artifact_ref: artifactRef,
      source_proposal_artifact_hash: artifact.final_artifact_hash ?? artifact.artifact_payload_hash,
      policy_version_id: HANDOFF_POLICY_VERSION,
      created_by: 'system',
    };
    let cycle = await this.options.validationRepository.findValidationCycleById(
      owner.snapshot.implementation_project_id,
      cycleId,
    );
    let cycleCreated = false;
    if (!cycle) {
      try {
        cycle = await this.options.cycleWriter.createValidationCycleDraft(
          owner.snapshot.implementation_project_id,
          request,
        );
        cycleCreated = true;
      } catch (error) {
        if (!(error instanceof AppError) || error.errorCode !== 'VERSION_CONFLICT') throw error;
        cycle = await this.options.validationRepository.findValidationCycleById(
          owner.snapshot.implementation_project_id,
          cycleId,
        );
        if (!cycle) throw error;
      }
    }
    this.assertExpectedCycle(cycle, request, owner);
    if (cycle.lifecycle_status !== 'proposed') {
      this.assertAdmittedCycleLineage(cycle, traceManifestId, gateResultId, owner);
      const trace = await this.readTraceOrConflict(
        owner.snapshot.implementation_project_id,
        traceManifestId,
        `ValidationCycle ${cycle.validation_cycle_id}`,
      );
      if (trace.trace_status !== 'complete') {
        throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Recovered ValidationCycle trace is incomplete.');
      }
      this.assertTraceTarget(
        trace,
        'validation_cycle',
        cycle.validation_cycle_id,
        owner.snapshot,
        `ValidationCycle ${cycle.validation_cycle_id}`,
      );
      return {
        cycle,
        cycleCreated,
        traceCreated: false,
        traceManifestId,
        blocker: null,
      };
    }
    const cycleRef = this.ref('validation_cycle', cycleId, owner, 'v1');
    const trace = await this.options.traceKernel.ensureTraceManifest(
      owner.snapshot.implementation_project_id,
      traceManifestId,
      {
        target_ref: cycleRef,
        lineage: this.cycleTraceLineage(owner, cycleRef, artifactRef),
        created_by: 'system',
      },
    );
    if (trace.manifest.trace_status !== 'complete') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'ValidationCycle admission requires a complete trace manifest.');
    }
    this.assertTraceTarget(
      trace.manifest,
      'validation_cycle',
      cycleId,
      owner.snapshot,
      `ValidationCycle ${cycleId}`,
    );
    try {
      cycle = await this.options.cycleWriter.admitValidationCycle(
        owner.snapshot.implementation_project_id,
        cycleId,
        {
          trace_manifest_id: trace.manifest.trace_manifest_id,
          gate_result_id: gateResultId,
          confirmation_level: 'not_required',
          created_by: 'system',
        },
      );
    } catch (error) {
      if (!(error instanceof AppError) || error.errorCode !== 'GATE_CONSTRAINT_FAILED') throw error;
      const raced = await this.options.validationRepository.findValidationCycleById(
        owner.snapshot.implementation_project_id,
        cycleId,
      );
      if (!raced) throw error;
      if (raced.lifecycle_status === 'proposed') {
        return {
          cycle: raced,
          cycleCreated,
          traceCreated: trace.created,
          traceManifestId: trace.manifest.trace_manifest_id,
          blocker: {
            code: 'VALIDATION_CYCLE_ADMISSION_BLOCKED',
            message: error.message,
            source: 'domain',
            retryable: false,
          },
        };
      }
      cycle = raced;
    }
    this.assertAdmittedCycleLineage(cycle, traceManifestId, gateResultId, owner);
    return {
      cycle,
      cycleCreated,
      traceCreated: trace.created,
      traceManifestId: trace.manifest.trace_manifest_id,
      blocker: null,
    };
  }

  private assertExpectedCycle(
    cycle: ValidationCycle,
    request: CreateValidationCycleDraftRequest,
    owner: OwnerContext,
  ): void {
    const context = request.context;
    const expected = {
      validation_cycle_id: request.validation_cycle_id,
      implementation_project_id: owner.snapshot.implementation_project_id,
      input_snapshot_id: context?.input_snapshot_id,
      target: request.target,
      trigger: request.trigger,
      cycle_type: request.cycle_type,
      validation_frame: request.validation_frame,
      context: {
        implementation_project_id: owner.snapshot.implementation_project_id,
        input_snapshot_id: context?.input_snapshot_id,
        context_policy_version_id: context?.context_policy_version_id,
        included_refs: context?.included_refs,
        excluded_context_notes: context?.excluded_context_notes,
        input_snapshot_hash: context?.input_snapshot_hash,
        created_by: request.created_by,
      },
      criteria: request.criteria,
      budget: request.budget,
      confirmation_level: request.confirmation_level,
      confirmed_by: request.confirmed_by ?? null,
      policy_version_id: request.policy_version_id,
      source_proposal_artifact_ref: request.source_proposal_artifact_ref,
      source_proposal_artifact_hash: request.source_proposal_artifact_hash,
      created_by: request.created_by,
    };
    const actual = {
      validation_cycle_id: cycle.validation_cycle_id,
      implementation_project_id: cycle.implementation_project_id,
      input_snapshot_id: cycle.input_snapshot_id,
      target: cycle.target,
      trigger: cycle.trigger,
      cycle_type: cycle.cycle_type,
      validation_frame: cycle.validation_frame,
      context: {
        implementation_project_id: cycle.context.implementation_project_id,
        input_snapshot_id: cycle.context.input_snapshot_id,
        context_policy_version_id: cycle.context.context_policy_version_id,
        included_refs: cycle.context.included_refs,
        excluded_context_notes: cycle.context.excluded_context_notes,
        input_snapshot_hash: cycle.context.input_snapshot_hash,
        created_by: cycle.context.created_by,
      },
      criteria: cycle.criteria,
      budget: cycle.budget,
      confirmation_level: cycle.confirmation_level,
      confirmed_by: cycle.confirmed_by ?? null,
      policy_version_id: cycle.policy_version_id,
      source_proposal_artifact_ref: cycle.source_proposal_artifact_ref,
      source_proposal_artifact_hash: cycle.source_proposal_artifact_hash,
      created_by: cycle.created_by,
    };
    if (stableStringify(actual) !== stableStringify(expected)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Deterministic ValidationCycle identity is bound to different semantics.');
    }
  }

  private assertAdmittedCycleLineage(
    cycle: ValidationCycle,
    traceManifestId: string,
    gateResultId: string,
    owner: OwnerContext,
  ): void {
    if (
      cycle.trace_manifest_id !== traceManifestId
      || cycle.gate_result_id !== gateResultId
      || !cycle.trace_manifest_ref
      || !this.refTargets(
        cycle.trace_manifest_ref,
        'trace_manifest',
        traceManifestId,
        owner.snapshot.title_card_id,
        false,
      )
    ) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Recovered ValidationCycle admission lineage is not deterministic.');
    }
  }

  private cycleTraceLineage(
    owner: OwnerContext,
    cycleRef: TopicSelectionFunctionalRef,
    artifactRef: TopicSelectionFunctionalRef,
  ): TraceLineageBundle {
    return {
      literature: {
        literature_evidence_refs: this.uniqueRefs(owner.bindings.map((binding) => binding.evidence_ref)),
        source_locator_refs: this.uniqueRefs(owner.boardTraces.flatMap((trace) => trace.lineage.literature.source_locator_refs)),
        citation_candidate_refs: this.uniqueRefs(owner.boardTraces.flatMap((trace) => trace.lineage.literature.citation_candidate_refs)),
      },
      experiment: {
        experiment_plan_refs: [], work_order_refs: [], run_refs: [], run_evidence_refs: [],
        result_packet_refs: [], metric_refs: [],
      },
      artifact: {
        dataset_refs: [], baseline_refs: [], code_version_refs: [],
        model_checkpoint_refs: [], config_refs: [], log_artifact_refs: [],
      },
      decision: {
        validation_cycle_refs: [cycleRef],
        motive_evolution_decision_refs: [],
        gate_result_refs: [],
        human_decision_refs: [],
        accepted_risk_refs: owner.state.accepted_risk_refs,
      },
      internal_interpretation: {
        result_interpretation_refs: [],
        llm_rationale_refs: [artifactRef],
        board_summary_refs: [this.ref('motive_evidence_board', owner.board.board_version_id, owner)],
        non_citable_refs: [],
      },
    };
  }

  private ownerCycleQuery(
    owner: OwnerContext,
    lifecycleStatuses: ValidationCycle['lifecycle_status'][],
    limit: number,
  ): ValidationCycleOwnerScopeQuery {
    return {
      board_version_id: owner.board.board_version_id,
      core_motive_version_id: owner.version.core_motive_version_id,
      assertion_ids: owner.assertions.map((assertion) => assertion.assertion_id),
      lifecycle_statuses: lifecycleStatuses,
      limit,
    };
  }

  private assertTraceTarget(
    trace: TraceManifest,
    targetType: string,
    targetId: string,
    snapshot: ImplementationIntakeSnapshot,
    label: string,
  ): void {
    if (
      trace.implementation_project_id !== snapshot.implementation_project_id
      || !this.refTargets(trace.target_ref, targetType, targetId, snapshot.title_card_id, false)
    ) {
      throw new AppError(409, 'VERSION_CONFLICT', `${label} trace authority targets a different owner.`);
    }
  }

  private async readTraceOrConflict(
    implementationProjectId: string,
    traceManifestId: string,
    label: string,
  ): Promise<TraceManifest> {
    try {
      return await this.options.traceKernel.getTraceManifest(
        implementationProjectId,
        traceManifestId,
      );
    } catch (error) {
      if (error instanceof AppError && error.errorCode === 'NOT_FOUND') {
        throw new AppError(409, 'VERSION_CONFLICT', `${label} references missing trace authority.`);
      }
      throw error;
    }
  }

  private success(
    owner: OwnerContext,
    state: ResponseState,
    created: boolean,
  ): PaperImplementationValidationCycleHandoffResponse {
    const cycle = state.cycle;
    if (!cycle) throw new AppError(500, 'INTERNAL_ERROR', 'ValidationCycle success response requires a cycle.');
    return this.response(owner, state, {
      status: created ? 'created' : 'resumed',
      semanticStage: 'validation_cycle_ready',
      blocker: null,
      action: 'continue_experiment_specification',
      description: 'Continue with experiment asset selection and specification; no paid execution was authorized here.',
      requiresHumanConfirmation: false,
    });
  }

  private ownerBlocked(
    implementationProjectId: string,
    error: AppError,
  ): PaperImplementationValidationCycleHandoffResponse {
    const notFound = error.errorCode === 'NOT_FOUND';
    return {
      schema_version: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_HANDOFF_SCHEMA_VERSION,
      status: 'blocked',
      semantic_stage: 'owner_resolution',
      effects: { performed: [], reused: [] },
      next_action: {
        action: 'resolve_blocker',
        description: error.message,
        requires_human_confirmation: false,
      },
      blocker: {
        code: notFound
          ? 'VALIDATION_CYCLE_OWNER_NOT_FOUND'
          : 'VALIDATION_CYCLE_OWNER_NOT_ELIGIBLE',
        message: error.message,
        source: 'owner_state',
        retryable: !notFound,
      },
      semantic_context: {
        admitted_core_motive: null,
        evidence_board: null,
        validation_cycle: null,
      },
      lineage: {
        implementation_project_id: implementationProjectId,
        intake_snapshot_id: null,
        motive_id: null,
        core_motive_version_id: null,
        assertion_ids: [],
        board_version_id: null,
        evidence_binding_ids: [],
        coordinator_run_id: null,
        validation_planning_runtime_artifact_id: null,
        selected_candidate_key: null,
        validation_cycle_id: null,
        validation_input_snapshot_id: null,
        trace_manifest_id: null,
        admission_gate_result_id: null,
      },
      resume_policy: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_HANDOFF_RESUME_POLICY,
    };
  }

  private blocked(
    owner: OwnerContext,
    state: ResponseState,
    semanticStage: 'validation_planning' | 'cycle_write',
    status: PaperImplementationValidationCycleHandoffResponse['status'],
    blocker: PaperImplementationValidationCycleHandoffBlocker,
  ): PaperImplementationValidationCycleHandoffResponse {
    const action = status === 'waiting_for_llm'
      ? 'configure_llm'
      : status === 'waiting_for_human_confirmation'
        ? 'provide_human_confirmation'
        : blocker.retryable
          ? 'repeat_handoff'
          : 'resolve_blocker';
    return this.response(owner, state, {
      status,
      semanticStage,
      blocker,
      action,
      description: blocker.message,
      requiresHumanConfirmation: status === 'waiting_for_human_confirmation',
    });
  }

  private response(
    owner: OwnerContext,
    state: ResponseState,
    outcome: {
      status: PaperImplementationValidationCycleHandoffResponse['status'];
      semanticStage: PaperImplementationValidationCycleHandoffResponse['semantic_stage'];
      blocker: PaperImplementationValidationCycleHandoffBlocker | null;
      action: PaperImplementationValidationCycleHandoffResponse['next_action']['action'];
      description: string;
      requiresHumanConfirmation: boolean;
    },
  ): PaperImplementationValidationCycleHandoffResponse {
    const cycle = state.cycle;
    return {
      schema_version: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_HANDOFF_SCHEMA_VERSION,
      status: outcome.status,
      semantic_stage: outcome.semanticStage,
      effects: { performed: state.performed, reused: state.reused },
      next_action: {
        action: outcome.action,
        description: outcome.description,
        requires_human_confirmation: outcome.requiresHumanConfirmation,
      },
      blocker: outcome.blocker,
      semantic_context: {
        admitted_core_motive: {
          short_name: owner.version.motive_contract.short_name,
          required_assertion_count: owner.requiredAssertions.length,
        },
        evidence_board: {
          support_state: owner.board.board_state.support_state,
          challenge_status: owner.board.board_state.challenge_status,
          binding_count: owner.bindings.length,
        },
        validation_cycle: cycle ? {
          lifecycle_status: cycle.lifecycle_status,
          cycle_type: cycle.cycle_type,
          validation_question: cycle.validation_frame.validation_question,
          expected_information_gain: cycle.validation_frame.expected_information_gain,
          assertion_count: cycle.validation_frame.assertions_under_test.length,
        } : null,
      },
      lineage: {
        implementation_project_id: owner.snapshot.implementation_project_id,
        intake_snapshot_id: owner.snapshot.intake_snapshot_id,
        motive_id: owner.motive.motive_id,
        core_motive_version_id: owner.version.core_motive_version_id,
        assertion_ids: owner.assertions.map((assertion) => assertion.assertion_id),
        board_version_id: owner.board.board_version_id,
        evidence_binding_ids: owner.bindings.map((binding) => binding.binding_id),
        coordinator_run_id: state.coordinatorRunId,
        validation_planning_runtime_artifact_id: state.validationArtifactId,
        selected_candidate_key: state.selectedCandidateKey,
        validation_cycle_id: cycle?.validation_cycle_id ?? null,
        validation_input_snapshot_id: cycle?.input_snapshot_id ?? null,
        trace_manifest_id: cycle?.trace_manifest_id ?? state.traceManifestId,
        admission_gate_result_id: cycle?.gate_result_id ?? null,
      },
      resume_policy: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_HANDOFF_RESUME_POLICY,
    };
  }

  private effect(state: ResponseState, effect: PaperImplementationValidationCycleHandoffEffect, performed: boolean): void {
    const target = performed ? state.performed : state.reused;
    if (!target.includes(effect)) target.push(effect);
  }

  private ref(
    refType: string,
    refId: string,
    owner: OwnerContext,
    versionId?: string | null,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      title_card_id: owner.snapshot.title_card_id,
      ...(versionId ? { version_id: versionId } : {}),
    };
  }

  private id(prefix: string, seed: string): string {
    return `${prefix}_${sha256Text(seed).slice(0, 32)}`;
  }

  private sameRef(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
    return this.normalizedRefType(left.ref_type) === this.normalizedRefType(right.ref_type)
      && left.ref_id === right.ref_id
      && (left.version_id ?? null) === (right.version_id ?? null)
      && (left.title_card_id ?? null) === (right.title_card_id ?? null);
  }

  private refTargets(
    ref: TopicSelectionFunctionalRef,
    refType: string,
    refId: string,
    titleCardId: string,
    allowNullTitleCard: boolean,
  ): boolean {
    return this.normalizedRefType(ref.ref_type) === this.normalizedRefType(refType)
      && ref.ref_id === refId
      && (
        ref.title_card_id === titleCardId
        || (allowNullTitleCard && (ref.title_card_id ?? null) === null)
      );
  }

  private normalizedRefType(refType: string): string {
    return refType.replaceAll('_', '').toLowerCase();
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const byKey = new Map(refs.map((ref) => [stableStringify(ref), ref]));
    return [...byKey.values()];
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.filter((value) => value.trim().length > 0))];
  }
}
