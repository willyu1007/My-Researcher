# 02 Architecture

## Retrieve Foundation
- One unified index foundation.
- Scenario-specific retrieve profiles adjust weights and filters.

## Trigger UI
- Overview remains the lightweight entry.
- Complex controls go to a detail panel or content-processing workbench.

## Stale
- `STALE` is a first-class stage status.
- Active index remains readable with freshness warning.
- Explicit rerun through `INDEXED` activates a new version.

## DB Boundary
- Retrieve profiles may start as code/config.
- If user-editable profile configs are required, decide DB boundary in detailed design.
