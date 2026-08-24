# 05 Pitfalls

## 2026-05-24 Replay Ref Comparison False Drift
- Symptom: the first `topic-selection:v1a-harness-replay-smoke` runs failed while N6/N7 replay had actually returned replay provenance.
- Root cause: the smoke script compared full JSON-serialized ref objects. Original in-memory refs and replayed trace refs may carry the same `ref_type/ref_id/version_id/title_card_id` with different object key order or auxiliary representation.
- What was tried: the first retry changed N6 candidate refs from JSON object comparison to ref-set comparison, but N7 still failed on a single ref object.
- Fix: compare functional refs by stable signature: `ref_type:ref_id:version_id:title_card_id`; compare ref arrays as sorted signature sets.
- Prevention: replay/idempotency tests must compare stable authority identity fields, not raw object serialization, unless the contract explicitly requires byte-identical JSON.

## 2026-05-24 Provider Output Passing Schema But Failing Evidence Semantics
- Symptom: provider or mocked N6 output can satisfy `RankedCandidateDraftBatch@v1` while putting `evidence_strength_assessment` or conflict refs into role bundles, or using context units as support.
- Root cause: schema validation knows object shape but not EvidenceMap role semantics; resolving refs alone was too weak because all refs were technically known.
- Fix: admission now receives EvidenceMap role metadata and enforces role-specific `evidence_unit` refs before persistence. Invalid role bundles route to supplemental round when budget remains, otherwise `reject_artifact_only`.
- Prevention: model prompts should state role-bundle and strength/conflict separation rules, but backend admission remains the authority boundary; never rely on prompt compliance for role semantics.

## 2026-05-24 Clean Validate Dropping Known Risk
- Symptom: a validate recommendation could previously omit challenge/conflict residual risk and still advance if the packet shape was valid.
- Root cause: N7 recommendation gate checked decision shape but not risk carry-forward against the frozen support packet.
- Fix: support packets now carry challenge/conflict refs as default residual risks, and N7 blocks validate with `RESIDUAL_RISK_DROPPED` if those refs are neither carried nor accepted.
- Prevention: any new adjudication route that can advance must compare its outbound risk refs against support-packet residual risks before authority writes.

## 2026-05-24 EvidenceMap Role Drift From Coverage Rows
- Symptom: an EvidenceMap extraction draft could cite a SearchPlan support coverage row while assigning the extracted EvidenceUnit a challenge role.
- Root cause: Node 4 handoff carried coverage row refs but not the row's expected evidence role, so Node 5 could only check row membership, not role alignment.
- Fix: `TopicSelectionSearchRunHandoff@v1` now carries `coverage_role_expectations`, and N5 materialization blocks mismatched units with `COVERAGE_ROW_ROLE_MISMATCH`.
- Prevention: model-like N5 extraction may suggest roles, but any cited coverage row must match the SearchPlan-derived expectation before EvidenceMap authority writes.

## 2026-05-24 Method-Family Target Drift
- Symptom: N6 could emit method-family coverage warnings from a hard-coded or resource-sample-only family list, even though method-family coverage is part of the topic/search strategy.
- Root cause: `TopicSelectionSearchPlanBlueprint@v1` did not own the target method-family set, so downstream warning logic had no authoritative target source.
- Fix: `method_family_targets` is now required on the SearchPlan blueprint, persisted in SearchPlan `coverage_strategy`, carried through N4/N5 handoffs, and consumed by N6 admission.
- Prevention: do not hard-code method families in E2E scripts or admission gates; compare method target arrays as normalized sets so stable sorting differences do not create false drift.

## 2026-05-24 Provider Strict Schema False Property Rejection
- Symptom: the first N5 provider-backed canary failed before model output because the provider rejected `TopicSelectionEvidenceMapExtractionDraft@v1`.
- Root cause: the shared JSON schema used `properties.<forbidden_field> = false` to forbid fields such as `evidence_map_id`; local Ajv accepts this, but the provider's strict structured-output schema rejected boolean schema values in `properties`.
- Fix: `TopicSelectionAgentOrchestratorService` now projects provider-compatible schemas by removing `false` property schemas before provider calls, while local validation still uses the original schema.
- Prevention: provider schema compatibility must be handled at the invocation boundary, not by weakening shared contracts. Forbidden fields remain blocked by `additionalProperties=false` and local Ajv validation.
