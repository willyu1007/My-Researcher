# Pitfalls

## Do Not Repeat
- Do not reopen T-091/T-101 closure unless runnable review finds a true contradiction.
- Do not let the replay helper create PaperImplementation authority state outside existing services/routes.
- Do not treat T-104 fake/local adapter proof as real cloud execution.
- Do not treat T-105 live-provider preflight as live provider execution.
- Do not move writing ingestion into T-109 without an explicit decision.
- Do not revive `research-argument` as a shortcut fixture source.
- Do not stage unrelated topic-selection, LLM config, or experiment-foundation dirty files with T-109 changes.

## Resolved During Phase 2/3
| Symptom | Root Cause | Fix | Prevention |
|---|---|---|---|
| Replay could not start from `.ai/scripts`. | Bare `fastify` import resolved from repo root rather than backend workspace. | Resolve Fastify from `apps/backend/package.json` with `createRequire`. | Script entrypoints outside a workspace package must resolve package-local dependencies explicitly. |
| Replay failed before helper classes were initialized. | Top-level replay execution ran before class declarations were evaluated. | Move execution into `main()` and call it after declarations. | Keep long ESM script startup after all helper definitions. |
| Writing evidence artifact showed empty/null projection evidence. | Summary read fields that do not exist on `PaperImplementationWritingEntryPacket`. | Summarize `trace_manifest_id/ref` and `packet_payload` refs from the actual contract. | Artifact summarizers must be checked against shared contract definitions. |
| `BP0-10` only checked desktop files. | Legacy authority check did not inspect replay payloads/runtime state. | Check every replay request payload and runtime evidence for `research-argument` authority refs. | Blocked-path fixtures must validate the same semantic surface they claim to cover. |
