-- T-132 M7-I1. This migration is additive except for provider-neutral naming
-- and exact CHECK generalization. It preserves every Pack B row in place and
-- does not backfill, reinterpret, or trust-upgrade simulation lineage.

DROP INDEX "ef_provider_payload_cell_profile_unique";

ALTER TABLE "ExperimentFoundationProviderPayloadV2"
  RENAME COLUMN "simulationProfileVersion" TO "providerProfileVersion";

ALTER TABLE "ExperimentFoundationRunRecipeV2"
  ADD COLUMN "executionBundleRevisionHash" TEXT,
  ADD COLUMN "executionBundleRevisionId" TEXT;

ALTER TABLE "ExperimentFoundationTrainingTaskSpecV2"
  ADD COLUMN "executionBundleRevisionHash" TEXT,
  ADD COLUMN "executionBundleRevisionId" TEXT;

CREATE TABLE "ExperimentFoundationExecutionBundleIdentityV2" (
  "id" TEXT NOT NULL,
  "bundleKey" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "stateVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(6) NOT NULL,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ExperimentFoundationExecutionBundleIdentityV2_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExperimentFoundationExecutionBundleDraftV2" (
  "executionBundleId" TEXT NOT NULL,
  "draftVersion" INTEGER NOT NULL DEFAULT 1,
  "schemaVersion" TEXT NOT NULL,
  "draftSnapshotJson" JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ExperimentFoundationExecutionBundleDraftV2_pkey" PRIMARY KEY ("executionBundleId")
);

CREATE TABLE "ExperimentFoundationExecutionBundleRevisionV2" (
  "id" TEXT NOT NULL,
  "executionBundleId" TEXT NOT NULL,
  "revisionSequence" INTEGER NOT NULL,
  "schemaVersion" TEXT NOT NULL,
  "hashProfile" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "revisionJson" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ExperimentFoundationExecutionBundleRevisionV2_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExperimentFoundationExecutionBundleLifecycleEventV2" (
  "id" TEXT NOT NULL,
  "executionBundleRevisionId" TEXT NOT NULL,
  "eventSequence" INTEGER NOT NULL,
  "lifecycleStatus" TEXT NOT NULL,
  "reasonCode" TEXT NOT NULL,
  "eventHash" TEXT NOT NULL,
  "occurredAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ExperimentFoundationExecutionBundleLifecycleEventV2_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExperimentFoundationExecutionBundleLifecycleProjectionV2" (
  "executionBundleRevisionId" TEXT NOT NULL,
  "lifecycleStatus" TEXT NOT NULL,
  "latestEventSequence" INTEGER NOT NULL,
  "latestEventHash" TEXT NOT NULL,
  "stateVersion" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ExperimentFoundationExecutionBundleLifecycleProjectionV2_pkey" PRIMARY KEY ("executionBundleRevisionId")
);

CREATE TABLE "ExperimentFoundationExecutionBundleReadinessV2" (
  "id" TEXT NOT NULL,
  "executionBundleRevisionId" TEXT NOT NULL,
  "executionBundleRevisionHash" TEXT NOT NULL,
  "lifecycleEventHash" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "reasonCodesJson" JSONB NOT NULL DEFAULT '[]',
  "readinessHash" TEXT NOT NULL,
  "evaluatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ExperimentFoundationExecutionBundleReadinessV2_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ef_execution_bundle_key_unique"
  ON "ExperimentFoundationExecutionBundleIdentityV2"("bundleKey");
CREATE INDEX "ef_execution_bundle_revision_hash_idx"
  ON "ExperimentFoundationExecutionBundleRevisionV2"("contentHash");
CREATE UNIQUE INDEX "ef_execution_bundle_revision_sequence_unique"
  ON "ExperimentFoundationExecutionBundleRevisionV2"("executionBundleId", "revisionSequence");
CREATE UNIQUE INDEX "ef_execution_bundle_revision_hash_unique"
  ON "ExperimentFoundationExecutionBundleRevisionV2"("id", "contentHash");
CREATE UNIQUE INDEX "ef_execution_bundle_event_sequence_unique"
  ON "ExperimentFoundationExecutionBundleLifecycleEventV2"("executionBundleRevisionId", "eventSequence");
CREATE UNIQUE INDEX "ef_execution_bundle_event_hash_unique"
  ON "ExperimentFoundationExecutionBundleLifecycleEventV2"("executionBundleRevisionId", "eventHash");
CREATE INDEX "ef_execution_bundle_readiness_outcome_idx"
  ON "ExperimentFoundationExecutionBundleReadinessV2"("executionBundleRevisionId", "outcome");
CREATE UNIQUE INDEX "ef_execution_bundle_readiness_scope_unique"
  ON "ExperimentFoundationExecutionBundleReadinessV2"("executionBundleRevisionId", "executionBundleRevisionHash", "lifecycleEventHash");
CREATE UNIQUE INDEX "ef_execution_bundle_readiness_hash_unique"
  ON "ExperimentFoundationExecutionBundleReadinessV2"("id", "readinessHash");
CREATE UNIQUE INDEX "ef_provider_payload_cell_profile_unique"
  ON "ExperimentFoundationProviderPayloadV2"("runCellId", "payloadSchemaVersion", "providerProfileVersion");
CREATE INDEX "ef_run_recipe_execution_bundle_idx"
  ON "ExperimentFoundationRunRecipeV2"("executionBundleRevisionId");
CREATE INDEX "ef_task_spec_execution_bundle_idx"
  ON "ExperimentFoundationTrainingTaskSpecV2"("executionBundleRevisionId");

ALTER TABLE "ExperimentFoundationExecutionBundleIdentityV2"
  ADD CONSTRAINT "ef_execution_bundle_identity_version_check"
    CHECK ("stateVersion" >= 0);

ALTER TABLE "ExperimentFoundationExecutionBundleDraftV2"
  ADD CONSTRAINT "ef_execution_bundle_draft_version_check"
    CHECK ("draftVersion" > 0),
  ADD CONSTRAINT "ef_execution_bundle_draft_schema_check"
    CHECK ("schemaVersion" = 'v1');

ALTER TABLE "ExperimentFoundationExecutionBundleRevisionV2"
  ADD CONSTRAINT "ef_execution_bundle_revision_sequence_check"
    CHECK ("revisionSequence" > 0),
  ADD CONSTRAINT "ef_execution_bundle_revision_schema_check"
    CHECK ("schemaVersion" = 'v1'),
  ADD CONSTRAINT "ef_execution_bundle_revision_hash_profile_check"
    CHECK ("hashProfile" = 'ef-execution-bundle-semantic-json@v1');

ALTER TABLE "ExperimentFoundationExecutionBundleLifecycleEventV2"
  ADD CONSTRAINT "ef_execution_bundle_event_sequence_check"
    CHECK ("eventSequence" > 0),
  ADD CONSTRAINT "ef_execution_bundle_event_status_check"
    CHECK ("lifecycleStatus" IN ('draft', 'active', 'revoked'));

ALTER TABLE "ExperimentFoundationExecutionBundleLifecycleProjectionV2"
  ADD CONSTRAINT "ef_execution_bundle_projection_sequence_check"
    CHECK ("latestEventSequence" > 0 AND "stateVersion" >= 0),
  ADD CONSTRAINT "ef_execution_bundle_projection_status_check"
    CHECK ("lifecycleStatus" IN ('draft', 'active', 'revoked'));

ALTER TABLE "ExperimentFoundationExecutionBundleReadinessV2"
  ADD CONSTRAINT "ef_execution_bundle_readiness_outcome_check"
    CHECK ("outcome" IN ('passed', 'blocked'));

ALTER TABLE "PaperImplementationExperimentWorkOrderRevisionV2"
  DROP CONSTRAINT "pi_ewo_revision_snapshot_schema_check",
  ADD CONSTRAINT "pi_ewo_revision_snapshot_schema_check"
    CHECK ("workOrderSnapshotSchemaVersion" IN ('v1', 'v2'));

ALTER TABLE "ExperimentFoundationRunRecipeV2"
  DROP CONSTRAINT "ef_run_recipe_schema_check",
  ADD CONSTRAINT "ef_run_recipe_schema_check"
    CHECK ("recipeSchemaVersion" IN ('v1', 'v2')),
  ADD CONSTRAINT "ef_run_recipe_execution_bundle_tuple_check" CHECK (
    (("recipeSchemaVersion" = 'v1') AND ("executionBundleRevisionId" IS NULL) AND ("executionBundleRevisionHash" IS NULL))
    OR
    (("recipeSchemaVersion" = 'v2') AND ("executionBundleRevisionId" IS NOT NULL) AND ("executionBundleRevisionHash" IS NOT NULL))
  );

ALTER TABLE "ExperimentFoundationTrainingTaskSpecV2"
  DROP CONSTRAINT "ef_task_spec_schema_check",
  ADD CONSTRAINT "ef_task_spec_schema_check"
    CHECK ("taskSpecSchemaVersion" IN ('v1', 'v2')),
  ADD CONSTRAINT "ef_task_spec_execution_bundle_tuple_check" CHECK (
    (("taskSpecSchemaVersion" = 'v1') AND ("executionBundleRevisionId" IS NULL) AND ("executionBundleRevisionHash" IS NULL))
    OR
    (("taskSpecSchemaVersion" = 'v2') AND ("executionBundleRevisionId" IS NOT NULL) AND ("executionBundleRevisionHash" IS NOT NULL))
  );

ALTER TABLE "ExperimentFoundationProviderPayloadV2"
  DROP CONSTRAINT "ef_provider_payload_schema_check",
  DROP CONSTRAINT "ef_provider_payload_adapter_check",
  DROP CONSTRAINT "ef_provider_payload_mode_check",
  DROP CONSTRAINT "ef_provider_payload_provenance_check",
  ADD CONSTRAINT "ef_provider_payload_exact_tuple_check" CHECK (
    (
      ("payloadSchemaVersion" = 'FakeAliyunPaiDlcSubmitPayload@v1')
      AND ("adapterIdentity" = 'deterministic_fake_aliyun_pai_dlc@v1')
      AND ("executionMode" = 'simulation')
      AND ("provenance" = 'non_production_fake_provider')
    )
    OR
    (
      ("payloadSchemaVersion" = 'AliyunPaiDlcCreateJobPayload@v1')
      AND ("adapterIdentity" = 'aliyun_pai_dlc_official_sdk@v1')
      AND ("executionMode" = 'real_provider')
      AND ("provenance" = 'real_provider')
    )
  );

ALTER TABLE "ExperimentFoundationExecutionAttemptV2"
  DROP CONSTRAINT "ef_execution_attempt_mode_check",
  DROP CONSTRAINT "ef_execution_attempt_provenance_check",
  DROP CONSTRAINT "ef_execution_attempt_terminal_reason_check",
  ADD CONSTRAINT "ef_execution_attempt_exact_tuple_check" CHECK (
    (("executionMode" = 'simulation') AND ("provenance" = 'non_production_fake_provider'))
    OR
    (("executionMode" = 'real_provider') AND ("provenance" = 'real_provider'))
  ),
  ADD CONSTRAINT "ef_execution_attempt_terminal_reason_check" CHECK (
    (("lifecycleState" IN ('prepared', 'submitted', 'running')) AND ("terminalReasonCode" IS NULL))
    OR (("lifecycleState" = 'succeeded') AND ("terminalReasonCode" IN ('simulation_succeeded', 'real_provider_succeeded')))
    OR (("lifecycleState" = 'cancelled') AND ("terminalReasonCode" = 'operator_cancelled'))
    OR (
      ("lifecycleState" = 'failed')
      AND ("terminalReasonCode" IN (
        'simulation_failed',
        'real_provider_failed',
        'provider_response_invalid',
        'real_provider_timeout',
        'real_provider_cleanup_unverified'
      ))
    )
  );

ALTER TABLE "ExperimentFoundationProvisionalOutputV2"
  DROP CONSTRAINT "ef_provisional_output_kind_check",
  ADD CONSTRAINT "ef_provisional_output_kind_check" CHECK (
    "outputKind" IN (
      'simulation_lifecycle_trace',
      'simulation_provider_metadata',
      'simulation_collection_log',
      'real_provider_result_envelope',
      'real_provider_diagnostic_log'
    )
  );

ALTER TABLE "ExperimentFoundationExecutionBundleDraftV2"
  ADD CONSTRAINT "ef_execution_bundle_draft_identity_fkey"
    FOREIGN KEY ("executionBundleId")
    REFERENCES "ExperimentFoundationExecutionBundleIdentityV2"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "ExperimentFoundationExecutionBundleRevisionV2"
  ADD CONSTRAINT "ef_execution_bundle_revision_identity_fkey"
    FOREIGN KEY ("executionBundleId")
    REFERENCES "ExperimentFoundationExecutionBundleIdentityV2"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "ExperimentFoundationExecutionBundleLifecycleEventV2"
  ADD CONSTRAINT "ef_execution_bundle_event_revision_fkey"
    FOREIGN KEY ("executionBundleRevisionId")
    REFERENCES "ExperimentFoundationExecutionBundleRevisionV2"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "ExperimentFoundationExecutionBundleLifecycleProjectionV2"
  ADD CONSTRAINT "ef_execution_bundle_projection_revision_fkey"
    FOREIGN KEY ("executionBundleRevisionId")
    REFERENCES "ExperimentFoundationExecutionBundleRevisionV2"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "ExperimentFoundationExecutionBundleReadinessV2"
  ADD CONSTRAINT "ef_execution_bundle_readiness_revision_fkey"
    FOREIGN KEY ("executionBundleRevisionId", "executionBundleRevisionHash")
    REFERENCES "ExperimentFoundationExecutionBundleRevisionV2"("id", "contentHash")
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "ExperimentFoundationRunRecipeV2"
  ADD CONSTRAINT "ef_run_recipe_execution_bundle_fkey"
    FOREIGN KEY ("executionBundleRevisionId", "executionBundleRevisionHash")
    REFERENCES "ExperimentFoundationExecutionBundleRevisionV2"("id", "contentHash")
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "ExperimentFoundationTrainingTaskSpecV2"
  ADD CONSTRAINT "ef_task_spec_execution_bundle_fkey"
    FOREIGN KEY ("executionBundleRevisionId", "executionBundleRevisionHash")
    REFERENCES "ExperimentFoundationExecutionBundleRevisionV2"("id", "contentHash")
    ON DELETE RESTRICT ON UPDATE RESTRICT;
