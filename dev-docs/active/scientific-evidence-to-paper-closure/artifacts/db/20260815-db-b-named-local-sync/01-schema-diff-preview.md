# Schema diff preview

The named-local database is behind the repo SSOT by the existing reviewed migration
`20260808090000_add_scientific_source_and_packet_closure_binding`.

## Additive changes

- Add eight nullable scientific-source binding columns to
  `ExperimentFoundationExperimentResultV2`.
- Replace the legacy diagnostic-only ProvisionalOutput CHECK with the closed
  diagnostic-or-scientific tuple.
- Add exact source/Collection indexes and foreign keys for source-bound Results.
- Add four nullable Closure/packet binding columns to
  `PaperImplementationResultInterpretationPacket`.
- Add exact Closure ownership indexes, CHECKs and foreign key.

## Destructive/data effects

- No table or column deletion.
- No DML or historical backfill.
- Existing legacy Result and Packet rows remain source/Closure-null under the migration's
  compatibility branch.
- Migration SQL is already tracked in the repository and has no uncommitted change.

The live failure evidence matches this diff: the current named-local constraint still admits
only `outputClass='diagnostic_only'`, while the repo migration admits the exact
`scientific_result_manifest/scientific_source/ExperimentFoundationScientificSourceManifest@v1`
tuple.
