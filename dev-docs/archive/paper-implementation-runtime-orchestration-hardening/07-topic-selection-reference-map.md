# 07 Topic Selection Reference Map

## Reference Tasks
| Topic-selection task | Useful standard | PaperImplementation translation |
|---|---|---|
| T-088 `topic-selection-workflow-runtime-foundation` | `WorkflowHarness` as scenario runner, `AgentOrchestrator` as execution boundary, execution-mode separation | `PaperImplementationHarness` should orchestrate scenarios while runtime/admission services own slot semantics. |
| T-107 `topic-selection-v1b-workflow-hardening` | Every node is harness-callable, contract-bound, replayable, quality-gated | Every PaperImplementation workflow type needs slot policy and replay identity before production promotion. |
| T-108 `topic-selection-v1c-workflow-hardening` | Harden promoted advisory nodes and human/delegated boundaries | PaperImplementation human confirmation and decision queue must remain separate from agent output. |
| T-112 `topic-selection-llm-context-cache-runtime` | Per-slot context/cache/token/compression policy, provider canaries, runtime stress | PaperImplementation needs equivalent slot matrix and L1-L5 evidence. |
| T-111 `topic-selection-v1a-production-orchestration` | Harness-native HTTP invocation and route policy | PaperImplementation should add route invocation only after service/admission contracts are locked. |

## Reusable Rules
- Runtime owns context/cache/compression/token-budget/reuse/audit semantics.
- Harness owns orchestration, fixtures, replay/stress/drift evidence, and assertions.
- Domain services own authority gates and persistence.
- Provider canary must hit the production runtime slot.
- Prompt/cache hits cannot skip deterministic gates.
- External artifact admission must validate schema, provenance, hashes, reuse policy, and side-effect boundaries.

## Non-Reusable Items
- Topic-selection node ids, node contracts, handoff DTOs, need/value/promotion semantics.
- Topic-selection route policy names.
- Topic-selection prompt variants unless generalized.
- Topic-selection-specific context packet families.

## Candidate Shared-Kernel Extraction Points
- Execution mode vocabulary.
- Provider/model profile resolution.
- Runtime invocation audit envelope.
- Prompt packet identity and prompt packet cache metadata rules.
- Token-budget gate service.
- Compression runtime service.
- Provider canary service, if it can be made domain-neutral without importing topic-selection semantics.
