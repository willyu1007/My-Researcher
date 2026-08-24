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

### Governance cutover

- Run the validator/lint supplied by the approved fixed assets against the complete active/archive task corpus and project hub.
- Assert `.ai/` contains only the project hub.
- Scan for repository-local skill manifests/wrappers and old-contract-only markers after cutover.
- Assert `T-043` and `T-129` remain active and all execution-baseline effective `done` bundles are archived.

### UI boundary

- Trace renderer style entrypoints and imports before removal.
- Assert `ui/styles/ui.css` and required `ui/styles/desktop-runtime/**` selectors remain reachable.
- Assert the retired `apps/desktop/src/renderer/styles/**` and `apps/desktop/src/renderer/app-layout.css` paths are not recreated.
- Run focused lint/typecheck or existing UI-governance replacement checks appropriate to the new state; do not run a build unless separately authorized.

### CI, hooks, docs, and archive integrity

- Scan maintained files for retired command/path references.
- Exercise local read-only/check modes for supported hooks and governance commands.
- Run documentation lint/checks where available.
- When archives are compressed, verify index completeness, checksum/integrity, and test extraction/readability.
- Run `git diff --check` and inspect the full scoped diff.

## Rollout / Backout

- Rollout: later implementation proceeds phase-by-phase only after an explicit kickoff, with live relocation before compression and one bounded governance cutover.
- Backout: restore the last coherent phase checkpoint. Keep uncompressed archives until relocation, reference, integrity, and recovery checks have passed.
