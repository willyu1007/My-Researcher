-- T-132 M7-L1: ExecutionBundle@v2 is an additive content-schema revision.
-- Keep legacy v1 rows valid while binding the relational discriminator to the
-- exact JSON snapshot version for both mutable drafts and immutable revisions.
ALTER TABLE "ExperimentFoundationExecutionBundleDraftV2"
  DROP CONSTRAINT "ef_execution_bundle_draft_schema_check",
  ADD CONSTRAINT "ef_execution_bundle_draft_schema_check"
    CHECK (
      "schemaVersion" IN ('v1', 'v2')
      AND "draftSnapshotJson"->>'execution_bundle_schema_version' = "schemaVersion"
    );

ALTER TABLE "ExperimentFoundationExecutionBundleRevisionV2"
  DROP CONSTRAINT "ef_execution_bundle_revision_schema_check",
  ADD CONSTRAINT "ef_execution_bundle_revision_schema_check"
    CHECK (
      "schemaVersion" IN ('v1', 'v2')
      AND "revisionJson"->>'execution_bundle_schema_version' = "schemaVersion"
    );
