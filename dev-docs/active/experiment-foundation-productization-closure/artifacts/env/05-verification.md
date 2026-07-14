# Environment Contract Verification

## Results

- SSOT mode: `repo-env-contract`
- Contract validation: passed with zero errors and zero warnings
- Environment system suite: passed (`run_id=20260713-075124-46480b`)
- Generated context assertion: passed; the key is a non-secret `bool` with JSON default `false`
- Values/secret-ref census: unchanged
- Diff whitespace check: passed

## Generated artifact digests

| Artifact | SHA-256 |
|---|---|
| `env/contract.yaml` | `eea1b92085b4b526123178529834a23f4bd983b2237adb468470c4e7417fde88` |
| `env/.env.example` | `23ac88135edb2e89da1b8c373c6feb8cc431385ed978f4b2c7d20de8a32ec6ea` |
| `docs/env.md` | `c9fe6ef4de619ec68c53caab2ffeb3d63ba44e40aaafe3b266042bf5da7dcb6b` |
| `docs/context/env/contract.json` | `6fe6ce4fb7f4dcbc0feb6df48b9657180d95121c7bca9750c4a8544d7780de25` |

## Commands

```bash
python3 -B -S .ai/skills/features/environment/env-contractctl/scripts/env_contractctl.py validate \
  --root . \
  --out dev-docs/active/experiment-foundation-productization-closure/artifacts/env/03-validation-log.md

python3 -B -S .ai/skills/features/environment/env-contractctl/scripts/env_contractctl.py generate \
  --root . \
  --out dev-docs/active/experiment-foundation-productization-closure/artifacts/env/04-context-refresh.md

node .ai/tests/run.mjs --suite environment
```
