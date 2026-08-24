# 08 Replay And Adversarial Fixtures

## Happy Path Replay
`T-101 replays the PaperImplementation ready path across child authorities` covers:

```text
ImplementationProject
  -> CoreMotiveVersion
  -> MotiveEvidenceBoardVersion
  -> ValidationCycle
  -> TechnicalRouteCandidate
  -> ExperimentPlanLight
  -> ResearchWorkOrder
  -> RunEvidenceUnit
  -> ResultInterpretationPacket
  -> CitationCandidate
  -> ClaimTracePacket
  -> ClaimCandidate
  -> ImplementationDossier
  -> WritingEntryPacket
```

## Blocked / Adversarial Fixtures
| Fixture | Failure defended | Evidence |
|---|---|---|
| changed bridge hash | stale upstream handoff mutates admitted implementation | T-101 blocked-path test |
| missing trace manifest | writing-affecting or citation candidate proceeds without trace authority | T-101 blocked-path test |
| citation without source locator | LLM/summary citation or non-locatable source sneaks in | T-101 blocked-path test |
| display summary in hard gate | memo/summary becomes evidence authority | T-101 blocked-path test |
| monitor callback without work order | naked experiment run becomes trusted evidence | T-101 blocked-path test |
| AI direct authority mutation | model output writes domain state | T-101 blocked-path test |
| strong claim without confirmation | high-risk writing-affecting claim bypasses human confirmation | T-101 blocked-path test |
| upstream feedback dispatch | implementation overwrites topic-selection authority | T-101 feedback check and T-093 downstream source kind |
| portfolio drift | validation proceeds outside active portfolio constraints | child test executed in T-101 verification pass |
| low-information loop | system silently schedules wasteful cycles | child test executed in T-101 verification pass |
| failed-run omission | claim/dossier ignores failed evidence | child test executed in T-101 verification pass plus full-flow failed-run accounting |
| overclaim | claim exceeds admitted boundary | child test executed in T-101 verification pass |

## Fixture Policy
- Fixtures MUST use in-memory repositories and deterministic IDs.
- Fixtures MUST NOT require live providers, external DB state, or browser automation.
- Fixtures MUST preserve source refs and trace refs instead of relying on UI-only or mock-only authority.
- Failed run evidence MAY support a negative-result claim, but T-101 MUST NOT model it as support for a positive improvement claim.
