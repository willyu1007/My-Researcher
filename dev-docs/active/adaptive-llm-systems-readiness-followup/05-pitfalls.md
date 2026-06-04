# 05 Pitfalls

## Do Not Repeat
- Do not leave durable task evidence only under `.ai/.tmp`; store replay tools and reports inside the task bundle.
- Do not let readiness scripts write docs or DB rows in default check mode.
- Do not mix unrelated T-114/T-115 governance drift into commits for this task.

## 2026-06-04 - arXiv API ECONNRESET During F1 Apply
- Symptom: `f1-import-missing-core-classic.mjs --apply` failed before import with `TypeError: fetch failed` and `read ECONNRESET`.
- Root cause: transient arXiv API/network reset during metadata fetch.
- What was tried: initial check-only run succeeded, then apply failed on the fetch path before the local import route was called.
- Fix/workaround: added bounded retry with `F1_ARXIV_MAX_ATTEMPTS` and `F1_ARXIV_DELAY_MS`.
- Prevention: keep external metadata fetches retriable and record before/after safety counters so failed fetches are distinguishable from partial DB writes.

## 2026-06-04 - F2 Compact Target Lost Raw Tags
- Symptom: `f2-fulltext-code-readiness.mjs` failed with `TypeError: Cannot read properties of undefined (reading 'includes')`.
- Root cause: readiness logic called `isExperimentCandidate(record)` after records had been compacted into target objects that do not carry raw `tags`.
- What was tried: initial syntax check passed, runtime generation failed before artifact writes.
- Fix/workaround: changed code-followup logic to use compact fields (`reasons`, `fit_tags`) instead of raw `tags`.
- Prevention: keep compact-record DTOs and downstream readiness logic aligned; do not pass compact targets to helpers that expect raw DB records.
