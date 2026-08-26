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
| Current human authorization | Exact current-packet HumanConfirmNeed, original-run N2/N5 decisions, N7 question-checkpoint `loopback`, exact two-paper acquisition/settings restoration, refreshed-evidence `advance`, recovery-run N2 constraints, recovery-run N5 option A, exact recovery question `advance`, local backend restart, provider-free N8, and deterministic N9 are recorded. N10, provider action, and promotion remain unauthorized. |
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
| Nearest-work content | `LIT-2253` and `LIT-2254` are fulltext-preprocessed and `KEY_CONTENT_READY`; curated artifact IDs are `0c948144-88f4-4afa-b116-c0d908ff16d5` and `cbd1562b-6c28-4440-95e9-0fa532b995e1`. Both dossiers report zero LLM calls/retries. |
| Fulltext acquisition | Original job `5bc150ec-1d00-4aed-ab02-55ade1d35674` was terminal failed. Authorized dry-run `980e55f9-e77f-45b5-91ce-f54fe9725476` selected exactly two explicit arXiv PDFs, zero resolver calls; job `072160bd-8aca-4988-ac0f-081c701e22eb` succeeded 2/2. Downloader `max_byte_size` was restored from temporary `31,457,280` to `1024`. |
| Refreshed LiteratureResourcePoolSnapshot | `literature_snapshot_8a6aa7a3-5417-4aa2-8f65-e7991e455aa2`; 9 literature refs / 10 source refs |
| Refreshed SearchPlan / SearchRun | `search_plan_d3f7c65b-6107-4cf2-9c15-f612f17d659d` / `search_run_0cd28666-6604-465e-9fe8-4b6d5141f95b`; manual-import, 7 unique works, 4/4 satisfied coverage rows |
| Refreshed EvidenceMap | `evidence_map_d55feebd-b26c-476b-ad59-cfcf508119ba`; 11 paragraph units: 3 support / 2 challenge / 4 baseline / 2 context |
| Refreshed EvidenceStrengthAssessment | `evidence_strength_1b3e6fef-b632-4725-9f48-8892b2ab8db5`; `mixed`, confidence `0.45`, no gap codes |
| Material evidence conflict | `evidence_conflict_53be99f0-8601-43cb-a3f6-58ecb42c0e2c`; `NEAREST_WORK_INTERSECTION_NARROWS_NOVELTY` |
| Refreshed Evidence ResearchCheckpoint | `research_checkpoint_19a6227d-3849-4d0e-ab6f-9e89e072b457`; snapshot `c749aa6bccccfd4ea8bc352e287bd844225816f6b1a117eef09aa60383e87261`; packet `93f61a29a10e5fe43f7ae50eae95d1523808b755068694782357ae5c7efb3557`; decided `advance` |
| Refreshed-evidence decision | `research_checkpoint_decision_6e7a3a63-9158-45f9-aa47-9d6f10bfac49` / `human_decision_ee1d85e3-9709-4ca2-9d84-2b0c91bcef55`; key `t147-a9-pos-evidence-refresh-advance-c749aa6b-v1`; actor `human:yurui` |
| Repaired intersection | Predict signed depthwise marginal utility for `0→1` and `1→5` under a fixed reader/retriever/corpus/index/ranking/prompt/decoding contract; compare directly with calibrated confidence tri-level allocation, binary budgeted utility, and query-complexity routing; keep harm and realized costs separate. |
| Old-run recovery guard | N4 attempt `node_attempt_t147_a9_pos_v1b_n4_signed_depthwise_v2` failed `N4_NON_GOAL_NOT_EXCLUDED` and wrote no slice owner. Corrected N4 attempt `node_attempt_t147_a9_pos_v1b_n4_signed_depthwise_v3` admitted option set `research_slice_option_set_5ed9a9b5-7ca5-4481-b2e2-9357522a0f7e`; the following strict-human N5 request returned `409 VERSION_CONFLICT` because completed run `workflow_run_t147_a9_pos_v1b_v1` remained at N8. No new N5 owner was written on the old run. |

## Positive recovery lineage — signed adjacent-depth utility

| Owner | ID / value |
|---|---|
| v1b recovery run | `workflow_run_t147_a9_pos_v1b_signed_depthwise_v2`; reuses `v1b_input_bundle_dff55096-06f1-4a0d-84f8-b00e091367c5` / `t147-a9-pos-v1b-input-v1` |
| N1 / IntakeSnapshot | `node_attempt_t147_a9_pos_v1b_signed_depthwise_n1_v1` / `v1b_intake_snapshot_95155f7f-629b-40c6-b424-80049d40075f`; authority `662958ee380a75e124c2d41a4f14e0189bc06b43466e839d16e55e3d8d22060b` |
| N1 handoff | `artifact_ref_8212aa95-354c-4c7d-81b5-d67f1f9903c0` / `86bd06008d880bd9c15d9c7be23b9626935d850e78fe1c0cba9ce13dcc241217` |
| N2 human attempt / constraints | `node_attempt_v1b_n2_human_087bcc71-05d5-4c04-aaf2-03e4762e9478` / `research_constraint_profile_30f82db1-d59e-440b-98e6-114662da3839`; exact `k=0/1/5`, signed `0→1`/`1→5`, fixed-pipeline, nearest-work, separate harm/cost boundary |
| N2 authority / handoff | `12d50bde8d9dfea4110017110f24b61ea39ce9ccda1d186f8e5b716c06968c6b` / `artifact_ref_988655da-c8c5-40b0-b345-83ec50b40a16` (`e6f3f905cff1c6f07fe0c938dd3e500acdfe28098c2c1ab4416acbe494892357`) |
| N3 IntakeReadiness | `v1b_intake_readiness_e74f9f2d-2bd9-4a39-adc4-20468f0cf6d5`; no blockers |
| N3 authority / handoff | `15189de4a70d7b2096dd87f9b25e762e1697b1f65c319eaf97b5ecd231438973` / `artifact_ref_0c8b8bcc-4c33-4093-aed2-17e22c7146a1` (`da4c465d9a022c0f201770e9acb0f761e0c4cdf2f474355b66745262474c0416`) |
| N4 product attempt / runtime audit | `node_attempt_t147_a9_pos_v1b_signed_depthwise_n4_v1` / `artifact_ref_8f516ba2-7453-4862-9662-ec046f023e9e`; non-provider `codex_assisted`; no blockers |
| ResearchSliceOptionSet | `research_slice_option_set_d6d91a2e-b4fd-4f7a-b9ab-868b037320de`; authority `5021a4944f040eb0227785a58633ebb1e4ca23ed2ac9ffbd8a0b1b51d7f3b40f`; handoff `artifact_ref_b7fad34a-2c30-4fb4-a5bb-6cfd0f4918c5` (`b886b9ea1be5d683d49706bd4c0fc87e0f51e3d034fb7ffbab4709fa67eaa44d`) |
| Selected / alternative slice options | A `research_slice_option_8b46fe19-fbfc-4702-b9d6-a688ad8f80f2` / `signed_depthwise_marginal_utility`; B `research_slice_option_5df81e56-4afe-4f1a-b38b-414efe115c26` / `binary_signed_retrieve_or_skip`; C `research_slice_option_3b15c4a6-1f53-4a80-920f-895c922e21fa` / `feedback_signed_depthwise_stopping` |
| N5 human selection | `node_attempt_v1b_n5_human_446231f6-1fdc-429a-81d9-0bb49ab46dd0` / `slice_selection_decision_abb74f1c-c812-4eec-bc5c-c92eb768f5ba`; actor `human:yurui`; option A |
| ResearchSlice | `research_slice_849816f6-a5b6-4646-ad81-71d1773b8643` / `v_849816f6-a5b6-4646-ad81-71d1773b8643`; hash `b6dbbb412cf837af87218f4df8b3b2971932df694a07ac1779dcc8db98638b73` |
| N5 authority / handoff | `c7af49a2645df8ae8447ba3f84f1a98d28b673eb628f72781a177751f09d7a65` / `artifact_ref_37ddcd26-0390-46fc-a51a-7bddb69f96ea` (`ee34d9e8865b3c124242182be3137156ceb191f55d204752363b3d1de31452fa`) |
| N6 product attempt / runtime audit | `node_attempt_t147_a9_pos_v1b_signed_depthwise_n6_v1` / `artifact_ref_e07c81a3-11ea-4430-8534-b98a58b8d584`; non-provider `codex_assisted`; no blockers |
| TopicQuestionCandidateSet | `topic_question_candidate_set_f182edd4-10c8-4fba-b577-2e8fe29cf13a`; authority `6c52c8ccdc56e098424f5e63e9236e49793af3ef0b47edd4aad0f8637865b07c`; handoff `artifact_ref_800a0f3f-0793-4c17-bede-d05e1d6c52f4` (`cd84c81ffbfc15b4143fc2a22b1a3c2c53ef6267a6d2d1fded53d745b13442bb`) |
| Recommended / alternative questions | `topic_question_candidate_7a5a19d4-f3ec-4ae8-a2c7-61725cd6475d` / `signed_depthwise_harm_aware_frontier`; `topic_question_candidate_648019c9-dd80-4847-9efb-f6d917535d66` / `signed_depthwise_utility_heterogeneity`; `topic_question_candidate_9a420e09-2a60-478e-b171-1a9cef1a4a53` / `signed_depthwise_cost_harm_audit` |
| N7 deterministic attempt | `node_attempt_workflow_run_t147_a9_pos_v1b_signed_depthwise_v2_materialize_topic_question_contract_v1_1`; no blockers; active candidate is the recommended harm-aware frontier |
| TopicQuestion / AnswerabilityPlan | `topic_question_2e7ad7ab-7335-4241-b60a-67dda8dc8656` / `topic_question_answerability_plan_f47bd1f0-36a3-4ab0-9289-8808815b20ce` |
| TopicQuestionContract | `topic_question_contract_81234493-e21d-4af6-991c-f40b7295b872` / `v_81234493-e21d-4af6-991c-f40b7295b872`; authority `c9d70d588c673f3266bff83e2d63025202891ce4ae148fed46fc65a517de9c5b` |
| N7 handoff | `artifact_ref_e02fb093-f9ef-414f-b975-12b64bb2781c` / `91feaa24ab596bea8dc96a069a7e3865197b9ddf324789d70504dac0dc5f6097` |
| Current Question ResearchCheckpoint | `research_checkpoint_2be0d1f1-f5c4-4627-94a8-ca9fe91897ad`; snapshot `8ceaa14909f72481304d79dc2ac1e242ed5c94a1140fe608b34bada499a6760d`; packet `dc17dac4a501a0f4f1c79a8f9c4a154a2e3e25e40d514a32cd47a26096141557`; decided `advance`, no required actions or open objections |
| Question decision | `research_checkpoint_decision_f33257d5-5c29-40c2-82d1-701dd222356b` / `human_decision_3c0f9483-aaac-40bd-9c39-8d3b437f978a`; key `t147-a9-pos-question-advance-8ceaa149-v1`; actor `human:yurui` |
| N8 product bridge | Existing N4/N6 Codex-assisted bridge extended to N8; product/non-provider only, question guard before runtime artifacts, provider/mock execution rejected; focused route/contract tests, full v1b route integration, Prisma HTTP smoke, OpenAPI parse, operator lint, and full typecheck pass |
| N8 bridge commit | `390cc843` / `feat(topic-selection): expose N8 Codex product bridge` |
| N8 live attempt | `node_attempt_t147_a9_pos_v1b_signed_depthwise_n8_v1`; frozen input `b2097f5ebe1a861c2c8136800bbb3c3e35394c8343bed551b32cc5e17988c23f`; `admitted_with_warnings`; `invoke_next`; zero blockers |
| TopicValueAssessment | `topic_value_assessment_0381abe1-f060-4dde-b397-0c71433eaa0c`; authority `27b144009bfb57b34a66ff7b84b32292b51761af7efb1c575627e71c3c9f4456`; readiness `ready`; score `75`; confidence `0.72`; recommendation `advance_to_package`; six hard gates pass |
| N8 reasoning / run owners | `value_reasoning_memo_15af8bc7-1a13-48d9-98ff-7a77e1a1e27b`; `assess_topic_value_run_7dbbbc64-be85-4f6e-bb8f-072496438870`; input snapshot `topic_value_input_snapshot_810186ed-3b70-4fd7-9fe1-f183f3b010ec` |
| N8 gate / transition / trace | `gate_result_35c5fd8f-932f-45c3-a213-2799d9824c13`; `transition_attempt_9334f797-c4d0-4385-bb17-01f9e5f61d71`; `trace_snapshot_2f7a3b95-3e62-4db5-b899-2d4aa8554dfd` |
| N8 runtime context / audit | `artifact_ref_59c374d3-6d88-46e1-8c53-ee4cec8b1f21`; audit `artifact_ref_5268cc5d-0cc4-4875-9457-745eb37072f7`; `run_mode=product`; `non_provider=true`; `executor_kind=codex_assisted`; model option null; no fixture replay |
| N8 warnings | `N8_VALUE_RISK_NOTES_CARRIED_FORWARD`; `N8_CRITIC_REVIEW_TRIGGERED`; nearest-work pressure, negative-label sparsity, aggregate subgroup masking, and fixed-local-pipeline claim ceiling remain explicit |
| N8 handoff | `artifact_ref_aa6a3fed-8cfc-430a-907b-e38184485e4c` / `df8e4c213aefed23f150c20440d503e9c7c498c43d055383960d5e604890b927`; `N8ToN9Handoff` |
| N9 live attempt | `node_attempt_t147_a9_pos_v1b_signed_depthwise_n9_v1`; frozen input `78ce01827bab8e84b7a7ff001252dc624c10d0e9ced6d7e3664562bd54e083ac`; `admitted_with_warnings`; `invoke_next`; zero blockers; semantic/runtime-admission hashes null |
| ValueDispositionDecision | `value_disposition_decision_601c14ea-7ce8-469f-9812-bf46b3b56e45`; authority `126a50c76ea98a66c9b97d58778b6b3c519cf282b14a2e029854afba81995c46`; deterministic decision `advance_to_package`; active on TopicValueAssessment `topic_value_assessment_0381abe1-f060-4dde-b397-0c71433eaa0c` |
| N9 gate / transition / trace | `gate_result_ef54a94b-030d-4cea-b63a-18e9b07b886b`; `transition_attempt_3645bc66-6592-4b20-958e-180d887fb72f`; `trace_snapshot_13088c20-de9e-46c9-8d40-adaa42d962a5`; trace artifact `artifact_ref_5b05ef01-7a89-49f9-a730-c66d256d4117` |
| N9 warning | `N9_VALUE_RISK_NOTES_CARRIED_FORWARD`; no blocker, provider, model, semantic artifact, runtime admission, or fixture replay |
| N9 handoff | `artifact_ref_830134d5-01db-4dc5-8b7d-0f52c2b08b19` / `06d6efd6fe4765e3be6774bdd431f3ce4eae8b3c92b7507262d272a155913336`; `N9ToN10Handoff`; `advance_disposition=true` |
| Current v1b frontier | N8 and N9 each have one admitted attempt; N10 has zero attempts. The next harness node is `topic-selection.v1b.create-draft-topic-package.v1`; provider execution, promotion, bridge objection, and topic handoff have not begun. |

## Resume guard

The historical evidence decisions remain durable, both candidate arenas are materialized, and the selected positive candidate remains a human-confirmed ValidatedNeed. Preserve the negative arena as a non-advancing control. The bounded two-paper acquisition, parsing, curation, and EvidenceMap refresh are complete, and downloader `max_byte_size` is restored to `1024`. Current checkpoint `research_checkpoint_2be0d1f1-f5c4-4627-94a8-ca9fe91897ad` is exactly decided `advance` against snapshot `8ceaa149...760d`; provider-free N8 and deterministic N9 are admitted, leaving N10 draft-package creation as the zero-attempt frontier. Do not invoke N10, a provider, or promotion without a new authorization boundary. The configured raw-file root is transient; if its OA PDFs disappear, obtain exact authorization and reacquire only those two assets through a new bounded dry-run rather than overwriting storage settings.

Earlier rejected request attempts produced no owner state: a SearchRun used an invalid `manual_selection` binding kind before the coverage matrix was re-read as empty, and an EvidenceMap included an unbound section ref before the title-card EvidenceMap list was re-read as empty. The successful owners above use `manual_source` bindings and SearchRun-bound fulltext paragraph refs. The old-run N4/N5 recovery attempts likewise preserved completed-frontier state and required the fresh recovery run documented above.
