# Phase 4B disposable execution log

- Target: randomized `d19_<nonce-prefix>` PostgreSQL databases in ephemeral containers using the repository-pinned pgvector digest.
- Safety: every run generated a 48-hex password and 64-hex nonce, wrote the required database marker, exposed only a random loopback port and removed the container on exit.
- Run 1: complete migration deploy passed; relational assertion failed with an unlabeled `2 !== 1`; cleanup passed.
- Run 2: complete migration deploy passed; labeled relational assertion identified the corrupt-row repair count; cleanup passed.
- Corrected final run: complete migration deploy passed; relational suite passed 1/1 with skip=0; migration-history drift replay passed; cleanup passed.
- Post-hardening run after repository input validation: complete migration deploy and relational suite passed 1/1 with skip=0; cleanup passed.
- First dense fractional-vector run exposed missing float32 canonicalization on database text readback; migration deploy passed, the embedding-hash assertion failed, and cleanup passed.
- Corrected dense fractional-vector run: complete migration deploy and relational suite passed 1/1 with skip=0; cleanup passed.
- No named or shared database was read or mutated.
