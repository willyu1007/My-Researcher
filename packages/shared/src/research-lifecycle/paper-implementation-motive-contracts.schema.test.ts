import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import * as motiveContracts from './paper-implementation-motive-contracts.js';
import * as researchLifecycleContracts from './index.js';

type JsonSchema = Readonly<Record<string, unknown>>;

function functionalRef(refType: string, refId: string, versionId: string | null = null) {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: versionId,
  };
}

async function validateWithSchema(schema: JsonSchema, payload: object) {
  const app = Fastify();
  app.post('/validate', { schema: { body: schema } }, async () => ({ ok: true }));
  await app.ready();
  const response = await app.inject({
    method: 'POST',
    url: '/validate',
    payload,
  });
  await app.close();
  return response.statusCode;
}

function validMotiveContract() {
  return {
    short_name: 'Evidence synthesis claim conflation',
    motivation_claim: 'RAG systems conflate adjacent evidence claims during synthesis.',
    problem_pressure: 'False gap judgments affect research planning quality.',
    current_solution_insufficiency: 'Existing retrieval improvements do not address synthesis-level conflation.',
    unmet_or_failure_mechanism: 'Adjacent but non-equivalent claims are compressed into one unsupported statement.',
    target_setting: 'Cross-paper evidence synthesis for CS research ideation.',
    expected_contribution_path: 'Expose and reduce synthesis-level claim conflation.',
    why_this_is_not_trivial: 'The failure appears after retrieval in semantic composition.',
    why_existing_baselines_do_not_already_solve_it: 'Baselines optimize relevance instead of claim equivalence.',
    what_makes_this_researchable_now: 'The corpus and evidence-locator substrate are available.',
  };
}

function validDraftPayload() {
  return {
    motive_contract: validMotiveContract(),
    scope_contract: {
      included_scope: ['cross-paper synthesis'],
      excluded_scope: ['general web QA'],
      non_goals: ['claim broad model superiority'],
      dataset_scope: 'CS papers',
      task_scope: 'evidence synthesis',
      baseline_scope: 'retrieval-first baselines',
      method_scope: 'claim-aware synthesis',
      evaluation_scope: 'false gap detection',
    },
    falsification_contract: {
      invalidation_conditions: ['Baselines show no claim conflation under controlled synthesis.'],
      weakening_conditions: ['Only rare low-severity conflation remains.'],
      minimum_evidence_to_continue: ['At least one literature or probe signal shows conflation.'],
      decisive_negative_conditions: ['Controlled tests show retrieval alone explains the issue.'],
    },
    claim_boundary: {
      maximum_allowed_claim: 'The method reduces claim conflation in the scoped benchmark.',
      minimum_defensible_contribution_claim: 'The analysis identifies a measurable synthesis failure mode.',
      forbidden_overclaims: ['Do not claim general RAG reliability.'],
      claim_types_allowed: ['analysis_claim', 'empirical_finding'],
    },
    source_refs: [functionalRef('topic_package', 'topic_package_001', 'v1')],
    assertions: [
      {
        assertion_type: 'failure_mechanism',
        assertion_text: 'Claim conflation is a synthesis-level failure mechanism.',
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
          what_would_contradict_this: ['Equivalent claims are preserved across synthesis.'],
          what_would_weaken_this: ['Conflation is limited to missing abstracts.'],
        },
        expected_initial_status: 'untested',
      },
    ],
  };
}

function validBindingPayload() {
  return {
    assertion_id: 'motive_assertion_001',
    evidence_ref: functionalRef('literature_evidence_unit', 'literature_evidence_unit_001'),
    role: 'support',
    scope: {
      dataset_scope: 'CS papers',
    },
    strength: {
      directness: 'moderate',
      reliability: 'medium',
      reproducibility: 'unknown',
      freshness: 'fresh',
    },
    support_state: 'weak',
    challenge_status: 'none',
    interpretation: {
      normalized_statement: 'Prior work reports related claim conflation.',
      why_relevant_to_assertion: 'It supports the failure mechanism assertion.',
      limitations: ['Different benchmark setting.'],
    },
    trace_manifest_id: 'trace_manifest_001',
  };
}

function validTransferPayload() {
  return {
    source: {
      board_version_id: 'motive_evidence_board_version_001',
      assertion_id: 'motive_assertion_001',
      evidence_binding_id: 'evidence_binding_001',
    },
    target: {
      board_version_id: 'motive_evidence_board_version_002',
      assertion_id: 'motive_assertion_002',
    },
    transfer_role: 'transfer_support',
    transfer_validity: 'valid',
    scope_match: {
      dataset_scope_match: 'exact',
      method_scope_match: 'partial',
      metric_scope_match: 'exact',
      setting_scope_match: 'partial',
    },
    rationale: 'The evidence transfers under the narrowed scope.',
    reviewed_by: 'human',
    trace_manifest_id: 'trace_manifest_001',
  };
}

test('paper-implementation motive schemas load through direct and aggregate exports', () => {
  assert.ok(motiveContracts.createCoreMotiveDraftRequestSchema);
  assert.ok(motiveContracts.admitCoreMotiveVersionRequestSchema);
  assert.ok(motiveContracts.createMotiveEvidenceBoardVersionRequestSchema);
  assert.ok(motiveContracts.createEvidenceTransferBindingRequestSchema);
  assert.ok(motiveContracts.evidenceTransferBindingSchema);
  assert.ok(motiveContracts.applyMotivePortfolioDecisionRequestSchema);
  assert.ok(researchLifecycleContracts.createCoreMotiveDraftRequestSchema);
  assert.ok(researchLifecycleContracts.motiveEvidenceBoardVersionSchema);
});

test('evidence transfer binding schema requires explicit source target scope and trace', async () => {
  assert.equal(
    await validateWithSchema(
      motiveContracts.createEvidenceTransferBindingRequestSchema,
      validTransferPayload(),
    ),
    200,
  );
  const missingTrace = validTransferPayload();
  delete (missingTrace as Record<string, unknown>).trace_manifest_id;
  assert.equal(
    await validateWithSchema(
      motiveContracts.createEvidenceTransferBindingRequestSchema,
      missingTrace,
    ),
    400,
  );
  assert.equal(
    await validateWithSchema(
      motiveContracts.createEvidenceTransferBindingRequestSchema,
      {
        ...validTransferPayload(),
        transfer_role: 'support',
      },
    ),
    400,
  );
});

test('draft request rejects missing semantic contract falsification or claim boundary', async () => {
  assert.equal(
    await validateWithSchema(motiveContracts.createCoreMotiveDraftRequestSchema, validDraftPayload()),
    200,
  );
  const missingFailureMechanism = validDraftPayload();
  delete (missingFailureMechanism.motive_contract as Record<string, unknown>).unmet_or_failure_mechanism;
  assert.equal(
    await validateWithSchema(motiveContracts.createCoreMotiveDraftRequestSchema, missingFailureMechanism),
    400,
  );
  const missingFalsification = validDraftPayload();
  delete (missingFalsification as Record<string, unknown>).falsification_contract;
  assert.equal(
    await validateWithSchema(motiveContracts.createCoreMotiveDraftRequestSchema, missingFalsification),
    400,
  );
  const missingClaimBoundary = validDraftPayload();
  delete (missingClaimBoundary as Record<string, unknown>).claim_boundary;
  assert.equal(
    await validateWithSchema(motiveContracts.createCoreMotiveDraftRequestSchema, missingClaimBoundary),
    400,
  );
});

test('draft request accepts optional acceptance-bridge lineage and rejects malformed lineage', async () => {
  assert.equal(
    await validateWithSchema(motiveContracts.createCoreMotiveDraftRequestSchema, {
      ...validDraftPayload(),
      source_proposal_artifact_ref: functionalRef('paper_implementation_runtime_artifact', 'runtime_artifact_001'),
      source_proposal_artifact_hash: 'a'.repeat(64),
    }),
    200,
  );
  assert.equal(
    await validateWithSchema(motiveContracts.createCoreMotiveDraftRequestSchema, {
      ...validDraftPayload(),
      source_proposal_artifact_ref: null,
      source_proposal_artifact_hash: null,
    }),
    200,
  );
  assert.equal(
    await validateWithSchema(motiveContracts.createCoreMotiveDraftRequestSchema, {
      ...validDraftPayload(),
      source_proposal_artifact_ref: 'runtime_artifact_001',
      source_proposal_artifact_hash: 'a'.repeat(64),
    }),
    400,
  );
  assert.equal(
    await validateWithSchema(motiveContracts.createCoreMotiveDraftRequestSchema, {
      ...validDraftPayload(),
      source_proposal_artifact_ref: functionalRef('paper_implementation_runtime_artifact', 'runtime_artifact_001'),
      source_proposal_artifact_hash: { nested: 'not-a-hash' },
    }),
    400,
  );
});

test('assertion schema rejects unsupported type importance and evidence requirement', async () => {
  assert.equal(
    await validateWithSchema(
      motiveContracts.createMotiveAssertionInputSchema,
      validDraftPayload().assertions[0],
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      motiveContracts.createMotiveAssertionInputSchema,
      {
        ...validDraftPayload().assertions[0],
        assertion_type: 'freeform_claim',
      },
    ),
    400,
  );
  assert.equal(
    await validateWithSchema(
      motiveContracts.createMotiveAssertionInputSchema,
      {
        ...validDraftPayload().assertions[0],
        importance: { role: 'mandatory', must_hold_for_motive_to_continue: true },
      },
    ),
    400,
  );
});

test('evidence binding requires assertion role scope source ref and blocks board summary evidence', async () => {
  assert.equal(
    await validateWithSchema(motiveContracts.createEvidenceBindingInputSchema, validBindingPayload()),
    200,
  );
  const missingSource = validBindingPayload();
  delete (missingSource as Record<string, unknown>).evidence_ref;
  assert.equal(
    await validateWithSchema(motiveContracts.createEvidenceBindingInputSchema, missingSource),
    400,
  );
  assert.equal(
    await validateWithSchema(
      motiveContracts.createEvidenceBindingInputSchema,
      {
        ...validBindingPayload(),
        evidence_ref: functionalRef('board_summary', 'board_summary_001'),
      },
    ),
    400,
  );
});

test('portfolio decision rejects impossible role sets at schema boundary', async () => {
  const valid = {
    motive_roles_after_decision: {
      primary_motive_ids: ['motive_001'],
      secondary_motive_ids: [],
      fallback_motive_ids: [],
      supporting_motive_ids: [],
      parked_motive_ids: [],
      abandoned_motive_ids: [],
    },
    changes: {
      promoted_to_primary: ['motive_001'],
      demoted_from_primary: [],
      merged_motives: [],
      split_motives: [],
      newly_parked: [],
      newly_abandoned: [],
    },
    rationale: {
      evidence_strength_summary: 'The primary motive has the strongest support.',
    },
    max_active_motives: 3,
    max_primary_motives: 1,
    max_parallel_routes: 2,
  };
  assert.equal(
    await validateWithSchema(motiveContracts.applyMotivePortfolioDecisionRequestSchema, valid),
    200,
  );
  assert.equal(
    await validateWithSchema(
      motiveContracts.applyMotivePortfolioDecisionRequestSchema,
      {
        ...valid,
        max_primary_motives: 0,
      },
    ),
    400,
  );
});
