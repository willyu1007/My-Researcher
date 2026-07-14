-- T-132 Pack B adds a simulation-only provider-control lineage. The six new
-- EF-owned families bind only to Pack A EF authority; there are no PI-domain
-- foreign keys, legacy mutations, provider-job authority, or scientific state.

-- Add the exact same-domain reference targets required by Pack B composite FKs.
CREATE UNIQUE INDEX "ef_task_spec_exact_hash_unique" ON "ExperimentFoundationTrainingTaskSpecV2"("id", "taskSpecHash");
CREATE UNIQUE INDEX "ef_run_exact_manifest_unique" ON "ExperimentFoundationRunV2"("id", "runManifestHash");
CREATE UNIQUE INDEX "ef_run_exact_pi_scope_unique" ON "ExperimentFoundationRunV2"("id", "runManifestHash", "externalPiBranchId", "externalPiWorkOrderRevisionId", "externalPiWorkOrderRevisionHash", "externalPiRevisionSequence");
CREATE UNIQUE INDEX "ef_run_cell_exact_task_spec_unique" ON "ExperimentFoundationRunCellV2"("runId", "id", "trainingTaskSpecId", "cellKey");
CREATE UNIQUE INDEX "ef_integration_inbox_exact_head_ack_unique" ON "ExperimentFoundationIntegrationInboxV2"("id", "implementationProjectId", "validationCycleId", "branchId", "workOrderRevisionId", "revisionSequence", "workOrderRevisionHash", "runId", "runManifestHash");

-- CreateTable
CREATE TABLE "ExperimentFoundationProviderPayloadV2" (
    "id" TEXT NOT NULL,
    "materializationKey" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "runManifestHash" TEXT NOT NULL,
    "runCellId" TEXT NOT NULL,
    "cellKey" TEXT NOT NULL,
    "trainingTaskSpecId" TEXT NOT NULL,
    "trainingTaskSpecHash" TEXT NOT NULL,
    "payloadSchemaVersion" TEXT NOT NULL,
    "adapterIdentity" TEXT NOT NULL,
    "executionMode" TEXT NOT NULL,
    "provenance" TEXT NOT NULL,
    "simulationProfileVersion" TEXT NOT NULL,
    "redactedManifestVersion" TEXT NOT NULL,
    "redactedManifestJson" JSONB NOT NULL DEFAULT '{}',
    "payloadHash" TEXT NOT NULL,
    "payloadByteSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationProviderPayloadV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationExecutionAttemptV2" (
    "id" TEXT NOT NULL,
    "externalPiImplementationProjectId" TEXT NOT NULL,
    "externalPiValidationCycleId" TEXT NOT NULL,
    "externalPiBranchId" TEXT NOT NULL,
    "externalPiWorkOrderRevisionId" TEXT NOT NULL,
    "externalPiWorkOrderRevisionHash" TEXT NOT NULL,
    "externalPiRevisionSequence" INTEGER NOT NULL,
    "runId" TEXT NOT NULL,
    "runManifestHash" TEXT NOT NULL,
    "runCellId" TEXT NOT NULL,
    "cellKey" TEXT NOT NULL,
    "trainingTaskSpecId" TEXT NOT NULL,
    "trainingTaskSpecHash" TEXT NOT NULL,
    "providerPayloadId" TEXT NOT NULL,
    "providerPayloadHash" TEXT NOT NULL,
    "headAcknowledgementInboxId" TEXT NOT NULL,
    "attemptSequence" INTEGER NOT NULL,
    "workflowBusinessKey" TEXT NOT NULL,
    "workflowRequestHash" TEXT NOT NULL,
    "executionMode" TEXT NOT NULL,
    "provenance" TEXT NOT NULL,
    "providerIdempotencyKey" TEXT NOT NULL,
    "lifecycleState" TEXT NOT NULL,
    "stateVersion" INTEGER NOT NULL DEFAULT 0,
    "terminalReasonCode" TEXT,
    "externalJobRefSchemaVersion" TEXT,
    "externalJobRefJson" JSONB,
    "externalJobRefHash" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "terminalAt" TIMESTAMPTZ(6),

    CONSTRAINT "ExperimentFoundationExecutionAttemptV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationCollectionAttemptV2" (
    "id" TEXT NOT NULL,
    "executionAttemptId" TEXT NOT NULL,
    "collectionSequence" INTEGER NOT NULL,
    "businessIdempotencyKey" TEXT NOT NULL,
    "collectionRequestHash" TEXT NOT NULL,
    "providerPayloadId" TEXT NOT NULL,
    "providerPayloadHash" TEXT NOT NULL,
    "externalJobRefJson" JSONB NOT NULL,
    "externalJobRefHash" TEXT NOT NULL,
    "collectionState" TEXT NOT NULL,
    "stateVersion" INTEGER NOT NULL DEFAULT 0,
    "preparedAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "collectedAt" TIMESTAMPTZ(6),

    CONSTRAINT "ExperimentFoundationCollectionAttemptV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationProviderCommandV2" (
    "id" TEXT NOT NULL,
    "executionAttemptId" TEXT NOT NULL,
    "collectionAttemptId" TEXT,
    "commandSequence" INTEGER NOT NULL,
    "operation" TEXT NOT NULL,
    "commandSchemaVersion" TEXT NOT NULL,
    "commandSnapshotJson" JSONB NOT NULL DEFAULT '{}',
    "commandHash" TEXT NOT NULL,
    "responseHash" TEXT,
    "providerIdempotencyKey" TEXT NOT NULL,
    "providerPayloadHash" TEXT NOT NULL,
    "externalJobRefJson" JSONB,
    "externalJobRefHash" TEXT,
    "commandState" TEXT NOT NULL,
    "leaseVersion" INTEGER NOT NULL DEFAULT 0,
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMPTZ(6),
    "heartbeatAt" TIMESTAMPTZ(6),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMPTZ(6),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "terminalAt" TIMESTAMPTZ(6),

    CONSTRAINT "ExperimentFoundationProviderCommandV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationExecutionAttemptEventV2" (
    "id" TEXT NOT NULL,
    "executionAttemptId" TEXT NOT NULL,
    "eventSequence" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "priorState" TEXT,
    "nextState" TEXT NOT NULL,
    "providerCommandId" TEXT,
    "providerPayloadHash" TEXT NOT NULL,
    "externalJobRefJson" JSONB,
    "externalJobRefHash" TEXT,
    "eventSchemaVersion" TEXT NOT NULL,
    "eventSnapshotJson" JSONB NOT NULL DEFAULT '{}',
    "eventHash" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationExecutionAttemptEventV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationProvisionalOutputV2" (
    "id" TEXT NOT NULL,
    "collectionAttemptId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "outputKind" TEXT NOT NULL,
    "outputClass" TEXT NOT NULL,
    "manifestSchemaVersion" TEXT NOT NULL,
    "redactedManifestJson" JSONB NOT NULL DEFAULT '{}',
    "outputHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationProvisionalOutputV2_pkey" PRIMARY KEY ("id")
);

-- ProviderPayload immutable identity and lookup constraints.
CREATE UNIQUE INDEX "ef_provider_payload_materialization_unique" ON "ExperimentFoundationProviderPayloadV2"("materializationKey");
CREATE UNIQUE INDEX "ef_provider_payload_cell_profile_unique" ON "ExperimentFoundationProviderPayloadV2"("runCellId", "payloadSchemaVersion", "simulationProfileVersion");
CREATE UNIQUE INDEX "ef_provider_payload_exact_hash_unique" ON "ExperimentFoundationProviderPayloadV2"("id", "payloadHash");
CREATE UNIQUE INDEX "ef_provider_payload_exact_binding_unique" ON "ExperimentFoundationProviderPayloadV2"("id", "payloadHash", "runId", "runCellId", "trainingTaskSpecId", "cellKey");
CREATE INDEX "ef_provider_payload_run_cell_idx" ON "ExperimentFoundationProviderPayloadV2"("runId", "runCellId");
CREATE INDEX "ef_provider_payload_task_spec_idx" ON "ExperimentFoundationProviderPayloadV2"("trainingTaskSpecId", "trainingTaskSpecHash");

-- ExecutionAttempt idempotency, cell-local ordering and CAS lookup constraints.
CREATE UNIQUE INDEX "ef_execution_attempt_provider_idempotency_unique" ON "ExperimentFoundationExecutionAttemptV2"("providerIdempotencyKey");
CREATE UNIQUE INDEX "ef_execution_attempt_cell_sequence_unique" ON "ExperimentFoundationExecutionAttemptV2"("runCellId", "attemptSequence");
CREATE UNIQUE INDEX "ef_execution_attempt_workflow_business_unique" ON "ExperimentFoundationExecutionAttemptV2"("runId", "runCellId", "workflowBusinessKey");
CREATE UNIQUE INDEX "ef_execution_attempt_exact_payload_unique" ON "ExperimentFoundationExecutionAttemptV2"("id", "providerPayloadHash");
CREATE UNIQUE INDEX "ef_execution_attempt_collection_binding_unique" ON "ExperimentFoundationExecutionAttemptV2"("id", "providerPayloadId", "providerPayloadHash", "externalJobRefHash");
CREATE INDEX "ef_execution_attempt_cycle_mode_state_idx" ON "ExperimentFoundationExecutionAttemptV2"("externalPiValidationCycleId", "executionMode", "lifecycleState");
CREATE INDEX "ef_execution_attempt_run_sequence_idx" ON "ExperimentFoundationExecutionAttemptV2"("runId", "attemptSequence");
CREATE INDEX "ef_execution_attempt_head_ack_idx" ON "ExperimentFoundationExecutionAttemptV2"("headAcknowledgementInboxId");

-- CollectionAttempt replay identity and state lookup constraints.
CREATE UNIQUE INDEX "ef_collection_attempt_execution_unique" ON "ExperimentFoundationCollectionAttemptV2"("executionAttemptId");
CREATE UNIQUE INDEX "ef_collection_attempt_sequence_unique" ON "ExperimentFoundationCollectionAttemptV2"("executionAttemptId", "collectionSequence");
CREATE UNIQUE INDEX "ef_collection_attempt_business_unique" ON "ExperimentFoundationCollectionAttemptV2"("executionAttemptId", "businessIdempotencyKey");
CREATE UNIQUE INDEX "ef_collection_attempt_exact_binding_unique" ON "ExperimentFoundationCollectionAttemptV2"("executionAttemptId", "providerPayloadId", "providerPayloadHash", "externalJobRefHash");
CREATE UNIQUE INDEX "ef_collection_attempt_exact_attempt_unique" ON "ExperimentFoundationCollectionAttemptV2"("id", "executionAttemptId");
CREATE INDEX "ef_collection_attempt_state_idx" ON "ExperimentFoundationCollectionAttemptV2"("collectionState", "updatedAt");

-- ProviderCommand durable-intent, lease and replay constraints.
CREATE UNIQUE INDEX "ef_provider_command_idempotency_unique" ON "ExperimentFoundationProviderCommandV2"("providerIdempotencyKey");
CREATE UNIQUE INDEX "ef_provider_command_attempt_sequence_unique" ON "ExperimentFoundationProviderCommandV2"("executionAttemptId", "commandSequence");
CREATE UNIQUE INDEX "ef_provider_command_attempt_hash_unique" ON "ExperimentFoundationProviderCommandV2"("executionAttemptId", "commandHash");
CREATE UNIQUE INDEX "ef_provider_command_exact_attempt_unique" ON "ExperimentFoundationProviderCommandV2"("id", "executionAttemptId");
CREATE INDEX "ef_provider_command_ready_idx" ON "ExperimentFoundationProviderCommandV2"("commandState", "nextAttemptAt", "createdAt");
CREATE INDEX "ef_provider_command_lease_expiry_idx" ON "ExperimentFoundationProviderCommandV2"("leaseExpiresAt");
CREATE INDEX "ef_provider_command_collection_idx" ON "ExperimentFoundationProviderCommandV2"("collectionAttemptId");

-- AttemptEvent append-only and exact-command outcome constraints.
CREATE UNIQUE INDEX "ef_execution_attempt_event_command_unique" ON "ExperimentFoundationExecutionAttemptEventV2"("providerCommandId");
CREATE UNIQUE INDEX "ef_execution_attempt_event_sequence_unique" ON "ExperimentFoundationExecutionAttemptEventV2"("executionAttemptId", "eventSequence");
CREATE UNIQUE INDEX "ef_execution_attempt_event_hash_unique" ON "ExperimentFoundationExecutionAttemptEventV2"("executionAttemptId", "eventHash");
CREATE UNIQUE INDEX "ef_execution_attempt_event_exact_command_unique" ON "ExperimentFoundationExecutionAttemptEventV2"("providerCommandId", "executionAttemptId");
CREATE INDEX "ef_execution_attempt_event_time_idx" ON "ExperimentFoundationExecutionAttemptEventV2"("executionAttemptId", "occurredAt");

-- ProvisionalOutput diagnostic-only identity constraints.
CREATE UNIQUE INDEX "ef_provisional_output_collection_ordinal_unique" ON "ExperimentFoundationProvisionalOutputV2"("collectionAttemptId", "ordinal");
CREATE UNIQUE INDEX "ef_provisional_output_collection_kind_unique" ON "ExperimentFoundationProvisionalOutputV2"("collectionAttemptId", "outputKind");
CREATE UNIQUE INDEX "ef_provisional_output_collection_hash_unique" ON "ExperimentFoundationProvisionalOutputV2"("collectionAttemptId", "outputHash");

-- Closed Pack B simulation-only value domains and tuple invariants.
ALTER TABLE "ExperimentFoundationProviderPayloadV2"
  ADD CONSTRAINT "ef_provider_payload_size_check" CHECK ("payloadByteSize" > 0),
  ADD CONSTRAINT "ef_provider_payload_schema_check" CHECK ("payloadSchemaVersion" = 'FakeAliyunPaiDlcSubmitPayload@v1'),
  ADD CONSTRAINT "ef_provider_payload_adapter_check" CHECK ("adapterIdentity" = 'deterministic_fake_aliyun_pai_dlc@v1'),
  ADD CONSTRAINT "ef_provider_payload_mode_check" CHECK ("executionMode" = 'simulation'),
  ADD CONSTRAINT "ef_provider_payload_provenance_check" CHECK ("provenance" = 'non_production_fake_provider'),
  ADD CONSTRAINT "ef_provider_payload_manifest_version_check" CHECK ("redactedManifestVersion" = 'v1');

ALTER TABLE "ExperimentFoundationExecutionAttemptV2"
  ADD CONSTRAINT "ef_execution_attempt_sequence_check" CHECK ("externalPiRevisionSequence" > 0 AND "attemptSequence" > 0),
  ADD CONSTRAINT "ef_execution_attempt_state_version_check" CHECK ("stateVersion" >= 0),
  ADD CONSTRAINT "ef_execution_attempt_mode_check" CHECK ("executionMode" = 'simulation'),
  ADD CONSTRAINT "ef_execution_attempt_provenance_check" CHECK ("provenance" = 'non_production_fake_provider'),
  ADD CONSTRAINT "ef_execution_attempt_state_check" CHECK ("lifecycleState" IN ('prepared', 'submitted', 'running', 'succeeded', 'failed', 'cancelled')),
  ADD CONSTRAINT "ef_execution_attempt_external_ref_tuple_check" CHECK (
    (("externalJobRefSchemaVersion" IS NULL) AND ("externalJobRefJson" IS NULL) AND ("externalJobRefHash" IS NULL))
    OR
    (("externalJobRefSchemaVersion" = 'v1') AND ("externalJobRefJson" IS NOT NULL) AND ("externalJobRefHash" IS NOT NULL))
  ),
  ADD CONSTRAINT "ef_execution_attempt_terminal_tuple_check" CHECK (
    (("lifecycleState" IN ('succeeded', 'failed', 'cancelled')) AND ("terminalReasonCode" IS NOT NULL) AND ("terminalAt" IS NOT NULL))
    OR
    (("lifecycleState" IN ('prepared', 'submitted', 'running')) AND ("terminalReasonCode" IS NULL) AND ("terminalAt" IS NULL))
  ),
  ADD CONSTRAINT "ef_execution_attempt_terminal_reason_check" CHECK (
    "terminalReasonCode" IS NULL OR "terminalReasonCode" IN ('simulation_succeeded', 'simulation_failed', 'operator_cancelled', 'provider_response_invalid', 'collection_failed')
  );

ALTER TABLE "ExperimentFoundationCollectionAttemptV2"
  ADD CONSTRAINT "ef_collection_attempt_sequence_check" CHECK ("collectionSequence" > 0),
  ADD CONSTRAINT "ef_collection_attempt_state_version_check" CHECK ("stateVersion" >= 0),
  ADD CONSTRAINT "ef_collection_attempt_state_check" CHECK ("collectionState" IN ('prepared', 'collecting', 'collected', 'failed')),
  ADD CONSTRAINT "ef_collection_attempt_collected_tuple_check" CHECK (
    (("collectionState" = 'collected') AND ("collectedAt" IS NOT NULL))
    OR
    (("collectionState" IN ('prepared', 'collecting', 'failed')) AND ("collectedAt" IS NULL))
  );

ALTER TABLE "ExperimentFoundationProviderCommandV2"
  ADD CONSTRAINT "ef_provider_command_sequence_check" CHECK ("commandSequence" > 0),
  ADD CONSTRAINT "ef_provider_command_counter_check" CHECK ("leaseVersion" >= 0 AND "attemptCount" >= 0),
  ADD CONSTRAINT "ef_provider_command_operation_check" CHECK ("operation" IN ('submit', 'sync', 'reconcile', 'cancel', 'collect')),
  ADD CONSTRAINT "ef_provider_command_schema_check" CHECK ("commandSchemaVersion" = 'v1'),
  ADD CONSTRAINT "ef_provider_command_state_check" CHECK ("commandState" IN ('pending', 'claimed', 'succeeded', 'terminal')),
  ADD CONSTRAINT "ef_provider_command_lease_tuple_check" CHECK (
    (("commandState" = 'claimed') AND ("leaseOwner" IS NOT NULL) AND ("leaseExpiresAt" IS NOT NULL))
    OR
    (("commandState" IN ('pending', 'succeeded', 'terminal')) AND ("leaseOwner" IS NULL) AND ("leaseExpiresAt" IS NULL))
  ),
  ADD CONSTRAINT "ef_provider_command_external_ref_pair_check" CHECK (("externalJobRefJson" IS NULL) = ("externalJobRefHash" IS NULL)),
  ADD CONSTRAINT "ef_provider_command_terminal_tuple_check" CHECK (
    (("commandState" IN ('succeeded', 'terminal')) AND ("terminalAt" IS NOT NULL))
    OR
    (("commandState" IN ('pending', 'claimed')) AND ("terminalAt" IS NULL))
  );

ALTER TABLE "ExperimentFoundationExecutionAttemptEventV2"
  ADD CONSTRAINT "ef_attempt_event_sequence_check" CHECK ("eventSequence" > 0),
  ADD CONSTRAINT "ef_attempt_event_type_check" CHECK ("eventType" IN ('created', 'submitted', 'running', 'succeeded', 'failed', 'cancelled', 'reconciled', 'collection_prepared', 'collection_collected', 'collection_failed')),
  ADD CONSTRAINT "ef_attempt_event_prior_state_check" CHECK ("priorState" IS NULL OR "priorState" IN ('prepared', 'submitted', 'running', 'succeeded', 'failed', 'cancelled')),
  ADD CONSTRAINT "ef_attempt_event_next_state_check" CHECK ("nextState" IN ('prepared', 'submitted', 'running', 'succeeded', 'failed', 'cancelled')),
  ADD CONSTRAINT "ef_attempt_event_schema_check" CHECK ("eventSchemaVersion" = 'v1'),
  ADD CONSTRAINT "ef_attempt_event_external_ref_pair_check" CHECK (("externalJobRefJson" IS NULL) = ("externalJobRefHash" IS NULL));

ALTER TABLE "ExperimentFoundationProvisionalOutputV2"
  ADD CONSTRAINT "ef_provisional_output_ordinal_check" CHECK ("ordinal" > 0),
  ADD CONSTRAINT "ef_provisional_output_class_check" CHECK ("outputClass" = 'diagnostic_only'),
  ADD CONSTRAINT "ef_provisional_output_kind_check" CHECK ("outputKind" IN ('simulation_lifecycle_trace', 'simulation_provider_metadata', 'simulation_collection_log')),
  ADD CONSTRAINT "ef_provisional_output_manifest_version_check" CHECK ("manifestSchemaVersion" = 'v1');

-- Same-domain immutable-lineage FKs; every delete action is Restrict.
ALTER TABLE "ExperimentFoundationProviderPayloadV2"
  ADD CONSTRAINT "ef_provider_payload_run_fkey" FOREIGN KEY ("runId", "runManifestHash") REFERENCES "ExperimentFoundationRunV2"("id", "runManifestHash") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ef_provider_payload_run_cell_fkey" FOREIGN KEY ("runId", "runCellId", "trainingTaskSpecId", "cellKey") REFERENCES "ExperimentFoundationRunCellV2"("runId", "id", "trainingTaskSpecId", "cellKey") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ef_provider_payload_task_spec_fkey" FOREIGN KEY ("trainingTaskSpecId", "trainingTaskSpecHash") REFERENCES "ExperimentFoundationTrainingTaskSpecV2"("id", "taskSpecHash") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExperimentFoundationExecutionAttemptV2"
  ADD CONSTRAINT "ef_execution_attempt_run_fkey" FOREIGN KEY ("runId", "runManifestHash", "externalPiBranchId", "externalPiWorkOrderRevisionId", "externalPiWorkOrderRevisionHash", "externalPiRevisionSequence") REFERENCES "ExperimentFoundationRunV2"("id", "runManifestHash", "externalPiBranchId", "externalPiWorkOrderRevisionId", "externalPiWorkOrderRevisionHash", "externalPiRevisionSequence") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ef_execution_attempt_run_cell_fkey" FOREIGN KEY ("runId", "runCellId", "trainingTaskSpecId", "cellKey") REFERENCES "ExperimentFoundationRunCellV2"("runId", "id", "trainingTaskSpecId", "cellKey") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ef_execution_attempt_task_spec_fkey" FOREIGN KEY ("trainingTaskSpecId", "trainingTaskSpecHash") REFERENCES "ExperimentFoundationTrainingTaskSpecV2"("id", "taskSpecHash") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ef_execution_attempt_payload_fkey" FOREIGN KEY ("providerPayloadId", "providerPayloadHash", "runId", "runCellId", "trainingTaskSpecId", "cellKey") REFERENCES "ExperimentFoundationProviderPayloadV2"("id", "payloadHash", "runId", "runCellId", "trainingTaskSpecId", "cellKey") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ef_execution_attempt_head_ack_fkey" FOREIGN KEY ("headAcknowledgementInboxId", "externalPiImplementationProjectId", "externalPiValidationCycleId", "externalPiBranchId", "externalPiWorkOrderRevisionId", "externalPiRevisionSequence", "externalPiWorkOrderRevisionHash", "runId", "runManifestHash") REFERENCES "ExperimentFoundationIntegrationInboxV2"("id", "implementationProjectId", "validationCycleId", "branchId", "workOrderRevisionId", "revisionSequence", "workOrderRevisionHash", "runId", "runManifestHash") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExperimentFoundationCollectionAttemptV2"
  ADD CONSTRAINT "ef_collection_attempt_attempt_fkey" FOREIGN KEY ("executionAttemptId", "providerPayloadId", "providerPayloadHash", "externalJobRefHash") REFERENCES "ExperimentFoundationExecutionAttemptV2"("id", "providerPayloadId", "providerPayloadHash", "externalJobRefHash") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ef_collection_attempt_payload_fkey" FOREIGN KEY ("providerPayloadId", "providerPayloadHash") REFERENCES "ExperimentFoundationProviderPayloadV2"("id", "payloadHash") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExperimentFoundationProviderCommandV2"
  ADD CONSTRAINT "ef_provider_command_attempt_fkey" FOREIGN KEY ("executionAttemptId", "providerPayloadHash") REFERENCES "ExperimentFoundationExecutionAttemptV2"("id", "providerPayloadHash") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ef_provider_command_collection_fkey" FOREIGN KEY ("collectionAttemptId", "executionAttemptId") REFERENCES "ExperimentFoundationCollectionAttemptV2"("id", "executionAttemptId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExperimentFoundationExecutionAttemptEventV2"
  ADD CONSTRAINT "ef_attempt_event_attempt_fkey" FOREIGN KEY ("executionAttemptId", "providerPayloadHash") REFERENCES "ExperimentFoundationExecutionAttemptV2"("id", "providerPayloadHash") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ef_attempt_event_command_fkey" FOREIGN KEY ("providerCommandId", "executionAttemptId") REFERENCES "ExperimentFoundationProviderCommandV2"("id", "executionAttemptId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExperimentFoundationProvisionalOutputV2"
  ADD CONSTRAINT "ef_provisional_output_collection_fkey" FOREIGN KEY ("collectionAttemptId") REFERENCES "ExperimentFoundationCollectionAttemptV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
