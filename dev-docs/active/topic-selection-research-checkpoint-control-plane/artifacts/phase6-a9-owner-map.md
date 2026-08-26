# Phase 6 A9 owner recovery map

This file preserves the exact live-API owner lineage needed to resume the fresh dual-track acceptance. It is recovery evidence only; `01-status.md` remains the progress authority and `verification.md` remains the result authority.

## Preflight boundary

- API base: `http://127.0.0.1:3000`
- Approved start command: `pnpm backend:dev:prisma`
- Literature scope: `ai-rag-finetuning-2022-2026`
- Scoped overview at the acceptance preflight: 410 total / 410 in-scope / 410 active / 410 high-confidence
- Scope limitation: the scope is readable and intent-aligned, but its profile is absent from `/topics/settings`; no settings repair was attempted.
- Recovery limitation: no bounded backup/restore command was found. Writes remain append-only, local-development only, clearly labeled, and provider-free.

## Negative lineage — fixed top-k parameter control

| Owner | ID / value |
|---|---|
| TitleCard | `title_card_fd55f127-1748-49f4-9340-654c37cc2650` |
| TopicSeed | `topic_seed_38782ab4-c6a1-4660-a0db-8aad4b974037` |
| LiteratureResourcePoolSnapshot | `literature_snapshot_1417b516-7e3a-41a1-9ab2-c16ca0c85c98` |
| SearchPlan | `search_plan_5eb288b1-fbab-4864-9d77-7dc71af9c402` |
| SearchRun | `search_run_ecb3af74-b586-4c57-95c8-b1b357f01896` |
| EvidenceMap | `evidence_map_92ba546b-f11c-4c45-8149-1556f3f41809` |
| EvidenceStrengthAssessment | `evidence_strength_2afa16e8-6b19-4679-b6ef-9c596d0ea699` (`mixed`, confidence `0.45`) |
| Evidence ResearchCheckpoint | `research_checkpoint_34e5f6c2-8161-450d-a7a7-49be24512b14` |
| Evidence target snapshot hash | `1fcdda990a345e847db69bebd14f87d3747629a10b3f257f1d8873f6fe3aee73` |
| Evidence packet result | `eligible_for_human_review`; no policy issues; no open objections |
| ResearchCheckpointDecision | `research_checkpoint_decision_26f6989c-67d1-4ed6-8f02-a01ed95939c9` (`advance`) |
| HumanConfirmedDecision | `human_decision_3a12f9ae-15b0-43ab-ba58-c15d5d65c8fd` |
| Decision key / actor | `t147-a9-neg-evidence-advance-1fcdda99-v1` / `human:yurui` |
| Primary NeedCandidate | `need_candidate_cebfe499-d4d0-4b1c-872e-a0b52354094d` / `t147-a9-neg-fixed-depth-primary-v1` |
| Reworded NeedCandidate | `need_candidate_81345c16-ecff-4911-bd91-7a595ae50476` / `t147-a9-neg-fixed-depth-reword-v1` |
| Candidate semantic groups | both `db876292ef9d60b4cca29351c05a9d7d0dd6bd0ab598ecab0b1633bb5d8dd4a9` |
| Current gap ResearchCheckpoint | `research_checkpoint_c5f4af13-ab65-4998-ab38-a681702dccaf` |
| Gap target snapshot hash | `703f7f57470172223a6e4e9ac38320e414a087137f1337083edcec37ef5beb8c` |
| Gap packet hash | `e805c8a3856193de32d5fa43de930d0f005062c226aa95110bd11fbd6a13802a` |
| Current projection | `loopback_required`; only `GENUINELY_DISTINCT_ALTERNATIVE_REQUIRED`; one required action; allowed `hold`, `loopback`, `reject`; no `advance` |

## Positive lineage — uncertainty-conditioned allocation

| Owner | ID / value |
|---|---|
| TitleCard | `title_card_6f4b268d-ba00-450d-a6be-ac083a32623f` |
| TopicSeed | `topic_seed_649d9279-0558-47af-bdeb-69f176faeccf` |
| LiteratureResourcePoolSnapshot | `literature_snapshot_17b2a9ca-076b-46ae-baab-e4e7c75381ba` |
| SearchPlan | `search_plan_58af5d2b-0039-4fa4-af13-be56e503471b` |
| SearchRun | `search_run_1a19b9a5-b1c0-4b7a-952b-a58323926d09` |
| EvidenceMap | `evidence_map_15a7c143-a26a-4059-98f7-9c9d8f2b71b8` |
| EvidenceStrengthAssessment | `evidence_strength_b2f896b0-199d-456b-b101-9894987984bf` (`mixed`, confidence `0.45`) |
| Evidence ResearchCheckpoint | `research_checkpoint_97040836-ea54-44fb-a34f-61a4c89879e8` |
| Evidence target snapshot hash | `e0bb98d25dc6848337f5b7e75758a5ab582bfe82b1961a83b5104d99a585dc5e` |
| Evidence packet result | `eligible_for_human_review`; no policy issues; no open objections |
| ResearchCheckpointDecision | `research_checkpoint_decision_4f660942-b4fc-4b54-90df-c9d44af4e55b` (`advance`) |
| HumanConfirmedDecision | `human_decision_a4bb710b-8ceb-4684-80fb-20ff051239d1` |
| Decision key / actor | `t147-a9-pos-evidence-advance-e0bb98d2-v1` / `human:yurui` |
| Uncertainty-allocation NeedCandidate | `need_candidate_afd352f0-047c-4ec2-93f9-130f8ba7416b` / `t147-a9-pos-uncertainty-allocation-v1`; semantic group `2cbeaad166b18557cf680367613ab8b23869df8f85e1dec51e90a400d0ef31eb` |
| Adaptive-ranking NeedCandidate | `need_candidate_59da9bc1-8066-4211-b0b1-f74ffeffbfb3` / `t147-a9-pos-adaptive-ranking-v1`; semantic group `5275de8b9ad6a1d18fff5a3dcf81f989eb3fdffb59d4d9b12c6ca95d48d502ec` |
| Selected-candidate readiness | `need_readiness_17887e0e-9dd6-442e-b73f-a79a658395d9`; `ready_for_validation`; zero blockers/warnings/actions; 2 support / 1 challenge / 0 abstract-only support / 0 strong unresolved challenge |
| Current validation support packet | `validation_packet_3fb847c6-4cda-4ffe-99ab-01c3d7236210`; `ready`; five required human checks; zero residual risks and open gap codes |
| Preparation action keys | `t147-a9-pos-gap-readiness-v1`; `t147-a9-pos-validation-support-v1` |
| Current human authorization | Exact current-packet HumanConfirmNeed confirmation recorded; N2 constraint-profile acceptance is not yet received |
| Current gap ResearchCheckpoint | `research_checkpoint_36c4ad76-6a0c-4dcd-bcf9-ab326f893bd5` |
| Gap target snapshot hash | `699cc0f155358f173f45c0c38558398214b834c52076a58443fe10fc8874f5a5` |
| Gap packet hash | `11b422de126557fe01e4359ca35b78bc42234b96be4183962fb08fc8b9b616e4` |
| Gap AdjudicationResult | `need_adjudication_7f392c9e-830b-4d5d-b0db-9a1adbbed677` (`validate`) |
| Gap HumanConfirmedDecision | `human_decision_24db76e9-b8ff-44bf-a972-c07556ebd892` / `human:yurui` |
| ValidatedNeed | `validated_need_b79c2b97-4cfc-4533-9b1f-f93cad469e70`; zero residual/accepted risks |
| Gap checkpoint final state | `decided`; authority is the gap HumanConfirmedDecision; no open objections |
| v1a→v1b bundle | `v1b_input_bundle_dff55096-06f1-4a0d-84f8-b00e091367c5` / `t147-a9-pos-v1b-input-v1` |
| v1b workflow run | `workflow_run_t147_a9_pos_v1b_v1` |
| N1 blocked attempt | `node_attempt_t147_a9_pos_v1b_n1_v1`; `INVALID_NODE_RUNTIME_SPEC`; no intake owner written |
| N1 admitted attempt | `node_attempt_t147_a9_pos_v1b_n1_v2`; no blockers/warnings |
| v1b IntakeSnapshot | `v1b_intake_snapshot_05a8b8e9-0973-48d9-8b87-9df1609722e0` / `v_05a8b8e9-0973-48d9-8b87-9df1609722e0` |
| N1 authority / handoff hash | `662958ee380a75e124c2d41a4f14e0189bc06b43466e839d16e55e3d8d22060b` / `e6cefbd6588af3e3cdf98086b1590aa5d081f7e6c2a05b561ac18a45951eb81a` |
| Current v1b frontier | `topic-selection.v1b.record-research-constraint-profile.v1`; strict-human N2; no profile written |

## Resume guard

The two evidence decisions above are complete and idempotently keyed, both candidate arenas are materialized, and the selected positive candidate is now a human-confirmed ValidatedNeed with a decided gap checkpoint. Preserve the negative arena as a non-advancing control. Resume v1b from `workflow_run_t147_a9_pos_v1b_v1`: re-read its state and the intake snapshot, obtain exact researcher acceptance for the N2 constraint profile, and submit the human semantic route once. Do not infer N2 acceptance from the earlier HumanConfirmNeed confirmation. After every write, recover owner, authority, handoff, and route state before continuing or retrying.

Two rejected request attempts produced no owner state: a SearchRun used an invalid `manual_selection` binding kind before the coverage matrix was re-read as empty, and an EvidenceMap included an unbound section ref before the title-card EvidenceMap list was re-read as empty. The successful owners above use `manual_source` bindings and SearchRun-bound fulltext paragraph refs.
