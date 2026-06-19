---
name: heatsync-backend-contract-check
description: Review HeatSync backend changes for schema, data-contract, calculation, control, prediction, anomaly, output, and dataset risks. Use before completing backend domain changes or reviewing diffs.
---

# HeatSync Backend Contract Check Skill

Use this skill when a change touches backend data loading, control logic,
prediction, anomaly detection, impact calculations, generated outputs, or
backend API behavior.

## Checkpoints

Ask whether the change affects any of these contracts:

- Backend module boundaries under `backend/`.
- Input data schema and units documented under `backend/data/`.
- Missing, empty, malformed, or duplicate input handling.
- Numeric tolerances, rounding, thresholds, and aggregation windows.
- Prediction input/output shape and deterministic behavior.
- Anomaly detector thresholds and edge cases.
- Control decisions and safe defaults.
- Generated output paths and overwrite behavior.
- Local data path assumptions and ignored generated artifacts.

## Verification Pattern

1. Find the closest existing backend tests or deterministic checks for the
   affected contract.
2. Add or update the narrowest deterministic regression test if needed.
3. Run targeted backend tests when test files exist.
4. Run the backend `uv` lint/type/security/compile checks from
   `.github/instructions/python_quality_gates.instructions.md`.
5. State any unverified dataset, dependency, or optional-service assumptions
   explicitly.

## Guardrails

- Do not tune thresholds without a domain reason.
- Do not hide missing data behind broad exception handling.
- Do not rely on large local datasets for the only proof of correctness.
