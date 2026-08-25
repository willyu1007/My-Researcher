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
| Current ResearchCheckpoint | `research_checkpoint_34e5f6c2-8161-450d-a7a7-49be24512b14` |
| Target snapshot hash | `1fcdda990a345e847db69bebd14f87d3747629a10b3f257f1d8873f6fe3aee73` |
| Packet result | `eligible_for_human_review`; no policy issues; no open objections |

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
| Current ResearchCheckpoint | `research_checkpoint_97040836-ea54-44fb-a34f-61a4c89879e8` |
| Target snapshot hash | `e0bb98d25dc6848337f5b7e75758a5ab582bfe82b1961a83b5104d99a585dc5e` |
| Packet result | `eligible_for_human_review`; no policy issues; no open objections |

## Resume guard

Before any decision write, re-read each TitleCard's `/research-status` and the checkpoint `/packet`. Continue only when the current checkpoint IDs and target snapshot hashes still equal the values above. The next writes require the user's strict-human evidence decisions; do not infer them from this artifact. No checkpoint decision keys have been allocated yet.

Two rejected request attempts produced no owner state: a SearchRun used an invalid `manual_selection` binding kind before the coverage matrix was re-read as empty, and an EvidenceMap included an unbound section ref before the title-card EvidenceMap list was re-read as empty. The successful owners above use `manual_source` bindings and SearchRun-bound fulltext paragraph refs.
