# Verification

## Current evidence

| Claim / reference | Decisive check | Latest result | Material boundary |
|---|---|---|---|
| Task scope and authorization | User selected full topic-selection Codex task; authorized Phase 5 on 2026-09-10 after Phase 4 closeout | confirmed through Phase 5 | All five phases are verified under the approved scope; Human research decisions remain explicit. |
| CX-01 / coverage inventory | Default registry compared with execution-inventory.md | 36 registered, 36 unique documented profiles | All 36 topic-selection profiles admit product CLI, including all four v1c profiles; stage-level qualifications and public consumer references are recorded below. Phase 5 now verifies whole-flow composition and persisted replay. |
| CX-03 / Phase 3 closeout | Sampling/recovery, extraction/discovery, adjudication/confirmation, convergence and Arena checks; repaired Debate 169–174 and checkpoint-bound source-to-v1b 175–178 | passed with independent semantic, artifact and replay review | Actual model outputs, exact product checkpoint owners and unique frozen lineage; retrieval/readiness and Human inputs remain controlled, JSON/in-memory persistence is not full CLI relational recovery. |
| Runner prerequisite | T-152 code and evidence through beb45cef | inherited transport foundation reviewed | T-152 canaries are not T-153 consumer/model qualification. |
| CX-02 / local composition and quality fixes | N6/N7/N8 runtime/admission, harness, coordinator and v1b HTTP contract suites | 265 distinct checks passed across final relevant runs | Combined run: 264 passed; after the final blocked-replay correction, the full harness passed all 128 checks, including one added case. Includes N6→N7 CLI support→Human stop→ordinary N8, actual N8 feedback→N7→four-role N8 and both N6 regeneration contexts. Fake model process and controlled upstream/Human fixtures; the latest 171-check activation pass uses shipped profile admission for these consumers. |
| Role bodies and deterministic projection | Shared prior-output resolver; canonical CLI replay and derivation checks | passed in the suites above | Explorers receive no peer bodies, Critic receives both; later roles receive verified bodies. Final role is projected with debate_derived provenance and no fifth model call. Source/hash drift is rejected. |
| CX-07 / persistent attempt exclusion | Attempt/orchestrator/runner suites; opt-in relational attempt integration test | 48 local checks and 1 PostgreSQL integration test passed | Four concurrent relational requests execute once; reconstructed consumer reuses completion; ambiguous unfinished claim refuses another call. Unique test artifacts removed in finally; no migration. |
| CX-07 / post-model receipt races | N7/ordinary N8 runtime tests, N6 derived-draft race and canonical two-service test | passed in the suites above | Derived-draft and N6 loop completion reuse validated winning receipts. CLI domain commit claim excludes a second candidate-set writer; retry after completion replays. All reproduced receipt conflicts and duplicate-write findings were fixed and independently re-reviewed. An interrupted domain commit without completion remains fail-closed pending authority inspection. |
| Exact Human delta / CX-02 | Coordinator/harness/refinement tests | 196 passed before final timeout fix; coordinator then 68 passed; directed final recovery 3 passed | Three CLI role calls preserve the exact current contract, produce a separately audited deterministic admission, and reopen pending Human confirmation. Interrupted derivation write reuses completed attempts. No real Human decisions. |
| Timeout and no-op recovery | Delayed refinement runtime test and directed coordinator cases | passed | Whole review plus final N7 gate shares timeout; node_timeout→node_in_flight→settled recovery executes once. Canonical no-op is mechanical. Joint review finding corrected and re-reviewed. |
| Critic objections / prompt contracts | N6/refinement admission evidence, N8 admission/runtime suites and Prompt v2 review | passed | N6 requires unique finding codes and substantive repairs. N8 repair and final synthesis must both retain unique nonempty resolutions; malformed/ambiguous/unresolved findings block. Exact-delta Arbiter cannot drop/downgrade material Critic findings. A resolution label is not proof of scientific correctness. |
| Code/config consistency | Backend no-emit typecheck, llm:config:check, workflow matrix script | passed; config 5 passed | No build or dev server started. Prompt catalog/scenario versions align; all 36 topic-selection profiles admit product CLI; individual qualification boundaries are recorded below. |
| Public consumers | Earlier HTTP/contract/harness and targeted refinement/advance checks | 143 passed, 1 environment skip; targeted HTTP 3 passed | Does not prove real model reasoning or product activation. |
| Qualification preparation | Pinned sources, three canonical N6 request previews, budget/harness tests and backend no-emit typecheck | 3 previews passed; 133 distinct tests passed, opt-in live test skipped | No model calls. The preview covers the first N6 Explorer request, not downstream live execution. This earlier preparation used no model calls and did not itself qualify or activate profiles. |
| Real model qualification / CX-02, CX-08 | Pinned abstract cases through attempt 91 | N6 insufficiency/apparent conflict and exact-delta positive/negative review inspected; ordinary N8 v4 admitted | 2,254,848 reported tokens plus unknown usage from six failed attempts; conditional N8 v5 and both regeneration paths admitted with non-advance; default-profile refinement overclaim reached the correct final-gate refusal. See current evidence below. |
| CX-09 / T-129 transfer | Roadmap obligation table, 36-profile inventory, qualified prompts, runtime gate wording and maintained scenarios/operator docs | reconciled | Codex obligations complete under approved replacement qualification. Original corpus C-2 and provider C-3 are not retroactively completed; other generation providers remain deferred. T-129 physical archival separately awaits worktree reconciliation. |

## Completion re-review and implementation cleanup

The user's follow-up requested implementation review/fixes, task-scoped cleanup, progress sync and
commit/push to main. The review basis is the previously verified Phase 4 checkpoint f4d8866a through
Phase 5 HEAD f49cb838, with adjacent source/admission/persistence owners inspected and the broader
T-153 touched tests rerun. Independent review ran 34 targeted offline checks and found no new
material functional defect. The task regression covers 48 test files: 806 passed, 17 explicit
live/database opt-in skips, zero failures (823 total). Root pnpm typecheck passes shared, backend,
Prisma context alignment and desktop checks. Five LLM config checks, workflow matrix consistency
and whitespace validation pass. No new paid model run or PostgreSQL verification was performed;
the Phase 5 persisted evidence and earlier real-model qualification retain their stated limits.

Cleanup used the 46 linked T-153 commits (166 changed paths) as its task boundary and searched
2,233 tracked/unignored non-task-record files for references and exact duplicates. The current
scenario registry still advertised a removed v1a replay command, its obsolete generated filename
and retired document paths. Those references now point to the maintained tests, typed contracts and
existing operator guide; matrix consistency passes. Two empty owned debug directories,
.ai/.tmp/debug-mode/t153-n8-qualification and .ai/.tmp/debug-mode/t153-n8-stream, were removed after
confirming they contained no files. No task runtime source, schema, test, dependency or data was
removed. There are no untracked task files or remaining task debug artifacts.

Retained contracts and cleanup boundaries:

- v1a/v1b/v1c names are distinct supported lifecycle stages. Assisted/provider/mocked paths are
  explicit compatibility/test contracts; product codex_cli has its own provenance. No unanchored
  parallel execution path was identified inside the task boundary.
- Live/database tests remain opt-in because they protect paid execution and relational contracts;
  a skip is not counted as a pass. Historical isolated CLI canaries retain transport/audit coverage
  and are explicitly distinct from product role qualification.
- Repository-wide dependency/name checks identify desktop-only concurrently and wait-on as unused
  candidates. cross-env remains referenced by dev:electron. No desktop dependency was removed in
  this task-scoped cleanup. The sole nontrivial exact duplicate pair is
  .codex/environments/local.toml and .codex/environments/environment.toml; these are convention-loaded
  application configuration outside T-153, with no established canonical copy, so both are retained.
- The existing app.ts TODO belongs to the explicit T-132 PaperImplementation environment follow-up.
  It is outside T-153 and was not converted into a new task requirement.
- Deep cleanup was limited to T-153 changed paths and relevant owners. Unswept directories include
  .claude/, .codex/, .githooks/, .github/, apps/desktop/, artifacts/, ci/, config/, env/, prisma/,
  research-varify/, ui/, workloads/, and unrelated files under .ai/, apps/backend/, docs/ and packages/.
  These received only the applicable global shallow/dependency/duplicate signals. dev-docs task
  records/archives and ignored data were excluded from deletion; .ai/.tmp was inspected explicitly.

## Phase 5 — complete HTTP composition and persistent recovery

The user authorized Phase 5 on 2026-09-10. CX-06/CX-07/CX-08/CX-09 now hold together with the
Phase 1–4 evidence. No new live model attempt was charged: accounting remains through 216,
4,890,215 reported tokens, 14 unknown-usage attempts and no pending call. Aggregate ceilings remain
removed; each call retains the 600-second deadline. Prior role qualifications remain valid: the
managed-file fix preserves the same scientific bytes, N4 removes only runtime audit duplication,
and the N8 budget change preserves the same prompt/model and requires strict completed-gate replay.

The maintained test `T-153 CLI product HTTP composes managed sources through intake and feedback
without caller role answers` in `topic-selection-v1b-routes.integration.test.ts` uses actual buildApp
owners and controls only the external CLI process. It prepares a synthetic literature source through
public asset, content-processing, dossier and activation APIs, then composes original-paragraph
extraction → need discovery → adjudication → exact Human-confirmation support → frozen v1b input →
N1–N11 with CLI options, four-role N6 and ordinary N8 → four-role risk promotion → N3 → delegated
candidate → exact Human acceptance → bridge → actual ResearchLifecycleService PaperProject intake →
CLI feedback. It makes exactly 16 CLI calls, accepts no caller role answers and uses no generation
gateway. No profile eligibility override or direct database patch supplies progression.

The same test passes with both in-memory and PostgreSQL repositories. PostgreSQL uses a uniquely
owned disposable local database with the complete migration history and all four repository modes
set to prisma. Application reconstruction replays the four upstream CLI nodes byte-for-byte, the
frozen N11 publication and completed intake; rereading the actual PaperProject succeeds and intake
returns its original ID with created=false. N4/N6/support/candidate/feedback replay makes no extra
model call. Missing question Human approval stops before N8; missing promotion reconfirmation stops
before the Human decision. Sampling, optional support, convergence/Arena and non-advancing/loopback
branches retain their separately recorded stage and real-model checks rather than being forced into
this advancing fixture.

Implementation and independent review found and verified these corrections:

- Intake reserves a protected bridge-scoped claim before the actual gateway, whose artifact/metrics/
  timeline writes may fail after project creation. Pending claims block duplicate creation across
  concurrent or reconstructed services. Attached refs remain the completion authority; an attachment
  that succeeds then loses its response recovers the original project without deletion. Actual partial
  creation, attachment loss, concurrency and input drift pass focused checks (checkpoint 50e55008).
- Original fulltext extraction reads the parser-managed file when normalizedText is absent and
  verifies document/paragraph checksums, source/locator uniqueness and containment. Inline/file
  source tests pass; changed or missing files fail before another model call and unselected paragraphs
  remain outside the model packet.
- Ordinary N8's 22k target rejected the composed source-to-question packet (22,687 estimated tokens).
  Its 28k target matches the initial Debate assessor, retaining the 128k window and overflow refusal.
  Historical 22k output replays under 28k only with a successful checksum-valid receipt, exact current
  request/source/prompt/model/runner identity and its protected completed gate. Uncommitted old output
  and changed requests remain refused. All three initial_from_n5 variants pass independent re-review.
- N4's packet duplicated bulky role-audit and admission-identity objects in the dossier. Only these
  audit objects are projected to hashes; every scientific field, Critic resolution, risk, condition and
  lineage remains, and the canonical dossier is untouched. Composed PostgreSQL inputs measure about
  49k estimated tokens, below the existing 64k target. The HTTP test asserts the exact projection.
  Final upgrade review also reproduced the resulting old-candidate context mismatch before fixing
  it: generation recovery and Human admission read the protected original context, validate checksum
  and exact scope/node/gate identity, then reuse its original bytes only when the old and current
  contexts have identical audit projections. Original evidence and audit changes still fail. Old
  preview receipt interruption, first Human acceptance, completed replay and an unpersisted model
  outcome are covered; the ambiguous outcome cannot trigger another call after upgrade.

| Decisive Phase 5 check | Result |
|---|---|
| Full seven-file regression (v1b/v1c HTTP, source harness, N8/delegated runtimes, context registry, bridge) | 196 passed, 5 opt-in/environment skips |
| After N8 budget-replay repair: complete v1b HTTP, v1b harness and ordinary N8 runtime | 173 passed, 6 opt-in/environment skips |
| Managed inline/file extraction and source/locator drift | 2 passed |
| Final advancing CLI HTTP chain | passed; 16 external process calls |
| Final PostgreSQL chain with application reconstruction | passed; same chain and exact upstream/intake replay |
| Deferred N6/N8 provider gates after wording alignment | 2 passed; 409 before writes |
| LLM configuration / workflow matrix / backend no-emit | 5 passed / consistency passed / passed |
| Scoped T-153 governance sync and lint | preview limited to T-153 status and generated views; apply and lint passed |
| N4 historical context compatibility | red reproduced stable-key mismatch, then 13 runtime/service/attempt checks passed; independent runtime/service/admission run: 17 passed |
| Independent read-only review | all material findings fixed, including N8 and N4 upgrade compatibility |

The disposable database and owned debug journal were removed after the persisted check; no temporary
instrumentation remains. Reproducible commands and persistence setup are in the permanent operator
guide. Local execution logs are under `/tmp/my-researcher-t153-phase2/phase5-*`; maintained tests and
this bounded result are the durable verification record.

Completion contract: outcome closure is supported by the full API chain plus all 36 qualified
profiles; implementation quality by the checks and resolved review findings above; semantic
convergence by the shared policies/configuration, corrected scenario/matrix/gate wording, operator
guide and task obligation disposition. No extra approval is required beyond the user's authorization
through Phase 5; fixtures never impersonate a genuine research decision.

Material limits: managed source/readiness and Human choices are controlled fixtures, not scientific
or investment approval. A partial gateway write may leave an unattached project for authority
inspection; ambiguous domain writes remain fail-closed rather than automatically replayed. The bridge
holds selected evidence and obligations; generic PaperProject creation does not copy its evidence-ID
array into a separate PaperProject evidence record. Downstream PaperImplementation/experiment execution,
full GUI operation, autonomous Human decisions, statistical quality calibration and other-provider
activation are outside the accepted task boundary. T-129 archival is a separate administrative action.

## Phase 4 — v1c qualification and recovery

All four v1c consumers are implemented, qualified and enabled in the default registry. Tests and
qualification use those shipped defaults without v1c eligibility overrides. Ordinary support v4 has exactly six advisory fields; its existing deterministic
owner compiles the ordinary N3 semantic layer. Risk Debate retains its explicit final semantic schema.
N4 compiles original scientific/evidence and actual gate/support/dossier bodies, generates a protected
reviewable candidate, validates its source/decision shape, then accepts only the exact candidate hash
with an explicit Human actor and Human-assigned condition owners. Promote-class additionally requires
reconfirmation. CLI never uses the old ref-only compression fallback. N6 reads the complete working
copy, commitment scope, Human controls and submitted raw report. Its deterministic admission feeds the
existing record-only feedback/recheck owner under the existing persistent domain submission guard.

| Final real check | Attempt / reported tokens | Result |
|---|---|---|
| Ordinary promotion support v4 | 207 / 35,929 | Passed full nine-paragraph original context, support commit interruption/recovery, exact replay and N3. Historical replication, unverified resource assumptions, missing investment value and judgment bias remain explicit. |
| Four-role material-risk Debate v4 | 208–211 / 37,835 + 38,531 + 40,564 + 46,269 | Passed full source, actual prior bodies, critic repairs, exact risk condition group, N3 and support commit recovery without another call. The warning remains unresolved; proposed checks/strata are advisory and not executed observations. |
| Delegated decision v4 | 216 / 54,903 | Against the actual support/gate from 207, correctly recommends reassess_value: structural passage is not scientific investment evidence; archive identity remains unverified. Candidate receipt interruption/recovery, exact replay, wrong-hash refusal and controlled Human non-promote acceptance pass with one paid call. No bridge/commitment is created. |
| Feedback normalization v2 — overclaim | 213 / 24,136 | Correctly classifies unsupported universal/causal claims as overclaim, explicitly treats the report as unverified, records a deterministic recheck, preserves the bridge and replays without another model call. |
| Feedback normalization v2 — no recheck | 215 / 23,807 | Correctly records a format-only report as no_recheck_needed, explicitly retains its unverified status, creates no recheck, preserves the bridge and replays without another paid call. |

Through 216: 4,890,215 reported tokens, 14 unknown-use attempts, no pending attempt and no aggregate ceiling; each call
retains the original 600-second timeout. Attempts 205/206 stopped at the same optional open-object
field after producing the six prose fields, followed by long whitespace streams until timeout.
The six-field ordinary CLI schema/prompt v4 fixes the reproduced boundary and passes 207. No incomplete
JSON is salvaged as success. Attempt 212 (54,907 tokens) substantively recommends reassess_value but
omits mandatory gate/snapshot refs from decision_support_refs (they were present only in cited_refs);
Human admission refuses it without a decision. Prompt v3 names that field rule, and the same semantic
validation now runs before a preview receipt is returned. Attempt 214 timed out while generating the
first reference object before the open nullable legacy_ref branch, followed by whitespace; usage is
unknown and no decision was written. For an allowed manifest containing only absent/null legacy aliases,
CLI now restricts that field to null (prompt v4); nonempty legacy identities retain the original schema
and exact admission. Both schema branches pass focused checks, and the null-only case passes real 216.
The timeout pattern supports the bounded schema repair; it does not establish a general model root cause.
Earlier 200–204 successes used only one
original paragraph mapped to multiple roles and remain preliminary evidence.

Seventeen N4 checks pass, including owner mapping, prompt/source/ref rejection, receipt interruption,
exact Human acceptance and oversized-context refusal before any paid call. N6's eleven runtime/admission
checks pass, including candidate persistence recovery, exact record replay and refusal after an ambiguous
partial recheck write. HTTP composes CLI preview → Human acceptance → deterministic bridge → CLI feedback
with exact replay, and rejects external answers. Independent read-only review found and verified fixes
for N4 lossy compression and duplicate token counting; no open N4/N6 finding remains. Saved ordinary,
Debate, delegated, overclaim and no-recheck artifacts (35 / 68 / 11 / 13 / 13) all have matching canonical payload checksums. Actual model
outputs were semantically inspected; upstream/retrieval and Human decisions remain controlled fixtures.
The final default-registry plus complete v1c unit/HTTP run passes 208 checks, with one environment skip;
five LLM config checks and matrix consistency pass. Backend no-emit and the focused full-context harness
check also pass. These checks do not establish scientific readiness, investment approval or whole-flow
relational recovery. N4 prompt v4 has real non-promote evidence; promote/condition-owner/reconfirmation
behavior is covered by controlled offline/HTTP checks, not a genuine Human investment decision.

Qualified final profile hashes match the shipped defaults: N4 delegated
`4dc9c6ac030dd16b74ad57aa61525a75d3aa67fa4c0174b79ee106049e2e7784`; N6 feedback
`e12769e83ffbc33b7d125f0376be73c6905937955ec3b6fbbf0fc987d3161af9` (both cases).
Final local evidence lives under `/tmp/my-researcher-t153-phase2/live/v1c_` with run IDs
`ordinary_full_v4_live1`, `debate_full_live1`, `delegated_v4_live1`, `feedback_live1` and
`feedback_norecheck_live1`; these are local qualification artifacts, not shipped runtime data.

## Phase 4 — N6 triage and N7 trial support

The three remaining v1b support profiles are enabled for product CLI. Canonical invocations and
coordinator inputs use the optional `cli_support_slots` field. N6 runs triage only after an actual
semantic candidate refusal. N7 omission preserves admission-only behavior; explicit slots select
only those roles, with grouping on remaining candidates and synthesis after semantic exhaustion.
Technical feedback requires N8 recovery. Human selection and deterministic route authority remain.

Context verifies the full frozen trial chain and reads the actual original contracts, plans,
assessments, memos, input snapshots, evidence and feedback. It removes validated duplicate
bookkeeping while preserving scientific content and ref identity. A common pre-model reservation
rejects changed role selections across old/new receipt namespaces. Completed model roles recover a
missing combined receipt. Historical completed N7 receipts from the 18k context profile replay only
with exact request/runtime identity and a protected, checksum-valid completed gate trace; incomplete
attempts cannot use this compatibility path.

| Final real check | Attempt / reported tokens | Observed result |
|---|---|---|
| Candidate grouping v2 | 192 / 25,383 | Correctly identifies two substantively similar ANCE/TAS-B historical replication candidates; order is a tie-break, not scientific superiority. Canonical N7 gate admits and exact replay spends no extra call. |
| N6 loopback triage v3 | 196 / 36,080 | Actual gate reports two answerability_weak failures from causal architectural questions supported only by archives. Model recommends candidate-level regeneration inside the same slice, preserves conflicting evidence and unverified resources; affected refs pass the unchanged gate. |
| Exhausted-trial synthesis v4 | 197 / 44,836 | Covers both distinct contracts and actual stored N8 assessments, identifies the shared value_not_supported objection, retains source counterevidence and controlled-resource limits; deterministic N7 loops back after exhaustion, with no new contract/handoff. |
| N7 admission over failed history v1 | 199 / 33,695 | Compact tier remains appropriate; the prior ANCE value failure does not determine TAS-B's outcome. Controlled availability and incomplete judgments remain explicit. Canonical selection and replay pass using shipped defaults. |

All use CLI 0.153.4/App Server, gpt-6-astra/high, nine pinned original BEIR paragraphs and a 600-second
per-call timeout, with no aggregate ceiling. The unchanged actual N4 output from 183 supplies the
controlled upstream option portfolio. Human selection, N6 candidate proposals and N8 value judgments
are controlled fixtures; no real research approval, resource inspection or measured experiment is
claimed. N6 qualification composes its real runtime with mixed-fixture gate admission; canonical
opt-in composition is covered separately by offline service/HTTP tests. N7 uses the canonical CLI
entry directly. Each final case replays without another model call. The three staged audit profile
hashes equal shipped defaults exactly; the qualification harness no longer overrides eligibility.

Earlier attempts remain evidence, not final qualification: 193 (45,334 tokens) put long explanations
in failure_reason_codes; v3 fixes code/prose separation. 194 (36,663) and 195 (45,261) generated valid
model JSON but were correctly refused for affected_refs outside their field-specific gate boundary;
triage v3 and synthesis v4 align prompts with that boundary. 198 (33,902) passed its gate but falsely
compared the domain contract_hash with the differently scoped handoff authority hash. The semantic
projection now omits that duplicate internal hash after complete authority/snapshot validation;
199 eliminates the false discrepancy without changing the admission prompt or old completion identity.

Independent read-only review verified original excerpts, target CLI audit/output/receipt/trace hashes,
scientific boundaries and final consumers. Grouping/triage exports have valid JSON checksums for all
39/38 records. The synthesis export contains two existing non-CLI controlled-upstream N8 traces with
optional-undefined JSON checksum differences; target CLI traces verify. Workflow-filtered exports do
not include historical full N7 handoff artifacts, so those handoff hashes were checked by the runtime
but not independently reconstituted from the export. Admission 199 has one analogous non-CLI upstream trace checksum limitation among 44 exported artifacts; its target CLI artifacts verify. The existing recommended_profile_id support field contains an advisory tier label, not a resolved registry profile; actual N8 routing uses debate_level/input_mode. This qualification does not claim that label is a registered profile. This is not full relational recovery evidence.

Relevant runtime/admission, harness/coordinator, registry and API contract suites cover 266 distinct
passing checks, four opt-in qualification skips. The first combined run found one stale test-only
profile override after default activation; removing that override restores the N7 runtime suite.
The final N7 runtime suite and six canonical N6/N7 cases pass against defaults. They exercise complete
ref identity, candidate-only grouping refs, historical body drift, receipt interruption, changed role
selection, old-budget completed replay versus incomplete refusal, and zero triage calls for admitted
portfolios. HTTP advance rejects invalid role arrays before progression and forwards valid opt-ins;
public OpenAPI field drift is fixed. Backend no-emit typecheck, config (five checks), matrix and diff
checks pass. No build/server, database migration or temporary runtime instrumentation was introduced.

Through 199: **4,397,676 reported tokens**, eleven unknown-usage attempts (4, 8, 9, 20, 63, 83, 95,
102, 130, 160, 168), no pending attempt and no aggregate ceiling. At that checkpoint four v1c profiles remained; the final qualification above now closes Phase 4.
Phase 5 was subsequently authorized; current full-flow evidence is tracked at the task head.

## Phase 4 — optional N2/N3/N5 support

Canonical v1b invocations now generate their own CLI support for accepted Human constraints,
deterministic readiness and accepted Human slice decisions. N3 also works through coordinator
advance. N2/N5 remain Human stops; their exact accepted payload is required and is the domain
write source. Optional review does not become a required step or acquire decision authority.

- Context binds actual intake/bundle/constraint/option/plan/handoff bodies and original evidence.
  N3 includes actual open rechecks, accepted risk records and current eligibility; active→expired
  changes the context and deterministic coverage. N5 also includes risks newly accepted outside
  the intake snapshot, preserving their target, status and expiry without applying intake eligibility
  to a slice target. Only duplicate option arrays are removed; portfolio rationale, evidence,
  rejection reasons and reopening conditions remain intact.
- Eight focused CLI cases cover these bodies, all five functional-ref identity fields, exact Human
  boundary checks, caller-relabeled audit refusal, reconstructed-service completion, interrupted
  generation-receipt recovery and concurrent reuse with a single model call. Final combined early
  runtime/admission, coordinator/harness, profile/context registries and v1b HTTP suites passed
  **258 checks**, with three opt-in qualification skips and one unavailable Prisma smoke skip.
  Backend no-emit typecheck, config (five checks), matrix and diff checks passed. Existing domain claims and ambiguous-write refusal
  apply to CLI support. No build, new server, UI change or schema migration was required.
- Qualification uses the same nine pinned BEIR paragraphs and validated locators as N4. Prompts
  are v2, `gpt-6-astra/high`, CLI 0.153.4/App Server, 600-second call timeout, no aggregate ceiling.
  N5 rematerializes the unmodified actual 183 output as a controlled upstream fixture (final-message
  SHA256 `24546627a94fd84183536c3bf12f84ce554624f71b61c0c0fd64509af898812d`); this is not a new N4
  CLI call or a whole source-to-N5 production run. All Human decisions are fixtures.

| Final real check | Attempts / reported tokens | Observed result |
|---|---|---|
| N2 resource gap / controlled availability | 184 / 19,311; 185 / 19,743 | Preserves accepted Human scope and distinguishes unverified resources from controlled assumptions; original BEIR limitations remain explicit. |
| N3 uncovered / covered open recheck | 186 / 19,524; 187 / 20,261 | Uncovered recheck yields deterministic blocked_by_recheck/loopback. Effective Human risk coverage permits ready_for_slice with warnings; neither case claims the open recheck was resolved. |
| N5 selection / request more options, complete portfolio | 190 / 26,460; 191 / 26,193 | Exact Human choice/ref/hash/risk/loopback retained. Selection advances; request-more-options returns to planning without selecting. Reviews preserve historical findings, dataset-specific judgment limitations and controlled archive assumptions. |

All six final cases reconstruct the service and replay without another model call. Their audit
profile hashes exactly equal shipped defaults: N2 `4cbc6409226daa0ddfd3bd1e27e0e18df27ae75eebb069880e794f60a8a59cc9`,
N3 `43a72a8f6c8236da88c52e4103a0c4d7aa9ad93751d4ca1c7c199fd69314550d`,
N5 `64083211371735647a181c37049354c7b2da7ae9bc3dc4d7612442bf0770d6f6`.
The local fixture no longer changes profile eligibility. That checkpoint admitted 29 profiles and
left seven closed; later qualifications above bring the current total to 36. The existing separate provider generation path is unchanged.

Independent read-only review passed the final code, six qualification audits and eight repeated
CLI tests against shipped defaults. Review caught and corrected missing recheck/risk bodies and N5 selection risks outside the snapshot.
N5's first preview refused 26,912 estimated input tokens before model work; its 16k ref-only target
is now 24k after removing duplicate option arrays, preserving original evidence and the actual
portfolio within the existing 128k context window. Earlier calls 188/189 (25,670 / 25,447 tokens)
preserved Human authority but lacked unique top-level portfolio reopening content because the first
deduplication was too broad. The fix retains that content, has a concrete regression test, and is
qualified by 190/191; 188/189 are retained as pre-fix evidence rather than final qualification.

The N5 fixture's upstream N4 `codex_assisted` trace retains the historical JSON/optional-undefined
checksum limitation (one of the 36 exported artifacts). The N5 CLI trace, support output, protected
receipts and audit verify; no all-artifacts checksum claim is made for that mixed fixture export.
The CLI persistence correction does not change historical non-CLI hash semantics. Full relational
CLI recovery and actual research acceptance remain outside these checks.

Through 191: **4,096,522 reported tokens**, 11 unknown-usage calls and no pending attempts.
Private evidence is `/tmp/my-researcher-t153-phase2/live/early_*` and `attempt-184` through
`attempt-191`; offline N5 preparation is under `early-n5-preview/preview/` and is retained only as
qualification/debug evidence. No runtime instrumentation or generated evidence is added to the repo.

## Phase 4 — N4 research-slice generation

The canonical harness invocation and coordinator accept `codex_cli/product` for N4. The runtime
loads frozen N1/N2/N3 bodies and original evidence through the existing packet resolver; complete
nested references, claim ceilings, portfolio disposition and the existing option gate remain enforced.
Protected draft and domain receipts preserve completed output, exact replay and ambiguous-write
exclusion. No model-created option is automatically selected: the next node remains N5 Human.

- Local verification: full N4 runtime/admission, coordinator and harness suites passed **212 checks**
  with two opt-in skips. Seven N4 CLI cases cover original-context compilation, all five reference
  identity fields/nested inventions, missing generation receipt recovery, two-consumer exclusion,
  ambiguous partial domain write, forged external audit, non-advance, JSON admitted/blocked replay
  and coordinator Human stop. Registry suite passed 13 checks; the seven CLI cases are repeated
  against shipped eligibility. Backend no-emit typecheck, config (5 checks), matrix and diff checks
  passed. Public v1b HTTP suite passed 18 checks with one unavailable Prisma smoke skip.
- Source qualification: nine pinned original BEIR v4 S5/S6 paragraphs, 5,198 characters, with actual
  quote/locator validation; fulltext SHA256 `9857965c203b4935ec628a8ff203f3fe6666580d12d12f63607ca618c31b7070`
  and paragraph-array SHA256 `4e78146c033b185700e9afcafd43d6d207d6861e1f13530e9709c7aeaac17f7f`.
  Evidence-role extraction, readiness and upstream Human decisions are controlled fixtures; this
  unit does not claim the Phase 3 source-to-v1b chain was composed into N4.
- Attempts 179 and 180 were correctly refused: v2 mixed authority refs into portfolio evidence;
  v3 selected options while retaining hard blockers. Prompt v4 makes the existing gate contract
  explicit without relaxing it. Attempt 181 retains two parked, blocked alternatives and requests
  evidence expansion with concrete reopening conditions; no option-set or advancing handoff.
- Attempts 182 and 183 use a separate explicit Human test assumption that aligned historical
  ranking archives, qrels, scoring script and workstation access exist. They do not establish actual
  project resource availability. Both outputs retain this distinction and propose bounded historical
  scoring/coverage analyses, without novelty, current-model, causal or corrected-relevance claims.
  Attempt 183 produces a selectable option set and stops at N5 Human; reconstructed service replay
  creates no additional model call or option set.
- Attempt 182 exposed a completion checksum defect: optional `refs: undefined` was hashed before
  JSON persistence dropped it. The original failing checksum is reproducible by restoring precisely
  those three undefined fields. CLI completed/blocked trace content is now normalized at persistence;
  both checksum and blocked stable key use that same JSON value. Public admitted-warning and
  blocked-undefined replay tests reproduce the old failure and pass after correction. The original
  182 failure remains in its raw evidence; 183 verifies the corrected full path. No hash algorithm or
  pre-existing upstream authority identity changed.
- Shipped N4 profile hash `b8d1d30371327540ee2176a1ce54cd44ab42bb178d3a53b0ca16137fafd9d08d`
  exactly matches successful real audits 181 and 183. Prompt v4 rendered SHA256
  `6fff8b46ac4ce694bb398b8694001d4253c29ca320e890c36df0d27dbe488561`.
  Qualification used `gpt-6-astra`, high effort, App Server and the existing 600-second call timeout;
  aggregate limits remain null. Through 183: **3,913,913 reported tokens**, 11 unknown-usage calls,
  no pending attempts. Raw evidence stays under `/tmp/my-researcher-t153-phase2/live/` as
  `attempt-179` through `attempt-183` and `n4_beir_*`; no secrets are added to the repository.

Independent review covers the source/model semantics, actual persisted receipts, complete references,
N5 Human stop and the trace correction. Full CLI relational restart and actual research acceptance
remain outside these in-memory/JSON and controlled-Human qualifications. At that checkpoint the other Phase 4 profiles were still closed; the later qualifications above supersede that activation state;
the early-support qualification below opens three more.

## Implementation quality review

Reviewed `a5263023..f63c256d` and the resulting fixes against the approved through-Phase-2 route.
The primary agent and one independent read-only reviewer inspected the implementation. All findings
below were reproduced before correction and the fixes re-reviewed; no reported finding remains
unresolved. Backend no-emit typecheck and the public artifact HTTP ingress check also passed.

| Issue / consequence | Severity | Status / correction | Decisive evidence |
|---|---|---|---|
| Caller-authored CLI audits or replay traces could claim product execution/completion | Must fix | fixed: N7/ordinary N8 require protected generation receipts; CLI replay requires protected internal completion | Relabeled external audits and public-style forged trace rejected; legitimate admitted and blocked CLI replay preserved; HTTP ingress rejects reserved stable keys |
| N8 final synthesis could discard a material Critic resolution accepted in the repair stage | Must fix | fixed: both repair and final must resolve each uniquely identified substantive finding | Empty, unresolved, blank and duplicate final actions plus malformed/duplicate Critic findings all block; valid four-role runtime still passes |
| Concurrent derived-draft and N6 completed-loop receipt writes could throw a content-conflict error after successful model work | Should fix | fixed: validate and reuse the winning receipt, including its audit lineage | Paused receipt writes and independent consumers reproduce the original failures; four model calls remain four across recovery |
| Concurrent CLI gate consumers could create different N6 candidate sets for the same node attempt | Must fix | fixed: persistent owner claim before admitted domain persistence; uncompleted competing writer gets 409 | Two services share persistence; first domain writer paused, competing caller refused, exactly one candidate-set write; completed retry replays |

The protected-trace change's blocked-replay regression was also reproduced and corrected: an exact
blocked request adds no artifacts, and changing its frozen input is still rejected. Code and fixtures
prove these integrity/recovery contracts, not real model reasoning, statistical prompt quality or
production activation. Automatic repair of an interrupted partial domain commit is not implemented.

## Live qualification inputs and execution

The earlier repository-sample fallback is not suitable: titleCardDemoFixtures.ts contains invented
titles and example.com links. Use the following public original-paper inputs instead. Abstract
pages and exact versions were inspected on 2026-09-09; full experimental details have not yet been
validated. Abstract-level evidence supports a bounded reasoning check, not a novelty or calibration
claim. Source text is now materialized through the existing evidence-packet owner and its source/hash/quote checks. First-Explorer requests for all three cases were inspected without launching Codex; later role requests still require actual preceding outputs.

| Input | Verified source and content boundary |
|---|---|
| DPR | [Dense Passage Retrieval for Open-Domain Question Answering, v3](https://arxiv.org/abs/2004.04906v3): supervised dense passage retrieval is evaluated on open-domain QA benchmarks against BM25. Its reported improvement does not establish universal domain transfer. |
| BEIR | [BEIR, v4](https://arxiv.org/abs/2104.08663v4): a heterogeneous zero-shot retrieval benchmark across 18 datasets; BM25 remains a robust comparator and efficiency/generalization tradeoffs matter. |
| Context placement | [Lost in the Middle, v3](https://arxiv.org/abs/2307.03172v3): relevance position affects performance on multi-document QA and key-value retrieval in the models studied. It is not evidence about every present-day model. |

Proposed controlled research slice: retrieval and context-placement robustness under distribution
shift. Constraints are explicit test inputs: one existing retriever and lexical baseline, fixed
held-out evaluation, no foundation-model training, no assumed access to unavailable data or compute.
All Human accept/reject/refinement fixtures are labeled isolated test decisions, not researcher
approval or scientific labels. Do not write them into a live research project.

| Case | Input difference | Required observation |
|---|---|---|
| Ordinary bounded evidence | Visible source bodies and scoped refs from the three originals | N6 proposes bounded, testable alternatives; N7 support respects the exact candidate; N8 distinguishes evidence from hypotheses and can legitimately decline advancement. No mandatory positive verdict. |
| Insufficient evidence | DPR abstract only; BEIR and context-placement evidence are absent from refs, source assets and role bundles | Roles disclose missing coverage and avoid unsupported cross-domain/context claims. This is a semantic coverage test; missing required source bodies remain a separate pre-call integrity rejection. |
| Apparent conflict | DPR QA results alongside BEIR zero-shot generalization findings | Recognize the different evaluation conditions; do not erase either source or falsely call them a same-setting contradiction. This expected distinction is our inference from the inspected abstracts. |
| Exact-delta review | Same source bundle and a controlled bounded-vs-overgeneralized question delta | Preserve immutable Human fields; carry material objections into admission; no silent rewrite. |

Run ordinary/conditional N8 and N6 regeneration using their actual producer payloads when a live
result provides that route. Do not manufacture successful role output to force the chain. A
controlled supported-domain setup may be used to qualify a later role independently; disclose that
boundary. Inspect actual Critic resolutions, evidence support, failure behavior and prior-role
consumption before accepting a role. Existing deterministic fixtures do not replace this inspection.

The user removed aggregate attempt, token and elapsed-time ceilings on 2026-09-09. Continue with
`gpt-6-astra`, high effort, the isolated product home and App Server. The qualification-only
180-second timeout truncated legitimate Arbiter output; restore the product runner's existing
600-second per-attempt timeout. This changes no shipped runtime default. All cases and
staging/shipped passes share one ledger; retain failed/unknown usage and recorded policy amendments.
No gateway fallback or automatic replay of ambiguous attempts is permitted.

## Prepared qualification entry

The opt-in test `Codex product qualification with pinned research sources` lives beside the existing
canonical harness fixtures. `test-fixtures/topic-selection-codex-qualification-{sources,budget,runner}.ts`
provide pinned abstract loading, a shared durable ledger and an App Server-only runner wrapper.
The ordinary case attempts N6 → N7 → exact Human stop → N8, then uses actual N8 feedback for
conditional Debate when the producer supports it. Admission may legitimately stop earlier. A passed
diagnostic process is not a semantic qualification pass. Exact-delta qualification uses an explicitly controlled N8 trigger and exact Human delta setup; real positive/negative review results are recorded below. The regeneration-gate and regeneration-loopback cases use labelled rejected/exhausted predecessors and retain their canonical projections and owner artifacts. Existing fixture coverage does not substitute for those runs.

| Source | SHA-256 of whitespace-normalized original abstract |
|---|---|
| 2004.04906v3 | `1d92ab3f358bc517ca0fd9d5169dfe04832dadfdb47fd8baf2488f9d9f76fbc2` |
| 2104.08663v4 | `42042f9170192744434569d6330ad1641fad51e3ce96957b2e5617922ef44115` |
| 2307.03172v3 | `9597f645fa2ed241ae31cd867771e71ea15ede9d498117e1d1b409403c10aa88` |

Offline previews contain 3 / 1 / 3 resolved evidence items and 37,318 / 30,263 / 37,621 prompt
characters for ordinary / insufficient / apparent-conflict respectively. Old traceability-slice text
is absent. Upstream readiness, N1–N5 semantic outputs and all Human decisions are explicitly isolated
fixtures. No live retrieval, empirical outcome, verified novelty or real researcher approval is claimed.

Environment inspected on 2026-09-09: `codex-cli 0.153.4` at `/Users/yurui/.bun/bin/codex`;
product home `/Users/yurui/.codex-my-researcher` exists with authentication, but authentication was not
read or validated by a model call. No product-home config file was present. Model/home must be
explicit for this diagnostic; no production configuration was changed.

Temporary source JSON and previews are under `/tmp/my-researcher-t153-phase2/`, outside the repo.
Preview mode always writes in `TOPIC_SELECTION_QUALIFICATION_OUTPUT/preview`, preserving any live
evidence at the output root even when preview and live are invoked against the same root.
Retain them through live-result inspection, then remove them after durable verification evidence is
recorded. If lost, fetch the three versioned abstract pages, extract `blockquote.abstract`, collapse
whitespace, strip its `Abstract:` prefix, and create an array of `{id, url, abstract}`; the loader
requires the exact hashes above. No synthetic substitute is accepted.

From `apps/backend`, repeat a no-model preview with:

```sh
TOPIC_SELECTION_CODEX_QUALIFICATION=prepare \
TOPIC_SELECTION_QUALIFICATION_CASE=ordinary \
TOPIC_SELECTION_QUALIFICATION_SOURCES=/tmp/my-researcher-t153-phase2/sources.json \
TOPIC_SELECTION_QUALIFICATION_OUTPUT=/tmp/my-researcher-t153-phase2/ordinary \
TOPIC_SELECTION_CODEX_MODEL=gpt-6-astra \
TOPIC_SELECTION_CODEX_HOME=/Users/yurui/.codex-my-researcher \
node --import tsx --test --test-name-pattern='Codex product qualification with pinned' \
src/services/topic-selection-v1b-workflow-harness-service.unit.test.ts
```

For authorized live execution, change mode to `live`, set
`TOPIC_SELECTION_QUALIFICATION_UNCAPPED=1` and `TOPIC_SELECTION_QUALIFICATION_ATTEMPT_MS=600000`.
For a capped run, omit uncapped and provide positive integer `..._ATTEMPTS`, `..._TOKENS` and
`..._DURATION_MS`. Use a new `TOPIC_SELECTION_QUALIFICATION_RUN_ID` when repeating a case.
**Every case and staging/shipped pass must use the same output directory and budget ledger.**
Use a dedicated shared live directory, not the separate preview directories. A process lock prevents
concurrent use; a case manifest prevents overwriting prior case evidence. An uncertain pending call
or a leftover lock requires inspection, not automatic deletion/retry. Failed calls count, cached and
reasoning tokens are not double-counted. Unknown usage stays null; a capped run also reserves its
remaining token budget, while uncapped execution does not turn an unknown amount into zero.
App Server setup counts toward the attempt deadline; an expired deadline cannot launch a turn.
Budget arithmetic and preview retention are tested locally; delayed live startup, actual usage
notifications and server interruption remain verification limits until exercised.

Staging changes only an in-memory profile registry for qualification. Set
`TOPIC_SELECTION_QUALIFICATION_SHIPPED=1` for the later no-override product pass, after verified
activation. The stage is included in attempt and evidence names, while the budget stays shared.
Before accepting results, inspect retained exact inputs, outcomes, domain results and control-plane
artifacts; the opt-in runner never certifies scientific quality itself.

The preparation delta after `7c66230a` was independently reviewed. The exec-budget bypass,
post-deadline turn launch, live/preview evidence overwrite and insufficient-case description findings
were corrected and re-reviewed; none remain reported unresolved. Same-directory ledger ownership is
acquired before reading it, failed inspection releases the lock, and repeated live cases cannot
replace retained evidence. Unit evidence: 128 harness checks plus 5 budget/runner checks; the opt-in
live test is skipped by default. The three request previews are separate offline checks.

## Current live qualification evidence

All exact requests, CLI outcomes, manifests and domain artifacts remain under
`/tmp/my-researcher-t153-phase2/live/`. Sources and setup boundaries are defined above. The accounting snapshot through attempt 91 is **2,254,848 reported tokens and six unknown-usage attempts (4, 8, 9, 20, 63, 83)**.
Cached and reasoning counts are subsets, not added twice. The original 915,113-token reservation
for attempt 4 was a conservative accounting charge, not measured spend. Aggregate attempts/tokens/
time are null under the user's amendment; the original product timeout is 600 seconds. Phase 2 qualification is complete; no budget approval is pending. Every retry gets a new identity and files.

The `staging_regeneration-gate_arbiter_resolution_v4` launch also records a private source snapshot: concurrent runner/client edits were uncommitted foreign work at launch. Their 21 focused tests and backend typecheck passed before use; they are not part of the T-153 prompt checkpoint. The snapshot records source hashes without credentials. T-152 subsequently landed the reviewed transport at `beb45cef`; its current 23 runner/client tests passed before the N7-loopback run.

| Case / retained run key | Actual model attempts | Inspected outcome | Evidence boundary |
|---|---|---|---|
| Ordinary N6, `staging_ordinary_arbiter_v3` | 15–18 | Three parked directions; admitted `evidence_expansion_required`; no candidate authority | Attempt 18 cached an early v3 draft before final enum/none-viable wording review. Final v3 is covered by 31/40. |
| Insufficient N6, `staging_insufficient_arbiter_v3` | 28–31 | Admitted evidence expansion; only DPR supplied. Arbiter resolves the material query-level overlap objection by using a common judged-relevant set, independent of retrieved outputs; incomplete judgments remain a blocker | Proposed thresholds are design choices, not published findings. No novelty, resource readiness or statistical quality claim. |
| Apparent conflict N6, `staging_apparent-conflict_arbiter_v3` | 37–40 | Admitted evidence expansion, no authority. Correctly separates DPR QA and BEIR heterogeneous zero-shot settings. Actual repairs remove equivalence claims from intervals spanning zero, audit joint/redundant answer evidence for position experiments, and consolidate overlapping questions into primary/secondary estimands | Two bounded directions remain parked. Same three abstracts, no measured local result. |
| N7 initial and feedback support | 19, 23, 27, 32, 35, 41, 45, 49, 52 | Real outputs respect the frozen question and recommend compact review; exact Human stop checked before controlled confirmation; actual N8 feedback consumed where available | Separate controlled N6 predecessor, explicitly hypothetical resources and Human decisions; no claim of a fully model-generated N6→N7 advance. |
| Bounded exact delta, `staging_fixture_refinement-bounded_exact_v1` | 41–44 (N7 plus three review roles) | `admit_unchanged`; final N7 gate admitted with warnings and reused the exact current contract. Before/after deep equality passed. “Until measured” does not authorize novelty or causal transfer claims | N8 trigger and Human expected_claim-only edit are controlled fixtures. No real research approval. |
| Overclaim exact delta, `staging_fixture_refinement-overclaim_exact_v1` | 45–48 | Critic raised four material/blocking findings; Arbiter retained all and returned `block_with_findings`. Human contract unchanged | Runtime admission refusal proved. This run did not submit the blocked artifact to the final N7 gate; the helper now does so, requiring another actual pass. |
| Ordinary N8 v4, `staging_fixture_ordinary_n8_final_v4` | 49–52 (N7, two N8 assessments, N7 feedback) | Ordinary assessment admitted; operator-requested assessment produced `N8_OPERATOR_FORCED_DEBATE_TRIGGER`; feedback readmitted by N7. Dimensions and total share favorable 0–100 scale, exact citations accepted, evidence recheck recommended | Conditional first assessor blocked before calling the model: estimated 22,064 versus the old 22,000 target. No four-role pass yet. |
| N8 conditional v5, `staging_fixture_ordinary_n8_assessment_v5` | 64–71 | Ordinary assessment → actual operator-triggered feedback → real N7 readmission → four actual N8 roles → `admitted_with_warnings`. Final disposition remains `recheck_evidence_or_search` with novelty/feasibility/evidence failed gates; no research advancement or accepted risks | Independent review checked all prior bodies and hashes, exact refs, final role → `artifact_ref_221` → assessment projection `artifact_ref_222` → business gate. Critic findings were notes only; no new real material-finding repair claim. Controlled N6/Human setup and staging registry remain explicit. |
| N8 conditional v4, `staging_fixture_ordinary_n8_context_v4` | 56–63 | Ordinary N8 admitted, operator trigger and real N7 feedback consumed. First three conditional roles completed with exact prior bodies. Critic/repair exposed assessment-versus-research blocker confusion; repair preserved actual deficiencies and corrected judged-recall wording and double-counted risk | Final role timed out at 600 seconds, usage unknown. No final draft/admission; bounded Prompt v5 now requires assessment defects to be resolved while retaining research deficits in hard gates and non-advance. |
| Default N7-loopback regeneration, `shipped_regeneration-loopback_default_v4` | 84–87 | All four real roles ran under the default registry; final N6 gate admitted `expand_evidence` with no authority/handoff. Empty final candidate list retains both historical directions, unverified contribution/resources, explicit domain-shift requirements and reopening conditions | Controlled exhausted predecessor; no profile overrides or real Human approval. The model does not confuse evidence deficits with permanent nonviability. |
| Default exact overclaim, `shipped_fixture_refinement-overclaim_default_final_gate` | 88–91 | Real N7 support plus Explorer/Critic/Arbiter. Four material/blocking findings preserved; `block_with_findings` reaches final N7 refusal: “The exact refinement delta is blocked by its one-pass Debate; a new Human refinement hash is required.” No authority, Human contract unchanged | Controlled upstream/N8 disposition/Human delta. Existing error code is `N7_REFINEMENT_DELTA_DEBATE_BINDING_MISMATCH`; message and validated binding distinguish this intended semantic refusal from a wrong-binding failure. |
| N6 N7-loopback v4, `staging_regeneration-loopback_arbiter_resolution_v4` | 80–83 | Both Explorers and Critic consumed the exhausted predecessor and scoped evidence; Critic identified unspecified domain shift and relevance-versus-answer-support confounding | Arbiter timed out at 600 seconds; no draft or authority, usage unknown. Fresh default-profile retry uses a new run identity. |
| N6 gate regeneration v4, `staging_regeneration-gate_arbiter_resolution_v4` | 76–79 | All four roles completed; final draft admitted with `expand_evidence`, no authority/handoff. Restores empirical questions, parks all three as `not_answerable`, retains blockers/reopening conditions and recommends none. Corrects the unsupported BEIR-versus-BM25 comparison | Independent review confirms both findings actually addressed, 79 exact frozen refs, failed/prior body hashes, final-output projection and business-gate provenance. Controlled trigger; staging profiles, no research readiness claim. |
| N6 gate regeneration v3, `staging_regeneration-gate_arbiter_context_v2` | 72–75 | All four roles completed with exact failed-draft and prior-role body/hash lineage. Arbiter retained three `not_answerable/parked` empirical candidates, no recommendation and `evidence_expansion_required`; corrected abstract-only substitution and position-control design | Admission blocked because the still-unverified resources were marked `resolved=false` despite correct non-advance. No derived draft or final business gate. Independent review verified 79 final refs and actual repairs; Arbiter v4 now clarifies disposition-layer resolution. |
| N6 gate regeneration, `staging_regeneration-gate_bodies_v1` | 53–55 | Both Explorers and Critic consumed the failed original body. Critic correctly identifies that replacing an empirical contribution with an abstract-level assessment does not repair the original answerability gap, and that paired observations alone do not identify mediation | Arbiter blocked before model work: 26,559 estimated input versus old 26,000 target. No regenerated draft or authority. |

The independent reviewer inspected attempts 37–48 and their preceding bodies: actual role outputs
match the next roles' supplied bodies; the N6 repairs are substantive; bounded-delta admission is
reasonable; the overclaim findings remain supported and undowngraded. Independent inspection of N8 50/51 also confirmed all 34/36 references match their respective admissible lists and totals 53.3/52 match the stated nine-dimension means. No material semantic finding
remains for these bounded cases. This is limited role evidence, not a calibrated model evaluation.

## Verified corrections and retained incidents

| Finding | Current correction / verification | Remaining limit |
|---|---|---|
| N6 v2 omitted the gate's portfolio contract; canonical attempts 11–14 completed but blocked `N6_SELECTED_PORTFOLIO_INVALID` | Arbiter v3 states one selected recommendation, grounded dispositions, non-advance enums, exact ref versions/boundaries and falsification requirements. Per-role prompt drift checking replaces the Explorer-wide version assumption. 30 N6 runtime/admission and five config checks passed; final wording inspected in 31/40 | No forced advancing verdict or weakened candidate gate. |
| Native account tools were available despite read-only sandboxing | Both transports disable native Apps/shell/browser/computer/image/multi-agent/plugin/skill-discovery/hook features and web search. Policy is in execution identity; stale-policy replay rejects. Real 21 refused a harmless external-file read; real 26 completed one scoped product MCP canary read and both tools. 51 runner/client/orchestrator checks passed | CLI 0.153.4 bounded capability evidence, not a universal future-version guarantee. Canary and ephemeral server removed. |
| N8 cited evidence-body v1 instead of exact frozen null identity (24/25 blocked `N8_UNKNOWN_VALUE_TRACE_REF`) | The existing `n8KnownRefs()` owner supplies `admissible_citation_refs`, entering context hashing. All 37 ref occurrences in 33 match; real 50/51 admitted with exact identities. Redundant N7 handoff payload/refs removed only after full validation; scientific bodies and required projection retained. 35 N8 checks and canonical regression passed | No new citation authority or permissive version rewrite. |
| N8 mixed 0–5 dimensions with a 0–100 total | Ordinary/memory v4 and bounded v5 prompts use favorable 0–100 dimensions/total and 0–1 confidence. Real 50 has 25–90 dimensions and 53.3 total, explains equal weighting and uncertainty; real 51 also respects the scale. Six value-runtime and five config checks passed | Existing deterministic thresholds unchanged; no automatic rescaling or C-1 calibration claim. |
| Full N8 context exceeded old role targets | Four conditional-role input targets are now 28k / 32k / 36k / 48k; ordinary N8 stays 22k, model window 128k and all compression/admission gates remain. Actual Critic v3 input was 24,829; rebuilding with v4 gave 25,002. First v4 assessor input was 22,064. 21 profile/token/N8-runtime checks passed | Actual v4 draft/Critic/repair fit; final timed out. All four v5 roles and semantic admission completed; larger requests may legitimately require compression/block. |
| N8 role-slot declarations and CLI operating note lagged integrated consumers | Four bounded-debate slots now declare CLI consistently with the existing runtime; the matrix follows those slots. The execution note now separates model-result reuse from domain replay, documents native tool policy, and distinguishes deferred gateway activation. Matrix check, 34 shared schema tests and backend typecheck passed | Slot alignment alone does not establish qualification; the later explicit 11-profile activation is verified separately. |
| N8 Critic confused unresolved research deficits with defects in the assessment | Bounded Prompt v5 defines material/blocking findings as assessment defects and `resolved` as the actual correction, never proof of new resources/novelty. Real 62 retained the external deficiencies and corrected assessment wording/score but was honestly unresolved under v4. Independent prompt review, 34 N8 runtime/admission tests, five config checks and backend typecheck passed | Real v5 68–71 completes the non-advancing assessment. Critic notes require no repair actions, so this does not add real material-finding resolution evidence. Deterministic per-finding repair/final checks unchanged. |
| N6 non-advancing portfolio was blocked by ambiguous finding-resolution meaning | Arbiter v4 requires correction or exclusion of all affected candidates from selection/recommendation, preserving answerability limits, blockers and reopening conditions; catalog and scenario versions align. 30 N6 runtime/admission tests, five config checks, matrix consistency, backend typecheck and independent re-review passed | Real gate-regeneration 76–79 admitted after substantive material-finding correction; Default-profile N7-loopback 84–87 also admitted without authority. Per-finding admission is unchanged. |
| N6 regeneration had hashes but no failed question body | Resolver now loads the hash-bound failed draft or immutable generating draft through the frozen N6 handoff, plus N8 feedback and failed-trial synthesis. Candidate status changes during trials, so current rejected records are not mistaken for immutable original content. Research-context hash binds the resolved bodies. Two canonical regressions went red→green, with drift rejected before model work; full harness 128 passed (one opt-in skip), backend typecheck and independent re-review passed | Arbiter target now 36k after the actual 26,559-token preflight; Explorer/Critic remain 22k/24k, refinement unchanged. 25 profile/token/N6-runtime checks and independent review passed; real gate-regeneration 76–79 admitted; default-profile N7-loopback 84–87 also admitted. |

Regeneration previews now include the exact failed question, claims and answerability body plus the
three original source abstracts (49,405 / 52,024 rendered characters). Their setup is controlled and
the model calls remain real. `qualificationWorkflows` also exports the dynamic N7 feedback owner
artifacts rather than only a copied projection. The qualification cases are `regeneration-gate` and
`regeneration-loopback`; a new run ID and the same shared live ledger are required.

Retained timeout evidence:
- Attempt 4 (`01a084ee-18a4-7710-b8ff-7da33de3fbe2`) had a WebSocket reset and internal retry before
  180 seconds. Attempts 8/9 also timed out at 180 seconds; diagnostic 9 still emitted normal final
  JSON at 179.84 seconds. Saved-input diagnostic 10 completed in 265.787 seconds with the original
  600-second timeout (31,768 input + 8,588 output; final SHA-256
  `842fa6f22925611db1fb6ae260068bafaadc6ca3feca3b9d9b26c5daa75784fe`). It is not domain admission.
- Ordinary N8 attempt 20 (`01a0852d-2d45-7e21-bc4c-b9482fe4779f`) exceeded 600 seconds without a
  recorded cause. Saved-input diagnostic 22 completed in about 211 seconds with 27,287 + 6,871
  tokens, recommending evidence recheck; that diagnostic was not admitted by a consumer. Attempt
  34 succeeded in 590.30 seconds. Slow output alone does not establish a stalled model.
- N6 loopback Arbiter attempt 83 also exceeded 600 seconds without a final output or usage; the consumer rejected the run.
- Final N8 attempt 63 exceeded the original 600-second timeout; no final output or usage was retained. Its input already contained unresolved v4 repair actions, so no four-role admission is claimed.
- Temporary streaming instrumentation and journals were removed. Private authentication contents
  were never read. Failed calls and unknown usage are retained; no transport-reliability claim or
  automatic retry of ambiguous domain commits follows from the successful runs.

The default-registry change passed 171 focused tests (one opt-in skip), backend typecheck, matrix consistency and independent activation review. CLI replay/body/refinement tests now use product defaults; the new registry check proves exactly 11 eligible profiles and keeps the rest closed. No-override real regeneration 84–87 and final-gate overclaim 88–91 passed. Seven retained N7/ordinary-N8/bounded-N8 CLI audits from the successful v5 chain have profile hashes exactly matching the current defaults; together with the default-registry composed tests, no repeat of that paid chain is needed. Independent review confirmed both final live cases and their body/binding/derived-output provenance, with no unresolved findings. The opt-in refinement helper now asserts all 16 context bindings plus workflow/policy/refinement identity before final gate outcomes; identical assertions passed against the retained positive 41–44 and negative 88–91 results.

## Phase 2 closeout

CX-02 and the Phase 2 portions of CX-06/CX-07/CX-08 hold: real semantic outputs, default admission,
canonical composition, deterministic projection, Human stops and recovery are covered together.
Code and operating/matrix documentation open only the 11 proved profiles. Qualification proves
bounded behavior with the pinned abstracts and disclosed fixtures; it does not prove empirical
results, actual resource access, statistical accuracy, calibrated thresholds or genuine Human approval.
The six unknown-usage calls remain in the ledger. Other generation-provider Debate remains dormant.

## Phase 3 first implementation unit

Resource sampling accepts an explicit CLI execution spec and resolves eligibility/runner before
creating a sample. App composition reuses the existing runner. Successful batches retain actual
Codex model identity, invocation audit and trace; CLI timeout stops that batch without retry or
provider fallback. The existing classification prompt, deterministic filters and provider retries
are unchanged. At that initial checkpoint, sampling CLI remained closed.

The consumer test first exposed three unintended provider calls for a CLI request, then passed after
routing was consumed. The timeout test first exposed three CLI calls, then passed with exactly one.
All 29 sampling service/HTTP tests and backend no-emit typecheck passed; independent review of the
five-file implementation against `331cda82` found no unresolved issues. Tests use a fake process and
an explicitly local profile override, not a new real-model qualification. Those pending items are addressed by the qualification below.

## Phase 3 sampling qualification and recovery

- Stable `execution_spec.submission_id` claims prevent duplicate paid work and reject request drift.
  A persisted prepared sample/items/audit can recover a failed domain transaction or replay after
  service reconstruction, even when the candidate pool has changed. Preparation not completed is
  fail-closed: an explicit new submission ID is required. No automatic ambiguous model retry.
- Concurrent submission/recovery, restart, domain-write failure and scope-corruption cases pass
  through the public service. These tests use InMemory repositories; PostgreSQL concurrency is not
  claimed for this new sampling wrapper. The underlying stable-key/transaction constraints were
  independently reviewed against the existing Prisma repositories.
- Real App Server attempt 92 returned a malformed title-card reference. Manual content inspection
  invalidated its initially passing harness result. Full batch reference validation now blocks altered,
  duplicate, unknown or missing references; the fault-injection test first failed, then passed.
- Attempt 93 (`sampling_qualification_v2`) passed with gpt-6-astra/high, unchanged production prompt,
  the three pinned original abstracts, exactly one model invocation and no provider call. Complete
  references held; DPR/support, BEIR/baseline and Lost-in-the-Middle/challenge yielded `ready`.
  The same real result recovered after a simulated domain-write interruption, then replayed without
  another model call. Isolated literature setup is not a production research run or Human approval.
- Raw source/input/outcome/sample/audit/trace evidence remains private under
  `/tmp/my-researcher-t153-phase2/live/`. Attempt 92 used 11,412 tokens; attempt 93 used 11,472.
  Cumulative ledger: 93 attempts, 2,277,732 reported tokens; six historical calls still have unknown
  usage. Aggregate limits remain null and each call retains its 600,000 ms deadline.
- Independent review against `0336fb58` found two test issues (HTTP missing submission ID and source
  metadata indexed by position); both fixed. Backend no-emit typecheck, LLM configuration (5 tests), and focused sampling/registry/
  HTTP checks (46 passed, 1 opt-in skip) cover the enabled default profile. No sampling prompt change or other provider activation.


## Phase 3 extraction and need-discovery integration

- Canonical v1a HTTP contracts and app wiring now reach the shared CLI runner. Server compilation
  binds original AbstractProfiles to their actual source ID/URL/checksum and frozen SearchRun; quote,
  locator, mixed-execution and executor-kind guards fail before inappropriate authority writes.
- Full need-discovery output references, including empty-portfolio reasons, pass the existing batch
  validator before routing. A fault-injection test first accepted a forged version, then passed after
  the guard. Source mismatch, invented quote, same-ID drift, concurrent submission, completed replay
  and failed completion receipt are covered through the public service. Unfinished node claims refuse
  duplicate model work; automatic partial-domain repair is not claimed.
- Latest local checks: 159 affected service tests passed (one opt-in skip), 22 registry/v1a HTTP tests
  passed, 21 shared contract tests passed, backend no-emit typecheck, five LLM configuration checks
  and matrix consistency passed. The public CLI and final-reference checks also passed after activation.
  Independent review against `ddae15a3` closed source pairing, mixed ingress,
  full portfolio refs and final prompt/scenario version drift. No known code-review issue remains.
- Extraction prompt v2 clarifies compiled original-abstract source/locator and producer provenance.
  Need single-agent v4 and final v3 distinguish a completed non-advance portfolio from a technical
  block, require empty candidate dispositions when no draft is selected, and specify full nullable
  reference fields. Explorer/Critic/framing v2 echo the exact supplied role identity; Critic receives
  both actual Explorer bodies and parent IDs. Prompt catalog and scenario versions match.
- Live evidence remains in the shared private ledger. Attempts 94/96/98/100 extracted exact DPR
  quotes with abstract-only warnings. Attempt 95 timed out at 600 seconds while emitting whitespace
  inside a reference, usage unknown. Compact-output guidance is a mitigation, not a transport fix.
  Attempt 97 completed but failed the portfolio/terminal semantic gate. Attempt 99 correctly requested
  evidence expansion but a too-narrow reference allowlist rejected its real context-artifact citation;
  actual node-context refs are now included. Attempt 101 passed single-agent schema/admission/routing
  with `expand_evidence`, no candidate persistence, no provider calls, and exact receipt replay.
- Attempt 102 timed out with unknown usage; 103 completed with guessed role identity. The loop now
  supplies and validates exact identity and stops after the first required worker fails. Attempt 105
  used candidate dispositions for rejected ideas in an empty batch; prompt guidance now matches the
  unchanged minimum-schema constraint. These unsuccessful runs do not count as qualification passes.
- In v6, attempts 106–112 all completed and single-agent admission/replay passed. Independent
  inspection verified all five Debate outputs against raw outcomes and all 44 refs against actual
  inputs. Critic addressed the six actual proposal families and final retained their main limits.
  The adapter still blocked because its reference allowlist omitted consumed summaries/issue frame.
  A red/green adapter test now admits those exact refs and still rejects unknown, changed-version and
  final self-references; v6 itself remains an unsuccessful end-to-end qualification.
- `upstream_qualification_v7` passed the corrected full consumer: attempts 113–119, three live test
  checks, single-agent and Debate `expand_evidence`, exact reconstructed-service replay with no new
  model calls. Independent review verified 52 output refs, source/role bodies and receipt owner/hash
  identity. Lost in the Middle (`TOPIC_SELECTION_QUALIFICATION_SOURCE_ID=2307.03172v3`) is the second
  case, which states an observed limitation unlike DPR's reported achievements.
- `upstream_lostmiddle_v1` passed attempts 120–126 and all three live checks. Extraction preserves the
  exact original abstract and abstract-only warning. Explorers propose bounded positional reliability,
  usable context, task-transfer and repair questions. Critic challenges prior-art overlap, unspecified
  thresholds, unsupported transfer, present-day applicability and repair feasibility; framing and
  final retain these concrete limits. Both executors complete with `expand_evidence`, no candidate
  persistence, no provider work and exact reconstructed-service replay without new model calls.
  Independent review verified all 46 output refs and original source, role-body, receipt and audit
  lineage, then reviewed the six-profile activation. No known blocking finding remains.
- The six extraction/need-discovery profiles are now default-enabled for `codex_cli/product`; final
  remains closed to `codex_assisted`. All six real audit profile hashes from both cases equal the new
  defaults. The registry test admits exactly those 18 profiles: the 36-profile topic-selection subset
  has 18 enabled/18 closed; the full registry also contains 15 closed PaperImplementation profiles.
  Both the live helper and local public-CLI test now use defaults without eligibility overrides.
  The public HTTP contract reaches the
  configured-runner requirement and rejects mixed execution. No canary override is needed in product.
- These cases demonstrate normal exploration of a documented limitation, insufficiency and substantive
  Critic challenges to actual proposals. They use isolated N1–N4 fixtures, actual pinned source text
  and actual models, with no real Human approval. Neither case admits a candidate: real candidate
  admission/persistence, sufficient multi-source research evidence and cross-process upstream database
  recovery remain unproved. They are not statistical quality evidence or whole-Phase-3 acceptance.
- Through attempt 126 the shared ledger has 2,757,959 reported tokens plus unknown usage in attempts
  4/8/9/20/63/83/95/102, with no pending calls. The two successful complete cases used 14 model calls
  and 214,272 reported tokens; exact replays added none. Aggregate ceilings remain absent, the
  per-attempt timeout stays 600 seconds, and no provider fallback or hidden retry was introduced.
- Temporary debug journal removed; no runtime instrumentation remains. Default-profile public CLI
  verification and backend typecheck passed after cleanup.

## Phase 3 adjudication and Human-confirmation support

- Canonical v1a N7/N8 product CLI entries share the configured runner and whole-node submission
  owner. No supplied model answers, fixture Human acceptance or caller adjudication actor are
  accepted. N7 uses `llm` actor authority, reads the frozen support packet's original source bodies,
  strength assessments and conflicts, and validates all output references before domain admission.
  N8 binds the exact supplied Human input; schema/lineage/risk/check gates retain their owners.
- Compilation preserves source excerpts through compression. CLI token estimation now counts actual
  message bodies once instead of also charging the duplicate serialized context. The 18,000-token
  N7 target and provider estimation remain unchanged; the first live helper stopped at this budget
  gate before a model call. A long-source and forced-compression public test covers this boundary.
- Original source: Lost in the Middle, arXiv `2307.03172v3`, section 2.3 Results and Discussion,
  `https://arxiv.org/html/2307.03172v3#S2.SS3`. The normalized 2,882-character section is pinned at
  SHA-256 `137142ef95c94e507f94143696032678652f761aa8fa2fdcaa1493d2d9285e21`.
  Candidate/readiness fixtures reuse this same original section in four evidence-role slots; they
  do not establish independent support, full prior-art coverage or efficacy of a proposed repair.
- Actual N7 attempts 127/128 (`validation_v2`) passed: the bounded evaluation need recommends
  `validate` with residual risks and mandatory Human checks; the fine-tuning-eliminates-position-bias
  overclaim recommends `return_to_candidate`. Original text, all 18 output refs, audit body/hash and
  receipt ownership/checksums were independently verified. Replay adds no model calls.
- N8 uses a separately controlled prior adjudication and fixed Human inputs, not the natural
  continuation of real N7. Attempt 129 recognizes explicit check/risk acceptance; attempt 130 times
  out at 600 seconds while generating whitespace inside a reference. It has unknown usage, no
  semantic review and no HumanDecision/ValidatedNeed; it is not a negative semantic qualification.
  Prompt v2 requests compact JSON and exact complete references without changing decision authority.
  This mitigates the observed generation failure; the underlying model/transport cause is unproven.
- Review found absent `expectations.status` left `expected: undefined` in N8 assertions: hashing
  included it but JSON storage removed it, invalidating trace/receipt checksums. Public-service
  tests first reproduced receipt failure, then trace failure through a JSON repository boundary.
  Assertions now omit absent values; the shared submission owner normalizes results to their JSON
  shape before hash/write/return. Both failures pass after the fix. Historical 129–132 receipts are
  retained unchanged and only their valid semantic outputs count; they are not persistence passes.
- Corrected actual runs: `validation_v4_positive` (133) reaches `ready`; three consecutive
  `validation_v4_incomplete_1/2/3` (134–136) each produce an actual semantic review, stop without
  HumanDecision/ValidatedNeed, and preserve missing-check/risk reasons. All four run with JSON
  artifact persistence, validate every persisted artifact checksum and replay through a reconstructed
  service without another call. These are repeatability checks, not statistical quality estimates.
- The two qualified profiles are now enabled by default for `codex_cli/product`; the helper and
  public tests use the default registry. The 36 topic-selection profiles now have 20 enabled/16
  closed; all 15 PaperImplementation profiles remain closed. Exact real profile hashes match defaults.
- Checks: 130 harness/runtime-binding tests passed (two opt-in skips), including 11 focused N7/N8
  authority/recovery checks. Full-reference forgery/version/scope drift, manual/unreadable sources,
  risk deletion, high-risk Human gates, concurrent claims, input drift and interrupted receipt
  storage are exercised. Backend no-emit typecheck, five LLM configuration checks and matrix
  consistency passed; 22 default-registry/HTTP checks and 12 default-profile public CLI checks
  passed after activation. Independent review closed the JSON finding and verified all 44 artifacts
  from 133–136, exact profile hashes and semantic outcomes; no known issue remains unresolved.
  Attempt 135 returned a model warning, with missing coverage correctly blocked by deterministic gates.
  The temporary debug journal was removed; no runtime instrumentation remains.
- Through attempt 136: 2,874,054 reported tokens and unknown usage in 4/8/9/20/63/83/95/102/130;
  no pending calls. New attempts 127–136 used 116,095 reported tokens plus attempt 130's unknown
  usage. Each attempt retains 600,000 ms; aggregate attempts/tokens/time remain null, one shared
  ledger, no provider fallback or hidden retry. Private raw evidence remains under
  `/tmp/my-researcher-t153-phase2/live/`.
- These checks do not prove real candidate admission from discovery, actual Human approval, app
  checkpoint integration or a complete fresh upstream-to-v1b product chain. The checkpoint-bound
  composition below supplies the later lineage evidence, while retaining the Human-fixture boundary.

## Phase 3 evidence-convergence qualification

- Product CLI now runs the three existing linked-round roles without caller-authored outputs.
  Integration composes existing managed-library retrieval, exact claim admission, material delta,
  successor publication, source-packet resolution, Arena claim/roles/transcript and Human checkpoint.
  Arbiter consumes both actual independent first-pass bodies; output role and complete references
  are admitted before persistence/exposure. Failed required work stops subsequent calls.
- The public pilot uses real InMemory owners and JSON artifact serialization, an external CLI
  process boundary, and controlled retrieval/readiness/Human-loopback fixtures. It exercises missing
  retrieval, stale retrieval and provider failure without fabricating a successor; two competing
  consumers, exact reconstructed replay, mixed ingress, wrong role/ref, timeout and interrupted
  transcript write preserve their respective stop/recovery boundaries. No relational concurrency or
  actual Human decision is claimed by these new tests.
- Red/green checks exposed the former requirement for caller role output, acceptance-only internal
  audit admission and the unequal treatment of null versus missing optional ref versions; all were
  corrected before successful CLI composition. Independent review then found missing post-execution
  budget evaluation. CLI roles now recheck standing policy after each return and before terminal
  publication. At 299,999 ms the next role return stops after one call; when a round raises the count
  from three to four, all three model results are retained but no new checkpoint is created. Both
  exhausted outcomes replay exactly without additional model work. Existing policy values remain.
- `convergence_v1` (137–139) passed source/role/admission/replay with three actual models. Independent
  review verified all 12 full references, source hashes, both consumed first-pass bodies and 30
  artifact checksums. Its test clock recorded 75 ms, so this case is only semantic/composition
  evidence, not real elapsed-time verification.
- Corrected `convergence_v2` (140–142) uses actual wall-clock accounting: 64,867 ms in the linked
  round, three successful App Server calls, `linked_round_completed`, Arena
  `evidence_expansion_required`, and an undecided Human checkpoint. The pinned original Lost in the
  Middle section and source hash are the same as the N7 case above. Models retain positional-QA
  findings and explicitly refuse unsupported distribution-shift repair, independent coverage and
  sufficient-evidence conclusions. The Arbiter preserves both first-pass limitations.
- Live qualification has controlled retrieval results/index readiness, an initial map with fixture
  claims, and a fixed Human loopback. Only the admitted challenge section supplied to the roles is
  original source evidence resolved through the real repository parser. It does not establish live
  corpus retrieval quality, real Human acceptance, sufficient research evidence or end-to-end
  candidate discovery/admission. The generated advisory does not override deterministic gate policy.
- The three profile hashes match defaults and are now product-CLI-enabled, bringing topic selection
  to 23 enabled/13 closed. Tests and the opt-in helper use defaults after qualification. The shared
  core's existing v1b N6/N8 and v1c bounded/divergent checks passed all 35 tests. Forty affected
  registry/HTTP/convergence/Arena checks passed (one live skip), backend no-emit typecheck, five LLM
  configuration checks and matrix consistency passed. Final independent evidence review passed:
  all 30 artifact checksums, 12 full references, output/audit/profile hashes, prior-role bodies and
  parent/delta lineage agree. Actual 64,867 ms accounting and three successful calls were verified;
  no unresolved code finding remains after the boundary correction.
- Through 142: 2,958,467 reported tokens; the same nine historical calls have unknown usage, with
  no pending call. Convergence attempts 137–142 used 84,413 reported tokens. Shared aggregate limits
  remain null and each model call retains its 600-second deadline. The standing product convergence
  limits are separate from this qualification ledger. Private evidence is under the same live path.
- This convergence-only check does not establish fresh candidate-to-v1b lineage; that evidence is
  recorded in the checkpoint-bound composition below.

## Phase 3 optional Arena qualification

- The shadow product endpoint now accepts CLI role preparations without supplied answers. Actual
  candidate bodies and independently resolved original packets feed the existing two profiles;
  complete reference/role/schema admission precedes domain writes. CLI executes serially, retaining
  actual audits and stopping the next role on failure. Exclusive Arena claims and JSON completion
  receipts protect competing consumers and exact reconstructed replay.
- Local composition uses real services/InMemory repositories with JSON artifact storage. It checks
  missing-runner and mixed-input refusal, source drift before calling, wrong full reference, timeout,
  two-consumer contention, complete replay and receipt-write failure after domain synthesis. The
  last case intentionally requires inspection, with zero new model work. The InMemory test exposes
  its persisted candidate-projection join to match the production database transaction; this alone
  is not relational recovery evidence.
- One existing local Prisma integration test passed with an added two-consumer claim before
  candidate synthesis. It verifies one claim, claimed-session synthesis and candidate advisory
  persistence, plus concurrent gap-checkpoint recovery. Its nonce-scoped records were removed by
  the test. No schema/migration or development-server changes were needed.
- Attempt 143 produced source-grounded Scout reasoning but combined a provisional proposal with
  `selected`; the existing set-outcome guard rejected it and stopped the Killer call. Scout prompt
  v4 now states that a proposal requires `reframe_required`; Killer v3 retains complete refs and
  independently named findings. This historical attempt is not a successful Arena qualification.
- Attempts 144–145 (`arena_v2_live`) use the pinned DPR, BEIR and Lost in the Middle abstracts,
  and controlled bounded-position versus universal-repair candidates. Both roles retain unresolved
  protocol-level prior-art overlap. Scout drops the unspecified universal mechanism; Killer parks
  it because absent evidence is not disproof. Deterministic synthesis preserves this disagreement,
  both candidates are parked, the outcome is `evidence_expansion_required`, and Human remains pending.
- Attempts 146–147 (`arena_v2_live_insufficient`) contain only the original DPR abstract. Both roles
  explicitly note that it contains no passage-position experiment and cannot support a comparative
  winner or universal guarantees. Their different specification-failure versus insufficient-evidence
  judgments are preserved. Both complete with exact zero-call replay and an undecided checkpoint.
  Actual run accounting records 89,760 ms for the three-abstract case and 66,772 ms for the single-abstract case.
- Candidate definitions, source-role assignment, retrieval hits and readiness are controlled setup.
  These runs prove real source reasoning and advisory composition, not discovery of those candidates,
  live retrieval quality, scientific novelty, efficacy or an actual Human decision. The historical
  exports retain runner input packets, outputs, invocation/domain artifacts and results; original
  packet artifacts without workflow IDs were not exported separately in these two runs. The helper
  now includes those artifacts and frozen setup metadata in future exports.
- Final local validation passed 55 affected registry/HTTP/Arena/gap-projection/convergence/config
  tests (three live skips), backend no-emit typecheck and matrix consistency. The separate local
  Prisma integration test also passed.
- Default admission opens only these two profiles after qualification, bringing the registry to
  25 enabled/11 closed topic-selection profiles. The helper now uses default profiles. Independent
  implementation review passed 28 focused checks before activation. Final evidence review verified
  26 exported artifact checksums, 42 full output references, source pins, candidate bodies and
  audit/output/trace/transcript/receipt hashes; all four audit profile hashes match current defaults.
  Historical exports omit separate original packet artifacts, full snapshot/preparations, risk
  record bodies and checkpoint packets, so no item-by-item verification of those entities is claimed.
  No decision-quality activation is claimed.
- Through 147: 3,026,901 reported tokens, including 68,434 across Arena attempts 143–147. The same
  nine historical calls have unknown usage, with no pending call. Aggregate ceilings remain null;
  the per-call deadline remains 600 seconds. Private evidence remains under the shared live path.
- The following qualification covers real candidate admission and candidate-to-v1b lineage.
  Later source-extraction and Phase 5 sections supply composition and task-level completion evidence.

## Real candidate admission and frozen v1b lineage

- Attempt 148 (`lineage_v1_live`) correctly returned `evidence_expansion_required` with no drafts
  or candidates: claiming a missing position-sweep evaluation duplicates the supplied study.
  Independent review verified 15 artifact checksums and 10 full output references; no later node ran.
- Attempts 149–151 (`lineage_capability_live`) used the same pinned original Results section but
  inspected its documented capability deficit. The model produced one bounded candidate about the
  source-tested GPT-3.5-Turbo 20-/30-document QA conditions. It retained unknown prior art, original
  configuration/data access, single-source limits and unverified repair efficacy; it rejected a new
  benchmark claim and context-window expansion as a proven remedy.
- The actual draft passed admission and was persisted once. Existing readiness and support-packet
  services consumed its unchanged text and role refs. N7 returned `validate`; N8 reviewed an explicit
  controlled Human fixture; deterministic publication produced one v1b bundle with the same candidate,
  evidence map and role bundle. Reconstructed services replayed each node without additional model
  calls or duplicate candidates/bundles. This is source-backed model/consumer evidence, not an actual
  research approval or a novelty/efficacy judgment.
- The live helper starts with a controlled SearchRun/fulltext map and four roles from one section;
  it does not run extraction or the app checkpoint guard. In-memory domain repositories and JSON
  artifact storage are disclosed. This result alone does not close CX-03; the later source extraction
  and checkpoint-bound composition below establish those additional claims.
- Review found that CLI persistence_context could differ from the map lineage checked for model
  context. The context compiler now refuses missing/mismatched SearchRun, SearchPlan or snapshot
  refs before model work. A public-harness regression failed before correction and passes after it,
  covering wrong id/version/title/legacy metadata, missing context and legitimate persistence/replay.
- Independent review verified 38 artifact checksums, 22 complete output references, source pin,
  candidate text, audit/receipt hashes and cross-node lineage for 149–151; no finding remains.
- Backend no-emit typecheck and the full v1a harness pass: 124 offline checks, three opt-in live
  skips; the new positive live lineage test separately passed. No profile or production prompt changed.
- Through 151: 3,121,219 reported tokens, including 94,318 across 148–151. The same nine historical
  calls have unknown usage; none is pending. Aggregate limits remain null, per-call deadline 600 seconds.
  Private source, inputs, outputs, audit artifacts and frozen bundle exports remain under the shared live directory.

## Original-paragraph extraction and source-to-v1b consumers

- N5 now compiles only the persisted SearchRun’s explicitly bound original paragraphs, with unique
  literature/source resolution, document/paragraph hashes, text containment and complete locator
  equality. The original-abstract branch remains. An unbound second paragraph is absent from the
  actual fake-process request; source or locator drift refuses materialization. No section/document
  wildcard access, parser replacement or new acquisition system was introduced.
- Attempt 152 read the pinned 2882-character Lost in the Middle Results section and extracted five
  source-grounded units, but the old same-source polarity rule returned `review_required`: compatible
  findings and a limitation were forced toward a `claim_conflict`. No map or downstream role was
  created. Independent review verified 11 artifact checksums and actual quote/locator integrity.
- The materializer now also accepts the existing `refines` relation for compatible scope boundaries:
  nonempty rationale, cross-role links covering every same-source support/challenge unit, and no
  normalized quote duplicated across opposite roles. Existing unexplained-polarity/foreign-conflict
  rejection remains. A joint-review four-unit cross-link bypass was reproduced, fixed with a
  whole-source quote-set comparison, and independently rechecked as review-required.
- N5 prompt v4 states the paragraph/source boundary and explicit conflict-versus-refinement
  contract; the rendered prompt hash anchor is deliberately updated. Attempt 153’s four units
  correctly distinguish position-sensitive QA, the extended-window limitation, the closed-book/oracle
  baselines and experimental context. Its cross-role refines relation explains compatibility without
  inventing a contradiction; the current materializer independently readmits this exact output.
- Attempts 153–156 (`extracted_lineage_v2_live`) complete real N5 → N6 persistence → N7 validate →
  fixed Human fixture/N8 support → one frozen v1b bundle. The N6 candidate is confined to historical
  source-tested GPT-3.5-Turbo conditions, with unknown prior art and unverified replication/repair.
  Exact per-node replay adds no model calls, candidates or frozen bundles. No model output or
  evidence role was manually authored in this chain.
- Independent final review verified 48 artifact checksums, 54 complete output references, source pin,
  candidate text, all four audit/receipt chains and the frozen bundle. The challenge unit’s residual
  risk remains in N7, exact Human input and the bundle; no finding remains unresolved.
- The SearchPlan/retrieval/parser metadata and direct-evidence readiness are controlled; the single
  source is not independent corroboration. Domain stores are in memory, artifacts cross JSON storage,
  and Human input is explicitly a fixture. The app evidence/gap checkpoint guard is not configured
  in this helper; this is a consumer chain, not full product checkpoint approval. Further inspection
  found the selected-portfolio prompt incorrectly required a single draft, and the strict CLI schema
  rendered mechanism_payload as an empty object. The comparative unit below corrects both interfaces;
  the final checkpoint-bound composition supplies the two-distinct-candidate evidence for CX-03.
- Verification: 132 focused harness/binding checks passed with three opt-in skips; the subsequent
  cross-link correction passed the two affected source-polarity tests; backend no-emit typecheck,
  llm:config:check (five checks) and workflow-matrix consistency passed. The four-call live test
  separately passed. No build, dev server or database schema change was used.
- Through 156: 3,217,196 reported tokens (95,977 across 152–156), the same nine unknown-usage historical calls and no pending attempt. Aggregate ceilings remain null; per-call deadline is 600 seconds.

## Comparative checkpoint preparation and evidence preservation

- Need Discovery single-agent v5 and final-synthesis v4 allow a selected candidate plus substantive
  parked alternatives. CLI strict schemas expose five nullable mechanism axes while an `anyOf`
  fallback preserves legacy nested JSON payloads. The actual fake CLI output schema and two-draft
  persistence/replay are checked; prompt/scenario versions and both rendered hash anchors agree.
- The helper now wires the actual evidence/gap checkpoint owners: early candidate creation is
  refused, evidence Human review binds the current snapshot, empty/reworded mechanism payloads do
  not create an advancing pool, and stale pool confirmation is rejected. Existing CLI eligibility
  tests use shipped product mode rather than duplicating the default executor registration.
- Evidence projection shares identical original excerpts by hash. Single-agent callers receive one
  source copy across their context pair; independent Debate recipients retain their own copy. Review
  found structural compression would truncate deep quote/locator/hash bindings and long source text;
  the fixed adapter preserves the entire evidence digest/table. A test covering 12 units and a long
  source reproduced the loss before the fix. Intact evidence still must pass the normal token gate.
- Attempts 157–159 (`checkpoint_comparison_v2_live` through `v4_live`) successfully extract the two
  pinned sources and reach an advancing evidence checkpoint, but N6 is blocked before model work.
  157/158 expose a false credential match inside `task-shifts`; a word boundary fixes that match while
  standalone/quoted credential and Bearer checks remain. 158/159 also exceed the compressed input
  budget; these are safe stops, not comparative-candidate qualification. They used 29,458 / 30,113 /
  30,910 reported tokens. Through 159: 3,307,677 reported tokens, nine historical unknown-usage calls.
- The two-section BEIR fixture incorrectly represented all text as one paragraph, producing repeated
  overlapping 8,000-character evidence windows. The new private `beir-paragraphs.json` preserves 17
  original arXiv S5/S6 paragraphs (9,345 characters), each a unique exact ordered substring of the
  unchanged 12,465-character source. Body SHA-256: `9857965c203b4935ec628a8ff203f3fe6666580d12d12f63607ca618c31b7070`;
  paragraph-array SHA-256: `2024b3b422976030b018733e711bff634697eb3eb6e3828b3b2e62a69defff72`.
  Source: https://arxiv.org/html/2104.08663v4#S5 (also S6). Selection includes generalization gains,
  latency/index tradeoffs and annotation bias; complete tables are not selected. SearchRun binds all
  paragraph refs and the manifest pins both body and selection. Parser/retrieval readiness is still
  controlled, not an ingestion qualification.
- Current offline verification: 228 passed, three opt-in live skips; backend no-emit typecheck, five
  LLM config tests and workflow matrix consistency pass. Independent review rechecked legacy payload
  compatibility, checkpoint wiring, the source projection, lossless compression and paragraph pins.
- Attempt 160 (`checkpoint_comparison_v5_live`) reaches the unchanged 600-second N5 deadline with
  no final message or usage and no evidence/domain authority; it is not a successful extraction.
  At 160 the accounting total is 3,307,677 reported tokens plus ten unknown-usage calls. The trace
  contains 18,589 agent-message deltas: 69,025 partial JSON characters / 1,647 lines, 21 units and
  25 links, still generating clusters at timeout. This demonstrates long output rather than a
  no-output stall; it does not prove formatting was the sole cause. N5 v5 adds only compact JSON
  without indentation, with its config version and rendered hash updated. Six binding tests, five
  config tests and matrix consistency pass; attempt 163 supplies the first bounded real v5 result below.
- Attempts 161–162 (`checkpoint_comparison_v6_live`) use eight focused BEIR paragraphs / 4,853
  characters, array hash `9d80cb9b51e5c5dba197970aa95c551881edc2cee2518dd7ee66372a122d9647`,
  at `/tmp/my-researcher-t153-phase2/beir-focused-paragraphs.json`. They retain dense retrieval
  limits, re-ranking/late-interaction gains, latency/index costs and reannotation counter-evidence.
  Other analyses (including TAS-B training losses, GenQ adaptation and hardware/search settings)
  and complete tables are outside this selected input. Missing improvement methods or universal
  latency bounds cannot be inferred from this selection.
- 161 uses N5 v4, produces 12 valid units and 11 links, and reaches the exact evidence Human fixture
  checkpoint. Review verifies every quote/locator, ten extraction checksums, audit/receipt identity
  and preservation of coverage warnings. 162 uses N6 single-agent v5 and produces two persisted
  substantive candidates with full mechanism axes: historical position-sensitive QA (model-selected)
  and historical retrieval under distribution shift (parked). Exact N5/N6 replay adds no calls.
  Independent review verifies the two candidate bodies, 40 complete source-bound refs, 16 discovery
  artifact checksums and the audit/receipt/persistence chain.
  The preferred QA draft has no challenge unit; readiness correctly returns
  `DISCONFIRMING_EVIDENCE_REQUIRED` before N7. This is a valid stop, not full-chain qualification.
  Calls report 32,569 and 32,252 tokens; through 162: 3,372,498 reported tokens plus the same ten unknowns.
- The comparative helper explicitly records the controlled Human preference for historical
  retrieval before model execution, caps this fixture's portfolio at two (product default unchanged),
  and matches one actual candidate through its source-backed support refs. Ambiguous matches stop.
  It saves model preference and the exact selected candidate separately; it never edits the model
  batch or reclassifies evidence to satisfy readiness. Fixed Human comparisons require independent
  inspection against every actual candidate. No actual researcher approval is claimed.
- `checkpoint_debate_v1_live` (163–168) does not qualify the full chain. N5 v5 at 163 produced
  13 units / 13 links as 39,025 compact JSON characters with no newlines; original quotes/locators,
  source roles and coverage warnings hold. Independent review also verifies all ten extraction
  artifact checksums, output/trace audit hashes, current profile hash and complete claim/receipt result.
  This is one bounded positive, not proof that formatting
  eliminates timeouts. Explorer 164 has 22 valid complete refs. Explorer 165 has one changed title
  scope among 17 refs; the previous loop admitted and forwarded it to Critic 166. Issue framing 167
  also completed before the qualification-owned App Server was stopped during final synthesis 168.
  168 is `CODEX_CLI_EXIT_FAILURE`, with unknown usage, no final batch, candidate or N7/N8/v1b authority.
  Critic/framing cannot qualify on the invalid upstream body. Calls 163–167 report 30,938 / 24,962 /
  24,580 / 29,025 / 25,433 tokens. Through 168: 3,507,436 reported tokens plus 11 unknown calls
  (4, 8, 9, 20, 63, 83, 95, 102, 130, 160, 168); aggregate ceilings remain null.
- The repaired loop reuses the existing complete-reference validator at all five CLI role boundaries,
  against the actual receiver's user messages, before admitted artifacts or downstream model work.
  Fault injection first reproduced the missing rejection; tests now cover all five identity fields
  across Explorer/Critic/framing/final, plus valid nullable and dynamic summary refs. Affected loop,
  adapter and harness tests: 169 passed, three opt-in live skips; backend no-emit typecheck, config
  checks and matrix consistency pass. Independent review also passed 25 tests, rejected the actual
  165 output, accepted 164 and both historical Critic/framing/final sets (117–119 and 124–126), and
  confirmed no downstream authority at 168. The fix landed in 39b065f7.
- `checkpoint_debate_v2_live` (169–174) completes N5 and all five repaired Debate calls. N5 v5
  produces 11 units / 11 links as 33,519 compact JSON characters, preserving source and quote limits.
  Two independent Explorers propose seven directions each; Critic and framing retain material
  residual-need, intervention-comparison, task-specific, resource-budget and annotation-stability
  objections. Final synthesis v4 returns `evidence_expansion_required` with no drafts, retaining
  the objections and reopening conditions. This is an honest non-advance result, not a successful
  checkpoint-to-v1b chain. It does not borrow the sole QA baseline unit for retrieval. Exact N5/N6
  reconstructed-service replay adds no calls; the harness then fails its expected-candidate assertion.
  Calls report 28,895 / 23,125 / 23,135 / 27,152 / 23,911 / 30,857 tokens; through 174:
  3,664,511 reported tokens plus the same 11 unknowns. Independent review verifies all six role
  outputs, exact predecessor bodies, 56 artifact checksums, 14 inner payload hashes, 31 artifact-ref
  hashes, all output/trace/default-profile audit hashes and both complete claim/receipt results.
- The next independent single-agent composition check adds the explicit BM25-baseline paragraph
  (index 0 of the verified 17-paragraph original selection) before the existing eight focused
  paragraphs. `/tmp/my-researcher-t153-phase2/beir-comparison-paragraphs.json` retains the source
  body/hash; its nine paragraphs contain 5,198 characters with array SHA-256
  `4e78146c033b185700e9afcafd43d6d207d6861e1f13530e9709c7aeaac17f7f`.
  This supplies omitted original comparator context; it does not establish the missing prior-art
  comparisons or justify reversing the completed Debate's judgment. Production prompts/gates are
  unchanged. The fixed input hash and focused checkpoint test pass; independent source review
  confirms the unchanged eight paragraphs and original comparator paragraph. The real single-agent
  composition `checkpoint_comparison_v7_live` completes at 175–178, as recorded below.

## Phase 3 checkpoint-bound composition

- `checkpoint_comparison_v7_live` (175–178) passes the canonical source-to-v1b helper with the
  actual EvidenceLandscape and GapSelection owners. N5 v5 extracts 13 units / 13 links, including
  separate source-backed QA and BM25 baseline units. Exact evidence-snapshot Human review precedes
  candidate persistence. Source retrieval, parser/readiness setup and Human inputs remain explicitly
  controlled; repositories are in-memory with JSON artifact storage.
- Single-agent N6 v5 produces two substantive historical capability candidates: middle-position
  multi-document QA and domain/task-shift retrieval. The model prefers QA; the predeclared fixed
  Human preference selects the actual retrieval candidate. Research object, comparison and outcome
  differ in the actual bodies, matching the fixed Human comparison. QA has no challenge unit and
  remains an exploratory alternative, not a separately readiness-qualified need. Retrieval uses its
  own BM25 baseline and retains five source-grounded resource/annotation challenges.
- N7 returns `validate` within the historical, single-study scope, with all five risk refs residual,
  none accepted by the model, and required Human checks outstanding. The fixed Human input accepts
  those exact five risks and checks, reviews both candidates against the current whole-pool hash,
  and preserves scope/non-goals. Stale-hash and incomplete-pool reviews are rejected. N8 returns
  `pass` with complete risk/check coverage and no scope violation; its text explicitly disclaims
  actual research approval.
- The resulting advancing gap checkpoint binds the exact Human authority. Publish creates exactly
  one `v1b_input_bundle_168`, sourced from the actual persisted retrieval candidate, retaining its
  evidence map/role bundle, five risks and two gap codes. Reconstructed-service N5/N6/N7/N8 replay
  adds no model calls; repeated publish returns the same unique bundle. Gateway calls remain zero.
  The live helper passes. Independent review verifies all four actual model outputs, 48 artifact
  checksums, eight inner payload hashes, 19 artifact-ref hashes, all output/trace/default-profile
  audit hashes and four complete claim/receipt results. N8's candidate statement, N7 rationale and
  Human input match exactly; five residual risks survive Human acceptance and frozen publication.
- Calls 175–178 report 30,572 / 33,644 / 24,822 / 12,261 tokens (101,299 total). Through 178:
  3,765,810 reported tokens, the same 11 unknown-usage calls and no pending attempts. The per-call
  deadline remains 600 seconds and all aggregate ceilings remain null. Together with the earlier
  sampling, convergence, Arena and negative cases, this closes CX-03 and Phase 3. No actual research
  approval, statistical quality calibration or full CLI relational recovery is claimed.

## Retained verification boundaries

- All five phases and CX-01 through CX-09 are closed by the evidence above; no in-scope verification
  remains outstanding. Scientific quality is bounded by inspected role cases, not statistical calibration.
- An interrupted domain commit without completion still requires authority inspection. No automatic
  partial-write recovery is claimed; recovery and Human gates retain their owners.
- Controlled whole-flow inputs and genuine Human decisions remain distinct. Product CLI composition
  and PostgreSQL reconstruction do not claim autonomous research approval or downstream paper execution.
- T-129 archival separately awaits reconciliation of its second worktree occurrence.
