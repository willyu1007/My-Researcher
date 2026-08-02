CREATE TABLE "PaperImplementationExplorationSpecAttachmentV2" (
    "id" TEXT NOT NULL,
    "specId" TEXT NOT NULL,
    "specRevision" INTEGER NOT NULL,
    "specRevisionId" TEXT NOT NULL,
    "specContentHash" TEXT NOT NULL,
    "implementationProjectId" TEXT NOT NULL,
    "validationCycleId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "branchKey" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "approvedPlanHash" TEXT NOT NULL,
    "attachedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pi_exploration_attachment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pi_exploration_attachment_revision_positive" CHECK ("specRevision" > 0)
);

CREATE TABLE "PaperImplementationExplorationSpecAttachmentReceiptV2" (
    "id" TEXT NOT NULL,
    "businessIdempotencyKey" TEXT NOT NULL,
    "commandHash" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "specRevisionId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pi_exploration_attachment_receipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pi_ewo_branch_attachment_scope_unique"
ON "PaperImplementationExperimentWorkOrderBranchV2"("id", "implementationProjectId", "validationCycleId", "branchKey");

CREATE UNIQUE INDEX "pi_ewo_admission_attachment_exact_unique"
ON "PaperImplementationExperimentWorkOrderAdmissionV2"("id", "branchId", "revisionId", "approvedPlanHash");

CREATE UNIQUE INDEX "pi_exploration_attachment_spec_revision_id_unique"
ON "PaperImplementationExplorationSpecAttachmentV2"("specRevisionId");
CREATE UNIQUE INDEX "pi_exploration_attachment_revision_unique"
ON "PaperImplementationExplorationSpecAttachmentV2"("revisionId");
CREATE UNIQUE INDEX "pi_exploration_attachment_admission_unique"
ON "PaperImplementationExplorationSpecAttachmentV2"("admissionId");
CREATE UNIQUE INDEX "pi_exploration_attachment_spec_exact_unique"
ON "PaperImplementationExplorationSpecAttachmentV2"("specId", "specRevision");
CREATE UNIQUE INDEX "pi_exploration_attachment_identity_unique"
ON "PaperImplementationExplorationSpecAttachmentV2"("id", "specRevisionId");

CREATE UNIQUE INDEX "pi_exploration_attachment_revision_exact_unique"
ON "PaperImplementationExplorationSpecAttachmentV2"("branchId", "revisionId", "approvedPlanHash");
CREATE UNIQUE INDEX "pi_exploration_attachment_admission_exact_unique"
ON "PaperImplementationExplorationSpecAttachmentV2"("admissionId", "branchId", "revisionId", "approvedPlanHash");
CREATE INDEX "pi_exploration_attachment_scope_idx"
ON "PaperImplementationExplorationSpecAttachmentV2"("implementationProjectId", "validationCycleId");
CREATE INDEX "pi_exploration_attachment_branch_idx"
ON "PaperImplementationExplorationSpecAttachmentV2"("branchId", "branchKey");

CREATE UNIQUE INDEX "pi_exploration_attachment_receipt_business_unique"
ON "PaperImplementationExplorationSpecAttachmentReceiptV2"("businessIdempotencyKey");
CREATE INDEX "pi_exploration_attachment_receipt_attachment_idx"
ON "PaperImplementationExplorationSpecAttachmentReceiptV2"("attachmentId");

ALTER TABLE "PaperImplementationExplorationSpecAttachmentV2"
ADD CONSTRAINT "pi_exploration_attachment_branch_exact_fkey"
FOREIGN KEY ("branchId", "implementationProjectId", "validationCycleId", "branchKey")
REFERENCES "PaperImplementationExperimentWorkOrderBranchV2"("id", "implementationProjectId", "validationCycleId", "branchKey")
ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "PaperImplementationExplorationSpecAttachmentV2"
ADD CONSTRAINT "pi_exploration_attachment_revision_exact_fkey"
FOREIGN KEY ("branchId", "revisionId", "approvedPlanHash")
REFERENCES "PaperImplementationExperimentWorkOrderRevisionV2"("branchId", "id", "approvedPlanHash")
ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "PaperImplementationExplorationSpecAttachmentV2"
ADD CONSTRAINT "pi_exploration_attachment_admission_exact_fkey"
FOREIGN KEY ("admissionId", "branchId", "revisionId", "approvedPlanHash")
REFERENCES "PaperImplementationExperimentWorkOrderAdmissionV2"("id", "branchId", "revisionId", "approvedPlanHash")
ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "PaperImplementationExplorationSpecAttachmentReceiptV2"
ADD CONSTRAINT "pi_exploration_attachment_receipt_attachment_fkey"
FOREIGN KEY ("attachmentId", "specRevisionId")
REFERENCES "PaperImplementationExplorationSpecAttachmentV2"("id", "specRevisionId")
ON DELETE RESTRICT ON UPDATE RESTRICT;
