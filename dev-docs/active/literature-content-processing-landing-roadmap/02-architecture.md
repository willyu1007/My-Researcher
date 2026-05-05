# 02 Architecture

## Initial Boundary Hypothesis
- Collection owns bibliographic identity and source discovery.
- Content-processing owns durable semantic assets.
- Retrieval owns read-side ranking over active semantic assets.

## Data Flow Hypothesis

```mermaid
flowchart LR
  A["Collection record"] --> B["Explicit content-processing run"]
  B --> C["Content acquisition / normalization"]
  C --> D["Fulltext preprocessing"]
  D --> E["Structured semantic dossier"]
  E --> F["Chunking"]
  F --> G["Embedding version"]
  G --> H["Token/vector index"]
  H --> I["Active embedding pointer"]
  I --> J["Retrieval"]
```

## Storage Layers To Decide
- Literature identity:
  - Existing `LiteratureRecord`, source rows, dedup keys.
- Raw content:
  - PDF/HTML/text upload local filesystem path referenced by DB.
  - Rights and source provenance.
- Normalized content:
  - Clean text, section map, citation anchors, checksum.
- Structured extraction:
  - Abstract, key content, methods, datasets, results, limitations, contribution, reviewer evidence candidates.
- Retrieval assets:
  - Chunks, embeddings, token index, vector profile, active version pointer.

## First Design Bias
- Keep collection tables lean.
- Keep extraction and vectorization outputs versioned.
- Make reruns idempotent by content checksum + embedding profile.
- Activate a new embedding version only after index stage succeeds.
- Treat retrieval as read-only over active versions.

## Accepted Decision - D1 Storage Boundary
- Local database is the SSOT for:
  - Literature identity and bibliographic metadata.
  - Source references and dedup metadata.
  - Content-processing state, runs, steps, artifacts metadata, checksums, and provenance.
  - Embedding versions, chunks, token index, and active embedding pointer.
- Raw files are stored on the local filesystem, not as database blobs.
  - DB records point to local paths.
  - Records should include asset kind, path, checksum, mime type, byte size, source provider/source URL, rights class, created/updated timestamps, and soft-delete status.
- Settings should expose configurable local storage roots by category.
  - Raw literature files.
  - Normalized text outputs.
  - Content-processing artifacts/cache.
  - Optional export/output directory.
- Path settings are application configuration, not collection metadata.
  - Collection can record source URLs and source payload.
  - Content acquisition should materialize files under configured local roots and write DB references.
- Any required persisted path/config tables should be handled by a follow-up DB SSOT task.

## Accepted Decision - D2 Citation Normalization
- `CITATION_NORMALIZED` is executed by deterministic backend code, not by an LLM.
- The stage validates and records normalized citation metadata:
  - DOI normalization.
  - arXiv ID normalization.
  - Title normalization.
  - Author normalization.
  - Year parsing.
  - Source URL presence.
  - `titleAuthorsYearHash` generation.
  - `citation_complete` derivation.
- Trusted metadata APIs may supplement missing fields, but the first implementation should keep LLMs out of the main citation identity path.

## Accepted Decision - D3 Abstract Readiness
- `ABSTRACT_READY` exists to provide a trustworthy short-form abstract layer.
- Primary consumers:
  - Literature overview.
  - `KEY_CONTENT_READY` extraction.
  - Fallback content when fulltext is unavailable.
  - Retrieval cold start.
- First implementation should prefer deterministic/scripted sources:
  1. Abstract already present in collection metadata.
  2. Abstract section parsed from local PDF/HTML/fulltext.
  3. User-entered abstract.
  4. Trusted external metadata APIs.
- LLM-generated summaries are not equivalent to original abstracts by default.
  - If introduced later, they must be marked as generated and ideally require user confirmation before being treated as high-trust abstract data.
- Minimum output:
  - `abstract_text`
  - `abstract_source`
  - `source_ref`
  - `checksum`
  - `language`
  - `confidence`
  - `updated_at`
- `LiteratureRecord.abstractText` may keep the primary display abstract.
- Rich provenance should be stored in an artifact or follow-up normalized table.

## Accepted Decision - D4 Key Content Readiness
- `KEY_CONTENT_READY` means the paper semantic dossier is complete.
- It is not a shallow digest stage.
- Target stage order should be:
  - `CITATION_NORMALIZED`
  - `ABSTRACT_READY`
  - `FULLTEXT_PREPROCESSED`
  - `KEY_CONTENT_READY`
  - `CHUNKED`
  - `EMBEDDED`
  - `INDEXED`
- Rationale:
  - Full semantic extraction needs the paper body or equivalent complete user-provided material.
  - Later automation depends on comprehensive, categorized, source-grounded semantics.
  - Chunking and retrieval should be able to use both standardized text and semantic dossier outputs.
- Execution model:
  - Scripts parse sections and prepare candidate spans.
  - LLM performs schema-bound extraction.
  - Backend validates schema completeness and source references.
  - Stage should fail or block when required source material/provenance is missing.
- Minimum semantic categories:
  - `research_problem`
  - `contributions`
  - `method`
  - `datasets_and_benchmarks`
  - `experiments`
  - `key_findings`
  - `limitations`
  - `reproducibility`
  - `related_work_positioning`
  - `evidence_candidates`
  - `automation_signals`
- Provenance requirement:
  - Key fields should include source references.
  - Evidence candidates must include traceable source anchors such as section, page/paragraph, char offsets, chunk id, source checksum, or equivalent.
- Storage:
  - `LiteratureRecord.keyContentDigest` remains a display summary only.
  - Full semantic dossier should be stored as a `KEY_CONTENT_READY` artifact or a later normalized table.

## Accepted Decision - D5 Fulltext Preprocessing
- `FULLTEXT_PREPROCESSED` is parser-led and LLM-assisted.
- The stage focuses on faithful extraction and source alignment, not semantic interpretation.
- Responsibilities:
  - Resolve local source asset path and checksum.
  - Parse PDF/HTML/text/manual content into normalized text.
  - Preserve sections, paragraphs, page numbers, char offsets, and source checksums.
  - Extract figures, tables, formulas, references, captions, bounding boxes, and local derived asset paths when available.
  - Record paragraph-to-figure/table/reference relationships.
  - Run OCR for scanned text or figure/table embedded text where needed.
- OCR boundary:
  - OCR can make image text searchable.
  - OCR does not provide reliable understanding of figure/table contribution, claim support, visual trend, or paper-level significance.
- Visual/table semantic interpretation belongs to `KEY_CONTENT_READY`.
  - It should produce `figure_insights`, `table_insights`, `claim_evidence_map`, and `important_visual_evidence`.
  - Those semantic outputs must reference the structural anchors produced by `FULLTEXT_PREPROCESSED`.

## Draft Stage Output Contract - D4/D5
- This section defines the expected stage outputs for implementation planning.
- It is not a Prisma schema decision yet.
- If these payloads need query-heavy access, a follow-up DB SSOT task should decide which fields move from artifacts into normalized tables.

### `FULLTEXT_PREPROCESSED` Outputs
- MUST produce a durable fulltext artifact or equivalent persisted payload containing:
  - `source_asset_ref`: local path, checksum, mime type, byte size, source kind, rights class.
  - `normalized_text_ref`: local path or DB artifact reference for normalized text output.
  - `document_structure`: ordered sections with titles, nesting, page ranges, paragraph ids, char offsets, and checksums.
  - `paragraphs`: paragraph id, section id, page number, text span, char offsets, confidence, and source checksum.
  - `figures`: figure id, caption, page number, bbox, extracted image/local derived asset path when available, OCR text, and nearby paragraph anchors.
  - `tables`: table id, caption/title, page number, bbox, extracted structured cells or markdown/text representation, OCR text when needed, and nearby paragraph anchors.
  - `formulas`: formula id, page number, bbox or text span, extracted representation when available, and nearby paragraph anchors.
  - `references`: bibliography entries and in-text citation anchors when detectable.
  - `layout_links`: paragraph-to-figure/table/formula/reference relationships.
  - `extraction_diagnostics`: parser used, OCR used, confidence, warnings, missing sections, and failure reason if partial.
- MUST preserve source alignment so downstream semantic extraction can cite section/page/paragraph/char offset anchors.
- SHOULD avoid paper-level interpretation; semantic meaning belongs to `KEY_CONTENT_READY`.

### `KEY_CONTENT_READY` Outputs
- MUST produce a durable semantic dossier artifact or equivalent persisted payload containing:
  - `research_problem`: problem statement, motivation, scope, and source refs.
  - `contributions`: categorized claims of novelty/contribution and source refs.
  - `method`: model/system/algorithm/pipeline description, assumptions, implementation-relevant details, and source refs.
  - `datasets_and_benchmarks`: datasets, benchmarks, splits, metrics, baselines, and source refs.
  - `experiments`: experiment setup, variables, ablations, comparison groups, and source refs.
  - `key_findings`: primary results, quantified improvements, negative findings, and source refs.
  - `limitations`: stated limitations, inferred constraints if clearly evidenced, and source refs.
  - `reproducibility`: code/data availability, configuration hints, compute requirements, missing reproducibility data, and source refs.
  - `related_work_positioning`: how the paper positions itself against prior work and source refs.
  - `evidence_candidates`: reviewer-aligned evidence snippets with claim id, evidence type, strength, and traceable source anchors.
  - `figure_insights`: semantic interpretation of important figures, what each figure supports, and referenced structural anchors.
  - `table_insights`: semantic interpretation of important tables, what each table supports, and referenced structural anchors.
  - `claim_evidence_map`: mapping from core claims to paragraphs, figures, tables, formulas, and experiment evidence.
  - `important_visual_evidence`: visual/table evidence that is critical for downstream review, retrieval, or automation.
  - `automation_signals`: structured signals for later writing, reviewer response, comparison, and evidence automation.
  - `quality_report`: schema completeness, missing evidence, confidence, ambiguity, and extraction warnings.
- MUST reference anchors from `FULLTEXT_PREPROCESSED` whenever fulltext-derived evidence is used.
- MUST keep `LiteratureRecord.keyContentDigest` as a short overview digest only; the complete dossier belongs in an artifact or later normalized tables.

## Accepted Decision - D9 Key Content Extraction Contract
- `KEY_CONTENT_READY` should produce a versioned semantic dossier.
- This decision refines D4 and does not add a new stage code.
- Recommended top-level payload:
  - `schema_version`: first version should be `key_content.v1`.
  - `extraction_profile`: first profile should be `paper_semantic_dossier.v1`.
  - `input_refs`: abstract artifact id, fulltext artifact id, fulltext checksum, and upstream stage versions.
  - `categories`: the structured semantic categories defined by D4/D5.
  - `quality_report`: completeness, confidence, blockers, conflicts, warnings, and extraction diagnostics.
- Category item shape:
  - Each semantic item SHOULD use a common structure with `id`, `type`, `statement`, `details`, `source_refs`, `confidence`, `evidence_strength`, and `notes`.
  - `source_refs` MUST be present for core evidence-bearing items.
  - Source refs MUST resolve to anchors from `FULLTEXT_PREPROCESSED`, abstract provenance, or explicit user-provided material.
- Minimum ready gate:
  - `research_problem` is non-empty.
  - `contributions` is non-empty.
  - `method` is non-empty or explicitly marked not found.
  - `key_findings` is non-empty or explicitly marked not applicable/no experimental result.
  - Core evidence-bearing items have at least one resolvable source ref.
  - `quality_report.blockers` is empty.
- Partial and failed outcomes:
  - Stage code remains `KEY_CONTENT_READY`; readiness details live in stage status and artifact diagnostics.
  - `READY` means schema validation passes, core categories are populated or explicitly marked not found, and source refs resolve.
  - `PARTIAL_READY` means the dossier is useful but incomplete, such as abstract-only input, missing fulltext, partial figure/table extraction, low OCR confidence, or incomplete source refs.
  - `FAILED` means the dossier is not usable, such as no valid input, schema validation failure, unresolved required source refs, rights/auth blocking, or provider failure.
- Recommended reason codes:
  - `NO_FULLTEXT`
  - `RIGHTS_RESTRICTED`
  - `USER_AUTH_REQUIRED`
  - `OCR_LOW_CONFIDENCE`
  - `FIGURE_EXTRACTION_PARTIAL`
  - `TABLE_EXTRACTION_PARTIAL`
  - `SCHEMA_VALIDATION_FAILED`
  - `SOURCE_REF_UNRESOLVED`
  - `LLM_PROVIDER_FAILED`
  - `INPUT_STALE`
- Invalidation:
  - Abstract changes should mark `KEY_CONTENT_READY` stale.
  - Fulltext artifact changes should mark `KEY_CONTENT_READY`, `CHUNKED`, `EMBEDDED`, and `INDEXED` stale.
  - Semantic schema/profile changes should mark `KEY_CONTENT_READY` and downstream stages stale.
  - Manual semantic dossier edits should mark `CHUNKED`, `EMBEDDED`, and `INDEXED` stale.
- Human correction and merge policy:
  - Semantic fields SHOULD carry provenance such as `extracted`, `user_edited`, `imported`, or `generated`.
  - Field-level override policy SHOULD support `preserve_user`, `replace_on_rerun`, and `merge_on_rerun`.
  - Default behavior should preserve `user_edited` fields across reruns.
  - Automatic extraction may add candidates on rerun, but should not silently delete user-confirmed entries.
  - Conflicts between automatic extraction and user-confirmed content should be recorded in `quality_report.conflicts` for UI resolution.
- LLM extraction strategy:
  - First implementation should use section-level extraction followed by paper-level consolidation.
  - Section-level extraction produces localized semantic candidates with source refs.
  - Paper-level consolidation deduplicates, merges claims, normalizes terminology, and produces the final semantic dossier.
  - Avoid whole-paper one-shot extraction as the default because it weakens retry granularity, provenance, and long-document handling.

## Accepted Decision - D6 Chunking
- `CHUNKED` converts upstream text and semantic assets into stable retrieval units.
- It does not create embeddings and should not perform new paper-level semantic interpretation.
- Inputs:
  - `ABSTRACT_READY` abstract payload.
  - `FULLTEXT_PREPROCESSED` normalized text, structure, and anchors.
  - `KEY_CONTENT_READY` semantic dossier, visual/table insights, and claim-evidence map.
  - `CITATION_NORMALIZED` bibliographic identity for metadata enrichment.
- Execution model:
  - Chunking should be executed by a backend deterministic chunking service.
  - The core chunker should be script/rule-led TypeScript logic inside the content-processing worker/service path.
  - LLMs may influence upstream semantic inputs, but should not freely decide chunk boundaries in this stage.
  - LLMs should not be called by the normal `CHUNKED` stage for paper-level interpretation.
  - Reruns must be idempotent for the same source checksums and chunking profile.
- Abstract handling:
  - Abstract should be chunked as an independent single chunk, not split like full body text.
  - The abstract chunk is useful for cold-start retrieval, overview, and no-fulltext fallback.
  - Abstract chunks must carry `origin_stage`, `abstract_source`, and source trust metadata.
  - Generated summaries, if present, must be marked derived and must not be treated as original paper evidence.
- Chunk structure:
  - First implementation should use flat chunks with rich classification metadata.
  - Do not create a physical hierarchy such as parent/child/section/sentence chunk trees in the first version.
  - Fine-grained downstream consumption should rely on classification metadata and provenance filters.
- Required chunk types:
  - `abstract`: one high-density abstract chunk from `ABSTRACT_READY`.
  - `source_text`: original paper text spans from `FULLTEXT_PREPROCESSED`.
  - `semantic_dossier`: categorized semantic extraction from `KEY_CONTENT_READY`.
  - `evidence`: claim/evidence units from `KEY_CONTENT_READY`.
  - `visual_table`: figure/table/caption/OCR/insight units tied back to fulltext anchors.
- Recommended classification metadata:
  - `semantic_category`: `research_problem`, `contribution`, `method`, `dataset`, `benchmark`, `experiment`, `finding`, `limitation`, `reproducibility`, `related_work`, `visual_evidence`.
  - `evidence_role`: `claim`, `support`, `metric`, `comparison`, `ablation`, `limitation`, `reproduction_signal`.
  - `source_scope`: `original_text`, `original_abstract`, `metadata`, `derived_semantic`, `visual`, `table`.
  - `origin_stage`: `ABSTRACT_READY`, `FULLTEXT_PREPROCESSED`, or `KEY_CONTENT_READY`.
- Stability requirement:
  - `chunk_id` must be stable across reruns.
  - It should be derived from `literature_id`, source checksum, `chunking_profile_version`, chunk type, and source or semantic anchor.
  - It should not include volatile run ids or timestamps.
- Invalidation:
  - Changes to abstract payload, fulltext artifact, semantic dossier, or chunking profile should mark `CHUNKED` and downstream `EMBEDDED`/`INDEXED` stale.
  - Metadata-only citation changes may update chunk metadata without forcing text re-chunking unless they change chunk identity or filtering semantics.

## Draft Stage Output Contract - D6
- `CHUNKED` MUST produce a durable chunk set or equivalent persisted payload containing:
  - `chunk_id`
  - `literature_id`
  - `chunking_profile_version`
  - `origin_stage`
  - `chunk_type`
  - `semantic_category`
  - `evidence_role`
  - `source_scope`
  - `source_refs`
  - `source_checksum`
  - `artifact_ref`
  - `text`
  - `token_count`
  - `metadata`
  - `created_at`
- `source_refs` MUST preserve enough provenance to return to original or derived sources:
  - section id/title.
  - page number.
  - paragraph id.
  - char offsets.
  - figure/table/formula ids.
  - semantic dossier field path.
  - source artifact id/checksum.
- Chunk text SHOULD include enough local context for retrieval, but MUST distinguish original paper text from derived model interpretation through `source_scope` and `origin_stage`.

## Accepted Decision - D7 Embedding
- `EMBEDDED` converts stable chunks into vector representations.
- Executor:
  - `EMBEDDED` should be executed by a backend embedding service inside the content-processing worker/service path.
  - The service reads the `CHUNKED` output, batches provider calls, validates returned vector count/dimensions, and persists per-chunk embeddings.
  - The service does not perform retrieval and does not activate the new embedding version.
- Provider strategy:
  - Use OpenAI Embeddings API as the default embedding provider.
  - Keep local DB/vector storage as the primary pipeline and SSOT.
  - Do not use OpenAI Vector Store as the primary chain because it automatically chunks, embeds, and indexes files, which conflicts with local stable `chunk_id`, chunk-level provenance, stage versioning, and active pointer control.
  - OpenAI Vector Store may be considered later as an optional cloud mirror or Responses `file_search` integration, not as the authoritative retrieval store.
- Default profile:
  - Default profile should be `openai/text-embedding-3-large` with default dimensions.
  - Economy profile should be `openai/text-embedding-3-small` with default dimensions.
  - Code should keep provider/model/dimensions configurable through an embedding profile.
  - Do not maintain simultaneous small and large active spaces for the same retrieval scope in the first version.
- Rationale for defaulting to large:
  - The domain is research papers, where small method differences, formulas, experiment settings, and claim/evidence relationships matter.
  - Later workflows require cross-document comparison and organization; a single high-quality active embedding space is simpler and more reliable than dual small/large retrieval.
  - `text-embedding-3-large` does not replace structured extraction or keyword search, but it is the better default semantic space for this product.
- Local storage estimate for 10,000 papers:
  - Raw vector formula: `paper_count * chunks_per_paper * dimensions * 4 bytes`.
  - `text-embedding-3-small` default dimensions: 1536.
  - `text-embedding-3-large` default dimensions: 3072.
  - Approximate raw vector storage:
    - 20 chunks/paper: small 1.23 GB, large 2.46 GB.
    - 50 chunks/paper: small 3.07 GB, large 6.14 GB.
    - 100 chunks/paper: small 6.14 GB, large 12.29 GB.
    - 150 chunks/paper: small 9.22 GB, large 18.43 GB.
  - Real local storage should reserve roughly 2-4x raw vector size for chunk text, provenance, token index, vector index, version metadata, and DB/index overhead.
- Version lifecycle:
  - At `EMBEDDED` start, create a new `embedding_version` with status `IN_PROGRESS`.
  - Version metadata MUST include provider, model, dimensions, distance metric, chunking profile version, chunk set checksum, embedding profile version, and content-processing run id.
  - Per-chunk embeddings SHOULD be written with an idempotent key such as `embedding_version_id + chunk_id`.
  - When all chunk embeddings are successfully persisted and validated, mark the version `READY`.
  - `EMBEDDED` MUST NOT update the active embedding pointer.

## Draft Stage Output Contract - D7
- `EMBEDDED` MUST produce or update a durable embedding version containing:
  - `embedding_version_id`
  - `literature_scope`
  - `provider`
  - `model`
  - `dimensions`
  - `distance_metric`
  - `chunking_profile_version`
  - `chunk_set_checksum`
  - `embedding_profile_version`
  - `status`
  - `created_by_run_id`
  - `created_at`
  - `completed_at`
- Each embedded chunk MUST persist:
  - `embedding_version_id`
  - `chunk_id`
  - `vector`
  - `vector_checksum`
  - `token_count`
  - `provider_response_metadata`
  - `created_at`

## Accepted Decision - D8 Indexing And Retrieve
- `INDEXED` makes a `READY` embedding version queryable.
- Executor:
  - `INDEXED` should be executed by the backend indexing service inside the content-processing worker/service path.
  - It builds or refreshes local vector index, token/BM25 index, and metadata filter indexes for the candidate embedding version.
- Activation:
  - Only `INDEXED` may activate an embedding version.
  - Activation happens after local index build succeeds and a minimum retrieval smoke check passes.
  - Active pointer update should be transactional from the product perspective: the old active version remains readable until the new version is fully indexed.
  - When a new version is activated, previous active versions may be marked `SUPERSEDED` but should remain available for rollback until cleanup policy deletes them.
- Retrieve behavior:
  - Retrieve reads only active indexed versions by default.
  - Query-time vector retrieval MUST embed the user query using the same active embedding profile as the target index.
  - Do not query small and large indexes simultaneously in the first version.
  - Query embeddings are ephemeral and do not create an embedding version.
  - Query embedding cache is allowed with key `normalized_query + active_embedding_profile_id`.
  - If the embedding provider is unavailable, retrieve should degrade to local keyword/BM25 and metadata filtering.
- Retrieval strategy:
  - Use hybrid retrieval: vector search plus keyword/BM25 plus metadata filters.
  - Filters should include topic, literature id, chunk type, semantic category, evidence role, source scope, and origin stage.
  - Results MUST return provenance: chunk id, source refs, page/section/paragraph/offset anchors, figure/table anchors when applicable, and embedding version id.
  - Retrieval must distinguish original paper text from derived semantic interpretation through `source_scope` and `origin_stage`.

## Accepted Decision - D10 Retrieve Profile Contract
- Indexing and retrieval should use a unified foundation with scenario-specific retrieve profiles.
- Do not create separate physical indexes for topic exploration, paper management, and writing evidence in the first version.
- Unified index foundation:
  - Local vector index for semantic similarity over active embedding versions.
  - Local token/BM25 index for exact terms, formulas, method names, dataset names, acronyms, and identifiers.
  - Metadata/filter indexes for topic, literature id, chunk type, semantic category, evidence role, source scope, origin stage, stage readiness, and version.
  - Provenance store for page, section, paragraph, char offsets, figure/table/formula anchors, source artifact id, and checksums.
- Retrieve profiles:
  - `general`: balanced default retrieval.
  - `topic_exploration`: favors research problems, contributions, limitations, related work positioning, and semantic diversity.
  - `paper_management`: favors paper lookup, abstracts, methods, datasets, experiments, metadata filters, and precise location.
  - `writing_evidence`: favors evidence chunks, key findings, source text, visual/table evidence, original sources, and mandatory provenance.
- Retrieve profile config should control:
  - `chunk_type_weights`
  - `semantic_category_weights`
  - `source_scope_policy`
  - `metadata_filters`
  - `hybrid_weights`
  - `diversity_policy`
  - `require_provenance`
  - `max_results`
  - `rerank_policy`
- First-version API shape can be a single retrieve endpoint that accepts profile and filters.
- Suggested request shape:
  - `query`
  - `profile`: `general`, `topic_exploration`, `paper_management`, or `writing_evidence`.
  - `filters`: topic ids, literature ids, chunk types, semantic categories, source scopes, evidence roles, origin stages.
  - `limit`
  - `options`: optional debug/score breakdown flags.
- Suggested result shape:
  - `chunk_id`
  - `literature_id`
  - `score`
  - `score_breakdown`
  - `chunk_type`
  - `semantic_category`
  - `source_scope`
  - `origin_stage`
  - `text`
  - `source_refs`
  - `embedding_version_id`
- Ranking formulas and rerank policies should remain adjustable by profile.
- Later product modules may tune profile weights based on actual topic, paper-management, and writing workflows without changing the storage/index foundation.

## Accepted Decision - D11 Trigger And Stale Propagation
- Trigger scope:
  - This decision applies only to the post-collection content-processing chain.
  - Collection completion must not automatically enqueue content-processing runs.
  - Collection or metadata changes may refresh state and action availability.
- Trigger principle:
  - Stale propagation only marks state and recommended actions.
  - It must not automatically create a run.
  - Any action that may call LLMs, OCR, embedding providers, or rebuild indexes must be explicitly triggered by the user.
- Existing explicit trigger path:
  - The backend already exposes `POST /literature/{literatureId}/content-processing/runs`.
  - The desktop overview can remain the primary lightweight entry point.
  - Complex controls should live in a detail panel/workbench rather than crowding the overview table.
- Recommended user actions:
  - `process_content`: run from the earliest missing/stale stage to `KEY_CONTENT_READY`.
  - `process_to_retrievable`: run to `INDEXED`.
  - `rebuild_index`: rebuild downstream retrieval assets without redoing upstream extraction when possible.
  - `reextract`: rerun from a selected extraction stage.
  - `retry_failed`: continue or rerun from the failed stage.
  - `view_reason`: show stale/blocked/failed diagnostics.
- Dependency propagation should follow the agreed semantic order:
  - `CITATION_NORMALIZED`
  - `ABSTRACT_READY`
  - `FULLTEXT_PREPROCESSED`
  - `KEY_CONTENT_READY`
  - `CHUNKED`
  - `EMBEDDED`
  - `INDEXED`
- Stale matrix:
  - Citation identity changes such as title, authors, year, DOI, arXiv id, or source URL should mark `CITATION_NORMALIZED` stale and may propagate to downstream stages when source acquisition, display metadata, or chunk metadata are affected.
  - Tags, topic scope, and paper link changes should not stale content stages; they refresh overview, retrieve filters, and metadata indexes.
  - Abstract changes should mark `ABSTRACT_READY`, `KEY_CONTENT_READY`, `CHUNKED`, `EMBEDDED`, and `INDEXED` stale.
  - Raw fulltext add/replace/delete should mark `FULLTEXT_PREPROCESSED`, `KEY_CONTENT_READY`, `CHUNKED`, `EMBEDDED`, and `INDEXED` stale.
  - Storage path config changes should only stale stages if source asset refs become inaccessible; then `FULLTEXT_PREPROCESSED` and downstream stages are affected.
  - Parser/OCR/layout profile changes should mark `FULLTEXT_PREPROCESSED` and downstream stages stale.
  - `key_content.v1` schema or extraction profile changes should mark `KEY_CONTENT_READY` and downstream stages stale.
  - User semantic dossier edits should mark `CHUNKED`, `EMBEDDED`, and `INDEXED` stale.
  - User deletion or withdrawal of semantic dossier items should also re-evaluate `KEY_CONTENT_READY` readiness.
  - Chunking profile changes should mark `CHUNKED`, `EMBEDDED`, and `INDEXED` stale.
  - Embedding provider/model/dimensions/profile changes should mark `EMBEDDED` and `INDEXED` stale.
  - Local vector index engine or ANN parameter changes should mark only `INDEXED` stale.
  - Retrieve profile weight/rerank changes should not stale content-processing stages; they affect query-time ranking config.
  - Rights class changed to `RESTRICTED` should block or invalidate fulltext/deep stages and may require active retrieval warnings or revocation policy.
  - Rights class changed from `RESTRICTED` to a processable class should refresh action availability without auto-running.
  - Embedding provider config changes should mark `EMBEDDED` and `INDEXED` stale.
  - Manual chunk corrections should mark `EMBEDDED` and `INDEXED` stale.
- State representation:
  - `STALE` should be added as a first-class stage status.
  - New code should not use `detail.stale = true` as the primary stale representation.
  - A temporary read compatibility layer may normalize legacy `detail.stale = true` into `STALE` if such data exists.
  - Stage status should distinguish `SUCCEEDED`, `PARTIAL_READY`, `STALE`, `BLOCKED`, and `FAILED`.
  - Stage detail should include `stale_reason_codes`, `stale_from_stage`, `stale_since`, `input_checksums`, `profile_versions`, `blocking_reason_codes`, and `recommended_actions` where available.
- Retrieve behavior while stale:
  - Active embedding versions should not be deleted just because upstream stages are stale.
  - Retrieve may continue to read the old active indexed version.
  - UI should warn that the retrieval index may not reflect the latest content.
  - Only a successful explicit rerun through `INDEXED` should activate a new version.
- Suggested user-facing stale copy:
  - `内容已过期`
  - `全文已变更，需重新处理`
  - `语义提取配置已更新`
  - `向量配置已更新，需重新向量化`
  - `索引配置已更新，需重建索引`
  - `权限限制，无法处理全文`

## Accepted Decision - D12 Backfill And Operations
- Backfill scope:
  - Backfill is for historical or bulk content-processing after collection.
  - It must use the same explicit content-processing chain and stage semantics as single-paper runs.
  - It must not bypass collection/content-processing boundaries or activate partial indexes.
- Work selection:
  - Backfill should support selecting literature by topic, paper project, explicit literature ids, missing stages, stale stages, failed stages, rights class, and date ranges.
  - Backfill requests should include target stage, such as `KEY_CONTENT_READY` or `INDEXED`.
  - Backfill should support dry-run planning that returns counts, estimated chunks, estimated embedding calls, storage estimate, and likely blockers before execution.
- Execution model:
  - Use durable batch jobs that fan out into per-literature content-processing runs or run groups.
  - Each stage must remain idempotent by input checksum, artifact checksum, and profile version.
  - Batch jobs must support pause, resume, cancel, retry failed, and skip blocked.
  - Progress should be checkpointed after each literature/stage so interruption does not restart completed work.
- Concurrency and rate limits:
  - Defaults should be conservative for local desktop operation.
  - Parser/OCR/LLM extraction concurrency should be bounded separately from embedding concurrency.
  - Embedding calls should use batching plus provider rate-limit handling.
  - Index activation should remain per literature/version and must not race active pointer updates.
  - Local storage thresholds should pause or block new work before disk pressure can corrupt artifacts or indexes.
- Cost and quota controls:
  - Backfill UI/API should show estimated provider calls, tokens/chunks, and expected storage before execution.
  - Support a configurable budget or limit for embedding/LLM calls per batch.
  - Provider quota, timeout, and 429/5xx errors should be retryable with backoff.
  - Rights/auth blockers should be non-retryable until user state changes.
- Failure recovery:
  - Retryable failures should keep diagnostics and support bounded retries with exponential backoff.
  - Non-retryable failures should mark the stage/run blocked or failed with reason codes.
  - `retry_failed` should resume from the failed stage when inputs and profiles have not changed.
  - If inputs changed after failure, retry should re-evaluate stale propagation before enqueueing work.
- Version and storage cleanup:
  - Superseded embedding versions should be retained long enough for rollback.
  - Cleanup must never delete the active embedding version.
  - Cleanup may remove superseded embeddings, obsolete local index files, orphan artifacts, and derived cache files after retention policy permits.
  - Raw source files should follow rights/deletion policy and should not be removed as part of embedding cleanup.
- Observability:
  - Batch status should expose total, queued, running, succeeded, partial, blocked, failed, skipped, and canceled counts.
  - Batch detail should expose current literature id, current stage, recent errors, provider throttling, estimated remaining work, and cost/storage counters when available.
  - Run history should remain inspectable for individual literature items.
- UI boundary:
  - Literature overview should keep lightweight single-item actions.
  - Bulk backfill belongs in a dedicated content-processing workbench or operations panel.
  - The UI should make explicit when a batch will call LLMs, OCR, embedding providers, or rebuild indexes.

## Open Architecture Decisions
- Artifact JSON vs normalized tables.
- Source file storage path and retention.
- Parser/LLM provider boundary.
- Exact `STALE` status schema/API migration mechanics.
- Exact chunk token budget and overlap.
- Exact local vector index engine and ANN parameters.
- Embedding cleanup/retention policy for superseded versions.
- Exact retrieve profile weights, diversity rules, and rerank policy.
- Exact batch queue engine, concurrency defaults, budget config, and cleanup retention windows.
