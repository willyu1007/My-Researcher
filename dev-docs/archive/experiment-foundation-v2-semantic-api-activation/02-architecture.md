# T-135 Architecture

## API boundary

- `POST /paper-implementation/projects/{implementation_project_id}/semantic-index/v2/rebuild`
  - no caller-authored document, vector, provider, model, hash or internal id fields;
  - project identity comes from the path;
  - capability-gated mutation with stable result counts.
- `POST /paper-implementation/projects/{implementation_project_id}/semantic-retrieval/v2`
  - accepts only `query` and optional `result_limit`;
  - returns the existing semantic-or-structured-fallback response contract.

## Layering

Routes validate closed HTTP shapes and delegate to a controller. The controller maps stable application/service errors. A runtime application service resolves the configured active embedding profile, constructs the existing T-134 index/retrieval services and delegates all authority decisions. Prisma remains confined to the projection repository.

## Embedding reuse

The adapter calls `BackendLlmGateway.createEmbeddings`; it does not import OpenAI or another provider SDK. Configuration and credentials come from `LiteratureContentProcessingSettingsService`, the same settings path used by topic-management literature retrieval. The current projection contract fixes `vector(3072)`, so the active profile must either use the known native `text-embedding-3-large` dimension or explicitly declare 3072 dimensions. Query cancellation is propagated through the gateway to the provider request and query calls disable retries inside the bounded semantic attempt.

## Runtime composition

- `PaperImplementationSemanticCandidateV2Service` remains the sole structured candidate/document authority.
- `PaperImplementationSemanticEmbeddingV2Adapter` batches document inputs with the existing literature batching helper and preserves document order/identity.
- `PaperImplementationSemanticV2Service` owns capability/profile resolution and delegates to the T-134 index/retrieval services.
- `PrismaPaperImplementationSemanticProjectionV2Repository` is selected only by durable Prisma composition; an injected repository is supported for isolated tests.
- `PAPER_IMPLEMENTATION_SEMANTIC_RETRIEVAL_V2_ENABLED` defaults false, requires committed v2 cutover and still fails disabled unless durable projection composition exists.

## Trust and fallback invariants

- Structured lineage resolves the project before any embedding or projection query.
- Rebuild embeds only authorized documents and replaces only the exact project projection atomically.
- Retrieval performs the existing post-search authoritative reread.
- Timeout, unavailable provider/index, corrupt/incomplete projection or stale hits return complete structured lineage.
- Semantic similarity never promotes assets, changes workflow state or writes scientific evidence.

## Migration boundary

The Prisma SSOT and four migration files are already landed and reviewed by T-134. T-135 applies them only to `127.0.0.1:5432/postgres?schema=my_researcher_dev` after a verified recovery point. No staging/production target is allowed.

## Phase 3 quality-remediation decisions

- Rebuild remains synchronous and projection-state idempotent, but one application instance owns
  one in-flight rebuild per project. Concurrent callers join that operation; caller disconnect only
  cancels provider work after the final waiter leaves, and an overall rebuild deadline is enforced.
- External embedding remains outside database transactions. The index service compares canonical
  authorized source identities immediately before replacement and verifies the installed snapshot
  afterwards; bounded retry repairs a source change without returning a stale-success response.
- Candidate construction consumes one project semantic-lineage snapshot. The Prisma repository
  loads project cycles, branches, heads and attempts in a fixed number of project-scoped queries
  instead of one full repository call per Cycle.
- Shared schemas remain the runtime HTTP SSOT. OpenAPI must expose the same semantic error reason
  codes and must not impose a fallback `maxItems` that the complete-authority response cannot obey.
- No new Prisma model or migration is required for this single-process local-first coordination.
  Cross-process/background rebuild leasing remains outside T-135 because the product composition
  runs one local backend and Phase 3 adds no scheduler or worker.
