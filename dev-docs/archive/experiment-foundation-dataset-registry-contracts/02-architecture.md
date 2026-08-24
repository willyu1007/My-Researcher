# 02 Architecture

## Ownership Split
| Object | Owns | Must not own |
|---|---|---|
| `DatasetAsset` | id, name, aliases, description, source refs, task types, schema summary, default_version_id, catalog status | version label, checksum, storage path, URI, mirror status, split files |
| `DatasetVersion` | dataset_asset_id, version_label, checksum_manifest_id/hash, split_protocol_id/hash, data_policy_id, processing_recipe_id, location_ids, access/readiness status | asset-level identity, aliases, candidate review state |
| `DatasetLocation` | dataset_version_id, location kind, `LocalFileRef` or remote/object ref, availability, last checked timestamp | execution mirror lifecycle |
| `DatasetMirror` | dataset_version_id, provider, mirror ref, mirror status, source_checksum_manifest_hash, freshness, approval ref, run scope | canonical dataset metadata |
| `ChecksumManifest` | dataset_version_id, algorithm, manifest_hash, manifest_file_ref, entry count, total bytes | raw data blobs |
| `SplitProtocol` | dataset_version_id, split names, split file refs, generation method, seed, protocol_hash, leakage notes | evaluation metrics |
| `DataPolicy` | license/access/privacy/use/mirror rules and approval requirements | physical storage location |

## Required Invariants
- `DatasetAsset` MUST NOT contain `version`, `checksum`, `storage_ref`, `path`, `uri`, `location`, or `mirror` fields.
- A dataset version used by `RunRecipe` MUST have checksum manifest hash, split protocol hash, and data policy refs.
- `DatasetMirror` MUST reference a source dataset version and source checksum manifest hash.
- Cloud mirror refs MUST NOT become canonical `DatasetVersion` fields.
- Restricted data MUST NOT be mirrored unless policy and approval refs allow it.

## Downstream Contract Support
- `RunRecipe` locks dataset_version_id, checksum_manifest_hash, split_protocol_hash, and data_policy_ref/hash.
- `TrainingTaskSpec` may receive local input refs or mirror refs after materialization, not before.
- `PaperExperimentSidecar` records dataset version locks and status snapshots, not full dataset DTOs.

## Negative Schema Tests
- Reject `DatasetAsset` with checksum or storage path.
- Reject `DatasetMirror` without source checksum manifest hash.
- Reject a mirror marked canonical.
- Reject executable lock generation from a dataset version missing manifest, split, or policy refs.
