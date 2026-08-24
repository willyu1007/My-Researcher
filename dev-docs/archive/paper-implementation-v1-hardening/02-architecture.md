# Architecture

## Boundary
T-102 hardens the existing PaperImplementation V1 lane:

```text
ImplementationProject
  -> TraceManifest / CitationCandidate / ClaimTracePacket
  -> CoreMotive / EvidenceBoard / ValidationCycle
  -> ResearchWorkOrder / RunEvidenceUnit
  -> ResultInterpretationPacket / ClaimCandidate / ImplementationDossier
  -> WritingEntryPacket projection
```

It MUST NOT introduce a second root, a parallel evidence ledger, or a writing-lane authority.

## Authority Rules
| Area | Rule |
|---|---|
| Project root | `ImplementationProject` remains the only PaperImplementation authority root. |
| Trace | `TraceManifest` remains the trace authority; T-102 may tighten target requirements but not redefine trace ownership. |
| Run evidence | `RunEvidenceUnit` remains the implementation-side evidence ledger item; writing-affecting use requires its own trace readiness. |
| Claim | `ClaimCandidate` remains bounded and provisional until claim trace/dossier gates admit it. |
| Dossier | `ImplementationDossier` remains the pre-writing authority. |
| Writing packet | `WritingEntryPacket` remains a projection, not a downstream writing authority. |
| Retired historical boundary | Former pre-writing control-plane artifacts remain historical only and must not become wrappers or authority inputs. |

## Compatibility Rules
- Existing persisted objects SHOULD remain readable unless a migration is explicitly required.
- Any new enum/status MUST be backward-compatible or include deterministic migration/default handling.
- Required gate fields MUST remain columnized/queryable when persistence changes are made.
- T-102 tests MUST assert the old ambiguous paths fail or are clearly downgraded.

## Review Finding Mapping
| Finding | Architecture treatment |
|---|---|
| F-02 RunEvidenceUnit trace target inherited from WorkOrder | Harden target-specific trace before evidence can feed writing-affecting claim/dossier paths. |
| F-03 ResultInterpretationPacket trace alias gap | Add canonical target support and coverage. |
| F-04 ClaimCandidate `supported` without claim trace | Split provisional/readiness semantics. |
| F-05 Broad claim support allowlist | Restrict writing-ready support gate to citable locator-backed evidence/claim trace. |
| F-06 Lexical overclaim | Add deterministic adversarial coverage; live critic deferred. |
| F-13 WorkOrder outcome collapse | Preserve process completion and scientific outcome separately where exposed. |

## Split Follow-Ups
| Follow-up | Reason for split |
|---|---|
| Live experiment adapter | Requires provider/credential/runtime policy and experiment-foundation production integration. |
| Live LLM variance suite | Requires provider configuration and non-deterministic evaluation budget. |
| Browser E2E / trace drilldown | Product/UI test harness scope; not needed for backend hardening. |
| Writing ingestion contract | Owned by writing/PaperProject lane, consuming `WritingEntryPacket`. |
| `research-argument` decommission | Cleanup task with migration/removal review, not V1 hardening. |
