# Architecture Notes

## Interfaces
- Shared contract: TopicProfile DTO and create/update requests include `initial_pull_pending`.
- Backend repository TopicProfileRecord includes `initialPullPending`.
- Prisma TopicProfile persists the new boolean field.

## Runtime behavior
- TOPIC rule execution uses per-topic flag to select `bootstrap_full_range` vs `incremental_lookback`.
- On successful run, participating topics marked `initialPullPending=false`.

## Risks
- Behavior drift for mixed-topic runs (some initial, some incremental).
- Backward compatibility for existing rows without field defaults.
