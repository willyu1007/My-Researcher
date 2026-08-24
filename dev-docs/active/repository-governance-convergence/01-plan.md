# 仓库治理收敛 / Repository governance convergence — Implementation Plan

## Phase 0 — Freeze the old-contract baseline

1. Record the worktree, branch, old governance lint result, and task query output.
2. Export a normalized baseline of all Milestones, Features, M/F edges, task IDs, lifecycle states, mappings, and dev-docs paths.
3. Recompute the set of effective `done` bundles under `active/`; assert `T-043` and `T-129` remain active.
4. Inventory repository-local governance/skill assets, `.ai/` contents, UI governance/runtime-style boundaries, CI/hooks/docs references, and archive-bound fixtures/contracts.
5. Identify a reversible checkpoint and the exact authoritative fixed-asset source for the new contract.

Exit criteria:

- Old lint passes.
- The baseline can detect graph, identity, status, path, and reference drift.
- No migration write has occurred.
- Missing or inconsistent fixed assets are a stop condition.

## Phase 1 — Relocate live fixtures and contracts

1. Trace consumers of fixtures, contracts, examples, schemas, and scripts currently stored inside task bundles or governance paths scheduled for removal/compression.
2. Classify each item as maintained authority, test fixture, generated artifact, or historical evidence.
3. Move maintained/live items to the smallest existing owning module or maintained test/docs location; avoid creating a new generic dumping ground.
4. Update consumers and prove equivalent behavior with focused checks.
5. Re-run repository-wide reference scans and record old-to-new path mappings.

Exit criteria:

- No live code, test, CI, hook, or maintained-doc consumer depends on an archive/compression/removal-bound path.
- Relocated files have explicit owners and focused verification evidence.
- Archive compression remains disabled until these checks pass.

## Phase 2 — Normalize task lifecycle placement

1. Refresh the effective-status inventory immediately before moves.
2. Archive every bundle still under `active/` whose authoritative old-contract state is `done`.
3. Keep `T-043`, `T-129`, and this convergence task under `active/`.
4. Sync through the authoritative governance command for the current phase and compare IDs, statuses, mappings, and paths with the baseline.

Exit criteria:

- No effective `done` bundle remains incorrectly active.
- Retained tasks remain active with unchanged IDs.
- No task ID is duplicated, reused, or manually reassigned.

## Phase 3 — Install the new task-governance authority

1. Refresh the approved fixed task-governance assets from their authoritative source.
2. Read the supplied new contract and conversion tooling before changing repository records.
3. Define one bounded cutover window and a rollback point; do not maintain parallel authorities beyond the cutover.
4. Remove repository-local skill mechanisms and generated local skill wrappers after confirming no supported consumer remains.
5. Reduce `.ai/` to the project hub, relocating or retiring non-hub contents according to the approved fixed contract.

Exit criteria:

- Fixed assets, not repository-local skills, own task-governance behavior.
- `.ai/` is project-hub-only.
- No supported command or hook depends on removed local mechanisms.

## Phase 4 — Convert task bundles and project hub

1. Convert every active and archived task bundle to the new contract using supplied tooling where available.
2. Convert the project hub and regenerate derived views from the new authority.
3. Preserve stable task IDs and compare the normalized post-conversion M/F graph with the Phase 0 baseline.
4. Assert `T-043` and `T-129` are active and the convergence task remains recoverable.
5. Remove old-contract-only metadata only after the new validator accepts the complete corpus.

Exit criteria:

- Every bundle and hub record validates under the new contract.
- The M/F graph comparison is equal.
- No hybrid old/new metadata remains authoritative.

## Phase 5 — Remove UI governance scaffolding while preserving runtime CSS

1. Trace UI imports and renderer entrypoints to distinguish runtime styles from governance-only assets.
2. Preserve `ui/styles/ui.css`, required tokens, and `ui/styles/desktop-runtime/**` compatibility selectors used by the desktop runtime.
3. Remove governance-only UI contracts/config/codegen/pattern assets only after consumer checks.
4. Repair supported imports/references without recreating the retired desktop legacy compatibility layer.

Exit criteria:

- Runtime UI CSS remains loaded and focused UI checks pass.
- Governance-only UI scaffolding and its stale consumers are absent.
- `apps/desktop/src/renderer/styles/**` and `apps/desktop/src/renderer/app-layout.css` are not recreated.

## Phase 6 — Clean integrations and compress archives last

1. Update or remove CI, Git hook, root/maintained docs, and tooling references to retired governance paths and commands.
2. Run repository-wide scans for old contract markers, local skill paths, removed UI governance paths, and archive-bound live references.
3. Run new governance lint and targeted CI/hook/docs/UI checks without invoking deployment or paid/external workflows.
4. Only after Phase 1 and the reference scans pass, compress historical archives using the approved format and retain an index, integrity evidence, and recovery instructions.
5. Review the full diff against the approved scope and update handoff records.

Exit criteria:

- Supported CI/hooks/docs use only the new governance surface.
- No live consumer points into compressed historical storage.
- Governance, reference, import, integrity, and diff checks pass.

## Risks and mitigations

- Risk: scope expands into product cleanup.
  - Mitigation: constrain changes to governance records/mechanisms, lifecycle placement, references, and explicitly approved UI-governance cleanup.
- Risk: current inventory changes before execution.
  - Mitigation: derive lifecycle actions from the authoritative status at execution time and separately assert retained task IDs.
- Risk: new fixed assets cannot represent current graph semantics.
  - Mitigation: compare in a dry-run/staging projection and stop before cutover on any lossy mapping.
- Risk: deletion/compression hides a live dependency.
  - Mitigation: relocate first, update consumers, verify, then remove/compress last.
- Risk: `.ai/` reduction removes still-supported operational data.
  - Mitigation: classify every non-hub path against the new contract and live-reference inventory before removal.

## Current opening checklist

- [x] Old contract and recent old-format bundle inspected.
- [x] Duplicate task search and baseline old lint completed.
- [x] Seven-file planned bundle drafted without a manual metadata file or guessed Task ID.
- [x] Old CLI dry-run reviewed; it proposed only the metadata file and four expected hub outputs.
- [x] Old CLI apply completed; it allocated `T-145`.
- [x] `F-000` / `M-000` mapping and unique identity verified by ID, slug, and metadata queries.
- [x] Final old governance lint passed.
