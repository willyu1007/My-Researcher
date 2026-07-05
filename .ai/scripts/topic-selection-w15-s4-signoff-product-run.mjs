#!/usr/bin/env node
/**
 * T-128 W-15 S4 — the SECOND real product run: validate the D1(c) sign-off friction shape.
 *
 * Reality check baked into this driver (found while building it, evidence in 03/04 docs):
 * a coordinator-driven run has NO wired product path through the model nodes today —
 * coordinator caller drafts are recorded fixture_replay (product-rejected by design),
 * coordinator execution_spec is a pass-through the harness does not act on
 * (N4_FROZEN_DRAFT_ARTIFACT_REQUIRED), and the v1b draft runtimes accept only
 * codex_assisted|mocked_llm (provider_llm single-agent = W-14/W-19 dormant tail).
 *
 * The CURRENT product-legal caller shape (proven by the n4/n6/n8_runtime_smoke scenarios,
 * which run run_mode='product') is therefore used for the three model nodes:
 *   runtime.generateDraftArtifact(codex_assisted, operator-curated draft)  → runtime_verified artifact
 *   → direct harness invocation with the artifact attached (same workflow_run_id)
 * Everything else — N1 bootstrap, N3/N7 deterministic, N9–N11, the human N2/N5 routes,
 * and CRUCIALLY the sign-off gate — runs through the coordinator:
 *   N8 admits carrying N8_DEBATE_THRESHOLDS_PROVISIONAL (product-gated tripwire)
 *   → coordinator advance halts `sign_off_required` before N9      ← the friction under test
 *   → negative probes (gate holds on re-advance; wrong-attempt sign-off 409s)
 *   → POST /sign-offs (the exact route the workbench card calls)   ← the one-click sign
 *   → coordinator advance resumes N9→N10→N11                        ← the resume
 *
 * Provider spend: ZERO new calls (run9's real v1a lineage reused; v1b model drafts are
 * operator-curated through the runtime channel, exactly like the product-mode runtime smokes).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Prisma-backed repositories + real settings row — set BEFORE app import.
process.env.TITLE_CARD_REPOSITORY = process.env.TITLE_CARD_REPOSITORY ?? 'prisma';
process.env.RESEARCH_LIFECYCLE_REPOSITORY = process.env.RESEARCH_LIFECYCLE_REPOSITORY ?? 'prisma';
process.env.AUTO_PULL_REPOSITORY = process.env.AUTO_PULL_REPOSITORY ?? 'prisma';
process.env.APPLICATION_SETTINGS_REPOSITORY = process.env.APPLICATION_SETTINGS_REPOSITORY ?? 'prisma';
process.env.AUTO_PULL_SCHEDULER_ENABLED = 'false';

const { PrismaClient } = await import('@prisma/client');
const { buildApp } = await import('../../apps/backend/src/app.ts');
const { PrismaTopicSelectionNeedValidationRepository } = await import(
  '../../apps/backend/src/repositories/prisma/prisma-topic-selection-need-validation-repository.ts'
);
const { PrismaTopicSelectionV1bIntakeRepository } = await import(
  '../../apps/backend/src/repositories/prisma/prisma-topic-selection-v1b-intake-repository.ts'
);
const { PrismaTopicSelectionControlPlaneRepository } = await import(
  '../../apps/backend/src/repositories/prisma/prisma-topic-selection-control-plane-repository.ts'
);
const { PrismaTopicSelectionPromptPacketCacheStore } = await import(
  '../../apps/backend/src/repositories/prisma/prisma-topic-selection-prompt-packet-cache-store.ts'
);
const { sha256Text, stableStringify } = await import(
  '../../apps/backend/src/services/literature-content-processing-utils.ts'
);
const { TopicSelectionControlPlaneService } = await import(
  '../../apps/backend/src/services/topic-selection-control-plane-service.ts'
);
const { TopicSelectionModelProfileRegistryService } = await import(
  '../../apps/backend/src/services/topic-selection-model-profile-registry-service.ts'
);
const { TopicSelectionPromptPacketCacheService } = await import(
  '../../apps/backend/src/services/topic-selection-prompt-packet-cache-service.ts'
);
const { TopicSelectionAgentOrchestratorService } = await import(
  '../../apps/backend/src/services/topic-selection-agent-orchestrator-service.ts'
);
const { TopicSelectionV1bN4ResearchSliceRuntimeService } = await import(
  '../../apps/backend/src/services/topic-selection-v1b-n4-research-slice-runtime-service.ts'
);
const { TopicSelectionV1bN6DraftRuntimeService } = await import(
  '../../apps/backend/src/services/topic-selection-v1b-n6-draft-runtime-service.ts'
);
const { TopicSelectionV1bN8ValueAssessmentRuntimeService } = await import(
  '../../apps/backend/src/services/topic-selection-v1b-n8-value-assessment-runtime-service.ts'
);
const {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
} = await import(
  '../../packages/shared/src/research-lifecycle/topic-selection-v1b-workflow-harness-contracts.ts'
);
const { TOPIC_SELECTION_VALUE_DIMENSIONS, TOPIC_SELECTION_VALUE_GATE_KEYS } = await import(
  '../../packages/shared/src/research-lifecycle/topic-selection-v1b-value-assessment-contracts.ts'
);

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const RUN_ID = process.env.TOPIC_SELECTION_W15_S4_RUN_ID ?? `t128-w15-s4-signoff-${Date.now()}`;
const SUFFIX = RUN_ID.replaceAll('-', '_');
const WORKFLOW_RUN_ID = `workflow_run_${SUFFIX}`;
// run9's real bundle (real literature + real provider v1a lineage).
const BUNDLE_ID = process.env.TOPIC_SELECTION_W15_S4_BUNDLE_ID
  ?? 'v1b_input_bundle_b9b8ff1d-5858-4ee8-8282-4a12e109d88a';
const OPERATOR_ACTOR_ID = process.env.TOPIC_SELECTION_W15_S4_ACTOR_ID ?? 'w15-s4-operator';
const ARTIFACT_DIR = path.join(REPO_ROOT, '.ai/.tmp/topic-selection-real-e2e', RUN_ID);

const N1_ID = 'topic-selection.v1b.create-intake-snapshot.v1';
const N2_ID = 'topic-selection.v1b.record-research-constraint-profile.v1';
const N3_ID = 'topic-selection.v1b.assess-intake-readiness.v1';
const N4_ID = 'topic-selection.v1b.generate-research-slice-options.v1';
const N5_ID = 'topic-selection.v1b.select-research-slice.v1';
const N6_ID = 'topic-selection.v1b.generate-topic-question-candidates.v1';
const N7_ID = 'topic-selection.v1b.materialize-topic-question-contract.v1';
const N8_ID = 'topic-selection.v1b.assess-topic-value.v1';
const N9_ID = 'topic-selection.v1b.decide-value-disposition.v1';

// ---------------------------------------------------------------------------
// Small utilities (lifted verbatim from the proven harness-e2e builders).

function ref(refType, refId, titleCardId, versionId = null) {
  return { ref_type: refType, ref_id: refId, version_id: versionId, title_card_id: titleCardId };
}

function uniqueRefs(refs) {
  const seen = new Set();
  const result = [];
  for (const item of refs) {
    const key = [item.ref_type, item.ref_id, item.title_card_id ?? '', item.version_id ?? ''].join(':');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function v1bBundleRef(bundle) {
  return ref('v1a_to_v1b_input_bundle', bundle.v1b_input_bundle_id, bundle.title_card_id, bundle.bundle_version);
}

function v1aBundleSourceRefs(bundle) {
  return uniqueRefs([
    v1bBundleRef(bundle),
    bundle.validated_need_ref,
    bundle.source_need_candidate_ref,
    bundle.adjudication_result_ref,
    bundle.support_packet_ref,
    bundle.human_decision_ref,
    bundle.evidence_map_ref,
    bundle.search_run_ref,
    bundle.search_plan_ref,
    bundle.literature_snapshot_ref,
    ...bundle.trace_refs,
    ...bundle.risk_refs,
    ...bundle.memory_suggestion_refs,
    ...bundle.recheck_request_refs,
  ]);
}

function frozenInputHash(payload) {
  return sha256Text(stableStringify({
    input_contract: payload.input_contract,
    payload: payload.payload,
    snapshot_kind: payload.snapshot_kind,
    source_refs: payload.source_refs,
  }));
}

function harnessRequest(titleCardId, nodeAttemptSuffix, nodeId, frozenInput) {
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    title_card_id: titleCardId,
    workflow_run_id: WORKFLOW_RUN_ID,
    node_attempt_id: `node_attempt_${SUFFIX}_${nodeAttemptSuffix}`,
    node_id: nodeId,
    policy_version: 'topic-selection-v1b-node-policy-v1',
    frozen_input: { ...frozenInput, frozen_input_hash: frozenInputHash(frozenInput) },
    created_by: 'system',
  };
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function requestJson(app, method, url, expected, payload, label = `${method} ${url}`) {
  const response = await app.inject({ method, url, payload });
  if (response.statusCode !== expected) {
    throw new Error(`${label}: expected HTTP ${expected}, received ${response.statusCode}: ${response.body}`);
  }
  return response.json();
}

async function invokeNode(app, input, label) {
  const result = await requestJson(
    app,
    'POST',
    `/topic-selection/v1b/workflow-harness/nodes/${encodeURIComponent(input.node_id)}/invocations`,
    201,
    input,
    label,
  );
  console.log(`[invoke] ${label}: gate=${result.gate_status} route=${result.route_decision}${(result.warnings ?? []).length ? ` warnings=[${result.warnings.map((w) => w.code).join(',')}]` : ''}`);
  return result;
}

async function getHarnessArtifactPayload(app, artifactRef, label) {
  const artifact = await requestJson(
    app,
    'GET',
    `/topic-selection/v1b/workflow-harness/artifacts/${encodeURIComponent(artifactRef.ref_id)}`,
    200,
    undefined,
    label,
  );
  return artifact.payload;
}

const advances = [];

async function advance(app, body, label) {
  const report = await requestJson(
    app,
    'POST',
    `/topic-selection/v1b/workflow-runs/${encodeURIComponent(WORKFLOW_RUN_ID)}/advance`,
    200,
    { run_mode: 'product', node_timeout_ms: 300_000, ...body },
    label,
  );
  advances.push({
    label,
    steps: report.steps.map((step) => ({
      node_id: step.node_id,
      node_attempt_id: step.node_attempt_id,
      gate_status: step.gate_status,
      route_decision: step.route_decision,
    })),
    halt: report.halt,
  });
  console.log(`[advance] ${label}: steps=[${report.steps.map((s) => s.node_id.split('.')[2]).join(',')}] halt=${report.halt.reason}@${report.halt.node_id ?? '-'}`);
  return report;
}

/** Rebuild a harness-e2e-shaped node "result" from the coordinator projection (fabricateResult pattern). */
function nodeResult(report, nodeId) {
  const snapshot = report.run_state.nodes.find((node) => node.node_id === nodeId)?.latest_admitted;
  assert.ok(snapshot, `expected admitted snapshot for ${nodeId}`);
  return {
    authority_ref: snapshot.authority_ref,
    handoff_ref: snapshot.handoff_ref,
    trace_snapshot_ref: snapshot.trace_snapshot_ref,
    hashes: { authority_hash: snapshot.authority_hash, handoff_hash: snapshot.handoff_hash },
  };
}

// ---------------------------------------------------------------------------
// Runtime channel (the product-legal operator draft path, per the runtime smokes).

function makeRuntimeDeps(prisma) {
  const controlPlane = new TopicSelectionControlPlaneService(
    new PrismaTopicSelectionControlPlaneRepository(prisma),
  );
  const modelProfileRegistry = new TopicSelectionModelProfileRegistryService();
  const promptPacketCache = new TopicSelectionPromptPacketCacheService({
    store: new PrismaTopicSelectionPromptPacketCacheStore(prisma, { allowMissingTableFallback: true }),
  });
  const agentOrchestrator = new TopicSelectionAgentOrchestratorService({
    controlPlane,
    modelProfileRegistry,
    promptPacketCache,
  });
  return { controlPlane, agentOrchestrator, modelProfileRegistry };
}

function assertRuntimeVerified(artifact, label) {
  assert.equal(artifact.runtime_provenance_class, 'runtime_verified', `${label}: expected runtime_verified provenance`);
  assert.equal(artifact.execution_mode, 'codex_assisted', `${label}: expected codex_assisted execution mode`);
}

// ---------------------------------------------------------------------------
// Request builders (lifted from harness-e2e; workflow_run_id pinned to OUR run).

function n1BootstrapRequest(bundle) {
  const payload = {
    v1b_input_bundle_id: bundle.v1b_input_bundle_id,
    v1a_bundle_ref: v1bBundleRef(bundle),
    v1a_bundle_hash: sha256Text(stableStringify(bundle)),
    source_refs_hash: sha256Text(stableStringify(v1aBundleSourceRefs(bundle))),
  };
  const frozenInput = {
    input_contract: 'V1aToV1bInputBundleFrozenRef@v1',
    snapshot_kind: 'v1a_valid_need_bundle',
    source_refs: [ref('v1a_valid_need_bundle', bundle.v1b_input_bundle_id, bundle.title_card_id, bundle.bundle_version)],
    payload,
  };
  return harnessRequest(bundle.title_card_id, 'n1', N1_ID, frozenInput);
}

function n4Request(n1Result, n2Result, n3Result) {
  const payload = {
    intake_snapshot_ref: n1Result.authority_ref,
    intake_snapshot_hash: n1Result.hashes.authority_hash,
    constraint_profile_ref: n2Result.authority_ref,
    constraint_profile_hash: n2Result.hashes.authority_hash,
    intake_readiness_ref: n3Result.authority_ref,
    intake_readiness_hash: n3Result.hashes.authority_hash,
    n2_handoff_hash: n2Result.hashes.handoff_hash,
    n3_handoff_hash: n3Result.hashes.handoff_hash,
  };
  const frozenInput = {
    input_contract: 'N3ToN4Handoff@v1',
    snapshot_kind: 'v1b_intake_readiness_assessment',
    source_refs: [n3Result.authority_ref, n2Result.authority_ref, n1Result.authority_ref],
    payload,
  };
  return { ...harnessRequest(n1Result.authority_ref.title_card_id, 'n4', N4_ID, frozenInput), run_mode: 'product' };
}

async function n6Request(app, n5Result) {
  const handoff = await getHarnessArtifactPayload(app, n5Result.handoff_ref, 'fetch-n5-handoff');
  assert.equal(handoff.envelope.handoff_kind, 'N5ToN6Handoff');
  const payload = { ...handoff.payload, n5_handoff_hash: n5Result.hashes.handoff_hash };
  const selectionSnapshotRef = ref(
    'research_slice_selection_decision',
    n5Result.authority_ref.ref_id,
    n5Result.authority_ref.title_card_id,
    n5Result.authority_ref.version_id ?? null,
  );
  const frozenInput = {
    input_contract: 'N5ToN6Handoff@v1',
    snapshot_kind: 'research_slice_selection_decision',
    source_refs: uniqueRefs([selectionSnapshotRef, n5Result.handoff_ref, ...handoff.required_refs]),
    payload,
  };
  return { ...harnessRequest(n5Result.authority_ref.title_card_id, 'n6', N6_ID, frozenInput), run_mode: 'product' };
}

async function n8Request(app, n7Result) {
  const trace = await requestJson(
    app,
    'GET',
    `/topic-selection/v1b/workflow-harness/trace-snapshots/${encodeURIComponent(n7Result.trace_snapshot_ref.ref_id)}`,
    200,
    undefined,
    'fetch-n7-trace',
  );
  const projectionRef = trace.payload.runtime_context_projection_ref;
  assert.equal(projectionRef?.ref_type, 'artifact_ref', 'N7 trace lacks runtime_context_projection_ref');
  const handoff = await getHarnessArtifactPayload(app, n7Result.handoff_ref, 'fetch-n7-handoff');
  assert.equal(handoff.envelope.handoff_kind, 'N7ToN8Handoff');
  const payload = { ...handoff.payload, n7_handoff_hash: n7Result.hashes.handoff_hash };
  const frozenInput = {
    input_contract: 'N7ToN8Handoff@v1',
    snapshot_kind: 'topic_question_contract',
    source_refs: uniqueRefs([n7Result.authority_ref, n7Result.handoff_ref, projectionRef, ...handoff.required_refs]),
    payload,
  };
  return { ...harnessRequest(n7Result.authority_ref.title_card_id, 'n8', N8_ID, frozenInput), run_mode: 'product' };
}

async function n4PlanningInput(prisma, n1Result, n2Result, n3Result) {
  const repository = new PrismaTopicSelectionV1bIntakeRepository(prisma);
  const [snapshot, profile, readiness] = await Promise.all([
    repository.findIntakeSnapshotById(n1Result.authority_ref.ref_id),
    repository.findResearchConstraintProfileById(n2Result.authority_ref.ref_id),
    repository.findReadinessAssessmentById(n3Result.authority_ref.ref_id),
  ]);
  assert.ok(snapshot && profile && readiness, 'N4 planning input authorities must resolve');
  return {
    v1b_input_bundle_ref: snapshot.v1b_input_bundle_ref,
    v1b_intake_snapshot_ref: ref('v1b_intake_snapshot', snapshot.v1b_intake_snapshot_id, snapshot.title_card_id, snapshot.snapshot_version),
    research_constraint_profile_ref: ref('research_constraint_profile', profile.research_constraint_profile_id, profile.title_card_id, profile.profile_version),
    readiness_assessment_ref: ref('v1b_intake_readiness_assessment', readiness.v1b_intake_readiness_assessment_id, readiness.title_card_id),
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

// ---------------------------------------------------------------------------
// Operator-curated draft content (derived from the real bundle; same content shape
// the product-mode runtime smokes admit — this is the codex_assisted operator channel).

function acceptedConstraintProfilePayload() {
  return {
    target_community: 'LLM systems researchers',
    target_venue_class: 'systems',
    intended_contribution_style: 'workflow_system',
    method_constraints: ['offline replay evaluation'],
    resource_constraints: ['single workstation'],
    available_assets: ['paper corpus', 'review rubric'],
    feasibility_budget: { person_weeks: 2 },
    non_goals: ['Do not target production deployment'],
    claim_ceiling: 'Can claim reviewer-aligned planning feasibility, not production superiority.',
    human_constraint_notes: 'W-15 S4 second product run: validating the provisional sign-off friction.',
    constraint_payload: { source: 'w15_s4_signoff_product_run' },
  };
}

function n4Draft(bundle) {
  const evidenceRef = bundle.evidence_role_bundle.support_unit_refs[0] ?? bundle.evidence_map_ref;
  return {
    recommended_option_key: 'traceable_workflow_slice',
    comparison_axes: ['method feasibility', 'evidence traceability'],
    comparison_summary: 'The recommended slice keeps the claim bounded to workflow traceability.',
    missing_option_types: [],
    unresolved_disagreements: [],
    human_review_triggers: [],
    options: [{
      option_key: 'traceable_workflow_slice',
      source_validated_need_refs: [bundle.validated_need_ref],
      slice_statement: 'Build a bounded evidence-to-need traceability workflow for topic selection.',
      problem_space: 'Reviewer-aligned topic selection traceability.',
      target_setting: 'Local-first CS paper engineering assistant workflows.',
      target_community: 'LLM systems researchers',
      included_boundaries: ['v1a evidence-to-need trace preservation'],
      excluded_boundaries: ['Do not target production deployment', 'promotion decision', 'full paper implementation'],
      contribution_type_candidate: 'workflow_system',
      support_evidence_refs: [evidenceRef],
      challenge_evidence_refs: [],
      baseline_evidence_refs: [],
      context_evidence_refs: [],
      resource_assumptions: ['W-15 S4 run reuses the run9 v1a evidence map.'],
      data_assumptions: ['Evidence units remain frozen during slice generation.'],
      evaluation_path: 'Replay the harness and inspect deterministic trace hashes.',
      baseline_assumptions: ['Route-only smoke tests are insufficient as a baseline.'],
      hard_blockers: [],
      dependency_risks: ['Downstream selection may request more options.'],
      slice_budget: { max_nodes: 4 },
      expected_claim: 'A bounded workflow can preserve evidence-to-need traceability.',
      fallback_claim: 'A harness-native workflow improves traceability checks.',
      observable_success_criteria: ['N4 emits option set refs and hashes through handoff.'],
      main_risks: ['Evidence coverage may still need review.'],
      baseline_risk: 'medium',
      execution_risk: 'medium',
      scope_risk: 'low',
      claim_ceiling_alignment: {
        status: 'aligned',
        rationale: 'The claim is bounded to traceability workflow behavior.',
        confidence: 0.8,
      },
      confidence: 0.82,
      requires_human_review: false,
      human_review_triggers: [],
      details_payload: { operator_curated: 'w15_s4' },
    }],
  };
}

function n6Draft(bundle, input) {
  const payload = input.frozen_input.payload;
  const evidenceRef = bundle.evidence_role_bundle.support_unit_refs[0] ?? bundle.evidence_map_ref;
  return {
    question_frame: {
      target_setting: 'Local-first CS paper engineering assistant workflows.',
      target_community: 'LLM systems researchers',
      object_scope: 'v1b harness-native topic selection candidate generation',
      task_scope: 'candidate generation, deterministic gates, and replay drift checks',
      intervention_or_approach: 'WorkflowHarness-native candidate-set gate with frozen semantic artifacts',
      comparison_baseline: 'route-only smoke tests without harness-level product acceptance',
      observable_outcome: 'stable candidate-set refs and replay hashes',
      assumption_refs: [],
      evidence_refs: [evidenceRef],
      frame_payload: { operator_curated: 'w15_s4' },
    },
    recommended_candidate_keys: ['harness_candidate'],
    generation_notes: ['Candidate stays inside the selected ResearchSlice and preserves N5 lineage.'],
    human_review_triggers: [],
    candidates: [{
      candidate_key: 'harness_candidate',
      main_question: 'How can a WorkflowHarness-native candidate gate improve replayable v1b topic selection?',
      sub_questions: ['Which N5 lineage hashes must remain frozen before N7 admission?'],
      question_type: 'system',
      contribution_hypothesis: 'system',
      source_validated_need_refs: [bundle.validated_need_ref],
      answerability_plan: {
        datasets_or_resources: ['v1b harness trace fixtures'],
        metrics: ['hash drift detection rate'],
        baselines: ['route-only smoke coverage'],
        ablations_or_comparisons: ['without frozen semantic artifact admission'],
        evaluation_setting: 'local deterministic harness acceptance tests',
        dependency_risks: ['provider canary behavior is not exercised in this run'],
        open_dependencies: [],
        known_gaps: [],
        required_evidence_refs: [evidenceRef],
      },
      answerability_verdict: 'answerable',
      expected_claim: 'A harness-native candidate gate improves replayable v1b topic selection.',
      fallback_claim: 'The gate preserves candidate lineage for downstream review.',
      max_claim_strength: 'Bounded workflow claim about candidate lineage and replay.',
      observable_success_criteria: ['N6 emits candidate set refs and hashes.'],
      boundary_check: {
        preserved_boundary_refs: [],
        excluded_boundary_refs: [],
        boundary_violations: [],
        prohibited_claims: ['promotion decision'],
        allowed_refinements: ['tighten candidate wording'],
      },
      traceability_check: {
        support_evidence_refs: [evidenceRef],
        challenge_evidence_refs: [evidenceRef],
        baseline_evidence_refs: [evidenceRef],
        context_evidence_refs: [evidenceRef],
        mapped_evidence_refs: [evidenceRef],
        unmapped_assumptions: [],
      },
      falsification_conditions: [{
        condition_type: 'claim_overstrong',
        severity: 'hard',
        statement: 'If changed frozen N5 lineage hashes are not detected, the candidate claim must be lowered.',
        trigger_evidence_refs: [evidenceRef],
        trigger_source_refs: [payload.research_slice_ref],
        related_contract_fields: ['expected_claim'],
        expected_action: 'lower_claim_strength',
        check_timing: 'before_value_assessment',
        confidence: 'high',
      }],
      risk_notes: [],
      blockers: [],
      objections: [],
      human_review_triggers: [],
      confidence: 0.84,
    }],
  };
}

function n8ValueDraft(input) {
  const payload = input.frozen_input.payload;
  const evidenceRef = payload.topic_question_contract_ref;
  return {
    readiness_status: 'ready',
    strongest_claim_if_success: 'A harness-native topic-selection flow preserves replayable authority boundaries.',
    fallback_claim_if_success: 'Harness-level acceptance exposes route-only smoke gaps.',
    hard_gates: TOPIC_SELECTION_VALUE_GATE_KEYS.map((gateKey) => ({
      gate_key: gateKey,
      verdict: 'pass',
      severity: 'info',
      overridable_with_risk: false,
      rationale: `${gateKey} passes under the operator-curated W-15 S4 assessment.`,
      refs: [evidenceRef],
    })),
    dimension_scores: TOPIC_SELECTION_VALUE_DIMENSIONS.map((dimensionKey) => ({
      dimension_key: dimensionKey,
      score: dimensionKey === 'reviewer_risk' ? 72 : 84,
      rationale: `${dimensionKey} is sufficiently supported for this run.`,
      evidence_refs: [evidenceRef],
      uncertainty: 'medium',
    })),
    risk_penalty: { residual_risk: 'bounded' },
    reviewer_objections: ['Provider-generated drafts are outside this run (W-14/W-19 dormant).'],
    ceiling_case: 'The topic can support a bounded workflow claim with deterministic trace evidence.',
    base_case: 'The topic supports harness-native acceptance and replay validation.',
    floor_case: 'The topic still yields useful negative gate coverage.',
    recommended_disposition: 'advance_to_package',
    total_score: 83,
    value_summary: 'The active TopicQuestionContract has enough value and answerability for draft packaging.',
    confidence: 0.82,
    accepted_risk_refs: [],
    blocker_refs: [],
    risk_notes: ['Provider canary and output quality review remain downstream checks.'],
    reasoning_memo: {
      recommendation: 'advance_to_package',
      value_thesis: 'Harness-native v1b topic selection is valuable because it closes automation, replay, and authority boundaries.',
      significance: 'It turns route-testable workflow fragments into a product-level repeatable process.',
      originality: 'The contribution is a deterministic gate and handoff workflow around LLM-assisted semantic drafts.',
      claim_leverage: 'The claim remains bounded to workflow robustness and replay evidence.',
      reviewer_risks: ['The implementation needs downstream provider canary validation.'],
      effort_to_value: 'The chain gives high value for moderate implementation effort.',
      strategic_fit: 'It aligns with reviewer-aligned paper engineering workflows.',
      negative_memory_check: 'No prior negative memory blocks this topic.',
      evidence_backed_rationale: 'The N7 contract and candidate lineage provide frozen trace evidence.',
      top_objections: ['This run does not prove live provider draft quality.'],
      uncertainty: 'Medium uncertainty until provider drafts are wired (W-14/W-19).',
      disposition_bridge: 'Advance to package with residual risks carried into v1c.',
      requires_critic_review: false,
      critic_triggers: [],
      cited_refs: [evidenceRef],
    },
  };
}

// ---------------------------------------------------------------------------

async function main() {
  const startedAt = new Date().toISOString();
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
  await writeJson(path.join(ARTIFACT_DIR, '00-plan.json'), {
    run_id: RUN_ID,
    workflow_run_id: WORKFLOW_RUN_ID,
    bundle_id: BUNDLE_ID,
    run_mode: 'product',
    model_node_channel: 'runtime codex_assisted (operator-curated) — the current product-legal caller shape; provider single-agent drafts are the W-14/W-19 dormant tail',
    started_at: startedAt,
    goal: 'W-15 S4: N8 provisional tripwire -> sign_off_required halt -> sign-off -> resume (coordinator gate).',
  });

  const prisma = new PrismaClient();
  const app = buildApp({});
  try {
    await app.ready();
    const bundle = await new PrismaTopicSelectionNeedValidationRepository(prisma).findV1aToV1bInputBundleById(BUNDLE_ID);
    assert.ok(bundle, `v1b input bundle not found: ${BUNDLE_ID}`);
    await writeJson(path.join(ARTIFACT_DIR, '01-bundle.json'), {
      v1b_input_bundle_id: bundle.v1b_input_bundle_id,
      title_card_id: bundle.title_card_id,
      validated_need_id: bundle.validated_need_id,
      bundle_version: bundle.bundle_version,
    });

    // N1 bootstrap → human halt at N2 → human N2 route → N3 → model halt at N4.
    const afterN1 = await advance(app, { bootstrap_request: n1BootstrapRequest(bundle) }, 'bootstrap-n1');
    assert.equal(afterN1.halt.reason, 'human_node');
    assert.equal(afterN1.halt.node_id, N2_ID);
    const n1Result = nodeResult(afterN1, N1_ID);
    await requestJson(
      app,
      'POST',
      `/topic-selection/v1b/intake-snapshots/${encodeURIComponent(n1Result.authority_ref.ref_id)}/constraint-profile/human`,
      201,
      {
        actor: { actor_type: 'human', actor_id: OPERATOR_ACTOR_ID },
        workflow_run_id: WORKFLOW_RUN_ID,
        profile: acceptedConstraintProfilePayload(),
      },
      'human-n2-constraint-profile',
    );
    const afterN3 = await advance(app, {}, 'advance-n3');
    assert.equal(afterN3.halt.reason, 'model_input_required');
    assert.equal(afterN3.halt.node_id, N4_ID);
    const n2Result = nodeResult(afterN3, N2_ID);
    const n3Result = nodeResult(afterN3, N3_ID);

    // N4 — runtime-generated operator draft, direct product invocation (runtime-smoke recipe).
    const { agentOrchestrator, modelProfileRegistry, controlPlane } = makeRuntimeDeps(prisma);
    const n4Runtime = new TopicSelectionV1bN4ResearchSliceRuntimeService(controlPlane, { agentOrchestrator, modelProfileRegistry });
    const n4Input = n4Request(n1Result, n2Result, n3Result);
    const n4Generated = await n4Runtime.generateDraftArtifact({
      request: n4Input,
      planning_input: await n4PlanningInput(prisma, n1Result, n2Result, n3Result),
      execution_mode: 'codex_assisted',
      run_mode: 'product',
      codex_response: { output: n4Draft(bundle), operator_label: 'w15-s4-operator-n4' },
      created_by: 'system',
    });
    assert.equal(n4Generated.status, 'succeeded', JSON.stringify(n4Generated.invocation_result ?? {}));
    assertRuntimeVerified(n4Generated.semantic_artifact, 'N4 draft');
    const n4 = await invokeNode(app, { ...n4Input, semantic_artifacts: [n4Generated.semantic_artifact] }, 'invoke-n4-product');
    assert.ok(['admitted', 'admitted_with_warnings'].includes(n4.gate_status), JSON.stringify(n4));

    // N5 human selection through the coordinator-visible run.
    const afterN4 = await advance(app, {}, 'advance-to-n5');
    assert.equal(afterN4.halt.reason, 'human_node');
    assert.equal(afterN4.halt.node_id, N5_ID);
    const optionSetId = nodeResult(afterN4, N4_ID).authority_ref.ref_id;
    const options = (await requestJson(
      app,
      'GET',
      `/topic-selection/v1b/research-slice-option-sets/${encodeURIComponent(optionSetId)}/options`,
      200,
      undefined,
      'list-n4-options',
    )).items;
    const selected = options.find((option) => option.status === 'recommended') ?? options[0];
    assert.ok(selected, 'N4 produced no options');
    await requestJson(
      app,
      'POST',
      `/topic-selection/v1b/research-slice-option-sets/${encodeURIComponent(optionSetId)}/human-selection`,
      201,
      {
        selected_option_id: selected.research_slice_option_id,
        selection_rationale: 'W-15 S4: strongest bounded fit among the curated slices.',
        actor: { actor_type: 'human', actor_id: OPERATOR_ACTOR_ID },
        workflow_run_id: WORKFLOW_RUN_ID,
      },
      'human-n5-selection',
    );
    const afterN5 = await advance(app, {}, 'advance-past-n5');
    assert.equal(afterN5.halt.reason, 'model_input_required');
    assert.equal(afterN5.halt.node_id, N6_ID);
    const n5Result = nodeResult(afterN5, N5_ID);

    // N6 — runtime draft + direct product invocation.
    const n6Runtime = new TopicSelectionV1bN6DraftRuntimeService(controlPlane, { agentOrchestrator, modelProfileRegistry });
    const n6Input = await n6Request(app, n5Result);
    const n6Generated = await n6Runtime.generateDraftArtifact({
      request: n6Input,
      generation_mode: 'initial_from_n5',
      execution_mode: 'codex_assisted',
      run_mode: 'product',
      codex_response: { output: n6Draft(bundle, n6Input), operator_label: 'w15-s4-operator-n6' },
      created_by: 'system',
    });
    assert.equal(n6Generated.status, 'succeeded', JSON.stringify(n6Generated.invocation_result ?? {}));
    assertRuntimeVerified(n6Generated.semantic_artifact, 'N6 draft');
    const n6 = await invokeNode(app, { ...n6Input, semantic_artifacts: [n6Generated.semantic_artifact] }, 'invoke-n6-product');
    assert.equal(n6.gate_status, 'admitted', JSON.stringify(n6));

    // N7 deterministic via the coordinator → model halt at N8.
    const afterN7 = await advance(app, {}, 'advance-n7');
    assert.equal(afterN7.halt.reason, 'model_input_required', JSON.stringify(afterN7.halt));
    assert.equal(afterN7.halt.node_id, N8_ID);
    const n7Result = nodeResult(afterN7, N7_ID);

    // N8 — runtime draft + direct product invocation ⇒ the tripwire-carrying admit.
    const n8Runtime = new TopicSelectionV1bN8ValueAssessmentRuntimeService(controlPlane, { agentOrchestrator, modelProfileRegistry });
    const n8Input = await n8Request(app, n7Result);
    const n8Generated = await n8Runtime.generateDraftArtifact({
      request: n8Input,
      execution_mode: 'codex_assisted',
      run_mode: 'product',
      codex_response: { output: n8ValueDraft(n8Input), operator_label: 'w15-s4-operator-n8' },
      created_by: 'system',
    });
    assert.equal(n8Generated.status, 'succeeded', JSON.stringify(n8Generated.invocation_result ?? {}));
    assertRuntimeVerified(n8Generated.semantic_artifact, 'N8 draft');
    const n8 = await invokeNode(app, { ...n8Input, semantic_artifacts: [n8Generated.semantic_artifact] }, 'invoke-n8-product');
    assert.ok(['admitted', 'admitted_with_warnings'].includes(n8.gate_status), JSON.stringify(n8));
    assert.ok(
      (n8.warnings ?? []).some((warning) => warning.code === 'N8_DEBATE_THRESHOLDS_PROVISIONAL'),
      `product N8 admit did not carry the provisional tripwire: ${JSON.stringify(n8.warnings ?? [])}`,
    );

    // ---- The friction under test: the coordinator refuses to advance past N8 unsigned. ----
    const gateHalt = await advance(app, {}, 'gate-halt-before-n9');
    assert.equal(gateHalt.halt.reason, 'sign_off_required', JSON.stringify(gateHalt.halt));
    assert.equal(gateHalt.halt.node_id, N8_ID);
    const tripwire = gateHalt.run_state.nodes.find((node) => node.node_id === N8_ID).latest_provisional_tripwire;
    assert.ok(tripwire, 'projection lacks latest_provisional_tripwire for N8');
    assert.match(gateHalt.halt.message, new RegExp(tripwire.node_attempt_id));

    // Negative probes: gate holds; wrong-attempt sign-off rejected.
    const stillHalted = await advance(app, {}, 'probe-readvance-before-sign');
    assert.equal(stillHalted.halt.reason, 'sign_off_required');
    const wrongAttempt = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1b/workflow-runs/${encodeURIComponent(WORKFLOW_RUN_ID)}/sign-offs`,
      payload: {
        schema_version: 'TopicSelectionStakeholderSignOff@v1',
        sign_off_id: `sign_off_probe_${SUFFIX}`,
        sign_off_scope: 'provisional_threshold_run_override',
        gate_warning_code: 'N8_DEBATE_THRESHOLDS_PROVISIONAL',
        signed_by: { actor_type: 'human', actor_id: OPERATOR_ACTOR_ID },
        signed_at: new Date().toISOString(),
        rationale: 'probe: wrong attempt id must be rejected',
        workflow_run_id: WORKFLOW_RUN_ID,
        node_id: N8_ID,
        node_attempt_id: 'node_attempt_not_the_tripwire',
      },
    });
    assert.equal(wrongAttempt.statusCode, 409, wrongAttempt.body);
    await writeJson(path.join(ARTIFACT_DIR, '03-signoff-gate-evidence.json'), {
      n8_warnings: n8.warnings ?? [],
      gate_halt: gateHalt.halt,
      tripwire_attempt: tripwire,
      readvance_before_sign: stillHalted.halt,
      wrong_attempt_probe: { status: wrongAttempt.statusCode, body: JSON.parse(wrongAttempt.body) },
    });

    // The real sign-off — the exact payload shape the workbench card submits.
    const signOff = await requestJson(
      app,
      'POST',
      `/topic-selection/v1b/workflow-runs/${encodeURIComponent(WORKFLOW_RUN_ID)}/sign-offs`,
      201,
      {
        schema_version: 'TopicSelectionStakeholderSignOff@v1',
        sign_off_id: `sign_off_${tripwire.node_attempt_id}`,
        sign_off_scope: 'provisional_threshold_run_override',
        gate_warning_code: 'N8_DEBATE_THRESHOLDS_PROVISIONAL',
        signed_by: { actor_type: 'human', actor_id: OPERATOR_ACTOR_ID },
        signed_at: new Date().toISOString(),
        rationale:
          'W-15 S4 second product run: provisional N8 thresholds acknowledged for this run; calibration release tracked as W-17.',
        workflow_run_id: WORKFLOW_RUN_ID,
        node_id: N8_ID,
        node_attempt_id: tripwire.node_attempt_id,
      },
      'record-sign-off',
    );
    await writeJson(path.join(ARTIFACT_DIR, '04-signoff-record.json'), signOff);

    // Resume: the next advance clears the gate and completes N9→N10→N11.
    const resumed = await advance(app, {}, 'resume-after-sign');
    assert.notEqual(resumed.halt.reason, 'sign_off_required', JSON.stringify(resumed.halt));
    assert.ok(
      resumed.steps.some((step) => step.node_id === N9_ID),
      `resume did not reach N9: ${JSON.stringify(resumed.steps)} halt=${JSON.stringify(resumed.halt)}`,
    );
    await writeJson(path.join(ARTIFACT_DIR, '05-resume.json'), {
      steps: resumed.steps.map((step) => ({ node_id: step.node_id, gate_status: step.gate_status, route_decision: step.route_decision })),
      halt: resumed.halt,
      run_complete: resumed.run_state.run_complete,
    });

    await writeJson(path.join(ARTIFACT_DIR, '02-advances.json'), advances);
    const finalState = await requestJson(
      app,
      'GET',
      `/topic-selection/v1b/workflow-runs/${encodeURIComponent(WORKFLOW_RUN_ID)}/state`,
      200,
      undefined,
      'final-state',
    );
    const summary = {
      status: 'passed',
      run_id: RUN_ID,
      workflow_run_id: WORKFLOW_RUN_ID,
      bundle_id: BUNDLE_ID,
      run_mode: 'product',
      model_node_channel: 'runtime codex_assisted (operator-curated), runtime_verified provenance',
      friction_chain: {
        n8_tripwire_warning: true,
        tripwire_attempt_id: tripwire.node_attempt_id,
        sign_off_required_halt: gateHalt.halt.reason === 'sign_off_required',
        gate_held_on_readvance: stillHalted.halt.reason === 'sign_off_required',
        wrong_attempt_rejected_409: wrongAttempt.statusCode === 409,
        sign_off_artifact_ref_id: signOff.artifact_ref_id,
        resumed_through_n9: resumed.steps.some((step) => step.node_id === N9_ID),
        post_resume_halt: resumed.halt,
      },
      run_complete: finalState.run_complete,
      last_completed_node_id: finalState.last_completed_node_id,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      artifact_dir: path.relative(REPO_ROOT, ARTIFACT_DIR),
    };
    await writeJson(path.join(ARTIFACT_DIR, '90-summary.json'), summary);
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    await writeJson(path.join(ARTIFACT_DIR, '02-advances.json'), advances);
    await writeJson(path.join(ARTIFACT_DIR, 'failure.json'), {
      status: 'failed',
      run_id: RUN_ID,
      workflow_run_id: WORKFLOW_RUN_ID,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
      failed_at: new Date().toISOString(),
    });
    throw error;
  } finally {
    await app.close();
    await prisma.$disconnect();
  }
}

await main();
