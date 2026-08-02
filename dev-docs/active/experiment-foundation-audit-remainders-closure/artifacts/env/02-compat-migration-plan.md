# EF-P06 environment compatibility plan

Existing deployments remain disabled with no configuration change. A later rollout may set the flag to `true` only alongside the committed v2 cutover and after the versioned database migration is applied. Rollback disables this flag while preserving already committed typed outcomes and relayable outbox history.
