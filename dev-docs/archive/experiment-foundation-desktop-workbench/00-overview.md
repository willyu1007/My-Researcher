# 00 Overview

## Status
- State: done
- Parent task: `T-043 experiment-foundation-v1`
- Next step: parent package closure review; any real cloud SDK/credential hardening should be tracked outside V1 minimum closure.

## Goal
- Add the desktop `实验基座` workbench below `文献管理`, exposing asset registry, readiness, recipe, job/result, evaluation fact, and sidecar workflows without owning experiment semantics in the UI.

## Non-goals
- Do not recreate `apps/desktop/src/renderer/styles/**` or `app-layout.css`.
- Do not invent UI-only domain state that differs from shared contracts.
- Do not implement training or adapter logic in the renderer.

## Responsibilities
- Add navigation entry and route/view structure.
- Build data-ui/token-governed workbench surfaces.
- Consume backend APIs for assets, readiness, recipes, jobs, results, evidence, and sidecars.
- Consume T-077 job submit/sync/cancel/collect status and result/evidence outputs; do not reimplement adapter execution in the renderer.
- Provide scan-friendly operational views and guarded actions.

## Boundary
- Owns desktop presentation and interaction.
- Consumes shared contracts and backend API.
- Does not own persistence, adapter execution, or paper claim semantics.

## Done Means
- [x] `实验基座` appears below `文献管理`.
- [x] UI smoke and governance checks pass.
- [x] No legacy CSS dependency is added.

## Acceptance Criteria
- [x] `实验基座` navigation entry is placed immediately below `文献管理`.
- [x] Registry/readiness/promotion/recipe-materialization/execution-evidence surfaces consume existing backend APIs.
- [x] Renderer does not implement persistence, adapter execution, readiness rules, result validation, or paper-claim semantics.
- [x] UI uses shared experiment-foundation constants/types rather than copied renderer enums.
- [x] UI verification, governance gate, and project governance lint pass.
