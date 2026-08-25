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

The contract preserves these invariants:

- A checkpoint target and packet bind to a canonical input snapshot hash.
- A decision binds to the same hash and names only product-advertised allowed actions.
- Changed upstream authority supersedes affected checkpoint state and prevents stale advance.
- Checkpoint decisions reference the stage-specific human authority that owns the decision.
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
