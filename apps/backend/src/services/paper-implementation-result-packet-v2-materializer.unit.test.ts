import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  serverHashExperimentV2EventPayload,
  serverHashPaperImplementationResultInterpretationPacketV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  ValidationCycleClosedEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';
import type {
  PaperImplementationEvidenceTraceManifestV2,
  ValidationCycleClosureV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-evidence-v2-contracts';
import type {
  CreateResultInterpretationPacketRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import type {
  PaperImplementationScientificClosureProposalV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationCycleReadinessV2Repository } from '../repositories/paper-implementation-cycle-readiness-v2.repository.js';
import { InMemoryPaperImplementationResultClaimDossierRepository } from '../repositories/in-memory-paper-implementation-result-claim-dossier-repository.js';
import {
  InMemoryPaperImplementationValidationCycleClosureV2Repository,
  type PaperImplementationAdmittedScientificClosureProposalV1,
  type PaperImplementationScientificClosureEvidenceAuthorityV1,
  type PaperImplementationStoredValidationCycleClosureV2,
} from '../repositories/paper-implementation-validation-cycle-closure-v2.repository.js';
import {
  PaperImplementationResultPacketV2Materializer,
  PaperImplementationValidationCycleClosedCompositeConsumer,
} from './paper-implementation-result-packet-v2-materializer.js';

const NOW = '2026-08-08T08:00:00.000Z';
const PROJECT_ID = 'project-p4';
const CYCLE_ID = 'cycle-p4';
const CLOSURE_ID = 'closure-p4';
const PACKET_ID = 'packet-p4';
const REU_ID = 'reu-p4';
const REPORT_ID = 'report-p4';
const TRACE_ID = 'trace-p4';

function hash(seed: string): string {
  return `sha256:${Buffer.from(seed).toString('hex').padEnd(64, '0').slice(0, 64)}`;
}

function deterministicId(namespace: string, identity: string): string {
  const digest = createHash('sha256')
    .update(namespace)
    .update('\0')
    .update(identity)
    .digest('hex');
  return `${namespace}_${digest}`;
}

function ref(type: string, id: string, version: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: type,
    ref_id: id,
    title_card_id: 'title-p4',
    version_id: version,
  };
}

function packetRequest(options: {
  failedAccounted?: boolean;
  failedRetained?: boolean;
} = {}): CreateResultInterpretationPacketRequest {
  return {
    result_interpretation_packet_id: PACKET_ID,
    validation_cycle_id: CYCLE_ID,
    experiment_plan_light_id: null,
    source: {
      run_evidence_refs: [ref('run_evidence_unit', REU_ID, hash('reu'))],
      validation_report_refs: [ref('result_validation_report', REPORT_ID, hash('report'))],
      metric_refs: [],
      failed_run_refs: [],
      inconclusive_run_refs: [],
      stale_or_invalidated_evidence_refs: [],
    },
    result_summary: {
      result_summary: 'The registered comparison supports a bounded claim.',
      supports_assertion_refs: [],
      challenges_assertion_refs: [],
      unexpected_findings: [],
      failed_runs_accounted_for: options.failedAccounted ?? true,
      inconclusive_runs_accounted_for: true,
      exploratory_confirmatory_separated: true,
    },
    reliability: {
      failed_runs_retained: options.failedRetained ?? true,
      confound_refs: [],
      limitation_refs: [],
      reliability_notes: [],
    },
    claim_implications: {
      allowed_claim_ceiling: 'moderate',
      forbidden_overclaims: ['universal improvement'],
      recommended_claim_refs: [],
      required_followup_refs: [],
    },
    trace_manifest_id: 'aggregate-trace-p4',
    policy_version_id: 'policy-p4',
    created_by: 'system',
  };
}

function proposal(request: CreateResultInterpretationPacketRequest): PaperImplementationScientificClosureProposalV1 {
  return {
    schema_version: 'PaperImplementationScientificClosureProposal@v1',
    validation_cycle_id: CYCLE_ID,
    closure_watermark_hash: hash('watermark'),
    primary_comparison_fact_ref: {
      comparison_fact_id: 'comparison-p4',
      comparison_fact_hash: hash('comparison'),
    },
    ordered_evidence_refs: [{
      ordinal: 1,
      run_evidence_unit_id: REU_ID,
      content_hash: hash('reu'),
    }],
    interpretation_summary: request.result_summary.result_summary,
    reliability_assessment: structuredClone(request.reliability),
    limitations: {
      limitation_refs: structuredClone(request.reliability.limitation_refs),
      reliability_notes: [...request.reliability.reliability_notes],
    },
    claim_ceiling: request.claim_implications.allowed_claim_ceiling,
  };
}

function closure(options: {
  kind?: ValidationCycleClosureV2['closure_kind'];
  failedAttempt?: boolean;
  disposition?: 'positive' | 'negative' | 'inconclusive';
} = {}): PaperImplementationStoredValidationCycleClosureV2 {
  const scientific = options.kind !== 'control_flow_validated_no_paper_evidence';
  const disposition = options.disposition ?? 'positive';
  return {
    implementation_project_id: PROJECT_ID,
    closure: {
      closure_id: CLOSURE_ID,
      schema_version: 'v1',
      validation_cycle_id: CYCLE_ID,
      cycle_version_at_closure: 3,
      closure_kind: scientific
        ? 'scientific_evidence_assessed'
        : 'control_flow_validated_no_paper_evidence',
      scientific_disposition: scientific ? disposition : null,
      selected_exit_key: scientific ? 'continue-to-claim' : null,
      accepted_proposal_id: scientific ? 'proposal-p4' : null,
      accepted_proposal_hash: scientific ? 'proposal-hash-p4' : null,
      scientific_authority: scientific ? {
        schema_version: 'PaperImplementationValidationCycleScientificAuthority@v1',
        evaluation_protocol_revision_id: 'protocol-p4',
        evaluation_protocol_content_hash: hash('protocol'),
        primary_comparison_fact_id: 'comparison-p4',
        primary_comparison_fact_hash: hash('comparison'),
        primary_comparison_key: 'primary',
        registered_relation: disposition === 'positive'
          ? 'supports_registered_expectation'
          : disposition === 'negative'
            ? 'contradicts_registered_expectation'
            : 'indeterminate',
      } : null,
      closure_watermark: {
        schema_version: 'v1',
        validation_cycle_id: CYCLE_ID,
        expected_cycle_version: 3,
        ordered_branches: scientific ? [{
          ordinal: 1,
          branch_id: 'branch-p4',
          branch_key: 'main',
          current_admitted_revision_id: 'revision-p4',
          current_admitted_revision_hash: hash('revision'),
          branch_revision_sequence: 1,
          effective_head_run_id: 'run-p4',
          effective_head_run_manifest_hash: hash('manifest'),
          head_blocker: null,
          ordered_cells: [{
            ordinal: 1,
            run_cell_id: 'cell-p4',
            cell_key: 'candidate',
            ordered_attempts: options.failedAttempt ? [{
              ordinal: 1,
              execution_attempt_id: 'attempt-failed-p4',
              lifecycle_state: 'failed',
              execution_mode: 'aliyun_pai_dlc',
              provenance: 'real_provider',
            }] : [],
            complete_result_ref: null,
            eligibility_code: null,
          }],
          eligible_run_evidence_unit_refs: [{
            run_evidence_unit_id: REU_ID,
            content_hash: hash('reu'),
          }],
        }] : [],
        active_real_attempt_count: 0,
        closure_input_hash: hash('watermark'),
      },
      closure_snapshot_hash: hash('closure'),
    },
    idempotency_key: 'close-p4',
    created_at: NOW,
  };
}

function traceManifest(): PaperImplementationEvidenceTraceManifestV2 {
  return {
    trace_manifest_id: TRACE_ID,
    schema_version: 'v1',
    run_evidence_unit_id: REU_ID,
    ordered_trace_refs: [{
      ordinal: 1,
      ref_kind: 'run',
      ref_id: 'run-p4',
      ref_hash: hash('manifest'),
    }],
    content_hash: hash('trace'),
  };
}

function evidenceAuthority(
  disposition: 'positive' | 'negative' | 'inconclusive' = 'positive',
): PaperImplementationScientificClosureEvidenceAuthorityV1 {
  return {
    run_evidence_unit_id: REU_ID,
    content_hash: hash('reu'),
    validation_report_id: REPORT_ID,
    validation_hash: hash('report'),
    evaluation_protocol_revision_id: 'protocol-p4',
    evaluation_protocol_content_hash: hash('protocol'),
    primary_comparison_key: 'primary',
    decision_if_positive: 'continue-to-claim',
    decision_if_negative: 'revise',
    decision_if_inconclusive: 'collect-more',
    primary_facts: [{
      comparison_fact_id: 'comparison-p4',
      comparison_fact_hash: hash('comparison'),
      comparison_key: 'primary',
      registered_relation: disposition === 'positive'
        ? 'supports_registered_expectation'
        : disposition === 'negative'
          ? 'contradicts_registered_expectation'
          : 'indeterminate',
    }],
    trace_manifest: traceManifest(),
  };
}

function event(stored: PaperImplementationStoredValidationCycleClosureV2): ValidationCycleClosedEventV1 {
  const payload = {
    event_schema: 'ValidationCycleClosed@v1' as const,
    validation_cycle_id: CYCLE_ID,
    closure_id: CLOSURE_ID,
    closure_snapshot_hash: stored.closure.closure_snapshot_hash,
    closure_kind: stored.closure.closure_kind,
    scientific_disposition: stored.closure.scientific_disposition,
    closure_input_hash: stored.closure.closure_watermark.closure_input_hash,
  };
  return {
    event_id: deterministicId('pi_validation_cycle_closed_event_v1', CLOSURE_ID),
    event_type: 'ValidationCycleClosed@v1',
    schema_version: 'v1',
    producer_domain: 'PaperImplementation',
    occurred_at: NOW,
    correlation_id: CLOSURE_ID,
    causation_id: hash('watermark'),
    business_idempotency_key: 'close-p4',
    implementation_project_id: PROJECT_ID,
    validation_cycle_id: CYCLE_ID,
    branch_id: `validation-cycle:${CYCLE_ID}`,
    branch_key: 'validation-cycle-closure-v2',
    work_order_revision_id: CLOSURE_ID,
    work_order_revision_hash: stored.closure.closure_snapshot_hash,
    branch_revision_sequence: 4,
    cell_plan_hash: stored.closure.closure_watermark.closure_input_hash,
    approved_plan_hash: stored.closure.closure_snapshot_hash,
    payload,
    payload_hash: serverHashExperimentV2EventPayload(
      'ValidationCycleClosed@v1',
      'v1',
      payload,
    ),
  };
}

function fixture(options: {
  stored?: PaperImplementationStoredValidationCycleClosureV2;
  request?: CreateResultInterpretationPacketRequest;
  includeEvidence?: boolean;
  packetClosureReader?: { findStoredClosureByCycle: (id: string) => Promise<PaperImplementationStoredValidationCycleClosureV2 | null> };
} = {}) {
  const stored = options.stored ?? closure();
  const request = options.request ?? packetRequest();
  const admitted: PaperImplementationAdmittedScientificClosureProposalV1 = {
    proposal_id: 'proposal-p4',
    proposal_hash: 'proposal-hash-p4',
    implementation_project_id: PROJECT_ID,
    proposal: proposal(request),
    packet_materialization: {
      request,
      trace_manifest_ref: ref('trace_manifest', request.trace_manifest_id),
      project_policy_version_id: 'project-policy-p4',
    },
  };
  const closureRepository = new InMemoryPaperImplementationValidationCycleClosureV2Repository({
    readinessRepository: new InMemoryPaperImplementationCycleReadinessV2Repository(),
    closures: [stored],
    scientific_proposals: stored.closure.closure_kind === 'scientific_evidence_assessed'
      ? [admitted]
      : [],
    scientific_evidence_authorities: options.includeEvidence === false
      ? []
      : [evidenceAuthority(stored.closure.scientific_disposition ?? 'positive')],
  });
  const exactClosureReader = options.packetClosureReader ?? {
    findStoredClosureByCycle: (id: string) => closureRepository.withTransaction(
      (transaction) => transaction.findStoredClosureByCycle(id),
    ),
  };
  const packetRepository = new InMemoryPaperImplementationResultClaimDossierRepository(
    exactClosureReader,
  );
  return {
    stored,
    packetRepository,
    materializer: new PaperImplementationResultPacketV2Materializer(
      closureRepository,
      packetRepository,
    ),
  };
}

test('P4 materializes one closure-bound Packet and exact replay returns it', async () => {
  const { stored, materializer, packetRepository } = fixture();
  const first = await materializer.consume(event(stored));
  const replay = await materializer.consume(event(stored));
  assert.ok(first);
  assert.deepEqual(replay, first);
  assert.equal((await packetRepository.listResultInterpretationPackets(PROJECT_ID)).length, 1);
  const { packet_content_hash: packetHash, created_at: _createdAt, ...hashInput } = first;
  assert.equal(packetHash, serverHashPaperImplementationResultInterpretationPacketV2(hashInput));
  assert.equal(first.closure_id, CLOSURE_ID);
  assert.equal(first.source.metric_refs[0]?.ref_id, 'comparison-p4');
});

test('P4 retains failed/cancelled attempt accounting in Packet source', async () => {
  const stored = closure({ failedAttempt: true });
  const { materializer } = fixture({ stored });
  const packet = await materializer.consume(event(stored));
  assert.equal(packet?.source.failed_run_refs[0]?.ref_id, 'attempt-failed-p4');
  assert.equal(packet?.interpretation_gate_status, 'passed_with_risk');
});

test('P4 rejects failed attempts that are not accounted for or retained', async () => {
  const stored = closure({ failedAttempt: true });
  for (const request of [
    packetRequest({ failedAccounted: false }),
    packetRequest({ failedRetained: false }),
  ]) {
    const { materializer, packetRepository } = fixture({ stored, request });
    await assert.rejects(
      materializer.consume(event(stored)),
      (error) => error instanceof AppError
        && error.details?.reason_code === 'RESULT_INTERPRETATION_PACKET_AUTHORITY_CONFLICT',
    );
    assert.equal((await packetRepository.listResultInterpretationPackets(PROJECT_ID)).length, 0);
  }
});

test('P4 rejects missing trusted evidence and trace authority', async () => {
  const { stored, materializer } = fixture({ includeEvidence: false });
  await assert.rejects(
    materializer.consume(event(stored)),
    (error) => error instanceof AppError
      && /evidence or trace authority/.test(error.message),
  );
});

test('P4 short write transaction detects Closure drift', async () => {
  const stored = closure();
  const drifted = closure();
  drifted.closure.closure_snapshot_hash = hash('drifted-closure');
  const { materializer } = fixture({
    stored,
    packetClosureReader: {
      findStoredClosureByCycle: async () => drifted,
    },
  });
  await assert.rejects(
    materializer.consume(event(stored)),
    (error) => error instanceof AppError
      && error.details?.reason_code === 'PACKET_CLOSURE_DRIFT',
  );
});

test('P4 control-only Closure is consumed without a scientific Packet', async () => {
  const stored = closure({ kind: 'control_flow_validated_no_paper_evidence' });
  const { materializer, packetRepository } = fixture({ stored });
  assert.equal(await materializer.consume(event(stored)), null);
  assert.equal((await packetRepository.listResultInterpretationPackets(PROJECT_ID)).length, 0);
});

test('P4 rejects a rehashed event whose Closure mirrors were altered', async () => {
  const stored = closure();
  const altered = event(stored);
  altered.payload = {
    ...altered.payload,
    closure_kind: 'control_flow_validated_no_paper_evidence',
    scientific_disposition: null,
  };
  altered.payload_hash = serverHashExperimentV2EventPayload(
    altered.event_type,
    altered.schema_version,
    altered.payload,
  );
  const { materializer, packetRepository } = fixture({ stored });
  await assert.rejects(
    materializer.consume(altered),
    (error) => error instanceof AppError
      && error.details?.reason_code === 'RESULT_INTERPRETATION_PACKET_AUTHORITY_CONFLICT'
      && error.message.includes('drifted from its stored Closure authority'),
  );
  assert.equal((await packetRepository.listResultInterpretationPackets(PROJECT_ID)).length, 0);
});

test('P4 inconclusive Closure preserves every REU in the inconclusive ledger', async () => {
  const stored = closure({ disposition: 'inconclusive' });
  const { materializer } = fixture({ stored });
  const packet = await materializer.consume(event(stored));
  assert.deepEqual(
    packet?.source.inconclusive_run_refs.map((item) => item.ref_id),
    [REU_ID],
  );
  assert.equal(packet?.interpretation_gate_status, 'passed_with_risk');
});

test('P4 closed view rejects readable legacy Packet history', async () => {
  const { materializer, packetRepository } = fixture();
  const request = packetRequest();
  await packetRepository.createResultInterpretationPacket({
    result_interpretation_packet_id: 'legacy-packet-p4',
    implementation_project_id: PROJECT_ID,
    validation_cycle_id: CYCLE_ID,
    experiment_plan_light_id: null,
    source: request.source,
    result_summary: request.result_summary,
    reliability: request.reliability,
    claim_implications: request.claim_implications,
    interpretation_gate_status: 'passed',
    trace_manifest_ref: ref('trace_manifest', request.trace_manifest_id),
    trace_manifest_id: request.trace_manifest_id,
    policy_version_id: null,
    created_by: 'system',
    created_at: NOW,
  });
  await assert.rejects(
    materializer.findClosedInterpretationPacketView(PROJECT_ID, 'legacy-packet-p4'),
    (error) => error instanceof AppError
      && error.details?.reason_code === 'CLOSED_INTERPRETATION_PACKET_REQUIRED',
  );
});

test('P4 composite consumer replays both ordered consumers after Packet failure', async () => {
  const calls: string[] = [];
  let failPacket = true;
  const composite = new PaperImplementationValidationCycleClosedCompositeConsumer(
    { consume: async () => { calls.push('projection'); } },
    {
      consume: async () => {
        calls.push('packet');
        if (failPacket) throw new Error('packet write failed');
      },
    },
  );
  const stored = closure();
  await assert.rejects(composite.consume(event(stored)), /packet write failed/);
  failPacket = false;
  await composite.consume(event(stored));
  assert.deepEqual(calls, ['projection', 'packet', 'projection', 'packet']);
});
