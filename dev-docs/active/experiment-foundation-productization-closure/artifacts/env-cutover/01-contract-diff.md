# Pack A local cutover environment contract diff

## Added key

- Name: `PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED`
- Type: `bool`
- Required: no
- Secret: no
- Default: `false`

This is additive and default-preserving. Existing deployments keep legacy product writers available and v2 admission disabled until both cutover and admission are explicitly enabled by a separately authorized environment rollout.
