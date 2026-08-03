# Phase 3A Schema Diff Preview

- Add `ExperimentFoundationExplorationSpecV2` identity storage.
- Add immutable `ExperimentFoundationExplorationSpecRevisionV2` content/revision storage.
- Add `ExperimentFoundationExplorationSpecCommandReceiptV2` command-idempotency storage.
- All primary, unique, index and foreign-key names are explicitly pinned below PostgreSQL's identifier limit.
- The first full-history replay also exposed one pre-existing T-134 Phase 2 relation-name drift; the promotion receipt/outbox relation names were shortened and pinned before final verification.
