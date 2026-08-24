# 01 Plan

## Phases
1. Freeze DatasetAsset / DatasetVersion ownership.
2. Define DatasetLocation, DatasetMirror, ChecksumManifest, SplitProtocol, DataPolicy, StorageRootRef, and LocalFileRef contracts.
3. Define dataset-related version lock inputs for `RunRecipe`.
4. Add canonical and negative schema tests.
5. Review downstream support for persistence, candidates, materialization, and adapters.

## Acceptance Criteria
- `DatasetAsset` contains identity/source/task/schema summary only, plus optional default version ref.
- `DatasetVersion` owns version label, manifest refs/hash, split refs/hash, policy refs, processing refs, and location refs.
- `DatasetMirror` is non-canonical and always tied to source checksum manifest hash.
- Schema tests reject `DatasetAsset.version`, `DatasetAsset.checksum`, `DatasetAsset.storage_ref`, naked paths, and mirror-as-canonical payloads.
- `RunRecipe` can later lock dataset version + manifest hash + split hash + policy refs without reading storage paths.

## Review Gate
- Close this task before version-lock and materialization contracts finalize dataset fields.
- Re-check restricted data mirror rules before adapter implementation.
