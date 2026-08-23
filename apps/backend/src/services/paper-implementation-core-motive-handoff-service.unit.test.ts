import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  CoreMotiveBootstrapProposal,
  ImplementationIntakeSnapshot,
  ImplementationProject,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { InMemoryPaperImplementationHumanConfirmationRepository } from '../repositories/in-memory-paper-implementation-human-confirmation-repository.js';
import { InMemoryPaperImplementationMotiveRepository } from '../repositories/in-memory-paper-implementation-motive-repository.js';
import { InMemoryPaperImplementationRepository } from '../repositories/in-memory-paper-implementation-repository.js';
import { InMemoryPaperImplementationRuntimeRepository } from '../repositories/in-memory-paper-implementation-runtime-repository.js';
import { InMemoryPaperImplementationTraceRepository } from '../repositories/in-memory-paper-implementation-trace-repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { seedAcceptedProposalFixture } from './paper-implementation-acceptance-bridge-test-fixtures.js';
import type {
  CoreMotiveBootstrapIdentity,
  CoreMotiveBootstrapProposalRuntimeResult,
} from './paper-implementation-core-motive-bootstrap-proposal-service.js';
import { PaperImplementationCoreMotiveHandoffService } from './paper-implementation-core-motive-handoff-service.js';
import { PaperImplementationMotiveEvidenceBoardService } from './paper-implementation-motive-evidence-board-service.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import { PaperImplementationTraceKernelService } from './paper-implementation-trace-kernel-service.js';

const NOW = '2026-08-23T00:00:00.000Z';

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_t140',
  };
}

function project(): ImplementationProject {
  return {
    implementation_project_id: 'implementation_project_t140',
    intake_snapshot_id: 'implementation_intake_snapshot_t140',
    workspace_id: 'workspace_t140',
    title_card_id: 'title_card_t140',
    paper_project_bridge_id: 'paper_project_bridge_t140',
    bridge_payload_hash: 'bridge_payload_hash_t140',
    target_paper_project_ref: ref('paper_project', 'paper_project_t140'),
    lifecycle_status: 'active',
    freshness_status: 'fresh',
    source_status: 'active',
    version_number: 1,
    policy_version_id: 'policy_t140_v1',
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
  };
}

function snapshot(withLiterature = true): ImplementationIntakeSnapshot {
  const sourceRefs = [
    ref('topic_package', 'topic_package_t140'),
    ref('human_promotion_decision', 'human_promotion_decision_t140'),
    ...(withLiterature ? [ref('evidence_unit', 'literature_evidence_t140')] : []),
  ];
  return {
    intake_snapshot_id: 'implementation_intake_snapshot_t140',
    implementation_project_id: 'implementation_project_t140',
    workspace_id: 'workspace_t140',
    title_card_id: 'title_card_t140',
    paper_project_bridge_id: 'paper_project_bridge_t140',
    paper_project_bridge_ref: ref('paper_project_bridge', 'paper_project_bridge_t140'),
    bridge_payload_hash: 'bridge_payload_hash_t140',
    promotion_decision_id: 'promotion_decision_t140',
    promotion_decision_ref: ref('promotion_decision', 'promotion_decision_t140'),
    promotion_commitment_profile_id: 'promotion_profile_t140',
    promotion_commitment_profile_ref: ref('promotion_commitment_profile', 'promotion_profile_t140'),
    promotion_input_snapshot_id: 'promotion_input_snapshot_t140',
    promotion_input_snapshot_ref: ref('promotion_input_snapshot', 'promotion_input_snapshot_t140'),
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_t140',
    topic_package_id: 'topic_package_t140',
    package_version: 'v1',
    source_status: 'active',
    snapshot_hashes: {
      bundle_hash: 'bundle_hash_t140',
      package_snapshot_hash: 'package_snapshot_hash_t140',
      package_draft_input_snapshot_hash: 'package_draft_hash_t140',
      promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_t140',
    },
    source_refs: sourceRefs,
    accepted_risk_refs: [ref('accepted_risk', 'accepted_risk_t140')],
    condition_refs: [ref('promotion_condition', 'condition_t140')],
    early_check_obligations: ['Verify the fixed metric before validation planning.'],
    working_copy_payload: {
      editable_title: 'Scoped retrieval-depth comparison',
      problem_statement: 'The effect of retrieval depth is not isolated in the admitted setting.',
      contribution_summary: 'Measure one bounded retrieval-depth effect.',
      evaluation_plan: 'Compare two cells while fixing every non-treatment input.',
      initial_planning_notes: ['Keep the metric and dataset fixed.'],
      claim_ceiling: 'Only claim the bounded comparison in the admitted setting.',
      prohibited_claims: ['Do not claim universal retrieval improvement.'],
      conditions: [{
        condition_id: 'condition_t140',
        condition_code: 'fixed_metric_required',
        owner: { actor_type: 'system' },
        required_action: {
          action_code: 'verify_fixed_metric',
          severity: 'warning',
          loopback_target: 'none',
          refs: [ref('promotion_condition', 'condition_t140')],
          reason: 'Verify the fixed metric before validation planning.',
        },
        refs: [ref('promotion_condition', 'condition_t140')],
        early_check_obligations: ['Verify the fixed metric before validation planning.'],
      }],
      accepted_risk_refs: [ref('accepted_risk', 'accepted_risk_t140')],
      early_check_obligations: ['Verify the fixed metric before validation planning.'],
      source_lineage_summary: { literature_count: withLiterature ? 1 : 0 },
    },
    working_copy_payload_hash: 'working_copy_payload_hash_t140',
    source_handoff: {} as never,
    target_paper_project_ref: ref('paper_project', 'paper_project_t140'),
    intake_snapshot_hash: withLiterature
      ? 'intake_snapshot_hash_t140'
      : 'intake_snapshot_hash_t140_without_literature',
    policy_version_id: 'policy_t140_v1',
    created_by: 'system',
    created_at: NOW,
  };
}

function proposal(): CoreMotiveBootstrapProposal {
  return {
    schema_version: 'CoreMotiveBootstrapProposal@v1',
    motive_contract: {
      short_name: 'Retrieval-depth isolation',
      current_solution_insufficiency: 'Existing comparisons change multiple inputs.',
      unmet_or_failure_mechanism: 'Retrieval depth is confounded with non-treatment changes.',
      target_setting: 'The admitted two-cell retrieval benchmark.',
      why_this_is_not_trivial: 'The comparison must preserve all non-treatment inputs.',
      why_existing_baselines_do_not_already_solve_it: 'Published baselines do not isolate depth.',
      what_makes_this_researchable_now: 'The accepted evaluation plan fixes the comparison.',
    },
    scope_contract: {
      included_scope: ['The admitted retrieval benchmark'],
      excluded_scope: ['Other datasets'],
      non_goals: ['Universal retrieval conclusions'],
    },
    falsification_contract: {
      invalidation_conditions: ['Depth cannot be isolated under the fixed setup.'],
      weakening_conditions: ['The observed effect is below the planned threshold.'],
      minimum_evidence_to_continue: ['One controlled two-cell comparison.'],
      decisive_negative_conditions: ['The controlled effect reverses consistently.'],
    },
    claim_boundary: {
      minimum_defensible_contribution_claim: 'Report the bounded controlled comparison.',
      claim_types_allowed: ['empirical_comparison'],
    },
    route_interface: {
      plausible_route_families: ['controlled two-cell experiment'],
      disallowed_route_families: ['uncontrolled sweep'],
      required_route_properties: ['fixed non-treatment inputs'],
      cheapest_validation_route_hint: 'Run the admitted two cells.',
    },
    assertions: [{
      assertion_type: 'experimental_answerability',
      assertion_text: 'The admitted question is answerable with a controlled two-cell comparison.',
      importance: { role: 'core', must_hold_for_motive_to_continue: true },
      validation_requirements: {
        minimum_support_level: 'moderate',
        required_evidence_types: ['literature', 'experiment_result'],
        required_counter_evidence_check: true,
      },
      falsification: {
        what_would_contradict_this: ['The treatment cannot be isolated.'],
        what_would_weaken_this: ['The metric is too noisy.'],
      },
    }],
  };
}

class PersistedProposalRuntime {
  providerCalls = 0;

  constructor(private readonly runtimeAdmission: PaperImplementationRuntimeAdmissionService) {}

  identity(owner: ImplementationProject, intake: ImplementationIntakeSnapshot): CoreMotiveBootstrapIdentity {
    const bootstrapKey = sha256Text(stableStringify({
      implementation_project_id: owner.implementation_project_id,
      intake_snapshot_hash: intake.intake_snapshot_hash,
      bootstrap_profile_version: 'v1',
    }));
    const suffix = bootstrapKey.slice(0, 32);
    return {
      bootstrapKey,
      roleRuntimeArtifactId: `pi_runtime_core_motive_bootstrap_role_${suffix}`,
      roleRuntimeIdentityHash: sha256Text(`role-runtime:${bootstrapKey}`),
      runtimeArtifactId: `pi_runtime_core_motive_bootstrap_${suffix}`,
      runtimeIdentityHash: sha256Text(`runtime:${bootstrapKey}`),
      motiveId: `core_motive_${suffix}`,
      coreMotiveVersionId: `core_motive_version_${suffix}`,
    };
  }

  async getOrCreate(
    owner: ImplementationProject,
    intake: ImplementationIntakeSnapshot,
  ): Promise<CoreMotiveBootstrapProposalRuntimeResult> {
    const identity = this.identity(owner, intake);
    const existing = await this.runtimeAdmission.findRuntimeArtifact(
      owner.implementation_project_id,
      identity.runtimeArtifactId,
    );
    if (existing) {
      const admissions = await this.runtimeAdmission.listAdmissionRecords(
        owner.implementation_project_id,
        { runtime_artifact_id: existing.runtime_artifact_id, admission_scope: 'final' },
      );
      return {
        status: 'reused',
        proposal: proposal(),
        artifact: existing,
        admission: admissions[0] ?? null,
        blocker: null,
      };
    }
    this.providerCalls += 1;
    const fixture = await seedAcceptedProposalFixture({
      admissionService: this.runtimeAdmission,
      implementationProjectId: owner.implementation_project_id,
      workflowType: 'core_motive_bootstrap',
      runtimeArtifactId: identity.runtimeArtifactId,
      titleCardId: owner.title_card_id,
    });
    const admissions = await this.runtimeAdmission.listAdmissionRecords(
      owner.implementation_project_id,
      { runtime_artifact_id: fixture.artifact.runtime_artifact_id, admission_scope: 'final' },
    );
    return {
      status: 'created',
      proposal: proposal(),
      artifact: fixture.artifact,
      admission: admissions[0] ?? null,
      blocker: null,
    };
  }
}

async function makeHarness(withLiterature = true) {
  const projectRepository = new InMemoryPaperImplementationRepository();
  await projectRepository.createBootstrap({
    implementation_project: project(),
    intake_snapshot: snapshot(withLiterature),
  });
  const motiveRepository = new InMemoryPaperImplementationMotiveRepository();
  const traceRepository = new InMemoryPaperImplementationTraceRepository();
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository: runtimeRepository,
    now: () => NOW,
  });
  const proposalRuntime = new PersistedProposalRuntime(runtimeAdmission);
  const traceKernel = new PaperImplementationTraceKernelService({
    projectRepository,
    traceRepository,
    now: () => NOW,
  });
  const motiveService = new PaperImplementationMotiveEvidenceBoardService({
    projectRepository,
    motiveRepository,
    traceRepository,
    confirmationRepository: new InMemoryPaperImplementationHumanConfirmationRepository(),
    runtimeAdmission,
    now: () => NOW,
  });
  return {
    service: new PaperImplementationCoreMotiveHandoffService({
      projectRepository,
      motiveRepository,
      proposalRuntime,
      motiveService,
      traceKernel,
    }),
    motiveRepository,
    traceRepository,
    runtimeAdmission,
    proposalRuntime,
  };
}

test('CoreMotive handoff creates one admitted first-primary motive and replays every owner', async () => {
  const harness = await makeHarness();
  const command = { implementation_project_id: 'implementation_project_t140' };
  const first = await harness.service.continue(command);
  assert.equal(first.status, 'created');
  assert.equal(first.semantic_stage, 'core_motive_admitted');
  assert.deepEqual(first.effects.performed, [
    'proposal_artifact',
    'core_motive_draft',
    'trace_manifest',
    'core_motive_admission',
  ]);
  assert.equal(first.next_action.action, 'continue_validation_planning');
  assert.equal(first.semantic_context.admitted_core_motive?.maximum_allowed_claim,
    'Only claim the bounded comparison in the admitted setting.');
  assert.deepEqual(first.semantic_context.admitted_core_motive?.forbidden_overclaims,
    ['Do not claim universal retrieval improvement.']);

  const replay = await harness.service.continue(command);
  assert.equal(replay.status, 'resumed');
  assert.deepEqual(replay.effects.performed, []);
  assert.deepEqual(replay.effects.reused, [
    'proposal_artifact',
    'core_motive_draft',
    'trace_manifest',
    'core_motive_admission',
  ]);
  assert.deepEqual(replay.lineage, first.lineage);
  assert.equal(harness.proposalRuntime.providerCalls, 1);
  assert.equal((await harness.motiveRepository.listMotiveIdentities(command.implementation_project_id)).length, 1);
  assert.equal((await harness.traceRepository.listTraceManifests(command.implementation_project_id)).length, 1);
  assert.equal((await harness.runtimeAdmission.listRuntimeArtifacts(command.implementation_project_id)).length, 1);
});

test('concurrent CoreMotive handoffs singleflight the proposal and converge to one authority set', async () => {
  const harness = await makeHarness();
  const command = { implementation_project_id: 'implementation_project_t140' };
  const responses = await Promise.all([
    harness.service.continue(command),
    harness.service.continue(command),
  ]);
  assert.deepEqual(responses.map((response) => response.status).sort(), ['created', 'resumed']);
  assert.equal(harness.proposalRuntime.providerCalls, 1);
  assert.equal((await harness.motiveRepository.listMotiveIdentities(command.implementation_project_id)).length, 1);
  assert.equal((await harness.traceRepository.listTraceManifests(command.implementation_project_id)).length, 1);
});

test('CoreMotive handoff blocks before LLM when the accepted owner has no literature evidence', async () => {
  const harness = await makeHarness(false);
  const response = await harness.service.continue({
    implementation_project_id: 'implementation_project_t140',
  });
  assert.equal(response.status, 'blocked');
  assert.equal(response.semantic_stage, 'proposal');
  assert.equal(response.blocker?.code, 'CORE_MOTIVE_BOOTSTRAP_LITERATURE_EVIDENCE_REQUIRED');
  assert.equal(harness.proposalRuntime.providerCalls, 0);
  assert.deepEqual(await harness.motiveRepository.listMotiveIdentities('implementation_project_t140'), []);
});
