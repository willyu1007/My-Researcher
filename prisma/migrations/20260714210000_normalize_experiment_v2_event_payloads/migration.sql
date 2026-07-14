-- Integration envelope metadata is relational authority. The typed JSON column
-- stores only event.payload, so branch_key must also be present structurally to
-- reconstruct and re-hash the exact closed envelope without a duplicate copy.
ALTER TABLE "PaperImplementationExperimentIntegrationInboxV2"
  ADD COLUMN "branchKey" TEXT NOT NULL,
  ADD COLUMN "eventEnvelopeHash" TEXT NOT NULL;

ALTER TABLE "PaperImplementationExperimentIntegrationOutboxV2"
  ADD COLUMN "branchKey" TEXT NOT NULL,
  ADD COLUMN "eventEnvelopeHash" TEXT NOT NULL;

ALTER TABLE "ExperimentFoundationIntegrationInboxV2"
  ADD COLUMN "branchKey" TEXT NOT NULL,
  ADD COLUMN "eventEnvelopeHash" TEXT NOT NULL;

ALTER TABLE "ExperimentFoundationIntegrationOutboxV2"
  ADD COLUMN "branchKey" TEXT NOT NULL,
  ADD COLUMN "eventEnvelopeHash" TEXT NOT NULL;

-- Pack A immutable-lineage keys must never be rewritten transitively. The
-- initial additive migration used Prisma's implicit cascading update action;
-- replace exactly those 38 same-domain constraints without altering legacy tables.
ALTER TABLE "PaperImplementationExperimentWorkOrderBranchV2" DROP CONSTRAINT "pi_ewo_branch_current_exact_fkey", ADD CONSTRAINT "pi_ewo_branch_current_exact_fkey" FOREIGN KEY ("id", "currentRevisionId", "currentRevisionSequence") REFERENCES "PaperImplementationExperimentWorkOrderRevisionV2"("branchId", "id", "revisionSequence") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "PaperImplementationExperimentWorkOrderBranchV2" DROP CONSTRAINT "pi_ewo_branch_head_exact_fkey", ADD CONSTRAINT "pi_ewo_branch_head_exact_fkey" FOREIGN KEY ("id", "headRevisionId", "headRevisionSequence") REFERENCES "PaperImplementationExperimentWorkOrderRevisionV2"("branchId", "id", "revisionSequence") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "PaperImplementationExperimentWorkOrderRevisionV2" DROP CONSTRAINT "PaperImplementationExperimentWorkOrderRevisionV2_branchId_fkey", ADD CONSTRAINT "PaperImplementationExperimentWorkOrderRevisionV2_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "PaperImplementationExperimentWorkOrderBranchV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "PaperImplementationExperimentWorkOrderRevisionV2" DROP CONSTRAINT "pi_ewo_revision_parent_owner_fkey", ADD CONSTRAINT "pi_ewo_revision_parent_owner_fkey" FOREIGN KEY ("branchId", "parentRevisionId") REFERENCES "PaperImplementationExperimentWorkOrderRevisionV2"("branchId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "PaperImplementationExperimentWorkOrderRevisionCellV2" DROP CONSTRAINT "PaperImplementationExperimentWorkOrderRevisionCellV2_revis_fkey", ADD CONSTRAINT "PaperImplementationExperimentWorkOrderRevisionCellV2_revis_fkey" FOREIGN KEY ("revisionId") REFERENCES "PaperImplementationExperimentWorkOrderRevisionV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "PaperImplementationExperimentWorkOrderAdmissionV2" DROP CONSTRAINT "PaperImplementationExperimentWorkOrderAdmissionV2_branchId_fkey", ADD CONSTRAINT "PaperImplementationExperimentWorkOrderAdmissionV2_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "PaperImplementationExperimentWorkOrderBranchV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "PaperImplementationExperimentWorkOrderAdmissionV2" DROP CONSTRAINT "pi_ewo_admission_revision_exact_fkey", ADD CONSTRAINT "pi_ewo_admission_revision_exact_fkey" FOREIGN KEY ("branchId", "revisionId", "approvedPlanHash") REFERENCES "PaperImplementationExperimentWorkOrderRevisionV2"("branchId", "id", "approvedPlanHash") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationDatasetV2" DROP CONSTRAINT "ExperimentFoundationDatasetV2_id_currentRevisionId_fkey", ADD CONSTRAINT "ExperimentFoundationDatasetV2_id_currentRevisionId_fkey" FOREIGN KEY ("id", "currentRevisionId") REFERENCES "ExperimentFoundationDatasetRevisionV2"("datasetId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationDatasetRevisionV2" DROP CONSTRAINT "ExperimentFoundationDatasetRevisionV2_datasetId_fkey", ADD CONSTRAINT "ExperimentFoundationDatasetRevisionV2_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "ExperimentFoundationDatasetV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationDatasetRevisionV2" DROP CONSTRAINT "ExperimentFoundationDatasetRevisionV2_dataPolicyRevisionId_fkey", ADD CONSTRAINT "ExperimentFoundationDatasetRevisionV2_dataPolicyRevisionId_fkey" FOREIGN KEY ("dataPolicyRevisionId", "dataPolicyRevisionHash") REFERENCES "ExperimentFoundationDataPolicyRevisionV2"("id", "contentHash") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationDatasetFreezeCommandReceiptV2" DROP CONSTRAINT "ExperimentFoundationDatasetFreezeCommandReceiptV2_datasetI_fkey", ADD CONSTRAINT "ExperimentFoundationDatasetFreezeCommandReceiptV2_datasetI_fkey" FOREIGN KEY ("datasetId", "revisionId", "contentHash") REFERENCES "ExperimentFoundationDatasetRevisionV2"("datasetId", "id", "contentHash") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationDataPolicyV2" DROP CONSTRAINT "ExperimentFoundationDataPolicyV2_id_currentRevisionId_fkey", ADD CONSTRAINT "ExperimentFoundationDataPolicyV2_id_currentRevisionId_fkey" FOREIGN KEY ("id", "currentRevisionId") REFERENCES "ExperimentFoundationDataPolicyRevisionV2"("dataPolicyId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationDataPolicyRevisionV2" DROP CONSTRAINT "ExperimentFoundationDataPolicyRevisionV2_dataPolicyId_fkey", ADD CONSTRAINT "ExperimentFoundationDataPolicyRevisionV2_dataPolicyId_fkey" FOREIGN KEY ("dataPolicyId") REFERENCES "ExperimentFoundationDataPolicyV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationDataPolicyFreezeCommandReceiptV2" DROP CONSTRAINT "ExperimentFoundationDataPolicyFreezeCommandReceiptV2_dataP_fkey", ADD CONSTRAINT "ExperimentFoundationDataPolicyFreezeCommandReceiptV2_dataP_fkey" FOREIGN KEY ("dataPolicyId", "revisionId", "contentHash") REFERENCES "ExperimentFoundationDataPolicyRevisionV2"("dataPolicyId", "id", "contentHash") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationMetricDefinitionV2" DROP CONSTRAINT "ExperimentFoundationMetricDefinitionV2_id_currentRevisionI_fkey", ADD CONSTRAINT "ExperimentFoundationMetricDefinitionV2_id_currentRevisionI_fkey" FOREIGN KEY ("id", "currentRevisionId") REFERENCES "ExperimentFoundationMetricDefinitionRevisionV2"("metricDefinitionId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationMetricDefinitionRevisionV2" DROP CONSTRAINT "ExperimentFoundationMetricDefinitionRevisionV2_metricDefin_fkey", ADD CONSTRAINT "ExperimentFoundationMetricDefinitionRevisionV2_metricDefin_fkey" FOREIGN KEY ("metricDefinitionId") REFERENCES "ExperimentFoundationMetricDefinitionV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationMetricDefinitionFreezeCommandReceiptV2" DROP CONSTRAINT "ExperimentFoundationMetricDefinitionFreezeCommandReceiptV2_fkey", ADD CONSTRAINT "ExperimentFoundationMetricDefinitionFreezeCommandReceiptV2_fkey" FOREIGN KEY ("metricDefinitionId", "revisionId", "contentHash") REFERENCES "ExperimentFoundationMetricDefinitionRevisionV2"("metricDefinitionId", "id", "contentHash") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationBenchmarkV2" DROP CONSTRAINT "ExperimentFoundationBenchmarkV2_id_currentRevisionId_fkey", ADD CONSTRAINT "ExperimentFoundationBenchmarkV2_id_currentRevisionId_fkey" FOREIGN KEY ("id", "currentRevisionId") REFERENCES "ExperimentFoundationBenchmarkRevisionV2"("benchmarkId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationBenchmarkRevisionV2" DROP CONSTRAINT "ExperimentFoundationBenchmarkRevisionV2_benchmarkId_fkey", ADD CONSTRAINT "ExperimentFoundationBenchmarkRevisionV2_benchmarkId_fkey" FOREIGN KEY ("benchmarkId") REFERENCES "ExperimentFoundationBenchmarkV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationBenchmarkRevisionV2" DROP CONSTRAINT "ExperimentFoundationBenchmarkRevisionV2_corpusDatasetRevis_fkey", ADD CONSTRAINT "ExperimentFoundationBenchmarkRevisionV2_corpusDatasetRevis_fkey" FOREIGN KEY ("corpusDatasetRevisionId", "corpusDatasetRevisionHash") REFERENCES "ExperimentFoundationDatasetRevisionV2"("id", "contentHash") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationBenchmarkRevisionV2" DROP CONSTRAINT "ExperimentFoundationBenchmarkRevisionV2_queryDatasetRevisi_fkey", ADD CONSTRAINT "ExperimentFoundationBenchmarkRevisionV2_queryDatasetRevisi_fkey" FOREIGN KEY ("queryDatasetRevisionId", "queryDatasetRevisionHash") REFERENCES "ExperimentFoundationDatasetRevisionV2"("id", "contentHash") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationBenchmarkFreezeCommandReceiptV2" DROP CONSTRAINT "ExperimentFoundationBenchmarkFreezeCommandReceiptV2_benchm_fkey", ADD CONSTRAINT "ExperimentFoundationBenchmarkFreezeCommandReceiptV2_benchm_fkey" FOREIGN KEY ("benchmarkId", "revisionId", "contentHash") REFERENCES "ExperimentFoundationBenchmarkRevisionV2"("benchmarkId", "id", "contentHash") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationEvaluationProtocolV2" DROP CONSTRAINT "ExperimentFoundationEvaluationProtocolV2_id_currentRevisio_fkey", ADD CONSTRAINT "ExperimentFoundationEvaluationProtocolV2_id_currentRevisio_fkey" FOREIGN KEY ("id", "currentRevisionId") REFERENCES "ExperimentFoundationEvaluationProtocolRevisionV2"("evaluationProtocolId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationEvaluationProtocolRevisionV2" DROP CONSTRAINT "ExperimentFoundationEvaluationProtocolRevisionV2_evaluatio_fkey", ADD CONSTRAINT "ExperimentFoundationEvaluationProtocolRevisionV2_evaluatio_fkey" FOREIGN KEY ("evaluationProtocolId") REFERENCES "ExperimentFoundationEvaluationProtocolV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationEvaluationProtocolRevisionV2" DROP CONSTRAINT "ExperimentFoundationEvaluationProtocolRevisionV2_benchmark_fkey", ADD CONSTRAINT "ExperimentFoundationEvaluationProtocolRevisionV2_benchmark_fkey" FOREIGN KEY ("benchmarkRevisionId", "benchmarkRevisionHash") REFERENCES "ExperimentFoundationBenchmarkRevisionV2"("id", "contentHash") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationEvaluationProtocolFreezeCommandReceiptV2" DROP CONSTRAINT "ExperimentFoundationEvaluationProtocolFreezeCommandReceipt_fkey", ADD CONSTRAINT "ExperimentFoundationEvaluationProtocolFreezeCommandReceipt_fkey" FOREIGN KEY ("evaluationProtocolId", "revisionId", "contentHash") REFERENCES "ExperimentFoundationEvaluationProtocolRevisionV2"("evaluationProtocolId", "id", "contentHash") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationEvaluationProtocolMetricDependencyV2" DROP CONSTRAINT "ExperimentFoundationEvaluationProtocolMetricDependencyV2_e_fkey", ADD CONSTRAINT "ExperimentFoundationEvaluationProtocolMetricDependencyV2_e_fkey" FOREIGN KEY ("evaluationProtocolRevisionId") REFERENCES "ExperimentFoundationEvaluationProtocolRevisionV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationEvaluationProtocolMetricDependencyV2" DROP CONSTRAINT "ExperimentFoundationEvaluationProtocolMetricDependencyV2_m_fkey", ADD CONSTRAINT "ExperimentFoundationEvaluationProtocolMetricDependencyV2_m_fkey" FOREIGN KEY ("metricDefinitionId", "metricDefinitionRevisionId", "metricDefinitionRevisionSequence", "metricDefinitionRevisionHash") REFERENCES "ExperimentFoundationMetricDefinitionRevisionV2"("metricDefinitionId", "id", "revisionSequence", "contentHash") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationAssetLifecycleProjectionV2" DROP CONSTRAINT "ExperimentFoundationAssetLifecycleProjectionV2_lastEventId_fkey", ADD CONSTRAINT "ExperimentFoundationAssetLifecycleProjectionV2_lastEventId_fkey" FOREIGN KEY ("lastEventId") REFERENCES "ExperimentFoundationAssetLifecycleEventV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationReadinessDependencyV2" DROP CONSTRAINT "ExperimentFoundationReadinessDependencyV2_attestationId_fkey", ADD CONSTRAINT "ExperimentFoundationReadinessDependencyV2_attestationId_fkey" FOREIGN KEY ("attestationId") REFERENCES "ExperimentFoundationReadinessAttestationV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationVersionLockV2" DROP CONSTRAINT "ExperimentFoundationVersionLockV2_readinessAttestationId_fkey", ADD CONSTRAINT "ExperimentFoundationVersionLockV2_readinessAttestationId_fkey" FOREIGN KEY ("readinessAttestationId") REFERENCES "ExperimentFoundationReadinessAttestationV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationVersionLockDependencyV2" DROP CONSTRAINT "ExperimentFoundationVersionLockDependencyV2_versionLockId_fkey", ADD CONSTRAINT "ExperimentFoundationVersionLockDependencyV2_versionLockId_fkey" FOREIGN KEY ("versionLockId") REFERENCES "ExperimentFoundationVersionLockV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationRunRecipeV2" DROP CONSTRAINT "ExperimentFoundationRunRecipeV2_versionLockId_fkey", ADD CONSTRAINT "ExperimentFoundationRunRecipeV2_versionLockId_fkey" FOREIGN KEY ("versionLockId") REFERENCES "ExperimentFoundationVersionLockV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationRunRecipeV2" DROP CONSTRAINT "ExperimentFoundationRunRecipeV2_readinessAttestationId_fkey", ADD CONSTRAINT "ExperimentFoundationRunRecipeV2_readinessAttestationId_fkey" FOREIGN KEY ("readinessAttestationId") REFERENCES "ExperimentFoundationReadinessAttestationV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationTrainingTaskSpecV2" DROP CONSTRAINT "ExperimentFoundationTrainingTaskSpecV2_runRecipeId_fkey", ADD CONSTRAINT "ExperimentFoundationTrainingTaskSpecV2_runRecipeId_fkey" FOREIGN KEY ("runRecipeId") REFERENCES "ExperimentFoundationRunRecipeV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationRunV2" DROP CONSTRAINT "ExperimentFoundationRunV2_runRecipeId_fkey", ADD CONSTRAINT "ExperimentFoundationRunV2_runRecipeId_fkey" FOREIGN KEY ("runRecipeId") REFERENCES "ExperimentFoundationRunRecipeV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationRunCellV2" DROP CONSTRAINT "ExperimentFoundationRunCellV2_runId_fkey", ADD CONSTRAINT "ExperimentFoundationRunCellV2_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ExperimentFoundationRunV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ExperimentFoundationRunCellV2" DROP CONSTRAINT "ExperimentFoundationRunCellV2_trainingTaskSpecId_fkey", ADD CONSTRAINT "ExperimentFoundationRunCellV2_trainingTaskSpecId_fkey" FOREIGN KEY ("trainingTaskSpecId") REFERENCES "ExperimentFoundationTrainingTaskSpecV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Fixed contract versions are database invariants as well as repository read
-- fences. These checks make malformed direct writes fail before persistence.
ALTER TABLE "PaperImplementationExperimentWorkOrderBranchV2"
  ADD CONSTRAINT "pi_ewo_branch_frame_schema_check" CHECK ("branchFrameSchemaVersion" = 'v1');
ALTER TABLE "PaperImplementationExperimentWorkOrderRevisionV2"
  ADD CONSTRAINT "pi_ewo_revision_snapshot_schema_check" CHECK ("workOrderSnapshotSchemaVersion" = 'v1');
ALTER TABLE "PaperImplementationExperimentWorkOrderRevisionCellV2"
  ADD CONSTRAINT "pi_ewo_cell_parameters_schema_check" CHECK ("parametersSchemaVersion" = 'v1'),
  ADD CONSTRAINT "pi_ewo_cell_required_result_schema_check" CHECK ("requiredResultSchemaVersion" = 'v1');
ALTER TABLE "ExperimentFoundationAssetLifecycleEventV2"
  ADD CONSTRAINT "ef_asset_lifecycle_event_schema_check" CHECK ("eventSchemaVersion" = 'v1');
ALTER TABLE "ExperimentFoundationRunRecipeV2"
  ADD CONSTRAINT "ef_run_recipe_schema_check" CHECK ("recipeSchemaVersion" = 'v1');
ALTER TABLE "ExperimentFoundationTrainingTaskSpecV2"
  ADD CONSTRAINT "ef_task_spec_schema_check" CHECK ("taskSpecSchemaVersion" = 'v1');

-- Pack B already introduced these names; rebuild them in the hardening step so
-- the database fence remains aligned with the repository's fixed-version read.
ALTER TABLE "ExperimentFoundationExecutionAttemptEventV2"
  DROP CONSTRAINT "ef_attempt_event_schema_check",
  ADD CONSTRAINT "ef_attempt_event_schema_check" CHECK ("eventSchemaVersion" = 'v1');
ALTER TABLE "ExperimentFoundationProviderCommandV2"
  DROP CONSTRAINT "ef_provider_command_schema_check",
  ADD CONSTRAINT "ef_provider_command_schema_check" CHECK ("commandSchemaVersion" = 'v1');
