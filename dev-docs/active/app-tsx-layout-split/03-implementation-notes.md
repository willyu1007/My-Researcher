# 03-implementation-notes

- Initialized task bundle for App.tsx + app-layout.css split continuation.
- Phase continuation: moved auto-import and manual-import business handlers from `App.tsx` into `useAutoImportController` and `useManualImportController`.
- Extended controller hooks to absorb derived state (runs pagination/labels, manual validation/visibility/stats, invalid-row auto-uncheck, open-row reconciliation).
- Added overview action controller: `literature/overview/useOverviewActionsController.ts` for scope/citation/pipeline/filter actions and feedback recovery.
- Extracted governance rendering to `shell/components/GovernancePanel.tsx`.
- Extracted shell and dashboard derivations:
  - `shell/useShellHandlers.ts` (module/nav/governance toolbar actions)
  - `shell/useDashboardMetrics.ts` (metric cards + release queue)
- Extracted governance panel controller to `shell/useGovernancePanelController.ts`:
  - timeline / metrics / artifact loading moved out of `App.tsx`
  - release review form state and submit handler moved out of `App.tsx`
  - `GovernancePanel` props in `App.tsx` collapsed to a single grouped object
- `App.tsx` reduced further to 1397 lines after governance controller extraction.
- Extracted literature module composition to `literature/LiteratureWorkspace.tsx`:
  - `AutoImportTab` / `ManualImportTab` / `OverviewTab` / `MetadataIntakePanel` rendering branch moved out of `App.tsx`
  - `literature/index.ts` now exports `LiteratureWorkspace`
  - `App.tsx` keeps grouped tab props and module switching, but no longer expands the full literature module tree inline
- `App.tsx` reduced to 1388 lines after literature workspace extraction.
