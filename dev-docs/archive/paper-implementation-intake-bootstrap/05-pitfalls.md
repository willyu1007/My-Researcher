# 05 Pitfalls

## Do Not Repeat
- Do not rename existing bridge contracts as part of bootstrap.
- Do not bootstrap directly from `PaperProject`.
- Do not allow stale upstream hashes to update implementation authority in place.
- Do not hide upstream recheck requirements in UI-only warnings.
- Do not use `paper_project` or `research_argument` as the feedback source kind for implementation findings; use `paper_implementation`.
- Do not store gate/query fields only in JSON payloads. Keep bridge/project/snapshot/hash/status fields columnized.
- Do not treat `target_paper_project_ref` as write authority. It is lineage only in T-093.
- Do not assume read-then-create bootstrap is race-safe. The repository must map same bridge/hash uniqueness races to existing admissions and changed hashes to `VERSION_CONFLICT`.
- Do not dispatch upstream/downstream feedback before the local `ImplementationFeedbackEvent` exists. PaperImplementation must keep the first append-only audit record.
