import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ImplementationFeedbackEvent,
  ImplementationIntakeSnapshot,
  ImplementationProject,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  CreateCitationCandidateRequest,
  TraceLineageBundle,
  TraceManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationTraceRepository } from '../repositories/in-memory-paper-implementation-trace-repository.js';
import type {
  PaperImplementationBootstrapPersistence,
  PaperImplementationBootstrapResult,
  PaperImplementationRepository,
} from '../repositories/paper-implementation.repository.js';
import { PaperImplementationTraceKernelService } from './paper-implementation-trace-kernel-service.js';

const NOW = '2026-05-20T00:00:00.000Z';

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: versionId,
  };
}

function emptyLineage(): TraceLineageBundle {
  return {
    literature: {
      literature_evidence_refs: [],
      source_locator_refs: [],
      citation_candidate_refs: [],
    },
    experiment: {
      experiment_plan_refs: [],
      work_order_refs: [],
      run_refs: [],
      run_evidence_refs: [],
      result_packet_refs: [],
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
      result_interpretation_refs: [],
      llm_rationale_refs: [],
      board_summary_refs: [],
      non_citable_refs: [],
    },
  };
}

function lineageWithLiterature(): TraceLineageBundle {
  return {
    ...emptyLineage(),
    literature: {
      literature_evidence_refs: [ref('literature_evidence_unit', 'literature_evidence_unit_001')],
      source_locator_refs: [ref('source_locator', 'source_locator_001')],
      citation_candidate_refs: [],
    },
  };
}

function lineageWithExperiment(): TraceLineageBundle {
  return {
    ...emptyLineage(),
    experiment: {
      ...emptyLineage().experiment,
      run_evidence_refs: [ref('run_evidence', 'run_evidence_001', 'v1')],
      result_packet_refs: [ref('result_packet', 'result_packet_001', 'v1')],
    },
  };
}

function makeIdFactory() {
  const counts = new Map<string, number>();
  return (prefix: string) => {
    const next = (counts.get(prefix) ?? 0) + 1;
    counts.set(prefix, next);
    return `${prefix}_${String(next).padStart(3, '0')}`;
  };
}

const PROJECT: ImplementationProject = {
  implementation_project_id: 'implementation_project_001',
  intake_snapshot_id: 'implementation_intake_snapshot_001',
  workspace_id: 'workspace_001',
  title_card_id: 'title_card_001',
  paper_project_bridge_id: 'paper_project_bridge_001',
  bridge_payload_hash: 'bridge_payload_hash_001',
  target_paper_project_ref: null,
  lifecycle_status: 'active',
  freshness_status: 'fresh',
  source_status: 'active',
  version_number: 1,
  policy_version_id: 'policy_v1',
  created_by: 'system',
  created_at: NOW,
  updated_at: NOW,
};

class SingleProjectRepository implements PaperImplementationRepository {
  constructor(private readonly project: ImplementationProject | null = PROJECT) {}

  async createBootstrap(
    _persistence: PaperImplementationBootstrapPersistence,
  ): Promise<PaperImplementationBootstrapResult> {
    throw new Error('createBootstrap is not used by trace-kernel tests.');
  }

  async findProjectById(implementationProjectId: string): Promise<ImplementationProject | null> {
    if (this.project?.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(this.project);
  }

  async findProjectByBridgeId(_paperProjectBridgeId: string): Promise<ImplementationProject | null> {
    return null;
  }

  async findIntakeSnapshotById(_intakeSnapshotId: string): Promise<ImplementationIntakeSnapshot | null> {
    return null;
  }

  async findIntakeSnapshotByProjectId(
    _implementationProjectId: string,
  ): Promise<ImplementationIntakeSnapshot | null> {
    return null;
  }

  async createFeedbackEvent(_event: ImplementationFeedbackEvent): Promise<ImplementationFeedbackEvent> {
    throw new Error('createFeedbackEvent is not used by trace-kernel tests.');
  }
}

function makeHarness() {
  const traceRepository = new InMemoryPaperImplementationTraceRepository();
  const service = new PaperImplementationTraceKernelService({
    projectRepository: new SingleProjectRepository(),
    traceRepository,
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
  return { service, traceRepository };
}

async function assertAppError(
  promise: Promise<unknown>,
  statusCode: number,
  errorCode: string,
) {
  await assert.rejects(
    promise,
    (error) => error instanceof AppError
      && error.statusCode === statusCode
      && error.errorCode === errorCode,
  );
}

function validCitationRequest(traceManifest: TraceManifest): CreateCitationCandidateRequest {
  return {
    trace_manifest_id: traceManifest.trace_manifest_id,
    source_kind: 'literature_evidence_unit',
    source_type: 'paper',
    source_id: 'literature_source_001',
    source_evidence_unit_ref: ref('literature_evidence_unit', 'literature_evidence_unit_001'),
    source_locator_id: 'source_locator_001',
    locator_quality: 'exact',
    locator: {
      section: '3.1',
      paragraph: '2',
    },
    cited_for: ['method_prior_art'],
    linked_target_refs: [traceManifest.target_ref],
    normalized_source_statement: 'The prior result provides the comparison point.',
  };
}

test('complete trace manifest creates no repair queue items and passes trace gate', async () => {
  const { service } = makeHarness();
  const manifest = await service.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('core_motive_version', 'core_motive_version_001', 'v1'),
    lineage: lineageWithLiterature(),
  });
  assert.equal(manifest.trace_status, 'complete');
  assert.equal(manifest.broken_ref_count, 0);

  const queue = await service.listTraceRepairQueue(PROJECT.implementation_project_id);
  assert.equal(queue.length, 0);

  const gate = await service.evaluateTraceGate(PROJECT.implementation_project_id, {
    trace_manifest_id: manifest.trace_manifest_id,
  });
  assert.equal(gate.gate_status, 'passed');
  assert.deepEqual(gate.blocker_codes, []);
});

test('known writing-affecting target with empty required lineage is broken', async () => {
  const { service } = makeHarness();
  const manifest = await service.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('claim_candidate', 'claim_candidate_001', 'v1'),
    lineage: emptyLineage(),
  });
  assert.equal(manifest.trace_status, 'broken');
  assert.equal(manifest.missing_ref_count, 2);

  const queue = await service.listTraceRepairQueue(PROJECT.implementation_project_id);
  assert.equal(queue.length, 2);
  assert.equal(queue.every((item) => item.blocker_code === 'missing_required_lineage'), true);
  assert.deepEqual(
    queue.map((item) => item.lineage_type).sort(),
    ['experiment', 'literature'],
  );
});

test('ResultInterpretationPacket with RunEvidenceUnit lineage is complete with no repair queue', async () => {
  const { service } = makeHarness();
  const lineage = emptyLineage();
  lineage.experiment.run_evidence_refs = [
    ref('run_evidence_unit', 'run_evidence_unit_packet_001', 'sha256:packet-evidence'),
  ];
  const manifest = await service.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('result_interpretation_packet', 'result_interpretation_packet_001'),
    lineage,
  });

  assert.equal(manifest.trace_status, 'complete');
  assert.equal(manifest.missing_ref_count, 0);
  assert.deepEqual(
    await service.listTraceRepairQueue(PROJECT.implementation_project_id),
    [],
  );
});

test('result interpretation packet target requires experiment lineage', async () => {
  const { service } = makeHarness();
  const broken = await service.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('result_interpretation_packet', 'result_interpretation_packet_001', 'v1'),
    lineage: emptyLineage(),
  });
  assert.equal(broken.trace_status, 'broken');
  assert.equal(broken.missing_ref_count, 1);

  const complete = await service.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('result_interpretation_packet', 'result_interpretation_packet_002', 'v1'),
    lineage: lineageWithExperiment(),
  });
  assert.equal(complete.trace_status, 'complete');
});

test('missing refs create broken manifest and repair queue item', async () => {
  const { service } = makeHarness();
  const manifest = await service.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('claim_candidate', 'claim_candidate_001', 'v1'),
    lineage: lineageWithLiterature(),
    integrity: {
      missing_refs: [ref('source_locator', 'source_locator_missing')],
    },
  });
  assert.equal(manifest.trace_status, 'broken');
  assert.equal(manifest.missing_ref_count, 1);

  const queue = await service.listTraceRepairQueue(PROJECT.implementation_project_id);
  assert.equal(queue.length, 1);
  assert.equal(queue[0]?.blocker_code, 'missing_ref');
  assert.equal(queue[0]?.status, 'open');
  assert.equal(queue[0]?.resolution_note, null);
});

test('stale refs produce stale status and queryable stale count', async () => {
  const { service } = makeHarness();
  const manifest = await service.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('result_claim', 'result_claim_001', 'v1'),
    lineage: lineageWithExperiment(),
    integrity: {
      stale_refs: [ref('run_evidence', 'run_evidence_001', 'v1')],
    },
  });
  assert.equal(manifest.trace_status, 'stale');
  assert.equal(manifest.stale_ref_count, 1);
  assert.equal((await service.listTraceRepairQueue(PROJECT.implementation_project_id))[0]?.severity, 'warning');
});

test('result interpretation blockers stay internal interpretation lineage', async () => {
  const { service } = makeHarness();
  await service.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('result_claim', 'result_claim_001', 'v1'),
    lineage: lineageWithExperiment(),
    integrity: {
      non_citable_refs: [ref('result_interpretation', 'result_interpretation_001', 'v1')],
    },
  });

  const queue = await service.listTraceRepairQueue(PROJECT.implementation_project_id);
  assert.equal(queue[0]?.blocker_code, 'non_citable_ref');
  assert.equal(queue[0]?.lineage_type, 'internal_interpretation');
});

test('citation candidate accepts citable source with locator and blocks missing or memo source', async () => {
  const { service } = makeHarness();
  const manifest = await service.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('claim_candidate', 'claim_candidate_001', 'v1'),
    lineage: lineageWithLiterature(),
  });

  const accepted = await service.createCitationCandidate(
    PROJECT.implementation_project_id,
    validCitationRequest(manifest),
  );
  assert.equal(accepted.status, 'candidate');
  assert.equal(accepted.source_locator_id, 'source_locator_001');

  const citableSourceEvidence = await service.createCitationCandidate(
    PROJECT.implementation_project_id,
    {
      ...validCitationRequest(manifest),
      source_kind: 'citable_source_evidence_unit',
      source_evidence_unit_ref: ref('citable_source_evidence_unit', 'citable_source_evidence_unit_001'),
    },
  );
  assert.equal(citableSourceEvidence.source_kind, 'citable_source_evidence_unit');
  assert.equal(citableSourceEvidence.source_evidence_unit_ref.ref_id, 'citable_source_evidence_unit_001');

  await assertAppError(
    service.createCitationCandidate(PROJECT.implementation_project_id, {
      ...validCitationRequest(manifest),
      source_locator_id: 'source_locator_missing',
      locator_quality: 'missing',
    }),
    409,
    'GATE_CONSTRAINT_FAILED',
  );

  await assertAppError(
    service.createCitationCandidate(PROJECT.implementation_project_id, {
      ...validCitationRequest(manifest),
      source_kind: 'llm_summary',
    } as unknown as CreateCitationCandidateRequest),
    409,
    'GATE_CONSTRAINT_FAILED',
  );

  await assertAppError(
    service.createCitationCandidate(PROJECT.implementation_project_id, {
      ...validCitationRequest(manifest),
      linked_target_refs: [ref('claim_candidate', 'different_claim', 'v1')],
    }),
    409,
    'GATE_CONSTRAINT_FAILED',
  );
});

test('field role policy blocks rationale memo as evidence or citation', async () => {
  const { service } = makeHarness();
  await assertAppError(
    service.registerNaturalLanguageFieldRole(PROJECT.implementation_project_id, {
      field_owner_ref: ref('validation_cycle', 'validation_cycle_001', 'v1'),
      field_name: 'rationale',
      field_role: 'rationale_memo',
      can_feed_workflow: true,
      can_feed_hard_gate: true,
      can_be_cited: false,
    }),
    409,
    'GATE_CONSTRAINT_FAILED',
  );

  const semanticContract = await service.registerNaturalLanguageFieldRole(PROJECT.implementation_project_id, {
    field_owner_ref: ref('core_motive_version', 'core_motive_version_001', 'v1'),
    field_name: 'problem_statement',
    field_role: 'semantic_contract',
    can_feed_workflow: true,
    can_feed_hard_gate: true,
    can_be_cited: false,
  });
  assert.equal(semanticContract.can_feed_hard_gate, true);
  assert.equal(semanticContract.can_be_cited, false);

  await assertAppError(
    service.registerNaturalLanguageFieldRole(PROJECT.implementation_project_id, {
      field_owner_ref: ref('core_motive_version', 'core_motive_version_001', 'v1'),
      field_name: 'problem_statement',
      field_role: 'display_summary',
      can_feed_workflow: true,
      can_feed_hard_gate: false,
      can_be_cited: false,
    }),
    409,
    'VERSION_CONFLICT',
  );
});

test('claim trace packet requires manifest and blocks memo-only evidence', async () => {
  const { service } = makeHarness();
  await assertAppError(
    service.createClaimTracePacket(PROJECT.implementation_project_id, {
      claim_ref: ref('claim_candidate', 'claim_candidate_001', 'v1'),
      claim_statement: 'The implementation supports the bounded workflow.',
      trace_manifest_id: 'trace_manifest_missing',
      lineage: emptyLineage(),
      challenge: {
        challenging_result_refs: [],
        counter_evidence_refs: [],
        unresolved_objections: [],
      },
      scope: {},
      boundary: {
        forbidden_overclaims: [],
        claim_strength: 'tentative',
        human_confirmation_required: true,
      },
    }),
    404,
    'NOT_FOUND',
  );

  const manifest = await service.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('claim_candidate', 'claim_candidate_001', 'v1'),
    lineage: lineageWithLiterature(),
  });
  await assertAppError(
    service.createClaimTracePacket(PROJECT.implementation_project_id, {
      claim_ref: ref('claim_candidate', 'claim_candidate_001', 'v1'),
      claim_statement: 'The implementation supports the bounded workflow.',
      trace_manifest_id: manifest.trace_manifest_id,
      lineage: emptyLineage(),
      challenge: {
        challenging_result_refs: [],
        counter_evidence_refs: [],
        unresolved_objections: [],
      },
      scope: {},
      boundary: {
        forbidden_overclaims: [],
        claim_strength: 'tentative',
        human_confirmation_required: true,
      },
    }),
    409,
    'GATE_CONSTRAINT_FAILED',
  );

  await assertAppError(
    service.createClaimTracePacket(PROJECT.implementation_project_id, {
      claim_ref: ref('claim_candidate', 'claim_candidate_001', 'v1'),
      claim_statement: 'The implementation supports the bounded workflow.',
      trace_manifest_id: manifest.trace_manifest_id,
      lineage: {
        ...emptyLineage(),
        internal_interpretation: {
          ...emptyLineage().internal_interpretation,
          llm_rationale_refs: [ref('llm_rationale', 'llm_rationale_001')],
        },
      },
      challenge: {
        challenging_result_refs: [],
        counter_evidence_refs: [],
        unresolved_objections: [],
      },
      scope: {},
      boundary: {
        forbidden_overclaims: [],
        claim_strength: 'tentative',
        human_confirmation_required: true,
      },
    }),
    409,
    'GATE_CONSTRAINT_FAILED',
  );

  const packet = await service.createClaimTracePacket(PROJECT.implementation_project_id, {
    claim_ref: ref('claim_candidate', 'claim_candidate_001', 'v1'),
    claim_statement: 'The implementation supports the bounded workflow.',
    trace_manifest_id: manifest.trace_manifest_id,
    lineage: {
      ...emptyLineage(),
      literature: {
        ...emptyLineage().literature,
        citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_001')],
      },
    },
    challenge: {
      challenging_result_refs: [],
      counter_evidence_refs: [],
      unresolved_objections: [],
    },
    scope: {},
    boundary: {
      forbidden_overclaims: [],
      claim_strength: 'tentative',
      human_confirmation_required: true,
    },
  });
  assert.equal(packet.claim_ref.ref_id, 'claim_candidate_001');
});

test('memory repository rejects duplicate immutable trace citation and claim ids', async () => {
  const { service, traceRepository } = makeHarness();
  const manifest = await service.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('claim_candidate', 'claim_candidate_001', 'v1'),
    lineage: lineageWithLiterature(),
  });
  await assertAppError(traceRepository.createTraceManifest(manifest, []), 409, 'VERSION_CONFLICT');

  const candidate = await service.createCitationCandidate(
    PROJECT.implementation_project_id,
    validCitationRequest(manifest),
  );
  await assertAppError(traceRepository.createCitationCandidate(candidate), 409, 'VERSION_CONFLICT');

  const packet = await service.createClaimTracePacket(PROJECT.implementation_project_id, {
    claim_ref: ref('claim_candidate', 'claim_candidate_001', 'v1'),
    claim_statement: 'The implementation supports the bounded workflow.',
    trace_manifest_id: manifest.trace_manifest_id,
    lineage: {
      ...emptyLineage(),
      literature: {
        ...emptyLineage().literature,
        citation_candidate_refs: [ref('citation_candidate', candidate.citation_candidate_id)],
      },
    },
    challenge: {
      challenging_result_refs: [],
      counter_evidence_refs: [],
      unresolved_objections: [],
    },
    scope: {},
    boundary: {
      forbidden_overclaims: [],
      claim_strength: 'tentative',
      human_confirmation_required: true,
    },
  });
  await assertAppError(traceRepository.createClaimTracePacket(packet), 409, 'VERSION_CONFLICT');
});

test('trace gate evaluation persists the gate result for later resolution', async () => {
  const { service } = makeHarness();
  const manifest = await service.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('core_motive_version', 'core_motive_version_gate_001', 'v1'),
    lineage: lineageWithLiterature(),
  });
  const gate = await service.evaluateTraceGate(PROJECT.implementation_project_id, {
    trace_manifest_id: manifest.trace_manifest_id,
  });
  const resolved = await service.findTraceGateResultById(
    PROJECT.implementation_project_id,
    gate.gate_result_id,
  );
  assert.ok(resolved);
  assert.equal(resolved?.gate_result_id, gate.gate_result_id);
  assert.equal(resolved?.gate_status, gate.gate_status);
  assert.equal(
    await service.findTraceGateResultById(PROJECT.implementation_project_id, 'trace_gate_result_missing'),
    null,
  );
});

test('claim manifests accept experiment-only lineage but stay broken with neither literature nor experiment (D-N8)', async () => {
  const { service } = makeHarness();
  const experimentOnly = await service.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('claim_candidate', 'claim_candidate_experiment_only', 'v1'),
    lineage: {
      ...emptyLineage(),
      experiment: {
        ...emptyLineage().experiment,
        run_evidence_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
      },
    },
  });
  assert.equal(experimentOnly.trace_status, 'complete');

  const neither = await service.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('claim_candidate', 'claim_candidate_no_support', 'v1'),
    lineage: emptyLineage(),
  });
  assert.equal(neither.trace_status, 'broken');
  assert.equal(neither.missing_ref_count >= 1, true);

  const dossierExperimentOnly = await service.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('implementation_dossier', 'implementation_dossier_no_literature', 'v1'),
    lineage: {
      ...emptyLineage(),
      experiment: {
        ...emptyLineage().experiment,
        run_evidence_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
      },
    },
  });
  assert.equal(dossierExperimentOnly.trace_status, 'broken');
});
