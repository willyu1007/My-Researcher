# Architecture Principles

> Project-wide constraints and conventions. Each principle is a standing rule,
> not a one-time decision. Update or mark as superseded when the rule changes.

## How to maintain

1. Add a new section under **Principles** when a cross-cutting rule is established.
2. If a principle is superseded, keep it with a `[SUPERSEDED by ...]` tag — do not delete.
3. When an alternative approach is evaluated and rejected, record it under **Rejected Approaches** with the reason.
4. Update directly related context documents in the same change; there is no checksum registry.

## Principles

### P-001 Canonical Research Lifecycle Terminology

Current docs, contracts, and implementation notes MUST use the smallest precise bounded-context name:

- Use `title-card` / `title_card_id` for idea shaping, evidence basket, need/question/value/package, and promotion origin identity.
- Use `paper-project` / `PaperProject` for the downstream paper lifecycle container: paper id, version spine, stage/release gates, artifact bundle, writing package, and paper literature links.
- Use `paper-implementation` / `PaperImplementation` for the implementation-stage authority lane between promoted topic input and writing-ready material: implementation project, motive, validation cycle, work order, run evidence, claim trace, dossier readiness, and writing-entry projection.
- Use `topic_id` only for literature topic scope, retrieval, topic settings, and auto-pull contexts. `topic_id` MUST NOT be reintroduced as the origin field for `POST /paper-projects`.
- Treat `论文管理` / `paper management` as a legacy product label or desktop navigation label only. Current design docs MUST NOT use it as a catch-all bounded context.

When a reader needs the old term, translate it explicitly:

- `论文管理` as lifecycle container -> `paper-project`.
- `论文管理` as implementation/research-material control surface -> `paper-implementation`.
- `论文管理` as current desktop view -> `paper literature collection`.

## Rejected Approaches

### R-001 Keep `论文管理` as a canonical module name

Rejected because it conflates three implemented surfaces: paper-project lifecycle, paper-implementation authority, and the desktop paper literature collection. Keeping it as a canonical module name causes API examples, task docs, and UI plans to drift back into incompatible ownership assumptions.
