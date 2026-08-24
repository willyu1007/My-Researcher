# 仓库治理收敛 / Repository governance convergence — Roadmap

## Goal

- Converge repository governance onto the approved new task-governance contract while preserving the current Milestone/Feature graph, retained active work, runtime desktop CSS, and every live contract or fixture that is still consumed.

## Planning-mode context and merge policy

- Runtime mode signal: Default
- User confirmation when signal is unknown: not needed; the user supplied the approved migration direction and explicitly requested this durable planning bundle.
- Host plan artifact paths: none
- Requirements baseline: none; the current user instruction is the approved requirements source.
- Merge method: set-union
- Conflict precedence: latest user-confirmed instruction > repository contract and fixed governance assets > recent task-bundle convention > model inference
- Repository SSOT output: `dev-docs/active/repository-governance-convergence/roadmap.md`
- Mode fallback used: non-Plan default applied: yes

## Input sources and usage

| Source | Path/reference | Used for | Trust level | Notes |
|---|---|---|---|---|
| User-approved migration direction | current request | goal, invariants, sequence, exclusions, and target state | highest | No unresolved product decision |
| Current old dev-docs contract | `dev-docs/AGENTS.md` | opening bundle shape and status authority | high | Governs this task opening only |
| Current old project contract | `.ai/project/CONTRACT.md` | ID allocation, registry mapping, and derived-view rules | high | Must remain authoritative until cutover |
| Current old governance CLI | `.ai/scripts/ctl-project-governance.mjs` | dry-run, allocation, `F-000` placement, sync, and lint | high | CLI owns `.ai-task.yaml`; IDs are never guessed |
| Recent complete task bundle | `dev-docs/active/core-motive-to-evidence-board-semantic-handoff/` | old-format handoff conventions | medium | Structural reference, not migration authority |
| Current project registry/query inventory | `.ai/project/main/registry.yaml` and old CLI query output | graph and active-task baseline | high | Refresh immediately before execution |
| Model inference | N/A | reversible phase grouping only | lowest | Must not invent the new contract |

## Approved invariants

- Preserve the current Milestone/Feature graph: IDs, ownership relationships, titles, descriptions, and statuses do not change as a side effect of the migration.
- Do not invent a Milestone, Feature, or Requirement for this governance task; keep it in `F-000` / `M-000` unless a later explicit decision changes placement.
- Archive every task bundle that is still under `active/` with effective old-contract state `done` at the execution baseline.
- Keep `T-043` and `T-129` active. Keep this convergence task active until its own completion workflow is finished.
- Remove repository-local skill mechanisms and make `.ai/` project-hub-only.
- Refresh task-governance machinery only from the approved fixed assets; do not improvise a hybrid contract.
- Convert every retained task bundle and the project hub to the new contract in one controlled compatibility window.
- Preserve runtime UI CSS, including the `ui/styles/ui.css` loading path and required `ui/styles/desktop-runtime/**` compatibility selectors, while removing UI governance scaffolding.
- Remove stale CI, hook, and documentation references to retired governance mechanisms.
- Relocate every live fixture or contract to a maintained location and update its consumers before any archive compression makes historical bundles opaque.

## Non-goals

- No application feature, database schema, REST API, LLM behavior, or product workflow change.
- No redesign or reclassification of the existing Milestone/Feature graph.
- No deletion or archival of `T-043` or `T-129`.
- No deletion, relocation, or semantic rewrite of runtime UI CSS.
- No preservation of repository-local skills merely for backward compatibility once their consumers have moved.
- No global configuration changes, deployment, or unrelated repository cleanup.
- No archive compression before live-consumer scans and relocations pass.

## Open questions and assumptions

### Open questions before destructive execution

- Which files inside task archives or governance directories are still referenced by runtime code, tests, CI, hooks, or maintained documentation? Resolve with repository-wide reference tracing before deletion or compression.
- What exact paths and command surface are supplied by the approved fixed new-contract task-governance assets? Treat those assets as authoritative and stop if they are unavailable or internally inconsistent.
- Which UI files are runtime CSS versus governance-only scaffolding? Prove through import/build-entry tracing before removal.

### Assumptions

- The 2026-08-24 opening baseline contains 55 effective `done` tasks under `dev-docs/active`, two pre-existing `planned` tasks (`T-043`, `T-129`), and no `in-progress` or `blocked` task. Execution must refresh this inventory rather than blindly relying on the count.
- The current old governance CLI remains usable for this opening and must not be replaced until the new bundle ID, `F-000` mapping, and clean old lint are established.
- The new contract can represent the existing Milestone/Feature graph without semantic loss. If it cannot, stop before cutover and report the incompatibility.

## Merge decisions and conflict log

| ID | Topic | Conflicting inputs | Chosen decision | Precedence reason | Follow-up |
|---|---|---|---|---|---|
| C1 | Contract used to open this task | New-contract target versus currently authoritative old contract | Open and register the task entirely under the old contract; migrate it with all other bundles later | Explicit user direction and current repository contract | Prove old lint before any migration |
| C2 | Project placement | Cross-cutting governance scope versus no approved new graph node | Map this task to reserved `F-000` / `M-000` | Explicit instruction forbids inventing M/F/R objects | Verify registry after sync |
| C3 | Archive handling | Desired compression versus live files possibly stored in historical bundles | Relocate and verify live fixtures/contracts first; compress only afterward | Explicit ordering constraint | Produce consumer-to-new-path evidence |
| C4 | UI cleanup | Remove UI governance scaffolding versus preserve runtime styling | Trace imports and preserve runtime CSS; remove only governance-only assets and references | Explicit boundary | Run UI entry/import checks before removal |
| C5 | Governance replacement | Remove local skill mechanisms versus need for task governance | Install/refresh approved fixed task-governance assets, then remove local skill machinery; avoid a permanent dual system | Approved target state | Define a short, verified cutover window |

## Scope and impact

- Affected governance areas: `dev-docs/`, `.ai/`, fixed task-governance assets, project-hub registry and derived views.
- Affected cleanup surfaces: repository-local skill wrappers/mechanisms, UI governance scaffolding, CI workflows, Git hooks, and maintained documentation that reference retired paths or commands.
- External interfaces/APIs: none.
- Data/storage impact: repository metadata and documentation only; no application database migration.
- Backward compatibility: old governance remains valid through the opening checkpoint; the migration must avoid leaving a mixed contract after cutover.

## Project structure change preview (non-binding)

### Existing areas likely to change

- Modify:
  - `dev-docs/active/` and `dev-docs/archive/`
  - `.ai/project/`
  - approved fixed task-governance asset locations
  - CI, hook, and maintained documentation references discovered during inventory
  - UI entry/reference files only where needed to detach governance scaffolding
- Delete after consumer verification:
  - repository-local skill mechanisms and generated local skill wrappers
  - `.ai/` content not belonging to the project hub
  - UI governance-only scaffolding
  - stale CI/hook/docs references or retired helper files
- Move/Rename:
  - live fixtures/contracts currently stored in locations scheduled for removal or compression
  - effective `done` bundles from `dev-docs/active/` to archive storage

### New additions

- Fixed task-governance assets: exact locations come from the approved asset source, not this plan.
- Maintained fixture/contract landing points: choose existing owning modules where possible; determine exact paths by consumer tracing.
- No new application module, endpoint, schema, Milestone, Feature, or Requirement.

## Phases

1. **Freeze and prove the old baseline**
   - Deliverable: clean old lint, complete task/graph inventory, path/reference inventory, and rollback checkpoint.
   - Acceptance: the current M/F graph and every candidate archive/removal path have machine-readable baselines; no migration write has occurred.
2. **Relocate live fixtures and contracts**
   - Deliverable: every still-consumed fixture/contract lives in a maintained non-archive location and all consumers point there.
   - Acceptance: repository-wide references and focused checks show no live dependency on paths slated for removal or compression.
3. **Normalize task lifecycle placement**
   - Deliverable: all effective `done` active bundles are archived; `T-043`, `T-129`, and the convergence task remain active.
   - Acceptance: task IDs remain unique and status/path projections match the approved lifecycle state.
4. **Cut over task governance**
   - Deliverable: approved fixed governance assets refreshed, repository-local skills removed, all bundles and the hub converted, and `.ai/` reduced to the project hub.
   - Acceptance: the new contract validates the entire task corpus; the old/new hybrid state no longer exists; the M/F graph is semantically identical to baseline.
5. **Retire UI governance scaffolding safely**
   - Deliverable: governance-only UI assets are removed while runtime UI CSS remains loaded and unchanged except for necessary reference repairs.
   - Acceptance: import tracing and focused UI checks prove runtime CSS coverage and absence of retired governance dependencies.
6. **Clean integrations and compress historical material**
   - Deliverable: CI/hooks/docs reference only supported governance commands and locations; archive compression occurs only after relocation gates pass.
   - Acceptance: reference scans, governance lint, focused repository checks, and diff review are clean.
7. **Close and hand off**
   - Deliverable: verification evidence, decisions, rollback notes, and final task/hub state are current.
   - Acceptance: a fresh contributor can explain the final authority model, retained active tasks, preserved graph, CSS boundary, and archive recovery path.

## Verification and acceptance criteria

- Before cutover:
  - old governance lint passes;
  - task IDs, statuses, paths, and current M/F graph are captured;
  - repository-wide consumers of archive-bound and removal-bound paths are identified.
- During cutover:
  - each phase has an explicit diff review and reversible checkpoint;
  - no compression runs before fixture/contract relocation verification;
  - no graph mutation or unauthorized task lifecycle change appears.
- After cutover:
  - the new governance lint/check command passes against every task bundle and the project hub;
  - `T-043` and `T-129` remain active;
  - all execution-baseline `done` bundles are archived;
  - `.ai/` contains only the project hub;
  - repository-local skill mechanisms and UI governance scaffolding are absent;
  - runtime UI CSS imports and required compatibility selectors remain present;
  - CI, hooks, and maintained docs contain no retired governance references;
  - no live fixture/contract consumer resolves into compressed historical storage;
  - `git diff --check` and targeted repository checks pass.

## Risks and mitigations

| Risk | Likelihood | Impact | Mitigation | Detection | Rollback |
|---|---:|---:|---|---|---|
| A live fixture/contract is mistaken for historical residue | medium | high | trace all consumers and relocate before removal/compression | reference scan plus focused consumer checks | restore prior path and consumer mapping |
| M/F graph semantics drift during schema conversion | medium | high | capture canonical baseline and compare normalized graph after conversion | ID/field/edge comparison | restore hub checkpoint and rerun converter |
| Mixed old/new governance becomes authoritative | medium | high | bounded cutover; fixed assets are the only new-contract source | dual-marker/reference scan and both-side diff | return to old checkpoint before proceeding |
| Task IDs or lifecycle states change accidentally | low | high | CLI-owned IDs, unique-ID check, explicit retained-task assertions | governance lint and task inventory diff | restore metadata/registry projection |
| Runtime UI CSS is removed with governance scaffolding | medium | high | import classification and explicit preserve list | renderer entry/import checks and focused UI verification | restore CSS/reference checkpoint |
| CI/hooks/docs still invoke retired commands | medium | medium | repository-wide string/path scan after cutover | local hook/CI command checks and docs lint | restore or update the affected integration |
| Archive compression harms recoverability | low | high | compress last; retain index/checksum and recovery instructions | extraction/read test and consumer scan | keep uncompressed archive until proof passes |

## Rollback strategy

- Create a verified rollback checkpoint before each destructive migration phase; commits are part of later execution, not this opening change.
- Roll back by phase, restoring the last single-contract state rather than attempting to support an indefinite hybrid.
- Never roll back by reusing task IDs, rewriting the M/F graph, deleting retained active tasks, or discarding live contracts/fixtures.
- Keep archives uncompressed until all relocation and consumer checks pass; compression is the final irreversible-adjacent step.

## Optional detailed documentation layout (current old convention)

```text
dev-docs/active/repository-governance-convergence/
  roadmap.md
  00-overview.md
  01-plan.md
  02-architecture.md
  03-implementation-notes.md
  04-verification.md
  05-pitfalls.md
```

## To-dos

- [x] Confirm approved migration direction and old-contract opening boundary.
- [x] Inspect current old contracts, CLI behavior, registry baseline, and a recent bundle.
- [x] Let the old CLI allocate `T-145` and verify `F-000` / `M-000` placement.
- [x] Confirm implementation kickoff before executing migration phases; the user authorized the complete migration after approving all four alignment decisions.
- [x] Refresh execution-time inventory and complete Phase 1 before destructive work.
- [ ] Checkpoint Phase 1, then normalize lifecycle placement before the fixed-asset cutover.
