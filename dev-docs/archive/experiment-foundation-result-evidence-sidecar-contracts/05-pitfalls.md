# 05 Pitfalls

## Do Not Repeat
- Do not let ExperimentResult become a paper claim.
- Do not put final table generation into S1 contracts.
- Do not copy reusable asset DTOs into paper-project sidecar.

## 2026-05-17 - Result/evidence boundary guards
- Symptom: A thin result/evidence DTO can let raw job output be treated as paper-ready evidence or final claim text.
- Root cause: Result collection, validation, fact extraction, evidence nomination, and paper binding are adjacent concepts but have different owners.
- What was tried: Kept result packets, validation reports, facts, evidence candidates, table fact sets, and sidecars as separate contracts with explicit refs/hashes between them.
- Fix/workaround: Added schema-level forbidden fields for claim text, paper acceptance, final conclusions, rendered tables, leaderboards, rankings, and copied full DTOs.
- Prevention: Later persistence/API/UI work must preserve the chain `Result -> ValidationReport -> Fact/Observation -> EvidenceCandidate -> PaperExperimentSidecar`; it must not add shortcuts from raw result to paper claim.
