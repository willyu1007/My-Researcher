# 02 Architecture

## Pipeline
```text
Resolve ExperimentFoundationRecord + latest readiness report
  -> Validate
  -> Mirror
  -> Materialize
  -> Submit
  -> Monitor
  -> Collect
  -> Validate Result
  -> Evidence Candidate input
```

## Adapter Interface
- submit
- getStatus
- reconcile
- collectResults
- cancel

## T-076 Inputs
- `ExperimentFoundationRecord` is the persisted metadata/ref/hash envelope for all reusable assets, locks, recipes, materialization records, results, facts, evidence, and candidates.
- `ExperimentFoundationReadinessReport` is the persisted readiness decision surface; adapters consume it before submission and may create follow-up reports through the service, but do not own readiness semantics.
- `TrainingTaskSpec` is consumed as the normalized task payload; adapters must not reconstruct it from `RunRecipe` directly.
- `TrainingTaskMaterializationResult` and `ExperimentFoundationAdapterMetadataRef` provide traceability into adapter-private payload storage; adapters must store private SDK/platform payloads behind refs/hashes only.
- Stage events, cancellation requests, and partial result refs are T-073/T-076 records that adapters append or reconcile; they are not a separate persistence model in T-077.

## Required Controls
- idempotency key per materialized task
- stage event log
- materialization hash
- mirror dataset-version identity, checksum, freshness, and policy check
- cancellation record
- partial result policy
- result validation blocker codes
- existing T-076 readiness gate must pass before submit
- adapter-private payloads must not be inlined into registry payloads or REST responses

## LocalScript
- Uses local dataset refs and local output paths.
- Validates full control path without cloud credentials.
- Remains smoke/development scope unless separately promoted.

## Aliyun PAI-DLC
- Consumes `DatasetMirror` refs.
- Keeps credentials behind auth refs.
- Collects metrics, logs, checkpoints, adapter/model artifacts, model card refs, and config snapshots.
- Supports normal training and LLM fine-tuning through the same adapter boundary.

## Negative Tests
- Reject stale mirror submission.
- Reject mirror submission when `DatasetMirror.dataset_version_id` does not match the locked dataset version.
- Reject restricted data mirror without approval.
- Reject collected result missing metrics, artifacts, logs, config snapshot, or validation context.
