# API Index

> Auto-generated at 2026-07-26T15:01:51.787Z — do NOT hand-edit.
> Source: `docs/context/api/openapi.yaml` (SHA-256: `6136a7897c1b...`)

Total endpoints: **200**

| Method | Path | Summary | Auth | Input (required) | Output (core) | Errors |
|--------|------|---------|------|------------------|---------------|--------|
| GET | /health | Check service liveness. | none | — | ok | — |
| POST | /paper-implementation/projects/{implementation_project_id}/validation-cycles/{validation_cycle_id}/experiment-work-orders/v2/admissions | Admit one immutable PI experiment WorkOrder revision and its exact ordered cells. | none | branch_key, branch_frame, work_order_revision, exact_cells, business_idempotency_key | branch, revision, cells, admission, replayed | 400, 404, 409, 422, 500 |
| POST | /paper-implementation/validation-cycles/{validation_cycle_id}/closure/v2 | Close one ValidationCycle against an exact server-derived closure watermark. | none | expected_cycle_version, expected_closure_input_hash, closure_kind, accepted_proposal_id, expected_proposal_hash, corrected_scientific_disposition, idempotency_key | closure | 400, 404, 409, 422, 500 |
| GET | /paper-implementation/validation-cycles/{validation_cycle_id}/closure/v2/readiness | Rebuild closure readiness and the exact ValidationCycle closure watermark. | none | validation_cycle_id | schema_version, validation_cycle_id, status, ordered_blockers, watermark, eligible_run_evidence_unit_count | 400, 404, 409, 422, 500 |
| GET | /paper-implementation/projects/{implementation_project_id}/experiment-lineage/validation-cycles | List experiment-lineage summaries for one ImplementationProject. | none | implementation_project_id | implementation_project_id, validation_cycles | 400, 404, 409, 422, 500 |
| GET | /paper-implementation/projects/{implementation_project_id}/validation-cycles/{validation_cycle_id}/experiment-lineage | Read current admitted branch, head Run, Attempt, and collection lineage for one ValidationCycle. | none | implementation_project_id, validation_cycle_id | implementation_project_id, validation_cycle, branches | 400, 404, 409, 422, 500 |
| GET | /paper-implementation/projects/{implementation_project_id}/workorder-branches/{branch_id}/revision-history | Read all admitted and superseded WorkOrder revisions for one experiment branch. | none | implementation_project_id, branch_id | implementation_project_id, validation_cycle_id, branch_id, branch_key, parent_branch_key, history_includes_superseded_revisions, revisions | 400, 404, 409, 422, 500 |
| GET | /paper-implementation/validation-cycles/{validation_cycle_id}/closure/v2/preparation | Prepare the exact no-evidence closure request template for one ValidationCycle. | none | validation_cycle_id | readiness, derived_closure_kind, prepared_request | 400, 404, 409, 422, 500 |
| GET | /paper-implementation/projects/{implementation_project_id}/validation-cycles/{validation_cycle_id}/available-actions | List typed agent actions currently available for one ValidationCycle. | none | implementation_project_id, validation_cycle_id | implementation_project_id, validation_cycle_id, actions, closure | 400, 404, 409, 422, 500 |
| POST | /experiment-foundation/v2/runs/{run_id}/workflow-simulations | Start or exact-replay simulation Attempts for every required Run cell. | none | business_idempotency_key | run_id, run_manifest_hash, business_idempotency_key, provider_payloads, execution_attempts, replayed, workflow_simulation_status | 400, 404, 409, 422, 500 |
| POST | /experiment-foundation/v2/runs/{run_id}/real-provider-executions | Start or exact-replay real-provider Attempts for every required Run cell. | none | business_idempotency_key | run_id, run_manifest_hash, business_idempotency_key, provider_payloads, execution_attempts, replayed | 400, 404, 409, 422, 500 |
| POST | /experiment-foundation/v2/execution-attempts/{attempt_id}/cancel | Persist an idempotent cancellation intent for one simulation Attempt. | none | business_idempotency_key | execution_attempt | 400, 404, 409, 422, 500 |
| POST | /experiment-foundation/v2/execution-attempts/{attempt_id}/reconcile | Enqueue an idempotent manual reconciliation for one simulation Attempt. | none | business_idempotency_key | execution_attempt | 400, 404, 409, 422, 500 |
| GET | /experiment-foundation/v2/execution-attempts/{attempt_id} | Read one simulation Attempt authority record. | none | attempt_id | execution_attempt | 404, 500 |
| GET | /experiment-foundation/v2/runs/{run_id}/workflow-simulation-status | Rebuild the Run workflow simulation status from exact Attempt and collection facts. | none | run_id | run_id, run_manifest_hash, workflow_simulation_status, required_cell_count, terminal_cell_count, collected_cell_count, cells, scientific_execution_status, evidence_eligibility, derived_at | 404, 500 |
| POST | /paper-projects | Create a paper project. | none | title_card_id, title, created_by, initial_context | paper_id, status, paper_active_sp_full, paper_active_sp_partial, created_at | 400, 409, 500 |
| POST | /paper-projects/{id}/version-spine/commit | Commit a version spine node for a paper. | none | lineage_meta, payload_ref, node_status | node_id, accepted, node_status | 400, 409, 500 |
| POST | /paper-projects/{id}/stage-gates/{gate}/verify | Verify stage gate candidates for a paper. | none | candidate_node_ids, config_version, reviewer_mode, analysis_contract | gate_run_id, results, snapshot, pointer_update | 400, 404, 422, 500 |
| POST | /paper-projects/{id}/writing-packages/build | Build a writing package from a snapshot. | none | source_snapshot_id, writing_mode, target_release_tag, sections | writing_package_id, source_snapshot_id, release_tag, section_node_ids, compliance_flags | 400, 404, 409, 500 |
| GET | /paper-projects/{id}/timeline | Get timeline events for a paper. | none | id | paper_id, events | 404, 409, 500 |
| GET | /paper-projects/{id}/resource-metrics | Get runtime resource metrics for a paper. | none | id | paper_id, paper_runtime_metric | 404, 409, 500 |
| GET | /paper-projects/{id}/artifact-bundle | Get artifact bundle URLs for a paper. | none | id | paper_id, artifact_bundle | 404, 409, 500 |
| POST | /paper-projects/{id}/release-gate/review | Submit release gate review decision. | none | reviewers, decision, risk_flags, label_policy | gate_result | 400, 404, 409, 500 |
| POST | /literature/collections/import | Import literature items into repository. | none | items | results | 400, 409, 500 |
| POST | /literature/collections/zotero-import | Import literature from Zotero library. | none | library_type, library_id | imported_count, scope_upserted_count, results, topic_id | 400, 500, 502 |
| POST | /literature/collections/zotero-preview | Fetch Zotero literature candidates for manual review table. | none | library_type, library_id | fetched_count, items | 400, 500, 502 |
| GET | /literature/overview | Get literature overview filtered by topic and/or paper. | none | — | summary, items, topic_id, paper_id | 400, 404, 500 |
| POST | /literature/retrieve | Retrieve relevant literature chunks from active embedding versions. | none | query | items, meta | 400, 500 |
| POST | /literature/clusters/candidates | Generate structured literature duplicate/cluster candidates. | none | — | generated_count, clusters, summary | 400, 500 |
| GET | /literature/clusters | List structured literature clusters and candidate relations. | none | — | items | 400, 500 |
| PATCH | /literature/clusters/{clusterId} | Confirm, reject, split, or edit a literature cluster decision. | none | clusterId | item | 400, 404, 500 |
| GET | /topics/{topicId}/literature-scope | Get literature scope list for a topic. | none | topicId | topic_id, items | 404, 500 |
| POST | /topics/{topicId}/literature-scope | Upsert literature scope actions for a topic. | none | actions | topic_id, items | 400, 404, 500 |
| PATCH | /topics/{topicId}/literature-activation | Batch update topic-level evidence activation. | none | actions | topic_id, items | 400, 404, 500 |
| POST | /paper-projects/{id}/literature-links/from-topic | Sync in-scope topic literature into paper links. | none | topic_id | paper_id, topic_id, linked_count, skipped_count | 400, 404, 500 |
| GET | /paper-projects/{id}/literature | Get literature links under a paper. | none | id | paper_id, items | 404, 500 |
| PATCH | /paper-projects/{id}/literature-links/{linkId} | Update citation status or note of a paper literature link. | none | id, linkId | paper_id, item | 400, 404, 500 |
| GET | /literature/{literatureId}/metadata | Get editable metadata fields of one literature. | none | literatureId | literature_id, canonical_work_key, title, abstract, key_content_digest, updated_at | 404, 500 |
| PATCH | /literature/{literatureId}/metadata | Update literature metadata fields. | none | literatureId | literature_id, canonical_work_key, title, abstract, key_content_digest, authors, year, doi, arxiv_id, rights_class, tags, updated_at | 400, 404, 409, 500 |
| GET | /literature/{literatureId}/content-assets | List local content assets registered for one literature. | none | literatureId | literature_id, items | 404, 500 |
| POST | /literature/{literatureId}/content-assets | Register a local literature content asset reference. | none | local_path | item | 400, 404, 500 |
| POST | /literature/{literatureId}/content-assets/download | Download a remote fulltext asset and register it for one literature. | none | source_url | item | 400, 404, 413, 500, 502 |
| POST | /literature/fulltext-acquisition/dry-runs | Plan a durable fulltext acquisition job without resolver calls, downloads, or writes. | none | — | estimate | 400, 500 |
| GET | /literature/fulltext-acquisition/jobs | List recent durable fulltext acquisition jobs. | none | — | items | 500 |
| POST | /literature/fulltext-acquisition/jobs | Create a durable fulltext acquisition job that resolves and downloads raw fulltext assets. | none | — | job | 400, 500 |
| GET | /literature/fulltext-acquisition/jobs/{jobId} | Get a durable fulltext acquisition job with item checkpoints. | none | jobId | job | 404, 500 |
| DELETE | /literature/fulltext-acquisition/jobs/{jobId} | Delete a paused or terminal durable fulltext acquisition job and its item checkpoints. | none | jobId | — | 404, 409, 500 |
| POST | /literature/fulltext-acquisition/jobs/{jobId}/pause | Pause a durable fulltext acquisition job after in-flight downloads settle. | none | jobId | job | 400, 404, 500 |
| POST | /literature/fulltext-acquisition/jobs/{jobId}/resume | Resume a paused durable fulltext acquisition job. | none | jobId | job | 400, 404, 500 |
| POST | /literature/fulltext-acquisition/jobs/{jobId}/cancel | Cancel a durable fulltext acquisition job and stop scheduling new downloads. | none | jobId | job | 400, 404, 500 |
| POST | /literature/fulltext-acquisition/jobs/{jobId}/retry-failed | Requeue retryable failed fulltext acquisition items. | none | jobId | job | 400, 404, 500 |
| GET | /literature/{literatureId}/content-processing | Get content-processing aggregate state and stage states for a literature. | none | literatureId | literature_id, state, stage_states | 404, 500 |
| GET | /literature/{literatureId}/content-processing/key-content-curation-bundle | Export source-grounded inputs for Codex/manual key-content curation. | none | literatureId | literature_id, title, authors, year, abstract, abstract_profile, document, sections, paragraphs, anchors, source_refs, export_policy | 400, 404, 500 |
| POST | /literature/{literatureId}/content-processing/key-content-dossier | Import a Codex/manual curated key-content dossier as KEY_CONTENT_READY. | none | curation_source, dossier | literature_id, artifact_id, readiness_status, checksum, display_digest, source, diagnostics, state | 400, 404, 500 |
| POST | /literature/{literatureId}/content-processing/key-content-dossier/dry-run | Validate a Codex/manual curated key-content dossier without mutating KEY_CONTENT_READY. | none | curation_source, dossier | literature_id, valid, readiness_status, checksum, display_digest, source, issues, diagnostics, repaired_source_ref_count, would_mark_downstream_stale | 400, 404, 409, 500 |
| GET | /literature/{literatureId}/content-processing/runs | List content-processing runs for one literature. | none | literatureId | literature_id, items | 404, 500 |
| POST | /literature/{literatureId}/content-processing/runs | Trigger a content-processing run for one literature. | none | literatureId | run | 400, 404, 500 |
| POST | /literature/content-processing/backfill/dry-runs | Plan a durable content-processing backfill without provider calls or writes. | none | — | estimate | 400, 500 |
| GET | /literature/content-processing/backfill/jobs | List recent durable content-processing backfill jobs. | none | — | items | 500 |
| POST | /literature/content-processing/backfill/jobs | Create a durable content-processing backfill job. | none | — | job | 400, 500 |
| GET | /literature/content-processing/backfill/jobs/{jobId} | Get a durable content-processing backfill job with item checkpoints. | none | jobId | job | 404, 500 |
| DELETE | /literature/content-processing/backfill/jobs/{jobId} | Delete a non-active durable content-processing backfill job and its item checkpoints. | none | jobId | — | 404, 409, 500 |
| POST | /literature/content-processing/backfill/jobs/{jobId}/pause | Pause a durable content-processing backfill job after in-flight stages settle. | none | jobId | job | 400, 404, 500 |
| POST | /literature/content-processing/backfill/jobs/{jobId}/resume | Resume a paused durable content-processing backfill job. | none | jobId | job | 400, 404, 500 |
| POST | /literature/content-processing/backfill/jobs/{jobId}/cancel | Cancel a durable content-processing backfill job and stop scheduling new stages. | none | jobId | job | 400, 404, 500 |
| POST | /literature/content-processing/backfill/jobs/{jobId}/retry-failed | Requeue retryable failed items in a durable content-processing backfill job. | none | jobId | job | 400, 404, 500 |
| POST | /literature/content-processing/cleanup/dry-runs | Plan cleanup candidates for non-active content-processing indexes without deleting data. | none | — | generated_at, retention_days, candidate_count, protected_active_version_count, protected_raw_asset_count, estimated_chunks_to_remove, estimated_token_indexes_to_remove, candidates | 400, 500 |
| GET | /settings/literature-acquisition | Get OA resolver, downloader, source throttle, and quality scorer settings for literature acquisition. | none | — | unpaywall, downloader, source_throttle, quality_scorer, updated_at | 500 |
| PATCH | /settings/literature-acquisition | Update OA resolver, downloader, source throttle, and quality scorer settings for literature acquisition. | none | — | unpaywall, downloader, source_throttle, quality_scorer, updated_at | 400, 500 |
| GET | /settings/literature-content-processing | Get redacted provider, extraction profile, embedding profile, and storage root settings for literature content processing. | none | — | providers, embedding, extraction, storage_roots, effective_storage_roots, fulltext_parser, updated_at | 500 |
| PATCH | /settings/literature-content-processing | Update provider API key, extraction profile, embedding profile, and storage root settings for literature content processing. | none | — | providers, embedding, extraction, storage_roots, effective_storage_roots, fulltext_parser, updated_at | 400, 500 |
| GET | /settings/literature-content-processing/fulltext-parser/health | Check the configured GROBID fulltext parser health for literature content processing. | none | — | provider, endpoint_url, status, checked_at, version, details | 500 |
| GET | /topics/settings | List topic profiles. | none | — | items | 500 |
| POST | /topics/settings | Create a topic profile. | none | topic_id, name | topic_id, name, is_active, include_keywords, exclude_keywords, venue_filters, default_lookback_days, default_min_year, default_max_year, rule_ids, created_at, updated_at | 400, 409, 500 |
| PATCH | /topics/settings/{topicId} | Update a topic profile. | none | topicId | topic_id, name, is_active, include_keywords, exclude_keywords, venue_filters, default_lookback_days, default_min_year, default_max_year, rule_ids, created_at, updated_at | 400, 404, 500 |
| GET | /auto-pull/rules | List auto-pull rules by filters. | none | — | items | 500 |
| POST | /auto-pull/rules | Create an auto-pull rule. | none | scope, name, sources, schedules | rule_id, scope, topic_id, topic_ids, name, status, query_spec, time_spec, quality_spec, sources, schedules, created_at, updated_at | 400, 404, 409, 500 |
| PATCH | /auto-pull/rules/{ruleId} | Update an auto-pull rule. | none | ruleId | rule_id, scope, topic_id, topic_ids, name, status, query_spec, time_spec, quality_spec, sources, schedules, created_at, updated_at | 400, 404, 500 |
| DELETE | /auto-pull/rules/{ruleId} | Delete an auto-pull rule. | none | ruleId | — | 400, 404, 500 |
| POST | /auto-pull/rules/{ruleId}/runs | Trigger a run for a rule. | none | ruleId | run_id, rule_id, trigger_type, status, started_at, finished_at, summary, error_code, error_message, created_at, updated_at, source_attempts, suggestions | 400, 404, 500 |
| POST | /auto-pull/runs/{runId}/retry-failed-sources | Retry failed sources from a previous run. | none | runId | run_id, rule_id, trigger_type, status, started_at, finished_at, summary, error_code, error_message, created_at, updated_at, source_attempts, suggestions | 400, 404, 500 |
| GET | /auto-pull/runs | List auto-pull runs by filters. | none | — | items | 500 |
| GET | /auto-pull/runs/{runId} | Get auto-pull run detail. | none | runId | run_id, rule_id, trigger_type, status, started_at, finished_at, summary, error_code, error_message, created_at, updated_at, source_attempts, suggestions | 404, 500 |
| GET | /auto-pull/alerts | List auto-pull alerts by filters. | none | — | items | 500 |
| POST | /auto-pull/alerts/{alertId}/ack | Acknowledge an alert. | none | alertId | alert_id, rule_id, run_id, source, level, code, message, detail, ack_at, created_at | 404, 500 |
| GET | /title-cards | List title cards and workbench summary. | none | — | — | — |
| POST | /title-cards | Create a title card root object. | none | — | — | — |
| GET | /title-cards/{titleCardId} | Get a single title card workbench summary. | none | titleCardId | — | — |
| PATCH | /title-cards/{titleCardId} | Patch the current title card record. | none | titleCardId | — | — |
| GET | /title-cards/{titleCardId}/evidence-basket | Get the persisted evidence basket for a title card. | none | titleCardId | — | — |
| PATCH | /title-cards/{titleCardId}/evidence-basket | Add or remove literature ids from the title-card evidence basket. | none | titleCardId | — | — |
| GET | /title-cards/{titleCardId}/evidence-candidates | Browse global evidence candidates for a title card. | none | titleCardId | — | — |
| GET | /title-cards/{titleCardId}/needs | List need reviews for a title card. | none | titleCardId | — | — |
| POST | /title-cards/{titleCardId}/needs | Persist a need review for a title card. | none | titleCardId | — | — |
| GET | /title-cards/{titleCardId}/needs/{needId} | Get a single need review. | none | titleCardId, needId | — | — |
| PATCH | /title-cards/{titleCardId}/needs/{needId} | Patch the current need review. | none | titleCardId, needId | — | — |
| GET | /title-cards/{titleCardId}/research-questions | List research questions for a title card. | none | titleCardId | — | — |
| POST | /title-cards/{titleCardId}/research-questions | Create a research question for a title card. | none | titleCardId | — | — |
| GET | /title-cards/{titleCardId}/research-questions/{researchQuestionId} | Get a research question detail. | none | titleCardId, researchQuestionId | — | — |
| PATCH | /title-cards/{titleCardId}/research-questions/{researchQuestionId} | Patch the current research question. | none | titleCardId, researchQuestionId | — | — |
| GET | /title-cards/{titleCardId}/value-assessments | List value assessments for a title card. | none | titleCardId | — | — |
| POST | /title-cards/{titleCardId}/value-assessments | Create a value assessment for a title card. | none | titleCardId | — | — |
| GET | /title-cards/{titleCardId}/value-assessments/{valueAssessmentId} | Get a value assessment detail. | none | titleCardId, valueAssessmentId | — | — |
| PATCH | /title-cards/{titleCardId}/value-assessments/{valueAssessmentId} | Patch the current value assessment. | none | titleCardId, valueAssessmentId | — | — |
| GET | /title-cards/{titleCardId}/packages | List packages for a title card. | none | titleCardId | — | — |
| POST | /title-cards/{titleCardId}/packages | Create a package for a title card. | none | titleCardId | — | — |
| GET | /title-cards/{titleCardId}/packages/{packageId} | Get a package detail. | none | titleCardId, packageId | — | — |
| PATCH | /title-cards/{titleCardId}/packages/{packageId} | Patch the current package. | none | titleCardId, packageId | — | — |
| GET | /title-cards/{titleCardId}/promotion-decisions | List promotion decisions for a title card. | none | titleCardId | — | — |
| POST | /title-cards/{titleCardId}/promotion-decisions | Create a promotion decision for a title card. | none | titleCardId | — | — |
| GET | /title-cards/{titleCardId}/promotion-decisions/{decisionId} | Get a promotion decision detail. | none | titleCardId, decisionId | — | — |
| PATCH | /title-cards/{titleCardId}/promotion-decisions/{decisionId} | Patch the current promotion decision. | none | titleCardId, decisionId | — | — |
| POST | /title-cards/{titleCardId}/promote-to-paper-project | Promote a title card into a paper project using aligned question, value, and package ids. | none | titleCardId | — | 400, 404, 409, 422 |
| POST | /topic-selection/v1a/topic-seeds/from-title-card | Create a v1a TopicSeed from a title card. | none | title_card_id | — | 400, 404, 409, 500 |
| POST | /topic-selection/v1a/literature-resource-pool-snapshots | Create a v1a literature resource pool snapshot from the title-card evidence basket. | none | title_card_id, topic_seed_id | — | 400, 404, 409, 500 |
| POST | /topic-selection/v1a/search-plans | Create a v1a SearchPlan with coverage row intents. | none | title_card_id, topic_seed_id, literature_resource_pool_snapshot_id, query_intents | search_plan, coverage_row_intents | 400, 404, 409, 500 |
| POST | /topic-selection/v1a/search-runs | Record a v1a SearchRun and associated coverage records. | none | title_card_id, search_plan_id, result_accounting, source_health_summary, evidence_map_input_refs | search_run, observations, evidence_bindings, assessments, risk_acceptances | 400, 404, 409, 500 |
| GET | /topic-selection/v1a/search-plans/{searchPlanId}/coverage-matrix | Render the SearchPlan coverage matrix view. | none | searchPlanId | — | 404, 500 |
| POST | /topic-selection/v1a/search-plan-recheck-requests | Create a SearchPlan recheck request. | none | title_card_id, source_ref, target_search_plan_id, reason | — | 400, 404, 409 |
| POST | /topic-selection/v1a/search-plan-recheck-requests/{requestId}/resolve | Resolve a SearchPlan recheck request. | none | outcome, decision_summary | — | 400, 404, 409 |
| POST | /topic-selection/v1a/search-plan-recheck-requests/{requestId}/queue | Interpret a SearchPlan recheck request into the decision work queue. | none | requestId | event, impact, queue_item | 404, 409 |
| POST | /topic-selection/v1a/evidence-maps | Create a claim-level EvidenceMap from a SearchRun. | none | title_card_id, search_run_id, evidence_units | evidence_map, evidence_units | 400, 404, 409 |
| GET | /topic-selection/v1a/evidence-maps/{evidenceMapId}/need-validation-bundle | Read the evidence bundle consumed by need validation. | none | evidenceMapId | — | 404 |
| POST | /topic-selection/v1a/evidence-strength-assessments | Assess evidence strength for a v1a target ref. | none | evidence_map_id, target_ref, purpose, role_bundle, assessment_workflow_version | — | 400, 404, 409 |
| POST | /topic-selection/v1a/evidence-maps/{evidenceMapId}/stale | Mark an EvidenceMap stale or recheck-required. | none | stale_reason_codes | — | 404 |
| POST | /topic-selection/v1a/need-candidates | Create a NeedCandidate hypothesis from an EvidenceMap. | none | title_card_id, evidence_map_id, candidate_need | — | 400, 404, 409 |
| POST | /topic-selection/v1a/need-candidates/{needCandidateId}/readiness-assessments | Assess whether a NeedCandidate is ready for human validation. | none | needCandidateId | — | 404, 409 |
| POST | /topic-selection/v1a/validation-support-packets | Create a ValidationDecisionSupportPacket for human validation. | none | need_candidate_id | — | 400, 404, 409 |
| POST | /topic-selection/v1a/need-candidates/{needCandidateId}/adjudications | Record the human adjudication result for a NeedCandidate. | none | support_packet_id, final_decision, rationale | adjudication_result, need_candidate, validated_need, memory_suggestion, v1b_input_bundle | 400, 404, 409 |
| POST | /topic-selection/v1a/v1b-input-bundles | Publish a v1b input bundle from a ValidatedNeed. | none | validated_need_id | — | 404, 409 |
| POST | /topic-selection/v1a/quality-signals | Emit a raw QualitySignal for later policy interpretation. | none | target_ref, stage, check_type, verdict | — | 400 |
| POST | /topic-selection/v1a/quality-signals/{qualitySignalId}/interpret | Interpret a QualitySignal into durable recheck/risk/queue state. | none | qualitySignalId | event, impact, queue_item | 404 |
| POST | /topic-selection/v1a/candidate-memory-suggestions/{memorySuggestionId}/materialize | Materialize a candidate memory suggestion into durable decision memory. | none | memorySuggestionId | memory_entry, candidate_memory | 404, 409 |
| POST | /topic-selection/v1a/accepted-risks | Record a human accepted risk for a v1a target ref. | none | risk_type, target_ref, scope_refs, rationale, accepted_by | — | 400, 409 |
| GET | /topic-selection/v1a/work-queue/open | List open v1a decision work queue items. | none | — | items | — |
| GET | /topic-selection/v1a/title-cards/{titleCardId}/search-plans | List v1a SearchPlans for a title-card (T-087 D1 reviewer workbench projection). | none | titleCardId | items | — |
| GET | /topic-selection/v1a/title-cards/{titleCardId}/evidence-maps | List v1a EvidenceMaps for a title-card (T-087 D1 reviewer workbench projection). | none | titleCardId | items | — |
| GET | /topic-selection/v1a/title-cards/{titleCardId}/need-candidates | List v1a NeedCandidates for a title-card (T-087 D1 reviewer workbench projection). | none | titleCardId | items | — |
| GET | /topic-selection/v1a/title-cards/{titleCardId}/validated-needs | List v1a ValidatedNeeds for a title-card (T-087 D1 reviewer workbench projection). | none | titleCardId | items | — |
| GET | /topic-selection/v1a/need-candidates/{needCandidateId}/validation-support-packets | List validation-decision support packets for a need candidate (T-087 Phase 2.5 picker driver). | none | needCandidateId | items | — |
| GET | /topic-selection/v1a/need-candidates/{needCandidateId}/memory-suggestions | List candidate-decision memory suggestions for a need candidate (T-087 Phase 2.4 negative-memory inline display). | none | needCandidateId | items | — |
| GET | /topic-selection/v1a/title-cards/{titleCardId}/search-plan-recheck-requests | List SearchPlan recheck requests for a title-card (T-087 Phase 2.2 reviewer workbench inline list). | none | titleCardId | items | — |
| GET | /topic-selection/v1a/evidence-maps/{evidenceMapId}/units | List EvidenceUnits for an EvidenceMap (T-087 Phase 2.3 drilldown driver). | none | evidenceMapId | items | — |
| POST | /topic-selection/v1a/offline-evaluation/datasets | Create a v1a offline evaluation dataset. | none | — | — | 400 |
| POST | /topic-selection/v1a/offline-evaluation/datasets/synthetic-baseline | Create the synthetic v1a offline evaluation baseline dataset. | none | — | dataset, cases | 400 |
| POST | /topic-selection/v1a/offline-evaluation/cases | Add a frozen case to a v1a offline evaluation dataset. | none | dataset_id, case_key, case_type, frozen_input_bundle, gold_expectation | — | 400, 404 |
| POST | /topic-selection/v1a/offline-evaluation/runs | Start a v1a offline evaluation run. | none | dataset_id, workflow_profile_key | — | 400, 404, 409 |
| POST | /topic-selection/v1a/offline-evaluation/case-results | Record a frozen case result and replay diff. | none | run_id, case_id, observed_output | case_result, replay_diff | 400, 404, 409 |
| POST | /topic-selection/v1a/offline-evaluation/runs/{runId}/complete | Complete an offline evaluation run and calculate metrics. | none | runId | run, metric_results | 404, 409 |
| GET | /topic-selection/v1a/offline-evaluation/runs/{runId}/metric-results | List metric results for a v1a offline evaluation run. | none | runId | items | 404 |
| GET | /topic-selection/v1a/offline-evaluation/runs/{runId}/replay-diffs | List replay diffs for a v1a offline evaluation run. | none | runId | items | 404 |
| POST | /topic-selection/v1b/workflow-harness/nodes/{nodeId}/invocations | Invoke one canonical v1b workflow harness node. | none | schema_version, workflow_run_id, node_attempt_id, node_id, policy_version, frozen_input | schema_version, node_id, workflow_run_id, node_attempt_id, gate_status, failure_class, route_decision, replay_identity, hashes, blockers, warnings, authority_ref, handoff_ref, gate_result_ref, transition_attempt_ref, trace_snapshot_ref, harness_trace_artifact_ref, replay_provenance, error_code, error_message | 400, 404, 409, 422 |
| POST | /topic-selection/v1b/workflow-harness/artifacts | Record an artifact reference for v1b harness inputs, support outputs, traces, and handoffs. | none | artifact_kind | artifact_ref_id, artifact_kind, storage_kind, created_by, created_at, workspace_id, title_card_id, uri, payload, checksum, byte_size, mime_type, workflow_run_id, input_snapshot_id | 400 |
| GET | /topic-selection/v1b/workflow-harness/artifacts/{artifactRefId} | Read a v1b harness artifact reference. | none | artifactRefId | artifact_ref_id, artifact_kind, storage_kind, created_by, created_at, workspace_id, title_card_id, uri, payload, checksum, byte_size, mime_type, workflow_run_id, input_snapshot_id | 404 |
| GET | /topic-selection/v1b/title-cards/{titleCardId}/research-slice-option-sets | List ResearchSliceOptionSets under a title-card (T-087 Phase 3.1 read-only projection). | none | titleCardId | items | — |
| GET | /topic-selection/v1b/title-cards/{titleCardId}/topic-question-candidate-sets | List TopicQuestionCandidateSets under a title-card (T-087 Phase 3.1 read-only projection). | none | titleCardId | items | — |
| GET | /topic-selection/v1b/title-cards/{titleCardId}/topic-value-assessments | List TopicValueAssessments under a title-card (T-087 Phase 3.1 read-only projection). | none | titleCardId | items | — |
| GET | /topic-selection/v1b/title-cards/{titleCardId}/topic-packages | List TopicPackage(draft) under a title-card (T-087 Phase 3.1 read-only projection). | none | titleCardId | items | — |
| GET | /topic-selection/v1b/research-slice-option-sets/{optionSetId}/options | List ResearchSliceOptions for an OptionSet (T-087 Phase 3.2 selection picker driver). | none | optionSetId | items | — |
| GET | /topic-selection/v1b/topic-question-candidate-sets/{candidateSetId}/candidates | List TopicQuestionCandidates for a CandidateSet (T-087 Phase 3.3 selection picker driver). | none | candidateSetId | items | — |
| GET | /topic-selection/v1b/topic-packages/{topicPackageId} | Read a TopicPackage draft. | none | topicPackageId | — | 404 |
| POST | /topic-selection/v1b/offline-evaluation/datasets | Create a v1b offline evaluation dataset. | none | — | — | 400 |
| POST | /topic-selection/v1b/offline-evaluation/datasets/synthetic-baseline | Create the synthetic v1b offline evaluation baseline dataset. | none | — | dataset, cases | 400 |
| POST | /topic-selection/v1b/offline-evaluation/cases | Add a frozen v1b replay case to an offline evaluation dataset. | none | dataset_id, case_key, case_type, frozen_input_bundle, gold_expectation | — | 400, 404 |
| POST | /topic-selection/v1b/offline-evaluation/runs | Start a v1b offline evaluation replay run. | none | dataset_id, workflow_profile_key | — | 400, 404, 409 |
| POST | /topic-selection/v1b/offline-evaluation/case-results | Record a frozen v1b replay case result and diff. | none | run_id, case_id, observed_output | case_result, replay_diff | 400, 404, 409 |
| POST | /topic-selection/v1b/offline-evaluation/runs/{runId}/complete | Complete a v1b offline evaluation run and calculate metrics. | none | runId | run, metric_results | 404, 409 |
| GET | /topic-selection/v1b/offline-evaluation/runs/{runId}/metric-results | List metric results for a v1b offline evaluation run. | none | runId | items | 404 |
| GET | /topic-selection/v1b/offline-evaluation/runs/{runId}/replay-diffs | List replay diffs for a v1b offline evaluation run. | none | runId | items | 404 |
| GET | /topic-selection/v1c/title-cards/{titleCardId}/promotion-gate-checks | List PromotionGateChecks under a title-card (T-087 Phase 4 read-only projection). | none | titleCardId | items | — |
| GET | /topic-selection/v1c/title-cards/{titleCardId}/promotion-decisions | List PromotionDecisions under a title-card (T-087 Phase 4 read-only projection). | none | titleCardId | items | — |
| GET | /topic-selection/v1c/title-cards/{titleCardId}/paper-project-bridges | List PaperProjectBridges under a title-card (T-087 Phase 4 read-only projection). | none | titleCardId | items | — |
| POST | /topic-selection/v1c/promotion-input-snapshots | Create a v1c PromotionInputSnapshot from a ready v1b-to-v1c input bundle. | none | v1b_to_v1c_input_bundle_id | — | 400, 404, 409 |
| GET | /topic-selection/v1c/promotion-input-snapshots/{snapshotId} | Read a v1c PromotionInputSnapshot. | none | snapshotId | — | 404 |
| POST | /topic-selection/v1c/promotion-decision-support | Create N2 promotion decision support and dossier. | none | promotion_input_snapshot_id | promotion_decision_support, promotion_dossier | 400, 404, 409 |
| POST | /topic-selection/v1c/promotion-gate-checks | Create N3 promotion gate check from existing support. | none | — | promotion_decision_support, promotion_dossier, argument_readiness_mini_check, promotion_gate_check, handoff | 400, 404, 409 |
| GET | /topic-selection/v1c/promotion-decision-support/{supportId} | Read PromotionDecisionSupport. | none | supportId | — | 404 |
| GET | /topic-selection/v1c/promotion-dossiers/{dossierId} | Read PromotionDossier. | none | dossierId | — | 404 |
| GET | /topic-selection/v1c/argument-readiness-mini-checks/{miniCheckId} | Read ArgumentReadinessMiniCheck. | none | miniCheckId | — | 404 |
| GET | /topic-selection/v1c/promotion-gate-checks/{gateCheckId} | Read PromotionGateCheck. | none | gateCheckId | — | 404 |
| POST | /topic-selection/v1c/promotion-decisions | Record explicit human promotion decision. | none | promotion_gate_check_id, decision, human_actor, rationale, confirmed_snapshot_hash | human_promotion_decision, promotion_decision, promotion_commitment_profile, bridge_handoff | 400, 404, 409 |
| GET | /topic-selection/v1c/human-promotion-decisions/{humanPromotionDecisionId} | Read HumanPromotionDecision. | none | humanPromotionDecisionId | — | 404 |
| GET | /topic-selection/v1c/promotion-decisions/{promotionDecisionId} | Read PromotionDecision. | none | promotionDecisionId | — | 404 |
| GET | /topic-selection/v1c/promotion-decisions/{promotionDecisionId}/bundle | Read PromotionDecision bundle. | none | promotionDecisionId | human_promotion_decision, promotion_decision, promotion_commitment_profile | 404 |
| GET | /topic-selection/v1c/promotion-commitment-profiles/{commitmentProfileId} | Read PromotionCommitmentProfile. | none | commitmentProfileId | — | 404 |
| POST | /topic-selection/v1c/paper-project-bridges | Create a PaperProjectBridge from a human-confirmed promote decision. | none | promotion_decision_id | paper_project_bridge, handoff | 400, 404, 409 |
| GET | /topic-selection/v1c/paper-project-bridges/{bridgeId} | Read PaperProjectBridge. | none | bridgeId | — | 404 |
| POST | /topic-selection/v1c/downstream-feedback | Record downstream topic feedback and optional embedded recheck request. | none | paper_project_bridge_id, downstream_source_kind, downstream_source_ref, feedback_signal, severity, summary | downstream_topic_feedback, classification, recheck_request, impact_summary | 400, 404, 409 |
| GET | /topic-selection/v1c/downstream-feedback/{feedbackId} | Read downstream topic feedback. | none | feedbackId | — | 404 |
| GET | /topic-selection/v1c/paper-project-bridges/{bridgeId}/downstream-feedback | List downstream feedback for a PaperProjectBridge. | none | bridgeId | items | 404 |
| GET | /topic-selection/v1c/downstream-feedback/{feedbackId}/recheck-request | Read the embedded downstream recheck request projection for one feedback record. | none | feedbackId | downstream_topic_feedback, recheck_request | 404 |
| GET | /topic-selection/v1c/recheck-requests/{recheckRequestId} | Read a downstream recheck request projection by embedded recheck id. | none | recheckRequestId | downstream_topic_feedback, recheck_request | 404 |
| POST | /topic-selection/v1c/offline-evaluation/datasets | Create a v1c offline evaluation dataset; route forces stage v1c. | none | — | — | 400 |
| POST | /topic-selection/v1c/offline-evaluation/datasets/synthetic-baseline | Create the synthetic v1c offline evaluation baseline dataset. | none | — | dataset, cases | 400 |
| POST | /topic-selection/v1c/offline-evaluation/cases | Add a frozen v1c replay case to an offline evaluation dataset. | none | dataset_id, case_key, case_type, frozen_input_bundle, gold_expectation | — | 400, 404 |
| POST | /topic-selection/v1c/offline-evaluation/runs | Start a v1c offline evaluation replay run. | none | dataset_id, workflow_profile_key | — | 400, 404, 409 |
| POST | /topic-selection/v1c/offline-evaluation/case-results | Record a frozen v1c replay case result and diff. | none | run_id, case_id, observed_output | case_result, replay_diff | 400, 404, 409 |
| POST | /topic-selection/v1c/offline-evaluation/runs/{runId}/complete | Complete a v1c offline evaluation run and calculate metrics. | none | runId | run, metric_results | 404, 409 |
| GET | /topic-selection/v1c/offline-evaluation/runs/{runId}/metrics | List metric results for a v1c offline evaluation run. | none | runId | items | 404 |
| GET | /topic-selection/v1c/offline-evaluation/runs/{runId}/diffs | List replay diffs for a v1c offline evaluation run. | none | runId | items | 404 |
