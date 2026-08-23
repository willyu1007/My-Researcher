import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ImplementationIntakeSnapshot,
  ImplementationProject,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  PaperImplementationCoordinatorRun,
  PaperImplementationCoordinatorRunWithSteps,
  CreatePaperImplementationCoordinatorRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-coordinator-contracts';
import type {
  CoreMotiveDraftResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';
import {
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
  type PaperImplementationEvidenceBoardCurationArtifact,
  type PaperImplementationRuntimeArtifactEnvelope,
  type RunPaperImplementationEvidenceBoardCurationRuntimeRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TraceLineageBundle,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  TopicSelectionEvidenceMapCreateRecords,
} from '../repositories/topic-selection-evidence-map.repository.js';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationHumanConfirmationRepository } from '../repositories/in-memory-paper-implementation-human-confirmation-repository.js';
import { InMemoryPaperImplementationMotiveRepository } from '../repositories/in-memory-paper-implementation-motive-repository.js';
import { InMemoryPaperImplementationRepository } from '../repositories/in-memory-paper-implementation-repository.js';
import { InMemoryPaperImplementationRuntimeRepository } from '../repositories/in-memory-paper-implementation-runtime-repository.js';
import { InMemoryPaperImplementationTraceRepository } from '../repositories/in-memory-paper-implementation-trace-repository.js';
import { InMemoryTopicSelectionEvidenceMapRepository } from '../repositories/in-memory-topic-selection-evidence-map-repository.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import { PaperImplementationEvidenceBoardHandoffService } from './paper-implementation-evidence-board-handoff-service.js';
import { PaperImplementationMotiveEvidenceBoardService } from './paper-implementation-motive-evidence-board-service.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import { resolvePaperImplementationScientificContinuationStage } from './paper-implementation-scientific-continuation-stage-resolver.js';
import { PaperImplementationTraceKernelService } from './paper-implementation-trace-kernel-service.js';

const NOW = '2026-08-23T00:00:00.000Z';
const PROJECT_ID = 'implementation_project_t141';
const TITLE_CARD_ID = 'title_card_t141';
const MOTIVE_ID = 'core_motive_t141';
const VERSION_ID = 'core_motive_version_t141';
const ASSERTION_ID = 'motive_assertion_t141';
const EVIDENCE_UNIT_ID = 'evidence_unit_t141';
const LOCATOR_ID = 'source_locator_t141';

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: TITLE_CARD_ID,
    ...(versionId ? { version_id: versionId } : {}),
  };
}

function literatureLineage(): TraceLineageBundle {
  return {
    literature: {
      literature_evidence_refs: [ref('evidence_unit', EVIDENCE_UNIT_ID, 'v1')],
      source_locator_refs: [ref('source_locator', LOCATOR_ID)],
      citation_candidate_refs: [],
    },
    experiment: {
      experiment_plan_refs: [], work_order_refs: [], run_refs: [], run_evidence_refs: [],
      result_packet_refs: [], metric_refs: [],
    },
    artifact: {
      dataset_refs: [], baseline_refs: [], code_version_refs: [], model_checkpoint_refs: [],
      config_refs: [], log_artifact_refs: [],
    },
    decision: {
      validation_cycle_refs: [], motive_evolution_decision_refs: [], gate_result_refs: [],
      human_decision_refs: [], accepted_risk_refs: [],
    },
    internal_interpretation: {
      result_interpretation_refs: [], llm_rationale_refs: [], board_summary_refs: [], non_citable_refs: [],
    },
  };
}

function project(): ImplementationProject {
  return {
    implementation_project_id: PROJECT_ID,
    intake_snapshot_id: 'implementation_intake_snapshot_t141',
    workspace_id: 'workspace_t141',
    title_card_id: TITLE_CARD_ID,
    paper_project_bridge_id: 'paper_project_bridge_t141',
    bridge_payload_hash: 'bridge_payload_hash_t141',
    target_paper_project_ref: ref('paper_project', 'paper_project_t141'),
    lifecycle_status: 'active',
    freshness_status: 'fresh',
    source_status: 'active',
    version_number: 1,
    policy_version_id: 'policy_t141_v1',
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
  };
}

function snapshot(): ImplementationIntakeSnapshot {
  return {
    intake_snapshot_id: 'implementation_intake_snapshot_t141',
    implementation_project_id: PROJECT_ID,
    workspace_id: 'workspace_t141',
    title_card_id: TITLE_CARD_ID,
    paper_project_bridge_id: 'paper_project_bridge_t141',
    paper_project_bridge_ref: ref('paper_project_bridge', 'paper_project_bridge_t141'),
    bridge_payload_hash: 'bridge_payload_hash_t141',
    promotion_decision_id: 'promotion_decision_t141',
    promotion_decision_ref: ref('promotion_decision', 'promotion_decision_t141'),
    promotion_commitment_profile_id: 'promotion_profile_t141',
    promotion_commitment_profile_ref: ref('promotion_commitment_profile', 'promotion_profile_t141'),
    promotion_input_snapshot_id: 'promotion_input_snapshot_t141',
    promotion_input_snapshot_ref: ref('promotion_input_snapshot', 'promotion_input_snapshot_t141'),
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_t141',
    topic_package_id: 'topic_package_t141',
    package_version: 'v1',
    source_status: 'active',
    snapshot_hashes: {
      bundle_hash: 'bundle_hash_t141',
      package_snapshot_hash: 'package_snapshot_hash_t141',
      package_draft_input_snapshot_hash: 'package_draft_hash_t141',
      promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_t141',
    },
    source_refs: [
      ref('topic_package', 'topic_package_t141'),
      ref('evidence_unit', EVIDENCE_UNIT_ID, 'v1'),
    ],
    accepted_risk_refs: [],
    condition_refs: [],
    early_check_obligations: ['Keep the pre-experiment claim bounded.'],
    working_copy_payload: {
      editable_title: 'Traceable evidence-board continuation',
      problem_statement: 'The admitted motive needs a literature-backed board.',
      contribution_summary: 'Preserve the bounded pre-experiment rationale.',
      evaluation_plan: 'Validate the assertion after evidence-board readiness.',
      initial_planning_notes: [],
      claim_ceiling: 'Only claim the bounded admitted setting.',
      prohibited_claims: ['Do not claim experimental support before a run.'],
      conditions: [],
      accepted_risk_refs: [],
      early_check_obligations: ['Keep the pre-experiment claim bounded.'],
      source_lineage_summary: { literature_count: 1 },
    },
    working_copy_payload_hash: 'working_copy_payload_hash_t141',
    source_handoff: {} as never,
    target_paper_project_ref: ref('paper_project', 'paper_project_t141'),
    intake_snapshot_hash: 'intake_snapshot_hash_t141',
    policy_version_id: 'policy_t141_v1',
    created_by: 'system',
    created_at: NOW,
  };
}

function admittedMotive(traceManifestId: string): CoreMotiveDraftResponse {
  return {
    motive_identity: {
      motive_id: MOTIVE_ID,
      implementation_project_id: PROJECT_ID,
      current_version_id: VERSION_ID,
      origin: {
        source_topic_package_id: 'topic_package_t141',
        source_validated_need_ids: [],
        source_topic_question_contract_id: 'topic_question_t141',
        created_from_motive_ids: [],
      },
      portfolio_role: {
        role: 'primary',
        role_since: NOW,
        role_decision_ref: ref('motive_portfolio_decision', 'motive_portfolio_decision_t141'),
      },
      lifecycle_status: 'active',
      lineage: {
        merged_into_motive_id: null,
        split_into_motive_ids: [],
        superseded_by_motive_id: null,
        parent_motive_ids: [],
        child_motive_ids: [],
      },
      control: { owner: null, human_confirmation_required_for_major_change: true },
      policy_version_id: 'policy_t141_v1',
      created_by: 'system',
      created_at: NOW,
      updated_at: NOW,
    },
    motive_set: {
      motive_set_id: 'core_motive_set_t141',
      implementation_project_id: PROJECT_ID,
      active_motive_ids: [MOTIVE_ID],
      primary_motive_ids: [MOTIVE_ID],
      secondary_motive_ids: [],
      fallback_motive_ids: [],
      supporting_motive_ids: [],
      parked_motive_ids: [],
      abandoned_motive_ids: [],
      active_motive_count: 1,
      max_active_motives: 3,
      max_primary_motives: 1,
      max_parallel_routes: 2,
      latest_portfolio_decision_id: 'motive_portfolio_decision_t141',
      policy_version_id: 'policy_t141_v1',
      created_at: NOW,
      updated_at: NOW,
    },
    core_motive_version: {
      core_motive_version_id: VERSION_ID,
      motive_id: MOTIVE_ID,
      implementation_project_id: PROJECT_ID,
      version_number: 1,
      version_status: 'admitted',
      version_origin: {
        created_by_decision_id: null,
        previous_version_id: null,
        derived_from_motive_version_ids: [],
        derivation_type: 'initial',
      },
      motive_contract: {
        short_name: 'Traceable board seed',
        motivation_claim: 'A traceable literature board is needed before validation.',
        problem_pressure: 'Unbound evidence makes the motive hard to audit.',
        current_solution_insufficiency: 'The admitted source is not yet assertion-bound.',
        unmet_or_failure_mechanism: 'Evidence lineage is lost between topic and implementation.',
        target_setting: 'The admitted paper project.',
        expected_contribution_path: 'Bind reviewed literature evidence to the core assertion.',
        why_this_is_not_trivial: 'The binding must preserve locator and citation authority.',
        why_existing_baselines_do_not_already_solve_it: 'The owner has evidence but no board.',
        what_makes_this_researchable_now: 'The EvidenceMap authority is persisted.',
      },
      scope_contract: {
        included_scope: ['The admitted paper project'],
        excluded_scope: ['Experimental results'],
        non_goals: ['Universal claims'],
        task_scope: 'Evidence-board curation',
      },
      boundary_to_upstream: {
        topic_question_contract_id: 'topic_question_t141',
        research_slice_id: 'research_slice_t141',
        within_upstream_boundary: true,
        boundary_risk_notes: [],
        upstream_recheck_required: false,
      },
      falsification_contract: {
        invalidation_conditions: ['The evidence cannot be traced.'],
        weakening_conditions: ['The evidence only partially covers the assertion.'],
        minimum_evidence_to_continue: ['One reviewed and located source.'],
        decisive_negative_conditions: ['The source contradicts the admitted assertion.'],
      },
      claim_boundary: {
        maximum_allowed_claim: 'Only claim a traceable pre-experiment rationale.',
        minimum_defensible_contribution_claim: 'A reviewed source supports validation planning.',
        forbidden_overclaims: ['Do not claim experimental support.'],
        claim_types_allowed: ['motivation_claim'],
      },
      route_interface: {
        plausible_route_families: ['validation planning'],
        disallowed_route_families: ['uncontrolled execution'],
        required_route_properties: ['trace complete'],
        cheapest_validation_route_hint: 'Plan one bounded validation cycle.',
      },
      source_refs: [ref('evidence_unit', EVIDENCE_UNIT_ID, 'v1')],
      source_result_packet_refs: [],
      source_human_judgment_refs: [],
      trace_manifest_ref: ref('trace_manifest', traceManifestId),
      trace_manifest_id: traceManifestId,
      admission_gate_result_id: 'gate_result_t141',
      evolution_decision_id: null,
      hypothesis_only: false,
      policy_version_id: 'policy_t141_v1',
      created_by: 'system',
      created_at: NOW,
      admitted_at: NOW,
    },
    motive_version_state: {
      motive_version_state_id: 'motive_version_state_t141',
      implementation_project_id: PROJECT_ID,
      motive_id: MOTIVE_ID,
      core_motive_version_id: VERSION_ID,
      review_status: 'reviewed',
      freshness_status: 'fresh',
      maturity_level: 'L1_evidence_backed',
      board_readiness_status: 'not_ready',
      evidence_status: 'insufficient',
      feasibility_status: 'not_checked',
      result_status: 'no_results',
      current_board_version_id: null,
      latest_validation_cycle_id: null,
      latest_evolution_decision_id: null,
      blocker_refs: [],
      accepted_risk_refs: [],
      updated_at: NOW,
    },
    assertions: [{
      assertion_id: ASSERTION_ID,
      implementation_project_id: PROJECT_ID,
      motive_id: MOTIVE_ID,
      core_motive_version_id: VERSION_ID,
      assertion_type: 'current_solution_insufficiency',
      assertion_text: 'The admitted source supports a bounded pre-experiment rationale.',
      importance: { role: 'core', must_hold_for_motive_to_continue: true },
      validation_requirements: {
        minimum_support_level: 'moderate',
        required_evidence_types: ['literature'],
        required_counter_evidence_check: true,
      },
      falsification: {
        what_would_contradict_this: ['The source contradicts the rationale.'],
        what_would_weaken_this: ['The source only covers an adjacent setting.'],
      },
      status: 'partially_supported',
      created_by: 'system',
      created_at: NOW,
    }],
  };
}

function evidenceMap(): TopicSelectionEvidenceMapCreateRecords {
  const searchRunRef = ref('search_run', 'search_run_t141');
  const searchPlanRef = ref('search_plan', 'search_plan_t141');
  const literatureSnapshotRef = ref('literature_snapshot', 'literature_snapshot_t141');
  const literatureRef = ref('literature_record', 'literature_record_t141');
  return {
    evidence_map: {
      evidence_map_id: 'evidence_map_t141',
      workspace_id: 'workspace_t141',
      title_card_id: TITLE_CARD_ID,
      evidence_map_version: 'v1',
      status: 'ready',
      review_status: 'machine_checked',
      freshness_status: 'current',
      search_run_ref: searchRunRef,
      search_plan_ref: searchPlanRef,
      literature_snapshot_ref: literatureSnapshotRef,
      unit_count: 1,
      support_unit_count: 1,
      challenge_unit_count: 0,
      baseline_unit_count: 0,
      context_unit_count: 0,
      digest_payload: {},
      stale_reason_codes: [],
      artifact_refs: [],
      created_by: 'system',
      created_at: NOW,
    },
    evidence_units: [{
      evidence_unit_id: EVIDENCE_UNIT_ID,
      workspace_id: 'workspace_t141',
      title_card_id: TITLE_CARD_ID,
      evidence_map_id: 'evidence_map_t141',
      evidence_map_version: 'v1',
      search_run_ref: searchRunRef,
      search_plan_ref: searchPlanRef,
      literature_snapshot_ref: literatureSnapshotRef,
      literature_ref: literatureRef,
      source_refs: [literatureRef],
      locator: {
        locator_type: 'section',
        locator_ref: ref('source_locator', LOCATOR_ID),
        literature_ref: literatureRef,
        source_ref: literatureRef,
        section_ref: ref('literature_section', 'literature_section_t141'),
        page_number: 4,
      },
      evidence_role: 'support',
      source_attribution_kind: 'source_claim',
      source_statement: 'The prior study reports the bounded failure in the admitted setting.',
      normalized_statement: 'Prior work reports the bounded failure in the admitted setting.',
      interpretation_payload: {},
      extraction_confidence: 0.94,
      abstract_only: false,
      review_status: 'machine_checked',
      freshness_status: 'current',
      issue_codes: [],
      created_by: 'system',
      created_at: NOW,
    }],
    typed_links: [],
    clusters: [],
    patterns: [],
    conflict_sets: [],
  };
}

class ArtifactReader {
  artifact: PaperImplementationRuntimeArtifactEnvelope | null = null;

  async findRuntimeArtifactById(
    implementationProjectId: string,
    runtimeArtifactId: string,
  ): Promise<PaperImplementationRuntimeArtifactEnvelope | null> {
    return this.artifact?.implementation_project_id === implementationProjectId
      && this.artifact.runtime_artifact_id === runtimeArtifactId
      ? structuredClone(this.artifact)
      : null;
  }
}

class CurationCoordinator {
  createCalls = 0;
  advanceCalls = 0;
  private run: PaperImplementationCoordinatorRun | null = null;
  private steps: PaperImplementationCoordinatorRunWithSteps['steps'] = [];

  constructor(
    private readonly artifactReader: ArtifactReader,
    private readonly outcome: 'passed' | 'gap' | 'weak',
  ) {}

  async createCoordinatorRun(
    implementationProjectId: string,
    request: CreatePaperImplementationCoordinatorRunRequest,
  ): Promise<PaperImplementationCoordinatorRun> {
    if (this.run) {
      throw new AppError(409, 'VERSION_CONFLICT', 'CoordinatorRun already exists.');
    }
    this.createCalls += 1;
    this.run = {
      schema_version: 'PaperImplementationCoordinatorRun@v1',
      coordinator_run_id: request.coordinator_run_id!,
      implementation_project_id: implementationProjectId,
      lane_id: request.lane_id,
      run_status: 'created',
      run_mode: request.run_mode,
      execution_mode: request.execution_mode,
      model_profile_id: request.model_profile_id ?? null,
      model_option_id: request.model_option_id ?? null,
      budget_envelope: request.budget_envelope,
      consumed: { steps: 0, provider_calls: 0 },
      lease: null,
      slot_request_payloads: structuredClone(request.slot_request_payloads),
      created_at: NOW,
      updated_at: NOW,
    };
    return structuredClone(this.run);
  }

  async getCoordinatorRun(): Promise<PaperImplementationCoordinatorRunWithSteps> {
    assert.ok(this.run);
    return { run: structuredClone(this.run), steps: structuredClone(this.steps) };
  }

  async advance(): Promise<PaperImplementationCoordinatorRunWithSteps> {
    assert.ok(this.run);
    this.advanceCalls += 1;
    const slotPayload = this.run.slot_request_payloads[
      PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID
    ];
    const slot = slotPayload as unknown as Omit<
      RunPaperImplementationEvidenceBoardCurationRuntimeRequest,
      'run_mode' | 'execution_mode'
    >;
    const artifactPayload: PaperImplementationEvidenceBoardCurationArtifact = {
      status: this.outcome === 'gap' ? 'blocked' : 'passed',
      slot_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
      workflow_type: 'evidence_board_curation',
      curation_mode: 'seed_initial_board_candidates',
      target_ref: slot.target_ref,
      target_motive_ref: slot.target_motive_ref,
      target_core_motive_version_ref: slot.target_core_motive_version_ref,
      target_board_ref: null,
      target_board_hash: null,
      target_assertion_refs: slot.target_assertion_refs,
      preflight_blockers: [],
      role_summary: this.outcome === 'gap' ? null : 'One reviewed source covers the required assertion.',
      role_blocker_codes: [],
      role_warning_codes: [],
      blockers: this.outcome === 'gap' ? ['required_assertion_gap'] : [],
      warnings: [],
      runtime_failure_code: null,
      runtime_control: null,
      reviewed_assertion_refs: slot.target_assertion_refs,
      reviewed_source_locator_refs: slot.source_locator_refs,
      reviewed_citation_candidate_refs: slot.reviewed_citation_candidate_refs,
      reviewed_evidence_refs: slot.evidence_refs,
      reviewed_existing_evidence_binding_refs: [],
      binding_candidate_proposals: this.outcome !== 'gap' ? [{
        candidate_key: 'binding_candidate_t141',
        target_assertion_ref: slot.target_assertion_refs[0]!,
        evidence_ref: slot.evidence_refs[0]!,
        source_locator_refs: slot.source_locator_refs,
        citation_candidate_refs: slot.reviewed_citation_candidate_refs,
        proposed_role: 'supporting_evidence',
        proposed_scope: 'assertion_local',
        proposed_strength: this.outcome === 'weak' ? 'weak' : 'moderate',
        support_state: 'viable_binding',
        challenge_status: 'passed',
        freshness_status: 'fresh',
        interpretation: 'The reviewed source supports the bounded admitted assertion.',
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
      }] : [],
      gap_candidate_proposals: this.outcome === 'gap' ? [{
        gap_key: 'gap_t141',
        target_assertion_ref: slot.target_assertion_refs[0]!,
        gap_kind: 'unsupported_assertion',
        missing_evidence_need: 'A reviewed source must cover the required assertion.',
        source_locator_blockers: [],
        citation_blockers: [],
        freshness_blockers: [],
        recommended_next_gate: 'motive_evidence_board_review',
        blocker_codes: ['required_assertion_gap'],
        warning_codes: [],
      }] : [],
      recommended_disposition: this.outcome === 'gap' ? 'blocked' : 'proceed',
      no_domain_gate_request: true,
      no_queue_side_effect: true,
      no_board_write_side_effect: true,
      no_evidence_binding_side_effect: true,
      no_evidence_transfer_binding_side_effect: true,
      no_citation_candidate_side_effect: true,
      no_trace_repair_queue_side_effect: true,
      role_artifact_refs: [],
      role_artifact_hashes: [],
      admitted_role_artifact_refs: [],
      admitted_role_artifact_hashes: [],
      role_prompt_packet_refs: [],
      role_prompt_packet_hashes: [],
      role_token_budget_gate_result_refs: [],
      role_compression_report_refs: [],
      runtime_identity: {},
      cache_identity: {},
      source_refs: slot.source_refs,
      source_hash_bundle_hash: sha256Text(stableStringify(slot.source_hashes)),
    };
    const artifactHash = sha256Text(stableStringify(artifactPayload));
    this.artifactReader.artifact = {
      implementation_project_id: PROJECT_ID,
      runtime_artifact_id: 'runtime_artifact_curation_t141',
      slot_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
      artifact_payload: artifactPayload as unknown as Record<string, unknown>,
      artifact_payload_hash: artifactHash,
      final_artifact_hash: artifactHash,
    } as unknown as PaperImplementationRuntimeArtifactEnvelope;
    const step = { runtime_artifact_id: this.artifactReader.artifact.runtime_artifact_id } as
      PaperImplementationCoordinatorRunWithSteps['steps'][number];
    this.steps = [step];
    this.run = {
      ...this.run,
      run_status: 'completed',
      consumed: { steps: 1, provider_calls: 1 },
      updated_at: NOW,
    };
    return this.getCoordinatorRun();
  }
}

async function makeHarness(
  outcome: 'passed' | 'gap' | 'weak' = 'passed',
  options: { failFirstBoardWrite?: boolean } = {},
) {
  const projectRepository = new InMemoryPaperImplementationRepository();
  await projectRepository.createBootstrap({
    implementation_project: project(),
    intake_snapshot: snapshot(),
  });
  const motiveRepository = new InMemoryPaperImplementationMotiveRepository();
  const traceRepository = new InMemoryPaperImplementationTraceRepository();
  const traceKernel = new PaperImplementationTraceKernelService({
    projectRepository,
    traceRepository,
    now: () => NOW,
  });
  const motiveTrace = await traceKernel.ensureTraceManifest(PROJECT_ID, 'trace_manifest_core_t141', {
    target_ref: ref('core_motive_version', VERSION_ID, 'v1'),
    lineage: literatureLineage(),
    created_by: 'system',
  });
  assert.equal(motiveTrace.manifest.trace_status, 'complete');
  await motiveRepository.createCoreMotiveDraft(admittedMotive(motiveTrace.manifest.trace_manifest_id));

  const evidenceMapRepository = new InMemoryTopicSelectionEvidenceMapRepository();
  await evidenceMapRepository.createEvidenceMapWithRecords(evidenceMap());
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const boardAuthority = new PaperImplementationMotiveEvidenceBoardService({
    projectRepository,
    motiveRepository,
    traceRepository,
    confirmationRepository: new InMemoryPaperImplementationHumanConfirmationRepository(),
    runtimeAdmission: new PaperImplementationRuntimeAdmissionService({
      repository: runtimeRepository,
      now: () => NOW,
    }),
    now: () => NOW,
  });
  let boardWriteCalls = 0;
  let failNextBoardWrite = options.failFirstBoardWrite === true;
  const boardWriter = {
    createMotiveEvidenceBoardVersion: async (
      ...args: Parameters<PaperImplementationMotiveEvidenceBoardService['createMotiveEvidenceBoardVersion']>
    ) => {
      boardWriteCalls += 1;
      if (failNextBoardWrite) {
        failNextBoardWrite = false;
        throw new Error('simulated board-writer interruption');
      }
      return boardAuthority.createMotiveEvidenceBoardVersion(...args);
    },
  };
  const artifactReader = new ArtifactReader();
  const coordinator = new CurationCoordinator(artifactReader, outcome);
  const service = new PaperImplementationEvidenceBoardHandoffService({
    projectRepository,
    motiveRepository,
    evidenceMapRepository,
    runtimeRepository: artifactReader,
    traceKernel,
    boardWriter,
    coordinator,
  });
  return {
    service,
    motiveRepository,
    traceRepository,
    evidenceMapRepository,
    traceKernel,
    boardAuthority,
    coordinator,
    boardWriteCalls: () => boardWriteCalls,
  };
}

test('Evidence Board handoff creates one trace-complete board and replays from owner authority without another LLM run', async () => {
  const harness = await makeHarness();
  const command = { implementation_project_id: PROJECT_ID };

  const first = await harness.service.continue(command);
  assert.equal(first.status, 'created');
  assert.equal(first.semantic_stage, 'evidence_board_ready');
  assert.deepEqual(first.effects.performed, [
    'citation_context',
    'curation_artifact',
    'trace_manifests',
    'evidence_board',
  ]);
  assert.equal(first.semantic_context.source_evidence_count, 1);
  assert.equal(first.semantic_context.board?.binding_count, 1);
  assert.equal(first.next_action.action, 'continue_validation_planning');
  assert.equal(harness.coordinator.createCalls, 1);
  assert.equal(harness.coordinator.advanceCalls, 1);

  const replay = await harness.service.continue(command);
  assert.equal(replay.status, 'resumed');
  assert.deepEqual(replay.effects.performed, []);
  assert.deepEqual(replay.effects.reused, [
    'citation_context',
    'curation_artifact',
    'trace_manifests',
    'evidence_board',
  ]);
  assert.deepEqual(replay.lineage, first.lineage);
  assert.deepEqual(replay.semantic_context, first.semantic_context);
  assert.equal(harness.coordinator.createCalls, 1);
  assert.equal(harness.coordinator.advanceCalls, 1);
  assert.equal((await harness.motiveRepository.listMotiveEvidenceBoards(PROJECT_ID)).length, 1);
  assert.equal((await harness.traceRepository.listCitationCandidates(PROJECT_ID)).length, 1);
  assert.equal((await harness.traceRepository.listTraceManifests(PROJECT_ID)).length, 4);

  const downstream = resolvePaperImplementationScientificContinuationStage({
    implementation_project_id: PROJECT_ID,
    project_lifecycle_status: 'active',
    has_admitted_motive: true,
    coordinator_runs: [{
      coordinator_run_id: first.lineage.coordinator_run_id!,
      lane_id: 'evidence-board-curation',
      run_status: 'completed',
    }],
    active_validation_cycle_count: 0,
    validation_cycle_id: null,
    validation_cycle_status: null,
    experiment: null,
    closure_id: null,
    result_packet_id: null,
    claim_id: null,
    claim_requires_human_confirmation: false,
    dossier_id: null,
    dossier_status: null,
    dossier_trace_status: null,
  });
  assert.equal(downstream.response.blocker?.code, 'VALIDATION_PLANNING_RUN_NOT_STARTED');
  assert.equal(downstream.automatic_action, null);
});

test('Evidence Board handoff reuses a pre-existing eligible board without requiring T-141 curation lineage', async () => {
  const harness = await makeHarness();
  const bindingId = 'evidence_binding_preexisting_t141';
  const boardId = 'motive_evidence_board_preexisting_t141';
  const bindingTrace = await harness.traceKernel.ensureTraceManifest(
    PROJECT_ID,
    'trace_manifest_binding_preexisting_t141',
    {
      target_ref: ref('evidence_binding', bindingId),
      lineage: literatureLineage(),
      created_by: 'system',
    },
  );
  const boardTrace = await harness.traceKernel.ensureTraceManifest(
    PROJECT_ID,
    'trace_manifest_board_preexisting_t141',
    {
      target_ref: ref('motive_evidence_board_version', boardId),
      lineage: literatureLineage(),
      created_by: 'system',
    },
  );
  await harness.boardAuthority.createMotiveEvidenceBoardVersion(PROJECT_ID, {
    board_version_id: boardId,
    motive_id: MOTIVE_ID,
    core_motive_version_id: VERSION_ID,
    bindings: [{
      binding_id: bindingId,
      assertion_id: ASSERTION_ID,
      evidence_ref: ref('evidence_unit', EVIDENCE_UNIT_ID, 'v1'),
      role: 'support',
      scope: { task_scope: 'Evidence-board curation' },
      strength: {
        directness: 'moderate',
        reliability: 'medium',
        reproducibility: 'unknown',
        freshness: 'fresh',
      },
      support_state: 'partial',
      challenge_status: 'addressed',
      interpretation: {
        normalized_statement: 'The reviewed source supports the bounded admitted assertion.',
        why_relevant_to_assertion: 'It covers the required pre-experiment rationale.',
        limitations: ['No experimental result exists yet.'],
      },
      trace_manifest_id: bindingTrace.manifest.trace_manifest_id,
    }],
    board_summary: {
      current_support_summary: 'One existing reviewed source supports the assertion.',
      current_challenge_summary: 'The source limitation remains explicit.',
      unresolved_conflicts: [],
      board_gap_summary: 'No pre-validation evidence gap remains.',
      next_evidence_needed: ['Plan the bounded validation cycle.'],
    },
    board_state: {
      readiness_status: 'evidence_ready',
      blocker_status: 'none',
      freshness_status: 'fresh',
      support_state: 'partial',
      challenge_status: 'addressed',
      accepted_risk_refs: [],
    },
    trace_manifest_id: boardTrace.manifest.trace_manifest_id,
    created_by: 'system',
  });

  const response = await harness.service.continue({ implementation_project_id: PROJECT_ID });
  assert.equal(response.status, 'resumed');
  assert.equal(response.lineage.board_version_id, boardId);
  assert.equal(response.lineage.coordinator_run_id, null);
  assert.equal(response.lineage.curation_runtime_artifact_id, null);
  assert.deepEqual(response.effects.reused, ['trace_manifests', 'evidence_board']);
  assert.deepEqual(response.effects.performed, []);
  assert.equal(harness.coordinator.createCalls, 0);
  assert.equal(harness.coordinator.advanceCalls, 0);
  assert.equal((await harness.traceRepository.listCitationCandidates(PROJECT_ID)).length, 0);
  assert.equal((await harness.motiveRepository.listMotiveEvidenceBoards(PROJECT_ID)).length, 1);
});

test('concurrent Evidence Board handoffs converge to one provider run and one authority set', async () => {
  const harness = await makeHarness();
  const command = { implementation_project_id: PROJECT_ID };
  const responses = await Promise.all([
    harness.service.continue(command),
    harness.service.continue(command),
  ]);

  assert.deepEqual(responses[0], responses[1]);
  assert.equal(harness.coordinator.createCalls, 1);
  assert.equal(harness.coordinator.advanceCalls, 1);
  assert.equal((await harness.motiveRepository.listMotiveEvidenceBoards(PROJECT_ID)).length, 1);
  assert.equal((await harness.traceRepository.listCitationCandidates(PROJECT_ID)).length, 1);
  assert.equal((await harness.traceRepository.listTraceManifests(PROJECT_ID)).length, 4);
});

test('singleflight remains isolated to each service instance', async () => {
  const firstHarness = await makeHarness();
  const secondHarness = await makeHarness();
  const command = { implementation_project_id: PROJECT_ID };

  const [first, second] = await Promise.all([
    firstHarness.service.continue(command),
    secondHarness.service.continue(command),
  ]);

  assert.equal(first.status, 'created');
  assert.equal(second.status, 'created');
  assert.equal(firstHarness.coordinator.advanceCalls, 1);
  assert.equal(secondHarness.coordinator.advanceCalls, 1);
});

test('Evidence Board handoff resumes a persisted curation artifact after an interrupted board write', async () => {
  const harness = await makeHarness('passed', { failFirstBoardWrite: true });
  const command = { implementation_project_id: PROJECT_ID };

  await assert.rejects(
    harness.service.continue(command),
    /simulated board-writer interruption/,
  );
  assert.equal(harness.coordinator.createCalls, 1);
  assert.equal(harness.coordinator.advanceCalls, 1);
  assert.deepEqual(await harness.motiveRepository.listMotiveEvidenceBoards(PROJECT_ID), []);

  const resumed = await harness.service.continue(command);
  assert.equal(resumed.status, 'created');
  assert.deepEqual(resumed.effects.performed, ['evidence_board']);
  assert.deepEqual(resumed.effects.reused, [
    'citation_context',
    'curation_artifact',
    'trace_manifests',
  ]);
  assert.equal(harness.coordinator.createCalls, 1);
  assert.equal(harness.coordinator.advanceCalls, 1);
  assert.equal(harness.boardWriteCalls(), 2);
  assert.equal((await harness.motiveRepository.listMotiveEvidenceBoards(PROJECT_ID)).length, 1);
  assert.equal((await harness.traceRepository.listTraceManifests(PROJECT_ID)).length, 4);
});

test('stale EvidenceMap owner state blocks before citation, coordinator, or board effects', async () => {
  const harness = await makeHarness();
  await harness.evidenceMapRepository.updateEvidenceMapFreshness(
    'evidence_map_t141',
    'stale',
    ['SOURCE_REFRESH_REQUIRED'],
  );

  const response = await harness.service.continue({ implementation_project_id: PROJECT_ID });
  assert.equal(response.status, 'blocked');
  assert.equal(response.semantic_stage, 'source_resolution');
  assert.equal(response.blocker?.code, 'EVIDENCE_BOARD_SOURCE_EVIDENCE_NOT_REVIEWED_OR_FRESH');
  assert.equal(harness.coordinator.createCalls, 0);
  assert.equal(harness.coordinator.advanceCalls, 0);
  assert.equal((await harness.traceRepository.listCitationCandidates(PROJECT_ID)).length, 0);
  assert.deepEqual(await harness.motiveRepository.listMotiveEvidenceBoards(PROJECT_ID), []);
});

test('Evidence Board handoff returns a semantic gap and writes no misleading board', async () => {
  const harness = await makeHarness('gap');
  const response = await harness.service.continue({ implementation_project_id: PROJECT_ID });

  assert.equal(response.status, 'blocked');
  assert.equal(response.semantic_stage, 'curation');
  assert.equal(response.blocker?.code, 'EVIDENCE_BOARD_CURATION_GAPS_REMAIN');
  assert.equal(response.next_action.action, 'resolve_evidence_gap');
  assert.deepEqual(response.semantic_context.evidence_gaps, [
    'A reviewed source must cover the required assertion.',
  ]);
  assert.equal(response.semantic_context.board, null);
  assert.deepEqual(await harness.motiveRepository.listMotiveEvidenceBoards(PROJECT_ID), []);
});

test('Evidence Board handoff rejects a viable candidate below the assertion minimum support level', async () => {
  const harness = await makeHarness('weak');
  const response = await harness.service.continue({ implementation_project_id: PROJECT_ID });

  assert.equal(response.status, 'blocked');
  assert.equal(response.semantic_stage, 'board_write');
  assert.equal(response.blocker?.code, 'EVIDENCE_BOARD_REQUIRED_ASSERTION_COVERAGE_INCOMPLETE');
  assert.equal(response.next_action.action, 'resolve_evidence_gap');
  assert.deepEqual(response.semantic_context.evidence_gaps, [
    `No viable fresh binding covers required assertion ${ASSERTION_ID}.`,
  ]);
  assert.deepEqual(await harness.motiveRepository.listMotiveEvidenceBoards(PROJECT_ID), []);
});
