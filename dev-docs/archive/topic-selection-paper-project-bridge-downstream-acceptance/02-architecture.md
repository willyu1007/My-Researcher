# 02 Architecture

## Boundary
- Upstream authority: topic-selection v1a/v1b/v1c artifacts through active `PaperProjectBridge`.
- Downstream authority: existing PaperProject / research-argument / writing modules, if present.
- Recheck path: downstream feedback records create recheck requests and risk-memory artifacts that point back to topic-selection loopback targets.

## Expected Product Shape
- `PaperProjectBridge` is the handoff object; it must not silently create or mutate PaperProject state unless an explicit downstream consumer exists.
- Explicit downstream consumer:
  - `POST /topic-selection/v1c/paper-project-bridges/:bridgeId/paper-project-intake`;
  - request must carry the current `bridge_payload_hash`;
  - service creates a PaperProject through the existing research-lifecycle PaperProject gateway;
  - service then atomically attaches `paper_project_intake_ref` and `target_paper_project_ref` to the bridge;
  - duplicate calls with both refs present return the same PaperProject refs without creating another PaperProject.
- Downstream feedback is append-only and must preserve source bridge lineage.
- Recheck requests are actionable routing artifacts, not generic logs.

## Risk Areas
- Legacy title-card promotion routes may create PaperProject records without consuming the new v1c bridge.
- A downstream adapter may consume bridge payload without verifying bridge hash/source promotion authority.
- The bridge-intake adapter must roll back a just-created PaperProject if attaching downstream refs to the bridge fails.
- v1c gate/commitment handoff must preserve `selected_literature_evidence_ids`; otherwise PaperProject intake falls back to lower-level evidence refs and loses the intended literature basket semantics.
- Recheck artifacts may be persisted but lack enough routing detail to drive targeted v1a/v1b/v1c re-entry.
- Real provider runs may expose additional wrapper-ref drift; unknown refs should stay blocked.
