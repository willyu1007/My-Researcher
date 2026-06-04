# 05 Pitfalls

## Do Not Repeat
- Do not drift into experiment-foundation smoke tests while the active goal is literature collection.
- Do not treat arXiv search results as importable without duplicate checks.
- Do not enqueue content-processing jobs as part of metadata expansion.
- Do not bulk import unreviewed search results.
- If arXiv API search returns `429`, switch to exact-id sequential fetch after targeted web/arXiv review instead of retrying aggressively.
- Review strategy-policy candidates for direct budget/adaptive-compute fit before import; broad prompt-optimization or clinical scaling papers can drift from the three-direction scope.
