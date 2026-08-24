# 10 Cross-Version Boundaries

## Purpose
Lock the lightweight v1a -> v1b -> v1c handoff boundary before D-25 `contracts_schema` implementation starts.

This document prevents v1a `generate-need-candidate` contracts from absorbing unfinished v1b/v1c workflow semantics.

## Scope
- This is a compatibility boundary.
- This is not a new workflow node.
- This is not a new authority object.
- This is not a full v1b/v1c debate policy.

## Locked Boundary

### v1a Discovery Output
`topic-selection.v1a.generate-need-candidate.v1` may produce:
- persisted `NeedCandidate` refs;
- candidate-pool projection refs/hash;
- discovery audit refs;
- ranked draft/admission/supplemental/persist command artifact refs;
- warnings and error codes.

It MUST NOT produce:
- `ValidatedNeed`;
- `TopicSelectionV1aToV1bInputBundleRecord`;
- `TopicQuestionContract`;
- `TopicValueAssessment`;
- v1c promotion records;
- `NeedCandidateSet`.

### v1a To v1b Handoff
The only v1a-to-v1b authority handoff remains `TopicSelectionV1aToV1bInputBundleRecord`, created by `topic-selection.v1a.publish-v1b-input-bundle.v1` after human confirmation.

The bundle MAY carry stable refs and summaries:
- validated need ref;
- source need candidate ref;
- adjudication result ref;
- support packet ref;
- human decision ref;
- evidence/search/literature snapshot refs;
- risk refs;
- gap codes;
- memory suggestion refs;
- recheck request refs;
- trace refs;
- small redacted handoff payload.

The bundle MUST NOT carry raw v1a debate transcripts, hidden reasoning, raw ranked draft batches, raw rejected framings, or supplemental-round role outputs as business input.

Candidate-pool projection refs/hash remain v1a discovery/adjudication context and audit material by default. They are not required v1b business input unless a later v1b policy promotes a stable summary/ref field.

### v1b Consumption
`TopicQuestionContract` and `TopicValueAssessment` consume stable v1b inputs:
- v1b input bundle;
- intake constraint profile;
- selected research slice;
- risk/gap/recheck/memory refs;
- evidence/search/literature snapshots.

They MUST NOT directly read raw v1a D-20/D-21/D-22 artifacts as product facts.

Artifact refs MAY be used for traceability, replay, or audit. Product decisions MUST use stable refs and domain records.

### v1b To v1c Handoff
The only v1b-to-v1c authority handoff remains `TopicSelectionV1bToV1cInputBundleRecord`, created by `topic-selection.v1b.publish-v1c-input-bundle.v1` after package readiness.

The bundle MAY carry ready package refs, readiness refs, topic/question/value/package snapshots, accepted-risk refs, blocker/recheck refs, trace refs, and bundle hash.

It MUST NOT carry raw v1a/v1b debate transcripts, hidden reasoning, or unvalidated model output as business input.

### v1c Consumption
`topic-selection.v1c.generate-promotion-support.v1` may later use debate for accepted-risk tension.

Promotion support remains advisory to `topic-selection.v1c.run-promotion-gate.v1`.

The promotion gate remains deterministic, and final promotion remains human-confirmed through `topic-selection.v1c.human-promotion-decision.v1`.

## D-25 Contract Guidance
The first D-25 implementation slice should define v1a `generate-need-candidate` contracts only.

`GenerateNeedCandidateNodeResult` SHOULD expose v1a continuation/audit refs only:
- persisted candidate refs;
- candidate-pool projection ref/hash;
- discovery audit ref;
- required artifact refs;
- warning and error codes.

It SHOULD NOT contain v1b/v1c fields such as topic question, value assessment, package, promotion, bridge, or downstream refs.

`PersistNeedCandidateBatchCommand` MUST remain an admitted-draft-to-`NeedCandidate` authority write command. It MUST NOT embed v1b/v1c handoff fields.

## Later Deepening
v1b/v1c policy deepening should happen in their own node policies:
- `topic-selection.v1b.plan-research-slice.v1`
- `topic-selection.v1b.form-topic-question-contract.v1`
- `topic-selection.v1b.assess-topic-value.v1`
- `topic-selection.v1c.generate-promotion-support.v1`

If v1b/v1c need more context, add stable fields to their own handoff/input contracts. Do not promote raw v1a debate artifacts into cross-stage business inputs.
