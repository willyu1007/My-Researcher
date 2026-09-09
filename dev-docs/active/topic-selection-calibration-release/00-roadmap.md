# Topic Selection Calibration Release — Supersession

## Scope and constraints

The user chose a new full-workflow task package and approved T-153 through Phase 2 on
2026-09-09. T-129 is no longer an implementation target. Its former corpus-first release route
is replaced for Codex by T-153's role-specific real-input qualification; other generation providers
can wait. This is a scope replacement, not evidence that the old completion criteria passed.
Historical requirement provenance remains R-009 and the T-127/T-128 release-tail handoff.

## Decision alignment

| Decision | Current direction | Evidence / consequence |
|---|---|---|
| Successor | T-153 owns full topic-selection Codex execution, beginning with N6/N8 | User selected a new task package and authorized through Phase 2. |
| C-1 calibration | Optional advisory tuning | D-30 already removed mandatory calibration sign-off; no new release prerequisite. |
| C-2 prompt readiness | Transferred to T-153, with role-specific actual-input qualification | Six historical prompts are not the complete workflow inventory; original corpus qualification was not performed. |
| C-3 runtime activation | Codex obligations transferred; gateway provider activation deferred | Live output, accurate bridge/provenance, run-mode and execution-spec integration remain required before opening a slice. No constant-only activation. |
| Retirement | Preserve supersession and unmet original claims in the archive | Two checked-out occurrences currently prevent the archive operation. |

## Task relationships

| Task | Relationship from this task | Owned boundary / exchanged contract | Coordination condition |
|---|---|---|---|
| T-153 | superseded-by | Prompt qualification and Codex product execution; explicit deferred other-provider intent | Use its roadmap obligation map as the active route. |
| T-128 | derived-from | W-17/W-18/W-19 release tails | Historical source, not evidence of C-2/C-3 completion. |
| T-088 | coordinates-with | Historical Debate-core decisions | Preserve advisory calibration and guarded runtime boundaries. |

## Implementation plan

### Phase 1 — Retire the superseded record
- Outcome: One historical record preserves the transfer without competing implementation instructions.
- Approach: Reconcile checked-out occurrences, then archive the superseded package with its actual outcome.
- Planned changes:
  1. Preserve C-2/C-3 non-completion and the successor/deferral dispositions.
  2. Reconcile occurrences and archive the historical record; no runtime activation belongs here.
- Dependencies: One checked-out occurrence and an isolated, recoverable checkpoint.
- Exit criteria: Archive and generated project views agree on the historical outcome.
- Verification: Exact task query, scoped governance synchronization and lint, review of the archive summary.
- Recovery: Restore the last task-linked record checkpoint without changing runtime guards.

## Kickoff gate

- Status: pending
- Authorized boundary: none
- [x] Decisions: user-selected supersession and deferred other-provider scope are recorded.
- [x] Design: historical obligations and current runtime guards remain truthful.
- [ ] Route: checked-out occurrences are reconciled for archival.
- [x] Verification: exact task query and governance validation are defined.

## Risks and recovery

Do not relabel original C-2/C-3 as passed, fabricate corpus evidence, or infer permission to remove
another worktree. Continue Codex implementation under T-153, not this replaced release route.

## Phase closeout

Record only the actual supersession, transferred obligations and remaining deferral. Preserve
historical source commits; do not retain a second active implementation plan in the archive.
