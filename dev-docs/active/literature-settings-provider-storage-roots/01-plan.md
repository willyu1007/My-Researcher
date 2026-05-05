# 01 Plan

## Phase A - Inventory
- Locate existing app settings/config patterns.
- Identify where desktop settings UI is implemented.
- Identify backend config and secret-handling conventions.

## Phase B - Contract
- Define provider settings contract with redacted read shape.
- Define embedding profile config.
- Define storage root config categories.

## Phase C - Implementation
- Add backend settings read/update endpoints or reuse existing settings API.
- Add desktop settings controls.
- Wire content-processing services to settings accessors.

## Phase D - Verification Baseline
- Backend tests for redaction and validation.
- Desktop typecheck/build.
- Manual settings smoke test.
- Config/log scan for secret leakage.
