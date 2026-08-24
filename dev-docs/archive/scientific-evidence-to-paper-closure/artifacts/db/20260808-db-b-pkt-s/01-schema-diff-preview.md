# T-136 DB-B / PKT-S schema diff preview

## Reviewed delta

- Add eight nullable compatibility columns to `ExperimentFoundationExperimentResultV2`: Collection/source id-hash-kind-class, parser profile version/hash and derivation hash.
- Replace the independent ProvisionalOutput kind/class/version checks with one closed tuple admitting the historical diagnostic contract or exactly `scientific_result_manifest / scientific_source / ExperimentFoundationScientificSourceManifest@v1`.
- Extend Result schema versions from v1 to v1/v2 and add a closed source contract: v1 requires all eight fields null; v2 requires the complete real-provider scientific spine and canonical hashes.
- Add exact Result→Collection/Attempt and Result→ProvisionalOutput composite FKs with `RESTRICT/RESTRICT`, plus unique Collection/source ownership and an exact source reference target.
- Add four nullable Packet compatibility columns: schema version, Closure id/hash and Packet content hash.
- Add a closed legacy/v2 Packet check, unique Closure ownership and an exact `(closureId, closureSnapshotHash, validationCycleId)` FK with `RESTRICT/RESTRICT`.

## Scope controls

- One migration; zero new tables; zero historical DML/backfill; zero cross-domain PI↔EF FK.
- No parser/derivation query indexes without an observed query need.
- Prisma uses list-valued reverse navigation for the three physically one-to-one relations so the schema does not add redundant composite unique indexes only to satisfy ORM navigation typing.

## Drift preview

The first `pnpm ci:prisma-drift` attempt omitted the PostgreSQL role in the URL and failed P1010 before schema work; `03-execution-log.md` retains the operator error summary. The corrected command used an explicit local role against the same disposable shadow target and returned zero drift. Empty generated drift output and failed smoke logs are intentionally not retained because the reviewed result is fully recorded in the task evidence.
