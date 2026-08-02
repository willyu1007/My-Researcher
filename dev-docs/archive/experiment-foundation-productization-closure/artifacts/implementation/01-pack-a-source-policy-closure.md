# Implementation Pack A source-policy closure evidence

## Outcome

`packa-d19-source-policy-20260713-r2` is the final bounded Pack A run. The overall summary, source-policy result, A01-A04 and B01-B10 are all `passed`; `source_policy.reason_code=null` and `blockers=[]`. EF-P25 is verified. EF-P27 remains `in-progress` because existing-environment DB apply and product-writer cutover were neither authorized nor performed.

The earlier `packa-d19-final-20260713-r2` `blocked/SOURCE_POLICY_UNRESOLVED` result remains valid historical evidence and is superseded only for that blocker.

## Exact evidence identity

| Evidence | Exact value |
|---|---|
| Final run | `packa-d19-source-policy-20260713-r2` |
| Final summary | `.ai/.tmp/experiment-foundation-productization/packa-d19-source-policy-20260713-r2/summary.json` |
| Summary file SHA-256 | `246ab54eb6a611ec9c1d4430e0cdadb6913989e6561dcc6617e95b6775fc675f` |
| Source-policy attestation | `artifacts/source-policy/00-d19-source-policy-attestation.json` |
| Attestation schema | `d19-source-policy-attestation@v2` |
| Canonical attestation digest | `sha256:48dd3546bcf314c478f80a5bc6ba5bcc0ecc57b848ac0d83fd7d5c9b8ac3bb6e` |
| Attestation file SHA-256 | `bd26c540e6a1698e94e7ddaaf7eb1ce217560e3f8bb0f6e61cc6b990b419d6ef` |
| Migration digest | `ab7e86a3a717f80981052865d151f71938d6652e1d6ad93c9972df72c934ca46` |
| Disposable database | `pgvector/pgvector:0.8.0-pg16`; existing database URL unused; container cleaned |

The canonical attestation digest is the gate identity. The file SHA-256 is recorded only as byte-level artifact integrity and MUST NOT replace the canonical digest.

## Exact source bindings

| Slot | Source | Dataset revision/hash | DataPolicy revision/hash |
|---|---|---|---|
| `wikipedia_corpus` | Wikimedia `mediawiki_content_current:enwiki:2026-07-01`; 19 raw XML/bzip2 shards; text-only `CC-BY-SA-4.0` consumer scope | `ef_asset_revision_0020` / `sha256:523a6f4f0f76f4614da14484f2124f2b5c13fec517da5b21f2d19174774a9ed4` | `ef_asset_revision_0001` / `sha256:49dcbd17426a8eb9dcaa57a384d85e79a8aae6fcc6209cc7661dc9a106dd5a4e` |
| `natural_questions_query_workload` | Google NQ-Open original dev at `fb26a3073b1fe636c97302890a27b491d6530130`; 3,610 records; 391,316 bytes; source SHA-256 `f15567f38099f3615f5b8a685c0aef449c11ad90d3da3735e8d1b98115b40616`; `CC-BY-SA-3.0` | `ef_asset_revision_0021` / `sha256:6546915c16e917854b28d4e20ba0b6419aa8bd23909fdc3fb5fac4215f75a73b` | `ef_asset_revision_0002` / `sha256:91d632e89cee5df3c3db2d5c5e9810a1c9d014729b16b9540d076653f88e38e9` |

Primary-source review and exact URLs are retained in `artifacts/source-policy/01-official-source-policy-evidence.md`.

## Acceptance gates

| Gate | Final result | Bounded proof |
|---|---|---|
| A01 | passed | default-off admission returned the stable disabled reason with zero DB delta |
| A02 | passed | five typed families used server hashes; caller hash and exact-ref tamper failed |
| A03 | passed | draft CAS, immutable freeze replay and command receipts converged |
| A04 | passed | exact target plus 22 ordered dependencies and 17 relational protocol-metric bindings passed; drift/latest/revocation failed |
| B01 | passed | T1 PI admission/current revision/outbox rolled back together under fault |
| B02 | passed | T2 EF inbox/materialization/Run/outbox rolled back together under fault |
| B03 | passed | T3 PI inbox/head CAS/outbox rolled back together under fault |
| B04 | passed | one processed EF `BranchHeadAdvanced` inbox is the sole durable acknowledgement |
| B05 | passed | concurrent and sequential replay converged without duplicate authority |
| B06 | passed | stale, same-sequence conflict, missing prerequisite and payload drift followed frozen outcomes |
| B07 | passed | two-cell parity passed; extra/missing/substituted/reordered/changed manifest failed |
| B08 | passed | all legacy and non-v2 table digests were unchanged; external fetch count was zero |
| B09 | passed | cross-domain relation/FK, legacy ALTER, generic v2 table, persisted capability and shared writer counts were zero |
| B10 | passed | disabling admission after T1 rejected new intake while the committed saga drained through T4 |

All four domain Units of Work committed. T1-T3 rollback probes passed; T4 produced `single_receipt_only`. `WorkOrderRevisionAdmitted`, `RunManifestFrozen` and `BranchHeadAdvanced` were each delivered once and converged under replay.

## Exact final authority state

| Authority | Exact identity |
|---|---|
| WorkOrder revision | `pi_experiment_revision_v2_0003` / `sha256:31797dd5f6db05043daf5e05acc26b94423b871df79abb486ba4f75d3d435a24` |
| VersionLock | `ef_version_lock_v2_0002` / `sha256:52c950441345b0e530193787a63c5c1dbfe6231200c641b37b1c18fa34c33cb4` |
| RunRecipe | `ef_run_recipe_v2_0002` / `sha256:fea867524235f1b97da06c904c09073a06a61958aba3a47a0c59c24e5097b1c6` |
| TrainingTaskSpecs | `ef_training_task_spec_v2_0003` / `sha256:370a0e58028033186e9302062fdfc3992920460f3362204ce7b7ed902e436a19`; `ef_training_task_spec_v2_0004` / `sha256:deb2bbc9848ea23224048df04616cfeb5f7576251d5643dbb552ee70886c83cc` |
| Run manifest | `ef_run_v2_0002` / `sha256:e61af542530ce05a63e8c1e58fd3ca44d0de0d3b61728ffdbfb57d41f7f75ee6` |
| PI branch head | `pi_experiment_branch_v2_0003` |
| EF acknowledgement | `ef_integration_inbox_v2_0003` |

The final state contains one admitted revision, two ordered cells, one VersionLock, one RunRecipe, two TaskSpecs, one Run/manifest, one branch head and one EF acknowledgement. All 197 non-v2 application tables had zero changed-table/write delta; instrumented external fetch count was zero.

## Regression closure

| Check | Result |
|---|---|
| Shared full suite | 318/318 passed |
| Backend full suite | 1,926 total; 1,887 passed; 39 expected skipped; 0 failed; `372405.692333ms` |
| D-19 gate unit suite | 10/10 passed |
| Source-policy targeted suite | 16/16 passed |
| Shared/backend typecheck | passed |
| Prisma validate | passed |
| T-124/T-132 strict docs lint | passed at implementation-lane closure |
| Governance lint | passed |

## Boundary of the PASS

The result proves exact control-plane source/access/license/integrity binding only. The result does **not** prove or authorize:

- download and independent re-hashing of all 19 Wikipedia shards;
- XML extraction, indexing, a derived-corpus hash or extraction reproducibility;
- scientific alignment between NQ answers and the 2026-07-01 Wikipedia snapshot;
- metric validity, result correctness, validation, EvidenceCandidate or evidence eligibility;
- provider/cloud execution, training or paid external requests;
- migration apply to local/dev/staging/prod or any named existing database;
- product admission enablement, traffic routing, legacy writer shutdown or cutover.

Product admission remains default `false`. No existing database URL was used, no provider request occurred and the disposable database was removed.

## Non-blocking maintenance follow-ups

1. The gate and backend currently retain separate digest/validator implementations. Cross-validation passes and any drift fails closed, so the duplication is not a closure blocker; a future maintenance slice SHOULD generate both from one source.
2. Reviewed-attestation digest enforcement currently occurs at the D-19 gate/scenario-loader boundary. If the parser/fixture builder is reused outside that boundary, reviewed-attestation validation MUST move into the reusable builder before product use.

These are maintenance hardening items, not permission to weaken the current fail-closed checks and not blockers for the bounded Pack A result.

## Remaining independent decisions

1. Review and apply the migration to a named existing environment only through a separately authorized DB-SSOT workflow.
2. Resolve active legacy work and separately authorize product admission enablement plus same-release overlapping-writer cutover; EF-P27 remains in progress until that evidence exists.
3. Authorize and verify later provider, scientific validation/evidence, Cycle closure and UI/search slices independently.
