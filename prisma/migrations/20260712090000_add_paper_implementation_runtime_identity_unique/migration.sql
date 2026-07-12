-- S2-C: runtime artifact identity idempotency — upgrade the identity index to unique.
-- runtimeIdentity now explicitly carries run_id (per-execution granularity), so
-- duplicates can only come from replaying the same slot execution; the second
-- writer must lose with 409 VERSION_CONFLICT (P2002 mapped in the repository).
DROP INDEX IF EXISTS "pi_runtime_artifact_identity_idx";
CREATE UNIQUE INDEX "pi_runtime_artifact_identity_idx" ON "PaperImplementationRuntimeArtifact"("runtimeIdentityHash");
