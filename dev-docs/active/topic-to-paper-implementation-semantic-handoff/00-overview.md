# T-138 Topic to Paper Implementation Semantic Handoff

## Status

- State: done
- Scope correction: the prior desktop/UI direction was superseded by the user's 2026-08-17 instruction to prioritize functional closure through LLM interaction.
- Result: the thin backend handoff service and REST command are implemented; focused and full regression tests plus a credential-free replay against the existing T-137 lineage pass.
- Follow-up rule: UI, generic orchestration, or automatic downstream implementation stages require a separate explicit task.

## Goal

Let an LLM continue from one admitted Topic Selection PaperProjectBridge into a ready Paper Implementation authority root with one semantic command and no caller-authored hashes, project ids, or scientific values.

## Non-goals

- Do not add or change desktop UI/UX.
- Do not add a workflow engine, generic coordinator, database migration, new authority, semantic search, or configurable routing policy.
- Do not add authentication, approval, validation, retry-budget, or configuration layers beyond existing owner gates.
- Do not create Motive, ValidationCycle, WorkOrder, Run, Result, Claim, Dossier, or upstream feedback as part of the handoff.
- Do not execute PAI Jobs, invoke an LLM, generate prose, or reopen T-136/T-137.

## Context

- T-137 proved a fresh, semantically continuous backend path from literature-backed Topic through real scientific evidence to a trace-complete ready_for_writing Dossier.
- The backend already implements PaperImplementation to Topic Selection feedback/recheck, including real Prisma readback; T-128 also ran downstream feedback with a real product LLM. Rebuilding that loop is not a valid T-138 gap.
- Topic Selection already owns an active PaperProjectBridge, its immutable hash, the working-copy semantics, and idempotent PaperProjectIntake creation.
- Paper Implementation already owns idempotent project bootstrap by bridge and the downstream LLM/runtime surfaces.
- The remaining seam is operational: current callers must manually compose bridge read, intake, hash forwarding, and implementation bootstrap. T-137 solved that only inside fixed task-specific scripts.

## Design alignment

- Simplification: one request carries only paper_project_bridge_id; the server resolves the bridge hash and every derived id.
- Robustness: reuse the existing idempotent intake and bootstrap writers, and resume from their persisted owner records.
- Clarity: the response separates semantic continuation context from technical lineage and declares one resume policy.
- Controlled complexity: one thin application service and one route; no generic stage graph, parameter bag, or policy registry.
- Continuity: title, problem statement, contribution, evaluation plan, claim ceiling, prohibited claims, and obligations flow unchanged from Topic Selection to the LLM consumer.

## Acceptance criteria

- [x] POST /paper-implementation/topic-handoffs accepts only a non-empty paper_project_bridge_id.
- [x] The service reads the active owner bridge, creates or reuses its PaperProjectIntake, then creates or reuses its ImplementationProject.
- [x] The caller never supplies bridge_payload_hash, paper_project_id, implementation_project_id, scientific observations, or downstream workflow state.
- [x] The response contains one compact continuation packet with owner-preserved research semantics, key lineage refs, created versus resumed status, and the instruction to continue from persisted owner state.
- [x] Repeating the same request returns the same PaperProject and ImplementationProject without duplicate authority.
- [x] Missing, inactive, stale, incomplete, or conflicting bridge state fails through existing owner gates before partial cross-module authority is accepted.
- [x] Focused contract/service/route tests, shared/backend typecheck, a credential-free T-137 persisted-state smoke, governance lint, and git diff --check pass.
- [x] No desktop code, schema migration, new auth/approval gate, LLM call, PAI Job, prose generation, or T-136/T-137 authority mutation is introduced.
