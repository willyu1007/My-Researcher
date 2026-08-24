# 05 Pitfalls

## Do Not Repeat
- Do not build a second agent runtime.
- Do not let provider fallback become workflow semantics.
- Do not persist hidden reasoning or provider secrets.
- Do not let agent output bypass `TransitionAttempt`, gates, trace, or `StateWriter`.
- Do not let each flow node create a local harness or private gate vocabulary.
- Do not let harness quality signals directly decide research direction.

## Closure Guardrails
- `DecisionWorkQueueItem` resolution must not mutate the source harness run, proposal artifact, or domain authority object.
- `ImplementationProposalArtifact` is not a domain object admission path; downstream services must explicitly read and gate it before any state write.
- Mock runs must stay isolated from product runs; model profiles with `mock.` are blocked in product mode.
- `PaperImplementationAgentWorkflowHarness` must not import topic-selection business node contracts; only shared functional refs and domain-owned paper implementation contracts are valid.
- Hidden reasoning, board summaries, result interpretations, and rationale memos cannot satisfy evidence or citation requirements.
- Persistence-only fields such as harness `spec` may be stored for audit, but must not leak into public create-run response shapes.
- `ImplementationInputSnapshot` is the context boundary for harness runs; proposal source and trace refs outside the snapshot, or explicitly excluded by the snapshot, must block the run.
