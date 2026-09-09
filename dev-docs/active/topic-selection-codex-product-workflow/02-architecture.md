# Architecture

## Context and current state

Topic selection composes resource sampling and evidence → candidate needs and HumanConfirmNeed → constraints/slice selection → question generation/confirmation → value/disposition/package → promotion decision → PaperProject bridge/intake, with feedback/recheck and explicit non-advance routes. Current research state is derived from product owners; four checkpoint kinds protect evidence, gap, question and promotion authority.

The maintained workflow matrix already names node semantics and model/support slots. Runtime admission is distributed across shared node/scenario/slot contracts, the model-profile registry and product callers. Matrix consistency proves declared policy alignment, not that every admitted mode has a complete product consumer or sufficient live verification.

The T-151 orchestrator has a `codex_cli` branch and a runner outcome with trace provenance. T-153 composes one app-owned runner, CLI semantic artifact/derived-draft types and canonical N6/N8 consumers. Their node/draft-slot types admit CLI, while shipped profiles remain closed pending qualification. T-152 completed its App Server transport at `a5263023`; App Server is the default and the runner contract remains the consumer boundary. Its canaries are foundation evidence, not T-153 product-node evidence.

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

The existing v1b harness/coordinator consumes `execution_spec.execution_mode=codex_cli` for N6/N8. The CLI branch supplies frozen source identity and execution settings, defaults to product run mode, and rejects external role answers and gateway `model_option_id`. Existing external-output requests retain their truthful provenance. N6 infers the generation mode from its frozen recovery projections; N8 uses the recorded N7 admission input mode to select ordinary assessment or conditional Debate. Other coordinator execution specs remain reserved.

Update HTTP validation, shared input types, node/slot/scenario admission, profile eligibility and consumer dispatch as one slice. Do not globally open `TOPIC_SELECTION_V1B_PROVIDER_DEBATE_PATH`: that constant controls the deferred gateway route. Required CLI model settings come from the existing configuration/runner owners, not a task-specific second source.

### Role inputs contain actual evidence and prior outputs

N6 frozen input identifies constraints, readiness and slice/selection with refs/hashes. The CLI consumer resolves the corresponding scoped domain/evidence bodies, and the shared prior-output resolver verifies and loads each earlier role's actual output. These bodies accompany the integrity hashes in the model packet; hashes alone are not research evidence or an argument a Critic can review.

Compile source bodies through existing repositories with title, version, checksum and currentness checks. Reuse `TopicSelectionResearchEvidencePacketService.resolve()` for admissible bounded evidence excerpts and locators. Freeze the exact compiled input with its hashes before launching a role; subsequent retrieval is restricted to the same admitted scope. Missing/stale/oversized required context is a visible preparation failure, not fabricated evidence or silent truncation of decisive material.

For regular N6, each of two initial Explorers sees the same frozen research input independently. Critic sees both validated outputs; Arbiter sees both plus the Critic's actual findings. N8 and refinement use their existing ordered-role semantics. Load prior outputs from recorded artifacts, verify their identities/hashes and include the relevant bodies alongside their hashes. Do not infer model/provider independence from two role instances using one Codex model.

### Deterministic final-draft bridge

After role admission, project the final role's candidate/value draft into the existing draft admission and recording path. Separate draft recording from model invocation in the draft runtime. The bridge must not launch a fifth model call or label the final Codex output as operator-authored `codex_assisted` work.

Bind the derived draft to the admitted final role artifact, its invocation audit/CLI trace, transcript and exact projection hash. The full role output and its nested draft have different hashes: copying the role audit into a single-agent result would break the existing structured-output identity check. Represent derivation explicitly inside existing typed artifact/admission owners; do not invent a successful single-agent invocation. Preserve checks on frozen input, source lineage and role admission. Keep the bridge internal; no public request may inject an arbitrary supposedly trusted invocation result.

### Attempts, duplicate requests and recovery

N6 has a completed-loop receipt plus an in-process `WeakMap` single-flight. Both N6 and N8 use persisted CLI role claims/outcomes and a protected final-draft derivation receipt; N8 does not need to rerun completed roles to reconstruct its loop. The orchestrator records CLI trace after `runner.run()`, while the persistent attempt claim is acquired before launching it.

Use the control plane's existing immutable artifact/stable-key uniqueness to claim a logical role attempt before launching it. Bind the claim to the semantic request hash, frozen input, role instance, profile/prompt/config identity and a fresh owner token; only the successful claimant may call the runner. The Prisma repository already has a unique stable-key create/read path; preserve equivalent behavior in memory. A typed internal helper must distinguish winning ownership from idempotent reads or conflicting content. No new database table or general job framework is assumed.

Persist completion/failure references separately and reuse validated completed role results and the final loop receipt for exact replay. Concurrent losers observe in-progress/conflict without launching another call. A claim with no trustworthy terminal result after restart is ambiguous: expose an interrupted attempt and require an explicit new product attempt identity before another metered call. Do not auto-expire a claim into rerunning uncertain work. Resume from persisted completed roles where safe; missing/changed evidence or identity requires the existing invalidation/recovery path. Never promise exactly-once execution across an external model and database transaction.

Apply the same attempt boundary to ordinary model/support calls as rollout proceeds. Failed schema/admission results retain trace but create no successful domain draft or human authority.

Concurrent final-draft derivation and N6 loop completion writers validate and reuse the winning
receipt, including its original audit references. N7 support and ordinary N8 draft admission also
require their protected internal generation receipts; caller-authored diagnostic payloads cannot
authenticate CLI execution.

CLI gate finalization separately claims `cli-node-commit` by workspace/title/workflow/node/attempt
before preparing or writing admitted domain authority. Only its owner writes; a competing caller
replays a completed result or receives 409 while the commit is unfinished. CLI replay accepts only
protected internal completion traces, including content-bound blocked results, and checks content
integrity and existing authority. Publicly submitted traces cannot stand in for completion.
An interrupted domain writer may have persisted authority before its completion trace: the claim
does not expire, and recovery must inspect that authority before choosing any new attempt. There
is no automatic repair of this ambiguous partial commit. Existing external-output replay remains
separate; no qualified historical CLI product run needs migration while profiles remain closed.

## Migration and operation

Open each Codex slice only with its consumer, prompt/evidence contract, profile admission, output provenance and decisive verification aligned. Preserve historical operator/provider records under their actual source kind. Do not convert completed role artifacts into purported CLI executions.

Other generation providers remain outside activation scope. Existing non-provider meaning (“not the gateway line”) must not turn a paid/account-metered Codex call into a free local operation in continuation/cost policy. Exact configuration, account provisioning and live-run budget are operational inputs, not secrets to record here.

The full-chain operating surface must show the current stage, pending Human decision, failure/recovery boundary and evidence references. It must not depend on canary-only profile changes, direct DB writes or manually authored role outputs. T-129 retirement and affected historical references are reconciled with the explicit obligation dispositions in the roadmap; opening alone changes no runtime protection.


### N7 N8-Debate admission support

The canonical CLI setting at initial/feedback N7 selects only `n7_n8_debate_admission_review`.
The support runtime compiles current frozen candidate/frame/feedback bodies and scoped ResearchSlice
evidence, binds their hashes to the prompt/attempt, and records actual CLI audit provenance. The
harness consumes the setting before executing mechanical N7 with that support. A persisted entry
receipt binds the exact request and current runtime/profile/prompt identity to its generated artifact;
repeat entry can replay the existing gate result without reloading rows changed by that gate. An
unfinished gate still performs normal source and support admission. Other N7 support roles remain
outside this enabled consumer slice, and shipped profile eligibility remains closed pending qualification.


### Exact Human refinement review

At the existing question-checkpoint loopback frontier, the coordinator consumes the CLI spec and
recovers the exact persisted refinement. The same Explorer/Critic/Arbiter sequence receives the
selected candidate/slice, previous and current contracts and answerability plans, scoped evidence,
and verified prior-role bodies. Its packet excludes duplicate handoff/formation logs; role budget
limits are unchanged. Prompt v2 specifies role fields, evidence insufficiency and preservation of
material Critic findings. No role can mutate Human fields.

The deterministic admission artifact is accompanied by `TopicSelectionRefinementDeltaCliDerivation@v1`,
linking the actual three role outputs/audits/traces, original attempt, exact source/delta and runtime
identity. N7 verifies this derivation before accepting support; the diagnostic is not presented as a
fourth model call. CLI and historical external review receipts have separate stable keys. A retry
can fill an interrupted derivation write using completed model attempts; complete source-bound reviews
can be reused across node attempts without relabeling the originating model calls.

The whole review plus final N7 gate shares node/run timeout and existing in-flight exclusion. A
successful substantive review reuses the current contract and reopens a pending Human checkpoint;
material findings block the unchanged delta. Canonical no-op recovery runs mechanically without
model settings or support. Shipped profiles remain closed until qualification.


### N6/N8 evidence and Critic handling

N6 Explorer, Critic and Arbiter and N8 ordinary/conditional Prompt v2 distinguish visible source
content from refs/hashes and model assertions, preserve insufficient/conflicting evidence, and
allow legitimate non-advance outcomes. Production prompt and persisted N6 scenario versions match.
The N6 Arbiter CLI schema requires repair_actions; admission requires unique Critic finding codes
across all instances and exactly one substantive resolution for each material/blocking finding.
Malformed findings and unresolved or ambiguous repairs block. Resolution text is an auditable claim,
not a mechanical proof of scientific correctness; live qualification must inspect the final changes.
N8 requires both assessor repair and final synthesis to retain exactly one nonempty, resolved action
per material/blocking finding; malformed or duplicate Critic identities and dropped final resolutions
block admission even if an intermediate repair passed.

### Bounded qualification tooling

The opt-in canonical harness qualification reuses isolated upstream fixtures and the existing
research-evidence packet owner with versioned original abstracts. It changes only a test-local
profile registry during staging; production eligibility remains closed until real-role evidence is
accepted. Qualification support lives in the harness test's `test-fixtures` helpers, not in the
product configuration or an alternate workflow authority.

One shared file ledger covers all live cases and staging/shipped passes under the explicitly
selected numerical budget. It claims directory ownership before reading accounting, persists a
pending attempt before runner execution, records failures and treats unknown usage conservatively.
Case manifests refuse evidence overwrite; preview writes stay in a separate child directory.
The wrapper permits only App Server, checks remaining budget before a turn, and requests interruption
on observed token exhaustion. Token reporting is asynchronous; this is not a strict billing cap.
Inputs, role outcomes and domain artifacts are retained outside the repository for inspection.
