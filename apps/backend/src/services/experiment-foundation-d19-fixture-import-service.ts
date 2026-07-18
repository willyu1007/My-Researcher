import type {
  ExperimentFoundationAssetLifecycleEventV2,
  ExperimentFoundationAssetLifecycleProjectionV2,
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import { serverHashExperimentV2SemanticContent } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  PaperImplementationExperimentV2AdmissionRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  ExperimentFoundationV2AssetIdentityRecord,
  ExperimentFoundationV2AssetRevisionRecord,
  ExperimentFoundationV2Repository,
} from '../repositories/experiment-foundation-v2.repository.js';
import {
  buildExperimentFoundationD19TypedFixture,
  EXPERIMENT_FOUNDATION_D19_ACTIVE_METRIC_KEYS,
  type ExperimentFoundationD19TypedFixture,
} from './experiment-foundation-d19-fixture.js';
import {
  digestExperimentFoundationD19SourcePolicyAttestation,
  EXPERIMENT_FOUNDATION_D19_REVIEWED_SOURCE_POLICY_DIGEST,
  type ExperimentFoundationD19SourcePolicyAttestation,
} from './experiment-foundation-d19-source-policy.js';
import {
  ExperimentFoundationV2Service,
  type ExperimentFoundationV2AppendLifecycleEventInput,
  type ExperimentFoundationV2AppendLifecycleEventResult,
  type ExperimentFoundationV2CreateAssetDraftInput,
  type ExperimentFoundationV2CreateReadinessInput,
  type ExperimentFoundationV2FreezeAssetDraftInput,
  type ExperimentFoundationV2FreezeAssetDraftResult,
  type ExperimentFoundationV2ReadinessResult,
  type ExperimentFoundationV2ServiceOptions,
} from './experiment-foundation-v2-service.js';

export const EXPERIMENT_FOUNDATION_D19_FIXTURE_IMPORT_CONFLICT =
  'D19_FIXTURE_IMPORT_CONFLICT' as const;
const MAX_CONCURRENT_IMPORT_RETRIES = 3;

export interface ExperimentFoundationD19FixtureImportCounters {
  asset_identities: { created: number; exact_reused: number };
  asset_revisions: { created: number; exact_reused: number };
  lifecycle_events: { created: number; exact_reused: number };
  readiness_attestations: { created: number; exact_reused: number };
}

export interface ExperimentFoundationD19FixtureImportResult {
  fixture: ExperimentFoundationD19TypedFixture;
  reviewed_source_policy_digest: typeof EXPERIMENT_FOUNDATION_D19_REVIEWED_SOURCE_POLICY_DIGEST;
  counters: ExperimentFoundationD19FixtureImportCounters;
}

export interface ExperimentFoundationD19FixtureImportSummary {
  schema_version: 'experiment-foundation-d19-fixture-import-summary@v1';
  status: 'passed';
  write_scope: [
    'ef_v2_typed_asset_identity_revision_freeze_receipt',
    'ef_v2_asset_lifecycle',
    'ef_v2_readiness',
  ];
  reviewed_source_policy_digest: typeof EXPERIMENT_FOUNDATION_D19_REVIEWED_SOURCE_POLICY_DIGEST;
  counters: ExperimentFoundationD19FixtureImportCounters;
  exact_asset_refs: {
    data_policies: ExperimentFoundationV2ExactAssetRevisionRef[];
    datasets: ExperimentFoundationV2ExactAssetRevisionRef[];
    metric_definitions: ExperimentFoundationV2ExactAssetRevisionRef[];
    benchmark: ExperimentFoundationV2ExactAssetRevisionRef;
    evaluation_protocol: ExperimentFoundationV2ExactAssetRevisionRef;
  };
  exact_readiness: {
    readiness_attestation_id: string;
    readiness_attestation_hash: string;
    status: 'passed';
    evaluator_profile_version: string;
    evaluator_profile_hash: string;
    dependency_manifest_hash: string;
    ordered_dependencies: ExperimentFoundationV2ExactAssetRevisionRef[];
  };
  admission_request_template: PaperImplementationExperimentV2AdmissionRequest;
}

export interface ExperimentFoundationD19FixtureImportOptions {
  serviceOptions?: ExperimentFoundationV2ServiceOptions;
}

/**
 * Imports only the reviewed D-19 typed asset/readiness substrate. Each service
 * call owns one short EF-local transaction, so a process crash can be resumed
 * safely without a cross-domain transaction or a cleanup/backfill step.
 */
export async function importExperimentFoundationD19TypedFixture(
  repository: ExperimentFoundationV2Repository,
  sourcePolicyAttestation: ExperimentFoundationD19SourcePolicyAttestation,
  options: ExperimentFoundationD19FixtureImportOptions = {},
): Promise<ExperimentFoundationD19FixtureImportResult> {
  const digest = digestExperimentFoundationD19SourcePolicyAttestation(sourcePolicyAttestation);
  if (digest !== EXPERIMENT_FOUNDATION_D19_REVIEWED_SOURCE_POLICY_DIGEST) {
    throw fixtureConflict(
      'The D-19 source-policy attestation does not match the reviewed Pack A digest.',
    );
  }

  const service = new RestartSafeD19FixtureService(
    repository,
    options.serviceOptions,
  );
  const fixture = await buildExperimentFoundationD19TypedFixture(service, {
    sourcePolicyAttestation,
  });
  return {
    fixture,
    reviewed_source_policy_digest: EXPERIMENT_FOUNDATION_D19_REVIEWED_SOURCE_POLICY_DIGEST,
    counters: service.importCounters(),
  };
}

/**
 * Produces the exact PI admission body used by the bounded D-19 spine. This is
 * data only: the importer never invokes PI repositories, routes, or admission.
 */
export function buildExperimentFoundationD19AdmissionRequestTemplate(
  fixture: ExperimentFoundationD19TypedFixture,
): PaperImplementationExperimentV2AdmissionRequest {
  const metricsByLogicalId = new Map(
    fixture.metric_definitions.map((metric) => [metric.logical_id, metric]),
  );
  const activeMetrics = EXPERIMENT_FOUNDATION_D19_ACTIVE_METRIC_KEYS.map((metricKey) => {
    const metric = metricsByLogicalId.get(`d19-metric-${metricKey}`);
    if (!metric) {
      throw fixtureConflict(`The D-19 active metric catalog is missing ${metricKey}.`);
    }
    if (metric.asset_type !== 'MetricDefinition') {
      throw fixtureConflict('The D-19 active metric catalog contains a non-metric ref.');
    }
    return { ...metric, asset_type: 'MetricDefinition' as const };
  });
  const requiredResultContract = {
    metrics: activeMetrics.map((metricDefinition) => ({
      metric_definition: metricDefinition,
      required_cardinality: 1,
    })),
    artifacts: [{ artifact_kind: 'text_pipeline_stats', required_cardinality: 1 }],
  };
  const readiness = fixture.evaluation_protocol_readiness;
  const orderedDependencies = [
    fixture.evaluation_protocol,
    ...readiness.dependencies.map((row) => row.dependency),
  ];
  return {
    branch_key: 'ragperf-primary',
    branch_frame: {
      frame_schema_version: 'v1',
      display_name: 'RAGPerf primary branch',
      scientific_intent: 'Measure an exact two-cell RAG evaluation plan.',
      comparison_role: 'primary',
      parent_branch_key: null,
    },
    work_order_revision: {
      work_order_schema_version: 'v1',
      title: 'RAGPerf adapter-tier evaluation',
      objective: 'Freeze the exact D-19 two-cell authority lineage without execution.',
      readiness_attestation_id: readiness.attestation.readiness_attestation_id,
      readiness_attestation_hash: readiness.attestation.attestation_hash,
      asset_dependencies: orderedDependencies,
      run_policy: { max_attempts_per_cell: 1, timeout_seconds: 300 },
    },
    exact_cells: [
      {
        cell_key: 'retriever-top-k-5',
        seed: 7,
        repeat_index: 0,
        parameters: [{ name: 'retriever_top_k', value: 5 }],
        required_result_contract: requiredResultContract,
      },
      {
        cell_key: 'retriever-top-k-10',
        seed: 11,
        repeat_index: 0,
        parameters: [{ name: 'retriever_top_k', value: 10 }],
        required_result_contract: requiredResultContract,
      },
    ],
    business_idempotency_key: 'd19-admit-ragperf-primary-r1',
  };
}

export function summarizeExperimentFoundationD19FixtureImport(
  result: ExperimentFoundationD19FixtureImportResult,
): ExperimentFoundationD19FixtureImportSummary {
  const { fixture } = result;
  const readiness = fixture.evaluation_protocol_readiness.attestation;
  if (readiness.status !== 'passed') {
    throw fixtureConflict('The reviewed D-19 EvaluationProtocol readiness is not passed.');
  }
  return {
    schema_version: 'experiment-foundation-d19-fixture-import-summary@v1',
    status: 'passed',
    write_scope: [
      'ef_v2_typed_asset_identity_revision_freeze_receipt',
      'ef_v2_asset_lifecycle',
      'ef_v2_readiness',
    ],
    reviewed_source_policy_digest: result.reviewed_source_policy_digest,
    counters: structuredClone(result.counters),
    exact_asset_refs: {
      data_policies: structuredClone(fixture.data_policies),
      datasets: structuredClone(fixture.datasets),
      metric_definitions: structuredClone(fixture.metric_definitions),
      benchmark: structuredClone(fixture.benchmark),
      evaluation_protocol: structuredClone(fixture.evaluation_protocol),
    },
    exact_readiness: {
      readiness_attestation_id: readiness.readiness_attestation_id,
      readiness_attestation_hash: readiness.attestation_hash,
      status: 'passed',
      evaluator_profile_version: readiness.evaluator_profile_version,
      evaluator_profile_hash: readiness.evaluator_profile_hash,
      dependency_manifest_hash: readiness.dependency_manifest_hash,
      ordered_dependencies: fixture.evaluation_protocol_readiness.dependencies.map(
        (row) => structuredClone(row.dependency),
      ),
    },
    admission_request_template: buildExperimentFoundationD19AdmissionRequestTemplate(fixture),
  };
}

class RestartSafeD19FixtureService extends ExperimentFoundationV2Service {
  private readonly counters: ExperimentFoundationD19FixtureImportCounters = emptyCounters();

  constructor(
    private readonly importRepository: ExperimentFoundationV2Repository,
    options: ExperimentFoundationV2ServiceOptions = {},
  ) {
    super(importRepository, options);
  }

  importCounters(): ExperimentFoundationD19FixtureImportCounters {
    return structuredClone(this.counters);
  }

  override async createAssetDraft(
    input: ExperimentFoundationV2CreateAssetDraftInput,
  ): Promise<ExperimentFoundationV2AssetIdentityRecord> {
    try {
      const created = await super.createAssetDraft(input);
      this.counters.asset_identities.created += 1;
      return created;
    } catch (error) {
      if (!hasReasonCode(error, 'ASSET_IDENTITY_CONFLICT')) throw error;
      const existing = await this.requireExactImportAssetState(input);
      this.counters.asset_identities.exact_reused += 1;
      return existing;
    }
  }

  override async freezeAssetDraft(
    input: ExperimentFoundationV2FreezeAssetDraftInput,
  ): Promise<ExperimentFoundationV2FreezeAssetDraftResult> {
    const result = await this.freezeAssetDraftWithExactRetry(input, 0);
    if (result.replayed) {
      this.counters.asset_revisions.exact_reused += 1;
    } else {
      this.counters.asset_revisions.created += 1;
    }
    return result;
  }

  override async appendLifecycleEvent(
    input: ExperimentFoundationV2AppendLifecycleEventInput,
  ): Promise<ExperimentFoundationV2AppendLifecycleEventResult> {
    return this.ensureLifecycleEvent(input, 0);
  }

  override async createReadinessAttestation(
    input: ExperimentFoundationV2CreateReadinessInput,
  ): Promise<ExperimentFoundationV2ReadinessResult> {
    const result = await this.createReadinessWithExactRetry(input, 0);
    if (result.replayed) {
      this.counters.readiness_attestations.exact_reused += 1;
    } else {
      this.counters.readiness_attestations.created += 1;
    }
    return result;
  }

  private async freezeAssetDraftWithExactRetry(
    input: ExperimentFoundationV2FreezeAssetDraftInput,
    retryCount: number,
  ): Promise<ExperimentFoundationV2FreezeAssetDraftResult> {
    try {
      return await super.freezeAssetDraft(input);
    } catch (error) {
      if (
        retryCount >= MAX_CONCURRENT_IMPORT_RETRIES
        || !hasReasonCode(error, 'ASSET_REVISION_CONFLICT')
      ) {
        throw error;
      }
      return this.freezeAssetDraftWithExactRetry(input, retryCount + 1);
    }
  }

  private async createReadinessWithExactRetry(
    input: ExperimentFoundationV2CreateReadinessInput,
    retryCount: number,
  ): Promise<ExperimentFoundationV2ReadinessResult> {
    try {
      return await super.createReadinessAttestation(input);
    } catch (error) {
      if (
        retryCount >= MAX_CONCURRENT_IMPORT_RETRIES
        || !hasReasonCode(error, 'READINESS_DEPENDENCY_DRIFT')
      ) {
        throw error;
      }
      return this.createReadinessWithExactRetry(input, retryCount + 1);
    }
  }

  private async requireExactImportAssetState(
    input: ExperimentFoundationV2CreateAssetDraftInput,
    retryCount = 0,
  ): Promise<ExperimentFoundationV2AssetIdentityRecord> {
    try {
      return await this.importRepository.runInTransaction(async (unitOfWork) => {
        const identity = await unitOfWork.findAssetIdentity(input.asset_type, input.logical_id);
        if (!identity) {
          throw fixtureConflict('The reserved D-19 asset identity disappeared during replay.');
        }
        const expectedHash = assetContentHash(input);
        const actualDraft = identityDraft(identity);
        const actualHash = actualDraft === null
          ? null
          : assetContentHash({ ...input, draft_content: actualDraft } as ExperimentFoundationV2CreateAssetDraftInput);
        if (actualHash !== expectedHash) {
          throw fixtureConflict(
            `Reserved D-19 asset content changed: ${input.asset_type}:${input.logical_id}.`,
          );
        }

        const revisions = await unitOfWork.listAssetRevisions(input.asset_type, input.logical_id);
        if (
          identity.asset.draft_state_version === 1
          && identity.asset.current_revision_id === null
          && revisions.length === 0
        ) {
          return identity;
        }
        if (
          identity.asset.draft_state_version !== 2
          || !identity.asset.current_revision_id
          || revisions.length !== 1
        ) {
          throw fixtureConflict(
            `Reserved D-19 asset is not an exact import prefix: ${input.asset_type}:${input.logical_id}.`,
          );
        }

        const [revision] = revisions;
        if (
          !revision
          || revision.revision.revision_id !== identity.asset.current_revision_id
          || revision.revision.revision_sequence !== 1
          || revision.revision.content_hash !== expectedHash
          || revisionContentHash(revision) !== expectedHash
        ) {
          throw fixtureConflict(
            `Reserved D-19 immutable revision drifted: ${input.asset_type}:${input.logical_id}.`,
          );
        }
        const replay = await unitOfWork.findFreezeReplay(
          input.asset_type,
          input.logical_id,
          `d19-freeze:${input.asset_type}:${input.logical_id}`,
        );
        if (
          !replay
          || replay.revision_id !== revision.revision.revision_id
          || replay.content_hash !== expectedHash
        ) {
          throw fixtureConflict(
            `Reserved D-19 freeze receipt drifted: ${input.asset_type}:${input.logical_id}.`,
          );
        }
        return identity;
      });
    } catch (error) {
      if (
        retryCount < MAX_CONCURRENT_IMPORT_RETRIES
        && hasReasonCode(error, EXPERIMENT_FOUNDATION_D19_FIXTURE_IMPORT_CONFLICT)
      ) {
        return this.requireExactImportAssetState(input, retryCount + 1);
      }
      throw error;
    }
  }

  private async ensureLifecycleEvent(
    input: ExperimentFoundationV2AppendLifecycleEventInput,
    retryCount: number,
  ): Promise<ExperimentFoundationV2AppendLifecycleEventResult> {
    let inspected;
    try {
      inspected = await this.importRepository.runInTransaction(async (unitOfWork) => {
        const projection = await unitOfWork.findLifecycleProjection(input.asset);
        const events = await unitOfWork.listLifecycleEvents(input.asset);
        assertExactLifecyclePrefix(input.asset, events, projection);
        const requestedIndex = lifecycleEventIndex(input.asset, input.event_type);
        const expected = expectedLifecyclePipeline(input.asset)[requestedIndex];
        if (
          !expected
          || expected.event_type !== input.event_type
          || expected.reason_code !== input.reason_code
          || (input.note ?? null) !== null
        ) {
          throw fixtureConflict(
            `Unexpected D-19 lifecycle command: ${input.asset.asset_type}:${input.event_type}.`,
          );
        }
        const existing = events[requestedIndex];
        if (existing) {
          if (!projection) {
            throw fixtureConflict('Lifecycle projection is missing for an existing D-19 event.');
          }
          return { existing, projection, canAppend: false } as const;
        }
        if (events.length !== requestedIndex) {
          throw fixtureConflict('D-19 lifecycle history is not a resumable exact prefix.');
        }
        return { existing: null, projection, canAppend: true } as const;
      });
    } catch (error) {
      // PostgreSQL READ COMMITTED can expose a projection from one statement
      // and a just-committed event list from the next statement. Re-read the
      // complete exact prefix; persistent semantic drift still fails closed
      // after the bounded retries.
      if (
        retryCount < MAX_CONCURRENT_IMPORT_RETRIES
        && hasReasonCode(error, EXPERIMENT_FOUNDATION_D19_FIXTURE_IMPORT_CONFLICT)
      ) {
        return this.ensureLifecycleEvent(input, retryCount + 1);
      }
      throw error;
    }

    if (!inspected.canAppend) {
      this.counters.lifecycle_events.exact_reused += 1;
      return {
        event: structuredClone(inspected.existing),
        projection: structuredClone(inspected.projection),
      };
    }

    try {
      const created = await super.appendLifecycleEvent({
        ...input,
        expected_projection_state_version:
          inspected.projection?.projection_state_version ?? null,
      });
      this.counters.lifecycle_events.created += 1;
      return created;
    } catch (error) {
      if (
        retryCount >= MAX_CONCURRENT_IMPORT_RETRIES
        || (!hasReasonCode(error, 'ASSET_LIFECYCLE_PROJECTION_CAS_CONFLICT')
          && !hasReasonCode(error, 'ASSET_LIFECYCLE_TRANSITION_INVALID'))
      ) {
        throw error;
      }
      return this.ensureLifecycleEvent(input, retryCount + 1);
    }
  }
}

function emptyCounters(): ExperimentFoundationD19FixtureImportCounters {
  return {
    asset_identities: { created: 0, exact_reused: 0 },
    asset_revisions: { created: 0, exact_reused: 0 },
    lifecycle_events: { created: 0, exact_reused: 0 },
    readiness_attestations: { created: 0, exact_reused: 0 },
  };
}

function identityDraft(
  identity: ExperimentFoundationV2AssetIdentityRecord,
): ExperimentFoundationV2CreateAssetDraftInput['draft_content'] | null {
  switch (identity.asset_type) {
    case 'Dataset': return identity.asset.dataset_draft;
    case 'DataPolicy': return identity.asset.data_policy_draft;
    case 'MetricDefinition': return identity.asset.metric_definition_draft;
    case 'Benchmark': return identity.asset.benchmark_draft;
    case 'EvaluationProtocol': return identity.asset.evaluation_protocol_draft;
  }
}

function assetContentHash(input: ExperimentFoundationV2CreateAssetDraftInput): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: `ExperimentFoundation${input.asset_type}RevisionV2`,
    schema_version: input.draft_content.schema_version,
    hash_profile: 'ef-asset-semantic-json@v1',
    content: structuredClone(input.draft_content),
  });
}

function revisionContentHash(revision: ExperimentFoundationV2AssetRevisionRecord): string {
  const draftContent = (() => {
    switch (revision.asset_type) {
      case 'Dataset': return revision.revision.dataset_revision;
      case 'DataPolicy': return revision.revision.data_policy_revision;
      case 'MetricDefinition': return revision.revision.metric_definition_revision;
      case 'Benchmark': return revision.revision.benchmark_revision;
      case 'EvaluationProtocol': return revision.revision.evaluation_protocol_revision;
    }
  })();
  return serverHashExperimentV2SemanticContent({
    record_kind: `ExperimentFoundation${revision.asset_type}RevisionV2`,
    schema_version: draftContent.schema_version,
    hash_profile: 'ef-asset-semantic-json@v1',
    content: structuredClone(draftContent),
  });
}

interface ExpectedLifecycleEvent {
  event_type: ExperimentFoundationV2AppendLifecycleEventInput['event_type'];
  reason_code: string;
  lifecycle_status: ExperimentFoundationAssetLifecycleProjectionV2['lifecycle_status'];
  location_available: boolean;
}

function expectedLifecyclePipeline(
  asset: ExperimentFoundationV2ExactAssetRevisionRef,
): ExpectedLifecycleEvent[] {
  const base: ExpectedLifecycleEvent[] = [
    {
      event_type: 'registered',
      reason_code: 'D19_FIXTURE_REGISTERED',
      lifecycle_status: 'draft',
      location_available: false,
    },
    {
      event_type: 'activated',
      reason_code: 'D19_FIXTURE_ACTIVATED',
      lifecycle_status: 'active',
      location_available: false,
    },
  ];
  if (asset.asset_type === 'Dataset') {
    base.push({
      event_type: 'location_available',
      reason_code: 'D19_ATTESTED_SOURCE_LOCATION_AVAILABLE',
      lifecycle_status: 'active',
      location_available: true,
    });
  }
  return base;
}

function lifecycleEventIndex(
  asset: ExperimentFoundationV2ExactAssetRevisionRef,
  eventType: ExperimentFoundationV2AppendLifecycleEventInput['event_type'],
): number {
  return expectedLifecyclePipeline(asset).findIndex((event) => event.event_type === eventType);
}

function assertExactLifecyclePrefix(
  asset: ExperimentFoundationV2ExactAssetRevisionRef,
  events: ExperimentFoundationAssetLifecycleEventV2[],
  projection: ExperimentFoundationAssetLifecycleProjectionV2 | null,
): void {
  const pipeline = expectedLifecyclePipeline(asset);
  if (events.length > pipeline.length) {
    throw fixtureConflict('D-19 lifecycle history contains events beyond the reviewed fixture.');
  }
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!;
    const expected = pipeline[index]!;
    if (
      !sameExactRef(event.asset, asset)
      || event.lifecycle_sequence !== index + 1
      || event.event_type !== expected.event_type
      || event.reason_code !== expected.reason_code
      || event.note !== null
    ) {
      throw fixtureConflict('D-19 lifecycle history is not an exact reviewed prefix.');
    }
  }
  if (events.length === 0) {
    if (projection !== null) {
      throw fixtureConflict('D-19 lifecycle projection exists without an event.');
    }
    return;
  }
  const lastEvent = events.at(-1)!;
  const expectedProjection = pipeline[events.length - 1]!;
  if (
    !projection
    || !sameExactRef(projection.asset, asset)
    || projection.projection_state_version !== events.length
    || projection.lifecycle_sequence !== events.length
    || projection.source_event_id !== lastEvent.lifecycle_event_id
    || projection.lifecycle_status !== expectedProjection.lifecycle_status
    || projection.location_available !== expectedProjection.location_available
  ) {
    throw fixtureConflict('D-19 lifecycle projection drifted from its exact event prefix.');
  }
}

function sameExactRef(
  left: ExperimentFoundationV2ExactAssetRevisionRef,
  right: ExperimentFoundationV2ExactAssetRevisionRef,
): boolean {
  return left.asset_type === right.asset_type
    && left.logical_id === right.logical_id
    && left.revision_id === right.revision_id
    && left.revision_sequence === right.revision_sequence
    && left.content_hash === right.content_hash;
}

function hasReasonCode(error: unknown, reasonCode: string): boolean {
  return error instanceof AppError && error.details?.reason_code === reasonCode;
}

function fixtureConflict(message: string): AppError {
  return new AppError(409, 'VERSION_CONFLICT', message, {
    reason_code: EXPERIMENT_FOUNDATION_D19_FIXTURE_IMPORT_CONFLICT,
  });
}
