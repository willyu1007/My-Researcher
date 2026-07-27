import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ExperimentFoundationReadinessAttestationV2,
  ExperimentFoundationV2AssetType,
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  serverHashExperimentV2EventPayload,
  serverHashExperimentV2SemanticContent,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import { EXPERIMENT_V2_INT32_MAX } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-contract-limits';
import type {
  PaperImplementationExperimentV2AdmissionRequest,
  RunManifestFrozenEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

import { AppError } from '../errors/app-error.js';
import {
  InMemoryExperimentFoundationExperimentSpineV2Repository,
  InMemoryPaperImplementationExperimentSpineV2Repository,
} from '../repositories/in-memory-experiment-spine-v2-repository.js';
import { ExperimentSpineV2RepositoryConstraintError } from '../repositories/experiment-spine-v2.repository.js';
import { InMemoryPaperImplementationValidationCycleClosureV2Lookup } from '../repositories/paper-implementation-validation-cycle-closure-v2-lookup.js';
import {
  ExperimentFoundationV2AcknowledgementService,
  ACKNOWLEDGEMENT_CONSUMER,
} from './experiment-foundation-v2-acknowledgement-service.js';
import {
  ExperimentFoundationV2MaterializationService,
  type ExperimentFoundationV2ExactReadinessResolution,
} from './experiment-foundation-v2-materialization-service.js';
import { ExperimentV2IntegrationRelayService } from './experiment-v2-integration-relay-service.js';
import {
  PaperImplementationExperimentV2AdmissionService,
  type PaperImplementationExperimentV2ScopeReader,
} from './paper-implementation-experiment-v2-admission-service.js';
import { PaperImplementationExperimentV2HeadService } from './paper-implementation-experiment-v2-head-service.js';
import { createRealProviderV2TestFixture } from './experiment-foundation-real-provider-v2-test-fixture.js';

const PROJECT_ID = 'implementation-project-d19';
const CYCLE_ID = 'validation-cycle-d19';
const SERVER_ACTOR = 'system:paper-implementation-experiment-v2-admission';
const BASE_TIME = '2026-07-13T12:00:00.000Z';
const OPEN_CYCLE_LOOKUP = {
  async isCycleClosed() {
    return false;
  },
};

function hash(label: string): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'D19TestFixture',
    schema_version: 'v1',
    hash_profile: 'ef-asset-semantic-json@v1',
    content: { label },
  });
}

function ids(namespace: string) {
  let sequence = 0;
  return (prefix: string) => `${namespace}_${prefix}_${++sequence}`;
}

function asset(
  assetType: ExperimentFoundationV2AssetType,
  ordinal: number,
): ExperimentFoundationV2ExactAssetRevisionRef {
  return {
    asset_type: assetType,
    logical_id: `${assetType.toLowerCase()}-${ordinal}`,
    revision_id: `${assetType.toLowerCase()}-revision-${ordinal}`,
    revision_sequence: 1,
    content_hash: hash(`${assetType}-${ordinal}`),
  };
}

function dependencies(): ExperimentFoundationV2ExactAssetRevisionRef[] {
  return [
    asset('Dataset', 1),
    asset('Dataset', 2),
    asset('DataPolicy', 1),
    asset('DataPolicy', 2),
    ...Array.from({ length: 17 }, (_, index) => asset('MetricDefinition', index + 1)),
    asset('Benchmark', 1),
    asset('EvaluationProtocol', 1),
  ];
}

function readinessFor(
  orderedDependencies: ExperimentFoundationV2ExactAssetRevisionRef[],
): ExperimentFoundationV2ExactReadinessResolution {
  const target = orderedDependencies.find(
    (dependency) => dependency.asset_type === 'EvaluationProtocol',
  )!;
  const transitiveDependencies = orderedDependencies.filter(
    (dependency) => dependency.asset_type !== 'EvaluationProtocol',
  );
  const dependencyManifestHash = serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationReadinessDependencyManifestV2',
    schema_version: 'v1',
    hash_profile: 'ef-readiness-dependency-manifest-json@v1',
    content: transitiveDependencies,
  });
  const attestation: ExperimentFoundationReadinessAttestationV2 = {
    readiness_attestation_id: 'readiness-attestation-d19',
    target,
    status: 'passed',
    evaluator_profile_version: 'd19-v1',
    evaluator_profile_hash: hash('evaluator-profile'),
    dependency_manifest_hash: dependencyManifestHash,
    qualification_snapshot: {
      target_lifecycle_sequence: 2,
      dependency_count: 22,
      all_dependencies_active: true,
      all_required_rules_supported: true,
    },
    blockers: [],
    attestation_hash: hash('readiness-attestation'),
    created_at: BASE_TIME,
  };
  return { attestation, ordered_dependencies: transitiveDependencies };
}

function admissionRequest(
  readiness: ExperimentFoundationV2ExactReadinessResolution,
  overrides: Partial<PaperImplementationExperimentV2AdmissionRequest> = {},
): PaperImplementationExperimentV2AdmissionRequest {
  const metric = readiness.ordered_dependencies.find(
    (dependency): dependency is ExperimentFoundationV2ExactAssetRevisionRef & {
      asset_type: 'MetricDefinition';
    } => dependency.asset_type === 'MetricDefinition',
  )!;
  return {
    branch_key: 'ragperf-primary',
    branch_frame: {
      frame_schema_version: 'v1',
      display_name: 'RAGPerf primary',
      scientific_intent: 'Measure the exact two-cell RAG workload.',
      comparison_role: 'primary',
      parent_branch_key: null,
    },
    work_order_revision: {
      work_order_schema_version: 'v1',
      title: 'D-19 two-cell WorkOrder',
      objective: 'Prove exact PI to EF to PI authority.',
      readiness_attestation_id: readiness.attestation.readiness_attestation_id,
      readiness_attestation_hash: readiness.attestation.attestation_hash,
      asset_dependencies: [...readiness.ordered_dependencies, readiness.attestation.target],
      run_policy: { max_attempts_per_cell: 2, timeout_seconds: 300 },
    },
    exact_cells: [
      {
        cell_key: 'cell-a',
        seed: 11,
        repeat_index: 0,
        parameters: [{ name: 'top_k', value: 5 }],
        required_result_contract: {
          metrics: [{ metric_definition: metric, required_cardinality: 1 }],
          artifacts: [{ artifact_kind: 'text_pipeline_stats', required_cardinality: 1 }],
        },
      },
      {
        cell_key: 'cell-b',
        seed: 22,
        repeat_index: 1,
        parameters: [{ name: 'top_k', value: 10 }],
        required_result_contract: {
          metrics: [{ metric_definition: metric, required_cardinality: 1 }],
          artifacts: [{ artifact_kind: 'text_pipeline_stats', required_cardinality: 1 }],
        },
      },
    ],
    business_idempotency_key: 'admit-d19-v1',
    ...overrides,
  };
}

function scopeReader(counter?: { calls: number }): PaperImplementationExperimentV2ScopeReader {
  return {
    async resolveExactScope(projectId, cycleId) {
      if (counter) {
        counter.calls += 1;
      }
      return projectId === PROJECT_ID && cycleId === CYCLE_ID
        ? {
          implementation_project_id: PROJECT_ID,
          implementation_project_lifecycle_status: 'active',
          validation_cycle_id: CYCLE_ID,
          validation_cycle_lifecycle_status: 'admitted',
        }
        : null;
    },
  };
}

function makeServices(input: {
  pi?: InMemoryPaperImplementationExperimentSpineV2Repository;
  ef?: InMemoryExperimentFoundationExperimentSpineV2Repository;
  enabled?: () => boolean;
  cycleClosureLookup?: typeof OPEN_CYCLE_LOOKUP;
  now?: () => string;
}) {
  const pi = input.pi ?? new InMemoryPaperImplementationExperimentSpineV2Repository();
  const ef = input.ef ?? new InMemoryExperimentFoundationExperimentSpineV2Repository();
  const orderedDependencies = dependencies();
  const readiness = readinessFor(orderedDependencies);
  const admission = new PaperImplementationExperimentV2AdmissionService({
    repository: pi,
    cycleClosureLookup: input.cycleClosureLookup ?? OPEN_CYCLE_LOOKUP,
    scopeReader: scopeReader(),
    admissionEnabled: input.enabled ?? (() => true),
    serverActorId: SERVER_ACTOR,
    idFactory: ids('admission'),
    now: input.now ?? (() => BASE_TIME),
  });
  const materialization = new ExperimentFoundationV2MaterializationService({
    repository: ef,
    cycleClosureLookup: input.cycleClosureLookup ?? OPEN_CYCLE_LOOKUP,
    readinessResolver: {
      async resolvePassedExactReadiness(request) {
        return request.readiness_attestation_id === readiness.attestation.readiness_attestation_id
          && request.readiness_attestation_hash === readiness.attestation.attestation_hash
          ? readiness
          : null;
      },
    },
    idFactory: ids('materialization'),
    now: input.now ?? (() => BASE_TIME),
  });
  const head = new PaperImplementationExperimentV2HeadService({
    repository: pi,
    cycleClosureLookup: input.cycleClosureLookup ?? OPEN_CYCLE_LOOKUP,
    idFactory: ids('head'),
    now: input.now ?? (() => BASE_TIME),
  });
  const acknowledgement = new ExperimentFoundationV2AcknowledgementService({
    repository: ef,
    idFactory: ids('ack'),
    now: input.now ?? (() => BASE_TIME),
  });
  return { pi, ef, readiness, admission, materialization, head, acknowledgement };
}

function overwriteInMemoryRelayAttemptCount(
  repository: object,
  outboxId: string,
  relayAttemptCount: number,
): void {
  const state = Reflect.get(repository, 'state');
  assert.ok(state && typeof state === 'object');
  const outboxes = Reflect.get(state, 'outboxes');
  assert.ok(outboxes instanceof Map);
  const record = outboxes.get(outboxId);
  assert.ok(record && typeof record === 'object');
  assert.equal(Reflect.set(record, 'relay_attempt_count', relayAttemptCount), true);
}

function inMemoryPiState(
  repository: InMemoryPaperImplementationExperimentSpineV2Repository,
): object {
  const state = Reflect.get(repository, 'state');
  assert.ok(state && typeof state === 'object');
  return state;
}

function mapFromState(state: object, property: string): Map<unknown, unknown> {
  const value = Reflect.get(state, property);
  assert.ok(value instanceof Map);
  return value;
}

function tamperInMemoryRevisionCell(
  repository: InMemoryPaperImplementationExperimentSpineV2Repository,
  revisionId: string,
): void {
  const bundle = mapFromState(inMemoryPiState(repository), 'bundlesByRevision').get(revisionId);
  assert.ok(bundle && typeof bundle === 'object');
  const cells = Reflect.get(bundle, 'cells');
  assert.ok(Array.isArray(cells) && cells.length > 0);
  assert.ok(cells[0] && typeof cells[0] === 'object');
  assert.equal(Reflect.set(cells[0], 'parameters', [{ name: 'tampered', value: true }]), true);
}

function tamperInMemoryAdmissionOutbox(
  repository: InMemoryPaperImplementationExperimentSpineV2Repository,
  admissionEventId: string,
): void {
  const state = inMemoryPiState(repository);
  const outboxId = mapFromState(state, 'outboxByEvent').get(admissionEventId);
  assert.equal(typeof outboxId, 'string');
  const record = mapFromState(state, 'outboxes').get(outboxId);
  assert.ok(record && typeof record === 'object');
  const storedEvent = Reflect.get(record, 'stored_event');
  assert.ok(storedEvent && typeof storedEvent === 'object');
  const payload = Reflect.get(storedEvent, 'eventPayloadJson');
  assert.ok(payload && typeof payload === 'object');
  assert.equal(Reflect.set(payload, 'admission_id', 'tampered-admission'), true);
}

function tamperInMemoryBranchHead(
  repository: InMemoryPaperImplementationExperimentSpineV2Repository,
  branchId: string,
  property: 'head_run_id' | 'head_run_manifest_hash',
): void {
  const branch = mapFromState(inMemoryPiState(repository), 'branchesById').get(branchId);
  assert.ok(branch && typeof branch === 'object');
  assert.equal(Reflect.set(branch, property, `tampered-${property}`), true);
}

async function admit(
  service: PaperImplementationExperimentV2AdmissionService,
  request: PaperImplementationExperimentV2AdmissionRequest,
) {
  return service.admit({
    implementation_project_id: PROJECT_ID,
    validation_cycle_id: CYCLE_ID,
    request,
    admitted_by: SERVER_ACTOR,
  });
}

function appReason(error: unknown): string | undefined {
  return error instanceof AppError && typeof error.details?.reason_code === 'string'
    ? error.details.reason_code
    : undefined;
}

test('A01 capability-off performs zero scope/repository work and rejects before actor validation', async () => {
  const pi = new InMemoryPaperImplementationExperimentSpineV2Repository();
  const counter = { calls: 0 };
  const readiness = readinessFor(dependencies());
  const service = new PaperImplementationExperimentV2AdmissionService({
    repository: pi,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    scopeReader: scopeReader(counter),
    admissionEnabled: () => false,
    idFactory: ids('disabled'),
    now: () => BASE_TIME,
  });

  await assert.rejects(
    service.admit({
      implementation_project_id: PROJECT_ID,
      validation_cycle_id: CYCLE_ID,
      request: admissionRequest(readiness),
      admitted_by: 'caller-authored-actor',
    }),
    (error) => appReason(error) === 'PI_EXPERIMENT_V2_ADMISSION_DISABLED',
  );
  assert.equal(counter.calls, 0);
  assert.deepEqual(pi.snapshot(), {
    branches: [], admission_bundles: [], inboxes: [], outboxes: [],
  });
});

test('closed-Cycle seal blocks PI admission/head and EF materialization with zero writes', async () => {
  const closed = new InMemoryPaperImplementationValidationCycleClosureV2Lookup([CYCLE_ID]);
  const readiness = readinessFor(dependencies());
  const admissionRepository = new InMemoryPaperImplementationExperimentSpineV2Repository();
  const scopeCalls = { calls: 0 };
  const admission = new PaperImplementationExperimentV2AdmissionService({
    repository: admissionRepository,
    scopeReader: scopeReader(scopeCalls),
    admissionEnabled: () => true,
    cycleClosureLookup: closed,
    serverActorId: SERVER_ACTOR,
  });
  await assert.rejects(
    admit(admission, admissionRequest(readiness)),
    (error) => appReason(error) === 'CYCLE_ALREADY_CLOSED',
  );
  assert.equal(scopeCalls.calls, 1);
  assert.deepEqual(admissionRepository.snapshot(), {
    branches: [], admission_bundles: [], inboxes: [], outboxes: [],
  });

  const open = makeServices({});
  await admit(open.admission, admissionRequest(open.readiness));
  const admittedEvent = open.pi.snapshot().outboxes[0]!.outbox.event;
  const beforeEf = open.ef.snapshot();
  let readinessCalls = 0;
  const sealedMaterialization = new ExperimentFoundationV2MaterializationService({
    repository: open.ef,
    cycleClosureLookup: closed,
    readinessResolver: {
      async resolvePassedExactReadiness() {
        readinessCalls += 1;
        return open.readiness;
      },
    },
  });
  await assert.rejects(
    sealedMaterialization.consume(admittedEvent as never),
    (error) => appReason(error) === 'CYCLE_ALREADY_CLOSED',
  );
  assert.equal(readinessCalls, 0);
  assert.deepEqual(open.ef.snapshot(), beforeEf);

  const materialized = await open.materialization.consume(admittedEvent as never);
  const beforePi = open.pi.snapshot();
  const sealedHead = new PaperImplementationExperimentV2HeadService({
    repository: open.pi,
    cycleClosureLookup: closed,
  });
  await assert.rejects(
    sealedHead.consume(materialized.outbox.event),
    (error) => appReason(error) === 'CYCLE_ALREADY_CLOSED',
  );
  assert.deepEqual(open.pi.snapshot(), beforePi);
});

test('PI admission exact business-key replay converges after Cycle closure', async () => {
  let closed = false;
  const services = makeServices({
    cycleClosureLookup: { async isCycleClosed() { return closed; } },
  });
  const request = admissionRequest(services.readiness);
  const first = await admit(services.admission, request);
  const before = services.pi.snapshot();

  closed = true;
  const replay = await admit(services.admission, request);

  assert.equal(replay.replayed, true);
  assert.equal(replay.admission.admission_id, first.admission.admission_id);
  assert.deepEqual(services.pi.snapshot(), before);
});

test('EF materialization exact inbox replay converges after Cycle closure', async () => {
  let closed = false;
  const services = makeServices({
    cycleClosureLookup: { async isCycleClosed() { return closed; } },
  });
  await admit(services.admission, admissionRequest(services.readiness));
  const event = services.pi.snapshot().outboxes[0]!.outbox.event;
  const first = await services.materialization.consume(event as never);
  const before = services.ef.snapshot();

  closed = true;
  const replay = await services.materialization.consume(event as never);

  assert.equal(replay.run.run_id, first.run.run_id);
  assert.deepEqual(services.ef.snapshot(), before);
});

test('PI head-advance exact processed receipt replay converges after Cycle closure', async () => {
  let closed = false;
  const services = makeServices({
    cycleClosureLookup: { async isCycleClosed() { return closed; } },
  });
  await admit(services.admission, admissionRequest(services.readiness));
  const admitted = services.pi.snapshot().outboxes[0]!.outbox.event;
  const materialized = await services.materialization.consume(admitted as never);
  const first = await services.head.consume(materialized.outbox.event);
  const before = services.pi.snapshot();

  closed = true;
  const replay = await services.head.consume(materialized.outbox.event);

  assert.equal(replay.inbox.inbox_id, first.inbox.inbox_id);
  assert.equal(replay.emitted_branch_head_advanced, true);
  assert.deepEqual(services.pi.snapshot(), before);
});

test('PI admission rejects inactive project or non-admitted Cycle with zero v2 writes', async () => {
  const readiness = readinessFor(dependencies());
  const cases = [
    {
      project_status: 'blocked' as const,
      cycle_status: 'admitted' as const,
    },
    {
      project_status: 'active' as const,
      cycle_status: 'completed' as const,
    },
  ];

  for (const [index, entry] of cases.entries()) {
    const pi = new InMemoryPaperImplementationExperimentSpineV2Repository();
    const service = new PaperImplementationExperimentV2AdmissionService({
      repository: pi,
      cycleClosureLookup: OPEN_CYCLE_LOOKUP,
      scopeReader: {
        async resolveExactScope() {
          return {
            implementation_project_id: PROJECT_ID,
            implementation_project_lifecycle_status: entry.project_status,
            validation_cycle_id: CYCLE_ID,
            validation_cycle_lifecycle_status: entry.cycle_status,
          };
        },
      },
      admissionEnabled: () => true,
      serverActorId: SERVER_ACTOR,
      idFactory: ids(`inactive-scope-${index}`),
      now: () => BASE_TIME,
    });

    await assert.rejects(
      admit(service, admissionRequest(readiness)),
      (error) => error instanceof AppError
        && error.statusCode === 409
        && error.errorCode === 'GATE_CONSTRAINT_FAILED'
        && error.details?.reason_code === 'BRANCH_SCOPE_CONFLICT',
    );
    assert.deepEqual(pi.snapshot(), {
      branches: [], admission_bundles: [], inboxes: [], outboxes: [],
    });
  }
});

test('PI public services preserve stable repository read-integrity reason codes', async () => {
  const services = makeServices({});
  const admissionRepository = Object.create(
    services.pi,
  ) as InMemoryPaperImplementationExperimentSpineV2Repository;
  admissionRepository.findBranch = async () => {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'BRANCH_SCOPE_CONFLICT',
      'stored branch frame canonical hash mismatch',
    );
  };
  const admissionService = new PaperImplementationExperimentV2AdmissionService({
    repository: admissionRepository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    scopeReader: scopeReader(),
    admissionEnabled: () => true,
    serverActorId: SERVER_ACTOR,
    idFactory: ids('read-integrity-admission'),
    now: () => BASE_TIME,
  });
  await assert.rejects(
    admit(admissionService, admissionRequest(services.readiness)),
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT'
      && error.details?.reason_code === 'BRANCH_SCOPE_CONFLICT',
  );

  await admit(services.admission, admissionRequest(services.readiness));
  const admittedEvent = services.pi.snapshot().outboxes[0]!.outbox.event;
  assert.equal(admittedEvent.event_type, 'WorkOrderRevisionAdmitted');
  const materializationRepository = Object.create(
    services.ef,
  ) as InMemoryExperimentFoundationExperimentSpineV2Repository;
  materializationRepository.findInboxByEvent = async () => {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'RUN_MANIFEST_CONFLICT',
      'stored Run manifest canonical hash mismatch',
    );
  };
  const guardedMaterialization = new ExperimentFoundationV2MaterializationService({
    repository: materializationRepository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessResolver: {
      async resolvePassedExactReadiness() {
        return services.readiness;
      },
    },
  });
  await assert.rejects(
    guardedMaterialization.consume(admittedEvent as never),
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT'
      && error.details?.reason_code === 'RUN_MANIFEST_CONFLICT',
  );

  const materialized = await services.materialization.consume(admittedEvent as never);
  const headRepository = Object.create(
    services.pi,
  ) as InMemoryPaperImplementationExperimentSpineV2Repository;
  headRepository.findInboxByEvent = async () => {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'BRANCH_REVISION_CONFLICT',
      'stored WorkOrder revision canonical hash mismatch',
    );
  };
  const headService = new PaperImplementationExperimentV2HeadService({
    repository: headRepository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
  });
  await assert.rejects(
    headService.consume(materialized.outbox.event),
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT'
      && error.details?.reason_code === 'BRANCH_REVISION_CONFLICT',
  );
});

test('B01/B05 T1 rolls back on injected failure and exact replay creates no duplicate', async () => {
  const services = makeServices({});
  const request = admissionRequest(services.readiness);
  services.pi.failNext('commitAdmission');
  await assert.rejects(admit(services.admission, request), /INJECTED_commitAdmission/);
  assert.equal(services.pi.snapshot().branches.length, 0);
  assert.equal(services.pi.snapshot().outboxes.length, 0);

  const admitted = await admit(services.admission, request);
  const replay = await admit(services.admission, request);
  assert.equal(admitted.replayed, false);
  assert.equal(replay.replayed, true);
  assert.equal(replay.revision.work_order_revision_id, admitted.revision.work_order_revision_id);
  assert.equal(services.pi.snapshot().admission_bundles.length, 1);
  assert.equal(services.pi.snapshot().outboxes.length, 1);

  await assert.rejects(
    admit(services.admission, admissionRequest(services.readiness, {
      work_order_revision: {
        ...request.work_order_revision,
        title: 'changed under the same business key',
      },
    })),
    (error) => appReason(error) === 'ADMISSION_IDEMPOTENCY_CONFLICT',
  );
});

test('T1 rejects exhausted branch revision/state counters before commit and preserves replay', async (t) => {
  for (const testCase of [
    {
      name: 'revision sequence',
      mutate: (branch: ReturnType<InMemoryPaperImplementationExperimentSpineV2Repository['snapshot']>['branches'][number]) => ({
        ...branch,
        current_admitted_revision_sequence: EXPERIMENT_V2_INT32_MAX,
      }),
    },
    {
      name: 'state version',
      mutate: (branch: ReturnType<InMemoryPaperImplementationExperimentSpineV2Repository['snapshot']>['branches'][number]) => ({
        ...branch,
        state_version: EXPERIMENT_V2_INT32_MAX,
      }),
    },
  ]) {
    await t.test(testCase.name, async () => {
      const services = makeServices({});
      const originalRequest = admissionRequest(services.readiness);
      const first = await admit(services.admission, originalRequest);

      const before = services.pi.snapshot();
      const repository = Object.create(
        services.pi,
      ) as InMemoryPaperImplementationExperimentSpineV2Repository;
      repository.findBranch = async () => testCase.mutate(before.branches[0]!);
      let commitCalls = 0;
      repository.commitAdmission = async (input) => {
        commitCalls += 1;
        return services.pi.commitAdmission(input);
      };
      const service = new PaperImplementationExperimentV2AdmissionService({
        repository,
        cycleClosureLookup: OPEN_CYCLE_LOOKUP,
        scopeReader: scopeReader(),
        admissionEnabled: () => true,
        serverActorId: SERVER_ACTOR,
        idFactory: ids(`int32-admission-${testCase.name}`),
        now: () => BASE_TIME,
      });

      const replay = await admit(service, originalRequest);
      assert.equal(replay.replayed, true);
      assert.equal(replay.revision.work_order_revision_id, first.revision.work_order_revision_id);
      assert.equal(commitCalls, 0);
      repository.findAdmissionByBusinessKey = async () => null;

      await assert.rejects(
        admit(service, admissionRequest(services.readiness, {
          business_idempotency_key: `int32-${testCase.name}`,
          work_order_revision: {
            ...originalRequest.work_order_revision,
            title: `Int32 ${testCase.name}`,
          },
        })),
        (error) => appReason(error) === 'BRANCH_CURRENT_REVISION_CAS_CONFLICT',
      );
      assert.equal(commitCalls, 0);
      assert.deepEqual(services.pi.snapshot(), before);
    });
  }
});

test('B05 concurrent identical admission converges on one durable semantic command', async () => {
  const services = makeServices({});
  const request = admissionRequest(services.readiness);

  const [left, right] = await Promise.all([
    admit(services.admission, request),
    admit(services.admission, structuredClone(request)),
  ]);

  assert.equal(left.revision.work_order_revision_id, right.revision.work_order_revision_id);
  assert.equal(left.admission.admission_id, right.admission.admission_id);
  assert.equal(Number(left.replayed) + Number(right.replayed), 1);
  assert.equal(services.pi.snapshot().branches.length, 1);
  assert.equal(services.pi.snapshot().admission_bundles.length, 1);
  assert.equal(services.pi.snapshot().outboxes.length, 1);
});

test('B02/B07 T2 is atomic and materializes 23 dependencies, 2 TaskSpecs and one ordered Run', async () => {
  const services = makeServices({});
  await admit(services.admission, admissionRequest(services.readiness));
  const admittedEvent = services.pi.snapshot().outboxes[0]!.outbox.event;
  assert.equal(admittedEvent.event_type, 'WorkOrderRevisionAdmitted');

  services.ef.failNext('commitMaterialization');
  await assert.rejects(
    services.materialization.consume(admittedEvent as never),
    /INJECTED_commitMaterialization/,
  );
  assert.equal(services.ef.snapshot().materializations.length, 0);
  assert.equal(services.ef.snapshot().inboxes.length, 0);
  assert.equal(services.ef.snapshot().outboxes.length, 0);

  const materialized = await services.materialization.consume(admittedEvent as never);
  assert.equal(materialized.version_lock_dependencies.length, 23);
  assert.equal(materialized.task_specs.length, 2);
  assert.deepEqual(
    materialized.task_specs.map((spec) => spec.io_snapshot.output_keys),
    [
      ['simulation_lifecycle_trace'],
      ['simulation_lifecycle_trace'],
    ],
  );
  assert.equal(materialized.run_cells.length, 2);
  assert.equal(materialized.run.cell_count, 2);
  assert.deepEqual(materialized.run_cells.map((cell) => cell.ordinal), [1, 2]);
  assert.deepEqual(
    materialized.run_cells.map((cell) => cell.training_task_spec_id),
    materialized.task_specs.map((spec) => spec.training_task_spec_id),
  );
});

test('M7-02 executable WorkOrder v2 preserves the exact ExecutionBundle through T1-T4', async () => {
  const services = makeServices({});
  const fixture = createRealProviderV2TestFixture();
  const request = admissionRequest(services.readiness, {
    work_order_revision: {
      ...admissionRequest(services.readiness).work_order_revision,
      work_order_schema_version: 'v2',
      execution_bundle: {
        execution_bundle_id: fixture.bundle.execution_bundle_id,
        execution_bundle_revision_id: fixture.bundle.execution_bundle_revision_id,
        revision_sequence: fixture.bundle.revision_sequence,
        content_hash: fixture.bundle.content_hash,
      },
      resource_snapshot: {
        cpu_cores: 2,
        memory_mb: 8192,
      },
    },
    business_idempotency_key: 'admit-d19-executable-v2',
  });

  await admit(services.admission, request);
  const admittedEvent = services.pi.snapshot().outboxes[0]!.outbox.event;
  const materialization = new ExperimentFoundationV2MaterializationService({
    repository: services.ef,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessResolver: {
      async resolvePassedExactReadiness() {
        return services.readiness;
      },
    },
    executionBundleResolver: {
      async resolveActiveReadyExact() {
        return { revision: fixture.bundle };
      },
    },
    idFactory: ids('m7-materialization'),
    now: () => BASE_TIME,
  });

  const materialized = await materialization.consume(admittedEvent as never);
  assert.equal(materialized.run_recipe.recipe_snapshot.recipe_schema_version, 'v2');
  assert.equal('execution_bundle' in materialized.run_recipe, true);
  assert.equal(materialized.task_specs.length, 2);
  assert.deepEqual(
    materialized.task_specs.map((spec) => spec.io_snapshot.output_keys),
    [
      ['real_provider_result_envelope'],
      ['real_provider_result_envelope'],
    ],
  );
  assert.equal(
    materialized.task_specs.every(
      (spec) => 'execution_bundle' in spec
        && spec.execution_bundle.execution_bundle_revision_id
          === fixture.bundle.execution_bundle_revision_id
        && spec.resource_snapshot.cpu_cores === 2
        && spec.resource_snapshot.memory_mb === 8192,
    ),
    true,
  );

  const headed = await services.head.consume(materialized.outbox.event);
  assert.equal(headed.emitted_branch_head_advanced, true);
  const headEvent = services.pi.snapshot().outboxes.at(-1)!.outbox.event;
  assert.equal(headEvent.event_type, 'BranchHeadAdvanced');
  const acknowledgement = await services.acknowledgement.consume(headEvent as never);
  assert.equal(services.pi.snapshot().branches[0]!.head_run_id, materialized.run.run_id);
  assert.equal(acknowledgement.outcome, 'processed');
  assert.equal(
    services.ef.snapshot().inboxes.filter(
      (inbox) => inbox.consumer_name === ACKNOWLEDGEMENT_CONSUMER,
    ).length,
    1,
  );
});

test('in-memory PI and EF relays refuse to lease saturated Int32 attempt counters', async () => {
  const services = makeServices({});
  await admit(services.admission, admissionRequest(services.readiness));

  const piOutbox = services.pi.snapshot().outboxes[0]!;
  overwriteInMemoryRelayAttemptCount(
    services.pi,
    piOutbox.outbox.outbox_id,
    EXPERIMENT_V2_INT32_MAX,
  );
  assert.deepEqual(await services.pi.claimOutbox({
    lease_owner: 'pi-int32-fence',
    claimed_at: BASE_TIME,
    lease_expires_at: '2026-07-13T12:05:00.000Z',
    limit: 1,
  }), []);
  assert.equal(services.pi.snapshot().outboxes[0]!.relay_attempt_count, EXPERIMENT_V2_INT32_MAX);
  assert.equal(services.pi.snapshot().outboxes[0]!.status, 'pending');

  const admittedEvent = piOutbox.outbox.event;
  assert.equal(admittedEvent.event_type, 'WorkOrderRevisionAdmitted');
  await services.materialization.consume(admittedEvent as never);
  const efOutbox = services.ef.snapshot().outboxes[0]!;
  overwriteInMemoryRelayAttemptCount(
    services.ef,
    efOutbox.outbox.outbox_id,
    EXPERIMENT_V2_INT32_MAX,
  );
  assert.deepEqual(await services.ef.claimOutbox({
    lease_owner: 'ef-int32-fence',
    claimed_at: BASE_TIME,
    lease_expires_at: '2026-07-13T12:05:00.000Z',
    limit: 1,
  }), []);
  assert.equal(services.ef.snapshot().outboxes[0]!.relay_attempt_count, EXPERIMENT_V2_INT32_MAX);
  assert.equal(services.ef.snapshot().outboxes[0]!.status, 'pending');
});

test('A04/B02 exact readiness rejects missing, substituted, reordered and wrong target manifests', async (t) => {
  const source = makeServices({});
  await admit(source.admission, admissionRequest(source.readiness));
  const admittedEvent = source.pi.snapshot().outboxes[0]!.outbox.event;
  assert.equal(admittedEvent.event_type, 'WorkOrderRevisionAdmitted');

  const driftCases: Array<{
    name: string;
    mutate: (
      readiness: ExperimentFoundationV2ExactReadinessResolution,
    ) => ExperimentFoundationV2ExactReadinessResolution;
  }> = [
    {
      name: 'missing dependency',
      mutate: (readiness) => ({
        ...readiness,
        ordered_dependencies: readiness.ordered_dependencies.slice(1),
      }),
    },
    {
      name: 'substituted dependency',
      mutate: (readiness) => ({
        ...readiness,
        ordered_dependencies: readiness.ordered_dependencies.map((dependency, index) => (
          index === 0 ? asset('Dataset', 99) : dependency
        )),
      }),
    },
    {
      name: 'reordered dependency',
      mutate: (readiness) => ({
        ...readiness,
        ordered_dependencies: [...readiness.ordered_dependencies].reverse(),
      }),
    },
    {
      name: 'wrong readiness target',
      mutate: (readiness) => ({
        ...readiness,
        attestation: {
          ...readiness.attestation,
          target: asset('EvaluationProtocol', 99),
        },
      }),
    },
  ];

  for (const driftCase of driftCases) {
    await t.test(driftCase.name, async () => {
      const ef = new InMemoryExperimentFoundationExperimentSpineV2Repository();
      const drifted = driftCase.mutate(source.readiness);
      const materializer = new ExperimentFoundationV2MaterializationService({
        repository: ef,
        cycleClosureLookup: OPEN_CYCLE_LOOKUP,
        readinessResolver: {
          async resolvePassedExactReadiness() {
            return drifted;
          },
        },
        idFactory: ids(`drift-${driftCase.name}`),
        now: () => BASE_TIME,
      });
      await assert.rejects(
        materializer.consume(admittedEvent),
        (error) => appReason(error) === 'READINESS_DEPENDENCY_DRIFT',
      );
      assert.equal(ef.snapshot().materializations.length, 0);
      assert.equal(ef.snapshot().inboxes.length, 0);
      assert.equal(ef.snapshot().outboxes.length, 0);
    });
  }
});

test('B02 T2 commit fence rejects readiness revoked after precheck with zero partial state', async () => {
  const source = makeServices({});
  await admit(source.admission, admissionRequest(source.readiness));
  const admittedEvent = source.pi.snapshot().outboxes[0]!.outbox.event;
  assert.equal(admittedEvent.event_type, 'WorkOrderRevisionAdmitted');

  let readinessCurrent = true;
  const ef = new InMemoryExperimentFoundationExperimentSpineV2Repository({
    assertMaterializationReadinessCurrent() {
      if (!readinessCurrent) {
        throw new ExperimentSpineV2RepositoryConstraintError(
          'READINESS_DEPENDENCY_DRIFT',
          'Readiness was revoked after precheck.',
        );
      }
    },
  });
  const materializer = new ExperimentFoundationV2MaterializationService({
    repository: ef,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessResolver: {
      async resolvePassedExactReadiness() {
        readinessCurrent = false;
        return source.readiness;
      },
    },
    idFactory: ids('readiness-commit-fence'),
    now: () => BASE_TIME,
  });

  await assert.rejects(
    materializer.consume(admittedEvent),
    (error) => appReason(error) === 'READINESS_DEPENDENCY_DRIFT',
  );
  assert.deepEqual(ef.snapshot(), {
    materializations: [],
    inboxes: [],
    outboxes: [],
  });
});

test('B03/B04 T3 and T4 each rollback without partial inbox/head/ack state', async () => {
  const services = makeServices({});
  await admit(services.admission, admissionRequest(services.readiness));
  const admittedEvent = services.pi.snapshot().outboxes[0]!.outbox.event;
  const materialized = await services.materialization.consume(admittedEvent as never);

  services.pi.failNext('commitHeadAdvance');
  await assert.rejects(
    services.head.consume(materialized.outbox.event),
    /INJECTED_commitHeadAdvance/,
  );
  assert.equal(services.pi.snapshot().branches[0]!.head_run_id, null);
  assert.equal(services.pi.snapshot().inboxes.length, 0);
  assert.equal(services.pi.snapshot().outboxes.length, 1);

  const advanced = await services.head.consume(materialized.outbox.event);
  assert.equal(advanced.emitted_branch_head_advanced, true);
  const headEvent = services.pi.snapshot().outboxes
    .map((record) => record.outbox.event)
    .find((event) => event.event_type === 'BranchHeadAdvanced');
  assert.ok(headEvent?.event_type === 'BranchHeadAdvanced');

  services.ef.failNext('commitAcknowledgement');
  await assert.rejects(
    services.acknowledgement.consume(headEvent),
    /INJECTED_commitAcknowledgement/,
  );
  assert.equal(
    services.ef.snapshot().inboxes.filter((inbox) => inbox.consumer_name === ACKNOWLEDGEMENT_CONSUMER).length,
    0,
  );
  const ack = await services.acknowledgement.consume(headEvent);
  assert.equal(ack.outcome, 'processed');
  assert.equal(
    services.ef.snapshot().inboxes.filter((inbox) => inbox.consumer_name === ACKNOWLEDGEMENT_CONSUMER).length,
    1,
  );
  assert.equal(services.ef.snapshot().outboxes.length, 1, 'T4 emits no acknowledgement event');
});

test('T3 business replay revalidates exact PI authority and maps drift fail closed', async () => {
  const services = makeServices({});
  await admit(services.admission, admissionRequest(services.readiness));
  const admittedEvent = services.pi.snapshot().outboxes[0]!.outbox.event;
  assert.equal(admittedEvent.event_type, 'WorkOrderRevisionAdmitted');
  const materialized = await services.materialization.consume(admittedEvent as never);
  await services.head.consume(materialized.outbox.event);

  const businessReplayRepository = Object.create(
    services.pi,
  ) as InMemoryPaperImplementationExperimentSpineV2Repository;
  businessReplayRepository.findInboxByEvent = async () => null;
  const replayService = new PaperImplementationExperimentV2HeadService({
    repository: businessReplayRepository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
  });
  assert.equal(
    (await replayService.consume(materialized.outbox.event)).emitted_branch_head_advanced,
    true,
  );

  businessReplayRepository.verifyProcessedHeadReplay = async () => {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'BRANCH_REVISION_CONFLICT',
      'stored exact revision drifted after T3',
    );
  };
  await assert.rejects(
    replayService.consume(materialized.outbox.event),
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.details?.reason_code === 'BRANCH_REVISION_CONFLICT',
  );
});

test('processed T3 replay remains valid after a later exact revision advances the branch head', async () => {
  const services = makeServices({});
  const firstRequest = admissionRequest(services.readiness);
  await admit(services.admission, firstRequest);
  const firstAdmissionEvent = services.pi.snapshot().outboxes
    .map((record) => record.outbox.event)
    .find((event) => event.event_type === 'WorkOrderRevisionAdmitted')!;
  assert.equal(firstAdmissionEvent.event_type, 'WorkOrderRevisionAdmitted');
  const firstRun = await services.materialization.consume(firstAdmissionEvent);
  await services.head.consume(firstRun.outbox.event);

  await admit(services.admission, admissionRequest(services.readiness, {
    business_idempotency_key: 'admit-d19-v2',
    work_order_revision: {
      ...firstRequest.work_order_revision,
      title: 'D-19 two-cell WorkOrder revision 2',
    },
  }));
  const admissionEvents = services.pi.snapshot().outboxes
    .map((record) => record.outbox.event)
    .filter((event) => event.event_type === 'WorkOrderRevisionAdmitted');
  assert.equal(admissionEvents.length, 2);
  const secondAdmissionEvent = admissionEvents[1]!;
  assert.equal(secondAdmissionEvent.event_type, 'WorkOrderRevisionAdmitted');
  const secondRun = await services.materialization.consume(secondAdmissionEvent);
  await services.head.consume(secondRun.outbox.event);

  const replay = await services.head.consume(firstRun.outbox.event);
  assert.equal(replay.inbox.outcome, 'processed');
  assert.equal(replay.emitted_branch_head_advanced, true);
  assert.equal(replay.branch?.head_run_id, secondRun.run.run_id);
});

test('processed T3 replay rejects later-head authority drift', async (t) => {
  const cases = [
    {
      name: 'later revision cell',
      expectedReason: 'BRANCH_HEAD_SCOPE_CONFLICT',
      tamper(
        repository: InMemoryPaperImplementationExperimentSpineV2Repository,
        context: { secondRevisionId: string; secondAdmissionEventId: string; branchId: string },
      ) {
        tamperInMemoryRevisionCell(repository, context.secondRevisionId);
      },
    },
    {
      name: 'later T1 admission outbox',
      expectedReason: 'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      tamper(
        repository: InMemoryPaperImplementationExperimentSpineV2Repository,
        context: { secondRevisionId: string; secondAdmissionEventId: string; branchId: string },
      ) {
        tamperInMemoryAdmissionOutbox(repository, context.secondAdmissionEventId);
      },
    },
    {
      name: 'current head Run id',
      expectedReason: 'BRANCH_HEAD_SCOPE_CONFLICT',
      tamper(
        repository: InMemoryPaperImplementationExperimentSpineV2Repository,
        context: { secondRevisionId: string; secondAdmissionEventId: string; branchId: string },
      ) {
        tamperInMemoryBranchHead(repository, context.branchId, 'head_run_id');
      },
    },
    {
      name: 'current head manifest hash',
      expectedReason: 'BRANCH_HEAD_SCOPE_CONFLICT',
      tamper(
        repository: InMemoryPaperImplementationExperimentSpineV2Repository,
        context: { secondRevisionId: string; secondAdmissionEventId: string; branchId: string },
      ) {
        tamperInMemoryBranchHead(repository, context.branchId, 'head_run_manifest_hash');
      },
    },
  ] as const;

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      const services = makeServices({});
      const firstRequest = admissionRequest(services.readiness);
      await admit(services.admission, firstRequest);
      const firstAdmissionEvent = services.pi.snapshot().outboxes
        .map((record) => record.outbox.event)
        .find((event) => event.event_type === 'WorkOrderRevisionAdmitted')!;
      assert.equal(firstAdmissionEvent.event_type, 'WorkOrderRevisionAdmitted');
      const firstRun = await services.materialization.consume(firstAdmissionEvent);
      await services.head.consume(firstRun.outbox.event);

      const secondAdmission = await admit(services.admission, admissionRequest(services.readiness, {
        business_idempotency_key: 'admit-d19-v2',
        work_order_revision: {
          ...firstRequest.work_order_revision,
          title: 'D-19 two-cell WorkOrder revision 2',
        },
      }));
      const secondAdmissionEvent = services.pi.snapshot().outboxes
        .map((record) => record.outbox.event)
        .filter((event) => event.event_type === 'WorkOrderRevisionAdmitted')[1]!;
      assert.equal(secondAdmissionEvent.event_type, 'WorkOrderRevisionAdmitted');
      const secondRun = await services.materialization.consume(secondAdmissionEvent);
      await services.head.consume(secondRun.outbox.event);

      testCase.tamper(services.pi, {
        secondRevisionId: secondAdmission.revision.work_order_revision_id,
        secondAdmissionEventId: secondAdmissionEvent.event_id,
        branchId: secondAdmission.branch.branch_id,
      });
      await assert.rejects(
        services.head.consume(firstRun.outbox.event),
        (error) => error instanceof AppError
          && error.statusCode === 409
          && error.errorCode === 'VERSION_CONFLICT'
          && error.details?.reason_code === testCase.expectedReason,
      );
    });
  }
});

test('T3 rejects an exhausted branch state counter before inbox/head/outbox commit', async () => {
  const services = makeServices({});
  await admit(services.admission, admissionRequest(services.readiness));
  const admittedEvent = services.pi.snapshot().outboxes[0]!.outbox.event;
  const materialized = await services.materialization.consume(admittedEvent as never);
  const before = services.pi.snapshot();
  const repository = Object.create(
    services.pi,
  ) as InMemoryPaperImplementationExperimentSpineV2Repository;
  repository.findBranch = async () => ({
    ...before.branches[0]!,
    state_version: EXPERIMENT_V2_INT32_MAX,
  });
  let commitCalls = 0;
  repository.commitHeadAdvance = async (input, sourceEvent) => {
    commitCalls += 1;
    return services.pi.commitHeadAdvance(input, sourceEvent);
  };
  const head = new PaperImplementationExperimentV2HeadService({
    repository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    idFactory: ids('int32-head'),
    now: () => BASE_TIME,
  });

  await assert.rejects(
    head.consume(materialized.outbox.event),
    (error) => appReason(error) === 'BRANCH_HEAD_CAS_CONFLICT',
  );
  assert.equal(commitCalls, 0);
  assert.deepEqual(services.pi.snapshot(), before);
});

test('B06 lower sequence is durably ignored and a missing prerequisite writes nothing', async () => {
  const services = makeServices({});
  const first = admissionRequest(services.readiness);
  await admit(services.admission, first);
  const firstEvent = services.pi.snapshot().outboxes[0]!.outbox.event;
  const firstMaterialization = await services.materialization.consume(firstEvent as never);

  await admit(services.admission, admissionRequest(services.readiness, {
    business_idempotency_key: 'admit-d19-v2',
    work_order_revision: { ...first.work_order_revision, title: 'D-19 revision two' },
  }));
  const stale = await services.head.consume(firstMaterialization.outbox.event);
  assert.equal(stale.inbox.outcome, 'ignored_stale');
  assert.equal(services.pi.snapshot().branches[0]!.head_run_id, null);

  const emptyPi = new InMemoryPaperImplementationExperimentSpineV2Repository();
  const missingHead = new PaperImplementationExperimentV2HeadService({
    repository: emptyPi,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    idFactory: ids('missing'),
    now: () => BASE_TIME,
  });
  await assert.rejects(
    missingHead.consume(firstMaterialization.outbox.event),
    (error) => error instanceof AppError
      && error.statusCode === 422
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && appReason(error) === 'INTEGRATION_PREREQUISITE_NOT_READY'
      && Object.keys(error.details ?? {}).length === 1,
  );
  assert.equal(emptyPi.snapshot().inboxes.length, 0);
  assert.equal(emptyPi.snapshot().outboxes.length, 0);
});

test('B06 same sequence with a different Run is a terminal conflict', async () => {
  const services = makeServices({});
  await admit(services.admission, admissionRequest(services.readiness));
  const admittedEvent = services.pi.snapshot().outboxes[0]!.outbox.event;
  const materialized = await services.materialization.consume(admittedEvent as never);
  await services.head.consume(materialized.outbox.event);

  const conflictingPayload = {
    ...materialized.outbox.event.payload,
    run_id: 'different-run-at-same-sequence',
  };
  const conflicting: RunManifestFrozenEventV1 = {
    ...materialized.outbox.event,
    event_id: 'different-run-event',
    business_idempotency_key: 'different-run-business-key',
    payload: conflictingPayload,
    payload_hash: serverHashExperimentV2EventPayload(
      'RunManifestFrozen',
      'v1',
      conflictingPayload,
    ),
  };
  const outcome = await services.head.consume(conflicting);
  assert.equal(outcome.inbox.outcome, 'terminal_conflict');
  assert.equal(outcome.inbox.reason_code, 'BRANCH_HEAD_SCOPE_CONFLICT');
  assert.equal(outcome.branch?.head_run_id, materialized.run.run_id);
});

test('B05 exact replay rejects same-payload event envelope scope drift', async () => {
  const services = makeServices({});
  await admit(services.admission, admissionRequest(services.readiness));
  const admittedEvent = services.pi.snapshot().outboxes[0]!.outbox.event;
  const materialized = await services.materialization.consume(admittedEvent as never);
  await services.head.consume(materialized.outbox.event);

  await assert.rejects(
    services.head.consume({
      ...materialized.outbox.event,
      branch_key: 'same-payload-drifted-branch',
    }),
    (error) => appReason(error) === 'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
  );
  assert.equal(services.pi.snapshot().inboxes.length, 1);
});

test('relay terminalizes invalid integration poison without retrying or minting an acknowledgement', async () => {
  const services = makeServices({});
  await admit(services.admission, admissionRequest(services.readiness));
  const relay = new ExperimentV2IntegrationRelayService({
    paperImplementationRepository: services.pi,
    experimentFoundationRepository: services.ef,
    materializationConsumer: {
      async consume() {
        throw new AppError(400, 'INVALID_PAYLOAD', 'terminal poison', {
          reason_code: 'INTEGRATION_EVENT_VERSION_UNSUPPORTED',
        });
      },
    },
    headConsumer: services.head,
    acknowledgementConsumer: services.acknowledgement,
    evidenceTrustGatewayConsumer: { async consume() {} },
    runEvidenceProjectionConsumer: { async consume() {} },
    validationCycleClosedProjectionConsumer: { async consume() {} },
    workerId: 'terminal-relay-test',
    retryDelayMs: 0,
  });

  const first = await relay.drainOnce();
  assert.equal(first.claimed, 1);
  assert.equal(first.released, 0);
  assert.equal(first.terminalized, 1);
  assert.equal(first.failures[0]?.disposition, 'terminal');
  assert.equal(services.pi.snapshot().outboxes[0]?.status, 'terminal');
  assert.equal(services.ef.snapshot().inboxes.length, 0);

  const replay = await relay.drainOnce();
  assert.equal(replay.claimed, 0);
  assert.equal(services.ef.snapshot().inboxes.length, 0);
});

test('relay converges consumer-committed marker failure through closure and exact redelivery without terminalization', async () => {
  let capabilityEnabled = true;
  let cycleClosed = false;
  let nowMs = Date.parse(BASE_TIME);
  const now = () => new Date(nowMs).toISOString();
  const services = makeServices({
    enabled: () => capabilityEnabled,
    cycleClosureLookup: { async isCycleClosed() { return cycleClosed; } },
    now,
  });
  await admit(services.admission, admissionRequest(services.readiness));
  capabilityEnabled = false;

  const relay = new ExperimentV2IntegrationRelayService({
    paperImplementationRepository: services.pi,
    experimentFoundationRepository: services.ef,
    materializationConsumer: services.materialization,
    headConsumer: services.head,
    acknowledgementConsumer: services.acknowledgement,
    evidenceTrustGatewayConsumer: { async consume() {} },
    runEvidenceProjectionConsumer: { async consume() {} },
    validationCycleClosedProjectionConsumer: { async consume() {} },
    workerId: 'relay-test',
    now,
    retryDelayMs: 1_000,
  });
  const materialized = await relay.drainOnce();
  assert.equal(materialized.delivered, 1);
  assert.equal(materialized.terminalized, 0);

  services.ef.failNext('markOutboxDelivered');
  const failedMarker = await relay.drainOnce();
  assert.equal(failedMarker.claimed, 1);
  assert.equal(failedMarker.delivered, 0);
  assert.equal(failedMarker.released, 1);
  assert.equal(failedMarker.terminalized, 0);
  assert.equal(services.pi.snapshot().branches[0]!.head_run_id !== null, true,
    'head consumer committed before marker');

  cycleClosed = true;
  nowMs += 2_000;
  const drained = await relay.drainUntilIdle();
  assert.equal(drained.idle, true);
  assert.equal(drained.failures.length, 0);
  assert.equal(drained.terminalized, 0);
  assert.equal(services.ef.snapshot().materializations.length, 1);
  assert.equal(services.ef.snapshot().materializations[0]!.task_specs.length, 2);
  assert.equal(services.pi.snapshot().branches[0]!.head_run_id !== null, true);
  const acknowledgements = services.ef.snapshot().inboxes.filter(
    (inbox) => inbox.consumer_name === ACKNOWLEDGEMENT_CONSUMER,
  );
  assert.equal(acknowledgements.length, 1);
  assert.equal(acknowledgements[0]!.outcome, 'processed');
  assert.equal(services.pi.snapshot().outboxes.length, 2);
  assert.equal(services.ef.snapshot().outboxes.length, 1);
  assert.equal(
    [...services.pi.snapshot().outboxes, ...services.ef.snapshot().outboxes]
      .every((record) => record.status === 'delivered'),
    true,
  );
});
