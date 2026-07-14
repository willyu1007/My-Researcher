-- VersionLock identity and its ordered exact dependency manifest are relational authority.
-- These never-read placeholder columns contained only a fixed schema tag and an empty object.
ALTER TABLE "ExperimentFoundationVersionLockV2"
  DROP COLUMN "lockSchemaVersion",
  DROP COLUMN "resolvedLockJson";

-- Typed asset drafts remain the single mutable snapshot. Their schema version
-- is part of that typed JSON, while canonical hashes belong only to immutable
-- revisions; the removed columns and hash indexes had no read path.
DROP INDEX "ef_dataset_v2_draft_hash_idx";
DROP INDEX "ef_data_policy_v2_draft_hash_idx";
DROP INDEX "ef_metric_definition_v2_draft_hash_idx";
DROP INDEX "ef_benchmark_v2_draft_hash_idx";
DROP INDEX "ef_evaluation_protocol_v2_draft_hash_idx";

ALTER TABLE "ExperimentFoundationDatasetV2"
  DROP COLUMN "draftSchemaVersion",
  DROP COLUMN "draftHash";

ALTER TABLE "ExperimentFoundationDataPolicyV2"
  DROP COLUMN "draftSchemaVersion",
  DROP COLUMN "draftHash";

ALTER TABLE "ExperimentFoundationMetricDefinitionV2"
  DROP COLUMN "draftSchemaVersion",
  DROP COLUMN "draftHash";

ALTER TABLE "ExperimentFoundationBenchmarkV2"
  DROP COLUMN "draftSchemaVersion",
  DROP COLUMN "draftHash";

ALTER TABLE "ExperimentFoundationEvaluationProtocolV2"
  DROP COLUMN "draftSchemaVersion",
  DROP COLUMN "draftHash";
