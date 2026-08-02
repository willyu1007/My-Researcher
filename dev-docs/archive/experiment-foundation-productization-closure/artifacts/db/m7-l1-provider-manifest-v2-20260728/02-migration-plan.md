# Migration plan

Status: **authorized 2026-07-28**.

Authorization permits applying only
`20260728140500_enable_real_provider_payload_manifest_v2` to the reviewed
named-local development PostgreSQL database. The owner accepts the risk of
proceeding without a new local backup.

Execution plan:

1. Require the exact target fingerprint and exactly one pending migration.
2. Record all application-table primary-key/xmin digests and the six Pack B
   execution-table counts in a read-only transaction.
3. Run versioned `prisma migrate deploy`; do not use `migrate dev` or
   `db push`.
4. Require migration status to be up to date and read back the exact CHECK.
5. Repeat the application-table digest and table-count census; require zero
   changed application tables and exact Run Attempt count 0.
6. Run the production `offline-preflight`; require cloud calls 0 and database
   writes 0.
7. Refresh the generated DB context and run the central database suite.

Cloud credentials, provider calls, capability changes and PAI Job creation are
outside this authorization.
