# 05 Pitfalls

## Do Not Repeat
- Do not submit runs outside `ResearchWorkOrderHarness`.
- Do not copy experiment-foundation result payloads as implementation authority.
- Do not discard failed Runs, and do not preserve them by minting REU: all Runs remain immutable/queryable history, while D-16 includes exact Run/Attempt facts in the Cycle closure snapshot only for watermark-bound current branch heads.
- Do not auto-promote non-head history into readiness, snapshot or dossier scope. Paper comparison requires explicit `comparison_input_ref` lineage from the current admitted revision and never restores head membership.
- Do not omit a branch with no head, ignore an active real-provider Attempt on a non-head Run, or reuse a closure handoff after Cycle/branch/head CAS drift.
- Do not let `EvidenceCandidate` bypass result interpretation and claim trace.
- Do not accept monitor callbacks that cannot be tied back to a work order.
- Do not hide run status or run type inside JSON-only payloads.

## Landed Guardrails
- `ResearchWorkOrder` creation requires an active `ImplementationProject`, admitted `ValidationCycle`, complete work-order trace manifest, run policy, recipe hash, and dataset/code/config refs.
- Confirmatory and reproduction runs require `version_lock_hash` and `config_snapshot_hash`; autotune is blocked for those run types.
- Harness submission only works for admitted/running work orders and stores `external_job_ref/hash` as bridge refs.
- Complete protocol-compliant validation-passed monitor lineage may create `RunEvidenceUnit` through the sole gateway; failed/cancelled/incomplete records never do, and monitor records without `work_order_id` remain untrusted.
- Trusted monitor records also require a previously submitted harness run with matching `external_job_ref/hash`; a bare `work_order_id` callback is not trusted.
- Eligible RunEvidenceUnit requires complete result refs, validation report refs/hashes and EvidenceCandidate. Current-head failed/cancelled/incomplete execution belongs to Cycle closure accounting; non-head execution remains read-only history, and valid negative/inconclusive result disposition is separate from execution status and is not a generic failure summary.
- `ResearchWorkOrder` update paths must not reuse create-input mapping; only runtime status/admission/external-job fields are mutable after creation.
- T-096 has no `research-argument` dependency and no direct claim/dossier writer.
