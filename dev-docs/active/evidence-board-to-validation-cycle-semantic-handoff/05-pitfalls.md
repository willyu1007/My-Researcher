# T-142 Pitfalls (do not repeat)

## Do-not-repeat summary

- Do not reopen T-141; record prerequisite hardening under T-142.
- Do not copy T-137's fixed SciFact cycle question, criteria, budget, or human decision.
- Do not bypass the coordinator's selected candidate or acceptance-bridge artifact admission.
- Do not add a partial validation-planning lane or a second workflow state.
- Do not write feasibility proposals as executable experiment authority in T-142.
- Do not claim exact-once while Prisma unique races still escape as raw errors.
- Do not rely on repository list ordering when selecting the reusable completed cycle.
- Do not turn a T-095 scientific admission rejection into an opaque HTTP-only failure.

## Pitfall log

### 2026-08-24 - T-141 replay/readiness review exposed prerequisite gaps

- Symptom: the happy path and same-instance concurrency tests passed, but adversarial review found stale owner state, ref-version drift, unbounded single-object lookup, and raw Prisma unique-race paths.
- Context: implementation quality review before starting T-142.
- What we tried: traced T-141 from response contract through owner reads, Trace Kernel, EvidenceBoard writer, in-memory repositories, and Prisma repositories; compared the result with the T-095 ValidationCycle Domain Gate.
- Why it matters: T-142 trusts the current board as its scientific planning input, so a stale/misbound board or unrecoverable race would contaminate or duplicate the next authority transition.
- Fix / workaround: make these checks the first T-142 phase and add adversarial tests before composing the new handoff.
- Prevention: release review must cover durable cross-instance conflicts and exact owner version identity, not only deterministic ids and local singleflight.

### 2026-08-24 - Final review found recovery-order and blocker-surface drift

- Symptom: Prisma returned cycles newest-first while the in-memory repository returned insertion order; T-095 admission rejection also escaped the semantic handoff response.
- Context: final manual architecture review after the first full green test run.
- Why it matters: different stores could recover different historical authority, and an LLM could not distinguish a scientific admission blocker from a transport failure.
- Fix / workaround: sort matching owner cycles by persisted recency inside T-142 and map a still-proposed cycle after T-095 rejection to `VALIDATION_CYCLE_ADMISSION_BLOCKED` at `cycle_write`.
- Prevention: test store-independent ordering and every declared semantic stage, including writer-side Domain Gate failures.
