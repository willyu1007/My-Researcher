-- Pack B follow-up hardening. This migration intentionally changes only the six
-- additive Pack B families introduced by 20260713210000. It removes unreachable
-- one-to-one/state surface and prevents parent-key rewrites from cascading into
-- immutable execution lineage.
--
-- The event exact-command and Collection exact-binding composite unique indexes
-- are intentionally retained: Prisma requires them to model the corresponding
-- exact composite foreign keys as one-to-one relations.

DROP INDEX "ef_collection_attempt_sequence_unique";
DROP INDEX "ef_collection_attempt_business_unique";
DROP INDEX "ef_collection_attempt_state_idx";

ALTER TABLE "ExperimentFoundationCollectionAttemptV2"
  DROP CONSTRAINT "ef_collection_attempt_sequence_check",
  DROP COLUMN "collectionSequence";

ALTER TABLE "ExperimentFoundationExecutionAttemptV2"
  DROP CONSTRAINT "ef_execution_attempt_terminal_reason_check",
  ADD CONSTRAINT "ef_execution_attempt_terminal_reason_check" CHECK (
    (("lifecycleState" IN ('prepared', 'submitted', 'running')) AND ("terminalReasonCode" IS NULL))
    OR (("lifecycleState" = 'succeeded') AND ("terminalReasonCode" = 'simulation_succeeded'))
    OR (("lifecycleState" = 'cancelled') AND ("terminalReasonCode" = 'operator_cancelled'))
    OR (
      ("lifecycleState" = 'failed')
      AND ("terminalReasonCode" IN ('simulation_failed', 'provider_response_invalid'))
    )
  );

ALTER TABLE "ExperimentFoundationCollectionAttemptV2"
  DROP CONSTRAINT "ef_collection_attempt_state_check",
  DROP CONSTRAINT "ef_collection_attempt_collected_tuple_check",
  ADD CONSTRAINT "ef_collection_attempt_state_check" CHECK (
    "collectionState" IN ('prepared', 'collected', 'failed')
  ),
  ADD CONSTRAINT "ef_collection_attempt_collected_tuple_check" CHECK (
    (("collectionState" IN ('prepared', 'failed')) AND ("collectedAt" IS NULL))
    OR (("collectionState" = 'collected') AND ("collectedAt" IS NOT NULL))
  );

ALTER TABLE "ExperimentFoundationExecutionAttemptEventV2"
  DROP CONSTRAINT "ef_attempt_event_type_check",
  ADD CONSTRAINT "ef_attempt_event_type_check" CHECK (
    "eventType" IN (
      'created',
      'submitted',
      'running',
      'succeeded',
      'failed',
      'cancelled',
      'collection_prepared',
      'collection_collected',
      'collection_failed'
    )
  );

ALTER TABLE "ExperimentFoundationProviderPayloadV2"
  DROP CONSTRAINT "ef_provider_payload_run_fkey",
  DROP CONSTRAINT "ef_provider_payload_run_cell_fkey",
  DROP CONSTRAINT "ef_provider_payload_task_spec_fkey",
  ADD CONSTRAINT "ef_provider_payload_run_fkey"
    FOREIGN KEY ("runId", "runManifestHash")
    REFERENCES "ExperimentFoundationRunV2"("id", "runManifestHash")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ef_provider_payload_run_cell_fkey"
    FOREIGN KEY ("runId", "runCellId", "trainingTaskSpecId", "cellKey")
    REFERENCES "ExperimentFoundationRunCellV2"("runId", "id", "trainingTaskSpecId", "cellKey")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ef_provider_payload_task_spec_fkey"
    FOREIGN KEY ("trainingTaskSpecId", "trainingTaskSpecHash")
    REFERENCES "ExperimentFoundationTrainingTaskSpecV2"("id", "taskSpecHash")
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "ExperimentFoundationExecutionAttemptV2"
  DROP CONSTRAINT "ef_execution_attempt_run_fkey",
  DROP CONSTRAINT "ef_execution_attempt_run_cell_fkey",
  DROP CONSTRAINT "ef_execution_attempt_task_spec_fkey",
  DROP CONSTRAINT "ef_execution_attempt_payload_fkey",
  DROP CONSTRAINT "ef_execution_attempt_head_ack_fkey",
  ADD CONSTRAINT "ef_execution_attempt_run_fkey"
    FOREIGN KEY (
      "runId",
      "runManifestHash",
      "externalPiBranchId",
      "externalPiWorkOrderRevisionId",
      "externalPiWorkOrderRevisionHash",
      "externalPiRevisionSequence"
    )
    REFERENCES "ExperimentFoundationRunV2"(
      "id",
      "runManifestHash",
      "externalPiBranchId",
      "externalPiWorkOrderRevisionId",
      "externalPiWorkOrderRevisionHash",
      "externalPiRevisionSequence"
    )
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ef_execution_attempt_run_cell_fkey"
    FOREIGN KEY ("runId", "runCellId", "trainingTaskSpecId", "cellKey")
    REFERENCES "ExperimentFoundationRunCellV2"("runId", "id", "trainingTaskSpecId", "cellKey")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ef_execution_attempt_task_spec_fkey"
    FOREIGN KEY ("trainingTaskSpecId", "trainingTaskSpecHash")
    REFERENCES "ExperimentFoundationTrainingTaskSpecV2"("id", "taskSpecHash")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ef_execution_attempt_payload_fkey"
    FOREIGN KEY (
      "providerPayloadId",
      "providerPayloadHash",
      "runId",
      "runCellId",
      "trainingTaskSpecId",
      "cellKey"
    )
    REFERENCES "ExperimentFoundationProviderPayloadV2"(
      "id",
      "payloadHash",
      "runId",
      "runCellId",
      "trainingTaskSpecId",
      "cellKey"
    )
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ef_execution_attempt_head_ack_fkey"
    FOREIGN KEY (
      "headAcknowledgementInboxId",
      "externalPiImplementationProjectId",
      "externalPiValidationCycleId",
      "externalPiBranchId",
      "externalPiWorkOrderRevisionId",
      "externalPiRevisionSequence",
      "externalPiWorkOrderRevisionHash",
      "runId",
      "runManifestHash"
    )
    REFERENCES "ExperimentFoundationIntegrationInboxV2"(
      "id",
      "implementationProjectId",
      "validationCycleId",
      "branchId",
      "workOrderRevisionId",
      "revisionSequence",
      "workOrderRevisionHash",
      "runId",
      "runManifestHash"
    )
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "ExperimentFoundationCollectionAttemptV2"
  DROP CONSTRAINT "ef_collection_attempt_attempt_fkey",
  DROP CONSTRAINT "ef_collection_attempt_payload_fkey",
  ADD CONSTRAINT "ef_collection_attempt_attempt_fkey"
    FOREIGN KEY (
      "executionAttemptId",
      "providerPayloadId",
      "providerPayloadHash",
      "externalJobRefHash"
    )
    REFERENCES "ExperimentFoundationExecutionAttemptV2"(
      "id",
      "providerPayloadId",
      "providerPayloadHash",
      "externalJobRefHash"
    )
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ef_collection_attempt_payload_fkey"
    FOREIGN KEY ("providerPayloadId", "providerPayloadHash")
    REFERENCES "ExperimentFoundationProviderPayloadV2"("id", "payloadHash")
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "ExperimentFoundationProviderCommandV2"
  DROP CONSTRAINT "ef_provider_command_attempt_fkey",
  DROP CONSTRAINT "ef_provider_command_collection_fkey",
  ADD CONSTRAINT "ef_provider_command_attempt_fkey"
    FOREIGN KEY ("executionAttemptId", "providerPayloadHash")
    REFERENCES "ExperimentFoundationExecutionAttemptV2"("id", "providerPayloadHash")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ef_provider_command_collection_fkey"
    FOREIGN KEY ("collectionAttemptId", "executionAttemptId")
    REFERENCES "ExperimentFoundationCollectionAttemptV2"("id", "executionAttemptId")
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "ExperimentFoundationExecutionAttemptEventV2"
  DROP CONSTRAINT "ef_attempt_event_attempt_fkey",
  DROP CONSTRAINT "ef_attempt_event_command_fkey",
  ADD CONSTRAINT "ef_attempt_event_attempt_fkey"
    FOREIGN KEY ("executionAttemptId", "providerPayloadHash")
    REFERENCES "ExperimentFoundationExecutionAttemptV2"("id", "providerPayloadHash")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ef_attempt_event_command_fkey"
    FOREIGN KEY ("providerCommandId", "executionAttemptId")
    REFERENCES "ExperimentFoundationProviderCommandV2"("id", "executionAttemptId")
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "ExperimentFoundationProvisionalOutputV2"
  DROP CONSTRAINT "ef_provisional_output_collection_fkey",
  ADD CONSTRAINT "ef_provisional_output_collection_fkey"
    FOREIGN KEY ("collectionAttemptId")
    REFERENCES "ExperimentFoundationCollectionAttemptV2"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT;
