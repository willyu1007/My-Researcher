# 02 Architecture

## Data Path
- Use the existing literature metadata import boundary for F1:
  - `POST /literature/collections/import`
  - provider: `arxiv`
  - external id: `2005.11401`
- Use read-only Prisma queries and web/source checks for F2 readiness.
- Store readiness evidence as task reports and lightweight manifests under this task bundle.
- Keep detailed target/readiness JSON under ignored `.ai/.tmp`; `LiteratureRecord` and related DB tables remain the corpus SSOT.

## Artifact Strategy
- `artifacts/f1-classic-rag-import-report.json`: F1 import/reconcile output and safety counters.
- `artifacts/f2-readiness-targets-manifest.json`: lightweight manifest for the selected F2 target set.
- `artifacts/f2-fulltext-code-readiness-manifest.json`: lightweight manifest for the detailed readiness matrix.
- `artifacts/f2-fulltext-code-readiness-report.json`: execution summary, counters, and manifest paths.
- `06-f2-readiness-summary.md`: human-readable readiness summary.

## Safety Rules
- Count side-effect tables before and after F1/F2 scripts:
  - `LiteraturePipelineRun`
  - `LiteratureContentAsset`
  - `LiteratureContentProcessingBatchJob`
  - `LiteratureFulltextAcquisitionJob`
- F2 readiness scripts may inspect public URLs but must not enqueue acquisition or processing jobs.
- Keep tags flat and compatible with T-116 taxonomy.
- Keep experiment-foundation promotion as a follow-up, not an action in this task.

## Risks
- Public code/license links can be ambiguous or absent from abstracts.
- Some benchmark/tool papers may use project pages that are not captured in metadata.
- Current DB already contains unrelated dirty project state; all commits must remain narrowly scoped.
