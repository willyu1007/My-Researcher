# 05 Pitfalls

## 2026-05-18 Guards
- LocalScript must stay opt-in outside `NODE_ENV=test`; do not silently enable arbitrary local command execution.
- Keep `shell=false`, execution-root containment, and command allowlist checks together. Removing any one of the three reopens command/path escape risk.
- LocalScript submit must remain asynchronous. Do not regress to waiting for process completion inside `submit`, because `sync`, `cancel`, and external-job lifecycle semantics depend on a running job state.
- LocalScript child processes must not inherit the full backend `process.env`; pass only a small sanitized environment and keep captured stdout/stderr bounded.
- Do not store or inline cloud SDK payloads, credentials, endpoint/region/queue, OSS request bodies, or adapter-private response bodies in public DTOs. Use `ExperimentFoundationAdapterMetadataRef` refs/hashes.
- Aliyun PAI-DLC remains a mockable boundary in T-077. Real SDK wiring and credential handling must be a later hardening package with explicit secrets/config review.
- Cloud mirrors remain execution mirrors. `DatasetMirror` dataset-version identity, readiness/freshness/checksum/policy approval must be checked before submit and must not become canonical dataset identity.
- Result collection may create productized evidence only from complete protocol-compliant passed validation. Historical `accepted_partial` behavior is superseded by T-132 D-03b/D-16 and must not create new EvidenceCandidate/RunEvidenceUnit; collection still must not create paper claims, final conclusions, rendered tables, or leaderboard rows.
- Result evidence must be backed by locked metric definitions and generated `EvaluationFact` refs; do not emit evidence from metric-only adapter payloads that are not tied back to the locked protocol.
- The dedicated external job table owns execution runtime state; the T-076 registry remains the canonical DTO payload store for frozen domain contracts.
- T-078 UI must consume T-077 execution APIs and must not reimplement adapter execution, readiness, result validation, or persistence semantics in the renderer.

## Do Not Repeat
- Do not build a training platform.
- Do not treat cloud mirrors as canonical.
- Do not add CustomHttpAdapter to V1 scope.
