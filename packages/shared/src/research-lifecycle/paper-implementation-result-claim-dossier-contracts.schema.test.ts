import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import * as resultClaimContracts from './paper-implementation-result-claim-dossier-contracts.js';
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

function validResultPacketRequest() {
  return {
    result_interpretation_packet_id: 'result_interpretation_packet_001',
    validation_cycle_id: 'validation_cycle_001',
    experiment_plan_light_id: 'experiment_plan_light_001',
    source: {
      run_evidence_refs: [functionalRef('run_evidence_unit', 'run_evidence_unit_001')],
      validation_report_refs: [functionalRef('result_validation_report', 'validation_report_001')],
      metric_refs: [functionalRef('metric', 'metric_001')],
      failed_run_refs: [],
      inconclusive_run_refs: [],
      stale_or_invalidated_evidence_refs: [],
    },
    result_summary: {
      result_summary: 'The trusted run supports the bounded assertion.',
      supports_assertion_refs: [functionalRef('motive_assertion', 'motive_assertion_001')],
      challenges_assertion_refs: [],
      unexpected_findings: [],
      failed_runs_accounted_for: true,
      inconclusive_runs_accounted_for: true,
      exploratory_confirmatory_separated: true,
    },
    reliability: {
      failed_runs_retained: true,
      confound_refs: [],
      limitation_refs: [],
      reliability_notes: [],
    },
    claim_implications: {
      allowed_claim_ceiling: 'moderate',
      forbidden_overclaims: ['Do not claim broad generalization.'],
      recommended_claim_refs: [],
      required_followup_refs: [],
    },
    trace_manifest_id: 'trace_manifest_result_001',
  };
}

function validClaimCandidateRequest() {
  return {
    claim_candidate_id: 'claim_candidate_001',
    claim_type: 'empirical_finding',
    claim_statement: 'The method improves the primary metric on the admitted benchmark.',
    claim_strength: 'moderate',
    result_interpretation_packet_ids: ['result_interpretation_packet_001'],
    support_refs: [functionalRef('run_evidence_unit', 'run_evidence_unit_001')],
    challenge_refs: [],
    scope: {
      population_scope: 'Admitted benchmark split.',
      method_scope: 'Configured method variant.',
      dataset_scope: 'Dataset version v1.',
      metric_scope: 'Primary metric only.',
      negative_scope_notes: [],
      excluded_scope_notes: [],
    },
    boundary: {
      rationale: 'Supported by one trusted confirmatory run.',
      forbidden_overclaims: ['Do not claim broad generalization.'],
      hidden_counter_evidence_refs: [],
      required_followup_refs: [],
    },
    trace_manifest_id: 'trace_manifest_claim_001',
  };
}

function validDossierRequest() {
  return {
    dossier_id: 'implementation_dossier_001',
    dossier_status: 'ready_for_writing',
    result_interpretation_packet_ids: ['result_interpretation_packet_001'],
    claim_candidate_ids: ['claim_candidate_001'],
    claim_trace_packet_ids: ['claim_trace_packet_001'],
    closed_validation_cycle_snapshot_refs: [{
      validation_cycle_id: 'validation_cycle_001',
      closure_id: 'validation_cycle_closure_001',
      closure_snapshot_hash: 'sha256:closure-snapshot-001',
    }],
    experiment_section: {
      failed_run_refs: [],
      inconclusive_run_refs: [],
      negative_result_refs: [],
      excluded_stale_or_invalidated_evidence_refs: [],
      experiment_limitations: [],
    },
    claim_section: {
      admitted_claim_refs: [functionalRef('claim_candidate', 'claim_candidate_001')],
      rejected_claim_refs: [],
      forbidden_overclaims: ['Do not claim broad generalization.'],
      claim_ceiling: 'moderate',
    },
    readiness: {
      readiness_gate_result_id: 'dossier_readiness_gate_001',
      blocker_refs: [],
      warning_refs: [],
      readiness_notes: [],
    },
    trace_manifest_id: 'trace_manifest_dossier_001',
    projection_policy_version_id: 'writing_projection_policy_v1',
  };
}

test('paper-implementation result claim dossier schemas load through direct and aggregate exports', () => {
  assert.ok(resultClaimContracts.createResultInterpretationPacketRequestSchema);
  assert.ok(resultClaimContracts.createClaimCandidateRequestSchema);
  assert.ok(resultClaimContracts.createImplementationDossierRequestSchema);
  assert.ok(resultClaimContracts.createWritingEntryPacketRequestSchema);
  assert.ok(resultClaimContracts.recordResultClaimFeedbackEventRequestSchema);
  assert.ok(resultClaimContracts.paperImplementationWritingEntryPacketSchema);
  assert.ok(researchLifecycleContracts.createResultInterpretationPacketRequestSchema);
  assert.ok(researchLifecycleContracts.implementationDossierSchema);
  assert.ok(researchLifecycleContracts.paperImplementationWritingEntryPacketSchema);
  assert.equal('writingEntryPacketSchema' in researchLifecycleContracts, false);
});

test('result interpretation request requires explicit id, run evidence, trace, and accounting fields', async () => {
  assert.equal(
    await validateWithSchema(
      resultClaimContracts.createResultInterpretationPacketRequestSchema,
      validResultPacketRequest(),
    ),
    200,
  );
  const missingRunEvidence = validResultPacketRequest();
  missingRunEvidence.source.run_evidence_refs = [];
  assert.equal(
    await validateWithSchema(
      resultClaimContracts.createResultInterpretationPacketRequestSchema,
      missingRunEvidence,
    ),
    400,
  );
  const missingTrace = validResultPacketRequest();
  delete (missingTrace as Record<string, unknown>).trace_manifest_id;
  assert.equal(
    await validateWithSchema(
      resultClaimContracts.createResultInterpretationPacketRequestSchema,
      missingTrace,
    ),
    400,
  );
});

test('claim candidate schema keeps support refs explicit and rejects unsupported claim types', async () => {
  assert.equal(
    await validateWithSchema(
      resultClaimContracts.createClaimCandidateRequestSchema,
      validClaimCandidateRequest(),
    ),
    200,
  );
  const missingSupport = validClaimCandidateRequest();
  missingSupport.support_refs = [];
  assert.equal(
    await validateWithSchema(
      resultClaimContracts.createClaimCandidateRequestSchema,
      missingSupport,
    ),
    400,
  );
  const invalidClaimType = validClaimCandidateRequest();
  invalidClaimType.claim_type = 'motivation_claim';
  assert.equal(
    await validateWithSchema(
      resultClaimContracts.createClaimCandidateRequestSchema,
      invalidClaimType,
    ),
    400,
  );

  assert.equal(
    await validateWithSchema(
      resultClaimContracts.claimCandidateSchema,
      {
        claim_candidate_id: 'claim_candidate_001',
        implementation_project_id: 'implementation_project_001',
        claim_type: 'empirical_finding',
        claim_statement: 'The method improves the primary metric on the admitted benchmark.',
        claim_strength: 'moderate',
        claim_status: 'support_pending_trace',
        boundary_gate_status: 'allow_moderate',
        result_interpretation_packet_refs: [functionalRef('result_interpretation_packet', 'result_interpretation_packet_001')],
        support_refs: [functionalRef('run_evidence_unit', 'run_evidence_unit_001')],
        challenge_refs: [],
        scope: validClaimCandidateRequest().scope,
        boundary: validClaimCandidateRequest().boundary,
        trace_manifest_ref: functionalRef('trace_manifest', 'trace_manifest_claim_001'),
        trace_manifest_id: 'trace_manifest_claim_001',
        claim_trace_packet_ref: null,
        claim_trace_packet_id: null,
        human_confirmation_required: false,
        forbidden_overclaim_count: 0,
        policy_version_id: null,
        created_by: 'system',
        created_at: '2026-05-24T00:00:00.000Z',
      },
    ),
    200,
  );
});

test('dossier and writing packet schemas expose readiness and projection fields', async () => {
  assert.equal(
    await validateWithSchema(
      resultClaimContracts.createImplementationDossierRequestSchema,
      validDossierRequest(),
    ),
    200,
  );
  const missingReadiness = validDossierRequest();
  delete (missingReadiness as Record<string, unknown>).readiness;
  assert.equal(
    await validateWithSchema(
      resultClaimContracts.createImplementationDossierRequestSchema,
      missingReadiness,
    ),
    400,
  );
  assert.equal(
    await validateWithSchema(
      resultClaimContracts.createWritingEntryPacketRequestSchema,
      {
        projection_policy_version_id: 'writing_projection_policy_v1',
        packet_payload: {
          target_section: 'results',
        },
      },
    ),
    200,
  );
});

test('result claim feedback schema accepts only implementation result triggers', async () => {
  assert.equal(
    await validateWithSchema(
      resultClaimContracts.recordResultClaimFeedbackEventRequestSchema,
      {
        feedback_trigger: 'lower_claim_ceiling',
        severity: 'warning',
        summary: 'The implementation lowers the admitted claim ceiling.',
      },
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      resultClaimContracts.recordResultClaimFeedbackEventRequestSchema,
      {
        feedback_trigger: 'infeasible_route',
        severity: 'warning',
        summary: 'Wrong source trigger for this boundary.',
      },
    ),
    400,
  );
});
