# 09 v1a Quality Matrix

## Purpose
This matrix separates "callable" from "product-quality closed" for v1a. A node is not considered fully closed just because `WorkflowHarness` can invoke it; it must also preserve handoff semantics, deterministic blockers, warning propagation, and authority-write boundaries.

## Closure Levels
- `closed`: deterministic gates, negative tests, handoff trace, and downstream consumption are implemented.
- `partially_closed`: callable and guarded, but output-quality depth or downstream warning propagation still needs more evidence.
- `open`: policy or implementation is not sufficient for automated product-grade flow.

## Matrix
| Node | Current closure | Quality focus | Implemented checks | Remaining test focus |
|---|---|---|---|---|
| N1 `create-topic-seed` | partially_closed | Topic intent/scope must be stable enough for automation. | TitleCard existence, non-empty seed input through authority service, trace artifact. | Add stricter scope-shape negatives only if real runs show ambiguous topic seed handoff. |
| N2 `snapshot-literature-resource-pool` | partially_closed | Resource pool must be fixed, snapshot-hashed, and source-health warnings explicit. | Supported source scope, topic-seed lineage, snapshot hash stability, missing literature blockers, source-health warnings. | Add high/low quality pool fixtures once resource sampling policies stabilize. |
| N3 `create-search-plan` | closed_for_current_scope | SearchPlan blueprint must prevent fallback/default coverage semantics and own target method families. | Required blueprint, schema/version/hash guards, concrete refs, explicit query/coverage intents, explicit `method_family_targets`, no service fallback rows. | Add provider/Codex blueprint drafting canary only if SearchPlan drafting becomes model-assisted. |
| N4 `record-search-run` | closed_for_current_scope | SearchRun must be audit-factual and hand off only stable authority refs plus coverage-role and method-target expectations. | Snapshot hash/lineage, accounting consistency, snapshot membership, raw-log boundary, failed-run loopback, `coverage_role_expectations` and `method_family_targets` in handoff. | Add real importer/search-provider cases when Node 4 stops using fixture-like search-run bundles. |
| N5 `build-evidence-map` | closed_for_current_scope | EvidenceUnit extraction must preserve source authority and SearchPlan coverage role/method-target semantics. | Source-claim only, locator/source/literature inside handoff, input refs hash, support/challenge conflict review, coverage-row role mismatch blocker, missing input-literature blocker, method targets in EvidenceMap handoff, provider-backed extraction canary. | Add stronger malformed/provider-missing extraction fixtures only if larger provider samples expose more omission patterns. |
| N6 `generate-need-candidate` | closed_for_current_scope | Candidate admission must reject schema-valid but semantically invalid evidence refs and carry target-method coverage gaps. | Role-aware ref gates, SearchPlan-targeted method-family gap warning, rank projection artifact, exact replay, supplemental/reject semantics. | Broaden provider canary sample size after N5 provider extraction is stable. |
| N7 `validate-need-adjudication` | closed_for_current_scope | Validate decisions must carry residual risks and quality gaps forward. | Support-packet residual risk defaults, residual-risk dropped blocker, method-family gap carry-forward, exact replay. | Add provider negative canary for validate-with-risk once model policy matrix expands. |
| N8 `human-confirm-need` | closed_for_current_scope | Human/delegated confirmation must preserve accepted risks and semantic review provenance. | Reserved id materialization, delegated policy guard, semantic review lineage, duplicate/partial-write guards, exact replay. | Add UI/manual operator acceptance evidence when desktop entry exists. |
| N9 `publish-v1b-input-bundle` | closed_for_current_scope | v1a terminal bundle must carry refs and risks without reinterpreting v1a authority. | Explicit handoff input, lineage validation, expected-version idempotency, exact replay, terminal bundle publication. | Recheck after v1b normalization decides its first callable intake contract. |

## Current Enhancement Slice
The active enhancement slice is provider-path depth:
- The v1a harness can run N5 evidence extraction, N6 generate-need-candidate, and N7 validate-need-adjudication recommendation as `provider_llm` in one flow.
- The 4-literature combined provider canary `v1a-combined-provider-stability-20260524-01` passed with exactly three provider calls and continued through N9.
- The first 8-literature canary exposed an N5 omission risk: provider output covered 7 of 8 selected literature refs. The materialization gate now blocks `EVIDENCE_UNIT_MISSING_FOR_INPUT_LITERATURE` before authority writes when this happens.
- The rerun `v1a-combined-provider-depth-8lit-20260524-02` passed with exactly three provider calls, 8 persisted EvidenceUnits, 3 NeedCandidates, and risk/gap carry-forward through N9.
- The N7 negative canary `v1a-n7-provider-negative-clean-validate-20260524-01` used one real provider call and confirmed clean validate overreach is blocked by `RESIDUAL_RISK_DROPPED` without downstream authority writes.
- The N7 negative canary `v1a-n7-provider-negative-method-gap-20260524-01` used one real provider call and confirmed method-family gap dropping is blocked by `METHOD_FAMILY_COVERAGE_GAP_DROPPED` without downstream authority writes.
- The 12-literature combined provider canary `v1a-combined-provider-depth-12lit-20260524-01` passed with exactly three provider calls, 12 persisted EvidenceUnits, 3 NeedCandidates, and risk/gap carry-forward through N9.
- The first mixed N6 debate/provider run exposed a role-bundle prompt weakness: `arbiter.final_synthesis` put baseline/challenge/context units into support refs, and deterministic admission blocked it with `ROLE_BUNDLE_EVIDENCE_ROLE_MISMATCH` before authority writes.
- The fix adds prompt-visible role ref constraints for both single-agent and debate arbiter N6 paths. The rerun `v1a-mixed-n6-debate-provider-20260524-03` passed with exactly five provider calls, N6 debate success, 3 persisted NeedCandidates, role-correct authority refs, and N7/N9 risk/gap carry-forward.
- The replay smoke `v1a-replay-smoke-post-role-ref-constraints-20260524` passed after the role-ref-constraint fix: N6-N9 exact replay made zero provider calls and input-hash drift blocked without authority count changes.

## Next Slice
After this slice, provider-path v1a has enough breadth to stop expanding sample size by default. The next product-quality target should be downstream continuity rather than more v1a breadth:
- Move to v1b intake/normalization using the v1a bundle outputs that carry residual risks and method-family gaps.
- Only add a 16-literature v1a provider run if a future v1b/v1c test needs a wider upstream fixture; it is no longer the default next step.
