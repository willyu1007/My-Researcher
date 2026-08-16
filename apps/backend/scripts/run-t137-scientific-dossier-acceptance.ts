#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import process from 'node:process';

import { PrismaClient } from '@prisma/client';
import {
  canonicalizeExperimentV2Json,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  ClosedResultInterpretationPacketV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import {
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
  type PaperImplementationRuntimeAdmissionRecord,
  type PaperImplementationRuntimeArtifactEnvelope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TraceLineageBundle,
  TraceManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import {
  PrismaExperimentFoundationSpineV2Repository,
} from '../src/repositories/prisma/prisma-experiment-foundation-spine-v2-repository.js';
import {
  PrismaPaperImplementationCycleReadinessV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-cycle-readiness-v2-repository.js';
import {
  PrismaPaperImplementationEvidenceV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-evidence-v2-repository.js';
import {
  PrismaPaperImplementationExperimentSpineV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-experiment-spine-v2-repository.js';
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
  PrismaPaperImplementationRuntimeRepository,
} from '../src/repositories/prisma/prisma-paper-implementation-runtime-repository.js';
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
  ExperimentV2IntegrationRelayService,
} from '../src/services/experiment-v2-integration-relay-service.js';
import {
  PaperImplementationCycleReadinessV2Service,
} from '../src/services/paper-implementation-cycle-readiness-v2-service.js';
import {
  PaperImplementationProjectionFeedV2Consumer,
} from '../src/services/paper-implementation-projection-feed-v2-consumer.js';
import {
  PaperImplementationResultAnalysisRuntimeService,
} from '../src/services/paper-implementation-result-analysis-runtime-service.js';
import {
  PaperImplementationResultClaimDossierService,
} from '../src/services/paper-implementation-result-claim-dossier-service.js';
import {
  PaperImplementationResultPacketV2Materializer,
  PaperImplementationValidationCycleClosedCompositeConsumer,
} from '../src/services/paper-implementation-result-packet-v2-materializer.js';
import {
  PaperImplementationRuntimeAdmissionService,
} from '../src/services/paper-implementation-runtime-admission-service.js';
import {
  PaperImplementationScientificClosureContextService,
} from '../src/services/paper-implementation-scientific-closure-context-service.js';
import {
  PaperImplementationTraceKernelService,
} from '../src/services/paper-implementation-trace-kernel-service.js';
import {
  PaperImplementationValidationCycleClosureV2Service,
} from '../src/services/paper-implementation-validation-cycle-closure-v2-service.js';
import {
  buildScientificEvidenceP5PacketTraceLineageV1,
} from '../src/services/scientific-evidence-p5-packet-trace-result-analysis-successor-service.js';
import {
  TopicSelectionAgentOrchestratorService,
} from '../src/services/topic-selection-agent-orchestrator-service.js';
import {
  TopicSelectionModelProfileRegistryService,
} from '../src/services/topic-selection-model-profile-registry-service.js';
import {
  assertExperimentFoundationLiveNamedLocalTarget,
  assertExperimentFoundationNamedLocalDatabaseUrl,
} from './experiment-foundation-named-local-evidence.js';

type RunnerMode = 'offline-preflight' | 'execute';

const PROJECT_ID = 'implementation_project_4ccca1d1-6782-413a-a6fd-a8c56ab9d40b';
const TITLE_CARD_ID = 'title_card_ace91629-d086-4c6d-82f3-679ac86d03c1';
const VALIDATION_CYCLE_ID = 'validation_cycle_t137_t137_pre_pai_20260817_v2_v1';
const RUN_ID = 'ef_run_v2_0369f26c-d784-4c5c-b8dd-7c9b7008bc1c';
const RUN_MANIFEST_HASH =
  'sha256:5b122de63c877294cef9078cafe52e2102778836fe638a5ab87fe7a9b81897a5';
const PACKET_ID = 'result_interpretation_packet_t137_t137_pre_pai_20260817_v2';
const PACKET_TRACE_ID = 'trace_manifest_t137_t137_pre_pai_20260817_v2_result_packet';
const RUNTIME_RUN_ID = 'pi_result_analysis_runtime_t137_t137_pre_pai_20260817_v2';
const CLAIM_ID = 'claim_candidate_t137_t137_pre_pai_20260817_v2';
const CLAIM_TRACE_ID = 'trace_manifest_t137_t137_pre_pai_20260817_v2_claim';
const CLAIM_TRACE_PACKET_ID = 'claim_trace_packet_t137_t137_pre_pai_20260817_v2';
const DOSSIER_ID = 'implementation_dossier_t137_t137_pre_pai_20260817_v2';
const DOSSIER_TRACE_ID = 'trace_manifest_t137_t137_pre_pai_20260817_v2_dossier';
const DOSSIER_GATE_ID = 'trace_gate_result_t137_t137_pre_pai_20260817_v2_dossier';
const CLOSURE_CAPABILITY = 'PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED';
const TARGET = Object.freeze({
  database: 'postgres',
  schema: 'my_researcher_dev',
  host: '127.0.0.1',
  port: '5432',
  fingerprint: 'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0',
});

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  assertNoAlibabaCredentialMaterial();
  assertClosureCapabilityDisabled();
  const databaseUrl = requireEnvironment('DATABASE_URL');
  assertExperimentFoundationNamedLocalDatabaseUrl(
    databaseUrl,
    TARGET,
    'T137_ACCEPTANCE_TARGET_MISMATCH',
  );

  const prisma = new PrismaClient();
  await prisma.$connect();
  try {
    const target = await assertExperimentFoundationLiveNamedLocalTarget(prisma, TARGET);
    const state = await readState(prisma);
    const existingDossier = await new PrismaPaperImplementationResultClaimDossierRepository(prisma)
      .findImplementationDossierById(PROJECT_ID, DOSSIER_ID);
    const dossierReady = existingDossier?.dossier_status === 'ready_for_writing'
      && existingDossier.dossier_trace_status === 'complete';
    if (mode === 'offline-preflight') {
      writeOutput({
        schema_version: 'T137ScientificDossierAcceptancePreflight@v1',
        status: dossierReady
          ? 'ready_for_writing'
          : evidenceReady(state)
          ? 'ready_for_evidence_to_dossier_continuation'
          : 'waiting_for_real_scientific_evidence',
        target_fingerprint: target.fingerprint,
        run_id: RUN_ID,
        current: state,
        expected_evidence_prerequisite: {
          scientific_results: 2,
          passed_validation_reports: 1,
          run_evidence_units: 1,
        },
        terminal_dossier: existingDossier ? {
          dossier_id: existingDossier.dossier_id,
          dossier_status: existingDossier.dossier_status,
          dossier_trace_status: existingDossier.dossier_trace_status,
        } : null,
        result_analysis_model_binding: resolveResultAnalysisModelBinding(false),
        external_call_count: 0,
        database_write_count: 0,
        capability_change_count: 0,
      });
      return;
    }

    assert.ok(evidenceReady(state), 'T137_REAL_SCIENTIFIC_EVIDENCE_NOT_READY');
    const modelBinding = resolveResultAnalysisModelBinding(!dossierReady);
    const packet = await ensureClosureAndPacket(prisma);
    const records = await ensureClaimAndDossier(prisma, packet);
    const finalState = await readState(prisma);
    assert.equal(records.claim.claim_status, 'supported');
    assert.equal(records.dossier.dossier_status, 'ready_for_writing');
    assert.equal(records.dossier.dossier_trace_status, 'complete');
    assert.equal(finalState.undelivered_integration_outboxes, 0);

    writeOutput({
      schema_version: 'T137ScientificDossierAcceptanceResult@v1',
      status: 'ready_for_writing',
      target_fingerprint: target.fingerprint,
      run_id: RUN_ID,
      result_analysis_model_binding: modelBinding,
      packet: {
        result_interpretation_packet_id: packet.result_interpretation_packet_id,
        packet_content_hash: packet.packet_content_hash,
      },
      claim: {
        claim_candidate_id: records.claim.claim_candidate_id,
        claim_status: records.claim.claim_status,
        claim_strength: records.claim.claim_strength,
        claim_statement: records.claim.claim_statement,
      },
      dossier: {
        dossier_id: records.dossier.dossier_id,
        dossier_hash: records.dossier.dossier_hash,
        dossier_status: records.dossier.dossier_status,
        dossier_trace_status: records.dossier.dossier_trace_status,
      },
      current: finalState,
      persistent_capability_change_count: 0,
      alibaba_cloud_call_count: 0,
    });
  } finally {
    disableClosureCapability();
    await prisma.$disconnect();
  }
}

async function ensureClosureAndPacket(
  prisma: PrismaClient,
): Promise<ClosedResultInterpretationPacketV2> {
  const packetRepository = new PrismaPaperImplementationResultClaimDossierRepository(prisma);
  const closureRepository =
    new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma);
  const materializer = new PaperImplementationResultPacketV2Materializer(
    closureRepository,
    packetRepository,
  );
  const existingPacket = await materializer.findClosedInterpretationPacketView(
    PROJECT_ID,
    PACKET_ID,
  );
  if (existingPacket) return existingPacket.packet;

  const existingClosure = await prisma.paperImplementationValidationCycleClosureV2.findUnique({
    where: { validationCycleId: VALIDATION_CYCLE_ID },
  });
  if (!existingClosure) {
    const readiness = await new PaperImplementationCycleReadinessV2Service({
      repository: new PrismaPaperImplementationCycleReadinessV2Repository(prisma),
    }).evaluate(VALIDATION_CYCLE_ID);
    assert.equal(readiness.status, 'ready_with_evidence');
    assert.equal(readiness.eligible_run_evidence_unit_count, 1);
    const packetTrace = await ensurePacketTrace(prisma);
    const proposal = await ensureResultAnalysisProposal(prisma, {
      closureWatermarkHash: readiness.watermark.closure_input_hash,
      packetTrace,
    });
    enableClosureCapability();
    await new PaperImplementationValidationCycleClosureV2Service({
      repository: closureRepository,
      enabled: () => closureCapabilityEnabled(),
    }).close({
      validation_cycle_id: VALIDATION_CYCLE_ID,
      expected_cycle_version: readiness.watermark.expected_cycle_version,
      expected_closure_input_hash: readiness.watermark.closure_input_hash,
      closure_kind: 'scientific_evidence_assessed',
      accepted_proposal_id: proposal.artifact.runtime_artifact_id,
      expected_proposal_hash: proposal.artifact.final_artifact_hash!,
      idempotency_key: 't137-scifact-two-cell:scientific-close',
    });
    disableClosureCapability();
  }

  const piSpineRepository = new PrismaPaperImplementationExperimentSpineV2Repository(prisma);
  const projectionConsumer = new PaperImplementationProjectionFeedV2Consumer({
    repository: piSpineRepository,
  });
  const relay = new ExperimentV2IntegrationRelayService({
    paperImplementationRepository: piSpineRepository,
    experimentFoundationRepository: new PrismaExperimentFoundationSpineV2Repository(prisma),
    materializationConsumer: { async consume() { throw new Error('Unexpected admission event.'); } },
    headConsumer: { async consume() { throw new Error('Unexpected frozen event.'); } },
    acknowledgementConsumer: { async consume() { throw new Error('Unexpected head event.'); } },
    evidenceTrustGatewayConsumer: { async consume() {
      throw new Error('Unexpected evidence event during closure.');
    } },
    runEvidenceProjectionConsumer: projectionConsumer,
    validationCycleClosedProjectionConsumer:
      new PaperImplementationValidationCycleClosedCompositeConsumer(
        projectionConsumer,
        materializer,
      ),
    workerId: `t137-closure-relay-${process.pid}`,
  });
  const relayOutcome = await relay.drainUntilIdle({ max_passes: 5, limit_per_domain: 20 });
  assert.equal(relayOutcome.idle, true);
  assert.deepEqual(relayOutcome.failures, []);
  const packet = await materializer.findClosedInterpretationPacketView(PROJECT_ID, PACKET_ID);
  assert.ok(packet, 'T137_RESULT_PACKET_NOT_MATERIALIZED');
  assert.equal(packet.packet.validation_cycle_id, VALIDATION_CYCLE_ID);
  return packet.packet;
}

async function ensurePacketTrace(prisma: PrismaClient): Promise<TraceManifest> {
  const repository = new PrismaPaperImplementationTraceRepository(prisma);
  const existing = await repository.findTraceManifestById(PROJECT_ID, PACKET_TRACE_ID);
  if (existing) {
    assert.equal(existing.target_ref.ref_type, 'result_interpretation_packet');
    assert.equal(existing.target_ref.ref_id, PACKET_ID);
    assert.equal(existing.trace_status, 'complete');
    return existing;
  }
  const sourceTrace = (await repository.listTraceManifests(PROJECT_ID)).find((trace) => (
    trace.target_ref.ref_type === 'validation_cycle'
    && trace.target_ref.ref_id === VALIDATION_CYCLE_ID
    && trace.trace_status === 'complete'
  ));
  assert.ok(sourceTrace, 'T137_VALIDATION_CYCLE_TRACE_NOT_FOUND');
  const evidenceUnit = await prisma.paperImplementationRunEvidenceUnitV2.findFirst({
    where: {
      implementationProjectId: PROJECT_ID,
      validationCycleId: VALIDATION_CYCLE_ID,
      runId: RUN_ID,
    },
  });
  assert.ok(evidenceUnit);
  const lineage = buildScientificEvidenceP5PacketTraceLineageV1({
    source_lineage: sourceTrace.lineage,
    authoritative_run_evidence_refs: [ref(
      'run_evidence_unit',
      evidenceUnit.id,
      evidenceUnit.contentHash,
    )],
    title_card_id: TITLE_CARD_ID,
  });
  const service = traceKernel(prisma, { trace_manifest: PACKET_TRACE_ID });
  const created = await service.createTraceManifest(PROJECT_ID, {
    target_ref: ref('result_interpretation_packet', PACKET_ID, 'v1'),
    lineage,
    trace_policy_version_id: sourceTrace.trace_policy_version_id,
    created_by: 'system',
  });
  assert.equal(created.trace_status, 'complete');
  return created;
}

async function ensureResultAnalysisProposal(
  prisma: PrismaClient,
  input: { closureWatermarkHash: string; packetTrace: TraceManifest },
): Promise<{
  artifact: PaperImplementationRuntimeArtifactEnvelope;
  admission: PaperImplementationRuntimeAdmissionRecord;
}> {
  const runtimeRepository = new PrismaPaperImplementationRuntimeRepository(prisma);
  const artifacts = await runtimeRepository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
    artifact_scope: 'final',
  });
  const existing = artifacts.filter((artifact) => (
    artifact.target_ref.ref_id === VALIDATION_CYCLE_ID
    && artifact.runtime_status === 'passed'
    && artifact.final_artifact_hash
  ));
  if (existing.length > 0) {
    assert.equal(existing.length, 1);
    const admissions = await runtimeRepository.listAdmissionRecords(PROJECT_ID, {
      runtime_artifact_id: existing[0]!.runtime_artifact_id,
      admission_scope: 'final',
    });
    const admitted = admissions.filter((record) => record.admission_status === 'admitted');
    assert.equal(admitted.length, 1);
    return { artifact: existing[0]!, admission: admitted[0]! };
  }

  const runtime = new PaperImplementationResultAnalysisRuntimeService({
    projectRepository: new PrismaPaperImplementationRepository(prisma),
    runtimeAdmission: new PaperImplementationRuntimeAdmissionService({
      repository: runtimeRepository,
    }),
    agentOrchestrator: new TopicSelectionAgentOrchestratorService(),
    scientificClosureContextResolver: new PaperImplementationScientificClosureContextService(
      new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma),
    ),
  });
  const result = await runtime.runInterpretationScenarios(PROJECT_ID, {
    run_id: RUNTIME_RUN_ID,
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
    target_ref: ref('validation_cycle', VALIDATION_CYCLE_ID, 'v1'),
    target_version_id: RUN_MANIFEST_HASH,
    input_snapshot_ref: ref(
      'implementation_input_snapshot',
      'implementation_input_snapshot_t137_t137_pre_pai_20260817_v2',
      'v1',
    ),
    input_snapshot_hash: semanticHash('T137ResultAnalysisInput', {
      run_id: RUN_ID,
      run_manifest_hash: RUN_MANIFEST_HASH,
      validation_cycle_id: VALIDATION_CYCLE_ID,
    }),
    source_refs: [
      ref('result_interpretation_packet', PACKET_ID, 'v1'),
      ref('trace_manifest', PACKET_TRACE_ID, 'v1'),
    ],
    source_hashes: [
      semanticHash('T137FutureResultPacket', { packet_id: PACKET_ID }),
      semanticHash('T137PacketTrace', { trace_manifest_id: input.packetTrace.trace_manifest_id }),
    ],
    scientific_closure_intent: {
      schema_version: 'PaperImplementationScientificClosureIntent@v1',
      expected_closure_watermark_hash: input.closureWatermarkHash,
    },
  });
  assert.equal(result.status, 'passed');
  assert.ok(result.final_runtime_artifact?.final_artifact_hash);
  assert.ok(result.final_admission_record);
  assert.equal(result.final_admission_record.admission_status, 'admitted');
  const official = await new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma)
    .withTransaction((transaction) => transaction.findAdmittedScientificClosureProposal(
      result.final_runtime_artifact!.runtime_artifact_id,
      result.final_runtime_artifact!.final_artifact_hash!,
    ));
  assert.ok(official?.packet_materialization);
  assert.equal(
    official.packet_materialization.request.result_interpretation_packet_id,
    PACKET_ID,
  );
  assert.equal(official.packet_materialization.request.trace_manifest_id, PACKET_TRACE_ID);
  return {
    artifact: result.final_runtime_artifact,
    admission: result.final_admission_record,
  };
}

async function ensureClaimAndDossier(
  prisma: PrismaClient,
  packet: ClosedResultInterpretationPacketV2,
) {
  const traceRepository = new PrismaPaperImplementationTraceRepository(prisma);
  const resultRepository = new PrismaPaperImplementationResultClaimDossierRepository(prisma);
  const closureRepository =
    new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma);
  const packetTrace = await traceRepository.findTraceManifestById(PROJECT_ID, PACKET_TRACE_ID);
  assert.ok(packetTrace);
  const closure = await closureRepository.withTransaction((transaction) => (
    transaction.findStoredClosureByCycle(VALIDATION_CYCLE_ID)
  ));
  assert.ok(closure);
  assert.equal(closure.closure.scientific_disposition, 'positive');
  const fact = await readPrimaryFact(prisma);
  assert.equal(fact.registered_relation, 'supports_registered_expectation');
  const claimStatement = [
    'In the preregistered SciFact evaluation, retrieval top-k 10 produced',
    `${formatNumber(fact.value)} ppm higher micro recall than top-k 5,`,
    `exceeding the +${formatNumber(fact.supportMin)} ppm positive threshold.`,
  ].join(' ');
  const runEvidenceRefs = packet.source.run_evidence_refs;
  assert.equal(runEvidenceRefs.length, 1);
  const packetRef = ref(
    'result_interpretation_packet',
    packet.result_interpretation_packet_id,
    packet.packet_content_hash,
  );
  const cycleRef = ref(
    'validation_cycle',
    VALIDATION_CYCLE_ID,
    closure.closure.closure_snapshot_hash,
  );
  const claimRef = ref('claim_candidate', CLAIM_ID, null);
  const claimLineage = outcomeLineage(packetTrace.lineage, {
    runEvidenceRefs,
    packetRef,
    cycleRef,
  });
  const dossierLineage = structuredClone(claimLineage);
  const forbiddenOverclaims = [...packet.claim_implications.forbidden_overclaims];
  assert.equal(packet.claim_implications.allowed_claim_ceiling, 'moderate');

  let claimTrace = await traceRepository.findTraceManifestById(PROJECT_ID, CLAIM_TRACE_ID);
  if (!claimTrace) {
    claimTrace = await traceKernel(prisma, { trace_manifest: CLAIM_TRACE_ID })
      .createTraceManifest(PROJECT_ID, {
        target_ref: claimRef,
        lineage: claimLineage,
        integrity: emptyIntegrity(),
        trace_policy_version_id: packet.policy_version_id ?? null,
        created_by: 'system',
      });
  }
  assert.equal(claimTrace.trace_status, 'complete');

  const tracePackets = await traceRepository.listClaimTracePackets(PROJECT_ID);
  let claimTracePacket = tracePackets.find((item) => item.claim_trace_packet_id === CLAIM_TRACE_PACKET_ID);
  if (!claimTracePacket) {
    claimTracePacket = await traceKernel(prisma, { claim_trace_packet: CLAIM_TRACE_PACKET_ID })
      .createClaimTracePacket(PROJECT_ID, {
        claim_ref: claimRef,
        claim_statement: claimStatement,
        trace_manifest_id: CLAIM_TRACE_ID,
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
      });
  }
  assert.equal(claimTracePacket.claim_statement, claimStatement);

  const claimDossier = resultClaimDossierService(
    prisma,
    traceRepository,
    resultRepository,
    closureRepository,
  );
  let claim = await resultRepository.findClaimCandidateById(PROJECT_ID, CLAIM_ID);
  if (!claim) {
    claim = await claimDossier.createClaimCandidate(PROJECT_ID, {
      claim_candidate_id: CLAIM_ID,
      claim_type: 'empirical_finding',
      claim_statement: claimStatement,
      claim_strength: 'moderate',
      result_interpretation_packet_ids: [PACKET_ID],
      support_refs: runEvidenceRefs,
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
        rationale: 'The claim states only the registered observed difference and positive threshold in the exact evaluated setup.',
        forbidden_overclaims: forbiddenOverclaims,
        hidden_counter_evidence_refs: [],
        required_followup_refs: [...packet.claim_implications.required_followup_refs],
        human_confirmation_ref: null,
      },
      trace_manifest_id: CLAIM_TRACE_ID,
      claim_trace_packet_id: CLAIM_TRACE_PACKET_ID,
      policy_version_id: packet.policy_version_id ?? null,
      created_by: 'system',
    });
  }
  assert.equal(claim.claim_status, 'supported');

  let dossierTrace = await traceRepository.findTraceManifestById(PROJECT_ID, DOSSIER_TRACE_ID);
  if (!dossierTrace) {
    dossierTrace = await traceKernel(prisma, { trace_manifest: DOSSIER_TRACE_ID })
      .createTraceManifest(PROJECT_ID, {
        target_ref: ref('implementation_dossier', DOSSIER_ID, '1'),
        lineage: dossierLineage,
        integrity: emptyIntegrity(),
        trace_policy_version_id: packet.policy_version_id ?? null,
        created_by: 'system',
      });
  }
  assert.equal(dossierTrace.trace_status, 'complete');

  let dossierGate = await traceRepository.findTraceGateResultById(PROJECT_ID, DOSSIER_GATE_ID);
  if (!dossierGate) {
    dossierGate = await traceKernel(prisma, { trace_gate_result: DOSSIER_GATE_ID })
      .evaluateTraceGate(PROJECT_ID, { trace_manifest_id: DOSSIER_TRACE_ID });
  }
  assert.equal(dossierGate.gate_status, 'passed');

  let dossier = await resultRepository.findImplementationDossierById(PROJECT_ID, DOSSIER_ID);
  if (!dossier) {
    dossier = await claimDossier.createImplementationDossier(PROJECT_ID, {
      dossier_id: DOSSIER_ID,
      dossier_version: 1,
      dossier_status: 'ready_for_writing',
      result_interpretation_packet_ids: [PACKET_ID],
      claim_candidate_ids: [CLAIM_ID],
      claim_trace_packet_ids: [CLAIM_TRACE_PACKET_ID],
      closed_validation_cycle_snapshot_refs: [{
        validation_cycle_id: VALIDATION_CYCLE_ID,
        closure_id: closure.closure.closure_id,
        closure_snapshot_hash: closure.closure.closure_snapshot_hash,
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
        readiness_gate_result_id: DOSSIER_GATE_ID,
        blocker_refs: [],
        warning_refs: [...packet.claim_implications.required_followup_refs],
        readiness_notes: [
          'The exact closed Packet, positive Closure snapshot and supported moderate Claim are present.',
          'Failed, inconclusive, negative and stale evidence accounting is preserved from the Packet.',
          'The Dossier remains bounded by every accepted ResultAnalysis forbidden overclaim.',
        ],
      },
      trace_manifest_id: DOSSIER_TRACE_ID,
      projection_policy_version_id: packet.policy_version_id ?? null,
      policy_version_id: packet.policy_version_id ?? null,
      created_by: 'system',
    });
  }
  return { claim, dossier };
}

function resultClaimDossierService(
  prisma: PrismaClient,
  traceRepository: PrismaPaperImplementationTraceRepository,
  resultRepository: PrismaPaperImplementationResultClaimDossierRepository,
  closureRepository: PrismaPaperImplementationValidationCycleClosureV2Repository,
) {
  const materializer = new PaperImplementationResultPacketV2Materializer(
    closureRepository,
    resultRepository,
  );
  return new PaperImplementationResultClaimDossierService({
    projectRepository: new PrismaPaperImplementationRepository(prisma),
    resultClaimRepository: resultRepository,
    traceRepository,
    validationRepository: new PrismaPaperImplementationValidationRepository(prisma),
    evidenceV2Reader: new PrismaPaperImplementationEvidenceV2Repository(prisma),
    confirmationRepository: new PrismaPaperImplementationHumanConfirmationRepository(prisma),
    feedbackRecorder: {
      async recordFeedbackEvent() {
        throw new Error('T137_CLAIM_DOSSIER_FEEDBACK_FORBIDDEN');
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
  });
}

function traceKernel(
  prisma: PrismaClient,
  ids: Partial<Record<'trace_manifest' | 'claim_trace_packet' | 'trace_gate_result', string>>,
) {
  return new PaperImplementationTraceKernelService({
    projectRepository: new PrismaPaperImplementationRepository(prisma),
    traceRepository: new PrismaPaperImplementationTraceRepository(prisma),
    idFactory: (prefix) => {
      const id = ids[prefix as keyof typeof ids];
      if (!id) throw new Error(`T137_UNEXPECTED_TRACE_ID_PREFIX_${prefix.toUpperCase()}`);
      return id;
    },
  });
}

function outcomeLineage(
  source: TraceLineageBundle,
  input: {
    runEvidenceRefs: TopicSelectionFunctionalRef[];
    packetRef: TopicSelectionFunctionalRef;
    cycleRef: TopicSelectionFunctionalRef;
  },
): TraceLineageBundle {
  return {
    ...structuredClone(source),
    experiment: {
      ...structuredClone(source.experiment),
      run_evidence_refs: [...input.runEvidenceRefs],
      result_packet_refs: [input.packetRef],
    },
    decision: {
      ...structuredClone(source.decision),
      validation_cycle_refs: [input.cycleRef],
    },
    internal_interpretation: {
      ...structuredClone(source.internal_interpretation),
      result_interpretation_refs: [input.packetRef],
    },
  };
}

async function readPrimaryFact(prisma: PrismaClient): Promise<{
  value: number;
  supportMin: number;
  registered_relation: string;
}> {
  const report = await prisma.experimentFoundationScientificValidationReportV2.findFirst({
    where: { runId: RUN_ID, status: 'passed' },
  });
  assert.ok(report);
  const snapshot = asRecord(report.reportSnapshotJson);
  const comparisons = asArray(snapshot.ordered_comparison_results);
  assert.equal(comparisons.length, 1);
  const fact = asRecord(asRecord(comparisons[0]).fact);
  const rawEffect = asRecord(fact.raw_effect);
  const rule = asRecord(fact.rule_projection);
  const value = requireNumber(rawEffect.value, 'raw effect value');
  const supportMin = requireNumber(rule.support_min, 'support threshold');
  const registeredRelation = requireString(
    fact.registered_relation,
    'registered relation',
  );
  assert.equal(fact.comparison_key, 'top_k_10_minus_top_k_5');
  assert.equal(rawEffect.kind, 'absolute_difference');
  assert.equal(rawEffect.unit, 'ppm');
  return {
    value,
    supportMin,
    registered_relation: registeredRelation,
  };
}

async function readState(prisma: PrismaClient) {
  const [
    scientificResults,
    passedValidationReports,
    runEvidenceUnits,
    runtimeArtifacts,
    runtimeAdmissions,
    closures,
    packets,
    claims,
    dossiers,
    efOutboxes,
    piOutboxes,
  ] = await Promise.all([
    prisma.experimentFoundationExperimentResultV2.count({ where: { runId: RUN_ID } }),
    prisma.experimentFoundationScientificValidationReportV2.count({
      where: { runId: RUN_ID, status: 'passed' },
    }),
    prisma.paperImplementationRunEvidenceUnitV2.count({
      where: {
        implementationProjectId: PROJECT_ID,
        validationCycleId: VALIDATION_CYCLE_ID,
        runId: RUN_ID,
      },
    }),
    prisma.paperImplementationRuntimeArtifact.count({
      where: {
        implementationProjectId: PROJECT_ID,
        slotId: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
        targetRefId: VALIDATION_CYCLE_ID,
      },
    }),
    prisma.paperImplementationRuntimeAdmissionRecord.count({
      where: {
        implementationProjectId: PROJECT_ID,
        slotId: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
        targetRefId: VALIDATION_CYCLE_ID,
      },
    }),
    prisma.paperImplementationValidationCycleClosureV2.count({
      where: { implementationProjectId: PROJECT_ID, validationCycleId: VALIDATION_CYCLE_ID },
    }),
    prisma.paperImplementationResultInterpretationPacket.count({
      where: { implementationProjectId: PROJECT_ID, id: PACKET_ID },
    }),
    prisma.paperImplementationClaimCandidate.count({
      where: { implementationProjectId: PROJECT_ID, id: CLAIM_ID },
    }),
    prisma.paperImplementationDossier.count({
      where: { implementationProjectId: PROJECT_ID, id: DOSSIER_ID },
    }),
    prisma.experimentFoundationIntegrationOutboxV2.count({
      where: {
        implementationProjectId: PROJECT_ID,
        validationCycleId: VALIDATION_CYCLE_ID,
        relayStatus: { in: ['pending', 'claimed'] },
      },
    }),
    prisma.paperImplementationExperimentIntegrationOutboxV2.count({
      where: {
        implementationProjectId: PROJECT_ID,
        validationCycleId: VALIDATION_CYCLE_ID,
        relayStatus: { in: ['pending', 'claimed'] },
      },
    }),
  ]);
  return {
    scientific_results: scientificResults,
    passed_validation_reports: passedValidationReports,
    run_evidence_units: runEvidenceUnits,
    result_analysis_artifacts: runtimeArtifacts,
    result_analysis_admissions: runtimeAdmissions,
    closures,
    packets,
    claims,
    dossiers,
    undelivered_integration_outboxes: efOutboxes + piOutboxes,
  };
}

function evidenceReady(state: Awaited<ReturnType<typeof readState>>): boolean {
  return state.scientific_results === 2
    && state.passed_validation_reports === 1
    && state.run_evidence_units === 1;
}

function resolveResultAnalysisModelBinding(requireKey: boolean) {
  const resolved = new TopicSelectionModelProfileRegistryService().resolveProfile({
    profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'product',
    model_option_id: null,
  });
  const option = resolved.selected_model_option;
  assert.ok(option);
  assert.equal(option.provider_id, 'openai');
  assert.equal(option.model_id, 'gpt-5.6-sol');
  if (requireKey) assert.ok(process.env.OPENAI_API_KEY?.trim(), 'T137_OPENAI_API_KEY_MISSING');
  return {
    profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
    option_id: option.option_id,
    provider_id: option.provider_id,
    model_id: option.model_id,
    api_key_configured: Boolean(process.env.OPENAI_API_KEY?.trim()),
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

function semanticHash(recordKind: string, content: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify({
    record_kind: recordKind,
    schema_version: 'v1',
    content,
  }), 'utf8').digest('hex');
}

function asRecord(value: unknown): Record<string, unknown> {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  assert.ok(Array.isArray(value));
  return value;
}

function requireNumber(value: unknown, label: string): number {
  assert.equal(typeof value, 'number', `${label} must be a number.`);
  return value as number;
}

function requireString(value: unknown, label: string): string {
  assert.equal(typeof value, 'string', `${label} must be a string.`);
  return value as string;
}

function formatNumber(value: number): string {
  assert.ok(Number.isFinite(value));
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(value);
}

function assertNoAlibabaCredentialMaterial(): void {
  for (const key of [
    'ALIBABA_CLOUD_ACCESS_KEY_ID',
    'ALIBABA_CLOUD_ACCESS_KEY_SECRET',
    'ALIBABA_CLOUD_SECURITY_TOKEN',
    'ALIBABA_CLOUD_SESSION_TOKEN',
    'ALIBABA_CLOUD_STS_EXPIRATION',
    'ALIBABA_CLOUD_STS_ASSUME_ROLE_REQUEST_ID',
  ]) assert.equal(process.env[key], undefined, `${key} must be absent during T-137 acceptance.`);
}

function assertClosureCapabilityDisabled(): void {
  const value = process.env[CLOSURE_CAPABILITY];
  if (value !== undefined && !['false', '0', ''].includes(value.trim().toLowerCase())) {
    throw new Error(`${CLOSURE_CAPABILITY} must be disabled before T-137 acceptance.`);
  }
}

function enableClosureCapability(): void {
  assertClosureCapabilityDisabled();
  process.env[CLOSURE_CAPABILITY] = 'true';
}

function disableClosureCapability(): void {
  delete process.env[CLOSURE_CAPABILITY];
}

function closureCapabilityEnabled(): boolean {
  return process.env[CLOSURE_CAPABILITY]?.trim().toLowerCase() === 'true';
}

function parseMode(args: string[]): RunnerMode {
  const modeIndex = args.indexOf('--mode');
  const mode = modeIndex >= 0 ? args[modeIndex + 1] : undefined;
  if (mode === 'offline-preflight' || mode === 'execute') return mode;
  throw new Error('Usage: --mode offline-preflight|execute');
}

function requireEnvironment(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function writeOutput(output: unknown): void {
  process.stdout.write(`${canonicalizeExperimentV2Json(output)}\n`);
}

main().catch((error: unknown) => {
  disableClosureCapability();
  process.stderr.write(`${JSON.stringify({
    schema_version: 'T137ScientificDossierAcceptanceFailure@v1',
    status: 'failed',
    reason: error instanceof Error ? error.message : 'T137_ACCEPTANCE_FAILED',
  })}\n`);
  process.exitCode = 1;
});
