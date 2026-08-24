# 00 Overview

## Status
- State: done
- Parent task: `T-043 experiment-foundation-v1`
- Next step: hand off to `T-071 experiment-foundation-benchmark-protocol-contracts`.

## Goal
- Define the dataset registry contract so `DatasetAsset` is a stable catalog identity, while `DatasetVersion`, `DatasetLocation`, `ChecksumManifest`, `SplitProtocol`, `DataPolicy`, and `DatasetMirror` own versioned data, storage refs, integrity, policy, and execution mirror semantics.

## Non-goals
- Do not implement Prisma persistence or file storage.
- Do not create dataset import automation from literature.
- Do not submit training jobs or create cloud mirrors.

## Responsibilities
- Remove version, checksum, and storage refs from `DatasetAsset`.
- Make executable dataset use flow through `DatasetVersion` plus manifest, split, and policy refs.
- Model local canonical registry, local file refs, and non-canonical execution mirrors.
- Define Dataset-related version-lock inputs for `RunRecipe`.

## Boundary
- Owns dataset registry contracts and schema tests.
- Hands off persistence to `experiment-foundation-persistence-api-readiness`.
- Hands off literature candidate promotion to `experiment-foundation-candidate-promotion-contracts`.
- Hands off cloud mirror execution behavior to `experiment-foundation-execution-adapters`.

## Done Means
- Contract invariants prevent `DatasetAsset` / `DatasetVersion` overlap.
- Negative tests reject naked paths/checksums on `DatasetAsset`.
- `RunRecipe` can later lock dataset version, checksum manifest hash, split protocol hash, and data policy refs.

## Acceptance criteria
- [x] Contract invariants prevent `DatasetAsset` / `DatasetVersion` overlap.
- [x] Negative tests reject naked paths/checksums on `DatasetAsset`.
- [x] `DatasetMirror` is non-canonical and tied to source checksum manifest hash.
- [x] `DatasetVersionLock` can carry dataset version, checksum manifest hash, split protocol hash, and data policy refs without storage paths or mirror refs.
- [x] Shared typecheck/test and project governance sync/lint pass.
