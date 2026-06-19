# 06 Collection Matrix

## Purpose
The V2 matrix prevents the corpus from becoming a narrow topic pile. It guides B10 query design, B11 selection, B12 batch composition, and post-batch review.

## Primary Direction Axis

| Direction | V2 Role |
| --- | --- |
| RAG-aware allocation | Evidence for adaptive retrieval, evidence selection, context budgeting, and retrieval-compute tradeoffs. |
| LLM serving allocation | Evidence for scheduling, batching, memory/resource allocation, admission control, and heterogeneous serving. |
| Test-time compute budgeting | Evidence for inference-time compute allocation, early exit, reasoning budget, best-of-n, stopping, and metareasoning. |

Suggested net growth toward 650 effective records:
- RAG-aware allocation: +55 to +70.
- LLM serving allocation: +55 to +70.
- Test-time compute budgeting: +55 to +70.
- Remaining growth should be adjacent/theory/support records that cross-cut directions.

These are not rigid exclusive buckets. A theory paper can support multiple directions.

## Role Axis

| Role | Desired Use |
| --- | --- |
| Core | Directly supports the paper's central mechanism or empirical claim. |
| Theory support | Provides formal tools, abstractions, or mathematical justification. |
| System support | Supports implementation, serving, runtime, or infrastructure arguments. |
| Strategy support | Supports design choices, tradeoffs, or evaluation framing. |
| Adjacent inspiration | Expands the design space and avoids topic tunnel vision. |

V2 should keep adjacent inspiration visible rather than rejecting it as off-topic by default.

## Theory Axis

| Theory Lane | Recency Policy | Examples Of Useful Hooks |
| --- | --- | --- |
| Optimization and submodularity | canonicality-first | budgeted selection, diminishing returns, knapsack, adaptive selection. |
| Bandits and online allocation | canonicality-first | exploration/exploitation, contextual allocation, regret, online decisions. |
| Stopping and metareasoning | canonicality-first | rational metareasoning, anytime algorithms, contract algorithms, value of computation. |
| Queueing and scheduling | canonicality-first | admission, latency, service disciplines, heavy traffic, resource contention. |
| Information and measure/probability | canonicality-first | uncertainty, value of information, statistical decision foundations. |
| Geometry/equivariance/structure | canonicality-first | representation structure, invariance, metric structure, allocation under symmetry. |
| Modern LLM theory | frontier-biased | inference-time scaling, retrieval budgeting, reasoning behavior, compute allocation. |

Older theory papers are acceptable when they are canonical and have a clear mapping to the allocation problem.

## Source Axis

| Source Class | Promotion Policy |
| --- | --- |
| Direct arXiv PDF | preferred. |
| ACL anthology PDF | preferred. |
| Direct verified publisher PDF | allowed when downloader succeeds and rights are acceptable. |
| Direct preprints.org download | allowed after URL validation. |
| DOI/OA indirect | audit before promote. |
| TechRxiv/Cloudflare | defer until source handling changes. |
| no-direct-PDF | defer or manual source. |
| blocked host | exclude from broad selector output. |

## Batch Review Checklist
For every completed batch:
- Did one direction dominate the batch?
- Did the batch add at least one non-core support role?
- Did theory coverage improve or stay flat?
- Did adjacent inspiration appear where useful?
- Were all records source-stable before promotion?
- Did B12 finish with 0 blockers?
- Did the batch improve collection speed without lowering quality?
