# 12 Runtime Persistence Envelope

## Decision
PaperImplementation runtime promotion SHOULD use two generic persistence envelopes:

1. `PaperImplementationRuntimeArtifactEnvelope`
2. `PaperImplementationRuntimeAdmissionRecord`

The implementation MUST NOT reuse `PaperImplementationAgentWorkflowHarnessRun` or `PaperImplementationProposalArtifact` as runtime/admission persistence. Existing harness records may reference runtime artifacts for scenario evidence, but they remain proposal-harness records.

This is a logical contract plan, not a Prisma migration. Code implementation should first land shared TypeScript/JSON schemas, then add Prisma models only after the schema impact is accepted.

## Why A Generic Envelope
The first promoted node has four semantic roles. Creating one table or contract family per role would increase query surface and migration churn without improving authority safety.

Use one runtime artifact envelope with `artifact_scope`:

| Scope | Meaning | Example payload contract |
|---|---|---|
| `role` | One executed runtime role invocation. | `TraceIntegrityRoleArtifact@v1` |
| `final` | Domain-facing final runtime artifact for a promoted slot. | `TraceIntegrityDebateArtifact@v1` |

Use one admission record envelope with `admission_scope`:

| Scope | Meaning | Consumer |
|---|---|---|
| `role` | Chaining admission for a role artifact before the next role consumes it. | Runtime service only |
| `final` | Final admission before Domain Gate may consume the final artifact. | Domain Gate |

## Runtime Artifact Envelope
`PaperImplementationRuntimeArtifactEnvelope` MUST include these logical fields:

Identity:
- `runtime_artifact_id`
- `implementation_project_id`
- `workflow_type`
- `slot_id`
- `artifact_scope`: `role` or `final`
- `artifact_contract_id`
- `artifact_contract_version`
- `target_ref`
- `target_version_id`
- `input_snapshot_ref/hash`
- `source_hash_bundle_hash`
- `created_by`
- `created_at`

Role and chain identity:
- `role_slot_id` when `artifact_scope=role`
- `call_index` when `artifact_scope=role`
- `prior_role_artifact_refs`
- `prior_role_artifact_hashes`
- `role_chain_hash`
- `final_artifact_ref/hash` when a role emits a separate final artifact ref

Runtime identity:
- `run_mode`
- `execution_mode`
- `executor_kind`
- `model_profile_id`
- `model_option_id`
- `runtime_status`: `passed`, `blocked`, or `failed_runtime`
- `runtime_failure_code`
- `retry_attempt_index`
- `provider_call_count`
- `response_reuse_status`
- `allowed_side_effects`

Context and retrieval identity:
- `retrieval_packet_ref/hash`
- `reviewed_statement_packet_ref/hash`
- `context_packet_ref/hash`
- `runtime_invocation_context_hash`
- `context_policy_profile_hash`
- `source_refs`
- `source_hashes`

Prompt, cache, token, and compression identity:
- `prompt_packet_ref/hash`
- `prompt_template_id`
- `prompt_template_version_id`
- `prompt_variant_id`
- `prompt_redaction_policy_hash`
- `output_schema_id`
- `context_cache_key_hash`
- `context_cache_status`
- `context_cache_result_ref/hash`
- `prompt_packet_cache_key_hash`
- `prompt_packet_cache_status`
- `prompt_packet_cache_result_ref/hash`
- `token_budget_gate_result_ref/hash`
- `compression_policy_profile_hash`
- `compression_status`: `not_needed`, `applied`, or `failed`
- `compression_report_ref/hash`
- `compressed_context_packet_ref/hash`

Output and audit:
- `artifact_payload_ref`
- `artifact_payload_hash`
- `output_hash`
- `runtime_audit_ref/hash`
- `blocker_codes`
- `warning_codes`

The payload may contain trace-specific fields, but the envelope owns the common runtime identity. Domain services must read only admitted final artifacts, not role artifacts.

## Admission Record Envelope
`PaperImplementationRuntimeAdmissionRecord` MUST include these logical fields:

Identity:
- `admission_record_id`
- `implementation_project_id`
- `workflow_type`
- `slot_id`
- `admission_scope`: `role` or `final`
- `admission_policy_id`
- `admission_policy_version`
- `runtime_artifact_ref/hash`
- `runtime_artifact_id`
- `artifact_contract_id`
- `target_ref`
- `created_at`

Expected identity:
- `expected_runtime_identity_hash`
- `expected_source_hash_bundle_hash`
- `expected_retrieval_packet_hash`
- `expected_prompt_packet_hash`
- `expected_output_schema_id`
- `expected_prior_role_artifact_hashes`
- `expected_final_artifact_hash` when `admission_scope=final`

Observed identity:
- `observed_runtime_identity_hash`
- `observed_source_hash_bundle_hash`
- `observed_retrieval_packet_hash`
- `observed_prompt_packet_hash`
- `observed_output_schema_id`
- `observed_prior_role_artifact_hashes`
- `observed_output_hash`

Decision:
- `admission_status`: `admitted` or `rejected`
- `admission_identity`
- `admission_identity_hash`
- `admitted_artifact_ref/hash` when admitted
- `issue_codes`
- `warning_codes`

Admission records MUST NOT contain prompt text, hidden reasoning, provider responses, queue item payloads, or authority mutations.

## First-Slice Storage Strategy
First implementation SHOULD add generic contracts before Prisma:

1. Add shared schemas for `PaperImplementationRuntimeArtifactEnvelope` and `PaperImplementationRuntimeAdmissionRecord`.
2. Add in-memory repository tests for role/final artifact creation and admission records.
3. Add Prisma models only after confirming query needs and migration approval.

If Prisma is approved, use two tables:

| Model | Purpose | Notes |
|---|---|---|
| `PaperImplementationRuntimeArtifact` | Stores role and final runtime artifacts by `artifact_scope`. | One table for all roles and final artifacts. |
| `PaperImplementationRuntimeAdmissionRecord` | Stores role and final admission decisions by `admission_scope`. | One table for role/final admission. |

Do not create separate tables for `support_mapper`, `skeptic`, `reconcile`, or `arbiter`. Their role-specific payloads remain contract-specific JSON under the generic envelope.

## Minimum Queryable Columns
If Prisma models are added, these fields SHOULD be queryable columns rather than only JSON:

`PaperImplementationRuntimeArtifact`:
- `implementationProjectId`
- `workflowType`
- `slotId`
- `artifactScope`
- `roleSlotId`
- `callIndex`
- `targetRefType`
- `targetRefId`
- `targetVersionId`
- `runMode`
- `executionMode`
- `executorKind`
- `runtimeStatus`
- `modelProfileId`
- `outputSchemaId`
- `retrievalPacketHash`
- `promptPacketHash`
- `sourceHashBundleHash`
- `runtimeInvocationContextHash`
- `runtimeAuditHash`
- `artifactPayloadHash`
- `outputHash`
- `createdAt`

`PaperImplementationRuntimeAdmissionRecord`:
- `implementationProjectId`
- `workflowType`
- `slotId`
- `admissionScope`
- `runtimeArtifactId`
- `admissionStatus`
- `admissionPolicyId`
- `admissionIdentityHash`
- `expectedRuntimeIdentityHash`
- `observedRuntimeIdentityHash`
- `expectedPromptPacketHash`
- `observedPromptPacketHash`
- `expectedSourceHashBundleHash`
- `observedSourceHashBundleHash`
- `createdAt`

Everything else may start as JSON payload unless L3 Prisma smoke requires direct querying.

## Relationship To Existing Harness Tables
Existing harness tables remain unchanged in meaning:

| Existing table/contract | Allowed relationship | Forbidden relationship |
|---|---|---|
| `PaperImplementationAgentWorkflowHarnessRun` | May reference runtime artifact refs for scenario replay/evidence. | Must not become runtime artifact, provider proof, or admission record. |
| `PaperImplementationProposalArtifact` | May hold expected fixture output or harness proposal evidence for unpromoted workflows. | Must not stand in for admitted final runtime artifact on a promoted slot. |
| `PaperImplementationGateResult` | May record harness-level proposal gate result. | Must not replace runtime final admission or Domain Gate for a promoted slot. |
| `PaperImplementationDecisionWorkQueueItem` | May be created by Domain Gate after final admission. | Runtime/admission must not create it directly. |

The relation is by refs only. Shared field names such as `workflow_type`, `execution_mode`, or `model_profile_id` do not imply shared authority semantics.

## Idempotency And Replay
Runtime services SHOULD compute an `artifact_identity_hash` from:
- `implementation_project_id`
- `slot_id`
- `artifact_scope`
- `role_slot_id`
- `call_index`
- `target_ref`
- `retrieval_packet_hash`
- `prior_role_artifact_hashes`
- `prompt_packet_hash`
- `output_schema_id`
- `execution_mode`
- `executor_kind`
- `model_profile_id`
- `model_option_id`
- `retry_attempt_index`

Exact replay may create evidence records, but Domain Gate must still prevent duplicate authority writes by consuming only admitted final artifacts and deterministic domain gates.

## Forbidden Persistence Patterns
These patterns are production blockers:
- storing rendered prompt text or hidden reasoning in runtime artifact, cache, or admission tables;
- storing raw provider responses as business cache or authority payload;
- reusing `PaperImplementationProposalArtifact.payload` as the final runtime artifact payload for a promoted slot;
- using `workflow_type` alone to decide whether a runtime artifact is required;
- admitting a final artifact without admitted role artifact lineage;
- allowing Domain Gate to read intermediate role artifacts for state transition decisions.

## Implementation Notes
Recommended first code slice after approval:

1. Create `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts`. Done on 2026-06-03.
2. Add schema tests for the two envelopes and first-slice trace role/final usage. Done on 2026-06-03.
3. Add in-memory repository/service tests for role/final artifact creation and admission records.
4. Add Prisma models only after query needs and migration approval are confirmed.
3. Add in-memory repository interfaces for runtime artifact/admission records.
4. Add runtime service tests using in-memory persistence.
5. Add Prisma migration only after the contract tests prove the envelope shape and queryability needs.
