# Topic to Paper Implementation Desktop Handoff — Roadmap

## Goal
- Let a user continue from an admitted Topic Selection `PaperProjectBridge` into the correct Paper Implementation context with one action and no manual technical-id or hash copying.

## Planning-mode context and merge policy
- Runtime mode signal: Default
- User confirmation when signal is unknown: not-needed
- Host plan artifact path(s): (none)
- Requirements baseline: prior user-confirmed project principles and T-137 outcome
- Merge method: set-union
- Conflict precedence: latest user-confirmed > requirement.md > host plan artifact > model inference
- Repository SSOT output: `dev-docs/active/topic-to-paper-implementation-desktop-handoff/roadmap.md`
- Mode fallback used: non-Plan default applied: no

## Input sources and usage
| Source | Path/reference | Used for | Trust level | Notes |
|---|---|---|---|---|
| User-confirmed instructions | Current conversation | Goal, simplicity constraints, T-138 creation | highest | User accepted the recommended T-138 direction. |
| T-137 result | `dev-docs/active/promoted-topic-to-scientific-dossier-canary/` | Proven backend lineage and task boundary | high | Real forward closure exists; do not rerun the canary. |
| Existing desktop code | `apps/desktop/src/renderer/modules/topic-workbench/`, `apps/desktop/src/renderer/modules/paper-implementation/`, `apps/desktop/src/renderer/App.tsx` | Current UI handoff gap and landing points | high | Topic shows an intake ref while Paper Implementation still asks for manual ids/hashes. |
| Model inference | N/A | Minimal sequencing only | lowest | No new product facts assumed. |

## Non-goals
- No new workflow engine, stage graph, cross-domain authority, or general-purpose coordinator.
- No database migration, new public API, authentication layer, or extra approval gate.
- No automatic Literature-to-Experiment asset discovery, PAI execution, tuning, or prose generation.
- No reopening or reuse of T-136/T-137 as implementation containers.
- No broad redesign of Topic, Paper Implementation, or desktop navigation.

## Open questions and assumptions
### Open questions (answer before execution)
- None at task creation. Static mocks will make the small presentation choice explicit before component work.

### Assumptions
- Existing bridge lookup, bootstrap, and Paper Implementation read-model APIs are sufficient; discovery may narrow the UI composition but must not silently add a backend scope. (risk: low)
- App-owned in-memory navigation context is sufficient for the minimum handoff; re-entering from the persisted bridge is the recovery path after a desktop reload. (risk: low)

## Merge decisions and conflict log
| ID | Topic | Conflicting inputs | Chosen decision | Precedence reason | Follow-up |
|---|---|---|---|---|---|
| C1 | Productization depth | A one-click cross-module workflow could become a generic orchestrator | Pass one bounded bridge context through existing product surfaces only | User simplicity and complexity-control principles | Stop if implementation requires a new workflow authority. |
| C2 | Technical identifiers | Existing Paper Implementation UI exposes editable bridge id/hash fields | Normal path forwards owner-issued values in code; ids remain read-only trace, not user-authored workflow inputs | User continuity and clear assigner/consumer principles | Keep diagnostics only where they remain useful. |
| C3 | UI implementation start | Direct component edits versus design alignment | Produce distinct static HTML mocks first and wait for a selection | Root UI instruction | Store mocks outside the repository. |

## Scope and impact
- Affected areas/modules: desktop App navigation state, Topic Workbench bridge/intake card, Paper module, Paper Implementation controller/workbench, focused UI tests.
- External interfaces/APIs: reuse existing bridge lookup, ImplementationProject bootstrap, and read-model calls; no new endpoint expected.
- Data/storage impact: none.
- Backward compatibility: current direct project/bridge lookup remains available for diagnostics; normal users gain an automatic handoff.

## Consistency baseline for dual artifacts
- [x] Goal is aligned with the user-confirmed next task.
- [x] Boundaries/non-goals are aligned with T-137 and project principles.
- [x] Constraints are aligned.
- [x] Milestones/phases ordering is aligned.
- [x] Acceptance criteria are aligned.
- Intentional divergences:
  - (none)

## Project structure change preview
This section is a non-binding early hypothesis. Discovery and mock selection own the final file list.

### Existing areas likely to change
- Modify:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/modules/topic-workbench/`
  - `apps/desktop/src/renderer/modules/PaperModule.tsx`
  - `apps/desktop/src/renderer/modules/paper-implementation/`
- Delete:
  - (none)
- Move/Rename:
  - (none)

### New additions
- New module(s): (none expected)
- New interface(s)/API(s): (none expected)
- New file(s): focused tests only if existing test locations require them

## Phases
1. **Static interaction options**
   - Deliverable: several distinct static HTML mocks under a dedicated Desktop directory.
   - Acceptance criteria: each option shows the Topic completion action, Paper loading state, existing/new project behavior, and terminal Dossier state without technical-id entry.
2. **Minimal handoff implementation**
   - Deliverable: selected interaction wired through existing desktop state and existing backend APIs.
   - Acceptance criteria: one click opens the correct Paper Implementation context and resolves existing-versus-bootstrap behavior without manual copying.
3. **Focused verification and closure**
   - Deliverable: tests, manual smoke evidence, governance sync, and handoff documentation.
   - Acceptance criteria: refresh/retry is clear, Dossier status is visible, and unrelated modules or authorities are unchanged.

## Step-by-step plan

### Phase 0 — Discovery and static mocks
- Objective: confirm the smallest App-level context shape and select a clear interaction.
- Deliverables:
  - Trace the current Topic card → App → Paper module → Paper Implementation props and calls.
  - Create distinct static HTML mocks outside the repository.
  - Stop for user selection before editing production components.
- Verification:
  - Each mock covers loading, existing project, bootstrap, error/retry, and `ready_for_writing` views.
  - No source/config/database changes.
- Rollback: remove the external mock directory.

### Phase 1 — Typed desktop handoff
- Objective: forward one owner-issued bridge context and adopt the resolved project.
- Deliverables:
  - A small typed handoff value owned by App-level navigation.
  - A Topic action that enters `论文管理 > 论文实施`.
  - Paper Implementation auto lookup; bootstrap only when the existing API reports no project.
  - Read-only lineage/terminal state rather than editable technical inputs on the normal path.
- Verification:
  - Focused component/controller tests for existing, missing, failure, retry, and repeated-click paths.
  - Desktop typecheck.
- Rollback: revert the handoff props/state while retaining existing manual diagnostic controls.

### Phase 2 — Product acceptance
- Objective: prove the handoff against persisted records without new provider work.
- Deliverables:
  - Manual smoke using an existing promoted bridge and existing Dossier-bearing project where available.
  - Updated task verification and pitfalls.
- Verification:
  - No PAI Job, LLM call, schema write, or new API is required.
  - Governance lint and relevant UI gates pass.
- Rollback: disable/remove only the new entry action; persisted domain records remain authoritative.

## Verification and acceptance criteria
- Build/typecheck:
  - `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --filter @paper-engineering-assistant/desktop typecheck`
- Automated tests:
  - Focused desktop unit/component tests for the selected handoff.
  - `node .ai/scripts/ctl-project-governance.mjs lint --check`
  - `git diff --check`
- Manual checks:
  - From an admitted Topic bridge, click once and land in the matching Paper Implementation context.
  - Confirm existing project loads without creating a duplicate.
  - Confirm a missing project uses the existing idempotent bootstrap path.
  - Confirm terminal Claim/Dossier state is visible and errors offer one retry action.
- Acceptance criteria:
  - No user copies or authors bridge ids, hashes, ImplementationProject ids, or scientific values on the normal path.
  - Every forwarded value has one existing owner and one explicit consumer.
  - No new auth, schema, public API, workflow authority, provider execution, or configurable parameter surface is introduced.

## Risks and mitigations
| Risk | Likelihood | Impact | Mitigation | Detection | Rollback |
|---|---:|---:|---|---|---|
| Handoff state grows into a global router | medium | medium | Keep one typed bridge context in existing App composition | Prop/state review | Revert the bounded handoff |
| Repeated click duplicates bootstrap | low | high | Lookup first and rely on existing idempotent bootstrap | Repeated-click test | Remove automatic bootstrap |
| Technical forms remain the apparent normal path | medium | medium | Selected mock must prioritize one semantic action and read-only trace | Manual UI smoke | Restore prior layout |
| Scope expands into EF execution UI | low | high | Treat any provider execution need as a separate task | Diff and task-scope review | Exclude the new behavior |

## Optional detailed documentation layout
```
dev-docs/active/topic-to-paper-implementation-desktop-handoff/
  roadmap.md
  00-overview.md
  01-plan.md
  02-architecture.md
  03-implementation-notes.md
  04-verification.md
  05-pitfalls.md
```

## To-dos
- [x] Confirm planning-mode signal handling and fallback record.
- [x] Confirm input sources and trust levels.
- [x] Confirm merge decisions and conflict log entries.
- [x] Confirm open questions.
- [x] Confirm phase ordering and definition of done.
- [x] Confirm verification/acceptance criteria.
- [x] Confirm rollout/rollback strategy.
