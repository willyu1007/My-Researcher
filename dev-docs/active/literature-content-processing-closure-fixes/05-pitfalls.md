# 05 Pitfalls

## Do Not Repeat
- Do not expose `pipeline` wording through public literature content-processing DTOs.
- Do not mix small and large embedding spaces in one retrieve ranking.
- Do not mark scanned/no-text PDFs as successfully preprocessed without OCR.
- Do not make configured storage roots a no-op.
- Do not auto-start Docker/GROBID from a content-processing run; the service is an external local dependency.
- Do not force-migrate old inline normalized text rows to files as part of this task; the migration keeps old rows readable.
