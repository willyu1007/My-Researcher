# 05 Pitfalls (do not repeat)

This file prevents repeated mistakes within T-139. Append resolved failures; do not rewrite history.

## Do-not-repeat summary

- Do not remove or bypass the current D-19 dependency and exact two-cell gates under the guise of a thin continuation service.
- Do not add continuation-owned workflow/stage persistence; derive progress from existing owner authority.
- Do not extend the existing coordinator with domain writer dependencies.
- Do not let callers or LLMs author downstream ids, hashes, scientific observations, model options, credentials or stage values.
- Do not automatically select an experiment specification or trigger a paid PAI Job.
- Do not repeat LLM/provider/domain writes when persisted owner state already records completion.

## Pitfall log (append-only)

### 2026-08-22 — existing motive lane is not CoreMotive bootstrap

- Symptom: the initial plan assumed T-138 semantic context could start the existing `motive` coordinator lane.
- Root cause: that lane requires existing motive/version/assertion/context identities and produces decomposition/evolution proposals; its contract intentionally has no Domain Gate or CoreMotive write request.
- What was tried: traced coordinator payload construction, runtime output, acceptance bridge, and authority dependencies before route composition.
- Fix: narrowed T-139 to owner-state status/replay and persisted-run recovery; missing motive returns `CORE_MOTIVE_BOOTSTRAP_NOT_COMPOSED`.
- Prevention: treat a contract name as insufficient evidence of product composition; verify required semantic input and authority writer before claiming automatic continuation.

### 2026-08-22 — inline TypeScript loader needed the repository test mode

- Symptom: the first credential-free in-process T-137 replay failed with an opaque `ts-node/esm` loader exception.
- Root cause: the ad-hoc Node 20 command omitted `TS_NODE_TRANSPILE_ONLY=1`, unlike the repository's supported test/runtime invocation pattern.
- What was tried: reran the same read-only injection with Node 20, the repository env file, and transpile-only enabled.
- Fix: the replay completed twice with identical `ready_for_writing` responses and no performed effects.
- Prevention: use Node 20 plus the repository's established TypeScript loader flags for ad-hoc in-process verification; do not interpret a loader failure as a business regression.

### 2026-08-22 — project-global terminal Dossier can mask a newer Cycle

- Symptom: final diff review found that the owner reader preferred any project-level trace-complete Dossier before confirming that the Dossier belonged to the currently selected ValidationCycle.
- Root cause: Packet selection was Cycle-scoped, but the terminal Dossier fallback searched the full project Dossier list.
- What was tried: constructed a project with a running current Cycle and a historical completed Cycle containing a ready Dossier.
- Fix: Claim and Dossier selection now requires the current Cycle's selected Packet; the new isolation test confirms all historical Claim/Dossier ids remain absent from current owner state.
- Prevention: every terminal authority lookup must preserve the complete current owner chain, not merely the project root.
