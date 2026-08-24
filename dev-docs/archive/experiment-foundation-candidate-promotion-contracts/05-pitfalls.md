# 05 Pitfalls

## Do Not Repeat
- Do not auto-promote low-confidence literature extraction.
- Do not treat manual review as the default for every complete low-risk candidate.
- Do not lose source refs after promotion.
- Do not add `candidate` or `candidate_status` to canonical asset/protocol/method lifecycle schemas.
- Do not embed full canonical DTOs inside candidates or promotion results; use refs/hashes only.
- Do not let promotion contracts carry run recipes, task specs, result packets, paper claims, or platform-private payloads.
- Do not route restricted, privacy-sensitive, model-weight-sensitive, unclear-license, incomplete, duplicate, or low-confidence candidates through auto-promotion.
