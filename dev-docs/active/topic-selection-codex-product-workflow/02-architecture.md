# Architecture

## Context and current state

Topic selection composes resource sampling and evidence → candidate needs and HumanConfirmNeed → constraints/slice selection → question generation/confirmation → value/disposition/package → promotion decision → PaperProject bridge/intake, with feedback/recheck and explicit non-advance routes. Current research state is derived from product owners; four checkpoint kinds protect evidence, gap, question and promotion authority.

The maintained workflow matrix already names node semantics and model/support slots. Runtime admission is distributed across shared node/scenario/slot contracts, the model-profile registry and product callers. Matrix consistency proves declared policy alignment, not that every admitted mode has a complete product consumer or sufficient live verification.

The T-151 orchestrator has a `codex_cli` branch and a runner outcome with trace provenance. T-153 now composes one app-owned runner and adds CLI semantic artifact/derived-draft types, while shipped profiles and node/slot admission remain closed. T-152 completed its App Server transport at `a5263023`; App Server is the default and the runner contract remains the consumer boundary. Its canaries are foundation evidence, not T-153 product-node evidence.

N6 regular initial question generation already requires two Explorer outputs, one Critic and one Arbiter over frozen input. N8 assessment conditionally routes through its existing bounded Debate and admission. Their gateway-provider branches have dormancy plus incomplete-live-path guards; changing the shared constant cannot supply missing role output/provenance wiring. Refinement-delta and promotion callers have their own execution restrictions. The v1a need-discovery final-synthesis profile admits only provider/mock today; that is a concrete full-workflow integration issue, not an exception to hide from completion.

T-150 provides evidence-stage managed-library retrieval, admitted claim delta, successor EvidenceMap and linked frozen rounds. Public granular APIs expose retrieval execution, successor maps and linked rounds; the full pilot composes existing owners. Existing CLI research MCP tools list/read a frozen evidence scope; they do not themselves implement this retrieval loop. Connecting these owners requires explicit product composition without making the model an evidence or checkpoint authority.

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

The source-backed profile and operation index is in `execution-inventory.md`. All 36 topic-selection profiles currently exclude CLI. Resource classification and ordinary promotion support are provider-only; need-discovery final synthesis permits provider/mock only. These require consumer and policy changes, not just wiring the runner into N6/N8.

### Application-owned execution

Create one configured runner through the existing environment factory in backend app composition, inject it into the existing orchestrators/consumers, and call `shutdown()` on app close. Reuse the app's MCP scope store. Resolve the MCP endpoint from the actual listening address; do not assume port 3000 in tests or alternate deployments. Tests using injection must explicitly supply a listening MCP endpoint when exercising tools.

Keep fresh runner threads per attempt and the current outcome fields: status, final message, runner version, transport, Codex home identity, thread ID, usage, tool calls and trace events. Product services own cross-role/round context. No runner session becomes research authority. Required evidence/tool configuration must fail visibly if unavailable; a missing scope must not silently turn an evidence-required run into unsupported generation.

### Canonical request shape

Extend the existing v1b runtime/coordinator contract with a discriminated CLI request. The CLI branch supplies frozen source identity and execution settings, defaults to product run mode, and rejects external `role_outputs`, `codex_response` and gateway `model_option_id`. Existing external-output requests retain their truthful provenance. The current coordinator's reserved `execution_spec` rejection must be replaced by explicit consumption for the enabled route; accepting and ignoring it is invalid.

Update HTTP validation, shared input types, node/slot/scenario admission, profile eligibility and consumer dispatch as one slice. Do not globally open `TOPIC_SELECTION_V1B_PROVIDER_DEBATE_PATH`: that constant controls the deferred gateway route. Required CLI model settings come from the existing configuration/runner owners, not a task-specific second source.

### Role inputs contain actual evidence and prior outputs

Current N6 frozen input contains refs/hashes for constraints, readiness and slice/selection. N6/N8 context builders also carry prior-role artifact hashes without loading their actual output bodies. The core passes those packets directly to the model. Those identities are necessary for integrity but insufficient for a Critic to inspect an Explorer's argument.

Compile source bodies through existing repositories with title, version, checksum and currentness checks. Reuse `TopicSelectionResearchEvidencePacketService.resolve()` for admissible bounded evidence excerpts and locators. Freeze the exact compiled input with its hashes before launching a role; subsequent retrieval is restricted to the same admitted scope. Missing/stale/oversized required context is a visible preparation failure, not fabricated evidence or silent truncation of decisive material.

For regular N6, each of two initial Explorers sees the same frozen research input independently. Critic sees both validated outputs; Arbiter sees both plus the Critic's actual findings. N8 and refinement use their existing ordered-role semantics. Load prior outputs from recorded artifacts, verify their identities/hashes and include the relevant bodies alongside their hashes. Do not infer model/provider independence from two role instances using one Codex model.

### Deterministic final-draft bridge

After role admission, project the final role's candidate/value draft into the existing draft admission and recording path. Separate draft recording from model invocation in the draft runtime. The bridge must not launch a fifth model call or label the final Codex output as operator-authored `codex_assisted` work.

Bind the derived draft to the admitted final role artifact, its invocation audit/CLI trace, transcript and exact projection hash. The full role output and its nested draft have different hashes: copying the role audit into a single-agent result would break the existing structured-output identity check. Represent derivation explicitly inside existing typed artifact/admission owners; do not invent a successful single-agent invocation. Preserve checks on frozen input, source lineage and role admission. Keep the bridge internal; no public request may inject an arbitrary supposedly trusted invocation result.

### Attempts, duplicate requests and recovery

N6 currently has a completed receipt plus an in-process `WeakMap` single-flight; N8's loop lacks an equivalent completed-loop receipt. The orchestrator records CLI trace after `runner.run()`. None of those facts alone proves restart-safe exclusion before model work.

Use the control plane's existing immutable artifact/stable-key uniqueness to claim a logical role attempt before launching it. Bind the claim to the semantic request hash, frozen input, role instance, profile/prompt/config identity and a fresh owner token; only the successful claimant may call the runner. The Prisma repository already has a unique stable-key create/read path; preserve equivalent behavior in memory. A typed internal helper must distinguish winning ownership from idempotent reads or conflicting content. No new database table or general job framework is assumed.

Persist completion/failure references separately and reuse validated completed role results and the final loop receipt for exact replay. Concurrent losers observe in-progress/conflict without launching another call. A claim with no trustworthy terminal result after restart is ambiguous: expose an interrupted attempt and require an explicit new product attempt identity before another metered call. Do not auto-expire a claim into rerunning uncertain work. Resume from persisted completed roles where safe; missing/changed evidence or identity requires the existing invalidation/recovery path. Never promise exactly-once execution across an external model and database transaction.

Apply the same attempt boundary to ordinary model/support calls as rollout proceeds. Failed schema/admission results retain trace but create no successful domain draft or human authority.

## Migration and operation

Open each Codex slice only with its consumer, prompt/evidence contract, profile admission, output provenance and decisive verification aligned. Preserve historical operator/provider records under their actual source kind. Do not convert completed role artifacts into purported CLI executions.

Other generation providers remain outside activation scope. Existing non-provider meaning (“not the gateway line”) must not turn a paid/account-metered Codex call into a free local operation in continuation/cost policy. Exact configuration, account provisioning and live-run budget are operational inputs, not secrets to record here.

The full-chain operating surface must show the current stage, pending Human decision, failure/recovery boundary and evidence references. It must not depend on canary-only profile changes, direct DB writes or manually authored role outputs. T-129 retirement and affected historical references are reconciled with the explicit obligation dispositions in the roadmap; opening alone changes no runtime protection.
