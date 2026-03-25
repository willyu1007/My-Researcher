# API Index

> Auto-generated at 2026-03-25T03:58:47.013Z — do NOT hand-edit.
> Source: `docs/context/api/openapi.yaml` (SHA-256: `8563d0355ac8...`)

Total endpoints: **65**

| Method | Path | Summary | Auth | Input (required) | Output (core) | Errors |
|--------|------|---------|------|------------------|---------------|--------|
| GET | /health | Check service liveness. | none | — | ok | — |
| POST | /paper-projects | Create a paper project. | none | topic_id, title, created_by, initial_context | paper_id, status, paper_active_sp_full, paper_active_sp_partial, created_at | 400, 409, 500 |
| POST | /paper-projects/{id}/version-spine/commit | Commit a version spine node for a paper. | none | lineage_meta, payload_ref, node_status | node_id, accepted, node_status | 400, 409, 500 |
| POST | /paper-projects/{id}/stage-gates/{gate}/verify | Verify stage gate candidates for a paper. | none | candidate_node_ids, config_version, reviewer_mode, analysis_contract | gate_run_id, results, snapshot, pointer_update | 400, 404, 422, 500 |
| POST | /paper-projects/{id}/writing-packages/build | Build a writing package from a snapshot. | none | source_snapshot_id, writing_mode, target_release_tag, sections | writing_package_id, source_snapshot_id, release_tag, section_node_ids, compliance_flags | 400, 404, 409, 500 |
| GET | /paper-projects/{id}/timeline | Get timeline events for a paper. | none | id | paper_id, events | 404, 409, 500 |
| GET | /paper-projects/{id}/resource-metrics | Get runtime resource metrics for a paper. | none | id | paper_id, paper_runtime_metric | 404, 409, 500 |
| GET | /paper-projects/{id}/artifact-bundle | Get artifact bundle URLs for a paper. | none | id | paper_id, artifact_bundle | 404, 409, 500 |
| POST | /paper-projects/{id}/release-gate/review | Submit release gate review decision. | none | reviewers, decision, risk_flags, label_policy | gate_result | 400, 404, 409, 500 |
| POST | /literature/import | Import literature items into repository. | none | items | results | 400, 409, 500 |
| POST | /literature/zotero-import | Import literature from Zotero library. | none | library_type, library_id | imported_count, scope_upserted_count, results, topic_id | 400, 500, 502 |
| POST | /literature/zotero-preview | Fetch Zotero literature candidates for manual review table. | none | library_type, library_id | fetched_count, items | 400, 500, 502 |
| GET | /literature/overview | Get literature overview filtered by topic and/or paper. | none | — | summary, items, topic_id, paper_id | 400, 404, 500 |
| POST | /literature/retrieve | Retrieve relevant literature chunks from active embedding versions. | none | query | items, meta | 400, 500 |
| GET | /topics/{topicId}/literature-scope | Get literature scope list for a topic. | none | topicId | topic_id, items | 404, 500 |
| POST | /topics/{topicId}/literature-scope | Upsert literature scope actions for a topic. | none | actions | topic_id, items | 400, 404, 500 |
| POST | /paper-projects/{id}/literature-links/from-topic | Sync in-scope topic literature into paper links. | none | topic_id | paper_id, topic_id, linked_count, skipped_count | 400, 404, 500 |
| GET | /paper-projects/{id}/literature | Get literature links under a paper. | none | id | paper_id, items | 404, 500 |
| PATCH | /paper-projects/{id}/literature-links/{linkId} | Update citation status or note of a paper literature link. | none | id, linkId | paper_id, item | 400, 404, 500 |
| GET | /literature/{literatureId}/metadata | Get editable metadata fields of one literature. | none | literatureId | literature_id, title, abstract, key_content_digest, updated_at | 404, 500 |
| PATCH | /literature/{literatureId}/metadata | Update literature metadata fields. | none | literatureId | literature_id, title, abstract, key_content_digest, authors, year, doi, arxiv_id, rights_class, tags, updated_at | 400, 404, 409, 500 |
| GET | /literature/{literatureId}/pipeline | Get pipeline aggregate state and stage states for a literature. | none | literatureId | literature_id, state, stage_states | 404, 500 |
| GET | /literature/{literatureId}/pipeline/runs | List pipeline runs for one literature. | none | literatureId | literature_id, items | 404, 500 |
| POST | /literature/{literatureId}/pipeline/runs | Trigger a pipeline run for one literature. | none | literatureId | run | 400, 404, 500 |
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
