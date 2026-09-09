# Architecture

## Context and current state

Topic selection composes resource sampling and evidence → candidate needs and HumanConfirmNeed → constraints/slice selection → question generation/confirmation → value/disposition/package → promotion decision → PaperProject bridge/intake, with feedback/recheck and explicit non-advance routes. Current research state is derived from product owners; four checkpoint kinds protect evidence, gap, question and promotion authority.

The maintained workflow matrix already names node semantics and model/support slots. Runtime admission is distributed across shared node/scenario/slot contracts, the model-profile registry and product callers. Matrix consistency proves declared policy alignment, not that every admitted mode has a complete product consumer or sufficient live verification.

The T-151 orchestrator has a `codex_cli` branch and a runner outcome with trace provenance. Shipped profiles do not yet admit that line, v1b harness modes exclude it, and canary-local injection/admission does not wire the application. T-152 owns the transport behind this runner contract.

N6 regular initial question generation already requires two Explorer outputs, one Critic and one Arbiter over frozen input. N8 assessment conditionally routes through its existing bounded Debate and admission. Their gateway-provider branches have dormancy plus incomplete-live-path guards; changing the shared constant cannot supply missing role output/provenance wiring. Refinement-delta and promotion callers have their own execution restrictions. The v1a need-discovery final-synthesis profile admits only provider/mock today; that is a concrete full-workflow integration issue, not an exception to hide from completion.

T-150 provides evidence-stage managed-library retrieval, admitted claim delta, successor EvidenceMap and linked frozen rounds. Its full workflow pilot is a composition of services, not a new public orchestration endpoint. Existing CLI research MCP tools list/read a frozen evidence scope; they do not themselves implement this retrieval loop. Connecting these owners requires explicit product composition without making the model an evidence or checkpoint authority.

## Settled design and boundaries

- Keep the existing node/slot/profile/scenario policies as runtime authority and the workflow matrix as their semantic entry point. Verification records what is proved; it does not become another activation registry.
- Model execution uses `codex_cli`, with runner-owned model/version/thread identity and persisted attempt trace. `provider_llm` remains the separate gateway line; `codex_assisted` means externally authored, operator-signed output.
- Product services compile role-specific evidence and prior-role outputs, launch each attempt and pass validated drafts through existing admission/gates. Product owners retain cross-round state and domain currentness.
- Preserve the runner's fresh-attempt isolation and product-owned Codex home. Consume T-152's agreed interface rather than creating a competing transport or shared conversation authority.
- Model roles may prepare support, candidates, objections and condition suggestions. They cannot mint exact Human decisions, silently accept material risk, remove blocking objections or supersede frozen research authorities.
- Deterministic packaging, snapshotting, gates, bridge and intake remain deterministic. Full-workflow Codex operation means those steps compose with model work and human decisions, not that Codex replaces every step.
- Evidence-stage changes follow existing managed-library request/SearchRun/EvidenceDelta/successor/linked-round ownership. Downstream frozen evidence changes take existing upstream recovery paths.
- Existing optional support and rejected/reserved Debate semantics remain explicit. Required model roles must become executable through the Codex product path; optional roles receive a tested Codex disposition without becoming mandatory workflow work.

## Interfaces and contracts

Canonical integration seams to resolve in Phase 1:

- `TopicSelectionAgentOrchestratorService` and the current Codex runner outcome; profile/run-mode admission and `.ai/llm/topic-selection` prompt configuration.
- v1a WorkflowHarness/need-discovery adapter and role loop; resource/extraction/adjudication/confirmation support; evidence-convergence coordinator and round service.
- v1b public runtime invocation and run-coordinator inputs, N6/N8/refinement services, semantic support slots and gate-facing artifact provenance.
- v1c bounded-debate coordinator, ordinary promotion support, gate, human-decision, bridge and feedback interfaces.
- Research status, stage manifest, human stage views and continuation envelope for supported operation and exact recovery.

Exact adapter shape, the first stage's prompt qualification criteria, which current HTTP callers need extension and coordinated T-152 interface changes remain unsettled. No new persistent schema or framework is assumed before this inventory.

## Migration and operation

Open each Codex slice only with its consumer, prompt/evidence contract, profile admission, output provenance and decisive verification aligned. Preserve historical operator/provider records under their actual source kind. Do not convert completed role artifacts into purported CLI executions.

Other generation providers remain outside activation scope. Existing non-provider meaning (“not the gateway line”) must not turn a paid/account-metered Codex call into a free local operation in continuation/cost policy. Exact configuration, account provisioning and live-run budget are operational inputs, not secrets to record here.

The full-chain operating surface must show the current stage, pending Human decision, failure/recovery boundary and evidence references. It must not depend on canary-only profile changes, direct DB writes or manually authored role outputs. T-129 retirement and affected historical references are reconciled with the explicit obligation dispositions in the roadmap; opening alone changes no runtime protection.
