# 02 Architecture

## Contract Boundary
| Item | Contract |
|---|---|
| Input objects | `TopicSelectionPaperProjectBridgeHandoff`, promotion decision refs, package/title-card refs, hashes |
| Output objects | `ImplementationIntakeSnapshot`, `ImplementationProject`, `ImplementationFeedbackEvent`, optional `target_paper_project_ref` |
| Authority writer | `PaperImplementationIntakeBootstrapService` |
| Gates | active upstream bridge, hash match, source completeness, duplicate/idempotency check, upstream feedback no-overwrite check |
| Trace | intake snapshot source refs and payload hashes |
| Handoff | T-094 receives `implementation_project`, `intake_snapshot`, and `handoff_to_motive` |

## Required Source Refs
- `paper_project_bridge_id`
- `bridge_payload_hash`
- `promotion_decision_id`
- `promotion_commitment_profile_id`
- `promotion_input_snapshot_id`
- `promotion_input_snapshot_hash`
- `topic_package_id`
- `package_version`
- `title_card_id`
- `working_copy_payload_hash`

## Key Risk
Treating bridge ids as authority roots would recreate the semantic drift D2 rejected.

## Upstream Feedback Boundary
- `ImplementationFeedbackEvent` records implementation findings that require topic-selection recheck.
- Event types include infeasible route, unavailable data, invalidated evidence, lower claim ceiling, topic question not answerable, and research slice too broad.
- The event is stored append-only in PaperImplementation and forwarded to topic-selection downstream feedback as `downstream_source_kind: "paper_implementation"`.
- The event is a request/read-model input for topic selection; it is not a write to upstream authority objects.

## Persisted Authorities
- `PaperImplementationIntakeSnapshot`
- `PaperImplementationProject`
- `PaperImplementationFeedbackEvent`

## REST Surface
- `POST /paper-implementation/projects/bootstrap`
- `GET /paper-implementation/projects/:implementation_project_id`
- `GET /paper-implementation/projects/by-bridge/:paper_project_bridge_id`
- `POST /paper-implementation/projects/:implementation_project_id/feedback-events`
