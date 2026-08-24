# 03 Implementation Notes

## 2026-05-17
- Created as the first contract-boundary child because the review report identified DatasetAsset / DatasetVersion overlap as a high-risk S1 issue.
- Initial design decision: `DatasetAsset` is identity only; version, checksum, storage refs, split, policy, and mirror status belong to separate version-scoped objects.

## 2026-05-17 - Landing
- Added `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts`.
- Added dataset registry records and schemas for `DatasetAsset`, `DatasetVersion`, `DatasetLocation`, `DatasetMirror`, `ChecksumManifest`, `SplitProtocol`, `DataPolicy`, `StorageRootRef`, `LocalFileRef`, and `DatasetVersionLock`.
- Wired the experiment-foundation contract module into shared package exports and the research-lifecycle barrel.
- Added schema tests for canonical dataset payloads and negative boundary cases:
  - `DatasetAsset` rejects version/checksum/storage/path/uri/location/mirror leakage.
  - `DatasetMirror` rejects canonical drift and missing source checksum manifest hash.
  - `DatasetVersionLock` rejects missing manifest/split/policy locks and storage/mirror refs.
- Implementation note: Fastify/Ajv may strip unknown additional properties in this repo setup, so critical forbidden fields are represented as explicit forbidden schema properties rather than relying only on `additionalProperties: false`.
- Handoff owner is `T-071 experiment-foundation-benchmark-protocol-contracts`.

## 2026-05-17 - Post-review fixes
- Tightened `DatasetLocation` schema so local locations must include `StorageRootRef + LocalFileRef`, and remote/external locations must include `DatasetRemoteRef`.
- Tightened `LocalFileRef.relative_path` to reject absolute paths, Windows drive paths, and parent traversal segments.
- Added schema tests for unresolvable dataset locations and invalid local relative paths.
- Updated parent quality review wording so T-070 shared contract implementation is reflected accurately.
