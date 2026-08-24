# 03 Implementation Notes

## Intake - 2026-05-18
- Created T-082 because T-068 is done and explicitly excludes full PaperProject execution.
- Scope is the downstream boundary after active `PaperProjectBridge`, plus recheck loopback actionability.

## Boundary Inventory - 2026-05-18
- Existing implemented path:
  - v1c creates an active `PaperProjectBridge`;
  - downstream feedback can be recorded against that bridge;
  - feedback creates a downstream recheck request plus risk-memory event/impact/queue refs when recheck is required.
- Missing product path:
  - `/paper-projects` creates PaperProject records from `title_card_id`, title, and `initial_context.literature_evidence_ids`; it does not accept or verify `PaperProjectBridge`;
  - legacy `/title-cards/:titleCardId/promote-to-paper-project` creates PaperProject through title-card package/value artifacts, not through v1c `PaperProjectBridge`;
  - no explicit bridge-to-PaperProject or bridge-to-research-argument intake adapter exists yet.
- Acceptance interpretation: current backend can produce a bridge and can accept downstream feedback/recheck against that bridge, but cannot yet claim product-level PaperProject consumption of the bridge.

## Recheck Actionability Fix - 2026-05-18
- Added service and route assertions that every downstream recheck-producing signal carries:
  - deterministic loopback target and cause;
  - affected functional ref;
  - required action and reason code;
  - source refs including `paper_project_bridge`, `promotion_decision`, and `promotion_input_snapshot`;
  - retrievable recheck projection by feedback id and recheck id.
- Found and fixed a routing bug:
  - stale evidence should route to `evidence_or_search`;
  - the old implementation used broad `includes("search")`, so `research_slice` was incorrectly treated as a search ref;
  - search-ref matching is now boundary-aware and no longer matches `research_*`.
- Added risk-memory stage routing coverage so downstream feedback on v1a/v1b/v1c refs persists concrete affected stages instead of `unknown`.

## PaperProject Intake Implementation - 2026-05-18
- Added explicit route:
  - `POST /topic-selection/v1c/paper-project-bridges/:bridgeId/paper-project-intake`.
- Added shared contracts:
  - `TopicSelectionPaperProjectBridgeIntakeInput`;
  - `TopicSelectionPaperProjectBridgeIntakeResult`;
  - JSON schemas for intake body and result.
- Added service behavior:
  - requires a configured PaperProject gateway;
  - requires active bridge and exact `bridge_payload_hash`;
  - rejects workspace drift and incomplete downstream refs;
  - creates PaperProject through existing `ResearchLifecycleService.createPaperProject`;
  - attaches `paper_project_intake_ref` and `target_paper_project_ref` through repository update;
  - returns duplicate calls idempotently once both refs are attached;
  - rolls back the just-created PaperProject if bridge ref attachment fails.
- Added repository support:
  - in-memory and Prisma `attachPaperProjectRefs`;
  - hash conflict and attachment conflict errors mapped to stable `VERSION_CONFLICT`.
- Fixed evidence carry-forward discovered during E2E:
  - v1c promotion gate dossier now carries `selected_literature_evidence_ids` into `source_snapshot_excerpt`;
  - human commitment profile preserves those IDs in scope;
  - PaperProject intake prefers explicit literature evidence IDs before falling back to selected evidence refs/source refs.

## Deep Contract Tightening - 2026-05-18
- Added service-level intake invariants:
  - explicit `selected_literature_evidence_ids` are deduplicated and preferred over fallback evidence refs;
  - empty selected-evidence baskets block PaperProject creation before calling the downstream gateway;
  - duplicate intake with a stale `bridge_payload_hash` is rejected instead of being treated as idempotent success;
  - bridge payload hash, working-copy hash, and promotion snapshot hash remain unchanged after refs are attached.
- Added HTTP-level intake invariants:
  - post-intake bridge readback preserves bridge status, payload hash, working-copy hash, source promotion decision, and promotion input snapshot;
  - stale duplicate intake returns `VERSION_CONFLICT` and does not create an additional PaperProject.
