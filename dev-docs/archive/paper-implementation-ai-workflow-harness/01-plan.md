# 01 Plan

## Phases
1. [x] Review shared topic-selection runtime patterns and domain-neutral extraction points.
2. [x] Define `ImplementationHarness` policy pack, runtime bindings, invariants, audit refs, and quality signal refs.
3. [x] Define `ContextCompiler`, implementation workflow registry, and snapshot contract.
4. [x] Define harness run, audit, artifact, validation, gate result, transition attempt, and queue-suggestion contracts.
5. [x] Implement proposal-only adapters for initial workflows.
6. [x] Verify isolation, invariant enforcement, and no-authority-write behavior.

## Review Before Next Flow
- Confirm UI command surfaces can distinguish agent proposals from authority state.
- Confirm evaluation suite can replay harness runs.
- Confirm flow-node tasks call shared runtime governance contracts instead of local harness variants.
- Confirm gate failures, trace failures, and accepted-risk expiry surface through `DecisionWorkQueueItem` candidates.
- Confirm no workflow imports topic-selection business node contracts.

## Verification
- Unit/contract tests for execution modes, run modes, provenance, schema validation, and forbidden output.
- Scenario tests for mock/codex/provider separation, authority-write bypass attempts, missing input snapshot, missing trace, gate failure queueing, and harness invariant violations.

## Completion Notes
- Completed as backend minimum closure.
- Remaining UI consumption and replay/evaluation surfaces stay in T-100/T-101; T-099 now provides the queue/proposal/read model they consume.
