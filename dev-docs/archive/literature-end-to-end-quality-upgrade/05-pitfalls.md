# 05 Pitfalls

## Do Not Repeat
- Do not treat source fetch success as import success.
- Do not let arXiv 429 become a noisy permanent failure without cooldown/retry state.
- Do not use mock scorer evidence as proof of real quality scoring.
- Do not download arbitrary URLs without SSRF, redirect, size, MIME, and timeout controls.
- Do not assume DOI/source landing pages are PDFs.
- Do not auto-trigger expensive content-processing from collection import.
- Do not activate a new embedding/index version until indexing and retrieval smoke checks pass.
- Do not rely on one-paper E2E as batch backfill evidence.
- Do not add new feature UI dependencies to the frozen legacy CSS layer.
- Do not confuse dossier-level `curation_source` with item-level `provenance`; curated dossier items must still use the shared schema values such as `user_edited`.
- Do not treat `manual` source refs containing `paragraph:<id>` or `anchor:<id>:label` as stable evidence; repair them to canonical `ref_type` plus bare `ref_id` before import.
- Do not treat a curation handoff as a provider failure. `KEY_CONTENT_CURATION_REQUIRED` means the item is blocked on a dossier and should preserve handoff routes in the checkpoint.
- Do not treat Unpaywall `NO_OA_PDF` as source-health failure. It is a per-literature resolution result and must not put the whole Unpaywall source into cooldown.
- Do not use a current-scope cutover gate result as broad-cutover proof. Broad cutover requires zero audit warnings against the evaluator-v2 fixture.
- Do not compare broad cutover denominators against rows that are expected to block. Use `processable_sample_count` for download/parser/key/index gates and track rights/OCR/no-OA rows as expected blockers.
- Do not assume `pnpm --filter <pkg> exec node .ai/scripts/...` runs from the repo root. Filtered `exec` runs from the package directory; use absolute script paths or repo-root-aware path resolution.
- Do not use an underspecified local Postgres URL for temporary-schema Prisma pushes. In this environment, `postgresql://yurui@localhost:5432/postgres?schema=<schema>` works reliably while shorter localhost URLs can fail inside Prisma's schema engine.
- Do not compare parser expected blockers only by the product reason-code string. The evaluator may use the normalized category `OCR_REQUIRED` while the backend emits concrete codes such as `FULLTEXT_OCR_REQUIRED`.
- Do not assume arXiv DOI strings are resolvable through Unpaywall. Verify the exact DOI returns an OA PDF URL before using it as the DOI/Unpaywall cutover fixture.
- Do not let evaluator source-coverage fixtures duplicate a queried paper's semantic content unless the test is explicitly about duplicate handling; duplicate content can make rank-level retrieval checks unstable while recall@5 still passes.
- Do not store real PDFs under the repo. Local real E2E raw files should go under `/Volumes/DataDisk/Paper/Auto/<run-id>` or another explicit external raw-files root.
- Do not treat metadata dedup as raw-file dedup. Current dedup merges/updates literature records by DOI, arXiv ID, and title-authors-year; registered PDF assets remain per literature/content asset.
- Do not treat cluster candidates as merges. `candidate` clusters are review artifacts only; retrieval consumes only `confirmed` same-work clusters whose members are `accepted`.
- Do not let cluster status outrun member decisions. `confirmed`, `rejected`, and `split` are terminal review states and must not leave pending/conflicting member decisions behind.
- Do not let repository patch semantics diverge between in-memory and Prisma implementations. `undefined` patch fields must mean "leave unchanged"; otherwise route tests can pass/fail differently from Prisma-backed runs.
- Do not put invalid source configuration behind source cooldown. Client-side config failures are retryable only after configuration changes, not after sleeping.

## Known Lessons From Pre-Task Testing
- arXiv can rate-limit immediately in local test loops; source-specific pacing is required.
- Crossref can return incomplete records; partial import counts are expected and must stay visible.
- GROBID service can parse normal PDFs well, but scanned/no-text PDFs need an explicit OCR decision.
- A downloaded raw asset alone does not mean the literature is retrieval-ready; citation/abstract/fulltext/key-content/chunk/embedding/index gates remain explicit.

## 2026-05-10 - Curated Dossier Provenance Field

- Symptom: The first Codex curated full-chain evaluator run downloaded all 10 PDFs, but every key-content import failed with `body/dossier/categories/research_problem/0/provenance must be equal to one of the allowed values`.
- Root cause: The temporary evaluator used `human_curated` as item-level `provenance`. The shared contract intentionally allows `model_generated | user_edited`; `codex_curated | manual_curated` belong to dossier import `curation_source`, not each item.
- What was tried: The run continued to retrieval, but no literature was indexed because all imports were rejected.
- Fix/workaround: Reset the temporary schema, changed evaluator item provenance to `user_edited`, and reran the full 10-paper evaluator.
- Prevention: Keep curation source and item provenance semantically separate in future fixtures and UI affordances.

## 2026-05-10 - Evaluator Pass Is Not Broad Cutover Evidence By Itself

- Symptom: The Codex curated evaluator passed `10/10` download/parser/key-content/index and `25/25` recall@5, but audit still reported warnings.
- Root cause: The current sample is arXiv-only, all 25 queries are unclassified, and the report lacks per-literature stage timing plus full token/cost attribution.
- Fix/workaround: Added `literature-e2e-report-audit.mjs` to make these weaknesses explicit in every formal report.
- Prevention: Do not use recall@5 alone as a cutover decision; require stratified queries, DOI/Unpaywall/parser-edge samples, stale/provenance checks, and cost/timing telemetry.

## 2026-05-10 - Source Cooldown Must Be Source-Level

- Symptom: A mock batch with one Unpaywall no-OA item and one Unpaywall 429 item initially stalled because no-OA recorded a source cooldown before the 429 item ran.
- Root cause: The worker recorded every acquisition failure as source-health failure, even when the failure described only one DOI or an invalid item-level input.
- Fix/workaround: Source runtime cooldown is now recorded only for retryable source/download failures. Non-retryable blockers such as `UNPAYWALL_NO_OA_PDF`, `UNPAYWALL_NOT_CONFIGURED`, `DOWNLOAD_REJECTED`, rights blockers, and missing sources remain item-level blockers.
- Prevention: Future source-health logic should ask whether retrying a different item through the same source is likely to fail before setting global cooldown.

## 2026-05-10 - Runner Paths and Temporary Schemas

- Symptom: The first `literature-e2e-v2-runner.mjs` invocation could not find repo-relative fixture paths when executed through a backend package filter.
- Root cause: `pnpm --filter @paper-engineering-assistant/backend exec ...` changes the working directory to `apps/backend`, so `.ai/scripts/...` and fixture paths are no longer relative to the repo root.
- Fix/workaround: The runner now resolves the fixture and evidence paths relative to `--repo-root`, and test invocations should use an absolute path to the runner when launched through a filtered package.
- Prevention: Future repo-level E2E scripts should either run from the repo root without `--filter` or accept an explicit repo root and normalize all fixture/evidence paths through it.

## 2026-05-10 - Cutover Denominators Need Expected Blockers

- Symptom: A broad evaluator that includes rights-gated or OCR-required samples can look like it failed download/parser/index gates if every fixture row is counted in the denominator.
- Root cause: The original cutover gate treated `sample_count` as the denominator for every stage, which is correct for 10 processable OA samples but wrong once the fixture includes expected blocker rows.
- Fix/workaround: The v2 runner emits `processable_sample_count`, `expected_blocker_count`, and `expected_blocker_success_count`; the cutover gate now uses processable rows for positive gates and validates expected blockers separately.
- Prevention: When adding no-OA, rights-gated, or scanned samples, always specify `expected_pipeline_outcome` in the fixture instead of letting the runner infer that every row must reach `INDEXED`.

## 2026-05-10 - OCR Blocker Code Normalization

- Symptom: The first `v2-smoke` run correctly reached an OCR-required parser blocker for the blank PDF fixture, but the runner marked it failed.
- Root cause: The fixture and task language use the normalized category `OCR_REQUIRED`; the backend stage detail emits the concrete reason code `FULLTEXT_OCR_REQUIRED`.
- Fix/workaround: The runner now accepts both values for expected blocker success and still records the concrete backend code as `blocker_code`.
- Prevention: Evaluator assertions should compare normalized categories for pass/fail decisions and preserve concrete product codes for diagnostics.

## 2026-05-10 - Unpaywall DOI Fixture Must Return a PDF

- Symptom: The provided Unpaywall email worked, but the original DOI fixture using `10.48550/arXiv.1706.03762` returned 404 from the live Unpaywall DOI endpoint.
- Root cause: The fixture assumed the arXiv DOI form was usable as DOI/Unpaywall OA coverage. It was not available through that Unpaywall path.
- Fix/workaround: Replaced the DOI fixture with a PLOS OA DOI that returns `is_oa=true` and a concrete `url_for_pdf`; added matching curated facts in the runner.
- Prevention: Broad-cutover DOI fixtures must be preflighted against Unpaywall for both record availability and `best_oa_location.url_for_pdf`.

## 2026-05-10 - Duplicate Fixture Content Can Hide Rank Instability

- Symptom: Consecutive full runs both passed recall@5, but ResNet queries `q07` and `q08` moved from rank `1` to rank `2` in the second run.
- Root cause: The explicit-PDF coverage fixture reused the ResNet PDF and ResNet curated facts, so the retrieval corpus contained duplicate semantic evidence for the same expected topic.
- Fix/workaround: Replaced the explicit-PDF fixture with an independent Vision Transformer PDF and added independent curated facts.
- Prevention: Use source-coverage samples that are semantically distinct from query-target samples, or add explicit duplicate-resolution assertions when duplicate papers are intentional.

## 2026-05-10 - Raw PDF Storage Is External but Still Retained

- Symptom: The first v2 reports counted PDFs only under `.ai/.tmp`, which would miss PDFs after moving the raw root outside the repo.
- Root cause: The audit assumed raw PDFs lived below the evidence directory.
- Fix/workaround: The runner now records effective storage roots, and the audit scans the configured external raw-files root.
- Prevention: Treat external raw PDF retention as explicit local state. Do not infer cleanup from temporary Postgres schema teardown.

## 2026-05-10 - Dedup Must Refresh Derived Identity Keys

- Symptom: A record first imported with DOI but without authors/year could later receive authors/year from Crossref, yet still fail a future title-author-year dedup match.
- Root cause: Duplicate import filled missing metadata but did not recompute `normalizedTitle` and `titleAuthorsYearHash`.
- Fix/workaround: Collection import now recomputes derived identity keys on duplicate merges and checks uniqueness before updating.
- Prevention: Any future metadata merge path must update raw identity fields and derived identity fields together.

## 2026-05-10 - Retrieval Top-K Can Be Consumed by Split Work Records

- Symptom: If historical duplicate records survive collection dedup, retrieval can return multiple hits for the same paper and crowd out distinct works.
- Root cause: Retrieval grouped chunks by `literatureId`, not by work identity aliases.
- Fix/workaround: Retrieval now computes canonical work groups from DOI/arXiv/title-author-year aliases, keeps the best hit per work, and applies `top_k` after dedup.
- Prevention: Future clustering/fuzzy dedup should feed the same work-identity grouping layer instead of adding another retrieval-only grouping concept.

## 2026-05-10 - Same-Work Retrieval Should Prefer Canonical Identity Owners

- Symptom: The duplicate-stress E2E correctly grouped a historical split clone with the DOI canonical work, but still returned the clone in one top5 result.
- Root cause: Same-work selection used the highest retrieval score. A cloned or stale split record can score slightly higher than the canonical record even though it should not be the user-visible representative.
- Fix/workaround: Same-work retrieval dedup now prefers records that directly own the canonical identity key, then compares identifier strength and score.
- Prevention: Keep representative selection separate from evidence scoring. Future fuzzy/clustered dedup should identify the canonical representative explicitly instead of letting chunk score choose it.

## 2026-05-10 - Acquisition Item Ordering Must Not Depend on UUIDs

- Symptom: The Unpaywall no-OA plus 429 mock test could time out waiting for a fulltext acquisition job.
- Root cause: Job items shared the same `createdAt`; repository reads then used random UUID as the tie-breaker. If the 429 item ran first, it set a source cooldown and made the no-OA item wait far longer than the test/job should.
- Fix/workaround: Job item `createdAt` now increments by plan order, preserving deterministic queue order in both in-memory and Prisma repositories without adding schema.
- Prevention: Batch queues need an explicit stable ordering field or stable timestamp assignment whenever source cooldown can affect later items.

## 2026-05-10 - Cluster Candidates Need an Explicit Review Boundary

- Symptom: It is tempting to let exact same-PDF or same-normalized-text evidence immediately collapse records.
- Root cause: File/text identity is strong evidence, but it can still represent bad imports, copied PDFs, or fixture collisions. Auto-merging would erase provenance and make later correction harder.
- Fix/workaround: Cluster generation writes structured candidates with evidence and member decisions, but does not mutate literature records. Retrieval only consumes clusters after they are `confirmed` and members are `accepted`.
- Prevention: Future UI and cleanup workflows should act through cluster decisions rather than adding a second hidden merge path.

## 2026-05-11 - Terminal Cluster Status Requires Complete Member Decisions

- Symptom: A cluster could be marked `confirmed` while some members remained `pending`; the review DTO would expose a blocker, but retrieval could still consume accepted members because the cluster status was already confirmed.
- Root cause: The initial Batch 4 validation checked the requested review outcome and accepted-member count, but did not require terminal statuses to resolve every member decision.
- Fix/workaround: `confirmed` now requires all member decisions resolved and an accepted representative; `rejected` and `split` require every member decision to be rejected. Consumption scope is also computed from those completion conditions.
- Prevention: Future cluster workflows should treat member decisions as part of the status transition, not as optional metadata that can lag behind the status.

## 2026-05-10 - Candidate Regeneration Must Be Idempotent

- Symptom: A repeated candidate scan can look harmless but still update existing cluster timestamps and reorder review queues.
- Root cause: The first cluster implementation used upsert for every detected candidate, even when the cluster already existed and `include_existing` only meant "return it".
- Fix/workaround: Candidate generation now returns existing clusters without writing them; `include_existing=false` suppresses them from both response items and summary counts.
- Prevention: Treat candidate generation as idempotent discovery. Review decisions and timestamps should change only through explicit cluster update operations.

## 2026-05-10 - PDF Coalescing Must Not Become Hidden Cleanup

- Symptom: Checksum-based duplicate PDF detection can easily be mistaken for permission to delete or rewrite local PDF paths.
- Root cause: Exact checksum identity is strong storage evidence, but the product still needs reviewable provenance and local retention guarantees; storage cleanup has different risk from duplicate detection.
- Fix/workaround: The current implementation records `metadata.storage_coalescing` as a non-destructive candidate with `destructive_cleanup_allowed=false`. It chooses the canonical candidate by earliest asset creation time and does not replace paths.
- Prevention: Future storage cleanup must be a separate dry-run/apply workflow with explicit active-asset protections, not an implicit side effect of asset registration.

## 2026-05-10 - Embedding Reuse Needs Artifact Checksums, Not Stage Status Alone

- Symptom: Re-running `EMBEDDED` after a successful pipeline could either waste embedding calls or accidentally reuse stale vectors.
- Root cause: Stage state alone cannot prove that the current CHUNKED input, embedding profile, provider/model, dimension, and stored vectors still match.
- Fix/workaround: Reuse is allowed only when the `EMBEDDINGS` artifact records the current `chunk_artifact_checksum` and the stored vectors/profile/model/provider/dimension match. Matching READY/INDEXED embedding versions are reused instead of creating duplicate history rows.
- Prevention: Any future chunker/profile change must update artifact checksums and profile metadata before enabling reuse.

## 2026-05-11 - E2E Secret Readback Must Use Desktop Electron Context

- Symptom: A lightweight E2E run reached `KEY_CONTENT_READY` but blocked `EMBEDDED/INDEXED` with zero embedding telemetry.
- Root cause: The local OpenAI secret is encrypted by the desktop Electron app. Reading it with root-level `pnpm exec electron` failed and injected the command-error text into `OPENAI_API_KEY`, so the backend saw a non-empty but invalid key.
- Fix/workaround: Read the local encrypted secret through `pnpm --filter @paper-engineering-assistant/desktop exec electron <script>` or provide a real `OPENAI_API_KEY` directly in the shell environment.
- Prevention: E2E wrappers should smoke-test embeddings after secret readback and before starting a long evaluator run; non-empty key checks are not sufficient.

## 2026-05-11 - Invalid Auto-Pull Config Must Not Cool Down A Source

- Symptom: After source-runtime pacing was added to auto-pull, the route retry test could leave a retry run stuck in `RUNNING` because the first invalid Zotero config attempt set a 60 second `zotero` cooldown.
- Root cause: Generic `SOURCE_UNREACHABLE` was treated as retryable without checking whether the thrown error was a client-side `AppError` such as missing Zotero `library_type`/`library_id`.
- What was tried: The route test initially disabled source throttle and increased polling, but the retry still waited behind cooldown because the persisted runtime state was wrong.
- Fix/workaround: Auto-pull source runtime failure recording now treats `AppError` failures with status `<500` as non-retryable. Rate-limit/transient source failures still enter cooldown; invalid config records `FAILED` without cooldown.
- Prevention: Future source-health changes should decide retryability from both the normalized alert code and the original error class/status, not from alert code alone.
