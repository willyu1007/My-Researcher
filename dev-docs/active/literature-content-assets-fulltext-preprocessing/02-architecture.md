# 02 Architecture

## Stage Ownership
- `FULLTEXT_PREPROCESSED` is parser/OCR/layout-led.
- It preserves structure and source alignment.
- It does not decide the semantic contribution of figures or tables.

## Output Contract
- Source asset ref.
- Normalized text ref.
- Document structure.
- Paragraphs with section/page/offset/checksum.
- Figures/tables/formulas/captions/bbox/OCR/local derived asset refs.
- Layout links.
- Extraction diagnostics.

## Direct Replacement
- Remove the current metadata string placeholder as the normal implementation.
- Compatibility fallback is allowed only for tests/dev fixtures and must be explicitly marked.

## DB Boundary
- Asset metadata may require new tables; decide during detailed design with DB SSOT.
