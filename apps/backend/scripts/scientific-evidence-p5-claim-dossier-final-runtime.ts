import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import type { PrismaClient } from '@prisma/client';
import {
  canonicalizeExperimentV2Json,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  ClaimCandidate,
  ClosedResultInterpretationPacketV2,
  ImplementationDossier,
  PaperImplementationWritingEntryPacket,
  ResultInterpretationPacket,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import type {
  CitationCandidate,
  ClaimTracePacket,
  NaturalLanguageFieldRoleRecord,
  TraceGateResult,
  TraceManifest,
  TraceRepairQueueItem,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import {
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import type {
  PaperImplementationResultClaimDossierRepository,
} from '../src/repositories/paper-implementation-result-claim-dossier.repository.js';
import type {
  PaperImplementationTraceRepository,
} from '../src/repositories/paper-implementation-trace.repository.js';
import {
  PrismaPaperImplementationEvidenceV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-evidence-v2-repository.js';
import {
  PrismaPaperImplementationHumanConfirmationRepository,
} from '../src/repositories/prisma/prisma-paper-implementation-human-confirmation-repository.js';
import {
  PrismaPaperImplementationRepository,
} from '../src/repositories/prisma/prisma-paper-implementation-repository.js';
import {
  PrismaPaperImplementationResultClaimDossierRepository,
} from '../src/repositories/prisma/prisma-paper-implementation-result-claim-dossier-repository.js';
import {
  PrismaPaperImplementationTraceRepository,
} from '../src/repositories/prisma/prisma-paper-implementation-trace-repository.js';
import {
  PrismaPaperImplementationValidationCycleClosureV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-validation-cycle-closure-v2-repository.js';
import {
  PrismaPaperImplementationValidationRepository,
} from '../src/repositories/prisma/prisma-paper-implementation-validation-repository.js';
import {
  materializeScientificEvidenceP5ClaimDossierFinalPlanV1,
  scientificEvidenceP5ClaimDossierFinalRecordHashesV1,
  type ScientificEvidenceP5ClaimDossierFinalPlanV1,
  type ScientificEvidenceP5ClaimDossierFinalRecordHashesV1,
  type ScientificEvidenceP5ClaimDossierFinalRecordsV1,
} from '../src/services/scientific-evidence-p5-claim-dossier-final-acceptance-service.js';
import {
  PaperImplementationResultClaimDossierService,
} from '../src/services/paper-implementation-result-claim-dossier-service.js';
import {
  PaperImplementationResultPacketV2Materializer,
} from '../src/services/paper-implementation-result-packet-v2-materializer.js';
import {
  PaperImplementationTraceKernelService,
} from '../src/services/paper-implementation-trace-kernel-service.js';

export const FINAL_ACCEPTANCE_PROJECT_ID =
  'implementation_project_642a1879-1137-40f5-b340-330b66509975';
export const FINAL_ACCEPTANCE_TITLE_CARD_ID =
  'title_card_671d3b55-b58d-4333-b9c7-333b34e2eb83';
export const FINAL_ACCEPTANCE_VALIDATION_CYCLE_ID =
  'validation_cycle_t136_p5_scifact_v4';
export const FINAL_ACCEPTANCE_RUN_ID = 'ef_run_v2_t136_p5_scifact_v4_1';
export const FINAL_ACCEPTANCE_PACKET_ID =
  'result_interpretation_packet_t136_p5_scifact_v4';
export const FINAL_ACCEPTANCE_CLAIM_ID = 'claim_candidate_t136_p5_scifact_v4';
export const FINAL_ACCEPTANCE_CLAIM_TRACE_ID =
  'trace_manifest_t136_p5_scifact_v4_claim';
export const FINAL_ACCEPTANCE_CLAIM_TRACE_PACKET_ID =
  'claim_trace_packet_t136_p5_scifact_v4';
export const FINAL_ACCEPTANCE_DOSSIER_ID =
  'implementation_dossier_t136_p5_scifact_v4';
export const FINAL_ACCEPTANCE_DOSSIER_TRACE_ID =
  'trace_manifest_t136_p5_scifact_v4_dossier';
export const FINAL_ACCEPTANCE_DOSSIER_GATE_ID =
  'trace_gate_result_t136_p5_scifact_v4_dossier';
export const FINAL_ACCEPTANCE_LITERATURE_EVIDENCE_ID =
  'evidence_unit_480c7962-a1fa-4207-b42a-673ae560c7a9';
export const FINAL_ACCEPTANCE_ATTEMPT_ID = 't136-p5-claim-dossier-final-acceptance-1';

export interface ScientificEvidenceP5ClaimDossierAuthorityV1 {
  project: {
    implementation_project_id: string;
    title_card_id: string;
    lifecycle_status: 'active';
  };
  packet: ClosedResultInterpretationPacketV2;
  closure: {
    closure_id: string;
    closure_snapshot_hash: string;
    scientific_disposition: 'positive';
    accepted_proposal_id: string;
    accepted_proposal_hash: string;
  };
  run_evidence_unit: {
    run_evidence_unit_id: string;
    content_hash: string;
    run_id: string;
    validation_report_id: string;
    validation_hash: string;
  };
  literature_evidence: {
    evidence_unit_id: string;
    evidence_map_version: string;
    literature_id: string;
    review_status: 'machine_checked';
    freshness_status: 'current';
    authority_hash: string;
  };
  scientific_chain_counts: ScientificEvidenceP5ClaimDossierCountsV1;
}

export interface ScientificEvidenceP5ClaimDossierCountsV1 {
  real_provider_attempts: number;
  succeeded_real_provider_attempts: number;
  create_job_commands: number;
  experiment_results: number;
  passed_validation_reports: number;
  evidence_candidates: number;
  run_evidence_units: number;
  runtime_artifacts: number;
  runtime_admissions: number;
  closures: number;
  packets: number;
  undelivered_integration_outboxes: number;
  claim_trace_manifests: number;
  dossier_trace_manifests: number;
  claim_trace_packets: number;
  dossier_trace_gate_results: number;
  claims: number;
  dossiers: number;
}

const EMPTY_REFS: TopicSelectionFunctionalRef[] = [];

export async function readScientificEvidenceP5ClaimDossierAuthorityV1(
  prisma: PrismaClient,
): Promise<ScientificEvidenceP5ClaimDossierAuthorityV1> {
  const resultRepository = new PrismaPaperImplementationResultClaimDossierRepository(prisma);
  const closureRepository = new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma);
  const materializer = new PaperImplementationResultPacketV2Materializer(
    closureRepository,
    resultRepository,
  );
  const [project, view, runEvidenceUnit, literatureEvidence, counts] = await Promise.all([
    prisma.paperImplementationProject.findUnique({
      where: { id: FINAL_ACCEPTANCE_PROJECT_ID },
      select: { id: true, titleCardId: true, lifecycleStatus: true },
    }),
    materializer.findClosedInterpretationPacketView(
      FINAL_ACCEPTANCE_PROJECT_ID,
      FINAL_ACCEPTANCE_PACKET_ID,
    ),
    prisma.paperImplementationRunEvidenceUnitV2.findFirst({
      where: {
        implementationProjectId: FINAL_ACCEPTANCE_PROJECT_ID,
        validationCycleId: FINAL_ACCEPTANCE_VALIDATION_CYCLE_ID,
        runId: FINAL_ACCEPTANCE_RUN_ID,
      },
      select: {
        id: true,
        contentHash: true,
        runId: true,
        validationReportId: true,
        validationHash: true,
      },
    }),
    prisma.topicSelectionEvidenceUnit.findUnique({
      where: { id: FINAL_ACCEPTANCE_LITERATURE_EVIDENCE_ID },
      select: {
        id: true,
        titleCardId: true,
        evidenceMapId: true,
        evidenceMapVersion: true,
        literatureId: true,
        evidenceRole: true,
        locatorType: true,
        locatorRefType: true,
        locatorRefId: true,
        abstractOnly: true,
        reviewStatus: true,
        freshnessStatus: true,
        sourceAttributionKind: true,
        sourceRefs: true,
        locator: true,
        sourceStatement: true,
        normalizedStatement: true,
        issueCodes: true,
        createdAt: true,
      },
    }),
    readScientificEvidenceP5ClaimDossierCountsV1(prisma),
  ]);
  assert.ok(project);
  assert.equal(project.id, FINAL_ACCEPTANCE_PROJECT_ID);
  assert.equal(project.titleCardId, FINAL_ACCEPTANCE_TITLE_CARD_ID);
  assert.equal(project.lifecycleStatus, 'active');
  assert.ok(view);
  assert.equal(view.packet.schema_version, 'PaperImplementationResultInterpretationPacket@v2');
  assert.equal(view.packet.result_interpretation_packet_id, FINAL_ACCEPTANCE_PACKET_ID);
  assert.equal(view.packet.validation_cycle_id, FINAL_ACCEPTANCE_VALIDATION_CYCLE_ID);
  assert.equal(view.packet.interpretation_gate_status, 'passed');
  assert.equal(view.packet.claim_implications.allowed_claim_ceiling, 'moderate');
  assert.equal(view.closure.scientific_disposition, 'positive');
  assert.ok(view.closure.accepted_proposal_id);
  assert.ok(view.closure.accepted_proposal_hash);
  assert.ok(runEvidenceUnit);
  assert.equal(view.packet.source.run_evidence_refs.length, 1);
  assert.deepEqual(view.packet.source.run_evidence_refs[0], ref(
    'run_evidence_unit',
    runEvidenceUnit.id,
    runEvidenceUnit.contentHash,
  ));
  assert.ok(literatureEvidence);
  assert.equal(literatureEvidence.titleCardId, FINAL_ACCEPTANCE_TITLE_CARD_ID);
  assert.equal(literatureEvidence.reviewStatus, 'machine_checked');
  assert.equal(literatureEvidence.freshnessStatus, 'current');
  assert.equal(literatureEvidence.abstractOnly, false);
  assert.deepEqual(literatureEvidence.issueCodes, []);
  assertScientificEvidenceP5ClaimDossierPreExecutionCountsV1(counts);
  const literatureAuthority = {
    id: literatureEvidence.id,
    title_card_id: literatureEvidence.titleCardId,
    evidence_map_id: literatureEvidence.evidenceMapId,
    evidence_map_version: literatureEvidence.evidenceMapVersion,
    literature_id: literatureEvidence.literatureId,
    evidence_role: literatureEvidence.evidenceRole,
    locator_type: literatureEvidence.locatorType,
    locator_ref_type: literatureEvidence.locatorRefType,
    locator_ref_id: literatureEvidence.locatorRefId,
    abstract_only: literatureEvidence.abstractOnly,
    review_status: literatureEvidence.reviewStatus,
    freshness_status: literatureEvidence.freshnessStatus,
    source_attribution_kind: literatureEvidence.sourceAttributionKind,
    source_refs: literatureEvidence.sourceRefs,
    locator: literatureEvidence.locator,
    source_statement: literatureEvidence.sourceStatement,
    normalized_statement: literatureEvidence.normalizedStatement,
    issue_codes: literatureEvidence.issueCodes,
    created_at: literatureEvidence.createdAt.toISOString(),
  };
  return {
    project: {
      implementation_project_id: project.id,
      title_card_id: project.titleCardId,
      lifecycle_status: 'active',
    },
    packet: view.packet,
    closure: {
      closure_id: view.closure.closure_id,
      closure_snapshot_hash: view.closure.closure_snapshot_hash,
      scientific_disposition: 'positive',
      accepted_proposal_id: view.closure.accepted_proposal_id,
      accepted_proposal_hash: view.closure.accepted_proposal_hash,
    },
    run_evidence_unit: {
      run_evidence_unit_id: runEvidenceUnit.id,
      content_hash: runEvidenceUnit.contentHash,
      run_id: runEvidenceUnit.runId,
      validation_report_id: runEvidenceUnit.validationReportId,
      validation_hash: runEvidenceUnit.validationHash,
    },
    literature_evidence: {
      evidence_unit_id: literatureEvidence.id,
      evidence_map_version: literatureEvidence.evidenceMapVersion,
      literature_id: literatureEvidence.literatureId,
      review_status: 'machine_checked',
      freshness_status: 'current',
      authority_hash: semanticHash('ScientificEvidenceP5LiteratureEvidenceAuthority', literatureAuthority),
    },
    scientific_chain_counts: counts,
  };
}

export function buildScientificEvidenceP5ClaimDossierFinalPlanV1(input: {
  authority: ScientificEvidenceP5ClaimDossierAuthorityV1;
  created_at: string;
}): ScientificEvidenceP5ClaimDossierFinalPlanV1 {
  const authority = input.authority;
  const packet = authority.packet;
  const runEvidenceRef = packet.source.run_evidence_refs[0]!;
  const packetRef = ref(
    'result_interpretation_packet',
    packet.result_interpretation_packet_id,
    packet.packet_content_hash,
  );
  const cycleRef = ref(
    'validation_cycle',
    FINAL_ACCEPTANCE_VALIDATION_CYCLE_ID,
    authority.closure.closure_snapshot_hash,
  );
  const literatureRef = ref(
    'literature_evidence_unit',
    authority.literature_evidence.evidence_unit_id,
    authority.literature_evidence.evidence_map_version,
  );
  const claimRef = ref('claim_candidate', FINAL_ACCEPTANCE_CLAIM_ID, null);
  const claimLineage = lineage({
    run_evidence_refs: [runEvidenceRef],
    result_packet_refs: [packetRef],
    validation_cycle_refs: [cycleRef],
    result_interpretation_refs: [packetRef],
  });
  const dossierLineage = lineage({
    literature_evidence_refs: [literatureRef],
    run_evidence_refs: [runEvidenceRef],
    result_packet_refs: [packetRef],
    validation_cycle_refs: [cycleRef],
    result_interpretation_refs: [packetRef],
  });
  const claimStatement = [
    'In the preregistered SciFact evaluation, retrieval top-k 10 produced',
    '61,947 ppm higher micro recall than top-k 5, exceeding the +10,000 ppm positive threshold.',
  ].join(' ');
  const forbiddenOverclaims = [...packet.claim_implications.forbidden_overclaims];
  return {
    created_at: input.created_at,
    claim_trace_manifest_id: FINAL_ACCEPTANCE_CLAIM_TRACE_ID,
    claim_trace_manifest_request: {
      target_ref: claimRef,
      lineage: claimLineage,
      integrity: emptyIntegrity(),
      trace_policy_version_id: packet.policy_version_id ?? null,
      created_by: 'system',
    },
    claim_trace_packet_id: FINAL_ACCEPTANCE_CLAIM_TRACE_PACKET_ID,
    claim_trace_packet_request: {
      claim_ref: claimRef,
      claim_statement: claimStatement,
      trace_manifest_id: FINAL_ACCEPTANCE_CLAIM_TRACE_ID,
      lineage: claimLineage,
      challenge: {
        challenging_result_refs: [],
        counter_evidence_refs: [],
        unresolved_objections: [],
      },
      scope: {
        dataset_scope: 'SciFact benchmark test split used by the bound Run',
        task_scope: 'micro recall comparison for retrieval top-k 10 versus top-k 5',
        baseline_scope: 'top-k 5 cell in the same preregistered two-cell Run',
        method_scope: 'the exact retriever, parser and ExecutionBundle bound by the Packet',
        evaluation_scope: 'the preregistered micro_recall_ppm metric and directional threshold',
      },
      boundary: {
        forbidden_overclaims: forbiddenOverclaims,
        claim_strength: 'moderate',
        human_confirmation_required: false,
      },
      created_by: 'system',
    },
    claim_request: {
      claim_candidate_id: FINAL_ACCEPTANCE_CLAIM_ID,
      claim_type: 'empirical_finding',
      claim_statement: claimStatement,
      claim_strength: 'moderate',
      result_interpretation_packet_ids: [FINAL_ACCEPTANCE_PACKET_ID],
      support_refs: [runEvidenceRef],
      challenge_refs: [],
      scope: {
        population_scope: 'SciFact benchmark test queries in the bound Run',
        method_scope: 'the exact retrieval implementation and ExecutionBundle revision',
        dataset_scope: 'the bound SciFact corpus, query slice and qrels authority',
        metric_scope: 'micro_recall_ppm under the registered comparison rule',
        negative_scope_notes: [],
        excluded_scope_notes: forbiddenOverclaims,
      },
      boundary: {
        boundary_gate_result_id: null,
        rationale: 'The claim restates only the registered observed difference and positive threshold within the exact evaluated setup.',
        forbidden_overclaims: forbiddenOverclaims,
        hidden_counter_evidence_refs: [],
        required_followup_refs: [...packet.claim_implications.required_followup_refs],
        human_confirmation_ref: null,
      },
      trace_manifest_id: FINAL_ACCEPTANCE_CLAIM_TRACE_ID,
      claim_trace_packet_id: FINAL_ACCEPTANCE_CLAIM_TRACE_PACKET_ID,
      policy_version_id: packet.policy_version_id ?? null,
      created_by: 'system',
    },
    dossier_trace_manifest_id: FINAL_ACCEPTANCE_DOSSIER_TRACE_ID,
    dossier_trace_manifest_request: {
      target_ref: ref('implementation_dossier', FINAL_ACCEPTANCE_DOSSIER_ID, '1'),
      lineage: dossierLineage,
      integrity: emptyIntegrity(),
      trace_policy_version_id: packet.policy_version_id ?? null,
      created_by: 'system',
    },
    dossier_gate_result_id: FINAL_ACCEPTANCE_DOSSIER_GATE_ID,
    dossier_gate_request: {
      trace_manifest_id: FINAL_ACCEPTANCE_DOSSIER_TRACE_ID,
    },
    dossier_request: {
      dossier_id: FINAL_ACCEPTANCE_DOSSIER_ID,
      dossier_version: 1,
      dossier_status: 'ready_for_writing',
      result_interpretation_packet_ids: [FINAL_ACCEPTANCE_PACKET_ID],
      claim_candidate_ids: [FINAL_ACCEPTANCE_CLAIM_ID],
      claim_trace_packet_ids: [FINAL_ACCEPTANCE_CLAIM_TRACE_PACKET_ID],
      closed_validation_cycle_snapshot_refs: [{
        validation_cycle_id: FINAL_ACCEPTANCE_VALIDATION_CYCLE_ID,
        closure_id: authority.closure.closure_id,
        closure_snapshot_hash: authority.closure.closure_snapshot_hash,
      }],
      experiment_section: {
        failed_run_refs: [...packet.source.failed_run_refs],
        inconclusive_run_refs: [...packet.source.inconclusive_run_refs],
        negative_result_refs: [],
        excluded_stale_or_invalidated_evidence_refs: [
          ...packet.source.stale_or_invalidated_evidence_refs,
        ],
        experiment_limitations: [...packet.reliability.reliability_notes],
      },
      claim_section: {
        admitted_claim_refs: [claimRef],
        rejected_claim_refs: [],
        forbidden_overclaims: forbiddenOverclaims,
        claim_ceiling: 'moderate',
      },
      readiness: {
        readiness_gate_result_id: FINAL_ACCEPTANCE_DOSSIER_GATE_ID,
        blocker_refs: [],
        warning_refs: [...packet.claim_implications.required_followup_refs],
        readiness_notes: [
          'The exact closed Packet, positive Closure snapshot and supported moderate Claim are present.',
          'Failed, inconclusive, negative and stale evidence accounting is preserved from the Packet.',
          'The Dossier remains bounded by every accepted ResultAnalysis forbidden overclaim.',
        ],
      },
      trace_manifest_id: FINAL_ACCEPTANCE_DOSSIER_TRACE_ID,
      projection_policy_version_id: packet.policy_version_id ?? null,
      policy_version_id: packet.policy_version_id ?? null,
      created_by: 'system',
    },
  };
}

export async function assembleScientificEvidenceP5ClaimDossierFinalReadOnlyV1(input: {
  prisma: PrismaClient;
  plan: ScientificEvidenceP5ClaimDossierFinalPlanV1;
}): Promise<ScientificEvidenceP5ClaimDossierFinalRecordsV1> {
  const baseTraceRepository = new PrismaPaperImplementationTraceRepository(input.prisma);
  const baseResultRepository = new PrismaPaperImplementationResultClaimDossierRepository(input.prisma);
  const traceRepository = new OverlayTraceRepository(baseTraceRepository);
  const resultRepository = new OverlayResultRepository(baseResultRepository);
  return materializeWithRepositories(input.prisma, input.plan, traceRepository, resultRepository);
}

export async function materializeScientificEvidenceP5ClaimDossierFinalNamedLocalV1(input: {
  prisma: PrismaClient;
  plan: ScientificEvidenceP5ClaimDossierFinalPlanV1;
}): Promise<ScientificEvidenceP5ClaimDossierFinalRecordsV1> {
  const traceRepository = new PrismaPaperImplementationTraceRepository(input.prisma);
  const resultRepository = new PrismaPaperImplementationResultClaimDossierRepository(input.prisma);
  return materializeWithRepositories(input.prisma, input.plan, traceRepository, resultRepository);
}

export function assertScientificEvidenceP5ClaimDossierExpectedRecordsV1(input: {
  records: ScientificEvidenceP5ClaimDossierFinalRecordsV1;
  expected: ScientificEvidenceP5ClaimDossierFinalRecordHashesV1;
}): void {
  assert.deepEqual(scientificEvidenceP5ClaimDossierFinalRecordHashesV1(input.records), input.expected);
  assert.equal(input.records.claim_trace_manifest.trace_status, 'complete');
  assert.equal(input.records.dossier_trace_manifest.trace_status, 'complete');
  assert.equal(input.records.dossier_gate_result.gate_status, 'passed');
  assert.equal(input.records.claim.claim_status, 'supported');
  assert.equal(input.records.claim.claim_strength, 'moderate');
  assert.equal(input.records.dossier.dossier_status, 'ready_for_writing');
  assert.equal(input.records.dossier.dossier_trace_status, 'complete');
}

export async function readScientificEvidenceP5ClaimDossierCountsV1(
  prisma: PrismaClient,
): Promise<ScientificEvidenceP5ClaimDossierCountsV1> {
  const [
    realProviderAttempts,
    succeededRealProviderAttempts,
    createJobCommands,
    experimentResults,
    passedValidationReports,
    evidenceCandidates,
    runEvidenceUnits,
    runtimeArtifacts,
    runtimeAdmissions,
    closures,
    packets,
    undeliveredIntegrationOutboxes,
    claimTraceManifests,
    dossierTraceManifests,
    claimTracePackets,
    dossierTraceGateResults,
    claims,
    dossiers,
  ] = await Promise.all([
    prisma.experimentFoundationExecutionAttemptV2.count({
      where: { runId: FINAL_ACCEPTANCE_RUN_ID, executionMode: 'real_provider' },
    }),
    prisma.experimentFoundationExecutionAttemptV2.count({
      where: {
        runId: FINAL_ACCEPTANCE_RUN_ID,
        executionMode: 'real_provider',
        lifecycleState: 'succeeded',
        terminalReasonCode: 'real_provider_succeeded',
      },
    }),
    prisma.experimentFoundationProviderCommandV2.count({
      where: { executionAttempt: { runId: FINAL_ACCEPTANCE_RUN_ID }, operation: 'submit' },
    }),
    prisma.experimentFoundationExperimentResultV2.count({ where: { runId: FINAL_ACCEPTANCE_RUN_ID } }),
    prisma.experimentFoundationScientificValidationReportV2.count({
      where: { runId: FINAL_ACCEPTANCE_RUN_ID, status: 'passed' },
    }),
    prisma.experimentFoundationEvidenceCandidateV2.count({ where: { runId: FINAL_ACCEPTANCE_RUN_ID } }),
    prisma.paperImplementationRunEvidenceUnitV2.count({
      where: {
        implementationProjectId: FINAL_ACCEPTANCE_PROJECT_ID,
        validationCycleId: FINAL_ACCEPTANCE_VALIDATION_CYCLE_ID,
        runId: FINAL_ACCEPTANCE_RUN_ID,
      },
    }),
    prisma.paperImplementationRuntimeArtifact.count({
      where: {
        implementationProjectId: FINAL_ACCEPTANCE_PROJECT_ID,
        slotId: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
      },
    }),
    prisma.paperImplementationRuntimeAdmissionRecord.count({
      where: {
        implementationProjectId: FINAL_ACCEPTANCE_PROJECT_ID,
        slotId: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
      },
    }),
    prisma.paperImplementationValidationCycleClosureV2.count({
      where: {
        implementationProjectId: FINAL_ACCEPTANCE_PROJECT_ID,
        validationCycleId: FINAL_ACCEPTANCE_VALIDATION_CYCLE_ID,
      },
    }),
    prisma.paperImplementationResultInterpretationPacket.count({
      where: {
        implementationProjectId: FINAL_ACCEPTANCE_PROJECT_ID,
        id: FINAL_ACCEPTANCE_PACKET_ID,
      },
    }),
    prisma.paperImplementationExperimentIntegrationOutboxV2.count({
      where: {
        implementationProjectId: FINAL_ACCEPTANCE_PROJECT_ID,
        deliveredAt: null,
      },
    }),
    prisma.paperImplementationTraceManifest.count({
      where: { implementationProjectId: FINAL_ACCEPTANCE_PROJECT_ID, id: FINAL_ACCEPTANCE_CLAIM_TRACE_ID },
    }),
    prisma.paperImplementationTraceManifest.count({
      where: { implementationProjectId: FINAL_ACCEPTANCE_PROJECT_ID, id: FINAL_ACCEPTANCE_DOSSIER_TRACE_ID },
    }),
    prisma.paperImplementationClaimTracePacket.count({
      where: {
        implementationProjectId: FINAL_ACCEPTANCE_PROJECT_ID,
        id: FINAL_ACCEPTANCE_CLAIM_TRACE_PACKET_ID,
      },
    }),
    prisma.paperImplementationTraceGateResult.count({
      where: {
        implementationProjectId: FINAL_ACCEPTANCE_PROJECT_ID,
        id: FINAL_ACCEPTANCE_DOSSIER_GATE_ID,
      },
    }),
    prisma.paperImplementationClaimCandidate.count({
      where: { implementationProjectId: FINAL_ACCEPTANCE_PROJECT_ID },
    }),
    prisma.paperImplementationDossier.count({
      where: { implementationProjectId: FINAL_ACCEPTANCE_PROJECT_ID },
    }),
  ]);
  return {
    real_provider_attempts: realProviderAttempts,
    succeeded_real_provider_attempts: succeededRealProviderAttempts,
    create_job_commands: createJobCommands,
    experiment_results: experimentResults,
    passed_validation_reports: passedValidationReports,
    evidence_candidates: evidenceCandidates,
    run_evidence_units: runEvidenceUnits,
    runtime_artifacts: runtimeArtifacts,
    runtime_admissions: runtimeAdmissions,
    closures,
    packets,
    undelivered_integration_outboxes: undeliveredIntegrationOutboxes,
    claim_trace_manifests: claimTraceManifests,
    dossier_trace_manifests: dossierTraceManifests,
    claim_trace_packets: claimTracePackets,
    dossier_trace_gate_results: dossierTraceGateResults,
    claims,
    dossiers,
  };
}

export function assertScientificEvidenceP5ClaimDossierPreExecutionCountsV1(
  counts: ScientificEvidenceP5ClaimDossierCountsV1,
): void {
  assert.deepEqual(counts, {
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
  });
}

export function assertScientificEvidenceP5ClaimDossierPostExecutionCountsV1(
  counts: ScientificEvidenceP5ClaimDossierCountsV1,
): void {
  assert.deepEqual(counts, {
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
    claim_trace_manifests: 1,
    dossier_trace_manifests: 1,
    claim_trace_packets: 1,
    dossier_trace_gate_results: 1,
    claims: 1,
    dossiers: 1,
  });
}

async function materializeWithRepositories(
  prisma: PrismaClient,
  plan: ScientificEvidenceP5ClaimDossierFinalPlanV1,
  traceRepository: PaperImplementationTraceRepository,
  resultRepository: PaperImplementationResultClaimDossierRepository,
): Promise<ScientificEvidenceP5ClaimDossierFinalRecordsV1> {
  const projectRepository = new PrismaPaperImplementationRepository(prisma);
  const closureRepository = new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma);
  const materializer = new PaperImplementationResultPacketV2Materializer(
    closureRepository,
    resultRepository,
  );
  const idFactory = finalAcceptanceIdFactory(plan);
  const traceKernel = new PaperImplementationTraceKernelService({
    projectRepository,
    traceRepository,
    idFactory,
    now: () => plan.created_at,
  });
  const claimDossier = new PaperImplementationResultClaimDossierService({
    projectRepository,
    resultClaimRepository: resultRepository,
    traceRepository,
    validationRepository: new PrismaPaperImplementationValidationRepository(prisma),
    evidenceV2Reader: new PrismaPaperImplementationEvidenceV2Repository(prisma),
    confirmationRepository: new PrismaPaperImplementationHumanConfirmationRepository(prisma),
    feedbackRecorder: {
      async recordFeedbackEvent() {
        throw new Error('T136_P5_CLAIM_DOSSIER_FINAL_FEEDBACK_FORBIDDEN');
      },
    },
    closedCycleSnapshotReader: {
      findStoredClosureByCycle: (validationCycleId: string) => (
        closureRepository.withTransaction((transaction) => (
          transaction.findStoredClosureByCycle(validationCycleId)
        ))
      ),
    },
    closedPacketViewReader: materializer,
    idFactory,
    now: () => plan.created_at,
  });
  return materializeScientificEvidenceP5ClaimDossierFinalPlanV1({
    implementation_project_id: FINAL_ACCEPTANCE_PROJECT_ID,
    plan,
    trace_kernel: traceKernel,
    claim_dossier: claimDossier,
  });
}

class OverlayTraceRepository implements PaperImplementationTraceRepository {
  private readonly manifests = new Map<string, TraceManifest>();
  private readonly repairQueue = new Map<string, TraceRepairQueueItem[]>();
  private readonly claimTracePackets: ClaimTracePacket[] = [];
  private readonly gateResults = new Map<string, TraceGateResult>();

  constructor(private readonly base: PaperImplementationTraceRepository) {}

  async createTraceManifest(
    manifest: TraceManifest,
    repairQueueItems: TraceRepairQueueItem[],
  ): Promise<TraceManifest> {
    assert.equal(this.manifests.has(manifest.trace_manifest_id), false);
    this.manifests.set(manifest.trace_manifest_id, structuredClone(manifest));
    this.repairQueue.set(manifest.trace_manifest_id, structuredClone(repairQueueItems));
    return structuredClone(manifest);
  }

  async findTraceManifestById(projectId: string, manifestId: string): Promise<TraceManifest | null> {
    const staged = this.manifests.get(manifestId);
    return staged ? structuredClone(staged) : this.base.findTraceManifestById(projectId, manifestId);
  }

  async listTraceManifests(projectId: string): Promise<TraceManifest[]> {
    return [
      ...structuredClone([...this.manifests.values()]),
      ...await this.base.listTraceManifests(projectId),
    ];
  }

  createCitationCandidate(candidate: CitationCandidate): Promise<CitationCandidate> {
    return this.base.createCitationCandidate(candidate);
  }

  listCitationCandidates(projectId: string): Promise<CitationCandidate[]> {
    return this.base.listCitationCandidates(projectId);
  }

  async createClaimTracePacket(packet: ClaimTracePacket): Promise<ClaimTracePacket> {
    this.claimTracePackets.push(structuredClone(packet));
    return structuredClone(packet);
  }

  async listClaimTracePackets(projectId: string): Promise<ClaimTracePacket[]> {
    return [
      ...structuredClone(this.claimTracePackets),
      ...await this.base.listClaimTracePackets(projectId),
    ];
  }

  createNaturalLanguageFieldRole(
    record: NaturalLanguageFieldRoleRecord,
  ): Promise<NaturalLanguageFieldRoleRecord> {
    return this.base.createNaturalLanguageFieldRole(record);
  }

  findNaturalLanguageFieldRoleByIdentity(
    projectId: string,
    owner: TopicSelectionFunctionalRef,
    fieldName: string,
    policyVersionId: string | null,
  ): Promise<NaturalLanguageFieldRoleRecord | null> {
    return this.base.findNaturalLanguageFieldRoleByIdentity(
      projectId,
      owner,
      fieldName,
      policyVersionId,
    );
  }

  async createTraceGateResult(result: TraceGateResult): Promise<TraceGateResult> {
    this.gateResults.set(result.gate_result_id, structuredClone(result));
    return structuredClone(result);
  }

  async findTraceGateResultById(projectId: string, gateId: string): Promise<TraceGateResult | null> {
    const staged = this.gateResults.get(gateId);
    return staged ? structuredClone(staged) : this.base.findTraceGateResultById(projectId, gateId);
  }

  async listTraceRepairQueueItems(projectId: string): Promise<TraceRepairQueueItem[]> {
    return [
      ...structuredClone([...this.repairQueue.values()].flat()),
      ...await this.base.listTraceRepairQueueItems(projectId),
    ];
  }

  listTraceRepairQueueItemsByManifest(
    projectId: string,
    manifestId: string,
  ): Promise<TraceRepairQueueItem[]> {
    const staged = this.repairQueue.get(manifestId);
    return staged
      ? Promise.resolve(structuredClone(staged))
      : this.base.listTraceRepairQueueItemsByManifest(projectId, manifestId);
  }

  resolveTraceRepairQueueItem(
    projectId: string,
    queueItemId: string,
    resolution: {
      resolved_by: TraceRepairQueueItem['resolved_by'];
      resolved_at: string;
      resolution_note?: string | null;
    },
  ): Promise<TraceRepairQueueItem> {
    return this.base.resolveTraceRepairQueueItem(projectId, queueItemId, resolution);
  }
}

class OverlayResultRepository implements PaperImplementationResultClaimDossierRepository {
  private readonly claims = new Map<string, ClaimCandidate>();
  private readonly dossiers = new Map<string, ImplementationDossier>();

  constructor(private readonly base: PaperImplementationResultClaimDossierRepository) {}

  createResultInterpretationPacket(packet: ResultInterpretationPacket): Promise<ResultInterpretationPacket> {
    return this.base.createResultInterpretationPacket(packet);
  }

  materializeClosedResultInterpretationPacket(
    packet: ClosedResultInterpretationPacketV2,
  ): Promise<ClosedResultInterpretationPacketV2> {
    return this.base.materializeClosedResultInterpretationPacket(packet);
  }

  findResultInterpretationPacketById(
    projectId: string,
    packetId: string,
  ): Promise<ResultInterpretationPacket | null> {
    return this.base.findResultInterpretationPacketById(projectId, packetId);
  }

  listResultInterpretationPackets(projectId: string): Promise<ResultInterpretationPacket[]> {
    return this.base.listResultInterpretationPackets(projectId);
  }

  async createClaimCandidate(claim: ClaimCandidate): Promise<ClaimCandidate> {
    assert.equal(this.claims.has(claim.claim_candidate_id), false);
    this.claims.set(claim.claim_candidate_id, structuredClone(claim));
    return structuredClone(claim);
  }

  async findClaimCandidateById(projectId: string, claimId: string): Promise<ClaimCandidate | null> {
    const staged = this.claims.get(claimId);
    return staged ? structuredClone(staged) : this.base.findClaimCandidateById(projectId, claimId);
  }

  async listClaimCandidates(projectId: string): Promise<ClaimCandidate[]> {
    return [
      ...structuredClone([...this.claims.values()]),
      ...await this.base.listClaimCandidates(projectId),
    ];
  }

  async createImplementationDossier(dossier: ImplementationDossier): Promise<ImplementationDossier> {
    assert.equal(this.dossiers.has(dossier.dossier_id), false);
    this.dossiers.set(dossier.dossier_id, structuredClone(dossier));
    return structuredClone(dossier);
  }

  async findImplementationDossierById(
    projectId: string,
    dossierId: string,
  ): Promise<ImplementationDossier | null> {
    const staged = this.dossiers.get(dossierId);
    return staged ? structuredClone(staged) : this.base.findImplementationDossierById(projectId, dossierId);
  }

  async listImplementationDossiers(projectId: string): Promise<ImplementationDossier[]> {
    return [
      ...structuredClone([...this.dossiers.values()]),
      ...await this.base.listImplementationDossiers(projectId),
    ];
  }

  createWritingEntryPacket(
    packet: PaperImplementationWritingEntryPacket,
  ): Promise<PaperImplementationWritingEntryPacket> {
    return this.base.createWritingEntryPacket(packet);
  }

  listWritingEntryPackets(projectId: string): Promise<PaperImplementationWritingEntryPacket[]> {
    return this.base.listWritingEntryPackets(projectId);
  }
}

function finalAcceptanceIdFactory(plan: ScientificEvidenceP5ClaimDossierFinalPlanV1) {
  let traceCount = 0;
  return (prefix: string): string => {
    if (prefix === 'trace_manifest') {
      traceCount += 1;
      if (traceCount === 1) return plan.claim_trace_manifest_id;
      if (traceCount === 2) return plan.dossier_trace_manifest_id;
    }
    if (prefix === 'claim_trace_packet') return plan.claim_trace_packet_id;
    if (prefix === 'trace_gate_result') return plan.dossier_gate_result_id;
    throw new Error(`T136_P5_CLAIM_DOSSIER_FINAL_UNEXPECTED_ID_PREFIX_${prefix.toUpperCase()}`);
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
    title_card_id: FINAL_ACCEPTANCE_TITLE_CARD_ID,
    version_id: versionId,
  };
}

function lineage(input: {
  literature_evidence_refs?: TopicSelectionFunctionalRef[];
  run_evidence_refs?: TopicSelectionFunctionalRef[];
  result_packet_refs?: TopicSelectionFunctionalRef[];
  validation_cycle_refs?: TopicSelectionFunctionalRef[];
  result_interpretation_refs?: TopicSelectionFunctionalRef[];
}) {
  return {
    literature: {
      literature_evidence_refs: input.literature_evidence_refs ?? EMPTY_REFS,
      source_locator_refs: [],
      citation_candidate_refs: [],
    },
    experiment: {
      experiment_plan_refs: [],
      work_order_refs: [],
      run_refs: [],
      run_evidence_refs: input.run_evidence_refs ?? EMPTY_REFS,
      result_packet_refs: input.result_packet_refs ?? EMPTY_REFS,
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
      validation_cycle_refs: input.validation_cycle_refs ?? EMPTY_REFS,
      motive_evolution_decision_refs: [],
      gate_result_refs: [],
      human_decision_refs: [],
      accepted_risk_refs: [],
    },
    internal_interpretation: {
      result_interpretation_refs: input.result_interpretation_refs ?? EMPTY_REFS,
      llm_rationale_refs: [],
      board_summary_refs: [],
      non_citable_refs: [],
    },
  };
}

function emptyIntegrity() {
  return {
    missing_refs: [],
    broken_refs: [],
    stale_refs: [],
    invalidated_refs: [],
    non_citable_refs: [],
    partial_refs: [],
  };
}

function semanticHash(domain: string, value: unknown): string {
  return `sha256:${createHash('sha256')
    .update(`${domain}\n${canonicalizeExperimentV2Json(value)}`)
    .digest('hex')}`;
}
