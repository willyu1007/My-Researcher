import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_REVIEW_ROLE_SLOT_IDS,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_REVIEW_ROLE_SLOT_IDS,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
  type PaperImplementationP1RuntimeReviewRoleOutput,
  type PaperImplementationResultAnalysisRoleOutput,
  type RunPaperImplementationP1RuntimeReviewRequest,
  type RunPaperImplementationResultAnalysisRuntimeRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  ClaimCandidate,
  CreateClaimCandidateRequest,
  CreateImplementationDossierRequest,
  CreateResultInterpretationPacketRequest,
  ImplementationDossier,
  ResultInterpretationPacket,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  ImplementationProject,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';

import { InMemoryPaperImplementationRepository } from '../repositories/in-memory-paper-implementation-repository.js';
import { InMemoryPaperImplementationRuntimeRepository } from '../repositories/in-memory-paper-implementation-runtime-repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { PaperImplementationP1RuntimeReviewService } from './paper-implementation-p1-runtime-review-service.js';
import { PaperImplementationResultAnalysisRuntimeService } from './paper-implementation-result-analysis-runtime-service.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import { PaperImplementationRuntimeDomainGateService } from './paper-implementation-runtime-domain-gate-service.js';
import type {
  TopicSelectionAgentInvocationResult,
} from './topic-selection-agent-orchestrator-service.js';

const PROJECT_ID = 'implementation_project_domain_gate_001';
const TITLE_CARD_ID = 'title_card_domain_gate_001';
const NOW = '2026-06-03T12:00:00.000Z';

class FixtureP1Orchestrator {
  async invokeStructuredOutput<T>(
    input: {
      node_id: string;
      execution_mode: string;
      mocked_output?: { output: T } | null;
    },
  ): Promise<TopicSelectionAgentInvocationResult<T>> {
    const output = input.mocked_output?.output ?? roleOutput(input.node_id) as T;
    return invocationResult(output, input.node_id, input.execution_mode);
  }
}

class FixtureResultAnalysisOrchestrator {
  async invokeStructuredOutput<T>(
    input: {
      node_id: string;
      execution_mode: string;
      mocked_output?: { output: T } | null;
    },
  ): Promise<TopicSelectionAgentInvocationResult<T>> {
    const output = input.mocked_output?.output ?? resultAnalysisRoleOutput() as T;
    return invocationResult(output, input.node_id, input.execution_mode);
  }
}

class FakeResultClaimDossierService {
  readonly claimCandidates = new Map<string, ClaimCandidate>();
  readonly dossiers = new Map<string, ImplementationDossier>();
  readonly resultPackets = new Map<string, ResultInterpretationPacket>();
  createClaimCalls = 0;
  createDossierCalls = 0;
  createResultPacketCalls = 0;

  async createResultInterpretationPacket(
    implementationProjectId: string,
    request: CreateResultInterpretationPacketRequest,
  ): Promise<ResultInterpretationPacket> {
    this.createResultPacketCalls += 1;
    const packet = {
      result_interpretation_packet_id: request.result_interpretation_packet_id,
      implementation_project_id: implementationProjectId,
      validation_cycle_id: request.validation_cycle_id,
      experiment_plan_light_id: request.experiment_plan_light_id ?? null,
      source: structuredClone(request.source),
      result_summary: structuredClone(request.result_summary),
      reliability: structuredClone(request.reliability),
      claim_implications: structuredClone(request.claim_implications),
      interpretation_gate_status: 'passed',
      trace_manifest_ref: ref('trace_manifest', request.trace_manifest_id),
      trace_manifest_id: request.trace_manifest_id,
      policy_version_id: request.policy_version_id ?? 'policy_v1',
      created_by: request.created_by ?? 'system',
      created_at: NOW,
    } satisfies ResultInterpretationPacket;
    this.resultPackets.set(packet.result_interpretation_packet_id, packet);
    return structuredClone(packet);
  }

  async getResultInterpretationPacket(
    _implementationProjectId: string,
    resultInterpretationPacketId: string,
  ): Promise<ResultInterpretationPacket> {
    const packet = this.resultPackets.get(resultInterpretationPacketId);
    if (!packet) {
      throw new AppError(404, 'NOT_FOUND', `ResultInterpretationPacket ${resultInterpretationPacketId} not found.`);
    }
    return structuredClone(packet);
  }

  async createClaimCandidate(
    implementationProjectId: string,
    request: CreateClaimCandidateRequest,
  ): Promise<ClaimCandidate> {
    this.createClaimCalls += 1;
    const candidate = {
      claim_candidate_id: request.claim_candidate_id,
      implementation_project_id: implementationProjectId,
      claim_type: request.claim_type,
      claim_statement: request.claim_statement.trim(),
      claim_strength: request.claim_strength,
      claim_status: 'supported',
      boundary_gate_status: 'allow_tentative',
      result_interpretation_packet_refs: request.result_interpretation_packet_ids.map((id) =>
        ref('result_interpretation_packet', id)),
      support_refs: structuredClone(request.support_refs),
      challenge_refs: structuredClone(request.challenge_refs ?? []),
      scope: structuredClone(request.scope),
      boundary: {
        ...structuredClone(request.boundary),
        boundary_gate_result_id: request.boundary.boundary_gate_result_id ?? null,
        human_confirmation_ref: request.boundary.human_confirmation_ref ?? null,
      },
      trace_manifest_ref: ref('trace_manifest', request.trace_manifest_id),
      trace_manifest_id: request.trace_manifest_id,
      claim_trace_packet_ref: request.claim_trace_packet_id
        ? ref('claim_trace_packet', request.claim_trace_packet_id)
        : null,
      claim_trace_packet_id: request.claim_trace_packet_id ?? null,
      human_confirmation_required: false,
      forbidden_overclaim_count: request.boundary.forbidden_overclaims.length,
      policy_version_id: request.policy_version_id ?? 'policy_v1',
      created_by: request.created_by ?? 'system',
      created_at: NOW,
    } satisfies ClaimCandidate;
    this.claimCandidates.set(candidate.claim_candidate_id, candidate);
    return structuredClone(candidate);
  }

  async getClaimCandidate(
    _implementationProjectId: string,
    claimCandidateId: string,
  ): Promise<ClaimCandidate> {
    const candidate = this.claimCandidates.get(claimCandidateId);
    if (!candidate) {
      throw new AppError(404, 'NOT_FOUND', `ClaimCandidate ${claimCandidateId} not found.`);
    }
    return structuredClone(candidate);
  }

  async createImplementationDossier(
    implementationProjectId: string,
    request: CreateImplementationDossierRequest,
  ): Promise<ImplementationDossier> {
    this.createDossierCalls += 1;
    const dossier = {
      dossier_id: request.dossier_id,
      implementation_project_id: implementationProjectId,
      dossier_version: request.dossier_version ?? 1,
      dossier_status: request.dossier_status,
      dossier_trace_status: 'complete',
      source: {
        result_interpretation_packet_refs: request.result_interpretation_packet_ids.map((id) =>
          ref('result_interpretation_packet', id)),
        claim_candidate_refs: request.claim_candidate_ids.map((id) => ref('claim_candidate', id)),
        claim_trace_packet_refs: request.claim_trace_packet_ids.map((id) => ref('claim_trace_packet', id)),
        run_evidence_refs: [],
        validation_cycle_refs: [],
        trace_manifest_refs: [ref('trace_manifest', request.trace_manifest_id)],
      },
      experiment_section: structuredClone(request.experiment_section),
      claim_section: structuredClone(request.claim_section),
      readiness: {
        ...structuredClone(request.readiness),
        readiness_gate_result_id: request.readiness.readiness_gate_result_id ?? null,
      },
      trace_manifest_ref: ref('trace_manifest', request.trace_manifest_id),
      trace_manifest_id: request.trace_manifest_id,
      failed_run_count: request.experiment_section.failed_run_refs.length,
      forbidden_overclaim_count: request.claim_section.forbidden_overclaims.length,
      readiness_gate_result_id: request.readiness.readiness_gate_result_id ?? null,
      projection_policy_version_id: request.projection_policy_version_id ?? 'policy_v1',
      dossier_hash: `sha256:${hash(request)}`,
      reopen_condition: request.reopen_condition ?? null,
      abandon_reason: request.abandon_reason ?? null,
      policy_version_id: request.policy_version_id ?? 'policy_v1',
      created_by: request.created_by ?? 'system',
      created_at: NOW,
    } satisfies ImplementationDossier;
    this.dossiers.set(dossier.dossier_id, dossier);
    return structuredClone(dossier);
  }

  async getImplementationDossier(
    _implementationProjectId: string,
    dossierId: string,
  ): Promise<ImplementationDossier> {
    const dossier = this.dossiers.get(dossierId);
    if (!dossier) {
      throw new AppError(404, 'NOT_FOUND', `ImplementationDossier ${dossierId} not found.`);
    }
    return structuredClone(dossier);
  }
}

test('runtime Domain Gate materializes an admitted claim final artifact idempotently', async () => {
  const { runtime, domainGate, resultService } = fixture();
  const run = await runtime.runClaimBoundaryDebate(PROJECT_ID, mockedRequest('claim'));
  const finalArtifact = run.final_runtime_artifact;
  assert.ok(finalArtifact);

  const first = await domainGate.materializeFinalRuntimeArtifact(PROJECT_ID, finalArtifact.runtime_artifact_id);
  assert.equal(first.status, 'materialized');
  assert.equal(first.domain_artifact_ref.ref_type, 'claim_candidate');
  assert.equal(first.domain_artifact_ref.ref_id, 'claim_candidate_001');

  const second = await domainGate.materializeFinalRuntimeArtifact(PROJECT_ID, finalArtifact.runtime_artifact_id);
  assert.equal(second.status, 'already_materialized');
  assert.equal(resultService.createClaimCalls, 1);
});

test('runtime Domain Gate materializes an admitted dossier final artifact idempotently', async () => {
  const { runtime, domainGate, resultService } = fixture();
  const run = await runtime.runDossierReadinessAudit(PROJECT_ID, mockedRequest('dossier'));
  const finalArtifact = run.final_runtime_artifact;
  assert.ok(finalArtifact);

  const first = await domainGate.materializeFinalRuntimeArtifact(PROJECT_ID, finalArtifact.runtime_artifact_id);
  assert.equal(first.status, 'materialized');
  assert.equal(first.domain_artifact_ref.ref_type, 'implementation_dossier');
  assert.equal(first.domain_artifact_ref.ref_id, 'implementation_dossier_001');

  const second = await domainGate.materializeFinalRuntimeArtifact(PROJECT_ID, finalArtifact.runtime_artifact_id);
  assert.equal(second.status, 'already_materialized');
  assert.equal(resultService.createDossierCalls, 1);
});

test('runtime Domain Gate materializes an admitted result-analysis final artifact idempotently', async () => {
  const { resultRuntime, domainGate, resultService } = fixture();
  const run = await resultRuntime.runInterpretationScenarios(PROJECT_ID, mockedResultAnalysisRequest());
  const finalArtifact = run.final_runtime_artifact;
  assert.ok(finalArtifact);

  const first = await domainGate.materializeFinalRuntimeArtifact(PROJECT_ID, finalArtifact.runtime_artifact_id);
  assert.equal(first.status, 'materialized');
  assert.equal(first.domain_artifact_ref.ref_type, 'result_interpretation_packet');
  assert.equal(first.domain_artifact_ref.ref_id, 'result_interpretation_packet_001');

  const second = await domainGate.materializeFinalRuntimeArtifact(PROJECT_ID, finalArtifact.runtime_artifact_id);
  assert.equal(second.status, 'already_materialized');
  assert.equal(resultService.createResultPacketCalls, 1);
});

test('runtime Domain Gate rejects malformed domain gate requests before domain service calls', async () => {
  const { runtime, domainGate, resultService } = fixture();
  const run = await runtime.runClaimBoundaryDebate(PROJECT_ID, mockedRequest('claim', {
    run_id: 'claim_boundary_malformed_domain_gate_run_001',
    final_domain_gate_request: { claim_candidate_id: 'claim_candidate_malformed' },
  }));
  assert.ok(run.final_runtime_artifact);

  await assert.rejects(
    () => domainGate.materializeFinalRuntimeArtifact(PROJECT_ID, run.final_runtime_artifact!.runtime_artifact_id),
    (error) => error instanceof AppError
      && error.statusCode === 400
      && error.errorCode === 'INVALID_PAYLOAD'
      && /domain_gate_request is invalid/.test(error.message),
  );
  assert.equal(resultService.createClaimCalls, 0);
});

test('runtime Domain Gate rejects same-id claim and dossier materialization drift', async () => {
  const { runtime, domainGate, resultService } = fixture();
  const claimRun = await runtime.runClaimBoundaryDebate(PROJECT_ID, mockedRequest('claim'));
  assert.ok(claimRun.final_runtime_artifact);
  await domainGate.materializeFinalRuntimeArtifact(PROJECT_ID, claimRun.final_runtime_artifact.runtime_artifact_id);

  const driftedClaimRun = await runtime.runClaimBoundaryDebate(PROJECT_ID, mockedRequest('claim', {
    run_id: 'claim_boundary_domain_gate_drift_run_001',
    final_domain_gate_request: {
      ...claimDomainGateRequest(),
      claim_statement: 'Runtime drifted claim.',
    },
  }));
  assert.ok(driftedClaimRun.final_runtime_artifact);
  await assert.rejects(
    () => domainGate.materializeFinalRuntimeArtifact(PROJECT_ID, driftedClaimRun.final_runtime_artifact!.runtime_artifact_id),
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT'
      && /different Domain Gate payload/.test(error.message),
  );
  assert.equal(resultService.createClaimCalls, 1);

  const dossierRun = await runtime.runDossierReadinessAudit(PROJECT_ID, mockedRequest('dossier'));
  assert.ok(dossierRun.final_runtime_artifact);
  await domainGate.materializeFinalRuntimeArtifact(PROJECT_ID, dossierRun.final_runtime_artifact.runtime_artifact_id);

  const driftedDossierRun = await runtime.runDossierReadinessAudit(PROJECT_ID, mockedRequest('dossier', {
    run_id: 'dossier_readiness_domain_gate_drift_run_001',
    final_domain_gate_request: {
      ...dossierDomainGateRequest(),
      readiness: {
        ...dossierDomainGateRequest().readiness,
        readiness_notes: ['drifted readiness note'],
      },
    },
  }));
  assert.ok(driftedDossierRun.final_runtime_artifact);
  await assert.rejects(
    () => domainGate.materializeFinalRuntimeArtifact(PROJECT_ID, driftedDossierRun.final_runtime_artifact!.runtime_artifact_id),
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT'
      && /different Domain Gate payload/.test(error.message),
  );
  assert.equal(resultService.createDossierCalls, 1);
});

test('runtime Domain Gate rejects role and blocked final artifacts', async () => {
  const { runtime, domainGate } = fixture();
  const passed = await runtime.runClaimBoundaryDebate(PROJECT_ID, mockedRequest('claim'));
  const roleArtifact = passed.runtime_artifacts.find((artifact) => artifact.artifact_scope === 'role');
  assert.ok(roleArtifact);
  await assert.rejects(
    () => domainGate.materializeFinalRuntimeArtifact(PROJECT_ID, roleArtifact.runtime_artifact_id),
    /only consumes final runtime artifacts/,
  );

  const blocked = await runtime.runClaimBoundaryDebate(PROJECT_ID, {
    ...mockedRequest('claim'),
    run_id: 'claim_boundary_blocked_run_001',
    preflight_blocker_codes: ['domain_gate_blocker_fixture'],
  });
  assert.ok(blocked.final_runtime_artifact);
  await assert.rejects(
    () => domainGate.materializeFinalRuntimeArtifact(PROJECT_ID, blocked.final_runtime_artifact!.runtime_artifact_id),
    /only materializes passed runtime artifacts/,
  );
});

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

function fixture() {
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  let sequence = 0;
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const admission = new PaperImplementationRuntimeAdmissionService({
    repository,
    idFactory,
    now: () => NOW,
  });
  const projectRepository = projectRepositoryFixture(implementationProjectFixture());
  const runtime = new PaperImplementationP1RuntimeReviewService({
    projectRepository,
    runtimeAdmission: admission,
    agentOrchestrator: new FixtureP1Orchestrator(),
    idFactory,
    now: () => NOW,
  });
  const resultRuntime = new PaperImplementationResultAnalysisRuntimeService({
    projectRepository,
    runtimeAdmission: admission,
    agentOrchestrator: new FixtureResultAnalysisOrchestrator(),
    idFactory,
    now: () => NOW,
  });
  const resultService = new FakeResultClaimDossierService();
  const domainGate = new PaperImplementationRuntimeDomainGateService({
    runtimeAdmission: admission,
    resultClaimDossier: resultService,
  });
  return { runtime, resultRuntime, domainGate, resultService };
}

function mockedRequest(
  kind: 'claim' | 'dossier',
  options: {
    run_id?: string;
    final_domain_gate_request?: Record<string, unknown>;
  } = {},
): RunPaperImplementationP1RuntimeReviewRequest {
  const claim = kind === 'claim';
  const roleSlotIds = claim
    ? PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_REVIEW_ROLE_SLOT_IDS
    : PAPER_IMPLEMENTATION_DOSSIER_READINESS_REVIEW_ROLE_SLOT_IDS;
  return {
    run_id: options.run_id ?? (claim ? 'claim_boundary_domain_gate_run_001' : 'dossier_readiness_domain_gate_run_001'),
    run_mode: 'dry_run',
    execution_mode: 'mocked_llm',
    target_ref: claim
      ? ref('result_interpretation_packet', 'result_packet_001')
      : ref('implementation_dossier', 'implementation_dossier_001'),
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    source_refs: claim
      ? [ref('result_interpretation_packet', 'result_packet_001')]
      : [ref('claim_candidate', 'claim_candidate_001'), ref('claim_trace_packet', 'claim_trace_packet_001')],
    source_hashes: claim
      ? [hash('result-packet')]
      : [hash('claim-candidate'), hash('claim-trace-packet')],
    mocked_role_outputs: Object.fromEntries(
      roleSlotIds.map((slotId) => [
        slotId,
        roleOutput(slotId, options.final_domain_gate_request),
      ]),
    ),
  };
}

function mockedResultAnalysisRequest(
  options: {
    run_id?: string;
    domain_gate_request?: CreateResultInterpretationPacketRequest;
  } = {},
): RunPaperImplementationResultAnalysisRuntimeRequest {
  return {
    run_id: options.run_id ?? 'result_analysis_domain_gate_run_001',
    run_mode: 'dry_run',
    execution_mode: 'mocked_llm',
    target_ref: ref('validation_cycle', 'validation_cycle_001'),
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    source_refs: [
      ref('run_evidence_unit', 'run_evidence_unit_001'),
      ref('result_validation_report', 'result_validation_report_001'),
    ],
    source_hashes: [hash('run-evidence'), hash('validation-report')],
    mocked_role_outputs: {
      [PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID]:
        resultAnalysisRoleOutput(options.domain_gate_request),
    },
  };
}

function roleOutput(
  nodeId: string,
  finalDomainGateRequest?: Record<string, unknown>,
): PaperImplementationP1RuntimeReviewRoleOutput {
  const final = nodeId.endsWith('final');
  const claim = nodeId.startsWith('claim_boundary_review');
  return {
    role_slot_id: nodeId as PaperImplementationP1RuntimeReviewRoleOutput['role_slot_id'],
    role_status: 'passed',
    summary: `P1 role ${nodeId} passed.`,
    cited_source_refs: claim
      ? [ref('result_interpretation_packet', 'result_packet_001')]
      : [ref('claim_candidate', 'claim_candidate_001')],
    blocker_codes: [],
    warning_codes: [],
    domain_gate_request: final
      ? finalDomainGateRequest ?? asRecord(claim ? claimDomainGateRequest() : dossierDomainGateRequest())
      : null,
    scenario_outputs: final && !claim
      ? [{ scenario_id: 'ready_for_writing', disposition: 'preferred' }]
      : [],
  };
}

function resultAnalysisRoleOutput(
  domainGateRequest: CreateResultInterpretationPacketRequest = resultDomainGateRequest(),
): PaperImplementationResultAnalysisRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Result analysis produced interpretation scenarios.',
    cited_source_refs: [
      ref('run_evidence_unit', 'run_evidence_unit_001'),
      ref('result_validation_report', 'result_validation_report_001'),
    ],
    blocker_codes: [],
    warning_codes: [],
    scenario_outputs: ['positive', 'negative', 'inconclusive', 'failed_run'].map((kind) => ({
      scenario_id: `${kind}_scenario`,
      scenario_kind: kind as PaperImplementationResultAnalysisRoleOutput['scenario_outputs'][number]['scenario_kind'],
      summary: `${kind} bounded interpretation scenario.`,
      support_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
      challenge_refs: [ref('result_validation_report', 'result_validation_report_001')],
      limitation_refs: [ref('limitation', 'limitation_001')],
      forbidden_overclaims: ['forbidden strong claim'],
      recommended_claim_refs: [ref('claim_candidate', `${kind}_claim_candidate_001`)],
      required_followup_refs: [ref('validation_feedback_item', `${kind}_followup_001`)],
    })),
    domain_gate_request: asRecord(domainGateRequest),
  };
}

function asRecord(value: object): Record<string, unknown> {
  return structuredClone(value) as Record<string, unknown>;
}

function resultDomainGateRequest(): CreateResultInterpretationPacketRequest {
  return {
    result_interpretation_packet_id: 'result_interpretation_packet_001',
    validation_cycle_id: 'validation_cycle_001',
    source: {
      run_evidence_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
      validation_report_refs: [ref('result_validation_report', 'result_validation_report_001')],
      metric_refs: [ref('metric', 'metric_001')],
      failed_run_refs: [],
      inconclusive_run_refs: [],
      stale_or_invalidated_evidence_refs: [],
    },
    result_summary: {
      result_summary: 'The trusted run supports the bounded assertion.',
      supports_assertion_refs: [ref('motive_assertion', 'motive_assertion_001')],
      challenges_assertion_refs: [],
      unexpected_findings: [],
      failed_runs_accounted_for: true,
      inconclusive_runs_accounted_for: true,
      exploratory_confirmatory_separated: true,
    },
    reliability: {
      failed_runs_retained: true,
      confound_refs: [],
      limitation_refs: [ref('limitation', 'limitation_001')],
      reliability_notes: [],
    },
    claim_implications: {
      allowed_claim_ceiling: 'moderate',
      forbidden_overclaims: ['forbidden strong claim'],
      recommended_claim_refs: [],
      required_followup_refs: [],
    },
    trace_manifest_id: 'trace_manifest_result_001',
    policy_version_id: 'policy_v1',
    created_by: 'system',
  };
}

function claimDomainGateRequest(): CreateClaimCandidateRequest {
  return {
    claim_candidate_id: 'claim_candidate_001',
    claim_type: 'method_claim',
    claim_statement: 'Runtime admitted claim.',
    claim_strength: 'tentative',
    result_interpretation_packet_ids: ['result_packet_001'],
    support_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
    challenge_refs: [],
    scope: {
      population_scope: 'bounded benchmark runs',
      method_scope: 'runtime orchestration path',
      dataset_scope: 'fixture dataset',
      metric_scope: 'admission correctness',
      negative_scope_notes: [],
      excluded_scope_notes: [],
    },
    boundary: {
      boundary_gate_result_id: null,
      rationale: 'accepted by fake domain gate',
      forbidden_overclaims: ['forbidden strong claim'],
      hidden_counter_evidence_refs: [],
      required_followup_refs: [],
      human_confirmation_ref: null,
    },
    trace_manifest_id: 'trace_manifest_001',
    claim_trace_packet_id: 'claim_trace_packet_001',
    policy_version_id: 'policy_v1',
    created_by: 'system',
  };
}

function dossierDomainGateRequest(): CreateImplementationDossierRequest {
  return {
    dossier_id: 'implementation_dossier_001',
    dossier_version: 1,
    dossier_status: 'ready_for_writing',
    result_interpretation_packet_ids: ['result_packet_001'],
    claim_candidate_ids: ['claim_candidate_001'],
    claim_trace_packet_ids: ['claim_trace_packet_001'],
    experiment_section: {
      failed_run_refs: [],
      inconclusive_run_refs: [],
      negative_result_refs: [],
      excluded_stale_or_invalidated_evidence_refs: [],
      experiment_limitations: [],
    },
    claim_section: {
      admitted_claim_refs: [ref('claim_candidate', 'claim_candidate_001')],
      rejected_claim_refs: [],
      forbidden_overclaims: ['forbidden strong claim'],
      claim_ceiling: 'tentative',
    },
    readiness: {
      readiness_gate_result_id: 'readiness_gate_result_001',
      blocker_refs: [],
      warning_refs: [],
      readiness_notes: ['ready for writing'],
    },
    trace_manifest_id: 'trace_manifest_001',
    projection_policy_version_id: 'policy_v1',
    policy_version_id: 'policy_v1',
    created_by: 'system',
  };
}

function invocationResult<T>(
  output: T,
  nodeId: string,
  executionMode: string,
): TopicSelectionAgentInvocationResult<T> {
  return {
    schema_version: 'v1',
    node_id: nodeId,
    workflow_run_id: 'domain_gate_runtime_run_001',
    node_attempt_id: `${nodeId}.attempt-0`,
    status: 'succeeded',
    structured_output: output,
    provenance: {
      workflow_run_id: 'domain_gate_runtime_run_001',
      node_id: nodeId,
      node_attempt_id: `${nodeId}.attempt-0`,
      invocation_attempt_id: `${nodeId}.call-1`,
      execution_mode: executionMode,
      executor_kind: 'multi_agent_debate',
      source_kind: 'mock_fixture',
      non_provider: true,
      run_mode: 'acceptance',
      profile_id: 'paper-implementation.claim-boundary.boundary-debate.v1',
      profile_version: 'v1',
      profile_hash: hash('profile'),
      model_option_id: null,
      normalized_params_hash: null,
      capability_degraded: false,
      capability_degrade_reason: null,
      output_contract: 'PaperImplementationP1RuntimeReviewRoleArtifact@v1',
      prompt_template_id: 'paper-implementation-claim-boundary-debate',
      prompt_template_version: 'v1',
      schema_name: 'paper_implementation_p1_runtime_review_role_output',
      prompt_packet_hash: hash(`prompt:${nodeId}`),
      prompt_packet_cache_status: 'miss',
      prompt_packet_cache_result_ref: null,
      prompt_packet_cache_result_hash: null,
      response_hash: hash(output),
      structured_output_hash: hash(output),
      cache_status: 'not_applicable',
      response_reuse_ref: null,
      telemetry: null,
    },
    validation: { valid: true, error_count: 0, errors: [] },
    token_budget_gate_result: tokenBudgetGateResult(),
    warning_codes: [],
    blocker_codes: [],
    error_code: null,
    audit_snapshot: {
      schema_version: 'topic-selection-agent-invocation-audit-v1',
      node_id: nodeId,
      workflow_run_id: 'domain_gate_runtime_run_001',
      node_attempt_id: `${nodeId}.attempt-0`,
      status: 'succeeded',
      provenance: {
        workflow_run_id: 'domain_gate_runtime_run_001',
        node_id: nodeId,
        node_attempt_id: `${nodeId}.attempt-0`,
        invocation_attempt_id: `${nodeId}.call-1`,
        execution_mode: executionMode,
        executor_kind: 'multi_agent_debate',
        source_kind: 'mock_fixture',
        non_provider: true,
        run_mode: 'acceptance',
        profile_id: 'paper-implementation.claim-boundary.boundary-debate.v1',
        profile_version: 'v1',
        profile_hash: hash('profile'),
        model_option_id: null,
        normalized_params_hash: null,
        capability_degraded: false,
        capability_degrade_reason: null,
        output_contract: 'PaperImplementationP1RuntimeReviewRoleArtifact@v1',
        prompt_template_id: 'paper-implementation-claim-boundary-debate',
        prompt_template_version: 'v1',
        schema_name: 'paper_implementation_p1_runtime_review_role_output',
        prompt_packet_hash: hash(`prompt:${nodeId}`),
        prompt_packet_cache_status: 'miss',
        prompt_packet_cache_result_ref: null,
        prompt_packet_cache_result_hash: null,
        response_hash: hash(output),
        structured_output_hash: hash(output),
        cache_status: 'not_applicable',
        response_reuse_ref: null,
        telemetry: null,
      },
      token_budget_gate_result: tokenBudgetGateResult(),
      validation: { valid: true, error_count: 0, errors: [] },
      warning_codes: [],
      blocker_codes: [],
      error_code: null,
      created_at: NOW,
    },
    created_at: NOW,
    audit_artifact_ref: null,
  } as unknown as TopicSelectionAgentInvocationResult<T>;
}

function tokenBudgetGateResult() {
  return {
    provider_id: null,
    model_id: null,
    profile_id: 'paper-implementation.claim-boundary.boundary-debate.v1',
    model_option_id: null,
    estimated_input_tokens: 1200,
    estimated_output_tokens: 1800,
    context_window_tokens: 128000,
    schema_overhead_tokens: 800,
    decision: 'within_budget',
    compression_strategy_ref: ref('compression_strategy', 'paper-implementation-p1-context-compression'),
    blocker_codes: [],
    warning_codes: [],
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
