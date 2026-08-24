# 05 Pitfalls

## Do Not Repeat
- Do not collapse provenance into generic `evidence_refs`.
- Do not create citations from memo text.
- Do not hide failed/negative runs from trace.
- Do not use trace repair as a writing-stage cleanup task.
- Do not allow natural-language summaries to enter gates without an explicit field role.
- Do not hide trace status in JSON-only blobs.
- Do not put `human_judgment` back into `internal_interpretation` lineage; use `decision.human_decision_refs` for decision authority.
- Do not let a known writing-affecting target with empty required lineage pass as `complete`.
- Do not trust DB context refresh if Prisma model parsing is truncated by JSON defaults such as `@default("{}")`; queryable trace fields must appear in `docs/context/db/schema.json`.

## Closed Guardrails
- `CitationCandidate` accepts only citable source kinds/types and requires `source_evidence_unit_ref`, `source_locator_id`, non-missing locator quality, `cited_for`, and linked target refs matching the referenced `TraceManifest.target_ref`.
- `rationale_memo`, `display_summary`, and `interpretation` cannot be cited or feed hard gates.
- `semantic_contract` can feed workflow/gates but cannot become citation material.
- `human_judgment` remains decision lineage and cannot directly feed hard gates or citations.
- `ClaimTracePacket` cannot be empty or supported only by decision/internal notes; it needs literature, experiment, or artifact support lineage.
- Natural-language field roles are unique per owner ref, field name, and policy version to prevent conflicting role records.
- Repair queue resolution is append/update metadata on the queue item only; it does not mutate immutable `TraceManifest` authority.
- Retired pre-writing control-plane artifacts are historical only and are not part of the trace kernel authority path.
