# T-143 Plan

## Phases

1. [x] Harden shared response and owner-resolution semantics.
2. [x] Replace unbounded ValidationCycle scans with one bounded owner query.
3. [x] Harden coordinator recovery, blocked-run resume, and blocker classification.
4. [x] Enforce proposal, runtime artifact, technical-lineage, and trace authority gates.
5. [ ] Land the locally verified change and confirm remote CI.

## Detailed steps

1. Allow T-142's existing `owner_resolution` stage to return nullable not-yet-resolved semantic context and technical lineage while retaining the project owner root.
2. Map expected owner eligibility failures to a semantic owner-state blocker; continue throwing malformed-request, internal, and later immutable-authority drift errors.
3. Add one bounded repository query over the current board, motive version, and assertion owner set; preserve existing list APIs for their current callers.
4. Build a single expected coordinator create request, use it for create and complete recovery comparison, and advance retryable `blocked` runs on repeat.
5. Distinguish concurrent, waiting-review, retryable provider, terminal failed, budget-exhausted, and domain stops without promising an impossible repeat.
6. Require exactly one passed selected planning step and verify project/run/slot/runtime ref/type/id/hash/workflow ownership.
7. Stop confirmatory proposals before cycle/trace writes and discard unresolved model-authored iteration-budget refs instead of persisting them.
8. Validate exact board, binding, and ValidationCycle trace targets during durable recovery.
9. Add focused contract, repository, service, route, and replay tests, then run full repository gates under Node 20.

## Risks & mitigations

- Risk: changing owner-resolution responses could hide immutable-authority corruption behind a 200 response.
  - Mitigation: only map expected pre-authority owner eligibility errors; keep artifact/hash/trace/cycle drift as 409 conflicts.
- Risk: resuming every blocked coordinator run could repeat nonretryable domain work.
  - Mitigation: re-advance only coordinator states that the existing coordinator defines as nonterminal and use the persisted step outcome to classify the resulting blocker.
- Risk: a bounded query could miss a competing cycle under a different target representation.
  - Mitigation: query the full current owner set (board, motive version, assertions, and current target version), order by recency, and request two active rows to detect ambiguity.
- Risk: stricter exact-ref checks could reject legacy corrupt authority.
  - Mitigation: fail closed with `VERSION_CONFLICT`; do not mutate or silently repair existing scientific authority.
