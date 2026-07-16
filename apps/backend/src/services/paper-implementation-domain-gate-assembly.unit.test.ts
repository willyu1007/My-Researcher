import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  PaperImplementationClaimCandidateProposal,
  PaperImplementationDossierReadinessProposal,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import {
  assembleCreateClaimCandidateRequest,
  assembleCreateImplementationDossierRequest,
  assembleCreateResultInterpretationPacketRequest,
  extractClaimBoundaryDomainGateContext,
  extractDossierReadinessDomainGateContext,
  extractResultAnalysisDomainGateContext,
} from './paper-implementation-domain-gate-assembly.js';

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return { ref_type: refType, ref_id: refId, title_card_id: 'title_card_asm_001', version_id: null };
}

const RESULT_SOURCES = [
  ref('run_evidence_unit', 'reu_001'),
  ref('result_validation_report', 'rvr_001'),
  ref('result_interpretation_packet', 'packet_001'),
  ref('trace_manifest', 'trace_001'),
  ref('metric', 'metric_001'),
  ref('experiment_plan_light', 'plan_001'),
];

test('T-124 G4.6: result-analysis context extraction maps every structural field from the request face', () => {
  const extraction = extractResultAnalysisDomainGateContext(ref('validation_cycle', 'cycle_001'), RESULT_SOURCES);
  assert.ok(extraction.ok);
  assert.deepEqual(extraction.context, {
    result_interpretation_packet_id: 'packet_001',
    validation_cycle_id: 'cycle_001',
    experiment_plan_light_id: 'plan_001',
    trace_manifest_id: 'trace_001',
    run_evidence_refs: [ref('run_evidence_unit', 'reu_001')],
    validation_report_refs: [ref('result_validation_report', 'rvr_001')],
    metric_refs: [ref('metric', 'metric_001')],
  });
});

test('T-124 G4.6: result-analysis context extraction fails closed on missing/ambiguous structural refs', () => {
  const wrongTarget = extractResultAnalysisDomainGateContext(ref('experiment_result', 'er_001'), RESULT_SOURCES);
  assert.equal(wrongTarget.ok, false);
  assert.match((wrongTarget as { issues: string[] }).issues.join(' '), /validation_cycle/);

  const noPacket = extractResultAnalysisDomainGateContext(
    ref('validation_cycle', 'cycle_001'),
    RESULT_SOURCES.filter((item) => item.ref_type !== 'result_interpretation_packet'),
  );
  assert.equal(noPacket.ok, false);
  assert.match((noPacket as { issues: string[] }).issues.join(' '), /result_interpretation_packet/);

  const twoTraces = extractResultAnalysisDomainGateContext(
    ref('validation_cycle', 'cycle_001'),
    [...RESULT_SOURCES, ref('trace_manifest', 'trace_002')],
  );
  assert.equal(twoTraces.ok, false);
  assert.match((twoTraces as { issues: string[] }).issues.join(' '), /exactly one trace_manifest/);

  const noRunEvidence = extractResultAnalysisDomainGateContext(
    ref('validation_cycle', 'cycle_001'),
    RESULT_SOURCES.filter((item) => item.ref_type !== 'run_evidence_unit'),
  );
  assert.equal(noRunEvidence.ok, false);
  assert.match((noRunEvidence as { issues: string[] }).issues.join(' '), /run_evidence_unit/);
});

test('T-124 G4.6: result-analysis assembly is pure and maps semantic fields verbatim', () => {
  const extraction = extractResultAnalysisDomainGateContext(ref('validation_cycle', 'cycle_001'), RESULT_SOURCES);
  assert.ok(extraction.ok);
  const interpretation = {
    result_summary: 'Bounded summary.',
    supports_assertion_refs: [ref('motive_assertion', 'assert_001')],
    challenges_assertion_refs: [],
    unexpected_findings: ['one surprise'],
    failed_run_refs: [ref('external_training_job', 'failed_run_001')],
    inconclusive_run_refs: [],
    stale_or_invalidated_evidence_refs: [],
    failed_runs_accounted_for: true,
    inconclusive_runs_accounted_for: true,
    exploratory_confirmatory_separated: true,
  };
  const reliability = {
    failed_runs_retained: true,
    confound_refs: [],
    limitation_refs: [ref('limitation', 'lim_001')],
    reliability_notes: ['note'],
  };
  const claimImplications = {
    allowed_claim_ceiling: 'moderate' as const,
    forbidden_overclaims: ['overclaim'],
    recommended_claim_refs: [],
    required_followup_refs: [],
  };
  const assemble = () => assembleCreateResultInterpretationPacketRequest({
    context: extraction.context,
    interpretation,
    reliability,
    claimImplications,
    createdBy: 'llm',
  });
  const first = assemble();
  // Structural envelope from the request context.
  assert.equal(first.result_interpretation_packet_id, 'packet_001');
  assert.equal(first.validation_cycle_id, 'cycle_001');
  assert.equal(first.experiment_plan_light_id, 'plan_001');
  assert.equal(first.trace_manifest_id, 'trace_001');
  assert.deepEqual(first.source.run_evidence_refs, [ref('run_evidence_unit', 'reu_001')]);
  // Semantic accounting/content mapped verbatim from the role blocks.
  assert.deepEqual(first.source.failed_run_refs, [ref('external_training_job', 'failed_run_001')]);
  assert.equal(first.result_summary.result_summary, 'Bounded summary.');
  assert.deepEqual(first.reliability.reliability_notes, ['note']);
  assert.equal(first.claim_implications.allowed_claim_ceiling, 'moderate');
  assert.equal(first.created_by, 'llm');
  // Pure & replayable: same inputs, same request.
  assert.deepEqual(assemble(), first);
});

const CLAIM_SOURCES = [
  ref('result_interpretation_packet', 'packet_001'),
  ref('claim_trace_packet', 'ctp_001'),
  ref('claim_candidate', 'claim_001'),
  ref('trace_manifest', 'trace_claim_001'),
  ref('human_confirmation_record', 'confirm_001'),
  ref('run_evidence_unit', 'reu_001'),
];

function claimProposal(): PaperImplementationClaimCandidateProposal {
  return {
    claim_type: 'empirical_finding',
    claim_statement: 'Bounded claim.',
    claim_strength: 'strong',
    support_refs: [ref('run_evidence_unit', 'reu_001')],
    challenge_refs: [],
    scope: {
      population_scope: 'p',
      method_scope: 'm',
      dataset_scope: 'd',
      metric_scope: 'x',
      negative_scope_notes: [],
      excluded_scope_notes: [],
    },
    boundary_rationale: 'bounded',
    forbidden_overclaims: ['overclaim'],
    hidden_counter_evidence_refs: [],
    required_followup_refs: [],
  };
}

test('T-124 G4.6: claim-boundary context extraction + assembly (structural envelope vs semantic proposal)', () => {
  const extraction = extractClaimBoundaryDomainGateContext(CLAIM_SOURCES);
  assert.ok(extraction.ok);
  assert.equal(extraction.context.claim_candidate_id, 'claim_001');
  assert.equal(extraction.context.trace_manifest_id, 'trace_claim_001');
  assert.equal(extraction.context.claim_trace_packet_id, 'ctp_001');
  assert.deepEqual(extraction.context.result_interpretation_packet_ids, ['packet_001']);
  assert.equal(extraction.context.human_confirmation_ref?.ref_id, 'confirm_001');
  assert.deepEqual(extraction.context.run_evidence_refs, [ref('run_evidence_unit', 'reu_001')]);

  const request = assembleCreateClaimCandidateRequest({
    context: extraction.context,
    proposal: claimProposal(),
    createdBy: 'llm',
  });
  assert.equal(request.claim_candidate_id, 'claim_001');
  assert.equal(request.claim_statement, 'Bounded claim.');
  assert.equal(request.boundary.rationale, 'bounded');
  assert.equal(request.boundary.human_confirmation_ref?.ref_id, 'confirm_001');
  assert.equal(request.trace_manifest_id, 'trace_claim_001');
  assert.equal(request.claim_trace_packet_id, 'ctp_001');
  assert.equal(request.created_by, 'llm');

  // Optional structural refs degrade to null (never invented).
  const withoutConfirmation = extractClaimBoundaryDomainGateContext(
    CLAIM_SOURCES.filter((item) => item.ref_type !== 'human_confirmation_record'),
  );
  assert.ok(withoutConfirmation.ok);
  assert.equal(withoutConfirmation.context.human_confirmation_ref, null);

  // Required structural refs fail closed.
  const missingClaim = extractClaimBoundaryDomainGateContext(
    CLAIM_SOURCES.filter((item) => item.ref_type !== 'claim_candidate'),
  );
  assert.equal(missingClaim.ok, false);
  assert.match((missingClaim as { issues: string[] }).issues.join(' '), /claim_candidate/);
});

test('T-124 G4.6 run-012 fix: claim support position enforces the Domain Gate evidence discipline', () => {
  const extraction = extractClaimBoundaryDomainGateContext(CLAIM_SOURCES);
  assert.ok(extraction.ok);

  // (1) Interpretation-packet refs are dropped from the evidence position while
  // evidence-class refs pass through (run 012 live signature: the adjudicator
  // cited the packet alongside the REU).
  const mixed = assembleCreateClaimCandidateRequest({
    context: extraction.context,
    proposal: {
      ...claimProposal(),
      support_refs: [
        ref('result_interpretation_packet', 'packet_001'),
        ref('run_evidence_unit', 'reu_001'),
      ],
    },
    createdBy: 'llm',
  });
  assert.deepEqual(mixed.support_refs, [ref('run_evidence_unit', 'reu_001')]);

  // (2) A selection with NO admissible evidence ref falls back to the DECLARED
  // run-evidence refs of the request context (deterministic REU floor).
  const packetOnly = assembleCreateClaimCandidateRequest({
    context: extraction.context,
    proposal: {
      ...claimProposal(),
      support_refs: [ref('result_interpretation_packet', 'packet_001')],
    },
    createdBy: 'llm',
  });
  assert.deepEqual(packetOnly.support_refs, [ref('run_evidence_unit', 'reu_001')]);

  // (3) No evidence anywhere -> empty support (fails the ajv pre-check /
  // Domain Gate minItems discipline downstream; the assembly never invents).
  const bareContext = extractClaimBoundaryDomainGateContext(
    CLAIM_SOURCES.filter((item) => item.ref_type !== 'run_evidence_unit'),
  );
  assert.ok(bareContext.ok);
  const hollow = assembleCreateClaimCandidateRequest({
    context: bareContext.context,
    proposal: {
      ...claimProposal(),
      support_refs: [ref('result_interpretation_packet', 'packet_001')],
    },
    createdBy: 'llm',
  });
  assert.deepEqual(hollow.support_refs, []);
});

const DOSSIER_SOURCES = [
  ref('claim_candidate', 'claim_001'),
  ref('claim_trace_packet', 'ctp_001'),
  ref('result_interpretation_packet', 'packet_001'),
  ref('trace_manifest', 'trace_dossier_001'),
  ref('gate_result', 'gate_001'),
  ref('run_evidence_unit', 'reu_001'),
];

function dossierProposal(): PaperImplementationDossierReadinessProposal {
  return {
    dossier_status: 'ready_for_writing',
    experiment_limitations: ['bounded'],
    failed_run_refs: [],
    inconclusive_run_refs: [],
    negative_result_refs: [],
    excluded_stale_or_invalidated_evidence_refs: [],
    admitted_claim_refs: [ref('claim_candidate', 'claim_001')],
    rejected_claim_refs: [],
    forbidden_overclaims: ['overclaim'],
    claim_ceiling: 'strong',
    readiness_blocker_refs: [],
    readiness_warning_refs: [],
    readiness_notes: ['ready'],
  };
}

test('T-124 G4.6: dossier-readiness context extraction + assembly (structural envelope vs semantic proposal)', () => {
  const extraction = extractDossierReadinessDomainGateContext(ref('implementation_dossier', 'dossier_001'), DOSSIER_SOURCES);
  assert.ok(extraction.ok);
  assert.equal(extraction.context.dossier_id, 'dossier_001');
  assert.equal(extraction.context.trace_manifest_id, 'trace_dossier_001');
  assert.equal(extraction.context.readiness_gate_result_id, 'gate_001');
  assert.deepEqual(extraction.context.claim_candidate_ids, ['claim_001']);
  assert.deepEqual(extraction.context.claim_trace_packet_ids, ['ctp_001']);
  assert.deepEqual(extraction.context.result_interpretation_packet_ids, ['packet_001']);

  const request = assembleCreateImplementationDossierRequest({
    context: extraction.context,
    proposal: dossierProposal(),
    createdBy: 'llm',
  });
  assert.equal(request.dossier_id, 'dossier_001');
  assert.equal(request.dossier_status, 'ready_for_writing');
  assert.equal(request.readiness.readiness_gate_result_id, 'gate_001');
  assert.deepEqual(request.readiness.readiness_notes, ['ready']);
  assert.equal(request.trace_manifest_id, 'trace_dossier_001');
  assert.equal(request.claim_section.claim_ceiling, 'strong');

  // Wrong target type fails closed.
  const wrongTarget = extractDossierReadinessDomainGateContext(ref('claim_candidate', 'claim_001'), DOSSIER_SOURCES);
  assert.equal(wrongTarget.ok, false);
  assert.match((wrongTarget as { issues: string[] }).issues.join(' '), /implementation_dossier/);
});
