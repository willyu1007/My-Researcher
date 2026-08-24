# 05 Pitfalls

## Do-not-repeat summary
- Do not reintroduce “论文管理” as a broad canonical module name.
- Do not expand `S1` beyond shared contracts and schema tests.
- Do not collapse `S7` LocalScript validation and `S8` Aliyun PAI-DLC integration into one untestable cloud-first slice.
- Do not start `S9` UI before S3/S5 expose stable API and contract behavior.
- Do not change Prisma, backend routes, desktop UI, platform adapters, or training execution in `S1`.
- Do not make `experiment-foundation` a hidden submodel of `literature`; keep domain ownership separate.
- Do not duplicate retired workspace-selection fields; reusable assets and workspace selections are different concepts.
- Do not conflate baseline and benchmark; baseline is the comparison implementation, benchmark is the comparison protocol.
- Do not require full benchmark reproduction before a baseline can enter the reusable catalog.
- Do not treat a benchmark as proven just because it contains published result refs or leaderboard links.
- Do not turn `RunRecipe` into a loose static config with unresolved refs.
- Do not turn `RunRecipe` into a platform-specific executable script or adapter request body.
- Do not submit `RecipeDraft` directly; materialize a valid `RunRecipe` into `TrainingTaskSpec`.
- Do not copy reusable experiment asset DTOs into core `PaperProject`; attach frozen trace refs through `PaperExperimentSidecar`.
- Do not make `PaperExperimentSidecar` a loose list of ids; include version locks, hashes, provenance, event log, and status snapshots.
- Do not turn human/LLM-in-loop tuning into unattended automatic hyperparameter search.
- Do not let an LLM-generated tuning proposal submit a job directly; require a recorded `TuningDecision` and readiness checks.
- Do not record tuning trials without links to proposal, decision, recipe, task spec, result, and evidence candidate.
- Do not copy restricted raw datasets into shared storage by default.
- Do not store raw data in git or database blobs.
- Do not treat OSS, PAI Dataset, or another cloud mirror as the canonical dataset source.
- Do not mirror restricted data to cloud storage without an explicit data policy allowance or approval reference.
- Do not make human review a default blocking gate for all candidates; auto-promote low-risk complete candidates.
- Do not auto-promote candidates that lack source refs, required metadata, policy fields, duplicate checks, or confidence/risk triage.
- Do not expand V1 into a full experiment runner before asset contracts and readiness gates are stable.
- Do not build a training platform inside this repo; use adapters to existing platforms.
- Do not add `CustomHttpAdapter` in V1; keep the first adapter scope limited to `LocalScriptAdapter` and `AliyunPaiDlcAdapter`.
- Do not let Aliyun PAI-DLC request fields leak into core `TrainingTaskSpec`.
- Do not turn LLM fine-tuning support into an in-repo LLMOps platform.
- Do not let adapter-private payloads leak into `RunRecipe` or public domain DTOs; normalized platform refs belong at the materialization/adapter boundary.
- Do not convert external job metrics directly into paper claims; write them as evidence candidates first.
- Do not accept loose result files as a complete result; require metrics, artifacts, logs, config snapshot, and validation report.
- Do not store evaluation output as loose metric scalars; create structured facts with context, validation status, and provenance.
- Do not turn `PaperTableFactSet` into a full leaderboard or final manuscript table renderer.
- Do not let implementation decision signals become claims; they guide iteration and must cite source facts.
- Do not create evidence candidates from invalid results unless a partial result is explicitly accepted with rationale.
- Do not submit fine-tuning jobs without base model license, dataset policy, tokenizer/chat template, context length, resource estimate, and evaluation protocol checks.
- Do not add new desktop UI dependencies on the frozen legacy CSS layer.
- Do not leave temporary scripts or ad hoc test files behind after verification.

## Resolved failures and dead ends
No resolved failures yet.

## Pitfall entry template
### YYYY-MM-DD - <short title>
- Symptom:
- Root cause:
- What was tried:
- Fix/workaround:
- Prevention:
