# 05 Pitfalls

## Do-not-repeat Summary
- Do not use T-042 closure as proof that the backend acceptance suite has been executed.
- Do not treat memory-mode route tests as sufficient for persistence acceptance.
- Do not ignore environment-gated Prisma smoke requirements; use an isolated disposable schema.
- Do not mark desktop UI gaps as backend acceptance blockers unless they expose an API or service contract bug.
- Do not treat synthetic replay metrics as mature product quality thresholds.
- Do not collapse v1b value disposition and v1c promotion decision into one acceptance condition.
- Do not allow downstream feedback/recheck to mutate upstream topic-selection authority during acceptance fixtures.
- Do not treat live LLM wrapper refs as valid authority refs. Normalize only known wrapper aliases back to inherited contract refs, and keep unknown refs blocked.
- Do not accept `research_slice_ref` as a new authority ref in v1b value assessment; only normalize it when it is the exact inherited research-slice wrapper alias.
- Do not advance `answerable_with_risk` / `ready_with_accepted_risk` without a real `accepted_risk` authority ref.
- When running temporary scripts through `pnpm --filter ... exec`, remember the effective cwd is the package directory; write evidence paths from an explicit repo root.
- Do not let risk-heavy RAG/security papers satisfy support coverage just because they contain RAG/retrieval terms; classify them as challenge unless they provide positive method evidence.
- When asserting bridge immutability through HTTP, compare stable field subsets on both sides; the bridge GET route returns the full read model, not a narrowed assertion DTO.

## Historical Lessons
- 2026-05-17 real-flow ref drift:
  - Symptom: live v1b LLM output cited `research_slice`, `research_slice_boundary`, `research_slice_assumption`, `topic_question_evidence_ref`, or `research_slice_evidence_ref` where downstream validators required exact inherited evidence, boundary, assumption, or accepted-risk refs.
  - Root cause: prompts described the desired refs but the live model still used nearby wrapper/aggregate refs.
  - What was tried: reran the same real flow after each prompt/normalization fix and kept the hard validators in place.
  - Fix: prompts now state the exact allowed ref families, and post-processing normalizes only known wrapper aliases back to inherited refs before validation.
  - Prevention: keep validators strict; add unit coverage for each wrapper alias before relying on live-flow evidence.
- 2026-05-17 accepted-risk carry-forward:
  - Symptom: a live topic question marked `answerable_with_risk` led value assessment/package handoff to reject advancement without accepted-risk authority.
  - Root cause: the real-flow harness allowed a human selection of a risk-bearing candidate without creating/passing an `accepted_risk` ref.
  - What was tried: first filtered invalid evidence refs out of `accepted_risk_refs`, then confirmed the remaining failure was a legitimate governance stop.
  - Fix: the harness now prefers risk-free `answerable` candidates and creates an explicit accepted risk through the existing v1a route if only `answerable_with_risk` candidates are available.
  - Prevention: never satisfy a risk-bearing readiness state by reclassifying evidence refs as accepted risks.
- 2026-05-17 resource sampling:
  - Symptom: the first stricter 16-literature run still placed an adversarial RAG/SQLi paper in support because the sampler matched `retrieval` without accounting for risk-heavy framing.
  - Root cause: role matching used topical terms before evidence polarity.
  - What was tried: read back the selected literature digest and confirmed it was RAG-related but adversarial.
  - Fix: the temporary sampler now excludes specific risk signals from support and lets those papers fill challenge roles.
  - Prevention: durable sampling should score topic relevance and evidence polarity separately.
- 2026-05-18 bridge immutability assertion:
  - Symptom: the first downstream-feedback route hardening run failed while checking that feedback did not mutate `PaperProjectBridge`.
  - Root cause: the test compared a selected stable-field object to the full bridge read model returned by the GET route.
  - What was tried: inspected the failure diff and confirmed all stable fields were unchanged while the expected object contained the full read model.
  - Fix: store and compare the same stable field subset before and after feedback creation.
  - Prevention: when a route returns a full read model, build explicit assertion snapshots instead of relying on narrowed TypeScript casts.
- 2026-05-18 value-assessment research-slice wrapper:
  - Symptom: the first real provider downstream replay failed in v1b value assessment with `GATE_CONSTRAINT_FAILED` because the live LLM cited `ref_type=research_slice_ref`.
  - Root cause: the prompt exposed a field named `research_slice_ref`, and the model copied that wrapper name into the cited authority ref instead of preserving the inherited `research_slice` ref type.
  - What was tried: kept the hard unknown-ref validator in place and reproduced the issue with the real provider run artifact.
  - Fix: prompt wording now says to use the inherited research-slice ref exactly, and post-processing normalizes only a matching `research_slice_ref` wrapper alias back to `research_slice`.
  - Prevention: if future live runs expose another wrapper name, add the narrowest possible alias normalization plus a unit test; do not broaden the validator to accept arbitrary wrapper refs.
