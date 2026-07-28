-- T-132 M7-L1. Admit the existing real-provider redacted-manifest v2
-- discriminator without widening the simulation lane or changing row content.
-- The JSON discriminator remains relationally bound to the stored version.

ALTER TABLE "ExperimentFoundationProviderPayloadV2"
  DROP CONSTRAINT "ef_provider_payload_manifest_version_check",
  ADD CONSTRAINT "ef_provider_payload_manifest_version_check" CHECK (
    (jsonb_typeof("redactedManifestJson") = 'object')
    AND (
      ("redactedManifestJson" ->> 'manifest_schema_version')
      = "redactedManifestVersion"
    )
    AND (
      (
        ("executionMode" = 'simulation')
        AND ("redactedManifestVersion" = 'v1')
      )
      OR
      (
        ("executionMode" = 'real_provider')
        AND ("redactedManifestVersion" IN ('v1', 'v2'))
      )
    )
  );
