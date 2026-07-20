-- CreateTable
CREATE TABLE "PaperImplementationRunEvidenceUnitV2" (
    "id" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "implementationProjectId" TEXT NOT NULL,
    "validationCycleId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "workOrderRevisionId" TEXT NOT NULL,
    "workOrderRevisionHash" TEXT NOT NULL,
    "branchRevisionSequence" INTEGER NOT NULL,
    "runId" TEXT NOT NULL,
    "runManifestHash" TEXT NOT NULL,
    "evidenceCandidateId" TEXT NOT NULL,
    "evidenceCandidateContentHash" TEXT NOT NULL,
    "validationReportId" TEXT NOT NULL,
    "validationHash" TEXT NOT NULL,
    "evaluationProtocolRevisionId" TEXT NOT NULL,
    "evaluationProtocolContentHash" TEXT NOT NULL,
    "ingestIdempotencyKey" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PaperImplementationRunEvidenceUnitV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperImplementationEvidenceTraceManifestV2" (
    "id" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "runEvidenceUnitId" TEXT NOT NULL,
    "orderedTraceRefCount" INTEGER NOT NULL,
    "traceRefsJson" JSONB NOT NULL DEFAULT '{}',
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PaperImplementationEvidenceTraceManifestV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperImplementationValidationCycleClosureV2" (
    "id" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "validationCycleId" TEXT NOT NULL,
    "implementationProjectId" TEXT NOT NULL,
    "cycleVersionAtClosure" INTEGER NOT NULL,
    "closureKind" TEXT NOT NULL,
    "scientificDisposition" TEXT,
    "selectedExitKey" TEXT,
    "acceptedProposalId" TEXT,
    "acceptedProposalHash" TEXT,
    "orderedBranchCount" INTEGER NOT NULL,
    "closureWatermarkJson" JSONB NOT NULL DEFAULT '{}',
    "closureInputHash" TEXT NOT NULL,
    "closureSnapshotHash" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PaperImplementationValidationCycleClosureV2_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pi_reu_run_unique" ON "PaperImplementationRunEvidenceUnitV2"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "pi_reu_candidate_unique" ON "PaperImplementationRunEvidenceUnitV2"("evidenceCandidateId");

-- CreateIndex
CREATE UNIQUE INDEX "pi_reu_report_unique" ON "PaperImplementationRunEvidenceUnitV2"("validationReportId");

-- CreateIndex
CREATE UNIQUE INDEX "pi_reu_ingest_idempotency_unique" ON "PaperImplementationRunEvidenceUnitV2"("ingestIdempotencyKey");

-- CreateIndex
CREATE INDEX "pi_reu_cycle_idx" ON "PaperImplementationRunEvidenceUnitV2"("validationCycleId");

-- CreateIndex
CREATE INDEX "pi_reu_project_cycle_idx" ON "PaperImplementationRunEvidenceUnitV2"("implementationProjectId", "validationCycleId");

-- CreateIndex
CREATE UNIQUE INDEX "pi_reu_exact_content_unique" ON "PaperImplementationRunEvidenceUnitV2"("id", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "pi_evidence_trace_reu_unique" ON "PaperImplementationEvidenceTraceManifestV2"("runEvidenceUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "pi_evidence_trace_exact_content_unique" ON "PaperImplementationEvidenceTraceManifestV2"("id", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "pi_cycle_closure_cycle_unique" ON "PaperImplementationValidationCycleClosureV2"("validationCycleId");

-- CreateIndex
CREATE UNIQUE INDEX "pi_cycle_closure_idempotency_unique" ON "PaperImplementationValidationCycleClosureV2"("idempotencyKey");

-- CreateIndex
CREATE INDEX "pi_cycle_closure_project_idx" ON "PaperImplementationValidationCycleClosureV2"("implementationProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "pi_cycle_closure_exact_snapshot_unique" ON "PaperImplementationValidationCycleClosureV2"("id", "closureSnapshotHash");

-- AddForeignKey
ALTER TABLE "PaperImplementationRunEvidenceUnitV2" ADD CONSTRAINT "pi_reu_branch_fkey" FOREIGN KEY ("branchId") REFERENCES "PaperImplementationExperimentWorkOrderBranchV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PaperImplementationRunEvidenceUnitV2" ADD CONSTRAINT "pi_reu_revision_exact_fkey" FOREIGN KEY ("branchId", "workOrderRevisionId", "branchRevisionSequence") REFERENCES "PaperImplementationExperimentWorkOrderRevisionV2"("branchId", "id", "revisionSequence") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PaperImplementationEvidenceTraceManifestV2" ADD CONSTRAINT "pi_evidence_trace_reu_fkey" FOREIGN KEY ("runEvidenceUnitId") REFERENCES "PaperImplementationRunEvidenceUnitV2"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
