# 05 Pitfalls

## Do Not Repeat
- Do not jump from motive gap directly to expensive experiment.
- Do not let feasibility probe output become confirmatory evidence.
- Do not bury budget/stop rules in free-text notes.
- Do not treat scope broadening as a local plan edit.
- Do not schedule validation cycles outside current portfolio constraints.
- Do not keep repeating low-information cycles without `loop_budget_review`.
- Do not let productized Cycle completion omit a watermark-bound current-effective branch head or create failed evidence. D-16 freezes each head Run's complete cell/Attempt accounting in one embedded immutable snapshot/hash and keeps Sidecar projection-only.
- Do not scan or auto-include non-head history in readiness, snapshot or dossier scope. Old Runs remain read-only/queryable; only an explicit `comparison_input_ref` on the current admitted revision may add comparison lineage, never head membership.
- Do not omit an admitted branch because the branch has no Run, ignore an active real-provider Attempt because the owning Run is no longer head, or accept a stale Cycle/branch/head snapshot after CAS drift.
- Do not accept caller-authored `cycle_assessment` or `decision_exit`; D-17 assigns both authoritative disposition and selected-exit derivation to the existing Cycle closure service.
- Do not map failed/cancelled/incomplete execution to negative, or no-evidence/control-only closure to inconclusive. Execution accounting, nullable scientific disposition and control-flow closure are distinct axes.
- Do not let four Result Analysis scenarios, a `RunEvidenceUnit` status or a `ResultInterpretationPacket` become a second conclusion authority.
- Do not create a packet-before-closure cycle. The packet references the exact immutable closed Cycle; the Cycle does not depend on or later mutate for the downstream packet.

## T-095 Guardrails Landed
- `ExperimentPlanLight` is planning-only and must not be treated as an experiment-foundation execution request.
- `ValidationCycle` completion is an assessment record only; the completion record must not create claims, evidence, or motive evolution by side effect.
- Under D-17, that assessment record is also the sole scientific-disposition authority and the sole place where the selected exit is derived. This is a product target, not a claim that the landed T-095 service already enforces this rule.
- Feedback candidates are local planning objects until explicit dispatch calls T-093 feedback event recording.
- Required gate and handoff fields are queryable columns; full refs may be duplicated in JSON payloads but must not become the only lookup surface.
- Retired pre-writing control-plane artifacts are historical only and are not part of validation planning authority.
- `trace_manifest_ref` must always point to TraceManifest authority; target refs belong in trace manifests and input snapshots, not in the trace-manifest reference slot.
- Validation planning must not bypass the T-094 evidence board: every cycle needs an explicit or current trace-ready board for the target motive version.
- T-096 handoff objects must preserve motive/cycle ownership; route and plan refs cannot be mixed across cycles.
