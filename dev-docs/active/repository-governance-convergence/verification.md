# 仓库治理收敛 / Repository governance convergence — Verification

## Opening verification

- [x] `git -c safe.directory='D:/Else/My-Researcher' status --short --branch`
  - Expected: branch `main`; no unrelated worktree changes before creation.
  - Result: passed; output was `## main...origin/main`.
- [x] `node .ai/scripts/ctl-project-governance.mjs query --project main --text 'repository governance' --json`
  - Expected: no duplicate outcome.
  - Result: passed; returned `[]`.
- [x] `node .ai/scripts/ctl-project-governance.mjs query --project main --text 'governance convergence' --json`
  - Expected: no duplicate outcome.
  - Result: passed; returned `[]`.
- [x] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Expected: clean baseline under the old contract.
  - Result: passed; `[ok] Lint passed.`
- [x] `node .ai/scripts/ctl-project-governance.mjs sync --dry-run --project main`
  - Expected: allocate one new Task ID and change only the new metadata file plus expected project-hub registry/derived outputs.
  - Result: passed; proposed `T-145`, `.ai-task.yaml`, and only the four expected hub outputs.
- [x] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Expected: CLI writes the unique metadata identity and expected hub projections.
  - Result: passed; the CLI allocated `T-145` and updated only its projected write set.
- [x] Query allocated ID and inspect `.ai-task.yaml` / registry placement.
  - Expected: one unique planned task at this slug, mapped to `F-000` / `M-000`.
  - Result: passed; ID and slug queries returned one matching entry, and metadata search found one `T-145` identity.
- [x] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Expected: `[ok] Lint passed.`
  - Result: passed; `[ok] Lint passed.`
- [x] Final scoped diff review.
  - Expected: changes limited to this bundle and old CLI-managed project-hub registry/derived outputs.
  - Result: scope passed; only the new bundle plus `registry.yaml`, `dashboard.md`, `feature-map.md`, and `task-index.md` were changed.
- [x] Planning checkpoint validation.
  - Expected: task state and registry projection are `in-progress`, old governance lint passes, and staged diff has no whitespace warning.
  - Result: passed; the task query reports `in-progress` at `F-000` / `M-000`, old governance lint passes, and `git diff --check` is clean after correcting the EOF warning.

## Migration verification plan

### Baseline and graph equivalence

- Capture normalized pre/post representations of Milestone and Feature records and their edges.
- Require semantic equality after conversion; ordering-only differences may be normalized, but field or relationship changes fail.
- Compare stable task IDs, retained task states, and task paths before/after each lifecycle/conversion phase.

### Live asset relocation

- Search code, tests, CI, hooks, and maintained docs for every archive/removal-bound fixture or contract.
- For each relocation, record old path, new owner/path, consumers updated, and focused check.
- Require zero live references to compressed or removed paths.

#### Phase 1 evidence

- [x] Exact SHA-256 comparisons for the two relocated JSON fixtures and the two environment scripts.
  - Result: each old/new pair matched byte-for-byte.
- [x] `D:\Else\Python311\python.exe -B -S env/scripts/env_localctl.py --help`
  - Result: passed; the relocated controller exposes `doctor`, `compile`, and `connectivity`.
- [x] Relocated environment-controller doctor path with report under `artifacts/env-local/`.
  - Result: the controller parsed the migrated contract/policy and produced a redacted report; exit `1` was the expected local-readiness result because the gitignored `DATABASE_URL` secret file is absent, not a tooling/path failure.
- [x] `TS_NODE_TRANSPILE_ONLY=1 pnpm exec node --test --loader ts-node/esm src/services/experiment-foundation-d19-fixture-import-service.unit.test.ts src/services/topic-selection-v1b-n8-calibration-runner.unit.test.ts`
  - Result: passed, 16/16 tests.
- [x] `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result: passed after Prisma client generation.
- [x] `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - Result: passed.
- [x] Repository scan for the two former archived fixture paths and the old environment-skill script path outside removal-bound trees.
  - Result: zero supported consumers remain.

### Governance cutover

- Run the validator/lint supplied by the approved fixed assets against the complete active/archive task corpus and project hub.
- Assert `.ai/` contains only the project hub.
- Scan for repository-local skill manifests/wrappers and old-contract-only markers after cutover.
- Assert `T-043` and `T-129` remain active and all execution-baseline effective `done` bundles are archived.

#### Phase 2 evidence

- [x] Dry validation of old-CLI `done` inventory and all move boundaries.
  - Result: exactly 55 candidates; every source/target stayed within the intended active/archive roots, no target collision existed, and retained tasks were absent.
- [x] Bounded PowerShell `Move-Item -LiteralPath` lifecycle normalization.
  - Result: moved exactly 55 task directories from `dev-docs/active/` to `dev-docs/archive/`.
- [x] Old authoritative `sync --apply` followed by `lint --check`.
  - Result: sync refreshed 55 task metadata files plus registry-derived views; lint passed.
- [x] Post-move task queries.
  - Result: `done=[]`; planned contains only `T-043` and `T-129`; in-progress contains only `T-145`.

#### Fixed-contract evidence

- [x] Normalized old/new project and task comparison.
  - Result: exact equality for M-000/M-001, F-000/F-001/F-002, their edges/fields, every task ID, task lifecycle/path, and F/M mapping; 13 Requirements were not promoted.
- [x] `node .ai/scripts/ctl-project-governance.mjs lint --strict` and `sync --dry-run`.
  - Result: both pass under the fixed contract with no proposed drift.
- [x] Bundle inventory.
  - Result: all 142 archive directories contain exactly `.ai-task.json` and `summary.md`; active inventory is T-043, T-129, and T-145.
- [x] New CLI identity queries.
  - Result: T-043 and T-129 are planned at F-001/M-001; T-145 is in-progress at F-000/M-000; each has one occurrence and no conflict/metadata error.
- [x] `.ai` and local-skill postconditions.
  - Result: `.ai` contains only four project-hub files and five governance CLI/library files; `.codex/skills`, `.claude/skills`, and `.ai/skills` do not exist.

### UI boundary

- Trace renderer style entrypoints and imports before removal.
- Assert `ui/styles/ui.css` and required `ui/styles/desktop-runtime/**` selectors remain reachable.
- Assert the retired `apps/desktop/src/renderer/styles/**` and `apps/desktop/src/renderer/app-layout.css` paths are not recreated.
- Run focused lint/typecheck or existing UI-governance replacement checks appropriate to the new state; do not run a build unless separately authorized.

#### UI evidence

- [x] Final UI inventory and retired-path assertions.
  - Result: `ui/` contains only `ui/styles/ui.css`, `tokens.css`, `contract.css`, and `desktop-runtime/**`; approvals/codegen/config/contracts/patterns/token-source/spec-version paths do not exist.
- [x] Runtime-boundary review.
  - Result: no renderer import or selector migration was made; retained CSS headers/readme describe compatibility ownership, and retired renderer style paths were not recreated.

### CI, hooks, docs, and archive integrity

- Scan maintained files for retired command/path references.
- Exercise local read-only/check modes for supported hooks and governance commands.
- Run documentation lint/checks where available.
- When archives are compressed, verify index completeness, checksum/integrity, and test extraction/readability.
- Run `git diff --check` and inspect the full scoped diff.

#### Integration and runtime evidence

- [x] Maintained reference scan outside `dev-docs/**`.
  - Result: zero references to old task/context/state/UI CLIs, local skill trees, removed context registries, or retired UI governance paths.
- [x] Supported package manifest parsing and backend script inventory.
  - Result: root/backend manifests parse; supported validation scripts are module-owned under `apps/backend/scripts/` and no supported command points into retired `.ai` mechanisms.
- [x] TypeScript checks.
  - Result: shared, backend, and desktop package typechecks passed without a build.
- [x] Focused runtime suite.
  - Result: 30/30 tests passed across D-19, N8, literature/topic matrix, and slot-manifest coverage; literature/topic matrix entrypoints and Domain Gate/live-adapter/provider-variance ownership checks passed.
- [x] Runtime stress underlying lanes.
  - Result: L5 92/92; runtime regression 324 passed plus 16 intentional skips and zero failures; deterministic 15/15; queue 5/5; live adapter 9/9 plus ownership; provider variance 5/5 plus ownership.
- [x] Stress aggregation correction.
  - Result: the only final-summary failures were three retired required-case names; recalculation of the same run after their exact removal passed required L5 (86), runtime (34), deterministic (15), queue (5), live-adapter (10), and provider-variance (6) groups. Focused manifest and ownership checks cover the changed inventory; no third full stress run was performed.
- [x] Hook and final diff review.
  - Result: all three shell hooks pass Git Bash syntax checking; staged and unstaged `git diff --check` pass; seven retained `.ai` validation scripts are detected as 84–98% similarity relocations into the backend; no untracked residue remains.
- [x] Generated verification-residue cleanup.
  - Result: the ignored `artifacts/env-local` and `artifacts/paper-implementation-runtime-stress` directories created during T-145 were inspected and removed with a scoped Git clean; no maintained artifact was deleted.

## Rollout / Backout

- Rollout: later implementation proceeds phase-by-phase only after an explicit kickoff, with live relocation before compression and one bounded governance cutover.
- Backout: restore the last coherent phase checkpoint. Keep uncompressed archives until relocation, reference, integrity, and recovery checks have passed.
