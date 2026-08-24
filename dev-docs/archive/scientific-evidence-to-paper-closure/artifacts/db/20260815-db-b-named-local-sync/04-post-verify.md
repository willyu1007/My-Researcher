# Post-migration verification

## Database

- `prisma migrate status`: schema up to date.
- Exact migration history: finished, not rolled back.
- Required scientific constraints present:
  - `ef_experiment_result_source_contract_check`
  - `ef_provisional_output_contract_check`
  - `pirip_scientific_v2_contract_check`
- Collection tuple constraint remains present:
  `ef_collection_attempt_collected_tuple_check`.
- Legacy `ef_provisional_output_class_check`: absent.
- Repo DB context synchronization: passed; checksums current.

## Application

- Experiment-foundation script typecheck: passed.
- Backend strict typecheck: passed.
- Prisma validation with named-local environment loaded: passed.
- Expanded focused scientific-source/P5 lane: 42/42 passed.
- Database test suite: passed.
- Digest-pinned disposable PostgreSQL Pack C gate: 119/119 passed, zero skips,
  identity marker verified and container cleaned up. Summary digest:
  `sha256:d55f7854060b6d9228cc5e2e0848ccd0b86de1a5936cf650df481c42f3d1fed6`.

## Safety

The named-local P5 offline preflight admits the exact migration/constraint set and reports zero
credential reads, cloud calls, database writes and capability changes. Revision 17 remains
terminal and non-reusable; this verification did not invoke PAI, read OSS bodies, reclaim a
command, generate a scientific result or enter Closure.
