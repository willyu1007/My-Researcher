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

### P-002 Diverge Before Converging on Research Meaning

Research-semantic decisions MUST create a real opportunity to discover a better direction or stop before the system optimizes and defends one framing:

- At evidence/search-scope, gap/need-portfolio, question-design, and comparative-value decisions, first form independent alternatives with role-specific evidence, then align claims to inspectable excerpts, challenge the alternatives, and converge to an explicit disposition.
- A valid disposition is `select`, `park`, `drop`, `reframe`, `expand`, or an explicitly human-approved `fork`. Zero viable candidates is a successful research-management result when evidence, rejection reasons, and reopening conditions are recorded.
- Model-visible evidence means the bounded claim-bearing content actually supplied to the participant, with source locator and retrieval provenance. A UUID, citation list, or inherited summary alone is not evidence the participant read.
- Material objections and minority reports MUST remain current through downstream handoffs until explicitly repaired, accepted as a named risk, looped back, parked, or dropped. Convergence may not erase dissent by summarization.
- Another divergence/convergence loop requires a recorded change in evidence, candidate scope, constraints, or human research objective. Unchanged-context repetition is not progress.
- Default to one active research path plus bounded parked alternatives. Multiple active paths require substantive independent support, exact human authority, and unambiguous branch/currentness semantics.
- Snapshotting, package assembly, publication, gate wiring, and other mechanical operations remain deterministic. They MUST NOT invoke full debate or manufacture alternatives merely to satisfy process ceremony.
- Human confirmation is required at research-meaning, material-risk, provider/cost, destructive/control, environment, material-scope, and ambiguous-recovery boundaries—not at every internal node or routine local operation.

The product control plane owns retrieval scope, evidence resolution, disposition/currentness, and human authority. LLMs, Codex subagents, and debate participants remain advisory executors whose actual prompts, evidence scopes, outputs, disagreements, and termination are recoverable when their work is used as decision support.

## Rejected Approaches

### R-001 Keep `论文管理` as a canonical module name

Rejected because it conflates three implemented surfaces: paper-project lifecycle, paper-implementation authority, and the desktop paper literature collection. Keeping it as a canonical module name causes API examples, task docs, and UI plans to drift back into incompatible ownership assumptions.

### R-002 Run multi-agent debate at every workflow node

Rejected because mechanical nodes do not make research choices, while repeated debate adds latency, authorization ceremony, correlated output, and false confidence. Use full divergence only where research meaning can change; use deterministic validation or focused adversarial checks elsewhere.

### R-003 Require every topic-selection run to produce an advancing topic

Rejected because it converts weak initial scope into confirmation pressure and rewards agents for rescuing low-value topics. Evidence-backed `park`, `drop`, scope expansion, or a zero-viable portfolio are successful outcomes when their reasons and reopening conditions are durable.
