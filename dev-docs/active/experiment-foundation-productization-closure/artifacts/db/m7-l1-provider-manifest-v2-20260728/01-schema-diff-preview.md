# Schema diff preview

Migration:
`prisma/migrations/20260728140500_enable_real_provider_payload_manifest_v2/migration.sql`

SHA-256:
`b98ec999e137f38adae4f26a3f54164bc6cbc26b40d64f3d559a76ce09cfb931`

The migration drops and recreates only
`ef_provider_payload_manifest_version_check` on
`ExperimentFoundationProviderPayloadV2`.

The replacement CHECK:

- keeps `simulation` restricted to redacted manifest v1;
- admits redacted manifest v1 or v2 only for `real_provider`;
- requires `redactedManifestJson` to be an object;
- binds the JSON `manifest_schema_version` to the relational
  `redactedManifestVersion`.

The SQL has no insert, update, delete, backfill, column change, index change or
table creation. Prisma drift against a disposable pgvector PostgreSQL database
was empty before this named-local apply.
