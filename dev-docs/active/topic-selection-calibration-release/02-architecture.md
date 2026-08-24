# Architecture

## Context and current state
T-129 is a deferred control record, not an active runtime subsystem. Current topic-selection code owns the N6/N8 prompt, debate, provenance, run-mode, execution-spec, and dormancy guards.

## Settled design and boundaries
- Calibration thresholds are advisory routing heuristics; synthetic runs cannot authorize adoption.
- C-2 owns product-ready prompt content and stable drift anchors after real-corpus qualification.
- C-3 changes dormancy only together with live role outputs, gate-bridge provenance, provider run mode, and execution-spec handling.
- Incomplete activation remains fail-closed.

## Interfaces and contracts
The implementation interfaces are the current topic-selection v1b debate runtime services and shared workflow harness. Their source contracts must be re-read at kickoff because historical task paths are provenance only.
