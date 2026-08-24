# 05 Pitfalls

## Do-not-repeat Summary
- Do not interpret provider E2E as a default CI gate; it is slow, stateful, and credential-dependent.
- Do not compare selected items by rank alone; compare `literature_id:selected_role`.
- Do not treat `CONTEXT_CAP_APPLIED` as a hard failure when role targets are satisfied.
- Do not force v1b advancement in quality-negative runs.
- Do not rely on prompt text alone to prevent synthetic refs; provide explicit allowed-ref copy lists and sanitize LLM-invented evidence refs before persistence.
- Do not let broad risk words such as `hallucination-free`, `addresses risks`, or emotionally adversarial conversation fixtures force otherwise supportive/context evidence into challenge.
- Do not let generic benchmark/evaluation language drift method papers into baseline unless first-order benchmark/evaluation semantics are present.
