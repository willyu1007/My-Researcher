-- T-136 additive authority bindings for EF scientific-source Results (DB-B)
-- and PI post-Closure interpretation Packets (PKT-S).
--
-- Historical rows are intentionally not backfilled. Nullable columns preserve
-- their legacy readability; CHECK constraints close the authoritative v2 state.

-- Add EF DB-B source-binding columns.
ALTER TABLE "ExperimentFoundationExperimentResultV2"
  ADD COLUMN "collectionAttemptId" TEXT,
  ADD COLUMN "sourceOutputId" TEXT,
  ADD COLUMN "sourceOutputHash" TEXT,
  ADD COLUMN "sourceOutputKind" TEXT,
  ADD COLUMN "sourceOutputClass" TEXT,
  ADD COLUMN "parserProfileVersion" TEXT,
  ADD COLUMN "parserProfileHash" TEXT,
  ADD COLUMN "derivationHash" TEXT;

-- Replace the three independent ProvisionalOutput fences with one closed tuple.
ALTER TABLE "ExperimentFoundationProvisionalOutputV2"
  DROP CONSTRAINT "ef_provisional_output_class_check",
  DROP CONSTRAINT "ef_provisional_output_kind_check",
  DROP CONSTRAINT "ef_provisional_output_manifest_version_check",
  ADD CONSTRAINT "ef_provisional_output_contract_check" CHECK (
    (
      "outputClass" = 'diagnostic_only'
      AND "outputKind" IN (
        'simulation_lifecycle_trace',
        'simulation_provider_metadata',
        'simulation_collection_log',
        'real_provider_result_envelope',
        'real_provider_diagnostic_log'
      )
      AND "manifestSchemaVersion" = 'v1'
    )
    OR (
      "outputClass" = 'scientific_source'
      AND "outputKind" = 'scientific_result_manifest'
      AND "manifestSchemaVersion" = 'ExperimentFoundationScientificSourceManifest@v1'
    )
  );

-- Preserve Result v1 rows as source-null and require complete source-bound v2.
ALTER TABLE "ExperimentFoundationExperimentResultV2"
  DROP CONSTRAINT "ef_experiment_result_schema_version_check",
  ADD CONSTRAINT "ef_experiment_result_schema_version_check" CHECK (
    "schemaVersion" IN ('v1', 'v2')
  ),
  ADD CONSTRAINT "ef_experiment_result_source_contract_check" CHECK (
    (
      "schemaVersion" = 'v1'
      AND "collectionAttemptId" IS NULL
      AND "sourceOutputId" IS NULL
      AND "sourceOutputHash" IS NULL
      AND "sourceOutputKind" IS NULL
      AND "sourceOutputClass" IS NULL
      AND "parserProfileVersion" IS NULL
      AND "parserProfileHash" IS NULL
      AND "derivationHash" IS NULL
    )
    OR (
      "schemaVersion" = 'v2'
      AND "collectionAttemptId" IS NOT NULL
      AND "sourceOutputId" IS NOT NULL
      AND "sourceOutputHash" ~ '^sha256:[0-9a-f]{64}$'
      AND "sourceOutputKind" = 'scientific_result_manifest'
      AND "sourceOutputClass" = 'scientific_source'
      AND NULLIF(BTRIM("parserProfileVersion"), '') IS NOT NULL
      AND "parserProfileHash" ~ '^sha256:[0-9a-f]{64}$'
      AND "derivationHash" ~ '^sha256:[0-9a-f]{64}$'
      AND "provenance" = 'real_provider'
    )
  );

-- Exact DB-B reference targets and one-Result ownership fences.
CREATE UNIQUE INDEX "ef_provisional_output_exact_source_unique"
  ON "ExperimentFoundationProvisionalOutputV2"(
    "id",
    "collectionAttemptId",
    "outputHash",
    "outputKind",
    "outputClass"
  );

CREATE UNIQUE INDEX "ef_experiment_result_collection_unique"
  ON "ExperimentFoundationExperimentResultV2"("collectionAttemptId");

CREATE UNIQUE INDEX "ef_experiment_result_source_unique"
  ON "ExperimentFoundationExperimentResultV2"("sourceOutputId");

ALTER TABLE "ExperimentFoundationExperimentResultV2"
  ADD CONSTRAINT "ef_experiment_result_collection_fkey"
    FOREIGN KEY ("collectionAttemptId", "executionAttemptId")
    REFERENCES "ExperimentFoundationCollectionAttemptV2"("id", "executionAttemptId")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ef_experiment_result_source_fkey"
    FOREIGN KEY (
      "sourceOutputId",
      "collectionAttemptId",
      "sourceOutputHash",
      "sourceOutputKind",
      "sourceOutputClass"
    )
    REFERENCES "ExperimentFoundationProvisionalOutputV2"(
      "id",
      "collectionAttemptId",
      "outputHash",
      "outputKind",
      "outputClass"
    )
    ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Add PI PKT-S exact Closure authority binding.
ALTER TABLE "PaperImplementationResultInterpretationPacket"
  ADD COLUMN "schemaVersion" TEXT,
  ADD COLUMN "closureId" TEXT,
  ADD COLUMN "closureSnapshotHash" TEXT,
  ADD COLUMN "packetContentHash" TEXT,
  ADD CONSTRAINT "pirip_scientific_v2_contract_check" CHECK (
    (
      "schemaVersion" IS NULL
      AND "closureId" IS NULL
      AND "closureSnapshotHash" IS NULL
      AND "packetContentHash" IS NULL
    )
    OR (
      "schemaVersion" = 'PaperImplementationResultInterpretationPacket@v2'
      AND NULLIF(BTRIM("closureId"), '') IS NOT NULL
      AND "closureSnapshotHash" ~ '^sha256:[0-9a-f]{64}$'
      AND "packetContentHash" ~ '^sha256:[0-9a-f]{64}$'
    )
  );

CREATE UNIQUE INDEX "pi_cycle_closure_packet_exact_unique"
  ON "PaperImplementationValidationCycleClosureV2"(
    "id",
    "closureSnapshotHash",
    "validationCycleId"
  );

CREATE UNIQUE INDEX "pirip_closure_unique"
  ON "PaperImplementationResultInterpretationPacket"("closureId");

ALTER TABLE "PaperImplementationResultInterpretationPacket"
  ADD CONSTRAINT "pirip_closure_exact_fkey"
    FOREIGN KEY ("closureId", "closureSnapshotHash", "validationCycleId")
    REFERENCES "PaperImplementationValidationCycleClosureV2"(
      "id",
      "closureSnapshotHash",
      "validationCycleId"
    )
    ON DELETE RESTRICT ON UPDATE RESTRICT;
