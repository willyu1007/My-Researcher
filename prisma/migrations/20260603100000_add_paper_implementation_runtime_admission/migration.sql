-- Add persistent PaperImplementation runtime/admission records for T-114.
-- Runtime artifacts store queryable identity metadata plus the validated envelope.
-- Admission records store the policy comparison result and admitted artifact ref.
-- These tables intentionally do not store prompt text, provider responses, or
-- compatibility wrapper payloads.

CREATE TABLE "PaperImplementationRuntimeArtifact" (
  "id" TEXT NOT NULL,
  "artifactIdentityHash" TEXT NOT NULL,
  "runtimeIdentityHash" TEXT NOT NULL,
  "implementationProjectId" TEXT NOT NULL,
  "workflowType" TEXT NOT NULL,
  "slotId" TEXT NOT NULL,
  "artifactScope" TEXT NOT NULL,
  "artifactContractId" TEXT NOT NULL,
  "artifactContractVersion" TEXT NOT NULL,
  "targetRefType" TEXT NOT NULL,
  "targetRefId" TEXT NOT NULL,
  "targetVersionId" TEXT,
  "targetRef" JSONB NOT NULL DEFAULT '{}',
  "inputSnapshotRef" JSONB NOT NULL DEFAULT '{}',
  "inputSnapshotHash" TEXT NOT NULL,
  "sourceHashBundleHash" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL,
  "roleSlotId" TEXT,
  "callIndex" INTEGER,
  "priorRoleArtifactRefs" JSONB NOT NULL DEFAULT '[]',
  "priorRoleArtifactHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "roleChainHash" TEXT NOT NULL,
  "finalArtifactRef" JSONB,
  "finalArtifactHash" TEXT,
  "runMode" TEXT NOT NULL,
  "executionMode" TEXT NOT NULL,
  "executorKind" TEXT NOT NULL,
  "modelProfileId" TEXT NOT NULL,
  "modelOptionId" TEXT,
  "runtimeStatus" TEXT NOT NULL,
  "runtimeFailureCode" TEXT,
  "retryAttemptIndex" INTEGER NOT NULL,
  "providerCallCount" INTEGER NOT NULL,
  "responseReuseStatus" TEXT NOT NULL,
  "responseReuseDecisionRef" JSONB,
  "responseReuseDecisionHash" TEXT,
  "allowedSideEffects" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "retrievalPacketRef" JSONB,
  "retrievalPacketHash" TEXT,
  "reviewedStatementPacketRef" JSONB,
  "reviewedStatementPacketHash" TEXT,
  "contextPacketRef" JSONB NOT NULL DEFAULT '{}',
  "contextPacketHash" TEXT NOT NULL,
  "runtimeInvocationContextHash" TEXT NOT NULL,
  "contextPolicyProfileHash" TEXT NOT NULL,
  "cachePolicyProfileHash" TEXT NOT NULL,
  "sourceRefs" JSONB NOT NULL DEFAULT '[]',
  "sourceHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "promptPacketRef" JSONB NOT NULL DEFAULT '{}',
  "promptPacketHash" TEXT NOT NULL,
  "promptTemplateId" TEXT NOT NULL,
  "promptTemplateVersionId" TEXT NOT NULL,
  "promptVariantId" TEXT NOT NULL,
  "promptRedactionPolicyHash" TEXT NOT NULL,
  "outputSchemaId" TEXT NOT NULL,
  "contextCacheKeyHash" TEXT NOT NULL,
  "contextCacheStatus" TEXT NOT NULL,
  "contextCacheResultRef" JSONB,
  "contextCacheResultHash" TEXT,
  "promptPacketCacheKeyHash" TEXT NOT NULL,
  "promptPacketCacheStatus" TEXT NOT NULL,
  "promptPacketCacheResultRef" JSONB,
  "promptPacketCacheResultHash" TEXT,
  "tokenBudgetGateResultRef" JSONB NOT NULL DEFAULT '{}',
  "tokenBudgetGateResultHash" TEXT NOT NULL,
  "compressionPolicyProfileHash" TEXT NOT NULL,
  "compressionStatus" TEXT NOT NULL,
  "compressionReportRef" JSONB,
  "compressionReportHash" TEXT,
  "compressedContextPacketRef" JSONB,
  "compressedContextPacketHash" TEXT,
  "artifactPayloadRef" JSONB NOT NULL DEFAULT '{}',
  "artifactPayloadHash" TEXT NOT NULL,
  "outputHash" TEXT NOT NULL,
  "runtimeAuditRef" JSONB NOT NULL DEFAULT '{}',
  "runtimeAuditHash" TEXT NOT NULL,
  "blockerCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "warningCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "envelope" JSONB NOT NULL DEFAULT '{}',

  CONSTRAINT "PaperImplementationRuntimeArtifact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaperImplementationRuntimeAdmissionRecord" (
  "id" TEXT NOT NULL,
  "implementationProjectId" TEXT NOT NULL,
  "workflowType" TEXT NOT NULL,
  "slotId" TEXT NOT NULL,
  "admissionScope" TEXT NOT NULL,
  "admissionPolicyId" TEXT NOT NULL,
  "admissionPolicyVersion" TEXT NOT NULL,
  "runtimeArtifactRef" JSONB NOT NULL DEFAULT '{}',
  "runtimeArtifactHash" TEXT NOT NULL,
  "runtimeArtifactId" TEXT NOT NULL,
  "artifactContractId" TEXT NOT NULL,
  "targetRefType" TEXT NOT NULL,
  "targetRefId" TEXT NOT NULL,
  "targetVersionId" TEXT,
  "targetRef" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ(6) NOT NULL,
  "expectedRuntimeIdentityHash" TEXT NOT NULL,
  "expectedSourceHashBundleHash" TEXT NOT NULL,
  "expectedRetrievalPacketHash" TEXT,
  "expectedPromptPacketHash" TEXT NOT NULL,
  "expectedOutputSchemaId" TEXT NOT NULL,
  "expectedPriorRoleArtifactHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "expectedFinalArtifactHash" TEXT,
  "observedRuntimeIdentityHash" TEXT NOT NULL,
  "observedSourceHashBundleHash" TEXT NOT NULL,
  "observedRetrievalPacketHash" TEXT,
  "observedPromptPacketHash" TEXT NOT NULL,
  "observedOutputSchemaId" TEXT NOT NULL,
  "observedPriorRoleArtifactHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "observedOutputHash" TEXT NOT NULL,
  "admissionStatus" TEXT NOT NULL,
  "admissionIdentity" JSONB NOT NULL DEFAULT '{}',
  "admissionIdentityHash" TEXT NOT NULL,
  "admittedArtifactRef" JSONB,
  "admittedArtifactHash" TEXT,
  "issueCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "warningCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "recordPayload" JSONB NOT NULL DEFAULT '{}',

  CONSTRAINT "PaperImplementationRuntimeAdmissionRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pi_runtime_artifact_project_created_idx"
  ON "PaperImplementationRuntimeArtifact" ("implementationProjectId", "createdAt" DESC);

CREATE INDEX "pi_runtime_artifact_slot_scope_idx"
  ON "PaperImplementationRuntimeArtifact" ("implementationProjectId", "slotId", "artifactScope");

CREATE INDEX "pi_runtime_artifact_workflow_status_idx"
  ON "PaperImplementationRuntimeArtifact" ("workflowType", "runtimeStatus");

CREATE INDEX "pi_runtime_artifact_target_idx"
  ON "PaperImplementationRuntimeArtifact" ("targetRefType", "targetRefId", "targetVersionId");

CREATE INDEX "pi_runtime_artifact_hash_idx"
  ON "PaperImplementationRuntimeArtifact" ("artifactIdentityHash");

CREATE INDEX "pi_runtime_artifact_identity_idx"
  ON "PaperImplementationRuntimeArtifact" ("runtimeIdentityHash");

CREATE INDEX "pi_runtime_artifact_source_hash_idx"
  ON "PaperImplementationRuntimeArtifact" ("sourceHashBundleHash");

CREATE INDEX "pi_runtime_artifact_prompt_hash_idx"
  ON "PaperImplementationRuntimeArtifact" ("promptPacketHash");

CREATE INDEX "pi_runtime_artifact_output_schema_idx"
  ON "PaperImplementationRuntimeArtifact" ("outputSchemaId");

CREATE INDEX "pi_runtime_artifact_audit_hash_idx"
  ON "PaperImplementationRuntimeArtifact" ("runtimeAuditHash");

CREATE INDEX "pi_runtime_admission_project_created_idx"
  ON "PaperImplementationRuntimeAdmissionRecord" ("implementationProjectId", "createdAt" DESC);

CREATE INDEX "pi_runtime_admission_scope_status_idx"
  ON "PaperImplementationRuntimeAdmissionRecord" (
    "implementationProjectId",
    "admissionScope",
    "admissionStatus"
  );

CREATE INDEX "pi_runtime_admission_artifact_idx"
  ON "PaperImplementationRuntimeAdmissionRecord" ("runtimeArtifactId");

CREATE INDEX "pi_runtime_admission_policy_idx"
  ON "PaperImplementationRuntimeAdmissionRecord" ("admissionPolicyId", "admissionPolicyVersion");

CREATE INDEX "pi_runtime_admission_target_idx"
  ON "PaperImplementationRuntimeAdmissionRecord" ("targetRefType", "targetRefId", "targetVersionId");

CREATE INDEX "pi_runtime_admission_identity_idx"
  ON "PaperImplementationRuntimeAdmissionRecord" ("admissionIdentityHash");

CREATE UNIQUE INDEX "pi_runtime_admission_identity_unique"
  ON "PaperImplementationRuntimeAdmissionRecord" ("implementationProjectId", "admissionIdentityHash");

CREATE INDEX "pi_runtime_admission_expected_prompt_idx"
  ON "PaperImplementationRuntimeAdmissionRecord" ("expectedPromptPacketHash");

CREATE INDEX "pi_runtime_admission_observed_prompt_idx"
  ON "PaperImplementationRuntimeAdmissionRecord" ("observedPromptPacketHash");

CREATE INDEX "pi_runtime_admission_output_hash_idx"
  ON "PaperImplementationRuntimeAdmissionRecord" ("observedOutputHash");
