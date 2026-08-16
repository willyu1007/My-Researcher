import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import {
  SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_ACCEPTANCE_SCHEMA_V1,
  SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_PACKAGE_SCHEMA_V1,
  SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_PREPARED_SCHEMA_V1,
  SCIENTIFIC_EVIDENCE_P5_M0_SCI_ACCEPTANCE_SCHEMA_V1,
  assertScientificEvidenceP5ClaimDossierFinalAcceptanceV1,
  assertScientificEvidenceP5ClaimDossierFinalPreparedV1,
  assertScientificEvidenceP5M0SciAcceptanceV1,
  buildScientificEvidenceP5ClaimDossierFinalPackageV1,
  buildScientificEvidenceP5M0SciAcceptanceV1,
  exactScientificEvidenceP5ClaimDossierFinalEffectsV1,
  preflightScientificEvidenceP5ClaimDossierFinalPackageV1,
  type ScientificEvidenceP5ClaimDossierFinalAcceptanceV1,
  type ScientificEvidenceP5ClaimDossierFinalPackageContentV1,
  type ScientificEvidenceP5ClaimDossierFinalPreparedV1,
} from './scientific-evidence-p5-claim-dossier-final-acceptance-service.js';

const HASH_A = `sha256:${'a'.repeat(64)}`;
const HASH_B = `sha256:${'b'.repeat(64)}`;
const HASH_C = `sha256:${'c'.repeat(64)}`;
const BARE_HASH = 'd'.repeat(64);
const CREATED_AT = '2026-08-16T03:20:00.000Z';
const TITLE_CARD_ID = 'title_card_test';
const CLAIM_ID = 'claim_candidate_test';
const CLAIM_TRACE_ID = 'trace_manifest_claim_test';
const CLAIM_TRACE_PACKET_ID = 'claim_trace_packet_test';
const DOSSIER_ID = 'implementation_dossier_test';
const DOSSIER_TRACE_ID = 'trace_manifest_dossier_test';
const DOSSIER_GATE_ID = 'trace_gate_result_dossier_test';
const PACKET_ID = 'result_interpretation_packet_test';
const CYCLE_ID = 'validation_cycle_test';

test('claim/dossier final package is eligible and exact acceptance binds its effects', () => {
  const acceptancePackage = buildScientificEvidenceP5ClaimDossierFinalPackageV1(validContent());
  const eligibility = preflightScientificEvidenceP5ClaimDossierFinalPackageV1(acceptancePackage);
  assert.equal(eligibility.status, 'eligible');
  assert.deepEqual(eligibility.reason_codes, []);
  const prepared: ScientificEvidenceP5ClaimDossierFinalPreparedV1 = {
    schema_version: SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_PREPARED_SCHEMA_V1,
    status: 'eligible',
    acceptance_package: acceptancePackage,
    eligibility,
    preparation_effect_census: {
      database_writes: 0,
      external_calls: 0,
      create_job_calls: 0,
      capability_changes: 0,
      provider_credentials_read: 0,
    },
  };
  assert.doesNotThrow(() => assertScientificEvidenceP5ClaimDossierFinalPreparedV1(prepared));
  const acceptance: ScientificEvidenceP5ClaimDossierFinalAcceptanceV1 = {
    schema_version: SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_ACCEPTANCE_SCHEMA_V1,
    status: 'authorized_pending_execute',
    acceptance_attempt_id: acceptancePackage.acceptance_attempt_id,
    package_hash: acceptancePackage.package_hash,
    authorization: {
      source: 'current_codex_task_user',
      received_at: '2026-08-16T03:30:00.000Z',
      text_utf8_sha256: HASH_C,
      text_utf8_bytes: 124,
      user_authorized: true,
      authorized_effects: exactScientificEvidenceP5ClaimDossierFinalEffectsV1(),
    },
  };
  assert.doesNotThrow(() => assertScientificEvidenceP5ClaimDossierFinalAcceptanceV1({
    prepared,
    acceptance,
  }));
});

test('claim/dossier final package rejects a strong claim even when rehashed', () => {
  const content = validContent();
  content.authority.final_plan.claim_request.claim_strength = 'strong';
  const acceptancePackage = buildScientificEvidenceP5ClaimDossierFinalPackageV1(content);
  const eligibility = preflightScientificEvidenceP5ClaimDossierFinalPackageV1(acceptancePackage);
  assert.equal(eligibility.status, 'ineligible');
  assert.ok(eligibility.reason_codes.includes('P5_CDF_PLAN_INVALID'));
});

test('M0-SCI acceptance record is hash-bound and fail-closed', () => {
  const record = buildScientificEvidenceP5M0SciAcceptanceV1({
    schema_version: SCIENTIFIC_EVIDENCE_P5_M0_SCI_ACCEPTANCE_SCHEMA_V1,
    status: 'passed',
    gate: 'M0-SCI',
    acceptance_attempt_id: 't136-p5-claim-dossier-final-acceptance-1',
    package_hash: HASH_A,
    implementation_project_id: 'implementation_project_test',
    validation_cycle_id: CYCLE_ID,
    result_interpretation_packet_id: PACKET_ID,
    packet_content_hash: HASH_B,
    claim_candidate_id: CLAIM_ID,
    claim_hash: HASH_C,
    dossier_id: DOSSIER_ID,
    dossier_hash: HASH_A,
    create_job_call_count: 2,
    replay_new_row_count: 0,
    undelivered_integration_outbox_count: 0,
    persistent_capability_change_count: 0,
    capabilities_resting_state: 'disabled',
    accepted_at: '2026-08-16T03:40:00.000Z',
  });
  assert.doesNotThrow(() => assertScientificEvidenceP5M0SciAcceptanceV1(record));
  assert.throws(() => assertScientificEvidenceP5M0SciAcceptanceV1({
    ...record,
    replay_new_row_count: 1 as 0,
  }));
});

function validContent(): ScientificEvidenceP5ClaimDossierFinalPackageContentV1 {
  const runEvidenceRef = ref('run_evidence_unit', 'reu_test', HASH_A);
  const packetRef = ref('result_interpretation_packet', PACKET_ID, HASH_B);
  const claimRef = ref('claim_candidate', CLAIM_ID, null);
  const claimLineage = lineage([], [runEvidenceRef], [packetRef]);
  const dossierLineage = lineage(
    [ref('literature_evidence_unit', 'evidence_unit_test', 'v1')],
    [runEvidenceRef],
    [packetRef],
  );
  return {
    schema_version: SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_PACKAGE_SCHEMA_V1,
    acceptance_attempt_id: 't136-p5-claim-dossier-final-acceptance-1',
    predecessor: {
      packet_recovery_attempt_id: 't136-p5-packet-only-recovery-1',
      package_hash: HASH_A,
      prepared_record_sha256: HASH_B,
      acceptance_record_sha256: HASH_C,
      claim_record_sha256: HASH_A,
      completion_record_sha256: HASH_B,
      terminal_absent: true,
    },
    authority: {
      target_fingerprint: HASH_A,
      implementation_project_id: 'implementation_project_test',
      title_card_id: TITLE_CARD_ID,
      validation_cycle_id: CYCLE_ID,
      packet: {
        result_interpretation_packet_id: PACKET_ID,
        packet_content_hash: HASH_B,
        trace_manifest_id: 'trace_manifest_packet_test',
        interpretation_gate_status: 'passed',
        allowed_claim_ceiling: 'moderate',
        created_at: CREATED_AT,
      },
      closure: {
        closure_id: 'closure_test',
        closure_snapshot_hash: HASH_C,
        scientific_disposition: 'positive',
        accepted_proposal_id: 'proposal_test',
        accepted_proposal_hash: BARE_HASH,
      },
      run_evidence_unit: {
        run_evidence_unit_id: 'reu_test',
        content_hash: HASH_A,
        run_id: 'run_test',
        validation_report_id: 'report_test',
        validation_hash: HASH_B,
      },
      literature_evidence: {
        evidence_unit_id: 'evidence_unit_test',
        evidence_map_version: 'v1',
        literature_id: 'LIT-0001',
        review_status: 'machine_checked',
        freshness_status: 'current',
        authority_hash: HASH_C,
      },
      scientific_chain_counts: {
        real_provider_attempts: 2,
        succeeded_real_provider_attempts: 2,
        create_job_commands: 2,
        experiment_results: 2,
        passed_validation_reports: 1,
        evidence_candidates: 1,
        run_evidence_units: 1,
        runtime_artifacts: 4,
        runtime_admissions: 4,
        closures: 1,
        packets: 1,
        undelivered_integration_outboxes: 0,
        claim_trace_manifests: 0,
        dossier_trace_manifests: 0,
        claim_trace_packets: 0,
        dossier_trace_gate_results: 0,
        claims: 0,
        dossiers: 0,
      },
      final_plan: {
        created_at: CREATED_AT,
        claim_trace_manifest_id: CLAIM_TRACE_ID,
        claim_trace_manifest_request: {
          target_ref: claimRef,
          lineage: claimLineage,
        },
        claim_trace_packet_id: CLAIM_TRACE_PACKET_ID,
        claim_trace_packet_request: {
          claim_ref: claimRef,
          claim_statement: 'Bounded observed result.',
          trace_manifest_id: CLAIM_TRACE_ID,
          lineage: claimLineage,
          challenge: {
            challenging_result_refs: [],
            counter_evidence_refs: [],
            unresolved_objections: [],
          },
          scope: {},
          boundary: {
            forbidden_overclaims: ['Do not generalize.'],
            claim_strength: 'moderate',
            human_confirmation_required: false,
          },
        },
        claim_request: {
          claim_candidate_id: CLAIM_ID,
          claim_type: 'empirical_finding',
          claim_statement: 'Bounded observed result.',
          claim_strength: 'moderate',
          result_interpretation_packet_ids: [PACKET_ID],
          support_refs: [runEvidenceRef],
          scope: {
            population_scope: 'test',
            method_scope: 'test',
            dataset_scope: 'test',
            metric_scope: 'test',
            negative_scope_notes: [],
            excluded_scope_notes: [],
          },
          boundary: {
            rationale: 'bounded',
            forbidden_overclaims: ['Do not generalize.'],
            hidden_counter_evidence_refs: [],
            required_followup_refs: [],
          },
          trace_manifest_id: CLAIM_TRACE_ID,
          claim_trace_packet_id: CLAIM_TRACE_PACKET_ID,
        },
        dossier_trace_manifest_id: DOSSIER_TRACE_ID,
        dossier_trace_manifest_request: {
          target_ref: ref('implementation_dossier', DOSSIER_ID, '1'),
          lineage: dossierLineage,
        },
        dossier_gate_result_id: DOSSIER_GATE_ID,
        dossier_gate_request: { trace_manifest_id: DOSSIER_TRACE_ID },
        dossier_request: {
          dossier_id: DOSSIER_ID,
          dossier_status: 'ready_for_writing',
          result_interpretation_packet_ids: [PACKET_ID],
          claim_candidate_ids: [CLAIM_ID],
          claim_trace_packet_ids: [CLAIM_TRACE_PACKET_ID],
          closed_validation_cycle_snapshot_refs: [{
            validation_cycle_id: CYCLE_ID,
            closure_id: 'closure_test',
            closure_snapshot_hash: HASH_C,
          }],
          experiment_section: {
            failed_run_refs: [],
            inconclusive_run_refs: [],
            negative_result_refs: [],
            excluded_stale_or_invalidated_evidence_refs: [],
            experiment_limitations: [],
          },
          claim_section: {
            admitted_claim_refs: [claimRef],
            rejected_claim_refs: [],
            forbidden_overclaims: ['Do not generalize.'],
            claim_ceiling: 'moderate',
          },
          readiness: {
            readiness_gate_result_id: DOSSIER_GATE_ID,
            blocker_refs: [],
            warning_refs: [],
            readiness_notes: ['ready'],
          },
          trace_manifest_id: DOSSIER_TRACE_ID,
        },
      },
      expected_record_hashes: {
        claim_trace_manifest_hash: HASH_A,
        claim_trace_packet_hash: HASH_B,
        claim_hash: HASH_C,
        dossier_trace_manifest_hash: HASH_A,
        dossier_gate_result_hash: HASH_B,
        dossier_hash: HASH_C,
      },
    },
    executor: {
      mode: 'claim_dossier_final_acceptance',
      path: 'apps/backend/scripts/run-final.ts',
      sha256: HASH_A,
    },
    source_binding: {
      source_files: [1, 2, 3, 4, 5, 6].map((index) => ({
        path: `source-${index}.ts`,
        sha256: HASH_B,
      })),
    },
    recovery_point: {
      manifest_ref: '/tmp/recovery.json',
      created_at: CREATED_AT,
      target_fingerprint: HASH_A,
      recovery_fingerprint: HASH_B,
      schema_dump_sha256: HASH_C,
      authority_data_dump_sha256: HASH_A,
      authority_table_count: 114,
    },
    authorized_effects: exactScientificEvidenceP5ClaimDossierFinalEffectsV1(),
    operational_window: {
      prepared_at: CREATED_AT,
      authorization_not_after: '2026-08-16T09:20:00.000Z',
      execute_not_after: '2026-08-16T09:50:00.000Z',
    },
  };
}

function ref(
  refType: string,
  refId: string,
  versionId: string | null,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: TITLE_CARD_ID,
    version_id: versionId,
  };
}

function lineage(
  literatureRefs: TopicSelectionFunctionalRef[],
  runEvidenceRefs: TopicSelectionFunctionalRef[],
  packetRefs: TopicSelectionFunctionalRef[],
) {
  return {
    literature: {
      literature_evidence_refs: literatureRefs,
      source_locator_refs: [],
      citation_candidate_refs: [],
    },
    experiment: {
      experiment_plan_refs: [],
      work_order_refs: [],
      run_refs: [],
      run_evidence_refs: runEvidenceRefs,
      result_packet_refs: packetRefs,
      metric_refs: [],
    },
    artifact: {
      dataset_refs: [],
      baseline_refs: [],
      code_version_refs: [],
      model_checkpoint_refs: [],
      config_refs: [],
      log_artifact_refs: [],
    },
    decision: {
      validation_cycle_refs: [],
      motive_evolution_decision_refs: [],
      gate_result_refs: [],
      human_decision_refs: [],
      accepted_risk_refs: [],
    },
    internal_interpretation: {
      result_interpretation_refs: packetRefs,
      llm_rationale_refs: [],
      board_summary_refs: [],
      non_citable_refs: [],
    },
  };
}
