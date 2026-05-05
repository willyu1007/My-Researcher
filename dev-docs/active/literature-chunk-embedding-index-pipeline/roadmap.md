# Roadmap

## Objective
- Make literature content durably vectorized and locally indexable.

## Milestones
1. Current runtime inventory.
2. Deterministic chunker.
3. OpenAI embedding provider.
4. Local index build and active pointer activation.
5. Verification and scale estimates.

## Test And Acceptance Baseline
- New versions can be built without breaking old active retrieval.
- Failed embedding/index runs do not mutate active pointer.
