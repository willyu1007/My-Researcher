# 02 Architecture

## Boundary Model
| Concern | Owner | This Task's Use |
|---|---|---|
| Metadata discovery and import | `literature` | Collect records, preserve source refs, deduplicate, attach tags. |
| Tags | `LiteratureRecord.tags` | Carry namespaced taxonomy and coarse triage. |
| Content processing | `literature-flow` | Explicit follow-up only; not automatically triggered by collection. |
| Reusable experimental assets | `experiment-foundation` | Downstream consumer of selected P0/P1 literature signals. |
| Paper implementation candidates | `PaperImplementation` | Downstream consumer after triage and evidence review. |
| Theory seed bank | task docs / tags | Provides research modeling inspiration; not an experiment asset by default. |

## Existing System Reuse
- Use existing literature import and metadata update APIs.
- Use existing tags instead of adding a taxonomy table.
- Use existing overview top-tag summaries to inspect coarse distribution.
- Use existing source records for provenance.
- Use existing dedup identity behavior from DOI, arXiv id, and title-author-year hash.

## Data Model Decision
- V1 uses flat namespaced tags:
  - `collection:*`
  - `direction:*`
  - `resource:*`
  - `decision:*`
  - `metric:*`
  - `theory:*`
  - `fit:*`
  - `priority:*`
- V1 does not create:
  - `LiteratureTag`,
  - `LiteratureTagAssignment`,
  - taxonomy version tables,
  - classifier result tables.
- If confidence/source/versioned assignment becomes necessary, split a follow-up schema task.

## Lightweight Judgment Storage
- In this task, full judgment cards are task evidence artifacts, not first-class DB entities.
- Coarse classification enters the app through tags.
- P0/P1 judgment cards should remain traceable to literature IDs once records are imported.
- If later needed, cards can be migrated to a structured taxonomy/classification model.

## Source Strategy
- arXiv:
  - primary source for 2024-2026 preprints and fast-moving RAG/TTC/serving work.
- Crossref:
  - metadata and published-version discovery.
- Zotero/manual:
  - curated imports for papers not covered cleanly by arXiv/Crossref.
- OpenReview / ACL Anthology / ACM / USENIX / IEEE:
  - treated as discovery/manual-import sources unless a direct provider integration exists.
- GitHub / Papers with Code:
  - code and benchmark confirmation only; not primary bibliographic authority.

## Risk Controls
- Tag drift:
  - use namespaced tags and keep the vocabulary in this task package.
- Overcollection:
  - require layer/subcluster/query provenance and P0/P1 triage.
- Theory sprawl:
  - every theory paper must map to a RAG/LLM phenomenon, experimental variable, metric, policy, or bound.
- Pipeline side effects:
  - do not enqueue fulltext acquisition/content processing from collection batches by default.
- Provider noise:
  - batch import evidence must record query, source, date, and expected tags.

## Downstream Fit Criteria
- `fit:experiment-foundation` requires at least one of:
  - dataset/benchmark/baseline/workload/metric,
  - runnable code or reproducible protocol,
  - serving workload trace or evaluation setup,
  - policy/baseline that can become a RunRecipe or EvaluationProtocol input.
- `fit:paper-implementation` requires at least one of:
  - plausible claim contribution,
  - reproducible baseline,
  - meaningful negative/limitation result,
  - direct relation to the chosen research problem.
