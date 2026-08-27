# Phase 6 Interaction, Artifact, and Divergence Findings

## Purpose and authority

This artifact preserves acceptance evidence and design input from operating the fresh Phase 6 topic-selection lineage. It is not a second task status, roadmap, architecture, verification authority, or research-content authority. Canonical research records remain product-owned; `01-status.md`, `requirement.md`, and `verification.md` own the task state, requirements, and evidence claims.

The research chain is intentionally unchanged while these findings are discussed. Current gate `promotion_gate_check_39bfb045-47d2-4e67-b6b4-f9a125aa88be` remains `ready_for_human_decision` with `promote_allowed=true`; no HumanPromotionDecision, bridge, or PaperProject exists for the current lineage.

## Direct experience findings

### The process is legible to the product but not to the researcher

The live interaction primarily exposed internal node names, record types, IDs, hashes, restarts, and retries. These details were useful for audit and recovery but poor as the main research language. The researcher could not easily see one stable evolving object that answered:

- what is currently believed;
- what alternatives were considered and rejected;
- what evidence supports or challenges the topic;
- what changed after a loopback;
- what risks remain;
- and what exact research decision is now required.

### Authorization was coupled to implementation operations

Routine deterministic nodes, local backend restarts, and short local jobs repeatedly became authorization boundaries. The desired unit is instead a bounded research instruction such as “advance to the next human decision point,” with progress updates during execution and a hard stop only when authority, effect class, environment, cost, scope, or recovery ambiguity changes.

### A valid package is not necessarily a high-value topic

The current topic is coherent and testable, but the live evidence does not establish that it is a particularly high-upside research direction:

- N8 scored `75` with confidence `0.72`, but originality is `68` and reviewer-risk is `64`.
- The nearest-work refresh found a near-isomorphic calibrated graded-retrieval design.
- The claim is restricted to signed `0→1` and `1→5` effects in one fixed local pipeline.
- Sparse/noisy negative-utility labels, subgroup masking, generator-strength dependence, and fixed-benchmark scope remain material risks.
- The null-result fallback improves publishability but does not itself increase research importance.

The green promotion gate proves lineage completeness, internal consistency, and readiness for a human decision. It does not prove that the topic is the best available use of research time.

### Loopback repaired the topic inside a narrow basin

The loopback did useful work. It found near-isomorphic prior art, invalidated the original graded-confidence framing, refreshed evidence, and shifted the question toward signed adjacent-depth utility. That is a real improvement.

However, the process mostly optimized a selected scope after commitment. It did not require a new broad candidate search across adjacent research objects, methods, datasets, evaluation regimes, or neighboring fields. Without an explicit divergence phase, loopback becomes local repair: it makes a weak or crowded topic more defensible rather than asking whether it should be abandoned.

The initial topic scope therefore has excessive path dependence. A weak topic can consume substantial effort because later stages are framed as “find the remaining value” rather than “compare rescue, reframe, expand, and stop.”

## Proposed three-layer artifact model

### 1. Canonical product authority

Database owners, versions, hashes, currentness, supersession, checkpoint decisions, and transition guards remain the only semantic authority. Neither Markdown nor an agent bundle may silently replace these owners.

### 2. LLM working plane

A larger machine-readable corpus should preserve enough material for later agents to reconstruct reasoning without relying on conversation history:

- evidence locators, source roles, support, challenge, baseline, and context;
- all viable alternatives, rejected candidates, and rejection reasons;
- nearest-work conflicts and novelty boundaries;
- assumptions, proxies, confounds, falsifiers, claim ceilings, and answerability conditions;
- loopbacks, failed attempts, recovery decisions, and supersession history;
- unresolved risks, objections, required rechecks, and ownership;
- exact source versions, current-owner pointers, and content hashes;
- debate roles, independent positions, challenges, rebuttals, concessions, and final dispositions when debate runs.

This layer should use Markdown for argument-shaped material and JSON or JSONL for precise entities, references, ledgers, and replayable manifests.

### 3. Human reading plane

One concise derived Markdown file should represent each major semantic stage: overview, evidence landscape, research gap, research question, value and feasibility, topic package, and promotion review. Each file should lead with domain conclusions and the decision requested; technical lineage belongs in a secondary trace section.

### Retrieval rule

The stored LLM corpus may be large; an individual model call should not load it all. Consumers should read a manifest and current pointers first, then retrieve only the evidence, alternatives, disagreements, and history relevant to the current role and decision. The operating rule is **large durable memory, small task-specific prompt**.

A candidate projection layout is:

```text
topic-selection/
├── manifest.json
├── human/
│   ├── 01-evidence-landscape.md
│   ├── 02-research-gap.md
│   ├── 03-research-question.md
│   ├── 04-value-and-feasibility.md
│   ├── 05-topic-package.md
│   └── 06-promotion-review.md
└── agent/
    ├── evidence-ledger.jsonl
    ├── candidate-ledger.jsonl
    ├── counterevidence.md
    ├── question-contract.json
    ├── risk-register.jsonl
    ├── decision-history.md
    ├── debate-ledger.jsonl
    └── recovery-manifest.json
```

This is a design candidate, not an approved storage contract.

## Multi-agent debate audit

### What exists in the repository

The product already contains several dedicated but stage-local debate mechanisms:

- v1a NeedCandidate discovery supports an implemented divergent loop with explorer, deep critic, issue-framing arbiter, and final-synthesis arbiter roles, including role outputs, role summaries, issue-frame and final-synthesis artifacts.
- v1b N6 question generation supports a conditional divergent explorer/critic/arbiter loop after a debate-escalation loopback.
- v1b N8 value assessment supports a conditional four-role bounded sequence: assessor draft, value critic, assessor repair, and final synthesizer.
- v1c promotion support supports a four-role bounded micro-debate: promotion supporter, reviewer critic, repair, and final synthesizer.
- Shared runtime infrastructure validates role slots, prompt/model/context profiles, source hashes, ordered prior-role artifact hashes, transcript hashes, token budgets, runtime provenance, deterministic admission, and optional named execution plans.

This is more than a prompt pattern: role-level and transcript-level artifacts exist. But the mechanisms are separate node features, not yet one researcher-visible debate session or general agent-management surface.

### What actually ran in the current lineage

The current topic-defining and promotion-preparation lineage did not execute the product-native debate paths:

- N4 slice generation and N6 question generation used one non-provider `codex_assisted` runtime each.
- N8 value assessment used one non-provider `codex_assisted` runtime. `N8_CRITIC_REVIEW_TRIGGERED` was carried as a warning, but no N8 debate loopback fired.
- Current PromotionDecisionSupport was deterministic with `llm_draft_payload=null`; the v1c bounded-debate endpoint was not used.
- A separately delegated retrieval-relationship investigation is supporting research work, not a product-native multi-agent debate: it did not create opposing role positions, rebuttals, a debate admission result, or a product debate ledger for this lineage.

Therefore the accurate answer is: the repository has dedicated debate machinery, but this live topic-selection decision was effectively generated and repaired through single-agent plus human loopback, not through a recorded multi-agent debate.

### Why the existing debate coverage is insufficient for divergence

The current mechanisms mostly operate after the search space has narrowed:

- N6 diversifies questions inside an already selected ResearchSlice.
- N8 debates the value of an already selected question.
- v1c debates promotion of an already assembled package.

These mechanisms can improve criticism and synthesis, but they cannot compensate for a poor initial scope if every role receives the same narrow evidence set and mandate. Correlated agents with the same context, model family, and success objective can produce the appearance of debate while converging on the same local optimum.

## Prompt and execution-contract audit

The prompt audit followed each prompt through its actual user payload, output schema, admission logic, gate consumer, model route, and tool boundary. The main defect is structural continuation bias rather than insufficiently forceful wording.

### Candidate generation makes “nothing worth pursuing” illegal

- The N4 slice prompt requires multiple executable slices and says to emit at least one. Its output schema also requires a non-empty `options` array.
- The N6 question prompt requires at least one candidate and explicitly asks that every candidate pass the deterministic N6 gate. Its schema likewise requires a non-empty `candidates` array.
- N6 loopback can regenerate, escalate to debate, or select a different slice, but cannot reject the validated need, reopen the broader scope, or terminate successfully without a topic.

This means an LLM cannot truthfully represent “the current need or slice has no worthwhile question.” It must manufacture an admissible-looking continuation or fail schema validation. Adding “be willing to reject the topic” to the prompt without changing these consumers would create a contradictory call contract.

### Value assessment permits rejection but does not reward it

The N8 value-assessment contract contains `park` and `drop` dispositions, but its prompt does not define an advancement burden of proof, opportunity-cost comparison, calibration anchors, or `park`/`drop` as successful research outcomes. Current gates emphasize readiness, a score floor, confidence, and dimension-spread triggers. A defensible mid-value topic can therefore advance without demonstrating that it is a better use of research time than a visible alternative.

Non-advance dispositions also appear operationally as blocking outcomes and required actions in the deterministic follow-up even when they are the correct terminal research decision. This presentation reinforces the impression that stopping is failure rather than saved cost and avoided path dependence.

### Debate roles are under-specified and correlated

- v1a need discovery has the strongest role separation, but its deep critic cannot propose a new angle and every role is bounded to the supplied exploration context.
- N6 divergence remains inside one selected ResearchSlice and must synthesize a non-empty candidate set.
- N8 and v1c use one generic system prompt across their role sequence. Role identity is supplied in the input, while detailed semantic expectations live mostly in admission code rather than in the receiver-visible request.
- Critic findings are expected to be repaired, accepted as risk, or rebutted. No explicit rule says that unresolved fatal criticism should yield a successful `park`, `drop`, or scope switch instead of another repair.

The configured OpenAI balanced, quality, and deep-reasoning topic-selection routes currently resolve to the same model with empty native parameter sets, and the prompt routes expose no tools. Named `provider_diverse` execution plans currently change prompt-packet identity and provenance only; live per-role provider execution remains dormant. The existing mechanism therefore supplies staged roles but not independent retrieval or live multi-provider diversity.

### Required prompt and contract upgrade

The stable instruction should state that the objective is to choose the best-supported disposition, not to help the current topic pass. The current topic, alternative topics, and the null option must have equal standing; `park`, `drop`, `switch_scope`, and zero viable candidates must be valid successful outputs. Continue should require positive evidence for significance, nearest-work novelty, discriminating falsifiability, feasibility, claim ceiling, and opportunity cost against the best visible alternative.

Role prompts should be distinct:

- an opportunity scout develops the strongest current case and genuinely adjacent alternatives, and may return none;
- a prior-art hunter or topic killer seeks the strongest collapse case and is prohibited from repairing the topic;
- an empirical skeptic tests identifiability, data, cost, and experiment feasibility;
- a portfolio arbiter compares current, alternative, and null outcomes, preserves unresolved fatal findings and minority reports, and may select no topic.

Independence should come from blinded first passes, different queries or evidence partitions, role-specific objectives, semantic-duplicate collapse, and explicit disagreement preservation. Adding more agents or providers before these contracts are corrected would multiply correlated continuation pressure.

The cheapest useful policy is one bounded challenge round using abstracts, metadata, nearest work, constraints, and rough experiment cost before expensive topic defense. Permit at most one scoped evidence expansion and one substantive reframe; a repeated value or novelty failure returns to the candidate portfolio rather than initiating recursive rescue. Prompt calibration must include clearly worthwhile, clearly low-value, and ambiguous historical topics and evaluate disposition quality, not prose polish.

This audit is source- and contract-level evidence, not a behavioral A/B result. No prompt, schema, gate, provider path, or current research authority changed during the audit.

## Required divergence capability before convergence

A future design should separate **topic search** from **topic defense** and make “no worthwhile topic in the current scope” a successful terminal result. Before expensive value/package work, the system should compare at least four dispositions:

1. continue the current topic;
2. reframe the mechanism or research object;
3. expand or shift the evidence/search scope;
4. abandon the topic and return to candidate discovery.

Useful independent roles include:

- opportunity scout: generate adjacent mechanisms, tasks, datasets, and neighboring-field transfers;
- prior-art hunter: try to collapse novelty with the strongest nearest work;
- topic killer: argue that the topic is not worth pursuing and define a stop test;
- empirical skeptic: test identifiability, data sufficiency, cost, and experimental feasibility;
- counterfactual reframer: change the research object rather than polish its wording;
- portfolio arbiter: compare expected research value across candidates, including the option to select none.

Independence must be designed, not assumed: blinded first-pass proposals, different retrieval queries or evidence partitions, role-specific objectives, semantic-duplicate collapse, and explicit disagreement preservation matter more than simply increasing the number of agents.

## Dedicated debate records and agent management

A first-class mechanism should make the following recoverable:

- debate session or arena identity, stage, exact input snapshot, policy, budget, and termination rule;
- participant identity, role, profile, model/execution mode, tool access, evidence scope, and independence group;
- independent proposal or position before cross-role exposure;
- claim, evidence ref, challenge, rebuttal, concession, unresolved disagreement, and confidence;
- candidate genealogy, semantic grouping, elimination reason, and surviving minority report;
- synthesis, selected disposition, rejected alternatives, stop/expand/reframe decision, and human authority boundary;
- per-turn runtime/audit artifacts, failures, retries, replacements, costs, and transcript hash;
- supersession and replay links when evidence or scope changes.

Agent management should own role/profile registration, participant selection, independence constraints, concurrency and token/cost limits, timeout/failure replacement, duplicate-output detection, and admission. Agent output remains advisory; research-meaning decisions remain human or product-policy authorities as already defined.

## Process discoveries retained from the live run

- The checkpoint control plane correctly rejected incomplete and stale authority chains.
- The most meaningful novelty correction came from the retrieval-method loopback and nearest-work refresh.
- Product truth is fragmented across owners, packets, hashes, and projections, motivating one manifest/current-pointer surface.
- A green gate can coexist with material narrative risks when structured risk arrays fail to carry them forward visibly.
- The research-status projection can expose stale checkpoints and transitions after repair.
- Authorization should bind to effect and human authority, not node count, HTTP calls, job duration, or backend lifecycle.
- Divergence must precede expensive topic defense; otherwise loopback and value assessment create confirmation pressure around the initial scope.
- Multi-agent debate is useful only when its roles, evidence acquisition, independence, records, and stop conditions are product-visible and recoverable.
- Prompt wording cannot create an honest stop path while non-empty candidate schemas, repair-biased debate admission, and blocking non-advance semantics still reward continuation.

## Open design decisions

- Where should the divergence arena sit: before EvidenceMap commitment, before HumanConfirmNeed, or both?
- What cheap stop rule prevents repeated rescue of a low-upside topic?
- Which disposition, schema, loopback, and status changes must land with the prompt upgrade so `none viable`, `park`, and `drop` are honest successful outputs?
- Which stages require independent retrieval rather than shared-context role play?
- Should the existing node-local debate artifacts be projected into one cross-stage DebateSession read model or replaced by a shared canonical session owner?
- How much agent diversity is required before the system may claim a topic was genuinely contested?
- Which of these changes belong to T-147 acceptance follow-up versus a focused feature task after requirements are confirmed?
