# T-106 Pitfalls

## Avoid Semantic Drift
- Do not duplicate T-070 through T-078 domain semantics in a new harness-only model.
- Do not let desktop tests imply the renderer owns readiness, promotion, materialization, execution, or result-validation decisions.
- Do not let PaperImplementation tests copy canonical experiment-foundation DTOs into adjacent workflow state.
- Do not treat evidence candidates as paper claims, conclusions, final tables, or leaderboard rows.

## Avoid Unsafe External Behavior
- Do not make true cloud execution the default lane.
- Do not treat a true-external-canary gate pass as proof of real cloud connectivity; it only means prerequisites are present until a provider-specific real execution implementation exists.
- Do not let unknown external provider names pass the gate. Add a provider-specific gate contract before accepting a new provider.
- Do not read or print raw credentials, `DATABASE_URL`, SDK payloads, adapter-private payloads, checkpoints, or raw logs.
- Do not check in raw real datasets, model weights, checkpoints, external provider payloads, or unredacted object paths.
- Do not leave external canary resources without cleanup verification if a true canary is later selected.

## Avoid Fragile Harnesses
- Do not mark a command as passed if the manifest lists artifacts that were not actually written.
- Do not let a process-spawning test report a timeout after it has already reported pass.
- Do not rely on wall-clock timing when an explicit event, process exit, or status transition can be asserted.
- Do not add broad sleeps where deterministic polling with clear timeout diagnostics is possible.

## Avoid Task Boundary Confusion
- T-106 can fix defects discovered by hardening tests, but broad feature expansion should become a follow-up task.
- T-106 should keep the T-103 runner relationship explicit: either a stable hook or a documented standalone command.
- T-106 should not reopen T-043 V1 closure unless a blocking defect invalidates the claimed minimum chain.
