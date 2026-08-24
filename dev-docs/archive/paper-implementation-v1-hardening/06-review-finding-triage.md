# Review Finding Triage

## Decision
The review report is useful, but T-102 should adopt only the findings that harden the existing V1 authority/control plane without expanding into productization.

## Triage Table
| Finding | Review priority | Project assessment | T-102 action |
|---|---:|---|---|
| F-01 scoped verification rerun | P1 | Environment confidence issue, not a product semantic defect. | Run normal T-102 verification; CI artifact may be future process work. |
| F-02 `RunEvidenceUnit` trace target is not itself | P1 | Valuable and real trace-precision risk. | In scope. |
| F-03 `result_interpretation_packet` trace alias gap | P1 | Valuable and cheap correctness fix. | In scope. |
| F-04 `ClaimCandidate` lacks trace packet but says supported | P1 | Valuable semantic-readiness risk. | In scope. |
| F-05 broad claim support allowlist | P1 | Valuable writing-ready rigor issue. | In scope. |
| F-06 lexical overclaim detection | P1/P2 | Real robustness gap, but live semantic critic is not deterministic. | Deterministic adversarial slice in scope; live critic deferred. |
| F-07 WorkOrder bridge is not live execution adapter | P2 | Correct V1 boundary, not a defect. | Split follow-up. |
| F-08 live LLM variance not covered | P2 | Correct T-101 residual risk. | Split follow-up. |
| F-09 browser E2E / deep trace UI | P2 | Product/UI hardening. | Split follow-up. |
| F-10 writing ingestion not defined | P2 | Downstream writing/PaperProject responsibility. | Split follow-up. |
| F-11 `research-argument` legacy cleanup | P2 | Cleanup/decommission task, not V1 hardening. | Split follow-up. |
| F-12 periodic cross-ref integrity sweep | P2 | Ops/maintenance capability. | Optional future follow-up. |
| F-13 WorkOrder terminal outcome semantics | P2 | Useful read-model clarity issue. | Narrow slice in scope. |
| F-14 richer human confirmation payload | P2 | Review UX/product hardening. | Split follow-up unless needed by claim changes. |
| F-15 workbench trace drilldown | P2/P3 | UI product hardening. | Split follow-up. |
| F-16 downstream writing citation gate | P2 | Writing lane ownership. | Split follow-up. |

## Follow-Up Candidates
- `paper-implementation-live-experiment-adapter`
- `paper-implementation-provider-variance-evaluation`
- `paper-implementation-browser-e2e-and-trace-drilldown`
- `paper-project-writing-ingestion-contract`
- `research-argument-decommission`
- `paper-implementation-integrity-sweep`
