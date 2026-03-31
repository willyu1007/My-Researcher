# 05 Pitfalls

## P-001 research-varify can accidentally become a second SSOT
- Symptom:
  - 实施直接继续引用 `research-varify/*.md`，canonical docs 没有真正落地。
- Prevention:
  - 明确 `research-varify/` 只是 intake，所有 runtime / context / docs 只引用正式落点。

## P-002 shared contracts can duplicate title-card or paper-project DTOs
- Symptom:
  - research-argument contract 里重新定义 `TitleCardDTO` 或 `PaperProject` payload。
- Prevention:
  - research-argument contract 只定义本域对象和 bridge result，不复制相邻 bounded context 的 canonical DTO。
