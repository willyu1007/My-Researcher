import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type { PrismaClient } from '@prisma/client';
import type {
  CoreMotiveDraftResponse,
  CrossBoardReview,
  EvidenceBinding,
  EvidenceTransferBinding,
  MotiveEvidenceBoardVersion,
  MotiveEvolutionDecision,
  MotivePortfolioDecision,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { PrismaPaperImplementationMotiveRepository } from './prisma-paper-implementation-motive-repository.js';

const NOW = '2026-05-21T00:00:00.000Z';
const PROJECT_ID = 'implementation_project_001';

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: versionId,
  };
}

function makeDraft(): CoreMotiveDraftResponse {
  return {
    motive_identity: {
      motive_id: 'core_motive_001',
      implementation_project_id: PROJECT_ID,
      current_version_id: null,
      origin: {
        source_topic_package_id: 'topic_package_001',
        source_validated_need_ids: [],
        source_topic_question_contract_id: null,
        created_from_motive_ids: [],
      },
      portfolio_role: {
        role: 'parked',
        role_since: NOW,
        role_decision_ref: null,
      },
      lifecycle_status: 'parked',
      lineage: {
        merged_into_motive_id: null,
        split_into_motive_ids: [],
        superseded_by_motive_id: null,
        parent_motive_ids: [],
        child_motive_ids: [],
      },
      control: {
        owner: null,
        human_confirmation_required_for_major_change: true,
      },
      policy_version_id: 'policy_v1',
      created_by: 'system',
      created_at: NOW,
      updated_at: NOW,
    },
    motive_set: {
      motive_set_id: 'core_motive_set_001',
      implementation_project_id: PROJECT_ID,
      active_motive_ids: [],
      primary_motive_ids: [],
      secondary_motive_ids: [],
      fallback_motive_ids: [],
      supporting_motive_ids: [],
      parked_motive_ids: ['core_motive_001'],
      abandoned_motive_ids: [],
      active_motive_count: 0,
      max_active_motives: 3,
      max_primary_motives: 1,
      max_parallel_routes: 2,
      latest_portfolio_decision_id: null,
      policy_version_id: 'policy_v1',
      created_at: NOW,
      updated_at: NOW,
    },
    core_motive_version: {
      core_motive_version_id: 'core_motive_version_001',
      motive_id: 'core_motive_001',
      implementation_project_id: PROJECT_ID,
      version_number: 1,
      version_status: 'draft',
      version_origin: {
        created_by_decision_id: null,
        previous_version_id: null,
        derived_from_motive_version_ids: [],
        derivation_type: 'initial',
      },
      motive_contract: {
        short_name: 'Claim conflation',
        motivation_claim: 'Synthesis can conflate claims.',
        problem_pressure: 'Planning quality is affected.',
        current_solution_insufficiency: 'Retrieval baselines are insufficient.',
        unmet_or_failure_mechanism: 'Claims are compressed.',
        target_setting: 'CS papers',
        expected_contribution_path: 'Measure and reduce conflation.',
        why_this_is_not_trivial: 'The failure is semantic.',
        why_existing_baselines_do_not_already_solve_it: 'They do not model equivalence.',
        what_makes_this_researchable_now: 'Evidence locators exist.',
      },
      scope_contract: {
        included_scope: ['synthesis'],
        excluded_scope: [],
        non_goals: [],
      },
      boundary_to_upstream: {
        topic_question_contract_id: null,
        research_slice_id: null,
        within_upstream_boundary: true,
        boundary_risk_notes: [],
        upstream_recheck_required: false,
      },
      falsification_contract: {
        invalidation_conditions: ['No conflation.'],
        weakening_conditions: ['Low severity only.'],
        minimum_evidence_to_continue: ['One signal.'],
        decisive_negative_conditions: ['Retrieval explains it.'],
      },
      claim_boundary: {
        maximum_allowed_claim: 'Scoped reduction.',
        minimum_defensible_contribution_claim: 'Measurable failure mode.',
        forbidden_overclaims: [],
        claim_types_allowed: ['analysis_claim'],
      },
      route_interface: {
        plausible_route_families: [],
        disallowed_route_families: [],
        required_route_properties: [],
        cheapest_validation_route_hint: null,
      },
      source_refs: [ref('topic_package', 'topic_package_001', 'v1')],
      source_result_packet_refs: [],
      source_human_judgment_refs: [],
      trace_manifest_ref: null,
      trace_manifest_id: null,
      admission_gate_result_id: null,
      evolution_decision_id: null,
      hypothesis_only: false,
      policy_version_id: 'policy_v1',
      created_by: 'system',
      created_at: NOW,
      admitted_at: null,
    },
    motive_version_state: {
      motive_version_state_id: 'motive_version_state_001',
      implementation_project_id: PROJECT_ID,
      motive_id: 'core_motive_001',
      core_motive_version_id: 'core_motive_version_001',
      review_status: 'unreviewed',
      freshness_status: 'fresh',
      maturity_level: 'L0_hypothesis',
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
    assertions: [
      {
        assertion_id: 'motive_assertion_001',
        implementation_project_id: PROJECT_ID,
        motive_id: 'core_motive_001',
        core_motive_version_id: 'core_motive_version_001',
        assertion_type: 'failure_mechanism',
        assertion_text: 'Conflation is a synthesis failure.',
        importance: {
          role: 'core',
          must_hold_for_motive_to_continue: true,
        },
        validation_requirements: {
          minimum_support_level: 'weak',
          required_evidence_types: ['literature'],
          required_counter_evidence_check: true,
        },
        falsification: {
          what_would_contradict_this: ['No conflation.'],
          what_would_weaken_this: ['Low severity only.'],
        },
        status: 'untested',
        created_by: 'system',
        created_at: NOW,
      },
    ],
  };
}

function makeDecision(): MotivePortfolioDecision {
  return {
    portfolio_decision_id: 'motive_portfolio_decision_001',
    implementation_project_id: PROJECT_ID,
    motive_roles_after_decision: {
      primary_motive_ids: ['core_motive_001'],
      secondary_motive_ids: [],
      fallback_motive_ids: [],
      supporting_motive_ids: [],
      parked_motive_ids: [],
      abandoned_motive_ids: [],
    },
    changes: {
      promoted_to_primary: ['core_motive_001'],
      demoted_from_primary: [],
      merged_motives: [],
      split_motives: [],
      newly_parked: [],
      newly_abandoned: [],
    },
    rationale: { admission: 'Admitted.' },
    active_motive_count: 1,
    max_active_motives: 3,
    max_primary_motives: 1,
    max_parallel_routes: 2,
    proposed_by: 'system',
    confirmed_by: null,
    confirmation_level: 'not_required',
    policy_version_id: 'policy_v1',
    created_at: NOW,
    applied_at: NOW,
  };
}

function makeBoard(): MotiveEvidenceBoardVersion {
  return {
    board_version_id: 'motive_evidence_board_001',
    implementation_project_id: PROJECT_ID,
    motive_id: 'core_motive_001',
    core_motive_version_id: 'core_motive_version_001',
    assertion_refs: [ref('motive_assertion', 'motive_assertion_001')],
    evidence_binding_refs: [ref('evidence_binding', 'evidence_binding_001')],
    board_summary: {
      current_support_summary: 'Supported.',
      current_challenge_summary: 'No challenge.',
      unresolved_conflicts: [],
      board_gap_summary: 'Needs probe.',
      next_evidence_needed: ['Probe.'],
    },
    board_state: {
      readiness_status: 'evidence_ready',
      blocker_status: 'none',
      freshness_status: 'fresh',
      support_state: 'weak',
      challenge_status: 'none',
      accepted_risk_refs: [],
    },
    trace_manifest_ref: ref('trace_manifest', 'trace_manifest_002'),
    trace_manifest_id: 'trace_manifest_002',
    created_by: 'system',
    created_at: NOW,
  };
}

function makeBinding(): EvidenceBinding {
  return {
    binding_id: 'evidence_binding_001',
    implementation_project_id: PROJECT_ID,
    motive_id: 'core_motive_001',
    core_motive_version_id: 'core_motive_version_001',
    board_version_id: 'motive_evidence_board_001',
    assertion_id: 'motive_assertion_001',
    evidence_ref: ref('literature_evidence_unit', 'literature_evidence_unit_001'),
    role: 'support',
    scope: { dataset_scope: 'CS papers' },
    strength: {
      directness: 'moderate',
      reliability: 'medium',
      reproducibility: 'unknown',
      freshness: 'fresh',
    },
    support_state: 'weak',
    challenge_status: 'none',
    freshness_status: 'fresh',
    interpretation: {
      normalized_statement: 'Prior work supports this.',
      why_relevant_to_assertion: 'It supports the assertion.',
      limitations: [],
    },
    trace_manifest_ref: ref('trace_manifest', 'trace_manifest_003'),
    trace_manifest_id: 'trace_manifest_003',
    created_by: 'system',
    created_at: NOW,
  };
}

function makeTransferBinding(): EvidenceTransferBinding {
  return {
    transfer_id: 'evidence_transfer_binding_001',
    implementation_project_id: PROJECT_ID,
    source: {
      board_version_id: 'motive_evidence_board_001',
      assertion_id: 'motive_assertion_001',
      evidence_binding_id: 'evidence_binding_001',
    },
    target: {
      board_version_id: 'motive_evidence_board_001',
      assertion_id: 'motive_assertion_001',
    },
    transfer_role: 'transfer_support',
    transfer_validity: 'valid',
    scope_match: {
      dataset_scope_match: 'exact',
      method_scope_match: 'partial',
      metric_scope_match: 'exact',
      setting_scope_match: 'partial',
    },
    rationale: 'The evidence transfers under the scoped board.',
    reviewed_by: 'human',
    trace_manifest_ref: ref('trace_manifest', 'trace_manifest_004'),
    trace_manifest_id: 'trace_manifest_004',
    created_at: NOW,
  };
}

function makeEvolutionDecision(): MotiveEvolutionDecision {
  return {
    motive_evolution_decision_id: 'motive_evolution_decision_001',
    implementation_project_id: PROJECT_ID,
    source_motive_refs: [ref('core_motive', 'core_motive_001')],
    triggering_validation_cycle_refs: [],
    triggering_result_packet_refs: [],
    triggering_cross_board_review_refs: [],
    triggering_human_request_refs: [],
    evolution_type: 'refine_statement',
    effect_class: 'semantic_evolution',
    decision_summary: 'Refine wording.',
    decision_rationale: 'Evidence narrowed the claim.',
    change_set: {},
    proposed_outputs: {},
    evidence_basis: {},
    impact_analysis: {},
    gate: {},
    proposed_by: 'system',
    confirmed_by: null,
    human_confirmation_required: false,
    confirmation_ref: null,
    application_status: 'approved',
    trace_manifest_ref: null,
    trace_manifest_id: null,
    policy_version_id: 'policy_v1',
    created_at: NOW,
  };
}

type StoredRow = Record<string, unknown> & { id: string };

function makeModel(rows: StoredRow[]) {
  return {
    create: async ({ data }: { data: StoredRow }) => {
      rows.push({ ...data });
      return rows.at(-1);
    },
    createMany: async ({ data }: { data: StoredRow[] }) => {
      rows.push(...data.map((row) => ({ ...row })));
      return { count: data.length };
    },
    findFirst: async ({ where }: { where: Partial<StoredRow> }) =>
      rows.find((row) => matchesWhere(row, where)) ?? null,
    findUnique: async ({ where }: { where: Partial<StoredRow> }) =>
      rows.find((row) => matchesWhere(row, where)) ?? null,
    findMany: async ({ where }: { where: Partial<StoredRow> }) =>
      rows.filter((row) => matchesWhere(row, where)),
    update: async ({ where, data }: { where: Partial<StoredRow>; data: Partial<StoredRow> }) => {
      const index = rows.findIndex((row) => matchesWhere(row, where));
      if (index < 0) {
        throw new Error('row not found');
      }
      rows[index] = { ...rows[index], ...data };
      return rows[index];
    },
    updateMany: async ({ where, data }: { where: Partial<StoredRow>; data: Partial<StoredRow> }) => {
      const matchingIndexes = rows.flatMap((row, index) => (
        matchesWhere(row, where) ? [index] : []
      ));
      for (const index of matchingIndexes) {
        rows[index] = { ...rows[index], ...data };
      }
      return { count: matchingIndexes.length };
    },
  };
}

function matchesWhere(row: StoredRow, where: Partial<StoredRow>): boolean {
  return Object.entries(where).every(([key, value]) => row[key] === value);
}

function makeFakePrismaClient(): PrismaClient {
  const client = {
    paperImplementationCoreMotiveIdentity: makeModel([]),
    paperImplementationCoreMotiveSet: makeModel([]),
    paperImplementationCoreMotiveVersion: makeModel([]),
    paperImplementationCoreMotiveVersionState: makeModel([]),
    paperImplementationMotiveAssertion: makeModel([]),
    paperImplementationMotiveEvidenceBoardVersion: makeModel([]),
    paperImplementationEvidenceBinding: makeModel([]),
    paperImplementationEvidenceTransferBinding: makeModel([]),
    paperImplementationCrossBoardReview: makeModel([]),
    paperImplementationMotivePortfolioDecision: makeModel([]),
    paperImplementationMotiveEvolutionDecision: makeModel([]),
  };
  return {
    ...client,
    $transaction: async (callback: (tx: typeof client) => Promise<unknown>) => callback(client),
  } as unknown as PrismaClient;
}

test('Prisma PaperImplementationMotive repository round-trips motive board portfolio and evolution objects', async () => {
  const repository = new PrismaPaperImplementationMotiveRepository(makeFakePrismaClient());
  const draft = makeDraft();
  await repository.createCoreMotiveDraft(draft);
  assert.equal((await repository.listMotiveIdentities(PROJECT_ID)).length, 1);
  assert.equal((await repository.findMotiveSet(PROJECT_ID))?.parked_motive_ids[0], 'core_motive_001');
  assert.equal(
    (await repository.listAssertionsByVersion(PROJECT_ID, 'core_motive_version_001'))[0]?.assertion_type,
    'failure_mechanism',
  );

  const decision = makeDecision();
  const admitted = await repository.admitCoreMotiveVersion({
    motive_identity: {
      ...draft.motive_identity,
      current_version_id: 'core_motive_version_001',
      portfolio_role: {
        role: 'primary',
        role_since: NOW,
        role_decision_ref: ref('motive_portfolio_decision', decision.portfolio_decision_id),
      },
      lifecycle_status: 'active',
    },
    motive_set: {
      ...draft.motive_set,
      active_motive_ids: ['core_motive_001'],
      primary_motive_ids: ['core_motive_001'],
      parked_motive_ids: [],
      active_motive_count: 1,
      latest_portfolio_decision_id: decision.portfolio_decision_id,
    },
    core_motive_version: {
      ...draft.core_motive_version,
      version_status: 'admitted',
      trace_manifest_ref: ref('trace_manifest', 'trace_manifest_001'),
      trace_manifest_id: 'trace_manifest_001',
      admission_gate_result_id: 'gate_001',
      admitted_at: NOW,
    },
    motive_version_state: {
      ...draft.motive_version_state,
      review_status: 'reviewed',
      maturity_level: 'L1_evidence_backed',
    },
    portfolio_decision: decision,
  });
  assert.equal(admitted.core_motive_version.version_status, 'admitted');

  const board = makeBoard();
  const binding = makeBinding();
  await repository.createMotiveEvidenceBoardVersion({
    board_version: board,
    evidence_bindings: [binding],
    motive_version_state: {
      ...draft.motive_version_state,
      current_board_version_id: board.board_version_id,
      board_readiness_status: 'evidence_ready',
    },
  });
  assert.equal((await repository.listMotiveEvidenceBoards(PROJECT_ID))[0]?.board_version_id, board.board_version_id);
  assert.equal(
    (await repository.findMotiveEvidenceBoardById(PROJECT_ID, board.board_version_id))?.motive_id,
    'core_motive_001',
  );
  assert.equal(
    (await repository.findEvidenceBindingById(PROJECT_ID, binding.binding_id))?.evidence_ref.ref_id,
    'literature_evidence_unit_001',
  );

  const transfer = await repository.createEvidenceTransferBinding(makeTransferBinding());
  assert.equal(transfer.transfer_id, 'evidence_transfer_binding_001');
  assert.equal((await repository.listEvidenceTransferBindings(PROJECT_ID))[0]?.trace_manifest_id, 'trace_manifest_004');

  const review: CrossBoardReview = {
    cross_board_review_id: 'cross_board_review_001',
    implementation_project_id: PROJECT_ID,
    motive_refs: [ref('core_motive', 'core_motive_001')],
    shared_evidence_suggestions: [],
    conflict_warnings: ['possible overlap'],
    merge_suggestions: [],
    split_suggestions: [],
    route_reuse_suggestions: [],
    experiment_reuse_suggestions: [],
    portfolio_update_recommendations: [],
    recommendation_payload: {},
    created_by: 'system',
    created_at: NOW,
  };
  assert.equal((await repository.createCrossBoardReview(review)).conflict_warnings[0], 'possible overlap');
  assert.equal((await repository.listMotivePortfolioDecisions(PROJECT_ID))[0]?.portfolio_decision_id, decision.portfolio_decision_id);

  const evolution = await repository.createMotiveEvolutionDecision(makeEvolutionDecision());
  assert.equal(
    (await repository.findMotiveEvolutionDecisionById(PROJECT_ID, evolution.motive_evolution_decision_id))?.effect_class,
    'semantic_evolution',
  );
});

test('motive migration declares queryable owner gate portfolio trace indexes', async () => {
  const sql = await readFile(
    new URL('../../../../../prisma/migrations/20260521100000_add_paper_implementation_motive_evidence_board/migration.sql', import.meta.url),
    'utf8',
  );
  for (const expected of [
    'picmi_project_created_idx',
    'picmi_portfolio_role_idx',
    'picmi_lifecycle_idx',
    'picms_project_unique',
    'picmv_trace_manifest_idx',
    'picmv_admission_gate_idx',
    'picmvs_board_readiness_idx',
    'pima_assertion_type_idx',
    'pieb_source_ref_idx',
    'pieb_trace_manifest_idx',
    'pietb_source_binding_idx',
    'pietb_trace_manifest_idx',
    'pimpd_active_count_idx',
    'pimed_trace_manifest_idx',
  ]) {
    assert.match(sql, new RegExp(expected));
  }
});
