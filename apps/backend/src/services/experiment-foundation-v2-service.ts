import { randomUUID } from 'node:crypto';
import { Ajv, type ErrorObject, type ValidateFunction } from 'ajv';
import {
  EXPERIMENT_FOUNDATION_V2_ASSET_TYPES,
  EXPERIMENT_FOUNDATION_V2_LIFECYCLE_EVENT_TYPES,
  experimentFoundationV2BenchmarkDraftContentV1Schema,
  experimentFoundationV2DataPolicyDraftContentV1Schema,
  experimentFoundationV2DatasetDraftContentV1Schema,
  experimentFoundationV2EvaluationProtocolDraftContentV2Schema,
  experimentFoundationV2ExactAssetRevisionRefSchema,
  experimentFoundationV2MetricDefinitionDraftContentV1Schema,
  type ExperimentFoundationAssetLifecycleEventV2,
  type ExperimentFoundationAssetLifecycleProjectionV2,
  type ExperimentFoundationBenchmarkRevisionV2,
  type ExperimentFoundationDataPolicyRevisionV2,
  type ExperimentFoundationDatasetRevisionV2,
  type ExperimentFoundationEvaluationProtocolRevisionV2,
  type ExperimentFoundationMetricDefinitionRevisionV2,
  type ExperimentFoundationReadinessAttestationV2,
  type ExperimentFoundationReadinessBlockerV2,
  type ExperimentFoundationReadinessDependencyV2,
  type ExperimentFoundationV2AssetType,
  type ExperimentFoundationV2ArtifactContractRuleV1,
  type ExperimentFoundationV2BenchmarkDraftContentV1,
  type ExperimentFoundationV2DataPolicyDraftContentV1,
  type ExperimentFoundationV2DatasetDraftContentV1,
  type ExperimentFoundationV2EvaluationProtocolDraftContentV2,
  type ExperimentFoundationV2ExactAssetRevisionRef,
  type ExperimentFoundationV2LifecycleEventType,
  type ExperimentFoundationV2MetricDefinitionDraftContentV1,
  type ExperimentFoundationV2RequiredRuleType,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  serverHashExperimentFoundationV2AssetRevision,
  serverHashExperimentFoundationV2ReadinessAttestation,
  serverHashExperimentFoundationV2ReadinessDependencyManifest,
  serverHashExperimentV2SemanticContent,
  type ExperimentFoundationV2ReadinessAttestationHashInput,
  type ExperimentV2JsonValue,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import { AppError } from '../errors/app-error.js';
import {
  ExperimentFoundationV2RepositoryConstraintError,
  type ExperimentFoundationV2AssetIdentityRecord,
  type ExperimentFoundationV2AssetRevisionRecord,
  type ExperimentFoundationV2Repository,
  type ExperimentFoundationV2UnitOfWork,
} from '../repositories/experiment-foundation-v2.repository.js';
import {
  assertExperimentV2PositiveInt32,
  incrementExperimentV2Int32Counter,
  nextExperimentV2Int32Sequence,
} from './experiment-v2-int32.js';

export type ExperimentFoundationV2DraftContent =
  | ExperimentFoundationV2DatasetDraftContentV1
  | ExperimentFoundationV2DataPolicyDraftContentV1
  | ExperimentFoundationV2MetricDefinitionDraftContentV1
  | ExperimentFoundationV2BenchmarkDraftContentV1
  | ExperimentFoundationV2EvaluationProtocolDraftContentV2;

export type ExperimentFoundationV2CreateAssetDraftInput =
  | {
    asset_type: 'Dataset';
    logical_id: string;
    draft_content: ExperimentFoundationV2DatasetDraftContentV1;
  }
  | {
    asset_type: 'DataPolicy';
    logical_id: string;
    draft_content: ExperimentFoundationV2DataPolicyDraftContentV1;
  }
  | {
    asset_type: 'MetricDefinition';
    logical_id: string;
    draft_content: ExperimentFoundationV2MetricDefinitionDraftContentV1;
  }
  | {
    asset_type: 'Benchmark';
    logical_id: string;
    draft_content: ExperimentFoundationV2BenchmarkDraftContentV1;
  }
  | {
    asset_type: 'EvaluationProtocol';
    logical_id: string;
    draft_content: ExperimentFoundationV2EvaluationProtocolDraftContentV2;
  };

export type ExperimentFoundationV2UpdateAssetDraftInput =
  ExperimentFoundationV2CreateAssetDraftInput & { expected_state_version: number };

export interface ExperimentFoundationV2FreezeAssetDraftInput {
  asset_type: ExperimentFoundationV2AssetType;
  logical_id: string;
  expected_state_version: number;
  business_idempotency_key: string;
}

export interface ExperimentFoundationV2FreezeAssetDraftResult {
  revision: ExperimentFoundationV2AssetRevisionRecord;
  exact_ref: ExperimentFoundationV2ExactAssetRevisionRef;
  replayed: boolean;
}

export interface ExperimentFoundationV2AppendLifecycleEventInput {
  asset: ExperimentFoundationV2ExactAssetRevisionRef;
  expected_projection_state_version: number | null;
  event_type: ExperimentFoundationV2LifecycleEventType;
  reason_code: string;
  note?: string | null;
}

export interface ExperimentFoundationV2AppendLifecycleEventResult {
  event: ExperimentFoundationAssetLifecycleEventV2;
  projection: ExperimentFoundationAssetLifecycleProjectionV2;
}

export interface ExperimentFoundationV2CreateReadinessInput {
  target: ExperimentFoundationV2ExactAssetRevisionRef;
}

export interface ExperimentFoundationV2ReadinessResult {
  attestation: ExperimentFoundationReadinessAttestationV2;
  dependencies: ExperimentFoundationReadinessDependencyV2[];
  replayed: boolean;
}

export interface ExperimentFoundationV2RevalidateReadinessInput {
  target: ExperimentFoundationV2ExactAssetRevisionRef;
  readiness_attestation_id: string;
  expected_dependencies: ExperimentFoundationV2ExactAssetRevisionRef[];
}

export interface ExperimentFoundationV2ServiceOptions {
  now?: () => string;
  idGenerator?: (kind: 'revision' | 'lifecycle_event' | 'readiness_attestation') => string;
  readinessEvaluatorProfile?: {
    profile_version: string;
    supported_rule_types: readonly ExperimentFoundationV2RequiredRuleType[];
  };
}

interface ResolvedDependency {
  ref: ExperimentFoundationV2ExactAssetRevisionRef;
  revision: ExperimentFoundationV2AssetRevisionRecord;
}

interface DependencyResolutionCache {
  manifests: Map<string, ResolvedDependency[]>;
  revisions: Map<string, ExperimentFoundationV2AssetRevisionRecord>;
}

interface ReadinessEvaluation {
  blockers: ExperimentFoundationReadinessBlockerV2[];
  targetLifecycleSequence: number;
  allDependenciesActive: boolean;
  allRequiredRulesSupported: boolean;
}

const DEFAULT_READINESS_EVALUATOR_PROFILE = {
  profile_version: 'ef-readiness-evaluator@v1',
  supported_rule_types: [
    'artifact_contract@v1',
    'metric_contract@v1',
  ] as const,
};

const DEPENDENCY_ASSET_ORDER: Record<ExperimentFoundationV2AssetType, number> = {
  Dataset: 0,
  DataPolicy: 1,
  Benchmark: 2,
  EvaluationProtocol: 3,
  MetricDefinition: 4,
};

export class ExperimentFoundationV2Service {
  private readonly now: () => string;
  private readonly idGenerator: NonNullable<ExperimentFoundationV2ServiceOptions['idGenerator']>;
  private readonly readinessEvaluatorProfile: NonNullable<
    ExperimentFoundationV2ServiceOptions['readinessEvaluatorProfile']
  >;
  private readonly draftValidators: Record<ExperimentFoundationV2AssetType, ValidateFunction>;
  private readonly exactRefValidator: ValidateFunction;

  constructor(
    private readonly repository: ExperimentFoundationV2Repository,
    options: ExperimentFoundationV2ServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.idGenerator = options.idGenerator ?? ((kind) => `${kind}_${randomUUID()}`);
    this.readinessEvaluatorProfile = options.readinessEvaluatorProfile
      ?? DEFAULT_READINESS_EVALUATOR_PROFILE;

    const ajv = new Ajv({ allErrors: true, strict: false });
    this.draftValidators = {
      Dataset: ajv.compile(experimentFoundationV2DatasetDraftContentV1Schema),
      DataPolicy: ajv.compile(experimentFoundationV2DataPolicyDraftContentV1Schema),
      MetricDefinition: ajv.compile(experimentFoundationV2MetricDefinitionDraftContentV1Schema),
      Benchmark: ajv.compile(experimentFoundationV2BenchmarkDraftContentV1Schema),
      EvaluationProtocol: ajv.compile(
        experimentFoundationV2EvaluationProtocolDraftContentV2Schema,
      ),
    };
    this.exactRefValidator = ajv.compile(experimentFoundationV2ExactAssetRevisionRefSchema);
  }

  async createAssetDraft(
    input: ExperimentFoundationV2CreateAssetDraftInput,
  ): Promise<ExperimentFoundationV2AssetIdentityRecord> {
    this.assertAssetType(input.asset_type);
    this.assertNonEmpty(input.logical_id, 'logical_id');
    this.assertNoCallerCanonicalHash(input);
    this.assertDraftContent(input.asset_type, input.draft_content);
    const now = this.now();
    const record = createAssetIdentityRecord(input, now);

    return this.runInTransaction(async (unitOfWork) => {
      const existing = await unitOfWork.findAssetIdentity(input.asset_type, input.logical_id);
      if (existing) {
        throw conflict('ASSET_IDENTITY_CONFLICT', 'Asset identity already exists.');
      }
      await unitOfWork.insertAssetIdentity(record);
      return clone(record);
    });
  }

  async updateAssetDraft(
    input: ExperimentFoundationV2UpdateAssetDraftInput,
  ): Promise<ExperimentFoundationV2AssetIdentityRecord> {
    this.assertAssetType(input.asset_type);
    this.assertNonEmpty(input.logical_id, 'logical_id');
    this.assertPositiveInteger(input.expected_state_version, 'expected_state_version');
    this.assertNoCallerCanonicalHash(input);
    this.assertDraftContent(input.asset_type, input.draft_content);

    return this.runInTransaction(async (unitOfWork) => {
      const current = await this.requireAssetIdentity(
        unitOfWork,
        input.asset_type,
        input.logical_id,
      );
      if (current.asset.draft_state_version !== input.expected_state_version) {
        throw draftCasConflict(current.asset.draft_state_version);
      }
      if (assetIdentityFamilyKey(current) !== draftContentFamilyKey(input)) {
        throw conflict(
          'ASSET_IDENTITY_CONFLICT',
          'An asset semantic family key is immutable after identity creation.',
        );
      }
      const next = updateAssetIdentityDraft(current, input, this.now());
      const updated = await unitOfWork.compareAndSwapAssetIdentity(
        input.asset_type,
        input.logical_id,
        input.expected_state_version,
        next,
      );
      if (!updated) {
        throw draftCasConflict(input.expected_state_version);
      }
      return clone(next);
    });
  }

  async freezeAssetDraft(
    input: ExperimentFoundationV2FreezeAssetDraftInput,
  ): Promise<ExperimentFoundationV2FreezeAssetDraftResult> {
    this.assertAssetType(input.asset_type);
    this.assertNonEmpty(input.logical_id, 'logical_id');
    this.assertPositiveInteger(input.expected_state_version, 'expected_state_version');
    this.assertNonEmpty(input.business_idempotency_key, 'business_idempotency_key');
    this.assertNoCallerCanonicalHash(input);

    return this.runInTransaction(async (unitOfWork) => {
      const current = await this.requireAssetIdentity(
        unitOfWork,
        input.asset_type,
        input.logical_id,
      );
      const draftContent = assetDraftContent(current);
      if (!draftContent) {
        throw invalidPayload('V2_TYPED_SNAPSHOT_INVALID', 'Asset has no draft content to freeze.');
      }
      this.assertDraftContent(input.asset_type, draftContent);
      await this.assertDraftDependencies(unitOfWork, input.asset_type, draftContent);

      const contentHash = hashAssetContent(input.asset_type, draftContent);
      const replay = await unitOfWork.findFreezeReplay(
        input.asset_type,
        input.logical_id,
        input.business_idempotency_key,
      );
      if (replay) {
        if (replay.content_hash !== contentHash) {
          throw conflict(
            'ASSET_FREEZE_IDEMPOTENCY_CONFLICT',
            'Freeze idempotency key was reused with changed semantic content.',
          );
        }
        const replayRevision = await unitOfWork.findAssetRevisionById(
          input.asset_type,
          replay.revision_id,
        );
        if (!replayRevision || replayRevision.revision.content_hash !== contentHash) {
          throw gateFailure(
            'READINESS_DEPENDENCY_DRIFT',
            'Stored freeze replay no longer resolves to its exact immutable revision.',
          );
        }
        return freezeResult(replayRevision, true);
      }

      const contentReplay = await unitOfWork.findAssetRevisionByContentHash(
        input.asset_type,
        input.logical_id,
        contentHash,
      );
      if (contentReplay) {
        await unitOfWork.insertFreezeReplay({
          asset_type: input.asset_type,
          logical_id: input.logical_id,
          business_idempotency_key: input.business_idempotency_key,
          content_hash: contentHash,
          revision_id: contentReplay.revision.revision_id,
        });
        return freezeResult(contentReplay, true);
      }

      if (current.asset.draft_state_version !== input.expected_state_version) {
        throw draftCasConflict(current.asset.draft_state_version);
      }

      const revisions = await unitOfWork.listAssetRevisions(input.asset_type, input.logical_id);
      const revisionSequence = nextExperimentV2Int32Sequence(
        revisions.map((revision) => revision.revision.revision_sequence),
        'Asset revision sequence',
        (message) => conflict(
          'ASSET_REVISION_CONFLICT',
          message,
        ),
      );
      const revision = createAssetRevisionRecord(
        input.asset_type,
        input.logical_id,
        draftContent,
        this.idGenerator('revision'),
        revisionSequence,
        contentHash,
        this.now(),
      );
      await unitOfWork.insertAssetRevision(revision);

      const nextIdentity = advanceAssetCurrentRevision(
        current,
        revision.revision.revision_id,
        this.now(),
      );
      const advanced = await unitOfWork.compareAndSwapAssetIdentity(
        input.asset_type,
        input.logical_id,
        input.expected_state_version,
        nextIdentity,
      );
      if (!advanced) {
        throw draftCasConflict(input.expected_state_version);
      }
      await unitOfWork.insertFreezeReplay({
        asset_type: input.asset_type,
        logical_id: input.logical_id,
        business_idempotency_key: input.business_idempotency_key,
        content_hash: contentHash,
        revision_id: revision.revision.revision_id,
      });
      return freezeResult(revision, false);
    });
  }

  async getExactAssetRevision(
    ref: ExperimentFoundationV2ExactAssetRevisionRef,
  ): Promise<ExperimentFoundationV2AssetRevisionRecord> {
    this.assertExactRef(ref);
    return this.runInTransaction((unitOfWork) => this.requireExactRevision(unitOfWork, ref));
  }

  async appendLifecycleEvent(
    input: ExperimentFoundationV2AppendLifecycleEventInput,
  ): Promise<ExperimentFoundationV2AppendLifecycleEventResult> {
    this.assertExactRef(input.asset);
    this.assertLifecycleEventType(input.event_type);
    this.assertNonEmpty(input.reason_code, 'reason_code');
    if (input.expected_projection_state_version !== null) {
      assertExperimentV2PositiveInt32(
        input.expected_projection_state_version,
        'expected_projection_state_version',
        (message) => invalidPayload('V2_TYPED_SNAPSHOT_INVALID', message),
      );
    }

    return this.runInTransaction(async (unitOfWork) => {
      await this.requireExactRevision(unitOfWork, input.asset);
      const current = await unitOfWork.findLifecycleProjection(input.asset);
      const expectedVersion = input.expected_projection_state_version;
      if ((current?.projection_state_version ?? null) !== expectedVersion) {
        throw concurrentAdvance(
          'ASSET_LIFECYCLE_PROJECTION_CAS_CONFLICT',
          'Asset lifecycle projection changed concurrently.',
        );
      }
      const transition = lifecycleTransition(current, input.asset.asset_type, input.event_type);
      const lifecycleSequence = incrementExperimentV2Int32Counter(
        current?.lifecycle_sequence ?? 0,
        'Asset lifecycle sequence',
        (message) => concurrentAdvance(
          'ASSET_LIFECYCLE_PROJECTION_CAS_CONFLICT',
          message,
        ),
      );
      const projectionStateVersion = incrementExperimentV2Int32Counter(
        current?.projection_state_version ?? 0,
        'Asset lifecycle projection',
        (message) => concurrentAdvance(
          'ASSET_LIFECYCLE_PROJECTION_CAS_CONFLICT',
          message,
        ),
      );
      const event: ExperimentFoundationAssetLifecycleEventV2 = {
        lifecycle_event_id: this.idGenerator('lifecycle_event'),
        asset: clone(input.asset),
        lifecycle_sequence: lifecycleSequence,
        event_type: input.event_type,
        reason_code: input.reason_code,
        note: input.note ?? null,
        occurred_at: this.now(),
      };
      const projection: ExperimentFoundationAssetLifecycleProjectionV2 = {
        asset: clone(input.asset),
        projection_state_version: projectionStateVersion,
        lifecycle_sequence: event.lifecycle_sequence,
        lifecycle_status: transition.lifecycleStatus,
        location_available: transition.locationAvailable,
        source_event_id: event.lifecycle_event_id,
        updated_at: event.occurred_at,
      };
      await unitOfWork.appendLifecycleEvent(event);
      const projected = await unitOfWork.compareAndSwapLifecycleProjection(
        input.asset,
        expectedVersion,
        projection,
      );
      if (!projected) {
        throw concurrentAdvance(
          'ASSET_LIFECYCLE_PROJECTION_CAS_CONFLICT',
          'Asset lifecycle projection changed concurrently.',
        );
      }
      return { event: clone(event), projection: clone(projection) };
    });
  }

  async createReadinessAttestation(
    input: ExperimentFoundationV2CreateReadinessInput,
  ): Promise<ExperimentFoundationV2ReadinessResult> {
    this.assertExactRef(input.target);

    return this.runInTransaction(async (unitOfWork) => {
      const targetRevision = await this.requireExactRevision(unitOfWork, input.target);
      const resolutionCache = dependencyResolutionCache(targetRevision);
      const dependencies = await this.resolveCompleteDependencyManifest(
        unitOfWork,
        targetRevision,
        resolutionCache,
      );
      const dependencyRefs = dependencies.map((dependency) => dependency.ref);
      const dependencyManifestHash = hashDependencyManifest(dependencyRefs);
      const evaluatorProfileHash = this.readinessEvaluatorProfileHash();
      const evaluation = await this.evaluateReadiness(
        unitOfWork,
        input.target,
        targetRevision,
        dependencies,
        evaluatorProfileHash,
        resolutionCache,
      );
      const qualificationSnapshot = {
        target_lifecycle_sequence: evaluation.targetLifecycleSequence,
        dependency_count: dependencies.length,
        all_dependencies_active: evaluation.allDependenciesActive,
        all_required_rules_supported: evaluation.allRequiredRulesSupported,
      };
      const status = evaluation.blockers.length === 0 ? 'passed' : 'blocked';
      const attestationHash = hashReadinessAttestation({
        target: input.target,
        status,
        evaluator_profile_version: this.readinessEvaluatorProfile.profile_version,
        evaluator_profile_hash: evaluatorProfileHash,
        dependency_manifest_hash: dependencyManifestHash,
        qualification_snapshot: qualificationSnapshot,
        blockers: evaluation.blockers,
      });
      const identity = {
        target: input.target,
        evaluator_profile_hash: evaluatorProfileHash,
        dependency_manifest_hash: dependencyManifestHash,
        attestation_hash: attestationHash,
      };
      const existing = await unitOfWork.findReadinessAttestationByIdentity(identity);
      if (existing) {
        return {
          attestation: existing,
          dependencies: await unitOfWork.listReadinessDependencies(
            existing.readiness_attestation_id,
          ),
          replayed: true,
        };
      }

      const attestation = {
        readiness_attestation_id: this.idGenerator('readiness_attestation'),
        target: clone(input.target),
        status,
        evaluator_profile_version: this.readinessEvaluatorProfile.profile_version,
        evaluator_profile_hash: evaluatorProfileHash,
        dependency_manifest_hash: dependencyManifestHash,
        qualification_snapshot: qualificationSnapshot,
        blockers: clone(evaluation.blockers),
        attestation_hash: attestationHash,
        created_at: this.now(),
      } satisfies ExperimentFoundationReadinessAttestationV2;
      const rows = dependencyRefs.map((dependency, index) => ({
        readiness_attestation_id: attestation.readiness_attestation_id,
        ordinal: index + 1,
        dependency: clone(dependency),
      } satisfies ExperimentFoundationReadinessDependencyV2));
      await unitOfWork.insertReadinessAttestation(attestation, rows);
      return { attestation: clone(attestation), dependencies: clone(rows), replayed: false };
    });
  }

  async revalidateReadiness(
    input: ExperimentFoundationV2RevalidateReadinessInput,
  ): Promise<ExperimentFoundationV2ReadinessResult> {
    this.assertExactRef(input.target);
    this.assertNonEmpty(input.readiness_attestation_id, 'readiness_attestation_id');
    if (!Array.isArray(input.expected_dependencies)) {
      throw invalidPayload(
        'EXACT_REVISION_REQUIRED',
        'A complete ordered exact dependency manifest is required.',
      );
    }
    input.expected_dependencies.forEach((dependency) => this.assertExactRef(dependency));

    return this.runInTransaction(async (unitOfWork) => {
      const attestation = await unitOfWork.findReadinessAttestation(
        input.readiness_attestation_id,
      );
      if (!attestation) {
        throw notFound('EXACT_REVISION_NOT_FOUND', 'Readiness attestation was not found.');
      }
      if (!exactRefsEqual(attestation.target, input.target)) {
        throw readinessDrift('target');
      }
      const targetRevision = await this.requireExactRevisionForReadiness(
        unitOfWork,
        input.target,
      );
      const resolutionCache = dependencyResolutionCache(targetRevision);
      const resolved = await this.resolveCompleteDependencyManifest(
        unitOfWork,
        targetRevision,
        resolutionCache,
      );
      const resolvedRefs = resolved.map((dependency) => dependency.ref);
      const storedRows = await unitOfWork.listReadinessDependencies(
        attestation.readiness_attestation_id,
      );
      const storedRefs = storedRows.map((row) => row.dependency);
      if (
        !exactRefArraysEqual(resolvedRefs, storedRefs)
        || !exactRefArraysEqual(resolvedRefs, input.expected_dependencies)
        || hashDependencyManifest(resolvedRefs) !== attestation.dependency_manifest_hash
      ) {
        throw readinessDrift('dependency_manifest');
      }
      if (attestation.evaluator_profile_hash !== this.readinessEvaluatorProfileHash()) {
        throw readinessDrift('evaluator_profile');
      }

      const evaluation = await this.evaluateReadiness(
        unitOfWork,
        input.target,
        targetRevision,
        resolved,
        attestation.evaluator_profile_hash,
        resolutionCache,
      );
      if (attestation.status !== 'passed' || evaluation.blockers.length > 0) {
        throw readinessDrift('lifecycle_or_qualification');
      }
      return {
        attestation: clone(attestation),
        dependencies: clone(storedRows),
        replayed: true,
      };
    });
  }

  private async assertDraftDependencies(
    unitOfWork: ExperimentFoundationV2UnitOfWork,
    assetType: ExperimentFoundationV2AssetType,
    draftContent: ExperimentFoundationV2DraftContent,
  ): Promise<void> {
    const dependencies = directDependencyRefs(assetType, draftContent);
    const seen = new Set<string>();
    for (const dependency of dependencies) {
      this.assertExactRef(dependency);
      const key = exactRefKey(dependency);
      if (seen.has(key)) {
        throw invalidPayload(
          'V2_TYPED_SNAPSHOT_INVALID',
          `Duplicate exact dependency: ${dependency.revision_id}`,
        );
      }
      seen.add(key);
      await this.requireExactRevision(unitOfWork, dependency);
    }

    if (assetType === 'Benchmark') {
      await this.assertBenchmarkBindings(
        unitOfWork,
        draftContent as ExperimentFoundationV2BenchmarkDraftContentV1,
      );
    } else if (assetType === 'EvaluationProtocol') {
      await this.assertProtocolBindings(
        unitOfWork,
        draftContent as ExperimentFoundationV2EvaluationProtocolDraftContentV2,
      );
    }
  }

  private async assertBenchmarkBindings(
    unitOfWork: ExperimentFoundationV2UnitOfWork,
    benchmark: ExperimentFoundationV2BenchmarkDraftContentV1,
  ): Promise<void> {
    const corpus = await this.requireExactRevision(unitOfWork, benchmark.corpus_dataset);
    const queryWorkload = await this.requireExactRevision(
      unitOfWork,
      benchmark.query_workload_dataset,
    );
    if (
      corpus.asset_type !== 'Dataset'
      || corpus.revision.dataset_revision.dataset_role !== 'corpus'
      || queryWorkload.asset_type !== 'Dataset'
      || queryWorkload.revision.dataset_revision.dataset_role !== 'query_workload'
    ) {
      throw invalidPayload(
        'V2_TYPED_SNAPSHOT_INVALID',
        'Benchmark corpus/query-workload bindings do not match the exact Dataset roles.',
      );
    }
  }

  private async assertProtocolBindings(
    unitOfWork: ExperimentFoundationV2UnitOfWork,
    protocol: ExperimentFoundationV2EvaluationProtocolDraftContentV2,
  ): Promise<void> {
    const metricDependencies = new Map(
      protocol.metric_dependencies.map((dependency) => [exactRefKey(dependency), dependency]),
    );
    const ruleIds = new Set<string>();
    for (const rule of protocol.required_rules) {
      if (ruleIds.has(rule.rule_id)) {
        throw invalidPayload('V2_TYPED_SNAPSHOT_INVALID', `Duplicate rule_id: ${rule.rule_id}`);
      }
      ruleIds.add(rule.rule_id);
      if (rule.rule_type !== 'metric_contract@v1') {
        continue;
      }
      if (!metricDependencies.has(exactRefKey(rule.metric_definition))) {
        throw invalidPayload(
          'V2_TYPED_SNAPSHOT_INVALID',
          `Metric rule ${rule.rule_id} is not bound to an exact metric dependency.`,
        );
      }
      const metricRevision = await this.requireExactRevision(
        unitOfWork,
        rule.metric_definition,
      );
      if (metricRevision.asset_type !== 'MetricDefinition') {
        throw invalidPayload('V2_TYPED_SNAPSHOT_INVALID', 'Metric rule resolved a non-metric asset.');
      }
      const content = metricRevision.revision.metric_definition_revision;
      if (
        content.metric_key !== rule.metric_key
        || content.value_type !== rule.value_type
        || content.unit !== rule.unit
      ) {
        throw invalidPayload(
          'V2_TYPED_SNAPSHOT_INVALID',
          `Metric rule ${rule.rule_id} drifts from its exact metric definition.`,
        );
      }
    }

    const scientificContract = protocol.scientific_contract;
    if (!scientificContract) return;

    assertUniqueCanonicalOrdinals(
      scientificContract.observation_slots,
      (slot) => slot.observation_key,
      'scientific observation slot',
    );
    assertUniqueCanonicalOrdinals(
      scientificContract.artifact_slots,
      (slot) => slot.artifact_key,
      'scientific artifact slot',
    );

    const observationSlots = new Map(
      scientificContract.observation_slots.map((slot) => [slot.observation_key, slot]),
    );
    const artifactRules = new Map<string, ExperimentFoundationV2ArtifactContractRuleV1>(
      protocol.required_rules
        .filter((rule): rule is ExperimentFoundationV2ArtifactContractRuleV1 => (
          rule.rule_type === 'artifact_contract@v1'
        ))
        .map((rule) => [rule.rule_id, rule]),
    );
    const artifactRuleBindingCounts = new Map<string, number>();
    for (const slot of scientificContract.artifact_slots) {
      if (!Object.hasOwn(slot, 'required_rule_id')) {
        throw invalidPayload(
          'V2_TYPED_SNAPSHOT_INVALID',
          `Scientific artifact slot ${slot.artifact_key} must explicitly declare required_rule_id or null.`,
        );
      }
      if (slot.required_rule_id === null) continue;
      const artifactRule = artifactRules.get(slot.required_rule_id ?? '');
      if (!artifactRule || artifactRule.artifact_kind !== slot.artifact_kind) {
        throw invalidPayload(
          'V2_TYPED_SNAPSHOT_INVALID',
          `Scientific artifact slot ${slot.artifact_key} has an invalid required-rule binding.`,
        );
      }
      artifactRuleBindingCounts.set(
        artifactRule.rule_id,
        (artifactRuleBindingCounts.get(artifactRule.rule_id) ?? 0) + 1,
      );
    }
    for (const artifactRule of artifactRules.values()) {
      if (artifactRuleBindingCounts.get(artifactRule.rule_id) !== artifactRule.required_cardinality) {
        throw invalidPayload(
          'V2_TYPED_SNAPSHOT_INVALID',
          `Artifact rule ${artifactRule.rule_id} must bind exactly its required cardinality of scientific artifact slots.`,
        );
      }
    }

    const comparisonRules = scientificContract.comparison_rules ?? [];
    if (comparisonRules.length === 0) {
      throw invalidPayload(
        'V2_TYPED_SNAPSHOT_INVALID',
        'A new scientific EvaluationProtocol must preregister at least one CMP-B1 rule.',
      );
    }
    assertUniqueCanonicalOrdinals(
      comparisonRules,
      (rule) => rule.comparison_key,
      'scientific comparison rule',
    );
    for (const rule of comparisonRules) {
      const observationSlot = observationSlots.get(rule.observation_key);
      if (
        rule.left_cell_ordinal === rule.right_cell_ordinal
        || !observationSlot
        || !Number.isFinite(rule.support_min)
        || !Number.isFinite(rule.contradiction_max)
        || rule.contradiction_max >= rule.support_min
        || (
          rule.uncertainty_policy.kind === 'confidence_interval_guard'
          && (
            !Number.isFinite(rule.uncertainty_policy.confidence_level)
            || rule.uncertainty_policy.confidence_level <= 0
            || rule.uncertainty_policy.confidence_level >= 1
            || rule.uncertainty_policy.method_key.trim().length === 0
            || observationSlot.uncertainty.kind !== 'confidence_interval'
            || observationSlot.uncertainty.level
              !== rule.uncertainty_policy.confidence_level
            || !observationSlot.uncertainty.allowed_method_keys.includes(
              rule.uncertainty_policy.method_key,
            )
          )
        )
      ) {
        throw invalidPayload(
          'V2_TYPED_SNAPSHOT_INVALID',
          `Scientific comparison rule ${rule.comparison_key} is not an admitted CMP-B1 rule.`,
        );
      }
    }
    const primaryComparisonKey = scientificContract.primary_comparison_key;
    const primaryMatches = comparisonRules.filter(
      (rule) => rule.comparison_key === primaryComparisonKey,
    );
    if (
      !primaryComparisonKey
      || primaryComparisonKey.trim().length === 0
      || primaryMatches.length !== 1
    ) {
      throw invalidPayload(
        'V2_TYPED_SNAPSHOT_INVALID',
        'Scientific protocol must designate exactly one preregistered primary comparison.',
      );
    }
    for (const [field, exitKey] of [
      ['decision_if_positive', scientificContract.decision_if_positive],
      ['decision_if_negative', scientificContract.decision_if_negative],
      ['decision_if_inconclusive', scientificContract.decision_if_inconclusive],
    ] as const) {
      if (!exitKey || exitKey.trim().length === 0) {
        throw invalidPayload(
          'V2_TYPED_SNAPSHOT_INVALID',
          `Scientific protocol must freeze a non-empty ${field} exit key.`,
        );
      }
    }
  }

  private async resolveCompleteDependencyManifest(
    unitOfWork: ExperimentFoundationV2UnitOfWork,
    target: ExperimentFoundationV2AssetRevisionRecord,
    cache: DependencyResolutionCache,
    visiting: Set<string> = new Set(),
  ): Promise<ResolvedDependency[]> {
    const targetKey = exactRefKey(exactRefFromRevision(target));
    if (visiting.has(targetKey)) {
      throw gateFailure(
        'READINESS_DEPENDENCY_DRIFT',
        'Asset dependency graph contains a cycle.',
      );
    }
    const cached = cache.manifests.get(targetKey);
    if (cached) return cached;

    const resolved = new Map<string, ResolvedDependency>();
    visiting.add(targetKey);
    try {
      const dependencies = directDependencyRefs(target.asset_type, revisionContent(target));
      for (const dependencyRef of dependencies) {
        const dependencyKey = exactRefKey(dependencyRef);
        if (visiting.has(dependencyKey)) {
          throw gateFailure(
            'READINESS_DEPENDENCY_DRIFT',
            'Asset dependency graph contains a cycle.',
          );
        }
        let dependencyRevision = cache.revisions.get(dependencyKey);
        if (!dependencyRevision) {
          dependencyRevision = await this.requireExactRevisionForReadiness(
            unitOfWork,
            dependencyRef,
          );
          cache.revisions.set(dependencyKey, dependencyRevision);
        }
        resolved.set(dependencyKey, {
          ref: clone(dependencyRef),
          revision: dependencyRevision,
        });
        const nestedDependencies = await this.resolveCompleteDependencyManifest(
          unitOfWork,
          dependencyRevision,
          cache,
          visiting,
        );
        for (const nested of nestedDependencies) {
          resolved.set(exactRefKey(nested.ref), nested);
        }
      }
    } finally {
      visiting.delete(targetKey);
    }
    const manifest = [...resolved.values()]
      .sort((left, right) => compareExactRefs(left.ref, right.ref));
    cache.manifests.set(targetKey, manifest);
    return manifest;
  }

  private async evaluateReadiness(
    unitOfWork: ExperimentFoundationV2UnitOfWork,
    target: ExperimentFoundationV2ExactAssetRevisionRef,
    targetRevision: ExperimentFoundationV2AssetRevisionRecord,
    dependencies: ResolvedDependency[],
    evaluatorProfileHash: string,
    resolutionCache: DependencyResolutionCache,
  ): Promise<ReadinessEvaluation> {
    const blockers: ExperimentFoundationReadinessBlockerV2[] = [];
    const targetProjection = await unitOfWork.findLifecycleProjection(target);
    addLifecycleBlockers(blockers, target, targetProjection, null);

    let allDependenciesActive = true;
    for (let index = 0; index < dependencies.length; index += 1) {
      const dependency = dependencies[index];
      const ordinal = index + 1;
      const projection = await unitOfWork.findLifecycleProjection(dependency.ref);
      const beforeCount = blockers.length;
      addLifecycleBlockers(blockers, dependency.ref, projection, ordinal);
      if (blockers.length !== beforeCount) {
        allDependenciesActive = false;
      }

      const nestedDependencies = await this.resolveCompleteDependencyManifest(
        unitOfWork,
        dependency.revision,
        resolutionCache,
      );
      const dependencyAttestation = await unitOfWork.findPassedReadinessAttestationForExactScope({
        target: dependency.ref,
        evaluator_profile_hash: evaluatorProfileHash,
        dependency_manifest_hash: hashDependencyManifest(
          nestedDependencies.map((nested) => nested.ref),
        ),
      });
      if (!dependencyAttestation) {
        blockers.push({
          reason_code: 'DEPENDENCY_READINESS_NOT_PASSED',
          dependency_ordinal: ordinal,
        });
      }
    }

    const allRequiredRulesSupported = requiredRulesSupported(
      targetRevision,
      this.readinessEvaluatorProfile.supported_rule_types,
    );
    if (!allRequiredRulesSupported) {
      blockers.push({ reason_code: 'UNSUPPORTED_RULE', dependency_ordinal: null });
    }

    blockers.sort(compareBlockers);
    return {
      blockers,
      targetLifecycleSequence: targetProjection?.lifecycle_sequence ?? 0,
      allDependenciesActive,
      allRequiredRulesSupported,
    };
  }

  private async requireAssetIdentity(
    unitOfWork: ExperimentFoundationV2UnitOfWork,
    assetType: ExperimentFoundationV2AssetType,
    logicalId: string,
  ): Promise<ExperimentFoundationV2AssetIdentityRecord> {
    const asset = await unitOfWork.findAssetIdentity(assetType, logicalId);
    if (!asset) {
      throw notFound('EXACT_REVISION_NOT_FOUND', 'Asset identity was not found.');
    }
    return asset;
  }

  private async requireExactRevision(
    unitOfWork: ExperimentFoundationV2UnitOfWork,
    ref: ExperimentFoundationV2ExactAssetRevisionRef,
  ): Promise<ExperimentFoundationV2AssetRevisionRecord> {
    const revision = await unitOfWork.findAssetRevisionById(ref.asset_type, ref.revision_id);
    if (!revision || !exactRefsEqual(exactRefFromRevision(revision), ref)) {
      throw notFound(
        'EXACT_REVISION_NOT_FOUND',
        'Exact asset revision id/hash/sequence was not found.',
      );
    }
    return revision;
  }

  private async requireExactRevisionForReadiness(
    unitOfWork: ExperimentFoundationV2UnitOfWork,
    ref: ExperimentFoundationV2ExactAssetRevisionRef,
  ): Promise<ExperimentFoundationV2AssetRevisionRecord> {
    try {
      return await this.requireExactRevision(unitOfWork, ref);
    } catch (error) {
      if (error instanceof AppError && error.errorCode === 'NOT_FOUND') {
        throw readinessDrift('exact_revision');
      }
      throw error;
    }
  }

  private readinessEvaluatorProfileHash(): string {
    return serverHashExperimentV2SemanticContent({
      record_kind: 'ExperimentFoundationReadinessEvaluatorProfileV2',
      schema_version: 'v1',
      hash_profile: 'ef-readiness-dependency-manifest-json@v1',
      content: toJsonValue({
        profile_version: this.readinessEvaluatorProfile.profile_version,
        supported_rule_types: [...this.readinessEvaluatorProfile.supported_rule_types].sort(),
      }),
    });
  }

  private assertDraftContent(
    assetType: ExperimentFoundationV2AssetType,
    content: unknown,
  ): asserts content is ExperimentFoundationV2DraftContent {
    const validator = this.draftValidators[assetType];
    if (!validator(content)) {
      throw invalidPayload(
        'V2_TYPED_SNAPSHOT_INVALID',
        'Asset draft does not match its closed typed schema.',
        { validation_errors: validationErrors(validator.errors) },
      );
    }
  }

  private assertExactRef(value: unknown): asserts value is ExperimentFoundationV2ExactAssetRevisionRef {
    if (!this.exactRefValidator(value)) {
      throw invalidPayload(
        'EXACT_REVISION_REQUIRED',
        'An exact asset type/logical id/revision id/sequence/content hash is required.',
        { validation_errors: validationErrors(this.exactRefValidator.errors) },
      );
    }
  }

  private assertAssetType(value: unknown): asserts value is ExperimentFoundationV2AssetType {
    if (!(EXPERIMENT_FOUNDATION_V2_ASSET_TYPES as readonly unknown[]).includes(value)) {
      throw invalidPayload('V2_TYPED_SNAPSHOT_INVALID', 'Unsupported asset_type.');
    }
  }

  private assertLifecycleEventType(value: unknown): asserts value is ExperimentFoundationV2LifecycleEventType {
    if (!(EXPERIMENT_FOUNDATION_V2_LIFECYCLE_EVENT_TYPES as readonly unknown[]).includes(value)) {
      throw invalidPayload('V2_TYPED_SNAPSHOT_INVALID', 'Unsupported lifecycle event_type.');
    }
  }

  private assertNonEmpty(value: unknown, field: string): asserts value is string {
    if (typeof value !== 'string' || value.length === 0) {
      throw invalidPayload('V2_TYPED_SNAPSHOT_INVALID', `${field} must be a non-empty string.`);
    }
  }

  private assertPositiveInteger(value: unknown, field: string): asserts value is number {
    assertExperimentV2PositiveInt32(
      value,
      field,
      (message) => invalidPayload('V2_TYPED_SNAPSHOT_INVALID', message),
    );
  }

  private assertNoCallerCanonicalHash(value: object): void {
    if (Object.hasOwn(value, 'content_hash') || Object.hasOwn(value, 'canonical_hash')) {
      throw conflict(
        'SERVER_CANONICAL_HASH_MISMATCH',
        'Callers cannot author a canonical asset content hash.',
      );
    }
  }

  private async runInTransaction<T>(
    operation: (unitOfWork: ExperimentFoundationV2UnitOfWork) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.repository.runInTransaction(operation);
    } catch (error) {
      if (!(error instanceof ExperimentFoundationV2RepositoryConstraintError)) {
        throw error;
      }
      switch (error.reasonCode) {
        case 'LIFECYCLE_PROJECTION_CAS_CONFLICT':
          throw concurrentAdvance(
            'ASSET_LIFECYCLE_PROJECTION_CAS_CONFLICT',
            error.message,
          );
        case 'FREEZE_IDEMPOTENCY_CONFLICT':
          throw conflict('ASSET_FREEZE_IDEMPOTENCY_CONFLICT', error.message);
        case 'LIFECYCLE_EVENT_CONFLICT':
          throw conflict('ASSET_LIFECYCLE_TRANSITION_INVALID', error.message);
        case 'READINESS_ATTESTATION_CONFLICT':
        case 'READINESS_DEPENDENCY_CONFLICT':
          throw gateFailure('READINESS_DEPENDENCY_DRIFT', error.message);
        case 'ASSET_IDENTITY_CONFLICT':
        case 'ASSET_REVISION_CONFLICT':
          throw conflict(error.reasonCode, error.message);
      }
    }
  }
}

function createAssetIdentityRecord(
  input: ExperimentFoundationV2CreateAssetDraftInput,
  now: string,
): ExperimentFoundationV2AssetIdentityRecord {
  const base = {
    logical_id: input.logical_id,
    draft_state_version: 1,
    current_revision_id: null,
    created_at: now,
    updated_at: now,
  };
  switch (input.asset_type) {
    case 'Dataset':
      return {
        asset_type: 'Dataset',
        asset: {
          ...base,
          dataset_key: input.draft_content.dataset_key,
          dataset_draft: clone(input.draft_content),
        },
      };
    case 'DataPolicy':
      return {
        asset_type: 'DataPolicy',
        asset: {
          ...base,
          policy_key: input.draft_content.policy_key,
          data_policy_draft: clone(input.draft_content),
        },
      };
    case 'MetricDefinition':
      return {
        asset_type: 'MetricDefinition',
        asset: {
          ...base,
          metric_key: input.draft_content.metric_key,
          metric_definition_draft: clone(input.draft_content),
        },
      };
    case 'Benchmark':
      return {
        asset_type: 'Benchmark',
        asset: {
          ...base,
          benchmark_key: input.draft_content.benchmark_key,
          benchmark_draft: clone(input.draft_content),
        },
      };
    case 'EvaluationProtocol':
      return {
        asset_type: 'EvaluationProtocol',
        asset: {
          ...base,
          protocol_key: input.draft_content.protocol_key,
          evaluation_protocol_draft: clone(input.draft_content),
        },
      };
  }
}

function assetIdentityFamilyKey(record: ExperimentFoundationV2AssetIdentityRecord): string {
  switch (record.asset_type) {
    case 'Dataset': return record.asset.dataset_key;
    case 'DataPolicy': return record.asset.policy_key;
    case 'MetricDefinition': return record.asset.metric_key;
    case 'Benchmark': return record.asset.benchmark_key;
    case 'EvaluationProtocol': return record.asset.protocol_key;
  }
}

function draftContentFamilyKey(input: ExperimentFoundationV2CreateAssetDraftInput): string {
  switch (input.asset_type) {
    case 'Dataset': return input.draft_content.dataset_key;
    case 'DataPolicy': return input.draft_content.policy_key;
    case 'MetricDefinition': return input.draft_content.metric_key;
    case 'Benchmark': return input.draft_content.benchmark_key;
    case 'EvaluationProtocol': return input.draft_content.protocol_key;
  }
}

export function assetDraftContent(
  record: ExperimentFoundationV2AssetIdentityRecord,
): ExperimentFoundationV2DraftContent | null {
  switch (record.asset_type) {
    case 'Dataset': return record.asset.dataset_draft;
    case 'DataPolicy': return record.asset.data_policy_draft;
    case 'MetricDefinition': return record.asset.metric_definition_draft;
    case 'Benchmark': return record.asset.benchmark_draft;
    case 'EvaluationProtocol': return record.asset.evaluation_protocol_draft;
  }
}

function updateAssetIdentityDraft(
  current: ExperimentFoundationV2AssetIdentityRecord,
  input: ExperimentFoundationV2UpdateAssetDraftInput,
  now: string,
): ExperimentFoundationV2AssetIdentityRecord {
  if (current.asset_type !== input.asset_type) {
    throw invalidPayload('V2_TYPED_SNAPSHOT_INVALID', 'Asset type does not match its identity.');
  }
  const nextDraftStateVersion = incrementExperimentV2Int32Counter(
    current.asset.draft_state_version,
    'Asset draft state version',
    (message) => conflict(
      'ASSET_DRAFT_CAS_CONFLICT',
      message,
    ),
  );
  switch (input.asset_type) {
    case 'Dataset': {
      if (current.asset_type !== 'Dataset') throw assetTypeMismatch();
      return {
        asset_type: 'Dataset',
        asset: {
          ...current.asset,
          draft_state_version: nextDraftStateVersion,
          dataset_draft: clone(input.draft_content),
          updated_at: now,
        },
      };
    }
    case 'DataPolicy': {
      if (current.asset_type !== 'DataPolicy') throw assetTypeMismatch();
      return {
        asset_type: 'DataPolicy',
        asset: {
          ...current.asset,
          draft_state_version: nextDraftStateVersion,
          data_policy_draft: clone(input.draft_content),
          updated_at: now,
        },
      };
    }
    case 'MetricDefinition': {
      if (current.asset_type !== 'MetricDefinition') throw assetTypeMismatch();
      return {
        asset_type: 'MetricDefinition',
        asset: {
          ...current.asset,
          draft_state_version: nextDraftStateVersion,
          metric_definition_draft: clone(input.draft_content),
          updated_at: now,
        },
      };
    }
    case 'Benchmark': {
      if (current.asset_type !== 'Benchmark') throw assetTypeMismatch();
      return {
        asset_type: 'Benchmark',
        asset: {
          ...current.asset,
          draft_state_version: nextDraftStateVersion,
          benchmark_draft: clone(input.draft_content),
          updated_at: now,
        },
      };
    }
    case 'EvaluationProtocol': {
      if (current.asset_type !== 'EvaluationProtocol') throw assetTypeMismatch();
      return {
        asset_type: 'EvaluationProtocol',
        asset: {
          ...current.asset,
          draft_state_version: nextDraftStateVersion,
          evaluation_protocol_draft: clone(input.draft_content),
          updated_at: now,
        },
      };
    }
  }
}

export function advanceAssetCurrentRevision(
  current: ExperimentFoundationV2AssetIdentityRecord,
  revisionId: string,
  now: string,
): ExperimentFoundationV2AssetIdentityRecord {
  const nextDraftStateVersion = incrementExperimentV2Int32Counter(
    current.asset.draft_state_version,
    'Asset draft state version',
    (message) => conflict(
      'ASSET_DRAFT_CAS_CONFLICT',
      message,
    ),
  );
  switch (current.asset_type) {
    case 'Dataset': return {
      asset_type: 'Dataset',
      asset: { ...current.asset, draft_state_version: nextDraftStateVersion, current_revision_id: revisionId, updated_at: now },
    };
    case 'DataPolicy': return {
      asset_type: 'DataPolicy',
      asset: { ...current.asset, draft_state_version: nextDraftStateVersion, current_revision_id: revisionId, updated_at: now },
    };
    case 'MetricDefinition': return {
      asset_type: 'MetricDefinition',
      asset: { ...current.asset, draft_state_version: nextDraftStateVersion, current_revision_id: revisionId, updated_at: now },
    };
    case 'Benchmark': return {
      asset_type: 'Benchmark',
      asset: { ...current.asset, draft_state_version: nextDraftStateVersion, current_revision_id: revisionId, updated_at: now },
    };
    case 'EvaluationProtocol': return {
      asset_type: 'EvaluationProtocol',
      asset: { ...current.asset, draft_state_version: nextDraftStateVersion, current_revision_id: revisionId, updated_at: now },
    };
  }
}

export function createAssetRevisionRecord(
  assetType: ExperimentFoundationV2AssetType,
  logicalId: string,
  content: ExperimentFoundationV2DraftContent,
  revisionId: string,
  revisionSequence: number,
  contentHash: string,
  now: string,
): ExperimentFoundationV2AssetRevisionRecord {
  const base = {
    logical_id: logicalId,
    revision_id: revisionId,
    revision_sequence: revisionSequence,
    schema_version: content.schema_version,
    hash_profile: 'ef-asset-semantic-json@v1' as const,
    content_hash: contentHash,
    created_at: now,
  };
  switch (assetType) {
    case 'Dataset':
      return {
        asset_type: 'Dataset',
        revision: {
          ...base,
          dataset_revision: clone(content as ExperimentFoundationV2DatasetDraftContentV1),
        } satisfies ExperimentFoundationDatasetRevisionV2,
      };
    case 'DataPolicy':
      return {
        asset_type: 'DataPolicy',
        revision: {
          ...base,
          data_policy_revision: clone(content as ExperimentFoundationV2DataPolicyDraftContentV1),
        } satisfies ExperimentFoundationDataPolicyRevisionV2,
      };
    case 'MetricDefinition':
      return {
        asset_type: 'MetricDefinition',
        revision: {
          ...base,
          metric_definition_revision: clone(content as ExperimentFoundationV2MetricDefinitionDraftContentV1),
        } satisfies ExperimentFoundationMetricDefinitionRevisionV2,
      };
    case 'Benchmark':
      return {
        asset_type: 'Benchmark',
        revision: {
          ...base,
          benchmark_revision: clone(content as ExperimentFoundationV2BenchmarkDraftContentV1),
        } satisfies ExperimentFoundationBenchmarkRevisionV2,
      };
    case 'EvaluationProtocol':
      return {
        asset_type: 'EvaluationProtocol',
        revision: {
          ...base,
          evaluation_protocol_revision: clone(content as ExperimentFoundationV2EvaluationProtocolDraftContentV2),
        } satisfies ExperimentFoundationEvaluationProtocolRevisionV2,
      };
  }
}

function revisionContent(
  record: ExperimentFoundationV2AssetRevisionRecord,
): ExperimentFoundationV2DraftContent {
  switch (record.asset_type) {
    case 'Dataset': return record.revision.dataset_revision;
    case 'DataPolicy': return record.revision.data_policy_revision;
    case 'MetricDefinition': return record.revision.metric_definition_revision;
    case 'Benchmark': return record.revision.benchmark_revision;
    case 'EvaluationProtocol': return record.revision.evaluation_protocol_revision;
  }
}

function directDependencyRefs(
  assetType: ExperimentFoundationV2AssetType,
  content: ExperimentFoundationV2DraftContent,
): ExperimentFoundationV2ExactAssetRevisionRef[] {
  switch (assetType) {
    case 'DataPolicy':
    case 'MetricDefinition':
      return [];
    case 'Dataset':
      return [clone((content as ExperimentFoundationV2DatasetDraftContentV1).data_policy)];
    case 'Benchmark': {
      const benchmark = content as ExperimentFoundationV2BenchmarkDraftContentV1;
      return [clone(benchmark.corpus_dataset), clone(benchmark.query_workload_dataset)];
    }
    case 'EvaluationProtocol': {
      const protocol = content as ExperimentFoundationV2EvaluationProtocolDraftContentV2;
      return [clone(protocol.benchmark_dependency), ...clone(protocol.metric_dependencies)];
    }
  }
}

export function hashAssetContent(
  assetType: ExperimentFoundationV2AssetType,
  content: ExperimentFoundationV2DraftContent,
): string {
  switch (assetType) {
    case 'Dataset':
      return serverHashExperimentFoundationV2AssetRevision({
        asset_type: assetType,
        content: content as ExperimentFoundationV2DatasetDraftContentV1,
      });
    case 'DataPolicy':
      return serverHashExperimentFoundationV2AssetRevision({
        asset_type: assetType,
        content: content as ExperimentFoundationV2DataPolicyDraftContentV1,
      });
    case 'MetricDefinition':
      return serverHashExperimentFoundationV2AssetRevision({
        asset_type: assetType,
        content: content as ExperimentFoundationV2MetricDefinitionDraftContentV1,
      });
    case 'Benchmark':
      return serverHashExperimentFoundationV2AssetRevision({
        asset_type: assetType,
        content: content as ExperimentFoundationV2BenchmarkDraftContentV1,
      });
    case 'EvaluationProtocol':
      return serverHashExperimentFoundationV2AssetRevision({
        asset_type: assetType,
        content: content as ExperimentFoundationV2EvaluationProtocolDraftContentV2,
      });
  }
}

function hashDependencyManifest(refs: ExperimentFoundationV2ExactAssetRevisionRef[]): string {
  return serverHashExperimentFoundationV2ReadinessDependencyManifest(refs);
}

function hashReadinessAttestation(
  value: ExperimentFoundationV2ReadinessAttestationHashInput,
): string {
  return serverHashExperimentFoundationV2ReadinessAttestation(value);
}

export function exactRefFromRevision(
  record: ExperimentFoundationV2AssetRevisionRecord,
): ExperimentFoundationV2ExactAssetRevisionRef {
  return {
    asset_type: record.asset_type,
    logical_id: record.revision.logical_id,
    revision_id: record.revision.revision_id,
    revision_sequence: record.revision.revision_sequence,
    content_hash: record.revision.content_hash,
  };
}

function dependencyResolutionCache(
  target: ExperimentFoundationV2AssetRevisionRecord,
): DependencyResolutionCache {
  return {
    manifests: new Map(),
    revisions: new Map([[exactRefKey(exactRefFromRevision(target)), target]]),
  };
}

function freezeResult(
  revision: ExperimentFoundationV2AssetRevisionRecord,
  replayed: boolean,
): ExperimentFoundationV2FreezeAssetDraftResult {
  return { revision: clone(revision), exact_ref: exactRefFromRevision(revision), replayed };
}

function lifecycleTransition(
  current: ExperimentFoundationAssetLifecycleProjectionV2 | null,
  assetType: ExperimentFoundationV2AssetType,
  eventType: ExperimentFoundationV2LifecycleEventType,
): { lifecycleStatus: ExperimentFoundationAssetLifecycleProjectionV2['lifecycle_status']; locationAvailable: boolean } {
  if (!current && eventType !== 'registered') {
    throw gateFailure(
      'ASSET_LIFECYCLE_TRANSITION_INVALID',
      'The first lifecycle event must be registered.',
    );
  }
  if (current?.lifecycle_status === 'revoked') {
    throw gateFailure('ASSET_LIFECYCLE_TRANSITION_INVALID', 'A revoked revision is terminal.');
  }
  if ((eventType === 'location_available' || eventType === 'location_unavailable') && assetType !== 'Dataset') {
    throw gateFailure(
      'ASSET_LIFECYCLE_TRANSITION_INVALID',
      'Location lifecycle events apply only to Dataset revisions.',
    );
  }

  switch (eventType) {
    case 'registered':
      if (current) {
        throw gateFailure('ASSET_LIFECYCLE_TRANSITION_INVALID', 'Revision is already registered.');
      }
      return { lifecycleStatus: 'draft', locationAvailable: false };
    case 'activated':
      return { lifecycleStatus: 'active', locationAvailable: current?.location_available ?? false };
    case 'deprecated':
      return { lifecycleStatus: 'deprecated', locationAvailable: current?.location_available ?? false };
    case 'revoked':
      return { lifecycleStatus: 'revoked', locationAvailable: current?.location_available ?? false };
    case 'location_available':
      return { lifecycleStatus: current?.lifecycle_status ?? 'draft', locationAvailable: true };
    case 'location_unavailable':
      return { lifecycleStatus: current?.lifecycle_status ?? 'draft', locationAvailable: false };
  }
}

function addLifecycleBlockers(
  blockers: ExperimentFoundationReadinessBlockerV2[],
  ref: ExperimentFoundationV2ExactAssetRevisionRef,
  projection: ExperimentFoundationAssetLifecycleProjectionV2 | null,
  dependencyOrdinal: number | null,
): void {
  if (!projection || projection.lifecycle_status !== 'active') {
    blockers.push({
      reason_code: projection?.lifecycle_status === 'revoked'
        ? 'ASSET_REVISION_REVOKED'
        : 'ASSET_LIFECYCLE_NOT_ACTIVE',
      dependency_ordinal: dependencyOrdinal,
    });
  }
  if (ref.asset_type === 'Dataset' && projection?.location_available !== true) {
    blockers.push({
      reason_code: 'DATASET_LOCATION_UNAVAILABLE',
      dependency_ordinal: dependencyOrdinal,
    });
  }
}

function requiredRulesSupported(
  target: ExperimentFoundationV2AssetRevisionRecord,
  supportedRuleTypes: readonly ExperimentFoundationV2RequiredRuleType[],
): boolean {
  if (target.asset_type !== 'EvaluationProtocol') {
    return true;
  }
  const supported = new Set(supportedRuleTypes);
  return target.revision.evaluation_protocol_revision.required_rules.every(
    (rule) => supported.has(rule.rule_type),
  );
}

function compareExactRefs(
  left: ExperimentFoundationV2ExactAssetRevisionRef,
  right: ExperimentFoundationV2ExactAssetRevisionRef,
): number {
  return DEPENDENCY_ASSET_ORDER[left.asset_type] - DEPENDENCY_ASSET_ORDER[right.asset_type]
    || left.logical_id.localeCompare(right.logical_id)
    || left.revision_sequence - right.revision_sequence
    || left.revision_id.localeCompare(right.revision_id)
    || left.content_hash.localeCompare(right.content_hash);
}

function compareBlockers(
  left: ExperimentFoundationReadinessBlockerV2,
  right: ExperimentFoundationReadinessBlockerV2,
): number {
  return (left.dependency_ordinal ?? 0) - (right.dependency_ordinal ?? 0)
    || left.reason_code.localeCompare(right.reason_code);
}

function exactRefsEqual(
  left: ExperimentFoundationV2ExactAssetRevisionRef,
  right: ExperimentFoundationV2ExactAssetRevisionRef,
): boolean {
  return exactRefKey(left) === exactRefKey(right);
}

function exactRefArraysEqual(
  left: ExperimentFoundationV2ExactAssetRevisionRef[],
  right: ExperimentFoundationV2ExactAssetRevisionRef[],
): boolean {
  return left.length === right.length
    && left.every((ref, index) => exactRefsEqual(ref, right[index]));
}

function exactRefKey(ref: ExperimentFoundationV2ExactAssetRevisionRef): string {
  return [
    ref.asset_type,
    ref.logical_id,
    ref.revision_id,
    String(ref.revision_sequence),
    ref.content_hash,
  ].join(':');
}

function assertUniqueCanonicalOrdinals<T extends { ordinal: number }>(
  values: readonly T[],
  keyOf: (value: T) => string,
  label: string,
): void {
  const keys = new Set<string>();
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]!;
    const key = keyOf(value);
    if (key.trim().length === 0 || keys.has(key) || value.ordinal !== index + 1) {
      throw invalidPayload(
        'V2_TYPED_SNAPSHOT_INVALID',
        `Each ${label} must have a unique key and canonical contiguous ordinal.`,
      );
    }
    keys.add(key);
  }
}

function validationErrors(errors: ErrorObject[] | null | undefined): Array<{
  path: string;
  keyword: string;
}> {
  return (errors ?? []).map((error) => ({ path: error.instancePath, keyword: error.keyword }));
}

function toJsonValue(value: unknown): ExperimentV2JsonValue {
  return structuredClone(value) as ExperimentV2JsonValue;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function invalidPayload(
  reasonCode: string,
  message: string,
  details: Record<string, unknown> = {},
): AppError {
  return new AppError(400, 'INVALID_PAYLOAD', message, { reason_code: reasonCode, ...details });
}

function assetTypeMismatch(): AppError {
  return invalidPayload('V2_TYPED_SNAPSHOT_INVALID', 'Asset type does not match its identity.');
}

function notFound(reasonCode: string, message: string): AppError {
  return new AppError(404, 'NOT_FOUND', message, { reason_code: reasonCode });
}

function conflict(reasonCode: string, message: string): AppError {
  return new AppError(409, 'VERSION_CONFLICT', message, { reason_code: reasonCode });
}

function gateFailure(reasonCode: string, message: string): AppError {
  return new AppError(422, 'GATE_CONSTRAINT_FAILED', message, { reason_code: reasonCode });
}

function concurrentAdvance(reasonCode: string, message: string): AppError {
  return new AppError(409, 'CONCURRENT_ADVANCE', message, { reason_code: reasonCode });
}

function draftCasConflict(actualStateVersion: number): AppError {
  return new AppError(409, 'VERSION_CONFLICT', 'Asset draft state version is stale.', {
    reason_code: 'ASSET_DRAFT_CAS_CONFLICT',
    actual_state_version: actualStateVersion,
  });
}

function readinessDrift(driftKind: string): AppError {
  return new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Exact readiness scope has drifted.', {
    reason_code: 'READINESS_DEPENDENCY_DRIFT',
    drift_kind: driftKind,
  });
}
