# 05-pitfalls

## Do-not-repeat summary
- Do not hand-write `.ai-task.yaml`; let governance sync assign the task ID.
- Do not migrate backend consumers to `packages/shared/src/...` internal paths.
- Do not remove compat/root barrel wiring before backend root imports are fully migrated.

## Historical log
### 2026-03-22 - Mis-grouped type-only imports after compat test rewrite
- Symptom:
  - `pnpm --filter @paper-engineering-assistant/shared typecheck` failed immediately after replacing compat-barrel imports in `topic-management-contracts.schema.test.ts`.
- Context:
  - The test was rewritten to import type smoke symbols directly from split modules after deleting `interface-field-contracts.ts`.
- What we tried:
  - Initial manual regrouping put literature and auto-pull DTO types into `paper-project-contracts`.
- Why it failed (or current hypothesis):
  - The split modules have strict ownership boundaries; type smoke imports must follow actual symbol ownership, not the old compat barrel reachability.
- Fix / workaround (if any):
  - Reassigned type-only imports to `paper-project-contracts`, `literature-contracts`, and `auto-pull-contracts` according to the real export locations.
- Prevention (how to avoid repeating it):
  - When removing compat barrels, validate each migrated symbol against the split module that actually owns it before running the first typecheck.
- References (paths/commands/log keywords):
  - `packages/shared/src/research-lifecycle/topic-management-contracts.schema.test.ts`
  - `pnpm --filter @paper-engineering-assistant/shared typecheck`

### 2026-03-22 - Root-import guard was too weak when implemented as plain string search
- Symptom:
  - The first version of the backend guard only looked for `from '@paper-engineering-assistant/shared'` substrings.
- Context:
  - This task introduced a static boundary test to prevent backend regressions back to the shared root entry.
- What we tried:
  - Implemented the guard with `contents.includes(...)` checks against a couple of exact string literals.
- Why it failed (or current hypothesis):
  - Plain substring matching can miss side-effect imports or re-exports, and it is unnecessarily sensitive to non-code occurrences.
- Fix / workaround (if any):
  - Replaced it with statement-level regular expressions that cover `import`, `import type`, bare imports, and `export ... from`.
- Prevention (how to avoid repeating it):
  - Any future static import-boundary guard should define the full statement shapes it wants to ban, not just one `from` substring.
- References (paths/commands/log keywords):
  - `apps/backend/src/shared-contract-import-boundary.test.ts`
  - `rg -n "import .*'@paper-engineering-assistant/shared'|export .* from '@paper-engineering-assistant/shared'" apps/backend/src`
