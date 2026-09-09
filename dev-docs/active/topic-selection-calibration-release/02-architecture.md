# Architecture

## Context and current state
T-129 is a superseded control record. T-153 owns the current Codex execution and qualification
route; current topic-selection runtime and `.ai/llm` files remain implementation authorities.

## Settled design and boundaries
- Calibration remains optional and advisory under D-30.
- Codex prompt qualification uses actual role inputs and failure cases under T-153; the former blanket corpus dependency does not govern Codex implementation.
- Other provider activation remains deferred and its existing dormancy guards remain authoritative.
- No model profile is enabled merely by transferring task ownership.
- Original C-2/C-3 were not completed by this supersession.

## Interfaces and contracts
No runtime interface is owned or changed by this record transition. The successor obligation map
is `dev-docs/active/topic-selection-codex-product-workflow/00-roadmap.md`; persisted runtime,
Human decisions and historical provider artifacts retain their original provenance.
