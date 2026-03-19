# 04-verification

- Pending

- `pnpm --filter @paper-engineering-assistant/desktop typecheck` -> PASS
- `pnpm --filter @paper-engineering-assistant/desktop build` -> PASS
- `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e` -> PASS (`[desktop-smoke] PASS`; dev SIGTERM/143 on teardown expected)
- `wc -l apps/desktop/src/renderer/App.tsx` -> `1494`
- `pnpm --filter @paper-engineering-assistant/desktop build` (after style segment extraction) -> PASS
- `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e` -> first FAIL due occupied port `5189` (env conflict), rerun after `lsof -ti :5189 | xargs -r kill -9` -> PASS (`[desktop-smoke] PASS`, teardown 143 expected)
- final `pnpm --filter @paper-engineering-assistant/desktop typecheck` -> PASS
- `pnpm --filter @paper-engineering-assistant/desktop typecheck` (after extracting `shell/useGovernancePanelController.ts`) -> PASS
- `pnpm --filter @paper-engineering-assistant/desktop build` (after extracting `shell/useGovernancePanelController.ts`) -> PASS
- `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e` (after extracting `shell/useGovernancePanelController.ts`) -> PASS (`[desktop-smoke] PASS`; dev teardown 143 expected)
- `wc -l apps/desktop/src/renderer/App.tsx apps/desktop/src/renderer/shell/useGovernancePanelController.ts` -> `1397 App.tsx`, `247 useGovernancePanelController.ts`
- `pnpm --filter @paper-engineering-assistant/desktop typecheck` (after extracting `literature/LiteratureWorkspace.tsx`) -> PASS
- `pnpm --filter @paper-engineering-assistant/desktop build` (after extracting `literature/LiteratureWorkspace.tsx`) -> PASS
- `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e` (after extracting `literature/LiteratureWorkspace.tsx`) -> PASS (`[desktop-smoke] PASS`; dev teardown 143 expected)
- `wc -l apps/desktop/src/renderer/App.tsx apps/desktop/src/renderer/literature/LiteratureWorkspace.tsx` -> `1388 App.tsx`, `33 LiteratureWorkspace.tsx`
