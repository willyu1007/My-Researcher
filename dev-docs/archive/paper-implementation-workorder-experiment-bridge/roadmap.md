# Roadmap - WorkOrder Experiment Bridge

## Decision
Use `ResearchWorkOrder` as the only implementation-side experiment command envelope.

## Status
- Done on 2026-05-21 as backend minimum closure.
- Next consumer: `T-098 paper-implementation-result-claim-dossier`.

## Deliverables
- WorkOrder contract and admission gate.
- Experiment-foundation ref/hash bridge.
- `RunEvidenceUnit` ingestion.
- Failed-run retention checks.

## Done When
- T-098 can build result interpretation from complete run evidence and validation refs.
- Monitor callbacks without work-order refs are untrusted and cannot enter claim support.
- Failed, cancelled, inconclusive, and negative runs are retained as ledger evidence.
