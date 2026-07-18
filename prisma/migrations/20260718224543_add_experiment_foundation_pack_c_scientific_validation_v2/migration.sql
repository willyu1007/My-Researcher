-- T-132 Pack C additive migration: EF scientific-validation v2 families only.
-- Pre-existing repository-wide index-name drift detected by prisma migrate diff
-- is intentionally EXCLUDED from this migration and tracked separately; this
-- file must stay additive to the three Pack C tables.

-- CreateTable
CREATE TABLE "ExperimentFoundationExperimentResultV2" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "runManifestHash" TEXT NOT NULL,
    "runCellId" TEXT NOT NULL,
    "cellKey" TEXT NOT NULL,
    "trainingTaskSpecId" TEXT NOT NULL,
    "trainingTaskSpecHash" TEXT NOT NULL,
    "executionAttemptId" TEXT NOT NULL,
    "provenance" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "metricObservationCount" INTEGER NOT NULL,
    "artifactObservationCount" INTEGER NOT NULL,
    "resultSnapshotJson" JSONB NOT NULL DEFAULT '{}',
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationExperimentResultV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationScientificValidationReportV2" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "runManifestHash" TEXT NOT NULL,
    "evaluationProtocolId" TEXT NOT NULL,
    "evaluationProtocolRevisionId" TEXT NOT NULL,
    "evaluationProtocolRevisionSequence" INTEGER NOT NULL,
    "evaluationProtocolContentHash" TEXT NOT NULL,
    "validatorProfileVersion" TEXT NOT NULL,
    "validatorProfileHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "orderedCellResultCount" INTEGER NOT NULL,
    "orderedRuleResultCount" INTEGER NOT NULL,
    "reportSnapshotJson" JSONB NOT NULL DEFAULT '{}',
    "validationHash" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationScientificValidationReportV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationEvidenceCandidateV2" (
    "id" TEXT NOT NULL,
    "validationReportId" TEXT NOT NULL,
    "validationHash" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "runManifestHash" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationEvidenceCandidateV2_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ef_experiment_result_run_cell_unique" ON "ExperimentFoundationExperimentResultV2"("runCellId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_experiment_result_attempt_unique" ON "ExperimentFoundationExperimentResultV2"("executionAttemptId");

-- CreateIndex
CREATE INDEX "ef_experiment_result_run_idx" ON "ExperimentFoundationExperimentResultV2"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_experiment_result_exact_content_unique" ON "ExperimentFoundationExperimentResultV2"("id", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_scientific_validation_run_unique" ON "ExperimentFoundationScientificValidationReportV2"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_scientific_validation_idempotency_unique" ON "ExperimentFoundationScientificValidationReportV2"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ef_scientific_validation_protocol_idx" ON "ExperimentFoundationScientificValidationReportV2"("evaluationProtocolRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_scientific_validation_exact_hash_unique" ON "ExperimentFoundationScientificValidationReportV2"("id", "validationHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_evidence_candidate_report_unique" ON "ExperimentFoundationEvidenceCandidateV2"("validationReportId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_evidence_candidate_run_unique" ON "ExperimentFoundationEvidenceCandidateV2"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_evidence_candidate_exact_content_unique" ON "ExperimentFoundationEvidenceCandidateV2"("id", "contentHash");

-- AddForeignKey
ALTER TABLE "ExperimentFoundationExperimentResultV2" ADD CONSTRAINT "ef_experiment_result_run_fkey" FOREIGN KEY ("runId", "runManifestHash") REFERENCES "ExperimentFoundationRunV2"("id", "runManifestHash") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationExperimentResultV2" ADD CONSTRAINT "ef_experiment_result_run_cell_fkey" FOREIGN KEY ("runId", "runCellId", "trainingTaskSpecId", "cellKey") REFERENCES "ExperimentFoundationRunCellV2"("runId", "id", "trainingTaskSpecId", "cellKey") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationExperimentResultV2" ADD CONSTRAINT "ef_experiment_result_task_spec_fkey" FOREIGN KEY ("trainingTaskSpecId", "trainingTaskSpecHash") REFERENCES "ExperimentFoundationTrainingTaskSpecV2"("id", "taskSpecHash") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationExperimentResultV2" ADD CONSTRAINT "ef_experiment_result_attempt_fkey" FOREIGN KEY ("executionAttemptId") REFERENCES "ExperimentFoundationExecutionAttemptV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationScientificValidationReportV2" ADD CONSTRAINT "ef_scientific_validation_run_fkey" FOREIGN KEY ("runId", "runManifestHash") REFERENCES "ExperimentFoundationRunV2"("id", "runManifestHash") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationScientificValidationReportV2" ADD CONSTRAINT "ef_scientific_validation_protocol_fkey" FOREIGN KEY ("evaluationProtocolId", "evaluationProtocolRevisionId", "evaluationProtocolContentHash") REFERENCES "ExperimentFoundationEvaluationProtocolRevisionV2"("evaluationProtocolId", "id", "contentHash") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationEvidenceCandidateV2" ADD CONSTRAINT "ef_evidence_candidate_report_fkey" FOREIGN KEY ("validationReportId", "validationHash") REFERENCES "ExperimentFoundationScientificValidationReportV2"("id", "validationHash") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationEvidenceCandidateV2" ADD CONSTRAINT "ef_evidence_candidate_run_fkey" FOREIGN KEY ("runId", "runManifestHash") REFERENCES "ExperimentFoundationRunV2"("id", "runManifestHash") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Pack C hardening: fixed schema versions, closed enums and snapshot mirrors
-- (same style as the Pack A/B deep-cleanup CHECK fences).
ALTER TABLE "ExperimentFoundationExperimentResultV2" ADD CONSTRAINT "ef_experiment_result_schema_version_check" CHECK ("schemaVersion" = 'v1');
ALTER TABLE "ExperimentFoundationExperimentResultV2" ADD CONSTRAINT "ef_experiment_result_provenance_check" CHECK ("provenance" = 'real_provider');
ALTER TABLE "ExperimentFoundationExperimentResultV2" ADD CONSTRAINT "ef_experiment_result_metric_count_check" CHECK ("metricObservationCount" >= 0);
ALTER TABLE "ExperimentFoundationExperimentResultV2" ADD CONSTRAINT "ef_experiment_result_artifact_count_check" CHECK ("artifactObservationCount" >= 0);
ALTER TABLE "ExperimentFoundationScientificValidationReportV2" ADD CONSTRAINT "ef_scientific_validation_schema_version_check" CHECK ("schemaVersion" = 'v1');
ALTER TABLE "ExperimentFoundationScientificValidationReportV2" ADD CONSTRAINT "ef_scientific_validation_status_check" CHECK ("status" IN ('passed', 'failed', 'unsupported'));
ALTER TABLE "ExperimentFoundationScientificValidationReportV2" ADD CONSTRAINT "ef_scientific_validation_profile_version_check" CHECK ("validatorProfileVersion" = 'scientific_validator_profile@v1');
ALTER TABLE "ExperimentFoundationScientificValidationReportV2" ADD CONSTRAINT "ef_scientific_validation_cell_count_check" CHECK ("orderedCellResultCount" >= 1);
ALTER TABLE "ExperimentFoundationScientificValidationReportV2" ADD CONSTRAINT "ef_scientific_validation_rule_count_check" CHECK ("orderedRuleResultCount" >= 1);
ALTER TABLE "ExperimentFoundationEvidenceCandidateV2" ADD CONSTRAINT "ef_evidence_candidate_schema_version_check" CHECK ("schemaVersion" = 'v1');
