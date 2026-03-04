# 03-implementation-notes

- Initialized task bundle for App.tsx + app-layout.css split continuation.
- Phase continuation: moved auto-import and manual-import business handlers from `App.tsx` into `useAutoImportController` and `useManualImportController`.
- Extended controller hooks to absorb derived state (runs pagination/labels, manual validation/visibility/stats, invalid-row auto-uncheck, open-row reconciliation).
- Added overview action controller: `literature/overview/useOverviewActionsController.ts` for scope/citation/pipeline/filter actions and feedback recovery.
- Extracted governance rendering to `shell/components/GovernancePanel.tsx`.
- Extracted shell and dashboard derivations:
  - `shell/useShellHandlers.ts` (module/nav/governance toolbar actions)
  - `shell/useDashboardMetrics.ts` (metric cards + release queue)
- `App.tsx` reduced to orchestration layer and reached line target: 1494 lines.
