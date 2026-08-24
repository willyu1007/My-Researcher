# 01 Plan

## Phases
1. Implement LocalScript adapter for smoke pipeline.
2. Implement execution state/event log and idempotent submit path.
3. Implement mirror freshness and result collection policies.
4. Implement mocked Aliyun PAI-DLC adapter path.
5. Add integration tests for resolve, validate, mirror, materialize, submit, monitor, collect, validate result.

## Acceptance Criteria
- LocalScript proves end-to-end control flow without cloud credentials.
- Aliyun path consumes `DatasetMirror` refs and validates dataset-version identity, source checksum, freshness, and policy before use.
- Cancellation, partial results, reconcile/sync, and retry boundaries are explicit.
- Collected results satisfy validation and evidence contracts.

## Review Gate
- Do not start until materialization, persistence, and result contracts are closed.
- Before handoff, run local smoke and mocked cloud tests.
