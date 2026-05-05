# 02 Architecture

## Decisions
- GROBID is an external local service, defaulting to `http://localhost:8070`; backend calls it but does not start it.
- OCR is represented as an explicit blocker for scanned PDFs and remains out of scope.
- DB remains the structured SSOT. Large normalized/parser artifacts may live on disk with DB path/checksum refs.
- Retrieve uses exactly one embedding space: the configured active embedding profile.
- Public contracts use content-processing terminology only; internal Prisma names may retain legacy pipeline naming when not exposed.

## Storage Boundary
- Raw assets keep local paths in `LiteratureContentAsset`.
- `LiteratureFulltextDocument` stores searchable metadata and optional file refs for normalized text and parser artifact.
- `LiteraturePipelineArtifact` stores compact payloads plus an optional local payload path for large manifests/audit data.

## GROBID Boundary
- Backend calls `/api/health` or `/api/isalive` for health.
- Backend calls `/api/processFulltextDocument` with TEI output for PDF preprocessing.
- TEI remains the parser artifact; normalized text and derived rows are projections for downstream processing.
