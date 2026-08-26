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
| Current human authorization | Exact current-packet HumanConfirmNeed, N2 constraint-profile acceptance, N5 option A selection, and N7 question-checkpoint `loopback` recorded; researcher selected the marginal-retrieval-utility repair. No settings overwrite, retry/cancel, parsing, or provider action is authorized. |
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
| N2 human attempt | `node_attempt_v1b_n2_human_8deb4e1f-b226-4f24-96e9-2b402120b0da` |
| ResearchConstraintProfile | `research_constraint_profile_9a415e01-c998-47c7-b248-7e8cd6d7a924` |
| N2 authority / handoff | `a1c1fe882b18549001de14a4301c463b2794c4c8ef871d35cd9aecb75f8bcd88` / `artifact_ref_23229f8d-c193-418b-b8a5-3e6f5951330e` (`e41ba6d7feda4439bb2c8213c42d46d9510ddb529b2dc5fc214373693ac58e38`) |
| N3 IntakeReadiness | `v1b_intake_readiness_fa81a8f7-d39a-4964-8226-2c3bb85d1335`; `ready_for_slice`; no blockers |
| N3 authority / handoff | `128e1ba42a255cb25c08ca560fe8336833fb625f0860d9c6b142f209e7a45fac` / `artifact_ref_b5386a03-b967-4f9d-bd46-c12994248c67` (`77b113529199a7697032bfec0aae53fb71cb4f4cbea06652e99c8226ddedefaf`) |
| N4 product attempt | `node_attempt_t147_a9_pos_v1b_n4_v1`; non-provider `codex_assisted` / `product`; `admitted_with_warnings`; no blockers |
| ResearchSliceOptionSet | `research_slice_option_set_ac409c36-8626-44e6-bf63-d95f97be981a`; `ready_for_selection`; three options; no selected option |
| Recommended option | `research_slice_option_2dabeb7c-c545-4bc7-a7cc-a442572c4b69` / `uncertainty_conditioned_tri_level_allocation` |
| Alternative options | `research_slice_option_798bfe0c-9e68-44d2-9656-15e53b5f730f` / `uncertainty_triggered_selective_retrieval`; `research_slice_option_9d5e69f9-ac62-441f-8519-18449d05af41` / `uncertainty_feedback_sequential_retrieval` |
| N4 authority / handoff | `1f09c01142a06d694c07fc86da1b4ad08793085298fe5ddc59071a954cd14c36` / `artifact_ref_676eaade-221b-446e-af8a-6a50957407af` (`0f9bd3e9d34a4676c35746bdae0a2c9ce95f6d0706a2b38029b72eeeba820e22`) |
| N4 runtime audit | `artifact_ref_a9606d80-1a50-4b99-a93a-e0bbd6c6a00c`; `non_provider=true`; source `codex_response`; operator `codex-t147-a9-n4-slice-options-v1` |
| N5 human attempt | `node_attempt_v1b_n5_human_90ae1b5a-047f-494d-a1eb-ee52e8099e8d`; actor `human:yurui`; selected option A |
| ResearchSlice selection | `slice_selection_decision_c5ee77b3-8dc6-468a-9d70-20da6e6134a4`; selected option hash `69dabd73494b565a24c4165ce1c95a87c9a84dd1bb42269c2047dd053e180c76` |
| ResearchSlice | `research_slice_b588bfa5-839a-48f1-afe5-1834820a9896` / `v_b588bfa5-839a-48f1-afe5-1834820a9896`; hash `838144b087b4fff9c84c2153338e0ddc08a56e51efda5f032f8765673289f6f3` |
| N5 authority / handoff | `3c1cbec546f6dfbcae2bedfc801f73175edd61cab37616bdb96602b13c305c36` / `artifact_ref_57491a50-7786-489e-aa74-f25a6da8de8c` (`367de06bbd45e1735c692446d45ea289917dcf180709367892fc973ea45bc7b1`) |
| N6 product attempt | `node_attempt_t147_a9_pos_v1b_n6_v1`; non-provider `codex_assisted` / `product`; `admitted_with_warnings`; no blockers |
| TopicQuestionCandidateSet | `topic_question_candidate_set_3d33bd98-1a34-46bc-aa3e-135b97596698`; `ready_for_selection`; three bounded candidates |
| Recommended question candidate | `topic_question_candidate_4ce6c565-6a19-471b-920e-f511ec19e89a` / `matched_budget_tri_level_frontier`; hash `2a2a27e75c0db90ce6907b2cdc0b22771d7baae0ca9d22612097ffef6aa327aa` |
| Alternative question candidates | `topic_question_candidate_8e4af7b4-423a-41de-a26c-2a5b40236213` / `marginal_retrieval_utility_identification`; `topic_question_candidate_9eb2a474-bcdf-4025-ba9b-b484ce82362b` / `model_strength_subgroup_failure_boundaries` |
| N6 authority / handoff | `890b408d14e30fdc8a8d900c226811015b237ea3ffb777f9aadd66aacfa157d9` / `artifact_ref_572363de-81f8-4c3a-8e8e-b6bd83bcd6b6` (`384bb3137c78d6c921fa91fe735b560318cdf0443faca50664b376e2f8701b5e`) |
| N6 runtime audit | `artifact_ref_dacffb2e-aa18-4cd4-955d-a37b3fc9420d`; `non_provider=true`; `run_mode=product`; `executor_kind=codex_assisted`; operator `codex-t147-a9-n6-topic-questions-v1` |
| N7 deterministic attempt | `node_attempt_t147_a9_pos_v1b_n7_v1`; `admitted_with_warnings`; no blockers; active candidate is the recommended matched-budget frontier |
| TopicQuestion / AnswerabilityPlan | `topic_question_12eabe3e-f385-4a74-9dc7-9e885033d23a` / `topic_question_answerability_plan_63e7e00c-5eec-49ba-b662-84f5a6db48a9` |
| TopicQuestionContract | `topic_question_contract_9a1aaa47-6931-4eb6-83e1-08be9e8d6d56` / `v_9a1aaa47-6931-4eb6-83e1-08be9e8d6d56`; authority hash `016d0de79af690007b646908a2ffa86a382dff851f93ae724f84eab7ad719140` |
| N7 handoff | `artifact_ref_25ed6845-407e-47bd-bdf7-5e2c50a8a15c` / `000f14b5377a1e189e060fd35e5c136b1d5b66585366b0e5a49770f0c1032544` |
| Question ResearchCheckpoint | `research_checkpoint_df82d263-8a1d-4399-893f-f7b8ea4ed12e`; target snapshot `c3503610a75eb7a2f6cf413238c7f576d5420285fa4a32445a862cebc4b07cd4`; packet `7812de502b8a9165a970e7194f16054e38945498781a5560918c6a233093a70b` |
| Question loopback decision | `research_checkpoint_decision_10429bd2-699f-4fdb-bb40-2d784e055351` / `human_decision_6de98f95-2a75-4aa6-abfb-3ed5e32f9437`; key `t147-a9-pos-question-loopback-retrieval-method-relation-c3503610-v1` |
| Question checkpoint state | `decided`; decision `loopback`; target `research_slice`; refs bind the exact TopicQuestionContract and ResearchSlice; no open objections |
| Retrieval-method relationship | Existing local EvidenceMap sources include Adaptive-RAG, RAGRouter-Bench, AdaRankLLM, SeaKR, and DTR. The mechanism is adaptive/selective retrieval-budget routing under a fixed retriever, not a new retriever/ranker unless document scoring or candidate ordering changes. |
| Nearest-work metadata | [Know Before You Fetch](https://arxiv.org/abs/2606.29959) is `LIT-2253`; [When Should Active RAG Retrieve?](https://arxiv.org/abs/2607.24010) is `LIT-2254`. Both are canonical OA metadata records in this TitleCard's evidence basket, but neither is paragraph-level EvidenceMap authority yet. |
| Fulltext acquisition | Dry-run `9c338a1a-01a6-4403-a694-6d566c4c6ad4` selected two explicit arXiv PDF URLs, zero Unpaywall calls, and two downloads. Job `5bc150ec-1d00-4aed-ab02-55ade1d35674` persisted `max_byte_size=1024`; `LIT-2253` failed `INVALID_PAYLOAD`, while `LIT-2254` remained non-terminal at the stopping read. |
| Current v1b frontier | N7 question checkpoint looped back to `research_slice`; N8 has zero attempts and no value-assessment/provider work has begun |

## Resume guard

The two evidence decisions above are complete and idempotently keyed, both candidate arenas are materialized, and the selected positive candidate is a human-confirmed ValidatedNeed with a decided gap checkpoint. Preserve the negative arena as a non-advancing control. N2 through N7 remain durable, but the exact N7 checkpoint is now non-advancing and loops back to `research_slice`. The researcher selected the marginal-retrieval-utility repair, and the two nearest papers are imported metadata only. Resume from acquisition job `5bc150ec-1d00-4aed-ab02-55ade1d35674`: read it before any control action, obtain exact authorization before changing the persisted downloader ceiling or retrying, restore the prior setting after the bounded OA downloads, then continue through parsing, paragraph-level evidence mapping, and a substantively revised ResearchSlice/current question lineage. Do not invoke a provider or treat metadata/abstracts as claim-bearing product evidence.

Two rejected request attempts produced no owner state: a SearchRun used an invalid `manual_selection` binding kind before the coverage matrix was re-read as empty, and an EvidenceMap included an unbound section ref before the title-card EvidenceMap list was re-read as empty. The successful owners above use `manual_source` bindings and SearchRun-bound fulltext paragraph refs.
