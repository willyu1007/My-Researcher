// T-127 Phase 1 / W-05 — co-located unit test for the v1b N4 research-slice runtime service.
//
// Scope: the NON-AUTHORITY model-draft runtime that builds the N4 research-slice context packet,
// drives the REAL agent orchestrator in mocked_llm mode (deterministic fixture output, no LLM/network),
// records the diagnostic context + structured-output artifacts through a REAL in-memory control plane,
// and projects a runtime-verified semantic-support artifact ref for the deterministic N4 gate.
//
// The orchestrator is left REAL so its provenance hashes are computed correctly: the service re-checks
// `provenance.structured_output_hash === hash(structured_output)` and would throw on drift — running the
// real orchestrator is what makes that downstream invariant pass naturally. Only the LLM call itself is
// replaced (mocked_output fixture). The N1/N2/N3 seeding chain is bypassed: the request + planning input
// are constructed directly with internally-consistent refs/hashes, which is all this isolated node reads.

import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionEvidenceRoleBundle,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionV1bResearchSlicePlanningInput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-intake-contracts';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
  type TopicSelectionV1bN4HarnessFrozenInputPayload,
  type TopicSelectionV1bResearchSliceOptionSetDraftPayload,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { AppError } from '../errors/app-error.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TopicSelectionV1bN4ResearchSliceRuntimeService,
  buildV1bN4ResearchSliceSystemContent,
  type GenerateTopicSelectionV1bN4RuntimeDraftInput,
} from './topic-selection-v1b-n4-research-slice-runtime-service.js';
import { sha256Text } from './literature-content-processing-utils.js';

const NOW = '2026-06-16T00:00:00.000Z';
const N4_NODE_ID = 'topic-selection.v1b.generate-research-slice-options.v1' as const;
const TITLE_CARD_ID = 'title_card_001';
const HASH64 = 'a'.repeat(64);

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return { ref_type: refType, ref_id: refId, title_card_id: TITLE_CARD_ID, version_id: versionId };
}

function makeSubject() {
  const repository = new InMemoryTopicSelectionControlPlaneRepository();
  const controlPlane = new TopicSelectionControlPlaneService(repository, {
    idFactory: (() => {
      const counts = new Map<string, number>();
      return (prefix: string) => {
        const next = (counts.get(prefix) ?? 0) + 1;
        counts.set(prefix, next);
        return `${prefix}_${String(next).padStart(3, '0')}`;
      };
    })(),
    now: () => NOW,
  });
  const runtime = new TopicSelectionV1bN4ResearchSliceRuntimeService(controlPlane);
  return { runtime, controlPlane };
}

// Frozen N1/N2/N3 lineage refs the planning input must echo exactly (assertPlanningInput byte-matches).
const INTAKE_SNAPSHOT_REF = ref('v1b_intake_snapshot', 'intake_snapshot_001', 'snapshot_v1');
const CONSTRAINT_PROFILE_REF = ref('research_constraint_profile', 'constraint_profile_001', 'profile_v1');
const INTAKE_READINESS_REF = ref('v1b_intake_readiness_assessment', 'intake_readiness_001');

function frozenPayload(): TopicSelectionV1bN4HarnessFrozenInputPayload {
  return {
    intake_snapshot_ref: INTAKE_SNAPSHOT_REF,
    intake_snapshot_hash: 'b'.repeat(64),
    constraint_profile_ref: CONSTRAINT_PROFILE_REF,
    constraint_profile_hash: 'c'.repeat(64),
    intake_readiness_ref: INTAKE_READINESS_REF,
    intake_readiness_hash: 'd'.repeat(64),
    n2_handoff_hash: 'e'.repeat(64),
    n3_handoff_hash: 'f'.repeat(64),
  };
}

function makeRequest(suffix = '001'): TopicSelectionV1bWorkflowHarnessRunRequest {
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    workspace_id: 'workspace_001',
    title_card_id: TITLE_CARD_ID,
    workflow_run_id: `workflow_run_n4_${suffix}`,
    node_attempt_id: `node_attempt_n4_${suffix}`,
    node_id: N4_NODE_ID,
    policy_version: 'topic-selection-v1b-node-policy-v1',
    run_mode: 'test',
    created_by: 'system',
    frozen_input: {
      input_contract: 'N3ToN4Handoff@v1',
      snapshot_kind: 'v1b_intake_readiness_assessment',
      source_refs: [INTAKE_READINESS_REF, CONSTRAINT_PROFILE_REF, INTAKE_SNAPSHOT_REF],
      frozen_input_hash: HASH64,
      payload: frozenPayload() as unknown as Record<string, unknown>,
    },
  };
}

function evidenceRoleBundle(): TopicSelectionEvidenceRoleBundle {
  return {
    support_unit_refs: [ref('evidence_unit', 'evidence_unit_support_1')],
    challenge_unit_refs: [],
    baseline_unit_refs: [],
    context_unit_refs: [],
  };
}

function planningInput(
  overrides: Partial<TopicSelectionV1bResearchSlicePlanningInput> = {},
): TopicSelectionV1bResearchSlicePlanningInput {
  return {
    v1b_input_bundle_ref: ref('v1b_input_bundle', 'input_bundle_001'),
    // These three MUST byte-match the frozen payload lineage (assertPlanningInput).
    v1b_intake_snapshot_ref: INTAKE_SNAPSHOT_REF,
    research_constraint_profile_ref: CONSTRAINT_PROFILE_REF,
    readiness_assessment_ref: INTAKE_READINESS_REF,
    validated_need_ref: ref('validated_need', 'validated_need_001'),
    evidence_map_ref: ref('evidence_map', 'evidence_map_001'),
    search_run_ref: ref('search_run', 'search_run_001'),
    search_plan_ref: ref('search_plan', 'search_plan_001'),
    literature_snapshot_ref: ref('literature_snapshot', 'literature_snapshot_001'),
    evidence_role_bundle: evidenceRoleBundle(),
    target_community: 'CS paper engineering researchers',
    target_venue_class: null,
    intended_contribution_style: null,
    method_constraints: ['Stay within harness-native traceability scope.'],
    resource_constraints: ['Reuse existing v1a evidence map.'],
    available_assets: ['Frozen v1a evidence units.'],
    feasibility_budget: { max_nodes: 4 },
    non_goals: ['promotion decision', 'full paper implementation'],
    claim_ceiling: 'Correlation and mechanism claims only.',
    accepted_risk_refs: [],
    gap_codes: [],
    memory_suggestion_refs: [],
    recheck_request_refs: [],
    handoff_payload: { kind: 'n3_to_n4' },
    ...overrides,
  };
}

// A known-valid ResearchSliceOptionSetDraft@v1 instance (mirrors the harness-service fixture) so the
// real orchestrator's schema validation passes and produces a succeeded structured output.
function draftPayload(): TopicSelectionV1bResearchSliceOptionSetDraftPayload {
  const supportUnitRef = ref('evidence_unit', 'evidence_unit_support_1');
  const validatedNeedRef = ref('validated_need', 'validated_need_001');
  return {
    recommended_option_key: 'traceable_workflow_slice',
    comparison_axes: ['method feasibility', 'evidence traceability'],
    comparison_summary: 'The recommended slice keeps the claim bounded to workflow traceability.',
    missing_option_types: [],
    unresolved_disagreements: [],
    human_review_triggers: [],
    options: [
      {
        option_key: 'traceable_workflow_slice',
        source_validated_need_refs: [validatedNeedRef],
        slice_statement: 'Build a bounded evidence-to-need traceability workflow for topic selection.',
        problem_space: 'Reviewer-aligned topic selection traceability.',
        target_setting: 'Local-first CS paper engineering assistant workflows.',
        target_community: 'CS paper engineering researchers',
        included_boundaries: ['v1a evidence-to-need trace preservation'],
        excluded_boundaries: ['promotion decision', 'full paper implementation'],
        contribution_type_candidate: 'workflow_system',
        support_evidence_refs: [supportUnitRef],
        challenge_evidence_refs: [],
        baseline_evidence_refs: [],
        context_evidence_refs: [],
        resource_assumptions: ['Fixture run uses existing v1a evidence map.'],
        data_assumptions: ['Evidence units remain frozen during slice generation.'],
        evaluation_path: 'Replay the harness and inspect deterministic trace hashes.',
        baseline_assumptions: ['Route-only smoke tests are insufficient as a baseline.'],
        hard_blockers: [],
        dependency_risks: ['Downstream selection may request more options.'],
        slice_budget: {
          max_nodes: 4,
        },
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
        details_payload: {
          fixture: true,
        },
      },
    ],
  };
}

function draftInput(
  overrides: Partial<GenerateTopicSelectionV1bN4RuntimeDraftInput> = {},
): GenerateTopicSelectionV1bN4RuntimeDraftInput {
  return {
    request: makeRequest(),
    planning_input: planningInput(),
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    mocked_output: {
      fixture_id: 'fixture_n4_research_slice_draft_001',
      output: draftPayload(),
    },
    created_by: 'system',
    ...overrides,
  };
}

test('v1b N4 research-slice runtime emits a runtime-verified non-authority model draft for the gate', async () => {
  const { runtime } = makeSubject();

  const result = await runtime.generateDraftArtifact(draftInput());

  assert.equal(result.status, 'succeeded');
  if (result.status !== 'succeeded') {
    throw new Error('Expected N4 research-slice runtime draft generation to succeed.');
  }

  // The structured output is the deterministic fixture draft, surfaced unchanged.
  assert.equal(result.structured_output.recommended_option_key, 'traceable_workflow_slice');
  assert.equal(result.structured_output.options.length, 1);
  assert.equal(result.structured_output.options[0]!.option_key, 'traceable_workflow_slice');

  // The projected semantic-support artifact is a NON-AUTHORITY, runtime-verified model draft for the gate.
  const semantic = result.semantic_artifact;
  assert.equal(semantic.slot_id, 'n4_research_slice_option_draft');
  assert.equal(semantic.node_id, N4_NODE_ID);
  assert.equal(semantic.allowed_effect, 'model_draft_for_gate');
  assert.equal(semantic.runtime_provenance_class, 'runtime_verified');
  assert.equal(semantic.output_contract, 'ResearchSliceOptionSetDraft@v1');
  assert.equal(semantic.execution_mode, 'mocked_llm');
  assert.equal(semantic.run_mode, 'test');
  assert.equal(semantic.prompt_variant_key, 'n4_research_slice_option_draft.initial_from_n3');

  // The support/normalized artifact hash equals the structured-output hash (no drift) and is 64-hex.
  assert.match(semantic.structured_output_hash, /^[a-f0-9]{64}$/);
  assert.equal(semantic.support_artifact_hash, semantic.structured_output_hash);
  assert.equal(semantic.normalized_output_hash, semantic.structured_output_hash);

  // The runtime context packet was recorded and its hash threaded through the result.
  assert.match(result.context_packet_hash, /^[a-f0-9]{64}$/);
  assert.equal(result.context_packet_ref.ref_type, 'artifact_ref');

  // The N4 planning_input source hash is captured in the runtime provenance.
  assert.match(semantic.source_hashes.planning_input_hash ?? '', /^[a-f0-9]{64}$/);

  // The underlying invocation actually succeeded with the same structured output.
  assert.equal(result.invocation_result.status, 'succeeded');
  assert.deepEqual(result.invocation_result.structured_output, result.structured_output);
});

test('v1b N4 research-slice runtime is byte-stable across runs with identical fixed inputs', async () => {
  const first = await makeSubject().runtime.generateDraftArtifact(draftInput());
  const second = await makeSubject().runtime.generateDraftArtifact(draftInput());
  assert.equal(first.status, 'succeeded');
  assert.equal(second.status, 'succeeded');
  if (first.status !== 'succeeded' || second.status !== 'succeeded') {
    throw new Error('Expected both N4 runtime draft runs to succeed.');
  }
  // Context-packet identity + structured-output identity are independent of the incrementing
  // control-plane ref ids, so a fresh control plane reproduces them byte-for-byte.
  assert.equal(first.context_packet_hash, second.context_packet_hash);
  assert.equal(
    first.semantic_artifact.structured_output_hash,
    second.semantic_artifact.structured_output_hash,
  );
  assert.equal(
    first.semantic_artifact.runtime_invocation_context_hash,
    second.semantic_artifact.runtime_invocation_context_hash,
  );
  // prompt_packet_hash (covers the rendered messages, incl. the system body) is byte-stable too, so
  // the live-invocation and admission-expected-identity call sites of messages() stay consistent.
  assert.equal(
    first.semantic_artifact.prompt_packet_hash,
    second.semantic_artifact.prompt_packet_hash,
  );
});

// T-128 W-05 — N4 research-slice prompt-body byte-identity drift anchor. Pin the rendered SYSTEM
// content so any body change is a LOUD, intentional re-baseline. No harness/replay/e2e guard pins this
// v1b prompt body, so this is its only drift coverage. Re-baseline ONLY for a deliberate change.
const N4_RESEARCH_SLICE_SYSTEM_GOLDEN = 'c111329935c65fb0b6746a2ab235b503a9beec7554701dcb55c061a9d54b0e4c';
test('v1b N4 research-slice prompt body is byte-identity drift-anchored (T-128 W-05)', () => {
  assert.equal(sha256Text(buildV1bN4ResearchSliceSystemContent()), N4_RESEARCH_SLICE_SYSTEM_GOLDEN);
  // Must-preserve substrings the artifact/admission asserts depend on.
  const body = buildV1bN4ResearchSliceSystemContent();
  assert.ok(body.includes('Return only JSON matching ResearchSliceOptionSetDraft@v1.'));
  // Phase 1.5 — prompt must mirror n4DraftGateBlocker checks (harness-n4), not just the schema.
  assert.match(body, /source_validated_need_refs must include context_packet\.planning_input\.validated_need_ref/);
  assert.match(body, /keep both included_boundaries and excluded_boundaries non-empty/);
  assert.match(body, /echo context_packet\.planning_input\.target_community rather than drifting/);
  assert.match(body, /keep each claim_ceiling_alignment\.status off exceeds/);
  assert.match(body, /restate every context_packet\.planning_input\.non_goal inside excluded_boundaries/);
});

test('v1b N4 research-slice runtime rejects planning input whose lineage drifts from the frozen N4 input', async () => {
  const { runtime } = makeSubject();

  // Drift the snapshot ref so it no longer matches the frozen payload lineage that the gate self-checks.
  const drifted = draftInput({
    planning_input: planningInput({
      v1b_intake_snapshot_ref: ref('v1b_intake_snapshot', 'WRONG_intake_snapshot_999', 'snapshot_v1'),
    }),
  });

  await assert.rejects(
    () => runtime.generateDraftArtifact(drifted),
    (error: unknown) => {
      assert.ok(error instanceof AppError, 'Expected an AppError for the lineage drift.');
      assert.equal(error.errorCode, 'INVALID_PAYLOAD');
      assert.match(error.message, /planning input refs do not match frozen N4 input lineage/i);
      return true;
    },
  );
});

test('v1b N4 research-slice runtime rejects a request whose node id is not the v1b N4 node', async () => {
  const { runtime } = makeSubject();
  const wrongNode = draftInput({
    request: {
      ...makeRequest(),
      // Any non-N4 harness node id triggers the frozen-payload node guard.
      node_id: 'topic-selection.v1b.select-research-slice.v1' as TopicSelectionV1bWorkflowHarnessRunRequest['node_id'],
    },
  });

  await assert.rejects(
    () => runtime.generateDraftArtifact(wrongNode),
    (error: unknown) => {
      assert.ok(error instanceof AppError, 'Expected an AppError for the wrong node id.');
      assert.equal(error.errorCode, 'INVALID_PAYLOAD');
      assert.match(error.message, /requires the v1b N4 node id/i);
      return true;
    },
  );
});
