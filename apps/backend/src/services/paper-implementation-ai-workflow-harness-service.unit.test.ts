import { strict as assert } from 'node:assert';
import test from 'node:test';

import type {
  CreateAgentWorkflowHarnessRunRequest,
  CreateImplementationHarnessRequest,
  CreateImplementationInputSnapshotRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-ai-workflow-harness-contracts';
import type {
  ImplementationFeedbackEvent,
  ImplementationIntakeSnapshot,
  ImplementationProject,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import {
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_REVIEW_ROLE_SLOT_IDS,
  type PaperImplementationP1RuntimeReviewRoleOutput,
  type RunPaperImplementationP1RuntimeReviewRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  CitationCandidate,
  ClaimTracePacket,
  NaturalLanguageFieldRoleRecord,
  TraceGateResult,
  TraceManifest,
  TraceRepairQueueItem,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationAiWorkflowHarnessRepository } from '../repositories/in-memory-paper-implementation-ai-workflow-harness-repository.js';
import { InMemoryPaperImplementationRuntimeRepository } from '../repositories/in-memory-paper-implementation-runtime-repository.js';
import type {
  PaperImplementationBootstrapPersistence,
  PaperImplementationBootstrapResult,
  PaperImplementationRepository,
} from '../repositories/paper-implementation.repository.js';
import type { PaperImplementationTraceRepository } from '../repositories/paper-implementation-trace.repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { PaperImplementationAiWorkflowHarnessService } from './paper-implementation-ai-workflow-harness-service.js';
import { buildClaimCandidateProposal } from './paper-implementation-p1-proposal-test-fixtures.js';
import { PaperImplementationP1RuntimeReviewService } from './paper-implementation-p1-runtime-review-service.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import type {
  TopicSelectionAgentInvocationResult,
} from './topic-selection-agent-orchestrator-service.js';

const NOW = '2026-05-21T10:00:00.000Z';

class StaticProjectRepository implements PaperImplementationRepository {
  constructor(private readonly project: ImplementationProject) {}

  async createBootstrap(
    persistence: PaperImplementationBootstrapPersistence,
  ): Promise<PaperImplementationBootstrapResult> {
    return {
      ...persistence,
      created: true,
    };
  }

  async findProjectById(implementationProjectId: string): Promise<ImplementationProject | null> {
    return this.project.implementation_project_id === implementationProjectId
      ? structuredClone(this.project)
      : null;
  }

  async findProjectByBridgeId(): Promise<ImplementationProject | null> {
    return null;
  }

  async findIntakeSnapshotById(): Promise<ImplementationIntakeSnapshot | null> {
    return null;
  }

  async findIntakeSnapshotByProjectId(): Promise<ImplementationIntakeSnapshot | null> {
    return null;
  }

  async createFeedbackEvent(event: ImplementationFeedbackEvent): Promise<ImplementationFeedbackEvent> {
    return structuredClone(event);
  }
}

class StaticTraceRepository implements PaperImplementationTraceRepository {
  private readonly manifests = new Map<string, TraceManifest>();

  addTraceManifest(manifest: TraceManifest): void {
    this.manifests.set(manifest.trace_manifest_id, structuredClone(manifest));
  }

  async createTraceManifest(): Promise<TraceManifest> {
    throw new Error('not implemented');
  }

  async findTraceManifestById(
    implementationProjectId: string,
    traceManifestId: string,
  ): Promise<TraceManifest | null> {
    const manifest = this.manifests.get(traceManifestId);
    if (!manifest || manifest.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(manifest);
  }

  async listTraceManifests(): Promise<TraceManifest[]> {
    return [...this.manifests.values()].map((manifest) => structuredClone(manifest));
  }

  async createTraceGateResult(gateResult: TraceGateResult): Promise<TraceGateResult> {
    return gateResult;
  }

  async findTraceGateResultById(): Promise<TraceGateResult | null> {
    return null;
  }

  async createCitationCandidate(candidate: CitationCandidate): Promise<CitationCandidate> {
    return candidate;
  }

  async listCitationCandidates(): Promise<CitationCandidate[]> {
    return [];
  }

  async createClaimTracePacket(packet: ClaimTracePacket): Promise<ClaimTracePacket> {
    return packet;
  }

  async listClaimTracePackets(): Promise<ClaimTracePacket[]> {
    return [];
  }

  async createNaturalLanguageFieldRole(
    record: NaturalLanguageFieldRoleRecord,
  ): Promise<NaturalLanguageFieldRoleRecord> {
    return record;
  }

  async findNaturalLanguageFieldRoleByIdentity(): Promise<NaturalLanguageFieldRoleRecord | null> {
    return null;
  }

  async listTraceRepairQueueItems(): Promise<TraceRepairQueueItem[]> {
    return [];
  }

  async listTraceRepairQueueItemsByManifest(): Promise<TraceRepairQueueItem[]> {
    return [];
  }

  async resolveTraceRepairQueueItem(): Promise<TraceRepairQueueItem> {
    throw new Error('not implemented');
  }
}

class EchoMockRuntimeAgentOrchestrator {
  readonly calls: Array<{ node_id: string; mocked_output?: { output: unknown } | null }> = [];

  async invokeStructuredOutput<T>(
    input: { node_id: string; mocked_output?: { output: T } | null } & Record<string, unknown>,
  ): Promise<TopicSelectionAgentInvocationResult<T>> {
    this.calls.push(input);
    if (!input.mocked_output) {
      throw new Error(`mocked output missing for ${input.node_id}`);
    }
    return makeRuntimeInvocationResult(input, input.mocked_output.output);
  }
}

function buildService() {
  const project = makeProject();
  const traceRepository = new StaticTraceRepository();
  const repository = new InMemoryPaperImplementationAiWorkflowHarnessRepository();
  const nextId = makeIdFactory();
  const service = new PaperImplementationAiWorkflowHarnessService({
    projectRepository: new StaticProjectRepository(project),
    traceRepository,
    harnessRepository: repository,
    idFactory: nextId,
    now: () => NOW,
  });
  return { service, traceRepository, repository, project };
}

function buildP1RuntimeService() {
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  let sequence = 0;
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository: runtimeRepository,
    idFactory,
    now: () => NOW,
  });
  const orchestrator = new EchoMockRuntimeAgentOrchestrator();
  const runtimeService = new PaperImplementationP1RuntimeReviewService({
    projectRepository: new StaticProjectRepository(makeProject()),
    runtimeAdmission,
    agentOrchestrator: orchestrator,
    idFactory,
    now: () => NOW,
  });
  return { runtimeRepository, runtimeService, orchestrator };
}

test('AI workflow harness completes a proposal-only trace-ready run', async () => {
  const { service, traceRepository, project } = buildService();
  traceRepository.addTraceManifest(makeTraceManifest(project.implementation_project_id));

  const harness = await service.createImplementationHarness(
    project.implementation_project_id,
    makeHarnessRequest(),
  );
  const snapshot = await service.createImplementationInputSnapshot(
    project.implementation_project_id,
    makeSnapshotRequest(),
  );
  const result = await service.createAgentWorkflowHarnessRun(
    project.implementation_project_id,
    makeRunRequest({
      harness_id: harness.harness_id,
      input_snapshot_id: snapshot.input_snapshot_id,
    }),
  );

  assert.equal(result.harness_run.run_status, 'completed');
  assert.equal('spec' in (result as unknown as Record<string, unknown>), false);
  assert.equal(result.gate_result.result, 'pass');
  assert.equal(result.proposal_artifacts[0]?.proposal_status, 'proposed');
  assert.equal(result.queue_items.length, 0);
});

test('AI workflow harness consumes admitted runtime final artifacts as proposal refs without authority writes', async () => {
  const { service, traceRepository, project } = buildService();
  const { runtimeRepository, runtimeService, orchestrator } = buildP1RuntimeService();
  traceRepository.addTraceManifest(makeTraceManifest(project.implementation_project_id));

  const runtimeResult = await runtimeService.runClaimBoundaryDebate(
    project.implementation_project_id,
    makeClaimBoundaryRuntimeRequest(),
  );
  const finalArtifactRef = runtimeResult.final_admission_record?.admitted_artifact_ref
    ?? runtimeResult.final_runtime_artifact?.artifact_payload_ref;
  assert.equal(runtimeResult.status, 'passed');
  assert.equal(runtimeResult.final_admission_record?.admission_status, 'admitted');
  assert.ok(finalArtifactRef);

  const harness = await service.createImplementationHarness(
    project.implementation_project_id,
    makeHarnessRequest(),
  );
  const snapshot = await service.createImplementationInputSnapshot(
    project.implementation_project_id,
    makeSnapshotRequest(),
  );
  const runtimeBackedProposal = {
    ...makeRunRequest().proposal_artifacts[0]!,
    artifact_kind: 'gate_prep_report' as const,
    artifact_ref: finalArtifactRef,
    payload: {
      proposal_only: true,
      runtime_artifact_id: runtimeResult.final_runtime_artifact?.runtime_artifact_id,
      runtime_admission_record_id: runtimeResult.final_admission_record?.admission_record_id,
    },
  };
  const accepted = await service.createAgentWorkflowHarnessRun(
    project.implementation_project_id,
    makeRunRequest({
      harness_id: harness.harness_id,
      input_snapshot_id: snapshot.input_snapshot_id,
      proposal_artifacts: [runtimeBackedProposal],
    }),
  );

  assert.equal(orchestrator.calls.length, PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_REVIEW_ROLE_SLOT_IDS.length);
  assert.equal((await runtimeRepository.listRuntimeArtifacts(project.implementation_project_id)).length, 4);
  assert.equal(accepted.harness_run.run_status, 'completed');
  assert.equal(accepted.gate_result.result, 'pass');
  assert.deepEqual(accepted.proposal_artifacts[0]?.artifact_ref, finalArtifactRef);
  assert.equal(accepted.transition_attempt.output_refs.length, 1);
  assert.equal(accepted.transition_attempt.output_refs[0]?.ref_type, 'implementation_proposal_artifact');
  assert.equal(
    accepted.transition_attempt.output_refs[0]?.ref_id,
    accepted.proposal_artifacts[0]?.proposal_artifact_id,
  );

  const blocked = await service.createAgentWorkflowHarnessRun(
    project.implementation_project_id,
    makeRunRequest({
      harness_run_id: 'harness_run_runtime_direct_write',
      harness_id: harness.harness_id,
      input_snapshot_id: snapshot.input_snapshot_id,
      proposal_artifacts: [{
        ...runtimeBackedProposal,
        proposal_artifact_id: 'proposal_runtime_direct_write',
      }],
      direct_authority_mutation_refs: [finalArtifactRef],
    }),
  );
  assert.equal(blocked.harness_run.run_status, 'blocked');
  assert.ok(blocked.harness_run.blocked_reasons.includes('direct_authority_mutation_forbidden'));
  assert.ok(blocked.quality_signals.some((signal) =>
    signal.signal_type === 'forbidden_state_mutation' && signal.severity === 'critical'));
});

test('implementation harness rejects disabled invariants before workflow execution', async () => {
  const { service, project } = buildService();
  const request = makeHarnessRequest();
  request.invariants.require_trace_manifest = false;

  await assert.rejects(
    service.createImplementationHarness(project.implementation_project_id, request),
    /invariants must all be enabled/,
  );
});

test('AI workflow harness blocks product runs that use mock execution', async () => {
  const { service, traceRepository, project } = buildService();
  traceRepository.addTraceManifest(makeTraceManifest(project.implementation_project_id));
  const harness = await service.createImplementationHarness(project.implementation_project_id, makeHarnessRequest());
  const snapshot = await service.createImplementationInputSnapshot(
    project.implementation_project_id,
    makeSnapshotRequest(),
  );

  const result = await service.createAgentWorkflowHarnessRun(
    project.implementation_project_id,
    makeRunRequest({
      harness_id: harness.harness_id,
      input_snapshot_id: snapshot.input_snapshot_id,
      run_mode: 'product',
      execution_mode: 'mocked_llm',
    }),
  );

  assert.equal(result.harness_run.run_status, 'blocked');
  assert.ok(result.harness_run.blocked_reasons.includes('product_run_mode_rejects_mocked_llm_execution'));
  assert.ok(result.harness_run.blocked_reasons.includes('product_run_mode_rejects_mock_model_profile'));
  assert.equal(result.queue_items[0]?.queue_type, 'failed_workflow');
});

test('AI workflow harness turns direct authority mutation into queue blocker', async () => {
  const { service, traceRepository, project } = buildService();
  traceRepository.addTraceManifest(makeTraceManifest(project.implementation_project_id));
  const harness = await service.createImplementationHarness(project.implementation_project_id, makeHarnessRequest());
  const snapshot = await service.createImplementationInputSnapshot(
    project.implementation_project_id,
    makeSnapshotRequest(),
  );

  const result = await service.createAgentWorkflowHarnessRun(
    project.implementation_project_id,
    makeRunRequest({
      harness_id: harness.harness_id,
      input_snapshot_id: snapshot.input_snapshot_id,
      direct_authority_mutation_refs: [ref('core_motive_version', 'cmv_1')],
    }),
  );

  assert.equal(result.harness_run.run_status, 'blocked');
  assert.equal(result.proposal_artifacts[0]?.proposal_status, 'blocked');
  assert.ok(result.quality_signals.some((signal) => signal.signal_type === 'forbidden_state_mutation'));
  assert.equal(result.queue_items[0]?.priority, 'critical');
});

test('AI workflow harness blocks missing trace manifest instead of admitting proposal', async () => {
  const { service, project } = buildService();
  const harness = await service.createImplementationHarness(project.implementation_project_id, makeHarnessRequest());
  const snapshot = await service.createImplementationInputSnapshot(
    project.implementation_project_id,
    makeSnapshotRequest(),
  );

  const result = await service.createAgentWorkflowHarnessRun(
    project.implementation_project_id,
    makeRunRequest({
      harness_id: harness.harness_id,
      input_snapshot_id: snapshot.input_snapshot_id,
    }),
  );

  assert.equal(result.harness_run.run_status, 'blocked');
  assert.ok(result.harness_run.blocked_reasons.includes('proposal_trace_manifest_missing'));
  assert.equal(result.queue_items[0]?.queue_type, 'trace_repair');
});

test('DecisionWorkQueue dedups equivalent blockers across harness reruns', async () => {
  const { service, project } = buildService();
  const harness = await service.createImplementationHarness(project.implementation_project_id, makeHarnessRequest());
  const snapshot = await service.createImplementationInputSnapshot(
    project.implementation_project_id,
    makeSnapshotRequest(),
  );

  const first = await service.createAgentWorkflowHarnessRun(
    project.implementation_project_id,
    makeRunRequest({
      harness_id: harness.harness_id,
      input_snapshot_id: snapshot.input_snapshot_id,
    }),
  );
  const second = await service.createAgentWorkflowHarnessRun(
    project.implementation_project_id,
    makeRunRequest({
      harness_run_id: 'harness_run_2',
      harness_id: harness.harness_id,
      input_snapshot_id: snapshot.input_snapshot_id,
      raw_output_artifact_ref: ref('artifact', 'raw_output_2'),
      parsed_output_artifact_ref: ref('artifact', 'parsed_output_2'),
      proposal_artifacts: [{
        ...makeRunRequest().proposal_artifacts[0]!,
        proposal_artifact_id: 'proposal_2',
        artifact_ref: ref('artifact', 'proposal_artifact_2'),
      }],
    }),
  );
  const queueItems = await service.listDecisionWorkQueueItems(project.implementation_project_id);

  assert.equal(first.harness_run.run_status, 'blocked');
  assert.equal(second.harness_run.run_status, 'blocked');
  assert.equal(first.queue_items[0]?.queue_item_id, second.queue_items[0]?.queue_item_id);
  assert.equal(first.queue_items[0]?.dedup_key, second.queue_items[0]?.dedup_key);
  assert.equal(queueItems.length, 1);
  assert.equal(first.queue_items[0]?.retry_count, 0);
  assert.equal(first.queue_items[0]?.retry_budget, 1);
  assert.equal(first.queue_items[0]?.cooldown_until, null);
  assert.ok(!first.queue_items[0]?.dedup_key.includes(first.harness_run.harness_run_id));
  assert.ok(!second.queue_items[0]?.dedup_key.includes(second.harness_run.harness_run_id));
});

test('DecisionWorkQueue reopens terminal item when equivalent blocker recurs', async () => {
  const { service, project } = buildService();
  const harness = await service.createImplementationHarness(project.implementation_project_id, makeHarnessRequest());
  const snapshot = await service.createImplementationInputSnapshot(
    project.implementation_project_id,
    makeSnapshotRequest(),
  );
  const first = await service.createAgentWorkflowHarnessRun(
    project.implementation_project_id,
    makeRunRequest({
      harness_id: harness.harness_id,
      input_snapshot_id: snapshot.input_snapshot_id,
    }),
  );
  const queueItemId = first.queue_items[0]!.queue_item_id;
  const resolved = await service.resolveDecisionWorkQueueItem(
    project.implementation_project_id,
    queueItemId,
    { status: 'resolved', resolution_note: 'manual trace repair queued', resolved_by: 'human' },
  );

  const second = await service.createAgentWorkflowHarnessRun(
    project.implementation_project_id,
    makeRunRequest({
      harness_run_id: 'harness_run_2',
      harness_id: harness.harness_id,
      input_snapshot_id: snapshot.input_snapshot_id,
      raw_output_artifact_ref: ref('artifact', 'raw_output_2'),
      parsed_output_artifact_ref: ref('artifact', 'parsed_output_2'),
      proposal_artifacts: [{
        ...makeRunRequest().proposal_artifacts[0]!,
        proposal_artifact_id: 'proposal_2',
        artifact_ref: ref('artifact', 'proposal_artifact_2'),
      }],
    }),
  );
  const reopened = second.queue_items[0]!;

  assert.equal(resolved.status, 'resolved');
  assert.equal(reopened.queue_item_id, queueItemId);
  assert.equal(reopened.status, 'open');
  assert.equal(reopened.resolved_at, null);
  assert.deepEqual(
    reopened.created_from_refs.map((item) => item.ref_id),
    ['harness_run_1', 'harness_run_2'],
  );
  // W4 real retry/cooldown semantics: the reopen consumes one retry instead
  // of being overwritten by the fresh item's zeroed counter, and it starts
  // the reopen cooldown window.
  assert.equal(reopened.retry_count, 1);
  assert.ok(reopened.cooldown_until);
  // retry_budget default is 1, so this reopen exhausts it and marks the
  // item as needing an explicit human budget raise.
  assert.ok(reopened.recommended_actions.includes('raise_retry_budget'));
});

test('AI workflow harness blocks stale trace manifests', async () => {
  const { service, traceRepository, project } = buildService();
  const staleTrace = makeTraceManifest(project.implementation_project_id);
  staleTrace.trace_status = 'stale';
  staleTrace.stale_ref_count = 1;
  staleTrace.integrity.stale_refs = [ref('run_evidence_unit', 'stale_evidence_1')];
  traceRepository.addTraceManifest(staleTrace);
  const harness = await service.createImplementationHarness(project.implementation_project_id, makeHarnessRequest());
  const snapshot = await service.createImplementationInputSnapshot(
    project.implementation_project_id,
    makeSnapshotRequest(),
  );

  const result = await service.createAgentWorkflowHarnessRun(
    project.implementation_project_id,
    makeRunRequest({
      harness_id: harness.harness_id,
      input_snapshot_id: snapshot.input_snapshot_id,
    }),
  );

  assert.equal(result.harness_run.run_status, 'blocked');
  assert.equal(result.harness_run.trace_validation_status, 'failed');
  assert.ok(result.harness_run.blocked_reasons.includes('proposal_trace_manifest_stale'));
  assert.equal(result.queue_items[0]?.queue_type, 'trace_repair');
});

test('AI workflow harness blocks proposal refs outside or excluded from input snapshot', async () => {
  const { service, traceRepository, project } = buildService();
  traceRepository.addTraceManifest(makeTraceManifest(project.implementation_project_id));
  const harness = await service.createImplementationHarness(project.implementation_project_id, makeHarnessRequest());
  const snapshotRequest = makeSnapshotRequest();
  snapshotRequest.excluded_context.excluded_refs = [ref('core_motive_version', 'cmv_1')];
  snapshotRequest.excluded_context.exclusion_reasons = ['stale evidence excluded by context compiler'];
  const snapshot = await service.createImplementationInputSnapshot(
    project.implementation_project_id,
    snapshotRequest,
  );

  const result = await service.createAgentWorkflowHarnessRun(
    project.implementation_project_id,
    makeRunRequest({
      harness_id: harness.harness_id,
      input_snapshot_id: snapshot.input_snapshot_id,
      proposal_artifacts: [{
        ...makeRunRequest().proposal_artifacts[0]!,
        target_ref: ref('validation_cycle', 'validation_cycle_outside_snapshot'),
        source_refs: [ref('core_motive_version', 'cmv_1'), ref('run_evidence_unit', 'not_in_snapshot')],
      }],
    }),
  );

  assert.equal(result.harness_run.run_status, 'blocked');
  assert.equal(result.harness_run.reference_validation_status, 'failed');
  assert.ok(result.harness_run.blocked_reasons.includes('proposal_target_ref_input_snapshot_mismatch'));
  assert.ok(result.harness_run.blocked_reasons.includes('proposal_source_ref_excluded_by_input_snapshot'));
  assert.ok(result.harness_run.blocked_reasons.includes('proposal_source_ref_not_in_input_snapshot'));
});

test('AI workflow harness turns spec/schema mismatch into a blocked run', async () => {
  const { service, traceRepository, project } = buildService();
  traceRepository.addTraceManifest(makeTraceManifest(project.implementation_project_id));
  const harness = await service.createImplementationHarness(project.implementation_project_id, makeHarnessRequest());
  const snapshot = await service.createImplementationInputSnapshot(
    project.implementation_project_id,
    makeSnapshotRequest(),
  );

  const baseSpec = makeSpec();
  const spec: CreateAgentWorkflowHarnessRunRequest['spec'] = {
    ...baseSpec,
    workflow_version: 'unexpected_version',
    validation_policy: {
      ...baseSpec.validation_policy,
      schema_validation: false,
    },
  };
  const result = await service.createAgentWorkflowHarnessRun(
    project.implementation_project_id,
    makeRunRequest({
      harness_id: harness.harness_id,
      input_snapshot_id: snapshot.input_snapshot_id,
      spec,
    }),
  );

  assert.equal(result.harness_run.run_status, 'blocked');
  assert.equal(result.harness_run.schema_validation_status, 'failed');
  assert.ok(result.harness_run.blocked_reasons.includes('spec_workflow_version_mismatch'));
  assert.ok(result.harness_run.blocked_reasons.includes('spec_required_validation_disabled'));
});

test('input snapshot rejects memo-like refs in evidence-bearing context', async () => {
  const { service, project } = buildService();
  const request = makeSnapshotRequest();
  request.included_context.evidence_binding_refs = [ref('display_summary', 'summary_1')];

  await assert.rejects(
    service.createImplementationInputSnapshot(project.implementation_project_id, request),
    /cannot enter evidence-bearing input context/,
  );
});

test('DecisionWorkQueue resolution replays terminal status and rejects terminal drift without authority writes', async () => {
  const { service, project } = buildService();
  const harness = await service.createImplementationHarness(project.implementation_project_id, makeHarnessRequest());
  const snapshot = await service.createImplementationInputSnapshot(
    project.implementation_project_id,
    makeSnapshotRequest(),
  );
  const result = await service.createAgentWorkflowHarnessRun(
    project.implementation_project_id,
    makeRunRequest({
      harness_id: harness.harness_id,
      input_snapshot_id: snapshot.input_snapshot_id,
    }),
  );
  const queueItemId = result.queue_items[0]!.queue_item_id;

  const resolved = await service.resolveDecisionWorkQueueItem(
    project.implementation_project_id,
    queueItemId,
    { status: 'resolved', resolution_note: 'manual trace repair queued', resolved_by: 'human' },
  );
  const replayed = await service.resolveDecisionWorkQueueItem(
    project.implementation_project_id,
    queueItemId,
    { status: 'resolved', resolution_note: 'same terminal replay', resolved_by: 'system' },
  );
  await assert.rejects(
    () => service.resolveDecisionWorkQueueItem(
      project.implementation_project_id,
      queueItemId,
      { status: 'dismissed', resolution_note: 'conflicting terminal drift', resolved_by: 'system' },
    ),
    (error: unknown) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
  const runs = await service.listAgentWorkflowHarnessRuns(project.implementation_project_id);

  assert.equal(resolved.status, 'resolved');
  assert.equal(replayed.status, 'resolved');
  assert.equal(replayed.resolved_at, resolved.resolved_at);
  assert.equal(runs[0]?.run_status, 'blocked');
  assert.ok(runs[0]?.blocked_reasons.includes('proposal_trace_manifest_missing'));
});

function makeProject(): ImplementationProject {
  return {
    implementation_project_id: 'impl_project_1',
    intake_snapshot_id: 'intake_snapshot_1',
    workspace_id: 'workspace_1',
    title_card_id: 'title_card_1',
    paper_project_bridge_id: 'bridge_1',
    bridge_payload_hash: 'sha256:bridge',
    target_paper_project_ref: null,
    lifecycle_status: 'active',
    freshness_status: 'fresh',
    source_status: 'active',
    version_number: 1,
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
  };
}

function makeHarnessRequest(): CreateImplementationHarnessRequest {
  return {
    harness_id: 'harness_1',
    policy_pack: {
      context_policy_version_id: 'context_policy_v1',
      trace_policy_version_id: 'trace_policy_v1',
      evidence_policy_version_id: 'evidence_policy_v1',
      experiment_policy_version_id: 'experiment_policy_v1',
      retention_policy_version_id: 'retention_policy_v1',
      evaluation_policy_version_id: 'evaluation_policy_v1',
    },
    runtime_bindings: {
      control_plane_id: 'control_plane_1',
      artifact_store_ref: ref('artifact_store', 'store_1'),
      evidence_ledger_ref: ref('evidence_ledger', 'ledger_1'),
      work_order_broker_ref: ref('work_order_broker', 'broker_1'),
      run_monitor_ref: ref('run_monitor', 'monitor_1'),
    },
    invariants: {
      require_input_snapshot: true,
      require_trace_manifest: true,
      require_artifact_refs: true,
      forbid_untraced_claims: true,
      forbid_memo_as_evidence: true,
      retain_failed_runs: true,
      separate_exploratory_and_confirmatory: true,
    },
    created_by: 'system',
  };
}

function makeSnapshotRequest(): CreateImplementationInputSnapshotRequest {
  return {
    input_snapshot_id: 'input_snapshot_1',
    target_ref: ref('validation_cycle', 'validation_cycle_1'),
    workflow_type: 'validation_cycle_planning',
    context_policy_version_id: 'context_policy_v1',
    included_context: emptyIncludedContext({
      motive_version_refs: [ref('core_motive_version', 'cmv_1')],
      board_version_refs: [ref('motive_evidence_board_version', 'board_1')],
      trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_1')],
    }),
    excluded_context: {
      excluded_refs: [],
      exclusion_reasons: [],
    },
    freshness_constraints: {
      exclude_stale_evidence: true,
      exclude_invalidated_refs: true,
    },
    evidence_rules: {
      memo_as_evidence_forbidden: true,
      citation_requires_source_locator: true,
    },
    source_hashes: ['sha256:source-context'],
    created_by: 'system',
  };
}

function makeRunRequest(
  overrides: Partial<CreateAgentWorkflowHarnessRunRequest> = {},
): CreateAgentWorkflowHarnessRunRequest {
  const base: CreateAgentWorkflowHarnessRunRequest = {
    harness_run_id: 'harness_run_1',
    harness_id: 'harness_1',
    input_snapshot_id: 'input_snapshot_1',
    workflow_type: 'validation_cycle_planning',
    workflow_version: 'validation_cycle_planning.v1',
    run_mode: 'mock',
    execution_mode: 'mocked_llm',
    model_profile_id: 'mock.paper-implementation.validation-cycle-planner.v1',
    prompt_template_version_id: 'prompt_template_v1',
    output_schema_version_id: 'validation_cycle_planning_output_v1',
    raw_output_artifact_ref: ref('artifact', 'raw_output_1'),
    parsed_output_artifact_ref: ref('artifact', 'parsed_output_1'),
    spec: makeSpec(),
    proposal_artifacts: [{
      proposal_artifact_id: 'proposal_1',
      artifact_kind: 'proposal_object',
      target_ref: ref('validation_cycle', 'validation_cycle_1'),
      artifact_ref: ref('artifact', 'proposal_artifact_1'),
      source_refs: [ref('core_motive_version', 'cmv_1')],
      trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_1')],
      payload: { proposal_only: true },
    }],
    quality_signal_candidates: [],
    direct_authority_mutation_refs: [],
    created_by: 'system',
  };
  const merged = { ...base, ...overrides };
  merged.spec = overrides.spec ?? {
    ...base.spec,
    workflow_type: merged.workflow_type,
    workflow_version: merged.workflow_version,
    prompt_policy: {
      ...base.spec.prompt_policy,
      prompt_template_version_id: merged.prompt_template_version_id,
      output_schema_version_id: merged.output_schema_version_id,
    },
    model_policy: {
      ...base.spec.model_policy,
      model_profile_id: merged.model_profile_id,
    },
  };
  return merged;
}

function makeSpec() {
  return {
    workflow_type: 'validation_cycle_planning',
    workflow_version: 'validation_cycle_planning.v1',
    input_policy: {
      required_input_snapshot: true,
      allowed_context_types: ['core_motive_version', 'motive_evidence_board_version', 'trace_manifest'],
      forbidden_context_types: ['display_summary', 'rationale_memo'],
      max_context_tokens: 12_000,
    },
    prompt_policy: {
      prompt_template_version_id: 'prompt_template_v1',
      system_instruction_version_id: 'system_instruction_v1',
      output_schema_version_id: 'validation_cycle_planning_output_v1',
    },
    model_policy: {
      model_profile_id: 'mock.paper-implementation.validation-cycle-planner.v1',
      temperature: 0.1,
      allowed_tools: [],
    },
    output_policy: {
      required_schema: 'validation_cycle_planning_output_v1',
      natural_language_field_contract_version_id: 'nl_field_policy_v1',
      required_ref_fields: ['trace_manifest_refs', 'source_refs'],
      forbidden_outputs: ['authority_write', 'citation_from_memo'],
    },
    validation_policy: {
      schema_validation: true,
      reference_validation: true,
      trace_validation: true,
      claim_boundary_validation: true,
    },
    retry_policy: {
      max_retries: 1,
      retry_on_schema_failure: true,
      retry_on_missing_refs: true,
    },
    audit_policy: {
      save_prompt: true,
      save_input_snapshot: true,
      save_raw_output: true,
      save_parsed_output: true,
      save_validator_results: true,
    },
  } satisfies CreateAgentWorkflowHarnessRunRequest['spec'];
}

function makeTraceManifest(implementationProjectId: string): TraceManifest {
  return {
    trace_manifest_id: 'trace_manifest_1',
    implementation_project_id: implementationProjectId,
    target_ref: ref('validation_cycle', 'validation_cycle_1'),
    lineage: {
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
        log_artifact_refs: [ref('artifact', 'proposal_artifact_1')],
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
    },
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

function makeClaimBoundaryRuntimeRequest(): RunPaperImplementationP1RuntimeReviewRequest {
  const resultPacketRef = ref('result_interpretation_packet', 'result_packet_1');
  const claimTracePacketRef = ref('claim_trace_packet', 'claim_trace_packet_1');
  // T-124 G4.6 structural context refs (service-assembled Create request).
  const claimCandidateRef = ref('claim_candidate', 'claim_candidate_1');
  const traceManifestRef = ref('trace_manifest', 'trace_manifest_claim_1');
  // T-124 G5 FIX-A item 3: the adjudicator's support REU must be a declared source ref.
  const runEvidenceRef = ref('run_evidence_unit', 'run_evidence_unit_1');
  return {
    run_id: 'claim_boundary_runtime_run_1',
    run_mode: 'mock',
    execution_mode: 'mocked_llm',
    model_profile_id: PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
    target_ref: resultPacketRef,
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_1'),
    input_snapshot_hash: testHash('input_snapshot_1'),
    source_refs: [resultPacketRef, claimTracePacketRef, claimCandidateRef, traceManifestRef, runEvidenceRef],
    source_hashes: [
      testHash('result_packet_1'),
      testHash('claim_trace_packet_1'),
      testHash('claim_candidate_1'),
      testHash('trace_manifest_claim_1'),
      testHash('run_evidence_unit_1'),
    ],
    preflight_blocker_codes: [],
    mocked_role_outputs: makeClaimBoundaryRoleOutputs(),
  };
}

function makeClaimBoundaryRoleOutputs(): RunPaperImplementationP1RuntimeReviewRequest['mocked_role_outputs'] {
  return Object.fromEntries(
    PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_REVIEW_ROLE_SLOT_IDS.map((slotId) => [
      slotId,
      makeClaimBoundaryRoleOutput(slotId),
    ]),
  );
}

function makeClaimBoundaryRoleOutput(
  roleSlotId: PaperImplementationP1RuntimeReviewRoleOutput['role_slot_id'],
): PaperImplementationP1RuntimeReviewRoleOutput {
  const final = roleSlotId.endsWith('adjudicator_final');
  return {
    role_slot_id: roleSlotId,
    role_status: 'passed',
    summary: `${roleSlotId} accepted the claim boundary.`,
    cited_source_refs: [ref('result_interpretation_packet', 'result_packet_1')],
    blocker_codes: [],
    warning_codes: [],
    // T-124 G4.6: the adjudicator proposes typed semantic content; the runtime
    // service assembles the CreateClaimCandidateRequest from the request context.
    claim_proposal: final
      ? buildClaimCandidateProposal({
        claim_type: 'method_claim',
        claim_statement: 'Bounded harness claim within the probed setting.',
        claim_strength: 'tentative',
        support_refs: [ref('run_evidence_unit', 'run_evidence_unit_1')],
        scope: {
          population_scope: 'harness fixture runs',
          method_scope: 'runtime orchestration path',
          dataset_scope: 'fixture dataset',
          metric_scope: 'admission correctness',
          negative_scope_notes: [],
          excluded_scope_notes: [],
        },
        boundary_rationale: 'accepted by harness fixture',
        forbidden_overclaims: [],
      })
      : null,
    dossier_proposal: null,
    scenario_outputs: [],
  };
}

function makeRuntimeInvocationResult<T>(
  input: { node_id: string; mocked_output?: { output: T } | null } & Record<string, unknown>,
  output: T,
): TopicSelectionAgentInvocationResult<T> {
  const outputHash = testHash(output);
  const promptPacketHash = testHash({
    node_id: input.node_id,
    messages: input.messages ?? [],
  });
  return {
    schema_version: 'v1',
    node_id: input.node_id,
    workflow_run_id: String(input.workflow_run_id ?? 'claim_boundary_runtime_run_1'),
    node_attempt_id: String(input.node_attempt_id ?? `${input.node_id}.attempt-0`),
    status: 'succeeded',
    structured_output: output,
    provenance: {
      workflow_run_id: String(input.workflow_run_id ?? 'claim_boundary_runtime_run_1'),
      node_id: input.node_id,
      node_attempt_id: String(input.node_attempt_id ?? `${input.node_id}.attempt-0`),
      invocation_attempt_id: String(input.invocation_attempt_id ?? `${input.node_id}.call-1`),
      execution_mode: 'mocked_llm',
      executor_kind: 'multi_agent_debate',
      source_kind: 'mock_fixture',
      non_provider: true,
      run_mode: 'test',
      profile_id: String(input.profile_id ?? PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID),
      profile_version: 'v1',
      profile_hash: testHash(input.profile_id ?? PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID),
      model_option_id: null,
      normalized_params_hash: null,
      capability_degraded: false,
      capability_degrade_reason: null,
      output_contract: String(input.output_contract ?? 'PaperImplementationP1RuntimeReviewRoleArtifact@v1'),
      prompt_template_id: 'paper-implementation-claim-boundary-debate',
      prompt_template_version: 'v1',
      schema_name: String(input.schema_name ?? 'paper_implementation_p1_runtime_review_role_output'),
      prompt_packet_hash: promptPacketHash,
      prompt_packet_cache_status: 'not_applicable',
      prompt_packet_cache_result_ref: null,
      prompt_packet_cache_result_hash: null,
      response_hash: outputHash,
      structured_output_hash: outputHash,
      cache_status: 'not_applicable',
      response_reuse_ref: null,
      telemetry: null,
    },
    validation: { valid: true, error_count: 0, errors: [] },
    token_budget_gate_result: {
      provider_id: null,
      model_id: null,
      profile_id: String(input.profile_id ?? PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID),
      model_option_id: null,
      estimated_input_tokens: 800,
      estimated_output_tokens: 1200,
      context_window_tokens: 128000,
      schema_overhead_tokens: 800,
      decision: 'within_budget',
      compression_strategy_ref: ref('compression_strategy', 'paper-implementation-p1-context-compression'),
      blocker_codes: [],
      warning_codes: [],
    },
    warning_codes: [],
    blocker_codes: [],
    error_code: null,
    audit_snapshot: {
      schema_version: 'topic-selection-agent-invocation-audit-v1',
      node_id: input.node_id,
      workflow_run_id: String(input.workflow_run_id ?? 'claim_boundary_runtime_run_1'),
      node_attempt_id: String(input.node_attempt_id ?? `${input.node_id}.attempt-0`),
      status: 'succeeded',
      provenance: { prompt_packet_hash: promptPacketHash },
      token_budget_gate_result: { decision: 'within_budget' },
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

function emptyIncludedContext(
  overrides: Partial<CreateImplementationInputSnapshotRequest['included_context']> = {},
): CreateImplementationInputSnapshotRequest['included_context'] {
  return {
    motive_version_refs: [],
    board_version_refs: [],
    assertion_refs: [],
    evidence_binding_refs: [],
    route_refs: [],
    probe_refs: [],
    experiment_plan_refs: [],
    work_order_refs: [],
    run_evidence_refs: [],
    result_packet_refs: [],
    accepted_risk_refs: [],
    human_decision_refs: [],
    trace_manifest_refs: [],
    ...overrides,
  };
}

function testHash(value: unknown): string {
  return sha256Text(stableStringify(value));
}

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    version_id: versionId,
  };
}

function makeIdFactory() {
  const counts = new Map<string, number>();
  return (prefix: string) => {
    const next = (counts.get(prefix) ?? 0) + 1;
    counts.set(prefix, next);
    return `${prefix}_${next}`;
  };
}
