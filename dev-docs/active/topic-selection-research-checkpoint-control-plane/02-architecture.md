# Topic Selection Research Checkpoint Control Plane — Architecture

## Context and current state

Topic selection already has durable v1a/v1b/v1c domain authorities, snapshot/hash lineage, WorkflowHarness execution, human-confirmed need and promotion decisions, a human-compatible slice-selection path, recheck/risk memory, promotion dossier support, and PaperProject bridge/intake contracts.

The current product does not expose a complete product-owned research review chain. EvidenceMap completion has no hard human checkpoint; gap confirmation does not require a genuinely competitive candidate arena; TopicQuestionContract materialization is mechanical by default; explicit researcher objections are not guaranteed to remain blocking downstream; and promotion can treat operational completeness as sufficient while advancement-relevant risks remain unowned. API clients can therefore complete a traceable chain without giving the researcher a legible or enforceable opportunity to redirect the research object.

Phase 1 discovery confirms that this is an authority and cutover problem rather than a missing-client problem:

- `TopicSelectionControlPlaneService` can bind input snapshots, gates, transitions, lineage, traces, and generic human confirmations, but it has no checkpoint chain, packet-currentness, objection lifecycle, or required-action closure semantics.
- NeedCandidate has two write paths. The direct service path uses the generic control plane, while the production orchestrator batch path writes through `TopicSelectionPersistNeedCandidateBatchService`; 644 of 661 local NeedCandidate records have no input snapshot, gate result, or transition attempt.
- N7 TopicQuestionContract materialization and N8 value assessment are centralized in the v1b harness, but N8 has no human question-confirmation guard. Its current hard score floor is 60, while the 60–72 score band and dimension-conflict thresholds trigger bounded debate; post-debate residual findings can downgrade to warnings and continue.
- v1c promotion has an exact human decision and snapshot binding, but bridge intake does not prove that carried conditions or early-check obligations were completed. Of 464 active local bridges, 31 carry conditions, and 2 conditioned bridges have already completed intake.
- The production app still registers legacy `/title-cards/*` semantic write routes. They can create needs, research questions, value assessments, packages, promotion decisions, and a PaperProject without traversing v1a/v1b/v1c checkpoint eligibility.
- The standalone `POST /paper-projects` bootstrap is not a topic-selection promotion authority. It may remain available for independent/imported projects, but it must never be interpreted as evidence that a topic-selection checkpoint chain completed.

The local record population is large enough that blanket invalidation is not credible: 648 EvidenceMaps, 661 NeedCandidates, 633 ValidatedNeeds, 601 TopicQuestionContracts, 899 v1b-to-v1c bundles, 464 promotion decisions, and 464 bridges. It is also academically shallow in a systematic way: 633 evidence maps have one gap candidate; 568 of 620 question candidate sets have one question candidate; and only 17 NeedCandidates carry the generic gate/snapshot/transition identity.

## Settled design and boundaries

- Production has one research-quality path. Test fixtures, canaries, and rehearsals remain scenario-runner concerns and do not introduce a product runtime mode.
- The backend product control plane owns checkpoint semantics, currentness, allowed decisions, loopbacks, and transition eligibility. Codex, a future GUI, and other clients are replaceable callers.
- Four major checkpoint phases govern evidence landscape, gap selection, question contract, and promotion. Existing slice selection remains a product decision within the research-design flow.
- Existing domain objects remain the authorities for evidence, need, slice, question, value, package, promotion, and bridge content.
- Checkpoint state coordinates only target refs, snapshot identity, pending/decided/superseded lifecycle, packet identity, decision refs, required actions, and next-transition eligibility.
- Existing HumanConfirmNeed and HumanPromotionDecision authorities satisfy their respective checkpoint decisions through explicit adapters. Missing evidence-landscape and topic-question human decisions receive dedicated authorities rather than overloading unrelated records.
- Human objections are durable, target-bound, severity-bearing product records. Blocking objections participate in currentness and gate evaluation and require an authorized resolution ref; client-side memory or rewording cannot close them.
- Every downstream transition covered by this task fails closed when a required checkpoint is missing, stale, non-advancing, or has incomplete required actions.
- Checkpoint packets and research status are product projections derived from current authority and checkpoint state. They expose alternatives, eliminated paths, evidence limitations, objections, risks, allowed decisions, and next transition without becoming a second content authority.
- Provider debate/calibration remains outside this task. Existing deterministic, Codex-assisted, mocked, or provider execution may supply support artifacts only where current policies permit; none may cross human authority.

## Evidence-grounded divergence and convergence

Research-semantic decisions extend the checkpoint control plane with one logical, snapshot-bound arena loop. This is not a second topic-selection pipeline or a generic agent platform. It coordinates existing literature, retrieval, runtime-artifact, checkpoint, objection, recheck, and human-decision authorities. The Phase 7 owner audit (`artifacts/phase7-owner-map.md`) proved, and the researcher confirmed on 2026-08-28, that existing owners cover everything except the arena session itself; exactly one new persisted coordination owner is therefore added, described below.

The logical arena contract has five inseparable parts:

1. **EvidencePacket projection** — the exact bounded excerpts a participant can inspect, including source locator, retrieval intent, evidence role, freshness, and the claim it supports or challenges. Persisted UUIDs and upstream summaries prove lineage but do not prove model-visible content.
2. **Candidate portfolio** — zero-to-many research objects with semantic grouping, genealogy, expected contribution, strongest nearest work, feasibility/falsification limits, and explicit rejection or parking reasons.
3. **Dissent ledger** — objections, critic findings, concessions, unresolved minority reports, severity, affected target, and one explicit downstream disposition. Material dissent stays current until repaired, accepted as a named risk, looped back, parked, or dropped.
4. **Decision disposition** — two-layered. The arena reports a set-level outcome (`selected`, `none_viable`, `evidence_expansion_required`, `reframe_required`) and per-candidate dispositions (`selected`, `parked`, `dropped`); the checkpoint routes each set-level outcome to its next step, with stop a first-class route. No viable candidate is a successful set-level outcome rather than a runtime failure; a fork recommendation is recorded as `parked` plus a surfaced recommendation.
5. **Loop delta** — new evidence, candidate scope, constraint, or human research objective required before another arena version may run. Repeating the same context is not a loop.

The disposition contract is a precondition, not an arena feature: pre-HumanConfirmNeed candidate generation and the v1b N4/N6 output schemas, gates, loopbacks, and terminal semantics admit the two-layer contract as successful outputs — set-level `none_viable`/`evidence_expansion_required`/`reframe_required` and candidate-level `parked`/`dropped`, each carrying evidence refs, per-direction rejection reasons, confidence, and reopening conditions — before or with the first arena slice. The additive generation contract is named `portfolio_disposition`; an explicit disposition is a completed (`finalize`) research-management result, exactly one candidate is selected when the set-level outcome is `selected`, and every draft is classified exactly once. Deterministic routing owns the effects (`stop_without_candidate`, `expand_evidence`, or `reframe_scope`), never the generating agent. Legacy artifacts may omit the additive field until their producing seam cuts over. Without this legal exit, any critic role is forced to repair fatal findings into an advancing answer.

The first slice pairs an opportunity scout, whose distinct job is bounded retrieval outside the current EvidenceBasket, with a prior-art/topic-killer that is prohibited from repairing the topic; its arbiter is deterministic or human, and the empirical skeptic joins only after the pair proves value. Independent role work is durable before any portfolio synthesis. Product orchestration owns role-specific retrieval and evidence resolution; Codex subagents or runtime models may execute advisory roles but cannot create human authority. Full arenas run only at evidence/search scope, gap/need portfolio, question design, and comparative value decisions. Snapshot, package, publication, and gate-wiring operations remain deterministic.

**Arena coordination owner.** `TopicSelectionResearchArenaSession` is the one new persisted owner: a session root modeled on the research-checkpoint pattern that holds coordination facts only — arena kind (semantic stage), target ref, bound input-snapshot id and snapshot hash, participant/execution-plan identity, lifecycle status (`open`/`synthesized`/`superseded`) with a unique current-arena key enforcing one current arena per title card and stage, supersession pointers, an enumerated termination reason, the loop transcript artifact ref/hash, and delta refs naming the recorded evidence/candidate/constraint/objective change that admitted this version over its predecessor. Research content stays in existing `TopicSelectionArtifactRef` owners; the arena is advisory (`support_only` preserved), and its disposition becomes binding only through the gap checkpoint and HumanConfirmNeed, which record the arena session ref in their source refs. Role-execution integrity is schema-enforced in a dedicated child table, `TopicSelectionResearchArenaRoleExecution` (paper-implementation runtime-artifact precedent): role slot id, instance index, exposure-set hash, evidence-partition refs, output artifact ref/hash, prior-role hashes, a unique runtime identity hash, and composite uniqueness over (arena session, role slot, instance index), with an admission blocker rejecting any first-pass output whose exposure set contains same-stage peer artifacts. A child table was chosen over typed nullable columns on the generic `TopicSelectionArtifactRef` because role execution is a clear 1:N relation and the composite integrity constraints cannot be expressed cleanly on a shared table.

The remaining audit-settled contracts add no new content authority:

- EvidencePacket resolution is a read-time projection: a keyed locator-to-text resolution service resolves paragraph/anchor/abstract locators from durable rows and section/document locators by paragraph concatenation, accepting both row ids and parser-level ids; retrieval requests carry typed role and query intent and persist chunk-granular hit provenance; quote integrity validates the stored statement against resolved text; evidence-unit freshness recomputes from literature index state.
- Material N8 value-risk findings are minted as neutral machine-owned risk-finding records and carried by ref through the existing N9→N10→N11→v1c arrays; `TopicSelectionAcceptedRisk` remains a strict-human authority, and promotion's existing mapping semantics require every finding to end in an explicit human accepted risk, owned action, or disposition.
- Parked candidates carry parking reason, reopening conditions, and the binding to the selected candidate on `TopicSelectionNeedCandidate`; the gap-review `viable_alternative` disposition writes back to candidate rows instead of living only in packet JSON.

Exactly one research path is active; fork is out of scope for this task and no branch-identity or child-TitleCard machinery is built. Alternatives persist as snapshot-bound parked candidates carrying their evidence refs, semantic group, parking reason, and reopening conditions. Return to a parked candidate is serial and delta-gated: the evidence that ended the active path is a recorded delta, the reopened arena re-evaluates parked candidates against it, and existing supersession automatically stales downstream checkpoints.

Human interaction follows effect boundaries: routine local reads, deterministic writes, bounded non-provider runs, recoverable retries, and an already selected backend lifecycle may proceed to the next semantic decision under one instruction. Research-meaning decisions, material risk acceptance, provider/cost or external acquisition, destructive/control effects, environment changes, material scope expansion, and ambiguous recovery still stop for exact confirmation.

Derived stage views are read-time projections. The human stage Markdown and the manifest-first LLM working plane are regenerated from canonical owners on demand; a persisted working-plane corpus is admitted only if projection cost is proven prohibitive. The manifest documents an explicit per-stage current-selection rule (checkpoint unique current key, N9 `isCurrent`, promotion current-snapshot key; documented latest-wins elsewhere), Markdown is returned as a JSON string field to stay inside existing contract tooling, and a generic read-only artifact route accompanies the manifest so referenced artifact ids (including the v1c reviewer packet) are resolvable. Because these views and the authorization envelope do not touch checkpoint or research authority, they may land early, independent of arena validation.

Activation calibration does not require absolute value labels. Stop/continue quality is validated through dominance pairs from recorded lineage history (a superseded framing versus its evidence-backed replacement; the parameter-only negative control versus the mechanism-level positive lineage), evidence-perturbation counterfactuals against the arena's retrieval scope, and human overrides accumulated during shadow/advisory operation. A drop recommendation additionally requires one of five enumerated evidence-backed drop-reason codes (near-isomorphic prior art without discernible contribution difference; unidentifiable or unfalsifiable core mechanism; data/evaluation conditions that defeat the claim; strict dominance by a visible portfolio candidate; no viable path after one delta-bearing expansion) — this is what separates `dropped` from `parked`, since parked candidates carry reopening conditions while a drop's reason code must hold. Shadow mode only recommends; human confirmation accumulates per-reason-code labels, and overrides are accounted per reason code so a miscalibrated killer heuristic is directly locatable. Activation requires every drop to be evidence-backed under its reason code, dominance-pair order respected, and the override rate converging; the calibration target is decision-process quality, not outcome accuracy.

## Interfaces and contracts

The planning direction is a canonical checkpoint API family plus a title-card research-status projection:

```http
GET  /topic-selection/title-cards/{titleCardId}/checkpoints
GET  /topic-selection/checkpoints/{checkpointId}
GET  /topic-selection/checkpoints/{checkpointId}/packet
POST /topic-selection/checkpoints/{checkpointId}/decisions
POST /topic-selection/checkpoints/{checkpointId}/objections
POST /topic-selection/objections/{objectionId}/resolutions
GET  /topic-selection/title-cards/{titleCardId}/research-status
```

The confirmed Phase 1 design uses four small persistence authorities rather than one table per checkpoint stage or a second workflow engine:

1. `TopicSelectionResearchCheckpoint` coordinates checkpoint kind, target ref/hash, packet hash, policy version, lifecycle, supersession, decision-authority ref, and required-action refs.
2. `TopicSelectionResearchCheckpointDecision` owns only the missing evidence-landscape and topic-question human decisions. A discriminated shared contract supplies kind-specific review fields; HumanConfirmNeed and HumanPromotionDecision remain the gap and promotion authorities through adapters.
3. `TopicSelectionResearchObjection` records an immutable, strict-human, target-bound objection and its affected checkpoint scope.
4. `TopicSelectionResearchObjectionResolution` records an immutable strict-human resolution bound to a revised authority or explicit evidence-backed disposition. Existing RecheckEvent/Impact/WorkQueue records propagate its effects but do not become the objection authority.

Packets and research status remain deterministic projections; no packet-content or writable status-summary table is added. Existing `InputSnapshot`, functional refs, hashes, transition attempts, recheck/risk memory, and human-confirmed envelopes are reused.

Checkpoint provenance is explicit: `native` means the checkpoint was materialized by the guarded product flow, while `backfilled` means the pending anchor was derived from a pre-cutover immutable authority. Provenance never certifies a human review. The v1 cutover backfill materialized 2,249 pending anchors across 1,080 title cards (647 evidence, 642 gap, 524 question, and 436 promotion) and a second application produced no additional checkpoint or input-snapshot rows.

Phase 3 activates native evidence and gap assembly on the maintained v1a product path:

- Successful EvidenceMap persistence materializes an evidence-landscape checkpoint from the exact map, source locators, required coverage intents, conflict sets, and source-authority classifications. Every required baseline and challenge intent must have inspectable claim-bearing evidence; abstract-only core evidence, LLM inference, stale maps, and blocking conflicts produce required actions and remove `advance` from the advertised actions.
- Candidate creation remains downstream of the advancing evidence decision. Both the direct writer and the batch orchestrator rebuild one frozen candidate arena from current NeedCandidate authority. New batch commands carry rejected framings and reasons; pre-Phase-3 commands remain readable when that additive field is absent.
- Candidate count and structured semantic-group identity are only eligibility tripwires. HumanConfirmNeed must review every candidate in the frozen arena, preserve one selected disposition and all rejected reasons, identify at least one machine-eligible viable alternative, and state whether the research object, mechanism, intervention, comparison, or outcome differs. Wording or `k` changes do not satisfy distinctness.
- Candidate facts that affect academic eligibility refresh the arena before confirmation. The HumanConfirmNeed adapter verifies checkpoint id, pool hash, candidate versions, evidence-pressure review, and open objections, then reuses the existing `human_confirmed_decision` authority to advance the checkpoint. Exact retries recover partial writes; changed confirmation content conflicts. v1b publication independently rechecks the advancing gap checkpoint.

Phase 4 activates the native question checkpoint and durable objection loop:

- N7 assembles one question packet from current TopicQuestionContract, TopicQuestion, selected candidate, QuestionFrame, AnswerabilityPlan, evidence/boundary/assumption/falsification records, and upstream refs. It preregisters the pending checkpoint before the multi-record domain write, so a failed write cannot publish an unguarded handoff; retry deterministically supersedes the orphan preregistration and binds the recovered current contract.
- Eligibility is component-complete rather than score-complete. The packet must identify mechanism or intervention, comparison, expected claim, operational outcome, metrics, success criteria, confounds or alternative explanations, challenge evidence, resources, baselines, ablations, evaluation setting, active source-bound pre-value falsification, and claim ceiling plus prohibited claims. Boundary violations or a non-answerable verdict remove `advance`.
- N8 invokes the central transition guard against the exact current TopicQuestionContract before resolving a value draft or invoking a model. A strict-human question decision bound to the checkpoint snapshot is the only advancing authority; N7 materialization, Codex support, and client state cannot stand in for it.
- The product HTTP bridge exposes the runtime-verified Codex-assisted N4, N6, and N8 paths through one narrow contract. N8 accepts only `product`/`codex_assisted` non-provider execution, rejects provider or mocked execution, validates the question guard before creating runtime-context artifacts, and hands the resulting value draft to the same deterministic harness gate used by coordinated runs.
- Blocking and critical objections name one required loopback checkpoint and freeze both the challenged target and source refs. Their effect is scoped from that checkpoint downstream so the required upstream repair remains possible. Resolution is strict-human, current-snapshot-bound, and evidence-backed; a blocking resolution must cite the revised expected authority type and demonstrate a changed snapshot, so question rewording cannot clear a ResearchSlice-level academic objection.

Phase 5 activates the promotion checkpoint and closes every topic-selection intake bypass:

- The bounded N2 final output preserves its `n3_semantic_layer`; promotion dossier materialization carries the independent critic resolution map instead of rebuilding a lossy default layer.
- HumanPromotionDecision canonicalizes the promotion-input ref with the exact snapshot hash, locates the frozen TopicQuestionContract ref, and materializes the promotion checkpoint before persisting a bridge-eligible authority. Every warning is classified as mapped to an accepted risk, mapped to an owned condition/action, or unresolved; every critic finding must be repaired with refs, rebutted with refs, or accepted through a named accepted-risk ref.
- Promote-class decisions require a current native and advancing evidence, gap, and question chain and an advance-eligible promotion packet. Non-promote decisions remain durable but retain product-owned required actions, so `decided` never implies downstream eligibility.
- Human-promotion and bridge constructors require their checkpoint-control dependency. Bridge creation checks the exact promotion target/hash before persistence; every intake checks the complete chain again before replay or PaperProject creation. A blocking objection added after bridge creation therefore blocks intake without calling the gateway.
- Legacy `/title-cards/*` semantic writers remain registered as explicit `409 GATE_CONSTRAINT_FAILED` recovery surfaces pointing to `/topic-selection/title-cards/{titleCardId}/research-status`. Their historical GETs and the title-card/evidence-basket intake remain supported; no second semantic write path survives.

The post-completion audit adds four fail-closed implementation invariants without introducing new persistence authorities:

- Every native checkpoint after `evidence_landscape` records the exact current predecessor checkpoint as a functional `research_checkpoint` source ref. Complete-chain validation and pre-promotion inspection compare that ref with the current predecessor, so rematerializing an upstream checkpoint invalidates downstream eligibility even when its domain target ref is unchanged. Pre-audit or backfilled chains without this explicit lineage must rematerialize before advancing.
- A topic-question decision carries an explicit strict-human `objections_reviewed` boolean. Question advancement accepts only `true`; the service does not infer review from an empty objection list or other completeness fields.
- Prisma input-snapshot creation is insert-first and reconciles `P2002` by reading the deterministic winner; the control-plane service still compares the requested snapshot hash, so exact concurrency converges while semantic drift conflicts. Objection-resolution persistence similarly returns the unique winner, and the service permits only exact-key replay—two distinct resolution keys for one objection deterministically produce one success and one `409`.
- Repository TypeScript entrypoints use the `tsx` import hook across supported Node versions. This is verification/runtime infrastructure only and does not change checkpoint authority or product behavior.

The contract preserves these invariants:

- A checkpoint target and packet bind to a canonical input snapshot hash.
- A decision binds to the same hash and names only product-advertised allowed actions.
- Changed upstream authority supersedes affected checkpoint state and prevents stale advance.
- Every downstream checkpoint proves the exact current predecessor-checkpoint lineage; target-ref equality alone is insufficient.
- Checkpoint decisions reference the stage-specific human authority that owns the decision.
- Question advancement proves that the human explicitly reviewed objections for the bound snapshot.
- Research status is a deterministic read projection, not a writable summary.
- Direct workflow/node routes invoke the same central transition guard as coordinated runs.
- Replays are idempotent and conflicting decisions or snapshot drift fail closed.

The central guard is enforced at authority writers rather than controllers alone:

| Protected advance | Central enforcement seam | Compatibility action |
|---|---|---|
| EvidenceMap to NeedCandidate | Both direct NeedCandidate creation and `TopicSelectionPersistNeedCandidateBatchService` | A current advancing evidence checkpoint is required before any candidate persists. |
| Candidate arena to ValidatedNeed/v1b input | HumanConfirmNeed adapter plus v1b-bundle publication | Gap confirmation binds the frozen arena, selected candidate, rejected alternatives, and evidence checkpoint. |
| TopicQuestionContract to N8 | v1b harness N8 entry | A current advancing question checkpoint is required regardless of coordinated or direct node invocation. |
| Promotion decision to bridge/intake | v1c human-decision adapter, bridge service, and bridge-intake service | The complete checkpoint chain, objection set, and obligation mapping must be current. |
| Legacy semantic writes | `/title-cards/*` service boundary | Retain reads and title-card/evidence-basket intake, but reject legacy need/question/value/package/promotion writes with the canonical API recovery target. |

## Academic policy classification

Academic sufficiency is governed by semantic completeness; numeric thresholds only escalate review.

### Hard semantic blockers

- Evidence: current source-bound evidence, explicit nearest/direct-neighbor coverage, explicit challenge or disconfirming coverage, inspectable claim-bearing support beyond abstract-only text, and no unresolved blocking conflict/recheck.
- Gap: a frozen candidate arena containing the selected candidate and at least one academically viable, genuinely distinct alternative; distinctness must change the research object, mechanism, intervention, comparison, or outcome rather than only wording or a `k` value. Rejected alternatives and reasons are preserved.
- Question: an identifiable mechanism, operational proxy/outcome, material confounds and alternative explanations, feasible evaluation/baseline route, falsification conditions, claim ceiling, and a current strict-human confirmation.
- Objections: every open blocking human objection invalidates affected downstream eligibility; only an authorized, evidence-backed resolution against current authority can clear it.
- Promotion/intake: every advancement-relevant `pass_with_risk`, condition, or required action maps to an active accepted risk or an owned obligation with a verification point. Pre-intake obligations block intake; explicitly accepted downstream early checks must be represented as enforceable Paper Implementation gates rather than free-text carryover.

### Configurable tripwires

- Desired paper/candidate counts, abstract-only ratio, recency windows, similarity thresholds, score bands, confidence bands, and dimension spread.
- Tripwires can require additional search, candidate generation, critic review, or a human decision. They cannot establish academic sufficiency by themselves.
- The current N8 `total_score < 60` hard advance blocker should become an escalation trigger; semantic value gates remain authoritative.

### Advisory packet content

- Total score, ranking, confidence, venue/strategic fit, narrative polish, model debate summaries, and non-blocking reviewer notes.
- Advisory fields remain visible to the researcher but cannot silently clear or create a checkpoint.

## Migration and operation

- Existing records remain readable throughout the cutover, but no pre-cutover record is automatically labeled checkpoint-complete.
- Introduce a versioned checkpoint contract and perform an idempotent backfill before activating enforcement. Backfill creates checkpoint anchors and packet identities from current immutable authorities; it does not fabricate human decisions.
- In-flight and packaged chains resume at their earliest unsatisfied current checkpoint. Existing HumanConfirmNeed and promotion decisions may be referenced, but they do not satisfy a missing evidence/question review or a gap decision that was not bound to a competitive arena.
- Existing promotion decisions and active bridges that have not completed intake remain readable but cannot create/complete intake until the current chain and obligations satisfy the new contract. The current local population includes 30 such bridges.
- Already intake-created PaperProjects remain historical and usable; they are projected as pre-checkpoint provenance rather than retroactively deleted or falsely certified. Any later loopback into topic selection re-enters under the new contract.
- Legacy `/title-cards/*` semantic writes are cut over to read-only/recovery responses when enforcement activates. The standalone PaperProject bootstrap remains outside topic-selection compliance and cannot be used as a promotion adapter.
- Schema/backfill and enforcement activation are separate operational steps, not product runtime modes. Activation occurs only after backfill counts and representative projections verify; rollback changes the active policy version rather than adding a permanent bypass.
- Current API-first operation remains supported. GUI work is neither required nor authorized by this task.
- OpenAPI and maintained topic-selection process documentation change in the same verified units as runtime contracts.
