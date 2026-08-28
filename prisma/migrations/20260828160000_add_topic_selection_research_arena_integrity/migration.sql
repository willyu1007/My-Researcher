CREATE TABLE "TopicSelectionResearchArenaSession" (
    "id" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "currentArenaKey" TEXT,
    "workspaceId" TEXT,
    "titleCardId" TEXT NOT NULL,
    "arenaKind" TEXT NOT NULL,
    "targetRefType" TEXT NOT NULL,
    "targetRefId" TEXT NOT NULL,
    "targetVersionId" TEXT,
    "inputSnapshotId" TEXT NOT NULL,
    "inputSnapshotHash" TEXT NOT NULL,
    "participantPlanHash" TEXT NOT NULL,
    "participantRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "executionPlanRef" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL,
    "terminationReason" TEXT,
    "loopTranscriptRef" JSONB,
    "loopTranscriptHash" TEXT,
    "loopDeltaRefs" JSONB NOT NULL DEFAULT '[]',
    "supportOnly" BOOLEAN NOT NULL DEFAULT true,
    "supersedesArenaSessionId" TEXT,
    "supersededByArenaSessionId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "synthesizedAt" TIMESTAMPTZ(6),
    "supersededAt" TIMESTAMPTZ(6),

    CONSTRAINT "TopicSelectionResearchArenaSession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tsras_schema_chk" CHECK ("schemaVersion" = 'TopicSelectionResearchArenaSession@v1'),
    CONSTRAINT "tsras_kind_chk" CHECK ("arenaKind" IN ('evidence_landscape', 'gap_portfolio', 'question_design', 'comparative_value')),
    CONSTRAINT "tsras_status_chk" CHECK ("status" IN ('open', 'synthesized', 'superseded')),
    CONSTRAINT "tsras_termination_chk" CHECK (
      "terminationReason" IS NULL OR "terminationReason" IN (
        'recommendation_ready', 'none_viable', 'evidence_expansion_required',
        'reframe_required', 'human_hold', 'policy_blocked'
      )
    ),
    CONSTRAINT "tsras_hash_chk" CHECK (
      "inputSnapshotHash" ~ '^[a-f0-9]{64}$'
      AND "participantPlanHash" ~ '^[a-f0-9]{64}$'
      AND ("loopTranscriptHash" IS NULL OR "loopTranscriptHash" ~ '^[a-f0-9]{64}$')
    ),
    CONSTRAINT "tsras_roles_chk" CHECK (
      cardinality("participantRoles") BETWEEN 2 AND 4
      AND "participantRoles" <@ ARRAY[
        'opportunity_scout', 'prior_art_topic_killer', 'empirical_skeptic', 'synthesis_arbiter'
      ]::TEXT[]
      AND cardinality(array_positions("participantRoles", 'opportunity_scout')) <= 1
      AND cardinality(array_positions("participantRoles", 'prior_art_topic_killer')) <= 1
      AND cardinality(array_positions("participantRoles", 'empirical_skeptic')) <= 1
      AND cardinality(array_positions("participantRoles", 'synthesis_arbiter')) <= 1
    ),
    CONSTRAINT "tsras_json_chk" CHECK (
      jsonb_typeof("executionPlanRef") = 'object'
      AND ("loopTranscriptRef" IS NULL OR jsonb_typeof("loopTranscriptRef") = 'object')
      AND jsonb_typeof("loopDeltaRefs") = 'array'
    ),
    CONSTRAINT "tsras_support_chk" CHECK ("supportOnly" = true),
    CONSTRAINT "tsras_current_chk" CHECK (
      ("status" = 'superseded' AND "currentArenaKey" IS NULL
        AND "supersededByArenaSessionId" IS NOT NULL AND "supersededAt" IS NOT NULL)
      OR ("status" IN ('open', 'synthesized') AND "currentArenaKey" IS NOT NULL
        AND "supersededByArenaSessionId" IS NULL AND "supersededAt" IS NULL)
    ),
    CONSTRAINT "tsras_synthesis_chk" CHECK (
      ("status" = 'open' AND "terminationReason" IS NULL
        AND "loopTranscriptRef" IS NULL AND "loopTranscriptHash" IS NULL AND "synthesizedAt" IS NULL)
      OR ("status" = 'synthesized' AND "terminationReason" IS NOT NULL
        AND "loopTranscriptRef" IS NOT NULL AND "loopTranscriptHash" IS NOT NULL AND "synthesizedAt" IS NOT NULL)
      OR "status" = 'superseded'
    ),
    CONSTRAINT "tsras_delta_chk" CHECK (
      "supersedesArenaSessionId" IS NULL OR jsonb_array_length("loopDeltaRefs") > 0
    )
);

CREATE TABLE "TopicSelectionResearchArenaRoleExecution" (
    "id" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "arenaSessionId" TEXT NOT NULL,
    "titleCardId" TEXT NOT NULL,
    "roleSlotId" TEXT NOT NULL,
    "instanceIndex" INTEGER NOT NULL,
    "participantRole" TEXT NOT NULL,
    "passKind" TEXT NOT NULL,
    "inputSnapshotId" TEXT NOT NULL,
    "inputSnapshotHash" TEXT NOT NULL,
    "queryIntent" JSONB NOT NULL DEFAULT '{}',
    "evidencePacketArtifactRef" JSONB NOT NULL DEFAULT '{}',
    "evidencePacketHash" TEXT NOT NULL,
    "evidencePartitionRefs" JSONB NOT NULL DEFAULT '[]',
    "retrievalProvenance" JSONB NOT NULL DEFAULT '{}',
    "exposureArtifactRefs" JSONB NOT NULL DEFAULT '[]',
    "exposureSetHash" TEXT NOT NULL,
    "outputArtifactRef" JSONB NOT NULL DEFAULT '{}',
    "outputArtifactHash" TEXT NOT NULL,
    "semanticPositionHash" TEXT NOT NULL,
    "priorRoleHashes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "runtimeIdentityHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TopicSelectionResearchArenaRoleExecution_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tsrare_schema_chk" CHECK ("schemaVersion" = 'TopicSelectionResearchArenaRoleExecution@v1'),
    CONSTRAINT "tsrare_role_chk" CHECK (
      "participantRole" IN ('opportunity_scout', 'prior_art_topic_killer', 'empirical_skeptic', 'synthesis_arbiter')
    ),
    CONSTRAINT "tsrare_pass_chk" CHECK ("passKind" IN ('first_pass', 'supplemental', 'synthesis')),
    CONSTRAINT "tsrare_index_chk" CHECK ("instanceIndex" >= 0),
    CONSTRAINT "tsrare_hash_chk" CHECK (
      "inputSnapshotHash" ~ '^[a-f0-9]{64}$'
      AND "evidencePacketHash" ~ '^[a-f0-9]{64}$'
      AND "exposureSetHash" ~ '^[a-f0-9]{64}$'
      AND "outputArtifactHash" ~ '^[a-f0-9]{64}$'
      AND "semanticPositionHash" ~ '^[a-f0-9]{64}$'
      AND "runtimeIdentityHash" ~ '^[a-f0-9]{64}$'
    ),
    CONSTRAINT "tsrare_json_chk" CHECK (
      jsonb_typeof("queryIntent") = 'object'
      AND jsonb_typeof("evidencePacketArtifactRef") = 'object'
      AND jsonb_typeof("evidencePartitionRefs") = 'array'
      AND jsonb_array_length("evidencePartitionRefs") > 0
      AND jsonb_typeof("retrievalProvenance") = 'object'
      AND jsonb_array_length(jsonb_path_query_array("retrievalProvenance", '$.hits[*]')) > 0
      AND jsonb_array_length(jsonb_path_query_array("retrievalProvenance", '$.hits[*] ? (@.is_stale == false)'))
        = jsonb_array_length(jsonb_path_query_array("retrievalProvenance", '$.hits[*]'))
      AND jsonb_typeof("exposureArtifactRefs") = 'array'
      AND jsonb_array_length("exposureArtifactRefs") > 0
      AND jsonb_typeof("outputArtifactRef") = 'object'
    ),
    CONSTRAINT "tsrare_first_pass_chk" CHECK (
      "passKind" <> 'first_pass' OR cardinality("priorRoleHashes") = 0
    )
);

CREATE UNIQUE INDEX "tsras_session_key" ON "TopicSelectionResearchArenaSession"("sessionKey");
CREATE UNIQUE INDEX "tsras_current_key" ON "TopicSelectionResearchArenaSession"("currentArenaKey");
CREATE INDEX "tsras_title_kind_created_idx" ON "TopicSelectionResearchArenaSession"("titleCardId", "arenaKind", "createdAt" DESC);
CREATE INDEX "tsras_status_idx" ON "TopicSelectionResearchArenaSession"("status");
CREATE INDEX "tsras_input_snapshot_idx" ON "TopicSelectionResearchArenaSession"("inputSnapshotId");
CREATE INDEX "tsras_supersedes_idx" ON "TopicSelectionResearchArenaSession"("supersedesArenaSessionId");

CREATE UNIQUE INDEX "tsrare_runtime_identity" ON "TopicSelectionResearchArenaRoleExecution"("runtimeIdentityHash");
CREATE INDEX "tsrare_session_created_idx" ON "TopicSelectionResearchArenaRoleExecution"("arenaSessionId", "createdAt");
CREATE INDEX "tsrare_role_pass_idx" ON "TopicSelectionResearchArenaRoleExecution"("participantRole", "passKind");
CREATE INDEX "tsrare_input_snapshot_idx" ON "TopicSelectionResearchArenaRoleExecution"("inputSnapshotId");
CREATE INDEX "tsrare_exposure_set_idx" ON "TopicSelectionResearchArenaRoleExecution"("exposureSetHash");
CREATE UNIQUE INDEX "tsrare_session_slot_instance" ON "TopicSelectionResearchArenaRoleExecution"("arenaSessionId", "roleSlotId", "instanceIndex");
CREATE UNIQUE INDEX "tsrare_session_semantic" ON "TopicSelectionResearchArenaRoleExecution"("arenaSessionId", "semanticPositionHash");

ALTER TABLE "TopicSelectionResearchArenaRoleExecution"
ADD CONSTRAINT "TopicSelectionResearchArenaRoleExecution_arenaSessionId_fkey"
FOREIGN KEY ("arenaSessionId") REFERENCES "TopicSelectionResearchArenaSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
