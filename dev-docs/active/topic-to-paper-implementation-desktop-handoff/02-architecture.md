# 02 Architecture

## Context & current state
- `PaperProjectBridgeCard` owns the bridge and server-issued `bridge_payload_hash`; after intake the card renders only a textual handoff notice.
- `App.tsx` already owns active module selection and other cross-surface state.
- `PaperModule` mounts `PaperImplementationWorkbench` without an initial context.
- `usePaperImplementationWorkbenchController` already supports project lookup by bridge, idempotent bootstrap, project adoption, and read-model loading.

## Proposed design

### Components / modules
- Topic Workbench emits one typed “continue to Paper Implementation” intent containing the existing bridge record or a minimal owner-issued bridge context.
- `App.tsx` owns that bounded handoff long enough to switch to `论文管理` and pass the context to `PaperModule`.
- `PaperModule` passes the context to `PaperImplementationWorkbench`.
- The existing controller resolves the bridge to an existing project first and bootstraps only on the documented not-found path.
- Existing read models remain the source for Claim/Dossier display.

### Interfaces & contracts
- Public API endpoints: no new endpoint expected.
- Existing consumers:
  - Paper Implementation lookup by `paper_project_bridge_id`.
  - Existing idempotent bootstrap with the owner-issued `bridge_payload_hash`.
  - Existing project read-model aggregation for Claims and Dossiers.
- New desktop-only type: one small handoff value with an explicit Topic owner and Paper Implementation consumer; final shape is selected after discovery and mocks.
- Data models / schemas: none.
- Events / jobs: none.

### State and recovery
- App-owned handoff state is navigation context, not domain authority.
- Domain records remain persisted by current owners; clicking from the Topic bridge again reconstructs the context after a reload.
- Repeated navigation reads the existing ImplementationProject and must not bootstrap a duplicate.
- Failure preserves the bridge context and exposes one retry without adding a retry budget or workflow state machine.

### Boundaries & dependency rules
- Allowed dependencies:
  - Topic UI → typed callback owned by App composition.
  - Paper UI → existing Paper Implementation API adapter/controller.
  - UI display → existing read models.
- Forbidden dependencies:
  - Direct database access from desktop.
  - Caller-authored hashes or synthetic ImplementationProject ids.
  - Cross-module imports that bypass App-level composition.
  - New generic navigation bus, workflow graph, or authority store.

## Data migration
- Migration steps: none.
- Backward compatibility strategy: retain current lookup/bootstrap behavior; normal navigation pre-populates and invokes the existing behavior.
- Rollout plan: one desktop path behind existing module availability; no capability or traffic cutover.

## Non-functional considerations
- Security/auth/permissions: reuse current local desktop/backend policy; add no auth or approval gate.
- Performance: one lookup plus existing read-model fetch; bootstrap only when absent.
- Observability: use current user-facing loading/error state; no new telemetry system.
- Accessibility: selected mock must preserve button semantics, status announcements, keyboard use, and visible focus.
- Styling: production changes must use `data-ui` and tokens with Tailwind restricted to B1 layout-only; never recreate retired legacy styles.

## Open questions
- Resolved during Phase 0: which static interaction option becomes the production layout.
- Stop condition: if a new backend API, persisted navigation state, or workflow authority appears necessary, pause for a scope decision instead of adding new machinery silently.
