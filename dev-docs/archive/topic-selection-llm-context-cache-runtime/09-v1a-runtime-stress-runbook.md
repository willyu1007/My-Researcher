# v1a Runtime Stress Runbook

## Purpose
Use `pnpm topic-selection:v1a-runtime-stress` to verify the T-112 v1a runtime against the local/dev Prisma stack. The runner repeatedly executes the existing v1a N1-N9 harness with replay smoke enabled, then checks prompt packet index rows created during the stress window.

This is a production-shaped local/dev stress runner. It is not a live-provider canary and does not require provider credentials by default.

## Prerequisites
- Local `.env.local` points to the local/dev Prisma database.
- Local/dev DB migrations have been applied.
- The prompt packet cache index table exists in the local/dev DB.
- The balanced T-112 resource sample fixture exists: `resource_sample_set_t112_prod_balanced_20260530`.
- Run from the repo root.

## Default Command
```bash
pnpm topic-selection:v1a-runtime-stress
```

Default behavior:
- `TOPIC_SELECTION_V1A_RUNTIME_STRESS_ITERATIONS=2`
- `TOPIC_SELECTION_V1A_RUNTIME_STRESS_MODES=single_agent`
- child harness runs use deterministic mocked LLM execution
- child harness runs enable N6-N9 replay smoke
- provider credentials are not required

## Common Runs
Single-agent closure check:

```bash
TOPIC_SELECTION_V1A_RUNTIME_STRESS_RUN_ID=t112-v1a-runtime-stress-local \
TOPIC_SELECTION_V1A_RUNTIME_STRESS_ITERATIONS=2 \
TOPIC_SELECTION_V1A_RUNTIME_STRESS_MODES=single_agent \
pnpm topic-selection:v1a-runtime-stress
```

Multi-agent debate closure check:

```bash
TOPIC_SELECTION_V1A_RUNTIME_STRESS_RUN_ID=t112-v1a-runtime-stress-debate-local \
TOPIC_SELECTION_V1A_RUNTIME_STRESS_ITERATIONS=1 \
TOPIC_SELECTION_V1A_RUNTIME_STRESS_MODES=multi_agent_debate \
pnpm topic-selection:v1a-runtime-stress
```

Combined local sweep:

```bash
TOPIC_SELECTION_V1A_RUNTIME_STRESS_RUN_ID=t112-v1a-runtime-stress-combined-local \
TOPIC_SELECTION_V1A_RUNTIME_STRESS_ITERATIONS=1 \
TOPIC_SELECTION_V1A_RUNTIME_STRESS_MODES=single_agent,multi_agent_debate \
pnpm topic-selection:v1a-runtime-stress
```

## Parameters
| Variable | Default | Meaning |
|---|---|---|
| `TOPIC_SELECTION_V1A_RUNTIME_STRESS_RUN_ID` | generated timestamp id | Parent stress artifact/run id. |
| `TOPIC_SELECTION_V1A_RUNTIME_STRESS_ITERATIONS` | `2` | Iterations per selected mode. |
| `TOPIC_SELECTION_V1A_RUNTIME_STRESS_MODES` | `single_agent` | Comma-separated list: `single_agent`, `multi_agent_debate`. |
| `TOPIC_SELECTION_V1A_RUNTIME_STRESS_CHILD_TIMEOUT_MS` | `600000` | Timeout for each child v1a harness run. |
| `TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID` | `resource_sample_set_t112_prod_balanced_20260530` | Resource sample set used by child harness runs. |

## Expected Result
The command exits with code `0` and prints a JSON summary with:
- `status: "passed"`
- `child_run_count` equal to `iterations * modes`
- every child run has `harness_llm_gateway.call_count: 0`
- every child replay smoke has exact replay LLM delta `0`
- every child replay drift branch has LLM delta `0`
- `prompt_packet_index.created_during_stress` contains expected N6/N7 slot rows
- `prompt_packet_index.created_during_stress.by_quality_decision.block` is absent or `0`

Artifacts are written under:

```text
.ai/.tmp/topic-selection-v1a-runtime-stress/<run-id>/
```

Each child v1a harness also writes its normal artifacts under:

```text
.ai/.tmp/topic-selection-v1a-harness-e2e/<child-run-id>/
```

## What It Proves
- The Prisma-backed v1a N1-N9 harness can run repeatedly with T-112 runtime enabled.
- Exact replay does not invoke the LLM gateway.
- Replay input-hash drift does not invoke the LLM gateway or create authority records.
- Prompt packet cache index rows are created as artifact-ref-only metadata for the expected invocation slots.
- N6 single-agent and N6 multi-agent debate modes are both covered when selected.

## Production Boundary
- v1a production may use the current process-local context packet cache as an acceleration layer only.
- A process restart or deploy can safely lose context packet cache hits; v1a must recompile ref-backed context packets and continue through the same token-budget, prompt-quality, schema, deterministic, replay, and authority gates.
- Persistent DB prompt packet cache is in scope for v1a because it stores only redacted prompt artifact refs, quality report refs, hashes, freshness, and provenance.
- Persistent DB context packet cache is out of scope for the v1a closure pack. Add it only in a later slice with explicit migration, freshness, cleanup, and cross-process reuse requirements.

## What It Does Not Prove
- It does not prove live provider availability.
- It does not prove OpenAI/DashScope provider-required live-call behavior.
- It does not perform throughput or concurrent load testing.
- It does not validate a persistent DB context packet cache index.

Use provider canaries and provider-backed v1a harness runs for live-provider evidence.

## Troubleshooting
- Missing DB/table errors: apply local/dev migrations, then rerun.
- Missing balanced sample fixture: run the existing v1a harness once with deterministic mock sampling fallback, or use an explicit `TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID`.
- Child timeout: increase `TOPIC_SELECTION_V1A_RUNTIME_STRESS_CHILD_TIMEOUT_MS`.
- Prompt slot assertion failure: inspect `90-summary.json` and child logs in the stress artifact directory, then check whether prompt packet runtime was bypassed for the missing slot.
- Nonzero LLM call count: inspect the child summary and env overrides; this runner should default every child slot to deterministic mocked execution.
