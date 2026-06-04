# 05 Pitfalls

## Do Not Repeat
- Do not treat all `LiteratureRecord` rows as corpus papers; historical topic-selection API evidence rows are present in the same table.
- Do not run `INDEXED` backfill while GROBID is unavailable; PDF fulltext preprocessing will block.
- Do not start large provider-call batches without checking dry-run estimates and budgets.
- Do not assume acquisition dry-run catches missing abstract sources; `ABSTRACT_SOURCE_MISSING` surfaced during apply for manual classic-theory records.
- Do not use collection import for existing-record metadata enrichment without checking `dedupStatus`; current service behavior marks matched existing records as `duplicate`.
- Do not expect DOI-backed acquisition to run unless Unpaywall is enabled with a configured email.
- Do not assume Unpaywall settings are persisted in DB; current usable configuration is `UNPAYWALL_EMAIL` in `.env.local`.
- If GROBID is needed after a restart, first try `docker start pea-grobid-e2e`; it already binds `8070:8070`.
- If unrelated TypeScript errors in another task stream block `ts-node` loader execution, run this campaign runner with `TS_NODE_TRANSPILE_ONLY=true` and document the unrelated typecheck failure separately.
- Do not scale `llm_gateway` `KEY_CONTENT_READY` blindly: it runs section-level extraction and can be far more expensive than the dry-run per-paper estimate suggests.
- Lightweight `codex_curated` dossiers are enough to unblock retrieval/index availability, but they are marked `PARTIAL_READY` and should not be treated as deep claim-level paper understanding.
- `LIT-0252` has a public PDF asset, but GROBID reports `FULLTEXT_OCR_REQUIRED`; it needs an OCR path or a text-bearing PDF before standard preprocessing can complete.
- The `LIT-0252` visual index is a partial retrieval surface only. Do not mark standard `FULLTEXT_PREPROCESSED`, `CHUNKED`, `EMBEDDED`, or `INDEXED` as complete from the manual visual extraction.
- Unscoped `/literature/retrieve` can fail when it attempts to load every active embedding chunk at once. Use topic/paper scoping for verification until retrieval pagination or candidate preselection is implemented.
- `LIT-0257` is a book record without a public fulltext asset in the current source set; do not keep retrying acquisition without a new source.
