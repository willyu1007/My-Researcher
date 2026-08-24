# Post Verify

## DB

- `prisma migrate status --schema prisma/schema.prisma`: database schema is up to date.
- Table existence probe returned:
  - `TopicSelectionResourceSampleItem`
  - `TopicSelectionResourceSampleSet`
  - `TopicSelectionResourceSamplingAudit`

## Application E2E

- Harness: `.ai/.tmp/topic-selection-real-flow.mjs`
- Mode: `TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1`
- Run id: `real-flow-1779013637735-7ff31f`
- Artifact dir: `.ai/.tmp/topic-selection-real-flow/real-flow-1779013637735-7ff31f/`
- Result: passed.
- Sample set: `resource_sample_set_0bbb6a8c-9074-4469-8d76-d40af0d3f799`
- Sample warning: `CONTEXT_CAP_APPLIED`
- Persisted role counts: support=4, challenge=4, baseline=4, context=4, review=0, excluded=0.
- Persisted selected item count: 16; audit count: 1.
- Bridge: `paper_project_bridge_fe282d7c-a343-42a7-bb8d-f7d684e5d4c2`

## Tests

- Resource sampling service/routes: 7 passed.
- Shared schema tests: 73 passed.
- Shared typecheck: passed.
- Backend typecheck: passed.
