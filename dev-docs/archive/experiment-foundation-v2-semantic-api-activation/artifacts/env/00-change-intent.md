# Environment Contract Change Intent

- Add `PAPER_IMPLEMENTATION_SEMANTIC_RETRIEVAL_V2_ENABLED` as an optional boolean.
- Default remains `false`; no local, staging or production value is changed.
- The flag exposes only explicit project-scoped semantic rebuild/retrieval APIs.
- Enabling requires committed Experiment Foundation v2 cutover and durable Prisma composition.
- Embedding credentials and model settings remain owned by the existing literature/topic settings path.
