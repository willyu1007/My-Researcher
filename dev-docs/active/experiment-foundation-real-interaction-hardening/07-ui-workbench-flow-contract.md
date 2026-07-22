# T-106 UI Workbench Flow Contract

## Purpose

The contract defines what the later experiment-foundation desktop smoke must prove. The contract is intentionally implementation-neutral: the renderer consumes T-076/T-077 APIs and displays state, but the renderer MUST NOT generate readiness, promotion, materialization, execution, validation, or evidence decisions.

## Entry And Scope

- Entry: desktop navigation item `实验基座`.
- Scope: existing T-078 workbench surfaces only.
- Backend authority: `/experiment-foundation/**` registry/readiness/promotion routes and `/experiment-foundation/execution/jobs/**` execution routes.
- Out of scope for the UI contract: new shared contracts, Prisma schema changes, backend route changes, real cloud canary execution, and renderer-owned domain payload generation.

## Required User Flow

| Step | Panel | User action | Backend calls | Expected UI state |
| --- | --- | --- | --- | --- |
| 1 | Navigation | Open `实验基座`. | None, or initial list calls already owned by the module. | Workbench renders dense operational panels; no hero/landing page; no legacy desktop styles. |
| 2 | Registry | Filter by `record_kind/status/family`, select a record, inspect details. | `GET /experiment-foundation/records?...`; `GET /experiment-foundation/records/:record_kind/:record_id` | List, detail, refs, hashes, status, family, owner, and traceability are visible without copying reusable DTOs into unrelated UI state. |
| 3 | Registry | Create or upsert a valid synthetic contract JSON payload. | `POST /experiment-foundation/records`; `PUT /experiment-foundation/records/:record_kind/:record_id` | Success refreshes list/detail from backend response; editor does not invent ids, hashes, or statuses beyond user-provided JSON. |
| 4 | Readiness | Run readiness for selected record or typed target ref. | `POST /experiment-foundation/readiness/check`; `GET /experiment-foundation/readiness/:target_kind/:target_id/latest` | Passed, blocked, stale, and unknown states are readable; blockers and required actions are displayed as backend strings. |
| 5 | Candidate Promotion | Submit promotion request/result JSON for a selected candidate. | `POST /experiment-foundation/candidates/:candidate_id/promotion` | Success shows request/result/candidate records from response; failure shows stable backend error code and blockers without mutating local candidate status. |
| 6 | Recipe/Materialization | Inspect or upsert frozen `recipe_draft`, `run_recipe`, `version_lock`, `training_task_spec`, and `training_task_materialization_result` payloads. | Registry create/upsert/get/list calls only. | UI labels the payloads as frozen contracts; the UI does not generate a `RunRecipe` or materialize a task spec. |
| 7 | Execution/Evidence | Submit, sync, cancel, collect, list, and inspect external jobs. | `POST /experiment-foundation/execution/jobs/submit`; `GET /experiment-foundation/execution/jobs`; `GET /experiment-foundation/execution/jobs/:external_job_id`; `POST /experiment-foundation/execution/jobs/:external_job_id/sync`; `POST /experiment-foundation/execution/jobs/:external_job_id/cancel`; `POST /experiment-foundation/execution/jobs/:external_job_id/collect` | Stage refs, partial refs, result refs, validation refs, evidence refs, adapter metadata refs, and hashes are visible as refs/hashes only. |
| 8 | Error State | Trigger one malformed payload and one gate failure. | Same routes as above. | `INVALID_PAYLOAD`, `GATE_CONSTRAINT_FAILED`, `VERSION_CONFLICT`, and `NOT_FOUND` render in contained error regions without overflowing or replacing backend semantics. |

## Required Assertions

- The renderer MUST call backend APIs for readiness, promotion, execution, and collect outcomes.
- The renderer MUST NOT compute promotion eligibility, readiness status, materialization validity, external job status, validation status, evidence eligibility, or sidecar acceptance.
- The renderer MUST NOT store full reusable domain DTO copies in sidecar/evidence/paper-facing state.
- The renderer MAY keep filters, selected ids, JSON editor text, loading state, error state, and display formatting state.
- The renderer MUST display refs and hashes as inspectable traceability, not as hidden implementation detail.
- The UI smoke MUST include at least one success path and one backend gate failure path.

## Error And Recovery Expectations

| Backend condition | Expected display | Recovery action |
| --- | --- | --- |
| Schema-invalid payload | Error code `INVALID_PAYLOAD`, validation details when present. | Keep editor content intact for user correction. |
| Readiness blocked | `blocked` status, blockers, warnings, required actions. | Allow rerun after user upserts the dependent record. |
| Promotion gate failure | `GATE_CONSTRAINT_FAILED` and blockers. | Candidate remains selected; UI refreshes candidate from backend before retry. |
| Submit hash mismatch | `GATE_CONSTRAINT_FAILED`; no job appears in list for that task. | Allow submit retry with corrected locked request. |
| Idempotency conflict | `VERSION_CONFLICT`. | Show existing idempotency key context if returned by the backend; do not auto-submit with a new key. |
| Cancelled job collect | Partial/invalid validation refs without evidence candidate. | Display validation status and absence of evidence as backend outcome. |

## Future Smoke Command Shape

When UI automation is scheduled, the automation SHOULD produce redacted artifacts under:

```text
.ai/.tmp/experiment-foundation-hardening/<run-id>/ui/
```

Minimum artifact set:

- `workbench-flow-summary.md`: route, selected ids, operations, statuses, and backend error codes.
- `workbench-trace.json`: redacted request/response summaries with refs/hashes only.
- Optional screenshots only when they prove rendering or error containment; screenshots MUST NOT include credentials, raw datasets, raw logs, SDK payloads, or private provider paths.

## Acceptance

Phase 4 is satisfied when the UI contract is reviewed and later UI automation can be implemented directly from the contract without redefining backend semantics.
