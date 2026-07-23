import { randomUUID } from 'node:crypto';

import { Ajv, type ValidateFunction } from 'ajv';

import {
  EXPERIMENT_FOUNDATION_EXECUTION_BUNDLE_HASH_PROFILE_V2,
  EXPERIMENT_FOUNDATION_REAL_PROVIDER_CONTROL_HASH_PROFILE_V2,
  experimentFoundationExecutionBundleContentV1Schema,
  type ExperimentFoundationExecutionBundleContentV1,
  type ExperimentFoundationExecutionBundleLifecycleEventV2,
  type ExperimentFoundationExecutionBundleLifecycleProjectionV2,
  type ExperimentFoundationExecutionBundleReadinessV2,
  type ExperimentFoundationExecutionBundleRevisionV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';
import { serverHashExperimentV2SemanticContent } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  ExperimentFoundationExecutionBundleV2ConstraintError,
  type ExperimentFoundationExecutionBundleDraftBundleV2,
  type ExperimentFoundationExecutionBundleFrozenBundleV2,
  type ExperimentFoundationExecutionBundleV2Repository,
} from '../repositories/experiment-foundation-execution-bundle-v2.repository.js';

interface ExperimentFoundationExecutionBundleV2ServiceOptions {
  repository: ExperimentFoundationExecutionBundleV2Repository;
  now?: () => string;
  idGenerator?: (kind: 'identity' | 'revision' | 'event' | 'readiness') => string;
}

const ajv = new Ajv({ allErrors: true, strict: false, removeAdditional: false });
const bundleContentValidator: ValidateFunction<ExperimentFoundationExecutionBundleContentV1> =
  ajv.compile<ExperimentFoundationExecutionBundleContentV1>(
    experimentFoundationExecutionBundleContentV1Schema,
  );

export class ExperimentFoundationExecutionBundleV2Service {
  private readonly repository: ExperimentFoundationExecutionBundleV2Repository;
  private readonly now: () => string;
  private readonly idGenerator: NonNullable<
    ExperimentFoundationExecutionBundleV2ServiceOptions['idGenerator']
  >;

  constructor(options: ExperimentFoundationExecutionBundleV2ServiceOptions) {
    this.repository = options.repository;
    this.now = options.now ?? (() => new Date().toISOString());
    this.idGenerator = options.idGenerator
      ?? ((kind) => `ef_execution_bundle_${kind}_${randomUUID()}`);
  }

  async putDraft(input: {
    bundle_key: string;
    display_name: string;
    expected_draft_version: number | null;
    draft_content: ExperimentFoundationExecutionBundleContentV1;
  }): Promise<ExperimentFoundationExecutionBundleDraftBundleV2> {
    assertBundleIdentity(input.bundle_key, input.display_name);
    assertBundleContent(input.draft_content);
    const existing = await this.repository.findDraftByBundleKey(input.bundle_key);
    const now = this.now();
    const executionBundleId = existing?.identity.execution_bundle_id
      ?? this.idGenerator('identity');
    const nextDraftVersion = existing
      ? (input.expected_draft_version ?? existing.draft.draft_version) + 1
      : 1;
    return this.repository.putDraft({
      expected_draft_version: input.expected_draft_version,
      identity: {
        execution_bundle_id: executionBundleId,
        bundle_key: input.bundle_key,
        display_name: input.display_name,
        state_version: existing?.identity.state_version ?? 0,
        created_at: existing?.identity.created_at ?? now,
        updated_at: now,
      },
      draft: {
        execution_bundle_id: executionBundleId,
        draft_version: input.expected_draft_version === null && existing
          ? existing.draft.draft_version
          : nextDraftVersion,
        draft_content: structuredClone(input.draft_content),
        updated_at: now,
      },
    });
  }

  async freezeActiveRevision(input: {
    bundle_key: string;
    expected_draft_version: number;
  }): Promise<ExperimentFoundationExecutionBundleFrozenBundleV2> {
    const draftBundle = await this.repository.findDraftByBundleKey(input.bundle_key);
    if (!draftBundle) {
      throw new ExperimentFoundationExecutionBundleV2ConstraintError(
        'EXECUTION_BUNDLE_SCOPE_DRIFT',
        'ExecutionBundle draft was not found.',
      );
    }
    if (draftBundle.draft.draft_version !== input.expected_draft_version) {
      throw new ExperimentFoundationExecutionBundleV2ConstraintError(
        'EXECUTION_BUNDLE_CONFLICT',
        'ExecutionBundle freeze expected-version CAS failed.',
      );
    }
    assertBundleContent(draftBundle.draft.draft_content);
    const now = this.now();
    const contentHash = hashBundle('ExecutionBundleRevision', draftBundle.draft.draft_content);
    const revisionId = this.idGenerator('revision');
    const revision: ExperimentFoundationExecutionBundleRevisionV2 = {
      execution_bundle_revision_id: revisionId,
      execution_bundle_id: draftBundle.identity.execution_bundle_id,
      revision_sequence: 1,
      schema_version: 'v1',
      hash_profile: EXPERIMENT_FOUNDATION_EXECUTION_BUNDLE_HASH_PROFILE_V2,
      content_hash: contentHash,
      revision_content: structuredClone(draftBundle.draft.draft_content),
      created_at: now,
    };
    const eventContent = {
      execution_bundle_revision_id: revisionId,
      event_sequence: 1,
      status: 'active' as const,
      reason_code: 'execution_bundle_frozen',
      occurred_at: now,
    };
    const event: ExperimentFoundationExecutionBundleLifecycleEventV2 = {
      lifecycle_event_id: this.idGenerator('event'),
      ...eventContent,
      event_hash: hashControl('ExecutionBundleLifecycleEvent', eventContent),
    };
    const projection: ExperimentFoundationExecutionBundleLifecycleProjectionV2 = {
      execution_bundle_revision_id: revisionId,
      current_status: 'active',
      latest_event_sequence: 1,
      latest_event_hash: event.event_hash,
      state_version: 0,
      updated_at: now,
    };
    const readinessContent = {
      execution_bundle_revision_id: revisionId,
      execution_bundle_revision_hash: contentHash,
      lifecycle_event_hash: event.event_hash,
      outcome: 'passed' as const,
      reason_codes: [] as string[],
      evaluated_at: now,
    };
    const readiness: ExperimentFoundationExecutionBundleReadinessV2 = {
      execution_bundle_readiness_id: this.idGenerator('readiness'),
      ...readinessContent,
      readiness_hash: hashControl('ExecutionBundleReadiness', readinessContent),
    };
    return this.repository.freezeActiveRevision({
      execution_bundle_id: draftBundle.identity.execution_bundle_id,
      expected_identity_state_version: draftBundle.identity.state_version,
      expected_draft_version: input.expected_draft_version,
      revision,
      lifecycle_event: event,
      lifecycle_projection: projection,
      readiness,
    });
  }

  async resolveActiveReadyExact(input: {
    execution_bundle_revision_id: string;
    content_hash: string;
  }): Promise<ExperimentFoundationExecutionBundleFrozenBundleV2> {
    const bundle = await this.repository.findActiveReadyExact(
      input.execution_bundle_revision_id,
      input.content_hash,
    );
    if (!bundle) {
      throw new ExperimentFoundationExecutionBundleV2ConstraintError(
        'EXECUTION_BUNDLE_NOT_READY',
        'No active passed readiness exists for the exact ExecutionBundle revision/hash.',
      );
    }
    assertBundleContent(bundle.revision.revision_content);
    if (hashBundle('ExecutionBundleRevision', bundle.revision.revision_content) !== input.content_hash) {
      throw new ExperimentFoundationExecutionBundleV2ConstraintError(
        'EXECUTION_BUNDLE_SCOPE_DRIFT',
        'ExecutionBundle stored content does not match its server hash.',
      );
    }
    return bundle;
  }
}

function assertBundleIdentity(bundleKey: string, displayName: string): void {
  if (bundleKey.trim().length === 0 || displayName.trim().length === 0) {
    throw new ExperimentFoundationExecutionBundleV2ConstraintError(
      'EXECUTION_BUNDLE_INVALID',
      'ExecutionBundle key and display name must be non-empty.',
    );
  }
}

function assertBundleContent(value: unknown): asserts value is ExperimentFoundationExecutionBundleContentV1 {
  if (!bundleContentValidator(value)) {
    throw new ExperimentFoundationExecutionBundleV2ConstraintError(
      'EXECUTION_BUNDLE_INVALID',
      'ExecutionBundle content failed its exact v1 schema.',
    );
  }
  const ordinals = value.dataset_mirrors.map((mirror) => mirror.ordinal);
  if (
    ordinals.some((ordinal, index) => ordinal !== index + 1)
    || new Set(value.dataset_mirrors.map((mirror) => mirror.dataset_revision.revision_id)).size
      !== value.dataset_mirrors.length
    || new Set(value.dataset_mirrors.map((mirror) => mirror.object_ref)).size
      !== value.dataset_mirrors.length
  ) {
    throw new ExperimentFoundationExecutionBundleV2ConstraintError(
      'EXECUTION_BUNDLE_INVALID',
      'ExecutionBundle dataset mirrors must be contiguous, ordered, and exact-unique.',
    );
  }
}

function hashBundle(recordKind: string, content: unknown): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: recordKind,
    schema_version: 'v1',
    hash_profile: EXPERIMENT_FOUNDATION_EXECUTION_BUNDLE_HASH_PROFILE_V2,
    content,
  });
}

function hashControl(recordKind: string, content: unknown): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: recordKind,
    schema_version: 'v1',
    hash_profile: EXPERIMENT_FOUNDATION_REAL_PROVIDER_CONTROL_HASH_PROFILE_V2,
    content,
  });
}
