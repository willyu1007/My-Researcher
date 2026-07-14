# Pack A/Pack B named-local deep-cleanup addendum

## Scope

This addendum extends the historical Pack B landing and first cleanup record through final event-storage, relational and numeric-boundary hardening. The only writable target was the reviewed loopback local-development database at fingerprint `sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0`.

No dev/staging/prod/cloud database, product E1-E5, real provider/fetch, scientific writer/evidence, D-18 closure, product traffic or legacy writer was changed.

## Recovery point

- Archive: `/Volumes/DataDisk/Project/.backups/My-Researcher/packb-quality-remediation-20260714-r1/my_researcher_dev.pre-cleanup.dump`
- Exact size: `8399040887` bytes
- SHA-256: `0692d19e6e4ec2ea54389e229eae443b1c5f360e286a8203f9b4b979a4b00ecf`
- Verification: PostgreSQL 17 `pg_restore --list` passed.

The verified archive predates the cleanup sequence and remains the named-local recovery point. Failed or zero-byte attempts are not accepted as evidence.

## Final migration preview and apply

The cleanup sequence is additive:

- `20260714190000_remove_experiment_foundation_v2_placeholders`, SHA-256 `b3ddb7601d4b256b47d664fb5cea3694bcc5587c6eb41864ba3e61bf711abf6c`;
- `20260714210000_normalize_experiment_v2_event_payloads`, SHA-256 `37eed54494aa2dc246fe7d5a9b2de2a027474b416ada8a5f18ab4bc194a65f3a`.

Before the second migration was applied, the read-only named-local gate reused its Pack A authority census and recorded the exact event-table row counts:

- `PaperImplementationExperimentIntegrationInboxV2`: 0;
- `PaperImplementationExperimentIntegrationOutboxV2`: 0;
- `ExperimentFoundationIntegrationInboxV2`: 0;
- `ExperimentFoundationIntegrationOutboxV2`: 0.

That zero-row result was a necessary safety precondition for the reviewed `ADD ... NOT NULL` migration, not migration-apply authorization. The gate now always reports these four named counts when the migration is pending. Any future nonempty table produces blocker `EVENT_STORAGE_HARDENING_NONEMPTY_EVENT_TABLES`; the unchanged migration must not be applied, and a separately reviewed/authorized transform or replacement migration is required. A partially present hardening structure is a failure (`EVENT_STORAGE_HARDENING_UNTRACKED_OR_PARTIAL_SCHEMA`), not a blocked-ready state.

The final migration:

- stores only event payload JSON in the four PI/EF integration inbox/outbox tables;
- adds the structural fields needed to reconstruct each typed event envelope;
- verifies server-canonical payload hash and full-envelope hash independently;
- rewrites exactly 38 Pack A same-domain FKs to `ON DELETE RESTRICT ON UPDATE RESTRICT`;
- adds nine DB CHECK constraints for fields fixed at schema version v1, with matching repository read fences;
- adds no cross-domain FK, cascade, generic family, backfill, legacy semantic change or persisted eligibility/status.

Only the reviewed pending migrations were applied to `my_researcher_dev`. Source and database histories are both 62/62 and the schema is up to date. PostgreSQL `Int`-backed seed/repeat/run-policy values are bounded in shared/HTTP contracts to `-2147483648..2147483647`; revision/lifecycle/projection/state/head/relay/lease/attempt increments use the same upper-bound fence before mutation. OpenAPI mirrors the public persistence boundary over exactly 22 T-132 fields with `int32` plus maximums and signed minimums on both seed fields; a drift test owns that census and the API index was regenerated.

## Stable pre/post authority evidence

The named-local gate uses `pack-a-authority-id-ordered-row-json-sha256@v2`, which ignores only the 12 removed non-authoritative placeholders.

Both read-only observations produced:

- Pack A: 34/34 tables, 208 rows, digest `sha256:494cdf5a02e2379a66a12bc82411e8237f39e949a2f992f3e12a0e220f613d74`;
- Pack B: 6/6 tables, 0 rows;
- legacy: 257 rows, digest `sha256:f9e7a6875c9a3597ecb485abc978920e461a3af33f071c676665439dde17211d`;
- cross-domain PI-to-EF FK: 0.

The older physical Pack A digest belongs to a historical profile that included removed placeholders and is not compared to the semantic v2 digest.

## Final read-only confirmation

- Run: `packb-deep-cleanup-final-local-20260714-r18`
- Status: `passed`
- Failures/blockers: `[]` / `[]`
- Pack A/Pack B/combined tables: 34/34, 6/6, 40/40
- Pack B total rows: 0
- Legacy: 257 rows, digest `sha256:f9e7a6875c9a3597ecb485abc978920e461a3af33f071c676665439dde17211d`
- Database/environment/provider/scientific prohibited effects: 0
- Current configuration: admission=false, cutover=false, simulation=false
- Source artifact SHA-256: `53e269275d5b082d2b1f82ad6b2ed47a324380470479de3b0598be6a62a16a0c`

Focused read-only applied-path confirmation `event-storage-upgrade-preflight-applied-20260714-r1` also passed with no failures/blockers. Its preflight object derives from the Pack A authority census, names all four event tables at 0 rows, reports complete/exact applied structure and keeps `migration_apply_authorized=false`; database/environment/provider/fetch/scientific effects were all zero.

Migration history 62/62 and complete 238-table before/after parity are bound by the final r18 source artifacts and their checked-in published copies below.

## Final app-composition smoke

- Run: `packb-deep-cleanup-final-local-20260714-r18`
- Evidence schema: `experiment-foundation-packb-local-app-smoke@v5`
- Application tables: 238 before and after, exact table-set and row-digest parity
- Row profile: `sha256-length-prefixed-pg-jsonb-text-primary-key-order@v2`
- Transport: read-only repeatable-read cursor, catalog primary-key ordering, fetch size 64
- Background work: disabled
- Network: global fetch hard-denied
- Changed tables: 0
- External fetch attempts: 0
- Provider-command row delta: 0
- Source artifact SHA-256: `37d262fa11fc45015d5e24320e963459034df77f2857074e3fea9476891de1b9`

Durable evidence:

- `05-app-composition-smoke.json`; source artifact SHA-256 `37d262fa11fc45015d5e24320e963459034df77f2857074e3fea9476891de1b9`; strict-republished checked-in file SHA-256 `9f4e0e5f81d4f127ac1cd5c956c639a8f89a9406d0af873e5d06d2d039f10e4e`.
- `06-final-gate-summary.json`; source artifact SHA-256 `53e269275d5b082d2b1f82ad6b2ed47a324380470479de3b0598be6a62a16a0c`; publisher producer SHA-256 `982119a31989bbad1da51ae96892241bab90add1ee084031596f550350838c38`; strict-republished checked-in file SHA-256 `bd702c6aca7104248839da1bb224e711d9eee64ddf6a98e4824f713b03e8eaad`.

The publisher requires the exact local-gate/app-smoke evidence keysets, including every prohibited-effect zero and redaction key. Unknown, missing or substituted fields fail publication; the republish changed only publisher provenance/strict-validation metadata and preserved both r18 source artifact digests.

Disposable D-19/Pack B run summaries under `.ai/.tmp` are ephemeral and are deleted after final publication. This addendum and the checked-in v5/v4 JSON artifacts are the durable named-local evidence; the database conclusion does not depend on retaining temporary gate directories.

## Boundary conclusion

The named local-development schema is clean, 62/62 and default-off. Product E1-E5 remains unexecuted because there is no formal Pack A product-bound Run/head acknowledgement and no separate enablement authorization. No disposable fixture was promoted into product authority; no non-local database, provider/fetch, scientific evidence, D-18 closure or traffic cutover is claimed. Backend full suite completed with 2,083 tests: 2,034 passed, 0 failed, 49 conditional database/provider-canary skips, 0 todo, duration `396225.938458ms`. Those repository-wide conditional skips are not Pack A/Pack B database evidence; the forced disposable-PostgreSQL D-19 6/6 and Pack B 7/7 lanes, both with 0 skipped, are the task's database acceptance evidence.
