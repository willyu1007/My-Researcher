ALTER TABLE "TopicSelectionResearchArenaRoleExecution"
  ADD COLUMN "executionIdentityStatus" TEXT NOT NULL DEFAULT 'legacy_unverified',
  ADD COLUMN "agentInvocationAuditRef" JSONB,
  ADD COLUMN "agentInvocationAuditHash" TEXT,
  ADD COLUMN "executionProvenanceHash" TEXT;

ALTER TABLE "TopicSelectionResearchArenaRoleExecution"
  DROP CONSTRAINT "tsrare_schema_chk",
  ADD CONSTRAINT "tsrare_schema_chk" CHECK (
    "schemaVersion" IN (
      'TopicSelectionResearchArenaRoleExecution@v1',
      'TopicSelectionResearchArenaRoleExecution@v2'
    )
  );

ALTER TABLE "TopicSelectionResearchArenaRoleExecution"
  ADD CONSTRAINT "tsrare_execution_identity_chk" CHECK (
    (
      "schemaVersion" = 'TopicSelectionResearchArenaRoleExecution@v1'
      AND "executionIdentityStatus" = 'legacy_unverified'
      AND "agentInvocationAuditRef" IS NULL
      AND "agentInvocationAuditHash" IS NULL
      AND "executionProvenanceHash" IS NULL
    )
    OR
    (
      "schemaVersion" = 'TopicSelectionResearchArenaRoleExecution@v2'
      AND "executionIdentityStatus" = 'product_invocation_verified'
      AND "agentInvocationAuditRef" IS NOT NULL
      AND "agentInvocationAuditHash" ~ '^[a-f0-9]{64}$'
      AND "executionProvenanceHash" ~ '^[a-f0-9]{64}$'
    )
  );

CREATE INDEX "tsrare_invocation_audit_idx"
  ON "TopicSelectionResearchArenaRoleExecution"("agentInvocationAuditHash");

ALTER TABLE "TopicSelectionNeedCandidate"
  ADD COLUMN "semanticGroupKey" TEXT,
  ADD COLUMN "currentArenaAdvisory" JSONB;

CREATE INDEX "tsnc_semantic_group_idx"
  ON "TopicSelectionNeedCandidate"("semanticGroupKey");
