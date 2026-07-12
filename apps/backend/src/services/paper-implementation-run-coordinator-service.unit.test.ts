import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPER_IMPLEMENTATION_RUNTIME_ADMISSION_RECORD_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_RISK_DIMENSIONS,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
  type PaperImplementationCrossBoardScenarioProposal,
  type PaperImplementationCrossBoardSynthesisRoleOutput,
  type PaperImplementationEvidenceBoardCurationRoleOutput,
  type PaperImplementationFeasibilityPlanningRoleOutput,
  type PaperImplementationFeasibilityProbePlanCandidateProposal,
  type PaperImplementationMotiveDecompositionRoleOutput,
  type PaperImplementationMotiveEvolutionOptionDesignerRoleOutput,
  type PaperImplementationMotiveEvolutionRiskChallengerRoleOutput,
  type PaperImplementationRouteCandidateProposal,
  type PaperImplementationRoutePlanningRoleOutput,
  type PaperImplementationRouteSkepticDisposition,
  type PaperImplementationRuntimeAdmissionRecord,
  type PaperImplementationValidationCycleCandidateProposal,
  type PaperImplementationValidationCyclePlanningRoleOutput,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  PaperImplementationCoordinatorLaneId,
  PaperImplementationCoordinatorRun,
  PaperImplementationCoordinatorStep,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-coordinator-contracts';
import type {
  ImplementationProject,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  TraceLineageBundle,
  TraceManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationAiWorkflowHarnessRepository } from '../repositories/in-memory-paper-implementation-ai-workflow-harness-repository.js';
import { InMemoryPaperImplementationMotiveRepository } from '../repositories/in-memory-paper-implementation-motive-repository.js';
import { InMemoryPaperImplementationRepository } from '../repositories/in-memory-paper-implementation-repository.js';
import { InMemoryPaperImplementationRuntimeRepository } from '../repositories/in-memory-paper-implementation-runtime-repository.js';
import { InMemoryPaperImplementationTraceRepository } from '../repositories/in-memory-paper-implementation-trace-repository.js';
import { InMemoryPaperImplementationValidationRepository } from '../repositories/in-memory-paper-implementation-validation-repository.js';
import {
  InMemoryPaperImplementationCoordinatorRepository,
} from '../repositories/in-memory-paper-implementation-coordinator-repository.js';
import type {
  PaperImplementationCoordinatorRepository,
} from '../repositories/paper-implementation-coordinator.repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import { PaperImplementationRoutePlanningRuntimeService } from './paper-implementation-route-planning-runtime-service.js';
import {
  PaperImplementationValidationCyclePlanningRuntimeService,
} from './paper-implementation-validation-cycle-planning-runtime-service.js';
import {
  PaperImplementationFeasibilityPlanningRuntimeService,
} from './paper-implementation-feasibility-planning-runtime-service.js';
import {
  PaperImplementationMotiveDecompositionRuntimeService,
} from './paper-implementation-motive-decomposition-runtime-service.js';
import {
  PaperImplementationMotiveEvolutionRuntimeService,
} from './paper-implementation-motive-evolution-runtime-service.js';
import {
  PaperImplementationEvidenceBoardCurationRuntimeService,
  type PaperImplementationEvidenceBoardCurationRuntimeResult,
} from './paper-implementation-evidence-board-curation-runtime-service.js';
import type {
  PaperImplementationRoutePlanningRuntimeResult,
} from './paper-implementation-route-planning-runtime-service.js';
import {
  buildPaperImplementationRuntimeOperationalTelemetry,
} from './paper-implementation-runtime-operational-telemetry.js';
import {
  PaperImplementationCrossBoardSynthesisRuntimeService,
} from './paper-implementation-cross-board-synthesis-runtime-service.js';
import {
  classifyPaperImplementationCoordinatorBlockedStep,
  PaperImplementationRunCoordinatorService,
  selectPaperImplementationCandidateV1,
  type PaperImplementationRunCoordinatorServiceOptions,
} from './paper-implementation-run-coordinator-service.js';
import {
  PaperImplementationValidationCyclePlanningService,
} from './paper-implementation-validation-cycle-planning-service.js';
import type {
  TopicSelectionAgentInvocationResult,
} from './topic-selection-agent-orchestrator-service.js';

const PROJECT_ID = 'implementation_project_run_coordinator_001';
const TITLE_CARD_ID = 'title_card_run_coordinator_001';
const NOW = '2026-07-11T10:00:00.000Z';
const ROUTE_CANDIDATE_KEY = 'exploratory_route_candidate';
const CYCLE_CANDIDATE_KEY = 'exploratory_cycle_candidate';

interface StubInvocationInput<T> {
  node_id: string;
  workflow_run_id: string;
  node_attempt_id: string;
  invocation_attempt_id?: string | null;
  execution_mode: string;
  executor_kind: string;
  run_mode: string;
  profile_id: string;
  output_contract: string;
  prompt: { promptTemplateId: string; version: string };
  schema_name: string;
  messages: Array<{ role: string; content: string }>;
  mocked_output?: { output: T } | null;
}

/**
 * Fixture-echo orchestrator: returns the request's mocked_output with
 * provenance echoing the invocation input (so provenance-drift checks pass),
 * and rewrites the motive-evolution challenger echo from the prior designer
 * role artifact material embedded in the user message — mirroring the
 * behavior of the provider-level StubMotiveEvolutionGateway used by the
 * runtime routes integration suite.
 */
class MockedFixtureAgentOrchestrator {
  readonly calls: Array<{ node_id: string }> = [];
  /** Full invocation inputs (B3: lets tests assert the built slot request context). */
  readonly invocations: StubInvocationInput<unknown>[] = [];
  /** Test hook run at the start of every invocation (e.g. lease takeover). */
  onInvoke: (() => Promise<void>) | null = null;

  async invokeStructuredOutput<T>(
    input: StubInvocationInput<T>,
  ): Promise<TopicSelectionAgentInvocationResult<T>> {
    if (this.onInvoke) {
      await this.onInvoke();
    }
    this.calls.push({ node_id: input.node_id });
    this.invocations.push(input as StubInvocationInput<unknown>);
    const fixtureOutput = input.mocked_output?.output ?? null;
    if (fixtureOutput === null) {
      throw new Error(`Coordinator test orchestrator requires mocked_output for ${input.node_id}.`);
    }
    let output: T = fixtureOutput;
    if (input.node_id === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID) {
      const prior = priorDesignerMaterial(input.messages);
      if (prior) {
        output = {
          ...(fixtureOutput as Record<string, unknown>),
          designer_role_artifact_ref: prior.artifact_ref,
          designer_role_artifact_hash: prior.artifact_hash,
          option_set_hash: prior.option_set_hash,
        } as T;
      }
    }
    const outputHash = hash(output);
    const provenance = {
      workflow_run_id: input.workflow_run_id,
      node_id: input.node_id,
      node_attempt_id: input.node_attempt_id,
      invocation_attempt_id: input.invocation_attempt_id ?? `${input.node_attempt_id}.call-1`,
      execution_mode: input.execution_mode,
      executor_kind: input.executor_kind,
      source_kind: 'mock_fixture',
      non_provider: true,
      run_mode: input.run_mode,
      profile_id: input.profile_id,
      profile_version: 'v1',
      profile_hash: hash(input.profile_id),
      model_option_id: null,
      normalized_params_hash: null,
      capability_degraded: false,
      capability_degrade_reason: null,
      output_contract: input.output_contract,
      prompt_template_id: input.prompt.promptTemplateId,
      prompt_template_version: input.prompt.version,
      schema_name: input.schema_name,
      prompt_packet_hash: hash(`prompt:${input.node_attempt_id}`),
      prompt_packet_cache_status: 'not_applicable',
      prompt_packet_cache_result_ref: null,
      prompt_packet_cache_result_hash: null,
      response_hash: outputHash,
      structured_output_hash: outputHash,
      cache_status: 'not_applicable',
      response_reuse_ref: null,
      telemetry: null,
    };
    const validation = { valid: true, error_count: 0, errors: [] };
    const tokenBudgetGateResult = {
      provider_id: null,
      model_id: null,
      profile_id: input.profile_id,
      model_option_id: null,
      estimated_input_tokens: 1200,
      estimated_output_tokens: 2400,
      context_window_tokens: 128000,
      schema_overhead_tokens: 1200,
      decision: 'within_budget',
      compression_strategy_ref: {
        ref_type: 'compression_strategy',
        ref_id: `${input.node_id}.context-compression`,
        title_card_id: null,
        version_id: null,
      },
      blocker_codes: [],
      warning_codes: [],
    };
    return {
      schema_version: 'v1',
      node_id: input.node_id,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      status: 'succeeded',
      structured_output: output,
      provenance,
      validation,
      token_budget_gate_result: tokenBudgetGateResult,
      warning_codes: [],
      blocker_codes: [],
      error_code: null,
      audit_snapshot: {
        schema_version: 'topic-selection-agent-invocation-audit-v1',
        node_id: input.node_id,
        workflow_run_id: input.workflow_run_id,
        node_attempt_id: input.node_attempt_id,
        status: 'succeeded',
        provenance,
        token_budget_gate_result: tokenBudgetGateResult,
        validation,
        warning_codes: [],
        blocker_codes: [],
        error_code: null,
        created_at: NOW,
      },
      created_at: NOW,
      audit_artifact_ref: null,
    } as unknown as TopicSelectionAgentInvocationResult<T>;
  }
}

function priorDesignerMaterial(
  messages: Array<{ role: string; content: string }>,
): { artifact_ref: TopicSelectionFunctionalRef; artifact_hash: string; option_set_hash: string } | null {
  const userMessage = messages.find((message) => message.role === 'user')?.content;
  if (!userMessage) {
    return null;
  }
  try {
    const parsed = JSON.parse(userMessage) as {
      prior_role_artifacts?: Array<{
        artifact_ref?: TopicSelectionFunctionalRef;
        artifact_hash?: string;
        option_set_hash?: string | null;
      }>;
    };
    const prior = parsed.prior_role_artifacts?.[0];
    if (!prior?.artifact_ref || !prior.artifact_hash || !prior.option_set_hash) {
      return null;
    }
    return {
      artifact_ref: prior.artifact_ref,
      artifact_hash: prior.artifact_hash,
      option_set_hash: prior.option_set_hash,
    };
  } catch {
    return null;
  }
}

class CrashOnceCoordinatorRepository implements PaperImplementationCoordinatorRepository {
  updateCalls = 0;
  crashed = false;

  constructor(
    private readonly inner: PaperImplementationCoordinatorRepository,
    private readonly crashOnUpdateCall: number,
  ) {}

  createCoordinatorRun: PaperImplementationCoordinatorRepository['createCoordinatorRun'] =
    (run) => this.inner.createCoordinatorRun(run);

  findCoordinatorRunById: PaperImplementationCoordinatorRepository['findCoordinatorRunById'] =
    (projectId, runId) => this.inner.findCoordinatorRunById(projectId, runId);

  // R6: the wrapper must forward `options` — dropping it would silently
  // strip the holder fence from every guarded write under test.
  updateCoordinatorRun: PaperImplementationCoordinatorRepository['updateCoordinatorRun'] = (run, options) => {
    this.updateCalls += 1;
    if (!this.crashed && this.updateCalls === this.crashOnUpdateCall) {
      this.crashed = true;
      throw new Error('simulated coordinator crash');
    }
    return this.inner.updateCoordinatorRun(run, options);
  };

  acquireCoordinatorRunLease: PaperImplementationCoordinatorRepository['acquireCoordinatorRunLease'] =
    (projectId, runId, lease, now) => this.inner.acquireCoordinatorRunLease(projectId, runId, lease, now);

  createCoordinatorStep: PaperImplementationCoordinatorRepository['createCoordinatorStep'] =
    (step) => this.inner.createCoordinatorStep(step);

  listCoordinatorSteps: PaperImplementationCoordinatorRepository['listCoordinatorSteps'] =
    (projectId, runId) => this.inner.listCoordinatorSteps(projectId, runId);
}

test('coordinator lane A single advance completes with chained artifact lineage', async () => {
  const fixture = coordinatorFixture();
  const run = await fixture.coordinator.createCoordinatorRun(PROJECT_ID, laneACreateRequest());
  assert.equal(run.run_status, 'created');

  const advanced = await fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_lane_a',
  });

  assert.equal(advanced.run.run_status, 'completed');
  assert.equal(advanced.run.lease, null);
  assert.equal(advanced.run.consumed.steps, 4);
  assert.equal(advanced.run.consumed.provider_calls, 0);
  assert.equal(advanced.steps.length, 4);
  assert.deepEqual(advanced.steps.map((step) => step.outcome), ['passed', 'passed', 'passed', 'passed']);
  assert.deepEqual(advanced.steps.map((step) => step.slot_id), [
    PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
    PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
    PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
    PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
  ]);
  for (const step of advanced.steps) {
    assert.ok(step.runtime_artifact_ref);
    assert.ok(step.runtime_artifact_hash);
    assert.ok(step.admission_ref);
  }
  assert.equal(advanced.steps[0]?.decision_record?.selected_candidate_key, ROUTE_CANDIDATE_KEY);
  assert.equal(advanced.steps[2]?.decision_record?.selected_candidate_key, CYCLE_CANDIDATE_KEY);

  // Chained lineage: every downstream final artifact echoes the admitted
  // upstream final artifact hash the coordinator injected from step records.
  const skepticFinal = await fixture.finalArtifactPayload(PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID);
  assert.equal(skepticFinal.reviewed_route_proposal_hash, advanced.steps[0]?.runtime_artifact_hash);
  assert.deepEqual(skepticFinal.reviewed_candidate_keys, [ROUTE_CANDIDATE_KEY]);
  const cycleFinal = await fixture.finalArtifactPayload(PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID);
  assert.equal(cycleFinal.reviewed_route_proposal_hash, advanced.steps[0]?.runtime_artifact_hash);
  assert.equal(cycleFinal.reviewed_route_skeptic_artifact_hash, advanced.steps[1]?.runtime_artifact_hash);
  const feasibilityFinal = await fixture.finalArtifactPayload(PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID);
  assert.equal(feasibilityFinal.reviewed_validation_cycle_artifact_hash, advanced.steps[2]?.runtime_artifact_hash);
  assert.equal(feasibilityFinal.reviewed_route_proposal_hash, advanced.steps[0]?.runtime_artifact_hash);
  assert.equal(feasibilityFinal.reviewed_route_skeptic_artifact_hash, advanced.steps[1]?.runtime_artifact_hash);
  assert.deepEqual(feasibilityFinal.reviewed_cycle_candidate_keys, [CYCLE_CANDIDATE_KEY]);
  assert.deepEqual(feasibilityFinal.reviewed_route_candidate_keys, [ROUTE_CANDIDATE_KEY]);

  const fetched = await fixture.coordinator.getCoordinatorRun(PROJECT_ID, run.coordinator_run_id);
  assert.equal(fetched.run.run_status, 'completed');
  assert.equal(fetched.steps.length, 4);
});

test('coordinator lane A consumption steps receive the admitted upstream proposal bodies as source_context_packets (S2-B B3)', async () => {
  // gs001-lora-live-001/003 root cause: skeptic/cycle/feasibility only got the
  // admitted upstream ref+hash — the proposal body was not inspectable and the
  // skeptic honestly rejected with BLOCK_PRIMARY_ROUTE_ARTIFACT_BODY_UNAVAILABLE-
  // class blockers. The coordinator now transcribes the admitted final artifact
  // proposal payload into each consuming slot request.
  const fixture = coordinatorFixture();
  const run = await fixture.coordinator.createCoordinatorRun(PROJECT_ID, laneACreateRequest());
  const advanced = await fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_lane_a_b3',
  });
  assert.equal(advanced.run.run_status, 'completed');
  const stepByIndex = new Map(advanced.steps.map((step) => [step.step_index, step]));

  interface UpstreamPacket {
    source_ref?: { ref_type?: string; ref_id?: string };
    evidence_kind?: string;
    content_summary?: string;
    key_facts?: string[];
  }
  const upstreamPacketsFor = (roleSlotId: string): UpstreamPacket[] => {
    const invocation = fixture.orchestrator.invocations.find((input) => input.node_id === roleSlotId);
    assert.ok(invocation, `expected an orchestrator invocation for ${roleSlotId}`);
    const userMessage = invocation!.messages.find((message) => message.role === 'user')?.content ?? '{}';
    const parsed = JSON.parse(userMessage) as { source_context_packets?: UpstreamPacket[] };
    return (parsed.source_context_packets ?? [])
      .filter((packet) => packet.evidence_kind === 'admitted_upstream_runtime_artifact');
  };
  const packetBody = (packet: UpstreamPacket | undefined): Record<string, unknown> =>
    JSON.parse(packet?.key_facts?.[0] ?? '{}') as Record<string, unknown>;

  // Skeptic (step 1) consumes the route proposal body of step 0.
  const skepticPackets = upstreamPacketsFor(PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID);
  assert.equal(skepticPackets.length, 1);
  assert.equal(skepticPackets[0]?.source_ref?.ref_id, stepByIndex.get(0)?.runtime_artifact_ref?.ref_id);
  assert.ok(skepticPackets[0]?.content_summary?.includes(stepByIndex.get(0)?.runtime_artifact_hash ?? 'missing'));
  const skepticBody = packetBody(skepticPackets[0]);
  const routeProposals = skepticBody.route_candidate_proposals as Array<{ candidate_key?: string }> | undefined;
  assert.ok(
    Array.isArray(routeProposals)
      && routeProposals.some((proposal) => proposal.candidate_key === ROUTE_CANDIDATE_KEY),
    'skeptic packet must carry the verbatim upstream route candidate proposals',
  );

  // Cycle planning (step 2) consumes steps 0 and 1.
  const cyclePackets = upstreamPacketsFor(PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID);
  assert.equal(cyclePackets.length, 2);
  assert.deepEqual(
    cyclePackets.map((packet) => packet.source_ref?.ref_id),
    [0, 1].map((index) => stepByIndex.get(index)?.runtime_artifact_ref?.ref_id),
  );
  assert.ok('recommended_disposition' in packetBody(cyclePackets[1]));

  // Feasibility (step 3) consumes steps 0, 1, and 2 — including the cycle
  // proposal body.
  const feasibilityPackets = upstreamPacketsFor(PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID);
  assert.equal(feasibilityPackets.length, 3);
  assert.deepEqual(
    feasibilityPackets.map((packet) => packet.source_ref?.ref_id),
    [0, 1, 2].map((index) => stepByIndex.get(index)?.runtime_artifact_ref?.ref_id),
  );
  const cycleBody = packetBody(feasibilityPackets[2]);
  const cycleProposals = cycleBody.cycle_candidate_proposals as Array<{ candidate_key?: string }> | undefined;
  assert.ok(
    Array.isArray(cycleProposals)
      && cycleProposals.some((proposal) => proposal.candidate_key === CYCLE_CANDIDATE_KEY),
    'feasibility packet must carry the verbatim upstream cycle candidate proposals',
  );
});

test('coordinator skeptic non-proceed parks the run as waiting_review and override re-advance resumes', async () => {
  const fixture = coordinatorFixture();
  const run = await fixture.coordinator.createCoordinatorRun(PROJECT_ID, laneACreateRequest({
    skepticDisposition: 'revise',
  }));

  const parked = await fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_waiting_review',
  });
  assert.equal(parked.run.run_status, 'waiting_review');
  assert.equal(parked.run.lease, null);
  assert.equal(parked.steps.length, 2);
  assert.equal(parked.steps[1]?.outcome, 'waiting_review');
  assert.equal(parked.steps[1]?.slot_id, PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID);

  // Human override: rebuild the skeptic payload with a proceed fixture and
  // re-advance — the same slot runs a new attempt and the chain resumes.
  const resumed = await fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_waiting_review_override',
    slot_request_payload_overrides: {
      [PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID]: routeSkepticPayload('proceed'),
    },
  });
  assert.equal(resumed.run.run_status, 'completed');
  assert.equal(resumed.steps.length, 5);
  const skepticAttempts = resumed.steps.filter(
    (step) => step.slot_id === PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
  );
  assert.equal(skepticAttempts.length, 2);
  assert.deepEqual(skepticAttempts.map((step) => step.outcome), ['waiting_review', 'passed']);
  assert.notEqual(skepticAttempts[0]?.node_attempt_id, skepticAttempts[1]?.node_attempt_id);
});

test('coordinator concurrent double advance executes once and rejects the loser with 409', async () => {
  const fixture = coordinatorFixture();
  const run = await fixture.coordinator.createCoordinatorRun(PROJECT_ID, laneACreateRequest());

  const [first, second] = await Promise.allSettled([
    fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, { holder_id: 'holder_one' }),
    fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, { holder_id: 'holder_two' }),
  ]);

  const fulfilled = [first, second].filter((entry) => entry.status === 'fulfilled');
  const rejected = [first, second].filter((entry) => entry.status === 'rejected');
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  const rejection = (rejected[0] as PromiseRejectedResult).reason as unknown;
  assert.ok(rejection instanceof AppError);
  assert.equal(rejection.statusCode, 409);
  assert.equal(rejection.errorCode, 'CONCURRENT_ADVANCE');

  const winner = (fulfilled[0] as PromiseFulfilledResult<{ run: PaperImplementationCoordinatorRun; steps: PaperImplementationCoordinatorStep[] }>).value;
  assert.equal(winner.run.run_status, 'completed');
  assert.equal(winner.steps.length, 4);
  const architectureArtifacts = await fixture.runtimeRepository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
  });
  // Single execution: one role + one final artifact — no duplicated slot run.
  assert.equal(architectureArtifacts.length, 2);
});

test('coordinator crash re-advance resumes from the breakpoint without duplicate steps or artifacts', async () => {
  const fixture = coordinatorFixture();
  // Crash on the run-state update after the third persisted step: steps 0..2
  // are durable, the run stays advancing. Update calls per executed step are
  // pre-slot heartbeat + pre-persistStep heartbeat (R5) + post-step counter
  // write, so the post-step write of step 2 is the ninth update call.
  const crashRepository = new CrashOnceCoordinatorRepository(fixture.coordinatorRepository, 9);
  const coordinator = fixture.buildCoordinator(crashRepository);
  const run = await coordinator.createCoordinatorRun(PROJECT_ID, laneACreateRequest());

  await assert.rejects(
    () => coordinator.advance(PROJECT_ID, run.coordinator_run_id, { holder_id: 'holder_crash' }),
    /simulated coordinator crash/,
  );

  const afterCrash = await coordinator.getCoordinatorRun(PROJECT_ID, run.coordinator_run_id);
  assert.equal(afterCrash.run.run_status, 'advancing');
  // R5: the crash path best-effort releases the loser's own lease so the run
  // is not trapped under a live lease until TTL expiry.
  assert.equal(afterCrash.run.lease, null);
  assert.equal(afterCrash.steps.length, 3);
  assert.deepEqual(afterCrash.steps.map((step) => step.outcome), ['passed', 'passed', 'passed']);

  // R5: with the lease released, the re-advance proceeds IMMEDIATELY (no
  // clock advance to expire the lease) and resumes from the breakpoint:
  // only the remaining step runs, no step or artifact repeats.
  const recovered = await coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_recovery',
  });
  assert.equal(recovered.run.run_status, 'completed');
  assert.equal(recovered.steps.length, 4);
  assert.deepEqual(
    [...new Set(recovered.steps.map((step) => step.step_index))].sort(),
    [0, 1, 2, 3],
  );
  assert.equal(
    new Set(recovered.steps.map((step) => step.node_attempt_id)).size,
    recovered.steps.length,
  );
  for (const slotId of [
    PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
    PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
    PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
    PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
  ]) {
    const artifacts = await fixture.runtimeRepository.listRuntimeArtifacts(PROJECT_ID, { slot_id: slotId });
    assert.equal(artifacts.length, 2, `expected exactly one run (role+final) for ${slotId}`);
  }
});

test('coordinator budget exhaustion parks the run as budget_exhausted', async () => {
  const fixture = coordinatorFixture();
  const run = await fixture.coordinator.createCoordinatorRun(PROJECT_ID, {
    ...laneACreateRequest(),
    budget_envelope: { max_steps: 2, max_provider_calls: 8 },
  });

  const exhausted = await fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_budget',
  });
  assert.equal(exhausted.run.run_status, 'budget_exhausted');
  assert.equal(exhausted.run.lease, null);
  assert.equal(exhausted.steps.length, 2);
  assert.equal(exhausted.run.consumed.steps, 2);

  // F2: budget_exhausted is not terminal — a raise-less re-advance is an
  // idempotent no-op returning the current projection, never a 409 and never
  // an execution.
  const orchestratorCallsBefore = fixture.orchestrator.calls.length;
  const idempotent = await fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_budget_retry',
  });
  assert.equal(idempotent.run.run_status, 'budget_exhausted');
  assert.equal(idempotent.steps.length, 2);
  assert.equal(fixture.orchestrator.calls.length, orchestratorCallsBefore);

  // Raises are increase-only: a reduction is rejected with 400 before any
  // lease or execution.
  await assert.rejects(
    () => fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
      holder_id: 'holder_budget_reduce',
      raise_budget_envelope: { max_steps: 1 },
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 400
      && error.errorCode === 'INVALID_PAYLOAD',
  );
  assert.equal(fixture.orchestrator.calls.length, orchestratorCallsBefore);

  // R1: overrides without a raise must never ride the idempotent no-op and
  // be silently dropped — loud 400, no lease, no execution.
  await assert.rejects(
    () => fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
      holder_id: 'holder_budget_overrides_no_raise',
      slot_request_payload_overrides: {
        [PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID]: routeArchitecturePayload(),
      },
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 400
      && error.errorCode === 'INVALID_PAYLOAD'
      && /silently drop/.test(error.message),
  );
  assert.equal(fixture.orchestrator.calls.length, orchestratorCallsBefore);
  const stillExhausted = await fixture.coordinator.getCoordinatorRun(PROJECT_ID, run.coordinator_run_id);
  assert.equal(stillExhausted.run.run_status, 'budget_exhausted');

  // D1 raise-then-re-advance: a real raise resumes the run from the
  // breakpoint through to completion.
  const resumed = await fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_budget_raise',
    raise_budget_envelope: { max_steps: 8 },
  });
  assert.equal(resumed.run.run_status, 'completed');
  assert.equal(resumed.run.budget_envelope.max_steps, 8);
  assert.equal(resumed.steps.length, 4);
  assert.equal(resumed.run.consumed.steps, 4);
  // R2 audit: every applied raise is recorded with from/to and the holder.
  assert.equal(resumed.run.budget_raise_events?.length, 1);
  assert.deepEqual(resumed.run.budget_raise_events?.[0], {
    raised_at: NOW,
    from: { max_steps: 2, max_provider_calls: 8 },
    to: { max_steps: 8, max_provider_calls: 8 },
    holder_id: 'holder_budget_raise',
  });

  // Completed stays terminal: even a raise-carrying advance is a 409.
  await assert.rejects(
    () => fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
      holder_id: 'holder_budget_terminal',
      raise_budget_envelope: { max_steps: 16 },
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
});

test('coordinator budget raise is monotonic under interleaving and never shrinks the envelope', async () => {
  // R2: a raise validated against a STALE snapshot (envelope 2) must not
  // shrink an envelope a concurrent raise already grew to 10 — the apply
  // step takes max(post-lock envelope, raise) per dimension.
  const fixture = coordinatorFixture();
  const inner = fixture.coordinatorRepository;
  let armed = false;
  const interleavingRepository: PaperImplementationCoordinatorRepository = {
    createCoordinatorRun: (record) => inner.createCoordinatorRun(record),
    findCoordinatorRunById: (projectId, runId) => inner.findCoordinatorRunById(projectId, runId),
    updateCoordinatorRun: (record, options) => inner.updateCoordinatorRun(record, options),
    createCoordinatorStep: (step) => inner.createCoordinatorStep(step),
    listCoordinatorSteps: (projectId, runId) => inner.listCoordinatorSteps(projectId, runId),
    acquireCoordinatorRunLease: async (projectId, runId, lease, now) => {
      if (armed) {
        armed = false;
        const stored = await inner.findCoordinatorRunById(projectId, runId);
        assert.ok(stored);
        // Interleaving injection: a concurrent raise to 10 completes AFTER
        // our request validated raise 7 against the stale envelope 2, but
        // BEFORE our lease CAS.
        await inner.updateCoordinatorRun({
          ...stored,
          budget_envelope: { ...stored.budget_envelope, max_steps: 10 },
          budget_raise_events: [
            ...(stored.budget_raise_events ?? []),
            {
              raised_at: NOW,
              from: { ...stored.budget_envelope },
              to: { ...stored.budget_envelope, max_steps: 10 },
              holder_id: 'holder_interleaved_winner',
            },
          ],
        });
      }
      return inner.acquireCoordinatorRunLease(projectId, runId, lease, now);
    },
  };
  const coordinator = fixture.buildCoordinator(interleavingRepository);
  const run = await coordinator.createCoordinatorRun(PROJECT_ID, {
    ...laneACreateRequest(),
    budget_envelope: { max_steps: 2, max_provider_calls: 8 },
  });
  const exhausted = await coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_monotonic_park',
  });
  assert.equal(exhausted.run.run_status, 'budget_exhausted');

  armed = true;
  const resumed = await coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_monotonic_raise',
    raise_budget_envelope: { max_steps: 7 },
  });
  assert.equal(resumed.run.run_status, 'completed');
  // The envelope KEEPS the concurrent winner's 10 — the stale raise 7 can
  // only be absorbed, never applied as a reduction.
  assert.equal(resumed.run.budget_envelope.max_steps, 10);
  // Both raises are on the audit trail; the superseded one records
  // from === to at the winner's level.
  assert.equal(resumed.run.budget_raise_events?.length, 2);
  assert.equal(resumed.run.budget_raise_events?.[0]?.holder_id, 'holder_interleaved_winner');
  assert.deepEqual(resumed.run.budget_raise_events?.[1], {
    raised_at: NOW,
    from: { max_steps: 10, max_provider_calls: 8 },
    to: { max_steps: 10, max_provider_calls: 8 },
    holder_id: 'holder_monotonic_raise',
  });
});

test('coordinator candidate selection decision records are replayable from stored projections', async () => {
  const fixture = coordinatorFixture();
  const run = await fixture.coordinator.createCoordinatorRun(PROJECT_ID, laneACreateRequest());
  const advanced = await fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_replay',
  });
  assert.equal(advanced.run.run_status, 'completed');

  const routeDecision = advanced.steps[0]?.decision_record;
  assert.ok(routeDecision);
  assert.deepEqual(selectPaperImplementationCandidateV1(routeDecision.candidate_projections), routeDecision);
  assert.equal(routeDecision.selected_candidate_key, ROUTE_CANDIDATE_KEY);
  assert.deepEqual(routeDecision.rationale_codes, ['max_expected_information_gain', 'stable_order_tiebreak']);

  const cycleDecision = advanced.steps[2]?.decision_record;
  assert.ok(cycleDecision);
  assert.deepEqual(selectPaperImplementationCandidateV1(cycleDecision.candidate_projections), cycleDecision);
  assert.equal(cycleDecision.selected_candidate_key, CYCLE_CANDIDATE_KEY);
  assert.deepEqual(cycleDecision.rationale_codes, ['max_expected_information_gain']);
  assert.equal(cycleDecision.inputs_hash, sha256Text(stableStringify(cycleDecision.candidate_projections)));

  // Same input, same selection — the policy is a pure function.
  assert.deepEqual(
    selectPaperImplementationCandidateV1(cycleDecision.candidate_projections),
    selectPaperImplementationCandidateV1(cycleDecision.candidate_projections),
  );
});

test('coordinator motive lane advances on a shared frozen source bundle without artifact chaining', async () => {
  const fixture = coordinatorFixture();
  const run = await fixture.coordinator.createCoordinatorRun(PROJECT_ID, motiveLaneCreateRequest());
  const advanced = await fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_motive',
  });

  assert.equal(advanced.run.run_status, 'completed');
  assert.equal(advanced.steps.length, 2);
  assert.deepEqual(advanced.steps.map((step) => step.slot_id), [
    PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID,
    PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
  ]);
  assert.deepEqual(advanced.steps.map((step) => step.outcome), ['passed', 'passed']);
  assert.equal(advanced.steps.every((step) => step.decision_record === null), true);

  // Domain-anchor coupling: both finals reviewed the same frozen source
  // bundle, and no admitted-artifact chain fields were injected.
  const decompositionFinal = await fixture.finalArtifact(PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID);
  const evolutionFinal = await fixture.finalArtifact(PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID);
  assert.deepEqual(decompositionFinal.source_refs, evolutionFinal.source_refs);
  assert.deepEqual(decompositionFinal.source_hashes, evolutionFinal.source_hashes);
  assert.equal('admitted_route_proposal_artifact_ref' in evolutionFinal.artifact_payload, false);

  // Frozen-bundle drift is rejected at create time.
  const drifted = motiveLaneCreateRequest();
  const driftedEvolution = drifted.slot_request_payloads[PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID] as {
    source_hashes: string[];
  };
  driftedEvolution.source_hashes = [...driftedEvolution.source_hashes.slice(0, -1), hash('drifted-source')];
  await assert.rejects(
    () => fixture.coordinator.createCoordinatorRun(PROJECT_ID, drifted),
    /same frozen source refs\/hashes bundle/,
  );
});

test('coordinator board slots run as single-step pipelines under the same state machine', async () => {
  const fixture = coordinatorFixture();

  const curationRun = await fixture.coordinator.createCoordinatorRun(PROJECT_ID, boardLaneCreateRequest('evidence-board-curation'));
  const curationAdvanced = await fixture.coordinator.advance(PROJECT_ID, curationRun.coordinator_run_id, {
    holder_id: 'holder_curation',
  });
  assert.equal(curationAdvanced.run.run_status, 'completed');
  assert.equal(curationAdvanced.steps.length, 1);
  assert.equal(curationAdvanced.steps[0]?.slot_id, PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID);
  assert.equal(curationAdvanced.steps[0]?.outcome, 'passed');

  const synthesisRun = await fixture.coordinator.createCoordinatorRun(PROJECT_ID, boardLaneCreateRequest('cross-board-synthesis'));
  const synthesisAdvanced = await fixture.coordinator.advance(PROJECT_ID, synthesisRun.coordinator_run_id, {
    holder_id: 'holder_synthesis',
  });
  assert.equal(synthesisAdvanced.run.run_status, 'completed');
  assert.equal(synthesisAdvanced.steps.length, 1);
  assert.equal(synthesisAdvanced.steps[0]?.slot_id, PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID);
  assert.equal(synthesisAdvanced.steps[0]?.outcome, 'passed');
});

test('coordinator product run_mode rejects fixture payloads and non-provider execution before creating the run', async () => {
  const fixture = coordinatorFixture();

  await assert.rejects(
    () => fixture.coordinator.createCoordinatorRun(PROJECT_ID, {
      ...boardLaneCreateRequest('evidence-board-curation'),
      run_mode: 'product',
      execution_mode: 'mocked_llm',
    }),
    /product run_mode requires execution_mode=provider_llm/,
  );

  await assert.rejects(
    () => fixture.coordinator.createCoordinatorRun(PROJECT_ID, {
      ...boardLaneCreateRequest('evidence-board-curation'),
      run_mode: 'product',
      execution_mode: 'provider_llm',
    }),
    /product run_mode rejects fixture payloads/,
  );

  assert.equal(fixture.orchestrator.calls.length, 0);
});

test('coordinator create rejects coordinator-owned fields, missing slots, and unknown slots in payloads', async () => {
  const fixture = coordinatorFixture();

  const withOwnedField = laneACreateRequest();
  (withOwnedField.slot_request_payloads[PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID] as Record<string, unknown>)
    .admitted_route_proposal_artifact_ref = ref('route_architecture_runtime_artifact', 'forged_upstream');
  await assert.rejects(
    () => fixture.coordinator.createCoordinatorRun(PROJECT_ID, withOwnedField),
    /coordinator-owned fields/,
  );

  const missingSlot = laneACreateRequest();
  delete missingSlot.slot_request_payloads[PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID];
  await assert.rejects(
    () => fixture.coordinator.createCoordinatorRun(PROJECT_ID, missingSlot),
    /missing lane validation-planning slots/,
  );

  const unknownSlot = laneACreateRequest();
  unknownSlot.slot_request_payloads[PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID] = {};
  await assert.rejects(
    () => fixture.coordinator.createCoordinatorRun(PROJECT_ID, unknownSlot),
    /outside lane validation-planning/,
  );
});

test('coordinator rejects missing or inactive implementation project before any slot execution', async () => {
  const missingProject = coordinatorFixture(null);
  await assert.rejects(
    () => missingProject.coordinator.createCoordinatorRun(PROJECT_ID, laneACreateRequest()),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );
  assert.equal(missingProject.orchestrator.calls.length, 0);

  const inactiveProject = coordinatorFixture(implementationProjectFixture('archived'));
  await assert.rejects(
    () => inactiveProject.coordinator.createCoordinatorRun(PROJECT_ID, laneACreateRequest()),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
  assert.equal(inactiveProject.orchestrator.calls.length, 0);
});

test('coordinator constructor dependency surface stays structurally zero-authority', () => {
  const fixture = coordinatorFixture();
  const instanceKeys = Object.keys(fixture.coordinator).sort();
  assert.deepEqual(instanceKeys, [
    'coordinatorRepository',
    'crossBoardSynthesisRuntime',
    'decisionQueueWriter',
    'evidenceBoardCurationRuntime',
    'feasibilityPlanningRuntime',
    'idFactory',
    'leaseTtlMs',
    'motiveDecompositionRuntime',
    'motiveEvolutionRuntime',
    'now',
    'projectRepository',
    'routePlanningRuntime',
    'runtimeArtifactReader',
    'validationCyclePlanningRuntime',
  ]);
  // Deliberate boundary evolution (S1-W4): queue materialization is owned by
  // the coordinator, and the DecisionWorkQueue is a governance surface — not
  // domain authority — so the allowed persistence handles are exactly the
  // coordinator's own state machine, the read-only project preflight, the
  // decision-queue writer, and (S2-B B3) the read-only runtime artifact
  // lookback. Still no domain authority repositories
  // (motive/trace/validation/workorder/dossier/confirmation/harness).
  const persistenceKeys = instanceKeys.filter((key) => /repository|writer|reader/i.test(key));
  assert.deepEqual(persistenceKeys, [
    'coordinatorRepository',
    'decisionQueueWriter',
    'projectRepository',
    'runtimeArtifactReader',
  ]);
  assert.equal(
    instanceKeys.some((key) =>
      /(motive|trace|validation|workorder|dossier|confirmation|harness)Repository/i.test(key)),
    false,
  );
  // The writer's runtime type surface is enqueue-only: the coordinator holds
  // a single dedup/reopen-aware enqueue method, never the wider harness
  // repository.
  const writer = (fixture.coordinator as unknown as { decisionQueueWriter: object }).decisionQueueWriter;
  assert.deepEqual(Object.keys(writer), ['enqueueDecisionWorkQueueItem']);
  // B3: the runtime artifact lookback is a single read method — never a
  // write surface into the runtime artifact store.
  const reader = (fixture.coordinator as unknown as { runtimeArtifactReader: object }).runtimeArtifactReader;
  assert.deepEqual(Object.keys(reader), ['findRuntimeArtifactById']);
});

test('coordinator blocked step materializes a decision work queue item with dedup and retry accumulation', async () => {
  const fixture = coordinatorFixture();
  const createRequest = boardLaneCreateRequest('evidence-board-curation');
  // Strip the fixture role outputs so the slot preflight rejects the
  // mocked execution with INVALID_PAYLOAD: the step lands blocked
  // (re-advanceable), never coordinator `failed`.
  delete (createRequest.slot_request_payloads[PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID] as Record<string, unknown>)
    .mocked_role_outputs;
  const run = await fixture.coordinator.createCoordinatorRun(PROJECT_ID, {
    ...createRequest,
    budget_envelope: { max_steps: 8, max_provider_calls: 16 },
  });

  const first = await fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_queue_first',
  });
  assert.equal(first.run.run_status, 'blocked');
  assert.equal(first.steps[0]?.outcome, 'blocked');
  assert.deepEqual(first.steps[0]?.blocker_codes, ['INVALID_PAYLOAD']);

  const afterFirst = await fixture.harnessRepository.listDecisionWorkQueueItems(PROJECT_ID);
  assert.equal(afterFirst.length, 1);
  const item = afterFirst[0]!;
  assert.equal(item.queue_type, 'gate_blocker');
  assert.equal(item.status, 'open');
  assert.equal(item.stage, 'coordinator_step_execution');
  assert.equal(item.retry_count, 0);
  assert.equal(item.cooldown_until, null);
  assert.equal(item.source_coordinator_run_ref?.ref_id, run.coordinator_run_id);
  assert.equal(item.source_step_index, 0);
  assert.equal(item.dedup_key, [
    'coordinator',
    run.coordinator_run_id,
    PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
    'INVALID_PAYLOAD',
  ].join(':'));

  // Dedup: re-advancing the same breakpoint while the item is open reuses it.
  const second = await fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_queue_second',
  });
  assert.equal(second.run.run_status, 'blocked');
  const afterSecond = await fixture.harnessRepository.listDecisionWorkQueueItems(PROJECT_ID);
  assert.equal(afterSecond.length, 1);
  assert.equal(afterSecond[0]?.queue_item_id, item.queue_item_id);
  assert.equal(afterSecond[0]?.retry_count, 0);

  // Reopen after resolve accumulates retry_count (the pre-W4 reopen
  // overwrote it back to the fresh item's 0) and starts the cooldown window.
  await fixture.harnessRepository.resolveDecisionWorkQueueItem(PROJECT_ID, item.queue_item_id, {
    status: 'resolved',
    resolution_note: 'fixture repair attempt',
    resolved_by: 'human',
    resolved_at: NOW,
  });
  const third = await fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_queue_third',
  });
  assert.equal(third.run.run_status, 'blocked');
  const afterThird = await fixture.harnessRepository.listDecisionWorkQueueItems(PROJECT_ID);
  assert.equal(afterThird.length, 1);
  assert.equal(afterThird[0]?.queue_item_id, item.queue_item_id);
  assert.equal(afterThird[0]?.status, 'open');
  assert.equal(afterThird[0]?.retry_count, 1);
  assert.ok(afterThird[0]?.cooldown_until);
  assert.equal(afterThird[0]?.resolved_at, null);
});

test('coordinator queue classification maps unknown blockers to unclassified', () => {
  assert.deepEqual(
    classifyPaperImplementationCoordinatorBlockedStep('blocked', ['TIER_BUDGET_INSUFFICIENT'], []),
    {
      queue_type: 'loop_budget_review',
      primary_blocker: 'TIER_BUDGET_INSUFFICIENT',
      dedup_blocker: 'TIER_BUDGET_INSUFFICIENT',
    },
  );
  assert.deepEqual(
    classifyPaperImplementationCoordinatorBlockedStep('blocked', ['COORDINATOR_NO_ELIGIBLE_CANDIDATE'], []),
    {
      queue_type: 'human_review',
      primary_blocker: 'COORDINATOR_NO_ELIGIBLE_CANDIDATE',
      dedup_blocker: 'COORDINATOR_NO_ELIGIBLE_CANDIDATE',
    },
  );
  assert.deepEqual(
    classifyPaperImplementationCoordinatorBlockedStep('blocked', ['SLOT_INVOCATION_FAILED'], []),
    {
      queue_type: 'failed_workflow',
      primary_blocker: 'SLOT_INVOCATION_FAILED',
      dedup_blocker: 'SLOT_INVOCATION_FAILED',
    },
  );
  // Unknown blocker codes land in the explicit `unclassified` bucket — the
  // mapping is enum tables only, never string-includes heuristics. R3: a
  // slot-sourced free string may stay informational (primary_blocker) but
  // the dedup segment falls back to the outcome sentinel.
  assert.deepEqual(
    classifyPaperImplementationCoordinatorBlockedStep('blocked', [], ['SOME_NOVEL_SLOT_BLOCKER']),
    {
      queue_type: 'unclassified',
      primary_blocker: 'SOME_NOVEL_SLOT_BLOCKER',
      dedup_blocker: 'outcome:blocked',
    },
  );
  assert.deepEqual(
    classifyPaperImplementationCoordinatorBlockedStep('blocked', [], []),
    { queue_type: 'unclassified', primary_blocker: 'unclassified', dedup_blocker: 'outcome:blocked' },
  );
  // With no table hit the step outcome enum (not a string heuristic) still
  // routes runtime failures to the failed-run bucket.
  assert.deepEqual(
    classifyPaperImplementationCoordinatorBlockedStep('failed_runtime', [], ['SOME_NOVEL_RUNTIME_CODE']),
    {
      queue_type: 'failed_run_review',
      primary_blocker: 'SOME_NOVEL_RUNTIME_CODE',
      dedup_blocker: 'outcome:failed_runtime',
    },
  );
});

test('coordinator queue classification never trusts coordinator-owned codes from slot output', () => {
  // F5: coordinator-owned codes riding the slot result payload (potentially
  // LLM-influenced) must not classify through the trusted tables — no
  // loop_budget_review, no trace_repair, no human_review from slot output.
  // R3: nor may any slot-sourced string enter the dedup segment.
  assert.deepEqual(
    classifyPaperImplementationCoordinatorBlockedStep('blocked', [], ['TIER_BUDGET_INSUFFICIENT']),
    {
      queue_type: 'unclassified',
      primary_blocker: 'TIER_BUDGET_INSUFFICIENT',
      dedup_blocker: 'outcome:blocked',
    },
  );
  assert.deepEqual(
    classifyPaperImplementationCoordinatorBlockedStep('blocked', [], ['TRACE_REPAIR_FORGED']),
    {
      queue_type: 'unclassified',
      primary_blocker: 'TRACE_REPAIR_FORGED',
      dedup_blocker: 'outcome:blocked',
    },
  );
  assert.deepEqual(
    classifyPaperImplementationCoordinatorBlockedStep('blocked', [], ['COORDINATOR_NO_ELIGIBLE_CANDIDATE']),
    {
      queue_type: 'unclassified',
      primary_blocker: 'COORDINATOR_NO_ELIGIBLE_CANDIDATE',
      dedup_blocker: 'outcome:blocked',
    },
  );
  // Slot codes on the exact runtime/gate whitelist still classify the queue
  // type, but even whitelisted slot codes never become the dedup segment.
  assert.deepEqual(
    classifyPaperImplementationCoordinatorBlockedStep('blocked', [], ['GATE_CONSTRAINT_FAILED']),
    {
      queue_type: 'gate_blocker',
      primary_blocker: 'GATE_CONSTRAINT_FAILED',
      dedup_blocker: 'outcome:blocked',
    },
  );
  assert.deepEqual(
    classifyPaperImplementationCoordinatorBlockedStep('failed_runtime', [], ['AGENT_EXECUTION_FAILED']),
    {
      queue_type: 'failed_run_review',
      primary_blocker: 'AGENT_EXECUTION_FAILED',
      dedup_blocker: 'outcome:failed_runtime',
    },
  );
  // Trusted codes win over slot codes regardless of order.
  assert.deepEqual(
    classifyPaperImplementationCoordinatorBlockedStep(
      'blocked',
      ['COORDINATOR_NO_ELIGIBLE_CANDIDATE'],
      ['GATE_CONSTRAINT_FAILED'],
    ),
    {
      queue_type: 'human_review',
      primary_blocker: 'COORDINATOR_NO_ELIGIBLE_CANDIDATE',
      dedup_blocker: 'COORDINATOR_NO_ELIGIBLE_CANDIDATE',
    },
  );
});

test('coordinator no-eligible-candidate step blocks the run and override re-advance reflows the same slot', async () => {
  // F1: an empty selection must poison the step (blocked), not the run
  // history — the decision record documents the empty selection, the queue
  // reflow fires, and an override re-advance re-runs the same slot.
  const fixture = coordinatorFixture();
  const run = await fixture.coordinator.createCoordinatorRun(PROJECT_ID, laneACreateRequest({
    blockedRouteCandidates: true,
  }));

  const blocked = await fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_no_eligible',
  });
  assert.equal(blocked.run.run_status, 'blocked');
  assert.equal(blocked.run.lease, null);
  assert.equal(blocked.steps.length, 1);
  const blockedStep = blocked.steps[0]!;
  assert.equal(blockedStep.outcome, 'blocked');
  assert.equal(blockedStep.slot_id, PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID);
  assert.ok(blockedStep.blocker_codes.includes('COORDINATOR_NO_ELIGIBLE_CANDIDATE'));
  // The empty selection stays on the record for replay/audit.
  assert.ok(blockedStep.decision_record);
  assert.equal(blockedStep.decision_record?.selected_candidate_key, null);
  assert.ok(blockedStep.decision_record?.rationale_codes.includes('no_eligible_candidate'));

  const queueItems = await fixture.harnessRepository.listDecisionWorkQueueItems(PROJECT_ID);
  assert.equal(queueItems.length, 1);
  assert.equal(queueItems[0]?.queue_type, 'human_review');
  assert.equal(queueItems[0]?.dedup_key, [
    'coordinator',
    run.coordinator_run_id,
    PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
    'COORDINATOR_NO_ELIGIBLE_CANDIDATE',
  ].join(':'));

  // W4 reflow closure for this scenario: an override supplying eligible
  // candidates re-runs the same slot as a fresh attempt and the chain
  // resumes to completion.
  const resumed = await fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_no_eligible_override',
    slot_request_payload_overrides: {
      [PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID]: routeArchitecturePayload(),
    },
  });
  assert.equal(resumed.run.run_status, 'completed');
  assert.equal(resumed.steps.length, 5);
  const routeAttempts = resumed.steps.filter(
    (step) => step.slot_id === PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
  );
  assert.deepEqual(routeAttempts.map((step) => step.outcome), ['blocked', 'passed']);
  assert.notEqual(routeAttempts[0]?.node_attempt_id, routeAttempts[1]?.node_attempt_id);
  assert.equal(routeAttempts[1]?.decision_record?.selected_candidate_key, ROUTE_CANDIDATE_KEY);
});

test('coordinator distrusts slot-sourced budget and trace blocker codes for terminal state and queue routing', async () => {
  // F5/R4: coordinator-owned codes riding a PROVIDER-CALL-CARRYING slot
  // result (LLM ran — potentially LLM-influenced output) must not park the
  // run as budget_exhausted nor route the queue item into
  // trace_repair/loop_budget_review. (The zero-provider-call preflight echo
  // channel is the trusted counterpart — see the R4 trust-rule test.)
  const fixture = coordinatorFixture();
  const realRoute = fixture.routePlanningRuntime;
  let intercepted = false;
  const coordinator = fixture.buildCoordinator(undefined, {
    routePlanningRuntime: {
      runRouteArchitecture: async (projectId, request) => {
        if (!intercepted) {
          intercepted = true;
          // R9: a REJECTED final admission still carries the raw
          // runtime_artifact_id — the step projection must not surface a
          // half lineage pair (id without admitted hash).
          return stubBlockedRouteArchitectureResult({
            providerCallCount: 1,
            blockerCodes: ['TIER_BUDGET_INSUFFICIENT', 'TRACE_REPAIR_FORGED'],
            finalAdmissionRecord: rejectedFinalAdmissionRecord(),
          });
        }
        return realRoute.runRouteArchitecture(projectId, request);
      },
      runRouteSkepticReview: (projectId, request) => realRoute.runRouteSkepticReview(projectId, request),
    },
  });
  const run = await coordinator.createCoordinatorRun(PROJECT_ID, laneACreateRequest());

  const advanced = await coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_slot_codes',
  });
  assert.equal(advanced.run.run_status, 'blocked');
  assert.notEqual(advanced.run.run_status, 'budget_exhausted');
  assert.equal(advanced.steps.length, 1);
  assert.equal(advanced.steps[0]?.outcome, 'blocked');
  assert.equal(advanced.steps[0]?.provider_call_count, 1);
  // The persisted step keeps the full blocker union for audit.
  assert.ok(advanced.steps[0]?.blocker_codes.includes('TIER_BUDGET_INSUFFICIENT'));
  assert.ok(advanced.steps[0]?.blocker_codes.includes('TRACE_REPAIR_FORGED'));
  // R9: no half lineage — the rejected admission projects neither the id
  // nor the hash, while the admission ref itself stays on the record.
  assert.equal(advanced.steps[0]?.runtime_artifact_id, null);
  assert.equal(advanced.steps[0]?.runtime_artifact_hash, null);
  assert.equal(advanced.steps[0]?.admission_ref?.ref_id, 'admission_rejected_slot_codes');

  const queueItems = await fixture.harnessRepository.listDecisionWorkQueueItems(PROJECT_ID);
  assert.equal(queueItems.length, 1);
  assert.equal(queueItems[0]?.queue_type, 'unclassified');
  assert.notEqual(queueItems[0]?.queue_type, 'trace_repair');
  assert.notEqual(queueItems[0]?.queue_type, 'loop_budget_review');
  // R3: the slot-sourced strings never enter the dedup segment.
  assert.equal(queueItems[0]?.dedup_key, [
    'coordinator',
    run.coordinator_run_id,
    PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
    'outcome:blocked',
  ].join(':'));

  // Not terminal: the run stays re-advanceable (blocked, not exhausted).
  const resumed = await coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_slot_codes_retry',
    slot_request_payload_overrides: {
      [PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID]: routeArchitecturePayload(),
    },
  });
  assert.equal(resumed.run.run_status, 'completed');
});

test('coordinator trusts blocker codes of zero-provider-call blocked finals (deterministic preflight products)', async () => {
  // R4: a blocked slot result with provider_call_count === 0 never ran the
  // LLM — its blocker codes are deterministic preflight output and classify
  // through the trusted tables, so the D2 tier-budget code CAN park the run
  // as budget_exhausted through the preflight echo channel.
  const fixture = coordinatorFixture();
  const run = await fixture.coordinator.createCoordinatorRun(PROJECT_ID, laneACreateRequest({
    routePreflightBlockerCodes: ['TIER_BUDGET_INSUFFICIENT'],
  }));

  const advanced = await fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_zero_call_trust',
  });
  assert.equal(advanced.run.run_status, 'budget_exhausted');
  assert.equal(advanced.run.lease, null);
  assert.equal(advanced.steps.length, 1);
  assert.equal(advanced.steps[0]?.outcome, 'blocked');
  assert.equal(advanced.steps[0]?.provider_call_count, 0);
  assert.ok(advanced.steps[0]?.blocker_codes.includes('TIER_BUDGET_INSUFFICIENT'));

  const queueItems = await fixture.harnessRepository.listDecisionWorkQueueItems(PROJECT_ID);
  assert.equal(queueItems.length, 1);
  assert.equal(queueItems[0]?.queue_type, 'loop_budget_review');
  // Trusted code — it IS the dedup segment.
  assert.equal(queueItems[0]?.dedup_key, [
    'coordinator',
    run.coordinator_run_id,
    PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
    'TIER_BUDGET_INSUFFICIENT',
  ].join(':'));
});

test('coordinator dedup key survives slot blocker wording drift (same breakpoint, same item)', async () => {
  // R3: two blockages of the same (run, slot) whose provider-call-carrying
  // slot results word their blockers differently must land on the SAME
  // dedup key — reopen semantics with retry accumulation, never a second
  // open item per wording.
  const fixture = coordinatorFixture();
  let call = 0;
  const coordinator = fixture.buildCoordinator(undefined, {
    evidenceBoardCurationRuntime: {
      runBindingGapCandidates: async () => {
        call += 1;
        return stubBlockedEvidenceBoardCurationResult({
          providerCallCount: 1,
          blockerCodes: [
            call === 1
              ? 'The model narrated blocker wording A'
              : 'A completely different narrated wording B',
          ],
        });
      },
    },
  });
  const run = await coordinator.createCoordinatorRun(PROJECT_ID, {
    ...boardLaneCreateRequest('evidence-board-curation'),
    budget_envelope: { max_steps: 8, max_provider_calls: 16 },
  });

  const first = await coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_wording_first',
  });
  assert.equal(first.run.run_status, 'blocked');
  const afterFirst = await fixture.harnessRepository.listDecisionWorkQueueItems(PROJECT_ID);
  assert.equal(afterFirst.length, 1);
  const item = afterFirst[0]!;
  const expectedDedupKey = [
    'coordinator',
    run.coordinator_run_id,
    PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
    'outcome:blocked',
  ].join(':');
  assert.equal(item.dedup_key, expectedDedupKey);

  await fixture.harnessRepository.resolveDecisionWorkQueueItem(PROJECT_ID, item.queue_item_id, {
    status: 'resolved',
    resolution_note: 'wording drift repair attempt',
    resolved_by: 'human',
    resolved_at: NOW,
  });
  const second = await coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_wording_second',
  });
  assert.equal(second.run.run_status, 'blocked');
  assert.equal(second.steps.length, 2);
  assert.notEqual(
    second.steps[1]?.blocker_codes.join(','),
    second.steps[0]?.blocker_codes.join(','),
    'the two attempts must actually carry different slot wording',
  );

  const afterSecond = await fixture.harnessRepository.listDecisionWorkQueueItems(PROJECT_ID);
  assert.equal(afterSecond.length, 1, 'wording drift must not mint a second item');
  assert.equal(afterSecond[0]?.queue_item_id, item.queue_item_id);
  assert.equal(afterSecond[0]?.dedup_key, expectedDedupKey);
  assert.equal(afterSecond[0]?.status, 'open');
  assert.equal(afterSecond[0]?.retry_count, 1);
});

test('coordinator stale holder persistence fails after a lease takeover without overwriting the new holder', async () => {
  // F3: once another holder takes over an expired lease, every guarded write
  // from the stale holder must fail instead of clobbering the successor.
  const fixture = coordinatorFixture();
  const run = await fixture.coordinator.createCoordinatorRun(PROJECT_ID, laneACreateRequest());

  fixture.orchestrator.onInvoke = async () => {
    fixture.orchestrator.onInvoke = null;
    // The victim's lease is live; simulate expiry then a takeover while the
    // victim is inside the slot execution.
    fixture.clock.value = '2026-07-11T10:30:00.000Z';
    const stolen = await fixture.coordinatorRepository.acquireCoordinatorRunLease(
      PROJECT_ID,
      run.coordinator_run_id,
      {
        holder_id: 'holder_thief',
        heartbeat_at: fixture.clock.value,
        expires_at: '2026-07-11T11:30:00.000Z',
      },
      fixture.clock.value,
    );
    assert.ok(stolen, 'takeover of the expired lease must succeed');
  };

  await assert.rejects(
    () => fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
      holder_id: 'holder_takeover_victim',
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT'
      && /lease is no longer held/.test(error.message),
  );

  // The new holder's run state is untouched by the stale holder. R5: the
  // stale holder's best-effort lease release is fenced on ITSELF, so the
  // successor's live lease survives.
  const after = await fixture.coordinatorRepository.findCoordinatorRunById(
    PROJECT_ID,
    run.coordinator_run_id,
  );
  assert.equal(after?.run_status, 'advancing');
  assert.equal(after?.lease?.holder_id, 'holder_thief');
  assert.equal(after?.consumed.steps, 0);

  // R5: the fence fired at the pre-persistStep heartbeat — the stale
  // holder's slot result was discarded and NO step row landed.
  const orphanCheck = await fixture.coordinatorRepository.listCoordinatorSteps(
    PROJECT_ID,
    run.coordinator_run_id,
  );
  assert.equal(orphanCheck.length, 0, 'the fenced-out holder must not persist its slot result');

  // The run is not stuck: the live lease holder advances immediately and
  // step 0 runs exactly once more (a fresh attempt, no duplicate from the
  // victim).
  const resumed = await fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_thief',
  });
  assert.equal(resumed.run.run_status, 'completed');
  assert.equal(resumed.steps.filter((step) => step.step_index === 0).length, 1);
});

test('coordinator surfaces the terminal 409 when the run turns terminal between pre-check and lease CAS', async () => {
  // R7: a null CAS is ambiguous (concurrent holder vs terminal race). When
  // the run went terminal in the window between the entry pre-check and the
  // CAS, the error must be the terminal GATE_CONSTRAINT_FAILED — not a
  // misleading CONCURRENT_ADVANCE that invites a retry.
  const fixture = coordinatorFixture();
  const run = await fixture.coordinator.createCoordinatorRun(PROJECT_ID, laneACreateRequest());
  const inner = fixture.coordinatorRepository;
  let injected = false;
  const racingRepository: PaperImplementationCoordinatorRepository = {
    createCoordinatorRun: (record) => inner.createCoordinatorRun(record),
    findCoordinatorRunById: (projectId, runId) => inner.findCoordinatorRunById(projectId, runId),
    updateCoordinatorRun: (record, options) => inner.updateCoordinatorRun(record, options),
    createCoordinatorStep: (step) => inner.createCoordinatorStep(step),
    listCoordinatorSteps: (projectId, runId) => inner.listCoordinatorSteps(projectId, runId),
    acquireCoordinatorRunLease: async (projectId, runId, lease, now) => {
      if (!injected) {
        injected = true;
        const stored = await inner.findCoordinatorRunById(projectId, runId);
        assert.ok(stored);
        // Terminal race injection: the run completes AFTER the service's
        // entry pre-check but BEFORE the CAS executes.
        await inner.updateCoordinatorRun({ ...stored, run_status: 'completed', lease: null });
      }
      return inner.acquireCoordinatorRunLease(projectId, runId, lease, now);
    },
  };
  const coordinator = fixture.buildCoordinator(racingRepository);

  await assert.rejects(
    () => coordinator.advance(PROJECT_ID, run.coordinator_run_id, { holder_id: 'holder_terminal_race' }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && /terminal \(completed\)/.test(error.message),
  );
});

test('coordinator re-advance rebuilds consumed budget from persisted steps after a counter-write crash', async () => {
  // F6: after a crash between step persistence and the run counter write,
  // the re-advance must rebuild consumed from the steps table — otherwise
  // the crashed step's spend escapes the budget envelope.
  const fixture = coordinatorFixture();
  // pre-slot hb(1), pre-persistStep hb(2, R5), post-step-0(3): crash on the
  // post-step counter write of step 0.
  const crashRepository = new CrashOnceCoordinatorRepository(fixture.coordinatorRepository, 3);
  const coordinator = fixture.buildCoordinator(crashRepository);
  const run = await coordinator.createCoordinatorRun(PROJECT_ID, {
    ...laneACreateRequest(),
    budget_envelope: { max_steps: 3, max_provider_calls: 16 },
  });

  await assert.rejects(
    () => coordinator.advance(PROJECT_ID, run.coordinator_run_id, { holder_id: 'holder_consumed_crash' }),
    /simulated coordinator crash/,
  );
  const afterCrash = await coordinator.getCoordinatorRun(PROJECT_ID, run.coordinator_run_id);
  assert.equal(afterCrash.steps.length, 1);
  assert.equal(afterCrash.run.consumed.steps, 0, 'the crash left the counter under-counted');
  // R5: the loser released its own lease, so the recovery advance below runs
  // immediately without waiting out the TTL.
  assert.equal(afterCrash.run.lease, null);

  const recovered = await coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_consumed_recovery',
  });
  // With the rebuilt counter the crashed step counts against max_steps=3, so
  // the run parks as budget_exhausted after three executed steps — it must
  // NOT sneak a fourth step through the under-counted envelope.
  assert.equal(recovered.run.run_status, 'budget_exhausted');
  assert.equal(recovered.steps.length, 3);
  assert.equal(recovered.run.consumed.steps, 3);
  assert.equal(
    recovered.run.consumed.provider_calls,
    recovered.steps.reduce((sum, step) => sum + step.provider_call_count, 0),
  );

  // F2 closure: a budget raise resumes the recovered run to completion.
  const completed = await coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_consumed_raise',
    raise_budget_envelope: { max_steps: 8 },
  });
  assert.equal(completed.run.run_status, 'completed');
  assert.equal(completed.run.consumed.steps, 4);
});

test('coordinator lease CAS refuses terminal runs at the repository layer', async () => {
  // F8: completed/failed runs can never be re-leased — the guard lives in
  // the CAS itself, beneath the service's terminal pre-check.
  const fixture = coordinatorFixture();
  const run = await fixture.coordinator.createCoordinatorRun(PROJECT_ID, laneACreateRequest());
  const stored = await fixture.coordinatorRepository.findCoordinatorRunById(PROJECT_ID, run.coordinator_run_id);
  assert.ok(stored);

  const lease = {
    holder_id: 'holder_cas_probe',
    heartbeat_at: NOW,
    expires_at: '2026-07-11T11:00:00.000Z',
  };
  for (const terminalStatus of ['failed', 'completed'] as const) {
    await fixture.coordinatorRepository.updateCoordinatorRun({
      ...stored,
      run_status: terminalStatus,
      lease: null,
    });
    assert.equal(
      await fixture.coordinatorRepository.acquireCoordinatorRunLease(PROJECT_ID, run.coordinator_run_id, lease, NOW),
      null,
      `CAS must refuse a ${terminalStatus} run`,
    );
  }

  // budget_exhausted stays acquirable (F2: raise-then-re-advance).
  await fixture.coordinatorRepository.updateCoordinatorRun({
    ...stored,
    run_status: 'budget_exhausted',
    lease: null,
  });
  const acquired = await fixture.coordinatorRepository.acquireCoordinatorRunLease(
    PROJECT_ID,
    run.coordinator_run_id,
    lease,
    NOW,
  );
  assert.equal(acquired?.lease?.holder_id, 'holder_cas_probe');
});

test('coordinator admitted step projection seeds the acceptance bridge and backfills authority lineage', async () => {
  // F4: the S1 main-seam closure — a completed coordinator step exposes the
  // admitted final artifact id + hash, and that exact pair passes the REAL
  // acceptance-bridge validation to create a deterministic authority object
  // with lineage backfilled.
  const fixture = coordinatorFixture();
  const run = await fixture.coordinator.createCoordinatorRun(PROJECT_ID, laneACreateRequest());
  const advanced = await fixture.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_bridge_seam',
  });
  assert.equal(advanced.run.run_status, 'completed');
  const feasibilityStep = advanced.steps.find(
    (step) => step.slot_id === PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
  );
  assert.ok(feasibilityStep);
  assert.ok(feasibilityStep.runtime_artifact_id, 'the step must project the admitted final artifact id');
  assert.ok(feasibilityStep.runtime_artifact_hash);

  // Hash contract check: the step hash (admitted_artifact_hash) IS the final
  // artifact hash the bridge validates against.
  const feasibilityFinal = await fixture.finalArtifact(PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID);
  assert.equal(feasibilityFinal.runtime_artifact_id, feasibilityStep.runtime_artifact_id);
  assert.equal(feasibilityFinal.final_artifact_hash, feasibilityStep.runtime_artifact_hash);

  // Real acceptance-bridge consumer: feasibility_probe maps to the
  // feasibility_planning workflow (lane A's final step).
  const validationRepository = new InMemoryPaperImplementationValidationRepository();
  const traceRepository = new InMemoryPaperImplementationTraceRepository();
  const planningService = new PaperImplementationValidationCyclePlanningService({
    projectRepository: fixture.projectRepository,
    motiveRepository: new InMemoryPaperImplementationMotiveRepository(),
    traceRepository,
    validationRepository,
    runtimeAdmission: fixture.runtimeAdmission,
    idFactory: (prefix) => `${prefix}_bridge_seam`,
    now: () => fixture.clock.value,
  });
  await traceRepository.createTraceManifest(
    completeTraceManifest('trace_manifest_bridge_seam', 'feasibility_probe', 'feasibility_probe_bridge_seam'),
    [],
  );

  const probe = await planningService.createFeasibilityProbe(PROJECT_ID, {
    probe_id: 'feasibility_probe_bridge_seam',
    probe_kind: 'data_feasibility',
    probe_question: 'Does the coordinator projection seed the acceptance bridge?',
    expected_information_gain: 'medium',
    primary_metric_refs: [ref('metric', 'metric_bridge_seam_001')],
    trace_manifest_id: 'trace_manifest_bridge_seam',
    source_proposal_artifact_ref: {
      ref_type: 'paper_implementation_runtime_artifact',
      ref_id: feasibilityStep.runtime_artifact_id!,
      title_card_id: null,
      version_id: null,
    },
    source_proposal_artifact_hash: feasibilityStep.runtime_artifact_hash!,
  });
  assert.equal(probe.source_proposal_artifact_ref?.ref_id, feasibilityStep.runtime_artifact_id);
  assert.equal(probe.source_proposal_artifact_hash, feasibilityStep.runtime_artifact_hash);
  const readBack = await validationRepository.findFeasibilityProbeById(PROJECT_ID, 'feasibility_probe_bridge_seam');
  assert.equal(readBack?.source_proposal_artifact_ref?.ref_id, feasibilityStep.runtime_artifact_id);
  assert.equal(readBack?.source_proposal_artifact_hash, feasibilityStep.runtime_artifact_hash);

  // Drift fence stays closed: a forged hash against the same projected id is
  // rejected before any authority write.
  await assert.rejects(
    () => planningService.createFeasibilityProbe(PROJECT_ID, {
      probe_id: 'feasibility_probe_bridge_seam_drift',
      probe_kind: 'data_feasibility',
      probe_question: 'Forged hash must not seed authority.',
      expected_information_gain: 'medium',
      primary_metric_refs: [ref('metric', 'metric_bridge_seam_001')],
      trace_manifest_id: 'trace_manifest_bridge_seam',
      source_proposal_artifact_ref: {
        ref_type: 'paper_implementation_runtime_artifact',
        ref_id: feasibilityStep.runtime_artifact_id!,
        title_card_id: null,
        version_id: null,
      },
      source_proposal_artifact_hash: 'f'.repeat(64),
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
});

function completeTraceManifest(
  traceManifestId: string,
  targetRefType: string,
  targetRefId: string,
): TraceManifest {
  const emptyLineage: TraceLineageBundle = {
    literature: {
      literature_evidence_refs: [],
      source_locator_refs: [],
      citation_candidate_refs: [],
    },
    experiment: {
      experiment_plan_refs: [],
      work_order_refs: [],
      run_refs: [],
      run_evidence_refs: [],
      result_packet_refs: [],
      metric_refs: [],
    },
    artifact: {
      dataset_refs: [],
      baseline_refs: [],
      code_version_refs: [],
      model_checkpoint_refs: [],
      config_refs: [],
      log_artifact_refs: [],
    },
    decision: {
      validation_cycle_refs: [],
      motive_evolution_decision_refs: [],
      gate_result_refs: [],
      human_decision_refs: [],
      accepted_risk_refs: [],
    },
    internal_interpretation: {
      result_interpretation_refs: [],
      llm_rationale_refs: [],
      board_summary_refs: [],
      non_citable_refs: [],
    },
  };
  return {
    trace_manifest_id: traceManifestId,
    implementation_project_id: PROJECT_ID,
    target_ref: ref(targetRefType, targetRefId),
    lineage: emptyLineage,
    integrity: {
      missing_refs: [],
      broken_refs: [],
      stale_refs: [],
      invalidated_refs: [],
      non_citable_refs: [],
      partial_refs: [],
    },
    trace_status: 'complete',
    broken_ref_count: 0,
    stale_ref_count: 0,
    missing_ref_count: 0,
    non_citable_ref_count: 0,
    trace_policy_version_id: 'trace_policy_v1',
    created_by: 'system',
    created_at: NOW,
  };
}

function implementationProjectFixture(
  lifecycleStatus: ImplementationProject['lifecycle_status'] = 'active',
): ImplementationProject {
  return {
    implementation_project_id: PROJECT_ID,
    intake_snapshot_id: `${PROJECT_ID}_intake_snapshot`,
    workspace_id: 'workspace_001',
    title_card_id: TITLE_CARD_ID,
    paper_project_bridge_id: `${PROJECT_ID}_bridge`,
    bridge_payload_hash: 'bridge_payload_hash_001',
    target_paper_project_ref: null,
    lifecycle_status: lifecycleStatus,
    freshness_status: 'fresh',
    source_status: 'active',
    version_number: 1,
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
  };
}

function projectRepositoryFixture(
  project: ImplementationProject | null,
): InMemoryPaperImplementationRepository {
  const repository = new InMemoryPaperImplementationRepository();
  if (project) {
    void repository.createBootstrap({
      implementation_project: project,
      intake_snapshot: {
        intake_snapshot_id: project.intake_snapshot_id,
        implementation_project_id: project.implementation_project_id,
        workspace_id: project.workspace_id,
        title_card_id: project.title_card_id,
        paper_project_bridge_id: project.paper_project_bridge_id,
        paper_project_bridge_ref: {
          ref_type: 'paper_project_bridge',
          ref_id: project.paper_project_bridge_id,
          title_card_id: project.title_card_id,
          version_id: null,
        },
        bridge_payload_hash: project.bridge_payload_hash,
        promotion_decision_id: 'promotion_decision_001',
        promotion_decision_ref: {
          ref_type: 'promotion_decision',
          ref_id: 'promotion_decision_001',
          title_card_id: project.title_card_id,
          version_id: null,
        },
        promotion_commitment_profile_id: 'promotion_commitment_profile_001',
        promotion_commitment_profile_ref: {
          ref_type: 'promotion_commitment_profile',
          ref_id: 'promotion_commitment_profile_001',
          title_card_id: project.title_card_id,
          version_id: null,
        },
        promotion_input_snapshot_id: 'promotion_input_snapshot_001',
        promotion_input_snapshot_ref: {
          ref_type: 'promotion_input_snapshot',
          ref_id: 'promotion_input_snapshot_001',
          title_card_id: project.title_card_id,
          version_id: null,
        },
        promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
        topic_package_id: 'topic_package_001',
        package_version: 'v1',
        source_status: 'active',
        snapshot_hashes: {
          bundle_hash: 'bundle_hash_001',
          package_snapshot_hash: 'package_snapshot_hash_001',
          package_draft_input_snapshot_hash: 'package_draft_input_snapshot_hash_001',
          promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
        },
        source_refs: [],
        accepted_risk_refs: [],
        condition_refs: [],
        early_check_obligations: [],
        working_copy_payload: {
          editable_title: 'Working paper title',
          problem_statement: 'Problem statement.',
          contribution_summary: 'Contribution summary.',
          evaluation_plan: 'Evaluation plan.',
          initial_planning_notes: [],
          claim_ceiling: 'Bounded claim ceiling.',
          prohibited_claims: [],
          conditions: [],
          accepted_risk_refs: [],
          early_check_obligations: [],
          source_lineage_summary: {},
        },
        working_copy_payload_hash: 'working_copy_payload_hash_001',
        source_handoff: {} as never,
        target_paper_project_ref: null,
        intake_snapshot_hash: 'intake_snapshot_hash_001',
        policy_version_id: 'policy_v1',
        created_by: 'system',
        created_at: NOW,
      },
    });
  }
  return repository;
}

function coordinatorFixture(
  project: ImplementationProject | null = implementationProjectFixture(),
) {
  let sequence = 0;
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const clock = { value: NOW };
  const now = () => clock.value;
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository: runtimeRepository,
    idFactory,
    now,
  });
  const projectRepository = projectRepositoryFixture(project);
  const orchestrator = new MockedFixtureAgentOrchestrator();
  const slotServiceOptions = {
    projectRepository,
    runtimeAdmission,
    agentOrchestrator: orchestrator,
    idFactory,
    now,
  };
  const coordinatorRepository = new InMemoryPaperImplementationCoordinatorRepository();
  const harnessRepository = new InMemoryPaperImplementationAiWorkflowHarnessRepository();
  const routePlanningRuntime = new PaperImplementationRoutePlanningRuntimeService(slotServiceOptions);
  const evidenceBoardCurationRuntime = new PaperImplementationEvidenceBoardCurationRuntimeService(slotServiceOptions);
  const buildCoordinator = (
    repository: PaperImplementationCoordinatorRepository = coordinatorRepository,
    overrides: Partial<PaperImplementationRunCoordinatorServiceOptions> = {},
  ) =>
    new PaperImplementationRunCoordinatorService({
      coordinatorRepository: repository,
      projectRepository,
      // Narrow enqueue-only writer literal (mirrors the app.ts wiring): the
      // coordinator must never receive the whole harness repository.
      decisionQueueWriter: {
        enqueueDecisionWorkQueueItem: (item) =>
          harnessRepository.enqueueDecisionWorkQueueItem(item),
      },
      // B3: read-only in-chain lookback literal (mirrors the app.ts wiring).
      runtimeArtifactReader: {
        findRuntimeArtifactById: (implementationProjectId, runtimeArtifactId) =>
          runtimeRepository.findRuntimeArtifactById(implementationProjectId, runtimeArtifactId),
      },
      routePlanningRuntime,
      validationCyclePlanningRuntime: new PaperImplementationValidationCyclePlanningRuntimeService(slotServiceOptions),
      feasibilityPlanningRuntime: new PaperImplementationFeasibilityPlanningRuntimeService(slotServiceOptions),
      motiveDecompositionRuntime: new PaperImplementationMotiveDecompositionRuntimeService(slotServiceOptions),
      motiveEvolutionRuntime: new PaperImplementationMotiveEvolutionRuntimeService(slotServiceOptions),
      evidenceBoardCurationRuntime,
      crossBoardSynthesisRuntime: new PaperImplementationCrossBoardSynthesisRuntimeService(slotServiceOptions),
      idFactory,
      now,
      leaseTtlMs: 60_000,
      ...overrides,
    });
  const coordinator = buildCoordinator();
  const finalArtifact = async (slotId: string) => {
    const artifacts = await runtimeRepository.listRuntimeArtifacts(PROJECT_ID, {
      slot_id: slotId,
      artifact_scope: 'final',
    });
    const artifact = artifacts[0];
    assert.ok(artifact, `expected a final runtime artifact for ${slotId}`);
    return artifact;
  };
  const finalArtifactPayload = async (slotId: string) => (await finalArtifact(slotId)).artifact_payload;
  return {
    coordinator,
    buildCoordinator,
    coordinatorRepository,
    harnessRepository,
    runtimeRepository,
    runtimeAdmission,
    projectRepository,
    orchestrator,
    routePlanningRuntime,
    evidenceBoardCurationRuntime,
    clock,
    finalArtifact,
    finalArtifactPayload,
  };
}

function laneACreateRequest(options: {
  skepticDisposition?: PaperImplementationRouteSkepticDisposition;
  blockedRouteCandidates?: boolean;
  routePreflightBlockerCodes?: string[];
} = {}) {
  return {
    lane_id: 'validation-planning' as PaperImplementationCoordinatorLaneId,
    run_mode: 'mock' as const,
    execution_mode: 'mocked_llm' as const,
    budget_envelope: { max_steps: 8, max_provider_calls: 16 },
    slot_request_payloads: {
      [PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID]: routeArchitecturePayload({
        blockedCandidates: options.blockedRouteCandidates ?? false,
        preflightBlockerCodes: options.routePreflightBlockerCodes ?? [],
      }),
      [PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID]: routeSkepticPayload(options.skepticDisposition ?? 'proceed'),
      [PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID]: validationCyclePayload(),
      [PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID]: feasibilityPayload(),
    } as Record<string, Record<string, unknown>>,
  };
}

function motiveLaneCreateRequest() {
  const sourceRefs = motiveFrozenSourceRefs();
  const sourceHashes = motiveFrozenSourceHashes();
  return {
    lane_id: 'motive' as PaperImplementationCoordinatorLaneId,
    run_mode: 'mock' as const,
    execution_mode: 'mocked_llm' as const,
    budget_envelope: { max_steps: 4, max_provider_calls: 8 },
    slot_request_payloads: {
      [PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID]: motiveDecompositionPayload(sourceRefs, sourceHashes),
      [PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID]: motiveEvolutionPayload(sourceRefs, sourceHashes),
    } as Record<string, Record<string, unknown>>,
  };
}

function boardLaneCreateRequest(laneId: 'evidence-board-curation' | 'cross-board-synthesis') {
  return {
    lane_id: laneId as PaperImplementationCoordinatorLaneId,
    run_mode: 'mock' as const,
    execution_mode: 'mocked_llm' as const,
    budget_envelope: { max_steps: 2, max_provider_calls: 4 },
    slot_request_payloads: {
      ...(laneId === 'evidence-board-curation'
        ? { [PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID]: evidenceBoardCurationPayload() }
        : { [PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID]: crossBoardSynthesisPayload() }),
    } as Record<string, Record<string, unknown>>,
  };
}

function routeArchitecturePayload(options: {
  blockedCandidates?: boolean;
  preflightBlockerCodes?: string[];
} = {}): Record<string, unknown> {
  return {
    target_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    source_refs: [
      ref('implementation_input_snapshot', 'input_snapshot_001'),
      ref('trace_manifest', 'trace_manifest_001'),
      ref('literature_evidence', 'literature_evidence_001'),
    ],
    source_hashes: [hash('snapshot'), hash('trace'), hash('literature')],
    preflight_blocker_codes: options.preflightBlockerCodes ?? [],
    mocked_role_outputs: {
      [PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_ROLE_SLOT_ID]:
        routeArchitectureRoleOutput(options.blockedCandidates ?? false),
    },
  };
}

function routeSkepticPayload(
  disposition: PaperImplementationRouteSkepticDisposition,
): Record<string, unknown> {
  return {
    target_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    source_refs: [
      ref('implementation_input_snapshot', 'input_snapshot_001'),
      ref('trace_manifest', 'trace_manifest_001'),
    ],
    source_hashes: [hash('snapshot'), hash('trace')],
    secondary_route_candidate_refs: [],
    preflight_blocker_codes: [],
    mocked_role_outputs: {
      [PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID]: routeSkepticRoleOutput(disposition),
    },
  };
}

function validationCyclePayload(): Record<string, unknown> {
  return {
    target_ref: ref('technical_route_candidate', 'technical_route_candidate_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    source_refs: [
      ref('implementation_input_snapshot', 'input_snapshot_001'),
      ref('trace_manifest', 'trace_manifest_001'),
    ],
    source_hashes: [hash('snapshot'), hash('trace')],
    secondary_route_candidate_refs: [],
    preflight_blocker_codes: [],
    mocked_role_outputs: {
      [PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID]: validationCyclePlanningRoleOutput(),
    },
  };
}

function feasibilityPayload(): Record<string, unknown> {
  return {
    target_ref: ref('validation_cycle_candidate', 'validation_cycle_candidate_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    source_refs: [
      ref('implementation_input_snapshot', 'input_snapshot_001'),
      ref('trace_manifest', 'trace_manifest_feasibility_001'),
    ],
    source_hashes: [hash('snapshot'), hash('trace-feasibility')],
    secondary_route_candidate_refs: [],
    secondary_validation_cycle_refs: [],
    secondary_feasibility_probe_refs: [],
    preflight_blocker_codes: [],
    mocked_role_outputs: {
      [PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID]: feasibilityPlanningRoleOutput(),
    },
  };
}

function routeCandidateProposal(
  candidateKey: string,
  confirmatoryMarker: boolean,
  blockerCodes: string[] = [],
): PaperImplementationRouteCandidateProposal {
  return {
    candidate_key: candidateKey,
    route_summary: `${candidateKey} proposes a bounded route candidate.`,
    expected_information_gain: 'Clarifies route feasibility before deterministic validation admission.',
    baseline_gap_status: confirmatoryMarker ? 'partial' : 'unknown',
    cited_source_refs: [ref('implementation_input_snapshot', 'input_snapshot_001')],
    trace_refs: [ref('trace_manifest', 'trace_manifest_001')],
    validation_signal_refs: [ref('validation_signal', `${candidateKey}_signal_001`)],
    dataset_refs: [ref('dataset_version', `${candidateKey}_dataset_001`)],
    metric_refs: [ref('metric', `${candidateKey}_metric_001`)],
    baseline_refs: [ref('baseline_version', `${candidateKey}_baseline_001`)],
    code_refs: [ref('code_version', `${candidateKey}_code_001`)],
    config_refs: [ref('config_snapshot', `${candidateKey}_config_001`)],
    scope_boundary: 'Proposal only; deterministic validation planning owns persisted route records.',
    confirmatory_marker: confirmatoryMarker,
    blocker_codes: blockerCodes,
    warning_codes: [],
  };
}

function routeArchitectureRoleOutput(blockedCandidates = false): PaperImplementationRoutePlanningRoleOutput {
  const candidateBlockers = blockedCandidates ? ['ROUTE_CANDIDATE_SOURCE_GAP'] : [];
  return {
    role_slot_id: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Route architecture proposed bounded route candidates.',
    cited_source_refs: [ref('implementation_input_snapshot', 'input_snapshot_001')],
    blocker_codes: [],
    warning_codes: [],
    route_candidate_proposals: [
      routeCandidateProposal(ROUTE_CANDIDATE_KEY, false, candidateBlockers),
      routeCandidateProposal('confirmatory_route_candidate', true, candidateBlockers),
    ],
  };
}

function routeSkepticRoleOutput(
  disposition: PaperImplementationRouteSkepticDisposition,
): PaperImplementationRoutePlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Independent route skeptic covered all required route-risk dimensions.',
    cited_source_refs: [ref('implementation_input_snapshot', 'input_snapshot_001')],
    blocker_codes: [],
    warning_codes: [],
    // reviewed_route_proposal_ref/hash and reviewed_candidate_keys are
    // normalized slot-side (S2-C C4) from the coordinator-injected admitted
    // upstream input when the fixture leaves them null/absent.
    reviewed_route_proposal_ref: null,
    reviewed_route_proposal_hash: null,
    reviewed_candidate_keys: [ROUTE_CANDIDATE_KEY],
    checked_dimensions: [...PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_RISK_DIMENSIONS],
    risk_findings: [{
      finding_id: 'coordinator_route_risk_finding_001',
      risk_dimension: 'compute_budget',
      severity: 'warning',
      summary: 'Budget must be confirmed before deterministic route admission proceeds.',
      evidence_refs: [ref('validation_budget', 'validation_budget_001')],
      affected_candidate_keys: [ROUTE_CANDIDATE_KEY],
      required_revision_refs: [],
      blocks_route_progression: false,
    }],
    recommended_disposition: disposition,
    no_queue_side_effect: true,
  };
}

function validationCycleCandidateProposal(
  candidateKey: string,
  confirmatoryMarker: boolean,
): PaperImplementationValidationCycleCandidateProposal {
  return {
    candidate_key: candidateKey,
    reviewed_route_candidate_key: ROUTE_CANDIDATE_KEY,
    target_ref: ref('technical_route_candidate', `technical_route_candidate_${candidateKey}`),
    target_frame_summary: `${candidateKey} validates a bounded route signal before deterministic cycle admission.`,
    cycle_type: confirmatoryMarker ? 'baseline_challenge' : 'route_feasibility',
    trigger_refs: [ref('route_risk_finding', `route_risk_finding_${candidateKey}`)],
    validation_question: `Can ${candidateKey} produce a useful validation signal within the budget envelope?`,
    assumptions_under_test: ['Route context is sufficient to validate against the baseline.'],
    assertion_refs_under_test: [ref('motive_assertion', `motive_assertion_${candidateKey}`)],
    decision_if_pass: 'Admit a deterministic validation cycle draft downstream.',
    decision_if_fail: 'Park the candidate or send it back to route revision.',
    decision_if_inconclusive: 'Request more source context before deterministic validation admission.',
    expected_information_gain: confirmatoryMarker ? 'medium' : 'high',
    criteria: {
      pass_conditions: ['The validation signal isolates route merit against the baseline.'],
      fail_conditions: ['The signal cannot distinguish route merit from missing context.'],
      inconclusive_conditions: ['Dataset, metric, or budget facts are unavailable.'],
      stop_conditions: ['Budget envelope is exceeded.'],
      minimum_artifacts_required: ['route proposal artifact', 'route skeptic artifact'],
    },
    budget_envelope: {
      budget_ref: ref('validation_budget', `validation_budget_${candidateKey}`),
      iteration_budget_ref: ref('iteration_budget', `iteration_budget_${candidateKey}`),
      retry_budget: 1,
      max_runtime: '2h',
      max_compute: 'single-gpu-smoke',
      max_human_review_count: 1,
    },
    included_context_refs: [ref('route_architecture_runtime_artifact', 'route_context_001')],
    trace_refs: [ref('trace_manifest', `trace_manifest_${candidateKey}`)],
    confirmatory_marker: confirmatoryMarker,
    blocker_codes: [],
    warning_codes: [],
  };
}

function validationCyclePlanningRoleOutput(): PaperImplementationValidationCyclePlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Validation-cycle planning proposed bounded cycle candidates.',
    cited_source_refs: [ref('implementation_input_snapshot', 'input_snapshot_001')],
    blocker_codes: [],
    warning_codes: [],
    // Upstream echo refs/hashes are normalized slot-side (S2-C C4) at runtime.
    cycle_candidate_proposals: [
      validationCycleCandidateProposal(CYCLE_CANDIDATE_KEY, false),
      validationCycleCandidateProposal('confirmatory_cycle_candidate', true),
    ],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_validation_cycle_side_effect: true,
  };
}

function feasibilityProbePlanCandidateProposal(
  candidateKey: string,
  confirmatoryMarker: boolean,
): PaperImplementationFeasibilityProbePlanCandidateProposal {
  return {
    candidate_key: candidateKey,
    reviewed_cycle_candidate_key: CYCLE_CANDIDATE_KEY,
    reviewed_route_candidate_key: ROUTE_CANDIDATE_KEY,
    probe_kind: confirmatoryMarker ? 'baseline_check' : 'data_feasibility',
    probe_question: `Can ${candidateKey} produce enough feasibility signal before deterministic probe admission?`,
    plan_summary: `${candidateKey} proposes a bounded feasibility probe without downstream records.`,
    expected_information_gain: confirmatoryMarker ? 'medium' : 'high',
    baseline_gap_status: confirmatoryMarker ? 'resolved' : 'open',
    primary_metric_refs: [ref('metric', `${candidateKey}_metric_001`)],
    dataset_version_refs: [ref('dataset_version', `${candidateKey}_dataset_001`)],
    baseline_version_refs: [ref('baseline_version', `${candidateKey}_baseline_001`)],
    code_version_refs: [ref('code_version', `${candidateKey}_code_001`)],
    config_refs: [ref('config_snapshot', `${candidateKey}_config_001`)],
    budget_envelope: {
      budget_ref: ref('validation_budget', `${candidateKey}_budget_001`),
      iteration_budget_ref: ref('iteration_budget', `${candidateKey}_iteration_budget_001`),
      retry_budget: 1,
      estimated_cost_class: confirmatoryMarker ? 'medium' : 'low',
      max_runtime: '2h',
      max_compute: 'single-gpu-smoke',
      max_human_review_count: 1,
    },
    stop_condition_refs: [ref('stop_condition', `${candidateKey}_stop_condition_001`)],
    trace_refs: [ref('trace_manifest', `${candidateKey}_trace_manifest_001`)],
    confirmatory_marker: confirmatoryMarker,
    blocker_codes: [],
    warning_codes: [],
  };
}

function feasibilityPlanningRoleOutput(): PaperImplementationFeasibilityPlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Feasibility planning proposed bounded probe and plan-light candidates.',
    cited_source_refs: [ref('implementation_input_snapshot', 'input_snapshot_001')],
    blocker_codes: [],
    warning_codes: [],
    // Upstream echo refs/hashes and reviewed key sets are aligned by the
    // coordinator at runtime.
    probe_plan_candidate_proposals: [
      feasibilityProbePlanCandidateProposal('exploratory_probe_candidate', false),
      feasibilityProbePlanCandidateProposal('plan_light_readiness_candidate', true),
    ],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_feasibility_probe_side_effect: true,
    no_experiment_plan_light_side_effect: true,
    no_validation_cycle_side_effect: true,
  };
}

function motiveFrozenSourceRefs(): TopicSelectionFunctionalRef[] {
  return [
    ref('source_locator', 'source_locator_motive_001'),
    ref('citation_candidate', 'citation_candidate_motive_001'),
    ref('evidence_unit', 'evidence_motive_001'),
    ref('source', 'source_motive_001'),
    ref('motive_evidence_board_version', 'board_version_motive_001'),
    ref('evidence_binding', 'evidence_binding_motive_001'),
    ref('trace_manifest', 'trace_manifest_motive_001'),
  ];
}

function motiveFrozenSourceHashes(): string[] {
  return [
    hash('source_locator_motive_001'),
    hash('citation_candidate_motive_001'),
    hash('evidence_motive_001'),
    hash('source_motive_001'),
    hash('board_version_motive_001'),
    hash('evidence_binding_motive_001'),
    hash('trace_manifest_motive_001'),
  ];
}

function motiveDecompositionPayload(
  sourceRefs: TopicSelectionFunctionalRef[],
  sourceHashes: string[],
): Record<string, unknown> {
  return {
    decomposition_mode: 'decompose_existing_assertions',
    target_ref: ref('core_motive_version', 'core_motive_version_001'),
    target_version_id: 'v1',
    target_motive_ref: ref('core_motive', 'core_motive_001'),
    target_core_motive_version_ref: ref('core_motive_version', 'core_motive_version_001'),
    target_assertion_refs: [ref('motive_assertion', 'assertion_001')],
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    source_refs: sourceRefs,
    source_hashes: sourceHashes,
    assertion_context_packets: [{
      packet_ref: ref('assertion_context_packet', 'assertion_context_packet_001'),
      packet_hash: hash('assertion_context_packet_001'),
      assertion_ref: ref('motive_assertion', 'assertion_001'),
      assertion_hash: hash('assertion_001'),
      assertion_text: 'The retrieval grounding component reduces unsupported generated claims.',
      scope_boundary_summary: 'Scope is limited to source-backed retrieval grounding behavior.',
      covered_evidence_refs: [ref('evidence_unit', 'evidence_motive_001')],
      covered_trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_motive_001')],
      covered_source_refs: [ref('source_locator', 'source_locator_motive_001')],
    }],
    trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_motive_001')],
    trace_manifest_hashes: [hash('trace_manifest_motive_001')],
    source_locator_refs: [ref('source_locator', 'source_locator_motive_001')],
    citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_motive_001')],
    evidence_refs: [ref('evidence_unit', 'evidence_motive_001')],
    accepted_risk_refs: [ref('accepted_risk', 'accepted_risk_motive_001')],
    preflight_blocker_codes: [],
    mocked_role_outputs: {
      [PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID]: motiveDecompositionRoleOutput(),
    },
  };
}

function motiveDecompositionRoleOutput(): PaperImplementationMotiveDecompositionRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Motive decomposition proposed draft assertion candidates for deterministic review.',
    cited_source_refs: [ref('source_locator', 'source_locator_motive_001')],
    decomposition_result_status: 'candidates_proposed',
    reviewed_assertion_refs: [ref('motive_assertion', 'assertion_001')],
    draft_assertion_candidates: [{
      candidate_key: 'split_child_motive_001',
      source_assertion_ref: ref('motive_assertion', 'assertion_001'),
      candidate_kind: 'split_child',
      draft_assertion_text: 'The retrieval grounding component reduces unsupported generated claims.',
      scope_boundary_summary: 'Scope is limited to retrieval grounding behavior with request-owned evidence.',
      support_obligation_summary: 'Requires source locator, citation candidate, evidence unit, and trace manifest coverage.',
      covered_evidence_refs: [ref('evidence_unit', 'evidence_motive_001')],
      covered_source_refs: [ref('source_locator', 'source_locator_motive_001')],
      covered_source_locator_refs: [ref('source_locator', 'source_locator_motive_001')],
      covered_citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_motive_001')],
      covered_trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_motive_001')],
      decomposition_check: {
        compoundness_status: 'multiple_obligations',
        scope_change_status: 'split',
        evidence_coverage_status: 'full',
        trace_alignment_status: 'aligned',
        new_claim_risk: false,
        human_confirmation_required: false,
        blocking_reason_codes: [],
        recommended_next_gate: 'motive_assertion_review',
      },
      blocker_codes: [],
      warning_codes: [],
      recommended_next_gate: 'motive_assertion_review',
    }],
    blocker_codes: [],
    warning_codes: [],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_motive_write_side_effect: true,
    no_motive_evolution_side_effect: true,
    no_board_write_side_effect: true,
    no_evidence_binding_side_effect: true,
    no_trace_repair_queue_side_effect: true,
  };
}

function motiveEvolutionPayload(
  sourceRefs: TopicSelectionFunctionalRef[],
  sourceHashes: string[],
): Record<string, unknown> {
  return {
    target_ref: ref('core_motive_version', 'core_motive_version_001'),
    target_version_id: 'v1',
    target_motive_refs: [ref('core_motive', 'core_motive_001')],
    target_motive_hashes: [hash('core_motive_001')],
    target_core_motive_version_refs: [ref('core_motive_version', 'core_motive_version_001')],
    target_core_motive_version_hashes: [hash('core_motive_version_001')],
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    portfolio_snapshot_ref: ref('motive_portfolio_snapshot', 'portfolio_snapshot_001'),
    portfolio_snapshot_hash: hash('portfolio_snapshot_001'),
    evidence_board_refs: [ref('motive_evidence_board_version', 'board_version_motive_001')],
    evidence_board_hashes: [hash('board_version_motive_001')],
    evidence_binding_refs: [ref('evidence_binding', 'evidence_binding_motive_001')],
    evidence_binding_hashes: [hash('evidence_binding_motive_001')],
    challenge_refs: [ref('motive_challenge', 'challenge_motive_001')],
    conflict_refs: [ref('motive_conflict', 'conflict_motive_001')],
    trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_motive_001')],
    trace_manifest_hashes: [hash('trace_manifest_motive_001')],
    human_confirmation_policy_ref: ref('human_confirmation_policy', 'human_confirmation_policy_001'),
    human_confirmation_policy_hash: hash('human_confirmation_policy_001'),
    source_refs: sourceRefs,
    source_hashes: sourceHashes,
    motive_context_packets: [{
      packet_ref: ref('motive_context_packet', 'motive_context_packet_001'),
      packet_hash: hash('motive_context_packet_001'),
      packet_kind: 'motive_version_state',
      content_summary: 'Motive version state is bound to target, evidence, trace, and source refs.',
      key_facts: [
        'Current motive version has an evidence-board repair option but runtime cannot write motive decisions.',
      ],
      covered_target_refs: [
        ref('core_motive_version', 'core_motive_version_001'),
        ref('core_motive', 'core_motive_001'),
      ],
      covered_evidence_refs: [
        ref('motive_evidence_board_version', 'board_version_motive_001'),
        ref('evidence_binding', 'evidence_binding_motive_001'),
      ],
      covered_trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_motive_001')],
      covered_source_refs: [ref('source', 'source_motive_001')],
    }],
    accepted_risk_refs: [ref('accepted_risk', 'accepted_risk_motive_001')],
    accepted_risk_hashes: [hash('accepted_risk_motive_001')],
    preflight_blocker_codes: [],
    mocked_role_outputs: {
      [PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID]: motiveEvolutionDesignerRoleOutput(),
      [PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID]: motiveEvolutionChallengerRoleOutput(),
    },
  };
}

function motiveEvolutionSideEffectGuards() {
  return {
    no_domain_gate_request: true as const,
    no_queue_side_effect: true as const,
    no_motive_write_side_effect: true as const,
    no_motive_evolution_side_effect: true as const,
    no_portfolio_mutation_side_effect: true as const,
    no_board_write_side_effect: true as const,
    no_evidence_binding_side_effect: true as const,
    no_trace_repair_queue_side_effect: true as const,
  };
}

function motiveEvolutionDesignedOption() {
  return {
    option_kind: 'repair_evidence_board_first' as const,
    supporting_refs: [
      ref('core_motive_version', 'core_motive_version_001'),
      ref('motive_evidence_board_version', 'board_version_motive_001'),
      ref('evidence_binding', 'evidence_binding_motive_001'),
    ],
    challenging_refs: [
      ref('motive_challenge', 'challenge_motive_001'),
      ref('trace_manifest', 'trace_manifest_motive_001'),
    ],
    portfolio_impact_class: 'evidence_board_only' as const,
    human_confirmation_required: false,
    recommended_next_gate: 'evidence_board_curation' as const,
    blocker_codes: [],
    warning_codes: [],
  };
}

function motiveEvolutionDesignerRoleOutput(): PaperImplementationMotiveEvolutionOptionDesignerRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Motive evolution designed support options for deterministic review.',
    cited_source_refs: [ref('source', 'source_motive_001')],
    support_result_status: 'options_proposed',
    blocker_codes: [],
    warning_codes: [],
    ...motiveEvolutionSideEffectGuards(),
    reviewed_target_motive_refs: [ref('core_motive', 'core_motive_001')],
    reviewed_core_motive_version_refs: [ref('core_motive_version', 'core_motive_version_001')],
    designed_options: { evolution_option_001: motiveEvolutionDesignedOption() },
    option_set_hash: hash('motive-evolution-option-set-001'),
  };
}

function motiveEvolutionChallengerRoleOutput(): PaperImplementationMotiveEvolutionRiskChallengerRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Motive evolution challenged every support option for deterministic review.',
    cited_source_refs: [ref('source', 'source_motive_001')],
    support_result_status: 'options_proposed',
    blocker_codes: [],
    warning_codes: [],
    ...motiveEvolutionSideEffectGuards(),
    // designer_role_artifact_ref/hash and option_set_hash are echoed from the
    // in-run designer artifact by the fixture orchestrator.
    designer_role_artifact_ref: ref('motive_evolution_role_artifact', 'designer_role_placeholder_001'),
    designer_role_artifact_hash: hash('designer_role_placeholder_001'),
    option_set_hash: hash('motive-evolution-option-set-001'),
    challenged_option_keys: ['evolution_option_001'],
    decision_options: {
      evolution_option_001: {
        ...motiveEvolutionDesignedOption(),
        challenge_check: {
          evidence_status: 'partial',
          trace_status: 'satisfied',
          portfolio_status: 'satisfied',
          human_confirmation_status: 'not_applicable',
          downstream_impact_status: 'partial',
          blocking_reason_codes: [],
        },
      },
    },
  };
}

function evidenceBoardCurationPayload(): Record<string, unknown> {
  return {
    curation_mode: 'curate_existing_board',
    target_ref: ref('motive_evidence_board_version', 'board_version_001'),
    target_version_id: 'v1',
    target_motive_ref: ref('core_motive', 'core_motive_001'),
    target_core_motive_version_ref: ref('core_motive_version', 'core_motive_version_001'),
    target_board_ref: ref('motive_evidence_board_version', 'board_version_001'),
    target_board_hash: hash('board_version_001'),
    target_assertion_refs: [ref('motive_assertion', 'assertion_001')],
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    source_refs: [
      ref('source_locator', 'source_locator_board_001'),
      ref('citation_candidate', 'citation_candidate_board_001'),
      ref('evidence_unit', 'evidence_board_001'),
    ],
    source_hashes: [
      hash('source_locator_board_001'),
      hash('citation_candidate_board_001'),
      hash('evidence_board_001'),
    ],
    source_context_packets: [{
      packet_ref: ref('source_context_packet', 'source_context_packet_board_001'),
      packet_hash: hash('source_context_packet_board_001'),
      source_ref: ref('source_locator', 'source_locator_board_001'),
      source_hash: hash('source_locator_board_001'),
      evidence_kind: 'source_locator',
      content_summary: 'Fixture locator points to a concrete paper section and line range.',
      key_facts: [
        'The source locator is primary review material only.',
        'The runtime cannot create evidence bindings.',
      ],
      covered_evidence_refs: [],
      covered_source_locator_refs: [ref('source_locator', 'source_locator_board_001')],
      covered_citation_candidate_refs: [],
      covered_trace_manifest_refs: [],
    }],
    trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_board_001')],
    trace_manifest_hashes: [hash('trace_manifest_board_001')],
    source_locator_refs: [ref('source_locator', 'source_locator_board_001')],
    citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_board_001')],
    reviewed_citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_board_001')],
    evidence_refs: [
      ref('evidence_unit', 'evidence_board_001'),
      ref('evidence_unit', 'existing_bound_evidence_001'),
    ],
    existing_evidence_binding_refs: [ref('evidence_binding', 'existing_binding_001')],
    existing_bound_evidence_refs: [ref('evidence_unit', 'existing_bound_evidence_001')],
    accepted_risk_refs: [ref('accepted_risk', 'accepted_risk_board_001')],
    freshness_policy: {
      stale_evidence_requires_gap_candidate: true,
      unreviewed_citation_requires_gap_candidate: true,
      duplicate_existing_binding_requires_gap_candidate: true,
    },
    preflight_blocker_codes: [],
    mocked_role_outputs: {
      [PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_ROLE_SLOT_ID]: evidenceBoardCurationRoleOutput(),
    },
  };
}

function evidenceBoardCurationRoleOutput(): PaperImplementationEvidenceBoardCurationRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Evidence-board curation proposed append-only binding candidates.',
    cited_source_refs: [ref('source_locator', 'source_locator_board_001')],
    reviewed_assertion_refs: [ref('motive_assertion', 'assertion_001')],
    reviewed_source_locator_refs: [ref('source_locator', 'source_locator_board_001')],
    reviewed_citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_board_001')],
    reviewed_evidence_refs: [
      ref('evidence_unit', 'evidence_board_001'),
      ref('evidence_unit', 'existing_bound_evidence_001'),
    ],
    reviewed_existing_evidence_binding_refs: [ref('evidence_binding', 'existing_binding_001')],
    binding_candidate_proposals: [{
      candidate_key: 'binding_candidate_001',
      target_assertion_ref: ref('motive_assertion', 'assertion_001'),
      evidence_ref: ref('evidence_unit', 'evidence_board_001'),
      source_locator_refs: [ref('source_locator', 'source_locator_board_001')],
      citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_board_001')],
      proposed_role: 'supporting_evidence',
      proposed_scope: 'assertion_local',
      proposed_strength: 'moderate',
      support_state: 'viable_binding',
      challenge_status: 'passed',
      freshness_status: 'fresh',
      interpretation: 'Fixture proposes an append-only evidence binding candidate without domain mutation.',
      challenge_check: {
        memo_or_summary_rejected: true,
        locator_quality: 'verified',
        citation_status: 'reviewed',
        scope_match_status: 'matched',
        freshness_status: 'fresh',
        should_downgrade_to_gap: false,
        downgrade_reason_codes: [],
        blocking_reason_codes: [],
      },
      blocker_codes: [],
      warning_codes: [],
      recommended_next_gate: 'motive_evidence_board_review',
    }],
    gap_candidate_proposals: [],
    blocker_codes: [],
    warning_codes: [],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_board_write_side_effect: true,
    no_evidence_binding_side_effect: true,
    no_evidence_transfer_binding_side_effect: true,
    no_citation_candidate_side_effect: true,
    no_trace_repair_queue_side_effect: true,
  };
}

function crossBoardAnchor(id: '1' | '2') {
  return {
    board_version_ref: ref('motive_evidence_board_version', `board_version_cb_00${id}`),
    board_version_hash: hash(`board_version_cb_00${id}`),
    motive_ref: ref('core_motive', `core_motive_cb_00${id}`),
    core_motive_version_ref: ref('core_motive_version', `core_motive_version_cb_00${id}`),
    trace_manifest_ref: ref('trace_manifest', `trace_manifest_cb_00${id}`),
    trace_manifest_hash: hash(`trace_manifest_cb_00${id}`),
    evidence_binding_refs: [ref('evidence_binding', `evidence_binding_cb_00${id}`)],
    source_locator_refs: [ref('source_locator', `source_locator_cb_00${id}`)],
    conflict_refs: id === '1' ? [ref('motive_board_conflict', 'conflict_cb_001')] : [],
    challenge_refs: id === '1' ? [ref('motive_board_challenge', 'challenge_cb_001')] : [],
    freshness_status: 'fresh' as const,
  };
}

function crossBoardSynthesisPayload(): Record<string, unknown> {
  return {
    target_ref: ref('motive_evidence_board_version', 'board_version_cb_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    source_refs: [
      ref('motive_evidence_board_version', 'board_version_cb_001'),
      ref('motive_evidence_board_version', 'board_version_cb_002'),
      ref('trace_manifest', 'trace_manifest_cb_001'),
    ],
    source_hashes: [
      hash('board_version_cb_001'),
      hash('board_version_cb_002'),
      hash('trace_manifest_cb_001'),
    ],
    board_anchors: [crossBoardAnchor('1'), crossBoardAnchor('2')],
    reviewed_board_version_refs: [
      ref('motive_evidence_board_version', 'board_version_cb_001'),
      ref('motive_evidence_board_version', 'board_version_cb_002'),
    ],
    reviewed_conflict_refs: [ref('motive_board_conflict', 'conflict_cb_001')],
    reviewed_challenge_refs: [ref('motive_board_challenge', 'challenge_cb_001')],
    evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer_binding_cb_001')],
    reuse_policy: {
      require_transfer_binding_for_viable_reuse: true,
      allow_blocked_reuse_without_transfer_binding: true,
    },
    preflight_blocker_codes: [],
    mocked_role_outputs: {
      [PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID]: crossBoardSynthesisRoleOutput(),
    },
  };
}

function crossBoardScenarioProposal(
  overrides: Partial<PaperImplementationCrossBoardScenarioProposal> = {},
): PaperImplementationCrossBoardScenarioProposal {
  return {
    scenario_key: 'reuse_scenario_cb_001',
    scenario_kind: 'reuse',
    disposition: 'viable_candidate',
    source_board_version_refs: [
      ref('motive_evidence_board_version', 'board_version_cb_001'),
      ref('motive_evidence_board_version', 'board_version_cb_002'),
    ],
    source_board_version_hashes: [
      hash('board_version_cb_001'),
      hash('board_version_cb_002'),
    ],
    target_motive_refs: [ref('core_motive', 'core_motive_cb_001')],
    evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer_binding_cb_001')],
    conflict_refs: [ref('motive_board_conflict', 'conflict_cb_001')],
    challenge_refs: [ref('motive_board_challenge', 'challenge_cb_001')],
    freshness_blockers: [],
    source_locator_refs: [
      ref('source_locator', 'source_locator_cb_001'),
      ref('source_locator', 'source_locator_cb_002'),
    ],
    expected_benefit: 'Reuse traced evidence across compatible board versions without mutating domain state.',
    risk_codes: ['scope_transfer_risk'],
    blocker_codes: [],
    warning_codes: [],
    recommended_next_gate: 'cross_board_review',
    ...overrides,
  };
}

function crossBoardSynthesisRoleOutput(): PaperImplementationCrossBoardSynthesisRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Cross-board synthesis proposed bounded cross-board scenarios.',
    cited_source_refs: [ref('motive_evidence_board_version', 'board_version_cb_001')],
    reviewed_board_version_refs: [
      ref('motive_evidence_board_version', 'board_version_cb_001'),
      ref('motive_evidence_board_version', 'board_version_cb_002'),
    ],
    reviewed_conflict_refs: [ref('motive_board_conflict', 'conflict_cb_001')],
    reviewed_challenge_refs: [ref('motive_board_challenge', 'challenge_cb_001')],
    reviewed_evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer_binding_cb_001')],
    scenario_proposals: [
      crossBoardScenarioProposal(),
      crossBoardScenarioProposal({
        scenario_key: 'park_conflict_scenario_cb_001',
        scenario_kind: 'park',
        disposition: 'needs_domain_review',
        evidence_transfer_binding_refs: [],
        warning_codes: ['conflict_needs_review'],
        recommended_next_gate: 'trace_repair',
      }),
    ],
    blocker_codes: [],
    warning_codes: [],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_cross_board_review_side_effect: true,
    no_evidence_transfer_binding_side_effect: true,
    no_portfolio_mutation_side_effect: true,
    no_motive_evolution_side_effect: true,
  };
}

/**
 * R4/R9 fixture: a fully-typed REJECTED final admission record. It carries a
 * raw runtime_artifact_id but null admitted ref/hash — the exact half-lineage
 * shape the step projection must never surface.
 */
function rejectedFinalAdmissionRecord(): PaperImplementationRuntimeAdmissionRecord {
  return {
    schema_version: PAPER_IMPLEMENTATION_RUNTIME_ADMISSION_RECORD_SCHEMA_VERSION,
    admission_record_id: 'admission_rejected_slot_codes',
    implementation_project_id: PROJECT_ID,
    workflow_type: 'route_architecture',
    slot_id: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
    admission_scope: 'final',
    admission_policy_id: 'runtime-admission-policy',
    admission_policy_version: 'v1',
    runtime_artifact_ref: ref('route_architecture_runtime_artifact', 'artifact_rejected_001'),
    runtime_artifact_hash: hash('artifact_rejected_001'),
    runtime_artifact_id: 'artifact_rejected_001',
    artifact_contract_id: 'route_architecture_artifact@v1',
    target_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    created_at: NOW,
    expected_runtime_identity_hash: hash('expected-identity'),
    expected_source_hash_bundle_hash: hash('bundle'),
    expected_retrieval_packet_hash: null,
    expected_prompt_packet_hash: hash('prompt'),
    expected_output_schema_id: 'route_architecture_output@v1',
    expected_prior_role_artifact_hashes: [],
    expected_final_artifact_hash: hash('final'),
    observed_runtime_identity_hash: hash('observed-identity-drift'),
    observed_source_hash_bundle_hash: hash('bundle'),
    observed_retrieval_packet_hash: null,
    observed_prompt_packet_hash: hash('prompt'),
    observed_output_schema_id: 'route_architecture_output@v1',
    observed_prior_role_artifact_hashes: [],
    observed_output_hash: hash('output'),
    admission_status: 'rejected',
    admission_identity: {},
    admission_identity_hash: hash('admission-identity'),
    admitted_artifact_ref: null,
    admitted_artifact_hash: null,
    issue_codes: ['RUNTIME_IDENTITY_MISMATCH'],
    warning_codes: [],
  };
}

function stubBlockedRouteArchitectureResult(options: {
  providerCallCount: number;
  blockerCodes: string[];
  finalAdmissionRecord?: PaperImplementationRuntimeAdmissionRecord | null;
}): PaperImplementationRoutePlanningRuntimeResult {
  const finalAdmission = options.finalAdmissionRecord ?? null;
  return {
    run_id: 'stub_route_architecture_run',
    slot_id: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
    workflow_type: 'route_architecture',
    status: 'blocked',
    provider_call_count: options.providerCallCount,
    runtime_artifacts: [],
    admission_records: finalAdmission ? [finalAdmission] : [],
    final_runtime_artifact: null,
    final_admission_record: finalAdmission,
    blocker_codes: [...options.blockerCodes],
    warning_codes: [],
    operational_telemetry: buildPaperImplementationRuntimeOperationalTelemetry({
      runId: 'stub_route_architecture_run',
      workflowType: 'route_architecture',
      slotId: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
      status: 'blocked',
      providerCallCount: options.providerCallCount,
      artifacts: [],
      admissions: finalAdmission ? [finalAdmission] : [],
      finalArtifact: null,
      finalAdmission,
    }),
  };
}

function stubBlockedEvidenceBoardCurationResult(options: {
  providerCallCount: number;
  blockerCodes: string[];
}): PaperImplementationEvidenceBoardCurationRuntimeResult {
  return {
    run_id: 'stub_evidence_board_curation_run',
    slot_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
    workflow_type: 'evidence_board_curation',
    status: 'blocked',
    provider_call_count: options.providerCallCount,
    runtime_artifacts: [],
    admission_records: [],
    final_runtime_artifact: null,
    final_admission_record: null,
    blocker_codes: [...options.blockerCodes],
    warning_codes: [],
    operational_telemetry: buildPaperImplementationRuntimeOperationalTelemetry({
      runId: 'stub_evidence_board_curation_run',
      workflowType: 'evidence_board_curation',
      slotId: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
      status: 'blocked',
      providerCallCount: options.providerCallCount,
      artifacts: [],
      admissions: [],
      finalArtifact: null,
      finalAdmission: null,
    }),
  };
}

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: TITLE_CARD_ID,
    version_id: 'v1',
  };
}

function hash(value: unknown): string {
  return sha256Text(stableStringify(value));
}
