# T-143 Pitfalls (do not repeat)

This file exists to prevent repeating mistakes within this task.

## Do-not-repeat summary (keep current)

- Never treat an LLM proposal field as technical authority without resolving it through a persisted server owner.
- Never advertise `repeat_handoff` for a state the underlying coordinator cannot advance.
- Never reuse a complete trace by status alone; validate its exact target owner.

## Pitfall log (append-only)

### 2026-08-24 - Coordinator final artifact ref is not the runtime row id

- Symptom: T-142 compared `step.runtime_artifact_ref.ref_id` with `step.runtime_artifact_id`; its lightweight fake made them equal, but the real coordinator stores the admitted final semantic artifact ref in the former and the runtime repository row id in the latter.
- Context: post-implementation review of the coordinator, runtime admission service, and validation-planning runtime writer.
- What we tried: traced the step fields back through `final_admission_record.admitted_artifact_ref` and the runtime artifact envelope.
- Root cause: the T-142 fake collapsed two distinct lineage concepts into one ID, so the unit test could not expose real-runtime incompatibility.
- Fix / workaround: recover the row by `runtime_artifact_id`, then require the step ref to equal `artifact.final_artifact_ref ?? artifact.artifact_payload_ref` and require the admitted hash to equal the final/payload hash.
- Prevention: fixtures for acceptance bridges must model both the persisted runtime row identity and the admitted semantic final-artifact identity.
- References: `paper-implementation-run-coordinator-service.ts`, `paper-implementation-runtime-admission-service.ts`, `paper-implementation-validation-cycle-handoff-service.ts`.

### 2026-08-24 - Confirmation and technical refs must fail closed before authority writes

- Symptom: a selected `confirmatory_marker=true` proposal was admitted with `confirmation_level=not_required`, and its optional model-authored `iteration_budget_ref.ref_id` was copied into ValidationCycle authority.
- Context: T-142 maps selected LLM proposal semantics into the T-095 deterministic writer.
- What we tried: compared every assigned request field with its declared assigner and consumer in the T-142 handoff.
- Root cause: scientific proposal fields and server-owned technical/confirmation fields were not separated at the final mapping boundary.
- Fix / workaround: stop confirmatory candidates before trace/cycle writes and leave unresolved iteration-budget lineage null while retaining a deterministic server budget id.
- Prevention: every LLM-produced ref must have a bounded server resolver before persistence; every confirmation marker must be checked before the first authority writer.
- References: `paper-implementation-validation-cycle-handoff-service.ts`, T-143 service tests.
