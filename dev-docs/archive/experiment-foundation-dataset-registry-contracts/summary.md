# experiment-foundation-dataset-registry-contracts

## Outcome

- Define the dataset registry contract so `DatasetAsset` is a stable catalog identity, while `DatasetVersion`, `DatasetLocation`, `ChecksumManifest`, `SplitProtocol`, `DataPolicy`, and `DatasetMirror` own versioned data, storage refs, integrity, policy, and execution mirror semantics.

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-070`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-08-24`

### Historical Requirement provenance

- `R-012` — Experiment foundation reusable assets baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- Dataset fields support RunRecipe locking.
- Dataset fields support persistence without storing blobs.
- Dataset fields support candidate promotion without canonical candidate state.
- Dataset fields support LocalScript and Aliyun mirror materialization.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/experiment-foundation-dataset-registry-contracts/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.
