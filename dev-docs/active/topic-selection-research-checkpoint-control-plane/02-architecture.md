# Topic Selection Research Checkpoint Control Plane — Architecture

## Context and current state

Topic selection already has durable v1a/v1b/v1c domain authorities, snapshot/hash lineage, WorkflowHarness execution, human-confirmed need and promotion decisions, a human-compatible slice-selection path, recheck/risk memory, promotion dossier support, and PaperProject bridge/intake contracts.

The current product does not expose a complete product-owned research review chain. EvidenceMap completion has no hard human checkpoint; gap confirmation does not require a genuinely competitive candidate arena; TopicQuestionContract materialization is mechanical by default; explicit researcher objections are not guaranteed to remain blocking downstream; and promotion can treat operational completeness as sufficient while advancement-relevant risks remain unowned. API clients can therefore complete a traceable chain without giving the researcher a legible or enforceable opportunity to redirect the research object.

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
GET  /topic-selection/title-cards/{titleCardId}/research-status
```

The exact versioned schema and persistence shape remain Phase 1 design work, but the contract must preserve these invariants:

- A checkpoint target and packet bind to a canonical input snapshot hash.
- A decision binds to the same hash and names only product-advertised allowed actions.
- Changed upstream authority supersedes affected checkpoint state and prevents stale advance.
- Checkpoint decisions reference the stage-specific human authority that owns the decision.
- Research status is a deterministic read projection, not a writable summary.
- Direct workflow/node routes invoke the same central transition guard as coordinated runs.
- Replays are idempotent and conflicting decisions or snapshot drift fail closed.

## Migration and operation

- Existing records remain readable throughout the cutover.
- Phase 1 must classify pre-cutover in-flight, packaged, promoted, bridged, and intake-created records before write behavior changes.
- The selected cutover must be versioned and reversible; compatibility cannot become a permanent unguarded advance path.
- Current API-first operation remains supported. GUI work is neither required nor authorized by this task.
- OpenAPI and maintained topic-selection process documentation change in the same verified units as runtime contracts.
