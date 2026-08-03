# T-135 Pitfalls

## Do not repeat

- Do not run `prisma migrate dev` or `db push` against named-local; use reviewed `migrate deploy` only.
- Do not create a second embedding provider/configuration path; reuse `BackendLlmGateway` and application settings.
- Do not accept caller-authored vectors, hashes, model ids, provider ids or document identities.
- Do not run provider/index work before project-scoped structured lineage resolves.
- Do not convert semantic similarity into workflow, trust or evidence authority.

## Resolved failures and dead ends

- Optional rebuild body: a Fastify object body schema rejected a legitimately omitted body with 400. Replaced it with explicit pre-validation that allows only omission or `{}` and rejects `null` plus every caller-authored control field. The route test now covers omission and forbidden model/vector input.
- Node 26 test loader: `ts-node/esm` produced an empty thrown diagnostic even after clean package typechecks. Kept `tsc --noEmit` as the type-safety gate and used transpile-only only for runtime assertions; do not interpret the loader incompatibility as a code failure or silence typecheck.
- Structured not-found mapping: candidate resolution can surface `PaperImplementationExperimentLineageV2ServiceError` directly. Added explicit project-not-found and concurrent-cycle mappings so missing projects do not become generic 500 responses.
- Rebuild coordination: a project-row lock acquired only during projection replacement does not
  suppress duplicate provider work and cannot by itself stop a slow old snapshot. Coalesce before
  profile/provider work, propagate cancellation, then fence the structured snapshot around the
  atomic write and verify it afterwards.
- Structured candidate reads: calling a full Cycle lineage repository method inside a project loop
  creates serial N+1 work, doubled again by retrieval's authority reread. Use one project-scoped,
  repeatable-read bulk snapshot and validate exact Cycle coverage before constructing documents.
- Complete fallback is intentionally not capped by the semantic document limit. Do not add an
  OpenAPI `maxItems` unless the runtime contract and authority fallback behavior adopt the same cap.
